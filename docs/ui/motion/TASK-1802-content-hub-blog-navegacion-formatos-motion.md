# TASK-1802 — Motion contract del Content Hub Efeonce

> Alcance: feedback funcional mínimo. No autoriza parallax, carruseles, scroll hijacking ni reveals ornamentales.

## Intent

El movimiento sólo confirma foco, hover, selección, carga o envío sin retrasar lectura ni navegación. La identidad
editorial proviene de composición, tipografía, imagen y ritmo espacial; no de animaciones.

## Contract

| Evento | Tratamiento | Límite |
|---|---|---|
| hover/focus de link o card | color/underline/borde con transición CSS breve | sin mover layout ni escalar contenido |
| filtro/tipo activo | cambio inmediato de estado y `aria-current` aplicable | URL/HTML manda; no crossfade obligatorio |
| paginación | navegación nativa | sin interceptar scroll ni transición de página |
| newsletter pending | indicador localizado + label accesible | termina con receipt/error server-side |
| contenido cargado | render server-side | no stagger ni reveal requerido |

## Reduced motion

- `prefers-reduced-motion: reduce` elimina transiciones no esenciales.
- Foco, active/current, pending, success y error conservan señal visual y semántica sin movimiento.
- Ningún estado depende de duración, dirección o animación para comprenderse.

## Verification

- Teclado y lector de pantalla reciben los mismos estados que mouse/touch.
- No hay layout shift provocado por hover/focus/pending.
- Navegación y contenido funcionan con JavaScript deshabilitado.
- GVC incluye reduced motion y newsletter pending/success/error.

