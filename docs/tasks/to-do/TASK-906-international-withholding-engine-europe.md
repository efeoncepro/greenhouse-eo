# TASK-906 — International Withholding Engine V1 Europe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `payroll|finance|hr|data|reliability`
- Blocked by: `TASK-905 shared foundation + external tax/legal validation of approved Europe rates before production cutover`
- Branch: `task/TASK-906-international-withholding-engine-europe`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Delta 2026-05-27

- **Linkage de programa.** Rastreada junto a EPIC-013 / TASK-905 como parte de "pagos a fuerza laboral internacional". Extiende la foundation de TASK-905 (no crea motor nuevo). Misma aclaración: ⚠️ `international_internal` ≠ contractor; vive dentro del motor de Payroll, no es Contractor Engagements. `Epic: optional` se mantiene a propósito.
- **Guardrails de no-regresión payroll** consolidados abajo. Auditado con `greenhouse-payroll-auditor`.

## Summary

Extender el motor canonico de retenciones internacionales de `international_internal` hacia Europa. Esta task reutiliza la foundation de TASK-905 y agrega el catalogo europeo fail-closed, soporte para circulares MFN SII, MLI/PPT, cobertura territorial y reglas por pais/tipo de servicio/evidencia.

Europa no debe entrar como excepcion por persona ni como `rateByCountry`. Cada pais/territorio europeo debe quedar con fallback explicito `needs_tax_review` y solo promoverse a `approved_*` mediante aprobacion Tax/Legal auditada.

## Frontera con Contractor Engagements (TASK-790-798) — Entidad Contratante (2026-05-30)

Single source of truth: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30 (modelo dimensional canónico). Misma frontera que TASK-905:

- Este motor (Europa) es el dueño del withholding **Chile→no-residente europeo**. Contractor Engagements/Payables (TASK-790-798) **delega** acá; nunca aplica una tasa por su cuenta (queda `manual_review_required`/`country_engine_owned` y escala).
- La activación se condiciona a la **entidad contratante** (`legal_entity_organization_id` = Operating Entity chilena, hoy `Efeonce Group SpA`) × contractor residente europeo. NO al país del contractor aislado.
- Multi-entidad: cuando abra `Efeonce US Inc` u otra entidad legal, los contractors contratados por una entidad NO chilena salen del scope de este motor. **NUNCA hardcodear "Efeonce/Chile"**: leer `legal_entity_organization_id`.

## Why This Task Exists

TASK-905 cubre Americas como V1 productivo. La investigacion SII Europa demostro que Espana y Europa tienen suficientes particularidades para requerir una task propia: convenios con articulos diferentes para empleo vs servicios independientes, service PE por 183 dias/seis meses, territorios que no heredan cobertura, circulares de nacion mas favorecida que cambian tasas del PDF base y MLI/PPT anti-abuso.

Sin una task Europa, cualquier colaborador europeo pagado directo por Chile queda en revision manual indefinida o se arriesga a un tratamiento incompleto.

## Goal

- Seedear Europa completa con fallback `needs_tax_review` para pagador `CL`.
- Agregar reglas/fuentes europeas versionadas sobre la foundation de TASK-905 sin duplicar resolver ni schema.
- Modelar MFN circulars, MLI/PPT y territorial coverage como source/evidence de regla.
- Mantener Espana/Europa bloqueados hasta aprobacion Tax/Legal, pero listos para reglas por pais.
- Proveer tests de catalogo/resolver para Europa y dry-run sobre colaboradores actuales sin mutarlos.

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
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- TASK-906 no crea un segundo motor. Reutiliza schema/resolver/snapshots de TASK-905.
- Europa queda fail-closed: sin regla aprobada o evidencia requerida, `needs_tax_review` o `blocked_missing_evidence`.
- No aplicar tasa reducida/cero por convenio solo por pais. La regla debe matchear pais fiscal + tipo de servicio + payee type + articulo/base legal + evidencia + vigencia.
- Las circulares MFN SII y MLI/PPT deben tratarse como fuentes/versionado de regla, no como comentarios sueltos.
- No asumir cobertura territorial automatica para Crown dependencies, territorios britanicos, territorios franceses, Groenlandia/Islas Feroe, Caribe neerlandes, Aland, Svalbard/Jan Mayen o Gibraltar.
- `EU`/`European Union` no es residencia fiscal valida; debe bloquearse como `blocked_invalid_tax_residency`.
- Si hay senales de subordinacion/empleo, bloquear como `needs_legal_classification_review` antes de resolver retencion.

