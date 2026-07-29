# TASK-1508 — Globe Cloud Run IaC and Deploy Ownership

## Delta 2026-07-21 — TASK-1507 complete: baseline recalibrado

`TASK-1507` cerró el 2026-07-21 y con eso cambian tres cosas del baseline que esta task importa:

- **`maxScale` no era ni 1 ni 3: eran los dos a la vez, y el efectivo era 1.** Un servicio Cloud Run lleva un ceiling
  **a nivel servicio** (`Service.scaling.maxInstanceCount`) y otro **a nivel revisión**
  (`template.scaling.maxInstanceCount`), y **Cloud Run aplica el menor**. Ambos servicios tenían **servicio=1 /
  revisión=3**, o sea techo efectivo **1** — mientras la spec original decía 1, el cierre de `TASK-1465` decía 3, y las
  dos afirmaciones describían campos distintos sin saberlo. Ningún servicio de Globe corrió nunca más de una instancia,
  así que **el spend fence cross-réplica que `TASK-1465` construyó jamás se ejercitó**.

  La causa es la trampa que esta task existe para cerrar, en su forma más traicionera: **`--max-instances` escribe un
  campo distinto según el subcomando** — `gcloud run deploy` (el workflow) escribía el de servicio, `gcloud run services
  update` el de revisión. Por eso el workaround que varios docs prescribían para "restaurar" el techo tras un deploy era
  inefectivo: escribía el campo equivocado y dejaba el efectivo en 1.

  **Esta task corrige el techo a 3/3 efectivo**, con autorización explícita del operador (2026-07-21). No es "pinear el
  valor vivo": es un **cambio funcional deliberado** que levanta un cap que nadie decidió y que mantenía sin ejercitar
  una defensa de gasto ya construida. Terraform declara **ambos** campos para que ninguno pueda volver a derivar.
- **El ingress quedó fijado por `gcloud`, sin gobierno IaC.** `globe-studio-internal` está en
  `internal-and-cloud-load-balancing` porque los servicios Cloud Run siguen fuera de Terraform; adoptarlos es
  justamente esta task. No es drift-trap del workflow (`deploy-internal.yml` no pasa `--ingress` y `gcloud run deploy`
  preserva lo no especificado), pero nada lo previene hasta que 1508 lo pinee.
- **El baseline a importar creció.** El front door aditivo de 1507 agregó `infra/terraform/front_door.tf` y sumó
  `compute.googleapis.com` a `local.enabled_services`. Ambos ya están en state y deben tratarse como parte del
  baseline convergido, no como diff a explicar.

Blocker `TASK-1507` levantado 2026-07-21: `Blocked by` pasa a `none`.

## Evidencia de ejecución — 2026-07-21 (Slices 2 y 3 aplicados en vivo)

### Ownership por campo (Slice 1) — contrato vigente

| Campo | Dueño | Dónde vive |
|---|---|---|
| `ingress` | Terraform | `cloud_run_services.tf` |
| `invoker_iam_disabled` | Terraform | `cloud_run_services.tf` |
| runtime service account | Terraform | `cloud_run_services.tf` |
| env vars + secret refs | Terraform | `cloud_run_services.tf` (los secretos sólo como `secret_key_ref`) |
| ceiling de escala (servicio **y** revisión) | Terraform | `cloud_run_services.tf` |
| resources / timeout / concurrency / port | Terraform | `cloud_run_services.tf` |
| `deletion_protection` | Terraform | `cloud_run_services.tf` |
| invoker IAM binding de la api | Terraform | `google_cloud_run_v2_service_iam_member.api_invoker` |
| **imagen del contenedor** | **workflow** | `deploy-internal.yml` |
| `client` / `client_version` | nadie (metadata de la herramienta) | ignorado por `lifecycle.ignore_changes` |

`ignore_changes` cubre exactamente tres entradas: la imagen, `client` y `client_version`. Los dos últimos no son
configuración —Cloud Run los estampa con la herramienta que escribió último— y sin ignorarlos el plan quedaría
permanentemente en rojo por algo cosmético, que es como un equipo aprende a dejar de leer planes. **Ampliar esa lista al
contenedor o al template reabriría el drift de env, secretos, runtime SA y escala**, que es justo lo que esta task cierra.

