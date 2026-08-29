# Operar la cola priorizada de trabajo SEO (TASK-1700)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-08-28 por Claude (TASK-1700)
> **Ultima actualizacion:** 2026-08-28 por Claude (TASK-1700 — auditoria de drift contra el codigo final)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) · [Documentación funcional](../../documentation/growth/cola-priorizada-trabajo-seo.md)

## Para qué sirve

Contesta la pregunta que el módulo SEO existe para contestar: **¿qué hago primero?**

Compone en una sola lista lo que antes vivía en cuatro pantallas con cuatro criterios de orden que no
se podían comparar (oportunidades, gap SEO↔IA, descubrimiento, gap competitivo), lo puntúa en **clics
adicionales estimados sobre demanda medida** y lo guarda como una **foto diaria inmutable** con su
versión de score.

Hoy la cola **manda el orden de la lente de oportunidades** en `Growth > SEO > Keywords`. La pantalla
no cambió de forma — mismas columnas, mismo copy —, sólo cambió quién manda el orden. **No existe
todavía una pantalla propia de la cola** (bandas visibles, verbos, filtros por origen): eso es una
entrega de interfaz posterior. Mientras tanto, la cola se opera por API y por el worker.

🔴 **La cola manda esa lente sólo si puede hacerlo sin fabricar un número.** En la lente,
`estimatedClickGain` es siempre un número y un `0` significa *"ya convierte por encima de la media de
la posición objetivo"* — una afirmación positiva, no un vacío. En la cola, un score vacío significa
*"me niego a estimar"*. Por eso el adapter **no traduce**: si alguna entrada que llegaría a la lente
no tiene techo, devuelve `null` y la pantalla vuelve al reader legacy, que sabe declarar ese caso
(`orderedBy: 'measured_demand'`). Es condición **por organización**, no por fila: la curva se evalúa a
nivel del sitio en la posición objetivo, así que o todas las entradas tienen techo o ninguna. La foto
de la cola se guarda completa en los dos casos. Consecuencia operativa que hay que tener presente
antes de diagnosticar: **con el flag ON, una organización con curva no utilizable sigue viendo el
orden anterior, y eso es lo correcto, no una falla.**

## Antes de empezar

- Módulo SEO activo (`GROWTH_SEO_ENABLED=true`) y organización con assignment `seo_v2` vigente. Sin
  eso, el target "no existe" para estos comandos (404 anti-oracle, a propósito).
- **Permisos: ver y decidir son dos cosas distintas.**
  - `growth.seo.observation.read` → leer la cola.
  - `growth.seo.work_queue.decide` → decidir sobre una entrada.
  - `growth.seo.report.read_client` (scope `own`) → es la puerta del cliente al módulo SEO.
    ⚠️ **Todavía no abre ninguna vista de la cola**: el redactor cliente existe, pero no hay
    superficie que lo consuma. Hoy la cola la ven sólo el operador y los carriles internos.
  - Están separadas a propósito: un analista puede leer el plan completo sin poder retirarle trabajo
    al equipo.
- **Estado de rollout vigente (2026-08-28):** flag `GROWTH_SEO_WORK_QUEUE_ENABLED` **OFF en los dos
  runtimes** y scheduler `ops-seo-work-queue-materialize` (`0 10 * * *`) **PAUSADO**. Son tres frenos
  independientes.
- 🔴 **El flag vive en DOS runtimes.** El **ops-worker** gatea el materializador (sin él no se escribe
  ninguna foto); **Vercel** gatea el reader, las rutas, la consulta MCP y el orden de la pantalla
  (sin él el worker acumularía fotos que nadie lee). Prenderlo en uno solo deja la capacidad muerta a
  medias, en silencio.
- **No compromete gasto de proveedor**: la cola lee tablas ya pagadas. Lo que sí compromete es la
  **autoridad de orden** — con el flag ON el operador ve un orden que manda otra cosa y aparecen
  filas de orígenes que antes no estaban en esa lista. Por eso el flip se avisa antes, aunque cueste
  cero.

