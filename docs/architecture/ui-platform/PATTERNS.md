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

### Una acción que no puede tener efecto no se ofrece (TASK-1751)

Un control **deshabilitado sigue siendo una oferta**: comunica "esto se puede hacer, todavía no", e
invita a buscar cómo habilitarlo. Cuando la acción **no puede tener efecto en ningún camino desde este
estado**, la oferta es falsa y desvía al usuario de la acción que sí corresponde.

- **Si la acción es imposible en este estado → no renderizar el control.** El mensaje que explica por
  qué (banda, `EmptyState`, `Alert`) es lo que ocupa ese lugar, y dice qué hacer en su lugar.
- **Si la acción es posible pero falta un requisito que el usuario puede resolver acá → `disabled`**
  con el requisito dicho a la vista (helper text, validación, contador). El deshabilitado sólo se
  justifica cuando el camino a habilitarlo es visible en la misma pantalla.
- **Nunca deshabilitar en lugar de explicar.** Un control gris sin causa a la vista es la peor de las
  dos: ni ejecuta ni informa.

Aplica igual al botón **"Reintentar"** del bloque de error de arriba: el contrato canónico de error de
API expone `actionable` justamente para esto — con `actionable: false` la causa es estructural
(identidad no enlazada, permiso revocado, configuración faltante) y reintentar **no puede** resolverla,
así que el CTA no se renderiza y el `EmptyState` queda con la acción real (contactar a quien
corresponda). Contrato: `src/lib/api/canonical-error-response.ts` + `parse-error-response.ts` (ver
`CLAUDE.md` § *Canonical API error response contract*). El snippet de arriba renderiza "Reintentar"
incondicionalmente porque su `catch` sólo cubre fallas de red — en cuanto una vista propague `code` /
`actionable`, el CTA pasa a ser condicional.

> Evidencia: `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx:764` — con
> respuestas faltantes dentro de la ventana de gracia, el CTA de envío **no se renderiza**; la banda
> de estado explica por qué y la banda misma cambia de texto según la rama.

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


## Surface Chrome Pattern — el chrome va en la región `header`, nunca en `primary` (TASK-1307)

El **chrome** de una superficie es todo lo que la orienta pero no es el dato: breadcrumbs, título, subtítulo, controles de alcance (Space, período, dispositivo, preset), chip de frescura, leyenda de origen y la barra de tabs hermanas. Tiene un lugar declarado en la plataforma: la región **`header`** de `SurfaceRecipe`, que se renderiza **arriba** del `CompositionShell`, fuera del plano de las regiones. `regions.primary` es para el contenido.

Runtime de referencia: las tres pestañas de Search Visibility — `SeoOverviewView`, `SeoPerformanceView` y `KeywordOpportunitiesView` (`src/views/greenhouse/admin/growth/seo/{overview,performance,keywords}/`).

### El modo de falla que este patrón cierra

Las tres pantallas metían **todo** el chrome dentro de `regions.primary` sin usar nunca la región `header` que la propia primitive expone. Con `plane='none'` eso deja los controles como cajas de formulario **flotando sobre el lienzo gris**, sin superficie que los contenga. En 390 px es un scroll completo de chrome antes del primer dato: el control (secundario) ocupando más área que el contenido (primario).

Es un defecto que **pasa los gates**: tokens correctos, primitives correctas, lint y build verdes. Se ve mirando el frame — y se ve mal.

### Forma canónica

```tsx
<SurfaceRecipe
  kind='analyticsReport'
  plane='none'
  header={
    <Stack spacing={4}>
      <GreenhouseBreadcrumbs items={…} />
      <WorkbenchHeader
        kind='report'
        titleComponent='h1'
        title={…}
        description={…}
        meta={/* frescura; leyenda de origen sólo si aplica a TODA la pantalla */}
        secondaryActions={/* los controles de ALCANCE */}
        supporting={/* los tabs hermanos, bajo su divisor */}
      />
    </Stack>
  }
  regions={{ primary: renderBody() }}
/>
```

`WorkbenchHeader kind='report'` es la primitive del surface system diseñada exactamente para esto: resuelve a la variant `report`, un plano contenido editorial (`background.paper` + borde + radius `xl` + elevación `raised`). El chrome queda **contenido**, el contenido real queda abajo sobre el lienzo, y la jerarquía se lee sin esfuerzo.

