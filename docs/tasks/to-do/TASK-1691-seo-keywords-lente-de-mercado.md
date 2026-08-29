# TASK-1691 — Declarar la lente estimada y su fecha de captura en la tabla de oportunidades SEO

## Delta 2026-08-29 — el campo que esta task tenía que inferir YA EXISTE (TASK-1785)

`TASK-1785` cerró el contrato agéntico: los readers del módulo emiten `provenance: SeoProvenance[]`
con `lens` (`measured` | `estimated`), `source` y `capturedAt`. **Esta task ya no tiene que inferir
la lente desde el origen del dato: la lee.**

Lo que cambia concretamente para la superficie visible:

- `readKeywordOpportunities` emite la procedencia **partida**: el striking-distance (posición,
  impresiones, clics, CTR, techo) es `measured`; el enriquecimiento de mercado (`searchVolume`,
  `difficulty`, `linkBarrier`) es `estimated`. La tabla puede rotular columna por columna sin
  decidir nada por su cuenta.
- El glifo sale de `SEO_LENS_MARKER` (`src/lib/growth/seo/lens.ts`), un solo origen. **NUNCA**
  escribir `◑`/`●` literales en la vista: hoy están crudos en ~14 archivos y ése es el desorden que
  1785 dejó de crear hacia adelante.
- `capturedAt` viaja por sección: un volumen de mercado y una impresión medida **no comparten
  as-of**, y presentarlos bajo una sola fecha sería el mismo defecto en versión visual.

⚠️ Sigue siendo trabajo de esta task decidir **cómo se ve**: 1785 es el contrato, 1691 es la
superficie humana. No comparten archivos.

## Delta 2026-08-28 (4) — la lente de mercado deja de ordenar y pasa a ENRIQUECER el ítem; y el cutover reintroduce `noGainHint`

