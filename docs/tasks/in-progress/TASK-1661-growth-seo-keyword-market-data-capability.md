# TASK-1661 — Growth SEO: capability de datos de mercado por keyword (volumen + dificultad)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
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

## Summary

Traer volumen de búsqueda y dificultad por keyword desde DataForSEO Labs, persistirlos y exponerlos
por reader. ⚠️ **No es "esperar a TASK-1300"**: esa task ya está `complete` y dejó la familia `labs`
llamable. Lo que falta es la capability encima — el fetch, las columnas donde guardarlo y el reader.
La cañería existe; el agua no.

## Why This Task Exists

`readKeywordOpportunities` devuelve hoy `searchVolume: null`, `difficulty: null` y
`market: 'unavailable'`. Durante meses eso se leyó como "falta la integración", y es falso:
`TASK-1300` entregó el registry de familias del cliente DataForSEO —`labs` está en el allowlist y
`rank-history-seed.ts` ya la usa para SERPs históricas— pero su propio resumen lo dice:
*"Es infra de cliente, no capability."* Verificado el 2026-08-07: **no existe ninguna columna**
`search_volume` ni `keyword_difficulty` en las migraciones del módulo SEO.

Esto se vuelve bloqueante ahora por una razón concreta. Para una keyword donde el cliente **sí**
rankea, Search Console alcanza y es mejor insumo que un promedio de mercado. Pero para una keyword
donde **no** rankea —el caso de `TASK-1660`, los objetivos declarados— Search Console da
literalmente nada: cero impresiones, sin posición. El volumen y la dificultad son la **única** forma
de contestar las dos preguntas que el cliente hace el primer día: *¿vale la pena?* y *¿cuánto
cuesta?*

Sin esto, se aceptan objetivos a ciegas.

## Goal

- Volumen y dificultad disponibles por keyword, persistidos con su fecha de captura.
- Alcance **acotado y explícito**, porque cada consulta cuesta dinero.
- El contrato existente no se rompe: la UI los recibe sin rediseñarse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **Todo llamado provider-facing pasa por `enforceSeoRunEntitlement`** (`src/lib/growth/seo/entitlement.ts`)
  — es el chokepoint único de gasto del módulo, no se rodea.
- El ledger de gasto lo escribe el **transporte**, no el command: pasar `organizationId` al cliente
  para que el `provider_cost` quede atribuido.
- Sin cliente ni SDK paralelo: se usa `postDataForSeoTask({ family: 'labs', ... })` del cliente
  canónico.
- Un dato de mercado sin fecha de captura **no sirve**: el volumen cambia y un número sin `as-of`
  se lee como vigente para siempre.

## Normative Docs

- `docs/tasks/complete/TASK-1300-growth-seo-dataforseo-family-registry.md` — qué entregó de verdad
- `.claude/rules/growth-seo.md`

## Dependencies & Impact

### Depends on

- `TASK-1300` (**complete**) — registry de familias con `labs` en el allowlist
- `TASK-1301` (**complete**) — entitlement per-org y quota
- `greenhouse_growth.seo_keyword_set_members`

### Blocks / Impacts

- `TASK-1662` — keyword gap: sin volumen no hay forma de priorizar lo que se descubre
- `TASK-1660` — la superficie de objetivos renderiza las columnas cuando esto exista
- `TASK-1308` (complete) — la tabla ya las contempla; el contrato es `number | null` y no cambia
- `TASK-1664` — **bloqueada por esta task** (confirmado 2026-08-13 en su Discovery, skills
  `arch-architect` + `seo-aeo`). Delta de alcance que esta task debe absorber al diseñar su Slice 1:
  **la tabla de mercado nace con más de un productor**. 1664 escribe en ella las métricas que ya
  vienen inline y pagadas en las respuestas de discovery (`keyword_suggestions`, `related_keywords`,
  `keyword_ideas`), y `TASK-1662` hará lo mismo desde `domain_intersection`. Consecuencias duras para
  el schema: (a) la clave es `(normalized_keyword, location_code, language_code, captured_at)` y
  **NO** lleva FK a `seo_keyword_set_members` ni a `seo_targets` — una keyword candidata todavía no
  es de nadie; (b) conviene una columna de procedencia del productor (`source_endpoint`) para
  auditar de dónde salió cada captura; (c) el reader debe exponer frescura para que un consumidor
  decida si hace top-up con `keyword_overview` o si el ciclo mensual vigente alcanza. Alcance V1 de
  fetch (sólo set monitoreado) **no cambia**: lo que cambia es que la tabla no puede asumir que toda
  keyword suya está trackeada.

