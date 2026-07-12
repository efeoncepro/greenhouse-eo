# TASK-1391 — Tender Deck Renderer: Cloud Run Job, Queue and Artifact Pipeline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Diseno`
- Rank: `TBD — posterior a la autorización de la próxima frontera de deployable de EPIC-027`
- Domain: `commercial|platform|ops`
- Blocked by: `TASK-1392 (Tender aggregate/assets F0) + EPIC-027 next-boundary authorization`
- Branch: `task/TASK-1391-tender-deck-renderer-cloud-run-job`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Llevar el Tender Deck Composer desde su CLI local determinista a una **capability agentic de artefactos gobernada**: contexto/tools de render seguros, propuesta trazable, confirmación humana, job idempotente, outbox/cola, **Cloud Run Job** dedicado con Chromium, storage versionado de PDF/PNGs y señales operativas. Reusa el composer; no recrea templates ni introduce LLM en el render.

La task no se puede ejecutar hasta que EPIC-027 autorice este nuevo deployable y exista la foundation mínima del aggregate `Tender`. Registrar esa dependencia evita convertir `ops-worker` o una route Vercel en un renderer pesado.

## Why This Task Exists

El composer actual ya prueba el camino `DeckPlan → selector → slot-fill → Chromium → PDF` y compone cuatro láminas SKY en local, pero es un CLI con filesystem local. No persiste jobs, no tiene cola ni backpressure entre decks, no guarda artefactos en el asset store, no ofrece un command/read model ni posee despliegue Cloud Run. El render abre Chromium, compone PNG y PDF por slide y fusiona con `pdf-lib`; es correcto para fidelidad AXIS pero necesita aislamiento de CPU/RAM y una operación reproducible antes de atender varias licitaciones concurrentes.

Como capability agentic, tampoco basta con exponer un endpoint de render: un agente debe poder leer el snapshot autorizado, constraints del RFP y estado de artefactos, proponer un `TenderRenderProposal` verificable y explicar sus bloqueos. La confirmación humana invoca el mismo command que API/CLI; el agente jamás encola un job, llama `jobs.run`, publica un PDF ni suplanta el gate de audience.

La arquitectura ya determina que el render pesado vive en `tender-worker` como **Cloud Run Job de una tarea por deck**, y **nunca** en `ops-worker`, Vercel ni un service HTTP de larga duración. EPIC-027 prohíbe crear deployables aislados fuera de su decisión de frontera. Esta task materializa esa decisión sólo cuando ambos gates estén abiertos.

## Goal

- Exponer el render de un `DeckPlan` confirmado como command/reader gobernados, idempotentes y auditables; el PDF sigue siendo derivado, no source of truth.
- Ejecutar renders asíncronos en un Cloud Run Job dedicado con Chromium, job/outbox y límites explícitos de recursos/concurrencia.
- Persistir PDF, previews PNG y metadata/provenance como artefactos versionados, con tamaño máximo como gate de admisibilidad y recovery por replay del plan fijado.
- Obtener evidencia staging de correctness, aislamiento, throughput, memoria y rollback antes de cualquier activación productiva.
- Exponer contexto/tools y `TenderRenderProposal` agent-safe: propuesta con snapshot, preflight, constraints, estimación de recursos y bloqueos; confirmación humana para ejecutar el command canónico.

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
- **Nunca** ejecutar el renderer en Vercel ni `ops-worker`; un worker dedicado es una frontera de despliegue y requiere autorización explícita de EPIC-027.
- `DeckPlan`, template versions y asset references se fijan antes de encolar; el worker no reescribe copy, claims, evidencia ni assets.
- `PersonaAsset` y `EvidenceAsset` mantienen sus políticas de origen. `ContextualVisualSlot` no habilita generación runtime en esta task.
- Todo write entra por primitive/command con capability, idempotencia, audit y errores sanitizados; UI, Nexa, MCP y API son consumers, no implementaciones paralelas.
- El agente consume únicamente readers/context allowlisted y tools sobre primitives; `TenderRenderProposal` es trazable/evaluable y **nunca** equivale a ejecutar/encolar/publicar. No crear framework/SDK de agentes, prompt con writes ni tool de acceso directo a Cloud Run/DB/storage.
- El PDF es un artefacto de diseño y de licitación: conserva el layout HTML AXIS, relación 16:9, safe areas, fuentes y assets aprobados. Un PDF técnicamente válido pero con fallback tipográfico, asset ausente, crop incorrecto o contenido recortado **no pasa** la revisión.
- Formato, tamaño, páginas y demás requisitos conocidos del RFP derivan del requisito-set de ese Tender; cuando el requisito es conocido, el job falla cerrado antes de marcar un deck como client-facing. La exportación nunca sube ni presenta la oferta.

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

