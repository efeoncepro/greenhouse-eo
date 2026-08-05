# EPIC-028 — Producer V3 Unified Studios Flow Contract

## Meta

- Status: design-ready; implementation remains gated by the owning task's UI readiness and GVC evidence.
- Owner task: EPIC-028; slices owned by TASK-1523, TASK-1552, TASK-1559, TASK-1633, TASK-1643, TASK-1567–1572 y TASK-1580–1583.
- Related wireframe: [Producer V3 wireframe](../wireframes/EPIC-028-producer-v3-unified-studios.md)
- Intended route / surface: Producer surface canónica vigente; Entry Hub, Project/Session, studios, Session Feed y Asset Workspace dentro del mismo shell.
- Flow type: multi-surface, cross-context, command-backed.
- Primary primitives: native Globe CompositionShell equivalent, AdaptiveSidecar, PreviewStage, ProducerViewer/MediaDock y existing feed.
- Copy source: src/lib/copy y src/config/greenhouse-nomenclature.ts.

## Flow brief

- Primary user: creador u operador con un proyecto/session activo.
- Entry moment: entra al Producer o abre un proyecto/session/asset existente.
- Successful outcome: genera un candidato, lo inspecciona y toma una acción gobernada de refine, compare, reuse, review o download.
- Primary decision/action: Generate en composer; luego abrir Workspace sin perder la session.
- Non-goals: rutas nuevas para cada studio, un composer por proveedor, segundo feed/viewer/library o aprobación implícita.

## Surfaces involved

| Surface | Role | Desktop | Mobile / compact | Primitive |
|---|---|---|---|---|
| Entry Hub | entry and resume | context + recent sessions + start | stacked context and start | CompositionShell equivalent |
| Project / Session | stable context | header/context band | compact disclosure | native context reader |
| Studio shell | mode and action | composer + stage + sidecar | focused column + drawer | shell recipe |
| Candidate Wall / Session Feed | choose and continue | contact sheet/filmstrip | touch filmstrip | existing feed/viewer |
| Asset Workspace | inspect and govern | in-flow sidecar or focused workspace | temporary drawer | AdaptiveSidecar + PreviewStage |
| MediaDock / timeline | playback | one active playback context | docked compact controls | existing media primitive |

## Flow map

1. Entry: abrir Producer, Entry Hub o un deep link existente.
2. Context: leer Project/Session y confirmar acceso; si falta contexto, mostrar recuperación, no datos ficticios.
3. Primary action: elegir Image, Video o Audio y completar el composer común.
4. Adaptation: leer RouteCreativeContractV1 y mostrar solo slots, combinations, controls y output shape declarados.
5. Estimate: solicitar la estimate existente y mostrar capacidad/estado; mantener la intención si falla.
6. Generate: ejecutar el command existente; comunicar pending sin inventar porcentaje o tiempo.
7. Completion: readback del candidate feed/asset; mostrar ready, partial, warning o error según fuente real.
8. Decision: abrir PreviewStage/Asset Workspace; compare, refine, reuse, review o download según access y rights.
9. Recovery/exit: conservar draft y focus; volver a Session Feed o Entry Hub sin duplicar viewer/library.

## Interaction triggers

| Trigger | Source | Target | Keyboard | Notes |
|---|---|---|---|---|
| Open session | Entry Hub / deep link | Session ready | Enter | usa reader existente |
| Change studio | Studio switcher | route-driven composer/stage | Arrow/Enter | cross-fade tokenizado; no morph de controles |
| Add reference | composer | reference tray | Enter | input, no advanced setting |
| Generate | primary rail | estimate/pending | Enter | comando existente; no client-side policy |
| Candidate select | Wall/feed | active PreviewStage | Enter/Space | seleccionar no aprueba |
| Open Workspace | stage/candidate | Asset Workspace | Enter | focus al heading |
| Open sidecar | context/action | AdaptiveSidecar | Enter | drawer en mobile |
| Compare | image candidate | Focus + Compare | Enter | solo lineage real |
| Play media | video/audio stage | single playback context | Space | aria status y pause |
| Review/Reuse/Download | Workspace | governed command/result | Enter | rights/access/state required |
| Close drawer/compare | close/Escape | previous surface | Escape | restore focus |

## State machine

| State | Meaning | Entry trigger | Exit trigger | UI requirement |
|---|---|---|---|---|
| entry-ready | Entry Hub usable | load | open/resume | no fake sessions |
| session-loading | context read pending | open session | ready/error | persistent status |
| session-ready | context confirmed | successful read | studio/exit | Project/Session visible |
| composer-ready | route controls loaded | contract read | dirty/generate | five blocks visible |
| dirty | input changed | prompt/reference/control | estimate/generate/exit | preserve draft; dirty exit warning |
| estimate-loading | estimate pending | request estimate | ready/error/stale | no fabricated cost |
| generation-pending | command accepted | Generate | readback/timeout/error | status text; no invented progress |
| candidate-partial | some derivative/metadata missing | readback | complete/retry | honest missing projection |
| candidate-ready | candidate readable | readback | inspect/action | candidate is not approval |
| asset-inspection | Workspace open | select/open | close/action | lineage/rights/provenance visible |
| warning/stale | action needs attention | policy/readback | resolve/refresh | action attenuated with reason |
| success | governed action completed | command readback | next action | explicit result and provenance |
| error | command/read failed | error | retry/back | retain intent; safe copy |
| denied | access/capability blocked | access check | back/change context | no internals |
| empty | no sessions/candidates | empty reader | create/open | helpful CTA |

