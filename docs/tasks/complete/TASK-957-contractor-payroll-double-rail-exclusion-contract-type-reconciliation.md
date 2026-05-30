# TASK-957 — Contractor ↔ Legacy Payroll Double-Rail Exclusion + contract_type Reconciliation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `payroll | hr | finance`
- Blocked by: `none` (complementa TASK-956 ya complete; TASK-790→796 complete)
- Branch: `task/TASK-957-contractor-payroll-double-rail-exclusion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la open question dejada por TASK-956: una persona puede cobrar por **dos rieles que no se hablan** — la nómina legacy honorarios (motor clasifica por `compensation_versions.contract_type='honorarios'` → retención SII 15.25%) y el contractor payable nuevo (TASK-794, misma retención SII). Si ambos corren para la misma persona/período → doble-pago **+ doble declaración F29 retenciones honorarios** (Efeonce remesa doble al SII + doble crédito tributario). El SSOT de "¿se paga por nómina interna?" debe ser la **existencia de un ContractorEngagement activo**, no `member.contract_type`. Slice A pone esa red (gate de exclusión + señal de drift); Slice B reconcilia `member.contract_type` a la realidad contractor de forma gateada y auditada, recién cuando A está vivo.

## Why This Task Exists

TASK-956 cableó el comando atómico employee→contractor (cierra relación + abre contractor + crea engagement) pero **deliberadamente NO mutó `member.contract_type`** (se quedó `indefinido` para Valentina) porque reclasificar a `honorarios` podía re-incluirla en el cálculo de nómina legacy → doble-pago.

Raíz del problema (verificado en código por arch-architect + greenhouse-payroll-auditor):

- El motor payroll rutea por la `contract_type` de la **compensation_version** aplicable (`cv.contract_type` en `pgGetApplicableCompensationVersionsForPeriod`; `calculate-payroll.ts:238-281` → `contractType==='honorarios'` → `calculateHonorariosTotals` aplica retención SII).
- El contractor payable (TASK-794, `computeContractorWithholding` para `honorarios_cl`) aplica **la misma** retención SII 15.25% por el riel nuevo.
- **HOY no existe exclusión mutua** entre ambos rieles. Una persona con ContractorEngagement activo y una compensation_version aplicable en el mismo período es procesada por los dos.

Hoy Valentina está segura **solo por dos efectos-colaterales del offboarding** (no por un SSOT): (1) el roster gate `last_working_day < periodStart`, (2) el offboarding cerró su compensation_version (`effective_to=2026-04-30`, `offboarding/store.ts:351`) → sin comp version aplicable en junio. Vectores residuales que esos side-effects NO cubren: que alguien cree una **compensation_version nueva** para la contractor, reapertura/supersede del offboarding, o misclasificación del lane en el resolver TASK-890 (flag-on). El SSOT canónico (engagement activo) es la red que falta.

Además: `member.contract_type` se quedó en `indefinido` → drift de clasificación en Person 360 (la muestra como empleada cuando es contractor). Reconciliarla es integridad de datos — pero **solo es seguro después de poner la red de Slice A**.

## Goal

- **Slice A**: el roster de nómina legacy excluye determinísticamente a quien tiene un ContractorEngagement activo (riel contractor-payable). SSOT = engagement, no `contract_type`. Doble-declaración F29 imposible una vez vivo.
- **Slice A**: señal `payroll.contractor.double_rail_overlap` (steady=0) que detecta el vector real del motor (comp-version aplicable + engagement activo en el mismo período abierto), corriendo regardless del flag (detector temprano).
- **Slice A**: invariante nuevo enforced — un contractor con engagement activo NUNCA tiene compensation_version activa (su compensación vive en el engagement).
- **Slice B**: reconciliar `member.contract_type` a la realidad contractor vía comando auditado + gateado (`member.contract_type.changed v1` + audit en la misma tx), secuenciado después de A, no-op para payroll porque el gate ya excluye, exige `classification_risk=clear` (revisión humana).
- **Slice B (decisión de diseño)**: resolver con finance-accounting el valor destino de la tupla `(contract_type, pay_regime, payroll_via)` para un contractor honorarios CL por el riel Greenhouse — **prohibido defaultear a `'honorarios'`**.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (V1.9)
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` (TASK-890 — gate hermano)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias (de CLAUDE.md, load-bearing):

