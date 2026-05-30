# TASK-957 — Contractor ↔ Legacy Payroll Double-Rail Exclusion + contract_type Reconciliation

## Status

- Lifecycle: `to-do`
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

### Slice A — Gate de exclusión por engagement + señal + invariante (BLOQUEANTE)

- Módulo nuevo `src/lib/payroll/contractor-exclusion/` espejando `exit-eligibility/`: `resolveContractorEngagementPayrollExclusion(memberIds, periodStart, periodEnd) → Map<memberId, ContractorPayrollExclusion>`, policy pura + query bulk + flag.
- Flag `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` (default OFF). Cuando OFF: roster sin cambios (parity bit-for-bit). Cuando ON: post-filtro adicional en `pgGetApplicableCompensationVersionsForPeriod` que excluye a quien tiene ContractorEngagement activo (riel contractor-payable). NO foldear dentro de `resolveExitEligibilityForMembers` (dimensión ortogonal).
- Señal `payroll.contractor.double_rail_overlap` (`src/lib/reliability/queries/payroll-contractor-double-rail-overlap.ts`, kind=drift, moduleKey=payroll, steady=0): detecta members con ContractorEngagement activo **Y** compensation_version aplicable en el mismo período abierto. Corre **regardless del flag** (detector temprano). Wire-up en `get-reliability-overview.ts`.
- Tests: policy pura (member con/ sin engagement activo → excluido/incluido), parity flag-off, shadow-compare helper. Live-verify SQL de la señal contra PG real (proxy).

### Slice B — Reconciliación gateada de member.contract_type (POSTERIOR a A)

- Comando `reconcileContractorClassification` (`src/lib/contractor-engagements/reconcile-contract-type.ts`) espejo TASK-785/891: muta `member.contract_type`/`pay_regime`/`payroll_via` al valor destino decidido (ver Open Questions) + emite `member.contract_type.changed v1` + audit append-only, todo en una `withGreenhousePostgresTransaction`, `SELECT FOR UPDATE` sobre el member.
- Pre-condiciones duras (throw si fallan): el member tiene un ContractorEngagement activo; `classification_risk='clear'` (revisión humana del engagement — NUNCA auto-limpiar); el flag de Slice A está ON (dependencia code-side, patrón TASK-895 triple-flag).
- Capability `workforce.member.reconcile_contractor_classification` (catalog TS + `capabilities_registry` seed + grant `runtime.ts`, mismo PR; guard `capability-grant-coverage.test.ts` verde).
- Endpoint HR para disparar el comando + reason ≥ N chars.
- Flag `PAYROLL_CONTRACTOR_CLASSIFICATION_RECONCILE_ENABLED` (default OFF) con dependencia dura sobre `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED`.

## Out of Scope

- NO tocar `final_settlements`, `final_settlement_documents` ni el status/lanes del offboarding (hard rule TASK-956).
- NO reescribir el cálculo honorarios legacy ni el contractor payable SII (TASK-794) — esta task solo decide QUIÉN entra a cada riel, no CÓMO calcula cada uno.
- NO el carril provider/EOR (TASK-955) — esta task cubre el contractor directo (incluye honorarios CL); el gate de Slice A sirve a todos pero la decisión de tupla de Slice B se valida para honorarios CL primero.
- NO migración masiva de honorarios legacy existentes a contractor payables.
- NO auto-ejecutar Slice B dentro del comando de transición TASK-956 (desacoplado por blast-radius).

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

## Open Questions

1. **(BLOQUEANTE de Slice B, requiere greenhouse-finance-accounting-operator)** Valor destino de la tupla `(contract_type, pay_regime, payroll_via)` para un contractor honorarios CL pagado por el riel Greenhouse contractor-payable. Ningún valor actual encaja: `'honorarios'` rutea al riel SII legacy (PROHIBIDO — doble declaración), `'contractor'`/`'eor'` implican Deel/internacional (es CL), `'international_internal'` es no-residente (es residente CL). Opciones: (a) nuevo valor de enum (blast radius: CHECK matrix members + compensation_versions + `CONTRACT_DERIVATIONS` + ruteo del motor + UI); (b) `member.contract_type` queda como snapshot del último empleo y el `relationship_subtype='honorarios_cl'` del engagement es el SSOT de clasificación contractor. Decidir con la mecánica F29 en mano.
2. ¿El comando de Slice B debe correr eventualmente dentro del comando de transición TASK-956 (una vez Slice A vivo), o quedarse como reconciliación separada disparada por HR? arch-architect recomienda separado por blast-radius; reconsiderar tras estabilizar Slice A.
3. ¿La señal `double_rail_overlap` debe escalar a `error` (no solo warning) cuando el overlap persiste >1 período cerrado? Definir threshold tras observar steady-state.
