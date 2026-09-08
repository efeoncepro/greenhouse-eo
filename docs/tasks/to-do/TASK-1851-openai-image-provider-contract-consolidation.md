# TASK-1851 — Contrato de proveedores de imagen: habilitar GPT Image 2.5, resolver el default bloqueado y medir el costo real

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `TASK-1850`
- GitHub Issue: `none`

## Summary

`src/lib/ai/` tiene hoy dos defectos del mismo tipo en su contrato de proveedores de imagen: el cliente
OpenAI no reconoce la familia GPT Image 2.5 y la degrada en silencio por dos caminos distintos, y el
default del helper runtime apunta a un modelo Imagen que la propia arquitectura declara bloqueado.
Ninguno falla ruidoso. Esta task toma el contrato completo: habilita 2.5, resuelve el carril
`google-imagen`, hace que todo identificador desconocido falle fuerte, y produce la evidencia de
consumo real que OpenAI no publica.

Supersede a `TASK-1850`, que cubría sólo la mitad OpenAI.

## Why This Task Exists

Al inventariar el dominio aparecieron tres hechos que comparten una misma forma: **el sistema elige un
motor distinto al que el operador cree, y no avisa.**

**1. La familia 2.5 no está transportada, y no falla — degrada.**
`OPENAI_IMAGE_MODEL=gpt-image-2.5-flare` no pasa el allowlist de `getOpenAIImageModel()`
([openai-image.ts:193](../../../src/lib/ai/openai-image.ts)) y devuelve el default `gpt-image-2` sin
advertir: se cree usar 2.5 y se paga GPT Image 2. Por el otro lado,
`pnpm ai:image --model gpt-image-2.5-flare` castea el valor sin validar
([generate-image.ts:166](../../../scripts/ai/generate-image.ts)), así que el modelo **sí** viaja, pero
`resolveOpenAIImageSize()` ramifica por el literal `model === 'gpt-image-2'` y manda todo lo demás a la
rama legacy — el default por aspect ratio cae de `2048x1152` a `1536x1024` y un `--size` moderno se
resuelve a `auto`. Encima `editOpenAIImage()` inyecta `input_fidelity` para todo modelo
`!== 'gpt-image-2'`, parámetro que la guía de OpenAI excluye explícitamente de Sunburst y Flare.

**2. El default del helper runtime apunta a un modelo declarado bloqueado.**
[image-generator.ts:67-68](../../../src/lib/ai/image-generator.ts) fija
`DEFAULT_IMAGE_PROVIDER = 'google-imagen'` con `IMAGEN_MODEL = 'imagen-4.0-generate-001'`, mientras
`GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` lista ese modelo como *"deprecated/bloqueado para trabajo
nuevo"* con la instrucción *"Migrar a provider Gemini Image `generateContent`; no sustituir sólo el ID"*.
Quien llame `generateImage()` sin `provider` explícito cae ahí.

**3. Hay un bloqueador de costo que sólo esta task puede levantar.**
OpenAI declara verbatim que *"The GPT Image 2 calculator does not estimate GPT Image 2.5 token
consumption"* y que tarifas por token iguales no implican costo por imagen igual. Globe reserva
créditos **antes** del gasto, así que sin una medición propia de `usage` ninguna ruta 2.5 puede
promoverse allá. La medición es un entregable, no un efecto colateral.

Los dos primeros no los reportó nadie: nadie los estaba sufriendo, y por eso mismo iban a seguir ahí.
El radio de impacto del segundo es chico y hay que decirlo — el único consumidor de `generateImage()`
es [/api/internal/generate-image](../../../src/app/api/internal/generate-image/route.ts), admin y con
403 en producción salvo `ENABLE_ASSET_GENERATOR=true`. Lo que duele no es el daño actual: es que el
default de un primitive compartido apunte a un carril que la arquitectura cerró.

## Goal

- El helper acepta `gpt-image-2.5-sunburst` y `gpt-image-2.5-flare` con su contrato correcto:
  `xhigh`/`max`, tamaños modernos, y sin `input_fidelity`.
- Un identificador de modelo o calidad desconocido **falla ruidoso** en las tres puertas de entrada
  (env var, flag CLI, default del helper). Ninguna degrada en silencio.
- El carril `google-imagen` queda resuelto: migrado a Gemini Image `generateContent`, o retirado con
  razón escrita. No queda en limbo.
- Existe en el repo una tabla de consumo real de tokens por `quality × size` para ambos modelos 2.5,
  medida con `usage` de respuestas reales y fechada.
