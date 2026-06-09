# 03 · Ecosistema de Producto

> Regla maestra: **cada plataforma puede venderse y operar de forma independiente. Cuando el cliente está en el ecosistema completo, Greenhouse es el hub donde todo converge.** Las plataformas verticales (Kortex, Verk) alimentan el hub sin depender de él para operar.

Efeonce tiene tres plataformas de software propietario, en distinta madurez:

| Plataforma | Territorio | ICP | GTM | Estado |
|---|---|---|---|---|
| **Greenhouse** | Experiencia de cliente + operaciones internas | Clientes activos de servicio Efeonce | B2B directo (parte del servicio) | Operativo (~77% madurez ASaaS) |
| **Kortex** | CRM Intelligence Platform (sobre HubSpot) | Fase 1: clientes Efeonce Digital. Fase 2: agencias HubSpot (B2B2B) | B2B2B → HubSpot Marketplace | Operativo (validado en producción) |
| **Verk** | Content + Distribution Operating System | Fase 1: interno. Fase 2: empresas con 20+ piezas/mes (B2B standalone) | B2B standalone | P0 en construcción |

**Por qué tres plataformas independientes y no un monolito:** ICP distinto por plataforma; narrativa ASaaS más potente (ecosistema de producto, no "agencia con portal"); independencia técnica (Verk no hereda el test coverage de Greenhouse; Kortex no depende del ciclo de releases de Verk); patrón ya probado (Kortex corre como plataforma independiente con integración bidireccional con Greenhouse).

---

## Greenhouse — el hub (lo tuyo)

**Territorio:** experiencia del cliente con Efeonce + operaciones internas (finanzas, RRHH, nómina, delivery, gestión de cuentas).
**Rol en el ecosistema:** el único login donde el cliente ve la operación completa —ICO, contenido, CRM, finanzas. Detalle de producto en `04`.

Por qué importa: Greenhouse es el que **genera switching cost sistémico** y el **hub donde convergen** las otras plataformas. En el GTM es el diferenciador tangible que cierra al BP3 (CEO) y sostiene renovaciones.

---

## Kortex — contexto (no es tu producto, pero conversa contigo)

CRM Intelligence Platform: captura estrategia en lenguaje natural → normaliza → compila manifests YAML → despliega en HubSpot vía API con trazabilidad. Capas: Schema Deployer, Workflow Deployer, UI Extensions (cards en HubSpot), Intelligence Layer (agente Claude), Portal Audit, Adopción por Hub.

**Lo que el agente de Greenhouse necesita saber:**
- **Kortex → Greenhouse:** el progreso de implementación CRM y los KPIs de adopción por hub aparecen en la vista **Account 360** del cliente (vía API REST / BigQuery).
- Tenant de Kortex = `portal_id` (HubSpot). Se vincula a Greenhouse con un mapping `portal_id → space_id`.
- Stack: Next.js + Vuexy (front), Python en Cloud Run (runtime), Cloud SQL + BigQuery (datos), HubSpot OAuth. Proyecto GCP `efeonce-kortex-dev`.

---

## Verk — contexto (no es tu producto, pero conversa contigo)

Content + Distribution Operating System. Donde la estrategia de distribución se convierte en contenido producido, aprobado, publicado y medido en ciclo continuo. Módulos: Surround Map™ (5 superficies × 4 capas), Brand Profiles, Content Calendar, Review + Approval, Tracking + Analytics, Diagnostics, SEO/AEO (AI citation tracking + entity authority), Verk Agent.

**Lo que el agente de Greenhouse necesita saber:**
- **Verk → Greenhouse:** el **Surround Map** y el resumen del content calendar se exponen como **embed card** en el dashboard del cliente (vía API REST).
- Tenant de Verk = `brand_id`, con `greenhouse_space_id` (nullable) como vínculo.
- Stack: Next.js/TypeScript/MUI/Vuexy, PostgreSQL (Cloud SQL, schema `verk_core`), BigQuery (dataset `verk`), Cloud Run para el agente.
- Principio: la ops layer funciona completa sin el agente; el agente la hace 10x más rápida.

