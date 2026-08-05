# TASK-1523 — Globe Creative Suite Experience Logic and Information Architecture

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1523-globe-creative-suite-experience-logic.md`
- Flow: `docs/ui/flows/TASK-1523-globe-creative-suite-experience-logic-flow.md`
- Motion: `docs/ui/motion/TASK-1523-globe-creative-suite-experience-logic-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-25 — el contrato de motion del payload cliente YA EXISTE y está implementado (venía de TASK-1565, retirada)

Se creó `TASK-1565` ("Motion del payload cliente") sin ver que esta task ya es la dueña de los **contratos
visual/flow/motion** de la suite. **`TASK-1565` queda retirada** y su contenido pertenece acá.

**El contrato escrito:** `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` — SSOT del motion
del payload cliente, con los valores **medidos** del prototipo aprobado (11 `@keyframes`, 12 animaciones, 9
transiciones). Su decisión de fondo: el motion tiene **tres capas que se gobiernan distinto** —
**identidad** (el isotipo generando: bajo `reduce` se apaga la animación, **no** el elemento) · **estructura**
(entradas y overlays: pasan a `--duration-none`) · **ambiente** (aurora: se apaga por completo).

**Ya implementado y verificado en browser** (`efeonce-globe`, commit `1c0684e`):

| Pieza | Qué es |
|---|---|
| `GlobeGeneratingMark` | primitive con las 4 animaciones del isotipo. `gBreathe` y `gHalo` **comparten el token de duración** — el token compartido ES el mecanismo que garantiza la fase, verificado en browser. El isotipo va como **asset** desde `/assets/brand/`, no inline: `'self'` ya satisface la CSP y un asset de marca no se forkea a código |
| `AuroraLayer` | 3 capas con duraciones distintas, montada **una vez por documento** (feed y composer comparten pantalla; por superficie habría dos auroras superpuestas) |
| `candIn` · `skel` | entrada por **primera aparición** de `stableKey` (no por render) y shimmer del skeleton |
| **gate de reduced-motion** | `src/gates/reduced-motion.test.ts`, 7 tests |

**El gate, y la corrección que él mismo forzó.** Se escribió afirmando que evitaba animaciones sin manejo de
`prefers-reduced-motion`; **leyendo `base.css` resultó falso** — hay un blanket global que neutraliza todo con
`!important`. Su valor real es enforcar la **dirección del opt-in** (declarar dentro de `no-preference`, que falla
segura) y forzar la decisión de **qué queda visible**, porque "detenerse" no siempre es el estado final correcto:
una chispa congelada a mitad de vuelo es ruido, el isotipo congelado es correcto. Y en su primera corrida marcó
**dos animaciones correctas** como infracciones (ya envueltas en `no-preference`, la práctica mejor) — obligó a
calibrar, que es el modo de fallar garantizado de todo gate nuevo.

**Tres defectos que sólo aparecieron mirando el browser:** `candIn` **no corría nunca** (mutaba el registro durante
el render y StrictMode invoca el render dos veces); el hero no animaba su entrada; y las duraciones de chispas y
aurora quedaban como literales — el gate de motion me corrigió y les agregué **tokens al SSOT, no una excepción al
gate**.

**Corrección de una afirmación falsa:** `TASK-1565` declaraba un "defecto de accesibilidad vigente" (que las
acciones de card desaparecían bajo `reduce`). **No existe** — se revelan con `:hover` **y** `:focus-within`, y
`@media (hover: none)` las deja siempre visibles en touch. Lo afirmé leyendo el bloque del prototipo sin abrir mi
archivo.

**Canary:** `apps/studio-client/scripts/producer-motion-canary.mjs`, 13 asserts en los dos modos.
**Docs de UI reusables:** `docs/ui/motion/TASK-1565-globe-client-motion-implementation-motion.md` (plan de
implementación) y `docs/ui/wireframes/TASK-1565-globe-client-motion-implementation.md` (mapa de los 8 anclajes).

**Falta:** el motion del composer (estimado atenuado, barra de progreso, `overlayIn`), que llega con `TASK-1552`.

## Summary