- `ENABLE_ASSET_GENERATOR` tiene fila en el ledger de flags con su estado real por entorno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md` — contrato de proveedor
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — canales de generación e invariantes
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers

Reglas obligatorias:

- Los clientes canónicos son `src/lib/ai/openai-image.ts` (OpenAI) y `src/lib/ai/google-genai.ts`
  (Gemini/Vertex). NUNCA instanciar un SDK propio dentro de un módulo de dominio.
- El secreto se resuelve server-side. NUNCA hardcodear `sk-*` ni imprimirlo.
- **NUNCA enviar `input_fidelity` con un modelo 2.5.** La guía lo ubica bajo "Earlier GPT Image models"
  con la frase explícita *"not Sunburst or Flare"*, aunque siga en el enum del schema.
- `xhigh` y `max` existen **sólo** en 2.5. Enviarlos a un modelo anterior debe fallar antes de la red.
- **NUNCA convertir un precio por token en un costo por imagen estimado para 2.5.** Sólo `usage`.
- **NUNCA "arreglar" el carril Imagen sustituyendo sólo el ID del modelo.** La arquitectura declara que
  la migración es de **provider** (`generateImages` → Gemini Image `generateContent`), no de string.
- El costo por imagen medido es **evidencia fechada**, no un contrato: se relee antes de presupuestar.

## Normative Docs

- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md` — facts operativos del dominio
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — SSOT humano del estado de flags
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` — ledger de flota; consumidor de la evidencia
- `.claude/skills/greenhouse-ai-image-generator/SKILL.md` — reglas duras de 2.5 y dirección de arte

## Dependencies & Impact

### Depends on

- Autorización humana explícita de gasto para el canary facturable del Slice 4, y para el probe del
  Slice 3 si resulta facturable contra Vertex. Sin ellas, el resto avanza y la task cierra como
  `code complete, evidencia de costo pendiente`.
- `OPENAI_API_KEY_SECRET_REF` resuelto y acceso a Vertex en el entorno donde corran las mediciones.

### Blocks / Impacts

- `TASK-1850` — **supersedida por esta task.** Cubría sólo la mitad OpenAI del mismo contrato; su
  contenido está absorbido aquí sin pérdida.
- `TASK-1553` (in-progress) — dueña del catálogo Globe, `ref/still/openai-v2`, `openai-adapter.ts` y el
  allowlist del endpoint. **Esta task NO crea rutas Globe.** Le entrega la evidencia de `usage` que hoy
  le impide reservar créditos para cualquier ruta 2.5. La decisión de abrir `ref/still/openai-2-5-*`
  es suya.
- `TASK-1782` (to-do, P1) — posee la ceguera del auditor de flags. `ENABLE_ASSET_GENERATOR` es una
  instancia nueva de su **Eje 2**, con una forma que sus ejemplos no cubren: prefijo `ENABLE_*` en vez
  de sufijo. **Esta task NO toca el detector**: sólo registra la fila del flag que gatea su superficie.
- `TASK-278` (to-do, legacy, P3) — describe la creación original del módulo con **Imagen 3**. Todo lo
  que prometía existe en el repo (`generateImage`, `generateAnimation`, ambas rutas internas) pero
  muestra **0 de 11** criterios tildados. Esta task **no la cierra**: le deja un `## Delta` para que
  alguien reconcilie registro y realidad, porque tildar criterios ajenos sin recorrer su evidencia
  sería inventar avance.
- `src/lib/account-360/organization-logo-generation.ts` — command productivo pagado que fija
  `model: 'gpt-image-2'`. Debe seguir fijándolo: esta task **no** lo migra.

### Files owned

