# TASK-2085 — «El umbral»: motion de la actividad de agentes

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-2085 — Rooms: pantalla «Actividad de agentes» con reversa`
- Related wireframe: [`TASK-2085-rooms-agent-activity-surface.md`](../wireframes/TASK-2085-rooms-agent-activity-surface.md)
- Related flow: [`TASK-2085-rooms-agent-activity-surface-flow.md`](../flows/TASK-2085-rooms-agent-activity-surface-flow.md)
- Motion type: `orchestrated`
- Primary primitive / library: `CSS` (keyframes y transiciones con tokens de `src/styles/theme.ts`); WAAPI sólo si hace
  falta cancelar una reversa en curso. Sin dependencias nuevas.
- Copy source: `src/lib/copy/rooms.ts` → `AGENT_ACTIVITY_COPY`, `ROOMS_HOME_COPY`
- Fuente aprobada: canvas `https://claude.ai/artifact/DX8VgavaqqZmHYXRbKVjeL`, artboards `Actividad.dc.html`,
  `CrearSala.dc.html` y `ActividadMovil.dc.html` y su nota «Motion — el umbral». Aprobado por el operador el
  2026-10-31 («Bien, aprobadas»).

## Motion Brief

- Primary user: persona interna de Efeonce que revisa lo que hicieron sus agentes.
- Motion intent: que se **vea** qué cruzó al cliente y qué volvió. Una línea vertical separa «tu mesa» de «ya salió de
  tu mesa»; cada acción `release`/`access` cruza esa línea con un hilo.
- Uncertainty reduced: si una acción llegó o no al cliente, y si la reversa realmente la recogió.
- User decision supported: deshacer o no una acción del agente.
- Non-goals: entradas que llegan en vivo, contadores animados, la órbita como loader, desplazamientos al enfocar
  una acción desde el aviso.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Entrada del feed | Primer render de la página o de «Ver más actividad» | Sube 14 px y aparece, 560 ms, `emphasized`, 90 ms entre entradas (tope: las primeras 6) | CSS keyframes con `animation-delay` por índice | Sí |
| Hilo que cruza | Entrada `release`/`access` que llegó | `scaleX` 0 → 1 desde la mesa hasta el punto, 760 ms, `emphasized`, empieza 260 ms después de su entrada | CSS | Sí |
| Gota | Mismo disparo que el hilo | Una gota recorre el hilo una vez y se desvanece al llegar (1100 ms) | CSS | Sí |
| Punto del otro lado | Al terminar el hilo | Escala 0,4 → 1 y aparece, 420 ms, `emphasized` | CSS | Sí |
| Lado del cliente (texto + botón) | Al terminar el hilo | Entra 8 px desde el umbral, 520 ms | CSS | Sí |
| Recoger el hilo | Reversa confirmada | El hilo vuelve a la mesa (`scaleX` 1 → 0), 780 ms, `emphasizedAccelerate`; queda su huella punteada; el punto queda hueco | CSS | Sí |
| Choque en el umbral | Entrada de tope o rechazo | El hilo llega al umbral con rebote 1,03 (900 ms) y aparece un tope ámbar (tope) o rojo (rechazo), 300 ms | CSS | Sí |
| Acción del aviso | `?accion=:actionId` | Anillo que late dos veces (1600 ms, desde 900 ms); sin desplazar la página | CSS | Sí |
| Trabajo en curso | Sala con un agente armando ahora | Una gota recorre una línea de 64 px en bucle (1800 ms) mientras dure | CSS | No (sólo si el reader lo expone) |
| Indicador de filtros | Cambio de filtro | La píldora activa se desliza, 420 ms, `emphasized` | CSS transition | Sí |
| Diálogo de reversa / Crear sala | Abrir | Fondo 260 ms; diálogo sube 16 px y escala 0,98 → 1, 420 ms. Cerrar es corte | AXIS `Dialog` + CSS | Sí |
| Hoja móvil | Abrir en 390 px | Sube desde abajo, 420 ms. Cerrar es corte | CSS | Sí |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Botón de reversa (lado oscuro) | Contorno claro | Fondo claro al 10 % | Anillo `--room` acento 2 px | — | — | «Revirtiendo…», deshabilitado | Éxito: el hilo se recoge y aparece «Revertida por ti · ahora» en `role="status"`; error: mensaje bajo el botón |
| Filtro | Texto tinta | — | Anillo 2 px | — | Píldora sólida que se desliza | — | — |
| «Crear sala» | Sólido | Tono más claro | Anillo 2 px | — | — | «Creando…» | Abre la autoría |
| «Copiar instrucción» | Contorno claro | Fondo claro al 10 % | Anillo 2 px | — | — | — | «Instrucción copiada» + estado |

