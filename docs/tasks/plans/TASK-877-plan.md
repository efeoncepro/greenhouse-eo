# Plan — TASK-877 Workforce Activation External Identity Reconciliation

## Discovery summary

- Task tomada en `develop` por instruccion explicita del usuario; no se creo branch aunque el protocolo canonico sugiera `task/TASK-877-workforce-identity-reconciliation`.
- No hay PR ni branch abierto para TASK-877. PRs abiertos existentes no pisan identity/workforce.
- Workforce Activation ya existe como workspace HR en `/hr/workforce/activation`, view `equipo.workforce_activation`, routeGroup `hr`, capability `workforce.member.activation_readiness.read`, remediation drawer y queue `includeReadiness`.
- Identity Reconciliation ya tiene primitives para `notion`, `hubspot_crm`, `azure_ad`: discovery Notion desde BQ, matching, proposals, apply dual-write y eventos `identity.reconciliation.*` / `identity.profile.linked`.
- Runtime live verificado: `pnpm pg:doctor` sano; `identity_profile_source_links` tiene 8 links Notion activos, 0 duplicates activos por Notion ID, 2 proposals pending; no hay members pending intake live ahora.
- Dry-run `pnpm exec tsx scripts/run-identity-reconciliation.ts --dry-run`: `discovered=0`, `errors=0`.
- `NOTION_TOKEN` local existe y `GET https://api.notion.com/v1/users?page_size=1` responde 200, por lo tanto hay base tecnica para fallback read-only via Notion users.list.

## Drift / corrections

- `docs/tasks/TASK_ID_REGISTRY.md` seguia apuntando TASK-877 a `to-do`; se sincronizo a `in-progress`.
- No existen lane ni blocker codes externos en readiness.
- `reassign` en admin identity reconciliation solo cambia `candidateMemberId`; no resuelve `candidateProfileId` desde el member destino.
- `applyIdentityLink()` no aplica conflict check global por active source object antes de escribir.
- `sync-notion-conformed.ts` aun usa BigQuery `greenhouse.team_members.notion_user_id` como primary mapping.
- No hay capability granular para resolver external identity desde Workforce Activation ni para aprobar/reasignar reconciliation con least privilege.

## Open questions resolved

- Policy Notion required: V1 exige Notion solo para members activos o en activacion que sean `assignable=true` y tengan exposicion operacional interna. Excluye casos `identity_only`, no asignables y perfiles sin trabajo operativo. La policy vive en helper canonico code-versioned, no hardcode por persona.
- Notion read-only fallback: usar API oficial `users.list` detras de helper server-only gated por `NOTION_TOKEN`; si falta token o falla API, readiness degradea a `notion_discovery_unavailable` con retry/manual review, sin pedir UUID manual.
- Auto-link V1: no aplicar auto-link desde Workforce Activation. Mantener dry-run/candidatos + aprobacion humana auditada. El auto-link existente del cron queda fuera del flujo HR normal hasta que signals de ambiguity/conflict/drift esten operativos.

## Access model

- `routeGroups`: `hr` conserva la surface primaria.
- `views`: `equipo.workforce_activation` sigue siendo la surface visible; se agregan bindings de capabilities nuevas.
- `entitlements`: agregar capabilities finas para discovery/review/approve/reassign/reject de external identity. Reutilizar `identity.reconciliation.*` donde el nombre sea compartido; agregar `workforce.member.external_identity.resolve` para el contexto HR.
- `startup policy`: sin cambios.

## Architecture decision

- ADR requerido: si la implementacion cambia el contrato source-of-truth/proyeccion de Notion identity mapping, debe documentarse como decision en `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md` o `GREENHOUSE_INTERNAL_IDENTITY_V1.md` y enlazarse desde `DECISIONS_INDEX.md`.
- Decision propuesta: Postgres `identity_profile_source_links` es primary read para Notion member mapping; `members.notion_user_id` y BigQuery `team_members.notion_user_id` quedan como projection/fallback.

## Skills

- `greenhouse-agent`: dominio Greenhouse, Next/App Router, UI/runtime alignment.
- `greenhouse-task-planner`: lifecycle, task plan y documentacion de task.
- `greenhouse-ux-content-accessibility`: Slice 4 copy/UX visible en drawer de resolucion.
- No se requiere `codex-security:*` salvo que el review de permisos encuentre un hallazgo security-specific durante implementation.

## Subagent strategy

