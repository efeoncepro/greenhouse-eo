# TASK-1814 — Motion heredado y feedback verificable

Contrato de propuesta 2026-09-03; no introduce efectos ni un sistema de motion.
Fuente: HrOffboardingView usa AnimatePresence/motion, useReducedMotion y primitives existentes.

## Scope and Primitive Decision

Conservar entrada/salida del inspector y estados focus/hover/pending de componentes instalados.
No agregar stagger, counters, animación financiera ni transiciones entre decisiones contractuales.
Temporización/easing del tema y primitives; no nuevos literales. Verificar el mapping vigente antes de JSX.

## State Transitions

Abrir caso → loading → resumen: no mostrar datos del caso anterior durante el cambio.
Guardar → pending → readback → confirmado: feedback sigue respuesta real, nunca un timer que simula éxito.
Error → foco al mensaje/campo; retry conserva datos del mismo caseId. Cerrar devuelve foco al trigger.

## Reduced Motion and Accessibility

Con prefers-reduced-motion, misma información/acciones con transición mínima heredada o instantánea;
ningún estado contractual depende de animación. Teclado, foco visible y Escape con dirty state conservan significado.
No anunciar éxito antes del readback. Feedback accesible y persistente si la verificación falla.

## Verification

GVC premium desktop 1440px/mobile 390px: open/close, pending, error, recarga y focus restore.
Repetir con reduced-motion; comprobar ausencia de datos cruzados y scrollWidth <= clientWidth.
Dossier y scorecard se generan al implementar; este contrato no afirma evidencia visual aún inexistente.
