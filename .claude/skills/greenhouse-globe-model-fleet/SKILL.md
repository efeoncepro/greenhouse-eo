---
name: greenhouse-globe-model-fleet
description: >-
  Descubre, documenta, integra y verifica rutas de modelos/proveedores para Efeonce Globe usando fichas
  machine-readable por ruta. Úsala cuando se pregunte si un modelo está disponible, cuando se agregue o
  actualice un provider/model/endpoint/capability, o cuando haya que cablear adapter, completion, outputs,
  pricing, derechos, evaluación, canary, promoción o disponibilidad en la flota. Empieza por FLUX 3 y
  extiéndela con nuevas fichas sin convertirla en un catálogo paralelo al runtime.
---

# Globe Model Fleet

Gobierna el trabajo de integración de modelos en la unidad correcta: `routeId + capability + provider + model +
version/endpoint`. La skill es el método; las fichas son evidencia y contrato de trabajo; el runtime de Globe sigue
siendo la autoridad de disponibilidad.

## Composición obligatoria

Al tocar Globe, carga también:

- `greenhouse-globe` para boundaries, adapters, completion, rights, créditos, promoción y evidencia UI.
- `software-architect-2026` para decisiones de contrato, source of truth, fallos, rollout y reversibilidad.
- `greenhouse-ai-creative-rights-governance` y `legal-privacy-ip-operator` cuando cambien derechos, consentimiento,
  datos de cliente, entrenamiento, retención o entrega comercial.

Lee la task y la arquitectura gobernantes antes de modificar `efeonce-globe`. Greenhouse conserva tasks, ADRs,
fichas y handoff; Globe conserva código, runtime, infraestructura y evidencia técnica.

## Fuentes de verdad

No mezcles estas capas:

| Pregunta | Autoridad |
|---|---|
| ¿Está disponible ahora? | reader live `globe.producer.fleet.list` en Globe |
| ¿Qué evidencia y pendientes existen? | `GLOBE_MODEL_FLEET_STATUS.md` + handoff de Globe |
| ¿Qué debe implementar una ruta? | task/ADR + route card vigente en Greenhouse |
| ¿Qué soporta realmente el proveedor? | OpenAPI, API, pricing y términos primarios fechados |
| ¿Cómo se ejecuta? | `packages/provider-contract` + adapter/runner de Globe |

La skill o una route card nunca pueden promover una ruta ni sustituir el reader live. Una divergencia entre reader y
ledger es un hallazgo que se documenta, no una invitación a elegir el estado más conveniente.

## Flujo de trabajo

### 1. Fijar identidad y superficie

Escribe la tupla exacta antes de discutir capacidades. Separa rutas que parezcan similares y no uses el nombre de
familia como identidad ejecutable. Registra, como mínimo:

```text
routeId · capability semántica · operation · provider · model · version · endpointId · región · completion driver
```

Usa nombres semánticos (`video-generate`, `video-frames`, `video-extend`), no una capability inventada por modelo.
Una ruta nueva no hereda evidencia, precios, derechos, adapter, canary ni disponibilidad de una ruta vecina.

### 2. Reconstruir evidencia primaria

Carga la ficha canónica correspondiente en `docs/architecture/creative-studio/model-fleet/routes/` y valida su
frescura. Para claims inestables conserva URL o path, autoridad, fecha observada, alcance y condición de
revalidación. Antes de implementar o promover, vuelve a consultar el proveedor; no conviertas un snapshot en hecho
actual.

Para Fal, resuelve el endpoint desde catálogo/OpenAPI y un submit controlado. Conserva las URLs `status_url`,
`response_url` y `cancel_url` que Fal devuelva por request; nunca derives una URL de seguimiento desde el slug.
Mantén `x-app-fal-disable-fallbacks` y la key únicamente en Globe server-side. Para BFL, trata Early Access,
`latest`, límites de escala, términos y derechos como gates explícitos, no como disponibilidad comercial.

### 3. Completar el mapa de cables

Para cada ruta, registra estado y evidencia de todos estos edges:

```text
provider_supported → contract_declared → adapter_wired → transport_verified
→ output_verified → billing_verified → rights_verified → evaluated
→ canary_passed → promoted → available
```

Además registra `completion_driver`, `input_encoder`, `result_driver`, `rate/settlement`, `rights/policy`,
`evaluation`, `canary`, `rollback` y consumidores (`ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform`,
`e2e`). Un edge ausente es un gap, no un `true` implícito.

Usa solo estos estados de edge: `verified`, `proposed`, `wired`, `not_started`, `blocked`, `unsupported`,
`unknown` o `stale`. Usa `gated`, `not_promoted` y `available` solo para el estado de disponibilidad de la ruta.
`provider_supported` no implica `globe_supported`; `available` exige reader live, binding/readiness, derechos,
evaluación, canary y promoción convergentes.

