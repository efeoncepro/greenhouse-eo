# TASK-936 — Reconciler MATCH-not-CREATE + dedup retroactivo de gastos de banco

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto` (corrige doble conteo en P&L)
- Effort: `Medio-Alto`
- Type: `bugfix|data`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop` (override operador 2026-05-25: sin branch, igual que TASK-929/934/935)
- Session start: 2026-05-25
- Supersedes scope of: draft original "anchor-at-creation"

## Audit recalibration 2026-05-25 (FASE 2 — premise corregida)

Discovery reveló que **la premisa original de la task era falsa**. Correcciones canónicas:

1. **NO existe un "bank reconciler productivo" que cree duplicados.** Verificado: `EXP-RECON-*` se genera SOLO en `src/lib/finance/payment-instruments/anchored-payments.ts:236`; su único caller es el seed/backfill one-time `scripts/finance/conciliate-march-april-2026.ts` (TASK-702, cartolas reales mar/abr). `auto-match.ts`/`postgres-reconciliation.ts` NO hacen `INSERT INTO expenses` (solo MATCH). 0 API routes / 0 reactive consumers crean EXP-RECON.
2. **→ Slice 2 (reconciler MATCH-not-CREATE) = DROPPED (moot).** No hay path productivo que arreglar; construirlo es resolver un problema inexistente (YAGNI). Si en el futuro se construye un create-path en la UI de conciliación, ese nace MATCH-first (otra task).
3. **Origen real del doble conteo**: el seed modeló pagos de nómina como `supplier_payment`/`bank_fee` porque los `payroll_entries` no estaban linkeados al correr el backfill (comentarios del propio script: líneas 183/189/190). Es data histórica de UN run, **no recurrente**.
4. **Urgencia real: BAJA** (no "P1 creciente" como se dijo antes). ~CLP 3-4M de doble conteo histórico, sin sangrado activo.
5. **Período status** (verificado): `santander-clp 2026-03` = **reconciled (cerrado)**; `global66-clp 2026-04` y `santander-corp-clp 2026-04` = **open**. La mayoría del cleanup toca períodos ABIERTOS (sin restatement). Solo Valentina (595.656, Mar 6) y Humberly (300k, Mar 2) tocan el cerrado.
6. **No todo "pago a persona" es duplicado**: Humberly no tenía payroll en marzo (su 1ª nómina es abril) → su transfer de marzo no duplica nada → es caso aparte (advance/sin obligación), NO dismiss-as-duplicate.

**Scope corregido**: corrección one-time de un backfill (no fix de código productivo). Per-bucket, **match propuesto + gate humano** (no auto-apply de re-linkeo de dinero real), dry-run first, supersede-not-delete, helpers canónicos. Detalle abajo (sección "Plan corregido").

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

### Slice 2 — Reconciler MATCH-not-CREATE — ~~prospectivo~~ **DROPPED (moot)**

**No se implementa.** Verificado en Audit: no hay path productivo que cree `EXP-RECON` (solo el seed one-time). Construir un matcher prospectivo para un path inexistente = YAGNI. Si en el futuro se crea un create-path en la UI de conciliación, nace MATCH-first como task propia.

## Plan corregido (2026-05-25) — corrección one-time, dry-run + gate humano

**Etapa 1 — Tooling dry-run (no mutativo, seguro de correr):**
Script idempotente `scripts/finance/fix-reconciliation-double-count-mar-apr-2026.ts` con `--dry-run` default. Clasifica cada uno de los 37 unanchored paid en [A]/[B]/[C]/[D] y, para [A], **propone** el match a la `Nomina neta` correspondiente (por member + mes-de-pago, considerando el offset pago-mes vs nómina-mes) con el delta FX que resultaría. NO escribe. Imprime: bucket, monto, período (open/closed), y para [A] la nómina candidata + si tiene match o no (Humberly mar sin payroll → flag "sin obligación").

**Etapa 2 — Gate humano (checkpoint):**
Presentar el dry-run. El operador confirma los matches [A] (re-linkeo de dinero real) y autoriza explícitamente los items de período cerrado (`santander-clp 2026-03`: Valentina). Sin esa confirmación, NO se aplica.

**Etapa 3 — Apply (`--apply`, tras gate):** por bucket, helpers canónicos, supersede-not-delete, idempotente, per-row try/catch:

- [A] match confirmado: `dismissExpensePhantom` del duplicado + `recordExpensePayment` contra la nómina (computa `fx_gain_loss_clp` solo). Rematerializar `account_balances` + verificar closing vs cartola.
- [A] sin obligación (Humberly mar): NO dismiss → dejar para decisión (advance/loan/acknowledge), fuera de este apply.
- [B] FX: reclasificar a FX P&L / economic_category.
- [C] vendor real: anclar `supplier_id` (name-first) / `tool_catalog_id`. No borra.
- [D] test residue: dismiss.
- Outbox + audit por mutación. Reason ≥ 10 chars.

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

- Dry-run lista clasificación + montos + período (open/closed) + match candidato [A] antes de aplicar.
- Post-apply: `finance.ledger.unresolved_drift_items` baja; doble conteo [A] eliminado; `pnpm pg:doctor`.
- Validar P&L del mes: el costo de cada persona/vendor aparece **una sola vez**.
- account_balances rematerializado y closing ≈ cartola (ground truth) por cuenta tocada.
