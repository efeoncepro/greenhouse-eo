# GREENHOUSE — Artifact Render Pipeline (V1)

> **Tipo:** Architecture spec (contrato técnico canónico del runtime de render)
> **Versión:** 1.0 · **Status:** **Implemented (staging)** — producción explícitamente gateada (§9)
> **Creado:** 2026-07-12 por Claude (skill `arch-architect`) con Julio Reyes
> **Owner:** Commercial (dominio) + Ops/Platform (deployable)
> **Epic:** `EPIC-027` (frontera `artifact-worker` autorizada por excepción documentada)
> **Task fuente:** `TASK-1391` (complete) · depende de `TASK-1392` (aggregate `Proposal`) y `TASK-1393` (Artifact Composer)
> **Incidente fundacional:** `ISSUE-121` (los 5 bugs del primer deploy real)
>
> **Qué es este doc:** el contrato del **pipeline que lleva un `ResolvedCompositionManifest` a un
> artefacto publicado** (PDF + previews PNG en el asset store), gobernado, idempotente y auditable.
> El **motor** de composición vive en `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` +
> `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (el catálogo `deck-axis`); el **aggregate** que lo pide,
> en `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`. Este doc es **el medio**: cola, job
> record, worker, gates, deploy, observabilidad.

---

## §0 — Estado real (verificado contra el repo y contra Cloud Run, 2026-07-12)

| Pieza | Estado | Dónde |
| --- | --- | --- |
| Tablas `proposal_render_jobs` + `proposal_render_job_events` (+ triggers, capability) | ✅ **Aplicado a dev** | `migrations/20260712180933098_task-1391-proposal-render-jobs.sql` |
| Command/reader/transiciones del job (fail-closed al encolar) | ✅ Shipped | `src/lib/commercial/tenders/proposals/render-jobs.ts` |
| Proyección allowlisted + gate de audience | ✅ Shipped | `…/proposals/render-projection.ts` |
| Constraints derivadas del requisito-set | ✅ Shipped | `…/proposals/render-constraints.ts` |
| Dispatcher (prioridad deadline + aging) | ✅ Shipped | `…/proposals/render-dispatch.ts` + `services/ops-worker/server.ts` (`POST /artifact-render/dispatch`) |
| Render Agent (propose → confirm → execute) | ✅ Shipped | `…/proposals/render-agent.ts` |
| API parity (3 rutas) | ✅ Shipped | `/api/commercial/proposals/[proposalId]/render-jobs{,/[renderJobId]{,/retry}}` |
| Cloud Run **Job** `artifact-worker` (primer Job del ecosistema) | ✅ Desplegado (staging) | `services/artifact-worker/**` · `.github/workflows/artifact-worker-deploy.yml` |
| Quality gates mecánicos (missing_asset · font_fallback · blank_slide) | ✅ Shipped | `src/lib/artifact-composer/quality-gates.ts` (invocados en `renderSlide`) |
| 4 reliability signals `commercial` | ✅ Shipped | `src/lib/reliability/queries/commercial-proposal-signals.ts` |
| Flag `ARTIFACT_RENDER_JOBS_ENABLED` | ✅ **ON en staging** (3 runtimes) · **OFF en Vercel production** | `services/{artifact-worker,ops-worker}/deploy.sh` (SoT) · `FEATURE_FLAG_STATE_LEDGER.md` |
| UI / Nexa / MCP surface | ❌ No existe (F5) | — |
| Deploy productivo del worker | ❌ **Gateado** — requiere release control plane + sign-off (§9) | — |

### Evidencia de staging (renders reales en Cloud Run, 2026-07-12)

| Job | Propósito | Resultado |
| --- | --- | --- |
| `prnd-518535f0…` | deck SKY real (15 láminas) | `completed` · **25,2 s** · **3.158.296 bytes** (3,16 MB) · `attempts=1` · asset `asset-988fbb9a…` en el bucket privado `…-private-assets-staging` · vínculo `proposal_assets` · outbox `commercial.proposal.render_completed` published |
| `prnd-7ebe35b1…` | `deck-25-staging-bench` (25 láminas) | `completed` · **32,3 s** · **5,56 MB** · 25 previews · `attempts=1` |

Camino ejercitado de punta a punta: `requestProposalRender` (Vercel staging) → `proposal_render_jobs
(queued)` → Cloud Scheduler `ops-artifact-render-dispatch` → dispatcher en `ops-worker` → `jobs.run`
→ `artifact-worker` claim (`FOR UPDATE SKIP LOCKED`) → drift check del manifest → `composeArtifact`
+ gates → asset store privado → `completed` + outbox. El retry gobernado del dominio se ejercitó con
fallos reales (no inyectados): `attempts` reales, `dead_letter` por drift, requeues.

**Envelope confirmado:** 2 vCPU / 2 GiB / `task-timeout=900 s` sobran con holgura (~29× de margen de
tiempo sobre el peor caso medido de 32,3 s). Baseline local previo (Slice 0): 15 láminas 4,4 s / 25
láminas 6,2 s / RSS node ~260 MB — Cloud Run es ~5× más lento por cold start + streaming de capas.

---

## §1 — Modelo de datos

Schema: `greenhouse_commercial`. Migración: `20260712180933098_task-1391-proposal-render-jobs.sql`.

### 1.1 `proposal_render_jobs` (columnas verbatim del schema real)

| Columna | Tipo | Constraint / default |
| --- | --- | --- |
| `render_job_id` | `text` | **PK**, `DEFAULT ('prnd-' \|\| gen_random_uuid()::text)` |
| `owner_org_id` | `text` | `NOT NULL` |
| `proposal_id` | `text` | `NOT NULL`, FK → `greenhouse_commercial.proposals (proposal_id)` |
| `artifact_purpose` | `text` | `NOT NULL`, `CHECK (char_length(artifact_purpose) >= 3)` |
| `audience` | `text` | `NOT NULL`, `CHECK (audience IN ('internal','client_facing'))` |
| `catalog_name` | `text` | `NOT NULL` |
| `output_target` | `text` | `NOT NULL` |
| `manifest` | `jsonb` | `NOT NULL` — el `ResolvedCompositionManifest` **completo**, verbatim |
| `manifest_hash` | `text` | `NOT NULL`, `CHECK (manifest_hash ~ '^[0-9a-f]{64}$')` |
| `evidence_refs` | `jsonb` | `NOT NULL DEFAULT '[]'` — `[{evidenceId, audience}]` con el audience **resuelto** al encolar |
| `constraints` | `jsonb` | `NOT NULL DEFAULT '{}'` — snapshot del requisito-set (§2.4) |
| `deadline` | `timestamptz` | nullable — **fijado** al encolar (no se re-lee) |
| `state` | `text` | `NOT NULL DEFAULT 'queued'`, `CHECK (state IN ('queued','dispatched','running','completed','failed','dead_letter'))` |
| `failure_code` | `text` | `CHECK (failure_code IS NULL OR failure_code IN (…12 códigos, §3))` |
| `failure_detail` | `text` | nullable (el command lo trunca a 2000 chars) |
| `attempts` | `integer` | `NOT NULL DEFAULT 0`, `CHECK (attempts >= 0)` |
| `max_attempts` | `integer` | `NOT NULL DEFAULT 3`, `CHECK (max_attempts BETWEEN 1 AND 10)` |
| `dispatched_at` · `started_at` · `finished_at` | `timestamptz` | nullable |
| `execution_name` | `text` | nullable — nombre de la ejecución Cloud Run (auditoría cruzada con GCP) |
| `output_pdf_asset_id` | `text` | nullable |
| `output_preview_asset_ids` | `jsonb` | `NOT NULL DEFAULT '[]'` |
| `output_report` | `jsonb` | nullable — `{durationMs, pdfBytes, slides, warnings, manifestHash}` |
| `requested_by_kind` | `text` | `NOT NULL`, `CHECK (requested_by_kind IN ('member','system','cli'))` — **no existe `agent`** |
| `requested_by_member_id` | `text` | nullable |
| `created_at` · `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

**CHECK constraints de tabla:**

- `proposal_render_jobs_client_facing_requires_member` — `audience <> 'client_facing' OR (requested_by_kind = 'member' AND requested_by_member_id IS NOT NULL)`. El gate humano del artefacto hacia el comprador lo exige **también la DB**, no solo el TS.
- `proposal_render_jobs_completed_has_output` — `state <> 'completed' OR output_pdf_asset_id IS NOT NULL OR output_target <> 'pdf-merged'`. Un `pdf-merged` completado sin asset final es imposible.
- `proposal_render_jobs_failed_has_code` — `state NOT IN ('failed','dead_letter') OR failure_code IS NOT NULL`.

**Índices:**

- `proposal_render_jobs_idempotency_uq` — **UNIQUE** `(owner_org_id, proposal_id, manifest_hash, artifact_purpose)` ← la clave de idempotencia canónica.
- `proposal_render_jobs_dispatch_idx` — `(state, deadline NULLS LAST, created_at) WHERE state = 'queued'` (índice parcial de la cola).
- `proposal_render_jobs_proposal_idx` — `(owner_org_id, proposal_id)`.

**Triggers:**

- `proposal_render_jobs_immutable_trg` (`BEFORE UPDATE`) → `proposal_render_jobs_immutable_guard()`: **RAISE EXCEPTION** si muta cualquiera de `owner_org_id`, `proposal_id`, `artifact_purpose`, `audience`, `catalog_name`, `output_target`, `manifest`, `manifest_hash`, `evidence_refs`, `constraints`, `deadline`, `requested_by_kind`, `requested_by_member_id`, `created_at`. Además setea `updated_at := now()`.
- `proposal_render_jobs_no_delete_trg` (`BEFORE DELETE`) → **DELETE prohibido** (los jobs son evidencia).

**Grants:** `SELECT, INSERT, UPDATE` a `greenhouse_runtime` (no `DELETE` — least privilege).

### 1.2 `proposal_render_job_events` (historial append-only)

| Columna | Tipo | Constraint |
| --- | --- | --- |
| `event_id` | `text` | **PK**, `DEFAULT ('prje-' \|\| gen_random_uuid()::text)` |
| `render_job_id` | `text` | `NOT NULL`, FK → `proposal_render_jobs` |
| `owner_org_id` | `text` | `NOT NULL` |
| `from_state` | `text` | nullable (NULL en el alta) |
| `to_state` | `text` | `NOT NULL` |
| `detail` | `jsonb` | `NOT NULL DEFAULT '{}'` |
| `actor_kind` | `text` | `NOT NULL`, `CHECK (actor_kind IN ('member','system','cli','worker','dispatcher'))` |
| `actor_member_id` | `text` | nullable |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Índice: `proposal_render_job_events_job_idx (render_job_id, created_at DESC)`.
Triggers: **no DELETE** y **no UPDATE** (`proposal_render_job_events_immutable_trg` lanza excepción en cualquier UPDATE).
Grants: `SELECT, INSERT` a `greenhouse_runtime`.

### 1.3 Capability

La migración siembra en `greenhouse_core.capabilities_registry`:
`commercial.proposal.render` · module `commercial` · actions `['read','execute']` · scopes `['organization','tenant']`.
Grant en TS: `src/lib/entitlements/runtime.ts` → roles `EFEONCE_ADMIN` y `EFEONCE_ACCOUNT` (ambas acciones, scope `tenant`).
Puerta comercial: el módulo per-ORG `proposal_studio_v1` (`module_assignments`) — un rol no basta (`ProposalEntitlementError`).

### 1.4 State machine del job

```
                    requestProposalRender  (gates fail-closed §3)
                              │
                              ▼
                        ┌───────────┐
                 ┌──────│  queued   │◀──────── retryProposalRenderJob
                 │      └─────┬─────┘          (solo failed | dead_letter,
                 │            │                 y solo si failure_code es reintentable)
   claim atómico │            │ markRenderJobDispatched
   (SKIP LOCKED, │            │ (dispatcher; attempts+1; execution_name)
    worker)      │            ▼
                 │      ┌────────────┐
                 │      │ dispatched │
                 │      └─────┬──────┘
                 │            │ markRenderJobRunning (worker)
                 ▼            ▼
                 ┌────────────────┐
                 │    running     │
                 └───┬────────┬───┘
   markRenderJob     │        │   markRenderJobFailed(code)
   Completed         │        │
                     ▼        ▼
             ┌───────────┐   ┌──────────┐        ┌─────────────┐
             │ completed │   │  failed  │───────▶│ dead_letter │
             └───────────┘   └──────────┘        └─────────────┘
                   (terminal)   reintentable      terminal para el
                                                  worker: exige humano
                                                  (retry del dominio)
```

Reglas de la máquina (implementadas en `transitionJob`, `render-jobs.ts`):

- Toda transición es una **transacción** con `SELECT … FOR UPDATE` sobre el job, valida `expectFromStates` (si no coincide → `ProposalRenderStateError`) e **inserta un evento** en `proposal_render_job_events`.
- `markRenderJobRunning` acepta `queued` **o** `dispatched` (una ejecución manual/smoke corre sin dispatcher; en ese caso incrementa `attempts` porque el dispatcher no lo hizo).
- `markRenderJobFailed` decide el destino: `dead_letter` si `attempts >= max_attempts` **o** si el `failure_code` es **no reintentable**; si no, `failed`.
- `completed` / `failed` / `dead_letter` publican outbox (§5).
- El **claim** del worker (`claimNextRenderJobForExecution`) transiciona `queued → running` directo (sin `dispatched`), con `attempts+1` y evento `{claim:'skip_locked'}`. Por eso `dispatched` es un estado **opcional** del camino.

### 1.5 Idempotencia canónica

**`(owner_org_id, proposal_id, manifest_hash, artifact_purpose)`** — UNIQUE en DB, y verificada en el
command **antes** del INSERT (devuelve el job existente con `idempotent: true`, sin escribir nada).

El `manifest_hash` es `sha256(canonicalJson(manifest))`, donde `canonicalJson` **ordena claves en
profundidad** y preserva el orden de los arrays. Razón dura: el manifest viaja por JSONB y PostgreSQL
**reordena las claves de los objetos** — un hash sensible al orden haría que el mismo manifest nunca
coincidiera tras el round-trip a DB, y el drift check del worker mentiría (bug real, cerrado en
`dae981c32`). El orden de las láminas SÍ es contenido, por eso los arrays no se ordenan.

El manifest **ya contiene** los hashes de catálogo/registry/contrato/template/brand pack/fuentes:
repetirlos en la clave duplicaría la verdad. La clave son 4 campos, no más.

---

## §2 — Contratos de código (firmas exactas)

### 2.1 `src/lib/commercial/tenders/proposals/render-jobs.ts` (`import 'server-only'`)

```ts
isArtifactRenderJobsEnabled(): boolean            // process.env.ARTIFACT_RENDER_JOBS_ENABLED === 'true'
hashResolvedManifest(manifest: unknown): string   // sha256 de la serialización canónica

type RenderJobState = 'queued'|'dispatched'|'running'|'completed'|'failed'|'dead_letter'
type RenderJobFailureCode =
  | 'audience_violation' | 'accessibility_unsupported' | 'semantic_rejected'
  | 'size_rejected' | 'geometry_rejected' | 'font_fallback_detected'
  | 'missing_asset' | 'blank_slide' | 'manifest_drift' | 'render_error'
  | 'timeout' | 'dispatch_error'

requestProposalRender(input: {
  ownerOrgId: string; proposalId: string; artifactPurpose: string
  audience: ProposalAudience                       // 'internal' | 'client_facing'
  manifest: {                                      // ResolvedCompositionManifest verbatim
    manifestVersion: number; artifactId: string
    catalog: { name: string; version: string; registryHash: string; ownerOrgId: string }
    slides: Array<Record<string, unknown>>
    brandPack: { name: string; hash: string } | null
    fonts: Array<{ family: string; variant: string; checksum: string }> | null
    validators: Array<{ name: string; version: string; result: string; violations: string[] }>
    [key: string]: unknown
  }
  outputTarget: string
  evidenceIds?: readonly string[]
  actor: ProposalActor
}): Promise<{ job: ProposalRenderJobRecord; idempotent: boolean }>
// Errores: ProposalRenderRejectedError('flag_disabled'|'semantic_rejected'|'audience_violation'
//          |'accessibility_unsupported'|'deadline_expired') · ProposalInputError · ProposalNotFoundError
//          · ProposalAudienceError (desde assertEvidenceAllowedForAudience)

retryProposalRenderJob(input: { ownerOrgId: string; renderJobId: string; actor: ProposalActor })
  : Promise<{ job: ProposalRenderJobRecord }>
// Solo desde failed | dead_letter; rechaza los failure_code no reintentables (ProposalRenderStateError).
// Resetea state='queued', failure_*=NULL, dispatched_at/started_at/finished_at/execution_name=NULL.
// NO resetea `attempts` (el historial de intentos es evidencia).

markRenderJobDispatched(renderJobId: string, executionName: string): Promise<ProposalRenderJobRecord>
  // queued → dispatched · attempts+1 · execution_name · actor 'dispatcher'
markRenderJobRunning(renderJobId: string): Promise<ProposalRenderJobRecord>
  // queued|dispatched → running · started_at · attempts+1 solo si dispatched_at IS NULL
markRenderJobCompleted(input: {
  renderJobId: string; outputPdfAssetId: string | null
  outputPreviewAssetIds: string[]; outputReport: Record<string, unknown>
}): Promise<ProposalRenderJobRecord>              // running → completed
markRenderJobFailed(input: {
  renderJobId: string; failureCode: RenderJobFailureCode; failureDetail: string
}): Promise<ProposalRenderJobRecord>              // queued|dispatched|running → failed | dead_letter

getProposalRenderJob(input: { ownerOrgId: string; renderJobId: string })
  : Promise<ProposalRenderJobRecord | null>       // org-scoped SIEMPRE
getRenderJobManifest(renderJobId: string): Promise<Record<string, unknown> | null>
  // el manifest completo NO viaja en el record de lista: el worker lo pide explícito
listProposalRenderJobs(input: {
  ownerOrgId: string; proposalId?: string; state?: RenderJobState; limit?: number  // limit ≤ 200
}): Promise<ProposalRenderJobRecord[]>

selectNextRenderJobForDispatch(input?: { agingMinutes?: number })   // default 30
  : Promise<ProposalRenderJobRecord | null>       // NO muta: solo elige (lo usa el dispatcher)
claimNextRenderJobForExecution(input?: { agingMinutes?: number })   // default 30
  : Promise<ProposalRenderJobRecord | null>       // FOR UPDATE SKIP LOCKED + queued→running atómico
listExpiredQueuedRenderJobs(): Promise<ProposalRenderJobRecord[]>   // queued con deadline <= now()
```

**Regla de prioridad (idéntica en `selectNext…` y `claimNext…`):**

```sql
WHERE state = 'queued' AND (deadline IS NULL OR deadline > now())
ORDER BY LEAST(COALESCE(deadline,'infinity'::timestamptz),
               created_at + make_interval(mins => $agingMinutes)) ASC,
         created_at ASC
LIMIT 1
```

Deadline más próximo primero; un job **sin deadline envejece** hasta competir (a los `agingMinutes`
alcanza prioridad de despacho) — *prioridad sin aging es hambruna con otro nombre*; empate → FIFO por
`created_at`; **un deadline ya vencido no compite** (se cierra gobernado, §2.3).

### 2.2 `render-projection.ts` (`import 'server-only'`)

```ts
buildProposalRenderProjection(input: {
  ownerOrgId: string; proposalId: string; audience: ProposalAudience
}): Promise<ProposalRenderProjection>
// ProposalRenderProjection = { proposalId, ownerOrgId, audience, title, origin, state, deadline,
//   deadlineConfidence, assets[], allowedEvidence[], requirements[], projectedAt }
// audience='internal'      → toda la evidencia
// audience='client_facing' → SOLO evidencia client_facing (lo interno ni aparece como id)
// NUNCA proyecta: RFP crudo, costos, quote snapshot, external_source_snapshot (solo su EXISTENCIA),
//                 prompts, URLs privadas ni handles de storage.
// Error: ProposalNotFoundError

assertEvidenceAllowedForAudience(
  projection: Pick<ProposalRenderProjection,'audience'|'allowedEvidence'>,
  referencedEvidenceIds: readonly string[],
  artifactAudience: ProposalAudience
): void   // pura, testeable sin DB. Lanza ProposalAudienceError si:
          //  (a) artefacto client_facing construido desde una proyección no client_facing;
          //  (b) una referencia fuera del allowlist (no "se omite": RECHAZA el artefacto completo);
          //  (c) UNA SOLA evidencia internal en un artefacto client_facing.
```

### 2.3 `render-dispatch.ts` (`import 'server-only'`, corre en `ops-worker`)

```ts
dispatchNextRenderJob(): Promise<RenderDispatchResult>
// RenderDispatchResult = { skipped?: 'flag_off'; expiredClosed: number
//                        ; dispatched: Array<{renderJobId, executionName}>
//                        ; postponed: Array<{renderJobId, state, deadline}> }
```

Secuencia por tick: (1) cierra los `queued` con deadline vencido → `markRenderJobFailed('timeout')`
con detalle explícito; (2) `selectNextRenderJobForDispatch()` — si no hay, termina; (3) `jobs.run`
del Cloud Run Job vía `GoogleAuth` (`POST https://run.googleapis.com/v2/projects/{p}/locations/{r}/jobs/{j}:run`,
**sin overrides**, ~200 ms); si falla → `markRenderJobFailed('dispatch_error')` + `captureWithDomain`;
(4) **loguea los pospuestos** (todo job que sigue en cola este tick). *Un descarte silencioso sería la
peor falla posible acá.* Un dispatch por tick (el Job es `tasks=1`).

Env: `GOOGLE_CLOUD_PROJECT` (default `efeonce-group`), `ARTIFACT_WORKER_REGION` (default `us-east4`),
`ARTIFACT_WORKER_JOB_NAME` (default `artifact-worker`).

### 2.4 `render-constraints.ts` (PURO, browser-safe)

```ts
DEFAULT_MAX_PDF_MB = 20
extractRenderConstraints(requirements: readonly ProposalRenderRequirementRef[])
  : ProposalRenderConstraints
// ProposalRenderConstraints = {
//   maxPdfMb: number            // default 20 si el RFP no declara; si declara varios, gana el MÁS restrictivo
//   maxPdfMbFromRfp: boolean    // el límite vino del RFP o es el default global
//   maxPages: number | null     // solo si el texto del requisito dice "máx"
//   accessibilityRequired: boolean
//   sourceRequirementIds: string[]   // trazabilidad al requisito-set
// }
```

Detección conservadora a propósito (mejor un falso positivo que un humano revisa, que un PDF
inadmisible presentado). Accesibilidad se busca en **todos** los requisitos (patrones `PDF/UA`,
`Section 508`, `EAA`, `European Accessibility Act`, `WCAG`, `accesib*`, `accessib*`); peso/páginas
solo en requisitos de tipo `format` o `excluyente`.

### 2.5 `render-agent.ts` (`import 'server-only'`)

```ts
buildProposalRenderAgentContext(input: { ownerOrgId; proposalId; audience })
  : Promise<ProposalRenderAgentContext>
// proyección allowlisted + constraints + jobs existentes + measuredEstimate:
//   { basis: 'no_data' } | { basis: 'last_comparable', renderJobId, durationMs, pdfBytes }
//   ← la ÚNICA estimación honesta: datos MEDIDOS, nunca una predicción inventada.

computeRenderBlockers(ctx): RenderBlockerCode[]   // 'accessibility_required' | 'deadline_expired'
                                                  //  | 'internal_evidence_for_client_facing'
validateProposalRenderProposal(proposal, context): void   // pura, fail-closed. Rechaza: cambio de
  // audience, evidencia fuera del allowlist, evidencia interna en client_facing, citedInputs vacío,
  // BLOQUEO REAL OMITIDO (los recomputa del contexto), duplicado citado inexistente.
hashProposalRenderAgentContext(ctx): string
proposeProposalRender(input: { context; operatorBrief })      // structured output (Anthropic canónico)
  : Promise<{ proposal: ProposalRenderAgentProposal; trace: ProposalRenderTrace }>
confirmProposalRender(input: { ownerOrgId; proposalId; proposal; context; trace; manifest;
                               outputTarget; actor })
  // exige actor.kind==='member'; re-valida; rechaza si hay bloqueos; ejecuta requestProposalRender.
```

El agente **PROPONE**; el humano **CONFIRMA**; el **mismo command canónico EJECUTA**. El agente nunca
encola, nunca invoca `jobs.run`, nunca ejecuta Chromium, nunca publica un asset y **jamás produce el
manifest** (lo resuelve `resolvePlan`, determinista). Eval: `__tests__/render-agent-eval.test.ts`.

### 2.6 Motor — `src/lib/artifact-composer/**` (domain-free; el pipeline lo CONSUME)

```ts
// catalog.ts
resolvePlan(catalog: ArtifactCatalog, input: CompositionPlanInput)
  : Promise<ResolvedCompositionManifest>
// selector → forma (contratos de slots + reglas por-plantilla) → semántica (fail-closed) →
// sellado (registryHash + contractHash/templateHash por lámina + brandPack + fonts + validators).
// Canonicaliza el input (solo slideId/contentType/slots): dos entradas equivalentes producen EL
// MISMO manifest/hash — el drift check del worker lo exige.
// Errores: TemplateAuthorityError · DeckValidationError · CatalogSemanticError · MissingSlotContractError
loadRegistry(assets: { templatesDir: string }): Promise<DeckRegistry>
loadTemplateContract(assets, registry, template: TemplateName): Promise<TemplateContract>
runSemanticValidators(catalog, plan, snapshot): ManifestValidatorRun[]
resolveBrandSeal(catalog): Promise<{ brandPack: {name,hash}|null; fonts: Array<{family,variant,checksum}>|null }>
IMPLEMENTED_OUTPUT_TARGETS: ReadonlySet<OutputTarget>   // 'pdf-merged' | 'png-set'
                                                        // declarados-no-implementados: 'pptx-native' | 'adobe-express-rest'

// compose.ts
composeArtifact(catalog: ArtifactCatalog, deckPlan: DeckPlan, outDir: string,
                options?: { concurrency?: number /*4*/; maxPdfMb?: number /*20*/ })
  : Promise<ComposeResult>
