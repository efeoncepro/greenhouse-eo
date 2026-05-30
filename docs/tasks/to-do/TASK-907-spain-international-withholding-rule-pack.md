# TASK-907 — Spain International Withholding Rule Pack

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `payroll|finance|hr|data|reliability`
- Blocked by: `TASK-905 shared foundation + TASK-906 Europe catalog foundation + Spain Tax/Legal signoff`
- Branch: `task/TASK-907-spain-international-withholding-rule-pack`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear el rule pack especifico para Espana dentro del motor de retenciones internacionales. Esta task convierte el hallazgo "Espana/Daniela queda `needs_tax_review`" en un vertical slice validable: clasificacion de servicio, evidencia AEAT/SII, Art. 7/service PE, Art. 12 con MFN y distincion de empleo/subordinacion.

No muta a Daniela ni a ningun colaborador real sin allowlist escrita HR/Finance/Legal. El objetivo es dejar Espana lista para aprobacion auditada y calculo automatico cuando exista signoff.

## Frontera con Contractor Engagements (TASK-790-798) — Entidad Contratante (2026-05-30)

Single source of truth: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30. Este rule pack es el dueño del withholding **Chile→residente España** (caso Daniela). Contractor Engagements/Payables **delega** acá; el engagement directo de un contractor en España queda `manual_review_required` hasta que exista la regla España aprobada, y nunca aplica una tasa por su cuenta. La activación se condiciona a **entidad contratante = Operating Entity chilena** (hoy `Efeonce Group SpA`) × residente España. Si mañana Daniela fuese contratada por una entidad legal europea/US de Efeonce, sale del scope de este motor (otro régimen). **NUNCA hardcodear "Efeonce/Chile"**: leer `legal_entity_organization_id`.

## Why This Task Exists

Espana aparece como caso operativo concreto y no debe quedar como excepcion manual por persona. La investigacion SII Europa muestra que Espana requiere tratamiento propio: el Art. 14 del convenio es rentas del trabajo dependiente, no servicios personales independientes; el Art. 12 tiene rebaja por Circular SII N°50/2018; y cualquier no retencion por Art. 7 depende de no tener PE/service PE, evidencia y clasificacion correcta del servicio.

## Goal

- Definir rule pack Espana para `international_internal` pagado desde Chile.
- Bloquear por defecto como `needs_tax_review` hasta Tax/Legal signoff.
- Agregar evidencia requerida y tests para Espana/Daniela.
- Permitir promocionar reglas aprobadas de Espana sin desbloquear Europa completa.
- Documentar criterios de clasificacion laboral y fiscal para evitar pago bruto indebido.

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
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- Espana no puede aprobarse como tasa 0 por existir convenio.
- El Art. 14 del convenio Chile-Espana no debe tratarse como servicios personales independientes; en el texto revisado corresponde a rentas del trabajo dependiente.
- Servicio remoto de empresa/persona natural debe revisarse por Art. 7, PE/service PE, Art. 12 si es royalty real, y clasificacion laboral.
- Circular SII N°50/2018 debe versionarse como fuente para Art. 12 si se modelan regalias/equipos.
- Cualquier regla aprobada requiere certificado de residencia fiscal, declaracion no EP/base fija, elegibilidad convenio, contrato/invoice, service category, beneficiario efectivo y periodo.
- Si hay senales de subordinacion, bloquear como `needs_legal_classification_review`.

## Normative Docs

- `docs/tasks/to-do/TASK-905-international-withholding-engine-americas.md`
- `docs/tasks/to-do/TASK-906-international-withholding-engine-europe.md`
- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_EUROPE_SII_DISCOVERY_2026-05-17.md`
- `.codex/skills/greenhouse-payroll-auditor/references/international-withholding-europe-sii.md`
- SII convenio Chile-Espana PDF, enlazado desde `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII Circular N°50/2018: `https://www.sii.cl/normativa_legislacion/circulares/2018/circu50.pdf`
- SII Resolucion Exenta N°58/2021: `https://www.sii.cl/normativa_legislacion/resoluciones/2021/reso58.pdf`

## Dependencies & Impact

