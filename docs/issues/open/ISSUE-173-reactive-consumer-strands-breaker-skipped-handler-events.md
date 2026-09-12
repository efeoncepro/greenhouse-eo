# ISSUE-173 — El consumer reactivo deja huérfanos los eventos que un breaker saltó cuando otro handler del mismo evento ya los reconoció

> **Tipo:** Incidente de runtime (defecto estructural del consumer reactivo V2)
> **Ambiente:** producción (`ops-worker`, drains `ops-reactive-<dominio>` de Cloud Scheduler)
> **Detectado:** 2026-09-12, durante la recuperación de `ISSUE-172`
> **Estado:** open — reproducido y mitigado a mano; **fix estructural pendiente** (requiere task propia con tests del consumer)
> **Superficie dueña:** `src/lib/sync/reactive-consumer.ts` (Phase A: fetch; Phase C: breaker skip)

## Síntoma

Con el circuito de `growth_hiring_application_from_submission` ya **cerrado** (12:50:02Z), cinco submissions
de `efeonce-careers-application` creadas entre 12:38 y 12:42Z (eventos `growth.forms.submission_accepted`
en `status='published'`) siguieron **sin postulación, sin persona y sin fila en `outbox_reactive_log`**
para ese handler durante más de 30 minutos, a pesar de que el drain `ops-reactive-growth` corría cada
5 minutos y reportaba `0 processed`.

## Causa raíz

Phase C, con el breaker **abierto**, salta el grupo de scope **sin escribir fila** en `outbox_reactive_log`
— a propósito, para que el evento se re-tome tras el enfriamiento (comentario en
`reactive-consumer.ts` ~L688). Pero Phase A decide qué está pendiente con este predicado:

```sql
NOT EXISTS (
  SELECT 1 FROM greenhouse_sync.outbox_reactive_log r
   WHERE r.event_id = e.event_id
     AND r.handler = ANY($2)      -- $2 = TODAS las handler keys del dominio
)
```

Es decir: **un evento se considera procesado si CUALQUIER handler del lote tiene fila.**
`growth.forms.submission_accepted` tiene cuatro handlers (`growth_hiring_application_from_submission`,
`growth_grader_run_from_submission`, `growth_aeo_diagnostic_grader_run_from_submission`,
`growth_ebook_delivery_from_submission`). Los tres siblings SÍ escribieron su fila (`no-op:no-scope`,
`coalesced:… no-op`) en la misma corrida en que el breaker saltó al cuarto. Desde ese momento el evento
queda fuera del fetch del dominio **para siempre**: el handler saltado nunca vuelve a verlo. El «se
re-toma tras el enfriamiento» sólo es cierto cuando el evento tiene un único handler.

`replayFailedHandlers` tampoco lo rescata: sólo relee filas `retry`/`dead-letter`, y acá no hay fila.

## Reproducción (2026-09-12, 13:1xZ)

- Drain programado del dominio (`process-domain[growth]`, 13:05:02Z): `4 processed, 2 projections`, y
  las cinco submissions siguieron huérfanas.
- Drain **acotado por handler** (`pnpm reactive:backfill --handler=growth_hiring_application_from_submission:growth.forms.submission_accepted`,
  sin replay): `eventsFetched=6 … ok=6 fail=0` — exactamente las cinco más una nueva. Con `$2` reducido
  a una sola key, el `NOT EXISTS` vuelve a ser verdadero y el evento entra.

Mismo mecanismo explica las **12** submissions «saltadas por el breaker» de `ISSUE-172`: sólo salieron con
el replay acotado por handler, nunca con el drain programado.

## Impacto

Cada vez que un breaker se abre sobre una projection que **comparte tipo de evento** con otras, los eventos
llegados durante la ventana abierta quedan **silenciosamente sin procesar para esa projection** aunque el
circuito cierre. No hay señal: no hay fila `retry`, no hay dead-letter, y `sync.reactive.circuit_open`
(ISSUE-172) sólo ve el circuito abierto, no el residuo que deja. En Hiring el residuo son postulaciones que
nunca nacen.

## Mitigación aplicada (manual, 2026-09-12)

Drain acotado por handler para `growth_hiring_application_from_submission` (6/6 ok). Es un parche de
operación, no una corrección: hay que repetirlo tras cada apertura de circuito de cualquier projection con
siblings.

## Fix propuesto (task propia; NO en el release de ISSUE-171/172)

1. **Phase A por handler, no por evento:** un evento está pendiente si existe **al menos una** handler key de
   `$2` sin fila (`EXISTS (SELECT 1 FROM unnest($2) h WHERE NOT EXISTS (… r.handler = h))`), y Phase C
   salta —sin re-ejecutar— los handlers que ya tienen fila para ese evento. `bulkAcknowledgeEvents` ya
   escribe por `(event_id, handler)`, así que el ack no necesita cambios de shape.
2. Alternativa mínima: que el skip por breaker **sí** escriba una fila `breaker:open` con `recovered_at IS
   NULL`, y que el fetch normal incluya `result = 'breaker:open'` como pendiente (misma idea que
   `replayFailedHandlers`, pero automática). Es lo que el comentario de Phase C describe y descarta a medias.
3. Test de regresión del consumer: dos handlers sobre el mismo evento, uno con breaker abierto; tras cerrar,
   el drain del dominio debe procesar el segundo. Hoy `reactive-consumer.test.ts` cubre «skips a scope group
   when circuit breaker is open», no lo que pasa después.
4. Señal: residuo = eventos `published` con fila de algún handler del dominio y **sin** fila de otro handler
   registrado para ese tipo (steady 0). Sin ella, el defecto vuelve a ser invisible.


## Diseño propuesto para la task (revisión de arquitectura, 2026-09-12)

**Decisión: opción A — pendiente POR HANDLER, sin fila de «skip».** El invariante del ledger pasa a ser
«fila `(event_id, handler)` = ese handler ya decidió; ausencia = pendiente para ese handler». Phase A calcula
los handlers pendientes por evento en SQL y Phase B enruta el evento sólo a esos handlers. El skip por breaker
sigue sin escribir fila (queda pendiente por construcción). Sin migración ni flag.

**Por qué no la opción B (`breaker:open` escribe fila):** exige un `deferred_until` o un join a
`projection_circuit_state` (la config del cooldown vive en TS); `classifyOutcome` mapea cualquier valor
desconocido a éxito y `recordHandlerOutcomes` resetearía `consecutive_failures`/`recovered_at`
(corrompe `handler_health` y el KPI de dead-letters activos); los readers de backlog cuentan «cualquier
fila» como reaccionado; y de todos modos necesita el filtro por handler de A en Phase B.

**Trampa del boceto original:** `EXISTS (SELECT 1 FROM unnest($2) h WHERE NOT EXISTS …)` con `$2` = todas
las keys del dominio hace pendiente a TODO evento para siempre (una key de otro tipo nunca tendrá fila).
Hay que emparejar `handler ↔ event_type`: `unnest($2::text[], $4::text[]) AS k(handler, event_type) WHERE
k.event_type = e.event_type`, con un helper `buildHandlerKeyPairs(keys)` en `reactive-handler-key.ts`
consumido por Phase A y por la señal.

**Cambios:** Phase A (`reactive-consumer.ts` ~L490-536) → un `CROSS JOIN LATERAL` que agrega
`pending_handlers` (sin fila) y `replay_handlers` (`retry`/`dead-letter` sin ack/recovery) por evento,
`WHERE pending_handlers IS NOT NULL OR replay_handlers IS NOT NULL`; Phase B (~L595-599) filtra las
projections por `pendingSet`; Phase C sin cambio de lógica (reescribir el comentario contradictorio);
`bulkAcknowledgeEvents` intacto (`ON CONFLICT (event_id, handler)` idempotente). Costo: K_t (1–4) lookups
por PK en vez de un range-scan; **sin índice nuevo**.

**Tests (`reactive-consumer.test.ts`):** dos handlers sobre un evento, uno con breaker abierto → tras cerrar
el drain del dominio lo procesa; evento reconocido por los 4 no se re-fetchea (guarda de forma + live test
sobre PG real); replay acotado sigue funcionando; un handler con fila no se re-ejecuta; `no-op:no-handler`
intacto.

**Señal `sync.reactive.handler_orphan_residue`** (`drift`, steady 0): eventos `published` con fila de algún
handler del tipo y sin fila de otro handler registrado para ese tipo, con gracia de 15 min; `error` si el
más viejo supera 1 h. Sube con el breaker abierto (esperado, acompaña a `circuit_open`) y debe volver a 0
dentro de 3 ciclos tras cerrar — es la prueba runtime del fix.

**Rollout:** inventario previo de huérfanos históricos (Phase A no tiene ventana temporal: todos se
vuelven pendientes al primer drain) y decisión por handler con efecto externo (dejar correr los que honran
`_occurredAt`, pre-reconocer los rancios con `INSERT … result='skipped:issue-173-stale' ON CONFLICT DO
NOTHING`); sin flag; rollback = revisión anterior del ops-worker + redeploy Vercel.

**No se decide:** ventana/watermark en Phase A y su índice parcial; excluir de `$2` las keys con breaker
`open` (anti-starvation); alinear los readers de backlog a semántica por handler; `SKIP LOCKED` (V3).

## Referencias

- `src/lib/sync/reactive-consumer.ts` (Phase A fetch ~L515–535; Phase C breaker skip ~L688–705)
- `scripts/reactive-backfill.ts` (`--handler=` es la mitigación)
- Relacionado: `ISSUE-172` (el circuito que dejó el residuo), `ISSUE-046` (silent-skip V1)
