# ADR-022 — Efeonce Globe: contrato creativo versionado por ruta

## Status

- Status: Accepted
- ID: ADR-022
- Date: 2026-08-02
- Owner: Efeonce Globe / Creative Producer
- Scope: catálogo de rutas, contrato de ejecución, compiler server-side, adapters y consumidores del Producer
- Reversibility: two-way-but-slow
- Confidence: high
- Validated as of: 2026-08-02 (incluye el Delta 2026-08-02 (b), que fija dónde viaja el valor de un control)
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
   `reference-conditioned`, `preprocessed`, `postprocessed`, `unsupported`). **Es un descriptor de soporte, no un
   buzón de valores** — ver el Delta 2026-08-02 (b), que fija dónde viaja el valor y por qué no puede ser acá.
5. `outputContract`: modalidad y características reales del resultado, incluida la presencia de audio embebido.
   La **forma de salida** (duración, ratio, resolución) es de este eje y de `RouteConstraintsV1`/`OutputShapeV1`;
   no se declara además como control creativo.

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

## Delta 2026-08-02 (b) — dónde viaja el VALOR de un control creativo

- Status del delta: Accepted
- Validated as of: 2026-08-02, contra el runtime de Globe y una lectura de la base de producción
- Governing task: `TASK-1633` Slice 3.5

### Qué faltaba decidir

La decisión original resolvió que cada ruta **declara** qué controles honra y por qué mecanismo. No resolvió
**dónde escribe el usuario el valor** — "dolly in", "luz de atardecer", "ritmo pausado". Al no decidirlo, el eje
quedó a medio camino: `inputSlots` tiene su contraparte tipada en el intent (`inputAssignments`, con cardinalidad,
MIME y orden) y `creativeControls` no tiene ninguna. La lectura ingenua —agregar un campo de valores al intent—
habría creado un tercer canal hacia el prompt, conviviendo con dos que ya existen y se solapan en `style`↔`style`,
`lighting`↔`light` y `composition`↔`framing`.

### El precedente que ya estaba tomado, y que decide

Globe **ya resolvió** que hay un solo canal de dirección semántica por pedido, y ya tiene la guardia que lo
sostiene: `producer-client.ts:1191` rechaza con `producer_prompt_contract_invalid` cualquier pedido que traiga
`prompt` y `structuredBrief` a la vez. La UI vive de esa regla hoy: `ProducerComposer.tsx:752-758` manda
`structuredBrief` cuando hay preset de estilo o negativos —envolviendo el prompt como ingrediente `subject` con
peso 1 y el preset como `style` con peso 0,82— y `prompt` plano cuando no.

Un campo de valores dentro de `RouteCreativeIntentV1` **eludiría esa guardia por el costado**: el pedido pasaría a
ser `(prompt XOR structuredBrief) + controls`, siempre, y nada impediría `prompt: "atardecer cálido"` junto a
`controls.lighting: "high key"`. No habría error que observar — habría dos direcciones compilando al mismo prompt
y una ganando por precedencia. Es la misma familia del spread de lineage corregido en `b062d6f`: el orden
expresando una regla que nadie declaró.

### Decisión

1. **`creativeControls` declara soporte, nunca transporta valores.** Es el descriptor por ruta: qué controles
   honra, por qué mecanismo y —nuevo— con qué forma de valor admisible (`valueShape`: enum cerrado, texto libre
   acotado o numérico con rango). Sin `valueShape` el fail-closed pre-spend no alcanza a este eje.
2. **El valor de dirección semántica viaja por el canal existente `prompt XOR structuredBrief`.** Los controles
   creativos que hoy no tiene el brief —`camera`, `lens`, `motion`, `timing`, `audio-direction`,
   `negative-prompt`— se incorporan como **ingredientes nuevos** de `StructuredBriefV1`. Es aditivo, hereda la
   exclusión mutua sin código nuevo y hereda el peso por ingrediente, que un control creativo necesita y el
   descriptor de soporte no tiene.
3. **`duration`, `aspect-ratio` y `resolution` salen de `ROUTE_CREATIVE_CONTROLS`.** Son forma de salida, no
   dirección creativa: su dueño es `RouteConstraintsV1` + `OutputShapeV1`, que ya los valida fail-closed contra la
   ruta y ya los transporta al proveedor. Declararlos también como controles era duplicación de SSOT dentro del
   mismo contrato.
4. **El compiler valida el valor contra el descriptor.** Un ingrediente cuyo control declara `unsupported` en esa
   ruta se rechaza o se degrada explícitamente antes del estimate, con razón nombrada del lado del servidor y
   clasificación `terminal` en la política de fallos: un desajuste de contrato es determinista y no se arregla
   reintentando.

### Evidencia que sostuvo la decisión

Se verificó contra la base de producción de Globe, en lectura pura, porque la hipótesis inicial era la contraria
—que el brief tenía recetas guardadas cuyo costo de migración decidía el asunto—:

| Consulta | Resultado |
|---|---|
| `creative_recipe_versions` | **0** versiones, 0 recetas, 0 workspaces |
| `prompt_history` | **144** entradas, 2 workspaces, última el 2026-08-02 |
| `prompt_enhancement_proposals` | 2, última el 2026-07-26 |

**La hipótesis era falsa y la decisión no depende de ella.** No hay recetas que migrar; el argumento correcto no
es el costo del legado sino que la regla de exclusión mutua **ya existe, ya corre en producción y un tercer canal
la desarma**. El cero de recetas tiene su propia explicación —la capability de guardar/reutilizar nació el
2026-07-22 y nunca tuvo superficie en la UI— y es materia de `TASK-1552`, no de este ADR: es una capacidad
construida que nadie puede alcanzar, no una rechazada por sus usuarios.

### Alternativa rechazada

**Los controles como buzón de valores, con `StructuredBriefV1` degradado a atajo que compila hacia ellos.** Un
solo canal nuevo, más limpio sobre el papel. Rechazado por tres razones, en orden: invierte una regla ya vigente
en producción en vez de extenderla; obliga a migrar o leer en doble el store de recetas versionadas e inmutables
de `TASK-1493` en cuanto tenga su primer dato; y pierde el peso por ingrediente, que habría que reinventar dentro
del descriptor de soporte. El cero de recetas hace hoy barata la segunda razón, no las otras dos.

### Consecuencias del delta

`RouteCreativeIntentV1` **no gana un campo de controles**: conserva `{schemaVersion, routeRevision, operation,
combinationId, inputAssignments}`. Lo que gana el sistema es `valueShape` en el descriptor, ingredientes nuevos en
el brief y validación del valor contra el descriptor en el compiler. El fingerprint canónico cubre el eje sin
cambio estructural: el brief ya viaja dentro del quote que se firma. La UI de `TASK-1552` deriva del descriptor
qué controles ofrecer y en qué forma, y los escribe donde ya escribe hoy.
