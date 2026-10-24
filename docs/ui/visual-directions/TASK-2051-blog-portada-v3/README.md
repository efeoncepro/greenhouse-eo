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
| `referencias/` | Se crea en el Slice 1 de TASK-2051: una captura PNG por sección, a 1440 y 390, con los datos de ejemplo del diseño. Son la línea base del gate de fidelidad. |

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

Cualquier otra diferencia es un defecto del gate.

## Gate de fidelidad

- Referencias por sección a 1440×900 y 390×844, con los datos de ejemplo del canvas inyectados como fixture.
- Comparación `pixelmatch` (umbral 0,1) contra la página construida con el mismo fixture: ≤ 1 % de píxeles distintos
  por sección; secciones con animación se capturan en el estado final (o con movimiento reducido).
- Hoja lado a lado por sección para aprobación del operador.
- Sin scroll horizontal de página (`scrollWidth === clientWidth`) a 1440, 1024, 390 y 320.

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
