# TASK-1486 — Globe Model Lab: real Vertex provider adapter (keyless canary)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Epic: `EPIC-028`
- Status real: `Code complete, rollout pendiente`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1486-globe-vertex-real-provider-adapter`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa el primer `CreativeProviderAdapter` real del Model Lab de Efeonce Globe: un `VertexCreativeAdapter` (repo hermano `efeonce-globe`, `apps/creative-runner`) que reemplaza al `FakeReferenceAdapter` detrás del `LabRunner`, keyless (ADC/WIF, SA `aiplatform.user`), ruteando cada `CreativeCapability` semántica a un modelo Vertex (Imagen/Nano Banana, Veo 3.1, Gemini Omni Flash) sin exponer model IDs al dominio. Cierra la brecha "proveedor fake" que declaran los reportes del harness (TASK-1458) y da costo/latencia reales a los model labs por medio (TASK-1459/1460/1461). El proveedor `fake` sigue siendo default; el canary facturable en vivo es un rollout gated por humano.

## Why This Task Exists

TASK-1457 dejó el Model Lab operando con un `FakeReferenceAdapter` determinístico (cero gasto, cero infra) y difirió explícitamente el "canary con proveedor real". TASK-1464 ya aprovisionó la foundation keyless (SA + WIF + bucket de evidencia) en vivo. Hoy el seam `command → adapter → runner` está probado end-to-end pero **nunca ha llamado a un proveedor real**: los reportes de evaluación (TASK-1458) declaran la limitación "proveedor fake → sólo checks técnicos, no fidelidad real", y los model labs por medio (1459/1460/1461) no pueden registrar costo/latencia/calidad reales porque no existe el adapter. Este es el gap foundational que los desbloquea a los tres.

## Goal

- Un `VertexCreativeAdapter` que implemente el contrato `CreativeProviderAdapter` (`providerId`/`supports`/`estimate`/`submit`/`poll`) contra Vertex AI, keyless, con el routing capability→modelo dentro del adapter.
- Provider-selection gobernada (`GLOBE_LAB_PROVIDER`, default `fake`) que permite conmutar fake↔vertex sin tocar el dominio ni el contrato, reversible al instante.
- Transporte HTTP inyectable → suite de tests que ejercita estimate/submit/poll/error-mapping **con transporte mockeado, cero red y cero gasto**; el canary facturable en vivo queda declarado como rollout gated (no se ejecuta en esta task).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar (en el repo hermano `efeonce-globe`, salvo indicación):

- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md` (invariantes 6, 9, 12: primer provider call por el seam; ejecución del Lab ≠ promoción de ruta)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` (SPEC-002: aggregate, spend fence, kill switch, provider seam)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001: coverage, trusted context, errores canónicos)
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md` (bridge Greenhouse↔Globe)

Reglas obligatorias:

- Los **model IDs de Vertex viven DENTRO del adapter** (routing table), nunca en policy de dominio; el dominio rutea por `CreativeCapability` semántica.
- La **primera (y toda) llamada facturable** ocurre sólo en `submit`, alcanzada **únicamente** por `command → adapter → runner`; NUNCA desde script/CLI/test con transporte real.
- **Keyless**: Vertex por ADC/WIF (SA Cloud Run `aiplatform.user`), NO API key; nunca loggear el access token ni el body crudo de Vertex; nunca retornar URL pública (hashes only).
- El **spend fence** reserva antes de `submit` y el **kill switch** (`GLOBE_LAB_ENABLED`) fail-closed ya existen; esta task no los reimplementa.
- El proveedor `fake` sigue siendo **default**; vertex sólo con credenciales + `GLOBE_LAB_PROVIDER=vertex` explícito.

## Normative Docs

- `docs/tasks/complete/TASK-1457-globe-safe-model-lab-foundation.md` (foundation que este canary completa)
- `docs/tasks/complete/TASK-1464-globe-keyless-iac-foundation.md` (SA/WIF/bucket keyless que este adapter consume)
- `.claude/skills/greenhouse-globe/SKILL.md` (contrato de extensión de capability + provider boundary)
- `.claude/skills/motion-design-studio/efeonce/GEMINI_OMNI_VERTEX.md` (contrato operativo verificado de Gemini Omni en Vertex: endpoint/región/pricing/gotchas)
- `.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md` (evidencia empírica de motor-por-contrato-de-fidelidad)

