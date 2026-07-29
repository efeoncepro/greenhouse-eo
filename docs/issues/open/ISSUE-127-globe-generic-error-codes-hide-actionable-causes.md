# ISSUE-127 — Cuatro códigos genéricos de Globe esconden causas accionables distintas, y el canary de generación quedó bloqueado detrás de tres de ellos

## Ambiente

production — Globe (`globe-api-internal`, `efeonce-globe`), workspace `greenhouse-org:efeonce`. Detectado ejerciendo el canary real de gasto, no leyendo código.

## Detectado

2026-07-26, en cuatro apariciones sucesivas del **mismo defecto de observabilidad** durante un solo intento de generar imagen y video con gasto real.

## Síntoma

Un operador —humano o agente— que intenta generar no puede saber **qué control lo rechazó**. Cuatro códigos distintos colapsan causas que exigen acciones opuestas:

| Código | Causas que colapsa | Estado |
|---|---|---|
| `409 conflict` (crédito) | `approval_expired` vs `approval_invalid` vs `approval_self_confirmed` vs `pool_not_active` vs `policy_already_active` vs `version_conflict` vs `replay_fingerprint_mismatch` vs negaciones del ledger | ✅ **cerrado** (TASK-1566 Slice A, revisión `00097-s58`) |
| `runner_error` | **todo** fallo del runner que no traiga un `reason` de nuestro vocabulario | ✅ **cerrado** (revisión `00098-45x`) |
| `ProductionRouteDependencyError` | **28 sitios de throw sin argumento**: allowlist vacío, endpointId duplicado, endpoint ausente, provider que no calza, URL malformada, origin no permitido, regiones inválidas, persistencia de la decisión, forma del request compilado, placeholder de input no autorizado | ✅ **cerrado** (`17329f6`, 12 razones) |
| `authentication_required` (API mode) | clase de credencial equivocada vs `--include-email` ausente vs audiencia incorrecta | 🔴 **abierto** |

## Causa raíz

**No es un bug: es una sanitización correcta sin su contraparte de observabilidad.**

Cada uno de los cuatro códigos existe por una razón legítima — no filtrar saldos, política, prosa de proveedor ni detalle de credencial por una taxonomía compartida. El defecto es que la sanitización se aplicó **sin dejar rastro del lado del servidor**, así que la información no se protegió: se **destruyó**.

El precedente correcto ya existía en el repo y no se replicó: `globe.dispatch.invalid_request` emite un log de servidor con el campo que falló, precisamente porque *"el código es sanitizado a propósito: no puede decirle al caller qué campo falló, pero el servidor sí necesita saberlo"*.

**El descubrimiento en cadena es la evidencia más fuerte de que es un patrón y no tres bugs sueltos:** arreglar `runner_error` (segunda fila) hizo aparecer la tercera **en el primer canary posterior**. El evento nuevo reportó `errorName=ProductionRouteDependencyError, reasonShape=absent` — nombró la clase, y `reasonShape=absent` probó que la clase no llevaba causa. Sin ese arreglo, la tercera fila seguiría invisible.

## Impacto

- **El canary de generación estuvo bloqueado por tres códigos opacos encadenados.** Dos agentes distintos gastaron horas: uno concluyó *"la proyección de tenancy expiró, hay que renovar la sesión"* (síntoma, no causa) y el otro aceptó ese encuadre antes de verificarlo.
- **Un `409` no prueba lo que parece probar.** `ISSUE-124` reportó *"corrió con aprobación maker/checker válida"* — y con la taxonomía colapsada, una aprobación **inválida** devolvía el mismo código. La afirmación nunca estuvo probada por el 409.
- **Créditos:** ninguno perdido. El fence liberó las reservas correctamente en los dos intentos (`spentCredits=0`).

## Solución

Tres cerradas, una abierta:

1. ✅ **Fase de negación de crédito** — enum cerrado con cobertura verificada en las dos direcciones (un valor nuevo sin su entrada rompe el build), acompañando al `conflict` sin cambiar código ni status. Viaja en el body, que el BFF reenvía verbatim.
2. ✅ **`runner_error` observable** — port inyectado (`UnclassifiedRunnerFailurePort`), no un `console` en el dominio, que es transport-neutral. El campo más útil es `reasonShape` (`absent` / `not-a-string` / `malformed`): separa *"el adapter no puso reason"* de *"puso uno malformado"* — dos bugs distintos, el segundo invisible sin esto.
3. ✅ **`ProductionRouteDependencyError` con 12 razones**, separando las causas de **endpoint** de las del **compiler**: un fallo de región se leía idéntico a un allowlist mal armado, y son dueños distintos.
4. 🔴 **`authentication_required` sigue colapsado.** Las tres causas exigen acciones opuestas —cambiar de carril de credencial, agregar `--include-email`, corregir la audiencia— y hoy son el mismo 401/403. Aplicar el mismo patrón: razón de servidor, sin exponer nada del token.

