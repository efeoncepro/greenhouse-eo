# Identidad y recetas Berel

> **Snapshot del 2026-11-02.** Fuente de verdad: `brands/berel/contracts/berel-tokens.json` y
> `brands/berel/contracts/berel-recipes.json` del Workbench (`/Users/jreye/Documents/creative-workbench`).
> El compositor que los ejecuta es `brands/berel/compose/render.mjs`. Si un valor de aquí difiere
> del contrato, manda el contrato y se corrige este archivo.
> Estado de ambos contratos: **candidato**, pendiente de aprobación de diseño (Daniela, Andrés o Melkin).

## 1. Tipografía: Gotham Rounded

- Familia institucional de Berel (manual de identidad, pág. 21): **Light 300 · Book 400 · Medium 500 · Bold 700**.
  Cita del operador: «Usa gotham rounded es la tipografía de Berel».
- Sin fallback. Arial Rounded MT es complementaria en el manual, solo para medios sin Gotham, y
  **nunca** se usa en piezas producidas aquí. Poppins (CHIP de muestrario) y Quicksand/DM Sans (web
  202402) existen en otros canales de Berel y tampoco entran a banners.
- El texto se compone a trazos (`compose/type.mjs`, fontkit → paths SVG). El loader valida que cada
  archivo sea Gotham Rounded con `/^Gotham Rounded( |$)/`: la Light declara familyName
  «Gotham Rounded Light», por eso la expresión acepta sufijo. Si falta un archivo o no es Gotham,
  falla cerrado.
- Las líneas se balancean: mismo número de líneas que el corte voraz, al ancho más estrecho que lo
  mantiene, sin viudas. Un bloque que excede su `maxLines` o su ancho lanza error; no se recorta.

| Uso | Peso | Caja |
|---|---|---|
| Titular social (post, story) | Bold, tracking +1,2 % | Oración |
| Titular de infografía sobre papel (pasos) | Bold | MAYÚSCULAS |
| Nombre del color en el marcador | Bold | Como en el catálogo |
| Código del color | Book | Tal cual, siempre debajo del nombre |
| Etiquetas (BASE CLARA, MATE, POCA LUZ) | Bold | MAYÚSCULAS |
| Cifras técnicas / su explicación | Bold / Book más pequeña | Oración |
| Eslogan «Pinta con **Confianza** Pinta con **Berel**» | Book + Bold en «Confianza» y «Berel» | Manual pág. 24 |

## 2. Tokens de color

Color de **pintura** ≠ color de **sistema**. El de pintura sale siempre del catálogo oficial (ver
`color-pipeline.md`); los de sistema son estos:

| Token | Valor | Uso | Estado |
|---|---|---|---|
| `editorial-red` | `#B3153A` | Banda de pasos, insignias numeradas, «PRUEBA EN», verbos de señalización | **Pendiente de confirmar con Berel**: viene del sistema gráfico (aparece 29 veces en los SVG de números, flechas, pop-ups y «Antes»), no del manual |
| `editorial-red-deep` | `#91133A` | Franja de descargo bajo la banda de pasos | Medido en N50_BN_OBSERVA |
| `ink` | `#2D2A26` | Texto sobre papel o muro claro; marcador y titular cuando el blanco no alcanza 3:1 | Guía web 202402 + marcadores N46 |
| `paper` | `#F2F2F2` | Cabecera de pasos, fondo de técnica-gráfica | Medido en N42/N50 |
| `muted` | `#5B5650` | Subtítulos y descripciones secundarias | Medido |
| `white` | `#FFFFFF` | Logo, titular social, marcador sobre muro medio u oscuro, filetes | Constante |
| `card-glass` | `rgba(255,255,255,0.88)` | Tarjetas de paleta y señalización sobre foto | Tarjetas N41 (85–90 %) |
| `logo-red` | `#EA0029` | **Solo dentro del logo oficial.** Nunca acento de infografía | SVG oficial |
| `logo-ink` | `#1D1D1B` | Solo dentro del logo a dos tintas | SVG oficial |

