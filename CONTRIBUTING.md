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
│       ├── modules/       # Feature modules (auth, users, guests, …)
│       ├── middleware/     # auth, error, validate
│       └── shared/errors/ # AppError + HttpError subclasses
└── frontend/        # React 19 + Vite + TypeScript
    └── src/
        ├── modules/  # Feature modules (guests, budget, …)
        ├── api/      # axios instance, queryClient
        └── routes/   # Typed route constants
```

## Adding a Backend Module

Each module lives in `api/_src/modules/<domain>/` and follows the Controller → Service → Repository pattern:

```
<domain>/
├── <domain>.validator.ts   # Zod schemas for request validation
├── <domain>.service.ts     # Business logic (no req/res)
├── <domain>.controller.ts  # HTTP handlers (calls service)
└── <domain>.routes.ts      # Express router
```

**Step-by-step:**

1. **Add shared types** in `shared/src/domain/<domain>.types.ts`:
   ```typescript
   import type { Database } from '../supabase.generated';
   export type MyEntityRow = Database['public']['Tables']['my_entity']['Row'];
   ```

2. **Add Zod validators** in `<domain>.validator.ts`:
   ```typescript
   import { z } from 'zod';
   export const createMyEntitySchema = z.object({ name: z.string().min(1) });
   export type CreateMyEntityInput = z.infer<typeof createMyEntitySchema>;
   ```

3. **Write service functions** (pure, no Express types):
   ```typescript
   import { supabase } from '../../config/database';
   import { getWeddingOwnerId } from '../../shared/utils/auth.utils';

   export async function listMyEntities(userId: string) {
     const { data, error } = await supabase
       .from('my_entities')
       .select('*')
       .eq('user_id', userId);
     if (error) throw error;
     return data;
   }
   ```

4. **Write controller** (HTTP layer):
   ```typescript
   import type { Request, Response, NextFunction } from 'express';
   import { getWeddingOwnerId } from '../../shared/utils/auth.utils';
   import * as service from './my-entity.service';

   export const list = async (req: Request, res: Response, next: NextFunction) => {
     try {
       const ownerId = getWeddingOwnerId(req);
       const data = await service.listMyEntities(ownerId);
       res.json(data);
     } catch (err) { next(err); }
   };
   ```

5. **Mount the router** in `api/_src/routes/index.ts`.

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
- [ ] `npm run build` (frontend) produces clean output
- [ ] No hardcoded personal names, URLs, or credentials
- [ ] New backend modules follow the Controller → Service pattern
- [ ] New frontend modules have typed query key factories
