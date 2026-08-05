# ISSUE-139 — El descriptor de output de Globe anunciaba un MIME adivinado por modalidad

> **Estado:** Resolved — arreglado y verificado en producción el 2026-08-04
> **Detectado:** 2026-08-04 · **Ambiente:** Globe producción (`globe-api-internal`)
> **Severidad:** Media — el descriptor miente sobre el formato; los bytes servidos siempre fueron correctos
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)
> **Introducido en:** `c93951d` (TASK-1503 Slice 3, 2026-07-22) · **Cerrado por:** `e7a732c`

## Cómo apareció

No lo reportó un usuario ni una alerta. Apareció **corriendo el canary de generación real** como prueba
de salida del rollout de `TASK-1469`: falló con `producer_canary_output_integrity_mismatch` después de
que las tres modalidades generaran correctamente.

Vale registrar el orden, porque es la lección: **las tres piezas se generaron bien, se retuvieron bien y
se sirvieron bien.** Lo que falló fue la comparación entre lo que el descriptor PROMETÍA y lo que el
sistema realmente tenía.

## Síntoma medido

Sobre una generación real de audio (ElevenLabs Multilingual v2, 6 créditos):

| | valor |
|---|---|
| Output declarado por el intento | `audio/mpeg`, 109.968 bytes |
| Bytes servidos en el cable | `audio/mpeg`, 109.968 bytes ✔ |
| **Descriptor de `globe.producer.output.get`** | **`audio/wav`** 🔴 |

Imagen y video salieron íntegros — porque para ellos el default por modalidad (`image/png`,
`video/mp4`) **coincidía por casualidad** con lo que el motor eligió. Sólo audio expuso la falla.

## Causa raíz

`advertisedMimeType()` (`packages/domain/src/producer-assets.ts`) devolvía un mapa **por modalidad**:

```ts
const ADVERTISED_MIME = { image: 'image/png', video: 'video/mp4', audio: 'audio/wav', … };
```

**Un default por modalidad no puede describir los BYTES**: una modalidad admite varios formatos y el
motor elige cuál produce.

Y el dato correcto ya estaba a la vista y se descartaba. `resolveOwnedOutput` encontraba el descriptor
del output y se quedaba **sólo con `mediaType`**, con el `mimeType` al lado:

```ts
const declared = attempt.outputs?.find(o => o.sha256 === query.sha256)?.mediaType;
```

El comentario de esa misma función ya declaraba el principio correcto — *«preferir lo que el intento
DECLARÓ»* — aplicado a la modalidad y **no al formato**.

## Impacto

Los bytes nunca estuvieron mal, así que no hubo pérdida de activos. Lo que se degrada es todo consumidor
que confíe en el descriptor en vez de en el cable:

- el mapa de extensiones de descarga (`app.ts`) nombra un MP3 como `.wav`;
- un reproductor que elige códec por ese valor falla **sobre bytes intactos**, que es el peor síntoma
  para diagnosticar porque el archivo está perfecto.

## Solución

`advertisedMimeType` prefiere el `mimeType` que el intento DECLARÓ para esos bytes; el mapa por
modalidad queda como **último recurso**, sólo para manifiestos anteriores a los descriptores por output
(`TASK-1504`), donde no hay nada que declarar.

## La causa sistémica que también se cerró

Diagnosticar esto exigió **reproducir el chequeo a mano**, porque el canary colapsaba **ocho condiciones
con remedios opuestos** —bytes que no cuajan con su hash, un descriptor que miente sobre el formato, un
handle apuntando a otro experimento— en un único `producer_canary_output_integrity_mismatch`.

Es el bug class de [`ISSUE-127`](ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md)
**dentro del instrumento que existe para detectar problemas**. Ahora el error nombra la modalidad y
todas las condiciones violadas.

## Verificación

- Tests: el formato declarado gana (**probado en rojo**: falla sin el arreglo) y el fallback sólo actúa
  cuando el intento no declaró nada.
- Runtime, sobre los **mismos tres assets ya generados** (costo cero): imagen, video y audio pasan
  íntegros, con liquidación económica exacta (una reserva, una liquidación, ningún otro efecto) y el
  activo de Asset Governance coherente en hash, medio, tamaño y formato.
- Superficies verificadas contra la **revisión activa**, no contra el workflow verde:
  `globe-api-internal-00207-28r`, `globe-studio-internal-00149-w9c` y el Job del worker, las tres con
  el digest etiquetado `e7a732c9b62e`.

## Lección

**Un default que coincide en la mayoría de los casos es peor que ninguno**: pasa desapercibido hasta que
aparece el caso que no coincide, y para entonces nadie sospecha del valor que lleva meses «funcionando».
Aquí sobrevivió desde el 22 de julio porque dos de las tres modalidades acertaban por casualidad.