// ComposeResult = { deckPlan, slidePaths: string[], pdfPath?: string, pdfBytes?: number, warnings: string[] }
// Valida TODO antes de renderizar NADA (un PDF parcial de una oferta es peor que ningún PDF).
// Emite en outDir: deck-plan.json + <artifactId>.manifest.json + NN-<slideId>.png (+ .pdf si pdf-merged)
//                  + <artifactId>.pdf mergeado con pdf-lib.
// Error si el catálogo declara un outputTarget no implementado: UnimplementedOutputTargetError.

// render.ts
launchComposerBrowser(): Promise<Browser>
// Launch DETERMINISTA canónico — TODO consumer que renderice láminas DEBE pasar por acá:
//   --disable-gpu --force-color-profile=srgb --disable-lcd-text --disable-partial-raster --no-sandbox
renderSlide(browser, templateHtmlPath, slide, contract, target: RenderTarget,
            runtime: CatalogRenderRuntime): Promise<void>
// fillSlide → assertSlideFitsCanvas → assertAllImagesResolved → assertNoFontFallback
//           → screenshot(+assertSlideHasInk) | page.pdf
assertSlideFitsCanvas(page, slide, contract): Promise<void>   // throw SlideGeometryError
mergeSlidePdfs(slidePdfPaths: string[], outPath: string): Promise<void>

