# Rooms — migraciones 9 a 18 aplicadas en `rooms_production`

- Fecha: 2026-10-31, 14:16 UTC.
- Autorización del operador: «Sí, aplica» (repetir el ensayo, confirmar respaldo, aplicar y verificar; sin merge).
- Instancia `efeonce-group:us-east4:greenhouse-pg-dev` (PostgreSQL 16, compartida con Greenhouse), base `rooms_production`.
- Herramienta `efeonce-rooms` `bbca0f8`: `ROOMS_EXPECT_PENDING=10 pnpm db:migrate-production --apply`.
- Resultado: **aplicado y verificado**. Ni el código ni los flags de producción cambiaron.

## Antes de aplicar

- **Ensayo repetido** el mismo día con `pnpm db:rehearse-production`: PASS ([recibo del ensayo](2026-10-31-production-migration-rehearsal.md)).
  En el clon PostgreSQL 16: de 8 a 18 migraciones, contenido intacto, rollback y reaplicación OK, 377/377 pruebas.
- **Respaldo de la instancia** (`vivo`):
  - respaldos automáticos activos (7 retenidos);
  - el de hoy terminó bien a las 07:45 UTC;
  - PITR activo con 7 días de registros.
- **Respaldo lógico propio** tomado justo antes de aplicar, con permisos privados (directorio 700, archivos 600):
  `.local/production-backups/rooms-production-20261031T141626Z.dump` más `.ledger.dump`, en la máquina del operador.
  Es el rollback real: restaurar con PITR la instancia compartida también haría retroceder a Greenhouse.
- **Corrida en seco:** 8 migraciones aplicadas, 26 tablas, exactamente las 10 pendientes esperadas y ninguna desconocida.

## Aplicado

`1793250000000_rooms-collaboration`, `1793251000000_rooms-presentation`, `1793252000000_rooms-integrations`,
`1793253000000_rooms-multimedia-local`, `1793254000000_rooms-invitation-edition-capabilities`,
`1793255000000_rooms-viewer-progress`, `1793256000000_rooms-invitation-card`, `1793257000000_rooms-guest-display-name`,
`1793258000000_rooms-presentation-clock-signals`, `1793259000000_rooms-live-presence`.

## Verificación después de aplicar

| Punto | Resultado |
| --- | --- |
| Ledger | 18 migraciones, una por cada archivo de la rama |
| Ediciones publicadas | Hash idéntico al de antes |
| Tablas existentes | Mismas filas en las 26 |
| Tablas | 47 |
| Permisos | `rooms_runtime` 110, `rooms_media_worker` 10 |
| Rol de la app | `rooms_runtime`, con su credencial de producción, lee `live_presence`, `questions`, `viewer_progress` e `invitation_token_history` |

## Qué no cambió y qué falta

- El deployment de producción sigue en `main@e4b2e890`. Las migraciones son aditivas: ese código no lee las tablas nuevas.
- No se verificó en el navegador el tráfico real contra producción (protegida por SSO, sin dominio público).
- **Sigue pendiente el merge de [efeonce-rooms#4](https://github.com/efeoncepro/efeonce-rooms/pull/4)** (= deploy), con su
  propia autorización. Después del deploy, `ROOMS_INVITATIONS_ENABLED` ya no rompe la ruta de invitados por falta de tablas;
  igual se mantiene en OFF.
- Rollback, si se necesitara: restaurar el esquema `rooms` y `public.rooms_migrations` desde el respaldo lógico. Nunca
  `down` en la base viva.
- El respaldo lógico contiene datos de producción (la sala sintética del canary). Hay que borrarlo cuando el deploy quede
  verificado.