- **Hard rule no-regresión TASK-956**: el comando de Slice B NUNCA muta `final_settlements`, `final_settlement_documents` ni el status del offboarding. Read-only/append-only sobre finiquito + offboarding. Gate de cierre obligatorio: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding src/lib/contractor-engagements` — cualquier rojo en finiquito u offboarding es regresión.
- **Clasificar antes de calcular** (payroll-auditor invariant): la tupla `(contract_type, pay_regime, payroll_via)` está protegida por CHECK en `members` y `compensation_versions`. NUNCA bypass por SQL directo.
- **Capability grant invariant (TASK-873/935)**: la capability nueva de Slice B se seedea en `capabilities_registry` (DB) + `entitlements-catalog` (TS) + grant en `runtime.ts` en el MISMO PR; el guard `capability-grant-coverage.test.ts` rompe el build si falta.
- **Toda mutación de `contract_type`/`pay_regime`/`payroll_via`** pasa por los helpers canónicos y emite `member.contract_type.changed v1` + audit append-only en la misma transacción (invariante "International Internal Contract Type Invariants").
- **`captureWithDomain`** (no `Sentry.captureException` directo): domain `payroll` para el gate/señal, `identity` para el comando de reconciliación de member.
- **SQL signal reader schema gate (TASK-893)**: validar contra PG real (proxy) antes de mergear; nada de `EXTRACT(EPOCH FROM (date - date))`.

## Normative Docs

- `CLAUDE.md` §"Contractor domain ↔ Finiquito/Offboarding non-regression boundary (hard rule)" + §"Employee→Contractor connected command invariants (TASK-956)" + §"Workforce Exit Payroll Eligibility invariants (TASK-890)" + §"Chile Honorarios Compliance invariants (TASK-794)".
- `docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md` (predecesor; §Payroll & Offboarding Non-Regression Guardrails).
- `.claude/skills/greenhouse-payroll-auditor/references/chile-payroll-law.md` (Art 7-8 CT subordinación; retención honorarios; F29).

## Dependencies & Impact

### Depends on

- `ContractorEngagement` runtime + estados (TASK-790, `greenhouse_hr.contractor_engagements`).
- Contractor payable SII retention (TASK-794, `computeContractorWithholding`).
- Roster reader `pgGetApplicableCompensationVersionsForPeriod` (`src/lib/payroll/postgres-store.ts:922`).
- Patrón exit-eligibility (`src/lib/payroll/exit-eligibility/` — `flag.ts`, `index.ts`, `policy.ts`, `query.ts`, `types.ts`).
- Patrón reconciliación auditada (TASK-785 role-title governance, TASK-891 reconcile-drift, `src/lib/person-legal-entity-relationships/reconcile-drift.ts`).

### Blocks / Impacts

- Desbloquea la reconciliación de `member.contract_type` para TODO contractor ex-empleado (no solo Valentina) — incluye el carril provider/EOR de TASK-955.
- Toca el roster canónico de payroll → impacta cualquier consumer de `pgGetApplicableCompensationVersionsForPeriod` (proyección + cálculo real).

### Files owned

- `src/lib/payroll/contractor-exclusion/` (nuevo — espejo de `exit-eligibility/`: `flag.ts`, `index.ts`, `policy.ts`, `query.ts`, `types.ts`) `[verificar]`
- `src/lib/payroll/postgres-store.ts` (post-filtro en `pgGetApplicableCompensationVersionsForPeriod`)
- `src/lib/reliability/queries/payroll-contractor-double-rail-overlap.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up de la señal)
- `src/lib/contractor-engagements/reconcile-contract-type.ts` (nuevo — Slice B)
- `src/app/api/hr/contractors/[id]/reconcile-classification/route.ts` (nuevo — Slice B) `[verificar nombre ruta]`
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability Slice B)
- `migrations/` (capability seed Slice B + posible nuevo valor de enum en Slice B, según decisión)