## Routing contract

- Route changes: remain within the existing Producer/context routing contract; this design does not add canonical paths.
- Canonical URL: the existing Producer route plus existing project/session/asset addressing where the router already supports it.
- Deep-link: supported existing identifiers open the same session/workspace; missing or unauthorized identifiers resolve to explicit not found/denied states.
- Back button: closes drawer/compare first, then returns from Workspace to the candidate/session context, then to Entry Hub according to the existing router.
- Reload: re-reads context, contract and candidate state; dirty local draft may be restored only by the existing draft mechanism.
- Shareability: only existing governed asset/session links; never expose private provider metadata or raw internals.

## Focus and accessibility

- Initial focus: session heading on context load; composer prompt when a studio opens; Workspace heading when an asset opens.
- Escape: close topmost drawer/compare/overlay; no data loss without dirty confirmation.
- Click-away: closes non-modal sidecar only when no dirty edit or active command; modal review/confirm requires explicit action.
- Focus restore: to the trigger that opened the sidecar, compare, Workspace or media control.
- Semantics: sidecar drawer is dialog-like on mobile; in-flow on desktop; candidate selection is distinguishable from Generate/Review/Reuse.
- Announcements: studio change, estimate ready, generation pending, candidate ready/partial/error, playback state and rights restriction use a live status region.
- Keyboard traversal: context → studio → composer blocks → rail → stage → wall → workspace; arrow navigation only where the component declares it.
- Reduced motion: transitions become instant/static; state and focus changes remain.

## Data and command boundaries

- Readers: existing Project/Session/Element, Producer catalog, RouteCreativeContractV1, estimate, candidate/feed, asset identity, image compare, video derivatives, audio waveform/peaks, rights/provenance and review/reuse readers owned by the mapped tasks.
- Commands: existing prepare/generate, reference/recreate, compare/refine, review, reuse, favorite and download commands only when the relevant task and access contract expose them.
- API routes: none added by this design.
- Optimistic updates: do not claim generation or approval before readback. UI may show local dirty state and pending command status only.
- Cache/invalidation: follow existing reader invalidation; after generate/refine/review/reuse re-read the authoritative candidate/asset state.
- Audit/signals: preserve existing run, revision, lineage, rights and action evidence.
- Tenant/access: server-authoritative views, entitlements, capabilities and rights; revoked/expired access never grants action.

## Failure paths

| Failure | User-facing behavior | Recovery |
|---|---|---|
| denied | explicar que el workspace no permite la acción | volver al contexto o elegir una capacidad permitida |
| not found/empty | estado claro, sin placeholder completo | abrir Entry Hub o crear primera session |
| partial/degraded | mostrar lo que existe y qué falta | reintentar solo la proyección faltante |
| stale data | indicar que la vista puede estar desactualizada | refresh antes de reutilizar/revisar |
| timeout/API error | conservar prompt/references y explicar que no se confirmó | reintentar o ver estado existente |
| dirty exit | advertir pérdida de cambios | cancelar salida o confirmar descarte |
| rights_unverified | bloquear delivery/release y mostrar evidencia faltante | solicitar revisión/evidencia; no promover |
| playback unavailable | mantener metadata y estado sin inventar media | reintentar reader o volver al wall |

## GVC scenario plan

- Scenarios: producer-v3-entry-flow, producer-v3-image-flow, producer-v3-video-flow, producer-v3-audio-flow, producer-v3-review-reuse-flow, producer-v3-mobile-flow, producer-v3-reduced-motion-flow.
- Routes: existing Producer route and supported existing context links; no new route implied.
- Viewports: 1440×1000 and 390×844.
- Required sequence: Entry → Session → studio → five-block composer → estimate → Generate → pending → readback → Candidate Wall → PreviewStage → Workspace → governed action.
- Captures: ready, loading, partial, warning/stale, error, denied, success; drawer open/close; playback; compare; rights/provenance.
- Markers: producer-composer, prompt-bar, route, output-shape, estimate, generate-primary, candidate-wall, preview-stage, asset-workspace.
- Assertions: scrollWidth equals clientWidth; keyboard/focus restore; reduced motion; no provider/model slug branch; no hover-only; no fake derivative/progress/rights.

## Design decision log

- Decision: one shell and one continuity loop; studios are route-contract-driven modes.
- Rejected: tres apps aisladas, composer genérico y segundo feed/viewer/library.
- Reuse: existing Producer surface, feed/viewer, MediaDock, native commands/readers.
- Extend: PreviewStage, AdaptiveSidecar, Candidate Wall and Asset Workspace.
- New primitive: none foundational; registry gap becomes a separately owned task.

## Acceptance checklist

- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, Escape, restore focus and dirty exit are explicit.
- [ ] Deep link/back/reload behavior does not invent routes.
- [ ] Readers/commands are named by existing domain ownership.
- [ ] Failure paths are honest and user-safe.
- [ ] GVC sequence proves the flow, not only static screens.
