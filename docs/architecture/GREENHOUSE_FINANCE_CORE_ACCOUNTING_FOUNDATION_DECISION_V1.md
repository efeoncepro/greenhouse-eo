# GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1

## Metadata

- **ADR:** ADR-021
- **Status:** Accepted — dirección arquitectónica; implementación y cualquier posting real siguen gated por tasks
- **Date:** 2026-08-02
- **Owner:** Finance + Architecture, con Commercial, Payroll, Legal/Tax y Product como consumers o revisores
- **Scope:** Finance Core, plan de cuentas, entidades contables, períodos, monedas/FX/UF, dimensiones, eventos económicos, subledger de costos, contratos de diario y futuras extensiones de contabilidad general
- **Reversibility:** two-way-but-slow
- **Confidence:** medium
- **Validated as of:** 2026-08-02
- **Program owner:** [EPIC-012](../epics/to-do/EPIC-012-finance-five-capabilities-operating-system.md)
- **Evidence:** [Finance + Cost + Quoting Audit](../audits/finance/GREENHOUSE_FINANCE_COST_QUOTING_AUDIT_2026-08-02.md), [MLCM Fit Review](../audits/finance/GREENHOUSE_MLCM_FIT_AND_COST_ACCOUNTING_START_2026-08-02.md), [Costing Methods Review](../audits/finance/GREENHOUSE_COSTING_METHODS_DEEP_REVIEW_2026-08-02.md), [Live Cost Basis and Unobserved Profiles](../audits/finance/GREENHOUSE_LIVE_COST_BASIS_AND_UNOBSERVED_PROFILE_PRICING_2026-08-02.md)
- **Related decision:** [Agentic Quotation Orchestration](GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1.md)

## Context

Efeonce necesita comenzar por contabilidad de costos para poder responder con evidencia cuánto cuesta una persona,
un servicio compuesto, una herramienta, un proveedor o una capability de Globe y, desde allí, aplicar margen y
cotizar. También necesita contabilidad general, plan de cuentas, períodos y estados financieros internos.

Construir costos como un módulo aislado entregaría valor rápido, pero crearía una segunda semántica financiera que
después habría que mapear o migrar al incorporar contabilidad general. Esperar a implementar primero un libro mayor
legal completo retrasaría la corrección más urgente: hoy una cotización puede no tener base de costo suficiente,
usar estimaciones sin vigencia clara o depender de referencias de mercado no reconciliadas con la realidad de
Efeonce.

El runtime actual no parte de cero. Greenhouse ya registra ingresos, egresos, pagos, instrumentos, FX, nómina,
costos cargados, distribución de gastos, P&L operativo, pricing, cotizaciones y snapshots parciales. Sin embargo,
esas piezas no comparten todavía un sustrato contable completo y explícito:

- no existe un plan de cuentas versionado y gobernado como contrato común;
- categorías económicas, lanes de distribución y métricas de costos no tienen un mapping único hacia cuentas;
- no existe un envelope canónico de evento económico reusable por subledgers y un futuro diario;
- estimates, standard, forecast y actual no tienen una regla transversal de elegibilidad para posting;
- la cotización puede congelar precio, pero el costo vivo, su provenance y su relación posterior con el actual no
  están cerrados end-to-end;
- la expansión internacional exige separar moneda nativa, funcional, de reporting, contractual y de liquidación.

La decisión debe resolver ambas necesidades sin confundir tres cosas distintas: contabilidad de costos para decidir,
contabilidad general para registrar y reportar, y contabilidad fiscal/legal para cumplir ante cada jurisdicción.

## Decision

Greenhouse adoptará un **Finance Core accounting-ready** como sustrato compartido. La **contabilidad de costos será
la primera vertical operativa** sobre ese sustrato. La contabilidad general se incorporará después extendiendo los
mismos contratos, no creando un segundo modelo financiero ni reinterpretando datos históricos.

```text
Fuentes operativas
payroll · expenses · income · payments · tools · providers · delivery · Globe
        ↓
Finance Core accounting-ready
entity · chart · period · money/FX · dimensions · economic event · posting contract
        ↓
┌───────────────────────┬──────────────────────────┬────────────────────────┐
│ Cost Subledger        │ General Accounting      │ Treasury / Close       │
│ actual/standard/model │ journals/posting/report │ cash/reconciliation    │
└───────────────────────┴──────────────────────────┴────────────────────────┘
        ↓
Pricing · Proposal Studio · Q2C · planning · P&L · reporting · agents/API/MCP
```

El sustrato es una foundation, no una sexta capability visible de Finance. Vive debajo de las cinco capabilities de
`EPIC-012` y les entrega semántica común.

