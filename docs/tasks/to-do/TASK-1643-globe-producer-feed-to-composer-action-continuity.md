# TASK-1643 — Globe Producer Feed-to-Composer Action Continuity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1643-globe-producer-feed-to-composer-action-continuity.md`
- Flow: `docs/ui/flows/TASK-1643-globe-producer-feed-to-composer-action-continuity-flow.md`
- Motion: `docs/ui/motion/TASK-1643-globe-producer-feed-to-composer-action-continuity-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno; unidad nueva para separar las acciones del feed del lane operativo de TASK-1641`
- Rank: `TBD`
- Domain: `ui|creative|product`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar la continuidad accionable del Producer: una pieza que se descubre en el feed debe poder usarse como
referencia, recrearse, marcarse como favorita o descargarse mediante los contratos gobernados que ya existen.
La task es deliberadamente estrecha: consume el feed React, el composer y las acciones de assets; no crea un
segundo viewer, una API nueva ni lógica de promoción.

## Why This Task Exists

La auditoría autenticada frente a Higgsfield y Magnific encontró que `ProducerFeedRoute.tsx` pasa handlers vacíos
para `onReference`, `onRecreate`, `onFavorite` y `onDownload`. El control puede verse habilitado sin ejecutar nada,
o perder la continuidad al volver al composer. `TASK-1641` es backend/API de promoción y declara `UI impact: none`;
por eso este slice sale de su órbita. `TASK-1559` conserva el port, la reconciliación y el render del feed, mientras
esta task toma únicamente el wiring de acciones y el handoff feed → composer.

## Goal

- El operador sabe en cada card qué acción está disponible, pendiente, completada o bloqueada y por qué.
- Reference y Recreate llevan contexto gobernado al composer sin crear un job ni reservar créditos.
- Favorite y Download usan los primitives de asset autorizados, sin retrieval directo ni URLs inventadas.
- El loop mínimo `feed → acción → composer → estimate` queda probado en desktop, 390 px, teclado y reduced motion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md`
- `docs/audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md`

Reglas obligatorias:

- Greenhouse registra la task y la evidencia; el runtime y los contratos viven en `efeonce-globe`.
- La UI consume commands/readers existentes. No se agrega endpoint, capability, schema, provider SDK ni autoridad
  de derechos desde React.
- Reference y Recreate son operaciones zero-spend hasta que el operador confirme una nueva generación.
- Si una acción no tiene contrato aplicable, debe quedar deshabilitada con una razón visible; nunca se mantiene un
  no-op como promesa de producto.
- La identidad pública de la ruta/modelo, roles de entrada, controles, estimate, lineage y rights siguen siendo
  server-side y los consumidores `TASK-1552`/`TASK-1633` conservan su ownership.

## Normative Docs

- `docs/documentation/creative-studio/efeonce-globe-competitive-benchmark.md`
- `docs/ui/flows/EPIC-028-globe-creative-studio-master-flow.md`
- `docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md`
- `docs/tasks/complete/TASK-1503-globe-governed-output-retrieval-asset-actions.md`
- `docs/tasks/in-progress/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/tasks/in-progress/TASK-1559-globe-feed-viewer-client-port.md`

## Dependencies & Impact

### Depends on

- `TASK-1503` — primitives gobernados de retrieval y asset actions; no se replica su command/reader.
- `TASK-1552` — composer y estado de referencias/recetas; esta task sólo entrega el handoff desde el feed.
- `TASK-1559` — shell, cards, reconciliación y viewer del feed React; esta task no reabre su port.
- `TASK-1633` — contrato de roles/controles por ruta cuando una referencia se entrega al composer.
- `ISSUE-141` — la subida de referencia es un camino separado; esta task no lo arregla, pero debe mostrar su bloqueo
  real cuando una ruta exige input aún no disponible.

### Blocks / Impacts

- Desbloquea la generación desde Producer en rutas que requieren referencias una vez que el ingest autorizado esté
  disponible.
- Entrega un punto de entrada estable a `TASK-1571`, `TASK-1570`, `TASK-1568` y `TASK-1582`; no implementa sus
  canvases ni sus workspaces.
- Permite que `TASK-1560` retire el legacy sin conservar acciones visibles que sólo funcionan en el payload antiguo.

### Files owned

- `/Users/jreye/Documents/efeonce-globe/apps/studio-client/src/surfaces/producer/feed/ProducerFeedRoute.tsx` —
  wiring de acciones y handoff.
- `/Users/jreye/Documents/efeonce-globe/apps/studio-client/src/surfaces/producer/feed/ProducerFeed.tsx` —
  disponibilidad, estados y feedback de las acciones; `TASK-1559` conserva el render/reconciliación no relacionado.
- `/Users/jreye/Documents/efeonce-globe/apps/studio-client/src/surfaces/producer/feed/producer-feed-actions.test.ts`
  — tests focales de despacho y no-op.
- `/Users/jreye/Documents/efeonce-globe/apps/studio-client/src/copy/index.ts` — sólo las claves de copy de estados
  de acción que sean necesarias, coordinadas con su owner actual.
- `docs/ui/wireframes/TASK-1643-globe-producer-feed-to-composer-action-continuity.md`
- `docs/ui/flows/TASK-1643-globe-producer-feed-to-composer-action-continuity-flow.md`
- `docs/ui/motion/TASK-1643-globe-producer-feed-to-composer-action-continuity-motion.md`

## Current Repo State

### Already exists

- `ProducerFeed` ya conoce las cuatro acciones y su guard de handler; `ProducerFeedRoute` las entrega como no-op.
- `TASK-1503` ya posee retrieval/action contracts de output y `copyAsReference` con gasto cero.
- `TASK-1552` ya posee el composer, roles y contrato visual para recibir referencias y recetas.
- El feed ya tiene estado de retained/degraded/denied y un shell validado por `TASK-1559`.

### Gap

- El wiring no ejecuta command/reader real para las cuatro acciones.
- Reference/Recreate no transfieren de forma verificable `sourceAssetId`, recipe, rol y contexto al composer.
- El usuario no distingue una acción ausente, no autorizada, pendiente o fallida de una acción que no hizo nada.
- La auditoría histórica había nombrado `TASK-1641` como owner de esta UI; EPIC-028, el Handoff, el registry y el
  benchmark vigente ya corrigen la atribución a esta task. `TASK-1641` conserva sólo promoción backend/API.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer/feed/`
