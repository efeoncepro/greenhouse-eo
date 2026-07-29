# TASK-1569 — Globe video derivative and playback projection

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
- Backend impact: `reader`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|data|creative`
- Blocked by: `none`
- Branch: `task/TASK-1569-globe-video-derivative-playback-projection`

## Summary

Expone una proyección gobernada para que Globe pueda presentar videos con poster, preview transcode, duración, dimensiones, aspect ratio, presencia de audio y estados reales de disponibilidad. Reutiliza los perfiles de derivatives existentes y prepara el contrato consumido por Cinematic Canvas.

## Why This Task Exists

Globe ya declara `video.poster` y `video.preview-transcode`, pero la UI actual recibe media de forma demasiado genérica y el viewer termina dependiendo del `<video controls>` nativo. Falta una forma estable de distinguir poster listo, preview pendiente, preview listo, buffering, error, autorización y video sin audio sin duplicar reglas en React.

## Goal

- Entregar metadata y retrieval autorizado suficientes para una revisión de video premium.
- Mantener los derivados versionados, content-addressed y compatibles con el contrato vigente.
- Probar estados reales con video permitido, pendiente, unavailable, forbidden y error.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- `video.poster` y `video.preview-transcode` son derivados; nunca reemplazan el original gobernado.
- El browser consume reader/DTO y ticket autorizado; no inspecciona tablas, GCS ni secretos.
- No crear filmstrip, escenas o poster inteligente en esta task sin un contrato de derivative propio y ADR si cambia el spine.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1528` — derivados multimedia y Range delivery.
- `efeonce-globe/packages/contracts/src/media-derivatives.ts` — perfiles vigentes `video.poster@1` y `video.preview-transcode@1`.
- `efeonce-globe/apps/media-derivatives/src/` — transformaciones existentes.
- `TASK-1567` — patrón paralelo de projection para audio, sin compartir formato específico.

### Blocks / Impacts

- Bloquea TASK-1570 para poster, preview y metadata real.
- Impacta `efeonce-globe/apps/studio-client/src/data/governed-media.ts`, feed y viewer como consumers; no cambia ownership del feed/viewer de TASK-1559.

### Files owned

- `docs/tasks/to-do/TASK-1569-globe-video-derivative-playback-projection.md`.
- En ejecución: reader/projection canónico en Globe y wiring de media derivation, sin endpoint específico para una card.

## Current Repo State

### Already exists

- Contrato de perfiles `video.poster` y `video.preview-transcode`.
- Transform plans con WebP poster y MP4 H.264/AAC faststart.
- Retrieval gobernado, Range delivery y `ProducerViewer` React.

### Gap

