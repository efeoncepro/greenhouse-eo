# Manual — Leer y ampliar el catálogo de rutas del Creative Producer

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.1
> **Creado:** 2026-07-20 por Claude (TASK-1500)
> **Ultima actualizacion:** 2026-07-20 por Claude (TASK-1500 — modelo público, casa interna)

## Para qué sirve

El catálogo gobernado de rutas (`TASK-1500`) es la SSOT de qué admite cada ruta creativa de Globe: constraints de forma de salida por modalidad, specialty, modos de entrada, el **modelo** público (nombre + versión) y la **casa** interna de clasificación. Este manual cubre las dos operaciones del día a día: **leerlo** (SDK/HTTP) y **ampliarlo** (agregar o ajustar una ruta como dato).

## Antes de empezar

- **Dónde vive:** repo hermano `efeonce-globe` (`../efeonce-globe`). Skill obligatoria: `greenhouse-globe`.
- **Autoridad:** leer el catálogo requiere la capability `globe.producer.catalog.read`. El **modelo** (nombre + versión) viaja siempre. Ver la **casa** interna requiere además `globe.producer.route.reveal_house` (autoridad de operador; el service principal interno la tiene). Sin ella, la proyección omite la casa — no es un error, es la vista de cliente.
- **Superficies:** HTTP/SDK/CLI/worker/E2E disponibles; UI y MCP `policy-blocked` hasta el gate de `TASK-1505`.

## Leer el catálogo (SDK)

```ts
import { GlobeClient } from '@efeonce-globe/sdk';

const catalog = await client.listProducerRoutes({ modality: 'video' }); // filtros opcionales: capability, modality
// catalog.data.catalogVersion — para invalidar caches
// catalog.data.routes[n].constraints — union discriminada por modality

const route = await client.getProducerRoute('ref/motion/loop-v1');
```

Por HTTP es `POST /v1/readers` con `reader: 'globe.producer.catalog.list'` o `'globe.producer.catalog.get'`.

## Ampliar el catálogo (agregar/ajustar una ruta)

1. Editar el array `PRODUCER_ROUTE_CATALOG` en `efeonce-globe/packages/domain/src/producer-catalog.ts` — **solo dato**; el motor del reader no se toca. Subir `PRODUCER_CATALOG_VERSION`.
2. Respetar las invariantes (los drift guards abortan la carga si no):
   - `routeId` único, minúsculas/dígitos/guiones/slashes (convención `ref/<modalidad>/<nombre>-vN`).
   - `capability` debe existir en `CREATIVE_CAPABILITIES` y su modalidad debe coincidir con `constraints.modality`.
   - `audioCapable` coherente: imagen nunca, audio siempre, video según el motor.
   - `model.name` y `house` no vacíos; `model.version` opcional (etiqueta libre: "2.0", "5 Pro", "Multilingual v2").
   - **Nunca un slug de proveedor** en `routeId`, `model.name`, `model.version` ni `house` (ni prefijos `fal-ai/`/`bytedance/`, ni hosts `fal.run`/`run.app`/`googleapis.com`; los labels no llevan `/`). El **nombre del modelo** ("Seedance") sí es válido y público; el **slug** (`bytedance/seedance-2.0/...`) no.
3. Correr `cd ../efeonce-globe && pnpm check` — un catálogo inválido es un build roto, nunca un catálogo servido.
4. Los constraints son *seed anclado al motor real*: si un adapter cambia sus límites (duración, resoluciones, formatos), se ajusta acá el dato + versión. No prometas en el catálogo lo que el seam no puede servir — `TASK-1501` valida contra esto **antes de gastar**.

## Qué no hacer

- **No** leer `PRODUCER_ROUTE_CATALOG` directo desde un consumer nuevo: los consumers in-process usan los helpers (`getProducerRoute` / `resolveRouteConstraints` / `listProducerRoutes`); las superficies usan los readers gobernados.
- **No** re-dispatchear `globe.producer.catalog.get` por el registry desde dentro de otro handler — es reuse por helper, igual que `runModelLabExperiment`.
- **No** poner costo vendor, margen ni slug en el catálogo. El costo por ruta es `TASK-1502`; el slug vive en el adapter.
- **No** promover `ui`/`mcp` a `available` — esa promoción es del gate de `TASK-1505`.

## Problemas comunes

- **`access_denied` al leer:** el principal no tiene `globe.producer.catalog.read` (en web-mode el broker de Greenhouse aún no la otorga a humanos — esperado hasta 1505).
- **`policy_blocked`:** estás despachando por una surface no promovida (`ui`/`mcp`).
- **Falla la carga con `globe_producer_catalog_*`:** un guard rechazó la edición de dato — leer el código del error (duplicate_route / unknown_capability / modality_mismatch / audio_incoherent / slug_leak / constraints_invalid).

## Referencias técnicas

- Arquitectura: [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
- Funcional: [efeonce-globe-producer-catalog.md](../../documentation/creative-studio/efeonce-globe-producer-catalog.md)
- Código: `efeonce-globe/packages/{contracts,domain}/src/producer-catalog.ts` · SDK `packages/sdk/src/index.ts`
