# TASK-1662 — Growth SEO: keyword gap — qué rankea la competencia y el cliente no

## Delta 2026-08-27

- El transporte `postDataForSeoTask` ahora **exige** `consumer` en todas sus variantes: las llamadas
  de gap discovery nacen declarando `consumer: 'seo'` — cambiado por TASK-1696.
- La señal de alerta de su tabla de riesgos («gasto fuera de patrón en `seo_provider_spend_daily`»)
  gana un aliado real: `seo.provider.cost_over_budget` existe desde TASK-1696 y avisa al 80% del tope
  del período, antes de que el gate empiece a rechazar corridas.

## Delta 2026-08-27

- **`TASK-1775` quedó `code complete` (rollout pendiente):** ya existen la tabla multi-productor
  `greenhouse_growth.seo_domain_overview_snapshots`, el writer `persistDomainOverviewSnapshots` y el
  reader `readDomainOverview` (`src/lib/growth/seo/domain-overview/**`). Cuando esta task quiera dar
  contexto de tamaño al gap ("el competidor ranquea 4.000 keywords"), consume ese reader — no
  re-deriva la foto de dominio ni llama `domain_rank_overview` por su cuenta.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-27

- **El colector de competidores del proveedor lo estrenó `TASK-1709`** (diagnóstico de prospecto):
  `competitors_domain` + `backlinks/competitors` + `domain_intersection` viven en
  `src/lib/growth/seo/prospect/collect.ts` con su forecast en `prospect/contracts.ts`. Esta task
  **consume/extrae ese primitive** al aterrizar (o generaliza los payloads a un módulo compartido) —
  **nunca un segundo colector** de los mismos endpoints. Decisión declarada en el Discovery de 1709.

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 — el gap es un ORIGEN, no una autoridad de orden; y "priorizado por volumen" es falso

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §3.1 (S1, S5),
§3.3 (capacidad ociosa del proveedor) y §5.2 (la cola priorizada).

**1. El competidor se DESCUBRE, no se asume conocido.** `### Depends on` suma `TASK-1699`
`[por crear]`: los endpoints `competitors_domain` / `serp_competitors` / `bulk_traffic_estimation`
cuestan ~USD 0,03 por corrida, y el rank capture **ya paga `depth 20`** —o sea, ya compramos las
filas de todos los competidores del top-20 y `parseSerpRankObservation`
(`rank-capture.ts:171-221`) las recorre y las descarta—. Esta task nació asumiendo que alguien ya
sabe quién es el competidor (la auditoría lo dice con esas palabras, §3.3). La declaración humana
sigue siendo el acto de gobierno —un competidor mal elegido invalida el análisis río abajo—, pero
la **propuesta** sale de datos que ya pagamos, no de la memoria de un ejecutivo.

**2. 🔴 Esta task NO produce ordenamiento propio.** Sus hallazgos entran a la cola priorizada
(`TASK-1700`) como filas con `origin='competitor_gap'` y una `evidence_ref` **opaca** —nunca FK,
nunca JOIN—. La cola no absorbe al gap: lo **consume**. **El gap es un ORIGEN; la cola es la
AUTORIDAD DE ORDEN.** Corolario duro: `readKeywordGap` devuelve hechos con su procedencia y su
fecha, y quien decide qué va primero es la cola con su `priority_score_version`.

**3. 🔴 "Priorizadas por volumen" se corrige — la premisa es falsa.** Estaba literal en tres lugares
(`### Depends on`, Slice 3 y Acceptance Criteria) y una línea la elevaba a **bloqueo duro**
diciendo que sin volumen no hay forma de priorizar. No es cierto, por cuatro razones acumulativas:

- el volumen es **◑ estimado**, con agrupación *broad* y redondeo a buckets declarados por el
  proveedor: no es un conteo;
- **no contiene la depresión de clic por AI Overviews** — una keyword con AIO puede tener volumen
  alto y clic casi nulo;
- **ignora la barrera de enlaces**, que este dominio ya deriva server-side con `deriveLinkBarrier()`
  del perfil real del top-10 (TASK-1661 follow-up, 2026-08-14) — un gap tras una barrera `alta` no
  es una oportunidad, es una fantasía cara;