## Dependencies & Impact

### Depends on

- `TASK-1457` (Model Lab foundation, complete) — provee `LabRunner`, `LabRunnerPort`, `SpendFencePort`, kill switch, `CreativeProviderAdapter`, `FakeReferenceAdapter`.
- `TASK-1464` (IaC keyless, complete, aplicado en vivo) — SA + GitHub WIF + bucket `efeonce-globe-lab-evidence`. Prerequisito de rollout: la SA de runtime con `roles/aiplatform.user` en el proyecto `efeonce-globe`.
- `TASK-1481` (API Contract Spine, complete) — trusted context + dispatch + coverage.
- `efeonce-globe/packages/provider-contract` (interfaz `CreativeProviderAdapter`, tipos `CreativeProviderRequestV1`/`ProviderEstimate`/`ProviderAttemptResult`).

### Blocks / Impacts

- `TASK-1459` (still model lab), `TASK-1460` (motion model lab), `TASK-1461` (audio localization model lab) — necesitan un adapter real para registrar costo/latencia/calidad reales; hoy asumen que existe.
- `TASK-1463` (model promotion readiness registry) — consume evidencia de reportes; con el adapter real deja de declararse "proveedor fake".
- `TASK-1458` (evaluation harness, complete) — sus reportes dejan de declarar la limitación "proveedor fake" cuando corren sobre Vertex.

### Files owned

- `efeonce-globe/apps/creative-runner/src/vertex-adapter.ts` (nuevo) — `VertexCreativeAdapter` + routing/pricing tables + `VertexTransport` port.
- `efeonce-globe/apps/creative-runner/src/vertex-adapter.test.ts` (nuevo) — tests con transporte mockeado.
- `efeonce-globe/apps/creative-runner/src/index.ts` (export del adapter).
- `efeonce-globe/apps/studio-web/src/app.ts` (provider-selection wiring: fake default; vertex detrás de `GLOBE_LAB_PROVIDER`).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` (§ provider real / routing) o un doc/adapter nuevo.
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md` (control plane Greenhouse).

## Current Repo State

### Already exists

- `efeonce-globe/packages/provider-contract/src/index.ts` — `CreativeProviderAdapter<TRequest>` + `CreativeProviderRequestV1` + `ProviderEstimate` + `ProviderAttemptResult`.
- `efeonce-globe/apps/creative-runner/src/index.ts` — `FakeReferenceAdapter` + `LabRunner` + `toProviderRequest` (el seam a reemplazar).
- `efeonce-globe/packages/domain/src/model-lab.ts` + `spend-fence.ts` — estado, fence, kill switch (`assertLabEnabled`), `LabRunnerPort`.
- `efeonce-globe/apps/studio-web/src/app.ts` — wiring del Lab (inyecta `new LabRunner(new FakeReferenceAdapter(now), now)`), config `labEnabled`/`labDailyCapCredits`.
- Foundation keyless viva (TASK-1464): SA, WIF, bucket `efeonce-globe-lab-evidence`, state remoto.
- Vertex model IDs + regiones verificados (referencia, en proyecto `efeonce-group`): `gemini-omni-flash-preview` (video, región `global`), Veo 3.1, Nano Banana / Imagen — `.claude/skills/motion-design-studio/efeonce/GEMINI_OMNI_VERTEX.md`.

### Gap

