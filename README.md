# Medicare HMS Workspace

This root folder contains workspace-level scripts for the full Medicare HMS project.

## Structure
- `health-hub-main/` -> Frontend (React + Vite + TypeScript + Supabase)
- `health-hub-main/backend/` -> Backend API (Node + Express + Prisma)

## One-Time Setup
From this root folder:

```powershell
npm install
npm run install:all
```

## Run Project

### Frontend only
```powershell
npm run dev
```
Frontend URL: `http://localhost:8080`

### Backend only
```powershell
npm run dev:backend
```
Backend URL: `http://localhost:4000/api/v1`

### Frontend + Backend together
```powershell
npm run dev:all
```

## Build
```powershell
npm run build
```

## Supabase Configuration
Frontend env file: `health-hub-main/.env`

Required keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
VITE_API_URL=http://localhost:4000/api/v1
```

## CORS Configuration
Backend env file: `health-hub-main/backend/.env`

Use:

```env
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
```

This allows local frontend access on either common Vite port.
