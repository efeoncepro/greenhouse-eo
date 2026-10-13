# TASK-2009 — Contractor command and payment integrity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Correcciones locales verificadas; release y readback pendientes`
- Rank: `1`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; checkout compartido; sin worktrees`
- GitHub Issue: `none`

## Summary

Remediación autorizada por el operador el 05/10 («Corrígelos todos») de la auditoría general contractor de ISSUE-179. No repite la entrega histórica TASK-792/796/977/981: corrige los fallos de integridad y lifecycle detectados tras esas entregas.

## Why This Task Exists

La auditoría reprodujo ocho bugs compartidos. El fix de fechas no resuelve reintentos, aislamiento de evidencia ni la convergencia de cobros y pagos.

## Goal

- Corregir A02–A08 en commands, API, evidence y settlement.
- Probar regresiones y preservar pagos/identidades existentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_SUBMISSION_PAYMENT_INTEGRITY_DECISION_V1.md`

## Normative Docs

- `docs/audits/payroll/CONTRACTOR_FLOW_PRE_RELEASE_AUDIT_2026-10-05.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- Commands existentes TASK-792/793/977/981; ninguna task abierta cubre esta remediación.

### Blocks / Impacts

- `/my/contractor`, `/finance/contractor-payments`, órdenes de Tesorería y cascada de comprobantes.

### Files owned

- `src/lib/contractor-engagements/**; src/app/api/my/contractor/**; src/lib/finance/payment-orders/**; src/lib/sync/projections/contractor-payable-paid-cascade*`

## Current Repo State

### Already exists

- Commands, uploader privado, outbox y surfaces de contractor en las rutas anteriores.

### Gap

- Gap original de ocho hallazgos compartidos; ahora corregido localmente, sin rollout aplicado.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/contractor-engagements y src/lib/finance`
- Future candidate home: `remain-shared`
- Boundary: `Commands transaccionales y readers existentes`
- Server/browser split: `reglas de autorización/monto/documentos en servidor; interacción en browser`
- Build impact: `none`
- Extraction blocker: `transacciones y auth existentes; no extracción nueva`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_hr.contractor_work_submissions, contractor_invoice_assets, contractor_payables; greenhouse_finance.payment_order_lines/payment_obligations`
- Consumidores afectados: `portal/API/worker/CLI`
- Runtime target: `local; staging/production pendientes`

### Contract surface

- Contrato existente a respetar: `work-submissions/store.ts, invoice-assets.ts, payables/store.ts, payment-orders/create-from-obligations.ts`
- Contrato nuevo o modificado: `guardar draft + adjuntar + presentar en una tx con clave por intento; vincular toda orden contractor`
- Backward compatibility: `cutover coordinado UI/API; campos admin preservados`
- Full API parity: `primitive reusable en src/lib; rutas sólo autorizan/parsean`

### Data model and invariants

- Entidades/tablas/views afectadas: `las tablas ya enumeradas; ninguna nueva`
- Invariantes que no se pueden romper: `HR fija; contractor declara trabajo; Finance aprueba/paga; soporte propio por período; no doble desembolso`
- Write-target allowlist: `N/A — no tabla nueva`
- Tenant/space boundary: `engagement de identityProfileId; assets member-owned; submission del mismo engagement`
- Idempotency/concurrency: `PK determinística por intento, advisory lock transaccional y locks de agregado`
- Audit/outbox/history: `events/logs existentes en misma tx; no re-emisión por replay`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `corrección al desplegar; sin flag que vuelva a abrir fallos de integridad`
- Backfill plan: `preview/recovery separado, ningún apply en esta implementación`
- Rollback path: `revert del commit antes de nuevos envíos; historia financiera nunca se borra`
- External coordination: `deploy portal + worker antes de recovery`

### Security and access

- Auth/access gate: `capabilities personal_workspace.contractor.submit_self y gates HR/Finance existentes`
- Sensitive data posture: `no payloads ni archivos sensibles en logs`
- Error contract: `ContractorEngagementValidationError; errores sanitizados`
- Abuse/rate-limit posture: `clave, scope propio, lock e idempotencia`

### Runtime evidence

- Local checks: `vitest unit, lint, typecheck`
- DB/runtime checks: `readback de sólo lectura; smoke sintético rollback si está disponible`
- Integration checks: `mock de rollback/replay; sin emisiones reales`
- Reliability signals/logs: `observabilidad contractor existente y captura canónica`
- Production verification sequence: `staging → deploy autorizado portal/worker → readback → recovery separado`

## Capability Definition of Done — Full API Parity gate

Se corrigen capabilities existentes; sin grants nuevos. Primitive server-side compartido por API/UI y funciones de órdenes compartidas por CLI/corrida; ninguna regla vive sólo en un click handler.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Plan

Implementación autorizada por la instrucción directa «Corrígelos todos». Secuencia: frontera server/seguridad → transacción/idempotencia → órdenes completas/vínculo → consumer UI → regresiones/GVC → handoff. Sin push, deploy, recovery ni correo real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Corrección

- A02/A03/A04/A05: política propia, monto derivado, evidencia de período y guardado transaccional.

### Slice 2 — Lifecycle y prueba

- A06/A07/A08: vínculo único desde todas las órdenes, reemplazo sólo tras cancelación, cierre sólo por pago completo.

## Out of Scope

- Producción, nuevos desembolsos, emails o mutaciones de personas/pagos existentes.

## Detailed Spec

Contrato y decisiones en `docs/architecture/GREENHOUSE_CONTRACTOR_SUBMISSION_PAYMENT_INTEGRITY_DECISION_V1.md`. Implementación limitada a las fronteras de la auditoría: validación server-side, reutilización de commands y ausencia de escrituras reales durante QA.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Server y tests → UI y tests → staging/release autorizado → readback → recovery separado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falso paid o duplicado | finance | medium | locks, idempotencia, saldo/importe validado | captura canónica y signals existentes |
| Reuso de PDF histórico | hr/UI | medium | vínculo por submission/período | readiness bloqueado |

### Feature flags / cutover

Sin flag nuevo: corrige invariantes existentes. UI y API se promueven juntas; pestañas antiguas deberán refrescar si falta clave.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Código local | revert explícito de archivos propios | 5 min | sí |
| Datos | ningún apply autorizado/ejecutado en esta task | sin apply | sin cambio |

### Production verification sequence

Staging aislado autorizado, portal/worker al mismo SHA, canary por período y readback; recuperación del drift financiero sólo tras verificación y aprobación de su plan concreto.

### Out-of-band coordination required

Release del portal/worker por carril canónico; ninguna configuración externa nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] A02–A08 y R03–R06 corregidos; 333 tests focales PASS, guards falsificados, diez casos SQL runtime de sólo lectura y probe PostgreSQL local aislado PASS. Ver auditoría y `.captures/contractor-review-2-2026-10-05/verification.json`.
- [x] Lint focal, TypeScript global y build completo local PASS para el cambio; logs archivados en `.captures/contractor-fix-qa/`.
- [ ] Readback productivo posterior al release; pendiente mientras no se publique.

## Verification

- `pnpm vitest run --project unit src/lib/contractor-engagements src/lib/finance/payment-orders`
- `pnpm typecheck`
- `pnpm docs:closure-check`
- GVC con fixtures sin escrituras reales.

## Closing Protocol

- [ ] Lifecycle/folder/README sincronizados con evidencia runtime.
- [x] Handoff y auditoría actualizados con evidencia local y rollout pendiente.
- [ ] No declarar complete con rollout pendiente.

## Follow-ups

- Release autorizado y recuperación preview/aprobación/readback del drift histórico.

### Revisión adicional 2026-10-05

R01/R02 corregidos: replay del cascade que ya converge a paid e invoice ID inmutable. Regresiones rojas antes/verdes después; 321 tests focales y TypeScript/lint/build/workers PASS. Suite global 18.007 PASS, uno FAIL de SVG AXIS con inputs idénticos a HEAD y 48 skipped. Ver auditoría y `.captures/contractor-regression-review-2026-10-05/verification.json`. Rollout sin aplicar.

### Segunda revisión adicional 2026-10-05

R03–R06 corregidos: deadlock FK de adjuntos reproducido en PostgreSQL aislado, snapshot de tarifa consistente, invalidación compartida del período para HR y precisión conforme a NUMERIC(18,4). Pruebas rojas antes/verdes después; 333 focales PASS, build/lint/workers PASS. Suite global final 18.014 PASS, un FAIL de SVG AXIS ajeno y 48 skipped. Evidencia y alcance local en `.captures/contractor-review-2-2026-10-05/verification.json`; release/canary/recovery siguen pendientes.
