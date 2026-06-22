# TASK-1222 — HubSpot Quotes Global Reconciliation + Webhook Coverage

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial|finance|integrations.hubspot|sync|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1222-hubspot-quotes-global-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse no esta importando todas las cotizaciones de HubSpot: HubSpot muestra/API devuelve 78 quotes, pero el portal staging expone solo 24 `source=hubspot`. El sync actual solo recorre organizaciones ya mapeadas y pide `company -> quotes`; quedan fuera quotes asociadas solo via deal, quotes de companies aun no promovidas a organization y quotes sin ancla suficiente. Esta task reemplaza ese discovery parcial por una reconciliacion global de quotes, agrega cobertura webhook de quote y ejecuta backfill seguro de las faltantes.

## Why This Task Exists

El diagnostico read-only del 2026-06-22 confirmo que el token HubSpot ve el portal correcto (`portalId=48713323`) y que `/crm/v3/objects/quotes/search` devuelve el mismo total que la UI de HubSpot: `78`. Greenhouse, sin embargo, devuelve `24` quotes HubSpot por `GET /api/finance/quotes?source=hubspot`.

La causa raiz no es el scheduler ni el token: `ops-hubspot-quotes-sync` corre cada 6 horas, pero el codigo solo descubre cotizaciones desde `greenhouse_core.organizations.hubspot_company_id` y el bridge `GET /companies/{hubspotCompanyId}/quotes`, que internamente llama asociaciones directas `companies -> quotes`. Ese modelo ignora quotes con relacion `quote -> deal -> company` y no tiene webhook de `quote`; por eso los logs repiten `0 created, 24 updated` aunque HubSpot tenga mas registros.

## Goal

- Importar todas las HubSpot quotes resolubles, no solo las asociadas directamente a companies ya conocidas por Greenhouse.
- Resolver organization/client desde asociaciones directas `quote -> company` y fallback `quote -> deal -> company`.
- Registrar de forma auditable las quotes no resolubles, sin inventar clientes ni silently skip.
- Agregar webhook/subscription de HubSpot Quote para reaccionar a nuevas quotes/cambios relevantes.
- Ejecutar backfill idempotente para cerrar el gap actual entre HubSpot `78` y Greenhouse `24`, con evidencia staging/prod.

## Delta 2026-06-22 — Slice 1 dry-run: RECALIBRACION DE PREMISA (read-only, HubSpot real)

El dry-run global (`scripts/hubspot/reconcile-quotes-dryrun.ts`, ejecutado contra HubSpot real + PG) **invalida la causa raiz principal asumida**. Buckets reales (78 HubSpot quotes):

| Bucket | Count | Lectura |
|---|---|---|
| `already_present` (UNION finance ∪ commercial) | 25 | finance=25, commercial=25 (alineados, NO hay split-brain hoy; el "24" eran 25) |
| `resolvable_direct_company` | **0** | el resolver direct company importaria 0 |
| `resolvable_via_deal_company` | **0** | el fallback deal→company importaria 0 |
| `company_not_mapped_to_greenhouse_organization` | **45** | tienen company/deal PERO esa company no existe como organization en GH |
| `no_company_or_deal_association` | 8 | sin ancla — quedan unresolved legitimas |
| `multiple_candidate_organizations` | 0 | sin conflictos |
| `direct≠deal conflict` | 0 | la Open Question de prioridad resolver es moot hoy |

**Implicación dura:** el gap 78→25 **NO es un problema de traversal de quotes** (deal→company fallback aporta 0). Es un problema de **cobertura de organizations**: 45 quotes pertenecen a HubSpot companies que no existen como organization en Greenhouse (verificado: 282 orgs, todas activas, 250 con `hubspot_company_id`, 0 inactivas). El resolver de Slices 2-3, tal como esta especificado, importaria **0 quotes adicionales hoy** — solo reclasificaria 53 como unresolved.

**Decisión pendiente del operador (premisa):** el verdadero lever es upstream — ¿esas 45 companies deben ser organizations en Greenhouse? Si sí, el camino canonico es promoverlas vía el companies sync existente (TASK-706 `upsertCanonicalOrganization`) y RECIÉN ahí las quotes se vuelven resolubles; el resolver global es necesario pero no suficiente. La spec se reescribe según esa decisión (ver checkpoint en Handoff 2026-06-22).

### Corrección 2026-06-22 (tras challenge ANAM del operador) — la task son 3 problemas, no 1

