# TASK-1964 — Login V4 premium y transición de acceso «La lente te lleva adentro»

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1964-login-v4-premium-access.md`
- Flow: `docs/ui/flows/TASK-1964-login-v4-premium-access-flow.md`
- Motion: `docs/ui/motion/TASK-1964-login-v4-premium-access-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `En develop y desplegado en staging (2026-10-02; commits 4b32cbe4b, 52196aa9e, 9ebf58ac3, 2098e9845, 300a2e030). Localhost: GVC auth-login-v4 sin hallazgos de axe/layout/consola en 1440×960 y 390×844 (1280×800 agregado después, sin re-correr); error de credenciales (401 → alerta con foco) y login válido del agente (/login → apertura de la lente → /auth/landing → /home) probados. pnpm build verde una vez (tras 4b32cbe4b); typecheck, lint y ui:code-lint --changed verdes en cada commit. Fotos del escenario ya producidas. Pendiente: copy de la respuesta en 1–3 palabras y kicker como pregunta del cliente, anillo de Escalar producción cortado en 1440, capturas de error/banner/sin novedades/reduced motion y scorecard, GVC en staging (bloqueado por Vercel SSO en modo anónimo), OrbitLoader visible sin confirmar, aborto no capturado de la view transition en el helper compartido (tarea aparte), pnpm test completo.`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1963`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza el login actual (panel navy con tarjetas de valor + formulario Vuexy) por el **V4 premium** aprobado el 2026-10-02: formulario sobre papel con Efeonce como marca principal y Greenhouse como sello secundario, y un escenario fotográfico con la Lente de «La órbita» donde rota un carrusel de novedades (texto o banner) servido por el reader de TASK-1963. Suma la transición de acceso aprobada en el prototipo: botón con mini órbita, la lente que se abre hacia el portal con el logo Efeonce como elemento compartido, y un `OrbitLoader` de marca en `/auth/landing`.

## Delta 2026-10-02

- Implementado en `develop` y desplegado en staging (`dev-greenhouse.efeoncepro.com`): `4b32cbe4b` (implementación), `52196aa9e` (escenarios Sunburst, anclaje de la lente e identidad del equipo), `9ebf58ac3` (piel real con casting anclado), `2098e9845` (anillo y esfera en la voz), `300a2e030` (Escalar producción con órbita de luz).
- Lente reconstruida al canon de AXIS (`paintGraphicLine` / resolver de la lente): anillo con aire `orbit.ringAirRatio` (1,12× el radio de la foto), foto interior ampliada ×`lens.zoom` (1,25; antes se aplicaba mal como saturación), trazos y esfera escalados por ancho (`lens.anatomy` × ancho/794 con pisos `orbit.*Px`), arco de 50° centrado en `upper-start` (ángulo derivado de `AXIS_GRAPHIC_LINE_POSITION_DEGREES`) y acento por línea de servicio (`lineAccentOnDark`). Corregido: `vector-effect: non-scaling-stroke` + `pathLength` partía el arco en dos tramos.
- La lente se ancla al punto de la foto con `object-position: x% y%` (con `cover` el recorte cambia entre proporción 1,06 y 1,5 y la lente se corría del sujeto).
- Novedad sin `lens` (foto en registro cine): se muestra a color entero y sin lente, porque la luz de la escena ya es la órbita de la pieza (una órbita por pieza).
- Voz (pedido del operador): el kicker lleva el anillo pequeño delante (0,42 em, trazo máx(1 px, 0,06 em), 0,35 em de aire; receta `question` de AXIS) y el titular cierra con la esfera (0,20 em sobre la línea base con el aire óptico de la última letra, `efeonceGraphicLine.sphere`; se quita el punto tipeado), ambos en el acento de la línea.
- Accesibilidad: avisos de proveedor SSO pasan de `Alert` warning (texto 1,5:1) a aviso discreto con texto `text.secondary`; texto de la alerta de error en `text.primary` (el Alert del theme daba ~3,5:1 sobre el papel); enlaces sueltos con área táctil ≥ 24 px.
- Fotos generadas con `pnpm foto:generar` (gpt-image-2.5-sunburst) desde fichas en `ai-generations/2026-10-02_login-escenario/fichas/` revisadas por `cine-reviewer`; casting anclado a retratos con la receta de piel v3 (el operador rechazó las primeras por piel «muy IA»). El bloqueo de release por fotos de referencia queda resuelto.
- GVC `scripts/frontend/scenarios/auth-login-v4.scenario.ts` (anónimo): en staging no captura porque el modo anónimo no envía bypass y Vercel SSO lo bloquea.
- En frío se vio pantalla en blanco ~30 s entre `/auth/landing` y `/home` (compilación dev); en caliente no se confirmó si el `OrbitLoader` se ve.
- `src/lib/motion/view-transition.ts` deja un `InvalidStateError` sin capturar al abortar la transición; se propuso como tarea aparte.

## Why This Task Exists

El login actual usa el lenguaje AXIS anterior (degradados, círculos decorativos, tarjetas de valor fijas) y no tiene espacio para comunicar novedades. «La órbita» es el sistema que irá desplazando a AXIS (decisión del operador 2026-10-02) y el login es la primera impresión del producto: debe ser premium, con Efeonce como protagonista, priorizar el ingreso en móvil y sumar un canal de cross selling gobernado. El estado post-login (`CircularProgress` + «Preparando tu espacio de trabajo») tampoco tiene identidad.

## Goal

- Login V4 en desktop y móvil, fiel a los artboards aprobados, con todos los estados existentes (SSO, degradado, error, magic link, olvido de contraseña).
- Carrusel de novedades accesible sobre la foto con lente, alimentado por `listActiveLoginAnnouncements`.
- Transición de acceso con View Transitions y `OrbitLoader` reutilizable, con reduced motion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Valores de la lente y del motion desde `efeonceGraphicLine` (`@efeoncepro/axis-tokens`), nunca transcritos a mano.
- Logos desde los archivos oficiales ya verificados (`public/branding/logo-full.svg`).
- Copy visible en `src/lib/copy/client-portal.ts`; cero literales nuevos en JSX.
- Se conserva la lógica de auth existente: `resolveSafeCallbackUrl`, sondeo `/api/auth/health`, mapeo de errores, magic link.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1963` — reader `listActiveLoginAnnouncements` y DTO público.
- `src/lib/motion/view-transition.ts` (`startViewTransition`), `next.config.ts` (`experimental.viewTransition: true`).

