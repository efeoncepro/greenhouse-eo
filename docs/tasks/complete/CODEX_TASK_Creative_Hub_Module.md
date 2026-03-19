# CODEX TASK — Creative Hub: Módulo de Capabilities para Globe

> Estado 2026-03-14: brief histórico. La implementación runtime actual de `Creative Hub` quedó parcialmente absorbida por el framework genérico de `Capabilities`, pero este documento ya no debe tratarse como task cerrada “tal cual implementada”. El brief vigente pasa a ser `docs/tasks/to-do/CODEX_TASK_Creative_Hub_Module_v2.md`.

## Resumen

Implementar el módulo **Creative Hub** como la primera capability completa del portal Greenhouse. El Creative Hub es el módulo central para clientes de Globe — expone la producción creativa como un sistema industrial con 3 capas de valor: Revenue Enabled (conexión con negocio), Brand Intelligence (gobernanza de marca), y CSC Pipeline Tracker (visualización de la cadena de producción).

**Por qué importa:** El Creative Hub convierte la promesa de ICO en producto visible. No es un dashboard más — es algo que ninguna agencia en LATAM puede ofrecer. El CMO ve cómo la producción creativa habilita revenue. El Brand Manager ve que su marca está protegida. Ambos ven el pipeline de producción en tiempo real con detección de cuellos de botella.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/creative-hub`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI (Material UI) v5
- **Charts:** ApexCharts (incluido en Vuexy)
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery datasets:** `notion_ops`, `hubspot_crm`, `greenhouse`

---

## Dependencias previas

Esta tarea asume que lo siguiente ya está implementado o en progreso:

- [ ] Auth con NextAuth.js funcionando (spec v1 P0 o CODEX_TASK_Microsoft_SSO / Google_SSO)
- [ ] Dataset `greenhouse` creado en BigQuery
- [ ] Tabla `greenhouse.clients` con `hubspot_company_id` y `notion_project_ids`
- [ ] Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con acceso a BigQuery
- [ ] Pipeline `notion-bigquery` operativo sincronizando `notion_ops.tareas`, `notion_ops.proyectos`, `notion_ops.sprints`
- [ ] Pipeline `hubspot-bq-sync` sincronizando `hubspot_crm.companies` con campos `linea_de_servicio` y `servicios_especificos`
- [ ] Capability Registry + resolve infrastructure (docs/architecture/Greenhouse_Capabilities_Architecture_v1.md, fase C0)

---

## Alineación obligatoria con Greenhouse 360 Object Model

Esta task debe ejecutarse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`

Reglas obligatorias:

1. **Creative Hub no es un nuevo objeto producto canónico**
   - `Creative Hub` es una capability surface o módulo UI del portal
   - el objeto `Product/Capability` canónico sigue viviendo en:
     - `greenhouse.service_modules`
     - `greenhouse.client_service_modules`

2. **No crear una identidad paralela de cliente**
   - el módulo debe anclarse al `Client` canónico (`greenhouse.clients.client_id`)
   - `hubspot_company_id` y otros IDs externos son referencias de enrichment, no identidad primaria del módulo

3. **No crear una identidad paralela de proyecto o sprint**
   - si el módulo necesita proyecto o sprint, debe consumir la identidad canónica o el contrato de lectura compartido de esos objetos
   - no inventar IDs locales de Creative Hub para proyectos, ciclos o assets agrupados

4. **El valor del módulo debe salir de read models enriquecidos**
   - combinar capability context, cliente, proyectos, tareas y sprints alrededor del objeto canónico
   - evitar materializar tablas siloed solo para “tener una versión propia” del pipeline creativo

5. **El Capability Registry es presentación, no identidad**
   - usarlo para activación de UI y composición de cards
   - no usarlo como reemplazo del catálogo o assignment registry canónico de capability

---

## Arquitectura del módulo

### Principio rector

El Creative Hub tiene 3 capas, cada una dirigida a un perfil de decisor diferente:

| Capa | Nombre | Para quién | Pregunta que responde |
|------|--------|------------|----------------------|
| 1 | **Revenue Enabled** | CMO (BP1), Dir. Comercial (BP8) | "¿Cuánto valor de negocio genera mi inversión en producción creativa?" |
| 2 | **Brand Intelligence** | Brand Manager (BP6), CMO (BP1) | "¿Mi marca está protegida? ¿El sistema aprende?" |
| 3 | **CSC Pipeline Tracker** | Brand Manager (BP6), Dir. Digital (BP2) | "¿Dónde está mi producción? ¿Dónde están los cuellos de botella?" |

Cada capa tiene cards independientes. El cliente ve las 3 capas en una sola página, separadas por sección headers. La primera capa (Revenue Enabled) es la que aparece arriba — es el diferenciador.

### Regla de activación (Capability Registry)

```
requiredServices: ['agencia_creativa', 'produccion_audiovisual', 'social_media_content']
```

Se activa si el cliente tiene contratado **al menos uno** de esos servicios. Esto cubre a todos los clientes de Globe.

---

## PARTE A: Enriquecimiento del modelo de datos

### A.1 Nueva propiedad en Notion: `fase_csc`

La base de datos Tareas (`3a54f0904be14158833533ba96557a73`) necesita una nueva propiedad:

| Propiedad | Tipo | Opciones |
|-----------|------|----------|
| `fase_csc` | Select | Planning, Briefing, Producción, Aprobación, Asset Mgmt, Activación, Completado |

**Nota:** "Insights" de la CSC se traduce a "Completado" en el modelo porque Insights es lo que Efeonce hace con el asset terminado (dashboards, Revenue Enabled), no un estado donde el asset "vive." El asset completado alimenta Insights automáticamente.

### A.2 Mapeo automático: `estado` → `fase_csc`

Para no depender de que el equipo operativo actualice `fase_csc` manualmente en cada tarea, se puede derivar la fase CSC a partir de las propiedades existentes. Este mapeo se puede implementar como:

