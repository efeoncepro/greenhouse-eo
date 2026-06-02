# TASK-996 — Greenhouse Creative Video Studio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ai|content|agency|ui|ops`
- Blocked by: `ADR acceptance: docs/architecture/GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`
- Branch: `task/TASK-996-creative-video-studio`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Productizar dentro de Greenhouse la capacidad validada en el piloto HyperFrames:
generar promos/videos de marca desde una URL, brief o asset library, con captura
de identidad visual, guion, storyboard, composicion HTML animada, VO, snapshots,
revision humana y export MP4/WebM.

## Why This Task Exists

El piloto `videos/efeoncepro-promo/` demostro que Greenhouse/Efeonce puede
convertir una web publica en un video promo de 20 segundos usando HyperFrames.
Hoy eso existe como workflow local asistido por agente: poderoso, pero sin
storage canonico, permisos, aprobacion, versionado, render jobs, asset library
ni lifecycle operativo.

La oportunidad robusta no es "subir un video" sino crear un **Creative Video
Studio**: Greenhouse como control plane de producto y HyperFrames como motor de
composicion/render.

## Goal

- Crear el foundation runtime/documental para proyectos de video generativo.
- Definir y materializar el flujo brief -> capture -> design/script/storyboard
  -> composition -> QA snapshots -> approval -> render -> export asset.
- Integrar HyperFrames como motor controlado, no como scripts sueltos.
- Persistir metadata y assets en storage canonico con permisos Greenhouse.
- Exponer una primera surface interna para operadores Efeonce.
- Mantener revision humana obligatoria antes de publish/export client-facing.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

Reglas obligatorias:

- No implementar runtime hasta que el ADR propuesto quede aceptado o el checkpoint
  humano autorice un MVP explicitamente.
- Greenhouse owns workflow, permisos, metadata, aprobacion, storage y relacion
  con cliente/campana.
- HyperFrames owns composicion/render: no reimplementar engine de video V1.
- El HTML animado es source editable; el artefacto publico recomendado es
  MP4/WebM exportado.
- No almacenar proyectos productivos solo en `videos/` local.
- No llamar proveedores AI/TTS/avatar desde scripts sueltos en runtime.
- No publicar claims generados sin revision/aprobacion humana.
- No hacer render sincrono en rutas request/response.
- Todo surface visible debe cumplir navigation reachability.
- Todo copy reutilizable debe ir a `src/lib/copy/`.

## Normative Docs

- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- ADR acceptance:
  - `docs/architecture/GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`
- Pilot artifact:
  - `videos/efeoncepro-promo/`
- HyperFrames workflow already validated locally:
  - `npx hyperframes capture`
  - `npx hyperframes tts`
  - `npx hyperframes transcribe`
  - `npx hyperframes lint`
  - `npx hyperframes validate`
  - `npx hyperframes inspect`
  - `npx hyperframes snapshot`
  - `npx hyperframes preview`
- Existing AI asset generator:
  - `src/lib/ai/image-generator.ts`
  - `src/lib/ai/openai-image.ts`
- Existing visual capture concepts:
  - `scripts/frontend/scenarios/`
  - `pnpm fe:capture`

### Blocks / Impacts

- Internal Efeonce promo/video generation.
- Future animated case studies and campaign recaps.
- Future AI-generated website hero videos.
- Future client-facing video generation (requires separate decision).
- Possible attachment of video outputs to Agency/Commercial campaigns.

### Files owned

Candidate new files:

- `src/lib/creative-video/types.ts`
- `src/lib/creative-video/project-store.ts`
- `src/lib/creative-video/brief-store.ts`
- `src/lib/creative-video/capture-job.ts`
- `src/lib/creative-video/composition-store.ts`
- `src/lib/creative-video/render-job.ts`
- `src/lib/creative-video/approval.ts`
- `src/lib/creative-video/hyperframes-runner.ts`
- `src/lib/reliability/queries/creative-video-*.ts`
- `src/app/api/creative/video-projects/route.ts`
- `src/app/api/creative/video-projects/[projectId]/route.ts`
- `src/app/api/creative/video-projects/[projectId]/generate/route.ts`
- `src/app/api/creative/video-projects/[projectId]/render/route.ts`
- `src/app/api/creative/video-projects/[projectId]/approve/route.ts`
- `src/app/(dashboard)/creative/video-studio/page.tsx`
- `src/app/(dashboard)/creative/video-studio/[projectId]/page.tsx`
- `src/views/greenhouse/creative/video-studio/CreativeVideoStudioView.tsx`
- `src/views/greenhouse/creative/video-studio/VideoProjectDetailView.tsx`
- `src/lib/copy/creative-video.ts`
- `migrations/*task-996*.sql`
- `docs/manual-de-uso/creative/video-studio.md`
- `docs/documentation/creative/video-studio.md`

Existing files likely touched:

