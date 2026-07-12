# GREENHOUSE — Tender Deck Composer (design system del composer)

> **Tipo:** Working design doc + **contrato del runtime F1** (parte de Tender Proposal Studio F4 — deck pipeline)
> **Versión:** 0.2 · **Status:** **Implementado (F1)** — el composer compone: `src/lib/commercial/tenders/deck/**` (~1.800 LOC) + CLI `pnpm deck:compose` + 4 suites de tests. **NO es doc-only.** El molde visual sigue en co-creación.
> **Creado:** 2026-07-11 por Claude (skills `typography-design`, `modern-ui`) con Julio Reyes
> **v0.2 (2026-07-12):** se corrige el status (decía `doc-only` con el runtime ya shipped), se declara el **entregable PDF real** (merge `pdf-lib` de N páginas + gate de peso), el **CLI canónico `pnpm deck:compose`**, el **inventario de los 15 resolvers**, la **state machine** (12 estados, sin DB) y la **2ª bug class** (geometría). Se elimina el bloque muerto que decía "slotsRef sólo en CoverFull".
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

**Refinamiento 2026-07-11 — degradado RICO canónico para superficies oscuras de contenido.**

El operador rechazó expresamente usar azul eléctrico `#196df2` como base. La referencia aprobada es el degradado ya materializado por Claude en `TimelineFull`: navy profundo y dinámico, textura de puntos y glows teal/violeta contenidos. No es un navy plano ni un mesh recreado.

Receta canónica:

```css
.brand {
  background:
    radial-gradient(rgba(255,255,255,.09) .55px, transparent .8px) 0 0 / 5px 5px,                              /* textura de puntos ~9% (profundidad táctil 2026) */
    radial-gradient(52% 60% at 100% 0%,  rgba(42,194,184,.5) 0%, rgba(42,194,184,.16) 38%, transparent 66%),  /* luz teal localizada */
    radial-gradient(50% 55% at 0% 104%,  rgba(103,23,205,.5) 0%, rgba(103,23,205,.15) 44%, transparent 74%),  /* luz violeta localizada */
    linear-gradient(120deg, #001a33 0%, #023c70 48%, #001327 100%);                                            /* navy profundo → navy Think → cierre */
}
```

**Alcance de la receta (anti-drift):** toda superficie oscura de contenido usa esta receta exacta. `CoverFull` conserva su hero Think aprobado; `BackCoverFull` conserva su gradiente canónico de cierre; `HighlightWave` usa el hero Think detrás de su campo claro. No existe un cuarto degradado de plantilla ni se usa el raster/mesh de Figma como fondo final.

- **Base navy `#001a33` → `#023c70` → `#001327`** — la vida viene de luces teal/violeta periféricas, no de ampliar un azul eléctrico. El navy debe dominar la percepción del campo.
- **Textura de puntos como capa de `background`** (no `::before`): pinta bajo el contenido, sin líos de z-index.
- **Orientación fija de glows:** teal `at 100% 0%`, violeta `at 0% 104%`, `linear 120deg`. Es la composición aprobada de `TimelineFull`; no se espeja ni se inventa una variante por plantilla.
- **`CoverFull` NO cambia de familia:** la portada mantiene su hero-Think (radial navy con luz arriba), con grano editorial tenue y una luz teal central de relación; no admite azul eléctrico ni un cuarto degradado. Es full-bleed y tiene su propio contrato.
- **Ya aplicado a** `NarrativeSplit`, `MetricsSplit`, `QuoteSplit`, `ChartSplit` (Claude) + `DualTextSplit`, `ComparisonSplit` (Codex, origen de la receta). Toda Split nueva usa esta receta.

### Firma de URL — burbuja de luminosity (chrome fijo)

Toda lámina que tenga espacio negativo suficiente lleva la firma no configurable `efeoncepro.com` como burbuja discreta. Es chrome de marca, no un slot ni copy que el compositor pueda sustituir. Siempre se inserta el SVG canónico `assets/url-lum.svg` como `<img>` real —nunca se recrea como pill CSS ni como pseudo-elemento— y usa `mix-blend-mode: luminosity`, texto pequeño y contraste de borde. La firma debe cerrar el recorrido visual sin competir con el título ni cubrir una métrica, navegación, logo o evidencia. `HighlightWave` es la excepción deliberada: su campo claro ocupa el lienzo y el marco navy no da área viable, por lo que no lleva burbuja.

**Posición por composición, no por esquina por defecto (auditada 2026-07-12):** la primera opción es centrarla dentro de la banda negativa real —en todo el canvas (`AgendaFull`, `CardGridFull`), dentro del campo oscuro de un split (`BulletListSplit`, `DualListSplit`, `MetricsSplit`, `StatSplit`, `TeamSplit`, `SectionDividerSplit`, `QuoteSplit`) o dentro de una banda central propia (`CoverFull`, `BackCoverFull`, `FourPillarsFull`, `HumanImpactFull`, `CredentialsFull`). Si ese eje está ocupado por tabla, cronograma, leyenda, navegación o cierre narrativo, se lleva al costado seguro del mismo campo oscuro (`NarrativeSplit`, `ChartSplit`, `ComparisonSplit`, `CaseStudySplit`, `PricingFull`, `RequirementsTableFull`, `TimelineFull`, `ProcessStepsFull`); `DualTextSplit` y `EvidenceStoryGrid` usan banda superior lateral para despejar cierres densos. La implementación vive en `tender-deck-composer-prototypes/deck-signature.css`. Nunca centrar con `transform`.

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
| (diseño nuevo, NO Split) | **`BackCoverFull`** | referencia canónica de marca | **contraportada full-bleed** (marca y contactos fijos) | ✅ **construido** |
| Fondo Wave + texto destacado | **`HighlightWave`** | 4:124 | una idea o decisión editorial con frase-acento | ✅ **construido** (campo claro sobre hero Think canónico) |
| Cuatro pilares + tesis | **`FourPillarsFull`** | 8:24297 | marco de capacidades · método · propuesta de valor | ✅ **construido** |
| Persona + prueba + transformación | **`EvidenceStoryGrid`** | 8:24742 | caso de cambio · argumento con evidencia · antes/después | ✅ **construido** |
| Impacto humano por rol | **`HumanImpactFull`** | 9:25264 | historia de cambio operativo · beneficio para una persona/equipo | ✅ **construido** |
| Narrativa + grid de tarjetas | **`CardGridFull`** | 5:7657 | stack de capacidades · servicios · herramientas (2×N tarjetas) | ✅ **construido** (full-bleed: narrativa + caja destacada izq · grid de tarjetas glass der) |
| Cronograma / plan de trabajo | **`TimelineFull`** | — (gap, no Figma) | plan de trabajo · fases · hitos · dependencias/holgura | ✅ **construido** (Gantt full-bleed: barras de rango + hitos diamante + conectoras) |
| Equipo / squad | **`TeamSplit`** | — (gap, no Figma) | equipo · rol · dedicación % · responsable único | ✅ **construido** (bipartito: intro marca izq · roster de tarjetas de rol der) |
| Oferta económica / inversión | **`PricingFull`** | — (gap, no Figma) | total de inversión · desglose cotizado · condiciones comerciales | ✅ **construido** (total héroe + ledger de una sola superficie) |
| Matriz de cumplimiento | **`RequirementsTableFull`** | — (gap, no Figma) | requisito técnico/administrativo · evidencia · estado | ✅ **construido** (resumen de control + matriz trazable) |
| Caso de éxito acreditado | **`CaseStudySplit`** | — (gap, no Figma) | experiencia · arco reto → enfoque → resultado + métrica | ✅ **construido** (bipartito: historia claro izq · resultado hero + barras before→after der) |
| Agenda / índice de apertura | **`AgendaFull`** | — (gap, no Figma) | índice de capítulos · navegación del deck | ✅ **construido** (full-bleed: grid 2×3 de capítulos clickeables + footer) |
| PersonaTitulo+Tips | **`BulletListSplit`** | 8:14178 | lista de puntos (diferenciadores · por qué Efeonce · ventajas) | ✅ **plantilla de referencia** |
| Right / Left | `SectionDividerSplit` | 6:12498 / 4:151 | divisor de sección · cierre (bipartito) | ✅ **construido** (número de sección héroe + mini-agenda; 2 variantes espejo) |
| Texto+Persona | `NarrativeSplit` | 5:7869 | resumen ejecutivo · enfoque · metodología | ✅ **construido** (slot derecho **flexible**: persona-foto o visual del método) |
| Texto+Texto | `DualTextSplit` | 8:14102 | dos ideas · antes/después · contexto+solución | ✅ **construido** (dos conceptos con slots independientes) |
| Texto+DatoDuro | `StatSplit` | 7:13485 | resultados / objetivos verificables | ✅ **construido** (contexto + 3–5 resultados) |
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

