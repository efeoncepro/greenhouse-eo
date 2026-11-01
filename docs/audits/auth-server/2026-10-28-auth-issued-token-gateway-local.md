# B10 — token emitido por Auth hasta el gateway MCP local

Prueba de integración **PASS sólo local** el 28-10-2026. Fuentes: Auth
`codex/auth-develop-integration-local@d379f1d1e` y gateway
`codex/auth-gateway-assurance@69423e1`. El probe manual reproducible vive en
`efeonce-mcp/scripts/auth-rooms-gateway-local.mjs`; no se modificó runtime productivo.

## Recorrido y resultado

1. Issuer Auth de QA con `--serve --mcp-pg`, PostgreSQL efímero y cliente Rooms/MCP sintético.
   Code/token first-party de Rooms no concede MCP. Consentimiento read explícito genera un código
   MCP, canjeado por un JWT ES256 con `efeonce.mcp.read`.
2. El probe obtiene JWKS del issuer local y pasa ese **token emitido por Auth** al verificador JWT
   y a la ruta HTTP `/mcp` del gateway construido. El binding y proveedor son fixtures de canary
   externo; no reciben el bearer de la persona.
3. `get_seo_entitlement` devuelve HTTP 200 y despacha exactamente una lectura al proveedor
   sintético. `track_seo_keywords` devuelve HTTP 403 por `insufficient_scope` y cero writes.
   Al negar el binding, la misma lectura devuelve HTTP 401 sin segundo dispatch.

El comando `node scripts/auth-rooms-gateway-local.mjs <ruta-privada-del-fixture>` pasó dos veces;
la segunda fue después de formatear y commitear el probe. `pnpm check` del gateway pasó: formato,
TypeScript, **240 tests** y build. El issuer temporal y PostgreSQL se detuvieron y eliminaron;
puerto19441 libre. No se imprimieron JWT, códigos, cookies ni secretos; la salida sólo contiene
status, nombre de tool, razón fija de deny y requestId aleatorio. Sin correo, push, merge,
deploy, flags ni nuevo canary.

## Límites

El issuer de QA corre en HTTP loopback. El probe usa `readConfig` con un issuer HTTPS sintético y
después sustituye sólo en memoria el issuer por `http://127.0.0.1:19441` para aceptar su JWT;
la clave se fija a la JWKS leída del mismo fixture. **No** acredita TLS, la validación de
configuración HTTPS real ni descubrimiento productivo. El binding reader y el proveedor son
sintéticos: no acredita autoridad Greenhouse real, revocación desde su ledger, contexto
multiorganización completo, MFA humana, staging o producción. El `grantsPort` del issuer también
es bound sintético. B15/B20, TASK-1833 y el release siguen abiertos.
