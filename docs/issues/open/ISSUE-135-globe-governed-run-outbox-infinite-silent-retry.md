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

## Delta 2026-08-02 — mitigado y parcialmente resuelto

**El zombi está neutralizado.** `run-cancel` sobre `3c1fe091` por el carril de operador
(run `30765996641`): llegó a **705 entregas** —diez más sólo durante el diagnóstico— y quedó
`run_state: cancelled`, `outbox_state: done`. Deja de consumir lease cada minuto.

**El tope existe.** Globe `packages/domain/src/governed-run-failure-policy.ts` + su cableado en
`reschedule()` (`governed-run-lifecycle.ts`).

Hallazgo que redujo el trabajo a una fracción: **el camino terminal del store ya estaba implementado
completo** — `reschedule({terminal: true})` cierra el lease, marca el intento y el run como `failed`— y
**nadie lo invocaba nunca**. El lifecycle pasaba `terminal: false` siempre. No hacía falta maquinaria
nueva: hacía falta decidir cuándo pasar `true`.

**Por qué no alcanzaba un tope único.** Un insumo que no resuelve nunca va a resolver; un 5xx del
proveedor se recupera solo. Con un número único o matas corridas recuperables o dejas vivas las muertas.
La decisión se toma por **clase de error**, y el tope queda como red de seguridad de lo no clasificado:

| Clase | Tope | Ejemplo |
|---|---:|---|
| `terminal` | 1 | `provider_input_resolution_failed`, `generated_rights_policy_not_authorized` |
| `unknown` | 3 | `run_finalization_failed` (el fallback genérico) |
| `transient` | 25 | `fal_adapter_upstream_error`, `output_ingest_unreachable` |
| `waiting` | 240 | `completion_checkpoint_missing` |

La clase `waiting` es la guarda que evita convertir el fix en un apagón: `completion_checkpoint_missing`
**no es un fallo**, es la espera normal de una corrida en vuelo contada por el mismo contador. Un tope bajo
ahí cancelaría toda generación que tarde más que su backoff.

Un cierre terminal ahora se reporta como `applied` y no como `rescheduled`, así la métrica del batch deja de
contar como «reprogramado» algo que murió.

7 tests nuevos; `packages/domain` 456 → 457.

## Lo que queda abierto

1. **Las señales.** `globe.run.outbox_dead_letter` y `globe.run.outbox_retry_storm` (umbral 10, ya expuesto
   como `isRetryStorm`) todavía no existen como señal observable. Sin ellas el tope evita el daño pero nadie
   se entera de que algo murió.
2. **Preservar el motivo real.** `finalizationFailureCode` sigue cayendo a `run_finalization_failed` cuando
   el error no está en su allowlist. Correcto para no filtrar, pero deja cero rastro accionable — y por eso
   la clase `unknown` existe con tope 3.
3. **Proyectar el estado terminal a la card** (`TASK-1559`): un run en terminal debe dejar de decir
   «generando».

## Delta 2026-08-02 (b) — la clasificación necesita una regla de nacimiento, no sólo una lista

Auditoría de `TASK-1633`: los rechazos del contrato creativo de ruta **no están en `TERMINAL_CODES`** pese a
cumplir el criterio de admisión textual de esa lista —*"si dos entregas separadas por una hora dan el mismo
resultado sin que nadie toque nada, va acá"*—. Un contrato desajustado es determinista por definición. Hoy caen a
`unknown`, tope 3: tres entregas gastadas en algo imposible, contadas como `rescheduled`.

El tope funcionó —no hay 705 entregas— y ése es el punto: **la red de seguridad hizo su trabajo y por eso el
defecto de clasificación queda invisible.** Tres reintentos no llaman la atención de nadie.

Y hay un acoplamiento con `ISSUE-127` que conviene nombrar: **un código sin razón nombrada tampoco se puede
clasificar**, porque las nueve causas que hoy colapsan en `route_creative_contract_mismatch` comparten un único
token. Abrir las razones y clasificarlas es un solo trabajo, no dos.

La regla que falta no es otra fila en la lista: es de **nacimiento**. Todo código de rechazo determinista se
clasifica en el mismo commit que lo introduce, igual que `ISSUE-127` exige su razón de servidor en el mismo commit
que escribe el `catch`. Declarado como invariante en `TASK-1633` (`### Security and access`) y en su Files owned.

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
