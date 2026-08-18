# Plan — TASK-1742 Global Provisional Assessment AI Foundation

## Estado del plan

- Fecha: `2026-08-18`
- Mode: `standard`
- Checkpoint: `human` (`P0`, esfuerzo `Alto`)
- Branch: `develop`; checkout compartido, sin worktrees.
- Estado: `aprobado por el operador el 2026-08-18`; autoriza implementación, release y activación global provisional con los gates definidos aquí.

## Discovery summary

- TASK-1734 ya entrega el pipeline durable `submitted → outbox → enqueue → run → drain → provider → risk router → workbench → confirm`; no se construirá un scorer paralelo.
- Producción tiene master AI habilitado, pero enqueue/run/exception policy OFF y scheduler pausado. Por eso la assessment de Lucero quedó `submitted` con 2/9 competencias objetivas corregidas y 10 respuestas pendientes.
- Lucero: application `happ-031318c2-02ce-4623-8ada-6970cf4a8fb4`; assessment `asmt-bbe4ea36-2f90-4d7c-b295-91663d3be254`; public id `EO-ASM-0051`.
- El runtime actual es global por diseño, sin allowlist de opening. El bloqueo real es policy/flags y ausencia de una autoridad provisional separada.
- La proposal individual no participa en el score efectivo: `human_score ?? auto_score` sigue siendo canónico. No existe proyección agregada provisional ni command App API exacto para recuperar envíos realizados con enqueue OFF.
- El texto libre sale casi literal al provider; falta redacción determinística de PII embebida y señales verificables de injection/off-topic/OOD/malformed.
- El gold set vigente tiene 34 respuestas abiertas/situacionales, solo 11 calificadas por una persona; no alcanza el piso 49. Por ello `exception_canary|calibrated_batch` permanecen cerrados.
- Causa raíz: el producto confunde “generar propuesta” con “materializar score”. La solución crea un modo/proyección provisional operator-only y mantiene la autoridad efectiva intacta.

## Access model

- `routeGroups`/`views`/startup policy: sin cambios.
- Entitlements/capabilities: reutilizar lectura/scoring internos; el start/backfill exacto exige capability fina, actor y reason. Cross-application/space falla como 404.
- Candidate/public/client/email: denylist estructural y probes negativos; no existe flag que permita exposición.
- Decisión: identidad y ownership se resuelven server-side desde assessment→application→opening→space; IDs del caller no amplían scope.

## Architecture decision

- ADR existente: `GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1`.
- Delta requerido: modos `disabled|synthetic_shadow|global_provisional|exception_canary|calibrated_batch`, separación provisional/effective y evidence binding por template/rubric/model/prompt/policy.
- Estado antes de egress real: delta aceptado y tests de sanitizer/anti-leak verdes.
- Reversibilidad: additive/two-way; `disabled`, enqueue OFF y scheduler pause conservan audit y proposals.

## Backend/data contract

- Source of truth: run/items/events + proposal ledger existentes; human/auto score y rollup no cambian.
- Nuevo contrato: `ProvisionalAssessmentAiProjection`, commands exact/bounded `start|backfill|reconcile`, sanitizer y evidence gate.
- Idempotencia: assessment+input digest+active-run unique; backfill dry-run/apply con key y batch cap.
- Egress: packet allowlisted y redactado antes del adapter; raw answer/provider error nunca se loguea.
- Reliability: concurrency 1 inicial, daily cost cap, retry/timeout/lease existentes, circuit breaker y señales de packet blocked, mutation guard, backlog, provider/schema, abstention y cost.

## Skills

- `software-architect-2026`: boundaries, ADR, state machine y rollout.
- `greenhouse-talent-people-operator`: autoridad de evaluación, anti-anchoring y candidate boundary.
- `greenhouse-task-execution-hook`: preflight formal y ownership.
- `greenhouse-secret-hygiene` + `greenhouse-production-release`: env/deploy/activation sin filtrar secretos.
- `greenhouse-qa-release-auditor` + `greenhouse-documentation-governor`: gates y cierre.

## Subagent strategy

Discovery ya fue paralelizado por autorización del operador. Implementación secuencial por el agente principal porque ADR, domain contracts, worker y rollout comparten invariantes y el checkout es único.

## Execution order

1. Ejecutar hook y baseline; aceptar delta ADR de modos/autoridades/evidence binding.
2. Implementar sanitizer pre-egress y señales deterministas con fixtures adversariales y payload assertions.
3. Crear projection/reader provisional y commands App API exact/bounded con auth, audit e idempotencia.
4. Cablear worker/config/signals/cost cap/kill switch; desplegar flags OFF y ensayar rollback.
5. Ejecutar synthetic shadow; activar global provisional con concurrencia 1; correr Lucero y verificar DB/anti-leak/canonical mutation guard.
6. Mantener elegibilidad global para nuevos envíos; abrir backlog en lotes acotados tras la ventana de observación definida por el runbook.

## Risk flags

- PII/instruction egress antes del provider.
- Proposal provisional escrita accidentalmente como score efectivo.
- Replay/backfill duplicando costo o runs.
- DTO interno filtrado a rutas candidate-facing.
- Evidencia stale habilitando un modo superior a provisional.

## Checkpoint humano

El operador aprobó explícitamente crear y ejecutar ambas tasks end-to-end y dejar la evaluación provisional habilitada para todas las vacantes. La autorización no incluye `exception_canary|calibrated_batch`, resultados al postulante ni decisiones automatizadas.
