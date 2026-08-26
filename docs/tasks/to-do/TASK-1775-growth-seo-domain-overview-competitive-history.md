# TASK-1775 — Growth SEO: foto de dominio + trayectoria competitiva (Labs)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

El módulo mide keywords y páginas, pero **no sabe describir un dominio completo**: no hay authority,
ni tráfico orgánico estimado, ni conteo de keywords ranqueadas, ni la trayectoria de esas tres cifras
en el tiempo — ni del cliente ni de sus competidores. Esta task abre esa capa con tres endpoints Labs
que ya están dentro del allowlist vigente (`domain_rank_overview`, `historical_rank_overview`,
`bulk_traffic_estimation`), persistidos como hecho de mercado compartido por la cartera con el mismo
patrón multi-productor de `seo_keyword_market_data`.

## Why This Task Exists

**La pregunta que abre y cierra toda reunión de SEO es de dominio, no de keyword.** "¿Cómo estamos
contra ellos?" y "¿venimos subiendo o bajando?" son las dos preguntas que un cliente hace primero, y
hoy el módulo no tiene con qué contestarlas: `readSeoOverviewKpis` compone lo que Greenhouse ya
capturó (rank del set seguido + GSC), así que sólo describe el recorte que alguien decidió seguir.
Un dominio con 4.000 keywords ranqueadas de las cuales seguimos 31 se ve, en nuestros KPIs, como un
dominio de 31 keywords. Y de un competidor no se ve nada, porque no tiene GSC ni set.

Ese hueco es el que hoy justifica pagar una suite externa. La foto de dominio (`overview_research` de
Semrush, "Domain Overview" de Ahrefs) es el reporte que el cliente reconoce, y su equivalente en
DataForSEO **ya es alcanzable con la familia `labs` que este repo llama todos los meses** — no exige
ampliar el allowlist, ni tocar el transporte, ni una credencial nueva.

La trayectoria importa tanto como la foto: `historical_rank_overview` devuelve la serie de rankings y
tráfico de **cualquier** dominio hacia atrás, lo que resuelve la limitación estructural del módulo —
nació forward-only (mide desde el día que lo enchufamos) y a un cliente nuevo no le podemos mostrar
su propio pasado. Ese endpoint cuesta 10× el resto de Labs, y por eso esta task lo trata como
**backfill de una sola vez por sujeto**, nunca como captura recurrente.

## Goal

- Hecho de dominio persistido y compartible por la cartera: `domain_rank_overview` mensual sobre el
  dominio del target y sus competidores declarados, en una tabla append-only cuya clave **no incluye
  la organización**, para que lo que pagó una org sirva a otra sin volver a gastar.
- Trayectoria histórica como corrida **única por sujeto** (`historical_rank_overview`), con tope duro
  en USD y pre-check de existencia que hace que repetirla cueste cero.
- Screening barato de cartera y de listas de competidores (`bulk_traffic_estimation`, hasta 1.000
  dominios por request) sin abrir un segundo almacén de tráfico estimado.
- Reader `readDomainOverview` expuesto por contrato gobernado en los tres lanes (app · Nexa ·
  ecosystem/MCP), con toda cifra marcada `◑ estimado` y con su `capturedAt`.
- Cero mezcla con la lente `●`: ninguna cifra de esta task se promedia, suma ni compara con GSC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§4.2 (el bloque de
  `seo_keyword_market_data`: es el precedente exacto que esta task replica — tabla multi-productor,
  `organization_id` fuera de la clave y viajando como atribución, `location_code` TEXT)**, §1.1
  (boundary duro SEO↔AEO), §3 (mapa de capacidades: qué fuente alimenta qué), §5 (contrato de
  honestidad ● vs ◑), §6 (governance DataForSEO), §7 (Full API Parity), §8 (materialización async,
  jamás live-per-view).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader como primitive canónico
  consumible por UI + Nexa + MCP.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — `pnpm migrate:create`, markers, expand
  antes del deploy.
- `CLAUDE.md §"Database — Migration markers"` — marker `-- Up Migration` + bloque DO anti
  pre-up-marker.
- `CLAUDE.md §"SQL embebido — type alignment + live testing"` y §`SQL Signal Reader Schema
  Validation Gate` — ejercitar toda query nueva contra PG real; `capture_date` es DATE, `*_at` es
  TIMESTAMPTZ.
- `CLAUDE.md §"Runtime Rollout Completion Gate"` + `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` —
  el flag nuevo entra al ledger en el MISMO PR.

Reglas obligatorias:

- **NUNCA** hacer `fetch` directo a `api.dataforseo.com` ni crear un cliente paralelo: todo pasa por
  `postDataForSeoTask` con `family: 'labs'`.
