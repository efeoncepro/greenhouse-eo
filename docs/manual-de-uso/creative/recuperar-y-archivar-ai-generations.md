# Recuperar y archivar archivos de `ai-generations/` — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-01 por Claude
> **Ultima actualizacion:** 2026-10-03 por Claude — descarga automática desde el canon, publicar una referencia nueva y archivar la exploración
> **Modulo:** Creative · producción con IA (fotografía de marca, CTA, deck, superficies, motion y audio)
> **Ruta en portal:** no aplica — se opera desde la terminal del repo `greenhouse-eo`
> **Estado:** contrato vigente desde el 2026-10-01; comandos `ai-gen:*` operativos; descarga automática desde el canon en `foto:prompt`/`foto:generar` desde el 2026-10-03
> **Documentacion relacionada:** [Contrato de almacenamiento (SSOT)](../../operations/AI_GENERATIONS_STORAGE_V1.md) · [Creative Workbench (ADR)](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md) · [Fotografía de marca](../../operations/brand-photography/README.md) · [Recetas del deck](../../operations/brand-graphic-line/deck-recipes/README.md)

## Para qué sirve

`ai-generations/` guarda todo lo que se genera con IA: plates, kits de marca, identidades, rondas, descartes. Son
15 GB que no caben en git ni conviene tener completos en cada disco. Este manual explica cómo:

- **recuperar** un archivo que una pieza necesita y no está en tu disco;
- **archivar** exploración vieja para liberar espacio sin perderla;
- **promover** algo de exploración a referencia aprobada.

Desde el 2026-10-03, `pnpm foto:prompt` y `pnpm foto:generar` traen solas del canon las referencias selladas que
faltan en tu disco o que están desactualizadas (paso A0): no necesitas tener todas las referencias en local. Los bytes
pasan por tu máquina al generar, como caché, no como copia permanente.

Cada archivo tiene una ruta fija (`ai-generations/<carpeta>/<archivo>`) y vive en uno de tres lugares:

| Lugar | Qué guarda |
|---|---|
| Tu disco (local) | Lo protegido (referencias selladas, plates de las recetas, lo que cita el código) y todo lo reciente |
| Canon (`gs://efeonce-creative-canon`) | Las referencias aprobadas y selladas: identidades, kits de prendas, logo 3D, mascotas, Sparks |
| Archivo (`gs://efeonce-group-greenhouse-private-assets-prod`, bucket privado de Greenhouse) | Exploración, rondas, descartes e historial. Cada carpeta archivada guarda en git su `artifacts.remote.json` (qué se subió, con su huella) |

## Antes de empezar

- Trabaja en el checkout de `greenhouse-eo` (rama `develop`).
- Ten la sesión de Google Cloud vigente. Si un comando dice que no puede leer el bucket, renuévala con
  `pnpm gcloud:auth:playwright -- --force`.
- El **archivo** es un bucket privado de Greenhouse: lo opera el operador y sus agentes; el equipo del Creative Workbench
  no lo baja. Si no tienes acceso, pídeselo al operador; no copies desde otra máquina.
- Para **archivar** necesitas que nadie más esté trabajando en esa carpeta (el comando rehúsa carpetas modificadas
  hace menos de 3 días).

## Paso a paso

### A0. Descarga automática desde el canon (fotografía)

No tienes que hacer nada: al correr `pnpm foto:prompt` o `pnpm foto:generar`, antes de usar cada referencia sellada en
`scripts/foto/assets.lock.json` el comando revisa tu disco:

- si falta, la baja del canon;
- si está pero no es la versión aprobada en el lock, baja la aprobada y la pone en su lugar;
- si tu copia era distinta, **no la borra**: la deja aparte con el sufijo `.local-<8 caracteres>`, por si era trabajo
  tuyo sin sellar.

Siempre verifica la huella sha256 antes de dejar el archivo. En la salida verás:

| Línea | Qué significa |
|---|---|
| `⇣ ai-generations/…/archivo.png (canon)` | Se bajó del canon y calza con el lock |
| `↺ ai-generations/…/archivo.png: la copia local no era la aprobada; quedó aparte en archivo.local-1a2b3c4d.png` | Tu copia local era otra versión; quedó al lado, intacta |
| `⚠ ai-generations/…/archivo.png: no se pudo traer del canon (<motivo>)` | No pudo bajarla: sin sesión de gcloud, sin red o la huella no calzó. Sigue el paso A |

**Cuándo apagarlo con `FOTO_SIN_CANON=1`:** sin red, o cuando quieres probar a propósito con una copia local que
todavía no está sellada (sin esa variable, el comando la apartaría y bajaría la aprobada):

```bash
FOTO_SIN_CANON=1 pnpm foto:prompt <ficha.json>
```

