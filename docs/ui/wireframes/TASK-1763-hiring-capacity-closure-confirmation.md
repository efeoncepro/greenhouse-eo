# TASK-1763 — Wireframe · cierre de vacante por capacidad

## Meta

- Status: `draft`
- Owner task: `TASK-1763`
- Product Design asset: `docs/ui/visual-directions/TASK-1763-hiring-capacity-closure-confirmation.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: `Talent / People autorizados`
- Copy source: `src/lib/copy/dictionaries/*/hiringDesk.ts`
- Primitive decision: `reuse`
- UI ready target: `no`

## Brief

- Primary user: operador de Talent que acaba de seleccionar.
- User moment: la selección completa el objetivo de cupos.
- Job to be done: revisar y confirmar el cierre/notificación de la cohorte exacta.
- Primary decision signal: `N personas serán rechazadas y notificadas`.
- Non-goals: editar capacidad, ranking, exponer PII o auto-confirmar.

## Desktop Target — 1440×1000

```text
Application 360 / Decisión
┌──────────────────────────────────────────────────────────┐
│ Decisión registrada                                      │
│ Esta selección completa 1 de 1 cupos.                    │
│                                                          │
│ Cierre propuesto                                         │
│ 12 personas recibirán el cierre de esta vacante          │
│ Sin decisión 9 · En espera 2 · Backup 1                  │
│                                                          │
│ El correo agradecerá su tiempo. La mención al Banco de   │
│ Talentos dependerá del consentimiento vigente.           │
│                                                          │
│ [Ahora no]       [Cerrar vacante y notificar a 12]       │
└──────────────────────────────────────────────────────────┘
```

## Mobile Target — 390×844

Dialog single-plane/full-screen. Título y resumen de N arriba; categorías en lista compacta; acciones apiladas al
final sin ocultar el verbo ni N. No hay scroll horizontal y el foco vuelve a `Decidir` al cancelar/cerrar.

## Action Hierarchy

- Primary: `Cerrar vacante y notificar a {count} personas`.
- Secondary: `Ahora no`.
- Destructive: el primary usa tono de advertencia, no rojo punitivo; el texto explica el efecto.
- Selection vs action: toggles separados sólo para `backup_selected`/`on_hold` cuando el DTO los expone.
- Pending / disabled: confirm deshabilitado mientras preview/confirm está pending o stale.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
| --- | --- | --- | --- |
| Diálogo actual de decisión | MUI Dialog + AXIS theme | continuidad y foco modal | px/HEX inline |
| Consecuencia dominante | Typography + Alert/state surface | claridad sin alarmismo | KPI card |
| Categorías | GreenhouseChip/list | estado con texto | semáforo por color |
| Acción irreversible | GreenhouseButton | verbo+objeto+N | “Confirmar” genérico |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
| --- | --- | --- | --- | --- |
| 0 | Dialog title | separar decisión y cierre | DialogTitle | copy |
| 1 | Summary | cupos y N | local summary + Typography | preview DTO |
| 2 | Categories | cohort/exclusions | list + Chips | preview DTO |
| 3 | Consent note | promesa honesta | Alert/info | policy summary |
| 4 | Actions | cancel/confirm | DialogActions + GreenhouseButton | command state |
| 5 | Run status | pending/partial/completed | state surface | status DTO |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
| --- | --- | --- | --- | --- |
| `hiringDesk.application.capacityClosure.title` | title | `Esta selección completa los cupos` | opening | separa hechos |
| `hiringDesk.application.capacityClosure.summary` | summary | `{count} personas recibirán el cierre de esta vacante.` | count | count exacto |
| `hiringDesk.application.capacityClosure.consent` | note | `La mención al Banco de Talentos dependerá del consentimiento vigente de cada persona.` | none | no promete opt-in |
| `hiringDesk.application.capacityClosure.confirm` | action | `Cerrar vacante y notificar a {count} personas` | count | verbo+objeto+N |
| `hiringDesk.application.capacityClosure.cancel` | action | `Ahora no` | none | selección queda |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
| --- | --- | --- | --- | --- |
| ready | `Revisa el cierre propuesto` | impacto y categorías | cerrar / ahora no | no success anticipado |
| loading | `Calculando el impacto` | `Releemos la vacante antes de mostrarte a quién afectará.` | disabled | no spinner mudo |
| empty | `No hay otras personas por notificar` | `Puedes cerrar la vacante sin enviar rechazos.` | cerrar vacante | count 0 |
| partial | `El cierre quedó incompleto` | procesados/pendientes/fallidos | reintentar pendientes | persistente |
| error | `No pudimos confirmar el cierre` | selección preservada | volver a revisar | error sanitizado |
| denied | `No tienes permiso para cerrar esta vacante` | decisión individual preservada | cerrar dialog | sin oracle |

## Accessibility Contract

- Heading order: DialogTitle → resumen → categorías → status.
- Chart/table alternatives: no aplica; conteos tienen texto completo.
- Aria labels: confirm incluye N; categorías anuncian label+count.
- Focus notes: título al abrir; Escape/restauración antes de submit; pending bloquea cierre accidental.
- Color-independent state labels: todos los estados y categorías tienen texto/icono.

## Implementation Mapping

- Route / surface: `/agency/hiring/applications/[applicationId]`, `Application360View`.
- Primitives: Dialog, Alert, GreenhouseButton, GreenhouseChip, state surfaces.
- Variants / kinds: existing domain-safe variants; confirmar lookup en ejecución.
- Component candidates: `HiringCapacityClosureConfirmation` domain-local.
- Copy source: `src/lib/copy/dictionaries/*/hiringDesk.ts`.
- Data reader / command: TASK-1762 preview/status/confirm.
- API parity: thin consumer.
- Access / capability: `hiring.opening.capacity.read|confirm` server-resolved.
- Runtime consumers: portal; programmatic consumers usan foundation.
- Print/email/PDF considerations: email copy pertenece a TASK-1762.
- GVC markers: dialog, summary, confirm y run status.

## GVC Scenario Plan

- Scenario file: `src/lib/frontend-capture/scenarios/task-1763-hiring-capacity-closure.ts`.
- Route: Application 360 autorizada.
- Viewports: `1440x1000`, `390x844`.
- Quality profile: `premium`.
- Required steps: decisión → preview → cancel/confirm → status.
- Required captures: ready, empty, backups, stale, denied, partial, mobile.
- Required `data-capture` markers: `hiring-capacity-closure-dialog`, `hiring-capacity-cohort-summary`, `hiring-capacity-confirm`, `hiring-capacity-run-status`.
- Assertions: N/DTO, focus, no PII, no false success.
- Scroll-width checks: `scrollWidth === clientWidth`.
- Accessibility/focus checks: Escape, restore, keyboard traversal y axe.
- Reduced-motion evidence: mismo estado final sin animación.
- Review dossier: `required`.
- Baseline: `required after direction approval`.

## Design Decision Log

- Decision: segundo paso modal después de decisión persistida.
- Alternatives considered: auto-close, checkbox inline, página opening-level.
- Why this pattern: hace el efecto irreversible visible y cancelable sin deshacer selección.
- Reuse / extend / new primitive: `reuse`; component local.
- Open risks: backups/holds y status parcial.
- Follow-up: surface opening-level sólo con evidencia de uso.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse before JSX starts.