- `src/lib/ai/openai-image.ts`
- `src/lib/ai/openai-image.test.ts`
- `src/lib/ai/image-generator.ts`
- `scripts/ai/generate-image.ts`
- `src/app/api/internal/generate-image/route.ts`
- `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila `ENABLE_ASSET_GENERATOR`)
- `.claude/skills/greenhouse-ai-image-generator/SKILL.md` + espejo `.codex/`
- `ai-generations/<fecha>_gpt-image-2-5-usage-baseline/` `[verificar]` — el directorio `ai-generations/`
  ya existe como convención; el subdirectorio lo crea esta task

## Current Repo State

### Already exists

- `src/lib/ai/openai-image.ts` — `generateOpenAIImage`, `editOpenAIImage`, `runOpenAIImageTool`,
  resolución de secreto, contrato singular `n=1`, rechazo de `transparent + jpeg` antes de red.
- `src/lib/ai/openai-image.test.ts` — cubre allowlist, resolución de tamaño y body exacto.
- `src/lib/ai/image-generator.ts` — `generateImage()` con providers `google-imagen` | `openai-image`,
  y `generateAnimation()` (SVG con keyframes CSS vía Gemini).
- `scripts/ai/generate-image.ts` — CLI `pnpm ai:image` con `--model`, `--quality`, `--size`, `--image`,
  batch y modo concepts. `pnpm ai:image:rmbg` para matting local.
- `/api/internal/generate-image` y `/api/internal/generate-animation` — admin, 403 en producción sin flag.
- Documentación completa de la familia 2.5 al 2026-09-08 en la matriz de capacidades.

### Gap

- `OpenAIImageModel` y `OPENAI_IMAGE_MODELS` no incluyen la familia 2.5.
- `OpenAIImageQuality` es `auto | low | medium | high`: faltan `xhigh` y `max`, y falta el gate por modelo.
- `resolveOpenAIImageSize` usa `model === 'gpt-image-2'` como proxy de "modelo moderno" — un literal que
  ya no describe la familia. 2.5 cae en la rama legacy.
- `editOpenAIImage` inyecta `input_fidelity` con la condición `model !== 'gpt-image-2'`, hoy incorrecta.
- El CLI castea `--model` y `--quality` sin validar: acepta cualquier string.
- `DEFAULT_IMAGE_PROVIDER` apunta a `google-imagen` / `imagen-4.0-generate-001`, declarado bloqueado.
- No hay evidencia en el repo de si el carril `google-imagen` **responde** hoy contra Vertex o falla.
  `[verificar]` — lo resuelve el Slice 3; no se asume ninguna de las dos.
- No existe medición de `usage` por `quality × size` para 2.5.
- `ENABLE_ASSET_GENERATOR` no tiene fila en el ledger de flags.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/ai/` (server-only), consumido por runtime Vercel, CLI y commands de dominio
- Future candidate home: `remain-shared`
- Boundary: `openai-image.ts` es el cliente canónico OpenAI Images; `image-generator.ts` es el helper de
  assets sobre él y sobre Gemini. Consumers autorizados: `scripts/ai/generate-image.ts`,
  `/api/internal/generate-image`, `src/lib/account-360/organization-logo-generation.ts`. Ningún módulo
  de dominio instancia un cliente propio.
- Server/browser split: server-only estricto — ambos archivos declaran `import 'server-only'` y los
  secretos se resuelven por Secret Manager. Nada cruza al browser.
- Build impact: `none` — sin dependencias nuevas; se amplían tipos y ramas de resolución.
- Extraction blocker: resolución de secreto server-side y `server-only`. Además `image-generator.ts`
  importa `@core/theme/axis-semantic` para inyectar paleta en los prompts; verificado 2026-09-08 que el
  ops-worker **no** alcanza ese módulo, así que hoy no viola la regla de `@core/theme` en código
  worker-bundled — pero sería bloqueador si alguna vez se consumiera desde un worker.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `src/lib/ai/openai-image.ts` y `src/lib/ai/image-generator.ts`
- Consumidores afectados: CLI `pnpm ai:image`, `/api/internal/generate-image`, command de logo de organización
- Runtime target: `local` (CLI + tests) y `production` (el helper compartido lo consume un command pagado)

### Contract surface

- Contrato existente a respetar: `OpenAIImageModel`, `OpenAIImageQuality`, `OpenAIImageSize`,
  `ImageGenerationProvider`, `GenerateImageOptions`, `GenerateImageResult`, y las funciones
  `getOpenAIImageModel`, `isOpenAIImageModel`, `resolveOpenAIImageSize`, `resolveOpenAIImageRequestModel`,
  `generateOpenAIImage`, `editOpenAIImage`, `generateImage`, `generateAnimation`
- Contrato nuevo o modificado: unión de modelos ampliada, unión de calidad ampliada con gate por familia,
  resolución de tamaño por capacidad en vez de por literal, supresión de `input_fidelity` en 2.5,
  y el valor de `DEFAULT_IMAGE_PROVIDER`
- Backward compatibility: `gated`. Un llamador que pasa `gpt-image-2` y `low|medium|high|auto` conserva
  exactamente su request actual. Un llamador de `generateImage()` que **omite** `provider` sí cambia de
  motor: es el punto de la task, y por eso el único consumidor real se verifica antes y después.
- Full API parity: `N/A — no capability`. No introduce una acción de negocio nueva: extiende primitives
  server-side de toolchain ya existentes. Los consumers siguen siendo los mismos.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna. Sin persistencia; los assets se escriben a `public/`.