## Paso a paso

### 1. Verificar el estado de los tres frenos

```bash
# Flag en el worker (la revisión ACTIVA, no el deploy.sh)
gcloud run services describe ops-worker --region us-east4 \
  --format='value(spec.template.spec.containers[0].env)' | tr ',' '\n' | grep WORK_QUEUE

# Flag en Vercel
vercel env ls | grep GROWTH_SEO_WORK_QUEUE_ENABLED

# Scheduler
gcloud scheduler jobs describe ops-seo-work-queue-materialize --location us-east4 \
  --format='value(state,schedule)'
```

### 2. Primera corrida en modo sombra (un solo target)

Con el flag ON **sólo en el worker** y Vercel todavía en OFF, la cola escribe fotos que nadie ve
todavía. Es el orden correcto: primero se verifica lo que produce, después se le entrega el orden de
la pantalla.

```bash
curl -s -X POST "$WORKER_URL/seo/work-queue/materialize-batch" \
  -H 'Content-Type: application/json' \
  -d '{"maxTargets": 1, "force": true}'
```

Devuelve un resumen del batch (`status`, `eligible`, `materialized`, `reused`, `failed`) y, **por
target**, un `outcome` con `seoTargetId`, `organizationId`, `status`
(`materialized` · `reused` · `failed`), `snapshotId`, `itemCount` y `degradedOrigins` — que lista
**sólo los orígenes que NO quedaron en `ok`**, no el estado de los seis. El detalle completo de la
salud de los seis orígenes (con su `reason` y su `asOf`) se lee del snapshot, por el paso 5.

### 3. Inspeccionar la primera foto fila por fila

No basta con que devuelva `ok`. Hay que mirar:

- **Las bandas.** ¿Hay entradas en banda 1 con número, y en 2 y 3 sin número? Un score presente en
  banda 2 o 3 es un defecto, no un dato.
- **El desglose de un par de entradas de banda 1.** Impresiones, clics, CTR actual, posición
  ponderada, CTR esperado y tamaño de la muestra de la curva tienen que ser coherentes entre sí.
- **La salud de los seis orígenes.** Cada uno declara `ok`, `degraded` o `down` **con razón**.
  "Degradado" sin razón es un hueco mudo.
- **Los verbos.** Ninguna entrada de canibalización puede decir `optimize`.

### 4. Confirmar que no hace trabajo de más

Segunda corrida inmediata, sin `force`:

```bash
curl -s -X POST "$WORKER_URL/seo/work-queue/materialize-batch" \
  -H 'Content-Type: application/json' -d '{"maxTargets": 1}'
```

Tiene que devolver el target con **`status: "reused"`** (y el contador `reused` del batch en 1,
`materialized` en 0), con **cero filas nuevas** y el mismo `snapshotId` de la corrida anterior. Si
escribe una foto nueva con los mismos insumos, la idempotencia está rota y hay que parar el rollout
ahí.

La materialización manual además tiene un piso de **60 minutos** entre corridas: dentro de esa
ventana devuelve la foto vigente en vez de recomputar (`force: true` lo salta, y es sólo para el
carril programado y las verificaciones).

### 5. Leer la cola

```bash
curl -s "$BASE/api/admin/growth/seo/work-queue?seoTargetId=seot-…&limit=50"

# Filtrar por origen (repetible)
curl -s "$BASE/api/admin/growth/seo/work-queue?seoTargetId=seot-…&origin=consolidation&origin=aeo_gap"
```

La respuesta trae `snapshot`, `items`, `originHealth`, `priorityScoreVersion`, `asOf`, `staleness` y
`nextCursor` para paginar. La misma lista se sirve por el carril `ecosystem`
(`GET /api/platform/ecosystem/growth/seo/work-queue`) y por la consulta MCP **interna**
`get_seo_work_queue` — mismo payload, cero lógica de orden duplicada.