### Files owned

- `migrations/[nueva]-task-1661-keyword-market-data.sql`
- `src/lib/growth/seo/keyword-market-data.ts`
- `src/lib/growth/seo/contracts.ts`
- `src/lib/growth/seo/keyword-opportunities-reader.ts`

## Current Repo State

### Already exists

- `postDataForSeoTask({ family, endpoint, tasks })` con allowlist de 5 familias, circuit breaker por
  familia y cost-tracking — `TASK-1300`
- `enforceSeoRunEntitlement(orgId, { estimatedCostUsd })` como chokepoint de gasto
- El contrato ya expone `searchVolume: number | null`, `difficulty: number | null` y
  `market: 'available' | 'unavailable'` — **la superficie no hay que tocarla**
- Un consumer real de `labs`: `src/lib/growth/seo/rank-history-seed.ts`

### Gap

- Ninguna columna de `search_volume` / `keyword_difficulty` / `competition` en el schema SEO
- Ningún fetch de datos de mercado por keyword
- `market` está cableado a `'unavailable'`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/` — el fetch corre en `ops-worker`, no en Vercel
- Future candidate home: `domain-package`
- Boundary: el cliente DataForSEO canónico es el único transporte; el reader es el único consumo
- Server/browser split: fetch, credencial y persistencia son server-only; el secreto del proveedor se resuelve server-side por `*_SECRET_REF` y jamás cruza al bundle del browser. El cliente sólo recibe el VM del reader, ya resuelto
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` — compromete gasto de un proveedor externo
- Impacto principal: `integration`
- Source of truth afectado: DataForSEO Labs (externo) → tabla propia con `as-of`
- Consumidores afectados: `UI`, `MCP`, readers de reporte
- Runtime target: `worker` (el fetch) + `production` (el reader)

### Contract surface

- Contrato existente a respetar: `KeywordOpportunity.searchVolume|difficulty|market` — **no cambia
  de forma**; sólo deja de ser siempre `null`
- Contrato nuevo o modificado: tabla de datos de mercado + `readKeywordMarketData` + su tool MCP
- Backward compatibility: `compatible`
- Full API parity: reader canónico consumido por UI y MCP; nadie consulta la tabla directo

### Data model and invariants

- Entidades/tablas/views afectadas: tabla nueva de datos de mercado por keyword
- Invariantes que no se pueden romper:
  - **Todo valor lleva su fecha de captura.** Un volumen sin `as-of` es un número que envejece en
    silencio y se sigue leyendo como vigente
  - **`NULL` ≠ `0`.** "No lo hemos consultado" y "nadie busca eso" son hechos distintos y el
    contrato ya los separa con `market`
  - El país y el idioma son parte de la clave: el volumen de una keyword **no es global**
  - Refetch **no** sobrescribe: se agrega una captura nueva. El histórico de volumen es señal
    (una keyword que triplicó su volumen es una noticia)
- Tenant/space boundary: la captura se atribuye a la org que la pagó
- Idempotency/concurrency: la unidad de trabajo es idempotente por keyword+país+idioma+fecha
- Audit/outbox/history: el `provider_cost` queda en el ledger de gasto por el transporte

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: **flag OFF**. 🔴 Prender esto empieza a gastar; nace apagado y se enciende por org
- Backfill plan: dry-run que reporta cuántas keywords consultaría y el costo estimado **antes** de
  gastar un peso. Aplicar primero al alcance más chico
- Rollback path: flag OFF (deja de gastar de inmediato) + revert PR; los datos ya capturados quedan
- External coordination: **ninguna en Entra** — la escritura SEO ya tiene su scope y esto no agrega
  clase de blast-radius. ⚠️ Sí requiere que el flag se declare en el **`ops-worker`**, no en Vercel:
  el fetch es async y `services/<worker>/deploy.sh` es el SoT (los `--set-env-vars` son destructivos)

### Security and access

- Auth/access gate: `enforceSeoRunEntitlement` per-org + capability para disparar un refetch manual
- Sensitive data posture: sin PII
- Error contract: degradación honesta — si el proveedor falla, `market: 'unavailable'`, nunca un
  número inventado ni un `0`
