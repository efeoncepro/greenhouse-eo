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

1. ✅ **Las señales.** **Cerrado y verificado en runtime el 2026-08-04** por `TASK-1469`
   (`efeonce-globe@c28ab9f`): tres `logging_metric` + tres `alert_policy` aplicadas y vivas en Cloud
   Monitoring, con `tofu plan` en `No changes`. En producción: `outboxTerminalAttempts=1` donde el contador
   viejo decía **3** para el mismo attempt. Ver el delta de abajo.
2. 🔴 **Preservar el motivo real.** `finalizationFailureCode` sigue cayendo a `run_finalization_failed` cuando
   el error no está en su allowlist. Correcto para no filtrar, pero deja cero rastro accionable — y por eso
   la clase `unknown` existe con tope 3. **Sigue abierto**; el 2026-08-03 se cerró un caso concreto
   (`generated_asset_governance_pending`), no el mecanismo.
3. ✅ **Proyectar el estado terminal a la card** (`TASK-1559`): un run en terminal debe dejar de decir
   «generando». **Cerrado 2026-08-03** (`efeonce-globe@bbbc9c1`): un run terminal cierra su experimento con el
   motivo real.

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

### Cerrada — `efeonce-globe@ac1999f`

**38 códigos** a `terminal`: identidad y estado de ruta (piden un humano que promueva o habilite, no un reintento),
presupuesto (el fence ya liberó la reserva; insistir contra un cap agotado no lo desbloquea), configuración de
endpoints y regiones, forma del request compilado, las ocho del contrato creativo y las once del body snapshot.

**3 a `transient`**, separadas a mano por ser las únicas del compiler que no son deterministas: el circuito abierto
se cierra solo cuando el proveedor se recupera, y las dos de decisión son fallas de persistencia, no del pedido.

**2 se quedan en `unknown` a propósito, y ahora está declarado por qué.** `route_compilation_failed` y
`route_dependency_unavailable` nombran «algo falló y no sé qué»: asumir determinismo mataría corridas recuperables,
asumir transitoriedad reviviría muertas. El tope 3 de `unknown` es la respuesta prudente a no saber, no un olvido.

**La regla quedó mecánica, no escrita.** `production-route-failure-classification.test.ts` rompe el build si una
razón nueva nace sin clasificar, y verifica los catch-all en la dirección contraria: si dejan de serlo, su entrada
queda mintiendo. Probado en rojo en ambas direcciones. Las diez apariciones de `ISSUE-127` probaron que acordarse no
funciona; lo que funciona es que el build no deje.

Lo que sigue abierto de este issue no cambia: las dos señales (`outbox_dead_letter`, `outbox_retry_storm`) y
preservar el motivo real cuando `finalizationFailureCode` cae al genérico. Este trabajo las vuelve útiles —ahora un
terminal es un terminal de verdad— pero no las crea.

## Delta 2026-08-03 — una pieza pagada y perdida: la intersección con `ISSUE-127` era el defecto

**El caso.** Una imagen fue aceptada por el proveedor a las 11:17 y **cobrada** (748 → 738 créditos). Su
finalización falló con el código genérico `run_finalization_failed`; la política lo clasificó `unknown` —tope 3—
y la corrida murió al tercer intento **con el gasto ya hecho**. El experimento quedó diciendo «generando» para
siempre. El día anterior el **MISMO** error, en el **MISMO** paso, se había recuperado solo tras **doce
entregas** y terminado `completed`.

Ése es el punto entero: **el tope de 3 no protegía de nada; cortaba trabajo sano a mitad de camino.**

> **La lección, y es la que hay que llevarse de este issue: un tope de reintentos aplicado sobre un código que
> perdió su nombre no es una política, es una apuesta.** `ISSUE-135` puso el tope confiando en una clasificación
> que `ISSUE-127` había hecho imposible — `run_finalization_failed` no es una causa, es el hueco donde nueve
> causas distintas se colapsan. Los dos issues estaban abiertos por separado, cada uno correcto en su propio
> marco, y **su intersección era el defecto**. Un issue de observabilidad y uno de resiliencia que se tocan no
> son dos issues: son uno.

