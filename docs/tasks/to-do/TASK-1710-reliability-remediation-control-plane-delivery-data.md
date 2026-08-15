# TASK-1710 — Programa de remediación de confiabilidad: control plane, entregas y datos críticos

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
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diagnóstico runtime verificado; remediación no iniciada`
- Rank: `1`
- Domain: `ops`
- Blocked by: `Aprobación humana por cada mutación de datos, configuración externa o despliegue`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Coordinar la recuperación verificable de los hallazgos de confiabilidad medidos el `2026-08-15`, sin ocultar señales ni convertir el control plane en un dashboard optimista. El programa separa la corrección de control plane, entrega webhook, carriles async, datos fiscales, Notion/HubSpot y costo Cloud Run en cambios dueños, reversibles y con evidencia runtime.

No implementa todas las correcciones en un único PR. Es la frontera de priorización, seguridad, secuencia y cierre: cada workstream se ejecuta en su dueño existente mediante `Delta` + criterios verificables, o en una task backend crítica nueva cuando no haya dueño real.

## Why This Task Exists

La revisión diaria canónica encontró dos verdades simultáneas:

- La infraestructura base de staging respondió correctamente: Cloud SQL, BigQuery, WIF, observabilidad y `pnpm pg:doctor` estaban sanos; el reader canónico no reportó incidentes Sentry abiertos.
- La plataforma no era operativamente segura para automatización: `GET /api/admin/platform-health` devolvió `overallStatus='unknown'`, todas las `safeModes` en `false` y `agentAutomationSafe=false`, porque `reliability_control_plane` agotó su presupuesto de `6000 ms`. El overview directo sí completó, pero tardó aproximadamente `19 s` y reveló `7` módulos en error.

Un timeout del compositor no invalida las señales que el reader directo alcanzó a producir. Es una degradación del control plane que debe corregirse junto con las fallas reales, sin aumentar timeouts a ciegas ni reconocer dead-letters para pintar verde.

La evidencia de la revisión fue:

| Superficie | Evidencia observada | Consecuencia |
| --- | --- | --- |
| `platform-health.v1` | `reliability_control_plane` excedió `6000 ms`; response `unknown`; `agentAutomationSafe=false` | Se prohíben mutaciones automáticas hasta restaurar una decisión segura. |
| Webhooks | `wh-sub-notifications` en `failed`; HTTP `401`; razón `missing_signature`; `15` dead-letters activos | Entregas de notificaciones no se deben reconocer ni borrar antes de reparar autenticidad y comprobar una entrega real. |
| Reactive handlers | Dos `contract_mrr_arr` fallidos con `3` dead-letters cada uno; `hubspot_services_intake` degradado desde `2026-08-14` | Requiere separar la causa de cada handler de la capability horizontal de replay. |
| Finance | IVA `1`, retenciones `1`, PPM `8` en drift; falta rate MXN/CLP; `1` payable vencido; `14` gastos sin distribución | Afecta posiciones fiscales y pagos: no admite backfill masivo ni SQL manual. |
| Delivery / Notion | `50` transiciones no capturadas; `12` writebacks RpA pendientes por más de 30 min, máximo medido `114684 min` | El origen puede ser scheduler, consumer, flag o token; primero se restituye el carril y luego se reprocesa idempotentemente. |
| Growth / HubSpot | `4` leads con consentimiento y score listos no llegaron a HubSpot | Debe reusar el handoff canónico, sin introducir un cliente HubSpot paralelo. |
| Cloud cost | Forecast GCP mensual `CLP 372.691`, contra error desde `CLP 135.000`; Cloud Run = `60,3%` del gasto observado | La optimización exige atribución por servicio/Job y evidencia de carga antes de alterar escalado, concurrencia o jobs. |

## Goal

- Recuperar un `platform-health.v1` útil, puntual y honesto: ninguna fuente lenta puede ocultar su causa ni bloquear indiscriminadamente la capacidad de diagnóstico.
- Reparar los caminos que hoy fallan y restaurar sus datos por primitives canónicos, con scope explícito, idempotencia, auditoría y aprobación proporcional.
- Dejar las señales prioritarias en `ok`, o documentar una excepción con owner, evidencia, plazo y criterio de salida; nunca bajar una severidad para cerrar el programa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (sección Platform Health)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- `platform-health.v1.safeModes` gobierna la acción automatizada. Si `agentAutomationSafe=false`, no se ejecutan acknowledgements, replays, backfills, flags, cambios de secretos, deploys ni cambios de configuración externa por conveniencia.
- Un `acknowledge` solo archiva del KPI y conserva auditoría; no repara una entrega. Está prohibido usar `POST /api/admin/ops/webhooks/endpoint-health` o el acknowledgement de handler para silenciar el hallazgo antes de una prueba de causa raíz y de una recuperación verificable.
- Ningún replay usa SQL directo ni drena globalmente. Debe pasar por el primitive canónico, declarar `dryRun`, scope, límite, idempotency key o dedupe existente, actor y evidencia posterior.
- Los drifts de IVA, retención y PPM se corrigen por período y entidad legal con validación contable. Jamás se corrigen ajustando un reader, una señal o un agregado sin reconciliar el documento fuente.
- Los cambios de secrets, firma HMAC, flags multi-runtime, Scheduler, Cloud Run, HubSpot o Notion requieren su runbook, validación staging y autorización del owner; nunca se imprimen secretos, tokens, cabeceras firmadas ni errores crudos.
- Las señales Sentry se investigan y se cierran solo después de corregir la causa. No se silencian ni se resuelven para mejorar el dashboard.
- Cada subtrabajo ejecuta su propia evaluación ADR si cambia source of truth, schema/proyección compartida, auth, finanzas, webhook, API externa, cloud/deploy/secrets o workflow de agentes.

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/manual-de-uso/operations/operar-integraciones-y-sync.md`

