# TASK-1776 — Growth SEO: visibilidad de mercado por URL, subdominio y subcarpeta

## Delta 2026-08-27 — implementación (code complete, rollout pendiente)

Slices 1–6a implementados y verificados local + PG real (mismo día que TASK-1775, misma sesión).
Decisiones de ejecución que ajustan la spec:

- **`[confirmar en Discovery]` resueltos con la doc oficial (WebFetch 2026-08-27):**
  el filtro de subcarpeta es `ranked_serp_element.serp_item.relative_url` (documentado explícito
  con ejemplo); una URL como `target` va **CON esquema** — sin él el proveedor devuelve el dominio
  ENTERO y lo cobra (gotcha nuevo, ahora en el resolver y en la reference de Labs); y el agregado
  `result[].metrics` cubre el SET COMPLETO del sujeto independiente del `limit` — la foto no
  depende del detalle comprado, así que el snapshot guarda el agregado + `top_keywords` JSONB.
- **OQ1 (`limit` default):** 100 filas/sujeto vía knob `GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT`
  (~USD 0.024/sujeto); el operador lo confirma antes del flip (flag OFF igual).
- **OQ2:** la clase la declara el caller (`kind` requerido en `resolveVisibilitySubject`), jamás
  se infiere; forma que no calza con la clase = `kind_shape_mismatch` explícito.
- **OQ3:** `subdomains`/`relevant_pages` NO corren automáticos — primitives on-demand; el batch
  mensual captura `kind=domain` del target + competidores (cron día 17, no apila con día 15/16).
- **La spec no declaraba el expand del CHECK** de `seo_keyword_market_data.source_endpoint`: sin
  él, el tercer productor (`ranked_keywords`) violaría el constraint. Va en la misma migración
  (nombre verificado contra `pg_constraint`).
- **Lane app NO se crea** (dominio ecosystem-only — misma decisión documentada en TASK-1775);
  capability reutilizada `growth.seo.observation.read` (grant vigente).
- Evento con prefijo del dominio: `growth.seo.url_visibility.snapshot_captured`; los colectores
  de concentración no emiten (on-demand, sin downstream; gasto en el ledger por construcción).