### Reparto de las ranuras

| Ranura | Qué va | Criterio |
|---|---|---|
| `secondaryActions` | Controles de **alcance**: Space, período, dispositivo, granularidad, presets. | Es lo que el operador **cambia**. |
| `meta` | **Hechos sobre el dato**: frescura (`Datos al …`), leyenda de origen. | Se lee, no se toca. |
| `supporting` | Los **tabs hermanos**. La primitive los baja bajo su propio divisor. | Cabecera con pestañas clásica. |
| `primaryAction` | A lo más una. | Un header tiene una sola primaria. |

Una leyenda que describe **una** card (p. ej. las series de un gráfico) no es chrome de la pantalla: vive **junto al gráfico que describe**, no en `meta`. En Search Visibility, el Overview conserva la leyenda ●/◑ en `meta` porque aplica a toda la superficie; Rendimiento la mudó a la card del gráfico.

### Consecuencia estructural: los controles sobreviven a los estados del cuerpo

La cabecera se renderiza **siempre**, fuera del cuerpo y de sus estados. Por lo tanto los controles de alcance quedan disponibles **también en los estados vacíos, degradados o denegados**.

Antes había que **duplicarlos dentro de cada superficie de estado** para que un Space sin conexión no dejara al operador sin forma de cambiar de Space. Esa duplicación desapareció al mover el chrome a `header`: un solo lugar declara el alcance y el cuerpo sólo responde a él. Si te encuentras copiando un selector dentro de un `EmptyState`, el chrome está en la región equivocada.

### Coherencia entre pantallas hermanas

Cuando varias pantallas son pestañas de una misma superficie (comparten breadcrumb, título y barra de tabs), su cabecera debe ser **la misma composición**: mismo `kind`, mismo reparto de ranuras, mismo orden. **Dos pantallas hermanas resolviendo su chrome de dos formas distintas es un defecto aunque cada una se vea bien por separado** — el operador cruza entre ellas y la superficie se le mueve bajo los pies.

### Controles de formulario en móvil

En `xs` un control de alcance ocupa la **fila completa** (`flex: { xs: '1 1 100%', md: '0 0 auto' }`). Ponerlos 2-up ahorra una fila pero trunca el valor vigente (`Últimos 90 …`), y **un control cuyo valor actual no se puede leer deja de ser un control**: cuesta más que la fila que ahorra.

Corolario del mismo criterio: el motivo de un control va como `helperText`, no como tooltip — un tooltip sobre un control de formulario se esconde justo cuando el usuario lo abre.

### Reglas

- ✗ **NUNCA** pongas el chrome de la pantalla dentro de `regions.primary`. Va en `header`.
- ✗ **NUNCA** dejes un control de alcance sobre el lienzo desnudo. Es un defecto de composición, no una preferencia estética.
- ✗ **NUNCA** dupliques un control de alcance dentro de una superficie de estado; sube el chrome al header.
- ✓ Con `plane='none'` (contenido que ya es una composición de cards), el header contenido es **la** superficie que sostiene el chrome; sin él, no queda ninguna.
- ✓ Pantallas hermanas = misma composición de cabecera, verificada en el mismo frame desktop + 390 px.


## Route Tabs Pattern — tabs que navegan NO son un `tablist` (TASK-1306)

Cuando las "tabs" de una superficie son **links a rutas hermanas** (deep-link, back/forward del browser y URL compartible funcionando solos) y no un conmutador de paneles en memoria, el contrato ARIA correcto **no** es el de tabs.

Runtime de referencia: `SeoSearchVisibilityTabs` (`src/views/greenhouse/admin/growth/seo/overview/`), conmutador de `/admin/growth/seo{,/performance,/keywords,/audit}` bajo un mismo viewCode.

**Regla 1 — `CustomTabsNav` (Tabs plano) + `role='navigation'`, NO el `TabList` de `@mui/lab`.** Con el rol `tablist` por defecto, axe exige `aria-required-children` (cada hijo `role=tab`) y un `aria-controls` apuntando a un panel real. Ninguno de los dos se puede cumplir acá: **el "panel" es la página siguiente**, que Next monta después de navegar.

