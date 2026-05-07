# TASK-613 — Finance Clients Detail → Organization Workspace Convergence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-008`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-611, TASK-612`
- Branch: `task/TASK-613-finance-clients-organization-workspace-convergence`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Converger el detalle de `/finance/clients/[id]` al mismo Organization Workspace compartido, preservando compatibilidad con `clientProfileId` y con el runtime financiero actual. La meta no es borrar Finance Clients, sino convertirlo en un entrypoint financiero del mismo objeto organización.

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` §4.4 (entrypointContext='finance') + §9 (migration plan).

## Why This Task Exists

Hoy `Finance Clients` sigue siendo una surface aparte del objeto organización:

- usa `clientProfileId` como route key principal
- renderiza un detalle más pobre y finance-only
- no hereda enriquecimiento del Organization Workspace
- obliga a mantener layouts y contratos paralelos para la misma cuenta

El backend ya avanzó mucho hacia org-first con `TASK-181` y `TASK-191`, pero el detalle visible para usuario todavía no refleja ese cambio. Mientras eso siga así:

- la experiencia se siente inconsistente
- cada mejora de Organization 360 no llega automáticamente a Finance
- la identidad de la cuenta sigue partida entre organización y perfil financiero

## Goal

- Hacer que `/finance/clients/[id]` resuelva y monte el Organization Workspace compartido.
- Mantener `clientProfileId` como compat route key mientras exista deuda legacy.
- Mostrar el facet financiero como foco por defecto sin perder acceso a otras facets autorizadas.
- Preservar el contrato operativo de Finance mientras la experiencia converge.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` ← **spec canónico vinculante**
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `organizationId` es el anchor canónico de la experiencia; `clientProfileId` queda como bridge de compatibilidad.
- **El detail de Finance preserva las 4 secciones actuales** (Facturación, Contactos, Facturas, Deals) + KPIs (Por cobrar, Vencidas, Condiciones). NO se pierde nada al converger.
- La route `/finance/clients/[id]` sigue existiendo como entrypoint y no debe romper deep-links actuales.
- **Reusar `resolveFinanceClientContext()` existente** (`src/lib/finance/canonical.ts:142`) — NO crear segundo bridge.
- **Reusar `ensureOrganizationForClient()` existente** (`src/lib/account-360/organization-identity`) para casos legacy de profiles sin org.
- Toda resolución de identidad debe seguir siendo tenant-safe (cross-tenant isolation enforced en SQL del relationship-resolver de TASK-611).
- **Rollout flag mandatorio**: `organization_workspace_shell_finance` (independiente del de Agency).
- **Degraded path UI**: cuando `client_profile.organization_id IS NULL`, render mensaje accionable (NO crash, NO experiencia falsa parcial).

## Normative Docs

- `docs/tasks/in-progress/TASK-181-finance-clients-organization-canonical-source.md`
- `docs/tasks/in-progress/TASK-191-finance-organization-first-downstream-consumers-cutover.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-611`
- `TASK-612`
- `src/views/greenhouse/finance/ClientDetailView.tsx`
- `src/views/greenhouse/finance/ClientsListView.tsx`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/route.ts`
- `src/lib/finance/canonical.ts`

### Blocks / Impacts

- coherencia futura de directorios y entrypoints organization-first
- futuras convergencias de proveedores o otras vistas B2B
- simplificación de enriquecimiento cross-domain de cuentas

### Files owned

- `src/views/greenhouse/finance/ClientDetailView.tsx`
- `src/views/greenhouse/finance/ClientsListView.tsx`
- `src/app/(dashboard)/finance/clients/[id]/page.tsx`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/route.ts`
- `src/lib/finance/canonical.ts`

## Current Repo State

### Already exists (verified inventory 2026-05-07)

