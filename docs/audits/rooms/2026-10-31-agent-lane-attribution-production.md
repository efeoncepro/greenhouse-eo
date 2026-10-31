# Rooms: carril de agentes (TASK-2084) en producción

- Fecha: 2026-10-31.
- Autorización del operador: aprobó el plan («Apruebo el plan») y el rollout («Ok», ante la pregunta de llevar
  TASK-2084 a producción).
- Alcance: expand (slices 1–5). La migración contract (slice 6) queda para después de verificar este release con uso real.

## Pasos y readback

| Paso | Resultado |
| --- | --- |
| Ensayo `pnpm db:rehearse-production` | PASS: producción sin cambios durante el volcado; clon igual a producción; 20 → 24 migraciones y 49 → 51 tablas; hashes de ediciones y filas preservados; rol runtime OK; rollback y reaplicación OK (la diferencia de esquema después del rollback son solo los tokens `\restrict` de `pg_dump`); suite 406/406 contra el clon |
| Respaldo de la instancia | Automático `2026-10-31T07:00Z` `SUCCESSFUL` |
| `pnpm db:migrate-production --apply` (`ROOMS_EXPECT_PENDING=4`) | Respaldo lógico privado, 4 migraciones aplicadas (`1793262`–`1793265`), readback: 24 migraciones, 51 tablas, hashes y conteos sin cambios, `rooms_runtime` 122 privilegios y lee las tablas nuevas |
| PR | [efeoncepro/efeonce-rooms#7](https://github.com/efeoncepro/efeonce-rooms/pull/7): CI con imagen Linux, smoke del decoder y preview de Vercel en verde; mergeado a `main@d7d6f6b` |
| Deploy | `dpl_8xUkT1AduZ4eiD7SM4x8Dktm2exC` READY; `vercel alias set … efeonce-rooms.vercel.app` |
| Rutas sin sesión | `/rooms` 200, `/auth/error` 200, `/api/auth/session` 401, `/api/v1/agents/activity` 401, `/api/v1/commands` 401 |
| Atribución en `rooms_production` (solo lectura) | Las seis tablas tienen las columnas. Todas las filas previas siguen con `channel` NULL: `command_receipts` 12/12, `audit` 15/15, `access_events` 1/1 (ninguna reescrita); 0 filas de agentes; 4 triggers instalados |
| `pnpm access:production health` | Sin señales de acceso; `rooms.agent.release_actions` 0 `ok`, `rooms.agent.quota_hit` 0 `ok` |
| Respaldo lógico de la migración | Borrado después de la verificación |

## Lo que no se verificó

- **Un comando real por navegador** después del deploy, para ver una fila `person`/`browser`. Requiere una sesión
  humana; queda para el próximo uso del operador.
- **Un comando real como agente** por el MCP stdio contra producción, con aviso y reversa. Requiere el archivo de
  sesión del operador; no se usó.
- **La reversa de una invitación de punta a punta**: el descriptor se deriva del recibo, pero no se ejecutó.

## Rollback

- Código: revertir el merge en `main`, redeploy y `vercel alias set`. Las columnas nuevas tienen valores por defecto
  y el código anterior funciona con ellas.
- Esquema: las migraciones son aditivas y quedan en su lugar. Si hubiera que retirarlas, se usan migraciones forward
  que borren triggers y tablas nuevas. **Nunca** `down` en la base viva.