### Los cuatro arreglos, en producción (los tres runtimes en `d58bc6f`)

`bbbc9c1` + `deffbd4`, ambos ancestros del SHA desplegado. Verificado en producción: generación completa, run
`completed`, experimento `candidate_ready`, pieza visible y **un solo cobro** (738 → 728).

1. **El nombre de la espera sobrevive al sanitizador.** El error real era
   `generated_asset_governance_pending` — el finalizador esperando a que Asset Governance termine con el output
   (C2PA, scan, elegibilidad). Estaba **fuera** de `SAFE_FINALIZATION_CODES`, así que se colapsaba en el
   genérico y la causa se perdía. Es el defecto de `ISSUE-127`, cometido sobre una espera.
2. **Se clasifica `waiting`**, simétrico a `completion_checkpoint_missing`. Las dos esperas del ciclo son la del
   proveedor y la de governance; con el nombre ya preservado, la política puede reconocerla. **Sin el paso 1
   este paso era imposible**: no se puede clasificar lo que no tiene nombre.
3. **La fase entra en la política.** La asimetría que un tope por-código no veía: **antes** del gasto abandonar
   devuelve el crédito y no pierde nada; **después** del gasto significa que el cliente pagó y no recibió. Dos
   errores con costo tan distinto no pueden compartir tope. Ahora `submit` mantiene los topes cortos y
   `reconcile`/`complete` le dan a lo no clasificado el margen de lo recuperable — lo genuinamente determinista
   (una autoridad de derechos ausente) sigue muriendo en su primera entrega también post-gasto.
4. **El ritmo depende de la clase.** El backoff exponencial existe para no martillar un sistema **caído**;
   governance no está roto, está trabajando. Aplicarle backoff sólo agrega latencia **después** de que el
   trabajo terminó: en la entrega 10 el techo de 5 minutos dejaba la pieza lista y sin publicar todo ese rato.
   Una espera vuelve a mirar a los **10 segundos**, con cadencia fija (`WAITING_POLL_MS`); un error conserva el
   backoff creciente, que es donde sirve. El worker corre por scheduler cada minuto, así que ése es el piso real
   de latencia — lo que la cadencia garantiza es que el job esté elegible en el **próximo tick** en vez de
   dormido cinco minutos.

**Y el ítem 3 de «lo que queda abierto» quedó cerrado de paso:** `governed_runs` y `experiments` son agregados
distintos y sus estados divergían — el store marcaba el run `failed` y **nadie** tocaba el experimento, que es lo
que la UI lee. Ahora un run terminal cierra su experimento con el motivo real (el puerto `abandon` es
obligatorio, para que quien no lo implemente rompa el build). No toca créditos a propósito: el settlement es
autoridad de otro dueño y ya decidió.

### Lo que sigue ABIERTO, y es el próximo paso recomendado

**Las dos señales no existen como señal.** `outboxDeadLetter` y `outboxRetryStorm` **se calculan en cada batch
del worker** (`readOutboxHealth` en `packages/database/src/stores/governed-run-store.ts:313-337`, emitidas en
`globe_worker_completed` desde `apps/studio-web/src/worker-main.ts:263-268`) y **no están cableadas a nada**: no
hay `google_logging_metric` ni `monitoring_alert_policy` para ellas en `infra/terraform/` —sí existen para
`queueOldestAgeSeconds`, `creditExpiryOldestAgeSeconds` y `globe_worker_failed`, que es exactamente el patrón que
falta replicar—. Hoy el número está en el JSON de un log que nadie consulta salvo un humano que va a buscarlo.

