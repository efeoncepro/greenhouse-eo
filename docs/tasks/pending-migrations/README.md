# Migraciones escritas, revisadas y deliberadamente NO ejecutables

> **Tipo de documento:** Runbook operativo
> **Creado:** 2026-08-22 por Claude (TASK-1765)

Las migraciones de esta carpeta llevan sufijo `.sql.pending` y **no viven en `migrations/`**. Eso es
deliberado y tiene una razón que se pagó en vivo.

## Por qué no viven en `migrations/`

`pnpm migrate:up` ejecuta **todas** las migraciones pendientes en orden de timestamp. Una migración
committeada en `migrations/` y aún no aplicada no se queda quieta esperando su momento: **bloquea a
cualquiera que corra `migrate:up`, incluido quien esté reparando un incidente en producción.**

Ocurrió el 2026-08-22. `TASK-1765` dejó el `CHECK` del invariante committeado y sin aplicar, tal como
pedía su spec. Minutos después hubo que aplicar un forward fix urgente, y `migrate:up` abortó — no
por el fix, sino contra el guard de la migración pendiente, cuyo timestamp era anterior. El guard
hizo exactamente lo suyo; el problema es que estaba en el camino.

Guardarlas acá conserva la revisión y el contexto sin poner una mina en el camino de nadie.

## Cómo se ejecuta una

1. Leer la **condición de ejecución** del encabezado del archivo y verificarla. No es opcional: es la
   razón por la que la migración está acá y no allá.
2. `pnpm migrate:create <slug>` para obtener un archivo con timestamp posterior a todo lo aplicado.
3. Pegar el cuerpo del `.pending` en el archivo nuevo.
4. Readback **antes**, `pnpm migrate:up`, readback **después**.
5. Borrar el `.pending` en el mismo commit que agrega la migración real.

## Lote pendiente de TASK-1765 — post-release, en este orden

Los dos son irreversibles y los dos exigen que el código ya esté en producción.

| # | Archivo | Condición de ejecución |
|---|---|---|
| 1 | `TASK-1765-decision-enum-contract.sql.pending` | `origin/main` ya NO ofrece `on_hold` (o sea: el release con los Slices 1-4 ya subió). Verificar contra `origin/main`, **nunca** contra el working tree. |
| 2 | `TASK-1765-closed-invariant.sql.pending` | `TASK-1748` ya movió sus 32 filas sintéticas de `stage='closed'` a `archived_at`. Readback esperado: **33 → 0**. |

### La lección que ordena las dos condiciones

La regla que faltaba, y que ninguna de las dos migraciones podía verificar por sí sola:

> **Un contract de enum no se aplica hasta que el código que ya no escribe ese valor esté en
> producción.** «Cero filas» no es «nadie lo escribe»: sólo dice que nadie lo escribió *todavía*. La
> alcanzabilidad se deriva del **contrato de la superficie desplegada**, jamás del contenido de la
> tabla.

Un `RAISE EXCEPTION` dentro de la migración **no puede** validar esto: sólo ve datos, y la
precondición es sobre código desplegado. Por eso vive acá, como condición de proceso, y no allá como
guard de SQL.

Y pesa el doble en este repo porque **hay una sola instancia de Cloud SQL** compartida por dev,
staging y producción: aplicar «en dev» es aplicar en producción, contra un front-end que puede ser
varios commits más viejo que tu working tree.
