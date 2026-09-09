# Operar Efeonce MCP Gateway

> **Tipo de documento:** Manual de uso / runbook breve
> **Endpoint canónico:** `https://mcp.efeonce.org/mcp`
> **Documentación funcional:** [Efeonce MCP Gateway](../../documentation/plataforma/efeonce-mcp-gateway.md)
> **Runbook técnico:** [Efeonce MCP Platform Runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md)

> **Compatibilidad externa 2026-09-07:** Codex, ChatGPT, Claude Code `2.1.263`, Claude.ai y Claude Desktop están
> certificados con el canary sintético. Sigue la
> [matriz/runbook externo](../../operations/runbooks/mcp-external-canary-certification.md); no uses una conexión
> visible como sustituto de login, dispatch, refresh y revoke.
> El cierre de TASK-1813 registró `efeonce-mcp` `1.2.0` 100 % Ready en `00047-8b5`: discovery nativo/base-only y shim retirado. El rollback
> `00047→00046→00047` y la matriz post-cutover completa quedaron verificados sin ampliar permisos.

> **Acceso interno multiorganización 2026-09-08:** TASK-1844 certificó una identidad con lectura SEO en v2,
> gateway `1.3.0`/`00050-wlk`. Para conectar Codex/Claude y elegir organizaciones sin repetir OAuth, sigue
> [el manual diario](../identity/usar-mcp-interno-multiorganizacion.md). El
> [runtime de cierre](../../audits/mcp/TASK-1844_FINAL_RUNTIME_2026-09-08.json) es evidencia fechada;
> verifica la revisión servida antes de una operación nueva.

## Antes de probar

Confirma que el cliente OAuth usa el resource `https://mcp.efeonce.org/mcp`. Las conexiones nuevas deben
descubrir Efeonce ID; Entra queda sólo para sesiones legacy ya gobernadas.
El piloto nativo requiere enrollment y grants personales vigentes; pertenecer al tenant no basta. No copies tokens en archivos, capturas ni tickets.

El cliente compatible con Streamable HTTP debe usar el endpoint canónico y obtener su token mediante OAuth PKCE.
No uses la URL `run.app`: el acceso público pasa por el front door y el hostname canónico.

## Verificación operativa

1. Abre `https://mcp.efeonce.org/health`: debe devolver estado saludable y confirmar OAuth configurado.
2. Consulta `https://mcp.efeonce.org/.well-known/oauth-protected-resource` y la variante `/mcp`. Desde `1.2.0`
   deben ser equivalentes, declarar sólo `https://auth.efeonce.org` y `efeonce.mcp.read`. Las rutas
   `/.well-known/oauth-authorization-server` y `/register` del gateway deben responder `404`.
3. Con un cliente OAuth autorizado, ejecuta el handshake que soporte su versión y relee `tools/list` serializado.
4. Si la autoridad del cliente incluye Globe, ejecuta `globe.capabilities.list` y luego `globe.producer.fleet.list` sin argumentos. No uses esas tools como prueba obligatoria del carril interno v2, limitado inicialmente a SEO.
5. Confirma que la respuesta contiene rutas, disponibilidad y correlation ID, pero no house, provider slug,
   costo de vendor ni margen.
6. Para el provider Greenhouse-SEO, sigue su manual dedicado:
   [Operar el provider Greenhouse-SEO del MCP](operar-provider-greenhouse-seo-mcp.md). Sus tools de lectura viven
   en el permiso base `efeonce.mcp.read` y las siete de escritura bajo `efeonce.mcp.seo.write`; se verifican con
   canaries distintos y tienen su propio interruptor de rollback.
7. Con una autoridad que permita manuales internos, ejecuta `get_greenhouse_skill` sin argumentos: debe devolver el catálogo de manuales de uso (seis al 2026-09-02,
   la cuenta exacta la fija `src/mcp/greenhouse/skill-manifest.ts` en Greenhouse). Con `{ "name": "seo-spend-discipline" }`
   debe volver el manual completo como texto, empezando por su frontmatter. Un catálogo vacío con la revisión
   correcta desplegada significa que el binding no es `internal` o que el provider está apagado — nunca "no hay manuales".
8. Cuenta `tools/list` y compáralo con `surface-baseline.json`; el snapshot del 2026-09-06 tenía 39 tools, pero
   la cifra y revisión vigentes se leen del servidor, no de este texto. Si difiere, compara además contra
   `surface-baseline.json` de
   `efeonce-mcp` **y** contra el manifiesto de Greenhouse antes de declarar drift: son dos fuentes distintas y las
   tools propias del gateway (identidad delegada, `get_seo_provider_spend`) sólo salen en la primera.
9. Verifica que lo desplegado sea lo mergeado. **El gateway no se despliega en push a `main`**: su workflow es
   `workflow_dispatch` puro, así que un merge sin dispatch deja la revisión vieja sirviendo, en verde y sin aviso.
   Comando de dispatch, verificación de `GATEWAY_BUILD_SHA` contra el HEAD de `main` y región correcta
   (`southamerica-west1`, no `us-east4`) en el runbook, §`Deploy del gateway — dispatch manual, nunca por push`.

Si aparece `Needs authentication`, distingue el emisor y el motivo antes de diagnosticar: puede haber
expiración, revocación, un flag apagado o pérdida de autoridad. Reinicia OAuth desde el cliente autorizado;
no reutilices un callback ni supongas que todo rechazo es un token Entra expirado.

