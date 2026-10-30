# TASK-2079 — Rooms: base visual La órbita y primitivas de motion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2079-rooms-orbit-foundation.md`
- Flow: `docs/ui/flows/TASK-2079-rooms-orbit-foundation-flow.md`
- Motion: `docs/ui/motion/TASK-2079-rooms-orbit-foundation-motion.md`
- Backend impact: `none`
- Epic: `EPIC-052`
- Status real: `Diseño aprobado 2026-10-29 (canvas «la sala es una órbita»). Sin código.`
- Rank: `1 de la implementación de la UI aprobada`
- Domain: `ui`
- Blocked by: `none`
- Branch: `efeonce-rooms: claude/rooms-orbit-foundation desde codex/rooms-design-integration, sin push a main; Greenhouse: docs en develop`

## Summary

Construye en `efeonce-rooms` las primitivas que comparten todas las pantallas del canvas aprobado: la órbita
canónica con su halo, la órbita que mide un dato real, las estaciones de capítulos, la cámara con salto orbital
y mapa, el iris, el parallax con grano y el contrato de movimiento reducido. Incluye un laboratorio sintético
`/demo/base` para revisarlas y capturarlas antes de que la sala las use.

## Why This Task Exists

El operador aprobó el canvas completo el 2026-10-29, pero Rooms no tiene ninguna de estas piezas: el adapter
actual (`src/styles/theme.ts`) solo expone colores y tipografía, y no hay componente de órbita. Durante la
ronda del canvas el operador corrigió tres usos equivocados de la órbita (como loader, con halo falso y con
imágenes de fondo). Si cada pantalla de las Fases 1–4 dibuja su propia órbita, esos errores vuelven. Una base
única, con los valores del token y los tiempos de marca, los evita por construcción.

## Goal

- Una sola implementación de la órbita, el halo y el motion, alimentada por `@efeoncepro/axis-tokens`.
- Geometría pura y testeada (ángulos, arcos, estaciones, halo) que la sala y la invitación reutilizan.
- Laboratorio `/demo/base` capturado con GVC en desktop y móvil, con y sin movimiento reducido.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/README.md` (dossier) y `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_MARK_DECISION_V1.md`
- `.claude/skills/efeonce-graphic-line/SKILL.md` (canon de La órbita)

Reglas obligatorias:

- Valores de marca solo desde `efeonceGraphicLine` y `axisMotion`/`axisGeometry`; cero hex, px de marca o curvas literales en componentes.
- La órbita nunca es loader ni progreso simulado; si mide, el dato es real.
- Nunca órbita ni lockup encima del arte del cliente.
- Cada push a `main` de `efeonce-rooms` publica producción: el trabajo vive en rama.

## Normative Docs

- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md` (sección «Aprobación 2026-10-29»)
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- Canvas aprobado: `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d` (leer con la herramienta Artifact, acción `read`)

## Dependencies & Impact

### Depends on

- `@efeoncepro/axis-tokens@0.6.10` ya instalado en `efeonce-rooms` (expone `efeonceGraphicLine.orbit`, `.motion`, `.color`; verificado 2026-10-30).
- Fuentes `@fontsource-variable/bricolage-grotesque@5.3.0` y `@fontsource/poppins@5.3.0` ya instaladas.
- Rama `codex/rooms-design-integration@de38af5` (backend local verificado).

### Blocks / Impacts

- TASK-2059 (sala), TASK-2068 (invitación) y TASK-2071 (pieza, autoría) consumen estas primitivas.
- TASK-2080 (contrato backend de la UI aprobada) corre en paralelo; no hay dependencia de archivos.

### Files owned

- `../efeonce-rooms/src/styles/theme.ts` (solo las variables nuevas)
- `../efeonce-rooms/src/domain/orbit-geometry.ts`
- `../efeonce-rooms/src/components/orbit/**`
- `../efeonce-rooms/src/app/demo/base/**`
- `../efeonce-rooms/src/lib/copy/rooms.ts` (namespace `lab`)
- `../efeonce-rooms/tests/orbit-geometry.test.ts`, `../efeonce-rooms/tests/orbit-foundation.spec.ts`
- `scripts/frontend/scenarios/rooms-orbit-foundation.scenario.ts`
- `docs/ui/wireframes/TASK-2079-rooms-orbit-foundation.md`, `docs/ui/flows/TASK-2079-rooms-orbit-foundation-flow.md`, `docs/ui/motion/TASK-2079-rooms-orbit-foundation-motion.md`, `docs/ui/reviews/TASK-2079-rooms-orbit-foundation/`

