# TASK-1521 — Execution Plan

- Fecha: 2026-07-23
- Estado: activo; intake canónico completado, task no cerrada
- Runtime: `/Users/jreye/Documents/efeonce-globe`
- Governance: `/Users/jreye/Documents/greenhouse-eo`
- Skills: `greenhouse-task-execution-hook`, `greenhouse-task-planner`,
  `greenhouse-documentation-governor`, `software-architect-2026`, `greenhouse-secret-hygiene`,
  `greenhouse-qa-release-auditor`

## Goal and boundary

Habilitar Globe como producto comercial mediante contratos y automatización que sean multi-workspace,
fail-closed, auditables y operables sin intervención manual por pieza. El objetivo de cierre exige aislamiento,
tenancy V2, workers/schedulers gobernados, promotion/rollback y evidencia live proporcional. Una generación humana
exitosa en el runtime controlado es evidencia de avance, no equivalencia de `commercial ready`.

Esta ejecución no abre clientes externos ni declara Production antes de `TASK-1480`. Tampoco duplica los sources
of truth de identity, tenancy, ledger, providers o assets.

## Audit 2026-07-23

### Supuestos correctos

- Greenhouse gobierna tasks, decisiones y desired access; Globe posee su proyección runtime y primitives creativas.
- El Producer consume command/readers server-side; el browser no suministra identidad, workspace ni grants.
- El runtime actual puede ejecutar una generación real y liquidar créditos por el carril gobernado.

### Supuestos desactualizados

- ADR-006 V1 modela un `member` singular y no un snapshot completo de workspace. No escala a múltiples miembros ni
  permite interpretar omisiones como suspensión.
- V1 mezcla `brokerRevision`/fingerprint semánticos con timestamps de un lease corto. Renovar freshness sin
  mutación de desired access puede crear conflicto o churn semántico.
- La ejecución manual de workers demuestra el defecto y ayuda a diagnosticar, pero no constituye procesamiento
  comercial durable. Los schedulers/reconciliadores deben ser automáticos, observables y gobernados.
- El bloqueo ya no es “Producer no genera”: la corrida humana produjo un candidato real. El bloqueo activo está en
  la convergencia de tenancy y el lifecycle automático del asset.

### ADR y contratos obligatorios

- ADR-006, delta V2: snapshot `members[]` workspace-complete, semantic revision separada de lease freshness,
  suspensión por omisión y grant history append-only.
- ADR-001 y API Contract Spine: trusted context server-derived y federación separada de workload identity.
- TASK-1467/1468/1482/1511: provenance/rights, ledger/budgets y projection stores siguen siendo owners.
- TASK-1480: conserva el go/no-go para clientes externos.

### Access model

- Autoridad efectiva: broker capabilities ∩ membresía proyectada activa ∩ grants locales activos y acotados.
- Reconciler: service principal dedicado con sólo la capability de reconciliación.
- Operator y workers: principals separados; no heredan authority de una sesión humana ni de un tenant hard-coded.
- Workspace/member/grant expirado, omitido, suspendido o stale falla cerrado.

### Runtime evidence disponible

- Sesión humana autenticada con workspace `greenhouse-org:efeonce`.
- `estimate → generate` ejecutado una sola vez desde UI; candidato PNG real 2048×2048 retenido y 10 créditos
  liquidados.
- Producer worker finalizó el output tras corregir grants declarativos de mínimo privilegio.
- Asset governance no reclamó el job porque la única proyección descubrible tenía lease expirado y no correspondía
  al workspace humano vigente.

### Riesgos / blast radius

- Un lease extendido manualmente volvería a expirar y ocultaría el defecto multi-member.
- Habilitar schedulers antes de tenancy V2 puede producir loops vacíos, backlog o denegaciones impredecibles.
- Una reconciliación parcial puede conservar authority de miembros removidos.
- Un snapshot workspace-complete mal versionado puede revocar en masa; exige transacción, dry-run, canary,
  métricas y rollback.

## Open questions resolved

1. **¿Parchear el workspace interno?** No. Se corrige ADR-006 y el aggregate con semántica multi-workspace.
2. **¿Cómo renovar un workspace sin churn?** Lease freshness es independiente de `semanticRevision` y de su
   fingerprint.