### Slice 2 — adopción brownfield (aplicado)

- `tofu plan`: `2 to import, 0 to add, 2 to change, 0 to destroy`; **cero destroy/replace**. Los 2 cambios, explicados
  campo por campo: `description` (adición) y `scaling.max_instance_count` **1 → 3** (la corrección del cap).
- `tofu apply`: `2 imported, 0 added, 2 changed, 0 destroyed`. Plan posterior: **No changes**.
- Binding invoker de la api adoptado aparte: `1 imported, 0 added, 0 changed, 0 destroyed`. Estaba vivo pero fuera de
  IaC — era el único permiso entre internet y un service principal con autoridad de gasto, existiendo sólo como efecto
  secundario de un `gcloud` manual.
- Provider `~> 6.0` → `~> 7.0` (el ceiling a nivel servicio no existe en 6.x). Verificado sobre toda la config:
  **76 de 78 recursos no-op** bajo la major nueva.
- Postura preservada: web `INTERNAL_LOAD_BALANCER` + `invoker_iam_disabled=true`; api `ALL` + IAM-private.

### Slice 3 — workflow image-only + prueba anti-drift (aplicado y probado)

`deploy-internal.yml` pasó a `gcloud run deploy --image` y nada más. Deploy real ejecutado sobre
`globe-studio-internal` (run `29872768853`, imagen `51ade01eda82`), y **el plan posterior quedó en `No changes`**:

| Campo | Post-deploy |
|---|---|
| ingress | `INTERNAL_LOAD_BALANCER` ✅ |
| `invokerIamDisabled` | `true` ✅ |
| ceiling servicio / revisión | **3 / 3** ✅ (antes de este cambio, ese mismo deploy lo habría re-capado a 1) |
| runtime SA | `web_runtime` ✅ |
| env vars | 14 ✅ |
| `client_version` | 560.0.0 → 568.0.0 (ignorado, por diseño) |

Smokes post-deploy: federación humana por `https://globe.efeoncepro.com` → `human_federation_ok`; api anónimo → `403`;
`run.app` del web → `404`.

### Segundo ciclo de deploy (la §Production verification sequence pide dos)

Ejecutado sobre el **otro** servicio para cubrir ambos: `globe-api-internal`, run `29875135147`. Post-deploy:
ingress `ALL`, `invokerIamDisabled` false, ceiling **3/3**, SA `api_runtime`, 15 env vars — y `tofu plan` de nuevo en
**No changes**. Dos ciclos, dos servicios, cero drift.

Smokes finales: federación humana por el dominio `human_federation_ok`; api anónimo `403`; `run.app` del web `404`;
`https://globe.efeoncepro.com` → `200` con TLS válido.

### Lo que NO se cerró acá (follow-up honesto)

