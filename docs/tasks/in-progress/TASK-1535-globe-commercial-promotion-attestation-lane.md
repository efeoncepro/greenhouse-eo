# TASK-1535 — Globe commercial promotion via rights attestation + automated lane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (builds on ADR-009/TASK-1527 saga, live)
- Branch: `task/TASK-1535-globe-commercial-promotion-attestation-lane`
- Legacy ID: `none`

## Summary

Implementa ADR-010 en el repo hermano `efeonce-globe`: separa la firma de readiness en las dos decisiones que
realmente exigen juicio humano (la licencia del modelo, una vez por modelo, con evidencia; y el artefacto que se
entrega al cliente, ya existente) y automatiza lo que era puro toil (promover una ruta × workspace). Habilita
promoción **comercial** de modelos de frontera sin firmar por ruta, **sin fabricar derechos** que la licencia del
proveedor no concede.

## Why This Task Exists

Globe es ahora un producto comercial y el equipo necesita usar amplitud de modelos de frontera (las 7 rutas
pendientes + Imagen/Nano Banana por Vertex, OpenAI GPT Image, modelos Fal con licencia comercial), incluyendo
entrega a clientes. El camino gobernado actual (TASK-1527) pide una revisión humana `requireHuman` por **cada ruta
× workspace** — O(rutas × workspaces) — así que el CEO termina firmando 10+ veces. La firma está en la unidad
equivocada: lo único que exige juicio humano acumulable es la **interpretación de la licencia por modelo**
(O(modelos), en la práctica O(proveedores)). Una vez atestiguado ese hecho con evidencia durable, promover
cualquier ruta de ese modelo a cualquier workspace es aplicación mecánica. El límite duro es que Globe no puede
conceder a un cliente un derecho comercial que la licencia del proveedor no concede — eso es IP, no conservadurismo.

## Goal

- Una autoridad **Model Commercial Rights Attestation** (`requireHuman`, una vez por modelo, anclada a
  `providerTermsRef` + `providerTermsDigest` + reviewer + el grant exacto que concede la licencia).
- Un **lane de promoción automatizado** (principal de servicio distinto del attestor/promoter/checker) que, dada una
  attestation válida + un eval objetivo que pasa, promueve la ruta derivando la postura de derechos **de** la
  attestation (nunca la fabrica) y corre la saga ADR-009 — cero firma por ruta.
- Una **política de promoción por workspace** (techo de postura, fail-closed por `kind`) en
  `tenancy_workspaces.projection`: una ruta internal-eval-only **nunca** llega a un workspace `client`.
- La flota objetivo promovida por el lane (internal primero, comercial después de que el CEO firme las ~O(proveedores)
  attestations), con evidencia real de términos y golden briefs por ruta.

## Progress & Findings — 2026-07-24 (durable handoff; leer antes de continuar)

**Estado:** Slices 1–4 shipped + desplegados + probados en vivo (api rev `00074-fwv`, web `00067-9n8`).
Slice 5 (fleet) y el **canary facturable** parcialmente hechos; Slice 6 (docs) cerrado. La task sigue
`in-progress` por el canary facturable y la familia frontier completa.

### Hecho y pusheado (repo `efeonce-globe` main)

- Autoridad de atestación por modelo + lane automatizada + techo por workspace: **live**, con canary de
  lane verificado y **2 atestaciones comerciales firmadas por el CEO** (Vertex + Seed Audio).
- **Golden briefs Slice 5** (commit `f62c2e4`): 6 rutas reference-conditioned + 3 rúbricas
  (`preserve-set-v1`, `voice-transform-v1`, `voice-translation-v1`) + 2 contratos de fidelidad aditivos
  (`voice-transform`, `voice-translation`) en `packages/contracts/src/index.ts`. Test del **segundo
  consumidor** corre las 6 end-to-end (`packages/domain/src/evaluation.test.ts`). domain 337/0 + build.
- **Defaults frontier corregidos** (los IDs viejos estaban cableados):
  - OpenAI `gpt-image-1` → **`gpt-image-2`** (snapshot `2026-04-21`), commit `acb0776`
    (`apps/creative-runner/src/openai-adapter.ts:100`). Pricing marcado `PROVISIONAL` (era de gpt-image-1).
  - Vertex Nano Banana `gemini-2.5-flash-image` → **`gemini-3-pro-image`** (Nano Banana Pro), commit `46ab5ab`
    (`apps/creative-runner/src/vertex-adapter.ts:103`, image-generate + image-edit).
  - Evidencia de atestación cubre ambas familias (commit `a6dd117`, `scripts/evidence/{openai-gpt-image,vertex-generative}-commercial-terms.json`).
