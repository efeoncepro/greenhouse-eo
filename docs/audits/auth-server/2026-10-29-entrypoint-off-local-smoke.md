# Auth Server — entrypoint real con carriles OFF (2026-10-29)

## Alcance

Se arrancó `services/auth-server/server.ts` mediante `tsx` y el shim
`server-only` en un proceso local aislado. El entorno heredado se reemplazó
por una allowlist mínima: `PATH`, `NODE_ENV=test`, puerto loopback efímero,
issuer `https://auth.example`, Host permitido `auth.example` y los flags
`AUTH_SERVER_ENABLED`, OAuth, personas, first-party y OTP en `false`.
No se suministraron credenciales, DSN, acceso a PostgreSQL ni Cloud KMS.

| Request local | Resultado esperado y observado |
| --- | --- |
| `GET /healthz`, Host permitido | 200 |
| `GET /readyz`, Host permitido | 503 `disabled` |
| `GET /oauth/authorize`, Host permitido | 404 |
| `GET /readyz`, Host ajeno | 421 |

Los cuatro chequeos pasaron en la segunda corrida. El proceso y sus hijos
recibieron SIGTERM como grupo; no quedó un proceso `server.ts` activo. La
primera corrida había pasado los cuatro HTTP, pero el wrapper de `tsx` no
cerró al terminar el padre y el comando salió con error de limpieza; no se
cuenta como prueba exitosa.

Esto confirma arranque y gates OFF del entrypoint TypeScript real. No prueba
la imagen Docker, KMS, PostgreSQL, ALB, flags ON ni el flujo de Rooms. El
issuer QA usado por Rooms sigue siendo una prueba distinta.

Gates del artefacto tras el smoke: `pnpm worker:build-contract-gate` PASS
(cinco build units, contextos Docker/Cloud Build y workflow_call Auth) y
`pnpm worker:runtime-deps-gate` PASS (18 paquetes externalizados de Auth en
`dependencies`). Son verificaciones estáticas; no construyen ni sirven la
imagen Docker.
