# EPIC-028 — Producer V3 Unified Studios Wireframe

## Meta

- Status: design-ready (implementation remains gated by the owning task's UI readiness and GVC evidence; runtime rollout pending).
- Owner: EPIC-028; implementation slices remain owned by the mapped TASKs.
- Product Design asset: [visual direction](../visual-directions/EPIC-028-producer-v3-unified-studios.md)
- Visual direction mode: repo-native-benchmark.
- Intended consumers: Globe Producer, Entry Hub, Project/Session, Image Studio, Video Studio, Audio Studio, Candidate Wall/Session Feed y Asset Workspace.
- Copy source: src/lib/copy y src/config/greenhouse-nomenclature.ts.
- Primitive decision: reuse native Globe shell/viewer/feed/docks; extend sidecar/stage; no new foundational primitive.
- UI ready target: no until each owning task declares its implementation mapping, GVC dossier, decision log and passes the readiness gate.

## Brief

- Primary user: creador u operador que quiere generar, evaluar y llevar un output gobernado a reutilización o revisión.
- User moment: está dentro de un proyecto y necesita pasar de intención a una decisión visual/audible concreta.
- Job to be done: crear una familia de candidatos sin perder contexto, coste, inputs, lineage ni derechos.
- Primary decision signal: qué candidato merece inspección, refinamiento, compare, reuse o review.
- Non-goals: tres aplicaciones, editor DAW, editor de video completo, segundo feed/viewer/library y contrato server-side nuevo.

## Desktop target — 1440×1000

1. Header/context band: Globe, workspace, Project y Session; estado de sesión y salida.
2. Studio switcher: Image, Video y Audio como modos del mismo shell; el modo seleccionado es textual y visible.
3. Main lead: composer arriba/centro y PreviewStage debajo; el prompt permanece visible mientras el usuario juzga.
4. Context rail: AdaptiveSidecar con estimate, route capabilities, session inputs, rights/provenance o asset details según el foco.
5. Candidate Wall / Session Feed: filmstrip/contact sheet debajo o al lado del stage, siempre dentro del mismo feed/viewer.
6. Action rail: Generate como primary; Review, Compare, Reuse, Download y Favorite solo cuando el comando y el estado lo permitan.

La jerarquía es contexto → intención → estimate/action → stage → candidatos → workspace. El composer no ocupa todo el viewport y el wall no compite con el candidato activo.

## Mobile target — 390×844

- El header conserva Project/Session y studio activo; el resto del contexto se compacta en un disclosure accesible.
- Composer se convierte en una columna breve; el rail de estimate/Generate queda próximo al último bloque y permanece alcanzable.
- PreviewStage viene antes del filmstrip; el Candidate Wall se transforma en filmstrip táctil con labels y estados.
- AdaptiveSidecar es drawer temporal con initial focus, Escape y restore focus; no hay sidecar fijo ni scroll horizontal.
- Video muestra stage/poster/timeline sin autoplay masivo; Audio muestra Sonic Canvas y AudioDock; Image muestra Focus/Compare.

## Action hierarchy

- Primary: Generate; dentro de Workspace, la acción primaria depende del estado: Review, Reuse o Download gobernado.
- Secondary: Add reference, Adjust, Compare, Open Workspace, View lineage.
- Destructive: Remove reference, discard candidate o salir de cambios dirty; siempre con confirmación y recovery cuando aplique.
- Selection vs action: seleccionar un candidato no lo aprueba; Review/Reuse/Download son acciones separadas y gobernadas.
- Pending/disabled: Generate muestra estimate y motivo de bloqueo; no usa spinner sin explicación ni promete finalización.

## Layout skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header/context | Project, Session, access, exit | native CompositionShell header adapter | TASK-1580 / existing session reader |
| 1 | Studio switcher | Cambiar Image/Video/Audio sin salir del shell | native mode switcher | RouteCreativeContractV1 |
| 2 | Composer lead | Cinco bloques de intención y output shape | Producer composer / TASK-1552 | catalog, route descriptor, existing prompt contracts |
| 3 | PreviewStage | Juicio del output activo | extended ProducerViewer / media stage | image/video/audio derivative readers |
| 4 | AdaptiveSidecar | Estimate, controls, context, rights o review | native sidecar adapter | contract, estimate, Asset Governance readers |
| 5 | Candidate Wall / Session Feed | Selección y continuidad | existing feed/viewer extension | TASK-1559, TASK-1581 |
| 6 | Asset Workspace | lineage, compare, provenance, reuse/review | contextual workspace extension | TASK-1582 / TASK-1583 |
| 7 | Action rail | Generate o acción gobernada | existing action rail | existing commands and access |

## Composer común de cinco bloques

| Bloque | Siempre visible | Adaptación por RouteCreativeContractV1 | Prohibido |
|---|---|---|---|
| 1. Qué quieres crear | Prompt, propuesta/mejora e historial/dock | operation y copy de intención | formulario separado por proveedor |
| 2. De qué partes | References y roles de input | inputSlots e inputCombinations | esconder referencias en Advanced |
| 3. Cómo se ve | Direction y controles creativos | creativeControls declarados | provider/model slug branch |
| 4. En qué formato sale | Output shape | outputContract: ratio, duración, resolución, formato, finish, count si aplica | controles ajenos al medio |
| 5. Rail fijo | Estimate, capacidad/crédito, estado y Generate | availability, estimate y policy existentes | cálculo client-side de coste/policy |

La UI lee el descriptor browser-safe; catálogo, policy, estimate, provenance, prepare/generate y capacidades siguen server-authoritative.

## Studio specifications

| Studio | Composer controls | Stage | Wall / Workspace |
|---|---|---|---|
| Image | prompt, references, direction, quality/count/ratio/finish según contrato | still, zoom, Focus + Compare | contact sheet; compare solo con lineage real; regional edit gobernada |
| Video | prompt, frames/inputs declarados, motion/elements/duration/ratio/resolution/audio según contrato | poster/video hero, playback, timeline, MediaDock | poster/preview/duration/dimensions/audio presence reales; no autoplay wall |
| Audio | script/voice/inputs declarados, duration/format y controls declarados | Sonic Canvas, waveform/peaks reales, AudioDock de reproducción única | estado real de playback, duración/formato, provenance; no camera controls |

## State copy

| State | Title | Body | CTA / recovery |
|---|---|---|---|
| ready | Listo para crear | Revisa la intención, los inputs y el formato antes de generar. | Generar |
| loading | Preparando tu creación | Estamos leyendo capacidades y preparando la solicitud. | Espera; cancelar si el comando existente lo permite |
| empty | Aún no hay candidatos | Genera una primera versión para verla aquí. | Generar |
| partial | Hay información pendiente | El resultado está disponible, pero falta una proyección o revisión. | Ver estado / Reintentar lo pendiente |
| stale | Esta vista puede estar desactualizada | Actualiza antes de reutilizar o revisar este asset. | Actualizar |
| warning | Revisa antes de continuar | Hay una restricción de formato, derechos o capacidad. | Ver detalle |
| success | Candidato disponible | Ya puedes inspeccionarlo; esto no equivale a aprobación comercial. | Abrir Workspace |
| error | No se pudo completar | Conservamos tu intención. Revisa el detalle y vuelve a intentar. | Reintentar / Ver estado |
| denied | No tienes acceso | Tu workspace no permite esta acción. | Volver al contexto |
| unavailable | Esta capacidad no está disponible | La ruta no declara este control o está temporalmente restringida. | Elegir otra capacidad |

## Copy and accessibility

- Heading order: un h1 para Producer/session; h2 para studio, composer, stage, wall y workspace; headings de card solo si agrupan contenido.
- Aria: nombrar el studio activo, el bloque del composer, el candidato seleccionado, el estado de generación, el control de playback y el drawer.
- Keyboard: Tab recorre contexto → studio → cinco bloques → rail → stage → wall → sidecar; Enter activa; Space playback/selection; Arrow keys navegan wall/timeline cuando corresponda; Escape cierra drawer/compare y restaura foco.
- Focus: focus visible y no dependiente de color; tras Generate se anuncia el estado; al abrir Workspace el foco va al heading; al cerrar vuelve al trigger.
- Media alternatives: poster/preview tienen nombre y estado; waveform tiene resumen textual de duración/estado; compare identifica original/variant; no se requiere percibir motion para entender la acción.
- Mobile/touch: targets del sistema no menores al token canónico; no hover-only; labels persisten para actions críticas.
- Reduced motion: instantáneo o fade tokenizado, sin perder selección, loading, error ni playback.

## Rights / provenance

Asset Workspace muestra únicamente datos entregados por los readers gobernados: asset identity, lineage, run/revision, hashes, C2PA/content credentials cuando existan, rights state, restrictions y release state. rights_unverified permanece bloqueado para delivery; proof-only no se presenta como comercial; Review humano y evidencia preceden delivery. La UI no infiere derechos por apariencia, filename, provider o model.

## Implementation mapping

| Slice | UI responsibility in this wireframe |
|---|---|
| TASK-1523 | IA, loop unificado, Entry Hub → Session → Generate → Workspace → Review/Reuse |
| TASK-1633 | consumidor del RouteCreativeContractV1 browser-safe; sin provider/model slug |
| TASK-1552 | composer prompt-first de cinco bloques, estimate, Generate, states y GVC markers |
| TASK-1643 | continuidad Feed → Composer y acciones Reference/Recreate/Favorite/Download gobernadas |
| TASK-1559 | feed/viewer base, selección de candidato, open/close y continuidad de asset |
| TASK-1567 | reader real de waveform/peaks/duración para Audio Studio |
| TASK-1568 | Sonic Canvas, AudioDock y reproducción única |
| TASK-1569 | reader real de poster/preview/duración/dimensiones/audio presence |
| TASK-1570 | Cinematic Canvas, video hero, timeline y MediaDock |
| TASK-1571 | Image Focus + Compare Canvas y keyboard/reduced motion |
| TASK-1572 | edición regional dentro de Focus Canvas; mask/rights/lineage gobernados |
| TASK-1580 | Project/Session/Element context contract |
| TASK-1581 | Entry Hub y Session Feed |
| TASK-1582 | Asset Workspace y contextual reuse |
| TASK-1583 | Review → Element y governed reuse; review no equivale a approval |

## GVC scenario plan

- Quality profile: premium.
- Scenarios: producer-v3-entry, producer-v3-image, producer-v3-video, producer-v3-audio, producer-v3-asset-workspace, producer-v3-mobile, producer-v3-reduced-motion.
- Required captures: desktop first fold 1440×1000, mobile 390×844, ready/loading/partial/error/success/denied, open/close sidecar, Candidate Wall, each media stage y rights/provenance.
- Markers: producer-composer, prompt-bar, reference-tray, route, output-shape, estimate, generate-primary, candidate-wall, preview-stage, asset-workspace.
- Assertions: scrollWidth equals clientWidth; no provider/model slug in DOM; focus restore; no hover-only action; real derivative/readback state; reduced motion keeps meaning; rights badges are not inferred.

## Design decision log

- Decision: un shell, tres studios, un feed/viewer y un workspace contextual.
- Rejected: tres apps aisladas; composer genérico; segundo feed/viewer/library.
- Reuse: native Globe shell, feed/viewer, docks, tokens y commands.
- Extend: stage, sidecar, viewer, candidate cards y action rail.
- New primitive: ninguno fundacional; cualquier wrapper faltante requiere registry lookup y task separada.

## Acceptance checklist

- [ ] Dirección visual, desktop/mobile y responsive transformation están enlazados.
- [ ] Los cinco bloques del composer y RouteCreativeContractV1 están explícitos.
- [ ] Image, Video y Audio tienen stage, datos y controles propios.
- [ ] Estados, copy, keyboard, reduced motion y rights/provenance están definidos.
- [ ] No se inventan endpoints, schemas, progress o derechos.
- [ ] Mapping y GVC premium scenarios están listos para implementación.
