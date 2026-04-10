# TASK-322 — Admin Tenant Detail: overhaul UI/UX, eliminar deuda visual y conectar con Space 360

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
- Branch: `task/TASK-322-admin-tenant-detail-ui-overhaul`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

La vista Admin Tenant Detail (`/admin/tenants/[id]`) tiene 35 hallazgos de auditoria: mezcla sistematica de idiomas EN/ES en datos y chips, business line "Unknown" visible al mismo nivel que las reales, botones disabled sin explicacion, IDs tecnicos expuestos en todas las tabs, sidebar no sticky, tab state que no persiste en URL, informacion duplicada entre tabs, y cero conectividad con la Space 360 que ya opera el mismo cliente. La vista necesita un overhaul de UI manteniendo su estructura de 6 tabs.

## Why This Task Exists

Esta es la primera version del producto para gestion de tenants. Se construyo sobre BigQuery y HubSpot live reads, antes de que existiera el modelo de Space 360 con PostgreSQL. Hoy conviven dos vistas para el mismo cliente (Admin Tenant Detail y Space 360) sin enlazarse. La UI expone jerga tecnica, IDs internos y funcionalidad no implementada (botones disabled) que degrada la experiencia de administracion. La mezcla de idiomas EN/ES en chips y descriptions es sistematica y viene tanto del frontend como del backend.

## Goal

- Eliminar toda exposicion de IDs tecnicos, codes internos y funcionalidad no implementada de la UI
- Unificar idioma a espanol en chips, descriptions y labels de capabilities
- Hacer el sidebar sticky y los mini-stats clickeables
- Persistir tab activa en URL y agregar breadcrumb
- Conectar bidireccionalmente con Space 360 (`/agency/spaces/[id]`)
- Ocultar o diferenciar business line "Unknown" del fallback
- Remover botones disabled sin implementacion y menus de opciones vacios

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — roles y permisos admin

Reglas obligatorias:

- **Priorizar widgets Vuexy nativos** de `src/components/card-statistics/` y `src/components/greenhouse/` antes de construir layouts ad-hoc
- El idioma del portal es espanol. Los datos del backend que llegan en ingles (descriptions de capabilities, chip labels) deben traducirse en el frontend o tener un mapping explicito
- No cambiar la estructura de `AdminTenantDetail` ni las queries BigQuery en esta task — los cambios son frontend-only
- Las 6 tabs existentes se mantienen; no se agregan ni eliminan tabs

### Widgets Vuexy disponibles para esta task

| Componente | Path | Usar para |
|-----------|------|-----------|
| `HorizontalWithSubtitle` | `src/components/card-statistics/HorizontalWithSubtitle.tsx` | Ya se usa en tab Usuarios — replicar en sidebar mini-stats y otras tabs |
| `CardStatHorizontal` | `src/components/card-statistics/CardStatHorizontal.tsx` | KPIs secundarios en CRM y Configuracion |
| `ExecutiveCardShell` | `src/components/greenhouse/ExecutiveCardShell.tsx` | Wrapper consistente para secciones |
| `EmptyState` | `src/components/greenhouse/EmptyState.tsx` | Reemplazar botones disabled con empty states explicativos |

## Normative Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerias, patrones
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` — roles admin

## Dependencies & Impact

### Depends on

- Ninguna tabla, schema ni API nueva. Todos los cambios son frontend-only sobre archivos existentes.
- La conexion bidireccional con Space 360 depende de que el backend ya incluya `spaceId` en `AdminTenantDetail` (campo existente: `data.publicId` o lookup por `clientId`). Si no existe, agregar un campo derivado.

### Blocks / Impacts

- `TASK-321` (Space 360 UI polish) — esa task agrega link "Ver organizacion" que podria enlazar de vuelta a esta vista. Coordinar para evitar links circulares.

### Files owned

- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilitiesPanel.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantCrmPanel.tsx`
- `src/views/greenhouse/admin/tenants/TenantProjectsPanel.tsx`
- `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
- `src/views/greenhouse/admin/tenants/TenantSettingsPanel.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/helpers.ts`

## Current Repo State

### Already exists

- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx` — vista principal con sidebar + 6 tabs
- `src/views/greenhouse/admin/tenants/` — 10 archivos de tab y soporte
- `src/lib/admin/get-admin-tenant-detail.ts` — data loader contra BigQuery + HubSpot live
- `src/app/(dashboard)/admin/tenants/[id]/page.tsx` — server component
- Tab Usuarios ya usa `HorizontalWithSubtitle` para stat cards — patron a replicar
- `GH_INTERNAL_MESSAGES` en `src/config/greenhouse-nomenclature.ts` — centralizacion de copy

### Gap

