# TASK-2010 — Contractor submission retry, period and action corrections

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
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2010-contractor-submission-retry-period-actions.md`
- Flow: `docs/ui/flows/TASK-2010-contractor-submission-retry-period-actions-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Correcciones locales verificadas; release y readback pendientes`
- Rank: `1`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop; checkout compartido; sin worktrees`
- GitHub Issue: `none`

## Summary

Remediación autorizada por el operador el 05/10 («Corrígelos todos») de la auditoría general contractor de ISSUE-179. No repite la entrega histórica TASK-792/796/977/981: corrige los fallos de integridad y lifecycle detectados tras esas entregas.

## Why This Task Exists

La auditoría reprodujo ocho bugs compartidos. El fix de fechas no resuelve reintentos, aislamiento de evidencia ni la convergencia de cobros y pagos.

## Goal

- Corregir A04/A05/A09 en el consumer UI, sin duplicar reglas server-side.
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

- TASK-2009 define el command atómico y la política documental.

### Blocks / Impacts

- `/my/contractor`, `/finance/contractor-payments`, órdenes de Tesorería y cascada de comprobantes.

### Files owned

- `src/views/greenhouse/contractors/ContractorSubmissionComposer*; src/views/greenhouse/contractors/ContractorSelfServiceView*; src/lib/copy/contractor-submissions.ts`

## Current Repo State

### Already exists

- Commands, uploader privado, outbox y surfaces de contractor en las rutas anteriores.

### Gap

- Gap original de ocho hallazgos compartidos; ahora corregido localmente, sin rollout aplicado.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/contractors`
- Future candidate home: `remain-shared`
- Boundary: `Consumer de projection y command server-side`
- Server/browser split: `reglas de autorización/monto/documentos en servidor; interacción en browser`
- Build impact: `none`
- Extraction blocker: `transacciones y auth existentes; no extracción nueva`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-premium`
- Usuario / rol: `contractor propio`
- Momento del flujo: `preparar/guardar/enviar y consultar estado`
- Resultado perceptible esperado: `un envío por intento y período, error recuperable y acciones con destino correcto`
- Friccion que debe reducir: `duplicados y documentos reutilizados por error`
- No-goals UX: `rediseño del hub o nueva navegación`

### Surface & system decision

- Surface: `/my/contractor`
- Nav placement: `none`
- Composition Shell: `no aplica — hub existente`
- Primitive decision: `reuse — Drawer, TextField, uploader y remittance existentes`
- Adaptive density / The Seam: `no aplica — layout existente`
- Floating/Sidecar/Dialog decision: `conservar drawer de envío; consultas apuntan a secciones existentes`
- Copy source: `src/lib/copy/contractor-submissions.ts`
- Access impact: `none`

### State inventory

- Default: `período nuevo vacío`
- Loading: `botones deshabilitados durante guardado`
- Empty: `sin documentos nuevos`
- Error: `alerta conserva borrador y clave`
- Degraded / partial: `no éxito si el command no confirmó todo`
- Permission denied: `error canónico del servidor`
- Long content: `scroll del drawer`
- Mobile / compact: `drawer full width`
- Keyboard / focus: `controles MUI y foco en destino de consulta`
- Reduced motion: `transición MUI existente; sin animación nueva`

### Interaction contract

- Primary interaction: `POST único con intento/documentos; consulta nunca crea`
- Hover / focus / active: `primitivas existentes`
- Pending / disabled: `isSaving; rate requerido`
- Escape / click-away: `conservar draft al cerrar; limpiar sólo tras submit exitoso`
- Focus restore: `MUI Drawer; anchor de sección al consultar`
- Latency feedback: `spinner existente`
- Toast / alert behavior: `error visible; éxito sólo tras commit del command`

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: `Drawer MUI existente`
- Layout morph: `none`
- Stagger: `none`
- Timing / easing token: `theme existente`
- Reduced-motion fallback: `MUI existente`
- Non-goal motion: `ninguna nueva`

### Implementation mapping

- Route / surface: `/my/contractor`
- Primitive / variant / kind: `Drawer, uploader, sección remittance`
- Component candidates: `ContractorSubmissionComposer, ContractorSelfServiceView`
- Copy source: `src/lib/copy/contractor-submissions.ts`
- Data reader / command: `projection actual; nuevo command de TASK-2009`

### GVC scenario plan

- Quality profile: premium. Desktop 1440×1000 y móvil 390×844; período nuevo, error recuperable, éxito, keyboard/reduced motion y destinos de CTA. Review dossier: `.captures/2026-10-05T21-01-45_contractor-integrity-local/`. Baseline de composición TASK-796 conservada; sin diff aprobado nuevo. Layout gate cubre scroll-width.

### Design decision log

- Mantener composición; cambiar comportamiento defectuoso. No variante visual nueva.

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

- Un request por intento; conservar draft al fallar; reset después de enviar.

### Slice 2 — Lifecycle y prueba

- A09: consulta de envío/comprobante/pendientes sin crear; GVC desktop/mobile.

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

- [x] A04/A05/A09 corregidos; tests de componente PASS y GVC premium desktop/mobile sin findings, dossier e imágenes inspeccionados. Evidencia `.captures/2026-10-05T21-01-45_contractor-integrity-local/`.
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

### Segunda revisión adicional 2026-10-05

Componentes UI sin cambios respecto del GVC registrado. R03–R06 fortalecen el command consumido por la misma UI; snapshot económico del caller sigue descartado y el nuevo error de cantidad usa la presentación existente. 333 tests focales y build/lint/workers PASS; suite global 18.014 PASS / un FAIL de SVG AXIS ajeno / 48 skipped. Evidencia en `.captures/contractor-review-2-2026-10-05/verification.json`; canary integral real pendiente.
