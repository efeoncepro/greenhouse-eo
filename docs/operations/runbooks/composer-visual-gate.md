# Runbook — Visual gate del Artifact Composer (cómo cambiar un deck/template sin romper el baseline)

> **Para quién:** cualquier agente (Claude, Codex, futuro) o humano que **toque un deck-plan, una
> plantilla, el catálogo (`registry.json`/`resolvers.ts`) o el renderer** del Artifact Composer.
> **Cárgalo ANTES de correr `pnpm composer:visual-gate --freeze`.** Fuente del bug class: `ISSUE-122`.
> **Es la fuente única de este proceso** — si algo acá contradice un Handoff viejo, gana esto.

## 1. El modelo mental en 30 segundos

- El **composer** compone decks/artefactos desde el catálogo (`src/lib/artifact-composer/**`).
- El **visual gate** (`pnpm composer:visual-gate`) recompone **el árbol vivo** (deck-plan de SKY +
  probes de plantillas) y lo diffea **a CERO píxeles** contra el **baseline committeado**
  (`scripts/frontend/baselines/artifact-composer/**`: los PNG + `baseline-manifest.json` + el ledger
  `BASELINE_DELTAS.md`).
- Un cambio de píxel **intencional** se **declara** en `BASELINE_DELTAS.md` y se **re-promueve** con
  `--freeze`. Un cambio **no declarado** = regresión → el gate falla (esa es su razón de existir).

> 🔴 El gate compone el **árbol VIVO**: lee el deck-plan, el catálogo y el renderer **tal como están en
> tu working tree en ese momento** — incluyendo cambios sin commitear, tuyos o de otro agente.

## 2. La regla de oro — el freeze es SINGLE-OWNER, SERIALIZADO y ATÓMICO

Porque el gate compone el árbol vivo, **dos agentes tocando el composer a la vez se pisan**:
sus cambios se mezclan en el render y cualquier `--freeze` co-mingla el trabajo de los dos.

- **SINGLE-OWNER:** solo **un** agente/sesión toca el composer (deck-plan/catálogo/renderer/baseline) a la
  vez. Si otro agente lo tiene sucio (`git status` muestra `M` en esos paths), **NO congelas** — coordinas.
- **SERIALIZADO:** antes de `--freeze`, verifica que el árbol del composer esté **limpio salvo TU cambio**
  (`git status --short src/lib/artifact-composer scripts/frontend/baselines <tu deck-plan>`).
- **ATÓMICO:** `--freeze` **y** el commit van **juntos**. Nunca dejes un freeze en el working tree sin
  commitear (deja el baseline en un estado ambiguo que el próximo agente no puede interpretar).

## 3. El flujo canónico — cambié un deck o una plantilla, ¿ahora qué?

```
1. Editas el deck-plan / la plantilla / el catálogo.
2. Recompones y MIRAS el frame:   pnpm deck:compose <plan>   → Read del PNG (nunca "listo" sin mirar)
3. Corres la suite:               pnpm vitest run src/lib/artifact-composer   (boundary/composability/…)
4. Corres el gate:                pnpm composer:visual-gate    → va a fallar en las láminas que cambiaste
5. ¿El cambio es INTENCIONAL?
     → SÍ:  declaras lámina por lámina en BASELINE_DELTAS.md (§5) + pnpm composer:visual-gate --freeze
     → NO:  acabas de atrapar una regresión. Arregla el código, no el baseline.
6. git add <tu deck-plan> <las plantillas> scripts/frontend/baselines/artifact-composer + COMMIT (atómico).
```

### Scope de catálogos Insights

El gate global también contiene `deck-axis` y el deck SKY. Mientras `ISSUE-122` mantenga diferencias
históricas en frames que esta task no toca, un freeze global obliga a rebaselinar trabajo ajeno. Para
promover o verificar únicamente los dos catálogos Insights usa:

```bash
pnpm composer:visual-gate --catalog=insights --selftest
pnpm composer:visual-gate --catalog=insights --freeze
pnpm composer:visual-gate --catalog=insights
```

