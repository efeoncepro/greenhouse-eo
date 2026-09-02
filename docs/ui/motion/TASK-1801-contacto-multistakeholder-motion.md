# TASK-1801 — Motion contract de Contacto multistakeholder

## Purpose

Motion sólo comunica cambio de paso, aparición condicional y apertura/cierre de Meetings. No decora el contacto,
no autoavanza y nunca oculta el estado actual.

## Transitions

| Cambio | Mecanismo | Comportamiento | Reduced motion |
| --- | --- | --- | --- |
| Motivo → campos | renderer existente | transición corta de opacidad/altura sólo si ya es primitive | aparición instantánea |
| Paso 1 ↔ Paso 2 | renderer `multi_step_light` si se selecciona | reemplazo contenido sin desplazar el viewport | reemplazo instantáneo |
| Error/receipt | estado inline + live region | feedback de estado, sin celebración | idéntico sin transición |
| Meetings open/close | primitive canónica | diálogo con focus trap y restore | apertura/cierre instantáneo |
| Pending | estado del CTA | indicador no bloqueante y texto estable | idéntico |

## Constraints

- Usar tokens/primitives existentes; no introducir GSAP, Framer ni keyframes page-scoped nuevos.
- No animar height si causa salto de foco o scroll; reservar espacio o reemplazar instantáneamente.
- No usar stagger, parallax, scroll reveal, confetti o auto-scroll.
- `prefers-reduced-motion: reduce` elimina transformaciones/transiciones sin perder feedback.
- Escape cierra sólo Meetings; restore al CTA. Cambiar motivo no roba foco.

## Verification

- Captura normal y reduced motion a 1440 y 390.
- Foco permanece visible durante motivo, paso, error, receipt y diálogo.
- No hay layout shift material, scroll forzado ni estado intermedio activo.
- La interacción funciona por completo con animaciones deshabilitadas.
