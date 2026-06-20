# TASK-1208 — Vocabulario contable canónico (factura/AR vs caja) + de-conflación del copy "Ingresos"

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `copy`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1208-accounting-vocabulary-glossary-income-copy-deconflation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La tabla `greenhouse_finance.income` se llama "income" (ingreso) pero **es la factura / cuenta por cobrar (AR, devengado)** — la propia doc de columnas la llama "the receivable" / "the invoice". El verdadero ingreso de caja es el **cobro** (`income_payments` → banco). Esta task NO renombra el símbolo físico (puerta de un solo sentido, blast radius enorme); fija un **glosario/ADR de vocabulario contable** canónico (devengado vs percibido) y **de-conflaciona el copy visible**: corregir donde la UI dice "Ingresos" etiquetando facturas/AR, reservando "Ingresos/Cobros" para movimientos de caja/banco.

## Why This Task Exists

Surgió de una confusión real del contador (2026-06-20): vio el IVA neto de una factura y no entendía por qué no era el total del F29; la raíz es semántica. El repo **separa bien la estructura** (devengado: `income`/`expenses`; percibido: `income_payments`/`expense_payments`/`account_balances`), pero el **naming `income` es deuda**: nombra "ingreso" a lo que es una factura por cobrar. Una fila `income` con `amount_paid=0` es revenue reconocido sin cobrar (IFRS 15 §31), no plata en el banco. Esto confunde a humanos y a Nexa, y rompe la cadena commercial booking→billing→collection que RevOps necesita separada (DSO, NRR/ARR sobre devengado vs cobranza sobre caja).

**Decisión de los 3 lentes (finanzas/arquitectura/commercial):** arreglar la **capa semántica**, no el símbolo físico. El rename físico de `income` queda explícitamente fuera (follow-up gobernado opcional).

## Goal

- Glosario/ADR canónico de vocabulario contable: `income` = factura / cuenta por cobrar (devengado); `income_payments` = cobro (ingreso de caja); `expenses` = factura de compra / por pagar; `expense_payments` = pago (egreso); plano devengado vs plano percibido (caja/banco).
- Auditar las ~13 superficies finance con "Ingresos" y **clasificar por plano**: caja (correcto, se mantiene) vs devengado/factura (mal etiquetado, se corrige a "Facturas / Por cobrar").
- Corregir el copy mal etiquetado, tokenizado en `src/lib/copy/*`, validado con `greenhouse-ux-writing`.
- Dejar el glosario consumible por Nexa/agentes para que no vuelvan a confundir factura con caja.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (modelo income/expenses + payments + account_balances)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `DESIGN.md` + reglas de copy (`src/lib/copy/*`, TASK-265)

Reglas obligatorias:

- **NUNCA** renombrar el símbolo físico `greenhouse_finance.income` ni columnas en esta task (puerta de un solo sentido; blast radius en F29, marts BQ, sync Nubox/HubSpot, lint `no-untokenized-fx-math`). El fix es semántico/presentación.
- **NUNCA** reemplazar "Ingresos" en bloque: en superficies de **caja** (`CashInListView`, `BankView`, `CashPositionView`, account drawer de movimientos) "Ingresos/Cobros" es **correcto**; solo se corrige en superficies de **devengado/factura** (`IncomeListView`, `IncomeDetailView`, dashboard donde "Ingresos" rotula el objeto AR).
- **SIEMPRE** clasificar cada string por plano (devengado vs percibido) antes de tocarla; documentar la clasificación.
- **SIEMPRE** copy es-CL tokenizado en `src/lib/copy/*` (validar con `greenhouse-ux-writing`); reusar/extender, no duplicar.
- Precedente canónico: TASK-768 NO renombró `expense_type`; agregó `economic_category` como capa semántica. Mismo playbook acá.

## Normative Docs

- `docs/documentation/finance/libro-iva-posicion-mensual.md` (ya distingue devengado del F29).
- `src/lib/copy/finance.ts`, `src/config/greenhouse-nomenclature.ts` (copy fuente).

## Dependencies & Impact

### Depends on

- Estructura existente (solo lectura): `greenhouse_finance.income` (AR), `income_payments` (cobros), `expenses` (AP), `expense_payments` (pagos), `account_balances` (banco).
- Copy actual: `src/lib/copy/finance.ts`, `src/lib/copy/agency.ts`, `src/lib/copy/nexa.ts`, `src/config/greenhouse-nomenclature.ts`.

### Blocks / Impacts

