# TASK-1807 — GCP Cost Reduction: Globe Cloud Run + FinOps Controls

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `cron`
- Epic: `none`
- Status real: `Slice 1 aplicada: Producer */5, Terraform sin drift y primer tick sano; observacion 24 h en curso`
- Rank: `1`
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees; checkout compartido de cada repositorio`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reduce el run-rate mensual de Google Cloud removiendo ejecuciones Cloud Run sin trabajo, sin degradar la
latencia operativa de Efeonce Globe. Entrega un rollout reversible por workload, evidencia de colas y costo,
budgets nativos, atribucion y controles FinOps que impidan que el desperdicio reaparezca.

## Why This Task Exists

La auditoria live del 2026-09-01 proyecto un run-rate de aproximadamente CLP 540.383 por 30 dias. Agosto cerro
en CLP 538.785 netos: `efeonce-globe` concentro CLP 357.504 y Cloud Run CLP 315.060. Tres Cloud Run Jobs de Globe
explicaron aproximadamente CLP 286.196: Producer Worker cada minuto, Asset Governance cada minuto y Media
Derivatives cada dos minutos. En 24 horas, mas de 99,9% de sus ejecuciones fueron no-op, pero Cloud Run Jobs
factura un minimo temporal por ejecucion.

El arreglo no puede ser un cambio uniforme de `*/5`: Asset Governance avanza una etapa por tick. La experiencia
operativa registrada en `greenhouse-globe` indica que `*/5` elevaba la convergencia en frio a ~20–25 minutos y
que `*/1` la redujo a ~7,9 minutos. Por eso la reduccion urgente debe particionar workloads: Producer y Media
Derivatives pueden espaciarse con guardas de cola; Asset Governance conserva la cadencia hasta eliminar su
dependencia de una etapa por tick o adoptar disparo durable por evento.

La cuenta de billing no tiene budgets nativos. El watcher interno suma costo bruto sin creditos y su fingerprint
incluye valores cambiantes, lo que debilita el cooldown y genera fatiga. Artifact Registry, Cloud Build Storage y
Secret Manager tienen deuda de retencion, pero cualquier limpieza requiere inventario, policy y rollback; no se
mezcla con el cutover urgente de los schedulers.

## Goal

- Reducir de inmediato y de forma reversible el costo de Producer Worker y Media Derivatives sin aumentar la
  edad de cola por encima de 15 minutos ni degradar ejecuciones con trabajo real.
- Rediseñar Asset Governance para desacoplar costo de su tick minutely antes de espaciarlo.
- Instalar budgets, alertas, atribucion y calculo neto de billing para detectar y sostener el ahorro.
- Alcanzar un run-rate objetivo inicial de CLP 330.000–370.000 y un objetivo posterior de CLP 290.000–320.000,
  sujetos a readback real a 24 horas y 7 dias.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `/Users/jreye/Documents/efeonce-globe/AGENTS.md`

Reglas obligatorias:

- Globe sigue siendo un producto comercial; ahorro no autoriza degradar confiabilidad ni dimensionar como lab.
- Cambios productivos de cron/configuracion viven primero en Terraform; un cambio directo en GCP solo puede ser
  cutover urgente documentado y debe reconciliarse en IaC en el mismo slice.
- Usar `gcloud --configuration=globe --project=efeonce-globe`; nunca cambiar el proyecto del perfil `default`.
- No imprimir secretos, URLs firmadas, tokens, payloads ni errores raw.
- Diagnostico y readback antes de mutacion; ante estado ambiguo, detener y reconciliar.
- No comprar CUDs antes de retirar desperdicio y medir un baseline estable.
- No reducir Asset Governance a `*/5` mientras una ejecucion avance solo una etapa.
- Todo cambio de arquitectura de dispatch/cadencia confirma si cabe en ADR vigente; si cambia el boundary de
  scheduling, crea o actualiza ADR antes del cutover correspondiente.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/tasks/complete/TASK-769-cloud-cost-intelligence-ai-finops-copilot.md`
- `docs/tasks/complete/TASK-103-gcp-budget-alerts-bigquery-guards.md`
- `docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md`

## Dependencies & Impact

### Depends on

- Billing Export detallado `efeonce-group.billing_export.gcp_billing_export_resource_v1_013340_4C7071_668441`.
- Terraform de Globe bajo `/Users/jreye/Documents/efeonce-globe/infra/terraform/`.
- Metricas/logs estructurados de Producer Worker, Asset Governance y Media Derivatives.
- Alerta de queue age de Producer con umbral actual de 900 segundos.

