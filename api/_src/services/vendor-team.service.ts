import type { PoolClient } from 'pg';
import { ConflictError } from '../shared/errors/HttpError';

// ---------------------------------------------------------------------------
// Vendor team-member synchronization
//
// Vendor team members are stored as regular `guests` rows with
// `guest_type = 'vendor_team'` and `vendor_id` pointing back to the vendor.
// This lets the existing accommodation, RSVP, and meal pipelines treat
// them like any other guest — no parallel allocation system needed.
//
// `syncVendorTeamMembers` is the single source of truth that reconciles
// the guest rows for a vendor against `team_size`, `needs_food`, and
// `needs_accommodation`. It is called from the vendor service after
// any vendor create/update.
// ---------------------------------------------------------------------------

export interface VendorTeamSyncInput {
  vendorId: string;
  ownerId: string;
  vendorName: string;
  vendorSide: 'bride' | 'groom' | 'mutual';
  needsFood: boolean;
  needsAccommodation: boolean;
  teamSize: number;
  /** Optional names supplied by the user; gaps are auto-filled. */
  memberNames?: string[];
  actorId?: string;
}

interface ExistingMember {
  id: string;
  first_name: string;
  has_allocation: boolean;
}

const requiresTeam = (input: VendorTeamSyncInput): boolean =>
  (input.needsFood || input.needsAccommodation) && input.teamSize > 0;

const autoMemberName = (vendorName: string, index: number): string =>
  `${vendorName} — Member ${index + 1}`;

const resolveMemberName = (
  vendorName: string,
  index: number,
  memberNames: string[] | undefined,
): string => {
  const supplied = memberNames?.[index]?.trim();
  return supplied && supplied.length > 0 ? supplied : autoMemberName(vendorName, index);
};

async function loadExistingMembers(
  client: PoolClient,
  vendorId: string,
): Promise<ExistingMember[]> {
  const { rows } = await client.query<{
    id: string;
    first_name: string;
    has_allocation: boolean;
  }>(
    `
      SELECT
        g.id,
        g.first_name,
        EXISTS (SELECT 1 FROM room_allocations ra WHERE g.id = ANY(ra.guest_ids)) AS has_allocation
      FROM guests g
      WHERE g.vendor_id = $1
      ORDER BY g.created_at ASC
    `,
    [vendorId],
  );
  return rows;
}

async function deleteAllMembers(client: PoolClient, vendorId: string): Promise<void> {
  // Note: ON DELETE CASCADE on guests.vendor_id handles vendor deletion;
  // this branch fires when a vendor toggles off both needs flags.
  const { rows: allocated } = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM room_allocations ra
      JOIN guests g ON g.id = ANY(ra.guest_ids)
      WHERE g.vendor_id = $1
    `,
    [vendorId],
  );
  if (Number(allocated[0]?.count ?? 0) > 0) {
    throw new ConflictError(
      'Remove room allocations for this vendor’s team before clearing the team.',
    );
  }
  await client.query(`DELETE FROM guests WHERE vendor_id = $1`, [vendorId]);
}

async function trimMembers(
  client: PoolClient,
  existing: ExistingMember[],
  targetSize: number,
): Promise<void> {
  const removable = existing.slice(targetSize);
  const blocked = removable.filter((m) => m.has_allocation);
  if (blocked.length > 0) {
    throw new ConflictError(
      `Cannot reduce team size: ${blocked.length} member(s) currently have room allocations.`,
    );
  }
  if (removable.length === 0) return;
  const ids = removable.map((m) => m.id);
  await client.query(`DELETE FROM guests WHERE id = ANY($1::uuid[])`, [ids]);
}

async function insertMembers(
  client: PoolClient,
  input: VendorTeamSyncInput,
  startIndex: number,
  endIndexExclusive: number,
): Promise<void> {
  if (endIndexExclusive <= startIndex) return;
  const rowsToInsert: unknown[][] = [];
  for (let i = startIndex; i < endIndexExclusive; i += 1) {
    rowsToInsert.push([
      input.ownerId,
      input.vendorId,
      resolveMemberName(input.vendorName, i, input.memberNames),
      input.vendorSide,
      input.needsAccommodation,
      input.actorId ?? input.ownerId,
    ]);
  }
  const valuesSql = rowsToInsert
    .map((_, idx) => {
      const base = idx * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'vendor_team', $${base + 6})`;
    })
    .join(', ');
  await client.query(
    `
      INSERT INTO guests (
        user_id, vendor_id, first_name, side, needs_accommodation, guest_type, created_by
      ) VALUES ${valuesSql}
    `,
    rowsToInsert.flat(),
  );
}

async function updateExistingMembers(
  client: PoolClient,
  input: VendorTeamSyncInput,
  existing: ExistingMember[],
  retainCount: number,
): Promise<void> {
  if (retainCount === 0) return;
  const ids: string[] = [];
  const names: string[] = [];
  for (let i = 0; i < retainCount; i += 1) {
    const member = existing[i];
    if (!member) continue;
    ids.push(member.id);
    // If the user supplied a name, override; otherwise leave existing name untouched.
    const supplied = input.memberNames?.[i]?.trim();
    names.push(supplied && supplied.length > 0 ? supplied : member.first_name);
  }
  await client.query(
    `
      UPDATE guests AS g
      SET
        first_name = data.first_name,
        side = $1::guest_side,
        needs_accommodation = $2,
        updated_by = $3
      FROM unnest($4::uuid[], $5::text[]) AS data(id, first_name)
      WHERE g.id = data.id
    `,
    [input.vendorSide, input.needsAccommodation, input.actorId ?? input.ownerId, ids, names],
  );
}

export async function syncVendorTeamMembers(
  client: PoolClient,
  input: VendorTeamSyncInput,
): Promise<void> {
  const existing = await loadExistingMembers(client, input.vendorId);

  if (!requiresTeam(input)) {
    if (existing.length > 0) await deleteAllMembers(client, input.vendorId);
    return;
  }

  const target = input.teamSize;
  if (existing.length > target) {
    await trimMembers(client, existing, target);
  }
  const retainCount = Math.min(existing.length, target);
  await updateExistingMembers(client, input, existing, retainCount);
  await insertMembers(client, input, retainCount, target);
}