`TASK-1700` está en `develop` con sus siete slices (`962d22118` … `9020d6421`). El Slice 7 (`9020d6421`)
reapunta esta misma lente: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` llama
`readKeywordOpportunitiesFromWorkQueue` (`src/lib/growth/seo/work-queue/opportunities-adapter.ts`) cuando
`GROWTH_SEO_WORK_QUEUE_ENABLED` está ON, y cae al `readKeywordOpportunities` legacy cuando el flag está
OFF, no hay snapshot todavía o la cola falla. **El flag está OFF en los dos runtimes**
(`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`), así que todo lo que sigue es **latente**: hay que
resolverlo antes del flip, no después.

**La lente de mercado ya está modelada como enriquecimiento, y el argumento quedó firme.** La cola **no
transporta volumen ni dificultad a propósito** —es el invariante `●` medido / `◑` estimado aplicado al
ORDEN, no sólo a la visualización— y el adapter los pide al mismo reader canónico que esta lente ya usaba
(`readKeywordMarketData`), por las keywords ya seleccionadas y con el mismo marcado. Consecuencia para
esta task: **Volumen y Barrera de enlaces nunca vuelven a ser criterio de orden**; `TASK-1700` lo prohíbe
en su `Architecture Alignment` ("PROHIBIDO ordenar por volumen estimado en cualquier parte del módulo
cuando existe demanda medida"). Declarar la lente y su fecha —lo que esta task hace— sigue igual de
necesario; lo que desaparece es cualquier ruta legítima para que ese número mande el orden.

### 🔴 Supuesto invertido: la cola NO hereda el encoding de frescura de esta task — llegó primero con el suyo

El Delta 2026-08-15 dice: *"Este es el encoding canónico de frescura del módulo, y es el que la cola
priorizada (`TASK-1700`) va a reusar. No se inventa un segundo."* **La secuencia se dio al revés.** La
cola ya está en `develop` y trae su propio vocabulario en el contrato del reader: `asOf` (el `computed_at`
del snapshot) y `staleness` = `fresh` | `stale` (pasó `expires_at`) | `absent` (nunca se materializó), y
el cliente los recibe redactados en `toClientWorkQueueDto`.

La regla de fondo no cambia —**un solo encoding**— pero la dirección sí: **esta task tiene que alinearse
con `asOf`/`staleness`**, no al revés. Si el copy que se escriba acá inventa un tercer vocabulario, el
módulo estrena en dos pantallas hermanas justo las dos formas de leer lo mismo que ese Delta existía para
evitar.

Y las fechas siguen siendo **tres hechos distintos que no se reconcilian**: `marketAsOf` (lente `◑`, ciclo
mensual del proveedor), el borde derecho de la lente `●` (lag de ingesta de Search Console) y el `asOf`
del snapshot (cuándo se compuso el plan). Tres lentes, tres relojes, ninguna hereda la frescura de otra.

### 🔴 Dos hallazgos del cutover que caen dentro de los archivos que esta task posee

**(1) `ctrCurveSource` pierde dos de sus cuatro estados por el camino de la cola.** El Delta (3) enumera
cuatro (`org_measured` | `org_level_reference_shape` | `unusable` | `fallback`). El adapter
(`opportunities-adapter.ts`) mapea el breakdown persistido a **dos**: `org_measured`, o `unusable` para
todo lo demás — el vocabulario de la cola (`org_measured` | `unusable` | `not_applicable`) no tiene
equivalentes para los otros dos. O sea: el copy de cuatro estados que esta task escribe **sólo es
ejercitable por el camino legacy**. Hay que decidir qué dice cada string cuando la lente viene de la cola
y sólo existen dos estados, en vez de asumir que el vocabulario de `TASK-1792` sobrevive el cutover.

**(2) `estimatedClickGain` colapsaba a `0` por el camino de la cola — CORREGIDO el 2026-08-28, y la
consecuencia para esta task cambia de signo.**

El defecto era real y la cadena era corta: `priority_score` es `NULL` **por diseño** en banda 2
(`measured_without_curve`: hay demanda medida pero la curva propia no alcanza para afirmar un CTR
esperado); el adapter lo aplanaba con `item.priorityScore === null ? 0 : …`; y
`KeywordOpportunityTable.tsx:620` ramifica con `row.estimatedClickGain > 0` para pintar en el `else` el
tooltip `copy.table.noGainHint` — *"Esta keyword ya convierte mejor que el promedio de la posición
objetivo"*, que es exactamente la comparación que **no se hizo**. Y como la usabilidad de la curva se
evalúa **una vez por posición objetivo**, no era un borde: caían TODAS las filas.

🔴 **El arreglo NO fue traducir mejor el `null`, sino no servir la lente cuando hay que fabricar.**
`readKeywordOpportunitiesFromWorkQueue` devuelve `null` si alguna fila que llegaría a la lente carece de
techo, y el caller cae al reader legacy — que desde `TASK-1792` ordena ese caso honestamente
(`orderedBy: 'measured_demand'`, sobre impresiones × cercanía a página 1, todo medido). En la práctica es
una condición **por organización**: con curva sana la lente viene de la cola; con curva no utilizable, del
legacy. La cola conserva su snapshot completo en los dos casos.

**Qué significa para esta task, que es lo que cambia:**

- El punto 4 del Delta (3) —*"`estimatedClickGain` sigue siendo `number` y ya no colapsa a 0"*— **vuelve a
  ser cierto**, también por el camino de la cola. `noGainHint` no puede mentir: si el techo no se pudo
  calcular, la lente no la sirve la cola.
- **El copy de los cuatro estados de `ctrCurveSource` sigue siendo ejercitable**, y por la misma razón: el
  escenario que sólo tenía dos estados es justo el que ahora atiende el legacy. El punto (1) de este Delta
  queda acotado — no hay que reescribir el vocabulario para un cutover que no ocurre en ese caso.
- **La decisión `estimatedClickGain: number | null` deja de ser urgente, pero NO queda cerrada.** Hoy la
  imposibilidad se sostiene con un guard en la costura; el tipo sigue sin poder expresar la ausencia, así
  que el día que alguien quiera servir bandas 2/3 en esta lente —que es lo natural cuando aterrice la
  superficie propia de la cola— el problema vuelve. Sigue siendo la forma que lo haría imposible por
  construcción, y sigue siendo decisión conjunta con `TASK-1792`.

*(Hallazgo original de `greenhouse-eo-9b` sobre la costura entre los dos contratos, confirmado de forma
independiente en el barrido de impacto cruzado de `TASK-1700`. El defecto no era de ninguna de las dos
tasks: era del vocabulario compartido — `estimatedClickGain` y `priority_score` usan el mismo valor con
significados inversos.)*

**Lo que NO cambia:** el alcance sigue siendo `ui-lite`, aditivo, sin migración y sin flag propio.

## Delta 2026-08-28 — desbloqueada: `TASK-1694` cerró

`TASK-1694` cerró como `code complete, rollout pendiente`, así que el `Blocked by` pasa a `none`.
La serialización `1691 → 1693` se conserva como orden recomendado, no como bloqueo.

Contexto que ahora es un hecho del contrato y no un supuesto: el reader de discovery declara los
filtros que ignora (`ignoredFilters`), filtra por barrera de enlaces (`maxLinkBarrier`, con
`unknown` fuera por default) y cuenta candidatos por keyword normalizada.

## Delta 2026-08-28 (2) — hereda dos strings que quedaron factualmente falsas

`TASK-1792` corrige el defecto de la curva de CTR del reader que esta task también posee
(`keyword-opportunities-reader.ts`). **Objetos distintos, archivos compartidos**: 1792 corrige la
*estimación* y no toca copy ni la vista; esta task declara la *frescura* y sigue siendo su dueña.
Serialización recomendada **1792 → 1691**, porque esta task necesita saber qué estados de curva
existen para poder declararlos junto a `marketAsOf` y al borde de la lente `●`.

Dos strings de `src/lib/copy/growth.ts` quedan **factualmente falsas** cuando la curva no es
utilizable, y su corrección entra en el alcance de esta task porque el archivo es suyo:

- `keywords.opportunities.noGainHint` — *"Esta keyword ya convierte mejor que el promedio de la
  posición objetivo"*. Afirma una comparación que **no se hizo**: con la curva degenerada el valor
  cero no significa "convierte mejor", significa "no hubo con qué comparar".
- `keywords.opportunities.sortedByGain` — *"Ordenadas por ganancia estimada: lo de arriba es lo que
  más rinde"*. Promete un orden que **no ocurre** cuando el criterio no discrimina.

`TASK-1792` agrega al DTO `ctrCurveSource`, `curveSampleSize` y `orderedBy`; esta task los consume
para que el copy diga la verdad en los dos estados en vez de afirmar el caso feliz. Queda abierto
con 1792 si `estimatedClickGain` debe volverse `number | null` — es la forma que hace imposible el
error, pero rompe el render en compilación y por eso se decide acá, no allá.

## Delta 2026-08-28 (3) — `TASK-1792` cerró: el contrato que hereda esta task, tal como quedó

Lo que efectivamente quedó en `KeywordOpportunitiesResult` (envelope, no por fila — es UN hecho de
la lente, no un atributo de cada keyword). Difiere en dos puntos de lo anunciado en el Delta (2):

| Campo | Tipo | Para qué sirve al copy |
|---|---|---|
| `ctrCurveSource` | `'org_measured' \| 'org_level_reference_shape' \| 'unusable' \| 'fallback'` | **CUATRO estados, no tres** |
| `curveSampleSize` | `{ impressions, clicks } \| null` | el POR QUÉ: `null` = nunca vimos esa posición |
| `orderedBy` | `'estimated_click_gain' \| 'measured_demand'` | si la promesa de orden es cierta |
| `targetPosition` | `number` | contra qué posición se calculó el techo |
| `expectedCtrAtTarget` | `number` | el CTR objetivo que multiplica cada techo |

Los cuatro estados y qué puede afirmar el copy en cada uno:

- `org_measured` — el techo salió de la medición del propio sitio EN esa posición. Es el único caso
  donde `noGainHint` puede decir la verdad: ahí sí hubo con qué comparar.
- `org_level_reference_shape` — **estado nuevo, no estaba en el Delta (2)**. El bucket objetivo no
  alcanza, pero el nivel del sitio SÍ se pudo estimar de su agregado: la forma la presta una curva
  de referencia y el nivel es medido. Un parámetro propio, la forma prestada.
- `unusable` — vimos esa posición y la muestra no alcanza (`curveSampleSize` trae el par que lo
  explica: p.ej. `{ impressions: 75, clicks: 0 }`).
- `fallback` — nunca observamos esa posición y tampoco hubo muestra para un nivel.

Dos cosas que cambian el trabajo de esta task respecto de lo anunciado:

1. **`sortedByGain` ya no es sólo un problema de copy: el servidor lo arregló.** Cuando el criterio
   no discrimina, el reader ordena por demanda medida (impresiones × cercanía a página 1) y lo dice
   en `orderedBy`. Como la tabla re-ordena en cliente y `Array.prototype.sort` es estable, el orden
   que ve el usuario YA está corregido. Lo que falta es que la etiqueta deje de prometer un orden
   por ganancia cuando `orderedBy === 'measured_demand'`.
3. **Dos strings MÁS, que el barrido de drift destapó después del Delta (2)** y que no estaban
   anotadas — mismo archivo, misma familia:
   - `src/lib/copy/growth.ts:2234` (`colGainHint`) — *"Clics adicionales por mes si llegaras a la
     posición objetivo, **según la curva de CTR de tu propio sitio**"*. Es el tooltip de la columna,
     o sea lo que el operador le muestra al cliente, y es falso en **3 de los 4 estados**: sólo
     `org_measured` sale de la curva propia.
   - `src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunityTable.tsx:118` — el comentario
     *"Default: la mayor ganancia estimada arriba"* congela junto al `sort` de la vista un supuesto
     que el servidor ya no siempre cumple.
   Y el mecanismo del problema, para que la corrección no sea sólo de texto:
   `KeywordOpportunityTable.tsx:326` pinta `sortedByGain` **incondicional**, sin leer `orderedBy`.
   Mientras eso siga así, la etiqueta miente por construcción — no por redacción.

4. **`estimatedClickGain` sigue siendo `number`, y ya no colapsa a 0.** La decisión de volverlo
   `number | null` sigue abierta y es de esta task, pero el argumento cambió: hoy el número siempre
   existe y es un techo honesto con procedencia declarada, así que el `null` deja de ser urgente y
   pasa a ser una decisión de ergonomía del render.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 — las dos honestidades van juntas: `◑` tiene fecha, y el borde de `●` también se mueve

Origen: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.1 brecha
S10 y §5.2). **Sin cambio de alcance** — la task sigue siendo `ui-lite`, aditiva, sin migración y sin
flag. Lo que cambia es que su declaración se amplía a las dos lentes, no sólo a la estimada.

Qué se amplía:

- **Declarar el `capturedAt` de la lente `◑` es la mitad del trabajo.** La otra mitad es declarar que
  el **borde derecho de la lente `●` (Search Console) también se está moviendo**: GSC tiene un lag de
  ingesta propio y su último día disponible no es hoy. Si la superficie sólo califica lo estimado, el
  operador se lleva la lectura exactamente al revés de la realidad — **cree que lo medido es firme y
  que lo estimado es lo viejo**, cuando ambos tienen su asterisco y son de distinta naturaleza: el
  `◑` envejece por ciclo mensual del proveedor, el `●` por lag de ingesta diario. Las dos honestidades
  van **en la misma superficie y en el mismo gesto de lectura**; separarlas en dos entregas produce
  medio contrato, que es peor que ninguno porque parece completo.
- **Concretamente:** junto a `marketAsOf` (lente `◑`), la superficie declara el borde de la lente `●`
  —la última fecha con datos de Search Console para la selección leída— con la misma regla dura ya
  escrita para el `◑`: **`null` es legítimo y jamás se rellena con hoy**. Si el reader de
  oportunidades no lo trae, propagarlo entra en el Slice 1 con el mismo criterio (se propaga, no se
  recalcula, y nunca por segunda consulta desde la vista). `[verificar]` durante Discovery de dónde
  sale hoy ese borde en `keyword-opportunities-reader.ts` / `seo_gsc_daily`.
- 🔴 **Las dos fechas se declaran, NUNCA se reconcilian.** Son lentes distintas: `◑` estimado de
  mercado y `●` medido del propio sitio. Se muestran juntas para que el operador vea que ambas tienen
  asterisco; no se promedian, no se combinan en un "dato al DD/MM" único, y ninguna hereda la
  frescura de la otra. La invariante §1.1 vale también para las fechas.

Qué hereda de acá el resto del programa:

- 🔴 **Este es el encoding canónico de frescura del módulo, y es el que la cola priorizada
  (`TASK-1700`) va a reusar. No se inventa un segundo.** Una cola que declare su propia antigüedad
  con otro vocabulario le daría al operador dos formas de leer lo mismo en dos pantallas hermanas.
  Cuando la cola exponga su `asOf` / `staleness`, se apoya en el copy y la forma que esta task fija.
- **Serialización obligatoria del trío `1694 → 1691 → 1693`**: las tres tocan el mismo camino de
  lectura y el mismo bloque de `src/lib/copy/growth.ts`. En paralelo producirían tres encodings de la
  misma columna. Esta task va **segunda**: hereda la cardinalidad corregida de `TASK-1694` y le
  entrega a `TASK-1693` un encoding de frescura ya resuelto.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1691-seo-keywords-lente-de-mercado.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui`
