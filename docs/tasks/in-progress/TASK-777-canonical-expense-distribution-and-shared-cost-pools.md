# TASK-777 — Canonical Expense Distribution & Shared Cost Pools

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-012`
- Status real: `Slices 1-4 runtime backend entregados; UI/manual review y AI generator pendientes`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-777-canonical-expense-distribution`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar el resolver canónico que decide cómo se distribuye cada `expense` dentro del modelo económico Greenhouse: `member_direct`, `client_direct`, `shared_operational_overhead`, `shared_financial_cost`, `regulatory_payment`, `provider_payroll`, `treasury_transit` o `unallocated`. Hoy el runtime mezcla atajos legacy (`allocated_client_id`, `direct_overhead_member_id`) con pools compartidos demasiado crudos, lo que infla `operational_pl` y termina asignando costos a clientes equivocados. La task incorpora además un copiloto de IA para sugerir clasificación/distribución en casos ambiguos, sin convertir la IA en source-of-truth ni permitir escrituras contables automáticas.

## Why This Task Exists

`TASK-768` separó la dimensión analítica (`economic_category`) y dejó claro qué es nómina, regulatorio, fee financiero u overhead. Pero el runtime que alimenta `member_capacity_economics`, `commercial_cost_attribution` y `operational_pl` todavía no tiene una política canónica para convertir esa clasificación en distribución económica real. El resultado observado en abril 2026 lo confirma:

- pagos `Deel` / `international_payroll` terminan contaminando `direct_overhead_target` o pools compartidos
- `Previred` y otros pagos regulatorios pueden caer al shared pool en vez de quedar explícitos como costo laboral/regulatorio rastreable
- fees bancarios, factoring, FX y treasury se mezclan con overhead operativo cuando deberían vivir como `financial cost`
- el pool compartido actual reparte gastos operativos/financieros por heurística de miembros billables, sin política explícita por período ni auditabilidad suficiente

Mientras esto no se resuelva, cerrar períodos produce snapshots defendibles solo a medias y cualquier P&L operativo por cliente sigue expuesto a drift conceptual.

## Goal

- Definir e implementar un resolver canónico `expense -> distribution lane` alineado a `economic_category` y al modelo `MLCM_V1`
- Separar operacional vs financiero vs regulatorio vs payroll/provider en facts/pools distintos antes de distribuir a clientes
- Dejar `operational_pl`, `member_capacity_economics` y `commercial_cost_attribution` leyendo contratos distribucionales explícitos en vez de pools shared crudos y shortcuts legacy
- Incorporar IA como motor asistido para detectar ambigüedad, explicar evidencia y proponer reglas/policies revisables; la decisión efectiva sigue siendo determinística y auditable

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No extender más el modelo ad-hoc actual (`expenses.allocated_client_id` + `expenses.direct_overhead_member_id`) como source-of-truth; cualquier nueva lógica debe tratar esos campos como override/manual exception path, no como motor principal.
- `economic_category` (`TASK-768`) es input semántico obligatorio, pero no reemplaza por sí solo la política de distribución. La salida debe decidir explícitamente si una fila va a `member`, `client`, `shared operational`, `shared financial`, `regulatory`, `provider payroll`, `treasury` o `unallocated`.
- `operational_pl` no debe seguir absorbiendo costos financieros, regulatorios o provider-payroll dentro del bucket genérico `overhead_clp`.
- La política de pool compartido debe ser versionable por período y quedar auditable; no puede depender de un query inline opaco dentro de `member-capacity-economics`.
- `Previred`, `Deel`, Global66, fees bancarios, factoring y otros processors deben respetar el boundary ya formalizado en `Payment Orders` / treasury. No inventar ledgers alternos ni mover cash de la cuenta pagadora real.
- **No-breakage treasury rule:** esta task NO puede alterar saldos bancarios, account balances, payment ledgers, settlement legs, conciliación bancaria, Payment Orders ni readers CLP-normalizados que ya funcionan. Su alcance es distribución económica/management accounting sobre facts existentes.
- `TASK-766`, `TASK-774` y `TASK-765` son baseline de integridad que debe preservarse: ningún cambio de esta task puede reintroducir recomputos inline de CLP, paid-without-bank-impact, drift de `account_balances` o movimientos de caja sin settlement/ledger canónico.
- Cualquier modificación que toque `account_balances`, `expense_payments`, `income_payments`, `settlement_legs`, `payment_orders`, `bank_statement_rows`, `reconciliation_periods` o materializers de banco queda fuera del camino feliz de TASK-777 y requiere mini-plan explícito de compatibilidad + detector antes/después.
- La IA solo puede operar como advisory layer: propone `distribution_lane`, rationale, confidence, evidence y/o regla candidata, pero nunca puede cerrar períodos, modificar snapshots cerrados, escribir al P&L ni materializar reglas sin aprobación humana o gate explícito.
- Toda invocación IA debe ser trazable con `model_id`, `prompt_version`, `prompt_hash`, payload minimizado/sanitizado, output JSON validado, confidence, evidence y decisión humana posterior cuando aplique.
- Debe existir kill-switch runtime para la capa IA. Con IA deshabilitada, el resolver determinístico y la cola `manual_required` deben seguir funcionando.

