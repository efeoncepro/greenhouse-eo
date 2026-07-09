# TASK-1374 — Landing pública del ebook "El fin de la web" (/web-agentica)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1374-web-agentica-ebook-landing.md`
- Flow: `docs/ui/flows/TASK-1374-web-agentica-ebook-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1374-web-agentica-ebook-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|ui`
- Blocked by: `TASK-1375` (solo el slice 3 — form embed; slices 1–2 scaffold+SEO / port visual quedan desbloqueados)
- Branch: `task/TASK-1374-web-agentica-ebook-landing`
- Legacy ID: `PR efeoncepro/efeonce-think #12 (feat/landing-fin-desarrollo-tradicional)`
- GitHub Issue: `none`

## Summary

Incorporar de forma segura el lead magnet del ebook "El fin de la web" (marketing + IA / web agéntica) que hoy vive como PR #12 en `efeoncepro/efeonce-think`. El PR es un **export estático de una herramienta de diseño** (design system foráneo `_ds/`, fuente DM Sans, `support.js`, form muerto, sin SEO ni GTM, URL con `/index.html`). En vez de mergearlo, se **re-autora como página Astro nativa** en `/web-agentica`, con `BaseLayout` (SEO+GTM), tokens AXIS + Geist/Poppins, efectos CSS portados y form gobernado que entrega el ebook por email.

## Why This Task Exists

El PR #12, mergeado tal cual, **rompe cosas** del hub Think:

1. **El form no capta nada** — `onSubmit` sólo hace `setState({submitted:true})`. Un lead magnet que capta cero leads.
2. **SEO cero** — el `<head>` crudo no trae `<title>`, description, canonical, robots, OG/Twitter, JSON-LD ni favicon; justo lo que la página necesita (su propósito es SEO).
3. **Sin tracking** — no trae el snippet GTM (`GTM-NGHPGRLZ`) que Think unificó en sus PRs #10/#11; la página quedaría invisible a analytics/atribución.
4. **Off-brand + design system paralelo** — trae `_ds/efeonce-design-system-*` (bundle de 3.730 líneas) y DM Sans, contra el estándar AXIS + Geist/Poppins; ~6.500 líneas de JS de vendor sin revisar, con `support.js` render-blocking.
5. **URL mala** — larga (`fin-desarrollo-tradicional`) y con redirect a `/…/index.html` (duplicate content + salto), contra `trailingSlash:'never'`.
6. **Nunca desplegado** — el check UNSTABLE del PR es Vercel "Authorization required to deploy" (PR de fork externo); nadie lo vio vivo.

El concepto y el copy están buenos; el problema es el mecanismo de entrega. La re-autoría nativa preserva el valor y respeta la arquitectura de Think (dumb-render, SSOT, marca AXIS, Full API Parity del form gobernado).

## Goal

- Landing `/web-agentica` nativa en `efeonce-think`, indexable, con `BaseLayout` (title/description/canonical/robots/OG/JSON-LD FAQ/GTM/favicon).
- Marca Efeonce: tokens AXIS + Geist/Poppins; los efectos del PR (grid, beams, spotlight, count-up) portados y re-tokenizados; cero DM Sans / `_ds/` foráneo.
- Form gobernado `<greenhouse-form>` del ebook (patrón `BrandVisibilityFormDock`) que capta el lead y dispara el envío del ebook por email; sin lógica local de submit/validación/consent.
- URL corta y limpia `/web-agentica` (sin `/index.html`, sin redirect), registrada en `greenhouse.repo.json`.
- PR #12 cerrado con explicación (referencia de diseño, no código a integrar).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `.claude/skills/astro/efeonce-overlay.md` — doctrina dumb-render, marca AXIS copiada, patrón del form gobernado (VERIFIED contra el código real).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el form es cliente del contrato gobernado, no una implementación local.
- `docs/architecture/growth-public-forms-runtime-contract.md` — contrato público de Growth Forms (`GET`/`POST submit`, CORS por surface). `[verificar]` path.
- Repo `efeonce-think` (separado): `README.md`, `astro.config.mjs`, `src/layouts/BaseLayout.astro`, `src/components/BrandVisibilityFormDock.astro`, `src/pages/brand-visibility/index.astro`.

