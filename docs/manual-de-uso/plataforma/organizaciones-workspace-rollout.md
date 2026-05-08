# Organization Workspace — rollout y operación

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-08 por Claude (TASK-612)
> **Ultima actualizacion:** 2026-05-08 por Claude
> **Modulo:** Plataforma + Identity (rollout admin)
> **Rutas en portal:** `/admin/governance/access` (flags), `/agency/organizations/[id]` (workspace), `/admin/operations` (signals)
> **Documentacion relacionada:** [Organizaciones — Workspace compartido](../../documentation/agency/organizaciones-workspace.md), [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md)

## Para que sirve

Este manual sirve para que un admin Greenhouse active progresivamente el nuevo Organization Workspace shell en `/agency/organizations/[id]` sin afectar usuarios, supervise el rollout y revierta si emerge un issue.

El workspace nuevo (TASK-612) reemplaza la vista legacy con un shell compartido + 9 pestañas canónicas. Está detrás de un **flag** que por defecto está apagado.

## Antes de empezar

Necesitas:

- Acceso admin a Greenhouse (`efeonce_admin`).
- Acceso al endpoint canónico de flags: `/api/admin/home/rollout-flags` (TASK-780). Mientras Admin Center > Gobernanza > Flags no exponga el formulario para los flags nuevos del workspace, podés usar el endpoint directo (curl o Postman) o esperar a que TASK-839 conecte el form.
- Identificar al menos 2 usuarios admin (incluido vos) para el dogfood inicial.

## Operación 1 — Activar para vos primero (dogfood)

1. Conseguir tu `userId` desde la session: abre `/admin/users` y buscate; el `userId` aparece en la URL del detalle del usuario.
2. Hacer un `POST` al endpoint de flags:

   ```bash
   curl -X POST https://greenhouse.efeoncepro.com/api/admin/home/rollout-flags \
     -H 'Content-Type: application/json' \
     -H 'Cookie: <tu cookie de session>' \
     -d '{
       "flagKey": "organization_workspace_shell_agency",
       "scopeType": "user",
       "scopeId": "<tu-userId>",
       "enabled": true,
       "reason": "TASK-612 dogfood admin"
     }'
   ```

3. Abrí `/agency/organizations/<id-de-cualquier-org>` en una pestaña incógnito (refresh hard) o esperá ~30s para que el cache TTL expire. Vas a ver el header con el shell nuevo + tabs.
4. Verificá:
   - Header con nombre de la org + status chip
   - 4 KPI cards (Revenue, Margen bruto, Equipo, Spaces)
   - Las 9 pestañas (algunas con empty state honesto: CRM, Servicios, Staff Aug)
   - Click en cada tab → contenido carga con spinner brief + render
   - Botón Sincronizar HubSpot (si la org tiene HubSpot) y Editar (admin) en el header
   - URL cambia con `?facet=...` al cambiar de tab — bookmarkable

Si todo se ve bien, avanzar al siguiente paso. Si algo falla, ir a "Operación 4 — Revertir" abajo.

## Operación 2 — Rollout progresivo por rol

Una vez confirmado el dogfood (1 día minimo):

1. Activar para `efeonce_admin` por scope `role`:

   ```bash
   curl -X POST .../api/admin/home/rollout-flags \
     -d '{
       "flagKey": "organization_workspace_shell_agency",
       "scopeType": "role",
       "scopeId": "efeonce_admin",
       "enabled": true,
       "reason": "TASK-612 staged rollout admins"
     }'
   ```

2. Esperar 24-48h. Revisar `/admin/operations` subsystem `Identity & Access` — los signals `workspace_projection.facet_view_drift` y `workspace_projection.unresolved_relations` deberían quedarse en steady state (0).

3. Si todo OK, repetir para los siguientes roles en orden:
   - `efeonce_operations` (staff operativo)
   - `efeonce_account` (account managers)
   - `collaborator` (resto del equipo interno)

4. **Cuando todos los roles internos estén activados sin issues**, evaluar global:

   ```bash
   curl -X POST .../api/admin/home/rollout-flags \
     -d '{
       "flagKey": "organization_workspace_shell_agency",
       "scopeType": "global",
       "scopeId": null,
       "enabled": true,
       "reason": "TASK-612 default global post-soak ≥7d"
     }'
   ```

## Operación 3 — Supervisar reliability signals

Las 2 signals canónicas viven bajo subsystem `Identity & Access` en `/admin/operations`:

- `identity.workspace_projection.facet_view_drift` (drift, warning si > 0): detecta drift estructural entre el mapping facet→viewCode (TASK-611) y el VIEW_REGISTRY canónico. Si se prende post-rollout, alguien renombró un viewCode sin actualizar el mapping. **Steady=0**.

