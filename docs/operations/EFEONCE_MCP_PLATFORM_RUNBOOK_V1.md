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
| `MCP_ALLOWED_HOSTS` | no | hostname canónico + hostname `run.app` sólo durante private canary |
| `MCP_ALLOWED_ORIGINS` | no | allowlist equivalente; clientes sin `Origin` pasan |
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
- token v2: issuer del tenant Efeonce, `aud=c5363215-b9a6-4bf1-bb1c-e61963b37dac` y
  `scp=efeonce.mcp.read`;
- initialize autenticado: `200`; llamada `globe.*` sin scope Globe: `403` antes del dispatch.

## Globe canary

- Verifica `globe.capabilities.list` con caller allowlisted y workspace/scope interno.
- Retira temporalmente el invoker/allowlist en un entorno controlado y confirma deny.
- Fuerza timeout o endpoint inválido y confirma `provider_unavailable` sanitizado.
- Correlaciona request ID gateway → Globe sin registrar token ni body.
- Mantén `GLOBE_PROVIDER_ENABLED=false` hasta completar todas las pruebas.

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

Siguiente paso: ejecuta el canary OAuth autenticado contra el hostname público desde una sesión de Entra
autorizada y registra el resultado. El intento controlado no recibió el callback de autorización dentro de su
ventana; no lo interpretes como un fallo DNS/TLS ni debilites ingress o autenticación para sortearlo.

`mcp.efeoncepro.com` no recibe una segunda configuración OAuth. Si se usa, sólo redirige al hostname canónico.

El backend service de un serverless NEG no acepta `timeout_sec`; Google Cloud rechaza esa combinación. El
timeout de 3.600 segundos vive en Cloud Run y no se replica en el backend del load balancer.

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
- OAuth: Entra PKCE real aprobado; initialize `200`; scope Globe ausente `403`;
- edge: IP `34.111.78.237`, HTTP `301` a HTTPS, ingress `internal-and-cloud-load-balancing`, invoker público
  protegido por OAuth en aplicación;
- DNS: autoritativos, Google y Cloudflare resuelven `mcp.efeonce.org` a la IP global;
- certificado: `ACTIVE`, con `CN=mcp.efeonce.org` emitido por Google Trust Services. Health y discovery OAuth
  devolvieron `200`; un request MCP anónimo fue rechazado `401`. El canary OAuth autenticado por hostname sigue
  pendiente;
- provider Globe: `GLOBE_PROVIDER_ENABLED=false`, pendiente de `TASK-1473`; no se presenta como operativo;
- rollback: revisión previa `efeonce-mcp-gateway-00004-dwq` o provider OFF/fail-closed.
