# TASK-1505 — Globe Creative Producer Surface Wireframe

## Meta

- Status: `approved target; contract ready for implementation slices`.
- Owner task: `TASK-1505`.
- Product Design asset: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`
- Visual direction mode: `source-led`
- Direction contract: `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`.
- Source integrity: SHA-256 `7d0d689b7daeb6e409ae01c1bf478d700ea09059e0f20f7da3c85a53bb10e93f`.
- Intended consumers: Globe internal Producer operators on desktop and mobile; implementation lives in the Globe sister runtime.
- Copy source: centralized Globe Producer copy module; ids in this wireframe are the normative namespace seed.
- Primitive decision: `extend` the Globe console/pattern registry; reuse shell/control/media/dialog foundations and register missing Producer patterns.
- UI ready target: `yes only after the source-led scenario, first-fold acceptance and dossier are real`.

The approved HTML is the complete product target, not a menu of optional ideas. Current backend coverage can
sequence delivery, but it cannot delete, demote or locally simulate an approved capability. Unsupported controls
remain discoverable with honest policy/runtime status and create a robust server-side contract dependency owned by
the applicable task.

## Desktop Target — 1440×1000

At desktop the source resolves as one continuous dark Producer Console, not a dashboard of independent cards. A
sticky translucent header carries Globe/Producer identity, the Image/Video/Audio tablist, available and reserved
credits, command palette, state tooling and tenant/account context. The first fold then uses a deliberate asymmetric
split: a stable `410–440 px` composer spine at left and a fluid unified library at right.

```text
┌ Globe. Producer ── [Imagen | Video | Audio] ── ✨ disponibles/reservados ─ ⌘K ─ tenant ┐
├── COMPOSER · stable control spine ──┬── UNIFIED LIBRARY · fluid evidence field ─┤
│ modality heading + prompt/history    │ collection · search · filter · sort · density · series  │
│ references + rights/weight/anchor   │ hero/current candidate                              │
│ suggestions + negative prompt       │                                                    │
│ style/mode + governed route/model   │ adaptive image/video/audio candidate feed           │
│ seed + modality output shape        │ honest run/review/provenance states                  │
│ estimate/budget explanation         │                                                    │
│ [ Generate · ✨N ]                 │                                                    │
└──────────────────────────────┴─ candidate viewer / compare / bulk / dialogs ──────────┘
```

The composer is the first decision surface and retains the only primary run CTA. The library is simultaneously
visible so generation never becomes a dead-end wizard. The hero candidate establishes continuity and scale; the
remaining masonry/adaptive field carries real density without card-on-card wallpaper. Viewer, compare, inpaint,
sharing, gated-capability and onboarding surfaces layer above the console and preserve trigger focus.

## Mobile Target — 390×844

Mobile deliberately recomposes the desktop target; it is not the `630 px` prototype squeezed into a viewport. The
header keeps product identity, modality, concise credit state and one labelled overflow. Tenant/account, budget
detail and accelerators move into focus-managed sheets. The composer is first in document order and immediately
usable; route, output shape, style and secondary controls become labelled disclosures/sheets while prompt,
references, estimate and the primary CTA remain obvious.

References stack/wrap vertically without losing rights, influence or anchor controls. The unified feed becomes one
column (or a deliberate two-column compact density only when each action remains touch-safe), with collection,
filter and sort in temporary surfaces. A sticky bottom command shows resolved route/status and `Generate · ✨N`;
it never obscures errors or the last feed item. Selection becomes a labelled bottom action surface. Candidate viewer,
compare and inpaint become full-height internal-scrolling dialogs with one sticky primary refinement action and an
overflow for secondary actions. All targets are at least 44 CSS px where touch is primary.

Hard acceptance: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `390 px` for
the base route and every overlay. The source defect (`630 > 390`) must be corrected without removing any control,
action, metadata or state.

## Action Hierarchy

1. **Primary creation action:** `Generate · ✨N` is the sole primary composer action. It is enabled only from a
   current server estimate, valid route/shape/reference contract, sufficient governed budget and authorized surface.
2. **Primary contextual actions:** once a candidate is opened, `Recreate` is the viewer primary; `Regenerate region`
   or `Remove and fill` is primary inside inpaint; `Copy link` is primary only inside the share dialog. Contextual
   primaries never compete with Generate in the base console.
3. **Secondary refinement and inspection:** open/preview, variation, upscale, before/after, zoom, inpaint, download
   and use-as-reference. Each expensive refinement receives a fresh estimate and confirmation boundary where needed.
4. **Secondary organization and review:** favorite, compare, collection move, export with recipe, approve, request
   changes, comments, read-only share, density, grouping, search, filters and sort.
5. **Tertiary/destructive:** cancel run, remove reference, revoke share and delete candidates. Delete always confirms
   scope and offers undo/recovery when the durable backend supports it; cancellation reports reservation settlement.
6. **Selection versus action:** card selection is an explicit checkbox/`aria-selected` operation, never the same hit
   target as opening the candidate. The bulk bar reports count and compatible actions; mixed-modality constraints are
   explained before execution.
7. **Pending/disabled:** a capability remains visible with its reason and request/access path. Disabled styling never
   stands alone; no browser-only timer, optimistic mutation or fake result is allowed.

## Visual Fidelity Mapping

| Approved source cue | Globe token / primitive / recipe mapping | Intent preserved | Literal implementation rejected |
|---|---|---|---|
| Midnight/abyss field with restrained blue aurora and one warm accent | Globe semantic canvas, backdrop and accent tokens on `ProducerConsole` | immersive creative workspace with strong foreground contrast | copied HEX values, full-page rainbow gradient or decorative particle noise |
| Sticky translucent product/modality band | existing Globe shell/header + accessible tablist + contextual popovers | one product with three persistent modalities and visible spend context | custom fixed header that hides tenant, labels or keyboard semantics |
| Asymmetric composer/library split | registered `ProducerConsole` recipe with stable composer spine and fluid feed | prompt-first hierarchy plus immediate continuity into outputs | equal card grid, centered form or three separate modality pages |
| Frosted, layered surfaces with hairline borders | named surface/elevation/border/radius tokens; one containment layer per region | depth and focus without heavy chrome | nested glass cards, arbitrary blur, shadow and radius literals |
| Azure primary gradient and orange credit/progress accents | semantic `action.primary`, `credit.available/reserved/spent`, warning and focus roles | primary action and cost state remain instantly legible | color-only meaning or orange used as a second global primary |
| Geist-like body + display emphasis, tabular numbers | Globe/AXIS body/display/numeric typography roles | compact operational density and trustworthy credit/seed values | importing prototype fonts or copying pixel font sizes/weights |
| Route tile shows curated route plus public model/version and constraint chips | governed `RoutePicker`/`ModelIdentity` pattern | model-real positioning and constraint transparency | provider slug, vendor cost, margin or internal house taxonomy in DOM |
| Reference thumbnails carry source, rights, influence and anchor | `ReferenceTray` + provenance badge + labelled range/anchor controls | media intelligence is visible before spend | decorative thumbnails or client-forgeable rights state |
| Hero candidate plus adaptive cross-modal feed | `GenerationFeed` with `CandidateCard` media variants and series grouping | one rich library for image/video/audio, not isolated galleries | uniform card wallpaper or fabricated media/progress |
| Hover elevation and revealed actions | named interactive surface motion; focus-within and touch always expose equivalents | responsive craft without hiding capability | hover-only actions, arbitrary transforms or missing reduced-motion state |
| Globe breathing generation mark and indeterminate shimmer | canonical run-state motion wrapper tied to attempt/state events | causality and branded waiting feedback | time-derived percentage, looping motion as the only status signal |
| Full candidate viewer with media stage + inspector | focus-managed `CandidateViewer` dialog/drawer, modality media primitives | inspect, trust, review and refine in one continuous surface | modal without inert background/focus restore or unconditional C2PA |
| Palette, onboarding, compare, inpaint and share overlays | canonical dialog/sheet/popover foundations with registered Producer patterns | approved accelerators and specialist tools remain part of the product | parallel client-only commands or overlays with alternate business logic |

## Modality composition

The prompt and reference spine stays stable while the mode-specific tray recomposes.

| Mode | Approved controls | Contract behavior |
|---|---|---|
| Image | negative prompt, style/preset, ratio, quality, count, seed lock, references, inpaint | only combinations supported by the selected route are enabled |
| Video | create/edit/motion, elements or frames, resolution, duration, ratio, audio mode, references/anchors | gated capabilities remain visible with honest availability copy |
| Audio | voiceover/change voice/translate, voice preset, source, target language, format, sample rate, speed, volume, pitch | durable presets and rights govern reuse; no browser-only registry |

Auto-route can recommend a route but must expose the resolved public model/route and actual execution route according to entitlement. Provider slug, vendor cost and margin never enter the DOM.

## Library, viewer and collaboration

### Unified feed

- One cross-modal collection of runs/candidates, not three isolated feeds.
- Search, modality/status filters, sort, compact/comfortable density, series grouping and collection scoping are first-class.
- Current output may occupy a hero slot, while the remaining feed uses adaptive cards.
- Cards expose selected, focused, generating, ready, failed, degraded, policy-blocked and review states.

### Candidate and bulk actions

- Candidate: preview/open, download, favorite, use as reference, recreate, variation, upscale and image inpaint.
- Selection: compare, favorite, download/export, use as reference, move to collection and guarded delete.
- The bulk action bar reflects selection count, supports keyboard selection and never leaves selection only as color.

### Candidate viewer

- Media stage: image zoom and before/after; video player; audio waveform/player.
- Inspector: recipe/prompt, negative prompt, model/route, modality shape, style, seed, estimate/settled credits, collection and source.
- Trust: verified provenance, lineage and audit events; C2PA appears only when backed by evidence.
- Review: approve, request changes and threaded comments.
- Refinement: recreate, variation strength, upscale and regional inpaint.

### Sharing and operator accelerators

- Read-only board share with explicit scope/expiry/revocation contract.
- Command palette, keyboard shortcuts and guided onboarding expose existing actions; they do not create alternate business logic.
- Tenant/workspace switch invalidates all scoped readers and selection before rendering the destination workspace.

## Copy Ledger

The ids below are normative seeds for the centralized Globe Producer copy module. Every runtime-visible string,
tooltip, dialog title, toast, `aria-label` and server error mapping must resolve through this namespace; the approved
prototype's inline strings are source evidence, not permission to hardcode them. Model, route, collection, tenant,
credit and capability names are bounded server values and are never interpolated as raw HTML.

| Copy id | Region | Approved visible copy / pattern | Dynamic values and contract notes |
|---|---|---|---|
| `producer.shell.product` | header | `Globe. / Producer` | product identity is stable across modalities |
| `producer.shell.modalities.*` | header tabs | `Imagen`, `Video`, `Audio` | selected state announced; arrow keys move focus |
| `producer.shell.credits.summary` | credit trigger | `{available} disp. · {reserved} reservados` | tabular, ledger-backed values only |
| `producer.shell.credits.title` | credit panel | `Créditos del run` | includes available/total, active reservations and spent legend |
| `producer.shell.credits.month` | credit panel | `Uso del mes · {used} / {budget}` | projection is labelled `Proyección`, never actual spend |
| `producer.shell.credits.project` | credit panel | `Proyecto · {projectName}` | near-limit copy: `Cerca del límite del proyecto` |
| `producer.shell.credits.fence` | credit panel | `El límite bloquea cualquier run que supere lo disponible, antes de gastar.` | replaces prototype jargon `fence` in user-facing copy |
| `producer.shell.commands.open` | header/palette | `Comandos (⌘K)` | Windows/Linux shortcut localizes to `Ctrl+K` |
| `producer.shell.tenant.switch` | account | `Cambiar espacio` | success: `Cambiaste a {tenantName}` after readers are invalidated/refetched |
| `producer.composer.eyebrow` | composer | `Composer` | persistent section landmark |
| `producer.composer.heading.*` | composer | `Genera una imagen`, `Genera un video`, `Genera audio` | one `h1`, changes with selected modality |
| `producer.composer.prompt.placeholder.*` | prompt | `Describe lo que quieres crear` / `Escribe el guion de la locución` | mode-aware; no promise of result quality |
| `producer.composer.enhance` | prompt | `Mejorar` / aria `Mejorar prompt con IA` | pending/success/failure copy required; never silently rewrites |
| `producer.composer.history` | prompt | `Prompts recientes` | empty: `Aún no hay prompts recientes` |
| `producer.composer.suggestions` | prompt | `Sugerencias` | examples are optional starters, not generated results |
| `producer.composer.negative.*` | prompt | `Excluir del resultado`, `Qué evitar: texto, marcas de agua, deformaciones…`, `Prompt negativo` | Image/Video only where route supports it |
| `producer.references.title` | reference tray | `Referencias · {acceptedKinds}` | counter `{count}/{max}` and route limit are server-derived |
| `producer.references.add.*` | reference tray | `Subir imagen`, `Subir video`, `Mencionar del feed` | upload and asset mention are separate governed commands |
| `producer.references.provenance.*` | reference inspector | `Origen`, `Hash`, `Derechos`, `Influencia`, `Anclar a zona` | hash may be safely abbreviated; full internal identifier is not exposed |
| `producer.references.rights.*` | reference inspector | `Derechos verificados`, `Derechos pendientes`, `Verificar derechos` | rights are attested, never toggleable local fiction |
| `producer.references.privacy` | reference tray | `Tus referencias permanecen dentro de este espacio y conservan sus derechos registrados.` | replaces implementation-specific `private-ingest` copy |
| `producer.style.title` | composer | `Estilo · preset` | `Ninguno` plus durable governed preset names |
| `producer.mode.video.*` | composer | `Crear`, `Editar`, `Movimiento`, `Elementos`, `Cuadros` | unsupported options remain visible with availability reason |
| `producer.mode.audio.*` | composer | `Locución`, `Cambiar voz`, `Traducir`, `Registro de voces` | voice rights/consent must precede enablement |
| `producer.route.title` | route picker | `Ruta` | selected route plus public `{modelName} {modelVersion}` and constraints |
| `producer.route.recommendation` | route picker | `Sugerido para tu prompt: {routeName} · {modelName}` | recommendation is applied only after user action |
| `producer.route.disclosure` | route picker | `Modelo real y límites de salida visibles. La superficie no expone datos internos del proveedor.` | no slug, vendor cost, margin or internal house taxonomy |
| `producer.seed.*` | composer | `Seed`, `Fijar`, `Fijado`, `Aleatorio en cada run · fíjalo para reproducir` | numeric value bounded by route contract |
| `producer.shape.image.*` | output tray | `Calidad`, `Proporción`, `Cantidad` | unsupported combinations state the selected route limit |
| `producer.shape.video.*` | output tray | `Resolución`, `Duración`, `Proporción`, `Con audio`, `Sin audio`, `Omni (video+audio)` | resolved against route catalog |
| `producer.shape.audio.*` | output tray | `Voz`, `Frecuencia`, `Formato`, `Velocidad`, `Volumen`, `Tono` | voice preset comes from durable registry, not local state |
| `producer.estimate.primary` | estimate rail | `Generar · ✨{estimatedCredits}` | estimate is current, expiring and server-authored |
| `producer.estimate.helper` | estimate rail | `Costo estimado antes de gastar · ruta × formato` | `¿Cómo se calcula el costo?` opens client-safe breakdown |
| `producer.estimate.breakdown` | estimate popover | `Base`, `Calidad`, `Cantidad`, `Resolución`, `Duración`, `Audio`, `Longitud del guion`, `Total estimado` | public credit factors only; no vendor economics |
| `producer.run.cancel` | active run | `Cancelar` | confirmation where work may already be billable; settlement returned by server |
| `producer.library.title` | feed | `Tus generaciones` | count: `{count} pieza(s)` |
| `producer.library.collection` | feed | `Colección: {collectionName}` / `Todo el feed` | collection is tenant-scoped |
| `producer.library.search` | feed | `Buscar en tus generaciones` | searches prompt, public route/model and safe metadata |
| `producer.library.filters.*` | feed | `Todas`, `Imagen`, `Video`, `Audio`, `Favoritos` | selected semantics and result count announced |
| `producer.library.sort.*` | feed | `Recientes`, `Mayor costo`, `Favoritos` | no hidden default mutation |
| `producer.library.density.*` | feed | `Vista cómoda`, `Vista compacta`, `Agrupar series` | presentation preference only |
| `producer.candidate.actions.*` | candidate | `Ver`, `Descargar`, `Favorito`, `Usar como referencia`, `Retoque regional`, `Recrear` | action availability comes from per-output capability contract |
| `producer.candidate.hero` | hero | `Destacada` | source/selection logic is deterministic and accessible |
| `producer.bulk.summary` | bulk bar | `{count} seleccionadas` | singular/plural localized |
| `producer.bulk.actions.*` | bulk bar | `Comparar`, `Marcar favoritas`, `Descargar`, `Usar como referencias`, `Mover a {collection}`, `Exportar con recipe.json`, `Eliminar` | compatibility and max compare count explained before action |
| `producer.viewer.sections.*` | viewer | `Ruta`, `Prompt`, `Recipe`, `Modelo`, `Estilo`, `Excluye`, `Formato`, `Seed`, `Costo`, `Colección`, `Procedencia`, `Bitácora` | estimate and settled credits are distinguished |
| `producer.viewer.provenance.*` | viewer | `Procedencia verificada`, `Sin evidencia de procedencia`, `Evidencia no disponible` | `C2PA firmado` only when verified evidence exists |
| `producer.viewer.review.*` | viewer | `Aprobar`, `Aprobada`, `Pedir cambios`, `Comentarios`, `Añade un comentario…` | identity/time and command result come from durable review contracts |
| `producer.viewer.refine.*` | viewer | `Variación`, `Sutil`, `Media`, `Fuerte`, `Variar`, `Recrear`, `Escalar`, `Retoque regional (inpaint)` | every expensive action refreshes estimate/budget authorization |
| `producer.inpaint.*` | inpaint | `Retoque regional`, `Pinta la zona a regenerar · el resto se conserva`, `Reemplazar`, `Añadir`, `Quitar`, `Regenerar zona`, `Quitar y rellenar` | mask upload and edit command are private/durable |
| `producer.review.share.*` | share | `Compartir board`, `Enlace de solo lectura`, `Copiar`, `Listo`, `Revocar enlace` | explicit scope, expiry and revocation status |
| `producer.capability.gated.*` | gated dialog | `Capacidad no habilitada`, `Las capacidades se habilitan por política de tu espacio. La superficie nunca las simula.`, `Entendido`, `Solicitar habilitación` | reason is sanitized and capability-specific |
| `producer.onboarding.*` | coach | `Una consola, tres modalidades`, `Describe tu idea`, `Rutas curadas, modelo real visible`, `Ves el costo antes de gastar`, `Saltar`, `Siguiente`, `Entendido` | teaches existing commands only |
| `producer.shortcuts.*` | keyboard help | `Atajos de teclado`, `Abrir comandos`, `Navegar el feed`, `Abrir candidato`, `Cerrar` | platform-specific keys and full keyboard parity |
| `producer.recovery.correlation` | errors | `Referencia de soporte: {correlationId}` | safe identifier only; never raw error or secret |

## State Copy

Every state below has stable placement, visible text and a bounded recovery. State transitions come from governed
readers/jobs/outbox events; browser timers may animate but never manufacture business state, progress, spend or
provenance.

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Candidato listo` | `La pieza está disponible en tu feed. Se usaron ✨{settledCredits}.` | `Ver candidato` | politely announce once; settled credits, provenance and review status are server-backed |
| loading | `Cargando Producer…` | `Estamos recuperando tu composer, presupuesto y generaciones.` | `Reintentar` after bounded timeout | stable composer/feed skeletons; preserve dimensions and do not blank the shell |
| empty | `Aún no has generado {mediaPlural}` | `Describe una idea o elige un ejemplo para crear tu primera pieza en este espacio.` | `Ir al prompt` | optional onboarding/examples; never a dead dashboard or fake asset |
| partial | `Parte de la información no está disponible` | `Puedes seguir viendo {availableScope}; {missingScope} no se pudo actualizar.` | `Volver a intentar` | label each stale/missing region; disable only mutations whose preconditions are unknown |
| error | `No pudimos completar {action}` | `{sanitizedReason}. Tu reserva quedó {reservationState}. Referencia: {correlationId}.` | `Reintentar` or `Volver al composer` | typed error; never raw provider/runtime text; preserve prompt and valid inputs |
| denied | `No tienes acceso a {capability}` | `Tu acceso actual no permite esta acción en {workspaceName}. No se realizó ningún gasto.` | `Solicitar acceso` or `Cambiar espacio` | fail closed; no hidden local bypass and no sensitive policy detail |
| estimating | `Calculando costo…` | `Validamos ruta, formato, referencias y presupuesto antes de gastar.` | `Cancelar cálculo` only if supported | prompt and unrelated controls remain usable; old estimate is marked stale |
| generating | `Generando · intento {attempt}` | `El run está en {runState}. Reservamos ✨{reservedCredits}.` | `Cancelar` when contract permits | indeterminate progress or discrete attempts only; never fabricated percentage |
| cancelled | `Generación cancelada` | `La reserva quedó {reservationState}. No aparecerá un candidato incompleto.` | `Volver a generar` | cancellation and credit settlement may complete asynchronously and must reconcile |
| degraded | `El candidato está disponible parcialmente` | `{availableMetadata} sigue visible; {missingEvidenceOrBytes} no está disponible ahora.` | `Recuperar archivo` / `Reintentar evidencia` | metadata is not presented as complete; no unconditional provenance badge |
| policy-blocked | `Capacidad no habilitada` | `{capabilityName} forma parte de Producer, pero aún no está habilitada para este espacio.` | `Solicitar habilitación` | control stays discoverable; backend contract/owner remains explicit, never simulated |
| budget-blocked | `Este run supera el límite disponible` | `Requiere ✨{estimate}; hay ✨{available}. Ajusta cantidad, duración, formato o ruta.` | `Ajustar configuración` / `Revisar presupuesto` | block occurs before spend; project/month scope is named |
| stale | `El costo debe actualizarse` | `La ruta, el formato, las referencias o el presupuesto cambiaron desde el último cálculo.` | `Recalcular costo` | Generate stays disabled until a current estimate is returned |
| offline | `Sin conexión` | `Conservamos tus cambios locales de presentación, pero no ejecutaremos acciones hasta reconectar.` | `Reintentar conexión` | no queued spend/mutation unless an explicit durable offline contract exists |
| validation | `Revisa la configuración` | `{fieldLabel} no es compatible con {routeName}: {safeConstraint}.` | `Ajustar automáticamente` when deterministic | focus first invalid control and retain all other input |
| rights-pending | `Falta verificar derechos` | `La referencia {assetName} no puede usarse hasta confirmar su procedencia y permisos.` | `Verificar derechos` / `Quitar referencia` | no client-forgeable verification |
| long-content | `Contenido completo disponible` | `Los valores largos se muestran resumidos; abre el detalle para leerlos completos.` | `Ver detalle` | visual truncation has accessible full value; wrapping must not create horizontal overflow |

