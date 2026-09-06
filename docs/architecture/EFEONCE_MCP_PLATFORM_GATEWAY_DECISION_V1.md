# Efeonce MCP Platform Gateway Decision V1

- **Status:** Accepted
- **Date:** 2026-08-01
- **Owner:** Efeonce Platform
- **Scope:** repositorio `efeonce-mcp`, transporte MCP remoto, autenticación, federación de productos, Cloud Run, front door y dominio público
- **Reversibility:** two-way-but-slow
- **Confidence:** high para boundary, hosting, hostname, authorization server y el primer reader Globe después del canary PKCE real
- **Validated as of:** 2026-09-02 (delta deprecación DCR en la revisión MCP `2026-07-28`; shim verificado en vivo; base 2026-08-01)
- **Implementation owner:** [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md)
- **First provider owner:** [`TASK-1473`](../tasks/in-progress/TASK-1473-globe-contract-packaging-parity-certification.md)

## Contrato vigente de emisores y autoridad nativa

TASK-1831 ya verifica Entra y Efeonce ID; TASK-1836 acreditó el piloto corporativo nativo. Esto reemplaza
las afirmaciones históricas de los deltas sobre un único issuer o ausencia de emisión propia, sin retirar
el carril Entra legado. El gateway sigue sin emitir tokens ni consultar introspección: verifica JWT/JWKS y
resuelve autoridad mediante el reader confiable. Su policy por tool decide poblaciones, scopes, capabilities
y organización; compartir issuer no abre tools internas.

El contexto interno firmado fija sujeto/perfil, cliente, audiencia, organización, binding y procedencia;
`gv` es el del binding seleccionado. El reader revalida ese contexto y el `jti` vigente del ledger antes de
dispatch, con revocación local ≤60 s. No existe fallback desde el resolver externo `internal_population`.
Los gates nativo e interno se verifican por separado; refresh/dispatch previos no eluden un gate apagado.
Contrato especializado: [autoridad interna nativa](EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md).

El [mapa consolidado](../audits/2026-09-06-task-1836-1831-consolidated-evidence.md) registra canary interno,
rollbacks, revisiones y las matrices externas/multicontexto aún pendientes. No se declara cierre general de
federación ni de clientes externos a partir del piloto. Los deltas siguientes conservan contexto histórico.

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
   configuración falta o no pasa el canary, `/mcp` falla cerrado. El gateway declara **cinco** scopes cuando los
   providers correspondientes están activos: el
   base `efeonce.mcp.read`, el reader Globe `efeonce.mcp.globe.read`, el write interno
   `efeonce.mcp.globe.credits.funding.ensure` del punto 12, que sólo aparece en `scopes_supported` cuando su flag
   `globeCreditFunding.enabled` está en ON, y el write SEO `efeonce.mcp.seo.write` (TASK-1308), que sólo aparece
   cuando `greenhouseSeo.enabled` está en ON, y el reader Hiring `efeonce.mcp.hiring.read`, que sólo aparece cuando
   `greenhouseHiring.enabled` está en ON. Hiring conserva capability/purpose/audit downstream en Greenhouse.

   🔴 **Granularidad canónica: un scope por CLASE DE BLAST-RADIUS, nunca uno por capability.** Un scope por
   capability convierte esta lista en un **espejo del `capabilities_registry` de Greenhouse** — un registry
   gobernado en una tabla contra una copia editada a mano en una app registration de Entra. Divergen, y un
   espejo de autorización divergido es peor que no tenerlo: el scope dice sí, el registry dice no, y nadie sabe
   cuál manda. Contradice además la regla 1: el gateway NUNCA es autoridad de autorización. El scope responde
   *«¿este cliente puede hacer esta CLASE de acción?»* (consentimiento, transporte); la capability responde
   *«¿este actor, sobre esta org?»* (dominio) y se enforcea downstream en el lane y el command canónicos.
   `globe.credits.funding.ensure` no es la excepción sino la regla aplicada: tiene scope propio porque **mueve
   dinero** con un `authorityId` de un solo uso, que es su propia clase — no porque sea una capability.
   Corolario operativo: federar la escritura N+1 de un dominio que ya tiene su scope **no requiere tocar Entra**,
   y por lo tanto no puede quedar bloqueada por eso.
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
y [`TASK-1631`](../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md). Esta adición no acepta un
proveedor ni altera el reader Globe interno habilitado. El binding por organización y los grants revocables por
tenant/capability/persona ya existen (`greenhouse_core.external_capability_grants`, TASK-1631 Slice 1, 2026-09-04);
el emisor propio y el gateway multi-issuer viven en EPIC-044 (TASK-1828/1829/1831/1832) (actualizado 2026-09-04, TASK-1631).

