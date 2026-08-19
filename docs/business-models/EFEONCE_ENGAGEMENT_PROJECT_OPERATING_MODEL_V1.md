# Efeonce Engagement–Project Operating Model V1

## Estado

- **Status:** Proposed — working contract para iteración
- **Date:** 2026-08-19
- **Owner:** Efeonce Strategy + Commercial + Operations + Product + Finance
- **Scope:** engagements client-facing On-Going y On-Demand, proyectos/campañas, equipos, Notion y Greenhouse
- **Runtime impact:** ninguno; este documento no cambia schema, catálogo, pricing, acceso ni automatizaciones

## Propósito

Permitir que Efeonce opere tanto relaciones recurrentes como trabajos de inicio y término definidos sin confundir
el compromiso comercial con los proyectos o campañas que organizan su ejecución.

El modelo conserva el motor On-Going que sostiene la operación y agrega una forma gobernada de atender engagements
On-Demand, incluidos trabajos grandes y multi-fase. No convierte cada proyecto en una oferta nueva, no crea una
organización temporal y no obliga a que un engagement acotado termine en retainer para ser económicamente válido.

## Decisión de trabajo

La ontología transversal es:

```text
Organization / client
└── durable Space / account relationship
    ├── Commercial Engagement
    │   ├── contracted offer / service / capability composition
    │   ├── Project or Campaign
    │   │   └── Notion Tasks / Subtasks
    │   └── Project or Campaign
    │       └── Notion Tasks / Subtasks
    └── accumulated memory, evidence, assets and relationship history
```

Cada objeto responde una pregunta distinta:

| Objeto                       | Pregunta                                                                        | Lifecycle                                               |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Organization                 | ¿Con qué entidad existe una relación?                                           | Durable; precede y sobrevive a contratos concretos      |
| Space / account relationship | ¿Dónde viven tenancy, acceso, memoria y Account 360?                            | Durable, con estados de relación y acceso gobernados    |
| Capability                   | ¿Qué sabe hacer Efeonce?                                                        | Durable; puede habilitar muchas ofertas                 |
| Offer / Service              | ¿Qué compra concretamente el cliente?                                           | Versionado por catálogo, alcance y madurez              |
| Product Service              | ¿La oferta ya cumple el contrato de productización gobernada?                   | Clasificación condicional; no aplica a toda venta       |
| Commercial Engagement        | ¿Qué compromiso contractual está activo, con qué términos, período y economics? | Se contrata, activa, opera, renueva, convierte o cierra |
| Project / Campaign           | ¿Qué iniciativa organiza la ejecución para ese cliente?                         | Se planifica, ejecuta, entrega y cierra                 |
| Task / Subtask               | ¿Qué trabajo ejecutable debe realizarse?                                        | Estado operativo dentro de un Project de Notion         |
| Deliverable / Asset          | ¿Qué resultado producido se revisa, acepta, entrega o reutiliza?                | Conserva lineage, rights, evidencia y estado            |

## Separación que no se debe romper

1. **Organization no es Engagement.** Una organización no cambia de identidad ni se vuelve temporal porque compre
   un proyecto acotado.
2. **Engagement no es Project.** El engagement gobierna contrato, alcance comercial, capacidad, términos,
   facturación, accountability y cierre de la obligación. El proyecto/campaña organiza delivery.
3. **Offer no es necesariamente Product Service.** Efeonce puede vender servicios bespoke o estructurados,
   implementación, advisory, capacidad, paquetes de producción, rights/pass-through o composiciones. `Product
Service` se usa sólo cuando la oferta cumple sus gates.
4. **Project no es Offer.** Una campaña, implementación o iniciativa organiza la ejecución de una oferta, pero no
   crea automáticamente una oferta nueva.
5. **Deliverable no es Offer.** Un brandbook, plan de medios, video o reporte puede ser el resultado vendido o una
   parte del scope; el artefacto no demuestra que exista un Product Service.
6. **Project no es Task.** El proyecto es un contenedor plano de iniciativa/outcome; la jerarquía ejecutable vive en
   Tasks/Subtasks de Notion.
7. **Engagement form no es delivery model ni operating mode.** On-Going/On-Demand describe la duración y forma del
   compromiso; Managed Squad, Staff Augmentation, Implementation o Advisory describe delivery; `efeonce-managed`,
   `co-operated` y `client-operated` asigna autoridad operativa.

