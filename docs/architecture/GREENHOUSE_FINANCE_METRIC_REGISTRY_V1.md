# Greenhouse — Finance Metric Registry Architecture

> **Version:** 1.1 (propuesta, robustness pass)
> **Creado:** 2026-04-17
> **Última revisión:** 2026-04-17 — pase de robustness y escalabilidad aplicado (§4.1 contrato endurecido con `LocalizedString`, `servingSource` tipado, `causalChain` con dirección, `detection.strategies` combinables; §4.3 contrato de reader con `asOf`; §11 debt declarada con triggers explícitos).
> **Lifecycle:** Pre-implementación (`proposal`) — este documento define el contrato y las decisiones requeridas ANTES de empezar la implementación. No describe código vivo todavía.
> **Audience:** Agentes de implementación, arquitectos, product owners del módulo Finance, equipo de CFO/Operaciones
> **Docs relacionados:**
> - `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance (contrato general)
> - `docs/tasks/in-progress/TASK-070-cost-intelligence-finance-ui.md` — Cost Intelligence (consumer y candidato a cross-referenciar)
> - `docs/tasks/in-progress/TASK-071-cost-intelligence-cross-module-consumers.md` — consumers cross-module
> - `Greenhouse_ICO_Engine_v1.md` — referencia del patrón `ICO_METRIC_REGISTRY`
> - `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — consumer del registry vía signal engine y prompt LLM
> - `GREENHOUSE_360_OBJECT_MODEL_V1.md` — objetos canónicos a los que se anclan las métricas

---

## 1. Resumen ejecutivo

Greenhouse tiene ~15 métricas financieras de primer orden (revenue, costos directos/indirectos, márgenes, EBITDA, DSO, DPO, payroll ratio, headcount FTE, revenue per FTE, exchange rates, UF, UTM) que hoy se definen, calculan y muestran en **múltiples superficies sin un contrato único**:

- `greenhouse_finance.client_economics` (snapshot mensual por cliente)
- `/api/finance/dashboard/pnl` (P&L on-read)
- `/api/finance/dashboard/summary` (DSO, DPO, payroll ratio on-read)
- `/api/finance/income/summary` y `/api/finance/expenses/summary` (series accrual + cash on-read)
- `FinanceDashboardView.tsx` (formateo y thresholds hardcoded)
- `src/lib/finance/ai/finance-signal-types.ts` (registry ad-hoc para el signal engine, creado en TASK-245)
- `src/lib/ico-engine/metric-registry.ts` (ICO, con overlap semántico en `Revenue Enabled`, `Throughput`)

El resultado: **la misma métrica puede tener labels distintos, fórmulas distintas, thresholds distintos y basis distintas en superficies distintas**, sin un camino de detección automático del drift.

El `FinanceMetricRegistry` es un contrato de TypeScript + Postgres + prompts que centraliza la **definición semántica y operativa** de cada métrica financiera canónica. No reemplaza los serving stores (`client_economics`, etc.) ni recompute las métricas — declara cuál es la fuente autoritativa, cómo se formatea, cómo se agrega, y qué políticas de calidad, visibilidad y detección se aplican.

---

## 2. Problema actual (detallado)

### 2.1 Fragmentación del naming

La misma métrica aparece bajo nombres distintos en distintas superficies:

| Concepto | client_economics | /api/finance/dashboard/pnl | FinanceDashboardView | LLM prompt (TASK-245) |
|---|---|---|---|---|
| Margen neto % | `net_margin_percent` (0.25 = 25%) | `margins.netMarginPercent` (25) | `"Margen neto"` | `net_margin_pct` (25) |
| Margen bruto % | `gross_margin_percent` (0.40 = 40%) | `margins.grossMarginPercent` (40) | `"Margen bruto"` | `gross_margin_pct` (40) |
| Revenue CLP | `total_revenue_clp` | `revenue.totalRevenue` | `"Facturación"` | `total_revenue_clp` |
| Costos directos | `direct_costs_clp` | `costs.directLabor + costs.operational` | `"Costos directos"` | `direct_costs_clp` |

