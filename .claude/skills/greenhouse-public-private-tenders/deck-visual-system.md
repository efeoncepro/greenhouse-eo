# Deck visual system — el sistema de láminas de la propuesta

> # ⚠️ El CRAFT de decks ya no vive acá — vive en la skill `deck-studio`
>
> **Desde 2026-07-12 existe [`deck-studio`](../deck-studio/SKILL.md), la skill domain-free del oficio
> de los decks.** Un deck **no es una licitación**: sirve igual a un pitch, un QBR, un board deck o un
> readout. **Esta skill (licitaciones) es CONSUMER de aquélla, no su dueña.**
>
> **Al producir el deck de una oferta: carga `deck-studio` PRIMERO.** Trae lo que este companion nunca
> tuvo y que decide el resultado:
>
> - **¿Hay narrador, o el deck se defiende solo?** Una oferta a comité **SE LEE — nadie la presenta**.
>   Casi toda la biblioteca popular de presentaciones (*"tres palabras por lámina"*, la regla
>   10-20-30) está escrita para el escenario y es **activamente dañina** acá.
> - **Assertion-Evidence** (Garner & Alley 2013, p < .01): **la única evidencia experimental que
>   existe sobre diseño de láminas.** El titular **afirma**, no etiqueta.
> - **Tu competidor es la INDECISIÓN, no el otro oferente** (JOLT, n = 2,5M conversaciones): ~56% de
>   los deals perdidos son gente **ya convencida** que no pudo comprometerse. **Una lámina de "por qué
>   es seguro" por cada una de "por qué esto".**
> - **La aritmética le gana a la prosa** (Bergman & Lundberg 2013): **modela la fórmula de puntuación
>   ANTES de escribir.**
> - **Los mitos que NO se citan** ([`SOURCES.md`](../deck-studio/SOURCES.md)) — el "attention span de
>   8 segundos" está **fabricado**; la regla 10-20-30 es **un post de blog de 2005** con datos en
>   contra.
>
> **Lo que sigue vigente y es de ESTA skill:** el registro **formal de usted**, la **admisibilidad**
> (peso, formato, plazos), la **rúbrica** y que la estructura sea **espejo 1:1 de los criterios de
> evaluación**, el guardrail de **fotos reales del squad** y el **`audience: internal | client_facing`**.
>
> ⚠️ **Deuda declarada:** el contenido de abajo **se solapa** con `deck-studio` y debe reducirse a lo
> tender-específico. Hasta que eso ocurra, **si hay conflicto, manda `deck-studio`.**

---

> **Qué es:** el sistema visual con el que Efeonce arma el **deck** de una propuesta (técnica o de
> presentación ejecutiva). No es "hacer slides bonitas": es un **catálogo cerrado de plantillas** con
> contratos de contenido, para que el deck se **componga**, no se dibuje a mano.
>
> **Cuándo cargar este companion:** cuando estés en la **Fase 8 (redacción)** o **Fase 10
> (presentación)** del `bid-construction-playbook`, o cada vez que vayas a producir/ajustar láminas
> de una oferta.
>
> **Fuente de verdad técnica:** `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
> (molde + contratos de slots) · SoT machine-readable: `registry.json` en
> `docs/architecture/tender-deck-composer-prototypes/`.
>
> **Doc funcional (lenguaje simple):** `docs/documentation/comercial/tender-deck-composer.md`
> **Manual de uso (paso a paso + errores):** `docs/manual-de-uso/comercial/componer-deck-de-licitacion.md`

---

## La regla que gobierna todo

**El deck es una COMPOSICIÓN de módulos, NO un diseño freehand.**

Cada lámina es una **plantilla** con **slots** declarados. Se elige la plantilla por el **tipo de
contenido** y se rellenan sus slots. **Nunca** se inventa un layout nuevo para una lámina puntual.

> Si ningún tipo de contenido calza con lo que quieres decir, **eso es señal de que falta una
> plantilla en el catálogo** (abrir el gap y diseñarla con el molde) — **no** de improvisar.

Motivo: una propuesta va a un **comité que compara**. La cohesión visual es una señal de rigor; un
deck que cambia de lenguaje cada 3 láminas se lee como un collage y **resta**.

---

## Las 5 reglas del molde (aplican a TODA lámina)

1. **Degradado de marca — RICO y VIBRANTE.** Azul brillante `#196df2` en la esquina + navy
   (`#023c70` → `#001a33`) + glows fuertes teal/violeta con fade + textura de puntos ~9%.
   **⚠️ DECISIÓN DURA (operador, 2026-07-11): NO navy plano.** Se probó bajar el degradado a navy
   sólido y se **rechazó** — se veía apagado. **Nunca** revertir a navy plano. Las láminas
   full-bleed con texto blanco a todo el ancho (Timeline/Agenda) usan un navy más parejo sólo por
   **legibilidad**.
