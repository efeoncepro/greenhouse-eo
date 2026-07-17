# ANAM Sector, Market and Geography KPI Slice

> **Date:** 2026-07-16
> **Portal:** HubSpot `19893546`
> **Status:** approved schema plus bounded Company backfills executed and read back; three explicitly partial diagnostic charts are live; official revenue KPIs remain gated
> **Scope:** Company segmentation, strategic sector, headquarters region, Deal execution geography and market-penetration readiness

## Outcome

ANAM cannot yet publish an official “sales by industry/sector/region” KPI from HubSpot without hiding a material part of the sales population.

- `industry` is populated on 1,010/1,023 Companies, but contains 88 mixed native/custom values and is not the controlled ANAM segmentation.
- `sector_estrategico` now has 65/1,023 populated Companies from direct, conservative mappings.
- `region_de_chile` now has 471/1,023 populated Companies from exact unique identity matches.
- `segmento_de_mercado_anam` now has the same 471/1,023 governed Company cohort and preserves native `industry`.
- Deal `zona` is populated on 399/1,240 Deals and represents execution geography, not Company headquarters. It is multi-select and therefore non-additive for amount reporting.
- after the separately approved 34-pair association slice, only 629/1,240 Deals have a primary Company association; 611 do not.
- the pre-remediation current-quarter baseline was 8/29 Growth-created Deals and 5/26 won Deals with a primary Company association; this narrow cohort was not promoted as an official KPI.

The safe publication boundary is therefore diagnostic rather than official. With explicit operator approval, three historical charts were created with `histórico parcial` in every title, exact `Ganado` filtering and known-dimension filtering. They expose the available evidence without representing invoicing, complete revenue or an official KPI.

## Source reconciliation matrix

| Meeting / date | Classification | Decision or commitment | Owner | Related phase | Current runtime evidence | Gap / drift | Next action | ANAM approval? |
|---|---|---|---|---|---|---|---|---|
| Second ANAM session / 2025-11-10 | Stable decision | Record Company region and report clients/sales by region or zone. | ANAM operators + Efeonce | Phase 1 / Growth | Company `region_de_chile` has 471 governed values; Deal `zona` has 399 values. | Company HQ region and Deal execution zone were conflated in older notes. | Preserve both grains; remediate Deal-to-Company coverage before publishing revenue by HQ region. | Yes for any later association write. |
| KPI implementation / 2026-03-09 | Stable decision | Strategic sectors are Minería, Desaladoras, Sanitarias, Energía, Acuícola/Pesquero and Servicios asociados; measure penetration. | María Paz / JP + Efeonce | Phase 1 / Growth | Company `sector_estrategico` has 65 direct values; ambiguous mappings remain blank. | Desaladoras and Servicios asociados still lack approved deterministic mappings; TAM/SAM is unresolved. | Ratify remaining mapping and market benchmark before penetration reporting. | Yes. |
| Task 22 / refreshed 2026-06-19 | Material superseded for file availability; task still open for migration | Pablo would deliver the LabWare client list segmented by sector. | Pablo Puga; María Paz copied | Phase 1 / Growth | Local source file `2026-04-01_segmentacion-clientes.xlsx` exists with 2,611 non-empty client rows, 22 segment labels and numeric region codes. | Notion still says `Bloqueado`, but the attachment is available. Migration identity and taxonomy remain unresolved. | Use the workbook as a governed source candidate, not as a blind import. | Yes for backfill. |
| Market workbook / 2026-06-30 | Tentative note / configuration input | Provide TAM/SAM and target penetration by sector. | María Paz / JP | Market KPI slice | Workbook contains both range estimates and conflicting point estimates; only Minería and Sanitarias have partial SAM/base/target formulas. | Minería is USD 95–120M in one sheet and USD 200M in another; Sanitarias USD 35–45M versus USD 135M. | ANAM must select one approved benchmark version and as-of date. | Yes. |
| CRM progress / 2026-06-24 and checkpoint / 2026-07-01 | Open task | Provide market size, company list by sector and management progress. | María Paz | Phase 1 / Growth | The controlled segment schema and bounded backfill are live; the market draft remains contradictory. | Operational segmentation progressed; authoritative TAM/SAM did not. | Select the benchmark version and numerator contract. | Yes. |
| Runtime readback / 2026-07-16 | Stable runtime fact | Deal-to-Company coverage must precede official cross-object revenue reporting. | Efeonce data governance + Deal owners | Phase 1 / Data Quality | After the exact 34-pair slice, 611/1,240 Deals still lack primary Company; 92 historical won Deals have a Company with governed segment and HQ region. | Diagnostic charts omit the uncovered population and cannot be treated as invoicing or complete revenue. | Keep the partial label, operate the owner queue and publish official KPIs only after the coverage threshold. | Diagnostic charts approved; yes for any additional association write. |