### Blocks / Impacts

- `TASK-1834` — la pantalla del issuer Efeonce ID debería adoptar esta dirección (delta registrado).
- `TASK-032` (dark mode del login anterior) y `TASK-233` (logo 3D en el login) quedan reemplazadas por esta dirección.

### Files owned

- `src/views/Login.tsx`
- `src/views/login/**`
- `src/components/greenhouse/motion/OrbitLoader.tsx`
- `src/app/(blank-layout-pages)/login/page.tsx`
- `src/app/auth/landing/loading.tsx`
- `src/lib/copy/client-portal.ts` (claves `login_*`)
- `public/images/login/**`

## Current Repo State

### Already exists

- `src/views/Login.tsx` con SSO Microsoft/Google, sondeo de salud de proveedores, credenciales, magic link y pantalla de transición.
- `src/views/login/GreenhouseBrandPanel.tsx`, `LoginValueCard.tsx`, `login-constants.ts` (panel anterior).
- View Transitions habilitado y helper `startViewTransition`; grupos ya definidos para hiring y Nexa en `src/app/globals.css`.

### Gap

- No existe la dirección V4, ni carrusel, ni lente, ni loader de marca, ni transición de acceso.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/Login.tsx` + `src/views/login/**` + `src/components/greenhouse/motion/OrbitLoader.tsx`
- Future candidate home: `portal`
- Boundary: la vista consume el DTO de TASK-1963 por props desde la página server; `OrbitLoader` es primitive reutilizable del portal.
- Server/browser split: `page.tsx` (server) lee novedades; `Login.tsx` y el carrusel son client components.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente externo y colaborador interno que entra al portal.
- Momento del flujo: entrada al producto y transición hasta el home.
- Resultado perceptible esperado: un ingreso premium, rápido y claramente de Efeonce; las novedades se descubren sin estorbar.
- Friccion que debe reducir: pantallas genéricas, spinner sin identidad, formulario lejos del pulgar en móvil.
- No-goals UX: no agregar pasos al login, no bloquear el ingreso con animación.

### Surface & system decision

- Surface: `/login` y `/auth/landing` (estado de carga).
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — ruta `blank-layout` de autenticación fuera del shell del portal.
- Primitive decision: `new` — `OrbitLoader` (primitive de motion reutilizable); `one-off` — composición del login y carrusel.
- Adaptive density / The Seam: `no aplica` — pantalla de autenticación de una sola columna/escena.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `src/lib/copy/*`
- Access impact: `none`

### State inventory

- Default: formulario listo; escenario con la primera novedad.
- Loading: botón «Validando acceso» con mini órbita; SSO «Redirigiendo a …»; post-login `OrbitLoader`.
- Empty: sin novedades → foto por defecto con lente, sin texto ni pestañas.
- Error: alerta con el error mapeado y foco en ella.
- Degraded / partial: proveedor degradado o sin configurar → botón deshabilitado + aviso.
- Permission denied: `AccessDenied` → mensaje de cuenta sin acceso.
- Long content: titulares de novedad truncan a 3 líneas; banner sin texto superpuesto.
- Mobile / compact: formulario primero, novedad como tarjeta debajo.
- Keyboard / focus: orden logo → SSO → campos → enlaces → Entrar → carrusel; pestañas y pausa operables con teclado.
- Reduced motion: sin Ken Burns, lente estática, carrusel en pausa, sin view transition.

### Interaction contract

- Primary interaction: ingresar con SSO o credenciales.
- Hover / focus / active: tokens de hover; foco visible con anillo del tema.
- Pending / disabled: todos los controles se deshabilitan mientras hay una autenticación en curso.
- Escape / click-away: no aplica.
- Focus restore: tras error, foco a la alerta; tras cerrar la alerta, foco al primer campo con error.
- Latency feedback: mini órbita en el botón desde el primer frame.
- Toast / alert behavior: alertas inline (`role="alert"`), sin toasts.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: ver `docs/ui/motion/TASK-1964-login-v4-premium-access-motion.md` (M1–M11).
- Layout morph: logo Efeonce compartido por `view-transition-name`.
- Stagger: texto de la novedad (+150 ms).
- Timing / easing token: `efeonceGraphicLine.motion` y `motion-tokens.ts`.
- Reduced-motion fallback: estados finales sin animación.
- Non-goal motion: parallax, partículas, 3D.

### Implementation mapping

- Route / surface: `src/app/(blank-layout-pages)/login/page.tsx`, `src/app/auth/landing/loading.tsx`.
- Primitive / variant / kind: `OrbitLoader` (`size: sm|lg`, `tone: light|dark`).
- Component candidates: `LoginV4`, `LoginStage` (escenario + carrusel), `LoginLens`.
- Copy source: `src/lib/copy/client-portal.ts`.
- Data reader / command: `listActiveLoginAnnouncements` (TASK-1963).
- API parity: el login lee el mismo reader que `GET /api/public/login-announcements`.
- Access / capability: ninguna para leer.
- States to implement: los del inventario.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/auth-login-v4.scenario.ts`
- Route: `/login`
- Viewports: 1440×960, 1280×800, 390×844
- Quality profile: `premium`
- Required steps: carga, foco en email, error de credenciales, cambio de novedad, pausa.
- Required captures: default desktop, default móvil, error, validando, banner, sin novedades.
- Required `data-capture` markers: `login-form`, `login-stage`, `login-carousel`.
- Assertions: sin scroll horizontal; botón Entrar visible sin scroll en 390×844.
- Scroll-width checks: `document.documentElement.scrollWidth <= innerWidth`.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`.
- Review dossier: `docs/ui/reviews/TASK-1964-login-v4-premium-access.scorecard.json`
- Baseline decision / surface ID: `auth-login-v4`

### Design decision log

- Decision: V4 premium (papel + foto con Lente + novedades sobre la imagen).
- Alternatives considered: V1 oscuro con voz «¿Dónde está todo? Aquí», V3 recepción con órbita y logo dentro; descartadas por el operador por falta de carácter premium y por priorizar el login en móvil.
- Why this pattern: la foto da el momento visual dominante; la Lente aporta la órbita completa y es la única excepción legítima al «nunca scrim» para leer texto sobre foto.
- Reuse / extend / new primitive: nuevo `OrbitLoader`; resto one-off.
- Open risks: (resuelto 2026-10-02: las fotos ya son producidas) la guía de La órbita aún dice que la línea no va en la interfaz de Greenhouse (actualizar AXIS).

### Visual verification

- GVC scenario: `auth-login-v4`
- Viewports: 1440×960, 1280×800, 390×844
- Required captures: ver GVC scenario plan.
- Required `data-capture` markers: `login-form`, `login-stage`, `login-carousel`.
- Scroll-width check: sí.
- Accessibility/focus checks: orden de foco, `aria-current` en pestañas, pausa operable.
- Before/after evidence: captura del login anterior y del V4.
- Known visual debt: anillo de la órbita de Escalar producción cortado en 1440; copy de la respuesta en 4–5 palabras (objetivo 1–3) y kicker como etiqueta en vez de pregunta del cliente.
- Visual scorecard: `docs/ui/reviews/TASK-1964-login-v4-premium-access.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Login V4

- Página server lee novedades y las pasa a la vista.
- `LoginV4` (formulario) con todos los estados actuales y copy en `src/lib/copy`.
- `LoginStage` con foto, Lente desde tokens, carrusel accesible (texto y banner) y estado vacío.
- Fotos de referencia en `public/images/login/`.

### Slice 2 — Transición de acceso

- `OrbitLoader` primitive + `src/app/auth/landing/loading.tsx`.
- Mini órbita en el botón; `startViewTransition` en el redirect de credenciales; CSS de la view transition (`clip-path` desde la lente y logo compartido).

### Slice 3 — Limpieza y evidencia

- Retirar `GreenhouseBrandPanel`, `LoginValueCard` y constantes que queden sin uso; copy `login_vp_*` deprecado.
- GVC desktop + 390 px, scorecard.

## Out of Scope

- La fuente de datos de novedades (TASK-1963) y su administración visual.
- El redirect a Efeonce ID (TASK-1834).
- Fotos producidas finales (bloqueo de release).

## Detailed Spec

- Backend impact `none` — rationale: esta task sólo consume el reader de TASK-1963 desde la página server; no crea tablas, rutas ni commands.
- `page.tsx` (server): `const announcements = await listActiveLoginAnnouncements()`; pasa `announcements` a `<Login />` junto a `hasMicrosoftAuth`/`hasGoogleAuth`.
- `LoginV4` conserva `resolveSafeCallbackUrl`, el sondeo `/api/auth/health`, `mapAuthError` y los enlaces `/auth/forgot-password` y `/auth/magic-link`.
- `LoginStage` recibe `announcements: LoginAnnouncementDto[]` y una foto por defecto; la Lente usa `efeonceGraphicLine.lens.outside` (filtro exterior) y `lens.anatomy` (trazos, opacidad, barrido y esfera) escalados al radio.
- `OrbitLoader`: SVG con anillo (opacidad de `orbit`), estela de 50° y esfera; gira con `@keyframes` y se detiene con reduced motion.
- Apertura del acceso: `LoginAccessTransition` (capa de papel con `clip-path: circle()` desde el centro de la lente activa, calculado en la ventana) y después `startViewTransition` para el cambio de ruta con el cross-fade root existente; `/auth/landing` repite la escena (papel, logo y `OrbitLoader`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1963 (reader) → Slice 1 → Slice 2 → Slice 3. Slice 1 tolera reader vacío.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión en el ingreso (SSO/credenciales) | identity | medium | se conserva la lógica de auth existente sin cambios; smoke de los tres métodos | `auth smoke` / Sentry `identity` |
| La animación oculta el formulario | UI | low | sin `opacity: 0` base; formulario visible por defecto | revisión visual |
| View transition falla en navegadores sin soporte | UI | low | el helper hace fallback síncrono | — |
| Fotos IA en producción | content | low | resuelto 2026-10-02: fotos producidas con fichas revisadas | checklist de release |

### Feature flags / cutover

- Sin flag — reemplazo directo de la vista en develop; la validación es local-first y en staging antes del release. Revert del PR restaura el login anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | < 10 min | sí |
| Slice 2 | revert PR | < 10 min | sí |
| Slice 3 | revert PR | < 10 min | sí |

### Production verification sequence

1. Localhost: `/login` desktop y 390 px, los tres métodos de ingreso, error, magic link.
2. Staging: smoke de auth con el usuario agente + GVC.
3. Producción con el release (fotos producidas desde 2026-10-02).

### Out-of-band coordination required

- Fotos producidas para el escenario: hechas 2026-10-02 (`pnpm foto:generar`, fichas revisadas por `cine-reviewer`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `/login` desktop muestra formulario centrado sobre papel con logo Efeonce, bajada, SSO, credenciales, olvido de contraseña, magic link, nota y sello Greenhouse al pie.
- [x] El escenario muestra la novedad activa con la Lente cuyos valores salen de `efeonceGraphicLine.lens`.
- [ ] El carrusel soporta `text` y `banner`, se pausa con hover/foco, tiene botón de pausa y pestañas con `aria-current`, y arranca pausado con reduced motion.
- [ ] Sin novedades, el escenario muestra la foto por defecto sin texto ni pestañas.
- [x] En 390×844 el botón Entrar es visible sin scroll y la novedad baja como tarjeta.
- [ ] Todo el copy visible nuevo vive en `src/lib/copy/client-portal.ts`.
- [ ] El ingreso por credenciales usa `startViewTransition` y `/auth/landing` muestra `OrbitLoader`. (Login válido probado en localhost con la apertura de la lente; no se confirmó que el `OrbitLoader` se vea.)
- [ ] Ningún elemento depende de su animación para ser visible.
- [x] Sin scroll horizontal en los tres viewports.
- [ ] `UI ready` queda en `no` hasta tener mapping, plan GVC y decision log completos con evidencia; `pnpm task:lint --task TASK-1964` sin hallazgos.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm local:check:ui`
- `pnpm dev` + revisión en localhost desktop y 390 px

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-032` y `TASK-233` marcadas como reemplazadas y delta en `TASK-1834`.

## Follow-ups

- Adoptar la dirección V4 en la pantalla de Efeonce ID (TASK-1834).
- Corregir el `InvalidStateError` sin capturar al abortar la transición en `src/lib/motion/view-transition.ts` (tarea aparte).
- Transiciones adicionales del acceso (el operador las pidió para después).
- Actualizar la guía de La órbita en AXIS para permitir la interfaz de Greenhouse.

## Open Questions

- ¿El loader de marca se extiende a los demás `loading.tsx` principales del portal o queda sólo en el acceso?
