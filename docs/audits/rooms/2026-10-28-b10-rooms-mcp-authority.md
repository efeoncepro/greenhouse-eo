# B10 browser — lector real de autoridad en PostgreSQL efímero

**PASS: 16 comprobaciones MCP y ocho grupos Rooms**, 28 de octubre de 2026.
Fuentes Rooms intactas en `codex/rooms-design-integration@e0edf1e`; issuer arrancado desde Auth
`codex/auth-develop-integration-local@8d027f747`. [Recibo saneado](2026-10-28-b10-rooms-mcp-authority.json).

## Qué se ejecutó

Issuer: `python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --mcp-pg --mcp-authority --port 19334 --redirect-uri http://127.0.0.1:19335/auth/callback`.
Rooms: `pnpm auth:integration --issuer-fixture <ruta-absoluta-privada> --mcp-consent`.

Las bases Auth y Rooms fueron desechables, con datos sintéticos. El cluster Rooms temporal usó
PostgreSQL18, roles runtime/migrator propios sin privilegios altos, puerto dinámico y ocho migraciones.
Sólo se heredó una allowlist de tooling; credenciales efímeras por entorno, sin tocar dotenv ni el
config local habitual. Los hashes de las fuentes de arranque y de la proyección están en el recibo.

Mismo BrowserContext y cookies issuer/Rooms sin renovar entre login Rooms y MCP: read exige
consentimiento explícito, silent read devuelve consent_required y write exige step-up antes/después.
El click explícito produce un código MCP de un uso; canje real, JWT ES256 verificado con JWKS,
issuer/audience/client/subject correctos y scope sólo read. El replay devuelve invalid_grant.
También pasan contexto único/múltiple, aislamiento por rol/organización, logout y revocación del issuer.

`createExternalAccessGrantsPort()` ejecutó el reader real `resolveExternalAccess()` contra la
proyección PostgreSQL de organización/binding customer, membresía y capability **sintéticos**.
Readback SQL independiente antes de retirar Auth:

- Un binding activo con versión7 y una membresía linked.
- Un consentimiento read; un código consumido con `grants_version=7`.
- Un access token y un refresh token persistidos con scopes exactamente read.
- Cero filas de denegación en external_access_resolution_log: el reader registra sólo outcomes
  distintos de bound, según su contrato; no se esperan filas de éxito.

Esta prueba no añade una aserción del claim gv en el JWT: el arnés preservado verifica firma,
subject/client/audience/scope; la versión7 se verifica aquí en SQL del código. El smoke separado de
Auth contiene su propia aserción JWT gv y revocación de binding; no se atribuye a este browser run.

## Límites y cierre

El reader y store OAuth son reales; datos, presentación de consentimiento y SQL de autoridad/contexto
son fixtures. La proyección no sustituye migraciones/constraints/triggers productivos ni prueba el
contexto multiorganización completo. No se repitió revocación de binding desde el navegador: el
arnés revoca la sesión issuer. Sin dispatch gateway ni reader de binding del gateway en este recorrido,
sin MFA humana/Microsoft, HTTPS/TLS, staging ni producción. B15/B20 y rollout no cambian de estado.

El rótulo de memoria/grants sintéticos que imprime el script Rooms es estático y corresponde al
[ensayo anterior](2026-10-28-b10-rooms-mcp-explicit-consent.md). Se conserva literalmente en el JSON,
separado del modo real acreditado por fuentes/flags y SQL; no se cambió el script para relabelarlo.
Amplía el [ensayo MCP PostgreSQL previo](2026-10-28-b10-rooms-mcp-postgres.md).

Ambas bases temporales detenidas y eliminadas; puertos19334/19335/49443 libres, PG habitual55432
sigue detenido y checkout Rooms limpio. Sin correo, push, merge, deploy, flags productivos ni canary.
No se repitió lint/types/full suite porque no cambiaron fuentes Rooms. UI de Claude Design pendiente.
Reafirma el [ADR de entrada y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md),
sin alterar el contrato productivo del consumer.
