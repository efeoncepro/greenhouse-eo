# TASK-1687 — `cliente.creative_hub` declara una página que no existe: decidir si se construye o se retira del bundle

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El bundle `creative_hub_globe_v1` declara `cliente.creative_hub` → `/creative-hub`, y **esa página no
existe**. Sky Airlines tiene el bundle asignado desde el 2026-08-09, así que sus tres usuarios activos
ven un enlace de menú que no lleva a ninguna parte. La señal
`identity.client_portal.assigned_view_without_route` lo reporta en **1** desde que se creó, a propósito:
es una decisión de producto, no un fix de código, y esconderla en un allowlist sería fingir que está
resuelta.

Esta task toma esa decisión y la ejecuta.

## Why This Task Exists

El defecto era **latente desde el seed de `TASK-824`**; lo activó un cambio de **dato** —el assignment
del bundle a SKY—, así que ningún gate de código podía verlo y ningún deploy lo detectó. Esa es
exactamente la razón de que exista la señal.

Se separó de `TASK-1685` deliberadamente. `TASK-1685` cambia la **semántica de autorización** del portal
cliente; esto cambia el **catálogo comercial**. Mezclarlos haría que un revert de la semántica tocara el
bundle de un cliente — dos blast radius distintos en un mismo commit. `TASK-1685` §D3 dejó la decisión
tomada (retirar el viewCode) y su ejecución acá.

## Goal

- `/creative-hub` deja de ser un enlace muerto para los usuarios de Sky Airlines.
- La señal `identity.client_portal.assigned_view_without_route` baja a **0**.
- **SKY conserva `creative_hub_globe_v1` íntegro y sus otras 5 vistas.** Nunca se le quita el módulo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1 menú, §12.2 guard)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** quitarle el módulo `creative_hub_globe_v1` a SKY para bajar la señal. El cliente lo
  contrató; lo que sobra es un viewCode sin página, no el producto.
- **NUNCA** editar `greenhouse_client_portal.modules.view_codes` in-place: la tabla es append-only y
  `modules_append_only_check` lo bloquea. El camino es una versión nueva del módulo + supersede de la
  asignación en la misma transacción, preservando `status`, `tier`, `expires_at` y `metadata_json`, y
  dejando la cadena en `source_ref_json`. Patrón fuente verbatim:
  `migrations/20260808131441444_task-1310-seo-client-view-codes.sql` (`seo_v1` → `seo_v2`).
- **NUNCA** agregar `cliente.creative_hub` a un allowlist de la señal para silenciarla.

## Normative Docs

- `src/lib/reliability/queries/client-portal-assigned-view-without-route.ts` — la señal y su rationale
- `docs/tasks/in-progress/TASK-1685-client-portal-single-visibility-primitive.md` §D3 — por qué se separó
- `docs/issues/resolved/ISSUE-148-...md` — el contexto del carril de acceso

## Dependencies & Impact

### Depende de

- `greenhouse_client_portal.modules` (`creative_hub_globe_v1`) + su assignment vigente a SKY
- `greenhouse_core.view_registry` (`cliente.creative_hub`)

### Impacta a

- Los 3 usuarios activos de Sky Airlines
- La señal `identity.client_portal.assigned_view_without_route` (1 → 0)

### Files owned

- La migración de supersede del bundle
- `src/lib/client-portal/composition/menu-builder.ts` (`VIEW_CODE_NAV_DESCRIPTOR`) si se retira el viewCode

## Current Repo State

### Already exists

- La señal, que nombra el caso y no lo esconde
- El patrón de supersede append-only de módulos, ejecutado y verificado en `TASK-1310`
- El descriptor de nav de `cliente.creative_hub` en `menu-builder.ts`

### Gap

- La página `/creative-hub` no existe bajo `src/app/(dashboard)/`
- La decisión producto/retiro no está tomada por escrito

## Modular Placement Contract

