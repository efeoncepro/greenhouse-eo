# RESEARCH-002 - Staff Augmentation Enterprise Module

## Status

- Lifecycle: `Research Brief`
- State: `Active`
- Domain: `agency` + `hris` + `finance`
- Owner: `Greenhouse product / operations`

## Summary

Definir el blueprint funcional del futuro módulo enterprise de `Staff Augmentation` como complemento de HRIS. El módulo no reemplaza `People`, `Organizations`, `Finance`, `Payroll` ni `Cost Intelligence`; los orquesta alrededor del objeto central `placement`, que representa la relación comercial-operativa entre una persona y un cliente bajo modalidad Staff Aug.

Este brief parte del baseline ya implementado:
- `TASK-019` cerró el runtime moderno del módulo
- `TASK-169` cerró el bridge mínimo `People -> assignment -> placement`
- `TASK-038` y `TASK-041` quedaron absorbidas como referencia histórica

## Why This Brief Exists

El baseline actual es correcto, pero todavía no equivale a un módulo enterprise completo para una agencia como Efeonce.

Hoy ya existe:
- `Person`
- `Organization`
- `Assignment`
- `Placement`
- lectura de `Finance`, `Payroll`, `Providers`, `Tooling`

Pero todavía falta definir con claridad:
- el ciclo de vida enterprise del placement
- la separación entre HR lifecycle y commercial lifecycle
- las vistas del módulo
- los desks operativos y de riesgo
- las sinergias cross-module esperadas
- los eventos y métricas institucionales del dominio

## Product Thesis

`Staff Augmentation` debe entenderse como un módulo complementario al HRIS:

- `HRIS` gobierna la vida de la persona dentro de Efeonce
- `Staff Augmentation` gobierna la vida comercial, operativa y contractual del servicio vendido al cliente

En una frase:

> HR gestiona a la persona; Staff Aug gestiona la colocación de esa persona en un cliente bajo condiciones de servicio, costo, riesgo y margen.

## Core Design Principles

1. `Placement` no reemplaza a `Person`.
2. `Placement` no reemplaza a `Assignment`.
3. `Membership` no es identidad comercial; solo da contexto organizacional.
4. `Assignment` sigue siendo el pivote operativo.
5. `Placement` es el pivote comercial-operativo del módulo.
6. `HR`, `Payroll`, `Finance`, `Costs`, `Providers` y `Tooling` siguen siendo dominios dueños de su verdad; Staff Aug consume y orquesta.
7. No duplicar lógica financiera ni de nómina dentro del módulo.

## Enterprise Object Model

### Canonical objects involved

- `Person`
  - identidad, skills, seniority, disponibilidad, historial, elegibilidad
- `Organization`
  - cliente/empresa, stakeholders, contexto contractual, riesgo, health
- `Space`
  - contexto operativo donde vive la relación con el cliente
- `Assignment`
  - dedicación operativa real de una persona a un cliente
- `Placement`
  - relación comercial-operativa Staff Aug
- `Provider`
  - EOR, staffing partner o contratación directa
- `Payroll cost`
  - costo base y vigencia de compensación
- `Cost attribution`
  - costo cargado, directos, tooling, overhead

### Structural decision: Space as parent context, Placement as child object

La investigación del codebase confirma que `Space` ya funciona como objeto real y no como un campo decorativo:

- existe identidad canónica en `greenhouse_core.spaces`
- existe `Space 360`
- múltiples consumers de Agency, Services, Cost Intelligence y Notion ya resuelven contra `space_id`

Por eso, para la iteración enterprise del módulo, la decisión recomendada es:

- `Space` actúa como objeto padre de contexto operativo-comercial
- `Placement` actúa como child object del `Space` dentro del dominio `Staff Augmentation`
- `Assignment` sigue siendo el pivote operativo de creación

En fórmula simple:

`Person -> Assignment -> Placement`, y ese `Placement` vive dentro del contexto de un `Space`

Esto evita tres errores comunes:

1. modelar el placement como simple atributo del `Space`
2. modelar el placement como identidad paralela desconectada del `Space`
3. modelar la membership como si fuera el contenedor principal del placement

### Why not as a Space attribute

`Placement` no debería ser un atributo embebido del `Space` porque tiene vida propia:

- lifecycle
- owner comercial y operativo
- onboarding
- provider relationship
- margin
- risk
- events
- historical trail

Eso lo convierte en entidad transaccional propia, no en propiedad estática del `Space`.

### Why still created from Assignment

Aunque conceptualmente el placement viva “dentro” del `Space`, su creación debe seguir anclada al `Assignment`, porque:

- el assignment une persona + cliente + dedicación operativa
- el assignment ya es el pivote runtime actual
- ese modelo evita duplicar staffing runtime
- permite que `Space` siga siendo contenedor y lens, no fábrica de identidades

### Recommended relationship model

- `Space`
  - objeto padre de contexto
  - puede tener muchos placements
