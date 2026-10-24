# Portada del blog v3 — fuente aprobada para implementar en alta fidelidad

> Dirección visual aprobada por el operador el 2026-10-24 en el canvas «Portada Blog Efeonce»
> (`https://claude.ai/artifact/SmmJZC39UTJ9m6PD5x7tui`, versión 67, página «v3 · alto impacto»).
> Instrucción del operador: «el diseño que quiero es el que tú hiciste, no otro, necesito fidelidad, alta fidelidad».
> Tasks que la consumen: TASK-2050 (modelo de contenido), TASK-2051 (portada), TASK-2052 (primitives AXIS),
> TASK-2053/TASK-2054 (formularios en línea).

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `fuente-canvas-2026-10-24.tar.gz` | Copia congelada de los tableros: `Portada-v3.dc.html` (escritorio 1440), `Movil-v3.dc.html` (390), `Botones.dc.html` (sistema de botones y estados), `Arquitectura.dc.html` (mecánica WordPress) y `canvas.json`. Empaquetado para que Tailwind no escanee el marcado (ver `reference_tailwind_scans_markdown`). |
| `referencias/` | Línea base del gate (TASK-2051, 2026-10-24): un PNG por sección del tablero de escritorio (8, a 1440), de tablet (8, a 820) y del móvil (9, a 390, incluida la cabecera con el logo MCM), con los datos de ejemplo del diseño y el reloj congelado el 24 oct 2026 12:00 UTC. `capture.json` dice cómo y cuándo se capturó. |

Para abrir la fuente: `tar -xzf fuente-canvas-2026-10-24.tar.gz -C <carpeta temporal>` (nunca dentro de `src/`).

## Regla de fidelidad

El canvas es la fuente de verdad visual: estructura, valores CSS (tamaños, colores, espaciados, radios, sombras,
curvas y duraciones de animación), tipografía (Bricolage Grotesque + Poppins) e interacciones. De lo existente en
el sitio sólo se reutiliza infraestructura (consultas, formularios, despliegue, header y footer canónicos).

**Desvíos permitidos (lista cerrada):**

1. Header y footer canónicos del sitio en lugar de la isla de navegación y del pie de la maqueta
   (`EO_SITE_NAV_EXCLUDED_PAGES` se vacía para 18456; el pie es el de `ohio-child`).
2. Datos reales de WordPress en lugar de los datos de ejemplo de `renderVals()`.
3. Accesibilidad invisible: quitar `aria-live` del año de 184 px y del contador por segundo; el contador
   del carrusel no anuncia en autoplay; movimiento reducido sin autoplay, barrido ni paralaje.
4. Comportamiento sin JavaScript de cada componente (primera diapositiva servida, búsqueda GET, scroll-snap, fecha
   absoluta en la cuenta regresiva).
5. Raíz fluida del tablero móvil: el canvas fijaba la mesa de trabajo en `390 × 6400 px` con `overflow: hidden`,
   que recortaba todo lo que pasaba de 6400 px (el contenido mide unos 8 560 px desde que se sumaron los eventos).
   La raíz toma el ancho de la ventana y su alto natural; a 390 px el resultado es el mismo píxel a píxel.
6. Isla de navegación del móvil → espaciador vacío de 56 px: el header canónico es una barra fija de 72 px sobre la
   página y la isla de la maqueta marcaba ese lugar; sin el espaciador el logo MCM quedaba debajo de la barra.
7. Bajo 390 px (sin diseño en el canvas) la órbita de temas del móvil escala al ancho disponible con las mismas
   proporciones; sin eso había 14 px de scroll horizontal a 360 y 54 px a 320.
8. Un solo H1 por página: `eo-blog-home` pone el H1 «Marketing con Manzanitas, el blog de Efeonce» fuera de los
   tableros; el H1 de lector de pantalla de escritorio/tablet se retira y el del logo móvil pasa a un bloque con
   las mismas métricas del H1 del navegador (mismos píxeles). El `alt` del logo móvil queda vacío (el H1 ya lo dice).
9. La lógica busca sus propios botones dentro de su tablero (`this.__root`), no en todo el documento: con tres
   tableros en la página, `document.querySelector` podía devolver el botón de un tablero oculto.