- **Opción A (recomendada):** Fórmula en Notion que calcula `fase_csc` a partir de `estado` + `client_review_open` + `frame_versions` + otros campos. La fórmula fluye automáticamente a BigQuery con el sync diario.
- **Opción B:** Lógica server-side en el query builder del portal — calcula la fase CSC en la query de BigQuery.
- **Opción C:** Propiedad manual que el equipo actualiza. Más precisa pero requiere disciplina.

**Reglas de mapeo (aplican para Opción A o B):**

```
SI estado = "Backlog" o "Por hacer"
  → fase_csc = "Planning"

SI estado = "Brief en revisión" o (estado = "En curso" Y frame_versions = 0 Y NOT tiene_asset_frameio)
  → fase_csc = "Briefing"

SI estado = "En curso" Y (frame_versions > 0 O tiene_asset_frameio) Y NOT client_review_open
  → fase_csc = "Producción"

SI estado = "Listo para revisión" O client_review_open = true O estado = "Cambios Solicitados"
  → fase_csc = "Aprobación"

SI estado = "Aprobado" o "En entrega"
  → fase_csc = "Asset Mgmt"

SI estado = "Publicado" o "Activado" o "En distribución"
  → fase_csc = "Activación"

SI estado = "Listo" o "Completado"
  → fase_csc = "Completado"
```

**IMPORTANTE:** Este mapeo es una propuesta basada en los estados documentados. Los estados reales de la base de Notion pueden diferir. Antes de implementar, verificar los valores exactos del campo `estado` en `notion_ops.tareas`:

```sql
SELECT estado, COUNT(*) as count
FROM `efeonce-group.notion_ops.tareas`
GROUP BY estado
ORDER BY count DESC;
```

Y ajustar el mapeo a los valores reales.

### A.3 Implementación como view de BigQuery (Opción B)

Si se implementa server-side, crear una view que agrega `fase_csc` como columna calculada:

```sql
-- BigQuery view: notion_ops.tareas_csc
CREATE OR REPLACE VIEW `efeonce-group.notion_ops.tareas_csc` AS
SELECT
  *,
  CASE
    WHEN estado IN ('Backlog', 'Por hacer')
      THEN 'Planning'
    WHEN estado = 'En curso' AND IFNULL(frame_versions, 0) = 0
      THEN 'Briefing'
    WHEN estado = 'En curso' AND IFNULL(frame_versions, 0) > 0 AND IFNULL(client_review_open, false) = false
      THEN 'Producción'
    WHEN estado IN ('Listo para revisión', 'Cambios Solicitados') OR IFNULL(client_review_open, true)
      THEN 'Aprobación'
    WHEN estado = 'Listo'
      THEN 'Completado'
    ELSE 'Producción'  -- fallback conservador
  END AS fase_csc
FROM `efeonce-group.notion_ops.tareas`;
```

**Nota para el desarrollador:** Verificar los estados exactos de Notion antes de implementar esta view. El fallback `ELSE 'Producción'` es conservador — si hay estados no mapeados, aparecen en Producción en vez de desaparecer del pipeline.

### A.4 Columnas adicionales necesarias en BigQuery

Para calcular métricas de Revenue Enabled y Brand Intelligence, las siguientes columnas deben estar disponibles en `notion_ops.tareas`. Verificar si ya fluyen desde Notion:

| Columna | Tipo | Fuente Notion | Uso |
|---------|------|---------------|-----|
| `fase_csc` | STRING | Fórmula o Select nuevo | Pipeline tracker |
| `fecha_brief_aprobado` | TIMESTAMP | Date property (si existe) | Cycle time por fase |
| `fecha_entrega` | TIMESTAMP | Date property (si existe) | OTD%, Early Launch Advantage |
| `fecha_deadline` | TIMESTAMP | Date property (si existe) | OTD% |
| `first_time_right` | BOOLEAN | Derivable: `client_change_round = 0` | FTR%, Throughput |
| `tipo_asset` | STRING | Select property (si existe) | Distribución por tipo |
| `carril` | STRING | Select: Adquisición / Retención / Reactivación | Revenue Enabled context |

Si alguna columna no existe en Notion, marcarla como `null` en las queries y mostrar "Próximamente" en la card correspondiente en el portal. El módulo debe funcionar con data parcial.

---

## PARTE B: Registry Entry

### B.1 Definición del módulo en `capability-registry.ts`

