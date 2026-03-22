# CODEX TASK — Admin Team: Migración de Mutaciones BigQuery → PostgreSQL (v1)

## Delta 2026-03-21
- Person 360 Consumer Cutover completado: `get-people-list.ts` y `get-person-detail.ts` ahora Postgres-first — cerrado por trabajo en `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1`
- Implicación: los consumers de People ya leen de `greenhouse_core.members` como fuente primaria; las mutaciones Admin Team deben priorizar `identity_profile_id` linkage en DDL para mantener consistencia con People enrichments

## Estado

Nuevo. Derivado del cierre de `CODEX_TASK_Admin_Team_Module_v2.md`, cuyo scope funcional (CRUD + drawers + APIs) quedó completamente implementado sobre BigQuery.

Esta task aborda la **deuda de runtime**: las mutaciones de roster y asignaciones de equipo siguen escribiendo en BigQuery (`greenhouse.team_members`, `greenhouse.client_team_assignments`, `greenhouse.identity_profile_source_links`), mientras que el resto de la plataforma ya convergió a PostgreSQL-first.

---

## Alineación explícita con Greenhouse 360 Object Model

Esta task debe mantenerse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:
- `member_id` sigue como ancla canónica del objeto `Collaborator`
- Las tablas destino en Postgres deben residir en el schema correcto según el modelo canónico (`greenhouse_core` o el schema que corresponda)
- La migración no debe alterar los contratos de API existentes — solo cambiar el storage backend
- El patrón de migración debe seguir el mismo que se usó en Payroll (`isPayrollPostgresEnabled()` → Postgres-first con fallback BigQuery)

---

## Problema

Actualmente existen **dos capas de mutación** para datos de personas:

| Capa | Rutas | Storage | Qué muta |
|------|-------|---------|----------|
| **Admin Team** | `/api/admin/team/*` | BigQuery | Roster (`team_members`), asignaciones operativas (`client_team_assignments`), identity links |
| **People Memberships** | `/api/people/[memberId]/memberships` | PostgreSQL `greenhouse_core.person_memberships` | Membresías organizacionales |

Ambas capas coexisten pero no están sincronizadas. La capa de People ya opera sobre PostgreSQL via `organization-store.ts`, mientras Admin Team sigue escribiendo en BigQuery via `mutate-team.ts` (1,844 líneas).

---

## Realidad técnica del repo

### Ya existe — BigQuery (lo que se migra)

| Recurso | Ubicación | Líneas |
|---------|-----------|--------|
| `src/lib/team-admin/mutate-team.ts` | Todas las mutaciones admin | ~1,844 |
| 10 API routes admin | `src/app/api/admin/team/**` | — |
| `src/types/team.ts` | Tipos mutation input/output | ~318 |
| `src/lib/team-queries.ts` | Queries de lectura | ~1,478 |

### Ya existe — PostgreSQL (referencia de patrón)

| Recurso | Ubicación | Notas |
|---------|-----------|-------|
| `greenhouse_core.members` | PostgreSQL | Ya tiene `identity_profile_id`, sirve como ancla |
| `greenhouse_core.person_memberships` | PostgreSQL | Membresías org, ya con CRUD completo |
| `src/lib/account-360/organization-store.ts` | CRUD Postgres de memberships | Patrón a seguir |
| `src/lib/payroll/postgres-store.ts` | Store Postgres de payroll | Patrón de migración con feature flag |
| `scripts/setup-postgres-payroll.sql` | DDL payroll | Referencia de estructura DDL |

### No existe (lo que este task crea)

| Gap | Impacto |
|-----|---------|
| Schema DDL para `team_members` y `client_team_assignments` en PostgreSQL | Sin esto no hay storage destino |
| `src/lib/team-admin/postgres-store.ts` | Store layer equivalente a `mutate-team.ts` pero sobre Postgres |
| Feature flag `isTeamPostgresEnabled()` | Patrón Postgres-first con fallback BigQuery |
| Script de backfill `scripts/backfill-postgres-team.ts` | Migración de datos existentes BigQuery → Postgres |
| Migración de `team-queries.ts` a lectura Postgres-first | Las queries de lectura también deben converger |

---

## Plan de implementación

### Fase 1 — DDL y store (backend puro)

