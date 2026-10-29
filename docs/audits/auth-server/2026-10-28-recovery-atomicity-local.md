# TASK-1833 — atomicidad de revocación de persona (2026-10-28)

**Estado: fix local verificado; staging y release pendientes.** Prueba propia sobre PostgreSQL 16
desechable en `127.0.0.1`, con sujetos sintéticos y sin credenciales cloud ni correo. El primer
fixture reducido reprodujo el defecto. El retest ampliado aplica las tres migraciones reales
TASK-1830 de sesiones, passkeys y TOTP; sólo la tabla de source links de `greenhouse_core` es stub.

## Hallazgo y refutación

`revokePersonAuthState` revocaba sesiones, passkeys y TOTP en operaciones separadas y escribía el
intento auditado al final. Una falla del INSERT de audit devolvía error **después** de modificar los
factores. La reproducción inyectó una excepción en `person_auth_attempts`: el test que exigía rollback
falló porque la sesión ya tenía `revoked_at`. Esto dejaba un resultado parcial y sin evento de éxito;
el retry idempotente podía registrar sólo contadores cero. Es un defecto confirmado de consistencia
operacional en la ruta de recuperación, no evidencia de acceso indebido por sí sola.

El fix agrega al port de persona una operación compuesta. En PostgreSQL, tres UPDATE acotados por
`environment_id` y `subject` y el INSERT auditado comparten `withTransaction`; cualquier error hace
ROLLBACK. El store en memoria mantiene la misma semántica para pruebas. No cambia la API pública ni
la forma de cookies, tokens o autoridad de Rooms. El contrato de identidad sigue bajo
[Efeonce Auth Server OAuth](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md) y la decisión
[Rooms primero](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md); este fix no
introduce una frontera de arquitectura nueva.

## Retest

```sh
scripts/auth-server/recovery-postgres-local-smoke.sh
pnpm exec vitest run src/lib/auth-server --reporter=dot
```

- PostgreSQL local: **2 PASS**. Dos sesiones, dos passkeys y TOTP del objetivo revocados; sujeto y
  environment de control intactos. Segunda llamada devuelve contadores cero y registra intento sin
  subject crudo. Al forzar falla de audit, los tres tipos quedan sin revocar tras ROLLBACK. El test
  conecta como `greenhouse_app`, el rol de runtime, y usa los GRANTs de las migraciones reales. La
  única inyección de fallo es un CHECK local añadido por el administrador del cluster desechable.
- Suite Auth sin la variable de PostgreSQL: **708 PASS/20 skip** (el test SQL queda omitido por
  defecto); `person-auth-flow.test.ts` 48 PASS. ESLint focal, TypeScript, `worker:deploy-path-gate` y
  `worker:build-contract-gate` PASS.
- El runner elimina la base al salir. La URL de prueba debe apuntar a `127.0.0.1/auth_revoke_local`;
  no usa perfiles ni secretos de Greenhouse. La prueba rechaza parámetros de conexión, credenciales
  en la URL y destinos distintos; `?host=example.com` produjo el rechazo esperado antes de conectar.
- Codex Security diff scan `0bfb2ab0-46fe-49b3-9a63-7ab64da81a9f` del fix inicial: seis archivos
  de código revisados, cobertura completa de aquel diff y cero hallazgos reportables. El retest con
  migraciones reales es posterior a ese snapshot. El reporte queda en el estado local de Codex
  Security, fuera del repo; la revisión fue ejecutada por el mismo agente, sin revisión independiente.

**Límite:** esta prueba cubre el command de credenciales de persona, su store SQL y las tres migraciones
Auth pertinentes, pero usa un core stub y no ejecuta en una
sola transacción la revocación de binding externo, consentimientos OAuth y sesiones de Rooms. El
simulacro integral en staging, la revisión independiente del fix, CI remoto y readback productivo
siguen pendientes. El criterio de runbooks ensayados en TASK-1833 permanece sin tildar.
