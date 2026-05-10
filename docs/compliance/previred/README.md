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
- `TASK-707a` remains required before claiming full parity with `payment_order` social_security.