1. **DDL**: Crear `scripts/setup-postgres-team.sql`
   - Tabla `greenhouse_core.team_members_v2` (o extender `members` existente si el modelo lo permite)
   - Tabla `greenhouse_core.team_assignments` (reemplaza `client_team_assignments`)
   - Tabla `greenhouse_core.identity_source_links` (si no converge con `person_memberships`)
   - Serving view `member_team_360` si aplica

2. **Store**: Crear `src/lib/team-admin/postgres-store.ts`
   - Mismas funciones exportadas que `mutate-team.ts` pero sobre Postgres
   - `createMember`, `updateMember`, `deactivateMember`
   - `createAssignment`, `updateAssignment`, `deleteAssignment`
   - `getAdminTeamMembersPayload`, `getAdminTeamMemberDetail`
   - `getAdminTeamAssignmentsPayload`, `getAdminTeamAssignmentDetail`

3. **Feature flag**: `isTeamPostgresEnabled()` en `postgres-store.ts`
   - Mismo patrón que `isPayrollPostgresEnabled()` → delega a `isGreenhousePostgresConfigured()`

### Fase 2 — Migración de rutas

4. **Rutas admin**: Actualizar las 10 routes en `src/app/api/admin/team/**`
   - Importar desde `postgres-store.ts` cuando `isTeamPostgresEnabled()` es true
   - Mantener fallback a `mutate-team.ts` (BigQuery) cuando no

5. **Queries de lectura**: Migrar `team-queries.ts` progresivamente
   - `getTeamMembers` → Postgres-first
   - `getTeamCapacity` → Postgres-first
   - Mantener BigQuery como fallback temporal

### Fase 3 — Backfill y cutover

6. **Backfill**: `scripts/backfill-postgres-team.ts`
   - Leer de BigQuery `greenhouse.team_members` + `greenhouse.client_team_assignments`
   - Insertar en Postgres respetando `member_id` como PK
   - Idempotente (re-ejecutable sin duplicados)

7. **Convergencia con People memberships**
   - Evaluar si `person_memberships` y `team_assignments` pueden converger en un modelo unificado
   - Si no, documentar la separación de concerns explícitamente

---

## Criterios de aceptación

- [ ] DDL ejecutado en Cloud SQL sin errores
- [ ] Store Postgres con paridad funcional vs `mutate-team.ts`
- [ ] 10 routes admin funcionando sobre Postgres cuando feature flag activo
- [ ] Backfill ejecutado: todos los `team_members` y `client_team_assignments` migrados
- [ ] `team-queries.ts` leyendo de Postgres-first
- [ ] Zero regresión en UI: drawers, People tabs y Admin Team siguen funcionando
- [ ] `npx tsc --noEmit` limpio

---

## Riesgos

- **Drift de schema**: `team_members` en BigQuery tiene campos que podrían no mapear 1:1 a Postgres (ej. `REPEATED` fields como `email_aliases`). Requiere decisión de schema.
- **Convergencia memberships vs assignments**: Hoy son conceptos separados pero cercanos. La migración es buen momento para evaluar unificación, pero no bloqueante.
- **Queries complejas**: `team-queries.ts` tiene ~1,478 líneas de queries BigQuery con JOINs complejos. La migración a Postgres SQL requiere reescritura cuidadosa.

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.members` (ya implementado — ancla canónica de collaborator)
  - `greenhouse_core.person_memberships` (ya implementado — patrón de referencia)
  - Identity & Access V1 (`greenhouse.team_members`, `greenhouse.client_team_assignments` en BigQuery)
  - `src/lib/payroll/postgres-store.ts` (patrón de migración con feature flag)
- **Impacta a:**
  - `CODEX_TASK_Team_Identity_Capacity_System_v2` — capacity APIs pueden apoyarse en store Postgres
  - `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` — convergencia de consumers con `identity_profile_id`
  - `CODEX_TASK_Staff_Augmentation_Module_v2` — `client_team_assignments` migrado habilita `assignment_type` column
  - `CODEX_TASK_People_360_Enrichments_v1` — enrichments de capacity/assignments más estables sobre Postgres
- **Archivos owned:**
  - `src/lib/team-admin/mutate-team.ts` (migración target)
  - `src/lib/team-queries.ts` (lectura migración target)
  - `src/app/api/admin/team/**` (10 routes)
  - `scripts/setup-postgres-team.sql` (nuevo DDL)
  - `scripts/backfill-postgres-team.ts` (nuevo backfill)
