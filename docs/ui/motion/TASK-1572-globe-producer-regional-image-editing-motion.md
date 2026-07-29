# TASK-1572 — Globe Producer Regional Image Editing motion

## Motion contract

- Primitive: tokens de motion Globe/Greenhouse y lifecycle del dialog nativo.
- Enter: transición localizada del rail y overlay; la imagen mantiene sus dimensiones.
- Brush feedback: respuesta sutil del cursor/selección; sin glow de página completa.
- Mask ready: transición breve de overlay y coverage; la información no depende de motion.
- Estimate: transición discreta pending/ready; nunca aparentar costo cero mientras carga.
- Run: conservar máscara visible, mostrar progreso determinista y bloquear duplicate spend.
- Result: transición local de compare; original y resultado siempre distinguibles.
- Reduced motion: cambios instantáneos, mismos labels, focus y announcements.

## Guardrails

- No animar todo el Producer al entrar en edición.
- No usar motion para ocultar latencia o unknown outcome.
- No mover el foco durante dibujo o actualización de estimate.
- View transition sólo como enhancement con fallback inmediato.