- El feed trata video principalmente como thumbnail + play glyph.
- Falta un resultado canónico con poster, preview, duración, dimensiones, audio presence y estado de derivative/retrieval.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe/apps/media-derivatives`, `efeonce-globe/packages/contracts` y reader servido por `apps/studio-web`.
- Future candidate home: `domain-package`
- Boundary: derivative records + governed video projection; consumers son Producer feed/viewer, API/MCP readers futuros y playback client.
- Server/browser split: servidor resuelve ownership, estado, autorización y ticket; browser mantiene playback efímero y presentación.
- Build impact: contratos, worker de derivatives y runtime BFF; no agregar SDK de provider al browser.
- Extraction blocker: sesión/tenancy, grants y retrieval firmado están acoplados al runtime actual de Globe.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: derivative contract/records y media retrieval authority.
- Consumidores afectados: Producer feed/viewer, Cinematic Canvas y futuros API/MCP consumers.
- Runtime target: `local|staging|production` en Globe y worker de derivados.

### Contract surface

- Contrato existente a respetar: `efeonce-globe/packages/contracts/src/media-derivatives.ts`, `TASK-1528` y retrieval ticket vigente.
- Contrato nuevo o modificado: reader/projection de playback video; cambios al formato exigen ADR.
- Backward compatibility: `compatible`, con campos aditivos y estados explícitos.
- Full API parity: un reader server-side sirve UI y consumers programáticos; ningún card resuelve media por su cuenta.

### Data model and invariants

- Entidades afectadas: retained media asset, derivative manifest/records y retrieval authorization.
- Invariantes: source hash/generation/profile/transformer/output MIME permanecen exactos; poster y preview no reemplazan original; duración/dimensiones corresponden al video real.
- Tenant/space boundary: se deriva del workspace binding y grant de asset existente.
- Idempotency/concurrency: lectura idempotente; solicitar/resolver projection no crea derivative ni muta playback state.
- Audit/outbox/history: logs sanitizados de derivative/retrieval state; no evento por cada frame o seek.

### Migration, backfill and rollout

- Migration posture: `none|additive`; consumir derivatives existentes y backfill sólo con plan explícito.
- Default state: `read-only`, con fallback poster/degraded.
- Backfill plan: dry-run allowlisted de videos; no re-procesar masivamente ni borrar derivados.
- Rollback path: retirar consumer/projection y volver a thumbnail/poster básico; conservar records y objetos.
- External coordination: ninguna nueva credencial; deploy del worker sólo si el reader necesita wiring adicional.

### Security and access

- Auth/access gate: sesión + workspace/asset grant y ticket corto.
- Sensitive data posture: metadata no sensible; no filtrar bucket, object path, grants ni errores de provider.
- Error contract: `processing|ready|unavailable|forbidden|not_found|dependency_unavailable`, sanitizado.
- Abuse/rate-limit posture: no polling por frame; respetar Range/cache y límites del retrieval existente.

### Runtime evidence

- Local checks: tests de contrato/reader, transform tests, `pnpm lint`, `pnpm typecheck`.
- DB/runtime checks: lectura read-only de video real con poster/preview presentes y ausentes.
- Integration checks: Range playback, ticket autorizado, workspace permitido/denegado.
- Reliability signals/logs: derivative state latency, `video_poster_missing`, `video_preview_unavailable`, `media_retrieval_denied`.
- Production verification sequence: deploy gated → asset allowlisted → poster → preview playback → forbidden/error → logs sanitizados.

### Acceptance criteria additions

- [ ] Source of truth, contract surface, consumers y paths están definidos.
- [ ] Aspect ratio, duración, dimensiones, audio presence y estados no se inventan en UI.
- [ ] Tenant/access, idempotencia y rollback están probados.
- [ ] Existe evidencia runtime con video real y derivative ausente/pending.
- [ ] No se introduce filmstrip/scene derivative sin contrato y ADR aplicables.

## Library Discovery — 2026-07-26

- **Adopt:** existing server-side FFmpeg/media-derivatives pipeline as the canonical source for poster, preview, metadata and transcode.
- **Evaluate:** Mediabunny only for lightweight browser metadata/codec inspection when it does not bypass governed retrieval ([docs](https://mediabunny.dev/guide/introduction)).
- **Evaluate:** Vidstack only after a React 19, Blob URL, focus and reduced-motion spike; no provider/player dependency is accepted by documentation alone.
- **Do not adopt:** `ffmpeg.wasm` as the canonical transformer; browser outputs cannot become Globe assets without governance.

## Scope

### Slice 1 — Video projection contract

- Implementar/adaptar reader para poster, preview, metadata y estados canónicos.
- Mantener compatibilidad con derivative identities y retrieval ticket existentes.

### Slice 2 — Runtime evidence

- Probar poster ready, preview pending, preview ready, forbidden, not found, buffering/unavailable y video sin audio.
- Documentar el contract consumido por TASK-1570.

## Out of Scope

- Cinematic Stage, timeline, MediaDock o componentes React.
- Filmstrip, scene detection, chapters o poster scene-aware.
- Nuevo codec/provider, analytics de reproducción o edición de video.

## Detailed Spec

La proyección debe separar disponibilidad del poster y del preview. Un poster listo con preview pendiente sigue siendo un estado útil y debe permitir comunicar procesamiento sin prometer reproducción. La respuesta debe incluir metadata suficiente para layout responsive, estado de audio y un descriptor de retrieval autorizado. La UI no debe inferir estados por fallas de `fetch` ni convertir cualquier error en “no hay poster”.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe cerrar antes de que TASK-1570 implemente el stage real.
- Slice 2 debe cerrar antes de activar playback en la UI.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Preview no autorizada | access/retrieval | low | reutilizar grants/tickets y permit-deny tests | `media_retrieval_denied` |
| Poster listo se interpreta como preview listo | reader/UI | medium | estados separados y fixtures pending | `video_preview_unavailable` |
| Reprocesamiento costoso accidental | worker/derivatives | low | reader read-only, idempotencia y allowlist | job volume/latency |
| Filmstrip se introduce sin contrato | architecture | medium | out of scope + ADR gate | contract diff |

### Feature flags / cutover

Sin flag para el reader aditivo; el consumer de UI permanece gated por el flag de Producer existente hasta evidencia verde.

### Rollback plan per slice

- Slice 1: desactivar el consumer y volver al poster/thumbnail actual; no eliminar records.
- Slice 2: retirar escenario/activación de playback y conservar retrieval/derivatives sin cambio destructivo.

## Verification

- `pnpm task:lint --task TASK-1569`.
- Tests focales de contracts, transforms, reader y media retrieval en `efeonce-globe`.
- Smoke con video real, poster/preview ready, pending, forbidden y error.

## Closing Protocol

- Mantener `Lifecycle: to-do` hasta que el agente ejecutor tome la task.
- Cerrar con evidencia runtime, sincronización de README/Handoff y estado honesto de rollout.

## Follow-ups / Open Questions

- Confirmar si el límite de duración/layout requiere un campo adicional o puede derivarse de metadata existente.
- Diseñar una task posterior para `video.timeline-frames` sólo después de medir el valor de filmstrip en revisión real.