- No existe ninguna implementación real de `CreativeProviderAdapter`: el único adapter es el fake.
- No existe provider-selection: `app.ts` hardcodea el `FakeReferenceAdapter`.
- No está verificado que los modelos Vertex estén habilitados en el proyecto `efeonce-globe` (se verificaron en `efeonce-group`), ni que la SA de runtime tenga `roles/aiplatform.user` ahí. Ambos son prerequisitos de rollout, no de código.
- No existe la persistencia de bytes de salida al bucket privado (hoy el fake sólo hashea; el adapter real hashea inline y deja la subida al bucket como follow-up declarado).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/creative-runner` (repo hermano; greenhouse-eo NO cambia runtime ni build)
- Future candidate home: `remain-shared`
- Boundary: implementa el contrato canónico `CreativeProviderAdapter` (`efeonce-globe/packages/provider-contract`); el único consumer autorizado es el `LabRunner`. (Posible extracción a `efeonce-globe/packages/provider-vertex` si emergen varios vendor adapters; hoy colocado con el fake en el runner.)
- Server/browser split: server-only (Cloud Run Job / runner); ADC/WIF, transporte HTTP y model IDs nunca cruzan al browser.
- Build impact: agrega dependencia de auth de Google (ADC/WIF) al runner; transporte inyectable (fetch-like) para no acoplar el SDK al test.
- Extraction blocker: `none` — el adapter es reemplazable detrás del `LabRunnerPort`; ninguna transacción/routing/data de greenhouse-eo lo bloquea. (La frontera relevante es el boundary Globe↔Greenhouse, no la topología de greenhouse-eo.)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `provider adapter (CreativeProviderAdapter) + routing/pricing tables internas del adapter`
- Consumidores afectados: `worker (LabRunner) — indirecto: command/reader del Model Lab + evaluation harness`
- Runtime target: `worker` (Cloud Run Job / creative-runner)

### Contract surface

- Contrato existente a respetar: `efeonce-globe/packages/provider-contract` (`CreativeProviderAdapter<CreativeProviderRequestV1>`), `LabRunnerPort` (`efeonce-globe/packages/domain`).
- Contrato nuevo o modificado: NINGÚN cambio de contrato público — el adapter implementa la interfaz existente. Se agrega un env de wiring `GLOBE_LAB_PROVIDER` (fake|vertex) + un `VertexTransport` port interno del runner.
- Backward compatibility: `compatible` (aditivo; fake sigue default).
- Full API parity: el adapter no es una superficie nueva; se consume por el mismo seam `command → adapter → runner` que ya opera la UI/SDK/MCP.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla (in-memory / manifest por intento). Persistencia de bytes al bucket `efeonce-globe-lab-evidence` = follow-up declarado.
- Invariantes que no se pueden romper:
  - Los model IDs de Vertex NUNCA salen del adapter (routing table interna); el dominio rutea por `CreativeCapability`.
  - `estimate` NUNCA llama a Vertex (lookup puro de pricing table); sólo `submit` es facturable.
  - `poll` retorna hashes de salida, NUNCA URL pública ni bytes crudos al cliente; watermark (SynthID+C2PA de Omni) siempre presente.
  - `supports()` retorna true SOLO para capabilities que el adapter sirve Google-nativo; false para `image-vectorize`/`audio-generate` (adapter Fal futuro).
- Tenant/space boundary: el adapter opera dentro del experiment ya scopeado por trusted context; no deriva tenancy por sí mismo.
- Idempotency/concurrency: `idempotencyKey` (attemptId) → `externalRunId` estable; re-submit devuelve el mismo run. El fence reserva/settle/release ya es idempotente.
- Audit/outbox/history: el `ExperimentAttemptManifestV1` inmutable registra provider/model/version/route propuesta-vs-real/credits/hashes; `correlationId` encadena la evidencia.

### Migration, backfill and rollout

- Migration posture: `none` (sin DB).
- Default state: `flag OFF` — `GLOBE_LAB_PROVIDER=fake` default; el canary vertex requiere flag + credenciales explícitas.
- Backfill plan: N/A.
- Rollback path: `flag off` — `GLOBE_LAB_PROVIDER=fake` (revert instantáneo a fake) + `GLOBE_LAB_ENABLED=false` (kill switch). Sin estado persistido que revertir.
- External coordination: **prerequisito de rollout** (no de código): habilitar `aiplatform.googleapis.com` + modelos (Omni/Veo/Imagen) en el proyecto `efeonce-globe`; bind `roles/aiplatform.user` a la SA de runtime; deploy del runner o ADC local al proyecto; budget/alertas; verificar región por modelo. Nada de esto se ejecuta en esta task de código.

### Security and access

- Auth/access gate: la capability `globe.lab.experiment.run` (+ trusted context) ya gatea el experimento; el adapter no agrega superficie de auth. Vertex se accede keyless por la SA de runtime (`aiplatform.user`).
- Sensitive data posture: sin PII; los inputs cruzan como hash (private-ingest). El access token de ADC/WIF y el body de Vertex son secretos internos — nunca al cliente ni a logs.
- Error contract: errores de Vertex → error tipado del adapter → el runner los convierte en experiment `failed` + `fence.release`; NUNCA prosa/stack/token crudo al cliente. Región NOT_FOUND / 403 SA / 429 → `dependency_unavailable`.
- Abuse/rate-limit posture: el spend fence (per-run + per-workspace-día) + kill switch acotan gasto; 429 de Vertex se trata como dependencia no disponible (retry acotado o fail limpio).

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build` verdes; tests del adapter con transporte mockeado (estimate/submit/poll/error-mapping/región/boundary).
- DB/runtime checks: N/A (sin DB).
- Integration checks: **el smoke facturable en vivo (una llamada real a Vertex) es rollout gated por humano** — no en esta task. Cuando se autorice: un experimento por el seam con `GLOBE_LAB_PROVIDER=vertex` + `GLOBE_LAB_ENABLED=true` contra el proyecto `efeonce-globe`, verificando manifest real + fence + hashes.
- Reliability signals/logs: `correlationId` + `failureReason` sanitizado en el manifest/logs del runner (Globe no tiene el signal infra de Greenhouse).
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers nombrados con paths reales.
- [x] Invariantes de datos, boundary y idempotencia explícitos.
- [x] Postura de migración/rollback explícita y proporcional (flag OFF default, revert a fake).
- [x] Evidencia runtime listada (gate mockeado en CI; canary billable gated por humano).
- [x] Dominios sensibles con errores canónicos, sin fuga de token/body crudo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — VertexTransport port + routing/pricing tables + estimate