### Delta 2026-08-06 — shim de compatibilidad DCR para clientes MCP estándar

Los clientes MCP estándar (Claude Code, custom connectors de claude.ai, Claude Desktop) exigen dynamic client
registration RFC 7591 durante el flujo de autorización, y Microsoft Entra no lo soporta. Para no bloquear a esos
clientes, el gateway incorpora un shim de compatibilidad (formalización pendiente como `TASK-1654`):

1. El protected-resource metadata anuncia al **propio gateway** como authorization server.
2. El gateway publica `/.well-known/oauth-authorization-server` espejando los endpoints reales de Entra
   (authorize/token/jwks, cacheados de su configuración OIDC) y agrega un `registration_endpoint` propio.
3. `POST /register` **nunca crea aplicaciones**: devuelve siempre el cliente público pre-registrado
   `32617b87-e7ef-493a-838f-1ff3f0213b93` (PKCE, `token_endpoint_auth_method: none`). El shim está gateado por
   la variable `OAUTH_PUBLIC_CLIENT_ID`, declarada en `deploy.yml` con default.
4. Los scopes se anuncian cualificados como `https://mcp.efeonce.org/mcp/<scope>`, porque Entra v2 resuelve un
   scope pelado contra Microsoft Graph (error `AADSTS650053`). El claim `scp` del token vuelve pelado, así que
   el verifier y los checks por-tool no cambiaron.

El shim **no compromete la neutralidad del gateway**: no lo convierte en authorization authority. Sólo
re-anuncia metadata de descubrimiento y un client fijo; los tokens los emite y valida Entra exactamente igual
que antes. El gateway no emite credenciales, no crea clientes y no altera audiencia ni scopes efectivos.

Alternativa rechazada: pedir a cada usuario registrar su propia aplicación Entra. Impone fricción y carga
administrativa por usuario y no interopera con la UX de los clientes MCP estándar, que asumen registro dinámico
automático durante la conexión.

Verificado con el cliente real: Claude Code autenticó y conectó contra `mcp.efeonce.org`. Las redirect URIs de
la app Entra se ampliaron a `http://localhost` (loopback de Claude Code) y
`https://claude.ai/api/mcp/auth_callback`, además de la previa `http://localhost:8765/callback`. Esta adición
amplía la conectividad de usuarios internos del tenant; no habilita clientes externos ni altera el gate
B2B/multitenant del delta anterior.

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
  reader (`efeonce.mcp.read` y `efeonce.mcp.globe.read`) aunque solicite sólo el base. El grant revocable por
  organización y por persona ya existe (`greenhouse_core.external_capability_grants`, TASK-1631, 2026-09-04); el
  acceso externo real espera al emisor propio y al gateway multi-issuer (EPIC-044: TASK-1829/1830/1831/1832)
  (actualizado 2026-09-04, TASK-1631).

### Delta 2026-09-02 — DCR quedó **deprecado** en la revisión `2026-07-28`; el shim se mantiene, con horizonte y disparadores declarados

Evaluación, no migración. Verificado contra la spec en vivo el 2026-09-02.