## Current Repo State

### Already exists

- `pgGetApplicableCompensationVersionsForPeriod` con dos gates ya integrados (intake TASK-872 + exit-eligibility TASK-890 flag-gated post-filtro) — el punto de inyección de Slice A.
- `src/lib/payroll/exit-eligibility/` — patrón completo a espejar (resolver bulk + flag + policy pura + tests).
- `greenhouse_hr.contractor_engagements` con `status`, `relationship_subtype`, `person_legal_entity_relationship_id`, `payroll_via`.
- 9 reliability signals contractor ya en `src/lib/reliability/queries/contractor-*.ts` (patrón a espejar para la señal nueva).
- `offboarding/store.ts:351` cierra compensation_versions (`effective_to`) al ejecutar offboarding — capa de defensa existente (side-effect).
- TASK-794 `computeContractorWithholding` (honorarios CL SII 15.25% por el riel contractor).

### Gap

- **No existe** exclusión mutua entre el roster legacy y los contractor engagements (verificado: `grep contractor_engagement src/lib/payroll/` vacío).
- **No existe** señal que detecte la superposición comp-version + engagement activo.
- **No existe** invariante que prohíba escribir compensación de contractor en `compensation_versions`.
- `member.contract_type` queda en `indefinido` post-transición (drift Person 360) y no hay comando para reconciliarlo de forma segura.
- El enum `ContractType` (`indefinido|plazo_fijo|honorarios|contractor|eor|international_internal`) **no tiene valor correcto** para un contractor honorarios CL por el riel Greenhouse (decisión abierta — ver Open Questions).

## Scope

### Slice A — Gate de exclusión por engagement + señal + invariante (BLOQUEANTE) ✅ SHIPPED

- Módulo nuevo `src/lib/payroll/contractor-exclusion/` espejando `exit-eligibility/`: `resolveContractorEngagementPayrollExclusion(memberIds) → Map<memberId, ContractorPayrollExclusion>` + `resolveContractorExcludedMemberIds` + policy pura + query bulk + flag.
- Flag `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` (default OFF). Cuando OFF: roster sin cambios (parity bit-for-bit). Cuando ON: post-filtro adicional en `pgGetApplicableCompensationVersionsForPeriod` que excluye a quien tiene ContractorEngagement engaged (active/paused/ending). NO foldear dentro de `resolveExitEligibilityForMembers` (dimensión ortogonal).
- Señal `payroll.contractor.double_rail_overlap` (`src/lib/reliability/queries/payroll-contractor-double-rail-overlap.ts`, kind=drift, moduleKey=payroll, severity error si count>0, steady=0): detecta members con ContractorEngagement no-terminal **Y** compensation_version vigente. Corre **regardless del flag** (detector temprano). Wire-up en `get-reliability-overview.ts`.
- Tests: policy pura (12 tests) + parity flag-off (gate 673 verde). Live-verify SQL contra PG real → detectó 1 overlap real (Valentina comp version v2 sin cerrar) → remediado vía `scripts/payroll/close-contractor-orphan-comp-version-task957.ts` (señal ahora steady=0).

### Slice B — Resolver canónico de clasificación laboral vigente (display) — RE-SCOPEADO (3-skill verdict 2026-05-30)

**RE-SCOPE**: de "comando de mutación de `member.contract_type`" → "resolver canónico de lectura + Person 360 muestra estado vigente". Razón: finance + payroll + arch convergen en que `member.contract_type` es el tipo de contrato de **EMPLEO** (historia cuando el empleo termina), y el SSOT de estado laboral **vigente** es la relación/engagement activa. Mutar la tupla está PROHIBIDO (`'honorarios'` → doble declaración F29; nuevo enum → SSOT competidor + extiende taxonomía gobernada + rompe boundary payroll↔contractor). Ver Delta 2026-05-30.

