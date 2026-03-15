# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- One-step install (`npm run setup`) and one-step start (`npm run dev` via `concurrently`)
- Node.js migration runner (`npm run db:migrate`) with idempotency tracking
- Docker Compose support — fully self-contained, no Supabase account required
- Migration 004: `users` table and composite unique index on `website_content(section_name, user_id)`
- Community files: `SECURITY.md`, `CODE_OF_CONDUCT.md`, GitHub issue/PR templates

### Changed

- Seed migrations renamed to `002_example_seed.sql` / `003_example_comprehensive_seed.sql` to clarify they are optional
- README rewritten with one-step Quick Start and Docker option
- CI workflow updated: root install, fork-safe VITE secrets, `format:check` job

### Removed

- Obsolete migration helper scripts (`apply-migration.ts`, `run-migration.ts`, `check-columns.ts`)

## [1.0.0] — 2025-01-01

### Added

- Initial open-source release
- Multi-tenant architecture (slug-scoped wedding dashboards)
- Role-based access control: `admin`, `family`, `friends`
- Guest management with Excel import/export
- Budget tracking with side-wise splits
- Room allocation
- Public wedding website with countdown timer
- Onboarding wizard to create first admin account
