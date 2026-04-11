# Greenhouse Assigned Team Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-11
> **Status:** Canonical architecture draft — lista para bajar a tasks de implementación

---

## Purpose

Definir la arquitectura canónica de `Equipo asignado` como módulo enterprise cliente-facing de Greenhouse para visibilidad de talento contratado, cobertura de capacidad y salud operativa del servicio.

Este documento existe para evitar que la surface cliente `/equipo` siga evolucionando como un roster aislado, sin contrato claro de:

- qué significa `asignado`
- qué fuentes son canónicas
- qué datos puede ver un cliente enterprise
- cómo se separan composición, capacidad, performance y riesgo
- cómo escalar la lectura para múltiples spaces, squads y stakeholders

Usar junto con:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/tasks/complete/TASK-318-client-safe-verified-talent-profiles.md`

---

## Core Thesis

`Equipo asignado` no debe modelarse como una simple lista de personas ni como un mini directorio de perfiles.

Debe tratarse como una capability enterprise de `client workforce visibility` que combina, bajo un contrato único:

1. composición del equipo comprometido
2. cobertura de capacidad contratada y activa
3. señales cliente-safe de capability y confianza
4. señales resumidas de salud operativa y performance

La surface principal es cliente-facing, pero la semántica base debe ser reusable por múltiples superficies:

- Home cliente
- Space 360
- capability modules
- QBR / executive snapshots
- futuras vistas de staffing coverage y replacement risk

---

## Naming Contract

### Nombre del módulo

- **Canónico:** `Equipo asignado`

### Nombre de la vista principal en UI bilingüe o premium

- **Preferido:** `Assigned Team`

### Cards multi-superficie

- `Assigned Team`
- `Capacity Coverage`
- `Team Health`
- `Capability Coverage`
- `Delivery Confidence`

### Alias permitidos

- `Tu equipo` puede existir como card o CTA liviano en home, pero no como nombre arquitectónico del módulo.

### Labels prohibidos por ambiguos

- `Equipo` sin contexto
- `Talento` usado como sustituto de roster asignado
- `Mi equipo` cuando en realidad la lectura es cliente-facing y no supervisor/internal

---

## Why This Matters

Los clientes de Efeonce son enterprise. Eso implica:

- múltiples stakeholders por cuenta
- expectativas de reporting ejecutivo
- necesidad de justificar capacidad, seniority y coverage
- preocupación real por continuidad, riesgo y performance
- sensibilidad alta sobre qué datos se pueden o no exponer

Sin una arquitectura explícita, `Equipo asignado` corre el riesgo de quedar como:

- roster estático
- copia cliente-safe de People
- tabla híbrida que mezcla FTE, saturación y rendimiento sin semántica
- feature difícil de gobernar cuando un cliente tiene múltiples spaces o 50+ personas asignadas

---

## Non-Goals

`Equipo asignado` no debe convertirse en:

- módulo de `Hiring / ATS`
- módulo de administración de `Staff Augmentation`
- surface de HR interna
- directorio global de colaboradores
- panel de compensaciones o costos individuales
- reemplazo de `People`, `Org Chart`, `Mi equipo` o `Payroll`

---

## Architectural Position

`Equipo asignado` es un módulo cliente-facing post-staffing.

Se ubica aguas abajo de:

- `Organization`
- `Space`
- `client_team_assignments`
- `staff augmentation placements` cuando apliquen
- `client-safe talent profile`
- snapshots de capacidad y serving de señales operativas

No crea un pipeline nuevo ni reemplaza los objetos transaccionales existentes.

---

## Greenhouse Synergy Contract

`Equipo asignado` debe crear sinergias con todo Greenhouse sin absorber ownership transaccional de los demás dominios.

La regla base es:

> `Equipo asignado` compone y publica una lectura enterprise de servicio; no reemplaza la verdad operativa, humana, comercial o financiera de los módulos que la alimentan.

### 1. Synergy with `Organization` and `Space`

`Equipo asignado` se ancla a la jerarquía cliente ya existente:

- `Organization` como cuenta cliente consolidada
- `Space` como frente operativo concreto

Qué toma:

- scoping de cuenta
- scoping por space
- contexto de servicio visible para el cliente

Qué habilita:

- lectura consolidada por cliente
- drilldown por space
- executive cards reutilizables en Home cliente y `Space 360`

Regla:

- nunca debe inventar un tenant o agrupador paralelo al objeto `Space`
- cuando el cliente sea enterprise y tenga varios frentes, `Equipo asignado` debe agregarlos; no aplanarlos

### 2. Synergy with `client_team_assignments` and operational roster

La capa de assignments es la base operativa del módulo.

Qué toma:

- asignaciones activas
- FTE comprometida por member y scope
- vigencia y tipo de assignment

Qué habilita:

- roster visible
- FTE contracted / assigned / active
- coverage por scope
- comparación entre capacidad contratada y cobertura real

Regla:

- `Equipo asignado` reutiliza `client_team_assignments`; no crea otra identidad de roster cliente
- cualquier cambio en el roster debe ocurrir en el carril de assignments o staffing, no dentro del módulo cliente-facing

### 3. Synergy with `Staff Augmentation`

`Staff Augmentation` y `Equipo asignado` se tocan, pero no son el mismo módulo.

Qué toma:

- placements visibles para el cliente cuando formen parte del servicio entregado
- contexto de placement, onboarding del cliente y continuidad operativa cuando aplique

Qué habilita:

- visibilidad cliente de talento staff-aug sin exponer la consola administrativa interna
- lectura conjunta de equipos híbridos: internos + staff augmentation + support lanes

Regla:

- `Staff Augmentation` sigue siendo owner del placement comercial/operativo
- `Equipo asignado` es la lens cliente-facing del resultado, no el lugar donde se administra el placement

### 4. Synergy with `HRIS`

`HRIS` conserva la verdad laboral de la persona; `Equipo asignado` no debe cruzar ese boundary.

Qué toma:

- identidad operativa del `member`
- contract taxonomy cuando afecte el tipo de participación visible
- datos profesionales que viven en la faceta humana/canónica

Qué habilita:

- roster consistente sin duplicar la raíz humana
- continuidad entre incorporación interna y visibilidad frente al cliente

Regla:

- `Equipo asignado` no muestra payroll, leave, compensación ni evaluaciones internas crudas
- si un dato viene de HRIS pero no es cliente-safe, queda fuera aunque sea útil internamente

### 5. Synergy with `Person Complete 360`

`Equipo asignado` debe reutilizar el grafo de persona en vez de recomponer identidad por su cuenta.

Qué toma:

- identidad canónica
- avatar y narrative profesional
- relationships operativas ya resueltas
- facetas complementarias cuando exista autorización y visibilidad

Qué habilita:

- consistencia entre People, profile surfaces, Staff Aug y surfaces cliente
- reducción de readers duplicados para persona + assignment + context

Regla:

- el módulo debe consumir o inspirarse en `Person Complete 360`, pero publicar una lens cliente-safe especializada
- no convertir `Person Complete 360` en payload directo para cliente

### 6. Synergy with `Talent Trust` and `client-safe profiles`

Esta es una sinergia estructural, no decorativa.

Qué toma:

- skills verificadas
- certificaciones visibles
- idiomas
- narrative profesional permitida
- confidence / verification state

Qué habilita:

- capability coverage real
- confianza enterprise del talento mostrado
- dossiers cliente-safe por persona asignada

Regla:

- el perfil visible en `Equipo asignado` debe salir del carril `client-safe`, no del perfil interno completo
- `verification_status`, `visibility` y futuros endorsements son inputs directos del módulo

### 7. Synergy with `Team Capacity`

`Equipo asignado` necesita capacidad canónica para ser creíble.

Qué toma:

- `member_capacity_economics`
- contracted hours / FTE
- assigned hours
- availability y usage signals

Qué habilita:

- `Capacity Coverage`
- lectura diferenciada entre capacidad contratada, asignada y activa
- señales resumidas de saturación

Regla:

- `Equipo asignado` no debe recalcular capacidad on-read con fórmulas locales
- consume semantic layer shared de Team Capacity y la traduce a lenguaje cliente-safe

### 8. Synergy with `Delivery`, `ICO` and service performance

El módulo no se queda en roster; debe decir qué tan saludable va el servicio.

Qué toma:

- métricas agregadas de delivery
- quality / reliability signals
- health indicators aprobados para consumo cliente

Qué habilita:

- `Team Health`
- `Delivery Confidence`
- lectura ejecutiva que conecta talento con desempeño sin caer en telemetría raw

Regla:

- las señales deben ser curadas, resumidas y explicables
- no exponer internals de delivery que rompan el boundary de un portal enterprise

### 9. Synergy with `Capability Modules`

`Equipo asignado` debe volverse building block de los capability modules y no quedarse solo en la navegación genérica.

Qué toma:

- contexto del módulo o línea de servicio
- service lane / squad / capability grouping cuando exista

Qué habilita:

- cards especializadas por capability
- lectura de talento asignado contextual al servicio contratado
- integración natural con `Creative Hub`, futuras surfaces CRM o delivery views

Regla:

- los capability modules pueden consumir las cards y readers del módulo
- no deben crear una interpretación paralela de “equipo del cliente”

### 10. Synergy with `Finance` and `Cost Intelligence`

La sinergia aquí es deliberadamente acotada.

Qué toma:

- señales de coverage o salud que puedan relacionarse con servicio y continuidad
- eventualmente snapshots agregados de portfolio o health por scope

Qué habilita:

- lectura ejecutiva conectable a rentabilidad, riesgo y QBR
- narrativa cliente sobre estabilidad del servicio sin exponer economics sensibles

Regla:

- `Equipo asignado` no expone costo individual ni margen
- si se conecta a Finance o Cost Intelligence, debe hacerlo vía señales resumidas o explain agregado, nunca mostrando costo por persona

### 11. Synergy with `Hiring / ATS`

La relación con Hiring es upstream y estratégica.

Qué toma:

- futuras señales de replacement readiness
- futura continuidad de cobertura
- handoffs completados hacia `member`, `assignment` o `placement`

Qué habilita:

- continuidad entre demanda, cobertura y equipo visible
- futura transición elegante entre vacancy / replacement risk y assigned team health

Regla:

- `Hiring / ATS` sigue siendo owner de `TalentDemand`, `HiringApplication` y `HiringHandoff`
- `Equipo asignado` solo consume el resultado materializado una vez que existe cobertura real

### 12. Synergy with `Identity Access` and enterprise permissioning

Como el módulo es enterprise, su sinergia con autorización es crítica.

Qué toma:

- route group `client`
- view codes cliente
- future permission sets
- scoping por organization / space / stakeholder profile

Qué habilita:

- experiencias diferenciadas para `client_executive`, `client_manager`, `client_specialist`
- field-level visibility en clientes enterprise con necesidades distintas

Regla:

- la autorización no debe resolverse solo a nivel route
- el módulo debe diseñarse para convivir con permission sets y políticas por campo

---

## Synergy Matrix

| Dominio Greenhouse | `Equipo asignado` consume | `Equipo asignado` habilita | Boundary |
| --- | --- | --- | --- |
| Organization / Space | scope de cuenta y frente operativo | vista consolidada + drilldown | no crear jerarquía paralela |
| Assignments | roster y FTE comprometida | capacity coverage y roster visible | no mutar roster desde la surface cliente |
| Staff Augmentation | placements visibles | equipos híbridos cliente-facing | placement admin sigue afuera |
| HRIS | faceta humana/operativa base | continuidad entre member y servicio visible | no exponer payroll/leave/confidential HR |
| Person Complete 360 | identidad, contexto y relaciones | consistencia de persona cross-module | no devolver payload interno completo a cliente |
| Talent Trust / Client-safe | skills, certs, idiomas, confidence | capability coverage enterprise | solo datos `client-safe` |
| Team Capacity | FTE, availability, usage/saturation | `Capacity Coverage` y health | no recalcular fórmulas localmente |
| Delivery / ICO | health y performance curada | `Team Health` y `Delivery Confidence` | no exponer telemetría raw |
| Capability Modules | contexto del servicio | cards/slices especializadas | no duplicar semántica de equipo |
| Finance / Cost Intelligence | señales agregadas, no costos individuales | narrativas ejecutivas más ricas | no exponer margen/costo por persona |
| Hiring / ATS | future handoff/continuity signals | continuidad demanda -> cobertura visible | ATS sigue upstream |
| Identity Access | roles, scopes, permission sets | field-level client visibility | no resolver seguridad solo por route |

---

## Root Model

### Regla principal

`Equipo asignado` **no introduce un root transaccional nuevo**.

Su root arquitectónico es un **composite read object**:

- `ClientWorkforcePortfolio`

Este objeto representa la lectura consolidada del talento comprometido para una organización cliente o uno de sus spaces.

### Anclas canónicas

- `Organization` — cuenta cliente
- `Space` — scope operativo bajo la cuenta
- `client_team_assignments` — compromiso operativo/comercial de capacidad
- `Member / Person` — identidad humana del talento asignado

### Consecuencia

La identidad del módulo se ancla al scope cliente (`organization_id`, `space_id`) y no a una nueva tabla `assigned_teams`.

---

## Canonical Object Graph

### 1. `ClientWorkforcePortfolio`

Objeto compuesto de lectura para un cliente completo.

Responsabilidad:

- resumir cartera activa de talento comprometido
- consolidar FTE contratada, asignada y activa
- exponer mix de seniority, coverage y health
- permitir drilldown a spaces y personas

Anchor:

- `organization_id`

### 2. `SpaceWorkforcePortfolio`

Lens del portfolio a nivel de `space`.

Responsabilidad:

- mostrar cobertura, capacidad y health de un frente operativo específico
- permitir que el cliente grande navegue por cuenta sin perder contexto por frente

Anchor:

- `space_id`

### 3. `AssignedTeamEntry`

Unidad operativa visible dentro del portfolio.

Responsabilidad:

- representar una asignación visible para el cliente
- unir persona, rol, seniority, dedicación, saturación y health signal

Anchor:

- assignment runtime (`client_team_assignments` o equivalente gobernado)

### 4. `AssignedTalentProfile`

Lens cliente-safe de capability por persona asignada.

Responsabilidad:

- skills relevantes
- certificaciones
- idiomas
- highlights verificados
- confidence / visibility status

Anchor:

- `member_id` / `identity_profile_id`

### 5. `AssignedTeamHealthSnapshot`

Snapshot agregado de salud del servicio.

Responsabilidad:

- resumir capacidad, saturación, delivery confidence y coverage risk
- alimentar cards y comparativas temporales

Anchor:

- `organization_id + period`
- `space_id + period` cuando aplique

---

## Data Layers

`Equipo asignado` debe componerse sobre tres capas de datos claramente separadas.

### Layer A — Operational Assignment Layer

Describe **quién está comprometido**, con qué dedicación y en qué scope.

Fuentes canónicas:

- `greenhouse_core.client_team_assignments`
- lanes equivalentes de `staff augmentation` cuando la relación visible para el cliente sea ese placement

Expone:

- member
- role / function visible
- start / end
- contracted FTE del scope
- assignment type
- scope (`organization`, `space`, `lane`)

### Layer B — Capability Profile Layer

Describe **qué sabe hacer** el talento visible y con qué nivel de confianza.

Fuentes canónicas:

- reader de `client-safe verified talent profiles`
- señales de skills, tools, certifications, languages y narrative profesional aprobada

Expone:

- seniority
- skills
- certificaciones
- idiomas
- verification / confidence state
- dossier profesional cliente-safe

### Layer C — Service Health Layer

Describe **qué tan saludable está** la operación y el equipo visible.

Fuentes canónicas:

- `greenhouse_serving.member_capacity_economics`
- serving de delivery/performance aprobado para consumo cliente
- señales agregadas de continuidad y health cuando existan

Expone:

- FTE contratada
- FTE asignada
- FTE activa
- saturación resumida
- capacity coverage
- delivery confidence
- team health

Regla:

- esta capa no debe exponer costo individual, payroll ni señales internas no curadas.

---

## Semantic Contract

### `assigned`

Una persona está `asignada` cuando tiene dedicación activa o comprometida para ese cliente o space.

Incluye:

- full FTE
- partial FTE
- liderazgo o capability support con capacidad comprometida visible
- staff augmentation cuando la relación sea parte del servicio vendido

No incluye por default:

- candidatos
- bench no comprometido
- reemplazos futuros aún no efectivos
- personas históricas fuera de rango activo

### `FTE contracted`

Capacidad comprada o comprometida para el servicio.

### `FTE assigned`

Capacidad nominal comprometida en assignments visibles para el cliente.

### `FTE active`

Capacidad efectivamente vigente en el período actual.

### `saturation`

Señal resumida de carga operativa del talento visible.

Estados mínimos:

- `healthy`
- `high`
- `critical`

Regla:

- el cliente no necesita ver toda la cocina interna de horas cross-account; ve una señal enterprise de riesgo.

### `capability confidence`

Nivel de confiabilidad del capability profile expuesto.

Estados mínimos:

- `verified`
- `self_declared`
- `inferred`
- `unavailable`

### `team health`

Señal agregada que resume:

- coverage
- saturación
- delivery confidence
- continuidad

No es sinónimo de performance individual.

---

## Scope Hierarchy

Para escalar en enterprise, `Equipo asignado` debe soportar navegación jerárquica.

### Nivel 1 — Organization

Vista consolidada del cliente completo.

Uso:

- sponsors
- ejecutivos
- procurement
- QBR

### Nivel 2 — Space

Vista de un frente operativo concreto.

Uso:

- stakeholders de una unidad
- leads operativos del cliente

### Nivel 3 — Lane / Team Cluster

Agrupación opcional para squads, pods, services o capability lanes.

Uso:

- cuentas grandes con varias subestructuras de servicio

### Nivel 4 — Persona asignada

Detalle cliente-safe del talento individual.

Regla:

- el detalle individual nunca debe romper el boundary de datos sensibles.

---

## Exposure Policy

### El cliente sí puede ver

- nombre profesional
- rol y seniority
- dedicación/FTE visible
- skills relevantes
- certificaciones visibles
- idiomas
- señales resumidas de saturación
- señales resumidas de performance y health
- estado de verificación / confianza

### El cliente no puede ver por default

- salario
- costo interno individual
- compensación
- notas privadas
- evaluaciones crudas
- feedback interno textual
- comparativas punitivas persona vs persona
- datos de payroll o leave

### Regla de field policy

Los permisos de `Equipo asignado` no deben resolverse solo a nivel de página. Deben soportar:

- `scope-level visibility`
- `surface-level visibility`
- `field-level visibility`

Esto debe convivir con:

- `client_executive`
- `client_manager`
- `client_specialist`
- futuros permission sets enterprise

---

## Freshness and Temporal Policy

### Near real-time

- assignments
- roster activo
- composición del equipo

### Daily snapshot

- saturación
- capacity coverage
- team health
- performance resumida

### Rolling windows

- trends
- delivery confidence
- stability / continuity

### Regla obligatoria

Toda surface debe exponer:

- `lastUpdatedAt`
- `freshnessKind`
- `window` cuando la señal sea temporal

Ejemplos:

- `Actualizado hoy`
- `Rolling 30 días`
- `Snapshot diario`

---

## UI / UX Architecture

La implementación visual de `Equipo asignado` debe seguir una lógica de `executive summary + operational drilldown`.

No debe verse como:

- tabla admin de empleados
- dashboard de analytics genérico
- perfil HR externo

Debe sentirse como:

- control tower de talento contratado
- roster premium orientado a servicio
- surface ejecutiva lista para conversación con stakeholders enterprise

### UI Brief Normalization

| Dimensión | Decisión |
| --- | --- |
| Surface | cliente-facing |
| Surface type | `client_detail` |
| Page intent | `executive_summary + operational_drilldown` |
| Primary user | `client_executive`, `client_manager` |
| Data shape | `mixed_summary + roster + health_score + capability_inventory` |
| Action density | `light_actions` |
| Repeatability | `shared_product_ui` |

### Primary Pattern Family

La familia principal debe ser:

1. `hero ejecutivo`
2. `KPI strip`
3. `roster inteligente`
4. `detail drawer`
5. `supporting executive cards`

Regla:

- el primer fold no debe ser gobernado por una tabla
- la tabla solo entra como vista alternativa o modo de comparación si el tamaño del dataset lo exige

### Information Architecture

#### 1. Main Module

- `Equipo asignado`
- route cliente primaria o evolución de `/equipo`

Debe resolver:

- roster
- capacidad
- health
- drilldown por space y persona

#### 2. Executive Cards

Cards reusables:

- `Assigned Team`
- `Capacity Coverage`
- `Team Health`
- `Capability Coverage`
- `Delivery Confidence`

Uso:

- Pulse cliente
- Space dashboards
- capability modules
- executive snapshots

#### 3. Person Detail Lens

No es un perfil interno.

Debe combinar:

- dossier cliente-safe
- dedicación visible
- señales resumidas de health/performance
- no debe convertirse en `People` externo

### First Fold Contract

La primera pantalla debe responder en menos de 10 segundos:

1. cuánta capacidad tiene hoy el cliente
2. qué tan saludable está el equipo
3. si existe riesgo o cobertura incompleta
4. quién compone ese equipo

#### Hero block

El bloque dominante debe reutilizar el espíritu de `ExecutiveHeroCard`, pero especializado para `Assigned Team`.

Contenido:

- título: `Equipo asignado`
- subtítulo operacional breve
- selector de scope:
  - `Cliente completo`
  - `Space`
  - futuro `Lane / Squad`
- supporting stats visibles sin scroll

El hero no debe parecer marketing ni landing.

### Desktop Layout

#### Banda superior

- hero dominante a la izquierda
- scope switcher y freshness metadata a la derecha o en la banda superior

#### KPI strip

Debajo del hero:

- `Talento activo`
- `FTE activa`
- `Capacidad cubierta`
- `Seniority mix`
- `Delivery Confidence`
- `Señales de riesgo`

#### Main body

Layout recomendado en desktop:

- columna principal ancha:
  - roster del equipo
- columna secundaria:
  - `Team Health`
  - `Capability Coverage`
  - `Attention Needed` / risks

Regla:

- el roster es el bloque dominante del cuerpo
- las cards de supporting signal no deben competir visualmente con el hero

### Mobile and Tablet Layout

- hero simplificado primero
- KPI strip scrolleable o 2x2 compacto
- roster inmediatamente después
- cards de health y capability debajo

Regla:

- nunca esconder la composición del equipo detrás de tabs profundas en móvil
- los filtros deben colapsar a un drawer o sheet compacto

### Roster Pattern

El roster principal no debe arrancar como `table_surface` clásica.

Patrón recomendado:

- `list-detail hybrid`

Cada row/card debe mostrar:

- avatar
- nombre profesional
- rol
- seniority
- FTE visible
- saturación resumida
- performance signal
- top skills
- cert/lang badges
- verification/confidence state

Interacción principal:

- click en row/card -> abre `detail drawer`

Regla:

- la comparación debe ser fácil
- pero la identidad humana no debe perderse dentro de columnas rígidas

### Person Detail Drawer

El detalle ideal para v1 es un `side drawer` o panel lateral, no una page-jump inmediata.

Orden recomendado:

1. identidad profesional
2. capability snapshot
3. delivery & capacity snapshot
4. highlights y señales de confianza

El drawer debe sentirse como un `client-safe talent dossier`.

No debe incluir:

- payroll
- datos privados
- tabs excesivas
- navegación pseudo-admin

### Shared Component Strategy

#### Reusar y priorizar

Primitives locales o familias a priorizar:

- `ExecutiveHeroCard`
- `ExecutiveMiniStatCard`
- `ExecutiveCardShell`
- familia `support-tracker` como referencia para `Team Health`
- familia `sales-by-countries` / `source-visits` para executive lists compactas
- `user-details` como referencia compositiva del detail shell, no para copiar semántica

#### Nuevas primitives recomendadas

Si el módulo se implementa, las nuevas primitives shared deberían vivir conceptualmente en `src/components/greenhouse/*`:

- `AssignedTeamHeroCard`
- `AssignedTeamScopeSwitcher`
- `AssignedTeamStatCard`
- `AssignedTalentList`
- `AssignedTalentRowCard`
- `AssignedTalentDetailDrawer`
- `TeamHealthCard`
- `CapabilityCoverageCard`
- `CapacityCoverageBar`
- `FreshnessChip`
- `SignalBadge`
- `VerificationConfidenceStack`

#### Route-local composition

La composición específica del módulo debe quedarse en `src/views/greenhouse/*`.

Regla:

- shared para primitives repetibles
- route-local para wiring, filtros, densidad y composición del caso de negocio

### Reusable UI Component Model

No todos los componentes visuales de `Equipo asignado` deben promoverse a `shared`.

La regla canónica es:

- promover a `shared` solo cuando el contrato visual sea estable
- promover a `shared` cuando el componente tenga valor cross-module real
- mantener `module-local` cualquier composición demasiado específica del dominio hasta comprobar repetición

#### Tier 1 — Shared primitives

Estos sí deben pensarse como primitives reusables desde el inicio.

##### `SignalBadge`

Uso:

- health states
- verification states
- warning / attention / optimal states

Consumers probables:

- `Equipo asignado`
- `Space 360`
- `People`
- `Talent profiles`
- `Hiring / ATS`
- `Staff Augmentation`

Razón para promoverlo:

- semáforos y señales aparecen en casi todo Greenhouse
- evita que cada módulo reinvente chips de estado incompatibles

##### `FreshnessChip`

Uso:

- `Actualizado hoy`
- `Rolling 30 días`
- `Snapshot diario`

Consumers probables:

- dashboards cliente
- `Space 360`
- analytics
- health cards
- quality / risk surfaces

Razón para promoverlo:

- la plataforma necesita exponer freshness de manera consistente

##### `CapacityCoverageBar`

Uso:

- `FTE contratada`
- `FTE asignada`
- `FTE activa`
- coverage %

Consumers probables:

- `Equipo asignado`
- `Staff Augmentation`
- `Agency`
- `Space 360`
- futuros módulos de capacity planning

Razón para promoverlo:

- la semántica de coverage/capacity cruza varios módulos

##### `VerificationConfidenceStack`

Uso:

- skills verificadas
- certificaciones visibles
- idiomas
- confidence state

Consumers probables:

- perfiles client-safe
- `People`
- `Assigned Team` detail
- `Hiring / ATS`
- bench / talent dossier

Razón para promoverlo:

- confianza de talento ya es capability transversal del ecosistema

##### `ScopeSwitcher`

Uso:

- `Cliente completo`
- `Space`
- `Lane`
- `Squad`

Consumers probables:

- `Equipo asignado`
- `Space 360`
- capability modules
- dashboards multi-scope

Razón para promoverlo:

- la navegación jerárquica por scope se repetirá en otras surfaces enterprise

#### Tier 2 — Shared building blocks

Estos componentes ya no son átomos, pero siguen teniendo reuso real cross-surface.

##### `AssignedTeamStatCard`

Base recomendada:

- evolución de `ExecutiveMiniStatCard`

Debe soportar:

- valor principal
- subtítulo
- delta opcional
- estado
- freshness
- counter animado opcional

Consumers probables:

- `Equipo asignado`
- `Pulse`
- `Space 360`
- snapshots ejecutivos

##### `TeamHealthCard`

Uso:

- semáforo de salud
- breakdown corto
- CTA contextual

Consumers probables:

- `Equipo asignado`
- `Space 360`
- `Agency`
- QBR snapshots

##### `CapabilityCoverageCard`

Uso:

- skills coverage
- cert coverage
- language coverage
- gaps visibles

Consumers probables:

- `Equipo asignado`
- `Staff Augmentation`
- `Hiring / ATS`
- talent intelligence

##### `AttentionListCard`

Uso:

- riesgos
- coverage gaps
- saturación crítica
- certs por renovar

Consumers probables:

- `Equipo asignado`
- `Pulse`
- `Space 360`
- Admin / Ops Health

##### `EntityDetailDrawer`

Uso:

- shell reusable de detalle lateral

Especializaciones futuras:

- `AssignedTalentDetailDrawer`
- `TalentProfileDrawer`
- `HiringApplicationDrawer`
- `PlacementDetailDrawer`

Razón para promoverlo:

- el patrón de drawer contextual con summary + sections sí puede repetirse aunque el contenido cambie

#### Tier 3 — Module-local composites

Estos no deberían nacer como `shared`.

##### `AssignedTeamHeroCard`

Estado recomendado:

- `module-local` en primera iteración

Razón:

- aunque reutiliza primitives ejecutivas, su semántica todavía es demasiado específica del módulo

##### `AssignedTalentRowCard`

Estado recomendado:

- `module-local`

Razón:

- la mezcla exacta de FTE, saturation, performance, skills y confidence es propia de `Equipo asignado`

##### `AssignedTalentList`

Estado recomendado:

- `module-local`

Razón:

- la lógica de filtros, densidad y comparación debe madurar antes de promoverse

##### `AssignedTalentDetailDrawer`

Estado recomendado:

- `module-local` sobre `EntityDetailDrawer`

Razón:

- el shell sí puede ser reusable, pero el dossier cliente-safe específico debe quedarse atado al dominio

### Promotion Rules

Un componente de este módulo solo debe subir a `shared` si cumple al menos una de estas condiciones:

1. aparece en tres o más surfaces reales
2. su contrato visual ya es estable
3. no depende de una semántica exclusiva de `Equipo asignado`

Si no cumple eso, debe quedarse local.

### Initial Consumer Map

El catálogo reusable de esta arquitectura debería servir, como mínimo, para:

- `Pulse`
- `Space 360`
- `Equipo asignado`
- `Staff Augmentation`
- `People`
- `Talent client-safe profiles`
- `Hiring / ATS`
- snapshots ejecutivos / QBR

### Motion and Micro-Interactions

La motion layer debe ser sobria y útil.

#### Motion recomendada

- `AnimatedCounter` en KPIs del first fold
- transición suave al cambiar de scope
- apertura/cierre del drawer con motion corta
- hover/focus states claros en filas del roster
- animación leve en barras de coverage
- skeletons estables para loading

#### Motion no recomendada

- Lottie decorativo en la vista principal
- charts con animación ruidosa
- counters en todos los números
- efectos demo-style de dashboards genéricos

#### Reduced motion

Obligatorio:

- counters degradan a valor final estático
- las señales siguen siendo comprensibles sin animación
- la motion nunca puede ser la única portadora de significado

### UX Writing Contract

El tono debe ser:

- sobrio
- enterprise
- operativo
- honesto sobre la calidad de la data

#### Títulos preferidos

- `Equipo asignado`
- `Capacidad cubierta`
- `Salud del equipo`
- `Cobertura de capacidades`
- `Talento con atención`

#### CTAs preferidos

- `Ver detalle`
- `Ver perfiles`
- `Filtrar equipo`
- `Cambiar scope`
- `Solicitar cobertura`
- `Solicitar reemplazo`

Evitar:

- `Explorar`
- `Conocer más`
- `Continuar`

### States

#### Loading

- hero skeleton
- KPI strip skeleton
- roster skeleton de 5 a 6 rows
- sin saltos fuertes de layout

#### Empty

Caso:

- no hay equipo activo en el scope

La copy debe:

- explicar qué falta
- decir cuándo aparecerá información
- ofrecer siguiente paso

#### Partial

Casos:

- capability data incompleta
- performance snapshot desactualizado
- verification coverage parcial

Regla:

- la UI debe explicitar qué parte sí está disponible y cuál sigue incompleta

#### Warning

Casos esperados:

- cobertura incompleta
- saturación alta
- certs por renovar
- freshness vencida

#### Error

Debe ser breve, transparente y accionable.

### Accessibility Contract

No negociar:

- no depender solo del color para `healthy / high / critical`
- chips y barras con label textual
- headings claros
- drawer navegable por teclado
- tooltips nunca como única fuente de información
- comparaciones legibles incluso en densidad alta
- focus visible en filters, rows y actions

### Surface Anti-Patterns

Evitar:

- una tabla full-width como primer fold
- mosaico de cards todas con el mismo peso
- charts antes de explicar quién compone el equipo
- detail con demasiadas tabs
- semáforos sin labels
- portar una demo Vuexy completa de analytics

---

## KPI Contract

### Composition KPIs

- active assigned talent count
- seniority mix
- capability mix
- verified profile coverage

### Capacity KPIs

- FTE contracted
- FTE assigned
- FTE active
- capacity coverage %

### Health KPIs

- saturation distribution
- team health state
- continuity / stability signal
- critical coverage risk count

### Quality / Delivery KPIs

- delivery confidence
- quality signal
- reliability signal

Regla:

- los KPIs deben ser agregables por organization y por space
- deben ser explicables; no lanzar scores mágicos sin semántica

---

## Enterprise Scale Requirements

`Equipo asignado` debe diseñarse para:

- clientes con múltiples spaces
- 50+ colaboradores visibles
- múltiples stakeholders con permisos distintos
- snapshots históricos
- reuso en cards, tablas, details y exports
- configuración por cliente cuando el contrato lo requiera

### Requirements

- filtros por `space`, `seniority`, `capability`, `language`, `health`
- agrupación por `space`, `service lane`, `role family`
- export-friendly summary shapes
- widgets consumibles sin recomputar lógica por surface

---

## Anti-Patterns

No hacer:

- una tabla cliente que reimplemente People
- una vista que mezcle `Org Chart` con assignments
- un reader que exponga datos sensibles porque “el cliente ya ve a la persona”
- una card que recalcule FTE o health localmente sin semantic layer shared
- un nuevo root mutante `assigned_team_members`
- un módulo que dependa de ATS para responder roster actual

---

## V1 / V2 Boundary

### V1

- portfolio por organization y por space
- roster asignado
- FTE contracted / assigned / active
- seniority mix
- skills / certifications / languages cliente-safe
- saturation signal resumida
- team health resumida
- delivery confidence resumida
- freshness + confidence metadata

### V2

- timeline de cambios
- replacement / continuity risk
- backup coverage
- skill gap analysis contra scope contratado
- requests cliente (`more capacity`, `replacement`, `coverage review`)
- snapshots históricos más ricos

---

## Canonical Rules

1. `Equipo asignado` es una capability enterprise cliente-facing, no una vista aislada.
2. El root operativo sigue siendo `Organization / Space + assignments`; no crear una identidad transaccional paralela.
3. Los perfiles expuestos deben ser siempre `client-safe`.
4. Capacidad y saturación son conceptos distintos y deben mostrarse como tales.
5. Performance visible al cliente debe estar resumida y curada, nunca exponer telemetría interna cruda por accidente.
6. Las cards multi-superficie deben consumir una misma semantic layer.
7. `Equipo asignado` no debe absorber ATS, HR, Payroll ni Staff Aug admin.
8. La navegación cliente debe soportar lectura consolidada por organización y drilldown por space.
9. Todo KPI visible debe traer freshness y confidence explícitos.
10. El módulo debe quedar preparado para permissioning enterprise por campo y por scope.

---

## Related Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/tasks/complete/TASK-318-client-safe-verified-talent-profiles.md`
- `docs/tasks/to-do/TASK-285-client-role-differentiation.md`

---

## Next Step

El siguiente paso natural es bajar esta arquitectura a un bloque de tasks de implementación para:

- semantic layer / readers
- executive cards
- main module runtime
- field-level client visibility
- health/risk signals
