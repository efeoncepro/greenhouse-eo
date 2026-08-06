# TASK-1649 — Revisión del `space` y `client_profile` heredados de Efeonce

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `db`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1648`

- Branch: `Greenhouse develop; sin worktrees`

## Summary

Decidir y ejecutar qué hacer con el `space` de tipo `client_space` y la fila de
`client_profiles` que Efeonce arrastra desde marzo de 2026, cuando todavía se la modelaba como
cliente. Medir primero qué consume esas filas antes de tocarlas.

## Why This Task Exists

Cuando se empezó a construir Greenhouse, Efeonce tuvo un espacio de cliente. Después se decidió
que **no debía aparecer como cliente, porque no lo es: es la entidad legal y operadora**. Esa
decisión se tomó pero nunca se ejecutó del todo.

Auditado el 2026-08-06, quedan vivas:

- `greenhouse_core.spaces` → `spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`, nombre `Efeonce`,
  `space_type='client_space'`, `active=true`.
- `greenhouse_finance.client_profiles` → `space-efeonce`, creada 2026-03-14.

Estas filas son **independientes de `organization_type`**: sobreviven a la corrección del rol
comercial hecha el 2026-08-06, y alimentan todo lo que lista clientes desde esas tablas en vez
de desde `organizations` — por ejemplo `getActiveClients`
(`src/lib/team-admin/mutate-team.ts:625-635`) y el `totalClients` del dashboard interno
(`src/lib/internal/get-internal-dashboard-overview.ts:103-104`).

No se tocan a la ligera: los `spaces` mueven asignación de equipo e ICO. Retirar el espacio sin
medir puede romper asignaciones o métricas de delivery.

## Goal

Que el modelo refleje la decisión ya tomada —Efeonce no es cliente— sin romper asignaciones de
equipo, ICO ni ninguna métrica que hoy dependa de esas filas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` §Organization Types — los tres
  ejes ortogonales y por qué la operadora no tiene rol comercial.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `Space` y `Cliente` como objetos
  canónicos y su relación.

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — puerta única de nacimiento de cliente.
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — rol de `client_profiles`.

## Dependencies & Impact

### Depends on

- `TASK-1648` — el guard por flag debe existir antes, para que el cierre de esta task no sea la
  única cosa que impide que la operadora reaparezca como cliente.
- `greenhouse_core.spaces`, `greenhouse_finance.client_profiles`, `greenhouse.team_members`
  y las tablas de asignación/ICO que referencien `space_id` `[verificar alcance real]`.

### Blocks / Impacts

- Conteos de clientes del dashboard interno y de cualquier reader que cuente `spaces` de tipo
  `client_space`.

### Files owned

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `scripts/commercial/` (script de remediación nuevo, si la decisión es retirar)

## Current Repo State

### Already exists

- `scripts/commercial/reset-organization-commercial-role.ts` — puerta canónica de bajada de rol
  comercial (creada 2026-08-06), ya aplicada a `EO-ORG-0007`.
- Guard por flag ya probado en `src/app/(dashboard)/growth/aeo/page.tsx:107`.

### Gap

- No hay inventario de qué consume `spc-c0cf6478-…` ni `space-efeonce`.
- No hay decisión registrada sobre si el espacio se desactiva, se reclasifica a otro
  `space_type` (por ejemplo uno interno) o se conserva por dependencias de ICO/asignación.
- `greenhouse.clients` no fue verificable en la auditoría del 2026-08-06 (el schema consultado
  no existía con ese nombre) `[verificar el nombre real del schema]`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `greenhouse_core.spaces` + `greenhouse_finance.client_profiles` en Cloud SQL,
  operados por scripts de remediación en `scripts/commercial/`
- Future candidate home: `remain-shared`
- Boundary: la puerta canónica de escritura del space/cliente; consumers autorizados son los
  readers de asignación de equipo, ICO y Finanzas
- Server/browser split: la remediación corre server-side por script con proxy Cloud SQL; el
  browser no participa en ningún momento
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `db`
- Source of truth afectado: `greenhouse_core.spaces`, `greenhouse_finance.client_profiles`
- Consumidores afectados: asignación de equipo, ICO, dashboard interno, Finanzas
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `Space` como objeto canónico del 360; `space_id` como clave de
  asignación y de ICO
