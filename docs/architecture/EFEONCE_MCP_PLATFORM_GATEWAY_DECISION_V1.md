# Efeonce MCP Platform Gateway Decision V1

- **Status:** Accepted
- **Date:** 2026-08-01
- **Owner:** Efeonce Platform
- **Scope:** repositorio `efeonce-mcp`, transporte MCP remoto, autenticación, federación de productos, Cloud Run, front door y dominio público
- **Reversibility:** two-way-but-slow
- **Confidence:** high para boundary, hosting, hostname, authorization server y el primer reader Globe después del canary PKCE real
- **Validated as of:** 2026-08-01
- **Implementation owner:** [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md)
- **First provider owner:** [`TASK-1473`](../tasks/in-progress/TASK-1473-globe-contract-packaging-parity-certification.md)

## Context

Efeonce necesita un endpoint MCP estable que pueda crecer desde Globe hacia las demás capacidades del
ecosistema. Montarlo dentro de Greenhouse acoplaría cada release del gateway al portal y volvería a convertir
Greenhouse en un runtime catch-all. Montarlo dentro de Globe haría al primer provider dueño accidental de la
plataforma completa. Ambos caminos contradicen el desacoplamiento buscado por el operador.

El runtime debe soportar Streamable HTTP, respuestas largas o transmitidas, escalado independiente, identidad
de servicio hacia providers y un front door estable. También debe preservar una regla existente del ecosistema:
MCP es un adapter downstream; no consulta bases de datos, storage ni proveedores creativos directamente y no
duplica lógica de negocio.

## Decision

1. Se crea el repositorio privado independiente `efeoncepro/efeonce-mcp`.
2. Su única responsabilidad inicial es operar el gateway MCP federado de Efeonce. Greenhouse mantiene el
   control plane documental y las tasks; cada producto mantiene sus contratos, datos y runtime.
3. La URL canónica es `https://mcp.efeonce.org/mcp`. `mcp.efeoncepro.com` puede reservarse o redirigir, pero no
   constituye una segunda audiencia OAuth ni otro endpoint canónico.
4. El runtime se despliega como `efeonce-mcp-gateway` en Cloud Run, proyecto `efeonce-group`, región
   `southamerica-west1`, con una service account dedicada. No se despliega dentro de Greenhouse ni de Globe.
5. El front door objetivo es un Global External Application Load Balancer con serverless NEG, certificado
   administrado e ingress de Cloud Run limitado al load balancer. El DNS autoritativo permanece en HostGator.
6. La implementación base usa Node.js 24, TypeScript estricto, Fastify y el SDK oficial MCP v2 estable. El transporte
   remoto es Streamable HTTP, inicialmente stateless y read-only.
7. El gateway actúa como OAuth protected resource. Publica protected-resource metadata, valida issuer,
   audience, expiración y scopes, y responde con challenges estándar. Microsoft Entra ID del tenant Efeonce
   es el authorization server inicial. El resource parameter canónico es `https://mcp.efeonce.org/mcp`; Entra
   v2 representa ese recurso en el claim `aud` mediante el App ID exacto de la aplicación recurso. Si la
   configuración falta o no pasa el canary, `/mcp` falla cerrado. El gateway declara **tres** scopes, no dos: el
   base `efeonce.mcp.read`, el reader Globe `efeonce.mcp.globe.read` y el write interno
   `efeonce.mcp.globe.credits.funding.ensure` del punto 12, que sólo aparece en `scopes_supported` cuando su flag
   `globeCreditFunding.enabled` está en ON.
8. La identidad humana OAuth y la identidad workload hacia providers son planos distintos. El gateway llama a
   Globe con su service account dedicada, ID token con audience exacta y allowlist del runtime de Globe.
9. Globe es el primer provider, pero conserva ownership de sus tools/resources en `efeonce-globe` mediante
   contracts/SDK/adapters delgados gobernados por `TASK-1473`. El gateway sólo descubre, monta, filtra y enruta
   esas capacidades. El corte operativo habilita el reader `globe.producer.fleet.list` y la excepción interna
   one-shot de créditos definida en el punto 12; no habilita generaciones, assets, review, delivery ni reveal-house.
10. Los writes son deny-by-default. Cada write exige command canónico, autorización fina, idempotencia,
    auditoría, cuotas, clasificación de impacto y canary real antes de habilitarse.
11. Codex y Claude usan el router compartido `efeonce-mcp-platform` para componer las skills de arquitectura,
    cloud/secret hygiene, provider, QA y documentación. El router no sustituye esas skills ni sus fuentes de
    verdad; su contrato vive en `EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`.
