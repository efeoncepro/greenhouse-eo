# TASK-1389 — Gobernanza de navegación: contrato de superficies + gate de presupuesto del sidebar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1389-navigation-governance-guardrails`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-1388 limpia el desorden de navegación, pero nada mecánico impide que vuelva a inflarse: hoy cualquier task nueva "cuelga" su pantalla del sidebar sin regla de superficie ni tope. Esta task instala los candados anti-regresión: (1) un **Contrato de Asignación de Superficies** (qué destino va a qué superficie: operativo→sidebar, personal→avatar, cola larga→⌘K, frecuente→shortcuts, sin duplicar) documentado + pointer en `CLAUDE.md` + campo declarativo en el template de tasks; y (2) un **gate de CI de presupuesto de navegación** (`scripts/ci/nav-budget-gate.mjs`) que falla si el sidebar interno supera N grupos top-level, más de 2 niveles interactivos, mezcla patrones al mismo tier, o mete una ruta personal `/my/*` en el sidebar. Modo `warn` ahora → `error` tras TASK-1388.

## Why This Task Exists

El sidebar llegó a ~96 hojas / 12 grupos no por una mala decisión sino por **ausencia de freno**: cada task agregaba su item al sidebar sin declarar en qué superficie debía vivir ni chocar contra un tope. Un documento de estilo no evita la reincidencia — un **gate mecánico** sí (mismo aprendizaje que `CLAUDE.md` budget gate, `greenhouse/no-untokenized-copy` y `no-untokenized-motion`: la regla escrita se ignora, el número que rompe el build no). Sin este candado, TASK-1388 arregla el estado pero el problema reaparece en 6 meses. La causa raíz es de **gobernanza**, no de una pantalla concreta.

## Goal

- Existe un Contrato de Asignación de Superficies canónico + pointer en `CLAUDE.md`: toda pantalla/destino nuevo declara su superficie, igual que hoy declara su ruta.
- El template de tasks obliga a declarar la superficie de navegación cuando una task agrega un destino visible.
- Un gate de CI (`pnpm nav:budget`) mide el sidebar interno contra un presupuesto explícito (top-level ≤ N, profundidad ≤ 2, patrón consistente, cero rutas personales en el sidebar) y falla `warn`→`error` según corresponda.
- El gate arranca en `warn` (el sidebar actual tiene 12 grupos) y se promueve a `error` cuando TASK-1388 baje el conteo bajo el tope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón "flag/gate default-OFF + shadow + flip" y "lint rule warn→error + sweep" (mismo shape que este gate).
- `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md` — el manifest de alcanzabilidad ya obliga a declarar dónde es alcanzable cada ruta; este contrato lo complementa con *en qué superficie* vive.
- `docs/tasks/complete/TASK-827-*` (view registry governance) — patrón de gobernanza "TS + migración seed en el mismo PR"; aquí el análogo es "destino + superficie declarada".
- Referencia de estilo del gate: `scripts/ci/task-lint.mjs` + el budget gate de `CLAUDE.md` (`pnpm claude-md budget --strict`).

Reglas obligatorias:

- **NUNCA** el gate se instala directo en `error` mientras el sidebar real esté sobre el tope (rompería CI de inmediato); arranca en `warn` y se promueve tras TASK-1388.
- **NUNCA** el gate hardcodea la lista de items; debe derivar el árbol desde la SoT (`GH_INTERNAL_NAV` / `VerticalMenu.tsx`) para no quedar desincronizado.
- **SIEMPRE** el tope (N top-level, profundidad) vive como constante explícita y documentada, editable con justificación (no un número mágico enterrado).

## Normative Docs

- `docs/architecture/agent-invariants/` — destino del Contrato de Asignación de Superficies (nuevo doc de invariantes de navegación).
- `docs/tasks/TASK_UI_UX_ADDENDUM.md` — donde se agrega el campo declarativo "Nav placement" para tasks con destino visible.
- Artefacto de diseño de la sesión 2026-07-11 (propuesta de navegación por superficies) como racional del reparto.

## Dependencies & Impact

### Depends on

