# ISSUE-137 — Globe: experimentos en `running` para siempre con CERO intentos, y el worker cierra limpio cada minuto

> **Estado:** Resolved — verificado en producción el 2026-08-04 tras cambiar Asset Governance a `*/1`.
> **Detectado:** 2026-08-03 · **Ambiente:** Globe producción (`globe-producer-worker`, Cloud Run job)
> **Severidad:** ⚠️ **Reclasificada el 2026-08-04 — ver el Delta al final antes de leer lo de abajo.** La
> premisa original («colgados para siempre», «crédito inmovilizado») quedó **refutada por readback**: los
> runs completaron y el crédito se liquidó. Lo real es latencia de ~20 min sin señal en pantalla.
> Severidad original declarada: Alta.
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)

## Síntoma

Experimentos de Globe quedan en `state: running` para siempre. En la UI del Producer se ven como
«generando» indefinidamente. **Nunca completan ni fallan.**

## Evidencia medida (2026-08-03)

Ejemplo reproducible:

```
experimentId     : 96c0ddcd-07bc-4bcc-8de5-d39b74ddbc97
workspace        : greenhouse-org:efeonce
createdAt        : 2026-08-03T19:58:57.770Z
updatedAt        : 2026-08-03T19:58:58.015Z      ← 0,3 s después del createdAt
capability       : image-generate
ruta             : ref/still/rrss-v1
modelo           : Seedream 5 Pro (v5-pro) · provider: fal
attempts         : []                             ← VACÍO
reservedCredits  : 10   ·  spentCredits: 0  ·  hardCapCredits: 100
```

El run **no se volvió a tocar** en más de seis minutos de observación: `updatedAt` quedó 0,3 segundos
después del `createdAt` y ahí se congeló.

Mientras tanto, el Cloud Run Job `globe-producer-worker` **corre cada minuto y cierra limpio**
(`globe_worker_completed`, `Container called exit(0)`) **sin tomar ese trabajo**. Verificado en las
ejecuciones de las 20:01, 20:02, 20:03 y 20:04.

### No es un caso aislado ni nuevo

- Hay un **segundo run idéntico desde las 11:16 del mismo día** — nueve horas, `attempts: 0`, mismo
  patrón — **creado antes del trabajo de esta sesión**.
- Distribución de los 24 experimentos del workspace interno: **11 `candidate_ready`, 10 `failed`,
  2 `running` colgados, 1 `estimated`**.

## Impacto

La reserva de créditos queda **retenida sin convertirse en gasto**, así que no hay pérdida económica
directa — pero el crédito queda inmovilizado y **ningún readback distingue un run colgado de un run
legítimo en curso**. En la UI el usuario ve «generando» para siempre, sin ninguna señal de error.

## Familia — misma clase que ISSUE-135, con el disfraz contrario

Es la misma familia que
[`ISSUE-135`](ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) («la outbox de governed
runs reintenta infinito, en silencio y sin dead-letter»), donde un run llegó a **705 entregas** y en
la UI también se veía «generando» para siempre.

El disfraz es el contrario:

| | ISSUE-135 | ISSUE-137 (este) |
| --- | --- | --- |
| Comportamiento | el trabajo se reintenta **sin techo** | el trabajo **no se intenta ni una vez** |
| `attempts` | 695 → 705 | `[]` (cero) |
| Síntoma en UI | «generando» para siempre | «generando» para siempre |

En **ambos** casos el estado divergía y **ninguna verificación lo miraba**. Ese es el patrón que une
a los dos, no el mecanismo.

## Regla aplicada al diagnosticar (queda escrita)

**NO se reintentó el envío.** La disciplina del repo es **readback-first**: un segundo submit a
ciegas sobre un run que puede estar recuperable **crea un segundo cobro**. Primero se lee el estado
por sus readers, después se decide.

## Investigación sugerida (hipótesis a verificar, NO conclusiones)

1. **¿El `execute` encoló trabajo en `governed_run_outbox`, o el run quedó reservado sin entrada?**
   Si la reserva de crédito y el encolado no son atómicos, un run puede nacer reservado y sin trabajo
   que lo mueva.
2. **¿El claim del worker filtra por algo que estos runs no cumplen?** El claim vive en
   `packages/database/src/stores/governed-run-store.ts` y usa `FOR UPDATE OF o SKIP LOCKED` con un
   predicado de reclamabilidad. Un run invisible a ese predicado explica el `exit(0)` limpio cada
   minuto sin tomar el trabajo.
