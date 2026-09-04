# GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1

## Metadata

- **Status:** Proposed — no runtime changes or autonomous quote issuance authorized
- **Date:** 2026-08-02
- **Owner:** Finance + Commercial/Product + Architecture
- **Scope:** Greenhouse quotation runtime, cost basis, service composition, unknown-profile costing, Nexa/API/MCP and future agent consumers
- **Reversibility:** two-way-but-slow
- **Confidence:** medium
- **Validated as of:** 2026-08-02
- **Related:** [Finance Core accounting foundation — ADR-021](GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1.md), [live cost basis and unobserved profiles](../audits/finance/GREENHOUSE_LIVE_COST_BASIS_AND_UNOBSERVED_PROFILE_PRICING_2026-08-02.md), [costing methods deep review](../audits/finance/GREENHOUSE_COSTING_METHODS_DEEP_REVIEW_2026-08-02.md), [Tender Proposal Studio](GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)

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

### Dependencia sobre Finance Core y Cost Subledger

El orquestador no debe crear su propia base de costos. `ADR-021` gobierna el orden:

```text
Finance Core accounting-ready
  → Live Cost Subledger
  → Agentic quotation recommendation
  → Proposal economic package / governed writes / Q2C
```

El primer slice de Finance Core debe ser deliberadamente delgado: plan de cuentas, entidad/ledger, períodos,
money/FX, dimensiones, `EconomicEvent` y `JournalCandidate`, sin posting real. Sobre él nace el Cost Subledger con
actual/standard/modeled/forecast, vigencias, invalidación y snapshots. Solo entonces el agente puede recomendar una
cotización usando una base viva y reconciliable con la futura contabilidad general.

Esto no obliga a terminar el libro mayor antes de cotizar. Obliga a que los hechos de costos nazcan con las claves,
semántica y provenance necesarias para que General Accounting los consuma después sin una migración conceptual.

### Límite headless y madurez actual

El cotizador objetivo es **headless**: la interpretación, el cálculo, las políticas, el versionado y la
persistencia viven detrás de contratos programáticos y no dependen de una pantalla específica. Portal,
Proposal Studio, Nexa, Codex, Claude, Agentica y futuros adapters API/MCP son consumidores del mismo
kernel; ninguno puede convertirse en una segunda fuente de cálculo.

Headless **no** significa anónimo, sin estado ni autónomo. Cada consumidor sigue sujeto a identidad de
usuario y workload, tenant, capabilities, idempotencia, aprobación, auditoría y separación entre draft,
emisión y envío.

La madurez verificada al 2026-08-02 es:

| Plano | Estado real | Consecuencia |
|---|---|---|
| Kernel determinista `pricing-engine-v2` | Operativo | UI y consumers programáticos pueden reutilizar el mismo cálculo. |
| Simulación y authoring first-party por API Platform/HTTP | Operativo | Greenhouse puede calcular y crear drafts/versiones mediante commands canónicos y sesión autorizada. |
| Consumer de ecosistema | Operativo en lectura/simulación | No autoriza writes externos ni expone el cost stack completo. |
| MCP local de Greenhouse | Operativo en `search_services` + `quote_price`, read-only | Sirve consumers autenticados del runtime Greenhouse; no equivale al gateway federado público. |
| Gateway federado `mcp.efeonce.org` | Operativo sin provider de cotizaciones | Requiere un provider read/recommend delgado; acceso B2B externo además espera un token con grants: el grant por organización/persona ya existe (`TASK-1631`, 2026-09-04); emisor propio y gateway multi-issuer en EPIC-044 (`TASK-1829`/`TASK-1831`/`TASK-1832`) (actualizado 2026-09-04, TASK-1631). |
| Interpretación agentic `QuoteIntent → ServicePlan → CostCard` | Propuesto | Todavía no existe el orquestador completo ni su golden set de promoción. |
| Writes de agentes externos o tools MCP de cotización | No implementados ni autorizados | Requieren contracts, grants, evals y aprobación posteriores. |
| Emisión o envío autónomo client-facing | No autorizado | Continúa bajo confirmación humana y policy comercial. |

Por tanto, Greenhouse ya es **headless-capable y parcialmente headless-operativo**, pero todavía no es una
plataforma de cotización agentic headless completa.

