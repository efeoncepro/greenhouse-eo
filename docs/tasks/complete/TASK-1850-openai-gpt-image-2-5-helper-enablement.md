# TASK-1850 — Habilitar la familia GPT Image 2.5 en el helper canónico OpenAI y medir su costo real

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Status real: `Supersedida por TASK-1851 — cerrada sin ejecutar`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: —
- GitHub Issue: —

## Delta 2026-09-08 — SUPERSEDIDA por TASK-1851

**Cerrada sin ejecutar, por instrucción del operador.** No hubo cambio de código, canary ni gasto. El
scope está absorbido por [`TASK-1851`](../to-do/TASK-1851-openai-image-provider-contract-consolidation.md),
que toma el contrato de proveedores de imagen entero en vez de sólo la mitad OpenAI.

Razón de la consolidación: al inventariar el dominio apareció un segundo defecto de la misma forma —el
default de `generateImage()` apunta a `imagen-4.0-generate-001`, declarado bloqueado por la
arquitectura— y partirlos habría dejado el mismo archivo compartido con dos dueños y el mismo invariante
("ningún identificador desconocido degrada en silencio") declarado en dos lugares.

Nada se perdió: los criterios de aceptación, la risk matrix y la medición de `usage` viven verbatim en
TASK-1851, Slices 1, 2, 4 y 5.

**Por qué los criterios de abajo siguen sin tildar:** porque no se ejecutaron. Tildarlos sería inventar
evidencia. Los únicos ítems tildados son los del cierre documental, que sí ocurrió.

## Summary

`src/lib/ai/openai-image.ts` no reconoce `gpt-image-2.5-sunburst` ni `gpt-image-2.5-flare`, y en vez de
rechazarlos los degrada en silencio por dos caminos distintos. Esta task extiende el contrato del helper y del
CLI para transportar la familia 2.5 con falla ruidosa, y produce la única evidencia que OpenAI no publica: la
tabla de consumo real de tokens por `quality × size`, medida con `usage` de respuestas reales.

## Why This Task Exists

El 2026-09-08 OpenAI publicó la familia 2.5 y la documentación de Greenhouse quedó al día, pero el código no.
El resultado no es "la capacidad no está disponible" —eso sería aceptable— sino **dos degradaciones silenciosas
que producen trabajo que parece correcto y no lo es**:

1. **Por env var.** `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare` no pasa el allowlist de `getOpenAIImageModel()`
   ([openai-image.ts:193](../../../src/lib/ai/openai-image.ts)), que devuelve el default `gpt-image-2` sin
   advertir. El operador cree generar con 2.5 y paga GPT Image 2.
2. **Por flag CLI.** `pnpm ai:image --model gpt-image-2.5-flare` castea el valor sin validarlo
   ([generate-image.ts:166](../../../scripts/ai/generate-image.ts)), así que el modelo **sí** viaja al API;
   pero `resolveOpenAIImageSize()` ramifica por `model === 'gpt-image-2'` y manda todo lo demás a la rama
   legacy — el default por aspect ratio cae de `2048x1152` a `1536x1024` y un `--size` moderno se resuelve a
   `auto`. Además `editOpenAIImage()` inyecta `input_fidelity` para todo modelo `!== 'gpt-image-2'`, parámetro
   que la guía de OpenAI excluye explícitamente de Sunburst y Flare.

Hay además un bloqueador que no es de este repo pero que sólo esta task puede levantar: OpenAI declara verbatim
que *"The GPT Image 2 calculator does not estimate GPT Image 2.5 token consumption"* y que tarifas por token
iguales no implican costo por imagen igual. Globe reserva créditos **antes** del gasto, así que sin una medición
propia de `usage` ninguna ruta 2.5 puede promoverse allá. La medición es un entregable, no un efecto colateral.

## Goal

- El helper acepta `gpt-image-2.5-sunburst` y `gpt-image-2.5-flare` con su contrato correcto: `xhigh`/`max`,
  tamaños modernos, y sin `input_fidelity`.
