# Database Migrations

SQL migration files applied in lexicographic order.

## Applying migrations

**Option A — automatic (requires `DATABASE_URL` in `api/.env`):**

```bash
npm run db:migrate
```

**Option B — manual (copy-paste into Supabase SQL Editor):**

```bash
npm run db:migrate:print
```

## Files

| File                                    | Description                                                 |
| --------------------------------------- | ----------------------------------------------------------- |
| `001_initial_schema.sql`                | Core tables: guests, events, venues, expense, etc.          |
| `002_example_seed.sql`                  | **Optional** example data for development                   |
| `003_example_comprehensive_seed.sql`    | **Optional** larger example dataset                         |
| `004_users_and_website_content_fix.sql` | `users` table + composite unique index on `website_content` |

## Adding a migration

1. Create `NNN_description.sql` where `NNN` is the next sequential number.
2. Use `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for idempotency.
3. Never modify existing migration files — add a new one instead.