Trazando ANAM (cliente real, org existe) end-to-end: **sus 5 quotes YA están importadas** (en `finance.quotes` y en `commercial.quotations`, org-linked, source=hubspot). NO están en las 53 ausentes. El read API (`listFinanceQuotesFromCanonical`) lee de **`greenhouse_commercial.quotations`** filtrando `organization_id = ANY(tenant)` + `source_system`. Hallazgos que reencuadran la task:

- **(A) Display/status drift (NO estaba en scope, es probablemente el dolor real):** las 5 quotes ANAM tienen `status='draft'` en `commercial.quotations` aunque 3 son `issued` en HubSpot (`APPROVAL_NOT_NEEDED`). Y el "24 vs 25 expuesto" = **1 quote HubSpot reclasificada a `source_system='manual'`** en commercial.quotations (queda fuera del filtro `?source=hubspot`). O sea: quotes presentes que se muestran mal, no ausentes.
- **(B) Cobertura (premisa original, parcialmente válida):** 45 quotes cuelgan de HubSpot companies sin organization en GH (verificado). El resolver direct/deal importa 0 hasta onboardearlas.
- **(C) Sin asociación:** 8 quotes sin company/deal → unresolved legítimas.

El backfill/resolver global (Slices 2-5) ataca (B/C) pero **no toca (A)**, que es lo que el operador percibe como "ANAM no sale". La task debe re-apuntarse: decidir si (A) status/source drift entra a esta task o sale a una separada, y si (B) implica onboarding de companies. Pendiente decisión del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` (quotes = dominio `commercial`; Finance solo proyecta surface legacy)
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (patron canonico de intake HubSpot: single-webhook target + classifier dual-format + objectType singular + reliability subsystem `commercial`)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/context/00_INDEX.md` y, para contexto HubSpot/Bow-tie, `docs/context/11_hubspot-bowtie.md`

Reglas obligatorias:

- **Tabla canonica vs mirror legacy (decision dura).** La tabla canonica de quotes es `greenhouse_commercial.quotations` (commercial quotation arch v2.35: el outbound Greenhouse→HubSpot ancla ahi). `greenhouse_finance.quotes` es un **mirror legacy opt-in** (`persistFinanceMirror`) "solo para compatibilidad". Esta task NO debe profundizar el acoplamiento a finance en silencio: la reconciliacion debe ser **consciente de AMBAS tablas** y el landing target del inbound queda decidido explicitamente abajo (ver `Detailed Spec` + Open Questions), con follow-up de convergencia hacia `commercial.quotations`.
- **Dedup cross-table obligatorio (anti split-brain).** Una HubSpot quote nacida en el builder de Greenhouse vive en `commercial.quotations` con `hubspot_quote_id` y puede NO estar espejada en `finance.quotes` (mirror opt-in). Por eso una quote HubSpot es "missing" solo si esta **ausente de AMBAS** (`commercial.quotations.hubspot_quote_id` ∪ `finance.quotes`). Importar a finance una quote que ya existe como canonica en commercial = split-brain prohibido.
- No tratar HubSpot UI como source local: el source externo es HubSpot Quote API; Greenhouse persiste en el landing target decidido (default V1 `greenhouse_finance.quotes` legacy-compat) con `source_system='hubspot'` y `quote_id='QUO-HS-{hubspot_quote_id}'`.
- No crear organizations/clients por heuristica desde una quote. Si no hay company resoluble directa o via deal, la quote queda unresolved con razon.
- No insertar quotes manualmente en Postgres para reparar el incidente; el backfill debe usar el sync/command canonico e idempotente.
- Mantener el cron como safety net aunque se agregue webhook; webhook acelera, cron reconcilia.
- La app HubSpot Developer Platform tiene un solo componente webhooks; cualquier subscription nueva debe ir al target existente `hubspot-companies` y delegarse desde el handler.
- No exponer errores crudos de HubSpot, tokens, payloads sensibles ni secrets en logs.

## Normative Docs

- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-775-vercel-cron-async-critical-migration-platform.md`
- `docs/tasks/complete/TASK-1010-client-onboarding-rollout-completion-deferred-surfaces.md` (patron de delegacion HubSpot single-webhook target)
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` si se agrega flag de cutover/backfill

## Dependencies & Impact

### Depends on

- HubSpot bridge Cloud Run existente:
  - `services/hubspot_greenhouse_integration/app.py`
  - `services/hubspot_greenhouse_integration/hubspot_client.py`
- Greenhouse HubSpot service client:
  - `src/lib/integrations/hubspot-greenhouse-service.ts`
- Sync actual:
  - `src/lib/hubspot/sync-hubspot-quotes.ts`
  - `src/lib/cron-orchestrators/index.ts`
  - `src/app/api/cron/hubspot-quotes-sync/route.ts`
  - `services/ops-worker/server.ts`