Definir la lógica de experiencia, arquitectura de información y gramática de interacción común de Efeonce
Globe como suite creativa AI Gen. El contrato conecta Producer, Workbench, Library, Review y Delivery mediante
un solo Creative Loop para un producto comercial, sin duplicar sus surfaces ni inventar lógica de negocio en UI.

## Why This Task Exists

Globe ya tiene un Producer prompt-first implementado y un Workbench brief-first planificado, pero no existe un
contrato de producto que explique cómo ambos representan el mismo sistema creativo. Sin esa capa común, cada
surface puede ordenar intención, referencias, dirección, costo, generación, refinamiento, aprobación y memoria
de forma distinta, fragmentando la suite y empujándola hacia un chat genérico, un formulario o un DAG técnico.

## Goal

- Formalizar el Creative Loop canónico:
  `contexto → intención → referencias → dirección → configuración → estimación/aprobación → generación →
  selección → refinamiento → review → delivery → memoria`.
- Definir la relación entre Producer, Workbench y los planos compartidos de Library/Lineage, Review/Delivery
  y Credits sin crear productos o backends paralelos.
- Fijar el rol agentic de Globe como `propose → human approve → execute → human judge`, con gates humanos de
  gasto, craft, derechos y release.
- Entregar dirección visual, wireframe, flow y motion contract desktop/mobile para las tasks consumidoras.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`
- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Reglas obligatorias:

- Globe es plataforma hermana: Greenhouse gobierna task/arquitectura/evidencia y Globe posee runtime/UI/datos.
- Globe es un producto comercial: la experiencia no usa lenguaje de piloto interno, demo o herramienta
  experimental; disponibilidad, acceso y capabilities se comunican con verdad por plan y workspace.
- Producer sigue prompt-first y Workbench brief-first. Esta task fija su gramática compartida; no los fusiona.
- UI, SDK, MCP, CLI y workers consumen los mismos commands/readers/policies. No nace business logic en UI.
- Modelo público puede ser visible; slug, costo vendor, margen, secrets y policy interna nunca salen.
- Un output es candidato hasta juicio humano. La IA no aprueba craft, gasto, rights ni release.
- Una capability no disponible se presenta gated con causa y recovery, nunca como control ejecutable falso.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` como bar de calidad, no herencia visual.
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`
- `.codex/skills/modern-web-guidance/SKILL.md`
- `.codex/skills/greenhouse-globe/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1505` — evidencia runtime y consumidor prompt-first.
- `TASK-1474` — consumidor brief-first con scope propio.
- `TASK-1485` — lifecycle de cualquier pattern compartido.
- `TASK-1499` — reader de interpretación de Dirección; esta task sólo define su UX.

Son dependencias de alineación, no bloqueos documentales.

### Blocks / Impacts

- Ajusta los contratos UI de `TASK-1474`, `TASK-1485` y futuras surfaces Globe.
- Informa evoluciones de `TASK-1505` sin absorber su implementación o rollout.
- Todo gap backend descubierto se deriva a una task `backend-data`.

### Files owned

- `docs/tasks/to-do/TASK-1523-globe-creative-suite-experience-logic.md`
- `docs/ui/visual-directions/TASK-1523-globe-creative-suite-experience-logic-direction.md`
- `docs/ui/wireframes/TASK-1523-globe-creative-suite-experience-logic.md`
- `docs/ui/flows/TASK-1523-globe-creative-suite-experience-logic-flow.md`
- `docs/ui/motion/TASK-1523-globe-creative-suite-experience-logic-motion.md`
- Deltas focales en `TASK-1505`, `TASK-1474` y `TASK-1485` cuando la decisión final los afecte.

No posee código Globe, schemas, commands, readers, migrations, providers ni rollout.

## Current Repo State

### Already exists

- `TASK-1505` materializa `/producer` con composer multimodal, estimate, library, viewer, refinements y review.
- `TASK-1474` declara Workbench con brief, dirección, canvas, candidate dock y review.
- `TASK-1485` fija Design System y registry propios de Globe, sin herencia Greenhouse.
- Los contratos backend separan brief, rutas/modelos, run, outputs, lineage, credits y review.

### Gap

- No existe un mapa común de momentos, decisiones, objetos visibles, navegación, continuidad ni gates humanos.
- El rol transversal de la IA no está contratado y puede degradar a chatbot, autopilot o controles técnicos.
- Producer y Workbench pueden divergir en naming, costo/rights/readiness y continuidad candidato→delivery.
- No existe una regla canónica de recomposición mobile para la suite completa.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse docs gobierna experiencia/evidencia; efeonce-globe consume el contrato en su UI propia`
- Future candidate home: `remain-shared`
- Boundary: `Creative Loop e IA de Globe consumidos por Producer, Workbench y patterns registrados`
- Server/browser split: `documental; futuras UIs consumen DTOs browser-safe y mantienen providers, rights, credits y writes server-only`
- Build impact: `none`
- Extraction blocker: `auth/session, workspace scope y API Contract Spine conservan una sola autoridad en Globe`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador Efeonce o creativo/marketing cliente/co-operador con workspace y capabilities explícitas.
- Momento del flujo: desde intención creativa hasta pieza revisada/entregada y memoria reusable.
- Resultado perceptible esperado: entender qué decide la persona, qué propone la IA, cuánto cuesta y qué sigue.
- Fricción que debe reducir: tools dispersas, prompts sin contexto, pérdida de lineage, costo incierto y feedback
  desconectado del candidato.