El freeze scoped agrega o actualiza sólo `templates-insights-deck/**` y
`templates-insights-report/**`, conserva los demás PNG y hashes del manifest y vuelve a sellar su
digest. Igual requiere declarar cada frame cambiado en `BASELINE_DELTAS.md`; el freeze y commit deben
ser atómicos. El gate scoped valida el manifest completo y diffea a cero píxeles sólo los frames de
Insights. El gate global sigue siendo la verificación para cambios en `deck-axis` o en SKY; este scope
no limpia ni oculta sus diferencias históricas.

Estado al cierre de TASK-1889 (2026-09-26): el scope Insights tiene **27 frames a 0 px**, sólo con el
diseño editorial v2 (el legado v1 se retiró); los últimos deltas declarados son los (g)–(k) del
2026-09-25 en `BASELINE_DELTAS.md`. Este gate compara contra el baseline propio; la fidelidad al canvas
aprobado se mide aparte con `pnpm insights:canvas-fidelity [--only=<nombre>] [--gray]` (≤ 1 % de píxeles
distintos por página contra `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/`;
`Deck-Agrupadas` es la única excepción aprobada por el operador, con techo 2,5 %; una excepción nueva
exige su aprobación). Dossier: `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md`.

### Scope de La órbita (`graphic-line`, TASK-1919, TASK-1927 y TASK-1928)

Los tres catálogos de la línea gráfica por superficie (`graphic-line-deck`, `graphic-line-stills` y
`graphic-line-overlays`) tienen su propio scope, por la misma razón que Insights: no rebaselinar frames ajenos. Spec
técnica de los catálogos: [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).

```bash
pnpm composer:visual-gate --catalog=graphic-line --selftest
pnpm composer:visual-gate --catalog=graphic-line --freeze
pnpm composer:visual-gate --catalog=graphic-line
```

- **Qué cubre:** `templates-graphic-line-{deck,stills,overlays}/**`, **66 frames a 0 px** al cierre de TASK-1928
  (2026-09-28): **50 del deck** (una por plantilla de `registry.json`; cubren las 69 recetas del deck), 9 de stills y 7
  de overlays. El scope entró con 22 frames (TASK-1919) y pasó a 32 con TASK-1927.
- **Dónde está declarado cada cambio** (`BASELINE_DELTAS.md`):

  | Entrada | Task | Qué declara |
  | --- | --- | --- |
  | 2026-09-27 (b) | TASK-1927 | composiciones `hero` y `lines` de `proposal-cinematic` (2 altas) |
  | 2026-09-27 (c) | TASK-1927 | el tríptico, una palabra por toma (modificación) |
  | 2026-09-27 (d) | TASK-1927 | la sección partida en tres composiciones (2 altas) |
  | 2026-09-27 (e) | TASK-1927 | portadas y contraportadas aprobadas (6 altas) |
  | 2026-09-27 (f) | TASK-1928 | la propuesta de servicio sobria (1 alta) |
  | 2026-09-27 (g) | TASK-1923 | Glitch entra al gate (scope `glitch`, no es de La órbita) |
  | 2026-09-27 (h) | TASK-1928 | la familia método (5 altas) |
  | 2026-09-27 (i) | TASK-1928 | cotización, próximos pasos y respiro (5 altas) |
  | 2026-09-27 (j) | TASK-1928 | la familia prueba (8 altas) |
  | 2026-09-27 (k) | TASK-1928 | secciones y quiénes somos (7 altas) |
  | 2026-09-27 (l) | TASK-1928 | contenido y día a día (8 altas) |
  | 2026-09-27 (m) | TASK-1928 | los largos del catálogo mandan: `ContentPricingLive` re-promovido |
  | 2026-09-28 (n) | TASK-1928 | la portada de brochure con la selección de Nexa: `CoverBrochure` re-promovido (§4bis) |