### 4. Validar antes de gastar

Antes de estimate, prepare o reserve, valida shape, MIME, tamaño, cardinalidad, orden, índices temporales, audio,
derechos e idempotencia contra el contrato de la ruta. Rechaza antes del spend lo que la ruta declara
`unsupported`; no descartes campos o referencias en silencio.

En el contrato creativo, `duration`, ratio y resolución son forma de salida (`RouteConstraintsV1`/`OutputShapeV1`),
no controles creativos. Controles como audio, seguridad o dirección creativa necesitan mecanismo y `valueShape` por
ruta. Keyframes, drafts y cache opaco requieren semántica explícita, lineage y recuperación; no los reduzcas a una
lista de imágenes o a una variante de resolución.

### 5. Cablear por el seam gobernado

El primer call billable debe seguir:

```text
command/reader → provider-contract → creative-runner → provider → completion
→ result driver → private ingest/hash → governance → receipt/settlement
```

No uses SDK del proveedor desde UI, MCP, CLI, scripts o tests. No agregues `endpoint + arbitrary JSON`, fallbacks
por capability ni un adapter BFL paralelo sin decisión explícita. Los slugs, costos vendor, URLs temporales,
headers y errores raw permanecen server-side.

### 6. Promover por ruta

La secuencia de promoción es independiente para cada identidad: rate snapshot, derechos/terms digest, evaluación,
binding/readiness/circuito, canary con spend fence, output retenido, settlement y readback de
`globe.producer.fleet.list`. Un canary de una ruta no habilita las demás. Si hay timeout, lee primero el estado con
la misma correlación/idempotencia; nunca repitas un submit billable a ciegas.

## FLUX 3 inicial

Carga [`FLUX_3_VIDEO_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/FLUX_3_VIDEO_ROUTE_CARD_V1.json)
para el inventario actual. Incluye cinco rutas estándar Fal, cinco drafts, `draft-enhance` y la superficie directa
BFL como Early Access no conectada. La ficha declara explícitamente namespace, keyframes, first/last, extend, audio,
cache, pricing, derechos y cada cable. Las fichas concretas viven en la arquitectura de Greenhouse, no dentro de la
skill, para que la skill no se convierta en un segundo catálogo.

La primera implementación prevista usa el adapter Fal existente de Globe; no crea SDK ni adapter BFL paralelo. Todas
las rutas parten `gated`. Resuelve primero los gaps de namespace, OpenAPI auténtico, pricing, keyframe/draft contract,
result schema y rights antes de tocar disponibilidad.

## Cómo leer y modificar una ficha

1. Ejecuta el validador estructural antes y después de editarla:

   ```bash
   node .codex/skills/greenhouse-globe-model-fleet/scripts/validate-route-cards.mjs
   node .codex/skills/greenhouse-globe-model-fleet/scripts/validate-route-cards.mjs --strict-freshness
   ```

   En Claude, usa el path espejo `.claude/skills/greenhouse-globe-model-fleet/`. La ficha concreta sigue siendo la
   ruta canónica de Greenhouse; no crees una copia bajo `references/routes/`.
2. Añade evidencia y fecha antes de cambiar un edge a `verified`.
3. Cambia un edge a `unknown` o `stale` cuando la evidencia no permita afirmar soporte; no lo omitas.
4. No pongas secretos, tokens, cookies, cuerpos raw, URLs firmadas, `status_url` vivos ni `response_url` vivos en la
   ficha. Registra el tipo de evidencia y el requisito de revalidación, no la credencial ni el artefacto efímero.
5. Actualiza la task/ADR/handoff que gobierna el cambio. La ficha no reemplaza esos artefactos ni el ledger humano.
6. Verifica paridad de los bundles Codex/Claude:

   ```bash
   pnpm skills:mirrors
   ```

## Criterio de salida

Entrega un resultado que permita a otro agente continuar sin adivinar:

- identidad exacta y superficie del proveedor;
- matriz de capacidades e inputs/outputs por ruta;
- estado de cada cable, incluyendo `unknown`/`unsupported`;
- evidencia primaria fechada y qué debe revalidarse;
- archivos de Globe y Greenhouse que son dueños de cada cambio;
- riesgos, dependencias, rollback y siguiente paso ejecutable.

Nunca describas una capacidad de marketing como implementada solo porque aparece en una ficha. `provider_supported`,
`contract_declared`, `adapter_wired`, `transport_verified`, `output_verified`, `billing_verified`, `rights_verified`,
`evaluated`, `canary_passed`, `promoted` y `available` deben poder demostrarse por separado.
