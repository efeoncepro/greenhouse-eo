# 03 · Ecosistema de Producto

> Regla maestra: **cada plataforma puede venderse y operar de forma independiente. Cuando el cliente está en el ecosistema completo, Greenhouse es el hub donde todo converge.** Las plataformas verticales (Kortex, Verk y Efeonce Globe / Creative Studio) alimentan el hub sin depender de él para operar.

Efeonce tiene cuatro plataformas de software propietario, en distinta madurez:

| Plataforma | Territorio | ICP | GTM | Estado |
|---|---|---|---|---|
| **Greenhouse** | Experiencia de cliente + operaciones internas | Clientes activos de servicio Efeonce | B2B directo (parte del servicio) | Operativo (~77% madurez ASaaS) |
| **Kortex** | CRM Intelligence Platform (sobre HubSpot) | Fase 1: clientes Efeonce Digital. Fase 2: agencias HubSpot (B2B2B) | B2B2B → HubSpot Marketplace | Operativo (validado en producción) |
| **Verk** | Content + Distribution Operating System | Fase 1: interno. Fase 2: empresas con 20+ piezas/mes (B2B standalone) | B2B standalone | P0 en construcción |
| **Efeonce Globe** *(Creative Studio)* | Producción creativa agentic: imagen, video, audio, assets, review y créditos | Fase 1: equipo Efeonce. Fase 2: equipos creativos/marketing de clientes | Capability Efeonce operada en modo managed, co-operated o client-operated; acceso B2B futuro y gobernado | Operativo internal-only en tres rutas; acceso comercial/cliente sigue gateado (EPIC-028) |

**Por qué cuatro plataformas independientes y no un monolito:** ICP y ritmo de producto distintos; narrativa ASaaS más potente (ecosistema de producto, no "agencia con portal"); independencia técnica (Globe no hereda el runtime pesado de Greenhouse; Verk no hereda su test coverage; Kortex no depende del ciclo de releases de Verk); patrón ya probado (Kortex corre como plataforma independiente con integración bidireccional con Greenhouse).

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

## Efeonce Globe — Creative Studio de producción agentic (plataforma hermana)

Capability para dirigir y operar generación de imagen, video, audio y extensiones futuras mediante templates, referencias, assets, review y crédito gobernado. Nace con una superficie UI y una superficie MCP/agente sobre el mismo contrato; no es una galería de prompts ni un módulo de Greenhouse.

La interfaz primaria habla el lenguaje de una persona creativa: brief, referencias, tratamiento, candidatos, variantes, feedback y aprobación. El sistema compila esas decisiones en un workflow ejecutable; no exige diseñar nodos ni conocer providers. Un canvas técnico queda como authoring avanzado cuando la evidencia lo justifique.

**Propósito de producto:** devolverle al equipo el espacio rico de pensar, explorar, dirigir y decidir, y asumir
por debajo la ingeniería necesaria para lograr un resultado profesional. El equipo creativo es protagonista; el
operador activo es el punto de vista; Globe es guía/sistema; los modelos son maquinaria. La UI no debe pedirle a
la persona que actúe como prompt engineer, router de proveedores, calculadora de créditos ni operadora de retries.

Eso no significa ocultar el sistema. Globe expone costo, ruta/modelo, provenance, restricciones, incertidumbre y
fallback cuando cambian una decisión material, y conserva el original hasta aceptación. Automatiza fricción y
repetición; no automatiza silenciosamente gusto, derechos, presupuesto, aprobación o publicación.

### Modelo operativo

| Modo | Quién opera | Qué conserva el cliente | Qué responde Efeonce |
|---|---|---|---|
| **Client-operated** | Equipo creativo/marketing del cliente sobre templates acotados | Dirección, ejecución y delivery que controla | Plataforma, policy, soporte y límites pactados |
| **Co-operated** | Cliente y Efeonce se reparten lanes/etapas con owner explícito | Brand authority y aprobaciones definidas | El tramo de producción/delivery que controla |
| **Efeonce-managed** | Efeonce construye y opera; el cliente aprueba | Brief, marca y decisión final | Delivery pactado, OTD/FTR y gobierno del scope controlado |

Los modos usan el mismo workspace, run, assets, review y ledger. Son asignaciones de autoridad, no plataformas
ni modalidades comerciales distintas. La taxonomía separa modelo de delivery (`Managed Squad`, `Staff
Augmentation`, `Studio Access`), forma de engagement (`On-Going`, `On-Demand`, `Sample Sprint`) y modo operativo;
este último declara quién dirige, ejecuta y responde en cada run/lane. Canon económico: [Creative Studio
Business Model V1](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md).

**Lo que el agente de Greenhouse necesita saber:**

- Globe es dueño de `studio_workspace_id`, assets, runs, provider attempts, revisión y ledger de créditos. Greenhouse puede enlazar una organización/espacio mediante binding explícito, nunca por tablas compartidas.
- Cada run debe declarar operador, aprobadores de creatividad/gasto, autoridad de template/derechos y owner de delivery. Cambiar de modo conserva contexto y no eleva permisos por sí solo.
- Un output `candidate_ready` no significa aprobable/publicable. Sólo se proyectan a Greenhouse o Verk entregables con la decisión y scope autorizados.
- El primer acceso es interno. Cliente, upload externo, pagos y venta de créditos quedan sujetos a los gates del [EPIC-028](../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md).
- Arquitectura/ADR: `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_*.md`.

El flywheel de producto y servicio es deliberado: Efeonce opera y valida craft → el Studio conserva el patrón → el cliente gana autonomía sobre trabajo repetible → el uso produce evidencia → Efeonce absorbe complejidad, excepciones y picos → los templates mejoran. El acceso cliente no canibaliza la agencia: desplaza valor desde repetición manual hacia dirección, sistemas creativos, QA y capacidad elástica.

