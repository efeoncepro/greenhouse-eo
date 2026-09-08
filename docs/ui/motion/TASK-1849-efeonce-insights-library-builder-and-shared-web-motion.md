# TASK-1849 — motion y feedback

Diseño inicial. Reusar wrappers Motion y CompositionShell; no introducir motor, valores literales ni charts animados.

## Triggers and Targets

Apertura/cierre de sidecar usa patrón canónico; pending/ready actualiza texto/aria-live polite sin mover el foco.
Navegación de capítulos conserva foco en destino; no autoscroll de recuperación inesperado.

## Timing and Ownership

Duraciones/easing de tokens canónicos; shell posee layout, consumer no anima la misma propiedad.
Sin stagger, contadores ni parallax. Interrupción devuelve al estado determinado por reader.

## Reduced Motion

Immediate fallback, sin ocultar contenido ni perder foco. Prefers-reduced-motion probado con teclado.

## GVC Scenario Plan

Desktop y 390px: sidecar abrir/cerrar, pending→failed→retry, reduced motion. Registrar capturas y foco.

## Design Decision Log

Feedback funcional de plataforma suficiente; no motion ornamental que sugiera precisión o progreso inexistente.