- Future candidate home: `ui-package`
- Boundary: consumer React del feed y composer; usa asset action commands/readers, route contract y estado de sesión
  existentes; no posee derechos, spend, retrieval ni route promotion.
- Server/browser split: BFF/API entrega datos y autoridad; browser mantiene sólo estado efímero de pending, foco,
  handoff y feedback; ningún store, DB, secreto o provider SDK entra al bundle.
- Build impact: bundle existente de `apps/studio-client`; no agrega dependencias pesadas ni entrypoint global.
- Extraction blocker: routing/session actuales del Producer y el transporte same-origin del runtime hermano.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: productor/editor interno de Globe.
- Momento del flujo: abrir una card retenida y decidir continuar, reutilizar o descargar.
- Resultado perceptible esperado: cada acción tiene una consecuencia visible y el operador llega al composer sin
  perder el asset ni su contexto.
- Fricción que debe reducir: affordances mentirosas, pérdida de lineage y salto manual entre feed y composer.
- No-goals UX: rediseñar el feed, crear un nuevo viewer, construir un editor multimodal o copiar la navegación de
  Higgsfield/Magnific literalmente.

### Surface & system decision

- Surface: `/producer`, card del feed y composer existente.
- Composition Shell: `aplica` — conserva `ProducerWorkspace`, feed, viewer y composer actuales.
- Primitive decision: `extend` — extender action rail, `CapabilityButton`/`CardAction` y handoff existente; no crear
  una galería ni un action system paralelo.
- Adaptive density / The Seam: `aplica` — desktop muestra acciones contextuales; 390 px conserva una barra táctil
  compacta sin overflow ni acciones sólo hover.
- Floating/Sidecar/Dialog decision: no se agrega sidecar; Recreate/Reference devuelven foco al composer existente y
  Download no abre un modal nuevo.
- Copy source: `/Users/jreye/Documents/efeonce-globe/apps/studio-client/src/copy/index.ts`
- Access impact: `none` — reutiliza grants/capabilities del bridge y de `TASK-1503`.

### State inventory

