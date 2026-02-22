# Medicare HMS – Supabase

## Schema (run once)

In the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql), run the contents of:

- `migrations/001_medicare_hms_schema.sql`

This creates tables: `departments`, `users`, `patients`, `doctors`, `appointments`, `prescriptions`, `lab_reports`, `inventory`, `invoices`, `blood_bank`, plus enums, indexes, triggers, and RLS comments.

## Frontend CRUD

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in `apps/frontend/.env`.
2. Use **Admin → Departments** and **Admin → Patient Records (DB)** for live CRUD against Supabase.
3. For other tables, use the same pattern:

```ts
import { useSupabaseCrud } from '@/hooks/useSupabaseCrud';

const { data, isLoading, error, refetch, create, update, remove } = useSupabaseCrud('appointments', {
  orderBy: { column: 'appointment_date', ascending: false },
  enableRealtime: true,
});
```

Or use the typed service directly:

```ts
import * as crud from '@/services/supabaseCrud.service';

const result = await crud.getAll('prescriptions');
const one = await crud.getById('patients', id);
await crud.create('invoices', { patient_id: '...', amount: 100, payment_status: 'unpaid' });
await crud.update('appointments', id, { status: 'completed' });
await crud.remove('lab_reports', id);
```

Table names and TypeScript types are in `apps/frontend/src/lib/supabase/` (`database.types.ts`, `tables.ts`).
