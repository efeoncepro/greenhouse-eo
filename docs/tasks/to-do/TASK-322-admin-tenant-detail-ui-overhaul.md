# TASK-322 — Enriquecer Cuentas Detail con tabs operativas y deprecar Admin Tenant Detail

## Delta 2026-04-09

- **Replanteo v1:** la auditoria revelo 35 hallazgos pero la vista opera sobre BQ legacy. Se replanteo como deprecacion + redireccion pura.
- **Replanteo v2 (actual):** la redireccion pura dejaria al admin sin funcionalidad (5 de 6 tabs no tienen equivalente en Cuentas). El modelo actual de Organizations en PostgreSQL ya soporta notes (con PUT), spaces, people, finance, economics, projects, ICO, HubSpot sync — todo lo necesario para construir tabs ricas. **La task ahora es: enriquecer la vista de Cuentas con tabs operativas usando el modelo PG + widgets Vuexy, y redirigir la legacy.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-322-accounts-detail-enrichment`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

La vista Admin Tenant Detail (`/admin/tenants/[id]`) opera sobre BigQuery legacy y tiene 35 hallazgos de UI/UX. La vista sucesora Cuentas Detail (`/admin/accounts/[id]`) ya existe sobre PostgreSQL pero solo muestra sidebar + listado de Spaces. Esta task la enriquece con tabs operativas (Usuarios, Capabilities, CRM, Notion, Configuracion) usando el modelo PG actual y widgets Vuexy, y luego redirige la vista legacy.

## Why This Task Exists

Hoy conviven dos vistas para el mismo cliente:

| Vista | Ruta | Data model | Estado |
|-------|------|-----------|--------|
| Admin Tenant Detail | `/admin/tenants/[id]` | BigQuery + HubSpot live | Legacy — 35 hallazgos, jerga tecnica, botones disabled |
| Cuentas Detail | `/admin/accounts/[id]` | PostgreSQL (Organizations API) | Actual — sidebar + spaces, sin tabs |

La vista legacy tiene funcionalidad operativa real (users, CRM provisioning, Notion, capabilities) pero sobre un modelo que se esta reemplazando. La vista de Cuentas tiene la base correcta (PG, breadcrumb, espanol, sin IDs expuestos) pero le faltan tabs. La solucion es construir las tabs sobre el modelo actual, no pulir la legacy.

El modelo de Organizations en PostgreSQL ya tiene APIs para:
- `GET /api/organizations/[id]` — detail con spaces, people, notes
- `PUT /api/organizations/[id]` — update (incluye notes)
- `GET /api/organizations/[id]/projects` — proyectos
- `GET /api/organizations/[id]/memberships` — personas/memberships
- `GET /api/organizations/[id]/finance` — finanzas
- `GET /api/organizations/[id]/economics` — economics
- `GET /api/organizations/[id]/ico` — ICO
- `GET /api/organizations/[id]/hubspot-sync` — sync HubSpot
- `GET /api/admin/tenants/[id]/capabilities` — capabilities (ya existe)
- `GET /api/admin/tenants/[id]/notion-status` — Notion (ya existe)

## Goal

- Agregar sistema de tabs a Cuentas Detail con las funcionalidades criticas
- Usar widgets Vuexy nativos (`HorizontalWithSubtitle`, `CardStatHorizontal`, etc.)
- Conectar con APIs existentes del modelo PG (Organizations + Admin Tenants)
- Redirigir `/admin/tenants/[id]` a `/admin/accounts/[organizationId]`
- Marcar archivos legacy como `@deprecated`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`

Reglas obligatorias:

- **Priorizar widgets Vuexy nativos** — `HorizontalWithSubtitle`, `CardStatHorizontal`, `ExecutiveCardShell`, `EmptyState`
- No duplicar datos: cada dato tiene un tab canonico (capabilities en su tab, no repetido en CRM)
- Tab state persiste en URL (`?tab=`) — patron identico a Space360View
- Todo en espanol. No exponer IDs tecnicos innecesariamente
- No mostrar botones disabled sin implementacion — si no funciona, no se renderiza

### Widgets Vuexy recomendados

| Componente | Usar para |
|-----------|-----------|
| `HorizontalWithSubtitle` | KPI stats por tab (usuarios activos, contactos CRM, etc.) |
| `CardStatHorizontal` | Mini-stats compactos en grillas |
| `ExecutiveCardShell` | Wrapper consistente para secciones |
| `EmptyState` | Estados vacios informativos |
| `CustomTabList` + `TabContext` | Sistema de tabs con pill style |

## Normative Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`

## Dependencies & Impact

### Depends on