- No-goals UX: chat dominante, node graph default, apps por modalidad, card dashboard, slugs/providers o
  automatización que suplante aprobación humana.

### Surface & system decision

- Surface: contrato transversal para `/producer`, futuro Workbench y planos Library/Review/Delivery.
- Composition Shell: `no aplica` — Globe no hereda CompositionShell; `TASK-1485` registra su gramática propia.
- Primitive decision: `extend` — reusar shell/composer/stage/library/viewer y proponer sólo `Creative Loop`.
- Adaptive density / The Seam: `aplica como principio`, sin copiar primitives Greenhouse.
- Floating/Sidecar/Dialog decision: floating para contexto; inspector para candidato/lineage; dialog sólo para
  gasto, salida dirty, rights o release bloqueante.
- Copy source: módulo centralizado Globe; cero strings reutilizables inline.
- Access impact: `entitlements|startup policy`; la autoridad permanece server-side.

### State inventory

- Default: workspace/proyecto, intención y próxima decisión claros.
- Loading: shell/stage estables y readers localizados.
- Empty: iniciar desde prompt, brief, receta o referencia.
- Error: causa tipada y recovery; no raw provider/API errors.
- Degraded / partial: rights, readiness, bytes, lineage, credits y review degradan por separado.
- Permission denied: safe state sin revelar existencia cross-workspace.
- Long content: brief, prompts, feedback y metadata completos mediante disclosure accesible.
- Mobile / compact: `contexto → intención → estimate/acción → candidato`; advanced controls contextuales.
- Keyboard / focus: DOM y lectura visual coinciden; dialogs restauran foco.
- Reduced motion: mismo estado y causalidad sin morph, stagger o loops.

### Interaction contract

- Primary interaction: avanzar la próxima decisión del Creative Loop, no “hablar con la IA”.
- Hover / focus / active: hover tiene equivalente focus/touch; selección no depende de color.
- Pending / disabled: `aria-disabled` cuando explicar el gate aporta recovery; `disabled` cuando no.
- Escape / click-away: no modales cierran sin perder trabajo; dirty/gasto/release exige decisión.
- Focus restore: trigger previo o heading de región resultante.
- Latency feedback: estado/attempt real y mensajes `polite`; nunca porcentaje inferido por tiempo.
- Toast / alert behavior: complementa estado persistente; `assertive` sólo ante fallo crítico.

### Motion & microinteractions

- Motion primitive: wrappers/tokens propios de Globe gobernados por `TASK-1485`.
- Enter / exit: causalidad decisión→run→candidato sin retrasar first paint.
- Layout morph: composer→candidate e inspector sólo si preserva foco/contexto.
- Stagger: limitado al primer grupo de candidatos.
- Timing / easing token: tokens Globe.
- Reduced-motion fallback: cambio directo de estado y mismo significado.
- Non-goal motion: loops ambientales, parallax, confetti, shake o progress ficticio.

### Implementation mapping

