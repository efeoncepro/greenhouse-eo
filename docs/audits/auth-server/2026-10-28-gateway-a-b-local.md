# TASK-1833 / TASK-1831 — regresiones A/B del gateway, sólo local

Fecha: 28-10-2026. Repo hermano `efeonce-mcp`, worktree aislado basado en `origin/main`
`454d80e`, rama `codex/auth-gateway-assurance`, commits locales `a7e1556` y `9c76c88`.
No push ni deploy.

`test/auth-assurance-1831.test.ts` recorre JWT firmados localmente → verificador multi-issuer
real → `AuthInfo` → registro y callback reales del SDK MCP, con reader de binding sintético.

| Caso | Estímulo | Resultado local |
|---|---|---|
| (a) población externa | Token Efeonce ID válido con `efeonce.mcp.read` y string `efeonce.mcp.seo.write`; binding externo de cliente con capability de escritura | `track_seo_keywords` deshabilitada en listado y callback devuelve sólo `authorization_denied`; cero dispatch. `identity.invitations.list` sí despacha como control positivo. En HTTP loopback, la tool queda disabled con error MCP `-32602` y HTTP 200; `efeonce.gateway.status` sí funciona. |
| (b) rol Entra | Token Entra válido con `roles=['efeonce.mcp.seo.write']` y sólo `scp=efeonce.mcp.read` | `track_seo_keywords` deshabilitada y callback denegado; cero dispatch. Con `scp` delegado de escritura, sí despacha como control positivo. En HTTP loopback, el token roles-only recibe 403 `insufficient_scope`. |

`src/app.ts` emite `mcp_tool_authorization_denied` al intentar llamar una tool conocida
con scope insuficiente, issuer o población denegados. El evento contiene sólo `severity`,
`event`, nombre canónico de tool, razón fija y clase de issuer. No registra bearer, sujeto,
organización, argumentos ni request ID aportado por el cliente. Una falla del sink no altera
el rechazo. El evento se probó en las dos llamadas HTTP negativas; no se ha observado en
logs productivos ni registrado como señal de control plane en steady.

Comando focal: `pnpm exec tsx --test test/auth-assurance-1831.test.ts` → 3 PASS, incluido
servidor HTTP real en `127.0.0.1` con JWT firmados. Gate obligatorio del repo hermano:
`pnpm check` → formato, TypeScript, 240 pruebas y build PASS. `docker --context colima build`
PASS con imagen local `efeonce-mcp:auth-assurance-local`; smoke del contenedor con configuración
sintética: `/health` 200 (`oauthConfigured=true`) y `POST /mcp` sin bearer 401
`authorization_required`. El contenedor se eliminó y Colima se detuvo tras la prueba.

Revisión de seguridad del diff local `454d80e..9c76c88`: scan Codex Security
`341580e0-3c80-4580-a2e5-978bd25d2db3` completado el 29-10 UTC con **0 hallazgos
reportables**. El inventario automático incluyó `src/app.ts`; se revisó además manualmente
`test/auth-assurance-1831.test.ts` y el código de verificador, policy y guard de llamada que
explica el cambio. El workbench conserva `report.md`, SARIF y el modelo bajo ese scan ID.
El scan cubre sólo esos dos archivos cambiados y sus dependencias directas, no el producto entero.

Esta evidencia cubre el rechazo y señal redactada locales de los dos ataques, incluido HTTP
loopback, y la separación del verificador/policy. No demuestra el conjunto de requisitos de
TASK-1831, staging, un canary productivo ni assurance completo de TASK-1833. Los commits del
gateway deben integrarse y pasar CI remoto antes de atribuir esta regresión a una revisión publicada.
