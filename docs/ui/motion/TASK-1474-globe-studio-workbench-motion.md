# TASK-1474 — Globe Studio Workbench Motion Contract

## Intent

Motion comunica continuidad de una decisión creativa a su candidate y release. No simula velocidad con
partículas ni bloquea el primer paint.

## Choreography

- Composition Shell usa entrada rich con stagger corto y regiones interrumpibles.
- Cambio de candidate usa continuidad espacial discreta; canvas y metadata se actualizan como una unidad.
- Context rail desktop entra in-flow; en mobile usa drawer temporal con focus management.
- Adaptive cards morph entre full/condensed/peek mediante container density.
- Running state usa progreso sobrio; no inventa porcentaje cuando el provider no lo entrega.
- Success/release confirma una vez; errors y blockers no tiemblan ni se repiten.

## Reduced motion

- `prefers-reduced-motion` elimina stagger, morph y desplazamientos; conserva cambios instantáneos y foco.
- Ninguna acción, estado o dato depende de animación para ser comprendido.

## Verification

- Interrupción rápida al cambiar candidate o cerrar sidecar no deja estado visual stale.
- Mobile 390px mantiene target sizes, foco y ausencia de overflow.
- GVC captura default y reduced-motion para approval, running, candidate-ready y blocked.