- Default: acciones disponibles sólo para el estado y media autorizados.
- Loading: pending localizado en la acción; la card y el feed siguen utilizables.
- Empty: sin asset retenido, Reference/Download explican qué falta.
- Error: error sanitizado por el contrato, con retry sólo cuando el command es seguro.
- Degraded / partial: retained/preview/rights/projection se distinguen; no se promete una descarga imposible.
- Permission denied: acción disabled con razón de policy, sin filtrar detalles internos.
- Long content: labels y recipe se truncarán sin ocultar el estado ni el modelo público.
- Mobile / compact: hit targets táctiles, action rail accesible y cero scroll horizontal.
- Keyboard / focus: Enter/Space activan; pending conserva foco; handoff restaura foco en el composer; Escape no
  reenvía ni pierde una acción confirmada.
- Reduced motion: el estado final aparece sin transición; pending y error conservan copy persistente.

### Interaction contract

- Primary interaction: elegir Reference o Recreate en una card para continuar la intención sin gastar.
- Hover / focus / active: revelar affordances sólo por hover no es válido; focus muestra label y estado completos.
- Pending / disabled: una acción no soportada no recibe handler; se muestra la razón canónica y no se simula éxito.
- Escape / click-away: cerrar cualquier feedback devuelve foco al trigger y conserva la card seleccionada.
- Focus restore: Reference/Recreate llevan al primer campo relevante del composer; Favorite/Download mantienen el
  foco en la acción que terminó.
- Latency feedback: pending local + estado del command; no bloquear el feed completo ni mostrar toast como único
  resultado.
- Toast / alert behavior: resultado persistente en la card o composer; toast sólo como apoyo no autoritativo.

### Motion & microinteractions

- Motion primitive: `CSS` + primitives de Globe existentes.
- Enter / exit: el handoff al composer usa el patrón de continuidad ya definido en el master motion; no hay morph
  decorativo de toda la página.
- Layout morph: la bandeja de referencia o recipe se actualiza sin cambiar el ancho del documento.
- Stagger: no usar stagger en el muro de cards.
- Timing / easing token: tokens existentes del payload; no valores locales.
- Reduced-motion fallback: actualización instantánea con foco y copy intactos.
- Non-goal motion: confeti, rebote, autoplay o feedback que parezca aprobación de una generación.

### Implementation mapping

- Route / surface: `/producer` en `apps/studio-client/src/surfaces/producer/`.
- Primitive / variant / kind: `CardAction`, `CapabilityButton`, action rail del `ProducerFeed` y handoff del
  `ProducerComposer`.
- Component candidates: `ProducerFeedRoute`, `ProducerFeed`, `ProducerComposer` y el estado de workspace existente.
- Copy source: `apps/studio-client/src/copy/index.ts`.
- Data reader / command: primitives de asset actions/retrieval de `TASK-1503`, `globe.producer.asset.copyAsReference`
  y el contrato de recipe/handoff de `TASK-1552`; los nombres efectivos se leen del registry, no se inventan en UI.
- API parity: cero endpoint nuevo; todas las mutaciones/lecturas pasan por los commands/readers gobernados.
- Access / capability: consume la autorización de output/asset del runtime y vuelve a validar en server; no deriva
  rights desde la card.
- States to implement: available, pending, completed, disabled-reason, denied, retained-missing, degraded,
  command-failed, session-expired, mobile, keyboard y reduced-motion.

### GVC scenario plan

- Scenario file: `../efeonce-globe/apps/studio-client/scripts/producer-feed-actions-canary.mjs` (a crear al tomar la
  task).
- Route: `/producer`.
- Viewports: desktop 1440 px y mobile 390 px.
- Quality profile: `premium`.
- Required steps: abrir feed real → enfocar card retenida → Reference → verificar composer/rol sin job → Recreate →
  verificar recipe/estimate stale → Favorite → Download → estados denied/degraded/session-expired → teclado →
  reduced motion.
- Required captures: first fold, action rail disponible, Reference en composer, Recreate con recipe, pending,
  success, disabled con razón, error/recovery, 390 px y reduced motion.
- Required `data-capture` markers: `producer-feed-action-card`, `producer-feed-action-rail`,
  `producer-feed-reference-handoff`, `producer-feed-recreate-handoff`, `producer-feed-action-state`.
- Assertions: cero no-op handlers, command/reader observado, cero job/reserva antes de confirmación, source/recipe
  preservados, focus restore, no signed URL inventada, no overflow y una sola action pending por card.
- Scroll-width checks: `scrollWidth === clientWidth` en desktop y 390 px.
- Reduced-motion / focus evidence: captura y assertion de equivalencia semántica.
- Review dossier: `docs/ui/reviews/TASK-1643-globe-producer-feed-to-composer-action-continuity.scorecard.json`.
- Baseline decision / surface ID: `globe-producer-feed-action-continuity-v1`.

