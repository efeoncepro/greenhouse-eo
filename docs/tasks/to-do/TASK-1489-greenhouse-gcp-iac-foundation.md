# TASK-1489 — Greenhouse GCP IaC Foundation and Brownfield Adoption

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseño gobernado; ADR, inventario e implementación pendientes; cualquier apply requiere aprobación del operador`
- Rank: `TBD`
- Domain: `platform|cloud|security|ops`
- Blocked by: `none para discovery/ADR; apply bloqueado por ADR aceptada + plan sin destroy/replace + aprobación humana`
- Branch: `task/TASK-1489-greenhouse-gcp-iac-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la foundation declarativa de infraestructura GCP de Greenhouse y adoptar incrementalmente recursos
brownfield sin recrearlos. La primera ola cubre ADR, state remoto, CI de validación/plan,
inventario/ownership e imports seguros; Cloud Run, Scheduler y Cloud SQL se migran después mediante
follow-ups acotados.

## Why This Task Exists

Greenhouse postergó Terraform/Pulumi cuando la huella era de aproximadamente diez recursos GCP y un solo
operador. El trigger canónico para reconsiderarlo —segundo operador o más de 25 recursos— ya fue superado.
Hoy la infraestructura combina estado vivo, scripts `gcloud`, workflows, deploy scripts y documentación; la
arquitectura vigente registra drift de IAM, exposiciones públicas, service accounts legacy, secret posture
mixta y configuración compartida entre staging/production.

La ausencia de un desired state unificado dificulta responder de forma reproducible qué debería existir, qué
existe y qué cambiará antes de un apply. Globe demostró el patrón brownfield `import → plan → cero
destroy/replace → apply`, pero Greenhouse debe poseer su propio ADR, módulos, backend, state y rollout: nunca
comparte state ni ownership con Globe.

## Goal

