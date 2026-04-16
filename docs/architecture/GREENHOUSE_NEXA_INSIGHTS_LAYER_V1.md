# Greenhouse — Nexa Insights Layer Architecture

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
> - `GREENHOUSE_BATCH_PROCESSING_POLICY_V1.md` (§1.1 en Cloud Infrastructure) — política de Cloud Run

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