- **Resolver canónico** `resolveCurrentWorkClassification(profileId | memberId)` (ubicación preferida `src/lib/account-360/`): lee la relación activa (`person_legal_entity_relationships`) + `ContractorEngagement` activo → `{ kind: 'employee'|'contractor'|'none', employmentContractType, contractorSubtype, displayLabel, source }`. Bulk-first. **NO lee `member.contract_type` para estado vigente** (solo como historia de empleo cuando no hay relación activa). Server-only.
- **Person 360 / Workforce consumen el resolver** para mostrar estado vigente (no `member.contract_type` directo). Surface confirmada: `PersonHrProfileTab` "Contrato" + `person-hr-profile-view-model.ts`. Copy es-CL validado con `greenhouse-ux-writing`.
- **Gate `classification_risk='clear'`**: para presentar a alguien como "contractor limpio" (control Art 7-8 CT honorarios encubierto). NUNCA auto-limpiar el riesgo.
- **Audit de callsites legacy** (due diligence, único residual): grep consumers que cuenten "empleados activos" por `contract_type IN ('indefinido','plazo_fijo') AND active=TRUE` — incluirían por error a un contractor ex-empleado. Migrarlos al resolver o agregar signal `workforce.employment_classification_drift` (active member + employment contract_type + sin relación de empleo activa + engagement contractor activo).
- **NO toca**: tupla `(contract_type, pay_regime, payroll_via)`, taxonomía gobernada `invalid_tuple_drift`, motor de nómina, honorarios/BHE (TASK-794), capability/flag/evento de mutación. Sale del territorio payroll-crítico → people-domain/display de bajo riesgo. **Sin open question bloqueante.**

## Out of Scope

- NO tocar `final_settlements`, `final_settlement_documents` ni el status/lanes del offboarding (hard rule TASK-956).
- NO reescribir el cálculo honorarios legacy ni el contractor payable SII (TASK-794) — esta task solo decide QUIÉN entra a cada riel, no CÓMO calcula cada uno.
- NO el carril provider/EOR (TASK-955) — esta task cubre el contractor directo (incluye honorarios CL); el gate de Slice A sirve a todos pero la decisión de tupla de Slice B se valida para honorarios CL primero.
- NO migración masiva de honorarios legacy existentes a contractor payables.
- NO auto-ejecutar Slice B dentro del comando de transición TASK-956 (desacoplado por blast-radius).
- **NO toca a los contractors internacionales legacy (modelo Deel)**. Cohorte real verificada en dev (2026-05-30): **Andrés Carlosama** (`3wpjyxp`), **Daniela Ferreira** (`3rz7g72`), **Melkin Hernández** (sin Deel ID) — todos `member.contract_type='contractor'`, `pay_regime='international'`, `payroll_via='deel'`, comp-version activa, y **SIN `ContractorEngagement`** (modelo legacy, NO el dominio TASK-790→796). El gate de Slice A keyea por **existencia de `ContractorEngagement` activo, NO por `contract_type='contractor'`** — precisamente para NO barrerlos. Siguen pagándose por el passthrough Deel exactamente como hoy. Esta es la razón de diseño por la que el SSOT es el engagement y no `contract_type`: keyear por `contract_type` rompería su passthrough Deel. Para internacionales el riesgo nunca es doble-declaración SII (eso es honorarios CL); sería doble-conteo de costo/pago — que el mismo gate cubre cuando exista engagement.

## Detailed Spec

**Vector real del motor** (verificado): el roster (`pgGetApplicableCompensationVersionsForPeriod`) hace `LEFT JOIN compensation_versions` y el motor (`calculate-payroll.ts:238`) rutea por `compensation.contractType` (= `cv.contract_type`). Por eso la señal de Slice A mira **comp-version aplicable + engagement activo**, no solo "presencia en roster" — el cálculo legacy solo dispara si hay comp-version aplicable.

**Por qué `'honorarios'` está prohibido en Slice B**: `CONTRACT_DERIVATIONS['honorarios'] = { payRegime:'chile', payrollVia:'internal' }` → el motor corre `calculateHonorariosTotals` (retención SII). Como el contractor payable (TASK-794) ya retiene SII 15.25%, ambos rieles declararían al SII la misma retención → **F29 retenciones honorarios sobre-declarado** (Efeonce remesa doble + doble crédito tributario para el honorario). El riel contractor-payable es el único dueño correcto de la retención SII del contractor.