Reglas propias de `CoverFull`: degradado hero-Think (§1, navy radial + teal luz); logo efeonce grande centrado **con escala bloqueada**; debajo, una **marca de relación decorativa no configurable** y el `client-stage` que normaliza ópticamente la marca del comprador; luego el tipo de propuesta; burbuja `efeoncepro.com` al pie con luminosity (§6). La relación entre ambas marcas nace del layout, no de texto o de una composición libre del agente. El renderer solo sustituye `clientLogo` y el enum `proposalKind`; no agrega copy, fechas, tags ni logotipos extra. El contrato legible por el futuro composer vive en `tender-deck-composer-prototypes/cover-full.slots.json`: el agente entrega un `assetId` y la selección `proposalKind`, mientras los resolvers `client-brand-mark` y `proposal-kind-label` controlan normalización óptica, etiqueta formal y límites fail-closed. El agente nunca decide CSS, escalas ni labels libres. Prototipo vivo: `cover-full.html` en scratchpad.

### `BackCoverFull` — contrato de slots (contraportada)

Contraportada **full-bleed** cerrada: degradado canónico, logo Efeonce, burbuja `efeoncepro.com`, set social y contacto. Es el cierre del deck, no una superficie de contenido ni un footer intercambiable.

```text
efeonceLogo:   asset fijo
urlBubble:     asset fijo
socialLinks:   set fijo de Iconify (Spotify · Instagram · LinkedIn · Threads · YouTube · TikTok)
contactDetails:set fijo institucional
```

**Regla visual dura:** todos los elementos de primer plano usan `mix-blend-mode: luminosity`, incluido logo, burbuja URL, iconografía social y línea de contacto. El agente no altera el set ni sus valores. Dirección vigente: `Dr. Manuel Barros Borgoño 71 OF 1105, Providencia, Chile`; conserva correo y teléfonos institucionales. Contrato: `tender-deck-composer-prototypes/back-cover-full.slots.json`. Prototipo: `back-cover-full.html`.

### `HighlightWave` — contrato de slots (fondo Wave + frase-acento)

Superficie editorial completa, basada en el marco Wave de Figma (`4:124`). Conserva el **campo claro** y su composición, pero reemplaza su raster/mesh por el **hero Think canónico**: no introduce otro degradado al deck. El único héroe es una **frase-acento**. No es una portada ni un módulo de quote: sirve para instalar la idea que debe orientar una sección o decisión de la propuesta.

```text
eyebrow?:      string              // contexto breve; se omite si no aporta lectura
statementLead: string              // primera idea, Poppins 600 navy
highlight:     string              // obligatorio; Poppins ExtraBold Italic violeta, foco visual
statementTail?: string             // remate breve, nunca abre otro concepto
supporting?:   rich string         // 1 párrafo de encuadre, <strong> permitido
```

`highlight` es un slot semántico, no HTML ni una elección de color del agente: el renderer lo convierte en el segundo golpe tipográfico de la frase. Si el contenido requiere dos ideas de igual peso, usar `DualTextSplit`; si es una declaración atribuida, usar `QuoteSplit`. El campo Wave es **chrome CSS fijo** sobre el hero Think (no un asset raster ni un slot); el renderer valida juntos `statementTail` y `supporting` antes de renderizar para no romper el ritmo vertical. Contrato: `tender-deck-composer-prototypes/highlight-wave.slots.json`. Prototipo: `highlight-wave.html`.

### `FourPillarsFull` — contrato de slots (marco de cuatro pilares)

Lámina full-width para explicar una capacidad como un **sistema de cuatro partes**: argumento editorial y tesis arriba; cuatro columnas de contenido abajo. El panel superior usa el degradado rico canónico y los pilares quedan sobre una superficie clara continua.

```text
sectionLabel?: string
title:         rich string              // <em> para una frase-acento
context:       Array<rich string>       // 1..2 párrafos, <strong> permitido
thesis:        rich string              // cierre editorial, <em> permitido
pillars:       Array<{ kind, title, body, detail }> // exactamente 4
```

`kind` es fijo (`ai | data | method | human`): controla el icono Solar Bold/Iconify, el tono y el orden. El agente reemplaza copy, no añade una quinta tarjeta, no cambia iconos ni convierte los pilares en una tabla libre. Los iconos viven en vidrio con borde e inset highlight; los tonos vivos quedan para icono/superficie y los títulos usan su variante oscura accesible sobre claro. No se reproduce el mesh de Figma; el renderer aplica el degradado canónico de deck. Contrato: `tender-deck-composer-prototypes/four-pillars-full.slots.json`. Prototipo: `four-pillars-full.html`.

### `EvidenceStoryGrid` — contrato de slots (persona + evidencia + consecuencia)

Patrón editorial para explicar una transformación real: **persona/titular** y contexto arriba; **una evidencia cuantificada** y la consecuencia operativa abajo. No es un slide de KPIs: usa una sola prueba para sostener una historia.

```text
sectionLabel?: string
personAsset:   PersonAsset             // retrato/figura con ancla inferior izquierda
headline:      rich string             // <em> = palabra-acento cyan
context:       Array<rich string>      // 1..2 párrafos, <strong> permitido
evidence:      { value, label, detail, evidenceRef }
outcome:       Array<rich string>      // 1..2 párrafos, <strong> permitido
```

La prueba debe tener `evidenceRef`; sin fuente, se rechaza en vez de inventar un número. El retrato es un slot (la imagen de Figma solo ilustra su encuadre) y su gesto debe conducir al titular, nunca fuera de la composición. El cuadrante superior izquierdo conserva un **canvas de trabajo fijo** (chrome genérico + grilla HTML, no raster ni marca Figma): integra retrato y headline como un único lockup editorial y nunca se degrada a foto+texto sobre un campo vacío. El agente no altera ese canvas, el panel claro, el **marco de objeto seleccionado** de la evidencia (rectángulo sin radio, contorno discontinuo y ocho tiradores) ni el degradado rico canónico. No es una card. Contrato: `tender-deck-composer-prototypes/evidence-story-grid.slots.json`. Prototipo: `evidence-story-grid.html`.

### `HumanImpactFull` — contrato de slots (impacto humano por rol)

Lámina editorial para bajar una metodología a su efecto en el trabajo cotidiano. Arriba presenta la tensión y la explicación; abajo, una única historia de rol y la consecuencia. No es un perfil de persona ni un slide de testimonios: es el puente entre capacidad propuesta y cambio operativo tangible.

```text
sectionLabel?: string
title:         rich string                 // <em> es el golpe final en cursiva
context:       Array<rich string>          // 1..2 párrafos, <strong> permitido
roleStory:     { role: string, transition: string }
impactChange:  { state: string, statement: string } // state: 1 palabra o concepto humano
outcome:       rich string                 // conclusión en 2..4 líneas; <strong>/<em> permitidos
```

El panel izquierdo no admite una foto, workflow ni iconos de relleno: representa un cambio humano único y verificable. `roleStory` nombra a la persona y su punto de inflexión; `impactChange.state` es el sujeto tipográfico de la lámina (un concepto breve, por ejemplo “Autonomía”) y `impactChange.statement` lo aterriza en trabajo cotidiano. La consecuencia ocupa la columna opuesta. Así el agente compone una idea con masa visual en vez de inventar una ilustración para llenar el espacio. Las flechas Solar Bold son estructurales, no slots. La card inferior es deliberadamente **translúcida**, para que el degradado rico canónico siga presente; el agente no altera opacidad, divisores, tipografía ni jerarquía. Contrato: `tender-deck-composer-prototypes/human-impact-full.slots.json`. Prototipo: `human-impact-full.html`.

### `PricingFull` — contrato de slots (oferta económica)

Lámina económica de una sola jerarquía: el total es la cifra protagonista; el ledger inferior permite verificar con qué se compone y bajo qué condiciones se presenta. No es una calculadora, una tabla libre ni un set de cards de precio.

```text
sectionLabel?:  string
title:          rich string                 // <em> es un único acento editorial
summary:        { amount, period, taxNote } // tarifa propuesta, ya formateada y verificada aguas arriba
pricingOptions: Array<{ label, status?, scope, amount, isProposed }> // 2..3 alternativas, exactamente una propuesta
commercialTerms:Array<{ label, value }>     // 2..3 condiciones de forma/pago/vigencia/reajuste
```

El agente no calcula, suma, redondea ni inventa importes: recibe `summary.amount` y cada `pricingOptions[].amount` ya formateados y económicamente reconciliados. Las opciones son mutuamente excluyentes: **nunca** se presentan como un desglose que suma al importe héroe; `isProposed` debe ser `true` en exactamente una y esa tarifa debe coincidir con `summary.amount`. Si las bases exigen una planilla, impuestos, moneda o forma de presentación específica, esa evidencia prevalece sobre esta lámina y la salida se rechaza si contradice el formato obligatorio. El degradado rico canónico, la jerarquía tarifa propuesta → alternativas → condiciones y la única superficie de ledger son fijos. Contrato: `tender-deck-composer-prototypes/pricing-full.slots.json`. Prototipo: `pricing-full.html`.

### `RequirementsTableFull` — contrato de slots (matriz de cumplimiento)

