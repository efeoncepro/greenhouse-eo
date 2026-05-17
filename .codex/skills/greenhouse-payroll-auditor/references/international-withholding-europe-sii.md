# International Withholding Europe — SII Reference

Use this reference when auditing or designing `international_internal` payroll for a Chile payer directly paying a non-resident collaborator with European tax residency.

This is an audit aid, not tax advice. Verify current law, SII guidance, treaty text, MLI status, and Tax/Legal approval before production rates.

## Canonical Repo Audit

Full discovery lives in:

- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_EUROPE_SII_DISCOVERY_2026-05-17.md`

Load that audit for the detailed Europe country/territory matrix, SII treaty source map, MFN circulars, MLI notes, seed recommendations, and blockers.

## SII Source Map

Official sources used in the 2026-05-17 discovery:

- SII Convenios Tributarios Internacionales: `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII Ley sobre Impuesto a la Renta PDF: `https://www.sii.cl/normativa_legislacion/leyimpuestoalarenta.pdf`
- SII Resolucion Exenta N°58/2021, evidence for treaty benefits: `https://www.sii.cl/normativa_legislacion/resoluciones/2021/reso58.pdf`
- SII Circular N°22/2018, N°50/2018, N°27/2019, N°5/2020 and N°65/2025 for MFN rate changes.

## Non-Negotiable Payroll Rules

- Europe is outside TASK-905 Americas V1 approved seed. A European tax residence must resolve `needs_tax_review` until a Europe task approves rules.
- `international_internal` must not receive Chile dependent deductions: AFP, salud, AFC, SIS, mutual, APV, or IUSC.
- `international_internal` must not receive Chile honorarios SII retention. That is only for Chile `honorarios` / boleta treatment.
- Direct Chile payer -> European non-resident payments may require Impuesto Adicional or treaty treatment. Do not assume gross equals net.
- Payroll calculates and snapshots withholding only when a versioned rule is approved; Finance/Payment Orders consumes obligations and must not recalculate payroll tax.
- Every result must be snapshot-based. Do not recalculate closed periods from live treaty/rate changes without formal reopen/reliquidation.

## Internal Chile Law Baseline

For no-treaty cases, the main service bucket remains LIR Art. 59 N°2:

- engineering/technical work and professional/technical services: `15%`
- applies to natural persons and legal entities
- applies whether performed in Chile or abroad
- increases to `20%` when the beneficiary falls into the fiscal-preferential circumstances referenced by Art. 59 / Art. 41 H

Other buckets must not be collapsed into the technical-service bucket:

- royalties/IP can be `30%` or treaty-reduced when the payment is truly a royalty
- equipment royalties under many Europe DTAs are capped at `2%` or `5%`, but only when the contract is really equipment use/right-of-use
- standard software use may be exempt domestically if rights are only normal use, not commercial exploitation/reproduction/modification
- nontechnical/other Chile-source services may require Art. 60 review, including possible `35%`

## Treaty Evidence Gate

Before applying treaty zero or reduced rate, require:

- residence certificate issued by the competent authority of the other contracting state
- declaration that the beneficiary has no Chile permanent establishment/base fixed attributable to the income
- declaration that the beneficiary qualifies for the treaty benefit for that income
- service category and legal basis snapshot
- service location and Chile day-count / service-PE count when relevant
- beneficial owner / relationship / Art. 41 H checks when relevant
- MLI/PPT or anti-abuse check when relevant

If any item is missing, the correct readiness result is `blocked_missing_evidence` or `needs_tax_review`.

## Europe Treaty Snapshot

SII lists general double-taxation treaties in force for these European jurisdictions:

- Austria
- Belgium
- Croatia
- Denmark
- Spain
- France
- Ireland
- Italy
- Netherlands
- Norway
- Poland
- Portugal
- United Kingdom
- Czech Republic
- Russia
- Sweden
- Switzerland

Germany is listed by SII only under transport conventions for maritime/air transport. Guernsey and Jersey are listed under information-exchange agreements. Transport-only and exchange-of-information instruments do not authorize payroll service treaty rates.

## High-Signal Europe Notes

- Do not seed Europe as approved in TASK-905 V1. Spain/Daniela must stay `needs_tax_review` until a Europe task.
- MFN circulars matter. Many PDF treaty texts show old royalty rates, but SII circulars reduce equipment royalties to `2%` for Austria, Belgium, Denmark, Spain, France, Ireland, Italy, Norway, Poland, United Kingdom, Czech Republic, Sweden and Switzerland. Netherlands already has `2/10%` in the current treaty. Croatia, Portugal and Russia remain `5/10%` based on the reviewed SII material.
- Spain, France, Ireland and United Kingdom use Article 14 for dependent employment in the reviewed treaty text. Do not map contractors there to independent-personal-services Article 14; review Article 7, PE/service PE and labor classification.
- Several treaties include service PE or consulting-service PE thresholds, commonly 183 days in any twelve-month period or six months. Track physical presence and related projects.
- MLI entered into force for Chile on 2021-03-01 and SII publishes synthesized texts for several European treaties. Store MLI/PPT evidence as source context; MLI is not a rate by itself.
- Do not assume treaty territorial coverage for Crown dependencies, overseas territories, Aland, Faroe Islands, Greenland, Svalbard/Jan Mayen, Gibraltar, or Caribbean Netherlands.

## Engine Design Reminder

Never model this as `rateByCountry`. Minimum resolver inputs:

- `payerCountry`
- `taxResidenceCountry`
- `payeeType`
- `serviceCategory`
- `servicePerformedCountry`
- Chile physical days or months in the treaty measurement window
- PE/base-fixed/service-PE status
- treaty evidence
- beneficiary/related-party/Art. 41 H facts
- MLI/PPT applicability
- territorial coverage
- period/effective date
- `tax_borne_by`

Initial Europe catalog should include every country/territory with `needs_tax_review` fallback. Promote to `approved_with_withholding` or `approved_no_withholding` only by audited Tax/Legal approval.