El provider MCP federado futuro no puede vivir dentro del gateway como lógica de negocio. Debe adaptar API Platform
y `TASK-609`, aplicar redaction/capabilities y devolver read/recommend. El gateway conserva transporte, OAuth y
federación; Finance/Commercial conservan datos, policy y cálculo.

### Moneda de cotización y unidades indexadas

La moneda no se puede inferir únicamente desde el país del cliente ni tratarse como un atributo global de la cotización. El contrato debe conservar, como mínimo, estos planos:

| Plano | Significado | Regla para cotizar |
|---|---|---|
| `native` / `contract` | Moneda en la que se expresa el contrato, la solicitud comercial o el costo fuente | Se preserva siempre junto con el monto original. |
| `cost_basis` | Moneda de cada sueldo, proveedor, herramienta, licencia o pass-through | Puede diferir de la moneda de salida; se conserva por línea. |
| `output` / `presentation` | Moneda que verá el cliente en la cotización | USD es la presentación comercial predeterminada cuando no existe una exigencia local o contractual explícita. |
| `functional` | Moneda operativa/contable de Efeonce | La arquitectura financiera vigente define CLP como plano funcional chileno. |
| `settlement` | Moneda que efectivamente se cobra o paga y cuenta bancaria utilizada | Debe registrar el movimiento real; no se deduce silenciosamente desde la moneda de presentación. |
| `reporting` | Moneda de consolidación y análisis | El objetivo financiero define CLP y USD, pero el runtime actual de reporting/analytics todavía está normalizado a CLP. |

Reglas vinculantes:

- Si el cliente o contrato exige moneda local y esa moneda está soportada y lista, el agente debe cotizar en ella.
- Si no existe exigencia local, el agente debe proponer USD como salida comercial por defecto, sin borrar la moneda nativa de costos o contrato.
- En Chile, la salida puede ser `CLP` o `CLF`/UF. `CLF`/UF es una unidad indexada, no dinero de liquidación: una cotización en UF debe declarar su equivalente y liquidar en CLP según la política aprobada.
- En otros países, la moneda local solo puede ofrecerse si está declarada en la matriz de dominio, tiene cobertura y tiene un FX listo. Greenhouse no admite hoy “cualquier moneda local” por inferencia geográfica.
- Una moneda declarada pero manual-only o temporalmente unavailable no se convierte silenciosamente a otra. El resultado debe quedar `blocked`/`manual_pending` o presentar USD como alternativa explícita y aprobable.
- Toda conversión debe conservar `fx_snapshot_id`, fecha, fuente, política y composición. Una cotización enviada no se recalcula retroactivamente porque cambió el FX.
- El agente debe explicar por qué eligió la moneda de salida y distinguir moneda contractual, moneda de presentación y moneda de liquidación.

Esto significa que la intención “principalmente USD, pero CLP/UF en Chile y USD o moneda local en otros mercados” está contemplada como política, pero no implica que todas las monedas locales estén operativamente habilitadas hoy.

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
  geography / currency_preferences / contract_currency
  settlement_preferences / dates
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
  native_currency / contract_currency
  output_currency / presentation_currency
  cost_basis_currency_by_line
  functional_currency
  settlement_currency
  reporting_currency
  indexed_unit nullable: CLF | UF
  currency_selection_reason
  fx_policy / fx_snapshot_requirements
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
  FX_snapshot_by_conversion
  native_amounts_preserved
  functional_equivalent
  reporting_equivalent
  settlement_plan
  source_refs / snapshot_dates
  currency_readiness / coverage / freshness / confidence
  assumptions / exclusions
  warnings / blockers
  override_and_approval_state
