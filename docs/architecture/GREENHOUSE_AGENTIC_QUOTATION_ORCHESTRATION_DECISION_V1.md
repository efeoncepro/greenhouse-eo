# GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1

## Metadata

- **Status:** Proposed — no runtime changes or autonomous quote issuance authorized
- **Date:** 2026-08-02
- **Owner:** Finance + Commercial/Product + Architecture
- **Scope:** Greenhouse quotation runtime, cost basis, service composition, unknown-profile costing, Nexa/API/MCP and future agent consumers
- **Reversibility:** two-way-but-slow
- **Confidence:** medium
- **Validated as of:** 2026-08-02
- **Related:** [live cost basis and unobserved profiles](../audits/finance/GREENHOUSE_LIVE_COST_BASIS_AND_UNOBSERVED_PROFILE_PRICING_2026-08-02.md), [costing methods deep review](../audits/finance/GREENHOUSE_COSTING_METHODS_DEEP_REVIEW_2026-08-02.md)

## Context

Efeonce necesita que una sesión de Codex, Claude, Agentica o cualquier otro consumidor autorizado pueda responder a solicitudes como:

- “cotiza un diseñador”;
- “cotiza un servicio de diseño digital con personas y herramientas”;
- “cotiza un servicio SEO con entregables, procesos y horas”;
- “cotiza un perfil que nunca hemos contratado”.

El cotizador existente ya tiene un motor determinista, catálogo, recetas, FX, márgenes, versionado y persistencia. Ese motor funciona bien cuando la entrada ya está estructurada. No resuelve por sí solo el problema abierto de interpretar lenguaje natural, descubrir alcance, clasificar un perfil nuevo, elegir un proxy, identificar costos faltantes o decidir cuándo debe pedir aclaraciones.

Al mismo tiempo, delegar el cálculo económico al modelo sería incorrecto: una respuesta plausible puede usar una herramienta equivocada, mezclar costo real con costo modelado, ignorar una vigencia, aplicar un markup como si fuera margen o emitir un precio sin provenance.

El problema, por tanto, no es elegir entre agente o determinismo. Es separar responsabilidades.

## Decision

Greenhouse adoptará como dirección propuesta un:

> **Agentic Quote Orchestrator + Deterministic Cost/Pricing Kernel.**

El agente será responsable de interpretar, investigar, descomponer, preguntar, proponer y explicar. El kernel determinista será responsable de calcular, validar, aplicar políticas, congelar snapshots y persistir efectos.

```text
Solicitud humana o de otro agente
        ↓
Agentic Quote Orchestrator
  intake · clarificación · retrieval · profile resolution
  service decomposition · scenario proposal · explanation
        ↓ structured contracts
Deterministic Cost/Pricing Kernel
  cost basis · units · effective dates · FX · margins
  floor checks · confidence gates · replay · snapshots
        ↓
Cost card + approval decision + quotation version
        ↓
Quote/API/MCP/Nexa consumers
```

Esta decisión es una dirección arquitectónica propuesta. No autoriza todavía autonomía de emisión, cambios de schema, nuevas tools MCP, escritura directa del agente ni modificación del pricing engine.

## Responsibilities

### Agentic Quote Orchestrator

Puede:

- interpretar la solicitud y producir un `QuoteIntent` estructurado;
- detectar información faltante y formular las preguntas mínimas necesarias;
- identificar oferta, delivery model, engagement, moneda, geografía y alcance;
- descomponer un servicio en work packages, actividades, roles, herramientas, direct costs, rights y pass-through;
- resolver un perfil contra `member_actual`, `role_blended`, `role_modeled` o un proxy explícito;
- buscar evidencia en readers gobernados y fuentes externas permitidas, conservando fuente y fecha;
- producir escenarios low/base/high o percentiles solo cuando exista evidencia suficiente;
- proponer un `ServicePlan` y una `PricingRequest` estructurados;
- explicar supuestos, confianza, exclusiones y blockers;
- preparar un draft de cotización sujeto a las reglas de aprobación.

No puede:

- inventar costo, margen, FX, disponibilidad, derechos o una tarifa de mercado;
- convertir una inferencia en un hecho canónico;
- escribir directamente en tablas de costos, cotizaciones o contabilidad;
- saltarse el piso de margen o la aprobación requerida;
- enviar una cotización client-facing solo porque el modelo produjo una respuesta convincente;
- cambiar el costo de una cotización emitida o un periodo cerrado;
- usar créditos de Globe, precio comercial o saldo como sustituto de costo técnico;
- tratar un proxy como equivalente exacto sin declararlo.

### Deterministic Cost/Pricing Kernel

Debe conservar el ownership de:

- readers de `member_actual`, `role_blended`, `role_modeled`, tools, providers, overhead y Globe;
- vigencias `effective_from/effective_to`;
- unidades y bases de cantidad;
- distinction entre `standard`, `actual` y `forecast`;
- vistas `contribution` y `fully_loaded`;
- FX según la política del dominio;
- fórmula de margen y diferencia entre margen y markup;
- margin target/floor y approval policy;
- coverage, freshness, confidence y fallback;
- replay de una cotización;
- versionado, snapshot y audit trail;
- persistencia mediante commands canónicos y API parity.

