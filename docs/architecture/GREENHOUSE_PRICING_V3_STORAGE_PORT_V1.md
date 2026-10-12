# Pricing V3 — puerto de almacenamiento

- Estado: **vigente**. Implementado por `TASK-2024` (fase 1 de `EPIC-053`) el 2026-10-12.
- Decisión que lo origina: [promoción de V3 a la plataforma](GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md),
  decisiones 1, 3 y 4 («un motor, dos transportes»; «el almacenamiento es un puerto»; «una versión es el artefacto
  congelado tal cual»).
- Código: `src/lib/finance/pricing-v3/storage/` (contrato, adaptador en memoria, resolución de fuentes) y
  `scripts/commercial/pricing-v3-storage-file.ts` (adaptador de archivos).
- No cambia qué calcula V3, ni una sola salida de `pnpm pricing:v3`.

## Para qué existe

El cálculo de V3 siempre fue puro. Lo que estaba escrito contra el disco era lo que une los pasos: leer el puntero de
versiones vigentes, comprobarlo contra sus fuentes, cargar el documento que nombra, congelar sin sobrescribir. Todo eso
vivía dentro de la CLI. Una ruta de la plataforma no puede leer archivos del repositorio en tiempo de ejecución, así
que sin un contrato habría tenido que escribir esa carga por segunda vez, y dos caminos de carga son dos lugares donde
la API y la CLI pueden dar resultados distintos.

El puerto es ese contrato: dice qué necesita el motor del lugar donde viven sus documentos, sin decir nada de ese
lugar. La CLI llega a archivos por un adaptador; la plataforma llegará a PostgreSQL por otro (`TASK-2025`). El código
que resuelve «lo vigente» es el mismo para ambos.

## Qué cruza el puerto y qué no

| Familia | Cruza el puerto | Operaciones |
| --- | --- | --- |
| Documentos fuente: catálogo, política de recursos y catálogo de créditos | Sí | `readDocument`, `findDocument`, `writeDocument` |
| Puntero de versiones vigentes | Sí | `readPointer`, `replacePointer` |
| Artefactos congelados de una cotización | Sí | `writeArtifact`, `readArtifact`, `listArtifacts` |
| Lo que quien llama entrega para una corrida: brief, demanda, cambio, hitos, textos del documento | No | Son argumentos, no almacén |
| Lo que deja una lectura en `--out`: preview, reparto, calendario, datos del documento, borrador exportado | No | Son salidas de la línea de comandos |

Las dos últimas filas también son archivos en la CLI, y los lee y escribe el mismo módulo del adaptador de archivos con
dos funciones fuera del puerto (`readArgumentFile`, `writeOutputFile`). `scripts/commercial/pricing-v3.ts` ya no
importa `node:fs`.

## El contrato

`PricingV3Storage`, en [`storage/port.ts`](../../src/lib/finance/pricing-v3/storage/port.ts). Todas las operaciones
son asíncronas, porque un adaptador que no es de archivos no puede ser otra cosa. Calcular, reproducir y leer una
cotización siguen siendo síncronos: sólo espera la entrada y la salida.

| Operación | Qué entrega | Rechazos |
| --- | --- | --- |
| `readDocument(ref)` | El documento que nombra la referencia. Con identidad (versión y huella), **ese** documento o nada. Sin identidad, lo que haya en la dirección | `INPUT_NOT_FOUND`, `INPUT_NOT_JSON` |
| `findDocument(ref)` | Lo que hay en la dirección, sin verificar, o `undefined` | Ninguno |
| `writeDocument({ role, text, locator? })` | La identidad del documento guardado | `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE` |
| `readPointer(ref?)` | El puntero tal como se guardó, o `null` si todavía no existe | `INPUT_NOT_FOUND`, `INPUT_NOT_JSON` |
| `replacePointer({ text, confirmDigest, locator? })` | Nada | `CURRENT_VERSIONS_CONFLICT`, `OUTPUT_NOT_WRITABLE` |
| `writeArtifact({ text, locator? })` | Versión de artefacto, `replayDigest` y `calculationId` | `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE` |
| `readArtifact(ref)` | El artefacto, byte a byte | `INPUT_NOT_FOUND`, `INPUT_NOT_JSON` |
| `listArtifacts()` | Dirección y carril de cada artefacto guardado | Ninguno |

No se agregó ningún código de error: son los de adaptador que ya existían en `errors.ts`.

### Dirección e identidad

- **`locator`** es la dirección propia de cada adaptador: una ruta para el de archivos, un nombre alterno para el de
  memoria, un identificador para el de PostgreSQL. El contrato nunca la interpreta.