10. Rendimiento sin cambio de píxeles: imágenes bajo el hero con `loading="lazy"`, CSS por tablero con su media
    query, sólo se descarga la lógica del tablero visible y la primera diapositiva se precarga con prioridad alta.
11. Contenido real (operador, 2026-10-24, visto en vivo): una entrada sin imagen propia del slider (`_eo_hero_image`)
    lleva un velo de lectura del lado del texto y la bajada se corta en dos líneas; el formato **Novedad** lleva un
    megáfono en el chip con el trazo de los cinco glifos del canvas.
12. Foto del autor (operador, 2026-10-24): el círculo muestra la foto de perfil subida en WordPress
    (`get_avatar_url`); sin foto, las iniciales del canvas. Un Gravatar de respaldo no la reemplaza.
13. Suscripción real a Glitch (operador, 2026-10-24): con un Growth Form publicado (`inline_pill`, opción
    `eo_blog_glitch_form_key`) la píldora del canvas es el renderer real dentro de `<greenhouse-form data-dc-keep>`
    (TASK-2054: los cinco estados ≤ 1 % del canvas) y **la suscripción del final también usa esa píldora** en lugar
    del campo con casilla del canvas, porque el consentimiento es el aviso bajo la píldora (consentimiento aprobado por
    el operador; la píldora en el pie, pendiente de su visto bueno visual). Antes de que cargue el renderer, un enlace
    con la forma de la píldora en reposo y el aviso reservando su lugar: el gate sin JavaScript da 0,016 / 0,027 /
    0,061 % en la sección Glitch; las tres secciones del pie difieren por este desvío.
    Datos reales sin formulario publicado no muestran suscripción: nunca un «¡Listo!» simulado.
14. Tarjetas v2 de «Para leer con calma» (operador, 2026-10-24, canvas versión 93; sección «Tarjetas v2» abajo): el
    riel v1 del canvas congelado se reemplaza por la plantilla v2 en los tres tableros (`lib/rail-v2.cjs`, aplicada a
    la referencia y a la plantilla ligada). Ajuste propio: el riel arranca alineado con el título (`scroll-padding`),
    porque el snap dejaba la primera tarjeta pegada al borde.

## Tablero de tablet (768–1099 px), 2026-10-24

Pedido por el operador («diseña uno de tablet»). Es el tablero de escritorio recompuesto con su propia capa de
composición (`scripts/public-website/blog-v3/make-tablet.cjs`), generado desde el canvas congelado: mismos
componentes, mismo contrato de datos (`portada`) y misma lógica. Referencia a 820 px (iPad vertical), fluido de 768
a 1099. Publicado como tablero «v3 · tablet 820 (768–1099)» del canvas (versión 68). Escritorio desde 1100 px,
móvil bajo 768.

Cualquier otra diferencia es un defecto del gate.

## Gate de fidelidad

- Referencias por sección a 1440×900 y 390×844, con los datos de ejemplo del canvas inyectados como fixture.
- Comparación `pixelmatch` (umbral 0,1) contra la página construida con el mismo fixture: ≤ 1 % de píxeles distintos
  por sección; secciones con animación se capturan en el estado final (o con movimiento reducido).
- Hoja lado a lado por sección para aprobación del operador.
- Sin scroll horizontal de página (`scrollWidth === clientWidth`) a 1440, 1024, 390 y 320.

### Cómo se generan y se comparan (código en `scripts/public-website/blog-v3/`)

1. `node bind-canvas.cjs` aplica los desvíos de la lista a cada tablero (`*.reference.dc.html`) y convierte cada
   dato en una consulta (`*.bound.dc.html`). Cada reemplazo declara cuántas veces debe calzar: si el canvas cambia,
   falla en vez de enlazar lo que no es.
2. `node build-fixture.cjs` escribe `fixture.json` y `fixture.mobile.json`: los datos de ejemplo del canvas con la
   forma del contrato de datos (los literales se leen del canvas, no se retipean).
3. `node test-bound-equivalence.cjs`: la plantilla enlazada con el fixture rinde el mismo HTML que el canvas
   (escritorio y móvil).
