# Efeonce Globe — IaC apply runbook (TASK-1464)

> **Estado:** APLICADO en vivo (2026-07-19). El apply supervisado se ejecutó con OpenTofu
> (`tofu`, drop-in de Terraform) y dio `23 imported, 13 added, 0 changed, 0 destroyed` — la
> identidad viva de TASK-1454 se adoptó vía import blocks sin un solo destroy/replace, tras
> verificar en el `plan` que no había cambios destructivos. Un segundo `plan` post-apply dio
> "No changes" (convergido, idempotente). Este runbook sigue siendo el procedimiento canónico
> para cualquier apply futuro: la regla dura **import → plan → CERO destroy/replace → apply**
> se mantiene. `terraform validate` corre además en CI vía `.github/workflows/terraform-check.yml`.
> **Validado:** 2026-07-19.
>
> **Delta 2026-07-21 (TASK-1507):** un segundo apply supervisado agregó el **front door internal-only**
> (`infra/terraform/front_door.tf`). Plan: `11 to add, 0 to change, 0 to destroy`, con 65 recursos no-op,
> CERO destroy/replace y CERO recursos Cloud Run en el diff (verificado sobre el plan JSON). El primer
> apply creó 8/11 y falló en los 3 del carril HTTP-redirect por propagación de `compute.googleapis.com`;
> la carrera se corrigió **en el HCL**, no reintentando a ciegas, y el segundo apply cerró 3/3 con un
> `plan` posterior en "No changes". Herramienta **de ese apply**: OpenTofu v1.12.4, provider
> `hashicorp/google` 6.50.0 — el pin vigente del carril es **`~> 7.0`**, ver el Delta de TASK-1508.
> **Validado:** 2026-07-21. Sigue siendo internal-only: no habilita Producción, HA ni clientes externos.
>
> **Delta 2026-07-21 (TASK-1508):** los **dos servicios Cloud Run** entraron a Terraform por import
> brownfield (`2 imported, 2 changed, 0 destroyed`), junto con el invoker binding de la api
> (`greenhouse-globe-caller` → `roles/run.invoker`). El pin del provider `hashicorp/google` subió de
> `~> 6.0` a **`~> 7.0`** (`infra/terraform/versions.tf`, también para `google-beta`): el ceiling a nivel
> servicio (`scaling.max_instance_count`) **no existe en 6.x**. Bajo la major nueva, 76 de 78 recursos
> quedaron no-op. Desde esta task `deploy-internal.yml` pasa **sólo `--image`** y el `ignore_changes` cubre
> exactamente tres entradas: la imagen, `client` y `client_version` (metadata de la herramienta que
> escribió último, no configuración). La prueba anti-drift se ejecutó en **dos ciclos**, uno por servicio
> (runs `29872768853` web / `29875135147` api), y ambos dejaron `tofu plan` en **No changes**. Detalle en
> [§ Cloud Run bajo Terraform](#cloud-run-bajo-terraform--ownership-por-campo-task-1508-aplicado-2026-07-21).
> **Validado:** 2026-07-21. Sigue siendo internal-only: no habilita Producción, HA ni clientes externos.

## Frontera con el manual del operador (SoT por audiencia)

Hay **dos documentos vivos** sobre esta misma superficie y no compiten: se reparten por audiencia.

| Documento | Carril | Es el SoT de |
|---|---|---|
| **Este runbook** (`docs/operations/creative-studio/`) | **IaC** | Plan / apply / import / rollback de infraestructura, ownership por campo, invariantes de scope del state, modelo de costo, reglas derivadas del grafo Terraform. |
| [Manual — Operar el front door interno de Efeonce Globe](../../manual-de-uso/creative-studio/operar-front-door-globe.md) | **Operador** | El procedimiento paso a paso: verificar que el dominio está sano, correr el smoke SSO, mover el allowlist de redirect URIs, diagnosticar el certificado, **endurecer o restaurar el ingress** y ejecutar el rollback por slice. |

**Regla de edición:** donde el manual ya cubre el paso a paso operativo, este runbook lo **referencia** en
vez de duplicarlo. Lo que se queda acá es lo que sólo tiene sentido con el state de Terraform en la mano:
qué campo gobierna quién, qué **no** puede aparecer en un plan y por qué. La secuencia de cutover de
TASK-1507 se conserva más abajo como **registro de lo que se ejecutó** (evidencia de la task), no como el
procedimiento a repetir: para operar, el SoT es el manual.

## Qué gobierna este IaC

`infra/terraform/` codifica la foundation no productiva de Globe: las 4 service
accounts de TASK-1454, el WIF de Vercel, el Artifact Registry y las IAM existentes
(todo **importado**, nunca recreado), más lo nuevo — **GitHub WIF** para deploy
keyless, `run.admin` + act-as del deployer, bucket privado de evidencia del Lab,
el grant `aiplatform.user` de Vertex sobre **`api_runtime`** (la SA que corre el Lab; va en
`api_runtime`, no `web_runtime`, porque el Lab sólo se autoriza al service principal de api mode
—corregido durante el rollout de TASK-1490, `iam.tf::api_runtime_vertex`—),
budget/alertas y una señal de observabilidad (alerta si se crea una SA key: invariante
keyless), y **Cloud SQL `globe-pg`** — el datastore durable de Globe (`infra/terraform/cloud_sql.tf`,
TASK-1465): la instancia Postgres 16 más sus 3 IAM DB users (`web_runtime`/`api_runtime`/`deployer`),
los grants `cloudsql.client`/`cloudsql.instanceUser`, `sqladmin.googleapis.com` habilitado, PITR+backups
y deletion protection; keyless IAM auth, connector-only (sin authorized networks). Los outputs
versionados los consume TASK-1457; el Model Lab **no** duplica IaC.

Desde TASK-1507 gobierna además el **front door internal-only** (`infra/terraform/front_door.tf`): la IP
global estática, el serverless NEG de `southamerica-west1`, el backend service, los dos url maps
(HTTPS + redirect), el certificado administrado por Google para `globe.efeoncepro.com`, los dos proxies y
las dos forwarding rules (`:443` y `:80`). Es plomería de red **aditiva**. El registro DNS
`A` vive fuera de Terraform, en HostGator. Detalle de operación en
[§ Front door internal-only](#front-door-internal-only-task-1507).

Desde TASK-1508 gobierna además los **dos servicios Cloud Run** de la app
(`infra/terraform/cloud_run_services.tf`), adoptados por import brownfield: `ingress`,
`invoker_iam_disabled`, runtime SA, env + secret refs, ceilings de escala (servicio **y** revisión),
resources, timeout, concurrency, port, `deletion_protection` y el invoker IAM binding de la api. El
workflow keyless dejó de escribir configuración y sólo despliega la **imagen**. Contrato campo por campo en
[§ Cloud Run bajo Terraform](#cloud-run-bajo-terraform--ownership-por-campo-task-1508-aplicado-2026-07-21).

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

## Front door internal-only (TASK-1507)

`front_door.tf` publica **`globe.efeoncepro.com`** contra `globe-studio-internal` por el camino GA que
fijó ADR-004: Global External Application Load Balancer + serverless NEG en `southamerica-west1`,
certificado administrado por Google y redirect HTTP→HTTPS. Los domain mappings directos de Cloud Run
siguen en Preview y `southamerica-west1` no está en su lista de regiones soportadas — por eso el ADR los
rechazó.

Dos invariantes de scope, ambos load-bearing:

- **Las Cloud Run services no las gobierna este archivo.** El NEG referencia `globe-studio-internal` como
  **string literal**, a propósito. Desde TASK-1508 los servicios sí viven en el state, pero su dueño es
  `cloud_run_services.tf`: si un cambio acotado a `front_door.tf` produce un diff sobre
  `globe-studio-internal` o `globe-api-internal`, es un error de referencia y no un cambio esperado —
  **PARAR** y revisar el HCL.
- **`globe-api-internal` nunca entra al NEG**, nunca recibe custom domain y nunca queda browser-reachable.
  Sigue IAM-private (anónimo → 403, antes y después del cutover), con `GLOBE_API_EXPECTED_AUDIENCE` en los
  dos formatos de URL `run.app` y **nunca** el dominio browser; su `GLOBE_PUBLIC_BASE_URL` es el
  placeholder `https://globe-api-internal.invalid`. Domain mappings en el proyecto: 0.

El CDN queda **deliberadamente apagado** (`enable_cdn = false`): el front door sirve un shell SSO cuyas
respuestas son por sesión; cachearlas en el edge sería un bug de correctitud, no una optimización.

### Recursos y nombres reales

| Recurso Terraform | Nombre en GCP | Nota |
|---|---|---|
| `google_compute_global_address.front_door` | `globe-studio-front-door-ip` | `EXTERNAL`, `IPV4`. Asignada: `8.233.189.79` (output `front_door_ip_address`). |
| `google_compute_region_network_endpoint_group.studio_web` | `globe-studio-internal-neg` | `SERVERLESS`, región `southamerica-west1`. `cloud_run.service` es el **string literal** `"globe-studio-internal"`: referenciarlo como recurso lo adoptaría **desde este archivo**, y su dueño es `cloud_run_services.tf` (TASK-1508). |
| `google_compute_backend_service.studio_web` | `globe-studio-front-door-backend` | `EXTERNAL_MANAGED`, `enable_cdn = false`. |
| `google_compute_url_map.front_door` | `globe-studio-front-door` | Host único, backend único, sin path rules. |
| `google_compute_managed_ssl_certificate.front_door` | `globe-studio-front-door-cert` | `lifecycle { create_before_destroy = true }`: un managed cert no se edita in place, cambiar su lista de dominios fuerza reemplazo. |
| `google_compute_target_https_proxy.front_door` | `globe-studio-front-door-https-proxy` | Terminación TLS. |
| `google_compute_global_forwarding_rule.front_door_https` | `globe-studio-front-door-https` | `:443`, `PREMIUM`, `EXTERNAL_MANAGED`. |
| `google_compute_url_map.front_door_http_redirect` | `globe-studio-front-door-http-redirect` | `https_redirect = true`, `MOVED_PERMANENTLY_DEFAULT`, `strip_query = false`. Lleva `depends_on` explícito — ver [§ regla derivada](#regla-derivada--una-raíz-del-grafo-sin-arista-hacia-google_project_service). |
| `google_compute_target_http_proxy.front_door_http_redirect` | `globe-studio-front-door-http-proxy` | Sirve sólo el redirect; `:80` nunca llega al backend. |
| `google_compute_global_forwarding_rule.front_door_http` | `globe-studio-front-door-http` | `:80`, `PREMIUM`, `EXTERNAL_MANAGED`. |

Archivos de soporte tocados en el mismo apply: `locals.tf` (se agregó `compute.googleapis.com` a
`local.enabled_services` — **no** estaba habilitada en el proyecto, verificado con `PERMISSION_DENIED`
antes del cambio), `variables.tf` (`front_door_domain`, default `globe.efeoncepro.com`) y `outputs.tf`
(`front_door_ip_address`, `front_door_domain`, `front_door_certificate_name`).

### Secuencia apply verificada

> Esto es el **registro de lo que se ejecutó** en el cutover del 2026-07-21, no el procedimiento a repetir.
> Para operar —verificar el dominio, correr el smoke, mover el allowlist— el SoT es el
> [manual del operador](../../manual-de-uso/creative-studio/operar-front-door-globe.md), con la guarda sobre
> sus secciones stale anotada en [§ Frontera con el manual](#frontera-con-el-manual-del-operador-sot-por-audiencia). Acá se
> conservan las decisiones de orden y las trampas que sólo se entienden con el state en la mano.

El orden importa y **se invirtió deliberadamente** respecto de la spec original, que pedía cambiar
`GLOBE_PUBLIC_BASE_URL` y después ampliar el allowlist de redirect. Agregar un redirect URI es inerte
hasta que algo lo use; flipear `GLOBE_PUBLIC_BASE_URL` primero abre una ventana en la que `/auth/start`
anuncia un callback todavía no permitido y el SSO queda roto. Primero el allowlist, después la env var.

1. **ALB (Slice 1).** `tofu init` → `tofu plan -out tfplan` → leer el plan (CERO destroy/replace, CERO
   Cloud Run en el diff) → `tofu apply tfplan`. Tomar `front_door_ip_address` del output.
2. **DNS (Slice 2, out-of-band).** Crear el `A` de `globe.efeoncepro.com` → `8.233.189.79` en HostGator.
   El certificado queda `PROVISIONING` hasta que el nombre resuelva; ver
   [§ troubleshooting del certificado](#troubleshooting-del-certificado-administrado).
3. **Allowlist aditivo (Slice 3a).** El allowlist se administra por **primitive + CLI**, no por API/UI:
   no existe route admin de OAuth clients. Dry-run primero (sin `--apply` **no** escribe):

   ```bash
   pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback
   pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback --apply
   ```

   El CLI (`scripts/sister-platform-oauth-redirect-uris.ts`) es genérico —sirve `globe` y `kortex`— y
   envuelve `updateSisterPlatformOAuthRedirectUris` (`src/lib/sister-platforms/oauth-broker.ts`):
   aditiva/sustractiva, una sola transacción con `SELECT ... FOR UPDATE`, tocando **exclusivamente** la
   columna `redirect_uris`. Re-correr `--add` con un URI ya presente es **no-op** (`changed=false` en el
   output), así que reintentar es seguro si no quedó claro si el `--apply` llegó a escribir: leer `changed`
   y `redirectUris` del JSON en vez de ir a mirar la DB a mano en medio de un cutover. Un `--client`
   inexistente da `404 invalid_client` y nunca crea el cliente. La lógica vive en el broker y no en el
   script **a propósito**: el CLI es sólo un entry point, así que una route, un tool MCP o Nexa pueden
   operar el mismo cambio por la misma primitive (camino de Full API Parity abierto, no cerrado).
   **NUNCA** usar el seed
   `scripts/seed-globe-internal-pilot.ts` para un cutover: pasa `redirectUris: [uri]` (reemplaza el array,
   borrando el `run.app`) y `rotateToken: true` (rota el client secret y rompe el SSO vivo). Estado
   resultante del cliente `globe` en `greenhouse_core.sister_platform_oauth_clients`: de 1 URI
   (`…run.app/auth/callback`) a 2, conservando el `run.app` **a propósito** como camino de rollback.
4. **Verificación de tres vías contra el broker, ANTES de tocar el runtime.** `GET
   /api/auth/sister-platforms/authorize` del deployment Greenhouse que Globe consume, variando el
   `redirect_uri`: el broker valida el URI **antes** de mirar la sesión, así que discrimina sin necesitar
   login. Antes del cambio: dominio → `400 {"error":"invalid_redirect_uri"}`, `run.app` → `303` a
   `/login`. Después: dominio → `303`, `run.app` → `303`, y el wildcard
   `https://*.efeoncepro.com/auth/callback` sigue dando `400 invalid_redirect_uri` (el broker rechaza
   wildcards por diseño; el allowlist es exacto).
5. **Cutover de runtime (Slice 3b).** El valor es load-bearing: `apps/studio-web/src/app.ts` construye el
   callback como `new URL('/auth/callback', config.publicBaseUrl)` en `/auth/start`.

   ```bash
   gcloud run services update globe-studio-internal \
     --region southamerica-west1 --project efeonce-globe \
     --update-env-vars GLOBE_PUBLIC_BASE_URL=https://globe.efeoncepro.com
   ```

   **NUNCA `--set-env-vars`**, que es destructivo. Generó la revisión `globe-studio-internal-00018-zkx`
   sirviendo 100% del tráfico.
6. **Smoke SSO end-to-end contra el dominio.** `efeonce-globe/scripts/smoke-human-federation.mjs` recorre
   las tres piernas del login real (`/auth/start` → `303` al authorize de Greenhouse; authorize con sesión
   → `303` de vuelta al `redirect_uri` con `code`; callback con la cookie de transacción → `303` a
   `/studio` con cookie de sesión) y afirma que el `redirect_uri` anunciado pertenece al origen bajo
   prueba, PKCE `S256` con `code_challenge`, `state` y `nonce` presentes, `state` ecoado, y que el
   authorize no redirige fuera del origen. Env: `GLOBE_WEB_BASE_URL`, `GREENHOUSE_BASE_URL`,
   `GREENHOUSE_AGENT_SECRET`, `GREENHOUSE_AGENT_EMAIL` (default `agent@greenhouse.efeonce.org`),
   `GREENHOUSE_VERCEL_BYPASS`. Los secretos se leen del entorno y nunca se imprimen; el bypass de Vercel
   se manda **sólo** al origen de Greenhouse. Es el par humano de `smoke-private-api.mjs`, que cubre el
   carril workload. No hay atajo `pnpm`: se invoca con `node`, igual que su par workload.

   ```bash
   cd efeonce-globe
   # Sólo si el deployment Greenhouse tiene SSO de Vercel:
   export GREENHOUSE_VERCEL_BYPASS=<bypass>

   GLOBE_WEB_BASE_URL=https://globe.efeoncepro.com \
     GREENHOUSE_BASE_URL=<deployment Greenhouse> \
     GREENHOUSE_AGENT_SECRET=<AGENT_AUTH_SECRET> \
     node scripts/smoke-human-federation.mjs
   ```

   Esperado: `result: human_federation_ok`. `GLOBE_WEB_BASE_URL`, `GREENHOUSE_BASE_URL` y
   `GREENHOUSE_AGENT_SECRET` son obligatorias y el script falla con `<VAR>_missing` si faltan.
   `GREENHOUSE_VERCEL_BYPASS` es opcional: sólo hace falta cuando el deployment Greenhouse está protegido
   por SSO de Vercel (si va vacía, el header no se manda). `GREENHOUSE_AGENT_EMAIL` (default
   `agent@greenhouse.efeonce.org`) y `GLOBE_SMOKE_RESOLVE` también son opcionales.
   **Calibrar antes de confiar:** este smoke se corrió primero contra el origen `run.app` **antes** del
   cutover —el mismo comando con `GLOBE_WEB_BASE_URL` apuntando al `run.app`— y pasó
   (`human_federation_ok`). Así, si fallaba después, acusaba al cutover y no al instrumento. Un smoke sin
   calibrar no es evidencia.
7. **Endurecimiento de ingress (Slice 4).**

   ```bash
   gcloud run services update globe-studio-internal \
     --region southamerica-west1 --project efeonce-globe \
     --ingress internal-and-cloud-load-balancing
   ```

   **Contradicción de la spec que hay que registrar:** la spec decía "vía Terraform", pero al momento del
   cutover las Cloud Run services no estaban en Terraform y adoptarlas era explícitamente TASK-1508;
   `gcloud` era el único camino consistente con el scope de entonces. **Pinear el ingress por IaC lo cerró
   TASK-1508**: hoy el valor lo gobierna `cloud_run_services.tf` y un `gcloud run services update
   --ingress` sería un segundo escritor. Verificado en su momento: acceso directo por `run.app` → `404`
   (bloqueado); dominio por el ALB → `200`.
8. **Re-smoke SSO post-hardening.** Mismo comando del paso 6, sin cambiar una sola env var:
   `human_federation_ok` antes y después del endurecimiento.

**Resultados finales verificados en vivo:** `http://globe.efeoncepro.com/` → `301` a
`https://globe.efeoncepro.com:443/`; `https://globe.efeoncepro.com/` → `200`, TLS válido
(`ssl_verify_result=0`), HTTP/2, sirviendo el shell real de Globe
(`<title>Efeonce Globe — Internal creative studio</title>`) con su propio `x-correlation-id` — o sea,
responde la app, no una página del balanceador.

**Lo que este cutover NO tocó:** `invokerIamDisabled` sigue `true` en `globe-studio-internal` (correcto
para un servicio web con SSO: un browser no presenta ID token, la app autentica por su cookie) y
`maxScale` no se tocó en ninguna dirección. La verificación de entonces leyó el ceiling de **revisión** y
reportó 3; el efectivo era **1** (servicio=1 / revisión=3) — ver
[§ la trampa de los dos ceilings](#la-trampa-de-los-dos-ceilings-leer-antes-de-tocar-escala).
TASK-1508 lo corrigió a 3/3. La spec de TASK-1507 decía "preservar
`maxScale=1`" y estaba **stale**: TASK-1465 está complete y limpió el gate de HA. El invariante correcto
es que TASK-1507 **no toca `maxScale` en ninguna dirección**.

**Qué sobrevive un redeploy por workflow (estado vigente, post TASK-1508)** — la pregunta obvia tras el
cutover es si un deploy pisa la configuración, porque el valor más load-bearing es una env var. Hoy la
respuesta es uniforme, y por una razón estructural: **`deploy-internal.yml` ya no pasa ningún flag de
configuración — pasa sólo `--image`**. **Ya no queda drift-trap de workflow**, porque Terraform gobierna la
configuración (`cloud_run_services.tf`) y el workflow sólo despliega la imagen.

| Ajuste | ¿Lo pasa `deploy-internal.yml`? | Efecto de un redeploy |
|---|---|---|
| `GLOBE_PUBLIC_BASE_URL` (y el resto de env + secret refs) | No | **Sobrevive.** El cutover de Slice 3b no se deshace solo. |
| `ingress` | No | **Sobrevive.** `globe-studio-internal` en `internal-and-cloud-load-balancing`; `globe-api-internal` en `all` — **deliberado**, su perímetro es IAM + verificación in-app del ID token, endurecerlo cortaría la federación workload. |
| Ceiling de escala (servicio **y** revisión) | No | **Sobrevive en 3/3.** Terraform declara los dos campos — ver [§ la trampa de los dos ceilings](#la-trampa-de-los-dos-ceilings-leer-antes-de-tocar-escala). |
| `invoker_iam_disabled`, runtime SA, resources, timeout, concurrency, port | No | **Sobreviven.** Dueño único: Terraform. |
| Imagen del contenedor | **Sí — es lo único que pasa** | Se actualiza. Es el propósito del workflow y el único campo del que es dueño. |

La razón de fondo es la misma en todas las filas: `gcloud run deploy` preserva los ajustes a nivel servicio
que **no** se especifican en el comando, y el comando ya no especifica ninguno. **Pero la prueba de que eso
se sostiene no es leer el YAML, sino el plan convergido post-deploy:** desplegar, esperar readiness y correr
`tofu plan` debe dar **No changes**. Esa es la verificación canónica ante cualquier cambio del workflow —
procedimiento en [§ prueba anti-drift](#prueba-anti-drift-repetirla-ante-cualquier-cambio-del-workflow).

**NUNCA** "restaurar" el ceiling con `gcloud run services update <servicio> --max-instances=3`. Ese
workaround —prescrito mientras el drift-trap estuvo abierto— era **inefectivo**: escribía el ceiling de
**revisión**, no el de **servicio**, y Cloud Run aplica el menor, así que dejaba el techo efectivo en 1
aparentando haberlo restaurado. Hoy además sería un segundo escritor sobre un campo que gobierna Terraform.
Si hace falta cambiar la escala, se cambia en el HCL y se aplica.

### Modelo de costo

Fuente: **Cloud Billing Catalog API**, servicio "Networking" `E505-1604-58F8`, precios efectivos
**2026-07-21**, en USD.

| SKU | Precio | Aplicación |
|---|---|---|
| Cloud Load Balancer Forwarding Rule Minimum Global | US$0,025/hora → **~US$18,25/mes** | Cubre las 5 primeras forwarding rules globales; este front door usa 2 (`:443` y `:80`). |
| Cloud Load Balancer Forwarding Rule Additional Global | US$0,010/hora | No aplica hoy (2 de 5). |
| Global External ALB — Inbound Data Processing, Santiago (`southamerica-west1`) | US$0,012/GiB | Por tráfico servido. |
| Global External ALB — Outbound Data Processing, Santiago (`southamerica-west1`) | US$0,012/GiB | Por tráfico servido. |
| Certificado administrado por Google | sin cargo | — |

**Total fijo estimado: ~US$18,25/mes + ~US$0,024 por GiB servido** (inbound + outbound).

Nota de costo en rollback: destruir el balanceador pero dejar la IP global **reservada y sin adjuntar** la
empieza a facturar como IP estática ociosa. Destruir la dirección junto con el resto.

### Rollback por slice

Verificado como camino, **no ejecutado**. Es una **secuencia, no un menú**: los pasos están ordenados de
la recuperación más barata a la más lenta y **se ejecutan en orden**, deteniéndose en el primero que
resuelva. No hace falta desarmar el ALB para recuperar el acceso.

**Precondición que no es opcional:** el paso 1 (ingress) es **requisito del paso 2** cuando el objetivo es
recuperar el acceso por `run.app`. Revertir sólo `GLOBE_PUBLIC_BASE_URL` con el ingress todavía en
`internal-and-cloud-load-balancing` **empeora el estado en vez de arreglarlo**: el `run.app` sigue
respondiendo `404` (lo bloquea el ingress, no la env var), y el dominio —que sí sigue sirviendo por el
ALB— pasa a anunciar en `/auth/start` un callback `run.app` que el browser no puede alcanzar, así que el
login queda roto por el lado que antes funcionaba. El paso 2 por sí solo no es un rollback, es un segundo
incidente.

| Orden | Slice | Comando | Ventana |
|---|---|---|---|
| 1 | **Ingress** (precondición de 2) | `gcloud run services update globe-studio-internal --region southamerica-west1 --project efeonce-globe --ingress all` | <10 min — restaura el acceso directo por `run.app`. |
| 2 | **URL / OAuth** | `gcloud run services update globe-studio-internal --region southamerica-west1 --project efeonce-globe --update-env-vars GLOBE_PUBLIC_BASE_URL=https://globe-studio-internal-818083690953.southamerica-west1.run.app` | <15 min — el `run.app` sigue en el allowlist, así que no hace falta escribir en la DB. |
| 3 | **DNS** | Quitar el registro `A` de `globe.efeoncepro.com` en HostGator (out-of-band). | <60 min por propagación. |
| 4 | **ALB** | Retirar el **HCL del front door** (contenido de `16919d9` + `cf5e4d1`, que son una unidad) + `tofu plan` → leer → `tofu apply`. Destruir la **IP global** junto con el resto (ver nota de costo). **No es un `git revert` a ciegas** — ver abajo. | Según plan. |

Los commits del paso 4 son **dos y se revierten juntos**: revertir sólo `16919d9` deja huérfano el fix de
`cf5e4d1`, y revertir sólo `cf5e4d1` reabre la carrera con `compute.googleapis.com` descrita en
[§ regla derivada](#regla-derivada--una-raíz-del-grafo-sin-arista-hacia-google_project_service).

**El paso 4 NO es un `git revert` a ciegas.** `16919d9` introdujo `variable "front_door_domain"`, y desde
`TASK-1508` también la referencia `cloud_run_services.tf` (`GLOBE_PUBLIC_BASE_URL`). Revertir el commit borraría
la variable dejando viva la referencia: `tofu plan` **aborta** con `Reference to undeclared input variable` y ni
siquiera produce plan. Al llegar al paso 4 hay que **editar `cloud_run_services.tf` para que
`GLOBE_PUBLIC_BASE_URL` no dependa de `var.front_door_domain`** y recién entonces retirar el HCL del front door
junto con la variable. Los dos commits siguen siendo la unidad de contenido; lo que cambia es que se aplica como
edición reconciliada, no como revert automático. Y si los pasos 1-2 se hicieron con `gcloud`, releer el plan
antes de aplicar: aplicar sin reconciliar, con el ALB ya destruido, es outage total.

**Consecuencia de TASK-1508 sobre los pasos 1 y 2:** ambos escriben campos que hoy **gobierna Terraform**
(`ingress` y las env vars viven en `cloud_run_services.tf`). Usar `gcloud` ahí sigue siendo el camino
correcto **como maniobra de emergencia** —es lo más rápido para recuperar acceso— pero deja drift
deliberado: el siguiente `tofu plan` va a mostrar esos campos volviendo al valor del HCL. Regla de cierre
del rollback: una vez estabilizado, **reconciliar el HCL con el estado que se quiere conservar y aplicar**,
o el próximo apply deshace el rollback. Un plan con esos campos en diff justo después de un rollback no es
un error del state: es la evidencia de que falta reconciliar.

El `run.app` se conserva en el allowlist **a propósito**: con el ingress endurecido ese origen ya no es
alcanzable por browser, así que un código enviado ahí no llega a ninguna parte, y quitarlo obligaría a un
segundo write en DB bajo presión durante un rollback. Si algún día se decide retirarlo:

```bash
pnpm sister-platform:redirect --client globe \
  --remove https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback --apply
```

Quitar un URI que **no** está en el allowlist falla fuerte (`invalid_redirect_uri`) en vez de hacer un
no-op silencioso: durante un cutover, un no-op silencioso sobre una vista stale es justo cómo sobrevive
el callback equivocado.

### Troubleshooting del certificado administrado

El certificado se aprovisiona **después** del DNS, no antes. La secuencia normal es
`PROVISIONING` → (existe el `A`) → `ACTIVE`. En este apply el estado intermedio observado fue
`managed.domainStatus = FAILED_NOT_VISIBLE`, que **asusta y no significa lo que parece**.

```bash
gcloud compute ssl-certificates describe globe-studio-front-door-cert \
  --global --project efeonce-globe \
  --format='value(managed.status, managed.domainStatus)'
```

**Qué es `FAILED_NOT_VISIBLE`.** Es el resultado **guardado** del primer intento de validación de Google,
ocurrido **antes** de que el registro DNS existiera. Google no lo re-escribe hasta el siguiente intento,
así que el campo describe el pasado, no el presente. **No implica un error de configuración** y no
requiere recrear el certificado ni tocar el HCL: Google reintenta solo y el estado pasa a `ACTIVE` sin
intervención. Acá tardó **~28 minutos** desde la creación del registro DNS. Recrear el certificado por
impaciencia sólo reinicia el reloj.

**Checklist de descarte que se ejecutó** (todo salió OK; sirve para separar "esperar" de "hay algo roto"):

| Qué se descarta | Comando | Resultado observado |
|---|---|---|
| NS autoritativos del dominio | `dig NS efeoncepro.com +short` | `ns24.hostgator.cl`, `ns25.hostgator.cl` |
| Resolución pública del `A` | `dig A globe.efeoncepro.com @8.8.8.8 +short` / `@1.1.1.1` | `8.233.189.79` en ambos |
| Sin `AAAA` que desvíe a IPv6 | `dig AAAA globe.efeoncepro.com @8.8.8.8 +short` | vacío |
| Sin `CNAME` compitiendo con el `A` | `dig CNAME globe.efeoncepro.com @8.8.8.8 +short` | vacío |
| Sin `CAA` que bloquee a la CA | `dig CAA efeoncepro.com +short` | vacío |
| Cert adjunto al proxy | `gcloud compute target-https-proxies describe globe-studio-front-door-https-proxy --global --project efeonce-globe` | lista `globe-studio-front-door-cert` |
| Forwarding rule sobre la IP correcta | `gcloud compute forwarding-rules describe globe-studio-front-door-https --global --project efeonce-globe` | `:443` → `8.233.189.79` |
| El ALB ya responde por el dominio | `curl -sS -o /dev/null -w '%{http_code}\n' http://globe.efeoncepro.com/` | `301` desde internet |

Con esos ocho en verde, el diagnóstico correcto es **esperar**, no intervenir. Certificado servido al
cerrar: `subject CN=globe.efeoncepro.com`, `issuer C=US, O=Google Trust Services, CN=WR3`,
`notBefore Jul 21 19:42:23 2026 GMT`, `notAfter Oct 19 20:35:36 2026 GMT`.

#### La trampa: cache negativa del resolver local

El resolver de la máquina del operador mantuvo cache **negativa** del nombre. El `SOA` de
`efeoncepro.com` tiene `minimum` TTL **86400** (24 h), así que un `NXDOMAIN` cacheado **antes** de crear
el registro persiste ~24 h en esa máquina. En macOS, `dscacheutil -flushcache` sin `sudo` no hace nada.

```bash
dig SOA efeoncepro.com +short          # el último campo es el minimum TTL: 86400
```

**Síntoma engañoso:** `curl` devuelve `status=000` **sin `remote_ip`**. Parece que el dominio no sirve,
cuando en realidad sirve para todo el mundo menos para esa máquina. Un `status` con `remote_ip` vacío es
falla de resolución, no falla del front door.

```bash
curl -sS -o /dev/null -w 'status=%{http_code} remote_ip=%{remote_ip}\n' https://globe.efeoncepro.com/
```

**Cómo confirmar antes de concluir que algo está roto** — preguntarle a un resolver que no sea el local, y
forzar la dirección en el cliente:

```bash
dig A globe.efeoncepro.com @8.8.8.8 +short
curl -sS --resolve globe.efeoncepro.com:443:8.233.189.79 -o /dev/null \
  -w 'status=%{http_code} tls=%{ssl_verify_result}\n' https://globe.efeoncepro.com/
```

Para el smoke SSO existe el equivalente en proceso: `GLOBE_SMOKE_RESOLVE=host:ip` fija la resolución
**sólo** para ese proceso. No debilita ninguna aserción — SNI, CN del certificado, header `Host` y
`redirect_uri` siguen viajando con el hostname real; sólo decide a qué dirección disca el socket. Detalle
técnico para quien lo mantenga: `dns.setServers` **no** sirve (el `fetch` de Node usa el resolver del SO
vía `dns.lookup`); la vía correcta es interponer `dns.lookup` y devolver un array cuando `undici` pide
`all`.

## Regla derivada — una raíz del grafo sin arista hacia `google_project_service`

El primer apply del front door creó 8 de 11 recursos y falló en los 3 del carril HTTP-redirect con
`SERVICE_DISABLED` sobre `compute.googleapis.com`: la API se acababa de habilitar en ese mismo apply y no
había propagado.

La causa **no** fue un flake. `google_compute_url_map.front_door_http_redirect` era la única raíz del
grafo **sin arista implícita** hacia la habilitación de la API: el carril HTTPS la alcanza
transitivamente (forwarding rule → proxy → url map → backend service → NEG, y el NEG sí depende de
`google_project_service`), pero el url map de redirect no referencia ningún recurso Compute — sólo se
referencia a sí mismo hacia abajo. Terraform, sin arista, lo programó en paralelo con la habilitación y
perdió la carrera. El fix fue explicitar la dependencia en el HCL, no reintentar a ciegas:

```hcl
depends_on = [google_project_service.enabled["compute.googleapis.com"]]
```

**Regla general:** en un proyecto donde la API se habilita en el mismo apply que la consume, **todo
recurso que sea raíz del grafo** —es decir, que no referencie a otro recurso del mismo servicio— necesita
`depends_on` explícito hacia su `google_project_service`. La dependencia implícita sólo existe donde hay
una referencia. Al agregar un recurso nuevo, la pregunta de revisión es: *¿este recurso referencia a algún
otro del mismo servicio?* Si la respuesta es no, le falta el `depends_on`. El síntoma es un primer apply
parcial con `SERVICE_DISABLED`, y es **determinista para un proyecto nuevo** aunque el segundo apply pase
(para entonces la API ya propagó, lo que esconde el defecto en vez de arreglarlo).

## Smokes (evidencia)

| Smoke | Cómo | Esperado |
|---|---|---|
| **allow** | dispatch `deploy-internal.yml` desde `efeoncepro/efeonce-globe` | auth OK, build+deploy, `describe` ready=True |
| **deny** | intentar federar desde otro repo / sin el `attribute.repository` correcto | STS rechaza (attribute_condition) |
| **revocation** | quitar el binding `github_deployer` (o suspender el provider) y re-dispatch | auth falla; restaurar reingresa acceso |
| **budget** | con `enable_budget=true`, forzar gasto de prueba o bajar el umbral | alerta a los notification channels |
| **front door** (TASK-1507) | `curl -sSI http://globe.efeoncepro.com/` y `curl -sSI https://globe.efeoncepro.com/`; para TLS, `curl -sS -o /dev/null -w 'status=%{http_code} tls=%{ssl_verify_result}\n' https://globe.efeoncepro.com/` | HTTP → `301` a `https://globe.efeoncepro.com:443/`; HTTPS → `200` con `ssl_verify_result=0` y HTTP/2. Si el `status` vuelve `000` **sin `remote_ip`**, es el resolver local, no el front door — ver [§ la trampa](#la-trampa-cache-negativa-del-resolver-local). |
| **federación humana** (TASK-1507) | `node scripts/smoke-human-federation.mjs` desde `efeonce-globe`, con las 3 env vars obligatorias (comando completo en el [paso 6](#secuencia-apply-verificada)) | `result: human_federation_ok`. Calibrar contra el origen `run.app` antes de confiar en una corrida contra el dominio. |

`terraform-check.yml` corre `fmt -check` + `validate` en cada PR que toca `infra/terraform/**`.

## Rollback

- **IaC**: `git revert` del commit + re-plan/apply; o `terraform apply` de la versión
  anterior. Los recursos importados no se recrean.
- **GitHub WIF**: quitar el pool/provider o el binding del deployer → CI pierde acceso;
  no afecta el runtime.
- **Budget/observabilidad**: `count`/flags → 0 recursos.
- **Front door**: es una **secuencia ordenada** (ingress → env var/OAuth → DNS → ALB), no un menú, y no hace
  falta desarmar el balanceador para recuperar el acceso. Comandos exactos, precondición del paso 1 y regla
  de reconciliación posterior en [§ Rollback por slice](#rollback-por-slice); el procedimiento del operador
  vive en el [manual](../../manual-de-uso/creative-studio/operar-front-door-globe.md).
- El state vive versionado en `gs://efeonce-globe-tfstate` (rollback de state posible).

## Qué NO hace este IaC

- No construye ni publica la **imagen** de las Cloud Run services: eso lo hace el workflow keyless
  (`deploy-internal.yml`), y es el único campo del que ese workflow es dueño. La **configuración** de los
  dos servicios sí la gobierna este IaC desde TASK-1508 — `ingress`, `invoker_iam_disabled`, runtime SA,
  env + secret refs y los ceilings de escala dejaron de estar sin gobernar. La postura de invoker es
  deliberadamente **asimétrica** y ahora está declarada en el HCL: `globe-studio-internal` con
  `invokerIamDisabled=true` (coherente con ser app web con SSO: un browser no presenta ID token, y la capa
  de app aguanta anónimo), y `globe-api-internal` **sin** ese flag (anónimo → `403` en el perímetro IAM).
- **Cloud SQL `globe-pg` YA está en Terraform** (`cloud_sql.tf`, TASK-1465 — aplicado + live-verified
  2026-07-21, plan `12 added / 0 destroyed`): la instancia durable de Globe, sus 3 IAM DB users y sus
  grants los gobierna este IaC. Lo que **queda pendiente** es el **modelo rico de tenancy**
  (workspaces/members/grants), diferido. Arquitectura:
  [`EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md).
- **No gobierna el DNS.** El registro `A` de `globe.efeoncepro.com` → `8.233.189.79` se crea a mano en
  HostGator, fuera de Terraform. Un `plan` limpio no prueba que el nombre resuelva.
- No crea secretos de provider (rollout del canary live).
- No habilita producción ni clientes externos. `enable_budget` default OFF. Un dominio internal-only **no
  es** Producción, HA ni acceso de clientes externos: eso sigue gateado por TASK-1480.
- **No decide el host del frontend cliente comercial.** Que el shell interno se sirva desde Cloud Run
  detrás de este ALB **no** cierra la decisión de host/framework del frontend cliente: sigue **diferida**
  por ADR-004 (Vercel + Next.js es candidato vivo), a resolver en TASK-1505 y antes de TASK-1480.
  ADR-004 lo declara como regla dura anti-regresión: **NUNCA** leer "Cloud Run para el shell interno"
  como "Cloud Run para el frontend cliente comercial" — son superficies distintas
  ([`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md)).

## Cloud Run bajo Terraform — ownership por campo (TASK-1508, aplicado 2026-07-21)

Los dos servicios Cloud Run dejaron de estar fuera de IaC. El contrato es **un solo escritor por campo**:

| Campo | Dueño |
|---|---|
| `ingress`, `invoker_iam_disabled`, runtime SA, env + secret refs, ceiling de escala, resources, timeout, concurrency, port, `deletion_protection`, invoker IAM binding de la api | **Terraform** (`infra/terraform/cloud_run_services.tf`) |
| imagen del contenedor | **`deploy-internal.yml`** |
| `client` / `client_version` | nadie: metadata de la herramienta, ignorada |

- **`ingress` no es "un campo, un valor": los dos servicios difieren a propósito.** `globe-studio-internal`
  va en `internal-and-cloud-load-balancing` (su único camino de browser es el ALB), pero
  `globe-api-internal` va en **`all`**, y eso es **deliberado**
  (`infra/terraform/cloud_run_services.tf`): su caller es Greenhouse corriendo en Vercel, que llega **por
  internet y no desde una VPC**, así que endurecerlo cortaría la federación workload. Su perímetro no es el
  ingress sino **IAM** (`invoker_iam_disabled` en `false`, anónimo → `403`) más la verificación in-app del
  ID token, con audiencia derivada del `run.app`. **NUNCA** lo endurezcas por analogía con el servicio web.

`gcloud run deploy` preserva todo lo que no se le especifica, así que el workflow puede desplegar una imagen sin tocar
configuración. **NUNCA agregues flags de configuración de vuelta al workflow**: cada uno recrea el problema de dos
escritores que esta task cerró.

### La trampa de los dos ceilings (leer antes de tocar escala)

Un servicio Cloud Run tiene ceiling **a nivel servicio** (`Service.scaling.maxInstanceCount`) y **a nivel revisión**
(`template.scaling.maxInstanceCount`), y **aplica el menor**. Peor: `--max-instances` escribe **un campo distinto según
el subcomando** — `gcloud run deploy` el de servicio, `gcloud run services update` el de revisión.

Eso produjo un cap silencioso: ambos servicios tenían servicio=1 / revisión=3, o sea techo efectivo **1**, mientras toda
la documentación declaraba 3. El spend fence cross-réplica de `TASK-1465` nunca llegó a ejercitarse — ejercitarlo es
**`TASK-1512`**. **TASK-1508 corrigió el techo a 3/3** y puso ambos campos bajo Terraform, así que el drift-trap está
cerrado. Gobernarlos exige provider `google` **>= 7.x** (el campo a nivel servicio no existe en 6.x): por eso
`infra/terraform/versions.tf` fija **`~> 7.0`** para `google` y `google-beta`, y ése es el pin vigente del carril IaC.
Bajo esa major, 76 de 78 recursos quedaron no-op.

### Serialización apply / deploy

`tofu apply` y el workflow de deploy **no se corren en simultáneo**: compiten por la misma revisión. Secuencia segura:
esperar a que el deploy termine (`gh run watch`) y recién ahí planear/aplicar, o al revés.

### Prueba anti-drift (repetirla ante cualquier cambio del workflow)

1. Disparar `deploy-internal.yml` sobre un servicio.
2. Esperar readiness y correr los smokes (`smoke-human-federation.mjs` por el dominio; api anónimo → 403).
3. `tofu plan` → debe dar **No changes**. Cualquier otra cosa significa que el workflow volvió a escribir configuración.

Ese plan convergido es **la** evidencia de que el workflow no tiene drift-trap; la lectura del YAML no basta. Se ejecutó
en **dos ciclos, uno por servicio** (runs `29872768853` web y `29875135147` api) y ambos dieron **No changes**.

Evidencia de la primera corrida (run `29872768853`, imagen `51ade01eda82`): plan posterior **No changes**, con ingress,
invoker posture, ceiling 3/3, runtime SA y las 14 env vars intactos.
