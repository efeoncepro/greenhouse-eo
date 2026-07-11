# GREENHOUSE — Tender Deck Composer (design system del composer)

> **Tipo:** Working design doc (parte de Tender Proposal Studio F4 — deck pipeline)
> **Versión:** 0.1 · **Status:** Working (co-creación en curso, doc-only)
> **Creado:** 2026-07-11 por Claude (skills `typography-design`, `modern-ui`) con Julio Reyes
> **Spec raíz:** `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (§4 deck pipeline, Apéndices A/B)
> **Fuente de layouts:** Figma `Sistema Axis - PPT` (fileKey `GXYeJaRjotmFuczfnd8hLi`)

## Qué es esto

El **composer** arma cada slide de una propuesta de licitación **componiendo módulos pre-diseñados** del sistema AXIS PPT, NO generando freehand. Cada módulo = una **plantilla de layout** con slots de contenido. El agente elige la plantilla adecuada por tipo de contenido y llena los slots.

Los slides se renderizan **HTML → Chromium `print-to-pdf`** (stack que Greenhouse ya domina; fidelidad de navegador real; mismo HTML → N salidas). Slides 16:9 = **1920×1080**.

## Decisión de fondo — layout del Figma + reglas propias (NO clonar el raster)

Aprendizaje del loop (2026-07-11): **recrear el mesh gradient del Figma pixel a pixel NO escala** (los `radial-gradient` de CSS lo aproximan, no lo clonan; "no se renderiza igual"). La ruta estable:

- **El LAYOUT se extrae del Figma** (design-to-code MCP): estructura, tipografía exacta, posiciones, y los assets decorativos descargables (ícono estrella, separadores, etc.). Fiel.
- **El DEGRADADO se genera** al estilo de los **hero de las landings de Think** (CSS tokenizado, determinista), NO se pega ni se clona.
- El resultado es una **plantilla HTML limpia con slots** — reusable, recolorable, escalable.

## Las 5 reglas del molde (aplican a TODA plantilla)

### 1. Degradado de marca — hero de Think tokenizado + luz teal

Base = degradado hero de Think (`efeonce-think` → `index.astro .home-hero` / `.hero-shell`): un `linear-gradient` navy estable. Encima, **radiales suaves** para dar luz (teal) y profundidad (violeta) — como Think capa radial+linear, sin mesh caótico.

```css
:root {
  --axis-navy-soft:#023c70;   /* AXIS accent-800 */
  --axis-navy:#00284d;        /* AXIS accent-900 */
  --axis-navy-deep:#001a33;   /* cierre profundo (hero Think) */
  --axis-teal:#2c98b0;        /* LUZ — glow superior-izq (aprobado 2026-07-11) */
  --axis-violet:#33029c;      /* acento para jugar (subtle, bottom-right) */
}
.brand {
  background:
    radial-gradient(72% 56% at 6% 4%,  color-mix(in srgb, var(--axis-teal) 64%, transparent) 0%, transparent 52%),
    radial-gradient(56% 50% at 100% 98%, color-mix(in srgb, var(--axis-violet) 34%, transparent) 0%, transparent 58%),
    linear-gradient(160deg, var(--axis-navy-soft) 0%, var(--axis-navy) 62%, var(--axis-navy-deep) 100%);
}
```

- Colores = tokens AXIS (accent-800/900) + `--axis-teal`/`--axis-violet`. **NUNCA** hardcodear HEX sueltos fuera de estos tokens.
- **NUNCA** volver al mesh gradient recreado (rechazado: no escala, no se renderiza igual).

**Degradado del cover = receta EXACTA del hero de Think (verificada en `efeonce-think`, 2026-07-11).** Rechazados por el operador: el mesh recreado, el 3-color con violeta (se ve manchón/sucio), y el teal a alta opacidad (manchón verde). Lo que SÍ funciona (tokens Think = `web-agentica/index.astro`):

- **Navy = `#00284d`** (`axis.accent[900]`, "midnight navy" de Think) · `--navy-2 #023c70` · deep `#001a33`.
- **Teal de firma = `#36c8bf`** (`teal[500]`).
- **Base = radial navy (luz desde arriba), NO linear plano:** `radial-gradient(130% 100% at 70% -10%, navy-2 0%, navy 52%, #001a33 100%)`.
- **Teal como LUZ, no manchón:** glow de esquina a **opacidad baja 18-28%** con fade corto (`transparent ~46%`). Ej. Think: `radial-gradient(circle at 80% 0%, rgba(54,215,197,.18), transparent 34%)`.

