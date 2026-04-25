# Greenhouse Reliability Control Plane V1

> Spec canónica del `Reliability Control Plane` de Greenhouse EO. Define el registry por módulo, el modelo unificado de señales, el contrato de evidencia y cómo `Admin Center`, `Ops Health` y `Cloud & Integrations` consumen la lectura consolidada sin duplicar fuentes.
>
> Versión: `1.0`
> Estado: `vigente`
> Creada: `2026-04-25` por TASK-600
> Última actualización: `2026-04-25`

---

## 1. Por qué existe

Greenhouse ya tenía señales útiles, pero aisladas:

- `getOperationsOverview()` agregaba subsistemas, backlog reactivo, webhooks, cloud posture, observabilidad y data quality Notion.
- `GET /api/internal/health` exponía postura cloud y checks runtime.
- Sentry, `source_sync_runs`, Playwright smoke y Billing Export viven en planos distintos.

Faltaba una capa estructural que dijera **qué módulos son críticos**, **qué señales les pertenecen** y **cómo se normaliza su estado**. Sin esa base, cada nueva feature de observabilidad agrega más cards, no un sistema de confianza.

El Reliability Control Plane se sienta **encima** de las fuentes existentes — no las reemplaza, las normaliza.

## 2. Principios de diseño

1. **Registry-first.** Empezar declarando qué módulos críticos existen y qué señales les pertenecen, antes de cualquier UI o LLM.
2. **Evidence-first.** Cada señal normalizada apunta a evidencia real: endpoint, helper, incidente, test, run, doc, SQL, métrica.
3. **Module-oriented.** La lectura final responde tres preguntas por módulo: ¿qué está afectado? ¿cuán confiable está hoy? ¿por qué?
4. **Integración incremental.** TASK-586 agrega cost cloud y notion-bq-sync sin redefinir contratos. TASK-599 agrega smoke/component/route sin tocar el modelo.
5. **No duplicar contracts existentes.** `getOperationsOverview()` y `GET /api/internal/health` siguen siendo dueños de su lectura técnica; el control plane consume de ellos.

## 3. Contracts canónicos

Todos los tipos viven en [`src/types/reliability.ts`](../../src/types/reliability.ts).

### 3.1 `ReliabilityModuleDefinition` (registry estático)

Cada entrada del registry declara:

| Campo | Descripción |
|---|---|
| `moduleKey` | Identificador estable del módulo (`finance`, `integrations.notion`, `cloud`, `delivery`). |
| `label` | Nombre visible. |
| `description` | Una línea explicando el alcance operativo. |
| `domain` | Dominio macro (`platform`, `integrations`, `finance`, `delivery`). |
| `routes` | Rutas críticas que operadores esperan navegables. |
| `apis` | APIs críticas. |
| `dependencies` | Dependencias operativas que, si fallan, propagan al módulo. |
| `smokeTests` | Specs de Playwright que protegen el módulo hoy. |
| `expectedSignalKinds` | Tipos de señal que se esperan vivos para este módulo. |

El seed inicial vive en [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) y persiste como código estático. Persistencia DB se evaluará si Discovery posterior demuestra necesidad.

### 3.2 `ReliabilitySignal` (modelo unificado)

| Campo | Descripción |
|---|---|
| `signalId` | Identificador estable (`cloud.runtime.postgres`, `integrations.notion.data_quality`). |
| `moduleKey` | Módulo al que pertenece. |
| `kind` | `runtime` \| `posture` \| `incident` \| `freshness` \| `data_quality` \| `cost_guard` \| `subsystem` \| `test_lane` \| `billing`. |
| `source` | Helper origen (`getCloudHealthSnapshot`, `getCloudSentryIncidents`, etc). |
| `label` | Etiqueta visible. |
| `severity` | `ok` \| `warning` \| `error` \| `unknown` \| `not_configured` \| `awaiting_data`. |
| `summary` | Resumen humano de lo observado. |
| `evidence[]` | Array de pointers a evidencia real (kind + label + value). |
| `observedAt` | Timestamp de la observación. |

`severity` separa explícitamente `not_configured` y `awaiting_data` de `unknown` para que la señal nunca se asuma sana cuando no está plomada.

### 3.3 `ReliabilityModuleSnapshot` (vista por módulo)

Combina la definición + las señales agregadas + el estado computado:

- `status`: peor severidad agregada de las señales del módulo.
- `confidence`: `high` \| `medium` \| `low` \| `unknown` según ratio de señales esperadas que tienen evidencia concreta.
- `summary`: lectura humana en una línea.
- `signalCounts`: histograma por severidad.
- `missingSignalKinds`: tipos esperados sin plomar (boundary explícito para tasks futuras).

### 3.4 `ReliabilityIntegrationBoundary`

Declara qué task futura va a plomar qué señal:

| Campo | Descripción |
|---|---|
| `taskId` | TASK-586, TASK-599, TASK-103. |
| `moduleKey` | Módulo destino. |
| `expectedSignalKind` | Tipo de señal que se espera. |
| `expectedSource` | Helper que se espera implementar. |
| `status` | `pending` \| `partial` \| `ready`. |
| `note` | Cómo se enchufa al runtime. |

## 4. Reader consolidado