- Mejora la claridad para contador/operador y para Nexa (no confundir factura con caja).
- Habilita (opcional, futuro) un programa de rename físico gobernado `income`→`invoices` si alguna vez se decide pagar ese costo (NO en esta task).

### Files owned

- `docs/architecture/GREENHOUSE_ACCOUNTING_VOCABULARY_V1.md` (nuevo — glosario/ADR) `[verificar nombre/ubicación]`
- `src/lib/copy/finance.ts` + otras `src/lib/copy/*` con strings mal etiquetadas
- `src/config/greenhouse-nomenclature.ts` (si el label institucional aplica)
- Superficies `src/views/greenhouse/finance/*` que rotulan AR como "Ingresos"
- tests/snapshots de copy si aplican

## Current Repo State

### Already exists

- Estructura contable correcta: devengado (`income`/`expenses`) separado de caja (`income_payments`/`expense_payments`/`account_balances`).
- Copy tokenizado en `src/lib/copy/*` (TASK-265) + nomenclatura en `greenhouse-nomenclature.ts`.
- ~13 superficies finance referencian "Ingresos" (algunas correctas = caja, otras mal = AR).

### Gap

- No existe glosario/ADR que fije el vocabulario contable canónico (devengado vs percibido).
- Copy de devengado/factura mal etiquetado como "Ingresos" en algunas superficies.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Finance / contador (roles internos finance).
- Momento del flujo: lectura de facturas por cobrar vs ingresos de caja en el portal.
- Resultado perceptible esperado: las superficies de devengado dicen "Facturas / Por cobrar"; las de caja dicen "Ingresos / Cobros". Nunca se confunde factura con plata.
- Friccion que debe reducir: la ambigüedad "Ingresos" que hace creer que una factura emitida es caja.
- No-goals UX: NO renombrar tablas/columnas; NO cambiar montos ni lógica; NO tocar el plano de caja donde "Ingresos" ya es correcto.

### Surface & system decision

- Surface: superficies finance que hoy rotulan el objeto AR como "Ingresos" (lista/detalle de income, dashboard).
- Composition Shell: `no aplica` — solo cambios de copy/label.
- Primitive decision: `reuse` — no nace primitive; es copy.
- Copy source: `src/lib/copy/*` + `greenhouse-nomenclature.ts`.
- Access impact: `none`.

### State inventory

- Default: labels corregidos en superficies de devengado; caja intacta. (Los demás estados no cambian — es copy.)
- Loading/Empty/Error: textos que digan "Ingresos" para AR se ajustan; el resto no.
- Mobile / compact: los labels nuevos ("Facturas", "Por cobrar") caben sin romper layout.
- Keyboard / focus / reduced motion: N/A (sin cambio de interacción).

### Interaction contract

- Sin cambios de interacción; solo texto.

### Motion & microinteractions

- N/A — cambio de copy.

### Visual verification

- GVC scenario: capturas de las superficies tocadas (income list/detail + dashboard) mostrando los labels corregidos.
- Viewports: desktop + mobile 390px.
- Required captures: superficie de devengado con label "Facturas/Por cobrar"; superficie de caja con "Ingresos" intacto (contraste).
- Scroll-width check: `scrollWidth == clientWidth`.
- Accessibility: labels textuales claros; sin color-only.
- Before/after evidence: "Ingresos" (AR) → "Facturas/Por cobrar".

## Backend/Data Contract

**Backend impact: `none` (rationale).** Esta task **no toca runtime ni schema**: es (1) un doc normativo nuevo (glosario/ADR) y (2) cambios de copy es-CL en `src/lib/copy/*` y superficies UI. NO renombra `greenhouse_finance.income` ni columnas, NO toca readers/commands/migraciones. El símbolo físico `income` se mantiene como deuda de naming documentada (mapeo en el glosario). Si en el futuro se decide el rename físico, es una task `backend-data` separada (programa gobernado por fases con alias-view), no esta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Glosario/ADR de vocabulario contable

- `docs/architecture/GREENHOUSE_ACCOUNTING_VOCABULARY_V1.md` (o ubicación canónica): fija el mapeo objeto↔término↔plano:
  - `income` = factura emitida / cuenta por cobrar (AR) — **devengado** (IFRS 15 §31; revenue reconocido, no caja).
  - `income_payments` (+ `settlement_legs`) = cobro — **percibido** (ingreso de caja real → `account_balances`).
  - `expenses` = factura de compra / cuenta por pagar (AP) — devengado.
  - `expense_payments` = pago — percibido (egreso de caja).
  - Plano devengado (P&L/F29) vs plano percibido (cashflow/banco, IAS 7).
  - Regla de copy: "Ingresos/Egresos" solo para caja; "Facturas/Por cobrar/Por pagar" para devengado.