**Nunca construyas el cursor a mano**: es opaco a propósito, y uno fabricado saltea filas en
silencio.

### 6. Decidir sobre una entrada

```bash
curl -s -X POST "$BASE/api/admin/growth/seo/work-queue/decisions" \
  -H 'Content-Type: application/json' \
  -d '{"itemId": "seowqi-…", "decision": "dismissed", "note": "fuera del alcance del contrato"}'
```

Vocabulario cerrado: `accepted` · `deferred` · `dismissed` · `done`.

🔴 **Decidir no ejecuta nada.** No dispara seguimiento de rankings, no compra datos al proveedor y no
crea contenido. Después de decidir, la ejecución sigue por el camino del dominio dueño, como
siempre.

### 7. Entregarle el orden a la pantalla (cutover)

Recién cuando los pasos 2 a 6 estén verificados:

1. Avisar al operador de SEO. El orden que ve en pantalla cambia de dueño.
2. Prender el flag en Vercel (`Production`, `staging`, `Preview`) + **redeploy** — las variables no
   se toman en caliente.
3. Despausar `ops-seo-work-queue-materialize`.
4. Actualizar la fila del flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
5. Mirar las tres señales de `/admin/operations` durante los primeros días.

## Cómo se lee una banda y qué acción corresponde

| Banda | Qué dice | Qué haces |
|---|---|---|
| **1** | Hay demanda medida y la curva del sitio alcanza: el número es un **techo** de clics adicionales si llega a la posición objetivo | trabajas por ese número, de mayor a menor |
| **2** | Hay demanda medida, pero la curva no alcanza para estimar la ganancia | trabajas por impresiones; el vacío es honesto, no un cero |
| **3** | Nadie llega todavía por ese término | el verbo es **medir**: no se optimiza a ciegas |

### Los cuatro verbos

| Verbo | Qué significa | Qué NO es |
|---|---|---|
| `optimize` | ya recibes búsquedas por ese término y falta el empujón | no es escribir algo nuevo |
| `create` | no existe contenido que cubra esa intención | no es retocar lo que hay |
| `consolidate` | **dos URLs que fusionar**, no una keyword que empujar | 🔴 nunca es `optimize`: pedirle más contenido a un problema causado por contenido de más es la acción equivocada |
| `measure` | todavía no hay evidencia para decidir | no es "no sirve" |

## Qué significan los estados y señales

| Estado | Significado |
|---|---|
| `staleness = fresh` | la foto está vigente |
| `staleness = stale` | **el plan venció.** La foto expira a las **26 h** con cadencia diaria, a propósito: así una corrida perdida se NOTA en vez de pasar inadvertida un día más |
| `staleness = absent` | **nunca se materializó** para ese target. NO es "no hay trabajo" — son cosas distintas y no se pueden leer igual |
| `originHealth.state = ok` | ese origen corrió. `itemCount: 0` con `ok` es un vacío legítimo |
| `originHealth.state = degraded` | normalmente una **capacidad que esa organización no tiene encendida** (sin competidores declarados, sin cobertura, sin datos del lado IA). El motor está bien; falta configuración o insumo |
| `originHealth.state = down` | **un motor que falló.** Eso sí se investiga |
| `reused: true` | los insumos no cambiaron; devolvió la foto vigente sin escribir nada |
| `all_origins_failed` | ningún origen respondió: **no se escribió foto**. Es un error, no un plan vacío |
| señal `growth.seo.work_queue.stale_snapshot` | targets elegibles con la foto vencida. Steady 0 |
| señal `growth.seo.work_queue.origin_degraded` | orígenes en `degraded`/`down` en la última foto. Steady 0 |
| señal `growth.seo.work_queue.score_version_drift` | fotos vigentes calculadas con una versión de score distinta de la vigente — detecta el cambio de umbral sin bump. Steady 0 |

### Qué hacer cuando un origen está degradado o caído

