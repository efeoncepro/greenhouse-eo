# TASK-1523 / Globe — Creative Suite Experience Logic

## Meta

- Status: `draft`
- Owner task: `TASK-1523`
- Product Design asset: `docs/ui/visual-directions/TASK-1523-globe-creative-suite-experience-logic-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: `TASK-1505`, `TASK-1474`, `TASK-1485` y futuras surfaces Globe.
- Copy source: namespace centralizado Globe Creative Suite.
- Primitive decision: `extend`; `Creative Loop` candidate vía `TASK-1485`.
- UI ready target: `yes` tras aprobación, mapping y evidencia.

## Brief

- Primary user: creativo/operador Efeonce o cliente/co-operador autorizado.
- User moment: convertir intención en candidato, decisión y entrega con memoria.
- Job to be done: crear/refinar media con contexto, costo, rights y siguiente paso claros.
- Primary decision signal: la próxima decisión del Creative Loop.
- Non-goals: chat dominante, node graph, provider UI o dashboard de cards.

## Desktop Target — 1440×1000

1. Contexto compacto: workspace/proyecto, responsabilidad y credits/readiness resumidos.
2. Intención + Dirección: prompt/brief y “Así entendimos tu intención”.
3. Stage dominante: referencia, run o candidato con estado real.
4. Estimate + acción primaria juntos, con razón visible si están gated.
5. Candidate band/contact sheet; selección abre inspector sin destruir contexto.
6. Inspector contextual: recipe, lineage, refine, review y delivery según capability.

## Mobile Target — 390×844

Contexto → intención → estimate/CTA → stage → filmstrip. Advanced settings, lineage y metadata usan sheet/dialog
semántico con foco y retorno. Filmstrip es scroll-container interno, nunca scroll horizontal de página.

## Action Hierarchy

- Primary: `Generar candidatos` o siguiente acción contextual (`Refinar`, `Enviar a revisión`, `Entregar`).
- Secondary: ajustar dirección, referencias, modelo, formato o elegir candidato.
- Destructive: cancelar run, descartar dirty work o revocar share con confirmación.
- Selection vs action: seleccionar nunca ejecuta refinement/review.
- Pending / disabled: estimate stale, capability, rights, budget o readiness explican causa/recovery.

## Visual Fidelity Mapping

| Source cue | Globe token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Producer stage/library | patterns actuales Globe | continuidad | copiar layout al Workbench |
| Workbench canvas/dock | TASK-1474 patterns | dirección profesional | node graph técnico |
| Orbital Threshold | tokens Globe | identidad | heredar AXIS/MUI |
| Contact sheet editorial | candidate pattern | comparación | card grid uniforme |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Suite context | workspace/proyecto/responsabilidad | Globe context pattern | tenancy/responsibility |
| 1 | Intent | prompt/brief/recipe/reference | composer/prompt studio | brief/recipe contracts |
| 2 | Direction | restatement/constraints/proposal | direction candidate | `TASK-1499` |
| 3 | Creative stage | reference/run/candidate | stage/viewer | run/output readers |
| 4 | Estimate/action | cost/cap/readiness/command | command dock | estimate/run |
| 5 | Candidates | compare/select | filmstrip/contact sheet | assets/lineage |
| 6 | Inspector | refine/lineage/review/delivery | inspector | owned contracts |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `globe.suite.intent.title` | Intent | `¿Qué quieres crear?` | none | quick entry |
| `globe.suite.direction.title` | Direction | `Así entendimos tu intención` | none | no final truth |
| `globe.suite.estimate.label` | Estimate | `Costo estimado` | credits | server estimate |
| `globe.suite.generate.cta` | Action | `Generar candidatos · ✨{credits}` | credits | current only |
| `globe.suite.candidates.title` | Candidates | `Candidatos` | count | not “results” |
| `globe.suite.gate.title` | Gate | `Esta capacidad aún no está disponible` | capability | explain why |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Listo para generar` | `Revisa dirección, formato y costo.` | `Generar candidatos` | estimate current |
| loading | `Preparando tu espacio creativo` | `Recuperamos contexto y capacidades.` | none | local skeleton |
| empty | `Empieza con una intención` | `Describe una pieza, abre un brief o añade una referencia.` | `Crear desde cero` | useful |
| partial | `Parte del contexto no está disponible` | `Puedes continuar, pero revisa las señales marcadas.` | `Reintentar` | honest |
| error | `No pudimos completar esta acción` | `Tu trabajo sigue guardado.` | `Reintentar` | typed |
| denied | `No tienes acceso a este espacio` | `Vuelve a un workspace habilitado.` | `Cambiar workspace` | safe |
| gated | `Esta capacidad aún no está disponible` | `Falta habilitar {reason}.` | `Ver requisito` | focusable |

## Accessibility Contract

- Heading order: suite H1 → intent H2 → stage/candidates/inspector H2.
- Chart/table alternatives: lineage visual incluye lista textual.
- Aria labels: media, candidate identity, selection, estimate freshness y gated reason.
- Focus notes: DOM order coincide con visual; dialogs/sheets restauran trigger.
- Color-independent state labels: icon + text + outline/label.

## Implementation Mapping

- Route / surface: `/producer`; Workbench route en `TASK-1474`.
- Primitives: Globe shell, composer, stage/viewer, candidate, inspector, dialog/floating.
- Variants / kinds: `TASK-1485`.
- Component candidates: validar contra registry runtime.
- Copy source: Globe Creative Suite namespace.
- Data reader / command: brief, catalog/estimate, run, assets/lineage, review/delivery, credits.
- API parity: required for every business action.
- Access / capability: workspace-scoped granular capabilities.
- Runtime consumers: Producer, Workbench y surfaces autorizadas.
- Print/email/PDF considerations: none.
- GVC markers: `globe-creative-loop`, `creative-intent`, `creative-direction`, `creative-stage`,
  `creative-estimate`, `creative-candidates`, `creative-inspector`, `creative-review`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/globe-creative-producer.scenario.ts`.
- Route: `/producer`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`
- Required steps: intent, direction, estimate, gate/generate, candidate, inspect/refine, review.
- Required captures: default, gated, running, selected, inspector, review y mobile.
- Required `data-capture` markers: implementation mapping list.
- Assertions: no secrets/economics, current estimate, state honesty, DOM/focus order.
- Scroll-width checks: document, stage, filmstrip, inspector y overlays.
- Accessibility/focus checks: keyboard-only, focus-visible, live regions y restore.
- Reduced-motion evidence: direct transition retains meaning.
- Review dossier: `required`
- Baseline: `globe.creative-suite-experience-logic` after approval.

## Design Decision Log

- Decision: Editorial Creative Desk con Creative Loop compartido.
- Alternatives considered: AI Chat Canvas, Technical Node Graph y card dashboard.
- Why this pattern: mantiene lenguaje creativo y juicio humano con system truth visible.
- Reuse / extend / new primitive: extend; promotion in `TASK-1485`.
- Open risks: Workbench sin runtime y capabilities gated.
- Follow-up: consumer deltas y Login separado.

## Acceptance Checklist

- [ ] Visible strings are in the ledger.
- [ ] Dynamic values are bounded.
- [ ] Partial/degraded states are explicit.
- [ ] Estimated data is honest.
- [ ] Lineage has text alternative.
- [ ] State and aria copy are implementation-ready.
- [ ] Mapping names patterns, copy, data and surface.
- [ ] GVC plan is executable.
- [ ] Decision log explains extend.