- `VertexTransport` (port fetch-like inyectable) + resolución de token keyless (ADC/WIF) detrás del port.
- `VERTEX_ROUTING: Record<CreativeCapability, VertexModelRoute>` (model, modelVersion, region, invocation, unit) + `VERTEX_PRICING` (as-of 2026-07, con caveat reverificar).
- `supports()` (true solo para las capabilities Google-native servidas) + `estimate()` (lookup puro sin red).

### Slice 2 — submit/poll + error mapping + output hashing

- `submit()` = única llamada facturable (Vertex `generateContent` síncrono para Omni/Imagen), cachea por `externalRunId`.
- `poll()` = decodifica base64 inline → `sha256` (media-qc) → `outputHashes`; `actualCredits` del tamaño real de la respuesta.
- Error mapping (NOT_FOUND/403/429/timeout/malformed → error tipado, sin fuga); región per-model.

### Slice 3 — provider-selection wiring + tests + docs

- Wiring en `app.ts`: `GLOBE_LAB_PROVIDER` (default `fake`) selecciona `FakeReferenceAdapter` vs `VertexCreativeAdapter`.
- Suite de tests con transporte mockeado (cero gasto): estimate/submit/poll, error-mapping, región, boundary (`supports` false), reproducibilidad de hashes.
- Docs: § provider real en la spec del Model Lab + go-live checklist del canary billable; task lifecycle.

## Out of Scope

- La **llamada facturable en vivo** a Vertex (rollout gated por humano; esta task deja el código listo y OFF por default).
- Adapters no-Google (Fal para Seedance/Recraft/ElevenLabs, OpenAI directo) y el `CompositeProviderAdapter` que rutea por `supports()` — tasks separadas.
- Persistencia de bytes de salida al bucket `efeonce-globe-lab-evidence` (hash-only en esta task; upload = follow-up).
- El path LRO de Veo `predictLongRunning` (esta task usa el path síncrono `generateContent` verificado; LRO = extensión posterior).
- El credit↔$ conversion comercial (lo posee el credit ledger TASK-1468); acá `credits` es una unidad interna estable que capa el fence.
- Cambios en el dominio, el contrato del spine o cualquier runtime de greenhouse-eo.

## Detailed Spec

Forma (arch-architect, 2026-07-19):