Y el problema no se arregla sólo declarando el rol: el `TabList` de `@mui/lab` **clona cada `Tab` inyectándole un `aria-controls`** hacia un `TabPanel` que no existe (axe lo marca `aria-valid-attr-value` critical) y ese clone **pisa cualquier override del consumer**. Por eso existe `CustomTabsNav` (`src/@core/components/mui/TabList.tsx`, TASK-1307): un `MuiTabs` plano con el mismo styling pill. Emite las **mismas clases** (`.MuiTabs-*` / `.MuiTab-root`), así que el estilo se comparte por CSS sin duplicarlo; lo único que cambia es que nadie fabrica ARIA hacia paneles fantasma. Cada `Tab` activo lleva `aria-current='page'`.

```tsx
<CustomTabsNav role='navigation' value={activeTab} variant='scrollable' pill='true' aria-label={…}>
  <Tab component={Link} href={…} aria-current={isActive ? 'page' : undefined} … />
</CustomTabsNav>
```

**Regla 2 — para un tab no disponible, `aria-disabled` + `title` nativo, NUNCA `<Tooltip><span><Tab/></span></Tooltip>`.** Envolver el `Tab` en un `<span>` rompe **dos** cosas a la vez:

1. `Tabs` inyecta props de contexto (`fullWidth`, `indicator`, `selectionFollowsFocus`, `textColor`) en sus **hijos directos**. Con el wrapper, esas props aterrizan en el `<span>` del DOM → **4 errores de React en consola** por atributos desconocidos.
2. Rompe el contrato ARIA del tablist (el hijo directo deja de ser el tab).

Y aunque no rompiera nada: un control `disabled` no dispara hover, así que el tooltip con el motivo **nunca se vería**. El patrón canónico es `aria-disabled='true'` + `title` + `onClick` que previene + `opacity` bajada con `pointerEvents: 'auto'` para que el `title` sí aparezca.

**Regla 3 — un tab que navega a un 404 es peor que un tab deshabilitado.** Las rutas hermanas todavía no construidas se declaran con un flag (`available: false`) y un hint que dice **por qué** no está; al aterrizar cada hermana se le quita el flag — un cambio de una línea, no un refactor del conmutador.

**Regla 4 — en móvil, que los tabs QUEPAN; nada de `allowScrollButtonsMobile` (TASK-1307).** Con `variant='scrollable'`, `allowScrollButtonsMobile` parece la respuesta obvia al desborde y es la equivocada: en 390 px las dos flechas se comen ~80 px y terminan **tapando el tab ACTIVO** (se leía `Rendimie…` recortado bajo la flecha). El gesto de arrastre ya existe en táctil, así que las flechas no agregan una forma de navegar — sólo restan ancho al contenido que estorban.

La salida es hacer que los tabs entren. En `xs` se oculta el ícono de cada tab y se aprieta el padding; el label identifica el destino igual de bien y los cuatro caben sin recorte:

```tsx
<CustomTabsNav
  variant='scrollable'
  scrollButtons='auto'   // sin allowScrollButtonsMobile
  sx={{
    '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'inline-flex' } },
    '& .MuiTab-root': { paddingInline: { xs: 3, sm: 5 }, minInlineSize: 0 }
  }}
>
```

Generalizable: **un affordance de scroll que tapa el elemento activo es peor que el desborde que iba a resolver.** Antes de agregar flechas, reduce el contenido a lo que identifica (label sin ícono, padding menor).

**Cuándo NO usar este patrón:** si el contenido conmuta en memoria sin cambiar la URL, es un `tablist` de verdad y va con `TabPanel` + `aria-controls` reales.


## Public Anonymous Surface Shell Pattern

Usar este patrón para superficies públicas sin sesión donde una persona externa
debe leer una oferta, completar un formulario o avanzar en un flujo tokenizado
sin entrar al portal autenticado.

### Taxonomía

- **Pattern:** `Public Anonymous Surface Shell`.
- **Primer runtime:** `CareersPublicShell` en
  `src/components/greenhouse/careers/`.
- **Rutas iniciales:** `/public/careers`, `/public/careers/[publicId]`,
  `/public/careers/[publicId]/apply`.
- **Futuros consumers previstos:** assessment público tokenizado
  (`/assessment/[token]`) y otras superficies de intake sin sesión.

### Cuándo usarlo

Usar cuando la superficie:

