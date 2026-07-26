# TASK-1574 — Globe Producer Video Editing motion

## Motion contract

- Primitive: tokens Globe/Greenhouse existentes, sin framework de animación nuevo.
- Enter: Edit Rail aparece de forma localizada mientras el stage conserva el frame y el scroll.
- Timeline: handles y playhead se mueven con valores reales; no progreso sintético.
- Selection: el intervalo activo recibe feedback discreto; escenas no seleccionadas no se animan decorativamente.
- Reference roles: asignación y eliminación tienen feedback inmediato, sin reordenamientos sorpresivos.
- Run: el stage conserva un poster/frame estable y muestra progreso deterministicamente.
- Result: compare cambia dentro del stage y permite volver al original sin perder la posición temporal.
- Reduced motion: estados instantáneos, mismos controles y announcements.

## Guardrails

- No autoplay al entrar en edición.
- No morph de todo el Producer ni transición que oculte latencia.
- No mover el foco durante seek, estimate o updates async.