- Sidebar no es sticky — desaparece al scrollear
- Tab activa no se persiste en URL (`useState` local)
- Sin breadcrumb de navegacion
- Sin `document.title` dinamico
- Business line "Unknown / EO-BL-UNKNOWN" visible al mismo nivel que business lines reales
- Chips de capability state mezclan "Disponible" (ES) con "Available" (EN)
- Descriptions de capabilities en ingles ("Commercial family for CRM licensing...")
- Botones "Invitar usuario", "Reenviar invitaciones", "Agregar proyecto" disabled sin explicacion
- Menu de opciones por usuario (Reenviar, Cambiar rol, Desactivar) con 3 items disabled
- Feature flags muestran codigos internos (`dashboard-kpis`) sin label humanizado
- Service modules muestran codigos (`EO-SVC-AGENCIA-CREATIVA`) prominentes
- HubSpot contact IDs y publicUserIds expuestos en tabs CRM y Usuarios
- `serviceBaseUrl` de Cloud Run visible en tab CRM
- Sidebar mini-stats no son clickeables
- Boton "Guardar seleccion manual" es warning (parece destructivo) en vez de primary
- Governance Manager accordion expandido por defecto
- Sin link bidireccional a Space 360
- Info duplicada: Business Lines en Capabilities + CRM, Company Record en Capabilities + Configuracion + CRM
- Tab Notion sobrecargada con 4+ secciones tecnicas sin contexto
- Notes en tab Configuracion no son editables

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Estructura: sidebar sticky, URL tabs, breadcrumb, document.title

- **GreenhouseAdminTenantDetail.tsx:241** — Agregar `position: 'sticky', top: theme => theme.spacing(20)` al Grid del sidebar para que no desaparezca al scrollear
- **GreenhouseAdminTenantDetail.tsx:46** — Reemplazar `useState` por `useSearchParams` + `router.replace` para persistir tab activa en URL (patron identico a `Space360View.tsx:59-81`)
- **GreenhouseAdminTenantDetail.tsx:226** — Agregar `Breadcrumbs` con `Admin Center / Cuentas / {clientName}` antes del banner de transicion
- **GreenhouseAdminTenantDetail.tsx** — Agregar `useEffect` con `document.title = \`${data.clientName} — Admin Tenant | Greenhouse\``

### Slice 2 — Sidebar: mini-stats clickeables, feedback de refresh, link a Space 360

- **GreenhouseAdminTenantDetail.tsx:99-112** — Envolver cada mini-stat en `Box` clickeable que navega a su tab: Usuarios → `?tab=usuarios`, Lineas → `?tab=capabilities`, Proyectos → `?tab=proyectos`
- **GreenhouseAdminTenantDetail.tsx:106** — Cambiar label "Lineas" a "Lineas de negocio" o "BL"
- **GreenhouseAdminTenantDetail.tsx:53-57** — Agregar `toast.success('Lectura HubSpot actualizada')` despues del `router.refresh()` en transition, o un state de feedback temporal
- **GreenhouseAdminTenantDetail.tsx:142-164** — Agregar boton "Ver Space 360" con link a `/agency/spaces/${data.clientId}` en seccion Acciones del sidebar (si existe un Space vinculado)

### Slice 3 — Tab Capabilities: ocultar "Unknown", unificar idioma, limpiar UI

- **TenantCapabilitiesPanel.tsx:92-145** — Filtrar o diferenciar visualmente la business line con `moduleCode === 'EO-BL-UNKNOWN'`: moverla al final con opacidad reducida y label "Sin clasificar" en vez de "Unknown"
- **TenantCapabilitiesPanel.tsx:120-137** — Crear mapping ES para capability state labels. Si el backend envia "Available", renderizar "Disponible". Centralizar en `helpers.ts`
- **TenantCapabilitiesPanel.tsx:139-141** — Crear mapping ES para descriptions de business lines conocidas. Si `capability.description` esta en ingles, usar un `BUSINESS_LINE_DESCRIPTIONS_ES` map en `helpers.ts`
- **TenantCapabilitiesPanel.tsx:76-86** — Cambiar boton "Guardar seleccion manual" de `color='warning'` a `color='primary'`
- **TenantCapabilitiesPanel.tsx:230** — Cambiar Governance Manager accordion de `defaultExpanded` a colapsado por defecto
- **TenantCapabilitiesPanel.tsx:184-202** — Feature flags: agregar mapping de `featureCode` → label humanizado en `helpers.ts`. Ej: `dashboard-kpis` → "KPIs en Dashboard"
- **TenantServiceModulesTable.tsx** — Mover columna "CODIGO" a un tooltip en el nombre del modulo, o hacerla colapsable/secundaria

### Slice 4 — Tab Usuarios: remover funcionalidad no implementada