## Primitives fundacionales

### 1. Entidad contable y ledger scope

Todo hecho económico debe poder declarar:

- organización/tenant y operating entity;
- legal entity responsable;
- jurisdicción y residencia fiscal cuando apliquen;
- ledger o book al que podría pertenecer;
- período económico y fecha de reconocimiento;
- source system y source document.

No se debe asumir que Efeonce es una sola entidad chilena ni que todos los productos, clientes o proveedores usan
la misma moneda o jurisdicción. Globe queda incluido como producto/capability y consumer económico, no como ledger
legal independiente por defecto.

### 2. Plan de cuentas versionado

Greenhouse tendrá dos niveles relacionados, no un listado plano universal:

1. **Conceptos contables de grupo:** semántica estable para comparar entidades y productos, por ejemplo revenue de
   servicios, labor directa, software, proveedores, overhead, costos financieros, impuestos por cobrar/pagar.
2. **Plan de cuentas por entidad/ledger:** códigos, nombres, naturaleza, vigencia y mapping jurisdiccional aplicables
   a una legal entity concreta.

El plan de cuentas debe ser versionado y effective-dated. Una cuenta desactivada no se borra ni reinterpreta
hechos históricos. Nubox, SII u otro sistema pueden conservar el rol fiscal/legal durante la transición; su código
de cuenta se representa como mapping externo, no como la única semántica interna del grupo.

### 3. Dimensiones separadas de las cuentas

Las cuentas responden **qué naturaleza económica tiene el hecho**. Las dimensiones responden **para quién, dónde,
por qué y dentro de qué operación ocurrió**.

Dimensiones mínimas:

- organization, legal entity y business unit;
- client/account;
- deal, proposal, quotation y contract;
- service, engagement, project o work package;
- member, role/profile y workforce relationship;
- tool, provider, vendor y product/capability;
- country/jurisdiction;
- cost center y profit center cuando se formalicen.

Globe, un cliente, un diseñador o una herramienta no deben convertirse en cuentas contables nuevas. Se expresan
como dimensiones. Esta separación evita explosión del plan de cuentas y permite P&L por cliente, servicio, persona,
producto o país usando los mismos hechos.

### 4. Dinero, FX y unidades indexadas

Cada hecho conserva el monto nativo. Las conversiones agregan equivalentes; nunca reemplazan el original.

El contrato distingue:

- moneda nativa del costo o documento;
- moneda contractual y de presentación;
- moneda funcional de la entidad;
- moneda de liquidación;
- moneda de reporting;
- snapshot de FX con fuente, fecha, política y composición.

`CLF`/UF es una unidad indexada y no una cuenta de efectivo. Una obligación o cotización en UF conserva su unidad y
se liquida en CLP conforme a la política aplicable. USD puede ser moneda comercial principal sin convertirse en la
única moneda del sistema.

### 5. Evento económico y documento fuente

Todo subledger debe poder proyectar desde un envelope común:

```text
EconomicEvent
  event_id / schema_version
  tenant / organization / legal_entity / ledger_scope
  event_kind / recognition_basis
  occurred_at / recognition_date / accounting_period
  source_system / source_type / source_id / source_version
  native_money / functional_equivalent / fx_snapshot
  account_concept_hint / dimensions
  causation / correlation / idempotency_key
  evidence_refs / actor / workload
  supersedes / reverses
```

El documento fuente, el evento económico, el movimiento de caja y el asiento no son equivalentes. Una factura puede
reconocer ingreso antes del cobro; un pago puede liquidar una obligación sin volver a reconocer el gasto; una
cotización no reconoce ingreso ni costo contable.

### 6. Contrato de diario y posting

La foundation define desde el inicio el shape de una propuesta de asiento y sus estados, aunque el primer slice no
implemente un libro mayor legal:

```text
JournalCandidate
  journal_id / journal_version
  legal_entity / ledger / period
  source_event_refs
  lines[account, debit, credit, native_money, functional_money, dimensions]
  posting_rule_version
  status: non_posting | eligible | proposed | approved | posted | reversed
  approval / audit / reversal_refs
```

Un journal debe balancear en la moneda funcional del ledger. Posting, aprobación, cierre y reversa serán commands
canónicos; ningún agente, UI o integración escribirá directamente líneas contables.

Definir el contrato no autoriza posting real. Esa capacidad requiere tasks, migraciones, reglas, maker-checker,
reconciliación, rollout y evidencia propios.

## Cost Subledger como primera vertical

