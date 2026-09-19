# Berel — Colores de Temporada 2027: arquitectura sin canibalización, research y artículo N61 — Auditoría 2026-09-16

## Estado

- Tipo: auditoría de cliente — decisión de arquitectura, research SEO/AEO y producción del artículo del ciclo anual.
- Cliente: **Berel** (`berel.com`). Efeonce produce el contenido; Berel publica vía su proveedor web.
- Fecha: 2026-09-16 · Versión 1.0.
- Resultado: página del Content Hub **Colores de Temporada Berel 2027** creada con research, plan editorial y SEO,
  artículo vigente, fichas N1–N4 y notas internas; tarea **Artículo N61** en `Produccion Creativa - Septiembre 26`.
  Estados: Content Hub `En revisión`, tarea `Listo para revisión`, publicación planificada **2026-09-29**.
- No acredita: aprobación de Berel, carga en Drupal, publicación, indexación ni producción de banners.
- Documentos hermanos: [Color del Año 2027](BEREL_COLOR_DEL_ANO_2027_2026-08-25.md) ·
  [Arquitectura de autoridad](BEREL_ARQUITECTURA_AUTORIDAD_2026-08-25.md) ·
  [Cobertura editorial](BEREL_EDITORIAL_COVERAGE_2026-09-02.md).
- Convención de evidencia: **MEDIDO** (Search Console), **ESTIMADO** (Semrush), **OBSERVADO** (HTML en vivo,
  Notion, Canva), **INFERIDO** (deducción declarada). Caduca: revalidar antes de reutilizar cifras.

## 1. Pedido y decisiones del operador

1. Lanzar **Colores de Temporada 2027** sin canibalizar la página actual `/articulos/colores-de-temporada`, que
   pasa a leerse como el ciclo 2026.
2. La arquitectura objetivo es la **opción A** (pillar atemporal + páginas por año), pero el layout de pillar
   page **no está construido** en Drupal/Next.js. Decisión: **camino 2** — publicar ahora una página propia del
   ciclo 2027 en la plantilla de artículo; la migración a pillar queda para cuando exista el layout.
3. **Al lanzar se presentan las cuatro paletas completas; aprobado por Berel** (operador, 2026-09-16). Esto
   supera la regla del plan de Raíces de la piel de no desarrollar paletas antes de su lanzamiento.
4. La página del Content Hub la ve el cliente: **sin pendientes en research ni plan**. Las notas internas van en
   un desplegable aparte (`🗒️ Notas internas de producción`), nunca dentro del cuerpo del artículo.
5. Slot creado por Efeonce: **N61** (último número usado: N60, Raíces de la piel, también en septiembre).
6. No se consultó Teams por instrucción del operador.

## 2. Material oficial 2027 (OBSERVADO)

Fuente: presentación Canva *Paletas de Color Berel 2027* (11 láminas), enlazada desde la Wiki de Berel ›
`🌈 Color del año 2027` (`3d539c2fefe7800188f6f47d30979372`). Coincide al 100% con las cuatro fichas del Content Hub.

| Paleta | Inspiración | Expertos | Temporalidad | Colores (todas incluyen Bien y de Buenas 1-3404D) |
|---|---|---|---|---|
| Raíces de la piel | Convivencia entre humanidad y naturaleza | Gabriela Guajardo, fotógrafa · Armando Martínez, arquitecto | oct–dic 2026 | Coyotito 301N · Agradecimiento 4-0309D · Bella Venus 1-0609D · Sendero al Río 1-1102P · Ruiseñor 1-2902P |
| Umbral Vivo | Conexiones humanas y tecnología | Indira Sánchez, educación/arte · Juan Rubio, líder de marketing | ene–mar 2027 | Ximena 1-3505D · Ultravioleta 3-3703T · Conciencia 1-3301P · Paradisíaco 3-2002P · Fusión 4-1104D |
| Algarabía Folclórica | Diversidad cultural mexicana | Selene Velázquez, arquitecta · Angélica Rubio, diseñadora gráfica | abr–jun 2027 | Esquite 2-0904T · Violeta Armoniosa 434N · Labios de Menta 422N · Calabaza en Tacha 2-1705D · Cardenal 335N |
| Esencia del mañana | Urbanismo con visión de futuro | Alejandro Guerrero “Chanate”, muralista · Andrés Lhima, diseño industrial | jul–sep 2027 | Me lo Dijo un Pajarito 2-0502P · Tallo Seco 1-0908T · Vientos de Cambio 4-1503T · Salsa Martajada 4-0704D · Conejo Pardo 4-2204T |

