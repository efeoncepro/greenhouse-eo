# Globe — promoción de una ruta a producción, de punta a punta V1

> Dueña: `TASK-1641` (Scope 6). Gobierna ADR-009 (saga de promoción) + ADR-010 (atestación comercial).
> El código, los workflows y las imágenes viven en `efeonce-globe`; la evidencia y este runbook viven en
> Greenhouse.

> **Gate de lifecycle:** una ruta puede conservar evidencia histórica `canary_passed` o un binding promovido
> mientras el producto completo está `hibernated`; eso no la vuelve ejecutable hoy. No inicies la saga ni un
> canary facturable hasta completar `hibernated → draining → active` mediante
> [`GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md`](GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md) y verificar el estado live.

Este runbook existe porque **el procedimiento estaba incompleto y eso costó 10 de 12 promociones**. Medido el
2026-08-04 sobre `production_promotion_operations`: 10 `rolled_back`, 2 `canary_passed`. Cuatro de las
revertidas **ya estaban `activated`** y murieron **+2 s, +18 s, +26 s y +40 s** después de su `deadline_at`
—`ref/still/reference-v1`, `ref/video/frames-v1`, `ref/video/motion-v1`, `ref/motion/reference-v1`—. Es decir:
la promoción **funcionó** y se deshizo sola porque nadie atestó el canary dentro de la ventana.

🔴 **El diseño no se relaja.** `activated` no es terminal a propósito: una ruta activada que nadie probó con
una generación real no debe quedar viva, y el código es explícito (*«Never infer or attest canary success»*).
Lo que faltaba era el **paso operativo** y su **observabilidad** — que es lo que este documento cierra.

---

## Lo primero: la ventana corre desde `activate`, no desde que te acuerdes

Entre `activate` y `canary-confirm` hay **3 horas** y hay que **producir una pieza real**. El presupuesto de
esa producción no es despreciable y está medido:

| Etapa | Costo real |
|---|---|
| Generación por el carril gobernado | ~1-2 min |
| Asset Governance (`inspection → malware → C2PA → rights`) | **~8 min** (ADR-007, tras `ISSUE-137`) |
| `canary-confirm` | segundos |

O sea el ciclo completo son **~10 minutos si todo sale bien**, y la ventana permite dos o tres intentos. **No
actives hasta tener el canary listo para disparar.**

Desde `TASK-1641` el worker avisa: a **30 minutos** del `deadline_at` emite
`globe_promotion_window_closing` (WARNING) por cada promoción `activated`, una línea por promoción con su
`routeId`, `modelVersion` y `secondsRemaining`.

⚠️ **La alerta `stalled` que ya existía NO cubre esto, aunque su nombre lo sugiera.** Mide **edad de cola de
operaciones ya reclamables** (`deadline_at <= now`): avisa **cuando la ventana venció**. Para las cuatro
promociones que murieron llegaba tarde **por diseño**, no por umbral mal puesto. Son dos señales sobre los dos
lados del mismo instante y ninguna sustituye a la otra.

---

## Secuencia

Cada paso se verifica por su **reader**, nunca por el workflow en verde. Un workflow `success` prueba que el
pipeline corrió, no que el estado quedó donde crees.

### 0. Identidad exacta, antes de discutir cualquier otra cosa

Escribe la tupla completa y no la abrevies en ningún paso posterior:

```text
routeId · capability · operation · provider · model · version · endpointId · región · completionDriver
```

Una ruta **no hereda** evidencia, precios, derechos, adapter, canary ni disponibilidad de una ruta vecina.
`ref/video/frames-v1` y `ref/motion/reference-v1` son dos identidades, dos canarios y dos promociones.

### 1. Rate vigente para **toda** forma de salida que la UI pueda mandar

Resuelve el rate exacto para cada combinación `modality/resolution/duration/aspect/audio` admisible, incluidos
los extremos del rango. Un rate faltante es un **defecto de datos** y se corrige con migración forward-only
(`ON CONFLICT DO NOTHING` + test registrado), **nunca** relajando validación ni agregando un fallback de precio.

