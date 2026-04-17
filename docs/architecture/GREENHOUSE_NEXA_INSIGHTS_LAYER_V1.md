# Greenhouse — Nexa Insights Layer Architecture

## Delta 2026-04-17 — Historial advisory append-only para timeline y weekly digest

- Runtime activo:
  - Nuevo archivo histórico `greenhouse_serving.ico_ai_signal_enrichment_history` con escritura append-only por run de LLM
  - `ico_ai_signal_enrichments` se mantiene como snapshot current-state del período activo; no cambia el contrato de las surfaces "Recientes"
  - Los summary readers scoped de Person 360 y Space 360 exponen `summarySource`, `activeAnalyzed`, `historicalAnalyzed`, `activePreview` y `historicalPreview`; el reader decide explícitamente si la surface visible representa estado activo o memoria histórica
  - `readAgencyAiLlmTimeline`, `readMemberAiLlmTimeline` y `readSpaceAiLlmTimeline` ahora leen desde historial, deduplicado por `enrichment_id` con `DISTINCT ON`
  - `src/lib/nexa/digest/build-weekly-digest.ts` ahora arma el corte semanal desde historial deduplicado, no desde el snapshot vigente
- Contrato operativo:
  - una señal que desaparece del set actual por mejora operativa deja de verse en "Recientes", pero sigue viva en timeline y en el weekly digest de su ventana histórica
  - las surfaces que muestran summary scoped ya no dependen de un fallback implícito; consumen un payload que declara si la data visible es `active`, `historical` o `empty`
  - reruns del mismo enrichment no duplican timeline/digest: el consumer colapsa a la última versión por `enrichment_id`
  - esto evita pérdida silenciosa de contexto semanal/mensual en People, Space 360, Home y Agency

## Delta 2026-04-17 — Historial activado en las 4 superficies Nexa (Agency, Home, Space 360, Person 360)

- Runtime activo:
  - Nuevos readers scoped: `readMemberAiLlmTimeline(memberId, limit=20)` y `readSpaceAiLlmTimeline(spaceId, limit=20)` en `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — mismo patrón que `readAgencyAiLlmTimeline` pero filtrando por `member_id` / `space_id` respectivamente, status='succeeded', sin filtro de período
  - `readMemberAiLlmSummary` y `readSpaceAiLlmSummary` fetchean su timeline scoped en paralelo via `Promise.all` — zero latency extra en el critical path
  - `MemberNexaInsightItem` / `SpaceNexaInsightItem` / `HomeNexaInsightItem` ganan `processedAt: string` (requerido); todos los mappers lo propagan
  - `MemberNexaInsightsPayload` / `SpaceNexaInsightsPayload` / `HomeNexaInsightsPayload` ganan `timeline: <Item>[]` (requerido, default array vacío)
  - `get-home-snapshot.ts` mapea `insightsSummary.timeline` (agency-wide, ya fetcheado) via `mapHomeInsight` → Home hereda el timeline del scope agency
  - `HomeView`, `OverviewTab` (Space 360) y `PersonActivityTab` (Person 360) pasan `timelineInsights={payload.timeline ?? []}` a `NexaInsightsBlock`
- Contrato operativo:
  - Cada superficie muestra su cadencia **scoped**: Home → sistema-wide, Space 360 → ese space, Person 360 → ese miembro. No hay drift de datos entre contextos
  - El toggle Recientes/Historial aparece automáticamente en las 4 superficies cuando hay data — sin wiring adicional en consumers futuros
  - Backward compatible: `timelineInsights` sigue siendo opcional en `NexaInsightsBlock`; callers que no lo pasen simplemente no muestran el toggle
  - Los tests fixture se actualizaron para reflejar `processedAt` y `timeline: []` — el contrato queda reforzado por TypeScript

## Delta 2026-04-17 — NexaInsightsBlock gana modo Historial (timeline) además de Recientes

- Runtime activo:
  - Nuevo reader `readAgencyAiLlmTimeline(limit=20)` en `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — ordena por `processed_at DESC`, filtra `status='succeeded'`, **no aplica filtro de período** (cross-period)
  - `readAgencyAiLlmSummary` fetchea `recentEnrichments` + `timeline` en paralelo vía `Promise.all` — zero latency añadida al critical path
  - `AgencyAiLlmSummary` extendido con `timeline: AgencyAiLlmSummaryItem[]`
  - Nuevo componente `src/components/greenhouse/NexaInsightsTimeline.tsx` — MUI Lab `Timeline` agrupada por día con labels "Hoy"/"Ayer"/fecha, dots severity-coded (`critical=error`, `warning=warning`, `info=info`, `null=grey outlined`)
  - `NexaInsightsBlock` incorpora `ToggleButtonGroup` (Recientes | Historial) que solo aparece cuando `timelineInsights` llega con data — backward compatible
  - `IcoAdvisoryBlock` mapea `AgencyAiLlmSummary.timeline` → `NexaTimelineItem[]` y lo pasa via prop
