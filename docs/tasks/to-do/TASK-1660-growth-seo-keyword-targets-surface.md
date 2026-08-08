# TASK-1660 — Growth SEO: superficie de keywords OBJETIVO y avance contra objetivo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1660-growth-seo-keyword-targets.md`
- Flow: `docs/ui/flows/TASK-1660-growth-seo-keyword-targets-flow.md`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1659`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El command ya acepta cualquier keyword, incluidas las que el cliente **no rankea**. Lo que no
existe es dónde declararlas ni cómo ver si avanzan. Esta task agrega la lente **Objetivos** sobre
`/admin/growth/seo/keywords`: declarar en lote, ver trayectoria y leer avance contra el compromiso.

## Why This Task Exists

Hoy la pantalla sólo ofrece "Seguir" sobre filas que salieron del reader de GSC — posiciones 8 a
20. Pero `trackKeywords(seoTargetId, keywords[], actor)` toma **strings arbitrarios** y no valida
contra oportunidades (verificado 2026-08-07). O sea: la capacidad de perseguir una keyword donde el
cliente no aparece **ya está en el contrato y no tiene superficie**.

Es Full API Parity al revés. El pecado habitual es "la UI lo hace y no hay contrato"; acá el
contrato existe y no hay botón, así que la capacidad sólo es alcanzable por MCP o `curl` — justo
donde no hay confirmación visual del cupo ni del gasto que se compromete.

Y sin la vista de avance no hay narrativa para el cliente: no se puede decir *"de tus 12 objetivos,
4 entraron a primera plana este trimestre"*, que es literalmente el material del QBR.

## Goal

- El operador declara keywords objetivo en lote, viendo el cupo **antes** de confirmar.
- La pantalla separa objetivos de oportunidades sin que un objetivo lejano parezca un fracaso.
- El avance contra objetivo es legible de un vistazo y exportable al reporte del cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§10.4 + delta TASK-1308)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- **Cero HEX/px/fontFamily literales**: tokens del theme, spacing `4n`, radius como longitud CSS.
- **Copy desde `src/lib/copy/growth.ts`**, nunca literales en JSX (lint `no-untokenized-copy`).
- La adaptación por ancho se resuelve **por CSS, no por `useMediaQuery`** — evitar reintroducir el
  mismatch de hidratación de `useId` documentado en `TASK-1657`.
- Estados honestos: una posición desconocida **nunca** se pinta como `0` ni como `—` ambiguo.
- Lookup de primitive antes de construir: `CustomTabsNav`, `DataTableShell`, `AppECharts` existen.

## Normative Docs

- `docs/ui/wireframes/TASK-1660-growth-seo-keyword-targets.md`
- `docs/ui/flows/TASK-1660-growth-seo-keyword-targets-flow.md`
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` — esta superficie extiende el nodo S3
- `docs/manual-de-uso/growth/seguir-keywords-oportunidades-seo.md`

## Dependencies & Impact

### Depends on

- **`TASK-1659`** — sin el modelo de intención no hay nada que declarar; es bloqueo duro
- `src/lib/growth/seo/track-keywords.ts` — `trackKeywords` / `untrackKeywords`
- `greenhouse_growth.seo_rank_snapshots` — la serie que alimenta la trayectoria

### Blocks / Impacts

- `TASK-1310` — dashboard cliente + reporte: el avance contra objetivo es su insumo
- `TASK-1661` — enriquece esta superficie con volumen y dificultad, sin rediseñarla

### Files owned

- `src/views/greenhouse/admin/growth/seo/keywords/**`
- `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx`
- `src/lib/growth/seo/keyword-targets-reader.ts`
- `src/lib/copy/growth.ts`
- `scripts/frontend/scenarios/growth-seo-keyword-targets.scenario.ts`

## Current Repo State

### Already exists

- `/admin/growth/seo/keywords` completa (TASK-1308): banda de veredicto con segmentos que son
  leyenda y filtro, mapa ECharts, tabla `DataTableShell` con lista de cards en `xs`, export CSV,
  filtros en URL, snackbar con deshacer
- `trackKeywords` / `untrackKeywords` con techo, entitlement y outcome por keyword
- `AppECharts` con soporte de `onEvents` (agregado en TASK-1308)
- `loading.tsx` dimensionado al contenido real

### Gap

- No hay superficie para declarar una keyword que no salió del reader
- No hay reader de avance contra objetivo
- La banda de veredicto está acoplada a Oportunidades; hay que extraerla a compartida
- El copy de objetivos no existe en `GH_GROWTH_SEO_KEYWORDS`

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/admin/growth/seo/keywords/`
- Future candidate home: `portal`
- Boundary: la vista consume el reader canónico y los commands existentes; no escribe SQL ni
  reimplementa lógica de dominio
- Server/browser split: reader server-only; la vista recibe el VM ya resuelto (incluido cualquier
  avatar, que se resuelve en el server — `resolveAvatarUrl` es `server-only`)
- Build impact: `none` — ECharts ya está y se carga lazy
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Efeonce de Growth con `growth.seo.target.configure`
- Momento del flujo: después del kickoff con el cliente, cuando existe una lista acordada de
  búsquedas donde el cliente quiere estar; y en cada revisión periódica de avance
- Resultado perceptible esperado: "sé cuántos objetivos ya están en primera plana y cuáles no se
  han movido desde que los declaramos"
- Friccion que debe reducir: hoy declarar un objetivo exige MCP o `curl`, sin ver el cupo ni el
  gasto que se compromete
- No-goals UX: no es un keyword research; no sugiere objetivos; no fija metas de posición ni fecha

### Surface & system decision

- Surface: lente dentro de `/admin/growth/seo/keywords`, seleccionada con `CustomTabsNav`
- Composition Shell: `aplica` — misma composición de regiones que Oportunidades
- Primitive decision: `reuse` — `CustomTabsNav`, `DataTableShell`, `AppECharts`, `GreenhouseChip`;
  `extend` sólo para llevar la banda de veredicto a componente compartido entre lentes
- Adaptive density / The Seam: `aplica` — la tabla nace adaptable a su ancho, por CSS
- Floating/Sidecar/Dialog decision: **drawer** para declarar, no modal — el operador necesita
  seguir viendo qué objetivos ya tiene mientras escribe los nuevos
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `entitlements` — el CTA se renderiza sólo con `growth.seo.target.configure`

### State inventory

- Default: objetivos con posición, Δ y fecha de declaración
- Loading: skeleton dimensionado a las 3 regiones
- Empty: estado vacío completo con las 5 piezas y CTA de declarar
- Error: contrato canónico; sin botón de reintentar cuando `actionable=false`
- Degraded / partial: objetivo declarado sin medición aún → `Sin medición aún` + fecha
- Permission denied: la lente se ve, el CTA no se renderiza
- Long content: >8 series colapsan en agregado, **diciendo el conteo**; nunca truncar en silencio
- Mobile / compact: lista de cards en `xs`, resuelta por CSS
- Keyboard / focus: drawer atrapa foco, `Escape` cierra, foco vuelve al CTA
- Reduced motion: sin transiciones de entrada del chart

### Interaction contract

- Primary interaction: declarar objetivos en lote desde el drawer
- Hover / focus / active: focus ring explícito en segmentos y filas (patrón de TASK-1307)
- Pending / disabled: CTA deshabilitado con motivo cuando el set llegó al techo
- Escape / click-away: cierran el drawer; si hay texto escrito, se confirma antes de descartar
- Focus restore: al CTA que abrió el drawer
- Latency feedback: indicador de actualizando sin tapar los datos ya visibles
- Toast / alert behavior: snackbar con resultado **por keyword** y deshacer; un lote mixto se
  comunica como mixto, nunca como éxito ni como error

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: apertura del drawer con los tokens existentes
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: `motion/core/tokens.ts`
- Reduced-motion fallback: sin animación
- Non-goal motion: sin animación de entrada del chart que retrase la lectura

### Implementation mapping

- Route / surface: `/admin/growth/seo/keywords` — lente `Objetivos`
- Primitive / variant / kind: reuse; extend de la banda de veredicto a compartida
- Component candidates: `KeywordTargetsView`, `KeywordTargetsTable`, `KeywordTargetTrajectory`,
  `DeclareTargetsDrawer`, `KeywordVerdictBand` (extraído)
- Copy source: `src/lib/copy/growth.ts` → bloque de objetivos
- Data reader / command: `readKeywordTargets` (nuevo) + `trackKeywords`/`untrackKeywords`
- API parity: el reader se expone en el lane ecosystem y como tool MCP en el MISMO PR. ⚠️ Es
  **lectura**: va sobre `efeonce.mcp.read` y **no toca Entra**
- Access / capability: `growth.seo.observation.read` para ver, `growth.seo.target.configure` para
  declarar
- States to implement: los 10 del inventario

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-targets.scenario.ts`
- Route: `/admin/growth/seo/keywords`
- Viewports: desktop 1440 + 390px
- Quality profile: `premium`
- Required steps: abrir lente Objetivos · filtrar por "Sin avance" · abrir drawer · cerrar con
  `Escape` y verificar retorno de foco