El spend fence cross-réplica **sigue sin ejercitarse**. Levantar el cap lo hizo *posible* por primera vez, pero probarlo
de verdad exige concurrencia real contra el Model Lab, o sea **gasto real de proveedor**. Es trabajo con implicancia de
costo y merece su propia autorización; declararlo verificado acá sería exactamente el tipo de afirmación sin evidencia
que esta task destapó.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
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
- Epic: `EPIC-028`
- Status real: `Completa y verificada en vivo: ambos servicios en Terraform, ownership por campo, cap efectivo 1→3 corregido, workflow image-only con dos ciclos anti-drift convergidos`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-1508-globe-cloud-run-iac-deploy-ownership`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Adoptar de forma brownfield `globe-studio-internal` y `globe-api-internal` en Terraform sin reemplazarlos, y fijar
un modelo de ownership de un solo escritor por campo entre Terraform y `.github/workflows/deploy-internal.yml`.
Terraform gobierna configuración estable y seguridad; el workflow despliega únicamente la imagen/revisión. La task
cierra el drift de ingress, escala, runtime SA, env y `invoker_iam_disabled` sin poner en riesgo el dominio publicado.

## Why This Task Exists

ADR-004 exige que los servicios Cloud Run entren a IaC, pero mezclar ese import con el cutover DNS de `TASK-1507`
aumentaba innecesariamente el blast radius. Además, importar el recurso sin modificar el workflow actual crearía dos
escritores: Terraform intentaría reconciliar el template mientras `gcloud run deploy` vuelve a mutar imagen, runtime SA,
escala y postura de invocación. Esta task separada resuelve esa causa raíz con ownership explícito, import no destructivo
y una prueba de convergencia deploy→plan.

## Goal

- Definir y aplicar ownership por campo: Terraform para configuración estable/seguridad; workflow para imagen/revisión.
- Importar ambos servicios vivos con cero destroy/replace y protecciones contra borrado accidental.
- Verificar que un deploy posterior no produce drift Terraform fuera del cambio de imagen explícitamente ignorado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` (ADR-004)
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001)
- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`

Reglas obligatorias:

- Importar recursos vivos antes de aplicar; cualquier destroy/replace de un servicio aborta la ejecución.
- Terraform y el workflow no pueden gobernar el mismo campo. `ignore_changes` se limita a la imagen/revisión que
  despliega el workflow; nunca se usa para ocultar drift amplio del template, seguridad, env o escala.
- `globe-studio-internal`: `invoker_iam_disabled=true`, ingress `internal-and-cloud-load-balancing`, ceiling **3 a nivel servicio Y a nivel revisión**
  (valor vivo verificado; `TASK-1465` complete limpió el gate de HA).
- `globe-api-internal`: `invoker_iam_disabled=false`, IAM-private, audience `run.app`, ingress `all` (su caller llega por internet desde Vercel: endurecerlo cortaría la federación workload), ceiling 3/3 (valor vivo
  verificado; `TASK-1465` complete limpió el gate de HA).
- Ningún secreto crudo entra a HCL, state, plan, logs o outputs; usar referencias de Secret Manager.

## Normative Docs

- `docs/tasks/complete/TASK-1506-globe-frontend-hosting-front-door-decision.md`
- `docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`
- `docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Dependencies & Impact

### Depends on

- `TASK-1507` completa: el dominio y el ingress final del web constituyen el baseline a importar.
- Foundation IaC keyless `TASK-1464` y state remoto `gs://efeonce-globe-tfstate`.
- Servicios vivos `globe-studio-internal` y `globe-api-internal` en `southamerica-west1`.
- Provider `hashicorp/google`/`google-beta` **`~> 7.0`** (subido desde `~> 6.0` en esta task: el ceiling a nivel servicio `scaling.max_instance_count` **no existe** en 6.x. La major se verificó sobre toda la config: 76 de 78 recursos planean no-op). Ver en Discovery la versión que soporta
  `google_cloud_run_v2_service.invoker_iam_disabled`.

### Blocks / Impacts

- Cierra el drift de Cloud Run pendiente en ADR-004 y el runbook de TASK-1464.
- Deja una base reproducible para HA después de `TASK-1465` y **levanta el cap efectivo de 1 a 3**, con lo que el spend fence cross-réplica queda por fin ejercitable.
- Cambia el contrato del workflow de deploy: ya no vuelve a declarar runtime SA, escala ni invoker policy.

### Files owned

- `../efeonce-globe/infra/terraform/services.tf` (nuevo)
- `../efeonce-globe/infra/terraform/imports.tf`
- `../efeonce-globe/infra/terraform/variables.tf`
- `../efeonce-globe/infra/terraform/outputs.tf`
- `../efeonce-globe/.github/workflows/deploy-internal.yml`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Current Repo State

### Already exists

- `../efeonce-globe/infra/terraform/` gobierna identidades, WIF, Artifact Registry, buckets, IAM, budgets y señales.
- `.github/workflows/deploy-internal.yml` despliega ambas variantes con `gcloud run deploy` y hoy repite
  `--service-account`, `--no-allow-unauthenticated`, `--min-instances` y `--max-instances` además de la imagen.
- Los dos servicios están vivos y usan el mismo artefacto de `apps/studio-web`, diferenciados por runtime env.

### Gap

