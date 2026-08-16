# TASK-1730 — Motion contract · `/my` longitudinal candidato

## Intent

El motion comunica causalidad al abrir una postulación, reemplazar CV y recibir un receipt. No ambienta, gamifica
ni convierte el cambio candidate→workforce en una celebración.

## Contract

- Entrada de regiones: primitive Motion/canonical shell, breve y sin retrasar contenido.
- Application selection/detail: transición localizada que mantiene la relación item→detail y el foco.
- Pending→receipt: status textual persistente; nunca depende sólo de fade/color.
- Capability expansion: nuevas secciones aparecen en el próximo readback/session refresh, sin morph global.
- Errores/withdraw: sin shake/bounce; alert/dialog estable.
- Timing/easing: tokens canónicos del runtime, cero ms/easing local.

## Reduced motion

Todos los cambios son instantáneos, conservan scroll/foco y llegan al mismo estado final. Ninguna acción requiere
observar una animación para entender el resultado.

## GVC evidence

- Capturar application select/detail, CV pending→receipt, dialog withdraw y fixture candidate→member.
- Ejecutar los mismos pasos con `prefers-reduced-motion` y comprobar foco, live region y contraste intermedio.