### 2. Derechos: atestación comercial del modelo (ADR-010)

Una `Model Commercial Rights Attestation` **por modelo**, anclada a evidencia durable (`providerTermsRef` +
digest sha256 + reviewer + el grant exacto). Es **inmutable**: corregir términos crea una atestación **nueva**,
nunca reescribe la anterior. La policy de derechos es una **derivación**, jamás un dato independiente.

### 3. Evaluación objetiva + revisión humana

Reporte del Evaluation Harness para la identidad exacta, con verdict `objective_pass_pending_human`, y su
revisión humana firmada. El harness **nunca elige un ganador creativo**; un `objective_pass` no es aprobación.

### 4. La saga: `start → stage → promote → activate`

Por `globe-operator-lane.yml`, con los lanes disjuntos que la matriz declara (`routing`, `promoter`,
`checker`). Readback de readiness, binding y circuito después de cada acto.

🔴 **`activate` arranca el reloj.** Antes de disparar este paso ten resuelto el paso 5.

### 5. El canary — el paso que faltaba

**No escribas la secuencia a mano.** El canary canónico produce cualquier ruta por su identidad exacta:

```bash
pnpm producer:canary --route=ref/video/frames-v1
```

Deriva el `outputShape` desde el catálogo (primer valor de cada enum, mínimo de cada rango) y resuelve sus
entradas desde el feed retenido, certificándolas con `copyAsReference`.

**Sin `--execute` no gasta un crédito** y es el primer diagnóstico, no el último recurso: valida readiness,
ruta, circuito, derechos y estimate. Corre el dry-run **antes de pedir autorización de gasto**.

Para gastar:

```bash
pnpm producer:canary --route=ref/video/frames-v1 --execute --approve-route=32
```

`--approve-route` es **excluyente** de `--approve`: una aprobación escrita para el canary de las tres
modalidades base no puede autorizar el gasto de una ruta suelta.

Variables requeridas (las cuatro; `RUN_LABEL` se valida **sólo** en la rama `--execute`, así que un dry-run
verde no prueba que el execute vaya a arrancar):

```text
GLOBE_CANARY_BASE_URL · GLOBE_CANARY_WORKSPACE_ID · GLOBE_CANARY_RUN_LABEL · GLOBE_CANARY_ID_TOKEN
```

Flags útiles: `--route-capability=` (obligatoria si un `routeId` sirve a varias capabilities — el script se
**niega** a elegir), `--route-references=`, `--route-target-lang=`, `--route-prompt=`.

⚠️ **El dry-run SÍ certifica sus referencias, y lo declara** (`referencesCertified`). No es un descuido: el
estimate de una ruta con entrada obligatoria **no es computable** sin referencias válidas —
`assertReferencePolicySatisfied` corre antes de cotizar y `derived-internal` es una postura que un caller no
puede declarar—. `copyAsReference` es gasto cero e idempotente: deja una anotación, no un cobro.

### 6. Esperar governance, no reintentar

El canary produce; Asset Governance tarda **~8 min**. 🔴 **Un timeout del cliente no es un fallo del
servidor**: ante cualquier ambigüedad, **readback primero** por el reader del run/experimento. Reintentar un
command que gasta cobra de nuevo.

### 7. `canary-confirm`

`globe-operator-lane.yml` `mode=canary-confirm` `lane=checker`. El servidor certifica la evidencia contra
autoridades durables: run `completed` **posterior a la activación**, attempt terminal en la tupla exacta,
output retenido, asset `active` y `asset_governance_jobs.state = 'eligible'`.

Desde `TASK-1641` este command **lee primero y hace checkpoint después**: un fallo de la lectura ya no quema la
promoción, y un `DatabaseError` determinista sale como el `internal_error` que es en vez de prometer un
reintento que no puede ayudar.

### 8. Readback final, por el reader y no por este documento

`mode=get` `lane=routing`: `canary_passed` (terminal), binding `enabled`, circuito `closed`, governance
`eligible`. Registra `experimentId + attemptId + sha256` y la economía exacta (aprobados = estimados =
gastados, una reserva, una liquidación).