- Un modelo desconocido **falla ruidoso** en vez de degradar en silencio, por env var y por flag CLI.
- Existe en el repo una tabla de consumo real de tokens por `quality × size` para ambos modelos 2.5, medida
  con `usage` de respuestas reales y fechada.
- La matriz de capacidades y el ledger de flota Globe dejan de declarar el gap y pasan a declarar el
  contrato transportado + la evidencia de costo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — contrato del generador visual
- `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md` — contrato de proveedor
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — primitive canónico, un motor muchos consumers

Reglas obligatorias:

- El cliente OpenAI canónico es `src/lib/ai/openai-image.ts`. NUNCA crear un cliente paralelo dentro de un
  módulo de dominio ni un script de generación ad-hoc.
- El secreto se resuelve server-side vía `OPENAI_API_KEY_SECRET_REF`. NUNCA hardcodear `sk-*` ni imprimirlo.
- **NUNCA enviar `input_fidelity` con un modelo 2.5.** La guía de OpenAI lo ubica bajo "Earlier GPT Image
  models" con la frase explícita *"not Sunburst or Flare"*, aunque siga en el enum del schema.
- `xhigh` y `max` existen **sólo** en la familia 2.5. Enviarlos a `gpt-image-2` o anterior debe fallar antes de
  la red, no en el proveedor.
- **NUNCA convertir un precio por token en un costo por imagen estimado para 2.5.** La única fuente es `usage`.
- El costo por imagen medido es **evidencia fechada**, no un contrato: se relee antes de presupuestar.

## Normative Docs

- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md` — facts operativos del dominio
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` — ledger de flota; consumidor de la evidencia
- `.claude/skills/greenhouse-ai-image-generator/SKILL.md` — dirección de arte y reglas duras de 2.5

## Dependencies & Impact

### Depends on

- Autorización humana explícita de gasto para el canary facturable del Slice 3. Sin ella, los Slices 1, 2 y 4
  avanzan y la task queda `code complete, evidencia de costo pendiente`.
- `OPENAI_API_KEY_SECRET_REF` resuelto en el entorno donde corra el canary.

### Blocks / Impacts

- `TASK-1553` (in-progress) — dueña del catálogo Globe, `ref/still/openai-v2`, `openai-adapter.ts` y el
  allowlist del endpoint. **Esta task NO crea rutas Globe.** Le entrega la evidencia de `usage` que hoy le
  impide reservar créditos para cualquier ruta 2.5. La decisión de abrir `ref/still/openai-2-5-*` es suya.
- `src/lib/account-360/organization-logo-generation.ts` — command productivo pagado que hoy fija
  `model: 'gpt-image-2'`. Debe seguir fijándolo: esta task **no** lo migra.
- `src/lib/ai/image-generator.ts` — helper runtime que comparte el cliente.

### Files owned

- `src/lib/ai/openai-image.ts`
- `src/lib/ai/openai-image.test.ts`
- `scripts/ai/generate-image.ts`
- `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`
- `.claude/skills/greenhouse-ai-image-generator/SKILL.md` + espejo `.codex/`
- `ai-generations/<fecha>_gpt-image-2-5-usage-baseline/` (evidencia del canary) `[verificar]` — el directorio
  `ai-generations/` ya existe como convención; el subdirectorio lo crea esta task

## Current Repo State

### Already exists

- `src/lib/ai/openai-image.ts` — cliente canónico con `generateOpenAIImage`, `editOpenAIImage`,
  `runOpenAIImageTool`, resolución de secreto, contrato singular `n=1`, rechazo de `transparent + jpeg`.
- `src/lib/ai/openai-image.test.ts` — suite focal que ya cubre allowlist, resolución de tamaño y body exacto.
- `scripts/ai/generate-image.ts` — CLI `pnpm ai:image` con `--model`, `--quality`, `--size`, `--image`, batch.
- Documentación completa de la familia 2.5 al 2026-09-08 en la matriz de capacidades.

