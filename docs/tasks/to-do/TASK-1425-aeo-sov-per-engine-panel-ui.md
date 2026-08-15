# TASK-1425 — AEO: panel "Cómo te ve cada motor" (SoV per-motor)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 — el estado "preparando…" sale del alcance: se va a `ISSUE-155`

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`.

**Se EXTRAE de esta task el fix del estado engañoso** ("El informe se está preparando… vuelve en unos
minutos" en un run **terminado sin score**). Pasa a `ISSUE-155` y **shippea independiente**.

Razón: un cliente real —Grupo Berel— vio esa promesa falsa durante **15 días**. Eso no es una
desviación de mockup pendiente de dato: es un **incidente de runtime en producción**, y el vehículo
correcto es un `ISSUE`, no el Slice 1 de una task `P2` que además está **bloqueada por `TASK-1424`**.
Dejarlo acá lo encadena a una dependencia que no necesita: el fix de honestidad no depende de que
exista el desglose per-motor. Un incidente visible para el cliente no espera a un panel.

Qué cambia en el cuerpo de esta task:

- El título, el Summary, el Why y el Goal pierden la mitad "estado sin score".
- **Slice 1 (estado honesto) se elimina**; los slices se renumeran (panel → fixture/GVC/cierre).
- Salen de `Files owned` la page del detalle operador y el command del reader — esta task ya no los
  toca; son de `ISSUE-155`.
- Salen el criterio de aceptación, la captura GVC, la fila de riesgo, la fila de rollback y la Open
  Question del estado sin score.
- Consecuencia dura: con el Slice 1 fuera, **la task entera queda bloqueada por `TASK-1424`**. Ya no
  hay nada que adelantar sin el dato.

**Y sube en valor.** La auditoría midió que el solape de dominios citados entre ChatGPT y Perplexity
es de **~11%**: cada motor arma su respuesta con un conjunto de fuentes casi disjunto. Un SoV agregado
cross-motor es, por lo tanto, **un número que no describe ningún canal** — promedia mundos que no se
tocan. El desglose per-motor deja de ser fidelidad al mockup y pasa a ser la única lectura honesta de
la señal.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1425-aeo-sov-per-engine-panel.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Definida`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1424`
- Branch: `task/TASK-1425-aeo-sov-per-engine-panel-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Renderizar en el workbench AEO compartido (vista cliente `/aeo` + vista operador
`/growth/aeo/[organizationId]`) el panel **"Cómo te ve cada motor"** del mockup aprobado de Claude
Design (Región 7 de "AEO Operator View"): share of voice marca vs competidores POR motor,
consumiendo el campo aditivo del `ReportArtifactModel` que entrega TASK-1424.

El fix del estado engañoso de un run terminado sin score **ya no vive acá**: se extrajo a `ISSUE-155`
y shippea independiente (ver Delta 2026-08-15).

## Why This Task Exists

TASK-1276 degradó honesto la Región 7 del mockup aprobado porque el modelo no traía el desglose
per-motor (solo SoV agregado + presencia por motor). TASK-1424 cierra el dato; esta task cierra el
render.

Y el desglose no es cosmético: con **~11% de solape** entre los dominios que cita ChatGPT y los que
cita Perplexity (medición de la auditoría 2026-08-15), el SoV agregado cross-motor promedia canales
que casi no comparten fuentes — es un número que no describe ninguno de los dos. El panel per-motor
es la lectura honesta de esa señal, no un adorno del mockup.

## Goal

- Panel per-motor en el detail canvas del workbench compartido, fiel al mockup aprobado (grid de
  motores, marca primary + competidores neutral, % con `tabular-nums`, tabla sr-only), visible en
  cliente Y operador sin fork.
