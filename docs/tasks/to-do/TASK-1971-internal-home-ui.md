# TASK-1971 — Homes por rol · F: Home interna (equipo interno y admin)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Wireframe: `docs/ui/wireframes/TASK-1971-internal-home-ui.md`
- Flow: `docs/ui/flows/TASK-1971-internal-home-ui-flow.md`
- Motion: `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño aprobado en canvas 2026-10-02 (artboard Main.dc.html); wireframe y flow escritos; sin implementación`
- Rank: `4`
- Domain: `ui|platform|delivery`
- Blocked by: `TASK-1969, TASK-1970`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la Home del equipo interno y admin aprobada en el canvas (`Main.dc.html`): Performance del equipo con métricas ICO, throughput semanal y filtro por equipo o cliente; Tu foco hoy (cierre de período y aprobaciones); Señales de tus clientes (AEO, SEO, comercial); y a la derecha novedades, capacidad del equipo y Continúa donde lo dejaste. Monta el saludo y el chrome de `TASK-1969` y consume sólo la API de `TASK-1970`.

## Why This Task Exists

La Home interna actual muestra Reliability, Margen, Cierre y Pendientes en tarjetas con sparklines sin datos, un «Tu día» que no aporta y recientes con códigos en vez de nombres. El operador aprobó una Home centrada en el desempeño del equipo, las señales de los clientes y la capacidad.

## Goal

- Home interna con la jerarquía aprobada y el throughput como momento visual dominante.
- Filtro de alcance (equipo o cliente) y período compartible por URL.
- Sin lógica de negocio en la vista: todo sale de los bloques de `TASK-1970`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Composition Shell como base; sin card-on-card; una sola superficie para Performance.
- Charts de alto impacto con ECharts (política de charts de `CLAUDE.md`).
- Estados de métricas según la metric trust policy (`suppressed`/`low_confidence` no se muestran como número).
- Copy en `src/lib/copy/*`; nombres de métricas según `docs/context/06_glosario-metricas.md`.

## Normative Docs