Reglas obligatorias:

- **NUNCA** DM Sans ni HEX crudo → Geist/Poppins + `var(--axis-*)` / `axis.*` de `src/lib/report-tokens.ts`.
- **NUNCA** design system paralelo (`_ds/`) ni `support.js`/`image-slot.js`/`_ds_bundle.js` → primitivas + tokens del repo.
- **NUNCA** form que sólo hace `setState` ni campos/validación/consent locales → contrato Growth Forms gobernado (`<greenhouse-form>`), Greenhouse es SSOT.
- **NUNCA** `/…/index.html` ni redirect → ruta Astro canónica `/web-agentica` (`trailingSlash:'never'`).
- **NUNCA** computar lógica de negocio en Think (dumb-render): la captura, consent, dedupe y entrega del ebook viven en Greenhouse.
- **SIEMPRE** `<head>` vía `BaseLayout` (SEO + GTM heredados); JSON-LD `WebPage`/`FAQPage` para el AEO.

## Normative Docs

- Wireframe: `docs/ui/wireframes/TASK-1374-web-agentica-ebook-landing.md`
- Flow: `docs/ui/flows/TASK-1374-web-agentica-ebook-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1374-web-agentica-ebook-landing-motion.md`
- Precedente: `docs/tasks/in-progress/TASK-1327-public-lead-magnet-landing-form-embed.md` (landing hermana brand-visibility en Think).

## Dependencies & Impact

### Depends on

- **[BLOQUEA slice 3] Foundation backend-data del ebook (a crear en greenhouse-eo)**: un Growth Form instance nuevo (`formKey` del ebook) con campos (nombre, email, rol opcional), consent, y un **fulfillment/destination que envíe el ebook (PDF) por email**; más el **ebook PDF** producido. Recomendado como task hermana `backend-data` (ver Follow-ups). `[verificar]` si un form/fulfillment reutilizable ya existe.
- **Allowlist de superficie gobernado**: `think.efeoncepro.com` autorizado como origin para el form del ebook (mismo mecanismo que TASK-1335 hizo para el grader). `[verificar]` si ya cubre el nuevo form.
- Repo `efeonce-think`: `BaseLayout.astro`, patrón `BrandVisibilityFormDock.astro`, `report-tokens.ts` (AXIS), `capture.mjs` (GVC), `greenhouse.repo.json`.

### Blocks / Impacts

- Cierra el PR #12 de `efeonce-think` (referencia de diseño).
- No impacta otras rutas de Think (aditivo: nueva ruta + assets).

### Files owned

- `efeonce-think`: `src/pages/web-agentica/index.astro`, `src/components/WebAgenticaFormDock.astro` (o reuso parametrizado), copy local de la ruta, assets bajo `public/web-agentica/` optimizados, `greenhouse.repo.json` (registro de surface).
- `greenhouse-eo`: `docs/ui/wireframes|flows|motion/TASK-1374-*.md`, esta task, `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`.

## Current Repo State

### Already exists

- `efeonce-think` con `BaseLayout` (SEO+GTM `GTM-NGHPGRLZ`), tokens AXIS (`report-tokens.ts`), patrón de form gobernado (`BrandVisibilityFormDock.astro`), capturador GVC (`capture.mjs`), landing hermana `/brand-visibility`.
- PR #12 como referencia de diseño (estructura de secciones, copy, efectos CSS).

### Gap

