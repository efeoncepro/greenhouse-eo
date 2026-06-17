# Greenhouse Contractor Engagements + Payables Architecture V1

**Version:** 1.12
**Created:** 2026-05-05
**Status:** `ContractorEngagement` (TASK-790) + Contractor Invoice Assets (TASK-791) + Contractor Work Submissions (TASK-792) + ContractorPayable + Finance bridge (TASK-793) + Chile Honorarios Compliance (TASK-794) + International Contractor Boundary Fase A (TASK-795) + Self-Service Hub UI (TASK-796) + Employee→Contractor connected command (TASK-956) + Contractor↔Legacy Payroll Double-Rail Exclusion + Current Work Classification (TASK-957) + **Contractor Closure + Transition Controls (TASK-797)** implemented. Provider settlement split + EOR (TASK-795 Fase B / TASK-955) and ops control plane (TASK-798) remain proposals.

## Delta 2026-06-02 — Contractor payable end-to-end operator path validated

Se valido el flujo operador end-to-end en `dev-greenhouse` para Valentina
Hoyos (`EO-CENG-0001` / payable `EO-CPAY-0001`) sin scripts de estado ni
mutaciones hechas por agentes: el operador avanzo desde la UI por las
superficies canonicas.

Cadena canonica validada:

```text
contractor_work_submission approved
  -> contractor_payable pending_readiness
  -> readiness live OK + payment route resolved
  -> ready_for_finance
  -> payment_obligation provider_payroll
  -> monthly contractor payment run
  -> payment_order pending_approval
  -> approved/scheduled/submitted/paid in Payment Orders
  -> contractor_payable paid
  -> remittance advice EO-RA + email
```

Contratos reforzados:

- **Payment profile resolution**: el readiness puede resolver un perfil activo
  via `resolvePaymentRoute` aunque el payable haya nacido sin
  `payment_profile_id`. Si la ruta activa es `beneficiary_type='member'`, solo
  se usa un `member` existente ligado al `contractor_engagement.profile_id`;
  el dominio contractor **nunca crea members**, no crea
  `compensation_versions` y no entra al roster Payroll. Sin ruta, el payable
  falla cerrado (`payment_profile_unresolved`) o requiere waiver auditado.
- **Finance handoff**: `ready_for_finance` no es pago al banco. Es el traspaso
  gobernado que crea una `payment_obligation` con
  `source_kind='contractor_payable'`, `obligation_kind='provider_payroll'` y
  `amount=net_payable`.
- **Monthly run**: la corrida mensual barre obligaciones contractor no
  batcheadas hasta el corte, agrupa por moneda y crea ordenes
  `pending_approval`. Es idempotente y atomica; prepara el lote, no aprueba ni
  paga.
- **Payment Orders ownership**: approval, schedule, submit, mark-paid,
  settlement y conciliacion viven en Payment Orders / Tesoreria. El payable
  queda `payment_order_created` hasta que una orden pagada confirme el banco.
- **Paid cascade**: solo `finance.payment_order.paid` puede mover el payable
  `payment_order_created -> paid`. La emision del comprobante individual
  `EO-RA` y el email de remesa requieren `payable.status='paid'`.
- **Accounting**: el gasto contractor es el bruto; el banco paga el neto; la
  retencion SII queda como pasivo separado a remesar al SII (F29).
- **Run report**: el reporte de nomina de contractors puede incluir pagos
  comprometidos/listos/en orden/pagados, pero `netPaidTotal` solo suma
  `paid`. Un payable "En orden de pago" no debe leerse como pagado.

Documentacion asociada:

- Manual operador: `docs/manual-de-uso/finance/pagos-a-contractors.md`.
- Manual Tesoreria: `docs/manual-de-uso/finance/ordenes-de-pago.md`.
- Documentacion funcional: `docs/documentation/finance/pagos-a-contractors.md`
  y `docs/documentation/finance/ordenes-de-pago.md`.

## Delta 2026-06-01 — TASK-985 Onboarding auto-activation (no más draft huérfano)

El onboarding de contractor (Camino A nuevo + Camino B empleado→contractor) **auto-activa** el engagement (`draft → active`) cuando la clasificación **no es bloqueante**; queda retenido en `draft` solo ante riesgo **bloqueante** (`legal_review_required`/`blocked`).

- **Causa raíz corregida**: el `draft` NO era una compuerta de compliance — el CHECK `contractor_engagements_active_requires_clear_risk` solo bloquea `active` para `legal_review_required`/`blocked`, **NO** para `needs_review`. El engagement nacía `draft` y el onboarding nunca lo avanzaba (estado huérfano; caso Valentina `EO-CENG-0001`).
- **Helper canónico** `activateEngagementIfNotBlocking(client, engagement, actorUserId)` (store.ts): `draft → active` + evento `status_changed` + outbox `contractorEngagementActivated`; no-op si ya salió de draft o si el riesgo es bloqueante. Idempotente, reusable.
- **Opt-in** `createContractorEngagement(input.activateWhenClassificationNotBlocking)` (default false → callers existentes intactos). Camino A route + `transitionEmployeeToContractorEngagement` lo activan. El branch `already_complete` del transition **cura** un draft huérfano existente al re-onboardear.
- **Predicado puro** `shouldAutoActivateOnOnboard(status) = !isClassificationRiskBlocking(status)`.
- **Salvedad / observabilidad**: nueva señal `hr.contractor_engagement.classification_review_pending` (data_quality, moduleKey=identity, warning>0) — worklist de `needs_review` no terminales (con conteo de activos), para que la revisión de clasificación quede visible y no se olvide tras la auto-activación.
- **UI**: el wizard de onboarding refleja el estado real del resultado (Activo / Retenido para revisión), no "Borrador" fijo.
- **Boundary (TASK-890/957)**: la activación toca solo `contractor_engagements.status`; NUNCA `member.contract_type`/finiquito/offboarding. Decisión arch-architect + greenhouse-ux (Opción A), aprobada operador. Spec: `docs/tasks/in-progress/TASK-985-contractor-onboarding-auto-activation.md`.

## Delta 2026-06-01 — TASK-797 Contractor Closure + Transition Controls shipped (backend)

Cierre contractor como **lifecycle propio** (NUNCA finiquito laboral), modelado sobre el state machine existente `active/paused → ending → ended` + columnas de metadata de cierre. **NO** se creó tabla/aggregate aparte: el cierre es 1:1 con el engagement y el audit ya vive en `contractor_engagement_events` (append-only trio TASK-790).

- **Schema** (migration `20260601131829099`): `contractor_engagements` += `closure_reason` (CHECK enum cerrado: contract_completed/mutual_agreement/contractor_resignation/non_renewal/terminated_for_cause/converted_to_employee/provider_terminated/other), `closure_effective_date`, `provider_termination_ref` (solo carril EOR/provider), `closure_initiated_at/by`, `closure_executed_at/by`, `post_closure_invoices_allowed` (default FALSE).
- **Readiness** (`closure/readiness.ts`, pure — mirror de `evaluatePayableReadiness`): blockers ACKNOWLEDGEABLE (open work submissions, open payables, provider_termination_ref_missing, classification_risk_blocking) — el operador puede cerrar con override declarando razón; `ready` exige cero blockers SIN reconocer. Advisory `access_handoff_reminder` (informativo, NUNCA bloquea — el access offboarding es SEPARADO).
- **Comandos** (`closure/store.ts`, server-only): `assessContractorClosureReadiness` (resolver read-only), `initiateContractorClosure` (→ ending, winding-down), `executeContractorClosure` (→ ended, gateado, atómico two-step), `setPostClosureInvoicesAllowed` (política post-cierre).
- **Post-closure policy**: nuevas work submissions bloqueadas en ending/ended/cancelled (`isPostClosureLockedEngagementStatus`); payables bloqueados tras `ended` salvo `post_closure_invoices_allowed`, `cancelled` nunca permite payables; durante `ending` se liquidan los payables de trabajo aprobado.
- **API**: `GET/POST /api/hr/contractors/[id]/closure` (initiate|execute|allow_post_closure_invoices, capability `hr.contractor_engagement:manage`/`:read`). La transición genérica `PATCH [id]` ahora rechaza `ending`/`ended` → funnel al flujo de cierre (sin bypass del gate).
- **Eventos**: `workforce.contractor_engagement.closure_initiated v1` (nuevo) + `ended v1` reusado con payload enriquecido.
- **Reliability signal**: `hr.contractor_engagement.closed_with_open_payables` (data_quality, moduleKey=identity, steady=0) — defense-in-depth: cierres con payables abiertos por liquidar.
- **Boundary duro (TASK-890)**: NUNCA `final_settlements`/causales DT, NUNCA toca lanes de `work_relationship_offboarding_cases`, NUNCA reactiva relación dependiente. Gate de cierre `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (566). Invariantes en `CLAUDE.md` → "Contractor Closure + Transition Controls invariants (TASK-797)".
- **UI** (follow-up): el closure drawer en el HR workbench `/hr/contractors` queda como surface de consumo derivada; los 5 acceptance criteria son contratos backend-enforced (readiness vía API, submissions bloqueadas, post-closure explícito, nunca finiquito). Spec: `docs/tasks/in-progress/TASK-797-contractor-closure-transition-controls.md`.

## Delta 2026-06-01 — TASK-981 Contractor Payable `paid` lifecycle + Remittance Email shipped

Cierra el **tramo final del lifecycle** (`payment_order_created → paid`) y el **pegamento reactivo** que envía el comprobante TASK-960 al contractor por email cuando se le paga. Antes de TASK-981 **ningún writer** transicionaba el payable a `paid` ni emitía evento (mismo gap-class que TASK-979 cerró para `payment_order_created`) → el comprobante TASK-960 (gate `status='paid'`) era **inalcanzable**.

Cadena canónica decoupled (mirror TASK-771):

```text
finance.payment_order.paid (settlement TASK-765/977)
  → contractor-payable-paid-cascade: markPayablePaid por cada payable enlazado
    (payment_order_id, status='payment_order_created') → emite
    workforce.contractor_payable.paid v1
      → contractor-payable-paid-email: resolveRemittanceAdvice (gate paid, re-read PG)
        → generateContractorRemittancePdf → getProfileNotificationRecipient (canonical_email)
        → sendEmail('contractor_remittance_paid', adjunto PDF, idempotente)