Si te aparece un archivo `.local-…`, revisa qué es: si es la nueva versión buena de una referencia, súmala con el paso
E; no lo renombres a mano. Las referencias **no selladas** y los demás compositores (`brand:compose`,
`foto:componer:cta`, recetas del deck, motion, audio) no bajan nada solos: para ellos sigue el paso A.

### A. Recuperar un archivo que falta

Ocurre cuando `foto:prompt`, `foto:componer:cta`, `brand:compose` u otro compositor dice que una referencia o un plate
no existe.

1. Pregunta dónde está:
   ```bash
   pnpm ai-gen:where ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png
   ```
   Te responde `local`, `canon`, `archivo` o `desconocida`, con la dirección `gs://` y el comando para bajarlo.
2. Si dice `canon` o `archivo`, bájalo a la misma ruta:
   ```bash
   pnpm ai-gen:pull ai-generations/2026-09-20_identidad-julio-nexa
   ```
   Verifica la huella sha256 de cada archivo contra el `artifacts.remote.json` de la carpeta (o el sello, si es una
   referencia del canon). Si ya estaba bien, no lo baja de nuevo.
3. Repite la composición. No cambies ninguna ruta en la ficha, la receta ni el plan.

### B. Ver qué está protegido

```bash
pnpm ai-gen:protected          # lista legible
pnpm ai-gen:protected --json   # para otro script
```

La lista se calcula cada vez desde tres fuentes: el sello `scripts/foto/assets.lock.json`, el catálogo de recetas del
deck y las carpetas que cita el código (`src/**`, `scripts/**`). No hay una lista que mantener a mano.

### C. Archivar exploración (operador)

1. Mira qué se archivaría y cuánto pesa:
   ```bash
   pnpm ai-gen:archive plan
   ```
2. Archiva todo lo elegible, o una carpeta:
   ```bash
   pnpm ai-gen:archive apply
   pnpm ai-gen:archive apply --folder ai-generations/2026-09-20_palancas-ronda3
   ```
   El comando extiende `pnpm media:archive-ai-generation` (la etapa de copia): sube, verifica tamaño, hash del servidor
   y sha256 de cada archivo, escribe `artifacts.remote.json` en la carpeta y **recién entonces** borra los binarios
   locales. Los `.md`, `.json` y `.mjs` versionados en git se quedan. Con `--keep-local` sube y registra sin borrar.
   Por defecto rehúsa carpetas modificadas hace menos de 3 días; si la carpeta es **del día, es tuya y nadie más está
   escribiendo en ella**, agrega `--min-age-days 0`:
   ```bash
   pnpm ai-gen:archive apply --folder ai-generations/2026-10-03_mi-exploracion --min-age-days 0
   ```
   **Archivar no es borrar:** lo archivado sigue recuperable con `pnpm ai-gen:pull <carpeta>`. Cuando se pide
   «eliminar lo no aprobado», esto es lo que se hace.
3. Commitea los `artifacts.remote.json` nuevos o actualizados (son lo que permite encontrar y rehidratar después).

### D. Promover exploración a referencia aprobada

1. Séllala: agrégala al catálogo de `foto:prompt` y corre `pnpm foto:assets:lock`, o cítala en la receta del deck.
   Eso la vuelve protegida.
2. Publícala al canon:
   ```bash
   pnpm creative:assets:publish plan
   pnpm creative:assets:publish apply
   ```
3. Si estaba archivada, primero `pnpm ai-gen:pull <carpeta>` para tenerla en disco.

Citarla sólo en un documento **no** la protege. Al revés, citar la carpeta de una corrida en el código (aunque sea en
un comentario) **sí** la protege y ya no se puede archivar: no cites rutas de corridas en comentarios.

### E. Publicar una referencia nueva y archivar su exploración

Es el recorrido completo de una referencia nueva (una vista de prenda, un personaje del elenco, una expresión de
Nexa). Sin todos los pasos, la referencia no está sumada.

1. Genera o edita la referencia y revísala **al 100 %**, no en hoja de contacto (para bordados, `pnpm foto:emblema`).
2. Cópiala a su lugar canónico con su nombre de convención (el `final/` del kit, `_identidad-elenco/<clave>/`,
   `_identidad-nexa/…`).
3. Declárala en el catálogo de `scripts/foto/build-prompt.mjs` (por ejemplo, en `usoPorVista` de la prenda).
4. Séllala:
   ```bash
   pnpm foto:assets:lock
   ```
5. Publícala al canon:
   ```bash
   pnpm creative:assets:publish plan
   pnpm creative:assets:publish apply
   ```
6. Corre la suite de foto:
   ```bash
   pnpm exec vitest run scripts/foto
   ```