## Dependencies & Impact

### Depends on

- `TASK-251` — capability horizontal de backlog/reactive replay; no duplicar su primitive ni su semántica de scope.
- `TASK-585` — postura/costo del servicio `notion-bq-sync`; no confundirla con el writeback RpA ni con el costo total Cloud Run.
- `TASK-653` — exposición de confiabilidad por API Platform; no abrir un endpoint de health paralelo.
- `TASK-1242` (complete) — handoff Growth AI Visibility → HubSpot; el hallazgo de cuatro leads se trata como regresión del owner existente, mediante `Delta` y criterios nuevos o follow-up explícito.
- `TASK-1185`, `TASK-1188` y `TASK-1189` (complete) — contratos de materialización IVA, retenciones y PPM; los drifts actuales son datos/runtime, no autorización para reemplazar esos contratos.

### Blocks / Impacts

- Confiabilidad de automatizaciones, operaciones y diagnósticos de agente que consumen `platform-health.v1`.
- Entrega de notificaciones y proyecciones comerciales/reactivas.
- Exactitud de posiciones F29, tesorería y reporting financiero interno.
- Integridad de Delivery/Notion, conversión Growth → HubSpot y control de gasto GCP.
- La tarea no bloquea funcionalidad de usuario por defecto; cada workstream debe declarar si un riesgo requiere containment temporal fail-closed.

### Files owned

- `docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md`
- `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md` (Delta/criterios solamente)
- `docs/tasks/to-do/TASK-585-notion-bq-sync-cost-efficiency-hardening.md` (Delta/criterios solamente, si la atribución confirma relación)
- `docs/tasks/to-do/TASK-653-api-platform-ops-reliability-read-surface.md` (Delta/criterios solamente, si toca contrato API)
- `docs/tasks/complete/TASK-1242-growth-ai-visibility-hubspot-lead-handoff.md` (Delta de regresión o follow-up enlazado; no reescribir su historia)

Los archivos de runtime los posee la task hija o el owner existente asignado durante Slice 1. Esta umbrella no autoriza editar simultáneamente `src/lib/platform-health/**`, `src/lib/webhooks/**`, `src/lib/finance/**`, `src/lib/notion-metrics/**`, `src/lib/sync/**` o `services/ops-worker/**`.

