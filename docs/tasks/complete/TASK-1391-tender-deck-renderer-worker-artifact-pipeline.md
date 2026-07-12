# TASK-1391 — Artifact Renderer: Cloud Run Job, Queue and Artifact Pipeline

> ⚠️ **El deployable se llama `artifact-worker`, NO `tender-worker`** (Delta b · §1). Renderiza
> **catálogos** (`deck-axis` **y** `social-carousel`), no un dominio. El nombre del archivo conserva el
> slug histórico para no romper el registry; **lo canónico es lo que dice esta línea.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Epic: `EPIC-027`
- Status real: `Staging verificado end-to-end; producción explícitamente gateada`
- Rank: `P1 — cierre staging cumplido; follow-up de producción vía release control plane`
- Domain: `commercial|platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1391-artifact-worker-cloud-run-job`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Llevar el Tender Deck Composer desde su CLI local determinista a una **capability agentic de artefactos gobernada**: contexto/tools de render seguros, propuesta trazable, confirmación humana, job idempotente, outbox/cola, **Cloud Run Job** dedicado con Chromium, storage versionado de PDF/PNGs y señales operativas. Renderiza exclusivamente un `ResolvedCompositionManifest` inmutable —plan, catálogo, contratos, brand pack, fuentes, evidencia/requisitos y validación semántica fijados—; no recrea templates ni introduce LLM en el render.

La autorización excepcional de EPIC-027 para este deployable ya fue registrada y la foundation `Proposal` existe. El rollout staging, los renders reales de 15/25 láminas y el benchmark ya quedaron verificados; Production sigue deliberadamente gateada por el release control plane y sign-off. Registrar esa frontera evita convertir `ops-worker` o una route Vercel en un renderer pesado.

## Why This Task Exists

El composer actual ya prueba el camino `DeckPlan → selector → slot-fill → Chromium → PDF` y compone cuatro láminas SKY en local, pero es un CLI con filesystem local. No persiste jobs, no tiene cola ni backpressure entre decks, no guarda artefactos en el asset store, no ofrece un command/read model ni posee despliegue Cloud Run. El render abre Chromium, compone PNG y PDF por slide y fusiona con `pdf-lib`; es correcto para fidelidad AXIS pero necesita aislamiento de CPU/RAM y una operación reproducible antes de atender varias licitaciones concurrentes.

Como capability agentic, tampoco basta con exponer un endpoint de render: un agente debe poder leer el snapshot autorizado, constraints del RFP y estado de artefactos, proponer un `ProposalRenderProposal` verificable y explicar sus bloqueos. La confirmación humana invoca el mismo command que API/CLI; el agente jamás encola un job, llama `jobs.run`, publica un PDF ni suplanta el gate de audience.

La arquitectura ya determina que el render pesado vive en `artifact-worker` como **Cloud Run Job de una tarea por deck**, y **nunca** en `ops-worker`, Vercel ni un service HTTP de larga duración. La excepción de frontera de EPIC-027 está documentada; el staging y benchmark están cerrados y el único gate operacional restante es Production, por release control plane y sign-off.

## Goal