## Accessibility Contract

- The document has a meaningful title and language.
- Modality/density/filter tabs expose names, `aria-selected` and roving tabindex with arrow-key navigation.
- Dialogs/viewers use correct dialog semantics, initial focus, focus trap, inert background, Escape policy and focus restoration.
- Card and bulk selection expose `aria-selected`/checkbox semantics and full keyboard parity.
- Async run, estimate, upload, review and share results use appropriate live regions.
- Icon-only actions have localized names and visible focus.
- Delete requires a confirmation dialog describing scope and an undo/recovery path when supported.
- Reduced motion preserves the same state meaning and does not rely on animation.
- Credit/budget graphics always expose the same available/reserved/spent values as text; media waveforms and
  thumbnails have modality-appropriate labels or are decorative when an adjacent text equivalent exists.
- Heading order is one modality-aware `h1`, then library `h2`, with dialog titles announced on entry. The document
  declares the correct language and a meaningful `Globe Producer` title.

## Implementation Mapping

| Region/pattern | Decision | Backend/read model dependency |
|---|---|---|
| Producer shell, header, tenant/project context | extend Globe Studio shell | human execution bridge + tenancy/project scope |
| Composer and modality trays | extend/register Globe Producer patterns | catalog, modality contract, prompt/recipe/reference contracts |
| Reference tray | new governed Producer pattern if absent | private ingest, rights, reference intelligence |
| Estimate/budget/priority rail | extend | estimate + credits/ledger/budget/reservation/readers |
| Unified feed and series | extend `GenerationFeed` | durable run/candidate feed and lineage readers |
| Candidate/bulk action bars | extend | governed asset, collection, export and deletion commands |
| Candidate viewer | extend focus-managed media surface | retrieval, recipe, provenance, lineage, review readers/commands |
| Inpaint editor | register specialized dialog pattern | image edit/inpaint command and mask upload contract |
| Share board | reuse/register share dialog + read-only route | scoped share command/reader, expiry/revoke/audit |
| Command palette/onboarding/shortcuts | reuse shell primitives | command registry and local presentation preference only |