**Regla que se deriva, y vale más que los cuatro fixes:** una sanitización sin contraparte de observabilidad no protege información — la destruye. **Todo código canónico que colapse más de una causa accionable nace con su razón del lado del servidor**, y el payload de esa razón lleva el nombre del control, jamás el `message`, el `stack`, el body del upstream ni nada derivado del payload (la prohibición de filtrar detalle interno aplica a los logs igual que al cliente).

## Verificación

- Los tres fixes cerrados tienen test, y el de la fase **está probado en rojo** (una fase con dígito, SQL o sufijo `_id` rompe el test).
- El del runner verifica que el evento serializado **no** contenga `<html>`, `500 Internal` ni `stack`, y tiene el negativo: cuando el `reason` **sí** es clasificable, el canal no se usa.
- Pendiente: re-correr `pnpm producer:canary` con `17329f6` desplegado y confirmar que reporta **cuál** de las 12 razones falla, en vez de `runner_error`.

## Delta 2026-07-26 — siete capas, y la séptima corrige a la sexta

**El canary corrió cuatro veces con gasto real. Cero créditos perdidos** (el fence liberó cada reserva, `spentCredits=0`). No generó. Pero la cadena de diagnóstico quedó construida, y su forma es el hallazgo:

| # | Capa | Cómo se descubrió |
|---|---|---|
| 1 | `409 conflict` de crédito | leyendo `dispatch.ts` |
| 2 | `runner_error` mudo, **con la ventana de logs vacía** | corriendo el canary |
| 3 | `ProductionRouteDependencyError` sin `reason` (28 sitios) | **el fix de la capa 2 lo destapó** (`reasonShape=absent`) |
| 4 | `route_compilation_failed`: el catch-all | el canary, con las 12 razones ya desplegadas |
| 5 | 🔴 **el catch DESTRUÍA las razones nombradas** | **leyendo el compile, no desplegando** |
| 6 | `endpoint_url_not_permitted` | el canary, con el re-throw ya desplegado |
| 7 | 🔴 **ese label era MÍO y estaba MAL** | leyendo la config de endpoints y viendo que **las tres entries pasan** |

**Capa 5 — el bug que explicaba las cuatro anteriores.** `deny()` lanza `ProductionRouteDeniedError`, que el catch **sí** re-lanza; pero `#requests.compile` y `assertCompiledProviderRequest` lanzan **`ProductionRouteDependencyError`**, que el catch **no** contemplaba, así que caía en el catch-all y **le reemplazaba la razón**. Las 12 razones existían y ese catch las destruía justo en los dos caminos que más importan. Cerrado con un `instanceof` re-throw.

**Capa 7 — error propio, de la clase que más daño hace.** Al nombrar las 28 razones usé una heurística con `endpoint_url_not_permitted` como **bucket por defecto**. Sólo las líneas 110-128 son aserciones de URL; **las 133-167 son el sanitizador del body snapshot** (profundidad, binarios, claves secretas, prefijos `Bearer`/`Key`, `data:` URIs, tamaño). Doce chequeos quedaron etiquetados como config de endpoint, y **el label me mandó a mí mismo a leer la config equivocada**. Corregido: las doce tienen su propio nombre `snapshot_body_*`.

> **Un bucket por defecto que abarca 17 sitios no es una razón nombrada — es una razón inventada.** Una heurística sirve para acotar 28 causas a un puñado, pero si el bucket tapa familias distintas hay que abrirlo **antes** de shippearlo. Un label equivocado dirige mal, y eso es peor que no tener label.

> **Y la lección de método que el operador impuso y funcionó:** perseguir un error por deploy encuentra síntomas en serie; **leer el camino completo encuentra el que los explica.** Las capas 1-4 costaron un deploy cada una; la 5 se vio en treinta líneas de lectura. Cuando el n-ésimo fix destapa una capa n+1, **deja de desplegar y lee.**

### Bloqueo vigente, ahora acotado con precisión

El `execute` de imagen (ruta `ref/still/rrss-v1` → `fal.seedream.text-to-image`) es rechazado por el **sanitizador del body snapshot**, no por la config del endpoint. Sospechosos, por cómo `buildBody` arma las referencias con `placeholder(input)`: `snapshot_body_inline_data_uri` (un `data:` URI), `snapshot_body_too_large` (>256 KB por string o el tope del snapshot completo), `snapshot_body_binary_key` o `snapshot_body_credential_like`.