- `VertexCreativeAdapter implements CreativeProviderAdapter<CreativeProviderRequestV1>` en `apps/creative-runner`, colocado con el `FakeReferenceAdapter`; se inyecta al `LabRunner` en lugar del fake, sin tocar dominio ni contrato.
- Routing table interna `capability → { model, modelVersion, region, invocation }`. `supports()` refleja exactamente lo servible Google-native (image/video); `image-vectorize`/`audio-generate` → false.
- `estimate` = lookup puro (pricing table `as-of`, reverificar) → el fence reserva antes de gastar. `submit` = única llamada facturable (síncrona `generateContent`), cachea por `externalRunId = idempotencyKey`. `poll` decodifica el base64 inline → `sha256` → `outputHashes` (nunca URL pública); `actualCredits` del tamaño real.
- Keyless: `VertexTransport` obtiene token por ADC/WIF (SA `aiplatform.user`), sin API key; transporte inyectable para tests sin red.
- Región per-model (Omni `global`; us-east4/us-central1 → NOT_FOUND). Error mapping a `dependency_unavailable`, sin fuga de token/body.
- Provider-selection `GLOBE_LAB_PROVIDER=fake|vertex` (default `fake`), reversible al instante.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (transport + tables + estimate) → Slice 2 (submit/poll/errors) → Slice 3 (wiring + tests + docs).
- El wiring de provider-selection (Slice 3) DEBE mantener `fake` como default; vertex sólo se activa con `GLOBE_LAB_PROVIDER=vertex` explícito. No se prende el canary billable en ninguna slice de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Llamada facturable inesperada (gasto no gobernado) | provider/billing | low | `estimate` sin red; único `submit` facturable alcanzable sólo por el seam; spend fence reserva antes; `GLOBE_LAB_PROVIDER=fake` default; kill switch fail-closed | fence reserva/settle en el manifest; costo por attempt |
| Región equivocada (Omni fuera de `global`) → NOT_FOUND | provider | medium | región per-model en la routing table; test que fija la región por modelo | error `dependency_unavailable` + failureReason |
| Fuga de access token / body crudo de Vertex a logs o cliente | security | low | transporte encapsula auth; error mapping sanitizado; nunca loggear token/body | revisión de logs; test de error-mapping |
| Model ID de Vertex se filtra a policy de dominio | boundary | low | routing table interna del adapter; el dominio rutea por `CreativeCapability`; test que verifica que el manifest expone `model` pero el dominio no lo decide | code review + test |
| Pricing table stale (PUBLIC_PREVIEW cambia semanal) | provider/cost | medium | `as-of` inline + hard rule reverificar; `actualCredits` del tamaño real (no asumido); fence capa el gasto | drift vs factura real |
| `supports()` true para capability no servible → fallo silencioso | robustness | low | `supports()` false explícito para vectorize/audio; test de boundary | experiment failed limpio |

### Feature flags / cutover

- `GLOBE_LAB_PROVIDER` (env, default `fake`): selecciona fake vs vertex. Revert = `fake` + redeploy/restart. Reversible al instante.
- `GLOBE_LAB_ENABLED` (env, default OFF, ya existente): kill switch del Lab entero. Con OFF, ningún experimento corre → el adapter nunca se invoca.
- El canary billable en vivo requiere AMBOS (`GLOBE_LAB_PROVIDER=vertex` + `GLOBE_LAB_ENABLED=true`) + credenciales + budget; flip explícito y gated por humano.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (aditivo, sin efecto runtime hasta el wiring) | <5 min | si |
| Slice 2 | revert PR (aún no cableado como default) | <5 min | si |
| Slice 3 | `GLOBE_LAB_PROVIDER=fake` (env) + redeploy, o revert PR | <5 min | si |
| Canary billable (rollout, fuera de esta task) | `GLOBE_LAB_PROVIDER=fake` / `GLOBE_LAB_ENABLED=false` | <5 min | si (el gasto ya incurrido es one-way, pero capado por el fence) |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes (tests del adapter con transporte mockeado, cero gasto).
2. **[rollout gated, no en esta task]** Verificar `aiplatform.googleapis.com` + modelos (Omni/Veo/Imagen) habilitados en el proyecto `efeonce-globe`; bind `roles/aiplatform.user` a la SA de runtime; budget/alertas.
3. **[rollout gated]** Deploy del runner (Dockerfile) o ADC local al proyecto `efeonce-globe`.
4. **[rollout gated]** Un experimento por el seam con `GLOBE_LAB_PROVIDER=vertex` + `GLOBE_LAB_ENABLED=true`, hard cap bajo; verificar manifest real (provider/model/version, actualCredits, hashes) + fence reservó/liquidó + el reporte del harness deja de declarar "proveedor fake".
5. **[rollout gated]** Revert a `fake` tras el smoke; declarar el estado en el ledger de flags/handoff.

