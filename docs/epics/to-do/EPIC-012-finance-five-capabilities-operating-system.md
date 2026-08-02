# EPIC-012 — Finance Core + Five-Capabilities Operating System

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Owner: `unassigned`
- Branch: `epic/EPIC-012-finance-five-capabilities-operating-system`
- GitHub Issue: `[optional]`

## Summary

Coordina la evolución de Finance sobre un `Finance Core accounting-ready` compartido y cinco capacidades canónicas: `Treasury & Payments`, `Accounting Semantics`, `Management Accounting`, `Close Governance` y `Planning & Control Tower`. La contabilidad de costos es la primera vertical operativa; plan de cuentas, entidades, períodos, monedas/FX, dimensiones, eventos económicos y contratos de diario nacen desde el inicio para que la contabilidad general se agregue después por extensión, no mediante otro modelo o una migración semántica. Donde exista ambigüedad contable o financiera, el sistema puede usar IA como copiloto de revisión y orquestación, pero nunca como source-of-truth operativo sin reglas, aprobación y audit trail.

## Why This Epic Exists

La auditoría `FINANCE_DOMAIN_AUDIT_2026-05-03` confirmó una separación clara:

- la base transaccional de pagos, CLP readers, account balances y Payment Orders está relativamente sana
- la capa de management accounting todavía mezcla implementación V0, shortcuts legacy y clasificación/distribución incompleta
- el cierre de período puede marcar readiness sin gates financieros suficientes
- las mejoras necesarias ya existen como muchas tasks dispersas, pero falta un programa que las ordene por capacidad y dependencia

Este epic existe para convertir esas piezas en un sistema coherente y ejecutable.

La auditoría de costos y cotización del 2026-08-02 agregó una necesidad load-bearing: Efeonce no puede seguir
cotizando sin una base de costos viva, pero tampoco debe construir esa base como un módulo aislado que luego haya
que migrar al incorporar plan de cuentas y contabilidad general. `ADR-021` fija la secuencia: foundation contable
mínima compartida, Cost Subledger vivo como primer vertical, cotización agentic read-only y extensión posterior
hacia Q2C y General Accounting.

## Outcome

- Finance opera con cinco capacidades explícitas y no con una bolsa de funcionalidades mezcladas.
- Mayo 2026 puede aspirar a ser el primer cierre finance-grade, sujeto a gates explícitos.
- `overhead_clp`, costos financieros, payroll/provider payroll, regulatory payments y shared operational overhead quedan separados y explicables.
- La IA acelera análisis de ambigüedad, propuestas de reglas y priorización de revisión, pero las métricas finales dependen de resoluciones determinísticas/versionadas.
- Cada métrica visible de Finance declara source reader, lente contable, freshness, close status y degradación.
- Budget, variance y forecast se construyen solo sobre actuals confiables.
- Finance Core conserva plan de cuentas versionado, entidad/ledger, períodos, money/FX, dimensiones, eventos
  económicos y contratos de posting reutilizables por costos y contabilidad general.
- Cost Accounting distingue `actual`, `standard`, `modeled` y `forecast`; una estimación o cotización nunca se
  convierte en asiento por inferencia.
- Un cambio de sueldo, licencia, provider, herramienta o FX actualiza drafts y forecasts futuros sin reescribir
  snapshots ya emitidos.