- **ignora si el gap es recuperable**: ordenar por volumen pone arriba justo lo que no se puede ganar.

Ordenador correcto, y es el que esta task alimenta: **valor recuperable = volumen × CTR esperado en
la posición alcanzable (curva PROPIA, derivada de nuestras impresiones/clics de GSC, no una curva de
blog) × factor AIO (de las SERP features que ya capturamos) × señal de valor comercial (`cpc_usd`
como proxy)**, todo filtrado por `deriveLinkBarrier()`. Los factores se computan y se persisten con
su procedencia; el peso de cada uno vive en la config versionada de la cola.

**4. 🔴 Invariante nuevo — cuando hay medición, el gap se calla.** Si la keyword **ya tiene
impresiones en el Search Console del cliente**, manda la lente medida (●) y el gap (◑) no la
propone ni la ordena: ahí no hay "no aparezco", hay una posición real que la superficie de
oportunidades ya cubre. Es el invariante ●/◑ aplicado al **ordenamiento**, no sólo a la
visualización — hoy la task lo respeta al pintar y lo viola al ordenar.

**5. Sin SERP features, la salida dice la keyword y no dice el trabajo.** PAA, video, local pack,
shopping y AI Overview **ya se capturan** y hoy se colapsan a un booleano de AIO (§3.1 S5). El
formato ganador cambia el entregable —no es lo mismo "escribe un artículo" que "necesitas un video y
un bloque de preguntas"—. El reader de gap las expone; si no las tiene, lo declara en vez de
callarlo.

## Delta 2026-08-14 — la intención declarada existe: el gap deja de ser binario

`TASK-1659` está **complete**: una membresía del set del cliente ahora puede llevar intención
declarada — `target` (compromiso acordado con el cliente), `opportunity` (demanda medida que se está
empujando) o `NULL` (nadie la clasificó). Lo que esta task puede dar por sentado, y lo que tiene que
ajustar:

🔴 **La taxonomía del reader está escrita como binaria y ya no alcanza.** `readKeywordGap` separa
"el cliente no aparece" de "el cliente aparece peor". Una keyword declarada **`target`** que hoy está
en la posición 60 —o directamente sin rankear— cae exacta en "el cliente no aparece", pero **no es un
hallazgo: es un compromiso en curso**. Presentarla como gap descubierto en la reunión de primera vez
le vende al cliente algo que ya le prometimos, y borra que la distancia era conocida y aceptada.
El tercer estado —"no aparezco, pero ya es objetivo declarado desde tal fecha"— tiene que estar en el
contrato del reader, no resolverse en la superficie.

- El cruce contra el set del cliente ahora tiene una columna más que leer. `NULL` es un **cuarto**
  estado (seguida, sin intención declarada), no un sinónimo de `opportunity`: hoy son todas las
  keywords seguidas antes del 2026-08-14.
- El eje declarado **nunca se promedia** con el eje de gap, ni entre sus valores. "Objetivos" y
  "oportunidades" responden preguntas comerciales distintas.
- Ojo con el homónimo: la palabra "oportunidad" de esta task (gap de contenido vs. gap de
  optimización) no es el valor `opportunity` de la intención declarada. Si ambas aparecen en la misma
  superficie, hay que desambiguarlas.

## Delta 2026-08-13 — desbloqueada

El primitive de mercado de `TASK-1661` está **complete** (2026-08-13): `readKeywordMarketData` y la tabla `seo_keyword_market_data` existen. 1662 escribe en ESA tabla el `keyword_info` que ya viene inline y pagado en `domain_intersection` — nunca abre un segundo almacén.

## Summary

La tercera pregunta del módulo, y la única que hoy no tiene ni datos ni contrato: **¿qué búsquedas
gana la competencia donde el cliente es invisible?** Esta task construye la fundación de datos —
competidores, su cobertura de keywords y el cruce contra el set del cliente. La superficie sale
después, cuando exista qué mostrar.

## Why This Task Exists

Search Console es **estructuralmente ciego** a lo que el cliente no rankea. Si no estás en el top
~100 no hay impresiones, así que esa búsqueda sencillamente **no existe** en tus datos. Todas las
superficies del módulo heredan esa ceguera: `/admin/growth/seo/keywords` sólo puede contestar *"de
lo que ya tengo, ¿qué empujo?"*, y la lente de objetivos (`TASK-1660`) sólo mide lo que alguien
declaró a mano.