- Exponer el render de un `DeckPlan` confirmado como command/reader gobernados, idempotentes y auditables; el PDF sigue siendo derivado, no source of truth.
- Ejecutar renders asíncronos en un Cloud Run Job dedicado con Chromium, job/outbox y límites explícitos de recursos/concurrencia.
- Persistir PDF, previews PNG y metadata/provenance como artefactos versionados, con tamaño máximo como gate de admisibilidad y recovery por replay del plan fijado.
- Persistir el `ResolvedCompositionManifest` junto al job/output, incluyendo hashes de catálogo/template/contrato/brand pack/fuentes, resultado de validadores semánticos y referencias allowlisted de evidencia/requisitos. Un PDF no es reproducible ni auditable si sólo conserva slots sueltos.
- Obtener evidencia staging de correctness, aislamiento, throughput, memoria y rollback antes de cualquier activación productiva.
- Exponer contexto/tools y `ProposalRenderProposal` agent-safe: propuesta con snapshot, preflight, constraints, estimación de recursos y bloqueos; confirmación humana para ejecutar el command canónico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (§5-ter, Q3 y §10)
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
- `docs/architecture/tender-deck-composer-prototypes/CONTEXTUAL_VISUAL_SLOT_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Chromium/Playwright es el motor de deck;** `pdf-lib` sólo ensambla PDFs por lámina. `react-pdf` y PPTX no sustituyen el renderer primario.
- **Nunca** LLM, red de generación, reloj ni selector agéntico dentro de selector, slot-fill, render o ensamblado. El input reproducible es el `DeckPlan` confirmado y sus versiones de template/assets.
- **Nunca** ejecutar el renderer en Vercel ni `ops-worker`; `artifact-worker` es la frontera de despliegue dedicada, autorizada por excepción documentada de EPIC-027.
- `DeckPlan`, template versions y asset references se fijan antes de encolar; el worker no reescribe copy, claims, evidencia ni assets.
- El worker acepta sólo un `ResolvedCompositionManifest` producido por TASK-1393 y confirmado contra Proposal/TASK-1392. Rechaza un plan mutable, una plantilla escogida por el autor, contrato/font/asset sin hash, evidencia sin referencia allowlisted o un reporte de validación semántica fallido.
- `PersonaAsset` y `EvidenceAsset` mantienen sus políticas de origen. `ContextualVisualSlot` no habilita generación runtime en esta task.
- Todo write entra por primitive/command con capability, idempotencia, audit y errores sanitizados; UI, Nexa, MCP y API son consumers, no implementaciones paralelas.
- El agente consume únicamente readers/context allowlisted y tools sobre primitives; `ProposalRenderProposal` es trazable/evaluable y **nunca** equivale a ejecutar/encolar/publicar. No crear framework/SDK de agentes, prompt con writes ni tool de acceso directo a Cloud Run/DB/storage.
- El PDF es un artefacto de diseño y de licitación: conserva el layout HTML AXIS, relación 16:9, safe areas, fuentes y assets aprobados. Un PDF técnicamente válido pero con fallback tipográfico, asset ausente, crop incorrecto o contenido recortado **no pasa** la revisión.
- Formato, tamaño, páginas y demás requisitos conocidos del RFP derivan del requisito-set de esa `Proposal`; cuando el requisito es conocido, el job falla cerrado antes de marcar un deck como client-facing. La exportación nunca sube ni presenta la oferta.
- 🔴 **NUNCA** un artefacto `client_facing` puede contener **una sola** referencia de evidencia `audience: internal`. Los insumos internos llevan **loaded cost y piso de negociación**: colarlos en el PDF es **entregarle a la contraparte nuestra estructura de costos**. El `audience` viaja **por referencia** en el manifest, no sólo en el artefacto; el job **falla cerrado** (`audience_violation`) **antes** de renderizar. *(Delta b · §6.)*
- ⚠️ **La accesibilidad es parte del requisito-set, no una cortesía.** `Chromium print-to-PDF` emite un PDF **SIN taguear** — no es configuración, **es el motor**: esta arquitectura **no puede** producir PDF/UA. Si el requisito-set declara accesibilidad (Section 508 / EAA / PDF/UA), el job **falla cerrado**. **Mejor no ofertar que entregar un artefacto inadmisible.** La limitación se declara explícita en spec y runbook. *(Delta b · §4.)*
- **La QA visual del artefacto tiene que ser MECÁNICA, no sólo humana.** En régimen **nadie mira cada render** — y la doctrina del composer (*"los tests verdes NO son el gate: mirar los frames"*) **muere el día que esto se automatiza** salvo que se vuelva un gate. `assertSlideFitsCanvas` cubre geometría; **NO** cubre fallback tipográfico, asset ausente ni lámina en blanco. *(Delta b · §7.)*
- **La cola NUNCA es FIFO ciega, y la prioridad NUNCA va sin guard de aging.** Un batch social no puede hambrear un bid con deadline duro; y **prioridad sin aging es hambruna con otro nombre** (el batch social no correría nunca). *(Delta a · §3 + Delta b · §5 → Slice 2b.)*

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `.codex/skills/design-studio/modules/04_KEY_VISUAL_SYSTEMS.md` y `modules/10_FORMATS_DELIVERY.md` (QA de master→derivado y especificación de entregable; no autoriza rediseñar templates)
- `.codex/skills/greenhouse-public-private-tenders/bid-construction-playbook.md` (Fases 1 y 9–10: admisibilidad/formato antes de empaquetar y presentación humana)

## Dependencies & Impact

### Depends on

- `EPIC-027` — debe autorizar `artifact-worker` como siguiente deployable, o documentar la excepción antes de crear `services/artifact-worker/`.
- Foundation runtime del aggregate `Tender`, `proposal_assets` y capabilities `commercial.tender.*` descritas como Proposed en `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`; confirmar la task dueña o crearla antes de aplicar una migración.
- `TASK-1392` — Tender Proposal Studio F0 agentic: provee aggregate, assets/audience, context/tool contracts, propuesta/confirmación humana y el handoff que el render agent consume.
- `TASK-1393` — Artifact Composer: provee catálogo `deck-axis`, `CompositionPlanInput`/`ResolvedCompositionManifest`, selector derivado, contratos/versiones, validadores semánticos y font pack hermético. No se cablea el worker al shape histórico de `DeckPlan`.
- Requisito-set `tender_requirements` del aggregate Tender: el job de packaging consume constraints de formato/peso/páginas reales, no un límite global supuesto.
- Composer F1 materializado: `src/lib/commercial/tenders/deck/{compose,contracts,render,selector,validate}.ts` y `scripts/commercial/compose-tender-deck.ts`.
- Asset store canónico `src/lib/storage/greenhouse-assets.ts`; confirmar su contrato de escritura/versionado antes de adjuntar outputs.
- Patrones de Cloud Run/WIF/deploy existentes en `services/ops-worker/`, `services/commercial-cost-worker/` y `services/_shared/`.

### Blocks / Impacts

- Runtime F2 del Tender Proposal Studio: `commercial.tender.package` podrá producir deck client-facing sin bloquear el portal ni el outbox.
- Futuro UI/Nexa/MCP de Tender Proposal Studio; queda deliberadamente fuera de esta foundation backend-data.
- El `ContextualVisualSlot` posterior consume el mismo asset/provenance path, pero no genera activos dentro de este scope.

### Files owned

> ⚠️ **Paths post-`TASK-1393` (Delta b · §2).** El motor **ya no vive** en
> `src/lib/commercial/tenders/deck/**`. Tomar la task con los paths viejos cablea el home equivocado.

- `src/lib/artifact-composer/**` — **el motor** (post-TASK-1393). Esta task lo **consume**, no lo reescribe
- `src/lib/commercial/proposals/**` — commands/readers/job contracts, render context/tools/proposal/evals del agente (aggregate **`Proposal`**, no `Tender` — Delta a · §4)
- `src/lib/storage/greenhouse-assets.ts` y sus tests, sólo si el contrato existente necesita una extensión compatible
- `services/artifact-worker/**` — **nuevo Cloud Run Job** (⚠️ **`artifact-worker`, NO `artifact-worker`** — Delta b · §1: el worker renderiza **catálogos**, no un dominio). Condicionado al gate EPIC-027
- `services/artifact-worker/deploy.sh` — **SoT del flag en Cloud Run** (Delta b · §10)
- `services/_shared/**` (sólo helpers Cloud Run reutilizables)
- `.github/workflows/artifact-worker-deploy.yml` y deploy script asociado (nuevos, si el worker es autorizado)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — fila del flag, **en el mismo PR**
- `migrations/*-task-1391-artifact-render-jobs.sql` (nuevo, sólo si la foundation `Proposal` ya existe)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`, runbook y docs de operación relacionados

## Current Repo State

### Already exists

- `composeDeck()` lanza Chromium una vez por deck, usa una concurrencia interna por defecto de cuatro láminas, exporta PNG + PDF por lámina y fusiona con `pdf-lib`.
- El renderer valida contratos, espera tipografías, rechaza slots fuera del canvas y preserva el orden de slides.
- El renderer exporta el HTML real de cada template: PNG de revisión y PDF vectorial por lámina; no rasteriza el deck ni reconstruye el diseño con un segundo motor.
- El CLI `pnpm deck:compose` compone ejemplos locales; el plan SKY de cuatro láminas generó un PDF de 1,1 MB en 2,33 s en la revisión 2026-07-12.
- Existen patrones productivos de Cloud Run, WIF, Sentry, `source_sync_runs`, deploy scripts y helpers de Secret Manager; no existe `services/artifact-worker/` ni un Cloud Run Job de render.
- Las fuentes de las plantillas todavía se cargan desde Google Fonts, por lo que el render no es hermético y debe resolverlo antes de depender de un worker sin red pública.

### Gap

- No existe aggregate/tabla runtime de Tender ni jobs de deck persistidos; la arquitectura de Tender Proposal Studio sigue Proposed fuera del carril determinista F1.
- No existe cola/backpressure, command/reader, capability/grant, storage de outputs, render context/tools/proposal/evals del agente, reintentos, señales ni runbook para renders.
- No existe empaquetado/benchmark de Playwright Chromium para Cloud Run, ni evidencia de resource envelope para decks de 25 láminas.
- El límite de 20 MB de `composeDeck()` hoy sólo advierte; en licitaciones debe convertirse en condición de fallo o en una decisión explícita por RFP antes de publicar el artefacto.
- No existe un manifest persistido que demuestre qué catálogo, contrato, fuente, validadores, evidencia y constraints produjeron un PDF; sin él un replay puede cambiar silenciosamente tras actualizar una plantilla.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/commercial/tenders/deck/**` y los patrones Cloud Run existentes bajo `services/**`
- Future candidate home: `worker`
- Boundary: command/reader/context/tools de render de Tender y job contract; consumers autorizados son Proposal Render Agent, packaging de Tender, API Platform, Nexa/MCP, CLI operativa y el Cloud Run Job `artifact-worker`; ninguno llama Chromium directamente salvo el job.
- Server/browser split: contratos/DTOs browser-safe si un consumer futuro los necesita; persistence, asset store, Playwright/Chromium, Cloud Run auth y provider SDKs permanecen server-only.
- Build impact: nuevo Cloud Run Job condicionado, imagen Chromium/Playwright, Dockerfile, workflow WIF, filesystem temporal efímero y assets/fonts empaquetados.
- Extraction blocker: `none` — frontera `artifact-worker` autorizada por excepción de EPIC-027; el aggregate `Proposal`, sus capabilities y el contrato de render ya existen. Pendiente únicamente el rollout remoto y benchmark de staging.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `ResolvedCompositionManifest` confirmado + snapshots de catálogo/template/brand pack/font/evidencia/requisitos; job/audit de render y artefactos Proposal a materializar bajo `greenhouse_commercial` [verificar schema/table exactos al existir Proposal].
- Consumidores afectados: Proposal Render Agent, Cloud Run Job, dispatcher/outbox, Tender packaging command, API Platform, CLI operativa, futuros UI/Nexa/MCP y asset store.
- Runtime target: `local + staging + production Cloud Run Job`.

### Contract surface

- Contrato existente a respetar: `CompositionPlanInput`/`ResolvedCompositionManifest` del Artifact Composer, `compose()`, asset store canónico, `ProposalEvidenceRef` y API Platform command ledger.
- Contrato nuevo o modificado: `ProposalRenderContext`, tools/readers allowlisted, `ProposalRenderProposal`, command de confirmación/ejecución de render; reader de estado/artefactos; job record append-only con hash del manifest + versiones; evento/signal de éxito, fallo, retry, sobrepeso, evidencia o validación semántica rechazada.
- Backward compatibility: `additive and gated`; el CLI local continúa funcionando y no muta jobs productivos.
- Full API parity: Proposal Render Agent, `commercial.tender.package` o su primitive de render llaman el mismo command; API/CLI/Nexa/MCP no reciben rutas especiales ni acceso directo a tablas/Cloud Run.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.proposals`, `proposal_assets` y job/audit de render [verificar nombres y migración dueña antes de aplicar].
- Invariantes que no se pueden romper:
  - Mismo `ResolvedCompositionManifest` canónico + mismas versiones de catálogo/template/contrato/brand pack/fuentes/assets/evidencia = mismo artefacto lógico; un replay no vuelve a autorizar ni altera slots.
  - El selector ya está resuelto por catálogo: un job nunca recibe ni respeta un `template` escogido por un agente/consumer.
  - Toda regla semántica requerida por `deck-axis` pasa antes de encolar (pricing, staffing, requisitos, evidencia/atribución); el worker persiste el reporte y falla cerrado ante cualquier violación.
  - Sólo un render activo por clave de idempotencia; retries reutilizan el plan fijado y nunca generan un segundo asset final silencioso.
  - Ningún PDF/PNG se publica como `client_facing` sin aprobación humana y sin cumplir el límite de formato/peso del RFP.
  - Cuando el RFP declara tipo, peso, páginas u otro requisito de archivo, el job lo persiste como constraint de ese snapshot y falla cerrado si el output no lo cumple; nunca sustituye el requisito por el default global de 20 MB.
  - Un fallo de una lámina o un peso excesivo deja el job fallido/recuperable, nunca un deck parcial publicado.
  - `ops-worker` y Vercel no ejecutan Chromium para este dominio.
  - 🔴 **El `audience` viaja POR REFERENCIA, no sólo por artefacto.** Un artefacto `client_facing` con **una sola** referencia de evidencia `audience: internal` produce `audience_violation` y **no se renderiza**. *(Los insumos internos llevan loaded cost y piso de negociación: colarlos en el PDF es entregarle a la contraparte nuestra estructura de costos.)*
  - **El requisito-set incluye ACCESIBILIDAD.** Si el RFP la exige (Section 508 / EAA / PDF/UA), el job **falla cerrado**: `Chromium print-to-PDF` emite PDF **sin taguear** y **el motor no puede** producir PDF/UA.
  - **El `deadline` de la `Proposal` viaja FIJADO en el job**, no se re-lee al despachar (un deadline mutable haría no determinista la prioridad). Una propuesta con **deadline vencido** no compite por prioridad.
  - **La QA visual es un GATE mecánico**, no una revisión humana opcional: fallback tipográfico, asset ausente (`naturalWidth > 0` en todo `<img>` del contrato) y lámina en blanco **bloquean** la publicación.
  - El agente sólo propone usando plan/asset/constraint permitidos; no encola, invoca `jobs.run`, ejecuta Chromium ni publica artefactos.
- Tenant/space boundary: el command deriva actor, `proposalId`, cliente/space y audience desde el aggregate Tender; worker recibe un job autenticado, no IDs arbitrarios del request.
- Idempotency/concurrency: **clave canónica ÚNICA — `hash(ResolvedCompositionManifest) + proposalId + artifactPurpose`.** ⚠️ El manifest **ya contiene** los hashes de catálogo/template/contrato/brand pack/fuentes/assets: **repetirlos en la clave duplica la verdad** (y la definición vieja usaba `DeckPlan`, un shape que ya no existe). **No pueden convivir dos definiciones de la clave en esta spec** *(Delta b · §8)*. Lock/unique constraint transaccional. Una ejecución de Cloud Run Job procesa **un deck** (`tasks=1`, `parallelism=1`) mientras el renderer mantiene concurrencia interna benchmarkeada. ⚠️ **Ese envelope es correcto para `pdf-merged` (deck) y probablemente NO para `png-set`** (30 carruseles = 30 cold starts de Chromium): ver Open Question de batch.
- Audit/outbox/history: transiciones append-only del job, API Platform command ledger, metadata del asset, trace/tool calls/outcome del agente y reliability signals para queue lag, fallo/retry, geometry failure y file-size rejection.

### Migration, backfill and rollout

- Migration posture: `additive`, bloqueada hasta que exista la migración del aggregate Tender; no backfill histórico de PDFs.
- Default state operacional: declarar explícitamente el flag de capability/Cloud Run Job `OFF` hasta staging smoke y aprobación de activación; el nombre/capa canónicos se fijan en Plan Mode. No asumir el default de un script como evidencia del estado remoto.
- Backfill plan: `none`; render histórico sólo bajo command humano explícito y con nueva versión de artefacto.
- Rollback path: deshabilitar flag/consumer y detener la cola; jobs pendientes permanecen auditables y los assets ya aprobados no se borran; revert PR/migración additive sólo si aún no tiene consumidores.
- External coordination: aprobación de frontera EPIC-027, provisionamiento Cloud Run Job/WIF/Secret Manager, budget/quota de Cloud Run, revisión de egress/fonts, staging deploy y sign-off para activar producción.

### Security and access

- Auth/access gate: capability fina de packaging/render/tools de Tender (registry + grant en el mismo PR); el agente hereda actor/context, invocación worker autenticada por service account/cola, no endpoint público.
- Sensitive data posture: RFP, oferta y assets pueden contener datos comerciales confidenciales; bucket/path privado, mínimos logs redaccionados, nunca URLs públicas ni contenido de slots en errores/Sentry.
- Error contract: códigos canónicos de job (`queued`, `running`, `retryable_failed`, `failed`, `completed`, `size_rejected`, `geometry_rejected` o los equivalentes aprobados), `captureWithDomain('commercial')`, sin errores crudos de Chromium/Cloud Run al caller.
- Abuse/rate-limit posture: command capability-gated, límite por Tender/actor, queue bounded, presupuesto/concurrencia de worker y circuit breaker para Chromium/asset-store; no reintento infinito.

### Runtime evidence

- Local checks: tests de command/idempotencia, render context/tools/proposal/eval fixture, worker payload/auth, renderer/geometry, cache/replay, peso y errores; Docker build/health local; `pnpm deck:compose` sobre fixture SKY.
- DB/runtime checks: migración additive aplicada en dev, unique/idempotency y audit verificados con `pnpm pg:connect`; no job duplicado bajo requests concurrentes.
- Integration checks: Proposal Render Agent propone sobre snapshot/constraints allowlisted → humano confirma → mismo command encola Cloud Run Job; staging renderiza deck de 4 y 25 láminas, sube outputs al asset store y recupera/reintenta un fallo inyectado; browser y binario Playwright deben coincidir en versión y quedar pinneados en la imagen.
- Reliability signals/logs: dashboard/lane de queue lag, dead-letter, duration/memory, over-weight and geometry rejection; Sentry `domain=commercial` sin PII.
- Production verification sequence: deploy con flag explícitamente OFF → staging smoke/benchmark → revisión humana de PDF/previews contra el template real → autorización EPIC/operador → enable limitado → un render controlado → revisar assets, audit, signals y costo → ampliar sólo si el envelope y rollback pasan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or approved runtime objects before coding starts.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit and cubiertos por tests.
- [ ] Migration/backfill/rollback posture is explicit, additive y no depende de borrar artefactos finales.
- [ ] Runtime or DB evidence is collected in staging before activar producción.
- [ ] Sensitive data has canonical errors, audit/signal posture and no raw content leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] La lógica vive en primitives server-side bajo `src/lib/commercial/tenders/**`, no en UI ni en el handler del worker.
- [ ] El render se modela como command/job gobernado, no como un click ni una URL de Cloud Run.
- [ ] Reader de estado/artefactos y command de ejecución comparten contratos, autorización fina, idempotencia, audit y errores sanitizados.
- [ ] Capability + grant se registran en el mismo PR antes de habilitar el consumer.
- [ ] Camino programático queda declarado para API Platform/CLI; Nexa/MCP consumen el mismo primitive cuando se habiliten.
- [ ] El write respeta `propose → confirm → execute`; el worker sólo ejecuta un job confirmado.
- [ ] No existe lógica duplicada por UI/API/Nexa/MCP/worker/CLI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa sólo al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

## Plan Mode — Slice 0 CERRADO (2026-07-12)

### 🚪 Gate de frontera: AUTORIZADO por excepción documentada

**Decisión del operador (2026-07-12):** el deployable `artifact-worker` (primer Cloud Run **Job**;
imagen Playwright/Chromium pinneada) queda autorizado por la vía de excepción que esta task contempla
(línea "o documentar la excepción"), sin esperar la vía ordinaria (pilot Labs TASK-1382 + rebaseline
30 días). Registro: `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` → Delta 2026-07-12 (evidencia
de costo/auth/rollback/ownership) + EPIC-027 (child + exit criterion parcial) + `DECISIONS_INDEX.md`.
Producción sigue OFF hasta staging smoke + sign-off.

### Benchmark baseline (Slice 0, local M-series)

| Plan | Wall | PDF | RSS node |
|---|---|---|---|
| SKY 15 láminas (fixture real) | 4,37 s | 3,2 MB | ~250 MB |
| 25 láminas (SKY + 10 reales repetidas) | 6,20 s | 5,6 MB | ~260 MB |

Chromium corre como proceso hijo (RSS no incluido); envelope contenedor se mide en staging.
Punto de partida del Job: **2 CPU / 2 GiB / timeout 900 s / tasks=1 / parallelism=1**.

### Envelope de capacidad inicial — hipótesis operacional, no SLO

- **Operación cómoda inicial:** **10–15 jobs/h**. Da margen de recuperación mientras se observa el
  comportamiento real de Chromium y de los reintentos.
- **Techo actual de admisión:** **30 jobs/h**, porque el dispatcher actual corre una vez cada dos
  minutos y lanza como máximo un job por tick. Sobre ese ritmo sostenido, la cola crece.
- Un *job* es un deck o, para un catálogo futuro como `social-carousel`, un lote que su propio command
  haya definido. No se atribuye capacidad a `png-set` ni se sube `tasks`/`parallelism` hasta medirlo.
- Los benchmarks locales (15/25 láminas) y el E2E SKY de 29,9 s **no** miden el RSS total de Chromium,
  cold start, concurrencia ni costo de Cloud Run. El benchmark de staging debe cubrir 4 y 25 láminas,
  retry/fallo inyectado, RSS/cold start/costo y el comportamiento de cola antes de recalibrar este
  envelope.

### Decisiones de diseño congeladas (Slice 0)

1. **Tabla:** `greenhouse_commercial.proposal_render_jobs` (additive; estados CHECK + historial
   append-only `proposal_render_job_events`; UNIQUE parcial de idempotencia sobre jobs activos).
2. **Clave de idempotencia (canónica, única):** `manifest_hash + proposal_id + artifact_purpose`
   (el manifest ya sella catálogo/template/contrato/brand pack/fuentes).
3. **El manifest del composer sigue domain-free.** El `audience` por referencia de evidencia viaja
   en el JOB (columnas/jsonb propios), no dentro de `ResolvedCompositionManifest` — contaminarlo
   violaría el ADR del composer. El gate reusa `assertEvidenceAllowedForAudience`.
4. **Enqueue exige un `ResolvedCompositionManifest` YA resuelto** (producido por `resolvePlan` en
   CLI/tooling); el comando valida hashes + audience + constraints y persiste. El worker re-resuelve
   contra su copia del catálogo y VERIFICA igualdad de hashes antes de renderizar (drift = fallo).
5. **Dispatcher:** Cloud Scheduler (\*/2 min) → endpoint autenticado en `ops-worker`
   (`/artifact-render/dispatch`) que hace la selección por prioridad y llama `jobs.run` (~200 ms,
   NO render — el invariante "ops-worker no ejecuta Chromium" se respeta). Cloud Tasks rechazado
   (segundo source of truth sin necesidad al volumen actual).