- **Auditoría renderizada (TASK-1928).** Además del diff de píxeles, el gate mide sobre cada probe de La órbita dos
  reglas que ni el contrato ni el `slots.json` ven (`graphic-line-shared/rendered-audit.ts`): **D1**
  (`accent-text-min-size`: ningún texto de menos de 24 px con el color de acento de la línea, en todos los frames) y
  **3×** (`answer-ratio`: la respuesta mide al menos 3 veces la pregunta en `deck.content-pricing`, `.stage`, `.live`,
  `deck.content-clients`, `deck.decision-plan` y `deck.content-partners`; una de esas láminas sin pregunta y respuesta
  también falla). Una violación falla el gate igual que un píxel y **no se arregla con `--freeze`**: se corrige la
  plantilla o el builder. Una receta nueva que la norma obligue a 3× se agrega a `ANSWER_RATIO_CONTENT_TYPES`.
- **Qué hace un freeze de este scope:** agrega o actualiza sólo los PNG y hashes cuyo frame empieza con
  `templates-graphic-line-`, y borra los de ese mismo prefijo que el render ya no produce (una plantilla retirada o
  renombrada). Los frames de `deck-axis`, SKY e Insights conservan su PNG y su hash; el digest se vuelve a sellar sobre
  el manifest completo. Exige un baseline global previo: sin manifest, el freeze por catálogo se niega.
- **El probe no es sintético genérico:** cada contrato declara como `example` el plan real de su pieza aprobada, y los
  archivos externos llegan como SVG sintéticos deterministas (`GRAPHIC_LINE_PROBE_ASSETS` en
  `scripts/artifact-composer/visual-gate.ts`). No hay foto real en el probe, así que ISSUE-122 (§4) no aplica aquí.
  Las cuatro referencias del probe:

  | Referencia | Qué reemplaza |
  | --- | --- |
  | `plate:probe` | la foto (el plate) |
  | `icon:probe` | un ícono |
  | `layer:probe` | una capa de la órbita |
  | `file:probe` | un archivo entregado por quien compone: el logo del cliente de las portadas de propuesta (TASK-1927) y, desde TASK-1928, los logos de clientes y partners (en un render real, assets `logo` normalizados), las fotos del squad y los isotipos de herramientas (assets `file`). Es un rótulo sintético, nunca la marca de un cliente real |

  En el contrato se escriben con el prefijo `asset-ref:` (por ejemplo `"example": "asset-ref:file:probe"`).
- **`"example": null` deja un slot opcional fuera del probe.** El probe usa el `example` del slot tal cual
  (`synthesizeSlotValue`, `src/lib/artifact-composer/synthesize.ts`); si vale `null`, el slot llega sin valor y el
  renderer lo trata como opcional ausente (`absent-optional`). Sirve cuando dos slots nunca van juntos: en
  `cover-proposal-orbit.slots.json` y `cover-proposal-dawn.slots.json` el logo del cliente declara `"example": null`,
  así el frame congelado muestra el marcador «Logo del cliente» y no el logo. Es la excepción a §4bis, donde el probe
  rellena todo slot opcional. Sólo aplica a slots opcionales: uno obligatorio sin valor falla la composición.
- **Varias composiciones sobre un mismo HTML.** Una plantilla de `registry.json` es un nombre, un `prototype` (el
  HTML) y un `slotsRef` (el contrato de slots). Dos plantillas pueden apuntar al mismo HTML con contratos distintos, y
  cada una tiene su frame, porque el gate fotografía una vez por plantilla del registry:

  | HTML | Plantillas (una por contrato de slots) |
  | --- | --- |
  | `section-split.html` | `SectionSplit`, `SectionSplitCornerBottom`, `SectionSplitPanelEnd` |
  | `close-brochure.html` | `CloseBrochure`, `CloseBrochurePhoto` |

  Al revés también pasa: varias recetas pueden compartir **una** plantilla y, por lo tanto, **un** frame
  (`ProposalService` para las cuatro propuestas sobrias, `SectionCine` para equipo y servicios, `CoverBrochure` para las
  ocho portadas de brochure). Por eso el scope tiene 50 frames de deck para 69 recetas.

  Un cambio en ese HTML mueve todos sus frames: se declaran uno por uno. No contradice la regla de `.claude/rules/tenders.md`
  sobre no registrar una plantilla para «la misma lámina con un elemento más» (eso lo resuelve un slot opcional): aquí
  cada composición tiene su propio `contentType` y su propio contrato.