- Contrato nuevo o modificado: ninguno — es corrección de datos
- Backward compatibility: `gated` — depende de la decisión del Slice 2
- Full API parity: cualquier mutación pasa por comando/script canónico, nunca SQL directo

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.spaces`, `greenhouse_finance.client_profiles`
- Invariantes que no se pueden romper:
  - NUNCA borrar filas: desactivar o reclasificar, para preservar historia y FKs.
  - Ninguna asignación de equipo ni serie de ICO puede quedar huérfana.
  - `is_operating_entity` de `EO-ORG-0007` no se toca.
- Tenant/space boundary: la operadora no debe tener espacio de **cliente**; si necesita un
  espacio interno, es otro `space_type`.
- Idempotency/concurrency: el script de remediación debe ser idempotente y dry-run por default.
- Audit/outbox/history: registrar la remediación con motivo, igual que
  `reset-organization-commercial-role.ts`.

### Migration, backfill and rollout

- Migration posture: `none` esperado; si la decisión exige DDL, `additive`
- Default state: `read-only` — Slice 1 es puro inventario
- Backfill plan: dry-run → allowlist de 1 fila → apply, con verificación antes/después
- Rollback path: reactivar la fila (por eso no se borra)
- External coordination: sign-off del operador antes del apply

### Security and access

- Auth/access gate: script server-side con perfil `ops` sobre proxy Cloud SQL
- Sensitive data posture: `no sensitive data`
- Error contract: el script aborta con mensaje explícito ante cualquier regresión detectada
- Abuse/rate-limit posture: `none with rationale` — operación manual puntual

### Runtime evidence

- Local checks: `pnpm lint`, `pnpm typecheck`, tests focales si se toca código
- DB/runtime checks: inventario de consumidores + conteos antes/después
- Integration checks: `n/a`
- Reliability signals/logs: señales comerciales y de ICO sin cambios inesperados
- Production verification sequence: dashboard interno, listados de clientes y una vista de ICO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1** — Inventario read-only: qué tablas y readers referencian
  `spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad` y `space-efeonce` (asignaciones, ICO, finanzas,
  conteos). Entregable: informe con conteos reales, sin mutar nada.
- **Slice 2** — Decisión registrada del operador entre: (a) desactivar el space, (b)
  reclasificar a un `space_type` interno, (c) conservar y documentar por qué.
- **Slice 3** — Ejecutar la decisión con script idempotente dry-run/apply + verificación
  antes/después, y dejar Delta en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`.

## Out of Scope

- Cambiar `organization_type` (ya corregido el 2026-08-06).
- Agregar el guard por flag a los readers → `TASK-1648`.
- Retirar las capabilities de Efeonce: los `module_assignments` (`seo_v1`, `proposal_studio_v1`)
  se conservan; la operadora sigue monitoreando sus propias métricas.
- Crear un `space_type` nuevo si la decisión no lo exige.

## Detailed Spec

El eje de decisión es si el `space` cumple hoy una función operativa real (asignación de equipo
interno, ICO de trabajo propio) o si es sólo un residuo del modelado de marzo.

Si cumple función, la respuesta correcta probablemente no es borrarlo sino **reclasificarlo**:
el problema no es que Efeonce tenga un espacio, es que ese espacio esté tipado como
`client_space`.

Si no cumple ninguna función, desactivar (`active=false`), nunca `DELETE`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (inventario) → Slice 2 (decisión) → Slice 3 (ejecución).
- Slice 3 NO puede correr sin el sign-off del Slice 2: sin inventario, desactivar el space puede
  romper asignaciones de equipo o series de ICO en silencio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper asignaciones de equipo | Agency/People | Media | Slice 1 inventaría referencias antes de tocar | Miembros sin espacio asignado |
| Romper series de ICO | Delivery/ICO | Media | Inventario + conteos antes/después | Métricas de ICO con hueco |
| Perder historia por `DELETE` | Plataforma | Baja | Invariante: sólo desactivar o reclasificar | Filas ausentes en auditoría |
| Descuadre de conteos de cliente | Dashboard interno | Alta (esperado) | Es el objetivo; documentar el delta esperado | `totalClients` baja en 1 |

### Feature flags / cutover

Sin flag: es corrección de datos puntual con dry-run y rollback por reactivación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | n/a (read-only) | — | — |
| 2 | n/a (decisión documental) | — | — |
| 3 | reactivar la fila / restaurar `space_type` | <10 min | Sí |

### Production verification sequence

1. Conteo de clientes del dashboard interno: baja exactamente en 1.
2. Asignaciones de equipo: sin miembros huérfanos.
3. ICO: sin hueco en las series.

### Out-of-band coordination required

Sign-off explícito del operador entre Slice 2 y Slice 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe inventario con conteos reales de qué consume el space y el client_profile.
- [ ] La decisión del Slice 2 está registrada con su razón en la doc canónica.
- [ ] Si se ejecutó mutación, fue por script idempotente con dry-run y verificación antes/después.
- [ ] Ninguna fila fue borrada (sólo desactivada o reclasificada).
- [ ] Asignaciones de equipo e ICO sin regresión verificada.
- [ ] `module_assignments` de Efeonce intactos (`seo_v1`, `proposal_studio_v1`).

## Verification

- Queries de inventario contra PG real.
- Conteos antes/después de las 3 superficies de la secuencia de verificación.
- `pnpm lint` + `pnpm typecheck` si se tocó código.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-1648`)
- [ ] Delta en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

## Follow-ups

- Si la decisión es reclasificar, evaluar si hace falta un `space_type` canónico para trabajo
  interno de la propia operadora.

## Open Questions

1. ¿El espacio de Efeonce cumple hoy alguna función de asignación de equipo o ICO, o es residuo
   puro? Lo responde el Slice 1.
2. ¿Cuál es el schema real de la tabla `clients` (la auditoría del 2026-08-06 no pudo
   consultarla como `greenhouse.clients`)?