## Cardinalidad y composición

- Una Organization puede tener cero, uno o muchos Engagements a lo largo del tiempo, incluso simultáneos.
- Un Engagement puede contener uno o muchos Projects/Campaigns.
- Un Project/Campaign pertenece a una Organization y debe declarar un Engagement primario cuando ejecuta trabajo
  contratado.
- Un Project contiene Tasks/Subtasks en Notion; la jerarquía no se representa creando subproyectos.
- Un Engagement puede componer una o varias ofertas, servicios, capabilities, Product Services —cuando existan— o
  delivery lanes si el SOW, RACI, economics y ownership los mantienen explícitos.
- Un Engagement On-Going genera múltiples Projects/Campaigns durante su vigencia.
- Un Engagement On-Demand puede contener un solo Project o varios Projects coordinados por fases/capabilities.
- Si una iniciativa consume más de un engagement, no se deja una relación many-to-many ambigua: se divide el
  proyecto o se registra una asignación económica y de accountability explícita mediante un contrato posterior.

## Las dos formas principales de engagement

### On-Going

Compromiso recurrente que compra capacidad, operación o lanes gobernados con cadencia, límites, SLA/expectativas y
mecanismo de renovación.

```text
Organization: SKY
└── Engagement: Operación creativa 2026 · On-Going
    ├── Campaign: Verano
    ├── Campaign: Cyber
    ├── Campaign: Aniversario
    └── Project: Always-on marzo
```

### On-Demand

Compromiso acotado con outcome, alcance, inicio, término, fases, capacidad, aceptación, economics y salida definidos.
Puede ser grande, multi-capability o multi-fase; `On-Demand` no significa pequeño ni improvisado.

```text
Organization: Client X
└── Engagement: Lanzamiento de producto 2026 · On-Demand
    ├── Project: Estrategia de lanzamiento
    ├── Campaign: Producción de campaña
    └── Project: Implementación y medición
```

Diagnostic, Sprint, Sample Sprint y Pilot pueden ser entradas o variantes acotadas, pero no deben volver a mezclar
validación comercial, forma temporal, delivery model y pricing en un solo enum.

## Qué se vende y cuándo es Product Service

`Product Service` es una clasificación gobernada y una dirección de madurez, no el nombre genérico de todo lo que
Efeonce factura. Primero se identifica qué compra el cliente; después se declara su nivel de productización.

| Capa               | Ejemplo                                                   | No implica por sí sola                |
| ------------------ | --------------------------------------------------------- | ------------------------------------- |
| Capability         | branding, producción audiovisual, planificación de medios | oferta, precio o contrato             |
| Offer / Service    | desarrollo de sistema de marca, producción de campaña     | Product Service aprobado              |
| Engagement         | SOW acotado para ejecutar la oferta en una Organization   | Project único ni recurrencia          |
| Project / Campaign | rediseño de identidad, campaña de lanzamiento             | contrato o pricing                    |
| Deliverable        | brandbook, plan de medios, video master                   | oferta ni Product Service             |
| Asset              | logo, pieza, archivo editable, pauta                      | outcome comercial completo            |
| Product Service    | oferta repetible que pasó sus gates                       | SaaS, self-service ni autonomía total |

Ejemplos de clasificación honesta:

- una **campaña audiovisual** puede ser un servicio bespoke o estructurado operado mediante uno o varios Projects;
  sólo es Product Service si existe una oferta repetible con outcome, método, límites, quality gates, economics y
  ownership gobernados;
- un **plan de medios** puede ser un Deliverable dentro de Distribution Strategy, un engagement Advisory acotado o
  una fase de una operación mayor;
- un **brandbook** es un Deliverable/Asset del trabajo de marca; venderlo no convierte automáticamente el artefacto
  en Product Service.

La escala de madurez se registra por separado:

```text
bespoke → structured → productized → platform-enabled → AI-native → compounding
```

La dirección corporativa 2028 orienta la evolución del portfolio. No autoriza a describir como Product Service una
oferta que hoy no cumple el contrato ni sus gates.

## Contrato mínimo del Engagement

Todo engagement debe declarar, proporcionalmente:

- Organization/Space y contraparte contractual;
- oferta, servicio, capability o composición contratada, con outcome controlable y alternativa desplazada;
- Product Service y nivel de productización sólo cuando esa clasificación esté gobernada; en otro caso, registrar
  honestamente `bespoke | structured | productized | platform-enabled | ...`;
- forma `On-Going | On-Demand` y fechas/lifecycle;
- scope, exclusiones, fases, criterios de aceptación y change path;
- delivery model, operating mode y RACI por lane;
- accountable owner de Efeonce y acceptance owner del cliente;
- equipo/capacidad comprometida, fechas y restricciones;
- arquitectura de ingresos, billing, reconocimiento, costos, margen y working capital;
- dependencias, riesgos, rights, datos, IP, privacidad y offboarding;
- Projects/Campaigns que materializan la ejecución;
- evidencia, outcome de cierre y siguiente decisión: terminar, repetir, ampliar, convertir o renovar.

Un Engagement On-Demand debe ser defendible por sí mismo. Su economía no puede depender de una conversión futura a
On-Going que todavía no existe.

## Activación desde la venta hacia Delivery

El cierre comercial, el onboarding de la Organization y el inicio del primer Project pueden ocurrir cerca, pero no
son el mismo evento. El flujo objetivo es:

```text
Closed-won
→ commercial evidence ready
→ Engagement Activation Brief proposed
→ Delivery accepts scope and capacity
→ Finance confirms billing readiness
→ Operations provisions the delta
→ Kickoff readiness gate
→ Projects/Campaigns and Tasks begin execution
```

### Ficha de Activación del Engagement

La primitive de handoff es la **Ficha de Activación del Engagement**. `Orden de Trabajo` puede ser un alias visible
si Commercial/Legal confirma que no se confunde con una orden de compra, contrato o documento tributario.

La ficha no reemplaza quote, SOW, contrato u orden de compra. Los referencia y congela el snapshot ejecutable que
Delivery acepta:

- Organization/Space y contraparte;
- oferta, servicio, capability o composición contratada;
- Product Service sólo cuando aplique, más nivel real de productización;
- forma On-Going/On-Demand, outcome, scope, exclusiones y change path;
- fechas, fases, hitos y criterios de aceptación;
- presupuesto, quote/SOW/PO, billing y condiciones que Finance debe verificar;
- equipo, capacidad, accountable owner y acceptance owner del cliente;
- Projects/Campaigns que deben crearse o vincularse;
- SharePoint, Notion, Teams/Slack, permisos y otros recursos que deben provisionarse;
- dependencias, riesgos, rights, datos, IP, privacidad y condiciones de cierre.

Commercial propone; Delivery acepta o rechaza con causa explícita; Finance valida readiness de cobro; Operations
activa. `Closed-won` por sí solo no autoriza a empezar trabajo si el scope o la capacidad no son ejecutables.

### Provisioning: crear sólo la diferencia

Para una **Organization nueva**, se crea una sola vez la capa durable: Space/Account 360, SharePoint, teamspace de
Notion, wiki, canal general, usuarios y permisos base. Después se activa el Engagement y sus Projects/Campaigns.

Para una **Organization existente**, no se recrea la casa. Se añade el Engagement, equipo/capacidad temporal,
Projects/Campaigns, carpetas, permisos o canales específicos que el nuevo scope realmente requiera.

```text
durable Organization workspace
└── incremental Engagement activation
    ├── team/capacity
    ├── Projects/Campaigns
    ├── scoped access/resources
    └── kickoff and billing readiness
```

No todo engagement necesita un nuevo teamspace, SharePoint o chat. La decisión depende de volumen, confidencialidad,
complejidad y colaboración, no de que sea On-Demand.

### Kickoff y planificación proporcional

El kickoff ocurre después de confirmar scope, owners, capacidad, accesos mínimos, proyectos, dependencias,
aprobaciones y primera decisión/entrega. Puede afinar la planificación; no debe redescubrir lo vendido.

| Complejidad | Artefactos mínimos                                                                     |
| ----------- | -------------------------------------------------------------------------------------- |
| Ligera      | Ficha, un Project/Campaign, responsables, tareas e hitos                               |
| Estándar    | Ficha, varios Projects/fases, plan de capacidad, timeline, dependencias y aprobaciones |
| Compleja    | Ficha, lanes/capabilities, Gantt/ruta crítica, RAID, steering y gates de aceptación    |