- Abuse/rate-limit posture: circuit breaker por familia (ya existe) + techo de gasto por org

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`
- DB/runtime checks: sanity contra PG real — captura, refetch e histórico
- Integration checks: una llamada real acotada a Labs, verificando que el `provider_cost` quedó en
  el ledger atribuido a la org
- Reliability signals/logs: señal de frescura del dato de mercado
- Production verification sequence: ver Zone 3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

- Tabla de datos de mercado por keyword, con país, idioma y fecha de captura en la clave
- Append-only: un refetch agrega captura, no sobrescribe
- Bloque `DO` anti pre-up-marker + GRANTs + `pnpm db:generate-types`

### Slice 2 — Fetch acotado

- Adaptador sobre `postDataForSeoTask({ family: 'labs' })`, detrás de flag **OFF**
- **Alcance V1: sólo las keywords del set monitoreado** — acotado, predecible y ya pagado por el
  ciclo diario. El caso caro (todas las oportunidades detectadas) queda para después
- `enforceSeoRunEntitlement` antes de cada corrida, con costo estimado
- Dry-run que reporta keywords y costo estimado sin gastar

### Slice 3 — Reader y exposición

- `readKeywordMarketData` + integración en `readKeywordOpportunities`
- `market` deja de estar cableado: pasa a `'available'` cuando hay dato fresco
- Tool MCP de lectura en el mismo PR. ⚠️ Es lectura: `efeonce.mcp.read`, **no toca Entra**
- Señal de frescura

## Out of Scope

- Cualquier cambio de UI. La tabla de `TASK-1308` ya contempla las columnas y las renderiza sola
  cuando `market` pase a `'available'`
- Intención de búsqueda (comercial/informativa). Es otra dimensión y hoy sería una inferencia
  disfrazada de dato
- Keyword gap — es `TASK-1662`
- Traer datos de mercado para **todas** las oportunidades detectadas. Es el caso caro y su alcance
  se decide con datos de costo real de V1, no antes

## Detailed Spec

**Por qué el alcance V1 es el set monitoreado y no las oportunidades.** El set está acotado por el
techo de 200 y ya compromete gasto conocido; agregarle datos de mercado tiene costo predecible. Las
oportunidades detectadas son una lista abierta que crece con el sitio: consultarlas todas es un
gasto que escala sin techo. Empezar por lo acotado da el número real de costo por keyword, que es
justo lo que falta para decidir el alcance grande con evidencia.

**Por qué append-only.** El volumen de búsqueda cambia con la estacionalidad y las modas. Un
histórico de volumen convierte un dato estático en una señal: *"esta keyword triplicó su volumen en
6 meses"* es material comercial, y sobrescribir lo destruye.

**El país es parte de la clave, no un filtro.** El volumen de una keyword en Chile no es el de
México. Guardarlo sin país produce un número que parece correcto y no lo es para nadie.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema) → Slice 2 (fetch) → Slice 3 (reader).
- 🔴 El **dry-run del Slice 2 corre antes que cualquier apply**. Esta task gasta dinero real: la
  primera corrida con gasto se hace después de ver el costo estimado, nunca antes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una corrida sin techo agota el presupuesto del proveedor | gasto externo | **high** | flag OFF por defecto + `enforceSeoRunEntitlement` + dry-run obligatorio + alcance acotado al set | `seo_provider_spend_daily` sube fuera de patrón |
| El flag se prende en Vercel y el fetch nunca corre | cron / worker | **high** | el fetch vive en `ops-worker`; declarar el flag en `deploy.sh` **y** aplicarlo en vivo | el ledger no registra gasto y nadie se entera |
| Un refetch sobrescribe y se pierde el histórico | data quality | medium | append-only + test de que dos capturas dejan dos filas | una sola fila por keyword |
| El proveedor falla y se persiste `0` como volumen | data quality | medium | degradación honesta: `unavailable`, nunca `0` | volúmenes en `0` en masa |
| Volumen guardado sin país se lee como global | data quality | medium | país e idioma en la clave | mismo volumen para orgs de países distintos |

### Feature flags / cutover

Flag propio, default **OFF**, declarado en el **`ops-worker`** (`services/ops-worker/deploy.sh`),
no en Vercel — el fetch es async. Registrar la fila en
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR; `pnpm docs:closure-check` falla si
falta. Encendido gradual por org.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `DROP TABLE` — aditiva, nadie la exige aún | < 10 min | sí |
| Slice 2 | flag OFF → deja de gastar de inmediato | < 5 min | sí |
| Slice 3 | revert PR; `market` vuelve a `'unavailable'` y la UI oculta las columnas sola | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` + verificar tabla e índices.
2. Dry-run en staging: confirmar conteo de keywords y **costo estimado**.
3. Primera corrida real acotada a **una** org, con el flag encendido sólo ahí.
4. Verificar en el ledger que el `provider_cost` quedó atribuido a esa org.
5. Verificar que `market` pasó a `'available'` y que la tabla de Keywords muestra las columnas sin
   cambio de código.