### Blocks / Impacts

- Run-rate operativo de `efeonce-globe` y gasto consolidado de Efeonce.
- Latencia de Producer, media derivatives y pipeline de governance.
- Watcher `ops-cloud-cost-ai-watch`, Reliability y lectura financiera de costo cloud.
- Futura decision de CUD Cloud SQL.

### Files owned

- `docs/tasks/to-do/TASK-1807-gcp-cost-reduction-globe-cloud-run-finops.md`
- `src/lib/cloud/gcp-billing.ts`
- `src/lib/cloud/**cost**`
- `src/lib/reliability/**cloud**`
- `/Users/jreye/Documents/efeonce-globe/infra/terraform/producer_worker_job.tf`
- `/Users/jreye/Documents/efeonce-globe/infra/terraform/media_derivatives.tf`
- `/Users/jreye/Documents/efeonce-globe/infra/terraform/asset_governance_job.tf`
- `/Users/jreye/Documents/efeonce-globe/infra/terraform/*observability*.tf`
- `/Users/jreye/Documents/efeonce-globe/infra/terraform/tests/*worker*.test.mjs`
- `/Users/jreye/Documents/efeonce-globe/infra/terraform/tests/*governance*.test.mjs`

## Current Repo State

### Already exists

- Tres jobs y schedulers declarados en Terraform con IAM dedicado e imagen inmutable.
- Metricas estructuradas de completitud, edad de cola, retry storm y errores.
- Billing Export detallado y lectores V2 de Cost Intelligence.
- Watcher interno de costo cloud cada seis horas.
- Alertas de edad de cola a 900 segundos para Producer.

### Gap