- Blocked by: `none` (desbloqueada el 2026-08-28; el orden sugerido `1691 → 1693` se mantiene como recomendación)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La tabla de oportunidades SEO muestra **Volumen** y **Barrera de enlaces** —datos ESTIMADOS de
mercado, con refresh mensual— sin declarar que lo son y sin su fecha de captura. Esta task expone el
`capturedAt` en el contrato del reader y lo declara en la superficie, para que un operador pueda
responder mirando la pantalla: *"¿este número es de mi cliente o del mercado, y de cuándo es?"*

## Why This Task Exists

Cierra [`ISSUE-154`](../../issues/open/ISSUE-154-seo-keywords-lente-sin-declarar-cuando-hay-dato.md).

El módulo entero se sostiene sobre una distinción que la arquitectura declara invariante (§1.1):
**Search Console es demanda MEDIDA del propio sitio (`●`) y DataForSEO es demanda ESTIMADA del
mercado (`◑`)**; son lentes complementarias que **nunca se promedian**. Pero un operador sólo puede
respetar esa regla si la pantalla le dice cuál está mirando.

Hoy pasa lo contrario de lo que se diseñó: el marcador de lente se pinta **sólo cuando NO hay dato
de mercado** (`KeywordOpportunityMap.tsx:487`), y desaparece justo cuando aparecen las dos columnas
que habría que calificar. El contrato quedó implementado al revés.

