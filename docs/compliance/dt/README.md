# Direccion del Trabajo LRE Export Evidence

Validated: 2026-05-10

Official sources:

- LRE portal description: https://www.dt.gob.cl/portal/1628/w3-article-119853.html
- Carga masiva manual: https://static-content.api.dirtrab.cl/dt-docs/lre/lre_instrucciones_de_carga.pdf

Manual SHA-256: `3f55043371ed0faab2b48e486f1d18c4417088c3116e54fb4ed22a8d79a35b22`

Canonical Greenhouse spec version: `dt-lre-instrucciones-carga-masiva-pdf-2021`

Runtime contract:

- LRE is a compliance projection over closed payroll entries, not a payroll calculator.
- V1 emits semicolon-delimited CSV with headers and ASCII-compatible labels.
- Greenhouse V1 includes Chile dependent internal employees only.
- Totals are copied from `greenhouse_payroll.payroll_entries`; no LRE route recalculates payroll.
- Upload and validation inside DT remain manual/operator-owned for V1.

