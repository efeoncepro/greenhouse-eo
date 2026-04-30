# EPIC-009 — Critical Metrics Integrity: Notion, ICO, Payroll & Reliquidación Hardening

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-009-critical-metrics-integrity`
- GitHub Issue: `none`

## Summary

Programa cross-domain para blindar el carril crítico `Notion -> notion_ops -> conformed -> ICO -> Payroll -> Reliquidación` antes de cualquier modernización cosmética o de mantenibilidad como el SDK oficial de Notion. El foco no es “migrar librerías”, sino asegurar integridad histórica, trazabilidad de KPI, gates de nómina, observabilidad y ownership operativo sobre el pipeline que ya impacta bonificaciones y potencialmente reliquidaciones de nómina.

## Why This Epic Exists

Las tres auditorías de 2026-04-30 muestran una contradicción fuerte:

- Greenhouse ya usa `ICO` y `Payroll` para decisiones con sensibilidad salarial real.
- El pipeline que alimenta esos cálculos sigue repartido entre este repo, un servicio externo `notion-bq-sync`, readers duplicados y contratos de snapshot todavía no suficientemente duros para payroll/reliquidación.
- La modernización del cliente Notion del portal sí conviene, pero **no es la primera línea de riesgo**.

Además, la revalidación posterior contra codebase y Cloud SQL confirmó que la reliquidación no es hipotética:

- existe `greenhouse_payroll.payroll_period_reopen_audit`
- existen entries con `version > 1`
- ya hay al menos una reapertura real del período `2026-03`
- en database solo existe `kpi_data_source`, sin provenance rica del modo KPI usado para cálculo oficial

Eso vuelve este programa más amplio que una sola task: mezcla payroll safety, freeze histórico, hardening del engine ICO, boundaries de consumo y, recién después, la modernización del carril Notion.

## Outcome

- Payroll oficial no puede avanzar silenciosamente con KPI faltantes o ambiguos cuando el bono depende de `ICO`.
- Los snapshots históricos usados por `ICO` y reliquidación son reproducibles e inmutables bajo contrato explícito.
- La materialización `ICO` deja de depender de `DELETE + INSERT` sin locking ni aislamiento de lane AI.
- Greenhouse consume el pipeline Notion con boundaries más seguros y menos lectura raw dispersa.
- La migración al SDK oficial de Notion ocurre después de estabilizar el carril crítico y con contrato de ownership más claro.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Child Tasks

- `TASK-732` — payroll safety gate + KPI provenance durable para cálculo oficial y re-liquidación
- `TASK-733` — true freeze de snapshots ICO + reproducibilidad histórica para payroll/reliquidación
- `TASK-734` — hardening de materialización ICO: concurrencia, atomicidad, idempotencia y aislamiento AI
- `TASK-735` — convergencia de consumers/readers ICO a surfaces scopeadas y canónicas
- `TASK-736` — hardening del consumo Greenhouse de `notion-bq-sync` y reducción de raw readers
- `TASK-737` — contrato de hardening upstream + absorption readiness de `notion-bq-sync`
- `TASK-738` — migración del cliente directo del portal al SDK oficial de Notion
- `TASK-739` — readiness para modernización de API Notion (`databases` legacy -> `data sources`)

## Existing Related Work

- `docs/audits/notion/notion-bq-sync/NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- `docs/audits/notion/notion-bq-sync/GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30.md`
- `docs/audits/ico/ICO_ENGINE_AUDIT_2026-04-30.md`
- `docs/tasks/complete/TASK-409-payroll-reliquidation-program.md`
- `docs/tasks/complete/TASK-410-payroll-period-reopen-foundation-versioning.md`
- `docs/tasks/complete/TASK-411-payroll-reliquidation-finance-delta-consumer.md`
- `docs/tasks/complete/TASK-412-payroll-reliquidation-admin-ui-preview-audit.md`
- `docs/tasks/to-do/TASK-414-payroll-reopen-policy-engine-hardening.md`
- `docs/tasks/complete/TASK-729-payroll-reliability-module.md`
- `docs/tasks/to-do/TASK-730-payroll-e2e-smoke-lane.md`
- `docs/tasks/to-do/TASK-731-payroll-pre-close-validator.md`

## Exit Criteria

- [ ] existe un gate explícito que impide nómina oficial con KPI críticos faltantes o ambiguos cuando corresponda
- [ ] payroll y reliquidación conservan provenance durable del KPI usado, no solo `kpi_data_source='ico'`
- [ ] un período/snapshot `locked` de ICO no se puede reescribir por reconcile/backfill normal
- [ ] la materialización ICO tiene exclusión mutua, semántica de run y aislamiento seguro de la lane AI
- [ ] los consumers principales usan readers/surfaces scopeadas y canónicas en vez de contratos divergentes
- [ ] Greenhouse y `notion-bq-sync` tienen contrato de operación y hardening documentado para el carril crítico
- [ ] la migración al SDK de Notion queda ejecutada o preparada sin mezclarla con el riesgo crítico de payroll/ICO

## Non-goals

- absorber inmediatamente `notion-bq-sync` al monorepo sin readiness previa
- rehacer por completo `Payroll` o `ICO` en una sola entrega
- vender la migración al SDK de Notion como solución primaria del riesgo de bonificaciones
- cambiar secrets Notion u OAuth por defecto en la primera ola

## Delta 2026-04-30

Epic creado después de contrastar tres auditorías cross-domain con verificación adicional en codebase y Cloud SQL. La decisión rectora queda explícita: primero integridad crítica de métricas y reliquidación; después SDK y modernización de API Notion.
