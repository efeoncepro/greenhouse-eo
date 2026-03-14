# Greenhouse UI Request Brief Template

## Objetivo
Normalizar solicitudes de interfaz antes de elegir patrones Vuexy/MUI o implementar JSX.

Este brief aplica aunque la solicitud original venga de:
- una persona
- Claude
- Codex
- otro agente

## Regla
La solicitud original nunca se usa sola como criterio de implementacion.
Primero se traduce a este brief.

## Template

```md
## Request Source
- actor: `human | claude | codex | other_agent`
- original request:

## Surface
- route or area:
- surface type: `dashboard | admin_list | admin_detail | client_detail | settings | table_surface | detail_shell`

## Product Intent
- page intent: `executive_summary | operational_drilldown | governance | identity_access | comparison | inventory | roster | timeline`
- primary user:
- why this surface exists:

## Data Contract
- available data:
- missing data:
- data shape: `single_kpi | kpi_strip | short_trend | health_score | many_rows | small_roster | related_entities | mixed_summary | capability_inventory`
- data quality: `strong | partial | weak | seeded | override`
- provenance that must be visible:

## Interaction Model
- action density: `read_only | light_actions | heavy_actions`
- primary CTA:
- secondary actions:

## Reuse Decision
- repeatability: `shared_product_ui | module_local | route_local`
- existing local components to inspect first:
- candidate `full-version` references:

## Guardrails
- what this UI must not imply:
- product or data risks:
- validation path:
```

## Interpretacion minima obligatoria

Antes de pasar a implementacion, el agente que atiende la solicitud debe poder responder:
- cual es la signal dominante de la pantalla
- que patron principal la representa mejor
- si la data soporta esa representacion sin enganar
- si la primitive debe ir a `src/components/greenhouse/*` o quedarse local

## Ejemplo 1

```md
## Request Source
- actor: `codex`
- original request:
  "Necesito una vista admin para ver capabilities, owner, contactos CRM y usuarios provisionados"

## Surface
- route or area: `/admin/tenants/[id]`
- surface type: `admin_detail`

## Product Intent
- page intent: `governance`
- primary user: `efeonce_admin`
- why this surface exists:
  revisar salud de gobierno del tenant sin cambiar de sistema

## Data Contract
- available data:
  tenant summary, capabilities, HubSpot owner, contacts, provisioned users
- missing data:
  audit trail de mutaciones completa
- data shape: `mixed_summary`
- data quality: `strong`
- provenance that must be visible:
  distinguir lo live de HubSpot frente a lo sync-based

## Interaction Model
- action density: `light_actions`
- primary CTA:
  revisar o provisionar
- secondary actions:
  overflow menus o links auxiliares

## Reuse Decision
- repeatability: `module_local`
- existing local components to inspect first:
  `GreenhouseAdminTenantDetail`, `BrandLogo`, admin table primitives
- candidate `full-version` references:
  `UserDetails`, `UserListTable`, `OptionMenu`

## Guardrails
- what this UI must not imply:
  que HubSpot y Greenhouse siempre estan sincronizados en tiempo real
- product or data risks:
  capabilities aun pueden depender de sync o override
- validation path:
  visual QA autenticado en `/admin/tenants/[id]`
```

## Ejemplo 2

```md
## Request Source
- actor: `claude`
- original request:
  "Quiero mejorar la lectura del dashboard para que el estado del space se entienda en 10 segundos"

## Surface
- route or area: `/dashboard`
- surface type: `dashboard`

## Product Intent
- page intent: `executive_summary`
- primary user: `client_executive`
- why this surface exists:
  explicar salud operativa, ritmo de entrega y riesgos visibles

## Data Contract
- available data:
  hero, KPIs, throughput, quality, tooling, account team, projects at risk
- missing data:
  capacity formal y campaign semantics completas
- data shape: `mixed_summary`
- data quality: `partial`
- provenance that must be visible:
  seeded, override o fallback cuando aparezcan

## Interaction Model
- action density: `read_only`
- primary CTA:
  drilldown hacia proyectos
- secondary actions:
  ninguna dominante

## Reuse Decision
- repeatability: `shared_product_ui`
- existing local components to inspect first:
  `ExecutiveHeroCard`, `ExecutiveMiniStatCard`, `ExecutiveCardShell`
- candidate `full-version` references:
  `WebsiteAnalyticsSlider`, `SalesOverview`, `SupportTracker`

## Guardrails
- what this UI must not imply:
  que Greenhouse reemplaza Notion o tiene una capa semantica cerrada para todo
- product or data risks:
  capacity y campaigns siguen incompletos
- validation path:
  visual QA autenticado con `view-as` o tenant real
```