- Formalizar mediante ADR engine, ownership, state, límites y modelo de adopción IaC de Greenhouse GCP.
- Crear una foundation local-first con CI no mutante, state remoto protegido y plan revisable.
- Adoptar una primera ola de recursos existentes sin interrupción ni recreación.
- Hacer visible el drift y retirar el doble ownership de cada recurso adoptado.
- Dividir Cloud Run, Scheduler, Cloud SQL y aislamiento de ambientes en follow-ups, no un big-bang.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-1464-globe-iac-keyless-platform-foundation.md` como patrón de adopción segura,
  nunca como state, módulo u ownership compartido.

Reglas obligatorias:

- Un objeto remoto se administra desde una sola dirección de state y un solo mecanismo autoritativo.
- Ningún apply ocurre antes de ADR aceptada, inventario revisado, plan guardado y aprobación humana explícita.
- Un plan con `destroy`, `replace` o `-/+` sobre un recurso vivo bloquea el apply.
- IaC puede poseer contenedores Secret Manager y bindings IAM; nunca payloads, versiones sensibles ni
  credenciales dentro de HCL, variables, state, plans, logs o Git.
- Greenhouse usa backend/state propios; no consume ni comparte `efeonce-globe-tfstate`.
- La adopción describe la topología compartida real; no finge aislamiento staging/production inexistente.
- Terraform/OpenTofu y `deploy.sh` nunca poseen simultáneamente el mismo atributo mutable.
- Google-native permanece keyless mediante ADC/WIF; no se introducen service account keys.

## Normative Docs

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `services/_shared/gcloud-secret-iam.sh`
- `scripts/setup-github-actions-wif.sh`
- `.github/workflows/ops-worker-deploy.yml`
- `services/ops-worker/deploy.sh`

## Dependencies & Impact

### Depends on

- Acceso read-only para inventariar GCP sin imprimir secretos.
- Aceptación del ADR y aprobación del operador antes de bootstrap/import/apply con mutación.
- Coordinación con owners de workflows/deploy scripts antes de transferir ownership.

### Blocks / Impacts

- Futuras correcciones de exposición pública, least privilege, aislamiento y drift cloud deben consumir esta
  foundation o declarar explícitamente por qué permanecen fuera.
- `TASK-103` y alertas de `GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` migran sólo en una wave autorizada.
- Workflows de workers, WIF y bindings IAM pueden requerir reducción de scope después de cada adopción.
- No impacta el repositorio, proyecto ni state de Efeonce Globe.

### Files owned

- `infra/gcp/terraform/` — nuevo root IaC Greenhouse, condicionado al ADR.
- `.github/workflows/terraform-check.yml` — validación/plan sin apply, o nombre equivalente fijado por ADR.
- `docs/architecture/GREENHOUSE_GCP_INFRASTRUCTURE_AS_CODE_DECISION_V1.md` — ADR propuesto.
- `docs/operations/GREENHOUSE_GCP_IAC_RUNBOOK_V1.md` — inventario, plan, apply, rollback y recovery.
- Cambios mínimos en scripts/workflows existentes sólo para recursos adoptados en esta task.

No posee payloads de secrets, schemas PostgreSQL, configuración GTM, Azure/Bicep, Globe ni despliegues
funcionales de aplicaciones.

## Current Repo State

### Already exists

- `infra/azure/teams-bot/` e `infra/azure/teams-notifications/` usan Bicep versionado para Azure.
- `vercel.json`, workflows, `services/*/deploy.sh` y scripts `gcloud` versionan partes del control plane.
- `scripts/setup-github-actions-wif.sh` declara WIF/IAM de CI mediante script idempotente.
- `services/_shared/gcloud-secret-iam.sh` serializa/reintenta bindings Secret Manager.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` mantiene inventario y gaps fechados, no state.
- `../efeonce-globe/infra/terraform/` es referencia de patrón independiente, no código/state reusable.

### Gap

- No existe `infra/gcp/terraform/`, backend remoto Greenhouse ni CI `fmt/validate/plan`.
- No existe matriz machine-readable de ownership por recurso/atributo.
- No existe detección sistemática de drift entre desired state y GCP vivo.
- IAM, exposición, schedulers, alerts y workers pueden cambiar fuera de un plan declarativo revisable.
- El criterio documentado para reconsiderar IaC se cumplió, pero falta ADR vigente que reemplace el defer.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `infra/`, `.github/workflows/`, `services/*/deploy.sh`, `scripts/` y GCP vivo
- Future candidate home: `remain-shared`
- Boundary: `infra/gcp/terraform posee desired state de foundation y outputs no sensibles; workflows/deploy scripts poseen build/release según matriz de ownership`
- Server/browser split: `server-only; HCL, state, plans, ADC/WIF y CLIs nunca entran al browser bundle`
- Build impact: `tooling HCL + providers pinneados + CI focal; no cambia Next.js ni Docker inputs salvo follow-up`
- Extraction blocker: `brownfield vivo, IAM/WIF compartido, staging/production compartidos y ownership distribuido`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `desired state GCP Greenhouse + state remoto propio`
- Consumidores afectados: `operadores cloud, GitHub Actions, deploy scripts, workers y auditoría de seguridad`
- Runtime target: `local + CI read-only + GCP shared foundation mediante apply supervisado`

### Contract surface

- Contrato existente a respetar: `cloud infrastructure/security/governance + release control plane + scripts/workflows vivos`
- Contrato nuevo o modificado: `ADR + HCL + outputs no sensibles + ownership manifest + runbook`
- Backward compatibility: `gated; imports conservan nombres, IDs, regiones, policies y consumidores`
- Full API parity: `N/A — IaC no es capability de producto; interfaz = plan/output/runbook/CI`

### Data model and invariants

- Entidades/tablas/views afectadas: `N/A — state remoto y recursos cloud; ninguna tabla de producto`
- Invariantes que no se pueden romper:
  - `un recurso remoto ↔ una address de state ↔ un owner mutante`
  - `import/adopt antes de manage; nunca recreate de identidad, bucket, registry o binding vivo`
  - `payloads de secrets y credenciales nunca entran a config/state/plan/logs`
  - `se aplica el plan revisado; no existe re-plan silencioso entre aprobación y apply`
- Tenant/space boundary: `N/A; no cambia aislamiento ni grants de aplicación`
- Idempotency/concurrency: `backend con locking; un apply a la vez; plan guardado; imports idempotentes`
- Audit/outbox/history: `Git + CI redacted + plan summary + evidence manifest; no raw sensitive plan público`

### Migration, backfill and rollout

- Migration posture: `brownfield adoption incremental mediante import blocks; no data backfill`
- Default state: `plan-only/read-only hasta ADR aceptada y aprobación explícita`
- Backfill plan: `inventario → HCL/imports → validate → plan → cero destroy/replace → apply supervisado → plan no-op`
- Rollback path: `stop/revert HCL/re-plan; state backend versionado + recovery; nunca borrar recursos automáticamente`
- External coordination: `CLI + ADC, permisos acotados, backend bootstrap y aprobación humana`

### Security and access

- Auth/access gate: `ADC/WIF keyless + IAM least privilege; apply sólo desde identidad aprobada`
- Sensitive data posture: `IAM, metadata y secret containers; cero payloads de secrets`
- Error contract: `sanitizado; no volcar env/provider config/tokens/secret data/raw plans`
- Abuse/rate-limit posture: `apply serializado, CI sin apply, review y permisos mínimos`

### Runtime evidence

- Local checks: `fmt -check`, `init -backend=false`, `validate` y tests anti-secret/ownership/destructive defaults
- DB/runtime checks: `N/A DB; inventario GCP read-only y comparación resource-by-resource`
- Integration checks: `plan real sin destroy/replace; apply supervisado; post-apply plan = No changes`
- Reliability signals/logs: `CI, drift plan exit code, Cloud Audit Logs y alertas IAM/SA keys`
- Production verification sequence: `foundation compartida primero; cada follow-up define staging/prod`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Invariants, access and concurrency posture are explicit.
- [ ] Migration and rollback posture is proportional to risk.
- [ ] Evidence covers inventory, plan, supervised apply and convergence.
- [ ] Secret payloads, credentials and sensitive plans cannot enter Git/public CI.

## Capability Definition of Done — Full API Parity gate

`N/A — no product capability; no action de negocio, reader, command, API, UI, Nexa ni MCP.`

<!-- ZONE 2 — PLAN MODE: completar al tomar la task, no al crearla. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Inventario brownfield y ownership

- Revalidar inventario live read-only y producir matriz por recurso/atributo: ID, región, criticidad,
  consumidor, owner actual/futuro, importabilidad y wave.
- Clasificar `adopt-now | follow-up | external-managed | do-not-manage` y detectar doble ownership.

### Slice 2 — ADR y contrato de seguridad

- Crear/someter `GREENHOUSE_GCP_INFRASTRUCTURE_AS_CODE_DECISION_V1.md`.
- Comparar Terraform/OpenTofu y definir pins, backend, locking, CI, apply authority, boundaries y recovery.
- Indexar sólo si es aceptado; redactar el ADR no autoriza apply.

### Slice 3 — Foundation local-first y CI no mutante

- Crear root IaC, pins/lockfile, variables no sensibles, backend, outputs y ignores.
- Añadir CI focal `fmt/validate/test/plan`; CI nunca aplica en esta task.
- Bootstrappear/adoptar backend remoto con versionado, acceso mínimo y recovery.

### Slice 4 — Primera wave de adopción

- Modelar/importar sólo `adopt-now`: foundation estable como APIs, WIF/SAs, Artifact Registry, buckets,
  budgets/monitoring y bindings IAM expresamente aprobados.
- Aplicar exactamente el plan guardado sólo si contiene cero destroy/replace y cambios allowlisted.
- Confirmar convergencia con segundo plan no-op.

### Slice 5 — Cutover, drift y handoff

- Retirar/convertir en verificación caminos imperativos que mutaban recursos adoptados.
- Documentar drift, break-glass, state recovery, provider upgrades y rollback.
- Crear follow-ups para Cloud Run/deploy attributes, Scheduler, Cloud SQL y aislamiento de ambientes.
- Sincronizar arquitectura, security posture, cloud inventory, changelog, handoff y lifecycle.

## Out of Scope

- Migrar todos los Cloud Run/jobs/schedulers/Functions/Vercel en esta task.
- Importar o modificar Cloud SQL, DB users/grants/schemas/migrations/datos.
- Aislar staging/production o crear otro proyecto productivo.
- Gestionar payloads/versiones de secretos o credenciales.
- Reemplazar Azure Bicep, Terraform Globe o la estrategia GTM.
- Introducir Kubernetes, ArgoCD o HCP Terraform sin decisión explícita.
- Push, merge, release o apply automático como cierre documental.

## Detailed Spec

La adopción es un strangler de ownership:

`observed → classified → HCL modeled → import planned → zero-destructive reviewed → adopted → sole-owner cutover → drift monitored`

Un recurso no pasa a `adopted` si la configuración no fue entendida, el plan propone mutaciones no explicadas
o un script/workflow seguirá poseyendo el mismo atributo. La matriz separa foundation, runtime, orchestration,
data, security/operations y external config-as-code. Antes del ADR y de cada wave se revalidan versiones,
provider constraints e importabilidad contra fuentes oficiales Terraform/OpenTofu y Google Cloud.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`Slice 1 → Slice 2 aceptada → Slice 3 → Slice 4 plan aprobado → Slice 4 apply supervisado → Slice 5`.

- Slice 1 es read-only.
- Slice 3 no crea/adopta backend antes de ADR aceptada.
- Slice 4 nunca aplica un plan distinto al revisado.
- Slice 5 no retira scripts antes de adopción convergida.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Import/HCL propone recreate | IAM/WIF/Storage/Registry | medium | plan guardado + cero destroy/replace + lifecycle guards | `destroy`, `replace`, `-/+` |
| IaC y deploy script poseen mismo atributo | Cloud Run/IAM/Scheduler | high | matriz + cutover por atributo | drift post-deploy |
| State/plan expone material sensible | backend/CI | low | backend privado + no payloads + secret scan | secret finding/audit inesperado |
| IAM adoption corta runtime/CI | WIF/SAs | medium | conservar IDs + smokes allow/deny/revocation | smoke auth/deploy falla |
| Docs fingen aislamiento inexistente | staging/production | medium | comparar con runtime live | docs ≠ `gcloud describe` |
| Big-bang deja adopción parcial | GCP | medium | waves pequeñas + apply serial + recovery | plan no converge/lock incompleto |

### Feature flags / cutover

No hay flag de producto. CI queda plan-only; el owner actual permanece hasta adopción convergida; el cutover
es por recurso/atributo tras plan no-op. Revert inmediato = detener applies y preservar el recurso, nunca
destruirlo para volver atrás.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revert inventario/matriz; cero GCP mutado | <15 min | sí |
| 2 | Mantener ADR Proposed/Rejected; no continuar | <15 min | sí |
| 3 | Revert scaffold/CI; recovery del backend versionado si aplica | <1 h | sí |
| 4 | Stop pre-apply; post-adoption revert HCL/re-plan o state recovery, sin borrar recursos | variable | parcial/supervisado |
| 5 | Restaurar owner imperativo sólo sin colisión; revert docs/gates | <1 h | sí/coordinado |

### Production verification sequence

1. Inventario/owners mediante comandos read-only.
2. ADR aceptada e indexada.
3. `fmt`, `validate` y tests sin mutaciones.
4. Backend init y plan de imports.
5. Revisión manual: cero destroy/replace; sólo cambios allowlisted.
6. Apply del plan guardado en sesión supervisada.
7. Segundo plan = `No changes`.
8. Smokes WIF/IAM/storage/registry/budget/monitoring según wave.
9. Workflows de deploy existentes verdes.
10. Drift check observado antes de retirar caminos imperativos.

### Out-of-band coordination required

- Aprobación humana de ADR y cada apply.
- `gcloud auth login` + ADC cuando el provider lo requiera.
- Permisos temporales acotados para bootstrap/import/apply y retiro posterior.
- Coordinación con owners de workflows/deploy scripts.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR aceptado/indexado define engine/pins, backend, locking, authority, ownership, recovery y alternativas.
- [ ] Inventario/matriz clasifica recursos `adopt-now | follow-up | external-managed | do-not-manage`.
- [ ] Root IaC tiene pins/lockfile, backend propio, variables no sensibles, outputs e ignores.
- [ ] CI ejecuta fmt/validate/tests/plan read-only y nunca apply automático.
- [ ] Primera wave usa imports y plan aprobado con cero destroy/replace.
- [ ] Apply autorizado usa exactamente el plan revisado; plan posterior = `No changes`.
- [ ] Cada recurso adoptado tiene un solo owner mutante.
- [ ] Ningún secret payload, credential, `.tfvars` real, local state o sensitive plan queda versionado/publicado.
- [ ] WIF/IAM conserva smokes y deploy workflows operativos.
- [ ] Cloud Run, Scheduler, Cloud SQL y aislamiento quedan en follow-ups con owner/condición.
- [ ] Arquitectura, inventory, posture, runbook, README y Handoff reflejan runtime real.
- [ ] HCL sin evidencia de plan y convergencia no permite declarar la task complete.

## Verification

- `pnpm task:lint --task TASK-1489`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check -- docs/tasks/to-do/TASK-1489-greenhouse-gcp-iac-foundation.md infra/gcp/terraform docs/architecture/GREENHOUSE_GCP_INFRASTRUCTURE_AS_CODE_DECISION_V1.md docs/operations/GREENHOUSE_GCP_IAC_RUNBOOK_V1.md`
- `terraform fmt -check -recursive infra/gcp/terraform` o equivalente aprobado.
- `terraform init -backend=false && terraform validate` o equivalente aprobado.
- Tests estáticos anti-secret, ownership, backend y lifecycle guards.
- Inventario GCP read-only comparado con matriz.
- Plan guardado: cero destroy/replace, sólo imports/cambios allowlisted.
- Post-apply plan no-op y smokes focales.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md` distingue inventariado/adoptado/aplicado/verificado/pendiente.
- [ ] `changelog.md` se actualiza sólo cuando exista ADR aceptada o runtime adoptado.
- [ ] `DECISIONS_INDEX.md` contiene el ADR sólo si fue aceptado.
- [ ] Cloud infrastructure/security posture distinguen declarativo vs legacy.
- [ ] Chequeo cruzado de workflows, deploy scripts, WIF, IAM, monitoring y tasks.
- [ ] Evidencia libre de secrets, tokens, payloads y raw sensitive plans.

## Follow-ups

- Cloud Run services/jobs: desired infrastructure vs deploy de imagen/config.
- Cloud Scheduler/Tasks/triggers: cutover desde `deploy.sh`.
- Cloud SQL/BigQuery: protección contra destroy + aislamiento staging/production.
- Least privilege/service accounts por boundary tras ownership declarativo estable.

## Open Questions

- ¿Terraform, OpenTofu o compatibilidad dual con un único CLI canónico en CI?
- ¿Qué atributos Cloud Run permanecen en `deploy.sh` y cuáles pasan a IaC?
- ¿Backend en proyecto actual o futuro proyecto administrativo separado?
- ¿Primera wave exacta tras revalidar inventario live y owners concurrentes?