**Cómo se llegó acá, y por qué no es negligencia:** `TASK-1308` construyó la tabla cuando el único
estado posible era `unavailable` — ahí la leyenda era correcta y suficiente. `TASK-1661` habilitó el
estado `available` **sin cambio de código en la UI**, que era su objetivo declarado (que las columnas
se llenaran solas). Nadie revisó qué debía aparecer en el estado nuevo. Es la bug class del "segundo
estado de datos": la superficie estaba probada contra el único estado que existía.

Dos consecuencias medibles:

1. **El volumen se lee como propio.** Un operador puede reportarle a un cliente *"tienes 49.500
   búsquedas"* cuando ese número es del mercado. Es el mismo error de lectura de `ISSUE-152`.
2. **El dato envejece invisible.** El proveedor refresca **una vez al mes**; sin `capturedAt` a la
   vista, un volumen de hace cinco semanas se ve igual de vigente que uno de ayer — precisamente lo
   que `TASK-1661` protege en la base (`captured_at` es parte de la clave única) y la UI pierde en
   el último metro.

## Goal

- Con `market === 'available'`, la superficie declara la lente estimada y la fecha de captura.
- La superficie declara **también** el borde derecho de la lente medida (`●`, Search Console): hasta
  qué día hay datos. Las dos honestidades viven en la misma superficie; ninguna se muestra sola.
