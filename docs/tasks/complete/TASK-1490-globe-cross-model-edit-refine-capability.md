# TASK-1490 — Globe Cross-Model Edit/Refine Capability

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Status real: `Implementado y verificado en vivo por el seam; rollout del servicio desplegado pendiente`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `none`
- Branch: `task/TASK-1490-globe-cross-model-edit-refine-capability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Generalizar el edit/refine "sobre lo generado" a TODOS los modelos que aceptan edición, con una semántica de edit gobernada que rutee a los DOS paradigmas nativos de edición (stateful por sesión vs. reference-based) según el modelo, hilvanando el candidato previo en el nuevo experimento por el mismo seam del Model Lab. La implementación de referencia (Gemini Omni, edit stateful) ya quedó hecha; esta task extiende el patrón a Seedream/GPT-Image/Nano-Banana (imagen) y Kling/Seedance (video/extend). Incluye además **múltiples referencias y referencias combinadas cross-modales** (p.ej. imagen + video juntas): el seam ya las transporta (`resolvedInputs` es un array de `ResolvedInputV1` con `mediaType`), pero varios adapters (Omni, Veo, rutas Fal de key único) sólo consumen la **primera** referencia y ninguno arma sets cross-modales todavía.

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
- `docs/tasks/complete/TASK-1490-...` (esta task)

## Current Repo State

### Already exists

- **Seam de edit + reference impl (Omni)**: `providerRunRef` en el manifest, `previousInteractionId` en el payload, `VertexOmniAdapter` dual-transport (generate keyless Vertex + edit Gemini-key), y la regla cross-surface. Verificado en vivo (create `store:true` → edit → 200 completed).
- **Track B resuelve hash→bytes DE ENTRADA**: `InputResolverPort` + `resolvedInputs` traen a bytes un input declarado (fixture simbólico o bucket content-addressed).
- Slugs de edit por modelo en el catálogo Fal (Seedream edit, Seedance i2v).

### Recalibración de baseline 2026-07-20 (pre-ejecución)

La afirmación original de esta sección — *"reference-based ya soportado a nivel de input: track B
permite re-inyectar un output previo como referencia; falta sólo la semántica"* — **es falsa contra
el runtime**. Falta la mitad de escritura del loop:

- Los **bytes de output del proveedor nunca se persisten**. Los adapters los hashean y los descartan
  (viven en un `Map` en memoria hasta el `poll`); `ProviderAttemptResult` sólo transporta
  `outputHashes` y `LabRunner.run` sólo copia ese array al manifest.
- El `InputResolverPort` resuelve desde el registry de fixtures (hashes simbólicos, rights
  `test-fixture`) o desde el bucket content-addressed — y **nadie escribió nunca un output ahí**.
- El comentario `"Output bytes are ingested privately by the runner"` en `provider-contract`
  describe una **intención**, no el runtime.

Consecuencia: un edit reference-based falla hoy con `InputResolutionError('not_found')`. El
paradigma completo (Slices 2-3) y sus Acceptance Criteria son inalcanzables sin cerrar esto, así
que la task incorpora **Slice 0 — ingest de outputs** como prerrequisito duro. El bucket privado ya
está provisionado por TASK-1464 (`efeonce-globe-lab-evidence`) y hoy está sin uso.

Segundo hallazgo (regresión silenciosa de superficie): `apps/studio-web/src/app.ts` hardcodea
`store: true` en el `VertexOmniAdapter`, de modo que **todo** generate de Omni sale hoy por la
superficie Gemini con API key, perdiendo el keyless. Pasa a flag explícito (Slice 3).

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

### Slice 0 — Ingest de outputs (prerrequisito duro del paradigma reference-based)

- `ProviderAttemptResult` transporta los bytes de output como valor **server-internal**
  (mismo estatuto que `resolvedInputs` en el request: nunca cruza el wire, nunca se loggea).
  Los adapters ya los tienen en mano cuando hashean; hoy los descartan.
- `OutputIngestPort` en el `LabRunner` — espejo exacto de `InputResolverPort`, en el mismo y único
  punto de invocación de proveedor — persiste cada output **content-addressed por su sha256** en el
  store privado de media del Lab, con la misma convención de nombre que `GcsInputResolver` lee.
- El manifest declara si los outputs quedaron retenidos, para que un `prepare` con `editFrom` sobre
  un padre no editable falle rápido y honesto en vez de quemar un `execute`.
- Sin store configurado el ingest es no-op y un edit reference-based falla closed en resolución
  (degradación honesta, nunca un output silenciosamente irrecuperable).

### Slice 1 — Semántica de edit canónica + lineage padre→editado

- Definir (en `packages/contracts`) la forma canónica de "editar candidato X": unificar `previousInteractionId` (stateful) y `editFromOutputHash`/`editFromAttempt` (reference-based) bajo una semántica clara, transport-neutral.
- El manifest del experimento editado registra el lineage al padre (encadena `lineage`).

### Slice 2 — Router de edit en el dominio + adapters reference-based

- El dominio/adaptador decide el paradigma según el modelo: stateful (ya en Omni) vs reference-based.
- Implementar el paradigma reference-based en `FalCreativeAdapter` (Seedream edit, Seedance i2v/extend) y `VertexCreativeAdapter` (Nano Banana edit) tomando el output previo (resuelto por track B) como `authorizedInput`.

### Slice 3 — Wiring studio-web + verificación en vivo

- Cablear los transports de edit por modelo (Omni ya dual-transport; Fal/Vertex reference-based reusan su transport).
- Verificar en vivo un chain generate→edit por cada paradigma a través del seam; registrar evidencia.

### Slice 4 — Múltiples referencias + referencias combinadas cross-modales

- Hacer que cada adapter consuma TODAS las `resolvedInputs` cuando el modelo lo soporta (hoy Omni/Veo/rutas Fal de key único usan sólo `resolvedInputs[0]`; Vertex-imagen y Seedream-edit ya usan todas).
- Soportar referencias combinadas cross-modales donde el modelo lo permite (p.ej. Omni `reference_to_video` con imagen + video juntos; el `input` Content[] admite entradas `image` y `video`).
- Contrato: `resolvedInputs` ya es un array de `ResolvedInputV1` con `mediaType`; cada adapter mapea el set (con roles/precedencia si aplica, como el patrón STRUCTURE/IDENTITY/ANTI-REFERENCE de las skills de imagen) a su formato nativo, y falla closed si excede el máximo de refs del modelo.

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

- Slice 0 (ingest de outputs) → Slice 1 (semántica + lineage) → Slice 2 (router + adapters) → Slice 3 (wiring + verificación) → Slice 4 (multi-referencia).
- Ningún adapter reference-based se cablea (Slice 2) antes de que la semántica canónica (Slice 1) exista, para no fragmentar el contrato.
- Slice 0 va primero y es duro: sin bytes de output persistidos, el paradigma reference-based compila y falla en runtime.

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
| Slice 0 | revert PR (campos opcionales aditivos + port inyectado); el store queda con objetos huérfanos, inertes | <10 min | sí |
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

- [x] Los bytes de output de un candidato quedan retenidos content-addressed en el store privado, de modo que su hash resuelve a bytes por track B (sin esto el reference-based no existe).
- [x] Existe una semántica de edit canónica transport-neutral (source of truth = contracts) que un consumer invoca igual para cualquier modelo editable.
- [x] El router de edit despacha correctamente a stateful (Omni) y reference-based (Seedream/Seedance/Nano Banana) según el modelo.
- [x] El candidato editado encadena su lineage al padre en el manifest.
- [x] Un edit stateful cross-surface falla closed (regla contractual verificada por test).
- [x] El edit reference-based sólo cruza hash por la API (bytes resueltos server-side vía track B).
- [x] Spend fence cobra el edit como experimento nuevo; kill switch lo gobierna.
- [x] Cada adapter consume TODAS las `resolvedInputs` (no sólo la primera) cuando el modelo lo soporta; refs combinadas cross-modales (imagen+video) funcionan donde el modelo lo permite (p.ej. Omni `reference_to_video`); falla closed si excede el máximo de refs del modelo.
- [x] Evidencia en vivo: un chain generate→edit por cada paradigma a través del seam, con manifest + lineage; y una generación multi-referencia (≥2 refs, con al menos un caso cross-modal).

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Canary en vivo generate→edit (stateful + reference-based) por el seam, gated por `GLOBE_LAB_ENABLED`.

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` (Globe) actualizado con el patrón + evidencia
- [x] `changelog.md` (Globe) actualizado
- [x] chequeo de impacto cruzado (TASK-1460/1461/1467)
- [x] skills actualizadas (greenhouse-globe + motion/audio) con el patrón de edit generalizado