```

El agente solo puede pasar al kernel objetos que validen schema. El kernel devuelve una salida estructurada; la explicación visible se genera a partir de esa salida, no de cálculos paralelos en el modelo.

## Proposal Studio: composición opcional y frontera económica

Una `Proposal` no equivale a un paquete fijo “técnica + económica”. Es el contenedor gobernado de un
proceso comercial y sus entregables. Debe separar dos dimensiones que hoy tienden a mezclarse:

1. **Contenido lógico:** técnico, económico y administrativo.
2. **Artefacto físico:** deck, PDF, Excel, cotización formal, anexo o superficie web.

Separar el contenido técnico del económico en fuente, permisos y aprobación **no obliga** a publicarlos
siempre en documentos distintos. La composición depende del requisito del comprador o de la etapa:

| Modo | Salida client-facing | Condición económica interna |
|---|---|---|
| Técnica sola | Propuesta/deck técnico sin precio | Debe existir evaluación interna de viabilidad cuando la oportunidad consume capacidad; no exige una cotización client-facing si todavía no hay compromiso comercial. |
| Económica sola | Cotización, planilla, PDF o deck económico | Requiere una `QuotationVersion` aprobable y sus condiciones comerciales. |
| Técnica y económica separadas | Dos o más artefactos coordinados | Todos derivan de la misma versión económica congelada. |
| Combinada | Un artefacto técnico con módulo económico embebido, como SKY | El módulo económico es una proyección sanitizada de la misma cotización; nunca una tabla recalculada o transcrita. |
| Administrativa/técnica con precio posterior | Entregables no económicos en la fase actual | Conserva `commercial_commitment=none` hasta que una fase posterior requiera precio indicativo o vinculante. |

El contrato objetivo distingue cuatro objetos:

```text
ProposalDeliverablePlan
  proposal_id / phase
  content_modules: technical[] | economic[] | administrative[]
  artifacts: deck | pdf | spreadsheet | formal_quote | annex | web
  commercial_commitment: none | indicative | binding
  audience / requirement_refs
  composition_policy: separate | combined | mixed
```

```text
BidEconomicAssessment
  proposal_id / assessed_at
  service_plan_ref / cost_card_ref
  coverage / freshness / confidence
  contribution_margin / fully_loaded_margin
  viability_decision / blockers / approval_state
```

```text
ProposalEconomicPackage
  proposal_id / quotation_id / quotation_version_id
  quote_header_snapshot / line_items_snapshot
  taxes / FX / payment_terms / validity / assumptions
  requirement_cross_check / approval_evidence
  source_hash / packaged_at
```

```text
ProposalEconomicProjection
  economic_package_id
  audience / locale / presentation_currency
  visible_lines / totals / fiscal_basis / conditions
  excluded_internal_fields