- Required captures: lente vacía, lente con objetivos, drawer abierto, 390px
- Required `data-capture` markers: `seo-targets-verdict`, `seo-targets-trajectory`,
  `seo-targets-table`, `seo-targets-drawer`
- Assertions: sin overflow horizontal · targets ≥24px · sin `console.error` ni hydration mismatch
- Scroll-width checks: sí — la tabla suma columnas
- Reduced-motion / focus evidence: sí
- Review dossier: `pnpm fe:capture:review`
- Baseline decision / surface ID: `growth-seo-keyword-targets`

### Design decision log

- Decision: lente dentro de la pantalla existente, no ruta nueva
- Alternatives considered: (a) ruta propia `/keywords/targets` — duplicaría veredicto, filtros y
  tabla; (b) mezclar objetivos y oportunidades en una sola tabla con una columna de tipo — hace que
  un objetivo en posición 60 contamine la mediana y se lea como fracaso
- Why this pattern: el objeto es el mismo (el set monitoreado) y las preguntas son distintas; una
  lente es exactamente eso
- Reuse / extend / new primitive: reuse + extend de la banda de veredicto
- Open risks: con muchos objetivos la trayectoria se vuelve ilegible; mitigado con el colapso
  explícito por sobre ~8 series

### Visual verification

- GVC scenario: `growth-seo-keyword-targets`
- Viewports: desktop 1440 + 390px
- Required captures: los 4 de arriba
- Required `data-capture` markers: los 4 de arriba

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `seo_keyword_set_members` (intención de TASK-1659) + `seo_rank_snapshots`
- Consumidores afectados: `UI`, `MCP`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `trackKeywords` / `untrackKeywords` sin cambios
- Contrato nuevo o modificado: `readKeywordTargets(seoTargetId, options)` + su tool MCP
- Backward compatibility: `compatible` — sólo agrega
- Full API parity: el reader nace con lane ecosystem y tool MCP en el mismo PR

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva; sólo lectura
- Invariantes que no se pueden romper:
  - El Δ se calcula contra la **primera medición posterior a la declaración**, no contra el
    histórico completo: un objetivo declarado ayer no puede acreditarse un avance de hace un año
  - Un objetivo sin medición devuelve estado explícito, **nunca** posición `0` ni `100`
  - El reader no infiere la intención: la lee de la columna (TASK-1659)
- Tenant/space boundary: heredado del `seo_target_id`
- Idempotency/concurrency: `n/a` — lectura
- Audit/outbox/history: `none`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled` tras el flag del módulo, ya existente
- Backfill plan: `n/a`
- Rollback path: revert PR
- External coordination: `N/A — repo-only change`. No toca Entra: el reader es lectura

### Security and access

- Auth/access gate: capability para ver; capability separada para declarar
- Sensitive data posture: sin PII; el nombre de quien declaró sale del reader server-side
- Error contract: `canonicalErrorResponse` + `throwIfNotOk` en cliente
- Abuse/rate-limit posture: el techo del set es el freno real

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` + `pnpm local:check:ui`
- DB/runtime checks: reader ejercitado contra PG real con una org con objetivos declarados
- Integration checks: lane ecosystem contra staging con `externalScopeType`/`externalScopeId`
- Reliability signals/logs: ninguna nueva
- Production verification sequence: ver Zone 3

## Hybrid Execution Justification

- **Why not split:** el `Backend impact` es un **reader de lectura pura** — una query sobre tablas
  que ya existen, sin migración, sin schema nuevo, sin command y sin escritura. Partirlo dejaría
  una task de backend cuyo único entregable es un `SELECT` que nadie consume, y una de UI bloqueada
  esperándolo. La foundation de verdad —el modelo de intención, que sí lleva migración— ya está
  separada y es `TASK-1659`, que bloquea a ésta. El split que importaba ya se hizo.