- Route / surface: `/producer`; Workbench route a confirmar en `TASK-1474`.
- Primitive / variant / kind: `Creative Loop` candidate; patterns actuales/a validar en `TASK-1485`.
- Component candidates: resolver contra registry real antes de implementar.
- Copy source: namespace Globe Creative Suite.
- Data reader / command: owners existentes de brief, catalog/estimate, run, assets/lineage, review/delivery y credits.
- API parity: toda acción permanece thin-client sobre el spine.
- Access / capability: workspace/project + capability granular; responsabilidad no eleva permisos.
- States to implement: inventario anterior y gates capability/readiness/rights/budget.

### GVC scenario plan

- Scenario file: extender `scripts/frontend/scenarios/globe-creative-producer.scenario.ts`; Workbench tiene el suyo.
- Route: `/producer`; Workbench según su IA.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: quick create, brief handoff, estimate/gate, candidate, refine, review y delivery.
- Required captures: first fold, handoffs, gated/degraded, keyboard y reduced motion.
- Required `data-capture` markers: `globe-creative-loop`, `creative-intent`, `creative-direction`,
  `creative-estimate`, `creative-candidates`, `creative-inspector`, `creative-review`.
- Assertions: modelo mental común, authority/costo honestos, DOM order, focus restore y cero data sensible.
- Scroll-width checks: documento, stage, library, inspector y overlays.
- Reduced-motion / focus evidence: intención, run, candidato e inspector.
- Review dossier: `docs/ui/captures/TASK-1523-globe-creative-suite-experience-logic/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-suite-experience-logic`.

### Design decision log

- Decision: Editorial Creative Desk con Creative Loop común; Producer y Workbench son entry modes distintos.
- Alternatives considered: AI Chat Canvas, Technical Node Graph y card dashboard.
- Why this pattern: preserva lenguaje creativo, juicio humano, trazabilidad y costo.
- Reuse / extend / new primitive: extend; promoción vía `TASK-1485`.
- Open risks: IA transversal aún no materializada, Workbench sin runtime y packaging/capabilities comerciales
  aún dependientes de sus contratos dueños.

### Visual verification

- GVC scenario: auditoría cross-surface basada en Producer y futuro Workbench.
- Viewports: `1440×1000`, `390×844`.
- Required captures: first fold, gated, running, candidate, inspector, review y compact.
- Required `data-capture` markers: los del scenario plan.
- Scroll-width check: documento y cada overlay.
- Accessibility/focus checks: landmarks, headings, media, library, overlays y live regions.
- Before/after evidence: UI actual vs contrato aprobado; no paridad literal entre surfaces.
- Known visual debt: Workbench y registry `TASK-1485` aún pendientes.
- Visual scorecard: `docs/ui/reviews/TASK-1523-globe-creative-suite-experience-logic.scorecard.json`
- Quality threshold: `average >= 4.5; every dimension >= 4; critical dimensions >= 4.5`

<!-- ZONE 2 — PLAN MODE: no aplica a una policy. -->

<!-- ZONE 3 — DOCUMENTARY EXECUTION SPEC -->

## Scope

### Slice 1 — Product grammar and IA

- Cerrar vocabulario, Creative Loop, surfaces/modes, continuidad, navegación y ownership de decisiones.
- Mapear cada momento a Producer, Workbench o plano compartido.

### Slice 2 — Direction and interaction contracts

- Completar dirección visual repo-native con alternativas y selección.
- Elevar wireframe/flow/motion a `ready-for-implementation`.

### Slice 3 — Consumer alignment and evidence

- Aplicar deltas focales a `TASK-1505`, `TASK-1474` y `TASK-1485`.
- Auditar Producer con GVC y declarar gaps de Workbench sin fingir runtime.

## Out of Scope

- Implementar/rediseñar Producer, Workbench, Login, Library, Review o Delivery.
- Crear schemas, commands, readers, migrations, providers, agents o capabilities.
- Decidir pricing, packaging, commercial host o cliente GA.
- Heredar Greenhouse/Vuexy/MUI/CompositionShell dentro de Globe.

## Detailed Spec

