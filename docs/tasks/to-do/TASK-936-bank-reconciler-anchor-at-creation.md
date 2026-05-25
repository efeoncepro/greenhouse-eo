# TASK-936 — Reconciler MATCH-not-CREATE + dedup retroactivo de gastos de banco

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto` (corrige doble conteo en P&L)
- Effort: `Medio-Alto`
- Type: `bugfix|data`
- Domain: `finance`
- Blocked by: `none`
- Supersedes scope of: draft original "anchor-at-creation"

## Summary

El bank reconciler, al ver un giro bancario que **paga una obligación ya contabilizada** (nómina neta, factura de proveedor), en vez de registrarlo como **pago** de ese gasto (`expense_payments` → flip a `paid` + rebaja banco), **acuña un gasto nuevo** `EXP-RECON-*` tipo `supplier` sin ancla. Resultado: **doble conteo en el P&L** — el mismo costo aparece dos veces (la obligación devengada + el "gasto" del giro).

Detectado live (2026-05-25, validación de TASK-929/934): de 37 unanchored paid expenses, una parte son **duplicados** de nómina ya booked; otra parte son **vendors reales sin `supplier_id`**; otra es **FX legítimo mis-clasificado**; y hay **residuo de test e2e**.

Esta task hace dos cosas: **(1) dedup retroactivo** de los 37 ya creados, y **(2) corrige la causa raíz prospectiva** — el reconciler debe **MATCH, no CREATE**.

## Why This Task Exists

TASK-929 detectó los 37 unanchored. TASK-934 dio `acknowledge` — pero `acknowledge` **NO aplica a duplicados**: congelaría el doble conteo como deuda aceptada (lo enmascararía). El control de duplicación (lente finance, Pattern A) exige: *nunca clasificar/aceptar un gasto sin confirmar que no está ya representado*. La verificación reveló que el problema raíz es doble conteo + resolución de proveedor ausente, no "falta de ancla" genérica.

## Root cause

`src/lib/finance/postgres-reconciliation.ts` (matchability/auto-match): cuando un movimiento bancario de **egreso** no encuentra un `expense_payments` candidato, crea un `expense` nuevo (`source_type=reconciliation`, `expense_type='supplier'` default, sin `supplier_id`/`member_id`/`payroll_entry_id`). Debería, en cambio, intentar **matchear el egreso a una obligación existente** y registrarlo como su pago. Solo si no hay obligación candidata con confianza, dejarlo unanchored explícito (lo maneja el inventory/acknowledge de TASK-934).

## Buckets observados (37 unanchored paid) y tratamiento canónico

| Bucket | Señal | # aprox | Tratamiento |
|---|---|---|---|
| **[A] Duplicado de nómina** | "Envío a `<nombre>`" o "Transf.Internet a `<RUT de member>`" cuyo monto+fecha matchea una `Nomina neta` (`payroll_entry_id`) ya booked | ~7 | **dismiss/supersede** el `EXP-RECON-*` + registrar el egreso como **pago** del gasto de nómina (`expense_payments` → flip a `paid`, rebaja banco). NUNCA anclar a payroll como gasto nuevo (= 2º gasto de nómina). |
| **[B] FX legítimo** | "Costo tipo de cambio (`<persona>`)" | 4 | reclasificar a FX P&L (TASK-699) / `economic_category`; **no** es duplicado, **no** es supplier. |
| **[C] Vendor real sin `supplier_id`** | nombre de vendor (mayoría **internacional sin RUT**: Adobe, Vercel, Notion, ElevenLabs, Metricool, Envato, GitHub, Google Workspace, Nubox) o RUT doméstico (Beeconta `77.805.887-1`) | ~22 | anclar a `supplier_id` (o `tool_catalog_id` si es herramienta SaaS/AI) **por nombre**; Previred → social_security; "COM.MANTENCION" → bank_fee. **No es doble conteo** — gasto real, solo le falta el ancla. |
| **[D] Residuo de test e2e** | "test-e2e-…" (ej. "Asesoría/Interés factoring Nº test-e2e-2 — Xepelin") | 2 | dismiss (data de prueba). |

Solo **[A]** y **[D]** son filas a eliminar (dismiss). **[B]** se reclasifica. **[C]** se ancla (no se borra).

## Anchor resolution model (corregido — NAME-FIRST, sin asumir RUT)

**Crítico**: la mayoría de los pagos son a **proveedores internacionales sin RUT chileno**. La resolución NO puede ser RUT-primary. Cascada canónica:

1. **Pago a persona/member** → si el RUT del giro matchea un `members` activo, o el monto+fecha matchea una `Nomina neta` con `payroll_entry_id` → es **pago de nómina** (bucket [A]). No es proveedor.
2. **Vendor por nombre** (primario) → match `trade_name`/`legal_name` en `greenhouse_finance.suppliers` (que ya tiene `is_international` bool, `tax_id` **nullable**, `tax_id_type`, `country_code`). Internacionales resuelven solo por nombre.
3. **Herramienta SaaS/AI** (Adobe, Vercel, Notion, ElevenLabs, Metricool, Envato, GitHub) → `tool_catalog_id` por nombre (catálogo de tools, TASK-712), no `supplier_id`.
4. **RUT solo cuando existe y es doméstico** (Beeconta) → desempate/confirmación, nunca como llave única.
5. **Regulatorio** ("PREVIRED") → social_security / economic_category.
6. **Fee bancario** ("COM.MANTENCION PLAN") → economic_category bank_fee.
7. Sin match con confianza → unanchored explícito (TASK-934 inventory/acknowledge lo cubre — **solo para genuinos sin contraparte**, no duplicados).

## Scope

### Slice 1 — Dedup retroactivo (los 37 existentes)

- Script idempotente (dry-run primero) que clasifica cada unanchored paid en [A]/[B]/[C]/[D] y aplica:
  - [A]: `dismiss-phantom` del `EXP-RECON-*` + `recordExpensePayment` contra la `Nomina neta` correspondiente (link-as-payment, rebaja banco). Verificar que NO restatea períodos cerrados: si la nómina está en período `reconciled`, el pago se registra sin alterar el devengo del período cerrado (el banco ya reflejó el egreso; aquí se corrige la representación, no el monto del cierre). Documentar el efecto en `account_balances`.
  - [B]: reclasificar a FX P&L / economic_category.
  - [C]: resolver supplier/tool por nombre y anclar (`supplier_id`/`tool_catalog_id`). No borra.
  - [D]: dismiss (test residue).
- Outbox + audit por cada mutación. Reason ≥ 10 chars.

### Slice 2 — Reconciler MATCH-not-CREATE (causa raíz prospectiva)

- En el punto de creación (`postgres-reconciliation.ts`), antes de crear un `expense` desde un egreso bancario: intentar matchear a una obligación existente (`expenses` unpaid con monto≈ + fecha cercana + contraparte) y registrar como pago.
- Resolución de contraparte name-first (cascada de arriba).
- Si no hay match con confianza → crear unanchored explícito (no inventar ancla) → inventory de TASK-934.
- Tests: egreso que paga nómina existente → match (no nuevo gasto); egreso de vendor internacional nuevo → crea gasto anclado por nombre; egreso sin match → unanchored explícito.

## Out of Scope

- Restatear el **monto** de períodos cerrados. Slice 1 corrige la *representación* (dismiss duplicado + link pago), no el costo del cierre. Si un cierre cuenta el duplicado en su total, eso es una corrección de cierre separada — documentar, no auto-ejecutar.
- Crear el catálogo de tools si no existe (TASK-712). Si `tool_catalog_id` no es resoluble aún, anclar como `supplier` internacional por nombre como fallback.

## Hard rules

- **NUNCA** anclar un duplicado [A] como gasto de nómina nuevo → sería 2º gasto = sigue duplicado. Es **pago** de la nómina existente + dismiss del duplicado.
- **NUNCA** `acknowledge` (TASK-934) sobre un duplicado. Acknowledge es solo para unanchored **genuinos sin contraparte**.
- **NUNCA** resolver proveedor por RUT como llave única. Name-first; muchos son internacionales sin RUT.
- **NUNCA** borrar [C] (vendors reales) — solo anclar.
- **NUNCA** restatear el monto de un período `reconciled`. Corregir representación ≠ alterar cierre.

## Verification

- Dry-run del Slice 1 lista clasificación + montos antes de aplicar.
- Post-apply: `finance.ledger.unresolved_drift_items` baja; doble conteo eliminado; `pnpm pg:doctor`.
- Slice 2: tests focales del reconciler (match nómina, vendor internacional, no-match→unanchored).
- Validar P&L del mes: el costo de cada persona/vendor aparece **una sola vez**.
