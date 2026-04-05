# ISSUE-009 — Reactive event backlog can accumulate without Ops visibility

## Ambiente

develop runtime sobre `greenhouse-pg-dev`

## Detectado

2026-04-05, auditoría operativa del carril outbox/reactive

## Síntoma

El carril de publicación del outbox podía verse sano mientras el carril reactivo ya estaba atrasado.

Evidencia confirmada al momento de la auditoría:

- `greenhouse_sync.outbox_events` no tenía eventos `pending` de publicación.
- En las últimas 24 horas hubo `329` eventos y los `329` quedaron publicados.
- El último `published_at` observado fue `2026-04-05 13:00:02+00`.
- Sin embargo, existían `607` eventos de tipo reactivo publicados sin ninguna fila en `greenhouse_sync.outbox_reactive_log`.
- `128` de esos eventos no reaccionados ocurrieron en las últimas 24 horas.
- El más antiguo venía desde `2026-03-20 08:22:59+00`.
- El último `reacted_at` observado en el ledger reactivo fue `2026-04-03 01:50:29+00`.

Los tipos con mayor acumulación observada fueron:

- `ico.materialization.completed` (`187`)
- `finance.income.created` (`132`)
- `finance.expense.created` (`128`)

## Causa raíz

La causa raíz validada para este issue fue una brecha de observabilidad en el control plane operativo.

Antes del fix, Admin Ops solo mostraba:

- `pendingProjections` desde `greenhouse_sync.projection_refresh_queue`
- `failedHandlers` desde `greenhouse_sync.outbox_reactive_log`

Pero no mostraba los eventos `published` de tipo reactivo que todavía no tenían ninguna huella en el ledger reactivo.

Eso permitía que existiera backlog real en la transición `published -> reactive ledger` sin que `Admin Center`, `Ops Health` o `/api/internal/projections` lo expusieran como señal separada.

## Impacto

- El equipo podía asumir que el pipeline reactivo estaba sano cuando en realidad había eventos downstream sin procesar.
- Proyecciones y side effects reactivas podían quedar atrasadas sin alertas visibles.
- La operación perdía trazabilidad sobre cuánto backlog existía realmente y desde cuándo.
- Un incidente en el cron/reactor podía persistir silenciosamente mientras el carril de publicación seguía mostrando actividad normal.

## Solución

Se implementó una corrección localizada de visibilidad operativa, sin esperar el hardening enterprise completo de `TASK-251`.

Cambios aplicados:

- nuevo reader canónico `src/lib/operations/reactive-backlog.ts`
  - mide backlog reactivo oculto (`published` sin fila en `outbox_reactive_log`)
  - expone total, últimas `24h`, oldest/newest, `lastReactedAt`, `lagHours`, status y top event types
- `src/lib/operations/get-operations-overview.ts`
  - ahora agrega `kpis.hiddenReactiveBacklog`
  - ahora agrega `reactiveBacklog` como bloque estructurado del contrato admin
  - incorpora un subsystem visible `Reactive backlog`
- `src/app/api/internal/projections/route.ts`
  - ahora devuelve `reactiveBacklog` además de projections + queue health
  - la health global deja de ser “sana” cuando existe backlog reactivo oculto
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - muestra el backlog reactivo como KPI separado de `pendingProjections` y `failedHandlers`
  - muestra `lastReactedAt`, ventana oldest/newest y top event types sin abrir SQL
- `src/views/greenhouse/admin/AdminCenterView.tsx`
  - `Ops Health` deja de verse “ok” cuando existe backlog reactivo oculto
  - el bloque consolidado `Requiere atención` ahora lo alerta explícitamente

Importante:

- este fix resuelve la invisibilidad operativa del backlog
- no ejecuta replay/drain automático del backlog existente
- el replay scoped, `dryRun`, guardrails y alerting enterprise siguen como alcance vivo de `TASK-251`

## Verificación

1. Tests focalizados:

```bash
pnpm exec vitest run src/lib/operations/reactive-backlog.test.ts src/views/greenhouse/admin/AdminCenterView.test.tsx
```

Resultado local:

- `2` archivos, `8` tests passing

2. Type check:

```bash
pnpm exec tsc --noEmit --pretty false
```

Resultado local:

- OK

3. Verificación runtime del valor live que ahora queda visible vía los readers nuevos:

```json
{
  "total_unreacted": 607,
  "last_24h_unreacted": 128,
  "oldest_unreacted_at": "2026-03-20 08:22:59.170898+00",
  "newest_unreacted_at": "2026-04-05 12:59:23.355092+00",
  "lastReactedAt": "2026-04-03 01:50:29.030955+00"
}
```

Con esto, el backlog reactivo actual ya no puede acumularse sin visibilidad operativa en Admin Ops.

## Estado

resolved (2026-04-05)

## Relacionado

- `src/lib/operations/reactive-backlog.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/internal/projections/route.ts`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`