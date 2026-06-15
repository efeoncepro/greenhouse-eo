# TASK-1146 — Nexa tool `explain_my_pay` (cuánto cobré y por qué, propio)

<!-- Revisada con greenhouse-payroll-auditor + arch-architect antes de crearse. -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|hr|payroll`
- Blocked by: `none`
- Branch: `task/TASK-1146-nexa-tool-explain-my-pay`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Da a Nexa un **tool de function-calling** `explain_my_pay` para que un colaborador pregunte por **su propio pago** ("¿cuánto cobré y por qué?") y Nexa responda con datos reales: líquido + desglose (haberes − deducciones), regime-aware. Hoy Nexa NO puede — `check_payroll` es del operador (HR/finanzas) y agregado (total de la nómina), no el pago de una persona.

## Why This Task Exists

El dato y el detalle EXISTEN (`buildReceiptPresentation` TASK-758 = haberes/deducciones legales/retención SII/líquido, regime-aware; `/my/payroll` + receipt). Pero el único tool de pago de Nexa (`check_payroll`) está gateado a HR/finanzas/admin y devuelve el **agregado del período**, no el pago propio del colaborador ni el "por qué". Sin un tool member-self, si Daniela pregunta "cuánto cobré", Nexa no sabe o alucina. La doctrina conversacional exige: dato operativo en vivo → **tool**, no Knowledge. Full API Parity: si la UI (`/my/payroll`) lo muestra, Nexa debe poder vía un contrato gobernado.

## Goal

- Tool `explain_my_pay` (member-self): `isAvailable` = el subject tiene `memberId`. `execute` usa **SIEMPRE** `context.memberId` de sesión (anti-oracle — NUNCA el pago de otro).
- Reusa SSOT: `pgGetMemberPayrollEntries(memberId)` (última entry procesada) + `buildReceiptPresentation(entry)` (regime-aware, NUNCA recomputa). Devuelve `{ summary, metrics, raw }` con líquido + desglose + régimen.
- Aquí el **monto SÍ es la respuesta** (es su propio pago, lo pidió) — distinto del prompt sugerido (TASK-1145, que NO lleva monto). El anti-oracle (solo su member) es la garantía.

## Dependencies & Impact

- **Depende de:** `src/lib/nexa/nexa-tools.ts` (registro de tools), `pgGetMemberPayrollEntries` (`postgres-store.ts`), `buildReceiptPresentation` (`receipt-presenter.ts`, TASK-758), `NexaRuntimeContext.memberId` (ya existe + lo pasa `/api/home/nexa/route.ts`).
- **Archivos owned:** `src/lib/nexa/nexa-tools.ts` (+ tool), su test.

## Current Repo State

- **Already exists:** patrón `NexaToolDefinition` (declaration + isAvailable + execute) + `buildToolUnavailableResult`; `context.memberId`; `pgGetMemberPayrollEntries` (entries en períodos approved/exported/reopened, DESC); `buildReceiptPresentation` regime-aware (Chile dep / honorarios / Deel / internacional).
- **Gap:** no hay tool member-self de pago; `check_payroll` es operador/agregado.

## Scope (slices)

- **Slice 1 — Tool + registro + tests.** `explain_my_pay` en `nexa-tools.ts`: `isAvailable: Boolean(tenant.memberId)`; `execute` → `pgGetMemberPayrollEntries(context.memberId)` → `entries[0]` → `buildReceiptPresentation(entry)` → `{ summary (regime-aware: hero.label + hero.amount + grossTotal + deducciones), metrics, raw (haberes + deducciones) }`. Sin entry → `buildToolUnavailableResult` honesto. Registrar en el tool map + `getNexaToolDeclarations`. Tests (anti-oracle context.memberId, sin entry → unavailable, regime-aware summary).

## Out of Scope

- El prompt sugerido del recibo (TASK-1145 — ese NO lleva monto).
- Contractors vía Deel pagados afuera sin `payroll_entry`: su detalle es la remittance (TASK-960) — follow-up de tool análogo si se pide.
- Histórico / comparativas entre meses (V1 = la última liquidación). Cualquier write/recompute de payroll.

## Detailed Spec

- **Anti-oracle:** el tool ignora todo arg de identidad; usa SOLO `context.memberId`. Un colaborador NUNCA obtiene el pago de otro.
- **Regime-aware por construcción:** `buildReceiptPresentation` resuelve el hero ("Líquido a pagar" Chile/honorarios/interno; "Monto bruto registrado" + footnote Deel). El tool refleja eso honesto (para Deel dice que Deel determina el líquido).
- **Monto entitled:** devuelve el líquido/desglose del PROPIO member (lo que ya ve en `/my/payroll`). NUNCA recomputa — lee el entry persistido + la presentación canónica.

## Rollout Plan & Risk Matrix

### 4 pilares (arch-architect)
| Pilar | Cómo |
|---|---|
| **Safety** | Solo `context.memberId` (anti-oracle); gateado por `memberId` presente; read-only; el monto es del propio member (entitled). |
| **Robustness** | Sin entry / sin memberId → `unavailable` honesto; NUNCA recomputa (usa la presentación canónica); maneja excluded/Deel vía la presentación. |
| **Resilience** | El executor envuelve en try/catch → `buildToolUnavailableResult` (el tool nunca tumba el turno de Nexa). |
| **Scalability** | 1 read member-scoped + presentación pura; barato. |

### Feature flags / cutover
Sin flag (consistente con los otros tools operativos `check_payroll`/`get_otd`). Gateado por `isAvailable`. Rollback = revert commit.

### Production verification sequence
1. Local: sesión de un colaborador con liquidación → preguntar a Nexa "cuánto cobré" → responde líquido + desglose; sin liquidación → honesto "todavía no tienes". 2. Staging.

### Out-of-band coordination required
Ninguna (read-only, sin migración/env).

## Acceptance Criteria

- [ ] `explain_my_pay` disponible solo cuando el subject tiene `memberId`.
- [ ] Devuelve el líquido + desglose (haberes/deducciones) del **propio** member; con otro arg de id → lo ignora (test anti-oracle).
- [ ] Sin entry procesada → resultado `unavailable` honesto (no inventa).
- [ ] Regime-aware: honorarios muestra retención SII (no deducciones dependientes); Deel refleja que Deel determina el líquido (vía la presentación).
- [ ] NUNCA recomputa payroll (usa `buildReceiptPresentation`).
- [ ] `pnpm vitest run src/lib/nexa src/lib/payroll` verde · `pnpm nexa:doc-gate` verde.

## Verification

- `pnpm local:check` + tests focales del tool + `pnpm vitest run src/lib/payroll` (no-regresión).
- `pnpm test` + `pnpm build`. Smoke conversacional opcional (preguntar a Nexa en `/my`).

## Closing Protocol

- `Lifecycle: complete` + mover + sync README/REGISTRY + doc de capa Nexa (`behavior/` o `knowledge/` — el tool es comportamiento/routing) + changelog/Handoff.

## Hard rules

- **NUNCA** usar un arg de identidad del cliente — solo `context.memberId`. **NUNCA** devolver el pago de otro member.
- **NUNCA** recomputar payroll — leer el entry persistido + `buildReceiptPresentation`.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain`. **SIEMPRE** envolver el executor para que un fallo degrade a `unavailable`, no tumbe el turno.