- **El documento completo no tiene frame.** Un brochure o una propuesta compuestos con `pnpm brand:compose` usan fotos
  reales, que no son deterministas para el gate; los cubren los frames de sus páginas.
- **Las capas audiovisuales transparentes se congelan con su alfa**; un diff de alfa es un diff.
- **Los ganchos de selección, CTA y storyboard esperan `document.fonts.ready`** antes de medir: el storyboard medía
  con la fuente de respaldo y variaba entre corridas. Si un frame de este scope empieza a oscilar, revisa primero que
  el gancho nuevo espere las fuentes.
- **Estado del gate global (2026-09-27):** marca 60 frames de `deck-axis`/SKY/Insights con diferencias de pocos
  píxeles. Con el `render.ts` anterior a TASK-1919 sale la misma lista con las mismas cuentas: es deriva de entorno
  previa (ISSUE-122), no de estos catálogos, y **no se rebaselinó**. No uses un freeze global para «limpiarla».

### Scope de Glitch (`glitch`, TASK-1923) — sólo Glitch

Los tres catálogos de Glitch (`glitch-carousel`, `glitch-stills` y `glitch-overlays`) comparten la carpeta
`src/lib/artifact-composer/catalogs/glitch/` y su `registry.json`, así que el gate tiene **una** entrada de probe para
los tres y un scope propio.

```bash
pnpm composer:visual-gate --catalog=glitch --selftest
pnpm composer:visual-gate --catalog=glitch --freeze
pnpm composer:visual-gate --catalog=glitch
```

- **Qué cubre:** `templates-glitch/**`, **26 frames a 0 px** al congelar (2026-09-27, `BASELINE_DELTAS.md` entrada
  (g)): las 7 láminas del carrusel, los banners del blog 16:9 y 1:1, el banner de noticia, la portada del reel, la
  miniatura del vlog y los 10 overlays del reel y del vlog.
- **El probe no usa fotos reales:** cada hueco recibe `asset-ref:photo:probe`, un SVG sintético
  (`GLITCH_PROBE_ASSETS` en `scripts/artifact-composer/visual-gate.ts`); la falla en bytes del probe es el `example` del
  slot `bytes` (vacía). La geometría de la falla la prueban los tests de `src/lib/glitch-composition/` y las fotos
  reales las cubre `pnpm glitch:compose`: dos corridas en procesos separados dan los mismos PNG byte a byte (fotos
  pre-rasterizadas al tamaño exacto del hueco, criterio de ISSUE-122).
- **Los overlays se fotografían sin alfa** en el probe (el probe captura sobre el fondo del navegador); el PNG que
  entrega `pnpm glitch:compose` sí lleva canal alfa.
- **Un freeze de este scope** agrega o actualiza sólo los frames que empiezan con `templates-glitch` y vuelve a sellar el
  digest sobre el manifest completo. Como el manifest y `BASELINE_DELTAS.md` son compartidos, aplica igual la regla
  single-owner de §2: avisa a las sesiones que trabajan en el composer antes de congelar.

## 4. 🩸 El gotcha que TIENES que conocer: las fotos raster no son deterministas (ISSUE-122)

Las láminas con **fotos** (`TeamGalleryFull` / la lámina del equipo) **driftean unos píxeles entre
corridas/entornos** aunque nadie cambie la foto — Chromium re-samplea/rasteriza con leve variación
(color profile, resample, `border-radius`). Consecuencias que te van a confundir:

- El `--selftest` (2 corridas **juntas**, mismo proceso) da **cero px** → parece determinista. Pero el
  frame que **tú** congelaste puede **no coincidir** con el render de **otro agente/sesión/CI**.