- Webhook single-target existente:
  - `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/webhooks/webhooks-hsmeta.json`
  - `src/lib/webhooks/handlers/hubspot-companies.ts`

### Blocks / Impacts

- Completeness de `GET /api/finance/quotes?source=hubspot`.
- Pipeline visible de cotizaciones (`/finance/quotes`) y cualquier consumer de `greenhouse_finance.quotes`.
- Quote-to-Cash / Q2C follow-ups que dependen de tener cotizaciones HubSpot completas.
- Reliability de integraciones HubSpot y confianza operacional del modulo Cotizaciones.

### Files owned

- `services/hubspot_greenhouse_integration/app.py`
- `services/hubspot_greenhouse_integration/hubspot_client.py`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/hubspot/sync-hubspot-quotes.ts`
- `src/lib/cron-orchestrators/index.ts`
- `src/app/api/cron/hubspot-quotes-sync/route.ts`
- `services/ops-worker/server.ts`
- `src/lib/webhooks/handlers/hubspot-companies.ts`
- `src/lib/webhooks/handlers/hubspot-companies.test.ts`
- `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/webhooks/webhooks-hsmeta.json`
- `scripts/backfill-hubspot-quotes.ts`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `syncAllHubSpotQuotes()` consulta `greenhouse_core.organizations` con `hubspot_company_id` y llama `syncHubSpotQuotesForCompany()` por company.
- `syncHubSpotQuotesForCompany()` usa `getHubSpotGreenhouseCompanyQuotes(hubspotCompanyId)`.
- El bridge expone `GET /companies/<company_id>/quotes`.
- `HubSpotClient.list_company_quote_ids()` llama `/crm/v4/objects/companies/{company_id}/associations/quotes`.
- `ops-hubspot-quotes-sync` corre cada 6 horas desde Cloud Scheduler/ops-worker.
- `webhooks-hsmeta.json` contiene subscriptions para `company`, `contact`, `service` y `deal`, pero no para `quote`.
- `hubspot-companies.ts` clasifica `company|contact|service|deal|unknown`, pero no `quote`.

### Gap

- No existe reconciliacion global contra `/crm/v3/objects/quotes/search`.
- No existe endpoint bridge para leer/listar quotes globales o sincronizar por quote id.
- No existe fallback `quote -> deal -> company`.
- Quotes sin company directa pero con deal asociado quedan invisibles.
- Quotes sin ninguna asociacion quedan silently absent en Greenhouse en vez de quedar unresolved con razon.
- No hay webhook de quote para intake reactivo.
- No hay signal que compare total HubSpot visible vs total Greenhouse importado/resoluble.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync`
- Source of truth afectado: HubSpot Quote object API + `greenhouse_finance.quotes`
- Consumidores afectados: `GET /api/finance/quotes`, cron/ops-worker, Quote-to-Cash, finance/commercial readers, reliability
- Runtime target: `staging -> production -> external HubSpot`

### Contract surface

