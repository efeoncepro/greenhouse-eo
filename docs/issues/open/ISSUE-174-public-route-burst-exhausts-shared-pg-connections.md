# ISSUE-174 — Una ráfaga a una ruta pública sin sesión agota las conexiones de la instancia PostgreSQL compartida

## Ambiente

staging (disparado) — el efecto es sobre la instancia Cloud SQL `greenhouse-pg-dev`, **única para dev, staging y producción**.

## Detectado

2026-09-18 ~11:04Z, canary sintético de TASK-1848 (Claude, greenhouse-eo-91). Una lectura de verificación contra la base
respondió `FATAL 53300 remaining connection slots are reserved for roles with privileges of the "pg_use_reserved_connections" role`.

## Síntoma

64 requests concurrentes a `GET /api/public/insights/shared/[token]` (staging, para medir el rate limit por grant) dejaron
**86–88 conexiones `idle` de `greenhouse_app`** abiertas contra `max_connections=100` (3 reservadas), desde 11:04:06Z hasta
11:09:26Z. Durante esa ventana cualquier runtime (Vercel staging **y producción**, workers) pudo quedar sin conexión.
El rate limit respondió bien (60 `200` y 4 `429`), pero no protegió la base.

## Causa raíz

1. Cada request concurrente a una ruta pública levanta una invocación de Vercel con su propio pool (`max=3` por instancia en
   Vercel, `src/lib/postgres/client.ts`). Una ráfaga de N requests concurrentes puede abrir hasta ~N×3 conexiones.
2. El `idleTimeoutMillis` del pool (10 s) no corre mientras la función está **congelada**: las conexiones quedan abiertas
   hasta que el servidor las corta por `idle_session_timeout=300000` (5 min). Observado: drenaron exactamente 5 min después.
3. El rate limit del reader público (y del Grader, y de cualquier ruta pública con guard en base) **consume una conexión
   antes de rechazar**, así que no es una defensa volumétrica para la base.

No es específico de Insights: cualquier ruta pública sin sesión (Grader, forms, careers, assessment) comparte la clase.

## Impacto

Ventana de ~5 min con la instancia compartida al borde de agotarse. No se midió si hubo requests de producción rechazadas
(pendiente revisar Sentry/logs de Cloud SQL en esa ventana). Vector de denegación de servicio de bajo costo contra todo el
portal desde cualquier ruta pública.

## Solución

Task: `TASK-1876` (`docs/tasks/to-do/TASK-1876-public-route-connection-exhaustion-guard.md`). Pendiente: defensa volumétrica **antes** de tocar la base en rutas públicas (rate limit en edge/WAF de Vercel o
límite de concurrencia de la función), revisar `idle_session_timeout` para conexiones de runtime serverless (p. ej. 30–60 s)
y/o conexión vía pooler; medir el techo de conexiones por deployment. Mientras tanto: **NUNCA** medir rate limits con ráfagas
concurrentes contra la instancia compartida; secuenciar las requests.

## Verificación

Reproducir en staging con ráfaga controlada tras el fix y observar `pg_stat_activity` (conexiones `greenhouse_app` por
debajo de un techo definido) y que la base siga aceptando conexiones de producción.

## Estado

open

## Relacionado

TASK-1848 (canary del reader público), `src/lib/postgres/client.ts`, `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`,
lecciones de la skill `efeonce-insights` (2026-09-18).
