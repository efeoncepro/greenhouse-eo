# ANAM Deal-to-Company Association Remediation Dry Run

> **Date:** 2026-07-16
> **Portal:** HubSpot `19893546`
> **Status:** exact 34-pair high-confidence cohort approved, executed and independently read back; all other association work remains approval-gated
> **Scope:** pre-execution baseline of 645 Deals without a live Company association

## Outcome

The missing-association population cannot be repaired safely from Deal titles or fuzzy Company-name inference.
The strongest existing path is the explicit association chain `Deal -> Contact -> Company`.

| Classification | Deals | Execution status |
|---|---:|---|
| All Deal Contacts converge on exactly one explicitly associated Company | 34 | Executed as Primary after exact-table approval; 34/34 read back |
| One non-free Contact email domain maps to exactly one Company domain | 113 | Manual review only; not eligible for automatic association |
| Contacts exist but no deterministic Company identity exists | 447 | Held |
| Deal has no associated Contacts | 35 | Held |
| Contact email-domain evidence conflicts | 16 | Held |
| Total without Company | 645 | — |

None of the 34 high-confidence targets is one of the 22 Company records held under the 11 known duplicate
normalized keys. No Company was created, merged, renamed or updated.

## High-confidence cohort

The 34 candidates use only this contract:

1. the Deal currently has zero distinct Company associations;
2. it has one or more explicit Contact associations;
3. the union of those Contacts' explicit Company associations contains exactly one Company ID;
4. the Company is not part of the known duplicate-key hold cohort;
5. Deal-title, owner and fuzzy-name inference are prohibited;
6. the proposed write is a primary Deal→Company association (`HUBSPOT_DEFINED` type `5`), with post-write
   verification of both primary and unlabeled association readback.

Outcome distribution: 16 won, 7 no-award, 6 lost and 5 open.

| Owner | High-confidence candidates |
|---|---:|
| Isabel Aguilera Bruna | 12 |
| Maria Paz Haeger | 10 |
| Ricardo Miralles | 4 |
| Pablo Puga | 3 |
| Belén Robles Escalona | 2 |
| Dulia Sandoval Gallardo | 1 |
| María Cecilia Pinto Figueroa | 1 |
| María Paz Arellano Rojas | 1 |

## Why this does not yet unlock the requested KPI

Pre-execution global Deal-to-Company coverage was 595/1,240 (`47.98%`). The approved 34-pair execution produces
629/1,240 (`50.73%`), still far below the `>=95%` publication gate.

For won Deals, pre-execution coverage was 254/494 (`51.42%`). The 34-candidate cohort contains 16 won Deals, so
post-execution won coverage is 270/494 (`54.66%`). Only 11 of the 34 target Companies currently have
governed detailed segment and headquarters region, and only one has strategic sector. Seven of the 16 won
candidates have segment/region. The single current-quarter-to-date won candidate has none of the three governed
dimensions, so this write alone would not change the current-quarter sales-by-segment/sector/region result.

## Medium-confidence review queue

The 113 domain candidates are not association-ready. A shared corporate domain can represent a holding group,
subsidiary, branch, consultant or duplicate Company. Their owner distribution is:

| Owner | Domain-review candidates |
|---|---:|
| Isabel Aguilera Bruna | 45 |
| Ricardo Miralles | 36 |
| Maria Paz Haeger | 20 |
| Belén Robles Escalona | 7 |
| Carlos Venegas | 2 |
| María Paz Arellano Rojas | 2 |
| María Cecilia Pinto Figueroa | 1 |

Three belong to the current-quarter-to-date close-date cohort. They remain manual-review records and must not be
promoted by a blanket approval of the 34 explicit-association candidates.

## Evidence and rollback

Restricted evidence lives under `.tmp/anam-deal-company-remediation-2026-07-16/` with mode `0700`; files use
mode `0600` because they contain client record names and identities.

- `association-review-manifest.json`: full 645-row classification and proposed IDs; SHA-256
  `c6ed856db0466156fae2085a16bf6181bbd75dc0ca71f1701e64afbf346e1726`;
- `read-only-snapshot.json`: pre-write Deal, Contact, Company and association evidence; SHA-256
  `5242ffe57fed77fb53adad3e8dfca1fbc0ce1f032b173bd11434ef9e5e88afe9`;
- `association-review.csv`: human review queue for 34 high + 113 medium candidates; SHA-256
  `4a0d31600f2eb93042de97189d9a257b6098dd6ae1a27daecc51eafdbf133d05`.
- `high-confidence-approval-table.md`: exact 34-row confirmation table; SHA-256
  `8344db034164dbb2636c71e694a26cca868cb6842f234a2cb34bd32b0374e995`.

## Approved execution and readback

The operator separately approved the immutable 34-row table. The guarded API path failed cleanly before mutation
with `403 MISSING_SCOPES`; immediate readback confirmed zero pairs had been written. The already authenticated ANAM
UI was then used for a two-object, update-existing-only import with Company and Deal matched by Record ID and the
association label set to `Primary`. Enrichment and intent signals remained disabled.

- portal: `19893546`;
- import: `77872707`;
- imported rows: `34`;
- new records: `0` (HubSpot displays `--`);
- records updated: `61` distinct records across the two object types;
- new associations: `68` directional associations, representing the exact 34 Company↔Deal pairs;
- import errors: `0`;
- independent Deal→Company readback: `34/34`, each with exactly one distinct Company, the approved Company ID and
  `HUBSPOT_DEFINED` Primary association type `5`.

The separate post-change ledger is
`.tmp/anam-deal-company-remediation-2026-07-16/association-ui-import-readback-ledger.json`, SHA-256
`a3552964106bad6b4901fe6be9be7812e726763b54cb8c1792ae5aae9f1bbc3c`. It does not overwrite the approved manifest,
pre-change snapshot or clean API-failure ledger. Rollback removes only these exact 34 pairs; it deletes no record.

## Approval boundary

Separate decisions remain:

1. assign human reviewers for the 113 domain candidates;
2. choose whether the remaining remediation program prioritizes all history, won Deals, current-quarter Deals or an
   owner-by-owner operational queue;
3. approve any later association pairs produced by manual review separately.

The completed 34-pair approval did not authorize domain-based matches, Company merges, new Companies,
record-property backfills or official KPI publication.