- **NUNCA** llamar el proveedor desde un route handler de Vercel: el hook de spend
  (`register-provider-spend`) está cableado sólo en el entrypoint del ops-worker, y una familia con
  org sin recorder registrado **lanza** en la primera llamada cobrada. La captura vive en el worker.
- **NUNCA** promediar, sumar ni graficar en la misma serie una cifra `◑` de esta task con una `●` de
  GSC. Son lentes complementarias.
- **NUNCA** exponer `captured_by_organization_id` en un DTO client-facing: por frescura se podría
  inferir qué dominios sigue otra organización.
- **NUNCA** correr `historical_rank_overview` en un cron recurrente. Es 10× el resto de Labs
  (USD 0,12/request + USD 0,0012/fila) y su dato es pasado inmutable: se compra una vez.

## Normative Docs

- `.claude/skills/dataforseo-operator/SKILL.md` — contrato Greenhouse del proveedor (regla cero).
- `.claude/skills/dataforseo-operator/references/02-labs.md` — §2 catálogo (paths exactos), §4
  filtros y `limit` como palanca de costo, §5 tabla de costos (el grupo caro de históricos), §7
  gotchas.
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md` — firmas del cliente,
  breaker, spend ledger, invariantes.
- `docs/manual-de-uso/growth/operar-captura-rankings-seo.md` — patrón operativo de un cron de captura
  SEO ya productivo (modelo a espejar para el runbook de esta task).

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_targets` + `greenhouse_growth.seo_competitors` (`migrations/20260805134439202_task-1299-growth-seo-schema.sql`) — los sujetos a medir.
- `src/lib/ai/dataforseo.ts` (`postDataForSeoTask`) y `src/lib/ai/dataforseo-families.ts` — familia `labs`, ya en el allowlist. **Esta task NO amplía el allowlist.**
- `src/lib/growth/seo/entitlement.ts` (`enforceSeoRunEntitlement`, `SEO_MODULE_KEYS_READ = ['seo_v2']`) — chokepoint único de quota/budget.
- `src/lib/growth/seo/provider-spend.ts` + `src/lib/growth/seo/register-provider-spend.ts` — ledger canónico de gasto.
- `services/ops-worker/server.ts` — entrypoint del runtime que puede gastar.
- `src/lib/growth/seo/keyword-market-data.ts` — **precedente de diseño**, no dependencia de código: de ahí sale la forma de la tabla y el pre-check por frescura.

### Blocks / Impacts

- `TASK-1662` (keyword gap) — comparte el eje "competidor" y consumirá `readDomainOverview` para dar contexto de tamaño al gap. No hay solape de archivos: 1662 escribe candidates de keyword, ésta escribe la foto del dominio.
- `TASK-1709` (carril de prospecto) — el colector de prospecto puede reusar `captureDomainOverview` para el sujeto sin org. Coordinar: si 1709 entra primero, esta task consume su resolver de sujeto en vez de duplicarlo.
- `TASK-1690` / `TASK-1660` (superficies cliente y de keywords) — ganan una fuente nueva para su capa de contexto, sin cambio de contrato en lo que ya leen.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 y §4.2 — deltas obligatorios al cerrar.

### Files owned

