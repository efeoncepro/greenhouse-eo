# Operar el provider Greenhouse-SEO del MCP

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-06 por Claude (TASK-1647)
> **Ultima actualizacion:** 2026-08-06 por Claude
> **Endpoint canonico:** `https://mcp.efeonce.org/mcp`
> **Documentacion funcional:** [Search Visibility 360 por MCP](../../documentation/growth/search-visibility-360-por-mcp.md)
> **Runbook tecnico:** [Efeonce MCP Platform Runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Greenhouse-SEO

## Para que sirve

Este manual es para el operador que necesita **verificar, diagnosticar o apagar** el provider `greenhouse-seo`
del gateway MCP de Efeonce — las tres consultas de Search Visibility 360 (`get_seo_entitlement`,
`get_seo_keyword_opportunities`, `get_seo_visibility_360`) que un cliente MCP puede hacer contra
`mcp.efeonce.org`.

No cubre el uso conversacional (para eso está la doc funcional) ni el gateway completo (para eso está
[Operar Efeonce MCP Gateway](operar-efeonce-mcp-gateway.md)).

## Antes de empezar

Necesitas:

- `gcloud` autenticado en el proyecto `efeonce-group` (`gcloud auth login` **y**
  `gcloud auth application-default login`; los dos, no uno);
- el repo hermano `efeonce-mcp` clonado (`~/Documents/efeonce-mcp`) con `pnpm install` hecho;
- para el smoke autenticado: Google Chrome con el perfil corporativo del tenant interno de Entra, porque exige un
  login interactivo.

Nunca copies el token del consumer a un archivo, ticket o captura. Los scripts de canary lo leen de Secret
Manager y no lo imprimen.

## Verificar que el provider esta vivo

Tres niveles, de más barato a más caro. Corre el que corresponda al síntoma; no hace falta correr los tres siempre.

### Nivel 1 — el borde publico responde

```bash
curl -s -o /dev/null -w 'health=%{http_code}\n' https://mcp.efeonce.org/health
curl -s https://mcp.efeonce.org/.well-known/oauth-protected-resource
curl -s -i -X POST https://mcp.efeonce.org/mcp -H 'content-type: application/json' -d '{}' | head -20
```

Esperado: `health=200`; la metadata declara los 3 scopes; el `POST` anónimo devuelve `401` con
`WWW-Authenticate: Bearer resource_metadata=… scope="efeonce.mcp.read"`.

Si el `POST` anónimo devuelve algo distinto de `401`, **detente** y escala: un `200` anónimo sería una brecha de
autenticación, no un detalle.

### Nivel 2 — la revision correcta esta desplegada y con el provider prendido

```bash
gcloud run services describe efeonce-mcp-gateway \
  --region=southamerica-west1 --project=efeonce-group \
  --format='value(status.latestReadyRevisionName,status.conditions[0].status)'

gcloud run revisions describe efeonce-mcp-gateway-00012-dkj \
  --region=southamerica-west1 --project=efeonce-group \
  --format='yaml(spec.containers[0].env)'
```

Esperado en la revisión activa:

- `GREENHOUSE_SEO_PROVIDER_ENABLED=true`
- `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`
- `GREENHOUSE_ECOSYSTEM_TOKEN` como **referencia a secreto** (`efeonce-mcp-gateway-greenhouse-token:latest`),
  **nunca** un valor plano. Si ves un valor literal ahí, es un incidente de secretos: rota el token y corrígelo
  antes de seguir.

Verifica siempre la **revisión activa**, no lo que dice el workflow. Un valor aplicado a mano fuera del
`deploy.yml` sobrevive hasta el próximo deploy y después desaparece en silencio.

### Nivel 3 — el adaptador y Greenhouse realmente hablan

Este canary ejercita el provider real contra el lane de Greenhouse **sin** pasar por OAuth ni por el borde
público. Sirve para aislar: si este pasa y el smoke autenticado falla, el problema está en el borde, no en el dato.

```bash
cd ~/Documents/efeonce-mcp
pnpm build
GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com \
GREENHOUSE_ECOSYSTEM_TOKEN=$(gcloud secrets versions access latest \
  --secret=efeonce-mcp-gateway-greenhouse-token --project=efeonce-group) \
node scripts/greenhouse-seo-canary.mjs <organizationId-entitled> <organizationId-sin-modulo>
```

Salida esperada:

- `✓ entitlement(...)` con `hasModule`, `tier`, auditorías y presupuesto restantes;
- `✓ visibility-360(...)` con `domainQuadrant` **o** una degradación honesta explícita;
- para la org sin módulo, un fallo con `greenhouse_seo_lane_404` — eso es **éxito** (deny anti-oracle funcionando).

Contra un entorno con Vercel Deployment Protection (staging), agrega
`GREENHOUSE_ECOSYSTEM_VERCEL_BYPASS_SECRET`. Ese bypass va solo a Greenhouse: nunca a Globe, logs ni respuestas MCP.

Corrida de referencia del 2026-08-06 contra producción: Berel `domainQuadrant=riesgo` con 50 keywords y score AEO
44.5 · Efeonce `hasModule=true tier=contracted` con `no_seo_data` · deny `404`.

### Smoke autenticado por el hostname publico

Es el único que prueba la cadena completa (OAuth + edge + provider + lane):

```bash
cd ~/Documents/efeonce-mcp
MCP_CANARY_SEO_ORGANIZATION_ID=<org-entitled> \
MCP_CANARY_SEO_DENY_ORGANIZATION_ID=<org-sin-modulo> \
pnpm oauth:canary
```

Abre Chrome y pide login Entra real (authorization-code + PKCE, callback en `localhost:8765`). **Es asistido por
humano: no se puede automatizar en CI.** Al terminar cierra solo la ventana de prueba, no la sesión del perfil.

Resultado esperado (y obtenido el 2026-08-06 sobre el scope base): `initialize 200`, `seoEntitlementStatus 200`,
`seoVisibility360Status 200`, `seoDomainQuadrant="riesgo"`, `seoDenyFailedClosed=true`.

La pantalla de callback limpia el authorization code de la URL apenas lo recibe. Si ves el `code=` persistiendo en
la barra de direcciones, estás corriendo una versión vieja del script: actualiza el repo antes de seguir.

## Que significan los estados que devuelve

| Respuesta | Significa | Acción |
|---|---|---|
| `domainQuadrant` + keywords | Todo bien. | Ninguna. |
| `no_seo_data` | La org está habilitada pero no tiene serie SEO. | Verificar conexión a Search Console de esa marca. |
| `no_aeo_data` | Falta el eje de IA del cruce. | Correr el AI Visibility Grader para esa marca. |
| `target_not_configured` | La org tiene el módulo pero nadie configuró qué dominio medir. | Paso de setup pendiente. |
| `disabled` | El módulo SEO está apagado a nivel plataforma. | Revisar `GROWTH_SEO_ENABLED` (ver más abajo). |
| `greenhouse_seo_lane_404` | La org no tiene el módulo `seo_v1`. | Asignar el módulo si corresponde comercialmente. |
| `greenhouse_seo_policy_blocked` (503) | El provider está apagado o mal configurado en el gateway. | Nivel 2 de verificación. |

Ninguno de estos estados se reporta como cero. Si alguien te muestra un tablero con "0 keywords" donde la
respuesta real era `no_seo_data`, eso es un bug del consumidor, no del provider.

## Que hacer si el front door devuelve 401 o 403

**401 en una llamada que debería estar autenticada.** El problema es el token, no el provider:

1. ¿Expiró? Los tokens Entra son de vida corta — vuelve a correr el canary para obtener uno nuevo.
2. ¿La audiencia es la correcta? El resource canónico es `https://mcp.efeonce.org/mcp`. Un token emitido para otra
   audiencia se rechaza con `invalid_token`, y eso es correcto.
3. ¿El issuer coincide con el configurado en el gateway? Revisa `OAUTH_ISSUER` en la revisión activa.
4. ¿Estás llamando a la URL `run.app` en vez del hostname canónico? El acceso público pasa por el front door.

**401 anónimo con `WWW-Authenticate`** no es una falla: es el comportamiento correcto del resource server.

**403 `insufficient_scope`.** Falta el scope base `efeonce.mcp.read`. Las tres consultas SEO viven en ese scope
base — no existe un scope SEO propio. Si un cliente tiene el scope base y aun así recibe `403`, revisa el
consentimiento de la aplicación en Entra antes de tocar el gateway.

**403 `scope_not_allowed` desde el lane.** El binding usado no es de scope `internal` ni está ligado a una
organización. Es un problema de configuración del consumer en Greenhouse (`EO-SPK-0004` / `EO-SPB-0004`), no del
gateway.

**404 donde esperabas datos.** Casi siempre es el deny anti-oracle: esa organización no tiene `seo_v1` asignado.
Confírmalo con `get_seo_entitlement`, que sí responde honestamente `hasModule=false`. No lo trates como un bug del
transporte.

## Como se apaga (rollback)

Tres niveles, de menor a mayor alcance. Elige el mínimo que resuelva el problema.

**1. Apagar solo el provider SEO del gateway.** El resto del gateway (Globe, OAuth, front door) sigue operando.

- Pon `GREENHOUSE_SEO_PROVIDER_ENABLED=false` en las variables del repo `efeonce-mcp` y redespliega por el
  workflow. Las tres tools pasan a `503 greenhouse_seo_policy_blocked`.
- Alternativa inmediata: mover 100% del tráfico a la revisión previa verificada del gateway.
  **[verificar]** la revisión previa exacta no quedó registrada en esta sesión; obtenla con
  `gcloud run revisions list --service=efeonce-mcp-gateway --region=southamerica-west1 --project=efeonce-group`.

**2. Apagar el módulo SEO completo en Greenhouse.** `GROWTH_SEO_ENABLED=false`. Ojo: es **multi-runtime**.
Apagarlo en Vercel deja muerto el lane ecosystem pero **no** detiene el materializador diario de Search Console,
que corre en el `ops-worker` y lee su propia copia de la variable. Si quieres detener ambos, tienes que aplicarlo
en los dos runtimes — y en Cloud Run el archivo `deploy.sh` es la fuente de verdad, porque un cambio hecho solo
con `--update-env-vars` se borra en el próximo deploy.

**3. Apagar una organización puntual.** Revoca su assignment `seo_v1` con `effective_to` / `status`. **Nunca**
con `DELETE`: la historia de snapshots quedaría huérfana. Ver
[Asignar el módulo SEO a una organización](../growth/asignar-modulo-seo-organizacion.md).

## Que no hacer

- **No** pases `GREENHOUSE_ECOSYSTEM_TOKEN` como valor plano en `vars`, en el workflow o en un env file. Va como
  referencia a secreto de Cloud Run, siempre.
- **No** apliques un secreto solo con `gcloud run services update --update-secrets` y lo des por hecho.
  `--set-secrets` del `deploy.yml` es **destructivo**: reemplaza el conjunto completo. Todo secreto tiene que estar
  declarado en esa misma bandera o el próximo deploy lo borra en silencio.
- **No** otorgues acceso al secreto con un rol a nivel de proyecto. El grant correcto es
  `roles/secretmanager.secretAccessor` **scoped al secreto** para
  `efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com`.
- **No** conviertas el `404` anti-oracle en un `403` "más informativo". Ese 404 es el diseño: quien no tiene
  acceso tampoco aprende si la organización existe.
- **No** demuestres un fallo retirando IAM o forzando timeouts en producción. Usa los tests o un canary aislado.
- **No** entregues este endpoint a clientes externos. Requiere una decisión explícita de multitenancy y
  entitlements por tenant que hoy no existe.

## Problemas comunes

### El deploy del gateway falla al montar el secreto

Síntoma: la revisión no arranca y el error menciona el secreto o permisos. Causa típica: el secreto se creó **sin
ninguna binding IAM** — le pasó exactamente a `efeonce-mcp-gateway-greenhouse-token`. Solución:

```bash
gcloud secrets add-iam-policy-binding efeonce-mcp-gateway-greenhouse-token \
  --project=efeonce-group \
  --member=serviceAccount:efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Un secreto que funcionaba desaparecio despues de un deploy

Causa: se aplicó fuera del `deploy.yml`, o se agregó otro secreto sin declararlo en la misma bandera
`--set-secrets`. Es la misma clase de bug que ya nos mordió con `--set-env-vars`. Corrige el workflow, no la
revisión.

### El arranque del gateway falla con un error de configuracion

Con `GREENHOUSE_SEO_PROVIDER_ENABLED=true` y sin `GREENHOUSE_ECOSYSTEM_API_URL` o `GREENHOUSE_ECOSYSTEM_TOKEN`, la
carga de configuración aborta a propósito. Es fail-fast correcto: completa la configuración o apaga el provider.

### Las tools responden 503 policy_blocked

El provider está apagado o le falta configuración. Nivel 2 de verificación. Si acabas de hacer rollback, es el
comportamiento esperado.

### El canary del provider pasa pero el smoke autenticado falla

El dato está bien; el problema está en el borde (OAuth, DNS, certificado, Cloud Armor). Revisa el runbook del
gateway, no el módulo SEO.

## Referencias tecnicas

- Runbook: [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Greenhouse-SEO
- Arquitectura del módulo: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
- ADR del gateway: [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
- Lane de Greenhouse: [`src/lib/api-platform/resources/ecosystem-growth-seo.ts`](../../../src/lib/api-platform/resources/ecosystem-growth-seo.ts)
- Adaptador del gateway: repo hermano `efeonce-mcp`, `src/providers/greenhouse-seo.ts`
- Gateway completo: [Operar Efeonce MCP Gateway](operar-efeonce-mcp-gateway.md)
- Mismas tools por el MCP interno: [MCP Greenhouse Read-Only](mcp-greenhouse-read-only.md) §8
