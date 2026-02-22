# Health Hub (Frontend + Backend) Setup Guide

This guide is written in very simple steps.
If you can copy-paste commands, you can run this project.

## Documentation Index
- Product Requirements: `PRD_MEDICARE_HMS.md`
- Current Implementation Status: `IMPLEMENTATION_SUMMARY.md`

## 1. What is in this project?

- `health-hub-main/` (this folder): React frontend
- `health-hub-main/backend/`: Node.js backend API
- Database: PostgreSQL (no Docker needed)

## 2. What you need before starting

Install these first:

1. Node.js (version 20+)
2. PostgreSQL (version 14+ is fine)
3. Git (optional, but useful)

Check Node version:

```powershell
node -v
```

## 3. Quick folder map

- Frontend env: `.env`
- Backend env: `backend/.env`
- Prisma schema: `backend/prisma/schema.prisma`
- Backend start file: `backend/src/index.ts`

## 4. Backend setup (first do this)

Open terminal in:

```text
health-hub-main/backend
```

### Step A: Install backend packages

```powershell
npm install
```

### Step B: Create PostgreSQL database

If PostgreSQL is installed and running, create DB:

```sql
CREATE DATABASE health_hub;
```

You can also use the provided SQL file:

```powershell
psql -U postgres -f database/postgres-setup.sql
```

### Step C: Check backend `.env`

File: `backend/.env`

It should contain:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/health_hub"
JWT_ACCESS_SECRET="health-hub-access-secret-2026-change-this"
JWT_REFRESH_SECRET="health-hub-refresh-secret-2026-change-this"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

Important:

- Replace `postgres:postgres` with your real PostgreSQL username/password if different.

### Step D: Generate Prisma client

```powershell
npx prisma generate
```

### Step E: Run database migrations

```powershell
npx prisma migrate dev --name init
```

### Step F: Seed sample users/data

```powershell
npm run seed
```

### Step G: Start backend server

```powershell
npm run dev
```

Backend should run on:

```text
http://localhost:4000/api/v1
```

Health check URL:

```text
http://localhost:4000/api/v1/health
```

## 5. Frontend setup

Open new terminal in:

```text
health-hub-main
```

### Step A: Install frontend packages

```powershell
npm install
```

### Step B: Check frontend `.env`

File: `.env`

Make sure it has:

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_or_publishable_key
```

### Step C: Start frontend

```powershell
npm run dev
```

Frontend should run on:

```text
http://localhost:5173
```

## 6. Demo login accounts

Password for demo users:

```text
password123
```

Examples:

- `admin@hospital.com`
- `doctor@hospital.com`
- `reception@hospital.com`
- `nurse@hospital.com`
- `pharmacy@hospital.com`
- `lab@hospital.com`
- `billing@hospital.com`
- `patient@email.com`
- `bloodbank@hospital.com`

## 7. Easy start order (remember this)

1. Start PostgreSQL
2. Start backend (`backend`: `npm run dev`)
3. Start frontend (`health-hub-main`: `npm run dev`)
4. Open browser at `http://localhost:5173`

## 8. Common errors and simple fixes

### Error: `Environment variable not found: DATABASE_URL`

Fix:

- Make sure `backend/.env` exists
- Make sure `DATABASE_URL` is inside it
- Restart terminal and run again

### Error: `Can't reach database server at localhost:5432`

Fix:

- PostgreSQL service is not running
- Start PostgreSQL from Services or pgAdmin
- Check port is 5432

### Error: Prisma migrate fails

Fix:

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

### Error: Login fails

Fix:

- Run seed again:

```powershell
npm run seed
```

## 9. Helpful commands

Backend:

```powershell
npm run dev
npm run build
npx prisma studio
```

Frontend:

```powershell
npm run dev
npm run build
```
