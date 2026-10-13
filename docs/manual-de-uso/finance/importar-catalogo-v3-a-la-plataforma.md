# Importar el catálogo de V3 a la plataforma

- Estado: **vigente**. Primera importación hecha el 2026-10-12 (`TASK-2025`): 24 documentos y el puntero.
- Para quién: quien opera el catálogo de V3 (Finanzas o administración de Efeonce) junto con el operador que autoriza
  cambios en la base.
- Referencias: [qué es el registro](../../documentation/finance/cotizador-v3-registro-en-plataforma.md) ·
  [modelo de datos](../../architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md) ·
  [mantenimiento del catálogo en el repo](catalogo-v3-seleccion-y-actualizacion.md).

## Cuándo hay que correrlo

Cada vez que el catálogo del repositorio cambia: una versión nueva del catálogo, de la política o de los créditos, o
un puntero nuevo (`current set`). Mientras la plataforma no sea la autoridad del catálogo, la copia de la base sólo
se actualiza con este comando. Si no se corre, la plataforma sigue con el catálogo anterior.

## Para qué sirve

Copia a la plataforma el catálogo, la política de recursos y el catálogo de créditos que están en el repositorio, y
refleja el puntero que dice cuáles rigen. El repositorio sigue siendo la fuente: esto no cambia ningún archivo.

## Antes de empezar

- **Hay una sola base de datos para desarrollo, staging y producción.** Todo lo que este comando escribe con
  `--apply` queda en producción. Necesita el visto bueno del operador en ese momento.
- Lo que se importa tiene que estar **commiteado y empujado**. El comando rechaza un archivo con cambios sin
  commitear o cuyo commit no está en el remoto, y guarda con cada fila el commit del que salió.
- Las tablas del registro ya existen en la base (migraciones de `TASK-2025`, aplicadas el 2026-10-12).
- Conexión a la base: `pnpm pg:connect`.

## Paso a paso

1. Ver qué se importaría, sin tocar ninguna base:

```bash
pnpm quoter:import plan
```

   Lista cada documento con su rol, versión, huella, archivo y commit, y dice si está commiteado y empujado. Si
   `importable` es `false`, falta empujar.

2. Simular la importación contra la base (no escribe):

```bash
pnpm quoter:import documents --reason "Importación inicial del catálogo V3"
```

3. Con el visto bueno del operador, escribir:

```bash
pnpm quoter:import documents --reason "Importación inicial del catálogo V3" --apply
```

4. Correrlo de nuevo. Tiene que decir que todo estaba presente y no escribir nada.

5. Simular y luego reflejar el puntero. Es un paso aparte: guardar documentos nunca activa nada.

```bash
pnpm quoter:import pointer --reason "Reflejo del puntero vigente del repo"
```

```bash
pnpm quoter:import pointer --reason "Reflejo del puntero vigente del repo" --apply
```

## Qué significan los resultados

| Resultado | Qué pasó |
| --- | --- |
| `would_store` | En simulación: ese documento falta y se guardaría. |
| `stored` | Se guardó. |
| `already_present` | Ya estaba, con la misma huella. No se toca. |
| `conflict` | La misma versión existe con otro contenido, en la base o dos veces entre lo que se ofrece. **No se guardó nada de toda la corrida.** |
| `would_activate` / `activated` | El puntero se reflejaría, o se reflejó. |
| `already_current` | El puntero de la base ya es el del repositorio. |
| `missing_documents` | El puntero nombra un documento que la base no tiene. Importa primero los documentos. |

La salida nunca incluye el contenido de un documento: sólo roles, versiones, huellas, rutas y commits.

## Qué no hacer

- No correr `--apply` sin el visto bueno del operador.
- No editar un documento ya importado esperando que se actualice: una versión guardada no cambia nunca. Un cambio es
  una versión nueva, con otro identificador de versión.
- No importar desde una copia de trabajo con cambios sin commitear: el comando lo rechaza, y es a propósito.
- No usar este comando para activar un catálogo decidido en la plataforma: sólo refleja el puntero del repositorio.

## Problemas comunes

| Síntoma | Causa y salida |
| --- | --- |
| `NOT_COMMITTED_OR_NOT_PUSHED` | Hay archivos sin commitear o sin empujar. La lista viene en el error. Empujar es decisión del operador. |
| `conflict` con `conflictWith: registry` | Alguien cambió un documento sin cambiarle la versión. Se corrige en el repositorio creando una versión nueva; la guardada no se toca. |
| `missing_documents` al reflejar el puntero | Faltó el paso de documentos, o el puntero nombra una versión que no está en el repositorio. |
| El comando falla al conectar | Revisar `pnpm pg:connect`. Las tablas `quoter_*` no existen hasta que las migraciones se apliquen. |

## Probarlo sin tocar la plataforma

```bash
pnpm quoter:test:local
```

Levanta un PostgreSQL 16 local, aplica las migraciones y corre todas las pruebas del registro, incluido el
importador, en bases desechables.