```typescript
// Agregar al array de modules dentro del grupo 'globe' en capability-registry.ts

{
  id: 'creative-hub',
  label: 'Creative Hub',
  icon: 'tabler-palette',
  route: '/capabilities/creative-hub',
  requiredServices: ['agencia_creativa', 'produccion_audiovisual', 'social_media_content'],
  priority: 10,  // Primer módulo en el sidebar de capabilities
  dataSources: [
    {
      dataset: 'notion_ops',
      table: 'tareas',       // o 'tareas_csc' si se crea la view
      requiredColumns: [
        'estado', 'frame_versions', 'frame_comments', 'open_frame_comments',
        'client_change_round', 'client_review_open', 'rpa', 'semaforo_rpa',
        'created_time', 'last_edited_time', 'proyecto'
      ]
    },
    {
      dataset: 'notion_ops',
      table: 'proyectos',
      requiredColumns: ['notion_page_id', 'titulo']
    },
    {
      dataset: 'notion_ops',
      table: 'sprints',
      requiredColumns: ['notion_page_id', 'titulo']
    }
  ],
  cards: [
    // ═══════════════════════════════════════════
    // CAPA 1: REVENUE ENABLED
    // ═══════════════════════════════════════════
    {
      id: 'revenue-header',
      title: 'Revenue Enabled',
      type: 'section-header',
      size: 'full',
      dataKey: null,
      config: {
        subtitle: 'El impacto de tu producción creativa en el negocio',
        icon: 'tabler-trending-up'
      }
    },
    {
      id: 'early-launch-advantage',
      title: 'Early Launch Advantage',
      type: 'kpi',
      size: 'sm',
      dataKey: 'earlyLaunch',
      config: {
        description: 'Días de mercado ganados por entregar a tiempo',
        format: 'days',
        comparison: 'vs_industry',
        tooltip: 'Basado en OTD% del período vs promedio de industria (~70%). Cada día de entrega anticipada es captura de demanda adicional.'
      }
    },
    {
      id: 'iteration-velocity',
      title: 'Iteration Velocity',
      type: 'kpi',
      size: 'sm',
      dataKey: 'iterationVelocity',
      config: {
        description: 'Ciclos de iteración creativa posibles por período',
        format: 'number',
        suffix: 'x',
        comparison: 'vs_industry',
        tooltip: 'Cuántas más iteraciones de testing creativo se pueden ejecutar gracias al cycle time menor. Más iteraciones = mejor ROAS progresivo.'
      }
    },
    {
      id: 'creative-throughput',
      title: 'Creative Throughput',
      type: 'kpi',
      size: 'sm',
      dataKey: 'throughput',
      config: {
        description: 'Assets producidos con la misma capacidad',
        format: 'percentage',
        prefix: '+',
        comparison: 'vs_without_ico',
        tooltip: 'Throughput expandido: gracias a FTR% alto y RpA bajo, la misma capacidad produce más. Este porcentaje es cuánto más produjimos vs lo que sería posible con el promedio de rondas de industria (3-4).'
      }
    },
    {
      id: 'revenue-chain',
      title: 'Cadena causal ICO → Revenue',
      type: 'chain',
      size: 'full',
      dataKey: 'revenueChain',
      config: {
        tooltip: 'La cadena completa: métricas operativas → velocidad competitiva → revenue habilitado. Cada nivel se construye sobre el anterior.',
        levels: [
          { name: 'Drivers operativos', metrics: ['OTD%', 'Cycle Time', 'FTR%', 'RpA'] },
          { name: 'Velocidad competitiva', metrics: ['Time-to-Market', 'Creative Throughput', 'Iteration Velocity'] },
          { name: 'Revenue Enabled', metrics: ['Early Launch Advantage', 'Iteration Velocity Impact', 'Throughput Expandido'] }
        ]
      }
    },

    // ═══════════════════════════════════════════
    // CAPA 2: BRAND INTELLIGENCE
    // ═══════════════════════════════════════════
    {
      id: 'brand-header',
      title: 'Brand Intelligence',
      type: 'section-header',
      size: 'full',
      dataKey: null,
      config: {
        subtitle: 'Gobernanza y protección de tu marca',
        icon: 'tabler-shield-check'
      }
    },
    {
      id: 'first-time-right',
      title: 'First Time Right',
      type: 'kpi',
      size: 'sm',
      dataKey: 'firstTimeRight',
      config: {
        description: 'Piezas aprobadas en primera ronda',
        format: 'percentage',
        thresholds: { green: 70, yellow: 50 },
        tooltip: 'Porcentaje de assets que el cliente aprobó sin solicitar cambios. FTR alto = brief claro + alineación de marca + gobernanza funcionando.'
      }
    },
    {
      id: 'brand-consistency',
      title: 'Brand Consistency',
      type: 'kpi',
      size: 'sm',
      dataKey: 'brandConsistency',
      config: {
        description: 'Assets alineados a marca sin correcciones',
        format: 'percentage',
        thresholds: { green: 85, yellow: 70 },
        tooltip: 'Derivado de First Time Right + bajo RpA. Indica que el Brand Intelligence Hub está funcionando: cada pieza se valida contra las guidelines de tu marca antes de que la veas.',
        comingSoon: true  // Mostrar con data simulada hasta que BCS esté implementado
      }
    },
    {
      id: 'knowledge-base',
      title: 'Knowledge base de tu marca',
      type: 'status',
      size: 'sm',
      dataKey: 'knowledgeBase',
      config: {
        description: 'Aprendizajes acumulados que no se pierden',
        metrics: ['entries_count', 'last_updated', 'campaigns_documented'],
        tooltip: 'Tu marca tiene una base de conocimiento viva en Notion. Cada campaña documenta aprendizajes que cualquier persona del equipo puede consultar. El conocimiento no se pierde con la rotación.',
        comingSoon: true  // Requiere pipeline Notion wiki → BigQuery
      }
    },
    {
      id: 'rpa-trend',
      title: 'RpA Trend',
      type: 'chart',
      size: 'lg',
      dataKey: 'rpaTrend',
      config: {
        chartType: 'line',
        description: 'Evolución de rondas de revisión por período',
        referenceLines: [
          { value: 2, label: 'Máximo ICO', color: 'warning' },
          { value: 3.5, label: 'Promedio industria', color: 'danger' }
        ],
        tooltip: 'El RpA (Rounds per Asset) mide cuántas rondas de revisión necesita cada pieza. ICO promete máximo 2. La industria promedia 3-4. Si la línea baja, el sistema está funcionando.'
      }
    },

    // ═══════════════════════════════════════════
    // CAPA 3: CSC PIPELINE TRACKER
    // ═══════════════════════════════════════════
    {
      id: 'pipeline-header',
      title: 'Creative Supply Chain',
      type: 'section-header',
      size: 'full',
      dataKey: null,
      config: {
        subtitle: 'El pipeline completo de tu producción creativa',
        icon: 'tabler-git-branch'
      }
    },
    {
      id: 'csc-pipeline',
      title: 'Pipeline CSC',
      type: 'pipeline',
      size: 'full',
      dataKey: 'cscPipeline',
      config: {
        phases: [
          { id: 'planning', label: 'Planning', color: '#633f93' },
          { id: 'briefing', label: 'Briefing', color: '#024c8f' },
          { id: 'produccion', label: 'Producción', color: '#bb1954' },
          { id: 'aprobacion', label: 'Aprobación', color: '#ff6500' },
          { id: 'asset-mgmt', label: 'Asset Mgmt', color: '#0375db' },
          { id: 'activacion', label: 'Activación', color: '#023c70' },
          { id: 'completado', label: 'Completado', color: '#6ec207' }
        ],
        tooltip: 'Cada fase de la Creative Supply Chain con el conteo de assets en tiempo real. Haz clic en una fase para ver los assets.'
      }
    },
    {
      id: 'pipeline-metrics',
      title: 'Pipeline metrics',
      type: 'metrics-row',
      size: 'full',
      dataKey: 'pipelineMetrics',
      config: {
        metrics: [
          {
            id: 'cycle-time',
            label: 'Cycle time promedio',
            format: 'days',
            comparison: { type: 'vs_fixed', value: 14.2, label: 'industria' }
          },
          {
            id: 'bottleneck',
            label: 'Bottleneck actual',
            format: 'phase',
            description: 'Fase con mayor % del cycle time'
          },
          {
            id: 'pipeline-velocity',
            label: 'Pipeline velocity',
            format: 'rate',
            suffix: 'assets/sem',
            description: 'Assets completados por semana'
          },
          {
            id: 'stuck-count',
            label: 'Stuck assets',
            format: 'count',
            thresholds: { green: 0, yellow: 1 },
            description: '>48h sin movimiento'
          }
        ]
      }
    },
    {
      id: 'stuck-assets',
      title: 'Stuck steps',
      type: 'alert-list',
      size: 'full',
      dataKey: 'stuckAssets',
      config: {
        emptyMessage: 'No hay assets detenidos. El pipeline fluye sin obstáculos.',
        stuckThresholdHours: 48,
        warningThresholdHours: 48,
        dangerThresholdHours: 96,
        tooltip: 'Assets que llevan más de 48 horas en la misma fase sin cambio de estado. Los de Aprobación dependen de feedback del cliente.'
      }
    },
    {
      id: 'cycle-time-distribution',
      title: 'Distribución del cycle time por fase',
      type: 'chart',
      size: 'full',
      dataKey: 'cycleTimeDistribution',
      config: {
        chartType: 'stacked-bar-horizontal',
        description: 'Dónde se va el tiempo en cada ciclo de producción',
        colorMap: {
          Planning: '#633f93',
          Briefing: '#024c8f',
          Producción: '#bb1954',
          Aprobación: '#ff6500',
          'Asset Mgmt': '#0375db',
          Activación: '#023c70'
        },
        tooltip: 'Muestra qué porcentaje del cycle time se consume en cada fase. Si Aprobación es >30%, la oportunidad de mejora está en agilizar el feedback del cliente.'
      }
    },
    {
      id: 'pending-action',
      title: 'Assets que requieren tu acción',
      type: 'table',
      size: 'full',
      dataKey: 'pendingAction',
      config: {
        description: 'Piezas esperando tu revisión o aprobación',
        columns: [
          { key: 'asset_name', label: 'Asset', sortable: true },
          { key: 'project_name', label: 'Proyecto', sortable: true },
          { key: 'rpa', label: 'Rondas', sortable: true },
          { key: 'days_waiting', label: 'Días esperando', sortable: true, format: 'days-badge' },
          { key: 'frame_io_url', label: 'Revisar', format: 'external-link', linkText: 'Abrir en Frame.io' }
        ],
        emptyMessage: 'No hay piezas esperando tu acción. Todo fluye.',
        sortDefault: { key: 'days_waiting', order: 'desc' }
      }
    }
  ]
}
```