## Verification evidence (2026-07-20)

Gate en `efeonce-globe`: `pnpm check` (typecheck + `node --test`) y `pnpm build` verdes.

Canary en vivo por el seam completo (`command → registry → runner → adapter`), los cuatro
`candidate_ready` con lineage encadenado padre→hijo:

| Carril | Evidencia |
|---|---|
| Reference-based | Seedream generate → Seedream edit; `editMode=reference`, `outputsRetained=true` |
| **Cross-model** | Seedream generate → **Nano Banana (Vertex)** edit por referencia; `editMode=reference` |
| Stateful | Omni generate (`surface=gemini-api`, `chainable=true`) → edit; `editMode=stateful` |
| Cross-modal | Omni `reference_to_video` con imagen + vídeo en un set; `candidate_ready` |

Dos defectos que **sólo el gasto real reveló**, con la suite unitaria en verde en ambos casos:

1. `providerRunChainable` se calculaba en el adapter y el runner no lo copiaba al manifest. Un
   candidato genuinamente encadenable se veía como no encadenable y **todo edit stateful degradaba
   en silencio** a reference-based. Se detectó porque un run reportó `surface=gemini-api` junto a
   `chainable=false`, dos cosas que no pueden ser ciertas a la vez.
2. Todo fallo del runner colapsaba a `runner_error`, dejando el fallo más común de un edit
   indistinguible de cualquier otro. Propagar la razón (sólo cuando pertenece a nuestro vocabulario
   cerrado) es lo que hizo encontrable el defecto siguiente.