4. `node fidelity/capture.cjs reference <dir>` captura las referencias con el runtime de producción
   (`dc-runtime.js`); `capture.cjs bound <dir>` hace lo mismo con la plantilla enlazada y `capture.cjs url <dir> <url>
   <tablero>` con una página real (preview local o WordPress).
5. `node fidelity/compare.cjs <referencias> <candidata>` aplica el presupuesto de 1 % por sección y deja un
   `*.diff.png` por sección distinta. Autocomprobación del 2026-10-24: plantilla enlazada contra referencias,
   17/17 secciones con 0,000 %.

Contra WordPress: `node build-plugin.cjs` (emite el plugin `eo-blog-home`), `node test-php-parity.cjs`
(PHP = navegador, byte a byte), `node preview/serve.cjs --now 1792843200000` (la portada dentro del shell real del
sitio) y `node fidelity/capture.cjs url <dir> http://127.0.0.1:8844/blog/`. Resultado del 2026-10-24: 17/17
secciones, máximo 0,061 %. Accesibilidad: `node fidelity/a11y.cjs` (axe WCAG 2.2 AA), 0 violaciones.

Las referencias se renderizan con el runtime de plantilla propio de la implementación, no con el del editor del
canvas: el HTML que produce es el del canvas (prueba 3), y las capturas se miraron contra el canvas publicado.

## Secciones (orden del canvas)

| # | Sección | `data-capture` | Tablero |
|---|---|---|---|
| 0 | Slider de destacados a sangre | `blog-hero` | Portada-v3 / Movil-v3 |
| 3 | Pregúntale al blog (con el Spark de investigación) | `blog-ask` | |
| 4 | Glitch (manzana en bytes, edición, Flash, números) | `blog-glitch` | |
| 4b | Eventos y webinars (tarjeta, franja de cuenta regresiva, aprendizajes, agenda, próximos, grabaciones) | `blog-events` | |
| 5 | Riel «Para leer con calma» | `blog-rail` | |
| 1 | Órbita: «¿De qué escribimos más?» | `blog-topics` | |
| 6 | Archivo por año | `blog-archive` | |
| 7 | Suscripción con cinta | `blog-subscribe` | |

## Assets del canvas

Los archivos del tablero viven en el almacén del artifact (`/_blob/<id>`); se bajan uno a uno con la acción `read` y
`path: <id>` del Artifact tool. Los tres banners generados tienen original en
`ai-generations/2026-10-23_blog-portada-slider/` (aprobación del banner registrada en su `LEEME.md`). Los logos
(Efeonce, Marketing con Manzanitas, Glitch, Efeonce | AEO) y la manzana en bytes salen de
`@efeoncepro/axis-brand-assets`, nunca de la copia del canvas.

| Id | Uso |
|---|---|
| `b4f0e8d5dd361bfdaf43f374127e6a3d` | Banner slide Artículo AEO; arte clave del webinar |
| `c51f735ac8da11e60e7d2a3910f3a2f4` | Banner slide Caso ANAM |
| `f1872cd1d2334e4e068af43417c8e7da` | Banner slide Guía Web agéntica |
| `e18bd95fe68de6304a5e2a68e812ad76` | Banner slide Diagnóstico AEO |
| `33dc1a87a32a63829c382857a0d9d447` | Manzana en bytes (Glitch) |
| `2def96f284c302de0cf9fa4736ed9d18` | Spark de investigación (Pregúntale al blog) |
| `6df0bc7136b84a33b200e945547f2e70`, `b240f9523d748a366da99472363a013e`, `789427719a5fd6bb63192d2bf8fa6b0c`, `7f17337ab8e6c9baf70d329ea96d2f0d`, `b1ee1f16ad17b468191f98d5df5c470b`, `09e1fa297b26d74282b37194b22e45f4` | Arcos `measureSvg` por tema (AEO, HubSpot, IA, Diseño, Loop, Growth); en producción se calculan con el dato real |
| `e1f82c1eca25a5e8320cc2d21fe13ab2`, `1b53978e6c9580c5c04cfd4b1bbf4392`, `63ee6a642d507c74c0ab82f6bc49a131` | Artes de tarjetas del riel (CRM, Diseño, portada de guía) |
| `1063184040c6121be1f86602803b0f55` | Logo Glitch monocromo navy (derivado de `glitch-logo-positive.svg`) |
| `72025ed97a7ce0c610ec355f78efed74`, `83245a45d586a61636aa1ac2deff2ab6`, `eb05ce3c01b77fd65e104a791d93784b`, `fa4c472324f79c4861f97234d274662a` | Logos (Glitch negativo, Efeonce positivo, MCM negativo, Efeonce AEO) |

