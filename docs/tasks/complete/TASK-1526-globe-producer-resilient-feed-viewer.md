# TASK-1526 — Globe Producer Resilient Feed and Viewer

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1526-globe-producer-resilient-feed-viewer.md`
- Flow: `docs/ui/flows/TASK-1526-globe-producer-resilient-feed-viewer-flow.md`
- Motion: `docs/ui/motion/TASK-1526-globe-producer-resilient-feed-viewer-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Cerrada con controles robustos: reconciliador keyed, retención de previews por universo, query debounce/supersession, continuidad de foco/media y títulos client-safe.`
- Rank: `TBD`
- Domain: `creative|ui|reliability`
- Blocked by: `none`
- Branch: `develop` (gobernanza Greenhouse) + `efeonce-globe/main` (runtime)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplazar la barra global efímera del Producer por cards de generación integradas al feed, recuperables y
concurrentes, y endurecer preview/viewer, selección, títulos y reautenticación. La UI será un thin client de la
proyección de `TASK-1525`: cada run nace en su futura posición, converge in-place al asset y conserva contexto
ante reload, sesión expirada o degradación parcial.

**Corrección de aceptación 2026-07-23.** El cierre anterior no pudo validar completamente el contrato de feed estable;
la corrección quedó cerrada con `eac1730` y `7ac0ded` y verifica:
- reconciliación keyed por `feedItemSignature` sin reconstruir el subtree completo,
- caché de previews preservada por snapshot/entidad (no sólo subconjunto visible),
- debounce + supersession de búsqueda/filtro (respuesta stale descartada),
- continuidad de selección/foco y continuidad de media en operaciones de refresh/filtro/búsqueda/orden.

## Why This Task Exists

`projectRunState()` usa un único `[data-capture="producer-state-generating"]`; `renderFeed()` vuelve a insertar
el grid delante y empuja la barra al final. El browser no observa nuevos estados y múltiples runs se pisan.
Además, seleccionar reconstruye todas las cards y vuelve a recuperar previews; cuando retrieval falla queda un
elemento media sin `src`, cuyo alt enorme parece contenido roto. El viewer convierte una sesión expirada en
“sin acceso”, y el título siempre cae en “Candidato sin recipe publicada” porque Library descarta metadata de
display. Son fallas de proyección y estado, no simples detalles de CSS.

## Goal

- Integrar `active-run` como card keyed, concurrente y recuperable dentro del feed.
- Actualizar/morfear sólo el item afectado; selección nunca reconstruye ni refetcha el grid.
- Separar estados de preview, permisos, sesión y asset inexistente con recovery correcto.
- Mostrar título client-safe y validar imagen, video y audio visibles, reproducibles y descargables.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

Reglas obligatorias:

- Consumir sólo el reader/DTO de `TASK-1525`; no hacer joins, inferir progreso ni guardar authority en storage.
- Una sesión expirada pausa observación y ofrece reautenticación visible; nunca reejecuta generación.
- `Blob` URL tiene lifecycle por card y se revoca al reemplazar/remover; no se reconstruye todo el feed.
- Estado visual y accesible no depende de color, hover o alt como fallback de layout.
- Globe conserva su design system propio; Greenhouse gobierna el contrato y la evidencia, no su estética.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/to-do/TASK-1523-globe-creative-suite-experience-logic.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-globe/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1525` — proyección live server-authoritative complete internal-only; smoke humano same-tab `200` con
  10 items reales image/audio/video. Esta task posee el consumer UI/UX: cards keyed, viewer, reauth visible y
  comparación contra la UI aprobada.
- `TASK-1505` — surface, controller y GVC existentes.
- `TASK-1519` — BFF/session recovery.
- `TASK-1503` — retrieval/download gobernados.

### Blocks / Impacts

- Entrega evidencia de feed/viewer a `TASK-1521`; no habilita commercial.
- Informa el running-state pattern de `TASK-1523` sin reabrir su IA.