### Gap

- `OpenAIImageModel` no incluye la familia 2.5; `OPENAI_IMAGE_MODELS` tampoco.
- `OpenAIImageQuality` es `auto | low | medium | high`: faltan `xhigh` y `max`, y falta el gate por modelo.
- `resolveOpenAIImageSize` usa `model === 'gpt-image-2'` como proxy de "modelo moderno" — un literal que ya no
  describe la familia. 2.5 cae en la rama legacy.
- `editOpenAIImage` inyecta `input_fidelity` con la condición `model !== 'gpt-image-2'`, que ahora es incorrecta.
- El CLI castea `--model` y `--quality` sin validar: acepta cualquier string.
- No existe medición de `usage` por `quality × size` para 2.5 en el repo.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/ai/openai-image.ts` (server-only, compartido por runtime Vercel, CLI y commands de dominio)
- Future candidate home: `remain-shared`
- Boundary: el cliente canónico OpenAI Images es el primitive; sus consumers autorizados son
  `src/lib/ai/image-generator.ts`, `scripts/ai/generate-image.ts` y
  `src/lib/account-360/organization-logo-generation.ts`. Ningún módulo de dominio instancia un cliente propio.
- Server/browser split: server-only estricto — el archivo declara `import 'server-only'` y resuelve el secreto
  por Secret Manager. Nada de esto cruza al browser.
- Build impact: `none` — sin dependencias nuevas; sólo se amplían tipos y ramas de resolución.
- Extraction blocker: resolución de secreto vía Secret Manager server-side y `server-only`; extraerlo exigiría
  mover también el contrato de secretos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `src/lib/ai/openai-image.ts` — contrato del cliente OpenAI Images
- Consumidores afectados: CLI `pnpm ai:image`, `generateImage()` runtime, command de logo de organización
- Runtime target: `local` (CLI + tests) y `production` (el helper compartido lo consume un command pagado)

### Contract surface

- Contrato existente a respetar: tipos exportados `OpenAIImageModel`, `OpenAIImageQuality`, `OpenAIImageSize`,
  y las funciones `getOpenAIImageModel`, `isOpenAIImageModel`, `resolveOpenAIImageSize`,
  `resolveOpenAIImageRequestModel`, `generateOpenAIImage`, `editOpenAIImage`
- Contrato nuevo o modificado: unión de modelos ampliada, unión de calidad ampliada con gate por familia,
  resolución de tamaño por capacidad del modelo en vez de por literal, supresión de `input_fidelity` en 2.5
- Backward compatibility: `compatible` — todo llamador que hoy pasa `gpt-image-2` y `low|medium|high|auto`
  conserva exactamente su comportamiento actual, incluidos los tamaños 2048 y la ausencia de `input_fidelity`
- Full API parity: `N/A — no capability`. No introduce una acción de negocio nueva: extiende un primitive
  server-side de toolchain ya existente. Los consumers siguen siendo los mismos y ninguno gana superficie.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna. Sin persistencia; la evidencia del canary vive en archivos.
- Invariantes que no se pueden romper:
  - Un identificador de modelo desconocido **falla ruidoso**; nunca se sustituye en silencio por el default.
  - `xhigh`/`max` sólo se envían a la familia 2.5; a un modelo anterior fallan antes de la red.
  - `input_fidelity` nunca viaja con un modelo 2.5.
  - Un llamador que pide `gpt-image-2` obtiene byte por byte el mismo request que antes de esta task.
  - `numberOfImages != 1` sigue rechazado (contrato singular) y `transparent + jpeg` sigue fallando pre-red.
- Write-target allowlist: `N/A` — la task no escribe a ninguna tabla.
- Tenant/space boundary: `N/A` — el helper no deriva tenant; el gate de acceso vive en cada consumer.
- Idempotency/concurrency: cada request al proveedor es un gasto no idempotente. Un `429`/`5xx` **no se
  reintenta automáticamente**; un `image_generation_user_error` o `moderation_blocked` nunca se reintenta sin
  cambiar el prompt.
- Audit/outbox/history: `none with rationale` — es toolchain out-of-band; la evidencia del canary queda como
  archivo versionado en `ai-generations/`, no como evento.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — ampliar el allowlist es aditivo y no cambia ningún default. El
  default del helper sigue siendo `gpt-image-2`; nadie usa 2.5 hasta pedirlo explícitamente. Un flag agregaría
  una superficie de configuración sin reducir riesgo.
- Backfill plan: `N/A`
- Rollback path: `revert PR` — sin estado que deshacer.
- External coordination: autorización humana de gasto para el canary del Slice 3.

### Security and access

- Auth/access gate: el helper no expone superficie propia; hereda el gate de cada consumer. El secreto se
  resuelve por `resolveSecret({ envVarName: 'OPENAI_API_KEY' })`.
- Sensitive data posture: `no sensitive data` en el contrato. El prompt del canary NO debe contener PII,
  nombres de clientes ni material de marca de terceros.
- Error contract: los errores del proveedor no cruzan crudos a un consumer UI. El discriminador estable es
  `error.code`, no el mensaje.
- Abuse/rate-limit posture: OpenAI **no publica rate limits para la familia 2.5**. El canary corre en serie con
  volumen acotado y declarado; no se asumen los límites de `gpt-image-2`.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/ai/openai-image.test.ts`, `pnpm lint`, `pnpm typecheck`
