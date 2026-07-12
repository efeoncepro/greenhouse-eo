# TASK-1393 — Artifact Composer: extracción a primitive domain-free, catálogos y brand pack

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto` <!-- era `Medio`; subió con el Delta (b) (molde + fuentes + contraste) y el Delta (c) (gate estético). Un `Medio` acá invitaba a apurar los slices que protegen la estética. -->
- Riesgo dominante: `regresión visual silenciosa` — ver **Slice 0**
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-027`
- Status real: `Diseno`
- Rank: `TBD — predecesora de TASK-1391; independiente de TASK-1392`
- Domain: `platform|commercial|growth`
- Blocked by: `TASK-1394 debe cerrar antes de mover el resolver; ADR GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md (Accepted 2026-07-12) fija la direccion`
- Branch: `task/TASK-1393-artifact-composer-extraction`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extrae el motor de composicion de `src/lib/commercial/tenders/deck/**` a `src/lib/artifact-composer/**` como **primitive domain-free**, convierte las superficies en **catalogos (= dato)** con `outputTarget` declarado, y hace que **la marca sea un input (brand pack)** en vez de una constante horneada. Sella además el contrato reproducible que necesita cualquier consumer: input semántico sin plantilla elegible por el autor, snapshot inmutable de catálogo/contratos/brand pack/fuentes y extensión de validación semántica inyectada por catálogo. No agrega features de una propuesta concreta: mueve la frontera para que un catalogo nuevo (carrusel IG) **no obligue a tocar el motor** y para que la capability pueda operar as-a-service.

## Why This Task Exists

El motor **ya es generico** (verificado, no supuesto): no importa nada de `commercial/`, `ContentType`/`TemplateName` son `string` resueltos contra el `registry.json`, y el `viewport` sale del contrato de cada plantilla — un canvas 1080x1350 funciona hoy sin tocarlo. Vive en una carpeta con forma de licitacion por accidente historico.

Hay un segundo consumer real e inminente (carruseles de Instagram y otros formatos sociales). **Ese es el momento exacto en que un primitive se bifurca**: si el catalogo social se construye copiando el motor, quedan dos motores que divergen — y la bug class de geometria (`SlideGeometryError`, cerrada 2026-07-12) habria que arreglarla dos veces.

Ademas, las 25 plantillas **hardcodean 51 HEX distintos con la paleta re-declarada por archivo**. Hoy es deuda de marca; con dos catalogos es un multiplicador de brand drift; y con la capability naciendo **as-a-service**, es un **bloqueador del modelo de negocio**: si AXIS queda horneado, no se puede servir a un cliente Globe sin reescribir.

La ventana es ahora: no existe el segundo catalogo, ni la tabla, ni la API. Extraer cuesta poco hoy; despues cuesta un merge de motores divergidos.

## Goal

- Tener el motor en `src/lib/artifact-composer/**` sin **una sola** dependencia de dominio, con su contrato, sus tests y su bug-class guard intactos.
- Convertir deck y carrusel en **catalogos (= dato)**: plantillas + registry + resolvers + canvas + `outputTarget`. Agregar un catalogo **no debe tocar el motor**.
- Sacar `pdf-lib` del camino unico: el merge PDF pasa a ser **un `outputTarget`** (`pdf-merged`), junto a `png-set`.
- **La marca es un input**: los catalogos consumen un pack compilado desde su SoT declarado; ninguna plantilla hardcodea un HEX de marca. El catálogo es dueño de sus **gradient recipes**, que sólo referencian roles del pack.
- Dejar puestas las costuras multi-tenant (`owner_org_id` en el catalogo, brand pack parametrizable) **sin construir** UI de cliente, billing ni lane externo.
- Separar el plan **autorable** (`slideId`, `contentType`, `slots`) del plan **resuelto**: sólo el catálogo puede elegir plantilla, fijar su versión/hash, el brand pack, las fuentes y los validadores que aplicaron. Un consumer/agente no puede bypassear el selector declarando una plantilla distinta.
- Proveer un kernel de validación semántica inyectable por catálogo —sin conocimiento de Proposal/Tender dentro del motor— para que `deck-axis` pueda exigir invariantes entre campos y referencias de evidencia antes de renderizar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (**ADR raiz de esta task — leerlo entero antes de mover un archivo**)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (contrato del catalogo `deck-axis` + las 2 bug classes)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` + `src/@core/theme/axis-tokens.ts` (mirror de AXIS UI; no sustituye los tokens de exportación)
- Figma `Sistema Axis - PPT`, `Color Primitives` `33:2` (SoT del primer pack de presentación `deck-axis`)
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` + `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` (EPIC-027)
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` (frontera: Creative Studio **genera** el pixel; el Composer **compone** el frame — **NUNCA** reimplementa)

Reglas obligatorias:

- **El motor NUNCA importa de un dominio** (`commercial`, `growth`, …). Si lo necesita, no es del motor: es del catalogo. Es la regla que hace que el primitive siga siendo primitive.
- **Un catalogo, no un fork.** Si agregar una superficie obliga a tocar el motor, el motor esta mal y se arregla **una vez**.
- **NUNCA** hornear AXIS/Efeonce como constante ni hardcodear un HEX de marca: **mata el as-a-service**. La marca es un **input** (brand pack); AXIS es *el brand pack de Efeonce*, no *el* brand pack.
- **NUNCA** degradar las dos bug classes ya cerradas: `overflow: reject` (nunca truncar), filler que **aborta** ante un slot desconocido, y `assertSlideFitsCanvas` (la lamina no puede amputar copy en silencio). Son del **motor** → el carrusel las hereda gratis.
- **NUNCA** un catalogo consume assets de otro dominio/org. El scope se declara.
- El autor humano/agente declara intención (`contentType` + slots), **nunca** autoridad de presentación (`template`). El único plan que llega al render es un `ResolvedCompositionManifest` con hashes de catálogo, contrato, template, brand pack y fuentes.
- Un validador semántico puede rechazar un plan, pero el motor no conoce reglas de pricing, staffing, requirements ni evidencia: esas reglas viven declaradas y versionadas en el catálogo/consumer que las aporta.
- Refactor **sin regresión de comportamiento**: antes de la migración hermética de fuentes, el deck SKY debe conservar el mismo artefacto lógico y composición visible. La migración de fuentes puede cambiar bytes de PDF o píxeles de forma deliberada sólo mediante una nueva revisión explícita de catálogo y su baseline, nunca silenciosamente.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- ADR `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (Accepted): fija las 3 capas, el brand pack como input y la frontera con Creative Studio.
- `TASK-1394` — cierra el único contrato de plantilla aún no componible y su vocabulario de resolver antes del move; evita resolver el mismo conflicto durante la extracción.
- Motor ya materializado y testeado: `src/lib/commercial/tenders/deck/{contracts,selector,validate,resolvers,render,compose,solar-icons}.ts` + 5 suites.
- SoT de presentación: Figma `Sistema Axis - PPT` (`GXYeJaRjotmFuczfnd8hLi`), `Color Primitives` `33:2`; el commit `b38a8d0e2` los llevó como aliases CSS locales a las primeras plantillas y `e78e9dfb2` extendió el patrón a las 25.
- Mirror UI: `src/@core/theme/axis-tokens.ts`, procedente de otro Figma AXIS. Sólo puede participar mediante crosswalk de igualdad exacta; no se redondean ni sustituyen valores PPT (p. ej. `#0375D9 ≠ #0375DB`).
- Evidencia complementaria: `Deck / Expression / Empower Your` `39:2`; el precedente de importación coexistió con variantes verbales `Empower your*`, pero no autoriza mapear claims a colores.
- CLI actual: `scripts/commercial/compose-tender-deck.ts` + script `deck:compose` en `package.json`.

### Blocks / Impacts

- **Bloquea a TASK-1391** (renderer productivo): el worker debe rendear **catalogos**, no "el deck". Si 1391 arranca antes, cablea el nombre viejo al Cloud Run Job.
- **Desbloquea el catalogo `social-carousel`** (growth/social) sin fork del motor.
- **No bloquea a TASK-1392** (aggregate `Proposal`): son ortogonales — 1392 es DB/dominio, esta es plataforma. Pueden ir en paralelo.
- **Bloquea el contrato de render de TASK-1391**: el worker debe persistir/renderizar el `ResolvedCompositionManifest`, no el `DeckPlan` histórico mutable.
- Creative Studio (EPIC-028) queda como **consumer futuro del paquete**, nunca como reimplementacion.

### Files owned