Nadie puede contestar *"¿qué me estoy perdiendo entero?"*, que es la pregunta con más valor
comercial del módulo: es lo que se le muestra a un prospecto en la primera reunión —*"tu competidor
aparece en estas 40 búsquedas donde tú no existes"*— y lo que alimenta el plan de contenidos.

Revisado el 2026-08-07: de las 12 tasks abiertas de EPIC-022, **ninguna** cubre esto. No es una
decisión postergada, es una ausencia del roadmap.

## Goal

- Existe un modelo de competidores por sitio, declarado y auditable, **propuesto desde el top-N que
  el rank capture ya paga** (`TASK-1699`), no desde la memoria de alguien.
- Se puede responder qué keywords gana un competidor donde el cliente no aparece.
- El resultado es **priorizable por la cola**: cada hallazgo entra como `origin='competitor_gap'`
  con los factores de valor recuperable computados y su procedencia, no como una lista cruda de
  miles de filas ni como un ranking propio de esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **`enforceSeoRunEntitlement` antes de cualquier llamada al proveedor.** Esta task es la que más
  gasta del módulo: el universo de keywords de un competidor no tiene techo natural.
- Cliente DataForSEO canónico; ningún SDK paralelo.
- Un competidor es un **hecho declarado**, no una inferencia: quién lo declaró y cuándo quedan
  registrados. Un competidor mal elegido invalida todo el análisis río abajo. Que la **propuesta**
  venga del top-N ya pagado (`TASK-1699`) no cambia eso: propone la máquina, declara el humano.
- Boundary SEO ↔ AEO intacto: cero JOIN cross-motor.
- 🔴 **Esta task no ordena.** El gap es un **origen** de la cola priorizada (`TASK-1700`), que es la
  **autoridad de orden**. `readKeywordGap` entrega hechos con procedencia, fecha y factores; jamás
  un ranking propio, un "top 40" ni un score compuesto acuñado acá.
- 🔴 **Cuando hay medición, manda la medición.** Una keyword con impresiones en el GSC del cliente
  no es gap: es posición conocida, y la cubre la superficie de oportunidades. El reader la excluye
  del gap en vez de duplicar la conversación en dos pantallas con dos números.

## Normative Docs