- DB/runtime checks: `N/A — sin persistencia`
- Integration checks: canary facturable del Slice 3 contra el API real, con readback de `usage` por respuesta
- Reliability signals/logs: `no signal — emerge en la salida del CLI y en el archivo de evidencia`
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers quedan nombrados con paths reales.
- [ ] Invariantes, frontera de acceso e idempotencia quedan explícitos en el código o en tests.
- [ ] `N/A` — la task no crea tablas, así que no aplica allowlist de destinos de escritura.
- [ ] Postura de migración/rollback explícita y proporcional: `none` / `revert PR`, declarado con razón.
- [ ] La evidencia de runtime del canary queda listada con fecha y modelo exacto.
- [ ] No hay fuga de datos crudos ni de secreto en logs, tests ni archivos de evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato del helper reconoce la familia 2.5

- `OpenAIImageModel` y `OPENAI_IMAGE_MODELS` incluyen `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare` y sus
  snapshots `-2026-09-08`.
- `OpenAIImageQuality` incorpora `xhigh` y `max`, con validación pre-red que las rechaza para modelos
  anteriores a 2.5.
- La rama de resolución de tamaño deja de preguntar `model === 'gpt-image-2'` y pasa a preguntar por una
  capacidad declarada del modelo (p.ej. un mapa `MODEL_CAPABILITIES`), de modo que agregar un modelo futuro no
  vuelva a degradar en silencio por olvidar un literal.
- `editOpenAIImage` deja de inyectar `input_fidelity` cuando el modelo pertenece a la familia 2.5.
- Tests que fijan cada invariante, incluido un caso que prueba que `gpt-image-2` produce el mismo request que
  antes de esta task.

### Slice 2 — Falla ruidosa en las dos puertas de entrada

- `getOpenAIImageModel()` deja de degradar en silencio: un `OPENAI_IMAGE_MODEL` desconocido lanza con el valor
  recibido y la lista de válidos, en vez de devolver el default.
- El CLI valida `--model` y `--quality` contra las uniones antes de cualquier I/O y aborta con mensaje
  accionable en vez de castear.
- El texto de ayuda del CLI enumera la familia 2.5 y sus escalones de calidad.
- Tests de ambas puertas.

### Slice 3 — Canary facturable y medición de `usage` (requiere autorización de gasto)