- `Files owned` decía `…_task-1777-…` para la migración (typo): quedó
  `20260827194219636_task-1776-seo-url-visibility.sql`. Se agregan `persist.ts` (writer simétrico
  al de domain-overview), `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (el lane vive
  ahí; además `SeoLaneSubject` gana `rootDomain`), `keyword-market-data.ts` (tipo + header del
  writer compartido), la señal en `src/lib/reliability/**` y el sanity
  `scripts/growth/_sanity-task-1776-url-visibility.ts`.
- **Sin boundary test `ALLOWED_WRITE_TARGETS`** en `growth/**` (verificado en 1775): no aplica.

**Rollout pendiente (checkpoint del operador — gasta dinero real):** smoke live con los cuatro
`subject_kind` (incluye verificar que un `subfolder` devuelve sólo URLs bajo su ruta y que el
enriquecimiento no sube el `cost`), flag ON multi-runtime + despausar `ops-seo-url-visibility`,
canary de la tool MCP en staging + federación en `efeonce-mcp`, y confirmación del `limit` default.
Hasta entonces: flag OFF, scheduler declarado pausado, cero gasto.

### Evidencia de rollout 2026-08-27 (smoke live autorizado por el operador)

- Flag ON (declarativo + `--update-env-vars`, revisión activa verificada). Dry-run USD 0.048
  estimado → **batch real USD 0.0366** con **90 filas de mercado escritas gratis** (85 Berel +
  5 Efeonce — el beneficio de cartera del tercer productor, ya medible). **Re-corrida: USD 0.**
- Smoke de los cuatro `subject_kind`: `domain` (batch) · `subfolder` `berel.com/productos` →
  **197 keywords y 100/100 URLs del detalle bajo la ruta** (el filtro `relative_url` verificado
  contra el proveedor real) · `url` `/ubica-tienda` → 60 keywords · `subdomain` `www.berel.com`
  → `no_market_data` honesto con fila NULL. Costo del tramo: USD 0.0552 + 120 filas de mercado.
- Scheduler `ops-seo-url-visibility` **despausado (ENABLED)**. Lane canary verde en staging
  (`mode=subject`, `servedMarket=MX`). Señal `seo.url_visibility.stale_subjects` en steady `ok`.
- Pendiente para `complete`: pase develop→main + federación de `get_seo_url_visibility` en
  `efeonce-mcp` (post-release).

## Delta 2026-08-27 (2) — federación al gateway ya escrita

- La federación de `get_seo_url_visibility` en `efeonce-mcp` ya está escrita (bajo
  `efeonce.mcp.read`, con guard de paridad bidireccional — incluye `market` en el schema público —
  y canary; code complete en `efeonce-mcp` local, deploy del gateway pendiente POST-release
  develop→main) — cerrado por trabajo en TASK-1658. Pendiente para `complete` de esta task:
  pase develop→main + deploy del gateway + verificación `tools/list` 13→21.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
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
- Status real: `code complete, rollout pendiente`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse sabe qué posición ocupa una keyword que alguien decidió seguir, pero **no sabe qué ranquea
una URL**. No puede responder "¿por qué keywords entra tráfico a esta página?", ni "¿qué páginas del
competidor concentran su tráfico?", ni "¿cuál de sus subdominios es el que pesa?". Esta task abre el
sujeto **página** con cuatro endpoints Labs ya permitidos (`ranked_keywords` con target no-dominio,
`relevant_pages`, `subdomains`, `page_intersection`) y aprovecha que el `keyword_info` viene inline y
ya pagado en esas respuestas para alimentar la tabla de mercado compartida.

## Why This Task Exists

**El trabajo editorial se decide a nivel de página, y el módulo sólo sabe hablar de dominios y de
keywords sueltas.** Cuando un cliente pregunta "¿esta guía que escribimos está funcionando?", hoy hay
que responder cruzando a mano el set seguido con GSC — y GSC sólo cubre el dominio propio. De la
página de un competidor no se ve absolutamente nada.

Esa es exactamente la tríada `url_research` / `subdomain_research` / `subfolder_research` que Semrush
vende como tres áreas separadas y que en DataForSEO es **un mismo endpoint con el `target` cambiado**:
`ranked_keywords` acepta dominio, subdominio o URL exacta. La consecuencia de diseño es fuerte: no
son tres capacidades, es **una capacidad con un resolver de sujeto**. Construirlas como tres es
triplicar el mismo código y garantizar que se desincronicen.

Hay además un ahorro estructural que esta task captura. `ranked_keywords` devuelve, dentro de cada
fila, el `keyword_data.keyword_info` completo —volumen, dificultad, competencia, CPC— **ya pagado en
la misma respuesta**. `seo_keyword_market_data` nació explícitamente multi-productor para recibir ese
dato desde varias fuentes (`TASK-1661` lo llena desde `keyword_overview`, `TASK-1662` desde
`domain_intersection`). Esta task es el **tercer productor**: cada corrida de visibilidad por URL
enriquece gratis el mercado de la cartera completa. Ignorarlo sería pagar dos veces por el mismo número.

Por último, cierra el lado `◑` de `TASK-1313`. Esa task une, por URL, el rank propio y las citas AEO —
todo dato de primera parte. Sin esta task, la mitad de mercado de esa unión no existe.

## Goal

- Un solo primitive con **resolver de sujeto** que normaliza lo pedido a `domain | subdomain |
  subfolder | url` y elige el endpoint y los filtros correctos, en vez de tres capacidades paralelas.
- Snapshot append-only de visibilidad por sujeto-página: keywords ranqueadas, distribución por
  posición, ETV, y las páginas que concentran el tráfico.
- Enriquecimiento **gratuito** de `seo_keyword_market_data` con el `keyword_info` inline de cada
  corrida, usando el writer compartido `persistKeywordMarketData` y jamás un segundo almacén.
- `limit` y filtros server-side tratados como palanca de costo explícita: cada fila devuelta se paga.
- Reader `readUrlVisibility` expuesto en los tres lanes (app · Nexa · ecosystem/MCP), con lente `◑` y
  `as-of` en toda cifra.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§15 (granularidad URL / topic
  cluster: la extensión que esta task alimenta por el lado de mercado)**, **§4.2 (el bloque de
  `seo_keyword_market_data`: multi-productor por diseño, writer compartido)**, §1.1 (boundary duro
  SEO↔AEO: cruce en memoria por `organization_id`, jamás JOIN/VIEW/FK), §3, §5, §6, §7, §8.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `CLAUDE.md §"Database — Migration markers"`
- `CLAUDE.md §"SQL embebido — type alignment + live testing"` y §`SQL Signal Reader Schema Validation Gate`
- `CLAUDE.md §"Runtime Rollout Completion Gate"` + `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

Reglas obligatorias:

- **NUNCA** abrir un segundo almacén de datos de mercado por keyword. El `keyword_info` inline se
  escribe con `persistKeywordMarketData` en `greenhouse_growth.seo_keyword_market_data`.
- **NUNCA** llamar el proveedor desde un route handler de Vercel: la captura vive en el ops-worker,
  que es donde está cableado `register-provider-spend`.
- **NUNCA** pedir `limit` alto "por si acaso": cada fila devuelta cuesta USD 0,00012 y los filtros
  server-side son gratis. El `limit` es una cota de gasto, no una preferencia de UX.
- **NUNCA** mezclar en un mismo agregado la posición `◑` de `ranked_keywords` con la posición `●`
  promediada de GSC. Son mediciones distintas de cosas distintas.
- **NUNCA** hacer JOIN, VIEW ni FK entre tablas `seo_*` y `grader_*`.

## Normative Docs

- `.claude/skills/dataforseo-operator/SKILL.md` — regla cero del contrato Greenhouse.
- `.claude/skills/dataforseo-operator/references/02-labs.md` — §2 catálogo (`ranked_keywords`,
  `relevant_pages`, `subdomains`, `page_intersection`), §4 filtros/`order_by`/paginación, §5 costos,
  §7 gotchas (incluido el 8: `keyword_difficulty` colapsa a 0 en SERPs es-LATAM).
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `docs/tasks/to-do/TASK-1313-growth-seo-unified-page-cluster-visibility-360-read.md` — el consumidor
  natural del lado `◑` que esta task produce.
- `docs/tasks/to-do/TASK-1662-growth-seo-keyword-gap-discovery.md` — comparte el patrón de
  "keyword_info inline ya pagado"; leer para no duplicar el writer.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_targets` (`migrations/20260805134439202_task-1299-growth-seo-schema.sql`).
- `greenhouse_growth.seo_keyword_market_data` + `persistKeywordMarketData` y `readKeywordMarketData` (`src/lib/growth/seo/keyword-market-data.ts`, `migrations/20260813171143226_task-1661-keyword-market-data.sql`) — destino del enriquecimiento gratuito.
- `src/lib/ai/dataforseo.ts` + `src/lib/ai/dataforseo-families.ts` — familia `labs`, ya permitida. **Esta task NO amplía el allowlist.**
- `src/lib/growth/seo/entitlement.ts` — `enforceSeoRunEntitlement`.
- `src/lib/growth/seo/resolve-target.ts` — `resolveSeoTargetForMarket` / `resolveUnambiguousSeoTarget`, punto de partida del resolver de sujeto.
- `services/ops-worker/server.ts`.

### Blocks / Impacts

- **`TASK-1313`** — esta task produce el lado `◑` de su unión por URL. Coordinación obligatoria: 1313 **compone**, no captura; si 1313 entra primero, esta task se enchufa como fuente sin cambiarle el contrato. Solape de archivos posible en `src/lib/growth/seo/` — declarar en Discovery.
- **`TASK-1662`** — comparte el mecanismo "escribir el `keyword_info` que ya vino pagado". La que entre segunda **reusa** el writer, no lo reescribe.
- **`TASK-1312` / `TASK-1314`** (topic cluster, pillar health) — ganan la cobertura de mercado por URL que hoy no tienen.
- **`TASK-1705`** (harvest gratuito post-crawl de OnPage) — eje adyacente: aquélla saca más de un crawl ya pagado; ésta saca más de una respuesta Labs ya pagada. Mismo principio, superficies distintas.

### Files owned

- `migrations/<timestamp>_task-1777-seo-url-visibility.sql`
- `src/lib/growth/seo/url-visibility/resolve-subject.ts`
- `src/lib/growth/seo/url-visibility/capture.ts`
- `src/lib/growth/seo/url-visibility/relevant-pages.ts`
- `src/lib/growth/seo/url-visibility/reader.ts`
- `src/lib/growth/seo/url-visibility/__tests__/*.test.ts`
- `src/lib/growth/seo/contracts.ts` (aditivo)
- `src/lib/growth/seo/flags.ts` (aditivo)
- `services/ops-worker/server.ts` (aditivo: `/seo/url-visibility/capture-batch`)
- `services/ops-worker/deploy.sh` (aditivo)
- `src/app/api/platform/ecosystem/growth/seo/url-visibility/route.ts`
- `src/mcp/greenhouse/{tools.ts,server.ts,http-client.ts}` (aditivo: `get_seo_url_visibility`)
- `docs/manual-de-uso/growth/operar-visibilidad-por-url-seo.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Transporte canónico con familia `labs` permitida, breaker y registro de costo.
- `seo_keyword_market_data` **explícitamente diseñada multi-productor**, con writer compartido
  `persistKeywordMarketData` y clave `(normalized_keyword, location_code, language_code, capture_date)`
  sin organización.
- `deriveLinkBarrier` en `keyword-market-data.ts` — la derivación canónica del perfil de enlaces del
  top-10, que **no** debe reimplementarse desde `keyword_difficulty`.
- Resolver de target de mercado: `src/lib/growth/seo/resolve-target.ts`.
- Patrón completo de cron de captura + endpoint worker + scheduler + flag subordinado.

### Gap

- `ranked_keywords` no tiene ningún consumer productivo: aparece sólo en documentación y en el diseño
  de `TASK-1709`.
- `relevant_pages`, `subdomains` y `page_intersection` no aparecen en `src/` ni en `services/`.
- No existe tabla ni contrato cuyo sujeto sea una URL de mercado. `seo_gsc_daily` tiene `page`, pero
  es dato de primera parte y sólo del dominio propio.
- No hay forma de responder "qué ranquea esta página del competidor" sin salir de la plataforma.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/url-visibility/**` con captura en `services/ops-worker` y lectura servida desde el portal Next.js
- Future candidate home: `domain-package`
- Boundary: primitives `resolveVisibilitySubject` · `captureUrlVisibility` · `readUrlVisibility`; consumers autorizados son ops-worker (escritura), route handlers de `api/platform/**` y la tool MCP `get_seo_url_visibility` (lectura)
- Server/browser split: transporte, secreto del proveedor y stores quedan server-only; al browser sólo viaja el DTO del reader
- Build impact: `none` — reusa transporte y cliente PostgreSQL existentes
- Extraction blocker: FK a `greenhouse_growth.seo_targets` y escritura compartida sobre `seo_keyword_market_data`, que obliga a mover ambas tablas juntas

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: tabla nueva `greenhouse_growth.seo_url_visibility_snapshots` + escritura compartida sobre `greenhouse_growth.seo_keyword_market_data` + `seo_provider_spend_daily`
- Consumidores afectados: `ops-worker`, `api/platform/ecosystem`, MCP, Nexa, y `TASK-1313` como consumidor derivado
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: `postDataForSeoTask`, `enforceSeoRunEntitlement`, **`persistKeywordMarketData`** (writer compartido de mercado, se reusa tal cual), shape `{ ok }` de los readers.
- Contrato nuevo o modificado: reader `readUrlVisibility`; command `captureUrlVisibility`; tipo `VisibilitySubject`; evento outbox `seo.url_visibility.snapshot_captured`; tool MCP `get_seo_url_visibility`.
- Backward compatibility: `compatible` — aditivo. La escritura sobre `seo_keyword_market_data` usa el writer existente sin cambiarle la firma.
- Full API parity: un primitive, tres lanes en la misma task.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_url_visibility_snapshots` (nueva), `greenhouse_growth.seo_keyword_market_data` (escritura vía writer compartido), `seo_targets` (lectura), `seo_provider_spend_daily` (escritura por el transporte).
- Invariantes que no se pueden romper:
  - Append-only con trigger anti UPDATE/DELETE.
  - **Clave única `(subject_kind, normalized_subject, location_code, language_code, capture_date)`.** El sujeto normalizado incluye el esquema y el trailing slash resueltos, porque `ejemplo.cl/guia` y `ejemplo.cl/guia/` son la misma página para el negocio y dos claves distintas para una `TEXT` cruda.
  - `subject_kind` con **CHECK de vocabulario cerrado** (`domain | subdomain | subfolder | url`): si el motor sólo entiende cuatro sujetos, que el schema los enumere y un quinto rompa el INSERT en vez de colarse invisible en toda lectura que agrupe por tipo.
  - El enriquecimiento de mercado **no** duplica filas: pasa por `persistKeywordMarketData`, que ya es idempotente por su propia clave.
  - `captured_by_organization_id` es atribución, no aislamiento, y no viaja al cliente.
  - Toda posición de esta tabla es `◑`; jamás se promedia con GSC.
- Write-target allowlist: si Discovery encuentra boundary test vigente en el dominio `growth/seo`, declarar la tabla nueva ahí en el mismo PR. `[confirmar en Discovery]`
- Tenant/space boundary: lectura por `organization_id` + entitlement `seo_v2`; escritura desde ops-worker con actor de sistema y gasto atribuido a la org que dispara.
- Idempotency/concurrency: pre-check de frescura por `(subject_kind, subject, location, language)` antes de pegar el proveedor; `ON CONFLICT DO NOTHING` como guardia de carrera.
- Audit/outbox/history: evento outbox por corrida; gasto en el ledger por construcción.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF` — `GROWTH_SEO_URL_VISIBILITY_ENABLED` default `false`; scheduler creado pausado.
- Backfill plan: sin backfill masivo. La primera corrida por sujeto es la que crea su historia; el módulo es forward-only por diseño en esta capa.
- Rollback path: flag a `false` + pausar el job. Las filas escritas quedan: son mediciones válidas.
- External coordination: Cloud Scheduler nuevo + env var en `deploy.sh` (declarar **y** aplicar en vivo, porque `--set-env-vars` es destructivo).

### Security and access

- Auth/access gate: capability de lectura del módulo SEO (`[confirmar nombre exacto en Discovery contra src/config/entitlements-catalog.ts]`) + entitlement `seo_v2`; escritura sólo desde ops-worker.
- Sensitive data posture: sin PII. Las URLs de competidores son públicas; `captured_by_organization_id` no sale del servidor.
- Error contract: `canonicalErrorResponse` + `captureWithDomain`; nada de prosa del proveedor al cliente.
- Abuse/rate-limit posture: breaker de familia `labs`, tope de sujetos por corrida, `limit` acotado por configuración y filtros server-side obligatorios.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: `pnpm pg:connect:migrate` + verificación por `information_schema` de tabla, CHECK de `subject_kind`, índice único y trigger; live test del reader contra PG real recordando que `runGreenhousePostgresQuery` devuelve un **array pelado**.
- Integration checks: smoke real con los cuatro `subject_kind` sobre un dominio propio, comparando el `cost` devuelto contra el estimado y confirmando que el `keyword_info` inline quedó en `seo_keyword_market_data` sin filas duplicadas.
- Reliability signals/logs: `seo.url_visibility.stale_subjects`.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumidores nombrados con paths reales.
- [x] Invariantes, boundary de tenant e idempotencia explícitos.
- [x] Tabla nueva declarada en el allowlist de destinos de escritura del dominio si existe boundary test.
- [x] Postura de migración/backfill/rollback explícita.
- [x] Evidencia runtime/DB listada.
- [x] Errores canónicos y cero fuga de datos sensibles.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive, no en la UI.
- [x] Modelada como command/reader sobre el sujeto "página", no como handler de pantalla.
- [x] Read como reader canónico; write como command con entitlement, idempotencia, outbox y errores canónicos.
- [x] Capability + grant a ≥1 rol real en el MISMO PR con coverage test verde. (Se reutiliza `growth.seo.observation.read`, ya granteada.)
- [x] Camino programático declarado: ecosystem + MCP en esta misma task.
- [x] Write apto para `propose → confirm → execute`.
- [x] Un primitive, muchos consumers.
- [x] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolver de sujeto

- `resolveVisibilitySubject(input)` en `url-visibility/resolve-subject.ts`: normaliza lo pedido a
  `{ kind, normalized, providerTarget, providerFilters }`.
- Normalización explícita: esquema, `www`, trailing slash, query string y fragmento. Dos formas de
  escribir la misma página deben producir la misma clave.
- Tests de tabla que cubran las cuatro clases y los casos ambiguos (`ejemplo.cl/blog` como subcarpeta
  vs como URL exacta) con una regla declarada, no inferida.

### Slice 2 — Tabla + captura `ranked_keywords`

- Migración `additive` con `subject_kind` bajo CHECK cerrado, clave única, trigger anti mutación,
  índices y GRANT, más bloque DO anti pre-up-marker.
- `captureUrlVisibility` sobre `/v3/dataforseo_labs/google/ranked_keywords/live` con el `target` y los
  filtros que devuelve el resolver, `limit` acotado por configuración y `order_by` por volumen.
- Pre-check de frescura antes de pegar el proveedor; sujeto sin dato deja fila con NULLs.
- Gate de entitlement con `estimatedCostUsd` del batch y re-consulta cada K sujetos.

### Slice 3 — Enriquecimiento gratuito del mercado

- Extraer `keyword_data.keyword_info` de cada fila de la respuesta y escribirlo con
  `persistKeywordMarketData`, sin tocar su firma.
- Test que corre una captura y afirma: (a) las filas de mercado quedaron, (b) no hay duplicados,
  (c) el costo del proveedor **no subió** por este paso — el dato ya venía pagado.
- Registrar el tercer productor en el comentario de cabecera de `keyword-market-data.ts`.

### Slice 4 — Páginas que concentran el tráfico

- `relevant-pages.ts` sobre `/v3/dataforseo_labs/google/relevant_pages/live` y
  `/v3/dataforseo_labs/google/subdomains/live` para responder "qué URLs y qué subdominios pesan".
- Persistidos como filas del mismo snapshot con su `subject_kind` correspondiente.

### Slice 5 — Reader + contrato gobernado + lanes

- `readUrlVisibility({ organizationId, subject, range })` con degradación honesta por sujeto sin
  snapshot (`no_market_data`).
- Route handler ecosystem + tool MCP `get_seo_url_visibility` + capability con grant en el mismo PR.
- Endpoint `/seo/url-visibility/capture-batch` en el worker + scheduler pausado + flag con fila en el
  ledger.

### Slice 6 — Evidencia real, señal y cierre documental

- Smoke live con los cuatro `subject_kind`, adjuntando `cost` real y la prueba de re-corrida a USD 0.
- Signal `seo.url_visibility.stale_subjects`.
- Deltas en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15 y §4.2, runbook, doc funcional,
  `Handoff.md`, `changelog.md`, y delta en `TASK-1313` declarando que su lado `◑` ya tiene fuente.

## Out of Scope

- **Cualquier superficie visible.** La cara la construye una task `ui-ux` posterior.
- **La unión SEO × AEO por URL** — es `TASK-1313`. Esta task produce insumo, no compone.
- **Keyword gap entre dos dominios** (`domain_intersection`) — es `TASK-1662`.
- **`page_intersection`** queda declarado como follow-up, no como entregable: su caso de uso natural
  es la comparación de pillar pages, que pertenece a `TASK-1314`. Incluirlo acá mezclaría "describir
  una página" con "comparar dos".
- **Foto y trayectoria de dominio completo** — es `TASK-1775`.
- **Ampliar el allowlist de familias.** Los cuatro endpoints son `labs`.
- **Crawl u on-page de la URL.** Esta task mide lo que el mercado dice de la página; lo que la página
  tiene por dentro es OnPage (`TASK-1705`, `TASK-1670`).

## Detailed Spec

### 1. Un endpoint, cuatro sujetos: por qué es una capacidad y no tres

`ranked_keywords` acepta como `target` un dominio, un subdominio o una URL exacta. Semrush lo vende
como `url_research`, `subdomain_research` y `subfolder_research` porque su producto está organizado
por reportes; en DataForSEO es el mismo endpoint con el `target` cambiado.

Construirlo como tres módulos significaría tres pre-checks, tres gates de entitlement, tres formas de
normalizar una URL y tres oportunidades de que se desincronicen. La forma correcta es **un resolver
de sujeto** que decide `target` + filtros, y un colector que no sabe de qué clase de sujeto se trata.

La subcarpeta es el único caso que no tiene target nativo: se resuelve pidiendo el dominio y filtrando
server-side por la ruta relativa del elemento SERP. El path exacto del campo de filtro debe
**confirmarse contra `available_filters` del proveedor durante Discovery** — la referencia documenta
la forma del filtro (`["ranked_serp_element.serp_item.rank_group","<=",10]`) pero no el campo de ruta.
`[confirmar en Discovery]`

### 2. La normalización del sujeto es la clave, literalmente

`https://ejemplo.cl/guia`, `ejemplo.cl/guia/`, `www.ejemplo.cl/guia?utm_source=x` son la misma página
para el negocio. Si la clave única es el `TEXT` crudo, son tres filas, tres pre-checks que fallan y
tres compras del mismo dato.

Reglas de normalización, declaradas y testeadas, no inferidas:

- Esquema descartado. `www.` descartado. Host en minúsculas.
- Trailing slash removido salvo en la raíz.
- Query string y fragmento descartados **salvo** que el sujeto sea `url` y el operador los declare
  explícitamente (hay sitios donde el parámetro sí distingue contenido).
- El resultado es `normalized_subject`; el crudo se conserva aparte para trazabilidad.

### 3. El `keyword_info` inline es dinero ya gastado

Cada fila de `ranked_keywords` trae `keyword_data.keyword_info` con volumen, competencia y CPC. Ese
número ya se pagó al pedir la fila. `seo_keyword_market_data` fue diseñada multi-productor
justamente para recibirlo desde varias fuentes, con clave sin organización para que lo que pagó una
org sirva a otra.

Efecto de cartera: una corrida de visibilidad sobre 200 URLs de un cliente puede dejar frescos varios
cientos de registros de mercado que **otro** cliente habría tenido que comprar. El test del Slice 3
debe probar que este paso no incrementa el `cost` del proveedor.

⚠️ Al derivar barrera de enlaces desde estas filas, usar `deriveLinkBarrier` sobre `avg_backlinks_info`.
**NUNCA** derivarla de `keyword_difficulty`: colapsa a 0 en SERPs es-LATAM (gotcha 8 de la referencia
de Labs).

### 4. `limit` es la palanca de costo

Cada fila devuelta cuesta USD 0,00012 sobre un setup de USD 0,012. Filtrar y ordenar server-side es
**gratis**. Un `limit: 1000` sobre 200 sujetos son USD 26,4 en filas; el mismo trabajo con
`limit: 100` y `order_by` por volumen son USD 2,6 — y responde la misma pregunta de negocio, porque
las keywords que importan están arriba.

El `limit` se declara por configuración con default conservador, y el preview de costo se calcula
como peor caso (asumiendo que vuelven todas las filas pedidas), igual que hace hoy el builder de
keyword discovery.

### 5. Frontera con TASK-1313, escrita para que no se cruce

- **1777 captura mercado**: qué dice el SERP sobre una página, de cualquier dominio.
- **1313 compone primera parte**: qué mide GSC y qué cita la IA, sobre páginas propias.
- El cruce ocurre **en memoria por `organization_id` + `url`**, jamás por JOIN, VIEW o FK, y jamás
  entre tablas `seo_*` y `grader_*`.
- Un promedio entre la posición `◑` de esta task y la posición `●` de GSC sería una cifra sin
  referente: una es la posición exacta en una SERP concreta, la otra es un promedio ponderado por
  impresiones sobre países y dispositivos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (resolver) → Slice 2 (tabla + captura) es obligatorio: la clave única depende de la
  normalización, y cambiarla después exigiría reescribir filas de una tabla append-only.
- Slice 3 (enriquecimiento) depende de Slice 2 y **debe cerrar antes** de prender el cron: si el cron
  corre sin ese paso, se pagan filas cuyo `keyword_info` se tira a la basura.
- Slice 4 puede correr en paralelo con Slice 3 una vez cerrado Slice 2.
- Slice 5 (reader + lanes) después de Slice 2.
- Slice 6 cierra al final. Sin smoke live, la task es `code complete, rollout pendiente`.
- 🔴 Flag y scheduler nacen apagados en Slice 5 y se prenden sólo en Slice 6.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Normalización incompleta → la misma página como varias claves y compra repetida del mismo dato | provider budget | **high** | Slice 1 va primero, con tests de tabla sobre esquema/www/slash/query; la clave única se define sobre `normalized_subject` | filas casi idénticas en `seo_url_visibility_snapshots` con el mismo dominio |
| `limit` alto por defecto multiplica el costo por fila sin mejorar la respuesta | provider budget | medium | `limit` por configuración con default conservador, `order_by` por volumen, preview de costo peor caso | gasto `labs` desproporcionado al número de sujetos |
| El paso de enriquecimiento se implementa como INSERT propio y duplica filas de mercado o rompe la idempotencia de `seo_keyword_market_data` | data quality | medium | Reuso obligatorio de `persistKeywordMarketData`; test de no-duplicados | conteo de `seo_keyword_market_data` creciendo más rápido que las keywords distintas |
| Barrera de enlaces derivada de `keyword_difficulty` → colapsa a 0 en es-LATAM y el reporte miente | credibilidad | medium | `deriveLinkBarrier` sobre `avg_backlinks_info` es la única derivación permitida; está documentado como gotcha 8 | dificultad 0 en keywords obviamente competidas |
| Posición `◑` promediada con posición `●` de GSC en una misma serie | UI / credibilidad | medium | Lente obligatoria en el DTO; regla escrita en el delta de arquitectura; frontera con 1313 declarada | discrepancia inexplicable entre dos vistas del mismo cliente |
| Filtro de subcarpeta apunta a un campo inexistente y el proveedor devuelve el dominio completo, cobrando filas de más | provider budget | medium | Confirmar el campo contra `available_filters` en Discovery; test de integración que afirma que un sujeto `subfolder` devuelve sólo URLs bajo esa ruta | filas de un `subject_kind: subfolder` con URLs fuera de la ruta |
| `--set-env-vars` destructivo borra el flag y el cron queda mudo | worker / flags | medium | Declarar en `deploy.sh` **y** aplicar con `--update-env-vars`; verificar en la revisión activa | `seo.url_visibility.stale_subjects` > 0 sin error |
| Migración registrada sin ejecutar SQL (markers invertidos) | migration | low | Bloque DO con `RAISE EXCEPTION` + verificación por `information_schema` | `migrate:status` verde con tabla inexistente |

### Feature flags / cutover

- `GROWTH_SEO_URL_VISIBILITY_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`.
- **Se lee sólo en el ops-worker**: la captura es lo único gateado y vive ahí. En Vercel sería inerte.
- Source of truth en Cloud Run es `services/ops-worker/deploy.sh`; declarar el flag ahí **y** aplicarlo
  con `--update-env-vars` para efecto inmediato.
- Fila obligatoria en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.
- Cutover: flag `true` + despausar el scheduler. Revert: flag `false` + pausar, sin deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — módulo puro sin efectos | < 5 min | sí |
| Slice 2 | `pnpm migrate:down` de la migración aditiva + flag a `false` | < 10 min | sí |
| Slice 3 | Revert PR. Las filas de mercado escritas quedan: son datos válidos e idempotentes | < 10 min | parcial |
| Slice 4 | Revert PR | < 10 min | sí |
| Slice 5 | Revert PR de rutas + retirar la tool del registro MCP + pausar scheduler | < 10 min | sí |
| Slice 6 | Retirar la señal del registry | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` + verificar por `information_schema` tabla, CHECK de `subject_kind`, índice único
   y trigger.
2. Deploy del worker con flag `false`; confirmar que los jobs `ops-seo-*` vigentes siguen verdes.
3. Prender el flag en la revisión activa del ops-worker y verificarlo **en la revisión activa**.
4. Disparar la captura a mano con un sujeto de cada clase sobre el dominio propio; comparar `cost`
   contra el estimado.
5. Confirmar en PG que el `keyword_info` inline quedó en `seo_keyword_market_data` y que no hay
   duplicados.
6. Re-disparar los mismos sujetos: coste USD 0, outcome `fresh`.
7. Verificar que un sujeto `subfolder` devolvió sólo URLs bajo esa ruta.
8. Despausar el scheduler y esperar un ciclo; señal en 0.

### Out-of-band coordination required

- Crear el Cloud Scheduler job de la captura (pausado) en el proyecto GCP.
- Declarar y aplicar la env var del flag en el servicio Cloud Run del ops-worker.
- Confirmar con el operador el `limit` por defecto por sujeto, porque fija el costo por corrida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `resolveVisibilitySubject` produce la misma clave para `https://ejemplo.cl/guia`, `ejemplo.cl/guia/` y `www.ejemplo.cl/guia`, probado con tests de tabla.
- [x] La migración crea la tabla con `subject_kind` bajo CHECK cerrado de cuatro valores, clave única sobre el sujeto normalizado, trigger anti UPDATE/DELETE y GRANT; el bloque DO aborta si algo no quedó creado.
- [x] `captureUrlVisibility` opera las cuatro clases de sujeto con un solo colector.
- [x] Un sujeto `subfolder` devuelve sólo URLs bajo esa ruta, verificado contra el proveedor real. *(Smoke 2026-08-27: `berel.com/productos` → 100/100 URLs del detalle bajo la ruta.)*
- [x] El `keyword_info` inline queda escrito en `seo_keyword_market_data` vía `persistKeywordMarketData`, sin duplicados y **sin incrementar el costo del proveedor**, probado en el smoke real. *(Smoke 2026-08-27: 210 filas de mercado con `providerCostUsd=0`.)*
- [x] Ninguna derivación de barrera de enlaces usa `keyword_difficulty`.
- [x] Correr la captura dos veces seguidas dentro del ciclo registra USD 0 en la segunda, verificado con el `cost` real. *(Smoke 2026-08-27: re-corrida USD 0.)*
- [x] Un sujeto que el proveedor no conoce deja fila con NULLs y no se re-compra. *(Smoke 2026-08-27: `www.berel.com` → `no_market_data` honesto con fila NULL; re-corrida USD 0.)*
- [x] `readUrlVisibility` devuelve `no_market_data` para sujeto sin snapshot; cero ceros fantasma.
- [x] Toda cifra del DTO viaja con lente `◑` y `capturedAt`; `captured_by_organization_id` no aparece, probado con test.
- [x] La tool `get_seo_url_visibility` responde por el lane ecosystem con canary verde en staging. *(Smoke 2026-08-27: `mode=subject`, `servedMarket=MX`.)*
- [x] Cierre operativo: pase develop→main con los lanes en producción + deploy del gateway con la federación de `TASK-1658` (dueña) verificado con `tools/list` 13→21. *(2026-08-27: release `cc73c74789ce` → lanes en producción; gateway `efeonce-mcp-gateway-00023-zt2` desplegado; `tools/list` autenticado observado: **21 tools SEO** — antes 13.)*
- [x] La capability tiene grant a ≥1 rol real en el mismo PR y el coverage test pasa.
- [x] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` pasa.
- [x] Ninguna consulta nueva hace JOIN, VIEW o FK entre `seo_*` y `grader_*`.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (gate de cierre; pedir autorización al operador antes de correrlo)
- `pnpm migrate:status` + verificación por `information_schema`
- Live test del reader contra PG real vía proxy
- Smoke real contra DataForSEO con los cuatro `subject_kind`

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` quedó actualizado
- [x] `changelog.md` quedó actualizado
- [x] se ejecutó chequeo de impacto cruzado sobre `TASK-1313`, `TASK-1662`, `TASK-1312`, `TASK-1314` y `TASK-1775`
- [x] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15 y §4.2
- [x] delta en `TASK-1313` declarando que su lado de mercado ya tiene fuente *(actualizado 2026-08-27 al estado `complete` con el rollout ejecutado)*
- [x] runbook `docs/manual-de-uso/growth/operar-visibilidad-por-url-seo.md` creado
- [x] doc funcional del módulo actualizada

## Follow-ups

- `page_intersection` para comparar dos pillar pages, como extensión de `TASK-1314`.
- Task `ui-ux` que dibuje la vista de página y su comparación contra la página del competidor.
- Evaluar si el enriquecimiento de mercado desde esta fuente permite bajar la frecuencia del cron mensual de `TASK-1661`, ya que parte de la cartera quedaría fresca por efecto lateral.

## Open Questions

- ¿Cuál es el `limit` por defecto por sujeto? Fija el costo por corrida y requiere decisión del operador.
- ¿La regla de desambiguación entre `subfolder` y `url` la declara el operador al pedir la corrida, o se infiere del trailing slash? La propuesta es declararla explícitamente y no inferirla.
- ¿`subdomains` debe correr por separado o dispararse automáticamente cuando el sujeto es `domain`? Correrlo siempre añade costo fijo por corrida.