La primera implementación debe construir una base de costos viva y versionada sobre la foundation. Debe distinguir:

| Measurement | Significado | Posting |
| --- | --- | --- |
| `actual` | Hecho reconocido desde nómina, gasto, provider, consumo o ejecución real | Puede ser elegible según una regla de posting; nunca se postea solo por existir. |
| `standard` | Costo gobernado para planificar, cotizar y comparar | `non_posting`. |
| `modeled` | Estimación para un perfil, servicio o consumo no observado | `non_posting`; exige evidencia, supuestos, confianza y aprobación proporcional. |
| `forecast` | Proyección temporal de costo futuro | `non_posting`. |

La base viva usa vigencias e invalidación explícita:

- un cambio de sueldo actualiza el costo vigente de la persona;
- un cambio de precio de licencia o provider actualiza las próximas evaluaciones;
- un cambio de FX actualiza drafts y forecast según política;
- una nueva contratación o gasto real mejora la evidencia de perfiles modelados;
- una cotización o propuesta ya emitida conserva su snapshot y nunca cambia retroactivamente.

El Cost Subledger debe cubrir labor, herramientas, proveedores, direct costs, pass-through, rights, overhead,
reservas y productos/capabilities como Globe. El MLCM existente se reutiliza como componente para member loaded
cost y capacidad; no se convierte en el modelo universal de todos los costos.

## Extensión posterior hacia contabilidad general

Contabilidad general agregará sobre los mismos primitives:

- posting rules versionadas por entidad y tipo de evento;
- journal candidates, aprobación y posting;
- cuentas por cobrar y pagar reconciliables con documentos y caja;
- devengo, diferimiento, provisiones, depreciación y reversiones;
- close, reopen y restatement por ledger/período;
- trial balance, balance general, estado de resultados y cash flow;
- mappings/export hacia sistemas fiscales o ERP durante la coexistencia;
- consolidación e intercompany cuando existan entidades que lo requieran.

La contabilidad general no deberá migrar costos a otro esquema conceptual: consumirá los mismos eventos, cuentas,
dimensiones, dinero, períodos y evidencia. Las diferencias entre standard/model y actual se analizan como variance;
no se convierten retroactivamente en hechos contables.

## Ownership y source of truth

| Plano | Owner | Regla |
| --- | --- | --- |
| Fuentes operativas | Payroll, Finance documents, Treasury, Commercial, Delivery, Globe | Conservan autoridad sobre el hecho de origen. |
| Finance Core | Finance | Entidades contables, conceptos/cuentas, períodos, money/FX, dimensiones financieras, eventos y posting contracts. |
| Cost Subledger | Management Accounting / Cost Accounting | Cost facts actual/standard/modeled/forecast, allocation, snapshots, coverage y variance. |
| Pricing | Commercial + Finance policy | Usa cost snapshots; no escribe costos ni asientos. |
| Proposal Studio | Commercial | Compone proyecciones client-facing desde una versión económica congelada. |
| General Accounting | Finance | Posting rules, journals, close y estados financieros internos. |
| Fiscal/legal | Legal/Tax + sistema aprobado por jurisdicción | Nubox/SII u otro sistema siguen vigentes hasta un cutover formal. |

## Runtime contract

### Existe y debe reutilizarse

- `greenhouse_finance.income`, `expenses`, pagos, balances, conciliación y settlement;
- economic categories y expense distribution materializada por `TASK-768`/`TASK-777`;
- payroll y compensation versions como fuentes laborales;
- member loaded cost, commercial cost attribution, client economics y operational P&L;
- tool catalog/consumption, service pricing y `pricing-engine-v2`;
- contratos de moneda/FX/UF y snapshots de cotización;
- Proposal aggregate, Artifact Composer y Q2C commands existentes.

### Falta materializar

- catálogo de conceptos contables y plan de cuentas versionado por entity/ledger;
- periods y ledger scope compartidos por costos y futura contabilidad general;
- dimension registry/crosswalk sin duplicar catálogos de dominio;
- `EconomicEvent` y `JournalCandidate` canónicos;
- posting eligibility y posting rules separados de cost measurement;
- Cost Subledger unificado con effective dating, coverage, freshness, confidence e invalidation;
- reconciliation actual-versus-standard/model por quote, servicio, cliente y período;
- readers/commands/API parity para consumers autorizados.

Este ADR no fija nombres finales de tablas ni autoriza migraciones. La task fundacional debe auditar schema y código
reales, reutilizar primitives existentes y presentar el diseño de migración antes de escribir datos.

## Alternatives considered

### Construir un módulo de costos aislado y adaptarlo después