- El gate puede reportar `TeamGalleryFull.png` o `18-equipo.png` con **miles de píxeles** distintos **sin
  que hayas tocado esa lámina**. Eso **NO es tu regresión** — es el nondeterminismo de fotos.

**Qué hacer cuando el gate flagea SOLO una lámina con fotos y tú no la tocaste:**

- **NO** la aceptes repitiendo `--freeze` (rebaselina un estado que va a driftear otra vez → el gate se
  vuelve inútil ahí). Es el "rebaseline silencioso" que el gate existe para impedir.
- **Confírmalo:** ¿el diff está **solo** en el área de foto? ¿el `--selftest` da cero pero el gate global no?
  → es ISSUE-122, no tu cambio.
- **Reportalo** contra `ISSUE-122` y NO congeles esa lámina hasta que el determinismo de fotos esté
  arreglado (pre-rasterizar avatares al tamaño exacto + pinnear color profile).

## 4bis. Declarar un slot nuevo SIEMPRE mueve el frame de esa lámina

El gate no renderiza la plantilla cruda: la **compone con slots sintéticos**
(`synthesizeProbeSlots`, `src/lib/artifact-composer/synthesize.ts`), que rellena **todo** slot que no
empiece con `fixed-` — incluidos los **opcionales**. Y para cualquier slot de tipo `asset` el
placeholder sintético es **`assets/url-lum.svg`**, la burbuja de URL.

Consecuencia que confunde la primera vez: agregas un slot `asset` opcional a una plantilla, no
declaras nada en ningún deck, y el gate reporta esa lámina en rojo con **una burbuja de URL dibujada
donde va tu asset**. No es tu asset filtrándose ni un bug del render — es el probe haciendo su
trabajo.

- **Es un delta intencional:** declararlo en `BASELINE_DELTAS.md` y `--freeze` (con la regla
  single-owner de §2).
- **No lo confundas con "el slot se cuela en los decks":** en un render real el slot opcional no
  declarado hace que el renderer **borre el nodo** (`absent-optional`, `render.ts`). El probe es el
  único lugar donde siempre aparece.
- **Excepción declarada:** un slot opcional con `"example": null` en su contrato queda fuera del probe (ver
  «Scope de La órbita» en §3). Sin esa declaración, el probe lo rellena.
- **Corolario de diseño:** por eso un slot opcional basta para tener "dos variantes" de una lámina
  (con y sin el elemento) **sin registrar una segunda plantilla** — el costo es una línea en el
  ledger de deltas, no un archivo duplicado que después driftea.

Caso fuente: `partnerBadge` en `BackCoverFull` (credencial HubSpot Solutions Partner, 2026-08-13).

Segundo caso (La órbita, 2026-09-28, `BASELINE_DELTAS.md` (n)): la plantilla `CoverBrochure` ganó el slot opcional
`selection` para la portada `document-selection`. El probe lo rellena, así que el frame único de `CoverBrochure` pasó a
mostrar el marco de ocho manijas y el cursor sobre la respuesta, aunque las siete portadas limpias que comparten esa
plantilla no llevan selección en un render real (el builder sólo llena el slot con `layout: 'document-selection'`). Se
declaró como modificación y se re-promovió; no es una regresión de las portadas limpias.

### Valor de muestra declarado por el contrato (`example`, TASK-1889)

El relleno sintético (texto recortado al `maxLength`, números mínimos) no ejerce una **figura cuya
geometría sale de cifras**: una barra, una columna o una marca de meta calculadas desde `"a"` o `0`
dibujan una figura vacía o degenerada, y el frame congelado no prueba nada. Por eso un contrato puede
declarar su propio valor de muestra con `example`:

- **En el slot** (`SlotContract.example`) o **en un campo** de objeto/item (`SlotFieldContract.example`),
  ambos en `src/lib/artifact-composer/contracts.ts`.
- `synthesizeSlotValue` (`synthesize.ts`) lo usa **tal cual** antes de sintetizar nada; si no hay
  `example`, el comportamiento es el de siempre.
