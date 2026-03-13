# Wedding Planner

An open-source, multi-tenant wedding planning SaaS built with React, Express, and Supabase. Each wedding gets its own slug-scoped admin dashboard and public website.

## Features

- **Multi-tenant** — one deployment serves unlimited weddings, each isolated by slug
- **Admin dashboard** — manage guests, events, venues, accommodations, vendors, tasks, and budget
- **Role-based access** — `admin` (full), `family` (view + finance), `friends` (view only, no finance)
- **Public wedding website** — hero section, countdown timer, event schedule, gallery
- **Budget tracking** — expense categories, side-wise splits (bride/groom/shared), vendor cost tracking
- **Room allocation** — hotel rooms, guest assignments, Excel import/export
- **Guest management** — RSVP tracking, meal preferences, group assignments, Excel import

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query |
| Backend | Node.js, Express 5, TypeScript, `tsx` runtime |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + bcrypt |
| Deployment | Vercel (frontend + serverless API) |

## Architecture

```
wedding-planner/
├── api/                    # Express backend (Vercel serverless)
│   └── _src/
│       ├── modules/        # Feature modules (auth, guests, budget, …)
│       ├── middleware/     # Auth, error handling, Zod validation
│       ├── shared/         # Error classes, utilities
│       └── config/         # Zod-validated env, Supabase client
├── frontend/               # React + Vite
│   └── src/
│       ├── modules/        # Feature-scoped hooks
│       ├── pages/          # Route-level page components
│       ├── contexts/       # Auth context
│       └── layouts/        # AdminLayout, PublicLayout
└── shared/                 # TypeScript types only (no runtime)
    └── src/
        ├── domain/         # Row types derived from Supabase generated types
        ├── enums/          # `as const` arrays (runtime + type-level)
        └── api/            # Request/response DTOs
```

Backend follows **Controller → Service → Repository** layering. Shared types are consumed via TypeScript path aliases (`@wedding-planner/shared`) — no npm workspaces or publishing.

## Quick Start

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- (Optional) Vercel account for deployment

### 1. Clone and install

```bash
git clone https://github.com/your-org/wedding-planner.git
cd wedding-planner
npm install          # root (ESLint, Prettier, Husky)
cd api && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=at-least-32-characters-long
```

### 3. Set up the database

Run the SQL migrations in your Supabase project (SQL editor). See `scripts/setup.sh` for the full schema.

### 4. Run locally

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Frontend
npm run dev:frontend
```

Open `http://localhost:5173`. The onboarding wizard at `/onboard` creates your first admin account.

### 5. Generate TypeScript types from Supabase (optional)

```bash
bash scripts/generate-db-types.sh
```

This runs `supabase gen types typescript` and writes to `shared/src/supabase.generated.ts`.

## Development

```bash
npm run typecheck     # Type-check all three packages (shared, api, frontend)
npm run lint          # ESLint across the repo
npm run format        # Prettier format
```

## Environment Variables

See `.env.example` for the full list with documentation. All backend variables are validated with Zod on startup — the server exits immediately if any required variable is missing or invalid.

## Deployment (Vercel)

The project is configured for Vercel out of the box:

- `api/index.ts` is the serverless function entry point
- `frontend/` is the static frontend build
- `vercel.json` routes `/api/*` to the serverless function

Set all env vars in your Vercel project settings.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding modules, TypeScript conventions, and the commit format.

## License

MIT — see [LICENSE](LICENSE).