### Depends on

- `TASK-905` shared schema/resolver/snapshot foundation.
- `TASK-906` Europe source/catalog foundation or an approved partial Europe source model.
- `TASK-894` complete: `international_internal` exists.
- `src/lib/payroll/international-withholding/resolve.ts` — expected from TASK-905.
- `greenhouse_payroll.international_withholding_rules` — expected from TASK-905.
- `greenhouse_core.assets` or equivalent evidence store for certificates/contracts/invoices `[verificar runtime columns]`.

### Blocks / Impacts

- Daniela/Espana migration from manual review to automated readiness/calculation.
- Any Spain resident `international_internal` payment.
- Finance/Payment Orders tax obligation handling for Spain-specific withholding.

### Files owned

- `src/lib/payroll/international-withholding/europe-rules.ts` or Spain-specific catalog module — MODIFY.
- `src/lib/payroll/international-withholding/spain-rule-pack.test.ts` — NEW.
- `src/lib/payroll/international-withholding/resolve.test.ts` — MODIFY.
- `migrations/<timestamp>_task-907-spain-international-withholding-rules.sql` — NEW if catalog persists in DB.
- `docs/documentation/hr/periodos-de-nomina.md` — MODIFY.
- `docs/manual-de-uso/hr/periodos-de-nomina.md` — MODIFY.
- `changelog.md` — MODIFY.
- `Handoff.md` — MODIFY on execution.

## Current Repo State

### Already exists

- TASK-905 declares Espana/Daniela out of scope and must resolve `needs_tax_review`.
- Europe SII audit identifies Spain DTA, Circular N°50/2018 and Art. 14 employment distinction.
- Payroll skill warns that Spain/Europe require Europe-specific catalog approval.

### Gap

- No Spain-specific approved/draft rule pack exists.
- No test protects the Art. 14 employment distinction.
- No evidence checklist for Spain is represented in the resolver.
- No dry-run proves Daniela remains blocked until evidence/signoff exists.

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

### Slice 0 — Spain legal/source confirmation

- Re-open SII Spain treaty PDF, Circular N°50/2018, Resolucion 58/2021 and Europe audit before implementation.
- Produce Spain-specific rule decision memo in Payroll Architecture or a dedicated docs delta.
- Confirm with Tax/Legal which service categories are allowed as draft vs approved.

### Slice 1 — Spain draft rules

- Add Spain fallback `needs_tax_review`.
- Add draft candidate for Art. 7/no PE business profits only if evidence requirements are represented.
- Add Art. 12 royalty/equipment candidate with Circular N°50/2018 source, but only for true royalty/equipment royalty.
- Ensure Art. 14 employment distinction is explicit and not used as independent contractor shortcut.

### Slice 2 — Evidence and readiness

- Require Spain evidence set:
  - certificate of Spanish tax residence from competent authority / AEAT equivalent accepted by Tax/Legal
  - no Chile PE/base-fixed declaration per SII Resolucion 58
  - eligibility/beneficiary declaration
  - contract/invoice and service category
  - day-count / service location if PE/service PE can matter
  - beneficial owner and related-party checks
- Readiness must say whether blocker is missing evidence, missing approval or legal classification risk.

### Slice 3 — Resolver tests and Daniela dry-run

- Add tests:
  - Spain default -> `needs_tax_review`
  - Spain with missing certificate -> `blocked_missing_evidence`
  - Spain Art. 14 independent shortcut forbidden
  - Spain royalty equipment candidate uses Circular N°50/2018 source and requires royalty category
  - Spain natural contractor with employment/subordination signals -> `needs_legal_classification_review`
- Run dry-run for Daniela/Espana and confirm no mutation.

### Slice 4 — Approval path and docs

- Add audited promotion path from `draft_tax_review` to `approved_*` for Spain rules if TASK-905/TASK-906 does not already cover it.
- Update HR payroll docs/manuals with Spain-specific operator caveats.
- Update changelog and Handoff.

## Out of Scope

