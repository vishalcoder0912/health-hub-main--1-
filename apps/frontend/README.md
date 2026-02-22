# Health Hub Frontend Setup

This guide explains how to run the frontend in the new monorepo layout.

## Documentation Index
- Product requirements: `../../docs/PRD_MEDICARE_HMS.md`
- Implementation summary: `../../docs/IMPLEMENTATION_SUMMARY.md`

## Project Layout
- `apps/frontend` (this folder): React frontend
- `apps/backend`: Node.js backend API
- Database scripts: `apps/backend/database`

## Prerequisites
1. Node.js 20+
2. PostgreSQL 14+

Check Node:

```powershell
node -v
```

## Backend Setup
From repository root:

```powershell
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend URL: `http://localhost:4000/api/v1`

## Frontend Setup
From repository root:

```powershell
cd apps/frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:8080`

## Environment Files
- Frontend env: `apps/frontend/.env`
- Backend env: `apps/backend/.env`

Frontend env values:

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_or_publishable_key
```

Backend env values:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/health_hub"
JWT_ACCESS_SECRET="replace-this"
JWT_REFRESH_SECRET="replace-this"
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
```

## Common Commands
From repository root:

```powershell
npm run dev
npm run dev:backend
npm run dev:all
npm run build
npm run lint
```