- **TenantUsersTable.tsx:282-287** — Eliminar botones "Invitar usuario" y "Reenviar invitaciones" disabled. Cuando se implementen, se agregan de vuelta
- **TenantUsersTable.tsx:159-178** — Eliminar el `OptionMenu` completo de la columna Actions (3 items disabled). Dejar solo el boton "Ver" que si funciona
- **TenantUsersTable.tsx:127-129** — Ocultar HubSpot contact IDs del texto secundario en columna Access. Reemplazar con solo el auth mode o fuente ("Manual" / "CRM")

### Slice 5 — Tab CRM: reducir ruido tecnico

- **TenantCrmPanel.tsx:477-479** — Quitar `hubspotContactId` del detalle secundario de cada contacto. Dejar solo nombre + email
- **TenantCrmPanel.tsx:518-520, 559-560** — Quitar `expectedPublicUserId` visible. Moverlo a un tooltip en el chip de status si es necesario para debug
- **TenantCrmPanel.tsx:91, 650** — Traducir chip "Realtime" a "Tiempo real"
- **TenantCrmPanel.tsx:656** — Quitar `serviceBaseUrl` de la vista. Informacion de infraestructura que no aporta a admin
- **TenantCrmPanel.tsx:584-665** — Renombrar seccion "HubSpot Raw Read" a "Datos de origen CRM" o "Detalle tecnico CRM"

### Slice 6 — Tabs Proyectos, Configuracion, Notion: limpieza

- **TenantProjectsPanel.tsx:39-41** — Eliminar boton "Agregar proyecto" disabled. Cuando se implemente, se agrega
- **TenantProjectsPanel.tsx:80-83** — Mover project ID tecnico a tooltip en el nombre del proyecto
- **TenantSettingsPanel.tsx:47** — Agregar boton de copy-to-clipboard al lado del `clientId` interno (util para admin pero no como texto plano)
- **TenantSettingsPanel.tsx:122-129** — Agregar nota visual `(solo lectura)` al card de Notes, o convertirlo en `TextField` editable si la API lo soporta [verificar]
- **TenantNotionPanel.tsx** — Agregar descripcion introductoria al panel: "Configuracion de la integracion Notion para este tenant. Permite descubrir bases de datos, verificar calidad de datos y gestionar la sincronizacion."
- **GreenhouseAdminTenantDetail.tsx:228-239** — Evaluar si el banner "Esta vista esta en transicion" sigue siendo necesario. Si Cuentas ya esta consolidado, eliminarlo. Si no, agregar fecha o contexto de cuando se completara la transicion

### Slice 7 — Deduplicacion de informacion entre tabs

- **TenantCapabilitiesPanel.tsx** — Quitar card "Company Record" de tab Capabilities (ya existe en Configuracion y CRM)
- **TenantCrmPanel.tsx:259-312** — El bloque de Business Lines + Service Modules + Lifecycle en CRM Config es redundante con tab Capabilities. Reemplazar por un chip-summary compacto con link "Ver en Capabilities" que cambia de tab
- Documentar en la task que la fuente canonica de cada dato es:
  - Business Lines → tab Capabilities
  - Company Record / HubSpot → tab CRM
  - Identity / Settings → tab Configuracion

## Out of Scope

- **No se migra el data model de BigQuery a PostgreSQL** — eso es una task independiente de backend
- **No se implementa funcionalidad nueva** (invitar usuario, cambiar rol, desactivar, agregar proyecto) — solo se remueven los botones placeholder
- **No se redisena el layout general** (sidebar + tabs) — se mantiene la estructura
- **No se toca `TenantCapabilityManager`** ni la logica de sync de capabilities
- **No se cambian los API routes** ni las queries de `get-admin-tenant-detail.ts`
- **No se unifica con Space 360 a nivel de data model** — solo se agregan links de navegacion cruzada
- **No se modifica la logica del Discovery wizard de Notion** — solo se agrega contexto introductorio

## Detailed Spec

### Tab state en URL (patron Space360View)

```tsx
const searchParams = useSearchParams()
const urlTab = searchParams.get('tab') as TabValue | null
const [tab, setTab] = useState<TabValue>(
  urlTab && TAB_VALUES.includes(urlTab) ? urlTab : 'capabilities'
)

const handleTabChange = (_event: SyntheticEvent, value: string) => {
  const next = value as TabValue
  setTab(next)
  const params = new URLSearchParams(searchParams.toString())
  if (next === 'capabilities') params.delete('tab')
  else params.set('tab', next)
  router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
}
```

### Sidebar sticky

```tsx
<Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ alignSelf: 'flex-start', position: 'sticky', top: 80 }}>
  {sidebar}
</Grid>
```

### Capability state label mapping (helpers.ts)

