# Plan your wedding

[![CI](https://github.com/sakshiiiagrawal/plan-your-wedding/actions/workflows/ci.yml/badge.svg)](https://github.com/sakshiiiagrawal/plan-your-wedding/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node ≥20](https://img.shields.io/badge/Node-%E2%89%A520-brightgreen)](https://nodejs.org)

An open-source, multi-tenant wedding planning SaaS built with React, Express, and Supabase. Each wedding gets its own slug-scoped dashboard and public website.

## Features

- **Multi-tenant** — one deployment serves unlimited weddings, each isolated by slug
- **Dashboard** — manage guests, events, venues, accommodations, vendors, tasks, and expense
- **Public wedding website** — hero section, countdown timer, event schedule, gallery
- **Expense tracking** — expense categories, side-wise splits (bride/groom/shared), vendor cost tracking
- **Room allocation** — hotel rooms, guest assignments, Excel import/export
- **Guest management** — RSVP tracking, meal preferences, group assignments, Excel import

## Quick Start

### Option A: Supabase cloud (requires a free [Supabase](https://supabase.com) account)

```bash
git clone https://github.com/sakshiiiagrawal/plan-your-wedding.git
cd plan-your-wedding
npm run setup          # interactive: installs deps + creates .env files
npm run db:migrate     # apply schema to your Supabase project
npm run dev            # API on :3001, frontend on :5173
```

Open `http://localhost:5173/onboard` to create your account.

> **Windows?** Use `npm run setup:win` instead of `npm run setup`.

### Option B: Docker (fully self-contained, no accounts needed)

```bash
git clone https://github.com/sakshiiiagrawal/plan-your-wedding.git
cd plan-your-wedding
docker compose up      # postgres + postgrest + API + frontend start automatically
```

Open `http://localhost:5173/onboard` to create your account.

## Stack

| Layer      | Technology                                                 |
| ---------- | ---------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS, React Query      |
| Backend    | Node.js, Express 5, TypeScript, `tsx` runtime              |
| Database   | Supabase (PostgreSQL)                                      |
| Auth       | JWT + bcrypt                                               |
| Deployment | Vercel (frontend + serverless API) or Docker (self-hosted) |

## Architecture

```
wedding-planner/
├── api/                    # Express backend (Vercel serverless)
│   └── _src/
│       ├── controllers/    # HTTP handlers
│       ├── services/       # Business logic (no req/res)
│       ├── repositories/   # Supabase data access
│       ├── middleware/     # Auth, error handling, Zod validation
│       ├── routes/         # Express routers
│       ├── shared/         # Error classes, utilities
│       └── config/         # Zod-validated env, Supabase client
├── frontend/               # React + Vite
│   └── src/
│       ├── modules/        # Feature-scoped hooks
│       ├── pages/          # Route-level page components
│       ├── contexts/       # Auth context
│       └── layouts/        # DashboardLayout, PublicLayout
└── shared/                 # TypeScript types only (no runtime)
    └── src/
        ├── domain/         # Row types derived from Supabase generated types
        ├── enums/          # `as const` arrays (runtime + type-level)
        └── api/            # Request/response DTOs
```

Backend follows **Controller → Service → Repository** layering. Shared types are consumed via TypeScript path aliases (`@wedding-planner/shared`) — no npm workspaces or publishing.

## Database Migrations

See [`api/supabase/migrations/README.md`](api/supabase/migrations/README.md) for details.

```bash
npm run db:migrate          # apply unapplied migrations (requires DATABASE_URL)
npm run db:migrate:print    # print SQL to paste into Supabase SQL Editor
```

## Development

```bash
npm run typecheck     # type-check all three packages (shared, api, frontend)
npm run lint          # ESLint across the repo
npm run format        # Prettier format
npm run format:check  # check formatting without writing
```

## Environment Variables

Run `npm run setup` for guided setup. For manual configuration, copy `.env.example` to `api/.env`. All backend variables are validated with Zod on startup — the server exits immediately if any required variable is missing.

## Deployment

### Vercel

The project is configured for Vercel out of the box:

- `api/index.ts` is the serverless function entry point
- `frontend/` is the static frontend build
- `vercel.json` routes `/api/*` to the serverless function

Set all env vars in your Vercel project settings.

### Self-hosted Docker

```bash
docker compose up -d
```

The Postgres container auto-applies migrations from `api/supabase/migrations/` on first start.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding features, TypeScript conventions, migrations, and the commit format.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## License

MIT — see [LICENSE](LICENSE).