- Corrida acotada y declarada contra el API real, en serie, con un prompt sin PII ni marcas de terceros.
- Matriz mínima: `flare` y `sunburst` × `{low, medium, high, xhigh, max}` × `{1024x1024, 1536x1024}`, más un
  caso `background: transparent` con verificación de canal alfa y píxel no opaco desde bytes decodificados.
- Cada respuesta persiste `usage` completo (`input_tokens_details`, `output_tokens_details`, `total_tokens`)
  y el `quality`/`size`/`background` resueltos que devuelve el API, no los pedidos.
- Salida: `ai-generations/<fecha>_gpt-image-2-5-usage-baseline/` con `README.md` (prompts verbatim),
  `manifest.json` (una fila por corrida con modelo, snapshot, parámetros, `usage` y costo derivado de las
  tarifas vigentes) y fila en `ai-generations/INDEX.md`.
- El costo derivado se declara **como evidencia fechada, no como contrato**.

### Slice 4 — Cerrar el lazo documental y entregar la evidencia a Globe

- La matriz de capacidades reemplaza la sección "las dos trampas silenciosas" por el contrato transportado, y
  publica la tabla de consumo medido con su fecha y su advertencia de volatilidad.
- `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` y el doc operativo dejan de declarar el gap.
- La skill `greenhouse-ai-image-generator` (y su espejo `.codex/`) actualiza las reglas duras y el uso del CLI.
- `GLOBE_MODEL_FLEET_STATUS.md` y la skill `greenhouse-globe-model-fleet` registran que el bloqueador de
  reserva de créditos tiene ahora una fuente medida, y nombran a `TASK-1553` como dueña de la decisión de ruta.
- `pnpm skills:mirrors` verde.

## Out of Scope

- **Crear una ruta Globe `ref/still/openai-2-5-*`**, su binding, adapter, readiness, canary o promoción. Eso es
  de `TASK-1553`. Esta task le entrega evidencia, no le invade la superficie.
- Migrar `organization-logo-generation.ts` a 2.5. Sigue fijando `gpt-image-2`.
- Cambiar el modelo por defecto del helper o del CLI.
- Implementar streaming (`partial_images`) o Batch. Batch no existe para 2.5 y streaming exige contrato de
  eventos propio.
- Cualquier UI, superficie visible o cambio de copy de producto.
- Retirar `gpt-image-2` de ningún consumer.

## Detailed Spec

El contrato exacto del proveedor —parámetros, enums, reglas de tamaño, precios, límites, contradicciones
documentales y fuentes— vive en
`docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`. No se duplica aquí.

El agente que tome la task lo relee antes de implementar: la matriz declara que la doc de OpenAI se contradice
en varios puntos (streaming, `partial_images` 0..3 vs 1..3, `usage` anotado como "gpt-image-1 only",
`input_fidelity` en el enum pero excluido en la prosa) y cuál lectura adoptó Greenhouse en cada caso.

Nota de método que ahorra tiempo: toda página de `developers.openai.com` sirve Markdown crudo agregando `.md`
a la URL. Leer el `.md` en vez de dejar que un resumidor procese el HTML — en la revalidación del 2026-09-08 el
resumidor omitió la tabla de costos y negó falsamente la existencia de `input_fidelity`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato) → Slice 2 (falla ruidosa) → Slice 3 (canary) → Slice 4 (documentación).
- **Slice 1 DEBE cerrar antes que Slice 3.** Correr el canary sobre el contrato viejo mide la rama legacy y
  produce una tabla de consumo que describe un request que nadie va a hacer: evidencia falsa que parece buena.
- **Slice 2 DEBE cerrar antes que Slice 3.** Sin falla ruidosa, un typo en el `--model` del canary genera
  contra el modelo equivocado y la evidencia queda mal atribuida sin que nadie lo note.
