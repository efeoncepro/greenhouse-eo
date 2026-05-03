# TASK-777 — Canonical Expense Distribution & Shared Cost Pools

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-777-canonical-expense-distribution-and-shared-cost-pools`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar el resolver canónico que decide cómo se distribuye cada `expense` dentro del modelo económico Greenhouse: `member_direct`, `client_direct`, `shared_operational_overhead`, `shared_financial_cost`, `regulatory_payment`, `provider_payroll`, `treasury_transit` o `unallocated`. Hoy el runtime mezcla atajos legacy (`allocated_client_id`, `direct_overhead_member_id`) con pools compartidos demasiado crudos, lo que infla `operational_pl` y termina asignando costos a clientes equivocados.

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

## Normative Docs

- `docs/documentation/finance/categoria-economica-de-pagos.md`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`
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
- `src/lib/finance/` `[verificar reader/store destino exacto]`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/documentation/finance/categoria-economica-de-pagos.md`

## Current Repo State

### Already exists

- `economic_category` ya modela la semántica analítica de cada `expense` / `income` (`TASK-768`)
- `member_capacity_economics` ya materializa `direct_overhead_target` y `shared_overhead_target`, pero sigue armando el pool compartido con un query inline sobre `expenses` y sigue leyendo `member_direct` expenses como si fueran overhead directo
- `commercial_cost_attribution` ya reparte labor + overhead comercial por cliente y `operational_pl` consume esa capa
- `TASK-397` ya define que factoring, FX, bank fees y treasury deben vivir como `financial cost`, no como overhead operativo
- `Payment Orders` ya separa conceptualmente `provider_payroll`, `employer_social_security`, processors y settlement

### Gap

- no existe un resolver canónico `expense -> distribution lane`
- `direct_overhead_member_id` todavía absorbe costos que en realidad son `provider_payroll` o costos regulatorios, no overhead
- el pool shared actual mezcla gastos estructurales, regulatorios y financieros sin política explícita
- no existe snapshot / policy versionada para el shared pool operativo vs financial pool por período
- `operational_pl` sigue leyendo `overhead_clp` como bucket demasiado amplio y por eso infla clientes concretos con costos que no corresponden

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

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

### Slice 2 — Shared pools and policy snapshots

- separar explícitamente pools shared operativos vs financieros
- introducir policy/snapshot por período para determinar qué estrategias aplican a cada pool (`per_fte`, `per_revenue`, `equal`, `no_distribution`) sin depender de queries inline opacos
- definir tratamiento explícito para `regulatory_payment` y `provider_payroll`: nunca caer ciegamente a `shared_operational_overhead`

### Slice 3 — Consumer cutover for member/client/PL layers

- refactorizar `member_capacity_economics` para que `direct_overhead_target` solo absorba costos realmente member-direct de tipo overhead/tool/equipment, no payroll/provider
- ajustar `commercial_cost_attribution` y `operational_pl` para leer pools / lanes canónicas separadas
- asegurar que `overhead_clp` en `operational_pl` represente overhead operativo distribuido y no una mezcla de payroll/regulatorio/financial

### Slice 4 — April remediation + May gate

- producir un read-only remediation plan para abril 2026: diff entre snapshot actual y distribución canónica esperada, con recomendación explícita de reopen/restatement o cierre provisional
- dejar un gate operativo para que mayo 2026 no pueda cerrarse si existen expenses en lanes ambiguas o shared pools contaminados
- conectar el gate a `TASK-713` / `TASK-393` para que el closing workflow vea este criterio

## Out of Scope

- reescribir toda la capa `Payment Orders` o treasury
- construir la UI completa de budgets/variance/forecast
- abrir contabilidad legal, doble partida o plan de cuentas formal
- resolver per-credit telemetry de herramientas externas más allá de lo necesario para respetar `TASK-710`

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

Casos obligatorios a cubrir en tests/ejemplos de spec:

- pagos `Deel` a Melkin / Daniela / Andrés no contaminan `overhead`
- `Previred` no cae al pool shared genérico si corresponde a previsión de una persona/período
- fees de factoring / banco / FX quedan en bucket financiero visible y no en overhead operativo
- HubSpot / Figma / Nubox / Beeconta pueden seguir como shared operational overhead si no existe un anchor más específico
- costos generales de empresa que sí deban absorberse compartidamente lo hacen vía policy explícita y snapshot versionado

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
- [ ] Abril 2026 queda evaluado con recomendación explícita de `reopen/restatement/provisional close`
- [ ] Mayo 2026 no puede cerrarse silenciosamente si hay contaminación de pools shared o lanes ambiguas

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/finance/intelligence`
- comparación manual de abril 2026 antes/después contra snapshots y readers intermedios

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

## Open Questions

- si `regulatory_payment` debe vivir completamente fuera de `operational_pl` o entrar como bucket separado de labor/regulatorio según policy de management accounting
- si el pool financiero debe distribuirse siempre below-operating-margin o si algunas categorías admiten asignación client-direct cuando hay trazabilidad fuerte
- si conviene materializar una tabla `expense_distribution_resolution` append-only o si basta con readers + snapshot tables en la primera fase