```

`BidEconomicAssessment` responde “¿nos conviene participar y podemos entregar con este costo?”.
`QuotationVersion` y `ProposalEconomicPackage` responden “¿qué precio y condiciones estamos ofreciendo?”.
No son equivalentes y no deben volver a colapsarse en un único `quote_id` obligatorio para toda fase
post-GO.

La regla de sincronización es:

- un draft puede recalcularse o quedar `stale` cuando cambia sueldo, licencia, provider, FX o política;
- al aprobar/empaquetar, se congela el costo y la versión económica usados;
- una propuesta enviada no cambia retroactivamente por una actualización de costos;
- cualquier ajuste posterior crea una nueva versión de cotización, paquete y artefactos derivados;
- PDF, Excel, deck y cotización formal son N proyecciones del mismo paquete congelado.

La contabilidad general no necesita estar completa para iniciar costos, pero la foundation accounting-ready sí debe
nacer antes o dentro del primer slice: entidad/ledger, plan de cuentas versionado, períodos, money/FX, dimensiones,
eventos económicos y contratos de diario. Cost Accounting es la primera vertical sobre esa base; General Accounting
la extiende después con posting, close y statements. De este modo se puede empezar a costear sin esperar el libro
mayor y sin construir un subledger que luego haya que migrar.

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
- la moneda local solicitada no está declarada, lista o promovida para el dominio de cotización;
- se intenta usar `CLF`/UF como moneda de caja, cuenta, orden de pago o liquidación sin CLP settlement;
- se pierde el monto nativo al convertir a USD, CLP u otra moneda de presentación;
- la moneda de salida se eligió por geografía sin una razón contractual/comercial explícita;
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
- cotización chilena en CLP;
- cotización chilena en UF/CLF con liquidación en CLP;
- costo en USD y cotización en CLP, conservando el costo nativo y el FX snapshot;
- costo en CLP y cotización/liquidación en USD;
- solicitud de COP, MXN o PEN sin rate listo y con bloqueo manual explícito;
- solicitud de una moneda local que Greenhouse todavía no reconoce;
- cambio de FX después del envío de la cotización sin mutar su snapshot original;
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

### Estado real de cobertura monetaria al validar este ADR

La siguiente tabla refleja el runtime actual, no solo el diseño objetivo:

| Moneda/unidad | Cotización | Cobertura actual | Límite comprobado |
|---|---|---|---|
| `USD` | Sí | `auto_synced` | Moneda comercial predeterminada; no reemplaza el monto nativo. |
| `CLP` | Sí | `auto_synced` | Moneda funcional chilena y moneda de liquidación de la UF. |
| `CLF`/UF | Sí, como unidad indexada | `auto_synced` | Está habilitada para `pricing_output`, pero no es efectivo ni una moneda de cuenta. |
| `COP` | Declarada | `manual_only` | Solo `pricing_output`; requiere rate manual listo antes de snapshot client-facing. |
| `MXN` | Declarada | `manual_only` | La matriz declara promoción a `finance_core`, pero los writes siguen gated y el registry vigente todavía la declara para `pricing_output`; no está end-to-end cerrada. |
| `PEN` | Declarada | `manual_only` | Solo `pricing_output`; requiere rate manual listo. |
| Otras monedas locales | No | No reconocidas por la matriz actual | No deben aparecer por inferencia; requieren una promoción explícita de moneda y proveedor. |

También hay dos diferencias que deben permanecer visibles para no sobredeclarar capacidad:

1. El ADR financiero aceptado define como objetivo reporting en CLP y USD, pero `currency-domain.ts` mantiene hoy reporting/analytics solo en CLP.
2. La matriz de `finance_core` incluye MXN con writes gated, mientras el registry de MXN y los contratos históricos todavía no representan soporte financiero end-to-end.

Por tanto, el primer slice agentic puede recomendar una cotización USD/CLP/UF con evidencia consistente. Las salidas COP/MXN/PEN deben respetar readiness y bloqueo manual; una nueva moneda local no puede habilitarse solo porque el usuario la mencione.

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

### Secuencia recomendada después de aceptar el ADR

El orden reduce riesgo económico y entrega valor antes de abrir writes agentic:

1. **Finance Core reference foundation.** Definir y materializar entidad/ledger, conceptos y plan de cuentas,
   períodos, money/FX/UF y dimensiones; sin posting real.
2. **Economic Event + journal-ready shadow.** Separar documento, devengo, caja y posting; modelar idempotencia,
   causation, supersede/reversal, eligibility y `JournalCandidate` balanceado, todavía sin asientos reales.
3. **Cost Subledger vivo.** Hacer explícitos actual/standard/modeled/forecast, coverage, freshness, confidence,
   vigencias y eventos de
   invalidación para sueldos, licencias, tools, providers, FX, overhead y perfiles modelados. Un cambio
   afecta drafts y forecasts; nunca reescribe snapshots emitidos.
4. **Vertical read-only/recommendation.** Implementar `QuoteIntent`, resolución de perfiles —incluido
   cualquier rol nunca contratado—, `ServicePlan`, llamada al kernel y `CostCard`; validarlo con el golden
   set, sin escritura ni emisión client-facing.
5. **Frontera Proposal ↔ Pricing.** Introducir `ProposalDeliverablePlan` y separar
   `BidEconomicAssessment` de `QuotationVersion`. Corregir la obligación universal de `quote_id` post-GO
   para que dependa de `commercial_commitment` y de los requisitos de la fase.
6. **Paquete económico completo.** Congelar header, versión, líneas, impuestos, FX, términos,
   requerimientos, aprobaciones y hash. El snapshot parcial de la cabecera no es cierre suficiente.
7. **Un modelo, N salidas.** Derivar `PricingFull`, PDF, Excel y módulos embebidos desde
   `ProposalEconomicProjection`, con un verificador de paridad. SKY es el primer vertical dorado para el
   modo combinado.
8. **Writes headless gobernados.** Solo después de evals y observabilidad, habilitar creación de drafts o
   versiones a API/MCP/agents mediante el mismo command, con scopes, idempotencia y confirmación humana.
9. **Cierre económico real.** Conectar won → quote-to-cash → billing/collections/accounting y alimentar
   actual-vs-standard para que el sistema de costos aprenda de nómina, gastos, proveedores y delivery real.

La primera task cubre únicamente el punto 1. Cost Subledger, recomendación agentic, Proposal, writes y Q2C son build
units dependientes; no deben mezclarse en una implementación monolítica.

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