### Design decision log

- Decision: una action rail contextual en la card mantiene Reference/Recreate/Favorite/Download cerca del asset y
  conserva el composer como destino de intención.
- Alternatives considered: ocultar acciones hasta implementar backend, copiar un action rail separado en el viewer,
  crear una página de assets nueva o agregar handlers temporales.
- Why this pattern: cierra la brecha de confianza con el mínimo cambio de superficie y preserva los owners de feed,
  composer, library, review y media canvas.
- Reuse / extend / new primitive: extender `CardAction`/`CapabilityButton`; no new primitive en Slice 1.
- Open risks: upload/ingest de referencias sigue separado por `ISSUE-141`; recipe puede requerir una proyección que
  `TASK-1552` aún esté terminando.

### Visual verification

- GVC scenario: `producer-feed-actions-canary.mjs`.
- Viewports: desktop 1440 px y 390 px.
- Required captures: card, action rail, composer handoff, pending/error/disabled y reduced motion.
- Required `data-capture` markers: los declarados en el escenario.
- Scroll-width check: obligatorio en ambas vistas.
- Accessibility/focus checks: labels, 44 px hit target, keyboard, focus restore y announcements.
- Before/after evidence: feed actual con no-op versus feed con acción gobernada y resultado visible.
- Known visual debt: la profundidad del viewer y los canvases de media pertenecen a `TASK-1568`, `TASK-1570` y
  `TASK-1571`.
