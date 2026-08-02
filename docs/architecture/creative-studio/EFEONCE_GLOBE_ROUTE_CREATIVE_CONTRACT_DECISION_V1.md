# ADR-022 — Efeonce Globe: contrato creativo versionado por ruta

## Status

- Status: Accepted
- ID: ADR-022
- Date: 2026-08-02
- Owner: Efeonce Globe / Creative Producer
- Scope: catálogo de rutas, contrato de ejecución, compiler server-side, adapters y consumidores del Producer
- Reversibility: two-way-but-slow
- Confidence: high
- Validated as of: 2026-08-02
- Governing task: [`TASK-1633`](../../tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)
- Extends: [`EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`](EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md) y [`EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`](EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md)

## Context

El catálogo vigente expresa `capability`, `inputModes` y una policy plana de referencias. Esa forma mezcla tres
preguntas distintas: qué operación quiere ejecutar la persona, qué significa cada asset de entrada y cómo una ruta
aplica controles creativos. La UI convirtió esas mezclas en botones de modo, eligió otra ruta al cambiar de modo y
duplicó topes de referencias. Los adapters quedaron obligados a inferir intención por tipo o cantidad de archivos.

Gemini Omni hizo visible el defecto: su ruta se publicó como un modo `elements`, aunque conserva un prompt y admite
referencias de imagen; al quedar su ruta no disponible, el botón completo dejó de ser accionable. El mismo patrón
amenaza a Seedance, Veo y cualquier modelo nuevo con referencias, cuadros, cámara, movimiento o edición.

## Decision

Cada revisión ejecutable de ruta publica un `RouteCreativeContractV1` browser-safe y autocontenido. El descriptor
separa cinco ejes:

1. `operation`: intención de producto (`create`, `edit`, `extend`, `upscale`).
2. `inputSlots`: assets tipados por rol semántico, cardinalidad, medios admitidos y orden.
3. `inputCombinations`: conjuntos de slots válidos, incluido qué combinación es la predeterminada.
4. `creativeControls`: controles comunes y su mecanismo de soporte (`native-parameter`, `prompt-semantic`,
   `reference-conditioned`, `preprocessed`, `postprocessed`, `unsupported`).
5. `outputContract`: modalidad y características reales del resultado, incluida la presencia de audio embebido.

El descriptor vive dentro de la revisión de ruta. Un catálogo compartido puede definir el vocabulario, pero no es
una referencia mutable que altere retrospectivamente una ruta. El compiler server-side valida operación, slots,
controles y output antes del estimate y del spend; los adapters son los únicos que traducen esa intención a payloads
de proveedor. El fingerprint canónico incluye revisión de ruta, operación, slots ordenados con sus roles, controles
y output.

`inputModes` y `referencePolicy` permanecen temporalmente como proyección legacy durante una migración aditiva. Si
ambas formas están presentes deben ser equivalentes; una ruta nueva no puede nacer sólo con el contrato legacy.

## Product and UI Contract

- El prompt es una entrada primaria del composer y no desaparece al elegir una operación o agregar referencias.
- Cambiar operación no cambia el modelo seleccionado. Si la ruta no admite la operación, la UI lo explica y ofrece
  una elección explícita; nunca sustituye el modelo en silencio.
- Referencias, cuadros, source, motion source y audio son slots del request, no nombres de modos visuales.
- La UI deriva disponibilidad, topes, medios y copy desde el descriptor publicado. No mantiene matrices por nombre
  de modelo ni por provider.
- Un control puede compartir primitive visual entre rutas y conservar mecanismos server-side distintos.

## Provider Boundary

Gemini Omni continúa integrado directamente por Vertex/Gemini. Fal sirve sólo como evidencia comparativa de
producto; este ADR no agrega un binding, endpoint, secret ni fallback de Omni hacia Fal. IDs de proveedor, slugs,
prompts efectivos y payloads quedan fuera del contrato browser-safe.

## Alternatives Considered

1. Agregar un modo/botón por modelo. Rechazado: acopla navegación a proveedores y vuelve a crear la falla para cada
   integración.
2. Conservar `inputModes` y ampliar su unión. Rechazado: no expresa roles, combinaciones, mecanismo de control ni
   output, y obliga a inferir semántica.
3. Derivar soporte inspeccionando adapters en el browser. Rechazado: filtra detalles server-side y crea dos SSOT.
4. Adoptar el schema de Fal como contrato de producto. Rechazado: representa un transporte particular y no la
   semántica común de Globe ni el contrato oficial de Vertex.
5. Migración destructiva inmediata. Rechazado: rompe snapshots históricos y rutas promovidas sin aportar seguridad.

## Consequences

La selección de modelo queda estable, los inputs conservan significado hasta lineage y cualquier control requerido
que no pueda honrarse falla antes de gastar. El costo es una migración dual-read, pruebas de equivalencia y cambios
coordinados en catálogo, compiler, adapters y UI. Las rutas cuyo contrato efectivo cambie requieren su propio
rollout y canary; no heredan evidencia de una ruta vecina.

## Runtime Contract

- Tipos públicos: `packages/contracts/src/producer-catalog.ts`.
- Catálogo y validación: `packages/domain/src/producer-catalog.ts` y `packages/domain/src/model-lab.ts`.
- Compilación neutral y provider evidence: `packages/provider-contract/src/index.ts` y
  `apps/studio-web/src/governed-production-composition.ts`.
- Consumo UI: `apps/studio-client/src/surfaces/producer/composer/` y `apps/studio-client/src/data/`.
- Autoridades no modificadas: route binding/readiness/circuit, rights, spend fence, private ingest, retention,
  lineage y Asset Governance.
- Rollout mínimo de no regresión: una generación UI nueva de Seedance y una de Omni, cada una con una sola
  idempotency key y readback-first ante transporte ambiguo.

## Revisit When

Reabrir si una operación necesita múltiples rutas en una sola transacción, si aparece un input continuo/streaming,
si los controles deben ser extensibles por terceros o si una modalidad nueva no puede representarse sin cambiar la
semántica de los cinco ejes. Un provider nuevo por sí solo no reabre la decisión.