- El texto de inspiración del Canva tiene erratas (`TONOES`, `VERDESQUE`, `ALAGRABÍA`, `REORODUCIRLO`): se usa
  para el concepto, no se cita literal.
- La lámina 2 conserva una nota superpuesta ajena al contenido («2 es para instalar en CEDIS, 1 para planta»). No
  se usa.
- El Canva no trae roles cromáticos, combinaciones, producto, acabados, bios ni fecha pública. Algunas muestras
  cargan lento en el visor: esperar el render antes de leer los chips.

## 3. Arquitectura y reglas de complementariedad

La [especificación técnica de la pillar](https://app.notion.com/p/3dc39c2fefe78105a164f8d508169d53) (Wiki ›
Colores Berel, v1.4, 2026-09-15) conserva `/articulos/colores-de-temporada` como canonical de la pillar y modela
cada ciclo como bloque interno. La página 2027 del camino 2 es un nodo del ciclo que, cuando exista el layout,
se integra al bloque 2027 de la pillar (o se consolida con 301 decidido en ese momento).

| URL | Búsquedas que atiende | No persigue |
|---|---|---|
| `/articulos/colores-de-temporada-2027` (nueva) | colores de temporada 2027 · paletas de color 2027 · tendencias/moda 2027 para casa · mes o trimestre de 2027 | la genérica sin año · catálogo/paleta de colores Berel · color del año 2027 como consulta principal |
| `/articulos/colores-de-temporada` (ciclo 2026, sin cambios) | colores de temporada · colores de temporada 2026 · Pitaya | nada con 2027 |
| `/articulos/color-berel-2027` (29 sep) | color del año 2027 · Bien y de Buenas | detalle de paletas |
| artículos por paleta | nombre de cada paleta | comparar las cuatro |
| `/colores` | catálogo · paleta de colores Berel (pdf) | — |

Reglas: año al inicio de title/H1/slug/ALT/schema; cero párrafos, tablas o FAQ reutilizados de la página 2026;
anclas sin año → página 2026 y anclas con 2027 → página nueva; la entidad anual (Bien y de Buenas) vive en una sola
URL; canonical propio en cada página; revisión de reparto de consultas a los 28 y 90 días de indexación.

## 4. Demanda — Semrush base México (ESTIMADO, 2026-09-16)

| Consulta | Vol./mes | Lectura |
|---|---|---|
| colores de temporada | 1.000 | estable todo el año |
| colores de temporada 2026 / 2025 | 480 / 260 | la variante con año despega cuando empieza su año |
| colores de temporada 2021–2024 | 1.300 c/u | dato probablemente viejo; confirma patrón anual |
| colores de temporada 2027 · nombres de las 4 paletas | sin dato | entidades nuevas; sin dato ≠ cero |
| color del año 2026 | 3.600 | interés anual |
| colores en tendencia 2026 | 1.900 | SERP dominada por moda |
| colores de moda 2026 · colores en tendencia | 880 c/u | apoyo |
| color del año | 590 | contexto |
| paleta de colores para interiores | 320 | secundaria |
| colores de moda para interiores | 260 | secundaria |
| bien y de buenas | 20 | entidad |

SERP observada en Semrush: «colores de temporada» y «color del año 2026» dominadas por moda y tendencia (Vogue MX,
Pantone, WGSN, AD, NYT, uñas y ropa); «colores de moda para interiores» por Home Depot MX (Pinterest), Benjamin
Moore, Elle Decor y Westwing. Ninguna marca de pintura mexicana con colección propia. Implicación: el title y el
H1 dicen «para tu casa» o «para pintar». Semrush tampoco sitúa a Berel en el top 10 de la consulta genérica; para
berel.com manda Search Console.

## 5. Search Console `sc-domain:berel.com` (MEDIDO, 2026-09-16)

Lectura en vivo por el reader canónico `readSearchConsoleAnalytics` (16 meses, dimensiones `query` por mes y
`query×page` para 90 días). La serie propia `greenhouse_growth.seo_gsc_daily` sólo existe desde 2026-07-31. Las
consultas anonimizadas no se reportan: la suma por consulta es menor que el total de la página.

**Página actual, 2026-06-15 → 2026-09-13:** 19.988 impresiones y 88 clics atribuidos a consultas, casi todo marca y
catálogo: `berel` 6.635 (pos. 2,0) · `pinturas berel catálogo` 1.386 · `gama de colores berel interiores` 981 ·
`pinturas berel` 727 · **`colores de temporada` 517, 0 clics, pos. 8,5** · `berel colores` 444 · `paleta de colores
berel` 398. Las variantes con «temporada» suman ~590 impresiones y cero clics.