12. El primer write interno autorizado es `globe.credits.funding.ensure`, como extensión de `TASK-1630` sobre
    `TASK-1626` + `TASK-1473`. El gateway no llama el command financiero de Globe ni amplía la autoridad de
    `globe:service:mcp-provider`: intercambia el token Entra verificado por un token Greenhouse corto, mapeado por
    `(microsoft_tenant_id, microsoft_oid)` a una Persona activa, y llama exclusivamente el endpoint canónico
    Greenhouse `POST /api/platform/app/globe/credit-funding/ensure` con una `authorityId` one-shot ya sellada.
    El intercambio exige workload identity exacta del gateway, scope MCP de write separado, audience exacta,
    workspace binding y entitlement Greenhouse. No acepta workspace, monto, período, cap, actor ni instrucciones
    libres en la tool. Default OFF y rollback por flag/provider; acceso B2B/multitenant continúa bloqueado. El
    canary interno real pasó el 2026-08-01 con resultado terminal y sin segundo delta económico.

## Ownership Contract

| Concern | Owner | Source of truth |
| --- | --- | --- |
| Transporte, discovery, auth resource server, routing, cuotas globales | `efeonce-mcp` | repo y runtime `efeonce-mcp-gateway` |
| Contratos y lógica creativa de Globe | `efeonce-globe` | domain/API/SDK de Globe |
| Identidad y acceso de Globe | Globe + broker autorizado | contracts y runtime de Globe |
| Tasks, ADRs, rollout y handoff del ecosistema | Greenhouse | este repo |
| DNS público | Efeonce Platform | zona `efeonce.org` en HostGator + IaC/runbook del gateway |

## Runtime Contract

### Public surface

- `GET /health`: liveness mínima, sin secretos, identidad ni catálogo privado. Se evita `/healthz` porque el
  canary privado confirmó que Cloud Run intercepta ese path y devuelve `404` antes del contenedor.
- `GET /.well-known/oauth-protected-resource`: metadata RFC 9728 del recurso canónico.
- `POST /mcp`, `GET /mcp`, `DELETE /mcp`: transporte Streamable HTTP según el SDK/spec vigentes.
- Cualquier request MCP sin token válido recibe `401` con `WWW-Authenticate`; configuración OAuth incompleta
  produce una falla cerrada, nunca acceso anónimo.

### Provider contract

Cada provider registrado declara al menos:

- `providerId` y versión de contrato;
- catálogo de tools/resources/prompts habilitados;
- scopes requeridos y estado `enabled | policy-blocked | unavailable`;
- método de health/readiness sanitizado;
- timeout, presupuesto de concurrencia y taxonomía de errores;
- correlation ID propagable;
- adapter que llama sólo API/SDK/commands canónicos.

Los nombres públicos se namespacean, por ejemplo `globe.*`. Registrar un provider no lo habilita: la
configuración, identidad y readiness deben concordar.

### Security boundary

- La service account del gateway no recibe acceso a DB, buckets ni secretos de providers.
- El token del usuario no se reenvía como credencial de workload a Globe.
- Logs estructurados registran request/correlation ID, principal opaco, provider, capability, outcome y
  duración; no registran tokens, prompts sensibles, payloads creativos ni errores upstream crudos.
- Cuotas se aplican por principal, provider y tool. El proceso mantiene límites de body, timeout y
  concurrencia; una dependencia degradada no derriba providers independientes.

## Deployment View

```text
MCP client
    │ HTTPS + OAuth access token
    ▼
mcp.efeonce.org
    │ Global External Application Load Balancer
    ▼
Cloud Run: efeonce-mcp-gateway (efeonce-group / southamerica-west1)
    │ ID token + dedicated service account
    ├──► Globe API/SDK adapter (efeonce-globe)
    └──► future Efeonce providers
```

El servicio escala a cero inicialmente. La configuración operativa inicial fija `concurrency=80` y
`maxScale=5` efectivo para limitar costo y blast radius; esos valores se ajustan con telemetría, no por
suposición.

## Quality Scenarios and Fitness Functions

| Scenario | Initial target | Evidence |
| --- | --- | --- |
| Request no autenticado | 100% rechazado antes de ejecutar una tool | tests negativos + smoke live |
| Scope insuficiente | error MCP sanitizado, cero llamada downstream | contract test con spy |
| Provider caído | gateway sigue respondiendo discovery/otros providers | fault-injection test |
| Escalado | al menos 50 requests read-only concurrentes sin error de sesión local | load smoke no productivo |
| Correlación | 100% de llamadas downstream incluyen correlation ID | contract/log assertion |
| Rollback | revisión previa recuperable y smokeable en menos de 30 minutos | runbook + ensayo de rollback |
| Compatibilidad | conformance del protocolo y un cliente MCP real pasan antes del DNS/cutover | reporte versionado |

## Alternatives Considered

### Vivir en Greenhouse