- `docs/tasks/to-do/TASK-1967-role-homes-redesign-program.md`
- Canvas aprobado: https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU (artboard `Main.dc.html`)
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1969` (chrome, saludo, novedades).
- `TASK-1970` (bloques `team-performance`, `focus-today`, `client-signals`, `team-capacity`, `recents-rail`, `announcements`).

### Blocks / Impacts

- `TASK-1967` (hija F).
- `TASK-1133`: cuando esta Home quede por defecto para internos, la Home legacy pierde su último uso interno.

### Files owned

- `src/views/greenhouse/home/role-homes/internal/**` (nuevo)
- componentes de bloque nuevos bajo `src/views/greenhouse/home/v2/` o `src/components/greenhouse/` según el lookup de primitives
- `src/lib/copy/home.ts` (sección interna)
- migración de la clave de variante en `greenhouse_serving.home_rollout_flags` si esta Home la crea
- `scripts/frontend/scenarios/home-internal-role.scenario.ts`
- `docs/ui/wireframes/TASK-1971-internal-home-ui.md`, `docs/ui/flows/TASK-1971-internal-home-ui-flow.md`

## Current Repo State

### Already exists

- Home v2 (`src/views/greenhouse/home/v2/*`) con `HomeShellV2`, `HomeBlockRenderer` y bloques actuales.
- `RecentsRail` y patrón de `fallback` por bloque.

### Gap

- Ningún componente para Performance del equipo, throughput, filtro de alcance, Señales de clientes o Capacidad.
- La Home interna no usa Composition Shell (`HomeShellV2` usa grid MUI directo).

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/home/**`
- Future candidate home: `portal`
- Boundary: consume el snapshot de la Home (`TASK-1970`) y las primitives de `TASK-1969`
- Server/browser split: la página resuelve el snapshot en el servidor; los componentes interactivos (filtro, tabs, gráfico) son client components sin acceso a stores
- Build impact: ECharts ya instalado; lazy-load por ruta
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: admin y equipo interno de Efeonce
- Momento del flujo: inicio del día y revisiones durante la jornada
- Resultado perceptible esperado: saber de un vistazo cómo rinde el equipo, qué exige atención hoy y qué cambió en los clientes
- Friccion que debe reducir: abrir ICO, cierres, aprobaciones y señales por separado
- No-goals UX: reemplazar las vistas de detalle de ICO, cierre o CRM

### Surface & system decision

- Surface: `/home` para `admin|internal`
- Nav placement: `none` — no agrega destinos
- Composition Shell: `aplica` — header = saludo; primary = Performance, Tu foco, Señales; aside = Novedades, Capacidad, Continúa
- Primitive decision: `new` — `TeamPerformancePanel`, `ThroughputChart`, `ScopeFilterPopover`, `ClientSignalsList`, `TeamCapacityCard`; `reuse` — `RecentsRail`, primitives de `TASK-1969`
- Adaptive density / The Seam: `aplica` — KPIs de 4 a 2 columnas; throughput apila bajo 760 px
- Floating/Sidecar/Dialog decision: el filtro es un popover sobre la Floating Surface canónica
- Copy source: `src/lib/copy/home.ts`
- Access impact: `none` — usa la audiencia y capabilities de los bloques

### State inventory

- Default: datos del mes en curso, alcance «Todo el equipo», tab «Todas»
- Loading: skeleton por bloque con la forma final
- Empty: vacío propio por bloque desde copy
- Error: `fallback` del bloque, sin detalle técnico
- Degraded / partial: «Sin datos confiables» con fecha `asOf` cuando la métrica está suprimida
- Permission denied: el bloque no se renderiza si la capability no está
- Long content: nombres de cliente y detalle de señales con elipsis y texto completo en el enlace
- Mobile / compact: una columna; KPIs en 2 columnas
- Keyboard / focus: filtro y tabs operables con teclado; Escape cierra el popover
- Reduced motion: gráfico sin animación de entrada; popover sin transición

### Interaction contract

- Primary interaction: cambiar el alcance de Performance y filtrar señales
- Hover / focus / active: filas con fondo suave; foco visible `#0375db`
- Pending / disabled: el bloque muestra skeleton mientras llega el alcance nuevo
- Escape / click-away: cierran el popover
- Focus restore: al botón de alcance
- Latency feedback: skeleton en Performance al cambiar alcance
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS` y animación nativa de ECharts
- Enter / exit: popover con fade y −4 px (200 ms); entrada del gráfico de ECharts ≤ 600 ms
- Layout morph: none
- Stagger: none
- Timing / easing token: tokens de `MOTION.md`
- Reduced-motion fallback: sin animación del gráfico ni del popover
- Non-goal motion: contadores animados de KPIs

### Implementation mapping

- Route / surface: `/home` (variante Homes por rol, audiencias `admin|internal`)
- Primitive / variant / kind: ver Surface & system decision
- Component candidates: `TeamPerformancePanel`, `ThroughputChart` (ECharts), `ScopeFilterPopover`, `FocusTodayCard`, `ClientSignalsList`, `TeamCapacityCard`, `RecentsRail`
- Copy source: `src/lib/copy/home.ts`
- Data reader / command: snapshot de la Home (`TASK-1970`)
- API parity: la vista sólo lee el snapshot; las acciones navegan a rutas dueñas
- Access / capability: las de cada bloque
- States to implement: los del State inventory

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/home-internal-role.scenario.ts`
- Route: `/home`
- Viewports: 1440 × 900 y 390 × 844
- Quality profile: `premium`
- Required steps: fold → abrir filtro → elegir «Creativo» → tab AEO → aside
- Required captures: `internal-fold`, `scope-popover`, `scope-creative`, `signals-aeo`, `aside`
- Required `data-capture` markers: `home-team-performance`, `home-throughput`, `home-focus-today`, `home-client-signals`, `home-team-capacity`, `home-recents`
- Assertions: el subtítulo refleja el alcance; ninguna métrica suprimida aparece como número; sin scroll horizontal
- Scroll-width checks: sí, ambos viewports
- Reduced-motion / focus evidence: captura reduced motion y recorrido con Tab del filtro
- Review dossier: `pnpm fe:capture:review home-internal-role`
- Baseline decision / surface ID: nueva baseline `home-internal-role`

### Design decision log

- Decision: Home interna centrada en desempeño del equipo, foco del día, señales de clientes y capacidad
- Alternatives considered: mantener el pulse de 4 tarjetas con sparklines; «Tu día» con pendientes
- Why this pattern: el operador pidió ver el performance del equipo, señales AEO/SEO y acciones comerciales; Tu día no le aportaba
- Reuse / extend / new primitive: new (panel de performance, filtro, señales, capacidad), reuse (recientes, saludo)
- Open risks: taxonomía de equipos aún por crear en `TASK-1970`; señales comerciales «sin datos» hasta sincronizar HubSpot

### Visual verification

- GVC scenario: `home-internal-role`
- Viewports: 1440 × 900, 390 × 844
- Required captures: las del GVC scenario plan
- Required `data-capture` markers: los del GVC scenario plan
- Scroll-width check: sí
- Accessibility/focus checks: filtro, tabs, `aria-label` del anillo y del gráfico
- Before/after evidence: Home interna actual vs nueva
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-1971-internal-home-ui.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Layout y variante

- Composition Shell de la Home interna con saludo de `TASK-1969`; clave de variante en `home_rollout_flags` (migración del CHECK si aún no existe).

### Slice 2 — Performance del equipo

- KPIs con estado y meta, throughput con ECharts y franja de contexto; filtro de alcance y período en la URL.

### Slice 3 — Tu foco hoy y Señales

- Anillo de cierre con acciones y fila de aprobaciones; lista de señales con tabs y acciones.

### Slice 4 — Columna derecha

- Novedades (componente de `TASK-1969`), Capacidad del equipo con la banda del código, Continúa donde lo dejaste.

### Slice 5 — Estados, GVC y docs

- Estados por bloque, GVC desktop y móvil, scorecard, manual de uso de la Home interna.

## Out of Scope

- Readers y datos (`TASK-1970`).
- Chrome, saludo y novedades (`TASK-1969`).
- Vistas de detalle de ICO, cierre, aprobaciones o CRM.

## Detailed Spec

- El alcance del filtro se pasa al snapshot como parámetro validado contra lo que la sesión puede ver (equipos permitidos, organizaciones visibles); la vista nunca filtra datos por su cuenta.
- La URL usa `scope` y `period`; valores inválidos vuelven al default sin error.
- El anillo del cierre sigue la forma de la marca: arco navy con esfera azul en la punta y cifra en el centro.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1969` y `TASK-1970` cerradas → Slice 1 → Slices 2, 3 y 4 → Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gráfico pesado en el primer fold | UI | low | Lazy-load de ECharts; skeleton | Web Vitals / GVC |
| Filtro muestra alcances que el usuario no puede ver | identity | low | Lista de alcances desde el snapshot, no del cliente | test del bloque |
| Usuarios internos pierden la Home actual sin aviso | UI | medium | Activación por usuario → rol → global con la flag | feedback |

### Feature flags / cutover

- Clave de variante en `greenhouse_serving.home_rollout_flags` para `admin|internal`; la Home v2 actual queda de fallback. Revert: apagar la fila (≤ 30 s).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | apagar la flag | < 1 min | sí |
| Slices 2–4 | apagar la flag o revert PR | < 15 min | sí |
| Slice 5 | N/A | — | sí |

### Production verification sequence

1. Staging con la flag sólo para el usuario agente: GVC desktop y móvil.
2. Activar para el rol admin en staging y revisar con el operador.
3. Producción: usuario agente → rol admin → internos.

### Out-of-band coordination required

- Aviso interno al equipo cuando la Home cambie para todos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: flow`.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-1971`.
- [ ] Wireframe y flow declarados existen; el motion compartido de `TASK-1969` cubre lo demás.
- [ ] Performance del equipo muestra OTD, FTR, RpA y cycle time con meta y estado, y el throughput semanal con cycle time.
- [ ] El filtro de alcance y el período cambian los datos y quedan en la URL.
- [ ] Tu foco hoy, Señales, Novedades, Capacidad (banda del código) y Continúa (nombres reales) renderizan desde el snapshot.
- [ ] Ninguna métrica suprimida aparece como número.
- [ ] El copy visible reusable vive en `src/lib/copy/*`.
- [ ] Los estados loading/empty/error/degraded/permission/mobile quedan cubiertos.
- [ ] GVC desktop + mobile fue capturado y mirado.
- [ ] Se midio que no existe scroll horizontal de pagina en desktop ni mobile 390px.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm local:check:ui`
- `pnpm fe:capture home-internal-role --env=staging`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1967` marca la hija F como cerrada

## Follow-ups

- Señales comerciales reales cuando se sincronice la actividad de HubSpot.
