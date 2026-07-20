# TASK-1490 — Globe Cross-Model Edit/Refine Capability

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `none`
- Branch: `task/TASK-1490-globe-cross-model-edit-refine-capability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Generalizar el edit/refine "sobre lo generado" a TODOS los modelos que aceptan edición, con una semántica de edit gobernada que rutee a los DOS paradigmas nativos de edición (stateful por sesión vs. reference-based) según el modelo, hilvanando el candidato previo en el nuevo experimento por el mismo seam del Model Lab. La implementación de referencia (Gemini Omni, edit stateful) ya quedó hecha; esta task extiende el patrón a Seedream/GPT-Image/Nano-Banana (imagen) y Kling/Seedance (video/extend).

## Why This Task Exists

Editar sobre un candidato ya generado es una capacidad transversal, no específica de un modelo — pero cada proveedor la implementa distinto. Hoy sólo existe el camino de **Gemini Omni** (edit stateful vía `previous_interaction_id`, superficie `generativelanguage` + key). El resto de los modelos edita por **referencia** (re-submit del output previo como input): Seedream 5 (`bytedance/seedream/v5/pro/edit`), GPT Image 2 (image-to-image edit), Nano Banana (`gemini-2.5-flash-image` edit), Kling y Seedance (image-to-video / extend). Sin una capability de edit generalizada, cada nuevo motor editable re-inventa el hilván candidato→edit, el manifest queda inconsistente y el operador no puede "refinar" un candidato de forma uniforme por la plataforma gobernada. Además emergió en vivo un **gotcha cross-surface** (un `interaction_id` de la superficie keyless Vertex NO es editable en la superficie `generativelanguage` — namespaces distintos) que debe quedar contractualizado, no re-descubierto.

## Goal

- Una semántica/capability de **edit/refine** canónica y gobernada, transport-neutral, que un operador/agente invoque igual para cualquier modelo editable.
- Un router de edit que despache al **mecanismo nativo** de cada modelo: (a) **stateful** (Omni `previous_interaction_id`), (b) **reference-based** (output previo → input reference, apoyado en track B + `resolvedInputs`).
- El candidato previo se hilvana por el manifest (`providerRunRef` o el hash del output) hacia el nuevo experimento, respetando spend fence, kill switch, private-ingest y el boundary Globe↔Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `.claude/skills/greenhouse-globe/SKILL.md` (contrato de arquitectura de Globe; boundary, provider seam, dual-transport Omni)
- `.claude/skills/motion-design-studio/efeonce/GEMINI_OMNI_VERTEX.md` (contrato Interactions API + las dos superficies)

Reglas obligatorias:

- **NUNCA** el LLM/adapter escribe estado gobernado directo: el edit es otro experimento por el seam `command → registry → runner → adapter`, con spend fence + kill switch.
- **NUNCA** cruzar superficies para un chain stateful (un `interaction_id` de keyless Vertex no es válido en `generativelanguage`): un chain editable stateful genera y edita en la **misma** superficie.
- **NUNCA** romper el boundary Globe↔Greenhouse (secretos de provider propios de Globe; registry de tasks sólo Greenhouse).
- Model ids / edit-mechanism viven DENTRO del adapter, nunca en policy de dominio.

## Normative Docs

- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` (slugs de edit por modelo: Seedream edit, Seedance i2v/extend, etc.)

## Dependencies & Impact

### Depends on

- Referencia de implementación (Omni edit-command, ya hecha esta sesión, repo `efeonce-globe`): `apps/creative-runner/src/vertex-omni-adapter.ts` (dual-transport + `previousInteractionId`), `packages/contracts/src/index.ts` (`PrepareExperimentPayloadV1.previousInteractionId`, `ExperimentAttemptManifestV1.providerRunRef`), `packages/provider-contract/src/index.ts` (`ProviderAttemptResult.providerRunRef`, `CreativeProviderRequestV1.previousInteractionId`), `packages/domain/src/model-lab.ts` (validatePreparePayload), `apps/creative-runner/src/index.ts` (runner threading).
- Track B (hash→bytes resolution) para el paradigma reference-based: `apps/creative-runner/src/input-resolver.ts` + `resolvedInputs`.

### Blocks / Impacts