---

## PARTE C: Query Builder

### C.1 Archivo principal

Crear: `/src/lib/capability-queries/creative-hub.ts`

```typescript
import { BigQuery } from '@google-cloud/bigquery'

interface SessionUser {
  clientId: string
  projectIds: string[]
}

// ════════════════════════════════════════
// CONSTANTES DE INDUSTRIA (benchmarks)
// ════════════════════════════════════════

const INDUSTRY = {
  avgRpa: 3.5,              // Promedio de rondas por pieza en industria
  avgCycleTimeDays: 14.2,   // Promedio de cycle time en días
  avgOtd: 0.70,             // 70% OTD promedio
  maxIcoRpa: 2.0,           // Promesa ICO: máximo 2 rondas
}

// ════════════════════════════════════════
// QUERY PRINCIPAL
// ════════════════════════════════════════

export async function creativeHubQuery(
  bq: BigQuery,
  user: SessionUser
): Promise<Record<string, any>> {

  // Query base: tareas del cliente con fase CSC calculada
  const [tareas] = await bq.query({
    query: `
      SELECT
        t.notion_page_id,
        t.titulo,
        t.estado,
        t.proyecto,
        t.frame_versions,
        t.frame_comments,
        t.open_frame_comments,
        t.client_change_round,
        t.client_review_open,
        t.rpa,
        t.semaforo_rpa,
        t.created_time,
        t.last_edited_time,
        t.url_frame_io,
        p.titulo AS proyecto_nombre,
        -- Fase CSC calculada (Opción B: server-side)
        CASE
          WHEN t.estado IN ('Backlog', 'Por hacer')
            THEN 'Planning'
          WHEN t.estado = 'En curso' AND IFNULL(t.frame_versions, 0) = 0
            THEN 'Briefing'
          WHEN t.estado = 'En curso' AND IFNULL(t.frame_versions, 0) > 0
               AND IFNULL(t.client_review_open, false) = false
            THEN 'Producción'
          WHEN t.estado IN ('Listo para revisión', 'Cambios Solicitados')
               OR IFNULL(t.client_review_open, true)
            THEN 'Aprobación'
          WHEN t.estado = 'Listo'
            THEN 'Completado'
          ELSE 'Producción'
        END AS fase_csc,
        -- Derivadas
        CASE WHEN IFNULL(t.client_change_round, 0) = 0 THEN true ELSE false END AS first_time_right,
        TIMESTAMP_DIFF(t.last_edited_time, t.created_time, HOUR) / 24.0 AS cycle_time_days,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), t.last_edited_time, HOUR) AS hours_since_update
      FROM \`efeonce-group.notion_ops.tareas\` t
      LEFT JOIN \`efeonce-group.notion_ops.proyectos\` p
        ON t.proyecto LIKE CONCAT('%', p.notion_page_id, '%')
      WHERE t.proyecto IN UNNEST(@projectIds)
    `,
    params: { projectIds: user.projectIds }
  })

  // ════════════════════════════════════════
  // CAPA 1: REVENUE ENABLED
  // ════════════════════════════════════════

  const completed = tareas.filter(t => t.fase_csc === 'Completado')
  const active = tareas.filter(t => t.fase_csc !== 'Completado')

  // OTD% (aproximación: assets completados dentro del cycle time benchmark)
  const otdCount = completed.filter(t =>
    t.cycle_time_days && t.cycle_time_days <= INDUSTRY.avgCycleTimeDays
  ).length
  const otdPct = completed.length > 0 ? otdCount / completed.length : null

  // Early Launch Advantage: días ganados por entregar antes que la industria
  const avgCycleTime = completed.length > 0
    ? completed.reduce((sum, t) => sum + (t.cycle_time_days || 0), 0) / completed.length
    : null
  const daysGained = avgCycleTime !== null
    ? Math.max(0, Math.round((INDUSTRY.avgCycleTimeDays - avgCycleTime) * 10) / 10)
    : null

  // Iteration Velocity: cuántas más iteraciones posibles
  const iterationVelocity = avgCycleTime !== null && avgCycleTime > 0
    ? Math.round((INDUSTRY.avgCycleTimeDays / avgCycleTime) * 10) / 10
    : null

  // Creative Throughput: % más de assets por baja fricción
  const avgRpa = completed.length > 0
    ? completed.reduce((sum, t) => sum + (t.frame_versions || 0), 0) / completed.length
    : null
  const throughputGain = avgRpa !== null && avgRpa > 0
    ? Math.round(((INDUSTRY.avgRpa / avgRpa) - 1) * 100)
    : null

  // First Time Right %
  const ftrCount = completed.filter(t => t.first_time_right).length
  const ftrPct = completed.length > 0
    ? Math.round((ftrCount / completed.length) * 100)
    : null

  // Revenue Chain data
  const revenueChain = {
    drivers: {
      otd: otdPct !== null ? Math.round(otdPct * 100) : null,
      cycleTime: avgCycleTime !== null ? Math.round(avgCycleTime * 10) / 10 : null,
      ftr: ftrPct,
      rpa: avgRpa !== null ? Math.round(avgRpa * 10) / 10 : null,
    },
    velocity: {
      timeToMarket: daysGained,
      throughput: throughputGain,
      iterationVelocity: iterationVelocity,
    },
    enabled: {
      earlyLaunch: daysGained,
      iterationImpact: iterationVelocity,
      throughputExpanded: throughputGain,
    }
  }

  // ════════════════════════════════════════
  // CAPA 2: BRAND INTELLIGENCE
  // ════════════════════════════════════════

  // RpA Trend (últimos 6 meses, agrupado por mes)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const completedWithDates = completed.filter(t =>
    t.last_edited_time && new Date(t.last_edited_time) >= sixMonthsAgo
  )

  const rpaTrendMap: Record<string, { sum: number; count: number }> = {}
  completedWithDates.forEach(t => {
    const month = new Date(t.last_edited_time).toISOString().slice(0, 7) // YYYY-MM
    if (!rpaTrendMap[month]) rpaTrendMap[month] = { sum: 0, count: 0 }
    rpaTrendMap[month].sum += t.frame_versions || 0
    rpaTrendMap[month].count += 1
  })

  const rpaTrend = Object.entries(rpaTrendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      rpa: Math.round((data.sum / data.count) * 10) / 10,
      count: data.count
    }))

  // ════════════════════════════════════════
  // CAPA 3: CSC PIPELINE TRACKER
  // ════════════════════════════════════════

  // Conteo por fase
  const phases = ['Planning', 'Briefing', 'Producción', 'Aprobación', 'Asset Mgmt', 'Activación', 'Completado']
  const pipelineCounts: Record<string, number> = {}
  phases.forEach(phase => {
    pipelineCounts[phase] = tareas.filter(t => t.fase_csc === phase).length
  })

  // Cycle time promedio por fase (para assets completados)
  // Nota: sin fecha_brief_aprobado, estimamos distribución por pesos típicos
  const phaseWeights = {
    Planning: 0.10,
    Briefing: 0.08,
    Producción: 0.38,
    Aprobación: 0.25,
    'Asset Mgmt': 0.04,
    Activación: 0.15,
  }

  const cycleTimeDistribution = avgCycleTime !== null
    ? Object.entries(phaseWeights).map(([phase, weight]) => ({
        phase,
        days: Math.round(avgCycleTime * weight * 10) / 10,
        percentage: Math.round(weight * 100)
      }))
    : null

  // Bottleneck: fase con mayor % del cycle time
  // Con data real, sería la fase donde los assets pasan más tiempo
  // Sin data de timestamps por fase, usamos la fase con más assets activos como proxy
  const activePhaseCounts = Object.entries(pipelineCounts)
    .filter(([phase]) => phase !== 'Completado')
    .sort(([, a], [, b]) => b - a)
  const bottleneck = activePhaseCounts.length > 0
    ? { phase: activePhaseCounts[0][0], count: activePhaseCounts[0][1] }
    : null

  // Pipeline velocity: assets completados por semana (últimas 4 semanas)
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const recentCompleted = completed.filter(t =>
    t.last_edited_time && new Date(t.last_edited_time) >= fourWeeksAgo
  )
  const pipelineVelocity = Math.round((recentCompleted.length / 4) * 10) / 10

  // Stuck assets: >48h sin movimiento en fases activas
  const stuckAssets = active
    .filter(t => t.hours_since_update && t.hours_since_update > 48)
    .sort((a, b) => b.hours_since_update - a.hours_since_update)
    .map(t => ({
      id: t.notion_page_id,
      name: t.titulo || 'Sin título',
      project: t.proyecto_nombre || 'Sin proyecto',
      phase: t.fase_csc,
      hoursStuck: t.hours_since_update,
      daysStuck: Math.round(t.hours_since_update / 24 * 10) / 10,
      severity: t.hours_since_update > 96 ? 'danger' : 'warning'
    }))

  // Assets pendientes de acción del cliente
  const pendingAction = tareas
    .filter(t => t.fase_csc === 'Aprobación')
    .map(t => ({
      asset_name: t.titulo || 'Sin título',
      project_name: t.proyecto_nombre || 'Sin proyecto',
      rpa: t.frame_versions || 0,
      days_waiting: t.hours_since_update
        ? Math.round(t.hours_since_update / 24 * 10) / 10
        : 0,
      frame_io_url: t.url_frame_io || null,
      open_comments: t.open_frame_comments || 0,
    }))
    .sort((a, b) => b.days_waiting - a.days_waiting)

  // ════════════════════════════════════════
  // RETURN: Objeto completo para todas las cards
  // ════════════════════════════════════════

  return {
    // Capa 1: Revenue Enabled
    earlyLaunch: {
      value: daysGained,
      comparison: `vs ${INDUSTRY.avgCycleTimeDays}d industria`,
      trend: null  // Requiere data histórica
    },
    iterationVelocity: {
      value: iterationVelocity,
      comparison: 'ciclos vs velocidad estándar',
      trend: null
    },
    throughput: {
      value: throughputGain,
      comparison: 'vs producción sin ICO',
      trend: null
    },
    revenueChain: revenueChain,

    // Capa 2: Brand Intelligence
    firstTimeRight: {
      value: ftrPct,
      total: completed.length,
      count: ftrCount,
    },
    brandConsistency: {
      value: null,  // Coming soon
      comingSoon: true
    },
    knowledgeBase: {
      value: null,  // Coming soon
      comingSoon: true
    },
    rpaTrend: {
      data: rpaTrend,
      referenceLines: [
        { value: INDUSTRY.maxIcoRpa, label: 'Máximo ICO' },
        { value: INDUSTRY.avgRpa, label: 'Promedio industria' }
      ]
    },

    // Capa 3: CSC Pipeline Tracker
    cscPipeline: {
      phases: phases.map(phase => ({
        id: phase.toLowerCase().replace(/\s+/g, '-'),
        label: phase,
        count: pipelineCounts[phase] || 0,
      })),
      total: tareas.length,
    },
    pipelineMetrics: {
      cycleTime: {
        value: avgCycleTime !== null ? Math.round(avgCycleTime * 10) / 10 : null,
        comparison: INDUSTRY.avgCycleTimeDays,
        comparisonLabel: 'industria'
      },
      bottleneck: bottleneck,
      pipelineVelocity: {
        value: pipelineVelocity,
        period: 'assets/sem'
      },
      stuckCount: stuckAssets.length
    },
    stuckAssets: stuckAssets,
    cycleTimeDistribution: cycleTimeDistribution,
    pendingAction: pendingAction,
  }
}
```

### C.2 Registrar el query builder

En `/src/lib/capability-queries/index.ts`, agregar:

```typescript
import { creativeHubQuery } from './creative-hub'