2. **Tipografía — pocos pesos, semánticos.** Poppins 600 título · Geist 600 lead · Geist 400 cuerpo.
   **NUNCA Black/900** (se ve gritón y barato). **Cursivas reales, nunca faux-italic.** Acento
   **teal sobre oscuro / violeta sobre claro**. Numerales Geist tabular.
3. **Safe-area 72px** — el contenido nunca toca el borde. **Tarjetas cohesivas con gap fijo**;
   **NUNCA** `space-between`, que deja huecos disparejos.
4. **Íconos = Solar Bold** (Iconify), inlineados, teal sobre glass. Los **3D icons** son otra capa
   (ver abajo), no reemplazan a los Solar.
5. **Glassmorphism MILKY** (`.72 → .56` + blur). **NO** `.42` (pierde el texto) ni `.95` (se vuelve
   sólido y muere el efecto).

**La jerarquía de texto es la obsesión.** En cada lámina debe estar clarísimo qué se lee primero,
qué segundo y qué es soporte. Si todo pesa lo mismo, la lámina no comunica.

---

## El catálogo — 28 plantillas

Sufijo `Split` = bipartito (dos mitades) · `Full` = full-bleed (a sangre).

| Plantilla | Para qué contenido |
|---|---|
| `CoverFull` · `BackCoverFull` | portada / contraportada |
| `AgendaFull` | índice de apertura |
| `SectionDividerSplit` | divisor de sección |
| `NarrativeSplit` | narrativa (texto + persona) |
| `BulletListSplit` | lista de puntos |
| `DualListSplit` · `DualTextSplit` | dos listas / dos bloques de texto |
| `StatSplit` · `MetricsSplit` | un dato duro / varias métricas |
| `ChartSplit` | texto + gráfico |
| `ComparisonSplit` | comparativa (antes/después, nosotros/ellos) |
| `QuoteSplit` | cita |
| `HighlightWave` | frase-acento sobre fondo Wave |
| `FourPillarsFull` | metodología **paralela** (4 pilares) |
| `ProcessStepsFull` | metodología **secuencial** (1→2→3→4→5) |
| `CardGridFull` | narrativa + grid de tarjetas |
| `TimelineFull` | **cronograma / plan de trabajo** (hitos, entregables, holgura) |
| `TeamSplit` | **equipo / squad** (rol · dedicación % · respaldo) |
| `CaseStudySplit` | **caso acreditado** (contexto → acción → resultado + métrica) |
| `PricingFull` | **oferta económica** (total · desglose · condiciones) |
| `RequirementsTableFull` | **matriz de cumplimiento** técnico × SLA |
| `CredentialsFull` | clientes / credenciales (prueba social) |
| `EvidenceStoryGrid` · `HumanImpactFull` | provisionales |

### Las que puntúan (no son opcionales)

Del gap-analysis contra `propuesta-tecnica-economica.md`, estas mueven la adjudicación o **evitan el
descarte**:

- **T1 — must-have:** `RequirementsTableFull` (admisibilidad: **evita el descarte**),
  `TimelineFull` (cronograma), `TeamSplit` (el evaluador cruza CV vs requisito), `PricingFull`.
