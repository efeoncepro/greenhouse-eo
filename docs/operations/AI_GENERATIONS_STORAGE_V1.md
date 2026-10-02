# Almacenamiento de `ai-generations/` — local, canon y archivo · V1

> **Tipo de documento:** Contrato operativo (SSOT de dónde vive cada archivo de `ai-generations/`)
> **Versión:** 1.0
> **Creado:** 2026-10-01 por Claude
> **Última actualización:** 2026-10-01 por Claude
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
| **Citado por código** | Carpeta citada por `src/**` o `scripts/**` | Local | No |
| **Reciente** | Carpeta modificada hace menos de 3 días | Local | No (puede estar escribiéndola otra sesión) |
| **Exploración** | Todo lo demás: rondas, descartes, pruebas, historial | Archivo (con su `artifacts.remote.json`) | Sí, con `ai-gen:archive` |

Las tres primeras clases forman lo **protegido**. Al 2026-10-01 son ~64 carpetas y 6,7 GB que se quedan en local;
la exploración son ~107 carpetas y ~8,4 GB.

### 2.1 Cómo se deriva lo protegido

Lo protegido **se deriva, nunca se lista a mano**: `pnpm ai-gen:protected` lo calcula cada vez desde las tres
fuentes (lock, catálogo de recetas, citas en `src/**` y `scripts/**`). No existe una lista que mantener; si una
carpeta deja de estar citada, deja de estar protegida en la siguiente corrida, y si se la cita, pasa a estarlo.

Consecuencia: **citar una carpeta en un doc NO la protege.** Los docs no son fuente de la derivación (ver regla 4).

### 2.2 Canon como respaldo

El canon es la distribución de las referencias selladas para el equipo del Creative Workbench **y** el respaldo de
esos kits para greenhouse-eo. Una copia en canon **no autoriza borrar el original local** mientras el lock lo declare:
`foto:prompt` y los compositores leen del disco.

## 3. Los comandos

| Comando | Qué hace |
|---|---|
| `pnpm ai-gen:where <ruta\|carpeta>` | Dice dónde está: `local`, `canon`, `archivo` o `desconocida`; da la URL `gs://` y el comando para bajarla |
| `pnpm ai-gen:pull <carpeta\|ruta>` | Rehidrata a la **misma ruta**, verifica sha256 contra `artifacts.remote.json` o el lock; idempotente (lo que ya está correcto no se baja de nuevo) |
| `pnpm ai-gen:protected [--json]` | Lista lo protegido, derivado de las tres fuentes de §2 |
| `pnpm ai-gen:archive plan` | Muestra qué carpetas se archivarían, con su tamaño; no toca nada |
| `pnpm ai-gen:archive apply [--folder X] [--keep-local]` | Extiende `media:archive-ai-generation`: sube, hace readback por sha256, escribe `artifacts.remote.json` y **recién entonces** borra los binarios locales (los `.md`/`.json`/`.mjs` versionados se quedan). Rehúsa carpetas protegidas y carpetas modificadas hace menos de 3 días. `--keep-local` sube y registra sin borrar |
| `pnpm media:archive-ai-generation -- --run ai-generations/<carpeta> [--apply]` | El primitive del carril ([Web Media Delivery Tooling](web-media-delivery-tooling.md)): es la **etapa de copia** — sube los binarios al bucket y escribe `artifacts.remote.json`. No aplica guardas de protección ni readback, y no borra lo local; `ai-gen:archive` lo envuelve con esas tres cosas. Para archivar exploración y liberar disco se usa `ai-gen:archive` |
| `pnpm creative:assets:publish plan\|apply` | Publica al canon lo sellado en el lock (verifica sha256, nunca borra). Lista **cada prefijo** que el lock declara; hasta el 2026-10-02 listaba sólo `ai-generations/**` y daba los 182 Sparks por faltantes en cada corrida |
| `pnpm assets:pull` | En el repo `creative-workbench`: el equipo baja el canon |

Después de un `ai-gen:archive apply`, los `artifacts.remote.json` nuevos o actualizados se commitean: sin ellos nadie
puede encontrar ni rehidratar esa carpeta.

## 4. Reglas para agentes

1. **Una ruta `ai-generations/...` citada en una skill o un doc es una ruta LÓGICA.** Si no está en disco:
   `pnpm ai-gen:where <ruta>` y después `pnpm ai-gen:pull <carpeta>` **antes de componer**.
2. **NUNCA regenerar, sustituir ni «aproximar»** un plate, kit o referencia aprobada porque falta en disco.
   **NUNCA resellar `assets.lock.json`** para tapar un faltante. **NUNCA editar un `artifacts.remote.json` a mano.**
3. **NUNCA archivar a mano** (`gcloud storage cp/rm`, `gsutil`) ni borrar carpetas o binarios de `ai-generations/`
   por fuera de `pnpm ai-gen:archive`. **Lo archivado en el bucket nunca se borra.**
4. **Promover algo de exploración a referencia canónica** = sellarlo en el lock (`pnpm foto:assets:lock`) o citarlo
   en la receta del deck — eso lo vuelve protegido — y publicarlo al canon (`pnpm creative:assets:publish apply`).
   Citarlo en un doc no basta. Si estaba archivado, primero `pnpm ai-gen:pull`.
5. **Si otra sesión puede estar escribiendo en la carpeta, no se archiva.** La regla de los 3 días lo cubre; no la
   esquives con `--folder` sobre una carpeta que alguien está usando.

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
