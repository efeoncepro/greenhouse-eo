# TASK-1120 — Design Handoff Registry ("Por implementar" lane)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui|platform|design-system`
- Blocked by: `none`
- Branch: `task/TASK-1120-design-handoff-registry`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea un **registro de handoff de diseño** dentro de `/admin/design-system`: un carril
"Por implementar" donde el equipo de diseño registra un **nodo Figma de una página de
producto** (renderiza preview vía el pipeline de TASK-1072), y DEV la implementa desde
ahí. Es un aggregate nuevo `design_handoff_entries` con lifecycle propio
(`proposed → in_implementation → implemented`), **separado** del linking AXIS-only de
TASK-1072, con un **allowlist gobernado de archivos de producto** y una señal de drift
para el huérfano inverso (UI vibe-coded sin diseño).

## Why This Task Exists

Hoy el sistema de diseño solo conoce **superficies ya implementadas** (`design_system_figma_nodes`
se llavea por `surface_key` = ruta existente, AXIS-only fail-closed). Eso deja dos
huérfanos:

1. **Diseño-primero:** un diseño existe en Figma pero la ruta aún no → no hay dónde
   colgarlo → queda flotando sin registro formal (el handoff diseño→DEV es informal).
2. **Código-primero (vibe-coded):** la ruta existe pero nunca pasó por Figma → tiene
   superficie, le falta el nodo/diseño.

Además, hoy los diseños de producto se meten **dentro del archivo AXIS** porque era el
único permitido por el allowlist fail-closed de TASK-1072. Eso es incorrecto: AXIS es el
**master del sistema** (tokens/primitivas/componentes); una **página de producto es un
consumidor del sistema, no parte de él**. Conflatarlos contamina el master con trabajo de
feature efímero. El flujo ideal: el diseño de producto vive en **archivos de producto**, se
registra como handoff, renderiza su preview, y DEV implementa desde la intención —
invirtiendo el modelo de "implementar primero → vincular después" a "intención primero →
implementar".

## Goal

- Un carril "Por implementar / Handoff" navegable en `/admin/design-system`, gobernado por
  el rol `designer` ∪ admin, donde un diseñador registra un nodo Figma de producto y ve su
  preview.
- Un aggregate `design_handoff_entries` con lifecycle `proposed → in_implementation →
  implemented (+ archived)`, **sin tocar** el linking AXIS de primitivas.
- Allowlist **gobernado** de archivos Figma de producto (no "cualquier URL"; no
  token-scope-only).
- Señal de drift del huérfano inverso (implementado sin diseño) — visible, no bloqueante.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `CLAUDE.md` → "Design System Figma node linking — ver ≠ vincular (TASK-1072)"
- `CLAUDE.md` → "Notion Integrations Registry" (patrón canónico de allowlist gobernado)

Reglas obligatorias:

- **NO** extender ni tocar el allowlist AXIS-only fail-closed de `design_system_figma_nodes`
  (TASK-1072). El handoff de producto es un aggregate **separado** con su propia regla de
  archivo. Las primitivas/tokens del DS siguen AXIS-only.
- **NUNCA** aceptar "cualquier URL de Figma que el token alcance". El boundary canónico es un
  **allowlist gobernado de `file_key` de producto** (tabla append-only, admin/designer),
  validado fail-closed al registrar. El token solo es la 2ª capa (defense-in-depth).
- Trío canónico **state machine + CHECK + audit trio** para el lifecycle: CHECK enum +
  trigger de transición + tabla de eventos append-only (anti-UPDATE/DELETE). Patrón TASK-700/765/790.
- Capability nueva sembrada **en el mismo PR** en catalog + `capabilities_registry` + grant en
  `runtime.ts` (invariante TASK-873/935; guard `capability-grant-coverage.test.ts`).
- **DS es interno-only** — NUNCA `client_*`. El carril hereda el gate `plataforma.design_system`.
- **Ver ≠ registrar:** ver el DS = plano views (abierto a interno); **registrar/transicionar** un
  handoff = plano entitlements (`design_system.handoff.*`, solo `designer` ∪ admin).
- Toda superficie nueva alcanzable por nav + declarada en `route-reachability-manifest.ts` (TASK-982).
- UI por el **loop product-design** + **GVC desktop+mobile** mirada; cero hardcode (tokens AXIS).
- Reusar primitivas TASK-1072 (`parse-figma-url`, `figma-render`) y rol `designer`; NO fork.
- `captureWithDomain(err, 'platform' | 'identity', …)` — NUNCA `Sentry.captureException` directo.