- `docs/tasks/complete/TASK-1661-growth-seo-keyword-market-data-capability.md` — su dependencia dura (**complete** desde 2026-08-13; el primitive de mercado ya existe en producción)
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`

## Dependencies & Impact

### Depends on

- **`TASK-1661`** (complete) — bloqueo duro, pero **no por el volumen**: lo que hace falta es el
  primitive de mercado completo, y en particular **`deriveLinkBarrier()`**, que dice si el gap es
  recuperable. El volumen solo es ◑ estimado, agrupado en *broad* y redondeado a buckets del
  proveedor; ordenar por él pone arriba justo lo que no se puede ganar (ver Delta 2026-08-15)
- **`TASK-1699`** `[por crear]` — descubrimiento de competidores desde el top-N que el rank capture
  **ya paga** (`depth 20`) más `competitors_domain`/`serp_competitors`/`bulk_traffic_estimation`
  (~USD 0,03/corrida). Sin esto, esta task asume conocido al competidor, que es su supuesto más
  frágil
- **`TASK-1700`** — la cola priorizada. Es quien ordena; esta task le entrega filas
  con `origin='competitor_gap'` y `evidence_ref` opaca (nunca FK, nunca JOIN)
- `TASK-1300` (complete) — familia `labs` en el allowlist
- `TASK-1301` (complete) — entitlement y quota per-org

### Blocks / Impacts

- Superficie de gap (task futura, después de esta)
- `TASK-1314` — pillar-cluster health: el gap alimenta el plan de contenidos
- `TASK-1310` — reporte cliente: el gap es material comercial de primera reunión

### Files owned

- `migrations/[nueva]-task-1662-seo-competitors-authorship.sql` (**`ALTER TABLE`**, la tabla ya existe — ver §Gap)
- `src/lib/growth/seo/competitors.ts`
- `src/lib/growth/seo/keyword-gap-reader.ts`

## Current Repo State

### Already exists

- Cliente DataForSEO con familia `labs` y circuit breaker — `TASK-1300`
- `enforceSeoRunEntitlement` como chokepoint de gasto — `TASK-1301`
- `seo_targets` como el sitio del cliente

### Gap

- 🔴 **CORREGIDO 2026-08-26 — la tabla SÍ existe.** `greenhouse_growth.seo_competitors` fue creada
  por `migrations/20260805134439202_task-1299-growth-seo-schema.sql:59-76`, con índice único parcial
  de vigencia y trigger anti-DELETE. Lo que **no** existe es su command, su reader ni sus columnas de
  autoría. **Su migración debe ser `ALTER`, nunca `CREATE`**: un `CREATE TABLE IF NOT EXISTS` haría
  **no-op en silencio**, esta task cerraría en verde y `declared_by` nunca existiría. Y ojo con el
  dueño: `TASK-1699` (P0) ya reclama darle su primer consumer, así que el orden importa
- No hay cobertura de keywords de terceros
- No hay cruce ni priorización

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/`; el fetch corre en `ops-worker`
- Future candidate home: `domain-package`
- Boundary: `readKeywordGap` es el único consumo; el cliente canónico el único transporte
- Server/browser split: `n/a` — server-side
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` — el gasto no tiene techo natural
- Impacto principal: `integration`
- Source of truth afectado: DataForSEO Labs (externo) + declaración humana de competidores
- Consumidores afectados: `UI` (futura), `MCP`, reporte
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: ninguno se modifica
- Contrato nuevo o modificado: `seo_competitors` + `readKeywordGap` + sus tools MCP
- Backward compatibility: `compatible` — todo aditivo
- Full API parity: declarar competidor es un **command** desde el día uno, con sus 3 lanes.
  ⚠️ Es **escritura**: va sobre `efeonce.mcp.seo.write`, el scope de dominio que **ya existe** —
  y por eso **no toca Entra**. Es exactamente el corolario de un scope por clase de blast-radius

### Data model and invariants

- Entidades/tablas/views afectadas: `seo_competitors` (nueva) + tabla de cobertura
- Invariantes que no se pueden romper:
  - Un competidor es **declarado**, con autor y fecha. Nunca inferido en silencio
  - El gap es **derivado**, no persistido como verdad: se recalcula desde cobertura + set del
    cliente. Persistirlo lo congela y envejece sin avisar
  - "El competidor rankea y el cliente no" ≠ "el cliente rankea peor". Son dos hechos y el contrato
    los separa; colapsarlos produce un gap inflado que nadie puede accionar
  - 🔴 **Keyword con impresiones en el GSC del cliente ⇒ no es gap.** La lente medida (●) gana sobre
    la estimada (◑), y gana también en el **ordenamiento**, no sólo en cómo se pinta. El reader la
    excluye y declara por qué
  - 🔴 **El reader no devuelve orden propio.** Devuelve hechos + factores (volumen ◑, `cpc_usd`,
    barrera de enlaces, SERP features, posición alcanzable estimada) con su procedencia y fecha. El
    peso de cada factor vive en la config versionada de la cola, no acá
  - Techo explícito de competidores por sitio: cada uno multiplica el gasto
- Tenant/space boundary: competidores por `seo_target_id` → `organization_id`
- Idempotency/concurrency: declarar dos veces el mismo competidor es no-op idempotente
- Audit/outbox/history: evento al declarar o retirar un competidor

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: **flag OFF**. Nace apagado: prenderlo empieza a gastar
- Backfill plan: ninguno. Los competidores se declaran hacia adelante
- Rollback path: flag OFF + revert PR
- External coordination: **ninguna en Entra**. Sí en `ops-worker`: el flag va en `deploy.sh` **y**
  en vivo

### Security and access

- Auth/access gate: `growth.seo.target.configure` para declarar competidores; lectura con la
  capability de observación
- Sensitive data posture: dominios públicos; sin PII. ⚠️ El **listado de competidores de un
  cliente es información comercial sensible**: nunca cruza el boundary de org
- Error contract: degradación honesta; un competidor sin datos se dice, no se omite
- Abuse/rate-limit posture: techo de competidores + circuit breaker + quota per-org

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`
- DB/runtime checks: sanity contra PG real — declarar, retirar, recalcular gap
- Integration checks: una corrida acotada a **un** competidor con costo verificado en el ledger
- Reliability signals/logs: frescura de cobertura + gasto por corrida de gap
- Production verification sequence: ver Zone 3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo de competidores