## Normative Docs

- `docs/tasks/to-do/TASK-905-international-withholding-engine-americas.md`
- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_AMERICAS_SII_DISCOVERY_2026-05-17.md`
- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_EUROPE_SII_DISCOVERY_2026-05-17.md`
- `.codex/skills/greenhouse-payroll-auditor/references/international-withholding-europe-sii.md`
- SII convenios internacionales vigentes: `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII Ley sobre Impuesto a la Renta / Impuesto Adicional: `https://www.sii.cl/normativa_legislacion/leyimpuestoalarenta.pdf`
- SII Resolucion Exenta N°58/2021: `https://www.sii.cl/normativa_legislacion/resoluciones/2021/reso58.pdf`
- SII Circulares MFN relevantes: N°22/2018, N°50/2018, N°27/2019, N°5/2020 y N°65/2025.

## Dependencies & Impact

### Depends on

- `TASK-905` schema/resolver/catalog foundation complete or at least reusable in branch.
- `TASK-894` complete: `international_internal` exists.
- `src/lib/payroll/international-withholding/types.ts` — expected from TASK-905.
- `src/lib/payroll/international-withholding/rules.ts` — expected from TASK-905.
- `src/lib/payroll/international-withholding/resolve.ts` — expected from TASK-905.
- `greenhouse_payroll.international_withholding_rules` — expected from TASK-905 migration.
- `greenhouse_payroll.payroll_entries` snapshot fields — expected from TASK-905 migration.
- `greenhouse_finance.payment_obligations` mapping introduced/extended by TASK-905.

### Blocks / Impacts

- `TASK-907` Spain withholding rule pack and Daniela readiness pilot.
- Any production use of `international_internal` for European tax residence.
- Future country-specific Europe rule packs: France, UK, Ireland, Portugal, Italy, Netherlands, etc.
- Payment Orders must keep consuming payroll-computed obligations; Finance must not recalculate tax.

### Files owned

