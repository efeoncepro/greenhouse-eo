# Aislamiento RP — tres casos focales de persistencia Rooms

**PASS: 3 pruebas, 0 fallos, 0 omisiones**, ejecutadas el 28 de octubre de 2026 sobre
`codex/rooms-design-integration@e0edf1e`, sin modificar fuentes. [Recibo saneado](2026-10-28-cross-rp-persistence-focal.json).

Se aplicaron ocho migraciones en PostgreSQL18 temporal, puerto loopback dinámico y roles dedicados
runtime/migrator sin privilegios altos. Entorno con allowlist de tooling y URLs efímeras; sin dotenv ni
credenciales cloud. El cluster y su directorio se retiraron, puerto libre y checkout Rooms limpio.
La base habitual de Rooms no fue arrancada en esta ejecución.

## Casos existentes ejecutados

1. `auth sessions bind verified identity to existing authority and persist only opaque hashes and encrypted secrets`:
   una sesión válida sigue resolviéndose tras reabrir pools, pero `createAuthService` con otro clientId
   rechaza esa cookie. Incluye la comprobación de hashes/secrets cifrados de ese caso.
2. `auth state and browser binding reject substitution and parallel callbacks consume one transaction only`:
   callback con otro clientId devuelve invalid_transaction; state/cookie sustituidos también se rechazan
   y callbacks paralelos consumen una sola transacción.
3. `invitation guest cookies cannot cross RP, issuer or origin, and trusted runtime OFF denies asserted guest authority`:
   la cookie guest no sirve con otro clientId, issuer u origin; logout del otro RP no revoca la sesión
   original. También se verifica denegación por autoridad/runtime local OFF.

Archivos: `tests/auth-persistence.test.ts` y `tests/invitation-persistence.test.ts`. Comando, con las
variables de conexión al cluster efímero sólo en el entorno del proceso:

```sh
node --conditions=react-server --import tsx --test --test-reporter=tap --test-name-pattern='^(auth sessions bind verified identity|auth state and browser binding|invitation guest cookies cannot cross RP)' tests/auth-persistence.test.ts tests/invitation-persistence.test.ts
```

El filtro ejecutó exactamente tres pruebas, sin omisiones por DB ni por nombre en el reporte Node.
No se repitieron full suite, B10/B18 browser, canary ni correo. No hay commit nuevo en Rooms; sólo
se registra esta evidencia en Greenhouse. Sin push, merge, deploy ni flags productivos.

## Alcance honesto

Es evidencia de **servicios/persistencia** con issuer HTTP sintético de los fixtures existentes y
PostgreSQL real local. No prueba cookies entre dos productos first-party desplegados, dos origins
HTTPS reales, aceptación cruzada de tokens ante un segundo runtime ni el recorrido browser de dos RP.
El criterio integral de dos RP permanece abierto. Amplía la evidencia de [B18](2026-10-28-b18-guest-without-internal-sso.md)
y [B10](2026-10-28-b10-rooms-mcp-authority.md) sin reclasificarlas. La nueva UI sigue pendiente de Claude Design.
Contrato dueño: [entrada RP, sesiones y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md).