```css
.cover {
  background:
    radial-gradient(64% 52% at 96% 100%, color-mix(in srgb, #36c8bf 22%, transparent) 0%, transparent 46%), /* teal luz sutil */
    radial-gradient(130% 100% at 70% -10%, #023c70 0%, #00284d 52%, #001a33 100%);                          /* navy hero Think */
}
```

Regla dura: el teal va a **≤28% opacidad** como luz de esquina; a más opacidad se vuelve manchón. NUNCA linear plano de navy — el radial con luz arriba es lo que lo hace premium.

### 2. Tipografía — pocos pesos, semánticos (skill `typography-design`)

Fuentes dictadas por AXIS PPT: **Poppins** (títulos) + **Geist** (cuerpo). Regla: pocos pesos que se lean distintos; Black (900) aplana la jerarquía → prohibido en título/lead.

| Rol | Fuente · peso | Tamaño (1920×1080) | Interlineado |
|---|---|---|---|
| Título de panel | Poppins **600** | ~58px | 1.06 |
| Lead de bullet | Geist **600** | 28px | 1.36 |
| Cuerpo / descripción | Geist **400** | 28px | 1.36 |

- Sentence case. Color de cuerpo sobre claro = navy `#020061`. Blanco sobre el panel navy.
- **NUNCA** Black 900 en título o leads (era el problema "muy pesada").

**Refinamiento 2026-07-11 (skill `typography-design`, al construir `NarrativeSplit`):**

- **Cursivas REALES, nunca faux (regla dura).** Si una plantilla usa un acento **itálico** (palabra-acento en el titular, énfasis en el cuerpo), hay que **cargar la cursiva real** en el `@import` (`Poppins:ital,wght@0,600;1,600`). Poner `font-style:italic` sobre un import **solo roman** (`wght@600`) hace que el navegador **sintetice** la itálica (faux italic) — prohibido por la skill. Geist itálica no se da por garantizada en Google Fonts: los acentos de **cuerpo** se resuelven con **peso + color, roman** (no con cursiva).
- **Color de acento por fondo (systematización): teal sobre oscuro, violeta sobre claro.** El teal brillante del Figma **sobre fondo claro falla contraste** (`--axis-teal` sobre `#eef0f3` ≈ 2.8:1 < el piso 3:1 de texto grande, WCAG 1.4.3). Por eso: en **paneles claros** el acento es **violeta `--axis-violet` `#33029c`** (≈10:1 ✓, y es el token "para jugar"); el **teal queda reservado como luz/acento sobre los paneles OSCUROS** (donde teal-sobre-navy sí contrasta). Regla del molde: *acento = violeta sobre claro · teal sobre oscuro.*

**Refinamiento 2026-07-11 (al construir `MetricsSplit`):**

- **Numerales KPI = Geist 600 + `font-variant-numeric: tabular-nums`, NUNCA monospace ni Poppins.** Es el invariante Greenhouse (`numéricos = Geist + tabular-nums`). Todo número-hero de dato (píldora KPI, número enmarcado) va en Geist tabular para que los dígitos alineen y no salten. Poppins queda para labels/títulos de texto; los números son Geist. Usar el signo menos real `−` (U+2212), no guion.
- **Ritmo de una lista de KPIs = distribución pareja, no `space-between` de 2 bloques.** Si el panel tiene un título arriba + N filas KPI, el título va fijo arriba y las filas se **reparten** en el alto restante (`kpis { flex:1; justify-content:space-between }`). Un `space-between` sobre `{título, grupo-kpis}` deja una **banda vacía** entre ambos (defecto detectado y corregido).

### 3. Safe-area — el contenido nunca toca el borde

- **Margen seguro = 72px** en los 4 bordes (múltiplo de 8; token `--safe`). Inviolable.
- Contenido de lista con `justify-content: space-between` dentro del safe box → primer ítem en el margen superior, último en el inferior, gaps parejos.
- **Regla de densidad:** el bloque debe caber en el safe box (1080 − 2×72 = **936px**). Si no cabe, se baja **un paso** la escala tipográfica; NUNCA se invade el margen.
- Verificable programáticamente (Playwright `getBoundingClientRect`): `firstTop=72`, `lastBottom=1008`, `sumContent≤936`.