**Defensa-en-profundidad resultante** (3 capas que se solapan): (1) offboarding `executed` cierra comp-version + roster gate (existente, TASK-890); (2) gate de exclusión por engagement (Slice A, el SSOT); (3) `contract_type` reconciliado a un valor que NO rutea al riel SII legacy (Slice B). Si una falla, las otras sostienen.

**Patrón de la señal**: espejar `src/lib/reliability/queries/contractor-payable-tax-review-overdue.ts` (estructura `ReliabilitySignal`, severity tiered, evidence). SQL: members con engagement activo (`status` no-terminal) JOIN compensation_versions aplicable en período abierto. Timestamp arithmetic con `date - date = integer` (gate TASK-893).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice A DEBE shippear y estar shadow-validado ANTES de Slice B.** Sin el gate de exclusión vivo, reconciliar `contract_type` (Slice B) puede re-rostear a la persona al riel SII legacy → doble declaración F29. El flag de Slice B tiene dependencia code-side dura sobre el flag de Slice A (throw si A está OFF).
- Dentro de Slice A: la señal `double_rail_overlap` puede shippear primero (corre regardless del flag — detector temprano), luego el gate + flag.
- Slice B no arranca hasta que el flag de Slice A esté `ON` en producción + ≥7d señal `double_rail_overlap` en steady=0 + decisión de tupla resuelta con finance.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble declaración F29 (retención SII legacy + contractor payable) | payroll / finance (SII) | medium (si Slice B corre sin A) | Slice ordering hard rule + flag dependency code-side + gate de exclusión SSOT | `payroll.contractor.double_rail_overlap` |
| Gate excluye de más (un empleado legítimo con engagement residual cancelado) | payroll | low | filtro solo sobre engagement `status` activo (no-cancelado); shadow-compare flag-off vs flag-on antes de prender | `payroll.contractor.double_rail_overlap` + diff shadow |
| Gate barre por error a contractors Deel legacy (Andrés/Daniela/Melkin, sin engagement) → rompe su passthrough Deel | payroll | low | gate keyea por **existencia de engagement activo, NUNCA por `contract_type='contractor'`**; acceptance criterion explícito + shadow-compare verifica que permanecen en el roster | diff shadow (su fila debe seguir presente) |
| `contract_type` reconciliado a valor que rutea mal el motor | payroll | medium | Open Question resuelta con finance ANTES de Slice B; prohibido default `'honorarios'`; CHECK matrix en members/comp_versions | tests de ruteo `calculate-payroll` + señal |
| Honorarios encubierto (subordinación) blanqueado por la reconciliación | identity / legal | medium | comando exige `classification_risk='clear'` (revisión humana); NUNCA auto-limpia | `contractor_engagement.classification_risk_open` (TASK-790) |
| Compensación de contractor escrita en compensation_versions | payroll | low | invariante + señal `double_rail_overlap` detecta comp-version + engagement activo | `payroll.contractor.double_rail_overlap` |
| Regresión en finiquito/offboarding | payroll / hr | low | hard rule read-only + gate `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` | test suite rojo |

### Feature flags / cutover

- `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` (default `false`). OFF → roster parity bit-for-bit. ON → gate activo. Revert: env var `false` + redeploy (<5 min Vercel).
- `PAYROLL_CONTRACTOR_CLASSIFICATION_RECONCILE_ENABLED` (default `false`, Slice B). Dependencia dura code-side sobre el flag de Slice A (throw si A OFF). Revert: env var `false`.
- La señal `double_rail_overlap` NO está detrás de flag (siempre corre — detector temprano, incluso pre-Slice-A).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice A (gate + señal) | flag `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED=false` + redeploy; la señal es read-only (no muta) | <5 min | sí |
| Slice B (reconciliación) | flag `..._RECONCILE_ENABLED=false`; mutaciones ya aplicadas se revierten con compensating `member.contract_type.changed v1` (re-emitir valor anterior desde audit) | <15 min | sí (event-sourced) |

### Production verification sequence