**Serie mensual (impresiones):**

| Mes | colores de temporada | …2026 | color del año 2026 | Pitaya |
|---|---|---|---|---|
| may–sep 2025 | 683 · 698 · 282 · 381 · 495 | 0 | 0 | 0 |
| oct 2025 | 541 | 1 | 355 | 624 |
| nov 2025 | 507 | 3 | 1.355 | 1.104 |
| dic 2025 | 204 | 24 | 118 | 1.546 |
| ene–abr 2026 | 179 · 145 · 149 · 386 | 25 · 23 · 19 · 24 | 42 · 30 · 42 · 21 | 1.396 · 1.242 · 1.433 · 1.260 |
| may–ago 2026 | 520 · 426 · 125 · 68 | 3 · 1 · 1 · 0 | 6 · 0 · 0 · 0 | 1.271 · 902 · 922 · 822 |
| sep 2026 (al 13) | 119 | 0 | 1 | 343 |

Hallazgos: la demanda del ciclo nace con el lanzamiento del Color del Año (oct–nov); existen búsquedas por mes
(`colores de temporada enero 2026`, etc.); **`color pitaya` se repartió entre `color-berel-2026-pitaya-…` (1.526,
pos. 5,8) y `color-berel-2026` (849, pos. 1,4)** — el error que 2027 no debe repetir; `/colores` gana las consultas
de catálogo (pos. 1,5–2, más de 400 clics); las rutas vacías `/color-berel-2025` y `/color-berel-2026` siguen
captando impresiones de «berel» (6.371 y 2.098). Todavía no hay consultas con 2027.

Acceso local usado (lectura, sin cambios): `tsx --require ./scripts/lib/server-only-shim.cjs` +
`loadGreenhouseToolEnv()` + `applyGreenhousePostgresProfile('runtime')`, `GROWTH_SEARCH_CONSOLE_ENABLED=true` y
las dos variables del cliente OAuth (`GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID` y su `_CLIENT_SECRET_SECRET_REF`)
tomadas de `vercel env pull` a un archivo temporal que se borró. Sin esas variables el reader devuelve `disabled`.

## 6. Enlaces verificados (OBSERVADO, 2026-09-16)

| Ruta | Resultado |
|---|---|
| `/articulos/colores-de-temporada` | real: title propio, 1 H1, ~9.800 caracteres, 10 H2 |
| `/colores` · `/ubica-tienda` · `/contacto` | en `sitemap-paginas.xml`, con title propio |
| `/articulos/colores-de-temporada-2026` · `-2027` · `/articulos/color-berel-2027` · `/articulos/paleta-raices-de-la-piel` | shell soft-404 (sin title, 684 caracteres, igual que el control) |

La página actual todavía dice «Calidez Vibrante, la paleta vigente» (contradice la regla del 2026-09-07); se deja
registrado como corrección para Drupal fuera de este alcance.

## 7. Entregable en Notion (OBSERVADO por readback)