## Normative Docs

- `docs/documentation/finance/categoria-economica-de-pagos.md`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md` `[baseline no-breakage: paid order -> bank impact atomico]`
- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md` `[baseline no-breakage: CLP normalized payment readers]`
- `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`
- `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md` `[baseline no-breakage: account_balances FX consistency]`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
- `docs/tasks/to-do/TASK-710-tool-consumption-bridge.md`
- `docs/tasks/to-do/TASK-713-period-closing-workflow.md`
- `docs/tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`

### Blocks / Impacts

- `TASK-176` — el bucket `payroll_cost_clp` queda incompleto si provider payroll/regulatory siguen metidos en overhead
- `TASK-397` — financial costs necesita inputs ya separados del overhead operativo
- `TASK-710` / `TASK-712` — el bridge de tool consumption no debe convivir con member-direct shortcuts ambiguos
- `TASK-713` / `TASK-393` — cierre y restatement de períodos
- `TASK-146`, `TASK-167`, `TASK-177`, `TASK-178`, `TASK-395`, `TASK-396`
- surfaces `/finance/intelligence`, `/finance/cash-out`, `client_economics`, `person-360 finance`, `Agency > Economics`

### Files owned

- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/team-capacity/overhead.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/finance/economic-category/`
- `src/lib/finance/reconciliation-intelligence/` `[referencia de patrón IA guardrailed existente]`
- `src/lib/finance/ai/` `[referencia de patrón prompt/version/hash existente]`
- `src/lib/ai/google-genai.ts` `[provider IA existente, si aplica]`
- `src/lib/finance/` `[verificar reader/store destino exacto]`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/documentation/finance/categoria-economica-de-pagos.md`

### Protected runtime surfaces

Estos paths son **protected by default** para TASK-777. Si un plan propone tocarlos, debe justificar por qué no basta consumirlos como read-only, declarar riesgo, agregar detector before/after y validar que los saldos siguen iguales salvo cambio intencional documentado:

- `src/lib/finance/account-balances.ts`
- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- `greenhouse_finance.account_balances`
- `greenhouse_finance.expense_payments_normalized`
- `greenhouse_finance.income_payments_normalized`
- `greenhouse_finance.expense_payments`
- `greenhouse_finance.income_payments`
- `greenhouse_finance.settlement_legs`
- `greenhouse_finance.payment_orders`
- `greenhouse_finance.bank_statement_rows`
- `greenhouse_finance.reconciliation_periods`
- `src/lib/finance/reconciliation/`
- `src/lib/finance/payment-orders/` `[verificar path exacto antes de tocar]`