- **T2 — eleva:** `CaseStudySplit` (**la experiencia se acredita, no se afirma**),
  `ProcessStepsFull`, `AgendaFull`.
- **T3 — nice-to-have:** `CredentialsFull`.

---

## Delta 2026-07-14 — iterando la oferta SKY (el catálogo pasó a 28)

- **`TeamGalleryFull`** (`team-gallery`): el roster con **FOTOS REALES** del squad — materializa el
  `personaAssetContract` que quote/narrative tenían pendiente. Resolver `squad-person` con **allowlist
  cerrada** (8 personas → `assets/squad/squad-<nombre>.png`; desconocido → `UnknownResolverValueError`:
  una cara IA no puede entrar ni por typo). El binding foto↔nombre↔rol **lo confirma el operador**.
  Desambiguación: roles con glifo → `TeamSplit`; caras reales → `TeamGalleryFull`.
- **Enlaces clickeables en el PDF**: `<a href>` (sólo `https://`) en rich-strings → anotación `/Link`
  real. Eran DOS bugs del motor (sanitizador + `copyPages` que descartaba anotaciones) — arreglados.
  ⚠️ Verificar anotaciones **vía API pdf-lib**, nunca grep (object streams comprimidos).
- **Agenda funcional y NAVEGABLE**: números de página **derivados del plan** (hook con `deckPlan`;
  `targetSlideId` → posición viva) **y salto GoTo a la página real de cada capítulo** (sentinel
  `deck.internal` del resolver `chapter-anchor`, convertido en el merge; sin destino → se descarta).
  **NUNCA** autorar páginas.
- **Anti-fuga de prototipo**: slot opcional no provisto → su nodo **se limpia** en el render. Antes,
  el copy de ejemplo («Propuesta técnica · SKY») viajaba al PDF de la siguiente licitación. Guard: 28
  probes required-only en `template-composability`.
- **Patrón «pieza viva»** (`ArtifactShowcaseFull`): captura real con **chrome de navegador y la URL
  horneada** + `lead` rich con enlace clickeable (así van la Radiografía y el informe del grader).
- **`dual-concept-icon`** (DualTextSplit): semántica de columna (`search|ai|data|users|target`) → Solar.

Detalle completo: `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` → §Delta 2026-07-14.

## El selector — cómo se elige la plantilla

**Es un lookup determinista, NO un juicio.** `registry.json` mapea **1 tipo de contenido → 1
plantilla** (25 ↔ 25), con reglas de desambiguación para los solapes.

Reglas del selector:

1. **Un slide = un tipo de contenido = una plantilla.** Si el contenido mezcla dos intenciones,
   **divídelo en dos slides** — no fuerces una plantilla híbrida.
2. **Nunca freehand.** Si nada calza → falta una plantilla (abrir gap).
3. **El renderer sólo llena los slots declarados**: no agrega copy, logos, fechas ni composición
   libre.
4. **Datos de cliente:** valores **reales** del bid o **ilustrativos marcados**. **Nunca fabricados
   como reales.**
5. **Registro institucional (de usted), sin tuteo**, en todo lo client-facing.

---

## Los 3D icons — `clay 3D mate`

**Estilo:** arcilla mate, formas gruesas muy redondeadas (sin aristas), luz suave arriba-izquierda,
**sombra de contacto**, perspectiva 3/4, color plano por objeto, sin textura.
**Referencias canónicas** (Figma `Sistema Axis — PPT`, `GXYeJaRjotmFuczfnd8hLi`): nodo `5:3133`
(trofeo) y `5:12352` (embudo agrietado con satélites).

### Regla: CURAR antes que GENERAR

El equipo ya tiene librerías clay en OneDrive — **la primera parada es siempre esa**:

- `7. Branding & Diseño/01. Material Marca (Axis)/04. Iconos 3D Claystyle` (283 PNG crudos)
- **`4. Comercial/01. Propuestas Plantillas/01. Libreria Assets/Iconos 3D`** (108 PNG **curados por
  categoría** — fuente preferida)

