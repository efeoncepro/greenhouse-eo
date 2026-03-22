# CODEX TASK -- People 360 Enrichments (v1)

## Delta 2026-03-22
- Dependencia `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` cerrada — People consumers (`get-people-list.ts`, `get-person-detail.ts`) ahora Postgres-first con BigQuery fallback
- `get-person-detail.ts` es archivo owned por esta task y fue modificado: ahora tiene Postgres queries directas para member, assignments e identity links
- Implicación: enrichments nuevos pueden asumir que `identity_profile_id` está disponible en el path primario de lectura; no necesitan hacer resolución separada
- `person_360` ya se usa como backbone para identity context y access context en person detail
- Admin Team module now also Postgres-first; member reads in `mutate-team.ts` use same `shouldFallbackToLegacy` pattern; enrichments from team capacity can now assume Postgres path for roster data — cerrado por trabajo en `CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1`

## Estado

Follow-up operativo creado el `2026-03-19` despues de cerrar la task fundacional:
- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md`

La base del modulo ya existe:
- `/people`
- `/people/[memberId]`
- tabs operativas
- integracion con `Admin Team`
- read enrichments base de `capacity`, `financeSummary` y payroll

Lo pendiente ya no es "crear People", sino enriquecerlo como surface 360 sin romper ownership de otros modulos.

## Resumen

Extender `People` como capa de lectura transversal del colaborador, consumiendo dominios satelite ya existentes sin convertirlo en master de mutacion.

## Scope

### 1. Enrichments prioritarios

- identidad enlazada y facetas canónicas visibles desde `Person 360`
- mejor lectura de permisos / acceso cuando sea util para admins
- enrichments de `HR Core` listos para consumo read-only
- enrichments de `AI Tooling` si la experiencia necesita mostrar licencias o wallets por colaborador

### 2. Surface 360

- mejorar el uso de `GET /api/people/meta`
- hacer visible el contrato de tabs y enrichments soportados
- evitar que frontend tenga que adivinar ownership o permisos entre modulos

### 3. UX de consolidacion

- CTAs claros hacia `Admin Team`, `Payroll`, `Finance` u otros dueños de write
- mantener `People` como orquestador de lectura, no como write layer nuevo

## Fuera de alcance

- mover writes a `/api/people/*`
- duplicar CRUD de roster o assignments
- reabrir el diseño fundacional del modulo

## Criterios de aceptacion

- `People` expone mejor el contexto cross-module del colaborador
- los enrichments nuevos vienen de modulos dueños ya existentes
- no se duplican namespaces ni ownership de mutacion

---

## Dependencies & Impact

- **Depende de:**
  - `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` — enrichments requieren cobertura alta de `person_360`
  - `CODEX_TASK_People_Unified_View_v3` (completada — base del módulo)
  - HR Core, Finance, AI Tooling módulos existentes (como fuentes de enrichment)
- **Impacta a:**
  - `CODEX_TASK_Team_Identity_Capacity_System_v2` — capacity enrichment converge con People 360
  - `CODEX_TASK_Staff_Augmentation_Module_v2` — People enrichment muestra `assignment_type` badges
- **Archivos owned:**
  - `src/views/greenhouse/people/tabs/*` (extensiones de tabs)
  - `src/app/api/people/meta/route.ts` (contrato de enrichments)
  - `src/lib/people/get-people-meta.ts`, `src/lib/people/get-person-detail.ts`