Lámina de control para comprobar admisibilidad y trazabilidad antes de presentar. El resumen expone una sola lectura de control; la matriz demuestra requisito → evidencia → estado. No es una tabla libre ni una declaración de cumplimiento sin respaldo.

```text
sectionLabel?: string
title:         rich string
summary:       { value, label, detail }
requirements:  Array<{ kind: excluyente|puntúa, requirement, evidence, status: cubierto|en-revisión|riesgo }> // 3..5
```

Cada fila necesita una evidencia o ubicación real. Un excluyente sin respaldo se declara `riesgo`; nunca se omite para mejorar la apariencia de la matriz. El agente no altera la jerarquía de estado ni convierte la lámina en una planilla completa: si hay más de cinco requisitos, debe seleccionar los que deciden admisibilidad o derivar a un anexo. Contrato: `tender-deck-composer-prototypes/requirements-table-full.slots.json`. Prototipo: `requirements-table-full.html`.

### `ProcessStepsFull` — contrato de slots (método secuencial)

Lámina de una metodología ordenada en pasos, no un cronograma. La rail continua sólo representa la secuencia lógica: no muestra meses, duración ni actividades simultáneas (eso corresponde a `TimelineFull`).

```text
sectionLabel?: string
title:         rich string
steps:         Array<{ title, description, deliverable }> // 3..5, en orden de ejecución
```

La numeración es chrome posicional del renderer: el agente entrega los pasos en orden, no números, iconos, colores ni conectores. Cada paso necesita un entregable concreto; una metodología sin output verificable no es una credencial de ejecución. Contrato: `tender-deck-composer-prototypes/process-steps-full.slots.json`. Prototipo: `process-steps-full.html`.

### `CredentialsFull` — contrato de slots (credenciales verificables)

Prueba social de clientes, experiencias o certificaciones con atribución. No es un collage decorativo: cada marca debe estar autorizada para el caso de uso y conservar su fuente de respaldo.

```text
sectionLabel?: string
title:         rich string
supporting:    string
credentials:   Array<{ brandName, brandMark, relationship, evidenceRef }> // 4..6
```

`brandMark` es una referencia a un asset institucional aprobado; el renderer lo normaliza ópticamente sin redibujar el logotipo. `evidenceRef` es obligatorio y permanece trazable aunque no se muestre completo en el lienzo. Si no existe autorización o evidencia, la credencial se rechaza; nunca se sustituye por una marca inventada. Contrato: `tender-deck-composer-prototypes/credentials-full.slots.json`. Prototipo: `credentials-full.html`.

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

### `StatSplit` — contrato de slots (Texto+DatoDuro, bipartito)

Contexto editorial en el **panel de marca a la izquierda** y una lista de **3–5 resultados comprobables** a la derecha. No duplica `MetricsSplit`: aquel explica varios KPIs medidos; este expresa los outcomes que la propuesta debe habilitar, con valores solo cuando existe evidencia.

```text
eyebrow:         string
leftVisual:      ConceptVisual                  // asset obligatorio; objeto/ilustración, no retrato
title:           rich string                    // titular de oportunidad; <em> para acento real
narrative:       Array<rich string>             // 1..2 párrafos de contexto/cierre
outcomesEyebrow: string
outcomesTitle:   string
goals:           Array<{ kind, title, metric?, body, evidenceRef? }> // 3..5 objetivos
```

`leftVisual` ocupa un marco fijo de 205×205 px y se alinea con el titular: evita el vacío central del panel oscuro sin crear decoración arbitraria. `kind` se resuelve a iconografía fija Solar Bold/Iconify (`visibility | citability | coherence | learning | growth`); el agente no adjunta iconos ni cambia el color. `metric` solo se compone cuando tiene `evidenceRef`: sin fuente se usa lenguaje cualitativo o se rechaza. El renderer conserva el contraste, orden, divisores y escala. Contrato: `tender-deck-composer-prototypes/stat-split.slots.json`. Prototipo: `stat-split.html`.

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
eyebrow:   string            // contexto (Geist 600 uppercase tracked, muted)
title:     rich string       // hallazgo con acento violeta itálico (Poppins 600, sobre claro)
body:      Array<{...}>       // 1..2 párrafos cortos que enmarcan el chart (acentos violeta)
chart:     ChartSpec         // el gráfico dentro de una GLASS CARD — ver reglas abajo
heroStat:  { value; label }  // dato-héroe (el multiplicador/insight que cristaliza el argumento)
```

**Reglas del chart (piso `dataviz-design` + pase de impacto `design-studio`/`modern-ui`):**

- **Tipo por pregunta, no por dato.** El prototipo responde *"¿SKY domina el Share of Voice?"* → **horizontal bar chart** (comparación entre categorías; encoding posición/longitud = el más preciso de Cleveland-McGill). Para "tendencia" usar línea; para "una métrica sola" es `StatSplit`, no `ChartSplit`.
- **Barras desde 0** (regla dura; la longitud codifica el valor). **Valores etiquetados** (nunca tooltip-only; el deck es estático). Nombres honestos (`Líder de categoría` / `Competidor directo`), **NUNCA inventar marcas** ni fabricar cifras (mismo criterio ilustrativo + fuente que `MetricsSplit`).
- **Resaltar el sujeto con MÁS de un canal**, no solo color: la barra de SKY va **teal con gradiente + glow**, valor grande teal; el resto son barras del campo con **matiz azul de marca** (`rgba(120,172,248,…)` → `rgba(58,116,214,…)`), NUNCA gris/blanco-alpha plano (se ve placeholder).
- **Anotación de brecha = el clímax narrativo (no decorativa):** una **línea de "techo"** (nivel del líder) que baja hasta el sujeto + la distancia etiquetada en píldora (`+N pts a cerrar`). Convierte el dato en argumento (el techo = la oportunidad del plan).
- **Dato-héroe (`heroStat`) obligatorio:** un número que *grita* la conclusión (ej. `2,8×` "lo que el líder concentra frente a SKY"), en teal con glow, arriba-derecha de la card. Sin él la lámina "no impacta" (aprendizaje 2026-07-11: barras solas = se leen como formulario, no como argumento).
- **El chart va en una GLASS CARD** (single-layer: `rgba(255,255,255,.055)` + borde `rgba(255,255,255,.14)` + sombra + highlight inset) sobre el **degradado rico** (azul `#196df2` → navy diagonal + glow teal + glow violeta `#6717cd` + **textura de puntos ~9%**). La card aterriza el chart (deja de flotar) y suma profundidad; el degradado rico + grain es el que da el impacto premium.
- **Estático = HTML/CSS tokenizado**, no runtime de charts. Si una plantilla futura necesita charts ricos/animados fuera del deck, la política Greenhouse es ECharts (no aplica al render print).

Prototipo vivo: `chart-split.html` (render `PREVIEW-chart-split.png`) — AI Share of Voice de SKY vs. categoría: glass card + hero `2,8×` + barras (SKY teal glow) + anotación de brecha `+32 pts a cerrar`, sobre degradado rico. Registro institucional.

### `SectionDividerSplit` — contrato de slots (divisor de sección, bipartito · 2 variantes)

**Lámina de transición entre capítulos del deck** (el node del Figma viene en blanco: solo el panel de marca). Panel de marca con un **número de sección héroe** + título + lead; lado claro con una **mini-agenda** de lo que trae la sección (útil, no vacío).

```text
sectionNo: string            // "02" — número héroe (Geist 600 tabular, ~190px, teal + glow)
kicker:    string            // "Sección" (Geist 600 uppercase tracked, teal)
title:     string            // título de la sección (Poppins 600 blanco, ~78px)
lead?:     string            // una línea de contexto (Geist muted)
agenda?:   Array<{ n; k; v }>// "en esta sección": 01/02/03 (n) + título (k) + descripción (v), sobre claro, acentos violeta
variant:   'right' | 'left'  // qué lado ocupa el panel de marca (2 variantes espejo del Figma: 6:12498 brand-izq / 4:151 brand-der)
```

- **El número de sección es el héroe visual** (teal, glow) — es lo que hace de "respiro/capítulo". Título blanco debajo (color distinto → no compiten).
- **Mini-agenda opcional** en el lado claro: da utilidad al divisor sin llenarlo (numeración + label Poppins + descripción muted, divisor punteado). Si no hay agenda, el lado claro respira.
- **2 variantes espejo** para alternar dividers a lo largo del deck (evita que todos los capítulos abran del mismo lado). Degradado rico con la orientación del lado que corresponda.

Prototipo vivo: `section-divider-split.html` (render `PREVIEW-section-divider-split.png`) — "Sección 02 · El método" + agenda (Enfoque / Producción editorial / Medición), variante brand-izquierda.

### `CardGridFull` — contrato de slots (narrativa + grid de tarjetas · full-bleed · skill `modern-ui`)

**Lámina full-bleed** (NO bipartita: una sola superficie de degradado, contenido en 2 columnas encima). Izquierda = **columna narrativa** (eyebrow + titular + cuerpo + caja destacada); derecha = **pregunta de sección + grid 2×N de tarjetas glass**. Sirve para un **stack de capacidades / servicios / herramientas** (el Figma lo usaba para herramientas de marketing con logos de terceros; nosotros lo usamos con **capacidades propias + íconos Solar**, sin logos ajenos).

