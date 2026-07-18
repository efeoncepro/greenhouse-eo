# TASK-1432 — Greenhouse Reliability Recovery and Remediation Control

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|reliability|ops|sync|finance|delivery|identity|payroll|growth`
- Blocked by: `none`
- Branch: `task/TASK-1432-reliability-recovery-control`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Gobernar la recuperación de la postura de confiabilidad detectada por la revisión matinal del 2026-07-18: `platform-health.v1` sin confianza operativa, siete módulos en error, dead-letters reactivos/webhook y deuda de datos sensible. La task define orden, ownership, evidencia y criterios de promoción a remediaciones hijas sin convertir acknowledgements, replays o backfills en atajos para “verdear” el dashboard.

## Why This Task Exists

El runtime base de staging responde, pero el preflight canónico devolvió `overallStatus=unknown` porque `reliability_control_plane` excedió su budget de 6000 ms y derivó todos los `safeModes` en `false`, incluido `agentAutomationSafe`. La vista detallada reportó errores reales en Commercial, Delivery, Finance, Growth, Identity, Payroll y Platform; además, dos handlers `contract_mrr_arr` permanecen fallidos, `wh-sub-notifications` acumula 14 dead-letters por `401 missing_signature` y hay dos renders de artefactos en `dead_letter`.

La causa y el recovery path no pertenecen a una sola tabla ni a un solo runtime. Ejecutar un replay masivo o reconocer fallos sin corregir su origen rompería auditabilidad y podría duplicar side effects. Esta umbrella conserva las fronteras de dominio, exige commands/runbooks gobernados e impulsa tasks o issues hijos cuando el cambio requiere código, datos, infraestructura o aprobación especializada.

## Goal

- Recuperar un preflight `platform-health.v1` confiable, con budgets observables y `safeModes` derivados desde evidencia completa o degradación explícita.
- Corregir causas raíz antes de cualquier acknowledgement/replay y ejecutar recoveries focales, idempotentes, auditados y verificables.
- Llevar cada señal material a `ok`, una excepción aceptada con owner/SLA, o una remediación hija formal con alcance y rollout propios.
- Cerrar con evidencia runtime sostenida y sin mutar decisiones contables, laborales, tributarias o de identidad sin sign-off del dueño humano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — sección Platform Health
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- `platform-health.v1.safeModes` manda: si `agentAutomationSafe=false`, no ejecutar mutaciones automatizadas.
- No reconocer ni resolver dead-letters hasta probar que la causa raíz fue corregida y que un intento nuevo completa el contrato downstream.
- No mutar directamente ledgers, health tables ni audit logs; usar commands, state machines y recovery primitives canónicos.
- No mezclar decisiones de Finance, Payroll, Identity o HR con remediación mecánica. Esos cambios exigen owner, dry-run, evidencia y sign-off.
- No duplicar el trabajo de `TASK-928`; esta umbrella consume su evidencia y solo abre follow-up si el timeout persiste después de su cierre real.
- No cambiar `artifact-worker` retries: los renders se recuperan por el dominio mediante `retryProposalRenderJob`.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-928-reliability-admin-n-plus-one-batching.md` — ownership vigente de batching/request cache en Reliability/Admin y `src/lib/platform-health/**`.
- `docs/tasks/complete/TASK-129-in-app-notifications-via-webhook-bus.md` — contrato canónico de firma y self-loop `wh-sub-notifications`.
- `docs/tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md` — cola y retry de dominio del `artifact-worker`.
- `src/lib/platform-health/composer.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/sync/handler-health.ts`
- `src/lib/webhooks/endpoint-health.ts`
- `src/app/api/internal/webhooks/notification-dispatch/route.ts`

### Blocks / Impacts

- Certificación diaria de confiabilidad y cualquier automatización que dependa de `agentAutomationSafe`.
- Correctitud/frescura de Commercial, Delivery, Finance, Growth, Identity y Payroll.
- Recovery del bus reactivo, notificaciones internas, render de artefactos y CI del sitio público.
- Decisión de si este programa debe promocionarse a `EPIC-###` cuando el breakdown confirme múltiples implementaciones independientes.

### Files owned