- es pública o tokenizada;
- no debe montar navegación del portal interno;
- necesita marca Efeonce institucional, estado de locale y footer legal;
- consume readers/commands server-side gobernados en vez de escribir datos desde
  el cliente.

No usarlo para vistas autenticadas, workbenches internos, dashboards de cliente
ni páginas del Design System. Es un shell público, no un reemplazo de
`CompositionShell` para producto interno.

### Reglas de composición

- Header y footer usan marca Efeonce; no exponer Greenhouse como producto interno.
- La ruta conserva `main#gh-main`, skip link y back navigation explícita cuando
  hay jerarquía pública.
- El contenido de negocio vive en componentes de dominio y debe consumir payloads
  allowlist. En Careers, listing/detail consumen `PublicOpeningPayload`; el apply
  postea al command público de Hiring.
- Copy visible vive en `src/lib/copy/*`; el shell recibe `copy`/`locale`.
- Formularios públicos deben usar confirmación y error genéricos cuando el dominio
  pueda filtrar existencia, dedupe, PII o estado interno.
- GVC mínimo: home/detail/apply desktop y mobile 390, consola limpia y
  `scrollWidth == clientWidth`.

### Evidencia viva

- TASK-354: `/public/careers/**`.
- GVC local:
  `.captures/2026-07-09T00-50-00_inline-public-careers`,
  `.captures/2026-07-09T00-50-13_inline-public-careers-eo-opn-0006` y
  `.captures/2026-07-09T00-50-13_inline-public-careers-eo-opn-0006-apply`.


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

## Nexa Chat Pattern (TASK-1078)

La superficie **conversacional canónica de Nexa**. Es un **patrón compuesto** (organismo platform-level), no una primitive suelta — misma categoría que el `NexaInsightsBlock`. Toda superficie donde aparezca Nexa como chat (botón flotante global, Home, futuros sidecars) **reusa este patrón + sus primitives**, sin forkear chats paralelos por pantalla.

**Página DS:** `/design-system/nexa-chat` (catálogo `Patterns` · kind `Pattern`). **Spec:** `docs/tasks/in-progress/TASK-1078-...md`. **Mockup vivo:** `/nexa/floating-chat/mockup`.

### Anatomía (5 regiones)

1. **Header de presencia** — cara real de Nexa + wordmark Poppins + estado "En línea" con ping vivo + controles circulares (nueva conversación `+` / expandir / cerrar, mismo hover).
2. **Rail de conversaciones (glass)** — glassmorfismo blanco (`backdrop-filter`, panel transparente + secciones con su fondo); buscador con filtro, grupos temporales con jerarquía label↔ítem, item activo = píldora tintada, kebab de acciones (hover/focus), estados empty / filtered-empty.
3. **Cuerpo de conversación** — thread headless (`@assistant-ui/react`) con avatar por-mensaje + **runtime propio keyed** → nueva conversación limpia y fluida (fade); el empty hero se decide por `messages.length === 0`.
4. **Empty hero** — saludo **rotativo por nombre** (rota con cada nueva conversación) + chip de contexto + grilla de **prompts contextuales** (por ruta/entidad/rol) + **firma de marca Efeonce** sutil (wordmark gris sólido vía `mask`, **solo aquí**).
5. **Composer** — input sobre blanco (sin box propio) envuelto en `NexaGlowBorder` + botón enviar navy↔teal compacto + disclaimer de confianza.

### Primitives que lo componen

| Pieza | Rol | Estado |
|---|---|---|
| `NexaGlowBorder` | Borde "línea de luz" del composer (dos capas + máscara + beam, reduced-motion horneado). | Primitive canónica ✅ |
| `NexaComposer` | Input + botón enviar + glow como unidad reusable; variant `command` para cajas compactas con Nexa mark + shortcut. | Primitive canónica ✅ |
| `NexaKnowledgeAnswerSurface` | Respuesta con evidencia: pregunta-burbuja, respuesta Nexa, composer descendido y proof panel lateral/inline. | Composition primitive ✅ |
| `NexaEvidencePanel` | Renderer compartido de evidence packets versionados (`nexa-evidence.v1`): trace, fuentes, confidence, freshness, filtered count y feedback. | Primitive canónica ✅ |
| `NexaPresenceMark` / `NexaPresenceHeader` | Cara/mark + nombre + dot "En línea" con ping. | A extraer ⏳ |
| `NexaSenderMark` | Avatar por-mensaje (disco navy + glyph teal/sparkle blanco inline-SVG). | A extraer ⏳ |
| `NexaConversationRail` | Rail de historial glass (search + grupos + items + estados). | Parte del patrón |
| `NexaEmptyHero` | Saludo + chip de contexto + prompts + firma. | Parte del patrón |
| `GreenhouseFloatingSurface` / `AdaptiveSidecarLayout` | Anclaje del panel (modo expandible) / lane (modo C). | Primitives reusadas |