- Slice 4 sólo puede publicar la tabla de consumo después de que Slice 3 la produzca. Sí puede adelantar la
  parte del contrato transportado apenas cierre Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ampliar la unión de modelos cambia el request de `gpt-image-2` y afecta el command pagado de logo de organización | integration | low | Test que fija el body exacto de `gpt-image-2` antes y después; el command sigue pinneando su modelo | no signal — emerge en la suite focal |
| Hacer ruidoso `getOpenAIImageModel()` rompe un entorno que hoy tiene `OPENAI_IMAGE_MODEL` con un valor inválido y vive del fallback | integration | medium | Barrer los env de Vercel y de los runtimes Cloud Run antes de mergear Slice 2; si alguno tiene un valor inválido, corregirlo primero | fallo de arranque del consumer al primer uso |
| El canary gasta más de lo previsto porque `max`/`xhigh` consumen mucho más de lo esperado y no hay forma de estimarlo | N/A (costo) | medium | Corrida en serie, tope de piezas declarado antes de empezar, empezar por `low` y subir escalón por escalón leyendo `usage` de cada respuesta antes de la siguiente | el propio `usage` de la respuesta anterior |
| El canary choca contra un rate limit no publicado para 2.5 | integration | medium | Serie, no paralelo; ante `429` detener y registrar, nunca reintentar en bucle | `429` del proveedor |
| Se publica el costo medido como si fuera tarifa estable y alguien lo mete en una propuesta | finance | medium | La tabla se publica con fecha, modelo, snapshot y advertencia explícita de que es evidencia, no contrato | revisión humana del doc |
| El prompt del canary filtra PII o marca de terceros a un proveedor externo | N/A (datos) | low | Prompt neutro declarado en el `README.md` de la evidencia y revisado antes de correr | revisión humana previa |

### Feature flags / cutover

Sin flag — aditivo, cutover inmediato. Ampliar el allowlist no cambia ningún default: el default del helper
sigue siendo `gpt-image-2` y nadie usa 2.5 hasta pedirlo explícitamente por `--model` o por env var. Un flag
agregaría una superficie de configuración que hay que recordar prender, sin reducir el riesgo real.

La única excepción con cutover observable es el Slice 2: pasar de degradación silenciosa a error es, para un
entorno mal configurado, un cambio de comportamiento. Por eso su mitigación es barrer los env **antes** de
mergear, no después.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert` del PR; sin estado que deshacer | < 5 min | sí |
| Slice 2 | `revert` del PR. Si un entorno queda bloqueado por un `OPENAI_IMAGE_MODEL` inválido, la salida inmediata es corregir la env var, no revertir | < 5 min | sí |
| Slice 3 | No hay rollback de un gasto. El control es preventivo: tope de piezas declarado y corrida en serie leyendo `usage` antes de cada escalón | — | no |
| Slice 4 | `revert` del PR de docs | < 5 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/ai/openai-image.test.ts` verde, incluido el caso de no-regresión de `gpt-image-2`.
2. `pnpm lint` y `pnpm typecheck` verdes.
3. Barrido de `OPENAI_IMAGE_MODEL` en Vercel y en los runtimes Cloud Run: ningún entorno con valor inválido.
4. Con autorización de gasto: canary de una sola pieza `flare · low · 1024x1024` y readback de `usage`.
   Verificar que el `model` del request es el pedido y que el `size` resuelto es el moderno, no el legacy.
5. Recién entonces, el resto de la matriz del Slice 3, en serie, escalón por escalón.
6. Un caso `background: transparent` con verificación de alfa desde bytes decodificados.
7. `pnpm build` y `pnpm test` completos como gate de cierre.

### Out-of-band coordination required

- **Autorización humana explícita de gasto** antes del Slice 3, con el tope de piezas acordado. Sin ella, los
  Slices 1, 2 y 4 avanzan y la task cierra como `code complete, evidencia de costo pendiente`.