- TASK-1460 (motion lab), TASK-1461 (audio lab): habilita el carril "refinar candidato" en cada medio.
- TASK-1467 (provenance): el lineage de un candidato editado debe encadenar al padre.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` (semántica edit, si requiere un campo/enum nuevo)
- `../efeonce-globe/packages/domain/src/model-lab.ts` (validación/ruteo de edit)
- `../efeonce-globe/apps/creative-runner/src/{fal-adapter,vertex-adapter,vertex-omni-adapter}.ts` (mecanismo de edit por adapter)
- `../efeonce-globe/apps/studio-web/src/app.ts` (wiring de transports de edit)
- `docs/tasks/to-do/TASK-1490-...` (esta task)

## Current Repo State

### Already exists

- **Seam de edit + reference impl (Omni)**: `providerRunRef` en el manifest, `previousInteractionId` en el payload, `VertexOmniAdapter` dual-transport (generate keyless Vertex + edit Gemini-key), y la regla cross-surface. Verificado en vivo (create `store:true` → edit → 200 completed).
- **Reference-based ya soportado a nivel de input**: track B + `resolvedInputs` permiten re-inyectar un output previo como referencia (edit por referencia) — falta la semántica que lo orqueste candidato→edit.
- Slugs de edit por modelo en el catálogo Fal (Seedream edit, Seedance i2v).

### Gap

- No hay una **capability/semántica de edit generalizada**: el edit stateful de Omni es ad-hoc (se dispara por `previousInteractionId`); no existe el paradigma reference-based orquestado (tomar `providerRunRef`/output-hash del candidato → re-inyectarlo como `authorizedInput` del nuevo experimento).
- No hay un **router de edit** que, dado "editar candidato X con instrucción Y", elija stateful vs reference-based según el adapter/modelo.
- El manifest no expresa el **lineage padre→editado** de forma explícita (hoy `lineage` sólo lleva el experimentId propio).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: repo hermano `efeonce-globe` (`packages/contracts`, `packages/domain`, `apps/creative-runner`, `apps/studio-web`); gobernanza en `greenhouse-eo` (EPIC-028)
- Future candidate home: `remain-shared`
  <!-- Dentro del monorepo de Globe; el edit es parte del Model Lab / provider seam, no un servicio nuevo. -->
- Boundary: la semántica de edit es transport-neutral en `packages/contracts` + `packages/domain`; el mecanismo (stateful/reference) vive DENTRO de cada `CreativeProviderAdapter`; consumers = command/reader del spine, nunca UI directa.
- Server/browser split: server-only (adapters + secretos + spend fence); el API pública sólo lleva el candidato por referencia (id/hash), nunca bytes ni secretos.
- Build impact: `none` (Node 24 nativo; sin dependencia pesada nueva)
- Extraction blocker: `none` (respeta el seam existente; no crea `apps/*`/`packages/*` nuevos)

## Backend/Data Contract

- **Source of truth**: el experimento/manifest del Model Lab (`greenhouse_*`/store de Globe); el candidato previo se referencia por `providerRunRef` (stateful) o por el hash del output (reference-based). El estado de sesión stateful lo posee el proveedor (Omni `store`, retención 55d paid / 1d free), NO Globe.
- **Contract surface**: extender la semántica de `PrepareExperimentPayloadV1` (ya tiene `previousInteractionId`; evaluar un campo explícito de "edit-from" que unifique id-stateful vs output-hash) + el manifest (`providerRunRef` ya existe; agregar lineage padre→editado). Command existente `globe.lab.experiment.prepare/execute` (evaluar si amerita un `globe.lab.experiment.edit` dedicado o un flag en prepare).
- **Data invariants**: (1) un edit stateful genera y edita en la MISMA superficie (cross-surface = fail closed); (2) un edit reference-based re-inyecta el output previo como `authorizedInput` (track B), nunca bytes crudos por la API; (3) el lineage del candidato editado encadena al padre; (4) el spend fence cobra el edit como un experimento nuevo (no gratis).
- **Tenant/access boundary**: mismo workspace/entitlement que el generate; el candidato padre debe pertenecer al mismo workspace (no editar candidatos de otro tenant).
- **Idempotency/concurrency**: `idempotencyKey` por edit; un re-submit del mismo edit no re-genera (como el generate).
- **Migration/backfill/rollback posture**: additive (campos opcionales nuevos en contratos; sin migración destructiva). Rollback = revert PR.
- **Sensitive data/error posture**: errores saneados por adapter (`edit_unavailable`, `provider_failed`, etc.); nunca el body crudo del proveedor ni el secreto.
- **Audit/signal posture**: el edit emite el mismo audit/outbox que un experimento; evaluar un signal de "edit chain roto" (padre inexistente / cross-surface).
- **Runtime evidence**: verificar en vivo un chain generate→edit por cada paradigma (stateful: Omni; reference: Seedream edit + Seedance i2v) a través del seam, con evidencia de manifest + lineage.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Semántica de edit canónica + lineage padre→editado

- Definir (en `packages/contracts`) la forma canónica de "editar candidato X": unificar `previousInteractionId` (stateful) y `editFromOutputHash`/`editFromAttempt` (reference-based) bajo una semántica clara, transport-neutral.
- El manifest del experimento editado registra el lineage al padre (encadena `lineage`).

### Slice 2 — Router de edit en el dominio + adapters reference-based

- El dominio/adaptador decide el paradigma según el modelo: stateful (ya en Omni) vs reference-based.
- Implementar el paradigma reference-based en `FalCreativeAdapter` (Seedream edit, Seedance i2v/extend) y `VertexCreativeAdapter` (Nano Banana edit) tomando el output previo (resuelto por track B) como `authorizedInput`.

### Slice 3 — Wiring studio-web + verificación en vivo

- Cablear los transports de edit por modelo (Omni ya dual-transport; Fal/Vertex reference-based reusan su transport).
- Verificar en vivo un chain generate→edit por cada paradigma a través del seam; registrar evidencia.

## Out of Scope

- La UI de "refinar candidato" (será una task `ui-ux` consumer separada).
- La provenance/rights completa del candidato editado (TASK-1467).
- Nuevos modelos no editables; audio edit (si aplica) va en su propio carril.
- Deploy del runtime durable (frontera gobernada de deployable, EPIC-027/028).

## Detailed Spec

Referencia de implementación (patrón a generalizar), repo `efeonce-globe`:
`VertexOmniAdapter` dual-transport + `previousInteractionId` + `providerRunRef`; el runner hilvana ambos por `toProviderRequest`/manifest. El paradigma reference-based reusa track B: el output previo (por hash) se resuelve a bytes y se re-inyecta como `authorizedInput` del edit — sin bytes por la API. La regla cross-surface (stateful mismo-surface) es load-bearing.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (semántica + lineage) → Slice 2 (router + adapters) → Slice 3 (wiring + verificación).
- Ningún adapter reference-based se cablea (Slice 2) antes de que la semántica canónica (Slice 1) exista, para no fragmentar el contrato.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Chain stateful cross-surface (id no editable en otra superficie) | provider adapter | medium | fail-closed + regla contractual "mismo-surface"; test | `provider_failed`/`edit_unavailable` en el manifest |
| Edit reference-based re-inyecta bytes por la API | private-ingest | low | track B (sólo hash cruza; bytes server-side) | lint no-bytes-in-api / review |
| Editar candidato de otro workspace | tenant isolation | low | validar workspace del padre | audit + reader scope |
| Spend fence no cobra el edit | spend fence | low | edit = experimento nuevo (reserva/settle) | day-cap / fence signal |

### Feature flags / cutover

- Reusa `GLOBE_LAB_ENABLED` (kill switch) + `GLOBE_LAB_PROVIDER`/`GLOBE_LAB_VIDEO_ANCHOR`. Sin flag nuevo salvo que el edit stateful editable exija forzar la superficie Gemini (evaluar un `GLOBE_LAB_OMNI_EDITABLE`). Default OFF hasta canary humano.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (campos opcionales aditivos) | <10 min | sí |
| Slice 2 | revert PR / desactivar el router de edit por modelo | <10 min | sí |
| Slice 3 | env/flag OFF + revert wiring | <10 min | sí |

### Production verification sequence

1. `pnpm check` + `pnpm build` verdes en `efeonce-globe`.
2. Canary stateful (Omni) generate→edit por el seam en staging con hard-cap bajo → manifest + lineage OK.
3. Canary reference-based (Seedream edit / Seedance i2v) generate→edit por el seam → manifest + lineage OK.
4. Revertir a `fake`/OFF tras el smoke.

### Out-of-band coordination required

- Billing del Gemini API (Postpay) para el edit stateful de Omni (ya provisionado `globe-gemini-api-key`); confirmar saldo. Resto: `N/A — repo-only`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una semántica de edit canónica transport-neutral (source of truth = contracts) que un consumer invoca igual para cualquier modelo editable.
- [ ] El router de edit despacha correctamente a stateful (Omni) y reference-based (Seedream/Seedance/Nano Banana) según el modelo.
- [ ] El candidato editado encadena su lineage al padre en el manifest.
- [ ] Un edit stateful cross-surface falla closed (regla contractual verificada por test).
- [ ] El edit reference-based sólo cruza hash por la API (bytes resueltos server-side vía track B).
- [ ] Spend fence cobra el edit como experimento nuevo; kill switch lo gobierna.
- [ ] Evidencia en vivo: un chain generate→edit por cada paradigma a través del seam, con manifest + lineage.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Canary en vivo generate→edit (stateful + reference-based) por el seam, gated por `GLOBE_LAB_ENABLED`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` (Globe) actualizado con el patrón + evidencia
- [ ] `changelog.md` (Globe) actualizado
- [ ] chequeo de impacto cruzado (TASK-1460/1461/1467)
- [ ] skills actualizadas (greenhouse-globe + motion/audio) con el patrón de edit generalizado

## Follow-ups

- UI "refinar candidato" (task `ui-ux` consumer).
- Provenance del candidato editado (TASK-1467).

## Open Questions

- ¿La superficie stateful (Omni) debe ser el default cuando el operador quiere editabilidad, aún perdiendo el keyless-generate? (trade-off costo/keyless vs. editabilidad).
- ¿`globe.lab.experiment.edit` command dedicado vs. flag `previousInteractionId`/`editFrom` en `prepare`?
