# Almacenamiento de `ai-generations/` — local, canon y archivo · V1

> **Tipo de documento:** Contrato operativo (SSOT de dónde vive cada archivo de `ai-generations/`)
> **Versión:** 1.1
> **Creado:** 2026-10-01 por Claude
> **Última actualización:** 2026-10-03 por Claude — `canon-sync` (los comandos de foto traen lo sellado del canon a demanda), canon ≠ archivo y el procedimiento para sumar una referencia nueva (§8)
> **Aplica a:** todo agente o persona que lea, componga, publique, archive o borre algo bajo `ai-generations/`
> **Relacionados:** [Creative Workbench (ADR)](../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md) ·
> [Web Media Delivery Tooling](web-media-delivery-tooling.md) (`media:archive-ai-generation`) ·
> [Manual: recuperar y archivar](../manual-de-uso/creative/recuperar-y-archivar-ai-generations.md) ·
> [Política de la carpeta](../../ai-generations/README.md) ·
> [Selección de referencias de marca](EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) ·
> [Fotografía de marca](brand-photography/README.md) ·
> [Recetas del deck](brand-graphic-line/deck-recipes/README.md) ·
> Regla auto-load: `.claude/rules/ai-generations-storage.md`

## 0. En una frase

> **Una ruta `ai-generations/...` es una ruta LÓGICA: el archivo puede estar en disco, en el canon o en el
> archivo. Si no está en disco, se pregunta dónde está (`pnpm ai-gen:where`) y se rehidrata
> (`pnpm ai-gen:pull`) a la MISMA ruta. Nunca se regenera, se sustituye ni se «aproxima».**

`ai-generations/` pesaba 15 GB de binarios fuera de git. Se reparte en tres lugares para liberar disco sin romper
los procesos que componen desde ahí (`foto:prompt`, `foto:componer:cta`, recetas del deck y `brand:compose`,
brand-surfaces, motion y audio).

## 1. Los lugares

| Lugar | Dónde | Qué guarda | Quién lo lee | Quién escribe |
|---|---|---|---|---|
| **Local** | `ai-generations/<AAAA-MM-DD>_<slug>/` en el checkout | Lo **protegido** (§2), todo lo nuevo o reciente y los archivos versionados en git | Los procesos de composición y los agentes | Toda corrida nueva, como hoy |
| **Canon** | `gs://efeonce-creative-canon/<la misma ruta del lock>`: `ai-generations/…` y, para referencias que vienen de un paquete npm (los Sparks), `node_modules/@efeoncepro/axis-brand-assets/…` (proyecto del Creative Workbench) | Lo **sellado** en `scripts/foto/assets.lock.json`: identidades, kits de prendas, logo 3D, mascotas, Sparks | El equipo del Creative Workbench (`pnpm assets:pull`) y greenhouse-eo como respaldo | Sólo `pnpm creative:assets:publish apply` (verifica sha256, nunca borra) |
| **Archivo** | `gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<ruta relativa>` (proyecto `efeonce-group`, privado) | Exploración, rondas, descartes e historial | El operador y sus agentes; el equipo del Workbench **no** lo baja | `pnpm ai-gen:archive` (que extiende `pnpm media:archive-ai-generation`) |
| **Work** | `gs://efeonce-creative-work/` | Entregables del equipo por cliente (ADR §2.4) | — | — |

**`efeonce-creative-work` NO se usa para esto.** Es el bucket de entregables del Creative Workbench, con permisos
por prefijo de cliente; nada de `ai-generations/` se sube ahí. El archivo tampoco vive en el Workbench: es el bucket
privado de Greenhouse.

La ruta relativa es idéntica en los tres lugares: `ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png`
vive en local con ese nombre, en el canon como `gs://efeonce-creative-canon/ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png`
y, si se archivara, como `gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<misma ruta>`. Por eso
rehidratar no cambia ninguna cita.

### 1.1 Lo versionado en git se queda

`ai-generations/` versiona en git los archivos livianos (README, `LEEME.md`, `manifest.json`, prompts, scripts
`.mjs`, `DECISIONES.md`, índices) y, por excepción, algunos assets que entraron con `git add -f`. Lo versionado tiene
a git como fuente y **nunca se borra al archivar**: el reparto local/canon/archivo trata los **binarios
gitignoreados** (imagen, video, audio, zip; ver `.gitignore`). Una carpeta archivada sigue existiendo en el checkout
con sus `.md`/`.json`/`.mjs`; sólo le faltan los binarios.