**Pero la librería es heterogénea: no se usa tal cual.** Un asset entra al deck **sólo si cumple los
tres filtros**:

1. **Es un objeto, no un personaje cartoon.** Los monitos contradicen el guardrail de honestidad (si
   el equipo va con fotos reales, meter cartoons como "equipo" es incoherente) y leen a stock.
2. **Paleta que armoniza con el navy**: azul / violeta / teal. Fuera rojo, naranja, rosa, dorado.
3. **Mismo lenguaje de render** (clay mate) y **cero texto quemado** en la imagen.

**El veredicto se emite mirando el set COMPUESTO sobre el fondo real**, nunca los thumbnails sueltos:
un asset que "se ve bien" aislado puede romper la cohesión del conjunto. (Aprendizaje 2026-07-11: la
primera curaduría no aguantó su propio criterio — al montar el set sobre el navy, la mitad se cayó.)

**Generar sólo el gap**, con el generador canónico (`pnpm ai:image`, GPT Image 2), anclado al subset:
misma paleta, objeto único, **cero texto/letras/números/logos** en la imagen. Recorte con
`pnpm ai:image:rmbg` (matting AI) — **nunca** color-key ni `trim` (dejan halo), y ojo: **el matting
devora los objetos blancos** sobre fondo claro (si el asset es blanco, genéralo en color).

**Set V1 (9 assets)** en `tender-deck-composer-prototypes/assets/clay3d/`: `ai-visibility` ·
`guarantee-shield` · `method-steps` · `timeline-schedule` · `requirements-matrix` ·
`search-visibility` · `compliance-certificate` · `metrics-analysis` · `results-board`.

---

## Personas y fotos — el guardrail de honestidad

**⚠️ Regla dura: el equipo va con FOTOS REALES. NUNCA caras generadas por IA.**

Motivo: el evaluador **cruza el CV contra la persona**. Presentar una cara fabricada como parte del
squad es **tergiversación** — y en un proceso de licitación eso no es un problema estético, es un
problema de integridad (ver `compliance-riesgo-integridad.md`).

Una persona **decorativa/ilustrativa** puede ser IA, pero **jamás presentada como "su equipo"**.

**Dónde están las fotos — en el REPO, no en OneDrive:** `public/images/greenhouse/team/` — 7
**retratos corporativos** (Andrés · Daniela · Humberly · Julio · Luis · Melkin · Valentina).

- Vienen con un **fondo degradado magenta/azul quemado** que choca con la paleta del deck →
  recortar con `pnpm ai:image:rmbg` y componer sobre el navy. Set ya recortado (alpha):
  `tender-deck-composer-prototypes/assets/squad/squad-<nombre>.png`.
- **Ojo:** están cortadas rectas al pie del busto; sobre el navy el corte lee a "guillotina".
  **Lo resuelve la plantilla** (contenedor / fade inferior), no el asset.
- **NO confundir** con `Alineación/5. Contenidos/01. Contenido Evergreen/Team Efeonce/` en OneDrive:
  ésas son **piezas de redes sociales** ("Te presentamos a…", "Dato random: Potterhead", texto
  quemado sobre selfies de webcam) — **inservibles para un comité, no se arreglan recortando**.
- Si falta la foto de alguien, **se pide la foto**. No se fabrica.

---

## Cómo se compone (el composer YA existe — F1, 2026-07-11)

El deck **no se arma a mano**: se escribe un **`DeckPlan`** (JSON con las láminas y sus slots) y el
composer lo materializa. El camino es **100% determinista** — cero LLM.

```bash
pnpm deck:compose <deck-plan.json> [--out <dir>]
# ejemplo vivo (caso SKY, 4 láminas):
pnpm deck:compose docs/architecture/tender-deck-composer-prototypes/examples/sky-deck-plan.json
```

**`pnpm deck:compose` es el alias canónico** — NO invoques `tsx` a mano: el script hornea el shim
`server-only`, y sin él revienta. Sin `--out`, el `outDir` por defecto es **`.captures/tender-deck`**.