Lo primero es leerlo bien: **al plan le falta trabajo, no es que no lo haya**. Si el gap competitivo
está `degraded`, no significa "no hay brechas frente a la competencia"; significa que esa parte de la
foto no se pudo componer.

1. Lee la `reason` — es obligatoria y dice qué faltó.
2. Si es `degraded`, casi siempre es configuración: la organización no tiene competidores declarados,
   no hay cobertura capturada, no hay corrida del lado IA. Se resuelve en el motor dueño, no en la
   cola.
3. Si es `down`, es una falla real del motor: revisa Sentry (dominio `growth`) y la señal del motor
   correspondiente.
4. **No “arregles” la cola rellenando.** Un origen caído nunca baja el score de los demás y sus filas
   simplemente no existen en esa foto. Esa es la conducta correcta.

## Cómo se bumpea una versión de score

Los parámetros que mueven el orden —ventana, posición objetivo, rango de posiciones, percentil de
impresiones, piso de impresiones, alcance de la curva, pisos de muestra de la curva— viven **dentro
del objeto versionado**, en `src/lib/growth/seo/work-queue/score-versions.ts`.

🔴 **NUNCA cambies un valor de una versión ya publicada.** Mover un umbral dentro de
`incremental-clicks-v1` reordenaría el ranking histórico completo en silencio, y un cliente que
pregunte "¿por qué esto ya no es prioridad?" se queda sin respuesta auditable.

El procedimiento correcto:

1. **Agregas** una entrada nueva a `PRIORITY_SCORE_CONFIGS` (por ejemplo `incremental-clicks-v2`) con
   la config completa. El registro es append-only: las versiones viejas se quedan para siempre,
   porque son lo que hace legibles las fotos que ya viajaron a un plan del día.
2. Mueves `ACTIVE_PRIORITY_SCORE_VERSION` a la nueva.
3. Corres los tests del módulo. Hay un test que **congela la huella de cada versión** y falla si
   alguien editó un valor sin bumpear, nombrando exactamente qué hacer.
4. Después del deploy, la señal `growth.seo.work_queue.score_version_drift` queda en warning hasta que
   se rematerialicen las fotos con la versión nueva.

**Qué NO obliga a bumpear:** la cadencia del materializador, el TTL de la foto (26 h), el piso entre
recomputaciones (60 min) y el techo de filas por origen (200). Son knobs operativos: no reordenan
nada, viven en `WORK_QUEUE_RUNTIME_CONFIG` y quedan fuera de la huella. Exigir un bump por tocarlos
devaluaría la señal que la versión pretende dar.

## Qué no hacer

- **No leas un score vacío como un cero.** En bandas 2 y 3 el número viene vacío porque la cola se
  niega a fabricar lo que no puede sostener. "Vacío" y "medimos y no hay nada que ganar" son
  afirmaciones opuestas.
- **No ordenes por volumen estimado del proveedor** cuando hay demanda medida. En español-LATAM es
  donde peor mide (`ISSUE-152`), y ordenar por ahí pone arriba lo que un tercero cree por encima de
  lo que el sitio efectivamente recibe.
- **No leas una cola vacía como "no hay trabajo"** sin mirar `staleness`. `absent` es "nunca corrió".
- **No trates `consolidate` como `optimize`.** Son dos URLs que fusionar, no una keyword que empujar.
- **No hagas `UPDATE` ni `DELETE` sobre las tablas de la cola.** Es append-only con triggers que lo
  impiden: "marcar el item como hecho" se hace con una decisión, no editando la fila.
- **No prendas el flag en un solo runtime.** El materializador vive en el ops-worker, **no** en
  Vercel.
- **No apliques el flag sólo con `--update-env-vars`.** Los `deploy.sh` usan `--set-env-vars`
  destructivo: si no queda declarado ahí, el próximo deploy lo borra en silencio.
- **No despauses el scheduler antes** de la corrida sombra verificada y del aviso al operador.
- **No esperes que decidir ejecute algo.** La cola propone; el humano confirma; el comando dueño
  ejecuta.

