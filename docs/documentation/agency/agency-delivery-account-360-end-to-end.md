# Agency, Delivery y Account 360 end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Agency / Delivery / Account 360 / ICO
> **Rutas principales:** `/agency`, `/agency/organizations/[id]`, `/agency/clients`, `/agency/delivery`, `/agency/economics`, `/agency/sample-sprints`, `/agency/services`, `/agency/staff-augmentation`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`, `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`, `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Para que sirve

Agency es la capa operacional para entender cuentas, delivery, equipo, servicios, economics y senales ICO. Account 360 concentra facetas de una organizacion; Delivery/ICO explica el desempeno operativo; Finance aporta revenue/cost/margin.

El sistema no debe inventar salud de una cuenta si una fuente esta incompleta. Debe mostrar degradacion honesta o pendiente.

## Evidencia revisada

Codigo y rutas:

- APIs `src/app/api/agency/**`, `src/app/api/organizations/[id]/**`, `src/app/api/organization/[id]/360`, `src/app/api/ico-engine/**`, `src/app/api/analytics/delivery`.
- Librerias `src/lib/account-360/**`, `src/lib/agency/**`, `src/lib/ico-engine/**`, `src/lib/sync/projections/ico-*`, `src/lib/commercial/sample-sprints/**`.
- Vistas `/agency/organizations`, `/agency/clients`, `/agency/economics`, `/agency/sample-sprints`, `/agency/services`, `/agency/staff-augmentation`.

DB agregada sin PII:

- `greenhouse_serving.ico_member_metrics`: 26.
- `ico_organization_metrics`: 8.
- `organization_operational_metrics`: 8.
- `ico_ai_signals`: 22; enrichments/history tienen datos.
- `deal_pipeline_snapshots`: 35.
- `member_capacity_economics`: 106.
- `service_attribution_facts`: 2; `service_attribution_unresolved`: 13. Esto confirma que economics por servicio existe como foundation parcial, no como P&L completo por servicio.

## Mapa funcional

| Capa | Que contiene | Fuente |
|---|---|---|
| Account 360 | CRM, delivery, economics, finance, services, spaces, team, staff-aug | `src/lib/account-360/facets/**` |
| Delivery | proyectos, tareas, estados, OTD/RpA/FTR/cycle time | Notion/ICO projections |
| ICO Engine | metricas operativas materializadas, señales AI, snapshots | `greenhouse_serving.ico_*` |
| Agency Operations | services, sample sprints, staff augmentation, team/capacity | `src/lib/agency/**`, `src/lib/commercial/sample-sprints/**` |
| Economics | revenue/cost/margin a nivel cuenta/space; service attribution parcial | Finance + serving |

## Flujo end-to-end

1. Una organizacion se identifica como cliente/prospecto en Core/Commercial.
2. Account 360 resuelve el organization id canonico y compone facetas visibles segun acceso.
3. Delivery trae proyectos/tareas/metricas desde fuentes sincronizadas.
4. ICO materializa metricas por miembro/organizacion y señales AI.
5. Finance/Commercial aportan revenue, pipeline, contratos y economics.
6. Agency muestra salud, riesgos, capacidad, servicios y acciones recomendadas.
7. Sample Sprints y Staff Augmentation operan como subflujos comerciales/operativos conectados, no como metricas aisladas.

## Que hace automatico Greenhouse

- Compone facetas Account 360 server-side.
- Aplica autorizacion por facet; no todas las personas ven todas las dimensiones.
- Materializa metricas ICO y snapshots serving.
- Lee signals AI y degradacion/freshness.
- Relaciona deals, servicios, capacidad y delivery cuando hay anchors.
- Marca unresolved attribution cuando no hay suficiente evidencia.

## Que hace el operador

- Revisa salud de cuenta y facetas disponibles.
- Interpreta degradaciones y gaps de datos.
- Atiende sample sprints, servicios y staffing.
- Revisa capacity/economics antes de prometer delivery.
- Corrige anchors o datos fuente cuando una faceta esta incompleta.

## Fronteras importantes

- Account 360 es un reader compuesto; no es una tabla unica.
- ICO no reemplaza performance formal HR ni payroll.
- `service_attribution_unresolved` no debe mostrarse como margen calculado.
- Agency puede explicar riesgo operacional, pero no debe prometer acciones automaticas sin command bridge.
- Finance es source para caja/P&L; Agency consume signals economicos.

## Preguntas que Nexa debe responder

- Como leo Account 360?
- Que significan delivery, economics, finance y team facets?
- Que es ICO y que metricas usa?
- Que hago si una cuenta aparece degradada?
- Como reviso sample sprints?
- Que diferencia hay entre service attribution y Service P&L completo?
- Como se relacionan Delivery, Finance y Commercial en una cuenta?

## Documentacion relacionada

- `docs/documentation/agency/cuenta-completa-360.md`
- `docs/documentation/agency/organizaciones-workspace.md`
- `docs/documentation/delivery/motor-ico-metricas-operativas.md`
- `docs/documentation/delivery/nexa-insights-bloque-agency.md`
- `docs/documentation/comercial/sample-sprints.md`
- `docs/documentation/finance/distribucion-costos-pnl.md`
