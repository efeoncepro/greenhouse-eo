# TASK-1422 — Vacancy AI Draft Drawer Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1422 — Vacancy AI draft UI (propose→confirm del copy público en el Publication Desk)`
- Related wireframe: [docs/ui/wireframes/TASK-1422-vacancy-ai-draft-drawer.md](../wireframes/TASK-1422-vacancy-ai-draft-drawer.md)
- Related flow: [docs/ui/flows/TASK-1422-vacancy-ai-draft-flow.md](../flows/TASK-1422-vacancy-ai-draft-flow.md)
- Motion type: `microinteraction` (drawer + transiciones de paso + progreso; sin sistema nuevo)
- Primary primitive / library: keyframes route-local del Hiring Desk (`ghHiring*` en `HiringDeskFrame`) + transiciones MUI del `Drawer`; CERO GSAP nuevo, CERO framer-motion
- Copy source: `hiringDesk.publication.vacancyAi.*`

## Motion Brief

- Primary user: reclutador revisando/aplicando el borrador IA del aviso.
- Motion intent: (1) continuidad espacial — el drawer entra desde el borde derecho como todo drawer del desk; (2) reducción de incertidumbre — el paso `proposing` comunica que un proceso de ~10–30 s está vivo (progreso + skeleton), y la llegada del borrador se REVELA (no aparece de golpe); (3) causalidad — aplicar/descartar dan feedback inmediato en el botón y cierre coherente.
- Uncertainty reduced: "¿se está generando o se colgó?" (progreso indeterminado + copy `proposing` + skeleton con la forma del form final).
- User decision supported: leer y editar con calma; el motion nunca apura ni distrae del contenido del borrador.
- Non-goals: celebraciones, sparkles animados, typing-effect del texto IA (el borrador llega completo del backend; simular streaming sería deshonesto), morphs de layout.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Drawer | abrir/cerrar | slide-in desde right (patrón desk `ghHiringDrawer`), exit por transición MUI del Drawer | MUI Drawer + keyframe existente | sí |
| Contenido del paso (generate/review) | cambio de paso | entrada `ghHiringUp` (fade+rise 8px) del bloque del paso | keyframe existente reutilizado | sí |
| Skeleton proposing | mientras `proposing` | shimmer estándar MUI (1.5s linear) con la forma del form final | MUI `Skeleton` (theme Vuexy) | sí |
| LinearProgress | `proposing` | indeterminate estándar MUI | MUI | sí |
| Banner IA (Alert sparkles) | llegada del borrador | entra junto con el bloque review (`ghHiringUp`), sin animación propia | keyframe existente | no (decorativo-informativo) |
| Botón Aplicar/Generar | `confirming`/`proposing` submit | swap a `CircularProgress size=16` como leadingIcon + disabled (patrón desk) | patrón existente | sí |
| Dialog descarte | abrir | `ghHiringPop` (scale 0.96→1) + backdrop `ghHiringFade` (patrón desk) | keyframes existentes | sí |
| Toast resultado | applied/discarded | `ghHiringToast` (patrón desk) | keyframe existente | sí |
| CTA "Revisar borrador pendiente" | pending | SIN pulso ni glow — el cambio de label + chip es el señalizador (motion-independent meaning) | — | n/a |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA Redactar con IA | secondaryAction estándar | hover MUI (theme) | focus ring instantáneo | press MUI | — | disabled+tooltip (flag OFF) | — |
| Botón Generar/Aplicar | primaryAction | hover theme | focus ring | press | — | spinner leadingIcon + disabled | toast / Alert |
| Campos del form | CustomTextField theme | theme | ring + label | — | — | — | error inline `role=alert` sin animación |
| Drawer close (X) | icon button | theme | ring | — | — | disabled en confirming | — |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Drawer open | closed | generate/review | `ghHiringDrawer` (320ms, curva emphasized del desk `cubic-bezier(.2,0,0,1)` ya definida en el frame) | slide + fade | sin animación (guard existente del frame) |
| Drawer close | any | closed | transición default MUI Drawer (leave ~195ms accel) | slide-out | instantáneo |
| Paso generate → proposing | click Generar | proposing | `ghHiringUp` 260ms en el bloque de progreso | cross de bloques (unmount/mount) | swap instantáneo |
| Paso proposing → review | 201 ok | review | `ghHiringUp` 320ms en el bloque review (la "revelación" del borrador) | fade+rise del form completo (una sola pasada, sin stagger por campo) | swap instantáneo |
| Dialog descarte open | review | rejecting? | `ghHiringPop` 240ms + backdrop `ghHiringFade` 160ms | patrón desk | sin animación |
| Toast in | applied/discarded | — | `ghHiringToast` 240ms | patrón desk | sin animación |

Nota de token: las curvas/duraciones `ghHiring*` son el sistema aprobado del canvas Hiring Desk (TASK-355, fiel al HTML Claude Design); equivalen a `emphasized` + escala 200–400ms del DS. Esta task NO declara keyframes nuevos — solo reutiliza los del frame.

## Primitive & Token Mapping