## Current Repo State

### Already exists

- `src/lib/platform-health/composer.ts`, `with-source-timeout.ts` y `safe-modes.ts` componen health read-only, degradación por fuente y decisiones conservadoras.
- `src/app/api/admin/platform-health/route.ts`, `src/app/api/admin/reliability/route.ts` y `src/app/api/internal/health/route.ts` son las superficies canónicas consultadas por la revisión.
- `src/lib/webhooks/endpoint-health.ts` mantiene health por subscription; `src/app/api/admin/ops/webhooks/endpoint-health/route.ts` expone su lectura y un acknowledgement auditado.
- `src/lib/finance/vat-ledger.ts`, `retention-ledger.ts` y `ppm-ledger.ts` contienen los materializadores fiscales; sus señales detectan drifts en vez de maquillar agregados.
- `src/lib/notion-metrics/**`, `src/lib/sync/projections/notion-status-transition-capture.ts` y `notion-rpa-writeback.ts` ya contienen la cadena de captura/writeback y sus readers de confiabilidad.
- `src/lib/sync/projections/growth-ai-visibility-lead-handoff.ts` es el consumer canónico del handoff Growth → HubSpot.
- `src/lib/cloud/gcp-billing.ts` y `src/app/api/admin/cloud/gcp-billing/route.ts` son el reader/surface de billing GCP existentes.

### Gap

- El timeout de la fuente `reliability_control_plane` deja el contrato agregado sin módulos ni causa accionable, aunque el reader directo entrega evidencia después del presupuesto. Falta una estrategia de performance y degradación que preserve las garantías de `platform-health.v1`.
- Existe al menos una subscription con firma ausente o desalineada y dead-letters activos; el endpoint actual prueba que hay una falla, no que el destino ya sea seguro para replay.
- Las señales detectan drifts críticos, pero la remediación actual no tiene un paquete coordinado que fuerce identificación, `dryRun`, aprobación, apply acotado y verificación posterior por cada dominio.
- Varios hallazgos pertenecen a foundations previas completas. Crear otra implementación genérica duplicaría owners y volvería incierta la fuente de verdad.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: coordinación documental en `docs/tasks/`; los consumers reales viven en Vercel (`src/app/**`), domain primitives (`src/lib/**`), `services/ops-worker/**`, PostgreSQL, Cloud Run y providers externos.
- Future candidate home: `remain-shared`
- Boundary: esta task solo compone evidencia y criterios. Los boundaries de ejecución siguen siendo `getPlatformHealth`, los commands/readers de finanzas, los consumers reactivos, `recordWebhookOutcome`/delivery y los adapters de Notion, HubSpot y GCP; routes, UI y automatizaciones consumen esos primitives, nunca lógica copiada desde esta umbrella.
- Server/browser split: `n/a` para la umbrella. Toda verificación de datos, secret, webhook, provider y mutation vive server-side detrás del primitive dueño; ningún secreto, error raw ni payload sensible cruza al browser.
- Build impact: `none` — no introduce runtime, SDK, filesystem input, `apps/*` ni `packages/*`.
- Extraction blocker: la coordinación atraviesa transacciones PostgreSQL, autenticación HMAC/OIDC, flags multi-runtime y providers externos. La umbrella no crea una nueva frontera de deploy; cada child declara su propio blocker y placement.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Triage congelado y partición por owner

- Capturar un snapshot read-only con `platform-health.v1`, reliability overview, internal health, handler health, webhook endpoint health, Sentry reader y billing. Registrar timestamps, deployment/environment y versión sin secretos ni PII.
- Clasificar cada hallazgo como: defecto de plataforma, entrega externa, dato fiscal, dato operativo, deuda de proceso o presupuesto. Un mismo evento puede producir varias señales; se identifica la causa compartida antes de abrir trabajo duplicado.
- Para cada workstream, elegir exactamente una ruta: `Delta` sobre owner vigente, issue si el incidente está acotado, o task hija `backend-critical` con ADR assessment. No crear una task hija si un owner real ya cubre el boundary.
- Mantener el estado global como `degradado` mientras haya una señal error no exceptuada. El objetivo de Slice 0 no es bajar severidades.