La Gantt es una vista opcional de planificación. Se usa cuando dependencias, fases o ruta crítica la justifican; no
es la fuente de verdad ni un requisito universal. Debe derivarse de los mismos Projects/Tasks, no mantener un
calendario paralelo que envejece por separado.

## Equipos y capacidad

La relación de una persona con la Organization, el Engagement y el Project son alcances diferentes:

| Alcance            | Significado                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| Organization-level | continuidad relacional o responsabilidad transversal sobre la cuenta         |
| Engagement-level   | capacidad, accountability, fechas y economics comprometidos por contrato/SOW |
| Project-level      | responsabilidad operativa sobre una iniciativa, campaña, fase o entregable   |

Una asignación Organization-level no autoriza a imputar todo el trabajo de la persona a todos los engagements del
cliente. Una asignación Engagement-level debe poder terminar sin borrar la relación histórica con la Organization.

La capacidad vendible debe distinguir:

```text
total capacity
− committed On-Going capacity
− contracted/scheduled On-Demand capacity
− operational and risk buffer
= genuinely sellable capacity
```

Pipeline ponderado, contratación flexible o capacidad partner pueden informar planificación, pero no se presentan
como capacidad confirmada antes de su gate.

## Contrato para Notion

Notion conserva la semántica vigente de work management:

- `Project` es una iniciativa/outcome plana y contenedora de Tasks;
- `Campaign` es un tipo de Project o una especialización operativa equivalente, no un engagement comercial;
- `Task` y `Subtask` son la misma entidad con relación autorreferencial;
- cada Project pertenece al `space_id`/Organization correcto;
- todo Project contratado debe poder resolver su Engagement primario;
- el Project contiene ejecución, hitos, decisiones y evidencia; no se convierte en contrato o pricing record;
- no se crea un teamspace por proyecto como regla general: el Space durable conserva memoria y el registry resuelve
  Projects/Tasks por Organization;
- al cerrar un engagement, Projects y Tasks quedan como historial/evidencia según policy; no se pierde memoria para
  simular offboarding.

La relación mínima objetivo es:

```text
Notion Project
├── Organization / space_id
├── primary Engagement
├── project type: campaign | implementation | diagnostic | production | ...
└── Tasks / Subtasks
```

La implementación física de esa relación, sus property IDs, sync y ownership requiere diseño técnico separado.

## Greenhouse: base existente y brecha conceptual

El contrato verificado en el repositorio ya ofrece piezas reutilizables:

- `greenhouse_core.services` funciona como primitiva de engagement;
- `engagement_phases`, `engagement_progress_snapshots`, `engagement_outcomes`, approvals y lineage modelan lifecycle;
- `client_team_assignments.service_id` permite una asignación acotada a un servicio/engagement;
- `services.notion_project_id` vincula una instancia de servicio con un Project de Notion;
- Organization Workspace y Client Portal ya componen relación, vistas y entitlements sin convertir la Organization
  en un contrato.

La brecha vigente es que `services.engagement_kind` separa `regular` de `pilot | trial | poc | discovery`, pero no
separa un engagement comercial regular On-Going de uno regular On-Demand. En el catálogo, el mapping documentado
también traduce `on_going` y `on_demand` a `retainer`, por lo que duración, pricing y validación todavía se colapsan.

Este documento no decide todavía si:

1. una row raíz de `services` seguirá siendo el aggregate de Engagement y sus hijos los lanes; o
2. un Engagement compuesto necesita un aggregate explícito por encima de varias instancias de Service.

La decisión debe contrastarse con engagements reales multi-capability, quote/SOW, Finance, HubSpot, teams, Notion y
Client Portal antes de materializar schema.

## Lifecycle objetivo

```text
Qualify
→ Classify contracted offer/service/capability and productization level
→ Specify outcome
→ Validate scope, capacity and economics
→ Quote / Contract
→ Accept Engagement Activation Brief
→ Provision the Organization or Engagement delta, access and team
→ Create/link Projects and Campaigns
→ Deliver by phases
→ Accept outcomes and reconcile economics
→ Renew / Expand / Repeat / Convert / Exit
```

Al cerrar un Engagement:

- terminan o se reubican asignaciones temporales;
- se revocan permisos de ejecución que ya no corresponden;
- se cierran fases, outcome, acceptance y economics;
- Projects/Campaigns conservan historial y evidence;
- la Organization y Account 360 permanecen;
- el acceso histórico del cliente se conserva, limita o revoca según contrato y policy explícita;
- la siguiente oportunidad se registra sin fingir una renovación.

## Métricas mínimas por forma

### Compartidas

- time-to-first-value;
- scope/acceptance health;
- delivery quality, rework y OTD;
- cost-to-serve y contribution margin;
- client effort y decision latency;
- evidence/closure completeness;
- repetición, expansión, renovación o salida.

### On-Demand

- sold-versus-delivered capacity variance;
- time-to-staff y time-to-kickoff;
- change-order rate;
- milestone acceptance;
- cash schedule, DSO y working capital;
- margen standalone;
- siguiente engagement dentro de una ventana declarada, sin contarlo como supuesto de la venta inicial.

### On-Going

- committed capacity utilization;
- SLA/cadence health;
- GRR, NRR, renewal y expansion separados;
- evolución de memoria, autonomía y capacidad del cliente;
- margen por lane/cuenta sin ocultar trabajo On-Demand absorbido.

## Invariantes para futuras propuestas

1. No usar `project`, `campaign`, `engagement`, `service` y `contract` como sinónimos.
2. No modelar On-Demand como “retainer corto” por conveniencia del sistema.
3. No esconder un proyecto fuera de scope dentro de capacidad On-Going sin change order o decisión comercial.
4. No crear una Organization, Space o teamspace nuevo por cada proyecto.
5. No hacer que cerrar un proyecto borre memoria, activos, evidencia o relación de cuenta.
6. No inferir pricing, acceso, RACI o accountability desde el tipo de Project.
7. No asumir que On-Demand es pequeño ni que On-Going es más estratégico por definición.
8. No afirmar que esta ontología está implementada hasta verificar schema, syncs, UI, permisos y runtime.
9. No llamar Product Service a toda oferta, proyecto o entregable; primero declarar la categoría y madurez real.
10. No convertir la Ficha de Activación en otro contrato, ni usar `Closed-won` como autorización automática de
    delivery.
11. No exigir Gantt cuando hitos y tareas resuelven la planificación; tampoco omitirla cuando la ruta crítica es
    material.

## Decisiones abiertas para la siguiente iteración

1. ¿Qué dos o tres familias de engagements On-Demand reales se usarán como cohortes de diseño?
2. ¿Qué casos requieren varias ofertas, capabilities, Product Services o lanes bajo un mismo SOW?
3. ¿Cuál es la unidad contractual y económica correcta en Greenhouse: root service existente o Engagement aggregate?
4. ¿Qué relación y property de Notion representa el Engagement sin duplicar Finance/Commercial?
5. ¿Qué capacidad se reserva como buffer y qué fuentes flexibles pueden confirmarse antes de vender?
6. ¿Qué acceso conserva el cliente después del cierre y durante cuánto tiempo?
7. ¿Qué eventos convierten, repiten, expanden o cierran un engagement sin inventar continuidad?
8. ¿`Ficha de Activación del Engagement` u `Orden de Trabajo` será el nombre operativo y client-facing?
9. ¿Qué acceptance matrix permite a Delivery/Finance/Operations activar sin crear un comité innecesario?

## Gate de materialización

Cualquier cambio a schema, source of truth, HubSpot sync, pricing catalog, Finance, access, Client Portal, Notion
registry/writeback o team assignments requiere una task formal y el ADR aplicable. Hasta entonces, este documento
gobierna vocabulario y diseño de negocio, no comportamiento runtime.

## Canon relacionado

- [`Efeonce Product Service Operating Model V1`](EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
- [`Efeonce Business Model Architecture V1`](EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md)
- [`Business Models README`](README.md)
- [`Greenhouse work management with Notion`](../../.codex/skills/notion-platform/use-cases-greenhouse/work-management.md)
- [`Organization Workspace projection`](../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md)
- [`Client Portal Domain V1`](../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md)
- [`EPIC-014 — Sample Sprints Engagement Platform`](../epics/to-do/EPIC-014-sample-sprints-engagement-platform.md)