1. `pnpm migrate:up` staging (capability seed Slice B + posible enum value) + verify `information_schema`.
2. Deploy Slice A a staging con flag OFF + verify roster idéntico (parity).
3. Señal `double_rail_overlap` en staging: verify detecta el caso sintético (engagement activo + comp-version aplicable) y reporta steady=0 cuando no hay overlap.
4. Flip flag de Slice A `ON` staging + shadow-compare (roster con/sin gate) + verify solo se excluyen contractors con engagement activo.
5. Repetir 2-4 en producción con cooldown 24h. Monitor `double_rail_overlap` 7d steady=0.
6. **Solo entonces** Slice B: decisión de tupla resuelta + capability live + smoke con un contractor real (classification_risk cleared) + verify reconciliación no altera roster (gate ya excluye) + finiquito/offboarding intactos.

### Out-of-band coordination required

- **greenhouse-finance-accounting-operator**: decisión de la tupla destino `(contract_type, pay_regime, payroll_via)` + mecánica F29 (¿el contractor honorarios CL declara su retención solo por el riel payable? confirmar que no hay doble obligación tributaria). **Bloqueante de Slice B.**
- **Revisión legal/HR**: confirmar que el caso fundacional (Valentina) y futuros no son honorarios encubierto (Art 7-8 CT). El comando exige `classification_risk='clear'` pero la revisión es humana.

## Acceptance Criteria

- [ ] Con `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED=false`, el roster de `pgGetApplicableCompensationVersionsForPeriod` es idéntico al actual (parity test).
- [ ] Con el flag ON, un member con ContractorEngagement activo (riel contractor-payable) es excluido del roster legacy del período.
- [ ] Con el flag ON, los contractors internacionales legacy SIN engagement (Andrés Carlosama, Daniela Ferreira, Melkin Hernández — `contract_type='contractor'`/`payroll_via='deel'`) **permanecen** en el roster legacy (NO excluidos) y su passthrough Deel es idéntico al flag-OFF.
- [ ] La señal `payroll.contractor.double_rail_overlap` reporta steady=0 cuando no hay overlap y >0 (warning/error) cuando un member tiene engagement activo + comp-version aplicable en el mismo período abierto; corre con el flag OFF.
- [ ] La señal está wired en `getReliabilityOverview` y aparece en `/admin/operations` bajo el rollup de payroll/finance data quality.
- [ ] El SQL de la señal fue ejercitado contra PG real (proxy) antes del merge (sin `EXTRACT(EPOCH FROM (date - date))`).
- [ ] Slice B: el comando `reconcileContractorClassification` muta la tupla + emite `member.contract_type.changed v1` + audit en una sola tx; throw si no hay engagement activo, si `classification_risk != 'clear'`, o si el flag de Slice A está OFF.
- [ ] Slice B: capability `workforce.member.reconcile_contractor_classification` en catalog TS + `capabilities_registry` + grant `runtime.ts`; `capability-grant-coverage.test.ts` verde.
- [ ] Slice B: el valor destino de la tupla NO es `'honorarios'` y fue acordado con finance-accounting (documentado en la task).
- [ ] Gate de no-regresión verde: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding src/lib/contractor-engagements`.
- [ ] Finiquito + offboarding de Valentina permanecen intactos tras una reconciliación de prueba.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding src/lib/contractor-engagements` (gate de no-regresión)
- `pnpm vitest run src/lib/reliability` (señal)
- `pnpm test` (full suite al cierre)
- `pnpm build`
- Live-verify SQL de la señal contra PG real (proxy `pnpm pg:connect`)
- Shadow-compare del roster (flag off vs on) en staging

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-955 provider/EOR, TASK-956 boundary)
- [ ] CLAUDE.md: invariante "Contractor double-rail exclusion" + actualizar la open question de TASK-956 como resuelta
- [ ] arch Delta en `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`

## Follow-ups

