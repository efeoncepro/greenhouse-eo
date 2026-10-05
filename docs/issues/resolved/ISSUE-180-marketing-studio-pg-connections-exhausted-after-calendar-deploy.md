# ISSUE-180 — Marketing Studio agota las conexiones de su rol de base tras el deploy del calendario rápido

## Ambiente

production (`studio.efeonce.org`, Vercel `efeonce-marketing-studio`; base `marketing_studio` en la instancia Cloud SQL
compartida con Greenhouse).

## Detectado

2026-10-05 13:49 UTC, durante la verificación de TASK-2002 (medición de navegación con Playwright contra producción) y
confirmado en Vercel *runtime errors*: `too many connections for role "marketing_studio_app"` (código 53300).

## Síntoma

Entre ~13:50 y 14:08 UTC, `/calendar`, `/campaigns` y `/library` respondieron 500 o la página de error de forma
intermitente (2 de 20 cargas en la primera medición, la mayoría en la segunda). La API `/api/v1/*` siguió respondiendo.
Tras el rollback aparecieron además errores `ssl/tls alert bad certificate` al conectar con Cloud SQL desde instancias
reactivadas del deploy anterior.

## Causa raíz

- El rol `marketing_studio_app` tiene `CONNECTION LIMIT 20` (protege a Greenhouse en la instancia compartida).
- Cada instancia de Vercel (Fluid) abre su pool `pg` (hasta 3 conexiones) y, al congelarse, **no corre el
  `idleTimeoutMillis`**: las conexiones quedan abiertas del lado de Postgres. Misma clase que
  [ISSUE-174](../open/ISSUE-174-public-route-burst-exhausts-shared-pg-connections.md).
- El deploy de TASK-2002 (`11ec7fa`) paralelizó las lecturas (cada render llenaba las 3 conexiones) y agregó un prefetch
  completo en reposo de los dos períodos vecinos (dos renders extra por vista). La medición con 20 navegadores seguidos
  hizo escalar instancias; al congelarse retuvieron 18 conexiones y el rol quedó sin cupo.
- El certificado rechazado: instancias del deploy anterior reactivadas por el rollback con el certificado efímero del
  Cloud SQL connector vencido (ya había un 503 de health a las 12:55 en ese deploy, antes del cambio).

## Impacto

Páginas del portal de Studio (calendario, campañas, biblioteca) con errores intermitentes durante ~18 min para los
usuarios internos de Efeonce. Sin pérdida de datos ni escrituras afectadas; la API y el worker no se afectaron.

## Solución

1. Mitigación: prefetch por intención (`6e6ba64`), rollback, redeploy fresco de `5d962c4` promovido (`bj0vxogbi`) y
   `pg_terminate_backend` de las sesiones **inactivas** de `marketing_studio_app` con más de 2 minutos (15) y, tras la
   corrección, las 4 viejas restantes de deploys anteriores.
2. Corrección (`3829a8b`, deploy `3ai7wipv3`): `attachDatabasePool` de `@vercel/functions` 3.9.9 (misma
   `@vercel/oidc` 3.8.9) en `apps/web/src/server/runtime.ts`, que mantiene viva la instancia hasta que el pool cierra
   sus conexiones inactivas; en Vercel, 2 conexiones por instancia y 5 s de inactividad; `@studio/database` expone el
   `pool` en el handle.
3. El prefetch de períodos vecinos queda sólo por intención (puntero o foco en la flecha).

## Verificación

- 4 h con el código de TASK-2002 en producción (desplegado por otro push a las 16:31 UTC) sin ningún error de conexión.
- Tras `3ai7wipv3`, navegación real (mes, semana, hoja, filtro): las conexiones del rol suben de 4 a 7 y vuelven a la
  base ~10 s después de la última navegación; tras liberar las 4 viejas quedan 2 recientes.
- `/calendar`, `/campaigns` y `/library` 200 con contenido completo.

## Estado

resolved (2026-10-05).

## Relacionado

- [TASK-2002](../../tasks/in-progress/TASK-2002-marketing-studio-activations-calendar-ui.md) — rendimiento y motion.
- [ISSUE-174](../open/ISSUE-174-public-route-burst-exhausts-shared-pg-connections.md) — misma clase en Greenhouse;
  `attachDatabasePool` es candidato también allí (TASK-1876).
- Pendientes: pooler de conexiones entre Vercel y Cloud SQL para crecer a usuarios externos (task aparte, toca la
  instancia compartida); reintento único ante `bad certificate` del connector en instancias reactivadas.
- Regla operativa: nunca medir con carga sintética contra producción de Studio; medir con un navegador y vigilando
  `pg_stat_activity` del rol.
