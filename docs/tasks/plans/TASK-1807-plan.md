# TASK-1807 — Plan de reducción GCP

## Approval

- Checkpoint: `human-required` por P0 + Effort Alto.
- Aprobación: el operador confirmó el 2026-09-01 «Ok ejecuta esa task» después de recibir objetivo, alcance,
  ahorro esperado, guardrails y orden de rollout.
- Estado de cierre permitido: `complete` solo con rollout y readback; mientras falten ventanas de 24 h/7 d,
  `in-progress` con runtime explícito.

## Goal

Reducir el run-rate de GCP comenzando por los jobs Cloud Run de Globe, preservando latencia, confiabilidad,
rights/provenance y capacidad de rollback. El primer ahorro se entrega sobre Producer y Media; Asset Governance
no cambia de cadence hasta eliminar su dependencia de una etapa por tick.

## Discovery / Audit

### Supuestos correctos

- Agosto cerró en CLP 538.785 netos y el run-rate observado fue ~CLP 540.383/30 días.
- `efeonce-globe` y Cloud Run son los principales drivers; los tres jobs suman ~CLP 286.196/mes.
- Producer `* * * * *` y Media `*/2 * * * *` ejecutan >99,9% no-op en la ventana observada.
- Terraform posee schedulers, IAM, target, timezone, retry y job configuration.
- El perfil local `globe` resuelve `julio.reyes@efeonce.org` / `efeonce-globe` sin cambiar `default`.

### Supuesto desactualizado corregido

- El diseño inicial proponía `*/5` para los tres jobs. La skill y el runtime contract de Globe registran que
  Asset Governance avanza una etapa por tick; `*/5` produjo ~20–25 minutos en frío y `*/1` ~7,9 minutos. Por
  tanto, no participa del cambio urgente de cadence.

### Arquitectura / docs obligatorios

- `greenhouse-globe` y `/Users/jreye/Documents/efeonce-globe/AGENTS.md`: boundary del producto y rollout.
- `GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`: ownership y evidencia cloud.
- `GLOBE_RUNTIME_HANDOFF.md`: estado mutable; debe releerse antes de cada apply.
- Terraform Globe: source of truth de schedulers y jobs.
- ADR-008 para Media; ADR vigente de workers/scheduling para Producer. Un dispatch event-driven nuevo de Asset
  Governance pasa por ADR gate antes de código.

### Código existente para reutilizar

- `infra/terraform/producer_worker_job.tf`: variable y scheduler Producer.
- `infra/terraform/media_derivatives.tf`: variable y scheduler Media.
- `infra/terraform/producer_worker_observability.tf`: queue age, errors, retry storm y completitud.
- leases/fencing/idempotencia existentes de cada worker.
- `src/lib/cloud/gcp-billing.ts` y Cost Intelligence V2.

### Runtime real

- Schedulers `globe-producer-worker`, `globe-media-derivatives`, `globe-asset-governance` están `ENABLED` en
  `southamerica-east1`, UTC, con schedules `* * * * *`, `*/2 * * * *`, `*/1 * * * *`.
- Targets permanecen en Cloud Run Jobs `southamerica-west1`.
- Asset Governance permanece fuera de Slice 1/2.

### Access model

- `gcloud --configuration=globe --project=efeonce-globe`.
- Identidades dedicadas de scheduler con `roles/run.invoker`; no se modifica IAM.
- Terraform state y provider auth existentes; secretos no se leen ni rotan.

### Skills

- `greenhouse-task-planner`: task canónica y deduplicación.
- `greenhouse-task-execution-hook`: preflight y lifecycle.
- `google-cloud-waf-cost-optimization`: priorización FinOps y controles sostenibles.
- `cloud-run-basics`: semántica Jobs/Scheduler y verificación.
- `greenhouse-globe`: invariantes del producto y restricción Asset Governance.
- `greenhouse-secret-hygiene`: asegurar que el rollout no exponga ni rote secretos.
- `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`: gates y cierre.

### Subagent strategy

`sequential`. La ejecución productiva depende causalmente de cada readback, los archivos Terraform comparten
state y el operador no autorizó subagentes. No se paralelizan applies.