- `src/config/entitlements-catalog.ts`
- `src/config/greenhouse-nomenclature.ts`
- `src/config/navigation/vertical.ts`
- `src/lib/navigation/route-reachability-manifest.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `docs/architecture/GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/manual-de-uso/README.md`
- `docs/documentation/README.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- A complete local HyperFrames pilot exists at `videos/efeoncepro-promo/`.
- The pilot has source docs (`DESIGN.md`, `SCRIPT.md`, `STORYBOARD.md`),
  `index.html`, `narration.wav`, `transcript.json`, capture artifacts and
  snapshots.
- HyperFrames lint/validate/inspect/snapshot workflow was executed locally with
  clean results.
- Greenhouse already has an AI visual asset generator architecture and helper.
- Greenhouse already has GVC for visual evidence, but GVC is a QA/capture
  helper, not a video generation product module.

### Gap

- No Greenhouse module owns video projects, metadata, approval or renders.
- No canonical storage model for generated video sources/renders.
- No route, UI, API or capability for video generation.
- No render job queue/worker contract.
- No reliability signals for capture/render failures.
- No approval/publish lifecycle for generated claims.
- No reusable templates for Efeonce/client videos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR acceptance and technical discovery

- Review and accept/update `GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`.
- Inventory where to store private assets/renders in current Greenhouse media
  architecture.
- Decide whether V1 render jobs run local-only, Cloud Run, GitHub Action,
  queued worker or manual operator runner.
- Confirm HyperFrames CLI/runtime installation strategy and Node/Python/ffmpeg
  dependencies for the chosen runtime.
- Decide MVP audience and route location.
- Produce a short implementation plan before writing runtime.

### Slice 1 — Data model and storage foundation

- Add metadata model for `VideoProject`, `VideoBrief`, `BrandCapture`,
  `CompositionSource`, `RenderJob`, `ExportAsset` and `VideoApproval`.
- Add migrations only after storage/runtime decision is accepted.
- Add private asset storage contract for captures, source files, snapshots,
  narration and exports.
- Add retention policy for intermediate capture artifacts.
- Add server-side types and tests for lifecycle/status transitions.

### Slice 2 — HyperFrames runner wrapper

- Create a server/tooling wrapper around HyperFrames commands:
  - capture;
  - tts/transcribe or configured external TTS adapter;
  - lint;
  - validate;
  - inspect;
  - snapshot;
  - render.
- Persist command evidence, logs, output paths and validation results.
- Enforce bounded runtime, max duration, max assets and allowed source domains
  for V1.
- Fail honest with structured errors; never swallow render/capture failures.

### Slice 3 — Internal API and approval lifecycle

- Add internal APIs for project create/read/update, generate draft, approve,
  request changes and render.
- Gate APIs with dual-plane access (`creative.video_studio` view + granular
  capabilities).
- Enforce human approval before export/publish.
- Add idempotency keys for render jobs.
- Add audit/outbox events only if the final design needs downstream consumers.

### Slice 4 — Operator UI

- Add `/creative/video-studio` internal workbench.
- Add project detail with brief, generated docs, preview/snapshots, status,
  validation evidence, approvals and render outputs.
- Add "create from URL" path for internal Efeonce use.
- Add a safe preview surface or link to HyperFrames Studio where appropriate.
- Ensure route reachability via navigation or manifest.
- Use `src/lib/copy/creative-video.ts` for reusable copy.

### Slice 5 — Render/export and asset library integration

- Add MP4/WebM export flow.
- Store exported assets with metadata, owner, project, source version, duration,
  format and approval evidence.
- Add download/copy-link actions with signed URLs.
- Add optional attach-to-campaign/client/website metadata if owner domain exists
  and discovery confirms the correct primitive.

### Slice 6 — Reliability, docs and rollout

- Add reliability signals:
  - `creative.video.capture_failed`
  - `creative.video.validation_failed`
  - `creative.video.render_failed`
  - `creative.video.render_queue_lag`
  - `creative.video.asset_missing`
  - `creative.video.unapproved_publish_attempt`
- Update user docs and manual.
- Add GVC/visual evidence for UI.
- Run local checks, build, route reachability and task lint.

## Out of Scope

- Client-facing self-service generation.
- Public HTML animation embed as default delivery mechanism.
- Fully autonomous publish to website/social channels.
- Replacing HyperFrames with a custom render engine.
- HeyGen avatar presenter generation as the primary V1 path.
- Billing/chargeback per render.
- Creating a full DAM if existing private asset storage is sufficient.

## Detailed Spec

### MVP product behavior

V1 should be internal-only:

- create project from URL;
- generate draft artifacts;
- review snapshots/preview;
- approve;
- render MP4/WebM;
- store/export asset.

### Lifecycle

Candidate lifecycle:

```text
draft -> generating -> review_ready -> changes_requested -> approved -> rendering -> rendered -> published
                                   \-> failed
```

`published` can mean "available as approved export in Greenhouse", not necessarily pushed to a public website.

### Access

Candidate view/capabilities:

- view: `creative.video_studio`
- capabilities:
  - `creative.video_project.read`
  - `creative.video_project.create`
  - `creative.video_project.generate`
  - `creative.video_project.review`
  - `creative.video_project.approve`
  - `creative.video_project.render`
  - `creative.video_project.publish`

