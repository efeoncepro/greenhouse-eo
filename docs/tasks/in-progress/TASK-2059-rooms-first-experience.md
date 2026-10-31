# TASK-2059 — Rooms: primera sala y vistas por rol

## Delta 2026-10-30 — canvas aprobado; base y backend primero

- El operador aprobó el 2026-10-29 el canvas de Claude Design «la sala es una órbita» (artifact
  `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`), registrado en
  `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md` § «Aprobación 2026-10-29». Reemplaza la
  composición del scaffold anterior para esta superficie.
- Orden: TASK-2079 (base visual: órbita, halo, cámara, iris, motion) y TASK-2080 (contrato backend) van primero.
- Esta task implementa la Sala (mundo-cámara con 5 capítulos, barra de capítulos, mapa), la Radiografía, el
  Móvil y los Estados del canvas, y reemplaza la fixture Nómada por la campaña ficticia volta.
- Huecos backend verificados el 2026-10-30 (`3c7bcb5`): no hay capítulos ni recorrido por persona. La órbita no
  puede medir un recorrido inventado: esperar TASK-2080 slices 1 y 2.
- `UI ready` vuelve a `no`: wireframe, flow y motion describen la composición anterior y deben rehacerse desde
  el canvas aprobado antes de implementar.

> Estado actual26Oct: ver `Status real` y «Conciliación vigente» abajo. El delta25Oct se conserva como historia del corte y sus pendientes no describen el estado actual.

## Delta 2026-10-25 — respuesta humana a la demo (NO aceptada)

- Julio revisó la demo publicada (`efeonce-rooms.vercel.app/demo`, `20f9fe9`) y respondió: «la verdad no sé si es lo que busco… buscaba algo más inmersivo». **No es una aceptación.** Pidió frenar Rooms por ahora. Antes de seguir con más superficie (R07–R12) hay que revisar la dirección de experiencia con él: qué significa «inmersivo» para Rooms (`EFEONCE_ROOMS_EXPERIENCE_V1.md`, dirección visual) y validarlo con una maqueta antes de construir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2059-rooms-first-experience.md`
- Flow: `docs/ui/flows/TASK-2059-rooms-first-experience-flow.md`
- Motion: `docs/ui/motion/TASK-2059-rooms-first-experience-motion.md`
- Backend impact: `none`
- Epic: `EPIC-052`
- Status real: `2026-10-30: sala nueva del canvas implementada en local (efeonce-rooms claude/rooms-approved-ui c133299 + 32640ee, sin push): capítulos en el mundo-cámara, escenas idea/pieza/galería, explorador de pieza con adaptaciones y Preguntar, radiografía en papel, recorrido real (progress.mark/get), mapa con bienvenida, versión móvil apilada con hoja de capítulos y capa en vivo. GVC local PASS: rooms-orbit-room (1440 y 1280), rooms-orbit-room-mobile (390 y 320), rooms-live-room. Contra backend real: sala del fixture de integración y prueba de dos personas. Falta: aceptación humana, UI ready y GVC con contenido real multimedia (video/PDF) y con una sala de 8-12 capítulos.`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; nuevo runtime efeonce-rooms main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Conciliación vigente — 2026-10-26

Entrega cloud y canary: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md); coordinación posterior: [disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json). El único correo ya recibido no se repite. Persisten como trabajo nuevo la integración del consumidor de Claude Design y sus gates; el disparo del Job ya no es un pendiente.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Delta 2026-10-30 — sala del canvas aprobado

- Implementación: `src/components/room/{room-orbit,room-stack,chapter-view,use-room-progress,live-layer}.tsx`, `src/styles/room.css`, página `src/app/rooms/[roomId]/editions/[editionId]/page.tsx` y demo sintética `/demo/sala` (volta ficticia).
- Base visual de TASK-2079; contrato de TASK-2080 (capítulos, recorrido, adaptaciones, autores).
- 2026-10-31: wireframe, flow y motion de esta task se reescribieron desde el canvas aprobado y el código implementado (`efeonce-rooms` `claude/rooms-approved-ui`), con las diferencias canvas ↔ código registradas. `UI ready` sigue en `no` hasta la aceptación humana.

## Summary

Materializar la primera sala creativa y SEO/AEO con La órbita, piezas fieles, lectura/radiografía y workspace de operador/administrador, gobernados por permisos efectivos.
Primera entrega local autorizada por Julio («Vamos»), con muestras sintéticas; no equivale al producto V1 entero.

## Why This Task Exists

EPIC-052 tenía sólo definición. El operador autorizó base mínima seguida inmediatamente por UI y pidió can, jerarquías y vistas cliente/operador/administrador desde el arranque.

## Goal

- Experiencia desktop/móvil revisable y verificada visualmente.
- Preservar la frontera Rooms/Greenhouse, La órbita y proyecciones privadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`

## Normative Docs

- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-1591-efeonce-ui-adapters-pilot.md`

## Dependencies & Impact

### Depends on

- EPIC-052 y go del operador 2026-10-25. UI consume TASK-2058; foundation no espera toda la persistencia.

### Blocks / Impacts

- R01/R02 y el mínimo de R04; R03–R15 conservan su resto de alcance.

### Files owned

- Nuevo runtime `../efeonce-rooms/`, autorizado para creación; foundation posee contratos/config/tests, UI posee app/components/styles y tests visuales.
- Esta task, su plan, epic, dossier Rooms, índices y handoff de Greenhouse.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- `docs/architecture/rooms/README.md` y paquete oficial de marca AXIS.

### Gap

- Sin runtime Rooms al tomar la task. Marca existente no acredita UI implementada.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: nuevo repo hermano `../efeonce-rooms`, autorizado expresamente al confirmar esta primera entrega; documentación en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: contratos browser-safe propios Rooms, reader/can server-side y adapter HTTP/CLI/UI; AXIS sólo presentación.
- Server/browser split: fixtures, grants y notas internos nunca importados por componentes cliente; sólo DTO proyectado y permisos efectivos.
- Build impact: Next/React/TypeScript/Tailwind y paquetes privados AXIS fijados; build independiente de Greenhouse.
- Extraction blocker: none; producto propio aprobado, sin tablas ni sesiones compartidas.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente, operador y administrador, con grants efectivos desde reader.
- Momento del flujo: explorar, abrir pieza, leer y revisar evidencia; operador consulta salas.
- Resultado perceptible esperado: sala revisable desktop/móvil con fidelidad de piezas y permisos visibles.
- Friccion que debe reducir: pasar de una propuesta estática a una explicación explorable.
- No-goals UX: editor, upload, invitaciones y consola remota completos.

### Surface & system decision

- Surface: sala comercial y workspace interno de Rooms.
- Nav placement: sidebar — sólo en workspace interno, no modifica navegación Greenhouse.
- Composition Shell: no aplica — producto independiente; consume AXIS/Tailwind, no MUI/Vuexy.
- Primitive decision: reuse — Button, Dialog, Tabs y tokens; composiciones nuevas locales Rooms.
- Adaptive density / The Seam: no aplica — ninguna dependencia del portal.
- Floating/Sidecar/Dialog decision: Dialog AXIS para detalle, un nivel con retorno de foco.
- Copy source: src/lib/copy/rooms.ts del nuevo runtime.
- Access impact: views — can desde servidor, no autoridad por visibilidad.

### State inventory

- Default: contenido y capítulos completos de muestra sintética.
- Loading: estado de ruta, sin progreso ficticio.
- Empty: listado sin salas, vuelta a inicio.
- Error: mensaje redactado y reintento.
- Degraded / partial: evidencia no medida explícita.
- Permission denied: no contenido protegido en DTO ni en HTML.
- Long content: lectura completa en columna y sin crop.
- Mobile / compact: 390px y 320px, controles disponibles.
- Keyboard / focus: tabulación, Escape y regreso a disparador.
- Reduced motion: CSS/AXIS respetan preferencia.

### Interaction contract

- Primary interaction: explorar propuesta y abrir pieza o radiografía.
- Hover / focus / active: estados AXIS y labels persistentes.
- Pending / disabled: acciones no implementadas no se simulan.
- Escape / click-away: cierre de un único Dialog.
- Focus restore: disparador original mediante ref.
- Latency feedback: loading de ruta sólo durante carga.
- Toast / alert behavior: no éxito falso de persistencia.

### Motion & microinteractions

- Motion primitive: CSS.
- Enter / exit: microinteracción nativa AXIS.
- Layout morph: sin morph del arte.
- Stagger: ninguno.
- Timing / easing token: axisMotion.
- Reduced-motion fallback: estado inmediato.
- Non-goal motion: logo Rooms o cámara 3D.

### Implementation mapping

- Route / surface: ../efeonce-rooms/src/app; demo cliente y workspace operador/admin.
- Primitive / variant / kind: Button pill/solid/ghost, Dialog y Tabs publicados.
- Component candidates: RoomExperience, OperatorWorkspace, EditorialReader.
- Copy source: ../efeonce-rooms/src/lib/copy/rooms.ts.
- Data reader / command: TASK-2058 reader y can; sin commands nuevos aquí.
- API parity: lectura shared; gestos locales excluidos del catálogo durable.
- Access / capability: rooms.read, workspace.read, access.read según contrato can.
- States to implement: ready/loading/empty/partial/error/denied y mobile.

### GVC scenario plan

- Scenario file: scripts/frontend/scenarios/rooms-first-experience.scenario.ts.
- Complemento automatizado: ../efeonce-rooms/tests/experience.spec.ts.
- Route: localhost /demo y workspace de demostración.
- Viewports: desktop 1440×900, tablet 1024×768, mobile 390×844 y 320px.
- Quality profile: premium
- Required steps: abrir/cerrar pieza, lectura/radiografía, retorno, cambiar vista de demostración y probar denied.
- Required captures: entrada, detalle, artículo, evidencia, workspace y denied.
- Required data-capture markers: room-entry, room-stage, room-detail, editorial-reader, evidence-panel, operator-workspace.
- Assertions: fuentes cargadas, ratios, roles y notas ausentes de cliente.
- Scroll-width checks: scrollWidth <= clientWidth en todos los estados.
- Reduced-motion / focus evidence: Escape y focus restore con ambas preferencias.
- Review dossier: docs/ui/reviews/TASK-2059-rooms-first-experience/.
- Baseline decision / surface ID: rooms.first-experience; primera captura candidata, pendiente aprobación humana.

### Design decision log

- Decision: escenario editorial y workspace sobrio para roles internos.
- Alternatives considered: galería 3D y sala documental densa.
- Why this pattern: prioriza piezas y lectura con evidencia, visible desde el primer fold.
- Reuse / extend / new primitive: reuse AXIS; composiciones nuevas sólo de Rooms.
- Open risks: aceptación visual y conexión Efeonce ID posteriores.

### Visual verification

- GVC scenario: scripts/frontend/scenarios/rooms-first-experience.scenario.ts.
- Viewports: desktop y mobile, más tablet y 320px.
- Required captures: cinco estados funcionales y negativos de acceso.
- Required data-capture markers: room-entry/room-stage/editorial-reader/evidence-panel/operator-workspace.
- Scroll-width check: ningún desborde de página.
- Accessibility/focus checks: axe con incomplete revisado, contraste, teclado, foco y reduced motion.
- Before/after evidence: nuevo producto, baseline candidato documentado.
- Known visual debt: revisión humana pendiente hasta entrega.
- Visual scorecard: docs/ui/reviews/TASK-2059-rooms-first-experience.scorecard.json.
- Quality threshold: average >= 4.5; floor >= 4; ejes críticos >= 4.5.

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

### Slice 1 — Contrato y foundation

- Registrar decisión de arranque y permisos can; instalación y contratos con fixtures propias.

### Slice 2 — Consumidor y evidencia

- Implementar el alcance del perfil de esta task y producir evidencia reproducible local.

## Out of Scope

- Despliegue, DNS, CRM, datos reales, invitaciones, upload, DB y comandos durables completos.
- Reemplazar la identidad Efeonce ID por credenciales o roles enviados por navegador.

## Detailed Spec

Delta del operador: interfaz superior premium con Product Design. Auditoría IAB en `docs/ui/reviews/TASK-2059-rooms-first-experience/product-design-audit.md`; se sustituyen artes provisionales por PNG generados, se amplía el visor y se añade cierre superior a ambos diálogos.

Contrato de datos de Rooms versionado; capacidades por acción, roles con techo de autoridad y grants específicos. Primera implementación local con demo sintética y proyecciones allowlist. La interfaz consume el reader y los permisos efectivos; fixture no equivale a identidad o persistencia productiva. Alcance detallado en los contratos de Zone 1.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contratos/permisos → consumo de AXIS → interfaz → pruebas y revisión. Go/plan aprobado en la conversación 2026-10-25; la ampliación can forma parte de la misma base.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de notas entre roles | Rooms | medium | Proyección allowlist y tests negativos | Fallo de policy/projection test |
| Stack sin compatibilidad | Build | medium | Peers estrictos, caso negativo lint, typecheck y build | Instalación o gates fallidos |
| Muestra confundida con operación | UX | medium | Etiqueta demostración y API real cerrada | Revisión de copy y rutas |

### Feature flags / cutover

Demo explícita de fixtures sintéticas, acceso local. Sin cutover ni production runtime impact. No configurar servicios externos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revert de archivos propios del runtime nuevo | local | sí |
| 2 | Revert de componentes y contratos del consumidor | local | sí |

### Production verification sequence

Sin producción en esta entrega. Verificar localhost con build de producción; hosting/identidad real requieren evidencia posterior.

### Out-of-band coordination required

Ninguna para contenido sintético local. Aceptación visual de Julio al entregar; hosting y credenciales de despliegue posteriores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] View Transitions en capítulos/paginación de detalle, fallback sin soporte y reduced motion, foco, clics rápidos y cambios de persona verificados. Probe observa animaciones nativas; entrada Dialog usa desplazamiento CSS, sin snapshots entre roles. Evidencia en motion-axis y auditoría del corte.
- [x] Button/Badge/CountBadge de AXIS0.7.15 adoptados; inventario y capturas en motion-axis. Hover del botón original y contraste durante apertura corregidos y GVC repetido PASS.
- [x] Logo oficial sin alterar, ratio intrínseco y tamaño224/176px revisados desktop/móvil en capturas finales. Esto no sustituye aceptación humana.

- [x] Contratos y límites de esta task implementados en el runtime propio, sin imports de implementación Greenhouse.
- [x] Permisos can, jerarquías cliente/operador/admin, ámbito tenant/sala/edición y denegación por defecto verificados; notas internas ausentes del DTO cliente.
- [x] Dependencias exactas y AXIS de registry con instalación limpia, lint (incluido negativo), typecheck y build verificados.
- [x] Evidencia local del consumidor documentada; rollout y Efeonce ID real declarados pendientes.
- [ ] Wireframe/flow/motion y UI ready pasan task:lint y ui:readiness-check antes de JSX. (Reabierto 2026-10-30: el canvas aprobado reemplaza la composición anterior.)
- [x] Desktop y móvil capturados y mirados; scroll-width, foco, contraste, reduced motion y fuentes comprobados.
- [x] La órbita se consume desde tokens y primitives; copy y estados completos en el consumidor.
- [x] Primera experiencia entregada para revisión del operador; aceptación visual humana registrada sólo cuando ocurra.

- [ ] Aceptación visual humana de esta composición: pendiente de revisión de Julio; no inferida de QA ni del logo aprobado.

## Verification

- `pnpm task:lint --task TASK-2059`
- Consumidor: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- UI: Playwright/axe y capturas del consumidor; API: smoke y negativos de acceso.

## Closing Protocol

- [x] Lifecycle y ubicación reflejan evidencia real.
- [x] Índices, epic, Handoff y changelog sincronizados.
- [x] Impacto cruzado revisado; pendientes de R01/R02/R04 no se cierran por inferencia.

## Follow-ups

R03 persistencia; resto de R04 Efeonce ID e invitaciones; R05 medios; R13 MCP/CLI completos; R15 rollout.


## Evidence — 2026-10-25

- [Auditoría y límites](../../audits/rooms/2026-10-25-first-local-delivery.md), [manual local](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [revisión Product Design](../../ui/reviews/TASK-2059-rooms-first-experience/product-design-audit.md).
- `pnpm verify` PASS: lint0warnings,3 casos negativos, TS7,17 tests de contratos/can, build optimizado. Install limpio379paquetes y frozen-lockfile verificados.
- Consumidor:25 pruebas E2E pass/3skip por API repetida entre viewports; GVC premium4variantes/68frames exit0, enterprise pass,0quality findings y sin errores runtime. Source artifact/source dimensions, teclado, fuente,200%texto, reduced motion y gates negativos incluidos.
- API real401 aun con headers/query forjados; workspace cliente403, persona desconocida400, POST405; CLI exit1 ante deny y exige demo explícita.
- No DB/migración/backfill/rollout; adapter Efeonce ID null. No se afirma producción ni aceptación visual humana.

Gate visual: calidad4.55 PASS; contrato y gate con captura Rooms aislada PASS. Walker global bloqueado por symlink roto de una captura ajena; detalle/hash en auditoría. No se altera el artefacto ajeno ni se oculta esa limitación del tooling.

## Delta 2026-10-25 — continuidad del epic y refinamiento

El operador confirma /goal de continuar EPIC-052 y pide View Transitions modernas y botones/badges La órbita desde el inicio. La UI actual sigue siendo candidata: aceptación posible no equivale a aceptación definitiva. Se reutiliza esta task dueña para refinamiento, sin duplicar ownership. Hook ejecutado con subagentes; UI y QA separados de persistencia/identidad.