- Las dos fechas se declaran juntas y **nunca se reconcilian** en un único "dato al DD/MM".
- Con `market === 'unavailable'`, el comportamiento actual se conserva sin regresión.
- El `capturedAt` viaja por el contrato del reader, no por una segunda consulta desde la vista.
- Ningún consumer re-implementa la regla de qué lente es cuál — y el encoding de frescura que fija
  esta task es el que reusan las superficies hermanas, incluida la cola priorizada (`TASK-1700`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary de lentes, §7 readers)
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` (§8 contrato ●/◑)
- `docs/ui/wireframes/TASK-1308-growth-seo-keyword-opportunities-ui.md` (decisión vigente: el dato de
  mercado es **columna y filtro, jamás eje**)
- `.claude/rules/growth-seo.md`

Reglas obligatorias:

- **NUNCA promediar ni mezclar las lentes.** Esta task las hace distinguibles; no las reconcilia.
- **NUNCA literal de copy en JSX** — regla `greenhouse/no-untokenized-copy`; todo a `src/lib/copy/`.
- **NUNCA una segunda consulta desde la vista** para conseguir la fecha: viaja por el contrato.
- **NUNCA pintar un hueco como un valor.** `unknown` sigue siendo "Sin dato", jamás "Baja".

## Normative Docs

- `docs/issues/open/ISSUE-154-seo-keywords-lente-sin-declarar-cuando-hay-dato.md`
- `docs/tasks/complete/TASK-1661-growth-seo-keyword-market-data-capability.md`
- `docs/tasks/complete/TASK-1308-growth-seo-keyword-opportunities-ui.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- 🔴 `TASK-1694` (`to-do`, **orden duro**) — corrige la cardinalidad del candidato y el filtro
  canónico de barrera. Va primero para que esta task declare la lente sobre el universo definitivo y
  no sobre uno que va a cambiar. Serialización del trío: **`1694 → 1691 → 1693`**.
- `TASK-1661` (**complete**) — `readKeywordMarketData` ya calcula `freshness.latestCaptureDate`; esta
  task lo propaga en vez de recalcularlo.
- `TASK-1308` (**complete**) — dueña de la superficie y de la decisión de encoding.

### Blocks / Impacts

- `TASK-1693` — la lente `Descubrir` hereda este encoding de frescura para sus candidatos; va
  **después** (`1694 → 1691 → 1693`) para no producir un segundo vocabulario sobre la misma columna
  y el mismo bloque de `src/lib/copy/growth.ts`.
- `TASK-1700` (cola priorizada de trabajo SEO) — su `asOf` / `staleness` reusa **este** encoding de
  frescura. Una cola que declare su antigüedad con otro vocabulario le daría al operador dos formas
  de leer lo mismo en dos pantallas hermanas. No se inventa un segundo.
- `TASK-1660` — la superficie de objetivos declarados renderiza las mismas columnas de mercado y
  hereda este contrato; que exista antes evita que nazca con el mismo hueco.
- `TASK-1665` — el workbench de discovery mostrará candidatos con dato estimado y debe declararlo
  igual.

### Files owned

- `src/lib/growth/seo/contracts.ts`
- `src/lib/growth/seo/keyword-opportunities-reader.ts`
- `src/lib/copy/growth.ts`
- `src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunityTable.tsx`
- `src/lib/growth/seo/__tests__/keyword-opportunities-reader.test.ts`
- `scripts/frontend/scenarios/` — escenario GVC [verificar nombre exacto al tomar la task]

## Current Repo State

### Already exists

- `readKeywordMarketData` devuelve `freshness: { freshKeywords, latestCaptureDate }`
  (`src/lib/growth/seo/keyword-market-data.ts`).
- `GH_GROWTH_SEO_PERFORMANCE.source` ya tiene `measured`, `estimated`, `mixHint` y
  `freshnessUnknown` (`src/lib/copy/growth.ts:1921`).
- `marketCell(null)` ya resuelve el estado "Sin dato" por keyword con tooltip
  (`KeywordOpportunityTable.tsx:307`).
- `linkBarrierCell` ya trata `unknown` como "Sin dato" y nunca como "Baja".

### Gap

- `KeywordOpportunitiesResult` **no expone** la fecha de captura: el reader de oportunidades llama a
  `readKeywordMarketData`, usa `byKeyword` y `linkBarrierByKeyword`, y **descarta `freshness`**.
