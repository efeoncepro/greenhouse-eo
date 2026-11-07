# ISSUE-189 — El login de Rooms responde «Espera.» (`unavailable`) de forma intermitente

## Ambiente

production — Vercel `efeonce-rooms` (`efeonce-rooms.vercel.app`), base `rooms_production` por Cloud SQL Connector.

## Detectado

2026-11-01 09:53 (Chile), por el operador: al entrar a Rooms vio la página «Espera. No pudimos verificar tu acceso
ahora», referencia `980F-9BD0` (`correlationId` `980f9bd0-293f-4822-9e1f-963a38ed0862`, deploy
`dpl_GxH7cWJ2doCYXYsYSvWonUwbD6t2`).

## Síntoma

`GET /login` devuelve 303 a `/auth/error?reason=unavailable` en vez de 302 a Efeonce ID. Reproducido a las ~09:57:
de cinco peticiones seguidas, las dos primeras fallaron y las tres siguientes funcionaron. Las fallidas terminaron
rápido (~1 s), no por timeout. A las ~10:10, sobre el deploy siguiente, seis peticiones funcionaron (una tardó 6,6 s,
el resto ~1,5 s). Hay errores parecidos en `/auth/callback` el 31-10 a las 14:13 y 15:02.

## Causa raíz

**Mecanismo identificado el 2026-11-01 (tarde); el código exacto del error se confirma con el próximo registro.** Con el registro de PR #13, producción mostró `rooms.db.connect_failed` (no
`init_failed`) en ráfagas: el pool inicializaba bien y fallaba al tomar conexiones nuevas, 4 de cada 5 veces y en
~0,5 s. Las conexiones del rol estaban en 1 de 8, así que no era el tope. En `@google-cloud/cloud-sql-connector`
1.12.1, `createDirectSocket` usa el certificado temporal guardado **sin revisar si venció**, y su renovación corre con
un `setTimeout`, que no se ejecuta mientras Vercel tiene la función congelada. Al despertar, cada conexión nueva falla
en TLS (y dispara un refresco en segundo plano) hasta que el refresco termina; por eso «Reintentar» funcionaba. El
código del error se registraba como `unknown`, lo que calza con un código de OpenSSL con `/` (`ERR_SSL_SSL/TLS_*`), que el saneado descartaba (inferido, no observado). Esta versión del conector
no tiene opción de refresco perezoso.

## Impacto

La primera entrada tras un período sin tráfico puede mostrar «Espera.». «Reintentar» funciona. No se pierde
información ni se rompe la sesión de nadie, pero da mala primera impresión, justo con un cliente que abre su sala.

## Solución

- **Hecho (Rooms PR #13, `c5d5b35`, en producción desde el 2026-11-01):** registro saneado `rooms.db.init_failed`
  (paso, milisegundos y código con forma de identificador) y `rooms.db.connect_failed` al tomar una conexión del pool.
- **Hecho (Rooms PR #17, `2d52d7b`, en producción desde el 2026-11-01):** un checkout fallido no envió ninguna
  sentencia, así que se descarta el pool (se drena en segundo plano) y se reintenta **una sola vez** sobre uno nuevo
  (`rooms.db.connect_recovered`); las consultas y los COMMIT siguen sin reintentarse. El pool se recicla a los 40 min,
  antes del vencimiento del certificado de una hora. El registro conserva códigos con `/` y `.`.

## Verificación

- 2026-11-01, sobre el deploy nuevo: 22 de 22 inicios de login llegaron a Efeonce ID (antes 4 de 5 fallaban).
- **Pendiente para cerrar:** el deploy nuevo trae certificados frescos, así que la prueba de fondo es tras más de una
  hora sin tráfico. Cerrar con una semana sin `browser_error` de `unavailable` en `/login` y `/auth/callback`, y con
  algún `rooms.db.connect_recovered` (o ningún `connect_retry_failed`) en el registro.

## Relacionado

- Rooms PR #13 (instrumentación y ajuste visual de la página) y PR #14 (rótulo de la esquina retirado).
- `src/server/cloud/postgres.ts`, `src/server/persistence/pool.ts`, `src/server/auth/http.ts` en `efeonce-rooms`.