---

## Arquitectura de integración

Tres plataformas independientes que comparten capa de datos y se comunican por **APIs REST**. El patrón que ya funciona entre Kortex y Greenhouse es el mismo para Verk.

### BigQuery como data lake compartido (proyecto GCP `efeonce-group`)

| Plataforma | Dataset propio | Lee de | Frecuencia |
|---|---|---|---|
| **Greenhouse** | `notion_ops`, `greenhouse` | `hubspot_crm`, `notion_ops` | Diario (cron 03:00–03:30) |
| **Kortex** | `kortex` | `hubspot_crm` | On-demand (per deployment) |
| **Verk** | `verk` | `hubspot_crm`, `notion_ops`, `searchconsole`, `analytics_*` | Nightly ETL + API real-time |

### Convergencia en Greenhouse
- **Verk → Greenhouse:** Surround Map + resumen de calendar como embed card en el dashboard.
- **Kortex → Greenhouse:** progreso de implementación + KPIs de adopción en Account 360.
- **Greenhouse como hub:** un solo login. Las verticales alimentan el hub sin depender de él para operar.

### Tenant mapping

| Plataforma | Entidad de tenant | Vínculo con Greenhouse | Vínculo con HubSpot |
|---|---|---|---|
| Greenhouse | `space_id` | — | `company_id` (Account 360) |
| Kortex | `portal_id` | `portal_id → space_id` | OAuth scoped por portal |
| Verk | `brand_id` | `greenhouse_space_id` (nullable) | Vía tracking + attribution |

> Patrón a respetar al construir integraciones en Greenhouse: **BigQuery como data lake compartido + API REST para consumo en tiempo real.** No acoples Greenhouse al runtime de otra plataforma; consume sus datos.

---

## El modelo ASaaS redefinido

Cada plataforma productiza un tipo de servicio distinto:

| Dimensión ASaaS | Greenhouse | Kortex | Verk |
|---|---|---|---|
| Servicio que productiza | Operación de cuenta + transparencia + gobernanza | Implementación y gestión de CRM | Producción de contenido + distribución |
| Valor acumulativo (= switching cost) | Historial ICO + inteligencia financiera + Person/Account 360 | Schema CRM + workflows + UI Extensions instaladas | Brand profiles + keyword universe + performance histórico |
| Intelligence layer | AI Tools + recomendaciones proactivas (roadmap → Nexa) | Agente Claude (manifests YAML) | Verk Agent (roadmap) |

> *Efeonce no es una agencia que tiene un portal. Es un ecosistema de producto con tres plataformas que además ofrece servicio. El servicio opera las plataformas. Las plataformas generan el switching cost. El switching cost protege el revenue. Ese es el flywheel ASaaS.*

---

## Jerarquía de IP propietaria (cómo se nombra hacia el cliente)

| Capa | Qué es | Cuándo se nombra |
|---|---|---|
| **Loop Marketing** | Filosofía: crecimiento compuesto. | Thought leadership. |
| **Nested Loops™** | Sistema estratégico Express→Tailor→Amplify→Evolve. | Propuestas. |
| **ICO** | Sistema operativo transversal: gobernanza, métricas, quality gates. | Diferenciador en pitches. Onboarding. |
| **Ecosistema de producto** | Greenhouse + Kortex + Verk. Modelo ASaaS. | Demo en pitch. Argumento de switching cost. |
| **Frameworks específicos** | Surround Discovery™, AEO, CSC, Revenue Enabled, SOLVE. | Solo en profundidad técnica. Se traducen a beneficios. |

**Cómo cobra vida la IP en Greenhouse:** Loop Marketing → ciclo completo visible en dashboards; ICO → métricas RpA/OTD%/FTR en el dashboard del cliente; Surround Discovery™ → embed card del Surround Map (vía Verk); Revenue Enabled → inteligencia financiera (revenue/costo/margen por cliente).

---

*Fuente: Efeonce Product Ecosystem v1.0 (documento ancla — prevalece sobre downstream en conflictos de arquitectura de producto).*
