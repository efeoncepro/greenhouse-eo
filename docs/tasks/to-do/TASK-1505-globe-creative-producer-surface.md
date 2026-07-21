# TASK-1505 — Globe Creative Producer Surface (UI)

## Delta 2026-07-21 — TASK-1507 complete: prerrequisito de front door cerrado

El prerrequisito de front door quedó cerrado el 2026-07-21: `TASK-1507` está complete y el shell interno se sirve en
`https://globe.efeoncepro.com` (Global External ALB + serverless NEG → `globe-studio-internal`). El `*.run.app` ya no
es alcanzable por browser (404, ingress `internal-and-cloud-load-balancing`). También queda stale la "una sola
réplica" del Delta 2026-07-20: `TASK-1465` está complete y el valor vivo es `maxScale=3`. El gate de Production
externo (`TASK-1480`) y la decisión diferida de host para el frontend cliente comercial siguen intactos.

## Delta 2026-07-20 — front door (ADR-004 / TASK-1507) debe preceder el rollout interno de esta UI

**ADR-004** (`TASK-1506`, complete) fijó que el shell interno de Globe se queda en Cloud Run (Node nativo) y que el
custom domain `https://globe.efeoncepro.com` lo publica **`TASK-1507`** vía Global External ALB + serverless NEG. El
rollout interno de esta superficie va **después** de que `TASK-1507` cierre el front door — cerrado el 2026-07-21,
ver el Delta de arriba. Dos consecuencias: (1) esta UI es un thin client del shell interno; (2) el **host del
frontend cliente comercial** (cuando esta superficie se abra a clientes) es una **decisión diferida** por ADR-004 —
Vercel + Next.js sobre edge global es candidato vivo, a decidir al construir esta UI y antes de `TASK-1480`. No
asumir que "Cloud Run para el shell interno" implica Cloud Run para la superficie cliente comercial.

## Delta 2026-07-20 — estimate reader listo (TASK-1502 complete)

El `✨N` inline del botón Generate ya tiene su reader: `globe.lab.experiment.estimate` (SDK `estimateExperiment(query)`) devuelve `LabEstimatePreviewV1` (estimatedCredits + ruta de fidelidad + `withinHardCap` señal de presupuesto), read-only, sobre una tupla `(capability, referenceRoute, outputShape)` prospectiva — sin crear experimento ni reservar. La UI lo llama en cada cambio de shape sin efectos. Un shape fuera de constraints → `invalid_request`; sobre el hard cap → `withinHardCap:false` (mostrar 'excede tu tope', no bloquear). Nunca expone provider/model/costo/margen.

## Delta 2026-07-20

- El reader que esta UI consume **ya existe** (TASK-1500 complete): `globe.producer.catalog.list`/`.get`
  (capability `globe.producer.catalog.read`), proyección `ProducerCatalogViewV1` con naming resuelto
  server-side (vista client omite `naming.internal`) y `catalogVersion` para invalidar cache. Las surfaces
  `ui`/`mcp` siguen `policy-blocked` — promoverlas es el gate de ESTA task (editar `PRODUCER_CATALOG_COVERAGE`
  + broker grant de `globe.producer.catalog.read` a humanos).


- **Delta 2026-07-20 — TASK-1501 complete:** el `OutputShapeV1` (union discriminado por modalidad) sobre el que
  esta UI renderiza los paneles ya existe y valida fail-closed pre-spend. Ningún control debe existir sin su param
  en el union: la UI envía `output` en el payload no confiable y el dominio lo valida contra los constraints del
  catálogo (TASK-1500). El modelo público (nombre+versión) sale del catálogo; el shape sale de este contrato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1505-globe-creative-producer-surface.md`
- Flow: `docs/ui/flows/TASK-1505-globe-creative-producer-surface-flow.md`
- Motion: `docs/ui/motion/TASK-1505-globe-creative-producer-surface-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `TASK-1500, TASK-1501, TASK-1502, TASK-1503, TASK-1504`
- Branch: `task/TASK-1505-globe-creative-producer-surface`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el **Creative Producer**: la superficie prompt-first Imagen/Video/Audio del Efeonce Globe. Un
**chassis compartido** (barra de prompt con referencias `+`/`@`, catálogo de rutas, controles de output-shape,
estimación inline `✨N` pre-spend, feed unificado cross-modal, acciones de asset y Recrear) más **paneles por
modalidad** que adaptan modo y controles a cada capability. Es un **thin client** sobre los commands/readers de
`TASK-1500…1504`; no contiene lógica de negocio, provider, DB ni storage. Implementación incremental
**Imagen → Video → Audio**.

## Why This Task Exists

