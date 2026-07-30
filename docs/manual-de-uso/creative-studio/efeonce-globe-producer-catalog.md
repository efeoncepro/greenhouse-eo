# Manual — Leer y ampliar el catálogo de rutas del Creative Producer

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.3
> **Creado:** 2026-07-20 por Claude (TASK-1500)
> **Ultima actualizacion:** 2026-07-30 (TASK-1553 — receta ejercitada en seis rutas de imagen)

## Para qué sirve

El catálogo gobernado de rutas (`TASK-1500`) es la SSOT de qué admite cada ruta creativa de Globe: constraints de forma de salida por modalidad, specialty, modos de entrada, el **modelo** público (nombre + versión) y la **casa** interna de clasificación. Este manual cubre las dos operaciones del día a día: **leerlo** (SDK/HTTP) y **ampliarlo** (agregar o ajustar una ruta como dato).

## Antes de empezar

- **Dónde vive:** repo hermano `efeonce-globe` (`../efeonce-globe`). Skill obligatoria: `greenhouse-globe`.
- **Autoridad:** leer el catálogo requiere la capability `globe.producer.catalog.read`. El **modelo** (nombre + versión) viaja siempre. Ver la **casa** interna requiere además `globe.producer.route.reveal_house` (autoridad de operador; el service principal interno la tiene). Sin ella, la proyección omite la casa — no es un error, es la vista de cliente.
- **Superficies:** HTTP/SDK/CLI/worker/E2E disponibles; la UI del Producer está promovida desde el cierre de
  `TASK-1505`; MCP conserva un gate independiente.

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
- **No** cambiar coverage por conveniencia local. La UI ya está promovida; cualquier apertura de MCP requiere su
  propio gate, autoridad y evidencia.

## Problemas comunes

- **`access_denied` al leer:** el principal no tiene `globe.producer.catalog.read` o el workspace no está bindeado;
  revisa el grant y el trusted context, no inventes autoridad en el request.
- **`policy_blocked`:** estás despachando por una surface no promovida (`ui`/`mcp`).
- **Falla la carga con `globe_producer_catalog_*`:** un guard rechazó la edición de dato — leer el código del error (duplicate_route / unknown_capability / modality_mismatch / audio_incoherent / slug_leak / constraints_invalid).

## Agregar un modelo al catálogo (multi-modelo, TASK-1553)

Sumar un modelo/tier nuevo (que **coexiste**, no reemplaza) es una secuencia acotada y gobernada. Cada paso es aditivo y reversible por *revert*; la ruta queda **inerte hasta promoverse**, así que agregarla no cambia nada en producción hasta el gate humano.

1. **Ruta pública en el catálogo** — agrega una entrada `ProducerRouteDescriptorV1` en `PRODUCER_ROUTE_CATALOG` (`packages/domain/src/producer-catalog.ts`): `routeId` nuevo, `model` = nombre + versión **público** (ej. `{ name: 'Nano Banana', version: 'Pro' }`), `capability`, `constraints`, `house`. Sube `PRODUCER_CATALOG_VERSION`. **Sin slug** — el guard de carga rompe el build si se filtra.
2. **Entrada en el adapter** — agrega `ADAPTER_ROUTING_BY_ROUTE[routeId] = { model/slug, modelVersion, region… }` en el adapter del proveedor (`{openai,vertex,fal}-adapter.ts`). Acá vive el *slug* real, una sola vez, detrás de la frontera. Vertex image usa `region: 'global'`.
3. **Política del composite** — asegura que el prefijo de la ruta resuelva al proveedor dueño (`ref/still/openai-*` → openai, `ref/still/nanobanana-*` → vertex, resto → fal por defecto).
4. **Allowlist de endpoint + driver gobernado** — agrega la entrada de producción atada a la ruta exacta
   (`governed-production-composition.ts`) y el driver oficial del proveedor. OpenAI y Vertex image ya tienen este
   carril; una ruta nueva no hereda su aprobación por pertenecer al mismo proveedor.
5. **Binding** — `globe.production-routing.route.append` con la identidad de wire (append, no `enabled`). La ruta queda canary-able pero inerte para producción.
6. **Evaluación exacta → revisión → atestación → promoción** — genera evidencia para la identidad exacta,
   registra revisión humana y atestación comercial cuando corresponda, promueve binding/readiness/circuito y
   verifica el readback. La promoción no sustituye la aprobación de entrega del asset.
7. **Canary real desde la UI autenticada** — selecciona la ruta en el Producer, ejecuta una generación real y
   verifica modelo/versión, créditos, estado terminal, output retenido, vista previa y descarga. Un test verde o un
   probe directo al proveedor no cierra esta prueba.

Para SVG de Recraft, Fal puede declarar `image/svg+xml` en el payload y servir el archivo como
`application/octet-stream`. No amplíes la allowlist MIME global: acepta el transporte genérico únicamente para la
ruta que espera SVG, valida los bytes como SVG antes del ingest y sirve el resultado con CSP sandbox.

**Actualizar** un modelo (no agregar) = subir `modelVersion` en la **misma** `routeId` (pasos 1-2 sobre la ruta existente + binding nuevo). **Nunca** cambies el `providerId`/linaje de una `routeId` existente para reusarla como otro modelo: eso es una sustitución silenciosa, prohibida por diseño.

Los pasos 1-3 son código (gates `pnpm check` + `pnpm build` verdes); los pasos 4-6 son el **rollout gobernado** (canary + atestación + promoción, con gasto real y decisión humana).

> Detalle técnico: [ADR-013 — Route-Based Model Resolution](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md).

## Referencias técnicas

- Arquitectura: [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
- Decisión multi-modelo: [EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md) (ADR-013)
- Funcional: [efeonce-globe-producer-catalog.md](../../documentation/creative-studio/efeonce-globe-producer-catalog.md)
- Código: `efeonce-globe/packages/{contracts,domain}/src/producer-catalog.ts` · adapters `apps/creative-runner/src/{openai,vertex,fal,composite}-adapter.ts` · SDK `packages/sdk/src/index.ts`