Rechazada. Entrega velocidad local a costa de mappings, migración histórica, conceptos duplicados y desacuerdo futuro
entre costo, pricing y contabilidad general.

### Implementar primero un libro mayor legal completo

Rechazada como secuencia. Sobrecarga el primer resultado con posting fiscal, estados formales y jurisdicciones antes
de resolver la necesidad inmediata de costear y cotizar. La foundation debe nacer lista; el GL completo no debe
bloquear la primera vertical.

### Usar Nubox u otro ERP como único Finance Core

Rechazada. Puede seguir siendo sistema fiscal/legal, pero no posee delivery, perfiles, servicios, Globe, capacity,
pricing agentic ni las dimensiones operativas necesarias para costeo vivo. Greenhouse debe conservar la semántica
operativa y reconciliar/exportar hacia el sistema externo.

### Foundation compartida con Cost Subledger primero

Aceptada. Resuelve el dolor actual, preserva la extensión hacia contabilidad general y evita dos fuentes financieras.

## Consequences

### Benefits

- costos, pricing, propuestas y contabilidad futura comparten semántica;
- el plan de cuentas nace antes de que haya datos difíciles de migrar;
- las dimensiones permiten rentabilidad por cliente, servicio, perfil, producto o país sin inflar cuentas;
- los costos vivos pueden actualizar drafts sin mutar cotizaciones emitidas;
- actual, standard, modeled y forecast quedan separados y reconciliables;
- agentes y sistemas headless consumen contratos gobernados, no tablas ni cálculos privados.

### Costs and risks

- la primera vertical necesita una foundation mínima adicional antes de mostrar valor;
- un plan de cuentas prematuro o demasiado específico puede rigidizar el sistema;
- mapping por entidad/jurisdicción requiere Finance/Tax ownership real;
- coexistir con Nubox/SII exige reconciliación y claridad de autoridad;
- no separar cuentas y dimensiones produciría un modelo inmanejable;
- declarar `accounting-ready` sin implementar posting podría confundirse con tener contabilidad general operativa.

La mitigación es slice vertical, schemas aditivos, estado runtime honesto, shadow/read-only inicial y ningún claim de
libro legal hasta demostrar posting, close, reconciliation y reporting.

## Implementation sequence

1. **Finance Core reference foundation:** current-state mapping, entities/ledgers, account concepts/CoA, periods,
   dimensions y money/FX/UF; migrations aditivas y sin posting.
2. **Economic Event + journal-ready shadow:** document/accrual/cash/posting separation, idempotency, causation,
   supersede/reversal, posting eligibility y journal candidates balanceados en shadow, sin asientos reales.
3. **Live Cost Subledger:** labor, tools, providers, overhead, Globe, actual/standard/modeled/forecast, effective
   dating, invalidation, coverage/freshness/confidence y snapshots.
4. **Read-only agentic quotation:** `QuoteIntent → ProfileResolution → ServicePlan → CostCard`, usando el Cost
   Subledger y el kernel determinista.
5. **Proposal economic package:** assessment interno, quotation version, package congelado y N proyecciones.
6. **Governed headless writes:** adaptar commands canónicos existentes con idempotencia, scopes, evals y aprobación.
7. **Q2C and actual feedback:** won → contract/income/AR/cash y variance actual-versus-standard.
8. **General Accounting vertical:** posting rules, journals, close, statements, external mappings and reconciliation.

Cada paso es una build unit independiente. Ninguna task debe mezclar foundation, cost subledger, agente, Proposal y
GL completo en una migración monolítica.

## Revisit when

Reabrir esta decisión si:

- Greenhouse pasa a ser libro legal/fiscal de una jurisdicción;
- se incorpora otra legal entity con plan local incompatible;
- un ERP externo se convierte formalmente en GL y Greenhouse pasa a ser solo subledger;
- el Cost Subledger requiere una semántica que no puede expresarse con cuentas + dimensiones + events;
- se propone postear estimates, forecasts o cotizaciones;
- un agente obtiene autonomía para aprobar o postear asientos;
- la conciliación demuestra que los mismos eventos no pueden sostener costing y general accounting;
- cambia la moneda funcional o el modelo de consolidación del grupo.

## Explicit non-authorization

La aceptación de ADR-021 no autoriza por sí sola:

- crear o aplicar migraciones;
- reemplazar Nubox/SII;
- emitir estados financieros legales;
- postear asientos o cerrar períodos automáticamente;
- recalcular cotizaciones emitidas;
- exponer costos internos a clientes;
- permitir que IA clasifique, apruebe o registre hechos sin policy, evidencia y audit trail.