The official Chilean 16-region catalog used by `region_de_chile` is consistent with the current INE/BCN division. The workbook’s numeric values follow the official code order: 01 Tarapacá through 16 Ñuble, including 13 Metropolitana, 14 Los Ríos and 15 Arica y Parinacota.

## Attachment findings

### Detailed market segmentation

The LabWare workbook uses 22 controlled labels:

1. Alimentos
2. Transporte
3. Consultoras
4. Otros Rubros
5. Bebidas
6. Forestal
7. Salud
8. Ing. y Construcción
9. Laboratorios
10. Mineria
11. Particulares
12. Organismos Públicos
13. Acuicola
14. Productos Quimicos
15. Retail
16. Sanitarias
17. Turismo
18. Educación
19. Vitivinícola
20. Energía
21. Desconocido
22. Textiles

This is a detailed client-market segmentation. It is not the same grain as the six strategic sectors and should not overwrite HubSpot’s native `industry` property.

### Deterministic identity dry run

Against 1,023 live Companies, normalization of Company name versus LabWare legal name, fantasy name and description produced:

| Result | Companies |
|---|---:|
| Exact source match, one consistent segment/region and one live Company for the normalized key | 471 |
| Ambiguous exact match | 3 |
| Duplicate live Company records held | 22 records across 11 normalized keys |
| No exact match | 527 |
| Total | 1,023 |

No fuzzy match is eligible for automatic write. The workbook lacks a reliable one-to-one HubSpot identifier, and some rows aggregate several CeCo codes.

## Executed reversible write

### Data Quality report

| Asset | Destination | Contract | Verified readback |
|---|---|---|---|
| `DQ - Negocios sin empresa asociada por responsable` | `Calidad de Datos Comercial` dashboard `21144697` | Deals; all creation dates; `Empresa asociada` is unknown; horizontal bar by Deal owner; Deal count | 645 total: Ricardo Miralles 258; Isabel Aguilera Bruna 144; Belén Robles Escalona 99; Maria Paz Haeger 86; Carlos Venegas 21; María Cecilia Pinto 14; María Paz Arellano 10; José Pedro De Oliveira 6; Pablo Puga 5; Dulia Sandoval 1; unassigned 1. |

At this first control slice, no Company, Deal, association, workflow, form, schema or existing report was modified.

Rollback: remove this report from dashboard `21144697` and delete the report if the API and dashboard readback cease to reconcile.

## Approved and executed change set

### S1 — Create controlled Company segmentation

Create one Company property:

| Attribute | Proposed value |
|---|---|
| Internal name | `segmento_de_mercado_anam` |
| Label | `Segmento de mercado` |
| Type / field type | `enumeration` / `select` |
| Description | `Segmentación operativa de clientes proveniente de LabWare. No reemplaza la industria nativa ni el sector estratégico.` |
| Options | the 22 workbook labels listed above, with stable ASCII internal values |
| Owner | ANAM RevOps; Efeonce governs schema and mapping |
| Source | `2026-04-01_segmentacion-clientes.xlsx` |
| Backfill | bounded S2 cohort below |
| Rollback | archive only if zero consumers/values; otherwise hide and migrate through a separate change set |

`industry` remains untouched because it is HubSpot’s native enrichment field, is already populated on 98.73% of Companies and currently contains 88 values.

### S2 — Bounded Company backfill

After S1 readback, update only the 471 records that pass both the source-side consistency guard and the stronger Company-side uniqueness guard:

- `segmento_de_mercado_anam` from workbook `Segmentación Mercado2`;
- `region_de_chile` from the workbook numeric region code mapped to the existing official option value;
- preserve `industry`, `state`, Company names, domains and RUT;
- exclude all 3 ambiguous-source cases, 22 live records under duplicate normalized Company keys and 527 unmatched Companies;
- snapshot before values and generate a row-level change manifest before PATCH;
- batch size at most 100 with abort on any identity, option or portal mismatch;
- read back every successful Company and reconcile counts by segment and region.

Execution result: import `77871653`, `ANAM — Segmento y región — exact unique — 2026-07-16`, processed 471 rows, updated 471 Companies, created no records or associations and finished with 0 errors.

### S3 — Strategic-sector mapping

Conservative deterministic mappings:

| Detailed segment | Strategic sector | Current exact-match cohort |
|---|---|---:|
| Mineria | Minería | 9 |
| Sanitarias | Sanitarias | 29 |
| Energía | Energía | 9 |
| Acuicola | Acuícola | 18 |

Do not infer `Desaladoras` from the detailed workbook because it has no corresponding LabWare label. Do not automatically map all `Consultoras` to `Servicios asociados`, or all remaining segments to `Otros`, until ANAM confirms that business rule.

Execution result: import `77871743`, `ANAM — Sector estratégico directo — 2026-07-16`, processed 65 rows, updated 65 Companies, created no records or associations and finished with 0 errors. All other `sector_estrategico` values remain blank for later review.

### Runtime verification and rollback evidence