- La tabla no declara la lente cuando `market === 'available'`.
- `estimatedHint` existente describe **rank capture** (*"posición exacta observada"*), no volumen de
  mercado — no sirve para esta lente y reusarlo sería peor que no poner hint.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/` (contrato + reader) y `src/views/greenhouse/admin/growth/seo/`
  (superficie). No se mueve nada.
- Future candidate home: `domain-package`
- Boundary: `readKeywordOpportunities` sigue siendo el único primitive que compone medición + mercado
  para esta superficie; la vista no consulta mercado por su cuenta.
- Server/browser split: la fecha se resuelve server-side y viaja en el DTO ya redactado; el browser
  sólo la formatea.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: operador interno de Growth SEO (`growth.seo.observation.read`)
- Momento del flujo: revisando oportunidades para decidir qué keywords seguir o proponer a un cliente
- Resultado perceptible esperado: puede distinguir, sin preguntar, qué columnas son medición propia y
  cuáles estimación de mercado, y de cuándo es la estimación
- Fricción que debe reducir: la duda —o peor, la falsa certeza— sobre el origen de un número que va a
  terminar en una propuesta
- No-goals UX: no rediseñar la tabla, no agregar filtros, no tocar el scatter

### Surface & system decision

- Surface: `/admin/growth/seo/keywords` (existente)
- Nav placement: `none` — no agrega destino de navegación
- Composition Shell: `no aplica` — superficie existente, sin regiones nuevas
- Primitive decision: `reuse` — `Tooltip` + tipografía secundaria ya usados en la tabla
- Adaptive density / The Seam: `no aplica` — no se agrega card ni contenedor nuevo
- Floating/Sidecar/Dialog decision: no aplica
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `none`

### State inventory

- Default: `market === 'available'` → columnas + declaración de lente con fecha
- Loading: sin cambio (la tabla ya resuelve su carga)
- Empty: sin oportunidades → sin cambio
- Error: sin cambio
- Degraded / partial: `market === 'available'` con keywords sin dato → footer declara la lente; la
  celda sigue diciendo "Sin dato". **No se contradicen**: uno habla de fuente, otra de cobertura
- Permission denied: sin cambio
- Long content: la declaración no crece con el nº de filas (va una vez)
- Mobile / compact: a 390px la declaración envuelve en varias líneas, sin scroll horizontal
- Keyboard / focus: la declaración es texto, no foco nuevo; se asocia por `aria-describedby`
- Reduced motion: no aplica (sin motion)

### Interaction contract

- Primary interaction: ninguna nueva — es informativa
- Hover / focus / active: tooltip en el hint de la lente, consistente con los `colXHint` existentes
- Pending / disabled: no aplica
- Escape / click-away: comportamiento estándar del `Tooltip`
- Focus restore: no aplica
- Latency feedback: no aplica
- Toast / alert behavior: no aplica

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit / layout morph / stagger: no aplica
- Timing / easing token: no aplica
- Reduced-motion fallback: no aplica
- Non-goal motion: no animar la aparición de la declaración

### Implementation mapping

- Route / surface: `/admin/growth/seo/keywords` → `KeywordOpportunityTable.tsx`
- Primitive / variant / kind: `Tooltip` + `Typography variant='body2' color='text.secondary'`
- Component candidates: footer de `KeywordOpportunityTable`; agrupación visual bajo los `<th>` de
  Volumen y Barrera
- Copy source: `src/lib/copy/growth.ts` — reusar `source.measured`, `source.mixHint`,
  `freshnessUnknown`; **crear** `marketLensLabel`, `marketLensAsOf`, `marketLensHint`
- Data reader / command: `readKeywordOpportunities` (se le agrega `marketAsOf: string | null`)
- API parity: el campo viaja por el mismo DTO, así que el lane ecosystem y la tool MCP
  `get_seo_keyword_opportunities` lo heredan **sin cambio propio** — verificar que así sea
- Access / capability: sin cambio (`growth.seo.observation.read`)
- States to implement: `available` con fecha · `available` sin fecha (`null`) · `unavailable`
  (regresión) · keyword sin dato

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/` [nombre a definir al tomar la task]
- Route: `/admin/growth/seo/keywords`
- Viewports: desktop + 390px
- Quality profile: `ui-lite` — no exige `premium`
- Required steps: seleccionar el Space de Berel (tiene dato de mercado MX real, capturado
  2026-08-13, así que `available` es reproducible) y una org sin dato para el caso `unavailable`
- Required captures: tabla con columnas de mercado y su declaración; mismo bloque a 390px
- Required `data-capture` markers: `data-capture="seo-keywords-market-lens"` en el footer
- Assertions: la declaración aparece con `available` y no aparece con `unavailable`
- Scroll-width checks: sin scroll horizontal a 390px
- Reduced-motion / focus evidence: no aplica (sin motion); sí evidencia de `aria-describedby`
- Review dossier: `pnpm fe:capture:review`
- Baseline decision / surface ID: superficie existente — cambio esperado en el baseline, declararlo

### Design decision log

- Decision: declaración **una vez en el footer** del bloque de columnas de mercado, no un badge por
  celda
- Alternatives considered: (a) badge `◑` en cada celda; (b) sufijo en el header de cada columna;
  (c) tooltip solamente
- Why this pattern: (a) repetiría el marcador 50 veces y competiría con el número, que es lo que el
  operador vino a leer; (b) duplica la misma afirmación en dos headers; (c) un tooltip esconde
  justo lo que hay que hacer evidente. El footer refleja además cómo ya se declara la lente en el
  scatter, así que la superficie queda coherente consigo misma
- Reuse / extend / new primitive: `reuse`
- Open risks: los umbrales de la barrera son calibración inicial (TASK-1661) — si se recalibran, la
  declaración no cambia, pero el hint podría necesitar ajuste

### Visual verification