- No existe la ruta `/web-agentica` nativa.
- No existe el Growth Form instance del ebook ni su fulfillment de email ni el PDF (dependencia backend-data).
- El origin de Think puede no estar autorizado para el nuevo form.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: decisor de marketing/growth, C-level, SEO/contenidos, producto/tech (público anónimo).
- Momento del flujo: primer contacto con el lead magnet; decide si deja su correo por el ebook.
- Resultado perceptible esperado: entiende la tesis, ve qué trae el ebook y lo recibe por email tras un submit gobernado.
- Friccion que debe reducir: desconfianza ("¿es serio? ¿spam?") y esfuerzo del form.
- No-goals UX: prometer resultados, mostrar métricas propias sin fuente, entregar sin captar, "reporte" on-screen (eso es brand-visibility).

### Surface & system decision

- Surface: ruta Astro pública `/web-agentica` en `efeonce-think`.
- Composition Shell: `no aplica` — superficie Astro externa, no el shell MUI de greenhouse-eo.
- Primitive decision: `reuse` — `BaseLayout` + patrón `BrandVisibilityFormDock` + secciones CSS locales; no nace primitive Greenhouse.
- Adaptive density / The Seam: `no aplica` — marketing landing, no product UI.
- Floating/Sidecar/Dialog decision: none (single-route, sin modal/drawer).
- Copy source: módulo de copy local de la ruta (Think), es-CL; base tomada del PR #12.
- Access impact: `none` — página pública sin auth.

### State inventory

- Default: `ready` (form disponible).
- Loading: skeleton del renderer gobernado.
- Empty: contrato sin campos publicables (raro).
- Error: form no carga (sin internals).
- Degraded / partial: renderer con disponibilidad parcial.
- Permission denied: origin no autorizado (bloqueador pre-launch).
- Long content: secciones apiladas; el fold no depende de scroll obligatorio en desktop.
- Mobile / compact: full-width; CTA lleva al form.
- Keyboard / focus: CTA→form heading; FAQ `<details>` navegable.
- Reduced motion: grid/beams/count-up/spotlight → estático con dato+fuente en texto.

### Interaction contract

- Primary interaction: CTA "Descargar el ebook gratis" → scroll+foco al form; submit gobernado.
- Hover / focus / active: CTA con elevación/ring/compresión; spotlight cards con halo en hover.
- Pending / disabled: pending del renderer; doble-submit prevenido por el renderer.
- Escape / click-away: none (sin modal).
- Focus restore: tras success/error, foco al heading del estado.
- Latency feedback: skeleton de carga del form; success honesto "revisa tu email".
- Toast / alert behavior: estados in-flow en el form dock, no toasts globales.

### Motion & microinteractions

- Motion primitive: `CSS` (grid drift, beams, count-up, spotlight, reveals); GSAP solo si un reveal lo justifica, scoped a la ruta.
- Enter / exit: reveal escalonado del hero; section reveals opacity+translateY<16px.
- Layout morph: evitar morphs que muevan el form.
- Stagger: hero <80ms.
- Timing / easing token: ease-out entradas; ver motion contract.
- Reduced-motion fallback: todo estático, dato final visible.
- Non-goal motion: confetti, progreso falso, scroll-jacking, consola de análisis.

### Implementation mapping

- Route / surface: `efeonce-think` `/web-agentica` (`think.efeoncepro.com/web-agentica`), público/indexable, canónica sin `/index.html`.
- Primitive / variant / kind: reuse `BaseLayout` + patrón form dock; secciones CSS locales.
- Component candidates: `src/pages/web-agentica/index.astro`, `src/components/WebAgenticaFormDock.astro`.
- Copy source: módulo de copy local de la ruta (es-CL).
- Data reader / command: ninguno en Think; submit + entrega del ebook los gobierna Greenhouse (Growth Forms + fulfillment de email).
- API parity: sin endpoint/validación/consent local; único write path = renderer gobernado.
- Access / capability: público sin auth.
- States to implement: ready, loading, empty, error, degraded, denied, submitting, success.

### GVC scenario plan