## Current Repo State

### Already exists

- `economic_category` ya modela la semántica analítica de cada `expense` / `income` (`TASK-768`)
- `member_capacity_economics` ya materializa `direct_overhead_target` y `shared_overhead_target`, pero sigue armando el pool compartido con un query inline sobre `expenses` y sigue leyendo `member_direct` expenses como si fueran overhead directo
- `commercial_cost_attribution` ya reparte labor + overhead comercial por cliente y `operational_pl` consume esa capa
- `TASK-397` ya define que factoring, FX, bank fees y treasury deben vivir como `financial cost`, no como overhead operativo
- `Payment Orders` ya separa conceptualmente `provider_payroll`, `employer_social_security`, processors y settlement
- existe patrón IA guardrailed en `src/lib/finance/reconciliation-intelligence/` y enriquecimiento LLM financiero en `src/lib/finance/ai/`, con prompt version/hash y feature flags como referencia reusable

### Gap

- no existe un resolver canónico `expense -> distribution lane`
- `direct_overhead_member_id` todavía absorbe costos que en realidad son `provider_payroll` o costos regulatorios, no overhead
- el pool shared actual mezcla gastos estructurales, regulatorios y financieros sin política explícita
- no existe snapshot / policy versionada para el shared pool operativo vs financial pool por período
- `operational_pl` sigue leyendo `overhead_clp` como bucket demasiado amplio y por eso infla clientes concretos con costos que no corresponden
- no existe copiloto IA especializado en distribución de gastos que ayude a revisar casos ambiguos, proponer reglas de catálogo/proveedor y acelerar la cola manual sin sacrificar auditabilidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Execution checkpoint — 2026-05-03

- Plan/audit aprobado en `docs/tasks/plans/TASK-777-plan.md`.
- Migración aplicada en Cloud SQL dev/staging:
  - `greenhouse_finance.expense_distribution_policy`
  - `greenhouse_finance.expense_distribution_resolution`
  - `greenhouse_finance.expense_distribution_ai_suggestions`
- Resolver determinístico implementado en `src/lib/finance/expense-distribution/`.
- CLI operativo: `pnpm run finance:materialize-expense-distribution -- --period YYYYMM`.
- Abril 2026 materializado:
  - 50 expenses scanned
  - 48 unchanged tras segunda corrida
  - 2 superseded por nueva regla Xepelin/factoring -> `shared_financial_cost`
  - 0 blocked
  - 0 manualRequired
- Mayo 2026 materializado sin filas (`scanned=0`) porque aún no hay expenses del período.
- Consumer cutover parcial entregado:
  - `member_capacity_economics` consume solo `expense_distribution_resolution.distribution_lane='shared_operational_overhead'` para el pool compartido.
  - `tool-cost-reader` deja de absorber `labor_cost_*`, `regulatory_payment`, `tax`, `financial_cost`, `bank_fee_real` y `financial_settlement` como direct member overhead.
- Abril 2026 rematerializado en runtime:
  - member capacity economics: 7 members
  - commercial cost attribution: 4 allocations
  - operational P&L: 7 snapshots
- Resultado visible tras fix:
  - SKY overhead abril: `$2.278.629,39` (antes se veía `$3.833.182` y luego `4.118.878,63` al cortar solo shared pool; el último inflado venía del direct overhead legacy).
  - ANAM overhead abril: `$759.543,13`.
  - SKY gross margin abril: `$1.902.318,83` / `27,56%`.
- Signals live verificados post-materialización:
  - `expense_distribution.unresolved` equivalente SQL: `0`.
  - `expense_distribution.shared_pool_contamination` equivalente SQL: `0`.
  - `expense_payments` CLP drift: `0`.
  - `income_payments` CLP drift: `0`.