const builders: Record<string, QueryBuilder> = {
  'creative-hub': creativeHubQuery,
  // ... otros módulos
}
```

---

## PARTE D: Componentes Frontend Nuevos

Además de los 5 card types existentes (KpiCard, ChartCard, TableCard, TimelineCard, StatusCard), el Creative Hub necesita 4 componentes nuevos:

### D.1 `SectionHeaderCard.tsx`

Separador visual entre capas. No es una card con borde — es un título de sección con subtítulo e ícono.

```typescript
// /src/components/capabilities/cards/SectionHeaderCard.tsx
// Render: <h2> con ícono a la izquierda, subtítulo en texto secundario debajo
// No tiene fondo, no tiene borde. Es puro tipografía.
// Usar GH_COLORS y GH_LABELS si aplican.
```

### D.2 `PipelineCard.tsx` — El componente principal

Este es el componente más importante y diferenciador del Creative Hub. Renderiza el pipeline CSC como una barra horizontal de fases con:

- **Barra de fases:** Cada fase es un segmento de color con el conteo de assets. Los colores están definidos en el config del card. Flechas chevron entre fases.
- **Hover:** Al pasar sobre una fase, muestra tooltip con: nombre de la fase, conteo de assets, tiempo promedio en esa fase.
- **Click:** Al hacer clic en una fase, scroll a una sección debajo que muestra los assets de esa fase (usa la tabla de `pendingAction` filtrada, o un componente similar).
- **Responsive:** En mobile, las fases se apilan verticalmente.

**Referencia visual:** Ver el mockup interactivo provisto en la conversación donde se diseñó este módulo.

### D.3 `MetricsRowCard.tsx`

Fila de 4 métricas compactas debajo del pipeline. Similar a KPI cards pero en formato horizontal más denso. Cada métrica tiene: label, valor, subtítulo de comparación o descripción.

### D.4 `AlertListCard.tsx`

Lista de stuck assets con severity coding. Cada item tiene:
- Badge de color (warning = Sunset Orange, danger = Crimson Magenta)
- Nombre del asset en bold
- Fase actual
- Tiempo detenido
- Link a Frame.io si disponible

Empty state: mensaje positivo ("No hay assets detenidos. El pipeline fluye sin obstáculos.")

### D.5 `ChainCard.tsx`

Visualización de la cadena causal Revenue Enabled. 3 niveles horizontales conectados con flechas, cada nivel con sus métricas. Es una versión simplificada del Revenue Enabled framework del pitch de Globe.

**Implementación sugerida:** SVG inline dentro de un componente React. No usar librería de charting — es un diagrama estático con datos dinámicos.

---

## PARTE E: Nomenclatura Greenhouse

Agregar al archivo `greenhouse-nomenclature.ts` (sección `GH_LABELS` y `GH_MESSAGES`):

```typescript
// =============================================
// CREATIVE HUB (agregar a GH_LABELS)
// =============================================

