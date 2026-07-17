# ANAM Billing Event Migration Dry-Run

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Mode:** read-only matching and capacity analysis
> **Writes:** none

## Executive result

The 16,898-row billing ledger can fit comfortably in a HubSpot custom object, but it cannot yet be safely associated end to end.

- Custom-object record capacity: 500,000; current usage: 0.
- Historical ledger: 16,898 unique source IDs, approximately 3.38% of current custom-object capacity.
- Deterministic Company match at row level: 4,008/16,898, or 23.7%.
- Deterministic Company match at source-account-group level: 296/1,510, or 19.6%.
- Heuristic Deal match at row level: 3,168/16,898, or 18.7%; this is not safe for automatic association without a structured quotation key.

The correct next step is identity remediation and a staged migration, not record creation.

## Sources

- `Ticket facturación_010726.xlsx`, attached by Maria Paz Haeger on 2026-07-01.
- Live Company and Deal reads through the authenticated `anam-19893546` CLI profile.
- HubSpot account details and Limits Tracking API.
- Kortex control-plane runtime snapshot captured at `2026-07-16T09:56:02Z`.

## Source ledger profile

| Dimension | Count |
|---|---:|
| Rows / unique source IDs | 16,898 |
| Unique RUT strings | 1,258 |
| Unique Company titles | 1,725 |
| Unique ANAM codes | 1,509 |
| Unique quotation/EDP strings | 7,706 |
| Unique OC strings | 10,572 |

The source has one nearly complete row per operational billing item. Company title and RUT are insufficient as universal identity because names drift and operating units may share a legal RUT. Código ANAM is the strongest missing CRM key candidate, subject to ANAM confirming its cardinality and lifecycle.

## HubSpot readiness

### Company

| Fact | Result |
|---|---:|
| Companies | 1,023 |
| Company name populated | 1,022 |
| `rut` populated | 18 |
| `razon_social` populated | 2 |
| Companies with at least one Deal association | 298 |
| Existing Código ANAM property | None detected |

Only 1.8% of Companies have RUT. The current `rut` property is not unique. The API returns both labeled and unlabeled association rows for the same underlying Company/Deal pair; match calculations deduplicated by object ID.

### Deal

| Fact | Result |
|---|---:|
| Deals | 1,240 |
| Amount populated | 1,239 |
| Currency populated | 1,239 |
| Currency value | CLF for all populated Deals |
| `monto_original` populated | 3 |
| Deals with Company association | 595 |
| Deals with line items | 0 |
| Structured quotation/EDP property | None detected |

Deal amount is currently a commercial CLF/UF fact. It is not an invoiced-value fact and cannot be compared directly with mixed CLP/UF/USD billing rows without a dated normalization contract.

### Service and custom objects

- Standard Service is active but has only one sample-like record and no accepted production dictionary.
- No custom objects currently exist.
- HubSpot Limits Tracking reports custom-object capacity 500,000 and usage 0.
- Kortex OAuth has relevant custom-object, Service, Invoice and line-item scopes; the limited CLI PAK does not.

## Company matching dry-run

Matching order used for analysis:

1. exact normalized RUT when it identifies one HubSpot Company;
2. exact normalized Company name/razón social when RUT does not match;
3. no fuzzy association writes.

### Row-level result

| Result | Rows |
|---|---:|
| Unique RUT match | 2,734 |
| Unique exact-name match | 1,274 |
| Ambiguous exact-name match | 72 |
| Ambiguous RUT match | 1 |
| Unmatched | 12,817 |
| **Deterministic total** | **4,008 (23.7%)** |

### Source-account-group result

Rows were grouped by Código ANAM, falling back to normalized RUT + name only when code was absent.

| Result | Source account groups |
|---|---:|
| Unique RUT match | 81 |
| Unique exact-name match | 215 |
| Ambiguous exact-name match | 9 |
| Unmatched | 1,139 |
| Mixed/inconsistent identity within group | 66 |
| **Deterministic total** | **296/1,510 (19.6%)** |

The 66 mixed groups need source review before a persistent mapping is accepted.

## Deal matching dry-run

The source quotation/EDP string was compared with numeric tokens appearing in Deal names. This is diagnostic only.

### Row-level heuristic

| Result | Rows |
|---|---:|
| No usable numeric token | 1,911 |
| No Deal candidate | 9,604 |
| One numeric-token candidate | 3,156 |
| One candidate after Company narrowing | 12 |
| Multiple candidates with no consistent Company narrowing | 2,215 |
| **Heuristic unique total** | **3,168 (18.7%)** |

### Unique quotation/EDP strings

| Result | References |
|---|---:|
| No usable token | 351 |
| No candidate | 5,079 |
| One numeric-token candidate | 1,315 |
| One candidate after Company narrowing | 10 |
| Conflicting/ambiguous | 951 |

Numeric coincidence is not sufficient for production association. Deal needs a normalized quotation ID and version, populated and reconciled before Billing Events are linked automatically.

## Data-quality blocks

1. Company RUT and legal-name coverage is too low.
2. Código ANAM does not exist as a governed Company/unit identity in HubSpot.
3. 645 Deals have no Company association.
4. Deal has no structured quotation/EDP key and no line-item adoption.
5. Service has no production population or stable external key.
6. Billing contains probable UF and USD amount/currency outliers.
7. Source LIMS and some reference fields contain multiple IDs in one cell.
8. Refacturation and future credit-note/cancellation semantics are undefined.

## Proposed remediation gates

### Gate 1: Company identity

- approve Código ANAM cardinality and ownership;
- add a governed external account/unit key if appropriate;
- normalize RUT without declaring it universal uniqueness;
- produce persistent aliases/mappings for source titles;
- resolve the 66 inconsistent source-account groups.

Acceptance target before monetary associations: 95% of source amount, not only row count, matched to a reviewed Company; unresolved value is separately visible.

### Gate 2: Deal and quotation identity

- add normalized quotation ID and version;
- backfill from authoritative commercial sources;
- associate all eligible Deals to Company;
- distinguish quoted and awarded amount;
- introduce line items for forward-looking service components.

### Gate 3: Service lineage

- approve Service grain and unique external key;
- create Services from won Deals/awarded lines;
- associate Company and originating Deal;
- populate term, owner, currency, periodicity and comparable amount.

### Gate 4: Billing staging

- create Billing Event schema only after the ADR is accepted;
- load by unique source key with workflows disabled;
- quarantine blank currency and known amount outliers;
- associate only deterministic matches;
- reconcile source rows and amounts by status/currency/period.

### Gate 5: Cutover

- two monthly close cycles in shadow mode;
- 100% unique source-key reconciliation;
- 100% amount reconciliation by original currency after documented exclusions;
- approved unmatched-value threshold and queue owner;
- rollback snapshot and final delta procedure;
- no manual dual entry after cutover.

## Capacity and API boundary

- 16,898 records consume about 3.38% of current custom-object record capacity.
- Backfill should use batch upsert by unique `source_key`, not row-by-row creates.
- The current CLI PAK lacks custom-object, Service, Ticket and Invoice scopes. Kortex OAuth has broader scopes, but no arbitrary write should be executed until a governed command/adapter or dedicated integration credential is approved.
- CRM Search has query-result limits; migration verification must use batch reads, source-key partitions and independent reconciliation totals.

## Outcome

`NO-GO` for immediate import or association writes.

`GO` for:

- accepting/revising the proposed ADR;
- Company/quotation/Service data dictionary design;
- source mapping and exception-queue preparation;
- a custom-object schema preview/change set;
- obtaining the live SharePoint/List access needed for incremental sync design.
