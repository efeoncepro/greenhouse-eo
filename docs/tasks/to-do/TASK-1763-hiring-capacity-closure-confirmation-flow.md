# TASK-1763 — Hiring Capacity Closure Preview and Confirmation Flow

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1763-hiring-capacity-closure-confirmation.md`
- Flow: `docs/ui/flows/TASK-1763-hiring-capacity-closure-confirmation-flow.md`
- Motion: `docs/ui/motion/TASK-1763-hiring-capacity-closure-confirmation-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseño; el contrato backend ya existe y quedó code complete el 2026-08-23`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-23 — TASK-1762 cerró: esto es lo que recibes, y lo que NO debes reimplementar

El contrato ya existe y esta task **lo consume, no lo recalcula**:

- **Reader** `previewOpeningCapacityClosure(openingId)` → `OpeningClosurePreview` con cupos, las tres
  categorías de la cohorte, el conteo de excluidas y el `effectDigest`.
- **Command** `confirmOpeningCapacityClosure({ openingId, effectDigest, idempotencyKey, ... })`.
- **Status** `readClosureRunStatus` / `readLatestClosureRunForOpening` → conteos por estado.
- **Ruta** `GET`/`POST /api/hiring/openings/[id]/capacity-closure`.
- **Capabilities** `hiring.opening.capacity.read` (ver) y `...confirm` (ejecutar), separadas: la UI
  debe mostrar el resumen a quien sólo lee, y ocultar el botón a quien no puede confirmar.

**Tres cosas que la UI NO decide, porque ya están decididas:**

1. **Quién entra.** `paused` y `backup` NO entran por defecto. La UI las muestra como categorías
   separadas y **con su razón visible** —una está en pausa deliberada, la otra tiene un compromiso
   abierto—, nunca como un checkbox suelto que invite a marcar todo.
2. **El digest.** Se pasa tal como vino del preview. Si el confirm devuelve
   `hiring_opening_closure_preview_stale`, la respuesta correcta es **recargar el resumen y que la
   persona vuelva a mirarlo**, jamás reintentar con el digest nuevo automáticamente: eso convertiría
   la protección en un trámite.
3. **El número de cupos.** Sale de la vacante (`requested_seats`, el campo «Cupos» del Demand Desk).
   **NUNCA** mostrar un conteo propio ni derivar uno: la task previa existe justamente para que haya
   un solo dueño de ese número.

**Y lo que la UI sí tiene que resolver bien:** que el operador entienda *a cuántas personas reales*
va a afectar antes de confirmar. El conteo es el momento visual dominante de esa pantalla, no un
dato secundario — 36 personas y 3 personas exigen la misma confirmación y merecen distinta pausa.

## Summary

Añade a Application 360 un segundo paso explícito cuando una selección completa los cupos: muestra la cohorte y
las consecuencias, permite revisar backups/holds y confirma “Cerrar vacante y notificar a N personas” sin calcular
reglas en browser. La decisión individual conserva su confirmación y gana copy más humano.

## Why This Task Exists

El efecto masivo no puede quedar implícito en el botón `Decidir` ni enterrado en un toast. Sin preview visible, el
operador no puede distinguir selección, cierre de publicación y el desenlace de la cohorte ni detectar un estado stale.

## Goal

- Mostrar impacto exacto antes de una comunicación irreversible.
- Separar claramente registrar selección de cerrar/notificar la vacante.
- Conservar foco, recovery, mobile 390 px y estados honestos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**Hereda la enmienda de `TASK-1762`, y tiene copy visible que viola el ADR §12.**

- **`docs/ui/wireframes/TASK-1763-*.md`** declara como señal primaria del diálogo
  *«N personas serán rechazadas y notificadas»*. Eso es copy que se muestra, y el ADR §12 lo prohíbe:
  **NUNCA usar `rejected` para un cierre en el que no hubo juicio sobre la persona.** Debe decir
  «N personas quedarán **sin selección** y serán notificadas».
- Su empty state («puedes cerrar la vacante sin enviar rechazos») y el vocabulario de los docs de motion y
  dirección visual («no dramatiza el rechazo») se corrigen igual.
- **El diálogo debe mostrar el desenlace y la causa** que se van a escribir. Hoy sólo muestra cupos, N y
  categorías.
- Coordinación: es el cuarto escritor de `hiringDesk.ts`. Se particiona **por clave, no por archivo** —
  ver el Delta de `TASK-1747`.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md` (enmendada por el ADR de vocabulario §9)
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (§7.1 vocabulario visible · §9 enmienda · §12 reglas duras)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Normative Docs

