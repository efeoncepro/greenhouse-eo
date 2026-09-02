# Efeonce Salesforce Service Offer Architecture V1

> **Estado:** `Approved for validation`
> **Owner:** Efeonce · Revenue Operations & CRM
> **Fecha:** 2026-09-02
> **Alcance:** arquitectura comercial y de delivery para Salesforce CRM, Marketing Cloud Engagement y Marketing
> Cloud Next
> **No autoriza:** claims de partnership, badges, certificaciones, reventa, pricing, entitlements ni publicación
> de casos sin evidencia vigente

## Decisión

Efeonce ofrece una práctica Salesforce orientada a convertir una plataforma o base instalada en una operación
conectada, adoptada y medible. La oferta se organiza por el progreso que compra el cliente y por el lifecycle de
la relación, no como un catálogo de clouds.

La relación de marca y servicio es:

```text
Efeonce
└── Revenue Operations & CRM
    └── Salesforce Services
        ├── Diagnose & Architect
        ├── Implement & Integrate
        ├── Activate & Adopt
        └── Operate & Evolve
```

Salesforce es la plataforma habilitadora. Efeonce conserva la responsabilidad sobre discovery, diseño,
implementación, enablement y operación únicamente dentro del alcance contratado. Licencias, add-ons, consumo,
servicios Efeonce, terceros e impuestos permanecen separados.

## Promesa de la práctica

> **Conectamos CRM, servicio, marketing, datos, automatización y agentes para que Salesforce funcione como una
> sola operación alrededor del cliente.**

La promesa no garantiza revenue, ROI, autonomía de agentes, deliverability ni migración. Efeonce controla la
calidad del diagnóstico, la arquitectura, la implementación acordada, la verificación, el enablement y la
operación contratada; los resultados de negocio dependen además de adopción, datos, licencias, equipos, canales,
oferta, presupuesto y decisiones del cliente.

## Problema, trigger y Jobs-to-be-Done

### Trigger de base instalada

Cuando una organización ya usa Salesforce, pero sus equipos, datos o procesos siguen fragmentados, quiere
identificar y activar las oportunidades de mejora con menor riesgo para obtener más continuidad comercial,
productividad, servicio y aprendizaje sin reemplazar lo que todavía funciona.

### Trigger greenfield o expansión

Cuando una organización evalúa implementar Salesforce o ampliar su stack, quiere decidir qué producto, alcance y
secuencia necesita para evitar una compra sobredimensionada, una arquitectura inconexa o una operación que no pueda
sostener.

### JTBD principal

> Cuando nuestra relación con clientes cruza varios equipos, canales y sistemas, queremos convertir Salesforce en
> el sistema operativo compartido de esa relación para actuar con contexto, automatizar con control y aprender de
> cada ciclo.

## Customer model

### ICP estratégico

Organizaciones mid-market y enterprise con una o más de estas condiciones:

- base Salesforce instalada con deuda, baja adopción, procesos manuales o expansión pendiente;
- ventas, servicio o marketing multi-equipo, multi-marca, multi-país, B2C de volumen o con exigencias de gobierno;
- necesidad real de seguridad granular, auditabilidad, integración, extensibilidad o ALM;
- sponsor, owner operativo, administradores y data owners disponibles;
- valor y volumen del proceso suficientes para financiar implementación y continuidad operativa.

### Anti-ICP

- proceso simple que una solución más liviana puede resolver mejor;
- compra motivada sólo por marca, IA, cuadrantes o badges;
- ausencia de owner, adopción, gobierno de datos o presupuesto operativo;
- expectativa de que Agentforce corrija datos, permisos o procesos deficientes;
- búsqueda exclusiva de licencias mientras no exista autorización de reventa verificable;
- deadline incompatible con discovery, seguridad, integración, pruebas y estabilización.

### Operator & Buying Group Contract

| Rol | Job / criterio dominante | Evidencia que necesita |
| --- | --- | --- |
| Operator | ejecutar ventas, servicio, marketing, datos o administración sin trabajo paralelo innecesario | primer workflow útil, menos pasos manuales, errores recuperables y soporte claro |
| Operator-champion | demostrar que la solución mejora una operación real y puede adoptarse | uso, calidad, tiempo, backlog y decisiones visibles |
| Problem owner | resolver fragmentación, baja continuidad, datos débiles o capacidad insuficiente | baseline, arquitectura, roadmap y riesgo residual |
| Sponsor / director | conectar la inversión con una prioridad del negocio | outcomes, adopción, gobernanza y avance por olas |
| Economic buyer | justificar inversión total y continuidad | TCO por escenarios, alcance, supuestos, riesgos y economics |
| Governance owner | proteger datos, consentimiento, seguridad, arquitectura y compliance | controles, permisos, audit trail, rollback y evidencia |
| Procurement / Legal / IT | contratar y habilitar al proveedor con riesgo controlado | RACI, términos, privacidad, seguridad, SLA, salida y portabilidad |

