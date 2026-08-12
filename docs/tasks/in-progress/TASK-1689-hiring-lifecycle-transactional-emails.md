# TASK-1689 — Emails transaccionales del ciclo de vida de Hiring

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `sync`
- Epic: `EPIC-011`
- Status real: `Diseño confirmado; no implementada`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El pipeline de Hiring ya emite eventos outbox en cada hito (`hiring.application.created`, `hiring.assessment.assigned`, `hiring.application.stage_changed`, `hiring.application.decided`) pero ningún consumer los convierte en comunicación: ni el equipo de People se entera de una postulación nueva ni el candidato recibe acuse, aviso de test, avance de etapa o decisión. Esta task cablea 6 emails transaccionales sobre la plataforma de email canónica (Resend + templates + kill-switch + email log) vía consumers reactivos en el ops-worker, detrás de flag default-OFF.

## Why This Task Exists

Hoy el único canal de awareness de una postulación nueva es entrar al Hiring Desk. El equipo de Talent no recibe notificación con los datos del postulante, y el candidato queda en silencio durante todo el proceso: no sabe si su postulación llegó, si tiene un test pendiente, si avanzó de etapa ni cuál fue la decisión final. Eso degrada la experiencia de candidato (marca empleadora) y hace que las postulaciones se atiendan tarde. La infraestructura para resolverlo ya existe entera — eventos emitidos, plataforma de email con precedente exacto (`contractor-payable-paid-email`), kill-switch por tipo — sólo falta el cableado.

## Goal

- El buzón interno de People (`people@efeoncepro.com`, configurable) recibe un email con los datos del postulante en cada postulación nueva, venga del apply estándar o del native Growth Form.
- El candidato recibe: acuse de recibo al postular, aviso cuando se le asigna un test, aviso cuando avanza a una etapa candidate-facing, y el email de decisión (seleccionado, o agradecimiento si no fue seleccionado).
- Todo el envío es asíncrono (outbox → consumer reactivo en ops-worker), idempotente (sin double-send en retries), gobernado por flag default-OFF + kill-switch por tipo de email, y sin PII en payloads de eventos, logs ni señales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Los emails salen SOLO desde consumers reactivos consumiendo eventos `published` — nunca inline en un route handler ni en el command de hiring. El path async vive en el **ops-worker**, no en Vercel (lección `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`).
- Los eventos hiring son sin PII por diseño (comentario del event catalog): el consumer re-lee la aplicación/assessment desde PG por ID y resuelve el email del candidato al momento de consumir; nunca confiar en el payload más allá de los IDs.
- Todo envío pasa por `sendEmail` de `src/lib/email/delivery.ts` (kill-switch `greenhouse_notifications.email_type_config`, email log, dedupe `sourceEventId + sourceEntity + recipientEmail`, rate limit). No crear un sender paralelo.
- `hiring.assessment.assigned` se emite tanto para tests de candidato como para scorecards de entrevistador (`instances.ts:300` y `:337`): el consumer DEBE re-leer el assessment y notificar únicamente los candidate-facing. `[verificar]` el campo discriminador en el payload/entidad.
- `hiring.application.stage_changed` no implica email: sólo etapas candidate-facing configuradas explícitamente notifican, con nombre de etapa traducido a copy público — nunca exponer nombres de etapas internas de triage.
- Copy visible de los emails valida con `greenhouse-ux-writing` (es-CL primario; en-US si el locale del candidato lo indica vía `locale-resolver`).
- Flag default-OFF registrada en el Feature Flag State Ledger en el mismo PR; al prenderla, aplicar el protocolo multi-runtime (declarar en `services/ops-worker/deploy.sh` + `--update-env-vars` en vivo).

## Normative Docs

- `docs/tasks/complete/TASK-981-contractor-payable-paid-lifecycle.md` — precedente del consumer reactivo de email (patrón a replicar).
- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md` — intake público que emite `hiring.application.created`.
- `docs/tasks/complete/TASK-1360-hiring-assessment-engine.md` `[verificar]` — engine de assessments y evento `assigned`.
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-353` / `TASK-1367` — aggregates Hiring + intake público ya emiten los 4 eventos trigger (verificado en `store.ts:1165`, `store.ts:1229`, `decide.ts:275`, `assessment/instances.ts:300/337`).
- Plataforma de email canónica (`src/lib/email/**`, `src/emails/**`, `src/lib/email-log.ts`) — operativa.
- Registry de projections reactivas (`src/lib/sync/projections/index.ts`) + ops-worker — operativos.

