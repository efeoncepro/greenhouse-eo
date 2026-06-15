# TASK-1145 — Nexa "Mi espacio": prompt de "recibo de pago disponible"

<!-- Revisada con greenhouse-payroll-auditor + arch-architect (Greenhouse overlay) antes de crearse. -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `complete`
- Rank: `TBD`
- Domain: `nexa|platform|ai|hr|payroll|ui`
- Blocked by: `none` (TASK-1141 registry + resolver `personal` en `develop`)
- Branch: `task/TASK-1145-nexa-personal-prompt-payslip-ready`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el follow-up de TASK-1144: el resolver `personal` de Nexa (Mi espacio) ofrece un prompt cuando el colaborador tiene **su recibo de pago del período reciente disponible** ("Tu recibo del mes ya está disponible, ¿lo abrimos?"). Requiere un **reader canónico nuevo** en el payroll store (el de histórico no distingue recencia ni estado del período) — read-only, member-scoped, sin tocar montos.

## Why This Task Exists

TASK-1144 quería incluir la señal de pago pero el reader existente (`pgGetMemberPayrollEntries`) devuelve **todo el histórico** y la entry **no expone el estado del período ni el mes** → una señal "tu liquidación está lista" saldría **siempre encendida** (inútil) o imprecisa. La señal honesta necesita: (a) un reader que distinga "recibo del período reciente, ya **exportado**", y (b) copy **regime-neutral** (decir "liquidación" a un honorarios es incorrecto — es término de dependiente Chile).

## Goal

- **Reader canónico** `pgMemberPayslipReadyForRecentPeriod(memberId)` en `src/lib/payroll/postgres-store.ts`: ¿el colaborador tiene un `payroll_entry` `is_active` en un período con `status='exported'` cuyo (año, mes) es el **mes operativo actual o el inmediatamente anterior**? Devuelve `{ ready: boolean }` (read API thin, NUNCA el `netTotal`).
- El resolver `personal` lo consume vía `Promise.allSettled` (degradación independiente) y emite el prompt regime-neutral. Anti-oracle por `subject.memberId`.
- Copy es-CL **regime-neutral** ("recibo de pago", no "liquidación"). El receipt de `/my/payroll` ya es regime-aware (TASK-758) → el link funciona para Chile dependiente, honorarios e internacional interno.

## Dependencies & Impact

- **Depende de:** TASK-1141 (resolver `personal` + registry). Calendario operativo canónico (`src/lib/calendar/operational-calendar.ts`, timezone `America/Santiago`). State machine de período (TASK Payroll — `exported` = estado canónico "emitido/enviado", `pgSetPeriodExported`).
- **Impacta a:** `src/lib/payroll/postgres-store.ts` (+ reader), `src/lib/nexa/data-aware-personal-resolver.ts` (+ fact `payslipReady`), `src/lib/copy/nexa.ts` (ajustar `personal_payslip_ready` a regime-neutral).
- **Archivos owned:** los 3 de arriba.

## Current Repo State

- **Already exists:** resolver `personal` (TASK-1144) con `Promise.allSettled` listo para sumar la fact; copy stub `personal_payslip_ready`; `pgGetMemberPayrollEntries` (histórico, NO sirve para recencia); `pgSetPeriodExported`; calendario operativo canónico.
- **Gap:** no hay reader "recibo del período reciente exportado para un member"; el copy dice "liquidación" (Chile-dependiente).

## Scope (slices)

- **Slice 1 — Reader canónico + validación PG.** `pgMemberPayslipReadyForRecentPeriod(memberId)` en el payroll store (canonical DB layer, NUNCA `new Pool()`). 1 query: `payroll_entries e JOIN payroll_periods p ON p.period_id = e.period_id WHERE e.member_id=$1 AND e.is_active=TRUE AND p.status='exported' AND (p.year,p.month) IN (mes operativo actual, mes anterior)`. **Validar contra PG real vía proxy (gate TASK-893: tipos/columnas, `payroll_periods.status` enum) antes de mergear.** Tests focales del reader.
- **Slice 2 — Wire al resolver + copy + doc.** Suma `payslipReady` a `PersonalFacts` + `buildPersonalPrompts` (hint `kpi`, orden: después de atrasos, antes de aprobaciones) + la lectura en `resolvePersonalPrompts` (dentro del `allSettled`). Copy regime-neutral. Tests + Delta `experience/suggested-prompts.md` (doc gate).

## Out of Scope

- Mostrar el monto de la liquidación (allowlist — solo "está disponible").
- Contractors pagados vía Deel sin `payroll_entry` interno → su comprobante es TASK-960 (remittance advice), NO este path.
- Nómina del operador (TASK-1142) · cualquier write/recompute de payroll.

## Detailed Spec