7. Archiva la exploración (rondas, descartes, pruebas) de esa sesión:
   ```bash
   pnpm ai-gen:archive plan
   pnpm ai-gen:archive apply --folder ai-generations/<carpeta-de-exploracion> --min-age-days 0
   ```
   y commitea su `artifacts.remote.json`.
8. Documenta en el LEEME del lugar canónico (y en el manifiesto del kit, si es una prenda).

Los pasos propios de cada tipo están en el [contrato, §8](../../operations/AI_GENERATIONS_STORAGE_V1.md).

## Qué significan los estados

| Estado de `ai-gen:where` | Qué significa | Qué haces |
|---|---|---|
| `local` | Está en tu disco | Nada; si la composición falla igual, revisa el nombre de la ruta |
| `canon` | Es una referencia sellada publicada al canon | `pnpm ai-gen:pull <carpeta>` |
| `archivo` | Es exploración archivada (su `artifacts.remote.json` la registra) | `pnpm ai-gen:pull <carpeta>` (requiere acceso al bucket) |
| `desconocida` | No está registrada en ningún lugar | Para y avisa al operador con la ruta exacta y quién la cita |

## Qué no hacer

- **No** regeneres, sustituyas ni «aproximes» un plate, kit o referencia aprobada porque falta en disco.
- **No** reselles `assets.lock.json` para que un faltante «pase» el chequeo.
- **No** edites un `artifacts.remote.json` a mano.
- **No** archives ni borres con `gcloud storage cp/rm` o borrando carpetas: sólo con `pnpm ai-gen:archive`.
- **No** borres nada de lo archivado en el bucket.
- **No** subas nada de `ai-generations/` a `efeonce-creative-work`: ese bucket es de entregables del equipo.
- **No** borres el original local de una referencia sellada aunque ya esté en el canon.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `foto:prompt` o `foto:assets:check` dice que falta una referencia | La carpeta no está en este disco | `foto:prompt` ya intenta traer lo sellado del canon (A0); si muestra `⚠ … no se pudo traer`, paso A |
| `foto:prompt` muestra `⚠ … no se pudo traer del canon` | Sin sesión de gcloud, sin red o la huella no calzó | Renueva la sesión (`pnpm gcloud:auth:playwright -- --force`) y repite; si la huella no calza, avisa al operador |
| Aparece un archivo `.local-<8 caracteres>` junto a una referencia | Tu copia local no era la versión aprobada y quedó apartada | Revisa qué es; si es la nueva buena, paso E. No la renombres a mano |
| `ai-gen:archive` rehúsa una carpeta de hoy que es tuya | La regla de los 3 días | Si nadie más escribe en ella, `--min-age-days 0` |
| `brand:compose` da `missing-photo` | El plate de la receta no está en disco | Paso A con la ruta del plate |
| `ai-gen:pull` dice que el sha256 no coincide | El archivo cambió desde que se selló o archivó | No lo fuerces; avisa al operador |
| `ai-gen:where` da `desconocida` | Nunca se archivó ni se selló, o la ruta está mal escrita | Revisa la ruta; si está bien, avisa al operador |
| `ai-gen:archive` rehúsa una carpeta | Está protegida o se modificó hace menos de 3 días | Es lo esperado: no se archiva |
| Error de permisos al leer el archivo | Tu cuenta no tiene acceso al bucket privado | Pídeselo al operador |
| Una carpeta tiene `artifacts.remote.json` pero los binarios siguen en disco | Se copió con `pnpm media:archive-ai-generation` (la etapa de copia, que no borra) | Es correcto; para liberar espacio usa `ai-gen:archive` |

## Referencias técnicas

- Contrato (SSOT): [`docs/operations/AI_GENERATIONS_STORAGE_V1.md`](../../operations/AI_GENERATIONS_STORAGE_V1.md)
- Sello de referencias: `scripts/foto/assets.lock.json` (`pnpm foto:assets:lock`, `pnpm foto:assets:check`)
- Catálogo de recetas: `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json`
- Inventario del archivo: `ai-generations/<carpeta>/artifacts.remote.json` (schema `greenhouse.aiGenerationArtifacts.v1`)
- Etapa de copia: `pnpm media:archive-ai-generation` ([Web Media Delivery Tooling](../../operations/web-media-delivery-tooling.md))
- Publicación al canon: `scripts/creative-workbench/assets-publish.mjs`
- Descarga automática desde el canon: `scripts/foto/canon-sync.mjs` (bucket en `scripts/creative-workbench/control.json`)
- Canon y Workbench: [ADR del Creative Workbench, Delta 2026-10-01](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)
- Regla auto-load para agentes: `.claude/rules/ai-generations-storage.md`