## Current Repo State

### Already exists

- `../efeonce-rooms/src/styles/theme.ts`: adapter nativo con `--room-ink/paper/navy/accent`, fuentes, spacing y `axisMotion` básico.
- `../efeonce-rooms/src/components/room-motion.tsx`: View Transitions de React 19 para capítulos y piezas, con guardia de movimiento reducido.
- `../efeonce-rooms/src/app/demo/**`: demo sintética rotulada.
- `scripts/frontend/scenarios/rooms-first-experience.scenario.ts`: patrón GVC contra `127.0.0.1:3210`.

### Gap

- No hay componente de órbita, halo, cámara, iris, parallax ni grano.
- El adapter no expone `ground`, `halo` ni las curvas arrive/transform/exit de La órbita.
- No hay geometría compartida: cada pantalla del canvas calculó sus ángulos a mano.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-rooms` (repo runtime propio): `src/components/orbit/**`, `src/domain/orbit-geometry.ts`
- Future candidate home: `ui-package`
- Boundary: primitivas de presentación sin datos; consumidores autorizados: páginas de `efeonce-rooms`. Pasan a AXIS solo si un segundo producto las necesita
- Server/browser split: geometría pura browser-safe en `src/domain`; componentes con islas cliente solo donde hay animación o puntero
- Build impact: none (sin dependencias nuevas)
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: equipo que implementa las pantallas de Rooms; indirectamente, comprador e invitado.
- Momento del flujo: antes de cualquier pantalla de comprador.
- Resultado perceptible esperado: la órbita, el halo y los saltos se ven y se mueven igual que en el canvas aprobado, en todas las pantallas.
- Friccion que debe reducir: reimplementaciones divergentes de la órbita y errores de marca repetidos.
- No-goals UX: pantallas de comprador, datos reales, navegación de producto.

### Surface & system decision

- Surface: laboratorio sintético `/demo/base` en `efeonce-rooms`.
- Nav placement: `none` — no agrega destino al producto; solo accesible por URL dentro de `/demo`.
- Composition Shell: `no aplica` — Rooms es otro repo, sin el shell de Greenhouse.
- Primitive decision: `new` — Orbit, OrbitHalo, CameraWorld, IrisReveal, DepthLayers/Grain (dominio Rooms).
- Adaptive density / The Seam: `no aplica` — primitivas sin densidad de datos.
- Floating/Sidecar/Dialog decision: el iris envuelve un `<dialog>` nativo.
- Copy source: `../efeonce-rooms/src/lib/copy/rooms.ts` (namespace `lab`).
- Access impact: `none`.

### State inventory

- Default: regiones completas con los valores del token.
- Loading: SSR sin fetch; captura espera fuentes.
- Empty: órbita que mide en 0 → solo anillo y «Sin datos de recorrido».
- Error: cae en `src/app/error.tsx` existente.
- Degraded / partial: sin WAAPI o View Transitions → cortes directos, mismo estado final.
- Permission denied: no aplica (ruta pública sintética).
- Long content: no aplica; textos del laboratorio cortos.
- Mobile / compact: radios del canvas móvil; fila de estaciones con scroll propio.
- Keyboard / focus: estaciones con `aria-current`; foco al título destino; iris con Escape y retorno de foco.
- Reduced motion: cortes directos en todo salvo el grano.

### Interaction contract

- Primary interaction: elegir capítulo (salto orbital) y abrir/cerrar mapa.
- Hover / focus / active: estados de `@efeoncepro/axis-ui-primitives`; foco visible `--room-outline`.
- Pending / disabled: sin estados pendientes (no hay red).
- Escape / click-away: Escape cierra iris y vuelve de una escena al mapa.
- Focus restore: al botón que abrió el iris; al título destino tras el salto.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `CSS` + Web Animations API; View Transitions solo para rutas.
- Enter / exit: dibujo de órbita (anillo, arco, esfera, halo); iris abrir/cerrar.
- Layout morph: salto orbital en dos fases y mapa.
- Stagger: anillo → arco → esfera → halo, con los tiempos del contrato de motion.
- Timing / easing token: `efeonceGraphicLine.motion.curves` sobre `axisMotion.ease`.
- Reduced-motion fallback: cortes directos.
- Non-goal motion: rotación o pulso de la órbita, loaders, animación del lockup.

### Implementation mapping

- Route / surface: `../efeonce-rooms/src/app/demo/base/page.tsx`.
- Primitive / variant / kind: Orbit (`draw: once|static`, `measure`, `stations`), OrbitHalo, CameraWorld (`scene|map`), IrisReveal, DepthLayers, Grain.
- Component candidates: `src/components/orbit/{orbit,orbit-halo,camera-world,iris-reveal,depth,motion}.tsx|ts`.
- Copy source: `../efeonce-rooms/src/lib/copy/rooms.ts`.
- Data reader / command: ninguno.
- API parity: no aplica — no hay acción de negocio.
- Access / capability: la de `/demo`.
- States to implement: ready, empty (fracción 0), partial (sin APIs de animación), reduced motion, mobile.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/rooms-orbit-foundation.scenario.ts`.
- Route: `/demo/base` con `AGENT_AUTH_BASE_URL=http://127.0.0.1:3210`.
- Viewports: 1440×900, 390×844, 320×740.
- Quality profile: premium
- Required steps: fuentes; volver a dibujar; fracción 3/5; salto 01→03; mapa; iris; repetir con movimiento reducido.
- Required captures: una por región y viewport; final del salto y del mapa.
- Required `data-capture` markers: `orbit-canonical`, `orbit-measure`, `orbit-stations`, `camera-world`, `iris`, `depth-grain`.
- Assertions: fuentes calculadas; halo `userSpaceOnUse` con radio 1,86×; arco 200°–250°; ningún texto cruza el anillo.
- Scroll-width checks: `scrollWidth <= clientWidth` en todos los estados.
- Reduced-motion / focus evidence: capturas con `reduce` y foco tras salto e iris.
- Review dossier: `docs/ui/reviews/TASK-2079-rooms-orbit-foundation/`.
- Baseline decision / surface ID: `rooms.orbit-foundation`, candidata hasta revisión humana.

### Design decision log

- Decision: primitivas propias de Rooms con valores de AXIS y motion sin librerías nuevas.
- Alternatives considered: Motion (framer) o GSAP; dibujar la órbita por pantalla.
- Why this pattern: una sola fuente evita repetir los errores de marca corregidos por el operador y no suma peso.
- Reuse / extend / new primitive: new (dominio Rooms); extend del adapter existente.
- Open risks: rendimiento del grano en móviles; mitigación con textura pregenerada.

### Visual verification

- GVC scenario: `rooms-orbit-foundation`.
- Viewports: 1440×900, 390×844, 320×740.
- Required captures: las del plan GVC.
- Required `data-capture` markers: los del plan GVC.
- Scroll-width check: sí, todos los estados.
- Accessibility/focus checks: axe sin violaciones; foco tras salto e iris; nombres accesibles de estaciones.
- Before/after evidence: no hay "antes" (superficie nueva); comparación contra el canvas aprobado lado a lado.
- Known visual debt: ninguna declarada al crear.
- Visual scorecard: `docs/ui/reviews/TASK-2079-rooms-orbit-foundation.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Adapter y geometría

- Extender `src/styles/theme.ts` con `--room-ground`, `--room-halo`, curvas arrive/transform/exit y overshoot desde AXIS.
- `src/domain/orbit-geometry.ts` con funciones puras y `tests/orbit-geometry.test.ts` (arco canónico 200°–250°, arco por fracción, estaciones −90°+72°·k, radio del halo 1,86×, posiciones de cámara del canvas).

### Slice 2 — Órbita y halo

- `Orbit` (dibujo una vez o estático, modo medida, estaciones) y `OrbitHalo`; contrato de motion en `motion.ts`.

### Slice 3 — Cámara, iris y fondo

- `CameraWorld` con salto en dos fases, cancelación y modo mapa; `IrisReveal` sobre `<dialog>`; `DepthLayers` y `Grain`.

### Slice 4 — Laboratorio y evidencia

- `/demo/base`, copy `lab`, escenario GVC, spec Playwright, dossier y scorecard.

## Out of Scope

- Pantallas de comprador (sala, invitación, pieza): TASK-2059, TASK-2068, TASK-2071.
- Capítulos, progreso persistido o cualquier dato nuevo: TASK-2080.
- Reemplazo de la fixture Nómada por volta: lo hace TASK-2059 al construir la sala.
- Publicar primitivas en AXIS.
- Push a `main`, deploy o flags.

## Detailed Spec

Valores y tiempos exactos: [wireframe](../../ui/wireframes/TASK-2079-rooms-orbit-foundation.md) y
[contrato de motion](../../ui/motion/TASK-2079-rooms-orbit-foundation-motion.md). La referencia visual por
primitiva está en el canvas: la órbita canónica y el halo en `Invitacion.dc.html` (radio 330, centro 720×400);
la cámara, el salto y el mapa en `Main.dc.html` (transform `translate(720px,386px) scale(s) translate(-cx,-cy)`,
mapa a 0,18, anillo de mapa r 820); el iris en `Audiencia.dc.html`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. Los componentes no se escriben antes de que la geometría tenga tests verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un push accidental a `main` publica la rama en producción | release Rooms | low | Trabajo en `claude/rooms-orbit-foundation`; `git log origin/main..HEAD` antes de cualquier push; sin push en esta task | Vercel crea un deploy de producción no esperado |
| Valores de marca copiados a mano divergen de AXIS | UI | medium | Assertions GVC sobre halo y arco; revisión con la skill de La órbita | Diferencia visible contra el canvas |
| Grano costoso en móviles | UI | medium | Medir; textura WebP de respaldo | Cuadros > 16 ms |

### Feature flags / cutover

- Sin flag: ruta sintética de demostración y componentes sin consumidor de producción hasta TASK-2059.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el commit en la rama | minutos | sí |
| Slice 2 | Revertir el commit en la rama | minutos | sí |
| Slice 3 | Revertir el commit en la rama | minutos | sí |
| Slice 4 | Revertir el commit en la rama | minutos | sí |

### Production verification sequence

- No llega a producción en esta task. La publicación ocurre con el primer consumidor (TASK-2059) y su propia autorización.

### Out-of-band coordination required

- Codex mantiene el backend en `codex/rooms-design-integration`; esta rama parte de ahí y no toca `src/server/**` ni migraciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Ningún componente de `src/components/orbit/**` contiene hex, curvas `cubic-bezier` o duraciones literales; todo sale del adapter o de `motion.ts`.
- [ ] `tests/orbit-geometry.test.ts` cubre arco canónico, arco por fracción, estaciones, halo y posiciones de cámara, y pasa.
- [ ] El halo renderizado es un `radialGradient` con `gradientUnits="userSpaceOnUse"`, radio 1,86× el anillo y paradas 0,13 / 0,03 / 0.
- [ ] La órbita no tiene ninguna animación continua (sin `infinite`, sin rotación).
- [ ] Con `prefers-reduced-motion: reduce`, dibujo, salto, mapa, iris y parallax cambian sin transición y llegan al mismo estado.
- [ ] Tras el salto, el foco queda en el título de la escena destino; tras cerrar el iris, en el botón que lo abrió.
- [ ] Dos clics rápidos en estaciones distintas terminan en la segunda, sin saltos encolados.
- [ ] GVC premium en 1440×900, 390×844 y 320×740 sin scroll horizontal y con axe sin violaciones.
- [ ] Scorecard con promedio ≥ 4,5, piso 4 y fidelidad ≥ 4,5.
- [ ] `pnpm verify` de `efeonce-rooms` pasa en la rama.
- [ ] `UI ready: yes` se mantiene con `pnpm task:lint --task TASK-2079` sin findings.

## Verification

- `efeonce-rooms`: `pnpm verify`, `pnpm test:e2e -- orbit-foundation`
- Greenhouse: `AGENT_AUTH_BASE_URL=http://127.0.0.1:3210 pnpm fe:capture rooms-orbit-foundation --env=local` con `pnpm dev` de Rooms corriendo
- `pnpm task:lint --task TASK-2079`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado con rama, SHA y evidencia, y espejo `.codex` sincronizado.

## Follow-ups

- TASK-2059, TASK-2068 y TASK-2071 consumen estas primitivas cuando TASK-2080 entregue sus datos.
- Promover a AXIS si un segundo producto las necesita.