- Pricing, Proposal Studio, Q2C, Globe y agentes/API/MCP consumen los mismos readers/commands y no crean ledgers o
  motores económicos paralelos.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-05-03.md`
- `docs/audits/finance/GREENHOUSE_FINANCE_COST_QUOTING_AUDIT_2026-08-02.md`
- `docs/audits/finance/GREENHOUSE_MLCM_FIT_AND_COST_ACCOUNTING_START_2026-08-02.md`
- `docs/audits/finance/GREENHOUSE_LIVE_COST_BASIS_AND_UNOBSERVED_PROFILE_PRICING_2026-08-02.md`

## Capability Model

### Shared substrate — Finance Core accounting-ready

No es una sexta capability visible ni un segundo módulo. Es el contrato común que evita que Treasury,
Accounting Semantics, Management Accounting y una futura General Accounting modelen el mismo hecho de formas
incompatibles.

Owner of:

- legal entity, ledger scope y accounting periods
- account concepts, plan de cuentas versionado y mappings externos
- money nativo, funcional, contractual, de liquidación y reporting; FX/UF versionados
- dimensiones financieras separadas de las cuentas
- envelope canónico de evento económico y documento fuente
- `JournalCandidate`, posting eligibility, audit, supersede y reversal contracts

Hard boundary:

- Cost Subledger puede materializar `actual`, `standard`, `modeled` y `forecast`.
- Solo hechos `actual` reconocidos pueden llegar a `eligible`, siempre mediante una posting rule y aprobación.
- Standard, model, forecast, quote y proposal snapshots son `non_posting`.
- Nubox/SII u otro sistema conserva el rol fiscal/legal hasta un cutover separado y demostrado.

### 1. Treasury & Payments

Owner of:

- bank accounts and balances
- payment instruments
- payment orders
- settlement legs
- reconciliation
- payment processors and execution rails
- cash visibility and controls

Primary tasks:

- `TASK-707` — Previred canonical payment runtime and backfill
- `TASK-707a` — Previred detection and canonical state runtime
- `TASK-707b` — Previred historical backfill and rematerialize
- `TASK-707c` — Previred componentization runtime
- `TASK-756` — Payroll orders auto-generation
- `TASK-757` — Payment processor execution sync / Global66 webhook
- `TASK-224` — Finance Document vs Cash Semantic Contract

### 2. Accounting Semantics

Owner of:

- fiscal vs analytical category separation
- economic category quality
- expense distribution lanes
- document-vs-cash semantics
- financial cost vs operating cost boundaries
- AI-assisted review for ambiguous accounting/distribution cases

Primary tasks:

- `TASK-768` — completed foundation for `economic_category`
- `TASK-777` — canonical expense distribution, shared cost pools and AI-assisted distribution copilot
- `TASK-397` — financial costs integration
- `TASK-224` — document-vs-cash semantic contract
- `TASK-725` — fiscal scope and legal entity foundation

### 3. Management Accounting

Owner of:

- operational P&L
- client / space / organization / BU profitability
- member loaded cost
- shared cost policy
- cost attribution explainability

Primary tasks:

- `TASK-176` — labor provisions fully-loaded cost
- `TASK-710` — tool consumption bridge
- `TASK-711` — member-tool license UI
- `TASK-712` — tool catalog consolidation
- `TASK-394` — scope expansion BU, legal entity and intercompany
- `TASK-777` — distribution lanes and shared pools

### 4. Close Governance

Owner of:

- period close workflow
- immutable snapshots
- reopen/restatement
- close gates
- readiness and degradation status
- prior-period adjustment governance

Primary tasks:

- `TASK-713` — period closing workflow
- `TASK-393` — period governance, restatements and reclassification
- `TASK-398` — enterprise hardening, explainability, RBAC, observability and runbooks

### 5. Planning & Control Tower

Owner of:

- budgets
- drivers
- variance
- forecast
- executive control tower
- metric registry and dependency graph
- stale/degraded data UX

Primary tasks:

- `TASK-416` — finance metric registry foundation
- `TASK-417` — finance metric registry reader primitives
- `TASK-418` — finance signal engine cutover to registry
- `TASK-419` — finance dashboard cutover to registry
- `TASK-421` — finance metric targets editable + effective dating
- `TASK-422` — metric quality gates + stale data UX
- `TASK-425` — finance metric dependency DAG
- `TASK-178` — finance budget engine
- `TASK-395` — planning engine, budgets, drivers and approval governance
- `TASK-396` — variance, forecast and executive control tower

## Execution Waves

### Foundation F0 — Accounting-ready, sin abrir todavía el GL legal

- Mapear las primitives actuales antes de crear schema nuevo.
- Definir entidad/ledger, conceptos y plan de cuentas versionado, períodos, money/FX, dimensiones, `EconomicEvent`
  y `JournalCandidate`.
- Crear únicamente migrations aditivas necesarias para que costos nazca sobre esos contracts.
- Mantener posting, estados legales y sustitución de Nubox/SII fuera de este slice.

### Foundation F1 — Cost Subledger vivo

- Integrar labor, tools, providers, direct costs, overhead, pass-through, rights y Globe.
- Distinguir actual/standard/modeled/forecast con vigencia, provenance, coverage, freshness y confidence.
- Invalidar drafts y forecasts cuando cambia una fuente; preservar snapshots emitidos.
- Reusar MLCM para member loaded cost sin convertirlo en el modelo universal de todos los costos.

### Vertical F2 — Cost-to-quote y propuesta económica

- Habilitar primero `QuoteIntent → ProfileResolution → ServicePlan → CostCard` en modo read-only/recommendation.
- Congelar después `QuotationVersion` + `ProposalEconomicPackage`; derivar PDF, Excel, deck y cotización formal de
  una misma proyección.
- Mantener emisión, envío y excepciones de margen bajo aprobación humana.

### Wave 0 — Freeze Decision Quality

- Keep April 2026 explicitly provisional / restatement-needed.
- Do not close May 2026 as finance-grade until minimum gates exist.
- Use the existing healthy CLP/payment/account-balance readers as the cash foundation.
- Treat AI as advisory only until there is an approved deterministic rule/policy path.

### Wave 1 — Make P&L Trustworthy

- Execute `TASK-777`.
- Separate `shared_operational_overhead`, `shared_financial_cost`, `provider_payroll`, `regulatory_payment` and `member_direct_labor`.
- Refactor `member_capacity_economics`, `commercial_cost_attribution` and `operational_pl` away from raw V0 shortcuts.
- Add guarded AI suggestions for ambiguous expenses, with kill-switch, evidence, confidence, prompt version/hash and human approval before any rule materialization.

### Wave 2 — Make Close Real

- Execute `TASK-713` and `TASK-393`.
- Add close blockers for unresolved lanes, shared pool contamination, CLP drift, payment-order health and bank reconciliation policy.
- Add explicit `provisional`, `closed`, `reopened` and `restated` semantics to period reporting.

### Wave 3 — Complete Treasury/Payroll Payment Coverage

- Execute `TASK-707*`, `TASK-756` and `TASK-757`.
- Extend Payment Orders beyond `employee_net_pay`.
- Make Previred, employer social security, provider payroll and processor execution reconcile through canonical payment/settlement paths.

### Wave 4 — Build Planning & Control Tower

- Execute metric registry and DAG tasks.
- Then execute budget, variance and forecast tasks.
- Only promote executive control tower once actuals and close status are reliable.

## Child Tasks

### Planned build units — IDs pendientes de confirmación del operador

- `TASK-1633` candidate — Finance Core Reference Foundation: account concepts/CoA, entity/ledger, periods,
  dimensions y money/FX/UF, reutilizando `TASK-224` y auditando la foundation real de `TASK-725`.
- `TASK-1634` candidate — Economic Event + Journal-Ready Shadow Contract: documento/devengo/caja/posting,
  idempotencia, causation, supersede/reversal, eligibility y reconciliación shadow; sin posting real.
- `TASK-1635` candidate — Live Cost Subledger + Canonical Cost Reader: actual/standard/modeled/forecast, labor,
  tools, providers, overhead, pass-through, rights y Globe con vigencia, invalidation, coverage, freshness,
  confidence y snapshots.
- `TASK-1636` candidate — Universal Profile Resolution: member actual, role blended/modeled/proxy y
  `manual_pending` para cualquier perfil nunca contratado, sin crear SKUs automáticamente.
- `TASK-1637` candidate — CostCard + Quotation Cost Baseline: costo determinista por línea/work package,
  contribution/fully-loaded, units, scenarios, FX, margins, provenance y baseline inmutable por versión.
- `TASK-1638` candidate — Costing & Quotation Golden Set: replay y paridad Portal/Nexa/API/MCP para perfiles
  conocidos/desconocidos, servicios, tools, Globe, USD/CLP/UF, stale data y margin floor.
- `TASK-1639` candidate — Immutable Quotation Version + Economic Package: snapshot append-only de header, lines,
  costs/prices, taxes, currencies, FX/UF, terms, approvals, provenance y hash.
- `TASK-1642` candidate — Efeonce MCP Quotation Provider Read/Recommend: adapter federado sobre API Platform y
  `TASK-609`, sin pricing propio ni writes; clientes externos esperan `TASK-1631`.
- Agentic quotation vertical: ampliar `TASK-609` en vez de crear otro asistente; debe consumir `TASK-1635…1638`
  en modo read-only/recommendation antes de cualquier write externo.

La reserva de IDs y creación de archivos `TASK-###` se hace sólo después del checkpoint de task planning. El mapa
final debe actualizar, no duplicar, `TASK-609`, `TASK-1206`, `TASK-1417`, `TASK-1607` y las tasks de FX/quote/tax.
`TASK-1211` y `TASK-1212` ya poseen simulación y autoría/emisión canónicas; cualquier exposición futura a agentes
externos debe adaptar esos commands, no crear otro motor o write path.
`EPIC-029` registra como dependientes `TASK-1640/1641/1643` candidates para composición económica, finalización de
artefactos y el vertical dorado SKY; no pertenecen al Cost Subledger.