Los equipos creativos de otras agencias son una hipótesis B2B2B de validación, no un ICP ni un modo adicional.
Antes de habilitarlos deben resolverse tenancy agencia→cliente final, confidencialidad, rights, brand authority,
white-label/endorsed, accountability y margen. El canon vive en el
[Creative Studio Business Model V1.1](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md).

---

## Arquitectura de integración

Cuatro plataformas independientes que se comunican por **APIs REST/eventos versionados** y comparten sólo la capa analítica autorizada cuando corresponde. El patrón que ya funciona entre Kortex y Greenhouse es el punto de partida para Verk y Globe; no autoriza data stores compartidos.

### BigQuery como data lake compartido (proyecto GCP `efeonce-group`)

| Plataforma | Dataset propio | Lee de | Frecuencia |
|---|---|---|---|
| **Greenhouse** | `notion_ops`, `greenhouse` | `hubspot_crm`, `notion_ops` | Diario (cron 03:00–03:30) |
| **Kortex** | `kortex` | `hubspot_crm` | On-demand (per deployment) |
| **Verk** | `verk` | `hubspot_crm`, `notion_ops`, `searchconsole`, `analytics_*` | Nightly ETL + API real-time |
| **Efeonce Globe** | `TBD — export analítico autorizado` | Sólo datasets autorizados por contrato | No habilitado hasta integración aprobada |

### Convergencia en Greenhouse
- **Verk → Greenhouse:** Surround Map + resumen de calendar como embed card en el dashboard.
- **Kortex → Greenhouse:** progreso de implementación + KPIs de adopción en Account 360.
- **Globe → Greenhouse:** sólo referencias a entregables aprobados, estados o uso acordado mediante contrato/evento versionado; nunca assets privados, créditos o provider logs por defecto.
- **Greenhouse como hub:** un solo login. Las verticales alimentan el hub sin depender de él para operar.

### Tenant mapping

| Plataforma | Entidad de tenant | Vínculo con Greenhouse | Vínculo con HubSpot |
|---|---|---|---|
| Greenhouse | `space_id` | — | `company_id` (Account 360) |
| Kortex | `portal_id` | `portal_id → space_id` | OAuth scoped por portal |
| Verk | `brand_id` | `greenhouse_space_id` (nullable) | Vía tracking + attribution |
| Efeonce Globe | `studio_workspace_id` | binding explícito a `space_id` (cuando aplique) | Vía organización/engagement autorizado, no implícito |

> Patrón a respetar al construir integraciones en Greenhouse: **BigQuery como data lake compartido + API REST para consumo en tiempo real.** No acoples Greenhouse al runtime de otra plataforma; consume sus datos.

---

## El modelo ASaaS redefinido

Cada plataforma productiza un tipo de servicio distinto:

| Dimensión ASaaS | Greenhouse | Kortex | Verk | Efeonce Globe |
|---|---|---|---|
| Servicio que productiza | Operación de cuenta + transparencia + gobernanza | Implementación y gestión de CRM | Producción de contenido + distribución | Dirección, producción y autonomía progresiva sobre media agentic |
| Valor acumulativo (= switching cost) | Historial ICO + inteligencia financiera + Person/Account 360 | Schema CRM + workflows + UI Extensions instaladas | Brand profiles + keyword universe + performance histórico | Reference packs + templates + lineage de assets + decisiones/revisión creativa |
| Intelligence layer | AI Tools + recomendaciones proactivas (roadmap → Nexa) | Agente Claude (manifests YAML) | Verk Agent (roadmap) | Agentes/MCP con `propose→approve→execute` |

> *Efeonce no es una agencia que tiene un portal. Es un ecosistema de producto con cuatro plataformas que además ofrece servicio. El servicio opera las plataformas. Las plataformas generan el switching cost. El switching cost protege el revenue. Ese es el flywheel ASaaS.*

---

## Jerarquía de IP propietaria (cómo se nombra hacia el cliente)

| Capa | Qué es | Cuándo se nombra |
|---|---|---|
| **Loop Marketing** | Filosofía: crecimiento compuesto. | Thought leadership. |
| **Nested Loops™** | Sistema estratégico Express→Tailor→Amplify→Evolve. | Propuestas. |
| **ICO** | Sistema operativo transversal: gobernanza, métricas, quality gates. | Diferenciador en pitches. Onboarding. |
| **Ecosistema de producto** | Greenhouse + Kortex + Verk + Efeonce Globe (Creative Studio; nombre público/packaging pendiente). Modelo ASaaS. | Demo en pitch. Argumento de switching cost. |
| **Frameworks específicos** | Surround Discovery™ (S⁴: SENSE → SHAPE → SURFACE → SOLVE), AEO, CSC, Revenue Enabled. | Solo en profundidad técnica. Se traducen a beneficios. |

**Cómo cobra vida la IP en Greenhouse:** Loop Marketing → ciclo completo visible en dashboards; ICO → métricas RpA/OTD%/FTR en el dashboard del cliente; Surround Discovery™ → embed card del Surround Map (vía Verk); Revenue Enabled → inteligencia financiera (revenue/costo/margen por cliente).

---

*Fuente: Efeonce Product Ecosystem v1.0 (documento ancla — prevalece sobre downstream en conflictos de arquitectura de producto).*

*Última verificación de drift contra runtime: 2026-07-23 — Efeonce Globe opera internal-only con Producer,
persistencia y tres rutas promovidas; clientes externos y la hipótesis B2B2B siguen gateados por EPIC-028.
Targets/fechas comerciales son intencionales.*