### Slice 1 — Recuperar la utilidad del Platform Health Control Plane

- Perfilar `getPlatformHealth` y `getReliabilityOverview` por fuente/reader, con presupuestos, consultas y cachés observables. Determinar qué readers hacen que la fuente agregada supere `6000 ms` sin asumir que un query es el culpable.
- Diseñar una corrección que preserve `contractVersion='platform-health.v1'`, `degradedSources`, redacción y semántica conservadora de safe modes. Las opciones válidas incluyen optimizar/query-scope, cache server-side con freshness explícita o descomponer una fuente lenta; aumentar globalmente el timeout solo se permite si se demuestra que conserva la disponibilidad del endpoint bajo carga.
- Añadir pruebas de presupuesto y una prueba de regresión: si una fuente excede su límite, el payload conserva la fuente degradada y su recomendación, no retorna un falso `healthy` ni un payload vacío sin diagnóstico.
- Validar contra staging con overview directo y endpoint agregado. El rollback debe poder restaurar la composición previa mediante revert de código, sin tocar datos.

### Slice 2 — Restaurar la entrega de `wh-sub-notifications`

- Investigar la cadena `outbound delivery → target URL → signature generation → notification dispatch verification` para explicar `401 missing_signature`; contrastar subscription, configuración runtime y handler receptor sin revelar la firma ni su secreto.
- Corregir el lado dueño de la firma o de la verificación con un contrato explícito: algoritmo, header esperado, payload exacto, timestamp/replay protection y fallo fail-closed. Cualquier cambio de secreto o env var sigue el runbook de secretos y requiere coordinación humana.
- Ejecutar una entrega sintética/controlada en staging y comprobar en el ledger que pasa a `succeeded` antes de reprocesar datos históricos.
- Reprocesar solo las `15` entregas candidatas mediante primitive existente o command nuevo con `dryRun`, allowlist de IDs, idempotencia y audit. No llamar acknowledgement hasta que cada delivery esté `succeeded` o tenga una resolución de negocio documentada.

### Slice 3 — Drenar reactive handlers sin esconder su causa

- Asignar a `TASK-251` la capacidad común de diagnóstico/replay únicamente si sus primitives cubren el scope requerido; no modificar la task para absorber bugs de negocio de `contract_mrr_arr`, `hubspot_services_intake`, `sample_sprint_hubspot_outbound` o `quotation_hubspot_outbound`.
- Para cada handler fallido, recuperar su error sanitizado, evento de origen, versión de payload y consumer responsable. Determinar si la reparación es schema/contract, dependencia externa, dato inválido o configuración.
- Implementar el fix en el owner del handler. Solo después ejecutar `dryRun` scoped y replay con límite, verificar dedupe `(event_id, handler)`, auditoría y transición desde `failed/degraded` por una ejecución exitosa real.
- Documentar por separado los handlers históricos sin eventos recuperables; un estado legacy no se presenta como healthy hasta que su policy de archivo/auditoría esté aprobada.

### Slice 4 — Reconciliar posiciones financieras y datos de pago

- Ejecutar readers/querys read-only que enumeren los IDs y períodos detrás de `finance.vat.position_drift=1`, `finance.retention.position_drift=1` y `finance.ppm.position_drift=8`; confirmar entidad legal, documento fuente, razón del drift y materializador dueño.
- Preparar un `dryRun` por período para la rematerialización canónica. El paquete de aprobación incluye diff antes/después, impacto en F29, evidencia de rate y firma del responsable financiero. Está prohibido `UPDATE` manual a posiciones/ledgers o un apply global.
- Aplicar por lote mínimo con advisory lock/idempotencia del materializador, validar el agregado contra fuentes canónicas y volver a leer las tres señales. Si una señal persiste, detener el lote y abrir el diagnóstico de causa, no reintentar indefinidamente.
- Tratar MXN sin tasa, payable contractor vencido y gastos sin distribución como subcasos distintos: tasa desde fuente aprobada y fecha efectiva; pago a través de autorización de tesorería; distribución por workflow contable. Ninguno se “corrige” desde el dashboard de confiabilidad.

