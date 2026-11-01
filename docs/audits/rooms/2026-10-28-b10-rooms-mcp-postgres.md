# B10 Rooms → MCP con PostgreSQL efímero

**PASS: 16 comprobaciones MCP y ocho grupos de controles Rooms**, con fuentes Rooms intactas en
`codex/rooms-design-integration@e0edf1e`. [Recibo saneado y readback SQL](2026-10-28-b10-rooms-mcp-postgres.json).
Amplía el [ensayo previo con store MCP en memoria](2026-10-28-b10-rooms-mcp-explicit-consent.md).

## Ejecución y evidencia

Se repitió `pnpm auth:integration --issuer-fixture <ruta-privada> --mcp-consent` contra el issuer de
`/Users/jreye/.codex/worktrees/auth-develop-integration/greenhouse-eo`, arrancado con:

```sh
python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --mcp-pg --port 19334 --redirect-uri http://127.0.0.1:19335/auth/callback
```

El recibo final usa **ambas bases desechables**: PostgreSQL Auth del runner temporal y un cluster
PostgreSQL18 de Rooms creado en un directorio temporal/puerto dinámico, con roles runtime/migrator
sin privilegios altos y ocho migraciones aplicadas. Las URLs de conexión sólo se pasaron por entorno
con allowlist de tooling; no se modificó `.local/db-config.json` ni se copiaron secretos de producción.
Una primera comprobación usó PG habitual de Rooms; fue reemplazada como evidencia final por esta
repetición completamente efímera. El PG habitual55432 permanece detenido.

El mismo BrowserContext conserva las cookies issuer/Rooms sin renovarlas. Read pide consentimiento
explícito, write exige step-up antes/después, el código aprobado se canjea y su replay falla. Se verifica
la firma ES256/JWKS y el binding subject/client/audience del token, limitado a read.

Readback SQL independiente, antes de retirar Auth, encontró exclusivamente para el cliente sintético:

- Un consentimiento activo, scope `efeonce.mcp.read`.
- Un código de autorización, ya consumido.
- Un access token y un refresh token, ambos con scopes exactamente de lectura.

El store es **PostgresOAuthStore real**. El script Rooms preservado emite todavía una descripción fija
que dice memoria: el JSON conserva esa frase como `harnessStaticLimitation`, separada del backend
comprobado por flags de arranque, fuentes y SQL. No se interpreta ese texto heredado como modo real.
El issuer era WIP sobre Auth `2284bb66e`, con hashes de ambos scripts registrados antes/después;
no se atribuye el cambio no commiteado a ese SHA base. No se cambiaron fuentes desde esta sesión.

## Límites y cierre

El grantsPort sigue siendo bound sintético. La fixture aplica el DDL OAuth real más una proyección
mínima de columnas de contexto para el camino NULL; no prueba la migración TASK-1836 completa ni
el contexto multiorganización. No acredita dispatch gateway, MFA humana/Microsoft o producción.
Tampoco cambia el estado parcial de B15/B20 ni la espera de entrega/aceptación de Claude Design.

Ambos clusters temporales detenidos y directorios retirados; puertos issuer19334, Rooms19335 y PG
Rooms temporal libres. Datos sintéticos, sin correo, push, merge, deploy, flags ni otro canary. No se
repitieron lint/types/suite porque las fuentes Rooms permanecieron idénticas al ensayo previo.
Se reafirma el [ADR de entrada y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md),
sin cambio del contrato productivo de Rooms.
