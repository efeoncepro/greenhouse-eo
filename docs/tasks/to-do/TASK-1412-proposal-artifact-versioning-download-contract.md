# TASK-1412 — Proposal Studio: versionado derivado de artefactos + contrato gobernado de descarga

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

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
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-1412-proposal-artifact-versioning-download-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El aggregate `Proposal` (TASK-1392/1391) ya persiste artefactos (`greenhouse_commercial.proposal_assets`
con `kind/status/audience/version`) y render jobs idempotentes, pero **nada deriva la próxima versión**:
`version` default 1 y el caller puede pisarlo u omitirlo. Tampoco existe un **reader de historial de
versiones** ni un **contrato de descarga gobernado** por proposal. Esta task hace el versionado
**derivado** (nunca autorado), expone el historial como reader canónico y agrega el endpoint de descarga
member-gated — la fundación que TASK-1413 (UI) consume.

## Why This Task Exists

Hoy el operador depende de pedirle a un agente «¿dónde quedó el PDF de SKY?» — el artefacto vive en el
asset store privado y no hay camino programático de listado/descarga por proposal ni noción confiable de
«cuál es la versión vigente». Un `attach` repetido del mismo kind queda como dos filas `version=1`. Con
la licitación SKY viva (deck en 3 iteraciones el mismo día) la falta de versionado real ya duele.

## Goal

Que cualquier consumer (UI, Nexa, MCP, CLI) pueda: (1) atachar un artefacto y recibir su versión
**derivada** por `(proposal_id, kind)`; (2) leer el historial completo de versiones por kind con su
metadata; (3) descargar un artefacto vía contrato gobernado (authz de proposal + capability), sin URLs
de storage expuestas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` — el aggregate; §0 estado real.
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` — escrituras SOLO vía
  commands de `src/lib/commercial/tenders/proposals/**`; NUNCA exponer URLs de storage en proyección.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — contrato a nivel capability.
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` — render jobs / artifact-worker.
- Patrón derivado-no-autorado (mismo principio que ordinales/páginas del composer): la versión sale de
  la posición en la historia, no de un input del caller.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` (backend-standard)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

- **Depende de:** TASK-1392 (aggregate, aplicado), TASK-1391 (render jobs, aplicado). Ninguna task
  abierta toca estos archivos.
- **Impacta a:** TASK-1413 (UI, blocked by esta) · TASK-1399 (Nexa actions — el reader nuevo queda
  disponible como tool futuro, sin cambios acá).
### Files owned

- `src/lib/commercial/tenders/proposals/assets.ts`,
  `src/lib/commercial/tenders/proposals/artifact-versions.ts` (nuevo),
  `src/app/api/commercial/proposals/[proposalId]/assets/[proposalAssetId]/download/route.ts` (nuevo),
  `migrations/*task-1412*.sql` (nueva).

## Current Repo State

**Ya existe:**

- `greenhouse_commercial.proposal_assets` con `version integer NOT NULL DEFAULT 1 CHECK (version >= 1)`,
  `kind` (8 valores), `audience`, `status`, `UNIQUE (proposal_id, asset_id)`.
- Commands en `src/lib/commercial/tenders/proposals/assets.ts` — el attach escribe `input.version ?? 1`.
- `proposal_render_jobs` idempotente por `(owner_org_id, proposal_id, manifest_hash, artifact_purpose)`;
  `render-jobs.ts` / `render-projection.ts` / `render-dispatch.ts`.
- Gate único de acceso: `assertProposalStudioAccessForSubject` (`access.ts`); capabilities
  `commercial.proposal.{read,manage,gate,render}`; entitlement per-ORG `proposal_studio_v1`.
- Proxy de assets privados: `src/app/api/assets/private/[assetId]/route.ts` `[verificar contrato exacto
  y si exige capability específica]`.

**Gap:**

- Versión derivada: no hay `MAX(version)+1` por `(proposal_id, kind)` ni unicidad que impida dos
  `(proposal, kind, version)` iguales.
- Reader de historial de versiones por kind (con metadata de asset + job de render vinculado
  `[verificar si el asset producido por el worker queda linkeado en proposal_assets]`).