### Files owned

- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-client.ts`
- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- tests y scenario GVC del Producer
- copy visible centralizado en el módulo Globe correspondiente
- artifacts UI declarados en esta task

## Current Repo State

### Already exists

- Cards de candidato, overlay de generación y viewer/inspector.
- `client.refreshRun()` y readers gobernados existen, pero el controller no los coordina.
- GVC fixture/scenario y estados de sesión base existen.

### Gap

- La barra singleton y los estados base quedaron resueltos en `eac1730`.
- El feed ahora conserva identidad por elemento y mantiene continuidad de layout/media bajo refresh, filtros,
  búsqueda y orden.
- La retención de preview y la política de cache ya consideran universo/reintento seguro sin retrigger de retrieval
  al ocultar/reexponer cards.
- La búsqueda quedó con debounce + secuencia para evitar respuestas stale.
- La continuidad de hover/focus y animación de entrada quedó limitada a nodos nuevos, preservando estado visual
  del resto.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web/src Producer`
- Future candidate home: `ui-package`
- Boundary: consumer UI de `UnifiedProducerFeedItemV1` y commands/readers gobernados existentes
- Server/browser split: browser sólo proyecta DTO y blobs temporales; auth/store/provider permanecen server-side
- Build impact: `none`
- Extraction blocker: shell/session/BFF y design system propios de Globe

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: creativo u operador con workspace y capability Producer.
- Momento del flujo: desde confirmar gasto hasta observar, revisar y descargar el candidato.
- Resultado perceptible esperado: la futura pieza aparece inmediatamente en el feed y progresa con verdad.
- Friccion que debe reducir: barra perdida, estado infinito, cards rotas y errores de acceso ambiguos.
- No-goals UX: porcentaje inventado, feed chat, modal de espera, toast como única verdad o auto-retry con gasto.

### Surface & system decision

- Surface: `/producer`, feed y viewer/inspector.
- Composition Shell: `no aplica` — Globe posee shell propio.
- Primitive decision: `extend` — candidate card adquiere variantes `active|terminal|asset|degraded`.
- Adaptive density / The Seam: `aplica` — una identidad cambia de densidad sin duplicarse.
- Floating/Sidecar/Dialog decision: viewer/inspector existente; reauth visible en contexto, sin modal nuevo.
- Copy source: `módulo copy centralizado de Globe`
- Access impact: `entitlements|startup policy`

### State inventory

- Default: assets y runs ordenados por servidor con selección estable.
- Loading: skeleton dentro de la card exacta; feed existente no desaparece.
- Empty: composer como acción primaria; sin barra global.
- Error: fallo terminal local con recovery permitido por capability.
- Degraded / partial: preview puede fallar sin borrar metadata/acciones seguras.
- Permission denied: mensaje de permiso sólo después de sesión válida.
- Long content: título acotado visualmente y completo accesible.
- Mobile / compact: una columna; active card conserva estado/acciones esenciales.
- Keyboard / focus: selección, viewer, retry y reauth operables; morph conserva foco por key.
- Reduced motion: reemplazo directo de estado; ningún pulse indispensable.

### Interaction contract

- Primary interaction: observar/select/open la card exacta mientras converge.
- Hover / focus / active: selección persistente y equivalente teclado/touch.
- Pending / disabled: acciones que requieren asset quedan explicadas, no falsamente activas.
- Escape / click-away: viewer cierra y restaura foco a la card keyed.
- Focus restore: card por `runId|experimentId`, o heading del feed si ya no existe.
- Latency feedback: coarse state server-side + timestamp de última actualización; sin porcentaje temporal.
- Toast / alert behavior: complementario; el estado durable vive en la card.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: incidental y tokenizado; no es parte del significado.
- Layout morph: `none` — actualización keyed directa para preservar foco y reduced motion.
- Stagger: `none`
- Timing / easing token: tokens Globe existentes.
- Reduced-motion fallback: cambio directo idéntico.
- Non-goal motion: pulse infinito, fake progress, reordenamiento animado o celebraciones.

