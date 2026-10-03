# TASK-1969 — Chrome del portal y saludo con Elio · Flow

## Meta

- Task: `TASK-1969` · Wireframe: `docs/ui/wireframes/TASK-1969-portal-chrome-and-greeting-elio.md` · Motion: `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Fuente: canvas aprobado https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU (artboards `Main.dc.html`, `Cliente.dc.html`, `Colaborador.dc.html`), interacción probada en el canvas el 2026-10-02.
- Programa: `TASK-1967`. Este flow es compartido por las tres Homes; cada Home sólo cambia las sugerencias y la bajada.

## Nodos

| Nodo | Dónde | Estado de Elio | Qué ve la persona |
|---|---|---|---|
| N0 Reposo | saludo | `feliz` → «En espera» | campo vacío, tres sugerencias |
| N1 Escuchando | foco en el campo vacío | `atento` → «Escuchando» | esferas encendidas |
| N2 Escribiendo | texto en el campo | `pensando` → «Pensando» | ola de esferas |
| N3 Trabajando | pregunta enviada | `trabajando` → «Trabajando» | panel de conversación abierto con la pregunta y «Nexa está revisando tu operación…» |
| N4 Respuesta | respuesta recibida | `listo` → «Respuesta lista» | respuesta con «Fuente: …» y acciones |
| N5 Hilo | segunda pregunta en el mismo panel | vuelve a N3 → N4 | placeholder «Sigue la conversación con Nexa…» |
| N6 Pantalla completa | «Abrir en pantalla completa» | — | experiencia conversacional completa con el hilo |
| N7 Menú colapsado | botón colapsar | — | sidebar de íconos con isotipo Efeonce |
| N8 Menú móvil | botón ☰ (< 760 px) | — | secciones del menú bajo la barra fija |

## Transiciones

- N0 → N1: foco en el campo. N1 → N0: blur con el campo vacío.
- N1 → N2: escribir. N2 → N1: borrar todo.
- N0/N1/N2 → N3: Enter o botón enviar con texto; o clic en una sugerencia (la sugerencia se envía como pregunta). El campo se limpia.
- N3 → N4: llega la respuesta de `POST /api/home/nexa`. Error: N4 con la respuesta de error canónica (`actionable` decide si hay «Reintentar»).
- N4 → N5: nueva pregunta en el campo. El hilo se conserva (`threadId`).
- N3/N4/N5 → N0: botón cerrar del panel (el hilo queda persistido; el foco vuelve al campo).
- N4/N5 → N6: «Abrir en pantalla completa» navega a la experiencia conversacional con el `threadId` (sin perder el hilo). Volver desde N6 regresa a la Home en N0.
- Acciones de la respuesta (por ejemplo «Abrir cierre», «Revisar aprobaciones»): enlaces a la ruta canónica del dominio; acciones que escriben pasan por el loop `propose → confirm → execute`, nunca se ejecutan desde la Home.
- N7: toggle persistido en la cookie de settings. N8: toggle local, se cierra al navegar.

## Fallbacks

- Spark sin capas o sin JS: la columna de Elio muestra sólo el halo y la etiqueta «Elio · En espera»; el composer sigue funcionando.
- `member_identity_not_linked` (colaborador): el composer funciona; los bloques del rol muestran el CTA de People Ops sin «Reintentar».
- Sin respuesta en el timeout del runtime: N4 con mensaje canónico y botón «Reintentar» sólo si `actionable`.
- Clima no disponible: la línea muestra sólo la fecha.
- Sin novedades vigentes: la tarjeta no se renderiza.