- Link desde `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` + `DECISIONS_INDEX.md`.

### Slice 2 — Auditoría + de-conflación del copy

- Inventario de las ~13 superficies con "Ingresos": clasificar cada una **caja (correcto, no tocar)** vs **devengado/factura (corregir)**.
- Corregir las mal etiquetadas a "Facturas / Por cobrar" (tokenizado en `src/lib/copy/*`, validado con `greenhouse-ux-writing`).
- GVC desktop+mobile de las superficies tocadas. Documentar la clasificación en el cierre. Delta arch doc + doc funcional.

## Out of Scope

- **Rename físico** de `greenhouse_finance.income` / columnas / schema / readers / API / BQ (follow-up gobernado opcional, task aparte).
- Cambios de lógica, montos, materializadores o cálculos.
- Tocar el plano de caja donde "Ingresos/Cobros" ya es correcto.
- Nomenclatura de otros dominios fuera de finance.

## Detailed Spec

Mapeo canónico (lo que fija el glosario):

```text
DEVENGADO (accrual → P&L / F29)        PERCIBIDO (cash → banco / IAS 7)
  income      = factura / por cobrar     income_payments  = cobro (ingreso de caja)
  expenses    = factura / por pagar       expense_payments = pago (egreso de caja)
                                          account_balances = saldo banco
```

Clasificación de copy (regla): toda string que rotule un objeto del plano devengado NO usa "Ingreso/Egreso"; usa "Factura / Por cobrar / Por pagar". "Ingresos/Egresos/Cobros/Pagos" se reservan para el plano caja. La auditoría aplica esta regla superficie por superficie (no global).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (glosario) → Slice 2 (copy). El copy consume la regla del glosario.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Corregir "Ingresos" donde era correcto (caja) | UI / finance | medium | clasificación por plano antes de tocar; lista explícita caja vs devengado | revisión GVC + code review |
| Romper un test de snapshot de copy | UI | low | actualizar snapshots; correr suite focal | `pnpm test` |
| Confundir a usuarios acostumbrados al label viejo | UX | low | label más preciso + mismo lugar; sin cambio de flujo | feedback operador |

### Feature flags / cutover

Sin flag. Cambio de copy + doc, additive, immediate cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (doc) | <5 min | sí |
| Slice 2 | revert PR (copy) | <5 min | sí |

### Production verification sequence

1. Local: `pnpm dev` + GVC de las superficies tocadas (devengado corregido, caja intacta).
2. Staging: deploy + revisión visual.
3. Prod: deploy + smoke visual.

### Out-of-band coordination required

N/A — cambio repo-only (doc + copy). Sin coordinación externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el glosario/ADR de vocabulario contable con el mapeo income↔factura/AR, income_payments↔cobro, devengado vs percibido (IFRS 15 / IAS 7 citados).
- [ ] Cada superficie con "Ingresos" quedó clasificada (caja = intacta; devengado/factura = corregida) y la clasificación está documentada.
- [ ] Las superficies de devengado ya no rotulan el objeto AR como "Ingresos"; usan "Facturas / Por cobrar".
- [ ] Las superficies de caja conservan "Ingresos/Cobros" (no se tocaron).
- [ ] Copy nuevo tokenizado en `src/lib/copy/*` (validado con `greenhouse-ux-writing`).
- [ ] `Backend impact: none` (no se tocó schema/tabla `income`/columnas/readers).
- [ ] GVC desktop + mobile mirado de las superficies tocadas.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm local:check:ui`
- `pnpm fe:capture` de las superficies finance tocadas (desktop + mobile)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta (link al glosario) + `DECISIONS_INDEX.md`
- [ ] doc funcional actualizado si cambia label visible (`docs/documentation/finance/`)
- [ ] evidencia GVC adjunta

## Follow-ups

- **(Opcional, grande)** Programa de rename físico gobernado `income`→`invoices`/`accounts_receivable` con alias-view + cutover por fases — solo si la confusión causa errores contables reales. Task `backend-data` aparte.
- Aplicar el mismo vocabulario al system prompt / tools de Nexa para que nunca llame "ingreso" a una factura.

## Open Questions

- Ubicación canónica del glosario: `docs/architecture/GREENHOUSE_ACCOUNTING_VOCABULARY_V1.md` (ADR-style) o `docs/documentation/finance/glosario-vocabulario-contable.md` (funcional). Resolver en Discovery según dónde lo consuman más (agentes vs operadores) — probablemente ambos con uno canónico + link.