- `Placement`
  - child object de `Space`
  - referencia a `assignmentId`, `spaceId`, `organizationId`, `clientId`, `memberId`
- `Assignment`
  - pivote operativo desde el cual nace o se activa el placement

### Implication for future UI

Si seguimos esta decisión, el módulo enterprise debería permitir navegar así:

- desde `Space 360` ver placements hijos del espacio
- desde `Person 360` ver placements donde la persona participa
- desde `Placement 360` ver su `Space`, `Organization` y `Assignment` base

Esto ayuda a que el módulo se vea como parte del grafo Greenhouse y no como un silo más.

### Placement as enterprise object

El `placement` debería contener cinco capas:

1. Identidad
- `placementId`
- `memberId`
- `assignmentId`
- `organizationId`
- `spaceId`
- `clientId`
- `businessUnit`

2. Contrato y relationship model
- `relationshipType`
  - direct
  - EOR
  - staffing_partner
- `providerId`
- `contract start/end`
- `renewal window`
- `notice period`

3. Economía
- `billingRate`
- `costRate`
- `currency`
- `marginExpected`
- `marginActual`
- `toolingCost`
- `directExpense`
- `loadedCost`

4. Operación
- `status`
- `lifecycleStage`
- `client manager`
- `communication channel`
- `tooling stack`
- `onboarding checklist`
- `health`
- `risk`

5. Talento y cobertura
- `requiredSkills`
- `matchedSkills`
- `seniority sold`
- `seniority actual`
- `backup coverage`
- `replacement candidates`

## Lifecycle

El lifecycle enterprise propuesto es:

1. `Eligible`
- la persona es viable para Staff Aug

2. `Scoped`
- ya existe intención comercial y match preliminar

3. `Assigned`
- existe assignment operativo con cliente/space

4. `Placement Pipeline`
- se negocian condiciones comerciales y contractuales

5. `Onboarding`
- se prepara la puesta en marcha con cliente

6. `Active`
- el placement está entregando servicio real

7. `At Risk`
- hay riesgo de margen, performance, compliance o continuidad

8. `Renewal`
- se acerca vencimiento o expansión del servicio

9. `Ended`
- cierre del placement

10. `Archived / Historical`
- historial para analytics, staffing intelligence y aprendizaje comercial

### Recommended state model

Para la futura task enterprise conviene separar dos capas de estado:

1. `commercialStatus`
- dónde va el placement en el ciclo de negocio

2. `operationalStage`
- qué tan listo está para operar o seguir operando

Esto evita usar un solo campo para mezclar negociación, delivery, riesgo y cierre.

### Proposed commercial status

- `scoped`
  - existe intención comercial y encuadre preliminar
- `pipeline`
  - el placement está siendo armado o negociado
- `onboarding`
  - ya fue aprobado y se está preparando para entrar en servicio
- `active`
  - está entregando servicio real
- `renewal_pending`
  - requiere decisión comercial de continuidad/expansión
- `renewed`
  - fue renovado o extendido
- `ended`
  - terminó el servicio
- `archived`
  - quedó solo para historial y analytics

### Proposed operational stage

- `draft`
  - todavía faltan definiciones base
- `contracting`
  - contrato, rate card o provider relationship en proceso
- `client_setup`
  - accesos, stack, canales y onboarding con cliente en preparación
- `live`
  - operativo y entregando
- `at_risk`
  - riesgo operativo, financiero, de cobertura o compliance
- `transition`
  - reemplazo, handover o salida en curso
- `closed`
  - ya no opera

### Recommended transition logic

#### 1. `scoped -> pipeline`

Se permite cuando:
- existe una necesidad concreta del cliente
- hay persona candidata o pool preseleccionado
- hay encuadre inicial de BU y ownership

Owner principal:
- Comercial / Staffing

#### 2. `pipeline -> onboarding`

Se permite cuando:
- existe `assignment` real
- existe candidate/person definida
- se definieron condiciones comerciales mínimas
- provider relationship y costo base están resueltos o aceptados

Owner principal:
- Comercial + Operaciones

#### 3. `onboarding -> active`

Se permite cuando:
- onboarding interno y de cliente están en estado suficiente
- accesos y tooling críticos están listos
- reporting line y canales están definidos
- no hay bloqueos de compliance severos

Owner principal:
- Operaciones / Delivery

#### 4. `active -> renewal_pending`

Se activa cuando:
- entra a ventana de renovación
- requiere renegociación
- cambia scope, rate o provider

Owner principal:
- Comercial

#### 5. `active -> at_risk`

No necesariamente cambia el `commercialStatus`; puede cambiar solo el `operationalStage`.

Triggers típicos:
- margen erosionado
- cambio de costo payroll relevante
- performance baja
- riesgo de continuidad
- falta de backup
- problemas de provider/compliance

Owner principal:
- Operaciones + Finance + HR según causa

#### 6. `renewal_pending -> renewed`

