# TASK-1813 — Compatibilidad OAuth del MCP Efeonce con Codex y Claude

## Delta 2026-09-07 — rollout y matriz cliente post-cutover completos

El plan P1 y el rollout fueron aprobados por el operador. El commit
`cd229069ee9e7f0d1f75d56d08d9dd93833eadd1` quedó publicado en `efeonce-mcp/main`; CI
[`34162827740`](https://github.com/efeoncepro/efeonce-mcp/actions/runs/34162827740) pasó `pnpm check` y el build
Docker, y el workflow manual
[`34162885950`](https://github.com/efeoncepro/efeonce-mcp/actions/runs/34162885950) desplegó `1.2.0`. Cloud Run
sirve `efeonce-mcp-gateway-00047-8b5` al 100 %, `Ready=True`, con
`GATEWAY_BUILD_SHA=cd229069ee9e7f0d1f75d56d08d9dd93833eadd1` e imagen
`sha256:608a4789ad144cbece158b1e162785c8dfc3f9ed20719c7d9bd456639f62b29e`. Los tres gates nativos leídos en la
revisión están ON y el issuer efectivo sigue siendo `https://auth.efeonce.org`; no hubo cambio en Entra.

Cuando el emisor nativo está
habilitado, ambos PRM anuncian únicamente `https://auth.efeonce.org` y `efeonce.mcp.read`; las rutas de metadata
AS espejada y `/register` del shim responden `404`; `OAUTH_PUBLIC_CLIENT_ID` y `MCP_REQUIRED_SCOPES` dejaron de
ser interruptores soportados en config/workflow. Los scopes de dominio y escritura se entregan sólo mediante el
challenge `403 insufficient_scope` de la tool exacta. El verifier sigue aceptando tokens Entra legacy válidos,
sin convertir a Entra en bootstrap ni retirar sesiones o grants existentes.

El harness `test/oauth-discovery.test.ts` cubre mismatch/coherencia de issuer, igualdad PRM root/path, modo legacy
directo, bootstrap base-only, retiro conductual del shim, issuer/audience/expiración/scope base/OAuth ausente y
cero dispatch no autorizado. El readback público post-cutover devolvió health/PRM `200`, PRM root/path iguales,
un AS nativo, un scope base, metadata AS del gateway `404`, `POST /register` `404` y MCP anónimo `401` con
challenge base-only. El rollback fue ensayado: 100 % del tráfico volvió a `efeonce-mcp-gateway-00046-6n2`, donde
health/PRM siguieron `200` y reaparecieron metadata gateway `200` + `/register` `201`; luego se restauró 100 % a
`00047-8b5` y se repitieron los asserts nuevos `200/404/404`.

Claude Code `2.1.263` refrescó post-cutover a las `2026-09-07T21:25:13Z`; el readback de PG conserva exclusivamente
`efeonce.mcp.read`, un refresh activo y dieciséis rotados, sin widening. Una sesión nueva invocó
`efeonce.gateway.status` y `get_seo_entitlement`; la lectura respondió `ok=true`, `hasModule=false` y
`blockedReason=no_entitlement`, sin gasto. Codex `0.153.4` completó después el consentimiento de la organización
canary con `--scopes efeonce.mcp.read`; el token CIMD externo emitido a las `2026-09-07T21:37:50Z` conservó sólo
ese scope. Una sesión efímera nueva invocó `efeonce.gateway.status` y `get_seo_entitlement`; ambas lecturas fueron
verdes, la segunda con `no_entitlement` y sin gasto. El primer listener loopback expiró antes de recibir el callback;
un segundo login fresco completó el recorrido, por lo que el timeout se conserva como evidencia operativa y no
como fallo del protocolo.

Claude.ai repitió post-cutover una lectura hospedada contra la misma revisión. Claude Desktop `1.46388.4` abrió
el chat remoto desde la app nativa y ejecutó `get_seo_entitlement`: `ok=true`, `hasModule=false`,
`blockedReason=no_entitlement`, `allowanceUsed=0` y `budgetUsedUsd=0`. El DCR hospedado de Claude refrescó a las
`2026-09-07T23:38:30Z`; PostgreSQL registró seis access/refresh, cinco refresh rotados y un refresh activo, todos
con scope exacto `efeonce.mcp.read`. Cloud Run sirvió los dispatch `POST /mcp` `200` en `00047-8b5`.

ChatGPT hospedado repitió la certificación a las `2026-09-08T00:18Z` sobre su app y DCR existentes. La UI devolvió
`ok=true`, `hasModule=false`, `blockedReason=no_entitlement`, `allowanceUsed=0` y `budgetUsedUsd=0`, sin escrituras.
El ledger pasó de tres a cuatro access/refresh, de dos a tres refresh rotados y conservó uno activo; el token nuevo
fue emitido a las `00:15:03Z`, el único consentimiento activo siguió siendo `efeonce.mcp.read` y todos los tokens de
la familia permanecieron base-only. Cloud Logging correlacionó un `POST /mcp` `200` en `00047-8b5` a las
`00:18:00Z`. No se creó cliente, consentimiento, grant, capability ni permiso. Con ambas repeticiones y el
`pnpm check` final del gateway (154/154, cero omitidos), la matriz post-cutover queda completa y la task puede cerrar.
La sincronización posterior al cierre actualiza también la skill `efeonce-mcp-platform` y sus referencias
Claude/Codex: `1.2.0` ya no figura pendiente, el PR #3 ya no figura abierto y el límite multiorganización remite a
TASK-1844 sin widening de scopes ni claims.

La prueba separada de Codex personal/corporativo usó la identidad corporativa indicada por el operador,
`jreyes@efeoncepro.com`. El consentimiento interno se completó para el único contexto mostrado, `Efeonce`, y la
capability `growth.seo.observation.read`. El readback PG de las `2026-09-07T22:00:13Z` confirma consentimiento
activo a las `21:52:31Z` y code interno emitido a las `21:52:32Z`; el code nunca se consumió y ya expiró, por lo que
no existe access token, refresh token ni dispatch corporativo de Codex. Ese consentimiento de un contexto no
satisface el requisito de operar todas las organizaciones que la autoridad Greenhouse del operador permita. La
brecha multiorganización pertenece a TASK-1844; no se corrige ampliando scopes OAuth, grants del canary ni
claims wildcard en el JWT, y no invalida la certificación externa sintética de este cliente.

## Delta 2026-09-07 — Claude Code y Claude.ai certificados en la ruta base

La incompatibilidad de Claude Code quedó versionada: `2.1.186` solicitaba el catálogo completo descubierto;
Anthropic corrigió ese comportamiento desde `2.1.196`. El CLI local fue actualizado a `2.1.263` y el servidor
`efeonce-mcp` quedó con `oauth.scopes="efeonce.mcp.read"`, sin override de metadata. Un login nuevo completó
PKCE S256, consentimiento para la organización canary exacta, emisión y dispatch. La sesión aislada sólo vio
`efeonce_gateway_status|get_seo_entitlement`, ejecutó la lectura SEO con `no_entitlement` y no expuso
`track_seo_keywords`. El warning SEP-2352 sobre una credencial local sin sello `issuer` queda como observación
de compatibilidad del cliente; no impidió conexión ni lectura.

Claude.ai también completó el custom connector remoto, pero mediante un DCR público propio de TASK-1832 y no
con el CIMD compartido detectado por Anthropic. El callback hospedado exacto, el secret vacío, OAuth siempre
requerido y Streamable HTTP produjeron consentimiento base-only, las mismas dos tools read-only y una llamada
SEO real sin gasto. Esa evidencia acredita Claude.ai web; una ejecución posterior desde Claude Desktop
`1.46388.4` abrió el chat remoto en `Claude.app`, pidió aprobación propia y repitió la lectura. Ambos DCR están
ligados al `software_id=run_id` y al cleanup exacto del canary; Desktop reutiliza el hospedado.

ChatGPT ya no está bloqueado por la ausencia de `offline_access`: el cliente hospedado rotó dos veces su refresh
después del TTL manteniendo únicamente `efeonce.mcp.read`. Codex `0.153.4` también completó login y lectura real.
No se amplían scopes ni grants. Claude Code y Claude.ai repitieron la lectura después del TTL; cada DCR quedó
con dos access/refresh, un refresh rotado y uno activo, siempre `efeonce.mcp.read`. Claude Desktop `1.46388.4`
ejecutó otra lectura desde la app nativa sobre el mismo conector remoto. Al registrar esta evidencia aún
permanecía retirar la ambigüedad del catálogo mixto Entra+nativo; el Delta de implementación de arriba documenta
la decisión y el cambio local posteriores.

## Delta 2026-09-06 — hallazgos de clientes reales durante TASK-1832

La certificación canary productiva reabrió esta unidad con versiones actuales, sin cambiar el runtime:

- **Codex 0.153.4:** el bootstrap inicial pidió `efeonce.mcp.read`, Globe y Hiring aun cuando el DCR estaba
  limitado a base read; el emisor rechazó `invalid_scope`. El retry automático sin scopes sí llegó al
  consentimiento, mostró sólo `efeonce.mcp.read`, completó login y una sesión nueva invocó
  `get_seo_entitlement` sin gasto. Al declarar manualmente `--oauth-resource`, Codex duplicó `resource` y el
  emisor rechazó `invalid_request`; sin ese override el flujo funciona. El callback local termina visualmente
  en `ERR_BLOCKED_BY_CLIENT` bajo Chrome depurado, aunque el listener ya recibió el code y el CLI queda logueado.
- **Claude Code 2.1.186:** con client ID público pre-registrado y callback exacto pidió el catálogo anunciado,
  incluidas formas resource-qualified duplicadas y scopes de escritura; el emisor rechazó `invalid_scope`
  antes del consentimiento. La configuración soportada por esa versión no permitió fijar un scope mínimo desde
  `claude mcp login`. No se ampliaron scopes ni grants para forzar el recorrido.
- **ChatGPT hospedado (preflight, aún sin ceremonia):** la documentación oficial vigente de OpenAI pide que
  discovery anuncie `offline_access` (o equivalente) para mantener la renovación. El emisor nativo live anuncia
  `grant_types_supported=[authorization_code, refresh_token]` y ya emite refresh opaco rotativo, pero sus
  `scopes_supported` no incluyen `offline_access`. Esto no demuestra que el alta inicial falle; sí impide dar por
  certificada la continuidad hospedada hasta medir una renovación posterior al TTL. Si el cliente efectivamente
  solicita ese scope, hoy el emisor lo rechaza como desconocido. La corrección debe modelarlo como control de
  ciclo de vida OAuth, nunca como capability del gateway ni como permiso de lectura/escritura.

TASK-1832 registra el resultado en su matriz y conserva la organización canary aislada. Esta task sigue siendo
la dueña de normalizar scopes/resource por cliente y de decidir la versión mínima soportada de Claude Code.

## Delta 2026-09-03 — EPIC-044 (U10, carril interno)

La task pasa a `EPIC-044`. El emisor propio (`TASK-1828`/`TASK-1829`) es quien resolverá de raíz el desajuste de `issuer` y CIMD; esta task conserva su alcance interno Entra (discovery, shim, scopes) y no construye broker. Coordinar con `TASK-1831` antes de editar `app.ts`/config del gateway.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Complete. efeonce-mcp 1.2.0, SHA cd229069, revisión 00047-8b5 e imagen sha256:608a4789…b29e sirven 100 % y Ready. Discovery nativo/base-only, retiro del shim y rollback 00046→00047 verificados. Claude Code 2.1.263, Codex 0.153.4 canary, Claude.ai, Claude Desktop 1.46388.4 y ChatGPT hospedado completaron lecturas post-cutover base-only y sin gasto; Desktop y ChatGPT además renovaron sus familias después del corte. No hubo widening ni cambios Entra. La autoridad interna multiorganización permanece separada en TASK-1844 y no bloquea esta interoperabilidad.`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; MCP main; checkout compartido de cada repo, sin cambiar ramas ni usar worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

> Baseline histórico; el estado vigente está en el Delta 2026-09-07 y en `Status real`.

Corregir la interoperabilidad OAuth del gateway existente `mcp.efeonce.org`: Codex rechaza su discovery antes
de autenticar. Entregar configuración y pruebas de conexión nueva en Codex y Claude Code, con scopes mínimos,
callbacks válidos, rollout reversible y evidencia de lectura real. No construye otro broker ni habilita B2B.

## Why This Task Exists

> Diagnóstico histórico; la compatibilidad cliente objetivo ya fue medida por TASK-1832.

El protected-resource anuncia al gateway como authorization server, pero su metadata devuelve el issuer de
Entra. El intento con Codex `0.152.0` falla con `OAuth authorization server issuer does not match authorization
metadata origin`. El canary existente va directo a Entra y no prueba ese discovery. Además, apagar el shim
reintroduce scopes sin cualificar y el workflow lo reactiva si la variable queda vacía.

En el intake del 2026-09-02 el operador confirmó crear esta task, todavía sin implementarla. El fallo de OAuth es
independiente de los commits de
la skill Berel en `main`: no se debe resolver esta task alterando la historia Git ni el trabajo de otra sesión.
Evidencia, límites y fuentes: [auditoría 2026-09-02](../../audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md).

## Goal

- Discovery coherente y autenticación soportada desde el resource canónico en ambos clientes objetivo.
- Una sesión nueva de Codex y una de Claude Code pueden listar e invocar una lectura autorizada sin gasto.
- Mantener issuer/audience/expiry/scopes, autorización downstream y escrituras fail-closed.
- Documentar la ruta operativa real y evitar que un deploy posterior restaure el defecto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Un único resource: `https://mcp.efeonce.org/mcp`; Efeonce ID es el único AS anunciado en el carril nativo.
  Entra continúa como issuer aceptado por el verifier para tokens legacy válidos, no como bootstrap/discovery.
- Gateway adapter-neutral, sin emitir tokens, proxear auth de negocio, duplicar identidad ni acceder a DB.
- Identidad humana y credencial workload downstream separadas; ningún scope de escritura se agrega al cliente
  público compartido para conseguir un smoke verde.
- Reabrir mediante decisión fechada el disparador de incompatibilidad del ADR del gateway antes del cutover;
  no reescribir retrospectivamente el ADR aceptado. Indexar la decisión aceptada donde corresponda.
- Skills: `efeonce-mcp-platform` + `mcp-craft`; secret hygiene/cloud para configuración; QA y documentation
  governor para verificación/cierre. La skill de Berel no concede conectividad ni permisos MCP.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`
- `../efeonce-mcp/AGENTS.md` — contrato propio, obligatorio antes de editar el runtime hermano.

## Dependencies & Impact

### Depends on

- Foundation ya existente de `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`.
  No requiere completar toda esa task; sí coordinar el overlap de auth/discovery/deploy antes de editar.
- Emisor nativo, resource y verifier multi-issuer existentes. El retiro del shim no cambia grants, redirects,
  sesiones ni consentimientos y no requiere mutación Entra.
- La matriz productiva TASK-1832 aporta clientes/versiones/callbacks/refresh; la repetición contra `1.2.0`
  requiere autorización independiente de deploy y cutover.

### Blocks / Impacts

- Alta/reconexión de Codex y regresión de Claude Code; claude.ai/Desktop si se confirman como consumidores activos.
- `TASK-1631` conserva broker/CIMD/B2B/grants externos: consume el aprendizaje, no bloquea la corrección interna.
- `TASK-659` conserva auth hosted del MCP interno; no se crea otra implementación de esa foundation.
- La referencia `TASK-1654` del shim no tiene archivo/fila propios verificados: formalizar la trazabilidad hacia
  esta task, sin inventar que se completó una task inexistente.
- Trabajo concurrente de `TASK-1805` en Greenhouse y el manifiesto del gateway: no absorberlo en un deploy OAuth.

### Files owned

Ownership acotado a OAuth; los archivos compartidos requieren coordinación con sus dueños activos.

- `../efeonce-mcp/src/app.ts`
- `../efeonce-mcp/src/config.ts`
- `../efeonce-mcp/src/auth/token-verifier.ts` — preservar contrato; modificar sólo si el plan demuestra necesidad.
- `../efeonce-mcp/test/oauth-discovery.test.ts`, `test/config.test.ts`, `test/native-integration.test.ts` y
  `test/greenhouse-hiring-mcp.test.ts`; `test/dcr-shim.test.ts` se retira al migrar su cobertura válida.
- `../efeonce-mcp/scripts/oauth-canary.mjs`
- `../efeonce-mcp/.github/workflows/deploy.yml`, `.env.example`, `AGENTS.md`, `README.md`, `package.json` y
  `surface-baseline.json`
- Tests/helpers nuevos de discovery bajo `../efeonce-mcp/test/` y `../efeonce-mcp/scripts/`, con nombres en el plan.
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` y `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/documentation/plataforma/efeonce-mcp-gateway.md`
- `docs/manual-de-uso/plataforma/operar-efeonce-mcp-gateway.md`
- `.codex/skills/efeonce-mcp-platform/SKILL.md` y `.claude/skills/efeonce-mcp-platform/SKILL.md`
- Esta task, auditoría y entradas acotadas en índices/Handoff/changelog.

La configuración local de cada cliente queda fuera de Git. Su edición, limpieza de credenciales o cambios en
Entra se presentan con diff/alcance explícito al operador; nunca se copian tokens entre clientes.

## Current Repo State

> `Already exists`, `Gap` y los hechos del 2026-09-03 son el snapshot de intake. El estado local vigente está
> en el Delta de implementación de este documento.

### Implementación local 2026-09-07

- `efeonce-mcp` `1.2.0` anuncia sólo el issuer nativo y el scope base cuando el carril nativo está habilitado.
- El shim DCR/metadata AS del gateway quedó retirado; las entradas históricas no pueden reactivarlo por config.
- El modo legacy-only anuncia directamente el issuer Entra y usa el scope base resource-qualified.
- Scopes adicionales permanecen en policy y se revelan incrementalmente sólo después de una denegación 403.
- Sin DB, migración, provider, grant, capability o tool surface nueva; baseline de 39 tools sin drift.

### Already exists

- Gateway local inspeccionado en `58517f00e550748e271c9b2138970d32290e0c80`; verificar SHA y WIP al tomarla.
- PRM root/path-specific, metadata AS espejada, `/register` fijo y auth antes de dispatch en `src/app.ts`.
- `test/dcr-shim.test.ts` cubre tres comportamientos del shim, pero no el fetch AS ni la igualdad de issuer.
- Canary PKCE con authorize/token construidos directamente desde Entra: prueba token/downstream, no discovery.
- Configuración `efeonce` registrada en Codex local, auth unknown tras intento fallido; ninguna tool callable
  verificada en esta sesión. El alta en config no refresca por sí sola las herramientas de una sesión abierta.

### Gap

- Mismatch observado live; scopes requestables y challenge divergen; OFF no durable en deploy.
- Falta prueba de login fresco de ambos clientes y callbacks de la versión instalada.
- No está verificado que Entra directo + pre-registro cierre todo: Codex conserva validación de metadata incluso
  con client ID. El reporte upstream #40885 requiere contraste, no se asume aplicable a `0.152.0`.
- ADR/skill afirman tolerancia general de clientes a partir de evidencia histórica; deben fechar/versionar soporte.

### Hechos verificados 2026-09-03 (código de Codex `rust-v0.152.0` + `rmcp =3.1.3`, discovery vivo, spec `2026-07-28`)

Verificados leyendo fuente y runtime, no memoria. Cambian el orden de riesgos del plan B «Entra directo»:

- **El mismatch es exactamente `AuthorizationServerMismatch` de rmcp** (`validate_authorization_metadata_issuer`): issuer
  presente y distinto → error duro; issuer ausente → tolerado porque Codex llama `set_allow_missing_issuer(true)`.
  Pre-registrar `oauth.client_id` **no lo evita**: `resolve_authorization_manager` resuelve y valida metadata igual.
- **Entra directo SÍ es descubrible por rmcp**: para issuer con path prueba 4 candidatos y el tercero
  (`/{tenant}/v2.0/.well-known/openid-configuration`) responde 200 con `issuer` idéntico; los dos de path-insertion dan 404.
- **Segundo rechazo normativo detrás del primero:** la OIDC discovery de Entra **no publica `code_challenge_methods_supported`**
  (verificado en vivo). La spec `2026-07-28` §security-considerations dice que si falta, el cliente **MUST refuse to proceed**
  (aplica a RFC 8414 y a OIDC). rmcp 3.1.3 sólo emite `warn!` y sigue, así que Codex hoy pasa; un cliente estricto no.
  El shim inyecta `["S256"]` en la metadata espejada: es una **segunda función del shim** que el ADR no documenta, y el
  «fixture conforme» de Slice 1 debe cubrir esta dimensión, no sólo el issuer.
- **Scopes bajo plan B fallan en dos pasos si no se corrige el challenge:** (1) `codex mcp login` sin `--scopes` usa los
  `scopes_supported` del PRM — hoy los **cinco cualificados, escrituras incluidas** (`efeonce.mcp.seo.write` es `type: Admin`)
  → Entra exige consentimiento admin → `OAuthProviderError` → Codex reintenta **sin scopes** (`should_retry_without_scopes`);
  (2) rmcp entonces siembra desde el `scope` del challenge 401, que en vivo es **`efeonce.mcp.read` sin cualificar** → Entra lo
  resuelve contra Graph (`AADSTS650053`). Corrección concreta: PRM `scopes_supported` = mínimo de lectura (step-up de
  escrituras por `403 insufficient_scope`, como manda `mcp-craft/security-and-auth.md`), y challenge con scope cualificado.
- **`offline_access`:** rmcp lo añade sólo si el AS lo anuncia en `scopes_supported`. Entra directo lo anuncia (refresh token
  OK); la metadata espejada del shim **no** → con el shim no hay refresh token. Verificar renovación en ambos modos.
- **Callback de Codex ≠ callbacks registrados:** Entra no anuncia `authorization_response_iss_parameter_supported` → Codex
  entra en modo `CallbackSpecific` y usa `http://127.0.0.1:<puerto>/callback/<id>` con `<id>` = SHA-256 de la URL del servidor
  (para `https://mcp.efeonce.org/mcp`: `boTaDHiFl7aq`). Registrados hoy (`az ad app show`, 2026-09-03): `http://localhost`,
  `http://localhost:8765/callback`, `https://claude.ai/api/mcp/auth_callback`. Ninguno calza. Docs Entra: el puerto se ignora
  para redirects loopback, la ruta **no**; `http://127.0.0.1` con esquema http sólo se agrega vía `replyUrlsWithType` en el
  manifest. Si el puerto se ignora también para `127.0.0.1` (no verificado) el mínimo sería `http://127.0.0.1/callback/boTaDHiFl7aq`.
  Configurar `oauth.callback_url = "http://localhost/..."` no sirve: Codex sólo inyecta el puerto del listener cuando el host
  es `127.0.0.1`.
- **Claude Code instalado: `2.1.186`.** Las docs vigentes documentan `--client-id`, `--callback-port` (redirect
  `http://localhost:PORT/callback`) y `oauth.authServerMetadataUrl` (bypass del discovery; sus `scopes_supported` sobreescriben
  los del servidor, así que con Entra directo hay que fijar `oauth.scopes`). Verificar que esa versión los soporte antes de
  contar con ellos; no extrapolar a claude.ai/Desktop.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-mcp/src/app.ts`, `src/config.ts`, auth y deploy del gateway; contratos en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: discovery OAuth del recurso MCP y verificación de token; consumers Codex/Claude, providers intactos.
- Server/browser split: validación y configuración en servidor; cliente usa PKCE, sin secretos ni SDK privilegiado en browser.
- Build impact: tests/helpers de discovery en Node del gateway; ninguna dependencia runtime nueva asumida ni build del portal requerido para arreglar OAuth.
- Extraction blocker: no se extrae runtime; cambiar issuer/broker exigiría `TASK-1631` y aprobación independiente.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: discovery/config/deploy del gateway y documentación de interoperabilidad; Entra no cambia.
- Consumidores afectados: Codex CLI/app local, Claude Code y conectores Claude activos identificados.
- Runtime target: `local` para regresión; entorno previo autorizado y `production` para certificación final.

### Contract surface

- Contrato existente a respetar: PRM root/path-specific, challenges `/mcp`, validación JWT y dispatch en `../efeonce-mcp/src/app.ts`.
- Contrato nuevo o modificado: discovery coherente, scope requestable y modo de despliegue explícito; onboarding por cliente.
- Backward compatibility: `gated`; la retirada del shim puede requerir reconfiguración/relogin. No prometer transparencia.
- Full API parity: no se agrega capability de negocio; las mismas tools/readers existentes siguen siendo el contrato programático.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; sin DB, migración ni nuevas organizaciones/bindings.
- Invariantes que no se pueden romper:
  - Resource público único; issuer real, JWKS y audience/expiración verificables antes del dispatch.
  - Scope requestable bare para Efeonce ID o resource-qualified para el modo Entra legacy-only, distinto del
    `scp` bare que valida el gateway; no ampliar grants por un error de cliente.
  - Scopes mínimos de onboarding separados de catálogo de capacidades y de escrituras/gasto fail-closed.
- Write-target allowlist: no aplica; no se agrega destino de escritura de negocio.
- Tenant/space boundary: identidad verificada y policy downstream existentes; no confiar en email, tenant libre o nombre del cliente.
- Idempotency/concurrency: discovery read-only repetible; sin registro dinámico mutante; probar peticiones concurrentes
  sin contaminación por cliente. Si queda caché, contrato explícito de timeout/retry/TTL sin filtrar errores upstream.
- Audit/outbox/history: sin outbox nuevo; evidencia sanitizada por cliente/versión/etapa y request ID; sin tokens ni PII.

### Migration, backfill and rollout

- Migration posture: `none`; migración operativa de configuración de clientes, no de datos.
- Default state: hardening local sin efecto productivo; el cutover requiere autorización independiente y readback.
- Backfill plan: ninguno; no revocar consentimientos o credenciales globalmente para probar un login nuevo.
- Rollback path: revisión/configuración exactas previas del gateway + restauración acotada del cliente; sin cambiar resource.
- External coordination: operador Platform/Identity, sesiones cliente y aprobación de deploy; Entra sólo si callbacks
  u otra necesidad comprobada lo exige, con before/after y sin reemplazar arrays ajenos.

### Security and access

- Auth/access gate: Efeonce ID PKCE S256 para conexiones nuevas, verificación JWT multi-issuer para sesiones
  legacy y nativas, y capacidades/entitlements downstream intactos.
- Sensitive data posture: nunca registrar tokens, codes, cookies, URLs OAuth con query, secrets ni payloads personales.
- Error contract: conservar 401 `invalid_token`, 403 `insufficient_scope`, 503 `oauth_not_configured` y errores sanitizados.
- Abuse/rate-limit posture: mantener límites de body/timeout/host/origin; sin bypass TLS, issuer, scopes o ingress.

### Runtime evidence

- Local checks: `pnpm check` en `efeonce-mcp`; fixtures conductuales coherente/incoherente y configuración ON/OFF.
- DB/runtime checks: sin DB; readback de revisión, modo, metadata y challenges en el hostname canónico.
- Integration checks: login nuevo → tools visibles → lectura sin gasto por cliente; negativos sin llamadas downstream.
- Reliability signals/logs: etapas discovery/registration/callback/token/tool distinguidas, status y correlación sin datos sensibles.
- Production verification sequence: el orden y stop conditions de Rollout Plan son obligatorios; canary directo no sustituye cliente real.

### Acceptance criteria additions

- [x] Fuente, contratos y consumidores confirmados con archivos y objetos reales al ejecutar.
- [x] Invariantes de issuer/audience/scope y cero dispatch preservados mediante pruebas conductuales.
- [x] Ninguna tabla ni write-target de negocio añadida; baseline de 39 tools sin drift.
- [x] Postura sin backfill confirmada y rollback ensayado contra la revisión previa durante el rollout autorizado.
- [x] Evidencia runtime por cliente registrada separadamente de tests y del canary directo.
- [x] Errores/auditoría sanitizados sin secretos ni datos personales en artefactos.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability`. Esta task repara discovery/issuer OAuth y configuración de deploy del gateway;
no introduce ni modifica una capability de negocio (ninguna acción nueva sobre estado, permisos, datos,
aprobaciones, exports, recoveries, reportes o configuración de dominio). Las tools/readers existentes
son el mismo contrato programático antes y después; ningún capability/entitlement nuevo se registra ni
se otorga. Si el plan aprobado terminara requiriendo una capability nueva (por ejemplo, un grant por
cliente), este gate se completa en ese momento, no aquí.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato de interoperabilidad y regresión reproducible

- Decisión fechada sobre discovery/pre-registro y matriz por cliente/producto/versión; documentar alternativas
  y el cambio de supuesto del ADR. Evaluar primero Entra directo + client ID pre-registrado, no imponerlo sin prueba.
- Harness reproducible sin secretos: fixture conforme con AS distinto del recurso y fixture mismatch rechazado.
  Distinguir fallo gateway de fallo upstream del cliente antes de escoger versión o configuración.
  El fixture «conforme» debe tener la forma real de Entra —OIDC path-append, **sin** `code_challenge_methods_supported`,
  sin `registration_endpoint`, con `offline_access` en `scopes_supported`— para que un cliente que aplique el MUST de PKCE
  falle en el harness y no en producción (ver «Hechos verificados 2026-09-03»).
- Contrato explícito para scopes de bootstrap, challenges, `resource` y callbacks reales. El cliente público
  sigue sin write scopes; `insufficient_scope` de una escritura no dispara ampliación automática.

### Slice 2 — Discovery, configuración y gates durables

- Implementar la decisión aprobada en gateway/config/workflow; OFF explícito no debe reactivar shim al redeploy.
- Desacoplar cualificación de scopes del shim; probar metadata y challenges observados, no texto fuente.
- Probar 401/403/503, issuer/audience/expiry, cero dispatch no autorizado, concurrencia y fallos de metadata.
- Mantener el canary directo como diagnóstico diferenciado; añadir cobertura del discovery que realmente usan clientes.

### Slice 3 — Onboarding y regresión de clientes

- Configuración mínima documentada de Codex y Claude Code; client ID público sin client secret, callbacks exactos
  soportados por cada versión y scopes de lectura necesarios. No presumir equivalencia con el callback del canary.
- Login fresco controlado en cada cliente sin borrar sesiones ajenas; nueva sesión de agente con tools visibles y
  una lectura real sin gasto. Verificar también continuidad/reconexión y renovación si el flujo emite refresh token.
- Inventariar claude.ai/Desktop activos y su configuración/certificación antes de retirar el shim; no extrapolar
  el resultado de Claude Code. Si no se pueden certificar, stop de promoción hasta decisión explícita del operador.

### Slice 4 — Cutover autorizado, rollback y documentación

- Deploy acotado al SHA aprobado y readback; no arrastrar cambios ajenos del gateway ni release del portal por reflejo.
- Ensayo previo de rollback y smokes post-cutover; diferencias de clientes, scopes y ausencia de ampliación documentadas.
- Actualizar triple documentación y mirrors de la skill; retirar la recomendación incompleta «unset y listo» y
  la afirmación no versionada de que todos toleran el mismatch. Formalizar la referencia huérfana del shim.

## Out of Scope

- Reconciliar `main`/`develop`, cherry-pick/rebase/reset/force-push, modificar protecciones GitHub o el playbook Berel.
- Registrar nueva app Entra, cambiar grants/redirects, publicar o desplegar sólo por haber creado esta task.
- Broker propio, CIMD en gateway, B2B, WorkOS, nuevas identidades o grants externos: pertenecen a `TASK-1631`.
- Abrir writes/gasto, usar bearer copiado de Claude, desactivar issuer/TLS o falsificar `issuer` del gateway.
- Migrar integralmente la versión de protocolo/SDK, inventario de tools o providers; reactivar Globe hibernado.
- UI propia de login, cambios en Notion, contenidos Berel o skills editoriales.

## Detailed Spec

La matriz debe distinguir cinco hitos: registro local, OAuth, discovery MCP, tool callable en sesión nueva y
readback real. Registrar resultado por hito/version/fecha; no declarar conexión por `enabled`, HTTP 200 de
metadata, scopes anunciados o tests sin credenciales. Elegir lectura mínima no facturable, preferentemente
`get_greenhouse_skill` si está disponible y autorizada; disponibilidad de provider se verifica, no se presupone.

Para la regresión de permisos, usar fixtures con firma/claims controlados y spy downstream. En vivo usar sólo
identidad de prueba legítima previamente disponible; no fabricar tokens ni revocar acceso real para conseguir
un negativo. Un scope no solicitado no prueba que no fue concedido: verificar claims efectivos de forma sanitizada.

Si una versión de Codex falla contra metadata conforme, entregar reproducción mínima y ruta soportada con evidencia
o declarar bloqueo upstream. No modificar el gateway para acomodar una comparación equivocada ni dar por aprobada
una actualización global de clientes. Los reportes de terceros son hipótesis hasta reproducir el mismo escenario.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (contrato + fixtures + aprobación humana) → Slice 2 (código/config/gates) → Slice 3 (clientes en entorno
previo) → Slice 4 (aprobación de cutover + producción). Si no existe entorno previo compatible con el resource,
presentar un canary productivo acotado y reversible para aprobación; no omitir el gate silenciosamente.

### Risk matrix

| Riesgo                                        | Sistema            | Probabilidad | Mitigation                                                           | Signal de alerta                          |
| --------------------------------------------- | ------------------ | ------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| Codex mantiene rechazo con metadata conforme  | Cliente OAuth      | medium       | Fixture conforme + versión exacta + ruta soportada antes del cutover | Error de discovery antes de callback      |
| Claude pierde alta/reconexión al retirar shim | Clientes activos   | high         | Inventario y pruebas frescas por producto antes de promoción         | Registration/callback/token fallidos      |
| Scopes sin cualificar o exceso de permisos    | Entra/gateway      | high         | Requestable separado de `scp`, bootstrap mínimo y negativos          | AADSTS650053, scopes de write solicitados |
| Deploy restaura shim o incluye WIP ajeno      | Cloud Run/CI       | high         | Modo explícito, prueba de configuración efectiva, SHA aprobado       | PRM vuelve a anunciar gateway como AS     |
| Redirect exacto distinto del canary           | Entra/Codex/Claude | medium       | Verificar host/puerto/path por versión, cambio mínimo aprobado       | Redirect mismatch o callback timeout      |
| Falsa certificación por canary directo        | Operación          | high         | Hitos separados y tool invocada desde cada sesión nueva              | Auth verde pero tool no callable          |

### Feature flags / cutover

En el source local `1.2.0`, `OAUTH_PUBLIC_CLIENT_ID` y `MCP_REQUIRED_SCOPES` están retirados como interruptores:
el parser no los consume, el workflow no los inyecta y una prueba conductual demuestra que no reactivan el shim
ni amplían bootstrap. Producción sirve `1.2.0`/`00047-8b5`; `1.1.2`/`00046-6n2` se conserva sólo como revisión
de rollback ya ensayada. Conservar los flags de providers y valores ajenos; nunca activar capacidades para
validar OAuth.

### Rollback plan per slice

| Slice | Rollback                                                                                | Tiempo                                                   | Reversible?                                             |
| ----- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| 1     | Restaurar decisión propuesta/fixtures propios; ninguna mutación runtime                 | Inmediato documental                                     | Sí                                                      |
| 2     | Revert enfocado aprobado del cambio y configuración efectiva anterior                   | Antes de promoción; duración medida en ensayo            | Sí                                                      |
| 3     | Restaurar sólo config del servidor en cliente afectado; preservar otras sesiones/grants | Medir durante ensayo                                     | Sí; puede requerir relogin                              |
| 4     | Retornar tráfico a revisión previa exacta y restaurar fuente declarativa/config cliente | Objetivo menor a 30 minutos; verificar antes del cutover | Sí; restaura estado previo, no garantiza arreglar Codex |

El ejecutor registra nombres exactos de revisión y comandos de rollback tras readback. No inventarlos desde
historia ni usar un reset del checkout. Si el rollback recupera Claude pero vuelve a bloquear Codex, declararlo.

### Production verification sequence

1. Readback de revisión/config/grants pertinentes y snapshot sanitizado; aprobación de SHA y rollback.
2. Gates locales y flujo completo en entorno previo autorizado; inventario de clientes con compatibilidad explícita.
3. Despliegue autorizado del gateway; readback de configuración efectiva y metadata root/path-specific.
4. Requests sin token/insuficientes fallan cerrado; OAuth fresco de Codex y Claude Code.
5. Nueva sesión de cada cliente: lista de tools + invocación read-only y resultado verificable sin gasto.
6. Confirmar reconexión de consumidores activos y ausencia de cambios en scopes de escritura/providers.
7. Ante regresión de auth, permisos o consumidores, detener promoción y ejecutar rollback aprobado; registrar pendientes.

### Out-of-band coordination required

Operador Platform/Identity para consentimientos/pruebas interactivas, configuración de clientes, aprobación de
deploy y cambios Entra si el plan los justifica. Coordinar ediciones compartidas y SHA con la sesión activa de
`TASK-1805`; no interrumpirla ni cambiar su rama. Esta creación documental no otorga ninguna de esas autorizaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Decisión aprobada con límite `TASK-1626`/`TASK-1631` y versiones/productos cliente registrados.
- [x] Fixture de mismatch falla y fixture conforme con recurso/AS distintos pasa el verificador conductual.
- [x] Discovery live coherente: producción `1.2.0` anuncia sólo Efeonce ID + scope base; PRM root/path iguales y
      las dos rutas de metadata AS del gateway responden `404`.
- [x] Scopes requestables usan forma bare con Efeonce ID y resource-qualified en modo legacy-only; `scp` interno
      se valida sin regresión.
- [x] Bootstrap no solicita automáticamente scopes de escritura; permisos efectivos de la matriz permanecen de lectura.
- [x] Config/workflow prueban que inputs retirados ausentes, vacíos o presentes no reactivan shim ni amplían scopes;
      el readback de configuración efectiva de Cloud Run queda dentro del criterio de rollout.
- [x] Negativos issuer/audience/expiración/base-scope/write-scope y OAuth ausente mantienen 401/403/503 y cero dispatch indebido.
- [x] Codex 0.153.4: login fresco, tools visibles en sesión nueva y lectura real sin gasto, con evidencia
      sanitizada en la matriz TASK-1832.
- [x] Claude Code 2.1.263: recorrido fresco, reconexión y renovación post-TTL; dos access/refresh, uno rotado y
      uno activo, siempre con `efeonce.mcp.read`. La fila 2.1.186 permanece FAIL histórico.
- [x] Claude.ai y Claude Desktop 1.46388.4 tienen evidencia propia post-cutover: Desktop ejecutó la lectura desde
      la app nativa y su familia hospedada refrescó base-only antes del dispatch en `00047-8b5`.
- [x] ChatGPT hospedado renovó post-cutover, conservó un único consentimiento `efeonce.mcp.read` y ejecutó
      `get_seo_entitlement` en `00047-8b5` con `no_entitlement`, allowance/presupuesto cero y sin escrituras.
- [x] Callbacks efectivos verificados por host/puerto/path en la matriz TASK-1832; no hubo ampliación de redirects
      ni secretos copiados en esta unidad.
- [x] Canary directo, harness de discovery y evidencia cliente se reportan separados; la suite local no omite tests
      y ningún `enabled` se usa como prueba de conexión.
- [x] Rollout autorizado, SHA/revisión/config readback y rollback ensayado dentro del objetivo quedan registrados.
- [x] Triple documentación y skill espejada reflejan soporte real; la referencia histórica del shim queda trazada
      a esta task y declarada retirada en `1.2.0`.
- [x] No cambios de ramas/historia Git, B2B, providers, gasto o contenidos Berel incluidos en esta unidad.

## Verification

- En `../efeonce-mcp`: `pnpm check` (format/typecheck/test/build) + harness conductual de discovery y configuración.
- En los clientes: pruebas interactivas acotadas según matriz aprobada, sin imprimir URLs OAuth completas.
- En Greenhouse: `pnpm task:lint --task TASK-1813`, `pnpm ops:lint --changed`, `pnpm skills:mirrors` si cambia la skill.
- `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed` al implementar, con evidencia separada de cada repo/runtime.
- `pnpm docs:closure-check` acotado a archivos propios y `pnpm docs:context-check:strict` como último gate documental.

Evidencia local y productiva 2026-09-07:

- `pnpm check` en `efeonce-mcp` `1.2.0`: format, typecheck, 154/154 tests, 0 fail, 0 skipped y build.
- Commit `cd229069ee9e7f0d1f75d56d08d9dd93833eadd1` en `origin/main`; CI `34162827740` verde, incluido Docker.
- Smoke del `dist`: health 200; PRM root/path equivalentes con AS nativo único y scope base; metadata AS y
  `POST /register` 404; MCP anónimo 401 antes de dispatch.
- Deploy manual `34162885950`: revisión `efeonce-mcp-gateway-00047-8b5`, imagen
  `sha256:608a4789ad144cbece158b1e162785c8dfc3f9ed20719c7d9bd456639f62b29e`, 100 % de tráfico y SHA/config
  efectivos leídos desde Cloud Run.
- Canary de contrato productivo: health/PRM `200`, PRM base-only, metadata AS del gateway y `/register` `404`,
  MCP anónimo `401` y bearer inválido `401 invalid_token`. El AS nativo mantiene S256 + refresh; el readback de
  Cloud Run confirma que `OAUTH_PUBLIC_CLIENT_ID` y `MCP_REQUIRED_SCOPES` están ausentes. El rollback a
  `00046-6n2` reprodujo el contrato anterior y la restauración a `00047-8b5` repitió el contrato nuevo.
- Claude Code `2.1.263`: refresh post-cutover y lectura real verdes; PG mantiene scope base único. Codex `0.153.4`
  canary completó token externo CIMD base-only y dos lecturas sin gasto; Claude.ai repitió una lectura hospedada
  post-cutover con `no_entitlement`.
- Claude Desktop `1.46388.4`: lectura visible desde la app nativa con `no_entitlement`, allowance/presupuesto cero;
  refresh DCR `2026-09-07T23:38:30Z` y dispatch `POST /mcp` 200 en `00047-8b5`, todo base-only.
- ChatGPT hospedado: lectura visible `2026-09-08T00:18Z` con `no_entitlement`, allowance/presupuesto cero; DCR pasó
  a cuatro access/refresh, tres rotados y uno activo, scope exacto `efeonce.mcp.read`; `POST /mcp` 200 en `00047-8b5`.
- Codex corporativo: `jreyes@efeoncepro.com` completó consentimiento interno sólo para `Efeonce`; PG registra
  consentimiento activo y code interno no consumido/expirado, sin access/refresh token ni dispatch. La brecha
  multiorganización queda registrada en TASK-1844.
- Greenhouse: task lint 0/0, mirrors idénticos, manifiesto MCP sin drift. `ops:lint --changed` terminó 0 con
  warnings ajenos (TASK-1842 y 13 paridades históricas de epics).
- Auditoría: [TASK-1813 OAuth hardening QA 2026-09-07](../../audits/mcp/TASK-1813_OAUTH_HARDENING_QA_2026-09-07.md).

## Closing Protocol

- [x] `Lifecycle` y `Status real` actualizados a `complete` sólo después de las repeticiones post-cutover.
- [x] Archivo movido a `complete` y `docs/tasks/README.md`/registry sincronizados.
- [x] Acceptance Criteria tildados sólo con evidencia; live, rollback y todos los clientes objetivo están cerrados.
- [x] `Handoff.md` registra configuración verificada, permisos, riesgos y siguiente paso.
- [x] `changelog.md` separa código, deploy, runtime, rollback y cierre cliente.
- [x] Impacto cruzado revisado con `TASK-1626`, `TASK-1631`, consumidores activos y WIP concurrente.
- [x] Commit, push, CI, deploy, runtime y rollback se verifican y reportan por separado.

## Follow-ups

- Broker/CIMD/identidad y grants por cliente continúan en `TASK-1631`; no abrir duplicada de esa migración.
- Incidente de commits Berel a `main` y protección de ramas se gestionan aparte, sin mutaciones Git en esta task.

## Open Questions

- **Resuelta:** TASK-1813 retira el catálogo mixto y el shim del camino soportado; el verifier Entra legacy se
  conserva. El Delta vive en el ADR del gateway y no reescribe su historia.
- **Resuelta:** TASK-1832 es dueña de la matriz/canary/cleanup; TASK-1813 es dueña del hardening de
  discovery/scopes/configuración y de su rollout futuro.
- **No requerida para el target:** no se modifica ningún redirect Entra. Codex usa el emisor nativo; si una unidad
  futura declara Codex-over-Entra como camino soportado, deberá verificar el callback `127.0.0.1` exacto con
  readback antes de tocar la app registration.

No queda un gate abierto propio de esta unidad. Revisión/configuración/tráfico, discovery público, rollback y
matriz cliente post-cutover están verificados sin widening. El acceso corporativo personal a todas las
organizaciones es una capacidad separada de TASK-1844 y no se cerrará aceptando un consentimiento limitado a
`Efeonce` ni ampliando el contrato OAuth de TASK-1813.