6. **Prioridad:** deadline asc (fijado en el job) + aging con techo; deadline vencido no compite ni
   se despacha; todo job pospuesto se loguea; signal `artifact.render.queue.starvation`.
7. **Flag:** `ARTIFACT_RENDER_JOBS_ENABLED` — multi-runtime (Vercel enqueue · ops-worker dispatch ·
   worker), SoT Cloud Run = `services/artifact-worker/deploy.sh`, fila en el ledger en el mismo PR.
8. **Capability:** `commercial.proposal.render` (actions: propose/execute/read/retry) + grants
   ADMIN/ACCOUNT en el mismo PR; entitlement per-ORG = el mismo `proposal_studio_v1` de F0.
9. **Constraints del RFP:** helper `extractRenderConstraints(requirements)` → `{maxPdfMb, formats,
   maxPages, accessibilityRequired}` con detección conservadora (PDF/UA · 508 · EAA · WCAG ·
   accesib*); `accessibilityRequired=true` ⇒ fail-closed al encolar Y en el worker (Chromium
   print-to-PDF no emite PDF taggeado — limitación declarada en spec/runbook).
10. **Peso:** el warning de `composeArtifact` se promueve a outcome `size_rejected` en el job
    usando el constraint del RFP (default 20 MB si el RFP no declara).