// quality-gates.ts — los 3 gates MECÁNICOS de publicación (no advertencias)
assertAllImagesResolved(page, slideId): Promise<void>   // throw SlideQualityError('missing_asset')
assertNoFontFallback(page, slideId): Promise<void>      // throw SlideQualityError('font_fallback_detected')
assertSlideHasInk(pngBuffer, slideId, minInkTileRatio = 0.015): void
                                                        // throw SlideQualityError('blank_slide')
measureSlideInk(pngBuffer): SlideInkMetrics             // { inkTileRatio, tilesTotal, tilesWithInk }
```

`assertAllImagesResolved` **espera determinísticamente** (`img.decode()` por imagen + techo duro de
15 s) antes de juzgar `naturalWidth`. Juzgar sin esperar producía falsos `missing_asset` en Cloud Run
(el SSD local escondía la carrera). *Un gate que depende de la velocidad del disco no es un gate: es
una moneda* (ISSUE-121 · #4).

### 2.7 API (Full API Parity)

| Método · ruta | Capability (`need`) | Contrato |
| --- | --- | --- |
| `POST /api/commercial/proposals/[proposalId]/render-jobs` | `render_execute` | body: `{ownerOrgId, artifactPurpose, audience, outputTarget, manifest, evidenceIds?}` → `201` (nuevo) / `200` (idempotente) con `{job, idempotent}` |
| `GET  /api/commercial/proposals/[proposalId]/render-jobs?ownerOrgId=…` | `render_read` | lista de jobs |
| `GET  /api/commercial/proposals/[proposalId]/render-jobs/[renderJobId]` | `render_read` | estado del job |
| `POST /api/commercial/proposals/[proposalId]/render-jobs/[renderJobId]/retry` | `render_retry` | retry gobernado |
| `GET  /api/commercial/proposals/[proposalId]/render-projection?audience=…` | (proposal read) | la proyección allowlisted |

Los routes son **thin**: parsean, `assertProposalStudioAccess` (entitlement per-ORG + capability), delegan
en el primitive y traducen errores por `proposalErrorResponse` → códigos canónicos
(`proposal_render_rejected`, `proposal_render_conflict`, `proposal_invalid_input`, `proposal_not_found`,
`proposal_not_entitled`, `forbidden`, `internal_error`). Nunca sale un error crudo de Chromium/Cloud Run
ni contenido comercial al caller.

---

## §3 — Gates fail-closed

### 3.1 Al ENCOLAR (`requestProposalRender` — no esperan al worker)

| # | Gate | Qué rechaza | Error / código | ¿Reintentable? |
| --- | --- | --- | --- | --- |
| 0 | Flag | Pipeline apagado en el runtime que encola | `ProposalRenderRejectedError('flag_disabled')` | n/a (no crea job) |
| 1 | **Manifest shape** | `manifestVersion ≠ 1`; sin `catalog.registryHash`; sin láminas | `ProposalInputError` | n/a |
| 2 | **Validadores semánticos** | Un `validators[].result ≠ 'pass'` en el manifest | `ProposalRenderRejectedError('semantic_rejected')` | **NO** |
| 3 | **Actor humano para `client_facing`** | `audience='client_facing'` pedido por `system`/`cli` | `ProposalRenderRejectedError('audience_violation')` (+ CHECK en DB) | **NO** |
| 4 | **Audience POR REFERENCIA** | UNA evidencia `internal` (o fuera del allowlist) en un artefacto `client_facing` → rechaza el artefacto **completo** | `ProposalAudienceError` → `audience_violation` | **NO** |
| 5 | **Accesibilidad** | El requisito-set exige PDF/UA · 508 · EAA · WCAG | `ProposalRenderRejectedError('accessibility_unsupported')` | **NO** |
| 6 | **Deadline vencido** | `projection.deadline < now()` | `ProposalRenderRejectedError('deadline_expired')` | n/a (no crea job) |
| 7 | **Idempotencia** | Misma `(org, proposal, manifestHash, purpose)` | *no es rechazo:* devuelve el job existente (`idempotent: true`) | — |

> **Gate 5 es arquitectónico, no una omisión.** `Chromium print-to-PDF` emite PDF **sin taguear** — el
> motor **no puede** producir PDF/UA. Si el RFP la exige, **mejor no ofertar que entregar un artefacto
> inadmisible**. La limitación se declara explícita acá y en el runbook.

### 3.2 En el WORKER (`services/artifact-worker/main.ts` + el motor)

| Gate | Dónde se aplica | Qué rechaza | `failure_code` | ¿Reintentable? |
| --- | --- | --- | --- | --- |
| Catálogo empaquetado | `main.ts` (antes de componer) | `catalog_name` no está en la imagen | `manifest_drift` | **NO** |
| **Drift del manifest** | `main.ts` post-`composeArtifact` | El manifest re-resuelto contra la copia LOCAL del catálogo ≠ hash encolado (plantilla/contrato/brand pack cambiaron desde el enqueue) | `manifest_drift` | **NO** |
| Geometría | `renderSlide` → `assertSlideFitsCanvas` | Un slot del contrato se sale de su ventana visible (el renderer **no amputa copy**) | `geometry_rejected` | **NO** |
| Slot-fill | `fillSlide` (`SlotFillError`) | El filler no puede llenar un slot declarado (sin `default:` silencioso) | `semantic_rejected` | **NO** |
| Imagen sin resolver | `renderSlide` → `assertAllImagesResolved` | Un `<img>` con `naturalWidth === 0` tras esperar su `decode()` | `missing_asset` | sí |
| Fallback tipográfico | `renderSlide` → `assertNoFontFallback` | Una familia pedida sin **ninguna** FontFace declarada (el browser cae a fuente del sistema en silencio) | `font_fallback_detected` | sí |
| Lámina en blanco | `renderSlide` → `assertSlideHasInk` | `inkTileRatio < 1,5%` (contraste local por tiles 16×16; robusto ante degradados) | `blank_slide` | sí |
| **Peso** | `main.ts` (constraints FIJADAS del job) | `pdfBytes > maxPdfMb` (solo `pdf-merged`) | `size_rejected` | **NO** |
| **Páginas** | `main.ts` (constraints FIJADAS del job) | `slides.length > maxPages` | `size_rejected` | **NO** |
| Cualquier otro fallo | `classifyFailure` | Error no clasificado (Chromium, IO, DB) | `render_error` | sí |

Códigos **no reintentables** (`NON_RETRYABLE_FAILURES` en `render-jobs.ts`): `audience_violation`,
`accessibility_unsupported`, `semantic_rejected`, `size_rejected`, `geometry_rejected`, `manifest_drift`.
El retry produciría **exactamente el mismo rechazo**: hay que corregir el plan/evidencia y pedir un
render nuevo. Los demás (`font_fallback_detected`, `missing_asset`, `blank_slide`, `render_error`,
`timeout`, `dispatch_error`) son reintentables **hasta agotar `max_attempts`** (default 3) → `dead_letter`.

Los códigos del **dispatcher**: `timeout` (deadline vencido en cola) y `dispatch_error` (la Jobs API falló).

---

## §4 — Topología de deploy

### 4.1 Cloud Run **Job** `artifact-worker` (el primero del ecosistema)

| Parámetro | Valor | Por qué |
| --- | --- | --- |
| Tipo | **Cloud Run Job** (no service) | No expone HTTP; se invoca por `jobs.run`. Scale-to-zero real |
| Región | `us-east4` | Misma que Cloud SQL y los 3 workers modernos |
| Service account | `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` | Idéntica a los services productivos |
| `--tasks` / `--parallelism` | `1` / `1` | **Una ejecución = un artefacto** |
| `--max-retries` | **`0`** | El retry es del **DOMINIO** (`proposal_render_jobs.attempts`), no de Cloud Run: ninguna re-ejecución fuera del contrato del job record |
| `--cpu` / `--memory` | `2` / `2Gi` | Envelope confirmado en staging (peor caso medido 32,3 s; RSS local ~260 MB) |
| `--task-timeout` | `900` s | ~29× de margen sobre el peor caso |
| Imagen | `us-east4-docker.pkg.dev/efeonce-group/cloud-run-source-deploy/artifact-worker:<GIT_SHA>` | SHA-pinneada + verificación fail-loud post-deploy (label `git-sha`) |
| Base | **`mcr.microsoft.com/playwright:v1.59.1-noble`** | **Pinneada** a la versión de `@playwright/test` del repo — *otro Chromium = otro píxel = otro artefacto* (test de contrato lo enforcea) |
| Runtime | **`tsx` sobre el árbol fuente** (sin bundle esbuild) | El catálogo resuelve templates/fuentes/assets por paths module-relative (`import.meta.url`); un bundle los reubicaría. Costo: imagen más grande. Beneficio: cero divergencia con el CLI local probado |
| Secrets | `GREENHOUSE_POSTGRES_PASSWORD` (+ `SENTRY_DSN` si el secret existe) | Secret Manager, via helper `ensure_secret_accessor_binding` |
| Entrypoint | `npx tsx --require ./scripts/lib/server-only-shim.cjs services/artifact-worker/main.ts` | El shim neutraliza `server-only` fuera de Next |

**SELFTEST de imagen (paso de Cloud Build, ANTES del deploy):** `docker run --rm <IMAGE> --selftest`
ejercita, sin DB y sin flag: (1) shim+tsx+aliases `@/` resuelven; (2) el catálogo está **completo**
(registry + los 25 contratos + plantillas legibles); (3) el font pack es **íntegro** (cada TTF existe y
su sha256 coincide con el seal); (4) **Chromium arranca** con el launch canónico y una lámina probe se
llena y screenshotea de verdad. **Un fallo acá aborta el deploy.** *La imagen se prueba a sí misma o no
hay deploy* (ISSUE-121 · #2).

**Workflow:** `.github/workflows/artifact-worker-deploy.yml` — push a `develop` (con paths que cubren
**cada** `src/lib/**` que el worker consume: `artifact-composer`, `commercial/tenders`, `storage`,
`postgres`, `db.ts`, `sync/event-catalog`, `sync/publish-event`, `observability`, `secrets`,
`types/db.d.ts`, `package.json`, lockfile, `tsconfig.json`) + `workflow_dispatch` **solo staging**.
WIF con `github-actions-deployer@`. `deploy-contract.test.ts` verifica el pin de Playwright, el COPY
completo de `scripts/lib/`, el entrypoint, `tasks/parallelism/max-retries`, la declaración del flag, el
paso de selftest, la verificación de SHA, la cobertura de paths del workflow, la **ausencia de trigger
de production** y el `--no-sandbox` del launch canónico.

### 4.2 Dispatcher (en `ops-worker`, no un deployable nuevo)

`POST /artifact-render/dispatch` → `dispatchNextRenderJob()`. **No renderiza**: selecciona y hace UNA
llamada a la Jobs API (~200 ms). El invariante *"`ops-worker` no ejecuta Chromium"* (bloquearía el
publisher del outbox) se respeta por construcción. Respuestas: `200 {ok, skipped:'flag_off'}` ·
`200 {ok, expiredClosed, dispatched, postponed}` · `502 {error}`.

### 4.3 Cloud Scheduler

`ops-artifact-render-dispatch` — cron **`*/2 * * * *`** → `POST /artifact-render/dispatch` (body `{}`),
OIDC con `greenhouse-portal@`. Declarado en `services/ops-worker/deploy.sh`. Con el flag OFF el endpoint
hace *skip logueado*: el job de Scheduler puede quedar creado sin costo de render.

### 4.4 IAM — por qué `run.invoker` basta (y por qué NO usamos `runWithOverrides`)

El diseño original pasaba `RENDER_JOB_ID` como **override de env** en `jobs.run`. Eso exige el permiso
`run.jobs.runWithOverrides`, que **`roles/run.invoker` NO incluye** — primer fallo del smoke real
(ISSUE-121 · #1). La respuesta **no** fue escalar el privilegio del dispatcher: fue **rediseñar para
necesitar menos**.

- El **dispatcher** decide **CUÁNDO** hay trabajo y lanza una ejecución con `jobs.run` **simple**
  (`roles/run.invoker` sobre el Job, binding creado por `deploy.sh`).
- El **worker** decide **CUÁL** job toma: `claimNextRenderJobForExecution()` hace
  `SELECT … FOR UPDATE SKIP LOCKED` con la **misma regla de prioridad** y transiciona `queued → running`
  atómicamente. **Dos ejecuciones concurrentes jamás toman el mismo job.**
- `RENDER_JOB_ID` sigue soportado como **override manual** (smoke/replay dirigido del operador vía
  `gcloud run jobs execute --update-env-vars`), no como camino del dispatcher.

Resultado: **menos privilegio Y más robusto**. *Siempre preferir rediseñar para necesitar MENOS
privilegio antes que escalar IAM.*

### 4.5 El flag es MULTI-RUNTIME (×3)

`ARTIFACT_RENDER_JOBS_ENABLED` — default **`false`**. Se lee en **tres** runtimes con env vars
independientes:

| Runtime | Dónde se lee | Efecto con OFF | SoT del valor |
| --- | --- | --- | --- |
| **Vercel** (enqueue) | `requestProposalRender` | rechaza con `flag_disabled` | Vercel env vars (por environment) |
| **Cloud Run `ops-worker`** (dispatch) | `dispatchNextRenderJob` | `skipped:'flag_off'` logueado | `services/ops-worker/deploy.sh` |
| **Cloud Run Job `artifact-worker`** | `main()` | `flag OFF — skip`, sale 0 | `services/artifact-worker/deploy.sh` |

⚠️ **`--set-env-vars` es DESTRUCTIVO**: toda var agregada out-of-band desaparece en el próximo deploy.
Declararla en el `deploy.sh` **y además** aplicarla en vivo (`--update-env-vars`) para efecto inmediato.
Hacer solo lo segundo = el flag desaparece en silencio en el siguiente deploy.

Estado 2026-07-12: **ON** en los 3 runtimes de staging (verificado con render real). **Vercel production
SIN la var (OFF)** — `ops-worker` y el Job son servicios únicos compartidos entre environments; la puerta
de producción es **el enqueue** (Vercel prod) + el **entitlement per-ORG**. Fila viva:
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

---

## §5 — Observabilidad

### 5.1 Reliability signals (`src/lib/reliability/queries/commercial-proposal-signals.ts`)

Los 4 corren bajo `moduleKey='commercial'`, `source='proposal_studio'`, `kind='data_quality'`, y
degradan honestamente a `unknown` si la query falla (`captureWithDomain`).

| `signalId` | Qué mide | Severidad | Steady |
| --- | --- | --- | --- |
| `commercial.proposal.stuck_in_state` | Propuestas activas sin movimiento > **14 días** | `ok` / `warning` | **0** |
| `commercial.proposal.deadline_at_risk` | Deadline a < **72 h** sin estar `ready_to_submit`/`submitted` | `ok` / `error` | **0** |
| **`artifact.render.queue.starvation`** | Jobs `queued` (con deadline vivo o sin deadline) hace > **20 min** — con el dispatcher cada 2 min, eso es **dispatcher caído o inanición de prioridad** | `ok` / `error` | **0** |
| **`artifact.render.dead_letter`** | Jobs en `dead_letter` en los últimos **7 días** — requieren humano (retry del dominio o corrección del plan) | `ok` / `error` | **0** |

### 5.2 Outbox (`greenhouse_sync.outbox_events`, `aggregateType = proposal`)

| `eventType` | Cuándo | Payload (v1) |
| --- | --- | --- |
| `commercial.proposal.render_requested` | alta del job (misma tx que el INSERT) | `{renderJobId, proposalId, ownerOrgId, artifactPurpose, audience, catalogName, manifestHash, deadline, actorKind}` |
| `commercial.proposal.render_completed` | transición → `completed` | `{renderJobId, proposalId, ownerOrgId, state, failureCode:null, attempts, artifactPurpose, audience}` |
| `commercial.proposal.render_failed` | transición → `failed` **o** `dead_letter` | idem con `state` y `failureCode` |

Ningún evento lleva contenido de RFP, costos, slots ni URLs de storage.

### 5.3 Sentry

`captureWithDomain(error, 'commercial', …)` — **nunca** `Sentry.captureException` directo.
Tags: `source='artifact_worker'` + `failureCode` (worker) · `source='artifact_render_dispatch'`
(dispatcher) · `source='proposal_studio_api'` (routes). El worker inicializa con
`initSentryForService('artifact-worker')`.

### 5.4 Estado operativo

El estado de negocio vive en `proposal_render_jobs` (+ historial `proposal_render_job_events`), **no** en
Cloud Run. `gcloud run jobs executions list --job=artifact-worker` sirve para correlacionar (el
`execution_name` queda en el job), pero **una ejecución exitosa de Cloud Run no implica un render
exitoso**: un fallo gobernado sale con **exit 0** y su código en `failure_code`. Un **exit ≠ 0 es un
bug del worker** (fallo NO gobernado) → Sentry.

---

## §6 — Invariantes operativos para agentes

**NUNCA**

- **NUNCA** renderizar un **plan mutable**: lo único renderizable productivo es un
  `ResolvedCompositionManifest` sellado. Si el manifest re-resuelto contra el catálogo local no coincide
  byte a byte con el hash encolado → `manifest_drift` y **no se publica**.
- **NUNCA** ejecutar Chromium en **Vercel** ni en el **`ops-worker`** (bloquearía el publisher del
  outbox → se caen TODAS las projections del ecosistema). El render pesado vive **solo** en el Cloud Run
  Job `artifact-worker`.
- **NUNCA** publicar un artefacto `client_facing` que cite **una sola** evidencia `internal` — los
  insumos internos llevan **loaded cost y piso de negociación**: colarlos en el PDF es entregarle a la
  contraparte nuestra estructura de costos. El gate es **por referencia** y rechaza el artefacto
  **completo**, no "omite" la evidencia.
- **NUNCA** encolar un render si el requisito-set exige **accesibilidad** (PDF/UA · 508 · EAA · WCAG):
  este motor no puede producir PDF/UA. **Mejor no ofertar que entregar un artefacto inadmisible.**
- **NUNCA** dejar que el **LLM** encole, ejecute `jobs.run`, corra Chromium, publique un asset o produzca
  el manifest. El loop es `propose → confirm → execute`, y `requested_by_kind` **ni siquiera admite**
  `agent`.
- **NUNCA** hashear el manifest con `JSON.stringify` crudo: viaja por **JSONB** y PostgreSQL reordena las
  claves → usar la serialización **canónica** (`hashResolvedManifest`). Un hash sensible al orden hace
  mentir al drift check.
- **NUNCA** `DELETE` ni `UPDATE` sobre `proposal_render_job_events`, ni `DELETE` sobre
  `proposal_render_jobs` (triggers lo impiden: los jobs son **evidencia**). Ningún campo de contrato del
  job muta post-INSERT.
- **NUNCA** reintentar un `failure_code` **no reintentable** (`audience_violation`,
  `accessibility_unsupported`, `semantic_rejected`, `size_rejected`, `geometry_rejected`,
  `manifest_drift`): el mismo manifest produce el mismo rechazo. Corregir el plan y pedir un **render
  nuevo**.
- **NUNCA** validar peso/páginas contra un default global re-leído: se valida contra las **constraints
  FIJADAS en el job** (snapshot del requisito-set al encolar).
- **NUNCA** una cola FIFO ciega ni una prioridad sin **aging** (sería hambruna con otro nombre), y
  **NUNCA** descartar un job en silencio: todo pospuesto se loguea.
- **NUNCA** lanzar Chromium fuera de `launchComposerBrowser()` (otro launch = otro píxel = otro
  artefacto, y el visual gate deja de significar nada).
- **NUNCA** despinnear la base `mcr.microsoft.com/playwright:vX.Y.Z` de la versión de `@playwright/test`
  del repo, ni cambiar el runtime `tsx`→bundle sin resolver la reubicación de templates/fuentes/assets.
- **NUNCA** escalar IAM (`run.jobs.runWithOverrides`) para hacer andar el dispatcher: el claim del worker
  (`SKIP LOCKED`) existe precisamente para no necesitarlo.
- **NUNCA** prender/apagar el flag en un solo runtime: son **3** (Vercel + ops-worker + Job) y el SoT en
  Cloud Run son los `deploy.sh`.
- **NUNCA** exponer en un evento/proyección/error: RFP crudo, costos, quote snapshot,
  `external_source_snapshot`, prompts, URLs o handles de storage.

**SIEMPRE**

- **SIEMPRE** validar TODO antes de renderizar NADA (`composeArtifact`): un PDF parcial de una oferta es
  peor que ningún PDF — **parece completo**.
- **SIEMPRE** que un gate juzgue estado asíncrono, **esperar su settlement de forma determinista**
  (promesa/evento con techo duro), jamás un sleep ni un juicio inmediato.
- **SIEMPRE** que se construya/actualice la imagen, correr el **selftest dentro del pipeline de build**
  (catálogo + checksums de fuentes + Chromium + render probe). *Compiló* no es evidencia.
- **SIEMPRE** agregar al `paths:` del workflow **cada** `src/lib/**` que el worker consume — si no, el
  worker queda **stale en silencio**.
- **SIEMPRE** ejecutar un deployable nuevo **en su runtime real** antes de declararlo listo (los 5 bugs
  de ISSUE-121 eran invisibles en local **por construcción**).
- **SIEMPRE** que un catálogo referencie un asset, la referencia vive **dentro de su árbol**
  (`catalog-portability.test.ts` prohíbe `file://`, rutas absolutas, rutas de máquina y `../../`).

---

## §7 — Extensión

### 7.1 Agregar un **catálogo** nuevo (ej. `social-carousel`)

1. Crear `src/lib/artifact-composer/catalogs/<nombre>/` con `registry.json`, plantillas `.html`,
   `*.slots.json`, resolvers, validadores semánticos y (opcional) brand pack + font pack. Un catálogo es
   **DATO**: **NO se toca el motor** (`catalog-extensibility.test.ts` lo prueba).
2. Registrarlo en el `CATALOGS` map de `services/artifact-worker/main.ts` (hoy:
   `new Map([[deckAxisCatalog.name, deckAxisCatalog]])`). Sin esto, un job con ese `catalog_name` falla
   con `manifest_drift` (por diseño: el worker no compone lo que no tiene empaquetado).
3. Verificar que el `outputTarget` del catálogo esté en `IMPLEMENTED_OUTPUT_TARGETS`.
4. Correr el **visual gate a 0 píxeles** + `pnpm vitest run src/lib/artifact-composer` + el selftest.

**Lo que NO se toca:** `compose.ts`, `render.ts`, `catalog.ts`, `plan.ts`, el schema, el dispatcher, el
worker (salvo la línea del map). Un catálogo nuevo **no** es un fork del motor.

### 7.2 Agregar un `outputTarget`

`OutputTarget` ya declara `'pdf-merged' | 'png-set' | 'pptx-native' | 'adobe-express-rest'`, pero solo
los dos primeros están en `IMPLEMENTED_OUTPUT_TARGETS`. Un target declarado y no implementado **aborta**
(`UnimplementedOutputTargetError`) — no degrada silenciosamente. Implementar uno = escribir su emisor en
`compose.ts` + agregarlo al set + su gate de admisibilidad equivalente al de peso/páginas.

⚠️ El envelope actual (`tasks=1`, una ejecución = un artefacto) es correcto para `pdf-merged`; para un
**batch** de `png-set` (30 carruseles = 30 cold starts de Chromium) hay que decidir concurrencia con
datos de carga reales (§9).

### 7.3 Agregar un `failure_code`

Es un cambio de **contrato en 4 lugares, en el mismo PR**: (1) el `CHECK` de `failure_code` en una
migración nueva (idempotente, forward-fix — nunca editar la aplicada); (2) el tipo
`RenderJobFailureCode`; (3) `NON_RETRYABLE_FAILURES` si corresponde; (4) `classifyFailure` en el worker.
Actualizar además el README del worker y §3 de este doc.

### 7.4 Agregar un `constraint` del requisito-set

Extender `ProposalRenderConstraints` + `extractRenderConstraints` (puro, browser-safe, testeable sin DB)
y su verificación en `main.ts`. Regla dura: la constraint se **fija en el job al encolar** (snapshot) y
el worker la evalúa contra **ese** snapshot, nunca contra un default global re-leído. La detección puede
(y debe) ser **conservadora**: un falso positivo lo revisa un humano; un artefacto inadmisible presentado
pierde el proceso.

---

## §8 — Rollback y operación degradada

| Escenario | Acción | Efecto |
| --- | --- | --- |
| **Rollback total (<10 min)** | Flag `ARTIFACT_RENDER_JOBS_ENABLED=false` en los **3** runtimes (Vercel env + `--update-env-vars` en `ops-worker` y en el Job) + pausar el Scheduler `ops-artifact-render-dispatch` | El enqueue rechaza (`flag_disabled`), el dispatcher hace skip, el Job sale 0. **Los jobs en cola quedan intactos y auditables**; los assets ya aprobados **no se borran** |
| **Dispatcher caído** | Signal `artifact.render.queue.starvation` escala a `error` (>20 min en cola) | Los jobs siguen `queued`. Remediación: revisar el Scheduler + la revisión activa de `ops-worker`, o ejecutar el Job a mano (`gcloud run jobs execute artifact-worker`) — el worker claim-ea igual, sin dispatcher |
| **Job en `dead_letter`** | Signal `artifact.render.dead_letter` (>0 = humano) | Si el código es reintentable y la causa se resolvió: `POST …/retry`. Si no lo es: corregir el plan/evidencia/requisito y **encolar un render nuevo** (otro `manifest_hash` → otra fila) |
| **Drift del catálogo** | Un deploy cambió una plantilla/contrato/brand pack después del enqueue | Los jobs en vuelo fallan con `manifest_drift` (no reintentable) — **correcto**: ese artefacto sería OTRO. Re-resolver el plan (`resolvePlan`) y encolar de nuevo |
| **CLI local** | `pnpm deck:compose <plan.json> [--out dir]` | **NO depende del flag** ni del pipeline: es el camino degradado siempre disponible para producir un artefacto a mano |
| **Revert de la migración** | `-- Down Migration` presente (drop de triggers/funciones/tablas + `deprecated_at` de la capability) | Solo válido si el pipeline no tiene consumidores productivos: los jobs son evidencia |

---

## §9 — Follow-ups

1. **Producción (gate duro).** Antes del **primer deploy productivo** del worker:
   (a) integrar `.github/workflows/artifact-worker-deploy.yml` al orquestador `production-release.yml` y
   agregarlo a `RELEASE_DEPLOY_WORKFLOWS` (`src/lib/release/workflow-allowlist.ts`) — regla del release
   control plane; (b) **sign-off explícito del operador**. El workflow **no tiene** trigger de production
   y `deploy-contract.test.ts` lo enforcea. El **enqueue** de Vercel production permanece **OFF por
   diseño** (la puerta comercial adicional es el entitlement per-ORG `proposal_studio_v1`).
2. **Batch `png-set`.** El envelope `tasks=1` fue medido para deck (`pdf-merged`). Un batch de carruseles
   tiene el perfil de carga **opuesto** (frecuente, sin deadline duro, N artefactos): decidir concurrencia
   de ejecuciones y/o `tasks>1` **con datos de carga reales**, no a ojo. Interactúa con el aging de la
   cola (un batch social no puede hambrear un bid con deadline duro — y viceversa).
3. **PDF/UA (accesibilidad).** Hoy el pipeline **rechaza** cualquier RFP que la exija. Levantar esa
   limitación requiere un renderer que emita PDF **tagueado** (Chromium print-to-PDF no puede) — es un
   target nuevo (`pptx-native` / un emisor PDF/UA dedicado), no una opción de configuración. Mientras
   tanto: la limitación se declara explícita en spec, README del worker y runbook.
4. **Runbook operativo.** Este doc es el contrato técnico; falta el manual de operación paso a paso
   (`docs/manual-de-uso/**` — owner distinto). No lo escribe este doc.

---

## Relacionado

- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` — el motor (ADR)
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` — el catálogo `deck-axis`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §0 — el aggregate `Proposal`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` — la excepción de frontera EPIC-027
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4 — inventario Cloud Run (Jobs)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — los 2 signals de render
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md`
- `docs/tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — fila `ARTIFACT_RENDER_JOBS_ENABLED`
- `services/artifact-worker/README.md` — operación del deployable
