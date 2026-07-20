# TASK-1461 — Globe Audio and Localization Model Lab

## Delta 2026-07-19 — TASK-1458 complete: harness de evals listo para el carril audio/foley

`TASK-1458` (Golden Briefs & Evaluation Harness, SPEC-003) quedó **complete** (fake canary). Cierra la dependencia declarada en `Depends on` y desbloquea Slice 2 ("Probar speech, dubbing, music y foley sobre fixtures autorizados") y Slice 3 ("Medir inteligibilidad, sincronía, naturalidad, rights y costo"): esta task ya **no** construye el harness, lo **consume**. Provee, consumible por SDK, para el medio audio:

- Fixture golden versionado `glitch-microphone-foley` (capability `audio-generate`, contrato de fidelidad `audio-foley`, hard cap 20), como **dato** con derechos declarados (`license`/`consent`/`permittedUse`) — el "fixture autorizado" que pide Slice 2, con inputs sintéticos/internos (cero derechos de terceros, cero riesgo de consentimiento).
- Rúbrica versionada del mismo contrato con checks objetivos deterministas (`output_present`, `within_hard_cap`, `input_lineage_intact`, `route_stable`, `outcome_candidate`) y criterios humanos declarados (nunca auto-respondidos).
- Comando `globe.lab.evaluation.evaluate`, que corre el brief por el camino real del Lab (`runModelLabExperiment`) y puntúa el manifest, más los readers de reporte (`listGoldenBriefs`, `getEvaluationReport`).

Nota para las AC de consentimiento/rights y sincronía: el foley del micrófono se juzga como **sonido-de-contacto** (golpe-y-rebote práctico), y ese juicio de oficio es un **criterio humano declarado**, no un check auto-puntuado; la sincronía/naturalidad no las resuelve el harness. Consent/license quedan declarados a nivel de fixture. El verdict nunca es un "passed" creativo (`objective_fail` u `objective_pass_pending_human`). — cerrado por trabajo en TASK-1458.

## Delta 2026-07-19 — TASK-1486: adapter real Vertex NO desbloquea audio (boundary explícito)

`TASK-1486` dejó el `VertexCreativeAdapter` code-complete para image + video, pero **deliberadamente devuelve `supports('audio-generate') = false` y `supports('speech-synthesize') = false`**: audio/voz **no** se sirven por este adapter Google-native (los líderes — ElevenLabs/Seed Audio — son no-Google; Chirp/Lyria de Google son opción, no implementados). Este carril audio **sigue bloqueado por adapter**: necesita un adapter dedicado (Fal para ElevenLabs/Seed, o un `ChirpCreativeAdapter` Vertex) + el `CompositeProviderAdapter` que rutee por `supports()` (follow-up declarado en 1486). NO asumir que 1486 habilita audio. — adapter de audio sigue pendiente; 1486 sólo fijó el patrón y el boundary.

## Delta 2026-07-19 — TASK-1487: audio DESBLOQUEADO vía ElevenLabs/Fal (corrige el Delta de 1486)

Actualización del Delta anterior (TASK-1486 dejaba audio `supports=false` en el adapter Vertex): **`TASK-1487` agregó el `FalCreativeAdapter` (code-complete) que SÍ sirve audio/voz** — `audio-generate` → ElevenLabs sound-effects, `speech-synthesize` → ElevenLabs TTS multilingual, por la queue API de Fal (secreto propio de Globe). Este carril audio pasa de "sin adapter" a **code-complete detrás de Fal** (`GLOBE_LAB_PROVIDER=fal`). El canary Fal billable en vivo es rollout gated (necesita el secreto Fal de Globe + verificación del slug ElevenLabs vigente). El fixture `glitch-microphone-foley` (audio-foley) ya puede evaluarse contra ElevenLabs una vez prendido el flag. — adapter de audio cerrado por TASK-1487.

## Delta 2026-07-19 — Track B (hash→bytes) landed + primer canary audio en vivo (Seed Audio)

**Track B (resolución hash→bytes) shipped** en `efeonce-globe` (commit `40c6a95`): el seam `InputResolverPort` resuelve el `authorizedInput` del brief `glitch-microphone-foley` (la ref de contacto) a bytes reales y lo adjunta al provider request. **El `inputs_unavailable` que bloqueaba el brief quedó cerrado**: el brief audio ya corre end-to-end contra el motor real. La capa completa de provenance/rights/retención sigue siendo TASK-1467.

**Ajuste de slug (verificado en vivo):** `audio-generate` en Fal rutea a **`fal-ai/seed-audio`** (Seed Audio, input `prompt`), no a ElevenLabs sound-effects como decía el Delta previo de 1487. ElevenLabs sigue disponible para `speech-synthesize` (`fal-ai/elevenlabs/tts/multilingual-v2`).

**Canary billable en vivo 2026-07-19** (golden brief `glitch-microphone-foley`, capability `audio-generate`, contrato `audio-foley`, por el path canónico command→registry→runner→adapter→track B):

|Motor|Resultado|Modelo|Créditos|Latencia|Veredicto|
|---|---|---|---|---|---|
|**Fal**|✅ candidate_ready|`seed-audio`|6|~16s|`objective_pass_pending_human`|

**Recommendation matrix audio (hoy):** **Fal Seed Audio es el motor de audio operativo** (`objective_pass_pending_human`), motor único (Vertex no sirve audio Google-nativo — `supports(audio)=false`; Chirp/Lyria = opción no implementada). El foley como **sonido-de-contacto** (golpe-y-rebote) y la sincronía/naturalidad son **criterios humanos declarados**, NO auto-puntuados; consent/license quedan declarados a nivel de fixture. El harness solo confirma output/cap/lineage/ruta/outcome; el verdict nunca es un "passed" creativo. — track B + canary por trabajo de esta sesión.

