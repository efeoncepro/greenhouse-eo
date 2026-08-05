# TASK-1522 — Globe Review, Comments and Read-only Share Foundation

## Status

- Lifecycle: `in-progress`
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
- Status real: `Migration/secret/grants desplegados; smoke positivo bloqueado por ausencia de output elegible`
- Rank: `wip`
- Domain: `creative|review|collaboration|security`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-25 — lo que shippeó del share board, y las menciones vuelven acá

Se crearon `TASK-1562` (hidratación de la proyección del share) y `TASK-1563` (menciones) sin ver que esta task es
la dueña de review/comments/share. Registro acá lo que pasó, para que esta task no quede ciega:

**Ya LIVE en producción** (revisión `globe-studio-internal-00071-6vp`): el **share board sobre el payload cliente**
(`TASK-1558`) y la **hidratación de su proyección** (`TASK-1562`) — `resolveForShare` devolvía sólo
`{ target, mediaType }`, así que `modelLabel`, `reviewStatus` y `comments` se descartaban en silencio en **todos**
los shares: el grant los pedía, el dominio los proyectaba, el operador podía crearlos, y la autoridad nunca los
entregaba. El panel del share board estaba estructuralmente vacío en producción. Ambas tasks quedan como el
registro de lo que shippeó; **el dominio sigue siendo de esta task**.

**Las menciones (`TASK-1563`) pertenecen acá y no a una task propia.** Su contenido: mención como **dato
estructurado validado contra el roster real**, nunca parseo de `@` sobre el body. El trabajo real son **dos
primitives que faltan** — un directorio mencionable con nombre (Globe conoce `identitySubject`, no nombres) y un
canal de notificación (no existe ninguno general). **Mencionar NUNCA concede acceso.** Ojo con `TASK-1544`
(menciones de Storyboard): son dos dominios distintos y el directorio mencionable debería ser **una** primitive
compartida, no dos.

**Y el hallazgo que corrige una afirmación falsa del feed:** deshabilité "Compartir board" en el feed diciendo *"no
tiene contrato gobernado"*. **Falso** — `globe.producer.review.share.create` existe y está declarado en
`creative-review.ts`. Lo que falta es la superficie que lo consume, y esa razón apunta al trabajo real; "no hay
contrato" manda al próximo agente a construir uno que ya está.

## Summary

Separar de `TASK-1472` el kernel durable e independiente de layout/release para review humano, comentarios y
share boards de sólo lectura. `TASK-1472` conserva artifact manifest, release y delivery y consume esta foundation.

## Checkpoint 2026-07-22 — code complete, rollout pendiente

Globe ya contiene contratos versionados, cuatro capabilities de autoridad fina, seis commands, dos readers,
handlers transport-neutral, resolución bearer read-only con proyección allowlisted, migración `0016` y store durable.
Review se liga a `experimentId + sha256`; decisiones usan expected revision, idempotencia durable y locks advisory.
Comentarios conservan cada revisión append-only y borrado por tombstone. Shares guardan sólo hash, se reemiten de
forma determinista en replay, expiran y revocan fail-closed, y no confieren commands/download/workspace discovery.

Verificación local integrada: `pnpm check` y `pnpm build` verdes en `efeonce-globe` (Studio 138/138;
Domain 248/248; Creative Runner 183/183 dentro del full check). No se aplicó migración ni se publicaron secret,
grants humanos o runtime internal: el estado correcto es `code complete, rollout pendiente`.

### Runtime composition delta

`studio-web` registra siempre las ocho primitives, compone `DurableCreativeReviewStore` desde el pool productivo,
reusa `authorizeOwnedOutput` como única autoridad de asset y deriva bearer material con HMAC determinista desde
`GLOBE_CREATIVE_SHARE_SECRET`. Sin store o secret, el handler falla como `dependency_unavailable`; no aparece un
fallback in-memory. La coverage `ui` ya es `available` porque TASK-1505 consume estas primitives, pero eso no
autoriza por metadata: sin secret/store/grant humano el dispatch sigue fallando cerrado.

El transporte read-only same-origin está implementado en `studio-web`: `GET /v1/shares/resolve` entrega sólo la
proyección allowlisted y `GET /v1/shares/:shareId/media` proxifica bytes privados inline con range support. Ambos
aceptan el bearer exclusivamente como `Authorization: Globe-Share <token>`; query, cookies y el bearer workload
no son aliases válidos. El cliente aprobado debe mantener el token en el fragmento de la URL y promoverlo al
header same-origin. Las respuestas son `private, no-store`, no exponen workspace/storage/download authority y
colapsan grant inválido/expirado/revocado/wrong-path a `404`; sólo dependencia caída se distingue como `503`.
Suite Studio actual: 134/134.