Efeonce **hoy produce contenido propio en Higgsfield** (voiceovers de NEXA / AI Visibility Grader, campaña
SKY). El Producer trae ese trabajo in-house sobre Globe con una experiencia **atómica, low-ceremony,
model-first**: `prompt (+refs) → ruta → shape → Generate (costo visible) → feed de candidatos →
Recrear/descargar`. Es la superficie **hermana de `TASK-1474`** (el Producer es prompt-first; el Workbench es
brief-first, encima), y se construye **antes** del Workbench porque materializa y valida sus primitivos
compartidos (catálogo, contrato discriminado, estimate, retrieval, feed). Sin esta superficie, los backends
`TASK-1500…1504` quedan sin consumidor humano y el valor rápido del Producer no llega al operador.

El backend actual del run es plano: `PrepareExperimentPayloadV1` lleva `prompt?: string`
(`../efeonce-globe/packages/contracts/src/index.ts:316`), la estimación vive **dentro** de `execute`
(`../efeonce-globe/packages/domain/src/model-lab.ts:282`) y los outputs se retienen content-addressed vía
`OutputIngestPort` / `GcsOutputIngest` (`../efeonce-globe/apps/creative-runner/src/output-ingest.ts`).
`TASK-1500…1504` gobiernan esos contratos; esta task construye **únicamente la superficie** que los consume.

## Goal

- Entregar una consola Producer premium, creative-native, no un formulario de prompts ni un DAG técnico, con
  un momento visual dominante (composer + feed) anclada en la marca Globe, los tokens AXIS y la Composition
  Shell.
- Que ninguna superficie renderice un control cuyo param no exista y esté **validado** en el contrato
  discriminado de `TASK-1501`: la UI es fail-closed por construcción (no ofrece 4K si la ruta topa en 720p).
- Que el operador vea el costo **antes de gastar** (`✨N` desde el estimate reader de `TASK-1502`), un feed
  unificado cross-modal (imagen/video/audio en la misma superficie) y acciones de asset tenant-safe
  (descargar/preview/favorito/usar-como-referencia/Recrear) sobre `TASK-1503`.
- Que las capabilities nuevas del Producer (`TASK-1504`: video-frames, video-motion-control,
  audio-change-voice, audio-translate, multi-output omni, voice-preset registry) nazcan visibles pero
  **gated `policy-blocked`** hasta su gate de promoción, sin romper el chassis.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — **fuente de verdad**:
  chassis compartido, contrato discriminado por modalidad, naming dual, matriz de capabilities, boundary,
  secuencia y hard rules.
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (referencia de runtime; la doc
  gobernante vive en Greenhouse).

Reglas obligatorias (boundary duro — repetidas del brief y de la spec fuente):

- **El código vive en `efeonce-globe`** (`apps/studio-web`); **Greenhouse gobierna lifecycle, QA, evidencia y
  cierre documental**. Esta task no crea apps/packages nuevos ni un segundo harness de tasks en Globe.
- **Thin client, cero lógica de negocio.** La UI es cliente de los commands/readers de `TASK-1500…1504`; no
  implementa policy, no llama provider/DB/storage, no crea endpoints ad hoc. UI, MCP, CLI y SDK son
  consumidores del **mismo** contrato (Full API Parity).
- **El provider seam es sagrado.** Ningún componente instancia un SDK de proveedor; toda ejecución cruza el
  command → adapter → runner del backend.
- **Contrato discriminado fail-closed.** Ninguna superficie renderiza un control cuyo param no exista y esté
  validado contra los constraints de la ruta (`TASK-1501` + `TASK-1500`); el rechazo de un shape inválido
  ocurre **antes** de reservar crédito, no en runtime.
- **Naming dual.** La superficie **nunca** expone el slug del proveedor. El operador Efeonce ve la vista
  **modelo-real curado** (`actualRoute` = contrato de fidelidad, no slug); costo vendor y margen nunca se
  muestran.
- **La unidad de crédito es `ruta × output-shape`, nunca el modelo.** El `✨N` sale del estimate reader; un
  fallback nunca convierte modelo/provider en unidad de crédito.
- **Retrieval tenant-safe.** Descargar/preview resuelve `hash → bytes` solo dentro del workspace del caller;
  un asset de otro workspace es `not_found`, sin revelar existencia.
- **Capabilities nuevas nacen `policy-blocked`** en surfaces ejecutables hasta su gate; la superficie del
  Producer nace behind flag/allowlist interna, coherente con `LAB_COVERAGE` (hoy `ui: policy-blocked`).

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — estándar premium + scorecard (aplicado a la
  evidencia gobernada por Greenhouse; el runtime visual es de Globe).
- `.claude/skills/greenhouse-globe/SKILL.md` — contrato de arquitectura, provider seam, boundary.

## Dependencies & Impact

### Depends on

Backends del cluster Producer (sin ellos la superficie nace hueca — cada región/control exige su reader/command
ya disponible; nunca renderizar un panel cuyo backend aún no existe):

