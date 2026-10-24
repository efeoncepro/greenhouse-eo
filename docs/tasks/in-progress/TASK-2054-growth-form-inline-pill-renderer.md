# TASK-2054 — Growth Forms: renderer del formulario en línea (píldora que se transforma)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2054-growth-form-inline-pill-renderer.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-2054-growth-form-inline-pill-renderer-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `En implementación local (Slice 1)`
- Rank: `TBD`
- Domain: `growth|forms|ui`
- Blocked by: `TASK-2053 (Slice 1)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hace que `<greenhouse-form>` dibuje la presentación `inline_pill`: un botón píldora que, al presionarlo, se estira y
se convierte en el campo de correo con su botón de envío, muestra el loader al enviar, confirma con relleno y check y
queda en «Ya estás suscrito» / «Te esperamos el …». Es lo que usan la suscripción a Glitch y la reserva del webinar en
la portada del blog v3, tal cual el canvas.

## Why This Task Exists

El operador pidió que el botón «se convierta en el formulario de forma elegante allí mismo, no en pop-up» y que al
enviar haga señal de éxito y luego diga que ya estás suscrito. El canvas lo resolvió con una piel local, pero en el
sitio los campos los dibuja el renderer de Growth Forms; si la animación vive en la página, el siguiente diseño la
vuelve a copiar y se rompe con cada cambio del renderer (lección de TASK-2045).

## Goal

- El renderer soporta `inline_pill` con los cinco estados del canvas y sus valores.
- Dos instancias del mismo formulario en una página comparten el estado de éxito.
- Los formularios vivos no cambian (0 px).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`

Reglas obligatorias:

- Valores como tokens `--ghf-inline-*` con default del canvas; el host sólo declara el tono.
- El envío, la validación y el consentimiento son los mismos del formulario estándar.
- Sin contorno interno del campo; el foco lo marca la píldora (lección del canvas 2026-10-24).

## Normative Docs

- `docs/tasks/in-progress/TASK-2045-growth-form-dialog-design-fidelity.md`
- `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`
- `.claude/skills/greenhouse-growth-forms/SKILL.md`

## Dependencies & Impact

### Depends on

- TASK-2053 Slice 1 (contrato `inline_pill`).

### Blocks / Impacts

- TASK-2051 (Glitch y evento en la portada).
- TASK-2038 (renderer a AXIS) hereda la presentación nueva.

### Files owned

- `src/growth-forms-renderer/renderer.ts`
- `src/growth-forms-renderer/telemetry.ts`
- `src/growth-forms-renderer/` (CSS del renderer) [verificar archivo de estilos]

## Current Repo State

### Already exists

- Renderer `src/growth-forms-renderer/renderer.ts` con esquema oscuro, ancho por campo, tokens y éxito con la órbita (TASK-2045).
- Evento de telemetría de éxito (`telemetry.ts`).

### Gap