- Runs sin desglose (anteriores a TASK-1424) NO rompen ni muestran hueco: el panel simplemente no
  se renderiza.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (regla de oro: render del `ReportArtifactModel`
  compartido; disclosure, no fork)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` (tokens, sin HEX inline
  salvo identidad de terceros ya normada en el view)
- `docs/tasks/complete/TASK-1276-aeo-operator-view-growth-account360.md` (workbench operador +
  extensiones aditivas del view cliente)

Reglas obligatorias:

- CERO cálculo de SoV en la vista: el desglose llega derivado del modelo (TASK-1424).
- Valor por longitud + label numérico; color solo identidad (marca vs competidores) — nunca
  color-only.
- Copy tokenizado en `src/lib/copy/growth.ts`; GVC desktop + mobile mirado antes de cerrar.

## Normative Docs

- `docs/ui/wireframes/TASK-1425-aeo-sov-per-engine-panel.md` (contrato de diseño, fuente = mockup
  aprobado de Claude Design "AEO Operator View" Región 7)
- `src/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView.tsx` (DetailCanvas
  + PanelShell + EngineIsotype/ENGINE_DISPLAY_NAME)

## Dependencies & Impact

### Depends on

- **TASK-1424** (campo per-motor en contratos/builder/model) — bloqueante dura del panel y, desde el
  Delta 2026-08-15, **de la task completa**: al salir el fix de estado sin score a `ISSUE-155`, no
  queda ningún slice adelantable sin el dato.

### Blocks / Impacts

- Cierra la última desviación honesta del mockup aprobado de TASK-1276.
- Extiende `SAMPLE_CLIENT_REPORT` (mockup harness `/aeo/mockup`) → la captura del scenario cliente
  cambia (rebaseline GVC esperado).

### Files owned

- `src/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView.tsx` (panel nuevo
  en DetailCanvas — aditivo)
- `src/lib/copy/growth.ts` (ids del copy ledger)
- `src/views/greenhouse/growth/ai-visibility/report-artifact/mockup/mock-data.ts` `[verificar]`
  path exacto del fixture `SAMPLE_CLIENT_REPORT`

**Ya NO owned** (salieron con el Delta 2026-08-15 → `ISSUE-155`):
`src/app/(dashboard)/growth/aeo/[organizationId]/page.tsx` y
`src/lib/growth/ai-visibility/operator/command.ts`.

## Current Repo State

### Already exists

- Workbench compartido con PanelShell/TrendPanel/PlatformPanel + `EngineIsotype` +
  `ENGINE_DISPLAY_NAME` + colores de identidad de motores normados.
- Estados del detalle operador (denied/empty/preparing/error) en la page de TASK-1276.
- Scenarios GVC `growth-aeo-operator`, `growth-aeo-operator-compact`,
  `growth-ai-visibility-client-report`.

### Gap

- Región 7 del mockup aprobado sin render (sin dato hasta TASK-1424).
- (El gap del estado `report_unavailable` que no distingue run en vuelo de run terminado sin score
  —caso Berel en producción— es de `ISSUE-155`, no de esta task.)

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Growth/AM + cliente contratado (mismo workbench)
- Momento del flujo: leer el Resumen del informe y entender la brecha competitiva por canal
- Resultado perceptible esperado: barras marca vs competidores por motor
- Friccion que debe reducir: el agregado único esconde la historia por motor — y con ~11% de solape
  de dominios citados entre motores, ese agregado no describe ningún canal real
- No-goals UX: no re-scorea; no agrega charts nuevos fuera del panel; no toca PDF/email; no toca los
  estados del detalle operador (`ISSUE-155`)

### Surface & system decision

- Surface: DetailCanvas del workbench compartido (cliente + operador) — sección Resumen/charts
- Composition Shell: `hereda` — el panel vive dentro del masterDetail existente
- Primitive decision: `reuse` — PanelShell + Box bars + EngineIsotype; cero primitive nueva
- Adaptive density / The Seam: grid `auto-fit minmax(280px,1fr)` colapsa a 1 columna en compact
- Floating/Sidecar/Dialog decision: n/a (contenido inline)
- Copy source: `src/lib/copy/growth.ts`
- Access impact: ninguno (superficies ya gateadas)

### State inventory

- Default: panel con ≥1 motor con datos
- Loading: el del workbench (sin skeleton propio)
- Empty: campo ausente (runs pre-1425) → panel no se renderiza, sin hueco
- Error: n/a propio (hereda estados del reporte)
- Degraded / partial: motor sin menciones → "Sin datos de este motor" (texto, sin barra)
- Permission denied: heredado de la page
- Long content: nombres con ellipsis + title; grid responsivo
- Mobile / compact: 1 columna; sin scroll horizontal en 390
- Keyboard / focus: contenido informativo; tabla sr-only para lectores
- Reduced motion: sin motion nuevo

### Interaction contract

- Primary interaction: lectura (panel estático); sin CTA propio
- Hover / focus / active: title en nombres truncados
- Pending / disabled: n/a
- Escape / click-away: n/a
- Focus restore: n/a
- Latency feedback: n/a
- Toast / alert behavior: n/a

### Motion & microinteractions

- Motion primitive: `none` (barras estáticas; sin motion nuevo)
- Enter / exit: el del workbench
- Layout morph: n/a
- Stagger: n/a
- Timing / easing token: n/a
- Reduced-motion fallback: trivial (nada anima)
- Non-goal motion: no animar el llenado de barras

### Implementation mapping

- Route / surface: `/aeo` + `/growth/aeo/[organizationId]` (workbench compartido)
- Primitive / variant / kind: PanelShell interno + Box bars (patrón SignalVisualCue/mockup)
- Component candidates: `EngineSovPanel` interno del view (no exportado)
- Copy source: `src/lib/copy/growth.ts` (`detail.engineSov*`)
- Data reader / command: `ReportArtifactModel.competitiveSovByEngine` (TASK-1424)
- API parity: n/a (render puro de modelo existente)
- Access / capability: heredado
- States to implement: los del inventory

### GVC scenario plan

- Scenario file: reusar `growth-aeo-operator` + `growth-aeo-operator-compact` +
  `growth-ai-visibility-client-report` (fixture extendida)
- Route: `/growth/aeo/[organizationId]` + `/aeo/mockup`
- Viewports: desktop 1440 + mobile 390
- Required steps: abrir detalle → panel visible en Resumen
- Required captures: workbench con panel per-motor (desktop+390)
- Required `data-capture` markers: `aeo-engine-sov` (nuevo) + `composition-shell` existente
- Assertions: noLoginRedirect, noErrorBoundary
- Scroll-width checks: sin scroll horizontal desktop ni 390
- Reduced-motion / focus evidence: sin motion nuevo; tabla sr-only presente en el DOM

### Design decision log

- Decision: panel en el workbench COMPARTIDO (cliente + operador), datos público-safe
- Alternatives considered: panel solo-operador (rechazado — el cliente también lo necesita);
  ECharts (rechazado — coherencia con paneles hermanos Box/Recharts)
- Why this pattern: regla de oro EPIC-020 (un modelo, renders por disclosure)
- Reuse / extend / new primitive: `reuse` total
- Open risks: shape final del campo (TASK-1424)

### Visual verification

- GVC scenario: los 3 existentes (reusados)
- Viewports: desktop + mobile
- Required captures: panel per-motor
- Required `data-capture` markers: `aeo-engine-sov`
- Scroll-width check: desktop + 390
- Accessibility/focus checks: tabla sr-only + labels no color-only
- Before/after evidence: captura previa del workbench (TASK-1276) vs con panel
- Known visual debt: rebaseline esperado del scenario cliente (fixture extendida)

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/growth/ai-visibility/**` + copy en `src/lib/copy/growth.ts`
- Future candidate home: `remain-shared`
- Boundary: el panel es render puro del `ReportArtifactModel` (campo de TASK-1424); cero lógica de negocio ni fetch en el view.
- Server/browser split: panel dentro del view `use client` existente; el modelo llega resuelto server-side.
- Build impact: nulo — sin dependencias nuevas.
- Extraction blocker: ninguno.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Panel per-motor en el workbench (bloqueado por TASK-1424)