El operator cambia según el carril: Sales Ops/RevOps para CRM comercial; Service Operations para atención;
Marketing Operations para Engagement o Next; Data/Architecture para identidad e integración; y un owner del
proceso para cada agente o automatización.

## Lifecycle comercial de la oferta

### 1. Diagnose & Architect

El cliente compra una decisión informada, no una recomendación predeterminada de Salesforce.

Ofertas estructuradas:

- **Salesforce Value & Architecture Diagnostic:** base instalada, procesos, datos, adopción, licencias observadas,
  riesgos y roadmap priorizado.
- **Sales & Service Operations Assessment:** pipeline, forecast, territories, casos, knowledge, routing, SLA y
  productividad.
- **MCE Architecture & Health Assessment:** tenancy, identidad, consentimiento, journeys, automatizaciones,
  deliverability, seguridad y operación.
- **Marketing Cloud Next Fit & Readiness Diagnostic:** outcome, Data 360, consentimiento, Flow, canales,
  Agentforce, entitlement y TCO condicionado.
- **Engagement + Next Coexistence Assessment:** inventario y decisión `retain | integrate | modernize | migrate |
  retire` por capability.
- **Data & Consent Foundation Diagnostic:** source of truth, identidad, preferencias, propósito, canal,
  jurisdicción y activación.
- **Agentforce Use Case & Readiness Diagnostic:** job, grounding, acciones, permisos, human review, evaluación,
  consumo y medición.

Outputs mínimos: current-state map, evidence ledger, fit verdict, arquitectura objetivo, riesgos, dependencias,
roadmap por olas, responsibilities y decisión `fit | fit condicionado | no fit`.

### 2. Implement & Integrate

El cliente compra una transición verificable desde el estado actual hacia una capacidad operativa acordada.

Familias componibles:

- **Sales Cloud Foundation & Optimization:** cuentas, contactos, leads, oportunidades, actividades, pipeline,
  forecast, territories, seguridad y adopción.
- **Agentforce Service Foundation & Optimization:** casos, consola, knowledge, routing, canales, SLA y service
  automation.
- **Salesforce Platform & Automation:** modelo, permisos, Flow, Apex/LWC cuando se justifique, eventos, APIs y ALM.
- **Integration & Migration Delivery:** sistema autoritativo, claves, deduplicación, carga por muestra, interfaces,
  reconciliación y rollback.
- **MCE Foundation:** Business Units, roles, dominios, identidad, consentimiento, templates, Connect/APIs, QA y
  go-live.
- **Marketing Cloud Connect Integration:** objetos, filtros, latencia, entry events, writeback, observabilidad y
  reconciliación.
- **Marketing Cloud Next Foundation:** Salesforce Platform, Data 360, consentimiento, CMS/contenido, Flow,
  canales y permisos.
- **Experience & Integration Enablement:** portales, experiencias conectadas e integraciones acotadas con owner
  especializado cuando corresponda.

Cada implementación identifica org/tenant, edición, región, ambientes, entitlement, source control, UAT,
aceptación, go-live, hypercare y ownership posterior. No activa una práctica completa de Commerce, MuleSoft,
Tableau, Slack o productos de industria; esas superficies se incorporan sólo con owner y scope específicos.

### 3. Activate & Adopt

El cliente compra el primer valor observable y la capacidad de sostenerlo, no sólo configuración desplegada.

Ofertas estructuradas:

- **Journey Activation Wave:** journey, audiencia, contenido, datos, testing, medición y handoff.
- **Deliverability Foundation:** autenticación, reputación, warming, hygiene, preferencias y monitoreo.
- **Agentforce Accelerator:** caso acotado GA con grounding, acciones, evaluación, human review, consumo y KPI.
- **Workflow Automation Wave:** automatizaciones priorizadas, fault paths, pruebas, versionado y desactivación.
- **Adoption & Enablement:** roles, playbooks, entrenamiento por workflow, office hours, medición de adopción y
  backlog.
- **Data Quality & Activation Wave:** claves, calidad, identidad, segmentos y activación para un caso concreto.

El primer valor debe nombrarse antes de implementar: por ejemplo, una oportunidad correctamente trazada, un caso
enrutado con SLA, un journey probado con audiencia autorizada o un agente que completa una acción acotada con
supervisión.

### 4. Operate & Evolve