- Invariantes que no se pueden romper:
  - Un identificador de modelo o calidad desconocido **falla ruidoso**; nunca se sustituye en silencio.
  - `xhigh`/`max` sólo se envían a la familia 2.5; a un modelo anterior fallan antes de la red.
  - `input_fidelity` nunca viaja con un modelo 2.5.
  - Un llamador que pide `gpt-image-2` obtiene byte por byte el mismo request que antes de esta task.
  - `numberOfImages != 1` sigue rechazado y `transparent + jpeg` sigue fallando pre-red.
  - `generateAnimation()` (Gemini, SVG) no se toca: es un carril distinto y sano.
  - Ningún default puede apuntar a un modelo declarado bloqueado. Si el reemplazo también lo estuviera,
    la salida correcta es retirar el carril, no rotar el ID.
  - La ruta interna sigue exigiendo admin y sigue apagada en producción por defecto.
- Write-target allowlist: `N/A` — no escribe a ninguna tabla.
- Tenant/space boundary: `requireAdminTenantContext` en la ruta interna; los helpers no derivan tenant.
- Idempotency/concurrency: cada request al proveedor es un gasto no idempotente. Un `429`/`5xx` **no se
  reintenta automáticamente**; un `image_generation_user_error` o `moderation_blocked` nunca se reintenta
  sin cambiar el prompt.
- Audit/outbox/history: `none with rationale` — toolchain out-of-band; la evidencia del canary queda como
  archivo versionado en `ai-generations/`, no como evento.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` para la ampliación del allowlist OpenAI (es aditiva y no cambia
  ningún default: el default del cliente sigue siendo `gpt-image-2`). `flag OFF` para la superficie
  Imagen: `ENABLE_ASSET_GENERATOR` ya la gatea en producción y esta task **no** lo prende.
- Backfill plan: `N/A`
- Rollback path: `revert PR` — sin estado que deshacer.
- External coordination: autorización de gasto para el canary del Slice 4 y para el probe del Slice 3 si
  resulta facturable.

### Security and access

- Auth/access gate: los helpers no exponen superficie propia; heredan el gate de cada consumer. La ruta
  interna exige `requireAdminTenantContext` + flag en producción.
- Sensitive data posture: `no sensitive data`. Los prompts de probe y canary NO deben contener PII,
  nombres de clientes ni material de marca de terceros.
- Error contract: los errores del proveedor no cruzan crudos a un consumer UI. El discriminador estable
  es `error.code`, no el mensaje. Si un carril falla, debe fallar nombrando provider y modelo; **no**
  degradar en silencio a otro provider.
- Abuse/rate-limit posture: OpenAI **no publica rate limits para la familia 2.5**. El canary corre en
  serie con volumen acotado y declarado; no se asumen los límites de `gpt-image-2`.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/ai/openai-image.test.ts`, `pnpm lint`, `pnpm typecheck`
- DB/runtime checks: `N/A — sin persistencia`
- Integration checks: probe del carril `google-imagen` contra Vertex (Slice 3); canary facturable 2.5 con
  readback de `usage` por respuesta (Slice 4); ejercicio local de las dos rutas internas
- Reliability signals/logs: `no signal — emerge en la salida del CLI, la respuesta de la ruta y los logs`
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers quedan nombrados con paths reales.
- [ ] Invariantes, frontera de acceso e idempotencia quedan explícitos en el código o en tests.
- [ ] `N/A` — la task no crea tablas, así que no aplica allowlist de destinos de escritura.
- [ ] Postura de migración/rollback explícita y proporcional: `none` / `revert PR`.
- [ ] La evidencia de runtime del probe y del canary queda listada con fecha, provider y modelo exactos.
- [ ] No hay fuga de datos crudos, credenciales ni PII en logs, tests ni archivos de evidencia.

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

### Slice 1 — El contrato OpenAI reconoce la familia 2.5

- `OpenAIImageModel` y `OPENAI_IMAGE_MODELS` incluyen `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare` y
  sus snapshots `-2026-09-08`.
- `OpenAIImageQuality` incorpora `xhigh` y `max`, con validación pre-red que las rechaza para modelos
  anteriores a 2.5.
- La rama de resolución de tamaño deja de preguntar `model === 'gpt-image-2'` y pasa a preguntar por una
  capacidad declarada del modelo (p.ej. un mapa `MODEL_CAPABILITIES`), de modo que agregar un modelo
  futuro no vuelva a degradar en silencio por olvidar un literal.