**Ésa es la brecha de fondo, y esta sesión la demostró completa.** Todo lo que se encontró —una pieza pagada y
perdida, cuatro experimentos huérfanos, producción cuatro commits atrás, un bug de React vivo en el composer
(`ISSUE-136`)— **lo encontró un humano preguntando, no el sistema avisando.** El tope evita el daño; la señal es
lo que convierte el daño evitado en algo que alguien sabe. Sin ella el patrón se repite: el arreglo funciona y
el próximo defecto vuelve a esperar a que alguien pregunte.

⚠️ **Y el nombre engaña, que es una trampa para el que venga a cablearlas.** `outboxDeadLetter` **no** cuenta
filas de la outbox en estado `dead_letter` — ese estado **no existe** en el vocabulario de
`governed_run_outbox`. Cuenta **attempts** en `state='failed'` con `terminal_at IS NOT NULL` dentro de una
ventana de 24 h sobre `updated_at`. Consultar la tabla buscando ese estado devuelve vacío y hace concluir que la
señal está rota cuando está bien. La ventana es deliberada: sin ella un dead-letter de hace un mes mantendría la
alerta encendida para siempre y el equipo aprendería a ignorarla.

Lo demás abierto no cambia: **preservar el motivo real** cuando `finalizationFailureCode` cae al genérico. Este
trabajo cerró el caso concreto de la espera de governance agregándola a la allowlist, pero **el mecanismo sigue
siendo una allowlist**: el próximo código que no esté en ella se vuelve a borrar, y la clase `unknown` con tope 3
seguirá tomando decisiones sobre un hueco. La regla de nacimiento de la clasificación ya es mecánica
(`production-route-failure-classification.test.ts`); la de preservación del nombre todavía no.

## Delta 2026-08-03 (b) — las señales quedaron cableadas, y medían mal

`TASK-1469` cerró el punto 1. Lo que hay que saber antes de leer el número:

🔴 **La señal no tenía sólo mal el nombre: contaba filas de outbox en vez de attempts distintos.** Un attempt
tiene una fila por fase (`submit`/`reconcile`/`complete`), así que multiplicaba cada muerte por tres — medido
contra el runtime sobre la corrida perdida de este issue: **`dead_letter = 3` para UN solo attempt**. Cablearla
tal cual habría producido una alerta cuyo valor no corresponde a ninguna cantidad real de trabajo, que es la
forma lenta de enseñarle al equipo a desconfiar del dato. Es la propia clase de defecto de este issue aplicada
a su instrumento: el número existía, y no decía lo que parecía decir.

Y **`governed_run_outbox.state='dead'` SÍ existe** (CHECK de la migración `0014`) con 4 filas, escritas por un
camino distinto (`credit-ledger-store.ts`, recuperación histórica de crédito); el cierre terminal de un job
escribe `done`. Por eso la señal pasa a llamarse `outboxTerminalAttempts` — por lo que mide — y su contrato
documenta quién escribe el estado que el nombre viejo prometía. Corrige la nota previa que decía que el estado
no existía todavía.

Cableado: 3 `logging_metric` + 3 `alert_policy` (`outbox_terminal_attempts` ERROR sin espera,
`outbox_retry_storm` WARNING con ventana, `run_aggregate_divergence` ERROR). La tercera es de `TASK-1469` y
detecta una divergencia entre agregados que el barrido no pudo cerrar. **Aplicado y verificado el 2026-08-04**,
con `tofu plan` posterior en `No changes`.

⚠️ Un detalle del apply que vale para la próxima alerta: **el aligner es función del TIPO de métrica**.
`ALIGN_COUNT` sólo vale sobre DELTA/INT64 (como `failure`, que cuenta entradas de log); una métrica que
extrae un valor es DELTA/DISTRIBUTION y necesita `ALIGN_PERCENTILE_99`. Copiarlo de la alerta hermana
equivocada falla con un 400 en el apply, no antes.

Sigue abierto el punto 2 — preservar el motivo real cuando `finalizationFailureCode` cae al genérico.

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
