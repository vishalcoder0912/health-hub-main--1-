# Medicare HMS Product Requirements Document (PRD)

## 1. Document Control
- Product: Medicare HMS (Hospital Management System)
- Version: 1.0
- Date: 2026-02-21
- Owner: Product & Engineering
- Tech Stack: React + Vite + TypeScript + Supabase (Primary) + Node/Express/Prisma (Secondary)

## 2. Product Vision
Deliver a fully functional, secure, real-time, role-based hospital management platform where all core clinical and operational workflows run on Supabase as the primary persistence and realtime backend, while preserving current routing and UI architecture.

## 3. Goals
- Enable end-to-end CRUD across all portal modules using existing Supabase tables.
- Provide real-time updates in all role portals for operational awareness.
- Ensure role-safe authentication and portal access based on Supabase Auth metadata.
- Standardize loading, error, empty, and notification behavior across all pages.
- Maintain TypeScript safety and production-grade service patterns.

## 4. Non-Goals
- No route redesign or route structure changes.
- No UI redesign.
- No new database table creation in this phase.
- No migration away from Supabase as primary persistence.

## 5. Personas and Roles
- Admin
- Doctor
- Receptionist
- Nurse
- Pharmacy
- Laboratory
- Billing
- Patient
- Blood Bank

Each role has access only to its allowed portal routes and datasets.

## 6. Functional Requirements

### 6.1 Global Data Layer
- Provide centralized typed Supabase CRUD service with:
  - `getAll(table)`
  - `getById(table, id)`
  - `create(table, payload)`
  - `update(table, id, payload)`
  - `remove(table, id)`
- Enforce consistent typed response envelope (`data`, `error`).
- Standardize Supabase error logging and normalization.

### 6.2 Realtime Sync
- Subscribe to mapped tables using Supabase Realtime.
- React to `INSERT`, `UPDATE`, `DELETE` events.
- Auto-refresh affected UI state on change.
- Ensure cleanup of subscriptions on unmount.
- Prevent duplicate local entries during refresh.

### 6.3 Local Cache and Two-Way Sync
- `useLocalStorage` must support:
  - Hydration from local cache
  - Remote fetch reconciliation
  - Debounced write-back
  - Loop prevention during remote-apply cycles
  - `isLoading` and `error` states

### 6.4 Authentication and Authorization
- Use Supabase Auth with email/password.
- Persist session across refresh.
- Resolve role from `user_metadata`/`app_metadata`.
- Block unauthorized role access to protected routes.
- Provide loading state during auth/session validation.

### 6.5 Portal Requirements

#### Admin
- Users CRUD
- Departments CRUD
- Beds CRUD
- Reports fetch
- Dashboard aggregates (`count`, `sum`)

#### Doctor
- Appointments CRUD
- Prescriptions CRUD
- Lab request CRUD
- Medical records CRUD
- Realtime dashboard metrics

#### Reception
- Patient registration
- Appointment scheduling
- Queue update
- Attendance tracking

#### Nurse
- Vitals insert/update
- Medication schedule tracking
- Ward status updates
- Nursing notes CRUD

#### Pharmacy
- Inventory CRUD
- Stock deduction on dispense
- Low-stock filtering
- Purchase orders CRUD

#### Laboratory
- Sample tracking
- Processing updates
- Lab result updates
- Reports fetch

#### Billing
- Invoice CRUD
- Payment status updates
- Realtime billing updates

#### Patient
- Own appointments fetch
- Own prescriptions fetch
- Own lab reports fetch
- Own billing status fetch
- Messaging CRUD

#### Blood Bank
- Inventory CRUD
- Donor management
- Collection/testing/storage records
- Issue and request workflows
- Activity logs

## 7. UX and State Standards
Every page must implement:
- `isLoading` state
- `error` state
- Empty state UI
- Success/failure toast feedback

All list rendering must use stable keys (`key={item.id}` when available).

## 8. Technical Architecture

### 8.1 Frontend Architecture
- Context-based auth and role gating
- Service-first data access layer
- Reusable CRUD table/dialog components
- Portal-level realtime subscriptions

### 8.2 Data Strategy
- Supabase as source of truth
- Local storage as cache layer for compatibility
- Optimistic update support with safe diff sync

### 8.3 Type Safety
- Strict TypeScript models for entities and service contracts
- Normalization for camelCase/snake_case DB column compatibility

## 9. Security Requirements
- Environment variables only for Supabase credentials.
- No hardcoded secrets.
- Role-based route protection enforced client-side.
- Respect Supabase RLS policy expectations for per-role data boundaries.

## 10. Performance Requirements
- Debounced sync writes from client state.
- Avoid duplicate subscriptions.
- Real-time updates should be incremental and low-latency.
- Dashboard data should handle empty datasets gracefully.

## 11. Reliability Requirements
- All CRUD operations return deterministic error handling.
- Realtime channel failures should log clear errors and keep UI usable.
- Auth session transitions should not leave stale user state.

## 12. Analytics and Monitoring (Recommended)
- Track CRUD failure rates by module.
- Track realtime subscription error events.
- Track auth failure reasons (invalid role metadata, invalid credentials).

## 13. Release Plan

### Phase 1 (Completed)
- Core Supabase service and sync architecture
- AuthContext Supabase session/role integration
- Hook-level two-way sync stabilization
- Full Doctor portal example (CRUD + realtime + dashboard)
- Reusable Supabase CRUD template

### Phase 2
- Admin portal full service-based migration
- Reception + Nurse portal full migration

### Phase 3
- Pharmacy + Laboratory + Patient + Blood Bank full migration
- Cross-portal metric standardization

### Phase 4
- Hardening, test coverage expansion, rollout sign-off

## 14. Acceptance Criteria
- Routing structure unchanged.
- UI layout patterns unchanged.
- No new Supabase tables introduced.
- Supabase-authenticated users can only access authorized portals.
- CRUD paths for target modules work with proper loading/error/empty states.
- Realtime updates visible without manual refresh.
- Production build passes with TypeScript safety.

## 15. Risks and Mitigations
- Risk: Inconsistent table naming (camelCase/snake_case)
  - Mitigation: Service-level fallback mapping and normalization.
- Risk: Metadata role missing for valid users
  - Mitigation: Role validation and controlled auth failure handling.
- Risk: Realtime event storms
  - Mitigation: Scoped subscriptions and controlled refresh behavior.

## 16. Dependencies
- Supabase project with configured tables and RLS.
- Valid env variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- Existing frontend portal modules and shared components.

## 17. Open Decisions
- Final RLS policy matrix by role and table.
- Aggregation strategy for high-volume dashboard metrics.
- Whether to gradually deprecate localStorage sync once direct service usage is complete.
