# ISSUE-009 — Reactive event backlog can accumulate without Ops visibility

## Ambiente

develop runtime sobre `greenhouse-pg-dev`

## Detectado

2026-04-05, auditoría operativa del carril outbox/reactive

## Síntoma

El carril de publicación del outbox puede verse sano mientras el carril reactivo ya está atrasado.

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

La causa raíz validada hasta ahora no es todavía el motivo exacto por el que el carril reactivo dejó de drenar; eso sigue abierto.

Lo que sí quedó confirmado es una brecha estructural en el control plane operativo:

- el observability actual cuenta `pendingProjections` desde `greenhouse_sync.projection_refresh_queue`
- cuenta `failedHandlers` desde `greenhouse_sync.outbox_reactive_log`
- pero no cuenta eventos `published` de tipo reactivo que todavía no tienen ninguna huella en el ledger reactivo

Eso permite que exista backlog real en la etapa `published -> reactive ledger` sin que Admin Ops lo muestre como cola pendiente o degradación visible.

## Impacto

- El equipo puede asumir que el pipeline reactivo está sano cuando en realidad hay eventos downstream sin procesar.
- Proyecciones y side effects reactivas pueden quedar atrasadas sin alertas visibles.
- La operación pierde trazabilidad sobre cuánto backlog existe realmente y desde cuándo.
- Un incidente en el cron/reactor puede persistir silenciosamente mientras el carril de publicación sigue mostrando actividad normal.

## Solución

Separar el incidente en dos capas:

1. **Corrección operativa inmediata**
   - identificar por qué el carril reactivo no está drenando los eventos `published`
   - restaurar el procesamiento o ejecutar replay/drain controlado

2. **Hardening del control plane**
   - agregar una métrica explícita para `published reactive events` sin fila en `outbox_reactive_log`
   - exponer antigüedad del backlog reactivo real
   - alertar cuando el último `reacted_at` quede rezagado mientras siguen entrando eventos reactivos

## Verificación

1. Consultar backlog real con una query equivalente a:

```sql
SELECT COUNT(*)
FROM greenhouse_sync.outbox_events e
WHERE e.event_type = ANY(<REACTIVE_EVENT_TYPES>)
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_sync.outbox_reactive_log r
    WHERE r.event_id = e.event_id
  );
```

2. Confirmar que ese conteo converge a `0` o a un rango operacional bajo y estable.
3. Confirmar que Admin Ops expone esa métrica en forma separada de `pendingProjections` y `failedHandlers`.
4. Confirmar que el `last_reacted_at` vuelve a avanzar de forma consistente cuando llegan nuevos eventos reactivos.

## Estado

open

## Relacionado

- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/cron/outbox-publish/route.ts`
- `src/app/api/cron/outbox-react/route.ts`
- `src/app/api/cron/projection-recovery/route.ts`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
