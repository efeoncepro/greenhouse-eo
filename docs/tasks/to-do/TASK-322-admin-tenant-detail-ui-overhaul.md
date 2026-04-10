# TASK-322 — Deprecar Admin Tenant Detail y consolidar en Cuentas + Space 360

## Delta 2026-04-09

- **Replanteo completo:** la auditoria revelo 35 hallazgos pero la vista opera sobre un data model legacy (BigQuery). La vista sucesora `/admin/accounts/[id]` ya existe, opera contra PostgreSQL (Organizations API), tiene breadcrumb, sidebar, listado de Spaces con link a Space 360, y dialog de crear Space. Invertir esfuerzo en pulir la vista legacy no es escalable. **La task cambia de "overhaul UI" a "deprecar y redirigir".**
- Effort baja de `Alto` a `Medio` — la mayor parte del trabajo es verificar que Cuentas cubre los casos de uso y agregar lo que falte antes de redirigir

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-322-admin-tenant-detail-deprecation`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

La vista Admin Tenant Detail (`/admin/tenants/[id]`) opera sobre un data model legacy (BigQuery) y tiene 35 hallazgos de UI/UX. La vista sucesora `/admin/accounts/[id]` ya existe sobre PostgreSQL con estructura moderna (breadcrumb, sidebar, Spaces list, create dialog). En vez de pulir la vista legacy, esta task la depreca: verifica que Cuentas cubra los casos de uso criticos, agrega lo que falte, y redirige `/admin/tenants/[id]` a `/admin/accounts/[organizationId]`.

## Why This Task Exists

Conviven dos vistas para gestionar el mismo cliente:

| Vista | Ruta | Data model | Estado |
|-------|------|-----------|--------|
| Admin Tenant Detail | `/admin/tenants/[id]` | BigQuery + HubSpot live | Legacy — 35 hallazgos, mezcla EN/ES, IDs expuestos, botones disabled |
| Cuentas Detail | `/admin/accounts/[id]` | PostgreSQL (Organizations API) | Actual — breadcrumb, sidebar, Spaces list, create dialog, todo en ES |

Mantener y pulir la vista legacy es invertir en deuda. La vista de Cuentas ya cubre la gestion de organizaciones y spaces. Lo que falta es verificar que los casos de uso exclusivos de Tenant Detail (Capabilities, CRM, Notion, Users table) tengan un camino alternativo antes de redirigir.

## Goal

- Verificar gap funcional entre Admin Tenant Detail y Cuentas
- Agregar a Cuentas lo que sea critico y no tenga alternativa
- Redirigir `/admin/tenants/[id]` a `/admin/accounts/[organizationId]`
- Eliminar el banner "en transicion" que lleva meses visible

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- No eliminar archivos de la vista legacy hasta confirmar que cero rutas la referencian
- La redireccion debe ser server-side (`redirect()` en el server component), no client-side
- El mapping `clientId → organizationId` debe ser robusto — no todos los tenants tienen organizacion

## Normative Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Dependencies & Impact

### Depends on

- Mapping `clientId → organizationId` — verificar que `getAgencySpace360()` o una query PG pueda resolver esto
- La vista de Cuentas (`/admin/accounts/[id]`) debe estar estable y desplegada

### Blocks / Impacts

- `TASK-321` (Space 360 polish) — el link bidireccional Space 360 ↔ Admin ya existe en Cuentas ("Ver en Agencia" + "Abrir Space 360")
- Cualquier bookmark o link interno que apunte a `/admin/tenants/[id]` sera redirigido automaticamente

### Files owned

- `src/app/(dashboard)/admin/tenants/[id]/page.tsx` — redireccion
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx` — a deprecar
- `src/views/greenhouse/admin/tenants/*.tsx` — 10 archivos a deprecar
- `src/views/greenhouse/admin/accounts/AdminAccountDetailView.tsx` — enriquecer si hay gaps

## Current Repo State

### Ya existe en Cuentas (`/admin/accounts/[id]`)

- Sidebar con avatar, nombre, publicId, status chip, country/flag, industry, mini-stats (Spaces, Personas), HubSpot ID, RUT/tax ID, razon social, notas, boton "Ver en Agencia"
- Listado de Spaces con status, tipo, Notion mapping status, link "Abrir Space 360"
- Dialog para crear Space nuevo
- Breadcrumb `Admin / Cuentas / {nombre}`
- Todo en espanol, sin IDs tecnicos expuestos innecesariamente

### Funcionalidad exclusiva de Tenant Detail (gap potencial)

| Funcionalidad | Tab | Alternativa en modelo actual |
|--------------|-----|----------------------------|
| Business Lines governance | Capabilities | Visible en Space 360 overview; governance manual podria moverse a Space 360 o a un panel global |
| Service Modules table | Capabilities | Visible en Space 360 ServicesTab; tabla admin podria ser un panel global |
| Feature Flags | Capabilities | Sin alternativa — evaluar si mover a Cuentas o a Admin Center global |
| Capability Manager (sync HubSpot) | Capabilities | Sin alternativa — evaluar si se necesita acceso frecuente |
| Users table con filtros y stats | Usuarios | Sin alternativa directa — la gestion de usuarios esta en `/admin/users` global pero sin filtro por tenant |
| HubSpot contact provisioning | CRM | Sin alternativa — flujo operativo critico para onboarding |
| HubSpot live company data | CRM | Sin alternativa directa — info de debug util para ops |
| Notion mapping, governance, data quality, orchestration, discovery | Notion | Sin alternativa — panel operativo completo |
| Identity settings, company record, notes | Configuracion | Parcialmente en Cuentas sidebar (notes, HubSpot, RUT) |