Se permite cuando:
- ya existe acuerdo de continuidad o expansión
- fechas, rates y condiciones quedan actualizadas

Owner principal:
- Comercial

#### 7. `active|renewal_pending|renewed -> ended`

Se permite cuando:
- el servicio terminó
- hubo offboarding con cliente
- ya se cerró continuidad o salida

Owner principal:
- Operaciones + Comercial

#### 8. `ended -> archived`

Se permite cuando:
- el placement ya no tiene actividad operativa pendiente
- ya quedó materializado para historia, analytics y reporting

Owner principal:
- Sistema / Operaciones

### Risk is not just a terminal state

En el diseño enterprise recomendado, `risk` no debería ser únicamente un estado binario o terminal.

Conviene modelarlo como:
- `riskLevel`
  - low
  - medium
  - high
- `riskReasons`
  - margin_drift
  - payroll_change
  - provider_dependency
  - no_backup
  - client_satisfaction
  - compliance_gap
  - over_allocation

Esto permite:
- mantener un placement `active` pero `at_risk`
- explicar por qué está en riesgo
- enrutar alertas al owner correcto

### Ownership matrix by stage

- `scoped`
  - Comercial / Staffing
- `pipeline`
  - Comercial / Staffing
- `onboarding`
  - Operaciones / Delivery
- `active`
  - Operaciones
- `renewal_pending`
  - Comercial
- `at_risk`
  - owner mixto según causa
- `ended`
  - Operaciones + Comercial
- `archived`
  - sistema / analytics

### Implication for alerts and desks

Si seguimos este lifecycle, los desks naturales del módulo son:

- `Pipeline Desk`
  - trabaja `scoped`, `pipeline`
- `Onboarding Desk`
  - trabaja `onboarding`, `client_setup`
- `Live Operations Desk`
  - trabaja `active`, `live`
- `Risk & Renewal Desk`
  - trabaja `at_risk`, `renewal_pending`
- `Historical / Analytics`
  - trabaja `ended`, `archived`

### Implication for current runtime

El runtime actual ya tiene una base útil:
- `status`
  - `pipeline`, `onboarding`, `active`, `renewal_pending`, `renewed`, `ended`
- `lifecycleStage`
  - `draft`, `contracting`, `client_setup`, `live`, `closed`

Para la iteración enterprise, la recomendación no es desechar eso, sino evolucionarlo:
- mantener esos campos como base
- agregar semántica explícita para `risk`
- endurecer reglas de transición
- definir owners y alertas por estado

Eso da continuidad con el modelo ya implementado y evita una reescritura innecesaria.

## Module Surfaces

### 1. Placements

Vista principal operativa.

Debe permitir:
- listado de placements
- filtros por BU, cliente, provider, status, risk, renewal
- orden por margen, vencimiento, costo, health
- lectura rápida de coverage y alertas

#### Purpose

Ser la consola diaria del módulo para operadores, staffing y líderes comerciales.

#### What it should answer fast

- qué placements están activos hoy
- cuáles están en onboarding
- cuáles están en riesgo
- cuáles vencen pronto
- cuáles no tienen cobertura suficiente

#### Recommended sections

- KPI strip
  - active
  - onboarding
  - at risk
  - renewal due
- main table
  - persona
  - cliente
  - BU
  - provider
  - status
  - stage
  - margin
  - renewal date
  - risk
- quick actions
  - abrir placement
  - abrir persona
  - abrir space
  - abrir finance lens
  - abrir payroll lens

#### Cross-module consumers

- `People`
- `Organizations / Spaces`
- `Finance`
- `Payroll`
- `Providers`

### 2. Placement 360

Vista detallada del placement.

Debe componer:
- overview
- commercial
- operations
- onboarding / compliance
- finance / profitability
- performance
- activity / event log

#### Purpose

Ser la ficha completa del servicio Staff Aug para una colocación específica.

#### Mandatory tabs or blocks

1. `Overview`
- persona, cliente, BU, provider
- status, stage, health, risk
- fechas y owners

2. `Commercial`
- billing rate
- renewal
- contractual terms
- provider relationship
- scope notes

3. `Operations`
- assignment base
- reporting line
- channels
- tooling stack
- coverage / backup

4. `Onboarding & Compliance`
- onboarding interno relacionado
- onboarding cliente
- documentos y compliance status
- blockers

5. `Finance & Profitability`
- revenue expected/actual
- payroll cost
- loaded cost
- tooling cost
- direct expense
- margin expected/actual

6. `Performance`
- delivery signals
- utilization
- client satisfaction
- operational flags

7. `Activity`
- event log
- status transitions
- owner actions
- explainability trail

#### Cross-module consumers

- `Person 360`
- `Space 360`
- `Finance`
- `HR`
- `Payroll`
- `Cost Intelligence`

### 3. Pipeline

Vista previa al placement activo.

Debe cubrir:
- demanda del cliente
- openings / requests
- candidatos internos elegibles
- gaps de skills
- negociación y readiness