- APIs de Organizations ya existentes (todas en PG)
- APIs de Admin Tenants para capabilities y Notion (mapping `organizationId → clientId` para las llamadas)
- La vista de Cuentas (`/admin/accounts/[id]`) estable y desplegada

### Blocks / Impacts

- `TASK-321` (Space 360 polish) — complementaria, no bloqueante

### Files owned

- `src/views/greenhouse/admin/accounts/AdminAccountDetailView.tsx` — enriquecer con tabs
- `src/views/greenhouse/admin/accounts/tabs/` — directorio nuevo para tab components
- `src/app/(dashboard)/admin/tenants/[id]/page.tsx` — redireccion
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx` — marcar deprecated
- `src/views/greenhouse/admin/tenants/*.tsx` — marcar deprecated

## Current Repo State

### Ya existe

- `AdminAccountDetailView.tsx` — sidebar + Spaces list + create dialog, todo en ES, sobre PG
- 13 API routes de Organizations sobre PG (detail, update, projects, memberships, finance, economics, ICO, hubspot-sync, etc.)
- APIs de Admin Tenants para capabilities (`GET/PUT`) y Notion (status, governance, data-quality, parity-audit)
- `OrganizationDetailData` type con spaces, people, notes, hubspot, country, industry, taxId
- `TenantUsersTable` — componente reutilizable si se adapta la fuente de datos
- Nomenclatura centralizada en `GH_INTERNAL_MESSAGES`

### Gap

- `AdminAccountDetailView.tsx` no tiene tabs — solo sidebar + spaces list
- No hay componentes de tab en `src/views/greenhouse/admin/accounts/`
- La fuente de datos de users por tenant es BigQuery (`getAdminTenantDetail().users`) — necesita equivalente PG o se reutiliza la query BQ como bridge temporal
- CRM provisioning usa HubSpot live service — ya tiene API, solo falta tab

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tab system en Cuentas Detail

- Agregar `TabContext` + `CustomTabList` a `AdminAccountDetailView.tsx` con tabs: Spaces (contenido actual), Personas, Configuracion
- Persistir tab activa en URL con `useSearchParams` + `router.replace` (patron Space360View)
- Hacer sidebar sticky (`position: 'sticky', top: 80`)
- Agregar `document.title` dinamico con nombre de la cuenta
- Tab default: Spaces (contenido existente se mueve a un tab)
- Mini-stats del sidebar clickeables → navegan a su tab

### Slice 2 — Tab Personas

- Consumir `GET /api/organizations/[id]/memberships` para listar personas de la cuenta
- Stat cards con `HorizontalWithSubtitle`: Total personas, Personas primarias, Departments
- Tabla con columnas: Persona (nombre + email), Rol, Tipo membership, Space asignado, Departamento
- Filtro por busqueda y por space
- Cada persona linkea a `/people/[memberId]` o `/admin/users/[userId]` segun corresponda
- Si no hay personas: `EmptyState` con icono y descripcion

### Slice 3 — Tab Configuracion

- Card "Identidad" con: public ID, nombre legal, RUT/tax ID, pais, industria, timezone, HubSpot company ID — datos de `OrganizationDetailData`
- Card "Notas" con `TextField` multiline editable + boton guardar (usa `PUT /api/organizations/[id]` que ya soporta update)
- Card "Integraciones" con: estado HubSpot (sync status), link a Space 360, link a vista de Agencia
- Usar `ExecutiveCardShell` como wrapper de cada card

### Slice 4 — Redireccion de vista legacy

- En `src/app/(dashboard)/admin/tenants/[id]/page.tsx`:
  - Lookup `clientId → organizationId` via query PG (`greenhouse_core.spaces`)
  - Si encuentra: `redirect(/admin/accounts/${organizationId})`
  - Si no: renderizar vista legacy como fallback
- Eliminar banner "Esta vista esta en transicion" de la vista legacy
- Agregar comment `// @deprecated — ver TASK-322` en archivos legacy

### Slice 5 — Bridge: capabilities y Notion como tabs futuras

- Agregar tabs placeholder "Capabilities" y "Notion" en Cuentas Detail con estado `EmptyState` que dice "Proximamente — esta funcionalidad se esta migrando" + boton "Abrir en vista legacy" con link a `/admin/tenants/{clientId}?tab=capabilities`
- Esto permite la redireccion sin perder acceso a funcionalidades que aun no migraron
- Las tabs se implementan en follow-ups con contenido real

## Out of Scope

- **No se reimplementa CRM provisioning** — queda accesible via link a legacy; task independiente para migrar
- **No se reimplementa Capabilities governance** — queda como tab placeholder; task independiente
- **No se reimplementa Notion panel** — queda como tab placeholder; task independiente
- **No se migra Users de BQ a PG** — se usa memberships de PG que es el modelo actual
- **No se eliminan archivos legacy** — se marcan deprecated y siguen como fallback
- **No se modifica el modelo de datos de Organizations** — se consumen APIs existentes

## Detailed Spec

### Tab system (patron Space360View)

```tsx
type AccountTab = 'spaces' | 'people' | 'settings' | 'capabilities' | 'notion'

const TAB_CONFIG = [
  { value: 'spaces', label: 'Spaces', icon: 'tabler-layout-grid' },
  { value: 'people', label: 'Personas', icon: 'tabler-users' },
  { value: 'settings', label: 'Configuracion', icon: 'tabler-settings' },
  { value: 'capabilities', label: 'Capabilities', icon: 'tabler-puzzle' },
  { value: 'notion', label: 'Notion', icon: 'tabler-brand-notion' }
]
```

### Tab Personas — consumiendo memberships API

```tsx
// Fetch on mount
const [memberships, setMemberships] = useState<OrganizationPerson[]>([])

useEffect(() => {
  fetch(`/api/organizations/${organizationId}/memberships`)
    .then(res => res.json())
    .then(data => setMemberships(data.items ?? []))
}, [organizationId])
```

### Tab Configuracion — notes editables

```tsx
const [notes, setNotes] = useState(detail.notes ?? '')
const [saving, setSaving] = useState(false)

const handleSaveNotes = async () => {
  setSaving(true)
  await fetch(`/api/organizations/${organizationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  })
  setSaving(false)
  toast.success('Notas guardadas')
}
```

### Redireccion condicional

```tsx
const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
  `SELECT DISTINCT s.organization_id
   FROM greenhouse_core.spaces s
   WHERE s.client_id = $1 AND s.organization_id IS NOT NULL
   LIMIT 1`,
  [id]
).catch(() => [])

if (rows[0]?.organization_id) {
  redirect(`/admin/accounts/${rows[0].organization_id}`)
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cuentas Detail tiene sistema de tabs con 5 tabs (Spaces, Personas, Configuracion, Capabilities, Notion)
- [ ] Tab activa persiste en URL como `?tab=people`, etc. y sobrevive recarga
- [ ] Sidebar es sticky y no desaparece al scrollear
- [ ] `document.title` muestra el nombre de la cuenta
- [ ] Tab Spaces contiene el contenido existente (listado + create dialog) sin regresion
- [ ] Tab Personas muestra memberships de PG con stat cards y tabla filtrable
- [ ] Tab Configuracion permite editar notes con `PUT /api/organizations/[id]`
- [ ] Tab Configuracion muestra identidad (public ID, legal name, tax ID, pais, industria, HubSpot)
- [ ] Tabs Capabilities y Notion muestran EmptyState con link a vista legacy
- [ ] `/admin/tenants/hubspot-company-30825221458` redirige a `/admin/accounts/{organizationId}`
- [ ] Tenants sin organizacion siguen accediendo a vista legacy
- [ ] Banner "en transicion" eliminado de vista legacy
- [ ] Archivos legacy tienen comment `@deprecated`
- [ ] Usa widgets Vuexy (`HorizontalWithSubtitle`, `CustomTabList`, `EmptyState`, `ExecutiveCardShell`)
- [ ] Todo en espanol, sin IDs tecnicos innecesarios
- [ ] `pnpm lint` y `npx tsc --noEmit` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Verificar tabs: navegar por las 5 tabs, recargar en cada una
- Verificar sidebar sticky: scrollear en tab Personas
- Verificar notes: editar notas, guardar, recargar y verificar persistencia
- Verificar redireccion: abrir `/admin/tenants/hubspot-company-30825221458`
- Verificar fallback: abrir tenant sin organizacion
- Verificar links legacy: desde tabs placeholder, abrir vista legacy correctamente

## Closing Protocol

- [ ] Verificar que Cuentas list (`/admin/accounts`) sigue funcionando
- [ ] Verificar que ningun link interno critico apunta solo a `/admin/tenants/[id]`
- [ ] Documentar en Handoff.md el estado de la migracion

## Follow-ups

- **Migrar tab Capabilities a Cuentas** — governance de business lines y service modules sobre PG
- **Migrar tab CRM provisioning a Cuentas** — flujo de onboarding desde HubSpot contacts
- **Migrar tab Notion a Cuentas** — configuracion de integracion, discovery, data quality
- **Eliminar archivos legacy** cuando cero tenants usen fallback y todas las tabs esten migradas

## Open Questions

Resueltas 2026-04-09 — no quedan preguntas abiertas.