### Modos de interacción (preferencia user-facing futura)

- **Dock compacto (A)** — el más liviano, panel chico anclado. `[deferred]`
- **Panel expandible (B)** — compacto ↔ ancho con rail de historial. Concepto vigente.
- **Lane sidecar (C)** — full-height in-flow (`AdaptiveSidecarLayout`), el contexto principal sigue visible. `[deferred-but-committed]`

### Reglas

- ✓ Reusar este patrón + sus primitives en toda superficie de Nexa-como-chat.
- ✓ Para respuestas con evidencia/citas, usar `NexaKnowledgeAnswerSurface kind='knowledgeAnswerTrace'` en vez de crear cards de respuesta locales.
- ✓ Empty hero: saludo rotativo + prompts contextuales + firma Efeonce **solo** en empty state.
- ✓ Composer siempre vía `NexaComposer` / `NexaComposerInput`; para cajas tipo "Pregúntale a Nexa" usar `kind='knowledgeAsk'` en vez de copiar `NexaGlowBorder` + mark + shortcut localmente.
- ✗ No crear un chat de Nexa paralelo por pantalla ni reimplementar composer/rail.
- ✗ No usar la firma Efeonce fuera del empty state ni la cara real per-mensaje (ahí va el mark).
- ✗ Prompts: NUNCA hardcodear el set; derivar del contexto (Tier 1 frontend resolver, Tier 2 backend data-aware — ver TASK-1078 follow-ups).

### Nexa Knowledge Answer Surface (TASK-1089)

`NexaKnowledgeAnswerSurface` es la primera **composition primitive transversal** para respuestas de Nexa con evidencia. Resuelve el patrón elegido del product-design loop opción 3: la pregunta no desaparece ni se convierte en un campo readonly; sube a burbuja, Nexa responde debajo y el composer glow baja bajo la respuesta para continuar la conversación. El modo conversacional es condicional: antes de un submit válido mantiene un idle limpio con composer glow, sin respuesta falsa, proof panel ni trace rail prematuro; después del submit muestra la coreografía pregunta-burbuja → identidad Nexa → respuesta → composer de follow-up → proof/provenance disponible. En la implementación Knowledge actual el proof panel conserva `Fuentes | Cómo llegó | Paquete | Revisión`; TASK-1095/TASK-1096 deben evolucionar el default hacia trust cue compacto + proof bajo demanda.

**Variants:**

- `conversationTrace`: lane conversacional + trace steps + proof sidecar en desktop (inline en mobile).
- `overviewPanel`: reservado para el modo tipo AI Overview compacto; sin trace rail completo.
- `toolResult`: presentación compacta de una respuesta con evidencia de tool operacional, sin crear una shell nueva.

**Kinds:**

- `knowledgeAnswerTrace` → `conversationTrace`; primer consumer `/knowledge/mockup/answer-trace`.
- `knowledgeToolResult` → `toolResult`; usa el mismo evidence renderer que el chat.

**Reglas:**

- La primitive es **props-only**: no consulta tablas, no llama APIs y no decide retrieval. Puede recibir un `ConversationalEvidencePacket` (`nexa-evidence.v1`) ya derivado desde `knowledge-search.v1` y renderizarlo con `NexaEvidencePanel`.
- Reusar `NexaComposer kind='knowledgeAsk'`, `NexaSenderMark`, `GreenhouseThinkingBeat`, `GreenhouseChip` y `GreenhouseButton`.
- Para follow-ups dentro de una conversación, usar `NexaComposer kind='inlineFollowUp'`; `knowledgeAsk` queda para la caja command superior.
- Motion breve y semántica `aria-live` para el estado de thinking; reduced-motion desactiva entradas decorativas.
- Mantener proof/provenance disponible y grounded; en V2 no debe desplazar la respuesta ni el follow-up por defecto. El default deseado es trust cue compacto y proof expandible bajo demanda.