- Scenario file: `scripts/capture.mjs /web-agentica web-agentica-landing` (capturador de Think) o Playwright local.
- Route: `/web-agentica` (local, luego staging/prod).
- Viewports: 1440, 1280, 390.
- Required steps: cargar, assert meta indexable + canonical sin `/index.html`, hero settled, esperar form, loader/ready, success sintético seguro, scroll por secciones, reduced-motion.
- Required captures: hero, stats, form loader, form ready, success, full page desktop, hero mobile, form mobile, full page mobile.
- Required `data-capture` markers: `web-agentica-landing|hero|stats|thesis|inside|audience|form|form-loader|faq|footer`.
- Assertions: sin overflow, sin campos locales fuera del `<greenhouse-form>`, sin `_ds/`/DM Sans, ruta en `greenhouse.repo.json`.
- Scroll-width checks: 1440 y 390.
- Reduced-motion / focus evidence: captura dedicada `prefers-reduced-motion`.

### Design decision log

- Decision: re-autoría nativa en `/web-agentica`; no mergear el export crudo.
- Alternatives considered: merge tal cual; merge con parches mínimos; iframe del export.
- Why this pattern: SEO + marca + form efectivo; el export no cumple ninguno.
- Reuse / extend / new primitive: reuse `BaseLayout` + patrón form dock; sin primitive nueva.
- Open risks: form_key/fulfillment/PDF del ebook no existen; allowlist del origin.

### Visual verification

- GVC scenario: `web-agentica-landing`.
- Viewports: 1440, 1280, 390.
- Required captures: hero, stats, form loader/ready, success, full page desktop/mobile.
- Required `data-capture` markers: los 10 listados.
- Scroll-width check: sí, desktop + 390.
- Accessibility/focus checks: CTA→form, FAQ teclado, foco visible.
- Before/after evidence: comparar contra el export del PR (referencia) para probar paridad de concepto con marca Efeonce.
- Known visual debt: ninguna esperada; documentar si el port de algún efecto se simplifica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Scaffold nativo + SEO/GTM

- Crear `src/pages/web-agentica/index.astro` envuelta en `BaseLayout` con title/description/canonical/OG y JSON-LD `WebPage`+`FAQPage`.
- Estructura de secciones vacía/placeholder (hero, stats, thesis, inside, audience, form host, FAQ, footer) con `data-capture` markers.
- Registrar la surface `/web-agentica` en `greenhouse.repo.json`.
- Verificar `pnpm build` + `pnpm type-check` en Think + ruta canónica sin `/index.html`.

### Slice 2 — Port visual a AXIS/Geist + efectos

- Portar hero (grid drift + beams), stats (count-up con fuente), thesis, inside, audience y FAQ (`<details>`) desde el PR, re-tokenizados a `axis.*`/Geist/Poppins.
- Copy es-CL desde el módulo local (ledger del wireframe).
- Descartar `support.js`, `image-slot.js`, `_ds/` y DM Sans; optimizar assets con `astro:assets`.
- Reduced-motion + a11y (headings, foco, contraste AA del acento sobre navy).
- GVC desktop+mobile mirado en loop.

### Slice 3 — Form gobernado del ebook (BLOQUEADO por foundation)

- Embeber `<greenhouse-form>` del ebook (patrón `BrandVisibilityFormDock`) con `formKey`/`surface` del ebook.
- Estados: loading/ready/submitting/success/error/degraded/denied.
- Success honesto "te enviamos el ebook a tu email"; sin campos/validación/consent local.
- GVC de los estados del form.

### Slice 4 — Cierre: gates + deploy + PR

- Gates: `pnpm build` + `pnpm type-check` + `verify:landing`/`capture` verdes.
- Docs: cross-link, changelog/handoff.
- Deploy a `main` de Think (auto-deploy Vercel); smoke real.
- Cerrar PR #12 con explicación.

## Out of Scope