- 🔴 `scripts/frontend/baselines/artifact-composer/**` (**el baseline congelado: 25 plantillas + 15 láminas SKY** — el artefacto más valioso de la task) + `BASELINE_DELTAS.md` + el script `composer:visual-gate` en `package.json` [Slice 0]
- `src/lib/commercial/tenders/deck/**` → `src/lib/artifact-composer/**` (move + boundary)
- `src/lib/artifact-composer/catalogs/**` [nombres exactos se fijan en Plan Mode]
- `docs/architecture/tender-deck-composer-prototypes/**` → home del catalogo `deck-axis` [ruta final en Plan Mode]
- `scripts/commercial/compose-tender-deck.ts` + `package.json` (script `deck:compose`)
- contrato portable de `BrandPack`/compilador + snapshot versionado de Figma PPT → CSS custom props [rutas nuevas, se fijan en Plan Mode]
- recipes de gradiente de `deck-axis` + guard de no-HEX/no-gradient local [rutas nuevas, se fijan en Plan Mode]
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`, `agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`, skill `deck-visual-system.md`, docs funcional + manual

## Current Repo State

### Already exists

- Motor completo y verde: selector (audit de cierre referencial) · validate (`overflow: reject` + anti-fabricacion por `evidenceRef`) · 15 resolvers (iconos, ordinales, **geometria anti-fabricacion**) · render (slot-fill en DOM real + `assertSlideFitsCanvas` + captura) · compose (valida TODO antes de renderizar NADA + merge `pdf-lib`).
- **25/25 plantillas** con `data-slot` + `*.slots.json` + `registry.json` (25 content-types, 1:1) — **y, desde TASK-1394, 25/25 COMPONIBLES**, que **no es lo mismo**: *"tener contrato ≠ ser componible"* fue la **3ª bug class** (7 de 25 reventaron al componer la primera oferta real).
- ⚠️ **Baseline actualizado 2026-07-12 (el doc decía "5 suites, 66 tests" — estaba stale):** **8 suites, 102 tests.** Las dos que importan y **DEBEN sobrevivir al move**:
  - **`template-geometry.test.ts`** — prohíbe `%`+`gap` en las 25 (2ª bug class).
  - 🔴 **`template-composability.test.ts`** — **sintetiza un payload desde cada contrato e intenta llenar las 25.** Es lo que convierte *"componible"* de **promesa de la doc** en **hecho verificable en CI**. Su `KNOWN_BROKEN` es un **contrato de dos vías**: falla si una sana se rompe **y también** si una rota se arregla y nadie la saca. **La lista no puede mentir.** *(Hoy está **vacía**: 25/25.)*
  - Verifica además que **la firma vive dentro del `.slide`** (4ª bug class: `mix-blend-mode` sin backdrop).
- CLI `pnpm deck:compose <plan.json> [--out dir]`; outDir default `.captures/tender-deck`.
- El motor **NO** importa nada de `commercial/` (solo `server-only` + sus propios modulos).

### Gap

- El motor vive bajo `commercial/tenders/**`: un dominio de growth que lo importe crea una **dependencia invertida** (growth → commercial).
- `outputTarget` no existe: el merge `pdf-lib` esta **cableado** en `compose.ts` como el unico final posible. Un `png-set` no tiene por donde salir. **ADR posterior aceptado:** el registry debe dejar costura para `pptx-native` y `adobe-express-rest`, pero esta task sólo habilita `pdf-merged`/`png-set`; no implementa un renderer editable ni credenciales externas.
- Los resolvers y el icon set (`solar-icons.ts`) son **semanticos del deck** pero viven en el motor: deben pasar a ser **inyectables por catalogo**.
- **51 HEX de marca hardcodeados** repartidos por los 25 archivos, con la paleta re-declarada en cada uno. No hay capa de tokens compartida (solo `deck-signature.css`). La auditoría posterior demuestra que ese conteo no cubre todos los `rgba()`: la migración debe gobernar las **80 bases RGB normalizadas**, no sólo los literales HEX.
- No existe el concepto de **brand pack** ni de `owner_org_id` en el catalogo → hoy la capability no puede servir a un cliente.
- El renderer todavía acepta un `DeckPlan` cuyo `template` llega desde el archivo/CLI: `planSlides()` sabe derivarlo por `contentType`, pero `composeDeck()` no exige que el valor declarado coincida con el selector. Un agente podría elegir una plantilla semánticamente incorrecta mientras sus slots pasen validación de forma.
- El artefacto guardado no fija todavía un `CatalogSnapshot` completo: faltan hashes/versiones de contrato, template, brand pack, fuentes y validadores semánticos que expliquen por qué un replay era elegible.
- Las plantillas importan Poppins/Geist por red. El propio renderer declara que el resultado no es hermético; un worker aislado no puede depender de Google Fonts para un PDF contractual.
- La validación actual cubre estructura, cardinalidad, enums y parte de la evidencia, pero no ofrece un punto de extensión catalog-owned para invariantes cruzados como plan propuesto único, monto héroe consistente, FTE derivado, cobertura de requisitos o fuente visible.

### Línea base descubierta — AXIS-PPT: color y gradientes (2026-07-12)

- La fuente de presentación es **la variante AXIS para PPT**: Figma `Sistema Axis - PPT`
  (`GXYeJaRjotmFuczfnd8hLi`), `Primitives`/`Color Primitives` nodo `33:2`. No es el
  mismo fichero que el AXIS de UI (`Design System | Vuexy → AXIS`) que alimenta
  `src/@core/theme/axis-tokens.ts`; ambos son variantes AXIS y sólo se cruzan por igualdad exacta.
- El nodo contiene **68 primitives** y la misma biblioteca ya tiene **50 semantic aliases**. En su
  namespace `Deck` existen `Deck / Primitives` y `Deck / Semantic` con las cinco variables/aliases de
  `Empower your*`. La implementación debe **extender esas dos colecciones existentes**: no crear una
  tercera paleta, ni convertir los claims `Empower your*` en paletas implícitas.
- Auditoría reproducible de las 25 plantillas: **80 bases RGB normalizadas** al contar `#RRGGBB` y las
  bases de `rgb()/rgba()`; sólo **7/80** coinciden exactamente con las 68 primitives PPT. Por tanto,
  **73 bases actuales no están todavía tokenizadas en la variante PPT**. La fuente de UI coincide con
  sólo 6/68 primitives PPT y no puede completar por aproximación esa cobertura.
- El ledger de incorporación debe clasificar las 80 bases, con cero huérfanas, en exactamente una de:
  primitive PPT existente, nueva `Deck / Primitives`, alias `Deck / Semantic`, token de recipe o
  opacidad nombrada. Cada alta debe conservar nombre, valor exacto, colección, variable/node Figma y
  consumidores de plantilla; valores de datos/gráficos siguen el mismo ledger, no una excepción local.
- Altas estructurales mínimas que ya revela el deck, sujetas a validación final en Figma: navy
  `#00284D`, `#001A33`, `#001327`; teal `#36C8BF`, `#2AC2B8`, `#9CF1EA`; violet `#6717CD`; y superficies
  `#EEF0F3`, `#F7F8FA`, `#E9EDF3`. La familia específica de cover/back-cover también se tokeniza con
  nombre verificable, incluyendo halo cover `#0E5285`/`#72DED8` y back-cover
  `#00224A`, `#001A3D`, `#004E9F`, `#A4EAFF`, `#14B0F2`, `#0063DD`, `#0091E8`.
- Los gradientes son contratos visuales, no colores intercambiables. En especial, el campo rico actual
  preserva la secuencia navy `#001A33 → #023C70 → #001327`, glow teal `#2AC2B8`, glow violeta `#6717CD`
  y grano blanco de baja opacidad. Las recipes `cover.hero`, `richContent`, `backCover` y
  `lightSurface` deben congelar orden de capas, tipo, geometría, posiciones, stops, alpha y blend: la
  tokenización no puede alterar el píxel ni desplazar el glow/grano.
- Cualquier referencia histórica externa sólo puede informar geometría ya aprobada; **no es fuente de
  color, de tokens ni de una segunda marca**. El único SoT cromático para este pack es `Sistema Axis - PPT`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/artifact-composer/**` en el monolito (movido desde `src/lib/commercial/tenders/deck/**`)
- Future candidate home: `domain-package`
- Boundary: el motor expone `compose(plan, catalog, brandPack, outputTarget)`; consumers autorizados: catalogo `deck-axis` (commercial/Proposal), catalogo `social-carousel` (growth), TASK-1391 (worker) y —a futuro— Creative Studio **como consumer del paquete, nunca reimplementandolo**. Ningun consumer alcanza las plantillas ni el registry directo.
- Server/browser split: el motor es **server-only** (Chromium/Playwright, `pdf-lib`, `server-only` en el icon resolver). Los DTO del `Plan` pueden ser browser-safe si un futuro editor los necesita.
- Build impact: **es un move, no una dependencia nueva** — cero paquetes nuevos, cero worker, cero deployable. El generador de tokens se gobierna como script explícito del repositorio y su CSS resultante se incluye en el catálogo versionado.
- Extraction blocker: **`import 'server-only'` en `solar-icons.ts` — es un Next-ism que NO resuelve fuera de Next** (el CLI ya lo esquiva con `--require ./scripts/lib/server-only-shim.cjs`, y ese shim viajaria a Creative Studio). Se cierra en Slice 1. Los otros acoplamientos (iconos Solar, fuentes) se resuelven por catalogo/brand pack.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa solo al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — 🔴 BASELINE VISUAL CONGELADO: la estética deja de ser una intención y pasa a ser un GATE

> **Directiva del operador (2026-07-12):** *"esa estética costó horas de trabajo; necesito que no se rompa."*
>
> **La task ya pedía "mirar las láminas" y "diff visual" — y eso NO alcanza, por una razón simple: no
> existe un baseline congelado contra el cual diffear.** Si el refactor arranca y el baseline se captura
> después, se está comparando el refactor contra sí mismo. El gate era decorativo.
>
> **Este slice va PRIMERO. Antes de mover un solo archivo.** Su único entregable es la red de seguridad.

**Por qué los tests verdes NO protegen la estética.** El motor puede quedar perfectamente correcto y el deck
salir peor. Los tres vectores son reales y ninguno produce un test rojo:

| Vector | Qué pasa | Por qué ningún test lo ve |
|---|---|---|
| **Tokenizar 80 bases** (Slice 3) | un token resuelve a `#0F2A3E` donde el literal decía `#0F2A3D` | el token existe, el lint pasa, el color corrió 1 punto × 80 bases |
| **Fuentes al brand pack** (Slice 4) | el pack local no reproduce las métricas de la fuente de red → el texto reflowea | **mejor caso:** los resolvers son *fail-closed* y revientan (ruidoso, honesto). **Peor caso:** cabe por poco y **amputa** — la 2ª bug class |
| **Compilar el molde** (Slice 3b) | el chrome se ancla a una región y **cambia de stacking context** | el `mix-blend-mode: luminosity` pierde su backdrop, **la lámina igual renderiza** — sólo sale fea. Es literalmente la **4ª bug class** |

**Entregables:**

- **0a · Probar que el render es DETERMINISTA antes de confiar en un diff.** Componer el catálogo completo
  **dos veces sobre el mismo commit** y comparar. Si dos corridas del mismo código no dan el mismo píxel, el
  gate no puede exigir cero — hay que **encontrar y eliminar la fuente de no-determinismo** (versión de
  Chromium pineada, `deviceScaleFactor` fijo, fuentes locales, sin red, sin `Date.now()` en el render, sin
  animación en vuelo al capturar). **Un gate de cero píxeles sobre un render no-determinista es un gate que
  miente**, y es exactamente la clase de fabricación que este repo prohíbe. Este sub-slice **es el permiso
  para todos los demás**.
- **0b · Congelar el baseline y COMMITEARLO.** Renderizar **las 25 plantillas** (con los payloads sintéticos
  que `template-composability.test.ts` **ya sabe derivar de cada contrato** — el harness existe) **más las
  15 láminas reales del deck SKY**, y committear los PNG + su manifest de checksums bajo
  `scripts/frontend/baselines/artifact-composer/**` (mismo contrato durable que ya usan las 4 superficies
  vivas: `baseline-contract.ts` + `pixelmatch`). **El baseline es el artefacto más valioso de esta task**:
  es la única representación de "las horas de trabajo" que un refactor puede verificar.
- **0c · El gate: `pnpm composer:visual-gate`.** Recompone las 40 imágenes y las diffea contra el baseline
  con `pixelmatch` (reusa `scripts/frontend/lib/visual-diff.ts`). **Umbral: 0 píxeles.** No "se ve parecido",
  no "diferencia menor al 1%". **Cero.** Corre en **cada slice** y **bloquea el merge**.
- **0d · Rebaseline explícito, nunca silencioso.** Un cambio de píxel **intencional** (p. ej. la migración de
  fuentes de Slice 4, o corregir un bug conocido) se declara **lámina por lámina** en
  `BASELINE_DELTAS.md` — qué lámina, qué cambió, por qué, quién lo aprobó — y el baseline se re-promueve
  **en el mismo PR**. **Un rebaseline sin su entrada en `BASELINE_DELTAS.md` también falla el gate.**
  *(Contrato de dos vías, igual que el `KNOWN_BROKEN` de composability: **la lista no puede mentir**. Sin
  esto, el gate se "arregla" promoviendo el baseline y nadie se entera — que es peor que no tenerlo.)*
- **0e · Prueba mecánica de la tokenización, independiente del píxel.** El ledger de 80 bases genera un test
  que compara el **valor computado** del token contra el **literal exacto que reemplaza**. Un token que
  resuelve a otro valor **rompe el build**, sin depender de que alguien mire. *(El diff de píxel y este test
  se cubren mutuamente: el test atrapa el color corrido aunque el diff tuviera ruido; el diff atrapa el
  blend/stacking/reflow que ningún test de valores ve.)*

> **La regla que deja escrita este slice: en una task de refactor visual, el baseline se congela ANTES de
> tocar el primer archivo, o no es un baseline — es una foto de lo que ya rompiste.**

### Slice 1 — Mover el motor y sellar la frontera (**package-shaped desde el dia 1**)

- Mover `src/lib/commercial/tenders/deck/**` → `src/lib/artifact-composer/**` con sus 5 suites.
- Sellar la regla dura con un **lint/test de frontera**: el motor no puede importar de `src/lib/commercial/**` ni `src/lib/growth/**`. Un import de dominio **rompe el build**, no queda a criterio del reviewer.
- **Nace package-shaped** (Creative Studio se esta construyendo **ahora**, no "eventualmente"): API publica explicita (barrel `index.ts`), **cero deep-imports** desde consumers, dependencias declaradas, y **cero Next-isms**.
  - ⚠️ **Blocker concreto ya detectado:** `solar-icons.ts` hace `import 'server-only'` — es un **Next-ism** que **no resuelve fuera de Next**. El CLI ya lo esquiva con un shim (`--require ./scripts/lib/server-only-shim.cjs`), y ese shim **viajaria a Creative Studio**. Sacarlo del motor (el boundary server/client se marca en el **consumer**, no en un primitive portable) o aislarlo tras el contrato del catalogo.
  - Verificacion de portabilidad: el motor debe poder ejecutarse **en Node puro, sin Next y sin el shim**.
- Actualizar el CLI y `deck:compose`; mantener el comando y su comportamiento **identicos** (el operador no debe notar el refactor).
- Gate de equivalencia: el `DeckPlan` de SKY conserva geometría, texto seleccionable, contenido y frames aprobados antes del move; el hash byte-a-byte se exige sólo mientras fuente/assets no cambien de revisión.
- Introducir dos tipos explícitos y browser-safe cuando corresponda:
  - `CompositionPlanInput`: `slideId`, `contentType`, `slots`; es la única forma que un autor/agente puede producir.
  - `ResolvedCompositionManifest`: input canónico + template seleccionado + `catalogVersion`/hash + contrato/template/brand-pack/font hashes + validadores ejecutados y resultado. Es la única forma que puede persistirse, confirmarse o renderizarse.
- Mantener compatibilidad del CLI local con el `DeckPlan` histórico sólo como adaptador: si trae `template`, debe ser exactamente el resultado del selector para su `contentType`; una discrepancia aborta. Ninguna ruta nueva acepta `template` como autoridad de un author.

### Slice 1b — Los ASSETS también se mudan: `docs/` deja de ser un directorio de runtime

**Hallazgo 2026-07-12 (medido, no supuesto).** El motor **lee sus assets desde `docs/` en tiempo de
ejecución**:

```ts
// src/lib/commercial/tenders/deck/solar-icons.ts
import 'server-only'
import fs from 'node:fs'
const DIR = 'docs/architecture/tender-deck-composer-prototypes/assets/solar'
const svg = fs.readFileSync(file, 'utf8')   // ← runtime read desde docs/
```

**Eso es una inversión de capas:** `docs/` es documentación, no un directorio de runtime. Y tiene un
costo medible **hoy, en cada deploy**:

| | |
|---|---|
| `docs/` completo | **143 MB** |
| `docs/architecture/tender-deck-composer-prototypes` | **52 MB** (fotos del squad, íconos clay, SVG) |
| ¿está en `.vercelignore`? | **NO** → **se sube completo en cada deploy de Vercel** |
| ¿lo importa el bundle de Next? | **no** — pero **se sube igual**, porque `.vercelignore` no lo excluye |

⚠️ **Y por eso NO se puede parchear con `.vercelignore` primero.** Excluir `docs/` **hoy** rompería el
`readFileSync` en cualquier consumer server-side que llegue a tocar el composer (y **TASK-1391** —
el worker de render— lo va a tocar por definición). **El orden correcto es: primero mudar los assets,
después excluir `docs/`.** Al revés es un build roto días después, en silencio.

**Entregables:**

- Las plantillas, el `registry.json`, los `*.slots.json` y **los assets** (`solar/`, `clay3d/`,
  `squad/`, `url-lum.svg`) se mudan **con el catálogo** a su home real. `docs/` conserva **la
  documentación**, no los binarios de runtime.
- ⚠️ **Los retratos del squad son PII de personas reales.** Al moverlos, declarar su home y su
  política de acceso — no se replican "porque sí" a un paquete público.
- El resolver de paths deja de apuntar a `docs/` (y deja de depender del `cwd` del proceso, que es
  otra fragilidad latente del `readFileSync` actual).
- **Recién entonces:** agregar `docs/` a `.vercelignore` y verificar que el build de Vercel siga
  verde. Gate: el `DeckPlan` de SKY conserva geometría, texto seleccionable, contenido y frames aprobados antes y después; un cambio de revisión de fuente/asset debe quedar explícito en el manifest.

> **La regla que deja escrita este slice: si un directorio de documentación se lee con `fs` en
> runtime, no es documentación — es un asset store mal ubicado.**

### Slice 2 — El catalogo como dato + `outputTarget`

- Introducir el contrato de **catalogo**: `{ templatesDir, registry, resolvers, iconSet, canvas, outputTarget, ownerOrgId }`.
- Extraer los 15 resolvers y el icon set del motor → **catalogo `deck-axis`**. El motor deja de conocer `stat-goal-icon` o `four-pillars`.
- Sacar el merge `pdf-lib` de `compose.ts` → `outputTarget: 'pdf-merged' | 'png-set'`. `png-set` emite N PNG y **ningun PDF**.
- Test de la regla que define la task: **agregar un catalogo nuevo no toca un archivo del motor**.
- Definir el punto de extensión `CatalogSemanticValidator`: recibe exclusivamente el plan ya resuelto, el snapshot de catálogo y referencias de evidencia que el consumer autorizó; retorna violaciones tipadas, deterministas y serializables. El motor ejecuta/serializa el resultado, pero no contiene `if` de pricing, equipo, SLA o propuesta.
- `deck-axis` debe declarar, versionar y probar sus invariantes semánticas: plantilla compatible con `contentType`; referencias de evidencia requeridas; exactamente una opción propuesta y monto héroe consistente; porcentaje/FTE derivable; cobertura trazable de requisitos. Las reglas que dependan de datos de `Proposal` se evalúan aguas arriba con sus referencias congeladas, nunca consultando DB/red dentro del render.

### Slice 3 — Brand pack de presentación + gradient recipes (la costura ASaaS)

- **3a · Snapshot fuente:** leer y versionar las **68** variables de Figma `Color Primitives` `33:2` **más** las colecciones `Deck / Primitives` y `Deck / Semantic` existentes. Extender estas últimas, dentro del mismo `Sistema Axis - PPT`, con las altas que arroje el ledger de 80 bases; el manifest combinado guarda `fileKey`, `nodeId`, colección, nombre Figma, fecha y checksum. El build/worker nunca llama Figma: consume sólo este snapshot comprometido y verificable.
- **3b · Ledger → primitives → roles → CSS:** antes de compilar, producir un ledger versionado de las **80** bases RGB normalizadas (incluye `rgba()`), con `0` sin mapping y una sola clasificación por base: primitive PPT, `Deck / Primitives`, `Deck / Semantic`, token exclusivo de recipe u opacidad nombrada. Implementar el contrato portable `BrandPack` y un compilador determinista que genere custom properties para primitives, roles semánticos (`surface`, `ink`, `onDark`, `accent`, `glass`, `border`, `dataState`) y opacidades. Cada alta de color conserva valor exacto y variable/node verificable en el mismo Figma PPT; no se aceptan fuentes externas, aproximaciones ni valores huérfanos. El crosswalk a `axis-tokens.ts` sólo se permite por igualdad exacta.
- **3c · Roles → gradients:** declarar las recipes de `deck-axis` como datos versionados del catálogo, no como strings repetidos por template. Cada recipe contiene capas ordenadas, tipo (`linear|radial|grain`), geometría (ángulo/tamaño/origen), stops, opacidad y blend; cada stop apunta a un role/opacity token, nunca a HEX/RGBA. Cubrir `cover.hero`, `richContent`, `backCover` y `lightSurface` y preservar para cada una las capas, orden, posiciones y alpha del baseline; para `richContent`, en particular, navy profundo/medio/cercano, glow teal, glow violeta y grano blanco.
- `Empower your Growth|Brand|Voice|Engine` son claims de capability/masterbrand, no paletas de submarca ni aliases cromáticos implícitos.
- Hacer que las 25 plantillas importen el CSS compilado y elijan una recipe por nombre; **eliminar TODO HEX de marca** y gradient local hardcodeado **sin modificar su valor calculado**. ⚠️ **La cifra canónica es el ledger de 80 bases RGB normalizadas** *(el "51 HEX" que circulaba por este doc está **superseded**: la medición real son **262 literales HEX / 50 únicos** + las bases de `rgb()/rgba()` → **80 bases normalizadas**. **Un solo número, y es el del ledger.**)*
- El brand pack pasa a ser **parametro** de `compose(...)`. AXIS queda como *el brand pack de Efeonce*, cargado por default; **nada** en el motor ni en las plantillas lo nombra como constante.
- Guard: un test/lint que falla si una plantilla reintroduce un HEX de marca.
- 🔴 **Guard de CONTRASTE en el compilador del brand pack (Delta b · §3).** Hoy AXIS está afinado **a mano**
  y nadie lo verifica. **Pero apenas la marca es un INPUT, un cliente puede traer una paleta que produzca
  texto por debajo de 4,5:1** — y el deck sale ilegible, o inadmisible.
  **El compilador debe RECHAZAR un brand pack cuyos roles no pasen WCAG AA contra sus superficies**
  (4,5:1 texto normal · 3:1 texto grande). **Falla al compilar, no en la lámina.**
  *(Cuesta poco hoy, con un solo pack. Con packs de cliente, es la diferencia entre un producto y una
  demanda.)*
  - ⚠️ **Scoping obligatorio del guard, o esta task se auto-bloquea.** El pack AXIS de hoy está afinado a
    mano y **nadie ha medido su contraste**: es perfectamente posible que **alguna combinación vigente no
    pase AA**. Si el guard nace bloqueante para todos los packs, **TASK-1393 no cierra hasta rediseñar la
    paleta** — y eso es exactamente la regresión estética que el operador prohibió.
    **Canónico:** el guard corre **siempre** y **reporta siempre**; es **bloqueante para packs no-default**
    (cliente) y **advisory para el pack `axis`**, cuyas violaciones se listan explícitamente en el reporte
    y salen como **follow-up de diseño**, no como bloqueo de refactor. *(Un refactor no arregla una decisión
    de marca: la revela. Y una cosa a la vez.)*
- Verificacion visual **obligatoria**: `pnpm composer:visual-gate` verde (0 píxeles) — **la tokenización no
  puede cambiar el píxel**, y ahora eso lo decide una máquina, no la buena voluntad de quien mira.

### Slice 3b — El MOLDE también se tokeniza, en la MISMA pasada que el color

> ⚠️ **Lo exige el ADR** (`GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` → **Delta b, §7**), y
> esta task **no lo tenía en el Scope**. Sin él, el trabajo queda **a medias**: se tokeniza el color y el
> **espaciado se sigue midiendo a ojo**.

**La razón de que vaya acá y no en una task aparte es aritmética: el color y la geometría tocan LOS MISMOS
25 ARCHIVOS.** Hacerlo en dos pasadas = **tocar las 25 plantillas dos veces = dos regresiones visuales
sobre todo el catálogo.** Es el error que hay que evitar, no una preferencia de scoping.

**El molde vive hoy como CONVENCIÓN** (las 5 reglas de `deck-visual-system.md`) que **cada plantilla
re-implementa a mano**. Medido: el **lienzo** (`1920×1080` + `overflow:hidden`) y el **degradado** están
re-declarados **25/25**; la **safe-area**, 20/25; el **glass**, en las 8 que lo usan.

> **Un contrato que hay que re-implementar 25 veces no es un contrato: es una sugerencia.** Y la evidencia
> dice que las sugerencias se violan — la firma estaba **fuera de su contexto de blend en 21 de 22
> plantillas**.

**Entregables:**

- **Lienzo, safe-area, escala de espaciado, glass y roles tipográficos** se compilan **una vez** y las
  plantillas los **componen**. Dejan de dibujarlos.
- 🔴 **Regiones DIRECCIONABLES, y el chrome se ancla a una REGIÓN, no a un píxel.** Los cinco
  `calc(100% - 912px)` de `deck-signature.css` eran la **confesión** de que la firma no podía preguntarle
  al layout dónde termina el campo oscuro: alguien **midió cada panel con la regla**.
  *(✅ **Codex ya lo empezó** con `data-url-bubble-backdrop` — ese patrón es el correcto y se generaliza acá.)*
- **La geometría ilegal pasa de VIGILADA a IRREPRESENTABLE.** Hoy `template-geometry.test.ts` **prohíbe**
  `%`+`gap` en las 25. Con un primitive de layout que emite `minmax(0, Nfr)`, **no puedes escribirlo porque
  no escribes el grid.** El guard se queda (defense-in-depth) pero deja de ser lo único entre el comité y
  una tesis guillotinada.
- ⚠️ **Dónde parar:** el molde llega a lienzo/regiones/safe-area/espaciado/chrome/glass/roles de tipo.
  **NO** llega a una librería de **átomos de contenido** (stat, bullet, card). **Un átomo se extrae sólo
  cuando ya está duplicado ≥3 veces Y es idéntico.** Si hay que parametrizarlo para que calce, no es un
  átomo: es una plantilla nueva, y eso lo decide el catálogo.
- 🔴 **La frontera que NO se cruza:** las primitivas del molde son **detalle INTERNO del catálogo**, **NO
  una superficie de autoría**. El `Plan` sigue eligiendo **una plantilla por nombre**; **nunca** ensambla
  primitivas. **Modularizar por dentro es lo contrario de abrir por fuera** — un comité **compara**, y un
  collage resta.
- **Gate de merge: diff visual de las 25** (`pnpm fe:capture:diff`). El refactor debe ser **visualmente
  neutro** salvo donde corrige un bug conocido, y esa excepción se declara **lámina por lámina**.

### Slice 4 — Font pack hermético y manifest de replay

> 🔴 **CORRECCIÓN DE CAPA (Delta b · §2): las FUENTES pertenecen al BRAND PACK, no al catálogo.**
>
> Este slice decía *"font pack local versionado **del `deck-axis`**"* — o sea, **el catálogo dueño de las
> fuentes**. **Está mal asignado, y rompe la premisa entera del as-a-service:**
>
> **La tipografía ES marca.** Si el font pack cuelga del **catálogo**, entonces cambiar el brand pack
> **NO cambia las fuentes** → **el deck de un cliente saldría en Poppins/Geist, que son las fuentes de
> Efeonce.** Un cliente con su propio brand pack **trae sus propias fuentes**.
>
> **Canónico: el `BrandPack` es dueño de `{ colorPrimitives, roles, opacities, FONTS, typeRoles }`.**
> El **catálogo** es dueño del **molde** (lienzo, regiones, espaciado, recipes de gradiente) y **referencia
> roles**, nunca valores. **AXIS es el brand pack de Efeonce, no *el* brand pack** — y eso incluye su
> tipografía.
>
> ⚠️ **Corolario que hay que declarar:** las fuentes de un cliente **probablemente NO son de licencia
> abierta** (Poppins y Geist sí lo son). El contrato del `BrandPack` debe llevar **licencia y derecho de
> embebido por fuente**, y **fallar cerrado** si un pack declara una fuente sin derecho de embebido. Es un
> problema **legal**, no técnico — y con el motor sirviendo a un cliente, es nuestro.

- Incorporar Poppins/Geist como assets locales versionados **del brand pack `axis` (NO del catálogo)**, con licencia, derecho de embebido, variante, checksum y `@font-face` declarativos. No introducir una dependencia implícita de Google Fonts ni asumir que la imagen de Chromium tendrá una fuente instalada.
- **Los roles tipográficos** (título · lead · cuerpo · numerales tabulares) **son del brand pack**, igual que los roles de color. Una plantilla pide `typeRole: 'title'`, **nunca** `font-family: Poppins`.
- El snapshot de catálogo incluye manifest de fuentes y su checksum. El render bloquea red de fuentes y falla cerrado si una fuente declarada no carga; el PDF no puede degradar silenciosamente a fallback tipográfico.
- Emitir junto al PDF/PNG el `ResolvedCompositionManifest` canónico. Su hash contiene input, catálogo, templates/contratos, brand pack, fuentes y resultado de los validadores; el manifiesto permite explicar y repetir el mismo artefacto sin consultar el reloj, Figma, red ni una base de datos.
- El baseline de equivalencia aplica a la migración de assets: comparar geometría, texto seleccionable, fuentes embebidas y frames. Un cambio de píxel deliberado por eliminar la red se versiona como nueva revisión de catálogo, nunca se presenta como replay idéntico.

## Out of Scope

- **El catalogo `social-carousel`** (plantillas, molde visual, resolvers y consumer de growth). Esta task deja el motor **listo para recibirlo**; construirlo es su propia task.
- El renderer productivo (Cloud Run Job, cola, artifact store) — **TASK-1391**.
- El aggregate `Proposal`, su tabla, sus commands y el rename `Tender → Proposal` — **TASK-1392** (ortogonal).
- Crear `packages/*` o cualquier deployable. Esta task **prepara** la extraccion; **no la ejecuta** (eso lo autoriza EPIC-027).
- UI de cliente, billing/creditos por render, editor de plantillas y el lane `api/platform/ecosystem/*`. Se dejan las **costuras**, no el producto.
- Variantes de contenido de `deck-axis` para una propuesta concreta (portada contextual, nota de evidencia visible, capacidad de equipo, ciclo con feedback y paginación de cumplimiento). Requieren una task `ui-ux` sucesora sobre el catálogo ya sellado, con sus wireframes, pruebas visuales y un consumer Proposal; no se agregan como slots ad-hoc dentro de este refactor.

## Detailed Spec

El corazon de esta task es **una sola frase, y todo lo demas se deriva de ella**: *agregar una superficie nueva no debe tocar el motor*. Si al final de la task alguien puede escribir el catalogo del carrusel sin abrir un archivo de `artifact-composer/`, la task fue un exito; si tuvo que "hacerle un huequito" al motor, fracaso.

Por eso el criterio de aceptacion no es "el codigo se movio", es **el test de frontera**: un import de dominio dentro del motor rompe el build, y un catalogo de juguete (canvas y `outputTarget` distintos) compone sin tocar el motor.

El brand pack no es cosmetica: hoy los 51 HEX repartidos por las plantillas son la razon por la que la capability **no puede servirse a un cliente**. Convertir la marca en input es lo que separa "una herramienta interna de Efeonce" de "una capability vendible" — y cuesta poco ahora, mientras exista **un** catalogo.

El contrato tiene tres capas y no se mezclan: `primitives` parten de los 68 valores PPT y se completan en
las colecciones `Deck` del mismo fichero mediante el ledger de 80 bases; `roles` asignan intención reusable
sin revelar un HEX; `gradient recipes` pertenecen al catálogo porque codifican el molde visual (capas,
direccionalidad, grain y safe-area), pero sólo pueden referenciar roles. Una base actual no se considera
migrada hasta que el ledger registre su variable/node o su opacidad nombrada y el CSS generado resuelva al
valor exacto del baseline.
El compilador genera un CSS local versionado a partir de ese contrato. Así el renderer sigue hermético,
una variación de marca reemplaza el pack y un carrusel futuro puede definir otra recipe sin copiar motor ni
paleta.

El refactor es **sin cambio de comportamiento**: las dos bug classes ya cerradas (fallo silencioso y geometria que amputa copy) viajan con el motor y quedan cubiertas por las mismas suites. Cualquier regresion ahi es inaceptable — un PDF que amputa una palabra **parece terminado**, y por eso nadie lo revisa dos veces.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **Slice 0 MUST cerrar ANTES de tocar el primer archivo.** El baseline se congela **sobre el commit
  pre-refactor**. Un baseline capturado después del primer slice **no es un baseline**: es una foto de lo que
  ya rompiste, y el gate valida contra el error. **No es una preferencia de orden: es la condición de
  existencia del gate.**
- **Y dentro de Slice 0, `0a` (determinismo) va antes que `0b` (congelar).** Congelar un baseline sobre un
  render no-determinista produce un gate que falla al azar → el equipo lo empieza a ignorar → el gate muere.
  **Si el render no es determinista, se arregla el render; no se relaja el umbral.**
- Slice 1 MUST cerrar antes de Slice 2: no se puede parametrizar un catalogo mientras el motor siga bajo `commercial/`.
- **Slice 1b — orden DURO e invertible sólo a costa de romper el build:** primero **mudar los assets**
  fuera de `docs/`, **después** agregar `docs/` a `.vercelignore`. Nunca al revés. Hoy el motor hace
  `fs.readFileSync` sobre `docs/architecture/tender-deck-composer-prototypes/assets/**`; excluir ese
  directorio del deploy antes de mudarlo deja el read **roto en runtime**, y el síntoma aparece días
  después, en silencio, cuando un consumer server-side (o el worker de **TASK-1391**) lo toque.
- Slice 2 MUST cerrar antes de Slice 3: el brand pack se inyecta **por catalogo**; sin el contrato de catalogo no hay donde colgarlo.
- El gate de equivalencia visual/lógica corre en **cada** slice, no solo al final; la igualdad byte-a-byte es un subgate sólo cuando las revisiones de fuentes/assets son idénticas.
- **NO** empezar el catalogo `social-carousel` hasta que Slice 2 este verde: construirlo antes es exactamente el fork que este trabajo evita.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| 🔴 **El refactor rompe la estética** (regresión visual silenciosa: color corrido, glow desplazado, blend muerto, texto reflowado) | composer/render | **high** — es el modo de falla **más probable** de esta task, y **ningún test verde lo ve** | **Slice 0: baseline congelado + `pnpm composer:visual-gate` a 0 píxeles, bloqueante en cada slice** + test de igualdad computada del ledger + rebaseline sólo con entrada en `BASELINE_DELTAS.md` | gate rojo; o —peor— un baseline promovido sin su delta declarado |
| **El gate de píxel se "arregla" promoviendo el baseline** en vez de arreglando la regresión | proceso | **medium** — es la salida fácil bajo presión de cierre | `BASELINE_DELTAS.md` es **contrato de dos vías**: un rebaseline **sin** su entrada declarada **también falla el gate** | baseline nuevo en el diff del PR sin línea correspondiente en `BASELINE_DELTAS.md` |
| El render **no es determinista** → el gate falla al azar → el equipo lo empieza a ignorar → **el gate muere** | composer/render | medium | **Slice 0a**: probar determinismo (2 corridas, mismo commit, mismo píxel) **antes** de congelar. Si no lo es, **se arregla el render**, no se relaja el umbral | dos corridas del mismo commit difieren; alguien propone "subir el threshold a 0,5%" |
| Se degrada una bug class ya cerrada (fallo silencioso / geometria) | composer | low | las 5 suites viajan con el motor; `template-geometry.test.ts` corre sobre las 25 | test rojo; una lamina vuelve a amputar copy |
| El motor "se lleva" un pedazo de dominio al moverse | boundary | medium | **lint/test de frontera**: import de `commercial/**` o `growth/**` rompe el build | build rojo en el gate de frontera |
| **Se excluye `docs/` del deploy antes de mudar los assets** → el `readFileSync` del composer queda roto en runtime, y el síntoma no aparece hasta que un consumer server-side lo toque (días después, en silencio) | Vercel / composer | **high** si nadie lee el ordering rule | **Slice 1b: mudar los assets PRIMERO, `.vercelignore` DESPUÉS.** Gate: mismo artefacto lógico/frame aprobado cuando la revisión no cambia, y build de Vercel verde tras la exclusión | `ENOENT` en un route/worker que compone; PDF que sale sin íconos |
| Los **retratos del squad** (PII de personas reales) se replican a un paquete portable "porque estaban en la carpeta" | privacidad | medium | declarar home + política de acceso al mudarlos; **no** viajan por inercia a un paquete que Creative Studio pueda consumir | foto de un colaborador en un artefacto/paquete donde no debía estar |
| La tokenizacion cambia colores sin querer | brand/plantillas | medium | ledger 80/80 + diff visual lamina por lamina; el token debe resolver al **mismo HEX/RGB y alpha** que reemplaza | lamina con color corrido o base sin mapping |
| Una recipe cambia geometría/orden de capas al tokenizar | deck KV/PDF | medium | recipe declarativa + snapshot de CSS calculado + revisión de cover/rich/back/light | glow, grain o contraste visualmente distinto |
| Se infieren colores desde claims “Empower your…” | brand/pack | medium | mapping Figma verificable; claims tratados como voz, no como subbrand | token sin variable/nodo o rationale AXIS |
| Alguien construye el carrusel antes de Slice 2 y forkea el motor | plataforma | **medium** | ADR + invariantes + esta task como predecesora declarada; avisar al operador y a Codex | aparece un segundo `render.ts` fuera de `artifact-composer/` |
| El CLI cambia y rompe el flujo del operador | tooling | low | `deck:compose` mantiene nombre, args y outDir default | el operador reporta que el comando ya no anda |

### Feature flags / cutover

**N/A — refactor additive sin runtime de produccion.** El unico consumer hoy es un **CLI local**: no hay API, ni UI, ni cron, ni worker, ni env var que prender. No hay usuario que pueda ver una version a medias. El cutover es el merge del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | nada que revertir: **sólo agrega** el baseline y el gate. Es la red, no el trapecio | — | n/a |
| 1 | revert PR (es un move + un lint) | < 5 min | si |
| 2 | revert PR; el motor vuelve a tener sus resolvers dentro | < 5 min | si |
| 3 | revert PR; las plantillas vuelven a sus HEX | < 5 min | si |

> 🔴 **El rollback estético es el baseline.** Committear los 40 PNG en Slice 0 no es sólo un gate: es la
> **única representación verificable** de la estética actual. Si un slice la rompe y no se detecta a tiempo,
> el baseline sigue siendo el norte contra el cual reconstruir. **Sin él, "cómo se veía antes" es un recuerdo.**

### Production verification sequence

**N/A — la task no toca produccion** (no hay runtime desplegado del composer; el unico consumer es el CLI). La verificacion es local:

1. 🔴 **`pnpm composer:visual-gate` verde (0 píxeles) contra el baseline congelado.** Corre en **cada** slice, no sólo al final. **Es el gate que decide si la task cierra.**
2. `pnpm vitest run src/lib/artifact-composer` — **todas las suites verdes** (hoy 8/102; el criterio es *"todas verdes"*, no un número congelado).
3. `pnpm deck:compose examples/sky-deck-plan.json` conserva el artefacto lógico, geometría y texto seleccionable; el hash de PDF sólo se exige si fuente/assets mantienen la misma revisión.
4. **Mirar** las láminas del deck SKY. *(El gate mecánico es el piso, no el techo: atrapa el píxel corrido, pero **la pregunta "¿esto está bien diseñado?" sigue siendo humana.** El gate protege lo que ya existe; no bendice lo nuevo.)*
5. Gate de frontera: un import de dominio dentro del motor **rompe el build**.
6. `pnpm local:check` + `pnpm test` (full) + `pnpm build` (prod).

### Out-of-band coordination required

- **Codex**: no construir el catalogo del carrusel copiando el motor. Es la coordinacion mas importante de esta task.
- **Owner de EPIC-027**: esta task **no crea** `packages/*`; solo deja el motor extraction-ready. Confirmar que la lectura es correcta.
- **Owner de EPIC-028 / Creative Studio**: queda como **consumer del paquete** a futuro; **no** reimplementa composicion de slots.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### 🔴 Gate estético (Slice 0) — si estos cuatro no están verdes, **la task NO cierra**, aunque todo lo demás lo esté

- [ ] **El render es determinista**: dos composiciones del mismo commit producen **el mismo píxel**. *(Probado en `0a`, **antes** de congelar el baseline. Un gate de cero píxeles sobre un render no-determinista es un gate que miente.)*
- [ ] **Existe un baseline congelado y committeado** (`scripts/frontend/baselines/artifact-composer/**`) con **las 25 plantillas + las 15 láminas del deck SKY**, capturado sobre el **commit pre-refactor**.
- [ ] **`pnpm composer:visual-gate` corre en cada slice, compara contra ese baseline con `pixelmatch` y falla con umbral CERO píxeles.** No "se ve parecido", no "<1% de drift". **Cero.**
- [ ] **Todo cambio de píxel intencional está declarado lámina por lámina en `BASELINE_DELTAS.md`** (qué cambió, por qué, quién lo aprobó) y el baseline se re-promueve en el **mismo PR**. **Un rebaseline sin su entrada declarada TAMBIÉN falla el gate** — contrato de dos vías, igual que `KNOWN_BROKEN`: *la lista no puede mentir*.
- [ ] **Prueba mecánica de la tokenización, independiente del píxel:** un test compara el **valor computado** de cada token contra el **literal exacto que reemplaza** (las 80 bases del ledger). Un token que resuelve a otro valor **rompe el build**.

### Resto

- [ ] El motor vive en `src/lib/artifact-composer/**` y **no importa nada** de `src/lib/commercial/**` ni `src/lib/growth/**`; un import de dominio **rompe el build** (gate mecanico, no criterio de reviewer).
- [ ] El motor **corre en Node puro, sin Next y sin el shim de `server-only`** — es la prueba de que Creative Studio podra consumirlo como paquete sin arrastrar un workaround.
- [ ] `CompositionPlanInput` no permite a un author elegir `template`; el adaptador histórico rechaza cualquier `template` que no sea el resultado del selector para el `contentType`.
- [ ] Sólo un `ResolvedCompositionManifest` puede llegar a persistencia/render productivo, y contiene hashes/versiones de catálogo, contrato, template, brand pack, fuentes y validadores aplicados.
- [ ] Un **catalogo de prueba** con canvas y `outputTarget` distintos compone **sin tocar un solo archivo del motor**.
- [ ] `outputTarget` soporta `pdf-merged` (deck) y `png-set`; `png-set` emite N PNG y **ningun** PDF. El registry queda extensible y fail-closed para futuros `pptx-native`/`adobe-express-rest`: declarar un target no implementado aborta, nunca cae silenciosamente a PDF.
- [ ] Los 15 resolvers y el icon set viven en el catalogo `deck-axis`, no en el motor.
- [ ] Existe un snapshot versionado de las 68 primitives PPT `33:2` y de las colecciones extendidas `Deck / Primitives` + `Deck / Semantic`, con `fileKey`/`nodeId`/colección/checksum; el compilador y el worker no dependen de red/Figma.
- [ ] El compilador produce CSS local con primitives, roles y opacidades nombradas; un test comprueba que la salida generada está sincronizada con el manifest.
- [ ] El ledger versionado contabiliza las **80 bases RGB normalizadas** actuales (incluidos `rgba()`), con **0 no mapeadas**, sin aproximaciones desde AXIS UI y con una única variable/node PPT o token/opacidad nombrado por base.
- [ ] Las recipes `cover.hero`, `richContent`, `backCover` y `lightSurface` son datos de `deck-axis`; sus capas/stops sólo apuntan a roles/opacidades y un guard falla con HEX/RGBA/gradient local en una template. Sus snapshots conservan el orden, geometría, posiciones, alpha y blend del baseline; `richContent` conserva navy profundo/medio/cercano, glow teal/violeta y grano blanco.
- [ ] Las 25 plantillas importan el CSS compilado y seleccionan una recipe; no contienen ningun HEX de marca ni gradient local.
- [ ] El mapping contiene el crosswalk PPT ↔ AXIS UI, prohíbe substituciones no exactas y exige que todo color actual del deck tenga variable/node dentro del Sistema Axis-PPT; las altas extienden las colecciones `Deck` existentes, no crean otra paleta, y los claims `Empower your*` no crean una paleta ni una regla cromática implícita.
- [ ] El brand pack es **parametro** de la composicion; nada en el motor ni en las plantillas nombra "AXIS"/"Efeonce" como constante.
- [ ] El motor ofrece `CatalogSemanticValidator` sin reglas de Proposal/Tender embebidas; `deck-axis` versiona y prueba sus reglas de compatibilidad, evidencia, pricing, staffing y cobertura de requisitos contra fixtures.
- [ ] Poppins/Geist se cargan desde el font pack local versionado, con licencia/variante/checksum declarados; el renderer bloquea la red de fuentes y falla cerrado ante fallback o asset ausente.
- [ ] El deck SKY conserva contenido, geometría, texto seleccionable y frames aprobados respecto del baseline pre-refactor; si el font/asset pack cambia de revisión, el manifest y baseline versionados declaran la diferencia y las 4 láminas fueron **miradas**, no sólo testeadas.
- [ ] **Las 4 bug classes siguen cerradas** *(el doc decía "las 2" — stale: hay cuatro)*: **(1)** filler que **aborta** ante un slot desconocido + `overflow: reject` — *el fallo silencioso*; **(2)** `assertSlideFitsCanvas` — *la lámina no puede amputar copy en silencio*; **(3)** `template-composability.test.ts` con `KNOWN_BROKEN` vacío — *"tener contrato" ≠ "ser componible"*; **(4)** la firma vive **dentro** del `.slide` — *el chrome que depende de dónde vive en el DOM*. **Todas las suites verdes** (hoy: **8 suites / 102 tests** — el número crece, el criterio es *"todas verdes"*, no un número congelado).

**Añadidos por el Delta (b) — auditoría de rigor 2026-07-12:**

- [ ] 🔴 **El MOLDE se tokenizó EN LA MISMA PASADA que el color** (Slice 3b). **No se tocan las 25 plantillas dos veces.** El lienzo, la safe-area, el espaciado, el glass y los roles de tipo se compilan **una vez**; las plantillas los **componen**.
- [ ] 🔴 **El chrome se ancla a una REGIÓN, no a un píxel.** No queda **ni un** `calc(100% - NNNpx)` en el CSS del catálogo.
- [ ] 🔴 **Las FUENTES y los roles tipográficos viven en el BRAND PACK, no en el catálogo.** Un brand pack de cliente **cambia la tipografía**. *(Si las fuentes cuelgan del catálogo, el deck del cliente sale en las fuentes de Efeonce — y el as-a-service es mentira.)*
- [ ] **El `BrandPack` declara licencia y derecho de embebido por fuente**, y **falla cerrado** si un pack trae una fuente sin derecho de embebido. *(Poppins y Geist son OFL; las de un cliente probablemente no.)*
- [ ] 🔴 **El compilador RECHAZA un brand pack cuyos roles no pasen WCAG AA** contra sus superficies (4,5:1 / 3:1). **Falla al compilar, no en la lámina.**
- [ ] **El `Plan` NO puede ensamblar primitivas del molde.** Elige **una plantilla por nombre**. Las primitivas son detalle **interno** del catálogo, **no una superficie de autoría** — el catálogo sigue **cerrado**.
- [ ] ~~Diff visual de las 25 como gate de merge~~ → **superseded y endurecido por el Gate estético (Slice 0)**, arriba: baseline congelado + `composer:visual-gate` a **0 píxeles** + `BASELINE_DELTAS.md` de dos vías. *(Antes esto era una intención sin baseline contra el cual diffear — o sea, decorativo.)*
- [ ] **El guard de contraste es advisory para el pack `axis` y bloqueante para packs no-default.** Sus violaciones sobre AXIS se reportan y salen como **follow-up de diseño**, **no** bloquean este refactor. *(Un refactor no arregla una decisión de marca: la revela.)*
- [ ] `pnpm deck:compose` conserva nombre, argumentos y outDir por defecto.

## Verification

- Antes de implementar: leer el ADR completo; `pnpm task:lint --task TASK-1393`.
- Durante: `pnpm vitest run src/lib/artifact-composer`; gate de equivalencia visual/lógica (y hash de PDF cuando aplique); gate de frontera; composición del catálogo de prueba.
- Antes de cerrar: `pnpm local:check` + `pnpm test` (full) + `pnpm build` (prod) + revision visual de las 4 laminas SKY + `pnpm docs:closure-check`.

## Closing Protocol

- No cerrar si el deck SKY cambio de pixel sin una razon declarada y aprobada.
- No cerrar si el motor todavia puede importar de un dominio (aunque hoy no lo haga): el gate debe ser **mecanico**.
- No cerrar si queda un HEX de marca en una plantilla: es la costura que habilita el as-a-service.
- Cerrar con changelog + Handoff + actualizacion de `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`, los invariantes, la skill `deck-visual-system.md`, la doc funcional y el manual (las rutas cambian).

## Follow-ups

- Catalogo `social-carousel` (4:5 → `png-set`) + su molde visual + su consumer en growth.
- TASK-1391 — renderer productivo, ahora sobre **catalogos**.
- Task `ui-ux` de extensión de `deck-axis` posterior a esta extracción: portada con contexto/fecha, nota visible de evidencia, capacidad de equipo, proceso cíclico y matriz de cumplimiento paginable. Debe consumir los contratos semánticos ya sellados; nunca editar HTML/slots de SKY como excepción.
- Extraccion a `packages/artifact-composer` cuando EPIC-027 lo autorice (Creative Studio lo consume desde ahi).

## Delta 2026-07-12 (b) — auditoría de rigor: 3 hallazgos de fondo y 3 baselines que mentían

> **Revisado con `arch-architect` · `greenhouse-public-private-tenders` · `deck-studio` · `design-studio`
> + product-design (2026-07-12).**
>
> **Esta task está notablemente mejor construida que TASK-1391 y TASK-1392** — su cuerpo **no** se
> contradice con su Delta, el gate de frontera es mecánico y el ledger de color es riguroso. Así que los
> hallazgos son más finos. **Pero tres son de fondo, y dos de ellos rompen la premisa del as-a-service.**

### 1. 🔴 El MOLDE faltaba en el Scope — y el ADR exige que vaya en la MISMA pasada que el color

El **Delta (b) §7 del ADR** dice: *"el molde deja de ser una CONVENCIÓN y pasa a ser un ARTEFACTO
COMPILADO"*, y que **color y geometría van en una sola pasada** porque **tocan los mismos 25 archivos**.

**El Scope de esta task tokenizaba el color (Slice 3) y NO el molde.** Resultado: se habrían tocado **las
25 plantillas dos veces** → **dos regresiones visuales sobre todo el catálogo**. Ese es el error que el
ADR existe para prevenir.

→ **Nace `Slice 3b`.** Medido: el **lienzo** (`1920×1080` + `overflow:hidden`) y el **degradado** están
re-declarados **25/25**; la safe-area, 20/25. Y los cinco `calc(100% - 912px)` de `deck-signature.css` eran
la **confesión** de que el chrome no podía preguntarle al layout dónde termina una región: **alguien midió
cada panel con la regla**. *(Codex ya empezó a corregirlo con `data-url-bubble-backdrop` — ese patrón es el
correcto y se generaliza.)*

### 2. 🔴 Las FUENTES estaban asignadas a la capa equivocada — y eso rompe el as-a-service

El Slice 4 decía *"font pack local versionado **del `deck-axis`**"* → **el catálogo dueño de las fuentes**.

> **La tipografía ES marca.** Si el font pack cuelga del **catálogo**, **cambiar el brand pack NO cambia
> las fuentes** → **el deck de un cliente saldría en Poppins/Geist, que son las fuentes de Efeonce.**
>
> **Toda la premisa del as-a-service se cae en una línea de asignación de capa.**

**Canónico:** el **`BrandPack`** es dueño de `{ colorPrimitives, roles, opacities, FONTS, typeRoles }`. El
**catálogo** es dueño del **molde** y **referencia roles**, nunca valores.

**Y el corolario legal, que es nuestro problema en cuanto sirvamos a un cliente:** las fuentes de un cliente
**probablemente NO son de licencia abierta** (Poppins y Geist sí lo son). El `BrandPack` debe declarar
**licencia y derecho de embebido por fuente**, y **fallar cerrado** si no lo tiene.

### 3. 🔴 Falta el guard de CONTRASTE — y con brand pack de cliente deja de ser opcional

Hoy AXIS está afinado **a mano** y **nadie verifica el contraste**. **Apenas la marca es un INPUT, un
cliente puede traer una paleta que produzca texto bajo 4,5:1** → deck ilegible, o **inadmisible** (WCAG AA
es piso, y en licitaciones con exigencia de accesibilidad es requisito).

→ **El compilador del brand pack RECHAZA un pack cuyos roles no pasen WCAG AA contra sus superficies.
Falla al compilar, no en la lámina.** Cuesta poco hoy, con un solo pack.

### Y 3 baselines que el doc declaraba y ya eran falsos

| El doc decía | La realidad (medida 2026-07-12) |
|---|---|
| *"5 suites (66 tests)"* — **y estaba como criterio de aceptación** | **8 suites, 102 tests.** ⚠️ **Un número congelado en un acceptance criterion es una trampa**: el criterio correcto es **"todas las suites verdes"**, no un conteo que envejece |
| *"las **2** bug classes"* | Son **4**. Faltaban: *"tener contrato ≠ ser componible"* (3ª) y *"el chrome que depende de dónde vive en el DOM"* (4ª) |
| *"eliminar los **51 HEX**"* | **262 literales HEX / 50 únicos**, y con las bases de `rgb()/rgba()` → **80 bases normalizadas**. El doc tenía **tres cifras distintas** conviviendo. **La canónica es el ledger de 80** |

**Y algo que el doc no mencionaba y es load-bearing:** **`template-composability.test.ts` DEBE sobrevivir al
move.** Es el guard que convierte *"componible"* de **promesa de la doc** en **hecho verificable en CI**, y
su `KNOWN_BROKEN` es un **contrato de dos vías**: falla si una plantilla sana se rompe **y también** si una
rota se arregla y nadie la saca. **La lista no puede mentir.**

## Delta 2026-07-12 (c) — la estética deja de ser una intención y pasa a ser un GATE

> **Directiva del operador:** *"esa estética costó horas de trabajo; necesito que garantices que no se va a
> romper."*

**No se puede *prometer* que ningún agente cometa un error. Lo que sí se puede es hacer que un error no
pueda cerrar la task.** Eso es lo que agrega este Delta: **Slice 0**.

**El agujero que tenía la task.** Ya pedía *"diff visual de las 25"* y *"mirar las 4 láminas"* — y ambas
cosas eran **decorativas**, por una razón que no se veía a simple vista: **no existía un baseline congelado
contra el cual diffear.** Si el refactor arranca y el baseline se captura después, se está comparando el
refactor **contra sí mismo**. Y *"mirar"* es un criterio de reviewer, no un gate: el primer día se mira, el
quinto slice ya no.

**Por qué esta task en particular necesita esto y otras no.** Las tres operaciones centrales de 1393
**parecen preservadoras de valor y no lo son** — y las tres fallan **sin poner un test en rojo**:

1. **Tokenizar 80 bases** → un token que resuelve a un HEX vecino pasa el lint, pasa los tests, y corre el
   color. × 80.
2. **Mover las fuentes al brand pack** → si el pack local no reproduce las métricas, el texto reflowea. El
   *mejor* caso es que los resolvers fail-closed revienten. El *peor* es que quepa por poco y **ampute** —
   que es la **2ª bug class**, la que hace que un PDF mutilado **parezca terminado**.
3. **Compilar el molde** → el chrome se ancla a una región y **cambia de stacking context**; el
   `mix-blend-mode: luminosity` pierde su backdrop y **la lámina igual renderiza**, sólo que fea. Es la
   **4ª bug class**, literal.

**El mecanismo (Slice 0), en una línea:** determinismo probado → baseline congelado y **committeado** sobre
el commit pre-refactor → `pnpm composer:visual-gate` a **cero píxeles**, bloqueante **en cada slice** →
rebaseline **sólo** con su delta declarado lámina por lámina *(contrato de dos vías: **la lista no puede
mentir**, igual que el `KNOWN_BROKEN` de composability)* → y, cubriéndolo por el otro flanco, un test que
compara el **valor computado** de cada token contra el literal que reemplaza, sin depender del píxel.

**Dos decisiones que este Delta toma explícitamente, porque callarlas rompía la task:**

- **El guard de contraste NO puede nacer bloqueante sobre AXIS.** El pack de hoy está afinado a mano y nadie
  midió su contraste: es posible que alguna combinación vigente no pase AA. Un guard bloqueante para todos
  los packs **impide cerrar 1393 hasta rediseñar la paleta** — o sea, provoca exactamente la regresión
  estética que se quiere evitar. **Advisory para `axis`, bloqueante para packs de cliente.** *Un refactor no
  arregla una decisión de marca: la revela. Y una cosa a la vez.*
- **Si el render resulta no ser determinista, se arregla el render — no se relaja el umbral.** Un gate que
  falla al azar es un gate que el equipo aprende a ignorar, y entonces no protege nada.

**Lo que este gate NO hace, y hay que decirlo:** protege **lo que ya existe**; no bendice lo nuevo. La
pregunta *"¿esto está bien diseñado?"* sigue siendo humana. El gate garantiza que las horas invertidas no se
pierdan por accidente — no que las próximas estén bien invertidas.

## Delta 2026-07-12 (d) — bitácora de implementación (Claude): Slices 0 → 3a COMPLETOS, con 4 recalibraciones medidas

> Trabajo en `develop`, local-first, sin push. Gate visual verde (0 píxeles) en cada slice.

| Slice | Commit | Estado |
|---|---|---|
| **0** — baseline congelado + `pnpm composer:visual-gate` | `b59df463d` | ✅ 40 frames (25 probes sintéticos compartidos con composability + 15 láminas SKY), manifest sha256, `BASELINE_DELTAS.md` de dos vías con digest sellado. **0a encontró y arregló no-determinismo REAL**: `chromium.launch()` desnudo variaba subpíxeles de GPU (3 px en HighlightWave, `backdrop-filter`) → nace `launchComposerBrowser()` (software raster + sRGB) como launch canónico. 2 selftests post-fix: 0 px |
| **1** — move + frontera + package-shaped | `72e9ba6e7` | ✅ motor en `src/lib/artifact-composer/**`; boundary test por ALLOWLIST (relativo-interno + `node:*` + playwright + pdf-lib) + override eslint; sin `server-only` ni shim (CLI corre Node puro); barrel; `CompositionPlanInput`/`ResolvedCompositionManifest`; `TemplateAuthorityError` |
| **1b** — assets fuera de `docs/` | `a50eecb60` | ✅ catálogo runtime (12,4MB) → `catalogs/deck-axis/`; política PII squad declarada; el gate ATRAPÓ una regresión real del move (logo efeonce escapaba vía `../../../public/`) → catálogo autocontenido |
| **2** — catálogo como dato | `88b80c678` | ✅ `ArtifactCatalog` + `outputTarget` fail-closed (`png-set` sin PDF; `pptx-native`/`adobe-express-rest` declarados abortan); 16 resolvers + icon set + timeline al catálogo; `CatalogSemanticValidator` con 4 reglas reales de deck-axis probadas (pricing-integrity, team-dedication, requirements-coverage, template-compatibility — el deck SKY pasa las 4); `resolvePlan` → manifest con hashes; toy catalog test (la regla que define la task, probada) |
| **3a** — snapshot + ledger | `2d633819d` | ✅ snapshot AXIS-PPT verificado vía Figma MCP (68 primitives `33:2` + 50 semantic `33:129` + Deck/Foundations `39:2`); `pnpm composer:color-ledger` (contrato de dos vías) |
| **3b-i** — clasificación + compilador BrandPack | `2860f2c7c` | ✅ 78/78 clasificadas (naming mecánico por familia+luminosidad, convención `--axis-deck-*`; 71 `figma.status=proposed`); `brand-pack.ts` (compilador determinista + guard WCAG — **AXIS pasa HOY los 7 pares declarados**, advisory sin violaciones; blocking probado con pack ilegible); `deck-tokens.css` committeado + sync test + **0e** (token ≡ literal exacto, hex + triple RGB) |
| **3b-ii** — tokenización de las 25 | `1f50bd8e3` | ✅ **671 literales → tokens a CERO píxeles** (reescritura mecánica dirigida por el ledger; alphas exactos vía `calc(AA/255)`; SVG attrs → style). Guard post-migración: cualquier literal reintroducido rompe (`composer:color-ledger` + test CI) |
| **3c** — recipes como dato | `94a5bb682` | ✅ `gradient-recipes.json` (rich-content · cover-hero · back-cover · light-surface; stops SOLO role:/token:) → tokens `--axis-deck-recipe-*`; 19 plantillas recableadas a 0 px; inventario RATCHET de los 96 gradientes de contenido restantes (dos vías) |
| **3b-molde** — molde compilado | `17cedc90c` | ✅ `deck-mold.css`: lienzo (re-declarado 25/25 → compilado 1 vez, `overflow:hidden` unificado 25/25 a 0 px) + `--deck-safe` + escala de espaciado medida + escala de blur del glass adoptada. **Los 5 `calc(100% - NNNpx)` del chrome YA NO EXISTÍAN** (la firma ancla a región vía `data-url-bubble-backdrop` — patrón Codex generalizado); los 3 `calc()` restantes son geometría interna de contenedor, no chrome midiendo paneles |
| **4** — font pack + manifest | `31d35fbe2` | ✅ Poppins/Geist TTF locales OFL en el PACK (licencia+`embedRights` fail-closed+sha256); type roles (`var(--axis-deck-type-display\|text)` — cero `'Poppins'` literal); render **BLOQUEA http(s)** + aborta ante fuente no cargada (prueba negativa); **rebaseline DECLARADO** (38 frames, rasterización sub-visual TTF vs woff2, mirado contra baseline; `--freeze` se negó hasta declararlos); `ResolvedCompositionManifest` **emitido** junto al PDF/PNG con brandPack hash + 13 checksums de fuentes + validadores |

**Recalibraciones (medidas, no opiniones):**

1. **La cifra canónica del ledger es 78, no 80**: 646 literales → 78 bases RGB normalizadas medidas mecánicamente sobre el catálogo vigente (`pnpm composer:color-ledger`). 7/78 exactas contra PPT (como anticipaba la auditoría). El doc de la task queda superseded por el tool en esta cifra.
2. **"8 suites, 102 tests" era 7 suites del deck + la de la state machine** (que NO viaja: es del aggregate `Proposal`). Post-refactor: 10 suites / 111 tests del paquete, todas verdes.
3. **`docs/` NO se puede excluir completo de `.vercelignore`**: el Roadmap reader (TASK-1152) lee `docs/{epics,tasks,mini-tasks,issues}/**/*.md` en runtime vía `outputFileTracingIncludes`. Se excluyó sólo `tender-deck-composer-prototypes/` (~40MB post-move). El texto del Slice 1b queda recalibrado así.
4. **Los alphas son composicionales**: el blanco aparece con 54 alphas distintos — la "opacidad nombrada" por base×alpha sería ruido. Se tokeniza la BASE (`--x` + `--x-rgb`) y el alpha queda en la composición; las opacidades nombradas se reservan para las recipes.

**🔴 Gate de decisión del operador — LO ÚNICO que separa la task de `complete` (propose → confirm):**
las **71 altas** del ledger están nombradas (naming mecánico familia+luminosidad extendiendo la
convención `--axis-deck-*` de `39:2`) y **horneadas en el CSS compilado bajo `figma.status: proposed`**
(el operador autorizó continuar; los valores son EXACTOS a los literales que reemplazan — test 0e).
Falta el paso que NO es de agente: **crear/validar esas variables en las colecciones `Deck` del
`Sistema Axis - PPT`** y registrar sus `nodeId` en `color-ledger.json` (sin cambiar valores — igualdad
exacta o nada). Es el acceptance criterion "todo color actual del deck tiene variable/node dentro del
Sistema Axis-PPT". La tabla propuesta completa vive en `catalogs/deck-axis/brand/color-ledger.json`.

**Estado al 2026-07-12 (fin de sesión de implementación): `code complete, validación Figma pendiente`.**
Gates: suite full **9281 tests verdes** · `pnpm vitest run src/lib/artifact-composer` 12 suites/125 ·
`composer:visual-gate` 0 px · `composer:color-ledger --strict` 0 sin mapping · `composer:brand-pack
--check` sincronizado · lint 0 · tsc 0 · build prod verde · CLI `deck:compose` idéntico + manifest.

## Open Questions

- ¿Nombre final del home? `src/lib/artifact-composer/**` evita colision con el **Composition Shell** de UI Platform (que es otra cosa). No es irreversible.
- ~~¿El catálogo mantiene su home en `docs/` o se mueve?~~ **CERRADA (Delta b · Slice 1b): se mueve.** El motor hace `fs.readFileSync` sobre `docs/` **en runtime** — eso no es documentación, es un **asset store mal ubicado**, y en un contenedor (TASK-1391) **revienta**.
- ¿El generador de tokens corre en `prebuild` o como script explicito? Depende de si el CI necesita el CSS generado.