### El entregable es UN PDF de N páginas (no un puñado de PNGs)

Esto es lo que hace del composer un **motor** y no un previsualizador:

1. Cada lámina se imprime por separado (`page.pdf()`, una página, tamaño exacto del canvas).
2. Las N páginas se **mergean con `pdf-lib`** en `<tenderId>.pdf` — **el entregable real de la oferta**.
3. Además salen un **PNG por lámina** (revisión visual) y el **`deck-plan.json`** (replay auditable).

**El gate de peso (`maxPdfMb`, default 20 MB) es una regla de ADMISIBILIDAD, no estética:** los portales
de licitación **rechazan** adjuntos sobre su límite. Un deck hermoso de 40 MB que el portal no acepta es
un deck que no existe. El límite duro lo fija cada licitación — revísalo en las bases.

Cada lámina del plan declara `contentType` + `slots`. El **selector** resuelve la plantilla
(lookup en `registry.json`), el **validador** aplica el contrato y el **renderer** llena el DOM real
de Chromium. El **`DeckPlan` es el artefacto auditable**: mismos slots → mismo deck.

**Lo que el composer RECHAZA (y por qué está bien que lo haga):**

- **Copy que no cabe** → `overflow: reject`. **No trunca.** Truncar el texto de una oferta en
  silencio es peor que fallar: el evaluador lee una frase mutilada y nadie se entera. Reescribí más
  corto.
- **Una cifra sin `evidenceRef`** → no se compone. Es el principio anti-humo del método, hecho gate.
- **Un content-type que no calza** → revienta. Significa **falta una plantilla**, no "improvisá".
- **Cualquier slot que el filler no sepa llenar** → aborta el deck. Ver abajo.

### ⚠️ La bug class del composer: el FALLO SILENCIOSO

Apareció **tres veces** durante F1, y es lo peor que puede pasar: **la lámina sale con el contenido
de ejemplo del prototipo y nadie se entera** — un deck llegando al comité con el copy de relleno
("Inteligencia de ejecución" ×4, un KPI que decía "3/3" cuando el dato era "4/4", los dos planes
marcados como "el propuesto").

Está cerrado de raíz: **cualquier tipo o campo que el filler no sepa llenar aborta el deck.** Si
tocás el renderer, **NUNCA** agregues un `default:` silencioso ni un `continue` que deje pasar un
slot sin escribir.

### ⚠️ La otra regla dura: una lámina NO PUEDE MENTIR

Las barras, las posiciones y las escalas se **derivan del dato**, siempre. Nunca se escriben a mano.

Los prototipos traen la geometría hardcodeada (`height:234px`, `width:88%`, `--m:16.6667%`). Si el
composer sólo cambiara los **números** y dejara la **barra** del ejemplo, un "de 12 a 14" se dibujaría
como el salto gigante del prototipo. En una oferta eso **no es un bug de layout: es fabricación
gráfica** — el evaluador ve una mejora que no ocurrió.

Por eso las plantillas con gráfico (`ChartSplit`, `CaseStudySplit`, `TimelineFull`) declaran
**resolvers de geometría** y **abortan si el resolver falta**. Si vas a tocar una lámina con barras:
la barra sale del número, o no sale.

### ⚠️ La 2ª bug class: el contrato que MIENTE sobre lo que CABE (2026-07-12)

`validate.ts` cuenta **caracteres** contra `maxCharacters` — pero eso **no prueba que quepa**.
`FourPillarsFull` declaraba `thesis: max 150`, la tesis de SKY medía 100 (pasó con holgura) y aun así
salió **amputada** en el PDF: `…se vuelve sosteni|`.

La causa no era el copy, era aritmética de CSS: `.hero` tenía `grid-template-columns: 30% 35% 35%` +
`gap: 46px`. **Los porcentajes de Grid no descuentan el `gap`** → los tracks sumaban `100% + 92px`, la
última columna terminaba **20px fuera del lienzo**, y `.slide { overflow:hidden }` la cortaba **sin
emitir nada**. El deck se veía terminado. El mismo patrón estaba latente en `HumanImpactFull`.