- **Primary execution profile:** `ui-ux`. El valor de la task es la superficie; el reader existe
  para alimentarla.
- **Contract boundary:** `readKeywordTargets` es el único punto de lectura, nace con lane ecosystem
  y tool MCP en el mismo PR, y la vista **no** consulta SQL ni recalcula el Δ por su cuenta. La
  escritura sigue siendo de `trackKeywords`/`untrackKeywords`, que esta task no modifica.
- **Risk controls:** el reader es de lectura, así que el peor caso es un número mal calculado, no
  un dato corrupto. El invariante del Δ —contra la primera medición **posterior** a la
  declaración— tiene test propio, porque es el único lugar donde el reader puede mentir de forma
  creíble. Rollback de cualquier slice es revert del PR: nada muta estado.


## Delta 2026-08-07 — construye esto COMO ESTÁ ESPECIFICADO; el operating mode no te bloquea

El operador señaló que el módulo tiene los mismos tres modelos de servicio que Globe
(`efeonce-managed` | `co-operated` | `client-operated`). Se escribió la doctrina en
`GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md` (**`Proposed`, no `Accepted`**) y `TASK-1663`
(**`P3`, con condición de activación**) para que nadie invente una forma paralela el día que haga
falta.

🔴 **Nada de eso cambia esta task.** Hoy el producto opera de hecho en un solo modo y hay **cero
asignaciones declaradas**:

- **NO esperes a `TASK-1663`.** No es dependencia ni blanda ni dura: es doctrina para después.
- **NO agregues conciencia de modo "por si acaso".** Un branch por modo que nadie ejercita es código
  muerto que se pudre y estorba cuando llegue el caso real.
- **Construye V1 interno** tal como estaba especificado.

**Lo único que aplica desde hoy, y cuesta cero escribirlo:** un modo, plan o etiqueta comercial
**nunca** otorga permisos. Quién puede declarar sigue siendo `can(subject, capability, action,
scope)`. Si alguna vez te encuentras escribiendo `if (mode === …) return true` en un guard, eso es el
error que la doctrina existe para prevenir — y es una línea que simplemente no se escribe.

**Nota específica de 1660:** el wireframe y el contrato de flujo declaran V1 interno y siguen
vigentes tal cual. Lo único que vale la pena no cerrarse: que la columna de autoría muestre **quién**
declaró, sin asumir en el copy que siempre es del lado Efeonce. Es una decisión de redacción, no
arquitectura, y no cuesta nada hoy.

El master flow [EPIC-022 Search Visibility 360](../../ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md)
reconoce esta task como la lente `Objetivos` de S3, hermana de `Oportunidades` (`TASK-1308`) y
`Descubrir` (`TASK-1665`). Las tres comparten ruta, shell, Space/target y viewCode; `Objetivos` no
crea una tab de módulo ni una ruta paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader de avance

- `readKeywordTargets`: objetivos vigentes, posición actual, Δ desde la declaración, página, autoría
- Δ contra la primera medición **posterior** a la declaración
- Estado explícito para objetivo sin medición
- Lane ecosystem + tool MCP de lectura en el mismo PR

### Slice 2 — Lente y tabla

- `CustomTabsNav` de lente con contador en Objetivos
- Banda de veredicto extraída a componente compartido y reusada
- Tabla con `DataTableShell` + cards en `xs` por CSS
- Copy nuevo en `src/lib/copy/growth.ts`

### Slice 3 — Declarar

- Drawer de declaración en lote con **cupo visible antes de confirmar**
- Resultado por keyword en la UI, incluido el cambio de intención
- Snackbar con deshacer

### Slice 4 — Trayectoria y cierre visual

- Line chart con eje Y invertido y referencia en posición 10
- Colapso explícito por sobre ~8 series
- Scenario GVC premium desktop + 390px, con las 4 capturas
- `ui:quality` ≥ 4.5 promedio, piso 4

## Out of Scope

- El modelo de intención — es `TASK-1659`
- Volumen y dificultad — es `TASK-1661`; las columnas **no se renderizan** hasta que existan
- Sugerencia automática de objetivos — depende de keyword gap
- Metas de posición y fecha por objetivo
- **Portal cliente.** V1 es interno. Que el cliente declare sus objetivos necesita su propio modelo
  de permisos y una decisión sobre quién asume el gasto que compromete; queda como follow-up

