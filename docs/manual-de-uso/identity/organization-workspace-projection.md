# Organization Workspace Projection — operación

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-08 por Claude (TASK-611)
> **Ultima actualizacion:** 2026-05-08 por Claude
> **Modulo:** Identidad y acceso
> **Rutas en portal:** `/admin/operations` (signals), `/admin/users/[id]/access` (overrides), `/admin/governance/access` (defaults por rol)
> **Documentacion relacionada:** [Sistema de Identidad, Roles y Acceso — sección Facets de Organization Workspace](../../documentation/identity/sistema-identidad-roles-acceso.md), [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md)

## Para que sirve

Este manual sirve para que un admin Greenhouse opere y supervise la capa canonica que decide **que ve cada usuario cuando entra al detalle de una organizacion** (cliente B2B). Esa decision se compone de tres dimensiones:

1. La **relacion** que tiene el usuario con esa organizacion (admin, asignado, contacto del cliente, interno sin relacion, sin relacion).
2. Las **capabilities** finas (`organization.<facet>.<action>`) que su rol o sus overrides personales le otorgan.
3. El **entrypoint** desde donde entra (Agency, Finance, Admin o portal cliente) — define la pestaña por defecto y los KPI base.

Esta foundation es lo que permite que `/agency/organizations/[id]` y `/finance/clients/[id]` (TASK-612 y TASK-613) muestren contenido coherente sin checks duplicados por modulo.

> Hoy esta capa **no tiene UI consumer todavia** (lo agregan TASK-612 y TASK-613). El admin la usa principalmente para supervisar reliability signals y revisar overrides de capabilities desde Admin Center.

## Antes de empezar

Necesitas:

- Acceso admin a Greenhouse (`efeonce_admin`).
- Acceso a `/admin/operations` para revisar signals.
- Acceso a `/admin/governance/access` para revisar defaults por rol.
- Acceso a `/admin/users/[id]/access` para revisar overrides personales.
- Para chequeos contra DB: GCP/psql disponible (`pnpm pg:connect:shell` levanta el proxy).

> Si no eres admin: este manual **no aplica** a tu trabajo diario. Cuando entras a una organizacion como `client_executive` o `efeonce_operations`, el sistema decide automaticamente que ves. No necesitas saber nada de capabilities — solo entras y trabajas.

## Las 5 relaciones canonicas

Cuando un usuario entra al detalle de una organizacion, el sistema lo clasifica en una de estas 5 categorias:

| Relacion | Quien cae aqui | Que ve |
|---|---|---|
| **`internal_admin`** | rol `efeonce_admin` | las 9 pestañas, todas las acciones, incluyendo datos sensibles |
| **`assigned_member`** | tiene `client_team_assignments` activo para esta org via spaces | lo que su rol permite a scope `tenant` (no datos sensibles salvo grant explicito) |
| **`client_portal_user`** | es del portal cliente y su `client_id` mapea a esta org via spaces | lo que su rol permite a scope `own` — solo de su propia org |
| **`unrelated_internal`** | interno Efeonce sin admin ni assignment | nada — workspace vacio con mensaje "Sin relacion con esta organizacion" |
| **`no_relation`** | base case (cualquier otro) | nada |

**Regla critica de cross-tenant isolation**: un usuario `tenant_type='client'` NUNCA puede ver una organizacion que no sea la propia, aunque tenga capability `organization.<facet>:read`. La relacion es el outer gate; las capabilities filtran dentro de la relacion ya autorizada.

## Las 11 capabilities `organization.*`

| Capability | Acciones | Que controla |
|---|---|---|
| `organization.identity` | `read` | Datos basicos: nombre, dominio, status comercial, logo |
| `organization.identity_sensitive` | `read`, `update` | PII + identidad legal: RUT, direccion legal, beneficiarios |
| `organization.spaces` | `read` | Spaces operativos (Notion) asociados |
| `organization.team` | `read` | Roster + assignments del cliente |
| `organization.economics` | `read` | KPIs economicos: ICO, contribution margin, P&L summary |
| `organization.delivery` | `read` | Tasks, projects, sprints, ICO score |
| `organization.finance` | `read` | Income, expenses, payment_orders, FX, balances |
| `organization.finance_sensitive` | `read`, `export`, `approve` | Documentos fiscales, evidence, OTB declarations |
| `organization.crm` | `read` | Contacts, deals, HubSpot pipeline |
| `organization.services` | `read`, `update` | Service engagements + catalogo `p_services` |
| `organization.staff_aug` | `read`, `update` | Staff augmentation arrangements |

