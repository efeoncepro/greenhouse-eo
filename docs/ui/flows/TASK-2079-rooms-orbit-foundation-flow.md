# TASK-2079 — Flujo de navegación de las primitivas de Rooms

Las primitivas `CameraWorld` e `IrisReveal` definen cómo se navega dentro de una sala: cambiar de capítulo,
alejarse al mapa y abrir algo a pantalla completa. Este contrato fija ese comportamiento una vez para que la
sala (TASK-2059), la invitación (TASK-2068), la pieza (TASK-2071) y la audiencia (Fase 3) lo hereden igual.
Fuente: canvas aprobado el 2026-10-29 (`Main.dc.html`, `Audiencia.dc.html`) y
[la dirección visual](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md#aprobación-2026-10-29--canvas-la-sala-es-una-órbita).

## Nodos

| Nodo | Qué se ve | Cómo se entra | Cómo se sale |
|---|---|---|---|
| Escena k | Un capítulo a escala 1, centrado | Estación k, barra de capítulos, flechas ← → o deep link `#capitulo-k` | Otra escena (salto), Mapa |
| Mapa | Las cinco escenas a escala 0,18 con el anillo y su arco de recorrido | Botón «Mapa», tecla `M` o Escape desde una escena | Elegir una escena |
| Iris abierto | Una vista a pantalla completa sobre la escena | Acción «Abrir» de la escena (en la sala: pieza ampliada; en audiencia: la escena activa) | Escape, botón «Cerrar» o volver del navegador |

## Transiciones

- **Escena → escena**: salto orbital (contrato de motion). La URL actualiza el hash con `history.replaceState`
  para no llenar el historial con cada capítulo. El foco va al título de la escena destino.
- **Escena → mapa**: alejar cámara. Foco en la estación de la escena actual. El hash pasa a `#mapa`.
- **Mapa → escena**: acercar a la escena elegida. Foco en su título.
- **Escena → iris**: `<dialog>` con `showModal()`; empuja una entrada al historial (`pushState`) para que el botón
  Atrás del navegador lo cierre. El foco entra al primer control del iris.
- **Iris → escena**: cierre inverso; el foco vuelve al botón que lo abrió; se consume la entrada de historial.

## Reglas

- Un deep link `#capitulo-3` abre directo en la escena 3, sin animación de entrada.
- Con movimiento reducido todas las transiciones son cortes y el foco se mueve igual.
- Las transiciones no cambian permisos ni datos: solo la vista. Un cambio de edición o de sesión usa navegación
  de documento (regla ya vigente en `room-motion.tsx`).
- Teclado: ← → cambian de escena; `M` y Escape van al mapa; Enter en una estación entra; Escape en el iris cierra.
  Ningún atajo actúa mientras el foco está en un campo de texto.
- Táctil: deslizar horizontal entre escenas solo si el gesto empieza fuera de la pieza (la pieza conserva su propio gesto de detalle).

## GVC Scenario Plan

- Scenario: `rooms-orbit-foundation` sobre `/demo/base`, región `camera-world` e `iris`.
- Pasos: entrar por `#capitulo-3`; saltar a 4 con →; Escape al mapa; Enter en estación 1; abrir iris; Atrás del
  navegador; verificar foco en cada paso.
- Viewports 1440×900 y 390×844; repetir con movimiento reducido.
- Evidencia en `docs/ui/reviews/TASK-2079-rooms-orbit-foundation/`.

## Design Decision Log

- 2026-10-30 — Capítulos en el hash con `replaceState` (compartibles sin ensuciar el historial); el iris sí entra
  al historial porque el usuario espera que Atrás lo cierre.
- 2026-10-30 — Escape va al mapa desde una escena: el mapa es el «nivel de arriba» del canvas. Alternativa
  descartada: Escape sin efecto fuera del iris.