- `migrations/<timestamp>_task-1776-seo-domain-overview.sql`
- `src/lib/growth/seo/domain-overview/capture.ts`
- `src/lib/growth/seo/domain-overview/history-backfill.ts`
- `src/lib/growth/seo/domain-overview/traffic-estimation.ts`
- `src/lib/growth/seo/domain-overview/reader.ts`
- `src/lib/growth/seo/domain-overview/persist.ts`
- `src/lib/growth/seo/domain-overview/__tests__/*.test.ts`
- `src/lib/growth/seo/contracts.ts` (aditivo: tipos + event key)
- `src/lib/growth/seo/flags.ts` (aditivo: flag nuevo)
- `services/ops-worker/server.ts` (aditivo: endpoint `/seo/domain-overview/capture-batch`)
- `services/ops-worker/deploy.sh` (aditivo: scheduler + env var)
- `src/app/api/platform/ecosystem/growth/seo/domain-overview/route.ts`
- `src/app/api/platform/app/growth/seo/domain-overview/route.ts` `[confirmar el lane app durante Discovery: hoy sólo existe el árbol ecosystem]`
- `src/mcp/greenhouse/{tools.ts,server.ts,http-client.ts}` (aditivo: tool `get_seo_domain_overview`)
- `scripts/growth/backfill-domain-rank-history.ts`
- `docs/manual-de-uso/growth/operar-foto-de-dominio-seo.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag nuevo)

## Current Repo State

### Already exists

- Transporte canónico con allowlist de 5 familias, breaker por familia y registro de costo:
  `src/lib/ai/dataforseo.ts` + `src/lib/ai/dataforseo-families.ts` (`labs` con
  `requiresOrganization: true`).
- Chokepoint de entitlement/quota/budget con tiers `contracted|trial|pilot` y presupuestos por env
  var: `src/lib/growth/seo/entitlement.ts`.
- Ledger de gasto por `organization_id × family × spend_date`: `greenhouse_growth.seo_provider_spend_daily`.
- **Precedente completo de tabla de hecho de mercado multi-productor**:
  `greenhouse_growth.seo_keyword_market_data` (`migrations/20260813171143226_task-1661-keyword-market-data.sql`)
  con append-only, trigger anti UPDATE/DELETE, clave sin organización y `captured_by_organization_id`
  como atribución; writer compartido `persistKeywordMarketData` y reader `readKeywordMarketData`
  (`src/lib/growth/seo/keyword-market-data.ts`).
- Patrón de cron de captura SEO end-to-end: endpoint en `services/ops-worker/server.ts` +
  Cloud Scheduler declarado en `services/ops-worker/deploy.sh` (siete jobs `ops-seo-*` vivos).
- 16 tools SEO federadas por MCP (`src/mcp/greenhouse/server.ts`) — el patrón de exposición existe y
  se copia.

### Gap

- Ningún consumer llama `domain_rank_overview`, `historical_rank_overview` ni
  `bulk_traffic_estimation`: un `grep` de esos tres nombres sobre `src/` y `services/` no devuelve
  nada fuera de documentación.
- No existe tabla ni contrato que describa un **dominio** como sujeto. `seo_competitors` guarda quién
  es competidor pero ninguna métrica de ese competidor.
- `readSeoOverviewKpis` compone sólo el recorte seguido (rank del set + GSC): no puede responder
  "cuántas keywords ranquea en total" ni "cuánto tráfico orgánico estima el mercado".
- El módulo es forward-only y no tiene camino para mostrarle a un cliente nuevo su propio pasado.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/domain-overview/**` con captura ejecutada en `services/ops-worker` y lectura servida desde el portal Next.js
- Future candidate home: `domain-package`
- Boundary: primitives `captureDomainOverview` · `backfillDomainRankHistory` · `estimateDomainTraffic` · `readDomainOverview`; consumers autorizados son ops-worker (escritura), route handlers de `api/platform/**` y la tool MCP `get_seo_domain_overview` (lectura)
- Server/browser split: stores, secreto del proveedor y transporte quedan server-only; al browser sólo viaja el DTO del reader sin `captured_by_organization_id`
- Build impact: `none` — reusa el transporte y el cliente PostgreSQL existentes, sin dependencia nueva
- Extraction blocker: FK a `greenhouse_growth.seo_targets` y por su intermedio a la organización canónica; es el mismo acople deliberado que el resto de EPIC-022 declara en §17.2

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: tabla nueva `greenhouse_growth.seo_domain_overview_snapshots` (hecho de mercado append-only) + `greenhouse_growth.seo_provider_spend_daily` (gasto)
- Consumidores afectados: `ops-worker` (escritura), `api/platform/ecosystem` y `api/platform/app` (lectura), MCP, Nexa
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: `postDataForSeoTask` (`src/lib/ai/dataforseo.ts`), `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`), shape `{ ok }` de los readers de `src/lib/growth/seo/contracts.ts`, el sobre de respuesta de `api/platform/ecosystem/growth/seo/*`.
- Contrato nuevo o modificado: reader `readDomainOverview`; commands `captureDomainOverview` / `backfillDomainRankHistory` / `estimateDomainTraffic`; evento outbox `seo.domain_overview.snapshot_captured`; tool MCP `get_seo_domain_overview`.
- Backward compatibility: `compatible` — todo es aditivo; ningún contrato vigente cambia de shape.
- Full API parity: la capacidad nace como reader/command en `src/lib/growth/seo/**` y se expone en los tres lanes en la misma task; ningún consumer reimplementa la derivación.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_domain_overview_snapshots` (nueva), `greenhouse_growth.seo_targets` y `seo_competitors` (sólo lectura), `greenhouse_growth.seo_provider_spend_daily` (escritura por el transporte).
- Invariantes que no se pueden romper:
  - **Append-only con trigger anti UPDATE/DELETE**, igual que el resto de la serie del módulo.
  - **Clave única `(normalized_domain, location_code, language_code, capture_date)` — sin organización.** El tráfico orgánico estimado de un dominio en México es el mismo para toda la cartera. Dejar la org fuera es además la dirección **reversible**: la clave sin org es más estricta que la que la incluye, así que relajarla después es seguro; al revés habría que borrar filas de una tabla append-only.
  - `captured_by_organization_id` es **atribución de quién pagó**, nunca aislamiento de tenant, y **nunca** viaja en un DTO client-facing.
  - `location_code` es `TEXT` (espeja `seo_targets.location_code`, que en PG real es `text`); la conversión a número ocurre sólo en la frontera del proveedor.
  - Toda métrica de esta tabla es `◑ estimado`: el DTO la marca como tal y expone `capturedAt`. `etv` es *estimated traffic value*, jamás se rotula "visitas".
  - Un sujeto sin dato en el proveedor **se escribe con NULLs**, no se omite: sin esa fila el ítem nunca queda "fresco" y se re-compra para siempre (bug de costo detectado en el smoke real de TASK-1661).
- Write-target allowlist: el dominio `growth/seo` no tiene hoy boundary test con `ALLOWED_WRITE_TARGETS`; si Discovery encuentra uno vigente, declarar la tabla nueva ahí en el mismo PR. `[confirmar en Discovery]`
- Tenant/space boundary: la lectura se autoriza por `organization_id` de sesión/token + entitlement `seo_v2`; la escritura la ejecuta el ops-worker con actor de sistema y atribuye el gasto a la org que dispara la corrida.
- Idempotency/concurrency: pre-check **de frescura** (no de existencia) antes de pegar el proveedor — el ciclo de refresco es mensual, así que repetir la corrida dentro del mismo ciclo debe costar CERO. `INSERT ... ON CONFLICT DO NOTHING` sólo como guardia de carrera.
- Audit/outbox/history: evento outbox `seo.domain_overview.snapshot_captured` por corrida; el gasto queda en `seo_provider_spend_daily` por construcción (lo escribe el transporte).

### Migration, backfill and rollout

- Migration posture: `additive` — una tabla nueva, sus índices, su trigger y sus GRANT. Cero cambios a tablas existentes.
- Default state: `flag OFF` — `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` default `false`, y el Cloud Scheduler se crea **pausado**.
- Backfill plan: el histórico es una corrida explícita por sujeto vía `scripts/growth/backfill-domain-rank-history.ts`, con `--dry-run` que imprime el costo estimado y exige `--apply` para gastar; tope duro en USD por corrida y allowlist de dominios por argumento. Resumible: salta sujetos ya presentes.
- Rollback path: flag a `false` + pausar el scheduler (efecto inmediato, sin deploy). La tabla queda con sus filas: son mediciones válidas, no se borran.
- External coordination: crear el Cloud Scheduler job y declarar la env var en `services/ops-worker/deploy.sh` — recordar que ese script usa `--set-env-vars` destructivo, así que el flag debe quedar declarado ahí **y además** aplicarse en vivo con `--update-env-vars`.

### Security and access

- Auth/access gate: lectura por sesión/token de ecosystem + capability de lectura del módulo (`growth.seo.observation.read`, `[confirmar el nombre exacto en Discovery contra src/config/entitlements-catalog.ts]`); escritura sólo desde ops-worker con su auth de servicio.
- Sensitive data posture: sin PII. El único dato sensible por inferencia es `captured_by_organization_id`, que no sale del servidor.
- Error contract: errores canónicos vía `canonicalErrorResponse`; nada de prosa cruda del proveedor al cliente; `captureWithDomain` para el detalle técnico.
- Abuse/rate-limit posture: breaker por familia `labs` ya existente + tope de sujetos por corrida + tope duro en USD del backfill histórico.

### Runtime evidence

- Local checks: suite focal del paquete + `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: `pnpm pg:connect:migrate` y verificación por `information_schema` de tabla, índice único y trigger; live test del reader contra PG real (el helper `runGreenhousePostgresQuery` devuelve un **array pelado**, no `{ rows }` — un `.rows[0]` compila y revienta en runtime).
- Integration checks: smoke real contra DataForSEO con **un** sujeto, verificando (a) el `cost` devuelto contra el estimado, (b) que la fila quedó escrita, (c) que la re-corrida dentro del ciclo cuesta USD 0.
- Reliability signals/logs: signal nuevo `seo.domain_overview.stale_subjects` (sujetos activos sin snapshot dentro de dos ciclos; steady = 0).
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores están nombrados con paths reales.
- [ ] Invariantes de datos, boundary de tenant y postura de idempotencia están explícitos.
- [ ] La tabla nueva queda declarada en el allowlist de destinos de escritura del dominio si existe boundary test.
- [ ] Postura de migración/backfill/rollback explícita y proporcional al riesgo.
- [ ] Evidencia runtime/DB listada para todo cambio más allá de docs.
- [ ] Errores canónicos, postura de audit/signal y cero fuga de datos sensibles.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive (`src/lib/growth/seo/domain-overview/**`), no en la UI.
- [ ] Modelada como command/reader sobre el sujeto "dominio", no como handler de pantalla.
- [ ] Read expuesto como reader canónico; los writes son commands con entitlement, idempotencia por frescura, outbox y errores canónicos.
- [ ] Capability + grant a ≥1 rol real en el MISMO PR, con el coverage test verde.
- [ ] Camino programático declarado: `api/platform/ecosystem` + tool MCP en esta misma task.
- [ ] Los writes son aptos para `propose → confirm → execute`: el LLM propone la corrida, un humano confirma el gasto.
- [ ] Un primitive, muchos consumers: cero derivación duplicada en app/Nexa/MCP.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tabla del hecho de dominio + writer canónico