- `editOpenAIImage` deja de inyectar `input_fidelity` cuando el modelo pertenece a la familia 2.5.
- Tests que fijan cada invariante, incluido un caso que prueba que `gpt-image-2` produce el mismo
  request que antes de esta task.

### Slice 2 — Falla ruidosa en las tres puertas de entrada

- `getOpenAIImageModel()` deja de degradar en silencio: un `OPENAI_IMAGE_MODEL` desconocido lanza con el
  valor recibido y la lista de válidos, en vez de devolver el default.
- El CLI valida `--model` y `--quality` contra las uniones antes de cualquier I/O y aborta con mensaje
  accionable en vez de castear.
- El texto de ayuda del CLI enumera la familia 2.5 y sus escalones de calidad.
- Si un provider de `generateImage()` no puede servir, falla nombrando provider y modelo; nunca cae a
  otro provider en silencio.
- Tests de las tres puertas.

### Slice 3 — Medir y resolver el carril `google-imagen`

- Probe controlado de `generateImage(prompt, { provider: 'google-imagen' })` contra Vertex. Registrar el
  resultado con evidencia: responde, falla por modelo retirado, o falla por permisos.
- Confirmar contra la doc oficial vigente de Vertex si `imagen-4.0-generate-001` sigue servible y cuál
  es el reemplazo canónico.
- Con esa evidencia, una de dos, declarada explícitamente:
  - **(a) Migrar** el provider a Gemini Image `generateContent` sobre `google-genai.ts`, conservando la
    firma de `generateImage()`.
  - **(b) Retirar** `google-imagen` del tipo y del código, dejando `openai-image` como único motor
    raster, con la razón escrita y la condición bajo la cual se reabriría.
- En ambos casos el default deja de apuntar a un modelo declarado bloqueado, y `openai-image` conserva
  su comportamiento exacto.

### Slice 4 — Canary facturable 2.5 y medición de `usage` (requiere autorización de gasto)

- Corrida acotada y declarada contra el API real, en serie, con un prompt sin PII ni marcas de terceros.
- Matriz mínima: `flare` y `sunburst` × `{low, medium, high, xhigh, max}` × `{1024x1024, 1536x1024}`,
  más un caso `background: transparent` con verificación de canal alfa y píxel no opaco desde bytes
  decodificados.
- Cada respuesta persiste `usage` completo (`input_tokens_details`, `output_tokens_details`,
  `total_tokens`) y el `quality`/`size`/`background` **resueltos por el API**, no los pedidos.
- Salida: `ai-generations/<fecha>_gpt-image-2-5-usage-baseline/` con `README.md` (prompts verbatim),
  `manifest.json` (una fila por corrida con modelo, snapshot, parámetros, `usage` y costo derivado de
  las tarifas vigentes) y fila en `ai-generations/INDEX.md`.
- El costo derivado se declara **como evidencia fechada, no como contrato**.

### Slice 5 — Cerrar el lazo de flag, documentación y tasks vecinas

- Fila de `ENABLE_ASSET_GENERATOR` en `FEATURE_FLAG_STATE_LEDGER.md` con estado real por entorno y el
  runtime donde se lee (verificar antes de afirmarlo; declarar un runtime equivocado es peor que no
  declararlo).
- La matriz de capacidades reemplaza la sección "las dos trampas silenciosas" por el contrato
  transportado, y publica la tabla de consumo medido con su fecha y su advertencia de volatilidad.
- `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`: tabla de canales actualizada a lo que el código hace, y
  el gap de 2.5 retirado.
- El doc operativo y la skill `greenhouse-ai-image-generator` (+ espejo `.codex/`) actualizan reglas
  duras y uso del CLI. `pnpm skills:mirrors` verde.
- `GLOBE_MODEL_FLEET_STATUS.md` y la skill `greenhouse-globe-model-fleet` registran que el bloqueador de
  reserva de créditos tiene ahora fuente medida, y nombran a `TASK-1553` como dueña de la decisión de ruta.
- `## Delta` en `TASK-278` (entregables existen con 0/11 tildado) y en `TASK-1782`
  (`ENABLE_ASSET_GENERATOR` como instancia de su Eje 2, con forma de prefijo).

## Out of Scope

- **Crear una ruta Globe `ref/still/openai-2-5-*`**, su binding, adapter, readiness, canary o promoción.
  Eso es de `TASK-1553`. Esta task le entrega evidencia, no le invade la superficie.
- **Arreglar el patrón del auditor de flags.** Es de `TASK-1782`. Acá sólo se registra una fila.
- **Cerrar o tildar `TASK-278`.** Se le deja un Delta; reconciliarla es trabajo con su propia evidencia.
- Migrar `organization-logo-generation.ts` a 2.5. Sigue fijando `gpt-image-2`.
- Cambiar el modelo por defecto del cliente OpenAI o del CLI.
- Abrir la ruta interna al público, quitarle el guard admin o prender el flag en producción.
- Tocar `generateAnimation()` o el carril SVG/Gemini, que están sanos.
- Implementar streaming (`partial_images`) o Batch. Batch no existe para 2.5 y streaming exige contrato
  de eventos propio.
- Retirar `gpt-image-2` de ningún consumer.

## Detailed Spec

El contrato exacto del proveedor OpenAI —parámetros, enums, reglas de tamaño, precios, límites,
contradicciones documentales y fuentes— vive en
`docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`. No se duplica aquí.

El agente que tome la task lo relee antes de implementar: la matriz declara que la doc de OpenAI se
contradice en varios puntos (streaming, `partial_images` 0..3 vs 1..3, `usage` anotado como
"gpt-image-1 only", `input_fidelity` en el enum pero excluido en la prosa) y cuál lectura adoptó
Greenhouse en cada caso.

Nota de método que ahorra tiempo: toda página de `developers.openai.com` sirve Markdown crudo agregando
`.md` a la URL. Leer el `.md` en vez de dejar que un resumidor procese el HTML — en la revalidación del
2026-09-08 el resumidor omitió la tabla de costos y negó falsamente la existencia de `input_fidelity`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato OpenAI) → Slice 2 (falla ruidosa) → Slice 4 (canary). Slice 3 puede correr en
  paralelo con 1 y 2 porque toca otro provider. Slice 5 va último.
- **Slice 1 DEBE cerrar antes que Slice 4.** Correr el canary sobre el contrato viejo mide la rama
  legacy y produce una tabla de consumo que describe un request que nadie va a hacer: evidencia falsa
  que parece buena.
- **Slice 2 DEBE cerrar antes que Slice 4.** Sin falla ruidosa, un typo en el `--model` del canary genera
  contra el modelo equivocado y la evidencia queda mal atribuida sin que nadie lo note.
- **Dentro del Slice 3, medir precede a decidir.** Elegir entre migrar y retirar sin saber si el carril
  responde es elegir a ciegas: si Imagen ya no sirve, migrar es trabajo perdido; si sirve, retirarlo
  destruye una opción sin razón.
- Slice 5 sólo documenta lo que los anteriores dejaron, no lo que se pensaba hacer.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ampliar la unión de modelos cambia el request de `gpt-image-2` y afecta el command pagado de logo de organización | integration | low | Test que fija el body exacto de `gpt-image-2` antes y después; el command sigue pinneando su modelo | no signal — emerge en la suite focal |
| Hacer ruidoso `getOpenAIImageModel()` rompe un entorno que hoy tiene `OPENAI_IMAGE_MODEL` con un valor inválido y vive del fallback | integration | medium | Barrer los env de Vercel y de los runtimes Cloud Run antes de mergear Slice 2; si alguno tiene un valor inválido, corregirlo primero | fallo de arranque del consumer al primer uso |
| El canary gasta más de lo previsto porque `max`/`xhigh` consumen mucho más de lo esperado y no hay forma de estimarlo | N/A (costo) | medium | Corrida en serie, tope de piezas declarado antes de empezar, empezar por `low` y subir escalón por escalón leyendo `usage` de cada respuesta antes de la siguiente | el propio `usage` de la respuesta anterior |
| El canary choca contra un rate limit no publicado para 2.5 | integration | medium | Serie, no paralelo; ante `429` detener y registrar, nunca reintentar en bucle | `429` del proveedor |
| Se publica el costo medido como si fuera tarifa estable y alguien lo mete en una propuesta | finance | medium | La tabla se publica con fecha, modelo, snapshot y advertencia explícita de que es evidencia, no contrato | revisión humana del doc |
| Cambiar el default de `generateImage()` rompe al único consumidor sin que nadie lo note, porque está apagado en prod | integration | medium | Ejercitar `/api/internal/generate-image` en local antes y después, verificando el `provider` y `model` de la respuesta | respuesta de la ruta con provider/model inesperado |
| Se "arregla" el carril Imagen rotando el ID del modelo en vez de migrar el provider, y vuelve el mismo problema en el siguiente retiro | integration | medium | Regla escrita en Architecture Alignment + criterio de aceptación binario que lo prohíbe | revisión humana del diff |
| El prompt del canary o del probe filtra PII o marca de terceros a un proveedor externo | N/A (datos) | low | Prompt neutro declarado en el `README.md` de la evidencia y revisado antes de correr | revisión humana previa |

### Feature flags / cutover

Sin flag nuevo. La ampliación del allowlist OpenAI es aditiva y no cambia ningún default: el default del
cliente sigue siendo `gpt-image-2` y nadie usa 2.5 hasta pedirlo explícitamente. La superficie Imagen ya
vive detrás de `ENABLE_ASSET_GENERATOR`, que esta task **registra** en el ledger pero no prende.

La única excepción con cutover observable es el Slice 2: pasar de degradación silenciosa a error es,
para un entorno mal configurado, un cambio de comportamiento. Por eso su mitigación es barrer los env
**antes** de mergear, no después.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert` del PR; sin estado que deshacer | < 5 min | sí |
| Slice 2 | `revert` del PR. Si un entorno queda bloqueado por un `OPENAI_IMAGE_MODEL` inválido, la salida inmediata es corregir la env var, no revertir | < 5 min | sí |
| Slice 3 | `revert` del PR; el default vuelve al valor anterior. El probe en sí es medición, no hay estado | < 5 min | sí |
| Slice 4 | No hay rollback de un gasto. El control es preventivo: tope de piezas declarado y corrida en serie leyendo `usage` antes de cada escalón | — | no |
| Slice 5 | `revert` del PR de docs y ledger | < 5 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/ai/openai-image.test.ts` verde, incluido el caso de no-regresión de `gpt-image-2`.
2. `pnpm lint` y `pnpm typecheck` verdes.
3. Barrido de `OPENAI_IMAGE_MODEL` en Vercel y en los runtimes Cloud Run: ningún entorno con valor inválido.
4. En local, `POST /api/internal/generate-image` sin `provider`: verificar que la respuesta declara el
   provider y modelo esperados por la decisión del Slice 3.
5. En local, `POST` con `provider: 'openai-image'` explícito: verificar que no cambió nada.
6. Verificar que `/api/internal/generate-animation` sigue funcionando.
7. Con autorización de gasto: canary de una sola pieza `flare · low · 1024x1024` y readback de `usage`.
   Verificar que el `model` del request es el pedido y que el `size` resuelto es el moderno, no el legacy.
8. Recién entonces, el resto de la matriz del Slice 4, en serie, escalón por escalón.
9. Un caso `background: transparent` con verificación de alfa desde bytes decodificados.
10. En producción **no** hay verificación adicional de la superficie Imagen: responde 403 mientras el
    flag esté OFF, y esta task no lo prende. Declararlo así en el cierre en vez de simular un smoke.
11. `pnpm build` y `pnpm test` completos como gate de cierre.

### Out-of-band coordination required

- **Autorización humana explícita de gasto** antes del Slice 4, con el tope de piezas acordado, y antes
  del probe del Slice 3 si resulta facturable contra Vertex.
- Confirmar con el operador la decisión (a) migrar vs (b) retirar el carril `google-imagen` antes de
  aplicarla: es una decisión de producto sobre qué motores conservamos, no una preferencia técnica.
