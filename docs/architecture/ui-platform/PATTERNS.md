# Greenhouse UI Platform — UX Patterns

> Parte de **Greenhouse UI Platform**. Índice + mapa "dónde vive X": [README.md](./README.md).
> Estado **vigente** (spec actual). Historial cronológico (deltas datados): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime; si este doc difiere del código, gana el runtime y este doc se actualiza (modelo 3 capas, ver `design-system-governance`).
> Patrones transversales: error handling & feedback, breadcrumbs, progressive disclosure.

---

## Funnel Analysis Pattern

**Funnel Analysis Pattern** es el patrón canónico para analizar workflows por
etapas cuando el operador necesita leer, en una sola superficie, volumen,
retención, SLA, caídas, bloqueos y siguiente conversación con Nexa.

### Taxonomía

- **Pattern:** `Funnel Analysis Pattern`.
- **Composition:** `GreenhouseFunnelChartCard`.
- **Zone primitives:** `GreenhouseFunnelHeaderControls`,
  `GreenhouseFunnelKpiStrip`, `GreenhouseFunnelStageRail`,
  `GreenhouseFunnelStageSegment`, `GreenhouseFunnelDiagnosticsGrid`.
- **Assisted analysis:** `GreenhouseNexaGreeting kind='funnelStageAdvisor'`
  con `askBadgeVariant='animated'`.
- **Kinds iniciales:** `cscPipeline`, `commercialLifecycle`, `quoteToCash`,
  `onboardingActivation`, `custom`.

### Cuándo usarlo

Usar este patrón cuando el usuario debe responder preguntas como:

- dónde se concentra la caída o el atraso;
- qué etapa concentra bloqueos;
- si el SLA o freshness cambia la prioridad operativa;
- qué conversación conviene abrir con Nexa antes de actuar.

No usarlo para charts de conversión simples, scorecards aisladas o dashboards
donde no existe una secuencia operacional clara. Para funnels verticales puros,
Recharts puede seguir siendo la base visual; para pipeline horizontal rico, el
rail vive dentro de `GreenhouseFunnelStageRail`.

### Reglas de composición

- El patrón combina **contexto ejecutivo** (header + controles), **señales
  rápidas** (KPI strip), **lectura secuencial** (stage rail), **diagnóstico
  operativo** (grid/tabla) y **asistencia conversacional** (Nexa).
- La asistencia conversacional del funnel usa el badge canónico
  `GreenhouseNexaAnimatedAskBadge`; no copiar el pill ni animar un badge local.
  Otros greetings mantienen badge estático por default.
- `stageRole` representa el rol de proceso de la etapa; `health`/diagnostics
  representan salud operativa. No mezclar ambos contratos.
- Nuevos workflows entran como `kind` y resuelven a una `variant`; no deben
  copiar JSX ni geometría del rail.
- Las zone primitives se extienden solo cuando cambia una responsabilidad local
  de esa zona.
- El patrón debe mantener summary accesible, selección por teclado,
  reduced-motion y señales no dependientes solo del color.

### Evidencia viva

Hoja interna: `/admin/design-system/charts`.

Scenario GVC: `design-system-charts`, región
`data-capture='funnel-primitive-anatomy'`.


## Error Handling & Feedback Patterns (TASK-236)

### Fetch error states

Toda vista que hace `fetch()` client-side DEBE tener un estado `error` con feedback accionable. Nunca dejar un spinner girando indefinidamente.

```tsx
const [error, setError] = useState<string | null>(null)

const loadData = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    const res = await fetch('/api/...')
    const json = await res.json()
    setData(json)
  } catch {
    setError('No pudimos cargar los datos. Verifica tu conexión e intenta de nuevo.')
    setData(null)
  } finally {
    setLoading(false)
  }
}, [...])

// En el render:
{loading ? (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
    <CircularProgress />
    <Typography variant='body2' color='text.secondary'>Cargando datos...</Typography>
  </Box>
) : error ? (
  <EmptyState
    icon='tabler-cloud-off'
    title='No pudimos cargar los datos'
    description={error}
    action={<Button variant='outlined' onClick={() => loadData()}>Reintentar</Button>}
  />
) : /* render normal data */}
```