- Contrato operativo:
  - Timeline es cross-period e incluye últimas 20 señales succeeded del sistema — responde la pregunta "¿cuántas señales ha habido esta semana/mes?" sin salir del bloque
  - Modo default sigue siendo "Recientes" (período actual) — sin regresión visual para usuarios que no accionan el toggle
  - Cada item del timeline reutiliza `NexaMentionText` para chips clickeables y `NexaInsightRootCauseSection` para causa raíz — coherencia total con vista Recientes
  - Severidad nunca se comunica solo por color: chip textual + dot color redundantes (WCAG 2.2 AA)
  - Keyboard: Tab al toggle, Enter/Space activa; ARIA `role="region"` + `aria-label` en timeline
  - Preferencia de vista es local al componente (no persistida) — el operador elige por sesión

## Delta 2026-04-17 — TASK-446 expone `rootCauseNarrative` end-to-end en UI, Weekly Digest y API

- Runtime activo:
  - El campo `root_cause_narrative` (ya generado y persistido desde `ico_signal_enrichment_v4` / `finance_signal_enrichment_v1`) ahora fluye por los 7 readers del serving layer a la UI
  - `NexaInsightsBlock` renderiza sección colapsable "Causa raíz" via `NexaInsightRootCauseSection.tsx` con localStorage global `nexa.insights.rootCause.expanded`, ARIA completo y keyboard nav
  - Weekly Executive Digest incluye bloque "Causa probable" con left border `EMAIL_COLORS.primary` cuando el campo viene poblado
  - Mappers consumer (`IcoAdvisoryBlock`, `get-home-snapshot`, `HomeNexaInsightItem`) propagan el campo; `NexaInsightItem.rootCauseNarrative` pasó de opcional a required nullable para que TypeScript flaggee futuros consumers que lo olviden
- Contrato operativo:
  - Sin cambios al prompt ni a las tablas (la columna existía); el cambio es puramente de surfacing
  - Enrichments antiguos sin el campo no rompen la UI: la sección no renderiza y el digest omite el bloque
  - Funcionalmente separa "qué pasó" (explanation), "por qué" (rootCauseNarrative), "qué hacer" (recommendedAction) — contrato canónico que los consumers ya pueden asumir vigente

## Delta 2026-04-17 — TASK-440 corrige labels técnicos de proyecto en Home, Space 360 y Person 360 sin abrir surfaces nuevas

- Runtime activo:
  - resolución canónica de proyecto por `space_id` + (`project_record_id` o wrapper/source IDs equivalentes como `notion_project_id` / `project_source_id`)
  - humanización de `dimension_label` para señales/root cause cuando existe label resoluble
  - sanitización backend de mentions y narrativa antes de persistir enrichments
  - persistencia mínima de metadata de resolución en `explanation_json.meta.projectResolution`
- Contrato operativo:
  - `llm-provider` ya no debe caer a `projectId` técnico cuando no hay label; la degradación visible canónica es `este proyecto`
  - la corrección ocurre en backend y beneficia automáticamente a `Pulse/Home`, `Space 360` y `Person 360` vía readers existentes
  - no se agrega route ni surface nueva; el cambio corrige calidad narrativa sobre la lane advisory ya materializada

## Delta 2026-04-16 — Weekly Executive Digest de Nexa queda operativo sobre ops-worker