```text
eyebrow:   string            // Geist 600 uppercase tracked, teal
headline:  rich string       // Poppins 600 blanco, con acento teal itálico (cursiva real)
body:      Array<string>     // 1..2 párrafos cortos (blanco)
highlight: rich string       // caja destacada (glass sutil) con la tesis; acento teal itálico
question:  string            // encabezado de la derecha (Poppins 600 blanco)
cards:     Array<{ icon; title; lead; rest }>  // 4..6 tarjetas (grid 2 col); icon = Solar Bold
```

**Reglas (piso `modern-ui` aplicado):**

- **Degradado full-bleed orientado (contraste dirigido):** **oscuro a la izquierda** (`#001a33`→`#023c70`) donde va el **texto blanco** narrativo (pasa contraste), **vibrante a la derecha** (`#196df2`) donde saltan las tarjetas claras. Glows teal top-right + violeta bottom-left + textura de puntos. (No es la receta de panel de las Split; es su variante full-bleed dirigida.)
- **Tarjetas glassmorphism MILKY (frosted, NO sólidas, pero legibles)** con **texto navy**: fondo **frosted claro** (`linear-gradient(rgba(255,255,255,.72)→.56)`) + **`backdrop-filter: blur(24px) saturate(130%)`** → se ve el degradado **difuminado** a través (tinte azul), borde de luz `rgba(255,255,255,.6)` + highlight inset. **Glass de UNA capa** (nunca apilar frosted). **Punto medio calibrado (2026-07-11):** `.95` sólido se veía "pesado/no glass"; `.42` translúcido **perdía el texto**; `~.64–.72` milky = frosted + legible (el `blur` es lo que vende el vidrio, no la baja opacidad). Cuerpo navy `#2b3a5c`.
- **Ícono Solar Bold** en contenedor **teal-tint** (`rgba(54,200,191,.18)` + borde teal), color del ícono = teal profundo `#0c7d75` (pasa 3:1 sobre el vidrio; no el teal brillante).
- **Grid parejo** (gutter ~22px, tratamiento de tarjeta idéntico) → 4–6 tarjetas sin verse cargadas. Título Poppins + `lead` bold + `rest` regular muted.
- **Caja destacada** = glass sutil (`rgba(255,255,255,.08)` + borde) con la tesis en Poppins 600 + acento teal itálico. Ancla el cierre de la narrativa.
- **NUNCA logos de terceros** dibujados a mano; capacidades propias con íconos Solar (marcas de terceros reales seguirían su regla de isotipos, no aplica acá).

Prototipo vivo: `card-grid-full.html` (render `PREVIEW-card-grid-full.png`) — "¿Qué opera Efeonce en la cuenta de SKY?" + 6 capacidades (SEO · AEO · editorial · Data Hub · medición · gobernanza), registro institucional.

### `TimelineFull` — contrato de slots (cronograma / plan de trabajo · full-bleed · skill `dataviz-design`)

**Gantt full-bleed** — la sección "plan de trabajo y cronograma" del bid (puntúa). NO viene del Figma: diseñada como **visualización de datos**, no decoración. Fases = **barras de rango** sobre un eje temporal; hitos = **diamantes** con línea conectora; actividad continua = barra **dashed**.

```text
title:      string           // "Cronograma del proyecto · <cliente>" (Poppins 600 blanco)
eyebrow:    string           // "Plan de trabajo" (Geist 600 uppercase, teal)
meta:       rich string      // resumen arriba-derecha ("N meses · N fases…", tabular)
units:      string[]         // eje: "Mes 1"…"Mes N" (Geist tabular, uppercase, muted = scaffolding quieto)
phases:     Array<{ n; title; desc; start; end; continuous? }>  // barra por fase; posición = fracción del eje (start-1)/N … end/N
milestones: Array<{ label; sub; at }>   // diamante teal + label; at = fracción del eje
```

**Reglas (piso `dataviz-design` + jerarquía `typography-design`):**

- **Encoding correcto:** fase = **barra de rango** posicionada por fracción de mes (`left=(start-1)/N`, `width=(end-start+1)/N`); hito = **marcador diamante** con **línea conectora** que baja por las fases (convención Gantt: marca la fecha en toda la vista); actividad continua = barra **dashed outline** (always-on). Grilla mensual **sutil** (`repeating-linear-gradient`), sin ejes recargados; todo etiquetado + **leyenda**.
- **Jerarquía de texto (escalonada, calibrada 2026-07-11):** título slide (52) › **título de fase (27, Poppins, domina el chart)** / hito (18) › eje-mes (16 uppercase muted = scaffolding) / número de fase (16 teal, índice subordinado) › descripción (15 muted) › label de barra (14). El número de fase **NO** compite con el título (era 20 vs 24 → 16 vs 27).
- **Full-bleed dark-even:** navy en todo el ancho (blanco legible en cualquier punto) + glows teal/violeta en esquinas + grain. NO el degradado rico de Split (que se aclara en un borde y perdería el texto blanco del otro extremo del eje).
- **Datos ilustrativos** marcados; el cronograma real se ajusta al plazo de las bases. Las fases muestran **solapes** (dependencias/holgura), no una escalera perfecta.

Prototipo vivo: `timeline-full.html` (render `PREVIEW-timeline-full.png`) — plan de 6 meses de SKY (5 fases + 3 hitos), registro institucional.

### `TeamSplit` — contrato de slots (equipo / squad · bipartito)

La sección **equipo** del bid (puntúa: el evaluador cruza CV/rol/dedicación vs requisito). Bipartito: **panel de marca izq** con la tesis del squad + **roster de tarjetas de rol** sobre claro.

```text
eyebrow:   string            // "El equipo" (teal)
headline:  rich string       // tesis del squad (Poppins 600, acento teal itálico) — ej. "…un responsable único"
lead:      string            // una línea de modelo de equipo (blanco muted)
highlight: rich string       // caja destacada (glass) con la promesa (acento teal)
members:   Array<{ icon|photo; role; desc; dedication }>  // 4..6 filas-tarjeta
```

**Reglas:**

- **Roster = tarjetas cohesivas, NO filas flotando.** Cada rol es una **tarjeta** (blanco, sombra suave, radio) con **gap ajustado parejo** (~20px) en bloque centrado. **Aprendizaje 2026-07-11 (design-studio):** `space-between` sobre filas sin fondo deja **huecos disparejos y aire excesivo**; la solución es card-bg + gap fijo + bloque cohesivo (el espacio alrededor = negativo intencional, no gaps).
- **Jerarquía por tarjeta:** **rol** (Poppins 25 navy, domina) › **descripción** (15 muted) › **dedicación %** = dato (Geist tabular, violeta, columna derecha alineada). El avatar = chip teal circular.
- **Honestidad:** avatar = **ícono de rol Solar**, NO caras/nombres fabricados; el slot acepta **foto + nombre reales** en un bid real. Muestra la **estructura de roles + dedicación** (lo que puntúa), no gente inventada.
- Datos ilustrativos; las dedicaciones % son ejemplo (suman >100% porque son varios part-time, realista para un squad).

Prototipo vivo: `team-split.html` (render `PREVIEW-team-split.png`) — squad de 5 roles para SKY (Lead · Estratega · Editor · Técnico · Analista) con dedicación, registro institucional.

### `CaseStudySplit` — contrato de slots (caso acreditado · bipartito · dirección `design-studio`)

La sección **experiencia/casos** del bid (en público la experiencia se **acredita**, no se afirma). Un caso = una mini-historia con arco **reto → enfoque → resultado**; **el resultado es el clímax**. Bipartito: **historia sobre claro izq** → **el pago (resultado) en panel de marca der**.

```text
eyebrow:    string           // "Caso · <sector anonimizado>"
title:      rich string       // titular de transformación (Poppins 600, acento violeta) — ej. "De invisible a citada"
stages:     Array<{ overline; text }>   // reto → enfoque → aprendizaje (3 beats; overline violeta uppercase)
result: {
  hero:      { value; label }  // MÉTRICA HERO = el clímax (Geist tabular ~132px, teal + glow) — ej. "×3,2"
  beforeAfter: { before; after; caption }  // barras que VISUALIZAN el salto (el ×N es ese salto)
  chips:     string[]          // 1..2 datos de apoyo (glass)
  source:    string            // atribución: "resultado acreditado · <periodo>"
}
```

**Reglas (dirección de arte `design-studio`):**

