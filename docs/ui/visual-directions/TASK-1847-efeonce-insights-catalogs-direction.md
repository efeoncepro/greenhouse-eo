# TASK-1847 — Dirección visual: catálogos Insights (deck 16:9 + informe A4)

## Modo y fuente

- **Modo:** `repo-native-benchmark`.
- **Benchmark interno:** catálogo `deck-axis` (33 composiciones, brand pack `axis`, molde compilado),
  el estándar `EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` y el informe Berel Agosto 2026 (55 páginas
  A4, el único precedente del repo que resolvió índice, folios y pie institucional en un documento largo).
- **Contrato de datos:** `ChartSpecV1`, `EditorialPlanV1` y `EvidenceSnapshotV1` (TASK-1845). La dirección
  no puede pedir un dato que el snapshot no sella.
- **No es fuente:** «que se vea premium». El lienzo, los tokens y las fuentes salen del brand pack, no de
  una intención.

## Alternativas comparadas

1. **Ficha de evidencia** — cada lámina o página es una unidad cerrada: la afirmación en palabras arriba,
   la figura que la prueba al centro, la procedencia abajo. Una conclusión por superficie. Densidad media,
   tipografía grande, lectura en diagonal posible.
2. **Cuaderno analítico** — retícula editorial de dos columnas: una ancha para el desarrollo (texto,
   figura, tabla) y una angosta de marginalia que sostiene unidad, fuente, cobertura, denominador y
   período. Densidad alta con aire en el margen; continuidad entre páginas, no unidades aisladas.
3. **Tablero impreso** — la gramática de dashboard llevada al papel: grillas de tarjetas KPI, rails de
   color por estado, secciones como cards sobre fondo gris.

## Decisión

**Ficha de evidencia para el deck; Cuaderno analítico para el informe A4.** Dos direcciones de una misma
familia, asignadas por superficie, no dos temas intercambiables.

**Tablero impreso se rechaza como sistema visual**, y se nombra aquí para que no vuelva por la puerta de
atrás: en papel no hay hover, no hay drill, no hay scroll y no hay estado vivo, de modo que la tarjeta
pierde su única justificación y queda como contorno decorativo. Produce card soup impresa, empuja el
semáforo como lenguaje primario y es exactamente lo que el estándar premium marca `BLOCK`. Sus elementos
útiles —la cifra grande con su delta— se conservan **dentro** de la ficha de evidencia, sin el marco.

### Por qué dos direcciones y no una

El deck se proyecta y se hojea: una idea por lámina, cuerpo grande, cero marginalia. El informe se lee
sentado: densidad, continuidad entre páginas y procedencia a mano. Forzar una sola dirección produce o un
deck denso e ilegible a tres metros, o un informe de una idea por hoja que necesita sesenta páginas para
decir lo que cabe en veinte. Es la misma lógica con la que TASK-1310 asignó dirección por superficie.

La unidad la sostiene la **gramática compartida**, no el layout: veredicto antes del gráfico, procedencia
visible junto a la cifra, color semántico que nunca es el único canal, ausencia declarada como ausencia,
y el bloque de límites como pieza de cierre en ambos formatos.

## Tesis visual

- **Orden de lectura:** afirmación → figura que la prueba → procedencia → límite. Nunca al revés: la
  figura no abre, porque un gráfico sin su lectura obliga al lector a inventarla.
- **Decisión dominante:** decir qué significa el dato antes de dibujarlo.
- **Densidad:** deck medio-baja, una conclusión por lámina; A4 alta y regular, con el margen como
  respiración en vez del espacio entre tarjetas.
- **Modelo de profundidad:** planos tonales y tipografía. Sin sombra, sin card-on-card, sin fondo
  decorativo. En papel la jerarquía se construye con tamaño, peso y aire.
- **Rol tipográfico:** Poppins display para títulos y cifras protagonistas; Geist para cuerpo, tablas y
  marginalia, con `tabular-nums` en todo lo numérico. Ambos del brand pack `axis`, nunca declarados.
- **Rol del color:** tokens semánticos del pack. El color no codifica magnitud ni estado por sí solo; toda
  serie lleva etiqueta directa. Sin paleta semáforo como sistema.
- **Detalles de firma:** (a) la **marca de evidencia** discreta junto a cada cifra, que hace visible que el
  número tiene respaldo sellado; (b) la **marginalia de procedencia** en A4, que saca unidad, fuente,
  cobertura y denominador de debajo de la figura y les da columna propia; (c) el cierre **«Lo que esta
  edición no puede afirmar»**, que convierte los límites en una pieza deliberada en vez de una nota al pie.

## Target — deck 16:9 (1920×1080)

Portada con identificador de edición, período y versión · divisor de sección · láminas de evidencia
(afirmación, figura, procedencia) · lámina de límites como cierre. Pie: **sólo URL bubble**, según la
distinción de formato del estándar (2026-09-04). Sin dirección, sin teléfono, sin folio.

## Target — informe A4 (210×297 mm)

Portada · resumen ejecutivo · índice paginado real · capítulos por módulo · páginas analíticas (título,
conclusión, figura, marginalia, desarrollo) · páginas densas de tabla con cabecera repetida · límites y
metodología · contraportada. Pie **completo en cada página**, portada incluida: URL bubble enlazado,
dirección y teléfono resueltos desde `back-cover-full.slots.json`, más el folio. Área del pie reservada
**antes** de paginar.

## Target — harness de inspección (desktop 1440 / 390px)

El harness es superficie web y sí responde a viewport; el PDF no. A 390px: una columna, títulos y unidades
completos, tabla equivalente visible para cada figura, `scrollWidth === clientWidth`. Reducir el viewport
del harness **no certifica** la legibilidad del PDF: el documento se revisa a tamaño físico y en escala de
grises, aparte.

## Mapeo al sistema

- **Composition Shell:** no aplica al canvas físico. El molde de página lo da el catálogo; el harness usa
  el shell existente sin inventar regiones.
- **Primitives:** `extend`. Las figuras siguen el patrón de geometría derivada del dato ya canonizado en
  `chart-bar-geometry` — el resolver recalcula la geometría desde el valor y lanza si el dato y lo impreso
  no concuerdan. Ninguna librería de charts nueva.
- **Tokens:** brand pack `axis` vía `deck-tokens.css` / `deck-fonts.css` compilados. Cero HEX literal —
  `composer:color-ledger` lo verifica.
- **Copy:** `src/lib/copy/insights.ts`, que esta task crea y que además cierra el drift actual de
  `MODULE_TITLES` (hoy duplicado con valores distintos entre planner y mapper).

## Anti-patrones

- Tarjeta como contenedor por defecto en papel; card-on-card; sombras.
- Semáforo como sistema de color, o color como único canal de significado.
- Gráfico sin unidad, sin período o sin fuente; doble eje; 3D; barras que no parten de cero.
- Un `0` donde hubo rechazo de evidencia: la ausencia se declara, no se dibuja.
- Truncar una cifra o una afirmación para que encaje en un slot.
- Reducir el cuerpo de texto para forzar un número de páginas.
- Vocabulario de `Proposal` en un informe: `CoverFull` imprime «Propuesta Técnica» y no pertenece acá.

## Acceptance signature

La dirección está cumplida cuando un lector sin presentador puede, en cualquier página: decir qué pasó,
ver la evidencia que lo sostiene, reconocer de dónde salió el dato y saber qué **no** afirma esa edición.