- Tabla `seo_competitors` con autoría, fecha y techo por sitio
- Commands `declareCompetitor` / `retireCompetitor`, append-only, con evento
- **Los candidatos a competidor se proponen** desde `TASK-1699` (top-N ya pagado); la fila sólo
  existe cuando un humano la declara, y guarda si vino de propuesta o de escritura directa
- Los 3 lanes (app, ecosystem, MCP) en el mismo PR, sobre el scope de escritura ya existente

### Slice 2 — Cobertura de keywords del competidor

- Fetch acotado tras flag OFF, con `enforceSeoRunEntitlement` y dry-run de costo
- Persistencia con fecha de captura, append-only
- **Un competidor a la vez** en V1: el costo se mide antes de escalar

### Slice 3 — Reader de gap (hechos + factores, sin ranking propio)

- `readKeywordGap`: keywords del competidor donde el cliente no aparece, separadas de "el cliente
  aparece peor" y **excluyendo las que ya tienen impresiones en el GSC del cliente** (ahí manda la
  lente medida)
- Cada fila trae los **factores de valor recuperable** con su procedencia y fecha: volumen ◑,
  `cpc_usd` como proxy de valor comercial, **barrera de enlaces** (`deriveLinkBarrier()`), factor
  AIO derivado de las SERP features capturadas y posición alcanzable estimada. **El reader no los
  combina en un score ni ordena**: eso es de la cola
- **SERP features expuestas** (PAA, video, local pack, shopping, AI Overview), no colapsadas a un
  booleano: sin el formato ganador, la salida dice la keyword y no dice el trabajo. Si para una
  keyword no las tenemos, se declara `sin_dato`, jamás se asume "ninguna"
- Tool MCP de lectura en el mismo PR
- Señal de frescura de cobertura

### Slice 4 — Emisión a la cola priorizada

- Los hallazgos se emiten a `TASK-1700` como filas con `origin='competitor_gap'` y `evidence_ref`
  **opaca**: nunca FK, nunca JOIN. Unir orígenes por SQL es la violación más cara posible acá
- Un fallo de cobertura del gap se declara en `origin_health_json` de la cola y **no baja el score
  de los demás orígenes**

## Out of Scope

- **La superficie visible.** Va en task aparte, con su wireframe y su flow, cuando exista qué
  mostrar. Diseñarla antes de ver la forma real de los datos es adivinar
- **Declarar competidores automáticamente.** La *propuesta* de candidatos sí entra (`TASK-1699`,
  desde el top-N ya pagado), pero **la declaración sigue siendo humana**: un competidor mal elegido
  invalida todo el análisis río abajo y esa decisión no se automatiza
- 🔴 **Ordenar.** Esta task no acuña score de prioridad, ni "top N", ni ranking propio. Emite a la
  cola (`TASK-1700`) y la cola ordena. Si el orden está mal, se corrige subiendo el
  `priority_score_version` de la cola, nunca metiendo un orden paralelo acá
- Análisis de contenido de las páginas del competidor
- Backlinks del competidor

## Detailed Spec

**Por qué el gap se deriva y no se persiste.** El gap es una diferencia entre dos conjuntos que
cambian todos los días: lo que el competidor rankea y lo que el cliente rankea. Persistirlo lo
congela en el momento del cálculo y lo hace envejecer sin ninguna señal — dos semanas después
alguien lee "40 oportunidades" y ya no son 40. Se persisten los **insumos** con su fecha; el gap se
calcula al leer.

**Por qué un competidor a la vez en V1.** El universo de keywords de un competidor mediano son
miles. Con tres competidores el costo se triplica antes de que nadie haya visto si el resultado
sirve. Uno primero da el número real y la forma de los datos.