### Riesgos / blast radius

- Queue age o backlog por menor cadence: p99 < 900 s, rollback al schedule anterior.
- Drift Terraform: source-first, plan acotado y describe post-apply.
- Latencia de Asset Governance: se conserva `*/1`.
- Cold connections simultáneas: Media queda escalonado respecto de Producer.
- Ahorro modelado distinto de realizado: Billing Export es evidencia, no el forecast.

### Open questions resueltas

- Asset Governance: no cambia ahora; Slice 3 decide multi-stage acotado vs evento durable mediante ADR/canary.
- CUDs: fuera hasta baseline estable.
- Cleanup destructivo: fuera del rollout urgente; primero inventario/dry-run.
- Owner financiero: no bloquea schedules; sí bloquea CUD/cancelación/eliminación final.

## Mapa de conexiones

`Cloud Scheduler (southamerica-east1) -> OAuth SA dedicada -> Cloud Run Job (southamerica-west1) -> leases/fencing
en Postgres -> logs estructurados -> Cloud Monitoring/alerts`. Greenhouse lee Billing Export y Reliability fuera
del hot path. No cambia API, schema, session, bucket, provider ni contrato cliente.

## Plan slice-by-slice

### Slice 0 — Baseline y gate

- Reutiliza Billing Export, logs y Terraform.
- Verifica WIP, profile, schedule/target/state, restricciones de Asset Governance y ADR.
- Evidencia: task, audit, plan, task lint y task hook.

### Slice 1 — Producer Worker

- Archivos: `producer_worker_job.tf` y su test de infraestructura.
- Cambia default a `*/5 * * * *`; no toca imagen, CPU/memoria, IAM ni retry.
- Verificación local: fmt, validate, test focal, plan acotado.
- Cutover: apply Terraform; describe scheduler; observar siguiente ejecución y métricas.
- Guardrail: queue age p99 < 900 s, failures/retry storm sin regresión.
- Rollback: `* * * * *` + apply + readback.

### Slice 2 — Media Derivatives

- Dependencia: 24 h estables de Slice 1.
- Antes de cutover, confirmar señal de backlog/oldest age; agregarla si falta.
- Cambia a `2-59/5 * * * *` y actualiza test.
- Mismos gates de plan/apply/readback; rollback `*/2 * * * *`.

### Slice 3 — Asset Governance

- Diseña multi-stage acotado o dispatch durable por evento; ADR antes de cambiar boundary.
- Canary con asset real, una identidad lógica y readback-first.
- Conserva reconciliación minutely hasta probar una alternativa.

### Slice 4 — Rightsizing

- Un job por vez, con trabajo real; 1 vCPU/memoria proporcional solo si duración, backlog y errores se mantienen.

### Slice 5 — Budgets/watcher

- Budgets nativos alert-only; net/gross/credits; fingerprint estable y prueba de cooldown.

### Slice 6 — Retention hygiene

- Artifact Registry/Storage/Secret Manager en dry-run; sin delete inicial.

### Slice 7 — Cierre

- Readbacks 24 h, 7 d y mensual; labels 90%+; CUD solo con aprobación y baseline estable.

## Verification matrix

| Slice | Local | Runtime | Financial |
|---|---|---|---|
| 0 | task lint/hook | scheduler describe | Billing Export baseline |
| 1 | fmt/validate/test/plan | Producer describe + execution/log metrics | daily cost after 24 h |
| 2 | fmt/validate/test/plan | Media describe + backlog metrics | daily cost after 24 h |
| 3 | checks + ADR tests | asset canary/readback | cost per governed asset |
| 4 | plan/tests | real-work canary | SKU delta |
| 5 | tests | budget/readback/dry-run alert | net=gross+credits |
| 6 | policy dry-run | reference/consumer smoke | storage/secret delta |
| 7 | QA/docs gates | 7-day runtime | monthly actual |

## Scope limits

- Sin push automático.
- Deploy/apply autorizado para el rollout urgente descrito por el operador, con source-first y rollback.
- Sin CUD, eliminación final, cancelación de suscripción ni reducción de Asset Governance en esta primera ventana.