6. Extender a más orgs con el costo por keyword ya medido.

### Out-of-band coordination required

Ninguna en Entra. **Sí** en el `ops-worker`: el flag se declara en `deploy.sh` **y** se aplica en
vivo con `--update-env-vars`; hacer sólo lo segundo lo borra en el próximo deploy, en silencio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe tabla con volumen, dificultad, país, idioma y **fecha de captura**
- [ ] Un refetch agrega una captura; no sobrescribe (verificado contra PG real)
- [ ] Ninguna corrida con gasto ocurre sin `enforceSeoRunEntitlement` previo
- [ ] El dry-run reporta conteo y costo estimado sin gastar
- [ ] El flag nace OFF, está declarado en `ops-worker/deploy.sh` y tiene fila en el ledger
- [ ] Si el proveedor falla, `market` queda `'unavailable'`; **nunca** se persiste `0`
- [ ] `readKeywordOpportunities` entrega los valores y la tabla de Keywords los muestra **sin
      cambio de código en la UI**
- [ ] El `provider_cost` queda atribuido a la org que lo pagó
- [ ] Tool MCP de lectura en el mismo PR, sin scope nuevo en Entra

## Verification

- `pnpm vitest run src/lib/growth/seo`
- `pnpm tsx scripts/growth/_sanity-task-1661-market-data.ts` contra PG real
- `pnpm flags:audit --strict --no-vercel`
- `pnpm lint` · `pnpm typecheck` · `pnpm build`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Extender el alcance a las oportunidades detectadas, con el costo por keyword ya medido.
- Intención de búsqueda como dimensión propia, si aparece una fuente que la mida en vez de inferirla.

## Delta 2026-08-08 — discovery es un segundo consumidor acotado

`TASK-1664` extiende el uso del primitive de mercado más allá del set monitoreado, pero no cambia la
decisión de alcance de esta task ni autoriza un backfill abierto. La implementación de `1661` debe
aceptar un **conjunto explícito y bounded de candidatos** entregado por el discovery runner, además
del set monitoreado ya previsto, sin duplicar columnas, snapshots, transporte ni registro de gasto.

Contrato de integración obligatorio:

- `readKeywordMarketData` recibe una selección identificable por `organization_id`, mercado, idioma y
  candidate IDs; no recibe una consulta libre que permita traer todas las keywords de una org.
- Las métricas conservan el mismo grano append-only, `captured_at`, `provider_last_updated_at`,
  `search_volume`, `keyword_difficulty`, `intent` y estado honesto de disponibilidad.
- El runner de `1664` sigue siendo dueño de la lista, deduplicación, preview de costo, límites de
  candidatos y número máximo de llamadas. `1661` sólo ejecuta el enriquecimiento del conjunto que le
  fue entregado y devuelve resultados por elemento.
- El alcance inicial de `1661` continúa siendo el set monitoreado; la extensión a candidatos sólo se
  habilita mediante el contrato explícito de `1664`, con flag y gate de gasto propios de discovery.
- No se agregan columnas de `keyword_discovery_*` a las tablas de mercado ni se crea un segundo
  `postDataForSeoTask`; el reader existente debe poder proyectar ambos orígenes sin que la UI los
  distinga por tablas.

El criterio de aceptación de esta task queda ampliado: una prueba de contrato debe demostrar que un
lote bounded de candidates puede enriquecerse y quedar atribuido a la org correcta sin activar un
fetch por descubrimiento implícito o sin límite.
