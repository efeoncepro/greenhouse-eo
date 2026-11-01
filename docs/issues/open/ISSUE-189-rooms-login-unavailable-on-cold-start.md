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

**Sin confirmar.** El inicio de login abre el pool de la base (secreto en Secret Manager, opciones del conector,
conexión y validación de identidad del rol) y ejecuta una transacción. Cualquier fallo se convierte en `unavailable`
y el error queda sanitizado, sin decir el paso. Hipótesis:

1. **Tope de conexiones del rol runtime:** `validateDatabaseIdentity` acepta `rolconnlimit` hasta 8; cada instancia
   de Vercel usa un pool de hasta 2, y las previews de los PR y la producción comparten la base. Varias instancias a
   la vez agotarían el tope y fallarían rápido.
2. **Arranque en frío del conector o del secreto**, con un error rápido en lugar de un timeout.

## Impacto

La primera entrada tras un período sin tráfico puede mostrar «Espera.». «Reintentar» funciona. No se pierde
información ni se rompe la sesión de nadie, pero da mala primera impresión, justo con un cliente que abre su sala.

## Solución

- **Hecho (Rooms PR #13, `c5d5b35`, en producción desde el 2026-11-01):** registro saneado `rooms.db.init_failed`
  (paso, milisegundos y código con forma de identificador) y `rooms.db.connect_failed` al tomar una conexión del pool.
- **Pendiente:** leer el próximo registro, confirmar la causa y corregirla. Si es el tope de conexiones, ajustar el
  tope del rol o el tamaño del pool y cortar las previews contra la base de producción. Si es el arranque en frío,
  reintentar una sola vez la inicialización (no la consulta).

## Verificación

Pendiente: un registro `rooms.db.*` que identifique el paso, el fix y una semana sin `browser_error` de `unavailable`
en `/login` y `/auth/callback`.

## Relacionado

- Rooms PR #13 (instrumentación y ajuste visual de la página) y PR #14 (rótulo de la esquina retirado).
- `src/server/cloud/postgres.ts`, `src/server/persistence/pool.ts`, `src/server/auth/http.ts` en `efeonce-rooms`.
