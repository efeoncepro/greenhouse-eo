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
| Product Service              | ¿Qué resultado/capacidad compra el cliente?                                     | Versionado por oferta y madurez                         |
| Commercial Engagement        | ¿Qué compromiso contractual está activo, con qué términos, período y economics? | Se contrata, activa, opera, renueva, convierte o cierra |
| Project / Campaign           | ¿Qué iniciativa organiza la ejecución para ese cliente?                         | Se planifica, ejecuta, entrega y cierra                 |
| Task / Subtask               | ¿Qué trabajo ejecutable debe realizarse?                                        | Estado operativo dentro de un Project de Notion         |
| Deliverable / Asset          | ¿Qué resultado producido se revisa, acepta, entrega o reutiliza?                | Conserva lineage, rights, evidencia y estado            |

## Separación que no se debe romper

1. **Organization no es Engagement.** Una organización no cambia de identidad ni se vuelve temporal porque compre
   un proyecto acotado.
2. **Engagement no es Project.** El engagement gobierna contrato, alcance comercial, capacidad, términos,
   facturación, accountability y cierre de la obligación. El proyecto/campaña organiza delivery.
3. **Project no es Product Service.** Una campaña, implementación o iniciativa puede ejecutar uno o más componentes
   de una oferta, pero no crea automáticamente una oferta nueva.
4. **Project no es Task.** El proyecto es un contenedor plano de iniciativa/outcome; la jerarquía ejecutable vive en
   Tasks/Subtasks de Notion.
5. **Engagement form no es delivery model ni operating mode.** On-Going/On-Demand describe la duración y forma del
   compromiso; Managed Squad, Staff Augmentation, Implementation o Advisory describe delivery; `efeonce-managed`,
   `co-operated` y `client-operated` asigna autoridad operativa.

## Cardinalidad y composición

- Una Organization puede tener cero, uno o muchos Engagements a lo largo del tiempo, incluso simultáneos.
- Un Engagement puede contener uno o muchos Projects/Campaigns.
- Un Project/Campaign pertenece a una Organization y debe declarar un Engagement primario cuando ejecuta trabajo
  contratado.
- Un Project contiene Tasks/Subtasks en Notion; la jerarquía no se representa creando subproyectos.
- Un Engagement puede componer varios Product Services o delivery lanes si el SOW, RACI, economics y ownership los
  mantienen explícitos.
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

## Contrato mínimo del Engagement

Todo engagement debe declarar, proporcionalmente:

- Organization/Space y contraparte contractual;
- Product Service(s), outcome controlable y alternativa desplazada;
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
→ Specify Product Service and outcome
→ Validate scope, capacity and economics
→ Quote / Contract
→ Provision Engagement, access and team
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

## Decisiones abiertas para la siguiente iteración

1. ¿Qué dos o tres familias de engagements On-Demand reales se usarán como cohortes de diseño?
2. ¿Qué casos requieren varios Product Services o lanes bajo un mismo SOW?
3. ¿Cuál es la unidad contractual y económica correcta en Greenhouse: root service existente o Engagement aggregate?
4. ¿Qué relación y property de Notion representa el Engagement sin duplicar Finance/Commercial?
5. ¿Qué capacidad se reserva como buffer y qué fuentes flexibles pueden confirmarse antes de vender?
6. ¿Qué acceso conserva el cliente después del cierre y durante cuánto tiempo?
7. ¿Qué eventos convierten, repiten, expanden o cierran un engagement sin inventar continuidad?

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