### Slice 5 — Recuperar Delivery/Notion y Growth/HubSpot

- Para las `50` transiciones de Notion y los `12` writebacks RpA atrasados, comprobar en orden: cron/Scheduler, run tracking, flags multi-runtime, token/provider, consumer y estado de cola. Registrar el primer punto de falla con evidencia.
- Restituir la causa raíz y verificar un evento nuevo end-to-end antes de reprocesar. El replay usa los runners/commands canónicos y confirma que las `2927` razones inferidas siguen conservadoras; no auto-confirma razones de reprogramación.
- Abrir un Delta en `TASK-1242` o un follow-up derivado que mantenga el mismo consumer `growth-ai-visibility-lead-handoff`. Verificar consentimiento, elegibilidad, payload y HubSpot adapter; reencolar los cuatro handoffs solo después de que un lead de prueba controlado llegue y quede auditado.
- No crear un POST HubSpot inline, cliente paralelo ni nuevos workflows que salten el outbox/consumer existente.

### Slice 6 — Contener el forecast GCP sin degradar carga válida

- Atribuir el forecast a servicio, SKU, Job/revisión, duración, concurrencia, min/max scale y patrón de invocación. Empezar por Cloud Run (`60,3%`), `globe-producer-worker` y `globe-asset-governance`, pero distinguir costo compartido, costo transitorio y crecimiento esperado.
- Comparar el período observado, promedio diario y forecast contra una ventana histórica equivalente. No tomar el forecast de nueve días como prueba suficiente de una fuga sin corroborar unidades, descuentos y fechas de export.
- Proponer cambios en orden de menor riesgo: eliminar invocación accidental, corregir scheduler/cadencia, ajustar idle/min scale con smoke, y solo después revisar concurrencia/CPU/memoria. Todo cambio de infraestructura requiere ADR assessment, canary, guardrail de costo y rollback exacto.
- Verificar que cualquier ahorro no reintroduzca los lags de Notion, webhooks, materializadores o workers; el costo y la confiabilidad se revisan juntos.

### Slice 7 — Cierre, excepciones y prevención de recurrencia

- Reconsultar todas las superficies canónicas después de cada workstream y publicar una matriz `hallazgo → causa → cambio → evidencia → rollback → owner`.
- Exigir que las señales queden en `ok` por evidencia runtime. Una excepción válida requiere owner humano, razón de negocio, fecha límite, impacto, plan de retiro y señal que la vigila; `warning` no se transforma en `ok` por texto documental.
- Confirmar que `platform-health.v1` deja de ser `unknown` por timeout y que sus `safeModes` reflejan el estado real. El valor `agentAutomationSafe=true` solo se declara tras una respuesta canónica sana; no se fuerza desde código para permitir el programa.
- Cerrar con runbooks actualizados, deltas de tasks dueñas, evidencia de Sentry y docs de handoff proporcionales. Si un hallazgo pide cambio de contrato durable, crear/actualizar ADR antes de cerrar el child correspondiente.

## Out of Scope

- Reescribir el Reliability Control Plane, sustituir Sentry, crear un dashboard nuevo o abrir endpoints de health paralelos.
- Marcar como resueltos issues Sentry, dead-letters o handlers solo para modificar un KPI.
- Aplicar migraciones, backfills, rotaciones de secretos, cambios de producción, flags, Scheduler, Cloud Run, HubSpot o Notion desde esta umbrella sin el child aprobado y su runbook.
- Convertir errores de proceso humano (pagos vencidos, confirmación de razón, propuestas de crédito Globe) en cambios automáticos de datos.
- Absorber las tareas completas de `TASK-251`, `TASK-585`, `TASK-653`, `TASK-1185`, `TASK-1188`, `TASK-1189` o `TASK-1242` bajo un nuevo owner.

## Detailed Spec

### Modelo de decisión para cada señal

Cada remediación debe producir este paquete mínimo antes de mutar:

1. **Hecho observable:** nombre de señal, timestamp, ambiente, conteo y reader/query fuente.
2. **Causa raíz demostrada:** no basta correlación temporal; debe existir la capa precisa que falla (contrato, dato, scheduler, token, configuración o proveedor).
3. **Primitive dueño:** command/reader/consumer/handler que realizará la reparación. Si no existe, el child crea uno con Full API Parity proporcional.
4. **Plan reversible:** `dryRun`/allowlist/batch, audit, rollback y condición de stop.
5. **Evidencia posterior:** ejecución real exitosa, relectura de la señal y ausencia de regresión en dependencias.

### Matriz de workstreams y salida mínima

| Workstream | Dueño inicial | Primera acción segura | Mutación permitida solo tras | Criterio de salida |
| --- | --- | --- | --- | --- |
| Timeout Platform Health | task hija platform backend-standard | timings/read-only por fuente | ADR assessment si cambia contrato/cache; tests de timeout | `/api/admin/platform-health` responde payload útil sin timeout de RCP y sin false healthy. |
| Firma notifications | task hija webhook backend-critical | inspección sanitizada de target/headers/ledger | smoke firmado staging + aprobación para secret/config | entrega nueva `succeeded`; backlog histórico procesado/exceptuado con auditoría. |
| Handlers reactivos | owner del handler + `TASK-251` si corresponde | `GET` handler health + payload/error sanitizado | fix dueño + `dryRun` scoped | handler recupera mediante éxito real; ninguna fila se oculta con ack prematuro. |
| IVA/retención/PPM | task hija finance backend-critical | enumerate IDs/períodos + dry-run | sign-off contable + plan de rollback | drifts `0` o excepción contable firmada y temporal. |
| Notion/Delivery | owner sync/delivery backend-critical | comprobar scheduler→run→flag→token→consumer | smoke de evento nuevo y replay idempotente | transición/writeback nuevos sanos; backlog recuperado con evidencia. |
| Growth→HubSpot | `TASK-1242` Delta/follow-up | leer elegibilidad, consent y outbox | smoke controlado + confirmación de adapter | cuatro handoffs trazables o excepción consentida documentada. |
| FinOps Cloud Run | task hija cloud backend-critical | atribución read-only por SKU/revisión | ADR assessment + canary + rollback | forecast bajo umbral o variación explicada y aprobada; sin degradar workers. |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST complete before any child mutation, acknowledgement, replay, backfill, provider configuration or deploy.
- Slice 1 MUST establish una lectura de health accionable before attempting to restore automated safe modes.
- Slice 2 (webhook) and Slice 3 (reactive) may proceed in parallel only after their independent causes and rollback plans are approved.
- Slice 4 (finance) never shares an apply batch with Slice 3 or Slice 5; financial sign-off and period-level verification are a hard gate.
- Slice 5 may replay only after a new event proves the chain healthy. Slice 6 may optimize cost only after checking that no reliability remediation needs that capacity.
- Slice 7 is last; no child is declared complete based solely on code, CI or a stale dashboard.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El endpoint vuelve a reportar `healthy` al ocultar una fuente lenta | platform health | medium | conservar `degradedSources`, pruebas de presupuesto y semántica fail-closed de safe modes | `platform-health.v1` + latencia por fuente |
| Reintento duplica notificaciones o replaya un payload incompatible | webhook / outbox | high | smoke previo, allowlist, dedupe, audit y command idempotente; nunca acknowledgement previo | `webhook_endpoint_health`, delivery ledger |
| Rematerialización altera una posición fiscal correcta | finance | high | dry-run por período, sign-off contador, advisory lock, batch mínimo y reconciliación F29 | `finance.*.position_drift` |
| Replay Notion propaga estado viejo o confirma razones inferidas | delivery | medium | comprobar primera falla, evento nuevo, runner canónico y no auto-confirmar razones | `notion.task_status_transitions.recorded_vs_current_drift`, `notion.metrics.writeback_lag` |
| Handoff HubSpot viola consentimiento o crea CRM duplicado | growth / CRM | medium | reusar consumer 1242, validar consentimiento/elegibilidad, test controlado y idempotencia | `growth.ai_visibility.lead_handoff_uncovered` |
| Reducción de gasto corta capacidad necesaria | Cloud Run | high | attribution antes de cambio, canary, health/smoke de workers y rollback de configuración | `cloud.billing.*`, lags de worker y Scheduler |
| Cambios simultáneos pisan trabajo ajeno | repositorio compartido | medium | tareas separadas por owner, cambios mínimos, no branch/worktree y `git status` antes de editar | revisión de diff y gates de cierre |