- Contrato existente a respetar: `HubSpotGreenhouseQuoteProfile`, `getHubSpotGreenhouseCompanyQuotes()`, `syncAllHubSpotQuotes()`, `greenhouse_finance.quotes`, `finance.quote.synced`.
- Contrato nuevo o modificado: bridge read por quote/global search, resolver de asociaciones quote/company/deal, unresolved intake/report, quote webhook delegation, reliability signal de completeness.
- Backward compatibility: `gated` o additive; `GET /companies/{id}/quotes` puede permanecer como compat mientras el global reconcile toma ownership.
- Full API parity: la reconciliacion vive en primitives server-side/worker (`src/lib/hubspot/**` + bridge), no en UI ni en queries ad hoc desde la pantalla.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.quotations` (canonica — leer para dedup), `greenhouse_finance.quotes` (mirror legacy — landing target V1), `greenhouse_core.organizations`, `greenhouse_core.spaces`, HubSpot quote/deal/company associations; posible tabla/log unresolved si no existe primitive reusable.
- Invariantes que no se pueden romper:
  - `hubspot_quote_id` sigue siendo idempotency key; `quote_id` sigue formato `QUO-HS-{hubspot_quote_id}`.
  - **Dedup cross-table (anti split-brain):** una quote HubSpot es "missing" SOLO si esta ausente de AMBAS `greenhouse_commercial.quotations.hubspot_quote_id` y `greenhouse_finance.quotes`. Si ya existe en `commercial.quotations` (nacida via builder Greenhouse + outbound), NO se re-importa a finance — se cuenta como ya presente. Esto corrige el baseline: el "24" cuenta solo finance; el universo real "ya en Greenhouse" es la UNION de ambas tablas keyed por `hubspot_quote_id`.
  - Una quote resoluble por company directa y por deal debe mapear a una sola organization canonica o fallar loud como conflicto (`multiple_candidate_organizations`, fail-closed — nunca preferir direct en silencio si direct.company != deal.company).
  - Una quote sin company/deal no se importa como cliente inventado; se registra unresolved con razon.
  - El status/amount/currency/date mapping existente debe conservar compatibilidad con los 24 registros ya importados.
  - El backfill no debe duplicar quotes (ni dentro de finance ni cross-table contra commercial) ni sobrescribir manual/Nubox sources.
- Tenant/space boundary: organization se deriva por `hubspot_company_id`; `client_id` legacy se resuelve desde active spaces cuando existe, sin convertir prospect automaticamente.
- Idempotency/concurrency: upsert por `hubspot_quote_id`/`quote_id`; webhook debe deduplicar por event id/inbox y encolar fuera del request path; backfill debe ser reentrante por batches.
- Audit/outbox/history: preservar/publicar `finance.quote.synced`; agregar signal/log de unresolved/completeness y, si hay state durable nuevo, append-only audit o source sync run.

### Migration, backfill and rollout

- Migration posture: `additive|backfill` si se crea estado durable para unresolved/completeness; `none` si se usa `source_sync_runs`/logs existentes.
- Default state: preferir `flag OFF` para global reconciliation/backfill apply hasta staging evidence; cron company-scope actual queda como fallback hasta cutover.
- Backfill plan: dry-run compara HubSpot total vs Greenhouse imported; clasifica cada missing quote en `resolvable_direct_company`, `resolvable_via_deal_company`, `unresolved_no_association`, `conflict_multiple_companies`, `error`; apply solo para resolvibles.
- Rollback path: apagar flag global reconciliation, conservar cron anterior por company, revert PR; backfill es idempotente y compensable por re-sync de HubSpot source.
- External coordination: HubSpot Developer Platform subscription upload (`hs project upload --account=48713323`) para quote events; verificar exact object type id de quotes (`0-14` observado en URLs HubSpot, confirmar antes de upload).

### Security and access

- Auth/access gate: cron bearer/ops-worker service boundary existente; webhook HubSpot v3 signature; bridge integration token/HubSpot private app token.
- Sensitive data posture: comercial/finance data; no secrets en logs; payloads de HubSpot redacted cuando se capturen errores.
- Error contract: `captureWithDomain(err, 'commercial', ...)` para el path resolver/intake (quotes = dominio commercial, alineado al delta TASK-836 que estandarizo `'commercial'` para intake HubSpot); reservar `'integrations.hubspot'` solo para errores puros de transporte del bridge. NUNCA `Sentry.captureException` directo. No raw upstream dumps al cliente; redactar payloads HubSpot al capturar.
- Abuse/rate-limit posture: HubSpot paging/batch limits, retry/backoff para 429, no fetch global por request UI; webhook solo encola.

### Runtime evidence

- Local checks:
  - tests del resolver de asociaciones quote/direct company/deal company/unresolved/conflict.
  - tests del webhook classifier/delegation para quote.
  - tests del sync idempotente para quote existente y quote nueva.
- DB/runtime checks:
  - dry-run staging: total HubSpot visible, total Greenhouse imported, buckets de missing.
  - apply staging para missing resolvibles, verify `GET /api/finance/quotes?source=hubspot` sube de 24 al numero resoluble esperado.
  - verify no duplicados por `hubspot_quote_id`.
- Integration checks:
  - HubSpot API search smoke con token real sin imprimirlo.
  - bridge smoke para quote id individual y global search/page.
  - webhook delivery test o evento real controlado tras subscription.
- Reliability signals/logs (subsystem canonico `commercial` — rollup Commercial Health, mismo patron que `commercial.service_engagement.*` de TASK-813/836; NO usar namespace `integrations.hubspot.*`):
  - `commercial.quote_intake.completeness_gap` (kind=drift) — diferencia entre quotes HubSpot resolubles y quotes presentes en Greenhouse (UNION commercial ∪ finance). Steady = 0.
  - `commercial.quote_intake.unresolved` (kind=data_quality) — count de unresolved quotes por razon. Steady = 0.
  - Cloud Logging ops-worker sin loops/retry storm.
- Production verification sequence: ver Rollout Plan abajo.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to HubSpot/finance risk.
- [ ] Runtime or DB evidence is listed for global reconciliation, webhook and backfill.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — no new user-facing business capability. This task fixes the server-side sync primitive that existing UI/API consumers already depend on.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Execution re-aim 2026-06-22 (decidido con arch-architect + commercial-expert, post Slice 1 + challenge ANAM)

El Slice 1 (dry-run + trace ANAM) reencuadró la task en 3 problemas. Orden de ejecución re-apuntado (supersede el orden original de abajo, que queda como referencia para B/C):

- **Slice A — Status/source drift fix (PRIMERO, máximo valor, root-caused):** el `CASE` de `syncCanonicalFinanceQuote` ([quotation-canonical-store.ts:1047-1055](src/lib/finance/quotation-canonical-store.ts)) solo conoce el vocab del builder legacy (`accepted/sent/draft/rejected/expired/converted`) y cae a `ELSE 'draft'` para los status canónicos que escribe el inbound HubSpot (`issued/pending_approval/approval_rejected/expired`). Resultado: **17/24 quotes HubSpot issued se muestran como `draft`** (`status='draft'` + `legacy_status='issued'`; el read API hace `status || legacy_status` → gana draft). Fix en la FUENTE (passthrough de status canónicos en el CASE) + backfill idempotente de las 17 filas + investigar la 1 quote `source=manual` (explica el 24 vs 25). NO parchar el normalizer de lectura. Skill: `greenhouse-finance-accounting-operator`.
- **Slices B (re-scoped de los Slices 2-5 originales) — cobertura vía lead orgs:** las 45 HubSpot companies sin organization se promueven a **organizations tipo `lead`** (decisión operador 2026-06-22: probablemente NO clientes) vía el writer canónico `upsertCanonicalOrganization` + `deriveOrganizationType` (invariante TASK-991), luego el resolver global importa sus quotes. Bridge de lectura global = helper directo sancionado (no hay endpoint global en el bridge). NO se crean clients ni privilegios.
- **Slice C — unresolved (8 sin asociación):** unresolved + signal `commercial.quote_intake.*`, recomendar data hygiene HubSpot. No inventar org.

Los Slices 1-6 originales abajo siguen vigentes como spec de B/C; el resolver direct/deal sigue siendo necesario (post-onboarding de leads) pero no suficiente por sí solo.

### Slice 1 — Discovery packet + dry-run classifier

- Crear/actualizar un script dry-run read-only que lea HubSpot quotes globales paginadas y compare contra la **UNION** de `greenhouse_commercial.quotations.hubspot_quote_id` y `greenhouse_finance.quotes` (dedup cross-table anti split-brain — ver invariantes).
- Clasificar missing quotes por ruta de resolucion: company directa, deal->company, sin asociaciones, conflicto multiple, error upstream. Reportar tambien cuantas "missing en finance" ya existen en `commercial.quotations` (no son missing reales).
- Probar el dry-run contra staging/dev sin escribir datos y guardar output resumido en la task/handoff.
- **Confirmar cual repo/proyecto es dueño de la app HubSpot Developer Platform VIVA antes de editar `webhooks-hsmeta.json`.** Hay drift documentado: el invariante TASK-574 dice que el sibling `cesargrowth11/hubspot-bigquery` conserva la app (`hsproject.json`), mientras la spec services §10.1 la ubica en `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/`. Editar el `webhooks-hsmeta.json` equivocado NO activa la subscription. Verificar `hsproject.json` activo + el account flag real de deploy (`hs project upload --account=<verificar: kortex-dev alias vs 48713323>`).
- **Resolver el objectType de la subscription:** por el patron probado de services (TASK-813 §10.2, HubSpot rechaza el objectTypeId numerico `0-162` y exige el nombre singular `objectType: "service"`), la subscription de quotes debe declarar `objectType: "quote"`, NO `0-14`. El `0-14` es solo el discriminador `objectTypeId` del classifier dual-format, no la declaracion de subscription. Confirmar contra HubSpot antes de upload.

### Slice 2 — Quote read/global search contract (bridge vs direct helper sancionado)

- **Decidir el boundary de lectura primero.** Existe precedente sancionado de helper DIRECTO a la HubSpot API que bypassa el bridge Cloud Run: `src/lib/hubspot/list-services-for-company.ts` (`fetchServicesForCompany`/`batchReadServices`) — se creó porque el bridge tenía un bug con custom objects. El diagnostico read-only del 2026-06-22 ya pegó a `/crm/v3/objects/quotes/search` (confirmar si fue via bridge o directo). Si el bridge no resuelve global quote search/associations de forma robusta, el camino canonico es un helper directo analogo (`src/lib/hubspot/list-quotes.ts` o similar), NO forzar un endpoint nuevo en el bridge.
- Agregar metodos para buscar/listar quotes globalmente (paginado) y leer quote por id con associations directas (`quote->company`) y via deal (`quote->deal->company`) suficientes para resolver organization.
- Si se elige bridge: exponer endpoint(s) internos en `hubspot-greenhouse-integration` (global search, quote by id, associations) y mantener `GET /companies/{company_id}/quotes` compatible. Si se elige helper directo: documentar el bypass del bridge como en services.
- Tests para paging, properties, associations y errores 429/4xx sanitizados.

### Slice 3 — Greenhouse sync resolver + idempotent upsert

- Extender `src/lib/integrations/hubspot-greenhouse-service.ts` con los nuevos contratos bridge.
- Refactorizar `src/lib/hubspot/sync-hubspot-quotes.ts` para soportar global reconciliation sin perder el path por company.
- **Dedup cross-table ANTES de upsert:** si la quote ya existe en `greenhouse_commercial.quotations` por `hubspot_quote_id`, NO re-importar a finance (es canonica commercial; contar como presente). Solo continuar al resolver/upsert finance si esta ausente de AMBAS tablas.
- Implementar resolver de organization:
  - `quote -> company` directo gana si existe y mapea a una organization activa.
  - fallback `quote -> deal -> company`.
  - **conflicto (direct.company != deal.company, o multiples companies candidatas): fail-closed** → skip + unresolved `multiple_candidate_organizations`. NUNCA preferir direct en silencio cuando hay conflicto. (Nota: en el modelo HubSpot un quote es hijo de un deal; documentar en Discovery si la prioridad correcta es deal-first vs direct-first — el deal suele ser el ancla de comprador mas autoritativo.)
  - sin asociacion: skip + unresolved/no_association reason.
- Preservar `quote_id='QUO-HS-{hubspotQuoteId}'`, `hubspot_quote_id`, `hubspot_deal_id`, line items sync y outbox existente.

### Slice 4 — Webhook quote coverage

- Agregar subscriptions de quote en `webhooks-hsmeta.json` usando `objectType: "quote"` (nombre singular, NO `0-14` — ver Slice 1) para creation y property changes relevantes (status/amount/expiration/last modified; confirmar properties antes de upload).
- Extender el classifier dual-format `classifyHubSpotEvent` en `hubspot-companies.ts` para retornar `'quote'` cubriendo AMBOS formatos: legacy (`quote.creation`/`quote.propertyChange`) y Developer Platform 2025.2 (`object.creation` con `objectTypeId='0-14'` o `objectType='quote'`). NUNCA branch por `subscriptionType.startsWith('quote.')` solo. Delegar a un handler async que encole sync por quote id.
- No hacer fetch pesado en el request path; usar outbox/consumer o ruta async equivalente.
- Tests de signature + classifier + delegation + unknown quote payload.
- Subir HubSpot project solo tras staging code ready; documentar Build ID/deploy.

### Slice 5 — Backfill + rollout

- Ejecutar dry-run staging y registrar conteos por bucket.
- Aplicar backfill staging solo a resolvibles; verificar API de Greenhouse, DB, no duplicados y logs.
- Promover a production con flag/cutover controlado.
- Ejecutar dry-run production, apply production allowlist/batches, verificar total importado/resoluble y unresolved reasons.
- Dejar signal de completeness en steady y documentar si quedan quotes no resolubles por falta de asociacion en HubSpot.

### Slice 6 — Documentation closure

- Actualizar docs tecnicos/funcionales que hoy describen el modelo solo por company:
  - `docs/documentation/finance/cotizaciones-multi-source.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Actualizar `project_context.md`, `Handoff.md` y `changelog.md`.