No usar el mockup como prueba de retrieval real: usa data tipada. Para evidencia del renderer real del packet, usar los specimens `nexa-knowledge-answer-surface-specimen` y `nexa-knowledge-tool-trace-specimen` del lab `/design-system/nexa-chat` y el scenario GVC `design-system-nexa-chat`.

### Conversational Evidence V1 (TASK-1093)

`ConversationalEvidencePacket` (`src/lib/nexa/conversational-evidence.ts`) es el view-model común para evidence conversacional. V1 deriva desde `knowledge-search.v1` y preserva query, confidence, freshness, denied/filtered count, source URLs/human URLs, citation labels, scores y target de feedback. La UI no re-lee tablas ni re-ejecuta tools: `NexaToolRenderers` y `NexaKnowledgeAnswerSurface` consumen el mismo packet y lo renderizan con `NexaEvidencePanel`.

Los threads históricos rehidratados vuelven con tool-calls cuando `greenhouse_ai.nexa_messages.tool_invocations` trae payload seguro; si un thread antiguo no tiene evidence, el runtime conserva el texto y degrada sin romper la conversación.

## Runtime sin React — shell «Efeonce ID» (TASK-1835)

Patrón para una superficie de producto que **no puede ejecutar el DS del portal**: el authorization
server (`services/auth-server`) corre sobre `node:http`, sin React, sin Next y sin MUI, y sirve HTML
compuesto como strings bajo una CSP `default-src 'none'` con estilos por hash.

Se registra acá para que **no nazcan copias**: cualquier otro servicio Efeonce que necesite pintar
una pantalla fuera del portal usa este patrón, no un segundo sistema visual.

### Reglas

- **Los tokens se generan, no se transcriben.** `scripts/auth-server/styles.ts` deriva el CSS desde
  el SSOT (AXIS + `typography-tokens`) hacia `styles.generated.ts`, con drift test
  (`brand-assets.test.ts`) que compara el artefacto contra el generador. **NUNCA** un HEX, un px o
  un `font-family` literal en las plantillas.
- **Los assets de marca se bundlean normalizados.** SVG institucionales pasan por `sanitizeBrandSvg`
  a `fill="currentColor"`: un `<style>` embebido dentro del SVG lo bloquea la CSP por hash y la
  figura sale negra con el build verde.
- **Una clase, una superficie.** El shell tiene dos fondos opuestos —lienzo oscuro y tarjeta clara—
  y una clase compartida entre ambos arrastra el color del otro. Costó un texto a 1.53:1 en el
  consentimiento (TASK-1835): `.id-context` servía a la ficha sobre el azul y al bloque del destino
  dentro de la tarjeta. **NUNCA** reusar una clase de texto entre dos fondos distintos.
- **El contraste se mide sobre píxeles.** axe no puede resolver un fondo con degradado o
  pseudo-elemento: devuelve `incomplete`, y el gate lo lee como `violations: 0`. El mecanismo real
  es `pnpm auth-server:verify-contrast`, que muestrea la captura. **NUNCA** leer un cero de axe como
  evidencia de contraste en una superficie con fondo compuesto.
- **El JS del navegador es un artefacto generado y servido por nonce.** Fuente en
  `src/lib/auth-server/persons/*-controller.ts`, bundle por esbuild con drift guard, `<script nonce>`
  y `script-src 'nonce-…'` añadido a la CSP de ESA respuesta. La forma canónica de servir una página
  con controlador (`renderLoginPageResponse`) exige el nonce en su tipo de entrada: sin eso el
  navegador bloquea el script **en silencio** y el control queda pintado pero muerto.
- **Ninguna pantalla es un callejón sin salida.** Toda página ofrece una acción, salvo las
  declaradas terminales con su razón. `page-contract.test.ts` lo afirma pantalla por pantalla, junto
  con la CSP de cada una y la anti-enumeración.

### Evidencia viva

`src/lib/auth-server/oauth/pages/**` · `src/lib/auth-server/persons/pages.ts` ·
`docs/ui/reviews/TASK-1835-efeonce-id-login-consent-screens-review.md`