- **Docs Slice 6** (repo `greenhouse-eo`, commit `dcf2c0293`): doc funcional
  `docs/documentation/creative-studio/efeonce-globe-promocion-comercial-atestacion.md` + manual
  `docs/manual-de-uso/creative-studio/operar-promocion-comercial-atestacion-globe.md`, ambos indexados.

### Mapa de modelos frontier objetivo (decisión del operador/CEO, 2026-07-24)

Familia frontier completa por proveedor, **2 modelos selectables cada una**; excluir viejos + Lite:

| Familia | Miembro | Model ID | Estado |
|---|---|---|---|
| OpenAI | GPT Image 2 (top) | `gpt-image-2` | ✅ default |
| OpenAI | GPT Image 1.5 | `gpt-image-1.5` | ⏳ 2.º selectable (código) |
| Nano Banana | Pro (top) | `gemini-3-pro-image` | ✅ default |
| Nano Banana | 2 / Flash | `gemini-3.1-flash-image` | ⏳ 2.º selectable (código) |

**Excluidos a propósito:** `gpt-image-1`, `gemini-2.5-flash-image`, `gemini-3.1-flash-lite-image` (NB2 **Lite**).

### Hallazgo de arquitectura load-bearing (corrige un supuesto previo)

Exponer el **2.º modelo selectable por proveedor NO es data — es un slice de CÓDIGO.** Mapeo verificado:
- Los adapters resuelven el modelo **por `capability`**, no por ruta: `OPENAI_ROUTING[capability]`
  (`openai-adapter.ts:100`) y `VERTEX_ROUTING[capability]` (`vertex-adapter.ts:103`). El compiler ancla
  todo a `estimate.model` (`apps/creative-runner/src/production-route-compiler.ts:154-171`): un binding a
  `gpt-image-1.5`/`gemini-3.1-flash-image` con el adapter emitiendo el top da
  `route_binding_missing`/`route_identity_mismatch` → **denegado**, no ejecuta en el 2.º modelo.
- **OpenAI no tiene lane de producción:** `apps/studio-web/src/governed-production-composition.ts:71` lanza
  `globe_governed_openai_official_verifier_missing`; el allowlist (`:183-241`) solo tiene Fal + Veo, y
  `allowedRegions=['us-central1']` mientras las rutas image de Vertex usan `region:'global'`.
- **Slice de código necesario** (diseñar con `arch-architect`): (a) resolución de modelo **por-ruta** en
  los adapters; (b) `routeId`s nuevos en `packages/domain/src/producer-catalog.ts` (sin slug — drift guard
  lo rompe); (c) entradas de endpoint allowlist por modelo + región `global`; (d) binding vía
  `globe.production-routing.route.append` (cap `globe.production-routing.manage`); (e) promoción con
  evidencia de eval real (ADR-009 review→propose→promote, o el lane ADR-010).

### Canary facturable (acceptance criterion abierto) + gates

- **gpt-image-2**: canary-able por el path del **Lab** (gasto real, llave `globe-openai-api-key`). Requiere
  flip `GLOBE_LAB_ENABLED=true` + `GLOBE_LAB_PROVIDER=openai` en **api-internal Y el Job creative-runner**
  (SoT Terraform `infra/terraform/`; update en vivo + declarar o se pierde al deploy). Driver: break-glass
  token con `--include-email` (como el canary de la lane).
- **gemini-3-pro-image / gemini-3.1-flash-image**: **PREVIEW + allowlist de Vertex.** El acceso del proyecto
  Globe **solo se confirma corriéndolo por el runtime de Globe** (WIF SA) — probe desde creds de usuario da
  404 en todo (hasta el 2.5 vigente), señal inútil. Si da `model_unavailable`, es gap de allowlist (se pide
  a Google), no fixeable desde el repo.
- **Atestación por modelo:** cada uno de los 4 necesita su firma humana (ADR-010, `requireHuman`) antes de
  comercializarse. Evidencia lista en `scripts/evidence/`. El CEO firma en la UI (Command-K → atestar).
