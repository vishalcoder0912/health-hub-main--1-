# Health Hub Monorepo

This repository is organized as a simple monorepo with separate frontend and backend apps.

## Folder Structure
- `apps/frontend` -> React + Vite + TypeScript frontend
- `apps/backend` -> Node.js + Express + Prisma backend
- `docs` -> Product and implementation documentation

## One-Time Setup
From the repository root:

```powershell
npm install
npm run install:all
```

## Development

Frontend:

```powershell
npm run dev
```

Backend:

```powershell
npm run dev:backend
```

Frontend + backend:

```powershell
npm run dev:all
```

## Validation
Build all apps:

```powershell
npm run build
```

Lint all apps:

```powershell
npm run lint
```

Run frontend tests:

```powershell
npm run test
```

## Supabase (Medicare HMS)

The app connects to Supabase for auth and database CRUD. To enable it:

1. **Create a Supabase project** at [supabase.com](https://supabase.com) and get your project URL and anon (publishable) key from Project Settings → API.
2. **Run the schema** once: open the Supabase SQL Editor and run the migration in `supabase/migrations/001_medicare_hms_schema.sql`.
3. **Set frontend env** in `apps/frontend/.env` (see Environment Files below).

CRUD is wired for **Departments** (Admin → Departments) and **Patient Records** (Admin → Patient Records (DB)). Other tables (`appointments`, `prescriptions`, `lab_reports`, `inventory`, `invoices`, `blood_bank`) use the same pattern: use the `useSupabaseCrud` hook or `supabaseCrud.service` with the table name (e.g. `'appointments'`). See `apps/frontend/src/lib/supabase/` and `apps/frontend/src/hooks/useSupabaseCrud.ts`.

## Environment Files
- Frontend env: `apps/frontend/.env`
- Backend env: `apps/backend/.env`

Frontend required values (copy from `apps/frontend/.env.example`):

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

Backend example CORS value:

```env
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
```