**Quien las recibe automaticamente** (sin override):

- `efeonce_admin` → 11 capabilities a scope `all` (incluyendo `*_sensitive`).
- `route_group=internal` (sin admin) → 7 facets non-sensitive a scope `tenant`: identity, spaces, team, delivery, crm, services, staff_aug. **No tienen** economics, finance, ni *_sensitive.
- `route_group=finance` (sin admin) → suma economics + finance a scope `tenant`. **No tienen** finance_sensitive.
- `tenant_type=client` → 4 facets (identity, team, delivery, services) a scope `own`. Solo en su propia org.

Las capabilities sensibles (`*_sensitive`) **nunca se otorgan automaticamente** a roles no-admin. Requieren override explicito desde Admin Center.

## Operacion 1 — Revisar reliability signals

Las 2 nuevas signals viven bajo subsystem **`Identity & Access`** en `/admin/operations`.

### Signal `identity.workspace_projection.facet_view_drift`

**Que mide**: drift estructural entre el mapping `FACET_TO_VIEW_CODE` (TS) y el `VIEW_REGISTRY` canonico. Si alguien renombra un viewCode en `view-access-catalog.ts` pero olvida actualizar el mapping, esta signal se prende.

**Estado esperado**: 0 (`ok`).

**Que hacer si > 0** (`warning`):

1. Abre `/admin/operations` y haz click en la signal — ves la lista de facets con viewCodes huerfanos.
2. Decide: ¿el viewCode fue renombrado o eliminado?
   - **Renombrado**: actualizar `src/lib/organization-workspace/facet-view-mapping.ts` con el nuevo viewCode.
   - **Eliminado**: si el viewCode ya no aplica al facet, decidir un reemplazo (consultar al equipo dueño del modulo).
3. Hacer commit + PR. La signal se reevalua al proximo deploy.

**No hacer**: editar manualmente el `VIEW_REGISTRY` para que matchee — el registry es la SoT, el mapping debe seguirlo.

### Signal `identity.workspace_projection.unresolved_relations`

**Que mide**: cantidad de `client_users` activos con `tenant_type='client'` que NO resolveran a ninguna organizacion via spaces. Dos casos:

- `missing_client_id`: usuario activo sin `client_id` (huerfano puro).
- `client_id_without_org_bridge`: usuario activo cuyo `client_id` no tiene un `space` activo con `organization_id`.

**Estado esperado**: 0 (`ok`).

**Que hacer si > 0** (`error`, especialmente sostenido > 7 dias):

1. Identificar los usuarios afectados con SQL:

   ```sql
   -- missing client_id
   SELECT user_id, email, full_name
   FROM greenhouse_core.client_users
   WHERE tenant_type = 'client' AND active = TRUE AND client_id IS NULL;

   -- client_id sin space bridge
   SELECT cu.user_id, cu.email, cu.client_id, c.client_name
   FROM greenhouse_core.client_users cu
   LEFT JOIN greenhouse_core.clients c ON c.client_id = cu.client_id
   WHERE cu.tenant_type = 'client' AND cu.active = TRUE
     AND cu.client_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM greenhouse_core.spaces s
       WHERE s.client_id = cu.client_id
         AND s.organization_id IS NOT NULL
         AND s.active = TRUE
     );
   ```

2. Decidir caso por caso:
   - Usuario legacy sin proyecto activo → desactivar (`active=FALSE`).
   - Usuario que deberia estar asignado → asignar `client_id` al cliente correcto.
   - Cliente sin space activo con organization_id → crear/activar el space (consultar admin del cliente).

3. Confirmar que la signal vuelve a 0 en `/admin/operations` (refresca cada minuto aprox).