- Migración `additive`: `greenhouse_growth.seo_domain_overview_snapshots` con la clave única sin
  organización, trigger anti UPDATE/DELETE, índices de lectura y GRANT a `greenhouse_runtime`.
- Bloque DO anti pre-up-marker que aborta la migración si la tabla, el índice único o el trigger no
  quedaron creados.
- `persistDomainOverviewSnapshot` en `domain-overview/persist.ts`: writer único compartido por los
  tres colectores, con el contrato "sujeto sin dato se escribe con NULLs".
- Tipos en `contracts.ts` + regeneración de `src/types/db.d.ts`.

### Slice 2 — Colector mensual `domain_rank_overview`

- `captureDomainOverview({ organizationId, subjects, locationCode, languageCode })` sobre
  `/v3/dataforseo_labs/google/domain_rank_overview/live` vía `postDataForSeoTask` con `family: 'labs'`.
- Pre-check de frescura por sujeto **antes** de pegar el proveedor; sujetos frescos se saltan y el
  resultado los reporta como `fresh`, no como `captured`.
- Gate `enforceSeoRunEntitlement` con `estimatedCostUsd` del batch completo y re-consulta cada K
  sujetos.
- Endpoint `/seo/domain-overview/capture-batch` en `services/ops-worker/server.ts` + job
  `ops-seo-domain-overview` en `deploy.sh`, **creado pausado**, cadencia mensual.