- `docs/ui/visual-directions/TASK-1763-hiring-capacity-closure-confirmation.md`
- `docs/ui/wireframes/TASK-1763-hiring-capacity-closure-confirmation.md`
- `docs/ui/flows/TASK-1763-hiring-capacity-closure-confirmation-flow.md`
- `docs/context/05_voz-tono-estilo.md`

## Dependencies & Impact

### Depends on

- `TASK-1762` preview/status DTO, confirm command, capabilities y errores canónicos.

### Blocks / Impacts

- Completa el follow-up de capacity/opening closure de `TASK-1721` y el exit criterion de EPIC-011.

### Files owned

- `src/views/greenhouse/hiring/Application360View.tsx` y componentes locales de confirmación
- `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx`
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` — **sólo el bloque `hiringDesk.application.capacityClosure.*`**
- `docs/ui/motion/TASK-1763-hiring-capacity-closure-confirmation-motion.md`
- GVC scenario/dossier de `TASK-1763`

**Coordinación de `hiringDesk.ts` — cuatro escritores concurrentes.** El diccionario lo escriben a la vez
`TASK-1747` (claves de la card de assessment), `TASK-1754` (claves de `stages`), `TASK-1763` (claves de capacity
closure) y `TASK-1766` (claves nuevas de desenlace y causa). **Se particiona por CLAVE, no por archivo:** esta task
es dueña únicamente de sus claves de capacity closure, **consume** las etiquetas de desenlace y causa que define
`TASK-1766` en vez de duplicarlas, y no renombra ni borra claves ajenas. `TASK-1747` está `in-progress` con sesión
activa: cierra primero y esta task rebasa sobre ella.

## Current Repo State

### Already exists

- Application 360 posee tab Decisión, form y dialog de confirmación individual.
- `HiringDeskFrame`, `DetailHero`, `GreenhouseButton`, Alert/Dialog y motion/reduced-motion canónicos.

### Gap

- No se muestra capacidad, cohorte, estado de consentimiento agregado ni cierre por cupos.
- El CTA genérico de confirmación no expresa el efecto externo sobre otras personas.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/Application360View.tsx`
- Future candidate home: `portal`
- Boundary: `TASK-1762 preview/status DTO + confirm command; la UI no calcula elegibilidad`
- Server/browser split: auth/readers server-side; browser sólo estado visual, selección explícita de categorías y callbacks
- Build impact: `none`
- Extraction blocker: `Application 360 shell, sesión/capabilities y routes Hiring compartidas`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `Talent/People autorizado que registra una decisión final`
- Momento del flujo: `después de seleccionar cuando el reader indica que los cupos quedaron completos`
- Resultado perceptible esperado: `entiende a quién afectará, confirma una sola vez y puede seguir el run`
- Fricción que debe reducir: `efecto masivo implícito y copy genérico`
- No-goals UX: `ranking, auto-confirmación, edición de cupos dentro del dialog, card soup`

### Surface & system decision

- Surface: `Application 360 / tab Decisión`, extensión del dialog existente con segundo paso de consecuencia.
- Nav placement: `none` — no agrega destino.
- Composition Shell: `aplica mediante HiringDeskFrame existente`; no anidar shell.
- Primitive decision: `reuse` Dialog, Alert, GreenhouseButton, status/state primitives; componente local para cohort summary.
- Adaptive density / The Seam: `no aplica`; flujo modal acotado dentro de la surface.
- Floating/Sidecar/Dialog decision: `Dialog modal` porque exige confirmación y bloquea interacción accidental durante submit.
- Copy source: `src/lib/copy/*`.
- Access impact: `capability de TASK-1762 resuelta server-side`.

### State inventory