- **"Disponible / ready" = `status='exported'`** del período (estado canónico "emitido/enviado", `pgSetPeriodExported`). NUNCA `approved` (aún no emitido), `draft` ni `reopened` (en corrección).
- **Recencia** = mes operativo actual o el inmediatamente anterior (vía `operational-calendar.ts`, NO `new Date()` naive). Acota la señal a "tu ciclo de pago", evita el always-on histórico.
- **Regime-aware por construcción:** la señal aplica a quien tiene `payroll_entry` (Chile dependiente + honorarios); el receipt destino es regime-aware (TASK-758). Copy neutral evita llamar "liquidación" a un honorarios.
- **Resolver:** la lectura entra al `Promise.allSettled` existente → si PG falla, las señales ICO/vacaciones siguen.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule
Slice 1 (reader + validación PG) → Slice 2 (wire + copy). El reader se valida contra PG real ANTES de wirearlo (gate TASK-893).

### 4 pilares (arch-architect)
| Pilar | Cómo se cumple |
|---|---|
| **Safety** | Solo data propia (anti-oracle por `subject.memberId`); NUNCA el monto (allowlist); flag-gated; read-only. |
| **Robustness** | Sin período/entry → `ready=false`; 1 JOIN idempotente; **SQL validado contra PG real (TASK-893)**; `status` enum verificado. |
| **Resilience** | `Promise.allSettled` en el resolver → PG caído no tumba ICO/vacaciones; route cache 30s (TASK-1139). |
| **Scalability** | 1 query indexada (`member_id` + período + status), barata, cacheada; sin recompute. |

### Risk matrix
| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Monto al prompt | resolver | Baja | Allowlist (solo "disponible"), reader devuelve `{ready}` sin monto | test allowlist |
| Señal always-on | reader | Media | Filtro `status='exported'` + recencia (mes actual/anterior) | test recencia |
| Copy incorrecto para honorarios | copy | Media | Regime-neutral ("recibo"), no "liquidación" | review payroll-auditor |
| Drift de tipo/columna en el SQL | reader | Media | Validar contra PG real vía proxy antes de mergear (TASK-893) | smoke PG |

### Feature flags / cutover
Mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED`. Aditivo. Rollback = revert commit (<2 min).

### Production verification sequence
1. Local (flag ON + proxy PG): un member con período actual exportado → el prompt aparece; sin exportar → no. 2. Staging GVC. 3. Prod = próximo release.

### Out-of-band coordination required
Ninguna (read-only, sin migración).

## Acceptance Criteria

- [x] Con un período reciente **exportado** y entry activa del member, el prompt aparece; con período `approved`/`draft`/`reopened` o sin entry → no. (query filtra `status='exported'` + recencia; test resolver).
- [x] El prompt NUNCA muestra el `netTotal` (test allowlist) — el reader devuelve `{ready}` sin monto.
- [x] El reader usa el calendario operativo (`getOperationalPayrollMonth`, mes actual/anterior), no `new Date()` naive para el mes.
- [x] Copy regime-neutral ("recibo de pago"), no "liquidación" (test builder).
- [x] Anti-oracle: el reader se llama con el `subject.memberId` de sesión (test `toHaveBeenCalledWith('member-self')`).
- [x] El reader fue **validado contra PG real** (smoke vía proxy: dummy→`ready:false`, member real con período exportado→`ready:true`) antes del wire.
- [x] `pnpm vitest run src/lib/payroll src/lib/nexa` verde (642 passed, no-regresión) · `pnpm nexa:doc-gate` verde.

> **Decisión de copy (open question resuelta):** el neutral **"recibo de pago"** cubre Chile dependiente + honorarios + internacional en un solo string (el receipt destino ya es regime-aware, TASK-758). No se ramificó por régimen.

## Verification

- `pnpm local:check` + tests focales (reader + resolver) + `pnpm vitest run src/lib/payroll`.
- **Validación PG real**: `pnpm pg:connect:shell` o smoke script contra el proxy (gate TASK-893).
- **UI por skills**: `greenhouse-ux-writing` (copy) + GVC en `/my` con período exportado.
- `pnpm test` + `pnpm build`.

## Closing Protocol

- `Lifecycle: complete` + mover + sync README/REGISTRY + Delta `experience/suggested-prompts.md` + changelog/Handoff.

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** el `netTotal`/monto al prompt. **NUNCA** `new Pool()` (canonical DB layer). **NUNCA** `new Date()` naive para el mes operativo (usar `operational-calendar.ts`).
- **NUNCA** llamar "liquidación" genérico (término de dependiente Chile) — regime-neutral o regime-aware.
- **NUNCA** recompute de payroll — read-only.
- **SIEMPRE** anti-oracle por `subject.memberId`. **SIEMPRE** validar el SQL nuevo contra PG real antes de mergear (TASK-893). **SIEMPRE** `Promise.allSettled` (degradación independiente).

## Open Questions

- ¿Incluir también honorarios con "comprobante" en copy regime-aware, o el neutral "recibo de pago" cubre ambos? (Decisión de copy con `greenhouse-ux-writing` en Slice 2; el neutral es el default robusto.)
- ¿"Reciente" = mes actual + anterior, o solo actual? (Default actual+anterior para cubrir el pago de cierre que cae a inicios del mes siguiente.)