### 4. Assets canónicos (no reconstruir a mano)

- **Logo:** `public/branding/logo-negative.svg` (lockup efeonce + isotipo Nexa, blanco para panel oscuro). NUNCA reconstruir el logo de fragmentos.
- **Ícono/decoración del módulo** (estrella, separadores): descargados del Figma vía design-to-code MCP.
- Separadores: dashed `#b7c2d2` (o el SVG del Figma).

**Sistema de íconos del composer = Solar Bold (Iconify) — decisión 2026-07-11.** Para íconos conceptuales (KPIs, features, pasos — NO marcas de terceros), la familia canónica es **Solar, variante Bold** (`https://api.iconify.design/solar/<name>-bold.svg`): **rounded, relleno, sin detalle excesivo, limpio** — estilo UI moderna. Reglas: **inlinear el SVG** (self-contained, recolorable via `fill:currentColor`), color **teal** sobre panel oscuro (regla de acento por fondo) dentro de un **contenedor de vidrio** (`linear-gradient(rgba(teal,.22)→.05)` + borde `rgba(teal,.26)` + highlight inset). NUNCA íconos de línea finos (se ven débiles) ni una familia distinta por plantilla. Marcas de terceros (ChatGPT, Google, etc.) siguen su propia regla (isotipos de marca), no Solar.

### 5. Layout del Figma (design-to-code)

- Extraer cada módulo con `get_design_context(nodeId, fileKey=GXYeJaRjotmFuczfnd8hLi)` → estructura + tipografía + asset URLs.
- Reconstruir como **plantilla HTML limpia con slots** (NO pegar el export React+Tailwind crudo, que viene con masks/rotaciones/absolutos).

### 6. Blend modes (efectos tipo Illustrator) — **on-demand**

CSS implementa **los mismos 16 blend modes** de Illustrator/Photoshop y Chromium los renderiza fiel (motor de navegador real). Es la forma de subir el nivel visual **quedándonos en el degradado generado (estable)**, sin volver al raster.

- **`mix-blend-mode`** — mezcla un **elemento** con lo que tiene detrás (glow, forma, logo, burbuja sobre el degradado). El grupo de mezcla se acota con `isolation: isolate`.
- **`background-blend-mode`** — mezcla las **capas de `background`** de un mismo elemento entre sí (varios gradientes + textura).

| Illustrator/PS | CSS | | Illustrator/PS | CSS |
|---|---|---|---|---|
| Multiplicar | `multiply` | | Sobreexponer color | `color-dodge` |
| Trama (Screen) | `screen` | | Subexponer color | `color-burn` |
| Superponer | `overlay` | | Diferencia | `difference` |
| Luz suave / fuerte | `soft-light` / `hard-light` | | Exclusión | `exclusion` |
| Aclarar / Oscurecer | `lighten` / `darken` | | Tono / Saturación | `hue` / `saturation` |
| **Luminosidad** | **`luminosity`** | | Color | `color` |

**Regla:** los blend modes se usan **on-demand**, no en todo. Cada uso se declara (qué elemento, qué modo, contra qué fondo) — no se rocían globalmente.

#### Técnica canónica — gris `#848484` + `luminosity` (aprobada 2026-07-11)

Un elemento en gris **`#848484`** (≈52% de luminancia) con `mix-blend-mode: luminosity` toma **el tono y saturación del degradado** de fondo pero a esa luminancia controlada → el elemento **se integra** al fondo (parece "parte de la imagen") en vez de pegar como un blanco plano. Es la traducción del truco que el equipo usa en Illustrator.

```css
/* el SVG/elemento en #848484 (no blanco, no negro) */
.url img { mix-blend-mode: luminosity; }   /* fill del SVG = #848484 */
```

- **Cuándo:** elementos secundarios que deben pertenecer al fondo sin competir — footers, URL/burbuja, watermarks, sellos, decoraciones sobre el degradado de marca.
- **Ejemplo vivo (`CoverFull`):** la burbuja `efeoncepro.com` (`Deck/SVG/url.svg`) se sirve con fill `#848484` + `luminosity` → burbuja azul-tono-fondo, elegante. (Blanco plano = pega; `#848484` sin blend = gris apagado; `#848484`+luminosity = ✨.)
- **NO** para el contenido principal legible (títulos, bullets, KPIs) — esos van sólidos con su contraste AA. La técnica es para lo decorativo/secundario.

