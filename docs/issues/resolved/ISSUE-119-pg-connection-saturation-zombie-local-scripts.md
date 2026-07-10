# ISSUE-119 — Saturación de conexiones PG por scripts tsx locales zombies (Connector invisible al proxy)

- **Ambiente:** Cloud SQL `greenhouse-pg-dev` (única instancia — sirve producción)
- **Detectado:** 2026-07-10 (durante el smoke E2E de TASK-770)
- **Resuelto:** 2026-07-10 (misma sesión)
- **Severidad:** alta (la instancia rechazaba conexiones nuevas: `53300 remaining connection slots are reserved` — afectaba a TODO consumer, prod incluido)

## Síntoma

Cualquier conexión nueva a `greenhouse_app` fallaba con `FATAL 53300: remaining connection slots are reserved for roles with privileges of "pg_use_reserved_connections"`. Incluso el perfil `ops` quedó fuera. `max_connections=100` (tier `db-custom-1-3840`) estaba agotado.

## Causa raíz

Dos procesos locales `tsx` de una sesión anterior (`scripts/growth/publish-ebook-form.ts`, lanzados 10:40/10:51/11:14) quedaron **colgados 4+ horas sin terminar**. Cada corrida creó su pool contra el **Cloud SQL Connector** (`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`), no contra el proxy local — por eso `lsof -i :15432` mostraba cero conexiones y el culpable era invisible desde el diagnóstico obvio. Los procesos vivos retenían las conexiones del pool (y sus reintentos acumularon más), agotando los slots de la instancia compartida.

Verificación empírica: `kill` de los 4 procesos zombies → la instancia pasó de saturada a **3 conexiones de 100** en segundos.

## Impacto

- Ventana de saturación con rechazo de conexiones nuevas para todos los runtimes (Vercel prod/staging, workers, agentes). Duración exacta no acotada (los zombies existían desde ~4h antes; la saturación total se observó al detectarse).
- Sin corrupción de datos: solo rechazo de conexiones nuevas.

## Resolución

1. Diagnóstico: `lsof -i :15432` (limpio) → `ps aux | grep tsx` (zombies) → kill → recheck `pg_stat_activity` (3/100).
2. Los scripts zombies eran de trabajo YA committeado por su sesión (no se perdió nada).

## Lecciones / prevención (follow-up)

- **Un script tsx con pool que no llama `process.exit()` puede quedar vivo para siempre** (sockets del pool/Connector mantienen el event loop). Patrón canónico para scripts: terminar con `process.exit(0/1)` explícito (los smokes de TASK-356/770 ya lo hacen).
- **Diagnóstico canónico de saturación**: `lsof -i :15432` NO basta — los scripts con Connector no pasan por el proxy. Revisar `ps aux | grep tsx` + `pg_stat_activity` (si se puede entrar) + zombies de sesiones previas ANTES de sospechar de los runtimes cloud.
- Follow-up opcional (no bloqueante): wrapper de scripts que imponga `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` bajo (p.ej. 3) + timeout de proceso para toda CLI local; y/o `statement_timeout`/`idle_session_timeout` a nivel de rol para conexiones locales.

## Referencias

- Sesión TASK-770 (Handoff 2026-07-10). Instancia única: hallazgo operativo del release 2026-07-10 (`Handoff.md`).
