# B10 — lector real de autoridad externa en Auth local

Resultado **PASS sólo local**, 28-10-2026. El harness de Auth añadió
`--mcp-authority` (requiere `--mcp-pg`) para llamar a
`createExternalAccessGrantsPort()` y, por tanto, a `resolveExternalAccess()`
contra PostgreSQL desechable. La base contiene una organización, binding
`customer`, invitación ligada y grant de lectura **sintéticos**. La proyección SQL
contiene sólo las columnas consultadas por el reader; no sustituye las
migraciones de producción ni sus constraints/triggers completos.

Comando: `python3 scripts/qa/verify-auth-first-party-local-pg.py --mcp-smoke
--mcp-pg --mcp-authority --port 19446`. El code/token Rooms se completó sin
crear consentimiento MCP. Read exigió consentimiento explícito, write exigió
step-up y el JWT ES256 sólo contenía `efeonce.mcp.read` con `gv=7`, leído del
binding. Tras revocar el binding y subir `grants_version` a 8, una nueva
autorización read devolvió `access_denied`; el log de resolución registró
`revoked`. Código MCP repetido devolvió `invalid_grant`. No hubo correo ni
tráfico externo; servidor y base temporal se eliminaron al terminar.

La variante `--mcp-smoke --mcp-pg --port 19447` también PASS para asegurar que
el modo previo sigue funcionando. TypeScript, ESLint focal y `git diff --check`
PASS. La presentación de consentimiento sigue siendo un fixture local; el test
no pasó por navegador Rooms ni por el binding reader del gateway;
la prueba Auth→gateway anterior usó `grantsPort` y binding sintéticos. Quedan
pendientes un recorrido cruzado con ambos readers reales, contexto
multiorganización, HTTPS/TLS, staging, MFA humana y observación productiva.
No altera la retención de release ni la clasificación parcial de TASK-1833.