**⚠️ Gotcha canónico (detectado 2026-07-11):** el elemento con `mix-blend-mode` **NO puede vivir dentro de un padre que forme un stacking context aislado** — `transform`, `opacity < 1`, `filter`, `isolation: isolate` crean un grupo aislado y el blend se mezcla contra el **fondo transparente del wrapper** (sale gris plano), NO contra el degradado. Síntoma: "lo puse con blend pero se ve gris". Fix: centrar/posicionar **sin `transform`** (usar `left:0; right:0; text-align:center`) para que el elemento mezcle contra el degradado real. Caso fuente: la burbuja URL del `CoverFull` centrada con `translateX(-50%)` salía gris hasta quitar el transform.

## Expresión exclusiva de deck — `Empower your …`

La familia `Empower your` es una **expresión tipográfica de decks AXIS**, no un token de Greenhouse producto, UI portal ni copy genérico. Su fuente de verdad vive en Figma `Sistema Axis - PPT`, sección [`Deck / Foundations`](https://www.figma.com/design/GXYeJaRjotmFuczfnd8hLi/Sistema-Axis---PPT?node-id=39-2), y se compone con tres fragmentos fijos:

```text
Empower  → Poppins ExtraBold Italic  · Deck / Expression / Empower
your     → Poppins ExtraBold         · Deck / Expression / Your
<suffix> → Poppins Black Italic      · Deck / Expression / Suffix
```

El componente canónico es `Deck / Expression / Empower Your`, con propiedad `Tone = Growth | Brand | Engine | Voice`. Las cuatro variantes conservan `Empower your` en gris y solo cambian el sufijo. No recrear estas combinaciones como texto ad hoc en una plantilla.

| Rol de deck | Primitive Figma | Semantic text alias | Hex | Uso |
|---|---|---|---|---|
| prefijo | `empower/prefix` | `text/empower/prefix` | `#848484` | `Empower your` |
| Growth | `empower/growth` | `text/empower/growth` | `#173B6C` | `Growth` |
| Brand | `empower/brand` | `text/empower/brand` | `#ED6F2D` | `Brand` |
| Engine | `empower/engine` | `text/empower/engine` | `#3273D4` | `Engine` |
| Voice | `empower/voice` | `text/empower/voice` | `#AC2D55` | `Voice` |

Los valores viven aislados en Figma bajo `Deck / Primitives` y `Deck / Semantic`; no entran a `Primitives`, `Semantic`, `theme.axis.*` ni a los tokens de UI de Greenhouse. Uso permitido: titulares display de deck. En fondo blanco, `Brand` y el prefijo cumplen el umbral de texto grande (≥3:1) pero no se usan para cuerpo ni microcopy.

## Catálogo de plantillas — nombres en inglés

Aunque el Figma esté en español, cada plantilla tiene **nombre canónico en inglés**. Familia = layouts bipartitos (panel de marca + contenido) → sufijo `Split`.

| Figma (ES) | Template (EN) | node-id | Tipo de contenido que acepta | Estado |
|---|---|---|---|---|
| (diseño nuevo, NO Split) | **`CoverFull`** | — | **portada full-bleed** (degradado completo, stack centrado) | ✅ **construido** |
| PersonaTitulo+Tips | **`BulletListSplit`** | 8:14178 | lista de puntos (diferenciadores · por qué Efeonce · ventajas) | ✅ **plantilla de referencia** |
| Right / Left | `SectionDividerSplit` | 6:12498 / 4:151 | divisor de sección · cierre (bipartito) | pendiente |
| Texto+Persona | `NarrativeSplit` | 5:7869 | resumen ejecutivo · enfoque · metodología | ✅ **construido** (slot derecho **flexible**: persona-foto o visual del método) |
| Texto+Texto | `DualTextSplit` | 8:14102 | dos ideas · antes/después · contexto+solución | ✅ **construido** (dos conceptos con slots independientes) |
| Texto+DatoDuro | `StatSplit` | 7:13485 | una métrica hero del diagnóstico | pendiente |
| DatosDuros+Persona | `MetricsSplit` | 7:13598 | varios KPIs (diagnóstico/resultados) | ✅ **construido** (KPIs en panel de marca + slot derecho **flexible**) |
| Texto+Grafico | `ChartSplit` | 5:10852 | un dato con gráfico | ✅ **construido** (texto claro izq + 1 chart tokenizado en panel de marca) |
| Comparativa | `ComparisonSplit` | 8:13782 | tabla comparativa (competencia · opciones) | ✅ **construido** (pares de filas contrastadas, no tabla libre) |
| Quote+Persona | `QuoteSplit` | 8:14071 | statement / pull-quote (compromiso · testimonial) | ✅ **construido** (statement en panel de marca + slot persona/atribución flexible) |
| DobleTips | `DualListSplit` | 8:14347 | dos listas de tips | ✅ **construido** (listas independientes sobre oscuro/claro) |

Gap del catálogo: no hay módulo dedicado de **equipo/squad** (usar `NarrativeSplit` o `MetricsSplit`).

### `BulletListSplit` — contrato de slots (referencia)

```
brandTitle: string            // ej. "Diferenciadores de" (Poppins 600, blanco)
brandLogo:  asset (fijo)      // logo-negative.svg
bullets:    Array<{ lead: string; body: string }>   // 1..7, star + lead(600) + body(400)
```

El agente mapea contenido → `bullets[]`; el branding (panel, logo, estrella, safe-area) queda por construcción.

### `CoverFull` — contrato de slots (portada)

Portada **full-bleed** (degradado en toda la slide, NO bipartito). Stack centrado, **4 elementos, sin eyebrow ni subtítulo** (estructura confirmada por el operador 2026-07-11):

```
efeonceLogo:   asset (fijo)     // logo-negative.svg, blanco, centrado, GRANDE
clientLogo:    asset (slot)     // logo del cliente — se normaliza a blanco mono dentro de client-stage
proposalKind:  enum             // technical | economic | executive | combined → label formal visible
urlBubble:     asset (fijo)     // Deck/SVG/url.svg (#848484 + mix-blend-mode:luminosity) al pie
```

Reglas propias de `CoverFull`: degradado hero-Think (§1, navy radial + teal luz); logo efeonce grande centrado; debajo, una **marca de relación decorativa no configurable** y el `client-stage` que normaliza la marca del comprador; luego el tipo de propuesta; burbuja `efeoncepro.com` al pie con luminosity (§6). La relación entre ambas marcas nace del layout, no de texto o de una composición libre del agente. El renderer solo sustituye `clientLogo` y el enum `proposalKind`; no agrega copy, fechas, tags ni logotipos extra. El contrato legible por el futuro composer vive en `tender-deck-composer-prototypes/cover-full.slots.json`: el agente entrega un `assetId` y la selección `proposalKind`, mientras los resolvers `client-brand-mark` y `proposal-kind-label` controlan normalización óptica, etiqueta formal y límites fail-closed. El agente nunca decide CSS, escalas ni labels libres. Prototipo vivo: `cover-full.html` en scratchpad.

### `NarrativeSplit` — contrato de slots (Texto+Persona, bipartito)

Espejo de `BulletListSplit`: **texto a la izquierda sobre fondo claro**, **panel de marca a la derecha** (degradado hero-Think, esquina redondeada izquierda). Es la plantilla narrativa: resumen ejecutivo, enfoque, metodología.

```text
eyebrow:   string            // "01 · Metodología" (Geist 600, uppercase, tracked, navy)
title:     rich string       // titular Poppins 600, navy, con 1 palabra-acento <em> = cursiva REAL violeta
narrative: Array<{ lead?: string; body: string }>  // párrafos; lead (Geist 600) + continuación (Geist 400); acentos = <span> violeta semibold
closing?:  rich string       // cierre enfático opcional (Geist 600, con acento violeta)
rightSlot: PersonaAsset | ConceptVisual   // SLOT FLEXIBLE (ver abajo)
```

**Slot derecho flexible (decisión operador 2026-07-11).** `NarrativeSplit` es un solo molde bipartito; el **contenido decide** qué va al panel de marca:

- **`PersonaAsset`** — foto/retrato de una persona (el "Persona" literal del Figma) cuando el slide tiene un rostro (lead del squad, testimonial, vocero).
- **`ConceptVisual`** — cuando NO hay foto (típico en enfoque/metodología), el panel aloja una **visualización tokenizada del concepto** sobre el degradado. Caso de referencia: los **3 anillos concéntricos** `Search → Answer → Entity` de Surround Discovery (dibuja "surround" literal) + leyenda de las 3 capas al pie. Teal como luz sobre el navy (§ regla de acento por fondo). El agente elige `PersonaAsset` si hay asset de rostro; si no, `ConceptVisual`.

Prototipo vivo: `narrative-split.html` (render `PREVIEW-narrative-split.png`) con el enfoque Surround Discovery real de SKY, registro institucional (sin tuteo, client-facing).

### `MetricsSplit` — contrato de slots (DatosDuros+Persona, bipartito)

Panel de **KPIs sobre el panel de marca a la izquierda** (degradado hero-Think, esquina redondeada derecha) + **slot flexible a la derecha sobre claro**. Es la plantilla del **diagnóstico / resultados** (varios datos duros que enmarcan una lectura).

```text
title:     string            // TÍTULO dominante (Poppins 600 ~58px blanco) — ej. "Diagnóstico de visibilidad"
subtitle:  rich string       // SUBTÍTULO (Poppins 600 ~31px, muted) — ej. "<cliente> · <encuadre>"; nombre de cliente = <span> teal
kpis:      Array<{ icon; value; label; qualifier }>   // 2..4 FILAS de stat, separadas por divisor punteado:
                             //   icon      = Solar Bold (Iconify), teal, en contenedor de vidrio (§Regla 4)
                             //   value     = número-hero Geist 600 tabular, en spine izquierdo alineado (unidad/denominador atenuados)
                             //   label     = Poppins 600 blanco   ·   qualifier = Geist 400 muted, 1 línea corta
rightSlot: PersonaAsset | ConceptVisual   // SLOT FLEXIBLE (igual criterio que NarrativeSplit)
```

- **Jerarquía del título (dura):** *título > número KPI > label > calificador*. El **título es el más grande** del panel; los números-hero van **por debajo** del título (si un dato pesa más que el encabezado, la jerarquía está invertida). `"Diagnóstico de visibilidad"` es el título; `"<cliente> · punto de partida"` es el subtítulo (cliente en teal = único acento).
- **Fila de stat, NO píldora.** Se descartó el tratamiento de píldora+ícono-en-cuadrito (se veía plano/recargado). El patrón canónico es **fila con divisor punteado** (el lenguaje de `BulletListSplit`): `ícono glass | número-hero (spine tabular) | label + calificador`. Las 4 filas se **reparten** en el alto (ritmo parejo).
- **Panel derecho anclado** (elegancia): la lectura lleva un **hairline teal→violeta** a su izquierda (ata el lenguaje del deck) y el espacio negativo gana profundidad con **arcos tenues** (`rgba(ink,~.05)`) abajo-derecha — negativo intencional, no vacío.
- **Slot derecho flexible** (decisión operador 2026-07-11): `PersonaAsset` (foto) cuando hay rostro; si no, `ConceptVisual` — caso de referencia = **"la lectura"** (el *so-what* del diagnóstico: titular Poppins 600 con acento violeta itálico + párrafo + fuente). Distingue a `MetricsSplit` (varios KPIs de apoyo + 1 lectura) de `StatSplit` (una métrica hero sola).
- **Números ilustrativos** en el prototipo; los reales se fijan por una corrida del **AI Visibility Grader**. NUNCA fabricar métricas de cliente como si fueran medidas.

Prototipo vivo: `metrics-split.html` (render `PREVIEW-metrics-split.png`) con el diagnóstico AEO de SKY (4 KPIs + lectura), registro institucional.

### `QuoteSplit` — contrato de slots (Quote+Persona, bipartito)

**No es un testimonial genérico: es un statement / pull-quote.** Una declaración grande como *type-as-image* sobre el **panel de marca a la derecha** (degradado hero-Think, esquina redondeada izquierda) + **slot de persona/atribución a la izquierda sobre claro**.

```text
statement: rich string       // la declaración — Poppins 600 ~52px blanco, leading tight (~1.24);
                             //   frases-acento = <em> cursiva REAL teal (Poppins ital 600); wordmark efeonce inline via <img class=wm> (logo-negative.svg)
quoteMark: fijo              // comilla grande teal (una sola en la slide) = motivo del quote, en el panel claro
leftSlot:  PersonaAsset | Attribution   // SLOT FLEXIBLE (mismo criterio que NarrativeSplit/MetricsSplit)
```

- **Type-as-image:** el statement ES el visual; no hay "cuerpo" aparte. Pocas frases, punchy. Acentos teal en las frases que cargan el compromiso (sobre oscuro → teal, regla de acento por fondo).
- **Wordmark efeonce inline** (logo-negative.svg, ~40px, baseline-aligned) cuando la oración nombra a Efeonce — es el toque de marca del módulo; NUNCA reescribir el logo como texto estilizado.
- **Una sola comilla** en toda la slide (motivo, teal, panel claro). No duplicar el mark.
- **Dos modos** por el slot izquierdo:
  - **Statement mode** (referencia): compromiso/posicionamiento **propio de Efeonce** (primera parte, auténtico), registro institucional sin tuteo. `leftSlot = Attribution` (eyebrow + contexto).
  - **Testimonial mode**: cita de un tercero + atribución (nombre/rol/empresa) o `PersonaAsset` con rostro. **NUNCA fabricar una cita de cliente**: el modo testimonial exige una cita real con fuente (misma regla que las métricas ilustrativas).

Prototipo vivo: `quote-split.html` (render `PREVIEW-quote-split.png`) — compromiso de Efeonce en la propuesta técnica para SKY, statement mode.

### `ChartSplit` — contrato de slots (Texto+Grafico, bipartito · skill `dataviz-design`)

**Texto a la izquierda sobre claro** (como `NarrativeSplit`) + **UN gráfico tokenizado** en el **panel de marca a la derecha**. NO se recrea el collage de mockups del Figma; el slot derecho aloja **un solo chart**, limpio, que responde **una** pregunta.

```text
eyebrow:  string             // contexto (Geist 600 uppercase tracked, muted)
title:    rich string        // hallazgo con acento violeta itálico (Poppins 600, sobre claro)
body:     Array<{...}>        // 1..2 párrafos cortos que enmarcan el chart (acentos violeta)
chart:    ChartSpec          // el gráfico — ver reglas dataviz abajo
```

**Reglas del chart (piso dataviz aplicado):**

- **Tipo por pregunta, no por dato.** El prototipo responde *"¿SKY domina el Share of Voice?"* → **horizontal bar chart** (comparación entre categorías; encoding posición/longitud = el más preciso de Cleveland-McGill). Para "tendencia" usar línea; para "una métrica sola" es `StatSplit`, no `ChartSplit`.
- **Barras desde 0** (regla dura; la longitud codifica el valor). **Valores etiquetados** en la barra (nunca tooltip-only; el deck es estático). Nombres honestos (`Líder de categoría` / `Competidor directo`), **NUNCA inventar marcas** ni fabricar cifras (mismo criterio ilustrativo + fuente que `MetricsSplit`).
- **Resaltar el sujeto con MÁS de un canal**, no solo color: la barra de SKY va **teal + label/valor bold**; el resto **muted white**. (Acento sobre oscuro = teal.)
- **Sin ejes recargados:** los valores al final de cada fila reemplazan la grilla; track sutil `rgba(255,255,255,.07)`.
- **Estático = SVG/HTML tokenizado**, no runtime de charts. Si una plantilla futura necesita charts ricos/animados fuera del deck, la política Greenhouse es ECharts (no aplica al render print).

Prototipo vivo: `chart-split.html` (render `PREVIEW-chart-split.png`) — AI Share of Voice de SKY vs. categoría (barras horizontales, SKY resaltada), registro institucional.

### `DualTextSplit` — contrato de slots (Texto+Texto, bipartito)

Dos conceptos que se suceden o contrastan: **tesis y primer concepto sobre claro a la izquierda**; **segundo concepto sobre panel de marca a la derecha**. Resuelve contexto → solución, antes → después o dos fases de método. No se usa para comparar competidores ni para una lista de beneficios.

```text
title:        string                              // tesis del paso de una idea a la otra
leftConcept:  { label, title, paragraphs[] }      // 1..2 párrafos; etapa, situación o contexto
rightConcept: { label, title, paragraphs[] }      // 1..2 párrafos; respuesta, destino o solución
outcome:      { label, text }                     // conclusión breve anclada al pie del panel de marca
```

Los dos conceptos son slots independientes, pero el compositor gobierna la progresión visual: marcador de señal outlined y acento lima sobre claro; marcador de resultado con check y panel AXIS azul→teal→violeta sobre oscuro. `label` opera como numeración/fase (no como un CTA); `title` es una idea breve; los párrafos admiten solo `<strong>` para énfasis. `outcome` cierra la transformación en una línea, no repite los párrafos. El agente debe mantener una relación lógica explícita entre ambos conceptos y no convertir los párrafos en listados. Contrato: `tender-deck-composer-prototypes/dual-text-split.slots.json`. Prototipo: `dual-text-split.html`.

### `DualListSplit` — contrato de slots (DobleTips, bipartito)

Dos listas que se complementan, no una comparación fila a fila: **fundamentos / entregables**, **problema / respuesta**, **qué hacemos / qué habilita**. El panel izquierdo oscuro sostiene la primera lista; el derecho claro presenta la segunda. El número de ítems puede ser distinto por lado.

```text
leftEyebrow:  string
leftTitle:    string
leftItems:    Array<{ lead, body }>              // 3..5, lista independiente
rightEyebrow: string
rightTitle:   string
rightItems:   Array<{ lead, body }>              // 3..5, lista independiente
tipIcon:      asset (fijo)                       // star1.svg; el agente no lo reemplaza
```

La marca y la iconografía son fijas. El agente completa solo `lead` y `body` dentro de cada lista; no alinea filas artificialmente ni escribe una segunda comparación en paralelo. Si los listados son pares exactos o requieren contraste/versus, debe usarse `ComparisonSplit` en su lugar. Contrato: `tender-deck-composer-prototypes/dual-list-split.slots.json`. Prototipo: `dual-list-split.html`.

### `ComparisonSplit` — contrato de slots (Comparativa)

Comparación de dos posturas en pares exactos: **contraste sobre claro a la izquierda** y **propuesta Efeonce sobre el panel de marca a la derecha**. No es una tabla genérica ni permite columnas desparejas.

```text
leftTitle:     string                         // postura, enfoque u opción de contraste; tono neutral
rightTitle:    string                         // propuesta, alternativa recomendada o enfoque Efeonce
rows:          Array<{                         // 3..5 pares exactos; cada lado tiene jerarquía fija
                 left:  { lead, body },        // lead ≤42 chars; body ≤94 chars
                 right: { lead, body },        // lead ≤42 chars; body ≤94 chars
                 evidenceRef?: string          // referencia para validar afirmaciones comparativas
               }>
proposalBrand: asset (fijo)                   // logo-negative.svg; el agente no lo reemplaza
```

El agente aporta los pares con evidencia; el compositor fija iconografía, el orden (contraste → propuesta), la cantidad pareja, la escala y el estado destacado de la propuesta. El lado de contraste usa marcador neutral (no una señal de éxito) y el lado de propuesta usa check. Si una afirmación compara a competidores, cada fila debe traer evidencia verificable; el prototipo usa una comparación metodológica, no métricas de SKY inventadas. Contrato: `tender-deck-composer-prototypes/comparison-split.slots.json`. Prototipo: `comparison-split.html`.

## Prueba de referencia

`BulletListSplit` renderizado end-to-end con los 7 diferenciadores reales de SKY: layout del Figma + degradado hero+teal + tipografía 600/400 + safe-area verificada. Es el molde para el resto del catálogo.

## Reparto de trabajo en curso (multi-agente Claude ↔ Codex, 2026-07-11)

Para paralelizar sin colisión sobre este doc y los prototipos:

- **Claude:** `ChartSplit` (5:10852) ✅ → tomar `DualListSplit` (8:14347) + `SectionDividerSplit` (6:12498).
- **Codex:** `ComparisonSplit` ✅ · `DualTextSplit` ✅ · `StatSplit` (7:13485, en curso).
- **Regla de convivencia:** cada agente edita **solo la sección de su plantilla** (fila de catálogo + su contrato); no tocar prototipos ni secciones del otro. El `registry` + `selector` se hacen al final, en conjunto, cuando estén las 11.

## Pendiente

- Extraer y construir las demás plantillas del catálogo (aplicando el molde).
- Formalizar el **registry** (`template → node-id → content-type → slots`) + el **selector** (agente elige plantilla por tipo de contenido) — milestone del composer.
- Embeber fuentes (Poppins/Geist) para runtime self-contained (hoy vía Google Fonts en Chromium).
- Jugar con el token `--axis-violet` en variantes.
