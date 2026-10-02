# TASK-1969 — Chrome del portal y saludo con Elio · Motion Contract

## Meta

- Task: `TASK-1969` · Wireframe: `docs/ui/wireframes/TASK-1969-portal-chrome-and-greeting-elio.md` · Flow: `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md`
- Fuente: motion probado en el canvas aprobado (https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU) el 2026-10-02.
- Elio trae su propio motion (rig AXIS: mira el puntero, saluda, salta, cara LED); este contrato sólo cubre lo que la Home agrega alrededor.

## Motion Inventory

| Pieza | Disparador | Movimiento | Duración / curva |
|---|---|---|---|
| Elio | carga y puntero | comportamiento nativo del rig (`track="window"`, saludo inicial, expresiones) | del componente AXIS |
| Indicador de pensamiento · En espera | reposo | tres esferas respiran (opacidad .25 ↔ .6) en desfase | 2400 ms, `standard`, infinito |
| Indicador · Escuchando | foco en el campo | esferas a opacidad 1; las laterales a escala .75 | 300 ms, `emphasized` |
| Indicador · Pensando | escribiendo | ola: cada esfera sube 10 px y vuelve, desfase 160 ms | 1200 ms, `standard`, infinito |
| Indicador · Trabajando | pregunta enviada | misma ola, más rápida | 720 ms |
| Indicador · Respuesta lista | respuesta | las laterales convergen al centro y desaparecen; la central crece ×1,4 | 300 ms, `emphasized` |
| Panel de conversación | apertura | entra desde −8 px con fade | 400 ms, `emphasized` (`cubic-bezier(.2,0,0,1)`) |
| Puntos «revisando» | esperando respuesta | tres puntos parpadean en secuencia | 900 ms, infinito |
| Novedades | cada 7 s | crossfade de foto; barra de progreso de la pestaña activa | 600 ms fade; progreso lineal 7 s |
| Estado de plataforma (footer) | siempre | ping del punto verde (escala 1 → 2,6, opacidad .5 → 0) | 2400 ms, infinito |
| Menú colapsar | clic | ancho del sidebar | transición nativa del layout Vuexy |
| Burbujas / botones | hover | botones suben 1 px; burbujas cambian fondo y borde | 150 ms, `standard` |

## Reglas

- Tiempos y curvas desde los tokens de motion (`src/lib/design-tokens/*` / `MOTION.md`); nada de milisegundos sueltos en componentes.
- Un solo protagonista a la vez: mientras el panel se abre, Elio no salta.
- El estado nunca depende sólo del movimiento: la etiqueta «Elio · <estado>» cambia en el mismo frame.
- Las novedades se pausan con hover, foco dentro de la tarjeta y pestaña oculta (`visibilitychange`).

## Reduced motion

- Elio: sólo los ojos siguen el puntero (comportamiento del rig).
- Indicador: esferas quietas a opacidad .6; sólo cambia la etiqueta.
- Panel: aparece sin desplazamiento ni fade.
- Novedades: sin rotación automática; las pestañas cambian sólo por clic.
- Footer: punto verde fijo, sin ping.

## Non-goals

- No animar los KPIs ni los gráficos de los bloques del rol (es de cada Home).
- No generar video ni Lottie del Spark.
- No agregar parallax ni scroll reveal al saludo.