- Validación ejecutada:
  - focused Vitest para resolver/repository/signals/readers críticos: OK.
  - `pnpm tsc --noEmit`: OK.
  - `pnpm lint`: OK con warnings legacy `greenhouse/no-untokenized-copy`.
  - `pnpm pg:doctor`: OK; drift preexistente en `greenhouse_payroll` y `greenhouse_serving` con `can_create=true`.
  - `pnpm build`: OK.
- Superficies protegidas no mutadas por código TASK-777: account balances, settlement legs, payment ledgers, payment orders y conciliación. Solo se leyeron facts como evidencia y se validó drift CLP `0`.

### Pendiente antes de completar la task

- Integrar gate de close governance en `check-period-readiness` / TASK-713.
- Implementar generador IA advisory-only encima de `expense_distribution_ai_suggestions` con kill-switch.
- Crear surface/manual queue si negocio quiere resolver/override desde UI.
- Documentar arquitectura final y manual funcional si se expone UI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Distribution taxonomy and canonical resolver

- crear el contrato explícito de distribución económica por `expense`, mínimo con estas lanes:
  - `member_direct_labor`
  - `member_direct_tool`
  - `client_direct_non_labor`
  - `shared_operational_overhead`
  - `shared_financial_cost`
  - `regulatory_payment`
  - `provider_payroll`
  - `treasury_transit`
  - `unallocated`
- implementar un resolver canónico sobre `economic_category`, anchors de payroll/payment orders, supplier/provider metadata y evidence real del runtime
- dejar evidencia/audit de por qué cada expense cayó en esa lane
- consumir Payment Orders, payments, settlement y reconciliation solo como evidencia read-only; no mutar cash facts ni saldos

### Slice 2 — Shared pools and policy snapshots

- separar explícitamente pools shared operativos vs financieros
- introducir policy/snapshot por período para determinar qué estrategias aplican a cada pool (`per_fte`, `per_revenue`, `equal`, `no_distribution`) sin depender de queries inline opacos
- definir tratamiento explícito para `regulatory_payment` y `provider_payroll`: nunca caer ciegamente a `shared_operational_overhead`

### Slice 3 — Consumer cutover for member/client/PL layers

- refactorizar `member_capacity_economics` para que `direct_overhead_target` solo absorba costos realmente member-direct de tipo overhead/tool/equipment, no payroll/provider
- ajustar `commercial_cost_attribution` y `operational_pl` para leer pools / lanes canónicas separadas
- asegurar que `overhead_clp` en `operational_pl` represente overhead operativo distribuido y no una mezcla de payroll/regulatorio/financial
- mantener inalterados los readers de caja/banco: el cutover afecta management views, no `account_balances`, normalized payment readers, settlement or reconciliation matching

### Slice 4 — April remediation + May gate

- producir un read-only remediation plan para abril 2026: diff entre snapshot actual y distribución canónica esperada, con recomendación explícita de reopen/restatement o cierre provisional
- dejar un gate operativo para que mayo 2026 no pueda cerrarse si existen expenses en lanes ambiguas o shared pools contaminados
- conectar el gate a `TASK-713` / `TASK-393` para que el closing workflow vea este criterio
- incluir baseline before/after de health signals de tesorería para probar que el remediation plan no cambia banco/conciliación/saldos

### Slice 5 — AI-assisted distribution copilot

- reutilizar los patrones existentes de IA financiera guardrailed para procesar solo gastos `unallocated`, `manual_required` o con baja confianza determinística
- generar sugerencias estructuradas con `suggested_distribution_lane`, `confidence`, `rationale`, `evidence`, `risk_flags`, `proposed_rule`, `requires_human_approval` y `close_impact`
- persistir sugerencias append-only en el destino que defina el plan (`expense_distribution_ai_suggestions` o cola equivalente), sin mutar `expenses`, snapshots, P&L ni close state
- permitir que una aprobación humana convierta una sugerencia en regla determinística versionada; la IA no puede ser memoria opaca ni ejecutar reglas por sí misma
- agregar kill-switch `FINANCE_DISTRIBUTION_AI_ENABLED=false` por defecto hasta validación explícita en staging
- definir contrato de prompt/version/hash, esquema JSON validado, minimización de datos y logs sin PII innecesaria