- `EngineSovPanel` interno en DetailCanvas: grid por motor, marca primary + competidores neutral,
  % `tabular-nums`, tabla sr-only, "Sin datos de este motor" honesto; oculto si el campo no existe.
- Copy ids `detail.engineSov*`; marker `data-capture="aeo-engine-sov"`.

### Slice 2 — Fixture + GVC + cierre

- Extender `SAMPLE_CLIENT_REPORT` con el desglose (captura determinista) + rebaseline documentado.
- GVC desktop + 390 mirado (panel); gates + docs + impacto cruzado (TASK-1276 Delta: desviación
  cerrada).

## Out of Scope

- La derivación del dato (TASK-1424).
- **El estado honesto de un run terminado sin score** — extraído a `ISSUE-155` (Delta 2026-08-15).
  Esta task no toca la page del detalle operador ni los códigos de error del reader.
- Consumir el desglose en PDF (TASK-1273) / email (TASK-1250) — follow-ups propios.
- Cualquier investigación del motor sobre POR QUÉ un run queda sin findings (si el re-run de Berel
  con el motor actual también falla, se levanta ISSUE aparte).

## Detailed Spec

Ver el wireframe declarado (fuente: mockup aprobado Región 7 — layout, jerarquía, leyenda, sr-only
table y estados vienen de ahí). La distinción run-en-vuelo vs terminado-sin-score **ya no se resuelve
acá**: es de `ISSUE-155`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 NUNCA antes de que TASK-1424 esté en `develop` (es la dependencia dura del dato). Slice 2
  al final. Desde el Delta 2026-08-15 no queda ningún slice adelantable sin TASK-1424.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rebaseline GVC del scenario cliente | ui/gvc | high (esperado) | declarar rebaseline en el cierre; comparar before/after mirado | diff de capturas |
