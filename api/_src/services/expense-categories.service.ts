import type { PoolClient } from 'pg';
import { withPgTransaction } from '../config/postgres';
import { DEFAULT_CATEGORY_TREE } from '../constants/enums';

type DbRow = Record<string, unknown>;

interface CategoryRow {
  id: string;
  name: string;
  parent_category_id: string | null;
  display_order: number;
}

function mapCategoryRow(row: DbRow): CategoryRow {
  return {
    id: String(row['id']),
    name: String(row['name']),
    parent_category_id: row['parent_category_id'] ? String(row['parent_category_id']) : null,
    display_order: Number(row['display_order'] ?? 0),
  };
}

async function loadCategoriesTx(client: PoolClient, ownerId: string): Promise<CategoryRow[]> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT id, name, parent_category_id, display_order
      FROM expense_categories
      WHERE user_id = $1
      ORDER BY display_order ASC, created_at ASC, id ASC
    `,
    [ownerId],
  );
  return rows.map(mapCategoryRow);
}

async function insertCategoryTx(
  client: PoolClient,
  ownerId: string,
  payload: {
    name: string;
    parent_category_id: string | null;
    display_order: number;
  },
): Promise<CategoryRow> {
  const { rows } = await client.query<DbRow>(
    `
      INSERT INTO expense_categories (
        user_id,
        name,
        parent_category_id,
        allocated_amount,
        display_order
      )
      VALUES ($1, $2, $3, 0, $4)
      RETURNING id, name, parent_category_id, display_order
    `,
    [ownerId, payload.name, payload.parent_category_id, payload.display_order],
  );
  return mapCategoryRow(rows[0] ?? {});
}

export async function ensureDefaultCategoriesTx(
  client: PoolClient,
  ownerId: string,
): Promise<void> {
  const categories = await loadCategoriesTx(client, ownerId);

  const parents = new Map(
    categories
      .filter((category) => !category.parent_category_id)
      .map((category) => [category.name, category] as const),
  );

  let nextParentOrder = Math.max(0, ...categories.filter((category) => !category.parent_category_id).map((category) => category.display_order)) + 1;

  for (const entry of DEFAULT_CATEGORY_TREE) {
    let parent = parents.get(entry.name);

    if (!parent) {
      parent = await insertCategoryTx(client, ownerId, {
        name: entry.name,
        parent_category_id: null,
        display_order: nextParentOrder,
      });
      parents.set(entry.name, parent);
      categories.push(parent);
      nextParentOrder += 1;
    }

    const existingChildren = categories.filter((category) => category.parent_category_id === parent.id);
    const existingChildNames = new Set(existingChildren.map((category) => category.name));
    let nextChildOrder =
      Math.max(0, ...existingChildren.map((category) => category.display_order)) + 1;

    for (const childName of entry.children) {
      if (existingChildNames.has(childName)) continue;

      const child = await insertCategoryTx(client, ownerId, {
        name: childName,
        parent_category_id: parent.id,
        display_order: nextChildOrder,
      });
      categories.push(child);
      existingChildNames.add(childName);
      nextChildOrder += 1;
    }
  }
}

export async function ensureDefaultCategories(ownerId: string): Promise<void> {
  await withPgTransaction((client) => ensureDefaultCategoriesTx(client, ownerId));
}
