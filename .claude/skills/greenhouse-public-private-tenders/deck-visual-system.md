# Deck visual system — el sistema de láminas de la propuesta

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

## El catálogo — 25 plantillas

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

**Estado 2026-07-11:** no existen retratos corporativos del squad. Las únicas fotos del equipo
(`5. Contenidos/01. Contenido Evergreen/Team Efeonce/`) son **piezas de redes sociales** ("Te
presentamos a…", con datos tipo "Fan de Avicii" y texto quemado sobre selfies de webcam):
**inservibles para un comité y no se arreglan recortando**. Hasta que existan headshots con fondo
neutro, los slots de persona quedan **sin llenar**.

---

## Render

HTML (plantilla fiel con tokens) → **Chromium headless** → PNG/PDF, 16:9 1920×1080.

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