- **Identidad de un documento** = su rol, su versión y su huella. La huella es la del documento **ya validado por el
  contrato de su rol** (`identifyDocument`, que es `identifyCurrentSource` de `adapters/current-versions.ts`):
  `sha256(stableJson(documento validado))`. Es la misma que lleva el puntero, así que un adaptador nunca puede
  discrepar de él.
- **Identidad de un artefacto** = su `replayDigest`, que cubre el bloque semántico. `execution.createdAt` y
  `calculationId` quedan fuera de esa huella, y por eso el texto se guarda entero.

### Texto guardado y texto canónico

- `StoredText` es `{ text, value }`: lo guardado tal como se guardó, y el valor al que se interpreta. Un adaptador
  **nunca** reserializa `text`, no lo ordena y no lo completa.
- El **texto canónico** de un valor es `canonicalText(valor)` = `stableJson(valor)`: claves ordenadas, sin espacios,
  `undefined` omitido. Es la cadena cuyo `sha256` es la huella.
- El adaptador de archivos guarda el texto con sangría que la CLI siempre escribió. Un adaptador que guarde un solo
  texto por documento fuente guarda el canónico del documento validado: el texto crudo de un archivo, con la sangría
  y el orden de claves de quien lo escribió, **no** da la huella.
- El puntero viaja como texto opaco: su huella cubre las rutas y `updatedAt`, así que nada lo normaliza.

## Invariantes

1. **Con identidad, ese documento o ninguno.** `readDocument` con versión y huella entrega ese documento o rechaza
   con `INPUT_NOT_FOUND`, aunque en esa dirección haya otro. Significa «no se tiene un documento con esa identidad».
2. **Nada se reemplaza.** Una segunda escritura sobre la misma identidad (rol y versión de un documento; dirección o
   `replayDigest` de un artefacto) rechaza siempre con `OUTPUT_EXISTS`, sea el contenido igual o distinto. Quien
   necesite una escritura idempotente pregunta antes con `findDocument`: la idempotencia se resuelve por encima del
   puerto.
3. **El puntero se reemplaza entero y sólo sobre el que se leyó.** `confirmDigest` es la huella del puntero que se
   reemplaza, o `null` si se espera que no exista. La comprobación y el reemplazo ocurren dentro del adaptador, en un
   solo acto.
4. **Aplicar no activa.** `writeDocument` guarda un sucesor y no toca el puntero.
5. **Un artefacto se lee como se guardó.** Si todavía se reproduce lo dice la reproducción de su carril
   (`replayPricingV3`, `replayCatalogQuote`, `replayResourceComposition`), no el puerto.
6. **«Lo vigente» se resuelve al calcular, nunca al reproducir.** Un artefacto lleva sus fuentes dentro.
7. **Un rechazo no lleva contenido.** El adaptador rechaza con el código solo. Qué opción debe corregir quien llama
   lo nombra el transporte, con `namingOption`: jamás una ruta, un valor recibido ni un mensaje del sistema.

## Resolver «lo vigente» sobre el puerto

[`storage/sources.ts`](../../src/lib/finance/pricing-v3/storage/sources.ts) es lo que antes estaba escrito dentro de la
CLI:

- `readCurrentVersions(storage, option, ref?)` lee el puntero y lo valida.
- `createCurrentSourceResolver(storage)` entrega una fuente por rol **sólo después** de comprobarla contra el puntero.
  El puntero se lee una vez por resolvedor: todas las fuentes de una corrida se resuelven contra la misma lectura.
- `verifyPointedSources(storage, pointer)` compara el puntero con los documentos que nombra, rol por rol.

Ninguna repite el veredicto: llaman a `resolveCurrentSource` y `verifyCurrentVersions`, que ya existían. La lectura de
la fuente es la tolerante (`findDocument`) a propósito: una fuente que falta o está rota es un veredicto sobre el
puntero (`CURRENT_VERSIONS_MISMATCH`), no una falla de lectura.

## Adaptadores

| Adaptador | Dónde vive | Para qué |
| --- | --- | --- |
| Archivos | `scripts/commercial/pricing-v3-storage-file.ts` | El modo local de la CLI. Conserva las primitivas de siempre: escritura exclusiva (`wx`) y privada (`0600`) para documentos y artefactos; para el puntero, un archivo temporal hermano y un renombrado, `0644` |
| Memoria | `src/lib/finance/pricing-v3/storage/memory.ts` | Segundo cliente del contrato, para que no tome la forma de un sistema de archivos, y prueba de que todo el camino corre sin disco |
| PostgreSQL | `src/lib/commercial/quoter/storage-postgres.ts` (lo crea `TASK-2025`) | El modo plataforma |