- **Un solo foco = el resultado.** La métrica hero (`×N` / `%`) domina el panel de marca en teal con glow. Todo lo demás la alimenta. NUNCA tres métricas del mismo tamaño compitiendo.
- **Flujo narrativo izq→der:** la historia (reto/enfoque/aprendizaje) se lee primero y el ojo aterriza en el resultado (panel de marca = destino). Recorrido 1→2→3.
- **Mostrar la transformación, no solo contarla (aprendizaje 2026-07-11):** el hero + **barras before→after** (`antes` corta muted → `después` alta teal+glow) hacen el salto *visceral* y **llenan el panel** (evita el vacío inferior). Las barras ya llevan el `%` → NO repetir una línea de texto `12%→38%` (triple redundancia).
- **Prueba/atribución obligatoria:** chips de apoyo + `source`. Caso **anonimizado por sector**, valores **ilustrativos marcados** — NUNCA fabricar un cliente real; el slot acepta el caso real acreditado en un bid.
- **Jerarquía:** hero (132) › titular (44) › overlines de etapa › valores de barra (30) › cuerpo (23) › fuente (16). Acento **teal sobre el panel oscuro**, **violeta sobre el claro**.
- **Tercer beat "El aprendizaje"** equilibra el peso de la mitad izquierda (evita que la historia quede lean vs. el resultado denso).

Prototipo vivo: `case-study-split.html` (render `PREVIEW-case-study-split.png`) — caso anonimizado retail: `×3,2` Share of Voice en IA (12% → 38% en 6 meses), registro institucional.

### `AgendaFull` — contrato de slots (índice / agenda de apertura · full-bleed · nav)

Lámina de **apertura** que da el mapa de la propuesta (wayfinding). Full-bleed dark-even + header + **grid 2×N de capítulos clickeables** + footer. Se escanea en 3 s.

```text
eyebrow:  string             // "La propuesta" (teal)
title:    string             // "Agenda" (Poppins 600 ~66px, domina)
count:    rich string        // "N capítulos · <contexto>" (tabular)
chapters: Array<{ n; title; desc; targetSlideId }>   // 4..8 ítems (ver overflow)
footer:   { left; right }    // línea inferior que enmarca (ej. "Propuesta técnica · SKY" · "efeoncepro.com")
```

**Navegación — cada ítem es CLICKEABLE (regla dura):**

- Cada capítulo se renderiza como **`<a class="ch" href="#<targetSlideId>">`** — es un **deep-link a su sección/slide**, no texto decorativo. `targetSlideId` = el id del **`SectionDividerSplit`** (o del primer slide) de ese capítulo.
- **En el deck interactivo (HTML):** el click salta a la sección (con `scroll-behavior`/anchor) + affordance de hover (borde teal, título teal).
- **En el PDF (Chromium `print-to-pdf`):** el ancla se preserva como **link interno de PDF** — el índice queda navegable en el PDF entregado. (Es la lectura *Full API Parity* de una agenda: una surface de navegación con destinos reales, no una imagen.)
- El composer **debe** poblar `targetSlideId` de cada capítulo con un id real del deck; un ítem sin destino es un error de composición (agenda que no navega).

**Overflow — qué hacer si crece más allá de estos ítems (regla dura):**

- **Rango sano = 4–8 capítulos** (una agenda se **escanea**, no se lee). Preferir **6** (2×3, la referencia).
- **7–8 capítulos:** el grid pasa a **2×4** (misma columna, una fila más); `row-gap` se ajusta y la escala del número baja **un paso** si hace falta. Sigue en **una** lámina.
- **> 8 capítulos → NO cram:** un índice con >8 top-level significa que el deck tiene demasiados capítulos de primer nivel. **Restructurar**, no encoger la tipografía:
  - **(preferido)** **agrupar en Partes** (ej. "Parte 1 · Entendimiento" con sub-capítulos), y la agenda lista las Partes.
  - o **consolidar** capítulos afines en uno.
  - **NUNCA** dividir la agenda en 2 slides ("Agenda 1/2") como default — es smell de estructura; solo válido si las bases exigen un TOC largo literal.
- **Títulos largos:** una línea; si un título no cabe en su celda, acortar el copy (no reducir la escala global). El `desc` es **una** línea corta, opcional.

Prototipo vivo: `agenda-full.html` (render `PREVIEW-agenda-full.png`) — 6 capítulos clickeables de la propuesta SKY (Contexto → Enfoque → Plan → Equipo → Casos → Inversión) + footer.

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

## Reparto de trabajo — catálogo COMPLETO (multi-agente Claude ↔ Codex, 2026-07-11)

**Las 11 plantillas del catálogo están construidas ✅.** Reparto final:

- **Claude:** `CoverFull` · `BulletListSplit` · `NarrativeSplit` · `MetricsSplit` · `QuoteSplit` · `ChartSplit` · `SectionDividerSplit`.
- **Codex:** `DualTextSplit` · `ComparisonSplit` · `StatSplit` · `DualListSplit`.
- **Regla de convivencia (siguió vigente):** cada agente editó **solo la sección de su plantilla**; degradado rico unificado (Rule 1) en todos los paneles de marca.
- **Siguiente milestone (en conjunto):** `registry` (`template → node-id → content-type → slots`) + `selector` agéntico (el agente elige la plantilla por tipo de contenido). Se hace ahora que están las 11.

> **Nota:** el catálogo del Figma (11) + las full-bleed agregadas (`CoverFull`, `BackCoverFull`, `HighlightWave`, `FourPillarsFull`, `CardGridFull`) suman **16 plantillas**. Faltan las de abajo para cerrar el **arco completo de un bid deck**.

## Plantillas faltantes — gap de licitación (roadmap, 2026-07-11)

Gap-analysis contra la **anatomía de la oferta técnica que puntúa** (skill `greenhouse-public-private-tenders` → `propuesta-tecnica-economica.md`). El set actual cubre *comprensión · metodología (paralela) · diagnóstico · valor diferencial · capacidades*, pero **NO cubre** secciones que puntúan fuerte o evitan el descarte. Estas plantillas **no vienen del Figma**: se diseñan aplicando el molde ya canónico (degradado rico, tipografía, íconos Solar, glassmorphism).

| # | Plantilla propuesta | Sección del bid que cubre | Tier (peso p/ganar) | Owner |
|---|---|---|---|---|
| 1 | **`TimelineFull`** ✅ | plan de trabajo / **cronograma** (hitos, entregables, dependencias, holgura) | **T1** must-have · puntúa | **Claude** · construido |
| 2 | **`TeamSplit`** ✅ | **equipo / squad** (rol · dedicación % · respaldo); el evaluador cruza CV vs requisito | **T1** must-have · puntúa | **Claude** · construido |
| 3 | **`PricingFull`** ✅ | **oferta económica / inversión** (total · desglose cotizado · condiciones) | **T1** must-have · sobre económico | **Codex** |
| 4 | **`RequirementsTableFull`** ✅ | **matriz de cumplimiento** técnico × SLA (item por item) — *evita el descarte* | **T1** must-have · admisibilidad | **Codex** |
| 5 | **`CaseStudySplit`** ✅ | **caso acreditado** con arco contexto → acción → resultado + métrica (la experiencia se acredita, no se afirma) | **T2** eleva | **Claude** · construido |
| 6 | **`ProcessStepsFull`** ✅ | metodología **secuencial** 1→2→3→4→5 (distinta de `FourPillars`, que es paralelo) | **T2** eleva | **Codex** |
| 7 | **`AgendaFull`** ✅ | **índice / agenda** de apertura del deck | **T2** eleva | **Claude** · construido |
| 8 | **`CredentialsFull` / `LogoWall`** ✅ | **clientes / credenciales** (prueba social por logos; distinta de capacidades) | **T3** nice-to-have | **Codex** |

**Reparto (4 / 4):**

- **Claude:** `TimelineFull` → `TeamSplit` → `CaseStudySplit` → `AgendaFull`.
- **Codex:** `PricingFull` → `RequirementsTableFull` → `ProcessStepsFull` → `CredentialsFull`.
- **Regla de convivencia (vigente):** cada agente edita **solo su fila de catálogo + su contrato**; molde canónico (degradado rico, tipografía, Solar, glassmorphism milky, acento teal-oscuro/violeta-claro) aplica a todas; contenido de referencia = caso **SKY**, registro institucional (sin tuteo). Las que impliquen datos (pricing, requisitos) usan cifras **ilustrativas** marcadas, nunca fabricadas como reales.
- **Prioridad:** Tier 1 primero (mueven la adjudicación), luego Tier 2, luego Tier 3.

## Registry + Selector — el cerebro del composer (v0.1, 2026-07-11)

Formalizado como artefacto **machine-readable**: **`tender-deck-composer-prototypes/registry.json`** (patrón de los `*.slots.json`). Es el índice canónico que el selector agéntico + el renderer consumen.

**Modelo:**