- Content Hub: [Colores de Temporada Berel 2027](https://app.notion.com/p/3dd39c2fefe781bf8ff1f1f943011491) —
  `Formato=Artículo`, `Tipo=Publicación de blog`, publicación 2026-09-29, `Estado=En revisión`.
  Desplegables: `🎨 Research · Material oficial` · `📈 Research · Semrush` · `📊 Research · Search Console` ·
  `🔎 Research · Competencia` · `🧭 Plan editorial y SEO` · `✍️ Versión vigente para revisión` ·
  `🗒️ Notas internas de producción`.
- Tarea: [Artículo N61 - Colores de Temporada Berel 2027](https://app.notion.com/p/3dd39c2fefe78107b5dee64daa04811c)
  — proyecto septiembre, `Formato=Articulo`, `Tipo de entregable=Contenido`, fecha límite 2026-09-25,
  `Estado=Listo para revisión`, sin `Tipo de pieza` ni `Canal de pieza` (principal editorial).
- Artículo: ~3.380 palabras de cuerpo (sin tablas, callouts ni metadatos); arco de cinco tiempos; respuesta
  directa de ~50 palabras; tabla de calendario y tabla comparativa; guía para elegir; BerelTip con la fórmula de
  luz; 6 FAQ; CTA triple a `/colores`, `/ubica-tienda` y `/articulos/colores-de-temporada`.
- Metadatos: title «Colores de Temporada 2027 para tu casa | Pinturas Berel» (55) · meta (148) · slug
  `/articulos/colores-de-temporada-2027` (36) · H1 «Colores de Temporada Berel 2027: cuatro paletas para pintar tu
  casa» (67).
- Fichas contextuales: N1 portada fotográfica (og:image) · N2 `Infografía — Técnica Gráfica · Técnica con íconos ·
  estructura B. Cards en columnas` (calendario) · N3 🔁 `Infografía — Tipos de Color · variante 4 bloques 2 × 2`
  (las cuatro paletas) · N4 cierre fotográfico.
- Decisiones de copy: sin roles cromáticos, temperatura ni emoción por color individual; atmósferas tomadas del
  concepto oficial de cada paleta; sin productos, acabados ni uso exterior; sin enlaces a páginas no publicadas
  (Color del Año 2027 mencionado sin enlace; las páginas de paleta no se mencionan). Las notas internas registran
  qué enlaces se activan al publicar.
- Gates: barrido de voz (vetadas, léxico, HEX, `/search`, lenguaje interno, duplicados) sin hallazgos;
  `client-visible-copy-gate.mjs` **PASS** sobre la exportación fresca; readback con los 7 desplegables, 4 fichas,
  6 callouts y todos los hijos tabulados.

## 8. Límites

- Semrush es modelo de terceros y sus fotos de SERP tienen fechas variadas.
- Search Console excluye consultas anonimizadas; mayo 2025 y septiembre 2026 son meses parciales.
- La aprobación de Berel para revelar las cuatro paletas se registra por palabra del operador; no se leyó la
  fuente original.
- Pendiente fuera de Notion (no visible al cliente): tareas visuales N1–N4 con ficha completa (N2 y N3 con ficha
  de infografía), matriz de distribución del módulo 15, activación de enlaces al publicar y QA en vivo.

## Delta 2026-09-19 — V2 de las tres piezas de campaña tras los comentarios de Berel

- **Alcance autorizado por el operador:** V2 de Color del Año 2027 (`3a639c2fefe7807d847cc099a0b99966`),
  Colores de Temporada 2027 (`3dd39c2fefe781bf8ff1f1f943011491`) y Raíces de la piel
  (`3d539c2fefe78131abe4fe1f0a1b6500`); respuesta a todos los hilos de Berel; enlaces entre piezas armados porque
  las tres se publican el mismo día.
- **Forma:** la V1 de cada página quedó como `🗄️ Histórico · Artículo V1` con todos sus hilos anclados; la V2 va
  debajo como `✍️ Versión vigente para revisión · V2`; las notas internas salieron del artículo a
  `🗒️ Notas internas de producción`. Ningún hilo desapareció ni fue marcado como resuelto.
- **Criterio de Berel aplicado (17–18 sep):** entrada informativa sin escena; sin tiempo ni orden de paletas; sin
  «ciclo» ni «colección 2027»; nombre del Color del Año enlazado una vez por página; fuera las tablas redundantes;
  masters oficiales en el hub; sección ladrillo/adobe/terracota retirada del Color del Año (queda FAQ corta que
  enlaza a Calidez Vibrante). Registro: módulo 09 de la skill («Campaña 2027», ⚠️ Choque 3).
- **Enlaces:** rutas relativas (pestaña nueva en el sitio). Colores a su página de familia; `verdes`, `amarillos`,
  `azules` y `morados` no cargan colores ni title, así que esos colores enlazan a `/colores`. Los 35 enlaces a
  `/search?q=` del hub V1 salieron.
- **Reparto de intenciones:** la diferencia Color del Año/paleta vive solo en el hub; los roles por color solo en
  la página de cada paleta (como sugerencia, sin dato oficial); Bien y de Buenas se desarrolla solo en su artículo.
- **Readback 2026-09-19 (OBSERVADO):** gate `client-visible-copy-gate` PASS en las tres páginas; cuerpos de
  1.285 (Color del Año), 1.713 (hub) y 1.169 palabras (Raíces); hub y Raíces pasaron a `En revisión`, Color del
  Año ya lo estaba.
- **Pendiente de decisión:** tareas de diseño N2/N3 inexistentes en hub y Color del Año; Banner N1/N4 del Color
  del Año congelados (en producción) con HEX y posición a conciliar; arte social del Color del Año (Facebook con
  la tabla 60-30-10 de colores 2026, Reel con «luz de norte/sur») a conciliar con diseño; tareas de Reel marcadas
  «No aplica» que contienen copy de Pin; excepción de extensión contractual y material oficial por pedir a Berel;
  actualización del menú principal el día de publicación.
- **Hallazgos del sitio (OBSERVADO):** el menú enlaza `/colores-de-temporada` y `/articulos/colores-de-temporada-2025`,
  que cargan la página vacía.