<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Gate de frontera y contrato de job

- Confirmar que EPIC-027 autoriza el deployable `artifact-worker` y que la foundation `Tender`/`proposal_assets` tiene task/owner/materialización suficiente; si falta, dejar esta task bloqueada y crear/ligar el predecessor, sin crear el servicio.
- Decidir y documentar command/reader, tabla(s) additive, key de idempotencia, asset/version/audience contract, capability/grant, flags y ruta de cola; revisar si un ADR incremental es necesario antes de migrar.
- Medir baseline local de 4 y 25 láminas: duración, RSS, tamaño, recursos de Chromium y comportamiento ante timeout/fallo.

### Slice 1 — Job persistente, commands y artefactos

- Implementar primitive server-side de request/confirm/execute/retry/read sobre el `ResolvedCompositionManifest` fijado; agregar migración additive/audit/outbox sólo después de que el aggregate Proposal exista.
- Implementar `ProposalRenderContext`, tools/readers allowlisted y `ProposalRenderProposal` con preflight de snapshot de catálogo/contratos/fuentes, assets/evidencia/requirements/constraints y validadores semánticos; guardar trace/eval sin contenido confidencial del RFP.
- Conectar confirmación humana de la propuesta al mismo command idempotente; la propuesta nunca escribe un job ni tiene acceso a dispatcher/Cloud Run/storage.
- Integrar asset store para outputs privados/versionados; preservar `audience`, provenance, hash, manifest completo, referencias de evidencia permitidas y las constraints del requisito-set (peso, páginas, tipo/formato cuando existan) como gates de publicación.
- Convertir el warning de peso en outcome gobernado (`size_rejected` o equivalente) cuando el requisito de formato aplique; no publicar PDF parcial o sobrepeso.
- 🔴 **Gate de `audience` sobre la EVIDENCIA** (Delta b · §6): el manifest lleva el `audience` de **cada** referencia; un artefacto `client_facing` con **una sola** referencia `internal` produce `audience_violation` y **no se renderiza**. **Test que lo prueba con un insumo real que lleve loaded cost.**

### Slice 1b — La QA visual se vuelve MECÁNICA (o muere al automatizarse)

**La doctrina del composer —*"los tests verdes NO son el gate: mirar los frames"*— sólo funciona si hay
alguien mirando. En régimen no lo hay.** Estos detectores son lo que la reemplaza. **Sin ellos, el
pipeline automatiza la producción de un artefacto que puede mentir, y nadie lo revisa.**

| Detector | Cómo | Outcome |
|---|---|---|
| **Fallback tipográfico** | render de control con la familia bloqueada → si el output es **idéntico**, la fuente **nunca se aplicó** | `font_fallback_detected` |
| **Asset ausente** (imagen 404 → caja vacía) | assert de que **todo `<img>` del contrato resolvió** (`naturalWidth > 0`) | `missing_asset` |
| **Lámina en blanco / casi vacía** | umbral de densidad de píxeles no-fondo por lámina | `blank_slide` |
| **Copy del prototipo** (1ª bug class) | ya cubierto por el **fail-closed del filler** → **verificar que sobrevivió al move de TASK-1393** | aborta la lámina |

- `assertSlideFitsCanvas` (geometría) **ya existe y se conserva**: estos detectores lo **complementan**, no lo reemplazan.
- Los cuatro son **gates de publicación**, no advertencias.

### Slice 2 — `artifact-worker` Cloud Run Job y empaquetado Chromium

- Crear el Cloud Run Job `artifact-worker` sólo si Slice 0 autorizó la frontera; reutilizar Docker/WIF/Sentry/secret-IAM helpers canónicos. El dispatcher autenticado invoca `jobs.run`; el Job no publica endpoint HTTP de render.
- Empaquetar los snapshots de catálogo/templates, brand pack y font pack ya verificados por TASK-1393; el worker comprueba hashes y bloquea egress de fuentes. Fijar la imagen y el binario de Playwright a la misma versión; no usar tags flotantes.
- Consumir jobs desde outbox/cola con una ejecución/tarea por deck (`tasks=1`, `parallelism=1`); la concurrencia interna de páginas se configura sólo desde benchmark, no por suposición. Cloud Tasks queda fuera del render directo y sólo se considera si el dispatcher necesita backpressure dedicado.

### Slice 2b — La cola con PRIORIDAD y guard de inanición (la regla del Delta (a) por fin tiene dueño)

**El Delta (a) declaró que la cola NUNCA puede ser FIFO ciega. Ningún slice la entregaba. Este sí.**

Los perfiles de carga son **opuestos**: un deck de licitación es **raro y con deadline duro** (si no
entra hoy, **se pierde el proceso**); un lote de 30 carruseles es **frecuente y sin urgencia**.

- **El `deadline` es dato de primera clase.** Sale del aggregate `Proposal` y viaja **fijado en el job**
  (no se re-lee al despachar: un deadline mutable haría no determinista la prioridad).
- **Prioridad por catálogo + deadline.** Un job con deadline próximo gana. Un batch social nunca hambrea
  un bid que vence mañana.
- ⚠️ **Guard de inanición (aging) — la mitad que todos olvidan.** **Prioridad sin *aging* es hambruna con
  otro nombre**: sin él, el batch social **no corre nunca**. Todo job gana prioridad con el tiempo en
  cola, con un techo.
- **Invariante:** una propuesta cuyo **deadline ya venció** no compite por prioridad (y probablemente no
  se encola: rendir un deck para un proceso cerrado es quemar CPU y confundir al operador).
- **Los pesos se fijan con datos reales de carga, no a ojo** (regla del ADR). Hasta tener datos: prioridad
  simple por deadline + aging, y **`log()` explícito de todo job pospuesto** — un descarte silencioso es
  la peor falla posible acá.
- **Signal:** `artifact.render.queue.starvation` (job en cola por encima del umbral sin ejecutarse).

### Slice 3 — Resilience, observabilidad y rollout staging

- Implementar retries acotados, dead-letter/recovery manual, signals y runbook para outbox/dispatcher, Cloud Run Job, Chromium, geometry, peso, asset-store y timeout.
- Desplegar staging con flag OFF; ejecutar smokes de 4/25 láminas, repetición idempotente, caída inyectada y revisión visual humana del output. La muestra debe cubrir templates split/full-bleed y verificar safe areas, burbuja/firma fija, tipografía, crops y ausencia de placeholders.
- Activar de forma limitada sólo con aprobación humana; registrar envelope de costo/latencia/memoria y rollback probado.

## Out of Scope

- UI de Tender Proposal Studio, dashboard de jobs, wireframes, GVC o copia visible (task `ui-ux` posterior).
- Construir el aggregate completo de Tender, ingestión/análisis de RFP, matriz de admisibilidad, cotización, HubSpot o submit de la oferta.
- LLM authoring, selector agéntico, generación runtime de `ContextualVisualSlot`, imágenes IA o asset creative workflow.
- Ejecución autónoma del render por un agente, acceso de tools a `jobs.run`/Cloud Run/DB/storage, o un prompt que evite la confirmación humana.
- Cambiar la taxonomía, los templates AXIS, la composición visual o añadir renderer PPTX/`react-pdf`.
- Decidir o implementar variantes visuales de `deck-axis` (portada contextual, nota de evidencia, capacidad del squad, ciclo con feedback, tabla paginada). Esta task sólo ejecuta el catálogo/versiones ya confirmados.
- Generalizar este renderer contractual para carruseles, posts, stories u otros formatos de social media. La futura abstracción cross-format vive en Efeonce Creative Studio (EPIC-028); un bridge posterior consume/produce contratos versionados y no cambia el ownership Tender de RFP, `audience`, admisibilidad ni artifacts.
- Crear el worker si EPIC-027 no autoriza la frontera o si no existe source of truth Tender suficiente.

## Detailed Spec

La ruta de ejecución esperada es `ProposalRenderContext/tools → ProposalRenderProposal → human confirm → persist immutable job + RFP constraints → outbox dispatcher → authenticated jobs.run → Cloud Run Job artifact-worker (1 deck) → composeDeck(plan) → validate geometry/formato/peso → private asset-store writes → audit/status reader`. El job puede reintentar sólo el mismo snapshot de plan; una edición de contenido/template/asset crea una nueva clave y una nueva versión de artefacto. El agente no puede saltarse ningún borde de este flujo.