La especificación ejecutable de producto vive en la visual direction, wireframe, flow y motion contract
declarados en `## Status`. Esta policy los eleva de `draft` a `ready-for-implementation`, registra la decisión
en los consumers y conserva cualquier cambio runtime para sus tasks dueñas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`product grammar → visual/flow/motion contracts → consumer deltas → evidence`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar Producer/Workbench | product/UI | high | mapping de cada momento/owner | tercera surface equivalente |
| Convertir Globe en chat | UX/brand | high | Editorial Creative Desk | chat domina jerarquía |
| UX sin backend real | UI/API | medium | owner existente o task separada | control sin reader/command |
| Ocultar costo/rights/readiness | trust/credits | high | gates con causa/recovery | CTA sin authority |
| Mobile serializa desktop | UI/a11y | medium | recomposición 390 + evidencia | card stack/scroll page |

### Feature flags / cutover

N/A — policy documental; adopción runtime ocurre sólo en tasks consumidoras.

### Rollback plan per slice

- Gramática/IA: revertir delta documental.
- UI contracts: restaurar versión previa; no cambia runtime.
- Consumer alignment: revertir referencias/deltas sin mutar código/datos.

### Production verification sequence

Revisión documental → gates task/wireframe/flow/motion → auditoría GVC Producer → aprobación humana → deltas.

### Out-of-band coordination required

Product/Creative valida dirección; owners de `TASK-1505`, `1474` y `1485` aceptan deltas. Gaps backend se derivan.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Creative Loop, surfaces, planos compartidos y ownership de decisiones están definidos sin duplicación.
- [ ] Rol agentic sigue `propose → approve → execute → judge`; gasto, craft, rights y release tienen gate humano.
- [ ] Dirección compara tres alternativas y selecciona Editorial Creative Desk con rationale.
- [ ] `UI ready` permanece `no` hasta completar mapping, GVC plan, decision log y contratos.
- [ ] Wireframe, flow y motion existen y pasan sus gates.
- [ ] Primitive decision es `extend`; cualquier pattern nuevo entra a `TASK-1485`.
- [ ] Copy/state ledger cubre loading, empty, partial, denied, gated, estimating, running, candidate y review.
- [ ] Mobile 390 recompone jerarquía y declara `scrollWidth <= clientWidth`.
- [ ] Modern web guidance queda incorporada: DOM order, focus, dialog/popover, live regions, container-aware
  layout y rendering diferido con teclado verificado.
- [ ] Cada acción mapea a contract existente o task backend separada.
- [ ] Deltas de consumers y EPIC-028 quedan sincronizados.
- [ ] Evidencia distingue Producer runtime de Workbench futuro.
- [ ] La dirección de experiencia fija un solo Producer shell con tres estudios adaptativos —Imagen, Video y Audio— y rechaza tanto tres aplicaciones aisladas como un composer genérico.
- [ ] La matriz de responsabilidades distingue primitives compartidas, controles por modalidad, viewer especializado, feed, workspace, review y reuse; ningún consumer crea un segundo feed/viewer/library.
- [ ] El grafo ejecutable queda documentado como `TASK-1633 → TASK-1552 → TASK-1643 → revisión de media → TASK-1580 → TASK-1581 → TASK-1582 → TASK-1583`, con `TASK-1641` fuera de la lane UI.

### Criterios del MOTION del payload cliente — migrados de TASK-1565 (retirada)

Los primeros ocho **ya están verificados en browser** (canary `producer-motion-canary.mjs`, 13 asserts, commit
`1c0684e`); quedan como criterios para que una superficie nueva no los pierda.

- [x] Existen las 11 animaciones del diseño aprobado, o las ausentes están declaradas con su razón (`coachPulse`
      no se implementa: no existe superficie de onboarding).
- [x] `gBreathe` y `gHalo` usan el **mismo token** de duración — el token compartido **es** el mecanismo que
      garantiza la fase. Verificado en browser: `animationDuration` idéntico.
- [x] Con `reduce`: el isotipo sigue **en el DOM** con `animation-name: none` — se apaga el movimiento, **no** el
      elemento, porque el elemento es la señal de que algo corre.
- [x] Con `reduce`: chispas y llama se **ocultan** (congeladas a mitad de vuelo son ruido), pero el isotipo no.
- [x] Con `reduce`: el **progreso textual está presente** — la prueba de que el motion nunca fue el único
      portador del estado.