- Ningún `google_cloud_run_v2_service` representa los servicios vivos en state/HCL.
- Ingress, env, scale, runtime SA e `invoker_iam_disabled` pueden derivar por cambios manuales o deploys parciales.
- No existe un contrato machine-checkable que impida que Terraform y el workflow vuelvan a escribir el mismo campo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/infra/terraform + ../efeonce-globe/.github/workflows/deploy-internal.yml + Cloud Run GCP`
- Future candidate home: `remain-shared`
- Boundary: `Terraform gobierna configuración estable de los dos servicios; el workflow gobierna sólo image/revision deploy`
- Server/browser split: `n/a; IaC y workflow server-side, sin imports ni secretos en browser`
- Build impact: `workflow conserva Cloud Build y cambia únicamente la fase de deploy Cloud Run`
- Extraction blocker: `servicios brownfield vivos, state remoto, env/secret refs, tráfico ALB y audience run.app de API`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Terraform de Globe para Cloud Run + workflow keyless de deploy`
- Consumidores afectados: `browser vía ALB, workload API privado, GitHub deploy workflow, operadores de IaC`
- Runtime target: `production` (infra interna viva; no Production comercial)

### Contract surface

- Contrato existente a respetar: `ADR-004, ADR-001, TASK-1464 IaC runbook, TASK-1507 front door`
- Contrato nuevo o modificado: `ownership por campo de google_cloud_run_v2_service y workflow image-only`
- Backward compatibility: `gated` — import no-op y deploy smoke antes de considerar convergido
- Full API parity: `N/A — no capability; cambia IaC/deploy del runtime existente`

### Data model and invariants

- Entidades/tablas/views afectadas: `recursos GCP google_cloud_run_v2_service; sin tablas de dominio`
- Invariantes que no se pueden romper:
  - `web` conserva dominio/ALB, SSO, ceiling 3/3 e invoker check deshabilitado en el servicio
  - `api` conserva IAM perimeter + verificación in-app, audience `run.app` y `invoker_iam_disabled=false`
  - `ignore_changes` cubre sólo el campo de imagen/revisión propiedad del workflow
- Tenant/space boundary: `sin cambio; workspace/identity permanecen server-derived`
- Idempotency/concurrency: `state lock remoto; apply serial; deploy y apply no corren simultáneamente`
- Audit/outbox/history: `Terraform plan/state + GitHub Actions run + Cloud Audit Logs; sin event de dominio`

### Migration, backfill and rollout

- Migration posture: `none` (DB); adopción brownfield vía import blocks
- Default state: `servicios preservados; configuración HCL refleja primero el runtime vivo`
- Backfill plan: `N/A — import de infraestructura, no datos`
- Rollback path: `deletion_policy=ABANDON/state rm para retirar ownership sin borrar servicios; revert del workflow`
- External coordination: `owner GCP/IaC y owner del workflow; apply keyless o sesión local supervisada`

### Security and access

- Auth/access gate: `OIDC→WIF→globe-deployer; Cloud Run IAM + in-app ID token para api; SSO cookie para web`
- Sensitive data posture: `secrets — sólo Secret Manager refs; nunca valores crudos en HCL/state/logs`
- Error contract: `fallo de plan/apply/deploy detiene el rollout; no exponer body/tokens/secret values`
- Abuse/rate-limit posture: `N/A para IaC; postura de ingress/IAM existente se preserva fail-closed`

### Runtime evidence

- Local checks: `terraform fmt -check`, `terraform init`, `terraform validate`, plan import sin destroy/replace
- DB/runtime checks: `gcloud run services describe` pre/post con diff redactado de configuración
- Integration checks: deploy image-only a una revisión nueva; smoke humano por ALB y workload 403/200; plan post-deploy
- Reliability signals/logs: GitHub Actions run, Cloud Run readiness/request logs, Cloud Audit Logs, Terraform plan
- Production verification sequence: import→plan no-op→apply→plan convergido→deploy image-only→smokes→plan convergido

### Acceptance criteria additions

- [x] Source of truth, ownership por campo y consumidores están documentados con paths/recursos reales.
- [x] Invariantes web/API, acceso, serialización de apply/deploy y postura de secretos están preservados.
- [x] Import/rollback no destructivos y evidencia runtime pre/post están registrados.
- [x] Un deploy posterior deja Terraform convergido salvo el campo exacto de imagen ignorado deliberadamente.
- [x] No hay secretos crudos ni pérdida de IAM/SSO/audience/ingress.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Baseline vivo y ownership por campo