- El Growth Form instance del ebook, su fulfillment de email y el PDF (foundation backend-data en greenhouse-eo — task hermana).
- Cualquier "reporte" on-screen o pipeline async (esto es contenido, no el grader brand-visibility).
- Cambios al `BaseLayout`, a la marca AXIS o al renderer de Growth Forms.
- Traducciones/i18n del ebook o de la landing.
- Redirects desde la URL larga del PR (nunca se publicó; no hay nada que redirigir).

## Detailed Spec

Ver el trío de docs UI (wireframe/flow/motion) para layout, copy ledger, state machine, motion inventory y GVC plan. El análisis fuente (por qué no mergear + cómo incorporar) vive en el hilo de decisión que originó esta task; los invariantes duros están en `Architecture Alignment`.

Puntos clave de implementación:

- El `<head>` completo lo da `BaseLayout`; la ruta sólo pasa `title`, `description`, `canonical` (implícito), `ogImage` (hero del ebook) y `jsonLd` (WebPage+FAQPage).
- Los efectos del PR (`.lp-hero-grid-*`, `.lp-beams-collision`, `.lp-spotlight-card`) son CSS reutilizable: se copian re-tokenizando los HEX (`#ff6501`/`#ec661c`/azules) a vars AXIS/acento.
- El form dock reusa el patrón de `BrandVisibilityFormDock.astro` (script `renderer-latest.js` + `<greenhouse-form appearance="bare">` + fallback noscript + estados), cambiando `formKey`/`surface` al del ebook y el success copy a "revisa tu email".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (scaffold+SEO) → Slice 2 (port visual). Ambos desbloqueados, sin dependencia externa.
- Slice 3 (form embed) **DEPENDE** de la foundation del ebook (form_key + fulfillment + PDF) y del allowlist del origin. NO ejecutar slice 3 hasta que la foundation exista y el origin esté autorizado; hacerlo embebe un form que no entrega nada.
- Slice 4 (cierre/deploy) sólo después de 1–3 verdes con GVC mirado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Merge accidental del export crudo (form muerto, sin SEO) | UI / SEO | low | Esta task cierra el PR #12; se re-autora nativo | Página sin `<title>`/GTM en GVC |
| Embeber el form sin fulfillment del ebook | Growth Forms | medium | Slice 3 bloqueado hasta foundation; ordering hard rule | Submit acepta pero no llega email |
| Origin no autorizado (denied) | Growth Forms / CORS | medium | Verificar allowlist antes de slice 3 | Estado `denied` en el form |
| Regresión de contraste/perf al portar efectos | UI | low | GVC mirado + AA check + eliminar `support.js` render-blocking | Contraste bajo / LCP alto en GVC |
| Deriva de marca (DM Sans / `_ds/`) | Brand | low | Regla dura: sólo AXIS/Geist; descartar `_ds/` | DM Sans en GVC |

### Feature flags / cutover

- Sin flag propio en Think — la ruta es aditiva y su publicación es el cutover (deploy a `main`). El form del ebook queda gated por la existencia+activación de su Growth Form gobernado y su allowlist (foundation backend-data). Hasta entonces, slices 1–2 pueden vivir con el form host en estado `pending`/placeholder o la sección form oculta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR en `efeonce-think` + redeploy | <5 min | sí |
| Slice 2 | revert PR + redeploy | <5 min | sí |
| Slice 3 | quitar el embed / ocultar sección form + redeploy | <5 min | sí |
| Slice 4 | revert del deploy en Vercel (promote deploy anterior) | <5 min | sí |

### Production verification sequence

1. Build+type-check local de Think verdes.
2. GVC local desktop+mobile mirado (hero, stats, form, success, reduced-motion).
3. Deploy a `main` de Think → verificar ruta live `/web-agentica`, meta indexable, canonical sin `/index.html`, GTM presente.
4. (Post-foundation) submit real desde el origin de Think → verificar que llega el email con el ebook.
5. Verificar sitemap incluye `/web-agentica` y ninguna URL con lead se indexa.