#### Purpose

Resolver la parte previa al placement activo sin mezclarla con el runtime live.

#### What it should manage

- requerimientos del cliente
- openings por BU / cliente
- candidatos posibles
- readiness comercial
- readiness HR / compliance
- readiness operativa

#### Important note

Este desk puede terminar conectado al CRM, pero el módulo debe poder expresar su pipeline propio aunque la oportunidad comercial original nazca fuera de Staff Aug.

#### Cross-module consumers

- `CRM / HubSpot`
- `People`
- `Skills / Talent`
- `Organizations`

### 4. Renewals & Risk Desk

Desk enterprise para seguimiento preventivo.

Debe mostrar:
- placements por vencer
- erosión de margen
- cobertura débil
- cambios de costo payroll
- dependencia excesiva de provider o persona

#### Purpose

Concentrar el trabajo preventivo del módulo y evitar que la renovación o el riesgo se manejen “por memoria”.

#### Typical queues

- renewals in 30/60/90 days
- margin drift
- cost increase from payroll
- no backup coverage
- provider dependency
- client health issues
- compliance blockers

#### Recommended actions

- renovar
- renegociar rate
- cambiar provider
- asignar backup
- abrir caso de riesgo
- abrir drilldown financiero

#### Cross-module consumers

- `Finance`
- `Payroll`
- `Providers`
- `Operations`
- `Commercial leadership`

### 5. Profitability Desk

Vista económica específica del módulo.

Debe mostrar:
- margen esperado vs real
- revenue por placement
- costo real por placement
- drilldown por cliente, BU, provider, persona

#### Purpose

Dar una lectura económica nativa de Staff Aug sin reemplazar a `Cost Intelligence`, sino montándose sobre ella.

#### What it should answer

- qué placements son más rentables
- cuáles están erosionando margen
- qué cliente/BU gana o pierde más
- cuánto pega tooling y overhead
- qué providers concentran más costo

#### Recommended levels of aggregation

- placement
- persona
- cliente / organization
- BU
- provider

#### Cross-module consumers

- `Finance`
- `Cost Intelligence`
- `Space 360`
- `Business Units`

### 6. Talent Match / Coverage

Vista de staffing intelligence.

Debe responder:
- quién puede cubrir esta demanda
- quién tiene bench disponible
- qué placements no tienen backup
- qué skills faltan para sostener la operación

#### Purpose

Volver el módulo útil no solo para operar placements existentes, sino para sostener continuidad y crecimiento.

#### What it should answer

- quién está listo para ser colocado
- quién puede reemplazar a quién
- qué gaps de skills existen hoy
- dónde hay bench subutilizado
- dónde hay dependencia excesiva de una sola persona

#### Cross-module consumers

- `People`
- `HR`
- `Skills / Staffing`
- `Commercial / Staffing`

### Recommended navigation model

El módulo enterprise debería poder navegarse en tres entradas:

1. `Agency > Staff Augmentation`
- entrypoint principal del módulo

2. `Person 360`
- lens por persona hacia placements y elegibilidad

3. `Space / Organization 360`
- lens por cliente hacia headcount, margen y riesgo Staff Aug

Esto mantiene el módulo como dominio propio, pero conectado al resto del grafo Greenhouse.

### Surface rollout recommendation

#### Phase 1

- `Placements`
- `Placement 360`
- `Renewals & Risk Desk` básico

#### Phase 2

- `Profitability Desk`
- `Talent Match / Coverage`

#### Phase 3

- `Pipeline`
- compliance client-facing
- advanced staffing intelligence

## Cross-Module Synergies

Regla de lectura:

- `Current codebase` describe lo que ya está visible o conectado en el repo hoy.
- `Enterprise direction` describe lo que conviene expandir en la futura task del módulo.

### With People

El módulo debe:
- mostrar placements activos e históricos por persona
- indicar elegibilidad para Staff Aug
- mostrar riesgo de sobreasignación
- permitir CTA:
  - crear assignment
  - crear placement
  - abrir placement

#### People is source of

- identidad operativa de la persona
- skills, seniority y perfil profesional
- historial de asignaciones
- señales de disponibilidad y sobreasignación

#### Staff Aug should consume

- `memberId`
- profile / skills
- assignment context
- workload y utilization
- historial comercial de placements

#### Staff Aug should return to People

- placements activos e históricos
- elegibilidad Staff Aug
- riesgo comercial/operativo asociado a la persona
- coverage y backup status

Pregunta clave:

> “¿Esta persona está lista, disponible y bien posicionada para un placement Staff Aug?”

#### Current codebase

- `People` ya expone assignments en [get-person-detail.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/people/get-person-detail.ts) y [types/people.ts](/Users/jreye/Documents/greenhouse-eo/src/types/people.ts).
- El bridge mínimo ya quedó visible en [PersonMembershipsTab.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx):
  - `assignmentType`
  - `placementId`
  - CTA para abrir o crear placement