## Detailed Spec

El detalle de layout, regiones, estados y copy vive en el wireframe; el de coordinación entre
superficies, en el contrato de flujo. Ambos son normativos y se leen antes de escribir JSX.

**El punto que no se puede perder:** declarar un objetivo compromete gasto recurrente igual que
seguir una oportunidad, pero se escribe **a mano**, así que nada acota lo que alguien puede meter.
Por eso el cupo es visible antes de confirmar y el resultado es por keyword. Si esta task entrega
un formulario que dice "listo" y oculta que 3 de 10 no entraron, falló aunque se vea bien.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (reader) → Slice 2 (lente) → Slice 3 (declarar) → Slice 4 (trayectoria).
- Slice 3 **después** de Slice 2: declarar sin poder ver lo declarado deja al operador sin
  confirmación de su propia acción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Texto libre llena el set y agota el techo | UI / gasto | medium | cupo visible antes de confirmar + rechazo explícito por keyword | set en el techo sin explicación |
| El Δ se calcula contra el histórico completo y acredita avances previos a la declaración | reader | medium | invariante en el contrato + test con objetivo declarado sobre keyword con historia | Δ positivo en un objetivo declarado ayer |
| La tabla suma columnas y desborda en 390px | UI | medium | cards en `xs` + scroll-width check en GVC | overflow horizontal en la captura |
| Objetivo sin medición se pinta como posición 0 | UI | low | estado explícito + assertion en GVC | `0` en la columna de posición |

### Feature flags / cutover

Sin flag propio: la lente queda tras el flag del módulo SEO, ya existente, y detrás de la
capability. Un operador sin la capability ve la lente sin CTA, que es el estado correcto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR — reader aditivo | < 10 min | sí |
| Slice 2 | revert PR — la pantalla vuelve a una sola lente | < 10 min | sí |
| Slice 3 | revert PR; los objetivos ya declarados siguen midiéndose (el command no cambió) | < 10 min | sí |
| Slice 4 | revert PR | < 10 min | sí |

### Production verification sequence

1. `pnpm local:check:ui` verde.
2. `pnpm dev` + declarar objetivos reales sobre una org de prueba; verificar el resultado por
   keyword y el deshacer.
3. GVC premium desktop + 390px; revisar el dossier y **mirar los frames**, no sólo los gates.
4. Ejercitar el lane ecosystem contra staging con `externalScopeType`/`externalScopeId`.
5. Verificar en producción que un objetivo declarado aparece en la captura del día siguiente.

### Out-of-band coordination required

**N/A — repo-only change.** El reader es lectura y usa el scope base; la escritura ya tiene el suyo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se puede declarar una keyword que **no** salió del reader de oportunidades
- [ ] El cupo restante es visible **antes** de confirmar la declaración
- [ ] El resultado se muestra **por keyword**; un lote mixto se comunica como mixto
- [ ] El cambio de intención se comunica como cambio, no como `already_tracked`
- [ ] Un objetivo sin medición muestra estado explícito; nunca `0` ni `—` ambiguo
- [ ] El Δ se calcula contra la primera medición posterior a la declaración
- [ ] Las columnas de volumen y dificultad **no se renderizan** mientras no exista el dato
- [ ] Sin `growth.seo.target.configure` el CTA no se renderiza
- [ ] `UI ready` sólo pasa a `yes` con mapping, plan GVC y decision log completos y lint sin findings
- [ ] GVC premium desktop + 390px con las 4 capturas; sin overflow ni hydration mismatch
- [ ] `ui:quality` ≥ 4.5 promedio con piso 4
- [ ] El reader se expone en lane ecosystem y como tool MCP en el mismo PR
- [ ] Todo el copy sale de `src/lib/copy/growth.ts`

## Verification

- `pnpm local:check:ui`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm fe:capture growth-seo-keyword-targets --env=local` + `pnpm fe:capture:review`
- `pnpm design:lint` · `pnpm ui:code-lint` · `pnpm ui:visual-gate` · `pnpm ui:quality`
- `pnpm route-reachability-gate`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Metas por objetivo (posición y fecha) para poder decir "vamos atrasados en 3 de 12".
- Carril cliente: declarar objetivos desde el portal, con su modelo de permisos y de gasto.
- Alimentar el reporte de `TASK-1310` con el avance contra objetivo.