- `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) + `src/components/layout/vertical/VerticalMenu.tsx` — SoT del árbol que el gate parsea `[verificar]` (el gate debe leer una representación estable del árbol; si `VerticalMenu.tsx` es imperativo/condicional, evaluar exponer el árbol como dato o parsear `GH_INTERNAL_NAV`).
- `src/lib/navigation/route-reachability-manifest.ts` — manifest existente (TASK-982) a extender con el campo `surface`.

### Blocks / Impacts

- **Complementa TASK-1388**: el gate se promueve a `error` cuando TASK-1388 baja el sidebar bajo el tope. En `warn` puede shippear antes o después de TASK-1388.
- Impacta a toda task futura que agregue un destino de navegación: deberá declarar superficie.

### Files owned

- `docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` (nuevo)
- `scripts/ci/nav-budget-gate.mjs` (nuevo)
- `package.json` (script `nav:budget`)
- `docs/tasks/TASK_UI_UX_ADDENDUM.md` (campo "Nav placement")
- `CLAUDE.md` (pointer al contrato)
- `src/lib/navigation/route-reachability-manifest.ts` (campo `surface`, si se adopta el slice 3)
- `.github/workflows/*.yml` (wiring del gate, slice 3)

## Current Repo State

### Already exists

- SoT de nav (`GH_INTERNAL_NAV`), render (`GenerateMenu.tsx`), manifest de alcanzabilidad + gate `pnpm route-reachability-gate` (TASK-982).
- Patrón de gate warn→error ya probado en el repo (`no-untokenized-copy`, `no-untokenized-motion` TASK-1346, `CLAUDE.md` budget).
- `scripts/ci/task-lint.mjs` como referencia de parser + severidad configurable.

### Gap

- No hay regla escrita ni mecánica de "a qué superficie va cada destino".
- No hay tope de tamaño/profundidad del sidebar — nada frena que vuelva a inflarse.
- El manifest de reachability declara *dónde* es alcanzable una ruta pero no *en qué superficie* vive.
- El template de tasks no pide declarar superficie de navegación.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ci/` (gate) + `docs/architecture/agent-invariants/` (contrato) + `docs/tasks/` (addendum) + `CLAUDE.md` (pointer).
- Future candidate home: `remain-shared`
- Boundary: el gate deriva el árbol de la SoT (`GH_INTERNAL_NAV`) y no muta runtime; el contrato es doc; el addendum es proceso.
- Server/browser split: `n/a` — es tooling de CI (Node), no corre en runtime del portal.
- Build impact: `none` — script Node standalone, sin dependencias pesadas.
- Extraction blocker: `none` — tooling local.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato de Asignación de Superficies (doc + pointer + addendum)

- Crear `docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` con la regla: operativo→sidebar, personal (`/my/*`)→avatar, cola larga→⌘K, frecuente→shortcuts; prohibición de duplicar un destino en 2 superficies; tope declarado del sidebar (top-level ≤ N, profundidad ≤ 2 niveles interactivos, patrón uniforme por zona).
- Agregar pointer inline en `CLAUDE.md` (sección de navegación/UI) al contrato.
- Agregar a `docs/tasks/TASK_UI_UX_ADDENDUM.md` un campo declarativo **Nav placement** (`sidebar|avatar|command-palette|shortcuts|none`) obligatorio cuando la task agrega un destino de navegación visible.

### Slice 2 — Gate de presupuesto de navegación (`warn`-first)

- Crear `scripts/ci/nav-budget-gate.mjs` que derive el árbol del sidebar interno desde la SoT y valide: (a) grupos top-level ≤ N; (b) profundidad ≤ 2 niveles interactivos; (c) sin mezcla sección/submenú/plano al mismo tier; (d) cero rutas `/my/*` en el sidebar (deben vivir en el avatar).
- Tope como constante explícita documentada. Severidad configurable (`--strict`), default `warn`.
- Agregar `pnpm nav:budget` (+ `--strict`) a `package.json`.

### Slice 3 — Wiring CI + surface en el manifest

- Extender `route-reachability-manifest.ts` con un campo `surface` por ruta y hacer que el gate cross-checkee (una ruta `/my/*` con `surface: sidebar` es error).
- Cablear `pnpm nav:budget` en el workflow de contrato de diseño / CI (advisory hasta la promoción).
- Documentar la condición de flip a `--strict`: cuando TASK-1388 baje el conteo bajo el tope (verificado en verde), promover el gate a `error`.

## Out of Scope

- La reestructuración de la navegación en sí (es TASK-1388) — esta task solo instala los candados.
- El portal cliente/collaborator (mismo criterio que TASK-1388; el contrato aplica pero el tope específico de esa rama se calibra en su follow-up).
- Un linter ESLint AST (se usa un gate Node standalone estilo `task-lint.mjs`, no una regla ESLint nueva, salvo que Discovery lo justifique).

## Detailed Spec

El tope inicial sugerido (a confirmar en Discovery contra el resultado de TASK-1388): **top-level interno ≤ 7**, **profundidad ≤ 2 niveles interactivos** (dominio → sección → hoja, con zonas `isSection` como headings no interactivos), **patrón uniforme por zona** (todo submenú colapsable dentro de una zona), **0 rutas `/my/*` en el sidebar**. El número vive como constante en el gate + citado en el contrato. El gate reporta, por cada violación, la regla, el conteo actual vs el tope, y la ubicación. Patrón de parser/severidad: espejo de `scripts/ci/task-lint.mjs`.

## Rollout Plan & Risk Matrix

Cambio aditivo de tooling + docs, sin runtime de producción, sin migraciones, sin datos.

### Slice ordering hard rule

- Slice 1 (contrato + addendum) puede ir primero e independiente.
- Slice 2 (gate `warn`) depende del contrato (para citar el tope) pero no de TASK-1388.
- Slice 3 (wiring + surface) depende de Slice 2. La **promoción a `error`** del gate está condicionada a que TASK-1388 esté mergeada y el sidebar bajo el tope (verificado verde) — nunca antes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gate en `error` rompe CI porque el sidebar aún tiene 12 grupos | CI | high (si se instala strict antes de tiempo) | Arrancar en `warn`; promover a `error` solo tras TASK-1388 verde | CI rojo en PRs no relacionados |
| El gate parsea mal el árbol (VerticalMenu imperativo) y da falsos positivos | CI | medium | Derivar de `GH_INTERNAL_NAV` (dato) o exponer el árbol como estructura; test del parser | Falsos positivos en el gate |
| El tope elegido es demasiado bajo y bloquea trabajo legítimo | CI | low | Tope como constante documentada, editable con justificación en PR | Fricción reportada por agentes |

### Feature flags / cutover

- La "flag" es la severidad del gate: `warn` (default) → `error` (`--strict`, tras TASK-1388). Revert = volver a `warn`. Sin env var; es un flag de configuración del gate.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (doc/addendum) | revert PR | <5 min | sí |
| Slice 2 (gate warn) | revert PR / quitar `nav:budget` de CI | <5 min | sí |
| Slice 3 (wiring/surface) | volver el gate a `warn` / revert PR | <5 min | sí |

### Production verification sequence

1. `pnpm nav:budget` corre local y reporta el estado actual (esperado: `warn` con el conteo actual > tope hasta que TASK-1388 mergee).
2. Contrato + addendum revisados por el operador (revisión manual, no runtime).
3. Tras TASK-1388 verde: correr `pnpm nav:budget --strict`, confirmar verde, y promover el gate a `error` en CI.

### Out-of-band coordination required

- N/A — repo-only change (tooling + docs). Coordinar con TASK-1388 solo la condición de flip a `--strict`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` con la regla de superficies + el tope explícito, y `CLAUDE.md` tiene el pointer.
- [ ] `TASK_UI_UX_ADDENDUM.md` incluye el campo declarativo **Nav placement** para tasks con destino visible.
- [ ] `pnpm nav:budget` existe, deriva el árbol de la SoT (no hardcodea items), y reporta violaciones de top-level, profundidad, patrón mezclado y rutas `/my/*` en el sidebar.
- [ ] El gate arranca en `warn` y NO rompe CI con el sidebar actual (12 grupos).
- [ ] La condición de promoción a `error` está documentada y ligada a TASK-1388 verde.
- [ ] El tope vive como constante explícita documentada, no como número mágico.
- [ ] (Slice 3) el manifest de reachability declara `surface` por ruta y el gate cruza que ninguna `/my/*` tenga `surface: sidebar`.

## Verification

- `pnpm nav:budget` (warn) — reporta estado actual sin romper.
- `pnpm nav:budget --strict` — falla mientras el sidebar esté sobre el tope (comportamiento esperado pre-TASK-1388).
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (test del parser del gate)

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado si hubo aprendizajes/deuda relevantes
- [ ] `changelog.md` actualizado (nuevo gate + contrato de gobernanza)
- [ ] chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el gate quedó en `warn` con la condición de flip a `error` documentada (o promovido si TASK-1388 ya está verde)

## Follow-ups

- Calibrar el tope específico de la rama cliente/collaborator cuando se haga su reequilibrio (follow-up de TASK-1388).
- Considerar extender el contrato a la topbar (evitar que se agreguen dropdowns nuevos sin justificación de superficie).

## Open Questions

- ¿El gate parsea `GH_INTERNAL_NAV` (dato) o se expone el árbol de `VerticalMenu.tsx` como estructura testeable? (afecta robustez del parser).
- Tope exacto de top-level: ¿7 estricto, o 8 para dar aire? Confirmar contra el resultado real de TASK-1388.
- ¿El gate vive como script standalone (estilo `task-lint`) o como regla ESLint? (default: standalone).
