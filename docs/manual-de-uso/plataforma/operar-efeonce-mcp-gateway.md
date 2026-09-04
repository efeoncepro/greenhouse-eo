# Operar Efeonce MCP Gateway

> **Tipo de documento:** Manual de uso / runbook breve
> **Endpoint canónico:** `https://mcp.efeonce.org/mcp`
> **Documentación funcional:** [Efeonce MCP Gateway](../../documentation/plataforma/efeonce-mcp-gateway.md)
> **Runbook técnico:** [Efeonce MCP Platform Runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md)

## Antes de probar

Confirma que el cliente OAuth está registrado para el resource `https://mcp.efeonce.org/mcp` y que su usuario
pertenece al tenant interno autorizado. No copies tokens en archivos, capturas ni tickets.

El cliente compatible con Streamable HTTP debe usar el endpoint canónico y obtener su token mediante OAuth PKCE.
No uses la URL `run.app`: el acceso público pasa por el front door y el hostname canónico.

## Verificación operativa

1. Abre `https://mcp.efeonce.org/health`: debe devolver estado saludable y confirmar OAuth configurado.
2. Consulta `https://mcp.efeonce.org/.well-known/oauth-protected-resource`: debe declarar el resource y los
   scopes soportados.
3. Con un cliente OAuth autorizado, ejecuta `initialize`.
4. Ejecuta `globe.capabilities.list` y luego `globe.producer.fleet.list` sin argumentos.
5. Confirma que la respuesta contiene rutas, disponibilidad y correlation ID, pero no house, provider slug,
   costo de vendor ni margen.
6. Para el provider Greenhouse-SEO, sigue su manual dedicado:
   [Operar el provider Greenhouse-SEO del MCP](operar-provider-greenhouse-seo-mcp.md). Sus tools de lectura viven en el permiso base `efeonce.mcp.read` y las 7 de escritura bajo `efeonce.mcp.seo.write`; el permiso base, se verifican con dos canaries distintos y tienen su propio interruptor de rollback.
7. Ejecuta `get_greenhouse_skill` sin argumentos: debe devolver el catálogo de manuales de uso (seis al 2026-09-02,
   la cuenta exacta la fija `src/mcp/greenhouse/skill-manifest.ts` en Greenhouse). Con `{ "name": "seo-spend-discipline" }`
   debe volver el manual completo como texto, empezando por su frontmatter. Un catálogo vacío con la revisión
   correcta desplegada significa que el binding no es `internal` o que el provider está apagado — nunca "no hay manuales".
8. Cuenta `tools/list`: **36 tools federadas al 2026-09-02** (28 del provider SEO + `get_greenhouse_skill` + las nativas
   de gateway, Globe y hiring), revisión activa `efeonce-mcp-gateway-00028-pmx`. La cifra se lee del server, no de
   este texto; si difiere, compara contra el manifiesto de Greenhouse antes de declarar drift.

Si tu cliente MCP muestra el server como `Needs authentication` después de haber funcionado, el token Entra expiró
(~1 hora): vuelve a autenticar (`claude mcp login efeonce-mcp` en Claude Code) y repite. No es una falla del gateway.

Para una prueba release-controlada desde el repo `efeonce-mcp`, usa `pnpm oauth:canary`. En macOS abre Google
Chrome y debe ejecutarse con el perfil autenticado autorizado. Al terminar, cierra sólo la ventana de prueba; no
cierres la sesión compartida del perfil.

## Operación segura

- La capacidad actual es lectura interna más 7 escrituras federadas y fail-closed por scope. No habilites tools de runs, assets, review, delivery, créditos o writes
  como parte de una prueba de acceso.
- El provider `greenhouse-skills` (manuales de uso, `get_greenhouse_skill`) **no tiene interruptor propio**: se prende y se
  apaga con `GREENHOUSE_SEO_PROVIDER_ENABLED`, porque es la misma lane ecosystem y la misma identidad de servicio.
  Apagar el SEO apaga también los manuales (responden `policy_blocked`), y eso es lo esperado.
- Mantén Cloud Run en `concurrency=80` y `maxScale=5` mientras no haya una decisión explícita de capacidad.
- Ante una falla de un provider, conserva OAuth y el gateway; deshabilita sólo ese provider y redespliega
  siguiendo el runbook (`GLOBE_PROVIDER_ENABLED=false` o `GREENHOUSE_SEO_PROVIDER_ENABLED=false`, según el caso).
  El rollback de revisión no se sustituye con acceso anónimo.
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
`GET /api/platform/ecosystem/identity/binding`. Lo que todavía falta —y es la compuerta real— es el emisor propio
y el gateway multi-issuer (EPIC-044: TASK-1829/1830/1831/1832), más una prueba real de persona base-only denegada
para Globe. No entregues este endpoint a clientes hasta que eso exista. Al cliente interno actual se le entregan
hoy el scope base y el de lectura de Globe incluso si solicita sólo el base; por eso no prueba esa separación.

Cuando revises los scopes soportados en el paso 2 de la verificación, ten presente que el gateway declara tres, no
dos: el base, el de lectura de Globe y el de escritura interna de fondeo de créditos, que aparece sólo cuando su
flag está encendido. Ese tercero se autoriza por separado y no queda demostrado por la entrega conjunta de los dos
primeros; no lo uses como evidencia de nada.