Ambos tienen guarda de regresión. Además Omni ahora separa `provider_incomplete` (aceptado, el
modelo declinó) de `provider_failed` (request rechazado): piden respuestas opuestas, y confundirlos
me mandó a buscar un bug de payload inexistente.

## Rollout status

`code complete + verificado en vivo por el seam; rollout del servicio desplegado PENDIENTE.`

El servicio `globe-studio-internal` sigue con `GLOBE_LAB_PROVIDER=fake` y **sin**
`GLOBE_LAB_INPUT_BUCKET`. Sin ese bucket no hay retención de outputs y todo edit por referencia se
rechaza en `prepare` (degradación honesta, no un fallo raro). Prender el Lab exige, **en el mismo
flip**: `GLOBE_LAB_ENABLED=true` + `GLOBE_LAB_PROVIDER=composite` +
`GLOBE_LAB_INPUT_BUCKET=efeonce-globe-lab-evidence` (+ `GLOBE_LAB_OMNI_EDITABLE` sólo si se quiere
el carril stateful, sabiendo que saca a Omni del keyless). La runtime SA necesita
`storage.objectCreator` sobre ese bucket — el canary corrió con ADC humana.

## Delta 2026-07-20 (fase 2 — rollout + hardening)

Se ejercitó la capability contra el **servicio desplegado** (no sólo por el seam local) y emergieron
cuatro cosas de rollout/seguridad. El estado de rollout vigente es `efeonce-globe/Handoff.md` (la
cabina de mando); lo de abajo es el registro del hallazgo, no una afirmación de estado vivo.

- **Dónde vive el Lab: api mode, no web.** El Model Lab se opera por **api mode**, servido por
  `globe-api-internal` (revisión `globe-api-runtime`). Es el único servicio con un caller autorizado:
  el **service principal** lleva `globe.lab.experiment.run`. En web mode (`globe-studio-internal`) el
  principal humano lleva sólo `globe.studio.access` — el broker sister-platform de Greenhouse **no**
  otorga la capability del Lab a humanos — así que ahí el Lab es inalcanzable (coverage
  `ui: policy-blocked`). El caller real hoy es el bridge de Greenhouse actuando como service principal
  (`greenhouse-globe-caller`); la promoción a surface `ui` es futura.
- **Verificado en vivo contra el binario desplegado.** El chain generate → edit por referencia
  (cross-model) corrió end-to-end contra `globe-api-internal` autenticado como `greenhouse-globe-caller`,
  con la SA del servicio (`api_runtime`) escribiendo evidencia al bucket (`outputsRetained=true`) — no
  sólo por el seam local. La concesión IAM para mintear ese token fue temporal y ya revocada.
- **Hardening de auth en api mode (defense in depth, no parche).** La app devolvía el service principal
  (con gasto real del Lab) **sin verificar el token del caller**, confiando sólo en el IAM de Cloud Run
  (perímetro). Frágil: un servicio con `invokerIamDisabled=True` salta la verificación de invoker por
  completo. Ahora la app **verifica el ID token del caller LOCALMENTE** con
  `google-auth-library.verifyIdToken` contra las claves públicas de Google **cacheadas** (sin
  round-trip por request; un primer intento con el endpoint `tokeninfo` se descartó por ser un SPOF
  externo síncrono en el hot path), con **audience explícito** (`GLOBE_API_EXPECTED_AUDIENCE`,
  multi-valor por los dos formatos de URL run.app) y **allowlist de SAs**
  (`GLOBE_API_CALLER_SERVICE_ACCOUNTS`), ambos **fail-closed**. Símbolos nuevos en
  `apps/studio-web/src/app.ts` (repo Globe): `IdTokenVerifier` (port), `createGoogleIdTokenVerifier`,
  `verifyWorkloadCaller`. Contrato: `GREENHOUSE_CONNECTIVITY_V1.md`.