- No hay presentación en línea ni estados de transformación.
- No hay sincronización de éxito entre instancias.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/growth-forms-renderer/` en greenhouse-eo (bundle público del web component)
- Future candidate home: `ui-package`
- Boundary: web component `greenhouse-form` con la presentación `inline_pill` del contrato de TASK-2053
- Server/browser split: el renderer corre en el navegador y sólo llama a la API pública de Growth Forms
- Build impact: bundle del renderer (sin dependencias nuevas)
- Extraction blocker: el renderer se publica con el release de Greenhouse hasta TASK-2038

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante del blog
- Momento del flujo: suscribirse a Glitch o reservar un webinar desde la portada
- Resultado perceptible esperado: un gesto, una confirmación clara, un estado final tranquilo
- Friccion que debe reducir: pop-ups y saltos a otra sección
- No-goals UX: formularios de varios campos en línea

### Surface & system decision

- Surface: web component `greenhouse-form`
- Nav placement: `none`
- Composition Shell: `no aplica` — componente embebido en el sitio público
- Primitive decision: `extend` — presentación nueva del renderer existente
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: ninguno (en línea)
- Copy source: `local one-off` — etiquetas desde el contrato del formulario
- Access impact: `none`

### State inventory

- Default: reposo
- Loading: enviando (loader de la órbita)
- Empty: no aplica
- Error: validación y red, en línea
- Degraded / partial: sin JS, enlace a la suscripción de abajo
- Permission denied: no aplica
- Long content: etiquetas largas recortan con elipsis en el botón interno
- Mobile / compact: ancho completo
- Keyboard / focus: Enter abre, foco al campo, Esc cierra, foco al mensaje tras éxito
- Reduced motion: sin estiramiento ni pulso

### Interaction contract

- Primary interaction: abrir y enviar
- Hover / focus / active: botón AXIS (texto que rueda y flecha)
- Pending / disabled: loader y campo atenuado
- Escape / click-away: Esc cierra si el campo está vacío
- Focus restore: al botón
- Latency feedback: loader inmediato
- Toast / alert behavior: sin toasts

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: campo y textos
- Layout morph: ancho del contenedor
- Stagger: campo con 200 ms de retraso
- Timing / easing token: ver motion doc
- Reduced-motion fallback: ver motion doc
- Non-goal motion: resplandor

### Implementation mapping

- Route / surface: cualquier página con el formulario; primera: `/blog/`
- Primitive / variant / kind: presentación `inline_pill`
- Component candidates: rama nueva del renderer
- Copy source: contrato del formulario
- Data reader / command: API pública de Growth Forms (sin cambios)
- API parity: envío por la API pública existente
- Access / capability: público
- States to implement: los cinco + errores

### GVC scenario plan

- Scenario file: `scripts/growth/forms/fixtures/inline-pill.scenario.mjs` [crear]
- Route: fixture local del renderer
- Viewports: 1440×900 y 390×844
- Quality profile: `premium`
- Required steps: abrir, escribir, enviar (respuesta simulada), esperar estado final
- Required captures: cinco estados por viewport
- Required `data-capture` markers: `ghf-inline-idle`, `ghf-inline-open`, `ghf-inline-sending`, `ghf-inline-success`, `ghf-inline-done`
- Assertions: ≤ 1 % contra el canvas; formularios vivos 0 px de diferencia
- Scroll-width checks: 390
- Reduced-motion / focus evidence: corrida con movimiento reducido y con teclado
- Review dossier: `docs/ui/reviews/TASK-2054-growth-form-inline-pill-renderer/`
- Baseline decision / surface ID: baseline = canvas; surface `growth-form-inline-pill`

### Design decision log

- Decision: presentación del renderer con tokens y hooks
- Alternatives considered: piel en la página
- Why this pattern: fidelidad repetible
- Reuse / extend / new primitive: extend
- Open risks: dos instancias del mismo formulario

### Visual verification

- GVC scenario: fixture del renderer
- Viewports: 1440, 390
- Required captures: cinco estados
- Required `data-capture` markers: los cinco
- Scroll-width check: 390
- Accessibility/focus checks: axe; recorrido con teclado
- Before/after evidence: formularios vivos sin cambio
- Known visual debt: ninguna
- Visual scorecard: `docs/ui/reviews/TASK-2054-growth-form-inline-pill-renderer.scorecard.json`
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

### Slice 1 — Estados y tokens

- Rama `inline_pill` del renderer con reposo, abierto, enviando, éxito y listo; tokens `--ghf-inline-*`.

### Slice 2 — Teclado, errores y sincronización

- Enter/Esc/foco; errores en línea; `CustomEvent` de éxito que sincroniza instancias.

### Slice 3 — Fixture y evidencia

- Fixture, capturas a 1440 y 390, comparación contra el canvas, prueba de 0 px en formularios vivos.

## Out of Scope

- Contrato (TASK-2053) y publicación de formularios por evento.
- Mover el renderer a AXIS (TASK-2038).

## Detailed Spec

Valores en el wireframe y el motion doc; son los del canvas (`.gxs`, `.gxs--ev`). El tono del host entra por
`--ghf-inline-tone` (Glitch `#6ec207`, evento `#36c8bf`) y `--ghf-inline-on-tone` (texto sobre el tono `#001a33`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambia el aspecto de formularios vivos | Growth Forms | low | rama aislada; prueba de 0 px | diff de capturas |
| Doble envío con dos instancias | Growth Forms | low | idempotencia del envío existente + estado compartido | logs de envíos duplicados |

### Feature flags / cutover

- Sin flag — la presentación sólo aplica a formularios que la declaren.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–3 | Revert PR + release del renderer | 30 min | sí |

### Production verification sequence

1. Fixture local verde y formularios vivos sin cambio.
2. Release del renderer por el control plane.
3. Preview de la portada (TASK-2051) con el formulario real en staging.

### Out-of-band coordination required

- Release de Greenhouse a `main` (requiere aprobación del operador).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-2054`.
- [ ] Se declaro `Wireframe` y `Motion` y los archivos existen.
- [ ] Los cinco estados coinciden con el canvas (≤ 1 %) a 1440 y 390.
- [ ] Formularios vivos con 0 px de diferencia.
- [ ] Teclado y movimiento reducido según el contrato.

## Verification

- `pnpm test src/growth-forms-renderer`
- `pnpm local:check`
- Fixture con capturas a 1440 y 390

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] la skill `greenhouse-growth-forms` documenta la presentación nueva

## Follow-ups

- Llevar la presentación al renderer en AXIS con TASK-2038.