### Backlog corrections before execution

- Reconciliar el duplicado físico de `TASK-174` entre `to-do` y `complete`; no ejecutar dos copias.
- Auditar `TASK-725`: lifecycle `complete` y `Status real: Diseño` no permiten asumir sin evidencia qué parte de
  legal entity está realmente materializada.
- Corregir referencias MLCM stale/colisionadas a `TASK-705/708/709`; esos IDs no representan el programa de costos
  descrito por la spec.
- Reconciliar metadata/acceptance criteria de `TASK-481/482`; en `TASK-482`, el probe debe consumir
  `service_attribution_facts`, no la tabla inexistente `service_attribution`.
- Tratar `TASK-476…483` como foundation comercial implementada pero no como live cost basis operativamente cerrada;
  la auditoría 2026-08-02 demostró cobertura y provenance parciales.

- `TASK-777` — first execution task; fixes expense distribution lanes/shared pools and adds an AI-assisted review copilot for ambiguous cases
- `TASK-713` — period closing workflow
- `TASK-393` — restatements and reclassification governance
- `TASK-397` — financial costs integration
- `TASK-176` — fully-loaded labor provisions
- `TASK-710` — tool consumption bridge
- `TASK-711` — member-tool license UI
- `TASK-712` — tool catalog consolidation
- `TASK-707` / `TASK-707a` / `TASK-707b` / `TASK-707c` — Previred runtime and historical cleanup
- `TASK-756` — payroll orders auto-generation
- `TASK-757` — payment processor execution sync
- `TASK-224` — document-vs-cash semantic contract
- `TASK-416` / `TASK-417` / `TASK-418` / `TASK-419` / `TASK-421` / `TASK-422` / `TASK-425` — metric registry and control plane
- `TASK-178` / `TASK-395` / `TASK-396` — planning, budget, variance and forecast
- `TASK-398` — enterprise hardening

