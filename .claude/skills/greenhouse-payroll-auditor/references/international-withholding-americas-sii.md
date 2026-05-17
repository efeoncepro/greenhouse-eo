# International Withholding Americas — SII Reference

Use this reference when auditing or designing `international_internal` payroll, `TASK-905`, or any direct Chile payer -> non-resident collaborator payment.

This is an audit aid, not tax advice. Verify current law, SII guidance, treaty text, and Tax/Legal approval before production rates.

## Canonical Repo Audit

Full discovery lives in:

- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_AMERICAS_SII_DISCOVERY_2026-05-17.md`

Load that audit for detailed country/territory matrix, sources, seed recommendations, and open blockers.

## SII Source Map

Official sources used in the 2026-05-17 discovery:

- SII Convenios Tributarios Internacionales: `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII Ley sobre Impuesto a la Renta PDF: `https://www.sii.cl/normativa_legislacion/leyimpuestoalarenta.pdf`
- SII FAQ Art. 59/60, servicios profesionales/tecnicos: `https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_5588.htm`
- SII Resolucion Exenta N°58/2021, evidence for treaty benefits: `https://www.sii.cl/normativa_legislacion/resoluciones/2021/reso58.pdf`

## Non-Negotiable Payroll Rules

- `international_internal` must not receive Chile dependent deductions: AFP, salud, AFC, SIS, mutual, APV, or IUSC.
- `international_internal` must not receive Chile honorarios SII retention. That is only for `honorarios` / Chile boleta treatment.
- Direct Chile payer -> non-resident payments may require Impuesto Adicional or treaty treatment. Do not assume gross equals net.
- Payroll calculates and snapshots withholding if TASK-905 is enabled; Finance/Payment Orders consumes obligations, pays/declares/conciles, and must not recalculate payroll tax.
- Every result must be snapshot-based. Do not recalculate closed periods from live treaty/rate changes without formal reopen/reliquidation.

## Internal Chile Law Baseline

For no-treaty cases, the main TASK-905 service bucket is LIR Art. 59 N°2:

- engineering/technical work and professional/technical services: `15%`
- applies to natural persons and legal entities
- applies whether performed in Chile or abroad
- increases to `20%` when the beneficiary falls into the fiscal-preferential circumstances referenced by Art. 59 / Art. 41 H

Other buckets must not be collapsed into the technical-service bucket:

- royalties/IP can be `30%` or specific reduced/exempt treatment under Art. 59
- standard software use may be exempt if rights are only normal use, not commercial exploitation/reproduction/modification
- export-related exemptions require strict evidence and are not payroll defaults
- nontechnical/other Chile-source services may require Art. 60 review, including possible `35%`

## Treaty Evidence Gate

Before applying treaty zero or reduced rate, require:

- residence certificate issued by the competent authority of the other contracting state
- declaration that the beneficiary has no Chile permanent establishment/base fixed attributable to the income
- declaration that the beneficiary qualifies for the treaty benefit for that income
- service category and legal basis snapshot
- service location and Chile day-count when Article 14 style rules may apply
- beneficial owner / relationship / Art. 41 H checks when relevant

If any item is missing, the correct readiness result is `blocked_missing_evidence` or `needs_tax_review`.

## Americas Treaty Snapshot

SII lists general double-taxation treaties in force for these Americas jurisdictions:

- Argentina
- Brasil
- Canada
- Colombia
- Ecuador
- Estados Unidos
- Mexico
- Paraguay
- Peru
- Uruguay

Treaty transport-only or exchange-of-information instruments do not authorize payroll services reduced rates. Panama and Venezuela transport treaties are not general service-payroll treaty coverage. Bermuda information exchange is not a DTA.

## High-Signal Country Notes

- Colombia: Article 12 includes technical assistance, technical services, and consultancy as royalties; treaty cap candidate `10%`, evidence required.
- Uruguay: Article 14bis technical fees covers managerial, technical, and consultancy services; treaty cap candidate `10%`, evidence required.
- Brasil: protocol treats technical services and technical assistance under Article 12 royalties; treaty cap candidate `15%`, evidence required.
- Canada, Mexico, Peru: Article 14 can cap independent personal services carried out in Chile at `10%`; remote/no-base-fixed cases need Tax/Legal signoff before any zero withholding.
- United States, Ecuador, Paraguay: Article 14 generally turns on base fixed or 183-day presence for natural persons; do not approve zero without certificate, no-PE/base-fixed declaration, day-count and legal signoff.
- Argentina: treaty is in force, but SII interpretations distinguish Article 12 technical assistance and Article 14 personal independent services. Treat as legal-review-first until a country/service rule is approved.
- Nicaragua: no general SII DTA; explicit TASK-905 fallback `needs_tax_review`.

## Engine Design Reminder

Never model this as `rateByCountry`. Minimum resolver inputs:

- `payerCountry`
- `taxResidenceCountry`
- `payeeType`
- `serviceCategory`
- `servicePerformedCountry`
- Chile physical days in rolling 12 months
- PE/base-fixed status
- treaty evidence
- beneficiary/related-party/Art. 41 H facts
- period/effective date
- `tax_borne_by`

Initial Americas catalog should include every country/territory with `needs_tax_review` fallback. Promote to `approved_with_withholding` or `approved_no_withholding` only by audited Tax/Legal approval.