- Es **dato del catálogo, no del motor**: vive en el `*.slots.json` de la plantilla (ej. los
  `"example": "9"` / `"10"` de `report-figure-targets.slots.json`). Sólo lo lee el probe del gate; un
  render real usa los valores del plan.
- Agregar o cambiar un `example` **mueve el frame** de esa lámina igual que un slot nuevo: declararlo en
  `BASELINE_DELTAS.md` y `--freeze` (§2).

Caso fuente: las páginas y láminas de figura de Insights (`ReportFigure{Comparison,Columns,Targets,Trend}Page`
e `InsightsFigure{Comparison,Columns,Targets,Trend}Slide`), TASK-1889, 2026-09-25.

## 4ter. Atribuir un drift que no es tuyo: mira si la plantilla está commiteada y limpia

Antes de asumir regresión propia —o de culpar al WIP de otro— haz dos preguntas mecánicas sobre la
plantilla que el gate flagea:

```bash
git status --short src/lib/artifact-composer/catalogs/deck-axis/<plantilla>.html
git log --oneline -3 -- src/lib/artifact-composer/catalogs/deck-axis/<plantilla>.html
```

Si sale **limpia y su último cambio está commiteado**, el drift es entre **plantilla commiteada y
baseline commiteado**: el baseline quedó viejo en `HEAD` y el gate ya estaba rojo antes de que
llegaras. No es tuyo, no es del WIP en curso, y no se arregla congelando encima de trabajo ajeno.

Caso fuente: `NarrativeSplit` con ~59k px de drift el 2026-08-13, con la plantilla limpia desde
`f7761988f` — mientras dos agentes distintos tenían el composer sucio por otras razones.

## 5. Cómo declarar un delta en `BASELINE_DELTAS.md`

