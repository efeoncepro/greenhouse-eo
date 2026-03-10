# Greenhouse Backlog

## Operating Rule

- Keep tasks small, mergeable and verifiable.
- Prefer vertical slices over broad framework work.
- A task is not done until build or lint or a meaningful manual check has passed.

## Now

### P0.1 Tenant Scope and Authentication

- Load real `password_hash` values into `greenhouse.clients`.
- Replace `auth_mode = env_demo` bootstrap with hashed credentials or SSO.
- Use `getTenantContext()` across the remaining authenticated API routes and pages.
- Remove direct runtime dependence on `DEMO_CLIENT_PROJECT_IDS` outside local/bootstrap fallback.

### P0.2 Projects API and UI

- Create `/api/projects` filtered by tenant scope.
- Replace mock content in `/proyectos` with live project cards or table.
- Include project name, status, total tasks, active tasks, on-time percentage and average RpA.
- Add loading and empty states.

### P0.3 Project Detail

- Create `/api/projects/[id]`.
- Create `/api/projects/[id]/tasks`.
- Build `/proyectos/[id]` page with:
  - header KPIs
  - tasks table
  - review pressure section
  - sprint context if available
- Enforce tenant authorization on project id.

## Next

### P1.1 Sprint Views

- Create `/api/sprints`.
- Build `/sprints` from live data.
- Show active sprint progress, history and velocity trend.

### P1.2 Dashboard Depth

- Add `/api/dashboard/charts`.
- Replace remaining static dashboard sections with live chart data.
- Add late tasks, blocked tasks and comment backlog signals.

### P1.3 Settings and Tenant Metadata

- Build `/settings` against `greenhouse.clients`.
- Show client name, email, timezone, scope summary and enabled features.
- Keep edits admin-only until mutation policy exists.

## Later

### P2.1 Multi-User Model

- Add `greenhouse.client_users`.
- Separate tenant metadata from login principals.
- Support multiple users per client with per-user roles.

### P2.2 Admin Operations

- Create internal admin views for tenant onboarding and scope assignment.
- Add CRUD flow for `greenhouse.clients`.
- Add project-scope assignment tooling.

### P2.3 Notifications and Portal Messaging

- Add updates/news feed for innovation and account notices.
- Add tenant-visible status messages and release notes.

## Cross-Cutting Technical Tasks

- Add tests for tenant scope helpers and API route authorization.
- Add error logging around BigQuery failures.
- Add cache strategy per tenant for dashboard and projects.
- Add feature flag handling from `greenhouse.clients.feature_flags`.
- Add observability for failed auth and failed BigQuery queries.

## Done Already

- Greenhouse shell routes and navigation
- demo auth with `next-auth`
- Vercel `staging` environment on `develop`
- BigQuery credentials in Vercel
- first real endpoint: `/api/dashboard/kpis`
- dashboard KPIs fed from BigQuery
- BigQuery dataset `greenhouse`
- table `greenhouse.clients`
