# TASK-2051 — Portada del blog v3 en alta fidelidad — wireframe

> Superficie: `https://efeoncepro.com/blog/` (página WordPress 18456, Elementor + `ohio-child`), sitio público.
> Fuente aprobada: canvas «Portada Blog Efeonce» v67 (`https://claude.ai/artifact/SmmJZC39UTJ9m6PD5x7tui`), copia
> congelada en `docs/ui/visual-directions/TASK-2051-blog-portada-v3/fuente-canvas-2026-10-24.tar.gz`
> (`Portada-v3.dc.html` 1440, `Movil-v3.dc.html` 390, `Botones.dc.html`). Línea gráfica: La órbita + sub-línea Glitch
> sólo dentro del bloque Glitch.

## Visual Direction Contract

- **Fuente de la dirección:** `source-led`. El canvas aprobado es la referencia de aceptación pixel a pixel; no se
  reinterpreta ni se reemplaza por la etapa 1 (`greenhouse_blog_section` de develop), que sólo aporta consultas.
- **Targets:** escritorio 1440×900 (tablero `Portada-v3`, ancho completo, contenedor `.w` de 1360 px con 40 px de
  margen) y teléfono 390×844 (tablero `Movil-v3`, márgenes de 16 px).
- **Jerarquía de acciones:** una sola acción de color por bloque. Slider: enlace de lectura en Bricolage blanco con
  flecha dibujada (lectura) y píldora azul Engine sólo para «Hacer el diagnóstico» (conversión). Glitch: píldora verde
  Glitch que se transforma en formulario. Eventos: píldora turquesa «Reservar mi lugar» que se transforma en
  formulario. Suscripción final: píldora turquesa dentro del campo.
- **Visual fidelity mapping:** el CSS del canvas se copia con sus valores (no se aproxima): paleta navy `#001a33` /
  `#023c70`, papel `#f7f8f6`, tinta suave `#cfe4fa` / `#6d6777`, turquesa `#36c8bf`, Engine `#0375db`, verde Glitch
  `#6ec207`; Bricolage Grotesque (titulares, números) y Poppins (texto y botones); radios de píldora 999 px, tarjetas
  24–40 px; curvas `cubic-bezier(0.2,0,0,1)` y `cubic-bezier(0.34,1.56,0.64,1)`.
- **GVC:** `qualityProfile: premium`; dossier por sección; baseline = capturas del canvas con datos de ejemplo
  (`referencias/`); `scrollWidth === clientWidth` en 1440, 1024, 390 y 320.

## Layout

### Escritorio (1440)

```
┌───────────────────────────── header canónico AXIS (isla de vidrio, 85 px reservados) ─────────────┐
│ 0 SLIDER A SANGRE (900 px)                                                                         │
│   imagen a sangre con paralaje · logo MCM 44 px arriba a la izquierda · contador «0N / 05» arriba  │
│   chip formato (ícono AXIS + formato · tema con rayita de color)                                    │
│   título palabra por palabra: parte liviana + remate 760 (hasta 176 px) · bajada · meta autor      │
│   enlace de lectura con flecha dibujada | píldora Engine (diagnóstico)                              │
│   barras de progreso ×5 con título · pausa/anterior/siguiente · tarjeta «Siguiente» con miniatura  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3 PREGÚNTALE AL BLOG (papel)   título + Spark de investigación a la derecha                         │
│   buscador píldora 84 px con haz de luz al foco · chips de preguntas · resultados en línea (4)      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4 GLITCH (navy oscuro)  logo 72 px + bajada | píldora verde «Suscríbete a Glitch» (morph)           │
│   manzana en bytes con halo verde a la derecha · edición #N titular · Flash + #N-1…#N-3             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4b EVENTOS (blanco)  «En vivo con Efeonce» | «Ver todos los eventos (N)»                            │
│   TARJETA navy 40 px: [chip en vivo · título 76 · bajada · píldoras meta · speakers ×3 ·           │
│     Reservar (morph) + Agregar al calendario · prueba social] | [arte clave + etiqueta]            │
│     FRANJA cuenta regresiva a todo el ancho: «Empieza en · fecha» | días · horas · min · seg 132 px │
│   «Lo que te llevas» 01/02/03 (7fr) | «Agenda · 45 minutos» línea de tiempo (5fr)                   │
│   «Próximos en vivo» entradas ×2 (5fr) | «Grabaciones» ×3 con play (7fr)                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5 RIEL «Para leer con calma» (papel) tarjetas v2 440×600 deslizables · flechas ← → (desvío 14)       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1 ÓRBITA (navy) «Explora por tema / ¿De qué escribimos más?» arco medido por tema + último          │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 6 ARCHIVO (blanco) año sticky 184 px (5fr) | filas fecha · título · tema/formato (7fr) · años píldora│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 7 SUSCRIPCIÓN (navy) cinta «Cada lunes, lo que importa.» 124 px · logo Glitch + bajada | formulario │
└──────────────────────────────── footer canónico ohio-child ───────────────────────────────────────┘
```