El modelo puede recomendar una política o un plan, pero el kernel es el único que decide si los datos cumplen el contrato para calcular y si el efecto está autorizado.

## Canonical contracts

El contrato intermedio debe ser tipado y versionado. Como mínimo:

```text
QuoteIntent
  request_id
  actor / tenant / organization
  user_language
  offer_or_service_hint
  requested_profiles
  requested_outcomes
  scope / deliverables / cadence
  geography / currency / dates
  known_constraints
  missing_information
```

```text
ProfileResolution
  requested_profile
  profile_archetype
  resolved_kind: member_actual | role_blended | role_modeled | role_proxy | manual_pending
  role_id / role_sku nullable
  proxy_role nullable
  skills / seniority / geography / employment_type
  evidence_refs
  source_dates
  assumptions
  confidence
  approval_required
```

```text
ServicePlan
  service_or_offer
  recipe_version
  work_packages
  deliverables
  role_or_profile_lines
  tool_lines
  provider_usage
  direct_cost_lines
  rights_and_pass_through
  QA / coordination / rework / reserve
  exclusions
  confidence
```

```text
PricingRequest
  quote_date
  output_currency
  cost_views: contribution | fully_loaded | both
  measurement: standard | actual | forecast
  lines
  source_refs
  requested_scenarios
  approval_context
```

```text
CostCard
  cost_basis_by_line
  unit_and_quantity_basis
  contribution_cost
  fully_loaded_cost
  margin_floor / margin_target
  recommended_price
  scenario_range
  FX_snapshot
  source_refs / snapshot_dates
  coverage / freshness / confidence
  assumptions / exclusions
  warnings / blockers
  override_and_approval_state
```

El agente solo puede pasar al kernel objetos que validen schema. El kernel devuelve una salida estructurada; la explicación visible se genera a partir de esa salida, no de cálculos paralelos en el modelo.

## Runtime state machine

La ejecución debe ser durable, aunque el agente elija el siguiente paso dentro de un conjunto permitido:

```text
accepted
  → planning
  → awaiting_clarification
  → awaiting_evidence
  → ready_for_pricing
  → pricing
  → awaiting_approval
  → draft_created
  → issued | blocked | cancelled
  → reforecast | superseded
```

Cada checkpoint debe conservar:

- `run_id` y `request_id`;
- versión de prompt, modelo, tools, policy y schemas;
- actor humano y workload del agente;
- inputs estructurados;
- source refs y timestamps;
- estado, efectos completados y pending effect;
- idempotency keys;
- presupuestos y límites consumidos;
- decisión de policy y aprobación;
- resultado terminal.

No se debe persistir razonamiento privado del modelo. Se persisten hechos observables, supuestos, decisiones de policy, tool calls sanitizadas y resultados.

## Identity and cross-agent contract

Codex, Claude, Agentica, Nexa y cualquier consumidor externo autorizado deben usar el mismo contrato y el mismo kernel:

```text
agent / host
  → API command o MCP adapter
  → canonical Greenhouse readers/commands
  → deterministic pricing kernel
  → quotation snapshot
```

El agente no recibe credenciales de base de datos ni secretos de otros dominios. La identidad del usuario, la identidad del workload, el grant delegado y la identidad del provider permanecen separadas.

MCP, si se utiliza, debe ser un adapter neutral sobre readers y commands canónicos. No debe convertirse en otro motor de pricing ni en otra política de autorización.

## Autonomy policy

La autonomía se gradúa por evidencia:

| Tier | Capacidad | Efecto permitido |
|---|---|---|
| Observe | leer catálogo, costos y contratos | ninguno |
| Recommend | producir plan y cost card | ninguno |
| Propose | preparar draft/version | persistencia limitada y auditable |
| Execute bounded | crear draft o versión con command autorizado | nunca emitir client-facing sin aprobación explícita |
| Autonomous | no autorizado por esta decisión | requiere ADR aceptado, evals y aprobación ejecutiva |

El caso normal para el primer rollout es `Recommend` y luego `Propose`. La emisión, envío, aprobación comercial o cambio de contrato permanecen humanos y con maker-checker cuando corresponda.

## Deterministic guardrails

El runtime debe fallar cerrado cuando:

- falta un costo crítico;
- la unidad del costo no está definida;
- el snapshot está stale o unresolved por encima del umbral;
- la cotización cae bajo el margin floor;
- la fuente es solo una inferencia no aprobada;
- el perfil nuevo no tiene proxy ni evidencia mínima;
- la cotización mezcla standard con actual sin declararlo;
- una tool total se intenta usar como costo unitario;
- falta FX válido para la moneda de salida;
- el actor no tiene capacidad de aprobación;
- el quote o periodo está cerrado;
- se detecta un intento de duplicar un efecto.

El agente puede solicitar una excepción, pero no concedérsela a sí mismo.