- Europe-wide seed. That belongs to TASK-906.
- Approving Spain rules without written Tax/Legal signoff.
- Mutating Daniela or any real collaborator.
- Local Spanish income tax/social security compliance for the contractor.
- Declaring/paying Impuesto Adicional automatically; Finance/Payment Orders remains owner after Payroll emits obligation.

## Detailed Spec

### Spain rule states

- `needs_tax_review`: default Spain state.
- `draft_tax_review`: candidate rule with SII/Tax memo but not executable.
- `blocked_missing_evidence`: rule exists but evidence is incomplete.
- `needs_legal_classification_review`: employment/subordination risk or Art. 14 employment ambiguity.
- `approved_no_withholding` / `approved_with_withholding`: only after audited Tax/Legal approval.

### Spain evidence snapshot

Snapshot must include:

- `tax_residence_country_code='ES'`
- certificate metadata and validity period
- no PE/base-fixed declaration metadata
- treaty eligibility declaration metadata
- service category
- legal basis candidate: `treaty_art_7`, `treaty_art_12`, `manual`
- source reference: treaty PDF, Circular N°50/2018, Resolucion 58/2021
- approved actor and approval expiry when promoted

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 must complete before draft rules.
- Slice 1 draft rules before readiness and tests.
- Slice 2 evidence semantics before Daniela dry-run.
- Slice 3 dry-run must not mutate real collaborators.
- Slice 4 approval path only after Tax/Legal signoff path is defined.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Daniela/Spain paid gross without evidence | payroll/finance | high | default `needs_tax_review`, readiness blockers, dry-run only until signoff | `payroll.international_withholding.evidence_missing` |
| Art. 14 misused as independent contractor rule | payroll/tax | medium | explicit resolver test and legal basis guard | resolver regression test |
| Royalty rate applied to normal services | payroll/tax | medium | service category exact match and contract evidence | catalog tests |
| Real collaborator mutated during dry-run | hr/payroll | low | dry-run script read-only, allowlist required for apply | audit log / no mutation check |

### Feature flags / cutover

- Reuse TASK-905/TASK-906 flags.
- If Spain needs staged activation independent of Europe, add `PAYROLL_INTERNATIONAL_WITHHOLDING_SPAIN_RULES_ENABLED=false` default.
- Production activation requires Tax/Legal signoff and explicit allowlist.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert docs decision memo | <10 min | si |
| Slice 1 | Mark Spain rules inactive/needs review | <10 min | si |
| Slice 2 | Disable readiness branch via flag or revert evidence requirement delta | <10 min | si |
| Slice 3 | Tests/dry-run only; no production rollback | N/A | si |
| Slice 4 | Revoke Spain rule approval, set status back to `needs_tax_review` | <10 min | si |

### Production verification sequence

1. Confirm TASK-905/TASK-906 foundation deployed with flags OFF.
2. Apply Spain draft rules in staging.
3. Run Spain resolver tests.
4. Run Daniela dry-run; verify `needs_tax_review` until evidence/signoff exists.
5. Attach Tax/Legal signoff and evidence fixture in staging.
6. Promote one Spain rule to approved in staging.
7. Verify payroll entry snapshot, receipt subtotal and payment obligation metadata.
8. Repeat in production only with allowlist and flags staged.

### Out-of-band coordination required

- Tax/Legal Spain signoff.
- HR/People Ops classification of Daniela/Spain relationship.
- Finance confirmation of gross-up policy and tax declaration flow.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Spain default remains `needs_tax_review`.
- [ ] Spain rule pack includes treaty PDF, Circular N°50/2018 and Resolucion 58/2021 as explicit sources.
- [ ] Resolver forbids using Spain Art. 14 as an independent contractor shortcut.
- [ ] Evidence requirements block calculation when certificate/no PE/eligibility/service category is missing.
- [ ] Daniela dry-run is read-only and proves no automatic payment/calc before signoff.
- [ ] Docs, changelog, Handoff and TASK-906 links are synchronized.

## Verification

- `pnpm vitest run src/lib/payroll/international-withholding`
- `pnpm exec eslint src/lib/payroll src/types/payroll.ts`
- `pnpm exec tsc --noEmit --pretty false`
- staging dry-run for Spain/Daniela with no mutation.