- `Finance Clients` ya lee org-first en runtime y expone `organizationId` de forma aditiva (TASK-181/191).
- `client_profiles.organization_id` ya es la FK fuerte del lado Finance.
- `OrganizationView` ya existe como workspace cross-domain más rico.
- **Bridge canónico activo**: `resolveFinanceClientContext({clientProfileId, ...})` en `src/lib/finance/canonical.ts:142` resuelve a `{clientId, clientProfileId, organizationId, spaceId, clientName, legalName, hubspotCompanyId}`.
- **Helper de creación on-demand**: `ensureOrganizationForClient()` ya importado en routes — para profiles legacy sin org.
- **Endpoint `/api/finance/clients/[id]`** ya retorna shape `{company, financialProfile, summary, invoices[], deals[]}` con `organizationId` en `financialProfile`.
- TASK-611 entrega `OrganizationWorkspaceProjection` con `entrypointContext='finance'` + `defaultFacet='finance'`.
- TASK-612 entrega `OrganizationWorkspaceShell` + `FacetContentRouter` + facet registry.

### Callers actuales de `/finance/clients/[id]` (Slice 0 inventory completed)

Bounded set — solo internos al módulo Finance:

| Caller               | Path                                                       | Tipo                                                                  |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Sidebar              | `src/components/layout/vertical/VerticalMenu.tsx`          | Navegación a `/finance/clients` (lista)                               |
| Lista row click      | `src/views/greenhouse/finance/ClientsListView.tsx:358`     | `router.push('/finance/clients/${row.original.clientProfileId}')`     |
| Back button (detail) | `src/views/greenhouse/finance/ClientDetailView.tsx:229,250`| `Link href="/finance/clients"`                                        |
| Global search        | `src/data/searchData.ts`                                   | Entry de búsqueda → `/finance/clients`                                |
| Reliability registry | `src/lib/reliability/registry.ts`                          | Module path "Clientes finanzas"                                       |
| ACL                  | `src/lib/admin/view-access-catalog.ts`                     | viewCode `finance.clients` registrado                                 |

**Sin callers externos** (agency, hr, admin, emails). Blast radius bajo. Migración no afecta deep-links cross-module.

### Riqueza actual del detail (a preservar 1:1)

**Route key**: `[id]` = `clientProfileId` hoy.

**KPIs** (top): Por cobrar | Vencidas (count) | Condiciones (días)

**Tabs**:

1. **Facturación** — Legal name, RUT, billing address, country, payment terms, currency, current PO #, current HES #, special conditions card.
2. **Contactos** — Finance contact list (name, email, phone, role) + add-contact CTA (requiere `organizationId`).
3. **Facturas** — Invoice history table (invoice #, date, due date, total, paid, pending, status chip).
4. **Deals** — HubSpot deals table (deal name, stage, pipeline, amount, close date).

**Action**: Add finance contact (drawer existente `AddMembershipDrawer`).

### Gap

- `/finance/clients/[id]` sigue renderizando una experiencia propia y más pobre.
- La route sigue anclada conceptualmente a `clientProfileId` (no a `organizationId`).
- No existe adopción del shell compartido ni del modelo facet-driven.
- Finance no hereda automáticamente el enriquecimiento de Organization 360.
- No existe reliability signal específico para `client_profiles.organization_id IS NULL` (cubierto por `identity.workspace_projection.unresolved_relations` de TASK-611 — verificar wiring).
- No existe degraded UI honesta para profiles sin org resuelta.

## Scope

### Slice 0 — Caller inventory + degraded path UX spec

- ✅ Inventory completado (sección "Callers actuales" arriba). Confirma blast radius bounded.
- Spec del mensaje degradado (cuando `client_profile.organization_id IS NULL`):
  - Copy en es-CL tuteo via skill `greenhouse-ux-writing` antes de implementar.
  - Acción accionable: link a "Vincular cliente a organización" (admin) o "Contactar a tu admin" (non-admin).
  - NO redirect silente. NO blank state. NO crash.
- Skill `greenhouse-ux-writing` valida el tono y el strings van a `src/lib/copy/` si son reusables.

### Slice 1 — `FinanceFacet` content extraction (preserva 4 tabs actuales)

- Crear `src/views/greenhouse/organizations/facets/FinanceFacet.tsx`.
- Mover los 4 tabs actuales (Facturación / Contactos / Facturas / Deals) + KPI strip (Por cobrar / Vencidas / Condiciones).
- Mantener intacto: `AddMembershipDrawer`, helpers `loadFinanceClientContactOptions`, queries existentes.
- El facet recibe `FacetContentProps = { organizationId, entrypointContext, relationship }` — internamente usa `resolveFinanceClientContext({organizationId})` para resolver el `clientProfileId` cuando lo necesita para queries específicas.
- Cero pérdida funcional verificada por screenshot diff.

### Slice 2 — Identity bridge en `/finance/clients/[id]/page.tsx`

- Adaptar `src/app/(dashboard)/finance/clients/[id]/page.tsx`:
  1. Resolver `[id]` via `resolveFinanceClientContext({clientProfileId: id})` (acepta también organizationId si emerge).
  2. Si `result.organizationId === null` → render shell con `degradedMode=true` + mensaje accionable (Slice 0).
  3. Si resolved → invocar `resolveOrganizationWorkspaceProjection({subject, organizationId, entrypointContext: 'finance'})`.
  4. Si rollout flag `organization_workspace_shell_finance` enabled → render `<OrganizationWorkspaceShell>` con `defaultFacet='finance'`.
  5. Si flag disabled → render `<ClientDetailView>` legacy (back-compat).
- Preservar `requireServerSession` + `export const dynamic = 'force-dynamic'`.
- Deep-links preservados: `/finance/clients/[id]` sigue siendo válida con cualquier valor en `[id]` que `resolveFinanceClientContext` pueda resolver.

### Slice 3 — Reliability signals wiring

- Verificar que `identity.workspace_projection.unresolved_relations` (TASK-611) cuenta correctamente los `client_profiles WHERE organization_id IS NULL` con tráfico reciente en `/finance/clients/[id]`.
- Si emerge necesidad de signal específico finance, crear `finance.client_profile.unlinked_organizations` (kind=`data_quality`, severity=`error` si > 0 sostenido > 7d, subsystem `Finance Data Quality`).
- Reader en `src/lib/reliability/queries/finance-client-profile-unlinked.ts`.

### Slice 4 — Rollout flag + cutover

- Si `feature_rollout_flags` materialized → consumir directo.
- Si no → migration que extiende `home_rollout_flags.flag_key` CHECK para incluir `'organization_workspace_shell_finance'`.
- Reader: `isOrganizationWorkspaceShellEnabledForSubject(subject, 'finance')`.
- Rollout sequence (post TASK-612 rollout completo):
  1. Internal dogfood (Efeonce admins + finance team), 1 día.
  2. Tenant rollout per-role: `finance_admin` → `finance_member` → `efeonce_admin`, 1 semana.
  3. Default global enabled tras soak.
  4. V1 retirement (60+ días): borrar `ClientDetailView` legacy.

### Slice 5 — Compatibility hardening

- `ClientsListView.tsx:358` sigue usando `clientProfileId` en URL — verificar resolver acepta este shape.
- Drawers que navegan desde `clientProfileId` no se rompen — el resolver normaliza.
- Si emerge un caller futuro que use `organizationId` directo en URL, el resolver lo acepta sin cambio.
- NO romper el endpoint `/api/finance/clients/[id]` — sigue retornando el shape `{company, financialProfile, summary, invoices, deals}` para consumers existentes.

### Slice 6 — Tests + Playwright + downstream-verified

- Unit tests del resolver bridge (matriz: clientProfileId válido, organizationId válido, profile sin org, ID inexistente, cross-tenant).
- Unit tests del FinanceFacet con snapshot per relationship type.
- Playwright `tests/e2e/smoke/finance-clients-detail-convergence.spec.ts` con storage state agente:
  - assert que ambos paths (legacy + shell) renderizan los mismos KPIs y tabs.
  - assert deep-link `/finance/clients/<clientProfileId>` funciona post-migration.
  - assert degraded path muestra mensaje accionable.
- Commit message: `[downstream-verified: finance-clients-detail-convergence]`.

### Slice 7 — Docs + 4-pillar score

- Actualizar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con Delta `2026-MM-DD — TASK-613` enlazando spec V1.
- Doc funcional `docs/documentation/finance/clientes-finanzas.md` actualizado con la convergencia.
- Manual de uso `docs/manual-de-uso/finance/clientes-detalle.md` si emerge necesidad.
- 4-pillar score block en este task file.

## Out of Scope

- Reescribir el listado completo de `/finance/clients` como directory organization-first unificado.
- Eliminar `clientProfileId` del runtime entero.
- Converger proveedores en esta misma task.

## Detailed Spec

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`.

La semántica esperada es:

- `Finance Clients` sigue siendo una vista válida para usuarios financieros.
- Su detail ya no es un objeto aparte, sino una proyección financiera del mismo Organization Workspace.

Cuando el caller entra por `/finance/clients/[id]`, el sistema debe:

1. Resolver identidad canónica via `resolveFinanceClientContext({clientProfileId: id})`.
2. Si `organizationId` no resuelve → render shell en `degradedMode` con mensaje accionable.
3. Si resolved → resolver `OrganizationWorkspaceProjection` con `entrypointContext='finance'`, `defaultFacet='finance'`.
4. Montar el shell compartido (TASK-612).
5. Habilitar otras facets si los entitlements lo permiten (e.g. delivery, team, identity para usuarios cross-domain).

### Riqueza Finance preservada (contrato 1:1)

Lo que el `FinanceFacet` DEBE renderizar (mismo contenido que `ClientDetailView` legacy):

| Surface               | Componente origen                 | Notas                                            |
| --------------------- | --------------------------------- | ------------------------------------------------ |
| KPI: Por cobrar       | `ClientDetailView` summary row    | `summary.totalReceivable`                        |
| KPI: Vencidas         | `ClientDetailView` summary row    | `summary.overdueInvoicesCount`                   |
| KPI: Condiciones      | `ClientDetailView` summary row    | `financialProfile.paymentTermsDays`              |
| Tab: Facturación      | Tab visible actual                | Legal name, RUT, billing, payment terms          |
| Tab: Contactos        | Tab visible actual                | Lista + add CTA (`AddMembershipDrawer` reused)   |
| Tab: Facturas         | Tab visible actual                | Invoice history table                            |
| Tab: Deals            | Tab visible actual                | HubSpot deals table                              |

V1 NO agrega: payment_orders, expenses, reconciliation, OTB, factoring, withholdings, FX exposure, account_balances. Esos son extensiones V1.1+ — abrir TASK-### derivadas.

### Degraded path UI (canónico)

Cuando `client_profile.organization_id IS NULL`:

- Shell renderiza header con datos del `client_profile` (sin enrichment 360).
- En lugar de tabs, render `<DegradedWorkspaceState reason="missing_organization">` con:
  - Mensaje en es-CL tuteo (validado por skill `greenhouse-ux-writing`).
  - CTA explícita según rol del subject:
    - admin: "Vincular este cliente a una organización" → drawer de bridge manual.
    - non-admin: "Pídele a tu admin que vincule este cliente a una organización".
  - Reliability signal `identity.workspace_projection.unresolved_relations` cuenta este caso.
- Para perfiles que SÍ tienen org pero el subject NO tiene relación válida (`relationship.kind === 'no_relation'` o `unrelated_internal`): mensaje distinto: "No tienes acceso al detalle de este cliente. Solicita acceso a tu admin si crees que es un error."

## 4-Pillar Score

### Safety

- **Authorization granular**: subject DEBE tener `organization.finance:read` con scope válido + relationship efectiva. Sin ambos → `degradedMode` + mensaje "Sin acceso".
- **Cross-tenant isolation**: enforced en SQL del relationship-resolver (TASK-611). Path Finance entra por mismo canal que Agency — sin shortcuts.
- **Server-only**: page resuelve identity + projection en RSC. Cliente recibe sólo facets autorizados.
- **Blast radius**: rollout flag scope precedence permite revert per-user. Caller inventory bounded (sin callers externos al módulo Finance).
- **Verified by**: matriz personas test (TASK-611), Playwright deep-link smoke, cross-tenant isolation test del resolver.
- **Residual risk**: profiles legacy sin org → degraded path (cuantificado por reliability signal). Aceptado en V1.

### Robustness

- **Idempotency**: `resolveFinanceClientContext` y projection son pure functions con cache. Re-render del mismo URL produce mismo output.
- **Atomicity**: bridge resolution es read-only; no mutación atómica involucrada en V1.
- **Race protection**: `client_profiles.organization_id` FK enforced; resolver hace single PG query con CTEs (no race window).
- **Constraint coverage**: FK `client_profiles.organization_id → organizations.organization_id` ya existente; UNIQUE composite del relationship-resolver (TASK-611).
- **Bad input**: `[id]` inválido → `resolveFinanceClientContext` retorna null → degraded path. NUNCA crash.
- **Verified by**: unit tests del resolver con 5+ shapes de input (clientProfileId/organizationId/inválido/cross-tenant/null).

### Resilience

- **Retry policy**: read-only path. Cache de projection (TASK-611) absorbe ráfagas.
- **Dead letter**: N/A.
- **Reliability signals**: `identity.workspace_projection.unresolved_relations` (TASK-611) detecta profiles sin org. Opcionalmente `finance.client_profile.unlinked_organizations` específico.
- **Audit trail**: TASK-404 cubre grants. Bridge resolution NO requiere audit (read-only).
- **Recovery**: si bridge falla → degraded path. Si projection falla → degraded path. Si shell falla → flag override per-user revert sin redeploy.
- **Degradación honesta**: 3 estados explícitos (`success` | `degraded_no_org` | `degraded_no_access`) con mensajes distintos.

### Scalability

- **Hot path Big-O**: O(log n) bridge lookup (FK indexed) + O(log n) relationship resolver + O(1) cached projection.
- **Index coverage**: `client_profiles(organization_id)`, `client_profiles(client_profile_id)` UNIQUE, indexes de TASK-611.
- **Async paths**: ningún side effect bloquea page render. Cache invalidation reactiva via outbox.
- **Cost at 10x**: linear. Same hot path que Agency — comparten infra.
- **Pagination**: detail (no aplica). Lista `/finance/clients` queda fuera de scope V1.
- **Verified by**: `EXPLAIN ANALYZE` del bridge query, Lighthouse score post-migration, p99 latency budget < 250ms server-side.

## Acceptance Criteria

- [ ] `/finance/clients/[id]` monta `<OrganizationWorkspaceShell>` con `entrypointContext='finance'` + `defaultFacet='finance'` cuando el profile resuelve organización Y el rollout flag está enabled.
- [ ] `FinanceFacet` preserva 1:1 las 4 secciones actuales (Facturación / Contactos / Facturas / Deals) + 3 KPIs (Por cobrar / Vencidas / Condiciones) — verificado por screenshot diff.
- [ ] La navegación basada en `clientProfileId` sigue funcionando durante la transición (deep-links preservados).
- [ ] El resolver canónico `resolveFinanceClientContext` se reusa — NO se crea bridge paralelo.
- [ ] Degraded path UI implementado para 2 casos: (a) `organization_id IS NULL`, (b) subject sin relación válida. Mensajes en es-CL tuteo validados por skill `greenhouse-ux-writing`.
- [ ] Rollout flag `organization_workspace_shell_finance` declarado y consumible.
- [ ] Reliability signal `identity.workspace_projection.unresolved_relations` (TASK-611) cuenta correctamente los profiles sin org. Si emerge necesidad, signal específico finance creado.
- [ ] Playwright smoke pasa con storage state agente para 3 paths: success / degraded_no_org / degraded_no_access.
- [ ] Commit con marker `[downstream-verified: finance-clients-detail-convergence]`.
- [ ] 4-pillar score block presente en este task file.
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` actualizado con Delta enlazando spec V1.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Playwright `tests/e2e/smoke/finance-clients-detail-convergence.spec.ts`
- Validación manual en `/finance/clients` (lista) → click row → `/finance/clients/[id]` (detail) con flag enabled vs disabled
- Test de deep-link directo: `https://dev-greenhouse.efeoncepro.com/finance/clients/<clientProfileId>` resuelve y renderiza correctamente
- Test del path degradado: profile legacy sin org → mensaje accionable visible

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` y/o doc funcional de clientes quedó alineado con el detail convergido

## Follow-ups

- directory/list convergence de `Finance Clients`
- convergencia equivalente para suppliers si el programa organization-first se extiende al lado vendor
