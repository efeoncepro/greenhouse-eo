# ISSUE-141 — Globe: la subida de un asset muere en `inspecting` y la causa llega enmascarada

## Ambiente

production — Globe (`globe-asset-governance`, Job `globe-producer-worker`), workspace `greenhouse-org:efeonce`.

## Detectado

2026-08-04, ejerciendo la entrada de referencias del Producer para producir el canary de `ref/video/frames-v1`
(TASK-1641). Lo destapó el intento de usar la ruta, no una alerta.

## Síntoma

Dos ingests consecutivos murieron en la etapa **`inspecting`** con `dependency_unavailable` tras **5 intentos**.
No es transitorio: se repitió idéntico.

- `asset_f861b971-4a6b-44eb-afc0-95623718131b`
- `asset_86670e74-c71f-498a-9727-92d2f9a60461`

Un private-ingest anterior (2026-07-31) sí había llegado a `eligible`, así que algo cambió entre esa fecha y hoy —
o el camino de subida usado no fue el mismo (ver § Límite de honestidad).

## Causa raíz

**No determinada todavía, y el issue existe justamente por eso: la causa está enmascarada.**

`packages/domain/src/asset-governance-jobs.ts:82` colapsa a `dependency_unavailable` todo error que no sea
`AssetGovernanceDependencyError`, y su `SAFE_DEPENDENCY_CODES` contiene **sólo los cuatro códigos de C2PA**. Los
nombres que `apps/asset-governance/src/engines.ts` **ya emite correctamente** —`clamav_signature_update_failed`,
`clamav_signature_stale`, `clamav_unavailable`, `clamav_scan_failed`, `clamav_scan_invalid`,
`clamav_signature_missing`— se destruyen en la frontera. El sistema sabe la causa y la tira antes de contarla.

Es la familia de `ISSUE-127` en una quinta superficie; se declara ahí como fila y se arregla acá.

**Sospechoso, deliberadamente débil:** en los logs del Job aparece, en cada corrida,
`ERROR: NotifyClamd: Can't find or parse configuration file /etc/clamav/clamd.conf`. `engines.ts:47` sólo perdona
la salida de `freshclam` que matchea `/up[- ]to[- ]date/i`, así que un exit code distinto de 0 por esa vía sería
suficiente para tumbar la etapa. **Pero no está confirmado que sea la causa** — ver abajo.

⚠️ **Y ese ClamAV no es el de `TASK-1378`.** Esa task es de *Greenhouse*: decide si se provisiona el adapter
`clamav-http` detrás de `ASSET_MALWARE_SCAN_ENABLED`, hoy OFF por diseño, y su pregunta es económica. El ClamAV de
este issue vive en **Globe**, embebido en `apps/asset-governance/src/engines.ts`. Dos sistemas distintos con el
mismo nombre; no confundirlos al diagnosticar.

## Límite de honestidad — leer antes de tocar código

El ingest se disparó desde el browser con un `File` **sintético** (canvas → `DataTransfer` → `input.files` → evento
`change`), porque el tool de subida rechaza rutas fuera de la sesión. **No está descartado que ese camino haya
omitido un paso real del flujo** —por ejemplo el PUT de los bytes a GCS, lo que explicaría un `describe` en 404
dentro de `inspecting` y dejaría a ClamAV completamente fuera de la historia.

**Primer paso obligatorio: reproducir con una subida real por el selector de archivos.** Si no reproduce, el
defecto de ingest no existe y este issue se reduce a su mitad de observabilidad.

Lo que **sí** queda verificado con independencia de eso es el enmascaramiento: eso se lee en el código.

## Impacto

La ruta `ref/video/frames-v1` exige 1-2 referencias de imagen y sus **dos** caminos de entrada están cerrados: la
subida (este issue) y los botones del feed (slice en `TASK-1559`). Con ambos rotos, **la generación desde la UI del
Producer para rutas con entrada obligatoria es imposible**, y producir el canary de una ruta nueva depende del
carril gobernado.

No hay pérdida económica: el ingest muere antes de generar.

## Solución

1. **Reproducir con subida real** por el selector de archivos. Si no reproduce, cerrar la mitad de ingest.
2. **Dejar de enmascarar**: los nombres que `engines.ts` ya emite deben sobrevivir la frontera de
   `asset-governance-jobs.ts`. El arreglo no es agregar los seis códigos de ClamAV al set —eso repite el defecto a
   la séptima causa—, sino que la frontera **preserve el código nombrado** y reserve el colapso para lo que
   genuinamente no tiene nombre.
3. Recién con la causa visible, arreglar lo que aparezca.

## Verificación

- Una subida real por el selector llega a `eligible`.
- Un fallo inducido de la etapa `inspecting` reporta su **código nombrado**, no `dependency_unavailable`.
- El canary de la ruta con referencias se puede producir desde la UI.

## Estado

open

## Relacionado

- `ISSUE-127` — familia del enmascaramiento; este caso entra como fila nueva de su tabla.
- `TASK-1559` — slice hermano: los botones «Usar como referencia» / «Recrear» del feed son stubs.
- `TASK-1641` — lo destapó; su Scope 1 depende de que exista un camino de entrada.
- `TASK-1378` — ClamAV de **Greenhouse**, NO es este. No cerrarlos juntos.
