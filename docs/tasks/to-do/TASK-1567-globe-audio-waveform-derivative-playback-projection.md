# TASK-1567 — Globe audio waveform derivative and playback projection

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
- Branch: `task/TASK-1567-globe-audio-waveform-derivative-playback-projection`

## Summary

Expone de forma gobernada los derivados `audio.waveform-peaks` y la metadata mínima de playback para que Globe pueda construir una experiencia de audio premium sin inventar datos en el browser. Reutiliza el contrato de derivados existente y deja un reader consumible por UI y futuros consumers programáticos.

## Why This Task Exists

Globe ya tiene el contrato de derivados y entrega Range, pero el feed no dispone todavía de una proyección estable que relacione audio, duración, peaks, retrieval autorizado y estado degradado. Sin esta base, la UI puede terminar dibujando una waveform ornamental o duplicando reglas de acceso en React.

## Goal

- Exponer peaks reales, duración y estado de disponibilidad mediante un reader gobernado.
- Mantener hash, ownership, workspace, MIME, retrieval y límites de acceso del media contract existente.
- Entregar evidencia local/staging con audio real, derivative presente/ausente y error de retrieval.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- `audio.waveform-peaks` sigue siendo un derivado de media, no una nueva fuente de verdad.
- La UI consume un reader/DTO; no consulta tablas, GCS ni secretos desde el browser.
- El fallback debe declarar ausencia del derivado; no presentar peaks sintéticos como medición real.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1528` — derivados multimedia y entrega Range, cerrada.
- `packages/contracts/src/media-derivatives.ts` en `efeonce-globe` — contrato existente de tipos de derivados.
- `apps/media-derivatives/src/` en `efeonce-globe` — pipeline vigente de derivados.

### Blocks / Impacts

- Bloquea la implementación runtime de `TASK-1568` para el estado de waveform real.
- Impacta `apps/studio-client/src/data/governed-media.ts` y la ruta `/producer` como consumers, sin mover autoridad al cliente.

### Files owned

- `docs/tasks/to-do/TASK-1567-globe-audio-waveform-derivative-playback-projection.md`
- En ejecución: reader/projection canónico dentro de `efeonce-globe`, sin crear un endpoint específico para una card.

## Current Repo State

### Already exists

- El contrato declara `audio.waveform-peaks` y `audio.preview-stream`.
- Existe pipeline `apps/media-derivatives` y retrieval gobernado en `apps/studio-client/src/data/governed-media.ts`.
- El feed/viewer resiliente ya está cubierto por `TASK-1559`/`TASK-1526`.

### Gap

- Falta una proyección/reader que entregue peaks y duración con autoridad, estados `ready|missing|unavailable|error` y límites de acceso explícitos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe/apps/media-derivatives`, contratos en `efeonce-globe/packages/contracts` y reader servido por `studio-web`/domain runtime.
- Future candidate home: `domain-package`
- Boundary: `media-derivatives` contract + governed reader; consumers autorizados son Producer UI, viewer y futuros API/MCP readers.
- Server/browser split: el servidor resuelve acceso, metadata y URL; el browser sólo reproduce un recurso autorizado y mantiene estado efímero del elemento audio.
- Build impact: impacto en los paquetes de contrato, worker de derivados y runtime que sirve el reader; no agregar SDK de provider al cliente.
- Extraction blocker: sesión/tenancy, retrieval firmado y ownership de media viven en el runtime actual de Globe.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: contrato de derivados y reader de media gobernado.
- Consumidores afectados: UI Producer/viewer y futuros API/MCP consumers.
- Runtime target: `local|staging|production` en Globe, con worker de derivados existente.

### Contract surface

- Contrato existente a respetar: `efeonce-globe/packages/contracts/src/media-derivatives.ts` y `TASK-1528`.
- Contrato nuevo o modificado: reader/projection de audio playback; no cambiar el formato del derivado salvo ADR explícito.
- Backward compatibility: `compatible` — campos aditivos y fallback explícito.
- Full API parity: el reader sirve la misma forma gobernada a UI y consumers programáticos; no hay lógica de acceso en React.

### Data model and invariants

- Entidades afectadas: media asset, derivative manifest y retrieval authorization.
- Invariantes: workspace/ownership no se cruza; MIME y hash corresponden al asset; peaks son reproducibles desde el derivative; duración no se inventa.
- Tenant/space boundary: se deriva del contexto autenticado y del asset grant existente.
- Idempotency/concurrency: lectura idempotente; resolver múltiples veces no genera derivatives ni muta estado.
- Audit/outbox/history: logs sanitizados del reader y señal de derivado faltante; no crear evento de negocio por cada play.

### Migration, backfill and rollout