- Cerrar task solo con evidencia runtime o dejar `code complete, rollout pendiente`.

## Out of Scope

- Redisenar `/finance/quotes` o cambiar layout/copy visible.
- Crear clientes/organizations automaticamente para quotes sin company/deal resoluble.
- Corregir manualmente datos en HubSpot salvo documentar unresolved y recomendar asociacion.
- Cambiar pricing, taxes, Q2C close, CLF/MXN derivation o estados comerciales fuera del sync de HubSpot quotes.
- Reemplazar el inbound/outbound quote builder de Greenhouse hacia HubSpot.

## Detailed Spec

El flujo objetivo es:

```text
HubSpot quotes search / quote webhook
  -> hubspot-greenhouse-integration quote read contract
    -> Greenhouse quote resolver
      -> direct quote.company or fallback quote.deal.company
        -> organization/client resolution
          -> idempotent upsert greenhouse_finance.quotes
          -> line item sync
          -> finance.quote.synced + reliability signals
```

**Decision de landing target (canonica para esta task).** La tabla canonica de quotes es `greenhouse_commercial.quotations`; `greenhouse_finance.quotes` es mirror legacy opt-in. V1 de esta task aterriza el inbound HubSpot-origin en `greenhouse_finance.quotes` (legacy-compat) por **minimo blast radius**: matchea los 24 existentes + el consumer `GET /api/finance/quotes?source=hubspot` vigente, y es reversible. PERO con dos condiciones duras: (1) dedup cross-table contra `commercial.quotations` (anti split-brain), y (2) follow-up explicito para converger el inbound hacia `commercial.quotations` (mirror finance derivado). Esta decision se documenta como legacy-compat consciente, NO como acoplamiento silencioso a Finance. Si Discovery revela que la mayoria de las "missing" ya viven en `commercial.quotations`, reconsiderar y escalar la convergencia commercial a esta misma task.

