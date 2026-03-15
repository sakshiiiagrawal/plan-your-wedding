# Contributing to Wedding Planner

Thank you for considering a contribution! This document explains how to add features, follow TypeScript conventions, and submit pull requests.

## Architecture Overview

```
wedding-planner/
├── shared/          # Types-only package (no runtime code)
│   └── src/
│       ├── domain/  # Row types derived from Supabase generated types
│       ├── enums/   # as const arrays + derived union types
│       └── api/     # Request/Response DTOs
├── api/             # Express backend (Vercel serverless)
│   └── _src/
│       ├── config/        # env.ts (Zod-validated), database.ts
│       ├── controllers/   # HTTP handlers (one file per domain)
│       ├── services/      # Business logic (no req/res)
│       ├── repositories/  # Supabase data access
│       ├── routes/        # Express routers + index.ts that mounts all routes
│       ├── middleware/     # auth, error, validate
│       └── shared/errors/ # AppError + HttpError subclasses
└── frontend/        # React 19 + Vite + TypeScript
    └── src/
        ├── modules/  # Feature-scoped hooks and components
        ├── api/      # axios instance, queryClient
        └── routes/   # Typed route constants
```

## Adding a Backend Feature

Features follow the **Controller → Service → Repository** pattern. Add files in the relevant layer:

```
api/_src/
├── controllers/<domain>.controller.ts   # HTTP handlers (calls service)
├── services/<domain>.service.ts         # Business logic (no req/res)
├── repositories/<domain>.repository.ts  # Supabase queries
└── validators/<domain>.validator.ts     # Zod schemas
```

**Step-by-step:**

1. **Add shared types** in `shared/src/domain/<domain>.types.ts`:
   ```typescript
   import type { Database } from '../supabase.generated';
   export type MyEntityRow = Database['public']['Tables']['my_entity']['Row'];
   ```

2. **Add Zod validators** in `api/_src/validators/<domain>.validator.ts`:
   ```typescript
   import { z } from 'zod';
   export const createMyEntitySchema = z.object({ name: z.string().min(1) });
   export type CreateMyEntityInput = z.infer<typeof createMyEntitySchema>;
   ```

3. **Write repository functions** (Supabase queries only):
   ```typescript
   import { supabase } from '../config/database';

   export async function findAllByUser(userId: string) {
     const { data, error } = await supabase
       .from('my_entities')
       .select('*')
       .eq('user_id', userId);
     if (error) throw error;
     return data;
   }
   ```

4. **Write service functions** (business logic, calls repository):
   ```typescript
   import * as repo from '../repositories/my-entity.repository';

   export async function listMyEntities(userId: string) {
     return repo.findAllByUser(userId);
   }
   ```

5. **Write controller** (HTTP layer):
   ```typescript
   import type { Request, Response, NextFunction } from 'express';
   import * as service from '../services/my-entity.service';

   export const list = async (req: Request, res: Response, next: NextFunction) => {
     try {
       const data = await service.listMyEntities(req.user!.id);
       res.json(data);
     } catch (err) { next(err); }
   };
   ```

6. **Mount the router** in `api/_src/routes/index.ts`.

## Adding a Frontend Module

Each module lives in `frontend/src/modules/<domain>/`:

```
<domain>/
├── hooks/use<Domain>.ts    # React Query hooks
├── components/             # Domain-specific UI
└── pages/<Domain>Page.tsx  # Route-level page component
```

Use typed query key factories:
```typescript
export const GUEST_QUERY_KEYS = {
  all: ['guests'] as const,
  list: (filters: GuestFilters) => ['guests', 'list', filters] as const,
};
```

## Adding a Database Migration

1. Create `api/supabase/migrations/NNN_description.sql` where `NNN` is the next sequential number.
2. Use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` for idempotency.
3. Never modify existing migration files — add a new one instead.
4. Run `npm run db:migrate` to apply locally (requires `DATABASE_URL` in `api/.env`).

## TypeScript Conventions

- **No `any`** — use `unknown` and type narrowing instead
- **Enums**: use `as const` arrays, not TypeScript `enum` keyword
  ```typescript
  export const STATUSES = ['active', 'inactive'] as const;
  export type Status = typeof STATUSES[number];
  ```
- **Error handling**: throw `HttpError` subclasses in services; controllers catch and call `next(err)`
- **Env access**: always import from `api/_src/config/env.ts`, never use `process.env` directly
- **Route strings**: always use `ROUTES` constants from `frontend/src/routes/routes.ts`

## Commit Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(guests): add bulk import from CSV
fix(auth): handle expired token refresh correctly
chore(deps): upgrade @supabase/supabase-js to 2.x
```

## Pull Request Checklist

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run format:check` passes
- [ ] No hardcoded personal names, URLs, or credentials
- [ ] New backend features follow the Controller → Service → Repository pattern
- [ ] New frontend modules have typed query key factories
- [ ] New migrations are idempotent (`IF NOT EXISTS`)