- **Pricing:** los créditos del adapter OpenAI están `PROVISIONAL` (calibrados a gpt-image-1) — reverificar
  contra el pricing real de gpt-image-2 (más caro) en el canary.

### Regla dura grabada

Cambiar scopes del broker OAuth Greenhouse↔Globe es rollout de **3 pasos** (broker permite → cliente pide →
broker exige) o se cae el login de todos (pasó en vivo el 2026-07-24, revertido).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` (ADR-010 — esta task)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md` (ADR-009 — saga reusada)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md` (SPEC-003 — el gate de eval objetivo)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md` (ADR-007 — rights posture)

Reglas obligatorias (de ADR-010 §Hard rules, verbatim en la spec):

- La attestation es el SSOT; toda postura de derechos es una **derivación** de ella, nunca una decisión independiente.
- El lane NUNCA firma `recordModelReadinessReview`/`proposeModelRoute` reviewer-side; consume una attestation firmada.
- Fail-closed: una ruta sin attestation válida que conceda `client-delivery` NUNCA se promueve a un workspace `client`
  (refusal indistinguible de "route unknown").
- Promotion ≠ delivery: cada artefacto client-bound sigue pasando candidate → aprobación humana.
- Append-only: una attestation es inmutable por `(modelId, termsDigest)`; un cambio de licencia es una attestation
  nueva, nunca un edit.

## Normative Docs