## Normative Docs

- `docs/tasks/complete/TASK-1072-designer-role-figma-node-linking.md` (foundation reusada)
- `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md`

## Dependencies & Impact

### Depends on

- **TASK-1072** (SHIPPED) — `src/lib/design-system/figma-nodes/` (`parse-figma-url.ts`,
  `figma-render.ts`, `axis-file.ts`, `store.ts`), rol `designer`, capability
  `design_system.figma_node.link`, secret `greenhouse-figma-api-token` (provisionado y
  funcional — el render de nodo opera).
- `src/lib/sync/event-catalog.ts` — `AGGREGATE_TYPES` / `EVENT_TYPES` (extender, additive).
- `src/app/api/design-system/figma-nodes/preview/route.ts` — pipeline de preview reusable.
- `src/views/greenhouse/admin/design-system/DesignSystemCatalogView.tsx` +
  `DesignSystemBreadcrumbShell.tsx` — home del DS donde vive el carril.
- `src/components/greenhouse/primitives/index.ts` — `AdaptiveSidecarLayout` / `ContextualSidecar`
  para el inspector.

### Blocks / Impacts

- Ninguna task bloqueada. Aditivo.
- Formaliza el handoff diseño→DEV; consumido por el equipo de diseño + DEV.

### Files owned

- `migrations/[nueva]_task-1120-design-handoff-registry.sql`
- `migrations/[nueva]_task-1120-handoff-capabilities.sql`
- `src/lib/design-system/handoff/` (nuevo módulo: `types.ts`, `state-machine.ts`, `allowlist.ts`,
  `store.ts` server-only)
- `src/app/api/design-system/handoff/route.ts` (+ `[entryId]/route.ts`, `[entryId]/transition/route.ts`)
- `src/lib/reliability/queries/design-handoff-*.ts`
- `src/views/greenhouse/admin/design-system/DesignHandoffLaneView.tsx` (+ inspector + drawer)
- `src/app/(dashboard)/admin/design-system/handoff/page.tsx` (si child route)
- `src/lib/navigation/route-reachability-manifest.ts` (declarar child route)
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capabilities)
- `scripts/frontend/scenarios/design-system-handoff-*.ts` (GVC)

## Current Repo State

### Already exists

- `src/lib/design-system/figma-nodes/parse-figma-url.ts` — parser tolerante de URL/nodo Figma.
- `src/lib/design-system/figma-nodes/figma-render.ts` — render real del nodo (REST `/v1/images`
  + `/v1/files/nodes`, token canónico, fallback honesto). **Funciona** (token provisionado).
- `src/lib/design-system/figma-nodes/axis-file.ts` — `AXIS_FILE_KEY` + `buildFigmaNodeUrl` (universal).
- `src/lib/design-system/figma-nodes/store.ts` — linking AXIS-only fail-closed (NO tocar).
- Rol `designer` + capability `design_system.figma_node.link` (TASK-1072).
- `EVENT_TYPES.designSystemFigmaNode{Linked,Relinked}` + `AGGREGATE_TYPES.designSystemFigmaNode`.

### Gap

- No existe aggregate de handoff: un diseño sin ruta implementada no tiene dónde registrarse.
- El allowlist es AXIS-only → no admite archivos de producto.
- No hay lifecycle de handoff ni señal del huérfano inverso (vibe-coded).
- No hay carril "Por implementar" en el home del DS.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Token scope + allowlist gobernado (foundation de seguridad)

- Verificar (out-of-band) que `greenhouse-figma-api-token` ve los archivos de **producto**, no
  solo AXIS. Documentar el resultado.
- Migration: tabla `greenhouse_core.design_handoff_allowed_files` (append-only: `file_key`,
  `file_label`, `added_by`, `added_at`, `superseded_at`). Seed inicial con los archivos de
  producto aprobados que el operador indique. AXIS NO entra acá (sigue en su propio carril).
- `allowlist.ts` (server-only): reader del set activo + validación fail-closed `isAllowedProductFile(fileKey)`.

### Slice 1 — Aggregate + trío canónico + store

- Migration: `greenhouse_core.design_handoff_entries` (id propio, `title`, `kind` page|component,
  `file_key`, `node_id`, `node_name`, `status` CHECK enum, `implemented_surface_key` nullable,
  `created_by`/`updated_by`, timestamps) + trigger de transición + `design_handoff_entry_events`
  (append-only, anti-UPDATE/DELETE).