## Evaluation and promotion gates

Antes de habilitar cualquier escritura o autonomía, debe existir un golden set que cubra:

- diseñador, community y content creator con actuals;
- servicio compuesto con roles y tools;
- servicio SEO con recipe explícita;
- perfil no observado con proxy;
- perfil no observado sin proxy;
- direct cost, rights, pass-through y provider usage;
- cambios de sueldo, licencia, FX y vigencia;
- cotización bajo floor;
- datos stale o faltantes;
- solicitud ambigua o fuera de catálogo;
- intento de emitir una cotización sin aprobación.

Las métricas mínimas son:

- exactitud matemática del kernel: 100% contra casos esperados;
- provenance completa en todas las líneas emitibles;
- cero emisión por debajo de floor sin aprobación explícita;
- cero asignaciones silenciosas de perfil nuevo a un rol incorrecto;
- tasa de preguntas aclaratorias útiles y falsos bloqueos;
- concordancia de resultados entre agentes para el mismo `QuoteIntent`;
- costo por cotización aceptada, incluyendo retries, retrieval y revisión humana;
- tasa de overrides y variance posterior contra actual.

La evidencia debe versionar modelo, prompt, tools, policy, corpus, snapshots y población de evaluación. Un cambio material en cualquiera de ellos invalida la promoción anterior.

## Alternatives considered

### Pure deterministic quotation

Se rechaza como solución completa. Es excelente para aritmética y replay, pero no resuelve lenguaje abierto, composición, perfiles desconocidos ni preguntas faltantes sin construir manualmente toda la taxonomía.

### Pure LLM quotation

Se rechaza. No ofrece por sí solo reproducibilidad, control de vigencias, seguridad, provenance, consistencia de margen ni protección contra alucinaciones económicas.

### Multi-agent swarm from the beginning

Se rechaza para V1. Aumenta fan-out, costo, latencia, superficie de fallo y dificultad de evaluación. El primer sistema debe tener un orquestador agentic con herramientas y límites claros; se agregarán agentes independientes solo cuando exista ownership, confianza o ciclo de vida realmente distinto.

### Agentic orchestration over existing kernel

Es la alternativa elegida. Reutiliza el pricing module existente, permite cotizar solicitudes abiertas y conserva el control financiero en primitives deterministas.

## Consequences

### Beneficios

- todos los agentes pueden cotizar usando la misma economía;
- el usuario puede describir necesidades en lenguaje natural;
- perfiles nuevos se manejan como hipótesis explícitas;
- las cifras siguen siendo reproducibles y auditables;
- el sistema puede aprender de contratación y ejecución real;
- se mantiene la separación entre costo, precio, revenue y contrato.

### Costos y riesgos

- hay que construir y evaluar el orquestador;
- retrieval incorrecto puede producir un plan incorrecto aunque el kernel calcule bien;
- preguntas excesivas degradan la experiencia;
- herramientas externas y benchmarks introducen stale data y costo;
- una explicación convincente puede ocultar una baja confianza si la UI no la muestra;
- observabilidad y revisión humana tienen costo operativo.

## Implementation boundary

Esta propuesta no autoriza todavía:

- modificar `pricing-engine-v2`;
- crear nuevas tablas o migraciones;
- crear una tool MCP de cotización;
- emitir o enviar cotizaciones automáticamente;
- crear SKUs o roles permanentes desde un prompt;
- usar benchmarks externos sin fuente y fecha;
- cambiar la política de márgenes;
- exponer costos internos a perfiles no autorizados.

El primer trabajo autorizado después de aceptar el ADR debería ser un slice read-only/recommendation:

1. `QuoteIntent` estructurado;
2. resolución de perfil y evidencia;
3. `ServicePlan`;
4. llamada al kernel actual;
5. `CostCard` con confidence y blockers;
6. golden set y comparación contra casos deterministas;
7. sin escritura ni emisión client-facing.

## Revisit when

Reabrir esta decisión si ocurre cualquiera de estos eventos:

- el kernel deja de ser único para Nexa, API, MCP o UI;
- se propone autonomía de emisión o aprobación;
- el costo por cotización supera el valor de la oportunidad;
- la tasa de overrides o variance muestra que el agente degrada la economía;
- cambia materialmente el contrato de identidad, MCP o multi-tenancy;
- el modelo debe contratar providers o terceros directamente;
- se decide que Greenhouse será owner de un GL legal;
- aparecen incidentes de acceso, filtración, emisión incorrecta o pricing no autorizado.

## Handoff

La aceptación de este ADR debe preceder cualquier task de implementación. Después de aceptación, el trabajo se divide como mínimo en:

- Architecture: contratos, state machine, identity y boundaries;
- Finance: cost basis, margin, confidence, close y actual-vs-standard;
- Product/Commercial: intake, questions, approval y quote UX;
- Agent/Nexa: orchestration, retrieval, tool routing y evidence;
- QA/Assurance: golden set, guardrails, replay, adversarial tests y promotion gates;
- API/MCP: parity para todos los agentes consumidores.
