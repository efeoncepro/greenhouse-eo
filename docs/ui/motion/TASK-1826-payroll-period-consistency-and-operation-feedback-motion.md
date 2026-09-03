# TASK-1826 — Payroll operation feedback Motion Contract

## Meta

- Status: `draft`
- Owner task: TASK-1826
- Related wireframe: docs/ui/wireframes/TASK-1826-payroll-period-consistency-and-operation-feedback.md
- Related flow: docs/ui/flows/TASK-1826-payroll-period-consistency-and-operation-feedback-flow.md
- Motion type: `primitive-default`
- Primary primitive / library: `existing primitive`
- Copy source: src/lib/copy/payroll.ts.

## Motion Brief

Feedback de carga y foco reduce incertidumbre de HR/Finance. No representa avance financiero ni interpola
importes. No hay coreografía nueva: se conserva la de dialogs/feedback canónicos, con tokens por resolver
en readiness y sin literales de tiempo. No afirmar que el feedback ya fue verificado.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Selector | Cambio | Estado loading textual | Existente | Sí |
| Dialog | Abrir/cerrar | Default accesible | Payroll dialogs | Sí |
| Operación | Reader actualiza | Estado por etapa | Feedback canónico | Sí |
| Importes | Cambio snapshot | Reemplazo sin interpolación | Tabla | Sí |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA | Normal | Tema | Ring canónico | Tema | No toggle | Disabled + razón | Estado backend |
| Selector | Período | Tema | Ring | Selector | Destino | Loading | Snapshot o error |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Contexto | A | B loading | Default tema | Retirar tabla A | Inmediato |
| Dialog | Closed | Open | Default primitive | Foco estable | Sin transición |
| Progreso | Pending | Partial/terminal | Default feedback | Texto por estado real | Inmediato |

## Primitive & Token Mapping

- Primitive: feedback/diálogos existentes; lookup exacta antes de UI ready yes.
- Imports allowed: exports de primitives canónicas y tema existente.
- Imports forbidden: SDKs nuevos de animación o timers financieros ad hoc.
- Timing tokens: heredados, por identificar en implementación mapping.
- Easing tokens: heredados; ningún literal.
- Layout animation: no animar filas entre períodos.
- CSS properties: opacity/transform sólo si default primitive las necesita.
- GSAP/Lottie justification: no se introducen.

## Reduced Motion Contract

- Detection: mecanismo canónico de primitive/prefers-reduced-motion.
- Replacement behavior: cambio inmediato, texto y foco equivalentes.
- Meaning preserved: período, loading y resultado explícitos.
- Animations removed: transiciones decorativas.
- Animations retained: ninguna indispensable para comprender.

## Accessibility & Feedback

- Focus visibility: ring canónico visible durante toda interacción.
- Keyboard activation: Enter/Space según control.
- Live region / status behavior: un anuncio por cambio significativo, no polling repetitivo.
- Color-independent state: etiqueta textual e icono con significado accesible.
- Motion-independent meaning: operación identificada y resultado persistente.
- Intermediate-frame contrast: AA preserved mediante texto estable; comprobar en GVC.
- Error/destructive stability: error no desaparece automáticamente ni mueve CTA bajo puntero.

## Performance Guardrails

- Compositor-only properties: default wrappers, sin animar geometría tabla.
- Layout reads/writes: evitar loops por polling; no mediciones por frame.
- Animation scope: feedback local, no toda la página.
- Chart/counter constraints: prohibido interpolar montos/porcentajes inventados.
- Mobile constraints: sin reflow que oculte selector o botón.

## GVC / Micro Evidence

- Scenario: task1826-payroll-period-consistency.
- Scenario file: nuevo declarado en wireframe.
- Route: /hr/payroll.
- Viewports: desktop y390px.
- Required steps: abrir/cerrar detalle, cambio con fallo y progreso parcial.
- Required captures: foco antes/después, loading/error/partial.
- Required frame labels: loading,error,focus-restored.
- Required data-capture markers: definidos en wireframe.
- Assertions: no dato operable de período anterior en transición.
- Intermediate-frame axe/contrast evidence: texto estable contrastado y foco visible.
- Reduced-motion evidence: misma secuencia activada, sin dependencia del movimiento.

## Design Decision Log

- Decision: defaults de primitive con feedback textual persistente.
- Alternatives considered: contador/progreso simulado rechazado.
- Why this pattern: evita confianza falsa sobre operaciones sensibles.
- Reuse / extend / new primitive: reuse.
- Open risks: mapping tokens concreto pendiente de readiness.
- Follow-up: validar variantes en implementación y GVC.

## Acceptance Checklist

- [ ] Reduced motion preserva significado y foco.
- [ ] Estados pendientes/fallidos no dependen sólo de movimiento/color.
- [ ] Capturas secuenciales y contraste/foco revisados.