1. **Taxonomía de content-types** (23): `cover · back-cover · agenda · section-divider · narrative · statement · highlight · bullet-list · dual-list · dual-text · one-metric · several-kpis · chart · comparison · capabilities-grid · four-pillars · process-sequential · timeline · team · case-study · credentials · pricing · requirements-table`.
2. **Registry:** cada plantilla declara `name · kind (split/full-bleed) · source (figma node | gap | design) · owner · status · contentTypes[] · prototype · slotsRef` (+ flags: `nav`, `overflow`, `variants`, `rightSlot/leftSlot`, `requires`).
3. **Selector:** el agente **clasifica el contenido** de cada slide en un content-type → el selector devuelve la plantilla cuyo `contentTypes` lo incluye (match declarativo 1:1). Las **reglas de desambiguación** resuelven los solapes (ver `registry.json → selector.disambiguation`), p.ej.:
   - métrica: **una** hero → `StatSplit`; **varios** KPIs → `MetricsSplit`; con **gráfico** → `ChartSplit`; como **resultado de caso** → `CaseStudySplit`.
   - N ítems: **pilares** paralelos → `FourPillarsFull`; **pasos** secuenciales → `ProcessStepsFull`; **fases en el tiempo** → `TimelineFull`.
   - texto fuerte: **statement/quote** → `QuoteSplit`; **frase destacada** → `HighlightWave`; **prosa** → `NarrativeSplit`.

**Reglas duras del selector:** un slide = un content-type = una plantilla (mezcla → dividir en dos slides); **NUNCA freehand** (si nada calza, falta una plantilla → abrir gap, no improvisar); el renderer sólo llena slots declarados; datos de cliente reales o **ilustrativos marcados**; registro institucional.

**Estado del milestone — ✅ CERRADO (2026-07-12).** Este bloque listaba pendientes que **ya no lo son**;
se deja la foto real para que nadie los vuelva a "hacer":

- **`slotsRef`: 25/25.** Todas las plantillas tienen su `*.slots.json` enlazado en el `registry.json`
  (el bloque decía "hoy sólo `CoverFull`" — falso desde el 2026-07-11).
- **Selector cableado a código:** `selector.ts` consume el `registry.json` como SoT ejecutable y
  `auditRegistry()` valida su cierre referencial **en cada compose** (un content-type sin plantilla, o
  una plantilla sin `slotsRef`, revientan el deck). El registry ya **no** es doc-only.
- **Único pendiente real:** `registry.schema.json` (validación del propio registry) — opcional, hoy
  cubierto por `auditRegistry()` + el test `selector.test.ts`.

## Arquitectura del runtime del composer — cómo se compone el deck (v0.1, dirección `arch-architect`)

### En simple (la analogía de la revista)

Armar el deck es como producir una **revista de propuesta**. Casi nada necesita "inteligencia": elegir la plantilla, rellenarla y exportar el PDF es **mecánico** (una máquina, siempre igual). La IA sólo hace falta en **dos partes que piensan**:

1. **El director** (una IA) arma el **índice**: qué capítulos y en qué orden.
2. **Los editores** (varias IA) escriben el contenido, **uno por capítulo, en paralelo** (por eso es rápido).

Luego: **un revisor** (IA) chequea que no haya datos inventados, tono formal y coherencia → **la máquina imprime** las slides → **el humano aprueba antes de que salga**. Nada se envía solo (regla de licitaciones: no se manda oferta sin firma humana). Como la parte mecánica es fija, **el mismo contenido siempre da el mismo PDF** (auditable).

*Uno por capítulo, no por slide:* las slides de un capítulo comparten datos; una IA por slide (15-25) es más cara y pierde el hilo. Por capítulo son ~6-8 editores, se coordinan mejor.

### La decisión de arquitectura

**Orquestador + subagentes SÍ, pero acotado a UN paso; el resto determinista.** El composer no es research abierto (donde el multi-agente brilla); es un **pipeline determinista** con **2 nodos de juicio**. La cantidad de superficies justifica **fan-out en la autoría**, no volver todo agéntico (doctrina `arch-architect`: determinista antes que multi-agente; el peso de la prueba lo carga lo exótico).

| Determinista — **sin LLM** | Agéntico — **juicio** |
|---|---|
| **Selector** (content-type → plantilla = lookup en `registry.json`) · **slot-fill** · **render HTML→PDF** · ensamblado · orden de páginas · deep-links de agenda | **Outline del deck** (capítulos, orden, arco) · **autoría por capítulo** (copy institucional, qué métrica destacar, armar el caso) |

Topología (Workflow determinista + agentes en 2 nodos):

```text
intake (requisitos del bid + método 10-fases)
  └─(agente) ORQUESTADOR → outline = [ { capítulo, content-types, brief, targetSlideIds } ]
        └─ fan-out DETERMINISTA sobre CAPÍTULOS:
              (agente) chapter-author → slots JSON por slide   [el SELECTOR elige plantilla, determinista]
        └─(agente) VERIFIER → registro · integridad de datos · coherencia · barra KV
  └─ DETERMINISTA: slots+plantilla → HTML → PDF · ensambla · pagina · agenda deep-links
  └─ [HUMANO confirma/exporta]   ← acción gobernada; nada "se envía" antes de esto
```

**Encaje Greenhouse:**

- **Full API Parity / propose→confirm→execute:** los subagentes **proponen** el deck (borrador); el LLM **nunca escribe estado ni "envía"**; el humano confirma/exporta. Mapea 1:1 a la regla del método (nunca enviar oferta sin sign-off).
- **Integridad de datos (defensa en profundidad):** el `VERIFIER` marca cifras fabricadas / register no-institucional / fuentes faltantes → datos reales o **ilustrativos marcados**, nunca inventados.
- **Reproducibilidad/auditoría:** el artefacto auditable son los **slots JSON**; re-render de los mismos slots es **determinista** (mismos slots → mismo PDF). Trace-ID por subagente, costo por agente, replay desde slots.
- **Costo:** sólo pagan tokens el outline + N capítulos + 1 verifier (acotado); el render (lo voluminoso) es gratis en tokens.

**NUNCA:** LLM en render/selector/ensamblado (rompe reproducibilidad) · fan-out por slide por defecto · recursión de subagentes (**profundidad = 1**) · scratchpad mutable compartido (result-only; contexto read-only del molde/registro/caso) · auto-submit · fabricar datos.

**Dependencias — corregido 2026-07-11 (v0.2).** La v0.1 declaraba como *dependencia dura* el `src/lib/ai/agent-runtime` (tool-runner) "que no existe". **Falso en ambas mitades:**

- **Existe prior art:** Nexa corre un tool loop en producción (`src/lib/nexa/providers/{anthropic,gemini}.ts` + `nexa-tools.ts` + `nexa-turn-telemetry.ts`), single-hop. (`src/lib/ai/greenhouse-agent.ts` **no** es prior art pese al nombre: single-shot de Gemini, sin tools.)
- **El composer no lo necesita:** sus 3 nodos de juicio (orquestador · chapter-author · verifier) producen **structured output** sobre **contexto read-only** — no tool-chains. Eso ya lo cubre `generateStructured{Anthropic,Gemini,OpenAI}` en `src/lib/ai/`, y el fan-out es `Promise.all` en TS.

El `agent-runtime` queda como **evolución de plataforma** (no bloquea el composer). Si algún día se construye, es **extracción/generalización del loop de Nexa** (strangler), **NUNCA** un segundo loop paralelo, y con task propia.

**✅ ADR promovido (2026-07-11):** esta topología es ahora **`GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` → §5-ter (Accepted)**, con 4-pilar, alternativas rechazadas y hard rules. Esta sección queda como la explicación larga; **el ADR manda**.

### Capa de assets / imágenes del deck (3D icons + personas) — frontera runtime vs out-of-band

Sumaremos imágenes al deck: **3D icons** y **personas**. Los assets de imagen son **slots** (`3DIcon`, `PersonaAsset`, `ConceptVisual`), NO se generan al vuelo en el render. Reglas duras (alineadas con CLAUDE.md §AI image + §MCP creativos):

- **Generación de imágenes = SIEMPRE el generador canónico** `src/lib/ai/image-generator.ts` / `generateImage()` / `pnpm ai:image` (OpenAI **GPT Image** / "ChatGPT Imagen 2", secret `greenhouse-openai-api-key`; Imagen/Higgsfield-Recraft para vectores). **NUNCA** un SDK/cliente paralelo ni script ad-hoc. Dirección de arte del asset → skill `greenhouse-ai-image-generator` + `design-studio`. Precedente: personaje 3D Nexa (GPT Image edit + remove-bg local).
- **Remove-bg — frontera crítica:** los **MCP creativos (Adobe, Figma, Higgsfield, Magnific) son OUT-OF-BAND, solo-sesión-Claude, NUNCA runtime.** Por lo tanto:
  - **Fase de diseño (out-of-band):** Claude/humano produce los assets reusables con GPT Image + remove-bg (Adobe Creativity MCP OK acá) y los guarda en la **librería de assets con un `assetId`**.
  - **Runtime (composer):** usa el **remove-bg del repo** (sharp local / runtime-safe). El **Adobe MCP NO es un paso del composer**.
- **Dos modos, preferir el primero:**
  1. **Assets pre-producidos out-of-band (preferido):** el composer **referencia** por `assetId` → runtime determinista y reproducible.
  2. **Runtime gen (si hace falta):** paso **async gobernado** que llama `generateImage()` + remove-bg del repo; el asset generado se **pinea por hash** (se cachea, no se regenera por render) — si no, se rompe *"mismo contenido = mismo PDF"*.