Paleta del manual (págs. 19–20), para referencia: rojo 185 C `#EA0029`, negro Black C (en pantalla
se usa `ink`), plata Cool Gray 4 C `#BBBBBB`, y los complementarios del aro cromático magenta
`#D41367`, amarillo `#FFCD00`, cielo `#3CB4E5`, naranja `#FF8300`, verde `#6ABF4B`, azul `#1A428A`.
Uso de la paleta del manual en banners: cabeceras de categoría y círculo cromático; no es acento de
infografía salvo lo que diga la ficha (módulo 05 de `berel-content-production`: acento = Rojo
Editorial o paleta complementaria, nunca el rojo corporativo).

Medición de los valores medidos: cuantización de píxeles sobre piezas entregadas oct–nov 2026, ±3 por canal.

## 3. Logo

- Archivos oficiales en `clients/berel/.resources-local/logos/`: `Logo_Berel.svg` (rojo + negro),
  `Logo_Berel_Blanco.svg`, `Logo_Berel_Negro.svg`. El compositor los anida intactos como `<svg>`;
  solo decide posición y alto.
- Blanco sobre foto, negro sobre papel. **Un solo logo compuesto por pieza.** El logo impreso en la etiqueta de un
  producto oficial en escena no cuenta: la pieza conserva su firma (decisión del operador 2026-11-02: «sí, que salga dos
  veces el logo»).
- Manual: área de protección = ancho de la «e» de Berel alrededor del logo y respecto del borde
  (pág. 8); mínimo digital 50 px (70 px el círculo cromático); prohibido deformar, quitar los 25° o
  cambiar colores.
- Sin vector disponible (pendiente con Berel): 2 tintas, 1 tinta rojo, horizontal y círculo
  cromático (su SVG es un PNG incrustado). No se usan hasta tener el vector.

| Formato | Variante | Posición (x, y) | Alto | Nota |
|---|---|---|---|---|
| blog (foto) | blanco | 31, 665 | 73 px | Abajo a la izquierda |
| blog.paleta | blanco | x = 1408 − 31 − 76, y 665 | 73 px | Pasa abajo a la derecha porque las tarjetas ocupan la izquierda |
| blog.pasos (cabecera de papel) | negro | 30, 27 | 73 px | Arriba a la izquierda |
| post | blanco | 47, 1210 | 97 px | |
| Pinterest | blanco | 42, 1377 | 89 px | |
| story | — | — | — | Sin logo: el avatar y el sticker de enlace cumplen esa función desde septiembre |

El logo reserva una zona (`keepOut`) de su caja + 10 px hasta el borde inferior: ningún marcador
entra ahí.

## 4. Dos familias de piezas

Cita del operador: «los del blog son los horizontales».

| Familia | Formato | Medida | Archivo | Qué lleva |
|---|---|---|---|---|
| **Blog** (horizontal) | `blog` | 1408 × 768 | webp ≤ 200 KB | Foto o infografía + logo. **Sin titular, sin píldora, sin CTA** |
| | `og` | 1200 × 630 | webp ≤ 200 KB | Derivado de `blog.portada` (declarado; ver §7) |
| **Social** (vertical) | `post` | 1080 × 1350 | PNG | Píldora + titular con regla + marcadores + logo |
| | `story` | 1080 × 1920, zonas seguras 250 arriba / 340 abajo | PNG | Titular con regla + marcadores; sin logo ni píldora |
| | `pinterest` | 1000 × 1500 | PNG | Marcadores + logo; sin titular (el texto va en el título y la descripción del pin) |

El webp se comprime bajando la calidad 86 → 80 → 74 → 68 → 62 hasta quedar bajo 200 KB;
`qa.webpQuality` registra la calidad final y `qa.underWeight` dice si lo logró. Si es `false`, la
pieza no cumple la Spec y no se entrega.

## 5. Componentes

- **Marcador de color:** aro vacío + línea guía con punto + nombre Bold sobre código Book. Lo coloca
  la grilla; anatomía, tono y reglas de celda en `marker-grid.md`.
- **Píldora** `berel.com/inspiracion` con lupa: blanca, texto ink Medium, **solo en el post**, x45 · y56 · 48 px.
- **Regla vertical del titular:** 3 px, a 30 px del texto, en post y story. Blanca, o ink cuando el
  blanco no contrasta 3:1 con el fondo del titular.
- **Insignia numerada:** círculo `editorial-red` de 44 px con aro blanco de 4 px, centrada en el
  borde superior de cada paso.