- `src/lib/payroll/international-withholding/europe-rules.ts` — NEW or equivalent catalog seed module.
- `src/lib/payroll/international-withholding/europe-catalog.test.ts` — NEW.
- `src/lib/payroll/international-withholding/resolve.test.ts` — MODIFY with Europe fixtures.
- `migrations/<timestamp>_task-906-international-withholding-europe-seed.sql` — NEW if catalog persists in DB.
- `src/lib/reliability/queries/payroll-international-withholding-*.ts` — MODIFY/extend if TASK-905 signals need Europe dimensions.
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — MODIFY ADR delta.
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md` — MODIFY if report contract changes.
- `docs/architecture/DECISIONS_INDEX.md` — MODIFY.
- `docs/documentation/hr/periodos-de-nomina.md` — MODIFY.
- `docs/manual-de-uso/hr/periodos-de-nomina.md` — MODIFY.
- `changelog.md` — MODIFY.
- `Handoff.md` — MODIFY on execution.

## Current Repo State

### Already exists

- `international_internal` is first-class via TASK-894.
- TASK-905 defines the shared engine foundation and explicitly keeps Europe out of Americas V1.
- Europe SII discovery exists in `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_EUROPE_SII_DISCOVERY_2026-05-17.md`.
- Payroll skill references Europe and enforces `needs_tax_review` until Europe catalog approval.

### Gap

- No Europe catalog seed exists.
- No Europe-specific resolver fixtures exist.
- No modeled source layer for MFN circulars or MLI/PPT exists yet.
- No test ensures `EU` fails as invalid tax residence.
- No test ensures Germany transport-only, Guernsey/Jersey TIEA-only and Crown dependencies remain blocked for payroll services.
- Spain/Daniela cannot be moved out of manual review without country-specific rules and evidence policy.

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

### Slice 0 — Europe ADR delta and foundation alignment

- Confirm TASK-905 runtime/schema state before writing Europe seed.
- Add ADR/delta to Payroll Architecture for Europe extension: MFN circulars, MLI/PPT, territorial coverage, `EU` invalid residence and Europe fail-closed posture.
- Confirm whether catalog is TS seed, DB seed, or hybrid according to TASK-905 implementation.

### Slice 1 — Europe source model

- Extend rule source shape to support:
  - treaty PDF
  - SII circular MFN
  - SII MLI synthesized text
  - mutual agreement
  - territorial coverage note
- Add source references for Austria, Belgium, Croatia, Denmark, Spain, France, Ireland, Italy, Norway, Netherlands, Poland, Portugal, United Kingdom, Czech Republic, Russia, Sweden and Switzerland.
- Ensure source URLs and effective dates are versioned and auditable.

### Slice 2 — Europe catalog seed

- Seed all Europe countries/territories from the audit matrix with fallback `needs_tax_review`.
- Include explicit non-DTA / special cases: Germany transport-only, Guernsey/Jersey TIEA-only, EU invalid, Crown dependencies, Gibraltar, Aland, Faroe Islands, Greenland, Svalbard/Jan Mayen and Caribbean Netherlands.
- Add DTA jurisdictions as `draft_tax_review` candidates only; do not mark `approved_*` without Tax/Legal signoff.

### Slice 3 — Europe resolver fixtures

- Add resolver tests for:
  - Spain outside approved catalog -> `needs_tax_review`
  - `EU` -> `blocked_invalid_tax_residency`
  - Germany transport-only -> `needs_tax_review`
  - Guernsey/Jersey TIEA-only -> `needs_tax_review`
  - Austria/Belgium/Switzerland royalty candidate uses MFN source but remains blocked/draft until approved
  - UK/France/Ireland/Spain natural contractor does not use independent-personal-services Art. 14 automatically
  - Norway/Poland service PE threshold requires day/month count

### Slice 4 — Readiness and reporting integration

- Ensure readiness blocker messages distinguish Europe out-of-scope/draft from missing evidence.
- Ensure receipts/reports do not show zero withholding for Europe unless approved and evidenced.
- Ensure Payment Orders receives the same status/snapshot semantics as Americas.

### Slice 5 — Dry-run and follow-up generation

- Run dry-run against current collaborators and confirm Daniela/Espana remains `needs_tax_review` until TASK-907 closes.
- Generate country-specific follow-ups if any current collaborator besides Spain appears in Europe.
- Document unresolved Tax/Legal questions in Handoff and docs.

## Payroll Non-Regression Guardrails (hard rules)

906 extiende el motor de TASK-905 a Europa fail-closed. No crea motor nuevo; hereda todos los guardrails de 905 y agrega los europeos. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** crear un segundo motor/resolver/schema. Reutiliza el de TASK-905.
- **NUNCA** aplicar a `international_internal` europeo deducciones Chile dependientes ni retención honorarios SII (heredado de 905).
- **NUNCA** promover una regla Europa a `approved_*` sin signoff Tax/Legal auditado; default `draft_tax_review`/`needs_tax_review`.
- **NUNCA** aplicar reducción por convenio en Europa sin evidencia + circular MFN/MLI vigente + cobertura territorial confirmada. `EU` no es residencia fiscal válida → `blocked_invalid_tax_residency`.
- **NUNCA** romper el catálogo/resolver Americas (905) ni los otros 4 regímenes (Chile dependiente, honorarios, contractor/Deel, EOR) al sumar Europa. Regression Americas + suite payroll verde.
- **NUNCA** mover a Daniela/España fuera de `needs_tax_review`; eso es TASK-907 con signoff Tax/Legal.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` (suite completa) además de `international-withholding`, como gate de cierre.

## Out of Scope

- Approving any Europe country rule without written Tax/Legal signoff.
- Mutating real collaborators or changing Daniela's payroll treatment.
- Replacing TASK-905 foundation.
- Calculating local taxes/social security in the collaborator's country.
- Automating declaration/payment of Impuesto Adicional; Finance/Payment Orders remains owner after Payroll emits obligations.

## Detailed Spec

### Europe DTA jurisdictions from SII discovery

- AT, BE, HR, DK, ES, FR, IE, IT, NO, NL, PL, PT, GB, CZ, RU, SE, CH.

### Europe special guardrails

- `EU`: invalid tax residence.
- DE: transport-only in SII, no payroll services reduction.
- GG/JE: TIEA-only in SII, no payroll services reduction.
- GB dependencies/territories: do not inherit UK treaty automatically.
- DK territories: do not inherit Denmark automatically.
- FR overseas territories: do not inherit France automatically without legal confirmation.
- NL Caribbean territories: do not inherit Netherlands automatically.
- NO territories: do not inherit Norway automatically.

### Europe source fields

