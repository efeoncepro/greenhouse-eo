# TASK-1487 — Globe Model Lab: Fal provider adapter (Recraft/Seedream/Seedance) + Composite router

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
- Branch: `task/TASK-1487-globe-fal-provider-adapter-composite`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega el segundo `CreativeProviderAdapter` real del Model Lab de Efeonce Globe: un `FalCreativeAdapter` (repo hermano `efeonce-globe`, `apps/creative-runner`) que conecta tres modelos **no-Google allowlisted** vía la queue API de Fal — **Recraft** (`image-vectorize`), **Seedream 5** (`image-generate`/`image-edit`) y **Seedance 2.0** (`video-generate`/`video-extend`) — más un `CompositeProviderAdapter` que combina Vertex + Fal ruteando por `supports()` con una política explícita para el overlap en image/video. Respeta el boundary: Fal **nunca** rutea un modelo Google, y usa el **secreto propio de Globe** (nunca el de Greenhouse). Audio/voz quedan fuera de este scope.

## Why This Task Exists

TASK-1486 dejó el `VertexCreativeAdapter` code-complete + verificado en vivo para image/video **Google-native** (Nano Banana, Veo/Omni). Pero la evidencia empírica (`engine-selection-by-fidelity-contract`) muestra que no hay un motor universalmente mejor: para preservar un set existente Seedance gana, para vectores sólo Recraft sirve, y Seedream es una alternativa fuerte de image. Hoy Globe no puede correr esos motores no-Google: `image-vectorize` no lo sirve nadie, y no hay forma de comparar Seedream/Seedance contra los modelos Google. Este es el segundo adapter (Fal, con Recraft/Seedream/Seedance) + el `CompositeProviderAdapter` que TASK-1486 declaró como follow-up.

## Goal

- Un `FalCreativeAdapter` que implemente `CreativeProviderAdapter` contra la queue API de Fal ruteando `image-vectorize`→Recraft, `image-generate`/`image-edit`→Seedream 5 y `video-generate`/`video-extend`→Seedance 2.0, con el routing capability→slug dentro del adapter y el secreto de Globe inyectado (nunca hardcodeado ni compartido con Greenhouse).
- Un `CompositeProviderAdapter` que combina Vertex + Fal: rutea `image-vectorize` a Fal (único que lo sirve) y resuelve el overlap image/video con una política explícita y documentada (default Vertex Google-native; Seedream/Seedance alcanzables vía `GLOBE_LAB_PROVIDER=fal`).
- Provider-selection extendida (`GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite`, default `fake`) + suite de tests con transporte Fal mockeado (cero red, cero gasto); el canary Fal billable en vivo queda declarado como rollout gated (necesita el secreto Fal de Globe).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar (en el repo hermano `efeonce-globe`, salvo indicación):