- **Etiqueta de franja:** pastilla blanca, radio 6, alto 40, Bold MAYÚSCULAS ink.
- **Tarjeta de paleta:** blanca al 88 %, radio 14, muestra con el HEX del catálogo, rol en
  MAYÚSCULAS (teñido del color solo si contrasta ≥ 3:1 sobre la tarjeta; si no, ink), nombre en
  MAYÚSCULAS, código, filete, «PRUEBA EN» en rojo editorial y uso ≤ 8 palabras.
- **Íconos:** línea, sin relleno, extremos redondeados (`02_Recursos/05_Iconos/Lineamientos Iconos.svg`,
  trazo 3,5 px sobre ≈ 37 px). Los `ICONO-*.png` de relleno son de campaña, no de tutorial.

## 6. Recetas renderizadas

Cada receta referencia piezas entregadas (`N##` = número de artículo en OneDrive
`Berel - Efeonce - Squad Berel/Workspace Oficial/04_Entregables`). Límites = los que el compositor
hace cumplir (falla cerrado si se exceden).

### Blog

| Receta | Rol | Campos y límites | Referencias |
|---|---|---|---|
| `blog.portada` | N1 · Portada / hero emocional (y base del og:image) | Foto obligatoria · 0–3 marcadores · **ningún texto** (sin titular, píldora ni CTA; un `title` falla) | N46_BN_PORTADA, N41_BN_PORTADA_1 |
| `blog.cierre` | N4 · Cierre inspiracional | Foto obligatoria · 0–1 marcador (el color protagonista) · ningún texto | N46_BN_CIERRE, N41_BN_CIERRE_3 |
| `blog.franjas` | Técnica-Foto / Tipos de Color · comparativa | 2–5 columnas de la misma escena, cambia **una sola variable** · etiqueta MAYÚSCULAS ≤ 3 palabras por columna · 0–1 marcador por columna · leyenda opcional ≤ 10 palabras · filete 3 px · etiqueta a 44 px del borde superior | N44_BN_BASE_ACENTO_DETALLE, N46_BN_COLOR_RECAMARA |
| `blog.pasos` | Infografía · Pasos con titular | Cabecera de papel 140 px con título MAYÚSCULAS ≤ 6 palabras (1 línea) y subtítulo ≤ 10 palabras · 3–5 pasos: verbo ≤ 3 palabras (MAYÚSCULAS) + texto ≤ 8 palabras + foto · banda roja 140 px · descargo opcional ≤ 16 palabras en franja de 44 px · logo negro arriba a la izquierda · sin marcadores | N50_BN_OBSERVA, N30_BN_DIDACTICO_3 |
| `blog.paleta` | Infografía · Tipos de Color · 4 tarjetas | Foto del ambiente con los 4 colores aplicados · **exactamente 4** tarjetas: rol (BASE CLARA, TRANSICIÓN, ACENTO CÁLIDO, ACENTO PROFUNDO), color del catálogo, uso «PRUEBA EN» ≤ 8 palabras · columna x84 · y52 · 410 px de ancho, tarjetas de 152 px con 12 px de separación · logo abajo a la derecha · marcadores: el contrato no los declara; el compositor admite hasta 3 | N41_BN_INFOGRAFIA_1 (2) |

### Social

| Receta | Rol | Campos y límites | Referencias |
|---|---|---|---|
| `social.post` | Adaptación 4:5 (Facebook) | Recorte vertical de la escena de portada o su versión «después» · titular obligatorio ≤ 14 palabras y ≤ 3 líneas, en caja de oración (regla x87, texto x117 · y182, 62 px, interlínea 76, ancho ≤ 893) · subtítulo opcional · 0–2 marcadores según el contrato (el compositor admite hasta 3) · píldora · logo | N46_SM_POST, N39_SM_POST |
| `social.story` | Adaptación 9:16 (Instagram story) | Recorte vertical · titular obligatorio ≤ 14 palabras y ≤ 3 líneas (regla x84, texto x118 · y290, 72 px, interlínea 87, ancho ≤ 857) · 0–2 marcadores según el contrato (el compositor admite hasta 3) · sin logo ni píldora: el sticker de enlace va abajo | N41_SM_STORIE, N33_SM_STORIE |
| `social.pinterest` | Adaptación 2:3 (Pinterest) | Recorte vertical · **sin titular** (un `title` falla) · 0–3 marcadores, suben al tercio superior · logo | N41_SM_PINTEREST, N29_SM_PINTEREST |