```

- **Writer ÚNICO** `markPayablePaid(input, client?)` (dual-mode, idempotente, mirror `markPayablePaymentOrderCreated`).
- Migración additiva: CHECK `contractor_payable_events.event_type` + `paid`. State machine ya permitía `payment_order_created → paid` (TASK-793 forward-fix).
- Template `ContractorRemittanceEmail` (es/en) + emailType `contractor_remittance_paid` (transactional). Skip honesto si no-paid / sin email (NO bloquea el batch).
- Reliability signal `finance.contractor_remittance_email.dead_letter` (dead_letter, steady=0).
- Idempotencia del email vía `sendEmail({ sourceEventId, sourceEntity })` (`wasEmailAlreadySent`).

Spec: `docs/tasks/complete/TASK-981-contractor-payment-email-remittance.md`.

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

---

## Invariantes operativos para agentes (TASK-790…981)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Estos son los invariantes operativos que un agente debe cargar al tocar `src/lib/contractor-engagements/**` o el settlement de contractor payables. El contrato técnico vive en las secciones de arriba; esta sección es el espejo operativo (NUNCA/SIEMPRE) que antes vivía en `CLAUDE.md`. Dedup con la prosa de arriba = TASK-1160 Slice 4.

### Contractor Engagements invariants (TASK-790, desde 2026-05-29)

`ContractorEngagement` (`greenhouse_hr.contractor_engagements`) es el agregado canónico del contrato operativo contractor/honorarios, bajo **Workforce/HR — NO Payroll**. Fundación de Contractor Payables (EPIC-013). El pago real NO nace aquí (eso es TASK-791..793 hacia Finance). Módulo TS: `src/lib/contractor-engagements/` (barrel **pure-only**; el store es server-only y se importa directo desde `@/lib/contractor-engagements/store` para no arrastrar `import 'server-only'` a un client bundle — bug class TASK-827).

**Anchor (D1)**: el engagement FK-anchora a `greenhouse_core.person_legal_entity_relationships.relationship_id` (PK real `relationship_id`) `ON DELETE RESTRICT`. La relación contractor **activa** se resuelve vía `resolveActivePersonLegalEntityRelationships({profileId, relationshipTypes:['contractor']})` en `src/lib/account-360/person-legal-entity-relationships.ts`. El engagement **NUNCA** crea relaciones (eso es TASK-789 `transitionEmployeeToContractor` / TASK-891 `reconcileMemberContractDrift`).

**Subtype SSOT (D2)**: `contractor_engagements.relationship_subtype` (5 valores finos: `honorarios_cl`, `freelance`, `independent_professional`, `international_contractor`, `provider_platform`) es SSOT propio del engagement, validado por **consistencia de familia** contra el subtype coarse de la relación (`{contractor,honorarios}` en `metadata.relationshipSubtype`) vía `assertSubtypeConsistency` (honorarios→honorarios_cl; contractor→el resto). Sin write-back a la relación.

**payroll_via ortogonal (D3)**: `contractor_engagements.payroll_via` es el canal del engagement (enum propio `internal/deel/remote/oyster/manual_provider/direct_international`, tipo TS `ContractorEngagementPayrollVia` **distinto** del `PayrollVia` de payroll).

**State machine + CHECK + audit trio** (pattern TASK-700/765): `contractor_engagements` (mutable, CHECK enums + BEFORE UPDATE `contractor_engagements_validate_transition` trigger + CHECK `contractor_engagements_active_requires_clear_risk`) + append-only `contractor_engagement_events` (triggers anti-UPDATE/anti-DELETE). Matriz: `draft→{pending_review,active,cancelled}`, `pending_review→{active,draft,cancelled}`, `active→{paused,ending,cancelled}`, `paused→{active,ending,cancelled}`, `ending→{ended,active,cancelled}`, `ended`/`cancelled` terminales. Mirror TS: `assertValidEngagementTransition` (`state-machine.ts`).

**Classification risk first-class**: `computeClassificationRisk({factors, reviewed, block})` (`classification-risk.ts`) determinístico. `clear` requiere review explícito (`reviewed=true`) — un engagement fresco nunca auto-clarea (floor `needs_review`). Subordinación material (schedule+supervision, o exclusividad+dependencia económica, o rol interno indistinguible) → `legal_review_required`; `blocked` solo escala manual. Riesgo bloqueante (`legal_review_required`/`blocked`) impide `active` (CHECK DB + app guard); escalar riesgo en un engagement `active` lo **auto-pausa**.

**Tax owner mandatory**: `tax_compliance_owner` NOT NULL (default por `resolveDefaultTaxComplianceOwner`: honorarios_cl→greenhouse_policy; deel/remote/oyster→provider_owned; resto→manual_review_required). honorarios CL snapshot de tasa SII (`getSiiRetentionRate` — SSOT del valor) + `tax_withholding_policy_code` versionado (`cl_honorarios_2026_15_25`).

**⚠️ Reglas duras (no-regresión Payroll)**:

- **NUNCA** escribir/mutar `greenhouse_payroll.payroll_entries`, `payroll_adjustments`, `compensation_versions`, `final_settlements`/`final_settlement_documents` desde el engagement. Contractor payables jamás entran como payroll dependiente (nacen en 791-793 hacia Finance).
- **NUNCA** sobrescribir `members.payroll_via`, `members.contract_type` ni `members.pay_regime`. El motor payroll clasifica por las columnas del member; el engagement declara su propio canal (D3).
- **NUNCA** aplicar deducciones Chile dependientes (AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC) a honorarios. Solo retención SII versionada.
- **NUNCA** habilitar finiquito laboral para contractor/honorarios — su cierre futuro es `contractor_closure` (TASK-797).
- **NUNCA** componer un internal account number, transición, ni riesgo de clasificación inline en consumers. Usar los helpers canónicos del módulo.
- **NUNCA** re-exportar el store desde el barrel `index.ts` (server-only transitive). Importar `@/lib/contractor-engagements/store` directo en server.
- **NUNCA** seedear una capability del engagement sin grant en `runtime.ts` en el mismo PR (guard `capability-grant-coverage.test.ts`).
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio.

**Access**: capabilities `hr.contractor_engagement` (read/create/update/manage) + `hr.contractor_classification` (read/approve). Grants: read+manage → HR route_group ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN; classification.approve → EFEONCE_ADMIN ∪ FINANCE_ADMIN ∪ HR_MANAGER. API `/api/hr/contractors` (GET/POST) + `/api/hr/contractors/[id]` (GET/PATCH action=transition|update|review_classification).

**Reliability signal**: `hr.contractor_engagement.classification_risk_open` (kind=drift, moduleKey=identity, steady=0) — cuenta engagements no terminales con riesgo bloqueante. **Outbox v1**: `workforce.contractor_engagement.{created,activated,paused,ended,cancelled,classification_risk_flagged}` (aggregateType `contractor_engagement`).

**Spec canónica**: `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (V1.1 Delta 2026-05-29). Task: `docs/tasks/complete/TASK-790-contractor-engagements-runtime-classification-risk.md`. Migración: `20260529221452562`. Patrones fuente: TASK-789/891 (substrate anchor), TASK-700/765 (state machine + CHECK + audit), TASK-742 (defense-in-depth), TASK-873/935 (capability grant coverage), TASK-758 (SII retention SSOT).

### Contractor Invoice Assets invariants (TASK-791, desde 2026-05-30)

Toda invoice/boleta, evidencia de trabajo o documento de proveedor de un contractor se sube y adjunta vía el **uploader privado canónico** (`createPrivatePendingAsset` + `attachAssetToAggregate` + `greenhouse_core.assets`, TASK-721) — **NUNCA** un bucket, storage helper, `gs://`, signed URL ni URL externa como contrato primario. La asociación al dominio contractor vive en el ledger append-only `greenhouse_hr.contractor_invoice_assets`.

**Contexts canónicos** (en `src/types/assets.ts` `GreenhouseAssetContext`): `contractor_invoice_draft`/`contractor_invoice`, `contractor_work_evidence_draft`/`contractor_work_evidence`, `provider_invoice_draft`/`provider_invoice`, `provider_payout_statement`. Los 3 `*_draft` están en `DraftUploadContext` (uploadables vía `/api/assets/private`). Retention classes: `contractor_invoice`, `contractor_work_evidence` (nuevas); provider reusa `provider_supporting_doc`.

**Anchor (D-791-1)**: `contractor_invoice_assets` FK NOT NULL a `contractor_engagements.contractor_engagement_id` ON DELETE RESTRICT. `contractor_invoice_id` queda `TEXT NULL` sin FK (forward-compat: TASK-792 crea `contractor_invoices` + agrega la FK). El asset se adjunta vía `attachAssetToAggregate(ownerAggregateType=<final context>, ownerAggregateId=invoice_asset_id, client)` en la **misma tx** que el INSERT del link row (patrón TASK-721). Helper canónico: `attachContractorInvoiceAsset` (`src/lib/contractor-engagements/invoice-assets.ts`).

**Access (D-791-2)**: usa el patrón canónico de assets `hasRouteGroup`/`hasRoleCode` (NO nuevas capabilities `can()`). Contractor invoice/evidence → self (ownerMemberId==memberId) ∪ HR ∪ Finance ∪ admin. Provider invoice/payout → HR ∪ Finance ∪ admin (oculto al contractor por defecto — pueden contener fees/márgenes/otros trabajadores).

**MIME (D-791-4)**: `CONTEXT_EXTRA_MIME_TYPES` agrega `application/xml`/`text/xml`/`application/json` SOLO a `contractor_invoice_draft` + `provider_invoice_draft` (factura electrónica estructurada). El resto sigue pdf/jpeg/png/webp. ZIP/ejecutables fuera (V1).

**⚠️ Reglas duras**:

- **NUNCA** crear bucket/uploader/storage helper paralelo para invoices de contractor. Reusar `createPrivatePendingAsset`/`attachAssetToAggregate`.
- **NUNCA** reusar los contextos `contractor_invoice*`/`contractor_work_evidence*`/`provider_*` para recibos de nómina ni documentos de finiquito. Son retention classes + aggregates distintos.
- **NUNCA** mutar contextos ni retention classes de assets payroll existentes al agregar contractor (solo agregar).
- **NUNCA** adjuntar un `contractor_invoice_asset` a un `payroll_entry`, `final_settlement_document` ni aggregate de nómina. `resolveFinalAttachContext` solo resuelve contextos contractor/provider (retorna null para el resto → el helper rechaza con `asset_context_not_contractor`).
- **NUNCA** UPDATE/DELETE sobre `contractor_invoice_assets` (triggers append-only). Reemplazar un documento = subir nuevo asset + nueva fila; el histórico se preserva.
- **NUNCA** adjuntar el mismo asset dos veces al mismo engagement (UNIQUE `(contractor_engagement_id, asset_id)`).
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', ...)`.
- **SIEMPRE** que un consumer downstream (TASK-792 invoices, TASK-793 payables, TASK-796 UI) necesite adjuntar un soporte, pasar por `attachContractorInvoiceAsset`. Cuando TASK-792 cree `contractor_invoices`, agregar la FK `contractor_invoice_id` (additiva) + setearla en el helper.

**Reliability signal**: `hr.contractor_invoice_assets.broken_evidence` (kind=data_quality, moduleKey=identity, steady=0) — cuenta link rows cuyo `asset_id` apunta a un asset inexistente/eliminado. Mirror TASK-721.

**Spec canónica**: `docs/tasks/complete/TASK-791-contractor-invoice-assets-uploader-contexts.md`. Migración: `20260530203116605`. Patrones fuente: TASK-721 (evidence uploader + attach-in-tx + broken-evidence signal), TASK-790 (contractor engagement anchor), TASK-700/765 (append-only ledger + CHECK + triggers).

### Contractor Work Submissions invariants (TASK-792, desde 2026-05-30)

`greenhouse_hr.contractor_work_submissions` es la evidencia de trabajo del contractor (timesheet/milestone/deliverable/project_fee/expense/off_cycle_adjustment) con lifecycle de aprobación/disputa/rechazo. **La aprobación operacional NO es ejecución de pago** — una submission aprobada es INPUT de la readiness del payable (TASK-793), nunca alimenta payroll. Módulo: `src/lib/contractor-engagements/work-submissions/` (barrel pure-only; store server-only importado directo).

**State machine + CHECK + audit trio** (patrón TASK-700/765/790): `contractor_work_submissions` (CHECK enums + CHECK `status='approved' ⇒ gross_amount NOT NULL` + BEFORE UPDATE transition trigger) + append-only `contractor_work_submission_events` (anti-UPDATE/DELETE). Matriz: `draft→{submitted,cancelled}`, `submitted→{approved,disputed,rejected,cancelled}`, `disputed→{submitted,rejected,cancelled}`, `approved→{cancelled}`, `rejected`/`cancelled` terminales. Mirror TS: `assertValidWorkSubmissionTransition` (`work-submissions/state-machine.ts`).

**Evidencia (D-792-1)**: las submissions NO tienen tabla de evidencia propia — reusan el ledger TASK-791 `contractor_invoice_assets` vía la columna additiva `contractor_work_submission_id` (FK). `attachContractorInvoiceAsset` acepta `contractorWorkSubmissionId` opcional. Delivery refs (project/sprint/document) viven en `metadata_json` (refs canónicas, NUNCA texto libre como única evidencia).

**Readiness + dup guard (D-792-3)**: `listWorkSubmissionsReadyForPayable(engagementId)` retorna `status='approved' AND consumed_by_payable_id IS NULL`. `markContractorWorkSubmissionConsumed` (idempotente) la marca consumida — rechaza doble consumo. `consumed_by_payable_id` es `TEXT NULL` forward-compat (TASK-793 agrega la FK).

**Access (D-792-4)**: 2 capabilities least-privilege — `hr.contractor_work_submission` (read/create/update/manage: submit/editar-borrador/cancelar) + `hr.contractor_work_submission.review` (read/approve: approve/dispute/reject). Grants: HR route_group ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN. API `/api/hr/contractors/work-submissions` (GET/POST) + `[id]` (GET/PATCH action=update|submit|approve|dispute|reject|cancel).

**⚠️ Reglas duras**:

- **NUNCA** alimentar `payroll_entries`, `payroll_adjustments` ni crear `compensation_versions` desde una work submission. La submission aprobada es input de readiness del payable (TASK-793), NO de payroll.
- **NUNCA** tratar la aprobación de trabajo como ejecución de pago. El pago nace en payable → Finance (TASK-793).
- **NUNCA** aprobar una submission sin `gross_amount` (app guard `approve_requires_gross_amount` + DB CHECK). El monto se declara en create/draft.
- **NUNCA** disputar/rechazar sin `reason` (≥10 chars) — app guard + audit.
- **NUNCA** cancelar una submission ya consumida por un payable (`consumed_by_payable_id` NOT NULL).
- **NUNCA** UPDATE/DELETE sobre `contractor_work_submission_events` (triggers append-only).
- **NUNCA** transicionar fuera de la matriz canónica (trigger DB + `assertValidWorkSubmissionTransition`).
- **NUNCA** consumer downstream recomputa "qué submissions están listas" inline — usar `listWorkSubmissionsReadyForPayable`.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', ...)`.
- **SIEMPRE** que TASK-793 cree `contractor_payables`, agregar la FK `consumed_by_payable_id → contractor_payables` (additiva) + setearla vía `markContractorWorkSubmissionConsumed` dentro de la tx de creación del payable.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio.

**Reliability signal**: `hr.contractor_work_submission.review_overdue` (kind=drift, moduleKey=identity, steady=0) — submissions en submitted|disputed > 14d. **Outbox v1**: `workforce.contractor_work_submission.{submitted,approved,disputed,rejected,cancelled}` (aggregateType `contractor_work_submission`).

**Spec canónica**: `docs/tasks/complete/TASK-792-contractor-work-submissions-approval-dispute-flow.md`. Migración: `20260531000000000`. Patrones fuente: TASK-790 (engagement anchor + state machine trio), TASK-791 (evidence ledger reuse), TASK-700/765 (append-only audit + CHECK + triggers), TASK-873/935 (capability grant coverage).

### Contractor Payables → Finance bridge invariants (TASK-793, desde 2026-05-30)

`greenhouse_hr.contractor_payables` es la **obligación económica aprobada del contractor, PREVIA a Finance** (Workforce/HR → Finance). El payable listo genera UNA `payment_obligation` vía bridge reactivo. Finance sigue siendo owner de payment orders, banco y conciliación. Módulo: `src/lib/contractor-engagements/payables/` (barrel pure-only: types/state-machine/withholding/readiness; el store es server-only, importado directo). El payout del contractor es `economic_category='labor_cost_external'` — **NUNCA payroll dependiente**.

**State machine + CHECK + audit trio** (patrón TASK-700/765/790/792): `contractor_payables` (CHECK enums + CHECK `net_payable = gross_amount - withholding_amount` + CHECK `economic_category = 'labor_cost_external'` + BEFORE UPDATE transition trigger) + append-only `contractor_payable_events` (anti-UPDATE/DELETE). Matriz: `pending_readiness→{ready_for_finance,blocked,cancelled}`, `ready_for_finance→{obligation_created,blocked,cancelled}`, `obligation_created→{payment_order_created,cancelled}`, `payment_order_created→{paid,cancelled}`, `blocked→{pending_readiness,cancelled}`, `paid`/`cancelled` terminales. Mirror TS: `assertValidPayableTransition` (`payables/state-machine.ts`).

**Anchor + dup guard**: FK NOT NULL a `contractor_engagements` (RESTRICT) + FK opcional a `contractor_work_submissions`. `createContractorPayableFromSubmission` lockea la submission `approved ∧ consumed_by_payable_id IS NULL`, inserta el payable y setea `consumed_by_payable_id` **en la misma tx** (dup-guard: lock + DB UNIQUE partial `WHERE status<>'cancelled'`). El ALTER de TASK-793 cierra la FK que TASK-792 dejó NULL forward-compat. `createContractorPayableOffCycle` (reason ≥10) para ajustes/bonus sin submission.

**Withholding (D-793-8)**: `computeContractorWithholding` (pure) retiene SOLO honorarios CL bajo `taxComplianceOwner='greenhouse_policy'` con `taxWithholdingRateSnapshot` del engagement (TASK-790 — **NUNCA recomputa la tasa SII**); todo otro lane retiene 0 (provider/country engine maneja su tax local). `net = gross − withholding` enforced por CHECK DB.

**Readiness fail-closed**: `evaluatePayableReadiness` (pure, 7 gates) — source aprobado / invoice-asset presente cuando `requires_invoice` / net reconcilia / `obligationCurrency ∈ {CLP,USD}` / FX resuelto cuando `payment_currency ≠ currency` / payment-profile resuelto **o waiver gobernado** / provider-split presente cuando `payroll_via ∈ {deel,remote,oyster}`. `assessPayableReadiness` (server) resuelve los inputs (invoice via `listContractorInvoiceAssetsByEngagement`, FX via `getLatestStoredExchangeRatePair`) y alimenta el evaluador puro. `transitionPayableToReadyForFinance` → si OK `ready_for_finance` (+emite el evento que dispara el bridge); si no, persiste blockers + `blocked` + throw.

**Bridge (TASK-771 reactive pattern)**: projection `contractor_payable_finance_obligation` consume `workforce.contractor_payable.ready_for_finance`, **re-lee el payable de PG (NUNCA confía el payload)**, skip idempotente si no existe / no-ready / unsupported currency, crea UNA `payment_obligation` (`createPaymentObligation`, idempotente por su UNIQUE; `source_kind=contractor_payable`, `sourceRef=payableId`, `amount=net_payable`, `obligation_kind=provider_payroll`) y marca `obligation_created` (`markPayableObligationCreated`, no-op si ya linkeado al mismo id). `maxRetries=5`. ALTER `payment_obligations` source_kind `+contractor_payable` (additivo, shared Finance infra — solo agrega un valor al enum).

**Access**: capabilities `finance.contractor_payable` (read/create/manage) + `finance.contractor_payable.waive_payment_profile` (update, **admins-only**) + runtime grants (finance route_group ∪ FINANCE_ADMIN ∪ EFEONCE_ADMIN; waiver solo FINANCE_ADMIN ∪ EFEONCE_ADMIN) — grant-coverage test verde. API `/api/finance/contractor-payables` (GET list / POST create) + `[id]` (GET) + `[id]/{ready,cancel,waive-payment-profile}` (POST), gated por `can(tenant,…)` (el helper acepta el tenant context directo — NO existe `@/lib/entitlements/subject`).

**⚠️ Reglas duras** (no-regresión Payroll + canónicas):

- **NUNCA** escribir/mutar `payroll_entries`, `payroll_adjustments`, `compensation_versions`, `final_settlements` desde el payable ni desde el bridge. El payout contractor jamás entra como payroll dependiente.
- **NUNCA** sobrescribir `members.{payroll_via,contract_type,pay_regime}`. El payable usa `payroll_via`/`tax_compliance_owner` del engagement como input read-only.
- **NUNCA** aplicar deducciones Chile dependientes (AFP/Fonasa/AFC/SIS/IUSC) — solo retención SII versionada para honorarios CL.
- **NUNCA** crear el `payment_obligation` con `amount=gross`. SIEMPRE `amount=net_payable` (la retención ya se descontó; provider fees/FX spread son obligaciones separadas — TASK-795).
- **NUNCA** confiar el payload del evento en el bridge — re-leer el payable de PG por `contractorPayableId` (defensive re-read, TASK-771).
- **NUNCA** transicionar fuera de la matriz canónica (trigger DB + `assertValidPayableTransition`) ni UPDATE/DELETE sobre `contractor_payable_events`.
- **NUNCA** marcar `ready_for_finance` sin pasar el readiness fail-closed; el waiver de payment-profile requiere capability admin + reason ≥10.
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', …)`.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio (verde: 522 passed).
- **SIEMPRE** que emerja un mecanismo nuevo de payout contractor (provider fee, FX leg — TASK-795), modelarlo como obligación separada, NO mezclarlo en el `net_payable` del payable.

**Reliability** (moduleKey finance, rollup Finance Data Quality, steady=0): `finance.contractor_payable.ready_without_obligation` (lag, ready >30min sin `finance_obligation_id`) + `finance.contractor_payable.bridge_dead_letter` (dead_letter, reactive log `handler='contractor_payable_finance_obligation:…' AND result='dead-letter'`). **Outbox v1**: `workforce.contractor_payable.{created,ready_for_finance,obligation_created,blocked,cancelled}` (aggregateType `contractor_payable`).

**Spec canónica**: `docs/tasks/complete/TASK-793-contractor-payables-finance-obligations-bridge.md`. Migración: `20260531010000000`. Patrones fuente: TASK-790 (engagement anchor + trio), TASK-791 (invoice-asset readiness), TASK-792 (submission consume dup-guard), TASK-748/765 (payment_obligations + idempotencia), TASK-771 (reactive projection + re-read defensivo), TASK-873/935 (capability grant coverage).

### Chile Honorarios Compliance invariants (TASK-794, desde 2026-05-30)

`src/lib/contractor-engagements/chile-honorarios/` es la **capa de compliance Chile honorarios** sobre Contractor Engagements + Payables. **NO es dueña de la tasa SII**: la tasa vive en `getSiiRetentionRate` (payroll SSOT, `src/types/hr-contracts.ts`) y se expone a contractors vía `resolveHonorariosWithholdingPolicy` (TASK-790). El módulo reusa esas primitivas + el `computeContractorWithholding` (TASK-793) y agrega los invariantes honorarios. Barrel pure-only; `readiness.ts` server-only importado directo (TASK-827).

**Tasa SII oficial** (Ley 21.133 schedule gradual, verificado watchlist payroll-auditor): 2024=13.75%, 2025=14.5%, **2026=15.25%** (desde 2026-01-01), 2027=16%, 2028=17%. Vive en `SII_RETENTION_RATES` — **NUNCA tocar desde este dominio**.

**3 gates fail-closed** en `evaluatePayableReadiness` + `assessPayableReadiness`:
- `classification_risk_blocking` — **universal** (todos los lanes). Defensa payable-level que espeja el CHECK del engagement `active ⇒ classification_risk no bloqueante` (`isClassificationRiskBlocking`).
- `rut_unverified` — **honorarios only**. RUT chileno verificado vía person-legal-profile `honorarios_closure` (CL_RUT `verified`; sin dirección; fail-closed: lookup que falla = bloqueado).
- `honorarios_withholding_mismatch` — **honorarios only**. Recompute SII-only (`computeChileHonorariosPayout`) y bloquea si el `withholding`/`net` persistido difiere → atrapa cualquier deducción dependiente o tasa errónea.

**⚠️ Reglas duras (no-regresión payroll + canónicas)**:
- **NUNCA** romper el cálculo honorarios legacy de payroll (`src/lib/payroll/calculate-honorarios.ts`) ni mutar `SII_RETENTION_RATES` al converger hacia contractor payable. Cero cambio de números — gate `pnpm vitest run src/lib/payroll` bit-for-bit.
- **NUNCA** aplicar AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC/APV/gratificación legal a honorarios (ni payroll legacy ni contractor payable). Solo retención SII. El guard `assertNoDependentDeductions` + `DEPENDENT_DEDUCTION_KINDS` es el SSOT de lo prohibido.
- **NUNCA** re-implementar `gross * rate` para honorarios — `computeChileHonorariosPayout` delega a `computeContractorWithholding` (TASK-793 SSOT). El número del payable nace del path genérico (parity garantizada); el módulo honorarios lo **recompute en readiness** como defensa.
- **NUNCA** hardcodear la tasa SII inline. Versionada en `tax_withholding_policy_code` (`cl_honorarios_<year>_<rate>`) + `tax_withholding_rate_snapshot` (snapshot al start del engagement, TASK-790).
- **NUNCA** crear `final_settlements`/`final_settlement_documents` para honorarios — su cierre es `contractor_closure` (TASK-797), NUNCA finiquito.
- **NUNCA** migrar masivamente honorarios payroll legacy a contractor payables. Convergencia gradual por miembro; los pagos legacy no se rompen (cutover documentado en arch Delta 2026-05-30).
- **SIEMPRE** que un payable honorarios necesite "¿se puede pagar?", pasar por `assessPayableReadiness` (los 3 gates corren ahí, solo honorarios_cl salvo classification que es universal). Cero recompute inline en consumers.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` como gate al tocar este dominio.

**Reliability**: `hr.contractor_payable.honorarios_rut_unverified` (kind=data_quality, moduleKey=identity, steady=0) — honorarios_cl activos sin CL_RUT verificado (payable bloqueado). **Sin migración, sin capabilities/outbox nuevos** (reusa `finance.contractor_payable:manage` + evento `workforce.contractor_payable.blocked v1`).

**Spec canónica**: `docs/tasks/complete/TASK-794-chile-honorarios-compliance-sii-retention.md`. Arch Delta: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (2026-05-30). Patrones fuente: TASK-790 (tax-policy SSOT + classification-risk), TASK-793 (withholding + readiness fail-closed), TASK-784 (person-legal-profile readiness), TASK-758 (SII retention SSOT payroll), TASK-721/766/774 (VIEW/helper + reliability signal pattern).

### International Contractor Boundary invariants (TASK-795 Fase A, desde 2026-05-30)

Fase A de TASK-795 sobre Contractor Payables. Establece la **frontera tributaria** del contractor internacional/provider en el readiness fail-closed, **sin computar withholding** (eso es el motor `international_internal`, TASK-905/906/907). **Cero migración, cero capability, cero outbox, cero código payroll** (mismo patrón TASK-794). Fase B (provider settlement split + EOR beneficiary + reconciliación) **diferida** (minoría; el grueso de contractors son directos por `Efeonce Group SpA`).

**2 gates nuevos** en `evaluatePayableReadiness` + `assessPayableReadiness`:
- `tax_owner_review_required` — **universal, fail-closed**. Bloquea cuando `engagement.taxComplianceOwner ∈ {manual_review_required, country_engine_owned}`. El dominio contractor **NUNCA** aplica una tasa Chile→no-residente por su cuenta; bloquea y **escala** al withholding engine (TASK-905) o a revisión humana (D-795-4).
- `fx_policy_unresolved` — **solo cross-currency** (`fxNeeded`). Exige `fx_policy_code` declarado en el engagement; una tasa que existe (`fxSupported`) NO basta — el cambio debe ser auditable, no incidental (D-795-1). `payment_currency` ∈ {CLP,USD} ya lo refuerza `currency_unsupported`.

**Dimensión raíz canónica** (D-795-5): la **entidad contratante** vive en `contractor_engagements.legal_entity_organization_id` (NOT NULL, Operating Entity `is_operating_entity=TRUE`). El `tax_compliance_owner` (de ahí los gates) es **consecuencia** de la entidad contratante × país del contractor. Hoy la única es `Efeonce Group SpA` (Chile); roadmap multi-entidad (EEUU) → leer del campo, **NUNCA hardcodear "Efeonce/Chile"**.

**⚠️ Reglas duras**:
- **NUNCA** computar una retención Chile→no-residente desde el dominio contractor (790-798). Ese motor es `international_internal` (TASK-905/906/907). El gate `tax_owner_review_required` bloquea y escala; jamás aplica una tasa.
- **NUNCA** aplicar deducciones estatutarias Chile a un payable internacional/provider (ya garantizado: `computeContractorWithholding` retorna 0 para no-honorarios).
- **NUNCA** liquidar un payable cross-currency sin `fx_policy_code` declarado (gate `fx_policy_unresolved`) ni en moneda fuera de {CLP,USD} (gate `currency_unsupported`). Lo exótico → `manual_review`/off-rail.
- **NUNCA** mutar `members.{pay_regime,payroll_via,contract_type}` ni generar `payroll_entries` desde un payable contractor.
- **NUNCA** hardcodear "Efeonce/Chile" como el pagador; leer `legal_entity_organization_id`.
- **SIEMPRE** que un payable necesite "¿se puede pagar?", pasar por `assessPayableReadiness` (los gates corren ahí). Cero recompute inline.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` al tocar este dominio.

**Reliability** (moduleKey finance, steady=0): `finance.contractor_payable.tax_review_overdue` (drift, blocked por tax-owner >7d) + `finance.contractor_payable.fx_unresolved_overdue` (lag, blocked por FX >3d).

**Invariantes contables** (review `greenhouse-finance-accounting-operator`): la retención es **pasivo a remesar al SII** (F29/F50), no resta de costo (gasto = bruto); reconocimiento por **devengo** en el período del trabajo; clasificación P&L con categorías canónicas existentes (worker→`labor_cost_external`, provider fee→`vendor_cost_professional_services`, FX spread→`financial_cost`, remesa→`tax`). Detalle en el arch doc.

**Spec canónica**: `docs/tasks/complete/TASK-795-international-contractor-provider-boundary-fx-policy.md` (D-795-1..5). Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (Delta 2026-05-30). Fase B diferida → promovible a task derivada cuando exista un contractor real por plataforma/EOR. Patrones fuente: TASK-794 (readiness gate + signal pattern), TASK-790 (tax-policy + entidad contratante), TASK-893 (timestamp arithmetic gate).

### Contractor Self-Service Hub invariants (TASK-796, desde 2026-05-30)

Las dos superficies UI del dominio contractor (`/my/contractor` self-service + `/hr/contractors` workbench HR) consumen **una projection canónica server-only** que es el ÚNICO productor del view-model. La UI NUNCA re-deriva readiness, timeline, blockers ni KPIs desde rows de dominio. Los mockups (`src/views/greenhouse/contractors/mockup/**`) quedan intactos como referencia aprobada + escenarios GVC; el runtime vive en `src/views/greenhouse/contractors/*` (sin `/mockup`).

**Capa de datos canónica** (patrón TASK-835 sample-sprints / TASK-611 organization-workspace):

- `src/lib/contractor-engagements/projection-types.ts` — view-model puro `ContractorSelfServiceScenario` + `ContractorHrWorkbenchProjection` (NOT server-only; shared client+server). Mirror del mockup `ContractorScenario` para wiring de cambio mínimo.
- `self-service-scenario.ts` — mapper PURO (no IO, testeable). Deriva kind/readiness/timeline/blockers/KPIs/supportItems. **Filtra Finance-only** (provider_statement/payout_receipt/fx_receipt) — el contractor NUNCA ve provider statements/fees.
- `self-service-projection.ts` — orquestador server-only: `getActiveContractorEngagementForProfile(identityProfileId)` + composición via `withSourceTimeout` + degradación honesta + cache TTL 30s. El engagement se resuelve del `identityProfileId` de sesión (sin IDOR).
- `hr-workbench-projection.ts` — compone la cola HR de los 3 listers (engagements `pending_review` + submissions `submitted/disputed` + payables `blocked/ready/paid`) + signals derivados honestamente. Cache TTL 30s.
- `active-engagement-flag.ts` — EXISTS barato fail-safe para el flag JWT del nav (NO importar la projection desde auth.ts — pulls el grafo finance).

**API self-service canónica** (`requireMyTenantContext`, scope=own, member-scoped — el carril que faltaba; todo lo entregado en 790-795 era HR/Finance-gated):

- `GET /api/my/contractor` (capability `personal_workspace.contractor.read_self`) — projection propia.
- `POST /api/my/contractor/work-submissions` (capability `personal_workspace.contractor.submit_self`) — create+submit contra el engagement PROPIO (engagementId resuelto server-side, NUNCA del cliente).
- `POST /api/my/contractor/attach-asset` — adjunta boleta/evidencia via `attachContractorInvoiceAsset` (TASK-791); rechaza roles provider-only.
- HR workbench: `GET /api/hr/contractors/workbench` (reusa `hr.contractor_work_submission:read`); review por el PATCH existente `/api/hr/contractors/work-submissions/[id]` (TASK-792).

**Nav dinámico** (decisión operador 2026-05-30): el ítem `/my/contractor` aparece SOLO si el member tiene engagement activo → flag JWT `hasActiveContractorEngagement` resuelto una vez por sesión en `auth.ts` (mirror `supervisorAccess`, fail-safe) → session → `TenantContext` → `VerticalMenu`. `/hr/contractors` gated por viewCode `equipo.contratistas` (HR + Finance + Admin).

**⚠️ Reglas duras**:

- **NUNCA** modificar los mockups bajo `src/views/greenhouse/contractors/mockup/**` — son la referencia aprobada + escenarios GVC. El runtime vive en `src/views/greenhouse/contractors/*`.
- **NUNCA** re-derivar readiness/timeline/blockers/KPIs en la UI ni en el route handler. Toda derivación pasa por el mapper puro `self-service-scenario.ts`. La projection es el único productor.
- **NUNCA** exponer al contractor provider statements / fees / montos Finance-only. El mapper filtra los asset roles `provider_statement/payout_receipt/fx_receipt`; los blockers se mapean a responsable `Contractor` vs `Finance`.
- **NUNCA** copy que implique nómina dependiente / sueldo / finiquito / AFP / liquidación en las superficies contractor. Validar con `greenhouse-ux-writing`. La aprobación operacional NO ejecuta el pago.
- **NUNCA** aceptar un `contractorEngagementId` del cliente en el carril self-service. El engagement se resuelve server-side del `identityProfileId` de sesión (anti-IDOR).
- **NUNCA** importar `self-service-projection.ts` (ni su grafo) desde `auth.ts`. El flag JWT usa `active-engagement-flag.ts` (módulo mínimo fail-safe). Un error en la resolución del flag NUNCA debe romper auth (degrada a `false` → el ítem no aparece).
- **NUNCA** reconstruir Payment Profiles dentro de TASK-796. El handoff solo enlaza/lee estado de `/my/payment-profile` (TASK-753). Closure es visibility-only (cierre real = TASK-797).
- **NUNCA** agregar viewCode a `VIEW_REGISTRY` TS sin migración seed acompañante en el mismo PR (governance TASK-827) — aplica a `mi_ficha.mi_contratacion` + `equipo.contratistas` (migración `20260531030000000`).
- **SIEMPRE** que emerja una surface contractor nueva, consumir la projection canónica + reusar las primitivas; cero composición ad-hoc.

**Spec canónica**: `docs/tasks/complete/TASK-796-contractor-self-service-hub.md`. Doc funcional: `docs/documentation/hr/contratistas-self-service.md`. Manual: `docs/manual-de-uso/hr/contratistas.md`. Patrones fuente: TASK-835 (runtime projection), TASK-611 (projection + degraded honest), TASK-753 (`/api/my/*` member-scoped + payment profile handoff), TASK-791/792 (assets + work submissions), TASK-827 (View Registry Governance), TASK-727 (flag JWT por sesión).

### Contractor domain ↔ Finiquito/Offboarding non-regression boundary (hard rule, desde 2026-05-30)

El dominio Contractor Engagements (TASK-790→796 + la transición employee→contractor TASK-956) **NUNCA** debe romper el cálculo de finiquito (TASK-863) ni el flujo de offboarding (TASK-862/890/892) — son sistemas owned por Payroll/Workforce con mucho desarrollo invertido. La relación entre dominios es **read-only / append-only**: el contractor domain cierra la relación legal + abre la contractor + crea el engagement; **nunca toca el finiquito ni muta el offboarding**.

- **NUNCA** escribir/mutar `greenhouse_payroll.final_settlements` ni `final_settlement_documents` desde código del dominio contractor (engagements, payables, work submissions, transición). El finiquito es owner exclusivo de Payroll (TASK-863): el contractor domain no crea, modifica, anula ni regenera ningún finiquito, ni importa su calculator (`src/lib/payroll/final-settlement/**`).
- **NUNCA** gatear el cierre de una relación laboral (`endPersonLegalEntityRelationship`) a la ratificación del finiquito, ni forzar/disparar la ratificación notarial. Relación legal y finiquito están **desacoplados por diseño** (un offboarding `executed` NO cierra la relación; nadie llama `endPersonLegalEntityRelationship` desde offboarding). La transición cierra la relación canónicamente con el finiquito en cualquier estado.
- **NUNCA** modificar el state machine, lanes, work-queue ni la ejecución del offboarding de forma que altere comportamiento existente. El wiring del lane `relationship_transition` es **ADITIVO** (dispara el comando de transición + appendea el evento canónico `offboarding_case.relationship_transition_completed` que ya emite TASK-789). El offboarding case se lee `FOR UPDATE` pero **solo se le appendea evento** — nunca se re-ejecuta, re-clasifica ni se muta su `status`/`rule_lane`/`separation_type`. NUNCA re-ejecutar un case ya `executed`.
- **NUNCA** mutar `members.{contract_type,pay_regime,payroll_via}` desde la transición a contractor sin resolver primero el riesgo de doble-pago (reclasificar a `honorarios` puede re-incluir a la persona en el payroll honorarios legacy). El payout del contractor fluye SOLO por engagement → payable → Finance, jamás por `payroll_entries` ni finiquito. La exclusión de payroll post-salida la da el offboarding case `executed` (TASK-890), no `member.contract_type`.
- **SIEMPRE** correr como gate de cierre obligatorio de cualquier slice que toque el dominio contractor o su transición: `pnpm vitest run src/lib/payroll` (incluye toda la suite de finiquito) + `pnpm vitest run src/lib/workforce/offboarding`. Cualquier rojo en finiquito u offboarding es **regresión** (no "test ajeno") → NO cerrar.

**Spec canónica**: `docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md` (§Payroll & Offboarding Non-Regression Guardrails). Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (§Non-Negotiable Distinctions: contractor cierre ≠ finiquito).

### Employee→Contractor connected command invariants (TASK-956, desde 2026-05-30)

`transitionEmployeeToContractorEngagement(input)` (`src/lib/contractor-engagements/transition-from-employee.ts`) es el **único entry point canónico** para convertir a un colaborador en contractor con engagement. Cierra el seam huérfano: antes `transitionEmployeeToContractor` (TASK-789) tenía 0 callers y la creación de engagement vivía solo en seeds/tests. El comando compone, en **una sola transacción atómica**, el cierre de la relación `employee` + la apertura de la `contractor` + la creación del `ContractorEngagement` (TASK-790). Keyed en el offboarding case `executed` (decoupled de la ratificación del finiquito → cierra sin forzar notaría).

**⚠️ Reglas duras**:

- **NUNCA** convertir a un colaborador en contractor llamando `endPersonLegalEntityRelationship` + `createContractorEngagement` por separado desde un consumer. Toda transición employee→contractor con engagement pasa por `transitionEmployeeToContractorEngagement` — single source of truth atómico. Llamadas separadas dejan estado parcial (relación cerrada sin engagement, o engagement sin relación) que el signal `hr.contractor.transition_orphan` detecta.
- **NUNCA** componer la transición sin pasar `client` (el `PoolClient` de la tx) a los helpers dual-mode (`transitionEmployeeToContractor`, `createContractorEngagement`). El dual-mode (`client?: PoolClient` opcional, patrón TASK-765/771/872) es lo que garantiza atomicidad — sin él, un fallo a mitad deja estado parcial sin rollback.
- **NUNCA** mutar `member.contract_type`/`pay_regime`/`payroll_via`, el finiquito ni el status del offboarding desde el comando (ver §boundary arriba). El comando es read-only/append-only sobre esos dominios.
- **NUNCA** crear el engagement con un subtype derivado inline. Usar el mapper puro `mapRelationshipSubtypeToEngagementSubtype` (honorarios→honorarios_cl; contractor+CL→freelance; contractor+non-CL→international_contractor).
- **SIEMPRE** el comando debe ser idempotente/orphan-resume: re-ejecutar sobre un case ya transicionado retorna `already_complete`; si la relación contractor existe pero falta el engagement, lo crea (`engagement_created_on_existing_relationship`). NUNCA re-ejecutar un cierre de relación ya cerrado.
- **SIEMPRE** que emerja una transición desde otro contexto (provider/plataforma, EOR — TASK-955), reusar este comando extendiendo el mapper + el subtype, NO duplicar el wiring atómico.

**Reliability signal**: `hr.contractor.transition_orphan` (moduleKey identity, kind drift, steady=0) — relaciones contractor activas creadas por transición sin engagement asociado. **Spec**: `docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md`.

### Contractor ↔ Legacy Payroll double-rail exclusion + current work classification (TASK-957, desde 2026-05-30)

Una persona puede cobrar por **dos rieles de pago que no se hablan**: la nómina legacy honorarios (el motor rutea por `compensation_versions.contract_type='honorarios'` → `calculateHonorariosTotals` aplica retención SII) y el contractor payable nuevo (TASK-794, misma retención SII por el riel contractor → payable → Finance). Si ambos corren para la misma persona/período → **doble-pago + doble declaración F29 retenciones honorarios** (Efeonce remesa doble al SII + doble crédito tributario). Veredicto 3-skill (finance + payroll + arch): el **SSOT de "¿se paga por nómina interna?" es la existencia de un `ContractorEngagement` activo, NO `member.contract_type`**.

**Slice A — gate de exclusión + señal (SHIPPED)**:
- Módulo canónico `src/lib/payroll/contractor-exclusion/` (espejo de `exit-eligibility/`): `resolveContractorEngagementPayrollExclusion` / `resolveContractorExcludedMemberIds`. Post-filtro en `pgGetApplicableCompensationVersionsForPeriod` gateado por `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` (default OFF → parity bit-for-bit). Excluye del roster legacy a quien tiene engagement engaged (active/paused/ending). NO foldear dentro de `resolveExitEligibilityForMembers` (dimensión ortogonal).
- Señal `payroll.contractor.double_rail_overlap` (moduleKey payroll, kind drift, severity error si count>0, steady=0): detecta engagement no-terminal + compensation_version vigente. Corre **regardless del flag** (detector temprano).

**Slice B — clasificación laboral vigente (SHIPPED)**:
- Resolver canónico `resolveCurrentWorkClassification({profileId, memberContractType?})` (`src/lib/account-360/current-work-classification.ts`): lee la relación activa (`person_legal_entity_relationships`) + `ContractorEngagement` activo → `{kind, employmentContractType, contractorSubtype, classificationRiskStatus, displayLabel, source}`. Prioriza `employee` (conservador si ambas activas). Person 360 (`PersonProfileTab`, el tab vivo) muestra "Estado vigente" desde el resolver + "Contrato de empleo" (historia).

**⚠️ Reglas duras**:
- **NUNCA** mutar `member.contract_type` para reflejar una relación contractor. Es el tipo de contrato de **EMPLEO** — queda como historia cuando el empleo termina. `'honorarios'` rutearía al riel SII legacy → doble declaración F29. Un nuevo valor de enum = SSOT competidor del `relationship_subtype` del engagement + extiende la taxonomía gobernada `payroll.contract_taxonomy.invalid_tuple_drift` (3 tuplas) + rompe el boundary payroll↔contractor. PROHIBIDO.
- **NUNCA** branchear la clasificación laboral vigente inline en una surface. Pasa por `resolveCurrentWorkClassification`. El SSOT de estado vigente es `person_legal_entity_relationships` + `ContractorEngagement`; `member.contract_type` es derivación histórica de empleo.
- **NUNCA** filtrar "empleados activos" por `contract_type IN ('indefinido','plazo_fijo') AND active=TRUE` (incluiría por error a un contractor ex-empleado activo). Filtrar por relación de empleo activa. (Audit 2026-05-30: 0 callsites legacy.)
- **NUNCA** keyear el gate de exclusión por `contract_type='contractor'`. Keyea por engagement → los contractors internacionales legacy modelados como `member.contract_type='contractor'`+`payroll_via='deel'` SIN engagement (Andrés/Daniela/Melkin) NO son tocados (siguen su passthrough Deel).
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'payroll' | 'identity', ...)`.
- **SIEMPRE** que un contractor con engagement activo NO debe tener compensation_version vigente (su compensación vive en el engagement); cerrar la comp version al transicionar (canónicamente vía el `closeFuturePayrollEligibility` del offboarding o el script `scripts/payroll/close-contractor-orphan-comp-version-task957.ts`). La señal `double_rail_overlap` lo detecta.

**Nota toDateStr (Slice B)**: `getPersonHrContext` lanzaba `v.slice is not a function` para cualquier miembro con `hire_date` no-null (pg devuelve DATE como objeto Date; `toDateStr` asumía string) → toda la sección HR fallaba. Fix: `toDateStr` robusto a string|Date (espejo del `toDateString` de account-360). Bug latente pre-existente surfaceado por la feature (patrón TASK-765).

**Spec canónica**: `docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md`. Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30. Helpers: `resolveContractorExcludedMemberIds`, `resolveCurrentWorkClassification`. Señal: `payroll.contractor.double_rail_overlap`.

### Contractor Closure + Transition Controls invariants (TASK-797, desde 2026-06-01)

El cierre de un contractor es un **lifecycle PROPIO** — **NUNCA finiquito laboral**. Se modela sobre el state machine existente del engagement (`active/paused → ending → ended`, TASK-790) + columnas de metadata de cierre en `greenhouse_hr.contractor_engagements`. **NO** hay tabla/aggregate de cierre aparte (el cierre es 1:1 con el engagement; el audit vive en el append-only `contractor_engagement_events`). Módulo: `src/lib/contractor-engagements/closure/` (barrel pure-only: types + readiness; el store es server-only, importado directo).

**Readiness** (`closure/readiness.ts`, pure — mirror de `evaluatePayableReadiness` TASK-793): blockers **ACKNOWLEDGEABLE** (`open_work_submissions`, `open_payables`, `provider_termination_ref_missing`, `classification_risk_blocking`) — el operador puede cerrar de todas formas reconociéndolos con razón (override gobernado + auditado); `ready` exige cero blockers SIN reconocer. Advisory `access_handoff_reminder` (solo si hay portal member): informativo, **NUNCA bloquea** — el access offboarding es SEPARADO del cierre contractual.

**Comandos** (`closure/store.ts`, server-only): `assessContractorClosureReadiness` (resolver read-only), `initiateContractorClosure` (→ `ending`, winding-down), `executeContractorClosure` (→ `ended`, readiness-gated, atómico two-step active/paused→ending→ended en una tx), `setPostClosureInvoicesAllowed` (política post-cierre). API: `GET/POST /api/hr/contractors/[id]/closure` (capability `hr.contractor_engagement:manage`/`:read`).

**⚠️ Reglas duras (boundary payroll TASK-890 + canónicas)**:

- **NUNCA** disparar `greenhouse_payroll.final_settlements`/`final_settlement_documents` ni el flujo "Calcular finiquito" desde el cierre contractor. El cierre es `contractor_closure` (lifecycle propio), no finiquito dependiente. NUNCA usar causales DT ni documento de finiquito para contractor/honorarios.
- **NUNCA** alterar las lanes de `work_relationship_offboarding_cases` (`relationship_transition`/`internal_payroll`/`external_payroll`/`non_payroll`/`identity_only`) que consume el exit eligibility resolver (TASK-890), ni reactivar una relación dependiente cerrada al cerrar la contractor.
- **NUNCA** llevar un engagement a `ending`/`ended` por la transición genérica (`PATCH /api/hr/contractors/[id]` action `transition`). El cierre se canaliza SIEMPRE por el flujo dedicado (`POST .../closure`) que aplica readiness + metadata + eventos. El route handler rechaza targets `ending`/`ended` (`use_closure_flow`).
- **NUNCA** crear nuevas work submissions cuando el engagement está en `ending`/`ended`/`cancelled`. Guard canónico `isPostClosureLockedEngagementStatus` (distinto de `isTerminalEngagementStatus`, que excluye `ending`).
- **NUNCA** crear payables tras `ended` salvo `post_closure_invoices_allowed=TRUE` (política explícita auditada vía `setPostClosureInvoicesAllowed`); `cancelled` NUNCA permite payables. Durante `ending` (winding-down) SÍ se liquidan los payables de trabajo ya aprobado. Guard `assertPayableCreationAllowedForClosure` en ambos paths de create.
- **NUNCA** recomputar la readiness de cierre inline en consumers — pasar por `evaluateContractorClosureReadiness` (pure) o `assessContractorClosureReadiness` (server). Un blocker nuevo se agrega al enum `ContractorClosureBlockerCode` + al evaluador, no inline.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'contractor_closure_*' } })`.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` como gate de cierre (boundary finiquito + exit eligibility intactos).

**Eventos**: `workforce.contractor_engagement.closure_initiated v1` (nuevo, → ending) + `ended v1` reusado con payload enriquecido (`lifecycle:'closure_executed'`, `closureReason`, `postClosureInvoicesAllowed`). **Signal**: `hr.contractor_engagement.closed_with_open_payables` (data_quality, moduleKey=identity, steady=0) — defense-in-depth de cierres con payables abiertos por liquidar.

**Spec canónica**: `docs/tasks/in-progress/TASK-797-contractor-closure-transition-controls.md`. Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-06-01. Migración: `20260601131829099`. Patrones fuente: TASK-790 (engagement state machine + audit trio), TASK-793 (readiness fail-closed evaluator), TASK-892 (closure-completeness aggregate), TASK-890 (boundary payroll).

### Compensation version tuple drift — payroll-safe reconcile + validated CHECK (TASK-958, desde 2026-05-31)

`members.contract_type` (CHECK 3-way `members_contract_payroll_tuple_check`, validado) y `compensation_versions.contract_type` pueden divergir. El CHECK `compensation_versions_contract_pay_regime_check` estaba **NOT VALID** → filas viejas con tuplas inconsistentes (`(indefinido, international)`) quedaban grandfathered. Caso fundacional: contractors internacionales Deel (Melkin/Andres/Daniela) con comp versions tempranas mal clasificadas como `indefinido`. TASK-958 cerró el drift class.

**⚠️ Reglas duras**:

- **NUNCA** reconciliar la tupla `(contract_type, pay_regime)` de una `compensation_version` sin **probar payroll-neutralidad before/after**: el primitivo canónico `scripts/payroll/reconcile-compensation-version-tuple.ts` computa `buildPayrollEntry` con la tupla actual vs target y solo aplica si los campos **monetarios** (`grossTotal`, `netTotalCalculated`, todas `chile*`, `siiRetentionAmount`) son byte-idénticos; si difieren, **aborta sin mutar**. Las etiquetas (`contractTypeSnapshot`, `payRegime`, `deelContractId`) cambian a propósito y se excluyen de la comparación.
- **NUNCA** asumir que tocar una `compensation_version` afecta sueldos ya pagados: los `payroll_entries` guardan sus **propios montos snapshot** (`gross_total`, `net_total`, `contract_type_snapshot`) en tabla separada — congelados. El reconcile UPDATEa solo `compensation_versions` → los pagos son intocables (verificado: payroll_entries byte-idénticos before/after).
- **NUNCA** reconciliar la tupla del member-side: el `member` es el SSOT canónico; se reconcilia la **comp version PARA matchear al member** (el primitivo aborta si el member tuple no es canónico). Para versiones históricas usar `--include-historical` (necesario para VALIDAR el CHECK, que verifica todas las filas).
- **SIEMPRE** que se valide un CHECK `NOT VALID` poblado, remediar TODOS los violadores (vigentes + históricos) primero; la migración incluye un DO block que aborta si quedan violadores (fuerza el orden remediación → VALIDATE) + un DO block post-VALIDATE que confirma `convalidated=true`.
- **NUNCA** crear un member `payroll_via='deel'` (`contractor`/`eor`) sin `deel_contract_id`. La señal `payroll.deel_member_without_contract_id` (moduleKey payroll, data_quality, steady=0) lo detecta; el valor real se backfillea operacionalmente desde Deel.

**Spec canónica**: `docs/tasks/complete/TASK-958-compensation-version-tuple-drift-remediation.md`. Script: `scripts/payroll/reconcile-compensation-version-tuple.ts` (dry-run default, `--apply`, `--include-historical`, assert payroll-neutral). Migración: `20260531105200124`. Señal: `payroll.deel_member_without_contract_id`.

### Contractor Remittance Advice invariants (TASK-960, desde 2026-05-31)

El **Comprobante de Pago / Remittance Advice** es una **proyección read-only del `ContractorPayable` pagado** (TASK-793) hacia el contractor — confirmación de pago de cuentas por pagar, jurisdiction-neutral, **NO laboral, NO documento tributario**. Módulo: `src/lib/contractor-engagements/remittance/`. Un solo `RemittancePresentation` struct alimenta dos renderers (visor MUI in-app + react-pdf descargable) → cero drift de contenido (patrón TASK-758). El struct shape ES el contrato (idéntico al mockup aprobado).

**Numeración `EO-RA-NNNNNN`** — correlativa **gapless**, **atómica** (advisory lock por issuer, mirror TASK-700) y **persistida una sola vez por payable** (idempotente — re-emitir muestra el mismo número). Registry append-only `greenhouse_hr.remittance_advice_numbers` + SQL fn `allocate_remittance_advice_number(issuer, payable)`. Serie scoped por `issuer_organization_id` (Operating Entity) → V1 una entidad, multi-entidad hereda serie-por-entidad gratis. Asignación **lazy en la primera emisión** (view/download); el read path de las listas solo LEE números (`getRemittanceAdviceNumbersForPayables`, batched) — null hasta primera emisión. Un hueco en la serie = comprobante anulado = red flag de auditoría.

**Helpers canónicos**:
- `allocateRemittanceAdviceNumber({issuerOrganizationId, contractorPayableId, client?})` / `getRemittanceAdviceNumber(payableId)` / `getRemittanceAdviceNumbersForPayables(payableIds)` — `remittance-number-allocator.ts`.
- `buildRemittanceAdvice(input, locale)` — PURE (`remittance-presenter.ts`). Mapea el data bag → struct; gross/withholding/net leídos **verbatim** del payable (cero recompute). Honest degrade para tax id / provider doc ausentes.
- `resolveRemittanceAdvice(payableId, {localeOverride?})` — server-only (`remittance-resolver.ts`). Gate `status='paid'`, issuer por id, beneficiario (name + tax masked) + locale (`identity_profiles.preferred_locale`) + número idempotente; surface `engagementProfileId` para anti-IDOR.
- `generateContractorRemittancePdf(presentation)` — react-pdf (`generate-contractor-remittance-pdf.tsx`, `REMITTANCE_TEMPLATE_VERSION`).
- `RemittanceAdviceViewer` + `RemittanceAdviceSection` — `src/components/greenhouse/contractors/`.

**Endpoints**: `GET /api/my/contractor/remittance/[payableId]` (own, anti-IDOR `engagementProfileId === session.identityProfileId`, 404 no 403) + `GET /api/hr/contractors/remittance/[payableId]` (tenant, `?locale` toggle). Ambos: JSON struct o `?format=pdf` (`?disposition=inline|attachment`). Capabilities reusadas: `personal_workspace.contractor.read_self` (own) + `hr.contractor_engagement` (tenant) — sin capability nueva.

**⚠️ Reglas duras**:
- **NUNCA** llamar al documento "liquidación", "recibo (de sueldo)" ni anclar el título a un régimen/jurisdicción (`honorarios`/`SII`/`Chile`). Canónico técnico `Remittance Advice`; label es-CL **"Comprobante de Pago"**. Título único global; solo el **breakdown** varía.
- **NUNCA** recomputar montos en el presenter ni en consumers. Se leen verbatim del `ContractorPayable` (SSOT TASK-793/794). La retención SII 15.25% (2026) viene de `engagement.taxWithholdingRateSnapshot` (TASK-794), NUNCA recalculada.
- **NUNCA** componer el número `EO-RA` en TS ni con `nextval` (no gapless). Toda allocación pasa por la SQL fn (advisory lock + idempotencia + CHECK shape). NUNCA reasignar/re-numerar un payable ya emitido.
- **NUNCA** renderear el documento desde dos fuentes. Visor MUI + PDF consumen el **mismo struct** del presenter. NUNCA tocar la dirección visual aprobada (un solo acento verde `#2E7D32` en el neto, título neutro, chip neutro, disclaimer caja neutra, logo Efeonce única marca, **sin firma**).
- **NUNCA** hardcodear el emisor ("Efeonce", RUT, domicilio). El issuer se resuelve desde `contractor_engagements.legal_entity_organization_id` → `getOrganizationIssuerIdentityById` (multi-entidad forward-compat).
- **NUNCA** servir el comprobante al contractor sin re-validar `engagementProfileId === session.identityProfileId` server-side. Mismatch/unpaid/missing → `404` (anti-oracle, nunca leak de existencia). Finance-only fields nunca visibles al contractor.
- **NUNCA** emitir para un payable no `paid`. El resolver gatea `status='paid'`.
- **NUNCA** tratar el documento como comprobante tributario del contractor. Referencia su BHE/invoice (`contractorInvoiceId`, TASK-791) pero no lo reemplaza; footer lo declara explícito.
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', { tags: { source: 'remittance_*' } })`.
- **NUNCA** mutar/borrar filas de `remittance_advice_numbers` (append-only). Un hueco = comprobante anulado.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio (EPIC-013 no-regresión).
- **V1**: línea FX informacional omitida (el payable tiene `fxPolicyCode`, no la tasa aplicada → honest degrade, nunca inventa FX). Follow-up: poblar `fx` cuando se capture la tasa aplicada.

**Spec canónica**: `docs/tasks/complete/TASK-960-contractor-remittance-advice.md`. Migración: `20260531131226949`. Doc funcional: `docs/documentation/hr/contratistas-comprobante-de-pago.md`. Manual: `docs/manual-de-uso/hr/contratistas-comprobante-de-pago.md`. Patrones fuente: TASK-758 (presenter struct → MUI + PDF), TASK-700 (allocator gapless atómico), TASK-796 (self-service hub + projection), TASK-784 (tax id masked), TASK-872 (anti-oracle 404).

### Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968, desde 2026-05-31)

El **monto acordado** del contractor (`contractor_engagements.rate_amount` + `rate_type` + `payment_cadence`) lo **FIJA HR desde las vistas admin** — el contractor NUNCA lo tipea, solo lo ve derivado. Es la separación de funciones (SoD) canónica del dominio: **HR fija ≠ contractor cobra ≠ Finance paga**. Tres superficies + un guardrail fail-closed lo enforzan; el mockup aprobado (`src/views/greenhouse/contractors/mockup/ContractorCompensationMockupView.tsx`) es la referencia visual vinculante.

**Las 3 superficies canónicas**:

| Superficie | Quién | Qué hace |
| --- | --- | --- |
| Admin compensation editor (`ContractorEngagementCompensationDrawer` + `CompensationPanel` en el workbench) | HR/Finance/admin (`hr.contractor_engagement:update`) | Fija `rateType`/`rateAmount`/`paymentCadence` vía `PATCH /api/hr/contractors/[id]` action `update`. **Moneda read-only** (se define al crear el engagement). |
| Contractor self-service (`ContractorSubmissionComposer` + `ContractorSelfServiceView`) | Contractor (own) | Ve el monto **derivado read-only** (`agreedRate`); NO existe campo libre de bruto. El bruto se deriva del rate acordado (fixed → rate; timesheet → qty × rate). Sin rate → submit deshabilitado + warning "contacta a HR". |
| Finance workbench (`ContractorPaymentsWorkbenchView` en `/finance/contractor-payments`, TASK-974) | Finance admin (`finance.contractor_payable.override_agreed_amount`) | Autoriza el override gobernado (reason ≥10, auditado) desde el detalle del payable en Finanzas. El panel HR `ContractorGuardrailPanel` quedó **read-only** (muestra el bloqueo + link a Finanzas) — la autorización NO vive en superficie HR (cierra la ambigüedad SoD, ver TASK-974). |

**Guardrail fail-closed** (`evaluatePayableReadiness`, gate `payment_exceeds_agreed_amount`):

- Flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (default OFF → parity bit-for-bit). ON: un payable cuyo `gross > agreedAmount` (tolerancia 0.01) se bloquea salvo override.
- **Solo aplica a rate types de PERÍODO** (`fixed`/`retainer`/`milestone`/`project` — `PERIOD_AGREED_RATE_TYPES`). Unit-rate (`hourly`/`daily`) = no-op (qty × rate excede legítimamente el rate unitario; comparar un solo gross contra un rate por-unidad no tiene sentido → `agreedAmount=null`).
- Override: `agreed_amount_override_reason` en el payable (espejo del waiver `payment_profile_waiver_reason` TASK-793); actor + timestamp viven en `contractor_payable_events` (append-only). Helper `overridePayableAgreedAmount` + endpoint `POST /api/finance/contractor-payables/[id]/override-agreed-amount`.

**⚠️ Reglas duras**:

- **NUNCA** permitir que el contractor defina/tipee/edite su monto acordado. Se fija SOLO desde admin (`hr.contractor_engagement:update`). El composer del contractor NO tiene campo libre de bruto — lo deriva read-only del rate acordado. Cualquier UI nueva contractor-facing que muestre el monto lo muestra read-only.
- **NUNCA** otorgar la capability de override (`finance.contractor_payable.override_agreed_amount`) al mismo rol/persona que fija el monto. Es maker-checker: capability **distinta** de `hr.contractor_engagement` (HR fija; Finance no lo supera sin override). Admin-only (FINANCE_ADMIN + EFEONCE_ADMIN).
- **NUNCA** aplicar el guardrail a un rate type unit-rate (`hourly`/`daily`) — `agreedAmount` resuelve a `null` para esos → gate no-op. Solo `PERIOD_AGREED_RATE_TYPES` carga un monto comparable.
- **NUNCA** quitar el flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` ni cambiar su default OFF sin staging shadow-compare verde + sign-off Finance. OFF = `assessPayableReadiness` no evalúa el gate (parity pre-TASK-968).
- **NUNCA** mutar `agreed_amount_override_reason` por SQL directo. Toda autorización pasa por `overridePayableAgreedAmount` (reason ≥10, audit append-only en `contractor_payable_events`).
- **NUNCA** derivar/recomputar el monto del período en la UI del contractor o en un consumer — el bruto derivado lo computa el composer desde `agreedRate` (fixed → rate; timesheet → qty × rate); la projection (`self-service-scenario.ts`) expone `agreedRate` read-only.
- **NUNCA** invocar `Sentry.captureException` directo en estos paths. Usar `captureWithDomain(err, 'finance' | 'identity', ...)`.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate de cierre al tocar este dominio (boundary EPIC-013/TASK-957: no romper finiquito ni nómina legacy).
- **SIEMPRE** que emerja un mecanismo nuevo de pago contractor que pueda exceder lo acordado, pasarlo por `evaluatePayableReadiness` (el gate corre ahí). Cero comparación inline en consumers.

**Reliability signals** (steady=0): `hr.contractor_engagement.rate_unset` (data_quality, moduleKey identity, warning>0 — engagements activos sin `rate_amount`, detecta "falta fijar el monto") + `finance.contractor_payable.exceeds_agreed_amount` (drift, moduleKey finance, warning>0 — payables bloqueados por el guardrail sin override).

**Spec canónica**: `docs/tasks/complete/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md`. Migración: `20260531160513123`. Mockup aprobado: `src/views/greenhouse/contractors/mockup/`. Patrones fuente: TASK-790 (engagement rate fields), TASK-793 (waiver/override + readiness fail-closed), TASK-796 (self-service projection + composer), TASK-758 (presenter read-only), TASK-873/935 (capability grant coverage + SoD distinct capability).

### Contractor Payable Bank Settlement invariants (TASK-977, desde 2026-05-31)

El **settlement al banco de un contractor payable** (el net que efectivamente se le paga) corre por el **mismo motor de liquidación compartido con nómina** (`recordPaymentForOrder` + `markPaymentOrderPaidAtomic`), extendido con una **rama aditiva detrás de flag**. Cierra el gap verificado donde el motor lanzaba `out_of_scope_v1` para todo lo que no fuera `payroll`/`employee_net_pay` → el contractor no se podía pagar al banco. El path de nómina queda **100% intacto**.

**El expense del contractor es la precondición del settlement** (igual que nómina). Se materializa **reactivamente** cuando el payable llega a `ready_for_finance` (espejo de `payroll-expense-reactive` al `exported`), NO en el settlement:

- Helper: `materializeContractorPayableExpense` (`src/lib/finance/contractor-payable-expense-reactive.ts`) → `createFinanceExpenseInPostgres` con `expense_type='contractor'`, `source_type='contractor_payable'`, `economic_category='labor_cost_external'`, `total_amount=GROSS`, `supplier_id=NULL`, anclado por la columna nueva `expenses.contractor_payable_id` (FK, mirror de `payroll_entry_id`).
- Proyección reactiva: `contractor_payable_expense_materialize` (sibling del bridge `contractor_payable_finance_obligation`, mismo evento `workforce.contractor_payable.ready_for_finance`). Idempotente (dedup por `contractor_payable_id`).
- El settlement (rama contractor) resuelve el expense por `contractor_payable_id` → `recordExpensePayment(amount=net, paymentSource='contractor_system')` → settlement_leg → bank debit. Fallback defensivo: materialize on-demand si la proyección reactiva lagueó.

**Accounting canónico (invariante TASK-795 "gasto = bruto, retención = pasivo"):** `expense.total_amount = bruto`; `expense_payment.amount = neto`; la retención SII (bruto−neto) es **pasivo a remesar al SII por separado (F29)** — **out of scope de TASK-977**. Consecuencia: para honorarios CL el expense queda `partial` hasta que exista el flujo de remesa SII; para withholding=0 queda `paid`.

**⚠️ Reglas duras**:

- **NUNCA** modificar la rama `payroll`/`employee_net_pay` del motor de settlement al extenderlo. La rama contractor es **aditiva** (predicate `isContractorSettlementLine` + resolver `resolveContractorExpenseId*`); el path de nómina debe quedar bit-for-bit. Gate de cierre: `pnpm vitest run src/lib/payroll` + `src/lib/finance/payment-orders` verde.
- **NUNCA** cambiar el **default en código** del flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (sigue siendo `false` en `contractor-settlement-flag.ts`; se activa por env var override). OFF = el contractor lanza `out_of_scope_v1` (parity pre-TASK-977). **Estado vigente desde 2026-06-01**: el flag está **ON** (`="true"`) en los tres runtimes por decisión explícita del operador (Julio) — Vercel staging (live), Vercel producción (live tras redeploy `greenhouse-mbk5eu9z5`), y ops-worker (default `true` en `deploy.sh`). El gate canónico documentado (staging shadow + finance sign-off formal) se aceptó condensado en la decisión del operador; impacto inmediato bajo (sólo el engagement EO-CENG-0001 existe, sin órdenes de pago contractor materializadas aún). Si se necesita **revertir**, set env `="false"` en Vercel (ambos envs) + `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED=false bash services/ops-worker/deploy.sh` + redeploy — NO tocar el default de código.
- **NUNCA** clasificar el expense del contractor como nómina. `economic_category='labor_cost_external'` (resolver Rule 0 `CONTRACTOR_PAYABLE_SOURCE`, source-driven, first-match — crítico: un contractor que también es member activo resolvería a `labor_cost_internal` por Rule 1 si la regla source no fuera primera).
- **NUNCA** deducir la retención SII del `total_amount` del expense. El gasto es el bruto; la retención es pasivo. `withholding_amount` se persiste solo para audit.
- **NUNCA** anclar el expense del contractor por `member_id` (el beneficiary puede ser `identity_profile`, no member). El ancla canónica es `contractor_payable_id`.
- **NUNCA** usar `paymentSource='payroll_system'` para un pago de contractor. Es `'contractor_system'` (CHECK widened, distinguible/queryable).
- **NUNCA** invocar `Sentry.captureException` directo en estos paths. Usar `captureWithDomain(err, 'finance', ...)`.
- **SIEMPRE** que emerja un mecanismo nuevo de payout (provider split/EOR multi-leg — TASK-795 Fase B/955), modelarlo como rama aditiva del settlement con su propio resolver, NO mezclarlo con la rama contractor ni con nómina.

**Reliability signal**: `finance.contractor_payable.expense_unmaterialized` (data_quality, moduleKey finance, warning>0, steady=0) — payables comprometidos (>30min) sin expense materializado = precondición del settlement rota (materializador dead-letter).

**Out of scope (follow-ups)**: remesa SII de la retención (el expense honorarios queda `partial`); regla de `due_date` cierre+5d + SLA (TASK-978); corrida mensual (TASK-979). **Pendiente para pagar al banco end-to-end**: flip del flag + la UI de Finanzas (TASK-974).

**Spec canónica**: `docs/tasks/complete/TASK-977-contractor-payable-bank-settlement.md`. Migraciones: `20260531184945430` (anchor) + `20260531185842386` (payment_source CHECK). Patrones fuente: TASK-765 (settlement engine + atomic), TASK-793 (bridge reactivo), TASK-768 (economic_category resolver), TASK-795 (gasto=bruto/retención=pasivo), TASK-411 (payroll expense materializer reactivo).

### Contractor Payment Due-Date + SLA invariants (TASK-978, desde 2026-05-31)

El `due_date` de un `contractor_payable` se **deriva** del compromiso de Efeonce de pagar dentro de los **primeros 5 días hábiles posteriores al cierre de mes** (aplica a colaboradores Y contractors). Helper canónico `resolveContractorPaymentDueDate` (`src/lib/contractor-engagements/payables/due-date.ts`, puro) = **cierre del mes operativo del payable + 5 días hábiles**.

- **NUNCA** computar días hábiles / ventana de cierre con lógica local. Toda aritmética de días hábiles pasa por `addBusinessDays(date, n)` en `src/lib/calendar/operational-calendar.ts` (SSOT canónico, mismo calendario que nómina — feriados Nager + overrides + timezone `America/Santiago`). NUNCA `EXTRACT(EPOCH FROM (date - date))` para días (gate TASK-893; usar `CURRENT_DATE - due_date` = integer).
- **NUNCA** sobreescribir un `due_date` provisto manualmente. La derivación aplica **solo** cuando `dueDate` no fue provisto (override manual gana). Aplicado en `createContractorPayableFromSubmission`/`OffCycle`.
- **NUNCA** reusar `getOperationalPayrollMonth`/`getLastBusinessDayOfMonth`/`addBusinessDays` con valores distintos a `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS` (=5) sin razón documentada. El ancla es el **mes operativo** del payable (el payable NO tiene `service_period`).
- **NUNCA** confundir el **SLA de pago NETO al contractor** (signal `finance.contractor_payable.payment_sla_overdue`, cierre+5 hábiles) con la **remesa de la retención SII** (honorarios CL) — esa es una obligación DISTINTA con su propio deadline **F29 (día 12 papel / 20 electrónico del mes siguiente)** y otro beneficiario (el SII). El SLA mide solo el neto al contractor; la remesa es out of scope (TASK-977 invariant).
- **NUNCA** convertir el signal en un gate. `finance.contractor_payable.payment_sla_overdue` (kind=lag, moduleKey finance, steady=0) es **observabilidad** — mide payables comprometidos (`ready_for_finance`/`obligation_created`/`payment_order_created`) no pagados con `due_date < CURRENT_DATE`. NUNCA bloquea la creación ni el pago del payable.
- **SIEMPRE** que emerja una regla de "N días hábiles desde el cierre" en otro dominio (e.g. alinear las obligaciones de nómina, que hoy usan `dueDate: periodEnd`), reusar `addBusinessDays` + `resolveContractorPaymentDueDate` o componer las mismas primitivas canónicas. NO duplicar la aritmética.

**Spec canónica**: `docs/tasks/complete/TASK-978-contractor-payment-due-date-sla.md`. Helper calendario: `addBusinessDays` en `operational-calendar.ts`. Signal: `src/lib/reliability/queries/contractor-payable-payment-sla-overdue.ts`. Sin migración/capability/outbox nuevos. Patrones fuente: TASK-571/766 (VIEW/helper + signal canónico), TASK-893 (date arithmetic gate), Payroll Operational Calendar (calendario SSOT).

### Monthly Contractor Payment Run invariants (TASK-979, desde 2026-05-31)

La **corrida mensual** barre los `payment_obligations` `provider_payroll` (source_kind `contractor_payable`) aún NO batcheados y los agrupa por **moneda** en payment orders `pending_approval`. **Prepara — NO paga.** Helper canónico `prepareMonthlyContractorPaymentRun` (`src/lib/contractor-engagements/payables/monthly-run.ts`, server-only): cutoff = cierre del mes operativo + 5 días hábiles (TASK-978), barre `due_date <= cutoff` (incluye overdue stranded), prioriza por `due_date ASC`.

- **NUNCA** la corrida paga, aprueba ni mueve una orden a `paid`. Crea órdenes en `pending_approval`; la aprobación doble-firma + el mark-paid son acciones humanas (SoD intacto, maker-checker).
- **NUNCA** mezclar monedas en una orden. Agrupar por moneda (regla V1 de `createPaymentOrderFromObligations`); processor/cuenta quedan null al sweep y los resuelve el operador al aprobar. `batchKind='supplier'` (label; contractors = proveedores externos).
- **NUNCA** crear la transición `obligation_created → payment_order_created` del payable fuera del helper canónico `markPayablePaymentOrderCreated` (`store.ts`, dual-mode `client?`). Es el **writer ÚNICO** de ese estado (la state machine lo exige antes de `paid`; nadie más lo escribe). Emite `workforce.contractor_payable.payment_order_created v1`.
- **NUNCA** confiar en una tabla para la idempotencia del barrido. La idempotencia REAL = filtro un-ordered (`LEFT JOIN payment_order_lines` line NULL) + status orderable (`generated`/`partially_paid`) + lock UNIQUE `payment_order_lines(obligation_id)` (dos corridas concurrentes: el perdedor aborta con `obligation_already_locked`). `greenhouse_sync.contractor_payment_runs` (append-only, triggers anti-UPDATE/DELETE, mirror TASK-900) es **auditoría + observabilidad**, NO el mecanismo de idempotencia.
- **NUNCA** ejecutar el sweep + creación de órdenes + transición de payables fuera de UNA transacción. Si algo falla, rollback total (cero órdenes parciales). El dry-run (`dryRun: true`) NO crea fila de corrida ni muta nada — es solo preview.
- **NUNCA** activar un schedule automático (Cloud Scheduler) en producción antes de que el flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (TASK-977) esté ON + staging validado. V1 es **manual** (endpoint + botón en `/finance/contractor-payments`); el schedule queda como follow-up detrás de `CONTRACTOR_MONTHLY_RUN_ENABLED` (no construido).
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'finance', { tags: { source: 'contractor_monthly_run' } })`.
- **NUNCA** confundir el signal de cobertura `finance.contractor_payable.unbatched_overdue` (obligación vencida SIN batchear → remediación: disparar la corrida) con `finance.contractor_payable.payment_sla_overdue` (TASK-978, más amplio → aprobar/pagar) ni con `ready_without_obligation` (TASK-793, tramo anterior). Son tres failure modes distintos con tres remediaciones distintas.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/finance/payment-orders src/lib/contractor-engagements` como gate de cierre — la corrida toca SOLO contractor payables (`labor_cost_external`), cero nómina/`contract_type`/finiquito.

La **remesa de la retención SII (F29)** NO es parte de la corrida — la corrida paga el NETO al contractor (invariante TASK-977/978).

**Spec canónica**: `docs/tasks/complete/TASK-979-monthly-contractor-payment-run.md`. Helper: `prepareMonthlyContractorPaymentRun` + `markPayablePaymentOrderCreated`. Endpoint: `POST /api/finance/contractor-payables/monthly-run` (capability `finance.contractor_payable:manage`, reuso). Migración: `20260531235624882` (tabla + CHECK `event_type`). Signal: `finance.contractor_payable.unbatched_overdue`. Patrones fuente: TASK-750 (createPaymentOrderFromObligations), TASK-793 (bridge), TASK-900 (run-tracking append-only), TASK-978 (due-date/SLA).

### Contractor Run Report ("Nómina de Contractors") invariants (TASK-980, desde 2026-05-31)

El reporte de período de pagos a contractors (PDF + Excel) es una **proyección read-only** del período — espejo del reporte de payroll (TASK-782) + infraestructura del comprobante individual (TASK-960). Reader canónico `buildContractorRunReport` (`run-report-reader.ts`, server-only) + generadores puros `generateContractorRunPdf` / `generateContractorRunExcel`.

- **NUNCA** recomputar bruto/retención/neto en el reporte. Se leen **verbatim** del payable (TASK-793/794 son dueños de los montos); la tasa SII viene del `taxWithholdingRateSnapshot` del engagement (frozen, TASK-790). El reporte no es un calculator.
- **NUNCA** clasificar el régimen del contractor inline. Pasar por el helper canónico compartido `deriveContractorRemittanceRegime` (`remittance/regime.ts`, single source of truth que consumen el comprobante TASK-960 Y el reporte). Los 4 régimenes (`honorarios_cl`/`international_withholding`/`provider_managed`/`cross_currency`) colapsan a 2 grupos contables vía `toContractorReportRegimeGroup` (`honorarios_cl` vs `international`).
- **NUNCA** mezclar en un subtotal la retención SII (honorarios → reconcilia F29), el neto comprometido y el neto pagado (`paid` → reconcilia banco). Son tres números mutuamente excluyentes. NUNCA sumar monedas distintas en un total (CLP/USD segmentados).
- **NUNCA** mostrar `$0` ambiguo para una columna que no aplica; usar `—` (distinguir "no aplica" de "cero"). Regla TASK-863 Semantic Column Invariants: cada fila = un contractor, cada columna = una dimensión; no mezclar montos de contractors distintos en una celda.
- **NUNCA** anclar el reporte al mes calendario de `due_date`. Ancla = **mes operativo** (`getOperationalPayrollMonth(due_date ?? created_at)`), consistente con TASK-978/979 (un payable de mayo-operativo vence a inicios de junio y se reporta bajo Mayo). Incluidos = comprometidos (`ready_for_finance`/`obligation_created`/`payment_order_created`/`paid`); excluidos = `blocked`/`pending_readiness` (visibles, fuera de subtotales); `cancelled` omitido.
- **NUNCA** asignar un número `EO-RA` desde el reporte. Se **lee** el ya asignado (`getRemittanceAdviceNumbersForPayables`, batch read) para los `paid`. La allocación es exclusiva del comprobante (TASK-960).
- **NUNCA** rollear un footer/eslogan propio. El PDF usa `EfeoncePdfFooter` (institucional, fixed, página X de Y) + `EfeonceSloganPdf` (Poppins, brand-zone) + Geist body (`ensurePdfFontsRegistered`) — idéntico al comprobante TASK-960. Acento verde solo en el neto.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'finance', { tags: { source: 'contractor_run_report_api' } })`.
- **SIEMPRE** que cambie el layout del PDF, bumpear `CONTRACTOR_RUN_REPORT_TEMPLATE_VERSION`. Gate de cierre: `pnpm vitest run src/lib/contractor-engagements src/lib/payroll` (no-regresión EPIC-013/957; el reporte toca solo contractor payables `labor_cost_external`, cero nómina/finiquito).

La **remesa de la retención SII (F29)** NO es el neto del reporte — el reporte paga (muestra) el NETO al contractor; la retención es pasivo a remesar al SII (invariante TASK-977/978). El reporte lo declara explícito en la nota contable.

**Spec canónica**: `docs/tasks/complete/TASK-980-contractor-payment-run-report-pdf-excel.md`. Reader: `run-report-reader.ts`. Generadores: `generate-contractor-run-{pdf,excel}.ts(x)`. Helper compartido: `remittance/regime.ts`. Endpoint: `GET /api/finance/contractor-payables/run-report?format=pdf|excel` (capability `finance.contractor_payable:read`, reuso). Patrones fuente: TASK-782 (reporte payroll), TASK-960/758 (presenter + montos verbatim + footer/slogan/Geist), TASK-863 (Semantic Column Invariants), TASK-978/979 (mes operativo).

### Contractor Payable Paid Lifecycle + Remittance Email invariants (TASK-981, desde 2026-06-01)

Cierra el **tramo final del lifecycle** del contractor payable y el **pegamento reactivo** que envía el comprobante TASK-960 al contractor por email. Antes de TASK-981 **ningún writer** transicionaba el payable a `paid` ni emitía un evento (mismo gap-class que TASK-979 cerró para `payment_order_created`); consecuencia colateral: el comprobante TASK-960 (gate `status='paid'`) era **inalcanzable**. Cadena canónica decoupled:

```text
finance.payment_order.paid (settlement TASK-765/977)
  → projection contractor-payable-paid-cascade: markPayablePaid por cada payable
    enlazado (payment_order_id, status='payment_order_created') → emite
    workforce.contractor_payable.paid v1
      → projection contractor-payable-paid-email: resolveRemittanceAdvice (gate paid,
        re-read PG) → generateContractorRemittancePdf → getProfileNotificationRecipient
        (canonical_email) → sendEmail('contractor_remittance_paid', adjunto PDF)
```

**Helpers/archivos canónicos**:
- `markPayablePaid(input, client?)` (`payables/store.ts`, dual-mode) — **writer ÚNICO** de `paid`; idempotente (no-op si ya `paid`, no re-emite); mirror de `markPayablePaymentOrderCreated`.
- `listPayableIdsByPaymentOrderForPaidCascade(orderId)` — reader del cascade (filtra `status='payment_order_created'` en SQL → no-op para órdenes no-contractor).
- `contractor-payable-paid-cascade` projection (trigger `finance.payment_order.paid`).
- `contractor-payable-paid-email` projection (trigger `workforce.contractor_payable.paid`).
- `ContractorRemittanceEmail.tsx` + emailType `contractor_remittance_paid` (transactional, registerTemplate + registerPreviewMeta).
- Evento `workforce.contractor_payable.paid v1` (event-catalog `contractorPayablePaid`).
- Migración: extiende CHECK `contractor_payable_events.event_type` con `paid` (additivo sobre TASK-979).

**⚠️ Reglas duras**:
- **NUNCA** transicionar un contractor payable a `paid` fuera de `markPayablePaid` (writer ÚNICO). Cualquier UPDATE `status='paid'` inline rompe la emisión del evento + el comprobante. La state machine ya permite `payment_order_created → paid` (TASK-793 forward-fix).
- **NUNCA** marcar el payable `paid` desde el settlement atómico (TASK-977 marca la **orden**, no el payable). El cascade reactivo es el puente decoupled `order paid → payable paid`.
- **NUNCA** confiar el payload del evento `.paid` en el email projection — re-leer vía `resolveRemittanceAdvice(payableId)` (gate `status='paid'`, SSOT de montos TASK-960). Mismo principio que el bridge TASK-793.
- **NUNCA** bloquear el batch reactivo por un comprobante sin destinatario o no resoluble: el email projection **skipea honesto** (capture + return), NO throw. Sólo un fallo de envío genuinamente transitorio throwea → retry → dead-letter.
- **NUNCA** recomputar montos para el email — el neto sale del row `emphasis` del `breakdown` de la presentation (verbatim TASK-960). El email NO es documento tributario.
- **NUNCA** `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', { tags: { source: 'contractor_payable_paid_email' | 'contractor_payable_paid_cascade' } })`.
- **SIEMPRE** idempotencia del email vía `sendEmail({ sourceEventId, sourceEntity })` (`wasEmailAlreadySent` dedup) — un retry del dispatcher nunca re-envía.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio (boundary EPIC-013/957).

**Reliability signal**: `finance.contractor_remittance_email.dead_letter` (kind=dead_letter, moduleKey finance, steady=0) — payables `paid` cuyo email agotó retries (Resend down / render fail / recipient persistente). Skips honestos NO alertan acá.

**Spec canónica**: `docs/tasks/complete/TASK-981-contractor-payment-email-remittance.md`. Patrones fuente: TASK-979 (writer único dual-mode + gap-class), TASK-793 (bridge reactivo + re-read defensivo), TASK-960 (comprobante PDF + montos verbatim), TASK-759 (payslip-on-payment-paid email projection mold), TASK-771 (decoupling reactivo).