- Migration posture: `none|additive`; usar derivados existentes y backfill sólo si el pipeline ya lo soporta.
- Default state: `read-only` y fallback seguro.
- Backfill plan: no realizar backfill mutante sin inventario; si se requiere, dry-run por allowlist de audio y batch pequeño.
- Rollback path: retirar el reader del consumer y volver al estado “waveform unavailable”; no borrar assets ni derivatives.
- External coordination: ninguna nueva credencial; verificar deploy del worker/runtime sólo si el reader requiere wiring.

### Security and access

- Auth/access gate: sesión + workspace/asset grant gobernado.
- Sensitive data posture: media metadata no sensible; URLs y errores no deben filtrar secretos ni raw provider errors.
- Error contract: estados canónicos `missing|unavailable|forbidden|error`, sanitizados y observables.
- Abuse/rate-limit posture: respetar rate limits y cache/retrieval existentes; no generar un request por frame del playhead.

### Runtime evidence

- Local checks: tests de contrato/reader, `pnpm lint`, `pnpm typecheck` y tests focales de derivados.
- DB/runtime checks: smoke read-only con asset de audio real, derivative presente y ausente.
- Integration checks: retrieval Range/preview y autorización con workspace permitido y denegado.
- Reliability signals/logs: latencia/error del reader, `audio_waveform_missing`, `media_retrieval_denied`.
- Production verification sequence: deploy gated → leer asset allowlisted → reproducir preview → verificar fallback → revisar logs sin datos sensibles.

### Acceptance criteria additions

- [ ] Source of truth, contrato, consumidores y paths están definidos.
- [ ] Tenant/access, idempotencia y fallback están probados.
- [ ] No se cambia el formato de `audio.waveform-peaks` sin ADR.
- [ ] Existe evidencia runtime con audio real y derivative ausente.

## Library Discovery — 2026-07-26

- **Adopt:** `wavesurfer.js` + `@wavesurfer/react` for rendering governed pre-decoded peaks, regions, timeline and hover.
- **Boundary:** WaveSurfer is a projection/interaction layer; the derivative reader, playback state, asset authority and Blob URL lifecycle remain Globe-owned.
- **Do not adopt:** browser-side FFmpeg or full audio decoding as the default path; use `audio.waveform-peaks` and the existing media-derivatives worker.
- **Sources:** [WaveSurfer docs](https://wavesurfer.xyz/docs/), [pre-decoded peaks](https://wavesurfer.xyz/docs/), [timeline plugin](https://wavesurfer.xyz/docs/plugins/timeline/).

## Scope

### Slice 1 — Contract and reader

- Implementar/adaptar el reader gobernado para `audio.waveform-peaks`, duración y retrieval autorizado.
- Definir estados canónicos y compatibilidad con assets sin derivative.

### Slice 2 — Runtime evidence

- Probar asset permitido, asset sin peaks, asset denegado y retrieval error.
- Documentar señales, límites y consumer contract para TASK-1568.

## Out of Scope

- Componentes React, layout, motion o copy del feed.
- Nuevo formato de waveform, proveedor de audio o almacenamiento paralelo.
- Analítica de engagement/playback por usuario.

## Detailed Spec

El DTO debe poder expresar asset identity, `previewUrl` autorizado, `durationMs`, `waveformPeaks` cuando exista, MIME, y un estado de disponibilidad. Los peaks deben conservar orden y normalización definidos por el contrato existente. El reader debe devolver un resultado degradado cuando el derivative no exista, no fallar toda la tarjeta ni ocultar un error de autorización como “sin waveform”.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe cerrar antes de que TASK-1568 consuma el reader.
- Slice 2 debe cerrar antes de declarar la UI code complete.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| URL o metadata fuera del workspace | access/retrieval | low | reutilizar grant y tests permit/deny | `media_retrieval_denied` |
| Peaks ausentes tratados como reales | reader/UI | medium | estado explícito y fixture sin derivative | `audio_waveform_missing` |
| Reader genera trabajo por playback | reader/runtime | low | lectura idempotente, sin mutación ni polling por frame | latencia/read volume |

### Feature flags / cutover

Sin flag para el contrato aditivo; el consumer puede permanecer apagado hasta que el reader tenga evidencia verde.

### Rollback plan per slice

- Slice 1: retirar el consumer del reader o devolver estado `unavailable`; no borrar datos.
- Slice 2: desactivar el escenario/consumer de audio y conservar el feed sin waveform enriquecida.

## Verification

- `pnpm task:lint --task TASK-1567`.
- Tests focales del contrato, reader y retrieval en `efeonce-globe`.
- Smoke con audio real y cuatro estados: ready, missing, forbidden, error.

## Closing Protocol

- Mantener `Lifecycle: to-do` hasta que el agente ejecutor tome la task y la mueva a `in-progress`.
- Al cerrar, sincronizar `docs/tasks/README.md`, handoff y evidencia runtime; estado honesto `complete` o `code complete, rollout pendiente`.

## Follow-ups / Open Questions

- Confirmar si la normalización de peaks vigente requiere un límite de puntos distinto para móvil.
- Si se modifica el contrato compartido, detener ejecución y proponer ADR antes del cambio.