- **Guardrail de honestidad (personas):** **equipo = fotos REALES** del squad, **NUNCA caras IA fabricadas** (el evaluador cruza CV vs persona → tergiversación). Persona **decorativa/ilustrativa** = IA con **criterio de disclosure**, jamás presentada como "tu equipo". **3D icons =** preferir la **librería propietaria de ilustraciones Efeonce**, o generar en ese estilo.

**`ContextualVisualSlot` (Proposed, 2026-07-12).** Cuando una lámina requiera una imagen que cambie con su contenido, no recibe un `imageUrl` decorativo: declara un slot semántico cuya intención se deriva del `SlideSpec` (idea, claims, audiencia y safe area de la plantilla), se confirma, se genera/curaduría fuera del renderer y termina como `assetId` aprobado. El composer sigue consumiendo sólo referencias versionadas y por eso conserva su determinismo. El contrato completo —políticas de evidencia/personas, provenance, commands y piloto por template— vive en [`tender-deck-composer-prototypes/CONTEXTUAL_VISUAL_SLOT_CONTRACT_V1.md`](tender-deck-composer-prototypes/CONTEXTUAL_VISUAL_SLOT_CONTRACT_V1.md). No autoriza todavía generación runtime ni slots virtuales sin markup.

### Dirección de arte de los 3D icons — **clay 3D mate** (decidido 2026-07-11)

**El estilo es `clay 3D mate`**, anclado a AXIS: material arcilla mate, formas gruesas y muy redondeadas (sin aristas), luz key suave arriba-izquierda, sombra de contacto sutil, perspectiva 3/4, color plano saturado por objeto, sin textura. **Referencias canónicas en Figma** (`Sistema Axis — PPT`, fileKey `GXYeJaRjotmFuczfnd8hLi`): nodo **`5:3133`** (trofeo — objeto suelto) y nodo **`5:12352`** (embudo agrietado con elementos satélite — escena conceptual). Ambos son **rasters embebidos**, no vectores.

**Regla: CURAR antes que GENERAR.** El equipo ya produjo dos librerías clay:

| Librería (OneDrive) | Contenido | Uso |
|---|---|---|
| `7. Branding & Diseño/01. Material Marca (Axis)/04. Iconos 3D Claystyle` | 283 PNG, sin taxonomía | fuente cruda |
| `4. Comercial/01. Propuestas Plantillas/01. Libreria Assets/Iconos 3D` | 108 PNG **curados por categoría** (Generales · Métricas y KPIs · Negocios y estrategia · Equipo y Soporte · Web y tecnología · Diseño · Marketing) | **fuente preferida del deck** |

**Pero la librería es heterogénea y NO se usa tal cual** (auditoría 2026-07-11, sobre navy real). Criterio de selección — un asset entra al deck sólo si cumple los tres:

1. **Es un objeto, no un personaje cartoon.** Los monitos (`Equipo 1`, `team`, `Soporte IA`) contradicen el guardrail de honestidad: si el equipo va con **fotos reales**, meter personajes cartoon como "equipo" en la misma propuesta es incoherente — y lee a stock.
2. **Paleta que armoniza con el molde** (azul / violeta / teal sobre navy). Fuera: diana roja, robot naranja. Un deck que mezcla diana roja + robot naranja + puzzle cartoon **destruye la cohesión** que el molde construye.
3. **Mismo lenguaje de render.** Fuera los semi-realistas (`handshake`, `config-mano`: piel y reflejos, no clay).

**⚠️ El criterio se verifica montando el set sobre el fondo REAL, no asset por asset.** La primera curaduría (7 assets) **no aguantó su propio criterio**: al componer el set completo sobre el navy del deck, 3 curados violaban la paleta o la regla de cero-texto (`Calendario 2` rojo/naranja · `SEO.png` con **"SEO" quemado** + paleta caliente · `funnel` negro/dorado con símbolo `$`) y uno arrastraba un **halo blanco** del recorte. Un asset que "se ve bien" aislado puede romper la cohesión del conjunto — **y la cohesión es lo que el molde protege**.

**Set V1 → `assets/clay3d/`** (alpha real verificado, recorte por matting):

| Asset | Concepto (slot) | Por qué no se curó |
|---|---|---|
| `clay-ai-visibility` | visibilidad en motores de respuesta IA (AEO) | la librería sólo tenía SEO clásico, con texto quemado |
| `clay-guarantee-shield` | garantías / boleta de cumplimiento | el escudo de la librería está fuera de paleta y sin el documento sellado |
| `clay-method-steps` | método secuencial (`ProcessStepsFull`) | la librería sólo tiene flechas circulares (iteración ≠ secuencia) |
| `clay-timeline-schedule` | cronograma / hitos (`TimelineFull`) | el curado es **rojo/naranja** dominante |
| `clay-requirements-matrix` | matriz de cumplimiento (`RequirementsTableFull`) | el curado trae **rosa/amarillo** |
| `clay-search-visibility` | visibilidad en búsqueda orgánica | el curado trae **"SEO" quemado** + paleta caliente |
| `clay-compliance-certificate` | credencial acreditada (documento + sello) | el curado es un **documento blanco**: el matting lo devora sobre fondo claro |
| `clay-metrics-analysis` | métricas / diagnóstico | el curado trae **puntos naranjas** fuera de paleta |
| `clay-results-board` | resultados acreditados del caso | el curado trae trofeo rosa + alpha lavado |

**El set final quedó 100% generado.** No es un rechazo de la librería: es que **ninguno de los curados sobrevivió los tres filtros a la vez** (objeto no-cartoon · paleta azul/violeta/teal · cero texto). La librería sigue siendo la **primera parada obligatoria** — pero el criterio manda sobre la conveniencia, y el veredicto se emite mirando el set compuesto sobre el navy, no los thumbnails sueltos.

**Generación — sólo para el gap.** Lo que la librería no cubre (o cubre fuera de molde) se genera con el **generador canónico** (`pnpm ai:image`, GPT Image) anclado al subset: misma paleta azul/violeta/teal, **objeto único, sin personajes**, y **CERO texto/letras/números/logos en la imagen** (los modelos los deforman, y un asset con texto quemado no es reusable — la lección de `SEO.png`). Fondo plano → recorte con el matting del repo (`pnpm ai:image:rmbg`, AI matting), **NUNCA** color-key/`trim` (deja halo). Toda generación durable se registra en `ai-generations/2026-07-11_tender-deck-clay3d/` (prompts verbatim + auditoría).

### Fotos del squad — `assets/squad/` (resuelto 2026-07-11)

Los slots `PersonaAsset` exigen **fotos reales**. **Existen y viven en el repo**: `public/images/greenhouse/team/` — 7 **retratos corporativos** del equipo (posados, ropa formal, encuadre de headshot): Andrés · Daniela · Humberly · Julio · Luis · Melkin · Valentina.

- **Vienen con un fondo degradado magenta/azul quemado** que choca con la paleta del deck → se recortan con el matting del repo (`pnpm ai:image:rmbg`) y quedan con alpha, listas para componer sobre el navy. Set recortado: **`assets/squad/squad-<nombre>.png`**.
- **Ojo con el pie del busto:** las fotos vienen cortadas rectas abajo; sobre el navy el corte se lee como "guillotina". **Lo resuelve la plantilla** (contenedor o fade inferior), no el asset — no intentar arreglarlo re-recortando.
- **NO confundir** con `Alineación/5. Contenidos/01. Contenido Evergreen/Team Efeonce/EO_Team-*.png` en OneDrive: ésas son **piezas de redes sociales** ("Te presentamos a…", "Dato random: Potterhead", texto quemado sobre selfies de webcam) — **inservibles para un comité y no se arreglan recortando**.
- **Sigue vigente el guardrail:** una cara del squad **JAMÁS** se genera con IA (el evaluador cruza CV vs persona → tergiversación). Si falta la foto de alguien, se pide la foto; no se fabrica.

## Estado del runtime — F1 ✅ (el composer compone y **emite el PDF**, 2026-07-11/12)

El **camino determinista del ADR §5-ter está implementado y verificado end-to-end**:
`DeckPlan (JSON) → selector → validación → slot-fill → resolvers → geometría → render → PDF`.
**Cero LLM** en este camino.

### El CLI canónico

```bash
pnpm deck:compose <deck-plan.json> [--out <dir>]

# ejemplo real (4 láminas, caso SKY):
pnpm deck:compose docs/architecture/tender-deck-composer-prototypes/examples/sky-deck-plan.json
```

**`pnpm deck:compose` es el alias canónico** (`package.json`). El shim `--require server-only-shim.cjs`
está horneado en el script — invocar `tsx` a mano sin él **revienta** (`solar-icons.ts` importa
`server-only`). Si `--out` no se pasa, el `outDir` por defecto es **`.captures/tender-deck`**.

### El entregable: UN PDF de N páginas (no un puñado de PNGs)

Esto es lo que hace del composer un motor y no un previsualizador:

1. Cada lámina se imprime **por separado** con `page.pdf()` (una página, tamaño exacto del canvas).
2. Las N páginas se **mergean con `pdf-lib`** en `<tenderId>.pdf` — **el entregable real de la oferta**.
3. Se emite además un **PNG por lámina** (revisión visual) y el **`deck-plan.json`** (replay auditable).

Se descartó embeber las 25 plantillas en un solo HTML: cada una es un documento completo con su propio
CSS (todas definen `.slide`, `.brand`, `.eyebrow`…), así que concatenarlas haría que los estilos de una
pisen a los de otra. **Imprimir + mergear no tiene ese modo de falla.**

**Gate de peso = regla de admisibilidad, no estética.** `maxPdfMb` (default 20 MB) existe porque los
portales de licitación **rechazan** adjuntos sobre su límite. Un deck hermoso de 40 MB que el portal no
acepta es un deck que no existe. Hoy emite *warning*; el límite duro lo fija cada licitación.

### Los módulos

| Módulo (`src/lib/commercial/tenders/`) | Qué hace |
|---|---|
| `deck/selector.ts` | lookup determinista content-type → plantilla + audit de cierre referencial del registry. Un content-type desconocido **revienta** (significa "falta una plantilla", no "improvisá") |
| `deck/validate.ts` | `overflow: reject` — **nunca trunca**; y una cifra sin `evidenceRef` **no se compone** (anti-fabricación) |
| `deck/resolvers.ts` | **15 resolvers**: traducen valor semántico → presentación. El autor dice QUÉ es; el deck decide CÓMO se ve (ver tabla abajo) |
| `deck/render.ts` | llena el **DOM real de Chromium** (el browser que resuelve el contrato es el mismo que pinta), **verifica geometría** y captura PNG/PDF |
| `deck/compose.ts` | **valida TODO antes de renderizar NADA** (un PDF parcial de una oferta es peor que ninguno: parece completo) + mergea el PDF final |
| `tender-state-machine.ts` | **12 estados** del ciclo de la licitación + 3 gates humanos. ⚠️ **TS puro: NO hay tabla `tenders` en DB** — la persistencia es diseño, no runtime |

### Los 15 resolvers (`resolvers.ts`)

Un resolver traduce un **valor semántico** del `DeckPlan` a **presentación**. Existen para que el autor
del deck **no pueda** elegir el ícono, el ordinal ni el largo de una barra a mano:

| Familia | Resolvers | Qué garantiza |
|---|---|---|
| **Iconografía** (6) | `stat-goal-icon` · `four-pillars-icon-and-tone` · `team-role-icon` · `metrics-kpi-icon` · `card-grid-capability-icon` · `pricing-option-tone` | El ícono y el tono salen del `kind`, no del gusto. Un `kind` desconocido **revienta** (no cae a un ícono default) |
| **Ordinales / chrome derivado** (4) | `ordinal-number` · `timeline-phase-ordinal` · `section-number` · `chapter-anchor` | La numeración sale del índice del array. Nadie escribe "03" a mano y se equivoca |
| **Geometría — anti-fabricación gráfica** (5) | `case-study-before-after-bar-scale` · `chart-bar-geometry` · `timeline-phase-span` · `timeline-phase-bar-kind` · `timeline-milestone-position` | **La barra sale del número, o no sale.** Si el resolver falta, el deck aborta — ver "una lámina NO PUEDE MENTIR" |

`consumer: validation-only` (p. ej. `evidenceRef`) **nunca se pinta**: es munición interna para validar
la cifra, no copy para el comité.

El **`DeckPlan` es el artefacto auditable**; el PDF es una derivación suya. Ejemplo vivo:
`examples/sky-deck-plan.json` (cifras reales del grader, cada una con su `evidenceRef`).

### Lo que NO existe todavía (para que nadie lo asuma)

**Runtime Greenhouse = 0.** No hay API routes, ni UI, ni migración, ni capability/entitlement, ni outbox
event. **El único consumer del composer hoy es el CLI.** Cuando nazca la primera ruta o capability,
aplica **Full API Parity** completa: el composer ya es el primitive canónico en `src/lib/**` — la UI,
Nexa y MCP lo **consumen**, no lo reimplementan.

### ⚠️ La bug class del composer: el FALLO SILENCIOSO

Durante F1 apareció **tres veces** el mismo fallo, y es el peor posible acá: **la lámina sale con el
contenido de ejemplo del prototipo y nadie se entera** — un deck llegando al comité con el copy de
relleno de la plantilla.

1. Un campo de item sin `data-slot-field` en el HTML → el filler clonaba el blueprint y no escribía.
2. El tipo `object` no implementado en el filler → el KPI de la matriz decía **"3/3"** cuando el dato
   era **"4/4"**.
3. El tono del blueprint contagiando a los items → los **dos** planes marcados como "el propuesto".

**Cerrada de raíz:** cualquier tipo o campo que el filler no sepa llenar **aborta el deck**. **NUNCA**
agregar un `default:` silencioso ni un `continue` que deje pasar un slot sin escribir.

### ⚠️ La 2ª bug class: **el contrato que MIENTE sobre lo que cabe** (2026-07-12)

La validación de `validate.ts` cuenta **caracteres** contra `maxCharacters`. Pero un contrato puede
mentir: `FourPillarsFull` declaraba `thesis: max 150`, la tesis de SKY medía 100 — pasó validación
con holgura — y aun así **salió amputada en el PDF**: `…se vuelve sosteni|` cortado en seco.

La causa era aritmética, no de copy. El `.hero` declaraba:

```css
.hero { padding:66px 72px; grid-template-columns:30% 35% 35%; gap:46px; }
```

Los porcentajes de CSS Grid se calculan sobre el content-box y **no descuentan el `gap`**: los tracks
sumaban `100% + 2×46px`, así que la última columna terminaba **20px fuera del lienzo** — y
`.slide { overflow:hidden }` los cortaba **sin emitir nada**. El deck se veía terminado. El mismo
patrón estaba **latente** en `HumanImpactFull` (48%+52% + gap), invisible sólo porque el copy no
llenaba el track.

**Cerrada en tres capas:**

1. **Las plantillas** usan `minmax(0, Nfr)`, nunca `%`, cuando hay `gap` (`fr` reparte lo que queda
   **después** del gap, así que no puede desbordar).
2. **Runtime** — `assertSlideFitsCanvas` (`render.ts`) mide, **antes de imprimir nada**, cada nodo del
   contrato (`data-slot` / `data-slot-field`) contra su ventana visible real (el lienzo ∩ cada ancestro
   que clipea). Si algo queda recortado, la lámina **no se emite**: `SlideGeometryError` nombra el slot,
   los px y el texto amputado. Sólo audita nodos de contrato — los decorativos (glows, paneles a
   sangre, la burbuja de URL) **sangran a propósito** y auditarlos daría falsos positivos. Y el recorte
   interno sólo cuenta si la caja **realmente clipea** (`overflow != visible`): un titular cuyo
   `scrollHeight` excede su caja por 3px con `overflow:visible` se pinta entero — eso no es un recorte.
3. **Autoría** — `__tests__/template-geometry.test.ts` prohíbe el patrón `%`+`gap` en las **25**
   plantillas, incluso donde esté latente.

**NUNCA** asumas que "pasó `maxCharacters`" significa "cabe". El contrato declara una intención; el
único juez de la geometría es el layout real. Y **NUNCA** dejes que un recorte sea silencioso: un PDF
con una palabra guillotinada es peor que un fallo, porque parece terminado y nadie lo revisa dos veces.

### Contrato del HTML (lo que una plantilla debe declarar)

- `data-slot` + `data-slot-type` en el contenedor del slot.
- `data-slot-field` en **cada campo** de un item/objeto — si falta, el composer aborta.
- `data-slot-items` en el **contenedor de repetición**, cuando el slot tiene un encabezado fijo (una
  tabla): sin eso el filler clona el `<thead>` como si fuera una fila.

## Pendiente

**Hecho** (esta lista estaba desactualizada; se sincroniza 2026-07-12): las 25 plantillas ya tienen
`data-slot` + `*.slots.json`; el `registry.json` y el `selector.ts` ya están formalizados; y el
desborde del `thesis` de `FourPillarsFull` quedó **cerrado de raíz** (ver "La 2ª bug class").

- **Los 3 nodos de juicio** (orquestador · chapter-authors · verifier) — **F2, el próximo hito**. Todo
  el carril determinista (selector → validación → slot-fill → geometría → render) ya está.
- **Verde fuera de paleta** en `StatSplit` (íconos + métricas) y en los tonos `ai`/`human` de
  `FourPillarsFull`: el molde no tiene verde (acento teal-sobre-oscuro / violeta-sobre-claro).
- **Embeber fuentes** (Poppins/Geist) para runtime self-contained — hoy Chromium las pide a Google
  Fonts por red, así que el render **no es hermético**: sin red, el deck sale con la tipografía de
  fallback. Al embeberlas se puede bloquear `http(s)://**` en el render y cerrar el determinismo.
- **Ritmo vertical de `PricingFull`**: hay un vacío grande entre el header y el panel de planes.
- Jugar con el token `--axis-violet` en variantes.
