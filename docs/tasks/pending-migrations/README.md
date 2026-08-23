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

## Lote pendiente

### TASK-1771 — `COMMENT` de `superseded_at` (agregado 2026-08-23)

`TASK-1771-superseded-at-comment.sql.pending`. El comentario de la columna declara hoy que «NINGÚN write path
lo escribe todavía», y `supersedeAssignmentDeadEnd` lo desmiente. **Condición: el release que despliega ese
command a producción ya ocurrió**, verificado contra `origin/main` y no contra el working tree. Antes de eso
el comentario describiría una capacidad que el runtime desplegado no tiene — el error simétrico de ISSUE-161.
Riesgo sobre datos: nulo (es metadata). El cuidado va en `migrate:up`, que aplica todas las pendientes.

### Lote histórico — post-release, en este orden

El orden de abajo es **una sola cadena**, no tres listas independientes. Cada eslabón es la
precondición del siguiente, y saltarse uno rompe el siguiente de forma observable:

```
TASK-1765 Slice 1 (crea `archived_at`)              ── APLICADO 2026-08-22
  └─ release que retira `on_hold` de la superficie
       ├─ 1. TASK-1765-decision-enum-contract        ── contract del enum
       └─ 2. TASK-1748 Slice 1 desplegado (Vercel + ops-worker)
              └─ 3. TASK-1748-synthetic-archive-axis-backfill
                     └─ 4. TASK-1765-closed-invariant  ── readback 1 → 0
```

**`1` y `3` son independientes entre sí**: el contract sólo estrecha el `CHECK` de `decision` y el
backfill sólo toca `stage`/`archived_at` de filas sintéticas. Se pueden aplicar en cualquier orden.
Lo que **no** es negociable es que **las dos vayan antes de `4`**: el invariante aborta contra las
filas de `3`, y su `UPDATE ... SET stage='closed' WHERE decision IS NOT NULL` barrería a `closed`
cualquier fila `on_hold` que producción siga escribiendo mientras `1` no se haya aplicado.

Y las dos comparten el mismo release, por razones distintas: `1` espera a que el código **deje de
escribir** `on_hold`; `3` espera a que el código **empiece a filtrar** por procedencia.

## Lote pendiente de TASK-1765 — post-release, en este orden

Los dos son irreversibles y los dos exigen que el código ya esté en producción.

| # | Archivo | Condición de ejecución |
|---|---|---|
| 1 | `TASK-1765-decision-enum-contract.sql.pending` | `origin/main` ya NO ofrece `on_hold` (o sea: el release con los Slices 1-4 ya subió). Verificar contra `origin/main`, **nunca** contra el working tree. |
| 2 | `TASK-1748-synthetic-archive-axis-backfill.sql.pending` | El **Slice 1 de `TASK-1748`** (filtro de procedencia en `talent-pool/readers.ts` **y** `talent-pool/projection.ts`) corre en producción **en los dos runtimes**: Vercel y `ops-worker`. Verificar contra `origin/main`, nunca contra el working tree. |
| 3 | `TASK-1765-closed-invariant.sql.pending` | `TASK-1748` ya movió sus 32 filas sintéticas de `stage='closed'` a `archived_at`. Readback esperado **con la precondición cumplida: `1 → 0`** (queda sólo la fila real en etapa antigua, que el `UPDATE` corrige). Si ves 33, `TASK-1748` no corrió: para. |

### La lección que ordena las condiciones

Las condiciones 1 y 3 son sobre **datos + código desplegado**; la 2 es puramente sobre **código
desplegado**, y es la misma familia de error. La regla que faltaba, y que ninguna de estas
migraciones puede verificar por sí sola:

> **Un contract de enum no se aplica hasta que el código que ya no escribe ese valor esté en
> producción.** «Cero filas» no es «nadie lo escribe»: sólo dice que nadie lo escribió *todavía*. La
> alcanzabilidad se deriva del **contrato de la superficie desplegada**, jamás del contenido de la
> tabla.

Y su corolario, que es el que ordena a `TASK-1748`: **una migración de datos puede ser segura o
peligrosa según qué código esté corriendo encima.** El backfill del cambio de eje devuelve 32
postulaciones sintéticas fuera de `stage='closed'`; con el filtro de procedencia desplegado eso no
se ve, y sin él la projection del Banco de Talento —que corre cada 5 minutos— reclasifica esas
fichas a un estado servible y las publica ante un operador real. El SQL es idéntico en los dos
casos: lo que cambia es el runtime.

Un `RAISE EXCEPTION` dentro de la migración **no puede** validar esto: sólo ve datos, y la
precondición es sobre código desplegado. Por eso vive acá, como condición de proceso, y no allá como
guard de SQL.

Y pesa el doble en este repo porque **hay una sola instancia de Cloud SQL** compartida por dev,
staging y producción: aplicar «en dev» es aplicar en producción, contra un front-end que puede ser
varios commits más viejo que tu working tree.