- Flag `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` en `flags.ts`, subordinado a `GROWTH_SEO_ENABLED`, con su
  fila en el ledger de flags.

### Slice 3 — Backfill histórico de una sola vez

- `backfillDomainRankHistory` sobre `/v3/dataforseo_labs/google/historical_rank_overview/live`, con
  tope duro en USD por corrida y pre-check de existencia por `(sujeto, mes)`.
- Runner `scripts/growth/backfill-domain-rank-history.ts` con `--dry-run` por defecto que imprime el
  costo estimado, `--apply` explícito y allowlist de dominios por argumento.
- Resumible: una corrida interrumpida se reanuda saltando los meses ya presentes.

### Slice 4 — Screening de cartera

- `estimateDomainTraffic(domains[])` sobre `/v3/dataforseo_labs/google/bulk_traffic_estimation/live`,
  hasta 1.000 dominios por request, escribiendo en la MISMA tabla con las columnas que ese endpoint
  sí puebla y NULL en las que no.
- Pensado para responder "de esta lista de 40 competidores, ¿cuáles son grandes de verdad?" antes de
  gastar en el detalle de cada uno.

### Slice 5 — Reader + contrato gobernado + lanes

- `readDomainOverview({ organizationId, subject, range })` con degradación honesta: sujeto sin
  snapshot devuelve `no_market_data`, nunca ceros fantasma.
- Route handler ecosystem + lane app + tool MCP `get_seo_domain_overview` registrada en
  `tools.ts`/`server.ts`/`http-client.ts`.
- Capability + grant a ≥1 rol real en el mismo PR.

### Slice 6 — Evidencia real, señal y cierre documental

- Smoke live contra el proveedor con un sujeto real, adjuntando el `cost` devuelto y la prueba de que
  la re-corrida cuesta USD 0.
- Signal `seo.domain_overview.stale_subjects` + fila en el dashboard de reliability.
- Deltas en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 y §4.2, runbook
  `docs/manual-de-uso/growth/operar-foto-de-dominio-seo.md`, doc funcional, `Handoff.md`, `changelog.md`.

## Out of Scope

- **Cualquier superficie visible.** Esta task no dibuja pantalla; la cara la construye una task
  `ui-ux` posterior que la consuma.
- **Keyword gap y competidores por intersección** — es `TASK-1662` (`domain_intersection` /
  `competitors_domain`). Esta task mide el tamaño del dominio, no la brecha entre dos.
- **Keywords ranqueadas por URL/subdominio/subcarpeta** — es `TASK-1776`.
- **Perfil de enlaces detallado** — es `TASK-1777`.
- **El carril de prospecto sin organización** — es `TASK-1709`. Esta task opera sobre targets y
  competidores de organizaciones con entitlement.
