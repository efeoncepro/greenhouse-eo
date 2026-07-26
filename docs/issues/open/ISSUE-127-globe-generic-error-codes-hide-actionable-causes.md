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

> **Y la lección de método que el operador impuso y funcionó:** perseguir un error por deploy encuentra síntomas en serie; **leer el camino completo encuentra el que los explica.** Las capas 1-4 costaron un deploy cada una; la 5 se vio en treinta líneas de lectura. Cuando el n-ésimo fix destapa una capa n+1, **dejá de desplegar y leé.**

### Bloqueo vigente, ahora acotado con precisión

El `execute` de imagen (ruta `ref/still/rrss-v1` → `fal.seedream.text-to-image`) es rechazado por el **sanitizador del body snapshot**, no por la config del endpoint. Sospechosos, por cómo `buildBody` arma las referencias con `placeholder(input)`: `snapshot_body_inline_data_uri` (un `data:` URI), `snapshot_body_too_large` (>256 KB por string o el tope del snapshot completo), `snapshot_body_binary_key` o `snapshot_body_credential_like`.

**El próximo paso NO es otro deploy.** Es leer `buildBody` de `fal.seedream.text-to-image` (`governed-production-composition.ts:205`) contra los doce chequeos de `safeSnapshotBody` (`production-route-composition.ts:133-167`) y encontrar cuál viola. Es el mismo método que resolvió la capa 5.

### Tres huecos del canary, encontrados USÁNDOLO

1. ✅ Descartaba el `failureReason` que el reader acababa de entregar — el script sabía por qué falló y obligaba a ir a los logs.
2. 🔴 `GLOBE_CANARY_RUN_LABEL` se exige en la rama `--execute` y no arriba del archivo: **el dry-run pasa y el execute muere.**
3. 🔴 El dry-run reporta `withinHardCap` pero **no `withinDayCap`** — la señal que de verdad decide si el mes deja gastar.

## Estado

open — cuatro de los códigos cerrados (`409` de crédito, `runner_error`, `ProductionRouteDependencyError` con 24 razones, el catch que las destruía); `authentication_required` pendiente; y el bloqueo del canary acotado al sanitizador del body. Antes decía: tres de los cuatro códigos cerrados; `authentication_required` pendiente. La verificación runtime del tercero necesita el deploy de `17329f6`.

## Relacionado

`ISSUE-124` (el `409` de crédito: este issue explica por qué su premisa no estaba probada); `ISSUE-126` (el otro hilo del mismo canary — la reconciliación de tenancy); `TASK-1566` + **ADR-015**; ADR-009 (la ruta de producción cuya dependencia el tercer código escondía); `packages/domain/src/model-lab.ts` (`runnerFailureReason`, `UnclassifiedRunnerFailurePort`); `apps/creative-runner/src/production-route-{compiler,composition}.ts`; `apps/studio-web/src/dispatch.ts` (`creditDenialPhase`, y el precedente `globe.dispatch.invalid_request`).
