# Efeonce MCP Platform Runbook V1

> **Owner:** Efeonce Platform
> **Task:** [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md)
> **Architecture:** [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1`](../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
> **Runtime repo:** `efeoncepro/efeonce-mcp`
> **Canonical resource:** `https://mcp.efeonce.org/mcp`

## Runtime inventory

| Resource | Canonical value |
| --- | --- |
| GCP project | `efeonce-group` |
| Region | `southamerica-west1` |
| Cloud Run service | `efeonce-mcp-gateway` |
| Runtime service account | `efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com` |
| Artifact Registry | `southamerica-west1-docker.pkg.dev/efeonce-group/efeonce-mcp/gateway` |
| WIF provider | `github-actions/efeoncepro-efeonce-mcp` |
| Public hostname | `mcp.efeonce.org` |
| Global front-door IP | `34.111.78.237` |
| DNS authority | HostGator (`ns24.hostgator.cl`, `ns25.hostgator.cl`) |
| OAuth issuer | Microsoft Entra tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4` |
| OAuth resource app ID / JWT audience | `c5363215-b9a6-4bf1-bb1c-e61963b37dac` |

## State model

- `local`: tests/build verdes; no dice nada sobre GCP.
- `private_canary`: Cloud Run IAM-private; puede tener OAuth sin front door.
- `edge_ready`: ALB, certificado e ingress listos; DNS aún no publicado.
- `public_core`: gateway público y OAuth operativo; ningún provider de producto habilitado todavía.
- `public_read_only`: endpoint público en el edge, OAuth exigido y providers read-only allowlisted.
- `degraded`: health del proceso responde, pero OAuth o un provider está fail-closed.

Un front door con DNS publicado pero certificado no `ACTIVE` no califica como `public_core`: permanece en
rollout TLS pendiente. No presentar `private_canary`, `edge_ready` ni ese estado transitorio como producción
pública.

**Estado vigente:** `public_read_only`, con OAuth obligatorio y el único reader federado
`globe.producer.fleet.list`. El provider Globe continúa limitado al workspace interno exacto; este estado no
habilita clientes externos ni multitenancy.

## Preflight

1. Verifica `git status --short` en `efeonce-mcp` y no despliega cambios no versionados.
2. Ejecuta `pnpm check`.
3. Verifica proyecto/cuenta sin imprimir secretos:

   ```bash
   gcloud config get-value account
   gcloud config get-value project
   gcloud run services describe efeonce-mcp-gateway --region=southamerica-west1 --project=efeonce-group
   ```

4. Confirma que el authorization server emite tokens con audience exacta y scopes esperados.
5. Antes de habilitar Globe, confirma que `TASK-1473` certificó el package/adapter y que la service account del
   gateway tiene `run.invoker` + allowlist en Globe. No lo sustituyas con una credencial de Greenhouse.

## Configuration contract

| Variable | Secret | Rule |
| --- | --- | --- |
| `MCP_PUBLIC_URL` | no | exactamente `https://mcp.efeonce.org/mcp` en producción |
| `MCP_ALLOWED_HOSTS` | no | en producción sólo `mcp.efeonce.org`; `run.app` sólo durante un private canary y se retira antes del front door |
| `MCP_ALLOWED_ORIGINS` | no | en producción sólo el hostname canónico; clientes sin `Origin` pasan |
| `MCP_REQUIRED_SCOPES` | no | scope base mínimo, inicialmente `efeonce.mcp.read` |
| `OAUTH_ISSUER` | no | issuer exacto descubierto y validado |
| `OAUTH_JWKS_URI` | no | JWKS HTTPS del authorization server |
| `OAUTH_AUDIENCE` | no | identificador exacto emitido en `aud`; Entra v2 usa el App ID del recurso, no su URL pública |
| `GLOBE_PROVIDER_ENABLED` | no | default `false`; sólo `true` con canary/IAM verdes |
| `GLOBE_API_URL` | no | URL IAM-private de la API Globe |
| `GLOBE_API_AUDIENCE` | no | audience exacta para el ID token Google |

Si falta configuración OAuth, `/health` responde pero `/mcp` devuelve `503 oauth_not_configured`. Esto es el
comportamiento seguro esperado, no una razón para habilitar acceso anónimo.

## Bootstrap keyless

La infraestructura base se declara en `efeonce-mcp/infra/terraform`. El state remoto vive en el bucket dedicado
versionado y con public access prevention. El bootstrap único del bucket se registra en el handoff; después,
OpenTofu es single writer para service account, Artifact Registry, WIF y front door.

```bash
cd ../efeonce-mcp/infra/terraform
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

Después del apply, configura en GitHub sólo el resource name del WIF provider y variables no secretas. No crees
service-account keys.

## Deploy private canary

1. Construye y publica una imagen inmutable con SHA.
2. Despliega Cloud Run sin `allUsers`, con ingress `all` sólo para el canary IAM directo.
3. Lee la URL `run.app`, agrega su hostname temporal a `MCP_ALLOWED_HOSTS` y redespliega.
4. Obtén un identity token para el servicio y verifica `/health` (`/healthz` está reservado/interceptado por
   Cloud Run y no es un probe externo válido para este servicio).
5. Prueba `/mcp` sin OAuth: debe fallar `401` si OAuth está configurado o `503` si aún no lo está.

El paso a ingress `internal-and-cloud-load-balancing` ocurre junto con el front door, no antes del canary directo.

## OAuth canary

Prueba, en este orden:

1. metadata root y path-specific;
2. request sin token → `401` + `WWW-Authenticate` con `resource_metadata` y scope;
3. token expirado → `401 invalid_token`;
4. issuer/audience incorrectos → `401 invalid_token`;
5. scope base ausente → `403 insufficient_scope`;
6. scope Globe ausente en `globe.*` → `403` antes de llamar Globe;
7. happy path con un cliente MCP real.

No publiques DNS si el authorization server no soporta registro/pre-registro compatible con el cliente objetivo
o no honra el resource/audience del endpoint canónico.

Canary Entra vigente:

- resource parameter: `https://mcp.efeonce.org/mcp`;
- cliente público PKCE de diagnóstico: `32617b87-e7ef-493a-838f-1ff3f0213b93`, sin secreto;
- canary público end-to-end aprobado por `mcp.efeonce.org`: initialize autenticado `200` y
  `globe.producer.fleet.list` `200` con rutas derivadas de Globe.

El cliente PKCE interno actual recibe `efeonce.mcp.read` **y** `efeonce.mcp.globe.read` aunque solicite sólo el
scope base. Por eso no es evidencia válida de una persona con Globe denegado: el test unitario del gateway sí
comprueba el rechazo antes del downstream, pero la prueba de persona/cliente debe usar una aplicación, rol o
consentimiento Entra que pueda recibir sólo el scope base. Ese es un gate obligatorio antes de acceso de clientes.

### Incidente de callback local resuelto — 2026-08-01

El primer canary no recibió el callback de authorization code porque su listener local vencía a los 180 segundos.
El límite ahora es configurable y el valor operativo es 10 minutos. Esto sólo afecta la espera del cliente PKCE
local; no modifica el timeout de Cloud Run, OAuth, ingress ni la política del gateway.

Cuando la caché del resolver local no contiene el record recién publicado, el canary puede usar un override DNS
de diagnóstico hacia la IP global **con SNI y `Host` públicos** para validar el front door. Ese override no es
configuración runtime, no cambia DNS autoritativo ni permite omitir TLS/OAuth; los resultados de producción se
atribuyen al hostname canónico `mcp.efeonce.org`.

## Globe canary

- El canary PKCE por `https://mcp.efeonce.org/mcp` verificó `initialize`, `globe.capabilities.list` y la tool
  real `globe.producer.fleet.list`; la última respondió rutas derivadas de readiness/binding, no un manifiesto.
- El único permiso downstream es `globe.producer.catalog.read` sobre `greenhouse-org:efeonce`; no hay selección
  de workspace, runs, assets, review, delivery, créditos ni reveal-house.
- La respuesta no entrega house, provider slug, costo de vendor ni margen. La taxonomía pública
  `Bajo|Estándar|Premium` se conserva porque no representa costo de proveedor.
- Los tests del gateway cubren rechazo por scope antes del dispatch, timeout/fallo upstream como
  `provider_unavailable` sanitizado y correlación. No fuerces una caída ni retires IAM de producción para
  demostrarlos: ejecútalos en test o canary aislado.

El canary habilita una prueba interna acotada, no disponibilidad general. Clientes externos requieren una
decisión explícita de B2B/multitenancy y entitlements por tenant/capability antes de recibir acceso. No conviertas
el scope básico de un tenant único en una autorización comercial o multi-tenant implícita.

## Front door and DNS

1. Aplica el módulo front door con `enable_front_door=true` después de existir Cloud Run.
2. Cambia Cloud Run a ingress `internal-and-cloud-load-balancing`.
3. Habilita `allUsers` como invoker sólo porque el resource server OAuth ya bloquea `/mcp` en aplicación; health
   no expone información sensible.
4. Crea en HostGator un record `A` de `mcp.efeonce.org` a la IP global reservada.
5. Espera certificado `ACTIVE`; no reduzcas la seguridad para acelerar provisioning.
6. Verifica DNS desde resolvers externos y ejecuta el smoke OAuth completo por el hostname.

### Emisión TLS resuelta — 2026-08-01

- Certificado administrado: `efeonce-mcp-gateway-cert`.
- Estado observado: certificado y dominio `ACTIVE`.
- La configuración de edge ya existe: el certificado está asociado al proxy HTTPS y el forwarding rule de 443
  está publicado.
- Readback DNS: los nameservers autoritativos de HostGator y resolvers públicos devuelven sólo el record `A`
  `mcp.efeonce.org -> 34.111.78.237`; no hay `AAAA` ni `CNAME` en conflicto.
- Verificación pública: el certificado presentó `CN=mcp.efeonce.org`; health y protected-resource metadata
  devolvieron `200`; un `POST /mcp` anónimo devolvió `401` con challenge OAuth. Los smokes usaron SNI contra la
  IP global porque el resolver local conservaba una caché negativa, mientras los autoritativos y públicos ya
  devolvían el record correcto.

El canary OAuth autenticado y el canary del manifest Globe aprobaron end-to-end por el hostname público. El
incidente previo del callback local vencido está resuelto con una ventana configurable de 10 minutos; conserva
el override DNS sólo como herramienta diagnóstica con SNI público, no como configuración de runtime.

`mcp.efeoncepro.com` no recibe una segunda configuración OAuth. Si se usa, sólo redirige al hostname canónico.

El backend service de un serverless NEG no acepta `timeout_sec`; Google Cloud rechaza esa combinación. El
timeout de 3.600 segundos vive en Cloud Run y no se replica en el backend del load balancer.

### Protección de disponibilidad en el edge — 2026-08-01

El backend público usa la política Cloud Armor `efeonce-mcp-gateway-edge`: throttle aproximado de **600 requests
por minuto por IP** y respuesta `429` al excederlo. Cloud Armor protege el serverless NEG antes de Cloud Run;
no reemplaza OAuth, entitlements, cuotas por workspace ni límites de gasto. Es un control de abuso y continuidad,
por lo que no debe usarse para cobrar, licenciar o decidir autorización de un cliente.

Cloud Run mantiene `concurrency=80` y `maxScale=5` efectivo inicialmente. Esa capacidad sirve al tráfico de transporte; cada provider
debe declarar sus propios límites de concurrencia, cuotas y circuit breakers antes de exponer trabajo de dominio.

## Rollback

- Provider defectuoso: `GLOBE_PROVIDER_ENABLED=false` y deploy; no retires todo el gateway.
- Revisión defectuosa: mueve 100% del tráfico a la revisión previa verificada.
- Auth defectuoso: fail-closed, revoca cliente/consentimiento y restaura issuer/audience previos.
- Edge defectuoso: conserva DNS con respuesta segura `503` o revierte el record exacto; considera TTL.
- Compromiso: deshabilita provider WIF/cliente OAuth, revoca IAM, preserva logs y abre incidente.

Nunca resuelvas rollback haciendo `/mcp` anónimo, aceptando tokens de otra audience o reutilizando una service
account de Greenhouse.

## Live verification record

Cada promoción registra:

- commit e image digest;
- Cloud Run revision y traffic split;
- authorization server/client probado, sin secretos;
- resultado allow/deny/expiry/audience/scope;
- provider/version y resultado allow/deny/timeout;
- IP/DNS/cert status cuando aplique;
- rollback target;
- timestamp y operador.

### Promoción 2026-08-01

- repositorio: PR `#2` fusionado a `main` en `d9c0c693b990ec0007757ee3460849085671f10a`; CI de `main` verde;
- source/image: commit `38591b5`, digest
  `sha256:6c74d7ab8a6c638dcf13dd6fb9a231041cf89b020889c48edf9fe664158b5ea5`;
- Cloud Run: revisión `efeonce-mcp-gateway-00005-bkw`, 100% de tráfico, service account dedicada;
- OAuth: Entra PKCE real y público aprobado; initialize `200`; scope Globe ausente `403`; callback local con
  ventana configurable de 10 minutos;
- edge: IP `34.111.78.237`, HTTP `301` a HTTPS, ingress `internal-and-cloud-load-balancing`, invoker público
  protegido por OAuth en aplicación;
- DNS: autoritativos, Google y Cloudflare resuelven `mcp.efeonce.org` a la IP global;
- certificado: `ACTIVE`, con `CN=mcp.efeonce.org` emitido por Google Trust Services. Health y discovery OAuth
  devolvieron `200`; un request MCP anónimo fue rechazado `401`; el canary OAuth autenticado aprobó por el
  hostname canónico. Un override DNS de diagnóstico conservó SNI público y no cambió el runtime;
- provider Globe: manifest de tools read-only verificado end-to-end por el hostname público. La capacidad sigue
  limitada a tenant único e identidad autorizada; clientes externos requieren decisión B2B/multitenant y
  entitlements. La federación Globe completa conserva los gates de `TASK-1473`;
- rollback: revisión previa `efeonce-mcp-gateway-00004-dwq` o provider OFF/fail-closed.

### Hardening 2026-08-01

- source: `637b2a5` (`feat(edge): protect public MCP gateway`), validado con `pnpm check`, `tofu validate` y
  plan posterior sin drift;
- edge: Cloud Armor `efeonce-mcp-gateway-edge` adjunto al backend del ALB, throttle `600/min` por IP y `429`;
- runtime: revisión `efeonce-mcp-gateway-00007-d79`, 100% traffic, `MCP_ALLOWED_HOSTS` y
  `MCP_ALLOWED_ORIGINS` restringidos a `mcp.efeonce.org`;
- smoke posterior: health y metadata `200`; `POST /mcp` anónimo `401` con `resource_metadata` y scope base.
  El request autenticado de `globe.capabilities.list` también devolvió el manifest esperado por el hostname
  canónico.

### Globe fleet reader habilitado 2026-08-01

- Globe: PR `#84`, merge `001ce1b7da9cb896ecfbc32ea3b64a99f8e2fdfc`, workflow `30702895278` verde y
  revisión `globe-api-internal-00179-qcz` al 100%. El principal `globe:service:mcp-provider` quedó limitado a
  `globe.producer.catalog.read` y al workspace interno exacto.
- Gateway: `ce593f2`, workflow de deploy `30703022114` verde y revisión
  `efeonce-mcp-gateway-00009-9c6` al 100%. La herramienta pública es sólo
  `globe.producer.fleet.list`, sobre `POST /v1/readers` con el envelope versionado.
- Canary: el flujo Entra authorization-code + PKCE real pasó en Chrome autenticado; `initialize`, discovery y
  fleet reader devolvieron `200`. Health y protected-resource metadata siguen `200`; request anónimo a `/mcp`
  sigue `401`.
- Capacidad: `concurrency=80`, `maxScale=5` efectivo. Rollback del gateway: `00008-fwj` o provider OFF y
  deploy. Rollback de Globe: revisión previa `globe-api-internal-00178-f5s`.
- Límite conocido: el cliente interno Entra recibe ambos scopes; no habilites clientes hasta separar la emisión
  de scope/entitlement y repetir el deny real con una identidad base-only.

### Identidad cliente externa — propuesta, no configuración activa

Entra permanece como identidad del canary interno. No crees usuarios cliente en ese tenant ni expongas una
capacidad Globe por haber pasado el canary. La propuesta de un issuer B2B en `auth.efeonce.org`, el binding con la
organización de Account 360 y el rollout allow/base-only/revoke viven en
[`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
y [`TASK-1631`](../tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md). Hasta la aceptación
explícita del ADR y el plan de proveedor, no hay DNS, tenant, secreto, client registration ni acceso cliente que
configurar.