**Reglas duras que salen de acá:**

- **NUNCA** `grid-template-columns` en `%` si la grilla tiene `gap`. Usa `minmax(0, Nfr)` — `fr`
  reparte lo que queda **después** del gap. El test `template-geometry.test.ts` lo prohíbe en las 25.
- **NUNCA** asumas que "pasó `maxCharacters`" = "cabe". El contrato declara intención; el único juez
  de la geometría es el layout real. El runtime lo verifica con `assertSlideFitsCanvas` (`render.ts`):
  mide cada nodo del contrato contra su ventana visible real **antes de imprimir** y aborta con
  `SlideGeometryError` (slot + px + texto cortado). Los decorativos (glows, paneles a sangre, la
  burbuja de URL) **sangran a propósito** y quedan fuera de la auditoría.
- **NUNCA** dejes que un recorte sea silencioso. Un PDF con una palabra guillotinada es **peor que un
  fallo**: parece terminado, y nadie lo revisa dos veces.

## ⚠️ Dirección canónica: el motor NO es del deck (ADR 2026-07-12)

`GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (Accepted). El composer **no sabe qué es una
licitación** — es un **primitive de plataforma** (`src/lib/artifact-composer/**`), y "el deck" es sólo
**uno de sus catálogos**:

```
Artifact Composer (un motor, domain-free)
  ├── catalogs/deck-axis          16:9 1920×1080 → PDF de N páginas   ← esta skill
  └── catalogs/social-carousel     4:5 1080×1350 → PNG set            ← growth/social
```

- **Un catálogo es DATO, no una rama del motor.** Si agregar una superficie te obliga a tocar el motor, el
  motor está mal. **NUNCA** copies el composer para una superficie nueva: **un catálogo, no un fork.**
- **El aggregate ya no es `Tender`, es `Proposal`** (`origin ∈ {public_tender, private_rfp,
  direct_sales}`): **no toda propuesta es una licitación**. La licitación es un **origen**.
- **La marca es un INPUT (brand pack), no una constante.** AXIS es *el brand pack de Efeonce*, no *el*
  brand pack — la capability **nace multi-tenant** (as-a-service ready). **NUNCA** hardcodees un HEX de
  marca en una plantilla: hoy hay **51 HEX** repartidos por los 25 archivos y es deuda que **bloquea el
  as-a-service**.
- El **molde visual** (degradado, safe-area, íconos, glass) **es del catálogo**, no del motor. Un carrusel
  de IG **no** usa el molde del deck — pero **ambos beben de los mismos tokens**.

## El runtime YA EXISTE (TASK-1392 + TASK-1391 — shipped 2026-07-12)

Lo que esta sección anunciaba como futuro **ya es código corriendo**. El manual completo de USO y
EVOLUCIÓN vive en **[`proposal-studio-runtime.md`](proposal-studio-runtime.md)** — léelo antes de
operar. El resumen:

- **El aggregate es `Proposal`** (`greenhouse_commercial.proposal*`, TASK-1392): state machine
  persistida con gates humanos EN LA DB, RFP/evidencia/requisitos por el asset store canónico,
  entitlement per-ORG (`proposal_studio_v1`), API parity, intake agent propose→confirm→execute.
- **El motor vive en `src/lib/artifact-composer/**`** (TASK-1393, domain-free) y el deck es el
  catálogo `catalogs/deck-axis/`. `pnpm deck:compose` sigue siendo el CLI exploratorio.
- **El render productivo es un command gobernado** (TASK-1391): `requestProposalRender` →
  `proposal_render_jobs` (idempotencia por hash canónico del manifest) → dispatcher con prioridad
  deadline+aging → Cloud Run Job `artifact-worker` (Chromium pinneado) → PDF + previews al asset
  store privado. Corrida real de referencia: el deck SKY de 15 láminas salió por este camino.

### Las reglas que ese runtime ENFORCEA (ya no son intención)

- ⚠️ **`audience` es la regla más peligrosa de todas — y ahora es un GATE.** Cada evidencia nace
  `internal` o `client_facing`; un artefacto `client_facing` que cite **UNA** referencia
  `internal` se rechaza completo (`audience_violation`), al encolar Y en el worker. El squad
  blueprint lleva **loaded cost**: filtrarlo no es un bug de permisos — es entregarle a la
  contraparte tu estructura de costos.
- **Accesibilidad = admisibilidad.** Si el requisito-set del RFP exige PDF/UA/508/EAA, el render
  **falla cerrado** (`accessibility_unsupported`): Chromium print-to-PDF no emite PDF taggeado.
  Mejor no ofertar que entregar un artefacto inadmisible.
- **La QA visual es MECÁNICA**: `missing_asset` (todo `<img>` resolvió), `font_fallback_detected`
  (familia sin FontFace), `blank_slide` (contraste local por tiles) — gates de publicación dentro
  del render, calibrados contra los 40 frames del baseline.
- **El gate visual + el `--freeze` tienen runbook propio** (`docs/operations/runbooks/composer-visual-gate.md`,
  fuente única — leelo ANTES de `--freeze`). Bug class `ISSUE-122`: el `--freeze` es **SINGLE-OWNER + atómico**
  (freeze + commit juntos; NUNCA con el composer sucio por otro agente → co-mingla su WIP); y las láminas con
  **fotos** (`TeamGalleryFull`/equipo) **driftean píxeles entre corridas** aunque no las toques (el `--selftest`
  de 2 corridas juntas NO lo atrapa) — si el gate flagea solo el área de foto de una lámina que no cambiaste,
  **es ISSUE-122, NO tu regresión: NO la rebaselines**.
- **NUNCA** el render pesado en **Vercel** ni en el **`ops-worker`**: vive en el `artifact-worker`
  (frontera autorizada por excepción documentada de EPIC-027).
- **El deadline viaja FIJADO en el job** y un deadline vencido no compite ni se encola.


### Estado del catálogo — 25/25 componibles ✅ (verificado en CI + frame real)

Las 28 plantillas tienen `data-slot` en el HTML y su `*.slots.json`, enlazado en el `registry.json`.
El composer las puede llenar todas. En arrays, el contrato declara el blueprint repetible
(`itemSelector`) y cualquier chrome fijo (`fixedChildren`); el filler no infiere por orden de DOM ni
conserva el chrome de ejemplo si el dato no lo sostiene.

## Render

HTML (plantilla fiel con tokens) → **Chromium headless** → PNG/PDF, 16:9 1920×1080. Para renderizar
una plantilla suelta (sin composer):

```bash
NODE_PATH=<repo>/node_modules node render.cjs <plantilla.html> <out.png> 1920 1080
```

**Por qué HTML + Chromium y no un motor de PPT:** fidelidad. La propuesta va a un comité — se ve
premium o no se ve. Chromium es un navegador real: reproduce gradientes, tipografía y composición
con fidelidad perfecta. **No se reconstruye el diseño en un motor que lo degrade: se rellena la
plantilla real.**

`.pptx` sólo si el RFP exige un editable (renderer secundario, desde el mismo HTML).

---

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** dibujar una lámina freehand. El deck se **compone** desde el catálogo.
- **NUNCA** degradado navy plano (decisión del operador; se probó y se rechazó).
- **NUNCA** tipografía Black/900 ni cursivas faux.
- **NUNCA** caras IA como equipo. **SIEMPRE** fotos reales del squad.
- **NUNCA** un asset con texto quemado en la imagen (no es reusable).
- **NUNCA** cifras fabricadas: reales del bid, o **ilustrativas marcadas**.
- **SIEMPRE** registro institucional (de usted) en client-facing.
- **SIEMPRE** verificar la cohesión del set **compuesto sobre el fondo real**, no asset por asset.
- **SIEMPRE** que el RFP puntúe cronograma / equipo / matriz de cumplimiento / económica, esas
  láminas van (T1) — su ausencia cuesta puntos o el descarte.