| Panel rompe layout en 390 | ui | low | grid auto-fit + scroll-width check en GVC | scroll horizontal |
| El panel se lee como "el agregado, desglosado" y alguien vuelve a promediar cross-motor | producto | medium | leyenda + sr-only declaran motor por motor; cero agregación en la vista (~11% de solape mide canales distintos) | un KPI cross-motor nuevo en review |

### Feature flags / cutover

- Sin flag: el panel es render condicionado a la existencia del campo (cutover natural vía
  TASK-1424).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (panel aditivo) | <5 min | sí |
| 2 | n/a (fixture/GVC/docs) | — | sí |

### Production verification sequence

1. GVC local desktop+390 mirado (panel).
2. Staging: detalle de una org con run scoreado (panel visible).
3. Prod vía release batch normal.

### Out-of-band coordination required

- N/A — repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El panel per-motor renderiza fiel al mockup aprobado (grid por motor, marca vs competidores,
      % numérico, leyenda) en cliente Y operador desde el MISMO view.
- [ ] Sin el campo (runs pre-1425) el panel no aparece y no deja hueco ni error.
- [ ] Motor sin menciones muestra "Sin datos de este motor" — cero porcentajes fabricados.
- [ ] Tabla sr-only presente y completa; valor nunca color-only.
- [ ] El panel NO deriva ni muestra un SoV agregado cross-motor propio: cada motor se lee solo.
- [ ] Copy 100% tokenizado en `growth.ts`; GVC desktop+390 mirado sin scroll horizontal.
- [ ] `UI ready: yes` solo con `pnpm task:lint --task TASK-1425` sin findings.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1425` + `pnpm ui:wireframe-check --task TASK-1425`
- `pnpm fe:capture growth-aeo-operator` + `growth-aeo-operator-compact` +
  `growth-ai-visibility-client-report` (mirados)

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Delta en TASK-1276 (desviación del mockup cerrada) + wireframe TASK-1276 (Región 7 servida)
- [ ] Rebaseline GVC declarado si aplica

## Follow-ups

- PDF (TASK-1273) y email (TASK-1250) consumiendo el desglose.
- `ISSUE-155` — estado honesto de un run terminado sin score (extraído de esta task, ship
  independiente y sin dependencia de TASK-1424).
- ISSUE del motor si el re-run de Berel con extracción ON vuelve a quedar sin findings/score.

## Open Questions

- Ninguna abierta en esta task. La única que había (cómo distinguir run-en-vuelo de
  terminado-sin-score) se fue con el fix a `ISSUE-155`.