**El próximo paso NO es otro deploy.** Es leer `buildBody` de `fal.seedream.text-to-image` (`governed-production-composition.ts:205`) contra los doce chequeos de `safeSnapshotBody` (`production-route-composition.ts:133-167`) y encontrar cuál viola. Es el mismo método que resolvió la capa 5.

## Delta 2026-07-26 (c) — NOVENA aparición, en código escrito mientras se arreglaban las ocho anteriores

**El dato que vale más que todo el issue:** el mismo defecto reapareció en
`src/lib/globe/credit-administration-broker.ts`, escrito **el mismo día**, por el mismo agente, en la
misma sesión en que se cerraban las ocho capas previas.

Su `catch` de `dispatch` sanitizaba hacia el caller —correcto— y **no dejaba ningún rastro del lado
del servidor** —incorrecto—. Medido en vivo: ejercitando la ruta gobernada apareció un `503`
`globe_unavailable` propio y **fue imposible diagnosticarlo desde el servidor**. La causa real era que
el ADC humano no puede impersonar al workload caller, pero eso hubo que descubrirlo por fuera.

Corregido: emite `{event, phase, errorName}` — nunca `message`, `stack` ni body del upstream (un fallo
de credenciales trae el correo de la identidad; uno de Globe puede traer saldo). La **fase** importa
porque `propose` y `confirm` fallan por razones distintas y exigen acciones distintas.

> **La conclusión operativa del issue completo, y la razón de que siga abierto como referencia:**
> conocer la regla no la aplica sola. Nueve apariciones, la última cometida por quien acababa de
> documentar las ocho. Lo que sí funciona es **mecánico**: al escribir un `catch` que sanitiza,
> escribir en el mismo commit su línea de servidor. No es disciplina, es un paso del procedimiento.

**Estado de las cuatro filas de la tabla original:** tres cerradas; `authentication_required` en API
mode **sigue abierta** — sus tres causas (clase de credencial equivocada, `--include-email` ausente,
audiencia incorrecta) siguen colapsadas en el mismo 401/403. Es el único trabajo pendiente del issue.

## Delta 2026-07-26 (b) — capa 8: el control que rechazaba, encontrado leyendo (commit `4eee1cc`)

Se hizo esa lectura y **apareció la causa, sin desplegar nada**. El método funcionó por segunda vez.

**`Key visual` no es una credencial.** El prompt del canary de imagen (`scripts/producer-ui-canary-lib.mjs:10`) empieza con `'Key visual editorial para Efeonce Globe: ...'`. El sanitizador marcaba como credencial **cualquier** string que empezara con `Key `/`Bearer ` —la regla era `^(?:Bearer|Key)\s+`, prefijo y nada más—, así que el término de dirección de arte del equipo se leía como material secreto. **Ese falso positivo es todo el bloqueo del `execute`.**

Encaja exacto con la capa 7: el rechazo llegaba etiquetado `endpoint_url_not_permitted`, que mandaba a revisar la config del endpoint — y estaba bien, porque **el endpoint nunca estuvo involucrado**.

**Dos hipótesis previas murieron leyendo, no desplegando** (que es el punto):
- Los cuatro sospechosos de la capa 7 asumían que `buildBody` arma referencias con `placeholder(input)`. El de `text-to-image` **no llama `placeholder` en absoluto**: el body son cuatro escalares (`prompt`, `output_format`, `num_images`, `image_size`). `credential_like` estaba en la lista, pero por la razón equivocada.
- `vertexProject` vacío habría roto el regex de la URL de vertex en el **constructor** (que valida las 12 entries, no 3) y habría bloqueado toda ruta, incluida fal. `GLOBE_LAB_VERTEX_PROJECT` está **sin setear** → cae al default `'efeonce-globe'`. Descartada contra el runtime.

**El fix es al control, no al prompt.** Una credencial serializada es **un token opaco, no una frase**: ahora se exige que el resto sea un token único, sin espacios, ASCII de credencial y anclado al final. `Bearer eyJhbGci...` y `Key <id>:<secret>` (el formato real de fal) se siguen atrapando; la prosa no. Sube la precisión sin bajar el alcance contra credenciales reales — ningún token real lleva espacios ni acentos.

> **No se tocó el prompt del canary, a propósito.** Cambiarlo habría desbloqueado el canary **escondiendo** el bug, y el próximo que escriba "Key visual" —un usuario real, con el término estándar del oficio— comería el mismo rechazo mudo. Cuando un control legítimo rechaza un caso legítimo, el defecto está en el control.

**Capa 8b — el patrón otra vez, adentro del propio fix.** El evento `globe.production_route.compilation_failed` nombraba la **clase** (`ProductionRouteDependencyError`) y **tiraba la razón**, que es el dato por el que existen las 28. Medido en vivo: el evento del último canary (`12:37:39Z`, `experimentId=115b549b…`) no permitía saber cuál control rechazó; la razón sólo viajaba al caller. Ya emite `reason` — enum cerrado propio, sin `message`, `stack` ni nada derivado del payload.