The implementation plan must decide initial grants. Default should be
`efeonce_admin` and optionally AI/tooling/admin creative operators, not all
collaborators.

### Template strategy

V1 should seed templates conservatively:

- Efeonce 16:9 product promo;
- Efeonce 9:16 social cutdown;
- case study proof wall;
- website hero loop without VO.

Client-brand templates require explicit brand capture/review before reuse.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (ADR/discovery) MUST complete before runtime slices.
- Slice 1 (metadata/storage) -> Slice 2 (runner) -> Slice 3 (API/lifecycle).
- Slice 4 (UI) can start after Slice 3 API contracts are stable.
- Slice 5 (render/export) requires Slice 2 runner + Slice 3 approval lifecycle.
- Slice 6 (signals/docs) ships before enabling any production render path.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Render jobs consume too much CPU/storage | ops/cloud | medium | quotas, max duration/assets, async worker, retention policy | `creative.video.render_queue_lag` |
| Generated claims are published without review | content/security | medium | mandatory approval state before export/publish | `creative.video.unapproved_publish_attempt` |
| Capture pulls incomplete/missing website assets | data/assets | medium | validation evidence, missing asset detection, manual asset override | `creative.video.asset_missing` |
| HyperFrames dependency breaks in runtime worker | platform | medium | wrapper, pinned version, doctor/preflight, fallback manual runner | `creative.video.render_failed` |
| Client-facing abuse if exposed too early | security/product | low in V1 | internal-only V1, no client grants | no signal V1; access audit |

### Feature flags / cutover

Candidate flags:

- `CREATIVE_VIDEO_STUDIO_ENABLED=false` by default.
- `CREATIVE_VIDEO_RENDER_ENABLED=false` by default.
- `CREATIVE_VIDEO_CAPTURE_ENABLED=false` by default.

Rollout starts with metadata/UI read-only or manual-runner mode. Render/capture
automation must be flipped only after staging validation.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Disable feature flag; leave additive metadata/tables unused | <5 min flag, DB additive | yes |
| Slice 2 | Disable render/capture flags; fall back to local/manual pilot workflow | <5 min | yes |
| Slice 3 | Disable API routes via feature flag/capability grants | <5 min | yes |
| Slice 4 | Hide navigation/view grant; route remains inaccessible | <5 min | yes |
| Slice 5 | Disable export/render flags; preserve approved source projects | <5 min | yes |
| Slice 6 | Remove signal readers if noisy via revert or thresholds | one deploy | yes |

### Production verification sequence

1. Validate ADR accepted and task plan approved.
2. Run local wrapper against a small fixture project.
3. Run UI/API locally with feature flags off.
4. Enable UI-only in staging; verify access and route reachability.
5. Enable capture/render in staging for one allowlisted Efeonce project.
6. Verify lint/validate/inspect/snapshot evidence is stored.
7. Render one MP4/WebM in staging and download via signed URL.
8. Monitor reliability signals.
9. Enable production internal-only with conservative quotas.

### Out-of-band coordination required

- Confirm HyperFrames licensing/usage posture for internal production use.
- Confirm runtime environment for `ffmpeg`, Python/TTS dependencies and browser
  dependencies if render workers run outside local dev.
- Confirm storage bucket/path and retention policy for generated media.
- Confirm whether external TTS/HeyGen/OpenAI providers require new secrets or
  budget thresholds.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR `GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md` is accepted or explicitly
      updated with the chosen V1 runtime/storage path.
- [ ] Operators can create an internal video project from a URL.
- [ ] Greenhouse persists project metadata, generated source artifacts and
      output assets outside local disk.
- [ ] HyperFrames wrapper can run capture/lint/validate/inspect/snapshot/render
      with structured evidence.
- [ ] UI exposes project detail, review status, snapshots/preview evidence and
      render outputs.
- [ ] Human approval is required before export/publish.
- [ ] Access is gated by view + capabilities.
- [ ] Reliability signals exist for capture/render/validation/asset failures.
- [ ] Documentation/manual explain HTML source vs MP4/WebM production output.

## Verification

- `pnpm task:lint --task TASK-996`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm route-reachability-gate --strict`
- `pnpm design:lint`
- `pnpm fe:capture --route=/creative/video-studio --env=local --hold=3000`
- HyperFrames fixture checks:
  - `npx hyperframes lint`
  - `npx hyperframes validate`
  - `npx hyperframes inspect`
  - `npx hyperframes snapshot`

## Closing Protocol

[Cerrar una task es obligatorio y forma parte de Definition of Done. Si la
implementacion termino pero estos items no se ejecutaron, la task sigue abierta.]

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress`
      al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o
      `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o
      validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o
      protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ADR accepted/documented before runtime implementation
- [ ] storage, worker, flags, secrets, retention and production verification are
      complete before marking runtime slices done

## Closing Notes

- Update `docs/architecture/DECISIONS_INDEX.md`.
- Update `docs/documentation/README.md` and `docs/manual-de-uso/README.md` if
  user-facing docs are added.
- Update `Handoff.md` and `changelog.md`.
- Do not mark complete if capture/render flags, worker runtime, storage,
  approval, docs or production verification remain pending.
