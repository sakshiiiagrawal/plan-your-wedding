import type { PoolClient } from 'pg';
import { supabase } from '../config/database';
import { withPgTransaction } from '../config/postgres';
import { ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/HttpError';
import { invalidateAuthCache } from '../middleware/auth.middleware';

export interface WeddingRow {
  id: string;
  owner_id: string;
  slug: string | null;
  title: string;
  currency: string;
  created_at: string;
}

export interface CreateWeddingInput {
  slug: string;
  title?: string | undefined;
  brideName?: string | undefined;
  groomName?: string | undefined;
  weddingDate?: string | undefined;
  currency?: string | undefined;
}

const WEDDING_COLUMNS = 'id, owner_id, slug, title, currency, created_at';

export async function assertSlugAvailable(slug: string, excludeWeddingId?: string): Promise<void> {
  let query = supabase.from('weddings').select('id').eq('slug', slug).limit(1);
  if (excludeWeddingId) query = query.neq('id', excludeWeddingId);
  const { data } = await query;
  if (data && data.length > 0) {
    throw new ConflictError('That URL is already taken. Please choose another.');
  }
}

/**
 * Create a wedding owned by userId and make it their active one. Seeds the
 * public site (website_content sections + the home page) exactly like the old
 * register-with-slug path did, so fresh weddings never 404 on hero/gallery
 * reads. Callable any number of times — one account, many weddings.
 */
export async function createWedding(
  userId: string,
  input: CreateWeddingInput,
): Promise<WeddingRow> {
  const { slug, brideName, groomName, weddingDate, currency } = input;

  await assertSlugAvailable(slug);

  const title =
    input.title?.trim() ||
    (brideName || groomName ? `${brideName || 'Bride'} & ${groomName || 'Groom'}` : 'My wedding');

  const { data: wedding, error } = await supabase
    .from('weddings')
    .insert({
      owner_id: userId,
      slug,
      title,
      ...(currency ? { currency } : {}),
    })
    .select(WEDDING_COLUMNS)
    .single();
  if (error) throw error;
  if (!wedding) throw new Error('Failed to create wedding');
  const created = wedding as WeddingRow;

  // Seed every website-content section so fresh weddings never 404 on
  // hero/couple/story/gallery reads (dashboard, editor, and public site all
  // fetch them before the user has saved anything).
  const heroContent =
    (brideName ?? groomName ?? weddingDate)
      ? {
          bride_name: brideName ?? '',
          groom_name: groomName ?? '',
          wedding_date: weddingDate ?? null,
          tagline: `${brideName ?? 'Bride'} & ${groomName ?? 'Groom'} are getting married!`,
        }
      : {};
  const seedSections = [
    { section_name: 'hero', content: heroContent, display_order: 1 },
    { section_name: 'couple', content: {}, display_order: 2 },
    { section_name: 'our_story', content: { story: '' }, display_order: 3 },
    { section_name: 'gallery', content: { images: [] }, display_order: 4 },
  ];
  await supabase.from('website_content').upsert(
    seedSections.map((s) => ({ ...s, user_id: created.id })),
    { onConflict: 'section_name,user_id' },
  );

  // Every wedding starts with a home page (the multi-page public site model);
  // more pages (e.g. an invitation) are added from the Site Studio.
  await supabase.from('public_pages').upsert(
    {
      user_id: created.id,
      page_slug: '',
      kind: 'website',
      title: 'Main website',
      template: 'classic',
      palette: 'royal',
      config: {},
    },
    { onConflict: 'user_id,page_slug' },
  );

  // A newly created wedding is what the user wants to work on next.
  await supabase.from('users').update({ active_wedding_id: created.id }).eq('id', userId);
  invalidateAuthCache();

  return created;
}

async function findWedding(weddingId: string): Promise<WeddingRow> {
  const { data, error } = await supabase
    .from('weddings')
    .select(WEDDING_COLUMNS)
    .eq('id', weddingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError('Wedding not found');
  return data as WeddingRow;
}

/** Owner or an active admin member may manage the wedding's settings. */
async function assertCanManage(userId: string, wedding: WeddingRow): Promise<void> {
  if (wedding.owner_id === userId) return;
  const { data: membership } = await supabase
    .from('wedding_members')
    .select('id')
    .eq('wedding_id', wedding.id)
    .eq('member_id', userId)
    .eq('status', 'active')
    .eq('role', 'admin')
    .maybeSingle();
  if (!membership) throw new ForbiddenError('Only the owner or an admin can manage this wedding');
}

export async function updateWedding(
  userId: string,
  weddingId: string,
  updates: { title?: string; slug?: string; currency?: string },
): Promise<WeddingRow> {
  const wedding = await findWedding(weddingId);
  await assertCanManage(userId, wedding);

  const patch: Record<string, string> = {};
  if (updates.title) patch.title = updates.title.trim();
  if (updates.currency) patch.currency = updates.currency;
  if (updates.slug && updates.slug !== wedding.slug) {
    await assertSlugAvailable(updates.slug, weddingId);
    patch.slug = updates.slug;
  }
  if (Object.keys(patch).length === 0) return wedding;

  const { data, error } = await supabase
    .from('weddings')
    .update(patch)
    .eq('id', weddingId)
    .select(WEDDING_COLUMNS)
    .single();
  if (error) throw error;
  invalidateAuthCache();
  return data as WeddingRow;
}

/**
 * The finance subledger hangs off expenses with RESTRICT chains (payments,
 * allocations, activity), so a wedding can't be removed by cascade alone —
 * clear those explicitly, then delete the weddings row and let the 043
 * CASCADE FKs purge everything else (venues, guests, site content, members…).
 */
export async function purgeWeddingData(client: PoolClient, weddingId: string): Promise<void> {
  await client.query(
    `DELETE FROM payment_allocations WHERE payment_id IN (
       SELECT p.id FROM payments p JOIN expenses e ON e.id = p.expense_id WHERE e.user_id = $1
     )`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM payments WHERE reverses_payment_id IS NOT NULL
       AND expense_id IN (SELECT id FROM expenses WHERE user_id = $1)`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM payments WHERE expense_id IN (SELECT id FROM expenses WHERE user_id = $1)`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM finance_activity WHERE expense_id IN (SELECT id FROM expenses WHERE user_id = $1)`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM expense_items WHERE expense_id IN (SELECT id FROM expenses WHERE user_id = $1)`,
    [weddingId],
  );
  await client.query(`DELETE FROM expenses WHERE user_id = $1`, [weddingId]);

  // Legacy NO ACTION references that would survive the cascade.
  await client.query(
    `UPDATE guest_groups SET primary_contact_id = NULL WHERE user_id = $1`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM rituals WHERE event_id IN (SELECT id FROM events WHERE user_id = $1)`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM room_allocations WHERE room_id IN (
       SELECT r.id FROM rooms r JOIN venues v ON v.id = r.venue_id WHERE v.user_id = $1
     )`,
    [weddingId],
  );
  await client.query(
    `DELETE FROM rooms WHERE venue_id IN (SELECT id FROM venues WHERE user_id = $1)`,
    [weddingId],
  );
}

export async function deleteWedding(userId: string, weddingId: string): Promise<void> {
  const wedding = await findWedding(weddingId);
  if (wedding.owner_id !== userId) {
    throw new ForbiddenError('Only the owner can delete this wedding');
  }

  await withPgTransaction(async (client) => {
    await purgeWeddingData(client, weddingId);
    // Cascades the rest; users.active_wedding_id pointing here goes NULL.
    await client.query(`DELETE FROM weddings WHERE id = $1 AND owner_id = $2`, [
      weddingId,
      userId,
    ]);
  });
  invalidateAuthCache();
}

/** Every wedding this user owns — used by account deletion. */
export async function listOwnedWeddingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('weddings').select('id').eq('owner_id', userId);
  if (error) throw error;
  return (data ?? []).map((w) => w.id as string);
}
