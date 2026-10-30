# TASK-2079 — Rooms: base visual La órbita y primitivas de motion

Diseño de implementación, 2026-10-30. Fuente: canvas «Efeonce Rooms — UI», aprobado entero por el operador
el 2026-10-29 (artifact `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`) y registrado en
[la dirección visual de Rooms](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md#aprobación-2026-10-29--canvas-la-sala-es-una-órbita).
Esta task no construye pantallas de comprador: construye las piezas que todas las pantallas del canvas
comparten y un laboratorio sintético para verlas y capturarlas. Runtime: repo `efeonce-rooms`.

## Visual Direction Contract

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- Source durable: sección «Aprobación 2026-10-29» de ese documento + canvas aprobado (archivos `Main`,
  `Invitacion`, `InvitacionMovil`, `Audiencia` y `Consola` del artifact, que son los que usan cada primitiva).
- Quality profile: `premium`.

## Superficie: laboratorio `/demo/base`

Ruta sintética dentro de `/demo` (ya marcada como demostración, sin datos reales ni sesión). Sirve para
desarrollar, revisar y capturar las primitivas aisladas antes de que la sala las use. No se enlaza desde la
experiencia del comprador. Cada región lleva su `data-capture`.

1. **Encabezado** — lockup oficial Efeonce | Rooms (`rooms-lockup` de `@efeoncepro/axis-brand-assets`, 193 px
   de ancho en escritorio, con aire a ambos lados) y la etiqueta de demostración existente.
2. **Órbita canónica** (`data-capture="orbit-canonical"`) — fondo `dark`, órbita de radio 330 centrada con su
   halo, y la palabra «Entra.» en Bricolage 196 px dentro del anillo, como en la invitación aprobada.
   Botón «Volver a dibujar» repite la secuencia de dibujo.
3. **Órbita que mide** (`data-capture="orbit-measure"`) — la misma órbita con el arco proporcional a una
   fracción real (control segmentado 0/5 … 5/5) y la esfera en la punta. Muestra la regla: el arco mide un
   dato; sin dato no hay arco, solo anillo.
4. **Estaciones** (`data-capture="orbit-stations"`) — cinco estaciones sobre el anillo en los ángulos
   −90° + 72°·k, numeradas 01–05, con la actual marcada por la esfera.
5. **Cámara** (`data-capture="camera-world"`) — mundo 2D con cinco placas sintéticas en radio 1700
   (posiciones del canvas: `[0,-1700]`, `[1616.8,-525.3]`, `[999.2,1375.3]`, `[-999.2,1375.3]`, `[-1616.8,-525.3]`),
   botones 01–05 y «Mapa». Cambiar de placa ejecuta el salto orbital; «Mapa» aleja la cámara a escala 0,18.
6. **Iris** (`data-capture="iris"`) — una mini órbita de esquina; «Abrir» hace nacer el iris desde la esfera
   y descubre una placa a pantalla completa; «Cerrar» lo devuelve.
7. **Fondo** (`data-capture="depth-grain"`) — dos capas de parallax (órbita ±7 px, texto ±14 px según el
   puntero) y grano `feTurbulence` estático sobre `dark`.
8. **Preferencias** — un aviso visible cuando el navegador pide movimiento reducido: «Movimiento reducido
   activo: los cambios son directos».

## Desktop Target

1440×900. Una sola columna de regiones a ancho completo, cada una de 900 px de alto para que se capture
como un viewport. Fondo `dark` (#001a33) en las regiones 2–7; texto `paper`; lockup arriba a la izquierda con
22 px de margen superior. La órbita de la región 2 ocupa ~73 % del lado corto (radio 330 sobre 900), centrada en
(720, 400) como en el canvas. Ningún texto cruza el anillo; «Entra.» queda dentro con aire.

## Mobile Target

390×844. Mismas regiones apiladas. La órbita de la región 2 baja a radio 140 y «Entra.» a 84 px (valores de
`InvitacionMovil`). La cámara usa el mismo mundo con escala inicial menor para que la placa quepa con 16 px de
margen; los botones 01–05 pasan a una fila desplazable propia, nunca a scroll horizontal de la página.
Parallax por puntero se desactiva en táctil; el grano se mantiene.

## Action Hierarchy

Es un laboratorio: no hay acción primaria de negocio. Por región, un solo control principal (Volver a dibujar,
segmentado de fracción, 01–05 + Mapa, Abrir/Cerrar). Todos son botones nativos con texto visible; ninguno
depende del hover.

## Visual Fidelity Mapping

| Elemento del canvas | Fuente en código | Regla |
|---|---|---|
| Colores ground, halo, teal, navy, paper | `efeonceGraphicLine.color` de `@efeoncepro/axis-tokens@0.6.10` | Nunca hex literal en componentes; el adapter `src/styles/theme.ts` los expone como `--room-*` |
| Anillo, arco, esfera | `efeonceGraphicLine.orbit` (`ringStrokePx`, `ringOpacity`, `arcStrokePx`, `arcSweepDeg.withSphere`, `sphereRadiusPx`) escalados por `baseWidthPx` | Arco de 50° entre 200° y 250°; esfera en la punta |
| Halo | `orbit.halo` (0,13 → 0,03 al 60 % → 0) y `orbit.haloRadiusRatio` (1,86) | `radialGradient` SVG `gradientUnits="userSpaceOnUse"`, color `halo`, sobre `dark` |
| Curvas | `axisMotion.ease.emphasized` / `standard` / `emphasizedAccelerate`, mapeados por `efeonceGraphicLine.motion.curves` (arrive, transform, exit) | Ninguna curva literal en componentes |
| Overshoot de la esfera | `efeonceGraphicLine.motion.overshoot.sphereBirth` | Solo al nacer la esfera |
| Tiempos de dibujo | anillo 0–500 ms, arco 400–1400, esfera 1400–1700, halo 1200–2000 (canvas aprobado) | Constantes nombradas en un único módulo de motion |
| Tipografía | `efeonceGraphicLine.type.answer.family` (Bricolage) y `type.text.family` (Poppins), fuentes ya instaladas | Sin fallback silencioso a Geist |
| Lockup | `rooms-lockup` de `@efeoncepro/axis-brand-assets` vía `scripts/sync-brand.mjs` | Nunca recreado ni animado |

## Copy Ledger

Todo texto nuevo vive en `../efeonce-rooms/src/lib/copy/rooms.ts`, namespace `lab` (es-CL, tuteo):

| Id | Texto |
|---|---|
| `lab.title` | Base visual de Rooms |
| `lab.redraw` | Volver a dibujar |
| `lab.measure` | Recorrido medido |
| `lab.measureEmpty` | Sin datos de recorrido |
| `lab.stations` | Capítulos |
| `lab.map` | Mapa |
| `lab.chapter` | Capítulo {n} |
| `lab.irisOpen` | Abrir |
| `lab.irisClose` | Cerrar |
| `lab.reducedMotion` | Movimiento reducido activo: los cambios son directos |
| `lab.synthetic` | Demostración con datos ficticios |

La palabra «Entra.» en la región 2 se toma de la copy de invitación existente (`invitations.ts`) si ya existe;
si no, se agrega allí con id `invitations.hero` para que TASK-2068 la reutilice.

## State Copy

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | Regiones completas; etiqueta «Demostración con datos ficticios» | Todas las primitivas responden a sus controles |
| loading | Sin texto de espera: las regiones son SSR y no piden datos | Las fuentes cargan con `font-display: swap`; la captura espera fuentes |
| empty | En «Órbita que mide» con fracción 0: «Sin datos de recorrido» y solo el anillo | Elegir otra fracción dibuja el arco |
| partial | Navegador sin `startViewTransition`/WAAPI completo: las primitivas cortan directo, sin aviso | Mismo resultado final de estado y foco |
| error | El laboratorio no hace fetch; un error de render cae en el `error.tsx` existente de la app | «Reintentar» recarga la ruta |
| denied | No aplica acceso: ruta pública sintética. En producción `/demo` sigue sus reglas actuales de demostración | Si `/demo` está deshabilitada, responde el `not-found.tsx` existente |

## Accessibility Contract

- Cada SVG decorativo lleva `aria-hidden="true"`. La órbita que mide expone el dato como texto
  («Capítulo 3 de 5») en un elemento visible o `sr-only`, nunca solo con el arco.
- Las estaciones son botones con nombre «Capítulo 01» … y `aria-current="step"` en la actual.
- Tras el salto orbital, el foco pasa al título de la placa destino; «Mapa» lleva el foco a la estación actual.
- El iris es un `dialog` nativo: Escape cierra, el foco vuelve al botón «Abrir».
- `prefers-reduced-motion: reduce` = cortes directos en dibujo, salto, mapa, iris y parallax (el grano queda).
- Contraste: texto `paper` sobre `dark` ≥ 7:1; el acento teal nunca en texto menor de 24 px.
- Objetivos táctiles ≥ 44 px en móvil; foco visible con `--room-outline`.

## Implementation Mapping

| Pieza | Archivo candidato en `efeonce-rooms` | Notas |
|---|---|---|
| Adapter de La órbita | `src/styles/theme.ts` (extender) | Agrega `--room-ground`, `--room-halo`, `--room-ease-arrive/transform/exit`, `--room-overshoot-sphere` desde AXIS |
| Geometría de órbita | `src/domain/orbit-geometry.ts` | Funciones puras: punto en ángulo, arco SVG por fracción, posiciones de estaciones, escala de halo. Browser-safe, con tests |
| `Orbit` | `src/components/orbit/orbit.tsx` | Props `radius`, `measure?: {value, total}`, `draw?: 'once' \| 'static'`, `stations?`, `current?` |
| `OrbitHalo` | `src/components/orbit/orbit-halo.tsx` | `radialGradient` userSpaceOnUse con id único por instancia |
| `CameraWorld` | `src/components/orbit/camera-world.tsx` | Transform `translate(cx) scale(s) translate(-x,-y)`; salto en dos fases con WAAPI; modo mapa |
| `IrisReveal` | `src/components/orbit/iris-reveal.tsx` | `clip-path: circle()` desde la posición de la esfera sobre `<dialog>` |
| `DepthLayers` + `Grain` | `src/components/orbit/depth.tsx` | Parallax por puntero con rAF; grano SVG estático |
| Motion | `src/components/orbit/motion.ts` | Constantes de tiempos y hook `useReducedMotion` |
| Laboratorio | `src/app/demo/base/page.tsx` | Server component con islas cliente mínimas |
| Copy | `src/lib/copy/rooms.ts` | Namespace `lab` |

Datos: ninguno. Commands/readers: ninguno. Acceso: el de `/demo`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/rooms-orbit-foundation.scenario.ts` (Greenhouse), contra
  `AGENT_AUTH_BASE_URL=http://127.0.0.1:3210`, ruta `/demo/base`, autenticación anónima, no mutante.
- Complemento automatizado: `../efeonce-rooms/tests/orbit-foundation.spec.ts` (Playwright) y
  `../efeonce-rooms/tests/orbit-geometry.test.ts` (unitario).
- Viewports: desktop 1440×900, mobile 390×844 y compacto 320×740.
- Quality profile: premium
- Required steps: esperar fuentes; volver a dibujar; fijar fracción 3/5; saltar 01→03; abrir mapa; abrir y
  cerrar iris; repetir con movimiento reducido.
- Required captures: una por región en cada viewport, más el fotograma final del salto y del mapa.
- Required `data-capture` markers: `orbit-canonical`, `orbit-measure`, `orbit-stations`, `camera-world`, `iris`, `depth-grain`.
- Assertions: fuente calculada Bricolage/Poppins; el halo es un `radialGradient` con `gradientUnits="userSpaceOnUse"`
  y radio 1,86× el anillo; el arco canónico abarca 200°–250°; ningún texto intersecta el anillo.
- Scroll-width checks: `scrollWidth <= clientWidth` en todos los viewports y estados.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`; foco en el título destino tras el salto y en «Abrir» tras cerrar el iris.
- Review dossier: `docs/ui/reviews/TASK-2079-rooms-orbit-foundation/`.
- Baseline decision / surface ID: `rooms.orbit-foundation`; primera captura candidata hasta revisión humana.

## Design Decision Log

- 2026-10-30 — Primitivas propias de Rooms, no de AXIS: son composiciones de dominio; se promueven a AXIS
  solo si otro consumidor las necesita (regla de la dirección visual §5).
- 2026-10-30 — CSS + Web Animations API + View Transitions de React 19 ya presentes; sin GSAP ni librería de
  animación nueva. Alternativa considerada: Motion (framer); descartada por peso y porque el salto se
  expresa con dos keyframes.
- 2026-10-30 — La órbita se dibuja una vez y queda quieta; no existe variante de loader. Corrección del
  operador en la ronda del canvas.
- 2026-10-30 — Halo solo con el token de AXIS en SVG; descartado `radial-gradient` CSS («no se siente halo»).
- 2026-10-30 — Fondo con parallax y grano; descartadas imágenes flotantes o desenfocadas.
- Riesgo abierto: rendimiento del grano `feTurbulence` en móviles de gama baja; si supera 16 ms por cuadro se
  reemplaza por una textura WebP pregenerada del mismo patrón.