Pendiente de rollout: provisionar/montar el secret purpose-separated, aplicar migración `0016`, otorgar las cuatro
capabilities al broker humano autorizado y ejecutar smokes allow/deny/replay/revoke/expiry.

## Checkpoint 2026-07-23 — runtime listo, evidencia positiva aún bloqueada

- Migración `0016`, secret purpose-separated, accessor y capabilities del bridge están aplicados en el runtime
  internal-only; las suites y el conformance local permanecen verdes.
- No existe un output owned/elegible nuevo porque Model Readiness y provenance siguen cerrados. Sin ese input no
  se puede probar honestamente approve/comment/share/revoke/expiry en vivo.
- La task permanece `in-progress`; no se inventó un output ni se amplió el share a clientes externos.

## Why This Task Exists

La UI aprobada de Producer incluye aprobar, pedir cambios, comentar y compartir. Esas acciones no pueden vivir
como estado del browser. El gate de `TASK-1472` está correctamente bloqueado por el layout compiler porque mezcla
esas primitives con release/delivery; esta task permite construir el contrato reutilizable sin declarar listo el
release ni saltar sus dependencias.

## Goal

Entregar commands/readers Full API Parity y persistencia tenant-safe para decisiones sobre una versión inmutable,
comentarios auditables y grants share read-only revocables/expirables, sin habilitar clientes externos.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Contratos code-complete de tenancy (`TASK-1511`), assets/provenance (`TASK-1467`) y API Contract Spine
  (`TASK-1481`). Sus migraciones/rollout pendientes bloquean la verificación live, no el slice local fail-closed.

### Blocks / Impacts

- `TASK-1472` consume reviews aprobados y shares revocables al construir release/delivery.
- `TASK-1505` consume los commands/readers; no inventa estados ni mutaciones locales.

### Files owned