- Capturar de forma redactada la configuración efectiva de ambos servicios y compararla con el deploy workflow.
- Registrar una tabla de ownership: Terraform (`ingress`, runtime SA, env/secret refs, min/max scale,
  `invoker_iam_disabled`, deletion protection) vs workflow (image/revision).
- Confirmar el atributo/provider exacto para `invoker_iam_disabled`; prohibir un `ignore_changes` amplio.

### Slice 2 — Recursos Terraform + import no destructivo

- Declarar ambos `google_cloud_run_v2_service` con `deletion_protection=true` y política de abandono equivalente
  soportada por el provider, reflejando el runtime vivo y el estado final de TASK-1507.
- Agregar import blocks y repetir plan hasta obtener cero destroy/replace y cero cambio no explicado sobre servicios.
- Aplicar sólo el plan aprobado; verificar un segundo plan convergido.

### Slice 3 — Workflow image-only y prueba anti-drift

- Reducir `gcloud run deploy` a la imagen/revisión propiedad del workflow; retirar flags de configuración propiedad de
  Terraform sin cambiar autenticación keyless, build o readiness.
- Desplegar una revisión controlada, ejecutar smokes web/API y luego un plan Terraform.
- El plan post-deploy debe ser no-op; la única divergencia permitida es la imagen cubierta por el ignore exacto.

### Slice 4 — Runbook y cierre operativo

- Actualizar el runbook con el ownership por campo, serialización apply/deploy, import, rollback y prueba anti-drift.
- Actualizar runtime handoff, epic y lifecycle con evidencia real; no cerrar si falta apply o smoke vivo.

## Out of Scope

- Crear o cambiar `globe.efeoncepro.com`, ALB, DNS, TLS, OAuth o ingress de cutover (`TASK-1507`).
- Subir el ceiling **por encima de 3**: el gate `TASK-1465` ya está cleared y los stores durables existen, así
  que 1508 pinea el valor vivo (3) sin subirlo ni bajarlo. Un rollout HA que suba de 3 es una task aparte.
- Migrar frontend/BFF, habilitar clientes externos o Production comercial (`TASK-1480`).
- Cambiar código de dominio, API Contract Spine, providers creativos o capabilities.

## Detailed Spec

El modelo objetivo evita dos escritores sobre un mismo campo. Terraform representa el servicio y gobierna su postura
estable; `deploy-internal.yml` conserva la responsabilidad de producir la imagen y desplegar una revisión. El recurso
Terraform ignora sólo el path exacto de la imagen que cambia el workflow. Si el provider obliga a ignorar todo el
container/template, detener y rediseñar: ocultaría drift de env, secrets, runtime SA o recursos y no satisface la task.

El import se hace contra IDs `projects/efeonce-globe/locations/southamerica-west1/services/<service>`. Cualquier `-/+`,
destroy o pérdida de tráfico/IAM aborta. La salida de emergencia es retirar el recurso del state con política de abandono;
nunca destruir el servicio para hacer coincidir HCL. Apply y deploy se serializan para no competir por una revisión.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ownership) → Slice 2 (import/apply) → Slice 3 (workflow + anti-drift) → Slice 4 (docs/cierre).
- Nunca editar el workflow antes de que la tabla de ownership esté aprobada.
- Nunca aplicar un plan con destroy/replace o cambios de auth/traffic no explicados.
- Nunca ejecutar deploy y Terraform apply simultáneamente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Import reemplaza un servicio vivo | Cloud Run/IaC | high | import→plan iterativo; deletion protection/ABANDON; abortar ante `-/+` | plan muestra destroy/replace |
| Terraform revierte una imagen recién desplegada | Deploy | high | ignore exacto de image + plan post-deploy | plan propone cambiar image/revision |
| Workflow vuelve a mutar config estable | Deploy/IaC | medium | retirar flags no-image y test anti-drift | plan post-deploy cambia SA/scale/ingress/env |
| API pierde perímetro o audience | Security | low | invariantes explícitas + smoke 403/200 | anónimo obtiene 200 o caller autorizado falla |
| Secret queda materializado en state/log | Security | low | Secret Manager refs + revisión redactada | plan/state contiene valor crudo |

### Feature flags / cutover