- `docs/tasks/to-do/TASK-1432-greenhouse-reliability-recovery-control.md`
- `docs/tasks/plans/TASK-1432-plan.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

Los archivos de runtime quedan bajo ownership de las tasks/issues hijas; esta umbrella no toma ownership transversal de `src/lib/**`, `src/app/**`, `services/**` ni datos productivos.

## Current Repo State

### Already exists

- `GET /api/admin/platform-health`, `GET /api/admin/reliability` y `GET /api/internal/health` como superficies canónicas.
- Health state machines para handlers y webhooks, con audit history y acknowledgements explícitos.
- Recovery de renders en el dominio de Proposal Studio, separado de los retries de Cloud Run.
- Reliability signals por módulo y correlación Sentry por `domain` tag.
- Commands/readers específicos para varias remediaciones de Finance, Payroll, Identity y Delivery.

### Gap

- `platform-health.v1` no completa el Reliability Control Plane dentro de 6000 ms y bloquea `safeModes` aunque los probes básicos respondan.
- No existe un recovery packet único que asigne cada señal material a owner, causa validada, primitive, dry-run, apply, rollback y evidencia post-recovery.
- Hay fallos activos con evidencia de causa probable, pero no se ha probado todavía el path corregido ni un replay seguro.
- Parte de la deuda corresponde a decisiones humanas de datos; no hay autorización para resolverla mediante backfill automático.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `docs/tasks/**` como control operativo; runtime existente en Next.js/Vercel, PostgreSQL, Cloud Run workers, GitHub Actions y proveedores externos.
- Future candidate home: `remain-shared`
- Boundary: `platform-health.v1`, Reliability Control Plane y los commands/readers/recovery primitives propietarios de cada dominio; UI, Nexa, MCP, cron y operadores son consumers.
- Server/browser split: task documental y contracts server-side; DB, secretos, providers, retries y mutaciones nunca cruzan al browser.
- Build impact: `none`; cualquier dependencia o deployable nuevo debe justificarse en una task hija y respetar EPIC-026.
- Extraction blocker: recovery cruza transacciones/audit PG, auth/capabilities, workers, secrets y provider APIs con ownership independiente por dominio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `platform-health.v1`, Reliability Control Plane y los ledgers/aggregates canónicos de cada módulo; esta umbrella no crea un source of truth nuevo.
- Consumidores afectados: agentes, Admin/Ops Health, API Platform, workers, cron, Sentry y operadores de dominio.
- Runtime target: `staging|production|worker|cron|external`

### Contract surface

- Contrato existente a respetar: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, `src/lib/platform-health/**` y `src/lib/reliability/**`.
- Contrato nuevo o modificado: `none` en la umbrella; cada task hija declara su endpoint/command/reader/event/schema real.
- Backward compatibility: `not applicable` para la coordinación; cualquier cambio runtime debe ser additive/gated o declarar breaking change explícito.
- Full API parity: toda remediación reintentable debe usar un command/recovery primitive gobernado consumible por API/agente; quedan prohibidas las mutaciones directas de tabla o los botones con lógica exclusiva.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_sync.handler_health`, `greenhouse_sync.outbox_reactive_log`, `greenhouse_sync.webhook_endpoint_health`, `greenhouse_sync.webhook_deliveries`, `greenhouse_commercial.proposal_render_jobs` y los aggregates propietarios que cada señal identifique.
- Invariantes que no se pueden romper:
  - History/audit permanece append-only; acknowledge no borra evidencia ni sustituye recovery.
  - Un replay conserva idempotency key/event ID y no duplica side effects downstream.
  - Datos contables, tributarios, laborales, payroll e identidad no se infieren ni corrigen sin source of truth y owner humano.
- Tenant/space boundary: cada command conserva su autorización, tenant/organization/member scope actual; la umbrella no introduce bypass admin ni acceso cross-tenant.
- Idempotency/concurrency: cada child declara claim/lock/dedupe y prueba re-run; apply queda prohibido sin dry-run cuando modifica datos.
- Audit/outbox/history: reutilizar los ledgers existentes; toda excepción aceptada registra owner, motivo, evidencia y condición de retiro.

### Migration, backfill and rollout

- Migration posture: `none` en la umbrella; migrations/backfills solo en tasks hijas backend-critical.
- Default state: `read-only` hasta corregir causa raíz y aprobar cada apply.
- Backfill plan: inventario -> dry-run -> allowlist -> batch acotado -> verify; nunca un backfill multi-dominio.
- Rollback path: detener el workstream, mantener flags/consumers en estado previo y usar el rollback específico de la task hija; no acknowledge para ocultar una regresión.
- External coordination: owners Finance/Accounting, People/Payroll/Identity, Delivery/Notion, Growth/HubSpot, Platform/Cloud y Public Site según workstream.

### Security and access

- Auth/access gate: mantener capabilities, tenant context, HMAC, service accounts y provider scopes existentes; no admin-coarse nuevo.
- Sensitive data posture: Finance, payroll, identity, secrets y provider payloads; evidencia y errores deben estar redactados.
- Error contract: errores sanitizados con `captureWithDomain`; no persistir ni devolver stacks, secretos o payloads sensibles.
- Abuse/rate-limit posture: preservar replay guards, idempotencia, circuit breakers, provider quotas y anti-replay HMAC.

### Runtime evidence

- Local checks: `pnpm task:lint --task TASK-1432`, `pnpm ops:lint --changed` y gates focales declarados por child.
- DB/runtime checks: consultas read-only/dry-run contra tablas fuente, `pnpm pg:doctor` cuando el entorno local esté sano y smoke PG específico por child.
- Integration checks: webhook firmado, replay allowlisted, worker/provider smoke y CI del sitio público según workstream.
- Reliability signals/logs: `platform-health.v1`, `/api/admin/reliability`, handler/webhook health, Sentry por `domain` y señales exactas del inventario.
- Production verification sequence: staging root-cause proof -> staging recovery -> cooldown -> production apply allowlisted -> observación 24 h/7 d -> closure.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers están nombrados por workstream con paths/objetos reales.
- [ ] Data invariants, tenant/access boundary e idempotency/concurrency están explícitos antes de cualquier apply.
- [ ] Migration/backfill/rollback posture está declarado en cada task hija y validado proporcionalmente.
- [ ] Existe evidencia DB/runtime para todo cambio más allá de docs/tooling.
- [ ] Errores y evidencia de dominios sensibles usan sanitización, audit y signals canónicos.

## Capability Definition of Done — Full API Parity gate

- [ ] N/A para la umbrella como capability nueva; cada task hija que toque una acción de recovery debe demostrar primitive server-side, auth fina, idempotencia, audit/outbox, errores canónicos y camino programático.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     La task umbrella descompone workstreams y owners. No implementar
     runtime desde esta zona sin promover la unidad hija correcta.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Baseline, taxonomy and ownership

- Repetir las superficies canónicas y congelar un inventario con signal ID, severidad, count/age, source of truth, owner, causa validada/probable y nivel de autonomía permitido.
- Clasificar cada hallazgo como operación segura/runbook, `ISSUE-###`, task hija, dependencia existente o excepción aceptada con SLA.
- Decidir promoción a `EPIC-###` si el breakdown produce más de tres implementaciones independientes o un programa sostenido cross-domain.

### Slice 2 — Platform Health confidence recovery

- Coordinar con `TASK-928` el baseline per-source y verificar si batching/request cache cierra el timeout de 6000 ms.
- Si persiste, abrir una unidad hija acotada para budgets, timing evidence, snapshot stale-but-explicit y no-regresión de `safeModes`; no aumentar el timeout a ciegas.
- Cerrar solo cuando dos lecturas consecutivas producen módulos, warnings/blockers y `safeModes` coherentes.

### Slice 3 — Transport, reactive handlers and render recovery

- Validar la configuración de firma de `wh-sub-notifications`, corregir el emisor/secret binding en una unidad hija si aplica y probar un delivery firmado `200` antes del replay allowlisted.
- Investigar por `event_id` los handlers `contract_mrr_arr`, corregir la projection/contrato propietario y probar un evento nuevo antes de recuperar los dead-letters.
- Revisar `failure_code` de los renders, corregir plan/evidencia/asset y usar exclusivamente el retry de dominio.

### Slice 4 — Domain remediation packets

- Delivery/Growth: separar fallos mecánicos de Notion/HubSpot de decisiones humanas; reparar el pipeline antes de reprocesar writebacks/handoffs.
- Finance/Payroll: rematerialización y reconciliación por período/documento con dry-run, locks y sign-off contable/payroll.
- Identity/HR: resolver por sujeto y command auditado; no backfill global de RUT, SCIM, relaciones o documentos.
- Platform/Public Site: corregir el arranque de `config.webServer` en el repo propietario y exigir CI exitoso reciente.

### Slice 5 — Sustained verification and closure

- Repetir Platform Health, Reliability Overview, Internal Health, handler/webhook health y Sentry después de cada recovery.
- Observar 24 horas para transporte/runtime y 7 días para señales con ventana; documentar riesgo residual sin falsos cierres.
- Completar lifecycle/handoff/changelog y cerrar/promover cada unidad hija según evidencia real.

## Out of Scope

- Ejecutar acknowledgements, replays, deploys, flips, backfills, migraciones, rotaciones de secretos o correcciones de datos desde esta umbrella.
- Reescribir dashboards o agregar UI para representar los fallos.
- Desactivar/mutear reliability signals, Sentry o CI para mejorar el rollup.
- Ampliar `TASK-928` o apropiarse de archivos/runtime que ya tienen task/owner activo.
- Resolver toda deuda histórica no vinculada a las señales observadas el 2026-07-18.

## Detailed Spec

Cada fila del inventario de Slice 1 debe materializar un recovery packet con este shape mínimo:

- `signalId`, `moduleKey`, severidad, count/age y timestamp del baseline.
- Source of truth y reader/signal que produjo la evidencia.
- Owner humano y runtime owner.
- Causa `validated|probable|unknown`, con evidencia enlazada y consumidores afectados.
- Clasificación `read_only_check|safe_runbook|issue|task|accepted_exception`.
- Recovery primitive/command existente o gap explícito que la unidad hija debe construir.
- Dry-run, idempotency key/lock, allowlist, rollback, audit/outbox y signal post-recovery.
- Approval requerido, ambiente, cooldown y criterio binario de cierre.

El packet es evidencia documental dentro del plan/handoff; no crea una tabla transversal ni un segundo control plane. `platform-health.v1` y el Reliability Control Plane siguen siendo la lectura canónica; los ledgers de dominio siguen siendo la fuente de verdad de cada recovery.

## Rollout Plan & Risk Matrix

La umbrella es impact-only: autoriza discovery, clasificación y verificación read-only. Toda mutación queda delegada a una unidad hija o runbook explícitamente aprobado.

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Dentro de cada workstream: causa validada -> fix -> smoke nuevo -> dry-run/replay allowlisted -> señal post-recovery -> acknowledgement final, si todavía aplica.
- Ningún workstream de datos sensibles puede ejecutar apply antes de owner/sign-off y rollback verificable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Replay duplica side effects | outbox/webhooks/workers | high | idempotency key, allowlist, dry-run y audit | dead-letter/duplicate delivery + domain signal |
| Timeout se “corrige” ocultando fuentes | Platform Health | medium | timing per-source, snapshot age y contract tests | `overallStatus=unknown`, degraded source |
| Backfill altera cifras o identidad sin autoridad | finance/payroll/identity | high | task hija backend-critical + owner + snapshot + rollback | signal de drift/reconciliation |
| Acknowledgement borra la urgencia sin recovery | handler/webhook health | high | acknowledge solo después de un éxito verificado | recurrence/consecutive failures |
| Cambio externo rompe auth/firma | webhook/provider | medium | secret refs versionadas, HMAC smoke y anti-replay | HTTP 401/403, endpoint health |
| Tasks hijas pisan ownership activo | platform/growth/ops | medium | files owned explícitos + dependency map | git overlap / task lifecycle drift |

### Feature flags / cutover

- La umbrella no introduce flags.
- Cada task hija reutiliza flags/kill switches existentes o declara un default OFF y cutover propio.
- Un cambio de secreto/configuración externa requiere snapshot de estado, smoke y rollback documentado; no se ejecuta como parte de la creación de esta task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir cambios documentales de clasificación | inmediato | si |
| Slice 2 | mantener `safeModes=false` y revertir child change; no forzar healthy | <15 min según child | si |
| Slice 3 | detener dispatcher/consumer por kill switch existente o revertir child; no acknowledge | según runbook | parcial |
| Slice 4 | usar snapshot/rollback específico del dominio; bloquear apply sin prueba | según child | debe definirse antes de apply |
| Slice 5 | reabrir unidad y conservar evidencia/riesgo residual | inmediato | si |

### Production verification sequence

1. `pnpm staging:request /api/admin/platform-health --pretty`.
2. `pnpm staging:request /api/admin/reliability --pretty`.
3. `pnpm staging:request /api/internal/health --pretty`.
4. Ejecutar recommended checks devueltos por `platform-health.v1` en modo read-only.
5. Verificar child-specific smoke/dry-run en staging y detener ante cualquier `safeModes` incompatible.
6. Aplicar un solo recovery allowlisted, verificar signal/ledger/downstream y esperar el cooldown definido.
7. Repetir en producción solo con approval/sign-off del dominio.
8. Confirmar 24 h/7 d sin recurrencia antes del cierre.

### Out-of-band coordination required

- Platform/Cloud: owners de Vercel, Cloud Run, GCP Secret Manager y GitHub Actions.
- Delivery/Growth: owners de Notion y HubSpot.
- Finance/Accounting y People/Payroll/Identity: aprobación humana para cualquier cambio de dato sensible.
- Public Site: ejecución en `efeonce-web`, no en este repo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un inventario fechado de todas las señales `error|warning|unknown|awaiting_data` del baseline, con source of truth, owner, causa, primitive/runbook y siguiente acción.
- [ ] `platform-health.v1` completa dos lecturas consecutivas sin timeout del Reliability Control Plane o existe una task hija activa con baseline per-source y criterio binario de cierre.
- [ ] `TASK-928` queda consumida como dependencia, sin duplicación de su scope ni ownership.
- [ ] `wh-sub-notifications` prueba un delivery firmado nuevo con HTTP 200 antes de cualquier replay/acknowledgement de sus 14 dead-letters.
- [ ] Los handlers `contract_mrr_arr` prueban un evento nuevo exitoso después de corregir la causa y antes de recuperar sus dead-letters.
- [ ] Los renders en dead-letter se clasifican por `failure_code` y solo se reintentan mediante el command de dominio.
- [ ] Cada remediación de Delivery, Finance, Growth, Identity y Payroll está resuelta por runbook seguro o registrada como unidad hija backend-critical con owner, dry-run, rollback y runtime evidence.
- [ ] Ningún signal, Sentry issue, handler o webhook se silencia/resuelve manualmente para alterar el rollup sin evidencia downstream.
- [ ] Replays y recoveries demuestran idempotencia, audit trail y ausencia de duplicados.
- [ ] Sentry no reporta incidentes abiertos correlacionados con los workstreams cerrados y los signals permanecen estables durante su ventana de observación.
- [ ] El Public Site tiene un CI reciente exitoso que reemplaza el fallo `27657858751`; una ejecución histórica fallida no se declara resuelta sin run nuevo.
- [ ] `pnpm task:lint --task TASK-1432` reporta `template=1`, `errors=0`, `warnings=0`.
- [ ] `pnpm ops:lint --changed` no reporta errores atribuibles a esta task.

## Verification

- `pnpm task:lint --task TASK-1432`
- `pnpm ops:lint --changed`
- `pnpm staging:request /api/admin/platform-health --pretty`
- `pnpm staging:request /api/admin/reliability --pretty`
- `pnpm staging:request /api/internal/health --pretty`
- `pnpm staging:request /api/admin/ops/reactive/handler-health --pretty`
- `pnpm staging:request /api/admin/ops/webhooks/endpoint-health --pretty`
- `gh run list --repo efeoncepro/efeonce-web --workflow CI --limit 5`
- `pnpm qa:gates --changed` para cada child implementation antes de cierre.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedó sincronizado con el cierre y las tasks hijas.
- [ ] `Handoff.md` quedó actualizado con causas, recoveries, evidencia y riesgo residual.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas.
- [ ] Se invocó `greenhouse-qa-release-auditor` para cada implementación/rollout no trivial.
- [ ] Se invocó `greenhouse-documentation-governor` y `pnpm docs:closure-check` antes del cierre final.
- [ ] Toda excepción aceptada tiene owner, SLA y condición de retiro.

## Follow-ups

- Tasks/issues hijas derivadas por Slice 1; no precrear IDs hasta validar causa, ownership y frontera.
- Promover a `EPIC-###` si la taxonomía confirma un programa de más de tres implementaciones independientes.

## Open Questions

- ¿Qué signals representan defectos de sistema versus deuda operativa aceptada con SLA? La decisión se toma por señal con su owner, no por rollup global.
- ¿Qué workstreams requieren ISSUE localizado y cuáles una TASK backend-critical? Slice 1 resuelve esta taxonomía antes de mutar runtime.
