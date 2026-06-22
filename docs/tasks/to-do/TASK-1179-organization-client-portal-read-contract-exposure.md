# TASK-1179 — Exposición de read-contracts: organization facets + client_portal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `optional`
- Status real: `Diseño — derivada de TASK-1172 (gap ledger). Rank #3 del backlog de parity. Expone reads lib-only/unwired como contrato gobernado.`
- Rank: `TBD`
- Domain: `platform|api|organization|client-portal`
- Blocked by: `none`
- Branch: `task/TASK-1179-org-client-read-contract-exposure`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Exponer como **read-surfaces gobernadas** (API Platform) las **12 capabilities `organization.*` lib-only** (Organization Workspace projection, hoy sin superficie API → MCP/app no la alcanzan) y **verificar el binding** de las **13 capabilities `client_portal.*` declared-unwired** (¿cableadas por el facet-resolver o realmente sin cablear?). Cierra el rank #3 del gap ledger de TASK-1172.

## Why This Task Exists

El reader de TASK-1172 midió que las 12 facets de `organization.*` (account-360) son `lib-only`: tienen primitive en `facet-capability-mapping.ts` pero **ninguna superficie API**, así que solo la UI las alcanza — MCP, app lane y agentes no las consumen por contrato. Y las 13 `client_portal.*` salen `declared-unwired` (referencia solo en tests / cableado por indirección, no por literal), lo que requiere verificar si el facet-resolver las consume (OK) o están sin cablear. Ambas son superficies de alta frecuencia (account-360 / portal cliente) sin contrato programático completo.

## Goal

- Exponer las facets `organization.*` como read-surface gobernada en `api/platform/app` (o Product API), reusando la projection existente.
- Verificar el binding de `client_portal.*`: confirmar consumo por el facet-resolver o cablearlas; corregir el `declared-unwired` real.
- Re-correr el reader y mostrar `lib-only`/`declared-unwired` bajando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` + `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` — projection server-only.
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` — BFF / anti-corruption layer.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lanes.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md` — backlog (rank #3).
- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md` — alimenta.
- Skills: `greenhouse-backend`, `arch-architect`.

Reglas obligatorias:

- **NUNCA** computar visibilidad de facet en el cliente (projection server-only).
- **NUNCA** importar `@/lib/client-portal/*` desde un producer domain (es hoja del DAG).
- **SIEMPRE** reusar la projection/reader existente; el API surface es un consumer.

## Normative Docs

- Reader `scripts/audit/full-api-parity-coverage.ts` (lista las capabilities lib-only/unwired vía `--json`).

## Dependencies & Impact

### Depends on

- Organization Workspace projection (`src/lib/organization-workspace/**`) — existe.
- Client portal facet-resolver (`src/lib/client-portal/**`) — existe.

### Blocks / Impacts

- Alimenta TASK-650 (read surfaces program) y la operabilidad de lectura de Nexa/MCP sobre account-360.

### Files owned

- `src/app/api/platform/app/organization/**` (o Product API) — read-surface nueva
- `src/lib/client-portal/**` (verificación/cableado de bindings) — ajustar si hay unwired real
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` — Delta

## Current Repo State

### Already exists

- `facet-capability-mapping.ts` con las 12 facets `organization.*` (lib-only).
- Facet-resolver de client_portal (`src/lib/client-portal/readers/native/module-resolver.ts`).

### Gap

- `organization.*` sin superficie API → consumers no-UI no las alcanzan.
- `client_portal.*` sin consumo verificable por literal → binding por confirmar.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite` (read-only, sin write productivo)
- Impacto principal: `reader`
- Source of truth afectado: ninguno (expone projection existente)
- Consumidores afectados: MCP / app lane / Nexa (lectura account-360)
- Runtime target: `staging` → `Production`

### Contract surface

- Contrato existente a respetar: projection server-only + capability `organization.<facet>`
- Contrato nuevo: read-surface gobernada por capability
- Backward compatibility: `compatible` (additive read)
- Full API parity: cierra el gap de superficie API de las facets

### Data model and invariants

