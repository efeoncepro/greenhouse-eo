# Recuperar y archivar archivos de `ai-generations/` — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-01 por Claude
> **Ultima actualizacion:** 2026-10-01 por Claude
> **Modulo:** Creative · producción con IA (fotografía de marca, CTA, deck, superficies, motion y audio)
> **Ruta en portal:** no aplica — se opera desde la terminal del repo `greenhouse-eo`
> **Estado:** contrato vigente desde el 2026-10-01; los comandos `ai-gen:*` los implementa una tarea en curso
> **Documentacion relacionada:** [Contrato de almacenamiento (SSOT)](../../operations/AI_GENERATIONS_STORAGE_V1.md) · [Creative Workbench (ADR)](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md) · [Fotografía de marca](../../operations/brand-photography/README.md) · [Recetas del deck](../../operations/brand-graphic-line/deck-recipes/README.md)

## Para qué sirve

`ai-generations/` guarda todo lo que se genera con IA: plates, kits de marca, identidades, rondas, descartes. Son
15 GB que no caben en git ni conviene tener completos en cada disco. Este manual explica cómo:

- **recuperar** un archivo que una pieza necesita y no está en tu disco;
- **archivar** exploración vieja para liberar espacio sin perderla;
- **promover** algo de exploración a referencia aprobada.

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
   El comando extiende `pnpm media:archive-ai-generation` (la etapa de copia): sube, relee cada archivo por sha256,
   escribe `artifacts.remote.json` en la carpeta y **recién entonces** borra los binarios locales. Los `.md`, `.json` y
   `.mjs` versionados en git se quedan. Con `--keep-local` sube y registra sin borrar.
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

Citarla sólo en un documento **no** la protege.

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
| `foto:prompt` o `foto:assets:check` dice que falta una referencia | La carpeta no está en este disco | Paso A |
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
- Canon y Workbench: [ADR del Creative Workbench, Delta 2026-10-01](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)
- Regla auto-load para agentes: `.claude/rules/ai-generations-storage.md`