- Runtime activo:
  - Builder: `src/lib/nexa/digest/build-weekly-digest.ts` agrega los top enrichments ICO-first de la última semana sobre `greenhouse_serving.ico_ai_signal_enrichments`
  - Recipients: `src/lib/nexa/digest/recipient-resolver.ts` resuelve liderazgo interno vía `getRoleCodeNotificationRecipients()` + filtro `getInternalUsersFromPostgres()`
  - Email: `src/emails/WeeklyExecutiveDigestEmail.tsx` + `src/lib/email/templates.ts` registran `weekly_executive_digest`
  - Worker: `services/ops-worker/server.ts` expone `POST /nexa/weekly-digest`
  - Scheduler: `services/ops-worker/deploy.sh` crea `ops-nexa-weekly-digest` cada lunes 07:00 `America/Santiago`
- Contrato operativo:
  - Este corte es **ICO-first y cross-Space**; la lane cross-domain queda preparada como follow-up y no debe asumirse implementada
  - El digest consume enrichments ya materializados; no recalcula métricas ni inferencias inline
  - El ranking visible conserva el orden canónico `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - Las menciones `space` y `member` se convierten en links HTML; `project` se mantiene como texto hasta que exista una ruta canónica de destino
  - El email es advisory-only e interno; no incluye payloads sensibles por cliente

## Delta 2026-04-16 — Finance Signal Engine (TASK-245) es el primer dominio fuera de ICO

- Finance Dashboard ya no depende solo de KPIs y P&L para explicar desvíos financieros mensuales.
- Runtime activo:
  - Detector: `src/lib/finance/ai/anomaly-detector.ts` — Z-score rolling 6 meses sobre `greenhouse_finance.client_economics` (net_margin_pct, gross_margin_pct, revenue_clp, direct_costs_clp, indirect_costs_clp, net_margin_clp)
  - Materializer: `src/lib/finance/ai/materialize-finance-signals.ts` escribe en `greenhouse_serving.finance_ai_signals`
  - LLM worker: `src/lib/finance/ai/llm-enrichment-worker.ts` con prompt domain-aware `finance_signal_enrichment_v1` y glosario financiero específico
  - Reader: `src/lib/finance/ai/llm-enrichment-reader.ts` expone `readFinanceAiLlmSummary(periodYear, periodMonth)` (portfolio) y `readClientFinanceAiLlmSummary(clientId, …)` (cliente)
  - UI: `src/views/greenhouse/finance/FinanceDashboardView.tsx` renderiza `NexaInsightsBlock` entre KPIs y Economic Indicators
  - API: `GET /api/finance/intelligence/nexa-insights` (reader), `GET /api/cron/finance-ai-signals` (trigger)
  - Cloud Run: `services/ico-batch/server.ts` añade `POST /finance/materialize-signals` y `POST /finance/llm-enrich`
- Contrato operativo:
  - Finance usa `client_id` + `organization_id` como dimensiones primarias (Finance es org/client-first, no space-first)
  - Tablas serving: `greenhouse_serving.finance_ai_signals`, `greenhouse_serving.finance_ai_signal_enrichments`, `greenhouse_serving.finance_ai_enrichment_runs`
  - IDs estables: `EO-FSIG-*`, `EO-FAIE-*`, `EO-FAIR-*`
  - El prompt financiero usa menciones `@[Nombre](client:CLIENT_ID)` y `@[Nombre](organization:ORG_ID)` además de `space:SPACE_ID`
  - Ranking visible sigue el patrón canónico: `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - Solo deteriorations se emiten como signals (improvements se consolidan en otras surfaces)
- Eventos outbox nuevos:
  - `finance.ai_signals.materialized` (`AGGREGATE_TYPES.financeAiSignals`)
  - `finance.ai_llm_enrichments.materialized` (`AGGREGATE_TYPES.financeAiLlmEnrichments`)

## Delta 2026-04-16 — Space 360 Overview ya consume insights Nexa filtrados por space

- `Agency > Space 360 > Resumen` ya no depende solo del snapshot operativo, finance y delivery para explicar desvíos del espacio.
- Runtime activo:
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts` expone `readSpaceAiLlmSummary(spaceId, periodYear, periodMonth, limit)`
  - `src/lib/agency/space-360.ts` incorpora `nexaInsights` al snapshot `Space360Detail`
  - `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` renderiza `NexaInsightsBlock` al inicio del Overview real
- Contrato operativo:
  - Space 360 consume enrichments ya materializados en `greenhouse_serving.ico_ai_signal_enrichments`; no recalcula señales ni narrativa inline
  - el filtro canónico es `space_id + period_year + period_month`, con lista visible restringida a `status = 'succeeded'`
  - el ranking visible sigue `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - la navegación contextual reutiliza el contrato actual de `@mentions` (`space` -> `Space 360`, `member` -> `People`) sin mutaciones automáticas
  - cuando no hay insights para el período, el bloque muestra el empty state compartido de Nexa en lugar de ocultarse