- Entidades: projection de Organization Workspace + módulos client_portal
- Invariantes: visibilidad server-only; capability check por facet; sin lógica paralela
- Tenant/space boundary: la projection ya resuelve scope tenant-safe
- Idempotency/concurrency: N/A (read)
- Audit/outbox/history: N/A (read)

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: read-surface gateada por la capability existente
- Backfill plan: N/A
- Rollback path: revert PR
- External coordination: ninguna

### Security and access

- Auth/access gate: `can(tenant, 'organization.<facet>', 'read', scope)`
- Sensitive data posture: facets `*_sensitive` requieren su capability dedicada (no degradar)
- Error contract: `canonicalErrorResponse` es-CL
- Abuse/rate-limit posture: lane API Platform

### Runtime evidence

- Local checks: tests de la read-surface + facet-capability-mapping
- DB/runtime checks: read devuelve la projection real
- Integration checks: MCP/app consume la surface por contrato
- Reliability signals/logs: N/A
- Production verification sequence: staging → verificar capability gate → prod

### Acceptance criteria additions

- [ ] Las 12 facets `organization.*` alcanzables por read-surface gobernada.
- [ ] Binding de `client_portal.*` verificado (consumido o cableado).
- [ ] Reader TASK-1172 muestra `lib-only`/`declared-unwired` bajando en esos módulos.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Verificar bindings declared-unwired

Para las 13 `client_portal.*` y las 3 `organization.*` declared-unwired: confirmar si el facet-resolver las consume por constante (OK → ajustar el reader para no reportar falso unwired) o están sin cablear (→ cablear). Documentar el resultado.

### Slice 2 — Read-surface gobernada para organization facets

Exponer las facets `organization.*` (no-sensibles primero) como read-surface en `api/platform/app/organization/**`, reusando la projection, gateadas por su capability. Tests de la surface.

### Slice 3 — Sensitive facets + re-medición

Exponer las facets `*_sensitive` con su capability dedicada (sin degradar). Re-correr el reader y registrar el delta.

## Out of Scope

- Construir tools de Nexa (TASK-1177).
- Backfill de routes de mutación (TASK-1178).
- Cambiar la projection/lógica de las facets (solo exponerlas por contrato).

## Detailed Spec

Las facets ya resuelven visibilidad/scope server-side. Esta task solo agrega el contrato de lectura (consumer) que MCP/app/Nexa necesitan, sin duplicar lógica. El refinamiento del reader (para no reportar falso `declared-unwired` cuando el binding es por indirección) es parte del Slice 1.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (verificar bindings) → Slice 2 (read-surface no-sensible) → Slice 3 (sensible + re-medición). NUNCA exponer facets sensibles sin su capability dedicada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Exponer facet sensible sin capability dedicada | identity | medium | `*_sensitive` con su capability; no degradar | review + test |
| Falso unwired lleva a cablear algo ya cableado | quality | medium | verificar el facet-resolver antes de tocar | review |
| Read-surface duplica lógica de la projection | organization | low | reusar la projection, surface = consumer | review |

### Feature flags / cutover

- Sin flag — read-surface aditiva gateada por capability existente. Cutover inmediato.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert doc/reader | <5 min | sí |
| 2-3 | revert PR (read-surface) | <10 min | sí |

### Production verification sequence

1. Read-surface en staging gateada por capability.
2. Verificar facet no-sensible accesible con capability; sensible bloqueada sin la dedicada.
3. MCP/app consume por contrato.
4. Prod + re-correr reader.

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Bindings declared-unwired verificados (consumidos o cableados).
- [ ] Facets `organization.*` no-sensibles expuestas por read-surface gobernada.
- [ ] Facets `*_sensitive` con su capability dedicada (sin degradar).
- [ ] Reader TASK-1172 muestra `lib-only`/`declared-unwired` bajando.
- [ ] `pnpm lint` + `pnpm tsc --noEmit` + tests verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/organization-workspace src/lib/client-portal`
- Reader TASK-1172 re-corrido.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-1172, TASK-650)
- [ ] reader TASK-1172 re-corrido con delta registrado

## Follow-ups

- Refinar el reader para distinguir binding-por-indirección de unwired real.
- Exponer reads lib-only de otros módulos (commercial, knowledge).

## Open Questions

- ¿La read-surface va en `api/platform/app` (app lane) o Product API? (decidir en Slice 2 según audiencia).
