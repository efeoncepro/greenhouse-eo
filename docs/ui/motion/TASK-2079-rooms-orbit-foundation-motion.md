# TASK-2079 — Motion de la base visual de Rooms

Contrato de movimiento de las primitivas compartidas. Fuente: canvas aprobado el 2026-10-29
([dirección visual](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md#aprobación-2026-10-29--canvas-la-sala-es-una-órbita))
y `efeonceGraphicLine.motion` de `@efeoncepro/axis-tokens@0.6.10`. Principios de marca que rigen todo:
lento-rápido-lento, llegar con impacto, un protagonista a la vez y sin salto de velocidad al pasar de un
movimiento a otro.

## Inventario

| Movimiento | Disparo | Tiempos | Curva | Movimiento reducido |
|---|---|---|---|---|
| Dibujo de la órbita | Primer montaje o «Volver a dibujar» | Anillo 0–500 ms (opacidad + `stroke-dashoffset`); arco 400–1400 ms; esfera 1400–1700 ms con overshoot `sphereBirth`; halo 1200–2000 ms (opacidad 0 → 1) | arrive = `emphasized` | Aparece completa, sin transición |
| Arco que mide | Cambio del dato real | Interpola la longitud del arco 600 ms; la esfera viaja por el anillo en el mismo tiempo | transform = `standard` | Salto directo al nuevo valor |
| Salto orbital | Ir a otro capítulo | Fase lift 0–45 %: la cámara aleja hasta escala 0,55 y gira hacia el destino; fase land 45–100 %: acerca al destino a escala 1. Duración 900 ms (1200 ms si el destino está opuesto) | lift = `emphasizedAccelerate`, land = `emphasized` | Corte directo a la escena destino |
| Mapa | «Mapa» o Escape desde una escena | La cámara aleja a 0,18 en 700 ms; el arco del anillo y las estaciones aparecen al llegar (200 ms) | `emphasized` | Corte directo |
| Iris | Abrir una vista a pantalla completa | `clip-path: circle()` desde el centro de la esfera hasta cubrir el viewport, 650 ms; cierre inverso 450 ms | abrir `emphasized`, cerrar `emphasizedAccelerate` | Fundido de 0 ms (aparece) |
| Parallax | Movimiento del puntero | Órbita ±7 px, texto ±14 px, suavizado con rAF (factor 0,08 por cuadro) | — | Desactivado |
| Grano | — | Estático | — | Se mantiene (no es movimiento) |

Todas las constantes viven en `src/components/orbit/motion.ts` del repo `efeonce-rooms`. Ningún componente
declara duraciones o curvas propias.

## Reglas

- La órbita no gira, no late y no se usa para indicar espera. La espera la dicen el texto y el botón.
- Un solo protagonista: durante el salto orbital no animan textos ni controles; la barra de capítulos mueve
  su esfera al terminar la fase land.
- Interrumpir: un segundo clic durante un salto cancela la animación en curso (`Animation.cancel`) y parte
  desde la posición actual al nuevo destino; nunca encola saltos.
- El foco no espera a la animación: se mueve al título destino al iniciar la fase land.
- `prefers-reduced-motion: reduce` se lee con `matchMedia` y se re-evalúa en caliente.
- Pestaña oculta (`document.hidden`): se aplica el estado final sin animar.

## GVC / Micro Evidence

- Grabar `.webm` del laboratorio `/demo/base` en 1440×900 con: dibujo, cambio de fracción 1/5 → 4/5, salto
  01 → 03 y 03 → 04, mapa, iris abrir/cerrar y dos clics rápidos seguidos sobre estaciones distintas.
- Repetir con movimiento reducido y comprobar que cada cambio es directo y el estado final idéntico.
- Medir con Performance: ningún cuadro > 16 ms en el salto ni en el parallax en desktop; reportar el móvil de
  prueba disponible.
- Dossier: `docs/ui/reviews/TASK-2079-rooms-orbit-foundation/`.

## Design Decision Log

- 2026-10-30 — WAAPI para el salto y el iris (cancelables, sin dependencia); View Transitions de React 19 solo
  para cambios de ruta, como ya hace `room-motion.tsx`.
- 2026-10-30 — Dos fases con curvas distintas en el salto (acelerar al salir, frenar al llegar) para cumplir
  «sin salto de velocidad»; descartado un único tween lineal de escala y posición.
- 2026-10-30 — El overshoot se reserva al nacimiento de la esfera; nada más rebota.