- [x] `candIn` corre **una vez por `stableKey`** y **no** re-anima en una reanudación: 7/7 en el primer paint,
      0 tras dos ciclos. Sin esto el feed late completo cada 4 segundos.
- [x] Existe el **gate de reduced-motion** (`src/gates/reduced-motion.test.ts`, 7 tests), que **muerde** sobre CSS
      sintético y **no** produce falsos positivos sobre las animaciones existentes.
- [x] Ninguna duración ni curva literal: el gate de motion literal sigue verde (obligó a tokenizar las 4
      duraciones de chispas y las 3 de aurora — se le agregaron **tokens al SSOT, no una excepción al gate**).
- [ ] El motion del **composer** (estimado atenuado, barra de progreso, `overlayIn`) llega con `TASK-1552`.
- [ ] `coachPulse` cuando exista la superficie de onboarding.

## Verification

- `pnpm task:lint --task TASK-1523`
- `pnpm ui:wireframe-check --task TASK-1523`
- `pnpm ui:flow-check --task TASK-1523`
- `pnpm ui:motion-check --task TASK-1523`
- `pnpm ui:readiness-check --task TASK-1523` cuando se proponga `UI ready: yes`
- `pnpm ops:lint --changed`
- Revisión humana de arquitectura de experiencia y dirección visual.

## Closing Protocol

- Mover a `complete/` sólo con contratos listos, consumers sincronizados y evidencia honesta.
- Sincronizar registry, README, EPIC-028 y documentación de Globe en Greenhouse.
- La ausencia de Workbench runtime no impide cerrar policy, pero sí afirmar paridad visual ejecutada.

## Follow-ups

- Implementación: `TASK-1505`, `TASK-1474` y tasks backend dueñas.
- Login se diseña por separado; no forma parte del Creative Loop autenticado.

## Delta 2026-07-26 — master flow y motion de EPIC-028

El benchmark de Magnific, Higgsfield, Krea y Runway confirmó que la IA del Creative Loop necesita una jerarquía visible `Project → Collection → Session → Candidate/Asset → Lineage → Review → Element`. `TASK-1523` conserva la autoridad transversal de esa gramática; no se crea un segundo feed, viewer, library ni motion engine.

Los contratos maestros del programa son:

- `docs/ui/flows/EPIC-028-globe-creative-studio-master-flow.md`
- `docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md`

El delivery se deriva a `TASK-1580` (Project/Session/Element contract), `TASK-1581` (Entry Hub + Session Feed), `TASK-1582` (Asset Workspace) y `TASK-1583` (Review-to-Element). Los consumers deben declarar esos contratos y no redefinir estados, focus, reduced motion o ownership de media.

## Delta 2026-08-05 — Producer unificado con tres estudios de modalidad

El benchmark autenticado de Higgsfield y Magnific confirma que la ventaja competitiva está en la continuidad
`crear → revisar → modificar → reutilizar`, no en separar el producto en tres aplicaciones. `TASK-1523` conserva
la autoridad de la decisión: Producer mantiene un shell y un muro/feed común, mientras Imagen, Video y Audio
reciben compositores, stages, estados y acciones de revisión especializados.

La decisión es una recomposición de experiencia sobre contracts/readers/commands existentes. No crea `Producer V3`
como task paraguas, no agrega un segundo runtime y no cambia la autoridad de `TASK-1633`, `TASK-1552`, `TASK-1559`,
las tasks de media o `TASK-1580`–`TASK-1583`.

El handoff de diseño del corte está consolidado en:

- [Dirección visual Producer V3](../../ui/visual-directions/EPIC-028-producer-v3-unified-studios.md)
- [Wireframe Producer V3](../../ui/wireframes/EPIC-028-producer-v3-unified-studios.md)
- [Flow Producer V3](../../ui/flows/EPIC-028-producer-v3-unified-studios-flow.md)
- [Motion Producer V3](../../ui/motion/EPIC-028-producer-v3-unified-studios-motion.md)
- [Plan operativo Producer V3](../../operations/creative-studio/EPIC_028_PRODUCER_V3_EXECUTION_PLAN_V1.md)

Estos documentos son un contrato program-level de handoff; no sustituyen los wireframes/flows/motion declarados
por cada task consumer ni permiten pasar `UI ready` sin sus gates propios.
