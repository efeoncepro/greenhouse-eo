# TASK-1518 — Growth CTA Embed Runtime Migration and Fleet Closure

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-035`
- Status real: `Diseño; bloqueada por Forms migration`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1517`
- Branch: `task/TASK-1518-growth-cta-embed-runtime-fleet-closure`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Migra CTA al Embed Runtime neutral, reemplaza sus dependencias hardcoded/derivadas por el registry de productos y
verifica CTA→Form y CTA→Meetings end-to-end. Cierra el fleet con legacy windows, rollback drills, runbooks, señales y
criterios de retiro suficientes para cerrar EPIC-035.

## Why This Task Exists

CTA debe migrar último porque compone los otros dos productos. Hoy deriva Forms desde el API base y conoce la URL
Vercel de Meetings, lo que acopla product logic al proveedor de assets. Si se migra antes, el nuevo runtime conservaría
exactamente el lock-in que pretende eliminar.

## Goal

- Publicar CTA independientemente y eliminar provider URLs de sus actions.
- Probar composición directa/CTA→Form/CTA→Meetings en WordPress y Think/Astro.
- Cerrar operación del fleet: compatibilidad, usage signals, rollback, costos y retirement gobernado.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`

Reglas obligatorias:

- CTA identifica producto/contract range; registry resuelve loader bajo `asset-base-url`.
- Forms/Meetings conservan API, state, success y conversion truth.
- No circular dependencies, megabundle ni SDK de provider en product code.
- Sin cambio visual intencional; GTM/CMP host-owned y browser telemetry no es truth.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`
- `docs/epics/to-do/EPIC-023-growth-cta-popup-cro-engine.md`

## Dependencies & Impact

### Depends on

- `TASK-1514` protocol/registry.
- `TASK-1516` Meetings stable neutral.
- `TASK-1517` Forms stable neutral.

### Blocks / Impacts

- Cierra `EPIC-035` cuando todos sus exit criteria y legacy windows estén satisfechos.
- Impacta CTA renderer/action adapters y Think `GrowthCtaDock`.

### Files owned

- `scripts/build-growth-cta-renderer.mjs`
- `src/growth-cta-renderer/action.ts`
- `src/growth-cta-renderer/meeting-action.ts`
- `src/growth-cta-renderer/contract.ts`
- `../efeonce-think/src/components/GrowthCtaDock.astro`
- `.github/workflows/embed-runtime-release.yml`
- `scripts/embed-runtime/` verification/retirement tooling

## Current Repo State

### Already exists

- CTA renderer portable, Action Registry, telemetry, Think host y admin preview.
- Forms/Meetings product contracts y neutral loaders tras tasks previas.
- Fleet protocol, Firebase plane y rollback probados.

### Gap

- CTA stable sigue ligado a Greenhouse prebuild/latest.
- `action.ts` deriva Forms desde API origin y `meeting-action.ts` hardcodea Vercel.
- No hay dependency-range gate ni fleet-wide closure/retirement evidence.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/growth-cta-renderer + build script + Think adapter`
- Future candidate home: `public`
- Boundary: `CTA renderer/action contracts consumen registry; Forms/Meetings siguen independientes`
- Server/browser split: `registry/loader browser-safe; CTA arbitration/API/ledgers server-side Greenhouse`
- Build impact: `stable sale de Greenhouse prebuild; preview local permanece`
- Extraction blocker: `cross-product compatibility y host rollout coordinan tres products/repos`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `CTA stable artifact + dependency registry; CTA/Forms/Meetings ledgers no cambian`
- Consumidores afectados: `Think, WordPress bindings, CTA actions, release operators`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `CTA render/action/telemetry contracts`
- Contrato nuevo o modificado: `CTA protocol V1 manifest dependencies + registry resolution`
- Backward compatibility: `gated con legacy shim y compatible ranges`
- Full API parity: `sin cambio; action adapters consumen primitives/APIs canónicas`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna migration; ledgers se verifican read-only`
- Invariantes que no se pueden romper:
  - `CTA no duplica state o truth de Forms/Meetings`
  - `dependency range incompatible bloquea promoción`
  - `browser event nunca confirma conversión por sí solo`