**La distinción que hace la lista accionable.** "El competidor rankea y yo no existo" es una
oportunidad de contenido nuevo. "El competidor rankea mejor que yo" es una oportunidad de
optimización — y ésa ya la cubre la pantalla de oportunidades. Mezclarlas produce una lista enorme
donde lo verdaderamente nuevo se pierde entre lo que ya sabíamos.

**Por qué el volumen no ordena.** Es la corrección más cara de este documento, y viene del
Delta 2026-08-15. Cuatro defectos que se acumulan: el volumen es **◑ estimado**, con agrupación
*broad* y redondeo a buckets del proveedor (no es un conteo, es una banda); **no descuenta la
depresión de clic de los AI Overviews**, así que una keyword con AIO puede tener volumen alto y
clic casi nulo; **ignora la barrera de enlaces**, que este dominio ya deriva del perfil real del
top-10 con `deriveLinkBarrier()` —y que es lo único que dice si el gap es alcanzable—; e **ignora la
recuperabilidad**, con lo cual pone arriba exactamente lo que no se puede ganar. Un plan ordenado
por volumen es un plan que empieza por lo más caro y termina sin resultados.

El ordenador correcto es **valor recuperable**:

```
valor_recuperable = volumen(◑)
                  × CTR esperado en la posición alcanzable      (curva PROPIA, de nuestro GSC)
                  × factor AIO                                   (de las SERP features capturadas)
                  × señal de valor comercial                     (cpc_usd como proxy)
                  filtrado por deriveLinkBarrier()
```

La curva de CTR es **propia**, derivada de impresiones/clics reales del cliente en GSC: usar una
curva publicada de un blog sería sustituir una medición que ya tenemos por un promedio ajeno. Esta
task **computa y persiste los factores con su procedencia**; **los pesos y la combinación viven en
la config versionada de la cola** (`TASK-1700`), porque cambiar un peso tiene que dejar rastro en un
`priority_score_version` y esta task no tiene dónde registrarlo.

**Por qué el gap se calla cuando hay impresiones.** El módulo sostiene la separación ● medido / ◑
estimado de punta a punta, y hasta ahora la sostenía al **pintar**. Ordenar es también afirmar: si
una keyword ya tiene impresiones en el Search Console del cliente, existe una posición **medida** y
la conversación correcta es "estoy en la 14, ¿cómo llego a la 5?", no "no aparezco". Dejar que el
gap la proponga produce dos pantallas hablando de la misma keyword con dos números distintos y dos
grados de certeza distintos, y el cliente cree el más optimista.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (competidores) → Slice 2 (cobertura) → Slice 3 (gap) → Slice 4 (emisión a la cola).
- El Slice 4 requiere `TASK-1700` mergeada. Si la cola no está, el gap **se queda sin superficie**:
  no se compensa inventando un orden acá.
- 🔴 El dry-run del Slice 2 corre **antes** de cualquier corrida con gasto, y la primera es sobre
  **un** competidor de **una** org.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El universo de keywords de un competidor dispara el gasto | gasto externo | **high** | flag OFF + entitlement + dry-run + un competidor a la vez + techo por sitio | `seo_provider_spend_daily` fuera de patrón |
| Gap persistido envejece y se reporta como vigente | data quality | **high** | el gap se deriva al leer; se persisten insumos con fecha | conteos que no cambian entre semanas |
| Competidores de un cliente visibles a otra org | seguridad | low | boundary por `organization_id` + test de aislamiento | dominio ajeno en un reader |
| El flag se prende en Vercel y el fetch nunca corre | worker | **high** | el fetch vive en `ops-worker`; flag en `deploy.sh` **y** en vivo | sin gasto en el ledger y sin cobertura |
| Lista cruda sin priorizar se entrega como producto | producto | medium | la cola (`TASK-1700`) es la autoridad de orden y el Slice 4 la requiere; esta task entrega factores con procedencia, no filas sueltas | miles de filas sin orden útil |
| **Se ordena por volumen y el plan empieza por lo inalcanzable** | producto/oficio | **high** | ordenador = valor recuperable filtrado por `deriveLinkBarrier()`; test que falla si el reader devuelve orden propio | gaps `barrera=alta` en los primeros lugares |
| **El gap propone una keyword que el cliente ya rankea** | data quality / confianza | **high** | exclusión dura por impresiones GSC en el reader, con test; ● gana sobre ◑ también al ordenar | la misma keyword en gap y en oportunidades con dos números |
| Salida sin SERP features: dice la keyword, no dice el trabajo | producto | medium | el reader expone PAA/video/local/shopping/AIO; `sin_dato` explícito cuando falta | briefs que piden "un artículo" para una SERP de video |

