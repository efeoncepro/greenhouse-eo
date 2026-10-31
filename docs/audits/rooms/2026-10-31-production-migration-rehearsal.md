# Rooms — ensayo de migraciones sobre un clon de `rooms_production`

- Fecha: 2026-10-31. Autorizado por el operador («ensayar migraciones»).
- Alcance: gate 2 del [ADR de runtime cloud](../../architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md#gates-y-evidencia-requerida),
  previo al merge de [efeonce-rooms#4](https://github.com/efeoncepro/efeonce-rooms/pull/4).
- Rama: `claude/rooms-approved-ui`. Script `efeonce-rooms` `17438b6`: `pnpm db:rehearse-production [carpeta]`.
- Resultado: **PASS**. La base viva **no** se modificó.

## Qué se hizo

1. **Producción, solo lectura.**
   - Conexión a `efeonce-group:us-east4:greenhouse-pg-dev`, base `rooms_production`, por Cloud SQL Proxy con el rol
     `rooms_migrator`. La credencial sale de Secret Manager a una variable de entorno; no se imprime ni se escribe.
   - Se leyeron versión, conteo de filas por tabla, hash de las ediciones publicadas y la lista de migraciones.
   - Se tomó un `pg_dump` del esquema `rooms`, con sus permisos, y otro de `public.rooms_migrations`.
   - Los conteos de producción antes y después del respaldo son idénticos.
2. **Clon desechable.** El respaldo se restaura en un clúster PostgreSQL 16 local temporal, la misma versión mayor que
   producción, con los roles `rooms_migrator`, `rooms_runtime` y `rooms_media_worker`. El clon coincide con producción
   en conteos y en hash de ediciones.
3. **Migraciones.** Se aplican con el runner de Rooms (`scripts/db-migrate.ts up`), el mismo de los entornos locales.
4. **Verificación**:
   - el hash de las ediciones publicadas no cambia;
   - las tablas existentes conservan sus filas;
   - el rol `rooms_runtime` lee las tablas nuevas.
5. **Rollback** de las 10 migraciones nuevas, uno por uno, solo en el clon. Después se comparan el esquema y el ledger.
6. **Reaplicación** después del rollback, para probar que el camino se puede repetir.
7. **Suite completa** de Rooms contra el clon migrado.
8. **Limpieza.** Se borran el clúster y los respaldos, y se cierra el proxy. Solo quedan resultados sin contenido:
   conteos, hashes y esquema.

## Evidencia

| Punto | Resultado |
| --- | --- |
| Producción | PostgreSQL 16.14; 26 tablas; 8 migraciones (`1792962301842` … `1793042981615`); 1 sala, 2 ediciones, 0 borradores, 1 invitación, 2 assets |
| Producción durante el respaldo | Sin cambios (conteos idénticos antes y después) |
| Restore en clon | Conteos y hash de ediciones idénticos a producción |
| `up` | 10 migraciones nuevas (`1793250000000` … `1793259000000`) → 18 migraciones, 47 tablas |
| Contenido | Hash de ediciones publicadas intacto; filas de las 26 tablas existentes sin cambios |
| Permisos | `rooms_runtime` 110 privilegios de tabla, `rooms_media_worker` 10; lectura de `live_presence`, `questions` y `viewer_progress` como `rooms_runtime`: OK |
| Rollback | Ledger vuelve a las 8 migraciones de producción; hash de ediciones intacto |
| Reaplicación | OK, mismas 18 migraciones |
| Suite en el clon | 377/377, 0 fallos, 0 omitidas |

## Observación del rollback

Después de revertir, el esquema difiere de producción en **dos restricciones con otro nombre**:

| Tabla | Producción | Después del rollback |
| --- | --- | --- |
| `rooms.grants` | `grants_capabilities_check` + `grants_capabilities_check1` | una sola, `grants_capabilities_foundation` |
| `rooms.invitations` | `invitations_capabilities_check` | `invitations_capabilities_legacy` |

Las condiciones son las mismas: el rollback recupera el comportamiento, no los nombres. No afecta datos ni
aplicaciones. La reaplicación posterior funcionó.

Como el ADR prohíbe `down` en la base viva, el rollback de producción sigue siendo **restaurar desde respaldo**, no
ejecutar `down`. Este ensayo sirve para ensayar ese camino.

## Pendiente para aplicar en producción

1. Repetir `pnpm db:rehearse-production` justo antes de aplicar, por si producción cambió.
2. Confirmar que existe un respaldo o PITR reciente de la instancia compartida.
3. Aplicar con autorización expresa, **antes** del merge de #4. Leer de vuelta las 18 migraciones y las 47 tablas.
4. Mantener `ROOMS_INVITATIONS_ENABLED` y `ROOMS_LIVE_ENABLED` en OFF hasta sus propios gates.
