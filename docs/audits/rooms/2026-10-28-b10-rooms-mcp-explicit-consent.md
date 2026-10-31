# Rooms B10 — misma sesión, consentimiento MCP explícito

Prueba local del 28 de octubre de 2026: **PASS, 16 comprobaciones MCP y ocho grupos de controles
existentes de Rooms**. ESLint y TypeScript PASS. [Recibo saneado](2026-10-28-b10-rooms-mcp-explicit-consent.json).
Runtime Rooms `codex/rooms-design-integration@e0edf1e`; las fuentes del issuer probadas tienen hashes
idénticos a `codex/auth-develop-integration-local@1136ac273` (commit Auth creado durante la ejecución).

## Recorrido verificado

El arnés `scripts/auth-integration.ts --mcp-consent` entra en Rooms con una cookie real del issuer,
respaldada por PostgreSQL, y comprueba el acceso al contenido mediante el consumer canónico. Antes
del logout/revocación abre pestañas MCP en **el mismo BrowserContext**: no llama otra vez a `login()`,
no renueva la cookie del issuer ni la de Rooms. Al terminar compara sus valores en memoria y verifica
que el lector Rooms sigue autorizado.

1. Cliente MCP público sintético nuevo, sin consentimiento inicial: authorize read muestra el formulario
   real; no llega código al callback. `prompt=none` devuelve `consent_required`, con state/iss correctos.
2. Write antes de aprobar read devuelve 403 y enlace de step-up; ningún callback ni código.
3. Un click del navegador en Autorizar acceso aprueba únicamente read. El callback registrado recibe
   un solo código, con state e issuer válidos.
4. Canje real por HTTP con PKCE S256: token Bearer y scope exactamente `efeonce.mcp.read`.
   `jwtVerify` valida ES256 con JWKS local y exige issuer/audience; el token conserva el mismo subject
   y está ligado al cliente MCP mediante azp/client_id. El replay del código devuelve invalid_grant.
5. Write sigue exigiendo step-up después de aprobar read y no produce otro código.
6. Continúan pasando selección explícita de contexto, aislamiento por organización/rol, lecturas,
   logout y revocación del issuer del arnés previo.

El callback `/__b10/mcp-callback` existe sólo en el servidor de QA, sirve texto constante y no refleja
códigos ni parámetros. El recibo guarda nombres de controles, nunca cookies, JWT, códigos, links de
callback o credenciales. No hay storageState persistido, trazas ni video.

## Reproducción

Con PG Rooms local55432 y sus migraciones al día, ejecutar desde entornos con allowlist de tooling,
sin credenciales cloud/proveedor ni variables Vercel:

- Auth: `python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --port 19334 --redirect-uri http://127.0.0.1:19335/auth/callback`.
- Rooms: `pnpm auth:integration --issuer-fixture <ruta-absoluta-privada-del-issuer> --mcp-consent`.

El fixture exige mcpClientId/mcpRedirectUri/mcpAudience exactos para este modo. Sin el flag se conserva
el recorrido anterior y compatibilidad con el fixture first-party. La opción es local, no una ruta productiva.
Se verificó `pnpm typecheck` y ESLint del archivo; no se repitió la suite general por este cambio de QA.
Los servidores19334/19335 y el PG55432 arrancados para la prueba se detuvieron; la base Auth temporal
fue eliminada. El arnés revoca sus bindings/sesiones propios de Rooms, sin cambiar roles ni flags globales.

## Alcance y pendientes

Identidad/sesión Auth y autoridad/persistencia Rooms usan PostgreSQL real local. El router OAuth MCP
es real; sus consentimientos/códigos/grants viven en **InMemoryOAuthStore** y el grantsPort bound es
sintético. No acredita persistencia MCP PostgreSQL, dispatch del gateway, segundo factor humano,
Microsoft/MFA, despliegue o conformidad productiva completa. Se probó el bloqueo de write por step-up
en authorize, no ejecución de una herramienta write. No convierte B15/B20 en completas.

Reafirma el [ADR de entrada y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md)
y no cambia callbacks, claims ni DTO productivos del consumer Rooms. Sin correo real, push, merge,
deploy, flags ni nuevo canary. La interfaz nueva sigue pendiente de entrega/aceptación de Claude Design.