- **El ID token va en `Authorization`, no `X-Serverless-Authorization`.** Cloud Run **consume**
  `X-Serverless-Authorization` (no lo reenvía al contenedor) y **reenvía** `Authorization`. Como la app
  ahora verifica el token una segunda vez, necesita **leerlo** → debe viajar en `Authorization`. El SDK
  de Globe (`packages/sdk/src/index.ts`, `applyAuthMaterial`) se corrigió de `X-Serverless-Authorization`
  a `Authorization` para el material `kind: 'cloud-run-id-token'`. Con el header viejo el perímetro
  pasaba pero la app rechazaba al caller legítimo con **401**.
  - **Consumidor Greenhouse (`src/lib/globe/client.ts`): delega 100 % en el SDK.** Construye
    `GlobeClient` con `auth: createGoogleAdcIdTokenAuth(...)` (client.ts:89) y **no setea ningún header
    de auth propio** (grep de `X-Serverless-Authorization` en `src/`+`scripts/` = 0). Hereda el header
    correcto por construcción **cuando se re-vendorice el tarball del SDK** — no requiere cambio de
    código en `client.ts`.
  - ⚠️ **Bug latente a nivel de pin de dependencia (no en `client.ts`):** el tarball hoy pineado
    (`vendor/efeonce-globe/efeonce-globe-sdk-0.1.0.tgz`, 19-jul) es **pre-fix** — su `applyAuthMaterial`
    aún rutea `cloud-run-id-token` → `X-Serverless-Authorization`, y `createGoogleAdcIdTokenAuth` emite
    exactamente ese `kind`. El health check (`/v1/health`, público) **no** se ve afectado; el impacto es
    sobre **futuros dispatch calls** a `api-internal`, que darían **401** hasta re-vendorizar el SDK
    desde el repo Globe corregido.
- **`invokerIamDisabled: True` en `globe-studio-internal` (decisión pendiente, no bug).** Anterior a
  esta sesión. Cloud Run no verifica el invoker del studio → alcanzable desde internet aunque su IAM
  esté vacío. Coherente con que el studio es una app web con **SSO** (un browser no presenta ID token;
  la auth es la sesión-cookie). `globe-api-internal` **no** lo tiene (anónimo → 403); la capa de app
  aguanta (anónimo → 401 en commands/capabilities). Pendiente: gobernar el flag en IaC — los servicios
  Cloud Run **no** están en Terraform hoy (los crea el workflow), así que nada previene drift.
  Correlaciona con TASK-1489 (GCP IaC foundation, en `to-do`).
- **IAM corregido (Terraform, aplicado, repo Globe).** `aiplatform.user` estaba en `web_runtime` (SA
  equivocada); movido a `api_runtime` (donde el Lab corre). `api_runtime` ya tenía el bucket
  (`objectAdmin`), lo que cubre el path api-internal del follow-up de `storage.objectCreator` abajo;
  `web_runtime` conserva el bucket (create+read, nunca delete) para la futura promoción `ui`.

## Follow-ups

- UI "refinar candidato" (task `ui-ux` consumer).
- Provenance del candidato editado + retención/lifecycle de los outputs retenidos (TASK-1467).
- Grant `storage.objectCreator` a la runtime SA sobre `efeonce-globe-lab-evidence` (Terraform).

## Open Questions

Ambas resueltas en Discovery (2026-07-20); se dejan con su rationale porque son load-bearing.

- **¿La superficie stateful (Omni) debe ser el default cuando se quiere editabilidad, aún perdiendo
  el keyless-generate?** → **No.** Con el paradigma reference-based implementado, todo modelo
  editable se refina sin sesión stateful; el stateful es una optimización exclusiva de Omni con
  costo de API key + billing propio. Pasa a opt-in explícito (`GLOBE_LAB_OMNI_EDITABLE`, default
  OFF ⇒ generate keyless). Hoy `app.ts` fuerza `store: true` y ya está pagando ese costo sin
  haberlo decidido.
- **¿Command `globe.lab.experiment.edit` dedicado vs. flag en `prepare`?** → **Flag `editFrom` en
  `prepare`.** La autoridad (`globe.lab.experiment.run`), el spend fence, la state machine y el
  manifest son idénticos a los de un generate: un command dedicado duplicaría todo el guardrail sin
  agregar semántica de autoridad, y sería el anti-patrón "handler remoto". Además el caller sigue
  declarando `capability`/`referenceRoute`/`hardCapCredits` explícitamente: eso es exactamente lo
  que habilita el edit **cross-model** (heredarlos del padre lo impediría).