**Reactive drain domain.** El outbox event de intake usa namespace `commercial.*` (mismo patron que `commercial.service_engagement.intake_requested` de TASK-813b). Confirmar en Discovery cual Cloud Scheduler job lo drena (services intake hoy lo drena `ops-reactive-finance` con `domain='finance'` por deuda legacy TASK-807); nombrarlo explicito y no introducir un cron nuevo si converge en un drain existente.

El estado unresolved debe distinguir al menos:

- `no_company_or_deal_association`
- `deal_without_company`
- `company_not_mapped_to_greenhouse_organization`
- `multiple_candidate_organizations`
- `hubspot_api_error`

Si ya existe un mecanismo reusable de `source_sync_runs`/failures para este dominio, reusarlo antes de crear tabla nueva.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe correr antes de disenar apply/backfill: no aplicar sin conocer buckets reales.
- Slice 2 debe shipear antes de Slice 3: el contrato de lectura (bridge endpoint O helper directo sancionado, ver Slice 2) debe estar definido antes de que el resolver consuma HubSpot. No inventar un tercer camino de lectura ad-hoc acoplado a la pantalla.
- Slice 3 debe estar en staging y pasando dry-run antes de Slice 4 upload de webhooks.
- Slice 4 debe encolar async; nunca fetch pesado en el request path HubSpot.
- Slice 5 production apply requiere dry-run production + conteo esperado + rollback documentado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar quotes / split-brain commercial↔finance | finance/commercial | medium | upsert por `hubspot_quote_id` + dedup cross-table contra `commercial.quotations` antes de upsert finance + dry-run duplicate report | duplicate `hubspot_quote_id` count (incl. cross-table) |
| Mapear quote al cliente equivocado via deal/company multiple | commercial/data-quality | medium | resolver conflictivo fail-closed + unresolved reason | unresolved `multiple_candidate_organizations` |
| Rate limit HubSpot por global search/backfill | integrations.hubspot | medium | paging/batching/backoff + no request-path global fetch | 429 logs / retry-after |
| Webhook timeout o retry storm | webhooks/ops | medium | handler async enqueue-only + signature/dedup existing inbox | webhook delivery retries |
| Importar quote sin contexto suficiente | finance/commercial | medium | no-association skip + unresolved report, no organization inventada | unresolved `no_company_or_deal_association` |
| Romper cron company-scope anterior durante cutover | ops-worker | low | compat path + flag/cutover + staging smoke | `hubspot-quotes-sync` errors |