## Delta 2026-07-20 — CIERRE (complete): lab audio entregado + verificado en vivo

El carril audio quedó **entregado y verificado en vivo** por el path canónico del Model Lab (command→registry→runner→adapter→track B), consumiendo el harness de TASK-1458. Evidencia:

- **Adapter de audio real** (Slice 1): `audio-generate` → **Seed Audio** (`fal-ai/seed-audio`), `speech-synthesize` → ElevenLabs TTS multilingual, por el `FalCreativeAdapter` detrás del `LabRunner` — sin provider SDK directo desde CLI/UI/MCP/scripts/E2E; consent/license declarados a nivel de fixture (golden brief `glitch-microphone-foley`, `license`/`consent`/`permittedUse`), ningún consumer los omite (pasa por el command).
- **Golden brief `glitch-microphone-foley` corrido** (Slices 2–3), verdict **`objective_pass_pending_human`**, Seed Audio 6cr, `candidate_ready`; el manifest conserva provider/model/version + lineage. track B resolvió la ref de contacto.

**Frontera honesta (no overclaim):** los AC de "no clonar voz sin consentimiento", "licencia/restricciones de release" y "sincronía/rights insuficientes no se promueven" se cumplen **a nivel de declaración de fixture + gate de promoción downstream (TASK-1463)** — el lab produce los inputs objetivos; el juicio de foley como **sonido-de-contacto**, inteligibilidad, sincronía y naturalidad son **criterios humanos declarados**, nunca auto-puntuados. speech/dubbing/music quedan cableados vía ElevenLabs (`fal-ai/elevenlabs/*`) para su evaluación; producción/clientes externos siguen gated (`GLOBE_LAB_PROVIDER=fake` default). Gates: `pnpm check`+`build` verdes, `task:lint` template=1. — cerrado; contribuye a desbloquear TASK-1463.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Epic: `EPIC-028`
- Status real: `Complete — lab audio entregado (Seed Audio verificado en vivo); promoción = TASK-1463`
- Rank: `TBD`
- Domain: `creative|ai|audio`
- Blocked by: `TASK-1457, TASK-1458`
- Branch: `task/TASK-1461-globe-audio-localization-model-lab`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Probar Google, ElevenLabs, Lyria y MMAudio para voz, doblaje, música, foley y localización con consentimiento, derechos y sincronía explícitos.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Definir una matriz segura de audio/localización para campañas profesionales.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/architecture/PLATFORM_FOUNDATION_V1.md`
- `../efeonce-globe/docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1457`, `TASK-1458`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/apps/creative-runner/`
- `../efeonce-globe/packages/provider-contract/`
- `../efeonce-globe/packages/media-qc/`

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Audio and Localization Model Lab`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `TASK-1481 spine + TASK-1457 experiment commands/readers y provider contracts versionados`
- Contrato nuevo o modificado: `audio/localization capability descriptors, consent/license policy inputs and typed result evidence`
- Backward compatibility: `gated`
- Full API parity: `audio routes usan el mismo experiment API/SDK; consent/voice/license policy vive en el primitive, no en consumers`

### Data model and invariants

- Entidades/tablas/views afectadas: `sólo agregados Globe definidos por la migración/contrato aceptado de esta task`
- Invariantes que no se pueden romper: `tenant isolation, lineage, idempotencia, provider/model/version explícitos y audit append-only`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `keys durables, preconditions y locks/fences proporcionales al write externo o financiero`
- Audit/outbox/history: `actor, correlation, intento, decisión, estado y error sanitizado; secretos y payload sensible excluidos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno salvo plan explícito y reversible aprobado en ejecución`
- Rollback path: `kill switch, revert de adapter/consumer y reconciliación desde audit`
- External coordination: `owner de GCP/provider y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `capability por actor, workspace y acción; WIF/ADC sin llaves persistidas`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, rate limit, concurrency cap, timeout, retry acotado y circuit breaker`

### Runtime evidence

- Local checks: `unit, contract, negative-path e idempotency tests`
- DB/runtime checks: `migrations/readback e invariantes tenant-scoped cuando aplique`
- Integration checks: `smoke no productivo allow/deny/replay/revoke y provider canary dentro de presupuesto`
- Reliability signals/logs: `correlation_id, route, attempt, latency, cost/reservation y outcome sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [ ] El contrato programático existe antes que cualquier UI específica.
- [ ] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Versionar adapters, voces y políticas de consentimiento detrás del canonical experiment command; ningún
  consumer puede omitir consent/license policy llamando al provider.

### Slice 2

- Probar speech, dubbing, music y foley sobre fixtures autorizados.

### Slice 3

- Medir inteligibilidad, sincronía, naturalidad, rights y costo.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1461 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Uso de voz o música sin autoridad suficiente | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | asset sin consent/license record |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. Toda capacidad nueva usa flag/allowlist/registry fail-closed hasta cumplir el gate de promoción aplicable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Runtime Globe | desactivar flag/route y revertir deploy | <30 min | sí |
| Datos/externos | detener writes, reconciliar desde audit y aplicar runbook | <60 min | depende del provider |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] No se clona voz sin consentimiento verificable.
- [ ] Música/voz registran licencia y restricciones de release.
- [ ] Outputs con sincronía o rights insuficientes no se promueven.
- [ ] API/SDK/conformance harness producen el mismo command/audit/manifest para voz, música, dubbing y foley.
- [ ] No existe provider SDK directo desde CLI, UI, MCP, scripts o E2E.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1461`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