- schema readback: `segmento_de_mercado_anam`, visible label `Segmento de mercado`, 22 options;
- record readback: all 471 safe Companies reconcile exactly for segment and headquarters region; the 65 direct strategic mappings also reconcile;
- immutable pre-change snapshot: `.tmp/anam-sector-geography-2026-07-16/before-snapshot.json`, SHA-256 `ab21fbc067598a94c62f87636114a3d174229ed3ab8776ffe1155d051c10d711`;
- approved row manifest: `.tmp/anam-sector-geography-2026-07-16/change-manifest.json`, SHA-256 `d85c1ea0eaa61c83270f107ec38a38ab1ae9c142d5e17be47bb3bb4324c6669f`;
- post-change readback: `.tmp/anam-sector-geography-2026-07-16/after-readback.json`, SHA-256 `e86c69b187087fd805780ed4e68e631218cdcb4ef04806c64dc726d0ab58bb22`.

Rollback, if separately authorized, is an ID-bounded import from the immutable snapshot. Do not archive the property while it has values, do not merge duplicate Companies and do not infer replacements for held or unmatched records.

### S4 — Deal-to-Company remediation

No automatic association change is proposed yet. Deals do not expose a stable LabWare/CeCo or Company identity property, and name inference from Deal titles is unsafe.

Use the published owner queue to validate associations. Any future association backfill must be a separate manifest with Deal ID, proposed Company ID, evidence, confidence, reviewer and rollback pair.

### S5 — KPI publication gates

Create official reports only when the eligible Deal cohort has:

- at least 95% primary Company association coverage;
- at least 95% `segmento_de_mercado_anam` coverage among associated Companies;
- at least 95% `region_de_chile` coverage among associated Companies;
- an explicit period, close-date contract, exact `Ganado` outcome and company-currency amount caveat.

Planned reports:

1. won current Deal value by detailed ANAM market segment;
2. won current Deal value by strategic sector;
3. won current Deal value by Company headquarters region;
4. won Deal count by execution `zona`, explicitly non-additive across multi-region Deals;
5. coverage cards for Company association, segment and region beside the business charts.

### Interim diagnostic charts executed

With explicit operator approval, the following reversible reports were created in `Dashboard de Crecimiento`
`19708354`. They are historical diagnostics over the currently covered population, not official KPIs.

| Report | ID | Exact contract | Runtime readback |
|---|---:|---|---|
| `Valor comercial ganado por segmento de mercado — histórico parcial` | `340896790` | Deals + Companies; `Resultado comercial reportable ANAM = Ganado`; Company `Segmento de mercado` known; sum of `Valor en la divisa de la empresa`; horizontal bars | 14 segments; 92 won Deals in the governed segment/HQ-region cohort; total CLF `41,830.35` |
| `Valor comercial ganado por sector estratégico — histórico parcial` | `340897291` | Deals + Companies; `Resultado comercial reportable ANAM = Ganado`; Company `Sector estratégico` known; sum of `Valor en la divisa de la empresa`; horizontal bars | 2 sectors; 12 won Deals; total CLF `34,204.13`: Sanitarias `33,994.10`, Energía `210.03` |
| `Valor comercial ganado por región de sede — histórico parcial` | `340897635` | Deals + Companies; `Resultado comercial reportable ANAM = Ganado`; Company `Región de Chile` known; sum of `Valor en la divisa de la empresa`; horizontal bars | 12 HQ regions; 92 won Deals; total CLF `41,830.35` |

The segment chart reconciles across 14 populated categories; the region chart reconciles across 12 populated
HQ regions. The sector chart is narrower because only 12 won Deals currently inherit a governed strategic sector.
The CLF measure is Deal commercial value in Company currency. It must not be relabelled as invoiced revenue,
recognized revenue, TAM/SAM penetration or a complete sales population. Deal `zona` was deliberately excluded
from amount aggregation because it is execution geography and multi-select.

Rollback: remove the three reports from dashboard `19708354` and delete the report assets. No CRM record,
property, association, workflow or existing report was modified to create these charts.

### S6 — Market penetration

Do not repeat TAM/SAM values on every Company or Deal. The workbook is a configuration source, not a migration table.

Before implementing penetration, ANAM must approve:

- one value model: ranges or point estimates;
- TAM and SAM per canonical strategic sector;
- currency and conversion convention;
- as-of date and source owner;
- whether penetration uses awarded Deal value, invoiced revenue or another governed measure.

The current recommended numerator is closed-won current Deal value with explicit caveat. Invoiced-revenue penetration remains blocked until Billing Event is approved and operational.

## Remaining approval requests

Separate approval is required for each item:

Items 1–3 were approved by the operator and executed with the evidence above. Still separate:

1. approve or reject `Consultoras -> Servicios asociados` and the treatment of the other detailed labels;
2. choose the authoritative TAM/SAM version and numerator contract;
3. approve any later Deal-to-Company association manifest separately;
4. approve any duplicate-Company remediation separately.

Approval of one item does not imply approval of the others.