### Feature flags / cutover

- Esta umbrella no introduce flags ni cambia valores existentes.
- Cada child que cambie una cadena async, provider o materializador debe declarar los flags multi-runtime correspondientes, default, owner, ambiente, smoke y reversión. `NODE_ENV` no distingue staging de producción; se usa `VERCEL_ENV` donde aplique.
- Un flag se revierte solo después de verificar que la reversión no deja items a medio procesar. La comprobación incluye el reader del dominio, run tracking y la señal que motivó el cambio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | N/A — diagnóstico/documentación read-only | inmediato | sí |
| Slice 1 | revert del child de composición/cache; revalidar payload y timeout | minutos | sí |
| Slice 2 | revert de código/configuración al contrato de firma anterior solo si el receptor compatible; preservar ledger y detener replay | minutos, con coordinación | parcial |
| Slice 3 | detener command/replay; revert del fix; no borrar `outbox_reactive_log` | minutos | sí para código, no para evidencia |
| Slice 4 | detener batch; revert del materializador/flag; reparar por período documentado, nunca borrar ledger | depende del período | parcial |
| Slice 5 | detener consumer/scheduler según runbook; revert del fix; preservar colas/audit para replay posterior | minutos | sí para código, no para datos ya aceptados |
| Slice 6 | restaurar configuración Cloud Run/Scheduler previa y verificar workers | minutos, con coordinación | sí |

### Production verification sequence

1. Tomar baseline read-only de todas las surfaces de la tabla de evidencia y confirmar el estado de `safeModes`.
2. Por cada child, pasar tests focales y el runbook staging sin datos sensibles; validar la señal y el ledger/reader antes y después.
3. Ejecutar un único cambio reversible por ambiente; esperar la evidencia runtime declarada antes del siguiente workstream.
4. Para replay/backfill, correr `dryRun`, revisar allowlist y diff, obtener aprobación, aplicar lote mínimo y reconsultar la señal inmediata.
5. Repetir en producción solo cuando staging esté verde y el owner externo haya aprobado; nunca mezclar cambio de secreto/provider con datos históricos en el mismo paso.
6. Monitorear señales, Sentry, run tracking, backlog y gasto durante la ventana definida por cada child. Si falla una verify, detener y escalar con evidencia, sin “compensar” mediante acknowledgements.
7. Cerrar la umbrella solo con matriz de evidencia completa y contexto/handoff sincronizados.

### Out-of-band coordination required