- Default: decisión registrada; si capacity no está llena, termina sin segundo paso.
- Loading: preview con progreso y CTA deshabilitado.
- Empty: cero personas elegibles; explica que sólo se cerrará la vacante, sin prometer notificaciones.
- Error: mantiene la selección registrada y permite reintentar sólo el preview/confirm.
- Degraded / partial: run parcial muestra procesados/pendientes/fallidos y recovery seguro.
- Permission denied: no muestra CTA de cierre; conserva decisión individual.
- Long content: categorías colapsables y conteos; no lista PII innecesaria.
- Mobile / compact: dialog full-screen/single-plane, CTA sticky accesible y sin truncar N.
- Keyboard / focus: foco inicial en título/resumen; Escape sólo antes de submit; restore a `Decidir`.
- Reduced motion: reutiliza fallback del dialog; no nace motion nueva.

### Interaction contract

- Primary interaction: `Cerrar vacante y notificar a N personas`.
- Hover / focus / active: tokens canónicos y foco visible.
- Pending / disabled: CTA bloqueada durante preview/confirm; no optimistic success.
- Escape / click-away: permitido antes de submit; bloqueado mientras confirm está pending.
- Focus restore: botón que abrió el segundo paso.
- Latency feedback: estado de confirmación y luego status del run, no toast de “completado” prematuro.
- Toast / alert behavior: decisión individual y cierre son mensajes separados; partial failure queda persistente.

### Motion & microinteractions

- Motion primitive: `none` — sólo transición ya existente del Dialog.
- Enter / exit: comportamiento canónico actual.
- Layout morph: `none`.
- Stagger: `none`.
- Timing / easing token: heredado.
- Reduced-motion fallback: existente.
- Non-goal motion: celebración, countdown o feedback que oculte consecuencias.

### Implementation mapping

- Route / surface: `/agency/hiring/applications/[applicationId]`, tab Decisión.
- Primitive / variant / kind: Dialog + Alert + GreenhouseButton `primaryAction`/tono destructivo contextual.
- Component candidates: `Application360View` + `HiringCapacityClosureConfirmation` local.
- Copy source: `src/lib/copy/dictionaries/*/hiringDesk.ts`.
- Data reader / command: TASK-1762 preview/status + confirm.
- API parity: UI thin consumer; no lógica de cohorte/capacidad/consentimiento.
- Access / capability: `hiring.opening.capacity.read|confirm`.
- States to implement: inventory completo, stale refresh y partial run.

### GVC scenario plan

- Scenario file: `src/lib/frontend-capture/scenarios/task-1763-hiring-capacity-closure.ts`.
- Route: Application 360 fixture/canary autorizada.
- Viewports: `1440x1000`, `390x844`.
- Quality profile: `premium`.
- Required steps: seleccionar → decisión persistida → preview → confirmar/cancelar → status.
- Required captures: direct reject, capacity preview, backups/holds, empty cohort, stale, denied, partial failure, mobile.
- Required `data-capture` markers: `hiring-capacity-closure-dialog`, `hiring-capacity-cohort-summary`, `hiring-capacity-confirm`, `hiring-capacity-run-status`.
- Assertions: N coincide con DTO, no PII innecesaria, no false success, focus restore.
- Scroll-width checks: `scrollWidth === clientWidth` desktop y 390 px.
- Reduced-motion / focus evidence: Escape/restore y prefers-reduced-motion.
- Review dossier: `docs/ui/reviews/TASK-1763-hiring-capacity-closure/`.
- Baseline decision / surface ID: repo-native; baseline tras `ACCEPT FIRST FOLD`.

### Design decision log

- Decision: segundo dialog de consecuencia posterior a la selección persistida.
- Alternatives considered: auto-close con toast; checkbox inline; nueva página opening-level.
- Why this pattern: separa hechos, conserva contexto y hace visible el efecto irreversible.
- Reuse / extend / new primitive: `reuse`; componente domain-local, sin primitive nueva.
- Open risks: densidad de categorías y recuperación de run parcial.

## Backend/Data Contract

N/A — consumer UI de `TASK-1762`; no agrega route, reader, command, schema ni reglas de dominio.

<!-- ZONE 2 — PLAN MODE: no completar al registrar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Direction/readiness y first fold

- Implementar composición con fixtures/DTO real, copy ledger y estados principales.
- Capturar desktop/mobile y obtener `ACCEPT FIRST FOLD`.

### Slice 2 — Flujo completo y recovery