## Delta 2026-04-16 — Person 360 Activity ya consume insights Nexa filtrados por member

- `People > Person 360` ya no depende solo del snapshot operativo y las métricas ICO para explicar desvíos individuales.
- Runtime activo:
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts` expone `readMemberAiLlmSummary(memberId, periodYear, periodMonth, limit)`
  - `src/app/api/people/[memberId]/intelligence/route.ts` incorpora `nexaInsights` al payload del miembro
  - `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` renderiza `NexaInsightsBlock` al inicio de la surface visible de actividad/inteligencia
- Contrato operativo:
  - Person 360 consume enrichments ya materializados en `greenhouse_serving.ico_ai_signal_enrichments`; no recalcula señales ni narrativa inline
  - el filtro canónico es `member_id + period_year + period_month`, con lista visible restringida a `status = 'succeeded'`
  - el ranking visible sigue `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - la navegación contextual reutiliza el contrato actual de `@mentions` (`member` -> `People`, `space` -> `Space 360`) sin mutaciones automáticas
  - la integración se hace sobre la surface visible `activity`; no reabre el tab legacy `intelligence`

## Delta 2026-04-16 — Home/Pulse ya consume Top Insights cross-Space como surface read-only

- `Pulse` (`/home`) ya no depende solo de shortcuts, contexto de acceso y estado operativo básico para hacer visible la lane advisory de Nexa.
- Runtime activo:
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts` expone `readTopAiLlmEnrichments(periodYear, periodMonth, limit)`
  - `src/lib/home/get-home-snapshot.ts` incorpora `nexaInsights` al snapshot de Home
  - `src/views/greenhouse/home/HomeView.tsx` renderiza `NexaInsightsBlock` en la landing de `Pulse`
- Contrato operativo:
  - Home consume enrichments ya materializados en `greenhouse_serving.ico_ai_signal_enrichments`; no recalcula señales ni narrativa inline
  - el ranking visible sigue `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - la navegación contextual en Home sigue el contrato actual de `@mentions` (`space` -> `Space 360`, `member` -> `People`), sin introducir mutaciones ni acciones automáticas
  - el bloque sigue siendo advisory-only y reutiliza el mismo disclaimer/copy del componente compartido

> **Version:** 1.0
> **Creado:** 2026-04-05
> **Audience:** Agentes de implementación, arquitectos, product owners
> **Docs relacionados:**
> - `GREENHOUSE_MENTION_SYSTEM_V1.md` — formato de @mentions
> - `Greenhouse_ICO_Engine_v1.md` — contrato del ICO Engine y LLM lane
> - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Cloud Run workers y Scheduler canónicos

---

## 1. Qué es Nexa Insights Layer

Un sistema transversal que permite a cualquier módulo del portal Greenhouse:

1. **Generar señales operativas** (anomalías, predicciones, root causes, recomendaciones)
2. **Enriquecerlas con narrativa AI** (LLM enrichment vía Gemini)
3. **Mostrarlas en la UI** con componentes reutilizables y menciones interactivas

**Principio rector:** todo módulo que muestre métricas operativas puede —y debería— tener una capa de narrativa inteligente que explique el *por qué* y sugiera el *qué hacer*.

---

## 2. Arquitectura de la capa