- Finanzas/contabilidad: validación de posiciones F29, tasa MXN/CLP y estado del payable contractor.
- Platform/GCP: acceso a configuración de Cloud Run, Scheduler, presupuesto y, si aplica, secretos/firmas; toda rotación o cambio de env requiere owner autorizado.
- Owner del receptor de notificaciones: contrato de firma y ventana para smoke/replay.
- Notion y HubSpot: disponibilidad del token/integración, consentimiento, sandbox/smoke y límites de proveedor.
- Responsable de negocio: decisiones de propuestas de fondeo Globe, reprogramaciones inferidas y excepciones explícitas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un baseline redacted, con timestamp/ambiente/versión, de Platform Health, reliability overview, internal health, handler health, webhook health, Sentry reader y billing para cada workstream que se toma.
- [ ] Cada hallazgo tiene exactamente un owner: Delta sobre una task vigente, follow-up enlazado desde una task complete o task hija nueva con `backend-critical` y ADR assessment cuando corresponde.
- [ ] `platform-health.v1` deja de retornar `unknown` por timeout de `reliability_control_plane`; cualquier fuente aún lenta conserva `degradedSources`, causa, métricas y safe mode conservador.
- [ ] `wh-sub-notifications` recibe una entrega firmada de prueba `succeeded` antes de cualquier replay; las 15 filas históricas se procesan con allowlist/auditoría o quedan exceptuadas con owner y razón.
- [ ] Ningún dead-letter, handler o issue Sentry se reconoce/resuelve únicamente para modificar un KPI; toda acción de acknowledgement tiene causa reparada y evidencia de recuperación.
- [ ] Cada handler degradado tiene causa clasificada, fix dueño y replay scoped idempotente o una policy explícita de archivo/auditoría; no hay replay global implícito.
- [ ] IVA, retención y PPM se rematerializan solo tras `dryRun`, sign-off contable y scope por período/entidad legal; las señales resultan `0` o declaran una excepción fechada y aprobada.
- [ ] Notion/Delivery prueba un evento nuevo completo antes de reprocesar transiciones/writebacks; las razones inferidas no se marcan confirmadas automáticamente.
- [ ] Growth/HubSpot reutiliza el consumer de `TASK-1242`; los cuatro handoffs se evidencian por ledger o se documentan como no elegibles por consentimiento/regla de negocio.
- [ ] Cualquier ahorro Cloud Run se apoya en atribución por recurso y pasa canary + smoke de worker; no baja la capacidad que necesita un carril de recuperación.
- [ ] Todas las señales prioritarias quedan `ok` por runtime o tienen excepción temporal con owner, fecha, criterio de salida y alarma de seguimiento.
- [ ] `platform-health.v1.safeModes` se reconsulta después de los cambios y `agentAutomationSafe` no se declara verdadero sin evidencia canónica.

## Verification

- `pnpm staging:request /api/admin/platform-health --pretty`
- `pnpm staging:request /api/admin/reliability --pretty`
- `pnpm staging:request /api/internal/health --pretty`
- `pnpm staging:request /api/admin/ops/reactive/handler-health --pretty`
- `pnpm staging:request /api/admin/ops/webhooks/endpoint-health --pretty`
- `pnpm pg:doctor`
- Tests focales, typecheck, lint y smoke declarados por cada child; para cambios no triviales, `pnpm qa:gates --changed`.
- Evidencia runtime proporcional: reader/ledger/consulta read-only, Sentry y provider smoke sin imprimir secretos ni PII.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado con señales residuales, owners, evidencia y siguiente comando ejecutable.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre `TASK-251`, `TASK-585`, `TASK-653`, `TASK-1185`, `TASK-1188`, `TASK-1189` y `TASK-1242`.
- [ ] Se ejecutaron `pnpm docs:closure-check` y, como último gate, `pnpm docs:context-check:strict` después de todas las ediciones de contexto.
- [ ] La matriz final de hallazgos, remediaciones, excepciones y evidencia runtime está enlazada desde el handoff o changelog correspondiente.

## Follow-ups

- Crear tasks hijas solamente tras el Slice 0, con ownership y ADR assessment resueltos. Candidatos probables: performance del composer Platform Health, contrato de firma/replay de notifications, remediación fiscal acotada y atribución/guardrail FinOps Cloud Run.
- Si el error de CI del sitio público o las propuestas Globe sin decidir persisten después del triage, abrir workstream separado: no se mezclan con el control plane, delivery o rematerialización fiscal.

## Open Questions

- ¿Qué reader(s) específico(s) consumen el presupuesto de `reliability_control_plane` y cuál es la menor corrección que conserva la semántica del contrato?
- ¿La firma ausente de `wh-sub-notifications` se originó en publisher, subscription/target o receptor, y las 15 entregas siguen siendo funcionalmente válidas para replay?
- ¿Qué drifts financieros son consecuencia de una falla actual de materialización y cuáles son datos históricos que requieren decisión contable?
- ¿Los writebacks Notion atrasados requieren solo replay o exponen una divergencia de configuración/credencial entre runtimes?
- ¿La proyección de costo Cloud Run corresponde a carga legítima, una configuración fija o un ciclo anómalo que comparte causa con los lags observados?