3. **¿Hay una señal de confiabilidad que debiera detectar «run reservado sin attempt tras N
   minutos»?** **Hoy no existe** — y ese es probablemente el hallazgo más accionable de este
   incidente: sin esa señal, un run colgado sólo se descubre cuando una persona lo mira.

## Solución (historial pre-arreglo)

Pendiente. El orden propuesto era: (a) determinar cuál de las dos hipótesis de encolado/claim aplica
con readback sobre los dos runs colgados, (b) cerrar la causa de raíz, (c) **crear la señal de
«reservado sin attempt tras N minutos»**.

**El paso (a) ya se ejecutó y refutó las dos hipótesis. Ver el Delta de abajo antes de trabajar sobre
esta issue: el plan anterior lleva a dos callejones sin salida.**

## 🔴 Delta 2026-08-04 — el readback refuta las dos hipótesis: los runs NUNCA estuvieron colgados

Medido contra `globe-pg` con la identidad IAM del operador, sólo lecturas. **Ningún experimento quedó
`running`**: los tres del 2026-08-03 alcanzaron estado terminal.

| experimento | creado | estado final | run | reloj |
|---|---|---|---|---|
| `cb8d60e9` (el «de las 11:16») | 11:16:41 | `failed` | `failed` | cerrado por el barrido de `TASK-1469` |
| `f6b20e70` | 12:49:51 | `candidate_ready` | `completed` | 24,4 min |
| `96c0ddcd` (el del incidente) | 19:58:58 | `candidate_ready` | `completed` | 22,3 min |

**La ventana de observación del incidente (seis minutos) fue más corta que la latencia real.** De ahí
salió «no se vuelve a tocar» — el run se tocó, pero después de que dejamos de mirar.

### Las dos hipótesis, refutadas con evidencia

1. **«Reserva sin encolado»** — falso. `DurableGovernedRunStore.create()` inserta `governed_runs` +
   `governed_run_attempts` + el `enqueue` del job `submit` **en UNA transacción**. No hay ventana.
2. **«El claim filtra estos runs»** — falso, y por un margen enorme: el `submit` se tomó en **15
   segundos** (`provider_submission_accepted` 19:59:13 sobre `run_approved` 19:58:58). El otro run,
   en 22 s. El worker sí tomó el trabajo.

El proveedor tampoco es el culpable: 136 s y 107 s de generación.

### La causa real — Asset Governance avanza UNA etapa por ejecución programada

La evidencia por etapa del job `agj_ca3200528a0ce099450113592bc76c96` es concluyente:

```
inspection  20:05:21  ·  malware 20:10:29  ·  c2pa 20:15:25  ·  rights 20:20:19
```

**Exactamente 5 minutos entre etapas**, que es el cron de `globe-asset-governance` (`*/5 * * * *`).
Cada ejecución del Job dura **~15 segundos** y avanza **una sola** etapa: `runGovernanceBatch` hace
`claimDue` una vez por batch y procesa cada lease una vez; el job avanza de etapa y espera al tick
siguiente. Cuatro etapas × 5 min = **~20 minutos de reloj para ~60 segundos de trabajo real**. Las
tres mediciones del día concuerdan: 906 s, 1083 s, 1085 s.

Mientras tanto el job `complete` de la outbox **espera bien**: reintenta con
`generated_asset_governance_pending` hasta 20 entregas, y su último reintento (20:20:25) cae **6
segundos después** de que governance llegó a terminal (20:20:19). El experimento se finaliza 20:21:16.
El encaje causal es exacto en los dos runs.

**O sea: el mecanismo es CORRECTO — el sistema espera en vez de finalizar antes de tiempo. Lo que
está mal es que espera 20 minutos por 60 segundos de trabajo.**

### El defecto que explica por qué el diagnóstico salió mal (y es el más valioso)

🔴 **El experimento se lee `running` con `attempts: []` durante TODA la ventana**, aunque el attempt ya
existe, ya fue aceptado a los 15 s y ya completó a las 20:01:30. La vista del experimento **no
proyecta el attempt en vuelo**: sólo se puebla al finalizar.

Por eso un run sano en curso es **indistinguible de uno colgado** — que es exactamente el impacto que
esta issue nombró. Pero la atribución era incorrecta: no falta una señal de «reservado sin attempt
tras N minutos», **falta que el agregado del experimento proyecte el estado del attempt que ya
tiene**. Una señal nueva sobre el dato equivocado habría alertado sobre corridas perfectamente sanas.