Rules or sources must be able to store:

- `source_kind`: `treaty_pdf`, `sii_circular_mfn`, `mli_synthesized_text`, `mutual_agreement`, `territorial_coverage_note`, `manual_tax_legal_memo`
- `source_url`
- `source_reference`
- `source_effective_from`
- `source_effective_to`
- `source_validated_at`
- `source_validated_by`
- `source_summary`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 must confirm TASK-905 foundation before Europe seed.
- Slice 1 -> Slice 2 -> Slice 3: source model, catalog, tests.
- Slice 4 depends on resolver semantics from Slice 3.
- Slice 5 is dry-run only and must not mutate collaborators.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Europe rule accidentally approved from draft | payroll/tax | medium | default `draft_tax_review`, audited approval mutation, tests for blocked state | `payroll.international_withholding.rule_missing` / rule status signal |
| Old treaty PDF rate used despite MFN circular | payroll/tax | medium | source model requires circular reference and effective date | catalog source tests |
| Territory inherits wrong treaty | payroll/tax | high | explicit territory fallback rows and coverage tests | catalog coverage test |
| EU used as residence country | payroll/data | medium | `blocked_invalid_tax_residency` resolver case | resolver test + readiness blocker |
| Service PE/day-count ignored | payroll/tax | medium | required evidence fields and Europe fixtures | evidence missing signal |

### Feature flags / cutover

- Reuse TASK-905 `PAYROLL_INTERNATIONAL_WITHHOLDING_ENABLED=false` default.
- If needed, add `PAYROLL_INTERNATIONAL_WITHHOLDING_EUROPE_CATALOG_ENABLED=false` default until staging catalog dry-run passes.
- Production cutover requires Tax/Legal approval per country/service rule.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert docs/ADR delta before implementation | <10 min | si |
| Slice 1 | Mark sources inactive or revert additive source rows | <15 min | si |
| Slice 2 | Mark Europe rules `inactive`/`needs_tax_review`; keep fallback rows | <10 min | si |
| Slice 3 | Disable Europe catalog flag or revert resolver fixture wiring | <10 min | si |
| Slice 4 | Disable readiness/report branch via TASK-905 flag | <5 min | si |
| Slice 5 | Dry-run only; no rollback | N/A | si |

### Production verification sequence

1. Confirm TASK-905 schema/resolver is deployed with flags OFF.
2. Apply Europe source/catalog seed in staging.
3. Run Europe catalog coverage tests and resolver fixtures.
4. Run payroll regression suite with flags OFF; TASK-905 Americas behavior unchanged.
5. Enable Europe catalog in staging only.
6. Dry-run current collaborator roster; verify Europe entries remain blocked unless specifically approved.
7. Tax/Legal approves country/service rules.
8. Promote approved rules one by one with audit trail and monitor 14 days.

### Out-of-band coordination required

- Tax/Legal approval per country/service/payeeType rule.
- HR/People Ops classification for European collaborators: employee vs independent contractor vs entity.
- Finance policy for gross-up and F50/DJ handling.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Europe catalog includes explicit fallback for every country/territory listed in the Europe audit matrix.
- [ ] `EU`/`European Union` resolves to invalid tax residence and cannot silently pay gross.
- [ ] Germany transport-only and Guernsey/Jersey TIEA-only do not produce treaty reduced payroll service rates.
- [ ] DTA Europe rules remain `draft_tax_review`/blocked until audited Tax/Legal approval.
- [ ] Resolver tests cover Spain, Germany, UK/France/Ireland/Spain Art. 14 employment distinction, MFN source rates and territorial caveats.
- [ ] Payroll non-regression: catálogo/resolver Americas (905) intacto y suite `src/lib/payroll` verde; los otros 4 regímenes sin deltas.
- [ ] Docs, architecture delta, changelog and Handoff are synchronized.

## Verification

- `pnpm vitest run src/lib/payroll/international-withholding`
- `pnpm vitest run src/lib/payroll` — payroll non-regression gate (Americas + otros regímenes).
- `pnpm exec eslint src/lib/payroll src/types/payroll.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm pg:doctor`
- dry-run script/API from TASK-905 for current collaborators, staging only.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] `changelog.md` + architecture docs updated.
- [ ] Document which European country/territory rules are `approved_*` vs `needs_tax_review`.
- [ ] `pnpm vitest run src/lib/payroll` green (payroll non-regression gate).