**Qué cambió realmente.** La revisión Current del protocolo es `2026-07-28`, y su
[registro de deprecados](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) lista *Dynamic
Client Registration* como `Deprecated`, vía [PR #2858](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2858),
con migration path *Client ID Metadata Documents* (CIMD) y **earliest removal = primera revisión publicada en o
después de 2027-07-28**. La política de ciclo de vida ([SEP-2596](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2596),
ventana mínima de doce meses) dice que un feature deprecado *"remains part of the specification"*, que
implementaciones nuevas **SHOULD NOT** adoptarlo y que las existentes **SHOULD** migrar antes del retiro más
temprano; el retiro efectivo es decisión de los Core Maintainers y **puede ocurrir después**.

**La preferencia no es nueva; la etiqueta sí.** Ya en `2025-11-25` el orden normativo de registro era
pre-registro → CIMD (`SHOULD`) → DCR (`MAY`) → entrada manual, con el mismo `client_id_metadata_document_supported`
como señal. Lo que agrega `2026-07-28` es la **clasificación formal** como deprecado, el registro derivado, la
política de ciclo de vida y el requisito de `application_type` en DCR ([SEP-837](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/837)).
Es decir: el shim nació el 2026-08-06 en un mundo donde CIMD ya era el mecanismo preferido. La deprecación no
invalida una decisión que se tomó ignorándola.

**Por qué el shim sigue siendo el camino correcto, y no por inercia.** La spec preserva DCR con una excepción
redactada exactamente para nuestro caso: *"retained for backwards compatibility with authorization servers that do
not support Client ID Metadata Documents"*. Microsoft Entra **no soporta CIMD ni DCR**; para Entra la única vía
oficial es el pre-registro. El shim es, en el fondo, **pre-registro disfrazado de DCR**: `POST /register` no
registra nada, devuelve siempre el cliente PKCE pre-registrado. Entrega el mecanismo de prioridad 1 de la spec por
el único canal que los clientes MCP estándar saben consumir sin configuración manual.

**Hallazgo estructural — CIMD no es implementable en la capa del shim, en ninguna versión.** CIMD es una capacidad
del **authorization server**: es el AS quien detecta un `client_id` con forma de URL, lo resuelve, valida el
documento y los `redirect_uris`. En esta arquitectura el AS es Entra: el gateway espeja `authorization_endpoint` y
`token_endpoint`, no los proxea. Un `client_id` URL viajaría directo a Entra, que lo rechaza. Soportar CIMD exige
**emitir los tokens**, es decir, ser un authorization server de verdad — precisamente lo que el gateway tiene
prohibido ser (§Decision) y lo que el emisor propio de Efeonce asume (composición decidida en
[`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)).
**Conclusión: "adoptar CIMD" no es trabajo del gateway; es un requisito del emisor, y ya está asignado a
`TASK-1828`/`TASK-1829`** (CIMD como mecanismo primario, DCR como compatibilidad). `TASK-1631` ya no elige ni
lleva el broker: entregó el binding y los grants por tenant/capability/persona el 2026-09-04 (actualizado 2026-09-04, TASK-1631). Esta
evaluación es insumo de esas tasks, no una línea de trabajo paralela.

**El riesgo real no es el calendario, es el cliente.** El 2027-07-28 sólo marca cuándo DCR se vuelve *elegible*
para retiro de la **spec**. Lo que apaga el shim no es la spec: es que Claude Code / claude.ai / Claude Desktop
dejen de implementar el fallback DCR. Eso es un cambio de cliente, sin fecha anunciada y sin obligación de
avisarnos. Mientras el cliente consulte `client_id_metadata_document_supported` (ausente en nuestra metadata, que
es lo correcto y honesto) y caiga a `registration_endpoint`, el shim funciona. El día que un cliente exija CIMD y
no traiga fallback, la conexión se cae sin que nosotros hayamos tocado nada.

**🔴 Riesgo más cercano que la deprecación, encontrado en la misma revisión: el `issuer` del shim no cuadra.** La
página nueva
[Authorization Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)
—que **no existía en `2025-11-25`**— agrega texto normativo: *"the `issuer` value in the document **MUST** be
identical to the issuer identifier used to construct the well-known URL. If they differ, the client **MUST NOT**
use the metadata"*, con un ejemplo que es literalmente nuestra forma. Verificado en vivo el 2026-09-02: el
protected-resource anuncia `authorization_servers: ["https://mcp.efeonce.org"]`, el cliente construye
`https://mcp.efeonce.org/.well-known/oauth-authorization-server`, y ese documento devuelve
`issuer: "https://login.microsoftonline.com/a80bf6c1-.../v2.0"`. **Difieren.** Un cliente que aplique esa
validación rechaza nuestra metadata y no llega ni a `/register`. No es una regresión: es la misma forma que el
shim tiene desde el 2026-08-06, ahora con texto normativo explícito en contra. Sigue funcionando porque los
clientes reales todavía no la aplican — lo cual es una observación empírica, no una garantía.

Ese desajuste **no se parcha**: es el costo intrínseco de anunciarse como authorization server sin emitir tokens.
Reclamar `issuer: https://mcp.efeonce.org` para cuadrar RFC 8414 §3.3 rompería la validación `iss` de RFC 9207
—también reforzada en `2026-07-28` ([SEP-2468](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2468))—
porque Entra emite su propio `iss`. Hoy pasa esa comprobación **justamente porque espejamos el issuer real de
Entra**. Se cambia una inconsistencia por una peor. La salida honesta es la misma que para CIMD: un AS que emita
sus propios tokens, o sea el emisor propio de `TASK-1828`/`TASK-1829` (actualizado 2026-09-04, TASK-1631).

**Contingencia sin cambio de arquitectura.** Si un cliente endurece cualquiera de las dos validaciones antes de
que exista el broker, la salida es **pre-registro**, que es prioridad 1 de la spec: apuntar el
`authorization_servers` al issuer real de Entra, apagar `OAUTH_PUBLIC_CLIENT_ID` (el shim ya está gateado por esa
env, así que se cae solo) y que cada usuario configure a mano el `client_id`
`32617b87-e7ef-493a-838f-1ff3f0213b93`. Degrada la UX a configuración manual por usuario, no rompe el acceso, y no
toca ni Entra ni el modelo de tokens. Registrado como plan B, sin ejecutar.

**🔴 Hallazgo de seguridad adjunto, surgido de la coordinación con la skill `mcp-craft` (2026-09-02).** La página
de [security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
de la misma revisión dice: *"MCP proxy servers using static client IDs **MUST** obtain user consent for each
dynamically registered client before forwarding to third-party authorization servers"*. **La letra no nos ata —
pero el riesgo que la norma previene sí está presente por construcción.**

- *Por qué la letra no aplica:* el gateway **no reenvía** la autorización. No proxea `/authorize` ni `/token`: los
  espeja en metadata y el navegador va directo a `login.microsoftonline.com`. Nunca vemos la request de
  autorización.
- *Refutado explícitamente:* el modo de falla fino de «setear la cookie de consentimiento antes de la aprobación»
  **no existe acá**. Verificado leyendo `src/app.ts` del gateway: `POST /register` devuelve JSON y nada más — el
  shim **no tiene pantalla de consentimiento ni cookie**, así que no hay nada que setear antes de tiempo.
- *Lo que sí aplica, y es concreto:* el `client_id` es **estático y compartido por todo el tenant**, y las redirect
  URIs del cliente público incluyen `http://localhost` **sin puerto** (verificado con `az ad app show` el
  2026-09-02: `https://claude.ai/api/mcp/auth_callback`, `http://localhost`, `http://localhost:8765/callback`).
  Entra cachea consentimiento por `(usuario, aplicación)`, y como todos los clientes SON la misma aplicación, tras
  el primer consentimiento **no vuelve a haber pantalla**. Consecuencia: un proceso malicioso corriendo en la
  máquina del usuario puede iniciar una autorización con nuestro `client_id`, escuchar en cualquier puerto de
  loopback y recibir el código con su propio PKCE, en silencio.
- *🚩 Y el nombre miente, que es lo que hace peligroso al hallazgo anterior:* el `displayName` de
  `32617b87-e7ef-493a-838f-1ff3f0213b93` en Entra es **"Efeonce MCP Local Canary Client"**, pero ese ES el cliente
  compartido de producción que el shim entrega a **todo** cliente MCP estándar del tenant. El canary real es otro
  (`66985833-14e9-438e-add4-b740e84e9a64`, "Efeonce MCP Base-Only Canary Client", 2 scopes), y el shim no lo
  devuelve. Verificado con `az ad app show` el 2026-09-02. No es una vulnerabilidad: es una etiqueta que miente
  sobre lo que la cosa es. ✅ **Cerrado el mismo día (TASK-1804, 2026-09-02 ~21:40Z):** renombrado con
  `az ad app update --display-name` a **"Efeonce MCP Public Client (Claude Code, claude.ai, Claude Desktop)"**;
  readback confirma `appId`, los 3 redirect URIs y los 3 scopes de lectura intactos (sin scope de escritura). El
  hallazgo anterior (loopback sin puerto) sigue en revisión: no se cierra angostando `http://localhost`. Y el modo de falla es compuesto — quien abre Entra, lee "Local Canary" y asume radio de
  daño de juguete es **exactamente** quien no va a auditar sus redirect URIs. Renombrarlo es barato y no toca
  `appId` ni consentimientos; hacerlo va junto con la revisión pendiente, no después.
- *Radio de explosión, honestamente acotado:* exige atacante con ejecución local, el tenant es único
  (`signInAudience: AzureADMyOrg`) y —lo importante— el cliente público **no carga ningún scope de escritura**, por
  la regla dura de §"El scope de escritura NO se cablea al cliente público compartido". El token robado es de
  lectura. Esa regla, escrita para otra razón, es la que acota este riesgo.
- *Dónde se cierra:* no en el shim. El consentimiento por cliente exige clientes distintos, y clientes distintos
  con grant revocable per-tenant es, otra vez, el emisor propio (`TASK-1828`/`TASK-1829`) sobre el grant que ya
  existe (`external_capability_grants`, `TASK-1631`, 2026-09-04) (actualizado 2026-09-04, TASK-1631). Se registra como **revisión pendiente**,
  no como incidente: no hay explotación observada y la mitigación estructural ya tiene dueño.

**Decisión.** No se migra ahora y no se abre task de migración del shim. Se mantiene el shim tal cual, se declara
su horizonte y sus disparadores, y el destino queda asignado al emisor propio (`TASK-1828`/`TASK-1829`, CIMD
nativo) y al gateway multi-issuer (`TASK-1831`) (actualizado 2026-09-04, TASK-1631), no a una evolución del gateway actual. Micro-endurecimiento opcional para quien formalice `TASK-1654`: publicar
`client_id_metadata_document_supported: false` explícito en la metadata espejada — hoy va ausente, que la spec
trata igual, pero explícito documenta la postura.

**Disparadores de revisión (cualquiera obliga a reabrir):**

- un cliente MCP objetivo deja de traer fallback DCR, o empieza a aplicar la igualdad de `issuer` de RFC 8414 §3.3;
- Entra anuncia soporte de CIMD (o de RFC 7591) — desaparecería la razón entera del shim;
- el emisor propio (`TASK-1828`/`TASK-1829`) entra en runtime y el gateway pasa a multi-issuer (`TASK-1831`); el
  binding de `TASK-1631` ya está aplicado (2026-09-04) (actualizado 2026-09-04, TASK-1631);
- una revisión MCP publicada en o después de 2027-07-28 remueve DCR de la spec.

### Delta 2026-09-02 — provider `greenhouse-skills`: el gateway federa manuales, no sólo datos (TASK-1804)

`src/providers/greenhouse-skills.ts` registra una sola tool, `get_greenhouse_skill` (annotations
`readOnlyHint: true`; descripción derivada del artefacto de Greenhouse vía `greenhouseToolDescription`, no
escrita a mano), y **delega** cada llamada a la lane `GET /api/platform/ecosystem/mcp/skills[/{name}]`. El
provider no embebe ningún manual ni bundle estático: el contenido vive y se versiona en Greenhouse, y un cambio
allá se sirve acá sin redeploy. Comparte la configuración e identidad del provider SEO
(`GREENHOUSE_SEO_PROVIDER_ENABLED`, mismo consumer token de binding `internal`): apagado el SEO, apagado éste.
Scope requerido: `efeonce.mcp.read`; **cero cambios en Entra**. Con él la revisión `efeonce-mcp-gateway-00028-pmx`
federa 36 tools (28 SEO + `get_greenhouse_skill` + nativas).

Consecuencia sobre los guards: el guard de paridad SEO (`greenhouse-seo-tool-parity.ts`) está anclado a su
dominio y **no veía** una tool de plataforma federada. Se agregó `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` +
`computeFederatedNonSeoToolFindings` para que toda tool no-SEO que el gateway federe tenga entrada con razón en el
mismo PR; una tool de plataforma nueva sin entrada hace fallar el guard. El renombre del cliente público del mismo
día queda descrito en el delta anterior; no cambia nada de este provider.

### Delta 2026-09-04 — el front door del gateway sirve un segundo host (`auth.efeonce.org`)

El authorization server propio de Efeonce (EPIC-044, ADR
[`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md),
TASK-1828) se publicó **como segundo host del front door existente**, no como un LB nuevo. En
`efeonce-mcp/infra/terraform` (commit `6a144a5`, variable `enable_auth_host`, default `true`) el mismo Global
External Application Load Balancer suma: un serverless NEG `efeonce-auth-server-neg` apuntando al Cloud Run
`auth-server` (`us-east4`, repo Greenhouse; la región del gateway no cambia), un backend propio
`efeonce-auth-server-backend` con la **misma** security policy Cloud Armor `efeonce-mcp-gateway-edge`, un
certificado managed **adicional** `efeonce-auth-server-cert` (`ACTIVE`) sobre el proxy HTTPS existente y una
host rule `auth.efeonce.org → path matcher auth-server`. Misma IP global `34.111.78.237`, sin forwarding rules
nuevos; el `apply` fue 3 add / 2 change / 0 destroy y `mcp.efeonce.org` respondió 200 antes y después.

Lo que **no** cambia, y es la frontera del ADR:

- El gateway (`efeonce-mcp-gateway`) y su ruta default (`mcp.efeonce.org`) quedan intactos. El diagrama de
  *Deployment View* sigue describiendo el gateway; el segundo host es un backend distinto detrás del mismo LB.
- El gateway **sigue sin emitir tokens**. `auth-server` hoy expone sólo `/healthz`, `/readyz` y el JWKS
  (`/.well-known/jwks.json`); los flujos OAuth son TASK-1829 y la autenticación de personas TASK-1830. Por eso el
  disparador "emisor propio en runtime" del delta 2026-09-02 (deprecación de DCR) **aún no se cumple**: existe el
  runtime, no el emisor.
- En ese corte inicial el gateway verificaba sólo Entra. TASK-1831 ya añadió el segundo issuer;
  el contrato vigente y su evidencia están al inicio de este documento.
- El certificado del gateway no se toca: agregar `auth.efeonce.org` a sus `managed.domains` re-provisionaría
  `mcp.efeonce.org`. El rollback del host es `tofu apply -var enable_auth_host=false` (quita host rule, backend,
  NEG y cert; el gateway no cambia). Costo adicional ≈ USD 15/mes, todo en GCP.

Operación: [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md)
§`Segundo host del front door` + runbook del emisor
[`docs/operations/runbooks/auth-server.md`](../operations/runbooks/auth-server.md).

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
- se defina el modelo B2B/multitenant que permite asignar, verificar y revocar scopes/capabilities por cliente;
- se cumpla cualquier disparador del delta 2026-09-02 sobre la deprecación de DCR (cliente sin fallback DCR o que
  aplique la igualdad de `issuer` de RFC 8414 §3.3, soporte CIMD en Entra, emisor propio `TASK-1828`/`TASK-1829`
  en runtime (actualizado 2026-09-04, TASK-1631), o una revisión MCP publicada en o después de 2027-07-28 que remueva DCR).

### Delta 2026-09-05 — el cartel del servidor: `title`, `websiteUrl` e íconos propios

El gateway se presentaba como `{ name: 'efeonce-mcp', version: '0.1.0' }` y nada más, así que todo
cliente MCP lo dibujaba con el ícono genérico. Ahora declara su `Implementation` completo y sirve el
isotipo Efeonce desde su propio origen. Fuente única: `efeonce-mcp:src/branding.ts`.

**Tres decisiones, cada una con su razón:**

1. **URL HTTPS del mismo origen, NUNCA un `data:` URI.** Verificado en el SDK instalado
   (`@modelcontextprotocol/server` 2.0.0): en el carril moderno `stampServerInfoMeta` estampa el
   `serverInfo` COMPLETO en el `_meta` de **cada** resultado, así que un base64 se repetiría en todo
   el tráfico. Los `src` se **derivan** de `MCP_PUBLIC_URL` (el spec pide mismo origen); escribirlos
   a mano reintroduce el cartel que miente.
2. **Un ícono sólo se declara si sus bytes cargaron.** Asset ilegible ⇒ el gateway queda **sin** ese
   ícono + un `WARNING`, jamás una promesa que responde 404 y jamás una caída del gateway por un
   asset cosmético. Falsificado quitando el PNG: el gateway arrancó, sirvió todo lo demás y su
   `icons[]` quedó vacío en vez de apuntar a una ruta muerta.
3. **Las rutas del ícono son públicas por contrato del spec** (§`icons`: el cliente lo trae *sin*
   credenciales). No es una excepción abierta en una compuerta: el gateway no tiene hook de auth
   global — `/health` y los `/.well-known/*` ya son rutas públicas y la auth vive dentro del handler
   MCP. Son bytes estáticos leídos al arranque, sin input del caller y sin redirect.

**El asset tiene que llegar a la imagen.** El `Dockerfile` copiaba sólo `dist/`; sin
`COPY assets ./assets` el ícono desaparece en producción con todos los tests en verde. Ningún test de
runtime ve el contenido del contenedor, así que `test/branding.test.ts` afirma esa línea del
Dockerfile además de amarrar declaración ↔ ruta ↔ bytes (magic bytes PNG, no la etiqueta `mimeType`).

⚠️ **Ningún cliente Claude lo renderiza hoy, y se hizo sabiéndolo.** claude.ai ignora `icons` de
custom connectors ([anthropics/claude-ai-mcp#152](https://github.com/anthropics/claude-ai-mcp/issues/152),
abierto desde 2026-04-06, con `data:`, URL, `/favicon.ico` y `<link rel=icon>` ya descartados
empíricamente por el reporte); Claude Code cerró el pedido equivalente como *not planned*
([#49040](https://github.com/anthropics/claude-code/issues/49040)). Claude Desktop sí pinta íconos,
pero sólo de extensiones locales `.mcpb`, no de conectores remotos. **NUNCA** vuelvas a intentar
favicon o `data:` URI creyendo que es el camino que falta: no hay palanca del lado servidor.

Nota de carril: hoy el gateway sirve el handshake legacy, donde el `serverInfo` viaja en el
resultado de `initialize` — ahí es donde se verificó que el cartel llega al cliente.

`version: '0.1.0'` sigue igual a propósito: cambiar la versión que el servidor declara es una
decisión de operador, no un efecto colateral de ponerle ícono.

**Qué asset, y por qué UNO SOLO (dirección elegida por el operador, 2026-09-05).** El primer corte
declaraba dos PNG transparentes con `theme` light/dark; el estudio de contenedor mostró que el
transparente sólo funciona sobre fondo claro, que es justo lo que no controlamos. El asset vigente es
**el isotipo blanco sobre placa navy `#023C70` opaca de borde a borde** — 512×512, marca al 76% del
ancho (safe area 12% por lado), **sin radio horneado**: el cliente que enmascara recortaría su arco
contra el nuestro, y a sangre las dos superficies se ven correctas.

**NUNCA declares `theme` en este ícono.** Tres razones, en orden de peso: la placa opaca se lee sobre
cualquier superficie, así que la variante por tema no tiene función; el spec define `theme` de forma
ambigua —«theme preference (light or dark) for the icon background», sin decir si es el fondo DEL
ícono o el DEL cliente—; y como hoy ningún cliente renderiza `icons`, una lectura invertida **no se
puede falsificar contra nada**. Un ícono que no depende del tema no puede leerse al revés. Por eso
`icon-512-dark.png` y el campo `theme` completo se retiraron del contrato.

**Rollout:** en producción desde 2026-09-05, revisión `efeonce-mcp-gateway-00036-5wc` (commit `815df9b`).
Verificado contra el front door real, no contra el código: `/icon-512.png` 200 `image/png` con bytes idénticos
al asset del repo y **sin** challenge de auth, `/.well-known/oauth-protected-resource` 200, `POST /mcp` sin
token 401 (fail-closed intacto), la ruta del asset retirado 404, y `auth.efeonce.org/readyz` 200. El deploy no
arrastró trabajo ajeno: la revisión previa `00035-bhd` estaba construida desde `d7469d7`, padre exacto de
estos commits — comprobado por el tag de la imagen desplegada antes de disparar.

El estudio de contenedor que sostiene la decisión (recomendación especificada, las tres alternativas
descartadas con su motivo, y los cuatro tratamientos a 48/32/24 px sobre lista clara, lista oscura y
fondo con color) vive como lienzo de diseño; el isotipo no se alteró en ninguno: la geometría se
extrae de `isotipo-efeonce-negativo.svg` y se inyecta sin editar.

### Delta 2026-09-06 — `efeonce.mcp.identity.write`: el primer scope que Entra NO emite

`TASK-1837` federó la lane de identidad delegada: `identity.invitation.create` (write) e
`identity.invitations.list` (read). El provider monta sobre la config del provider SEO — misma lane
ecosystem, misma identidad de servicio — igual que `greenhouse-skills`; Greenhouse gatea la lane con
`EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` (404 anti-oráculo ⇒ `policy_blocked` en el gateway).

El scope `efeonce.mcp.identity.write` se anuncia en `scopes_supported` y **no existe en la app de
recurso de Entra**. Verificado el 2026-09-06 con `az ad app show`: esa app define cinco scopes y ése
no está entre ellos.

**Eso es correcto, no drift.** Lo acuña el **emisor nativo** (`auth.efeonce.org`), que lo declara en
su catálogo (`src/lib/auth-server/oauth/scopes.ts`) junto a los otros writes. La clase que representa
es «administrar a las personas de MI organización», y su sujeto es una persona externa del cliente
que se autentica contra Efeonce ID — no contra el tenant de Entra. Es el primer caso donde **el
emisor decide qué clase de actor puede ejercer una capacidad**: Entra es el carril interno, el nativo
el del cliente externo. El string del scope es el mismo en ambos lados a propósito (el gateway
verifica un solo nombre), pero sólo uno de los dos emisores puede emitirlo.

🔴 **NUNCA lo "arregles" agregándolo a Entra.** Quien compare `scopes_supported` contra la app de
recurso va a ver un hueco y va a querer cerrarlo. Cerrarlo por ahí significa crear un scope que
ningún token interno debería portar o —peor— cablearlo al cliente público compartido, que es lo que
prohíbe la sección de arriba. Verificado el mismo día: ese cliente sigue con exactamente **tres
scopes de lectura** (`efeonce.mcp.read`, `globe.read`, `hiring.read`) y ningún write.

La versión del gateway, su composición `semver+<sha>` y el gate que exige moverla cuando la
superficie cambia NO se repiten acá: viven en
[`MCP_TOOL_SURFACE_INVARIANTS.md`](agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md) §9 y, del lado
operativo, en el runbook (`GATEWAY_BUILD_SHA` de la revisión activa debe coincidir con el HEAD de
`origin/main`, o hay commits mergeados sin desplegar).

## References

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP client registration (CIMD / pre-registro / DCR)](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)
- [MCP authorization server discovery](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)
- [MCP deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
- [MCP feature lifecycle and deprecation policy](https://modelcontextprotocol.io/community/feature-lifecycle)
- [OAuth Client ID Metadata Document (`draft-ietf-oauth-client-id-metadata-document-00`)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00)
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

### 🔴 El scope de escritura NO se cablea al cliente público compartido (TASK-1308, 2026-08-07)

`efeonce.mcp.seo.write` **existe** en la app de Entra `Efeonce MCP Resource` (`type: Admin`,
`isEnabled: true`), pero **deliberadamente NO está en el `requiredResourceAccess` del cliente
PKCE compartido** `32617b87-e7ef-493a-838f-1ff3f0213b93` (hoy "Efeonce MCP Public Client (Claude Code,
claude.ai, Claude Desktop)"; hasta el 2026-09-02 se llamaba "Efeonce MCP Local Canary Client"),
que es el que el shim DCR entrega a Claude Code / claude.ai / Claude Desktop. Misma postura
que `efeonce.mcp.globe.credits.funding.ensure`, que tampoco está.

**Por qué, y por qué es load-bearing:** en el lane ecosystem el actor es `mcp:<consumer>` — la
MÁQUINA, no la persona — así que ahí **no hay chequeo de capability por humano** (el app-lane
sí exige `growth.seo.target.configure`; el ecosystem no, a propósito, porque su sujeto es un
consumidor). Y el hop gateway→Greenhouse va con un token de consumer fijo de binding
`internal`. Resultado: **en toda la cadena, la única puerta que depende de QUIÉN es la persona
es el scope OAuth.** Cablearlo al cliente público (sin secreto, disponible a todo usuario del
tenant) le daría poder de comprometer gasto DataForSEO recurrente a cualquiera que se
autentique, incluido quien no tiene la capability en Greenhouse.

**NUNCA** cierres un `insufficient_scope` de una tool de escritura agregando el scope al
cliente público compartido: eso no arregla un permiso, abre una puerta de gasto a todo el
tenant y lo hace en silencio (nada falla, simplemente empieza a funcionar para todos).

**El camino correcto** es un cliente con grant controlable —emitible y revocable por tenant y
capability— según `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`. El grant revocable por
organización y por persona ya existe (`greenhouse_core.external_capability_grants`, `TASK-1631`, 2026-09-04);
lo que falta es un token que lo porte: emisor propio y gateway multi-issuer (EPIC-044: `TASK-1829`/`TASK-1831`/
`TASK-1832`) (actualizado 2026-09-04, TASK-1631). Hasta entonces las tools quedan federadas y **fail-closed**: registradas,
verificables y sin token que las abra.