### Out-of-band coordination required

- Producir el **ebook PDF** (contenido) y crear el **Growth Form + fulfillment de email** en greenhouse-eo (foundation backend-data) antes del slice 3.
- Confirmar/extender el **allowlist gobernado** para el origin de Think en el nuevo form.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux`, `UI impact: motion`; Wireframe/Flow/Motion declarados y existentes.
- [ ] `/web-agentica` es una página Astro nativa con `BaseLayout` (title, description, canonical sin `/index.html`, robots index, OG/Twitter, JSON-LD WebPage+FAQPage, GTM `GTM-NGHPGRLZ`, favicon).
- [ ] Cero DM Sans y cero `_ds/`/`support.js`/`image-slot.js`/`_ds_bundle.js`; tipografía Geist/Poppins y color desde `axis.*`/var de acento (ningún HEX crudo del export).
- [ ] Los efectos hero (grid, beams), stats count-up (con fuente literal), spotlight y section reveals funcionan y tienen fallback de reduced-motion.
- [ ] El form es el `<greenhouse-form>` gobernado del ebook; sin campos/validación/consent locales; success honesto "te enviamos el ebook a tu email" (o el estado bloqueado/placeholder mientras la foundation no exista).
- [ ] Sin scroll horizontal de página en desktop 1440 ni mobile 390; GVC desktop+mobile capturado y mirado.
- [ ] La surface `/web-agentica` está registrada en `greenhouse.repo.json`; ninguna URL con lead se indexa.
- [ ] PR #12 de `efeonce-think` cerrado con explicación.
- [ ] `UI ready` pasa a `yes` sólo cuando el trío UI + este contrato están completos y `pnpm task:lint --task TASK-1374` queda sin findings.

## Verification

- Think: `pnpm build`, `pnpm type-check`.
- Think: `scripts/capture.mjs /web-agentica web-agentica-landing` (GVC 1440/1280/390) mirado.
- greenhouse-eo: `pnpm task:lint --task TASK-1374`, `pnpm ui:wireframe-check --task TASK-1374`, `pnpm ui:flow-check --task TASK-1374`, `pnpm ui:motion-check --task TASK-1374`.
- Validación manual: ruta live, meta/canonical/GTM, sitemap, submit real post-foundation.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` actualizado si cambia comportamiento visible.
- [ ] Chequeo de impacto cruzado (PR #12, TASK-1327, foundation del ebook).
- [ ] PR #12 cerrado con explicación en `efeonce-think`.

## Follow-ups

- **Task hermana `backend-data` (greenhouse-eo)**: Growth Form instance del ebook (`formKey` + campos + consent) + fulfillment/destination que envía el ebook (PDF) por email + allowlist del origin de Think. Bloquea el slice 3 de esta task. (Reservar el próximo ID al crearla.)
- Producción del **ebook PDF** (contenido) — dirección de arte + copy.
- Confirmar el **Epic** correcto (EPIC-019 público vs epic del hub Think) — ver Open Questions.
- Evaluar convergencia futura Think → `efeonce-web` (misma marca/URL final) para esta landing.

## Delta 2026-07-09 — landing implementada (code-complete local, rollout pendiente)

Landing `/web-agentica` construida nativa en `efeonce-think` (commit local, NO pusheado — push a `main` = deploy prod, y el form vive en staging):

- **Archivos** (`efeonce-think`): `src/pages/web-agentica/index.astro`, `src/components/WebAgenticaFormDock.astro`, teal tokenizado en `src/lib/report-tokens.ts` (`#36c8bf`, la firma de brand-visibility), surface en `greenhouse.repo.json`.
- **SEO+GTM**: `BaseLayout` (title/description/canonical/OG/**GTM**/favicon) + JSON-LD `WebPage`+`FAQPage`. **Navy + Teal** (AXIS accent + teal), Geist/Poppins. Cero DM Sans / `_ds/` foráneo (re-autoría, no el export).
- **Secciones**: hero navy+teal (H1 "El **fin** de la web"), stats (con fuentes), tesis, "cinco actos", audiencia, FAQ accordion, footer.
- **Form + descarga**: embebe `<greenhouse-form form-key=db1e254c… surface=fhsf-web-agentica-ebook>`; al aceptarse el submit dispara la **descarga gated on-screen** con el `download_url` del handoff (`gh_form_submission_accepted`, TASK-1375) + **thank-you inline** (NO overlay) con "Descargar de nuevo" + puente al grader.
- **Verificado**: `pnpm build` + `pnpm type-check` verdes; GVC desktop 1440 + mobile 390 **mirado** (navy+teal enterprise); `scrollWidth==clientWidth` (sin overflow). El form muestra su fallback honesto offline (sin API) — en staging con el form + API renderiza los campos.

**Rollout pendiente (NO operativamente completo):** push de efeonce-think a `main` (deploy prod) — hacer junto con el rollout prod de TASK-1375 (form en prod DB, PDF en bucket prod, flags, deploy `renderer-latest.js` + ops-worker); **smoke real end-to-end** desde el origin (Turnstile + CORS): submit → llega email + descarga on-screen. Para probar en staging: apuntar `GREENHOUSE_API_BASE` a staging + `pnpm dev`.

## Delta 2026-07-09 (thank-you + email)

- **Thank-you post-descarga (analizado con state-design/forms-ux/modern-ui/ux-writing):** **tarjeta inline** que reemplaza el form (NO overlay/modal). Anatomía: confirmación honesta (descarga + email) + recuperación "Descargar de nuevo" (gated con el token del handoff, la landing lo pinta) + un solo next step (puente al grader `/brand-visibility`). El success_card gobernado del form es el baseline (TASK-1375); la landing enriquece con el token. Copy en el ledger del wireframe (`form.success.*`). Foco al título del panel + `role=status`.
- **Política de email (operador):** solo **correo corporativo** (bloquea free/disposable), igual que el grader; el gate lo aplica el contrato del form (TASK-1375), no la landing.

## Delta 2026-07-09

- **Decisión de acento (operador):** la landing usa **Navy + Teal**, NO el naranja del PR ni amber. Y el teal ya existe y está en uso en Think: **`#36c8bf`**, la firma visual del hero de `/brand-visibility` (`src/components/HeroAnswerLens.astro`), junto al navy `#001a33` y los azules `#4b8dff`/`#7eb1ff`. El navy base sale del `axis.accent` de `report-tokens.ts`. En slice 2 se **tokeniza el teal `#36c8bf`** en `report-tokens.ts` (hoy está inline en HeroAnswerLens) para que la landing lo consuma como var, no HEX crudo. NUNCA el naranja `#ff6501` del export.
- **Secuencia (operador):** primero se crea la **foundation backend-data** (TASK-1375) para desbloquear el slice 3; el port visual (slices 1–2) queda diferido a después de la foundation.
- **Slice 3 Blocked by → TASK-1375** (ebook Growth Form + entrega + PDF + surface/origin).

## Open Questions

- **Token teal — RESUELTO:** el teal es `#36c8bf` (ya en uso en `/brand-visibility`, `HeroAnswerLens.astro`). En slice 2 se tokeniza en `report-tokens.ts` y la landing lo consume como var.
- **Epic**: se asignó `EPIC-019` (público/content marketing) por defecto; confirmar si el hub Think tiene un epic propio (TASK-1325/1326 son lead-magnet hub) al que deba colgarse.
- **Entrega del ebook**: ¿sólo email, o también descarga directa on-screen si el contrato expone un enlace? Por defecto, email (patrón lead magnet + copy del PR).
- **Correo corporativo**: ¿el form del ebook exige correo corporativo (como el grader) o acepta cualquier email? Decidir en la foundation.