- La membresía organizacional sigue viniendo por `getPersonMemberships()` y `POST /api/people/[memberId]/memberships`; People no crea placements directamente.

#### Enterprise direction

- sumar historial explícito de placements por persona
- exponer elegibilidad y coverage de backup
- conectar skills y disponibilidad de forma más institucional

### With Organization / Space

El módulo debe:
- mostrar headcount Staff Aug por cliente
- revenue y margen por organization
- stakeholders y reporting lines
- riesgo comercial y de continuidad

#### Organization / Space is source of

- contexto cliente
- stakeholders
- estructura operativa del engagement
- lens consolidado del servicio

#### Staff Aug should consume

- `organizationId`
- `spaceId`
- commercial context del cliente
- active modules y service footprint

#### Staff Aug should return to Organization / Space

- headcount Staff Aug
- placements activos
- riesgo de continuidad
- margen asociado a Staff Aug
- concentración por persona o provider

Pregunta clave:

> “¿Cómo está funcionando el servicio Staff Aug dentro de este cliente y cuánto riesgo o margen genera?”

#### Current codebase

- `Space 360` ya trata a `Space` como objeto real y consume Staff Aug como parte de su composición en [space-360.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/agency/space-360.ts).
- El detail de `Space 360` ya resuelve assignments con `placement_id`, `placement_status`, `provider_id` y summary de placements por espacio.
- `staff_aug_placements` ya persiste `space_id` y `organization_id`, por lo que la relación con `Space` ya existe en runtime.

#### Enterprise direction

- volver más explícito a `Space` como objeto padre de contexto
- mostrar headcount, riesgo y margen Staff Aug como lens formal del `Space`
- agregar colas de continuidad/renewal por cliente

### With HR

HR aporta:
- contract type
- elegibilidad
- onboarding interno
- documentación
- perfil profesional
- desempeño general

Staff Aug no debe duplicar esto; debe consumirlo y contextualizarlo por cliente.

#### HR is source of

- lifecycle laboral interno
- contract taxonomy
- compliance base
- onboarding interno
- performance global

#### Staff Aug should consume

- contract type
- elegibilidad
- onboarding interno completado o pendiente
- compliance flags relevantes
- perfil profesional y de carrera

#### Staff Aug should return to HR

- contexto de cliente
- exposición comercial de la persona
- onboarding/compliance client-specific
- señales de continuidad o riesgo que afecten a la persona

#### Current codebase

