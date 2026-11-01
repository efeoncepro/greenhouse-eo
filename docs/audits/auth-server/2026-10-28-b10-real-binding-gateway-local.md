# B10 — token Auth y binding real hasta gateway local

Resultado **PASS sólo local**, 28-10-2026. Fuentes: Auth
`codex/auth-develop-integration-local@f341c1699` y gateway
`codex/auth-gateway-assurance@9fb877b`. El harness Auth expone un adapter
`/__fixture/binding` en loopback que invoca la **ruta ecosystem real**
`GET /api/platform/ecosystem/identity/binding`, incluido
`runEcosystemReadRoute()`, sobre PostgreSQL desechable. Consumidor de máquina,
binding sister-platform y clave aleatoria con hash en la base son fixtures
efímeros; la clave sólo figura en el archivo privado `0600`. La ruta llega al
reader real `resolveExternalAccess()`. El gateway conserva
`createNativeBindingResolver()` y su URL canónica; el transporte inyectado del
probe mapea únicamente esa URL al adapter loopback. No viaja el bearer de la
persona ni su cookie al reader.

Con `--serve --mcp-pg --mcp-authority --port 19454`, Rooms obtuvo code/token
first-party sin consentimiento MCP. El consentimiento read explícito emitió un
JWT ES256 con `gv=7` desde el binding local. El gateway validó ese JWT, consultó
el binding por su resolver canónico y permitió `efeonce.gateway.status` (HTTP
200). La ruta ecosystem respondió 401 sin credencial de máquina y 404 para una
referencia de plataforma sin binding. `track_seo_keywords` quedó en HTTP 403 por `insufficient_scope` y cero
writes. Tras revocar el binding local y subir su versión, el mismo token recibió
HTTP 401 antes de cualquier dispatch. El probe previo sin `--mcp-authority`
también PASS: lectura `get_seo_entitlement` 200 con un dispatch sintético,
write 403 y binding negado 401. `pnpm check` gateway: formato, TypeScript,
240 tests y build PASS. Auth smoke nuevo, TypeScript y ESLint focal PASS.
Servidor, PostgreSQL y puerto de prueba se cerraron/eliminaron.

Rooms repitió por separado el navegador B10 contra Auth `8d027f747` con
`--mcp-authority`: 16 checks MCP y ocho grupos Rooms PASS; readback SQL confirmó
binding versión 7, código consumido y access/refresh tokens sólo read. Recibo
en `develop@99bc21be0`,
`docs/audits/rooms/2026-10-28-b10-rooms-mcp-authority.md`. No se atribuye la
revocación de binding ni el dispatch gateway a esa corrida de navegador.

**Límites:** organización, binding, consumidor y grant de la base son sintéticos
y su esquema es una proyección local. Se ejecutó el código de la ruta ecosystem,
pero no su despliegue Vercel, protección de red ni credencial cloud. La configuración HTTPS
se sustituyó sólo en memoria para el issuer HTTP loopback. La policy actual
reserva `get_seo_entitlement` a `canary`, por eso el recorrido con reader real
usó `efeonce.gateway.status` y no probó dispatch de proveedor. La prueba de
dispatch anterior usó binding sintético. Tampoco acredita contexto
multiorganización, staging, MFA humana ni producción.
No hubo push, merge, deploy, flags, correo ni nuevo canary productivo; la
retención de release permanece.