### Feature flags / cutover

- Preferir flag/env `HUBSPOT_QUOTES_GLOBAL_RECONCILIATION_ENABLED=false` o config equivalente para activar global reconciliation por environment.
- Backfill apply debe tener confirmacion explicita (`--apply`, allowlist/batch size, expected counts) y no correr por defecto.
- Revert: flag false + redeploy worker; cron company-scope anterior queda como fallback hasta cierre.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert script/docs, sin runtime impact | <10 min | si |
| Slice 2 | revert bridge endpoints/client methods; mantener `/companies/{id}/quotes` | <30 min | si |
| Slice 3 | flag global off + revert PR; company-scope cron sigue vivo | <30 min | si |
| Slice 4 | desactivar quote subscriptions en HubSpot + revert classifier/delegation | <30 min | si |
| Slice 5 | detener apply; re-sync idempotente; corregir mappings/conflicts antes de reintento | variable | parcial |

### Production verification sequence

1. Dry-run local/staging: confirmar HubSpot total, Greenhouse imported, buckets y conteos esperados.
2. Deploy bridge + Greenhouse code a staging con global flag OFF; cron anterior debe seguir funcionando.
3. Activar global flag en staging; ejecutar reconcile dry-run y apply controlado.
4. Verificar `GET /api/finance/quotes?source=hubspot` y DB: total importado = resolvibles esperadas, sin duplicados.
5. Agregar/upload quote webhook en HubSpot; disparar evento controlado o crear quote test asociada a deal/company de prueba.
6. Monitorear logs/signals staging; luego repetir production con dry-run antes de apply.
7. Dejar en Handoff conteo final: HubSpot total, Greenhouse imported, unresolved por razon.