- Cablear preview/confirm/status, categorías backup/hold, stale refresh, denied y partial failure.
- Teclado, foco, pending, Escape/click-away y mobile.

### Slice 3 — GVC, calidad y rollout

- Scenario premium, dossier/scorecard, enterprise review, docs funcional/manual y flag consumer si TASK-1762 lo exige.

## Out of Scope

- Crear/modificar capacity policy desde este dialog.
- Calcular elegibilidad, consentimiento o N en browser.
- Mostrar nombres/emails de toda la cohorte si conteos/categorías bastan.
- Revertir decisiones o reabrir una vacante.

## Detailed Spec

El flujo muestra dos resultados independientes: “Decisión registrada” y “Cierre de vacante”. Si la selección no
completa capacidad, no aparece el segundo paso. Si la completa, el preview nombra cupos, N afectado, categorías y
efecto de comunicación. El CTA contiene verbo+objeto+N. Cancelar deja la selección registrada y no cierra nada.

**El diálogo muestra el desenlace y la causa que se van a escribir, no sólo el conteo.** Antes de confirmar, la
superficie declara textualmente que en cada candidatura de la cohorte se registrará el desenlace `not_selected`
(«Sin selección») con causa `capacity_filled` — la enmienda del ADR §9 — y que **nadie queda marcado como
«Descarte»**. Ese par viene del DTO de preview de `TASK-1762`; sus etiquetas visibles salen de las claves de
desenlace y causa que define `TASK-1766`, que esta task consume sin redefinir. Ninguna superficie de este flujo
llama «rechazo» al cierre por capacidad (ADR §12). La persona candidata nunca lee la etiqueta interna: su correo
es el de `not_selected + capacity_filled` («esta vez elegimos a otra persona»), propiedad de `TASK-1762`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1762 contract/runtime → Slice 1 first fold → Slice 2 interaction → Slice 3 GVC/rollout.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Operador confunde selección y cierre | UI/Hiring | medium | mensajes/CTAs separados + second step | cancelaciones/errores de uso |
| N visible queda stale | UI/data | medium | DTO digest + refresh obligatorio | error canónico stale |
| Partial failure parece éxito | UI/ops | low | status persistente por conteos + recovery | run partial_failed |
| Mobile oculta consecuencia | UI | low | single-plane + GVC 390 | overflow/CTA truncada |

### Feature flags / cutover

- Consume el flag/default OFF de TASK-1762; con flag OFF conserva decisión individual actual.

### Rollback plan per slice

- Revert UI o apagar flag; el dialog actual de decisión individual queda como fallback.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Registrar selección y cerrar/notificar son pasos visual y semánticamente distintos.
- [ ] CTA final incluye el número real de personas y no puede confirmarse con preview stale.
- [ ] Cancelar no revierte la selección ni ejecuta cierre.
- [ ] El diálogo muestra el desenlace `not_selected` («Sin selección») y la causa `capacity_filled` antes de confirmar.
- [ ] Ninguna superficie del flujo nombra este cierre como «rechazo» ni escribe el desenlace `rejected`.
- [ ] Backups/holds se muestran como categorías explícitas y no se incluyen silenciosamente.
- [ ] Loading, empty, stale, denied, error y partial failure son honestos y recuperables.
- [ ] Copy reusable está tokenizada y revisada con UX content/accessibility.
- [ ] Desktop/390, teclado, foco, reduced motion y overflow pasan GVC premium.

## Verification

- `pnpm task:lint --task TASK-1763`
- `pnpm ui:readiness-check --task TASK-1763`
- tests focales de interacción/errores/copy.
- `pnpm fe:capture task-1763-hiring-capacity-closure --env=staging`
- `pnpm fe:capture:review <capture-dir>` y `pnpm ui:quality --task TASK-1763`.
- `pnpm qa:gates --changed` y `pnpm docs:closure-check`.

## Closing Protocol

- [ ] Lifecycle/carpeta, registry, README, EPIC-011, Handoff y changelog sincronizados.
- [ ] Dossier, scorecard, docs funcional/manual y evidencia de first fold enlazados.
- [ ] Estado runtime no se declara operativo hasta completar TASK-1762 y canary.

## Follow-ups

- Surface opening-level sólo si el uso real demuestra que Application 360 no cubre cierres iniciados fuera de una selección.