- `types.ts` (puro) + `state-machine.ts` (`assertValidHandoffTransition`, mirror del trigger).
- `store.ts` (server-only): `createHandoffEntry` (valida allowlist de producto + parsea URL +
  evento + outbox), `transitionHandoffEntry`, `listHandoffEntries`, `getHandoffEntry`.
- Reusar `parse-figma-url`; el render se reusa tal cual (file_key de producto).
- `event-catalog.ts`: `AGGREGATE_TYPES.designHandoffEntry` + eventos `design_system.handoff.{registered,transitioned,archived}`.

### Slice 2 — Capability + API

- Capability(s) `design_system.handoff.{create,transition,read}` (módulo `design_system`) en
  catalog + `capabilities_registry` (migration) + grant en `runtime.ts` (mismo PR): `designer` ∪
  `efeonce_admin`; `read` puede abrirse a interno si aplica.
- API: `GET /api/design-system/handoff` (list), `POST /api/design-system/handoff` (create),
  `PATCH /api/design-system/handoff/[entryId]/transition`. Gated por `can(...)`, errores
  canónicos es-CL.

### Slice 3 — Reliability signals

- `design_system.handoff.stale_entries` (drift): entries en `proposed`/`in_implementation` con
  edad > N días. Steady configurable. Bien definido.
- Huérfano inverso `design_system.surface_without_design` — **denominador a decidir en Discovery**
  (ver Open Questions). Si se cierra el denominador, shippear; si no, queda follow-up.

### Slice 4 — UI: carril "Por implementar" (loop product-design + GVC)

- Carril en `DesignSystemCatalogView` (o child route `/admin/design-system/handoff`): **queue +
  inspector**. Lista de entries con thumbnail (preview del nodo), título, chip kind, chip estado,
  archivo de producto, link a ruta si implementada.