API parity is mandatory for every business action. The browser may keep transient presentation state, but route selection, estimate, generate/cancel/retry, upload, favorites, references, collections, bulk operations, reviews, comments, share, budgets and tenant switching resolve through governed server-side contracts.

Capability gaps are implementation dependencies, not permission to narrow the approved surface:

| Approved capability family | Durable owner / dependency | UI behavior until runtime proof exists |
|---|---|---|
| Human BFF, grants and fail-closed `surface=ui` enforcement | `TASK-1519` | route/capability denied safely; never call the private API directly from the browser |
| Catalog, discriminated shape, estimate and base output retrieval/actions | `TASK-1500…TASK-1503` | consume canonical readers/commands and expose typed failures |
| Video/audio expansion, frames/motion, voice and multi-output | `TASK-1504` | controls remain visible as capability-specific `policy-blocked`; no fake output |
| Private ingest, rights and provenance/C2PA | `TASK-1467` | upload/use/provenance states are unavailable or degraded; C2PA never appears without evidence |
| Reservations, ledger and project/month budgets | `TASK-1468`, `TASK-1482` | generation blocks before spend when current estimate/budget proof is absent |
| Durable jobs, attempts, idempotency, cancel/retry/priority/reconciliation | `TASK-1469` | no timer-driven completion or percentage; show server lifecycle only |
| Recipes, prompt history, styles and reference intelligence | `TASK-1493`, `TASK-1494` | fixtures may prove the first fold but cannot be promoted as browser-only registries |
| Recreate, variation, inpaint and unified feed/lineage | `TASK-1496…TASK-1498` | read-only viewer remains useful; each missing action is honestly gated |
| Approval, comments, share/revoke and release boundary | `TASK-1472` | review/share affordances remain discoverable and denied/gated by granular capability |
| Durable tenancy/projects and scoped reader invalidation | `TASK-1511` | do not render destination data until old selection/readers are cleared and new scope resolves |
| Library projection, collections and bulk operations | `TASK-1520` | preserve complete feed/bulk target; unsupported mutations remain gated, not deleted |
| Commercial runtime enablement | `TASK-1521` | internal route only; no external/GA implication |