// Section headers
creative_hub_title:        'Creative Hub',
creative_hub_subtitle:     'Tu producción creativa como sistema',

// Capa 1: Revenue Enabled
revenue_header:            'Revenue Enabled',
revenue_subtitle:          'El impacto de tu producción creativa en el negocio',
kpi_early_launch:          'Early Launch Advantage',
kpi_iteration_velocity:    'Iteration Velocity',
kpi_creative_throughput:   'Creative Throughput',
chain_title:               'Cadena causal ICO → Revenue',
chain_level_drivers:       'Drivers operativos',
chain_level_velocity:      'Velocidad competitiva',
chain_level_revenue:       'Revenue Enabled',

// Capa 2: Brand Intelligence
brand_header:              'Brand Intelligence',
brand_subtitle:            'Gobernanza y protección de tu marca',
kpi_first_time_right:      'First Time Right',
kpi_brand_consistency:     'Brand Consistency',
kpi_knowledge_base:        'Knowledge base de tu marca',
chart_rpa_trend:           'RpA Trend',

// Capa 3: CSC Pipeline
pipeline_header:           'Creative Supply Chain',
pipeline_subtitle:         'El pipeline completo de tu producción creativa',
pipeline_cycle_time:       'Cycle time promedio',
pipeline_bottleneck:       'Bottleneck actual',
pipeline_velocity:         'Pipeline velocity',
pipeline_stuck:            'Stuck assets',
stuck_title:               'Stuck steps',
cycle_dist_title:          'Distribución del cycle time por fase',
pending_action_title:      'Assets que requieren tu acción',