- Endpoint de descarga scoped a la proposal (hoy sólo el proxy genérico de assets).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/commercial/tenders/proposals/**` (package-shaped, extraction-ready; extiende el módulo existente).
- Future candidate home: `domain-package`
- Boundary: escrituras sólo vía commands del módulo; el endpoint de descarga NO conoce GCS —
  delega en el helper de assets core.
- Server/browser split: 100% server-only (lib + route handlers); el handler de descarga responde
  stream/redirect firmado y ningún código cruza al browser.
- Build impact: ninguno (sin deps nuevas).
- Extraction blocker: ninguno nuevo.

## Backend/Data Contract

### Backend/data brief

Versionado derivado + historial + descarga gobernada de artefactos de Proposal. Rigor: `backend-standard`.

### Contract surface

- Command (modificado): `attachProposalAsset` — deriva `version = COALESCE(MAX(version),0)+1` por
  `(proposal_id, kind)` **dentro de la misma tx**; el parámetro `version` del input **se elimina** del
  contrato público (derivado, no autorado).
- Reader (nuevo): `readProposalArtifactVersions(subject, proposalId)` →
  `{ kinds: [{ kind, current: {…}, history: [{ proposalAssetId, version, status, audience, assetId,
  fileName, sizeBytes, createdAt, createdBy, renderJobId? }] }] }` — sin `gsUri` ni URL de storage.
- API (nuevo): `GET /api/commercial/proposals/[proposalId]/assets/[proposalAssetId]/download` →
  302 a URL firmada de corta vida (o stream), tras authz.
- API (existente, sin romper): `GET .../assets` sigue igual; puede ganar `?withVersions=1` opcional.

### Data model and invariants

- Migración: `CREATE UNIQUE INDEX proposal_assets_kind_version ON proposal_assets (proposal_id, kind,
  version)` + backfill previo que renumera duplicados `version=1` por `created_at ASC` (determinista) +
  bloque DO anti pre-up-marker que verifica índice y ausencia de duplicados.
- Invariante: la versión NUNCA se recicla ni se edita; una corrección es una versión nueva. `status`
  (`draft|in_review|final`) es ortogonal a la versión.
- `audience` se respeta en TODO el contrato: el reader marca `internal`, y la descarga de un asset
  `internal` exige member interno (nunca principal de portal cliente).

### Migration, backfill and rollout

- `pnpm migrate:create task-1412-proposal-asset-version-uniqueness`; backfill dentro de la misma
  migración (UPDATE renumerando por ventana); rollback = `DROP INDEX` (los datos renumerados son
  correctos y se conservan).
- Sin flag: cambio aditivo + endurecimiento de unicidad ya deseado por el modelo.

### Security and access

- Todo camino pasa por `assertProposalStudioAccessForSubject` (una puerta, dos entradas — NUNCA un gate
  paralelo) + `can(subject,'commercial','proposal','read')` para reader/descarga.
- La URL firmada expira ≤ 10 min y no se persiste ni loggea; errores vía `canonicalErrorResponse`.

### Runtime evidence

- Vitest focal del módulo + prueba live contra PG (proxy) del backfill y la unicidad (SQL embebido:
  regla ISSUE-071 — ejercitar contra PG real antes de mergear).
- `curl` autenticado (agent-session) al endpoint de descarga: 302 firmado para member autorizado; 403
  para persona `client`; 404 para asset de otra proposal.

### Acceptance criteria additions

Ver Acceptance Criteria (binarios) abajo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Migración de unicidad + backfill:** renumerar duplicados `(proposal,kind,version)` por
  `created_at`, crear el índice único, bloque DO de verificación. Regenerar `db:generate-types`.
- **Slice 2 — Versión derivada en el command:** `attachProposalAsset` calcula `MAX+1` en la tx; se
  retira `version` del input público; tests del módulo actualizados (incluye carrera: dos attach
  concurrentes del mismo kind → versiones distintas, el segundo reintenta sobre conflicto del índice).
- **Slice 3 — Reader de historial:** `artifact-versions.ts` con el shape del contrato; expuesto en
  `GET /api/commercial/proposals/[proposalId]/assets?withVersions=1` o subruta `/versions` (decisión en
  Plan Mode); operator-view puede consumirlo después (no en esta task).
- **Slice 4 — Descarga gobernada:** route handler nuevo; resuelve el asset core, valida pertenencia a
  la proposal + audience + capability, y responde 302 firmado corto. `[verificar]` reutilización del
  helper del proxy `api/assets/private/[assetId]`.
- **Slice 5 — Registro del artefacto del render (si falta):** si el asset PDF producido por el
  `artifact-worker` no queda linkeado en `proposal_assets`, el consumer del evento de éxito lo registra
  con kind derivado de `artifact_purpose` y versión derivada. `[verificar en render-projection.ts /
  eventos `commercial.proposal.render.*` antes de implementar; si ya existe, este slice se reduce a
  asegurar que use la derivación nueva]`.

## Out of Scope

- Toda UI (TASK-1413). Nexa tools nuevos. Portal cliente. Firma/AT de documentos. Retención/purga del
  asset store. Cambios al render pipeline/worker más allá del registro del Slice 5.

## Detailed Spec

Contrato completo en `## Backend/Data Contract`. Decisiones fijas: la versión es **derivada** (patrón
ordinal del dominio); `internal` nunca cruza a un principal de portal cliente; el reader jamás expone
`gsUri`; los errores usan `CanonicalErrorCode` existente o extienden el enum.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 → 2 → 3 → 4 → 5. La migración (1) va primero: la derivación (2) depende del índice para su semántica
de carrera. 3-5 son aditivos e independientes entre sí tras 2.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Backfill renumera mal duplicados | PG proposal_assets | Baja | Renumeración determinista por `created_at, proposal_asset_id`; DO block verifica 0 duplicados post-apply; prueba live en dev antes de commit | Bloque DO aborta migración |
| Carrera de attach concurrente | command | Media | Conflicto del índice único → retry una vez dentro del command | Error 23505 en logs |
| Descarga filtra asset `internal` a cliente | API | Baja | Check de audience + tenantType en el handler + test con persona `agent-client` | Test E2E 403 |
| URL firmada persistida por error | API | Baja | La URL sólo vive en el 302; lint manual en review | — |

### Feature flags / cutover

Sin flag — aditivo. El endpoint nuevo nace gateado por capability existente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | `migrate:down` (DROP INDEX; la renumeración se conserva, es corrección legítima) | min | Sí |
| 2-5 | revert PR + redeploy | min | Sí |

### Production verification sequence

Staging: attach ×2 mismo kind → v1/v2; reader muestra historial; descarga 302 member OK / 403 cliente.
Producción: sólo tras TASK-1413 (la UI es el consumer que lo ejercita); el endpoint queda live pero
inerte sin UI.

### Out-of-band coordination required

Ninguna (no toca worker deploy si Slice 5 resulta ya cubierto; si no, el consumer vive en el repo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Índice único `(proposal_id, kind, version)` existe en dev y `pnpm migrate:status` limpio; 0
      duplicados post-backfill (query de verificación en la task al cierre).
- [ ] `attachProposalAsset` no acepta `version` en su input público y dos attach del mismo kind
      producen v1 y v2 (test).
- [ ] Reader devuelve historial por kind con `current` correcto y **sin ninguna URL de storage** (test
      que falla si aparece `gs://` — patrón no-leak del dominio).
- [ ] `GET .../download`: 302 firmado para member con `commercial.proposal.read`; 403 para persona
      client; 404 cross-proposal (los tres con evidencia curl/agent-session).
- [ ] Fuente de verdad nombrada (PG `greenhouse_commercial.proposal_assets`), frontera de acceso
      explícita (gate único + capability), postura de migración/rollback explícita (arriba).
- [ ] `pnpm vitest run src/lib/commercial/tenders/proposals` verde; `pnpm typecheck` verde.

## Verification

`pnpm local:check` + vitest focal + prueba live PG del backfill (ISSUE-071) + curls de la matriz de
acceso con agent-session (personas superadmin y client).

## Closing Protocol

Lifecycle → complete + mover archivo + README/registry + chequeo de impacto cruzado (TASK-1413 pasa a
desbloqueada; anotar Delta allí) + `pnpm docs:closure-check` + gate de cierre del dominio contractor NO
aplica; el de tenders sí: `pnpm vitest run src/lib/artifact-composer` sigue verde (no se toca, smoke).

## Follow-ups

- Nexa tool `proposal_artifact_versions` sobre el reader (post TASK-1399 flip).
- Retención/purga del asset store (política, no runtime).

## Open Questions

- ¿El PDF del worker ya queda linkeado en `proposal_assets`? (Slice 5 `[verificar]` — decide su alcance.)