ℹ️ El `deadlineAt` **queda en el agregado y es inerte**: los cinco barridos de expiración filtran
`state NOT IN ('canary_passed','rolled_back')`, así que el plazo no puede cobrarse sobre una promoción
sellada. «Terminal leído en un doc» y «terminal aplicado por el barrido» son afirmaciones distintas — ésta
está verificada.

---

## Cuando algo sale mal

### La ventana venció y la promoción se revirtió

El rollback cierra **dos** de los tres agregados: circuito `open` (antes que el binding, fail-closed) y binding
`enabled=false`. **`model_readiness_revisions` queda en `promoted` a propósito.**

🔴 **No es un olvido y no se arregla dándole la capability a la saga.** Revertir readiness ya tiene su
primitive —`globe.model-readiness.route.pause`, `promoted → paused`, append-only— pero exige
`globe.model-readiness.pause`, y la saga sólo porta `globe.production-promotion.*`. Son autoridades
**disjuntas a propósito**: es la separación maker/checker que hace vendible el régimen humano. Dársela dejaría
que un rollback automático retire una promoción que un humano firmó.

**El remedio es humano y explícito**: pausar esa readiness por su identidad exacta. Desde `TASK-1641` el worker
emite `globe_promotion_readiness_divergent` (ERROR) mientras la divergencia siga viva, computada sobre el
estado **leído ahora** — así que baja sola cuando alguien la cierra.

🔴 **Pero ese remedio HOY NO TIENE CAMINO EJECUTABLE — verificado leyendo el código el 2026-08-05.**
`transitionModelRoute` hace `requireHuman(c)` para todo destino distinto de `promoted`, así que un lane de
service account **falla cerrado por diseño**; y `globe.model-readiness.pause` **no está** en
`PRODUCER_HUMAN_CAPABILITY_SCOPES`, así que un humano por el BFF tampoco. Cerrarlo exige el rollout de 3 pasos
del broker más una superficie que lo despache; dueño: `TASK-1463` (Delta 2026-08-05).

✅ **Mitigación verificada mientras tanto: volver a promover la ruta también cierra la divergencia**, porque
enciende el binding y vuelve coherente la readiness `promoted`. Ejercitado el 2026-08-05 sobre
`ref/still/reference-v1`: la señal bajó de 1 a 0. Elige este camino cuando la decisión correcta sea **restaurar**
la ruta; el `pause` sólo hace falta cuando la decisión es **retirarla**, y ése es justo el caso que espera un
humano con autoridad.

⚠️ **El predicado tiene DOS filtros:** sólo la **última** promoción de cada identidad **y** con su **binding
todavía apagado**. Sin el segundo la señal era falsa — el lane de ADR-010 habilita rutas sin pasar por la saga.

### El canary no resuelve y `canary-confirm` rechaza

Lee la razón nombrada. No repromuevas, no repitas el canary a ciegas y no toques SQL. Un circuito `open` con
razón `canary_unattested` prueba que **falta evidencia del canary**; no prueba que el driver, el proveedor o el
endpoint estén rotos.

---

## Lo que este runbook NO autoriza

- Relajar o alargar la deadline. La ventana no era el problema; el procedimiento faltante sí.
- Auto-atestar el canary o inferir su éxito. Prohibido por diseño.
- Reconciliar las 10 promociones históricas ya revertidas.
- Abrir acceso comercial: sigue gated por `TASK-1480`.

---

## Referencias

- ADR-009 `EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md` · ADR-010
  `EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` · ADR-007 (presupuesto de latencia de
  governance).
- Estado vivo: [`GLOBE_RUNTIME_HANDOFF.md`](GLOBE_RUNTIME_HANDOFF.md). Disponibilidad live: reader
  `globe.producer.fleet.list`; ledger humano [`GLOBE_MODEL_FLEET_STATUS.md`](GLOBE_MODEL_FLEET_STATUS.md).
  **Si divergen, manda el reader.**
- Triage de alertas: [`GLOBE_PRODUCER_ALERT_TRIAGE_V1.md`](GLOBE_PRODUCER_ALERT_TRIAGE_V1.md).