## Existing Related Work

- `TASK-766` — CLP currency reader contract
- `TASK-774` — account balance CLP-native reader contract
- `TASK-765` — payment order bank settlement resilience
- `TASK-768` — economic category dimension
- `TASK-280` — finance cash modules
- `TASK-282` — payment instrument reconciliation and settlement orchestration
- `TASK-283` — bank and treasury module
- `TASK-392` — reliable actual foundation program
- `TASK-723` — AI-assisted reconciliation intelligence pattern
- `src/lib/finance/reconciliation-intelligence/` — existing guardrailed Finance AI pattern
- `src/lib/finance/ai/` — existing prompt/version/hash Finance AI utilities
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-05-03.md`
- `TASK-609` — AI Quote Draft Assistant; debe convertirse en el owner de la vertical agentic de recomendación
- `TASK-1206` — comando canónico de cierre Q2C; consumer posterior de events/posting eligibility
- `TASK-1210` — rollout MXN/CLF del Finance Core
- `TASK-1417` — author económico de Proposal Studio; consumer de una proyección económica congelada
- `TASK-1607` — recruitability y factibilidad económica para perfiles nunca contratados
- `EPIC-029` — Proposal Studio; owner del composition/render client-facing, no del cálculo económico

## Exit Criteria

- [ ] The five Finance capabilities are documented and mapped to runtime owners.
- [ ] `overhead_clp` no longer includes provider payroll, regulatory payments or financial costs.
- [ ] Every expense has either a canonical distribution lane or an explicit unresolved state.
- [ ] Ambiguous expenses can receive AI-assisted suggestions with evidence/confidence, but only approved deterministic rules affect reporting.
- [ ] Period close cannot reach finance-grade status while lane ambiguity, CLP drift, payment-order drift or required reconciliation gaps exist.
- [ ] Payment Orders cover payroll net pay, employer social security/provider payroll paths or explicitly block them with visible close impact.
- [ ] Core Finance dashboards use document readers for accrual and normalized payment readers for cash.
- [ ] Finance metrics declare source, accounting lens, freshness, close status and degradation.
- [ ] Budget/variance/forecast are built on closed or explicitly provisional actuals.
- [ ] Finance Core tiene un plan de cuentas versionado por entity/ledger y conceptos de grupo sin usar dimensiones
  como cuentas.
- [ ] Los subledgers comparten entidad, período, money/FX, dimensiones y `EconomicEvent`.
- [ ] Existe contrato de `JournalCandidate` y posting eligibility, aunque posting permanezca apagado.
- [ ] Cost Subledger separa actual/standard/modeled/forecast y conserva provenance, vigencia, coverage, freshness y
  confidence por línea.
- [ ] Un cambio de costo fuente invalida drafts/forecast afectados y nunca muta una cotización emitida.
- [ ] Pricing, Proposal Studio, Q2C, Globe y consumers headless no poseen cálculos o ledgers paralelos.
- [ ] La futura General Accounting puede agregar posting/close/statements sobre la misma foundation sin migrar ni
  reinterpretar el Cost Subledger.

## Non-goals

- Implementar en el primer slice un libro mayor legal completo, posting, estados estatutarios o sustitución de ERP.
- Tratar la foundation accounting-ready como si ya fuera contabilidad general operativa.
- Replacing Nubox/SII fiscal systems as legal source of truth.
- Rebuilding all Finance UI in one large redesign.
- Implementing planning/forecast before actuals and close governance are trustworthy.
- Letting AI auto-book, auto-close, auto-restatement or silently mutate P&L/close snapshots.

## Delta 2026-05-03

Created after `FINANCE_DOMAIN_AUDIT_2026-05-03` and user decision to frame Finance around five capabilities instead of a single overloaded module.

Updated same day to incorporate AI as an advisory Finance copilot for ambiguous accounting/distribution cases. Runtime authority remains deterministic, versioned and auditable.

## Delta 2026-08-02

El operador confirmó que Cost Accounting debe comenzar primero, pero nacer con las bases necesarias para que General
Accounting sea una extensión. Se acepta `ADR-021`, se agrega `Finance Core accounting-ready` como sustrato debajo
de las cinco capabilities y se conecta el programa con agentic quotation, Proposal Studio, Q2C, multimoneda y
Globe. Este delta no declara runtime implementado ni autoriza posting.
