# TASK-492 — Document Manager, Access Model & UI Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-489`
- Branch: `task/TASK-492-document-manager-access-model-ui-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-05-11 — Arch hardening pre-implementación (6 gaps canónicos)

Skill `arch-architect` (Greenhouse overlay) revisó la spec aplicando patrones canonizados después de la creación de esta task (TASK-611/784/863/743/265). 6 gaps que se deben cerrar **antes de empezar Slice 1**:

1. **Capabilities granulares enumeradas + reflejadas en `capabilities_registry` (TASK-611 Slice 2).** Draft dice "access model V2" sin enumerar. Patrón canónico TASK-784 declara 6 capabilities per módulo. Mínimos para document manager:
    - `documents.read_masked` — list/view docs con sensitive fields enmascarados (member: scope=own, HR: scope=tenant, EFEONCE_ADMIN: scope=all).
    - `documents.upload` — self-service upload (member: scope=own only; HR: scope=tenant para terceros).
    - `documents.verify` — HR aprueba/rechaza (route_group=hr / EFEONCE_ADMIN, scope=tenant).
    - `documents.reveal_sensitive` — desenmascarar campos confidenciales con reason >= 20 chars + audit + outbox (EFEONCE_ADMIN solo + FINANCE_ADMIN para algunos; NUNCA member scope).
    - `documents.export_snapshot` — generador de PDF/zip para auditor externo (HR + EFEONCE_ADMIN, scope=tenant).
    - `documents.archive` — soft-tombstone via state machine TASK-489 (HR + EFEONCE_ADMIN).
    Cada una declarada en `src/config/entitlements-catalog.ts` + seedeada vía migration en `greenhouse_core.capabilities_registry` con parity test runtime↔DB (pattern TASK-611 `parity.live.test.ts`).
2. **DataTableShell canonical wrapper (TASK-743).** Draft menciona "table/list, filters" sin nombrar wrapper. Cualquier tabla > 8 columnas o con celdas editables inline (verify action, expiry chip editable) DEBE envolverse en `<DataTableShell>` con `useTableDensity()`. Lint rule `greenhouse/no-raw-table-without-shell` bloquea regression.
3. **Microcopy via `src/lib/copy/documents.ts` (TASK-265/407/408).** Draft NO menciona shared copy module. Patrón canónico: extender `src/lib/copy/` con namespace `GH_DOCUMENTS` per dominio (states: pendiente/verificado/rechazado/archivado/vencido, CTAs: subir/verificar/rechazar/archivar/descargar/desenmascarar, aria-labels, error messages, empty states). NUNCA literals JSX. Lint rule `greenhouse/no-untokenized-copy` enforce.
4. **Reveal pattern canonical (TASK-784).** Draft menciona "confidencialidad" sin pattern. Para fields/docs sensibles: server-only resolver `revealDocument({docId, reason: string >= 20, actorUserId})` con capability check + audit log row en `document_reveal_audit` + outbox event `document.revealed_sensitive.v1`. Anomaly rate signal `documents.reveal_anomaly_rate` (>=3 reveals/24h por actor → warning). Cliente NUNCA decide visibilidad — recibe payload pre-redacted.
5. **Organization Workspace shell facets (TASK-611/612/613).** Draft menciona "patterns shared" pero NO declara que el document manager debe vivir como **facet del Organization Workspace shell** cuando emerja desde entrypoints organization-centric (`/agency/organizations/[id]?facet=documents`, `/finance/clients/[id]?facet=documents`). El gestor "global" `/admin/documents` puede ser standalone, pero los gestores per-org consumen `FACET_REGISTRY` con lazy `dynamic()` import. Patrón fuente: FinanceFacet con per-entrypoint dispatch (TASK-613).
6. **Person 360 facet alignment.** Draft dice "People 360" sin clarificar canonical 360 object. Decisión: docs LABORALES viven facet del **Colaborador** (`team_members`), docs de IDENTIDAD LEGAL personal viven en facet de **Persona** (`identity_profiles`) — TASK-784 ya los modela como `person_identity_documents`. Para tab `/people/[memberId]?tab=documents`, mostrar docs laborales filtrados por `member_id` via bridge `document_member_link`. Pattern canónico TASK-784 reveal-on-demand.

**4-pillar score requerido al cerrar Slice 1**:

- **Safety**: 6 capabilities granulares + capabilities_registry parity + reveal con reason+audit. Residual: client-side filter solo, server enforce siempre.
- **Robustness**: DataTableShell con useTableDensity defense, copy via canonical module impide literals drift.
- **Resilience**: signal `documents.reveal_anomaly_rate` + `documents.list_p95_lag` (read perf).
- **Scalability**: cursor pagination (keyset on `created_at DESC`) NO offset; lazy `dynamic()` per facet evita bundle bloat.

**Patrones canónicos fuente para replicar**:

- TASK-743 `<DataTableShell>` + `<InlineNumericEditor>`.
- TASK-784 6 capabilities + reveal helper + audit + outbox.
- TASK-611/612/613 Organization Workspace shell + FACET_REGISTRY.
- TASK-265/407/408 copy modules + lint rule.
- TASK-854 `/admin/releases` dashboard pattern (cursor pagination + drawer + EmptyState + sonner toast).

---

## Summary

Construir el primer gestor documental visible del portal: surfaces, componentes y access model V2 para listar, filtrar, descargar, cargar y revisar documentos desde una base shared, sin obligar a cada módulo a inventar su propia UI.

## Why This Task Exists

Una plataforma documental sin gestor/document admin termina escondida en APIs. Greenhouse necesita una surface reusable con permisos explícitos, tanto para administración interna como para vistas personales o de dominio. Además, el acceso documental toca ambos planos de Identity Access V2: `views` y `entitlements`.

## Goal

- Definir el access model documental del portal.
- Crear componentes/shared views para document list, viewer meta, history y actions.
- Dejar listo el portal para que HR y Finance/Legal monten sus vistas específicas sobre esta base.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- documentar explícitamente qué vive en `views` y qué vive en `entitlements`
- reutilizar componentes shared en `src/components/greenhouse/**`
- mantener copy, estados y accesibilidad alineados al portal

## Dependencies & Impact

### Depends on

- `TASK-489`
- `greenhouse-agent`
- `greenhouse-ui-orchestrator`
- `greenhouse-ux-content-accessibility`

### Blocks / Impacts

- `TASK-494`
- `TASK-495`
- futuras lanes documentales cross-domain

### Files owned

- `src/components/greenhouse/documents/**`
- `src/views/greenhouse/**`
- `src/app/(dashboard)/**`
- `src/config/**` si cambia access model

## Current Repo State

### Already exists

- patterns shared de portal/UI
- access model V2
- private assets serving

### Gap

- no hay un document manager shared
- no hay capabilities/document views canónicas
- cada dominio tendría que inventar su propia screen y tabla

## Scope

### Slice 1 — Access model

- definir `views`, entitlements y route groups si aplican

### Slice 2 — Shared UI

- table/list, filters, states, history panel, version chips, signer state badges

### Slice 3 — Shared routes/pages

- document hub interno y patterns de embedding para módulos específicos

## Out of Scope

- lógica particular de HR o MSA
- provider adapter de firma
- rendering de templates

## Acceptance Criteria

- [ ] existe una surface shared y reusable para documentos
- [ ] el access model queda explícito en `views` y/o `entitlements`
- [ ] HR y Finance/Legal pueden montar sus vistas sin reescribir la base UI

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- validación manual visual

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado

