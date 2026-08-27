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

**Estado vigente:** `public_read_only`, con OAuth obligatorio y tres providers read-only federados:

- Globe, con el reader `globe.producer.fleet.list`, limitado al workspace interno exacto;
- Greenhouse-SEO, habilitado el 2026-08-06 y acotado por el entitlement per-org del módulo SEO de Greenhouse.
  Sus tools de **lectura** están federadas y en producción; sus **dos tools de escritura** (TASK-1308) están
  federadas **en el repo pero sin desplegar** y, aun desplegadas, nacen fail-closed por falta de un cliente que
  pueda emitir su scope (ver la sección del provider).
- Greenhouse Hiring, habilitado internal-only para `hiring.talent_pool.search`,
  `hiring.talent_pool.profile.get`, `hiring.applications.review.list` y
  `hiring.application.review_packet.get`. Candidate review exige application exacta y purpose, devuelve solo CV
  minimizado/redactado/chunked ligado a hash y conserva audit; no expone PDF crudo, contacto, notas ni atributos
  protegidos.

Este estado no habilita clientes externos ni multitenancy. El adjetivo `read_only` describe lo que hoy es
**alcanzable por un token real**, no lo que está cableado: mientras `efeonce.mcp.seo.write` no lo tenga ningún
cliente, ninguna escritura es ejecutable por el borde público.

**Hiring está federado en producción interna.** `TASK-1726` publica los dos readers del Talent Pool y `TASK-1718`
los dos readers exactos de candidate review. El 2026-08-16 el canary
OAuth real verificó search/profile `200` con scope Hiring y `403` con el cliente base-only
`66985833-14e9-438e-add4-b740e84e9a64`. El 2026-08-18 el canary review verificó OAuth/token exchange,
initialize y ambas tools en 200, una chunk ligada a hash, y 401 sin autenticación. Links, tokens de assessment,
invitaciones, cambios de etapa, asignaciones y B2B siguen fuera; `TASK-1719`–`TASK-1722` y `TASK-1631` conservan
sus gates. TASK-1718 conserva firmas y pruebas revoked/base-only/rollback como deuda de cierre.

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
| `OAUTH_PUBLIC_CLIENT_ID` | no | client público PKCE pre-registrado que devuelve `POST /register` (shim DCR); declarada en `deploy.yml` con default `32617b87-e7ef-493a-838f-1ff3f0213b93` |
| `GLOBE_PROVIDER_ENABLED` | no | default `false`; sólo `true` con canary/IAM verdes |
| `GLOBE_API_URL` | no | URL IAM-private de la API Globe |
| `GLOBE_API_AUDIENCE` | no | audience exacta para el ID token Google |
| `GLOBE_CREDIT_FUNDING_WRITE_ENABLED` | no | default `false`; habilita sólo la tool one-shot certificada |
| `GREENHOUSE_API_URL` | no | origin Greenhouse exacto para el command de funding |
| `GREENHOUSE_TOKEN_EXCHANGE_URL` | no | endpoint RFC 8693 exacto y audience del ID token WIF |
| `GREENHOUSE_VERCEL_BYPASS_SECRET` | sí | inyectado desde `greenhouse-vercel-automation-bypass` en GCP Secret Manager; nunca GitHub var/env file. Es sólo bypass de transporte para el hop interno exacto token-exchange/command; nunca identidad/autorización, discovery, respuesta MCP, cliente o provider externo. |
| `GREENHOUSE_SEO_PROVIDER_ENABLED` | no | default `false`; `true` sólo con lane Greenhouse verde y canary aprobado |
| `GREENHOUSE_ECOSYSTEM_API_URL` | no | origin Greenhouse exacto del lane ecosystem; en producción `https://greenhouse.efeoncepro.com` |
| `GREENHOUSE_ECOSYSTEM_TOKEN` | sí | inyectado desde `efeonce-mcp-gateway-greenhouse-token` en GCP Secret Manager; nunca valor plano en `vars`, workflow ni env file |
| `GREENHOUSE_HIRING_PROVIDER_ENABLED` | no | default `false`; sólo `true` después de Greenhouse `HIRING_TALENT_POOL_SEARCH_ENABLED` + `HIRING_TALENT_POOL_MCP_ENABLED`, grant Entra y canary aprobados |
| `GREENHOUSE_HIRING_CANDIDATE_REVIEW_ENABLED` | no | default `false`; registra las dos tools TASK-1718 sólo después de migration/backfill sintético, flags Greenhouse y sign-off Security/Privacy/Talent/Identity/MCP |
| `GREENHOUSE_HIRING_API_URL` | no | origin Greenhouse exacto; search/profile llaman Talent Pool y las tools TASK-1718, cuando están habilitadas, sólo las rutas App API review exactas |
| `GREENHOUSE_HIRING_TOKEN_EXCHANGE_URL` | no | endpoint RFC 8693 exacto para clientes separados `efeonce-mcp-hiring` y `efeonce-mcp-hiring-review` |
| `GREENHOUSE_HIRING_VERCEL_BYPASS_SECRET` | sí | mismo secret ref system-managed de Vercel, enviado sólo al token exchange y a las dos rutas Hiring exactas; nunca identidad ni autorización |

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
- cliente público PKCE de diagnóstico: `32617b87-e7ef-493a-838f-1ff3f0213b93`, sin secreto; desde 2026-08-06
  es también el client que el shim DCR devuelve a todo cliente MCP estándar (ver sección del shim más abajo);
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

## Shim DCR para clientes MCP estándar — 2026-08-06

Los clientes MCP estándar (Claude Code, custom connectors de claude.ai, Claude Desktop) exigen dynamic client
registration RFC 7591, que Entra no soporta. El gateway lo resuelve con un shim de compatibilidad (racional y
alternativa rechazada en el delta 2026-08-06 del ADR del gateway; formalización pendiente como `TASK-1654`):

- el protected-resource metadata anuncia al propio gateway como authorization server;
- el gateway publica `/.well-known/oauth-authorization-server` espejando los endpoints reales de Entra
  (authorize/token/jwks, cacheados de su configuración OIDC) más un `registration_endpoint` propio;
- `POST /register` nunca crea aplicaciones: devuelve siempre el cliente público pre-registrado
  `32617b87-e7ef-493a-838f-1ff3f0213b93` (PKCE, `token_endpoint_auth_method: none`), gateado por
  `OAUTH_PUBLIC_CLIENT_ID`;
- los scopes se anuncian cualificados como `https://mcp.efeonce.org/mcp/<scope>`, porque Entra v2 resuelve un
  scope pelado contra Microsoft Graph (`AADSTS650053`); el claim `scp` del token vuelve pelado, así que el
  verifier y los checks por-tool no cambiaron.

Los tokens los sigue emitiendo y validando Entra; el shim sólo re-anuncia metadata de descubrimiento y un
client fijo. No habilita clientes externos ni B2B: sólo usuarios con cuenta Entra del tenant.

### Verificación del shim

```bash
curl -s https://mcp.efeonce.org/.well-known/oauth-protected-resource
curl -s https://mcp.efeonce.org/.well-known/oauth-authorization-server
curl -s -X POST https://mcp.efeonce.org/register \
  -H 'content-type: application/json' \
  -d '{"redirect_uris":["http://localhost"]}'
```

Esperado:

1. el protected-resource metadata anuncia `https://mcp.efeonce.org` como authorization server y los scopes
   cualificados `https://mcp.efeonce.org/mcp/<scope>`;
2. el authorization-server metadata espeja authorize/token/jwks reales de Entra y declara el
   `registration_endpoint` del gateway;
3. `POST /register` responde el `client_id` `32617b87-e7ef-493a-838f-1ff3f0213b93` sin crear ninguna app
   (verifica en el tenant Entra que no aparezcan app registrations nuevas).

Prueba end-to-end: conectar un cliente MCP real. Verificado el 2026-08-06 con Claude Code, que autenticó y
conectó ("Authentication successful"/Connected) contra `mcp.efeonce.org`.

### Redirect URIs de la app Entra

La app pública `32617b87-e7ef-493a-838f-1ff3f0213b93` declara tres redirect URIs:

- `http://localhost` — loopback de Claude Code;
- `https://claude.ai/api/mcp/auth_callback` — custom connectors de claude.ai;
- `http://localhost:8765/callback` — canary/scripts locales (previa).

### Precedente break-glass — deploy por gcloud durante outage de GitHub Actions

Los dos fixes del shim se desplegaron por `gcloud` directo porque GitHub Actions estaba en major outage:

- revisión `efeonce-mcp-gateway-00015-4st` — shim DCR;
- revisión `efeonce-mcp-gateway-00016-6zh` — scopes cualificados;
- commits en `main` de `efeonce-mcp`: `ff68078`, `2365ef9`, `ae8f2f7`, `56e46f7`;
- canary 4/4 verde post-deploy.

Cuando Actions se recupere, el deploy normal del workflow converge sin trabajo extra: `deploy.yml` ya declara
`OAUTH_PUBLIC_CLIENT_ID` (con default). Rollback del shim: mover el tráfico a la revisión previa verificada:

```bash
gcloud run services update-traffic efeonce-mcp-gateway \
  --region=southamerica-west1 --project=efeonce-group \
  --to-revisions=<revision-previa>=100
```

Un break-glass exige commits ya en `main` (nunca working tree sucio), canary completo post-deploy y registro en
este runbook; no se convierte en el camino normal de deploy.

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

### Canary Studio Credits write

- Solicita además `efeonce.mcp.globe.credits.funding.ensure` y entrega a la tool únicamente una `authorityId`
  one-shot emitida por Greenhouse para canal `mcp`, client `efeonce-mcp-gateway` y auth mode `agent`.
- Verifica `initialize`, reader Globe y `globe.credits.funding.ensure`; éxito terminal es `completed|no_effect`.
- Confirma por readback que la authority execution queda terminal y que un replay no produce un segundo delta.
- Si Greenhouse staging tiene Vercel Deployment Protection, el gateway recibe el bypass desde Secret Manager y
  lo envía sólo al token exchange y command exactos. Nunca lo envíes a Globe, discovery, clientes, logs o
  respuestas MCP; tampoco lo uses para suplir identidad, capability, tenant o autorización.
- Canary certificado 2026-08-01: gateway `3add7b2`, workflow `30723992263`, authority
  `df166eab-2c22-4009-a674-b83c8df307e4`, outcome `completed/no_effect`, operación Globe
  `b69ecd23-6e41-4a5c-9bdf-c3f212e8bbeb` y capacidad efectiva sin cambio en 800.

## Provider Greenhouse-SEO (Search Visibility 360)

> Task dueña: `TASK-1647` (federación al gateway) sobre `TASK-1645` (lane ecosystem + tools en el MCP de
> Greenhouse). Habilitado en producción el 2026-08-06.

El provider `greenhouse-seo` es un **adapter delgado**: transporte, auth y routing. No tiene lógica de dominio.
Delega en el lane ecosystem de Greenhouse (`/api/platform/ecosystem/growth/seo/*`), que ya aplica el entitlement
per-org `seo_v2`, el 404 anti-oracle y las degradaciones honestas. Los payloads se pasan tal cual (`data` del
envelope del lane), así que un cliente MCP ve exactamente los mismos shapes que la UI y Nexa.

Tools publicadas — **el inventario COMPLETO del MCP interno de Greenhouse (21 tools SEO) está federado**
(TASK-1658 cerró el drift de 8 tools que vivían adentro sin federar ni excluir). Las de **lectura** van bajo el
**scope base** `efeonce.mcp.read`; las **cinco de escritura** (TASK-1308/1664/1666/1709) exigen el scope propio
del dominio `efeonce.mcp.seo.write` — un token de lectura jamás debe poder comprometer gasto DataForSEO. La lista
canónica y el guard bidireccional viven en `src/providers/greenhouse-seo-tool-parity.ts` del repo `efeonce-mcp`
(allowlist explícito: revisión humana por tool en la frontera pública, NUNCA auto-federación). Desde TASK-1658 el
guard además verifica **paridad de schema** (las claves del inputSchema del gateway contra el MCP interno;
divergencia sólo con razón declarada) y **annotations** (`readOnlyHint: false` en toda tool que escriba o compre
datos del proveedor), y falla nombrando la tool cuando una tool interna de Greenhouse no está ni federada ni
excluida (la dirección que antes era invisible).

| Tool | Recurso del lane | Scope |
| --- | --- | --- |
| `get_seo_entitlement` | `GET .../growth/seo/entitlement` | `efeonce.mcp.read` |
| `get_seo_keyword_opportunities` | `GET .../growth/seo/keyword-opportunities` | `efeonce.mcp.read` |
| `get_seo_visibility_360` | `GET .../growth/seo/visibility-360` | `efeonce.mcp.read` |
| `get_seo_rank_evolution` | `GET .../growth/seo/rank-evolution` | `efeonce.mcp.read` |
| `get_seo_site_audit_report` | `GET .../growth/seo/site-audit-report` | `efeonce.mcp.read` |
| `get_seo_backlink_profile` | `GET .../growth/seo/backlink-profile` | `efeonce.mcp.read` |
| `get_seo_backlink_detail` | `GET .../growth/seo/backlink-detail` | `efeonce.mcp.read` |
| `get_seo_keyword_market_data` | `GET .../growth/seo/keyword-market-data` | `efeonce.mcp.read` |
| `get_seo_keyword_discovery` | `GET .../growth/seo/keyword-discovery` | `efeonce.mcp.read` |
| `get_seo_grounded_query_draft` | `GET .../growth/seo/grounded-queries` | `efeonce.mcp.read` |
| `get_seo_overview_kpis` | `GET .../growth/seo/overview-kpis` | `efeonce.mcp.read` |
| `get_seo_performance` | `GET .../growth/seo/performance` | `efeonce.mcp.read` |
| `get_seo_performance_catalog` | `GET .../growth/seo/performance-catalog` | `efeonce.mcp.read` |
| `get_seo_domain_overview` | `GET .../growth/seo/domain-overview` | `efeonce.mcp.read` |
| `get_seo_url_visibility` | `GET .../growth/seo/url-visibility` | `efeonce.mcp.read` |
| `get_seo_prospect_diagnostic` | `GET .../growth/seo/prospect-diagnostic` | `efeonce.mcp.read` |
| `track_seo_keywords` | `POST .../growth/seo/keywords/track` | `efeonce.mcp.seo.write` |
| `untrack_seo_keywords` | `POST .../growth/seo/keywords/untrack` | `efeonce.mcp.seo.write` |
| `discover_seo_keywords` | `POST .../growth/seo/keyword-discovery` | `efeonce.mcp.seo.write` |
| `prepare_seo_grounded_queries` | `POST .../growth/seo/grounded-queries` | `efeonce.mcp.seo.write` |
| `run_seo_prospect_diagnostic` | `POST .../growth/seo/prospect-diagnostic` | `efeonce.mcp.seo.write` |

> Estado de despliegue 2026-08-27: la revisión **productiva** del gateway sirve las 13 tools previas;
> las 8 de TASK-1658 (`get_seo_overview_kpis`, `get_seo_performance`, `get_seo_performance_catalog`,
> `get_seo_domain_overview`, `get_seo_url_visibility`, `get_seo_backlink_detail`,
> `get_seo_prospect_diagnostic`, `run_seo_prospect_diagnostic`) están en el allowlist con suite verde
> (67/67, guard de paridad incluido) y evidencia de cableado: lane `entitlement` productivo 200 JSON con
> el consumer token real, y los 5 lanes nuevos vivos en staging (401 `missing_token` del envelope del
> lane = ruta desplegada + machine-auth activa). Su deploy se despacha DESPUÉS del próximo release
> develop→main de Greenhouse (antes daría 404 upstream — lección TASK-1661); el run completo del canary
> contra producción es parte de esa verificación. `prepare_seo_grounded_queries` responde además
> `aeo_forbidden` fail-closed para la identidad máquina compartida hasta TASK-1631, y el par de
> prospecto queda detrás de `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (hoy OFF en todos los ambientes —
> el canary trata esa respuesta honesta como estado, no como fallo).

**Granularidad del scope: un scope por CLASE DE BLAST-RADIUS, nunca uno por capability.** `efeonce.mcp.seo.write`
es del DOMINIO (`…seo.write`), no de la capability (`…seo.keywords.track`): un scope por capability convertiría
la lista de scopes de Entra en un espejo, editado a mano, del `capabilities_registry` de Greenhouse — y un espejo
de autorización divergido es peor que no tenerlo (el scope dice sí, el registry dice no, y nadie sabe cuál manda).
El scope responde *"¿este cliente puede hacer esta clase de acción?"*; la capability responde *"¿este actor, sobre
esta org?"* y ya se enforcea abajo: binding `internal` en el lane + entitlement per-ORG + techo de gasto en el
command. Corolario operativo: **federar la escritura N+1 de un dominio que ya tiene su scope no requiere tocar
Entra**, y por lo tanto no puede quedar bloqueada por eso.

Con esto el gateway declara **cinco** scopes cuando todos los providers gateados están activos: `efeonce.mcp.read`, `efeonce.mcp.globe.read`,
`efeonce.mcp.globe.credits.funding.ensure` (sólo con `globeCreditFunding.enabled` ON) y `efeonce.mcp.seo.write`
(sólo con `greenhouseSeo.enabled` ON), más `efeonce.mcp.hiring.read` (sólo con `greenhouseHiring.enabled` ON).

El cliente público compartido `32617b87-e7ef-493a-838f-1ff3f0213b93` solicita base + Globe read + Hiring read.
El cliente canario base-only `66985833-14e9-438e-add4-b740e84e9a64` conserva únicamente base + Globe read y existe
para probar el deny real de Hiring; no es el cliente que devuelve el shim DCR.

⚠️ **Estado de rollout de las dos tools de escritura (al 2026-08-07, verificar antes de operar):**

1. Los commits que las federan **siguen sin push** en `efeonce-mcp` (`cb316cc`, `41dca07` y el refactor de
   nombre del scope `bfbdf3a`), así que la revisión desplegada todavía no las expone. El repo tiene deploy
   productivo en push: empujar es desplegar.
2. `efeonce.mcp.seo.write` **existe** en la app de Entra `Efeonce MCP Resource` (`type: Admin`, `isEnabled:
   true`), pero **deliberadamente NO está cableado al cliente PKCE público compartido**
   `32617b87-e7ef-493a-838f-1ff3f0213b93` que el shim DCR entrega a Claude Code / claude.ai / Claude Desktop.
   Misma postura que `efeonce.mcp.globe.credits.funding.ensure`.

🔴 **NUNCA cierres un `insufficient_scope` de una tool de escritura agregando el scope al cliente público
compartido.** En el lane ecosystem el actor es la máquina (`mcp:<consumer>`), no la persona, así que ahí no hay
chequeo de capability por humano; y el hop gateway→Greenhouse va con un token de consumer fijo de binding
`internal`. En toda la cadena, **la única puerta que depende de quién es la persona es el scope OAuth**. Cablearlo
al cliente público —sin secreto, disponible a todo usuario del tenant— le daría poder de comprometer gasto
DataForSEO recurrente a cualquiera que se autentique, incluido quien no tiene la capability en Greenhouse, y lo
haría **en silencio**: nada falla, simplemente empieza a funcionar para todos. El camino correcto es un cliente
con grant emitible y revocable por tenant y capability — el gate B2B/multitenant de `TASK-1631`. Hasta entonces
las tools quedan federadas y fail-closed: registradas, verificables y sin token que las abra.

⚠️ `az ad app update` **reemplaza el arreglo completo** de scopes de la app: cualquier cambio va con round-trip
verificado, o borra los scopes vivos de Globe.

Identidad hacia Greenhouse: consumer sister-platform `EO-SPK-0004` con binding `EO-SPB-0004` (scope `internal`,
por lo que `organizationId` es un parámetro requerido). El gateway envía `x-greenhouse-sister-platform-key:
efeonce-mcp-gateway` y un `x-correlation-id`. Timeout upstream 10 s. Un error del lane se propaga como código
sanitizado (`greenhouse_seo_lane_<status>`), nunca el body crudo.

### Configuración runtime

- `GREENHOUSE_SEO_PROVIDER_ENABLED=true`
- `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`
- `GREENHOUSE_ECOSYSTEM_TOKEN` como **secret ref** de Cloud Run → `efeonce-mcp-gateway-greenhouse-token:latest`

El arranque falla en `loadConfig` si `GREENHOUSE_SEO_PROVIDER_ENABLED=true` y falta la URL o el token. Con el
provider apagado o mal configurado, las tres tools responden `503 greenhouse_seo_policy_blocked` — fail-closed
esperado, no una razón para pasar el token como valor plano.

Del lado de Greenhouse, el flag del módulo es `GROWTH_SEO_ENABLED` y es **multi-runtime**: Vercel lo lee para el
lane ecosystem y el `ops-worker` lo lee para el materializador de Search Console. Prenderlo en un solo runtime
deja el otro camino muerto. Está `true` en Vercel Production desde el redeploy `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`.

### Patrón de secret ref — dos gotchas que rompen el deploy

1. **El secreto puede nacer sin ninguna binding IAM.** `efeonce-mcp-gateway-greenhouse-token` se creó sin
   políticas, y Cloud Run no puede montar lo que la service account no puede leer: el deploy falla. Hay que
   otorgar `roles/secretmanager.secretAccessor` **scoped al secreto** para la SA de runtime del gateway:

   ```bash
   gcloud secrets add-iam-policy-binding efeonce-mcp-gateway-greenhouse-token \
     --project=efeonce-group \
     --member=serviceAccount:efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   ```

   No lo resuelvas con un rol a nivel de proyecto ni reutilizando otra service account.

2. **`--set-secrets` es destructivo, igual que `--set-env-vars`.** Reemplaza el conjunto completo de secretos de
   la revisión. Todos los secretos del gateway van en la **misma** bandera del `deploy.yml`; si declaras uno y
   omites otro, el próximo deploy borra el omitido en silencio. Hoy la bandera declara juntos
   `GREENHOUSE_VERCEL_BYPASS_SECRET` y `GREENHOUSE_ECOSYSTEM_TOKEN`. Aplicar un secreto sólo con
   `gcloud run services update --update-secrets` fuera del workflow tiene el mismo destino: dura hasta el
   siguiente deploy.

### Canary del provider contra el lane

Ejercita el provider real (compilado) con la service identity del gateway, sin pasar por OAuth ni por el front
door. Aísla "¿el adapter y el lane hablan?" de "¿el borde público autentica?". Requiere `pnpm build` previo.

```bash
cd ~/Documents/efeonce-mcp
pnpm build
GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com \
GREENHOUSE_ECOSYSTEM_TOKEN=$(gcloud secrets versions access latest \
  --secret=efeonce-mcp-gateway-greenhouse-token --project=efeonce-group) \
node scripts/greenhouse-seo-canary.mjs <organizationId> [<orgSinModulo>...]
```

El script nunca imprime el token. Resultado esperado: entitlement por org, `visibility-360` con `domainQuadrant`
o una degradación honesta explícita, y `404` para una org sin el módulo. Contra un entorno con Vercel Deployment
Protection agrega `GREENHOUSE_ECOSYSTEM_VERCEL_BYPASS_SECRET`; nunca envíes ese bypass a Globe ni lo dejes en logs.

Corrida de certificación 2026-08-06 contra producción:

- Berel: `domainQuadrant=riesgo`, 50 keywords, score AEO 44.5;
- Efeonce: `hasModule=true`, `tier=contracted`, con degradación honesta `no_seo_data` (entitled, sin serie SEO);
- org sin módulo: deny anti-oracle `404` → `greenhouse_seo_lane_404`.

### Smoke autenticado por el front door

El canary OAuth (`scripts/oauth-canary.mjs`) cubre las tools SEO cuando se le pasan las dos organizaciones:

```bash
MCP_CANARY_SEO_ORGANIZATION_ID=<org-entitled> \
MCP_CANARY_SEO_DENY_ORGANIZATION_ID=<org-sin-modulo> \
pnpm oauth:canary
```

Resultado 2026-08-06 con token Entra real sobre el scope base: `initialize 200`, `seoEntitlementStatus 200`,
`seoVisibility360Status 200`, `seoDomainQuadrant="riesgo"` (el cuadrante real de Berel a través del hostname
público) y `seoDenyFailedClosed=true`.

**Este smoke exige un login Entra interactivo** (authorization-code + PKCE con callback en `localhost:8765`): es
asistido por humano y **no es automatizable en CI**. No lo sustituyas por el canary del provider — ese no pasa
por OAuth ni por el edge. Desde 2026-08-06 el script ya no es la única vía autenticada: cualquier usuario con
cuenta Entra del tenant puede conectar un cliente MCP estándar (Claude Code, claude.ai, Claude Desktop) gracias
al shim DCR (ver su sección), pero la restricción para CI sigue vigente.

La pantalla de callback del canary es una página HTML autocontenida (light/dark, logotipo Efeonce inline) que
**limpia el authorization code de la URL con `history.replaceState`**: el code viajaba en el query string y
quedaba en el historial del navegador. Responde con `cache-control: no-store` y `referrer-policy: no-referrer`, y
escapa el `error_description` del IdP, que es entrada no confiable. No la reemplaces por un `text/plain` que
conserve el code en la barra de direcciones.

### Smoke del front door

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://mcp.efeonce.org/health
curl -s https://mcp.efeonce.org/.well-known/oauth-protected-resource
curl -s -i -X POST https://mcp.efeonce.org/mcp -H 'content-type: application/json' -d '{}' | head -20
```

Esperado el 2026-08-06: `/health` `200`; protected-resource metadata `200` declarando los 3 scopes (desde el
shim DCR, anunciados cualificados como `https://mcp.efeonce.org/mcp/<scope>`); `POST /mcp` anónimo `401` con
`WWW-Authenticate: Bearer resource_metadata=… scope="efeonce.mcp.read"`.

El conteo de scopes del metadata **es condicional, no fijo**: cada write gateado aparece sólo con su flag en ON.
Tras desplegar TASK-1308 con `greenhouseSeo.enabled` en ON serán **4**, sumando `efeonce.mcp.seo.write`. Un
metadata con 3 scopes después de ese deploy no es "el smoke que falló": significa que el flag del provider está
apagado — revisar `GREENHOUSE_SEO_PROVIDER_ENABLED` antes de tocar OAuth.

### Rollback del provider

`GREENHOUSE_SEO_PROVIDER_ENABLED=false` y deploy: las tools pasan a `503 greenhouse_seo_policy_blocked` y el resto
del gateway sigue operando. No retires el gateway ni el front door por una falla del lane SEO.

Segundo nivel, del lado de Greenhouse: `GROWTH_SEO_ENABLED=false`. Recuerda que es multi-runtime — apagarlo en
Vercel deja el lane muerto pero **no** detiene el materializador del `ops-worker`, y viceversa. Tercer nivel, por
organización: revocar el assignment `seo_v2` (con `effective_to`/`status`, nunca `DELETE` de historia) apaga a esa
org sin tocar runtime.