- **Ampliar el allowlist de familias DataForSEO.** Los tres endpoints son `labs`, ya permitida.
- **Traffic Analytics de panel** (visitantes reales, fuentes, demografía por dominio, audience
  overlap). DataForSEO no tiene equivalente; `etv` es una estimación derivada de rankings y esta task
  lo rotula así. Si el negocio lo necesita, es compra externa y decisión aparte.

## Detailed Spec

### 1. Por qué la clave no lleva la organización

Es el mismo razonamiento que ya se aceptó y está implementado para `seo_keyword_market_data`: el
volumen de "pintura industrial" en Chile es el mismo para toda la cartera, y por eso esa tabla es
multi-productor con la org fuera de la clave. La foto de un dominio es idéntica en naturaleza: el
authority y el tráfico estimado de `competidor.cl` no dependen de qué cliente preguntó.

Consecuencias que hay que sostener explícitamente:

- **Un competidor puede ser cliente de otra org, o competidor compartido de dos clientes.** Con la
  clave sin org, la segunda captura del mes no gasta.
- **`captured_by_organization_id` no puede salir del servidor.** Por frescura se podría inferir qué
  dominios está mirando otra organización. El reader lo excluye del DTO y un test lo prueba.
- **La dirección elegida es la reversible.** Si mañana se decide que sí debe aislarse por org,
  agregar la columna a la clave es un `CREATE UNIQUE INDEX` que toda fila existente ya satisface. Al
  revés habría que borrar duplicados de una tabla append-only, que es justo lo que el trigger prohíbe.

### 2. Las tres fuentes, su cadencia y su costo

| Endpoint | Familia | Cadencia | Costo | Qué contesta |
|---|---|---|---|---|
| `dataforseo_labs/google/domain_rank_overview/live` | `labs` | mensual | USD 0,012/req + USD 0,00012/fila | La foto: orgánico + pago, ETV, conteo de keywords, distribución por posición |
| `dataforseo_labs/google/historical_rank_overview/live` | `labs` | **una vez por sujeto** | USD 0,12/req + USD 0,0012/fila | La trayectoria: ¿venía subiendo o cayendo antes de que llegáramos? |
| `dataforseo_labs/google/bulk_traffic_estimation/live` | `labs` | on-demand | USD 0,012/req + USD 0,00012/dominio | El screening: de 1.000 dominios, cuáles importan (~USD 0,13 el barrido completo) |

La asimetría de precio es la que dicta el diseño. El histórico cuesta **10×** el resto de Labs, así
que no puede vivir en un cron: entra por un runner con `--dry-run` por defecto y tope duro en USD.
El screening es tan barato por dominio que conviene usarlo **antes** de decidir sobre quién gastar el
detalle.

Las cifras de arriba salen de `references/02-labs.md` §5, que está verificado contra la doc oficial y
corre ~20% por encima de las cifras de 2026-06 que todavía cita §6 de la arquitectura. Antes de
cerrar, contrastar contra `/v3/appendix/user_data`, que devuelve las tarifas reales de la cuenta.

### 3. El pre-check es de frescura, no de existencia

Bug de costo real detectado en el smoke de TASK-1661 y que los mocks daban por bueno: si el pre-check
pregunta "¿existe fila?", una tabla que ya tiene el mes pasado bloquea la captura del mes actual, o
peor, si pregunta por `capture_date` de hoy, re-compra todos los días un dato que el proveedor refresca
una vez al mes.

El contrato correcto: **"¿existe fila dentro del ciclo de refresco vigente?"**. Si sí, saltar con
outcome `fresh` y coste cero. El ciclo se declara como constante junto al colector, no se infiere.

### 4. Fila con NULLs cuando el proveedor no tiene el sujeto

Segundo bug de costo del mismo smoke: si el proveedor responde OK pero no conoce el dominio y el
colector no escribe nada, ese sujeto **nunca queda fresco** y se re-compra en cada corrida, para
siempre. La fila se escribe igual con métricas `NULL`: dice la verdad —se preguntó y no había dato— y
además satisface el pre-check de frescura.

### 5. Contrato de honestidad en el DTO

Cada métrica viaja con su lente y su `as-of`:

```
{
  subject: 'competidor.cl',
  lens: 'estimated',            // ◑ — nunca 'measured'
  capturedAt: '2026-08-15',
  organicKeywords: 4120,
  estimatedTrafficValueUsd: 8210.44,
  positionDistribution: { pos1: 12, pos2_3: 44, pos4_10: 310, ... },
  history: [ { month: '2026-03', organicKeywords: 3980, etv: 7714.02 }, ... ]
}
```