```
┌─────────────────────────────────────────────────────────────────┐
│                       SIGNAL SOURCES                             │
│  Cada dominio tiene su propio detector de señales.               │
│  El contrato de salida es estandar.                              │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ ICO      │ Finance  │ Capacity │ HR/      │ [futuro dominio]    │
│ Engine   │ Engine   │ Engine   │ Payroll  │                     │
│ (activo) │ (futuro) │ (futuro) │ (futuro) │                     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SIGNAL STORE                                │
│  Domain-scoped tables (no tabla unificada)                       │
│                                                                  │
│  ICO:      greenhouse_serving.ico_ai_signals                     │
│            greenhouse_serving.ico_ai_signal_enrichments           │
│  Finance:  greenhouse_serving.finance_ai_signals (futuro)        │
│  Capacity: greenhouse_serving.capacity_ai_signals (futuro)       │
│                                                                  │
│  Contrato común por signal:                                      │
│  { signalId, signalType, entityScope, entityId, metricName,     │
│    severity, currentValue, expectedValue, explanation,           │
│    recommendedAction, confidence, processedAt }                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LLM ENRICHMENT PIPELINE                        │
│  Cloud Run: ico-batch-worker (us-east4)                          │
│  Modelo: Gemini 2.5 Flash (Vertex AI)                            │
│  Prompt: domain-aware con glosario, cadena causal, @mentions     │
│  Output: narrativa en español con spanglish, doble capa          │
│          (técnica + operativa), formato @[Nombre](type:ID)       │
│  Trigger: Cloud Scheduler (diario) o on-demand                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     UI COMPONENTS                                │
│  Reutilizables, domain-agnostic                                  │
│                                                                  │
│  NexaInsightsBlock    — Accordion con KPIs + lista de insights   │
│  NexaInsightCard      — Card individual con chips, narrativa     │
│  NexaMentionText      — Parser de @[Name](type:ID) → Chips      │
│  NexaDigestWidget     — Widget compacto para Home (futuro)       │
│                                                                  │
│  Props comunes:                                                  │
│  { insights: NexaInsightItem[], totalAnalyzed, lastAnalysis,    │
│    runStatus, defaultExpanded }                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CONSUMERS (surfaces)                        │
│                                                                  │
│  Activos:                                                        │
│  • Agency ICO tab (NexaInsightsBlock)                            │
│  • Space 360 Overview → NexaInsightsBlock filtrado por space_id  │
│  • Pulse / Home Dashboard → Top 3 insights cross-Space           │
│  • Person 360 Activity → filtrado por member_id                  │
│  • Nexa Chat Home (enrichments como contexto)                    │
│                                                                  │
│  Próximos (Tier 1):                                              │
│  • Tier 1 ya materializado: Space 360, Person 360 y Home         │
│                                                                  │
│  Futuros (Tier 2-3):                                             │
│  • Finance Dashboard → señales financieras                       │
│  • Campaign 360 → señales de campaña                             │
│  • Project Detail → señales de proyecto                          │
│  • Digest semanal → email con top insights                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Contrato estándar de señales

Cualquier engine que genere señales para Nexa Insights debe producir este contrato mínimo:

```typescript
interface NexaSignal {
  signalId: string                    // ID estable (EO-SIG-xxxx)
  signalType: 'anomaly' | 'prediction' | 'root_cause' | 'recommendation'
  entityScope: 'space' | 'member' | 'project' | 'organization' | 'business_unit'
  entityId: string                    // ID de la entidad afectada
  metricName: string                  // Código de la métrica (ej: 'ftr_pct', 'margin_pct')
  severity: 'info' | 'warning' | 'critical'
  currentValue: number | null
  expectedValue: number | null
  confidence: number | null           // 0-1
  generatedAt: string                 // ISO timestamp
}
```

Después del LLM enrichment:

```typescript
interface NexaEnrichedSignal extends NexaSignal {
  explanationSummary: string          // Narrativa con @mentions
  rootCauseNarrative: string          // Causa raíz + cadena causal
  recommendedAction: string           // Acción concreta
  qualityScore: number                // 0-100 (calidad del insight)
  promptVersion: string               // Trazabilidad
  promptHash: string
}
```

---

## 4. Componentes UI

### NexaInsightsBlock

Bloque Accordion reutilizable que muestra insights en cualquier surface.

```tsx
<NexaInsightsBlock
  insights={insights}          // NexaInsightItem[]
  totalAnalyzed={14}
  lastAnalysis="2026-04-05T03:45:00Z"
  runStatus="succeeded"
  defaultExpanded={false}
/>
```

**Ubicación:** `src/components/greenhouse/NexaInsightsBlock.tsx`

### NexaMentionText

Parser inline que convierte `@[Nombre](type:ID)` en MUI Chips clickeables.

```tsx
<NexaMentionText
  text="@[Sky Airlines](space:spc-123) tuvo una caída de FTR%"
  variant="body2"