- Producer y Media Derivatives despiertan con demasiada frecuencia para su volumen real.
- Asset Governance acopla convergencia a multiples ticks; espaciarlo directamente degrada latencia.
- Cero budgets nativos en Billing Account.
- El lector interno presenta costo bruto sin creditos y el dedupe del watcher no representa un incidente estable.
- Cobertura de labels por costo cercana a 57%; los jobs caros carecen de labels de negocio.
- Artifact Registry, Cloud Build Storage y Secret Manager carecen de politica de retencion cerrada con evidencia.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Terraform y runtimes worker en /Users/jreye/Documents/efeonce-globe; readers y control FinOps en src/lib/cloud y src/lib/reliability de Greenhouse`
- Future candidate home: `worker`
- Boundary: `Cloud Scheduler dispara Cloud Run Jobs; cada worker conserva leases/fencing y emite metricas estructuradas; Greenhouse consume Billing Export y Reliability sin entrar al hot path de Globe`
- Server/browser split: `providers, billing, Terraform y credenciales permanecen server-only; no hay consumer browser nuevo`
- Build impact: `none; cambios de configuracion IaC y readers existentes, sin dependencia pesada ni input filesystem nuevo`
- Extraction blocker: `dos repositorios y runtimes independientes, IAM por proyecto, estado Terraform y Billing Export centralizado`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `cron`
- Source of truth afectado: `Terraform de schedulers Globe, Billing Export detallado y reader canonico de costo GCP`
- Consumidores afectados: `Cloud Scheduler, Cloud Run Jobs, Reliability, Finance y operador`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `variables de schedule en infra/terraform y contratos src/lib/cloud/gcp-billing.ts`
- Contrato nuevo o modificado: `cadencia por workload, costo neto con creditos, fingerprint estable y budgets nativos`
- Backward compatibility: `gated`
- Full API parity: `N/A; no nace capability de negocio ni UI, se modifica configuracion operativa y lectura interna existente`

### Data model and invariants

- Entidades/tablas/views afectadas: `BigQuery Billing Export read-only; sin migracion de schema`
- Invariantes que no se pueden romper:
  - `la edad p99 de trabajo reclaimable permanece bajo 900 segundos`
  - `ningun scheduler pierde IAM, target, timezone, pause state ni retry contract`
  - `costo neto = cost + credits; gross y credits permanecen visibles por separado`
  - `Asset Governance no se espacía mientras una ejecucion no pueda converger multiples etapas de forma segura`
- Write-target allowlist: `N/A; no hay tabla nueva ni write de dominio`
- Tenant/space boundary: `workloads conservan actor/workspace, leases y fencing existentes; Billing Export se lee en scope institucional autorizado`
- Idempotency/concurrency: `durable leases/fencing existentes son autoridad; cambios de schedule no alteran claves ni reintentos`
- Audit/outbox/history: `Terraform plan/apply, Cloud Audit Logs, logs estructurados y evidencia financiera antes/despues`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `rollout graduado por scheduler, un workload a la vez`
- Backfill plan: `N/A`
- Rollback path: `restaurar expresion cron anterior mediante Terraform y verificar estado del scheduler + siguiente ejecucion`
- External coordination: `GCP Scheduler, Cloud Run, Billing budgets y checkout Globe; sin rotacion de secretos`

### Security and access

- Auth/access gate: `gcloud profile globe + IAM existente; budget scope sobre Billing Account`
- Sensitive data posture: `billing financiero; no PII ni payloads de assets en evidencia`
- Error contract: `solo codigos/contadores sanitizados; no raw errors ni secretos`
- Abuse/rate-limit posture: `cadencia, quotas y budgets; budget alerta pero no corta servicios`

### Runtime evidence

- Local checks: `terraform fmt -check; tofu validate; tests focales de infra; pnpm check/build segun archivos tocados`
- DB/runtime checks: `read-only de queue metrics/logs y Billing Export antes/despues`
- Integration checks: `tofu plan revisado, apply gobernado, gcloud scheduler describe y Cloud Run execution readback`
- Reliability signals/logs: `queue age p99, completed/no-op/work count, failures, retry storm, oldest work age y latency`
- Production verification sequence: `baseline -> Producer cutover -> 24h -> Media cutover -> 24h -> 7d -> siguientes slices`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (N/A: no hay tabla nueva).
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — no nace ni se modifica una capability de negocio; la task cambia schedulers productivos, observabilidad y
lectura financiera interna existente.

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

### Slice 0 — Baseline, ownership y ADR gate

- Congelar evidencia de costo neto/gross/creditos, ejecuciones, no-op ratio, trabajo real, edad de cola y errores.
- Confirmar estado Terraform, schedulers, jobs, IAM, alertas y WIP de ambos checkouts.
- Registrar si el cambio cabe en ADR/arquitectura vigente; cualquier dispatch event-driven nuevo requiere decision
  documentada antes de implementación.

### Slice 1 — Producer Worker: cadence cutover reversible

- Cambiar Producer de `* * * * *` a `*/5 * * * *` en Terraform y su test conductual.
- Plan, apply y readback del scheduler sin cambiar imagen, recursos, IAM, target, timezone ni retry config.
- Observar como minimo la siguiente ejecucion y luego 24 horas: queue age p99 < 900 s, cero retry storm y trabajo
  real completado.
- Rollback inmediato a minutely si cruza el guardrail.

### Slice 2 — Media Derivatives: cadence staggered

- Cambiar Media Derivatives de `*/2 * * * *` a `2-59/5 * * * *`, solo despues de cerrar Slice 1.
- Agregar/verificar metricas de backlog y oldest age equivalentes antes del cutover si hoy no existen.
- Plan, apply y readback; observar 24 horas y revertir si la edad o errores cruzan guardrails.

### Slice 3 — Asset Governance: eliminar dependencia de tick

- Medir cuantas etapas puede completar de forma segura una ejecucion y el costo/latencia por asset real.
- Diseñar una de dos rutas: convergencia acotada multi-etapa dentro de una ejecucion, o dispatch durable por evento
  con reconciliacion periodica de respaldo.
- Preservar leases, fencing, idempotencia, rights/provenance y señal de progreso.
- Solo despues de canary real y ADR gate, evaluar una cadencia de respaldo mayor a un minuto.

### Slice 4 — Rightsizing por canary

- Probar 1 vCPU y memoria proporcional por job, uno a la vez, con ejecuciones que hagan trabajo real.
- Comparar duration, CPU throttling, memoria, fallos y backlog contra baseline.
- Promover solo si no degrada SLO; nunca inferir desde promedios de no-op.

### Slice 5 — Budgets y watcher neto

- Crear budgets nativos para Billing Account/proyectos con umbrales 50/75/90/100% y forecast, sin acciones de
  apagado automatico.
- Corregir `gcp-billing.ts` para reportar neto, gross y creditos.
- Estabilizar fingerprint/cooldown del watcher por incidente y driver, no por valor cambiante de costo.
- Verificar una alerta sintetica/dry-run sin enviar ruido a destinatarios reales.

### Slice 6 — Hygiene de artefactos, storage y secretos

- Inventariar referencias activas y definir cleanup policy de Artifact Registry con dry-run.
- Definir lifecycle para objetos temporales de Cloud Build sin eliminar artefactos de rollback activos.
- Clasificar versiones de Secret Manager por consumer; deshabilitar primero y eliminar solo tras ventana de
  recuperacion y smoke del consumidor.

### Slice 7 — FinOps continuo y cierre financiero

- Elevar cobertura de labels de costo desde ~57% hacia 90%+ con `app`, `env`, `owner` y `cost_center`.
- Comparar costo a 24 horas, 7 dias y cierre mensual; documentar ahorro observado y residual.
- Evaluar CUD Cloud SQL solo sobre baseline estable posterior a optimizacion.

## Out of Scope

- Apagar workloads, bases, front doors, Cloud Armor o servicios productivos sin owner y prueba de no uso.
- Comprar CUDs antes del baseline posterior al ahorro.
- Reducir `kortex-pg-dev`; Active Assist lo marca subdimensionado.
- Eliminar secretos, imagenes o objetos directamente sin policy, dry-run y ventana de recuperacion.
- Cambiar modelos/proveedores, funcionalidad de Producer o contratos de negocio de Globe.
- Hacer `*/5` en Asset Governance antes de eliminar su dependencia de multiples ticks.

## Detailed Spec

Baseline live del 2026-09-01:

| Metrica | Valor |
|---|---:|
| Gasto neto agosto | CLP 538.785 |
| Run-rate 30 dias | CLP 540.383 |
| `efeonce-globe` agosto | CLP 357.504 |
| Cloud Run agosto | CLP 315.060 |
| Tres jobs Globe | CLP 286.196 |
| Producer Worker | CLP 117.504 |
| Asset Governance | CLP 109.964 |
| Media Derivatives | CLP 58.756 |
| No-op observado | >99,9% |

Modelo inicial, no promesa financiera: espaciar Producer y Media reduce aproximadamente CLP 160.000–170.000
mensuales si el patrón se mantiene. Asset Governance y rightsizing pueden llevar el ahorro total hacia CLP
230.000–250.000, pero solo se contabilizan con Billing Export real.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 -> Slice 1 -> observacion 24h -> Slice 2 -> observacion 24h.
- Slice 3 puede diseñarse despues de Slice 0, pero no cambia produccion antes de evidencia de Slices 1–2 y ADR.
- Slice 4 ocurre por workload y despues de estabilizar su cadence.
- Slice 5 puede avanzar en paralelo despues de Slice 0 porque no cambia hot path.
- Slice 6 empieza con inventario/dry-run; eliminacion solo despues de Slices 1–5 estables.
- Slice 7 cierra con evidencia de 7 dias y mensual; CUD es la ultima decision.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acumulacion de cola por menor frecuencia | cron/worker | medium | un workload a la vez, p99 y rollback | queue age >= 900 s |
| Governance tarda 20–25 min | asset governance | high si se aplica `*/5` directo | conservar `*/1` hasta rediseño | governance total latency |
| Todos los jobs despiertan juntos | Cloud SQL | medium | schedules escalonados | conexiones/CPU/errores SQL |
| Promedio de no-op oculta trabajo pesado | Cloud Run | medium | rightsizing solo con canary real | duration, throttle, OOM, retries |
| Terraform drift por cambio directo | release/IaC | medium | source-first + plan/apply/readback | `tofu plan` no vacio inesperado |
| Cleanup elimina rollback activo | Artifact Registry/Storage | low | dry-run, keep rules por digest/edad/tag | imagen/objeto referenciado ausente |
| Dedupe oculta o repite alerta | Reliability | medium | fingerprint estable + test de cooldown | dispatch count por incidente |
| Budget se interpreta como cap | finance/ops | low | declarar alert-only | gasto continua tras umbral |

### Feature flags / cutover

No se introduce feature flag de aplicacion. Cada expresion cron es el control de cutover y se promueve por
Terraform, un scheduler a la vez. El rollback restaura el schedule anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1 | restaurar Producer a `* * * * *`, apply y describe | <15 min | si |
| 2 | restaurar Media a `*/2 * * * *`, apply y describe | <15 min | si |
| 3 | desactivar nueva ruta y conservar scheduler minutely | <15 min | si, si el diseño nace gated |
| 4 | restaurar CPU/memoria anterior por Terraform | <20 min | si |
| 5 | budgets pueden desactivarse; reader se revierte por commit/deploy | <30 min | si |
| 6 | reactivar versiones/policies dentro de ventana; no borrar en primera fase | <30 min | parcial tras eliminacion final |
| 7 | N/A para evidencia; no comprar CUD sin aprobacion separada | N/A | N/A |

### Production verification sequence

1. Capturar baseline de 24 horas y estado exacto de Terraform/schedulers/jobs.
2. Ejecutar tests y `tofu plan`; revisar que solo cambie Producer.
3. Aplicar Producer; verificar schedule, target, IAM y siguiente ejecucion.
4. Monitorear 24 horas y comparar trabajo/cola/errores/costo diario.
5. Repetir plan/apply/readback para Media Derivatives.
6. Monitorear 24 horas y luego ambos workloads durante 7 dias.
7. Ejecutar canary de rediseño de Asset Governance con un asset real, sin duplicar gastos.
8. Aplicar budgets/watcher y probar dedupe/alerta sin ruido externo.
9. Ejecutar hygiene primero en dry-run y cerrar con Billing Export neto.

### Out-of-band coordination required

- Acceso IAM de Terraform/GCP y Billing Account.
- Ventana de observacion productiva; no requiere downtime.
- Cualquier CUD, cancelacion de suscripcion o eliminacion final requiere aprobacion financiera separada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Producer corre cada 5 minutos desde Terraform y mantiene queue age p99 < 900 s durante 24 h y 7 dias.
- [ ] Media Derivatives corre escalonado cada 5 minutos y mantiene backlog/oldest age bajo guardrail.
- [ ] Asset Governance no se degrada por un cambio directo de cadence; cualquier reduccion tiene canary multi-etapa/event-driven.
- [ ] El costo diario observado de los jobs intervenidos baja al menos 50% sin aumento material de errores.
- [ ] El rollback de cada scheduler esta documentado y verificado por readback.
- [ ] Existen budgets nativos con umbrales y forecast, sin apagado automatico.
- [ ] Greenhouse reporta neto, gross y creditos, y el watcher deduplica el mismo incidente.
- [ ] Cleanup policies nacen con dry-run, exclusiones de artefactos activos y ventana de recuperacion.
- [ ] Labels cubren al menos 90% del costo o queda follow-up con owner y brecha medida.
- [ ] El ahorro a 24 h, 7 dias y cierre mensual queda registrado; forecast no se presenta como ahorro realizado.
- [ ] CUD permanece fuera hasta decision financiera sobre baseline estable.

## Verification

- `pnpm task:lint --task TASK-1807`
- `pnpm codex:task-hook TASK-1807`
- `terraform fmt -check -recursive /Users/jreye/Documents/efeonce-globe/infra/terraform`
- `tofu -chdir=/Users/jreye/Documents/efeonce-globe/infra/terraform validate`
- tests focales de `infra/terraform/tests/`
- `tofu -chdir=/Users/jreye/Documents/efeonce-globe/infra/terraform plan`
- `gcloud --configuration=globe scheduler jobs describe ... --project=efeonce-globe`
- queries read-only de Cloud Logging/Monitoring y Billing Export
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como ultimo gate documental

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado con baseline, rollout y residual.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento operativo.
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-103`, `TASK-769` y `TASK-1710`.
- [ ] Terraform, runtime, billing y documentacion se reportan como evidencias separadas.