- TASK-955 (provider/EOR settlement split): hereda el gate de Slice A; validar la tupla destino para lanes provider/EOR cuando emerja.
- Si Slice B decide un nuevo valor de enum `ContractType`, evaluar migración de los honorarios CL existentes que sean realmente contractors al riel nuevo (separado, no en esta task).
- **Migración de contractors internacionales legacy (Deel) al modelo engagement**: cuando Andrés/Daniela/Melkin (y futuros Deel) se migren al dominio TASK-790→796, tendrán a la vez su comp-version legacy (passthrough Deel) **y** un `ContractorEngagement` → el gate de Slice A se vuelve **load-bearing** para ellos (los saca del passthrough para que no se cuenten dos veces). La migración DEBE mover su visibilidad de pago **completa** al riel nuevo (payable → Finance) antes/junto con crear el engagement, y verificar la señal `double_rail_overlap=0`. Task derivada separada cuando se priorice.
- **Drift de datos pre-existente (ajeno a TASK-957)**: **Melkin Hernández** tiene `member.contract_type='contractor'` pero su comp-version activa dice `contract_type='indefinido'` y `deel_contract_id=NULL`. Hoy el motor lo rutea bien por `payroll_via='deel'` (passthrough), pero si `payroll_via` se limpiara lo calcularía como empleado dependiente chileno sobre un sueldo USD/internacional (incorrecto). La señal `double_rail_overlap` NO lo captura (no hay engagement). Crear issue/task de limpieza de consistencia `(member.contract_type ↔ compensation_version.contract_type ↔ deel_contract_id)` para contractors Deel.

## Open Questions

1. **(RESUELTA 2026-05-30 — finance + payroll + arch convergen en Opción b)** Valor destino de la tupla `(contract_type, pay_regime, payroll_via)`. **Veredicto: NO mutar la tupla.** `member.contract_type` es el tipo de contrato de EMPLEO (historia cuando el empleo termina); el SSOT de clasificación contractor vigente es el `ContractorEngagement.relationship_subtype='honorarios_cl'` + la relación activa. Opción (a) nuevo enum RECHAZADA (SSOT competidor + extiende taxonomía gobernada `invalid_tuple_drift` 3→4 + rompe boundary payroll↔contractor + ambigüedad fiscal). `'honorarios'` PROHIBIDO (rutea al riel SII legacy → doble declaración F29). Slice B re-scopeado a resolver de display (ver Scope + Delta).
2. **(RESUELTA)** ¿Comando dentro de TASK-956 vs separado? Disuelta por el re-scope — ya no hay comando de mutación. El resolver de display es read-only, separado, consumido por Person 360.
3. ¿La señal `double_rail_overlap` debe escalar a `error` (no solo warning) cuando el overlap persiste >1 período cerrado? Definir threshold tras observar steady-state. **Resuelta**: error si count>0 (integridad fiscal, sin tier soft V1).

## Delta 2026-05-30 — Slice A shipped (gate + signal) + hallazgo live

Slice A implementado y committeado (commit `983279d4`): módulo `src/lib/payroll/contractor-exclusion/` + post-filtro en `pgGetApplicableCompensationVersionsForPeriod` (gateado por `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED`, default OFF, parity bit-for-bit) + señal `payroll.contractor.double_rail_overlap` wired en `get-reliability-overview`. Gate de no-regresión verde (673 tests; +12 policy). tsc/lint limpios.

**Hallazgo live (la señal hizo su trabajo)**: live-verify contra PG real → la señal detectó **1 overlap real**: **Valentina Hoyos** tiene su `compensation_versions` v2 (`indefinido`/`chile`) con **`effective_to = NULL` (nunca cerrada)** pese a su offboarding `EO-OFF-2026-45EC8688` `executed` (last_working_day 2026-04-30). El offboarding tiene la lógica `closeFuturePayrollEligibility` (`offboarding/store.ts:349`) que debió cerrarla, pero NO corrió en su ejecución (su offboarding fue seedeado en dev, no pasó por `executeOffboarding` completo). Hoy solo la protege el roster gate por offboarding-`executed`; su comp version de empleada está abierta → si ese gate fallara se calcularía como empleada dependiente chilena a sueldo completo (peor que el doble honorarios). La señal es el detector canónico de exactamente este vector residual.