**Consecuencias reales:**
- Las escalas de las mismas columnas difieren (`0.25` vs `25`). Ya tuve que normalizar esto en [src/lib/finance/ai/materialize-finance-signals.ts:71-83](src/lib/finance/ai/materialize-finance-signals.ts#L71-L83).
- Categorías de costos difieren: `costs.directLabor` no es lo mismo que `direct_costs_clp`.
- El prompt LLM podría decirle a Nexa "Margen neto del cliente bajó al 15%" cuando el dashboard dice "Margen neto 15" o "0.15". El agente contrastaría contra narrativas distintas.

### 2.2 Basis accrual vs cash ambiguo

El dashboard expone **dos series** para revenue y expenses (`accrualMonthly`, `cashMonthly`) y usa accrual como default con fallback a cash. El registry ad-hoc actual ignora la distinción. Una métrica como "Revenue 2026-04" sin basis declarado es ambigua.

### 2.3 Scope inconsistente

- `client_economics` → por cliente
- `/api/finance/dashboard/pnl` → portfolio (toda la org operativa Efeonce)
- Space 360 Finance tab (futuro, en roadmap TASK-245 follow-ups) → por space

Las reglas de agregación no están declaradas: hoy el código implícitamente asume `SUM` para CLP y `AVG` para porcentajes, lo cual **es matemáticamente incorrecto** para ratios como `gross_margin_pct` (hay que recomputar como `SUM(margin_clp)/SUM(revenue_clp)`).

### 2.4 Filtros canónicos baked-in

Cada query excluye `is_annulled=TRUE`, `dte_type_code IN ('52', 'COT')` (quotes), `income_type='quote'`. Estos filtros son parte de la definición de "Revenue" pero viven dentro de los SQL sin documentación centralizada. Un consumer nuevo que lea directo de `greenhouse_finance.income` sin aplicar los filtros reporta revenue inflado.

### 2.5 Quality gates ausentes

El signal engine no sabe si `client_economics` para un período está materializado o si `commercial_cost_attribution` quedó pendiente por un fallo de la materialization. El `gross_margin_clp` de una fila podría ser `0` por dos razones opuestas:
- Realmente margen bajo (dato real)
- `direct_costs_clp` no computó porque `cost_allocations` no había corrido (dato inválido)

El registry debe declarar dependencias y gates para que downstream (signals, UI) puedan distinguir.

### 2.6 Targets arbitrarios

Hoy no hay target canónico de margen. El CFO tiene uno en su cabeza ("idealmente 30%"), los colores del dashboard se pintan con thresholds hardcoded que nadie acordó, y el signal engine no puede decir "margen fuera de objetivo" porque no hay objetivo formal.

### 2.7 Sin versioning ni owners

Si mañana decidimos que `EBITDA` ahora incluye `overhead_indirecto` que antes no, el histórico de `client_economics` queda bajo definición v1 y los nuevos snapshots bajo v2 — sin manera de distinguirlos en serving, UI, prompt, ni reportes externos.

---

## 3. Goal del registry

### 3.1 Qué resuelve

1. **Fuente única de verdad para labels y shortNames** (elimina drift en UI y prompts).
2. **Contrato explícito de basis, scope, time grain, currency, FX policy, aggregation rules, canonical filters**.
3. **Dependencias formales** (DAG de métricas derivadas para invalidation propagation).
4. **Quality gates** con dependencia de serving stores y freshness thresholds.
5. **Policy de detección por métrica** (Z-score, threshold absoluto, trend change) para alimentar el signal engine domain-aware.
6. **Glosario LLM canónico** con causal chain formal (no string libre).
7. **Visibilidad por audiencia** (internal vs client portal vs leadership).
8. **Versioning y lifecycle** con deprecation semántica.

### 3.2 Qué NO resuelve (out of scope v1)

- **No** reemplaza serving stores. Las tablas `client_economics`, `operational_pl_snapshots`, etc. siguen siendo las fuentes autoritativas. El registry **apunta** a ellas.
- **No** implementa un DSL de fórmulas SQL. Las fórmulas viven en migrations y en endpoints; el registry solo documenta **dónde**.
- **No** reemplaza targets editables por cliente/org en DB (eso es un follow-up con UI admin).
- **No** recomputa métricas on-read. El registry declara contrato; los consumers siguen leyendo de sus fuentes.
- **No** introduce una librería de agregación genérica. Las reglas de agregación se declaran; la implementación se mantiene en código específico (queries, projections).

---

## 4. Contrato formal del registry

### 4.1 Data model (propuesto)

El contrato v1 es deliberadamente estricto en 4 áreas que en v1.0 draft estaban sub-especificadas y en feedback de review quedaron como grietas visibles: `label/shortName` son `LocalizedString` desde el inicio (aunque v1 solo popule `es-CL`), `servingSource` es tupla tipada validable en build, `causalChain` encoda dirección, y `detection` acepta combinación de estrategias. Ver §11 para la debt declarada que v1 deja afuera intencionalmente con triggers.

```typescript
// ─── Helpers de tipo ──────────────────────────────────────────────────────

/**
 * String localizado. v1 puebla solamente 'es-CL'; el shape es future-proof
 * para i18n multi-locale sin cambio breaking del contrato cuando Kortex
 * bridge o Greenhouse multi-language entren al roadmap.
 */
export type LocalizedString = {
  'es-CL': string
  [locale: string]: string | undefined
}

/**
 * Referencia tipada a la fuente autoritativa de la métrica.
 * Un build test valida que cada variante apunta a algo real:
 *  - materialized: schema.table.column debe existir en db.d.ts generado
 *  - computed_on_read: endpoint debe resolverse contra el router de Next
 *  - external_api: service + ref debe estar registrado en el catálogo de integraciones
 */
export type ServingSourceRef =
  | {
      kind: 'materialized'
      schema: string                    // 'greenhouse_finance' | 'greenhouse_serving'
      table: string                     // 'client_economics'
      column: string                    // 'net_margin_percent'
      freshnessSlaHours: number | null
      refreshedBy: string | null        // 'outbox:client_economics.recomputed'
    }
  | {
      kind: 'computed_on_read'
      endpoint: string                  // '/api/finance/dashboard/summary'
      responseField: string             // 'dso'
      freshnessSlaHours: number | null  // típicamente null u hora máxima de cache
      refreshedBy: null
    }
  | {
      kind: 'external_api'
      service: string                   // 'nubox_sync' | 'sii_webhook'
      ref: string                       // identificador dentro del servicio
      freshnessSlaHours: number | null
      refreshedBy: string | null
    }

/**
 * Enlace causal dirigido entre métricas. Reemplaza el array de strings
 * neutro para permitir al LLM construir narrativas con dirección correcta
 * (revenue ↓ → margin ↓, no revenue ↓ → margin ↑).
 */
export type CausalLink = {
  from: string                          // metricId que influye causalmente a esta
  effect: 'positive' | 'negative' | 'non_monotonic'
                                        // positive: mover from ↑ mueve esta ↑
                                        // negative: mover from ↑ mueve esta ↓
                                        // non_monotonic: dependencia no lineal (declara y deja que el LLM explique)
  note?: string                         // qualifier opcional para el LLM
}

/**
 * Estrategias de detección combinables. v1 soporta OR ('any') y AND ('all')
 * para combinar, lo que permite métricas como DSO con threshold absoluto
 * Y Z-score al mismo tiempo.
 */
export type DetectionStrategy =
  | { kind: 'z_score'; windowMonths: number; warningZ: number; criticalZ: number }
  | { kind: 'absolute_threshold'; warningAt: number; criticalAt: number; operator: '>=' | '<=' }
  | { kind: 'trend_change'; windowMonths: number; minChangePct: number }

export type FinanceMetricScope =
  | 'client'
  | 'organization'
  | 'space'
  | 'service'
  | 'supplier'
  | 'portfolio'

// ─── Definición principal ─────────────────────────────────────────────────

export interface FinanceMetricDefinition {
  // ─── Identity ────────────────────────────────────────────────────────────
  metricId: string                  // canonical snake_case, ej: 'net_margin_pct'
  version: number                   // 1, 2, ... — incrementa al cambiar semántica
  status: 'active' | 'deprecated'
  deprecatedAt: string | null
  replacedBy: string | null         // metricId que lo sucede
  owner: string                     // 'finance_product', 'cost_intelligence', 'cfo'

  // ─── Display ────────────────────────────────────────────────────────────
  label: LocalizedString            // { 'es-CL': 'Margen neto' } en v1
  shortName: LocalizedString        // { 'es-CL': 'Net Margin' } en v1
  description: LocalizedString      // long-form internal, localizable
  icon: string                      // 'tabler-chart-line'

  // ─── Value semantics ────────────────────────────────────────────────────
  unit: 'CLP' | 'USD' | 'percent' | 'ratio' | 'days' | 'count' | 'fte'
  higherIsBetter: boolean | null    // null = neutral (ej. headcount)
  currency: 'CLP' | 'USD' | null
  fxPolicy: 'rate_at_event' | 'rate_at_period_close' | 'none'

  // ─── Scope dimensions ───────────────────────────────────────────────────
  scopes: FinanceMetricScope[]      // qué scopes soporta la métrica
  defaultScope: FinanceMetricScope  // scope primario
  canonicalAnchor:                  // objeto 360 al que se ancla
    | 'cliente' | 'organizacion' | 'space' | 'servicio' | 'proveedor' | 'portfolio'

  // ─── Basis ──────────────────────────────────────────────────────────────
  basis: 'accrual' | 'cash' | 'point_in_time' | 'none'
                                    // 'none' para indicators (UF, USD/CLP)

  // ─── Time grain + calendar ──────────────────────────────────────────────
  grain: 'monthly' | 'daily' | 'point_in_time'
  calendar: 'operational' | 'strict' | 'external'

  // ─── Aggregation contract ───────────────────────────────────────────────
  aggregation: {
    acrossScopes: 'sum' | 'weighted_avg' | 'simple_avg' | 'latest' | 'not_aggregable'
    weightNumerator?: string        // metricId usado como numerador del weighted_avg
    weightDenominator?: string      // metricId usado como denominador
  }

  // ─── Canonical filters ──────────────────────────────────────────────────
  canonicalFilters: string[]        // human-readable, no SQL
                                    // ej: "excluir is_annulled=TRUE"
                                    //     "excluir dte_type_code IN ('52','COT')"

  // ─── Dependencies (DAG) ─────────────────────────────────────────────────
  dependsOn: string[]               // array de metricIds
  inputSources: string[]            // ['greenhouse_finance.income.total_amount_clp']

  // ─── Serving source (tupla tipada, validada en build) ──────────────────
  servingSource: ServingSourceRef

  // ─── Quality gates ──────────────────────────────────────────────────────
  qualityGates: {
    freshnessThresholdHours: number | null
    requiredInputs: string[]        // metricIds o serving tables obligatorias
    minSampleSize?: number          // para agregados (ej: min 3 clientes)
  }

  // ─── Targets (business) ─────────────────────────────────────────────────
  target?: {
    source: 'constant' | 'editable_per_client' | 'editable_per_org'
    defaultValue: number | null
    storeLocation?: string          // si editable, tabla donde vive
  }

  // ─── Thresholds (semaphore) ─────────────────────────────────────────────
  thresholds?: {
    comparison: 'vs_target' | 'vs_prior_period' | 'vs_absolute'
    optimal: { min?: number; max?: number }
    attention: { min?: number; max?: number }
    critical: { min?: number; max?: number }
  }

  // ─── Formatting ─────────────────────────────────────────────────────────
  format: {
    locale: 'es-CL'                 // v1 hardcoded; v2 resuelve del contexto de usuario
    decimals: number
    prefix?: string
    suffix?: string
    compactAbove?: number
  }

  // ─── Access control ────────────────────────────────────────────────────
  visibility: {
    internal: boolean               // siempre true en v1
    clientPortal: boolean           // false para cost/margin
    leadershipOnly: boolean         // true para EBITDA, shareholder account, etc.
  }

  // ─── Signal detection policy (estrategias combinables) ─────────────────
  detection?: {
    strategies: DetectionStrategy[]
    combine: 'any' | 'all'          // 'any': fire si cualquier strategy match (OR)
                                    // 'all': fire solo si todas match (AND)
  }

  // ─── LLM glossary ──────────────────────────────────────────────────────
  llmGlossary: {
    promptLabel: string             // 'Net Margin' — exactamente lo que ve el LLM
    causalChain: CausalLink[]       // direccional; reemplaza causalChainRefs plano
    narrativeHint?: string
    clientSafeLabel?: string
  }
}
```

### 4.2 Ejemplos de entries canónicos

Tres ejemplos cubren los casos diversos: un aggregate monetario, un ratio derivado, un indicator externo.

#### 4.2.1 Revenue accrual CLP (base monetaria, aggregate)

```typescript
{
  metricId: 'revenue_accrual_clp',
  version: 1,
  status: 'active',
  deprecatedAt: null,
  replacedBy: null,
  owner: 'finance_product',

  label: { 'es-CL': 'Facturación del período' },
  shortName: { 'es-CL': 'Revenue' },
  description: { 'es-CL': 'Revenue total devengado (accrual basis) del período en CLP, neto de anulaciones y quotes, antes de partner share.' },
  icon: 'tabler-file-invoice',

  unit: 'CLP',
  higherIsBetter: true,
  currency: 'CLP',
  fxPolicy: 'rate_at_event',

  scopes: ['client', 'organization', 'space', 'portfolio'],
  defaultScope: 'client',
  canonicalAnchor: 'cliente',

  basis: 'accrual',
  grain: 'monthly',
  calendar: 'operational',

  aggregation: {
    acrossScopes: 'sum'
  },

  canonicalFilters: [
    "excluir is_annulled = TRUE",
    "excluir dte_type_code IN ('52', 'COT')",
    "excluir income_type = 'quote'",
    "invoice_date dentro del período operativo"
  ],

  dependsOn: [],
  inputSources: ['greenhouse_finance.income.total_amount_clp'],

  servingSource: {
    kind: 'materialized',
    schema: 'greenhouse_finance',
    table: 'client_economics',
    column: 'total_revenue_clp',
    freshnessSlaHours: 24,
    refreshedBy: 'outbox:client_economics.recomputed'
  },

  qualityGates: {
    freshnessThresholdHours: 48,
    requiredInputs: []
  },

  format: {
    locale: 'es-CL',
    decimals: 0,
    prefix: '$',
    compactAbove: 1_000_000
  },

  visibility: { internal: true, clientPortal: true, leadershipOnly: false },

  detection: {
    strategies: [
      { kind: 'z_score', windowMonths: 6, warningZ: 2, criticalZ: 3 }
    ],
    combine: 'any'
  },

  llmGlossary: {
    promptLabel: 'Revenue',
    causalChain: [
      // Revenue sube → Gross Margin sube (efecto positivo en la dirección operativa)
    ],
    narrativeHint: 'expresar en CLP compactado (ej: $12.5M)',
    clientSafeLabel: 'Facturación'
  }
}
```

#### 4.2.2 Net margin % (ratio derivado, weighted aggregation)

```typescript
{
  metricId: 'net_margin_pct',
  version: 1,
  status: 'active',
  deprecatedAt: null,
  replacedBy: null,
  owner: 'finance_product',

  label: { 'es-CL': 'Margen neto' },
  shortName: { 'es-CL': 'Net Margin' },
  description: { 'es-CL': 'Ratio entre resultado neto y revenue total, ambos en CLP devengado. Se agrega como weighted avg: SUM(net_margin_clp) / SUM(revenue_accrual_clp).' },
  icon: 'tabler-chart-line',

  unit: 'percent',
  higherIsBetter: true,
  currency: null,
  fxPolicy: 'none',

  scopes: ['client', 'organization', 'portfolio'],
  defaultScope: 'client',
  canonicalAnchor: 'cliente',

  basis: 'accrual',
  grain: 'monthly',
  calendar: 'operational',

  aggregation: {
    acrossScopes: 'weighted_avg',
    weightNumerator: 'net_margin_clp',
    weightDenominator: 'revenue_accrual_clp'
  },

  canonicalFilters: [
    "hereda filtros de revenue_accrual_clp y de expenses_accrual_clp"
  ],

  dependsOn: ['revenue_accrual_clp', 'net_margin_clp'],
  inputSources: [],

  servingSource: {
    kind: 'materialized',
    schema: 'greenhouse_finance',
    table: 'client_economics',
    column: 'net_margin_percent',
    freshnessSlaHours: 24,
    refreshedBy: 'outbox:client_economics.recomputed'
  },

  qualityGates: {
    freshnessThresholdHours: 48,
    requiredInputs: [
      'greenhouse_serving.commercial_cost_attribution',
      'greenhouse_finance.cost_allocations'
    ]
  },

  target: {
    source: 'editable_per_org',
    defaultValue: 25,
    storeLocation: 'greenhouse_finance.metric_targets'
  },

  thresholds: {
    comparison: 'vs_target',
    optimal: { min: -5 },            // relativo al target
    attention: { min: -15, max: -5 },
    critical: { max: -15 }
  },

  format: {
    locale: 'es-CL',
    decimals: 1,
    suffix: '%'
  },

  visibility: { internal: true, clientPortal: false, leadershipOnly: false },

  detection: {
    strategies: [
      { kind: 'z_score', windowMonths: 6, warningZ: 2, criticalZ: 3 }
    ],
    combine: 'any'
  },

  llmGlossary: {
    promptLabel: 'Net Margin',
    causalChain: [
      { from: 'revenue_accrual_clp', effect: 'positive', note: 'revenue sube → margen sube' },
      { from: 'direct_costs_clp', effect: 'negative' },
      { from: 'indirect_costs_clp', effect: 'negative' },
      { from: 'labor_cost_clp', effect: 'negative' }
    ],
    narrativeHint: 'porcentaje con 1 decimal; explicar si cayó por revenue o por costos'
  }
}
```

#### 4.2.3 DSO (on-read computed, no materializado)

```typescript
{
  metricId: 'dso_days',
  version: 1,
  status: 'active',
  deprecatedAt: null,
  replacedBy: null,
  owner: 'finance_product',

  label: { 'es-CL': 'Días de cobro' },
  shortName: { 'es-CL': 'DSO' },
  description: { 'es-CL': 'Days Sales Outstanding: cuentas por cobrar acumuladas / revenue diario del período. Indicador de calidad del ciclo de caja.' },
  icon: 'tabler-clock-dollar',

  unit: 'days',
  higherIsBetter: false,
  currency: null,
  fxPolicy: 'none',

  scopes: ['portfolio'],             // v1: solo portfolio
  defaultScope: 'portfolio',
  canonicalAnchor: 'portfolio',

  basis: 'point_in_time',
  grain: 'point_in_time',
  calendar: 'strict',

  aggregation: {
    acrossScopes: 'not_aggregable'   // DSO agregado requiere recomputo total
  },

  canonicalFilters: [
    "considera income con payment_status IN ('pending', 'partial')",
    "AR aging basado en invoice_date"
  ],

  dependsOn: [],
  inputSources: [
    'greenhouse_finance.income.total_amount_clp',
    'greenhouse_finance.income.payment_status',
    'greenhouse_finance.income_payments.payment_date'
  ],

  servingSource: {
    kind: 'computed_on_read',
    endpoint: '/api/finance/dashboard/summary',
    responseField: 'dso',
    freshnessSlaHours: 1,
    refreshedBy: null
  },

  qualityGates: {
    freshnessThresholdHours: null,
    requiredInputs: []
  },

  target: {
    source: 'constant',
    defaultValue: 30
  },

  thresholds: {
    comparison: 'vs_absolute',
    optimal: { max: 30 },
    attention: { min: 30, max: 60 },
    critical: { min: 60 }
  },

  format: {
    locale: 'es-CL',
    decimals: 0,
    suffix: ' días'
  },

  visibility: { internal: true, clientPortal: false, leadershipOnly: false },

  // Ejemplo de combinación: DSO dispara si EITHER la serie está
  // estadísticamente anómala OR excede umbral absoluto (60 días crítico
  // aunque no sea anómalo para ese cliente históricamente).
  detection: {
    strategies: [
      { kind: 'z_score', windowMonths: 6, warningZ: 2, criticalZ: 3 },
      { kind: 'absolute_threshold', warningAt: 45, criticalAt: 60, operator: '>=' }
    ],
    combine: 'any'
  },

  llmGlossary: {
    promptLabel: 'DSO',
    causalChain: [
      { from: 'revenue_accrual_clp', effect: 'non_monotonic', note: 'DSO es ratio; revenue alto puede subir o bajar DSO según cobros' }
    ],
    narrativeHint: 'siempre con "días" como sufijo; mencionar riesgo de caja si DSO > 45'
  }
}
```

---

### 4.3 Reader contract (primitivas de lectura)

El contrato expone 3 primitivas canónicas. Toda superficie consumidora debe usarlas en lugar de acceder al registry como literal.

```typescript
/**
 * Resuelve la definición de una métrica a un momento dado.
 *
 * `asOf` importa cuando:
 *  - La métrica fue deprecada (se retorna la entrada histórica, marcada).
 *  - Los targets son editables y tienen effective_from/superseded_at (v2).
 *  - Comparaciones históricas ("margen de marzo vs target de marzo") necesitan
 *    el target vigente en esa fecha, no el actual.
 *
 * v1 default: si `asOf` se omite, retorna la entry activa con targets default.
 * v2: resuelve targets time-aware desde `greenhouse_finance.metric_targets`.
 */
export function getMetric(
  metricId: string,
  options?: { asOf?: string | Date; locale?: string }
): ResolvedMetric | null

export type ResolvedMetric = FinanceMetricDefinition & {
  resolvedLabel: string              // label[locale] ?? label['es-CL']
  resolvedShortName: string
  resolvedDescription: string
  resolvedTarget: number | null      // target vigente a `asOf` (v1: defaultValue)
  asOf: string | null                // echo del parámetro para audit
}

/**
 * Formatea un valor bruto según el contrato de la métrica. Centraliza
 * locale, decimals, prefix, suffix, compactación.
 */
export function formatMetricValue(
  metricId: string,
  value: number | null,
  options?: { locale?: string; compact?: boolean }
): string

/**
 * Agrega valores de un scope a un scope superior aplicando la regla
 * declarada en aggregation.acrossScopes.
 *
 * v1: acepta rows ya leídas de un serving store y opera en memoria.
 * No genera SQL; la versión ejecutora contra DB es follow-up TASK-406.
 */
export function aggregateMetric<T extends Record<string, number | null>>(
  metricId: string,
  rows: T[],
  options: { toScope: FinanceMetricScope }
): number | null
```

**Regla dura:** ningún consumer debe leer `FINANCE_METRIC_REGISTRY[metricId]` como literal. Todos pasan por `getMetric(...)`. Un lint rule (v1 básico, grep) falla el CI si encuentra acceso directo al objeto registry desde fuera de `src/lib/finance/metric-registry/`.

---

## 5. Relación con sistemas existentes

### 5.1 Cost Intelligence (TASK-070/071)

**Cost Intelligence es el primer consumer del Finance Metric Registry, no un registry paralelo.**

- Cost Intelligence expone superficies UI (dashboard de cierre de período, P&L inline, economics por cliente) que hoy calculan labels y formatos inline.
- El registry lo alimenta con la **definición canónica** de las métricas que muestra.
- Cost Intelligence sigue siendo owner del pipeline `commercial_cost_attribution → client_economics → operational_pl_snapshots`; el registry no toca esa materialization.
- El boundary: **Cost Intelligence = cómo se computan y muestran las métricas**; **Finance Metric Registry = cómo se definen y contrata cada métrica**.

### 5.2 ICO Engine

- `ICO_METRIC_REGISTRY` queda como owner de las métricas operacionales (OTD%, FTR%, RpA, Cycle Time, Throughput).
- Algunas métricas viven en el boundary: `Revenue Enabled` y `Throughput Expandido` son composites ICO-financieras.
- **Regla:** el registry financiero no duplica estas; las referencia como `externalRef` si necesita exponerlas en un context financiero (follow-up v2).

### 5.3 Canonical 360 Object Model

Toda métrica del registry declara `canonicalAnchor` (`cliente`, `organizacion`, `space`, `servicio`, `proveedor`, `portfolio`). Esto permite:

- Drill-down uniforme desde una métrica hacia su objeto 360.
- Alineación con la spec maestra `GREENHOUSE_360_OBJECT_MODEL_V1.md`.
- Evita que módulos nuevos creen identidades paralelas para "cliente financiero" vs "cliente operacional".

### 5.4 Nexa Insights Layer

El registry reemplaza el `FINANCE_METRIC_REGISTRY` ad-hoc que vive en [src/lib/finance/ai/finance-signal-types.ts](src/lib/finance/ai/finance-signal-types.ts). El signal engine de Finance consumirá:

- `detection` → config del Z-score / threshold absoluto.
- `qualityGates` → skip de signals cuando inputs no están materializados.
- `llmGlossary` → prompt construido a partir del registry, no hardcoded.
- `causalChainRefs` → cadena causal formal en lugar de string libre.

---

## 6. Decisiones requeridas antes de v1

Estas son las decisiones que no pueden quedar implícitas. Cada una bloquea la implementación si no está resuelta.

### 6.1 Modelo de scope (CRÍTICO)

**Opción A:** Una métrica soporta múltiples scopes (array `scopes`), con `defaultScope` y reglas de agregación explícitas. Un consumer pide `revenue_accrual_clp` para `scope=client` o `scope=organization` y el registry + serving resuelven.

**Opción B:** Una métrica por scope. `revenue_accrual_clp_client`, `revenue_accrual_clp_org`, `revenue_accrual_clp_portfolio`. Más entradas pero aggregation rules explícitas por entry.

> **Propuesta:** Opción A. Menos duplicación, más alineado al modelo 360 canónico, y la aggregation rule se declara una sola vez. La complejidad extra se maneja en el helper de lectura del registry.

### 6.2 Modelo de basis (CRÍTICO)

**Opción A:** Métrica por basis. `revenue_accrual_clp` y `revenue_cash_clp` son entradas separadas.

**Opción B:** Una métrica con `basis` como parámetro de lectura (como en scope).

> **Propuesta:** Opción A. Las fuentes de datos son diferentes (`income.invoice_date` vs `income_payments.payment_date`), los filtros canónicos difieren, y la agregación con otras métricas (margin %) se vuelve ambigua si basis es un parámetro. Más entradas pero semántica limpia.

### 6.3 Ownership de targets (CRÍTICO)

¿Los targets (`net_margin_pct = 25%`) son:

- **Constantes en código** del registry (más simple, no requiere tabla ni UI)?
- **Editables por organización** via una tabla `metric_targets` y UI admin en Settings?
- **Editables por cliente** (más granular, permite "este cliente premium tiene target de 35%")?

> **Propuesta:** constantes en v1 con `source: 'editable_per_org'` declarado en el campo `target.source` para las métricas que lo soportarán. La tabla `greenhouse_finance.metric_targets` + UI admin queda como follow-up v2 sin romper el contrato v1.

### 6.4 Boundary con Cost Intelligence (CRÍTICO)

Cost Intelligence (TASK-070/071) está en implementación avanzada y ya es consumer cross-module. ¿Qué métricas le pertenecen?

> **Propuesta:** Cost Intelligence es **consumer del Registry**, no owner de métricas. El Registry declara `operational_pl_ebitda`, `client_economics_net_margin`, etc., y Cost Intelligence los consume. TASK-070/071 se actualizan en follow-up para adoptar el registry (sin deprecar serving stores).

### 6.5 Enforcement de la DAG de dependencias

El registry declara `dependsOn`. ¿Cómo se enforce?

- **Estática:** un test lee el registry y falla build si una métrica referencia un metricId inexistente, o si hay ciclos.
- **Runtime:** el outbox reactor escucha cambios en una métrica y reacomputa sus dependientes automáticamente.

> **Propuesta:** v1 estática (test de lint). Runtime queda como follow-up cuando la propagación automática se vuelva necesaria.

### 6.6 Naming convention

- `snake_case` (`net_margin_pct`) vs `camelCase` (`netMarginPct`).
- ¿Prefijo de dominio? (`finance_net_margin_pct` vs `net_margin_pct`).

> **Propuesta:** `snake_case` sin prefijo de dominio (el registry ya está en `src/lib/finance/`, el dominio es implícito por paquete). Alineado con `ICO_METRIC_REGISTRY`.

### 6.7 Aggregation rule: contrato vs implementación

El registry declara `aggregation.acrossScopes`. ¿Es solo documentación, o hay un helper genérico `aggregateMetric()` que lee el registry y ejecuta la regla?

> **Propuesta:** v1 documentación declarativa + un helper `getAggregationRule(metricId)` que retorna el contrato. La implementación del SQL de agregación queda en los readers/queries existentes. Un helper ejecutor genérico es follow-up.

### 6.8 Visibilidad del Client Portal

¿El `clientPortal: true/false` en `visibility` se enforce automáticamente?

> **Propuesta:** v1 solo como **contrato documentado**. Los endpoints de Client Portal siguen siendo owners de su propia filtración; el registry es fuente de verdad consultable. Enforcement runtime vía middleware queda follow-up v2.

### 6.9 Versioning de métricas

Si cambia la fórmula de EBITDA:

- **Opción A:** incrementar `version`, mantener entry única con histórico en `changelog` aparte.
- **Opción B:** crear `ebitda_v2` como entry nueva, marcar `ebitda` con `status=deprecated, replacedBy='ebitda_v2'`.

> **Propuesta:** Opción B para cambios de semántica mayor (altera magnitud del número). Opción A para cambios cosméticos (label, descripción, formato). Regla operativa: si el cambio afecta el histórico existente, es Opción B.

### 6.10 Universo v1 de métricas

¿Qué métricas entran en v1? Sugerencia (14 métricas):

1. `revenue_accrual_clp`
2. `revenue_cash_clp`
3. `net_revenue_clp` (post partner share)
4. `direct_costs_clp`
5. `indirect_costs_clp`
6. `labor_cost_clp`
7. `total_costs_clp`
8. `gross_margin_clp`
9. `gross_margin_pct`
10. `net_margin_clp`
11. `net_margin_pct`
12. `ebitda_clp`
13. `ebitda_pct`
14. `dso_days`
15. `dpo_days`
16. `payroll_to_revenue_ratio`
17. `headcount_fte`
18. `revenue_per_fte`

Indicators externos (USD_CLP, UF, UTM, IPC) son un subgrupo aparte — posiblemente `indicator_*` con `canonical_anchor=portfolio` y `basis=none`. Decisión si entran en v1 o en fase indicator-layer separada.

> **Propuesta:** las 18 métricas base + indicators en registry separado `FINANCE_INDICATOR_REGISTRY` con mismo contrato pero una sub-categoría.

---

## 7. Extensiones al signal engine (post-registry)

Cuando el registry esté vivo, el signal engine de Finance (creado en TASK-245) cambia así:

- `src/lib/finance/ai/anomaly-detector.ts` deja de iterar `FINANCE_METRIC_REGISTRY` local y lee del registry central con filtro `detection.strategy !== 'none'`.
- `src/lib/finance/ai/llm-provider.ts` construye el glosario dinámicamente desde el registry (`llmGlossary.promptLabel`, `shortName`, `description`) — no hardcoded.
- La causal chain del prompt se genera a partir de `llmGlossary.causalChainRefs` (grafo derivado).
- Thresholds per-metric en el detector vienen de `detection.*` del registry, no constantes globales.
- Quality gates: el detector skip una métrica si `qualityGates.requiredInputs` no están materializados para el período.

---

## 8. Rollout strategy

### 8.1 Fases

**Fase 1 — Registry read-only (v1.0):**
- Crear `src/lib/finance/metric-registry.ts` con las ~18 métricas base y el contrato completo.
- Tests estáticos (DAG consistency, metricId uniqueness, dependency graph acyclic).
- Documentación en `docs/documentation/finance/metricas-canonicas.md`.
- Sin cambios en serving stores ni consumers. Solo define verdad.

**Fase 2 — Consumer cutover (v1.1):**
- Signal engine de Finance migra a leer del registry.
- `FinanceDashboardView.tsx` lee labels, formatos, thresholds, tooltips del registry.
- P&L endpoint y summary endpoint referencian metricIds en respuestas.
- Cost Intelligence adopta registry como source de labels.

**Fase 3 — Targets editables (v2):**
- Tabla `greenhouse_finance.metric_targets` con editor admin UI.
- Signal detection con `comparison: 'vs_target'` empieza a funcionar.

**Fase 4 — Quality gates enforcement (v2):**
- Detector consulta freshness SLA antes de emitir signals.
- Dashboard muestra "datos obsoletos" cuando SLA excedido.

**Fase 5 — Dependency DAG runtime (v3):**
- Outbox reactor usa el registry DAG para reacomputar derivadas automáticamente.

### 8.2 Regla de no-regresión

Durante la fase 2, toda métrica nueva que se agregue al dashboard o al signal engine debe pasar por el registry. Un lint rule (grep sobre nombres de métricas en código vs registry) falla el CI si se detecta drift.

---

## 9. Governance

### 9.1 Ownership

- **Owner del contrato** (data model, reglas): equipo de plataforma / arquitectos.
- **Owner de las definiciones** (labels, thresholds, targets): Finance Product / CFO.
- **Owner de la implementación** (code, tests): ingeniería.

### 9.2 Change control

Cualquier cambio a `metric-registry.ts` pasa por:

1. PR con rationale en descripción.
2. Review de Finance Product si cambia semántica (label, description, threshold, target).
3. Review de arquitectura si cambia contrato (campos del `FinanceMetricDefinition`).
4. Si hay `version` bump o `deprecated`, nota en `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` bajo sección "Delta".

### 9.3 Testing contract

- Unit tests: cada metricId único, DAG acíclica, dependencias resueltas, todos los `servingSource.location` apuntan a tablas/endpoints existentes.
- Integration tests: el signal engine produce los mismos resultados antes/después del cutover (fase 2).
- Snapshot tests: el glosario LLM generado desde el registry se compara contra el prompt actual para detectar drift.

---

## 10. Risks y mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Over-engineering del contrato — nadie lo adopta | Alto | v1 scope acotado a 18 métricas + 3 consumers reales (signal engine, dashboard, LLM). Nada "future-proof" que no tenga usuario hoy. |
| Divergencia entre `servingSource.location` y la realidad del código | Medio | Test de integración valida que las tablas/endpoints referenciados existen. Falla build si no. |
| Conflicto con Cost Intelligence en definiciones | Medio | Boundary explícito en §5.1. TASK dedicado para migrar Cost Intelligence como consumer. |
| Targets hardcoded se vuelven obsoletos | Medio | v2 con tabla editable. Hasta entonces, owner del registry (Finance Product) actualiza via PR mensual si es necesario. |
| Drift entre entries del registry y las fuentes reales tras materializations | Alto | Quality gates + SLA declarados en el registry. Ops Health muestra entries con SLA excedido. |

---

## 11. Follow-ups post v1

- **Targets editables por cliente/org** (fase 3).
- **Quality gates runtime enforcement** (fase 4).
- **Dependency DAG reactive propagation** (fase 5).
- **Indicator layer** (USD_CLP, UF, UTM como registry separado con mismo contrato).
- **Cross-domain metric references** (ICO Revenue Enabled visible como métrica financiera).
- **Export de reportes** (investor updates, board reports) generados desde el registry como source de truth.
- **Client Portal enforcement** (middleware que filtra métricas según `visibility.clientPortal`).
- **Metric diff / audit** (historial de cambios del registry con attribution a PRs).

---

## 12. Cambios esperados en docs tras v1

- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` → delta anunciando el registry como fuente de verdad de definiciones financieras.
- `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` → delta señalando que el prompt Finance ahora consume el registry.
- `docs/documentation/finance/metricas-canonicas.md` → nuevo documento funcional enumerando las métricas v1 para audiencia no-técnica.

---

## 13. Apéndice: cómo contestar las decisiones pendientes

Antes de abrir la task de implementación, las 10 decisiones de §6 deben tener respuesta escrita — sea aceptando la "Propuesta" tal cual, o registrando la decisión alternativa con rationale.

Sugerencia de formato de respuesta:

```markdown
## Decisiones cerradas — 2026-04-??

- 6.1 Modelo de scope: Opción A (multi-scope por métrica)
- 6.2 Modelo de basis: Opción A (métrica por basis)
- 6.3 Targets v1: constantes, editable_per_org declarado pero no implementado
- 6.4 Cost Intelligence: consumer, no owner
- 6.5 DAG enforcement: estático (test)
- 6.6 Naming: snake_case sin prefijo
- 6.7 Aggregation: declarativo + helper de lectura; ejecutor en follow-up
- 6.8 Client Portal: contrato documentado, no enforced
- 6.9 Versioning: Opción B (entry nuevo + deprecation) para semantic major
- 6.10 Universo v1: 18 métricas base; indicators en registry separado
```

Con las decisiones cerradas, se abre `TASK-###-finance-metric-registry-v1` con scope ya acotado.