- Primitive: keyframes `ghHiringDrawer/ghHiringUp/ghHiringPop/ghHiringFade/ghHiringToast` definidos una vez en `HiringDeskFrame` (route-local, con guard reduced-motion) + transiciones MUI theme.
- Imports allowed: nada nuevo — los keyframes se referencian por nombre en `sx` (patrón del desk); MUI `Skeleton`/`LinearProgress`/`CircularProgress`.
- Imports forbidden: `gsap` directo (lint `no-direct-gsap-in-views`), `framer-motion`, keyframes nuevos ad-hoc, `cubic-bezier` literales nuevos, duraciones fuera de la escala.
- Timing tokens: reuso de los del frame (260/320/240/160ms, dentro de la escala DS 200–400).
- Easing tokens: la curva del frame (equivalente `emphasized`).
- Layout animation: NINGUNA (nada de animar width/height; el drawer es composited transform del MUI Drawer).
- CSS properties: solo `transform` + `opacity` (los keyframes existentes ya cumplen).
- GSAP/Lottie justification: no aplica — no se usa.

## Reduced Motion Contract

- Detection: el guard `@media (prefers-reduced-motion: reduce)` ya existente en `HiringDeskFrame` anula los keyframes `ghHiring*`; los componentes MUI respetan el theme; el shimmer del Skeleton se detiene (comportamiento MUI/animación anulada por el guard global del frame si aplica — verificar en GVC).
- Replacement behavior: todos los pasos hacen swap instantáneo; el drawer abre/cierra sin slide.
- Meaning preserved: el progreso sigue comunicándose por `LinearProgress` (elemento con rol semántico) + copy `proposing` + `role=status` — el significado nunca depende del motion.
- Animations removed: slide del drawer, rise de pasos, pop del dialog, toast slide.
- Animations retained: `CircularProgress`/`LinearProgress` (comunican estado — categoría "Keep" del contrato).

## Accessibility & Feedback

- Focus visibility: rings del theme, instantáneos (sin fade-in).
- Keyboard activation: todos los triggers operables por teclado (botones reales).
- Live region / status behavior: `proposing` en contenedor `role="status" aria-live="polite"`; transición a review anuncia el banner; errores `role="alert"`.
- Color-independent state: pending/disabled/error siempre con texto+ícono, nunca solo color ni solo motion.
- Motion-independent meaning: la llegada del borrador se entiende sin el rise (el contenido cambia + anuncio SR).
- Error/destructive stability: Alerts de error SIN animación de entrada (estabilidad; categoría error calmada de state-design).

## Performance Guardrails

- Compositor-only properties: sí (transform/opacity en todos los keyframes reutilizados).
- Layout reads/writes: ninguno nuevo; sin JS de animación.
- Animation scope: contenido del drawer (elemento único por paso, sin stagger por campo — 9 campos staggered sería ruido y costo).
- Chart/counter constraints: n/a.
- Mobile constraints: drawer fullWidth usa la misma transición MUI; sin parallax ni blur.

## GVC / Micro Evidence

- Scenario: `task1422-vacancy-ai-draft`
- Scenario file: `scripts/frontend/scenarios/task1422-vacancy-ai-draft.yaml`
- Route: `/agency/hiring/publication` (dev local, flag ON, proposal sembrada)
- Viewports: 1440×900 + 390×844
- Required steps: abrir drawer (capturar el ciclo de entrada) → paso review → dialog descarte → cerrar (foco restaurado) → reduced-motion re-run
- Required captures: `drawer-open-cycle`, `drawer-review`, `drawer-discard-dialog`, `reduced-motion`
- Required frame labels: `open`, `review`, `discard`, `closed-focus-restore`, `reduced`
- Required `data-capture` markers: `hiring-vacancy-ai-drawer`, `hiring-vacancy-ai-cta`
- Assertions: sin console errors; sin layout shift del diff al abrir el drawer; foco correcto en frames
- Reduced-motion evidence: captura dedicada con reduce activo (drawer sin slide, skeleton sin shimmer)

## Design Decision Log

- Decision: reuso íntegro del sistema de motion route-local del Hiring Desk; cero motion nuevo.
- Alternatives considered: (a) `<Motion kind='panelEnter'>` del sistema GSAP global — descartado: el canvas del desk tiene su propio sistema aprobado (`ghHiring*`, contrato de fidelidad TASK-355) y mezclar dos motores en la misma superficie crea inconsistencia; (b) typing/streaming effect para el texto IA — descartado por deshonesto (el texto llega completo) y por costo de lectura; (c) stagger por campo en la revelación del review — descartado: 9 campos staggered = 700ms+ de espera artificial para leer.
- Why this pattern: continuidad total con lo que el usuario ya vio en Nueva demanda (drawer) y publicación (dialog/toast); la única pieza "nueva" es proposing, resuelta con los patrones canónicos skeleton+progress.
- Reuse / extend / new primitive: reuse.
- Open risks: que el guard reduced-motion del frame no cubra el shimmer del Skeleton MUI — se verifica en GVC y, si hace falta, se anula el shimmer bajo reduce en el sx del drawer.
- Follow-up: ninguno.

## Acceptance Checklist

- [x] The owning task declares this file in `Motion` when required.
- [x] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [x] Reduced-motion behavior preserves the same meaning.
- [x] Focus, selected, pending and error states do not rely on motion alone.
- [x] Imports use approved Greenhouse wrappers/primitives.
- [x] Performance guardrails avoid layout thrash and excessive animation.
- [x] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [x] Design decision log explains why this motion is needed and what was rejected.
