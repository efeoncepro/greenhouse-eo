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