**No hacer**: borrar `client_users` directamente en SQL — usar el flow de desactivacion oficial (`POST /api/admin/users/[id]/deactivate`) que dispara los outbox events necesarios.

## Operacion 2 — Otorgar override personal (futuro Admin Center)

> Hoy bloqueado por **ISSUE-068**: las governance tables de TASK-404 (`role_entitlement_defaults`, `user_entitlement_overrides`, `entitlement_governance_audit_log`) nunca fueron creadas en PG por un pre-up-marker bug en migration `20260417044741101`. Cuando se resuelva, este flow se desbloquea.

Cuando un admin necesita darle a un usuario una capability `*_sensitive` que su rol no incluye automaticamente:

1. Abre `/admin/users/[user-id]/access` (Admin Center).
2. Localiza la seccion "Overrides personales".
3. Agrega override: `capability=organization.finance_sensitive`, `action=read`, `scope=tenant`, `effect=grant`, `reason="<razon>"`.
4. Si la capability tiene approval workflow (sensitive), un segundo admin debe aprobar antes que el grant se aplique.
5. El cache de la projection se invalida automaticamente en pocos segundos via outbox event `access.entitlement_user_override_changed`.

## Operacion 3 — Agregar una capability nueva al sistema

Esta es una tarea de developer + admin (requiere migration + commit). Pasos:

1. Agregar entry en `src/config/entitlements-catalog.ts` (TS catalog — SSOT runtime).
2. Crear migration con `pnpm migrate:create task-XXX-capability-nombre`.
3. En la migration, `INSERT INTO greenhouse_core.capabilities_registry (...) ON CONFLICT DO NOTHING`.
4. Aplicar `pnpm pg:connect:migrate` + regenerar tipos.
5. Si la capability gobierna un facet del Organization Workspace, actualizar `FACET_TO_CAPABILITY_KEY` en `src/lib/organization-workspace/facet-capability-mapping.ts`.
6. Commit + PR.

**Disciplina dura**: la TS↔DB parity test runtime detecta drift al proximo CI. Si la migration falta o tiene module/actions distintos al TS catalog, el build rompe.

## Operacion 4 — Diagnostico de "no veo lo que esperaba"

Cuando un usuario reporta "entro a la organizacion X y no veo la pestaña Y":

1. Identificar al usuario y la organizacion: `userId`, `organizationId`, `entrypointContext` (agency/finance/admin/client_portal).
2. Verificar la relacion (correr esta query en `pnpm pg:connect:shell`):

   ```sql
   -- ¿El usuario es admin?
   SELECT 1 FROM greenhouse_core.user_role_assignments
   WHERE user_id = '<userId>' AND role_code = 'efeonce_admin'
     AND COALESCE(active, TRUE) = TRUE
     AND (effective_to IS NULL OR effective_to > now());

   -- ¿Tiene assignment a un cliente que mapea a esta org?
   SELECT cta.assignment_id, cta.client_id, cta.role_title_override, cta.start_date, cta.end_date
   FROM greenhouse_core.client_team_assignments cta
   JOIN greenhouse_core.client_users cu ON cu.member_id = cta.member_id
   JOIN greenhouse_core.spaces s ON s.client_id = cta.client_id AND s.organization_id = '<organizationId>'
   WHERE cu.user_id = '<userId>'
     AND COALESCE(cta.active, TRUE) = TRUE
     AND s.active = TRUE
     AND (cta.start_date IS NULL OR cta.start_date <= CURRENT_DATE)
     AND (cta.end_date   IS NULL OR cta.end_date   >= CURRENT_DATE);

   -- ¿Es contacto del cliente?
   SELECT cu.client_id
   FROM greenhouse_core.client_users cu
   JOIN greenhouse_core.spaces s ON s.client_id = cu.client_id AND s.organization_id = '<organizationId>'
   WHERE cu.user_id = '<userId>' AND cu.tenant_type = 'client'
     AND COALESCE(cu.active, TRUE) = TRUE AND s.active = TRUE;
   ```

