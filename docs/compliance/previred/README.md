# Previred Compliance Export Evidence

Validated: 2026-05-10

Official source: https://www.previred.com/documents/80476/80730/FormatoLargoVariablePorSeparador.pdf

Source SHA-256: `32cdb7416793b83129b4f2888acfd4f1c3384423587a1aaa4942ff31cfc61a0b`

Canonical Greenhouse spec version: `previred-formato-largo-variable-separador-v58-2022-04`

Runtime contract:

- Previred is a compliance projection over closed payroll entries, not a payroll calculator.
- Format variant is `Formato Estandar Largo Variable, por Separador`, version 58, April 2022.
- Separator is semicolon (`;`); V1 emits plain ASCII-compatible text.
- Greenhouse V1 includes Chile dependent internal employees only.
- Previred totals must match `calculatePreviredEntryBreakdown` over the seven canonical payroll columns.
- Worker legal codes that Previred requires but payroll does not calculate live in
  `greenhouse_payroll.chile_previred_worker_profiles`, keyed by Person 360
  `identity_profile_id`.
- The generator must fail closed when `sex_code`, `nationality_code` or a required
  health institution code is missing. It must never infer sex from names nor infer
  nationality from `CL_RUT`.
- `TASK-707a` remains required before claiming full parity with `payment_order` social_security.

Mandatory worker profile fields:

| Field | Previred source | Allowed values | Notes |
| --- | --- | --- | --- |
| `sex_code` | Tabla N°1 | `M`, `F` | Explicit HR/legal declaration only. |
| `nationality_code` | Tabla N°2 | `0`, `1` | `0` Chileno, `1` Extranjero. |
| `health_institution_code` | Tabla N°16 | `00`, `01`, `02`, `03`, `04`, `05`, `07`, `10`, `11`, `12`, `25` | `07` Fonasa; `00` only when there is no Isapre contribution. |