- Tenant/space boundary: `CTA surface/origin/consent policies vigentes`
- Idempotency/concurrency: `product promotion serializada; action idempotency existente intacta`
- Audit/outbox/history: `per-product receipts + fleet closure/retirement record`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow` — dual-publish CTA
- Backfill plan: `N/A`
- Rollback path: `previous CTA release/legacy loader; dependencies remain neutral`
- External coordination: `Think/WordPress host, release approval, legacy observation window`

### Security and access

- Auth/access gate: `public surface policy + protected release workflow`
- Sensitive data posture: `no PII en artifacts, manifests, telemetry o receipts`
- Error contract: `dependency unavailable/incompatible falla contenido y no host page`
- Abuse/rate-limit posture: `acciones conservan guards de sus APIs destino`

### Runtime evidence

- Local checks: `CTA renderer/action/meeting/telemetry tests`
- DB/runtime checks: `read-only reconciliation de CTA Tier A, submission y booking según escenarios aprobados`
- Integration checks: `direct CTA, CTA→Form, CTA→Meetings en WordPress/Think`
- Reliability signals/logs: `dependency/load/action + legacy traffic + Firebase cost/rollback age`
- Production verification sequence: `dual-publish → composition matrix → cutover → rollback → legacy retirement`

### Acceptance criteria additions

- [ ] Cross-product truth/compatibility y rollback son explícitos.
- [ ] No provider URLs quedan en product code.
- [ ] Fleet closure conserva evidencia y no PII.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — CTA independent release and registry

- Emitir CTA release/channel V1 y declarar dependency ranges.
- Reemplazar derivación/hardcode de Forms/Meetings por registry bajo `asset-base-url`.

### Slice 2 — Composition cutover

- Migrar Think/WordPress bindings aplicables.
- Probar direct CTA, CTA→Form y CTA→Meetings con consent/telemetry/failure states.

### Slice 3 — Fleet closure and retirement

- Ejecutar cutover/rollback CTA y fleet-wide drill.
- Cerrar legacy usage windows, retirar URLs sólo con cero uso, documentar SLO/costos/runbooks y auditar exit criteria.

## Out of Scope

- Rediseñar CTA, Forms o Meetings.
- Cambiar targeting, suppression, booking o submission business rules.
- Migrar a otro CDN o introducir un cuarto embed product.

## Detailed Spec

El registry mapea product key + compatible contract range a un loader relativo al `asset-base-url`; no acepta URLs
arbitrarias desde CTA content. El runtime deduplica instalaciones y falla contenido —no la página host— ante una
dependencia ausente o incompatible. El cierre consolida receipts por producto y un fleet digest sin fusionar versiones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Registry/ranges → composition matrix → cutover/rollback → retirement. No retirar legacy antes del usage gate.

### Risk matrix

| Riesgo                        | Sistema | Probabilidad | Mitigation                  | Signal de alerta              |
| ----------------------------- | ------- | ------------ | --------------------------- | ----------------------------- |
| Dependency incompatible carga | CTA     | medium       | semver/range promotion gate | incompatible dependency event |
| CTA duplica renderer/state    | Growth  | medium       | registry + ownership tests  | doble element/submit/booking  |
| Legacy URL aún tiene tráfico  | public  | medium       | usage window + shim         | requests >0                   |

### Feature flags / cutover

CTA channel/host config es el switch. Legacy shims se mantienen hasta cero tráfico en la ventana declarada.

### Rollback plan per slice

| Slice | Rollback                                                 | Tiempo  | Reversible? |
| ----- | -------------------------------------------------------- | ------- | ----------- |
| 1     | restaurar adapters legacy y previous CTA release         | <15 min | sí          |
| 2     | revert host bindings                                     | <30 min | sí          |
| 3     | detener retirement y restaurar shim desde release previo | <30 min | sí          |

### Production verification sequence

1. Validar manifest/dependency ranges y no provider URLs.
2. Ejecutar composition matrix en fixtures y hosts reales.
3. Cutover CTA, telemetry y server-ledger reconciliation.
4. Rollback CTA y fleet-wide, luego restore.
5. Observar legacy window, retirar elegibles y cerrar runbooks/SLO/cost.

### Out-of-band coordination required

- Releases de Think/WordPress y autorización de flows reales.
- Retiro de legacy sólo con owner y ventana aprobada.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] CTA tiene release/channel/rollback independiente bajo protocolo V1.
- [ ] `action.ts` y `meeting-action.ts` no contienen URLs provider-specific ni derivan assets desde API base.
- [ ] Dependency ranges inválidos bloquean promoción.
- [ ] Direct CTA, CTA→Form y CTA→Meetings pasan en hosts aplicables.
- [ ] GTM/CMP y ledgers preservan el contrato de truth sin PII.
- [ ] GVC no muestra regresiones, overflow ni fallos teclado/reduced motion.
- [ ] Fleet-wide rollback y per-product rollback están probados.
- [ ] Legacy URLs se retiran sólo tras cero uso observado; shims restantes tienen owner/expiry.
- [ ] EPIC-035 exit criteria, costos, SLOs y runbooks quedan auditados.

## Verification

- Suites `src/growth-cta-renderer/__tests__` y contract/telemetry parity.
- Composition GVC desktop/390, teclado, reduced motion, overflow=0.
- `pnpm local:check`, `pnpm task:lint --task TASK-1518`, `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] EPIC-035 se mueve a complete sólo si todos sus exit criteria están cumplidos.
- [ ] Architecture/runbooks/handoff/changelog reflejan runtime real y shims restantes.
- [ ] QA release auditor y documentation governor revisan cierre.

## Follow-ups

- Nuevos embed products requieren aceptación explícita del protocolo/ownership; no se agregan por inferencia.