- Visual scorecard: `docs/ui/reviews/TASK-1643-globe-producer-feed-to-composer-action-continuity.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Action inventory and honest availability

- Reemplazar los cuatro no-op por handlers reales o por ausencia explícita de handler con razón visible.
- Alinear la action rail con retained, rights, modality, capability y estado de sesión.
- Agregar tests que fallen si una acción visible vuelve a renderizarse con una función vacía.

### Slice 2 — Reference/Recreate zero-spend handoff

- Despachar `copyAsReference` y entregar al composer `sourceAssetId`, rol, lineage y derechos derivados por el
  contrato existente.
- Cargar la recipe gobernada de Recreate sin iniciar `estimate → prepare → execute`; marcar estimate stale cuando
  cambie el input y conservar el contexto al cambiar de ruta de forma explícita.
- Cubrir rutas con input obligatorio y mostrar el bloqueo real cuando upload/ingest todavía no está disponible.

### Slice 3 — Favorite/Download y recovery

- Consumir favorite y retrieval/download de `TASK-1503` con estado pending, success, denied y failure honesto.
- Servir sólo bytes/tickets autorizados por el reader; ningún handler construye URLs firmadas o cruza workspace.
- Mantener foco y permitir retry únicamente cuando la operación sea idempotente/segura.

### Slice 4 — Evidence and closure

- Ejecutar tests focales, canary real y GVC premium desktop/390 px.
- Documentar cualquier contrato ausente como blocker/follow-up de backend, sin crear un bypass dentro de la UI.

## Out of Scope

- Cambiar el command/reader, schema, capability, retrieval gateway, rights policy o provider adapter de `TASK-1503`.
- Rediseñar el composer; su contrato y adaptación por ruta pertenecen a `TASK-1552`/`TASK-1633`.
- Reescribir el feed/viewer, reconciliación, poster, waveform, timeline, zoom, compare o MediaStage de
  `TASK-1559`/`TASK-1567`/`TASK-1569`/`TASK-1571`.
- Crear Home/Entry Hub/Asset Workspace/Review/Element, que pertenecen a `TASK-1580`–`TASK-1583`.
- Resolver la promoción, canary o readiness de modelos de `TASK-1641`.
- Añadir un segundo player, action registry paralelo, galería o ruta `/producer/compose`.

## Detailed Spec

La frontera es una consumer task: `ProducerFeedRoute` lee el action registry y estado autorizado; sus callbacks
delegan en los commands/readers existentes y publican únicamente un resultado tipado hacia el workspace. El
composer decide cómo materializar la referencia/recipe. La UI nunca convierte una acción en un provider call.

Para Reference, el criterio de éxito es la llegada verificable al composer; para Recreate, la recipe debe conservar
la identidad pública de ruta/modelo y dejar el estimate explícitamente stale si cambió un eje del contrato; para
Favorite/Download, el criterio es el readback autorizado. En los cuatro casos, un fallo no se convierte en éxito por
un callback resuelto ni se reintenta una operación de gasto ambiguo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (availability/no-op guard) → Slice 2 (Reference/Recreate) → Slice 3 (Favorite/Download) → Slice 4 (GVC y
canary). No se cablea una acción que todavía no tenga su estado disabled/recovery definido.

| Riesgo | Sistema | Mitigación | Señal |
|---|---|---|---|
| Acción visible sin efecto | UI/confianza | test de no-op + command observado | click sin cambio/command |
| Reference inicia gasto | crédito/Producer | handoff sólo a composer y fingerprint stale | nuevo run o reserva antes de confirmar |
| URL o bytes fuera de scope | asset/rights | reader/ticket gobernado y server revalidation | URL construida en React |
| Recipe cambia ruta silenciosamente | composer/contract | identidad pública y elección explícita | routeId distinto sin acción del operador |
| Handoff pierde foco o overflow | UI/a11y | GVC desktop/390, keyboard y reduced motion | scroll width o foco perdido |

### Feature flags / cutover

Usar el flag/allowlist actual del client app. Activar primero estados read-only y zero-spend; activar Favorite/Download
después del readback de `TASK-1503`. No cambiar flags comerciales ni autorizar clientes externos.

### Rollback per slice

- Slice 1: ocultar o deshabilitar las acciones nuevas y conservar el feed; no deja data parcial.
- Slice 2: apagar handoff Reference/Recreate y conservar el composer manual.
- Slice 3: apagar Favorite/Download en UI; no borra favorites ni assets.
- Slice 4: rollback del bundle/flag y conservar evidencia; sin migración ni rollback de datos.

## Acceptance Criteria

- [ ] `ProducerFeedRoute` no pasa funciones vacías para Reference, Recreate, Favorite o Download.
- [ ] Toda acción visible ejecuta un primitive gobernado o queda disabled con una razón comprensible y accesible.
- [ ] Reference llega al composer con `sourceAssetId`, rol/lineage y estado autorizado sin crear job, estimate o
      reserva antes de confirmación.
- [ ] Recreate carga recipe/route/shape preservados, invalida estimate cuando corresponde y no cambia modelo sin
      elección explícita.
- [ ] Favorite y Download usan los commands/readers de `TASK-1503`, con revalidación server-side, sin URLs firmadas
      inventadas, cross-workspace retrieval ni doble despacho.
- [ ] Rutas con input obligatorio muestran el blocker real de upload/ingest y nunca simulan que la referencia se
      aplicó.
- [ ] La action rail conserva teclado, focus restore, reduced motion, estados pending/error/denied y no overflow en
      desktop y 390 px.
- [ ] GVC premium, scorecard y tests focales pasan; `UI ready` permanece `no` hasta que los gates lo confirmen.
- [ ] No se agrega API, schema, capability, provider, viewer, gallery o action registry paralelo.

## Verification

- `pnpm task:lint --task TASK-1643`
- `pnpm ui:wireframe-check --task TASK-1643`
- `pnpm ui:flow-check --task TASK-1643`
- `pnpm ui:motion-check --task TASK-1643`
- `pnpm ui:readiness-check --task TASK-1643`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `efeonce-globe`: tests focales del feed/composer, `pnpm check`, `pnpm build`, canary y GVC premium.

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados.
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [ ] EPIC-028 y el mapa de owners reflejan `TASK-1643`.
- [ ] Benchmark, Handoff y manual apuntan al owner correcto.
- [ ] GVC/scorecard y evidencia de command/reader real están enlazados.
- [ ] `TASK-1559`, `TASK-1552` y `TASK-1560` reciben el handoff correspondiente.

## Follow-ups

- `TASK-1552` — composer route-native y model/capability discovery.
- `TASK-1567`–`TASK-1571` — review especializado de audio, video e imagen.
- `TASK-1580`–`TASK-1583` — home, workspace, review y reuse.
- `ISSUE-141` — private ingest para referencias obligatorias.

## Open Questions

- Qué subset exacto de recipe puede proyectar el feed antes de que `TASK-1552` cierre su consumer; resolverlo leyendo
  el contrato, no agregando campos ad hoc al card item.
- Qué acciones deben permanecer disabled por rights/projection en assets históricos; usar el reader de `TASK-1503`.
