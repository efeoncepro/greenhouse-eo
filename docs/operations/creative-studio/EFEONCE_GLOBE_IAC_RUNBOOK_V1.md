# Efeonce Globe — IaC apply runbook (TASK-1464)

> **Estado:** APLICADO en vivo (2026-07-19). El apply supervisado se ejecutó con OpenTofu
> (`tofu`, drop-in de Terraform) y dio `23 imported, 13 added, 0 changed, 0 destroyed` — la
> identidad viva de TASK-1454 se adoptó vía import blocks sin un solo destroy/replace, tras
> verificar en el `plan` que no había cambios destructivos. Un segundo `plan` post-apply dio
> "No changes" (convergido, idempotente). Este runbook sigue siendo el procedimiento canónico
> para cualquier apply futuro: la regla dura **import → plan → CERO destroy/replace → apply**
> se mantiene. `terraform validate` corre además en CI vía `.github/workflows/terraform-check.yml`.
> **Validado:** 2026-07-19.

## Qué gobierna este IaC

`infra/terraform/` codifica la foundation no productiva de Globe: las 4 service
accounts de TASK-1454, el WIF de Vercel, el Artifact Registry y las IAM existentes
(todo **importado**, nunca recreado), más lo nuevo — **GitHub WIF** para deploy
keyless, `run.admin` + act-as del deployer, bucket privado de evidencia del Lab,
el grant `aiplatform.user` de Vertex sobre **`api_runtime`** (la SA que corre el Lab; va en
`api_runtime`, no `web_runtime`, porque el Lab sólo se autoriza al service principal de api mode
—corregido durante el rollout de TASK-1490, `iam.tf::api_runtime_vertex`—),
budget/alertas y una señal de observabilidad (alerta si se crea una SA key: invariante
keyless). Los outputs versionados los consume TASK-1457; el Model Lab **no** duplica IaC.

## Regla de oro (por qué esto es supervisado)

Los service accounts y el WIF de Vercel están **vivos** y sostienen el bridge de
identidad de TASK-1454, el piloto interno y el SSO. Si el HCL no matchea la realidad,
`terraform apply` podría **destruir+recrear** una identidad viva y romper todo eso. Por
eso el protocolo es: **import → plan → leer el plan → sólo aplicar si NO hay
destroy/replace.**

## Paso 0 — Bootstrap del state bucket (una vez, fuera de Terraform)

```bash
gcloud storage buckets create gs://efeonce-globe-tfstate \
  --project=efeonce-globe --location=southamerica-west1 \
  --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://efeonce-globe-tfstate --versioning
```

Autenticación local: `gcloud auth login` + `gcloud auth application-default login`
(ambos; ADC y CLI pueden desalinearse).

## Paso 1 — Init + plan (LECTURA; no cambia nada)

```bash
cd infra/terraform
terraform init                     # usa el backend GCS ya bootstrapeado
terraform plan -out tfplan
```

**Verificar en el plan (bloqueante):**

- Cada recurso de `imports.tf` aparece como **import/adopt**, no como *create* ni
  *replace*.
- **CERO** líneas `destroy`, `replace` o `-/+` sobre service accounts, WIF pool/provider
  o Artifact Registry. Si aparece una, **PARAR**: hay drift entre el HCL y la realidad;
  corregir el HCL (o el import id) y re-planear. NUNCA aplicar con un destroy/replace de
  identidad viva.
- Los servicios `iam/logging/monitoring` pueden aparecer como *enable* (idempotente).
- Lo nuevo (GitHub WIF, `run.admin`, act-as, lab bucket, budget si `enable_budget=true`,
  log metric/alert) aparece como *create* — esperado.

Si algún import id no matchea (p.ej. formato de un IAM member), Terraform lo dice en el
plan sin destruir nada; ajustar el id en `imports.tf` y repetir.

## Paso 2 — Apply (SUPERVISADO, sólo con plan limpio)

```bash
terraform apply tfplan
```

Sólo tras confirmar el Paso 1. Tras el primer apply, los `import` blocks ya cumplieron
su función; se pueden dejar (son idempotentes) o retirar en un commit posterior.

## Paso 3 — GitHub WIF (deploy keyless)

Tras aplicar (que crea el pool/provider `github-actions`):

1. Setear el secret del repo `efeoncepro/efeonce-globe`:
   `GCP_WORKLOAD_IDENTITY_PROVIDER` = el output `github_wif_provider`
   (`projects/818083690953/locations/global/workloadIdentityPools/github-actions/providers/efeoncepro-efeonce-globe`).
2. El workflow `deploy-internal.yml` (dispatch manual) autentica por OIDC→WIF→`globe-deployer`
   sin llaves. Requiere un `Dockerfile` de la app (prerequisito de rollout).

## Smokes (evidencia)

| Smoke | Cómo | Esperado |
|---|---|---|
| **allow** | dispatch `deploy-internal.yml` desde `efeoncepro/efeonce-globe` | auth OK, build+deploy, `describe` ready=True |
| **deny** | intentar federar desde otro repo / sin el `attribute.repository` correcto | STS rechaza (attribute_condition) |
| **revocation** | quitar el binding `github_deployer` (o suspender el provider) y re-dispatch | auth falla; restaurar reingresa acceso |
| **budget** | con `enable_budget=true`, forzar gasto de prueba o bajar el umbral | alerta a los notification channels |

`terraform-check.yml` corre `fmt -check` + `validate` en cada PR que toca `infra/terraform/**`.

## Rollback

- **IaC**: `git revert` del commit + re-plan/apply; o `terraform apply` de la versión
  anterior. Los recursos importados no se recrean.
- **GitHub WIF**: quitar el pool/provider o el binding del deployer → CI pierde acceso;
  no afecta el runtime.
- **Budget/observabilidad**: `count`/flags → 0 recursos.
- El state vive versionado en `gs://efeonce-globe-tfstate` (rollback de state posible).

## Qué NO hace este IaC

- No aprovisiona las Cloud Run services de la app (las despliega el workflow keyless).
  **Follow-up de IaC (pendiente):** como esos servicios no están en Terraform, su configuración de
  invoker —incluido `invokerIamDisabled`— queda **sin gobernar**, y nada previene drift. Hoy
  `globe-studio-internal` tiene `invokerIamDisabled=true` (coherente con ser app web con SSO: un
  browser no presenta ID token, y la capa de app aguanta anónimo → 401), mientras `globe-api-internal`
  **no** lo tiene (anónimo → 403 en el perímetro). Traer los servicios a IaC para fijar ese flag
  explícitamente es trabajo pendiente.
- No crea Cloud SQL/tenancy (TASK-1465) ni secretos de provider (rollout del canary live).
- No habilita producción ni clientes externos. `enable_budget` default OFF.