## Problemas comunes

- **No aparecen fotos nuevas.** Lo primero que hay que sospechar es el **flag prendido en un solo
  runtime**: el materializador corre en el ops-worker, no en Vercel. Verifica la **revisión activa**
  del worker (no el `deploy.sh`) y después el estado del scheduler.
- **La cola sale vacía.** Distingue: `staleness: absent` = nunca corrió (falta materializar);
  `staleness: fresh` con `items: []` y todos los orígenes `ok` = de verdad no hay trabajo elegible;
  `items: []` con orígenes en `degraded`/`down` = la foto es parcial y le falta trabajo.
- **La segunda corrida escribe filas nuevas.** La idempotencia se rompió: hay un insumo que cambia
  entre corridas sin que nadie lo haya cambiado. No sigas el rollout hasta entenderlo.
- **Prendí el flag y la lente no cambió de orden.** Antes de sospechar del flag, mira la banda de esa
  organización: si su curva no es utilizable en la posición objetivo, sus entradas no tienen techo, el
  adapter devuelve `null` a propósito y la pantalla sigue con el reader legacy. **Es la conducta
  correcta**, no un cutover a medias — la alternativa sería fabricar un `0` que la lente leería como
  "ya convierte mejor que el promedio". Se resuelve solo cuando el sitio acumula muestra. Verifícalo
  leyendo la cola (paso 5): si todo sale en banda 2, es esto.
- **La lista está en un orden raro después del cutover.** Compara contra el orden del reader legacy:
  hay un test de paridad para el origen `gsc_striking_distance` justamente porque el cutover tiene
  que ser un cambio de **fuente** y no de **comportamiento**.
- **Todo aparece en banda 2.** La curva del sitio no alcanza en la posición objetivo (piso: 1.000
  impresiones y 5 clics en ese bucket). Es lo esperable en un target recién onboardeado o de bajo
  tráfico, y sale solo cuando la serie acumula muestra. No es un defecto.
- **Vuelve a aparecer algo que ya descartaste.** Sólo `dismissed` y `done` retiran el término;
  `accepted` y `deferred` siguen apareciendo a propósito.
- **`score_version_drift` en warning.** Alguien cambió un umbral sin bumpear la versión, o hay fotos
  viejas pendientes de rematerializar. No es ruido: se investiga.

## Rollback

Flag a `false` en Vercel + redeploy → la lente vuelve al reader legacy en menos de 5 minutos, sin
migración inversa. (Es el mismo destino al que ya cae sola cuando el adapter devuelve `null`: la rama
de fallback está ejercitada, no es código muerto que se estrena el día del rollback.) Los datos quedan (append-only, sin efecto fuera de sí mismos). Para detener
también la escritura: pausar el scheduler y poner el flag en `false` en la revisión activa del
worker.

## Referencias técnicas

- Contrato: `src/lib/growth/seo/work-queue/{reader,materialize,record-decision,materialize-batch}.ts`
- Score y curva de CTR: `src/lib/growth/seo/work-queue/priority-score.ts`
- Versiones del score: `src/lib/growth/seo/work-queue/score-versions.ts`
- Colectores por origen: `src/lib/growth/seo/work-queue/collectors/`
- Redactor cliente: `src/lib/growth/seo/work-queue/client-dto.ts`
- Cutover de la lente: `src/lib/growth/seo/work-queue/opportunities-adapter.ts`
- Señales: `src/lib/reliability/queries/growth-seo-work-queue-signals.ts`
- Worker y scheduler: `services/ops-worker/server.ts` (`/seo/work-queue/materialize-batch`) ·
  `services/ops-worker/deploy.sh` (`ops-seo-work-queue-materialize`)
- Flag: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Spec: [TASK-1700](../../tasks/in-progress/TASK-1700-growth-seo-prioritized-work-queue-aggregate.md)
- Documentación funcional: [Cola priorizada de trabajo SEO](../../documentation/growth/cola-priorizada-trabajo-seo.md)