- `TASK-1500` — **Governed Route/Model Catalog** → catálogo de rutas + constraints + specialty + naming dual +
  modos de input soportados. Alimenta el selector de ruta, la habilitación de controles y las opciones de
  output-shape.
- `TASK-1501` — **Modality-Discriminated Run Contract** → `PreparePayload` como union por capability con
  output-shape validado pre-spend. Es lo que la UI serializa al generar; define qué controles existen por
  modalidad. Absorbe `TASK-1495` (aspect ratio = campo del output-shape).
- `TASK-1502` — **Previewable Estimate reader** → el `✨N` inline en el CTA Generar, read-only e idempotente.
- `TASK-1503` — **Governed Output Retrieval + Asset Actions** → `hash → bytes` servible para preview/descarga
  (tenant-safe) + favorito + usar-como-referencia sobre el store content-addressed de `TASK-1490`.
- `TASK-1504` — **Producer Capability Expansion** → video-frames, video-motion-control, audio-change-voice,
  audio-translate, multi-output omni, voice-preset registry (cada una `policy-blocked` hasta gate).

Reutiliza (contratos ya planificados; **no** los reimplementa la UI): `TASK-1493` (recipe/preset), `TASK-1494`
(reference intelligence), `TASK-1496` (recreate/variación/batch — motor de "Recrear"), `TASK-1497` (inpaint =
image-edit), `TASK-1498` (exploración → feed unificado), `TASK-1490` (retención de outputs / `editFrom`
cross-model), `TASK-1465` (tenancy → projects durables cuando aterrice).

### Blocks / Impacts

- **Prima `TASK-1474` (Workbench).** El chassis, el composer, el feed unificado y los patterns que esta task
  construye/valida son los primitivos que el Workbench brief-first consume encima. Cualquier ajuste del
  chassis aquí impacta al Workbench.
- No habilita producción ni clientes externos por sí sola; la superficie cliente (fidelidad-curada sin
  operadores) es un gate posterior.

### Files owned

- `../efeonce-globe/apps/studio-web/` — consola Producer: chassis (modality switch, composer, feed, candidate
  viewer), paneles por modalidad (image/video/audio), acciones de asset y Recrear.
- Módulo de copy centralizado de Globe para las strings del Producer (mirror del patrón `src/lib/copy/*`;
  el runtime y su copy son de Globe, no de `greenhouse-eo`).
- `docs/ui/wireframes/TASK-1505-globe-creative-producer-surface.md`
- `docs/ui/flows/TASK-1505-globe-creative-producer-surface-flow.md`

Los contracts de dominio pertenecen a sus capability tasks (`TASK-1500…1504`); el packaging SDK/MCP a la
capa de parity de Globe.

## Current Repo State

### Already exists

- Globe dispone de repo separado (`efeonce-globe`), identidad internal-only, Node 24, SDK/WIF base, primera
  shell branded y el API Contract Spine (`TASK-1481`).
- El Model Lab (`TASK-1457`) corre commands `prepare|execute|cancel` + readers `get|status|evidence` con
  spend fence, private-ingest, kill switch y state machine (`prepared → estimated → reserved → running →
  candidate_ready|failed`), hoy con `LAB_COVERAGE` en `ui: policy-blocked`.
- Adapters reales enchufados detrás del seam (`TASK-1486/1487/1488` + Veo/Omni), retención de outputs
  content-addressed (`TASK-1490`) y edit cross-model (`editFrom`).

### Gap

- No existe **ninguna superficie humana** para el Producer: el catálogo, el contrato discriminado, el estimate
  previewable, el retrieval y las capabilities nuevas (`TASK-1500…1504`) nacen sin consumidor de UI.
- El contrato del run es aún plano (`prompt?: string`); esta task depende de que `TASK-1501` lo discrimine
  antes de cablear controles por modalidad.
