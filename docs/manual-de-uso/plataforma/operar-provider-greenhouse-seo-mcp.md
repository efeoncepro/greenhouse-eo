# Operar el provider Greenhouse-SEO del MCP

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.4
> **Creado:** 2026-08-06 por Claude (TASK-1647)
> **Ultima actualizacion:** 2026-08-28 por Claude (TASK-1662+1699: allowlist a 27 tools — 20 lectura + 7 escritura; producción sirve 21 hasta el deploy post-release)
> **Endpoint canonico:** `https://mcp.efeonce.org/mcp`
> **Documentacion funcional:** [Search Visibility 360 por MCP](../../documentation/growth/search-visibility-360-por-mcp.md)
> **Runbook tecnico:** [Efeonce MCP Platform Runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Greenhouse-SEO

## Para que sirve

Este manual es para el operador que necesita **verificar, diagnosticar o apagar** el provider `greenhouse-seo`
del gateway MCP de Efeonce — lo que un cliente MCP puede hacer contra `mcp.efeonce.org`.

El allowlist federado tiene **27 tools — 20 de lectura y 7 de escritura** (fuente de verdad: el espejo `GREENHOUSE_SEO_TOOL_INVENTORY`
del guard de paridad `src/providers/greenhouse-seo-tool-parity.ts` del repo `efeonce-mcp` — desde
TASK-1658 el guard es **bidireccional**: nombre + claves exactas del inputSchema interno + clase
`writes` + paridad de schema + `annotations` obligatorias, con introspección runtime del server; el
test rompe el CI si diverge en cualquiera de las dos direcciones. Interino hasta que TASK-1780 lo
reemplace por el manifiesto canónico de Greenhouse):

| Tool | Qué es |
|---|---|
| `get_seo_entitlement` | Estado del módulo por organización (sin anti-oracle, por diseño) |
| `get_seo_keyword_opportunities` | Striking distance **medido** (Search Console) |
| `get_seo_keyword_market_data` | Volumen + barrera de enlaces **estimados** por lista explícita de keywords (TASK-1661) |
| `get_seo_visibility_360` | Quadrant SEO × AEO |
| `get_seo_rank_evolution` | Serie temporal de posiciones exactas |
| `get_seo_site_audit_report` | Audit técnico OnPage |
| `get_seo_backlink_profile` | Serie semanal del perfil de enlaces |
| `get_seo_keyword_discovery` | Corridas y candidatos de keyword discovery — lente ◑ + GSC ● separadas (TASK-1664) |
| `get_seo_grounded_query_draft` | Draft de grounded queries AEO con provenance y `groundingMode` honesto (TASK-1666) |
| `get_seo_overview_kpis` | KPIs norte del cockpit Overview, **medidos** GSC (TASK-1306; federada por TASK-1658) |
| `get_seo_performance` | Serie diaria + standing de un set de keywords/URLs (TASK-1307; federada por TASK-1658) |
| `get_seo_performance_catalog` | Ítems comparables de la pantalla Rendimiento (TASK-1307; federada por TASK-1658) |
| `get_seo_domain_overview` | Foto de dominio ◑ estimada, acepta competidores (TASK-1775; federada por TASK-1658) |
| `get_seo_url_visibility` | Visibilidad ◑ por dominio/subdominio/subcarpeta/URL declarada (TASK-1776; federada por TASK-1658) |
| `get_seo_backlink_detail` | Detalle nominal del perfil de enlaces, tres estados honestos (TASK-1777; federada por TASK-1658) |
| `get_seo_prospect_diagnostic` | Diagnóstico de prospecto ya corrido, todo ◑ con fecha (TASK-1709; federada por TASK-1658) |
| `get_seo_provider_spend` | Gasto DataForSEO del mes por organización, cortado por **consumidor** (`seo` / `aeo`) y por **base de costo** (`invoiced` / `estimated`, declarando versión de la tabla de precios) — nunca un total único. 🔴 **solo bindings `internal`**: es lo que nos cuesta servir al cliente, no lo que el cliente consumió (TASK-1696) |
| `track_seo_keywords` ✍️ | **Escribe**: mete keywords al ciclo diario y compromete gasto recurrente |
| `untrack_seo_keywords` ✍️ | **Escribe**: el reverso, cierra la ventana sin borrar historia |
| `discover_seo_keywords` ✍️ | **Escribe y GASTA por corrida** (Labs Live factura por llamada y por fila); preview + confirmación humana antes de encolar; async (TASK-1664) |
| `prepare_seo_grounded_queries` ✍️ | **Escribe** un DRAFT AEO (no gasta proveedor, jamás aprueba/activa); con la identidad máquina compartida responde `aeo_forbidden` fail-closed hasta TASK-1631 (TASK-1666) |
| `run_seo_prospect_diagnostic` ✍️ | **Escribe y GASTA por corrida**: diagnóstico único sobre un prospecto, con confirmación humana previa; flag `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` OFF = estado legítimo (TASK-1709; federada por TASK-1658) |

⚠️ **Estado de despliegue (2026-08-28).** No confundir el **allowlist federado** (27, tras TASK-1662/1699) con lo que la
**revisión productiva del gateway** sirve (21):

- El rollout de TASK-1658 **ya se ejecutó**: la revisión `efeonce-mcp-gateway-00023-zt2`
  (2026-08-27) llevó `tools/list` de 13 a 21. Los 4 commits de TASK-1658 están pusheados a `main`.
- Falta la tool 22, `get_seo_provider_spend` (commit `1a51461` en `main`, CI verde). El deploy del
  gateway es `workflow_dispatch` **manual** y no se disparó con el push; además su lane
  `/api/platform/ecosystem/growth/seo/provider-spend` está en `develop`, **no en `main`** de
  Greenhouse.
- Por lo tanto el deploy va **DESPUÉS** del release develop→main. Dispararlo antes deja la tool
  respondiendo **404 upstream** (precedente literal de TASK-1661).

Verificación post-deploy: `tools/list` sube exactamente 21→22 + canary completo. Si un cliente
externo no ve `get_seo_provider_spend` antes de eso, es el estado esperado, no una falla.

⚠️ **Las cinco de escritura no comparten el scope de lectura.** Viven en `efeonce.mcp.seo.write`
(la lista se DERIVA del inventario — `GREENHOUSE_SEO_WRITE_TOOLS` — y el gate HTTP de scopes en
`src/app.ts` la consume; ya no hay lista a mano) porque comprometen gasto del proveedor, y el lane
las acepta solo desde bindings de scope `internal`. Un `403 insufficient_scope` sobre ellas con el
scope base es el comportamiento correcto. El scope NO está cableado al cliente PKCE público —
fail-closed hasta TASK-1631.

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

### Probar UNA tool del lane directo con `curl` (sin OAuth, sin gateway)

El canary de arriba prueba la cadena completa, pero necesita login humano. Para verificar
**una sola tool** — por ejemplo la recién agregada — se llama su endpoint del lane directo.
Es el camino más corto para responder "¿esto responde de verdad o sólo está cableado?".

```bash
TOK=$(gcloud secrets versions access latest \
  --secret=efeonce-mcp-gateway-greenhouse-token --project efeonce-group)
BYPASS=$(grep -m1 '^VERCEL_AUTOMATION_BYPASS_SECRET' .env.local | cut -d= -f2- | tr -d '"')
BASE=https://<deployment-de-staging>.vercel.app   # o https://greenhouse.efeoncepro.com en prod

curl -s -H "Authorization: Bearer $TOK" -H "x-vercel-protection-bypass: $BYPASS" \
  "$BASE/api/platform/ecosystem/growth/seo/overview-kpis\
?externalScopeType=other&externalScopeId=efeonce-mcp-gateway&organizationId=<org>&rangeDays=28"
```

Los dos parámetros que casi siempre faltan la primera vez son
**`externalScopeType` + `externalScopeId`**: sin ellos el lane responde `400
missing_external_scope_type`, que se lee como si el endpoint no existiera pero en realidad
significa que llegó bien y le falta el binding. Los valores del gateway son
`other` / `efeonce-mcp-gateway` (los sembró `scripts/api-platform/provision-mcp-gateway-seo-consumer.ts`).

⚠️ **Esto NO se puede probar en `localhost`.** El lane ecosystem devuelve `500` en local por
un `ENOENT` de `@opentelemetry/instrumentation` en `node_modules` — falla igual para
endpoints que llevan meses sanos en producción (verificado contra `rank-evolution`), así que
un 500 local **no** dice nada de tu endpoint. Prueba contra el deployment de staging.

Verificación de referencia (`get_seo_overview_kpis`, staging, 2026-08-07): Berel devolvió
`200` con 2.596 clics, 136.146 impresiones, posición ponderada 5.78, `previous: null`
(sin ventana comparable, NO un cero) y 5 puntos de serie; org sin módulo → `404 not_found`
(anti-oracle); sin token → `401`; `rangeDays=99999` → clampeado a `365` server-side.

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
| `greenhouse_seo_lane_404` | La org no tiene el módulo `seo_v2`. | Asignar el módulo si corresponde comercialmente. |
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

**403 `insufficient_scope`.** Depende de qué tool. Las **17 de lectura** viven en el scope base
`efeonce.mcp.read` — no tienen scope de lectura propio. Las **5 de escritura** (`track_seo_keywords` /
`untrack_seo_keywords` / `discover_seo_keywords` / `prepare_seo_grounded_queries` /
`run_seo_prospect_diagnostic` — la lista la deriva el gate HTTP de `GREENHOUSE_SEO_WRITE_TOOLS`)
exigen `efeonce.mcp.seo.write`, un scope aparte: un cliente con solo el scope base recibe `403` sobre
ellas **y eso es correcto**, no una falla. Ojo con `prepare_seo_grounded_queries`: aun con el scope de
escritura, la identidad máquina compartida recibe `aeo_forbidden` del upstream — es el fail-closed
documentado hasta TASK-1631, no un problema de scope. Si un cliente tiene el scope que
corresponde y aun así recibe `403`, revisa el consentimiento de la aplicación en Entra antes de tocar
el gateway.

**403 `scope_not_allowed` desde el lane.** El binding usado no es de scope `internal` ni está ligado a una
organización. Es un problema de configuración del consumer en Greenhouse (`EO-SPK-0004` / `EO-SPB-0004`), no del
gateway.

**404 donde esperabas datos.** Casi siempre es el deny anti-oracle: esa organización no tiene `seo_v2` asignado (la clave vigente desde el cutover de TASK-1310/1677; `seo_v1` ya no la lee ningún runtime).
Confírmalo con `get_seo_entitlement`, que sí responde honestamente `hasModule=false`. No lo trates como un bug del
transporte.

## Como se apaga (rollback)

Tres niveles, de menor a mayor alcance. Elige el mínimo que resuelva el problema.

**1. Apagar solo el provider SEO del gateway.** El resto del gateway (Globe, OAuth, front door) sigue operando.

- Pon `GREENHOUSE_SEO_PROVIDER_ENABLED=false` en las variables del repo `efeonce-mcp` y redespliega por el
  workflow. Todas las tools SEO federadas (21 en el allowlist; 13 en la revisión productiva actual)
  pasan a `503 greenhouse_seo_policy_blocked`.
- Alternativa inmediata: mover 100% del tráfico a la revisión previa verificada del gateway.
  **[verificar]** la revisión previa exacta no quedó registrada en esta sesión; obtenla con
  `gcloud run revisions list --service=efeonce-mcp-gateway --region=southamerica-west1 --project=efeonce-group`.

**2. Apagar el módulo SEO completo en Greenhouse.** `GROWTH_SEO_ENABLED=false`. Ojo: es **multi-runtime**.
Apagarlo en Vercel deja muerto el lane ecosystem pero **no** detiene el materializador diario de Search Console,
que corre en el `ops-worker` y lee su propia copia de la variable. Si quieres detener ambos, tienes que aplicarlo
en los dos runtimes — y en Cloud Run el archivo `deploy.sh` es la fuente de verdad, porque un cambio hecho solo
con `--update-env-vars` se borra en el próximo deploy.

**3. Apagar una organización puntual.** Revoca su assignment `seo_v2` con `effective_to` / `status`. **Nunca**
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