Sin `capturedBy`. Sin cruce con GSC. Si el sujeto no tiene snapshot, el reader devuelve
`{ ok: false, reason: 'no_market_data' }` y el consumer decide cómo lo dice — nunca un cero.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tabla + writer) → Slice 2 (colector mensual) → Slice 5 (reader + lanes) es la cadena
  obligatoria: sin tabla no hay dónde escribir, sin colector el reader no tiene qué leer.
- Slice 3 (backfill histórico) y Slice 4 (screening) dependen SÓLO de Slice 1 y pueden correr en
  paralelo entre sí, después de que Slice 1 cerró.
- Slice 6 (evidencia + señal + docs) cierra al final y **no puede saltarse**: sin smoke live contra
  el proveedor, esta task es `code complete, rollout pendiente`, no `complete`.
- 🔴 El flag y el scheduler nacen apagados en Slice 2 y **sólo se prenden en Slice 6**, después del
  smoke con un sujeto. Prenderlos antes expone un cron mensual que gasta sin que nadie haya visto una
  respuesta real del proveedor.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El backfill histórico se corre sobre la cartera completa y quema el presupuesto de varias orgs en una tarde (10× el costo normal) | finance / provider budget | medium | `--dry-run` por defecto, `--apply` explícito, tope duro en USD por corrida, allowlist de dominios por argumento, gate de entitlement por org | pico en `greenhouse_growth.seo_provider_spend_daily` para `family='labs'` |
| Pre-check escrito como "existe fila hoy" en vez de "existe fila fresca" → re-compra diaria de un dato mensual | provider budget | medium | Test que corre el colector dos veces seguidas y afirma coste 0 en la segunda; smoke live que lo confirma con el `cost` real | gasto `labs` que crece linealmente con los días en vez de por ciclo |
| Sujeto desconocido para el proveedor no deja fila → re-compra perpetua de ese sujeto | provider budget | medium | Contrato explícito "fila con NULLs"; test del caso `sin dato` | mismos sujetos reapareciendo en cada corrida del log del worker |
| Una cifra `◑` se muestra junto a una `●` de GSC como si fueran comparables, y el cliente concluye mal | UI / credibilidad | medium | `lens: 'estimated'` obligatorio en el DTO; regla escrita en el delta de arquitectura; la task de UI que la consuma hereda el contrato | reporte de cliente que cuestiona la cifra |
| Un route handler de Vercel llama el colector y lanza porque el hook de spend no está cableado ahí | worker / runtime | low | La captura vive sólo en ops-worker; el import de `register-provider-spend` es el guard, y es deliberado que lance | error en el primer request del handler |
| El `--set-env-vars` destructivo de `deploy.sh` borra el flag aplicado en vivo y el cron queda mudo | worker / flags | medium | Declarar el flag en `deploy.sh` **y** aplicarlo con `--update-env-vars`; verificar en la revisión activa | `seo.domain_overview.stale_subjects` > 0 sin error visible |
| Migración registrada como aplicada sin ejecutar SQL (markers invertidos) | migration | low | Bloque DO con `RAISE EXCEPTION` en la propia migración + verificación por `information_schema` post-apply | `pnpm migrate:status` verde con tabla inexistente |

### Feature flags / cutover

- `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`.
- **Se lee sólo en el ops-worker** — la captura es lo único que gatea, y la captura vive ahí.
  Prenderlo en Vercel sería inerte, y creer que se prendió porque aparece en Vercel es exactamente el
  fallo silencioso que documenta el ledger de flags.
- En Cloud Run el source of truth es `services/ops-worker/deploy.sh` (`--set-env-vars` es
  **destructivo**): declarar el flag ahí **y además** aplicarlo con
  `gcloud run services update ... --update-env-vars` para efecto inmediato.
- Fila obligatoria en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR; el gate
  `pnpm docs:closure-check` falla si falta.
- Cutover: flag `true` + despausar `ops-seo-domain-overview`. Revert: flag `false` + pausar el job,
  efecto inmediato y sin deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` de la migración aditiva (tabla nueva, sin dependencias) | < 5 min | sí |
| Slice 2 | Flag a `false` + pausar `ops-seo-domain-overview` | < 5 min | sí |
| Slice 3 | No aplica: el backfill es una corrida manual. Si escribió filas erróneas, quedan como mediciones y se corrigen con una corrida nueva; jamás con DELETE sobre append-only | n/a | parcial |
| Slice 4 | Revert PR — el screening no tiene cron propio | < 10 min | sí |
| Slice 5 | Revert PR de las rutas + retirar la tool del registro MCP | < 10 min | sí |
| Slice 6 | Retirar la señal del registry de reliability | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` y verificar por `information_schema` que existen tabla, índice único y trigger.
2. Deploy del worker con el flag en `false` y verificar que los siete jobs `ops-seo-*` vigentes
   siguen en `conclusion=success`.
