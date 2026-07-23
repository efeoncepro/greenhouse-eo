# TASK-1524 — Globe Commercial Login Cinematic Threshold

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1524-globe-commercial-login-cinematic-threshold.md`
- Flow: `docs/ui/flows/TASK-1524-globe-commercial-login-cinematic-threshold-flow.md`
- Motion: `docs/ui/motion/TASK-1524-globe-commercial-login-cinematic-threshold-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno; implementación ejecutable, rollout comercial gateado`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `task/TASK-1524-globe-commercial-login-cinematic-threshold`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplazar la puerta anónima internal-only de Globe por un Login comercial cinematográfico que presenta la
suite AI Gen antes de autenticar. La dirección `One Idea, Many Forms` usa una pieza audiovisual full-bleed,
poster y fallback estático para dramatizar una idea que se transforma en imagen, video y audio, manteniendo
copy y acceso disponibles desde el primer render.

## Why This Task Exists

`TASK-1455` resolvió un hito internal-only y su shell `Orbital Threshold` fue correcta para validar identidad,
pero hoy muestra copy de foundation, `Piloto interno`, `internal_smoke` y diagnóstico técnico. Globe ya se
define como producto comercial y necesita una primera puerta que venda su promesa sin parecer un OAuth test,
una landing genérica ni un showreel desconectado. El reto no es “poner un video de fondo”: es dirigir una
apertura de producto memorable sin degradar autenticación, LCP, accesibilidad, mobile o verdad comercial.

## Goal

- Convertir el Login en una apertura cinematográfica comercial con una acción primaria estable: entrar a Globe.
- Producir storyboard, animatic, master desktop/mobile y posters aprobados antes de cablear el video.
- Preservar OAuth/session/capabilities existentes y retirar lenguaje/diagnóstico internal-only del estado normal.
- Probar poster-first, progressive enhancement, pausa, reduced motion, ahorro de datos y cero overflow.
- Capturar y aprobar el first fold antes de completar estados y rollout.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Reglas obligatorias:

- Globe es un producto comercial y una plataforma hermana; su UI/brand runtime no hereda AXIS, Vuexy,
  CompositionShell ni primitives visuales Greenhouse.
- OAuth, PKCE, cookie, revalidación, access grants y redirect ownership no cambian en esta task.
- El CTA y copy funcional están disponibles sin esperar video, JS, audio ni una conexión rápida.
- El video es una mejora progresiva, no el LCP ni la única portadora de significado.
- El logo final usa el asset real; ningún modelo generativo dibuja wordmark o isotipo.
- Media, música, SFX, fuentes y outputs tienen provenance, derechos comerciales y aprobación humana.
- `TASK-1521` + `TASK-1480` gobiernan promoción comercial; esta task no habilita Production por sí sola.
- Un CDN, host de media o estrategia de front door nueva requiere revisar ADR; no se improvisa en UI.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/to-do/TASK-1523-globe-creative-suite-experience-logic.md`
- `docs/tasks/complete/TASK-1455-globe-internal-launch-brand-shell.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` como bar de calidad, no herencia visual.
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`
- `.codex/skills/modern-web-guidance/SKILL.md`
- `.codex/skills/motion-design/SKILL.md`
- `.codex/skills/motion-design-studio/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1454` — identidad federada, OAuth/PKCE/session y revocación existentes.
- `TASK-1455` — baseline visual y shell actual a reemplazar sin reabrir su historia.
- `TASK-1485` — gobernanza del Design System propio de Globe.
- `TASK-1523` — posicionamiento comercial y gramática de suite AI Gen.
- `TASK-1521` + `TASK-1480` — gates de rollout comercial; no bloquean diseño/implementación local.

### Blocks / Impacts

- Sustituye la experiencia anónima de `TASK-1455`; no modifica `/producer` ni Workbench.
- Define el patrón comercial de llegada a Globe y su primera impresión en desktop/mobile.
- Informa requisitos de media estática para el build/deploy de `studio-web`.

### Files owned

- `../efeonce-globe/apps/studio-web/src/ui.ts`
- `../efeonce-globe/apps/studio-web/src/app.ts` sólo para routing/render integration sin cambiar auth contract.
- `../efeonce-globe/apps/studio-web/src/app.test.ts`
- `../efeonce-globe/apps/studio-web/src/ui-bridge.test.ts`
- `../efeonce-globe/apps/studio-web/public/branding/**` sólo assets Globe aprobados/provenance.
- `../efeonce-globe/apps/studio-web/public/media/login/**` a crear con masters/posters versionados.
- `../efeonce-globe/apps/studio-web/README.md`
- `scripts/frontend/scenarios/globe-commercial-login.scenario.ts`
- `scripts/frontend/baselines/globe.commercial-login/**`
- `docs/ui/{visual-directions,wireframes,flows,motion,reviews}/TASK-1524*`
- Task/index/epic/handoff/changelog de cierre.

## Current Repo State

### Already exists

- `GET /` redirige sesiones vigentes a `/producer` y presenta `renderLaunchPage` a anónimos.
- `/auth/start` y callback federado existen; el success termina en `/producer`.
- `ui.ts` tiene HTML/CSS server-rendered, logo negativo/isotipo, CTA y estados denied/expired/error.
- Baselines `globe.internal-launch` cubren desktop/mobile y prueban la dirección `Orbital Threshold`.
- Producer ya materializa Image/Video/Audio bajo capabilities gobernadas; el Login puede expresar la suite sin
  exponer providers, slugs ni economía interna.

### Gap

- Copy inglés/internal: `Creative operations, ready to scale`, foundation y `Piloto interno`.
- Rail anónimo expone `internal_smoke`, identity bridge y correlation ID sin valor comercial.
- El stage es un isotipo estático sobredimensionado; no dramatiza una idea que cruza modalidades.
- No existen master audiovisual, poster-first loading, pause, data-saver o media provenance para el Login.
- La ruta de adquisición comercial secundaria y sus destinos reales deben mapearse antes de implementarse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web` con contratos/evidencia gobernados desde Greenhouse.
- Future candidate home: `portal`
- Boundary: `Login comercial anónimo y assets audiovisuales; OAuth/session y Creative Loop conservan sus owners`
- Server/browser split: `server decide sesión/redirect/error seguro; browser reproduce media pública decorativa y nunca recibe tokens, provider SDKs ni policy interna`
- Build impact: `masters WebM/MP4 y posters AVIF/WebP versionados, con budgets y provenance; sin WebGL ni dependencia JS pesada`
- Extraction blocker: `front door, CSP/static asset delivery y auth redirect permanecen unidos al runtime studio-web`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente, creativo, Brand Manager o equipo Efeonce con cuenta Globe/Greenhouse.
- Momento del flujo: primera llegada comercial, retorno recurrente o recuperación de sesión.
- Resultado perceptible esperado: entender en segundos que Globe convierte una idea en imagen, video y audio
  con IA y criterio humano, y saber cómo entrar.
- Fricción que debe reducir: login técnico, producto percibido como piloto, claims genéricos y entrada sin deseo.
- No-goals UX: homepage comercial completa, pricing/signup, showreel infinito, dashboard, provider wall,
  reproducción sonora automática o espectáculo que retrase el acceso.

### Surface & system decision

- Surface: root anónima comercial de Globe y sus estados de inicio de sesión/error.
- Composition Shell: `no aplica`; Globe conserva su shell y Design System propios.
- Primitive decision: `extend` — evolucionar `Orbital Threshold` a `Cinematic Threshold`; registrar el pattern
  de Login/Media Stage mediante `TASK-1485` si demuestra reuso.
- Adaptive density / The Seam: no aplica como primitive Greenhouse; composición responsive propia de Globe.
- Floating/Sidecar/Dialog decision: ninguno; pausa de motion es control inline. No modal promocional.
- Copy source: módulo/constantes versionadas de Globe; cero strings reutilizables dispersos.
- Access impact: consume la autoridad existente; plan/workspace/capability sólo se resuelven tras autenticación.

### State inventory

- Default/poster: copy, CTA y poster aparecen en el primer HTML.
- Cinematic playing: master muted/playsinline se carga después del contenido crítico y reproduce una vez.
- Cinematic settled: frame final estable, sin loop.
- Paused: control mantiene estado y etiqueta accesible.
- Reduced motion / data saver / media failure: poster estático equivalente; no intenta autoplay.
- Connecting: CTA conserva geometría, bloquea doble activación y comunica progreso sin inferir éxito.
- Authenticated: redirect inmediato a `/producer`; el Login no parpadea.
- Expired: sesión terminada, trabajo preservado y acción `Volver a entrar`.
- Denied: mensaje seguro sin revelar workspace/policy.
- Error/degraded: recovery estable; correlation ID sólo aquí, copiable y de baja prioridad.
- No account: enlace comercial secundario sólo si existe destino canónico confirmado.
- Mobile/compact: master vertical o poster propio; nunca crop ciego del 16:9.

### Interaction contract

- Primary interaction: `Entrar a Globe` → `/auth/start`.
- Secondary interaction: `Pausar/Reproducir animación`; adquisición sólo con route real.
- Hover/focus/active: equivalentes visibles; CTA no depende del video ni color.
- Pending/disabled: feedback inmediato; no demora artificial para completar una transición.
- Escape/click-away: no aplica.
- Focus restore: errores aterrizan en heading/alert; callback exitoso lleva al heading de Producer.
- Latency feedback: `aria-busy` en región de acceso; no anunciar carga decorativa del video.
- Toast/alert behavior: errores inline; live region `polite`, `assertive` sólo si la sesión bloquea continuidad.

### Motion & microinteractions

- Motion layers: pieza cinematográfica renderizada + UI motion mínima; no mezclar ambos runtimes.
- Cinematic direction: `One Idea, Many Forms`, 8 s aprox., gancho inmediato, montaje image→video→audio→Globe,
  reproducción única y settle.
- UI entrance: contenido visible naturalmente; sólo una revelación corta si JS/CSS están disponibles.
- CTA: hover/focus/tap tokenizado, pending estable; navegación no espera el final de la animación.
- Logo: asset real compuesto en post; no morph generativo del wordmark.
- Reduced-motion fallback: poster final desde first paint, sin autoplay/translates/parallax.
- Non-goal motion: loop infinito, canvas/WebGL reactivo, partículas, cursor parallax, strobe, autoplay con audio,
  scroll-jacking o progress ficticio.

### Implementation mapping

- Route/surface: `GET /`, `/auth/start`, callback/error existentes y redirect autenticado a `/producer`.
- Primitive/variant/kind: Globe `Cinematic Threshold` candidate, native video/picture, media control y CTA.
- Component candidates: render helpers actuales en `ui.ts`; separar copy/media manifest si evita drift.
- Copy source: namespace `globe.login.*`.
- Data reader/command: sesión y OAuth existentes; ningún reader/command nuevo.
- API parity: sin cambios; HTML no reemplaza `/v1/session`.
- Access/capability: authority server-side existente; UI no interpreta plan ni grant antes del callback.
- Runtime consumers: root anónima de `studio-web`.
- Media: poster eager/high priority; video source se adjunta progresivamente después del contenido crítico.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/globe-commercial-login.scenario.ts`.
- Route: root anónima, auth error safe y root autenticada→`/producer`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: poster-first, playing, settled, pause/resume, reduced motion, media error, CTA pending, denied/error.
- Required captures: poster, key cinematic beats, settled frame, focus, mobile vertical/fallback y error.
- Required `data-capture` markers: `globe-commercial-login`, `globe-cinematic-stage`, `globe-login-copy`,
  `globe-login-primary-action`, `globe-motion-control`, `globe-login-state`.
- Assertions: CTA presente antes del video; sin internal/pilot copy; no raw token/policy; pausa funciona; media
  failure/reduced motion conservan significado; authenticated no ve Login.
- Scroll-width checks: document/stage/footer en ambos viewports.
- Reduced-motion/focus evidence: OS emulation + teclado y control de pausa.
- Performance evidence: LCP/CLS/INP y transfer size del primer load con cache fría.

### Design decision log

- Decision: `One Idea, Many Forms` dentro de un `Cinematic Threshold` full-bleed.
- Alternatives considered: `Living Contact Sheet` y `Generative Portal`.
- Why this pattern: expresa la suite multimodal con una metáfora propia, evita work falso y puede degradar a un
  poster idéntico sin runtime 3D.
- Reuse/extend/new primitive: `extend` de Orbital Threshold; promover sólo tras evidencia y `TASK-1485`.
- Open risks: peso de media, crop vertical, licensing/provenance, contraste en frames intermedios y destino
  comercial para visitantes sin cuenta.

### Visual verification

- GVC scenario: `globe-commercial-login`.
- Viewports: `1440×1000`, `390×844`, reduced motion y media failure.
- Before: baselines `scripts/frontend/baselines/globe.internal-launch/`.
- After: `scripts/frontend/baselines/globe.commercial-login/`.
- Visual scorecard: `docs/ui/reviews/TASK-1524-globe-commercial-login-cinematic-threshold.scorecard.json`.
- Quality threshold: `average >= 4.5; no dimension < 4; hierarchy/impact/source fidelity/generic resistance >= 4.5`.
- First-fold checkpoint: captura poster + beat activo + settled desktop/mobile; requiere aprobación humana.

<!-- ZONE 2 — PLAN MODE: lo ejecuta quien tome la task. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Visual source, storyboard and animatic

- Formalizar motion brief, 3 keyframes y storyboard/shotlist de `One Idea, Many Forms`.
- Producir animatic desktop/mobile con timing real; no generar master antes de aprobación.
- Resolver provenance, licencias, logo real en post y frame final.

### Slice 2 — First-fold poster checkpoint

- Implementar copy, CTA, poster, composition y responsive sin depender del video.
- Capturar desktop/mobile y obtener `ACCEPT FIRST FOLD` antes de continuar.

### Slice 3 — Cinematic media and progressive enhancement

- Producir/optimizar master desktop/mobile, poster y fallback; integrar native video/picture.
- Implementar reproducción única, pause/resume, settle, reduced motion, data saver/media failure y budgets.

### Slice 4 — Auth states, evidence and rollout handoff

- Retirar lenguaje internal-only; cubrir connecting/expired/denied/error y footer comercial.
- Validar auth invariants, tests, GVC/micro frames, performance y scorecard.
- Dejar promoción comercial explícitamente gateada por `TASK-1521` + `TASK-1480`.

## Out of Scope

- Cambiar OAuth, PKCE, cookies, grants, tenancy, callback authority o `/v1/session`.
- Signup, checkout, pricing, trial, onboarding post-login o adquisición sin route comercial aprobada.
- Rediseñar `/producer`, Workbench, Library, Review o Delivery.
- Autoplay con sonido, VO, música descargada por default o sonic branding v1.
- WebGL/canvas generativo, modelo de video runtime, cursor-reactive portal o librería de animación nueva.
- Crear CDN/front door/media service; cualquier necesidad se deriva con ADR/owner.

## Detailed Spec

La pantalla server-renderiza primero logo, headline, subheadline, CTA, helper, footer y un poster responsive. El
video es decorativo porque el copy expresa el significado completo: se adjunta después del contenido crítico
sólo cuando no hay reduced motion, ahorro de datos ni restricción runtime; reproduce muted/playsinline una vez,
expone pausa/reproducción y termina en un frame estable. Desktop y mobile usan masters dirigidos, no un crop
único. El CTA inicia auth inmediatamente y nunca espera un beat cinematográfico.

Budgets iniciales a validar en animatic/export: poster desktop <= 180 KB, poster mobile <= 100 KB, WebM desktop
objetivo <= 2.5 MB, MP4 fallback <= 3.5 MB y master mobile <= 1.5 MB. Si calidad y budget no conviven, el owner
reduce duración/resolución/shot complexity o usa secuencia de imágenes; no sacrifica LCP ni oculta el exceso.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`direction → storyboard → animatic approval → poster first fold → master media → states → GVC/perf → rollout gate`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Video degrada LCP/INP | web performance | high | poster-first + deferred source + budgets | video compite con LCP/CTA |
| Motion bloquea/acosa | accessibility | medium | pause + reduced/data fallback + one-shot | loop, foco o mareo |
| Frames pierden contraste | UI/a11y | medium | grade/overlay por beat + frame checks | copy < AA |
| Mobile parece crop | product UI | high | master 9:16/alternative sequence | sujeto/copy cortado |
| Asset sin derechos | legal/brand | medium | provenance/licencia + gate humano | fuente/licencia ausente |
| Auth se rompe | identity | low | no contract delta + focal tests | callback/session drift |
| Promesa excede runtime | trust | medium | copy multimodal gobernado + capabilities post-login | CTA/claim falso |
| Comercial se publica antes de readiness | rollout | high | gate TASK-1521/TASK-1480 | external access prematuro |

### Feature flags / cutover

- Usar un switch de presentación sólo si ya existe un mecanismo runtime apropiado; no crear policy paralela.
- Cutover visual puede revertir a la shell `TASK-1455` sin tocar auth/session.
- Promoción externa depende de gates comerciales, no de completar el video.

### Rollback plan per slice

- Media: retirar source dinámico y conservar poster/login funcional.
- UI/copy: restaurar `renderLaunchPage` previo y assets baseline.
- Auth states: revertir render mapping sin revertir contratos de identidad.
- Deploy: volver a revisión previa de Cloud Run conforme al runbook/owner de release.

### Production verification sequence

Tests locales → first-fold approval → media/a11y/perf GVC → environment comercial habilitado por owner →
staging/commercial canary → allow/deny/revocation → visual smoke → sign-off Product/Creative/Security.

### Out-of-band coordination required

Creative aprueba storyboard/animatic/master; Legal/Brand valida provenance/licencias; Identity confirma cero
drift; owner de `TASK-1521`/`TASK-1480` autoriza promoción. La adquisición secundaria requiere owner GTM y URL real.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `TASK-1524` declara wireframe, flow y motion reales y pasa sus gates sin findings.
- [ ] `UI ready` permanece `no` hasta direction, implementation mapping, GVC plan, decision log, animatic y
  first-fold checkpoint aprobados.
- [ ] Tres direcciones se comparan y `One Idea, Many Forms` queda seleccionada con rationale.
- [ ] Storyboard/shotlist y animatic desktop/mobile se aprueban antes de producir masters.
- [ ] Logo/wordmark reales se componen en post; todos los assets tienen provenance y derechos comerciales.
- [ ] Copy visible no contiene `piloto`, `internal`, `foundation`, environment code o diagnóstico operativo.
- [ ] CTA `Entrar a Globe` está disponible desde el HTML inicial e inicia auth sin esperar media/motion.
- [ ] Poster es el LCP; video no es requisito para entender, navegar o autenticarse.
- [ ] Video reproduce muted/playsinline una vez, puede pausarse y termina en frame estable.
- [ ] Reduced motion, data saver, media failure y no-JS entregan poster y significado equivalentes.
- [ ] Desktop usa master 16:9 y mobile master 9:16 o secuencia propia; no hay crop ciego.
- [ ] Media cumple budgets aprobados o documenta decisión de fallback antes de merge.
- [ ] Connecting, expired, denied, error y authenticated redirect están cubiertos sin raw errors/tokens/policy.
- [ ] OAuth/PKCE/cookie/session/grants y `/v1/session` no cambian.
- [ ] Contraste AA se verifica en poster y frames intermedios; foco/CTA no dependen de color o motion.
- [ ] `scrollWidth <= clientWidth` en 1440 y 390 para documento, stage y footer.
- [ ] GVC premium captura poster/playing/settled/pause/reduced/error desktop/mobile y scorecard supera threshold.
- [ ] Ningún rollout comercial ocurre sin `TASK-1521` + `TASK-1480` y sign-offs correspondientes.

## Verification

- `pnpm task:lint --task TASK-1524`
- `pnpm ui:wireframe-check --task TASK-1524`
- `pnpm ui:flow-check --task TASK-1524`
- `pnpm ui:motion-check --task TASK-1524`
- `pnpm ui:readiness-check --task TASK-1524` antes de `UI ready: yes`
- `pnpm ops:lint --changed`
- En `../efeonce-globe`: `pnpm --filter @efeonce-globe/studio-web build`
- En `../efeonce-globe`: `pnpm --filter @efeonce-globe/studio-web test`
- `pnpm fe:capture globe-commercial-login --env=<commercial-staging>`
- `pnpm fe:capture:review <capture-dir>`
- Auditoría manual: keyboard, VoiceOver, reduced motion, cache fría, media failure y network constrained.

## Closing Protocol

- Mover a `complete/` sólo con code/evidence/scorecard y estado runtime honesto.
- Sincronizar registry, README, EPIC-028, docs funcionales de Globe y baselines.
- Puede cerrar como `code complete, rollout comercial pendiente` si `TASK-1521`/`TASK-1480` siguen abiertos;
  no afirmar producto live.
- Preservar baseline `globe.internal-launch` como historia; promover uno nuevo para `globe.commercial-login`.

## Follow-ups

- Sound-on opt-in/sonic branding sólo con brief/licencias y task separada.
- Signup/pricing/acquisition route según GTM/product owner.
- Promoción de `Cinematic Threshold` al registry de `TASK-1485` sólo tras segundo consumidor o decisión explícita.