- Revisión del barrido de `OPENAI_IMAGE_MODEL` en Vercel y Cloud Run antes de mergear el Slice 2.
- Aviso a la dueña de `TASK-1553` cuando la evidencia de `usage` exista, porque levanta su bloqueador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `isOpenAIImageModel('gpt-image-2.5-flare')` y `isOpenAIImageModel('gpt-image-2.5-sunburst')` devuelven `true`.
- [ ] `getOpenAIImageModel({ OPENAI_IMAGE_MODEL: 'modelo-inexistente' })` **lanza** en vez de devolver `gpt-image-2`.
- [ ] `pnpm ai:image --model modelo-inexistente` aborta antes de cualquier I/O con mensaje que nombra el valor recibido y los válidos.
- [ ] `pnpm ai:image --quality max --model gpt-image-2` aborta antes de la red, porque `max` no existe en ese modelo.
- [ ] `resolveOpenAIImageSize({ model: 'gpt-image-2.5-flare', aspectRatio: '16:9' })` devuelve `2048x1152`, no `1536x1024`.
- [ ] Un `editOpenAIImage` con un modelo 2.5 produce un `FormData` que **no** contiene la clave `input_fidelity`.
- [ ] Un test fija que el body de un request `gpt-image-2` es idéntico al de antes de esta task.
- [ ] Existe evidencia escrita de si el carril `google-imagen` responde hoy contra Vertex, con fecha.
- [ ] `DEFAULT_IMAGE_PROVIDER` no apunta a ningún provider cuyo modelo esté declarado bloqueado en `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.
- [ ] El carril `google-imagen` quedó migrado al provider Gemini Image `generateContent` **o** retirado del tipo y del código, con la razón escrita. No quedó en limbo.
- [ ] Si se migró: la migración es de provider, no una sustitución del string `IMAGEN_MODEL`.
- [ ] `POST /api/internal/generate-image` con `provider: 'openai-image'` explícito devuelve el mismo `provider` y `model` que antes de esta task.
- [ ] `POST /api/internal/generate-animation` sigue respondiendo correctamente.
- [ ] Existe `ai-generations/<fecha>_gpt-image-2-5-usage-baseline/manifest.json` con al menos una fila por combinación de la matriz declarada en el Slice 4, cada una con `usage` completo y el `quality`/`size` resueltos por el API.
- [ ] La tabla de consumo publicada en la matriz de capacidades lleva fecha, snapshot de modelo y la advertencia de que es evidencia, no contrato.
- [ ] La matriz de capacidades ya no describe las dos degradaciones silenciosas como estado vigente.
- [ ] `ENABLE_ASSET_GENERATOR` tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` con estado por entorno y runtime donde se lee.
- [ ] `GLOBE_MODEL_FLEET_STATUS.md` registra que el bloqueador de reserva de créditos tiene fuente medida y que `TASK-1553` es dueña de la decisión de ruta.
- [ ] `TASK-278` y `TASK-1782` recibieron su `## Delta`.
- [ ] `pnpm skills:mirrors` y `pnpm docs:closure-check` verdes.
- [ ] Ningún archivo de evidencia, test o log contiene el valor del secreto ni PII.

## Verification

- `pnpm vitest run src/lib/ai/openai-image.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm skills:mirrors`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- Ejercicio local de las dos rutas internas, con lectura del `provider`/`model` de la respuesta
- Canary facturable con readback de `usage`, sólo con autorización de gasto

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1553` recibió un `## Delta` que nombra la evidencia de `usage` disponible y su path
- [ ] el cierre declara explícitamente que NO hubo verificación productiva de la superficie Imagen, porque está apagada por flag — en vez de omitirlo o simularlo

## Follow-ups

- Decidir en `TASK-1553` si se abre una ruta Globe para 2.5 y con qué política de reserva de créditos,
  ahora que existe una medición en vez de una estimación imposible.
- Reconciliar `TASK-278` contra la realidad del repo: sus entregables existen y muestra 0/11 tildado.
  Es candidata a cierre con evidencia, no a re-ejecución.
- Evaluar si el command de logo de organización se beneficia de `flare` (menor latencia con el timeout
  de popup que hoy lo obliga a `medium`), como task propia y con su propio canary.
- Si el Slice 3 retira `google-imagen`, evaluar si `ImageGenerationProvider` sigue justificando ser una
  unión de dos valores o si el helper se simplifica a un solo motor.
- Streaming (`partial_images`) sigue sin contrato de eventos en Greenhouse; si alguna vez se necesita, es
  task aparte con su propio lifecycle y costo (+100 tokens de output por parcial).

## Delta 2026-09-08

Creada consolidando y superseding a `TASK-1850` (habilitación GPT Image 2.5 en el helper OpenAI), por
instrucción del operador. `TASK-1850` cubría sólo la mitad OpenAI del mismo contrato de proveedores;
su contenido está absorbido aquí sin pérdida, y se le suma el carril `google-imagen`, el default
bloqueado y la fila de ledger de `ENABLE_ASSET_GENERATOR`. El hallazgo del auditor de flags NO generó
task propia: `TASK-1782` ya posee ese bug class y recibe un Delta.

## Open Questions

- ¿Cuál es el tope de gasto autorizado para el canary del Slice 4? La matriz mínima son 20 piezas más el
  caso transparente; sin poder estimar el costo por imagen, el tope debe fijarlo el operador en piezas,
  no en USD.
- ¿Migrar o retirar `google-imagen`? Depende del Slice 3, pero la preferencia del operador importa:
  ¿queremos conservar un segundo motor raster por independencia de proveedor, o aceptamos depender sólo
  de OpenAI para raster y de Higgsfield/Recraft para vector?
- ¿El barrido de `OPENAI_IMAGE_MODEL` debe cubrir también entornos Preview de Vercel, o basta Production,
  staging y los cinco Cloud Run?
- ¿`ENABLE_ASSET_GENERATOR` se lee en algún runtime además de Vercel? Hay que resolverlo antes de
  escribir la fila del ledger: declarar un runtime equivocado es peor que no declararlo.