### Mutation feedback (toasts)

Toda mutación (POST, PATCH, PUT, DELETE) debe mostrar feedback via toast:

```tsx
import { toast } from 'react-toastify'

// Después de mutation exitosa:
toast.success('Cambios guardados')

// En catch de mutation fallida:
toast.error('No se pudieron guardar los cambios. Intenta de nuevo.')
```

### Loading text contextual

Los spinners standalone deben incluir texto descriptivo en español:

- "Cargando servicios..." (no solo CircularProgress sin texto)
- "Cargando detalle del servicio..."
- "Calculando métricas ICO..."

### Empty states para tablas vacías

Toda tabla que puede estar vacía debe usar `EmptyState` (no tabla vacía silenciosa):

```tsx
items.length === 0 ? (
  <EmptyState
    icon='tabler-package-off'
    animatedIcon='/animations/empty-inbox.json'
    title='Sin servicios'
    description='No se encontraron servicios con los filtros seleccionados.'
  />
) : /* render table */
```

### Vistas que ya implementan este patrón

| Vista | Error state | Empty state | Toast | Loading text |
|-------|------------|------------|-------|-------------|
| Agency ServicesListView | Retry button | EmptyState animado | — | Contextual |
| Agency ServiceDetailView | Error/not-found | EmptyState | — | Contextual |
| Agency StaffAugmentationListView | Retry button | EmptyState animado | — | Contextual |
| Agency PlacementDetailView | Error/not-found | EmptyState | Onboarding update | Contextual |
| Agency CreatePlacementDialog | Alert inline | — | Placement creado | — |
| Agency Workspace (3 lazy tabs) | Retry button | — | — | Skeletons |


## Breadcrumbs Pattern

Para vistas de detalle con jerarquía de navegación, usar la primitive
canónica `GreenhouseBreadcrumbs`. La primitive envuelve MUI Breadcrumbs para
mantener semántica accesible y aplica el contrato AXIS del nodo Figma
`205:234905`.

```tsx
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'

<GreenhouseBreadcrumbs
  kind='pageHierarchy'
  items={[
    { label: 'Agencia', href: '/agency' },
    { label: 'Organizaciones', href: '/agency/organizations' },
    { label: organization.name }
  ]}
/>
```

**Reglas:**
- Breadcrumbs reemplazan botones "Volver a X" — no duplicar ambos.
- Cada nivel intermedio es un link real; el último nivel es texto estático con
  `aria-current='page'`.
- `kind='pageHierarchy'` usa la variante `default`; `kind='workbenchHierarchy'`
  usa la variante `compact` para headers densos, inspectors y workbenches.
- El separator canónico es `/`; el wrapper legacy `Breadcrumb` conserva chevron
  solo por compatibilidad.
- Iconos son opcionales por item y deben reforzar jerarquía/brand context, no
  decorar todos los breadcrumbs productivos por defecto.
- Hoja viva: `/admin/design-system/breadcrumbs`; scenario GVC:
  `design-system-breadcrumbs`.


## Progressive Disclosure Pattern (TASK-237)

Para vistas data-dense con más de 10 tarjetas en scroll vertical, usar **Accordion colapsable** para agrupar secciones secundarias:

```tsx
<Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
  <Accordion disableGutters elevation={0}>
    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <i className='tabler-heartbeat' style={{ fontSize: 20 }} />
        <Typography variant='h6'>Salud de entrega</Typography>
        <CustomChip size='small' round variant='tonal' color='success' label='Mejorando' />
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      {/* contenido colapsable */}
    </AccordionDetails>
  </Accordion>
</Card>
```

**Reglas:**
- KPIs primarios siempre visibles (no colapsar)
- Charts siempre visibles (no colapsar)
- Scorecards/tablas siempre visibles
- Reports detallados → Accordion colapsado por defecto
- Cada Accordion summary muestra chip con estado/resumen para que el usuario sepa si vale la pena expandir
- Implementado en: Agency ICO Engine tab (3 Accordions para performance report)