Nunca resuelvas un problema del provider ampliando el scope, quitando el entitlement per-org ni convirtiendo el
`404` anti-oracle en un `403` que revele la existencia de la organización.

### Registro de habilitación — 2026-08-06

- Greenhouse: release `develop→main` SHA `70e912056273d0a30e2aa8dacc2f4e62076e3b44`, `release_id`
  `70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`, manifest `released`, watchdog
  `drift_count=0`;
- Greenhouse runtime: `GROWTH_SEO_ENABLED=true` en Vercel Production, redeploy
  `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`;
- Gateway: repo `efeoncepro/efeonce-mcp` commit `76cb121`, workflow run `31059346243`, revisión Cloud Run
  `efeonce-mcp-gateway-00012-dkj` con `Ready=True` en `southamerica-west1` / `efeonce-group`;
- identidad hacia Greenhouse: consumer `EO-SPK-0004` + binding `EO-SPB-0004`;
- canary del provider contra producción: Berel `riesgo` (50 keywords, AEO 44.5) · Efeonce `contracted` con
  `no_seo_data` · deny `404`;
- smoke autenticado por `mcp.efeonce.org`: `initialize 200`, entitlement `200`, visibility-360 `200`,
  `domainQuadrant="riesgo"`, deny fail-closed;
- front door: `/health` `200`, protected-resource metadata `200` con 3 scopes, `POST /mcp` anónimo `401`;
- rollback: `GREENHOUSE_SEO_PROVIDER_ENABLED=false` + deploy, o revisión previa del gateway. **[verificar]** la
  revisión previa exacta a la que revertir no quedó registrada en esta sesión; léela con
  `gcloud run revisions list --service=efeonce-mcp-gateway --region=southamerica-west1 --project=efeonce-group`
  antes de necesitarla.

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
- Límite conocido: el cliente interno Entra recibe base + reader (`efeonce.mcp.read` y `efeonce.mcp.globe.read`)
  aunque solicite sólo el base; no habilites clientes hasta separar la emisión de scope/entitlement y repetir el
  deny real con una identidad base-only. El tercer scope declarado por el gateway, el write interno
  `efeonce.mcp.globe.credits.funding.ensure` gateado por `globeCreditFunding.enabled`, tiene su propio
  consentimiento/asignación y no forma parte de lo verificado en esta co-emisión.

### Identidad cliente externa — propuesta; sin acceso cliente activo

Entra permanece como identidad del canary interno. No crees usuarios cliente en ese tenant ni expongas una
capacidad Globe por haber pasado el canary. WorkOS tiene sólo una configuración de staging para discovery MCP; no
hay cliente, binding, secreto productivo ni login público operativo. La propuesta de un issuer B2B con UI propia
de Efeonce en `auth.efeonce.org`, el binding con la organización de Account 360 y el rollout
allow/base-only/revoke viven en
[`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
y [`TASK-1631`](../tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md). La primera cohorte será
por invitación de organizaciones cliente ya existentes y explícitamente allowlisted en Account 360: un email o
dominio no basta. Hasta la aceptación explícita del ADR y el plan de proveedor, no hay DNS productivo, secreto,
binding ni acceso cliente que configurar.