## Follow-ups

- Decision de CUD Cloud SQL una vez estabilizado el baseline.
- Cancelacion de Gemini Code Assist solo si Finance/owner confirma que no se usa.
- Retiro de `kortex-pg-dev` solo si se demuestra sin consumer; nunca rightsizing hacia abajo.

## Open Questions

- Cual ruta para Asset Governance satisface mejor el producto: convergencia multi-etapa acotada o dispatch por evento.
- Que owner financiero aprueba budgets, CUDs y cancelacion de suscripciones.

## Delta 2026-09-01 — Slice 1 aplicada

- Source: `producer_worker_schedule` cambió de `* * * * *` a `*/5 * * * *` en Terraform Globe.
- Pre-apply: plan honesto con `development_environment_enabled=true` y principal de desarrollo preservado dio
  `0 add, 1 change, 0 destroy`; el plan sin esas variables fue descartado porque proponía 20 destroys.
- Apply: `0 added, 1 changed, 0 destroyed`.
- Readback: Scheduler `ENABLED`, UTC, mismo target; próximo tick calculado a las 21:00Z.
- Primer tick: ejecución `globe-producer-worker-2lq2v`, completada a las 21:00:07Z con
  `queueOldestAgeSeconds=0`, `outboxRetryStorm=0`, `outboxTerminalAttempts=0`, cero divergencias y cero fallos.
- Post-apply: `tofu plan` honesto en `No changes`.
- Estado: no se marca aceptación de 24 h/7 d todavía; monitoring activo antes de Slice 2.