- La arquitectura HRIS ya define a Staff Aug como módulo complementario en [Greenhouse_HRIS_Architecture_v1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/Greenhouse_HRIS_Architecture_v1.md#L613).
- El contrato arquitectónico ya dice que `contract_type` canónico vive en `members` y que Staff Aug solo snapshottea campos HRIS.
- En runtime actual, Staff Aug ya toma snapshot de compensación y contract metadata desde `compensation_versions`, pero todavía no existe un desk HR explícito del placement.

#### Enterprise direction

- incorporar onboarding/compliance HR-aware en `Placement 360`
- dejar explícita la elegibilidad para Staff Aug
- devolver a HR señales de exposición comercial y continuidad

### With Payroll

Payroll aporta:
- costo canónico base
- vigencia de compensación
- cambios que afectan margen
- exposición mensual de costo por persona

#### Payroll is source of

- costo base canónico
- vigencia de compensación
- cambios de costo
- régimen de pago

#### Staff Aug should consume

- costo base vigente
- pay regime
- snapshots mensuales de costo
- cambios que disparan recalculo de margen

#### Staff Aug should return to Payroll

- contexto de placements activos por persona
- impacto económico de cambios de costo
- exposición mensual por placement

#### Current codebase

- Staff Aug ya lee `greenhouse_payroll.compensation_versions` en [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts#L225) para prefill de costo.
- Los snapshots mensuales ya leen `payroll_entries` y calculan `payroll_gross_clp` / `payroll_employer_cost_clp` en [snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/snapshots.ts).
- La proyección reactiva de Staff Aug ya reacciona a `payrollPeriodCalculated`, `payrollEntryUpserted` y `compensationVersionCreated/Updated` en [staff-augmentation.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/sync/projections/staff-augmentation.ts).

#### Enterprise direction

- volver visible el impacto de cambios de nómina sobre placements en riesgo
- construir colas de `margin drift` provocadas por costo payroll
- dar a Payroll una vista más clara del exposure por placement

### With Finance

Finance aporta:
- revenue
- billing
- cobranza
- rentabilidad
- forecast
- exposure por cliente, BU y provider

#### Finance is source of

- revenue real
- cobranza
- facturación
- visión económica del cliente

#### Staff Aug should consume

- ingresos vinculables al placement
- estado de cobranza
- forecast y métricas comerciales
- contexto financiero del cliente

#### Staff Aug should return to Finance

- unidad económica por placement
- revenue / margin por placement
- señales de renovación y expansión
- exposición por provider y por BU

#### Current codebase

- Los snapshots Staff Aug ya calculan `projectedRevenueClp`, `commercialLoadedCostClp`, `memberDirectExpenseClp`, `toolingCostClp` y `grossMarginProxy` en [snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/snapshots.ts).
- `People Finance` ya consume `commercial_cost_attribution` como capa canónica para costo comercial en [get-person-finance.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/person-360/get-person-finance.ts#L246).
- Aún no existe un `Profitability Desk` propio del módulo; hoy la lectura económica vive en snapshots y consumers parciales.

#### Enterprise direction

- construir un desk financiero específico del módulo
- conectar revenue real, cobranza y forecast
- bajar rentabilidad por placement, cliente, BU y provider

### With Cost Intelligence

Cost Intelligence aporta:
- labor cost
- loaded cost
- shared overhead
- direct overhead
- tooling cost attribution

#### Cost Intelligence is source of

- loaded cost
- direct expense
- overhead
- costo atribuible explicado

#### Staff Aug should consume

- explainability del costo
- costo total por placement
- costo total por cliente / BU / provider

#### Staff Aug should return to Cost Intelligence

- lens comercial del placement
- prioridad de consumers Staff Aug
- señales de margin drift y profitability

#### Current codebase

- Staff Aug ya consume `commercial_cost_attribution` y readers de costos directos/tooling desde sus snapshots.
- La arquitectura financiera ya fija que `commercial_cost_attribution` es la capa canónica consumible, no una tabla a recalcular en cada módulo.
- No existe todavía una explicación especializada de costo “Staff Aug-first”; se reaprovechan las capas canónicas existentes.

#### Enterprise direction

- construir lenses y explain por placement
- hacer explícito cuándo una erosión de margen viene de payroll, overhead, tooling o gasto directo
- no romper la regla de que Cost Intelligence sigue siendo el source of truth explicable

### With Providers

Providers aporta:
- EOR / staffing partner / direct
- costo de relación
- riesgo de concentración
- governance contractual

#### Providers is source of

- identidad canónica del provider
- tipo de relación
- capacidad contractual y financiera
- concentración de riesgo

#### Staff Aug should consume

- provider canónico
- tipo de relación
- costos o dependencia del provider
- exposición cross-module

#### Staff Aug should return to Providers

- placements vinculados al provider
- revenue/costo/margen asociado
- riesgo de concentración
- dependencia crítica por cliente o persona

#### Current codebase

- `staff_aug_placements` ya persiste `provider_id` y `provider_relationship_type` en [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts#L22).
- `Provider 360` ya existe como objeto canónico y `SupplierProviderToolingTab` ya expone costo, tooling y payroll por provider en [provider-tooling-snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/providers/provider-tooling-snapshots.ts) y [SupplierProviderToolingTab.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/finance/SupplierProviderToolingTab.tsx).
- Hoy la relación Staff Aug -> Provider existe a nivel de placement y snapshots, pero no hay todavía un desk explícito de dependencia/riesgo por provider dentro del módulo.

#### Enterprise direction

- volver visible la concentración de placements por provider
- construir señales de provider risk y dependency
- drilldown entre Provider 360 y Staff Aug

### With Tooling / AI Tooling

Tooling aporta:
- stack requerido por placement
- licencias asignadas
- wallets / spend
- costo extra que erosiona margen

#### Tooling is source of

- stack requerido
- licencias
- consumo
- spend asociado

#### Staff Aug should consume

- herramientas críticas por placement
- costos mensuales de tooling
- gaps de acceso o licencias

#### Staff Aug should return to Tooling

- placements que dependen de una herramienta
- prioridad de provisioning
- contexto comercial de ese consumo

#### Current codebase

- Staff Aug ya incorpora `toolingCostClp` en sus snapshots mensuales en [snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/snapshots.ts).
- `Provider tooling` ya materializa costos de herramientas, licencias, wallets y payroll exposure por provider.
- En placement ya existen campos operativos como `client_tools`, pero aún no hay un lens completo `Tooling by placement`.

#### Enterprise direction

- hacer visible el stack requerido por placement
- ligar costos y gaps de licencias al health del placement
- permitir priorización operativa desde Tooling hacia Staff Aug

## Current Runtime Baseline Confirmed In Codebase

La investigación ya no debe leerse como teoría pura. El repo confirma que el baseline moderno de Staff Aug ya existe y que la futura task enterprise debe partir desde esta base, no reemplazarla.

### Identity and runtime anchors already implemented

- `assignment` ya es el pivote operativo real en [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts).
- `placement` ya existe como entidad transaccional en `greenhouse_delivery.staff_aug_placements`.
- `placement` ya persiste:
  - `assignment_id`
  - `member_id`
  - `client_id`
  - `space_id`
  - `organization_id`
  - `provider_id`
- el flujo actual ya fuerza `assignment_type = 'staff_augmentation'` al crear un placement en [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts#L829).

### People bridge already implemented

- `People 360` ya expone señales mínimas de Staff Aug en [get-person-detail.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/people/get-person-detail.ts) y [PersonMembershipsTab.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx).
- hoy ya existen:
  - `assignmentType`
  - `placementId`
  - `placementStatus`
  - CTA `Crear placement`
  - CTA `Abrir placement`
- la membresía organizacional sigue separada del placement; `membership` no es hoy el contenedor comercial de Staff Aug.

### Space and organization context already implemented

- `Space 360` ya existe como surface viva en [space-360.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/agency/space-360.ts) y consume placements dentro de su composición.
- `staff_aug_placements` ya guarda `space_id` y `organization_id`, por lo que la relación `Space -> Placement` ya existe en datos y readers.
- la futura iteración enterprise no necesita inventar el vínculo con `Space`; necesita volverlo más visible y más gobernado.

### Economic baseline already implemented

- los snapshots mensuales de Staff Aug ya existen en [snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/snapshots.ts).
- hoy ya se materializan campos como:
  - `projectedRevenueClp`
  - `payrollEmployerCostClp`
  - `commercialLoadedCostClp`
  - `memberDirectExpenseClp`
  - `toolingCostClp`
  - `grossMarginProxyClp`
- `commercial_cost_attribution` ya es la capa canónica compartida por Finance y Cost Intelligence, no una idea futura.

### Payroll and provider reactivity already implemented

- Staff Aug ya lee `greenhouse_payroll.compensation_versions` para costo base y metadata de compensación en [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts#L225).
- la proyección reactiva en [staff-augmentation.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/sync/projections/staff-augmentation.ts) ya refresca snapshots por cambios de:
  - assignments
  - payroll
  - finance
  - providers
  - tooling
- `Provider 360` y `provider_tooling_snapshots` ya existen como consumers/provider-lens activos.

### Current visible UI baseline

- listado Staff Aug:
  - [/agency/staff-augmentation](/Users/jreye/Documents/greenhouse-eo/src/app/(dashboard)/agency/staff-augmentation/page.tsx)
- detalle de placement:
  - [/agency/staff-augmentation/[placementId]](/Users/jreye/Documents/greenhouse-eo/src/app/(dashboard)/agency/staff-augmentation/[placementId]/page.tsx)
- el `Placement 360` actual ya tiene:
  - `Resumen`
  - `Onboarding`
  - `Eventos`
- este baseline ya es útil, pero todavía no equivale a un módulo enterprise completo con desks específicos de profitability, renewals o talent coverage.

## Current Runtime Gaps Vs Enterprise Target

La nueva task enterprise debería atacar gaps concretos confirmados en el repo, no reabrir piezas ya resueltas.

### 1. Placement exists, but not yet as full enterprise desk

Hoy:
- `PlacementDetailView` ya existe en [PlacementDetailView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx)
- compone overview, onboarding y eventos

Gap:
- todavía no existe una `Placement 360` con bloques formales de:
  - comercial
  - profitability
  - performance
  - compliance
  - coverage
  - renewal/risk

### 2. People bridge exists, but not full person-level Staff Aug intelligence

Hoy:
- People ya sabe abrir o crear placement desde assignments elegibles

Gap:
- no existe historial explícito de placements por persona
- no existe coverage/backups por persona
- no existe elegibilidad institucional del tipo “ready for Staff Aug”
- no todos los lenses de persona en Finance son placement-aware todavía

### 3. Space consumes Staff Aug, but does not yet own a full Staff Aug lens

Hoy:
- `Space 360` ya lista assignments/placements relacionados

Gap:
- todavía no hay lens formal de:
  - headcount Staff Aug
  - margin Staff Aug por space
  - renewal queues por cliente
  - continuity risk por space

### 4. Economic math exists, but not a dedicated Profitability Desk

Hoy:
- el cálculo económico existe en snapshots
- Finance y Cost Intelligence ya aportan readers canónicos

Gap:
- no existe una surface operativa dedicada para:
  - margen por placement
  - comparación expected vs actual
  - erosión por payroll/tooling/overhead/direct expense
  - agregados por BU, provider y cliente

### 5. Renewal and risk vocabulary exists, but not a real desk

Hoy:
- el runtime ya usa `status` y `lifecycleStage`
- ya hay señales suficientes para detectar drift económico o estados transicionales

Gap:
- no hay colas explícitas de:
  - renewals en 30/60/90 días
  - margin drift
  - provider dependency
  - no backup coverage
  - compliance blockers

### 6. Provider and tooling integrations exist, but not as placement-first governance

Hoy:
- provider ya entra a placement
- tooling cost ya erosiona margen
- Provider 360 ya ofrece costo, tooling y payroll exposure

Gap:
- no existe un lens completo de dependencia por provider a nivel de placements
- no existe `tooling by placement` como surface formal
- faltan alertas institucionales cuando licencias, accesos o proveedores ponen en riesgo el placement

### 7. Evented runtime exists, but not full enterprise language of the domain

Hoy:
- ya existen eventos `staff_aug.*`
- ya existe proyección reactiva y materialización de snapshots

Gap:
- todavía no están institucionalizados eventos como:
  - `margin_drift.detected`
  - `coverage_gap.detected`
  - `provider_risk.detected`
  - `renewal_due`
- la futura task debería ampliar el lenguaje del dominio sin reabrir el baseline reactivo ya implementado

### 8. HRIS relationship is defined, but not yet surfaced as enterprise workflow

Hoy:
- la arquitectura HRIS ya deja claro que HRIS gobierna la persona y Staff Aug gobierna la colocación
- el repo ya usa snapshots de contrato/compensación sin volver canónico al placement

Gap:
- todavía no existe workflow explícito para:
  - elegibilidad Staff Aug
  - compliance client-specific
  - onboarding HR-aware dentro de Placement 360
  - handoff institucional entre HR, Payroll, Staffing y Operations

## Recommended domain contracts

Para que el módulo sea enterprise de verdad, cada sinergia debería resolverse en tres contratos:

1. `Identity contract`
- qué IDs compartimos
- cuál es canónico
- cuál es snapshot

2. `Operational contract`
- qué eventos y estados compartimos
- quién dispara qué
- quién consume qué

3. `Economic contract`
- qué costo o revenue aporta cada dominio
- quién es source of truth
- quién solo materializa o explica

Esta separación debería guiar la futura task enterprise más que cualquier decisión de UI aislada.

## Enterprise Capabilities Expected

### Commercial capabilities

- rate cards
- renewal management
- expansion opportunities
- profitability by placement
- provider strategy

### Operational capabilities

- onboarding desk
- placement health
- staffing continuity
- escalation management
- SLA / service continuity

### Governance capabilities

- event log
- audit trail
- permission model
- explainability of margin and risk
- lifecycle history

### Talent capabilities

- talent pool
- replacement planning
- bench utilization
- skills match
- role/seniority coverage

## Suggested Metrics

### Core module metrics

- active placements
- placements in onboarding
- placements at risk
- placements due for renewal
- average margin expected
- average margin actual
- payroll cost drift affecting placements
- tooling cost per placement
- percentage of placements with backup

### Organization metrics

- active placements by client
- margin by organization
- revenue concentration
- provider concentration

### People metrics

- placements per person
- bench-ready candidates
- risk of burnout / over-allocation
- replacement readiness

## Event Model To Consider

El módulo enterprise debería eventualmente institucionalizar eventos como:

- `staff_aug.placement.pipeline_entered`
- `staff_aug.placement.onboarding_started`
- `staff_aug.placement.live`
- `staff_aug.placement.at_risk`
- `staff_aug.placement.renewal_due`
- `staff_aug.placement.renewed`
- `staff_aug.placement.ended`
- `staff_aug.margin_drift.detected`
- `staff_aug.coverage_gap.detected`
- `staff_aug.provider_risk.detected`

No significa implementarlos ahora; significa reservarlos como lenguaje del dominio.

## What The Next Enterprise Task Should Likely Cover

La futura task nueva de Staff Aug enterprise debería, como mínimo, decidir:

1. El objeto `placement` enterprise completo
2. El lifecycle oficial
3. Las vistas `Placements`, `Placement 360`, `Renewals & Risk`, `Profitability`, `Talent Match`
4. Los contratos con `People`, `Organizations`, `HR`, `Payroll`, `Finance`, `Costs`, `Providers`, `Tooling`
5. La taxonomía de métricas y alertas
6. El set mínimo de eventos y projections follow-on

## Open Questions

1. ¿`Pipeline` de Staff Aug vive dentro del módulo o debería conectarse explícitamente al CRM/HubSpot?
2. ¿`Placement health` será heurístico inicialmente o materializado como snapshot propio?
3. ¿`Profitability Desk` debe vivir dentro de Staff Aug o como lens especializado sobre `Cost Intelligence`?
4. ¿`Talent Match` debe usar primero reglas simples o apoyarse después en un engine más inteligente?
5. ¿`client-facing compliance` entra en la primera fase enterprise o queda para una fase posterior?

## Ready For Task When

Este brief estará listo para transformarse en task(s) cuando:

- se cierre el objeto `placement` enterprise deseado
- se acuerde el lifecycle formal
- se definan las vistas del módulo
- se separe claramente qué pertenece a HRIS y qué pertenece a Staff Aug
- se priorice qué entra en fase 1, fase 2 y fase 3

## Related References

- [TASK-019-staff-augmentation-module.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/complete/TASK-019-staff-augmentation-module.md)
- [TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/complete/TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md)
- [Greenhouse_HRIS_Architecture_v1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/Greenhouse_HRIS_Architecture_v1.md)
- [GREENHOUSE_360_OBJECT_MODEL_V1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [GREENHOUSE_DATA_MODEL_MASTER_V1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md)