### 1.2 El inventario del archivo: `artifacts.remote.json`

Cada carpeta archivada tiene `ai-generations/<carpeta>/artifacts.remote.json`, **versionado en git** (schema
`greenhouse.aiGenerationArtifacts.v1`): por archivo, su `gsUri`, `sizeBytes` y `sha256`. Es el inventario: no hay un
manifest central. Al 2026-10-01 hay 39 carpetas archivadas (5,2 GB). Lo escribe sólo el comando de archivo.

## 2. Las clases

| Clase | Cómo se reconoce | Dónde vive | ¿Se puede archivar? |
|---|---|---|---|
| **Sellado** | Ruta declarada en `scripts/foto/assets.lock.json` | Local **y** canon | No, mientras el lock la declare |
| **Citado por receta** | Carpeta citada en `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (plates de las láminas) | Local | No |
| **Citado por código** | Carpeta citada por `src/**` o `scripts/**` (también en un comentario) | Local | No |
| **Reciente** | Carpeta modificada hace menos de 3 días | Local | No (puede estar escribiéndola otra sesión) |
| **Exploración** | Todo lo demás: rondas, descartes, pruebas, historial | Archivo (con su `artifacts.remote.json`) | Sí, con `ai-gen:archive` |

Las tres primeras clases forman lo **protegido**. Al 2026-10-01 son ~64 carpetas y 6,7 GB que se quedan en local;
la exploración son ~107 carpetas y ~8,4 GB.

### 2.1 Cómo se deriva lo protegido

Lo protegido **se deriva, nunca se lista a mano**: `pnpm ai-gen:protected` lo calcula cada vez desde las tres
fuentes (lock, catálogo de recetas, citas en `src/**` y `scripts/**`). No existe una lista que mantener; si una
carpeta deja de estar citada, deja de estar protegida en la siguiente corrida, y si se la cita, pasa a estarlo.

Consecuencia: **citar una carpeta en un doc NO la protege.** Los docs no son fuente de la derivación (ver regla 4).

La consecuencia inversa también muerde: **citar una ruta de corrida en código SÍ la protege**, aunque sea en un
comentario. Por eso las rutas de corridas no se citan en comentarios de `src/**` ni `scripts/**`: una cita
explicativa («método en `ai-generations/<corrida>/LEEME.md`») deja esa exploración clavada en disco para siempre. El
método se cita por su doc (un LEEME versionado, una referencia de skill), no por la carpeta de la corrida.

### 2.2 Canon como respaldo y como fuente a demanda

El canon es la distribución de las referencias selladas para el equipo del Creative Workbench **y** el respaldo de
esos kits para greenhouse-eo. Desde el 2026-10-03 es además la **fuente a demanda** de `pnpm foto:prompt` y
`pnpm foto:generar`: si una referencia sellada falta en disco o no es la versión del lock, la bajan solos (§3.1).

Eso **no autoriza borrar el original local** mientras el lock lo declare: los demás compositores (`brand:compose`,
`foto:componer:cta`, recetas del deck, motion, audio) siguen leyendo sólo del disco, y `ai-gen:archive` rehúsa lo
sellado. El cambio es que un faltante en una referencia sellada ya no frena a `foto:prompt`: se resuelve del canon con
la huella exacta.

### 2.3 Canon ≠ archivo

Son dos buckets con papeles opuestos; confundirlos es la forma más rápida de perder algo o de inflar el canon.

| | Canon | Archivo |
|---|---|---|
| Bucket | `gs://efeonce-creative-canon` (definido en `scripts/creative-workbench/control.json`) | `gs://efeonce-group-greenhouse-private-assets-prod` |
| Qué guarda | Lo **sellado**: lo que el lock declara aprobado (550 assets al 2026-10-03) | **Exploración**: rondas, descartes, pruebas, historial |
| Cómo entra | `pnpm foto:assets:lock` + `pnpm creative:assets:publish apply` | `pnpm ai-gen:archive apply` |
| Cómo se recupera | Solo, desde `foto:prompt`/`foto:generar` (§3.1); o `pnpm ai-gen:pull` | `pnpm ai-gen:pull <carpeta>` |
| Lo local | Se queda (es lo protegido) | Se borra **después** de verificar la copia |

**Archivar no es borrar.** `ai-gen:archive apply` sube cada binario, verifica tamaño, hash del servidor y sha256,
lo inventaría en `artifacts.remote.json` y **recién entonces** borra la copia local; en el bucket nunca borra nada.
Cuando el operador pide «eliminar lo no aprobado», en este repo lo correcto es **archivarlo**: sale del disco y
sigue recuperable. La sesión del 2026-10-03 liberó así más de 1,3 GB.

## 3. Los comandos

| Comando | Qué hace |
|---|---|
| `pnpm ai-gen:where <ruta\|carpeta>` | Dice dónde está: `local`, `canon`, `archivo` o `desconocida`; da la URL `gs://` y el comando para bajarla |
| `pnpm ai-gen:pull <carpeta\|ruta>` | Rehidrata a la **misma ruta**, verifica sha256 contra `artifacts.remote.json` o el lock; idempotente (lo que ya está correcto no se baja de nuevo) |
| `pnpm ai-gen:protected [--json]` | Lista lo protegido, derivado de las tres fuentes de §2 |
| `pnpm ai-gen:archive plan` | Muestra qué carpetas se archivarían, con su tamaño; no toca nada |
| `pnpm ai-gen:archive apply [--folder X] [--keep-local] [--min-age-days N]` | Extiende `media:archive-ai-generation`: sube, verifica tamaño + hash del servidor + sha256, escribe `artifacts.remote.json` y **recién entonces** borra los binarios locales (los `.md`/`.json`/`.mjs` versionados se quedan). Rehúsa carpetas protegidas y carpetas modificadas hace menos de 3 días (`--min-age-days`, default 3; `0` para una carpeta del día que es tuya y nadie más está escribiendo). `--keep-local` sube y registra sin borrar |
| `pnpm media:archive-ai-generation -- --run ai-generations/<carpeta> [--apply]` | El primitive del carril ([Web Media Delivery Tooling](web-media-delivery-tooling.md)): es la **etapa de copia** — sube los binarios al bucket y escribe `artifacts.remote.json`. No aplica guardas de protección ni readback, y no borra lo local; `ai-gen:archive` lo envuelve con esas tres cosas. Para archivar exploración y liberar disco se usa `ai-gen:archive` |
| `pnpm creative:assets:publish plan\|apply` | Publica al canon lo sellado en el lock (verifica sha256, nunca borra). Lista **cada prefijo** que el lock declara; hasta el 2026-10-02 listaba sólo `ai-generations/**` y daba los 182 Sparks por faltantes en cada corrida |
| `pnpm assets:pull` | En el repo `creative-workbench`: el equipo baja el canon |
| `pnpm foto:prompt` · `pnpm foto:generar` | Antes de usar una referencia sellada, la traen del canon si falta o está desactualizada (§3.1). `FOTO_SIN_CANON=1` lo apaga |

Después de un `ai-gen:archive apply`, los `artifacts.remote.json` nuevos o actualizados se commitean: sin ellos nadie
puede encontrar ni rehidratar esa carpeta.

### 3.1 Descarga automática desde el canon (`canon-sync`)

`scripts/foto/canon-sync.mjs` nace de dos pedidos del operador (2026-10-03): «al ser tantas imágenes es una locura el
peso» y «¿necesitas sí o sí que estén en local?». La respuesta: el modelo recibe los **bytes** de cada referencia, así
que el archivo tiene que pasar por la máquina al generar, **pero como caché, no como copia permanente del repo**. El
lock dice qué versión está aprobada; el canon la guarda, en la misma ruta que la local.

`pnpm foto:prompt` y `pnpm foto:generar` llaman `activarCanon()`. Antes de usar una referencia **sellada**:

| Estado en disco | Qué hace |
|---|---|
| Está y su sha256 es el del lock | Nada: la usa |
| Falta | La baja del canon |
| Está, pero su sha256 no es el del lock (hay una versión más nueva aprobada) | La baja y la reemplaza |
| La copia local era distinta | La **aparta** como `<archivo>.local-<sha8>.<ext>`; nunca la pisa, porque puede ser trabajo nuevo sin sellar |

Siempre verifica el sha256 de lo bajado contra el lock antes de dejarlo en su lugar (se baja a un `.part` y se
renombra); si no calza, lo descarta y avisa. En la salida se ve `⇣ <ruta> (canon)` por cada bajada y
`↺ <ruta>: … quedó aparte en <archivo>.local-<sha8>.<ext>` por cada copia apartada; si no puede traerla,
`⚠ <ruta>: no se pudo traer del canon (<motivo>)`. Una ruta que el lock no declara sólo se mira en disco.

- **`FOTO_SIN_CANON=1`** lo apaga: sin red, o para trabajar a propósito con copias locales que todavía no están
  selladas.
- **Las pruebas no tocan la red:** la sincronización se enciende sólo en los CLI.
- **Probado real (2026-10-03):** se apartó una vista del disco y `foto:prompt` la bajó sola con la huella exacta.
- Un `.local-<sha8>` que aparezca es una señal: alguien editó una referencia sellada sin re-sellarla. Se revisa; si es
  la nueva versión buena, se sigue el procedimiento de §8, no se renombra a mano.

## 4. Reglas para agentes

1. **Una ruta `ai-generations/...` citada en una skill o un doc es una ruta LÓGICA.** Si no está en disco:
   `pnpm ai-gen:where <ruta>` y después `pnpm ai-gen:pull <carpeta>` **antes de componer**.
2. **NUNCA regenerar, sustituir ni «aproximar»** un plate, kit o referencia aprobada porque falta en disco.
   **NUNCA resellar `assets.lock.json`** para tapar un faltante. **NUNCA editar un `artifacts.remote.json` a mano.**
3. **NUNCA archivar a mano** (`gcloud storage cp/rm`, `gsutil`) ni borrar carpetas o binarios de `ai-generations/`
   por fuera de `pnpm ai-gen:archive`. **Lo archivado en el bucket nunca se borra.**
4. **Promover algo de exploración a referencia canónica** = sellarlo en el lock (`pnpm foto:assets:lock`) o citarlo
   en la receta del deck — eso lo vuelve protegido — y publicarlo al canon (`pnpm creative:assets:publish apply`).
   Citarlo en un doc no basta. Si estaba archivado, primero `pnpm ai-gen:pull`. El procedimiento completo está en §8.
5. **Si otra sesión puede estar escribiendo en la carpeta, no se archiva.** La regla de los 3 días lo cubre; no la
   esquives con `--folder` sobre una carpeta que alguien está usando.
6. **No citar rutas de corridas en comentarios de código** (§2.1): eso las protege y las deja fuera del archivo.

Las salidas **nuevas** se siguen escribiendo en `ai-generations/<AAAA-MM-DD>_<slug>/` local, como hoy.

## 5. Flujo de recuperación

1. `pnpm ai-gen:where ai-generations/<carpeta>/<archivo>` → lee el lugar.
2. Según el resultado:
   - `local` → el archivo está; si igual falla, el problema no es de almacenamiento (ruta mal escrita, otro nombre).
   - `canon` o `archivo` → `pnpm ai-gen:pull <carpeta>`; verifica sha256 y deja el archivo en la misma ruta.
   - `desconocida` → no está en ningún lugar registrado. **Para y avisa al operador** con la ruta exacta y quién la
     cita. No la reemplaces por otra parecida.
3. Repite la composición. La ruta citada no cambia.

## 6. Si una composición falla por archivo faltante

Síntomas típicos: `foto:prompt` o `foto:doctor` dicen que una referencia del catálogo no existe;
`foto:assets:check` reporta un faltante; `brand:compose` da `missing-photo` o «el plate debe existir en disco»;
un compositor de motion o audio no encuentra su fuente.

Para una referencia **sellada**, `foto:prompt` y `foto:generar` ya intentaron traerla del canon (§3.1) antes de
decir que falta; si igual falta, su línea `⚠ … no se pudo traer del canon (<motivo>)` dice por qué (sin sesión de
gcloud, sin red, huella que no calza). Para lo no sellado, o para los demás compositores, se sigue la tabla.

| Haz | No hagas |
|---|---|
| `ai-gen:where` + `ai-gen:pull`, y repetir | Generar un plate nuevo «igual» |
| Si `where` dice `desconocida`, avisar con la ruta y el citador | Apuntar la ficha o la receta a otra carpeta parecida |
| Si el sha256 no coincide, avisar: el archivo cambió desde que se selló o archivó | Resellar el lock o editar `artifacts.remote.json` para que «pase» |
| Si falta el acceso al bucket, pedirlo al operador | Copiar desde otra máquina o carpeta a mano |

Un faltante en una referencia aprobada es un **bloqueo**, no un permiso para improvisar.

## 7. Relación con el Creative Workbench

El [ADR del Creative Workbench](../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md) creó dos buckets
(`efeonce-creative-canon` y `efeonce-creative-work`). Este reparto no crea buckets: amplía el papel del canon, que
además de distribuir las referencias al equipo es el respaldo de los kits sellados de greenhouse-eo (Delta 2026-10-01
del ADR), y deja la exploración archivada **fuera del Workbench**, en el bucket privado de Greenhouse. El equipo sigue
bajando el canon con `pnpm assets:pull`; el archivo no forma parte de su harness.

## 8. Qué hacer al sumar una referencia nueva

Una referencia no está «sumada» hasta que está sellada, publicada al canon y su exploración archivada. El recorrido
general:

1. **Generar o editar** la referencia (por edición desde una aprobada siempre que exista).
2. **QA al 100 %**, no en hoja de contacto (para bordados, `pnpm foto:emblema`).
3. **Copiarla a su hogar canónico** con su nombre de convención (el `final/` del kit, `_identidad-elenco/<clave>/`,
   `_identidad-nexa/…`).
4. **Declararla en el catálogo** de `scripts/foto/build-prompt.mjs` (`usoPorVista`, `ELENCO`, `expresiones`…).
5. `pnpm foto:assets:lock` — la sella (y con eso queda protegida).
6. `pnpm creative:assets:publish apply` — la sube al canon (antes, `plan` para ver qué sube).
7. `pnpm exec vitest run scripts/foto` — la suite de foto en verde.
8. `pnpm ai-gen:archive apply --folder <carpeta de exploración>` — archiva rondas y descartes (`--min-age-days 0` si
   la carpeta es del día y es tuya); commitear su `artifacts.remote.json`.
9. **Documentar** en el LEEME del hogar canónico (y en la ficha o el manifiesto que corresponda).

Por tipo de referencia:

| Qué se suma | Pasos propios (además de 5–9) |
|---|---|
| **Vista nueva de un kit de prenda** | Generar **editando** una vista puesta aprobada con el macro como segunda imagen · revisar al 100 % (`pnpm foto:emblema`: esfera arriba, ventanas horizontales, letras exactas) · copiar a `final/` con `<prefijo>-NN-puesto-<clave>-<tam>-v01-fondo-estudio.png` · declararla en `usoPorVista` con la clave `<giro>[-<tapa>\|-bajo][-mujer]` · agregarla al manifiesto del kit (`cuando_usarla`) y su prompt a `brief/` · documentar en el LEEME del kit |
| **Personaje nuevo del elenco** | Ficha en la biblia del elenco (§3) con geometría · candidatos con realismo v3 · el operador elige · vistas por edición desde la elegida · cuerpo extendido a escala medida (≥ 7,2 cabezas) · carpeta `_identidad-elenco/<clave>/` con los 8 archivos · entrada en `ELENCO` (etiqueta, `silueta`, `linea`, `identity` que empiece «IDENTITY (critical):» y lo declare «fictional Efeonce campaign character») |
| **Expresión nueva de Nexa** | Método A2 · medir con `pnpm foto:rostro --persona nexa` · copiar a `_identidad-nexa/5-expresiones-frente/nexa-expr-NN-<clave>.png` · entrada en `expresiones` de `PERSONAS.nexa` · LEEME de `_identidad-nexa` |
| **Persona nueva con proporción declarada** | `rostro: { largoAncho, tolerancia }` medido con `pnpm foto:rostro` sobre sus imágenes aprobadas casi frontales |

Criterio de elección de la vista ya sumada: [Selección de referencias de marca](EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) §3.1.
