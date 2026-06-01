# Greenhouse Contractor Engagements + Payables Architecture V1

**Version:** 1.10
**Created:** 2026-05-05
**Status:** `ContractorEngagement` (TASK-790) + Contractor Invoice Assets (TASK-791) + Contractor Work Submissions (TASK-792) + ContractorPayable + Finance bridge (TASK-793) + Chile Honorarios Compliance (TASK-794) + International Contractor Boundary Fase A (TASK-795) + Self-Service Hub UI (TASK-796) + Employee→Contractor connected command (TASK-956) + **Contractor↔Legacy Payroll Double-Rail Exclusion + Current Work Classification (TASK-957)** implemented. Provider settlement split + EOR (TASK-795 Fase B / TASK-955), contractor closure (TASK-797) and ops control plane (TASK-798) remain proposals.

## Delta 2026-05-31 — TASK-977 Contractor Payable Bank Settlement shipped (flag OFF)

Cierra el **Hecho verificado 1** del audit de abajo: el contractor payable ahora **se puede liquidar al banco** por el motor canónico de settlement, detrás de flag (default OFF → parity bit-for-bit). El path de nómina queda 100% intacto.

- **Expense reactivo (precondición):** el expense del contractor se materializa cuando el payable llega a `ready_for_finance` (espejo de `payroll-expense-reactive` al `exported`) — proyección `contractor_payable_expense_materialize`, helper `materializeContractorPayableExpense`. `total_amount=bruto`, `economic_category='labor_cost_external'` (resolver Rule 0 source-driven), `expense_type='contractor'`, `source_type='contractor_payable'`, `supplier_id=NULL`, anclado por la columna nueva `expenses.contractor_payable_id` (FK, migración `20260531184945430`). Idempotente (dedup por anchor).
- **Settlement (rama aditiva, flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED`):** `recordPaymentForOrder` + `markPaymentOrderPaidAtomic` ganan una rama para `source_kind='contractor_payable'`/`obligation_kind='provider_payroll'` que resuelve el expense por `contractor_payable_id` → `recordExpensePayment(net, paymentSource='contractor_system')` → settlement_leg → bank debit. OFF mantiene `out_of_scope_v1`. `payment_source` CHECK widened a `'contractor_system'` (migración `20260531185842386`).
- **Accounting (invariante TASK-795):** gasto=bruto, pago=neto, retención SII=pasivo a remesar **separado (F29, out of scope)** → honorarios queda `partial` hasta la remesa SII; withholding=0 queda `paid`.
- **Signal:** `finance.contractor_payable.expense_unmaterialized` (data_quality, warning>0, steady=0).
- **No-regresión:** `pnpm vitest run src/lib/payroll src/lib/finance/payment-orders` 585 verde con flag OFF.

**Pendiente para pagar end-to-end:** flip del flag (post staging + finance sign-off) + la UI de Finanzas (TASK-974). **Follow-ups:** remesa SII (TASK-#), due_date cierre+5d + SLA (TASK-978), corrida mensual (TASK-979). Invariantes duros en `CLAUDE.md` → "Contractor Payable Bank Settlement invariants (TASK-977)". Spec: `docs/tasks/complete/TASK-977-contractor-payable-bank-settlement.md`.

## Delta 2026-05-31 — Audit: End-to-end settlement gap + Monthly payment convergence target (verified, no inference)

Revisión exhaustiva del backend de pago end-to-end (2026-05-31, leyendo el código). Documenta dos hechos verificados y un target de diseño explícito. **No es una implementación nueva — es la captura honesta de un gap y un objetivo.**

### Hecho verificado 1 — El settlement al banco está fuera de scope para contractors en V1

La cadena de pago de un contractor payable es: `ready_for_finance` → (bridge reactivo) `payment_obligation` (`source_kind='contractor_payable'`, `obligation_kind='provider_payroll'`, `amount=net_payable`) → `payment_order` (Finanzas) → settle al banco. **El último paso está bloqueado para contractors**:

- `src/lib/finance/payment-orders/mark-paid-atomic.ts` (~línea 348) y `src/lib/finance/payment-orders/record-payment-from-order.ts` (~línea 218) **ambos** filtran `if (line.source_kind !== 'payroll' || line.obligation_kind !== 'employee_net_pay') throw PaymentOrderSettlementBlockedError('out_of_scope_v1')`.
- Un contractor payable tiene `source_kind='contractor_payable'` + `obligation_kind='provider_payroll'` → **lanza `out_of_scope_v1` en el path atómico Y en el safety-net** → la orden no se marca pagada por el camino canónico.
- El CHECK de `payment_obligations.obligation_kind` SÍ admite `provider_payroll`, pero el comentario de la migración (`20260501140545647`) lo describe literalmente como "placeholder Deel/EOR".
- Consecuencia: hoy la obligación + la orden de pago de un contractor se pueden crear, pero **el dinero no sale del banco por el motor canónico de liquidación**. Es un gap de **backend**, NO de UI — ninguna de las tasks de pantallas (TASK-974/975/976) lo cubre.

**Invariante a respetar al cerrar el gap**: extender el resolver de settlement para soportar `source_kind='contractor_payable'`/`obligation_kind='provider_payroll'` debe resolver el `expense_id` por un camino propio (el actual lo busca en `expenses WHERE payroll_period_id=...`, que no aplica a contractors) y clasificar el expense como `economic_category='labor_cost_external'` — NUNCA como nómina dependiente. El gross/withholding/net se leen verbatim del payable (TASK-793/794).

### Hecho verificado 2 — No existe lógica de calendario de pago (cierre + 5 días) para contractors

Grep exhaustivo (`first 5 days`, `cierre.*5`, `month_close`, `payout_due`, etc.) en `contractor-engagements/`, `payment-obligations/`, `payment-orders/`, `calendar/` → **vacío**. El `ContractorPayable.due_date` se setea por **input manual** (`body.dueDate ?? null` en `POST /api/finance/contractor-payables`), default vacío; no se computa desde el cierre del período operativo. El compromiso operativo de "pagar dentro de los primeros 5 días posteriores al cierre de mes" hoy es **manual/operativo**, no enforced por el sistema.

### Target de diseño — Convergencia con el ciclo de pago mensual

El punto canónico de convergencia entre nómina y contractors es **la capa de payment_obligations → payment_orders** (TASK-748/750): ambos rieles (`employee_net_pay` desde payroll, `provider_payroll` desde contractor payables) llegan a la misma tabla de obligaciones y se pagan desde el mismo workbench `/finance/payment-orders`. Para honrar el compromiso de los 5 días de forma sistémica se necesita (open design items, NO implementados):

1. Cerrar el gap de settlement (`provider_payroll` → bank) — **prerequisito duro**; sin esto el contractor no se paga por el camino canónico.
2. Una regla de `due_date` derivada del cierre del período (cierre + N días hábiles) en lugar de input manual.
3. Opcional: una "corrida mensual" que arme las órdenes de pago de contractors del período (hoy es ad-hoc).
4. Un signal de SLA ("payables/obligaciones de contractor vencidas vs el compromiso de 5 días") — hoy no existe.

Doc funcional asociado: `docs/documentation/hr/contratistas-flujo-de-pago-completo.md` (explica el flujo + estos gaps en lenguaje simple).

## Delta 2026-05-30 — TASK-957 Contractor↔Legacy Payroll Double-Rail Exclusion + Current Work Classification

Cierra la open question de TASK-956 con veredicto 3-skill (finance + payroll + arch). Una persona podía cobrar por **dos rieles** sin exclusión mutua: nómina legacy honorarios (motor rutea por `compensation_versions.contract_type='honorarios'` → retención SII) + contractor payable (TASK-794, misma retención). Ambos corriendo → **doble-pago + doble declaración F29** (Efeonce remesa doble al SII + doble crédito tributario). SSOT canónico: **existencia de `ContractorEngagement` activo, NO `member.contract_type`**.

- **Slice A** — gate `src/lib/payroll/contractor-exclusion/` (espejo exit-eligibility): excluye del roster legacy a quien tiene engagement engaged (active/paused/ending), flag `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` default OFF (parity bit-for-bit), keyed por engagement (NO `contract_type` → contractors Deel legacy sin engagement intactos). Señal `payroll.contractor.double_rail_overlap` (moduleKey payroll, error si count>0, corre regardless del flag). Hallazgo live: Valentina tenía comp version v2 sin cerrar (`effective_to=NULL`) pese a offboarding executed → remediado vía `scripts/payroll/close-contractor-orphan-comp-version-task957.ts` → señal steady=0.
- **Slice B** — `member.contract_type` NO se muta (es tipo de contrato de EMPLEO, historia cuando termina; `'honorarios'` rutearía al riel SII legacy; nuevo enum = SSOT competidor + extiende taxonomía gobernada + rompe boundary). Resolver canónico `resolveCurrentWorkClassification` (`src/lib/account-360/`) lee la relación/engagement activa → clasificación vigente. Person 360 (`PersonProfileTab`) muestra "Estado vigente" (Contractor · Honorarios) + "Contrato de empleo" (historia). Fix latente: `toDateStr` robusto a Date (getPersonHrContext lanzaba para cualquier hire_date no-null).
- Gates: no-regresión (payroll+offboarding+contractor) 673 · `pnpm test` 5637/0 · `pnpm build` ✓ · GVC Person 360 Valentina mostrando "Estado vigente: Contractor · Honorarios". Audit: 0 callsites legacy filtran empleados activos por contract_type+active.

## Delta 2026-05-30 — TASK-956 Employee→Contractor connected command (entry point cableado)

Cierra el **seam huérfano** del dominio: la transición employee→contractor que abre el `ContractorEngagement` no tenía caller ni entry point — `transitionEmployeeToContractor` (TASK-789) tenía 0 callers y la creación de engagement vivía solo en seeds/tests. Un colaborador que renunciaba (offboarding `executed`) y volvía como contractor quedaba sin engagement → sin superficie self-service (TASK-796) → sin payables. **Additive, cero código payroll, read-only/append-only sobre finiquito + offboarding.**

- **Comando conectado atómico** `transitionEmployeeToContractorEngagement(input)` (`src/lib/contractor-engagements/transition-from-employee.ts`): cierra la relación `employee` + abre la `contractor` + crea el `ContractorEngagement` en **una sola `withGreenhousePostgresTransaction`**. Compone `transitionEmployeeToContractor` (TASK-789) + `createContractorEngagement` (TASK-790) vía **dual-mode** (`client?: PoolClient` opcional — patrón TASK-765/771/872). Idempotente/orphan-resume (`already_complete` / `engagement_created_on_existing_relationship` / `transitioned`). Mapper puro `mapRelationshipSubtypeToEngagementSubtype` (honorarios→honorarios_cl; contractor+CL→freelance; contractor+non-CL→international_contractor).
- **Keyed en el offboarding case `executed`** (decoupled de la ratificación notarial del finiquito) → cierra por el camino canónico sin forzar. **NUNCA muta** `member.contract_type`, `final_settlements` ni el status del offboarding (solo el evento append-only de TASK-789).
- **Entry point HR**: `POST /api/hr/contractors/transition-from-offboarding` (`requireHrTenantContext` + reuse capability `hr.contractor_engagement:manage` — su contrato canónico TASK-790 ya cubre "transition"; sin proliferar capability).
- **Reliability signal** `hr.contractor.transition_orphan` (moduleKey identity, kind drift, steady=0): relaciones `contractor` activas creadas por transición (`source_of_truth IN (workforce_relationship_transition, operator_reconciliation)`) **sin** `ContractorEngagement` no-cancelado asociado — el estado parcial que el comando atómico previene pero que reconcile-drift (TASK-891, que NO crea engagement) podría dejar. Defense-in-depth observable.
- **Fix latente TASK-790 expuesto** (patrón TASK-765 "mi cambio expuso un bug de dependencia → lo arreglo"): `createContractorEngagement` insertaba 31 columnas pero suplía 30 params (`classification_reviewed` $26 faltaba) — nunca surfaceó porque dev tenía 0 engagements y los tests mockeaban. El rollback atómico del comando mantuvo a Valentina pristine durante el intento fallido.
- **Valentina Hoyos ejecutada por el camino canónico** (renunció 30/04, offboarding `executed`, contractor honorarios desde 01/06): employee ended 2026-04-30, contractor honorarios active 2026-06-01, engagement `EO-CENG-0001` (`honorarios_cl`, `needs_review`, SII `cl_honorarios_2026_15_25`). Member (`indefinido`), finiquito y offboarding **intactos**. GVC poblado verificado (self-service `honorarios_ready`/"Falta soporte", entidad `Efeonce Group SpA`).
- Gates: hard-rule `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding src/lib/contractor-engagements` 661 passed · `pnpm test` 5626 passed · `pnpm build` ✓. **TASK-955** (provider settlement split + EOR) recoge el caso provider/plataforma.

## Delta 2026-05-30 — TASK-796 Contractor Self-Service Hub shipped

Las dos superficies UI del dominio están implementadas (develop), cableando los mockups aprobados al backend TASK-790→795 sin redisenar la IA. **Cero código payroll, additive.**

- **Projection canónica server-only** (patrón TASK-835/611), único productor del view-model: `src/lib/contractor-engagements/{projection-types,self-service-scenario (mapper puro),self-service-projection,hr-workbench-projection,active-engagement-flag}.ts`. `withSourceTimeout` + degradación honesta + cache TTL 30s. El mapper filtra Finance-only (provider statements/fees) — el contractor nunca los ve.
- **Carril API self-service member-scoped** (el gap load-bearing — todo lo previo era HR/Finance-gated): `GET /api/my/contractor`, `POST /api/my/contractor/work-submissions` (create+submit), `POST /api/my/contractor/attach-asset`. `requireMyTenantContext` + 2 capabilities `personal_workspace.contractor.{read_self,submit_self}` (scope own). Engagement resuelto del `identityProfileId` de sesión (anti-IDOR). HR workbench: `GET /api/hr/contractors/workbench` + review por el PATCH existente TASK-792.
- **UI**: `/my/contractor` (hero + KPIs + blockers + closure sidecar + uploaders + composer/dispute drawers + payment-profile handoff que enlaza TASK-753 + timeline + historial) y `/hr/contractors` (cola + KPIs + readiness/finance-step + inspector + signals + admin review drawer con motivo contractor-visible ≥10 chars para dispute/reject).
- **Governance**: migración `20260531030000000` seed `view_registry` + `role_view_assignments` (collaborator → self-service; HR+Finance+Admin → workbench) + `capabilities_registry` parity. **Nav dinámico** `/my/contractor` solo si hay engagement activo (flag JWT `hasActiveContractorEngagement`, mirror supervisorAccess).
- Gates: `pnpm build` ✓ · `pnpm test` 5617 passed · tsc/lint clean · grant-coverage + view-registry tests verde. Closure real = TASK-797; payment profile NO se reconstruye (TASK-753).

## Delta 2026-05-30 — TASK-795 Fase A: International Contractor Boundary + FX Policy shipped

Fase A de TASK-795 está implementada (develop). Establece la **frontera tributaria** del contractor internacional/provider en el readiness fail-closed, **sin computar withholding** (eso es `international_internal`, TASK-905/906/907). **Cero migración, cero capability, cero outbox, cero código payroll** (patrón TASK-794). **Fase B diferida** (provider settlement split + EOR beneficiary + reconciliación) — el grueso de contractors son directos por `Efeonce Group SpA`; el carril provider/EOR es minoría (YAGNI hasta que exista un contractor real por plataforma).

- **2 gates fail-closed** en `evaluatePayableReadiness` + `assessPayableReadiness`:
  - `tax_owner_review_required` (universal): bloquea cuando `tax_compliance_owner ∈ {manual_review_required, country_engine_owned}`. El dominio contractor NUNCA aplica una tasa Chile→no-residente; bloquea + escala al motor `international_internal` (TASK-905) o a revisión humana (D-795-4).
  - `fx_policy_unresolved` (solo cross-currency): exige `fx_policy_code` declarado en el engagement; una tasa que existe no basta — el cambio debe ser auditable (D-795-1).
- **2 reliability signals** (moduleKey finance, steady=0): `finance.contractor_payable.tax_review_overdue` (drift >7d) + `finance.contractor_payable.fx_unresolved_overdue` (lag >3d). Leen `readiness_json->'blockers'` (JSONB `@>`), timestamp arithmetic (gate TASK-893).
- **Decisiones canónicas** (ya en spec D-795-1..5): moneda CLP/USD rail (lo exótico → manual), split fee/spread separado (Fase B), contractor ≠ Provider + payee ≠ atribución, frontera dura vs 905, entidad contratante (`legal_entity_organization_id`) como dimensión raíz + roadmap multi-entidad (EEUU). Ver el "Modelo dimensional canónico" Delta de esta misma fecha.

## Delta 2026-05-30 — Modelo dimensional canónico del Contractor (entidad contratante + frontera tributaria)

> Design note (NO cambia código ni el modelo de payroll — lo robustece y le da single source of truth a TASK-795/796/797/798/905/906/907). Origen: diseño pre-ejecución de TASK-795 con `arch-architect` + `greenhouse-payroll-auditor`.

Un Contractor se describe por **6 dimensiones ortogonales** que NUNCA se colapsan en un solo enum. Verificadas en el modelo TASK-790:

| # | Dimensión | Campo canónico | Valores hoy |
|---|---|---|---|
| 1 | Persona que trabaja | `contractor_engagements.profile_id` | Persona / Colaborador (`identity_profiles`) |
| 2 | **Entidad contratante / legal** (raíz) | `contractor_engagements.legal_entity_organization_id` (NOT NULL) | **Efeonce Group SpA** (Operating Entity, `organizations.is_operating_entity=TRUE`) |
| 3 | Canal de pago | `payroll_via` (enum propio) | `internal` (directo) / `deel` / `remote` / `oyster` / `manual_provider` / `direct_international` |
| 4 | Tax / compliance owner | `tax_compliance_owner` | `greenhouse_policy` / `provider_owned` / `manual_review_required` / `country_engine_owned` |
| 5 | Payee de la obligación | `contractor_payables.beneficiary_*` | persona (directo) / provider (EOR) |
| 6 | Sujeto de atribución de costo | la persona del engagement | **SIEMPRE la persona** |

**Invariantes canónicos (robustecimiento, no cambio):**

- **La entidad contratante (dim 2) es la dimensión raíz.** El payee (dim 5) y el tax owner (dim 4) son **consecuencias** de ella, no dimensiones independientes. Reusa la **Operating Entity canónica** (`is_operating_entity=TRUE`) — extender, no parallelizar.
- **El contractor (la persona) NUNCA es un `greenhouse_core.providers`.** Solo la plataforma/EOR (Deel/Remote/Oyster) es un Provider comercial (payee de facturas EOR/fee). El catálogo TASK-701 ya contempla `provider_type='payroll_processor'/'payment_platform'`.
- **Payee ≠ atribución de costo.** En EOR el banco paga a Deel (provider), pero el costo laboral se atribuye SIEMPRE a la persona (member loaded cost / client economics).
- **La entidad contratante × país del contractor determina el régimen tributario:**
  - Efeonce SpA (Chile) × honorario CL residente → retención SII (TASK-794) ✅
  - Efeonce SpA (Chile) × no-residente → Chile→no-residente LIR Art. 59/74 → **TASK-905/906/907** (`international_internal`)
  - Deel (EOR) × worker en su país → payroll/tax local del provider → `provider_owned`
- **Frontera dura Contractor Payables ↔ Withholding Engine:** este dominio (790-798) **NUNCA computa retención Chile→no-residente** (treaty rates, certificados de residencia). Eso es el régimen `international_internal` + TASK-905/906/907. Un engagement directo internacional queda `manual_review_required`/`country_engine_owned` y **escala** al motor de withholding; nunca aplica una tasa por su cuenta.
- **Roadmap multi-entidad (operador 2026-05-30):** HOY la única entidad contratante es `Efeonce Group SpA` (Santiago, Chile). Efeonce abrirá entidades legales en varios países (**EEUU primero** → `Efeonce US Inc`). Cada una será **una fila nueva en `organizations`** (`is_operating_entity=TRUE`, country distinto), un valor nuevo de `legal_entity_organization_id`, **sin rediseño del engagement** — pero cambia el régimen (un US contractor bajo `Efeonce US Inc` = US doméstico, no retención chilena). Eso es una **task futura multi-entidad/multi-jurisdicción**. **Regla dura: leer la entidad contratante del campo `legal_entity_organization_id`; NUNCA hardcodear "Efeonce/Chile" en código.** El modelo de "operating entity única" actual deberá volverse multi-entidad cuando abra EEUU (consideración futura, fuera de 790-798/905).

### Invariantes contables (review `greenhouse-finance-accounting-operator` 2026-05-30)

> Robustecimiento: nombra la realidad contable para que el código futuro no trate la retención como "un número" ni mezcle líneas P&L. No cambia el modelo de payroll.

- **La retención NO es una reducción de costo — es un PASIVO a remesar al SII.** Contablemente: `Dr gasto laboral (BRUTO)` / `Cr banco (NETO al contractor)` / `Cr retención por enterar al SII (withholding)`. El **gasto es el bruto** (costo laboral completo); el `net` es lo que recibe el contractor; la retención (honorarios SII TASK-794 o Chile→no-residente TASK-905/F50) es una **obligación de remesa** que Efeonce, como **agente retenedor**, debe enterar vía **F29/F50 (día 12/20 del mes siguiente)**. Cuando Efeonce remesa, ese pago es `economic_category='tax'`.
  - **Estado HOY:** la retención se computa y persiste (`siiRetentionAmount`), y la reconciliación contra F29 es **manual** (nota en `generate-payroll-excel.ts`). **NO existe** una obligación de remesa automatizada (pasivo→SII) en el flujo contractor/honorarios.
  - **Candidate future task (cross-cutting, NO 790-798/905):** "SII Withholding Remittance Obligation + F29/F50 reconciliation" — materializar la retención como obligación de remesa + conciliarla. Abarca payroll honorarios + 794 + 905 + IVA. Fuera del scope de este epic; se nombra para que no se pierda.
- **Reconocimiento del gasto = devengo en el período del trabajo (matching, IAS 1 / NIIF).** El costo laboral del contractor se reconoce cuando el **trabajo se realiza/aprueba** (la work submission TASK-792 lleva el período), NO cuando se paga. Para member loaded cost / client economics, **atribuir al período del trabajo**, no al `payment_date`. El payable es "obligación aprobada PREVIA a Finance" — el devengo precede al pago.
- **Clasificación P&L de los componentes** (categorías canónicas TASK-768 que **ya existen** — no agregar enum): worker payout → `labor_cost_external` (opex), provider fee → `vendor_cost_professional_services` (opex), FX spread → `financial_cost` (resultado financiero), remesa SII → `tax`. El **FX realizado en settlement** fluye por el layer canónico de pagos (`expense_payments.fx_gain_loss_clp` → "Resultado cambiario", TASK-699/766) — el payable no recomputa FX.
- **Defensa de tasa SII (discrepancia entre skills detectada 2026-05-30):** la tasa honorarios **2026 = 15,25%** es la canónica (Ley 21.133, +0,75 pp/año: 2024=13,75%, 2025=14,5%, 2026=15,25%, 2027=16%, 2028=17%), validada por `getSiiRetentionRate` (SSOT payroll) + watchlist `greenhouse-payroll-auditor`. Algunas referencias externas muestran un schedule viejo (2026=14,5%) — **es stale; NO bajar el código a 14,5%.** Single source of truth = `src/types/hr-contracts.ts` `SII_RETENTION_RATES`.

## Delta 2026-05-31 — TASK-960 Contractor Remittance Advice ("Comprobante de Pago") shipped

El contractor pagado ahora recibe un **Comprobante de Pago / Remittance Advice**: proyección **read-only** del `ContractorPayable` pagado (TASK-793), jurisdiction-neutral, **NO laboral, NO documento tributario** (referencia el BHE/invoice del contractor, no lo reemplaza). Ver + descargar en ambas superficies (Self-Service Hub del contractor + Admin Workbench HR/Finance).

- **Un struct, dos renderers (cero drift, patrón TASK-758):** `RemittancePresentation` (`src/lib/contractor-engagements/remittance/types.ts`) alimenta el visor MUI in-app (`RemittanceAdviceViewer`) y el PDF descargable (`generate-contractor-remittance-pdf.tsx`). El presenter `buildRemittanceAdvice(input, locale)` es PURO y lee montos **verbatim** del payable (cero recompute; retención SII desde `taxWithholdingRateSnapshot`). El resolver server-only `resolveRemittanceAdvice` gatea `status='paid'`, resuelve issuer (Operating Entity por id, multi-entidad forward-compat), beneficiario (name + tax masked TASK-784), locale (`identity_profiles.preferred_locale`), número idempotente, y surface `engagementProfileId` para anti-IDOR.
- **Numeración `EO-RA-NNNNNN`:** correlativa gapless + atómica (advisory lock por issuer, mirror TASK-700) + persistida una vez por payable (idempotente). Registry append-only `greenhouse_hr.remittance_advice_numbers` + SQL fn `allocate_remittance_advice_number(issuer, payable)` (migración `20260531131226949`). Asignación lazy en primera emisión; las listas solo LEEN (`getRemittanceAdviceNumbersForPayables`, batched).
- **Endpoints:** `GET /api/my/contractor/remittance/[payableId]` (own, anti-IDOR `engagementProfileId === session.identityProfileId`, 404 no 403 anti-oracle) + `GET /api/hr/contractors/remittance/[payableId]` (tenant, `?locale` toggle). JSON struct o `?format=pdf` (`?disposition=inline|attachment`). Capabilities reusadas (`personal_workspace.contractor.read_self` + `hr.contractor_engagement`) — sin capability nueva, sin outbox nuevo, sin reliability signal nuevo (read-only).
- **Bilingüe** es-CL/en-US (sigue el locale del contractor; copy en `src/lib/copy/remittance.ts`). **Dirección visual aprobada (vinculante):** un solo acento verde `#2E7D32` en el neto, título/chip/disclaimer neutros, logo Efeonce única marca, **sin firma**.
- **Proyecciones (TASK-796) extendidas (aditivo):** `ContractorSelfServiceScenario.paidRemittances` + `ContractorHrWorkbenchProjection.remittances`.
- **V1:** línea FX informacional omitida (el payable tiene `fxPolicyCode`, no la tasa aplicada → honest degrade, nunca inventa FX) — follow-up. **Out of scope:** Withholding Certificate anual (Certificado N°21 SII) — follow-up.

Invariantes duros en `CLAUDE.md` → "Contractor Remittance Advice invariants (TASK-960)". Spec: `docs/tasks/complete/TASK-960-contractor-remittance-advice.md`.

## Delta 2026-05-31 — TASK-968 Contractor Agreed-Amount Setup + SoD + Guardrail shipped

Cierra el gap "¿dónde se setea el monto acordado del contractor?": los campos `contractor_engagements.rate_amount`/`rate_type`/`payment_cadence` existían (TASK-790) + el PATCH `update`, pero NO había UI para fijarlos (Valentina `EO-CENG-0001` quedó con `rate_amount=null`). Ahora el monto se fija desde admin con **separación de funciones (SoD)** dura: **HR fija ≠ contractor cobra ≠ Finance paga**.

- **3 superficies (mockup aprobado vinculante):** (A) **Admin compensation editor** — `ContractorEngagementCompensationDrawer` + `CompensationPanel` en el workbench; HR fija `rateType`/`rateAmount`/`paymentCadence` vía `PATCH /api/hr/contractors/[id]` action `update` (capability `hr.contractor_engagement:update`); **moneda read-only** (se define al crear el engagement). (B) **Contractor self-service** — `ContractorSubmissionComposer` ya NO tiene campo libre de bruto; lo **deriva read-only** del rate acordado (fixed → rate; timesheet → qty × rate); sin rate → submit deshabilitado + warning. `ContractorSelfServiceView` muestra "Monto acordado" read-only. (C) **Finance guardrail** — `ContractorGuardrailPanel` lista payables bloqueados por exceder lo acordado + autoriza override.
- **Guardrail fail-closed (`evaluatePayableReadiness`, gate `payment_exceeds_agreed_amount`):** flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (default OFF → parity bit-for-bit). ON: payable con `gross > agreedAmount` (tolerancia 0.01) se bloquea salvo override. **Solo rate types de período** (`fixed`/`retainer`/`milestone`/`project` — `PERIOD_AGREED_RATE_TYPES`); unit-rate (`hourly`/`daily`) = no-op (`agreedAmount=null`, porque qty × rate excede legítimamente el rate por-unidad).
- **Override gobernado (maker-checker, SoD):** capability `finance.contractor_payable.override_agreed_amount` (admin-only, **distinta** de la HR que fija el monto) + columna `agreed_amount_override_reason` (espejo del waiver TASK-793; actor+timestamp en `contractor_payable_events` append-only) + helper `overridePayableAgreedAmount` + endpoint `POST /api/finance/contractor-payables/[id]/override-agreed-amount`. Migración additive `20260531160513123`.
- **2 reliability signals (steady=0):** `hr.contractor_engagement.rate_unset` (data_quality, identity, warning>0 — engagements activos sin `rate_amount`; detecta el gap "falta fijar el monto", verificado live = Valentina) + `finance.contractor_payable.exceeds_agreed_amount` (drift, finance, warning>0 — payables bloqueados sin override).
- **Boundary (TASK-957/EPIC-013):** cero cambios a payroll engine / `payroll_entries` / `contract_type` / finiquito; `pnpm vitest run src/lib/payroll` verde como gate de cierre.

Invariantes duros en `CLAUDE.md` → "Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968)". Spec: `docs/tasks/complete/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md`.

## Delta 2026-05-30 — TASK-794 Chile Honorarios Compliance + SII Retention shipped

La capa de compliance Chile honorarios sobre Contractor Engagements + Payables está implementada. **No toca el motor de nómina legacy** (`src/lib/payroll/calculate-honorarios.ts`, `SII_RETENTION_RATES`) — cero cambio de números payroll (suite `src/lib/payroll` verde, 602 tests). **Sin migración**: el schema existente (`contractor_payables.readiness_json` / `source_snapshot_json`, `contractor_engagements.classification_risk_status` + `tax_withholding_*`) soporta todo el alcance.

- **Módulo canónico** `src/lib/contractor-engagements/chile-honorarios/` — capa de compliance honorarios. NO es dueño de la tasa SII: la tasa vive en `getSiiRetentionRate` (payroll SSOT) y se expone a contractors vía `resolveHonorariosWithholdingPolicy` (TASK-790). El módulo reusa esas primitivas + agrega los invariantes honorarios.
  - `resolveChileHonorariosPolicy({emissionYear, boletaFolio?})` → snapshot versionado (`policyCode` `cl_honorarios_<year>_<rate>` + `rateSnapshot` + `emissionYear` + `boletaFolio` where present).
  - `computeChileHonorariosPayout({grossAmount, rateSnapshot})` → breakdown **SII-only** (`deductions: [{kind:'sii_retention', amount}]`), delega a `computeContractorWithholding` (TASK-793 SSOT) — nunca re-implementa `gross * rate`.
  - `assertNoDependentDeductions(kinds)` + `DEPENDENT_DEDUCTION_KINDS` (afp/fonasa/isapre/afc/sis/mutual/iusc/apv/gratificacion_legal): guard canónico — el SSOT de "qué está prohibido en honorarios".
  - `buildHonorariosPolicySnapshot(...)` → snapshot auditable persistido en `payable.source_snapshot_json.honorariosPolicy` (ambos create paths).
  - `resolveHonorariosReadiness({profileId})` (server-only) → RUT verificado vía person-legal-profile `honorarios_closure` (CL_RUT `verified`; fail-closed; sin dirección).
- **3 gates fail-closed nuevos** en `evaluatePayableReadiness` + `assessPayableReadiness`:
  - `classification_risk_blocking` — **universal** (todos los lanes). Defensa payable-level que espeja el CHECK del engagement `active ⇒ classification_risk no bloqueante`: un payable creado cuando el engagement estaba clear no llega a Finance si el engagement escaló a `legal_review_required`/`blocked`.
  - `rut_unverified` — **honorarios only**. Bloquea si el profile no tiene CL_RUT verificado.
  - `honorarios_withholding_mismatch` — **honorarios only**. Recompute SII-only del payout y bloquea si el `withholding`/`net` persistido difiere → atrapa cualquier deducción dependiente o tasa errónea embebida.
- **Reliability signal** `hr.contractor_payable.honorarios_rut_unverified` (kind=data_quality, moduleKey=identity, steady=0): cuenta honorarios_cl activos sin CL_RUT verificado (payable bloqueado). Análogo contractor de `identity.legal_profile.payroll_chile_blocking_finiquito`.
- **Sin migración, sin capabilities/outbox nuevos**: reusa `finance.contractor_payable:manage` (gate de `transitionPayableToReadyForFinance`) + evento `workforce.contractor_payable.blocked v1` (ya lleva `blockerCodes`).

### Cutover: payroll honorarios legacy → contractor payables

Honorarios coexiste hoy en **dos canales**, ambos usando la MISMA tasa SII SSOT (`getSiiRetentionRate`):

| Canal | Cómputo | Estado |
|---|---|---|
| **Payroll legacy** (`calculate-honorarios.ts` → `payroll_entries.siiRetentionAmount`) | retención SII en la corrida de nómina mensual | Vigente. NO se migra masivamente. Los pagos legacy no se rompen. |
| **Contractor payable** (TASK-794, este canal) | payable con readiness fail-closed (RUT + classification + SII-only) → `payment_obligation` Finance | Canal canónico para pago flexible/honorarios gobernado hacia adelante. |

**Convergencia gradual** (no big-bang): el pago flexible de honorarios fluye hacia Contractor Engagements + Payables; las entradas de payroll honorarios legacy continúan hasta una migración explícita por miembro. El cierre del honorarios es `contractor_closure` (TASK-797), **NUNCA** finiquito (`final_settlements`). Ni el canal legacy ni el contractor payable aplican jamás AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC dependiente — solo retención SII.

## Delta 2026-05-30 — TASK-793 ContractorPayable + Finance bridge shipped

`greenhouse_hr.contractor_payables` es el agregado de **obligación económica aprobada PREVIA a Finance** (Workforce/HR → Finance). El payable listo genera UNA `payment_obligation` vía bridge reactivo; Finance sigue siendo owner de payment orders + banco + conciliación.

- **State-machine + CHECK + audit-trio** (patrón TASK-700/765/790/792): `contractor_payables` (CHECK enums + CHECK `net = gross − withholding` + CHECK `economic_category = 'labor_cost_external'` + BEFORE UPDATE transition trigger) + append-only `contractor_payable_events`. Estados: `pending_readiness → ready_for_finance → obligation_created → payment_order_created → paid`, + `blocked` (recoverable) + `cancelled`. Mirror TS `assertValidPayableTransition`.
- **Anchor**: FK NOT NULL a `contractor_engagements` (RESTRICT) + FK opcional a `contractor_work_submissions` (lane PAYG/milestone). El `createFromSubmission` consume la submission (`consumed_by_payable_id`) en la misma tx — dup-guard DB UNIQUE + lock approved∧unconsumed. ALTER `contractor_work_submissions` cierra la FK que TASK-792 dejó NULL forward-compat.
- **Withholding**: `computeContractorWithholding` retiene SOLO honorarios CL bajo `greenhouse_policy` con `taxWithholdingRateSnapshot` del engagement (TASK-790, NUNCA recomputa la tasa SII); resto = 0 (provider/country engine maneja su tax). `net = gross − withholding` (CHECK DB).
- **Readiness fail-closed** (`evaluatePayableReadiness`, pure, 7 gates): source aprobado / invoice-asset cuando `requires_invoice` / net reconcilia / currency ∈ {CLP,USD} / FX resuelto cuando `payment_currency ≠ currency` / payment-profile resuelto **o waiver gobernado** / provider-split cuando `payroll_via ∈ {deel,remote,oyster}`. `assessPayableReadiness` resuelve los inputs (invoice via `listContractorInvoiceAssetsByEngagement`, FX via `getLatestStoredExchangeRatePair`) y alimenta el evaluador puro. Bloqueado → `blocked` + `blockerCodes[]` + throw.
- **Bridge** (TASK-771 reactive pattern): projection `contractor_payable_finance_obligation` consume `workforce.contractor_payable.ready_for_finance`, re-lee el payable de PG (NUNCA confía el payload), skip idempotente si no existe / no-ready / unsupported currency, crea UNA `payment_obligation` (`createPaymentObligation`, idempotente por UNIQUE; `source_kind=contractor_payable`, `amount=net_payable`, `obligation_kind=provider_payroll`) y marca `obligation_created` (`markPayableObligationCreated`, no-op si ya linkeado). `maxRetries=5` + dead-letter del reactive log. ALTER `payment_obligations` source_kind `+contractor_payable` (additivo, shared Finance infra).
- **Access**: capabilities `finance.contractor_payable` (read/create/manage) + `finance.contractor_payable.waive_payment_profile` (update, admins-only) + runtime grants (finance route_group ∪ FINANCE_ADMIN ∪ EFEONCE_ADMIN). API `/api/finance/contractor-payables` (list/create + detail + ready + cancel + waive) con `can(tenant,…)` + es-CL errors + `captureWithDomain`/`redactErrorForResponse`.
- **Reliability** (moduleKey finance, rollup Finance Data Quality): `finance.contractor_payable.ready_without_obligation` (lag, payables ready >30min sin obligación) + `finance.contractor_payable.bridge_dead_letter` (dead_letter, reactive log `result='dead-letter'`). Wired en `getReliabilityOverview`. Steady=0.
- **Guardrail payroll (no-regresión)**: el payable NUNCA escribe `payroll_entries`/`payroll_adjustments`/`compensation_versions`/`final_settlements` ni muta `members.{payroll_via,contract_type,pay_regime}`. Gate `pnpm vitest run src/lib/payroll` verde (522 passed).

## Delta 2026-05-30 — TASK-792 Contractor Work Submissions shipped

El agregado `ContractorWorkSubmission` está implementado: evidencia de trabajo con lifecycle de aprobación/disputa/rechazo, ANTES de generar un payable. La aprobación operacional NO es ejecución de pago.

- **Tabla** `greenhouse_hr.contractor_work_submissions` (migración `20260531000000000`): tipos {timesheet, milestone, deliverable, project_fee, expense, off_cycle_adjustment}, estados {draft, submitted, approved, disputed, rejected, cancelled} con state machine + CHECK enums + CHECK `approved ⇒ gross_amount NOT NULL` + trigger de transición. Append-only `contractor_work_submission_events` (anti-UPDATE/DELETE).
- **Evidencia (D-792-1)**: reusa el ledger TASK-791 vía columna additiva `contractor_invoice_assets.contractor_work_submission_id`; `attachContractorInvoiceAsset` extendido. Delivery refs (project/sprint) en `metadata_json`.
- **Readiness + dup guard (D-792-3)**: `listWorkSubmissionsReadyForPayable` (approved ∧ unconsumed) + `markContractorWorkSubmissionConsumed` (idempotente) + columna `consumed_by_payable_id` NULL forward-compat (TASK-793 agrega la FK).
- **Workflow** (`work-submissions/store.ts`): create/updateDraft/submit/review(approve|dispute|reject)/cancel/markConsumed en tx + outbox v1 + audit. dispute/reject reason ≥10; approve exige gross; cancel bloqueado si consumido.
- **Access (D-792-4)**: capabilities `hr.contractor_work_submission` (read/create/update/manage) + `.review` (read/approve). API `/api/hr/contractors/work-submissions` (+ `[id]`).
- **Reliability**: signal `hr.contractor_work_submission.review_overdue` (drift, steady=0).
- **UI** deferida a TASK-796 (D-792-6).

Pendiente: ContractorInvoice aggregate + FK `contractor_invoice_id`/`consumed_by_payable_id` (TASK-792 follow-up / TASK-793), ContractorPayable + Finance bridge (TASK-793), self-service UI (TASK-796).

## Delta 2026-05-30 — TASK-791 Contractor Invoice Assets shipped

La capa de assets del "Contractor Invoice Upload / Asset Contract" está implementada, reutilizando el uploader privado canónico (TASK-721) sin bucket nuevo.

- **Contexts** (`src/types/assets.ts`): `contractor_invoice_draft`/`contractor_invoice`, `contractor_work_evidence_draft`/`contractor_work_evidence`, `provider_invoice_draft`/`provider_invoice`, `provider_payout_statement`. Retention: `contractor_invoice` + `contractor_work_evidence` nuevas; provider reusa `provider_supporting_doc`.
- **Tabla hija** `greenhouse_hr.contractor_invoice_assets` (migración `20260530203116605`): ledger append-only (anti-UPDATE/DELETE) con `asset_role` / `artifact_kind` / `source` (CHECK enums del arch doc) + `country_code` + `uploaded_by_user_id`. FK NOT NULL a `contractor_engagements` (D-791-1); `contractor_invoice_id` NULL forward-compat (TASK-792 agrega la FK al crear `contractor_invoices`). UNIQUE `(contractor_engagement_id, asset_id)`.
- **Helper** `attachContractorInvoiceAsset` (`src/lib/contractor-engagements/invoice-assets.ts`): valida engagement + asset (pre-flight) → INSERT link + `attachAssetToAggregate` (pending→attached) en una sola tx. `resolveFinalAttachContext` mapea draft→final y rechaza contextos no-contractor.
- **Access**: `canTenantAccessAsset` extendido — contractor self + HR/Finance/admin para docs de contractor; provider docs ocultos al contractor. **MIME**: XML/JSON solo para invoice drafts.
- **Reliability**: signal `hr.contractor_invoice_assets.broken_evidence` (data_quality, steady=0, mirror TASK-721).
- **Access model decision**: se usa el patrón de assets `hasRouteGroup`/`hasRoleCode` (NO se seedearon los entitlements propuestos `hr.contractor_invoice.*` — quedan para una task derivada uniforme si emerge governance fina). Decisión D-791-2.

Pendiente: WorkSubmission (TASK-792), ContractorInvoice aggregate + FK `contractor_invoice_id` (TASK-792), ContractorPayable + Finance bridge (TASK-793), self-service UI (TASK-796).

## Delta 2026-05-29 — TASK-790 ContractorEngagement runtime shipped

El aggregate raíz `ContractorEngagement` está implementado en runtime (Workforce/HR). Slices entregados:

- **Schema** `greenhouse_hr.contractor_engagements` (state machine + CHECK enums + risk-gate CHECK `active ⇒ classification_risk no bloqueante` + BEFORE UPDATE transition-validation trigger) + append-only `greenhouse_hr.contractor_engagement_events` (anti-UPDATE/anti-DELETE triggers). Migración `20260529221452562`.
- **Anchor (D1)**: el engagement hace FK a `person_legal_entity_relationships.relationship_id` (PK real es `relationship_id`, NO `person_legal_entity_relationship_id`) `ON DELETE RESTRICT`. La relación activa se resuelve vía `resolveActivePersonLegalEntityRelationships` (en `src/lib/account-360/person-legal-entity-relationships.ts`). El engagement NO crea relaciones (eso es TASK-789/891).
- **Subtype SSOT (D2)**: `contractor_engagements.relationship_subtype` (5 valores finos: `honorarios_cl`, `freelance`, `independent_professional`, `international_contractor`, `provider_platform`) es SSOT propio, validado por consistencia de familia contra el subtype coarse de la relación (`{contractor,honorarios}` en `metadata.relationshipSubtype`). Sin write-back. Helper `assertSubtypeConsistency`.
- **payroll_via (D3)**: enum propio del engagement (`internal/deel/remote/oyster/manual_provider/direct_international`), tipo TS distinto del `PayrollVia` de payroll. NUNCA se escribe a `members.{payroll_via,contract_type,pay_regime}`.
- **Tax owner mandatory** + honorarios CL: `tax_compliance_owner` NOT NULL (default resuelto por `resolveDefaultTaxComplianceOwner`); honorarios snapshot de tasa SII (`getSiiRetentionRate`, 2026=0.1525) + `tax_withholding_policy_code` versionado (`cl_honorarios_2026_15_25`).
- **Classification risk first-class**: `computeClassificationRisk(factors, reviewed, block)` determinístico; `clear` requiere review explícito; subordinación material → `legal_review_required` (bloquea `active` por CHECK + app guard). Escalar riesgo en un engagement `active` lo auto-pausa.
- **Módulo TS**: `src/lib/contractor-engagements/` (barrel pure-only; store server-only importado directo). Helpers puros con tests (`state-machine`, `subtype-consistency`, `classification-risk`, `tax-policy`).
- **Access**: capabilities `hr.contractor_engagement` (read/create/update/manage) + `hr.contractor_classification` (read/approve) + grants en `runtime.ts`. API `/api/hr/contractors` (GET/POST) + `/api/hr/contractors/[id]` (GET/PATCH: transition|update|review_classification).
- **Reliability**: signal `hr.contractor_engagement.classification_risk_open` (kind=drift, moduleKey=identity, steady=0).
- **Outbox v1**: `workforce.contractor_engagement.{created,activated,paused,ended,cancelled,classification_risk_flagged}` (aggregateType `contractor_engagement`).
- **Payroll non-regression**: suite `src/lib/payroll` verde (522 tests). Cero escritura a `payroll_entries`/`payroll_adjustments`/`compensation_versions`/`final_settlements`.

Pendiente (no implementado): WorkSubmission (TASK-792), Invoice + assets (TASK-791), ContractorPayable + Finance bridge (TASK-793), Chile honorarios readiness layer, provider imports.

## Purpose

Definir la expansion canonica para relaciones contractor/freelance/profesional independiente en Greenhouse, incluyendo contratacion, evidencia de trabajo, invoices/boletas, aprobacion, pagos flexibles y cierre contractual.

Este documento nace del caso Valentina Hoyos:

- relacion dependiente Chile `indefinido` terminada el `2026-04-30`
- finiquito laboral calculado/remediado por el engine de final settlement
- nueva relacion desde `2026-05-04` como contractor/freelance/profesional independiente

La decision central: Greenhouse no debe "reactivar" ni mutar la relacion laboral anterior. Debe cerrar historico y abrir una **nueva relacion juridica/economica** bajo la misma persona canonica.

Usar junto con:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`

## Market Reference

Greenhouse debe copiar el patron arquitectonico, no el producto:

- Deel Contractors API separa contratos, hiring/invites, payment schedules, amendments, terminations, invoice adjustments, timesheets, tasks, milestones y off-cycle payments. Referencia: `https://developer.deel.com/api/contractors/introduction`.
- Deel comercialmente distingue contratos fixed, PAYG y milestone: fixed genera invoices automaticas segun terminos; PAYG/milestone dependen de submission y approval. Referencia: `https://www.deel.com/solutions/payroll/contractors/`.
- Oyster modela fixed contractors y PAYG contractors con invoices auto-generadas o enviadas por contractor, approval/dispute queue y estados separados de charge/payout. Referencias: `https://docs.oysterhr.com/v0.1/docs/invoicing-at-oyster` y `https://www.oysterhr.com/how-it-works/global-contractors`.
- Remote y Oyster separan invoice de contractor, invoice/charge al cliente y payout al contractor, con tracking de estado. Referencia Remote: `https://remote.com/global-hr/contractor-invoicing-and-payments`.
- Para Chile, SII declara retencion de boletas de honorarios `15.25%` desde `2026-01-01`. Referencia oficial: `https://www.sii.cl/destacados/boletas_honorarios/index.html`.

## Core Thesis

Un contractor no es un `payroll_entry` mensual dependiente ni un `final_settlement`.

La unidad canonica para contractor es:

```text
Person
  -> PersonLegalEntityRelationship(type=contractor|honorarios|service_provider)
    -> ContractorEngagement
      -> WorkSubmission / Invoice
        -> ContractorPayable
          -> Finance Payment Obligation
            -> Finance Payment Order
```

Por lo tanto:

- `Payroll` sigue siendo owner de nomina dependiente y snapshots referenciales de payroll internacional.
- `FinalSettlement` sigue siendo solo cierre laboral dependiente Chile.
- `Finance` sigue siendo owner de obligations, payment orders, expense payments, settlement legs y banco.
- `Contractor Engagements` gobierna contrato, modalidad de pago, evidencia de trabajo e invoice/boleta antes de que Finance pague.
- `Person Legal Entity Relationships` sigue siendo la raiz juridica/economica persona -> entidad legal.

## Non-Negotiable Distinctions

### 1. Misma persona, nueva relacion

Valentina Hoyos conserva el mismo `identity_profile`. La relacion `employee/indefinido` cerrada no se muta a contractor.

El nuevo contrato debe crear o reutilizar una relacion separada:

- V1 runtime TASK-789: `relationship_type='contractor'` y, para honorarios, `metadata_json.relationshipSubtype='honorarios'`
- `effective_from='2026-05-04'`
- `effective_to=NULL` mientras este activa
- `source_of_truth='workforce_relationship_transition' | 'manual_hr' | 'contractor_engagement'`

Regla anti-regresion TASK-789: la apertura de esta relacion no debe actualizar `members.contract_type`, no debe crear `compensation_versions`, no debe crear `payroll_adjustments` y no debe habilitar `final_settlements`. El pago contractor nace en tareas posteriores desde `ContractorEngagement -> WorkSubmission/Invoice -> ContractorPayable -> Finance`.

### 2. Contractor payment no es payroll adjustment

No se deben usar `payroll_adjustments` para pagar semanas, hitos, proyectos o boletas de contractor.

Rationale:

- ajustes viven sobre un `payroll_entry` ya materializado
- contractor payables nacen desde contrato/evidencia/invoice
- mezclar ambos romperia regimen, retencion, audit y Finance

### 3. Contractor cierre no es finiquito

Un contractor/honorarios no habilita:

- `greenhouse_payroll.final_settlements`
- `greenhouse_payroll.final_settlement_documents`
- `Calcular finiquito`
- AFP/salud/AFC/IUSC dependiente

Su cierre vive como `contractor_engagement_termination` o `contractor_closure`, con evidencia contractual/proveedor.

### 4. Riesgo de clasificacion laboral es first-class

Si un contractor tiene senales de subordinacion/dependencia, Greenhouse no debe resolverlo con calculo automatico.

Senales de riesgo:

- horario fijo impuesto
- jefatura directa y control disciplinario
- exclusividad o dependencia economica material
- continuidad identica a la relacion laboral anterior
- uso de cargo interno indistinguible de empleado
- pagos recurrentes sin entregables/invoice/evidencia

Salida canonica: `classification_risk_status='legal_review_required'` y bloqueo de aprobacion/pago segun politica.

## Canonical Objects

### ContractorEngagement

Agregado que representa el contrato operativo de prestacion de servicios.

Tabla propuesta:

- `greenhouse_hr.contractor_engagements`

Campos minimos:

| Campo | Semantica |
| --- | --- |
| `contractor_engagement_id` | PK estable |
| `public_id` | ID humano |
| `profile_id` | persona canonica |
| `member_id` | faceta operativa si participa en delivery/capacity |
| `person_legal_entity_relationship_id` | relacion juridica/economica activa |
| `legal_entity_organization_id` | pagador/contratante legal |
| `country_code` | pais fiscal/operativo declarado |
| `tax_residency_country_code` | pais de residencia fiscal declarada, puede diferir del pais operativo |
| `relationship_subtype` | `honorarios_cl`, `freelance`, `independent_professional`, `international_contractor`, `provider_platform` |
| `payroll_via` | `internal`, `deel`, `remote`, `oyster`, `manual_provider`, `direct_international`, futuro |
| `currency` | moneda contractual |
| `payment_currency` | moneda en que se pagara si difiere de la contractual |
| `fx_policy_code` | regla de FX: fecha de tasa, quien absorbe spread y moneda de obligacion |
| `provider_contract_id` | contrato externo si Deel/Remote/Oyster u otro provider es source |
| `provider_worker_id` | worker/person id externo si aplica |
| `payment_model` | ver catalogo abajo |
| `rate_type` | `fixed`, `hourly`, `daily`, `milestone`, `project`, `retainer` |
| `rate_amount` | monto base |
| `payment_cadence` | `weekly`, `biweekly`, `semi_monthly`, `monthly`, `milestone`, `on_invoice`, `off_cycle` |
| `requires_invoice` | invoice/boleta obligatoria antes de payable |
| `requires_work_approval` | evidencia aprobada antes de payable |
| `tax_compliance_owner` | `greenhouse_policy`, `provider_owned`, `manual_review_required`, `country_engine_owned` |
| `tax_withholding_policy_code` | ej. `cl_honorarios_2026_15_25` |
| `classification_risk_status` | `clear`, `needs_review`, `legal_review_required`, `blocked` |
| `status` | `draft`, `pending_review`, `active`, `paused`, `ending`, `ended`, `cancelled` |
| `start_date` | inicio contractual |
| `end_date` | termino planificado si aplica |
| `metadata_json` | evidencia externa, Deel contract id, terms, scope |

### ContractorWorkSubmission

Agregado de evidencia de trabajo.

Tabla propuesta:

- `greenhouse_hr.contractor_work_submissions`

Tipos:

- `timesheet`
- `milestone`
- `deliverable`
- `project_fee`
- `expense`
- `off_cycle_adjustment`

Estados:

- `draft`
- `submitted`
- `approved`
- `disputed`
- `rejected`
- `cancelled`

Reglas:

- No genera pago por si solo.
- Debe ser aprobado por owner operacional antes de crear payable si `requires_work_approval=true`.
- Debe preservar evidence refs: proyecto, sprint, asset, documento, aprobador, fecha.

### ContractorInvoice

Agregado de invoice/boleta.

Tabla propuesta:

- `greenhouse_hr.contractor_invoices`

Tipos:

- `contractor_submitted`
- `system_generated_fixed`
- `system_generated_milestone`
- `provider_imported`

Estados:

- `draft`
- `submitted`
- `approved`
- `disputed`
- `rejected`
- `scheduled`
- `paid`
- `cancelled`

Campos criticos:

- `invoice_number`
- `invoice_date`
- `service_period_start`
- `service_period_end`
- `gross_amount`
- `tax_withholding_amount`
- `net_amount`
- `currency`
- `document_asset_id`
- `external_provider_invoice_id`
- `external_provider_payout_id`
- `sii_folio` para Chile si aplica
- `retention_rate_snapshot`

### Contractor Invoice Upload / Asset Contract

Decision canonica: las invoices/boletas que emiten contractors en sus paises se suben por el uploader compartido de Greenhouse, no por un bucket nuevo ni por URLs libres.

Runtime existente a reutilizar:

- UI: `src/components/greenhouse/GreenhouseFileUploader.tsx`
- API: `POST /api/assets/private`
- Registry/audit: `greenhouse_core.assets` y `greenhouse_core.asset_access_log`
- Bytes: bucket privado GCS resuelto por `GREENHOUSE_PRIVATE_ASSETS_BUCKET` o `greenhouse-private-assets-{env}`
- Storage helper: `src/lib/storage/greenhouse-assets.ts`

Reglas:

- Nunca guardar `gs://`, signed URLs o links externos como contrato primario de invoice.
- `contractor_invoices.document_asset_id` apunta al asset canonico adjunto.
- Soportes adicionales viven en una tabla hija propuesta `greenhouse_hr.contractor_invoice_assets`.
- Reemplazar una invoice adjunta crea nuevo asset/version y evento; no se sobreescribe el documento historico.
- Dedup por `content_hash` evita duplicar el mismo archivo en pending uploads.
- Todo download pasa por `/api/assets/private/[assetId]` con auth, access policy y audit trail.

Contextos nuevos propuestos para extender `GreenhouseAssetContext` y los maps de `greenhouse-assets.ts`:

- `contractor_invoice_draft`
- `contractor_invoice`
- `contractor_work_evidence_draft`
- `contractor_work_evidence`
- `provider_invoice_draft`
- `provider_invoice`
- `provider_payout_statement`

Retention classes propuestas:

- `contractor_invoice` para boletas/invoices emitidas por personas naturales o contractors directos.
- `contractor_work_evidence` para timesheets, milestone evidence y entregables que soportan approval.
- `provider_supporting_doc` para statements de Deel/Remote/Oyster, charge invoices, payout reports y provider fees.

Tabla hija propuesta:

- `greenhouse_hr.contractor_invoice_assets`

Campos minimos:

- `invoice_asset_id`
- `contractor_invoice_id`
- `asset_id`
- `asset_role`: `invoice_pdf`, `tax_xml`, `tax_certificate`, `work_evidence`, `provider_statement`, `payout_receipt`, `fx_receipt`, `other_supporting_doc`
- `artifact_kind`: `human_readable`, `tax_structured`, `provider_report`, `payment_proof`, `evidence`
- `source`: `contractor_upload`, `hr_upload_on_behalf`, `finance_upload_on_behalf`, `provider_import`, `system_generated`
- `country_code`
- `uploaded_by_user_id`
- `created_at`

Upload surfaces:

- Contractor/self-service: el contractor con faceta `member` sube su propia boleta/invoice y evidencia del trabajo.
- HR: sube on behalf cuando el contractor no tiene acceso al portal o cuando hay regularizacion documental.
- Finance: sube soporte de pago, FX receipt o provider charge/payout statement.
- Provider import: integra documentos de Deel/Remote/Oyster como assets privados o como refs externas cuando el proveedor no entrega archivo.

Access policy:

- Contractor: puede subir y descargar sus propias invoices/evidencias si `owner_member_id` coincide con su member facet.
- HR: puede leer/revisar invoices, work evidence y classification evidence del engagement.
- Finance: puede leer invoices aprobadas, provider statements, payout receipts y FX evidence para obligacion/pago.
- EFEONCE_ADMIN: acceso administrativo auditado.
- Provider statements no se exponen al contractor por defecto si contienen fees, margins, otros trabajadores o informacion comercial del proveedor.

Entitlements propuestos:

- `hr.contractor_invoice.upload_on_behalf`
- `hr.contractor_invoice.review`
- `hr.contractor_work_evidence.review`
- `finance.contractor_invoice.read`
- `finance.contractor_payment_evidence.manage`
- `my.contractor_invoice.upload`

MIME policy V1:

- Siempre aceptar `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Para paises donde la factura electronica oficial es XML/JSON, aceptar `application/xml`, `text/xml` o `application/json` solo en contextos `contractor_invoice_draft`/`contractor_invoice` con `asset_role='tax_xml'` y validation especifica por pais.
- No aceptar ZIP ni ejecutables para invoice V1 salvo task explicita con antivirus/inspection y retention policy separada.

Readiness:

- `ready_for_finance` exige invoice principal adjunta cuando `requires_invoice=true`.
- Si el pais exige artefacto tributario estructurado, falta de `tax_xml` bloquea readiness solo cuando exista policy pais que lo declare obligatorio.
- Invoice con archivo externo no importado queda en `manual_review_required`, no en ready.
- El payable conserva `contractor_invoice_id` y Finance conserva `source_aggregate_type='contractor_payable'` para trazabilidad end-to-end.

### ContractorPayable

Agregado de obligacion economica aprobada, previo a Finance.

Tabla propuesta:

- `greenhouse_hr.contractor_payables`

Estados:

- `pending_readiness`
- `ready_for_finance`
- `obligation_created`
- `payment_order_created`
- `paid`
- `cancelled`
- `blocked`

Campos:

- `contractor_engagement_id`
- `invoice_id`
- `work_submission_id`
- `gross_amount`
- `withholding_amount`
- `net_payable`
- `currency`
- `due_date`
- `payment_profile_id`
- `tax_compliance_owner`
- `fx_policy_code`
- `finance_obligation_id`
- `payment_order_id`
- `readiness_json`
- `source_snapshot_json`

## Payment Models

### fixed_recurring

Monto fijo por cadencia.

Ejemplos:

- retainer semanal
- retainer mensual
- bolsa fija de servicios

Regla:

- puede auto-generar invoice/payable, pero debe pasar readiness y dispute window.

### weekly_timesheet

Pago semanal por horas/dias aprobados.

Regla:

- requiere `ContractorWorkSubmission(type='timesheet')`
- calcula `gross = approved_units * rate`
- genera invoice/payable solo con aprobacion operacional

### milestone

Pago contra entregable/hito.

Regla:

- requiere milestone definido en engagement o scope
- solo se paga cuando el hito pasa a `approved`

### project_fee

Monto cerrado por proyecto.

Regla:

- puede dividirse en installments/milestones
- no requiere timesheet si el contrato define entregables

### payg_invoice

El contractor emite invoice/boleta por trabajo prestado.

Regla:

- Greenhouse no inventa monto
- valida invoice, retencion y evidencia antes de payable

### off_cycle

Pago excepcional.

Ejemplos:

- ajuste
- reimbursement
- bono pactado
- correccion de invoice disputada

Regla:

- requiere reason, approval y evidencia estructurada

## Chile Honorarios Policy

Para `relationship_subtype='honorarios_cl'`:

- No aplicar AFP, Fonasa/Isapre, AFC, SIS, mutual ni IUSC dependiente.
- Aplicar retencion SII de boletas de honorarios segun fecha de emision.
- Para 2026, tasa canonica actual: `15.25%`.
- La retencion debe versionarse en `tax_withholding_policy_code` + snapshot de tasa.
- Boleta/invoice es evidencia de pago; si el pago se hace antes de la boleta, el flujo debe explicitar excepcion y deuda documental.
- Readiness debe consumir `person-legal-profile` con use case `honorarios_closure` o equivalente: RUT/documento verificado como blocker; direccion puede ser warning o blocker segun politica tributaria/documental.

Formula V1:

```text
gross_amount = monto bruto boleta/invoice o monto contractual aprobado
withholding_amount = round(gross_amount * retention_rate)
net_payable = gross_amount - withholding_amount
```

Si el contractor emite boleta con retencion asumida por el pagador, `net_payable` debe cuadrar contra el documento. Si no cuadra, readiness bloquea.

## Provider / Deel Boundary

Para `payroll_via in ('deel', 'remote', 'oyster', 'manual_provider')`:

- Greenhouse puede almacenar engagement, work submissions y snapshots operativos.
- El proveedor puede ser source of truth de invoice, payout, compliance local y contrato legal.
- Greenhouse no calcula impuestos locales extranjeros salvo engine especifico futuro.
- Finance debe clasificar economicamente como `labor_cost_external` o categoria equivalente, no como supplier overhead generico.
- Si el proveedor agrega charge + payout, Greenhouse debe distinguir:
  - factura/cargo proveedor a Efeonce
  - payout al contractor
  - fees/plataforma/FX

## International Contractor Policy

`contractor` no significa automaticamente `honorarios_cl`.

Greenhouse trabaja internacionalmente, por lo que la clasificacion debe resolver primero:

1. pais operacional del servicio (`country_code`)
2. residencia fiscal declarada (`tax_residency_country_code`)
3. entidad legal contratante (`legal_entity_organization_id`)
4. canal de payroll/pago (`payroll_via`)
5. moneda contractual y moneda de pago (`currency`, `payment_currency`)
6. owner del contrato/compliance (`greenhouse`, `provider`, `legal_review`)

### Decision matrix

| Escenario | relationship_subtype | payroll_via | Tax owner | Payment owner | Regla |
| --- | --- | --- | --- | --- | --- |
| Contractor residente fiscal Chile con boleta | `honorarios_cl` | `internal` | Greenhouse/SII policy | Finance via payment order | Retencion SII versionada; no payroll dependiente |
| Contractor internacional pagado por Deel | `international_contractor` | `deel` | Deel/provider | Provider payout + Finance provider charge | Greenhouse registra snapshot, costos, fees y reconciliacion |
| Contractor internacional pagado directo | `international_contractor` | `direct_international` | Legal/tax review o policy pais futuro | Finance payment order/FX route | Invoice requerida; no impuestos locales automaticos sin engine |
| EOR | `provider_platform` | `deel`/`remote`/`oyster` | Provider como legal employer | Provider charge | No contractor directo; costo laboral externo |
| Proveedor empresa/factura comercial | fuera de contractor engagement | Finance AP | Finance/tax AP | Finance AP | No crear member/contractor si es vendor comercial |

### International direct contractor

Para `payroll_via='direct_international'`:

- Greenhouse gestiona engagement, invoice, evidence, payment profile, FX y approval.
- Greenhouse no calcula impuestos locales del pais del contractor salvo que exista `tax_withholding_policy_code` jurisdiccional aprobado.
- Default V1: `tax_withholding_policy_code='manual_review_required'` o `none_by_default_providerless` segun decision legal documentada.
- El payable debe incluir:
  - `country_code`
  - `tax_residency_country_code`
  - `currency`
  - `payment_currency`
  - `fx_policy_code`
  - invoice/document evidence
  - payment route readiness

### International provider contractor

Para `payroll_via in ('deel','remote','oyster')`:

- Provider puede ser owner de contrato, tax/compliance local, invoice y payout.
- Greenhouse no debe duplicar calculo de payout legal. Debe registrar:
  - `provider_contract_id`
  - `provider_worker_id`
  - `external_provider_invoice_id`
  - `external_provider_payout_id`
  - charge amount
  - payout amount cuando el provider lo exponga
  - provider fee
  - FX fee/spread
  - status de invoice/charge/payout
- Finance debe clasificar economicamente:
  - payout/costo labor externo como `labor_cost_external` o lane provider payroll equivalente
  - fee de plataforma como fee/proveedor de servicio, no como remuneracion
  - FX fee como costo financiero/FX segun politica Finance

### FX policy

No convertir moneda silenciosamente.

Todo contractor payable internacional debe declarar:

- moneda contractual (`currency`)
- moneda de pago (`payment_currency`)
- fecha de tasa (`fx_rate_date_policy`: `invoice_date`, `approval_date`, `payment_date`, `provider_reported`)
- fuente de tasa (`fx_rate_source`: `greenhouse_fx`, `provider`, `bank`, `manual`)
- quien absorbe spread/comision (`fx_spread_owner`: `company`, `contractor`, `provider`, `shared`)

Si no existe tasa o ruta FX confiable, readiness bloquea `ready_for_finance`.

### Country-specific engines

V1 no implementa calculos tributarios/previsionales fuera de Chile honorarios.

Regla:

- si no existe engine por pais, usar `manual_review_required`
- el sistema puede pagar invoice aprobada, pero debe dejar evidencia de que tax/compliance no fue calculado por Greenhouse
- agregar un pais nuevo requiere task especifica de compliance, no un if inline

### Classification risk international

El riesgo de reclasificacion tambien aplica internacionalmente.

Senales adicionales:

- contractor trabaja full-time con estructura de empleado
- se le asigna manager, horario y herramientas internas como dependiente
- pagos fijos sin invoice/evidencia durante periodos largos
- cambio inmediato de empleado a contractor sin cambio real de scope
- contrato via provider no coincide con realidad operacional

Salida:

- `classification_risk_status='needs_review'` al detectar senales
- `legal_review_required` si el riesgo es material
- bloqueo de auto-approval de payables hasta resolucion

## Valentina Hoyos Scenario

Estado esperado:

```text
identity_profile: Valentina Hoyos

relationship A:
  type: employee
  contract_type: indefinido
  pay_regime: chile
  payroll_via: internal
  effective_to: 2026-04-30
  offboarding_case: executed
  final_settlement: approved/remediated

relationship B:
  type: contractor / honorarios
  relationship_subtype: honorarios_cl or international_contractor
  effective_from: 2026-05-04
  status: active or pending_review
  contractor_engagement: required
  payment_model: selected by business
```

Recommended setup for Valentina V1:

- Si Valentina reside/tributa en Chile y emite boleta: `relationship_subtype='honorarios_cl'`, `payroll_via='internal'`, retencion SII `15.25%` para 2026.
- Si Valentina reside/tributa fuera de Chile y se paga por Deel/Remote/Oyster: `relationship_subtype='international_contractor'`, `payroll_via='deel'|'remote'|'oyster'`; provider owner de contrato/payout/compliance, Greenhouse owner de snapshot/reconciliacion/costo.
- Si Valentina reside/tributa fuera de Chile y se paga directo: `relationship_subtype='international_contractor'`, `payroll_via='direct_international'`, invoice requerida, `tax_withholding_policy_code='manual_review_required'` hasta que exista policy pais.
- `payment_model='weekly_timesheet'` si se paga por dedicacion semanal aprobada.
- `payment_model='milestone'` si el trabajo nuevo es por entregables cerrados.
- `classification_risk_status='needs_review'` al crearlo, por continuidad inmediata despues de relacion indefinida.
- Si mantiene horario, jefe, subordinacion o tareas indistinguibles de empleado: `legal_review_required`.
- No crear finiquito nuevo para esta relacion. Su cierre futuro sera `contractor_closure`.

## Lifecycle

### Engagement lifecycle

```text
draft
  -> pending_review
  -> active
  -> paused
  -> ending
  -> ended
  -> cancelled
```

Hard gates:

- `active` exige relacion persona-entidad activa.
- `active` exige payment profile approved o waiver temporal.
- `active` exige classification risk no bloqueante.
- `active` exige tax policy si `country_code='CL'`.

### Invoice/payable lifecycle

```text
work submitted / invoice submitted
  -> operational approval
  -> tax/payment readiness
  -> contractor_payable.ready_for_finance
  -> finance.payment_obligation.generated
  -> finance.payment_order.approved/submitted/paid
```

Finance sigue cerrando el pago. HR/Contractor domain no toca banco directamente.

## Resolved Architecture Decisions

Estas decisiones cierran las preguntas pendientes antes de crear epic/tasks. Si una implementacion futura contradice este bloque, debe actualizar esta arquitectura antes de escribir runtime.

### Physical ownership

`ContractorEngagement`, `ContractorWorkSubmission`, `ContractorInvoice` y `ContractorPayable` viven conceptualmente en Workforce/HR, no en Payroll.

Decision V1:

- schema fisico preferido: `greenhouse_hr`
- modulo TS preferido: `src/lib/workforce/contractors/**` o `src/lib/hr-core/contractors/**` segun patron vigente al implementar
- Payroll puede exponer compatibility readers para honorarios legacy, pero no debe ser owner del aggregate contractor
- Finance consume solo `contractor_payable.ready_for_finance`

Rationale:

- contractor payment nace desde contrato/evidencia/invoice, no desde una nomina mensual
- evita contaminar `payroll_entries` con pagos por proyecto, milestone o provider payout
- mantiene Finance como owner de banco y payment orders

### Member facet creation

`contractor_engagements` no crea `member` automaticamente.

Decision V1:

- crear/reutilizar `member_id` solo si el contractor participa en delivery, capacity, org chart operativo, People 360 interno o evaluaciones/collaboration surfaces
- no crear `member` para vendor-like contractors que solo emiten invoice comercial
- cuando no hay `member_id`, el engagement sigue anclado en `profile_id` + `person_legal_entity_relationship_id`

Rationale:

- `member` es faceta operativa, no prueba legal de contrato
- evita inflar roster/capacity/payroll con proveedores que no son colaboradores operativos
- preserva Person 360 como raiz humana cuando si hay continuidad de colaboracion

### Approval model

No hay auto-approval de contractor payables en V1.

Decision V1:

- toda invoice/work submission que genera payable requiere aprobacion explicita
- fixed recurring puede auto-generar draft invoice/payable, pero no pasar a `ready_for_finance` sin approval
- cualquier waiver debe tener reason, actor, expiration y audit trail

Rationale:

- los riesgos principales son clasificacion laboral, evidencia insuficiente, FX y duplicidad de invoice
- auto-approval puede venir en V2 solo si reliability signals, dispute windows y policy maturity estan probados

### VAT / IVA and commercial vendors

Contractor Payables no reemplaza Finance AP.

Decision V1:

- boleta honorarios Chile y contractor invoices personales viven en Contractor Engagements
- facturas comerciales de empresas/proveedores viven en Finance AP
- VAT/IVA de proveedores no-honorarios queda fuera de Contractor Payables V1
- si una empresa proveedora presta servicios, no crear `member` ni `contractor_engagement` salvo que haya una persona natural operativa que Greenhouse deba modelar

Rationale:

- mezcla de AP proveedor con contractor personal rompe economic category, VAT/SII y workforce roster
- Finance ya tiene ledger, expenses y payment orders para proveedores comerciales

### Tax/compliance owner

Cada engagement debe declarar `tax_compliance_owner`.

Valores canonicos:

- `greenhouse_policy`: Greenhouse tiene policy aprobada para calcular retencion/tratamiento, por ejemplo `honorarios_cl`
- `provider_owned`: Deel/Remote/Oyster u otro provider es owner de compliance/payout local
- `manual_review_required`: no existe engine/policy; legal/finance debe revisar antes de aprobar payables
- `country_engine_owned`: futuro, cuando exista engine por pais especifico

Default V1:

- `honorarios_cl` -> `greenhouse_policy`
- `payroll_via in ('deel','remote','oyster')` -> `provider_owned`
- `direct_international` -> `manual_review_required`

### KPI and bonus treatment

Los bonos variables no se infieren ni se omiten por ser contractor.

Decision V1:

- si el engagement incluye bono OTD/RPA/ICO, el payable debe consumir snapshot ICO o bloquear readiness
- si el provider paga el bono, Greenhouse igual debe registrar source snapshot y reconciliation evidence
- si el contrato no incluye bonos, el engagement debe declararlo explicitamente

Rationale:

- la skill Payroll marca KPI como invariante tambien para international workers
- evita pagos fuera de Greenhouse que luego dejan P&L y People 360 inconsistentes

### Payment profile and sensitive data

Todo payable debe resolver ruta de pago antes de Finance.

Decision V1:

- `payment_profile_id` aprobado es blocker para `ready_for_finance`, salvo waiver temporal con expiration
- datos bancarios sensibles siguen usando reveal/audit/capability existentes de Finance
- provider payout rails no reemplazan payment profile interno: se guardan como provider refs y se reconcilian contra provider invoice/payout

### Duplicate and idempotency policy

El sistema debe bloquear pago duplicado por invoice/submission.

Decision V1:

- uniqueness logica por `(contractor_engagement_id, invoice_id)` cuando hay invoice
- uniqueness logica por `(contractor_engagement_id, work_submission_id, payable_kind)` cuando no hay invoice aun
- bridge a Finance debe ser idempotente por `contractor_payable_id`
- payment order line debe conservar `source_aggregate_type='contractor_payable'` y `source_aggregate_id`

### Closure policy

Contractor closure es un aggregate/flow propio, no offboarding laboral dependiente.

Decision V1:

- cierre contractor verifica invoices pendientes, work submissions abiertas, provider termination refs, access handoff y activos/documentos
- no crea `final_settlement`
- no usa causal DT ni documento de finiquito laboral
- si hay disputa o risk `legal_review_required`, no permite cierre automatico

### Scope boundaries

Fuera de V1:

- motor tributario global por pais
- crypto/stablecoins
- auto-approval recurrente
- VAT/IVA de facturas comerciales
- benefits internacionales provider-owned
- reemplazar Deel/Remote/Oyster como sistema legal/compliance
- reemplazar Payment Orders de Finance

## Integration Map

### Person / Identity

Consumes:

- `identity_profiles`
- `person_identity_documents`
- `person_addresses`
- `person_legal_entity_relationships`

Rules:

- persona sigue siendo una
- cada relacion tiene lifecycle propio
- access principal puede existir aunque no haya relacion laboral dependiente

### Workforce Offboarding

Consumes/extends:

- `work_relationship_offboarding_cases`

Rules:

- `relationship_transition` puede cerrar employee y abrir contractor
- contractor closure no dispara final settlement laboral
- identity offboarding sigue separado

### Payroll

Consumes:

- contractor classification for exclusion/readiness

Rules:

- payroll mensual dependiente excluye relacion employee cerrada
- contractor payables no entran como `payroll_entries`
- honorarios payroll legacy debe converger hacia Contractor Payables si el pago nace por invoice/boleta flexible

### Finance

Consumes:

- `contractor_payable.ready_for_finance`

Produces/owns:

- `payment_obligations`
- `payment_orders`
- `expense_payments`
- `settlement_legs`
- bank impact

Rules:

- contractor payable aprobado genera obligation, no payment directo
- economic category debe ser `labor_cost_external` o `payroll`/`provider_payroll` segun source
- payment profile resolver sigue siendo canonicamente reutilizable

### Delivery / Projects

Consumes/provides:

- evidence refs for milestones, timesheets, deliverables, project scopes

Rules:

- approval del trabajo debe poder venir de owner operacional
- payable no debe depender solo de texto libre

## Events

Eventos canonicos V1:

- `workforce.contractor_engagement.created.v1`
- `workforce.contractor_engagement.activated.v1`
- `workforce.contractor_engagement.paused.v1`
- `workforce.contractor_engagement.ended.v1`
- `workforce.contractor_work_submission.submitted.v1`
- `workforce.contractor_work_submission.approved.v1`
- `workforce.contractor_invoice.submitted.v1`
- `workforce.contractor_invoice.approved.v1`
- `workforce.contractor_payable.ready_for_finance.v1`
- `workforce.contractor_payable.cancelled.v1`
- `workforce.contractor_classification_risk.flagged.v1`

Finance bridge event:

- input: `workforce.contractor_payable.ready_for_finance.v1`
- output: `finance.payment_obligation.generated.v1`

## Access Model

No reutilizar permisos de finiquito para contractor payables.

Decision V1:

- `routeGroups`: `hr`, `finance`
- `views`:
  - `equipo.contractors` o tab dentro de `equipo.offboarding`/People 360 en V1
  - `finance.payment-obligations` y `finance.payment-orders` existentes
- `entitlements`:
  - `hr.contractor_engagement.read`
  - `hr.contractor_engagement.manage`
  - `hr.contractor_invoice.upload_on_behalf`
  - `hr.contractor_work_submission.review`
  - `hr.contractor_invoice.review`
  - `hr.contractor_payable.approve`
  - `hr.contractor_classification.review`
  - `finance.contractor_invoice.read`
  - `finance.contractor_payment_evidence.manage`
  - `my.contractor_invoice.upload`
  - `finance.payment_orders.*` existente para pago
- `startup policy`: sin cambio por defecto; solo afecta entrypoints visibles si una task futura crea view nueva.

## Reliability Signals

Signals propuestos:

- `hr.contractor_engagement.classification_risk_open`
  - severity: warning/error segun edad y monto pendiente
  - steady state: 0 bloqueantes
- `hr.contractor_payables.ready_without_payment_profile`
  - severity: error
  - steady state: 0
- `hr.contractor_invoices.unapproved_past_due`
  - severity: warning
  - steady state: configurable
- `hr.contractor_payables.finance_bridge_lag`
  - severity: error si payable ready no genera obligation en ventana SLA
- `finance.provider_payroll.unclassified_expenses`
  - severity: warning/error
  - steady state: 0 post reconciliation
- `hr.contractor_payables.missing_tax_owner`
  - severity: error
  - steady state: 0
- `hr.contractor_payables.fx_readiness_blocked`
  - severity: warning/error segun due date
  - steady state: 0 vencidos
- `hr.contractor_payables.duplicate_candidate`
  - severity: error
  - steady state: 0
- `hr.contractor_bonus.missing_ico_snapshot`
  - severity: error cuando el engagement declara bono OTD/RPA/ICO
  - steady state: 0

## Data Quality / Readiness

Engagement readiness:

- person legal identity verified
- active person-legal-entity relationship
- country and tax policy present
- tax/compliance owner explicit
- payment profile approved or waiver present
- classification risk reviewed
- contract terms/scope present
- KPI/bonus policy explicit: none, fixed, or ICO-backed
- member facet decision explicit: required, not_required, or pending

Payable readiness:

- approved invoice or approved work submission
- invoice asset attached when `requires_invoice=true`
- country-required structured tax artifact attached when a country policy declares it mandatory
- gross/net/retention reconcile
- currency explicit
- FX policy and rate source explicit when `currency != payment_currency`
- due date present
- no duplicate payable for same invoice/submission
- payment route resolvable
- tax/compliance owner resolved
- provider charge/payout/fee split present when provider-owned
- ICO snapshot present when bonus is configured
- finance bridge not already consumed

## Migration Strategy

No migrar todo payroll/honorarios de una vez.

Fase 0 — Architecture and tasks:

- este documento
- task specs para runtime slices

Fase 1 — Relationship transition:

- cerrar employee
- abrir contractor relationship
- surface People 360 muestra historial y relacion activa

Fase 2 — Contractor engagements:

- CRUD engagement
- payment model
- classification risk

Fase 3 — Invoices/work submissions:

- timesheet/milestone/PAYG submissions
- approvals/disputes

Fase 4 — Payables -> Finance:

- generate payment obligation
- reuse payment profiles/payment orders
- no direct bank mutation

Fase 5 — Chile honorarios:

- retention policy versioning
- boleta evidence
- SII/F29 evidence hooks

Fase 6 — Provider imports:

- Deel/Remote/Oyster imports
- reconcile charge/payout/fees

## Implementation Scopes

No asignar IDs aqui a mano si el registro ya avanzo. Al crear la epic/tasks, usar el siguiente ID disponible en `docs/tasks/TASK_ID_REGISTRY.md`.

Suggested task set:

- Workforce Relationship Transition Foundation
- Contractor Engagements + Payment Models
- Contractor Work Submissions + Invoices
- Contractor Invoice Assets + Uploader Contexts
- Contractor Payables to Finance Payment Orders Bridge
- Chile Honorarios Compliance + Readiness Layer
- International Contractor / Provider Boundary + FX Policy
- Classification Risk + Legal Review Control Plane
- Provider Contractor Imports (Deel/Remote/Oyster)

## Closed Questions

Todas las preguntas originalmente abiertas quedan resueltas en `Resolved Architecture Decisions`:

- Chile honorarios y contractor source aggregates viven bajo Workforce/HR; Payroll queda consumidor/compatibility reader.
- `member_id` no se crea automaticamente; solo cuando existe participacion operacional.
- weekly/fixed payables no tienen auto-approval en V1.
- VAT/IVA y facturas comerciales quedan en Finance AP, fuera de Contractor Payables V1.

## Delta 2026-05-31 — Finance Contractor Payments Workbench (TASK-974)

Cierra el gap de UI de Finanzas: el backend de payables (TASK-793/794/795/968) estaba completo pero Finanzas tenía 0% de pantalla. Esta task es **UI-only sobre los 7 endpoints existentes** (cero cambios a state machine, helpers o endpoints).

- **Ruta canónica**: `/finance/contractor-payments`, ítem nuevo en el submenú **Tesorería** (junto a `payment-orders` + `cash-out`; lifecycles distintos, NO un tab). viewCode de gobernanza `finanzas.contractor_payables` (routePath `/finance/contractor-payments`) seedeado en `view_registry` + `role_view_assignments` para `efeonce_admin`/`finance_admin`/`finance_analyst` (migración `20260531195526233`, regla TASK-827).
- **Reader canónico**: `listContractorPaymentsForWorkbench` (`src/lib/finance/contractor-payments/workbench-reader.ts`) enriquece los payables con `contractorName` + `engagementPublicId`. Expuesto vía `GET /api/finance/contractor-payables?workbench=1` (backward-compatible: sin el flag, el endpoint mantiene su shape previo).
- **Breakdown verbatim**: bruto/retención/neto se leen del payable, NUNCA se recalculan en cliente. La tasa de retención honorarios CL viene del snapshot del engagement (TASK-794). El neto (`#2E7D32`) es lo que va al banco; la retención se remesa al SII por separado (F29) — refleja el invariante contable de TASK-795/977 ("gasto = bruto, retención = pasivo a remesar").
- **SoD — override reubicado**: la autorización de pago que excede el monto acordado (`finance.contractor_payable.override_agreed_amount`) y el waiver de perfil de pago se operan **desde Finanzas** (workbench), no desde HR. El panel HR `ContractorGuardrailPanel` quedó **read-only**: muestra el bloqueo informativamente + link a `/finance/contractor-payments`. Esto cierra la ambigüedad de SoD de TASK-968 (la capability era de Finanzas pero el botón vivía en superficie HR).
- **Boundary EPIC-013/TASK-957 preservado**: cero cambios a payroll engine / `payroll_entries` / `contract_type` / finiquito. Gate de cierre `pnpm vitest run src/lib/payroll` verde (532 passed).
- **Mockup aprobado vinculante**: `src/views/greenhouse/finance/contractor-payments/mockup/` (regla TASK-863). Runtime GVC-verificado end-to-end (header + 4 KPIs + DataTableShell + empty state honesto + 2 CTAs).

## Delta 2026-05-31 — HR Engagement Detail + Lifecycle + Classification Review (TASK-975)

Cierra el gap #2 del EPIC contractors: el workbench HR (`/hr/contractors`) tenía la state machine + classification review + edición de términos en backend pero la UI cubría solo ~20% (cola + compensación). Esta task es **UI-only sobre el backend existente** (GET/PATCH `/api/hr/contractors/[id]` + 3 helpers server-only + 2 capabilities con SoD; cero endpoints/state-machine/migración).

- **Decisión IA**: detalle + acciones viven como **Drawer + Dialogs dentro del workbench** (extender la inspector column), NO página dedicada `/hr/contractors/[id]` — un único surface HR contractor, sin fragmentar viewCode/route/breadcrumb. Reversible a ruta si emerge deep-link.
- **4 componentes runtime nuevos** (`src/views/greenhouse/contractors/`): `ContractorEngagementDetailDrawer` (GET `/[id]` → términos agrupados económicos/tributario/proveedor/fechas + máquina de estados + factores read-only), `ContractorLifecycleControls` (solo transiciones válidas vía `ENGAGEMENT_TRANSITIONS`; oculta "Activar" cuando `isClassificationRiskBlocking`; confirm dialog con motivo ≥10 para pause/ending/cancel → `PATCH action=transition`), `ContractorClassificationReviewDialog` (7 factores + reviewed/block switches + motivo + preview vivo con `computeClassificationRisk` → `PATCH action=review_classification`, capability `hr.contractor_classification:approve` SoD), `ContractorEngagementTermsDrawer` (payment model/FX/provider refs/flags/bonus/end date — NO tarifa, que la edita el compensation drawer; diff de cambios → `PATCH action=update`).
- **Helper compartido** `src/lib/contractor-engagements/engagement-display.ts` (puro, label/tone/icon maps desde `GH_CONTRACTOR_COMPENSATION`).
- **Projection additive**: `ContractorWorkbenchQueueRow.lifecycleStatus` (raw `status` enum) + `classificationRiskStatus` retipado a enum canónico — para que el inspector derive las transiciones. Único cambio backend (read-projection, sin endpoint).
- **Capability gating server-side**: el page computa `canManage` (`hr.contractor_engagement:update`) + `canReviewClassification` (`hr.contractor_classification:approve`) y los pasa al view; la UI esconde/deshabilita acciones según corresponde (el server enforza igual).
- **Boundary EPIC-013/TASK-957**: cero cambios a payroll/`contract_type`/finiquito. Gates: tsc/lint/design 0 · `pnpm vitest run src/lib/payroll` 532 · contractor-engagements 132 · `pnpm test` full + `pnpm build` verde. Mockup aprobado + loop GVC (verificación con data real de la cola en staging, production verification sequence). Reusa viewCode `equipo.contratistas` (sin migración).

## Delta 2026-05-31 — HR Contractor Onboarding wizard (TASK-976)

Cierra el gap #3 del EPIC contractors: crear un contractor solo se podía por API/script (Valentina se creó así). Wizard HR/People-first `/hr/contractors/new` con branching A/B. **UI-only sobre 2 endpoints existentes** + 1 endpoint thin de read nuevo (justificado por gap detectado en Plan Mode).

- **Decisiones (Open Questions)**: (OQ1) **INDEPENDIENTE** de TASK-965 (Unified Worker Workflow, EPIC-017) — gated + no iniciado; HR necesita la superficie ya; cuando TASK-965 entregue su carril contractor, absorbe esta. (OQ2) Camino A **EXIGE** la relación legal (no la fabrica): si la persona no tiene relación contractor pero tiene offboarding `executed` → deriva al Camino B; si no → guidance Person 360 (out of scope). Fabricar la relación bypasearía el anchor legal + la gobernanza Person 360 (TASK-891).
- **Camino B** (`POST /api/hr/contractors/transition-from-offboarding`, cap `manage`): wizard desde un offboarding `executed` → términos → transición **atómica** empleado→contractor (TASK-956). Surface honesto de los **3 outcomes idempotentes** (`transitioned` / `engagement_created_on_existing_relationship` / `already_complete`). Boundary read-only/append-only sobre finiquito+offboarding+member.
- **Camino A** (`POST /api/hr/contractors`, cap `create`): persona (people-search) → resuelve su relación contractor → términos → engagement `draft`+`needs_review`.
- **Endpoint nuevo** `GET /api/hr/contractors/onboarding/resolve?profileId=` (cap `read`): compone `resolveActivePersonLegalEntityRelationships` + `listOffboardingCases({status:'executed'})` → `{contractorRelationship|null, executedOffboarding|null}` para el branching A/B. Reusa `/api/organizations/people-search` + `getOperatingEntityIdentity()`; offboarding executed se fetchea server-side en el page.
- **Wizard runtime** (`ContractorOnboardingWizard.tsx`, forms-ux Lane C): Stepper + branching declarativo + per-step validation (effective_from > lastWorkingDay, reason ≥10) + back-preserves-state. Capability gating server-side (`canCreate`/`canManage`). Template: SampleSprints.
- **Boundary EPIC-013/TASK-956/957**: cero cambios a payroll/`contract_type`/finiquito. Gates: tsc/lint/design 0 · `pnpm vitest run src/lib/payroll + workforce/offboarding + contractor-engagements` 698 · `pnpm test` full + `pnpm build` verde. Mockup aprobado + GVC (runtime renderiza; data real de offboarding en staging). Reusa viewCode `equipo.contratistas` (sin migración). Sin endpoints de mutación nuevos (solo 1 read).

## Delta 2026-05-31 — Contractor payment due-date + SLA signal (TASK-978)

Hace visible el compromiso de Efeonce de pagar a contractors dentro de los **primeros 5 días hábiles posteriores al cierre de mes** — antes 100% invisible (el `due_date` era input manual con default vacío).

- **Derivación canónica del `due_date`**: `resolveContractorPaymentDueDate` (`src/lib/contractor-engagements/payables/due-date.ts`, pura) = **cierre del mes operativo del payable + 5 días hábiles**. Ancla = último día hábil del mes operativo (`getOperationalPayrollMonth` → `getLastBusinessDayOfMonth`), porque el payable NO tiene `service_period`. Aplicada en `createContractorPayableFromSubmission`/`OffCycle` **solo cuando `dueDate` no fue provisto** (override manual gana). La obligación hereda el `due_date` (el bridge ya lo pasa).
- **Primitiva de calendario nueva `addBusinessDays(date, n)`** en `operational-calendar.ts` (SSOT, +tests). Reusa `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS` (=5). **Reusable por nómina** (hoy las obligaciones de nómina usan `dueDate: periodEnd`, inconsistente con el compromiso de 5 días — una task futura las alinea con este helper canónico).
- **SLA signal** `finance.contractor_payable.payment_sla_overdue` (kind=lag, moduleKey finance, steady=0): payables comprometidos (`ready_for_finance`/`obligation_created`/`payment_order_created`), no pagados, con `due_date < CURRENT_DATE`. Severidad ok / warning (≤10d) / error (>10d) / unknown. **Es observabilidad, no gate** (no bloquea el payable).
- **Distinción crítica (finance)**: el SLA mide el **pago NETO al contractor**. La **remesa de la retención SII** (honorarios CL) es una **obligación DISTINTA** con su propio deadline **F29 (día 12/20 del mes siguiente)** y otro beneficiario (el SII) — NO se confunde con este SLA (out of scope, TASK-977 invariant).
- **Sin migración, sin capability/outbox nuevos.** Date arithmetic `CURRENT_DATE - due_date` (integer days, no `EXTRACT(EPOCH FROM date)` — gate TASK-893). Gates: vitest calendar+due-date 16/16 · payables 43/43 · payroll+calendar 552 (boundary) · signal 4/4 + **live PG smoke severity=ok count=0** · tsc/lint 0.

## Delta 2026-05-31 — Contractor Run Report "Nómina de Contractors" (TASK-980)

Reporte de período (PDF + Excel) de pagos a contractors — espejo del reporte de payroll (TASK-782) + infra del comprobante individual (TASK-960). **Read-only**, monto verbatim.

- **Reader** `buildContractorRunReport` (`run-report-reader.ts`, server-only): lista los payables del **mes operativo** (`getOperationalPayrollMonth(due_date ?? created_at)`, mismo ancla TASK-978/979 — query con ventana calendario acotada + refine en TS), agrupa en 2 grupos contables (Honorarios CL con retención SII vs Internacional) con subtotales por moneda **mutuamente excluyentes** (retención SII solo honorarios → F29; neto pagado solo `paid` → banco). Incluidos = comprometidos (ready/obligation/payment_order/paid); excluidos = blocked/pending; cancelled omitido. Enrichment: nombre + EO-CENG + EO-RA (read) + rate snapshot.
- **Clasificador de régimen compartido**: `deriveContractorRemittanceRegime` extraído de `remittance-resolver.ts` (TASK-960) a `remittance/regime.ts` (single source of truth que ahora consumen el comprobante Y el reporte). `toContractorReportRegimeGroup` colapsa los 4 régimenes a 2.
- **Generadores puros** (transforman el `ContractorRunReport`, el reader hace el IO): `generateContractorRunPdf` (masthead con logo + `EfeonceSloganPdf` Poppins + título/período/emisor; summary strip por moneda con neto en verde; tabla por régimen con subtotales; nota contable; `EfeoncePdfFooter` fixed + página X de Y; Geist body via `ensurePdfFontsRegistered`) + `generateContractorRunExcel` (ExcelJS: Resumen/Honorarios CL/Internacional/Excluidos, header verde, CLP `#,##0`/USD `#,##0.00`, `—` para N/A). Render visual verificado (PDF real → PNG).
- **Endpoint** `GET /api/finance/contractor-payables/run-report?periodYear=&periodMonth=&format=pdf|excel` (capability `finance.contractor_payable:read`, reuso) → `NextResponse(Uint8Array, Content-Disposition attachment)`. Botón "Descargar nómina" + dialog (mes/año + PDF/Excel) en el workbench.
- **Boundary EPIC-013/957**: cero nómina/`contract_type`/finiquito. La remesa SII (F29) NO es el neto (nota contable explícita). Gates: tsc/lint/design 0 · régime 6/6 + reader 6/6 + excel 2/2 + pdf 2/2 + boundary contractor 148 · live PG smoke · end-to-end agent auth (PDF `%PDF` + Excel `PK`).

## Delta 2026-05-31 — Monthly Contractor Payment Run (TASK-979)

La **corrida mensual** cierra operativamente el compromiso de los 5 días: en vez de armar órdenes de a una, barre el período y prepara las órdenes agrupadas. **Prepara — NO paga** (maker-checker intacto).

- **Orquestador** `prepareMonthlyContractorPaymentRun` (`monthly-run.ts`, server-only): cutoff = `addBusinessDays(getLastBusinessDayOfMonth(Y,M), 5)`; barre obligations `provider_payroll` (source_kind `contractor_payable`) `due_date <= cutoff` aún NO batcheadas (incluye overdue stranded de meses previos), prioriza por `due_date ASC`, agrupa por **moneda** (regla single-currency de `createPaymentOrderFromObligations`, TASK-750) y crea órdenes `pending_approval`. `dryRun: true` = preview sin mutar.
- **Atomicidad**: sweep + N órdenes + N transiciones de payable corren en UNA tx (rollback total si algo falla → re-correr safe). El run queda auditado en `greenhouse_sync.contractor_payment_runs` (append-only, triggers anti-UPDATE/DELETE, mirror TASK-900): `running → succeeded|failed`.
- **Cierre del lifecycle del payable**: `markPayablePaymentOrderCreated` (`store.ts`, dual-mode `client?`) es el **writer ÚNICO** de la transición `obligation_created → payment_order_created` — la state machine la exige antes de `paid` y **nadie la escribía** (gap descubierto en discovery: 0 writers, 0 consumer de `finance.payment_order.created`). Emite `workforce.contractor_payable.payment_order_created v1`. Migración extiende el CHECK `contractor_payable_events.event_type` con el nuevo valor.
- **Idempotencia** (defensa en profundidad, sin tabla en el hot path): filtro un-ordered (`LEFT JOIN payment_order_lines` line NULL) + status orderable + lock UNIQUE `payment_order_lines(obligation_id)` (concurrencia: el perdedor aborta con `obligation_already_locked`).
- **Trigger V1: manual** — `POST /api/finance/contractor-payables/monthly-run` (capability `finance.contractor_payable:manage`, reuso) + botón "Iniciar corrida mensual" en `/finance/contractor-payments` (dialog confirm-con-preview: selector de mes operativo → dry-run preview → "Preparar órdenes"). Schedule automático (Cloud Scheduler) = follow-up detrás de `CONTRACTOR_MONTHLY_RUN_ENABLED`, no se activa hasta TASK-977 settlement ON.
- **Signal** `finance.contractor_payable.unbatched_overdue` (kind drift, moduleKey finance, steady=0): obligación batcheable vencida sin batchear → remediación: disparar la corrida. Distinto de `payment_sla_overdue` (TASK-978, más amplio) y `ready_without_obligation` (TASK-793, tramo anterior).
- **Boundary EPIC-013/957**: cero nómina/`contract_type`/finiquito. La remesa SII (F29) NO es parte de la corrida (paga el NETO al contractor). Gates: tsc/lint/design 0 · orchestrator 6/6 + signal 4/4 + state-machine + live PG smoke (sweep válido, run-table triggers OK, CHECK extendido) · boundary payroll 532 · GVC end-to-end (botón + dialog + dry-run API 200 → "Nada por preparar"). Migración `20260531235624882`.
