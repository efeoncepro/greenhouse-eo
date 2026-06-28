# TASK-1247 — Admin Review UI Motion Contract (nodo S13)

> Nodo **S13** del master flow `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`. Superficie interna safety-oriented: motion **mínimo y funcional** (es un release gate, no marketing). Reusa el motion del shell/sidecar, no inventa.

## Meta

- Status: `draft`
- Owner task: TASK-1247
- Related wireframe/flow: TASK-1247 wireframe + flow
- Motion primitive base: AdaptiveSidecar/CompositionShell motion existente + `CSS`

## Motion Brief

- Qué se mueve: entrada ligera del detalle (reconciler sidecar) + feedback de comando (pending→success/error)
- Por qué: orientación (de dónde salió el detalle) + confianza en el resultado de la acción
- No-goals: stagger decorativo, morphs llamativos, cualquier motion que retrase la decisión de release

## Motion Inventory

- Sidecar reconciler enter/exit (reusa AdaptiveSidecar `reconciler` motion)
- Command feedback: pending (spinner inline en el botón) → success/error (transición de estado de `GreenhouseCommandFeedback`)
- Fila sale de la cola tras acción (fade/collapse sutil)

## Microinteraction States

- Aprobar/Rechazar: botón pending (disabled + spinner), anti doble-submit
- Conflicto: refresh de la cola (sin animación llamativa; cambio de estado honesto)

## Transition Specs

- Durations: sidecar ~200ms; feedback ~150ms; row-collapse ~200ms (escala modern-ui, surfaces chicas rápidas)
- Easing: decelerated (entradas)

## Primitive & Token Mapping

- Tokens de motion del design system (AdaptiveSidecar/CompositionShell); sin tokens nuevos
- `GreenhouseCommandFeedback` posee su propia transición de estado

## Reduced Motion Contract

- `prefers-reduced-motion: reduce` → sin stagger/morph; sidecar aparece sin nudge; feedback como cambio de estado directo
- never-hidden: contenido + resultado siempre visibles sin animación

## Accessibility & Feedback

- Resultado del comando SIEMPRE vía aria-live (no solo motion/color)
- Pending bloquea la acción (no se confía en motion para evitar doble-submit; el estado disabled lo garantiza)

## Performance Guardrails

- Solo opacity/transform; sin layout thrash en la cola densa
- La cola no anima cada fila al cargar (evita ruido en listas largas)

## GVC / Micro Evidence

- Capturas: command pending/success/error + sidecar abierto + conflicto
- Scenario: `growth-ai-visibility-admin-review`

## Design Decision Log

- Decision: motion mínimo funcional (orientación + feedback); restraint total (release gate)
- Alternatives considered: stagger de la cola / morphs (rechazado: ruido en una superficie de decisión)
- Why: la confianza en una decisión de release no se construye con animación; el motion solo orienta y confirma
- Open risks: ninguno material

## Acceptance Checklist

- [ ] Cada motion tiene fallback reduced-motion.
- [ ] El resultado del comando no depende solo de motion/color (aria-live).
- [ ] Anti doble-submit por estado disabled, no por timing.
- [ ] Durations/easing dentro de la escala canónica.
- [ ] Solo propiedades de compositor; sin tokens nuevos.