### Implementation mapping

- Route / surface: `/producer`
- Primitive / variant / kind: extender `producer-candidate-card` con lifecycle variants.
- Component candidates: keyed feed reconciler, card media boundary, session recovery state, viewer.
- Copy source: módulo copy Globe; retirar fallback visible repetido.
- Data reader / command: `TASK-1525` live feed + output preview/download + session refresh.
- API parity: UI sin business logic; cancel/retry/download siguen commands/readers gobernados.
- Access / capability: workspace + run/library/output capabilities; reauth no eleva permisos.
- States to implement: active, reconciling, ready, failed, cancelled, timed_out, preview-loading/error,
  reauth-required, permission-denied y not-found.

### GVC scenario plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` y scenario live Producer.
- Route: `/producer`
- Viewports: `1440×1000`, `390×844`
- Quality profile: `premium`
- Required steps: generar dos runs; seleccionar; abrir viewer; expirar/renovar sesión; terminalizar.
- Required captures: dos active cards, morph a asset, preview error local, reauth y viewer por modalidad.
- Required `data-capture` markers: `producer-feed`, `producer-run-card`, `producer-candidate-media`,
  `producer-viewer`, `producer-reauth-required`.
- Assertions: identidad/nodo estable, sin subtree replacement, un preview request por asset, foco preservado.
- Scroll-width checks: documento, grid, viewer e inspector.
- Reduced-motion / focus evidence: morph directo, viewer close y reauth return.
- Review dossier: `docs/ui/captures/TASK-1526-globe-producer-resilient-feed-viewer/<run>/review/`
- Baseline decision / surface ID: `globe.producer.feed-resilience`

### Design decision log

- Decision: inline lifecycle card dentro del mismo feed.
- Alternatives considered: barra global, modal de espera y toast-only.
- Why this pattern: identidad visible, concurrencia, recuperación y terminalización sin perder contexto.
- Reuse / extend / new primitive: `extend` candidate card; promoción a registry se decide con `TASK-1485`.
- Open risks: orden server-side durante morph y recuperación de cursor tras sesión larga.

### Visual verification