### Gap

- 5 de 6 tabs de Tenant Detail tienen funcionalidad sin equivalente directo en Cuentas
- La redireccion no puede ser incondicional hasta cubrir los casos criticos
- El mapping `clientId → organizationId` puede no existir para todos los tenants

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Auditoria de gap funcional

- Verificar para cada fila de la tabla de gap:
  - Con que frecuencia se usa la funcionalidad (revisar logs/analytics si hay)
  - Si existe una ruta alternativa en el modelo actual
  - Si se puede diferir (no bloquea redireccion) o es bloqueante
- Producir una decision documentada: que se mueve a Cuentas, que se deja como panel global, que se posterga
- Resultado: lista de funcionalidades bloqueantes que deben existir antes de redirigir

### Slice 2 — Agregar link "Gestionar tenant" en Cuentas Detail

- En `AdminAccountDetailView.tsx`, agregar un boton en la seccion de acciones del sidebar: "Gestionar tenant (legacy)" que abre `/admin/tenants/{clientId}` — como puerta de acceso temporal a la funcionalidad que aun no migro
- Este boton desaparece cuando se complete la migracion

### Slice 3 — Redireccion condicional en `/admin/tenants/[id]`

- En `src/app/(dashboard)/admin/tenants/[id]/page.tsx`:
  - Lookup `clientId → organizationId` via query PG a `greenhouse_core.spaces` o `greenhouse_core.organizations`
  - Si encuentra organizacion: `redirect(/admin/accounts/${organizationId})`
  - Si no encuentra: renderizar la vista legacy como fallback (tenants sin organizacion aun necesitan acceso)
- Eliminar el banner "Esta vista esta en transicion" — ya no es necesario con la redireccion activa

### Slice 4 — Marcar archivos legacy como deprecated

- Agregar comment header `// @deprecated — esta vista se redirige a /admin/accounts/[id]. Ver TASK-322.` en:
  - `GreenhouseAdminTenantDetail.tsx`
  - Todos los archivos en `src/views/greenhouse/admin/tenants/`
- No eliminar archivos — siguen como fallback para tenants sin organizacion

## Out of Scope

- **No se migran las 6 tabs a Cuentas** — eso es una task independiente por cada funcionalidad (Users, CRM provisioning, Notion, etc.)
- **No se modifica la vista de Cuentas** excepto agregar el link temporal al tenant legacy
- **No se cambia el data model de BigQuery** ni las APIs de tenant detail
- **No se eliminan archivos** — solo se marcan deprecated y se redirige

## Detailed Spec

### Redireccion condicional (server component)

```tsx
// src/app/(dashboard)/admin/tenants/[id]/page.tsx
import { redirect } from 'next/navigation'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export default async function AdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Intentar resolver organizacion por clientId
  const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT DISTINCT s.organization_id
     FROM greenhouse_core.spaces s
     WHERE s.client_id = $1
       AND s.organization_id IS NOT NULL
     LIMIT 1`,
    [id]
  ).catch(() => [])

  if (rows.length > 0 && rows[0].organization_id) {
    redirect(`/admin/accounts/${rows[0].organization_id}`)
  }

  // Fallback: renderizar vista legacy para tenants sin organizacion
  // ... codigo existente ...
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Navegar a `/admin/tenants/hubspot-company-30825221458` redirige a `/admin/accounts/{organizationId}` correspondiente
- [ ] Tenants sin organizacion siguen accediendo a la vista legacy sin redireccion
- [ ] El banner "Esta vista esta en transicion" ya no existe en la vista legacy
- [ ] La vista de Cuentas Detail tiene un boton "Gestionar tenant (legacy)" que enlaza a `/admin/tenants/{clientId}`
- [ ] Los archivos legacy tienen comment `@deprecated` con referencia a TASK-322
- [ ] No se rompe ningun test existente
- [ ] La vista de lista `/admin/tenants` sigue funcionando (no se toca)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Verificar redireccion: abrir `/admin/tenants/hubspot-company-30825221458` y confirmar que redirige a Cuentas
- Verificar fallback: abrir un tenant sin organizacion y confirmar que la vista legacy carga
- Verificar link legacy: desde Cuentas Detail, click en "Gestionar tenant" abre la vista legacy correctamente

## Closing Protocol

- [ ] Verificar que ningun link interno del portal apunta a `/admin/tenants/[id]` que no sea cubierto por la redireccion
- [ ] Documentar en Handoff.md que tenants sin organizacion aun usan la vista legacy

## Follow-ups

- **Migrar tab Users a Cuentas o a `/admin/users` con filtro por tenant** — funcionalidad operativa critica
- **Migrar CRM provisioning a Cuentas** — flujo de onboarding que hoy solo vive en Tenant Detail
- **Migrar Notion panel a Cuentas o a Space 360** — configuracion de integracion por space
- **Migrar Capabilities governance a un panel global** — business lines y service modules
- **Eliminar archivos legacy** cuando todos los follow-ups esten completos y cero tenants usen el fallback

## Open Questions

Resueltas 2026-04-09 — no quedan preguntas abiertas. La estrategia es redireccion condicional + fallback + deprecacion progresiva.