```tsx
const CAPABILITY_STATE_LABELS_ES: Record<string, string> = {
  active: 'Activo',
  available: 'Disponible',
  inactive: 'Inactivo',
  enabled: 'Habilitado',
  disabled: 'Deshabilitado'
}

export const getCapabilityStateLabel = (state: string): string =>
  CAPABILITY_STATE_LABELS_ES[state.toLowerCase()] || toTitleCase(state)
```

### Feature flag label mapping (helpers.ts)

```tsx
const FEATURE_FLAG_LABELS_ES: Record<string, string> = {
  'dashboard-kpis': 'KPIs en Dashboard',
  'ai-tools': 'Herramientas IA',
  'payroll-export': 'Exportacion Nomina',
  // ... agregar segun catalogo real
}

export const getFeatureFlagLabel = (code: string): string =>
  FEATURE_FLAG_LABELS_ES[code] || code
```

### Business line "Unknown" diferenciada

```tsx
const isUnknownFallback = capability.moduleCode === 'EO-BL-UNKNOWN'

<Box sx={{
  ...baseStyles,
  ...(isUnknownFallback && { opacity: 0.55, borderStyle: 'dashed' })
}}>
  <Typography variant='caption' color='text.disabled'>
    {isUnknownFallback ? 'Sin clasificar' : capability.publicModuleId}
  </Typography>
</Box>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El sidebar permanece visible (sticky) al scrollear en cualquier tab
- [ ] La tab activa se persiste en la URL como `?tab=usuarios`, etc. y sobrevive recarga
- [ ] Hay breadcrumb `Admin Center / Cuentas / {nombre}` visible arriba
- [ ] El `document.title` del browser muestra el nombre del tenant
- [ ] Los mini-stats del sidebar son clickeables y navegan a su tab
- [ ] Hay un boton "Ver Space 360" en el sidebar que enlaza a `/agency/spaces/{clientId}`
- [ ] La business line "Unknown" aparece diferenciada visualmente (opacidad, borde punteado, label "Sin clasificar")
- [ ] Todos los chips de capability state estan en espanol (no aparece "Available" en ingles)
- [ ] Las descriptions de business lines conocidas estan en espanol
- [ ] Los feature flags muestran un label humanizado (no solo el code)
- [ ] No existen botones disabled sin implementacion en ninguna tab (Invitar, Reenviar, Agregar proyecto, OptionMenu)
- [ ] No se muestran `hubspotContactId`, `expectedPublicUserId` ni `serviceBaseUrl` como texto visible en ninguna tab
- [ ] El boton "Guardar seleccion manual" es `color='primary'` (no warning)
- [ ] El Governance Manager accordion esta colapsado por defecto
- [ ] La columna CODIGO de Service Modules no es prominente (tooltip o secundaria)
- [ ] Company Record no aparece duplicado en tab Capabilities (solo en CRM y Configuracion)
- [ ] Tab CRM Config tiene un chip-summary de Business Lines con link a Capabilities (no duplicacion completa)
- [ ] El chip "Realtime" se muestra como "Tiempo real"
- [ ] `pnpm lint` y `npx tsc --noEmit` pasan sin errores

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Verificacion visual en preview: navegar a `/admin/tenants/hubspot-company-30825221458` y recorrer las 6 tabs
- Verificar sidebar sticky: scrollear hasta el fondo de tab CRM y verificar que sidebar permanece visible
- Verificar URL persistence: navegar a tab Usuarios, recargar pagina, verificar que sigue en Usuarios
- Verificar link Space 360: click en "Ver Space 360" navega correctamente

## Closing Protocol

- [ ] Verificar que `GH_INTERNAL_MESSAGES` no tiene claves rotas — grep por todas las claves usadas en los archivos modificados
- [ ] Verificar que la vista de lista de tenants (`/admin/tenants`) sigue funcionando
- [ ] Verificar que la tab Notion (wizard, governance, data quality) sigue funcionando despues de los cambios

## Follow-ups

- **Migracion de data model BQ → PG**: la fuente canonica de tenant detail deberia moverse a PostgreSQL. Actualmente `getAdminTenantDetail()` consulta BigQuery para tenants, users y projects. Task independiente de backend
- **Unificacion Admin Tenant Detail + Space 360**: evaluar si esta vista deberia mergearse con Space 360 como una sola vista con tabs unificadas, o si deben seguir como vistas complementarias (admin vs operacion)
- **Implementacion de acciones de usuario**: invitar, cambiar rol, desactivar — cada una es una task independiente con su API route
- **Notes editables**: si la API soporta PUT de notes, implementar inline editing

## Open Questions

- El banner "Esta vista esta en transicion" — se elimina, se mantiene, o se actualiza con fecha de migracion? Decision del usuario
- Notes en tab Configuracion — son readonly por diseno o falta implementar edicion? [verificar si existe API de update]
- La seccion "HubSpot Raw Read" en CRM — se mantiene como accordion tecnico o se elimina? Para un admin avanzado es util, pero agrega ruido