### Out-of-band coordination required

Prerequisitos de rollout (fuera del repo, gated por humano): habilitar Vertex + modelos en el proyecto `efeonce-globe`; IAM `aiplatform.user` a la SA de runtime; budget/alertas de gasto; Dockerfile + deploy del runner o ADC al proyecto. Ninguno se ejecuta en la task de código.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `VertexCreativeAdapter` implementa `CreativeProviderAdapter<CreativeProviderRequestV1>` (`providerId`/`supports`/`estimate`/`submit`/`poll`) y se inyecta al `LabRunner` sin cambiar dominio ni contrato.
- [x] Los model IDs de Vertex viven dentro del adapter; el dominio no nombra ningún modelo (verificado por test).
- [x] `estimate` no hace red (lookup); `submit` es la única llamada facturable; `poll` retorna hashes (nunca URL pública).
- [x] `supports()` retorna false para `image-vectorize`/`audio-generate` (boundary Google-native explícito).
- [x] Región per-model correcta (Omni `global`); error mapping a códigos canónicos sin fuga de token/body.
- [x] `GLOBE_LAB_PROVIDER` default `fake`; vertex sólo con flag + credenciales; revert a fake documentado.
- [x] Suite de tests con transporte mockeado (cero red, cero gasto) cubre estimate/submit/poll/error-mapping/región/boundary/reproducibilidad; `pnpm check` + `pnpm build` verdes.
- [x] El canary billable en vivo queda declarado como rollout gated (go-live checklist) y NO se ejecuta en esta task; estado reportado como `code complete, rollout pendiente`.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `node --test apps/creative-runner/src/vertex-adapter.test.ts` (transporte mockeado)
- `pnpm task:lint --task TASK-1486` + `pnpm ops:lint --changed` (control plane Greenhouse)

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla) con la carpeta.
- [x] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [x] `Handoff.md` actualizado (canary billable como rollout pendiente + go-live checklist).
- [x] `changelog.md` actualizado si cambió comportamiento/estructura visible.
- [x] Chequeo de impacto cruzado sobre TASK-1459/1460/1461/1463 (Delta: adapter real disponible).
- [x] Estado final honesto: `code complete, rollout pendiente` mientras el canary billable no se autorice/ejecute.

## Delta 2026-07-19 — canary billable verificado en vivo

Con autorización explícita de gasto del operador, se ejecutó la **primera llamada facturable real** de Globe por el seam sancionado (harness → `command → registry → LabRunner → VertexCreativeAdapter.submit → Vertex generateContent`), ADC del operador contra el proyecto `efeonce-globe`. Prereqs confirmados sin gasto: `aiplatform.googleapis.com` habilitada + `gemini-omni-flash-preview` y `gemini-2.5-flash-image` accesibles (HTTP 200) en `efeonce-globe`/global. Resultado: `image-generate` → `gemini-2.5-flash-image`, `state=candidate_ready`, `provider=vertex`, `proposedRoute==actualRoute` (sin fallback), `estimatedCredits==actualCredits==10`, output `sha256:5b2311e8…` (nunca URL pública), fence reservó/liquidó. El harness one-shot NO se commiteó. El runtime deployado sigue `GLOBE_LAB_PROVIDER=fake` por default — el canary probó el path vertex sin cambiar el default. Estado: **rollout verificado en vivo (canary), default aún fake**.

## Follow-ups

- Persistencia de bytes de salida al bucket `efeonce-globe-lab-evidence` (hoy hash-only).
- `CompositeProviderAdapter` + adapters no-Google (Fal para Seedance/Recraft/ElevenLabs; OpenAI directo) ruteando por `supports()`.
- Path LRO de Veo `predictLongRunning` (esta task usa el path síncrono).
- Integración con el credit ledger comercial (TASK-1468) para el credit↔$ conversion.
- El canary billable en vivo contra `efeonce-globe` (prerequisitos de rollout).

## Open Questions

- ¿El primer canary billable arranca sólo con image + video (Vertex fuerte, verificado) y deja voz (Chirp) para después? Recomendación: sí.
- ¿La persistencia al bucket entra en esta task o como follow-up inmediato? Diseño actual: follow-up (hash-only primero).
