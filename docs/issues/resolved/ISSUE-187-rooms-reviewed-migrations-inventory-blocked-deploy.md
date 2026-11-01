# ISSUE-187 — El deploy de Rooms quedaba retenido porque el inventario de migraciones revisadas no incluía las nuevas

## Ambiente

production (`efeonce-rooms`, Vercel + `rooms_production`) y entorno local de integración (`pnpm integration:up`).
La documentación de Rooms vive en este repo; el código, en `efeoncepro/efeonce-rooms`.

## Detectado

2026-11-01, por el agente al preparar el deploy del nombre del espacio (TASK-2085). La deuda ya se había anotado el
mismo día en el ledger de la skill `efeonce-rooms` («`integration:up` fallaría en preflight») al aplicar la migración
`1793267`.

## Síntoma

- `pnpm integration:up` fallaba en el preflight con «Review exact migration inventory before integration bootstrap»,
  sin decir qué migración faltaba.
- El fallo venía desde TASK-2084 (migraciones `1793262`–`1793265`, 2026-10-31) y se agravó con `1793267`
  (2026-11-01). El entorno de integración local no podía levantarse y el deploy del corte quedó retenido hasta
  corregirlo.

## Causa raíz

- `REVIEWED_MIGRATIONS` en `scripts/design-integration/config.ts` es una lista cerrada de las migraciones revisadas
  que el bootstrap de integración acepta. Se había quedado en `1793261000000_rooms-member-auto-renew.sql`.
- Nada obligaba a actualizarla al agregar una migración: la prueba sólo comparaba la lista consigo misma, así que
  `pnpm test` y CI seguían verdes. El desfase recién aparecía al correr `integration:up`.

## Impacto

- Interno, sin usuarios afectados: producción siguió sirviendo el deploy anterior.
- El equipo no podía levantar el entorno de integración local (Claude Design) y el deploy del nombre del espacio y la
  entrada 307 se demoró.
- Riesgo de que una migración sin revisar pasara inadvertida durante semanas.

## Solución

- [PR #11](https://github.com/efeoncepro/efeonce-rooms/pull/11) (`8aef9db`): agrega `1793262`–`1793265` y `1793267` a
  `REVIEWED_MIGRATIONS`.
- `tests/integration-env.test.ts` ahora exige que la lista sea **exactamente** `migrations/*.sql`: una migración nueva
  sin entrada falla en `pnpm test` (parte de `pnpm verify`) en el mismo PR que la introduce.
- Regla registrada en la skill `efeonce-rooms`, el contrato de API y acceso y el manual de producción: cada migración
  nueva entra en `REVIEWED_MIGRATIONS` en el mismo PR.

## Verificación

- La prueba nueva (inventario igual a `migrations/*.sql`) entró con el PR #11, mergeado a `main` de `efeonce-rooms`.
- Deploy `efeonce-rooms-12zux9578` en producción con el alias `efeonce-rooms.vercel.app` reasignado (2026-11-01).
- No registrado en este documento: una corrida nueva de `pnpm integration:up` completa después del PR #11.

## Estado

resolved — 2026-11-01.

## Riesgo residual

- `1793266` (rama sin merge `claude/rooms-media-import`) está aplicada en la PG local del operador. `pnpm db:migrate up`
  falló hasta copiar temporalmente ese archivo al checkout. Cuando esa rama se mergee, su PR debe agregar `1793266` a
  la lista; hasta entonces, una PG local que corrió esa rama queda «adelantada» respecto de `main`.
- `pnpm db:migrate` sin argumento sólo hace `status` (dry run); la acción que aplica es `up`. Está documentado en el
  manual de producción y en la skill.

## Relacionado

- `efeoncepro/efeonce-rooms`: PR #11 (`8aef9db`), `scripts/design-integration/config.ts`,
  `tests/integration-env.test.ts`.
- [TASK-2084](../../tasks/in-progress/TASK-2084-rooms-agent-attribution-reversal-quotas.md) (origen de `1793262`–`1793265`)
  y [TASK-2085](../../tasks/in-progress/TASK-2085-rooms-agent-activity-surface.md) (`1793267`).
- [Manual de producción, paso 5](../../manual-de-uso/rooms/operar-produccion-rooms.md) y
  [contrato de API y acceso](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).