### Blocks / Impacts

- `TASK-1688` — al persistir teléfono/país/mensaje, el email interno de postulación nueva debería enriquecerse con esos campos (follow-up de esa task, no bloqueo mutuo).
- Experiencia de candidato de todas las vacantes públicas activas.
- Operación diaria de Talent/People (deja de depender de revisar el Hiring Desk para enterarse).

### Files owned

- `src/lib/email/types.ts` (nuevos `EmailType` + priority map)
- `src/lib/email/templates.ts` (registro de resolvers)
- `src/emails/HiringApplicationReceivedInternalEmail.tsx`
- `src/emails/HiringApplicationConfirmationEmail.tsx`
- `src/emails/HiringAssessmentAssignedEmail.tsx`
- `src/emails/HiringStageAdvancedEmail.tsx`
- `src/emails/HiringDecisionEmail.tsx` (variantes selected/rejected)
- `src/lib/sync/projections/hiring-application-created-emails.ts`
- `src/lib/sync/projections/hiring-assessment-assigned-email.ts`
- `src/lib/sync/projections/hiring-stage-changed-email.ts`
- `src/lib/sync/projections/hiring-application-decided-email.ts`
- `src/lib/sync/projections/index.ts` (registro)
- `src/lib/hiring/notifications/` (flags, config de destinatario interno, mapping de etapas candidate-facing, resolver de recipient)
- migración seed de filas `greenhouse_notifications.email_type_config` para los tipos nuevos
- `services/ops-worker/deploy.sh` (declaración del flag)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- documentación técnica/funcional/manual de Hiring afectada

## Current Repo State

### Already exists

- Los 4 eventos trigger se emiten hoy: `hiring.application.created` y `hiring.application.stage_changed` en `src/lib/hiring/store.ts`, `hiring.application.decided` en `src/lib/hiring/decide.ts`, `hiring.assessment.assigned` en `src/lib/hiring/assessment/instances.ts` (candidate test y scorecard de entrevistador).
- Ambas entradas públicas (apply estándar y Growth Forms) convergen en `submitPublicHiringApplication` → un solo punto de emisión de `created`; no hay que cablear dos paths.
- Plataforma de email completa: `sendEmail` con kill-switch por tipo, dedupe idempotente por `sourceEventId`, email log, rate limit, locale resolver, templates React Email en `src/emails/`.
- Precedente exacto del patrón: `src/lib/sync/projections/contractor-payable-paid-email.ts` (consumer reactivo → re-read PG → resolver recipient → `sendEmail`, con skip honesto y captura sanitizada).
- Precedente del flag de email en ops-worker: `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` (`src/lib/growth/forms/flags.ts` + `services/ops-worker/deploy.sh`).

### Gap