El adaptador de archivos vive bajo `scripts/` a propósito: ningún módulo de `src/` lo importa, así que nada que corra
en la plataforma puede alcanzar un sistema de archivos a través del motor. Un `locator` relativo es relativo a la raíz
del repositorio (así nombra el puntero sus fuentes, y se lee igual en cualquier máquina); la CLI entrega la ruta de un
flag ya resuelta contra su directorio de trabajo.

## Cómo se comprueba

| Qué | Dónde | Qué prueba |
| --- | --- | --- |
| Línea base dorada de la CLI | `__tests__/pricing-v3-cli-golden.test.ts` y `__tests__/fixtures/cli-golden/` | 107 comandos fijados por salida, error, código de salida y, de cada archivo escrito, nombre, bytes y modo. Se capturó **antes** de que existiera el puerto y pasa después sin regenerar un fixture |
| Batería de conformidad | `__tests__/storage-conformance.ts` (`runStorageConformance`) | Nueve casos sobre los 48 artefactos congelados y todas las versiones del catálogo y de la política, contra los tres adaptadores |
| Pureza del motor | `__tests__/pricing-v3-purity.test.ts` | Ningún módulo del motor importa algo distinto de sus propios módulos, `decimal.js`, `zod` y `node:crypto`; ningún módulo de `src/` importa el adaptador de archivos |

Los casos dorados nombran sólo versiones inmutables, así que un fixture no envejece. `--current` no tiene fixture: se
compara, en cada corrida, con el mismo comando recibiendo por flag las tres fuentes que el puntero nombra. Un fixture
del puntero se pondría rojo con cada versión legítima del catálogo.

Lo único que la línea base normaliza es lo que depende del reloj: `execution.createdAt` de un artefacto, y en
`current set` el día (`updatedAt`) y la huella que lo cubre (`pointerDigest`), que el test comprueba aparte.

### Todo adaptador nuevo pasa la batería

`runStorageConformance(subject)` declara los mismos tests para el adaptador que reciba. Un adaptador nuevo la importa;
no copia los casos.

```ts
runStorageConformance({
  name: 'postgres',
  // Un almacén vacío por llamada, y la dirección que este adaptador da a lo que el repositorio tiene en `path`.
  empty: async () => ({ storage: await createEmptyPostgresStorage(), locator: () => undefined })
})
```

Sin `corpus`, la batería llena un almacén vacío a través del propio puerto, que es como cualquier adaptador llega a
tener algo. El caso 8 recorre el camino completo —puntero, fuentes, cálculo, artefacto congelado y lectura— con cada
ejemplo del repositorio que tiene su artefacto al lado, y exige el archivo commiteado byte a byte.

### Cuándo se vuelve a capturar la línea base

Sólo ante un cambio **deliberado** de lo que la CLI responde:

```bash
PRICING_V3_CLI_GOLDEN=capture pnpm vitest run src/lib/finance/pricing-v3/__tests__/pricing-v3-cli-golden.test.ts
```

y el diff de los fixtures se revisa línea por línea. Un refactor nunca captura: su prueba es que nada se movió.

## Reglas para quien toque esto

- **NUNCA** importar `node:fs`, `node:path` ni nada fuera de `decimal.js`, `zod` y `node:crypto` desde
  `src/lib/finance/pricing-v3/**`.
- **NUNCA** importar `scripts/commercial/pricing-v3-storage-file.ts` desde un módulo de `src/` que no sea un test.
- **NUNCA** reserializar, ordenar o completar el texto de un artefacto o de un puntero dentro de un adaptador.
- **NUNCA** usar `OUTPUT_EXISTS` como señal de «ya estaba»: no debe llegar a un cliente de la API. Se pregunta antes.
- **NUNCA** regenerar la línea base dorada para poner en verde un refactor.
- **SIEMPRE** que nazca un adaptador, pasarlo por `runStorageConformance` antes de usarlo.
- **SIEMPRE** que un comando nuevo de la CLI lea una fuente, un puntero o un artefacto, hacerlo por el puerto; lo que
  entrega quien llama se lee como argumento.

## Lo que este documento no cubre

- Tablas, migraciones y el adaptador PostgreSQL: `TASK-2025`.
- El modo plataforma de la CLI y la paridad entre transportes: `TASK-2028`.
- Organización dueña de una cotización, autorización y auditoría: son del agregado de servidor, no del puerto.