- GVC scenario: ver plan arriba
- Viewports: desktop + 390px
- Required captures: estado `available` y estado `unavailable`
- Required `data-capture` markers: `seo-keywords-market-lens`
- Scroll-width check: sí
- Accessibility/focus checks: `aria-describedby` desde los `<th>` de mercado; `◑` con `aria-hidden`
- Before/after evidence: sí — el antes es la tabla sin declaración
- Known visual debt: ninguna conocida en esta superficie
- Visual scorecard: `docs/ui/reviews/TASK-1691-seo-keywords-lente-de-mercado.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo — `greenhouse_growth.seo_keyword_market_data` sigue siendo
  el SoT del dato de mercado; esta task **propaga** un valor que ya se calcula
- Consumidores afectados: `UI`, lane ecosystem, MCP `get_seo_keyword_opportunities`
- Runtime target: `Vercel` (read path)

### Contract surface

- Contrato existente a respetar: `KeywordOpportunitiesResult` — **aditivo**, no cambia campos
- Contrato nuevo: `marketAsOf: string | null` en el resultado `ok: true`
- Backward compatibility: `compatible` — campo nuevo opcional en la lectura; ningún consumer previo
  se rompe
- Full API parity: viaja por el mismo DTO ⇒ app, Nexa, ecosystem y MCP lo heredan sin cambio propio.
  **Verificar** que el payload del lane lo incluya; si no, es parte de esta task

### Data model and invariants

- Entidades afectadas: ninguna nueva
- Invariantes: `marketAsOf` es la fecha de la captura **más reciente** de la selección leída, no un
  promedio ni la de una keyword arbitraria · `null` es legítimo y significa "sin fecha disponible",
  nunca se sustituye por hoy · **NUNCA** se deriva en el cliente
- Tenant/space boundary: sin cambio (el reader ya resuelve org + target)
- Idempotency/concurrency: no aplica (read path puro)
- Audit/outbox/history: no aplica

### Migration, backfill and rollout

- Migration posture: `none` — no toca schema
- Default state: sin flag; es un campo de lectura aditivo sobre datos que ya se muestran
- Backfill plan: no aplica
- Rollback path: revert del PR
- External coordination: ninguna

### Security and access

- Auth/access gate: sin cambio
- Sensitive data posture: 🔴 **`captured_by_organization_id` NO viaja** — expuesto dejaría inferir
  por frescura qué keywords sigue otra organización (invariante de TASK-1661). Sólo la fecha
- Error contract: sin cambio
- Abuse/rate-limit posture: no aplica

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`
- DB/runtime checks: no requiere PG nuevo; el dato ya existe para Berel MX
- Integration checks: payload del lane ecosystem incluye `marketAsOf`
- Reliability signals/logs: ninguna nueva (`seo.market_data.freshness` ya cubre la frescura del dato)

## Hybrid Execution Justification

- **Why not split:** la parte backend es **un campo aditivo en un DTO** que propaga un valor ya
  calculado por un reader existente. Partirlo en una task `backend-data` propia crearía dos specs,
  dos PRs y dos ciclos de revisión para tres líneas de contrato, y dejaría un campo huérfano sin
  consumidor hasta que llegara la segunda. El costo de coordinación supera al del cambio.
- **Primary execution profile:** `ui-ux` — el valor para el usuario está en la superficie; el campo
  es el medio.
- **Contract boundary:** el reader compone y la vista renderiza. La vista **no** consulta mercado ni
  deriva frescura.
- **Risk controls:** cambio aditivo, sin schema, sin flag, sin gasto de proveedor; rollback = revert.
- **Orden interno obligatorio:** Slice 1 (contrato + reader + tests) **antes** de Slice 2 (copy) y
  Slice 3 (superficie + GVC). La vista no se toca hasta que el campo exista.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- El agente que tome la task debe llenar esta zona con Discovery y plan aprobado. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El contrato lleva las dos fechas

- Agregar `marketAsOf: string | null` a `KeywordOpportunitiesResult` (rama `ok: true`).
- En `keyword-opportunities-reader.ts`, dejar de descartar `marketData.freshness` y proyectar
  `latestCaptureDate`.
- Agregar el borde derecho de la lente medida (`●`) al mismo DTO: la última fecha con datos de
  Search Console para la selección leída, `null` cuando no hay. `[verificar]` en Discovery de dónde
  sale hoy (reader de oportunidades / `seo_gsc_daily`) y propagarlo, **nunca** recalcularlo en la
  vista ni por una segunda consulta.
- Tests: con dato → fecha presente; sin dato → `null`; **nunca** la fecha de hoy como relleno — para
  las dos fechas, no sólo para la de mercado.

### Slice 2 — Copy de las dos lentes

- Crear `marketLensLabel`, `marketLensAsOf` (con fecha interpolada) y `marketLensHint` en
  `src/lib/copy/growth.ts`, validados con `greenhouse-ux-writing`.
- Crear el par equivalente para la lente medida: etiqueta y fecha del borde de Search Console, con
  su propio hint que nombre la causa (lag de ingesta), distinta de la del `◑` (ciclo mensual del
  proveedor). Dos causas distintas de envejecimiento, dos textos.
- Reusar `source.measured`, `source.mixHint` y `freshnessUnknown`.
- ⚠️ **NO reusar `source.estimatedHint`**: describe rank capture, no volumen de mercado.
- 🔴 Cero copy que sugiera una fecha combinada, un "dato al DD/MM" único o que una lente hereda la
  frescura de la otra.

### Slice 3 — La superficie declara ambas

- Footer de `KeywordOpportunityTable` con la declaración de la lente `◑` cuando
  `market === 'available'`, **y** con la del borde de la lente `●`, en el mismo bloque de lectura.
- `aria-describedby` desde los `<th>` de Volumen y Barrera hacia la declaración `◑`, y desde las
  columnas medidas hacia la declaración `●`; `◑` y `●` con `aria-hidden`.
- Escenario GVC + capturas desktop y 390px, en los dos estados, con las dos declaraciones visibles y
  sin scroll horizontal a 390px (el footer suma una línea más).

## Out of Scope