- Topology impact: `none`
- Current home: `migrations/` + `src/lib/client-portal/**`, runtime Vercel
- Future candidate home: `remain-shared`
- Boundary: el catálogo de módulos es del BFF del portal cliente; la decisión es comercial
- Server/browser split: server-only puro
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_client_portal.modules` + `module_assignments`
- Consumidores afectados: menú del portal cliente de SKY, señal de reliability
- Runtime target: `local` + `staging` + `production`

### Contract surface

- Contrato existente a respetar: `modules` es append-only (`modules_append_only_check`)
- Contrato nuevo: `creative_hub_globe_v2` sin `cliente.creative_hub`
- Backward compatibility: `gated` — cambia qué ve un cliente real
- Full API parity: no aplica (cambio de dato del catálogo)

### Data model and invariants

- Entidades afectadas: `modules` (INSERT), `module_assignments` (INSERT + supersede del vigente)
- Invariantes que no se pueden romper:
  - SKY conserva las otras 5 vistas del bundle (`cliente.pulse`, `proyectos`, `campanas`, `equipo`, `reviews`)
  - el assignment nuevo preserva `status`, `tier`, `expires_at`, `metadata_json` y aprobación
  - `view_registry` conserva `cliente.creative_hub` marcado, no borrado (append-only)
- Tenant/space boundary: `organization_id` de SKY
- Idempotency/concurrency: `ON CONFLICT DO NOTHING` + `FOR UPDATE` sobre el assignment vigente
- Audit/outbox/history: `source_ref_json` con la cadena de supersede

### Migration, backfill and rollout

- Migration posture: `seed` (supersede de catálogo)
- Default state: n/a
- Backfill plan: la propia migración supersede el assignment vigente
- Rollback path: migración de supersede inversa (forward-only, nunca DELETE)
- External coordination: avisar a quien gestione la cuenta de SKY si la superficie estaba prometida

### Security and access

- Auth/access gate: ninguno nuevo
- Sensitive data posture: `no sensitive data`
- Error contract: n/a (migración)
- Abuse/rate-limit posture: `none with rationale`

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/client-portal`, `pnpm local:check`
- DB/runtime checks: `scripts/identity/client-portal-visibility-baseline.ts` antes y después — los pares
  de SKY tienen que bajar exactamente en 1 (el viewCode retirado), nunca más
- Integration checks: menú de SKY sin el enlace muerto
- Reliability signals/logs: `identity.client_portal.assigned_view_without_route` → 0
- Production verification sequence: ver §Rollout

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Confirmar la decisión con quien gestiona la cuenta

`TASK-1685` §D3 decidió **retirar el viewCode**, sobre la base de que la página no existe y no hay
trabajo de UI planificado. Antes de ejecutar, confirmar que a SKY no se le prometió esa superficie como
parte del bundle. Si se le prometió, la task cambia de forma: pasa a ser "materializar `/creative-hub`",
que es trabajo de UI con su propio contrato de diseño (wireframe/flow/motion) y **no cabe en esta task**
— habría que abrir una `ui-ux` aparte.

### Slice 2 — La migración de supersede

`creative_hub_globe_v1` → `creative_hub_globe_v2` con los 5 viewCodes restantes, supersede del
assignment de SKY en la misma transacción, y bloque `DO` con `RAISE EXCEPTION` que aborta si el
assignment vigente no quedó migrado o si el bundle nuevo no tiene exactamente los 5.

### Slice 3 — Limpieza del descriptor y cierre

- Evaluar si `cliente.creative_hub` sale de `VIEW_CODE_NAV_DESCRIPTOR` (`menu-builder.ts`).
- `view_registry`: marcar la vista como retirada, **no** borrarla.
- Verificar la señal en 0 contra producción.

## Out of Scope

- Construir `/creative-hub`. Si esa es la decisión del Slice 1, es una task `ui-ux` nueva.
- Cualquier otro viewCode forward-looking del `VIEW_REGISTRY` sin página: la señal sólo cuenta los
  **asignados**, y declarar sin asignar es correcto por diseño.

## Rollout Plan & Risk Matrix

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| SKY pierde el bundle entero por un supersede mal escrito | Portal cliente | Baja | bloque `DO` que valida los 5 viewCodes + el assignment vigente post-apply | `client-portal-visibility-baseline.ts` |
| La superficie sí estaba prometida comercialmente | Comercial | Media | Slice 1 antes de la migración | — |
| Se edita `view_codes` in-place | Datos | Baja | `modules_append_only_check` lo bloquea en DB | — |

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | nada que revertir | — | sí |
| 2 | migración de supersede inversa (forward-only) | <15 min | sí |
| 3 | revert PR | <5 min | sí |

### Production verification sequence

1. `client-portal-visibility-baseline.ts` antes: los pares de SKY incluyen `cliente.creative_hub`.
2. Aplicar migración.
3. `client-portal-visibility-baseline.ts` después: mismo conjunto **menos** ese viewCode, nada más.
4. `identity.client_portal.assigned_view_without_route` en 0.
5. Menú de SKY sin el enlace muerto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La decisión del Slice 1 está escrita, con quién la confirmó.
- [ ] SKY conserva `creative_hub_globe_*` con sus otras 5 vistas — verificado contra PG.
- [ ] `identity.client_portal.assigned_view_without_route` en 0.
- [ ] Ninguna fila borrada: `modules` y `view_registry` siguen append-only.
- [ ] Los usuarios de SKY no ven el enlace muerto.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/client-portal`
- `scripts/identity/client-portal-visibility-baseline.ts` antes y después

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] la señal verificada en 0 contra producción

## Open Questions

1. **¿Se le prometió a SKY la superficie Creative Hub como parte del bundle?** Decide entre retirar el
   viewCode y materializar la página. `TASK-1685` §D3 asumió que no, sobre la base de que no hay trabajo
   de UI planificado — es un supuesto, no un registro.