- Discovery uso dos explorers independientes: uno de code/runtime y otro de docs/schema. Ambos solo leyeron.
- Implementacion propuesta secuencial por el agente principal: los slices estan acoplados por types/access/API/UI y no conviene dividir write scopes sin plan aprobado.

## Execution order

1. Migraciones: capabilities registry + view-capability binding para `equipo.workforce_activation`; posible unique partial index o guard SQL si el conflict check requiere enforce DB.
2. Tipos / contratos: extender readiness types con lane `operational_integrations`, Notion blocker codes y external identity snapshot/candidates.
3. Queries / readers / helpers: crear policy `resolveWorkforceExternalIdentityRequirements`, member-scoped Notion reconciliation dry-run, Notion users.list fallback, conflict checker, candidate profile resolver.
4. API routes / handlers / workers: endpoints HR member-scoped para discovery/list/resolve; endurecer admin resolve route para `candidateProfileId` + conflict checks; preservar admin governance global.
5. Events / publishers / consumers: reutilizar `identity.reconciliation.approved/rejected` y `identity.profile.linked`; agregar payload context `workforceActivationContext` y eventos conflict/rejected si no existe equivalente suficiente.
6. Reliability signals / observability / lint rules: backlog de required external identities, ambiguous/conflict, PG/BQ mirror drift, discovery unavailable.
7. UI / views / pages: integrar lane y drawer de Notion dentro del inspector/remediation drawer; estados fuertes/multiples/sin candidatos/conflict/unavailable/insufficient permissions; sin input UUID manual.
8. Docs / handoff / changelog / arquitectura: actualizar task, README/registry, handoff, changelog, docs HR/identity/manual y ADR/index si el cutover Postgres-first se materializa.
9. Verificacion: focused unit tests, access tests, UI tests, `pnpm pg:doctor`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` segun costo, `pnpm fe:capture` staging/manual, dry-run reconciliation y smoke synthetic/fixture sin Felipe/Maria.

## Files to create

- `src/lib/workforce/activation/external-identity-policy.ts`
- `src/lib/identity/reconciliation/member-scoped.ts`
- `src/lib/identity/reconciliation/notion-users.ts`
- `src/lib/identity/reconciliation/conflicts.ts`
- `src/app/api/hr/workforce/members/[memberId]/external-identity/notion/route.ts`
- `src/lib/reliability/queries/identity-external-links.ts`
- `docs/tasks/plans/TASK-877-plan.md`

## Files to modify

- `src/lib/workforce/activation/types.ts`
- `src/lib/workforce/activation/readiness.ts`
- `src/lib/workforce/intake-queue/list-pending-members.ts`
- `src/views/greenhouse/admin/workforce-activation/*`
- `src/lib/identity/reconciliation/*`
- `src/app/api/admin/identity/reconciliation/[proposalId]/resolve/route.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/admin/entitlement-view-map.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/copy/workforce.ts` and/or `src/lib/copy/identity.ts`
- docs under `docs/documentation/hr`, `docs/documentation/identity`, `docs/manual-de-uso/hr`, `changelog.md`, `Handoff.md`

## Risk flags

- Wrong Notion link corrupts delivery/ICO attribution. Mitigate with no HR auto-link, evidence display, conflict check and audit.
- Dual-write/mirror can drift. Mitigate with PG-first read + BQ fallback + drift signal.
- Permissions are cross-plane. Mitigate with view + capabilities and 403 tests.
- Notion API availability is external. Mitigate with degraded lane and retry, not UUID manual input.

## Open questions

- None blocking after Discovery. Implementation requires checkpoint approval because task is P1 / Effort Alto.

## Implementation close-out 2026-05-14

- Delivered on `develop` per user-directed branch exception.
- Actual entitlement module for `identity.reconciliation.*` is `organization`, because runtime `EntitlementModule` does not include `identity`; action for reject/dismiss is `update`, because runtime `EntitlementAction` does not include `reject`.
- Created helpers: `external-identity-policy.ts`, `notion-users.ts`, `member-scoped.ts`, `notion-member-map.ts`.
- Did not create separate `conflicts.ts` or `identity-external-links.ts`; conflict checks and signals stayed closer to existing reconciliation/reliability modules to reduce surface area.
- Architecture decision recorded in `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md` and `DECISIONS_INDEX.md`: external identity source links are Postgres-first via `identity_profile_source_links`, with member/BigQuery columns as projections/fallback.
- Verification: `pg:connect:migrate`, `pg:doctor`, `tsc`, `design:lint`, `lint`, focused Vitest, `build`.