- Falta el chassis compartido cross-modal (composer + feed unificado) que también consumirá `TASK-1474`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web (superficie + BFF); Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Creative Producer Surface — thin client de los commands/readers de TASK-1500…1504; consumidores autorizados: operadores internos Efeonce (internal-only)`
- Server/browser split: `secrets, providers, writes y resolución hash→bytes server-only; la UI solo recibe DTOs serializables redactados (sin slug, sin costo vendor, sin margen) y despacha commands/readers tipados`
- Build impact: `none — sin dependencia pesada nueva; Globe valida su runtime (pnpm check/build); Greenhouse valida task/docs/evidencia`
- Extraction blocker: `ninguno — el runtime ya nace fuera del monolito Greenhouse; provider/auth/storage viven detrás del spine`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador interno Efeonce con `globe.studio.access` (internal-only); las capabilities de gasto
  y las nuevas del Producer se gobiernan por grant + coverage, no por rol de UI.
- Momento del flujo: producción atómica prompt-first — el operador quiere una imagen/video/audio concreto,
  rápido, con costo visible, y elegir/descargar/recrear del feed.
- Resultado perceptible esperado: escribir un prompt, elegir ruta y shape, ver el costo `✨N`, generar y ver
  el candidato aparecer en el feed unificado, con acciones de asset a mano.
- Fricción que debe reducir: la ceremonia del Workbench (brief → dirección → aprobación → delivery) para el
  trabajo suelto; la incertidumbre de costo antes de gastar; el salto de herramienta a Higgsfield.
- No-goals UX: brief-first, DAG/linaje de exploración como onboarding, pricing/wallet self-serve, aprobación
  humana comercial, delivery/paquete de release, exponer slug/costo vendor/margen.

### Surface & system decision

- Surface: consola **Creative Producer** en `apps/studio-web` (ruta interna a definir en Slice 1; candidata
  `/producer`, resuelta con `info-architecture`). Internal-only, behind flag.
- Composition Shell: `aplica` — la consola declara composición + regiones (Modality band, Composer, Generation
  Feed, Candidate Viewer). No se inventan grids/morph ad hoc; los paneles por modalidad adaptan **dentro** de
  la región Composer por su propio contrato (The Seam), sin un sistema de regiones paralelo.
- Primitive decision: `reuse|extend|new` sobre el registry de patterns de Globe (`Composer`, `Route Selector`,
  `Output-Shape Tray`, `Generation Feed`, `Candidate Viewer`, `Asset Action Bar`); cualquier pattern nuevo se
  registra con anatomy/states/a11y/responsive antes de promoverlo. No adopta layouts/recipes de Greenhouse.
- Adaptive density / The Seam: `aplica` — el composer y las tarjetas de candidato nacen `density=auto`
  rich-ready; la tarjeta se adapta a su ancho (compacta en feed denso, rica en viewer).
- Floating/Sidecar/Dialog decision: el **Candidate Viewer** abre como Floating Surface / focus overlay al
  seleccionar un candidato (imagen lightbox / player de video / waveform de audio) devolviendo foco al
  disparador; en 390px pasa a sidecar temporal. El catálogo de rutas y el output-shape avanzado usan popover
  anclado, no modal.
- Copy source: módulo de copy centralizado de Globe (mirror del patrón `src/lib/copy/*`); **cero** mensajes
  reusable hardcodeados. Namespace `GLOBE_PRODUCER.*` (ver Copy ledger del wireframe).
- Access impact: `entitlements` — la superficie y sus acciones se gobiernan por capability + coverage
  (`policy-blocked` hasta gate); no se derivan accesos en cliente.

### State inventory

- Default: composer listo (prompt vacío, ruta por defecto de la modalidad, shape por defecto, `✨N` calculado
  cuando hay shape válido); feed con generaciones previas o empty.
- Loading: catálogo de rutas y feed cargando (skeleton dimensionado al contenido final, no spinner de página).
- Empty: sin generaciones — copy de arranque + CTA a escribir el primer prompt.
- Generating: run en vuelo — progreso por attempt honesto, cancelación real (command `cancel`), sin porcentaje
  inventado; la tarjeta del candidato aparece como placeholder "en curso" en el feed.
- Error: shape inválido pre-spend (proporción/duración/sampleRate fuera de constraints) → CTA deshabilitado con
  motivo; provider error tipado + recuperación; spend-fence block; estimate stale/requerido.
- Degraded / partial: el candidato existe por su `hash` pero el archivo no resuelve (fallo de storage en
  retrieval) → se muestra el candidato con badge "archivo no disponible por ahora", nunca se descarta ni se
  finge $0/estado sano.
- Permission denied: capability `policy-blocked` (modo/panel gated) → control visible pero deshabilitado con
  copy honesto; `not_found` sin filtrar existencia cross-workspace.
- Long content: feed con muchas generaciones → virtualización/paginación acotada, sin scroll horizontal de
  página; el feed puede tener su propio scroll etiquetado.
- Mobile / compact: 390px — composer colapsa a bottom sheet / stepper; feed a lista de una columna; el `✨N`,
  la ruta y el estado crítico nunca se recortan (banda sticky).
- Keyboard / focus: orden header → modality band → composer (prompt → refs → modo → ruta → shape → Generar) →
  feed → viewer; foco visible; overlay del viewer devuelve foco al disparador.
- Reduced motion: entrada de candidatos, stagger del feed y progreso de generación degradan a fade/estado
  estático bajo `prefers-reduced-motion`; el progreso nunca es la única señal (live region moderada).

### Interaction contract

- Primary interaction: escribir prompt → (opcional) agregar referencias `+`/`@` → elegir modo/ruta/shape →
  `Generar` (dispara el command; el `✨N` es el costo mostrado antes del click).
- Hover / focus / active: tarjetas de candidato revelan la Asset Action Bar (preview/descargar/favorito/
  usar-como-referencia/Recrear) en hover y focus (no solo hover); ruta y specialty en tooltip.
- Pending / disabled: `Generar` deshabilitado sin prompt válido, con shape inválido, con estimate stale o con
  fence bloqueado; cada estado deshabilitado explica el motivo.
- Escape / click-away: cierra el Candidate Viewer y los popovers (ruta/shape) devolviendo foco; no descarta el
  prompt del composer.
- Focus restore: al cerrar viewer/popover, foco vuelve al elemento disparador.
- Latency feedback: `Generar` entra a estado pending inmediato; la generación muestra progreso por attempt +
  live region; el estimate recomputa con debounce al cambiar shape (read-only, idempotente).
- Toast / alert behavior: éxito silencioso (el candidato aparece en el feed); errores tipados con recovery;
  ningún raw provider/DB error a la vista.

### Motion & microinteractions

- Motion primitive: `reuse` — sistema de motion heredado de Globe (mismo del `TASK-1474`); esta task no crea
  primitives de motion. Microinteracciones no triviales del Producer (entrada de candidato al feed, stagger de
  grid, progreso de generación) se especifican en un **Motion contract dedicado como follow-up gate antes de
  `UI ready: yes`**; hasta entonces el scope de motion es "inherit + reduced-motion fallback".
- Enter / exit: candidato entra al feed con fade/scale suave; viewer abre con transición contenida.
- Layout morph: el composer morfa entre modalidades (image/video/audio) preservando la barra de prompt; sin
  reflow que salte foco.
- Stagger: grid del feed con stagger acotado en la carga inicial; off bajo reduced-motion.
- Timing / easing token: tokens de motion de Globe (no valores literales).
- Reduced-motion fallback: todo lo anterior degrada a estático/fade; el progreso mantiene señal textual.
- Non-goal motion: hero animado tipo landing, parallax, confetti, cualquier motion que compita con el momento
  visual dominante del candidato.

### Implementation mapping

- Route / surface: consola Producer en `../efeonce-globe/apps/studio-web` (ruta interna behind flag).
- Primitive / variant / kind: `Composer`, `Route Selector`, `Output-Shape Tray`, `Generation Feed`,
  `Candidate Viewer`, `Asset Action Bar` (patterns Globe; reuse/extend/new registrados).
- Component candidates: Composition Shell de Globe + Adaptive Card (candidato) + Floating Surface (viewer) +
  popover (ruta/shape).
- Copy source: `GLOBE_PRODUCER.*` en el copy centralizado de Globe.
- Data reader / command:
  - Catálogo de rutas + constraints + specialty + naming: reader de `TASK-1500`.
  - Serializar/generar: command discriminado de `TASK-1501` (`prepare` → `execute` del run).
  - Estimación `✨N`: estimate reader de `TASK-1502` (read-only, idempotente).
  - Feed + preview/descarga + favorito + usar-como-referencia: readers/commands de `TASK-1503`.
  - Capabilities nuevas (video-frames/motion, audio-change-voice/translate, multi-output, voice-preset):
    `TASK-1504` (`policy-blocked` hasta gate).
  - Recrear: motor recipe/variación de `TASK-1496` (+ `editFrom` de `TASK-1490` para refinar cross-model).
- API parity: la superficie es cliente del mismo contrato que SDK/MCP/CLI; cero handler UI con policy o
  provider/DB/storage; ningún endpoint ad hoc.
- Access / capability: `globe.studio.access` para la consola; cada acción gobernada por su capability +
  coverage; superficie internal-only behind flag.
- States to implement: default, loading, empty, generating, error (shape/provider/fence/estimate),
  degraded, permission-denied/policy-blocked, long-content, mobile, keyboard/focus, reduced-motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/globe-creative-producer.*` (definir en Slice 1; evidencia
  gobernada por Greenhouse aunque el runtime sea de Globe — coordinar el capture contra el servicio interno).
- Route: consola Producer (interna).
- Viewports: Desktop 1440×1000 y Mobile 390×844.
- Quality profile: `premium`.
- Required steps: cargar consola (image) → prompt + referencia → cambiar shape (ver `✨N` recomputar) →
  Generar (generating) → candidato en feed → abrir viewer → acciones de asset → Recrear; luego cambiar
  modalidad a Video (modos Create/Edit/Motion, con capabilities `policy-blocked` visibles) y a Audio
  (Voiceover/ChangeVoice/Translate).
- Required captures: primer fold desktop y 390px tras shell + fixtures, antes del cableado exhaustivo; cada
  estado clave (empty, generating, candidate-ready, error shape, degraded, policy-blocked).
- Required `data-capture` markers: `producer-console`, `producer-modality-band`, `producer-composer`,
  `producer-prompt-bar`, `producer-route`, `producer-shape`, `producer-estimate`, `producer-feed`,
  `producer-candidate-viewer`, `producer-asset-actions`, `producer-state-*`.
- Assertions: `scrollWidth <= clientWidth` en ambos viewports; el `✨N` visible y consistente con el estimate
  reader; ningún control renderizado cuyo param no exista/valide en el contrato; ningún slug/costo vendor/margen
  en el DOM.
- Scroll-width checks: página sin scroll horizontal desktop ni 390px; solo el feed puede tener scroll propio
  etiquetado.
- Reduced-motion / focus evidence: capturar `prefers-reduced-motion` (fade/estático) y el recorrido de foco +
  focus-restore del viewer.
- Review dossier: `pnpm fe:capture:review globe-creative-producer` (dossier UI review).
- Baseline decision / surface ID: baseline futuro `globe.creative-producer-surface`; rebaseline solo declarado.

### Design decision log

- Decision: **Composition Shell "Producer Console" prompt-first** = composer dominante + feed unificado
  cross-modal + candidate viewer, con paneles por modalidad que adaptan dentro de la región Composer.
- Alternatives considered: (1) **Prompt form + resultados** clásico — rechazado: template genérico, sin
  momento visual dominante. (2) **Superficie por modalidad separada** (3 páginas) — rechazado: rompe el feed
  unificado cross-modal y triplica el chassis. (3) **Reusar el Creative Desk del Workbench** (`TASK-1474`) —
  rechazado: el Desk es brief-first/canvas-dominante; el Producer es prompt-first/composer-dominante; comparten
  primitivos, no layout.
- Why this pattern: preserva craft y el momento visual del candidato, mantiene bajo el ceremony, y hace del
  contrato discriminado + estimate + retrieval piezas visibles que el Workbench luego reutiliza.
- Reuse / extend / new primitive: reuse del shell + Adaptive Card + Floating Surface; new patterns Globe
  (Composer / Route Selector / Output-Shape Tray / Generation Feed / Candidate Viewer / Asset Action Bar)
  registrados con su anatomy/states/a11y.
- Open risks: dirección visual anclada en la **referencia Higgsfield** ADAPTADA (nunca copiar su look) — riesgo
  de deriva a "template Higgsfield"; el feed cross-modal mezcla ratios/duraciones dispares (riesgo de layout);
  motion contract pendiente antes de `UI ready: yes`.

### Visual verification

- GVC scenario: `globe-creative-producer`.
- Viewports: Desktop 1440×1000, Mobile 390×844.
- Required captures: primer fold + estados clave (empty, generating, candidate-ready, error, degraded,
  policy-blocked) en ambos viewports.
- Required `data-capture` markers: los listados en GVC scenario plan.
- Scroll-width check: sí, ambos viewports.
- Accessibility/focus checks: orden de foco, focus visible, focus-restore del viewer, live region del progreso,
  contraste WCAG AA.
- Before/after evidence: N/A (superficie nueva); primer fold vs cableado exhaustivo.
- Known visual debt: motion contract dedicado pendiente; dirección visual sujeta a iteración GVC.
- Visual scorecard: `docs/ui/reviews/TASK-1505-globe-creative-producer-surface.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; jerarquía/economía de superficies/impacto visual/fidelidad/
  resistencia a template genérico >= 4.5` (estándar premium; card-on-card / card wallpaper / ausencia de
  momento visual dominante = BLOCK).

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

### Slice 1 — Chassis compartido (Composition Shell) + modalidad Imagen

- Consola Producer en `apps/studio-web` behind flag internal-only: Modality band (Imagen/Video/Audio),
  región Composer (prompt bar `+`/`@`, Route Selector, Output-Shape Tray, CTA Generar con `✨N`), región
  Generation Feed unificada y Candidate Viewer (Floating Surface).
- Cablear la modalidad **Imagen** de punta a punta: catálogo de rutas (`TASK-1500`), contrato discriminado
  image `{ prompt, references[]?, quality, aspectRatio, count }` (`TASK-1501`), estimate `✨N` (`TASK-1502`),
  generación → feed → candidate viewer, y acciones de asset preview/descargar/favorito/usar-como-referencia
  (`TASK-1503`) + Recrear (`TASK-1496`/`editFrom`).
- Registrar los patterns Globe nuevos con anatomy/states/a11y/responsive.

### Slice 2 — Estados, honestidad y a11y del chassis

- Estados completos: loading, empty, generating (progreso por attempt + cancel real), error (shape inválido
  pre-spend, provider error tipado, fence block, estimate stale), degraded (candidato por hash sin archivo),
  policy-blocked/permission-denied, long-content, mobile 390px, keyboard/focus, reduced-motion.
- Naming dual verificado: cero slug/costo vendor/margen en el DOM; `actualRoute` = contrato de fidelidad.
- Retrieval tenant-safe verificado: asset cross-workspace → `not_found`, sin revelar existencia.

### Slice 3 — Modalidad Video (behind flag)

- Panel Video: modos **Create (Elements / Frames) / Edit / Motion** + controles resolution/duration/
  aspectRatio/audioMode del contrato video (`TASK-1501`), con las capabilities nuevas (video-frames,
  video-motion-control, multi-output omni de `TASK-1504`) **visibles pero `policy-blocked`** hasta gate.
- Feed unificado muestra candidatos de video junto a imagen; el viewer usa player de video.

### Slice 4 — Modalidad Audio (behind flag)

- Panel Audio: modos **Voiceover / ChangeVoice / Translate** + controles sampleRate/format/speed/volume/pitch
  + voice-preset picker del contrato audio (`TASK-1501` + voice-preset registry de `TASK-1504`), con
  audio-change-voice/audio-translate **`policy-blocked`** hasta gate.
- El viewer usa waveform/player de audio; el feed mezcla las tres modalidades (cross-modal real).

### Slice 5 — Cierre visual premium + GVC

- Dirección visual anclada en la referencia Higgsfield ADAPTADA a marca/tokens AXIS + Composition Shell +
  primitives de Globe; scorecard premium; GVC desktop + 390px de todos los estados clave.
- Motion contract dedicado (follow-up) antes de mover `UI ready: yes`.

## Out of Scope

- El contrato discriminado, el catálogo, el estimate, el retrieval y las capabilities nuevas: pertenecen a
  `TASK-1500…1504`. Esta task **solo consume** esos contratos.
- Superficie cliente fidelidad-curada (sin operadores), pricing/wallet self-serve, ledger comercial durable
  (`TASK-1468`), aprobación humana comercial, delivery/paquete de release (`TASK-1472`) — son del Workbench /
  gates posteriores.
- El paso "Dirección" brief-first (`TASK-1499`) — es exclusivo del Workbench; el Producer es prompt-first.
- Mover runtime, datos, provider secrets o lógica de Globe a Greenhouse; crear un segundo harness/namespace de
  tasks en Globe; crear apps/packages nuevos.

## Detailed Spec

Ver el wireframe (`docs/ui/wireframes/TASK-1505-globe-creative-producer-surface.md`) y el flow
(`docs/ui/flows/TASK-1505-globe-creative-producer-surface-flow.md`) para: regiones del chassis, layout por
modalidad, controles reales con sus params del contrato discriminado, feed unificado, estados, copy ids es-CL,
primitive decision, y el mapping a los readers/commands de `TASK-1500…1504`.

La ejecución comienza desde Greenhouse con el hook de task cuando el operador apruebe su goal. El plan puede
modificar `efeonce-globe` en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec
canónica en Greenhouse.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (chassis + Imagen) → Slice 2 (estados/honestidad/a11y) son la base; **Slice 3 (Video)** y **Slice 4
  (Audio)** solo pueden empezar con Slice 1+2 cerrados y **con sus backends `TASK-1501`/`TASK-1504` disponibles
  para esa modalidad**.
- **NUNCA** renderizar un panel/modo cuyo backend (contrato discriminado o capability) aún no exista o esté
  `policy-blocked` sin declararlo como tal en la UI; un control sin param validado en el contrato es una
  violación del contrato de la task.
- Slice 5 (cierre premium + GVC) corre al final; el Motion contract precede a `UI ready: yes`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI renderiza un control cuyo param no existe/valida en el contrato (offer 4K en ruta que topa en 720p) | contrato discriminado / gasto | medium | derivar controles del reader del catálogo (`TASK-1500`) + validar shape pre-spend (`TASK-1501`); fail-closed | intento de generar con shape rechazado por el backend |
| Fuga de slug/costo vendor/margen a la superficie | security/commercial | medium | naming dual; GVC assert de ausencia de slug/costo en DOM; `actualRoute` = contrato de fidelidad | slug o número de costo vendor visible en capture |
| UI bonita pero desacoplada del lifecycle (handler UI con policy/provider) | Globe/Greenhouse | medium | gate binario: cero business logic/provider/DB/storage en UI; conformance E2E UI≡SDK≡MCP | acción UI sin command/reader compartido |
| Feed cross-modal rompe layout (ratios/duraciones dispares) | UI | medium | Adaptive Card density; contención de scroll; GVC 390px | scroll horizontal de página o card wallpaper |
| Habilitación accidental de capability `policy-blocked` sin gate | security/commercial | low | coverage fail-closed; controles gated deshabilitados con copy honesto; deny tests | capability ejecuta sin su gate de promoción |
| Retrieval sirve asset cross-workspace | security | low | tenant-safe en `TASK-1503`; UI trata `not_found` sin revelar existencia | asset de otro workspace visible/servido |

### Feature flags / cutover

Default internal-only, behind flag/allowlist. La consola nace `policy-blocked`/flag-OFF coherente con
`LAB_COVERAGE` (`ui: policy-blocked`); cada modo/panel de capability nueva se prende por su propio gate. Revert
= flag OFF + revert PR. La UI **no** promueve una surface a `available`; eso es un gate separado (broker grant +
flip de coverage).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (chassis + Imagen) | flag OFF + revert deploy Globe | <30 min | sí |
| Slice 2 (estados/a11y) | revert commit correctivo | <15 min | sí |
| Slice 3 (Video) | flag de panel Video OFF + revert | <30 min | sí |
| Slice 4 (Audio) | flag de panel Audio OFF + revert | <30 min | sí |
| Slice 5 (premium/GVC) | revert correctivo visual; sin mutación de estado | <15 min | sí |

### Production verification sequence

Local-first en Globe; sandbox no productivo internal-only; allowlist interna; tests negativos (shape inválido,
fence block, cross-workspace, policy-blocked); evidencia runtime + GVC premium; QA release auditor y
documentation governor en Greenhouse; solo después puede evaluarse un rollout adicional. Ninguna promoción de
surface a `available` sin su gate explícito.

### Out-of-band coordination required

Provider/GCP/Security/Commercial solo cuando un slice los afecte (p.ej. prender una capability `policy-blocked`
exige su gate de promoción + broker grant). Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La consola Producer usa los **mismos** commands/readers de `TASK-1500…1504`; ningún handler UI
      implementa policy o llama provider/DB/storage; ningún endpoint ad hoc.
- [ ] Ningún control renderizado tiene un param que no exista y esté validado en el contrato discriminado; un
      shape inválido se rechaza **antes** de reservar crédito (fail-closed) con copy honesto.
- [ ] El costo `✨N` se muestra **antes** de generar, sale del estimate reader (`TASK-1502`, read-only), y la
      unidad es `ruta × output-shape` (nunca el modelo).
- [ ] El feed es **unificado cross-modal** (imagen/video/audio en la misma superficie) y las acciones de asset
      (preview/descargar/favorito/usar-como-referencia/Recrear) operan sobre `TASK-1503`; un asset
      cross-workspace es `not_found`.
- [ ] Cero slug de proveedor, costo vendor o margen en el DOM (naming dual); `actualRoute` = contrato de
      fidelidad.
- [ ] Las capabilities nuevas de `TASK-1504` se muestran **`policy-blocked`** hasta su gate, sin romper el
      chassis; ningún panel de una modalidad se renderiza si su backend no existe.
- [ ] Estados loading/empty/generating/error/degraded/permission/long-content/mobile/keyboard/reduced-motion
      cubiertos o explícitamente fuera de scope.
- [ ] Sin scroll horizontal de página en desktop ni 390px; GVC desktop + mobile alcanza estándar premium sin
      card wallpaper ni card-on-card; scorecard `average >= 4.5`, floor `>= 4`.
- [ ] `Execution profile: ui-ux`, `UI impact: flow`, `Wireframe` y `Flow` declarados y sus archivos existen.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1505`
- `pnpm ops:lint --changed`
- `pnpm ui:wireframe-check --task TASK-1505` · `pnpm ui:flow-check --task TASK-1505`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` (typecheck NodeNext strict + `node --test` + build) cuando
  exista cambio de runtime.
- GVC: `pnpm fe:capture globe-creative-producer --env=<interno> --gif` + `pnpm fe:capture:review
  globe-creative-producer` (coordinar contra el servicio interno de Globe).

## Closing Protocol

- [ ] `Lifecycle`/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` u operativamente bloqueado.
- [ ] Chequeo de impacto cruzado sobre `TASK-1474` (chassis compartido) y `TASK-1500…1504` (consumidor real).
- [ ] Motion contract dedicado autorado antes de mover `UI ready` a `yes`.

## Follow-ups

- Autorar `docs/ui/motion/TASK-1505-globe-creative-producer-surface-motion.md` (entrada de candidato, stagger
  del feed, progreso de generación, morph entre modalidades) como gate previo a `UI ready: yes`.
- Superficie cliente **fidelidad-curada** (sin operadores) cuando lo exija un cliente + ledger comercial
  `TASK-1468`.
- Sincronizar **projects durables** cuando aterrice la tenancy (`TASK-1465`).
- Alimentar `TASK-1474` (Workbench) con el chassis/primitivos validados aquí.

## Open Questions

- Naming exacto de la superficie ("Producer" vs "Studio" vs "Create") y su ruta interna (resolver con
  `info-architecture` en Slice 1).
- ¿El feed unificado cross-modal necesita su propio reader o compone los readers por modalidad? (resolver con
  `TASK-1498`/`TASK-1503`).
- Umbral de batch-of-N por modalidad (image 1–4; video/audio acotados por el fence — definir con `TASK-1502`).
- ¿El voice-preset picker consume un asset propio o el treatment registry de `TASK-1493`? (definir con
  `TASK-1504`).