### Defecto secundario de observabilidad — la fila se cierra ANTES del instante que declara

La fila `complete` de la outbox es internamente contradictoria:

```
state=done   completed_at=20:01:29.739   available_at=20:20:25.843   delivery_attempt=20
```

Una fila no puede completarse 19 minutos **antes** de su propia última reprogramación. El evento
`run_finalized` lleva el mismo sello (20:01:29.739) cuando el experimento se finalizó a las 20:21:16.
El rastro de auditoría afirma que el run finalizó 20 minutos antes de lo que ocurrió, porque el cierre
se sella con el instante de **completitud del proveedor** en vez del de finalización. Es lo que vuelve
imposible reconstruir esta latencia leyendo el run.

### Confirmación colateral de que el arreglo de `ISSUE-138` funciona

El run de las 12:52 murió con el genérico `run_finalization_failed`; el de las 20:01, con
`generated_asset_governance_pending` **nombrado**. Es la allowlist `SAFE_FINALIZATION_CODES` operando:
el arreglo entró entre ambos y se ve en producción.

### Lo que queda por decidir (NO ejecutado — cambia comportamiento de un pipeline de governance)

- **Drenar el batch**: tras aplicar una etapa, seguir procesando el mismo job en la misma ejecución en
  vez de esperar al tick. Sólo debe avanzar de inmediato lo que **aplicó**; una etapa que
  `rescheduled` con backoff conserva su espera, o se convierte un backoff en un bucle caliente.
  Bajaría ~20 min a <1 min. Toca semántica de lease y fencing: pide decisión explícita.

  **Verificado que el espaciado NO es deliberado del dominio**, que era el supuesto capaz de invalidar
  este arreglo: `processAssetGovernanceLease` resuelve **una** etapa por llamada (`activeStage(state)`)
  y en éxito llama `store.advance`; el único retraso que introduce es el backoff de `retry()`, y sólo
  en los caminos de fallo. Los 5 minutos salen de que `runGovernanceBatch` hace `claimDue` **una vez**
  antes del loop, así que el job ya avanzado no se vuelve a tomar en esa ejecución. Es artefacto de la
  estructura del batch, no una decisión de aislamiento entre etapas.
- **Proyectar el attempt en vuelo** en la vista del experimento, para que «generando» diga en qué va.
- **Sellar el cierre con el reloj de la finalización**, no con el de la completitud del proveedor.

**Reclasificación honesta:** esto no es «runs colgados para siempre» (severidad alta por crédito
inmovilizado). Es **latencia de ~20 minutos sin ninguna señal en pantalla**, que es un defecto de
producto real pero distinto. El crédito no queda inmovilizado: se liquida al finalizar.

## Verificación histórica

⚠️ **Los tres criterios de abajo se escribieron sobre la premisa refutada.** El primero ya se cumplió
(los tres experimentos son terminales y el crédito se liquidó); el tercero apunta al dato equivocado
—una señal de «reservado sin attempt» habría alertado sobre corridas sanas—. Se conservan como
trazabilidad, no como criterios de cierre de esta issue:

- El tiempo entre `run_finalized` del proveedor y la finalización del experimento baja de ~20 min a
  menos de un ciclo del worker, medido sobre una generación real.
- Durante la espera, la vista del experimento expone el attempt en vuelo y su etapa: «generando» dice
  en qué va, y un run sano deja de ser indistinguible de uno atascado.
- Ninguna fila de outbox `done` puede tener `completed_at` anterior a su propio `available_at`.

🔴 **Esos dos últimos NO se cerraron con esta issue y tienen dueño declarado: `TASK-1469`** (Globe
Governed Run Lifecycle, Submission Fence and **Provider Completion**), que ya declara en su Scope
*«Model progress as honest lifecycle phase/attempt/provider evidence… When no granular evidence exists,
expose a coarse state»*. Están registrados con su evidencia en su
[Delta 2026-08-04](../../tasks/in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md).
Se anota acá porque **un criterio vigente dentro de una issue resuelta es un huérfano**: nadie relee una
issue cerrada, y así es como una deuda medida se pierde.

Criterios originales, conservados por trazabilidad:

- Los dos runs colgados (`96c0ddcd-07bc-4bcc-8de5-d39b74ddbc97` y el de las 11:16) transitan a un
  estado terminal o registran un `attempt` real, y su crédito reservado se libera o se convierte en
  gasto.
- Un experimento nuevo del mismo shape (`image-generate`, `ref/still/rrss-v1`, Seedream 5 Pro sobre
  `fal`) registra `attempts` dentro del primer ciclo del worker.
- La señal de confiabilidad propuesta reporta los runs colgados **antes** de que los mire una
  persona, y se prueba en rojo contra este caso.

## Relacionado

- [`ISSUE-135`](ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) — misma familia
  (estado divergente que nadie verifica), mecanismo inverso.
- [`ISSUE-127`](ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md) — códigos genéricos
  de Globe que esconden causas accionables; relevante si al destapar la causa el error queda
  colapsado en un código sin nombre.
- `TASK-1635` — el incidente **se descubrió** al ejercitar una generación real desde el loop local de
  esa task, pero es **anterior e independiente** de ella: lo prueba el run colgado desde las 11:16,
  creado antes de ese trabajo. **No es atribuible a TASK-1635.**

## ✅ Resolución post-arreglo — 2026-08-04

El cambio quedó aplicado en `efeonce-globe` `main`, commit
[`d78ce01`](https://github.com/efeoncepro/efeonce-globe/commit/d78ce015ee2f96690b7431bd7e0f9094d52f6456):
`asset_governance_schedule` pasó de `*/5 * * * *` a `*/1 * * * *`. El plan supervisado fue
`0 to add, 1 to change, 0 to destroy`, el apply fue `0 added, 1 changed, 0 destroyed` y el plan
posterior quedó en `No changes`. Readback live del Scheduler, en la región correcta:

```
*/1 * * * *    ENABLED
```

### Readback durable del video

Se leyó el experimento por los readers canónicos, sin `prepare`, `execute`, retry ni segundo submit:

| Campo | Evidencia |
|---|---|
| experimento | `94f8f374-c1c9-4379-8dbc-aa0254908049` |
| creado → final | `2026-08-04T10:23:18.496Z` → `2026-08-04T10:31:12.454Z` |
| latencia end-to-end | **473,958 s = 7,90 min** |
| estado | `candidate_ready` |
| attempt | `b6eaa035-4a09-4a59-98e1-026683eca821`, `candidate_ready` |
| output | MP4, `1.341.307` bytes, `retained: true`, `outputsRetained: true` |
| output/provenance readers | handle devuelto; `active`, `clean`, `rights=verified`, `governance=eligible` |
| créditos | `reservedCredits=16`, `spentCredits=16` |
| ledger | una reserva de `+16` y un settlement de `-16/+16`, sin release ni duplicado |

No hubo `failureReason`: el estado fue `candidate_ready`. El reader de créditos registró el settlement
con `attempts: [{ outcome: "succeeded" }]`.

### Evidencia de las cuatro etapas

La evidencia durable del job `agj_3013c9139f60c838e9253df682532f75`, leída en `globe-pg`, fue:

| etapa | `observedAt` UTC | veredicto | desde la etapa anterior |
|---|---:|---|---:|
| inspection | 10:27:18.033 | `accepted` | — |
| malware | 10:28:26.724 | `clean` | 68,691 s |
| c2pa | 10:29:18.430 | `unverified` | 51,706 s |
| rights | 10:30:18.028 | `authorized` | 59,598 s |

El job fue creado a las `10:27:14.212` y llegó a `terminalAt=10:30:17.992`: **183,780 s** de
governance; entre la primera y la última evidencia fueron **179,995 s**. Las cuatro etapas volvieron
a avanzar en ticks de aproximadamente un minuto.

### Comparación y veredicto

La imagen `7779d6ac-104b-40e6-85e0-bb469e588176` midió `472 s = 7,9 min` de end-to-end y `183 s`
de governance. El video midió `473,958 s = 7,90 min` y `183,780 s`, pese a ser otra modalidad y
tener un output de `1.341.307` bytes frente a los `7.572.596` bytes de la imagen. Frente a las líneas
base de **22,3 y 24,4 min**, ambas corridas post-arreglo convergen en ~8 min; la governance de ~3 min
es independiente del tamaño observado y confirma que la latencia era cadence-bound, no size-bound.

**Veredicto:** los criterios post-arreglo quedan cumplidos. ISSUE-137 se cierra y el documento se
mueve a `docs/issues/resolved/`.