**Remediación BLOQUEADA (requiere decisión humana)**: la mutación para cerrar su comp version (`effective_to = 2026-04-30`, espejo de `closeFuturePayrollEligibility`) fue **denegada por el auto-mode classifier** — correctamente: es una mutación de data payroll de una persona real con fecha inferida por el agente, fuera del scope gate/señal de Slice A. Requiere consentimiento explícito del operador. Opciones de remediación (a decidir): (a) cerrar su comp version a 2026-04-30 vía script documentado revisado por el operador; (b) re-ejecutar el path canónico de offboarding closure; (c) dejar la señal en `error=1` hasta que se priorice. El finiquito NO se afecta (lee comp version vigente al last_working_day; effective_to=2026-04-30 sigue cubriendo ese día).

**Slice B NO implementado** (Q1 bloqueante — tupla destino toca la taxonomía gobernada `payroll.contract_taxonomy.invalid_tuple_drift` + mecánica F29 con finance-accounting).

## Delta 2026-05-30 — Slice B re-scopeado (veredicto 3 skills: finance + payroll + arch)

Se invocaron `greenhouse-finance-accounting-operator` + `greenhouse-payroll-auditor` + `arch-architect` para resolver la Open Question Q1. **Convergen en Opción (b): NO mutar `member.contract_type`.** Slice B pasa de "comando de mutación de tupla payroll-crítico" a "resolver canónico de clasificación vigente (display)".

**Finance (F29)**: en Chile hay UNA Boleta de Honorarios (BHE) por servicio → UNA retención declarada UNA vez en F29. El riel contractor-payable (TASK-794, atado a la BHE) es el único dueño correcto de la obligación F29. Si ambos rieles corren → doble remesa al SII + doble crédito tributario para el honorario. `member.contract_type` NO es el registro fiscal del contractor (lo es la BHE + payable + retención). `'honorarios'` rutearía al riel SII legacy → doble declaración. → Gate de Slice A es garantía de integridad fiscal, no opcional. Gasto = bruto BHE, devengo, `economic_category='labor_cost_external'`, retención como pasivo a remesar (no menor gasto) — ya correcto en TASK-794.

**Payroll**: el motor tolera `'indefinido'` + comp version cerrada (patrón de TODO ex-empleado; calculador skipea sin comp version vigente). `invalid_tuple_drift` NO marca `(indefinido,chile,internal)` — tupla válida (combo 1). Opción (a) requeriría extender la matriz gobernada 3→4 (signal + 2 CHECK + CONTRACT_DERIVATIONS + ruteo). Ningún gate (exit-890/intake-872/participation-893/double_rail_overlap) keyea por el VALOR de `contract_type`. La mecánica BHE↔payable ya vive en TASK-791 (invoice assets) + TASK-794 (readiness `invoice_asset_missing` + reconciliación `honorarios_withholding_mismatch`). Slice B re-scope NO toca payroll/honorarios.

**Arch (4-pilar + SSOT)**: `member.contract_type` es atributo del contrato de EMPLEO; "clasificación vigente" es PROYECCIÓN derivada de la relación/engagement activa (SSOT existente TASK-789/891/790). Opción (a) = SSOT competidor → viola SSOT + "extend don't parallel". Slice B = resolver canónico `resolveCurrentWorkClassification(profileId|memberId)` (no callsite recomputes) consumido por Person 360. Slice B baja de P1/payroll-crítico a people-domain/display de bajo riesgo. **Open question bloqueante DISUELTA** (se rechaza la premisa de mutar la tupla). Único residual (due diligence, no bloqueante): audit de consumers legacy que filtren "empleados activos" por `contract_type IN ('indefinido','plazo_fijo') AND active` (incluirían por error a un contractor ex-empleado) → migrarlos al resolver o agregar signal `workforce.employment_classification_drift`.

**Hard rules nuevas** (para CLAUDE.md al cerrar): NUNCA mutar `member.contract_type` para reflejar una relación contractor (es tipo de contrato de EMPLEO, historia cuando termina); NUNCA branchear clasificación vigente inline (pasa por `resolveCurrentWorkClassification`); NUNCA filtrar "empleados activos" por `contract_type + active` (filtra por relación de empleo activa); SIEMPRE el SSOT de estado laboral vigente es `person_legal_entity_relationships` + `ContractorEngagement`.
