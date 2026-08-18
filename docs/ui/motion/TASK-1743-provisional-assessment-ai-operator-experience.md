# TASK-1743 — Contrato de movimiento de evaluación provisional

## Decision

No añadir animación ornamental ni transición de score. La actualización de estados reutiliza feedback instantáneo, skeleton y disclosures existentes del workbench.

## State feedback

- Loading reserva geometría para evitar layout shift.
- Ready, partial y error cambian copy y tokens semánticos sin contar números ni animar charts.
- Expandir evidencia usa el disclosure canónico existente; el foco permanece estable.
- Reintento muestra pending inline y deshabilita únicamente el control activado.

## Reduced motion

Con `prefers-reduced-motion: reduce`, cualquier transición heredada se vuelve instantánea. Estado, cobertura, autoridad y acciones mantienen equivalencia completa.

## Verification

Capturar ready, partial y error con movimiento normal y reducido; confirmar ausencia de layout shift, score animado, auto-scroll y pérdida de foco.

## GVC / Micro Evidence

- Evidencia desktop 1440×1100 y mobile 390×844 con loading→ready y retry pending→error/ready.
- Captura adicional con `prefers-reduced-motion: reduce` y recorrido de teclado.
- Assertions: sin layout shift perceptible, sin score animado, sin auto-scroll y con foco restaurado.

## Design Decision Log

- Decisión: reutilizar únicamente feedback y disclosure canónicos existentes.
- Rechazado: counters animados, radar animado, entrada celebratoria y desplazamiento automático.
- Razón: el movimiento no debe reforzar autoridad ni desviar atención hacia una propuesta provisional.
