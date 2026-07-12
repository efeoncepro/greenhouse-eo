# TASK-1393 — Artifact Composer: extracción a primitive domain-free, catálogos y brand pack

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
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
- Blocked by: `none — ADR GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md (Accepted 2026-07-12) fija la direccion`
- Branch: `task/TASK-1393-artifact-composer-extraction`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extrae el motor de composicion de `src/lib/commercial/tenders/deck/**` a `src/lib/artifact-composer/**` como **primitive domain-free**, convierte las superficies en **catalogos (= dato)** con `outputTarget` declarado, y hace que **la marca sea un input (brand pack)** en vez de una constante horneada. No agrega features: mueve la frontera para que un catalogo nuevo (carrusel IG) **no obligue a tocar el motor** y para que la capability pueda operar as-a-service.

## Why This Task Exists

El motor **ya es generico** (verificado, no supuesto): no importa nada de `commercial/`, `ContentType`/`TemplateName` son `string` resueltos contra el `registry.json`, y el `viewport` sale del contrato de cada plantilla — un canvas 1080x1350 funciona hoy sin tocarlo. Vive en una carpeta con forma de licitacion por accidente historico.

Hay un segundo consumer real e inminente (carruseles de Instagram y otros formatos sociales). **Ese es el momento exacto en que un primitive se bifurca**: si el catalogo social se construye copiando el motor, quedan dos motores que divergen — y la bug class de geometria (`SlideGeometryError`, cerrada 2026-07-12) habria que arreglarla dos veces.

Ademas, las 25 plantillas **hardcodean 51 HEX distintos con la paleta re-declarada por archivo**. Hoy es deuda de marca; con dos catalogos es un multiplicador de brand drift; y con la capability naciendo **as-a-service**, es un **bloqueador del modelo de negocio**: si AXIS queda horneado, no se puede servir a un cliente Globe sin reescribir.

La ventana es ahora: no existe el segundo catalogo, ni la tabla, ni la API. Extraer cuesta poco hoy; despues cuesta un merge de motores divergidos.

## Goal

- Tener el motor en `src/lib/artifact-composer/**` sin **una sola** dependencia de dominio, con su contrato, sus tests y su bug-class guard intactos.
- Convertir deck y carrusel en **catalogos (= dato)**: plantillas + registry + resolvers + canvas + `outputTarget`. Agregar un catalogo **no debe tocar el motor**.
- Sacar `pdf-lib` del camino unico: el merge PDF pasa a ser **un `outputTarget`** (`pdf-merged`), junto a `png-set`.
- **La marca es un input**: los catalogos consumen tokens generados desde el SoT AXIS; ninguna plantilla hardcodea un HEX de marca.
- Dejar puestas las costuras multi-tenant (`owner_org_id` en el catalogo, brand pack parametrizable) **sin construir** UI de cliente, billing ni lane externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (**ADR raiz de esta task — leerlo entero antes de mover un archivo**)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (contrato del catalogo `deck-axis` + las 2 bug classes)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` + `src/@core/theme/axis-tokens.ts` (SoT de marca)
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` + `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` (EPIC-027)
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` (frontera: Creative Studio **genera** el pixel; el Composer **compone** el frame — **NUNCA** reimplementa)

Reglas obligatorias:

- **El motor NUNCA importa de un dominio** (`commercial`, `growth`, …). Si lo necesita, no es del motor: es del catalogo. Es la regla que hace que el primitive siga siendo primitive.
- **Un catalogo, no un fork.** Si agregar una superficie obliga a tocar el motor, el motor esta mal y se arregla **una vez**.
- **NUNCA** hornear AXIS/Efeonce como constante ni hardcodear un HEX de marca: **mata el as-a-service**. La marca es un **input** (brand pack); AXIS es *el brand pack de Efeonce*, no *el* brand pack.
- **NUNCA** degradar las dos bug classes ya cerradas: `overflow: reject` (nunca truncar), filler que **aborta** ante un slot desconocido, y `assertSlideFitsCanvas` (la lamina no puede amputar copy en silencio). Son del **motor** → el carrusel las hereda gratis.
- **NUNCA** un catalogo consume assets de otro dominio/org. El scope se declara.
- Refactor **sin cambio de comportamiento**: el deck SKY debe componer **byte-a-byte equivalente** antes y despues (mismo `DeckPlan` → mismo PDF).

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- ADR `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (Accepted): fija las 3 capas, el brand pack como input y la frontera con Creative Studio.
- Motor ya materializado y testeado: `src/lib/commercial/tenders/deck/{contracts,selector,validate,resolvers,render,compose,solar-icons}.ts` + 5 suites.
- SoT de marca: `src/@core/theme/axis-tokens.ts` [verificar el export exacto de los ramps en Discovery].
- Evidencia visual: Figma `Sistema Axis - PPT` (`GXYeJaRjotmFuczfnd8hLi`) y su mapping de variables/nodes; el precedente de importación coexistió con variantes verbales `Empower your*`, pero no autoriza mapear claims a colores.
- CLI actual: `scripts/commercial/compose-tender-deck.ts` + script `deck:compose` en `package.json`.

