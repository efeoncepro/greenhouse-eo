# ISSUE-135 — Globe: la outbox de governed runs reintenta infinito, en silencio y sin dead-letter

> **Estado:** Open
> **Detectado:** 2026-08-02 · **Ambiente:** Globe producción (`globe-producer-worker`, Cloud Run job)
> **Severidad:** Alta — una corrida puede quedar viva e inútil para siempre, consumiendo lease cada minuto
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)

## Síntoma

Un run de producción quedó atascado **695 entregas** sin avanzar ni morir:

```
run_id           : 3c1fe091-1056-4621-9572-c14153c1db98
creado           : 2026-07-31T19:02:58Z
run_state        : approved      ·  provider_accepted: false
kind             : submit        ·  outbox_state: pending
delivery_attempt : 695
error            : provider_input_resolution_failed
available_at     : se reprograma solo, indefinidamente
```

Tres días reintentando el mismo error, reprogramándose cada vez. Ni tope de intentos, ni dead-letter, ni
señal. En la UI se ve como una pieza «generando» que nunca termina.

## Causa

`reschedule()` en `packages/domain/src/governed-run-lifecycle.ts` reprograma con backoff **sin techo de
intentos**. No existe estado terminal para «esto ya no va a funcionar»: mientras el error sea reintentable
por forma, el job vuelve a la cola para siempre.

Dos agravantes que lo vuelven invisible:

1. **El motivo real se pierde.** `finalizationFailureCode()` (mismo archivo, ~línea 497) mapea el error a
   una allowlist de códigos seguros y cae a `run_finalization_failed` genérico cuando no matchea. Es
   correcto no filtrar texto crudo del proveedor o de la base a la outbox — pero hoy no queda **ningún**
   rastro accionable del error original.
2. **Nadie mira el contador.** `delivery_attempt` está en la tabla y nadie lo observa. 695 y 12 son
   números que ninguna alerta lee.

> El worker **sí** emite logging estructurado por batch (`globe_worker_completed` con
> `{claimed, applied, rescheduled, stale}`). El defecto NO es ausencia de logs: es que un `rescheduled`
> repetido sobre el mismo job es indistinguible de trabajo sano.

## Impacto

- Corridas zombis que ocupan lease y presupuesto de batch cada minuto, para siempre.
- El operador ve «generando» indefinido, sin forma de saber que está muerto.
- Un fallo permanente (input irrecuperable) y uno transitorio (proveedor caído) son indistinguibles.

## Evidencia

- Diagnóstico: `diagnose-governed-run.yml`, run `30764278576` (`3c1fe091`) y `30764319161` (`77e71e9d`).
- Predicado de reclamo: `packages/database/src/stores/governed-run-store.ts:75-81`.
- Logs del worker: `gcloud logging read 'resource.labels.job_name="globe-producer-worker"'` — `exit(0)` por
  batch con el JSON de resultado; cero entradas `severity>=WARNING` en 2 h.

## Solución propuesta

1. **Techo de entregas por `kind`** con estado terminal `dead_letter`, append-only, conservando el último
   `error_code` y el `delivery_attempt` alcanzado.
2. **Señal de reliability** `globe.run.outbox_dead_letter` (steady = 0) y
   `globe.run.outbox_retry_storm` (un job con `delivery_attempt` > N). Cualquiera > 0 pide humano.
3. **Preservar el motivo real** sin filtrar: registrar el `name`/`constructor` del error y un digest
   estable del mensaje, sin copiar texto libre. Hoy la allowlist no deja diagnosticar lo que no previó.
4. **Proyectar el estado terminal a la UI** — cubierto por `TASK-1559`; una corrida en dead-letter deja de
   verse como «generando».

## Lo que NO es

No es que el worker esté caído ni que no loggee: corre cada minuto, reclama y aplica correctamente. El
run `77e71e9d` del 2026-08-02 pasó `submit → reconcile → complete` y llegó a `candidate_ready` con cobro
único. `run_finalization_failed` con 12 intentos era **transitorio** y se resolvió solo. El defecto es la
ausencia de un límite y de una señal, no la ausencia de trabajo.

## Relacionado

- `TASK-1559` — proyección de estado terminal + card optimista. **Ya implementada** (Globe `7a7235f`): la
  card muestra el motivo de un fallo pre-run. Lo que este issue agrega es el estado terminal para un job
  que agotó reintentos, para que la card deje de decir «generando» sobre trabajo muerto.
- `TASK-1634` — supersede explícito en generated rights policies (el otro defecto del mismo día).
- Contexto del día: `HANDOFF-GLOBE-RIGHTS-INCIDENT.md`.