## Tarjetas v2 de «Para leer con calma» — EN PRODUCCIÓN (2026-10-24, canvas versión 93)

Pedido del operador: mantener la grilla mezclada (artículo, caso, guía, diagnóstico, webinar y podcast como una sola
familia) y subirle el nivel a cada tarjeta con autor, fecha, tema e imagen. Página «Para leer con calma · v2 (tarjetas)»
del canvas: hoja de la familia (1920, con una fila en estado hover) y la sección a 1440 y 390. Generador y tableros en
`tarjetas-v2-2026-10-24.tar.gz` (empaquetado porque Tailwind escanea el repo); capturas en `referencias/tarjetas-v2-familia.jpg` y `referencias/tarjetas-v2-hover.jpg`.

- **Anatomía común:** ícono del formato en el color de su tema (reemplaza el guion), título, bajada de dos líneas y un pie
  con filete: quién y cuándo a la izquierda (foto del autor o la marca), la cifra del formato a la derecha.
- **Centro con un solo dato que diga algo:** foto a sangre completa cuando la portada es buena; logo del cliente en el caso
  (ANAM); fecha de calendario en el webinar, diseñado como entrada con corte y «Faltan N días»; la pregunta en el
  diagnóstico; la onda de punta a punta en el podcast. El tiempo de lectura siempre va en el pie.
- **Guía:** imagen de escena real a sangre y firma de Efeonce Think.
- **Hover líquido:** una luz del color del tema sigue al cursor y enciende el borde donde pasa; la tarjeta se inclina hacia
  el cursor y sube con curva suave; el botón crece de círculo a píldora con el verbo del formato; el ícono se llena desde
  el centro; la onda del podcast viaja como audio con una franja de reproducción. Movimiento reducido: sólo luz y color.
- **Lecciones del canvas:** el canvas descarta la hoja `<style>` interna de los SVG (usar colores como atributos) y las
  variables CSS en estilos en línea (usar reglas CSS).
- **Badges (una por tarjeta, sobre el título; ES/EN):** cápsula sólida con brillo y destello, ícono relleno de dos tonos.
  Prioridad cuando aplican varias: «En vivo»/Live (evento en curso) › «Últimos cupos»/Last seats y «Lista de espera»/Waitlist
  (conteo de reservas de Growth Forms, TASK-2053) › «Más leído»/Most read (GA4, top 3 de 30 días) › «Tendencia»/Trending
  (GA4, alza semanal fuerte) › «Nuevo»/New (publicado hace ≤14 días) › «Actualizado»/Updated (campo «última revisión» que
  marca el editor, nunca la fecha de modificación de WordPress; la fecha va en el pie: «Actualizado 20 oct 2026») ›
  «Gratis»/Free (tipo de recurso). Sin dato confiable, no hay badge.
- Webinar y podcast son ejemplos de formato. Aprobada por el operador el 2026-10-24 («Sí, hazlo... y queda aprobado»);
  implementación en TASK-2051.
- **En producción desde 2026-10-24 21:12 UTC** (runtime `9fec02d`, desvío 14): plantilla, CSS, fixture y hover en
  `scripts/public-website/blog-v3/lib/rail-v2.cjs`; datos en `EO_Home_Adapter::rail()`. Webinar y podcast tienen
  soporte desde ya: el próximo evento publicado entra al riel como entrada y una entrada con formato Podcast como onda.
  «Últimos cupos», «Lista de espera», «Más leído» y «Tendencia» esperan su lector (filtro `eo_home_rail_signals`).