- `EPIC-027` — debe autorizar `tender-worker` como siguiente deployable, o documentar la excepción antes de crear `services/tender-worker/`.
- Foundation runtime del aggregate `Tender`, `tender_assets` y capabilities `commercial.tender.*` descritas como Proposed en `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`; confirmar la task dueña o crearla antes de aplicar una migración.
- `TASK-1392` — Tender Proposal Studio F0 agentic: provee aggregate, assets/audience, context/tool contracts, propuesta/confirmación humana y el handoff que el render agent consume.
- Requisito-set `tender_requirements` del aggregate Tender: el job de packaging consume constraints de formato/peso/páginas reales, no un límite global supuesto.
- Composer F1 materializado: `src/lib/commercial/tenders/deck/{compose,contracts,render,selector,validate}.ts` y `scripts/commercial/compose-tender-deck.ts`.
- Asset store canónico `src/lib/storage/greenhouse-assets.ts`; confirmar su contrato de escritura/versionado antes de adjuntar outputs.
- Patrones de Cloud Run/WIF/deploy existentes en `services/ops-worker/`, `services/commercial-cost-worker/` y `services/_shared/`.

### Blocks / Impacts

- Runtime F2 del Tender Proposal Studio: `commercial.tender.package` podrá producir deck client-facing sin bloquear el portal ni el outbox.
- Futuro UI/Nexa/MCP de Tender Proposal Studio; queda deliberadamente fuera de esta foundation backend-data.
- El `ContextualVisualSlot` posterior consume el mismo asset/provenance path, pero no genera activos dentro de este scope.

### Files owned

- `src/lib/commercial/tenders/deck/**`
- `src/lib/commercial/tenders/**` (commands/readers/job contracts, render context/tools/proposal/evals del agente; ruta exacta se confirma en Plan Mode)
- `src/lib/storage/greenhouse-assets.ts` y sus tests, sólo si el contrato existente necesita una extensión compatible
- `services/tender-worker/**` (nuevo Cloud Run Job, condicionado al gate EPIC-027)
- `services/_shared/**` (sólo helpers Cloud Run reutilizables)
- `.github/workflows/tender-worker-deploy.yml` y deploy script asociado (nuevos, si el worker es autorizado)
- `migrations/*-task-1391-tender-deck-render-jobs.sql` (nuevo, sólo si la foundation Tender ya existe)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`, runbook y docs de operación relacionados

## Current Repo State

### Already exists

- `composeDeck()` lanza Chromium una vez por deck, usa una concurrencia interna por defecto de cuatro láminas, exporta PNG + PDF por lámina y fusiona con `pdf-lib`.
- El renderer valida contratos, espera tipografías, rechaza slots fuera del canvas y preserva el orden de slides.
- El renderer exporta el HTML real de cada template: PNG de revisión y PDF vectorial por lámina; no rasteriza el deck ni reconstruye el diseño con un segundo motor.
- El CLI `pnpm deck:compose` compone ejemplos locales; el plan SKY de cuatro láminas generó un PDF de 1,1 MB en 2,33 s en la revisión 2026-07-12.
- Existen patrones productivos de Cloud Run, WIF, Sentry, `source_sync_runs`, deploy scripts y helpers de Secret Manager; no existe `services/tender-worker/` ni un Cloud Run Job de render.
- Las fuentes de las plantillas todavía se cargan desde Google Fonts, por lo que el render no es hermético y debe resolverlo antes de depender de un worker sin red pública.

### Gap

- No existe aggregate/tabla runtime de Tender ni jobs de deck persistidos; la arquitectura de Tender Proposal Studio sigue Proposed fuera del carril determinista F1.
- No existe cola/backpressure, command/reader, capability/grant, storage de outputs, render context/tools/proposal/evals del agente, reintentos, señales ni runbook para renders.
- No existe empaquetado/benchmark de Playwright Chromium para Cloud Run, ni evidencia de resource envelope para decks de 25 láminas.
- El límite de 20 MB de `composeDeck()` hoy sólo advierte; en licitaciones debe convertirse en condición de fallo o en una decisión explícita por RFP antes de publicar el artefacto.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/commercial/tenders/deck/**` y los patrones Cloud Run existentes bajo `services/**`
- Future candidate home: `worker`
- Boundary: command/reader/context/tools de render de Tender y job contract; consumers autorizados son Tender Render Agent, packaging de Tender, API Platform, Nexa/MCP, CLI operativa y el Cloud Run Job `tender-worker`; ninguno llama Chromium directamente salvo el job.
- Server/browser split: contratos/DTOs browser-safe si un consumer futuro los necesita; persistence, asset store, Playwright/Chromium, Cloud Run auth y provider SDKs permanecen server-only.
- Build impact: nuevo Cloud Run Job condicionado, imagen Chromium/Playwright, Dockerfile, workflow WIF, filesystem temporal efímero y assets/fonts empaquetados.
- Extraction blocker: autorización de frontera EPIC-027; el aggregate Tender/asset model y sus transacciones/capabilities aún no existen en runtime.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `DeckPlan` confirmado + versiones de template/assets; job/audit de render y artefactos Tender a materializar bajo el dominio `greenhouse_commercial` [verificar schema/table exactos al existir Tender].
- Consumidores afectados: Tender Render Agent, Cloud Run Job, dispatcher/outbox, Tender packaging command, API Platform, CLI operativa, futuros UI/Nexa/MCP y asset store.
- Runtime target: `local + staging + production Cloud Run Job`.

