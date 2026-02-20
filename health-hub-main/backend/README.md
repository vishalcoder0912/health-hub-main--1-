# Health Hub Backend

Production-grade backend scaffold for the existing Health Hub frontend.

## Stack
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT auth (access + refresh) with token rotation
- Zod validation
- Helmet, CORS, rate limiting
- Pino logging

## Project Structure
- `src/config`: env, logger, prisma client
- `src/common`: middleware and utilities
- `src/modules`: domain modules (`auth`, `users`, `patients`, `appointments`, `health`)
- `prisma`: database schema + seed script

## Quick Start
1. Copy env:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
npm install
```

3. Start PostgreSQL locally and ensure it is running on your configured `DATABASE_URL`.
```bash
Example local URL:
`postgresql://postgres:postgres@localhost:5432/health_hub`
```

4. Run migrations and seed:
```bash
npx prisma migrate dev --name init
npm run seed
```

5. Run API:
```bash
npm run dev
```

Backend base URL: `http://localhost:4000/api/v1`

## Core Endpoints
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users/me`
- `GET /users` (admin)
- `GET /collections/bootstrap`
- `GET /collections/:key`
- `PUT /collections/:key`
- `GET /patients`
- `POST /patients`
- `PATCH /patients/:id`
- `DELETE /patients/:id`
- `GET /appointments`
- `POST /appointments`
- `PATCH /appointments/:id`
- `DELETE /appointments/:id`

## Frontend Integration Notes
- Replace current localStorage auth logic in `src/contexts/AuthContext.tsx` with API-based auth calls.
- Use the backend roles and token payload to drive route guards.
- Move data modules from localStorage to API requests (`patients`, `appointments` first).
- Keep current UI models and map appointment status values:
  - frontend: `in-progress` -> backend: `in_progress`
  - frontend: `follow-up` -> backend: `follow_up`

## Production Checklist
- Set strong JWT secrets in `.env`
- Use HTTPS and secure cookie strategy if moving refresh token to cookie
- Add DB backup and migration pipeline in CI/CD
- Add module coverage for lab, billing, pharmacy, bloodbank domains
- Add audit trails and fine-grained permission policies
