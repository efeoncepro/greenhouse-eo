# TASK-1969 — Homes por rol · B: chrome del portal y saludo con Elio (Spark rig) y composer de Nexa in-place

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1969-portal-chrome-and-greeting-elio.md`
- Flow: `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md`
- Motion: `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño aprobado en canvas 2026-10-02; wireframe, flow y motion escritos; sin implementación`
- Rank: `2`
- Domain: `ui|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye lo que las tres Homes comparten, según el canvas aprobado: el chrome del portal (logo Efeonce arriba del menú con isotipo al colapsar, Greenhouse a todo color en el footer con estado de plataforma y versión, topbar como tarjeta flotante, menú de teléfono como barra con botón) y el saludo como primitive: Elio (el Spark rig 2.5D de AXIS) con su indicador de pensamiento, y el composer de Nexa que abre la conversación debajo, dentro del saludo. Incluye la tarjeta de novedades compartida.

## Why This Task Exists

- El composer de la Home v2 no abre nada: `HomeHeroAi.tsx:53` hace `router.push('/home?nexa=…')` y nadie lee `?nexa=`.
- El paquete instalado `@efeoncepro/axis-graphic-line` 0.11.0 no trae el Spark rig (llega en 0.14.0, con `axis-brand-assets` ≥ 0.4.12 y `axis-ui-contracts` ≥ 0.3.41).
- El operador aprobó un chrome distinto al actual: Efeonce como marca principal en el menú y Greenhouse al pie, y una topbar igual a la tarjeta flotante del portal en vivo.
- Sin un saludo compartido, cada Home reconstruiría su propio hero.

## Goal