### Contract surface

- Contrato existente a respetar: `DeckPlan`/`SlideSpec` de `src/lib/commercial/tenders/deck/contracts.ts`, `composeDeck()`, asset store canónico y API Platform command ledger.
- Contrato nuevo o modificado: `TenderRenderContext`, tools/readers allowlisted, `TenderRenderProposal`, command de confirmación/ejecución de render; reader de estado/artefactos; job record append-only con hash del plan + versiones; evento/signal de éxito, fallo, retry y sobrepeso.
- Backward compatibility: `additive and gated`; el CLI local continúa funcionando y no muta jobs productivos.
- Full API parity: Tender Render Agent, `commercial.tender.package` o su primitive de render llaman el mismo command; API/CLI/Nexa/MCP no reciben rutas especiales ni acceso directo a tablas/Cloud Run.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.tenders`, `tender_assets` y job/audit de render [verificar nombres y migración dueña antes de aplicar].
- Invariantes que no se pueden romper:
  - Mismo `DeckPlan` canónico + mismas versiones de template/assets = mismo artefacto lógico; un replay no vuelve a autorizar ni altera slots.
  - Sólo un render activo por clave de idempotencia; retries reutilizan el plan fijado y nunca generan un segundo asset final silencioso.
  - Ningún PDF/PNG se publica como `client_facing` sin aprobación humana y sin cumplir el límite de formato/peso del RFP.
  - Cuando el RFP declara tipo, peso, páginas u otro requisito de archivo, el job lo persiste como constraint de ese snapshot y falla cerrado si el output no lo cumple; nunca sustituye el requisito por el default global de 20 MB.
  - Un fallo de una lámina o un peso excesivo deja el job fallido/recuperable, nunca un deck parcial publicado.
  - `ops-worker` y Vercel no ejecutan Chromium para este dominio.
  - El agente sólo propone usando plan/asset/constraint permitidos; no encola, invoca `jobs.run`, ejecuta Chromium ni publica artefactos.
- Tenant/space boundary: el command deriva actor, `tenderId`, cliente/space y audience desde el aggregate Tender; worker recibe un job autenticado, no IDs arbitrarios del request.
- Idempotency/concurrency: clave estable basada en `tenderId + canonical hash(DeckPlan + template versions + asset versions) + artifact purpose`; lock/unique constraint transaccional; una ejecución Cloud Run Job procesa un deck (`tasks=1`, `parallelism=1`) mientras el renderer mantiene concurrencia interna benchmarkeada.
- Audit/outbox/history: transiciones append-only del job, API Platform command ledger, metadata del asset, trace/tool calls/outcome del agente y reliability signals para queue lag, fallo/retry, geometry failure y file-size rejection.

### Migration, backfill and rollout

- Migration posture: `additive`, bloqueada hasta que exista la migración del aggregate Tender; no backfill histórico de PDFs.
- Default state: flag de capability/Cloud Run Job `OFF` hasta staging smoke y aprobación de EPIC-027; el nombre/capa canónicos se fijan en Plan Mode.
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
- Integration checks: Tender Render Agent propone sobre snapshot/constraints allowlisted → humano confirma → mismo command encola Cloud Run Job; staging renderiza deck de 4 y 25 láminas, sube outputs al asset store y recupera/reintenta un fallo inyectado; browser y binario Playwright deben coincidir en versión y quedar pinneados en la imagen.
- Reliability signals/logs: dashboard/lane de queue lag, dead-letter, duration/memory, over-weight and geometry rejection; Sentry `domain=commercial` sin PII.
- Production verification sequence: flag OFF deploy → staging smoke/benchmark → revisión humana de PDF/previews contra el template real → autorización EPIC/operador → enable limitado → un render controlado → revisar assets, audit, signals y costo → ampliar sólo si el envelope y rollback pasan.

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

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Gate de frontera y contrato de job

- Confirmar que EPIC-027 autoriza el deployable `tender-worker` y que la foundation `Tender`/`tender_assets` tiene task/owner/materialización suficiente; si falta, dejar esta task bloqueada y crear/ligar el predecessor, sin crear el servicio.
- Decidir y documentar command/reader, tabla(s) additive, key de idempotencia, asset/version/audience contract, capability/grant, flags y ruta de cola; revisar si un ADR incremental es necesario antes de migrar.
- Medir baseline local de 4 y 25 láminas: duración, RSS, tamaño, recursos de Chromium y comportamiento ante timeout/fallo.

### Slice 1 — Job persistente, commands y artefactos

- Implementar primitive server-side de request/confirm/execute/retry/read sobre el plan fijado; agregar migración additive/audit/outbox sólo después de que el aggregate Tender exista.
- Implementar `TenderRenderContext`, tools/readers allowlisted y `TenderRenderProposal` con preflight de assets/constraints/plan y estimación explícita; guardar trace/eval sin contenido confidencial del RFP.
- Conectar confirmación humana de la propuesta al mismo command idempotente; la propuesta nunca escribe un job ni tiene acceso a dispatcher/Cloud Run/storage.
- Integrar asset store para outputs privados/versionados; preservar `audience`, provenance, hash y las constraints del requisito-set (peso, páginas, tipo/formato cuando existan) como gates de publicación.
- Convertir el warning de peso en outcome gobernado (`size_rejected` o equivalente) cuando el requisito de formato aplique; no publicar PDF parcial o sobrepeso.

### Slice 2 — `tender-worker` Cloud Run Job y empaquetado Chromium

- Crear el Cloud Run Job `tender-worker` sólo si Slice 0 autorizó la frontera; reutilizar Docker/WIF/Sentry/secret-IAM helpers canónicos. El dispatcher autenticado invoca `jobs.run`; el Job no publica endpoint HTTP de render.
- Empaquetar templates, assets y fuentes de forma hermética; eliminar dependencia de Google Fonts/red pública antes del runtime productivo. Fijar la imagen y el binario de Playwright a la misma versión; no usar tags flotantes.
- Consumir jobs desde outbox/cola con una ejecución/tarea por deck (`tasks=1`, `parallelism=1`); la concurrencia interna de páginas se configura sólo desde benchmark, no por suposición. Cloud Tasks queda fuera del render directo y sólo se considera si el dispatcher necesita backpressure dedicado.

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
- Crear el worker si EPIC-027 no autoriza la frontera o si no existe source of truth Tender suficiente.

## Detailed Spec

La ruta de ejecución esperada es `TenderRenderContext/tools → TenderRenderProposal → human confirm → persist immutable job + RFP constraints → outbox dispatcher → authenticated jobs.run → Cloud Run Job tender-worker (1 deck) → composeDeck(plan) → validate geometry/formato/peso → private asset-store writes → audit/status reader`. El job puede reintentar sólo el mismo snapshot de plan; una edición de contenido/template/asset crea una nueva clave y una nueva versión de artefacto. El agente no puede saltarse ningún borde de este flujo.

La exportación conserva el sistema visual de las plantillas; el renderer no introduce un “fallback estético”. Todo preview y PDF pasa una revisión de composición sobre el output real antes de ser elegible como client-facing. Plan Mode debe decidir si el outbox existente basta o requiere Cloud Tasks sólo para backpressure del dispatcher, definir el modelo de operación de los artefactos temporales y confirmar las tablas reales. No se acepta una route Vercel de larga duración, un endpoint Cloud Run público de render, ni polling que redisponga Chromium por cada consulta de estado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST cerrar antes de crear migraciones, capabilities, service account, Dockerfile o `services/tender-worker/`.
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

### Feature flags / cutover

- Flag de capability/Cloud Run Job Tender Renderer y Tender Render Agent: default OFF; nombre, owner, ledger y eval fixture se fijan en Slice 0 para no crear una variable duplicada.
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
3. Ejecutar Tender Render Agent sobre snapshot allowlisted; verificar propuesta/traza/eval y que el humano confirmado invoca el mismo command. Encolar un deck fixture de 4 láminas y uno de 25; verificar hash, orden, geometría, constraints de RFP, peso, assets privados, audit y reader.
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

- [ ] No se crea `tender-worker` sin autorización documentada de EPIC-027 y sin source of truth Tender/asset store confirmado.
- [ ] El command fijado es idempotente, capability-gated, auditado y usable por API/CLI; no hay render directo desde UI, Vercel ni `ops-worker`.
- [ ] Tender Render Agent consume sólo contexto/tools allowlisted y genera `TenderRenderProposal` tipada, trazable y evaluada; no encola, ejecuta Chromium, llama `jobs.run` ni publica assets.
- [ ] El Cloud Run Job usa Chromium/Playwright con templates, assets y fuentes herméticos; no depende de Google Fonts/red pública para producir el PDF.
- [ ] La imagen/browser de Playwright está versionada junto con la dependencia y la ejecución queda fijada a una tarea/paralelismo por deck, respaldada por benchmark de CPU/RAM.
- [ ] Cada job persiste/replaya el mismo `DeckPlan` y versiones; falla de manera visible ante geometry, timeout, assets o límite de peso, sin publicar parcial.
- [ ] Cuando un RFP declara formato, peso o páginas, esas constraints quedan fijadas en el job y bloquean el `client_facing` output que no las cumpla.
- [ ] Se conserva un solo artefacto final por key de idempotencia y los reintentos no duplican assets/auditoría.
- [ ] Staging demuestra renders de 4 y 25 láminas, caída/retry y rollback de flag/cola; evidencia incluye duración, RSS, tamaño y revisión humana de salida que cubra split/full-bleed, safe areas, firma, tipografía, crops y placeholders.
- [ ] `jobs.run` sólo admite el dispatcher autenticado, storage privado, errores sanitizados, Sentry y señales operativas pasan los gates definidos.
- [ ] Se actualizan arquitectura/runbook/ledger de flags, Handoff y changelog conforme al runtime realmente entregado; cualquier paso externo pendiente queda como rollout pendiente, no como cierre falso.

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

## Open Questions

- ¿Cuál es la task que materializa primero `greenhouse_commercial.tenders`/`tender_assets`, o debe nacer como predecessor antes de Slice 1?
- Tras el piloto Labs, ¿EPIC-027 autoriza `tender-worker` como siguiente frontera o requiere una task específica de decisión de costo/build antes?
- ¿El outbox existente basta para despachar `jobs.run` o Cloud Tasks agrega backpressure necesario sin introducir un segundo source of truth? ¿Qué envelope de CPU/RAM/timeout resulta del benchmark 25-slide?
- ¿El requisito de peso se resuelve por RFP como valor de command, por policy del Tender o ambos? La salida debe fallar cerrada cuando el límite sea conocido.
- ¿Qué nivel de estimación de duración/tamaño/costo debe estar disponible en `TenderRenderProposal` para ayudar al humano sin inventar una predicción? El eval baseline debe fijar esa respuesta antes de activar el agente.