// CSC Phase labels
phase_planning:            'Planning',
phase_briefing:            'Briefing',
phase_production:          'Producción',
phase_approval:            'Aprobación',
phase_asset_mgmt:          'Asset Mgmt',
phase_activation:          'Activación',
phase_completed:           'Completado',
```

```typescript
// =============================================
// CREATIVE HUB (agregar a GH_MESSAGES)
// =============================================

// Tooltips
tooltip_early_launch:       'Días de mercado ganados por entregar antes que el promedio de industria. Cada día anticipado es captura de demanda adicional.',
tooltip_iteration_velocity: 'Cuántas más iteraciones de testing creativo se pueden ejecutar gracias al cycle time menor. Más iteraciones = mejor ROAS progresivo.',
tooltip_throughput:          'Throughput expandido: gracias a baja fricción, la misma capacidad produce más que con el promedio de rondas de industria (3-4).',
tooltip_ftr:                 'Porcentaje de assets aprobados en primera ronda. FTR alto = brief claro + alineación de marca + gobernanza funcionando.',
tooltip_stuck:               'Assets que llevan más de 48 horas en la misma fase sin cambio de estado. Los de Aprobación dependen de feedback del cliente.',
tooltip_cycle_dist:          'Muestra qué porcentaje del cycle time se consume en cada fase. Si Aprobación es >30%, la oportunidad de mejora está en agilizar el feedback.',

// Empty states
empty_pipeline:              'Tu pipeline creativo está configurado. Los datos aparecerán cuando se creen tareas en tus proyectos.',
empty_stuck:                 'No hay assets detenidos. El pipeline fluye sin obstáculos.',
empty_pending:               'No hay piezas esperando tu acción. Todo fluye.',
empty_rpa_trend:             'Se necesitan al menos 2 meses de actividad para generar esta gráfica.',
empty_revenue:               'Las métricas de Revenue Enabled se calcularán cuando haya assets completados.',

// Coming soon
coming_soon_brand:           'Brand Consistency Score estará disponible cuando el AI Agent de gobernanza esté operativo.',
coming_soon_knowledge:       'La Knowledge Base se hará visible cuando el pipeline de wiki esté conectado.',
```

```typescript
// =============================================
// CREATIVE HUB COLORS (agregar a GH_COLORS)
// =============================================