### Feature flags / cutover

Flag propio, default **OFF**, declarado en `services/ops-worker/deploy.sh` y aplicado en vivo, con
fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR. Encendido por org, empezando
por una.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; los competidores declarados quedan (append-only, sin daño) | < 10 min | sí |
| Slice 2 | flag OFF → deja de gastar de inmediato | < 5 min | sí |
| Slice 3 | revert PR; el gap deja de calcularse, los insumos quedan | < 10 min | sí |
| Slice 4 | dejar de emitir a la cola; las filas `origin='competitor_gap'` ya escritas quedan (append-only) y la cola declara el origen caído en `origin_health_json` | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` + verificar tablas.
2. Declarar un competidor real por los 3 lanes; verificar el evento.
3. Dry-run: conteo de keywords y **costo estimado**.
4. Primera corrida sobre **un** competidor de **una** org; verificar `provider_cost` en el ledger.
5. Leer el gap y verificar la separación entre "no existo" y "rankeo peor".
6. Medir el costo por competidor antes de habilitar más.

### Out-of-band coordination required

Ninguna en Entra: la escritura usa el scope de dominio ya existente. Sí en `ops-worker` para el flag.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un competidor es un hecho declarado con autor y fecha; no se infiere. La **propuesta** puede
      venir de `TASK-1699`, y la fila registra si vino de propuesta o de escritura directa
- [ ] Existe techo de competidores por sitio
- [ ] El gap se **deriva al leer**; no se persiste como verdad
- [ ] El reader separa "el cliente no aparece" de "el cliente aparece peor"
- [ ] 🔴 **El reader NO devuelve orden propio.** Devuelve hechos + factores con procedencia y fecha;
      un test falla si el resultado viene ordenado por un score acuñado en esta task
- [ ] 🔴 Una keyword con impresiones en el GSC del cliente **no aparece como gap**, con test:
      la lente medida (●) gana sobre la estimada (◑) también al ordenar
- [ ] Cada fila trae volumen ◑, `cpc_usd`, **barrera de enlaces** (`deriveLinkBarrier()`), factor AIO
      y posición alcanzable estimada; un factor ausente se declara `sin_dato`, nunca 0 ni "baja"
- [ ] Las **SERP features** viajan en el contrato (PAA, video, local pack, shopping, AIO), no
      colapsadas a un booleano
- [ ] Los hallazgos se emiten a la cola como `origin='competitor_gap'` con `evidence_ref` **opaca**;
      cero FK y cero JOIN entre el gap y las tablas de la cola
- [ ] Ninguna llamada al proveedor ocurre sin `enforceSeoRunEntitlement`
- [ ] El dry-run reporta conteo y costo antes de gastar
- [ ] El flag nace OFF, está en `ops-worker/deploy.sh` y tiene fila en el ledger
- [ ] Los competidores de una org **nunca** son visibles desde otra, con test de aislamiento
- [ ] Commands y reader tienen sus 3 lanes en el mismo PR, sin scope nuevo en Entra

## Verification

- `pnpm vitest run src/lib/growth/seo`
- `pnpm tsx scripts/growth/_sanity-task-1662-keyword-gap.ts` contra PG real
- `pnpm flags:audit --strict --no-vercel`
- `pnpm lint` · `pnpm typecheck` · `pnpm build`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Superficie de keyword gap, con wireframe y flow propios.
- Varios competidores por sitio, con el costo por competidor ya medido.
- Alimentar el plan de contenidos de `TASK-1314` con el gap priorizado **por la cola**.
- Curva de CTR propia por posición: se deriva de impresiones/clics reales del GSC del cliente y la
  consumen tanto el gap como la superficie de oportunidades. Si `TASK-1700` no la trae, crear task
  aparte — pero **nunca** sustituirla por una curva publicada de un blog.