## Out of Scope

- reescribir toda la capa `Payment Orders` o treasury
- cambiar el cómputo de `account_balances`, normalized payment readers, settlement orchestration o bank reconciliation matching
- crear ledgers alternos para processors, proveedores, Previred, Deel, Global66, bancos, tarjetas o cuentas corrientes
- rematerializar saldos bancarios como efecto colateral de reclasificar distribución económica
- construir la UI completa de budgets/variance/forecast
- abrir contabilidad legal, doble partida o plan de cuentas formal
- resolver per-credit telemetry de herramientas externas más allá de lo necesario para respetar `TASK-710`
- permitir auto-booking, auto-close, auto-restatement o auto-reclassification material por IA sin revisión humana
- entrenar/fine-tunear un modelo con datos contables internos o crear memoria opaca de decisiones

## Detailed Spec

La decisión arquitectónica esperada de esta task es:

1. `economic_category` sigue siendo clasificación analítica primaria, pero no la salida final.
2. Un segundo paso canónico resuelve la **lane de distribución** usando contexto de dominio:
   - `labor_cost_external` + anchor a colaborador/provider -> `member_direct_labor` o `provider_payroll`
   - `regulatory_payment` + anchor payroll/period/member -> `regulatory_payment`
   - `financial_cost` / `bank_fee_real` / factoring / FX -> `shared_financial_cost` o `client_direct_non_labor` si existe trazabilidad suficiente
   - `vendor_cost_saas` / overhead estructural -> `member_direct_tool`, `shared_operational_overhead` o `client_direct_non_labor` según catálogo/anchor real
3. Los pools compartidos dejan de ser un efecto colateral del query actual y pasan a ser una primitive explícita del modelo MLCM.
4. `allocated_client_id` y `direct_overhead_member_id` quedan formalmente deprecados como atajos primarios. Solo sobreviven como override/manual exception path durante la migración.
5. La IA entra después del resolver determinístico, no antes: si el resolver puede decidir con evidencia fuerte, no se invoca IA. Si falta evidencia, la IA ayuda a explicar, priorizar y proponer reglas, pero la decisión runtime sigue siendo una resolución explícita aprobada o una salida `unallocated/manual_required`.
6. Una sugerencia IA aprobada debe materializarse como catálogo/regla/policy versionada y testeable. No se permite que el P&L dependa de “el modelo dijo X” como fuente primaria.
7. `expense distribution` es una lente de management accounting; no es una instrucción de tesorería. Reclasificar un gasto de `shared_operational_overhead` a `provider_payroll` o `shared_financial_cost` no puede crear, borrar, mover ni recalcular cash movements.
8. Las vistas de caja/banco/conciliación siguen gobernadas por `expense_payments_normalized`, `income_payments_normalized`, `settlement_legs`, `payment_orders`, `bank_statement_rows`, `reconciliation_periods` y `account_balances`; TASK-777 solo puede leerlas como evidence.

Casos obligatorios a cubrir en tests/ejemplos de spec:

- pagos `Deel` a Melkin / Daniela / Andrés no contaminan `overhead`
- `Previred` no cae al pool shared genérico si corresponde a previsión de una persona/período
- fees de factoring / banco / FX quedan en bucket financiero visible y no en overhead operativo
- HubSpot / Figma / Nubox / Beeconta pueden seguir como shared operational overhead si no existe un anchor más específico
- costos generales de empresa que sí deban absorberse compartidamente lo hacen vía policy explícita y snapshot versionado
- gastos nuevos de proveedor ambiguo generan sugerencia IA y cola de revisión, no distribución silenciosa
- con `FINANCE_DISTRIBUTION_AI_ENABLED=false`, el sistema conserva salida determinística y marca casos ambiguos como `manual_required`
- después de reclasificar lanes, `finance.account_balances.fx_drift`, payment CLP drift y paid-without-bank-impact siguen en `0`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un resolver canónico `expense -> distribution lane` documentado e implementado con contrato auditable
- [ ] `member_capacity_economics` deja de tratar provider payroll / regulatory payments como overhead directo o shared overhead genérico
- [ ] `operational_pl.overhead_clp` deja de mezclar costos operativos, regulatorios y financieros
- [ ] El sistema puede explicar por qué un expense terminó en `member_direct`, `shared operational`, `shared financial`, `regulatory`, `provider_payroll` o `unallocated`
- [ ] `account_balances`, normalized payment readers, settlement legs, payment orders y reconciliation matching quedan bitácora/semánticamente intactos salvo cambio explícito aprobado fuera de esta task
- [ ] Los health signals de caja se mantienen sanos: `finance.account_balances.fx_drift = 0`, expense/income payment CLP drift `0`, paid payment orders without bank impact `0`, payment-order dead-letter `0`
- [ ] No aparece ningún nuevo query/materializer que haga `SUM(payment.amount * expense.exchange_rate_to_clp)` o `SUM(raw amount)` para saldos CLP fuera de las VIEW/helper canónicos
- [ ] Existe una capa IA opcional/guardrailed que sugiere distribución solo para casos ambiguos, con prompt versionado, output JSON validado, confidence, evidence y kill-switch
- [ ] Ninguna sugerencia IA puede escribir al P&L, cerrar períodos, modificar snapshots cerrados o convertirse en regla sin aprobación humana/audit trail
- [ ] Abril 2026 queda evaluado con recomendación explícita de `reopen/restatement/provisional close`
- [ ] Mayo 2026 no puede cerrarse silenciosamente si hay contaminación de pools shared o lanes ambiguas

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/finance/intelligence`
- validación manual read-only en `/finance/bank` y `/finance/reconciliation` cuando el slice toque consumers o close gates
- comparación manual de abril 2026 antes/después contra snapshots y readers intermedios
- baseline before/after de `finance.account_balances.fx_drift`
- baseline before/after de CLP drift en `expense_payments_normalized` e `income_payments_normalized`
- baseline before/after de Payment Orders paid-without-bank-impact y dead-letter
- baseline before/after de reconciliation periods afectados: no deben cambiar match status, statement rows ni snapshots como efecto colateral de distribution lanes
- grep/lint anti-regresión para recomputo inline de CLP en nuevos callsites de finance
- tests unitarios del resolver con IA deshabilitada
- tests unitarios del contrato IA: payload sanitizado, prompt hash/version, JSON schema, confidence/risk flags y rechazo de writes automáticos
- dry-run sobre abril 2026 que compare decisión determinística, sugerencia IA y decisión humana esperada sin mutar datos

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedó documentada la decisión operativa para abril 2026 y el gate de cierre para mayo 2026

## Follow-ups

- `TASK-176`
- `TASK-397`
- `TASK-710`
- `TASK-713`
- `TASK-393`
- follow-up posible de migration/runtime para deprecar definitivamente `allocated_client_id` y `direct_overhead_member_id`
- follow-up posible de UI/admin review queue si el primer slice deja la aprobación solo como primitive backend

## Open Questions

- si `regulatory_payment` debe vivir completamente fuera de `operational_pl` o entrar como bucket separado de labor/regulatorio según policy de management accounting
- si el pool financiero debe distribuirse siempre below-operating-margin o si algunas categorías admiten asignación client-direct cuando hay trazabilidad fuerte
- si conviene materializar una tabla `expense_distribution_resolution` append-only o si basta con readers + snapshot tables en la primera fase
- si las sugerencias IA viven en la misma cola manual de distribución o en una tabla separada `expense_distribution_ai_suggestions` enlazada a la resolución final