- Una primitive de saludo reutilizable por las tres Homes, con Elio, indicador de pensamiento, composer de Nexa y conversación in-place.
- Chrome del portal con las marcas en el lugar aprobado, sin romper el reflow del sidecar ni la navegación.
- Tarjeta de novedades compartida, alimentada por el bloque `announcements` de `TASK-1970`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/ui-platform/MOTION.md` y `docs/architecture/ui-platform/BRAND_LOGO_VARIATIONS.md`

Reglas obligatorias:

- Elio es el Spark: su etiqueta y nombre accesible dicen «Elio · <estado>», nunca «Nexa». El asistente del composer es Nexa (decisión del operador 2026-10-02).
- El Spark se usa sólo desde el paquete AXIS (`<SparkRig>`); no se regenera, recolorea ni espeja; un rig por pantalla.
- Logos desde el SSOT de marca (`src/config/efeonce-brand.ts`, `resolveBrandAssets`); nunca SVG a mano.
- Elevación con `theme.greenhouseElevation.*`; motion con tokens; copy en `src/lib/copy/*`.
- La conversación usa el runtime existente (`useNexaPersistentRuntime`, `POST /api/home/nexa`); las acciones que escriben siguen `propose → confirm → execute`.

## Normative Docs

- `docs/tasks/to-do/TASK-1967-role-homes-redesign-program.md`
- Canvas aprobado: https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/operations/brand-characters/SPARKS_V1.md` y, en el repo AXIS, `docs/agent-composition/sparks.md` (sección del rig)

## Dependencies & Impact

### Depends on

- Publicación en GitHub Packages de `@efeoncepro/axis-graphic-line` ≥ 0.14.0, `@efeoncepro/axis-brand-assets` ≥ 0.4.12 y `@efeoncepro/axis-ui-contracts` ≥ 0.3.41 (no verificada: `pnpm view` respondió 401).
- `TASK-1970` para los datos reales de clima, novedades y estado de plataforma (la primitive puede construirse antes con estados vacíos).
- Primitives existentes: `NexaMomentComposition`, `nexa-conversation-bubble`, `nexa-answer-bubble` (`src/components/greenhouse/primitives/`).

### Blocks / Impacts

- `TASK-1971`, `TASK-1854` y `TASK-1972` montan esta primitive.
- `TASK-1133` (limpieza de la Home legacy): el composer nuevo hace redundante el chat legacy.
- `TASK-1110`: primer consumer del `NexaMomentComposition` fuera de Knowledge.
- Baseline GVC del sidebar (`data-capture='portal-vertical-nav'`, TASK-1675) cambia.

### Files owned

- `src/components/greenhouse/primitives/greeting-hero/**` (nuevo)
- `src/components/greenhouse/announcement-card/**` (nuevo)
- `src/components/layout/shared/Logo.tsx`, `src/components/layout/vertical/FooterContent.tsx`, `src/components/layout/vertical/Navbar.tsx`, `src/components/layout/vertical/Navigation.tsx`
- `src/views/greenhouse/home/v2/HomeHeroAi.tsx`
- `package.json` (bump AXIS) y estáticos del rig bajo `public/static/sparks-rig/v2.2/`
- `src/lib/copy/home.ts` (nuevo si no existe)
- `docs/ui/wireframes/TASK-1969-portal-chrome-and-greeting-elio.md`, `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md`, `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`

## Current Repo State

### Already exists

- `Logo.tsx` ya conmuta a isotipo al colapsar y su variante `default` ya resuelve Efeonce (`resolveBrandAssets('efeonce')`).
- `FooterContent.tsx` con wordmark y ©; `themeConfig.ts` con navbar `floating: true`.
- Runtime y primitives de Nexa; `NexaMomentComposition` probada en Knowledge.
- `HomeHeroAi.tsx` + `NexaGreetingsCard.tsx` (hero actual con avatar de Nexa).

### Gap

- Spark rig no instalado; sin estáticos de capas.
- Sidebar usa el wordmark Greenhouse; footer sin estado ni versión; topbar no es tarjeta.
- Composer que no abre conversación; sin indicador de estado de Elio.
- Sin tarjeta de novedades para usuarios autenticados.
- Menú de teléfono sin barra con botón.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/components/layout/**` y `src/components/greenhouse/primitives/**`
- Future candidate home: `ui-package`
- Boundary: primitive `GreenhouseGreetingHero` y `GreenhouseAnnouncementCard`; reciben DTOs ya resueltos del snapshot de la Home
- Server/browser split: Elio, el composer y la tarjeta son client components; ningún store, DB ni secreto en el navegador
- Build impact: bump de tres paquetes AXIS; capas del rig como estáticos versionados (~1,5 MB por las seis líneas; sólo Engine al inicio)
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: todas las audiencias del portal (admin, interno, cliente, colaborador)
- Momento del flujo: primer fold después del login
- Resultado perceptible esperado: un saludo vivo (Elio) que resume el día y deja preguntar a Nexa sin salir de la Home; marcas Efeonce/Greenhouse en su lugar
- Friccion que debe reducir: el composer actual no responde; el chrome no refleja la arquitectura de marca
- No-goals UX: rediseñar los bloques de cada rol; cambiar la experiencia conversacional de pantalla completa

### Surface & system decision

- Surface: chrome del portal + región `hero` de la Home v2 y de `/my`
- Nav placement: `none` — no agrega destinos de navegación
- Composition Shell: `aplica` — el saludo va en el `header` del Composition Shell de cada Home
- Primitive decision: `new` — `GreenhouseGreetingHero` y `GreenhouseAnnouncementCard`; `extend` — `Logo` (variante sidebar Efeonce) y `FooterContent`; `reuse` — `NexaMomentComposition`
- Adaptive density / The Seam: `aplica` — el saludo pasa de dos columnas a una bajo 760 px
- Floating/Sidecar/Dialog decision: la conversación es in-place (no dialog); «Abrir en pantalla completa» navega a la experiencia conversacional existente
- Copy source: `src/lib/copy/home.ts` + `src/lib/copy/nexa.ts` (`GH_NEXA`)
- Access impact: `none`

### State inventory

- Default: Elio en espera, campo vacío, tres sugerencias
- Loading: skeleton del texto del saludo; Elio visible con halo
- Empty: sin sugerencias → el campo solo; sin novedades → la tarjeta no se renderiza
- Error: respuesta de Nexa con error canónico dentro del panel
- Degraded / partial: sin clima → sólo fecha; sin capas del rig → halo y etiqueta
- Permission denied: no aplica al saludo (lo resuelve cada bloque)
- Long content: título y bajada con dos líneas máximo y elipsis; respuestas largas con scroll dentro del panel
- Mobile / compact: una columna, Elio arriba a escala .68, barra con botón de menú
- Keyboard / focus: Tab recorre campo, enviar, sugerencias, panel; Escape cierra el panel
- Reduced motion: ver motion contract

### Interaction contract

- Primary interaction: preguntar a Nexa con Enter o con una sugerencia
- Hover / focus / active: foco visible `#2fb8ff` en oscuro; botones suben 1 px; las burbujas de sugerencia muestran la «magia» de IA (barrido de luz, halo y destello del Spark) al pasar el cursor o con el foco, y al hacer clic un pulso con giro del destello y chispas antes de enviar (aprobado por el operador el 2026-10-03; detalle en el motion contract)
- Pending / disabled: botón enviar deshabilitado con campo vacío; puntos «revisando» mientras responde
- Escape / click-away: Escape cierra el panel; click fuera no lo cierra
- Focus restore: al cerrar el panel el foco vuelve al campo
- Latency feedback: Elio pasa a «Trabajando» y aparece «Nexa está revisando tu operación…»
- Toast / alert behavior: sin toasts; los errores viven en el panel

### Motion & microinteractions

- Motion primitive: `CSS` + comportamiento nativo del rig AXIS
- Enter / exit: panel de conversación desde −8 px con fade
- Layout morph: none
- Stagger: esferas del indicador con desfase 160 ms
- Timing / easing token: tokens `emphasized` y `standard` de `MOTION.md`
- Reduced-motion fallback: esferas quietas, panel sin desplazamiento, novedades sin rotación
- Non-goal motion: animar KPIs, parallax

### Implementation mapping

- Route / surface: `/home` (Home v2) y `/my`
- Primitive / variant / kind: `GreenhouseGreetingHero` (variant por audiencia sólo en copy), `GreenhouseAnnouncementCard`
- Component candidates: `SparkRig` (AXIS), `NexaMomentComposition`, `nexa-conversation-bubble`, `nexa-answer-bubble`
- Copy source: `src/lib/copy/home.ts`, `GH_NEXA`
- Data reader / command: snapshot de la Home (`TASK-1970`: `weather`, `announcements`, `platform-status`, sugerencias por bloque); `POST /api/home/nexa`
- API parity: la primitive no tiene lógica de negocio; Nexa usa su runtime gobernado
- Access / capability: las del bloque que la alimenta
- States to implement: los de State inventory

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/home-greeting-elio.scenario.ts`
- Route: `/home` y `/my`
- Viewports: 1440 × 900 y 390 × 844
- Quality profile: `premium`
- Required steps: reposo → foco → sugerencia → respuesta → cerrar → colapsar menú → footer
- Required captures: `greeting-idle`, `greeting-listening`, `greeting-working`, `greeting-answer`, `chrome-collapsed`, `footer`
- Required `data-capture` markers: `portal-vertical-nav`, `home-greeting`, `home-conversation`, `home-announcements`, `portal-footer`
- Assertions: capas del rig cargadas; etiqueta «Elio · …»; ninguna etiqueta de Elio dice «Nexa»; sin scroll horizontal
- Scroll-width checks: `scrollWidth === innerWidth` en ambos viewports
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` y recorrido con Tab
- Review dossier: `pnpm fe:capture:review home-greeting-elio`
- Baseline decision / surface ID: nueva baseline para `portal-vertical-nav` y `home-greeting`

### Design decision log

- Decision: saludo compartido como primitive con Elio y conversación in-place
- Alternatives considered: mantener `NexaGreetingsCard` con avatar; abrir el chat flotante; navegar a la experiencia completa
- Why this pattern: el operador pidió que Enter abra Nexa debajo y que el personaje sea el Spark (Elio); una primitive evita tres heros distintos
- Reuse / extend / new primitive: new (`GreenhouseGreetingHero`, `GreenhouseAnnouncementCard`), extend (`Logo`, `FooterContent`), reuse (`NexaMomentComposition`)
- Open risks: publicación de los paquetes AXIS; peso de las capas del rig; convivencia con el chat flotante

### Visual verification

- GVC scenario: `home-greeting-elio`
- Viewports: 1440 × 900, 390 × 844
- Required captures: las del GVC scenario plan
- Required `data-capture` markers: los del GVC scenario plan
- Scroll-width check: sí
- Accessibility/focus checks: Tab, Escape, `aria-live` del estado y del panel
- Before/after evidence: Home v2 actual vs nueva
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-1969-portal-chrome-and-greeting-elio.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Paquetes AXIS y Elio

- Verificar publicación y hacer el bump de los tres paquetes; copiar las capas Engine a `public/static/sparks-rig/v2.2/engine/`; `pnpm build` verde.
- Lab interno del Design System con Elio y sus estados.

### Slice 2 — Primitive de saludo y conversación in-place

- `GreenhouseGreetingHero` con Elio, indicador de pensamiento, composer, sugerencias y panel de conversación sobre `NexaMomentComposition`; reemplaza `HomeHeroAi.tsx` en Home v2 (detrás de la flag de la variante).

### Slice 3 — Chrome

- Logo Efeonce en el sidebar e isotipo al colapsar; footer con Greenhouse, enlaces por audiencia, estado de plataforma y versión; topbar flotante; menú de teléfono como barra con botón.

### Slice 4 — Tarjeta de novedades

- `GreenhouseAnnouncementCard` con rotación, pestañas con progreso y pausa; consume el bloque `announcements`.

### Slice 5 — GVC y documentación

- Escenario GVC, scorecard y documentación UI Platform de las primitives nuevas.

## Out of Scope

- Bloques de cada rol (`TASK-1971`, `TASK-1854`, `TASK-1972`).
- Readers y API de datos (`TASK-1970`).
- Renombrar Nexa o cambiar la experiencia conversacional de pantalla completa.
- Nuevas poses o 3D del Spark.

## Detailed Spec

- Variante de Home: clave nueva en `greenhouse_serving.home_rollout_flags` creada por la primera hija UI que la necesite (la migración del CHECK la escribe quien la use primero; esta task puede crearla si llega antes).
- `GreenhouseGreetingHero` props: `eyebrow` (fecha), `weather` (opcional), `title`, `subtitle`, `suggestions[]`, `threadContext` (focusRef de Nexa), `audience`.
- Estados de Elio desde el composer: `feliz` (reposo), `atento` (foco), `pensando` (escribiendo), `trabajando` (esperando), `listo` (respuesta) → etiqueta es-CL desde copy.
- El chat flotante de Nexa sigue disponible; el saludo no lo abre.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2; Slices 3 y 4 en paralelo con 2; Slice 5 al final.
- El chrome nuevo (Slice 3) se publica sólo junto con la primera Home nueva o detrás de su flag, para no mezclar marcas en la Home actual.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Paquetes AXIS no publicados | release | medium | Verificar antes del bump; pedir release al repo AXIS | build rojo |
| Capas del rig pesadas en el primer fold | UI | low | Sólo línea Engine; `loading` diferido de capas no visibles | GVC + Web Vitals |
| Romper el reflow del sidecar con la topbar flotante | UI | medium | Tests de layout y GVC con sidecar abierto | GVC diff |
| Elio rotulado como Nexa por error | UI | low | Assertion en el escenario GVC | escenario rojo |

### Feature flags / cutover

- El saludo nuevo y el chrome se activan con la clave de variante de las Homes nuevas en `home_rollout_flags`; la Home v2 actual queda como fallback. Revert: apagar la fila (≤ 30 s).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del bump + redeploy | < 15 min | sí |
| Slice 2 | apagar la flag de variante | < 1 min | sí |
| Slice 3 | apagar la flag o revert PR | < 15 min | sí |
| Slice 4 | revert PR | < 15 min | sí |
| Slice 5 | N/A | — | sí |

### Production verification sequence

1. Staging con la flag sólo para el usuario agente: GVC desktop y móvil.
2. Activar por rol (admin) en staging, revisar sidecar y chat flotante.
3. Producción con la flag por usuario agente → rol → global, junto con la primera Home nueva.

### Out-of-band coordination required

- Release de los paquetes AXIS en GitHub Packages.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: primitive`.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-1969`.
- [ ] Wireframe, flow y motion declarados existen.
- [ ] Los paquetes AXIS quedaron en ≥ 0.14.0 / 0.4.12 / 0.3.41 y `pnpm build` pasa.
- [ ] Elio se muestra con capas cargadas y su etiqueta dice «Elio · <estado>»; ninguna etiqueta de Elio dice «Nexa».
- [ ] Enviar una pregunta abre la conversación debajo del saludo sin navegar; «Abrir en pantalla completa» conserva el hilo.
- [ ] Las burbujas de sugerencia tienen la «magia» de IA del motion contract: barrido, halo y destello en hover/foco; pulso, giro del destello y chispas al hacer clic (≤ 420 ms antes de enviar); con movimiento reducido sólo cambia el color y el clic envía de inmediato.
- [ ] El sidebar muestra el logo Efeonce y el isotipo al colapsar; el footer muestra Greenhouse, estado de plataforma y versión.
- [ ] El copy visible reusable vive en `src/lib/copy/*`.
- [ ] Los estados loading/empty/error/degraded/mobile quedan cubiertos.
- [ ] Motion y microinteracciones tienen fallback de reduced motion.
- [ ] GVC desktop + mobile fue capturado y mirado.
- [ ] Se midio que no existe scroll horizontal de pagina en desktop ni mobile 390px.
- [ ] Las primitives nuevas tienen Lab interno y documentacion UI Platform.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm local:check:ui`
- `pnpm fe:capture home-greeting-elio --env=staging`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1967` marca la hija B como cerrada

## Follow-ups

- Capas del rig de otras líneas si una Home de cliente de otra línea lo pide.