- Revisión del barrido de `OPENAI_IMAGE_MODEL` en Vercel y Cloud Run antes de mergear el Slice 2.
- Aviso a la dueña de `TASK-1553` cuando la evidencia de `usage` exista, porque levanta su bloqueador de
  reserva de créditos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

> **Transferidos a `TASK-1851`. Ninguno se ejecutó acá.** Su versión viva y verificable está en esa task.


- [ ] `isOpenAIImageModel('gpt-image-2.5-flare')` y `isOpenAIImageModel('gpt-image-2.5-sunburst')` devuelven `true`.
- [ ] `getOpenAIImageModel({ OPENAI_IMAGE_MODEL: 'modelo-inexistente' })` **lanza** en vez de devolver `gpt-image-2`.
- [ ] `pnpm ai:image --model modelo-inexistente` aborta antes de cualquier I/O con mensaje que nombra el valor recibido y los válidos.
- [ ] `pnpm ai:image --quality max --model gpt-image-2` aborta antes de la red, porque `max` no existe en ese modelo.
- [ ] `resolveOpenAIImageSize({ model: 'gpt-image-2.5-flare', aspectRatio: '16:9' })` devuelve `2048x1152`, no `1536x1024`.
- [ ] Un `editOpenAIImage` con un modelo 2.5 produce un `FormData` que **no** contiene la clave `input_fidelity`.
- [ ] Un test fija que el body de un request `gpt-image-2` es idéntico al de antes de esta task.
- [ ] Existe `ai-generations/<fecha>_gpt-image-2-5-usage-baseline/manifest.json` con al menos una fila por combinación de la matriz declarada en el Slice 3, cada una con `usage` completo y el `quality`/`size` resueltos por el API.
- [ ] La tabla de consumo publicada en la matriz de capacidades lleva fecha, snapshot de modelo y la advertencia de que es evidencia, no contrato.
- [ ] La matriz de capacidades ya no describe las dos degradaciones silenciosas como estado vigente.
- [ ] `GLOBE_MODEL_FLEET_STATUS.md` registra que el bloqueador de reserva de créditos tiene fuente medida y que `TASK-1553` es dueña de la decisión de ruta.
- [ ] `pnpm skills:mirrors` verde con las skills actualizadas.
- [ ] Ningún archivo de evidencia, test o log contiene el valor del secreto ni PII.

## Verification

- `pnpm vitest run src/lib/ai/openai-image.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm skills:mirrors`
- `pnpm docs:context-check:strict`
- Canary facturable con readback de `usage`, sólo con autorización de gasto

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real — `complete` por supersesión, no por ejecución
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado
- [x] `changelog.md` quedo actualizado
- [x] se ejecuto chequeo de impacto cruzado: `TASK-1782` posee la ceguera del auditor de flags, `TASK-278` está stale con sus entregables ya en el repo, `TASK-1553` conserva el carril Globe
- [ ] `TASK-1553` recibió un `## Delta` — **transferido a TASK-1851**; no aplica acá porque no se produjo evidencia

## Follow-ups

- Decidir en `TASK-1553` si se abre una ruta Globe para 2.5 y con qué política de reserva de créditos, ahora
  que existe una medición en vez de una estimación imposible.
- Evaluar si el command de logo de organización se beneficia de `flare` (menor latencia con el timeout de
  popup que hoy lo obliga a `medium`), como task propia y con su propio canary.
- Streaming (`partial_images`) sigue sin contrato de eventos en Greenhouse; si alguna vez se necesita, es task
  aparte con su propio lifecycle y costo (+100 tokens de output por parcial).

## Open Questions

- ¿Cuál es el tope de gasto autorizado para el canary del Slice 3? La matriz mínima son 20 piezas más el caso
  transparente; sin poder estimar el costo por imagen, el tope debe fijarlo el operador en piezas, no en USD.
- ¿El barrido de `OPENAI_IMAGE_MODEL` debe cubrir también entornos Preview de Vercel, o basta Production,
  staging y los cinco Cloud Run?