### Out-of-band coordination required

- HubSpot Developer Platform upload para subscription quote.
- Posible asociacion manual en HubSpot para quotes que queden `no_company_or_deal_association`.
- Ventana de backfill production para evitar confusion mientras el equipo comercial esta cotizando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Dry-run global reporta HubSpot total, Greenhouse imported, missing y buckets de resolucion sin escribir datos.
- [ ] Greenhouse importa quotes resolubles por company directa y por fallback deal->company.
- [ ] Quotes sin ancla suficiente quedan unresolved con razon auditable, no silently skipped.
- [ ] Backfill apply es idempotente y no duplica `hubspot_quote_id`.
- [ ] Webhook de quote queda configurado y delegado async desde el target unico `hubspot-companies`.
- [ ] Cron/reconciliation deja de repetir `0 created, 24 updated` cuando existen resolvibles faltantes.
- [ ] `GET /api/finance/quotes?source=hubspot` refleja el total resoluble esperado en staging y production.
- [ ] Reliability signal/log muestra completeness gap y unresolved reasons en steady.

## Verification

- `pnpm test src/lib/hubspot`
- `pnpm test src/lib/webhooks/handlers/hubspot-companies.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm task:lint --task TASK-1222`
- `pnpm ops:lint --changed`
- Bridge tests para `services/hubspot_greenhouse_integration` segun el runner vigente del servicio.
- Dry-run/apply staging con HubSpot real sin imprimir token.
- Production smoke post-backfill: API + DB duplicate check + Cloud Logging.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado con conteos finales y unresolved reasons.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento de sync/webhook.
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-1206/Q2C, TASK-1213 quotes UI y docs multi-source.
- [ ] `docs/documentation/finance/cotizaciones-multi-source.md` ya no describe HubSpot quotes como solo company-scope.
- [ ] HubSpot Developer Platform Build ID/documentacion de subscription quote quedo registrado.

## Follow-ups

- UI/ops panel para unresolved HubSpot quotes si el conteo queda material y requiere gestion comercial.
- Data hygiene en HubSpot para quotes sin company/deal association.
- **Convergencia inbound hacia la tabla canonica `greenhouse_commercial.quotations`** (con mirror finance derivado), retirando `greenhouse_finance.quotes` como landing target del inbound. Esta task usa finance como landing legacy-compat por blast radius; el target state (boundary doc + commercial quotation arch v2.35) es que el inbound aterrice en commercial igual que ya lo hace el outbound. NOTA: corrige la direccion — commercial es canonico, finance es el mirror, no al reves.

## Open Questions

- Subscription objectType de HubSpot Quotes: por el precedente de services (HubSpot rechaza objectTypeId numerico, exige nombre singular) el default es `objectType: "quote"`, NO `0-14`. Confirmar contra HubSpot antes de upload (`0-14` es solo el `objectTypeId` del discriminador dual-format).
- Cual repo/proyecto es dueño de la app HubSpot Developer Platform VIVA (drift TASK-574 sibling vs monorepo) + account flag real de `hs project upload`. Bloquea Slice 4. Resolver en Slice 1.
- Landing target del inbound: V1 = `greenhouse_finance.quotes` legacy-compat con dedup cross-table + follow-up de convergencia a `commercial.quotations`. Reconsiderar (escalar convergencia a esta task) si Discovery muestra que la mayoria de las missing ya viven en `commercial.quotations`.
- Decidir si unresolved vive en `source_sync_runs`/logs existentes o requiere tabla durable nueva.
- Definir si global reconciliation reemplaza por completo el loop company-scope o convive como safety net por una ventana de rollout.
- Prioridad del resolver: deal-first vs direct-company-first (en HubSpot el quote es hijo del deal; el deal suele ser el ancla de comprador mas autoritativo). Resolver en Discovery con muestra real.
