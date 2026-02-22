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

## Environment Files
- Frontend env: `apps/frontend/.env`
- Backend env: `apps/backend/.env`

Frontend required values:

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
```

Backend example CORS value:

```env
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
```