3. Prender el flag en la revisión activa del ops-worker y **verificar en la revisión activa**, no en
   el `deploy.sh`.
4. Disparar `/seo/domain-overview/capture-batch` a mano con **un** sujeto real; comparar el `cost`
   devuelto contra el estimado y confirmar la fila en PG.
5. Re-disparar el mismo sujeto y confirmar coste USD 0 y outcome `fresh`.
6. Despausar el scheduler y esperar un ciclo; confirmar que la señal queda en 0.
7. Backfill histórico: `--dry-run` sobre un dominio, revisar el costo impreso, y sólo entonces
   `--apply`.

### Out-of-band coordination required

- Crear el Cloud Scheduler job `ops-seo-domain-overview` (pausado) en el proyecto GCP.
- Declarar y aplicar la env var del flag en el servicio Cloud Run del ops-worker.
- Confirmar con el operador el tope en USD del backfill histórico antes de la primera corrida con
  `--apply`, porque su costo por sujeto es un orden de magnitud mayor que el resto del módulo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La migración crea `seo_domain_overview_snapshots` con clave única `(normalized_domain, location_code, language_code, capture_date)`, trigger anti UPDATE/DELETE y GRANT a `greenhouse_runtime`, y su bloque DO aborta si algo no quedó creado.
- [ ] `captured_by_organization_id` existe en la tabla, **no** está en la clave única y **no** aparece en ningún DTO devuelto por el reader; hay un test que lo prueba.
- [ ] `captureDomainOverview` salta sujetos frescos sin pegar el proveedor: correrlo dos veces seguidas registra USD 0 en la segunda, verificado con el `cost` real del proveedor y no sólo con mocks.
- [ ] Un sujeto que el proveedor no conoce deja fila con métricas `NULL` y no vuelve a comprarse en la corrida siguiente.
- [ ] `backfillDomainRankHistory` no gasta sin `--apply`, respeta un tope duro en USD y es resumible.
- [ ] `estimateDomainTraffic` acepta hasta 1.000 dominios en un request y escribe en la misma tabla.
- [ ] `readDomainOverview` devuelve `no_market_data` para un sujeto sin snapshot: no hay ceros fantasma.
- [ ] Toda métrica del DTO viaja con `lens: 'estimated'` y `capturedAt`.
- [ ] La tool `get_seo_domain_overview` responde por el lane ecosystem con un canary verde en staging.
- [ ] La capability nueva tiene grant a ≥1 rol real en el mismo PR y el coverage test pasa.
- [ ] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` pasa.
- [ ] El scheduler `ops-seo-domain-overview` quedó creado y su estado (pausado o activo) está declarado en el runbook.
- [ ] Ninguna consulta nueva mezcla esta tabla con `seo_gsc_daily` en un mismo agregado.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (gate de cierre; pedir autorización al operador antes de correrlo)
- `pnpm migrate:status` + verificación por `information_schema`
- Live test del reader contra PG real vía proxy
- Smoke real contra DataForSEO con un sujeto, adjuntando `cost` y prueba de re-corrida a USD 0

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-1662`, `TASK-1709`, `TASK-1776` y `TASK-1777`
- [ ] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 (mapa de capacidades) y §4.2 (modelo de datos)
- [ ] runbook `docs/manual-de-uso/growth/operar-foto-de-dominio-seo.md` creado
- [ ] doc funcional del módulo actualizada con la capacidad nueva

## Follow-ups

- Task `ui-ux` que dibuje la foto de dominio y la comparación contra competidores, consumiendo `readDomainOverview`.
- Evaluar si `readSeoOverviewKpis` debe incorporar el conteo total de keywords ranqueadas como contexto del recorte seguido, manteniendo la separación ●/◑.
- Reconciliar el drift detectado durante el diseño de esta task: la skill `dataforseo-operator` afirma que la familia `backlinks` "sigue sin consumer", pero `TASK-1304` está `complete` y el job `ops-seo-backlink-capture` está declarado ACTIVO en `services/ops-worker/deploy.sh:1338`.

## Open Questions

- ¿El screening de `bulk_traffic_estimation` debe escribir en la misma tabla o en una vista más liviana? La propuesta es misma tabla con NULLs en lo que ese endpoint no puebla; validar contra el patrón multi-productor ya aceptado.
- ¿Cuál es el tope en USD por corrida del backfill histórico? Requiere decisión del operador.
- ¿La cadencia mensual debe alinearse al día 15 como `ops-seo-keyword-market-data`, o correr en otro día para no apilar gasto de proveedor en la misma fecha?