/>
```

**Ubicación:** `src/components/greenhouse/NexaMentionText.tsx`
**Formato:** Ver `GREENHOUSE_MENTION_SYSTEM_V1.md`

### Reader pattern (para consumers)

Cada surface instancia el reader con su scope:

```typescript
// Space 360 — filtrado por space_id
const insights = await readSpaceAiLlmEnrichments(spaceId, periodYear, periodMonth)

// Person 360 — filtrado por member_id
const insights = await readMemberAiLlmEnrichments(memberId, periodYear, periodMonth)

// Home — top N cross-Space
const insights = await readTopAiLlmEnrichments(periodYear, periodMonth, 3)
```

---

## 5. Prompt strategy

### Actual (v3): prompt genérico para ICO

Un solo template con glosario de métricas ICO, cadena causal, instrucciones de narrativa y formato de @mentions. Sirve para las 3 métricas ICO actuales.

### Futuro: prompts domain-aware

Cuando se agreguen Finance/Capacity engines, el template se parametriza por dominio:

```typescript
const buildDomainPrompt = (domain: 'ico' | 'finance' | 'capacity') => {
  const base = BASE_PROMPT_LINES        // Instrucciones comunes
  const glossary = DOMAIN_GLOSSARY[domain]  // Glosario de métricas del dominio
  const causalChain = DOMAIN_CAUSAL_CHAIN[domain]  // Cadena causal del dominio
  return [...base, glossary, causalChain, MENTION_FORMAT, NARRATIVE_RULES].join('\n')
}
```

Cada dominio define su propio glosario y cadena causal. Las instrucciones de narrativa y formato de mención son compartidas.

---

## 6. Reglas operativas

### Qué va y qué no va en Nexa Insights

| Sí | No |
|----|----|
| Anomalías detectadas estadísticamente | Opiniones sin datos |
| Predicciones basadas en tendencias observadas | Predicciones inventadas |
| Root causes con evidencia dimensional | Especulaciones causales |
| Recomendaciones concretas y accionables | Recomendaciones genéricas |
| Narrativa en español con spanglish operativo | Inglés puro o jerga no-operativa |
| @mentions con IDs verificados | Nombres sin ID (puede confundir) |
| Labels visibles humanos para entidades resueltas | UUIDs, source IDs o `projectId` crudos en narrativa |
| Doble capa: técnica + operativa | Solo técnica o solo operativa |

### Disclaimer obligatorio

Todo bloque de Nexa Insights debe mostrar:

> "Generado por Nexa con IA. Verifica la información antes de actuar."

Definido en `GH_NEXA.disclaimer` (`greenhouse-nomenclature.ts`).

### Advisory-only

Los insights son **informativos** — nunca bloquean workflows, no ejecutan acciones automáticas, no modifican datos. El operador decide si actúa o no.

---

## 7. Extensibility: cómo agregar un nuevo dominio

### Paso 1: Signal Detector

Crear el detector de señales para el nuevo dominio (ej: `src/lib/finance/ai/anomaly-detector.ts`):
- Input: métricas materializadas del dominio
- Output: señales que cumplen el contrato `NexaSignal`
- Materializar en tabla serving: `greenhouse_serving.{domain}_ai_signals`

### Paso 2: Prompt domain-aware

Agregar glosario y cadena causal del dominio a `llm-types.ts`:
- `FINANCE_METRIC_GLOSSARY` con métricas financieras
- `FINANCE_CAUSAL_CHAIN` con relaciones causales

### Paso 3: LLM enrichment

Reutilizar `materializeAiLlmEnrichments()` con la tabla de señales del dominio. El worker en Cloud Run ya es genérico.

### Paso 4: Reader

Crear reader scoped para el dominio (ej: `readFinanceAiLlmEnrichments()`). Seguir el patrón de `llm-enrichment-reader.ts`.

### Paso 5: UI consumer

Instanciar `NexaInsightsBlock` en la surface del dominio con los enrichments leídos.

---

## 8. Roadmap

| Fase | Tasks | Timeline sugerido | Qué habilita |
|------|-------|-------------------|--------------|
| **Tier 1** | TASK-242, 243, 244 | Q2 2026 | Insights en Space 360, Person 360, Home |
| **Tier 2** | TASK-245 | Q3 2026 | Señales financieras + primer engine nuevo |
| **Tier 3** | TASK-246 | Q3-Q4 2026 | Digest semanal por email |
| **Tier 4** | (futuro) | Q4 2026+ | Capacity Engine, feedback loop, Nexa Chat mentions |