3. Si la relacion existe pero el facet sigue invisible: revisar si el rol del usuario tiene la capability fina correspondiente. Hoy no hay UI para esto — consultar el catalog en `src/config/entitlements-catalog.ts` + el mapping en `src/lib/entitlements/runtime.ts` (la funcion `getTenantEntitlements`).

4. Si todo se ve bien y el facet sigue oculto: invalidar cache forzando re-render (refresh de pagina). El TTL natural es 30s.

## Que NO hacer

- **No edites la projection en cliente**. La projection es server-only por construccion. Cualquier override en cliente es bug — el contrato lo bloquea via lint rule `greenhouse/no-inline-facet-visibility-check`.
- **No agregues una capability nueva en TS sin migration que la seede en `capabilities_registry`**. La parity test rompe el build.
- **No borres rows de `capabilities_registry` para limpiar drift**. Marcar `deprecated_at` en su lugar (el registro queda para auditoria de grants historicos).
- **No mezcles `entrypointContext` con `scope`**. Entrypoint = presentacion (default tab, copy es-CL). Scope = autorizacion (own/tenant/all). Confundirlas lleva a drift dificil de debuggear.
- **No materialices la projection en BQ/PG**. Es read-light (TTL 30s). Si emerge necesidad de listar 100+ orgs con projection per-row, abrir TASK derivada para `accessLevel` summary endpoint.
- **No catch+swallow errores en este path**. Use `captureWithDomain(err, 'identity', { tags: { source: 'workspace_projection_*' } })`.

## Problemas comunes

### "El admin ve el facet pero el operations team member no"

Esperado. `efeonce_admin` tiene grant a las 11 capabilities. `efeonce_operations` solo tiene 7 facets non-sensitive (no `economics`, no `finance`, no `*_sensitive`). Si el operator necesita acceso, agregar override desde Admin Center con razon documentada.

### "Cambie el rol del usuario y el portal sigue mostrando lo anterior"

Cache TTL natural de 30s. Si pasa mas tiempo, verificar:

- `pnpm pg:doctor` — DB sano?
- Revisar Sentry filtrado por `domain=identity` — ¿hubo error en el cache invalidation consumer?
- `/admin/operations` — la signal `Reactive consumer dead-letter` para el path Identity, ¿esta en 0?

### "ISSUE-068 dice que TASK-404 governance tables nunca se crearon"

Confirmado. El runtime de Greenhouse es pure-function y compone capabilities desde `(roleCodes, routeGroups, authorizedViews)` en cada request — no depende de las governance tables. Por eso el portal funciona hoy. **El gap real**: cualquier override personal o default por rol que un admin escriba desde Admin Center cae al vacio (no hay tabla destino). Cleanup queda como TASK derivada P2 — ver el issue para el plan de resolucion.

### "Una capability `organization.<X>` aparece en CI parity test como missing"

El TS catalog gano una capability nueva pero no hay migration que la seede en `capabilities_registry`. Acciones:

1. Identificar la capability faltante en el output del test.
2. `pnpm migrate:create task-XXX-add-organization-X-capability`.
3. INSERT INTO en la migration, ON CONFLICT DO NOTHING.
4. Aplicar + commit junto al cambio en TS.

> **Detalle tecnico:** El helper canonico es [`resolveOrganizationWorkspaceProjection`](../../../src/lib/organization-workspace/projection.ts). El relationship resolver: [`relationship-resolver.ts`](../../../src/lib/organization-workspace/relationship-resolver.ts). El registry helper + parity test: [`src/lib/capabilities-registry/parity.ts`](../../../src/lib/capabilities-registry/parity.ts). Spec canonica: [`GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md). ISSUE asociado: [`ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md`](../../issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md).

## En resumen

- 5 relaciones canonicas (admin / asignado / contacto cliente / interno sin relacion / sin relacion) gating outer.
- 11 capabilities `organization.<facet>.<action>` con scope (own/tenant/all) gating fino.
- 4 entrypoints (agency/finance/admin/client_portal) deciden default tab + copy.
- Cache TTL 30s, invalidacion reactiva via outbox.
- 2 reliability signals operator-facing en `/admin/operations` bajo subsystem `Identity & Access`.
- Foundation P1 entregada por TASK-611 — TASK-612/613 traen la UI consumer.