// CSC Pipeline phase colors (derivados de marca)
cscPhase: {
  planning:   { source: '#633f93', bg: '#f2eff6', text: '#633f93' },  // Orchid Purple
  briefing:   { source: '#024c8f', bg: '#eaf0f6', text: '#024c8f' },  // Royal Blue
  production: { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },  // Crimson Magenta
  approval:   { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },  // Sunset Orange
  assetMgmt:  { source: '#0375db', bg: '#eaf3fc', text: '#0375db' },  // Core Blue
  activation: { source: '#023c70', bg: '#eaeff3', text: '#023c70' },  // Deep Azure
  completed:  { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' },  // Neon Lime
},
```

---

## PARTE F: Navegación y sidebar

El Creative Hub aparece en el sidebar bajo la sección "Servicios" (definida en Capabilities Architecture v1):

```
── Operación ──
  Pulse (Dashboard)
  Proyectos
  Ciclos (Sprints)
── Servicios ──
  Creative Hub        ← este módulo
  [otros módulos]
── Cuenta ──
  Mi Greenhouse
```

La ruta es `/capabilities/creative-hub`. La página genérica de capabilities (`/capabilities/[moduleId]/page.tsx`) del Capabilities Architecture se encarga del render. No se necesita crear una ruta nueva.

---

## PARTE G: Flujo completo end-to-end

**Escenario:** Cliente "Bresler" tiene en HubSpot:
- `linea_de_servicio`: `globe`
- `servicios_especificos`: `agencia_creativa;produccion_audiovisual`

**Paso 1:** Cliente se autentica. JWT contiene `clientId: 'bresler'`.

**Paso 2:** Layout monta y llama `GET /api/capabilities/resolve`.

**Paso 3:** API Route hace JOIN, obtiene `globe` + `['agencia_creativa', 'produccion_audiovisual']`.

**Paso 4:** `resolveCapabilities` recorre el registry de Globe, encuentra Creative Hub porque sus `requiredServices` incluyen `agencia_creativa`.

**Paso 5:** Sidebar muestra "Creative Hub" bajo "Servicios".

**Paso 6:** Cliente navega a Creative Hub. Frontend llama `GET /api/capabilities/creative-hub/data`.

**Paso 7:** `creativeHubQuery` ejecuta la query principal, calcula todas las métricas de las 3 capas.

**Paso 8:** Frontend renderiza el grid de cards:
- **Arriba:** 3 KPIs de Revenue Enabled + cadena causal
- **Medio:** FTR% + Brand Consistency (coming soon) + Knowledge Base (coming soon) + RpA Trend chart
- **Abajo:** Pipeline CSC + métricas de pipeline + stuck assets + distribución de cycle time + tabla de assets pendientes

**Paso 9:** El cliente ve:
- "Tu producción gana 5.4 días de mercado vs la industria" → Revenue Enabled
- "78% de tus piezas se aprobaron en primera ronda" → Brand Intelligence
- "Tienes 12 assets en Producción, 8 en Aprobación, 2 detenidos" → CSC Pipeline
- "El KV Campaña Q2 lleva 4.2 días sin feedback" → su propia acción pendiente

---

## PARTE H: Roadmap de implementación

| Fase | Entregable | Dependencias | Estimado |
|------|-----------|--------------|----------|
| **CH-0** | Verificar estados de Notion en BQ y ajustar mapeo CSC | Acceso a BigQuery | 0.5 día |
| **CH-0** | Crear view `notion_ops.tareas_csc` (o decidir fórmula en Notion) | CH-0 verificación | 0.5 día |
| **CH-1** | Registry entry en `capability-registry.ts` | C0 de Capabilities Architecture | 0.5 día |
| **CH-1** | Query builder `creative-hub.ts` | Registry + BQ access | 1.5 días |
| **CH-2** | `SectionHeaderCard.tsx` | Card system de Capabilities Architecture | 0.5 día |
| **CH-2** | `PipelineCard.tsx` (componente principal) | MUI + colores de marca | 2 días |
| **CH-2** | `MetricsRowCard.tsx` | MUI | 0.5 día |
| **CH-2** | `AlertListCard.tsx` (stuck assets) | MUI | 0.5 día |
| **CH-2** | `ChainCard.tsx` (Revenue Enabled chain) | MUI + SVG inline | 1 día |
| **CH-3** | Agregar nomenclatura a `greenhouse-nomenclature.ts` | — | 0.5 día |
| **CH-3** | Integración y test con data real | Todo lo anterior | 1 día |
| **CH-3** | Empty states para todas las cards | — | 0.5 día |

**Tiempo estimado total: ~9 días de desarrollo**

**Dependencia crítica:** La infraestructura de Capabilities Architecture (C0) debe estar implementada antes de empezar CH-1. La verificación de estados de Notion (CH-0) se puede hacer en paralelo.

---

## PARTE I: Mejoras futuras (post-MVP)

Estas mejoras se implementan en iteraciones posteriores, una vez que el módulo base esté validado con clientes reales:

| Mejora | Descripción | Requiere |
|--------|------------|----------|
| **Revenue Enabled con datos reales** | Conectar con datos de ventas/pipeline del cliente para calcular Early Launch Advantage con revenue real, no estimaciones | Pipeline de datos de revenue del cliente → BigQuery |
| **Brand Consistency Score real** | AI Agent de gobernanza registra score de cada pieza validada contra guidelines | Notion AI Agent + pipeline a BigQuery |
| **Knowledge Base visible** | Conteo de entradas de wiki por marca, última actualización, campañas documentadas | Pipeline de wiki de Notion → BigQuery |
| **Cycle time por fase con timestamps reales** | Registrar timestamp de cada cambio de fase CSC para calcular tiempo exacto por fase | Automation en Notion (on status change → log timestamp) o Notion ↔ Frame.io sync enriquecido |
| **Click en fase → drill down** | Al hacer clic en una fase del pipeline, mostrar lista de assets en esa fase con detalle | Componente modal o expandible |
| **Brief Clarity Score histórico** | Evolución de la calidad de briefs generada por AI Agent | Pipeline BCS → BigQuery |
| **Galería de assets recientes** | Thumbnails de las últimas piezas completadas | Integración Frame.io V4 API desde el portal |
| **Distribución por tipo de asset** | Donut chart: video, gráfico, social, copy, etc. | Propiedad `tipo_asset` en Notion |
| **Comparación entre proyectos** | Pipeline y métricas por proyecto, no solo agregadas | Filter por proyecto en query builder |

---

## Notas para agentes de desarrollo

- **Los colores de las fases CSC son colores de marca** (Brand Guideline v1.0). No inventar colores nuevos. Todos están en `GH_COLORS.cscPhase`.
- **Los benchmarks de industria son estimaciones razonables** basadas en datos del doc de ICO. Si Globe tiene benchmarks internos más precisos, usarlos.
- **El mapeo `estado → fase_csc` es una propuesta.** Antes de implementar, ejecutar la query de verificación de estados y ajustar. Es probable que los nombres de estados en Notion no coincidan exactamente con los documentados.
- **Data parcial es aceptable.** Si una columna no existe en BigQuery, la card muestra "Coming soon" o un empty state apropiado. El módulo no debe fallar por data faltante.
- **El componente PipelineCard es el más complejo.** Dedicar tiempo a que se vea bien, sea responsive, y tenga interacciones suaves. Es lo primero que el cliente va a mirar.
- **Usar ApexCharts** para el RpA Trend y la distribución de cycle time. Son charts estándar de Vuexy.
- **El ChainCard es SVG inline**, no un chart. Es un diagrama de 3 niveles con flechas — similar a una infografía. Puede construirse como componente React con SVG renderizado directamente.
- **Tests:** Al menos verificar que el query builder retorna data válida con los estados reales de BigQuery antes de conectar frontend.

---

*Efeonce Greenhouse™ • Creative Hub Module Spec*
*Efeonce Group — Marzo 2026 — CONFIDENCIAL*