- Detalle = `AdaptiveSidecarLayout` variant `inspector`/`evidence` (NO drawer custom): preview
  Figma como centro + metadata + acciones de transición ("Tomar para implementar", "Marcar
  implementado + vincular ruta").
- Registrar entrada nueva = drawer/stepper (creación de bajo riesgo): pegar URL de producto.
- Route-reachability + scenario GVC desktop+mobile mirado. Cero hardcode (tokens).

## Out of Scope

- **NO** modificar `design_system_figma_nodes` ni su allowlist AXIS-only (TASK-1072 intacto).
- **NO** import/auto-sync de Figma (más allá del render de preview ya existente).
- **NO** generar código desde el nodo (sigue siendo implementación humana).
- **NO** exponer el carril a `client_*` ni fuera de interno.
- **NO** una superficie de gestión del allowlist por UI en V1 (admin/seed-managed; UI = follow-up
  si la open question lo decide).

## Detailed Spec

Reusa el patrón completo de TASK-1072 (parse → validar archivo → upsert idempotente + evento
append-only + outbox, en una tx). La única diferencia de fondo con el store AXIS:

- el `file_key` se valida contra `design_handoff_allowed_files` (producto) en vez de `AXIS_FILE_KEY`;
- la entrada tiene **identidad propia** (no se llavea por ruta); la ruta es un atributo nullable que
  se llena al transicionar a `implemented`;
- agrega el `status` con CHECK + trigger de transición (el store AXIS no tiene lifecycle).

Lifecycle canónico: `proposed → in_implementation → implemented`; `* → archived`. Terminal:
`archived`. `implemented` exige `implemented_surface_key` no nulo (CHECK condicional).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (allowlist + token scope) → Slice 1 (aggregate/store) → Slice 2 (capability/API) →
  Slice 4 (UI). Slice 3 (signals) puede correr en paralelo una vez cerrado Slice 1.
- Slice 0 **DEBE** ship antes que cualquier write path: sin el allowlist gobernado, registrar un
  handoff sería un vector de fetch arbitrario.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| URL de Figma arbitraria → fetch/exfil de diseño de otro cliente vía preview | UI / security | medium | allowlist gobernado fail-closed (Slice 0) + capability + token scope + audit | no signal — rechazo en write path + audit |
| Capability sembrada sin grant runtime → 403 para todos | identity | medium | seed catalog+registry+runtime mismo PR; guard `capability-grant-coverage.test` | guard de CI rompe build |
| Confusión carril handoff vs primitivas AXIS | UI | low | aggregate + carril separados; copy es-CL clara (ux-writing) | revisión humana / GVC |
| Token NO ve archivos de producto → preview degrada a fallback siempre | UI | medium | verificación de scope en Slice 0 antes de shippear UI | preview muestra fallback (visible) |

### Feature flags / cutover

- Sin flag de runtime crítico — additive (aggregate + carril nuevos, gated por capability +
  viewCode interno). El carril es discoverable solo para quien tenga acceso al DS.
- Si se prefiere rollout graduado del carril, gatearlo con un row de `home_rollout_flags` o un
  viewCode dedicado — decisión menor, no load-bearing.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revert migration (tabla allowlist vacía) + revert PR | <10 min | sí (additive) |
| Slice 1 | aggregate sin consumidores → revert PR; eventos append-only quedan (audit) | <10 min | sí |
| Slice 2 | revoke capability (grant `granted=FALSE`) + revert API PR | <10 min | sí |
| Slice 3 | quitar signals del registry | <5 min | sí |
| Slice 4 | quitar carril del catálogo + child route | <10 min | sí |

### Production verification sequence

1. Slice 0: `pnpm migrate:up` staging + verificar allowlist seedeada + confirmar token ve un
   archivo de producto (preview render real, no fallback).
2. Slice 1: smoke del store contra PG real (crear entry de producto + transición + evento append-only).
3. Slice 2: smoke con usuario `designer` real (crear/transicionar) + `efeonce_admin`; verificar 403
   para no-designer.
4. Slice 4: GVC desktop+mobile del carril (queue + inspector + drawer) mirado; route-reachability gate verde.
5. Repetir en prod con cooldown; monitorear señales.

### Out-of-band coordination required

- **Confirmar con el operador** los `file_key` de producto a aprobar (seed del allowlist).
- **Confirmar scope del token** `greenhouse-figma-api-token` sobre esos archivos (ampliar acceso
  del PAT en Figma si solo ve AXIS).
- Corregir el note stale de CLAUDE.md TASK-1072 ("Figma token pending de provisionar" → ya
  provisionado y funcional).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un `designer` puede registrar un nodo Figma de un archivo de **producto aprobado** y ver su
      preview renderizada en el carril "Por implementar".
- [ ] Registrar un nodo de un archivo **no aprobado** es rechazado fail-closed con error es-CL.
- [ ] El linking AXIS de primitivas (`design_system_figma_nodes`, TASK-1072) sigue intacto y AXIS-only.
- [ ] La entrada transiciona `proposed → in_implementation → implemented`, y `implemented` exige
      una ruta vinculada (CHECK).
- [ ] Cada transición appendea un evento en `design_handoff_entry_events` (no UPDATE/DELETE posible).
- [ ] Capability `design_system.handoff.*` sembrada en catalog + registry + grant runtime (guard verde).
- [ ] El carril es alcanzable por nav + declarado en `route-reachability-manifest.ts`.
- [ ] Señal `design_system.handoff.stale_entries` aparece en el dashboard de reliability.
- [ ] GVC desktop+mobile del carril mirada, sin findings de overflow/contraste/hardcode.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm route-reachability-gate`
- `pnpm fe:capture design-system-handoff --env=local`

## Closing Protocol

- Mover a `complete/` + `Lifecycle: complete`, sincronizar `docs/tasks/README.md` + `TASK_ID_REGISTRY.md`.
- Triple documentación: arquitectura (delta en `ui-platform/` + ADR si el allowlist gobernado es
  platform-level) + funcional + manual de uso (cómo el equipo registra un handoff).
- Invocar `greenhouse-documentation-governor` + `greenhouse-qa-release-auditor` al cierre.
- Corregir el note stale de TASK-1072 en CLAUDE.md.

## Follow-ups / Open Questions

1. **Capability:** ¿`design_system.handoff.create` hermana (recomendado) o reusar
   `design_system.figma_node.link`? Default: hermana (registrar handoff de producto ≠ vincular
   primitiva AXIS).
2. **Allowlist:** ¿lo administra el `designer` por UI, o seed/admin? V1 = seed/admin; UI de gestión
   = follow-up si se decide designer-managed.
3. **Huérfano inverso (Slice 3b):** denominador de "superficie que debería tener diseño" — ¿todas las
   rutas `(dashboard)`? ¿solo las del catálogo DS? Decidir en Discovery antes de shippear esa señal.
4. **IA:** ¿carril dentro de `DesignSystemCatalogView` o child route `/admin/design-system/handoff`?
   Resolver con `info-architecture` en Plan Mode.