### Teléfono (390)

Mismo orden. Slider a 100 svh con swipe; buscador 64 px; Glitch apilado con la píldora a ancho completo; tarjeta del
evento en una columna (información → arte 200 px → franja 2×2 a 84 px → speakers, reserva y prueba social);
aprendizajes y agenda apilados; riel horizontal con scroll-snap y tarjetas de 304×540; años como píldoras con scroll;
cinta a 60 px.

## Content Slots

| Slot | Fuente (TASK-2050) | Notas |
|---|---|---|
| Slides | `EO_Home_Readers::featured` | `light` + `bold`, formato, tema, color de línea, bajada, CTA, autor, minutos, fecha, imagen 2:1 |
| Preguntas sugeridas | registro curado | 4–6 chips |
| Glitch | `glitch` | edición, Flash, 4 números |
| Evento próximo | `events.next` | título, bajada, fecha/zona, duración, modalidad, speakers, aprendizajes, agenda, arte clave, form |
| Próximos / grabaciones | `events.upcoming` / `events.recordings` | 2 / 3 |
| Riel | `rail` + `events.next` | tarjetas v2 (ver «Riel v2» abajo): cuatro lecturas largas o episodios de podcast, recursos `rail` y el próximo evento |
| Temas | `topics` | conteo, porcentaje, último |
| Archivo | `archive` | por año, 12 filas, paginado |

### Riel v2 «Para leer con calma» (desvío 14, canvas versión 93)

En producción desde el 2026-10-24 21:12 UTC. Una sola plantilla de tarjeta para todos los formatos
(`scripts/public-website/blog-v3/lib/rail-v2.cjs`); datos de `EO_Home_Adapter::rail()`. Contrato completo:
[runtime V1 § «Para leer con calma» v2](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md).

| Tarjeta | Cuándo | Centro | Pie |
|---|---|---|---|
| Foto a sangre (navy / azul alternados) | entrada con imagen destacada; guía o herramienta con imagen de escena | la imagen propia de la tarjeta (`_eo_card_image`) o, si no hay, la destacada; recorte al punto focal `_eo_card_focus` (`object-position`, vacío = centro); texto sobre un velo abajo | autor con foto o iniciales, fecha, minutos |
| Cliente (papel) | caso con «Cliente del caso» (`_eo_client`; hoy `anam`) | logo del cliente | autor, fecha, minutos |
| Pregunta (tinta) | recurso `diagnostico` | la pregunta (las dos líneas del slider) | logo de Efeonce AEO, «3 motores de IA» |
| Entrada de webinar | el próximo evento publicado, hasta que termina | día, mes, día de semana y hora en su zona; «Faltan N días» / «Mañana» / «Hoy» / «En vivo ahora» | primer speaker (o «Equipo de Efeonce»), duración |
| Onda de podcast | entrada con formato Podcast (sin mínimo de minutos) | la onda de punta a punta | autor, duración (`_eo_video_duration`) |
| Tipográfica (papel) | entrada sin imagen ni cliente | tema, título y bajada | autor, fecha, minutos |

Copy fijo: botón con el verbo del formato (crece de círculo a píldora al hover); ícono del formato en el color de su
tema; bajada de dos líneas. Las guías de `think.efeoncepro.com` firman con el logo de Efeonce Think; las demás, con el
logo negativo de Efeonce.

| Insignia (una por tarjeta, gana el menor rango) | Dato que la enciende |
|---|---|
| 1 En vivo | reloj del evento |
| 2 Últimos cupos / Lista de espera | reservas de Growth Forms (TASK-2053) — sin lector todavía |
| 3 Más leído · 4 Tendencia | lecturas de GA4 — sin lector todavía |
| 5 Nuevo | publicada hace 14 días o menos |
| 6 Actualizado | «Última revisión» (`_eo_reviewed_at`) de los últimos 30 días en una entrada de más de 60; el pie dice «Actualizado <fecha>» |
| 7 Gratis | recursos y eventos gratis |