**Desviación consciente (story):** el corpus empieza el titular en y≈168, dentro de la franja de la
interfaz de Instagram (≈ 250 px); la receta lo baja a y290.

**Recorte social según el registro fotográfico:** el titular va a la izquierda. Si la señal del
registro está en un costado (en el alto, la celosía o el patio), post y story centran el recorte y
Pinterest, que no lleva titular, la muestra. Se controla con `photo.focal` (0–1 sobre la foto), que
solo mueve el recorte. Nunca pongas el titular sobre concreto o vidrio claro.

### El job

```json
{
  "schema": "berel.banner-job.v1", "brandId": "berel",
  "recipe": "social.post", "slug": "N46_SM_POST",
  "title": "Cómo elegir colores para una recámara que se sienta tuya",
  "photo": { "file": "../fotos/recamara-bien-y-de-buenas.png", "focal": [0.5, 0.45] },
  "markers": [{ "name": "Bien y de Buenas", "code": "1-3404D" }]
}
```

- `schema` y `brandId` exactos o falla. La receta debe existir en `recipes`.
- El job **no transporta geometría, fuentes ni colores**: solo receta, textos, fotos y pares
  nombre+código. Un marcador con `at`/`alt` falla cerrado. `sample: [u, v]` solo si la foto no está
  corregida al color (ver `marker-grid.md`).
- Las fotos solo se aceptan bajo `projects/berel/` o `clients/berel/.resources-local/photos/`, y las
  corridas solo se escriben bajo `projects/berel/` (`scripts/componer.mjs` lo hace cumplir).

## 7. Declaradas sin render

El contrato las describe en `declaredButNotRendered`; el compositor no las produce. Un job con
cualquiera de ellas falla cerrado («receta desconocida»). Diseño las produce en Illustrator o After
Effects.

| Receta | Qué es | Referencias / requisito |
|---|---|---|
| `blog.senalizacion` | Señalización con tarjetas translúcidas + ícono + línea guía | N41_BN_SEÑALIZACION_2, N39_BN_INFOGRAFIA_2 |
| `blog.tecnica-grafica` | Tabla o tarjetas sobre papel con latas | N42_BN_INFOGRAFIA_2/3. Requiere renders oficiales de producto |
| `social.reel` | 14 s: transformación ≈ 8 s + tapa roja de 6 s | Fuera del compositor estático: lo arma `scripts/reel.mjs` → [video.md](video.md) |

Además, el formato `og` (1200 × 630) está declarado como derivado de `blog.portada`, pero ninguna
receta lo compone hoy: `composeBerel` siempre usa el formato de la receta (`blog`). Verificado en
`render.mjs` el 2026-11-02.

## 8. Lo que nunca aparece (`never`)

Del contrato, con su porqué:

- **Píldora, regla vertical o titular en banners de blog** (salvo lanzamiento oficial de Berel): son
  elementos de las adaptaciones sociales; el blog acompaña un artículo que ya tiene titular.
- **Nombre o código de color fuera del catálogo verificado:** Berel vende ese color; un nombre mal
  emparejado es un error de producto, no de diseño (caso N41).
- **Rojo del logo `#EA0029` como acento de infografía:** el rojo corporativo es la marca; el acento
  de sistema es `editorial-red`.
- **Logo redibujado, generado o más de un logo compuesto por pieza:** un modelo no sostiene una marca. La etiqueta del
  producto en escena no cuenta como segundo logo.
- **Marca o firma de Efeonce:** Efeonce entrega insumo; la pieza es de Berel.
- **Párrafos dentro de la pieza, CTA, precio o hashtag.**
- Del libro de marca: texto o logos generados dentro de la foto (el plate nace limpio). La excepción es el producto
  oficial en escena, con su etiqueta.

## Pendientes de confirmar con Berel

1. Si `#B3153A` es un color oficial (hoy solo vive en los SVG del sistema gráfico).
2. Registro fotográfico: hora dorada actual frente a la luz de día del lenguaje histórico.
3. Leyenda «Imagen ilustrativa. Los tonos pueden variar…»: ¿obligatoria?
4. Vectores faltantes del logo (2 tintas, horizontal, círculo cromático).
5. Exportación de reels y stories antiguas a 750 × 1334: ¿decisión o límite?

Fuente: `brands/berel/system/BEREL_VISUAL_SYSTEM_V1.md` §9.
