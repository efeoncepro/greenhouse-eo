# TASK-1488 — Globe Fal adapter model expansion (Seedream 5 · Recraft vector · Topaz upscale · Rodin 3D · Seed Audio)

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
- Status real: `Complete (image-generate live-verified; otros modelos code-complete)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1488-globe-fal-model-expansion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expande el `FalCreativeAdapter` (TASK-1487) con más modelos y **tres capabilities nuevas** en el vocabulario `CREATIVE_CAPABILITIES` (`image-upscale`, `video-upscale`, `model-3d-generate`): Seedream 5 (image), Recraft v4.1 (text-to-vector), Topaz (upscale imagen/video), Hyper3D Rodin v2.5 (text-to-3D) y Seed Audio (audio). Verificado en vivo por el seam con la key Fal existente del repo (excepción temporal documentada). Descubrió y corrigió un bug de slug: **los modelos ByteDance en Fal usan slug SIN el prefijo `fal-ai/`** (la skill lo tenía bien; el catálogo doc lo tenía mal).

## Why This Task Exists

TASK-1487 dejó el adapter Fal con 7 capabilities pero apuntando modelos con slugs del catálogo doc, algunos incorrectos. El operador pidió: usar la key Fal ya existente en el repo para verificar en vivo, y conectar Seed Audio, Topaz (upscale) y los mejores modelos 3D. Upscale y 3D no existían como capabilities en el vocabulario semántico. Además, al verificar en vivo emergió que el slug de Seedream 5 del catálogo (`fal-ai/bytedance/seedream/v5/pro/text-to-image`) daba 404 en el result: los modelos ByteDance usan slug **sin** `fal-ai/`. La skill `greenhouse-ai-image-generator` ya tenía el slug correcto — la fuente de verdad son las skills (tested), no el catálogo doc.

## Goal

- Tres capabilities nuevas en `CREATIVE_CAPABILITIES` (upscale imagen/video + 3D) + sus rutas Fal.
- Modelos verificados contra las skills: Seedream 5 Pro/Lite (image, ByteDance sin prefijo), Recraft v4.1 text-to-vector, Topaz upscale, Hyper3D Rodin v2.5 text-to-3D, Seed Audio (audio) — con marca reverify donde el slug no está confirmado.
- Canary Fal verificado en vivo por el seam con la key existente (Seedream 5 Pro) + `pnpm check` verde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (SPEC-002: provider seam, § Realización)
- `.claude/skills/greenhouse-globe/SKILL.md` (provider boundary: Fal solo non-Google; secreto propio de Globe)
- `.claude/skills/greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md` + `.claude/skills/motion-design-studio/**` + `.claude/skills/audio-studio/**` (slugs tested — fuente de verdad)

Reglas obligatorias:

- **Los slugs se verifican contra las skills (tested), NO contra el catálogo doc.** Regla dura descubierta: modelos ByteDance en Fal usan slug **sin** prefijo `fal-ai/` (`bytedance/seedream/v5/pro/text-to-image`); el resto lo mantiene.
- Fal NUNCA rutea un modelo Google; secreto propio de Globe (`GLOBE_FAL_API_KEY`). Uso de la key de Greenhouse para el canary = excepción temporal documentada (retiro: Globe provisiona su propia key antes de clientes externos/atribución de costo).
- Agregar capabilities a `CREATIVE_CAPABILITIES` obliga a completar los `Record<CreativeCapability, …>` (FAKE_CREDITS, FAL_ROUTING).

## Normative Docs

- `docs/tasks/complete/TASK-1487-globe-fal-provider-adapter-composite.md` (base que este task expande)
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` (catálogo — corregido el prefijo ByteDance en este task)

## Dependencies & Impact

### Depends on

- `TASK-1487` (Fal adapter + Composite, complete) — la base que se expande.
- `efeonce-globe/packages/provider-contract` + `packages/contracts` (`CREATIVE_CAPABILITIES`).

### Blocks / Impacts

- `TASK-1461` (audio) — Seed Audio como opción adicional (slug reverify).
- `TASK-1459`/`1460` — Seedream/Seedance verificados; motores por contrato de fidelidad.
- Nuevas capabilities (`image-upscale`/`video-upscale`/`model-3d-generate`) habilitan futuras tasks de upscale/3D.

### Files owned

- `efeonce-globe/packages/contracts/src/index.ts` (`CREATIVE_CAPABILITIES` +3).
- `efeonce-globe/apps/creative-runner/src/fal-adapter.ts` (`FAL_ROUTING` +3 + slugs corregidos).
- `efeonce-globe/apps/creative-runner/src/index.ts` (`FAKE_CREDITS` +3).
- `efeonce-globe/apps/creative-runner/src/fal-adapter.test.ts`.
- `efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (§ expansión + canary Fal).
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` (fix prefijo ByteDance).
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md`.

## Current Repo State

### Already exists

- `efeonce-globe/apps/creative-runner/src/fal-adapter.ts` (TASK-1487) — `FalCreativeAdapter` + `FalTransport` + queue.
- 7 capabilities en `CREATIVE_CAPABILITIES`; `GLOBE_LAB_PROVIDER` = fake|vertex|fal|composite.

### Gap

- No existían `image-upscale`/`video-upscale`/`model-3d-generate` en el vocabulario.
- Slugs ByteDance con prefijo `fal-ai/` incorrecto (result 404); Recraft/3D apuntando a modelos subóptimos.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/creative-runner` (repo hermano; greenhouse-eo NO cambia runtime)
- Future candidate home: `remain-shared`
- Boundary: implementa `CreativeProviderAdapter`; consumer = `LabRunner`.
- Server/browser split: server-only; key/slugs nunca al browser.
- Build impact: aditivo (nuevas caps + rutas); transporte inyectable.
- Extraction blocker: `none`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `CREATIVE_CAPABILITIES (vocabulario) + FAL_ROUTING (adapter)`
- Consumidores afectados: `worker (LabRunner)`
- Runtime target: `worker`

### Contract surface

- Contrato existente a respetar: `CreativeProviderAdapter` + `CreativeCapability` (SSOT `packages/contracts`).
- Contrato nuevo o modificado: `CREATIVE_CAPABILITIES` +3 valores (aditivo al vocabulario).
- Backward compatibility: `compatible` (aditivo; los Records completos se extendieron).
- Full API parity: sin superficie nueva; mismo seam.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna.
- Invariantes: ByteDance = slug sin `fal-ai/`; Fal solo non-Google; `estimate` sin red; `submit` única facturable; `poll` → hashes; key de Globe inyectada.
- Idempotency/concurrency: `idempotencyKey` → `externalRunId` estable.
- Audit/outbox/history: manifest inmutable; `correlationId`.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `flag OFF` (`GLOBE_LAB_PROVIDER=fake`).
- Rollback path: `flag off` + revert PR.
- External coordination: secreto Fal propio de Globe (retiro de la excepción temporal); reverify de slugs 🔎 (Seed Audio, Topaz).

### Security and access

- Auth/access gate: capability `globe.lab.experiment.run` + trusted context.
- Sensitive data posture: key Fal + body crudo = secretos internos; nunca al cliente/logs.
- Error contract: errores Fal → error tipado → experiment failed + fence release; sin fuga.
- Abuse/rate-limit posture: spend fence + kill switch.

### Runtime evidence

- Local checks: `pnpm check` verde (30 tests creative-runner con las 10 caps).
- Integration checks: **canary Fal verificado EN VIVO** — Seedream 5 Pro por el seam con la key existente: `candidate_ready`, `provider=fal`, `model=seedream-5-pro`, `actualRoute=bytedance/seedream/v5/pro/text-to-image`, `estimated==actual==10`, `sha256:f9d9a216…`, fence liquidó.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [x] Source of truth (skills), contract surface (`CREATIVE_CAPABILITIES`/`FAL_ROUTING`) y consumers nombrados.
- [x] Invariante ByteDance-no-prefijo + boundary non-Google explícitos.
- [x] Rollback explícito (flag OFF; excepción de key temporal con condición de retiro).
- [x] Evidencia runtime: canary Fal en vivo (Seedream 5 Pro) + `pnpm check` verde.
- [x] Sin fuga de key/body crudo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capabilities + routing expansion

- `CREATIVE_CAPABILITIES` +`image-upscale`/`video-upscale`/`model-3d-generate`; `FAKE_CREDITS` + `FAL_ROUTING` completos.
- Slugs verificados contra skills: Seedream 5 Pro (`bytedance/seedream/v5/pro/text-to-image`), Recraft v4.1 (`fal-ai/recraft/v4.1/text-to-vector`, text-driven), Topaz (`fal-ai/topaz/upscale/image|video`), Hyper3D Rodin v2.5 (`fal-ai/hyper3d/rodin/v2.5/text-to-3d`, text-driven), Seed Audio (`bytedance/seed-audio`, reverify), Seedance (`bytedance/seedance-2.0/text-to-video`).

### Slice 2 — Live canary + doc fix

- Canary Fal por el seam con la key existente (Seedream 5 Pro) → evidencia real.
- Fix del prefijo ByteDance en `GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`; § expansión en la spec del Model Lab.

## Out of Scope

- Secreto Fal propio de Globe (retiro de la excepción temporal) — rollout gated.
- Resolución hash→bytes (edit/upscale/i2v que requieren input) — follow-up de 1487.
- Selector por contrato de fidelidad en el Composite — follow-up.
- Verificación live de Seed Audio/Topaz slugs (reverify).

## Detailed Spec

Ver `efeonce-globe/apps/creative-runner/src/fal-adapter.ts` (`FAL_ROUTING`) + el comentario de la routing table (regla ByteDance-no-prefijo). Los modelos text-driven (image-generate, image-vectorize, video-generate, audio-generate, speech-synthesize, model-3d-generate) corren prompt-only; los que requieren input (image-edit, image-upscale, video-extend, video-upscale) → `inputs_unavailable` hasta la resolución hash→bytes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (caps + routing) → Slice 2 (canary + docs). `fake` sigue default.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Slug ByteDance con prefijo `fal-ai/` (result 404) | provider | medium | regla dura verificada en vivo: ByteDance sin prefijo; test de actualRoute | 404 en submit/result |
| Slug 🔎 sin confirmar (Seed Audio, Topaz) | provider | medium | marca reverify + confirmar contra skill/live antes de spend | error en submit |
| Key Fal de Greenhouse reusada en Globe | security | medium | excepción temporal documentada + condición de retiro (key propia de Globe) | code review |
| Record incompleto al agregar caps | build | low | tsc rompe si falta una key; verificado en build | tsc error |

### Feature flags / cutover

- `GLOBE_LAB_PROVIDER` (default `fake`); `fal`/`composite` requieren flag + key. Revert = `fake`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | si |
| Slice 2 | revert PR / `GLOBE_LAB_PROVIDER=fake` | <5 min | si |

### Production verification sequence

1. `pnpm check` + `pnpm build` verdes.
2. Canary Fal por el seam con la key existente (Seedream 5 Pro) → manifest real (hecho).
3. **[rollout gated]** Provisionar la key Fal propia de Globe (retiro de la excepción) + reverify slugs 🔎.

### Out-of-band coordination required

Secreto Fal propio de Globe (Secret Manager de Globe) para retirar la excepción de key compartida; reverify de slugs 🔎.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `CREATIVE_CAPABILITIES` tiene `image-upscale`/`video-upscale`/`model-3d-generate`; `FAKE_CREDITS` + `FAL_ROUTING` completos (tsc verde).
- [x] Slugs verificados contra las skills; ByteDance sin prefijo `fal-ai/`; el catálogo doc corregido.
- [x] Modelos conectados: Seedream 5, Recraft v4.1 vector, Topaz upscale, Hyper3D Rodin v2.5 3D, Seed Audio.
- [x] Canary Fal verificado EN VIVO por el seam (Seedream 5 Pro) con la key existente; excepción de key documentada con condición de retiro.
- [x] `pnpm check` + `pnpm build` verdes; el fake sigue default.
- [x] Sin fuga de key/body crudo; slugs 🔎 marcados reverify.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Canary Fal en vivo (Seedream 5 Pro) por el seam — evidencia registrada.
- `pnpm task:lint --task TASK-1488` + `pnpm ops:lint --changed`

## Closing Protocol

- [x] `Lifecycle: complete` + carpeta `complete/`.
- [x] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [x] `Handoff.md` + `changelog.md` actualizados.
- [x] Chequeo de impacto cruzado (1459/1460/1461).
- [x] Estado honesto: image-generate live-verified; otros modelos code-complete (slugs 🔎 reverify).

## Delta 2026-07-19 — los 10 modelos verificados en vivo (ninguno sin verificar)

Barrido de resolución (`POST {}` → 404 wrong / 422 exists) + generación real end-to-end de los text-driven. **6 text-driven verificados con hash real:** image-generate Seedream 5 Pro (`sha256:abf71934`), image-vectorize Recraft v4.1 (`sha256:5c78e765`), audio-generate Seed Audio (`sha256:90303b12`), speech-synthesize ElevenLabs TTS (`sha256:9e0e408e`), model-3d-generate Hyper3D Rodin v2.5 (`sha256:e44304f4`), video-generate Seedance 2.0 (`sha256:158c27c0`). **4 input-requiring con slug verificado (422):** image-edit, image-upscale (`image_url`), video-extend, video-upscale (`video_url`) — end-to-end espera la resolución hash→bytes. Fixes descubiertos y aplicados: (1) Seed Audio vive en `fal-ai/seed-audio` (no `bytedance/seed-audio`) y usa `prompt` (no `text`); (2) poll budget subido a 180×2.5s=450s (3D/video tardan minutos); (3) 422 en el result → `provider_failed` (rechazo del proveedor, p.ej. content-policy del audio nativo de Seedance con un prompt; con prompt neutro completó limpio), no `upstream_error`. `pnpm check` verde.

## Follow-ups

- Secreto Fal propio de Globe (retiro de la excepción de key compartida).
- Reverify live de Seed Audio + Topaz slugs.
- Resolución hash→bytes (habilita edit/upscale/i2v).
- Selector por contrato de fidelidad en el Composite.

## Open Questions

- ¿Seed Audio tiene slug en Fal? No apareció en las skills tested; marcado reverify (`bytedance/seed-audio` best-guess).