- `identity.workspace_projection.unresolved_relations` (data_quality, error si > 0 sostenido > 7d): cuenta `client_users` activos que no resolverán a ninguna org via spaces. **Steady=0**. Si emerge: revisar el manual de TASK-611 sección "Diagnóstico de no veo lo que esperaba".

Adicionalmente, el signal `home.rollout.drift` (TASK-780) monitorea cualquier drift entre el flag PG y el comportamiento real del portal.

## Operación 4 — Revertir un usuario o rol

Si un usuario reporta un issue, revertir es instantáneo:

1. **Revert per-user** (override más alto en scope precedence):

   ```bash
   curl -X POST .../api/admin/home/rollout-flags \
     -d '{
       "flagKey": "organization_workspace_shell_agency",
       "scopeType": "user",
       "scopeId": "<userId-afectado>",
       "enabled": false,
       "reason": "TASK-612 revert manual por <razón>"
     }'
   ```

2. El usuario afectado vuelve al legacy `OrganizationView` en el próximo refresh (o esperar TTL 30s del cache).

3. **Revert global** (rollback completo del flag):

   ```bash
   curl -X POST .../api/admin/home/rollout-flags \
     -d '{
       "flagKey": "organization_workspace_shell_agency",
       "scopeType": "global",
       "scopeId": null,
       "enabled": false,
       "reason": "TASK-612 rollback global por <issue-X>"
     }'
   ```

   Esto desactiva el shell para todos. Documentar el issue + razón antes de re-intentar.

## Que NO hacer

- **No edites manualmente la tabla `home_rollout_flags`**. Usá el endpoint canónico — el endpoint hace audit log + invalidación de cache reactiva.
- **No actives el flag en `global` antes de soak ≥7d en cada rol**. El staged rollout existe para detectar issues progresivamente.
- **No mezcles los flag keys**: `organization_workspace_shell_agency` cubre `/agency/organizations/[id]`. El de Finance (`organization_workspace_shell_finance`) lo activará TASK-613 cuando esa convergencia mergee.
- **No actives el flag para clientes externos** (scope `tenant` con tenantId de cliente). El shell hoy solo está validado para usuarios internos. La activación para client portal requiere security review específico.
- **No retires el legacy `OrganizationView`** hasta que el flag esté global=true por ≥60 días sin issues. La task de retirement queda como follow-up explícito.

## Problemas comunes

### "Activé el flag pero sigo viendo el legacy"

Cache TTL natural de 30s. Esperá. Si pasaron > 1 min, verificá:

- ¿El POST devolvió 201? (chequear logs Vercel)
- `/admin/operations` signal `home.rollout.drift` ¿está en steady? Si > 0, hay drift PG↔env.
- Hard refresh (Shift+Cmd+R) o pestaña incógnita para descartar cache HTTP cliente.

### "El workspace abre pero las pestañas están todas vacías"

Probable: el subject no tiene la relación con la org (caso `unrelated_internal` o `no_relation`). Esperado — el shell muestra mensaje "Sin acceso a ninguna sección" honest. Si el usuario debería tener acceso:

- Revisar `client_team_assignments` (si el usuario es interno asignado).
- Revisar `client_users.client_id` + `spaces.client_id` mapeando a la org.

### "Una pestaña tarda mucho en cargar la primera vez"

Esperado — los 9 facets son `dynamic()` lazy-loaded, el primer click descarga el bundle. Posteriores clicks son instant. Si tarda > 3s consistente, reportar issue.

### "Quiero darle acceso a una persona específica a la pestaña Finance"

Hoy no se puede granularmente. El shell muestra Finanzas a usuarios con role `route_group=finance` o `efeonce_admin`. Cuando TASK-839 (Admin Center governance wire-up) cierre, vas a poder otorgar `organization.finance` como override personal a un usuario específico.

> **Detalle tecnico:** Helper canónico [`isWorkspaceShellEnabledForSubject`](../../../src/lib/workspace-rollout/index.ts). Page server-side [`page.tsx`](../../../src/app/(dashboard)/agency/organizations/[id]/page.tsx). Migration que extiende CHECK del flag: `migrations/20260508132302091_task-612-extend-home-rollout-flag-keys-workspace-shell.sql`. Cache invalidation reactiva consumer [`organization-workspace-cache-invalidation.ts`](../../../src/lib/sync/projections/organization-workspace-cache-invalidation.ts) (TASK-611 Slice 6).

## En resumen

- 1 flag (`organization_workspace_shell_agency`) gobierna la activación. Default disabled.
- Activación staged: tu user → role-by-role → global.
- 2 signals canónicas en `/admin/operations` para monitorear.
- Revert per-user instantáneo via endpoint POST.
- Cero pérdida funcional bajo flag disabled — la legacy view se preserva intacta.