Para una prueba release-controlada desde el repo `efeonce-mcp`, usa `pnpm oauth:canary`. En macOS abre Google
Chrome y debe ejecutarse con el perfil autenticado autorizado. Al terminar, cierra sólo la ventana de prueba; no
cierres la sesión compartida del perfil.

## Operación segura

- La superficie federada incluye siete escrituras SEO, además de las escrituras de Globe e identidad; la vista
  efectiva de cada cliente depende de issuer, scope, population, grant y flags. No habilites tools de runs, assets, review, delivery, créditos o writes
  como parte de una prueba de acceso.
- Los providers `greenhouse-skills` (manuales de uso, `get_greenhouse_skill`) y `greenhouse-identity` (invitaciones
  delegadas, `identity.invitations.list` / `identity.invitation.create`) **no tienen interruptor propio**: se
  prenden y se apagan con `GREENHOUSE_SEO_PROVIDER_ENABLED`, porque son la misma lane ecosystem y la misma
  identidad de servicio. Apagar el SEO apaga también los manuales y la identidad delegada, y eso es lo esperado —
  pero tenlo presente antes de usar ese interruptor como rollback "sólo de SEO".
- Mantén `concurrency=80`; resuelve `maxScale` en Cloud Run antes de operar (snapshot 2026-09-07: `20`) y no lo
  cambies sin una decisión explícita de capacidad.
- Ante una falla de un provider, conserva OAuth y el gateway; deshabilita sólo ese provider y redespliega
  siguiendo el runbook (`GLOBE_PROVIDER_ENABLED=false` o `GREENHOUSE_SEO_PROVIDER_ENABLED=false`, según el caso).
  El rollback de revisión no se sustituye con acceso anónimo.
- Ante una regresión de discovery `1.2.0`, restaura 100 % del tráfico a la revisión capturada antes del deploy.
  No agregues `OAUTH_PUBLIC_CLIENT_ID`: el código nuevo la ignora y reintroducir el shim exige otra decisión.
- Los secretos del gateway van todos en la **misma** bandera `--set-secrets` del `deploy.yml`: esa bandera es
  destructiva y reemplaza el conjunto completo. Un secreto aplicado fuera del workflow desaparece en el próximo
  deploy, en silencio.
- No demuestres errores retirando IAM o forzando timeout en producción. Usa las pruebas automatizadas o un canary
  aislado.

## Antes de clientes externos

El entitlement por tenant/capability YA existe: el grant revocable por organización y por persona vive en
`greenhouse_core.external_capability_grants` (TASK-1631, 2026-09-04) y se opera con el manual
`docs/manual-de-uso/identity/operar-binding-identidad-externa.md` (environment → binding de la organización →
grants → invitación → persona ligada por `subject`); el gateway lo consulta por
`GET /api/platform/ecosystem/identity/binding`. El emisor propio y el gateway multi-issuer están construidos; el
canary sintético externo completó la matriz técnica base-only y confirmó que las tools fuera de su authority no
cruzan. No entregues acceso general a clientes: la primera organización consentida tiene su task, grant y
observación propios.

Cuando revises scopes, el PRM de `1.2.0` tiene una cifra deliberadamente fija: sólo `efeonce.mcp.read`. Los scopes
de dominio o escritura aparecen de forma incremental en el challenge `403` de una tool y nunca se infieren por
estar habilitados en el servidor. En modo legacy-only, el challenge los cualifica para Entra; con Efeonce ID son
bare. Ninguna de esas formas sustituye capabilities, grants o autoridad downstream.


## Verificar el carril interno multiorganización v2

TASK-1844 requiere `efeonce.organizations.list`, `organizationId` explícito en cada lectura y autoridad actual
sobre todos los espacios activos del objetivo. El [runbook multiorganización](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md)
gobierna los tres gates v2, el enrollment de la cohorte, la certificación A/B/C y el rollback compatible con
las migraciones aplicadas. El cambio de organizaciones elegibles no exige renovar consentimiento; cambiar
una conexión v1 a v2 sí lo exige una vez por cliente. La certificación inicial y sus fixtures retiradas se
reutilizan como evidencia, no se repiten sobre organizaciones cliente para llenar una checklist.

## Verificar el carril corporativo nativo

Inicia la conexión desde la app para conservar su contexto OAuth. Abrir `/login` e iniciar Microsoft
crea una sesión; no concede acceso a esa app. Verifica emisión, una lectura autorizada, otra organización
denegada con lectura propia antes/después, refresh y revocación de familia con token aún vigente. El reader
revalida contexto, `gv` y `jti`; el objetivo local de denegación tras revocar es ≤60 s. No pruebes sólo 401
anónimos ni uses el canary Entra como evidencia del grant nativo.

Los gates `AUTH_SERVER_INTERNAL_AUTH_ENABLED` y `MCP_NATIVE_INTERNAL_AUTH_ENABLED` son independientes.
El rollback se ejecuta según el [runbook interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md),
con readback y restauración; no apagues providers ajenos ni amplíes permisos para obtener un resultado verde.
Consulta [el mapa consolidado](../../audits/2026-09-06-task-1836-1831-consolidated-evidence.md) para separar
pruebas ejecutadas y pendientes, revisión publicada y promoción formal.