- `efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (SPEC-002: provider seam, § Realización del adapter real)
- `efeonce-globe/docs/architecture/PLATFORM_FOUNDATION_V1.md` (invariantes 6, 9, 12)
- `.claude/skills/greenhouse-globe/SKILL.md` (provider boundary: Fal solo non-Google allowlisted; nunca un modelo Google por Fal; nunca compartir secreto entre Globe y Greenhouse)
- `.claude/skills/greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md` + `.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md` (slugs verificados + evidencia motor-por-contrato)

Reglas obligatorias:

- **Fal NUNCA rutea un modelo Google** (Veo/Omni/Imagen/Nano Banana van por Vertex). El `FalCreativeAdapter` conecta SOLO modelos no-Google: Recraft, Seedream 5, Seedance 2.0.
- **Secreto propio de Globe**: la API key de Fal se resuelve server-side vía el Secret Manager boundary de Globe (secreto dedicado, NUNCA `greenhouse-fal-api-key`). En el adapter se inyecta (`getApiKey`), nunca se hardcodea ni se loggea.
- **Queue API correcta**: usar el `status_url`/`response_url` que Fal devuelve; NUNCA reconstruir URLs de polling desde el slug (sub-path → 405).
- **Output como hashes**: el adapter descarga los bytes de output server-side (la URL de Fal nunca entra al manifest) → `sha256` → `outputHashes`. Nunca una URL pública en el manifest.
- El `CompositeProviderAdapter` resuelve el overlap image/video con una **política explícita** (no ambigua); `image-vectorize` siempre a Fal; el fence + kill switch + provider-selection default `fake` no cambian.

## Normative Docs

- `docs/tasks/complete/TASK-1486-globe-vertex-real-provider-adapter.md` (primer adapter + el follow-up "CompositeProviderAdapter + adapters no-Google (Fal)")
- `docs/tasks/to-do/TASK-1459-globe-still-model-lab.md` / `TASK-1460-globe-motion-model-lab.md` (labs que ahora tienen Seedream/Seedance como motor alternativo)

## Dependencies & Impact

### Depends on

- `TASK-1457` (Model Lab foundation, complete) — `LabRunner`, `LabRunnerPort`, `CreativeProviderAdapter`.
- `TASK-1486` (Vertex adapter, complete) — el patrón del adapter real + el wiring `GLOBE_LAB_PROVIDER` + el `VertexCreativeAdapter` que el Composite combina.
- `efeonce-globe/packages/provider-contract` (interfaz `CreativeProviderAdapter`, tipos `CreativeProviderRequestV1`/`ProviderEstimate`/`ProviderAttemptResult`).

### Blocks / Impacts

- `TASK-1459` (still model lab) / `TASK-1460` (motion model lab) — ganan **Seedream 5** (still) y **Seedance 2.0** (motion) como motores alternativos a Vertex para comparar por contrato de fidelidad; su recommendation matrix ahora puede correr múltiples motores.
- `TASK-1463` (model promotion readiness registry) — la evidencia por motor ahora incluye Fal (Seedream/Seedance/Recraft) además de Vertex.
- `TASK-1461` (audio localization) — **NO se desbloquea**: Fal en este scope conecta Recraft/Seedream/Seedance (image/vector/video), NO audio; el carril audio sigue necesitando un adapter dedicado (ElevenLabs/Seed vía Fal, o Chirp vía Vertex) en una task futura.

### Files owned

- `efeonce-globe/apps/creative-runner/src/fal-adapter.ts` (nuevo) — `FalCreativeAdapter` + routing/pricing (Recraft/Seedream/Seedance) + `FalTransport` port + `createFalTransport` (keyed).
- `efeonce-globe/apps/creative-runner/src/composite-adapter.ts` (nuevo) — `CompositeProviderAdapter` + política de routing.
- `efeonce-globe/apps/creative-runner/src/fal-adapter.test.ts` + `composite-adapter.test.ts` (nuevos) — tests mockeados.
- `efeonce-globe/apps/creative-runner/src/index.ts` (exports).
- `efeonce-globe/apps/studio-web/src/app.ts` (provider-selection `fal`/`composite` + `GLOBE_FAL_API_KEY`).
- `efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (§ provider real — Fal + Composite).
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md` (control plane Greenhouse).

## Current Repo State

### Already exists

- `efeonce-globe/apps/creative-runner/src/vertex-adapter.ts` — `VertexCreativeAdapter` (patrón a espejar) + `VertexTransport`/`createVertexTransport`.
- `efeonce-globe/apps/creative-runner/src/index.ts` — `FakeReferenceAdapter`, `LabRunner`, `VertexCreativeAdapter`.
- `efeonce-globe/apps/studio-web/src/app.ts` — `buildLabRunner` + `GLOBE_LAB_PROVIDER` (fake|vertex), `createAdcAccessTokenProvider`.
- Slugs Fal verificados (referencia): `bytedance/seedream/v5/pro/text-to-image` + `/pro/edit`, `bytedance/seedance-2.0/*` — skills `greenhouse-ai-image-generator` + `motion-design-studio`.

### Gap

- No existe adapter para modelos no-Google; `image-vectorize` no lo sirve nadie y no hay forma de correr Seedream/Seedance.
- No existe un router que combine Vertex + Fal por capability con política para el overlap.
- Globe no tiene un secreto Fal propio provisionado (prerequisito de rollout, no de código).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/creative-runner` (repo hermano; greenhouse-eo NO cambia runtime ni build)
- Future candidate home: `remain-shared`
- Boundary: implementa el contrato canónico `CreativeProviderAdapter`; el único consumer es el `LabRunner` (directo o vía `CompositeProviderAdapter`).
- Server/browser split: server-only; API key de Fal, transporte HTTP y slugs nunca cruzan al browser.
- Build impact: reusa `fetch` nativo; transporte inyectable (mockeable) para tests sin red.
- Extraction blocker: `none` — reemplazable detrás del `LabRunnerPort`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `provider adapter (CreativeProviderAdapter) + routing/pricing tables internas del adapter Fal + el router Composite`
- Consumidores afectados: `worker (LabRunner)` — indirecto: command/reader del Model Lab + evaluation harness
- Runtime target: `worker`

### Contract surface

- Contrato existente a respetar: `efeonce-globe/packages/provider-contract` (`CreativeProviderAdapter<CreativeProviderRequestV1>`).
- Contrato nuevo o modificado: ningún cambio de contrato público — ambos adapters implementan la interfaz existente. Se agregan valores `fal`/`composite` al env `GLOBE_LAB_PROVIDER` + un env `GLOBE_FAL_API_KEY` + un `FalTransport` port interno.
- Backward compatibility: `compatible` (aditivo; fake sigue default).
- Full API parity: sin superficie nueva; se consume por el mismo seam `command → adapter → runner`.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla (manifest por intento).
- Invariantes que no se pueden romper:
  - Fal NUNCA rutea un modelo Google; `FalCreativeAdapter.supports()` sólo `image-generate`/`image-edit`/`image-vectorize`/`video-generate`/`video-extend`.
  - El `CompositeProviderAdapter` resuelve el overlap image/video con política explícita (no elige al azar); `image-vectorize` siempre a Fal; falla cerrado si ninguna sirve.
  - `estimate` sin red (pricing lookup); sólo `submit` es facturable; `poll` retorna hashes (nunca URL pública ni bytes crudos al cliente).
  - La API key de Fal es de Globe (nunca `greenhouse-fal-api-key`), inyectada, nunca loggeada.
- Tenant/space boundary: opera dentro del experiment ya scopeado por trusted context.
- Idempotency/concurrency: `idempotencyKey` → `externalRunId` estable; re-submit no re-encola.
- Audit/outbox/history: `ExperimentAttemptManifestV1` inmutable (provider/model/route/credits/hashes); `correlationId` encadena.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `flag OFF` — `GLOBE_LAB_PROVIDER=fake` default; `fal`/`composite` requieren flag + secreto Fal de Globe.
- Backfill plan: N/A.
- Rollback path: `flag off` — `GLOBE_LAB_PROVIDER=fake` (revert instantáneo) + `GLOBE_LAB_ENABLED=false`.
- External coordination: **prerequisito de rollout** (no de código): provisionar el secreto Fal propio de Globe; verificar los slugs Fal (Recraft/Seedream/Seedance) vigentes; budget/alertas.

### Security and access

- Auth/access gate: la capability `globe.lab.experiment.run` (+ trusted context) ya gatea; el adapter no agrega superficie de auth.
- Sensitive data posture: sin PII; inputs como hash. La API key de Fal y el body crudo de Fal son secretos internos — nunca al cliente ni a logs.
- Error contract: errores de Fal → error tipado del adapter → experiment `failed` + `fence.release`; NUNCA prosa/stack/key/body crudo. 401/403 → `access_denied`; 429 → `quota_exhausted`; queue failed/timeout → `provider_failed`/`upstream_error`.
- Abuse/rate-limit posture: el spend fence + kill switch acotan gasto; 429 de Fal → dependencia no disponible.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build` verdes; tests de `fal-adapter` + `composite-adapter` con transporte mockeado.
- DB/runtime checks: N/A.
- Integration checks: **el smoke facturable Fal en vivo es rollout gated** (necesita el secreto Fal de Globe) — no en esta task.
- Reliability signals/logs: `correlationId` + `failureReason` sanitizado en el manifest/logs.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers nombrados con paths reales.
- [x] Invariantes de datos, boundary (Fal solo non-Google: Recraft/Seedream/Seedance) y idempotencia explícitos.
- [x] Postura de migración/rollback explícita (flag OFF default, revert a fake).
- [x] Evidencia runtime listada (gate mockeado en CI; canary Fal billable gated por el secreto de Globe).
- [x] Dominios sensibles con errores canónicos, sin fuga de key/body crudo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — FalCreativeAdapter (queue API, keyed, Recraft/Seedream/Seedance)

- `FalTransport` port (submit/status/result/download) + `createFalTransport` (keyed, live-only, respeta `status_url`/`response_url`).
- `FAL_ROUTING` (`image-generate`/`image-edit`→Seedream 5, `image-vectorize`→Recraft, `video-generate`/`video-extend`→Seedance 2.0) + `FAL_PRICING` (as-of, reverificar) + `supports()` (esas 5 caps; NO audio/speech).
- `estimate` (lookup sin red), `submit` (encola + espera COMPLETED + descarga bytes + cachea), `poll` (hash de los bytes cacheados), error mapping. Inputs que requieren bytes (edit/vectorize/i2v) → `inputs_unavailable` hasta la resolución hash→bytes (follow-up).

### Slice 2 — CompositeProviderAdapter (Vertex + Fal, política para overlap)

- `CompositeProviderAdapter` que toma una lista de adapters + una política `Record<CreativeCapability, providerId>`; `supports()` = OR de los hijos; rutea estimate/submit por la política (o el único hijo que soporta); `poll` al hijo que emitió el `externalRunId`; falla cerrado si ninguno soporta.
- Política default: `image-vectorize`→fal (único); `image-generate`/`image-edit`/`video-generate`/`video-extend`→vertex (Google-native default). Seedream/Seedance alcanzables vía `GLOBE_LAB_PROVIDER=fal`.

### Slice 3 — Wiring + tests + docs

- Wiring en `app.ts`: `GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite`; `composite` = `CompositeProviderAdapter([vertex, fal])` con la política default; `GLOBE_FAL_API_KEY` env para el secreto de Globe.
- Tests mockeados (cero gasto): Fal submit/status/result/download, gotcha de URLs, error mapping, boundary (`supports`), routing por modelo (image→Seedream, video→Seedance, vectorize→Recraft) + Composite (vectorize→fal, image/video→vertex por política, unsupported→fail, poll al hijo correcto).
- Docs: § provider real (Fal + Composite) en la spec del Model Lab; task lifecycle; Delta en TASK-1459/1460/1461.

## Out of Scope

- El **smoke facturable Fal en vivo** (rollout gated por el secreto Fal de Globe).
- **Audio/voz** (ElevenLabs/Seed/Chirp) — no en este scope; el carril audio (TASK-1461) sigue sin adapter.
- Routing por contrato de fidelidad en el Composite (hoy política fija por capability; el selector fidelity-aware es follow-up).
- OpenAI directo como tercer adapter — follow-up.
- El credit ledger comercial (TASK-1468).
- Cambios en el dominio, el contrato del spine o cualquier runtime de greenhouse-eo.

## Detailed Spec

- `FalCreativeAdapter implements CreativeProviderAdapter<CreativeProviderRequestV1>` en `apps/creative-runner`, mismo patrón que `VertexCreativeAdapter`: routing/pricing internos (Recraft/Seedream/Seedance), `supports()` acotado a image/vector/video (NO audio), `estimate` sin red, `submit` única facturable (queue Fal: POST → `status_url`/`response_url`, poll hasta COMPLETED, descarga bytes), `poll` → `sha256` → hashes. `FalTransport` inyectable (mockeable). Key de Globe inyectada (`getApiKey`), nunca hardcodeada.
- `CompositeProviderAdapter implements CreativeProviderAdapter<CreativeProviderRequestV1>`: `#children: { providerId, adapter }[]` + `#policy: Record<capability, providerId>`; `supports(c)` = algún hijo lo soporta; `estimate/submit` → el hijo indicado por la política (o el único que soporta); `poll` → el hijo cuyo `providerId` prefija el `externalRunId`. Falla cerrado (`unsupported_capability`) si ninguno soporta.
- Wiring: `buildLabRunner` extendido — `fal` = `new FalCreativeAdapter(...)`; `composite` = `new CompositeProviderAdapter([vertex, fal], DEFAULT_POLICY)`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (Fal adapter) → Slice 2 (Composite) → Slice 3 (wiring + tests + docs). `fake` sigue default; ni `fal` ni `composite` se prenden en ninguna slice.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fal rutea un modelo Google (viola boundary) | boundary | low | `FAL_ROUTING` sólo Recraft/Seedream/Seedance; test que verifica los slugs son ByteDance/Recraft | code review + test |
| Secreto Fal de Greenhouse reusado en Globe | security | low | key inyectada + env `GLOBE_FAL_API_KEY` propio; nunca `greenhouse-fal-api-key`; nunca loggear | code review |
| Reconstruir URL de polling desde el slug (405) | robustness | medium | usar `status_url`/`response_url` que Fal devuelve; test del gotcha | error `upstream_error` |
| Fuga de key/body crudo de Fal | security | low | transporte encapsula auth; error mapping sanitizado | test error-mapping |
| Composite con overlap resuelto al azar | correctness | medium | política explícita `Record<capability, providerId>`; test de routing determinista | test |
| Slug Fal stale (Seedream/Seedance versiones) | provider/cost | medium | `as-of` + reverificar; el smoke live valida el slug real | error en submit |

### Feature flags / cutover

- `GLOBE_LAB_PROVIDER` (env, default `fake`): `fal`/`composite` requieren flag + `GLOBE_FAL_API_KEY`. Revert = `fake`.
- `GLOBE_LAB_ENABLED` (kill switch, default OFF): sin él, ningún experimento corre.
- El canary Fal billable en vivo requiere el flag + el secreto Fal de Globe + budget; gated por humano.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (aditivo, sin efecto hasta el wiring) | <5 min | si |
| Slice 2 | revert PR | <5 min | si |
| Slice 3 | `GLOBE_LAB_PROVIDER=fake` + redeploy, o revert PR | <5 min | si |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes (tests mockeados, cero gasto).
2. **[rollout gated]** Provisionar el secreto Fal propio de Globe + verificar los slugs Seedream/Seedance/Recraft vigentes.
3. **[rollout gated]** `GLOBE_LAB_PROVIDER=fal` (o `composite`) + `GLOBE_LAB_ENABLED=true`; un experimento image (Seedream) o video (Seedance) por el seam con hard cap bajo → verificar manifest real + fence + hashes.
4. **[rollout gated]** Revert a `fake` tras el smoke; declarar el runtime en el handoff.

### Out-of-band coordination required

Prerequisito de rollout (fuera del repo, gated por humano): secreto Fal propio de Globe en su Secret Manager; verificación de slugs Fal; budget/alertas. Ninguno en la task de código.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `FalCreativeAdapter` implementa `CreativeProviderAdapter` y `supports()` es true SOLO para `image-generate`/`image-edit`/`image-vectorize`/`video-generate`/`video-extend` (nunca audio/speech), ruteando a Seedream 5 / Recraft / Seedance 2.0 (todos non-Google).
- [x] La queue API usa `status_url`/`response_url` de Fal (nunca reconstruye desde el slug); output como hashes (nunca URL pública).
- [x] La key de Fal es de Globe (inyectada, `GLOBE_FAL_API_KEY`), nunca `greenhouse-fal-api-key` ni hardcodeada ni loggeada.
- [x] `CompositeProviderAdapter` resuelve el overlap image/video por política explícita (`image-vectorize`→fal; image/video→vertex default), falla cerrado si ningún hijo sirve, y `poll` va al hijo que hizo el submit.
- [x] `GLOBE_LAB_PROVIDER` acepta `fake|vertex|fal|composite`, default `fake`, reversible.
- [x] Suite mockeada (cero red, cero gasto) cubre Fal submit/status/result/download, gotcha, error-mapping, boundary + routing por modelo + Composite; `pnpm check` + `pnpm build` verdes.
- [x] El canary Fal billable queda declarado como rollout gated (secreto Fal de Globe); estado `code complete, rollout pendiente`.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `node --test apps/creative-runner/src/fal-adapter.test.ts apps/creative-runner/src/composite-adapter.test.ts`
- `pnpm task:lint --task TASK-1487` + `pnpm ops:lint --changed`

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla) con la carpeta.
- [x] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [x] `Handoff.md` actualizado (canary Fal como rollout pendiente + secreto Fal de Globe).
- [x] `changelog.md` actualizado.
- [x] Chequeo de impacto cruzado sobre TASK-1459/1460 (motores alternativos) y TASK-1461 (audio sigue sin adapter).
- [x] Estado final honesto: `code complete, rollout pendiente` mientras el canary Fal no se autorice/ejecute.

## Follow-ups

- El canary Fal billable en vivo contra Globe (secreto Fal propio + slugs verificados).
- Resolución hash→bytes desde el bucket privado (habilita edit/vectorize/i2v que requieren input).
- Routing por contrato de fidelidad en el Composite (reemplaza la política fija por capability).
- Adapter de audio/voz (ElevenLabs/Seed vía Fal, o Chirp vía Vertex) para TASK-1461.
- OpenAI directo como tercer adapter; integración con el credit ledger comercial (TASK-1468).

## Open Questions

- ¿El Composite default rutea video a Vertex/Omni o a Fal/Seedance? Diseño actual: Vertex default (Google-native, keyless, verificado en vivo); Seedance vía `fal` mode. El selector fidelity-aware es el follow-up que decide caso a caso.
- ¿Seedream lite o pro por default? Config en `FAL_ROUTING` (arranca pro), reverificar slug al go-live.