3. **¿Qué significa omitir un miembro?** En un snapshot completo significa suspensión fail-closed, atómica y
   auditada.
4. **¿Cómo retirar capabilities?** Se apendea revocación/supersession; nunca update/delete destructivo.
5. **¿Manual o automático?** Los one-shots sólo diagnostican. El estado operativo requiere reconciler y workers
   periódicos gobernados con lag/expiry/queue signals.
6. **¿Host/front door comercial?** Sigue siendo Slice 0 pendiente; no se infiere desde el front door interno.

## Subagent strategy

`fork`, autorizado por el operador. Los carriles pueden ejecutarse con ownership exclusivo:

- tenancy contracts/domain/database y tests;
- reconciler/scheduler/IaC/observability;
- QA/documentación/evidence pack.

El agente raíz conserva integración, comandos live sensibles, consolidación y verificación end-to-end. Ningún
subagente cambia branch, hace push o toca archivos de otro carril.

## Execution slices

### 0. Commercial stage decision

- Resolver environment vocabulary, host/front door, origin/session y matriz de aislamiento.
- Mantener clientes externos cerrados hasta sign-off de `TASK-1480`.
- Evidencia: ADR aceptada, config matrix y rollback antes de provisionar/cutover.

### 1. Tenancy V2 foundation

- Versionar contratos para snapshot workspace-complete `members[]`.
- Separar `semanticRevision`/fingerprint de lease freshness.
- Reconciliar en una transacción: upsert explícitos, suspender omitidos, append revoke/supersede de grants.
- Compatibilidad: V1 sólo mediante migración/adaptador acotado; ningún fallback que adivine el set completo.
- Evidencia: tests multi-member, omission, lease-only renewal, conflict/rollback revision, cross-workspace y audit.

### 2. Continuous reconciliation and automation

- Productizar Greenhouse broker → Globe reconciler con service identity mínima, idempotencia y renovación antes de
  expiry.
- Declarar schedulers/workers en IaC, con pausa/reanudación gobernada, retry/backoff, DLQ/recovery y readback.
- Signals: reconcile lag, lease time-to-expiry, projection drift, queue oldest age, claims/applied/rescheduled,
  provider/ledger/asset governance health.
- Canary allowlisted antes de ampliar; rollback pausa dispatch y revoca grants temporales sin borrar historia.

### 3. Asset lifecycle end-to-end

- Reprocesar el job pendiente sólo cuando el workspace esté activo y fresco bajo V2.
- Verificar `generated → scanned clean → rights authorized → eligible`, feed/library y render del output desde UI.
- Probar negativos de tenant, stale lease, revoked member/grant y kill switch.
- No usar SQL ad hoc, identidad humana compartida ni cron manual como solución.

### 4. Commercial runtime isolation and promotion

- Implementar perfiles versionados y aislados para config, IAM, secrets, DB/storage, sessions, providers,
  observability y migrations.
- Integrar gates de ledger/provider/readiness desde sus owners, sin duplicarlos.
- Ejecutar canary, backup/restore y rollback rehearsal; promotion command con lock y evidence snapshot.

### 5. QA and closure

- Verificación focal y full gates en Globe; worker/build/IaC gates donde aplique.
- Verificación UI humana final con Playwright/GVC y evidencia desktop/mobile.
- `pnpm task:lint --task TASK-1521`, `pnpm ops:lint --changed`, `pnpm qa:gates --changed`,
  `pnpm docs:closure-check` y `pnpm docs:context-check:strict`.
- Mantener lifecycle `in-progress` y estado honesto hasta rollout, recuperación y promoción verificadas.

## Stop conditions

- Snapshot parcial o ambiguity de members.
- Mismo semantic revision con fingerprint distinto.
- Lease, member o grant expirado/suspendido.
- Cualquier provider submit sin ledger reservation y readiness promoted.
- Drift IaC, secreto expuesto, principal sobreprivilegiado o scheduler sin rollback.
- Evidencia de otro deployment/config/environment.

## Current checkpoint

El intake, plan y delta ADR V2 están documentados. La implementación de tenancy V2, el reconciler continuo, la
automatización de workers y el environment comercial siguen pendientes; TASK-1521 no puede cerrarse todavía.