## GVC Scenario Plan

- Scenario file: `docs/ui/captures/scenarios/TASK-1505-globe-creative-producer-surface.json` (to create during implementation).
- Route: internal Producer route selected by Globe information architecture, expected `/producer` unless architecture records another path.
- Viewports: `1440×1000` and `390×844`.
- Quality profile: `premium`.
- Source baseline/surface ID: `globe.creative-producer-surface`; promote only after a faithful first-fold capture is accepted.
- Required journeys: image generation; video and audio mode recomposition; references/rights; budget-blocked generation; search/filter/collection; multi-select/bulk bar; candidate viewer/refinement; inpaint; review/comments; share; command palette; onboarding; tenant switch.
- Required states: loading, empty, estimating, generating, ready, failed, degraded, policy-blocked, budget-blocked, permission denied and long content.
- Required markers: `producer-console`, `producer-header`, `producer-budget`, `producer-modality-band`, `producer-composer`, `producer-reference-tray`, `producer-route`, `producer-output-shape`, `producer-estimate`, `producer-feed`, `producer-candidate`, `producer-bulk-bar`, `producer-candidate-viewer`, `producer-inpaint`, `producer-review`, `producer-share`, `producer-state-*`.
- Assertions: no provider slug/vendor cost/margin; progress and C2PA are evidence-backed; tab/dialog/selection semantics pass; destructive bulk action is guarded; viewer restores focus.
- Scroll checks: `scrollWidth <= clientWidth` for the document at both viewports and for every overlay open state.
- Reduced-motion/focus evidence: modality change, candidate entry, viewer, inpaint, share and onboarding.
- Review dossier: `docs/ui/captures/TASK-1505-globe-creative-producer-surface/<run>/review/`.
- Scorecard: `docs/ui/reviews/TASK-1505-globe-creative-producer-surface.scorecard.json` with premium thresholds from the direction contract.

## Design Decision Log

- Approved decision: the complete Claude Design HTML defines the Producer target. Feature removal requires a new explicit product decision; implementation phasing may gate capability but not erase it.
- The selected hierarchy is composer → unified library → candidate viewer/refinement → organization/review/share.
- Producer stays prompt-first even though it includes collaboration. Workbench remains brief-first; collaboration is not an exclusive Workbench concern.
- Reuse/extend/new: extend Globe's console and media patterns; create only specialized patterns absent from the registry, and register their anatomy/states/a11y/responsive contract before use.
- External literal styles are rejected as code; source fidelity is achieved with Globe/AXIS tokens and accessible primitives.
- Known source corrections: mobile overflow, missing dialog/tab/selection semantics, focus management, destructive confirmation, invented progress and unconditional C2PA.
- UI readiness remains `no` until the already-versioned source is verified, the implementation scenario exists,
  the first fold is explicitly accepted and the dossier proves desktop/mobile fidelity; approved direction alone
  does not prove runtime readiness.