### Blocks / Impacts

- **Bloquea a TASK-1391** (renderer productivo): el worker debe rendear **catalogos**, no "el deck". Si 1391 arranca antes, cablea el nombre viejo al Cloud Run Job.
- **Desbloquea el catalogo `social-carousel`** (growth/social) sin fork del motor.
- **No bloquea a TASK-1392** (aggregate `Proposal`): son ortogonales — 1392 es DB/dominio, esta es plataforma. Pueden ir en paralelo.
- Creative Studio (EPIC-028) queda como **consumer futuro del paquete**, nunca como reimplementacion.

### Files owned

- `src/lib/commercial/tenders/deck/**` → `src/lib/artifact-composer/**` (move + boundary)
- `src/lib/artifact-composer/catalogs/**` [nombres exactos se fijan en Plan Mode]
- `docs/architecture/tender-deck-composer-prototypes/**` → home del catalogo `deck-axis` [ruta final en Plan Mode]
- `scripts/commercial/compose-tender-deck.ts` + `package.json` (script `deck:compose`)
- Generador de tokens de marca → CSS custom props [ruta nueva, se fija en Plan Mode]
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`, `agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`, skill `deck-visual-system.md`, docs funcional + manual

## Current Repo State

### Already exists

- Motor completo y verde: selector (audit de cierre referencial) · validate (`overflow: reject` + anti-fabricacion por `evidenceRef`) · 15 resolvers (iconos, ordinales, **geometria anti-fabricacion**) · render (slot-fill en DOM real + `assertSlideFitsCanvas` + captura) · compose (valida TODO antes de renderizar NADA + merge `pdf-lib`).
- **25/25 plantillas** con `data-slot` + `*.slots.json` + `registry.json` (25 content-types, 1:1).
- 5 suites (66 tests), incluida `template-geometry.test.ts` que prohibe `%`+`gap` en las 25.
- CLI `pnpm deck:compose <plan.json> [--out dir]`; outDir default `.captures/tender-deck`.
- El motor **NO** importa nada de `commercial/` (solo `server-only` + sus propios modulos).

### Gap

- El motor vive bajo `commercial/tenders/**`: un dominio de growth que lo importe crea una **dependencia invertida** (growth → commercial).
- `outputTarget` no existe: el merge `pdf-lib` esta **cableado** en `compose.ts` como el unico final posible. Un `png-set` no tiene por donde salir.
- Los resolvers y el icon set (`solar-icons.ts`) son **semanticos del deck** pero viven en el motor: deben pasar a ser **inyectables por catalogo**.
- **51 HEX de marca hardcodeados** repartidos por los 25 archivos, con la paleta re-declarada en cada uno. No hay capa de tokens compartida (solo `deck-signature.css`).
- No existe el concepto de **brand pack** ni de `owner_org_id` en el catalogo → hoy la capability no puede servir a un cliente.

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

### Slice 1 — Mover el motor y sellar la frontera (**package-shaped desde el dia 1**)

- Mover `src/lib/commercial/tenders/deck/**` → `src/lib/artifact-composer/**` con sus 5 suites.
- Sellar la regla dura con un **lint/test de frontera**: el motor no puede importar de `src/lib/commercial/**` ni `src/lib/growth/**`. Un import de dominio **rompe el build**, no queda a criterio del reviewer.
- **Nace package-shaped** (Creative Studio se esta construyendo **ahora**, no "eventualmente"): API publica explicita (barrel `index.ts`), **cero deep-imports** desde consumers, dependencias declaradas, y **cero Next-isms**.
  - ⚠️ **Blocker concreto ya detectado:** `solar-icons.ts` hace `import 'server-only'` — es un **Next-ism** que **no resuelve fuera de Next**. El CLI ya lo esquiva con un shim (`--require ./scripts/lib/server-only-shim.cjs`), y ese shim **viajaria a Creative Studio**. Sacarlo del motor (el boundary server/client se marca en el **consumer**, no en un primitive portable) o aislarlo tras el contrato del catalogo.
  - Verificacion de portabilidad: el motor debe poder ejecutarse **en Node puro, sin Next y sin el shim**.
- Actualizar el CLI y `deck:compose`; mantener el comando y su comportamiento **identicos** (el operador no debe notar el refactor).
- Gate de equivalencia: el `DeckPlan` de SKY produce el **mismo PDF** que antes del move.

### Slice 2 — El catalogo como dato + `outputTarget`

- Introducir el contrato de **catalogo**: `{ templatesDir, registry, resolvers, iconSet, canvas, outputTarget, ownerOrgId }`.
- Extraer los 15 resolvers y el icon set del motor → **catalogo `deck-axis`**. El motor deja de conocer `stat-goal-icon` o `four-pillars`.
- Sacar el merge `pdf-lib` de `compose.ts` → `outputTarget: 'pdf-merged' | 'png-set'`. `png-set` emite N PNG y **ningun PDF**.
- Test de la regla que define la task: **agregar un catalogo nuevo no toca un archivo del motor**.

### Slice 3 — Brand pack como input (la costura ASaaS)

- Verificar los colores incorporados desde `Sistema Axis - PPT` contra sus variables/nodes Figma y contra `axis-tokens.ts`. `Empower your Growth|Brand|Voice|Engine` son claims de capability/masterbrand, no paletas de submarca ni aliases cromáticos implícitos.
- Generar una capa de **CSS custom properties desde el SoT** (`axis-tokens.ts`) y hacer que las 25 plantillas la consuman; **eliminar los 51 HEX** de marca hardcodeados.
- El brand pack pasa a ser **parametro** de `compose(...)`. AXIS queda como *el brand pack de Efeonce*, cargado por default; **nada** en el motor ni en las plantillas lo nombra como constante.
- Guard: un test/lint que falla si una plantilla reintroduce un HEX de marca.
- Verificacion visual **obligatoria**: componer el deck SKY con el brand pack AXIS y **mirar las 4 laminas** — la tokenizacion no puede cambiar el pixel.

## Out of Scope

- **El catalogo `social-carousel`** (plantillas, molde visual, resolvers y consumer de growth). Esta task deja el motor **listo para recibirlo**; construirlo es su propia task.
- El renderer productivo (Cloud Run Job, cola, artifact store) — **TASK-1391**.
- El aggregate `Proposal`, su tabla, sus commands y el rename `Tender → Proposal` — **TASK-1392** (ortogonal).
- Crear `packages/*` o cualquier deployable. Esta task **prepara** la extraccion; **no la ejecuta** (eso lo autoriza EPIC-027).
- UI de cliente, billing/creditos por render, editor de plantillas y el lane `api/platform/ecosystem/*`. Se dejan las **costuras**, no el producto.
- Embeber las fuentes (el render sigue **no hermetico**) — deuda declarada, no se cierra aca.

## Detailed Spec

El corazon de esta task es **una sola frase, y todo lo demas se deriva de ella**: *agregar una superficie nueva no debe tocar el motor*. Si al final de la task alguien puede escribir el catalogo del carrusel sin abrir un archivo de `artifact-composer/`, la task fue un exito; si tuvo que "hacerle un huequito" al motor, fracaso.

Por eso el criterio de aceptacion no es "el codigo se movio", es **el test de frontera**: un import de dominio dentro del motor rompe el build, y un catalogo de juguete (canvas y `outputTarget` distintos) compone sin tocar el motor.

El brand pack no es cosmetica: hoy los 51 HEX repartidos por las plantillas son la razon por la que la capability **no puede servirse a un cliente**. Convertir la marca en input es lo que separa "una herramienta interna de Efeonce" de "una capability vendible" — y cuesta poco ahora, mientras exista **un** catalogo.

El refactor es **sin cambio de comportamiento**: las dos bug classes ya cerradas (fallo silencioso y geometria que amputa copy) viajan con el motor y quedan cubiertas por las mismas suites. Cualquier regresion ahi es inaceptable — un PDF que amputa una palabra **parece terminado**, y por eso nadie lo revisa dos veces.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST cerrar antes de Slice 2: no se puede parametrizar un catalogo mientras el motor siga bajo `commercial/`.
- Slice 2 MUST cerrar antes de Slice 3: el brand pack se inyecta **por catalogo**; sin el contrato de catalogo no hay donde colgarlo.
- El gate de equivalencia (mismo `DeckPlan` → mismo PDF) corre en **cada** slice, no solo al final.
- **NO** empezar el catalogo `social-carousel` hasta que Slice 2 este verde: construirlo antes es exactamente el fork que este trabajo evita.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El refactor cambia el pixel del deck (regresion visual silenciosa) | composer/render | medium | gate de equivalencia byte-a-byte + **mirar** las 4 laminas SKY en cada slice | PDF distinto al baseline; lamina que cambia sin motivo |
| Se degrada una bug class ya cerrada (fallo silencioso / geometria) | composer | low | las 5 suites viajan con el motor; `template-geometry.test.ts` corre sobre las 25 | test rojo; una lamina vuelve a amputar copy |
| El motor "se lleva" un pedazo de dominio al moverse | boundary | medium | **lint/test de frontera**: import de `commercial/**` o `growth/**` rompe el build | build rojo en el gate de frontera |
| La tokenizacion cambia colores sin querer | brand/plantillas | medium | diff visual lamina por lamina; el token debe resolver al **mismo HEX** que reemplaza | lamina con color corrido |
| Se infieren colores desde claims “Empower your…” | brand/pack | medium | mapping Figma verificable; claims tratados como voz, no como subbrand | token sin variable/nodo o rationale AXIS |
| Alguien construye el carrusel antes de Slice 2 y forkea el motor | plataforma | **medium** | ADR + invariantes + esta task como predecesora declarada; avisar al operador y a Codex | aparece un segundo `render.ts` fuera de `artifact-composer/` |
| El CLI cambia y rompe el flujo del operador | tooling | low | `deck:compose` mantiene nombre, args y outDir default | el operador reporta que el comando ya no anda |

### Feature flags / cutover

**N/A — refactor additive sin runtime de produccion.** El unico consumer hoy es un **CLI local**: no hay API, ni UI, ni cron, ni worker, ni env var que prender. No hay usuario que pueda ver una version a medias. El cutover es el merge del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (es un move + un lint) | < 5 min | si |
| 2 | revert PR; el motor vuelve a tener sus resolvers dentro | < 5 min | si |
| 3 | revert PR; las plantillas vuelven a sus HEX | < 5 min | si |

### Production verification sequence

**N/A — la task no toca produccion** (no hay runtime desplegado del composer; el unico consumer es el CLI). La verificacion es local:

1. `pnpm vitest run src/lib/artifact-composer` verde (las 5 suites, 66 tests).
2. `pnpm deck:compose examples/sky-deck-plan.json` produce el **mismo PDF** que antes del refactor.
3. **Mirar** las 4 laminas del deck SKY (no basta con que el test pase: una regresion de color o de crop no la ve un assert).
4. Gate de frontera: un import de dominio dentro del motor **rompe el build**.
5. `pnpm local:check` + `pnpm test` (full) + `pnpm build` (prod).

### Out-of-band coordination required

- **Codex**: no construir el catalogo del carrusel copiando el motor. Es la coordinacion mas importante de esta task.
- **Owner de EPIC-027**: esta task **no crea** `packages/*`; solo deja el motor extraction-ready. Confirmar que la lectura es correcta.
- **Owner de EPIC-028 / Creative Studio**: queda como **consumer del paquete** a futuro; **no** reimplementa composicion de slots.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El motor vive en `src/lib/artifact-composer/**` y **no importa nada** de `src/lib/commercial/**` ni `src/lib/growth/**`; un import de dominio **rompe el build** (gate mecanico, no criterio de reviewer).
- [ ] El motor **corre en Node puro, sin Next y sin el shim de `server-only`** — es la prueba de que Creative Studio podra consumirlo como paquete sin arrastrar un workaround.
- [ ] Un **catalogo de prueba** con canvas y `outputTarget` distintos compone **sin tocar un solo archivo del motor**.
- [ ] `outputTarget` soporta `pdf-merged` (deck) y `png-set`; `png-set` emite N PNG y **ningun** PDF.
- [ ] Los 15 resolvers y el icon set viven en el catalogo `deck-axis`, no en el motor.
- [ ] Las 25 plantillas **no contienen ningun HEX de marca**; los tokens salen del brand pack generado desde `axis-tokens.ts`, y un guard falla si se reintroduce uno.
- [ ] El mapping de tokens valida la fuente `Sistema Axis - PPT`/AXIS; los claims `Empower your*` no crean una paleta ni una regla cromática implícita.
- [ ] El brand pack es **parametro** de la composicion; nada en el motor ni en las plantillas nombra "AXIS"/"Efeonce" como constante.
- [ ] El deck SKY compone **identico** al baseline pre-refactor (mismo `DeckPlan` → mismo PDF) y las 4 laminas fueron **miradas**, no solo testeadas.
- [ ] Las 2 bug classes siguen cerradas: filler que aborta ante slot desconocido, `overflow: reject`, y `assertSlideFitsCanvas` (66 tests verdes).
- [ ] `pnpm deck:compose` conserva nombre, argumentos y outDir por defecto.

## Verification

- Antes de implementar: leer el ADR completo; `pnpm task:lint --task TASK-1393`.
- Durante: `pnpm vitest run src/lib/artifact-composer`; gate de equivalencia del PDF; gate de frontera; composicion del catalogo de prueba.
- Antes de cerrar: `pnpm local:check` + `pnpm test` (full) + `pnpm build` (prod) + revision visual de las 4 laminas SKY + `pnpm docs:closure-check`.

## Closing Protocol

- No cerrar si el deck SKY cambio de pixel sin una razon declarada y aprobada.
- No cerrar si el motor todavia puede importar de un dominio (aunque hoy no lo haga): el gate debe ser **mecanico**.
- No cerrar si queda un HEX de marca en una plantilla: es la costura que habilita el as-a-service.
- Cerrar con changelog + Handoff + actualizacion de `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`, los invariantes, la skill `deck-visual-system.md`, la doc funcional y el manual (las rutas cambian).

## Follow-ups

- Catalogo `social-carousel` (4:5 → `png-set`) + su molde visual + su consumer en growth.
- TASK-1391 — renderer productivo, ahora sobre **catalogos**.
- Embeber las fuentes (Poppins/Geist) para que el render sea **hermetico**.
- Extraccion a `packages/artifact-composer` cuando EPIC-027 lo autorice (Creative Studio lo consume desde ahi).

## Open Questions

- ¿Nombre final del home? `src/lib/artifact-composer/**` evita colision con el **Composition Shell** de UI Platform (que es otra cosa). No es irreversible.
- ¿El catalogo `deck-axis` mantiene su home actual en `docs/architecture/tender-deck-composer-prototypes/` o se mueve junto al motor? Hoy las plantillas viven en `docs/` — raro para un asset de runtime, pero moverlas rompe rutas en varios docs. Decidir en Plan Mode.
- ¿El generador de tokens corre en `prebuild` o como script explicito? Depende de si el CI necesita el CSS generado.