## Open Questions

- ¿`explain_my_pay` acepta un período opcional (mes pasado) o V1 solo la última? (Default: última; histórico = follow-up.)
- ¿Tool análogo para contractors (desde remittance TASK-960)? (Follow-up si se pide.)

## Closure 2026-06-15 — code-complete

Tool `explain_my_pay` en `nexa-tools.ts`: el colaborador pregunta por su propio pago y Nexa responde con líquido + desglose (haberes/deducciones) regime-aware, reusando `pgGetMemberPayrollEntries` + `buildReceiptPresentation` (SSOT, NUNCA recomputa). **Anti-oracle**: SIEMPRE `context.tenant.memberId` (test); NUNCA el pago de otro. El monto SÍ es la respuesta (propio, entitled). Sin liquidación → `unavailable` honesto. Sin flag (consistente con los otros tools operativos), gateado por `isAvailable: Boolean(memberId)`.
Doc de capa: `behavior/behavior-and-routing.md` (catálogo + ruteo) + `knowledge/retrieval-answer-quality.md` (frontera operativo→tool).
Gates: tsc 0 · lint 0 · 5/5 tests focales · suite nexa+payroll 638 passed · doc gate verde · build.
**Follow-ups:** tool análogo para contractors (remittance TASK-960); período opcional (histórico).