- GVC scenario: Producer live + fixture determinístico.
- Viewports: `1440×1000`, `390×844`.
- Required captures: active×2, ready, failure, preview degraded, viewer y reauth.
- Required `data-capture` markers: los del scenario plan.
- Scroll-width check: `scrollWidth === clientWidth`.
- Accessibility/focus checks: live regions localizadas, buttons nombrados, dialog focus trap/restore.
- Before/after evidence: barra global inferior vs cards inline convergentes.
- Known visual debt: derivados/posters/waveforms pertenecen a la arquitectura media de `TASK-1521`.
- Visual scorecard: `docs/ui/reviews/TASK-1526-globe-producer-resilient-feed-viewer.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task. -->

## Active Execution Log

### 2026-07-23 — Reapertura correctiva por evidencia humana

- Auditoría del source aprobado
  `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html` contra el runtime `eac1730` y el HTML original
  conservado por el operador en `Documents/Globe/Producer`.
- Evidencia en la pestaña Chrome existente/autenticada del CEO:
  - Todas → Video dejó 12 cards visibles antes de converger a 3 aproximadamente 5 s después;
  - Video → Todas retiró una imagen ya cargada, la repuso aproximadamente 2,2 s después y cambió su `blob:` URL;
  - no se abrió otra sesión/perfil y no se accionó descarga.
- Causa raíz verificada en código:
  - `renderFeed()` remueve `[data-producer-runtime-feed]` y vuelve a crear todas las cards;
  - `releaseCardPreviewCache(retainedPreviewKeys(items))` conserva sólo las keys filtradas;
  - búsqueda dispara refresh remoto por cada `input`, sin debounce ni descarte de respuestas stale;
  - `candidate-enter ... both` puede conservar el transform de entrada y competir con hover.
- Ownership:
  - esta corrección de reconciliación keyed, cache/query y continuidad interactiva permanece en `TASK-1526`;
  - la paridad funcional/visual completa del baseline aprobado permanece en `TASK-1505`;
  - thumbnails/posters/transcodes/waveforms y Range real permanecen en `TASK-1528`;
  - promoción al registry reusable de Globe permanece en `TASK-1485`, después de estabilizar un segundo consumer.
- ADR resolution: ADR-005 ya gobierna el target aprobado y ADR-008 gobierna derivados/serving. Esta corrección
  no cambia source of truth, schema, auth ni API pública; no requiere un ADR nuevo.
- Checkpoint P0/Alto: el operador confirmó “primero documenta y luego ejecuta” el 2026-07-23.

### 2026-07-23 — Implementación, follow-up de causa raíz, deploy y smoke humano complete

- Greenhouse lifecycle tomado en `develop` por instrucción del operador; sin branch nueva.
- Subagentes autorizados por el operador; ejecución consolidada con ownership separado y revisión del agente raíz.
- `efeonce-globe` commit inicial: `2b7842c` (`fix(studio): harden producer feed previews`), pushed to `main`.
- Follow-up de causa raíz: `eac1730` (`Fix Producer feed live convergence and titles`), pushed to `main`.
  - El smoke de `2b7842c` confirmó cards/viewer, pero detectó un gap de aceptación: tras el ACK de generate,
    la UI hacía un refresh inmediato y podía quedar mostrando `queued/running` hasta reload manual aunque el Worker
    ya hubiera terminalizado.
  - La causa raíz de los títulos repetidos era contractual: las proyecciones públicas no incluían `displayTitle`
    humano/client-safe, por lo que `recipeLabel()` caía siempre al fallback `Candidato sin recipe publicada`.
  - `eac1730` agrega `displayTitle` bounded en contratos, dominio, reader live y store SQL read-only, y añade un
    watcher acotado del feed sólo mientras existan active runs reclaimable en UI.
- Implementado:
  - active runs proyectados como cards inline `data-capture="producer-run-card"` sobre la card existente, sin la barra singleton `producer-state-generating`;
  - preview boundary por card: placeholder local, cache/revocación por `(experimentId, sha256)`, error local y defensa contra `img` sin `src`;
  - selección keyed sin `renderFeed(state.feed)`, sin reconstruir cards ni refetchear previews sanos;
  - títulos con preferencia por `displayTitle` client-safe, proyectado desde prompt/brief/effective prompt acotado;
    viewer y cards ya no usan UUID en el alt/texto visible de imagen;
  - watcher `setTimeout` acotado por workspace/feed para refrescar active runs hasta terminalización, sin fake
    progress, `setInterval`, storage local ni reload manual;
  - tests source-level para bloquear regresiones de alt UUID, media boundary, selección sin rebuild y run card inline.
- Validación local:
  - `pnpm --filter @efeonce-globe/studio-web test -- --runInBand` → pass, 212 tests.
  - `pnpm check` en `efeonce-globe` → pass.
  - `pnpm build` en `efeonce-globe` → pass.
  - `git diff --check` en `efeonce-globe` → pass.
  - `pnpm task:lint --task TASK-1526` → pass.
  - `pnpm ui:wireframe-check --task TASK-1526` → pass.
  - `pnpm ui:flow-check --task TASK-1526` → pass.
  - `pnpm ops:lint --changed` → pass.
  - GitHub CI Globe inicial `30033901850` → success.
  - GitHub CI Globe follow-up `30036793089` → success.
  - Deploy Internal Studio inicial `30034066828` → success, revision `globe-studio-internal-00058-trh`.
  - Deploy Internal API inicial `30034064610` → success, revision `globe-api-internal-00057-n6f`.
  - Deploy Internal API follow-up `30036836510` → success, revision `globe-api-internal-00058-hqx`.
  - Deploy Internal Studio follow-up `30036838868` → success, revision `globe-studio-internal-00059-2db`.
  - Nota operativa: los runs `30036800428`/`30036802712` fallaron antes de build por `target_sha` corto; se
    relanzaron con SHA completo `eac1730a898b817a6202b5ae309fb60dfce0062a` y pasaron.
  - Greenhouse Task Contract `30034041743` → success.
  - Greenhouse Agent Context Governance `30034296809` → success after compacting Handoff.
- Smoke humano final en la pestaña Chrome existente/autenticada del CEO, sin abrir otra sesión:
  - `/producer?smoke=task-1526-eac1730` rehidrató 11/11 piezas previas con cards inline; primer fold sin el
    fallback gigante `Vista previa de <uuid>` y con `0` imágenes rotas en DOM.
  - Generación nueva image desde UI humana: prompt escrito por teclado en la pestaña CEO, estimate `✨10`,
    click real en `Generar`; card inline apareció como active run `5ff620dc-16c7-47c8-ac41-c08eb769cbbd`.
  - Sin reload manual, el feed pasó `queued → running → completed`; la card final conservó key
    `5ff620dc-16c7-47c8-ac41-c08eb769cbbd|sha256:b2b9ade…`, título propio
    `TASK1526livewatchersphereblueonsandcleanphoto1784834300`, preview blob `2048×2048`, `uuidFallback=0`,
    `broken=0`.
  - Feed DOM post-run: `cards=12`; los títulos ya no colapsan al fallback
    `Candidato sin recipe publicada` (`generic=0`).
  - Viewer imagen: `producerViewerState=ready`, `<img src=blob:…>`, `complete=true`, `naturalWidth=2048`,
    `naturalHeight=2048`, sin `No tienes acceso` ni retry visible.
  - Viewer audio: `producerViewerState=ready`, `<audio src=blob:… controls>`, `readyState=4`, duración `7s`,
    reproducción silenciada `played=true`.
  - Viewer video: `producerViewerState=ready`, `<video src=blob:… controls>`, `readyState=4`, `1280×720`,
    duración `4s`, reproducción muted `played=true`.
  - Descarga no fue accionada durante este smoke para evitar tocar la carpeta local del operador; no hubo disparo accidental.
    `TASK-1503` conserva la evidencia canónica de descarga gobernada y esta task verificó retrieval same-origin por viewer.

### 2026-07-23 — Rollout residual cerrado: Studio desplegado en `7ac0ded`

- Auditoría post-cierre detectó que `globe-studio-internal` seguía en `325abac` y la API en `eac1730`, pese a que
  la corrección aceptada citaba `7ac0ded` (los fixes `b938fd2`+`7ac0ded` de completed-run pending transitions
  tocan sólo `apps/studio-web`; la API no los necesita).
- Deploy Internal (keyless) run `30049251368` → success con SHA completo
  `7ac0dedd19755f9874b633136509f26a55338e01`; revisión `globe-studio-internal-00061-7n7` con 100% de tráfico,
  imagen `:7ac0dedd1975`. Front door `globe.efeoncepro.com/producer` responde `401` anónimo (fail-closed correcto).
- Con esto el runtime interno queda alineado con el cierre: Studio `7ac0ded`, API `eac1730`.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Keyed feed reconciler

- Mantener un mapa por identidad con nodo + revisión renderizada y actualizar sólo cards nuevas o realmente
  cambiadas; filtro, búsqueda, orden y selección mueven/ocultan nodos existentes.
- Insertar active card desde el receipt y rehidratar todo desde el reader tras reload.
- Coordinar una sola observación batch por workspace: long-poll/change cursor acotado, con jitter/backoff,
  pausa hidden/offline y `AbortController` en cambio de workspace/logout; no un timer por run.
- Conservar identidad DOM comprobable (`isSameNode`) para items no modificados durante refresh, filtros y orden.

### Slice 2 — Media y selección resilientes

- Separar DOM de metadata, media loading, media ready y media error.
- Selección actualiza atributos/controles sin `renderFeed()` ni refetch.
- Mantener cache por `(experimentId, sha256)` independiente del subconjunto visible; ocultar/reordenar nunca
  revoca ni vuelve a recuperar un preview sano.
- Revocar Blob URLs sólo al reemplazar el hash, retirar definitivamente el item, cambiar workspace/logout o
  destruir el controller; aplicar límite/LRU explícito si el reader puede exceder la ventana retenida.

### Slice 3 — Viewer, sesión y títulos

- Reauth visible con retorno al mismo viewer/card.
- Distinguir reauth, permiso, not-found y temporal; hidratar `displayTitle`.
- Proyectar filtro y orden inmediatamente sobre el snapshot local; reconciliar después con reader remoto.
- Debounce acotado de búsqueda, cancelación/supersession de consultas y descarte por secuencia para que una
  respuesta anterior nunca sobreescriba el criterio vigente.
- Preservar foco, selección y playback cuando el item continúa visible; si deja de estarlo, aplicar el fallback
  de foco documentado sin cerrar o reiniciar el viewer por un render incidental.

### Slice 4 — E2E y rollout

- Dos runs concurrentes y cada modalidad en desktop/mobile.
- Preview, reproducción y descarga; reload y sesión expirada durante ejecución.
- Medir requests de preview, estabilidad de nodo y latencia de filtro/search con controles de red lentos.
- Validar hover/focus-within y reduced motion: mount ocurre una sola vez; filtrar/reordenar no repite entrada.

## Out of Scope

- Definir el DTO o cambios DB/API (`TASK-1525`).
- Thumbnails/posters/transcodes/waveforms, Range y orphan GC (`TASK-1521`/ADR media).
- Promover rutas/modelos o declarar commercial complete.
- Cambiar estética global o completar la IA transversal de `TASK-1523`.

## Detailed Spec

El feed mantiene un registro por key estable con `node`, revisión renderizada, media state y última presencia
autoritativa. La reconciliación compara el DTO y parchea sólo el item cuya revisión o descriptor cambió; reordenar
usa los mismos nodos y filtrar cambia visibilidad/orden sin destruirlos. Al recibir el receipt se crea una card
optimistic sólo respecto de presencia, usando los IDs y el estado devueltos por el servidor; la autoridad
posterior siempre es el reader. Cuando llega el asset terminal, el mismo nodo cambia de variante y monta media
tras recuperar bytes. Un error media sustituye únicamente el slot visual por fallback compacto.

La cache de preview no se deriva de `filteredItems`: un filtro no equivale a que el asset abandonó el feed. Sus
entradas se retiran sólo cuando desaparecen de la ventana autoritativa, cambia el hash/workspace o el controller
se destruye. El coordinador de consultas aplica filtro/orden local en el mismo frame, debouncea búsqueda y usa
secuencia/abort para ignorar respuestas obsoletas. Selección modifica `aria-selected`, toolbar y state local, sin
reconstruir cards. Reauth conserva la intención de navegación, no el command de gasto.

Motion sigue siendo CSS incidental y causal: la entrada corre sólo al crear un nodo; hover/focus-within revela
acciones y lift sin competir con un `animation-fill-mode` persistente. No se introduce Native View Transitions en
esta corrección: primero se estabilizan keys, foco y playback; cualquier transición compartida futura deberá
tener contrato propio de `TASK-1505`/`TASK-1485`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`TASK-1525 listo → keyed reconciler → media/selection → viewer/session/title → GVC/live canary`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| card duplicada/reordenada | UI | medium | key+revision y tests DOM | duplicate item assertion |
| preview leak/refetch storm | UI/network | medium | Blob lifecycle + request dedupe | preview request count |
| reauth reejecuta gasto | UI/credits | low | nunca persistir/replay command | run/ledger idempotency |
| stale active card | UI/API | medium | cursor recovery + freshness label | `producer_feed_freshness` |

### Feature flags / cutover

Consumer detrás del mismo flag/coverage de `TASK-1525`; canary por usuario/workspace antes de reemplazar reader.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1–3 | flag OFF y volver al feed anterior | <10 min | sí |
| 4 | detener canary, preservar runs/assets | inmediato | sí |

### Production verification sequence

1. Unit/integration y fixture determinístico.
2. GVC desktop/mobile con dos runs concurrentes.
3. Deploy internal canary al usuario CEO.
4. Image/video/audio reales: card inmediata, terminalización, preview/play/download.
5. Reload y expiración/reauth durante run y viewer.
6. Soak; entregar evidencia a `TASK-1521` sin habilitar commercial.

### Out-of-band coordination required

Autorización de canarios facturables ya requerida por `TASK-1525`; cero cambios de secrets/IAM.

## Acceptance Criteria

- [x] Cada click aceptado crea exactamente una card inline identificada por su run; dos runs no se pisan.
- [x] La card aparece desde el ACK durable de execute, sin prometer terminalización.
- [x] El estado converge sin reload manual y una recarga recupera los runs activos.
- [x] Cincuenta runs activos mantienen como máximo una lectura en vuelo por workspace/ciclo y se detienen al
  terminalizar, cerrar sesión o cambiar de workspace.
- [x] Refresh, watcher, filtro, búsqueda y orden conservan `isSameNode === true` para cada item cuya revisión no
  cambió; ningún camino normal elimina/recrea el subtree completo del feed.
- [x] Ocultar y volver a mostrar una card no cambia su Blob URL ni repite retrieval; una entrada se revoca sólo
  por reemplazo/retiro definitivo/workspace/logout/destroy y el cache tiene política acotada explícita.
- [x] Filtro/orden actualizan el snapshot local en el mismo frame; búsqueda usa debounce + abort/supersession y
  una respuesta stale no puede sobrescribir la consulta vigente.
- [x] Selección/favorito conservan nodo, foco y preview; reproducir audio/video no se reinicia por refresh,
  filtro u orden cuando el item permanece en la proyección.
- [x] Preview fallido no deja `img/video/audio` sin fuente ni alt sobredimensionado.
- [x] Sesión expirada muestra reauth; sesión válida sin capability muestra permiso denegado.
- [x] Título usa `displayTitle` client-safe y sólo cae a fallback cuando el servidor no dispone de él.
- [x] Image, video y audio permanecen visibles/reproducibles y descargables después de filtrar, buscar, ordenar,
  refrescar y abrir/cerrar viewer en smoke humano CEO.
- [x] Hover/focus-within coincide con el source aprobado, no queda enmascarado por la animación de entrada y no
  repite entrance al mover/filtrar un nodo; reduced motion conserva todos los estados.
- [x] Desktop y 390 px pasan foco, reduced motion y cero overflow horizontal.

## Verification

- `pnpm check`
- `pnpm build`
- tests controller/client/UI con DOM y request-count assertions
- `pnpm ui:wireframe-check --task TASK-1526`
- `pnpm ui:flow-check --task TASK-1526`
- GVC fixture + browser live desktop/mobile
- smoke autenticado image/video/audio

## Closing Protocol

- [x] Lifecycle, carpeta, registry y `docs/tasks/README.md` sincronizados al nuevo cierre.
- [x] Evidencia runtime de tests y gates enlazada; `Handoff.md` actualizado.
- [x] Scorecard/source gates cumplen threshold (componentes de UI y contratos) y QA no confunde code-complete con rollout.
- [x] `pnpm docs:closure-check` y `pnpm qa:gates --changed` pasan con evidencia runtime enlazada.

## Follow-ups

- Promover el lifecycle card al pattern registry de `TASK-1485` sólo tras dos consumers.