- Selector de mercado multi-país — follow-up diferido de `ISSUE-153`, con su propio disparador.
- Cambiar los ejes del scatter — decisión vigente de TASK-1308.
- Tocar `deriveLinkBarrier` o los umbrales de la barrera — cerrados en TASK-1661.
- La superficie cliente (`/growth/seo`) — no muestra estas columnas hoy; si algún día las muestra,
  hereda este contrato pero no es esta task.

## Detailed Spec

**Por qué el `marketAsOf` es del conjunto y no por keyword.** Cada fila tiene su propia
`captured_at`, pero mostrar 50 fechas distintas no ayuda a decidir nada y llena la tabla de ruido.
Lo que el operador necesita saber es *"¿qué tan viejo es lo que estoy mirando?"*, y para eso la
fecha más reciente de la selección es la respuesta honesta y suficiente. La granularidad por keyword
existe en la base y queda disponible si algún día una superficie la necesita.

**Por qué `null` no se rellena con hoy.** Sería exactamente el error que este módulo combate:
inventar un dato que se lee como medición. Si no hay fecha, se declara la lente **sin** fecha
(`freshnessUnknown`), que es menos informativo pero verdadero.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 **MUST** preceder a Slice 3: la vista no puede renderizar un campo que no existe.
- Slice 2 puede ir en paralelo a Slice 1, pero **antes** de Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| La declaración se muestra pero la fecha viene vacía y se rellena con hoy | data quality | baja | `null` explícito + token `freshnessUnknown` + test que lo fija | revisión de código / test rojo |
| Regresión en el estado `unavailable` | UI | baja | GVC en los dos estados, no sólo el nuevo | captura GVC comparada |
| Se filtra `captured_by_organization_id` al DTO | seguridad | baja | invariante declarado; sólo viaja la fecha | revisión del payload del lane |
| Copy literal en JSX | UI | media | regla `greenhouse/no-untokenized-copy` + `ui:code-lint` | lint |

### Feature flags / cutover

Sin flag. Es un cambio de lectura aditivo sobre datos que la superficie **ya muestra**; ocultarlo
tras un flag agregaría una condición que nadie apagaría.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1 | revert del PR; el campo desaparece del DTO y nadie lo consumía aún | < 5 min | sí |
| 2 | revert; las claves de copy quedan sin uso | < 5 min | sí |
| 3 | revert; la tabla vuelve al estado actual | < 5 min | sí |

### Production verification sequence

1. Verificar en el deployment activo que la tabla declara la lente para una org con dato (Berel MX).
2. Verificar que una org sin dato conserva el comportamiento actual.
3. Verificar que el payload del lane ecosystem incluye `marketAsOf`.

### Out-of-band coordination required

Ninguna. Sin migración, sin flag, sin secretos, sin gasto de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `KeywordOpportunitiesResult` expone `marketAsOf: string | null` y el reader lo proyecta desde
  `readKeywordMarketData`, sin recalcularlo.
- [ ] Con dato de mercado, la superficie declara la lente estimada **y** la fecha de captura.
- [ ] La superficie declara **también** el borde derecho de la lente medida (`●`): hasta qué día hay
      datos de Search Console. Ninguna de las dos declaraciones se muestra sola.
- [ ] Las dos fechas se presentan como hechos separados, con causas de envejecimiento distintas
      (ciclo mensual del proveedor vs lag de ingesta de GSC); no existe copy que las combine, las
      promedie ni sugiera que una hereda la frescura de la otra.
- [ ] Sin fecha disponible, declara la lente **sin** inventar fecha (`freshnessUnknown`) — aplica a
      las dos fechas por igual; `null` nunca se rellena con hoy.
- [ ] El encoding de frescura queda documentado como el canónico del módulo, reusable por
      `TASK-1693` y `TASK-1700` sin redefinirlo.
- [ ] Con `market === 'unavailable'`, el comportamiento actual se conserva — sin regresión.
- [ ] Una keyword sin dato sigue mostrando "Sin dato" y `unknown` sigue sin pintarse como "Baja".
- [ ] Todo el copy sale de `src/lib/copy/growth.ts`; cero literales en JSX.
- [ ] `aria-describedby` conecta los `<th>` de mercado con la declaración; `◑` es `aria-hidden`.
- [ ] `captured_by_organization_id` **NO** aparece en ningún DTO client-facing.
- [ ] Evidencia GVC desktop + 390px en los estados `available` y `unavailable`, sin scroll horizontal.
- [ ] `UI ready` pasa a `yes` sólo cuando mapping, plan GVC y decision log estén completos y
  `pnpm task:lint --task TASK-1691` salga sin findings.

## Verification

- `pnpm task:lint --task TASK-1691`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm ui:code-lint --changed`
- `pnpm fe:capture <scenario> --env=staging` + `pnpm fe:capture:review`
- `pnpm local:check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real.
- [ ] Archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `ISSUE-154` movido a `resolved/` con la verificación hecha.
- [ ] `Handoff.md` actualizado si queda rollout pendiente.

## Follow-ups

- Si `TASK-1660` o `TASK-1665` renderizan columnas de mercado, deben heredar este contrato en vez de
  re-declarar la lente por su cuenta.

## Open Questions

- Ninguna bloqueante. La única decisión abierta —granularidad de la fecha (conjunto vs por keyword)—
  quedó resuelta en `Detailed Spec` a favor del conjunto, con el dato por keyword disponible en la
  base si una superficie futura lo necesita.
