# ANAM Commercial Catalog Dry Run

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Mode:** read-only line-item inventory
> **Status:** proposed catalog seed; no Product, line-item or Service writes

## Purpose

Use ANAM's existing line-item history to seed a governed Product Library and the Deal -> line item -> Service conversion. This avoids designing service categories from scratch.

## Baseline

- 506 line items;
- 501 associated to a Deal;
- 0 associated to Service;
- 0 associated to the ten existing Quotes;
- 20 normalized exact names after trimming whitespace;
- 8 line items with recurrence frequency;
- 6 line items with billing start/end dates;
- all 506 carry name, quantity, price, amount, TCV, ACV and currency.

The catalog exists implicitly, but recurrence, term and Service lineage are not operationally captured.

## Proposed seed

| Existing line-item name | Count | Proposed business line | Confidence | Decision |
|---|---:|---|---|---|
| M&A - Integral | 331 | Muestreo y Análisis de Laboratorio | High | Seed product; define what `Integral` includes before Service subtyping. |
| Estudio de Impacto Odorante | 40 | Diagnóstico y Control de Olores | High | Normalize under D&CO naming. |
| FIC - Contrastación Banco Pruebas | 21 | Flujo, Instrumentación y Control | High | Seed product. |
| DyCO - Olfatometría dinámica | 17 | Diagnóstico y Control de Olores | High | Normalize prefix to approved `D&CO` or a stable internal code. |
| DyCO - Paneles Sensoriales | 15 | Diagnóstico y Control de Olores | High | Seed product. |
| DyCO - Medición de Gases | 15 | Diagnóstico y Control de Olores | High | Seed product. |
| FIC - Telemetría simple | 14 | Flujo, Instrumentación y Control | High | Seed product. |
| FIC - Otros | 13 | Flujo, Instrumentación y Control | Low | Keep as legacy catch-all; do not use for new quoting without subtype review. |
| FIC - Contrastación Terreno | 10 | Flujo, Instrumentación y Control | High | Seed product. |
| DyCO - Otros | 10 | Diagnóstico y Control de Olores | Low | Keep as legacy catch-all; route new cases to catalog review. |
| M&A - Sólidos - Muestreo y Análisis | 6 | Muestreo y Análisis de Laboratorio | High | Seed product with medium `Sólidos`. |
| DyCO - Modelación dinámica | 3 | Diagnóstico y Control de Olores | High | Seed product. |
| Venta de instrumentación | 2 | Flujo, Instrumentación y Control | High | Seed product; classify as equipment sale versus recurring Service. |
| Monitoreo Integral Minero | 2 | Pending ratification | Medium | Likely M&A or Outsourcing; business owner must choose. |
| M&A - Aguas - Muestreo, Medición y Análisis | 2 | Muestreo y Análisis de Laboratorio | High | Seed product with medium `Aguas`. |
| Plan de Gestión de Olores | 1 | Diagnóstico y Control de Olores | High | Seed product. |
| M&A - Otros | 1 | Muestreo y Análisis de Laboratorio | Low | Legacy catch-all only. |
| FIC - Telemetría DGA | 1 | Flujo, Instrumentación y Control | High | Seed product. |
| DyCO - Encuesta NCh 3387 | 1 | Diagnóstico y Control de Olores | High | Seed product. |
| Aguas | 1 | Muestreo y Análisis de Laboratorio | Medium | Migrate to the approved Aguas product or quarantine. |

No current line-item name maps explicitly to `Capacitaciones y Auditorías`. `Outsourcing Operativo de Laboratorios` may be hidden inside `M&A - Integral` or `Monitoreo Integral Minero`; do not infer it without ANAM validation.

## Product contract

Each approved Product should carry or reuse:

| Fact | Target |
|---|---|
| Product name | Native `name`; stable approved label. |
| SKU | Native `hs_sku`; proposed stable code such as `ANAM-MA-AGUAS`, not derived from mutable labels. |
| Business line | Product custom select only if Product schema provisioning is approved; otherwise governed mapping in Kortex/import manifest. |
| Service family/medium | Product custom select or governed mapping after Aguas/Sólidos and other families are ratified. |
| Description | Native description with commercial scope boundary, not technical intake answers. |
| Default price | Native price only when a stable list price exists; otherwise leave blank and price on line item. |
| Recurrence | Native recurring billing period/frequency where applicable. |
| Active/legacy state | Governed active flag/status; catch-all `Otros` remains legacy. |

Product is the reusable catalog definition. Line item is the quoted instance with quantity, price, frequency and term. Service is the awarded instance with dates, owner, status, renewal eligibility and lineage.

## Technical quotation grain

Do not turn the service catalog into hundreds of products for every parameter combination. Product identifies the commercial service family. Repeated quotation scope such as sampling points, matrices, parameters and frequencies belongs to:

- line-item properties when one value applies to that component;
- an approved quote-scope child grain when multiple repeated combinations must be preserved;
- the Customer Agent/form intake payload before commercial validation.

This is especially important for Aguas and Sólidos, whose quotation questions vary by sample count, matrix, parameters, sampling responsibility, location, frequency and timing.

## Migration dry run

1. Ratify the two ambiguous mappings and the naming prefix `DyCO` versus `D&CO`.
2. Approve stable SKU/internal codes and identify which products are recurring/renewable.
3. Resolve Product Library OAuth read access and inventory any existing Products before creation.
4. Create or reconcile Products through a Kortex release candidate; do not bulk-create directly from this table.
5. Map 506 historical line items by normalized exact name to approved Product IDs.
6. Quarantine catch-all/ambiguous items rather than assigning false precision.
7. For won Deals, dry-run one Service per eligible awarded line item and report conflicts before writes.

## Acceptance evidence

Before catalog publication:

- 100% of line-item value is mapped or explicitly quarantined;
- no normalized name maps to multiple active Products;
- each renewable Product defines recurrence/term expectations;
- business-line and Service-family labels are approved by Commercial and Service & Contracts;
- Product scope access, release-candidate rollback and API readback pass.