- `.claude/skills/greenhouse-globe/SKILL.md` (contrato de arquitectura del repo hermano — recargar antes de tocar código)
- Runtime vivo: `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Dependencies & Impact

### Depends on

- La saga ADR-009 + persistencia durable (live): `packages/domain/src/production-promotion-operation.ts`,
  migración `0027_production_promotion_operations.sql`.
- Rights policies workspace-scoped: `packages/domain/src/generated-rights-policies.ts`, migración
  `0026_workspace_generated_rights_policies.sql`.
- Persisted tenancy projection: migración `0013_persisted_tenancy_projection.sql` (`tenancy_workspaces.projection`).
- Evaluation Harness objective checks: `packages/domain/src/evaluation.ts` (SPEC-003).

### Blocks / Impacts

- Desbloquea la promoción comercial de la flota (7 rutas pendientes + nuevos modelos) sin firma por ruta.
- Interactúa con TASK-1480 (rollout comercial externo) — esta task provee el mecanismo de derechos que TASK-1480 necesita.

### Files owned (repo `efeonce-globe`)

- `packages/contracts/src/model-commercial-rights.ts` (nuevo)
- `packages/domain/src/model-commercial-rights.ts` (nuevo)
- `packages/contracts/src/capabilities.ts` (append capabilities)
- `packages/database/src/stores/model-commercial-rights-store.ts` (nuevo) + `migrations/0030_model_commercial_rights_attestations.sql` (nuevo)
- `packages/domain/src/production-promotion-operation.ts` (gate de citación de attestation en el lane)
- `apps/studio-web/src/app.ts` (grant de la capability humana; principal del lane; per-workspace ceiling resolver)
- `scripts/evidence/*-terms.json` (nuevos: Vertex, OpenAI, Fal comerciales)
- `packages/domain/src/evaluation.ts` (golden briefs de las rutas pendientes)

### Files owned (repo `greenhouse-eo`)

- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` (ADR-010, creado)
- `docs/architecture/creative-studio/DECISIONS_INDEX.md` (ADR-010 indexado)
- doc funcional + manual de creative-studio; `Handoff.md`; skill `greenhouse-globe`

## Current Repo State

### Already exists

- Saga de promoción durable + workload classes disjuntas (routing/promoter/checker) con anti-overlap
  (`app.ts:3243-3279`) y maker≠reviewer≠promoter (`production-promotion-operation.ts:464-466`).
- Rights posture como `providerTermsRef` + `providerTermsDigest` + `effectiveRestrictions[]` free-form
  (`asset-governance.ts:72-91`) — el ancla de evidencia que la attestation reusa.
- `requireHuman` en `recordModelReadinessReview`/`proposeModelRoute` (`model-readiness.ts:139,:85,:98`); promote ya
  service-runnable.
- `tenancy_workspaces.projection` jsonb per-workspace (migración 0013).

### Gap

- No existe autoridad de attestation de licencia por modelo (hoy la licencia se re-juzga implícitamente por ruta).
- No existe lane automatizado que derive la postura de derechos de una attestation.
- No existe política/techo de promoción por workspace (`grep WorkspacePolicy|ceremony` → nada).
- Solo 4 rutas tienen golden briefs; las 6 restantes + los nuevos modelos no.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: repo hermano `efeonce-globe` — `packages/{contracts,domain,database}` + `apps/studio-web`; el
  control plane documental/lifecycle vive en `greenhouse-eo` (EPIC-028/TASK-1492).
- Future candidate home: `remain-shared` (dentro de la estructura de packages ya modular de Globe; no crea repos/apps nuevos).
- Boundary: nuevas capabilities `globe.model-rights.attest`/`.read` + el principal del lane; el contrato gobernado
  vía CapabilityRegistry (spine). Consumers autorizados: el reviewer humano (attest), el lane de servicio (read +
  saga). NUNCA un SDK/tabla ad-hoc.
- Server/browser split: 100% server-side. Stores/DB/secrets/attestation nunca cruzan al browser; el attest es una
  sesión humana autenticada, el lane es un principal de servicio api-mode.
- Build impact: `none` (sin dep pesada nueva; reusa el toolchain `node --test` de Globe).
- Extraction blocker: la attestation + la saga comparten `globe-pg` (transacción/tenancy) — no es deployable
  independiente del resto de Globe; correcto, es parte del mismo runtime.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (autoridad de autorización + semántica de IP comercial)
- Impacto principal: `command` (+ `db`, `migration`, `reader`)
- Source of truth afectado: nueva tabla `model_commercial_rights_attestations` (SSOT de qué concede cada licencia);
  `tenancy_workspaces.projection` (techo por workspace)
- Consumidores afectados: `worker` (lane de servicio), `http`/`sdk` (attest humano + readers), `e2e`
- Runtime target: `worker` + `production` (Globe Cloud Run + Cloud SQL `globe-pg`)

### Contract surface

- Contrato existente a respetar: la saga ADR-009 (child commands + exact readback + idempotencia determinista); el
  contrato de evidencia de rights (`providerTermsRef` scrubbed + `providerTermsDigest` sha256).
- Contrato nuevo: capability `globe.model-rights.attest` (command, `requireHuman`) + `globe.model-rights.read`
  (reader); derivación `attestation → effectiveRestrictions[]`; per-workspace ceiling reader; capability del lane
  (slice 1 decide si es clase nueva `production-promotion-auto-lane` o gate de citación sobre promoter/checker).
- Backward compatibility: `gated` (todo detrás de flag default OFF; no cambia el path manual existente).
- Full API parity: attest/read/promote son commands/readers gobernados en el spine — Nexa/MCP/CLI los operan por
  construcción; cero lógica en UI.

### Data model and invariants

- Entidades/tablas afectadas: `model_commercial_rights_attestations` (nueva, append-only); consumo de
  `generated_rights_policies` y `tenancy_workspaces`.
- Invariantes que no se pueden romper:
  - Inmutable por `(modelId, termsDigest)`; supersede, nunca overwrite (CHECK + índice único).
  - La postura derivada nunca excede el grant atestiguado (derivación pura de la attestation).
  - Un workspace `client` solo acepta rutas cuya attestation concede `client-delivery` (techo fail-closed por `kind`).
  - El attestor principalId ≠ el lane principalId (maker≠reviewer≠promoter se mantiene).
- Tenant/space boundary: `workspaceId` derivado de `TrustedCommandContextV1`, nunca del payload (igual que rights policies).
- Idempotency/concurrency: attest idempotente por `(modelId, termsDigest)` vía `ON CONFLICT DO NOTHING` + relectura;
  el lane reusa la idempotencia determinista de la saga.
- Audit/outbox/history: append-only en la tabla + audit_log durable; la attestation firmada server-side (como la review).

### Migration, backfill and rollout

- Migration posture: `additive` (nueva tabla + índice único + CHECK; +1 campo jsonb en el projection ceiling, sin ALTER destructivo).
- Default state: `flag OFF` — nueva capability sin grant + lane detrás de `GLOBE_AUTO_PROMOTION_LANE_ENABLED` default OFF.
- Backfill plan: ninguno destructivo; las attestations se crean firmadas por el humano (no se backfillean).
- Rollback path: flag a OFF (lane inerte) + revert PR; la tabla es append-only e inerte sin grant.
- External coordination: el CEO/reviewer humano firma las attestations por proveedor (Vertex/OpenAI/Fal comerciales)
  con la evidencia de términos que esta task ensambla; secretos de provider ya existentes (no nuevos).

### Security and access

- Auth/access gate: `capability` (`globe.model-rights.attest` humano; el lane por su service principal + citación de attestation).
- Sensitive data posture: `no PII`; los términos son públicos (URL + digest); NUNCA loggear el body crudo de términos.
- Error contract: códigos canónicos del spine (`policy_blocked`/`access_denied`/`not_found`/`invalid_request`); el
  refusal de scope de workspace colapsa a `not_found` (oráculo-safe).
- Abuse/rate-limit posture: el lane es interno/service; la saga ya tiene fence + kill switch; el attest es humano acotado.

### Runtime evidence

- Local checks: `pnpm check && pnpm build` en `efeonce-globe`; tests nuevos registrados en el script `test` del package.
- DB/runtime checks: migración `0030` aplicada + readback contra `globe-pg`; attestation inmutable verificada (segundo
  intento mismo digest = idempotente; digest distinto = nueva fila).
- Integration checks: un canary facturable por clase de ruta a través del lane (attestation → eval → promote →
  activate → canary); verificación de que una ruta internal-eval NO se promueve a workspace `client` (negativo duro).
- Reliability signals/logs: signal de attestation faltante/expirada; el lane emite evidencia de derivación (postura
  aplicada = postura atestiguada).
- Production verification sequence: ver §Rollout.

### Acceptance criteria additions

- [ ] Source of truth (`model_commercial_rights_attestations`), contract surface (attest/read/lane) y consumers nombrados con paths reales.
- [ ] Invariantes, tenant boundary e idempotencia explícitos (inmutabilidad por digest, derivación pura, techo por workspace).
- [ ] Migration/backfill/rollback posture explícito (additive + flag OFF + append-only).
- [ ] Evidencia runtime listada (canary facturable + negativo de scope de workspace).
- [ ] Errores canónicos, audit/signal posture y cero leak de términos crudos.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive (`packages/domain`), no en UI.
- [ ] Modelada como command/reader gobernado, no como click-handler.
- [ ] Read (`globe.model-rights.read`) + write (`globe.model-rights.attest`) con command semantics, authorization
      fina (capability), idempotencia, audit, errores canónicos, observabilidad.
- [ ] Capability + grant en el mismo PR (attest → reviewer humano; lane → su service principal).
- [ ] Camino programático: HTTP/SDK/CLI del spine (Nexa/MCP por construcción).
- [ ] Write apto para `propose → confirm → execute` — el attest es la confirmación humana; el lane no muta sin ella.
- [ ] Un primitive, muchos consumers: cero lógica duplicada.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Attestation authority (contract + domain + store + migration)

- `packages/contracts/src/model-commercial-rights.ts`: tipos versionados (attestation record con `modelId`,
  `providerTermsRef`, `providerTermsDigest`, `grant: { commercialUse, clientDelivery, sublicensable }`, reviewer),
  capabilities `globe.model-rights.attest`/`.read` en `GLOBE_CAPABILITIES`.
- `packages/domain/src/model-commercial-rights.ts`: command `attestModelCommercialRights` (`requireHuman`, firma
  server-side, inmutable por `(modelId, termsDigest)`) + reader `.read`.
- Store durable + `migrations/0030_model_commercial_rights_attestations.sql` (append-only, índice único, CHECK, RLS
  por workspace donde aplique, marker `-- Up Migration` + DO block anti pre-up-marker).
- Grant de la capability humana al reviewer interno; denegar service principals (el `requireHuman` lo garantiza).
- Decidir aquí (open question de ADR-010): lane = clase de workload nueva vs gate de citación sobre promoter/checker.

### Slice 2 — Rights derivation from attestation

- Función pura `deriveRestrictionsFromAttestation(attestation, workspaceCeiling)` → `effectiveRestrictions[]`
  (commercial+client-delivery → sin restricción de entrega; internal-eval → `internal-evaluation-only` +
  `no-client-delivery`), workspace-ceiling-aware.
- Wire a la publicación gobernada de rights (el lane publica derivado, NUNCA vía break-glass `asset-rights-policy.manage`).

### Slice 3 — Per-workspace promotion ceiling

- Shape de política en `tenancy_workspaces.projection` (techo de postura), fail-closed por `kind` (`client` exige
  `client-delivery`; unknown → más restrictivo).
- Reader del techo + el scope check del lane (refusal → `not_found`).

### Slice 4 — Automated lane principal

- El principal de servicio (según decisión de slice 1), gateado en (attestation válida + eval objetivo que pasa +
  dentro del techo del workspace), corriendo las fases de la saga ADR-009 con idempotencia determinista y exact readback.
- Flag `GLOBE_AUTO_PROMOTION_LANE_ENABLED` default OFF; la saga sigue con su propio kill switch.

### Slice 5 — Fleet enablement

- Ensamblar evidencia real de términos: `scripts/evidence/{vertex,openai,fal-*}-terms.json` (URL fuente + digest).
- Golden briefs para las 6 rutas pendientes + nuevos modelos (Imagen/Nano Banana/GPT Image/Fal comerciales), verificando
  existencia de slugs con los probes de gasto cero antes de cablear.
- Correr el lane end-to-end: internal-only primero; comercial después de que el CEO firme las attestations por proveedor.

### Slice 6 — Docs closure

- ADR-010 + SPEC-011 indexados; skill `greenhouse-globe` (8vo worked example); doc funcional + manual; `Handoff.md`;
  `GLOBE_RUNTIME_HANDOFF.md` (flags, attestations, rutas promovidas, canarios).

## Out of Scope

- NO relaja `recordModelReadinessReview` (sigue `requireHuman`) — es una autoridad nueva, no un aflojamiento.
- NO fabrica derechos: modelos con licencia internal-eval-only (p.ej. el "Seed Audio" unlisted) quedan internal-only.
- NO reescribe la saga ADR-009 ni sus workload classes; las reusa.
- NO toca el spend fence, el catálogo Producer, el asset-governance worker ni el front door.
- NO construye UI (parity by birth; UI del lane sería otra task).
- NO cambia `GLOBE_CONTROL_PLANE_BREAK_GLASS` semantics.

## Detailed Spec

Ver `EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` (ADR-010) — decisión, alternativas rechazadas,
4-pillar scoring, hard rules, open questions y roadmap por slices (esta task ES ese roadmap). No duplicar aquí.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (attestation authority) → Slice 2 (derivation) → Slice 3 (workspace ceiling) → Slice 4 (lane).
- Slice 4 (lane) NO puede shippear antes que Slices 1-3: sin attestation + derivación + techo, el lane no tiene de
  dónde derivar la postura ni contra qué fail-closear. Ejecutar Slice 4 antes rompe la garantía de no-fabricación.
- Slice 5 (fleet) corre después de Slice 4 y solo con el flag ON en internal primero.
- Slice 6 (docs) cierra al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El lane deriva una postura más permisiva que la licencia (fabrica derechos) | identity/legal/IP | low | Derivación pura de la attestation (SSOT); CHECK de inmutabilidad; test de que postura aplicada = postura atestiguada | signal: postura aplicada ≠ atestiguada |
| Ruta internal-eval promovida a workspace `client` | commercial/IP | low | Techo fail-closed por `kind`; negativo duro en el canary; refusal → `not_found` | signal: promoción bloqueada por techo |
| El lane firma la review humana (colapsa SoD) | security | low | El lane nunca llama review/propose reviewer-side; `requireHuman` lo rechaza; attestor≠lane principalId | maker≠reviewer≠promoter check (existente) |
| Promoción parcial por fallo de proceso | platform | medium | Reusa la saga ADR-009 (exact readback + recovery service-only) | signals de la saga (unpublished_lag equivalente) |
| Attestation con términos incorrectos (error humano) | legal | medium | Evidencia anclada (URL+digest); inmutable → corrección = nueva attestation; review humano | drift signal sobre `providerTermsRef` (follow-up) |

### Feature flags / cutover

- `GLOBE_AUTO_PROMOTION_LANE_ENABLED` (env, default OFF): controla si el lane de servicio puede correr. OFF ⇒ el lane
  es inerte; el path manual ADR-009 sigue igual. Flip a ON post-canary internal. Revert: env a OFF + (Terraform apply
  / gcloud documentado por incidente). Multi-runtime: el lane vive en el api service / worker de Globe, no en Vercel.
- La capability `globe.model-rights.attest` sin grant ⇒ nadie puede atestiguar; grant al reviewer interno la habilita.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Migración 0030 es additive + append-only; capability sin grant es inerte. Revert PR. | <10 min | sí |
| Slice 2 | Función pura sin efecto sin el lane; revert PR. | <10 min | sí |
| Slice 3 | Campo de techo en projection additive; sin lane no tiene efecto. Revert PR. | <10 min | sí |
| Slice 4 | Flag `GLOBE_AUTO_PROMOTION_LANE_ENABLED` a OFF. | <5 min | sí |
| Slice 5 | Una ruta promovida se despromueve por la saga (pause/retire) — NO se borra data. Attestations son append-only. | por ruta | parcial |
| Slice 6 | Docs — revert PR. | <5 min | sí |

### Production verification sequence

1. `pnpm check && pnpm build` en `efeonce-globe` verdes.
2. Aplicar migración 0030 en `globe-pg` + readback (tabla + índice único + CHECK existen).
3. Deploy con flag OFF + verificar que el path manual ADR-009 no cambió.
4. Grant de `globe.model-rights.attest` al reviewer; el reviewer firma una attestation de prueba (modelo ya
   internal, p.ej. una ruta ya promovida) + readback inmutable (segundo intento mismo digest = idempotente).
5. Flip flag ON en internal; correr el lane sobre esa attestation (eval → promote → activate → canary facturable) +
   verificar postura aplicada = atestiguada.
6. Negativo duro: intentar promover una ruta internal-eval a un workspace `client` → refusal `not_found`.
7. Solo entonces: el CEO firma las attestations por proveedor comercial (Vertex/OpenAI/Fal) con la evidencia
   ensamblada; correr el lane sobre las rutas comerciales a los workspaces `client` autorizados.
8. Monitorear signals 7d.

### Out-of-band coordination required

- Firma humana del CEO/reviewer de las attestations por proveedor (con la evidencia de términos que esta task
  ensambla). Es el único paso humano irreducible y es O(proveedores), no O(rutas).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `model_commercial_rights_attestations` (append-only, inmutable por `(modelId, termsDigest)`) + capability
      `globe.model-rights.attest` (`requireHuman`) / `.read`.
- [ ] La postura de derechos que aplica el lane es siempre una derivación de la attestation (test: aplicada = atestiguada).
- [ ] El techo por workspace bloquea fail-closed una ruta internal-eval hacia un workspace `client` (negativo verde).
- [ ] El lane promueve una ruta end-to-end (attestation + eval → saga) sin firma humana por ruta, con canary facturable verde.
- [ ] `requireHuman` sigue en `recordModelReadinessReview`; el lane nunca lo firma; attestor≠lane principalId.
- [ ] Flota objetivo: evidencia de términos real por proveedor + golden briefs por ruta; slugs verificados con probes de gasto cero.
- [ ] Docs: ADR-010 + skill + funcional + manual + handoff sincronizados.

## Verification

- `pnpm check && pnpm build` en `efeonce-globe` (NodeNext strict + `node --test`, tests nuevos registrados en el script del package)
- Migración 0030 aplicada + readback contra `globe-pg`
- Canary facturable por clase de ruta + negativo de scope de workspace
- `tofu plan` sin drift si toca Terraform (flag/grant)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `GLOBE_RUNTIME_HANDOFF.md` actualizados (flags, attestations, rutas, canarios)
- [ ] `changelog.md` si cambió comportamiento visible
- [ ] chequeo de impacto cruzado (TASK-1480, TASK-1527)
- [ ] skill `greenhouse-globe` con el 8vo worked example + reglas duras de ADR-010

## Follow-ups

- Re-attestation cadence / drift signal sobre `providerTermsRef` (licencias cambian) — diferido de V1.
- Doble-humano (maker+reviewer) para attestations comerciales — open question de ADR-010.
- UI del lane / dashboard de attestations (parity: la capability ya existe; la UI es consumer).

## Open Questions

- Lane = clase de workload nueva vs gate de citación sobre promoter/checker (resuelto en Slice 1 leyendo el wiring exacto).
- Techo por workspace: jsonb en projection vs columna tipada + CHECK (leaning jsonb; el campo de techo es load-bearing).