[`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) compone:

1. Subsistemas de `OperationsOverview.subsystems` → señales `kind=subsystem` (mapeadas por nombre a su módulo).
2. `OperationsOverview.cloud.health.runtimeChecks` → señales `kind=runtime` (módulo `cloud`).
3. `OperationsOverview.cloud.health.postureChecks` → señales `kind=posture` (módulo `cloud`).
4. `OperationsOverview.cloud.observability.incidents` → señales `kind=incident` (módulo `cloud`, top 3 abiertos).
5. `OperationsOverview.cloud.observability.posture` → señal posture observabilidad.
6. `OperationsOverview.cloud.bigquery.blockedQueries` → señal `kind=cost_guard` (módulo `cloud`).
7. `OperationsOverview.notionDeliveryDataQuality` → señales `kind=data_quality` para `integrations.notion` y `delivery`.

El reader **no hace fetches propios**: consume el `OperationsOverview` que el caller ya construyó. Si el caller no lo trae, el reader hace un fallback a `getOperationsOverview()`.

## 5. Surfaces consumidoras

| Surface | Rol |
|---|---|
| `Admin Center` (`/admin`) | Lectura ligera "Confiabilidad por módulo" — 1 card por módulo + chips de totales + boundaries pendientes. Foundation visible. |
| `Ops Health` (`/admin/ops-health`) | Detalle técnico de subsystems, reactive backlog, webhooks. **Sigue siendo dueño** de la lectura técnica. |
| `Cloud & Integrations` (`/admin/integrations`) | Detalle de syncs, posture cloud, secret refs. **Sigue siendo dueño** de la lectura cloud. |
| `GET /api/admin/reliability` | Endpoint protegido `requireAdminTenantContext()`. Reusable por agentes, synthetic monitors y change-based verification. |

La spec impone separación explícita: la nueva surface **no reemplaza** a las especialistas. Es complemento.

## 6. Severidad y aggregation

Mapeos canónicos (`src/lib/reliability/severity.ts`):

| Source | Source value | ReliabilitySeverity |
|---|---|---|
| `CloudHealthStatus` | `ok`/`degraded`/`error`/`not_configured` | `ok`/`warning`/`error`/`not_configured` |
| `CloudPostureStatus` | `ok`/`warning`/`unconfigured` | `ok`/`warning`/`not_configured` |
| `OperationsHealthStatus` | `healthy`/`degraded`/`down`/`not_configured`/`idle` | `ok`/`warning`/`error`/`not_configured`/`awaiting_data` |
| `IntegrationDataQualityStatus` | `healthy`/`degraded`/`broken`/`unknown` | `ok`/`warning`/`error`/`unknown` |
| `CloudSentryIncidentLevel` | `fatal`/`error`/`warning`/`info`/`unknown` | `error`/`error`/`warning`/`ok`/`unknown` |

Aggregation por módulo: peor severidad concreta. Estados pendientes (`not_configured`, `awaiting_data`, `unknown`) **nunca** ocultan un `warning` o `error` real.

Confidence:

- `high` ≥ 80% de señales esperadas tienen evidencia concreta (`ok`/`warning`/`error`).
- `medium` ≥ 50%.
- `low` < 50%.
- `unknown` 0 señales presentes.

## 7. Cómo enchufar TASK-586 y TASK-599

Cada upstream debe:

1. Implementar su helper de fetch (ej. `getGcpBillingOverview`, `getFinanceSmokeLaneStatus`).
2. Agregar un adapter en [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts) que normalice su output a `ReliabilitySignal[]`.
3. Componer el adapter en `buildReliabilityOverview()`.
4. Mover el `ReliabilityIntegrationBoundary` correspondiente de `pending` → `ready`.

No requiere cambios al contrato ni al UI: las nuevas señales aparecen automáticamente en el módulo correspondiente y el conteo `missingSignalKinds` se reduce.

## 8. Roadmap de follow-ups

- Synthetic monitoring periódico que ejecute las rutas críticas declaradas en el registry.
- Change-based verification matrix: cuando un PR toca un archivo `owned` por un módulo, correr el smoke + signal correspondiente.
- Correlador explicativo (LLM o reglas) que correlacione incidentes Sentry con módulos por path/title.
- Persistencia DB del registry si aparece necesidad de overrides por tenant o de SLOs configurables.

## 9. Cosas que NO hace V1

- No define entitlements nuevos. Reusa `requireAdminTenantContext()`.
- No persiste señales históricas. Cada lectura es snapshot.
- No automatiza remediaciones.
- No implementa synthetic monitoring real.
- No reemplaza Sentry, `source_sync_runs`, Playwright ni Billing Export.

## 10. Archivos canónicos

- Tipos: [`src/types/reliability.ts`](../../src/types/reliability.ts)
- Registry: [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts)
- Severity helpers: [`src/lib/reliability/severity.ts`](../../src/lib/reliability/severity.ts)
- Signal adapters: [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts)
- Reader: [`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts)
- API: [`src/app/api/admin/reliability/route.ts`](../../src/app/api/admin/reliability/route.ts)
- UI primitive: [`src/components/greenhouse/ReliabilityModuleCard.tsx`](../../src/components/greenhouse/ReliabilityModuleCard.tsx)
- Surface entrypoint: sección en [`src/views/greenhouse/admin/AdminCenterView.tsx`](../../src/views/greenhouse/admin/AdminCenterView.tsx)