- Cero consumers de email para eventos hiring; los 4 eventos hoy son audit/observabilidad solamente.
- No existen `EmailType` ni templates para hiring; `email_type_config` no tiene filas para estos tipos.
- No hay resolver de email/nombre del candidato desde `hiring_application` → `candidate_facet` para uso de notificaciones `[verificar]` si un reader existente lo cubre.
- No hay mapping de etapas internas → etapas candidate-facing ni definición de qué transición constituye "avance".
- No hay destinatario interno configurable para avisos de People.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/sync/projections/**` (consumers, corren en ops-worker), `src/emails/**` + `src/lib/email/**` (plataforma compartida), `src/lib/hiring/notifications/**` (política de dominio).
- Future candidate home: `remain-shared`
- Boundary: los consumers dependen sólo de eventos del catálogo + readers de hiring + `sendEmail`; el dominio hiring no importa nada de projections; la política (qué etapa notifica, destinatario interno) vive en `src/lib/hiring/notifications/` y los consumers la consumen.
- Server/browser split: 100% server-side (ops-worker); cero superficie browser.
- Build impact: `none` — los consumers deben respetar el boundary `@core` del worker (no importar theme/UI).
- Extraction blocker: comparte el registry de projections y la plataforma de email con el resto del monolito.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync` (consumers reactivos) + `migration` aditiva menor (seed de `email_type_config`)
- Source of truth afectado: ninguno se muta — los consumers son read-only sobre hiring y escriben sólo email log/outbox vía `sendEmail`.
- Consumidores afectados: ops-worker (ejecuta), buzón interno de People, candidatos externos.
- Runtime target: `local`, `staging` y `production` (ops-worker; Vercel no envía estos emails)

### Contract surface

- Contrato existente a respetar: `sendEmail` (`src/lib/email/delivery.ts`), `ProjectionDefinition` (`src/lib/sync/projection-registry.ts` `[verificar]` path exacto), eventos del catálogo `EVENT_TYPES.hiring*`.
- Contrato nuevo: 5-6 `EmailType` nuevos (`hiring_application_received_internal`, `hiring_application_confirmation`, `hiring_assessment_assigned`, `hiring_stage_advanced`, `hiring_decision_selected`, `hiring_decision_rejected`) con prioridad `transactional`; 4 projections nuevas; módulo `src/lib/hiring/notifications/` con flag + política.
- Backward compatibility: `compatible` — todo aditivo; con flag OFF el comportamiento actual no cambia en nada.
- Full API parity: N/A — no nace capability operable nueva; es un side effect de notificación sobre commands existentes. El control operativo (pausar un tipo) ya existe vía `email_type_config`.

### Data model and invariants

- Entidades/tablas/views afectadas: sólo filas seed en `greenhouse_notifications.email_type_config`; ninguna tabla nueva.
- Invariantes que no se pueden romper:
  - Un retry del dispatcher NUNCA duplica un email: `sourceEventId` = event id del outbox + `sourceEntity` = application/assessment id, dedupeados por el email log (patrón TASK-981).
  - El consumer de `assessment.assigned` sólo notifica assessments candidate-facing; un scorecard de entrevistador jamás genera email al candidato.
  - El consumer de `stage_changed` sólo notifica transiciones hacia etapas del allowlist candidate-facing; etapas internas nunca aparecen en copy.
  - El email de rechazo sólo se envía cuando la decisión quedó persistida como `rejected` re-leída de PG; su tipo tiene kill-switch propio para que Talent pueda pausarlo sin apagar el resto.
  - Skip honesto: candidato sin email resoluble, aplicación no encontrada o estado inconsistente → skip con mensaje + `captureWithDomain('hr'|'hiring')` sanitizado, nunca fallar el batch completo.
  - Cero PII en payloads outbox, logs, mensajes de projection ni señales — sólo IDs y contadores.
- Tenant/space boundary: los consumers re-leen vía readers de hiring existentes; el email interno va sólo al buzón configurado de People; ningún dato cruza a otro tenant.
- Idempotency/concurrency: eventos se consumen del bus `published`; el dedupe del email log cubre replay; dos eventos distintos del mismo tipo para la misma aplicación (p. ej. dos avances de etapa) SÍ generan emails distintos (sourceEventId distinto).
- Audit/outbox/history: `sendEmail` ya registra email log + evento outbox de delivery; no se crea audit adicional.

### Migration, backfill and rollout

- Migration posture: `additive` — sólo INSERT de filas `email_type_config` (idempotente, `ON CONFLICT DO NOTHING`), con marker `-- Up Migration` y bloque DO de verificación.
- Default state: flag `HIRING_LIFECYCLE_EMAILS_ENABLED` default OFF en los runtimes; tipos habilitados en kill-switch pero inertes sin flag. El tipo de rechazo puede nacer `enabled=false` si Talent lo pide.
- Backfill plan: `none` — no se emiten emails retroactivos por aplicaciones/etapas históricas. El consumer ignora eventos anteriores al cutover si el bus re-entrega antiguos `[verificar]` semántica de replay del dispatcher.
- Rollback path: apagar flag en ops-worker (efecto inmediato) o pausar tipo en `email_type_config`; revertir código; las filas seed quedan (inertes).
- External coordination: buzón `people@efeoncepro.com` debe existir y estar monitoreado (Outlook/M365); sender Resend ya operativo.

### Security and access

- Auth/access gate: no hay endpoint nuevo ni superficie pública nueva; los consumers corren con la identidad del worker.
- Sensitive data posture: `PII` — el email interno contiene datos del postulante (nombre, email, links, vacante; teléfono/mensaje cuando TASK-1688 aterrice) y va sólo al buzón interno; los emails al candidato contienen sólo sus propios datos + info pública de la vacante. Nada de PII en logs/señales/captures.
- Error contract: fallos de render/envío → throw → retry del dispatcher → dead-letter signal existente; fallos de datos → skip + captura sanitizada.
- Abuse/rate-limit posture: prioridad `transactional` (bypass de rate limit broadcast); el volumen está naturalmente acotado por el rate del intake público (Turnstile + rate limit de TASK-1367 aguas arriba).

### Runtime evidence

- Local checks: tests focales por consumer (trigger → recipient correcto, dedupe en replay, skip sin email, scorecard no notifica, etapa no-allowlisted no notifica, rejected vs selected) + render de los 5 templates.
- DB/runtime checks: migración seed aplicada y verificada con SELECT; email log con filas `sent` tras ejercicio en staging.
- Integration checks: en staging con flag ON en ops-worker: postulación de prueba end-to-end (apply → email interno + acuse), asignar test, avanzar etapa, decidir selected y rejected — verificando recepción real y contenido.
- Reliability signals/logs: `sync.outbox.dead_letter` y `sync.outbox.unpublished_lag` en 0 tras el ejercicio; búsqueda de PII en logs del worker en 0 hallazgos.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task produce plan.md según TASK_PROCESS.md.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tipos, templates y seed

- Agregar los `EmailType` nuevos + priority map `transactional` + registro en `templates.ts` con preview meta.
- Crear los 5 templates React Email (interno, acuse, test asignado, avance de etapa, decisión con variantes) con copy es-CL validado por `greenhouse-ux-writing` y soporte en-US vía locale resolver.
- Migración seed idempotente de `email_type_config`.

### Slice 2 — Política de dominio + consumer de postulación nueva

- Crear `src/lib/hiring/notifications/`: flag `HIRING_LIFECYCLE_EMAILS_ENABLED` (default OFF), destinatario interno configurable (default `people@efeoncepro.com`), resolver de recipient del candidato (application → candidate_facet → email/nombre/locale), allowlist de etapas candidate-facing con su copy público.
- Consumer `hiring-application-created-emails`: email interno con datos del postulante + acuse al candidato, con dedupe y skip honesto. Registrar en `projections/index.ts` + tests.

### Slice 3 — Consumers de test y etapa

- Consumer `hiring-assessment-assigned-email`: re-lee el assessment, filtra a candidate-facing, envía aviso con instrucciones/link de acceso `[verificar]` cómo accede el candidato al test (token público de `public-taking.ts`).
- Consumer `hiring-stage-changed-email`: notifica sólo avances hacia etapas del allowlist, con nombre público de etapa. Tests de ambos.

### Slice 4 — Consumer de decisión + rollout

- Consumer `hiring-application-decided-email`: variante selected (felicitación + próximos pasos) y rejected (agradecimiento, tono cuidado). Kill-switch independiente para el tipo rejected.
- Declarar flag en `services/ops-worker/deploy.sh` + fila en Feature Flag State Ledger; ejercicio end-to-end en staging con evidencia; prender en producción según secuencia de rollout; documentación técnica/funcional/manual.

## Out of Scope

- Emails de marketing, nurturing o campañas a candidatos; cualquier automatización CRM.
- Notificaciones in-app, Teams o de otro canal para estos hitos (follow-up si se pide).
- Editor/preview de templates para operadores; personalización por vacante.
- Cambios al pipeline de hiring, sus etapas o sus commands; sólo se consume lo que ya se emite.
- Backfill/notificación retroactiva de aplicaciones históricas.
- Persistir teléfono/país/mensaje del candidato (eso es TASK-1688; este email interno los incorpora cuando existan).
- Digest/resumen periódico para People (el aviso es por evento).

## Detailed Spec

Mapa evento → email:

| # | Email | Trigger | Destinatario | EmailType |
|---|---|---|---|---|
| 1 | Postulación nueva (datos del postulante) | `hiring.application.created` | buzón People interno | `hiring_application_received_internal` |
| 2 | Acuse de recibo | `hiring.application.created` | candidato | `hiring_application_confirmation` |
| 3 | Test asignado | `hiring.assessment.assigned` (sólo candidate-facing) | candidato | `hiring_assessment_assigned` |
| 4 | Avance de etapa | `hiring.application.stage_changed` (sólo allowlist) | candidato | `hiring_stage_advanced` |
| 5 | Seleccionado | `hiring.application.decided` (selected) | candidato | `hiring_decision_selected` |
| 6 | No seleccionado (agradecimiento) | `hiring.application.decided` (rejected) | candidato | `hiring_decision_rejected` |

Cada consumer replica el patrón de `contractor-payable-paid-email.ts`: `extractScope` desde IDs del payload → `refresh` re-lee PG → resuelve recipient → `sendEmail` con `sourceEventId`/`sourceEntity` → retorna mensaje sin PII. La política de qué notificar vive en `src/lib/hiring/notifications/`, no en el consumer.

Decisiones que el agente ejecutor debe cerrar en plan mode (Zone 2): (a) allowlist inicial de etapas candidate-facing y su copy; (b) si el tipo rejected nace pausado (`enabled=false`) para envío controlado por Talent; (c) shape exacto del payload de cada evento (leer emisores citados) y el discriminador candidate-test vs scorecard.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tipos/templates/seed) → Slice 2 (política + created) → Slice 3 (test/etapa) → Slice 4 (decisión + rollout).
- La migración seed se aplica antes de desplegar consumers; el flag permanece OFF en todos los runtimes hasta completar el ejercicio de staging del Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Double-send al candidato en retry del dispatcher | ops-worker / email | medium | dedupe email log por sourceEventId + tests de replay | email log con duplicados; quejas |
| Email de candidato disparado por scorecard de entrevistador | hiring / email | medium | re-read + filtro candidate-facing + test negativo | email log tipo assessment sin test real |
| Exponer etapa interna o tono incorrecto en copy | brand / candidato | medium | allowlist + copy validado ux-writing + review humana de templates | QA de staging |
| Rechazo automático enviado en momento inoportuno | People / candidato | medium | kill-switch propio del tipo rejected + decisión (b) de plan mode | feedback Talent |
| Flag prendido sólo con `--update-env-vars` y borrado por próximo deploy | ops-worker | high (precedente real) | declarar en deploy.sh + ledger + verificación en revisión activa | consumer loggea `skip: flag OFF` |
| PII en logs/señales del worker | privacy | low | mensajes de projection sólo con IDs + revisión de logs en staging | búsqueda de PII en logs |
| Fallo de render/envío bloquea el batch reactivo | sync | low | skip honesto para fallos de datos; throw sólo transitorios | `sync.outbox.dead_letter` > 0 |

### Feature flags / cutover

- `HIRING_LIFECYCLE_EMAILS_ENABLED` — default OFF, se lee ÚNICAMENTE en los consumers (ops-worker). Registrar en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR (fila en inventario + "Pendientes de acción" si queda code-complete). Prenderla = `deploy.sh` + `--update-env-vars` + verificar revisión activa + ejercitar flujo real.
- Kill-switch fino por tipo en `email_type_config` (pausable en caliente sin deploy); `hiring_decision_rejected` con fila propia para pausa independiente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revert PR; filas seed quedan inertes | <10 min | sí |
| 2 | Revert PR o flag OFF; sin efecto con flag OFF | <10 min / inmediato | sí |
| 3 | Ídem Slice 2 | <10 min / inmediato | sí |
| 4 | Flag OFF en ops-worker (inmediato) o pausar tipo puntual en kill-switch | inmediato | sí |

### Production verification sequence

1. Migración seed aplicada en staging + producción; verificar filas con SELECT read-only.
2. Deploy de consumers con flag OFF; verificar que el worker arranca sano y no envía nada (log `skip: flag OFF`).
3. Prender flag en staging (deploy.sh + live update); ejercicio end-to-end: postulación de prueba → email interno + acuse; asignar test; avanzar etapa allowlisted y una no-allowlisted (no debe enviar); decidir selected en una aplicación y rejected en otra. Verificar recepción real, contenido, y email log.
4. Revisar logs del worker: cero PII, cero dead-letter, dedupe verificado re-procesando un evento.
5. Prender en producción con la misma secuencia; primera postulación real monitoreada; Talent confirma recepción del email interno.
6. Actualizar ledger con estado final por runtime.

### Out-of-band coordination required

- Confirmar con People/Talent el buzón destino (`people@efeoncepro.com`) y que está monitoreado en Outlook/M365.
- Revisión humana de Talent del copy de los 5 templates ANTES de prender en producción (especialmente el de rechazo).
- Decisión operativa: rechazo inmediato al decidir vs pausado para envío controlado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada uno de los 6 emails se envía ante su trigger real en staging, verificado con recepción efectiva (no sólo email log).
- [ ] Ambas entradas públicas (apply estándar y native Growth Form) producen el email interno + acuse, sin cableado duplicado.
- [ ] Re-procesar el mismo evento no duplica ningún email (dedupe por sourceEventId probado con test + ejercicio real).
- [ ] Un scorecard de entrevistador no genera email al candidato (test negativo).
- [ ] Una transición a etapa no-allowlisted no genera email; el copy de etapas nunca expone nombres internos.
- [ ] `hiring_decision_rejected` es pausable de forma independiente en `email_type_config` sin afectar los otros tipos.
- [ ] Con `HIRING_LIFECYCLE_EMAILS_ENABLED` OFF (default), no se envía absolutamente nada y el resto del pipeline hiring no cambia.
- [ ] El flag está declarado en `services/ops-worker/deploy.sh` y registrado en el Feature Flag State Ledger con estado por runtime.
- [ ] Ningún log, señal, payload outbox ni mensaje de projection contiene PII del candidato (sólo IDs/contadores).
- [ ] Copy es-CL validado con `greenhouse-ux-writing`; templates revisados por Talent antes del flip de producción.
- [ ] Documentación técnica, funcional y manual de Hiring actualizadas con los nuevos emails y su operación (pausar/reanudar tipos).

## Verification

- `pnpm task:lint --task TASK-1689`
- tests focales de los 4 consumers (trigger, recipient, dedupe/replay, skips, filtros negativos) + render de templates.
- `pnpm test src/lib/hiring src/lib/sync/projections` focal + `pnpm local:check`.
- migración seed en local/staging + SELECT read-only de `email_type_config`.
- ejercicio end-to-end en staging con flag ON según Production verification sequence (pasos 1-4).
- `pnpm flags:audit` — el flag nuevo tiene fila en el ledger.
- `pnpm qa:gates --changed` y `pnpm ops:lint --changed`.
- `pnpm docs:closure-check` y, si se edita `Handoff.md` o `changelog.md`, `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [ ] `Lifecycle` y carpeta quedan sincronizados con estado real.
- [ ] `docs/tasks/README.md` y registro de IDs quedan sincronizados.
- [ ] Feature Flag State Ledger refleja el estado real por runtime; si el flip de producción queda pendiente, el cierre declara `code complete, rollout pendiente`.
- [ ] `Handoff.md` y `changelog.md` actualizados.
- [ ] Se revisó impacto sobre TASK-1688 (enriquecer email interno cuando existan teléfono/país/mensaje → dejar Delta allí).
- [ ] No queda evidencia versionada con PII de candidatos.

## Follow-ups

- Enriquecer el email interno con teléfono/país/mensaje cuando TASK-1688 aterrice.
- Notificación in-app/Teams para People como canal adicional, si el email interno resulta insuficiente.
- Recordatorio automático de test no completado (requiere política de plazos propia).