El cliente compra continuidad operativa, control y evolución priorizada.

Ofertas recurrentes:

- **Managed Salesforce Operations:** intake, releases, soporte, automatizaciones, calidad de datos, permisos,
  observabilidad, incidentes, adopción y roadmap.
- **Managed Marketing Cloud Operations:** journeys/campaigns, imports, APIs, canales, deliverability, releases,
  consumo, optimización e incidentes dentro del RACI contratado.
- **Agentforce & Automation Assurance:** evaluaciones, permisos, fallos, consumo, human review y mejora controlada.
- **Data & Consent Assurance:** calidad, identity resolution, preferencias, suppression, activación y
  reconciliación.
- **Quarterly Architecture & Value Review:** arquitectura, adopción, deuda, licencias observadas, riesgos,
  prioridades y expansión.

Managed operations no autoriza por defecto a lanzar campañas, alterar consentimiento, borrar datos, ampliar
permisos ni ejecutar acciones productivas de alto impacto. Cada engagement define catálogo, ventanas, approvals,
SLA/SLO, RACI, change control y escalamiento.

## Carriles de solución

Las cuatro fases anteriores se componen según el problema. Los carriles no son nuevas business lines ni paquetes
de software.

| Carril | Outcome controlable | Superficies Salesforce posibles |
| --- | --- | --- |
| Revenue & Sales Operations | relación comercial trazable, pipeline operable y siguiente acción consistente | Agentforce Sales / Sales Cloud, Platform, Flow, Data 360, Agentforce |
| Customer Service Operations | atención con contexto, routing, knowledge, SLA y continuidad | Agentforce Service / Service Cloud, Experience Cloud, Platform, Agentforce |
| Marketing & Lifecycle Operations | audiencias, journeys y campañas gobernadas desde identidad y consentimiento | Marketing Cloud Engagement o Marketing Cloud Next según fit; coexistencia cuando corresponda |
| Data, Identity & Consent | datos utilizables y activables con ownership, propósito y controles explícitos | Data 360, Platform, MCE/Next y sistemas externos según arquitectura |
| Agentforce & Automation | tareas y decisiones acotadas automatizadas con permisos, evaluación y responsabilidad humana | Agentforce, Flow y producto Salesforce donde ocurre el workflow |
| Experience, Integration & Analytics | experiencias y sistemas conectados con señales recuperables y decisión informada | Experience Cloud, APIs; MuleSoft/Tableau/Commerce o industria sólo con owner especializado |

## Forma de engagement y delivery

| Fase | Engagement habitual | Delivery model | Modo operativo posible |
| --- | --- | --- | --- |
| Diagnose & Architect | Diagnostic | Advisory / structured service | `co-operated` |
| Implement & Integrate | Sprint u On-Demand | Implementation / Managed Squad | `efeonce-managed` o `co-operated` |
| Activate & Adopt | Sprint u On-Demand | Productized wave / enablement | `efeonce-managed`, `co-operated` o `client-operated` |
| Operate & Evolve | On-Going | Managed service / platform-enabled service | definido por lane y RACI |

Estas ofertas están estructuradas y avanzan hacia Product Services AI-native. No se declaran `productized` o
`commercially approved` hasta completar economics, repetibilidad, proof, capacidad, contratos y delivery gates.

## Arquitectura de ingresos y límites comerciales

Toda propuesta separa:

1. licencias y add-ons Salesforce contratados con Salesforce o reseller autorizado;
2. consumo variable de mensajes, contactos, canales, Data 360, IA u otros créditos;
3. diagnóstico, arquitectura, implementación, migración e integración Efeonce;
4. contenido, enablement y change management;
5. managed operations y soporte;
6. software o IP propia cuando exista un alcance contratado;
7. terceros, pass-through, viajes, impuestos y contingencias.

No existe precio canónico público en V1. La cotización depende de complejidad observable: clouds/productos,
orgs/tenants, Business Units, países, marcas, datos, integraciones, canales, journeys, volumen, riesgo, compliance,
operación, soporte y responsabilidades. Una tabla pública o precio “starting at” del provider no sustituye quote,
order form ni contrato vigente.

## Método de delivery

```text
qualify → discover → inventory → diagnose → design → propose → approve
→ configure/build → test/UAT → deploy → reconcile → enable → operate → evolve
```

Gates obligatorios:

- **Fit:** outcome, stack instalado, owner, adopción y alternativa definidos.
- **Evidence:** producto, edición, tenant/org, región, entitlement, consumo y fuentes con `as-of`.
- **Data & consent:** sistema de registro, identidad, propósito, canal, jurisdicción, retención y suppression.
- **Architecture:** permisos, integración, ALM, observabilidad, recuperación y ownership.
- **Activation:** población de prueba, approvals, reconciliación y rollback.
- **Adoption:** operator, playbook, enablement, uso y soporte.
- **Value:** baseline, métrica, período, owner y límites de atribución.

## Métricas

Las métricas se seleccionan por engagement y nunca se presentan sin fórmula, baseline, período, fuente y owner.

- **Delivery:** lead time, aceptación, defectos, rollback, reconciliación y estabilidad.
- **Adopción:** usuarios/workflows activos, completitud, uso correcto y time-to-first-value.
- **Operación:** backlog, SLA/SLO, incidentes, automatizaciones fallidas, data quality y releases.
- **Outcome:** continuidad de seguimiento, velocidad comercial, resolución, activación, deliverability o eficiencia
  del workflow, sólo cuando el alcance permite medirlo.
- **Economics:** inversión total, cost-to-serve, margen y consumo, gobernados por Finance.

Revenue, ROI, conversión, NRR o ahorro sólo entran como impacto cuando existe baseline, método y atribución
defendible; nunca como garantía de la práctica.

## IA y autoridad humana

La práctica es AI-native cuando agentes y automatización participan estructuralmente en discovery, inventory,
configuración asistida, QA, operación, observabilidad o workflows de cliente con límites explícitos. No significa
autonomía por defecto.

Para cada caso se declara:

- qué información puede leer;
- qué puede proponer;
- qué acción puede ejecutar;
- qué permiso y entitlement necesita;
- quién aprueba y responde;
- cómo se prueba, observa, limita y detiene;
- qué consumo y datos genera.

## Claims, marca y derechos

- Efeonce lidera la relación y la página; Salesforce se nombra como plataforma/producto con lenguaje referencial.
- No se publica “Salesforce Partner”, tier, badge, certificación, expertise, reseller ni co-selling sin readback
  primario vigente y evidencia aplicable al claim exacto.
- La aceptación histórica de Efeonce como `Provisional Consulting Partner` no prueba el estado actual.
- Consulting Partner no implica Cloud Reseller.
- Logos, badges, personajes, imágenes, screenshots y demás assets Salesforce sólo se usan dentro de la
  autorización y las brand guidelines vigentes; una referencia estética no autoriza copiar personajes o diseños.
- Los casos de clientes exigen autorización, alcance comprobado y evidencia del resultado antes de publicarse.

## Expansion paths

```text
Diagnostic
  → implementation foundation
  → first-value activation
  → adoption and assurance
  → managed operations
  → adjacent workflow, team, country, brand or cloud
```

La expansión se habilita por señales observables: backlog priorizado, adopción, riesgo reducido, nueva unidad,
journey, canal, integración, caso de datos o agentic workflow con owner. No se recomienda una cloud adicional para
cumplir una cuota o completar el diagrama.

## Stop conditions

- No hay owner, capacidad de adopción o acceso a evidencia suficiente.
- Identidad, consentimiento, seguridad o entitlement hacen inviable el caso.
- La alternativa actual resuelve mejor el problema y con menor TCO/riesgo.
- El deadline obliga a omitir controles esenciales.
- El caso depende de una función beta, pilot, preview o roadmap no contractual.
- No existe autorización para el claim, badge, reventa, referencia o activo visual requerido.
- Los economics, capacidad o soporte no sostienen el delivery comprometido.

## Estado de madurez y siguiente gate

**Verdict V1:** `approved_for_validation`.

Antes de pasar a `commercially_approved`, la práctica debe demostrar:

1. scope y entregables repetibles por oferta prioritaria;
2. operator y buying group validados en discovery reales;
3. orgs/tenants de prueba, personas y credenciales verificadas para cada rol comprometido;
4. método de delivery, QA, seguridad, datos, consentimiento y rollback probado;
5. loaded cost, margen, FX, soporte, working capital y pricing architecture aprobados;
6. al menos un forward-test o caso representativo con evidencia y permiso de referencia;
7. estado contractual de partnership/licensing/reventa leído desde fuente primaria;
8. approvals de Revenue Operations & CRM, Marketing Operations, Finance y Legal/Privacy.

## Canon relacionado

- [`Salesforce Practice — catálogo de servicios`](README.md)
- [`Salesforce Product & Offering Map V1`](SALESFORCE_PRODUCT_AND_OFFERING_MAP_V1.md)
- [`Efeonce Product Service Operating Model V1`](../../business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
- [`Efeonce Partnership Registry V1`](../../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md)
- [`Efeonce 2028 — Productized AI-Native Services`](../../strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md)