- Una entrada con fecha, **lámina por lámina**, diciendo **qué cambió y por qué** (intención, no "actualicé
  el baseline"). Ver las entradas existentes como molde. Va arriba, bajo el título.
- **La unidad de promoción es la sección nueva sin sellar.** Cada `--freeze` exitoso escribe
  `<!-- sealed-by-freeze: <digest> -->` bajo el heading de la sección que consumió. El siguiente `--freeze`:
  - exige **exactamente una** sección `## ` sin ese marcador (cero o dos → falla cerrado, listando cuáles);
  - acepta un frame cambiado, nuevo o removido **sólo si esa sección lo nombra** (ruta completa del frame, p. ej.
    `templates-graphic-line-deck/HeroLens.png`). Nombrarlo en una sección ya sellada **no cuenta**: el error lo
    marca «sólo en secciones ya selladas» para que veas que es una declaración vieja, no la tuya;
  - avisa (sin fallar) si la sección nombra un frame del scope que no cambió: revisa que la entrada no mienta.
- **Si el `--freeze` lista frames que no esperabas, no los copies a la sección para que pase.** Son frames que tu
  cambio movió (un hook o un CSS compartido, por ejemplo): o los revisas uno por uno y los declaras con su porqué,
  o arreglas el código. Caso fuente: 2026-09-27, TASK-1928 (`2c7c67c5d`) — el hook de selección
  (`graphic-line-shared/selection-hook.ts`) movió 10 frames ya aprobados y el freeze anterior los re-promovió
  porque su nombre aparecía en secciones viejas de otras tasks. Se vio sólo porque alguien leyó la lista a mano.
- Las secciones anteriores a esta regla llevan el sello `legacy-2026-09-28`. Una declaración que quedó sin
  promover antes de esa fecha (p. ej. los 9 frames de TASK-1847, ISSUE-122) también quedó sellada: para
  promoverla, cópiala a una sección nueva.
- No escribas el marcador a mano para «cerrar» una sección: lo escribe `--freeze` al promover. El test
  `scripts/artifact-composer/baseline-deltas-ledger.test.ts` falla si el ledger committeado deja una sección
  abierta (una sección abierta sólo existe entre tu declaración y tu `--freeze`, que se commitean juntos).
- El `--freeze` **sella un digest** del manifest en el ledger. **NUNCA** edites un PNG del baseline a mano
  ni toques el digest — el gate lo detecta y falla.

## 6. Qué NO hacer NUNCA

- ❌ `--freeze` con el composer sucio por **otro agente** (co-mingla su WIP). Coordina primero.
- ❌ Dejar un `--freeze` **sin commitear** (estado ambiguo para el próximo).
- ❌ Rebaselinear una lámina con fotos que driftea sin cambio real (ISSUE-122) — eso oculta el bug.
- ❌ Editar un PNG del baseline, `baseline-manifest.json` o el digest **a mano**.
- ❌ Agregar a tu sección los frames que el `--freeze` reporta como no declarados sólo para que pase, sin mirarlos.
- ❌ Escribir o borrar a mano un marcador `sealed-by-freeze` (reabrir una sección vieja es re-promover con una declaración ajena).
- ❌ Declarar "listo" sin **mirar** los frames recompuestos (Read del PNG), desktop y con foco en lo que cambiaste.
- ❌ Meter `HEX`/fuentes literales en una plantilla (`pnpm composer:color-ledger` / font pack lo bloquean).

## 7. Troubleshooting rápido

| Síntoma | Causa probable | Acción |
|---|---|---|
| `--freeze` dice «no aparecen en la sección que se está sellando» con frames que no tocaste | Tu cambio movió frames compartidos, o la declaración está en una sección vieja ya sellada | Míralos; declara los intencionales en tu sección o arregla el código (§5) |
| `--freeze` dice «no tiene una sección nueva sin sellar» / «más de una sección sin sellar» | Falta tu entrada, o hay dos abiertas | Una sola entrada nueva por promoción (§5) |
| Gate falla en la lámina que **sí** cambiaste | Cambio intencional no declarado | Declara en `BASELINE_DELTAS.md` + `--freeze` + commit |
| Gate falla en `TeamGalleryFull`/`18-equipo` que **NO** tocaste, solo en el área de foto | Nondeterminismo de fotos (ISSUE-122) | NO congeles esa lámina; reporta a ISSUE-122 |
| `item_too_long` al recomponer | Copy > límite de chars del filler (`overflow: reject`) | Acorta el copy (el gate fail-closa, no trunca) |
| `git status` muestra `M` en `resolvers.ts`/`registry.json`/baseline y no fuiste tú | Otro agente tiene el composer sucio | NO congeles; coordina (regla single-owner) |
| `--selftest` da cero pero el gate global no | Drift entre tu render y el frame congelado por otro | Probablemente ISSUE-122 (fotos) o un freeze ajeno stale |
| Aparece una **burbuja de URL** donde va un asset tuyo, en una lámina donde acabas de declarar un slot | El probe rellena todo slot no-`fixed-` y usa `assets/url-lum.svg` para los `asset` | Delta intencional: declarar + `--freeze` (§4bis) |
| Una lámina **sin fotos** que NO tocaste driftea | `git status`/`git log` de esa plantilla: si está limpia y commiteada, el baseline está viejo en `HEAD` | No es tuyo; no congeles sobre WIP ajeno (§4ter) |

## Referencias

- Gate + freeze: `scripts/artifact-composer/visual-gate.ts` · regla del ledger `scripts/artifact-composer/baseline-deltas-ledger.ts` (+ test) · ledger `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`
- Catálogos de La órbita: `src/lib/artifact-composer/catalogs/graphic-line-{deck,stills,overlays}/` (compartido: `graphic-line-shared/`) · norma `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md`
- Invariantes del dominio: `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` · `.claude/rules/tenders.md`
- Bug class: `docs/issues/open/ISSUE-122-composer-visual-gate-photo-nondeterminism-concurrency-docs.md`
- Skills: `greenhouse-public-private-tenders` → `deck-visual-system.md` · `proposal-studio-runtime.md` · `deck-studio` → `composition.md`