### Verificado en vivo — EL CANARY GENERÓ (2026-07-26, revisión `00101-gfn`)

`4eee1cc` desplegado (imagen `4eee1cc51dad`, ancestría verificada). **El bloqueo se rompió: hubo generación real por primera vez.**

| Evidencia | Valor |
|---|---|
| Settlement | `13:36:15.451Z` · `governed_operation_completed` · **`spentDelta: 10`** |
| Attempt | `attempt 1` → **`outcome: succeeded`** · ruta `ref/still/rrss-v1` · `seedream-5-pro` `v5-pro` |
| Actor | `globe:service:internal-caller` vía `greenhouse-globe-caller@` · `correlationId: canary-a8013c68…` |
| Artefacto | **PNG real de 7.454.584 bytes**, `sha256:c8e365f1…`, `sourceKind: generated`, `13:36:15.402Z` |
| `compilation_failed` en la ventana | **CERO** (con `40ed85a` aparecía en cada intento) ⇒ **capa 8 cerrada** |

El asset quedó `lifecycle: quarantined` con `governance.state: c2pa_verify` (`terminal: false`) — pipeline normal de governance, no un fallo.

**El canary NO completó de punta a punta**, por dos cosas que hay que registrar como propias:

1. **Timeout del CLIENTE a los 10 min** mató la corrida mientras esperaba governance (el canary tolera 20). Es la trampa ya documentada, otra vez — esta vez sin costo, porque no reintenté a ciegas.
2. 🔴 **Mi técnica de "replay con la misma etiqueta" fue correcta en el gasto y FALSA en la premisa.** Verifiqué que `prepare`/`execute` llevan claves derivadas del `runLabel` y concluí que devolvería *el mismo* experimento. **No lo hizo: creó uno nuevo** (`d756055f`, `createdAt 13:44:02.287`, distinto del original). El gasto sí fue cero — el ledger lo prueba (`reservation 10` → `release 10`, `spent 0`) —, así que fue inocuo, pero la premisa era incorrecta. **Que una clave de idempotencia exista no prueba que el handler la honre**; hay que verificar el efecto, no la presencia del argumento.

**Capa 9, abierta y NO diagnosticada.** El experimento nuevo falló en **177 ms** con `attempts: []` (o sea antes de cualquier llamada al proveedor), `failureReason: runner_error`, y su evento de servidor dice `errorName: "Error"`, `reasonShape: "absent"` — un `Error` pelado sin razón de nuestro vocabulario. El release fue `governed_schedule_failed`. **Hipótesis sin verificar:** colisión de `submissionKey` por reusar el `runLabel` de una corrida que ya había ejecutado — o sea, posiblemente un artefacto de mi propia técnica y no un defecto del camino de producto. Se marca como hipótesis a propósito: no leí ese camino.

### Tres huecos del canary, encontrados USÁNDOLO

1. ✅ Descartaba el `failureReason` que el reader acababa de entregar — el script sabía por qué falló y obligaba a ir a los logs.
2. 🔴 `GLOBE_CANARY_RUN_LABEL` se exige en la rama `--execute` y no arriba del archivo: **el dry-run pasa y el execute muere.**
3. 🔴 El dry-run reporta `withinHardCap` pero **no `withinDayCap`** — la señal que de verdad decide si el mes deja gastar.

## Estado

open — cuatro de los códigos cerrados (`409` de crédito, `runner_error`, `ProductionRouteDependencyError` con 24 razones, el catch que las destruía); `authentication_required` pendiente; y **la causa del bloqueo del canary encontrada y cerrada en código** (capa 8: el falso positivo de `credential_like` sobre `"Key visual"`, `4eee1cc`), pendiente de deploy + canary con gasto real. Antes decía: bloqueo acotado al sanitizador del body, sin causa identificada. La verificación runtime necesita desplegar `324be6b` + `4eee1cc`.

## Relacionado

`ISSUE-124` (el `409` de crédito: este issue explica por qué su premisa no estaba probada); `ISSUE-126` (el otro hilo del mismo canary — la reconciliación de tenancy); `TASK-1566` + **ADR-015**; ADR-009 (la ruta de producción cuya dependencia el tercer código escondía); `packages/domain/src/model-lab.ts` (`runnerFailureReason`, `UnclassifiedRunnerFailurePort`); `apps/creative-runner/src/production-route-{compiler,composition}.ts`; `apps/studio-web/src/dispatch.ts` (`creditDenialPhase`, y el precedente `globe.dispatch.invalid_request`).