- `../efeonce-globe/packages/contracts/src/creative-review.ts`
- `../efeonce-globe/packages/domain/src/creative-review.ts`
- `../efeonce-globe/packages/database/src/stores/creative-review-store.ts`
- `../efeonce-globe/packages/database/migrations/0016_creative_review_share.sql`
- `../efeonce-globe/apps/studio-web/src/app.ts`
- `../efeonce-globe/apps/studio-web/src/main.ts`
- `../efeonce-globe/apps/studio-web/src/dispatch.ts`
- `../efeonce-globe/apps/studio-web/src/creative-review-runtime.test.ts`
- exports y scripts de test estrictamente necesarios en esos packages

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe packages/contracts|domain|database; gobierno en greenhouse-eo`
- Future candidate home: `domain-package`
- Boundary: `review/comment/share resources; release/delivery remains TASK-1472`
- Server/browser split: `writes, token issue/hash/verify and policy are server-only; readers return allowlisted DTOs`
- Build impact: `Globe contract/domain/database packages; no UI bundle changes`
- Extraction blocker: `live rollout requires migrations, runtime composition and internal capability grants`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `Globe durable Postgres`
- Consumidores afectados: `Producer UI/BFF, private HTTP API, SDK/MCP/CLI policy surfaces and TASK-1472`
- Runtime target: `sibling-service`

### Contract surface

- Commands: decide review, create/edit/delete comment, create/revoke share grant.
- Readers: review thread and allowlisted share-board projection resolved from a bearer secret server-side.
- Full API parity: all descriptors declare the eight canonical surfaces; UI/HTTP/SDK available only through
  existing trusted dispatch, external/public command surfaces remain policy-blocked.

### Data model and invariants

- Review targets an immutable `experimentId + outputHash`; a later derivative is never implicitly approved.
- `approved` and `changes_requested` converge under optimistic version/precondition and durable idempotency.
- Comments are ordered, attributable and tenant-scoped; edits/deletes preserve immutable audit/history.
- Share secret is returned once, stored only as a hash, never logged; grant has expiry, revocation and an exact
  allowlisted projection. Bearer access grants no command, spend, download or workspace enumeration authority.
- Actor/workspace/correlation/capabilities come from trusted context, never payload.

### Migration, backfill and rollout

- Migration posture: `additive`; no backfill.
- Default state: `internal-only`; no public/commercial environment activation.
- Rollback: remove runtime registration/flag while retaining append-only records; migration is forward-only.
- Live rollout depends on migration apply, runtime wiring, broker grant and negative allow/deny/revoke/expiry smoke.

### Security and access

- Separate least-privilege capabilities for review read/write, comments and share administration.
- Bearer resolver accepts only a bounded token, compares a cryptographic hash and returns a fixed projection.
- Errors are flat/sanitized (`not_found` for cross-workspace/nonexistent resources); no token or private storage
  coordinates enter audit/logs.

## Execution Plan

1. Add versioned contracts/capabilities/descriptors for review, comments and share grants.
2. Implement transport-neutral domain handlers with asset ownership port, idempotency/preconditions and audit.
3. Add additive migration and durable store with tenant keys, unique idempotency and transactional audit/history.
4. Add package tests for transitions/concurrency/replay, cross-workspace denial, comment policy and share
   expiry/revocation/projection containment.
5. Wire only into canonical registry/runtime after dependencies are explicitly available; otherwise leave a
   typed composition port and report `code complete, rollout pendiente`.

## Scope

- Review decision `approved | changes_requested` over one immutable output version.
- Comment create/edit/delete tombstone with ordered thread reader.
- Read-only share grant create/revoke/resolve with expiration and allowlisted metadata/preview projection.

## Out of Scope

- Artifact manifests, packaging, release, delivery/download grants and purge (`TASK-1472`).
- UI changes (`TASK-1505` for review/comment surfaces; **`TASK-1556` for the read-only share board, rebuilt on the new typed client payload per ADR-014**) and commercial/public environment activation (`TASK-1521`).
- Anonymous commands, workspace enumeration, provider calls or direct bucket URLs.

## Acceptance Criteria

- [x] Concurrent review decisions converge deterministically and replay is side-effect free.
- [x] Approval is scoped to the exact immutable output and never propagates to derivatives.
- [x] Comment create/read/edit/delete has cross-workspace and author/policy negative tests with preserved history.
- [x] Share secrets are stored hashed; revoked/expired grants fail closed and cannot execute commands or widen DTOs.
- [x] Commands/readers are transport-neutral, audited and covered by the canonical surface matrix.
- [x] `pnpm check` and `pnpm build` pass in Globe; rollout state remains honest.

### Criterios de las MENCIONES — migrados de TASK-1563 (retirada)

- [ ] Una mención es **dato estructurado validado contra el roster real** del workspace, **nunca** parseo de `@`
      sobre el body: un parseo acepta cualquier string y convierte un typo en una mención a nadie.
- [ ] 🔴 **Mencionar NUNCA concede acceso.** Es la regla load-bearing: si mencionar diera visibilidad, el hilo de
      comentarios sería un canal para filtrar piezas a cualquiera cuyo nombre alguien pueda escribir.
- [ ] Existe un **directorio mencionable con nombre**. Globe conoce `identitySubject`, **no** nombres — la
      primitive falta y es la mitad del trabajo real.
- [ ] Existe un **canal de notificación**. Hoy no existe ninguno general en Globe; mencionar sin notificar es una
      anotación, no una mención.
- [ ] ⚠️ El directorio mencionable es **UNA** primitive compartida con `TASK-1544` (menciones de Storyboard), no
      dos. Dos directorios del mismo roster divergen, y el que derive es el que menciona a alguien que ya no está.
- [ ] Un `identitySubject` desconocido o cross-workspace es el **MISMO `not_found`** que uno inexistente: si no,
      el resolver de menciones es un oráculo para enumerar el roster de otro tenant id por id.

### Criterios del SHARE ya LIVE — migrados de TASK-1562

- [x] `resolveForShare` entrega `modelLabel`, `reviewStatus` y `comments` — antes devolvía sólo
      `{ target, mediaType }` y los descartaba **en silencio en todos los shares**: el grant los pedía, el dominio
      los proyectaba, el operador podía crearlos, y la autoridad nunca los entregaba.
- [x] El **nombre público** del modelo se resuelve desde el catálogo, y el `routeId`/slug **nunca** viaja al share.
- [x] Los comentarios visibles pasan por el filtro del dominio (`shareVisibleComments`), con su tope.
- [ ] `globe.producer.review.share.create` **existe** y está en el inventario de paridad: el control "Compartir
      board" del feed deja de estar deshabilitado cuando esta task entregue la superficie que lo consume. Hoy
      muestra `pendingShare`, y esa razón tiene que dejar de ser verdad, no cambiarse de texto.

## Verification

- `pnpm task:lint --task TASK-1522`
- `pnpm ops:lint --changed`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Live evidence deferred until migration/runtime/grants are promoted internal-only.

## Closing Protocol

- [ ] Synchronize task lifecycle/index/registry, EPIC-028, architecture delta and handoff.
- [ ] Run QA/documentation closure gates before declaring complete.
- [ ] Leave `code complete, rollout pendiente` when local code is green but live migration/smoke is absent.