Rechazada. Reutilizaría auth y Vercel, pero acoplaría releases, blast radius y ownership del gateway al portal
que el operador está desacoplando.

### Vivir en Globe

Rechazada. Globe debe poseer su adapter de dominio, no la plataforma federada de Efeonce ni las futuras
capacidades de Wave, Kortex u otros productos.

### Vercel Functions

Rechazada como runtime primario. Puede servir MCP, pero la combinación de streaming, sesiones futuras,
timeouts, identidad GCP service-to-service y topología ya operada favorece Cloud Run. Vercel puede reevaluarse
para un edge adapter liviano, no como autoridad del gateway.

### Un endpoint MCP por producto sin gateway

Rechazada para la URL pública. Reduce código central, pero multiplica auth, discovery, configuración de clientes,
observabilidad y políticas. Los adapters de producto siguen separados detrás del gateway.

### Dos dominios canónicos

Rechazada. Dos audiencias OAuth y dos URLs de discovery crean drift. `efeonce.org` expresa mejor la plataforma
corporativa neutral; `efeoncepro.com` queda como compatibilidad opcional.

## Consequences

### Delta 2026-08-01 — identidad de clientes externos

El authorization server Entra descrito en esta decisión se mantiene como canary interno. No es el modelo de
onboarding de organizaciones cliente ni evidencia de autorización B2B, porque el cliente canary emite base + reader
(`efeonce.mcp.read` y `efeonce.mcp.globe.read`) aunque solicite sólo el base.
La propuesta de identidad cliente, el vínculo con Account 360 y el gate de proveedor viven en
[`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
y [`TASK-1631`](../tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md). Esta adición no acepta un
proveedor ni altera el reader Globe interno habilitado.

### Benefits

- releases y escalado independientes de Greenhouse y Globe;
- un solo endpoint y modelo de auth para clientes MCP;
- providers con ownership claro y fallas aislables;
- Cloud Run permite streaming, timeout y service identity sin llaves persistentes;
- el gateway puede crecer sin convertir el primer dominio en plataforma central.

### Costs and risks

- aparece un runtime, repo, pipeline e infraestructura adicionales;
- el authorization server y los clientes deben registrarse/probarse de forma explícita;
- la federación introduce versionado y health por provider;
- el load balancer global tiene costo fijo mayor que exponer directamente la URL `run.app`;
- La apertura a clientes externos requiere un modelo B2B/multitenant y entitlements que pueda emitir y revocar
  acceso por tenant y capability; el cliente Entra interno actual no prueba esa separación porque recibe base +
  reader (`efeonce.mcp.read` y `efeonce.mcp.globe.read`) aunque solicite sólo el base.

## Rollout and rollback

1. Crear repo, tests, container y CI local.
2. Desplegar Cloud Run con endpoint MCP fail-closed y URL `run.app` para canary privado.
3. Configurar authorization server/cliente y verificar allow/deny/expiry/scope.
4. Aplicar load balancer/certificado, publicar DNS y esperar que el certificado pase a `ACTIVE`.
5. Habilitar el hostname canónico y mantener la revisión anterior de Cloud Run lista para rollback.
6. Integrar Globe read-only desde `TASK-1473`; probar allow, deny, timeout y redaction antes de habilitar el
   provider. El corte inicial ya habilitó sólo `globe.producer.fleet.list` para uso interno; todo reader adicional
   empieza `policy-blocked` y todo acceso externo conserva el gate B2B/multitenant.

Rollback: quitar tráfico a la revisión defectuosa o deshabilitar el provider/servicio; conservar DNS y devolver
`503` fail-closed es preferible a exponer una ruta sin auth. Cambiar de dominio o runtime exige un nuevo ADR.

## Revisit When

- el p95 sostenido o el costo del load balancer contradigan los objetivos y exista evidencia comparable;
- el protocolo MCP requiera estado durable o un transporte que cambie el modelo stateless;
- más de tres providers necesiten routing/quotas que justifiquen un control plane persistente;
- el authorization server elegido no sea interoperable con al menos dos clientes MCP objetivo;
- una región distinta reduzca latencia material sin degradar la llamada a providers;
- exista necesidad contractual de un segundo dominio canónico o residencia regional.
- se defina el modelo B2B/multitenant que permite asignar, verificar y revocar scopes/capabilities por cliente.

## References

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [Official TypeScript SDK v2](https://github.com/modelcontextprotocol/typescript-sdk)
- [Cloud Run overview](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run)
- [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency)
- [Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity)
- [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Global external Application Load Balancer](https://docs.cloud.google.com/load-balancing/docs/https)
- [Serverless network endpoint groups](https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts)
- [`GREENHOUSE_MCP_ARCHITECTURE_V1.md`](GREENHOUSE_MCP_ARCHITECTURE_V1.md)
- [`EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`](EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md)