Accesibilidad: cada tarjeta es un enlace (`role="listitem"`) con título visible; la imagen de fondo es decorativa
(`alt=""`) y el logo del cliente lleva su nombre como `alt`. Movimiento reducido: sin inclinación, zoom ni destello de
la insignia, la onda queda quieta; sólo cambian luz y color. axe 0 en los tres tableros y desborde 0 px de 320 a 1920
(en vivo, 2026-10-24).

## States

- **Default:** todas las secciones con datos.
- **Loading:** no aplica en servidor; JS sólo realza (sin esqueletos).
- **Empty:** sin evento próximo → la última grabación ocupa la tarjeta; sin eventos ni grabaciones → la sección no se
  pinta; sin Flash → la edición a todo el ancho; tema sin entradas → no aparece; búsqueda sin resultados → mensaje y
  enlace a temas.
- **Error:** formulario con error → estado de error del renderer dentro de la píldora (TASK-2054).
- **Degraded:** sin JS → primera diapositiva fija, búsqueda GET, riel con scroll nativo, fecha absoluta en la franja.
- **Long content:** títulos del slider con `text-wrap: balance` y tamaño por largo; nombres largos de speakers en dos líneas.
- **Reduced motion:** sin autoplay, barrido, paralaje ni haz animado; foco con anillo estático.

## Implementation Mapping

- Widgets `greenhouse_blog_v3_*` en `eo-elementor-widgets/includes/blog-v3/` (uno por sección), render PHP en servidor.
- CSS copiado del canvas a `assets/css/blog-v3.css` con alcance `.gh-blog-v3`; guardas contra el subrayado de Ohio.
- JS vanilla por componente en `assets/js/blog-v3/*.js`, montaje idempotente.
- Botones, segmentado y buscador desde AXIS (TASK-2052) cuando estén publicados; mientras, la copia local del canvas
  con los mismos valores.
- Formularios: `<greenhouse-form>` con la presentación en línea de TASK-2054.

## GVC Scenario Plan

- Scenario: `scripts/public-website/blog-v3/fidelity/blog-v3.scenario.mjs` (Playwright local, Webwright para WordPress).
- Rutas: preview local `127.0.0.1:8842/blog/` con fixture del canvas; luego preview en Kinsta; luego producción.
- Viewports: 1440×900, 1024×768, 390×844, 320×640.
- Capturas por `data-capture`: `blog-hero`, `blog-ask`, `blog-glitch`, `blog-events`, `blog-rail`, `blog-topics`,
  `blog-archive`, `blog-subscribe`.
- Assertions: `pixelmatch` ≤ 1 % por sección contra `referencias/`; `scrollWidth === clientWidth`; un solo H1; foco visible.
- Reduced-motion: corrida con `prefers-reduced-motion: reduce`.
- Dossier: hoja lado a lado canvas | construido por sección en `docs/ui/reviews/TASK-2051-blog-portada-v3/`.

## Design Decision Log

- **Decisión:** implementar el canvas v3 1:1 como widgets de consulta renderizados en servidor.
- **Alternativas:** reutilizar el diseño de la etapa 1 (rechazado por el operador el 2026-10-24); compilador estático
  source-led (no sirve para contenido que viene de consultas); React (fuera de norma en el sitio público).
- **Por qué:** fidelidad exigida por el operador + datos vivos + sin JS pesado.
- **Primitive:** extender AXIS (TASK-2052) para botón con texto que rueda y flecha dibujada, segmentado e indicador,
  buscador con haz; los módulos de página quedan en el plugin.
- **Riesgos abiertos:** rieles laterales de Ohio desde 1181 px; peso del hero; renderer de formularios en línea.
- **Delta 2026-10-24 (tarjetas v2):** el riel v1 del canvas congelado se reemplaza por la plantilla v2 aprobada
  (canvas versión 93) en los tres tableros; las insignias de cupos y lecturas esperan su lector (filtro
  `eo_home_rail_signals`).
  Sub-delta 2026-10-24 (0.4.5): la tarjeta de foto acepta imagen propia y punto focal, para portadas con texto
  incrustado (Manzanitas); la destacada sigue siendo la OG. Un solo foco «84% 30%» sirve en los tres tableros para una
  cara a ≈71 % de la placa.
