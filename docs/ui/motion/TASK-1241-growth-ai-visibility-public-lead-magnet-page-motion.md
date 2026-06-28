# TASK-1241 — Public Lead Magnet Page Motion Contract (nodo S1)

> Nodo **S1** del master flow: `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (§8 Motion & continuidad). Reusa el motion del report-artifact (TASK-1252) + entrada del KPI.

## Meta

- Status: `draft`
- Owner task: TASK-1241
- Related wireframe/flow: TASK-1241 wireframe + flow
- Motion primitive base: `Motion` / `CSS` (reusa report-artifact motion)

## Motion Brief

- Qué se mueve: el report "se arma" al llegar (score cuenta, charts se dibujan) + entrada del hero
- Por qué: comunicar que el diagnóstico se generó para el prospecto (engagement del lead magnet)
- No-goals: motion decorativo gratuito, parallax pesado, autoplay

## Motion Inventory

- Hero entrance (fade + rise sutil)
- Report assemble (número cuenta 0→valor; charts draw-in) — reusa TASK-1252/1248
- Status → report transition (cross-fade)

## Microinteraction States

- Form submit: botón pending (spinner inline)
- Poll: indicador de progreso indeterminado honesto

## Transition Specs

- Durations: hero ~400ms; report assemble ≤600ms; cross-fade ~200ms (escala de modern-ui)
- Easing: decelerated (entradas)

## Primitive & Token Mapping

- Reusa tokens de motion del report-artifact (`card-density-motion` / artifact) — NO inventar
- Sin tokens nuevos

## Reduced Motion Contract

- `prefers-reduced-motion: reduce` → valores finales de una (sin contar/dibujar), sin hero rise
- never-hidden: el contenido siempre visible sin JS

## Accessibility & Feedback

- Status vía aria-live (no solo motion)
- El valor final se anuncia (no depende de la animación)

## Performance Guardrails

- Solo propiedades de compositor (opacity/transform)
- Lazy-load del report-artifact

## GVC / Micro Evidence

- Captura del report ya armado (estado final) + reduced-motion
- Scenario: `aeo-public-lead-magnet`

## Design Decision Log

- Decision: reusar el "armado del dato" del artifact; motion como acento, no hook
- Alternatives considered: hero cinemático (rechazado: restraint, es producto no marketing pesado)
- Why: continuidad cross-surface (mismo objeto se arma en web/portal)
- Open risks: ninguno material

## Acceptance Checklist

- [ ] Cada motion tiene fallback reduced-motion.
- [ ] No hay info transmitida solo por motion.
- [ ] Durations/easing dentro de la escala canónica.
- [ ] Solo propiedades de compositor.
- [ ] Tokens reusados, no inventados.