No hay feature flag. El cutover es de ownership administrativo y se hace servicio por servicio, con plan/apply/smoke
completo antes de adoptar el siguiente. El tráfico y las URLs no cambian.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir documentación de ownership antes de apply | <15 min | sí |
| Slice 2 | remover recurso del state con política ABANDON; servicio sigue vivo | <30 min | sí |
| Slice 3 | revertir workflow al commit anterior y desplegar imagen buena conocida | <30 min | sí |
| Slice 4 | corregir docs/lifecycle al estado runtime real | <15 min | sí |

### Production verification sequence

1. Capturar baseline vivo redactado y verificar TASK-1507 completa.
2. Importar primero `globe-studio-internal`; plan sin destroy/replace → apply → smoke SSO por ALB.
3. Importar `globe-api-internal`; plan sin destroy/replace → apply → smoke 403 anónimo/200 caller autorizado.
4. Aplicar workflow image-only con una imagen controlada; verificar readiness y ambos smokes.
5. Ejecutar plan post-deploy: no-op salvo imagen ignorada exactamente; revisar Audit Logs.
6. Actualizar runbook/handoff y monitorear los siguientes dos deploys para confirmar ausencia de drift recurrente.

### Out-of-band coordination required

- Owner GCP/IaC para aprobar planes de import y aplicar keyless/supervisado.
- Owner del repo `efeoncepro/efeonce-globe` para ejecutar el workflow manual y observar dos ciclos de deploy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Ambos servicios están en Terraform sin destroy/replace y con protección contra borrado accidental.
- [x] Ownership por campo documentado y aplicado: Terraform config estable; workflow sólo image/revision.
- [x] `invoker_iam_disabled`, ingress, runtime SA, env/secret refs y el ceiling 3/3 quedan pineados por Terraform.
- [x] Deploy image-only genera revisión Ready, mantiene dominio/SSO/API privada y deja plan Terraform convergido (dos ciclos, un servicio cada uno).
- [x] `ignore_changes` cubre la imagen más `client`/`client_version` (metadata de la herramienta, no configuración); no oculta template/env/security/scale.
- [x] Runbook y handoff reflejan import, rollback, serialización y evidencia real.

## Verification

- `cd ../efeonce-globe && terraform -chdir=infra/terraform fmt -check -recursive`
- `cd ../efeonce-globe && terraform -chdir=infra/terraform init && terraform -chdir=infra/terraform validate`
- `cd ../efeonce-globe && terraform -chdir=infra/terraform plan` (pre/post apply y post deploy; 0 destroy/replace)
- `cd ../efeonce-globe && pnpm check && pnpm build` si el workflow o runtime code lo requiere
- `gcloud run services describe` pre/post para ambos servicios, con output sensible redactado
- Smoke SSO por `https://globe.efeoncepro.com`; API 403 anónimo + 200 caller autorizado
- `pnpm task:lint --task TASK-1508`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`

## Closing Protocol

- [x] `Lifecycle` y carpeta sincronizados con runtime real.
- [x] `docs/tasks/README.md`, `TASK_ID_REGISTRY.md` y EPIC-028 sincronizados.
- [x] `EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` y `GLOBE_RUNTIME_HANDOFF.md` actualizados.
- [x] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` revisan el cierre.
- [ ] Si import/apply/deploy/smokes no ocurrieron en vivo, estado `code complete, rollout pendiente`, nunca `complete`.

## Follow-ups

- Ejercitar por primera vez el spend fence cross-réplica, ahora que el cap efectivo dejó de ser 1. Subir el ceiling por encima de 3 requiere de
  todos modos una task de rollout HA explícita, no este import.
- Cloud Armor/WAF y readiness externa siguen en `TASK-1480`.

## Open Questions

- ~~¿La versión del provider soporta `invoker_iam_disabled` en `google` o requiere `google-beta`?~~ **RESUELTA:** `google` 6.50.0 ya lo soporta como atributo top-level; no hace falta `google-beta`. Lo que SÍ obligó a subir a `~> 7.0` fue otro campo: el ceiling `scaling.max_instance_count` **a nivel servicio**.
- ¿Qué path exacto de `lifecycle.ignore_changes` a `image` produce plan convergido sin ocultar otros campos del template?