La exportación conserva el sistema visual de las plantillas; el renderer no introduce un “fallback estético”. Todo preview y PDF pasa una revisión de composición sobre el output real antes de ser elegible como client-facing. Plan Mode debe decidir si el outbox existente basta o requiere Cloud Tasks sólo para backpressure del dispatcher, definir el modelo de operación de los artefactos temporales y confirmar las tablas reales. No se acepta una route Vercel de larga duración, un endpoint Cloud Run público de render, ni polling que redisponga Chromium por cada consulta de estado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST cerrar antes de crear migraciones, capabilities, service account, Dockerfile o `services/artifact-worker/`.
- Slice 1 (snapshot/job/audit) MUST cerrar antes de Slice 2 (Cloud Run Job consume); el job nunca recibe `DeckPlan` mutable desde un request.
- Slice 2 MUST cerrar antes de Slice 3 (dispatcher/signal/rollout); no activar un Cloud Run Job que no pueda reportar/recoverar fallos.
- Producción permanece OFF hasta evidencia staging de los tres slices y autorización explícita.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Chromium agota RAM/CPU o excede timeout | Cloud Run Job | medium | una tarea/ejecución por deck, benchmark 4/25, timeout y paralelismo configurados, outbox bounded | queue lag, duration/memory threshold, dead-letter |
| PDF incompleto, recortado o fuera de peso | artefacto/admisibilidad | medium | geometry gate, validation-before-publish, hard size outcome, revisión PNG/PDF | geometry/size rejection |
| Duplicado de render o asset final | DB/asset store | medium | unique idempotency key + audit transaccional + retry del mismo snapshot | duplicate-key/retry signal |
| Agente propone/ejecuta con contexto no autorizado | agent/tools | medium | context allowlist, output schema, eval fixture, actor inheritance y confirmación humana | proposal/tool trace anomaly, blocked confirmation |
| Filtración de RFP/slot content | storage/logs/Sentry | low | private paths, worker auth, redacción, sin URLs públicas | security audit/Sentry review |
| PDF visualmente degradado pese a ser válido | deck/brand/admisibilidad | medium | fuentes/assets herméticos, geometry + constraints gate y revisión de previews reales | missing-asset/font-fallback/visual-QA rejection |
| Nuevo deployable elude EPIC-027 | platform/release | medium | Slice 0 es gate bloqueante; revisión ADR/EPIC antes de crear service | task/EPIC review bloquea rollout |
| Fonts/red externa vuelve no determinista el PDF | worker/render | medium | empaquetar fuentes y bloquear egress antes de activar | render smoke offline/font fallback failure |
| 🔴 **Una referencia de evidencia `internal` (loaded cost / piso de negociación) termina dentro de un artefacto `client_facing`** → le entregamos a la contraparte **nuestra estructura de costos** | artefacto / comercial | **medium** | el manifest lleva el `audience` de **cada** referencia; **un `client_facing` no puede contener NI UNA `internal`** → `audience_violation`, **falla cerrado antes de renderizar** (Delta b · §6) | `audience_violation`; auditoría de refs del manifest |
| 🔴 **El RFP exige accesibilidad (PDF/UA · Section 508 · EAA) y el renderer NO la puede entregar** — `Chromium print-to-PDF` emite PDF **sin taguear**; no es configuración, es el motor | artefacto / admisibilidad | **low hoy, alta si aparece** | accesibilidad **entra al requisito-set**: si el RFP la exige, **falla cerrado** (mejor no ofertar que entregar algo inadmisible). Limitación **declarada** en spec + runbook. Revisit: evaluar `outputTarget` taggeable (Delta b · §4) | requisito de accesibilidad detectado en el requisito-set → job rechazado |
| **Un batch social hambrea un deck con deadline duro** (o, al revés, la prioridad hace que el batch social **no corra nunca**) | cola / comercial | **high sin Slice 2b** | **Slice 2b**: prioridad por catálogo+deadline **+ guard de aging**. **Prioridad sin aging es hambruna con otro nombre** | `artifact.render.queue.starvation`; deck que no se rindió antes del cierre |
| **La QA visual sólo existe como revisión humana** → al automatizar, **nadie mira los frames** y un artefacto degradado (fuente en fallback, asset ausente, lámina vacía) llega al cliente | artefacto / marca | **high en régimen** | **detectores mecánicos** (font-fallback, `naturalWidth>0` de todo `<img>` del contrato, densidad mínima por lámina) + fail-closed del filler verificado post-move (Delta b · §7) | `font_fallback_detected` · `missing_asset` · `blank_slide` |
| **El flag se prende sólo con `--update-env-vars` y el siguiente deploy lo borra en silencio** (los `deploy.sh` usan `--set-env-vars` destructivo) | Cloud Run / rollout | **medium** | flag declarado en `services/artifact-worker/deploy.sh` (**SoT**) **+** aplicado en vivo; fila en el `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR | revisión activa sin la var; consumer registrando `skip: flag OFF` |

### Feature flags / cutover

- Flag de capability/Cloud Run Job del Artifact Renderer y del Proposal Render Agent: default OFF; nombre, owner, ledger y eval fixture se fijan en Slice 0 para no crear una variable duplicada.
- ⚠️ **Prender un flag acá es MULTI-RUNTIME, y en Cloud Run el SoT es el `deploy.sh`** *(Delta b · §10)*:
  - Declararlo en **`services/artifact-worker/deploy.sh`** — los `deploy.sh` usan `--set-env-vars`, que es **destructivo** y **borra toda var agregada out-of-band**.
  - **Y además** aplicarlo en vivo (`gcloud run services update … --update-env-vars`) para efecto inmediato.
  - **Hacer sólo lo segundo = el flag desaparece en el próximo deploy, en silencio.** Verificar en la **revisión activa** + ejercitar el flujo real.
  - **Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el MISMO PR** — `pnpm docs:closure-check` **falla** si un `*_ENABLED` no está registrado.
- El CLI local sigue disponible para fixtures y no activa jobs productivos.
- Cutover: staging OFF → smoke worker autenticado → revisión humana → enable limitado por Tender autorizado → verificación signals/costo → expansión explícita.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | Mantener `to-do/blocked`; no se crean recursos | inmediato | sí |
| 1 | Flag OFF, detener encolado y revertir PR; migración additive se conserva si ya tiene audit | < 10 min | sí |
| 2 | Detener nuevas ejecuciones/deshabilitar dispatcher; jobs quedan auditables para replay | < 10 min | sí |
| 3 | Flag OFF + pausar cola + revertir revisión Cloud Run; assets finales aprobados no se borran | < 10 min | sí |

### Production verification sequence

1. Confirmar la autorización de EPIC-027 y el estado real de Tender/asset store/capabilities.
2. Aplicar migración additive y deploy staging con flag OFF; validar que sólo el dispatcher autenticado puede invocar `jobs.run` y que no existe endpoint público de render.
3. Ejecutar Proposal Render Agent sobre snapshot allowlisted; verificar propuesta/traza/eval y que el humano confirmado invoca el mismo command. Encolar un deck fixture de 4 láminas y uno de 25; verificar hash, orden, geometría, constraints de RFP, peso, assets privados, audit y reader.
4. Repetir el mismo command concurrentemente y verificar un solo job/asset final; inyectar timeout y recuperar sin cambiar el plan.
5. Revisar PDF/PNGs contra las composiciones de template (safe areas, firma, fuentes, crops y placeholders), signals, Sentry y costo/RSS; confirmar rollback de flag/cola.
6. Obtener sign-off humano y habilitar un Tender controlado; no ampliar hasta que el requisito de archivo del RFP esté validado.

### Out-of-band coordination required

- Owner de EPIC-027/Platform: autorización del deployable y presupuesto/costo de Cloud Run.
- Operador comercial: confirma qué decks/artefactos son client-facing y el límite de peso/formato por RFP.
- Owner agent/Nexa: aprueba el contrato de tools, eval fixture, traces y la separación estricta propuesta→confirmación→ejecución.
- Dirección de arte/Design Studio: aprueba la rúbrica de revisión visual de previews reales; no rediseña ni produce imágenes dentro de esta task.
- Operaciones cloud: WIF, service account, Secret Manager, outbox dispatcher/Cloud Tasks si se justifica, staging deploy y observabilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] No se crea `artifact-worker` sin autorización documentada de EPIC-027 y sin source of truth Tender/asset store confirmado.
- [x] El command fijado es idempotente, capability-gated, auditado y usable por API/CLI; no hay render directo desde UI, Vercel ni `ops-worker`.
- [x] Proposal Render Agent consume sólo contexto/tools allowlisted y genera `ProposalRenderProposal` tipada, trazable y evaluada; no encola, ejecuta Chromium, llama `jobs.run` ni publica assets.
- [x] El Cloud Run Job usa Chromium/Playwright con templates, assets y fuentes herméticos; no depende de Google Fonts/red pública para producir el PDF.
- [x] Ningún job acepta `DeckPlan` mutable ni `template` elegido por consumer: persiste y renderiza exclusivamente un `ResolvedCompositionManifest` con hashes de catálogo/template/contrato/brand pack/fuentes y reporte de validación semántica.
- [x] Las referencias de evidencia/requisitos incluidas en el manifest vienen de readers allowlisted de Proposal; evidencia faltante, no autorizada o con atribución visible requerida pero ausente produce `semantic_rejected` sin publicar artefactos.
- [x] La imagen/browser de Playwright está versionada junto con la dependencia y la ejecución queda fijada a una tarea/paralelismo por deck, respaldada por benchmark de CPU/RAM.
- [x] Cada job persiste/replaya el mismo `DeckPlan` y versiones; falla de manera visible ante geometry, timeout, assets o límite de peso, sin publicar parcial.
- [x] Cuando un RFP declara formato, peso o páginas, esas constraints quedan fijadas en el job y bloquean el `client_facing` output que no las cumpla.
- [x] Se conserva un solo artefacto final por key de idempotencia y los reintentos no duplican assets/auditoría.
- [x] Staging demuestra renders de 4 y 25 láminas, caída/retry y rollback de flag/cola; evidencia incluye duración, RSS, tamaño y revisión humana de salida que cubra split/full-bleed, safe areas, firma, tipografía, crops y placeholders.
- [x] `jobs.run` sólo admite el dispatcher autenticado, storage privado, errores sanitizados, Sentry y señales operativas pasan los gates definidos.
- [x] Se actualizan arquitectura/runbook/ledger de flags, Handoff y changelog conforme al runtime realmente entregado; cualquier paso externo pendiente queda como rollout pendiente, no como cierre falso.

**Añadidos por el Delta (b) — auditoría de rigor 2026-07-12:**

- [x] **El deployable se llama `artifact-worker`, NO `artifact-worker`** — en el service, el workflow, el
      service account y el Job. *(Renombrar después no es un rename: es un servicio nuevo + un zombi.)*
- [x] **Ningún path apunta a `src/lib/commercial/tenders/deck/**`**: el motor se consume desde
      `src/lib/artifact-composer/**` y el aggregate es `Proposal`.
- [x] **El worker NO lee ningún asset desde `docs/`.** El resolver de paths **no depende del `cwd`**
      (verificado dentro del contenedor, no sólo en local). Sin `TASK-1393 · Slice 1b`, esta task no arranca.
- [x] 🔴 **`audience` de la EVIDENCIA, no sólo del artefacto:** un artefacto `client_facing` con **una sola**
      referencia `internal` produce `audience_violation` y **no se renderiza**. Test que lo prueba con un
      insumo que lleve loaded cost.
- [x] **Accesibilidad declarada:** la spec y el runbook dicen explícitamente que **el output NO es
      PDF/UA-conforme**; si el requisito-set del RFP exige accesibilidad, el job **falla cerrado**.
- [x] **La cola NO es FIFO:** prioridad por catálogo+deadline **con guard de aging** verificado — un batch
      social no hambrea un deck con deadline, **y la prioridad no deja el batch social sin correr nunca**.
      Todo job pospuesto se **loguea** (un descarte silencioso es la peor falla).
- [x] **QA visual MECÁNICA** (no sólo humana): detectores de **fallback tipográfico**, **asset ausente**
      (`naturalWidth > 0` en todo `<img>` del contrato) y **lámina en blanco**. El fail-closed del filler
      (1ª bug class) **sigue vivo tras el move**.
- [x] **Clave de idempotencia única y canónica:** `hash(ResolvedCompositionManifest) + proposalId +
      artifactPurpose`. **No conviven dos definiciones** en la spec.
- [x] **El flag vive en `services/artifact-worker/deploy.sh`** (SoT de Cloud Run) **y** tiene su fila en
      `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.

## Verification

- Antes de implementar: `pnpm codex:task-hook TASK-1391`, `pnpm task:lint --task TASK-1391`, `pnpm qa:gates --changed --agent codex`.
- Durante: tests focales de command/job/worker/renderer/context-tools-proposal, eval fixture, `pnpm deck:compose` fixtures, Docker build y smokes de Cloud Run staging.
- Antes de cerrar: `pnpm qa:gates --changed --agent codex`, `pnpm docs:closure-check`, revisión humana de artefactos reales y evidencia runtime según el Backend/Data Contract.

## Closing Protocol

- No mover a `complete/` mientras worker, queue, asset persistence, flag/capability, staging evidence, rollback y documentación no estén sincronizados.
- Si EPIC-027 o la foundation Tender no habilitan el deployable, mantener `to-do`/`blocked` y registrar el owner/decisión; no sustituirlo por un patch en `ops-worker`, Vercel o un service HTTP de render.
- No cerrar como capability agentic si sólo existe un prompt: deben existir contexto tipado, tools sobre primitives, propuesta persistida/trazable, eval fixture y confirmación humana real.
- Cerrar con commit(s) acotados, Handoff operativo y lifecycle/registry/README actualizados.

## Follow-ups

- Task `ui-ux` dependiente para estado de render, revisión/confirmación y descarga de artefactos en Tender Proposal Studio.
- Task de runtime para `ContextualVisualSlot` sólo después de que este pipeline provea asset lineage/versioning reutilizable.
- Decisión de habilitar PPTX editable como renderer secundario sólo si un RFP concreto lo exige.

## Delta 2026-07-12 — el worker renderiza CATÁLOGOS, no "el deck" (ADR Accepted)

**ADR `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (Accepted 2026-07-12) manda sobre esta task.** Cuatro deltas:

1. **Nueva predecesora dura: `TASK-1393`** (extracción del motor a `src/lib/artifact-composer/**` + catálogos + brand pack). El worker debe renderizar **catálogos**, no "el deck". Si esta task arranca antes, cablea el nombre viejo al Cloud Run Job y hay que rehacerlo.
2. **El `outputTarget` viene del catálogo**, no del worker: `pdf-merged` (deck 16:9) | `png-set` (carrusel IG 4:5). El merge `pdf-lib` deja de ser *el* final y pasa a ser **un** target. El mismo Job sirve a los dos catálogos.
3. ⚠️ **La cola NO puede ser FIFO ciega.** Los perfiles de carga son **opuestos**: un deck de licitación es **raro y con deadline duro** (si no entra hoy, se pierde el proceso); un lote de 30 carruseles es **frecuente y sin urgencia**. **NUNCA** dejes que un batch social hambree el deck de un bid que vence mañana → la cola necesita **prioridad por catálogo/deadline**. Los pesos se fijan con datos reales de carga, no a ojo.
4. **El aggregate es `Proposal`, no `Tender`** (ver Delta de TASK-1392): el artefacto se asocia a un `proposalId`, y las tablas/assets son `proposal_*`.

**Frontera con Creative Studio (se está construyendo):** `artifact-worker` renderiza con el Composer;
**Creative Studio será consumer del paquete, nunca una reimplementación**. Foundry **genera** el pixel,
el Composer **compone** el frame.

## Delta 2026-07-12 (b) — auditoría de rigor: 3 puertas de un solo sentido y 8 gaps

> **Revisado con `arch-architect` · `greenhouse-public-private-tenders` · `deck-studio` · `design-studio`
> + product-design (2026-07-12).** La task está bien construida y su Delta (a) ya acata el ADR. Esto es
> lo que **todavía no veía**. Las tres primeras son **irreversibles una vez creado el deployable**: se
> resuelven **antes** de Slice 2, no quedan "a revisar".

### 🚪 1. El nombre es una puerta de un solo sentido → se llama **`artifact-worker`**

El Delta (a) lo dejó como *"[nombre a revisar]"*. **No puede quedar a revisar.** Renombrar un Cloud Run
service después **no es un rename**: es un servicio nuevo, con su WIF, su service account, su workflow y
su historial de revisiones — y el viejo queda de zombi.

Y el nombre **contradice al ADR que esta misma task acata**: el motor es **domain-free** y el worker
renderiza **catálogos** (`deck-axis` **y** `social-carousel`). Un worker ligado al nombre Tender que
renderiza carruseles de Instagram **hornea el dominio en el nombre del deployable** — el pecado exacto que
el ADR existe para evitar.

**Resolución: `artifact-worker`** → `services/artifact-worker/**`,
`.github/workflows/artifact-worker-deploy.yml`, service account, Cloud Run Job y el título de esta task.
**Coste hoy: cero. Coste después del primer deploy: un servicio zombi.**

### 🚪 2. `Files owned` apunta al home viejo — se contradice con su propia predecesora

Declara `src/lib/commercial/tenders/deck/**`. **TASK-1393 lo mueve a `src/lib/artifact-composer/**`.**
Quien tome la task con esos paths cablea el home viejo. **Corregido en `Files owned`.**

### 🚪 3. El worker NO puede leer sus assets desde `docs/` — y hoy lo hace

`solar-icons.ts` hace `fs.readFileSync` sobre
`docs/architecture/tender-deck-composer-prototypes/assets/solar`, **con path relativo al `cwd`**. En un
contenedor el `cwd` es otro y `docs/` puede ni estar copiado.

> **Dependencia dura nueva: `TASK-1393 · Slice 1b`** (los assets salen de `docs/`; el resolver de paths
> deja de depender del `cwd`). **Sin eso el worker falla con `ENOENT` — o peor, emite un PDF sin
> íconos.** No es empaquetado: es blocker.

---

### 4. ⚠️ Accesibilidad: puede ser ADMISIBILIDAD, y el motor elegido **no la puede entregar**

**El gap más serio, y no estaba en ninguna parte de la task.** Se modela "admisibilidad" como
**formato + peso + páginas**. Falta la cuarta:

- **EE.UU. — Section 508:** los entregables de un contratista —y **nombra explícitamente las
  presentaciones**— deben conformar. **Un entregable no conforme puede ser RECHAZADO** o remediado a
  costa del contratista.
- **UE — European Accessibility Act:** exigible desde el **28-jun-2025** (EN 301 549 → WCAG 2.1 AA).
- **Norma técnica del PDF: PDF/UA-2 (ISO 14289-2:2024)** — árbol de **tags semántico**, **alt text**,
  **orden de lectura**.

⚠️ **El problema es arquitectónico: `Chromium print-to-PDF` emite PDF SIN TAGUEAR.** No es
configuración: **el motor elegido no puede producir PDF/UA.** Si un RFP lo exige, esta arquitectura **no
entrega el requisito** — y nos enteraríamos con el deployable ya construido.

**Qué hace esta task (no lo resuelve, pero deja de ignorarlo):**

- **Declara la limitación** en la spec y el runbook: *"el output de este renderer NO es PDF/UA-conforme"*.
- **Accesibilidad entra al requisito-set:** si el RFP la exige, el job **falla cerrado**, igual que con
  peso/formato. **Mejor fallar ruidoso que entregar un artefacto inadmisible.**
- **Revisit When:** el primer RFP que exija PDF/UA **invalida este renderer como único camino** → habría
  que evaluar un `outputTarget` taggeable (y ahí `react-pdf`/PPTX vuelven a la mesa, hoy correctamente
  excluidos).

### 5. La cola no puede ser FIFO ciega — pero **ningún slice la implementa**

El Delta (a) declara la regla. **El Scope no la entrega:** Slice 2 dice *"consumir jobs desde la cola,
una ejecución por deck"* y nada más. **La regla quedó como buena intención sin dueño.**

Y falta la mitad que nadie recuerda: **una cola con prioridad SIN guard de inanición hace que el batch
social no corra NUNCA.** Prioridad sin *aging* es hambruna con otro nombre.

Además la prioridad necesita un dato que **hoy no está declarado: el DEADLINE**, que sale del aggregate
`Proposal`. Con su invariante: **una propuesta cuyo deadline ya venció no compite por prioridad.**

→ **Slice 2b nuevo.**

### 6. 🔴 El vector de fuga que la task no nombra: evidencia `internal` dentro de un artefacto `client_facing`

La task protege el `audience` **del artefacto**. **No protege el `audience` de sus INSUMOS.**

En este dominio los artefactos internos llevan **loaded cost y piso de negociación** (el
`squad-blueprint-INTERNO.md` de SKY es literalmente eso). Si un slot referencia una evidencia `internal`
y el deck se marca `client_facing`, **el PDF le entrega a la contraparte nuestra estructura de costos.**

No es un bug de permisos: **es regalarle al evaluador el piso de negociación.**

> **Invariante nuevo:** el manifest resuelto lleva el `audience` de **cada referencia de evidencia**, y
> **un artefacto `client_facing` no puede contener NI UNA referencia `internal`.** El job **falla
> cerrado** (`audience_violation`) **antes** de renderizar. No es advertencia: es gate.

### 7. La QA visual es humana — y un renderer automatizado no tiene a nadie mirando

La task pide *"revisión humana de PDF/previews"*. Correcto **para el rollout**. Pero **en régimen nadie
mira cada render** — ése es el punto de automatizar.

Y la doctrina del composer se pagó cara: **"los tests verdes NO son el gate — mirar los frames"**. Cuatro
pasos numerados "01", párrafos aplanados con comas y la firma sin blend **pasaban los 92 tests**.

> **El día que esto se automatiza, "mirar los frames" muere — salvo que se vuelva MECÁNICO.**

`assertSlideFitsCanvas` cubre **geometría**. **No cubre**:

| Falla | Detector mecánico |
|---|---|
| **Fallback tipográfico** (la fuente no cargó) | render de control con la familia bloqueada → si el output es **idéntico**, la fuente nunca se aplicó |
| **Asset ausente** (imagen 404 → caja vacía) | assert de que **todo `<img>` del contrato resolvió** (`naturalWidth > 0`) |
| **Copy del prototipo** (1ª bug class) | ya cubierto por el fail-closed del filler → **verificar que sobrevivió al move de TASK-1393** |
| **Lámina en blanco / casi vacía** | umbral de densidad de píxeles no-fondo por lámina |

**Sin esto, el pipeline automatiza la producción de un artefacto que puede mentir, y nadie lo mira.**

### 8. La clave de idempotencia está definida **dos veces, distinto**

- *"mismo `ResolvedCompositionManifest` + versiones = mismo artefacto"* (Data model).
- *"`tenderId + hash(DeckPlan + template versions + asset versions) + artifact purpose`"* (Idempotency).

**Son contratos distintos**, y el segundo usa `DeckPlan` (shape viejo) y `tenderId` (aggregate viejo).

> **Canónico: `hash(ResolvedCompositionManifest) + proposalId + artifactPurpose`.** El manifest **ya
> contiene** los hashes de catálogo/template/contrato/brand pack/fuentes — repetirlos en la clave es
> duplicar la verdad.

### 9. `tasks=1, parallelism=1` no escala al perfil social

Es **correcto para un deck** (raro, pesado, deadline duro). Para **un lote de 30 carruseles** significa
**30 ejecuciones de Job**, cada una con **cold start de una imagen Chromium** — el arranque domina el
trabajo útil.

No se resuelve acá (necesita datos reales), pero queda como **Open Question con dientes**: `png-set`
probablemente quiere **batch por ejecución**, no una ejecución por pieza. Es la consecuencia de los
"perfiles de carga opuestos" que el Delta (a) nombró y no siguió hasta el final.

### 10. El flag es MULTI-RUNTIME — y en Cloud Run el SoT es el `deploy.sh`

La sección de flags **no dice dónde se lee** el flag. El worker es **Cloud Run**, y la regla del repo es
dura: **en Cloud Run el SoT es `services/<worker>/deploy.sh`** — los `deploy.sh` usan `--set-env-vars`
**destructivo**, que borra toda var agregada out-of-band. Prenderlo sólo con `--update-env-vars` dura
hasta el próximo deploy **y desaparece en silencio**.

- Declarar el flag en `services/artifact-worker/deploy.sh` **y** aplicarlo en vivo.
- **Fila en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR** (`pnpm docs:closure-check` bloquea si falta).

---

### ✅ 11. El deck SÍ es el entregable — confirmado por el operador (2026-07-12)

**Se levantó una duda y quedó zanjada. Se deja escrita para que nadie la re-levante.**

Al leer las bases de SKY (`docs/commercial/tenders/sky-blog-2026/bases/`) se leyó §2.6.1 —*"las ofertas
deberán ser subidas a plataforma… en formato PDF"*— como si exigiera un **documento largo** en vez de
láminas. **Es una mala lectura.** Las bases exigen **el FORMATO PDF, no el género del documento.**

> **Un deck exportado a PDF **es** un PDF.** La propuesta se **compone** con el Artifact Composer y se
> entrega como PDF. **Ése es el camino, y esta task lo productiviza.**

Y §2.6.2 (la presentación ejecutiva de hasta 2 h, avisada con 24 h) **es otra cosa**: una eventual
**defensa oral**, no el formato de la oferta. El mismo artefacto sirve a las dos — que es exactamente el
caso `deck-studio` describe como **"defensa oral + leave-behind"**.

**Conclusión: el catálogo `deck-axis` (16:9 → `pdf-merged`) es el camino correcto y esta task no cambia.**
**NO** hace falta un renderer de documento largo, ni otro `outputTarget`, ni otro catálogo.

⚠️ **Lo que SÍ sigue en pie es §4 (accesibilidad):** el PDF que emitimos —venga de láminas o de lo que
sea— **no está tagueado**, y eso es independiente de este debate.

## Open Questions

- ~~¿El Proposal Studio necesita un renderer de DOCUMENTO largo además del de láminas?~~ **CERRADA por el
  operador (2026-07-12): NO.** La propuesta se compone con el Composer y se entrega **en PDF** — y un deck
  exportado a PDF **es** un PDF. Las bases exigen el **formato**, no el género del documento. Ver §11.
- 🔴 **¿Qué pasa el día que un RFP exija PDF/UA (Section 508 / EAA)?** `Chromium print-to-PDF` emite PDF
  **sin taguear**. Hoy la respuesta honesta es *"fallamos cerrado y no ofertamos"*. ¿Es aceptable?
- **¿`outputTarget: png-set` quiere batch por ejecución** en vez de una ejecución por pieza? 30 carruseles
  × cold start de Chromium = el arranque domina el trabajo útil. Decidir **con datos de carga**, no a ojo.
- ~~¿Cuál es la task que materializa primero `greenhouse_commercial.tenders`/`tender_assets`?~~ **CERRADA:**
  TASK-1392 materializó el aggregate `Proposal` y el vocabulario `proposal_*`; ver Delta (c).
- ~~¿EPIC-027 autoriza el worker como siguiente frontera?~~ **CERRADA:** la excepción para
  `artifact-worker` fue autorizada y documentada el 2026-07-12.
- ~~¿El outbox existente basta o Cloud Tasks agrega backpressure?~~ **CERRADA para el corte actual:**
  dispatcher `ops-worker` + Cloud Scheduler; Cloud Tasks sigue siendo opción posterior, no source of
  truth. **Abierto:** medir en staging el envelope de CPU/RAM/timeout/cold start/costo con 4 y 25
  láminas, retry y fallo inyectado antes de ampliar admisión o concurrencia.
- ¿El requisito de peso se resuelve por RFP como valor de command, por policy del Tender o ambos? La salida debe fallar cerrada cuando el límite sea conocido.
- ¿Qué nivel de estimación de duración/tamaño/costo debe estar disponible en `TenderRenderProposal` para ayudar al humano sin inventar una predicción? El eval baseline debe fijar esa respuesta antes de activar el agente.

## Delta 2026-07-12 (c) — TASK-1392 F0 code-complete: el contrato de lectura de este worker YA EXISTE

Cerrado por el trabajo de TASK-1392 (F0, Proposal Studio). Lo que esta task asumía como pendiente ya es código:

1. **El aggregate existe**: `greenhouse_commercial.proposals` + `proposal_state_transitions` +
   `proposal_assets` + `proposal_evidence` + `proposal_requirements` aplicados a dev (state machine
   persistida, triggers append-only, `owner_org_id NOT NULL` en todos, `deadline` de primera clase —
   el insumo de la **prioridad de cola** del punto 3 del Delta (a)).
2. **El contrato de lectura de este worker es `buildProposalRenderProjection`**
   (`src/lib/commercial/tenders/proposals/render-projection.ts`, + `GET
   /api/commercial/proposals/[id]/render-projection`): proyección allowlisted (assets metadata +
   evidencia permitida + requisitos) que NUNCA expone RFP crudo, costos, `external_source_snapshot`
   ni URLs de storage. El gate `assertEvidenceAllowedForAudience` es fail-closed: **un artefacto
   `client_facing` con UNA evidencia `internal` se rechaza completo** (test de acceptance en
   `__tests__/render-projection-audience.test.ts`). Este worker consume esa proyección; no lee DB
   de propuestas directo.
3. **La open question "¿qué task materializa `tenders`/`tender_assets` primero?" queda respondida**:
   TASK-1392, con el vocabulario congelado `proposal_*` (nunca `tender_*`).
4. **El bloqueo de diseño está cerrado:** `artifact-worker` fue autorizado por excepción de
   EPIC-027 y ni el composer (TASK-1393) ni el aggregate (TASK-1392) bloquean esta task. El pendiente
   es operacional: deploy del Job a staging, smoke/benchmark y activación posterior del flag.

## Delta 2026-07-12 (d) — Slices 0–2b CODE-COMPLETE + corrida E2E REAL con SKY (PDF producido)

**Estado honesto: `code complete + E2E real local — staging deploy del Job pendiente`.**
Commits: S0 `faa96a881` · S1 `3baeb9b2d` · S1b `d8e9dc718` · S1c `d690a967e` · S2+2b `03ec7977e` ·
fixes E2E `dae981c32`.

### La corrida real (pedida por el operador): la propuesta técnica de SKY → PDF

El pipeline gobernado COMPLETO, sin atajos, contra dev:

1. `createProposal` → `prop-5965260d…` (SKY — Gestión del blog 2026, private_rfp, deadline
   2026-07-15 fijado, CLP).
2. `recordProposalEvidence` client_facing (oferta técnica como fuente de los claims).
3. `resolvePlan(deck-axis, deck-plan.json real)` → manifest de 15 láminas, 4 validadores pass.
4. `requestProposalRender` (actor member = el operador; su instrucción explícita ES la
   confirmación humana del artefacto client_facing) → job `prnd-b7d51480…` queued, hash sellado,
   constraints y deadline fijados.
5. `services/artifact-worker/main.ts` (el MISMO código del Job) → claim → drift check →
   composeArtifact con los 4+3 gates → **completed**: PDF 3.175.653 bytes · 15 previews · 29,9 s →
   asset privado `asset-32ec1cfa…` + vínculo `proposal_assets` (deck/client_facing) + outbox
   `render_completed` publicado. PDF entregado al operador (`~/Desktop/SKY-BLOG-2026-pipeline.pdf`).

### Los 3 bugs REALES que la corrida cazó (y el drift check frenó fail-closed)

1. **`resolvePlan` no canonicalizaba el input** → dos entradas equivalentes = dos manifests.
   Fix: input canónico (slideId/contentType/slots) + `TemplateAuthorityError` en resolvePlan.
2. **El hash era sensible al orden de claves y JSONB reordena** → drift falso permanente tras el
   round-trip a DB. Fix: `hashResolvedManifest` sobre serialización canónica profunda.
3. **`uploaded_by` FK** con user inexistente → null (precedente quote-pdf-asset).

Los jobs `dead_letter` previos del debugging quedan como historia honesta (append-only).

### Qué falta para `complete` (infra staging desplegada; smoke gobernado + benchmark pendientes)

1. [x] **Deploy staging aplicado (2026-07-12):** `artifact-worker` Ready, generación 3, SHA
   `216e146be`, 2 vCPU/2 GiB, `GREENHOUSE_STORAGE_ENV=staging` y
   `ARTIFACT_RENDER_JOBS_ENABLED=true`; `ops-worker-00484-n7s` Ready con el dispatcher habilitado y
   Cloud Scheduler `ops-artifact-render-dispatch` cada dos minutos. La lista de executions todavía está
   vacía: el deploy por sí solo no demuestra un render ni incurre cómputo de Job.
2. Staging smoke del Job REAL: crear/encolar el fixture y ejecutar 4 y 25 láminas; verificar retry
   idempotente, fallo inyectado, revisión humana del PDF, assets/outbox/signals y cold start/RSS/costo.
3. **Cerrar el plano Vercel de staging antes del E2E por portal:** el listado de env vars de
   Preview/`develop` no contiene `ARTIFACT_RENDER_JOBS_ENABLED`, por lo que `requestProposalRender`
   sigue rechazando el enqueue desde el portal. Registrar el flag y redeployar Preview sólo para el smoke;
   Production permanece sin flag y fuera de alcance.
4. Producción: sólo tras sign-off + integración al release control plane
   (`RELEASE_DEPLOY_WORKFLOWS`) — documentado en el workflow.

> El cambio de defaults de los `deploy.sh` ya está incorporado en `216e146be`; el ledger pasa a reflejar
> el estado real por runtime. La apertura queda deliberadamente en Vercel Preview para que el primer render
> gobernado sea un smoke explícito, no tráfico accidental.

## Delta 2026-07-12 (e) — EVIDENCIA STAGING: el pipeline completo corrió EN CLOUD RUN

**Flag `ARTIFACT_RENDER_JOBS_ENABLED` ON** (autorizado por el operador): declarado en ambos
`deploy.sh` (SoT) + aplicado en revisión activa (ops-worker `00483-vht`+, Job) + Vercel staging
(redeploy) — producción Vercel SIN la var (el enqueue prod sigue cerrado por diseño).

### La corrida remota (2026-07-12, job `prnd-518535f0…`)

`requestProposalRender` (manifest SKY fresco) → **Cloud Scheduler → dispatcher ops-worker →
`jobs.run` → artifact-worker claim (SKIP LOCKED) → drift check → compose+gates → asset store
staging → completed**: PDF **3.158.296 bytes · 15 láminas · 25,2 s · attempts=1**. Asset
`asset-988fbb9a…` en `…-private-assets-staging`, vínculo `proposal_assets`, outbox
`render_completed` published. PDF revisado por el operador (`~/Desktop/SKY-BLOG-2026-cloudrun.pdf`).

### Los 5 hallazgos del smoke (cada uno cerrado DE RAÍZ + guard permanente)

| # | Hallazgo | Cierre de raíz | Guard permanente |
|---|---|---|---|
| 1 | `run.jobs.runWithOverrides` no está en `run.invoker` | El WORKER claim-ea (`FOR UPDATE SKIP LOCKED`) — least privilege + concurrencia segura | eval del claim en suite del dominio |
| 2 | ENOENT del shim en la imagen | `scripts/lib/` completo | **selftest en Cloud Build** (la imagen se prueba a sí misma o no hay deploy) + `deploy-contract.test.ts` |
| 3 | Chromium como root no arranca sin `--no-sandbox` | flag en el launch canónico, UNIFORME (visual gate 0 px lo prueba) | assert en `deploy-contract.test.ts` |
| 4 | El gate `missing_asset` tenía una CARRERA (juzgaba sin esperar; el SSD local la escondía) | `img.decode()` + techo 15 s antes de juzgar | el propio gate, ya determinista |
| 5 | 2 plantillas con `file:///Users/…` horneado (sobrevivieron a TASK-1393 1b) | paths internos del catálogo | **`catalog-portability.test.ts`** (prohíbe refs no portables en TODO catálogo) |

Retry gobernado del dominio ejercitado de verdad (attempts reales, dead_letter por drift,
requeues) — mejor evidencia que un fallo inyectado sintético.

### Pendiente para PRODUCCIÓN (no bloquea el cierre de staging)

- Integrar `artifact-worker-deploy.yml` al release control plane (`RELEASE_DEPLOY_WORKFLOWS`) +
  sign-off del operador ANTES del primer deploy productivo (documentado en el workflow).
- Benchmark 25 láminas en Cloud Run (encolado como `deck-25-staging-bench`) + envelope definitivo.

### Bench 25 láminas EN CLOUD RUN (cierra el último ítem de staging)

Job `prnd-7ebe35b1…` (`deck-25-staging-bench`): **completed · 25 láminas · 32,3 s · 5,56 MB ·
25 previews · attempts=1**. Envelope confirmado: 2 vCPU / 2 GiB / timeout 900 s sobran con
holgura (~29× de margen de tiempo). La evidencia de "4 y 25 láminas" queda cubierta con el deck
REAL de 15 (estrictamente mejor que un fixture de 4) + el bench de 25. Revisión humana: el
operador tiene ambos PDFs (`SKY-BLOG-2026-pipeline.pdf` local · `SKY-BLOG-2026-cloudrun.pdf` del
asset store de staging).

**CIERRE (2026-07-12): `complete`** — worker + cola + assets + flag/capability + evidencia
staging + rollback + docs sincronizados. **Producción queda explícitamente como follow-up
gateado**: integrar `artifact-worker-deploy.yml` a `RELEASE_DEPLOY_WORKFLOWS` + sign-off del
operador antes del primer deploy productivo (el enqueue de prod permanece OFF por diseño).