## Transition Specs

- Curvas: `emphasized` = `cubic-bezier(0.2, 0, 0, 1)` para llegar; `emphasizedAccelerate` = `cubic-bezier(0.3, 0, 0.8, 0.15)` para
  recoger. Ambas se leen de los tokens de movimiento de Rooms, nunca literales en componentes.
- Lento-rápido-lento y un protagonista a la vez: en una entrada primero entra el texto, después el hilo, al final el
  lado del cliente. Nada anima en paralelo dentro de la misma entrada.
- Interrumpir: si una reversa termina mientras su entrada sigue animando su llegada, se salta al estado final y
  recién entonces se recoge el hilo.
- Pestaña oculta: estado final sin animar.

## Primitive & Token Mapping

- Duraciones y curvas: tokens de movimiento de `src/styles/theme.ts` (los mismos de la base de TASK-2079); ningún `ms`
  ni curva literal en `agent-activity.css`.
- Colores: la banda oscura, el umbral y el hilo salen de `--room-*`; tope y rechazo usan los tonos de estado del
  tema, siempre con texto («Tope», «Rechazado»), nunca sólo color.
- `Dialog` de AXIS para reversa y «Crear sala»; su animación por defecto se conserva.

## Reduced Motion Contract

- `prefers-reduced-motion: reduce`: cortes directos. Hilos y puntos aparecen en su estado final; la reversa cambia
  al estado «Revertida» sin recoger; el anillo del aviso es estático; no hay gota en curso ni en el feed.
- El estado final es idéntico con y sin movimiento.

## Accessibility & Feedback

- El movimiento nunca es la única señal: cada estado tiene texto (`Revertida por…`, «No cruzó.», «Esta es la acción del
  aviso»).
- Resultado de la reversa en `role="status"` dentro de la entrada; el foco va a ese texto al terminar.
- El foco no espera a ninguna animación.
- El hilo, la gota y el punto son decorativos (`aria-hidden`).

## Performance Guardrails

- Sólo `transform` y `opacity`; nada que provoque layout.
- Escalonado con tope en las primeras 6 entradas; las siguientes aparecen sin retraso.
- Sin animaciones infinitas fuera de «trabajo en curso», y ésa se detiene con la pestaña oculta.

## GVC / Micro Evidence

- Escenario `rooms-agent-activity` en `/demo/actividad`: grabar llegada del feed, una reversa confirmada (hilo que se
  recoge), entrada de tope, entrada de rechazo y llegada desde `?accion=`.
- Repetir con movimiento reducido y comparar el cuadro final.
- Performance: ningún cuadro > 16 ms durante la llegada del feed en 1440 × 900.

## Design Decision Log

- 2026-10-31 — Concepto «el umbral» aprobado en el canvas. Reemplaza el `Motion: none` del contrato inicial: el
  movimiento es la forma de mostrar qué cruzó al cliente, no adorno.
- 2026-10-31 — La reversa recoge el hilo y deja su huella punteada: nada se borra, coherente con el historial
  append-only.
- 2026-10-31 — Cerrar diálogos es corte, como el iris de TASK-2079: el foco no espera.

## Acceptance Checklist

- [ ] Duraciones y curvas sólo desde tokens.
- [ ] Movimiento reducido con estado final idéntico.
- [ ] Ningún estado comunicado sólo por movimiento o color.
- [ ] Evidencia GVC con y sin movimiento reducido.
