# TASK-1298 — AEO WordPress greenhouse-form migration

## Delta 2026-07-01 — cutover live completado

- AEO `/aeo-2/` quedo migrada del bridge HTML temporal a `<greenhouse-form>` con identidad estable `form-key="b120566a-dd1a-43c8-956a-4e0121e805b8"`, surface `fhsf-efeonce-aeo-diagnostic`, `color-scheme="light"` y `appearance="bare"`.
- La version publicada vigente del formulario es v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d`, con `style_variant=diagnostic_premium`. La v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4` quedo deprecada.
- El renderer premium reemplaza los selects nativos por listboxes propios para los dos dropdowns (`Pais principal` y `Tamano de la empresa`), con `role=combobox/listbox/option`, teclado, foco visible, panel blanco con borde y placeholders aprobados.
- WordPress se mutó con Elementor `Document::save()`; backup meta: `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`; Kinsta purgado; `heroans` se mantuvo en `e0b951b2456a83578cd9e22005900521`.
- Gate live verde: `pnpm public-website:verify-aeo-live-contract` valida WordPress post-cutover (`<greenhouse-form>`, sin bridge), API publica por slug/formKey, captcha fail-closed, tipografia, visual desktop/mobile 390, dropdown premium, focus/ARIA, email gate, Turnstile `captchaToken` y dataLayer sin PII.
- El patron reusable no exige repetir este parto para cada form: nuevos formularios pueden usar `styleVariant=diagnostic_premium` y el renderer endurecido. AEO conserva guards extra por ser una landing publica critica con hero protegido e historial de incidente.

## Delta 2026-06-30

- Naming de identidad de Growth Forms fijado en `TASK-1297`: la identidad pública/opaca es **`form_key`** (DB) / **`formKey`** (contrato) / **`form-key`** (atributo del renderer), NO `form_guid`/`formGuid` (ese nombre es del GUID secreto de destino de HubSpot, server-only). Esta task se actualizó: embed, atributo, acceptance, wireframe y verificación ahora usan `form-key`/`formKey`. El `<AEO_FORM_KEY>` real proviene del runtime verificado por `TASK-1297`.
- `TASK-1297` también fija que la resolución por key va por el segmento `[formSlug]` existente (slug-or-uuid disambiguado server-side), sin ruta ni superficie CORS nueva: el embed `<greenhouse-form form-key="...">` golpea las mismas rutas públicas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1298-aeo-greenhouse-form-migration-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `public-site|growth`
- Blocked by: `none`
- Branch: `develop`

## Revert 2026-06-30 — migración shipeada y REVERTIDA (lección)

**Qué pasó:** se migró `convers` (`postId=250265`) del bridge HTML a `<greenhouse-form>` y se declaró "complete". **Fue un error.** El renderer, dentro del tema Ohio de WordPress, **NO reprodujo el pulido del bridge**: el host le pisó el CSS a los controles → inputs grises sin borde, `<select>` con pared de chevrons (caret tileado), botón oscuro. El gate `verify-aeo-form-typography` (tipografía/overflow) pasó pero **no detectó el daño visual** porque solo asercionaba tracking/overflow/font, no miraba el render real de los controles. **El operador detectó el form roto en prod.**

**Acción correctiva:** se **restauró el backup** (`_gh_aeo_backup_20260630_task1298_convers_migration`) vía `Document::save()` + Kinsta purge → prod volvió al **bridge**, que es el formulario pulido aprobado (inputs con borde, selects con placeholder, **botón teal `#39c9bf`**, trust inline ✓) — el mismo look de la referencia del operador. `heroans` estable. Verificado mirando el frame real.

**Por qué el renderer no alcanzó:** el tema Ohio estiliza agresivamente `input/select/button` y le gana al light-DOM del renderer; ni un `!important` inline en el botón venció (algo lo oscurece de raíz, posible overlay/pseudo del tema — no resuelto). Ganar esa guerra de CSS por-propiedad es frágil (lo que el operador pidió evitar). El camino robusto real es **Shadow DOM en el renderer** (aislamiento total del host) o endurecer sus controles para hosts hostiles **y verificarlo mirando frames** — NO re-shipear hasta lograrlo.

**Lo que SÍ queda (válido, en `develop`, no revertido):**
- Fix de raíz `FormRendererOptions.hosted` (los token-overrides del host propagan; +2 tests, suite 51/51). Mejora real para futuros hosts.
- Filtro `src/lib/growth/forms/**` en `ops-worker-deploy.yml` (cierra bug class de drift).
- Skill `greenhouse-growth-forms` (.claude + .codex).
- TASK-1297 (formKey) **sigue en prod** (release `1abf65d1`), no afectado por el revert.

**Estado:** `in-progress` (NO complete). La migración queda **bloqueada** hasta que el renderer reproduzca o supere este look dentro de Ohio, verificado con GVC mirando desktop+mobile (no solo aserciones). Gate revertido a selectores del bridge.

**Avance técnico Codex 2026-06-30:** se agregó hardening transversal del renderer para hosts hostiles (`src/growth-forms-renderer/styles.ts`): los controles `.ghf-input/.ghf-textarea/.ghf-select` y `.ghf-btn` vuelven a declarar fuente, color, fondo, borde, tracking y select background-image con selectores scopeados + `!important` tokenizado. El objetivo es que Ohio no pueda degradar el renderer a inputs grises, selects tileados o CTA oscuro mediante reglas genéricas `input/select/button`. Se agregó gate local `pnpm public-website:verify-aeo-renderer-ohio-fixture`, que monta un fixture con CSS hostil tipo Ohio y guarda screenshots desktop/mobile. También se agregó `pnpm public-website:verify-aeo-renderer-real-composition-preview`: carga `/aeo-2/` live, reemplaza el bridge **solo en memoria del navegador** por `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8">`, inyecta el bundle local y valida la composición Ohio real sin guardar WordPress. El gate agregado de cierre pre-live es `pnpm public-website:verify-aeo-prelive-contract`: verifica WordPress bridge/`heroans`, API publica por slug/formKey + captcha fail-closed, tipografia, bridge live, renderer fixture, renderer real en memoria y ejecuta `review-aeo-form-visual-frames`. Ese review ahora exige PNG frescos/no blank **y además muestrea píxeles dentro de los bounding boxes reales de inputs/selects/CTA** para detectar campos grises, select chevron-wall/texture oscura y CTA no-teal aunque los computed styles parezcan correctos. Estos gates son pre-live/public-site Playwright/WP-CLI/API read-only y complementan el gate sobre la página pública restaurada; el GVC/frame review final sigue siendo obligatorio después del save live.

**Avance visual Codex 2026-06-30:** se subió el renderer desde una columna funcional a una composición más cercana al bridge aprobado y más premium: campos cortos/selects comparten fila en desktop (`Nombre` + `Email`, `País` + `Tamaño`), campos largos/intención (`Marca / sitio web`, `Principal competidor`) siguen full-width, y mobile 390 queda en una columna. `styles.ts` agrega shadow tokens de campo/acción, foco con halo tokenizado, hover/press sobrio del CTA y reduced-motion existente. Los gates `verify-aeo-renderer-ohio-fixture` y `verify-aeo-renderer-real-composition-preview` ahora asertan explícitamente esas filas desktop, además de colores/overflow/placeholder/trust.

**Avance interacción Codex 2026-06-30:** se agregó `pnpm public-website:verify-aeo-renderer-interaction-preview`: inyecta el renderer en `/aeo-2/` solo en memoria, captura foco y submit inválido desktop/mobile, y una variante reduced-motion desktop. Valida foco visible por halo/outline, errores inline, resumen accesible con 3 links de recuperación, `aria-invalid`, `overflowX=0` y transiciones/animaciones reducidas a `<=1ms`. Al crear este gate se detectó y corrigió un bug fino de UX: un campo vacío con foco podía insertar error en blur y mover el CTA durante el primer click; el botón primario ahora previene el `pointerdown` pre-submit para que la validación completa ocurra en el submit handler sin perder el click.

**Avance contrato Codex 2026-06-30:** se publicó AEO v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4` con `field_schema` alineado al bridge para selects (`country.placeholder="Selecciona país"`, `companySize.placeholder="Selecciona tamaño"`), preservando `copy.submit`, `security.captcha`, destinations y policies. Script gobernado: `pnpm growth:forms:activate-aeo-select-copy --apply`. GET por slug y por formKey devuelven la misma v5.

**Bloqueo real vigente:** `TASK-1297` ya está complete y `formKey` está en prod; no bloquea esta task. La paridad pre-live del renderer ya tiene evidencia mecánica (`ohio-fixture` + `real-composition-preview`) con campos blancos con borde, selects limpios, CTA teal, trust inline y mobile 390 sin overflow. La task sigue `in-progress` porque aún falta el cutover live gobernado: backup Elementor, hash `heroans` antes/después, `Document::save()`, Kinsta purge, GVC/frame review sobre la página ya migrada, email gate, Turnstile boundary, dataLayer sin PII y gates finales.

**Estado de bloqueo operativo 2026-06-30:** `pnpm codex:task-hook TASK-1298 --develop` debe fallar mientras `Blocked by: live_cutover_pending_after_pre_live_parity` siga declarado. Ese fallo es intencional y protege contra repetir el error de cortar live con evidencia insuficiente. Para desbloquear, el siguiente agente debe documentar en esta task una seccion `Cutover Unlock Evidence` con: (1) comando pre-live verde (`pnpm public-website:verify-aeo-prelive-contract`), (2) frames revisados desktop/mobile 390 del renderer en composicion real, (3) plan de backup/restore Elementor exacto, (4) ventana/approval explicita para mutar WordPress live, y (5) lista post-save de gates obligatorios. Solo despues se puede remover el blocker y ejecutar el hook.

**Importante de producto:** paridad con el bridge es **piso de no-regresión, no techo estético**. La intención del operador es poder mejorar mucho más la apariencia actual: más moderna, más cuidada en UI/UX, con microcopy, feedback, motion y microinteracciones de nivel landing premium. Es válido que el renderer supere al bridge, pero no que lo degrade. El corte correcto es: baseline aprobado restaurado en prod → diseño renderer modernizado en entorno seguro → GVC/frame review → recién ahí migración live.

## Summary

Migracion completada de la seccion de conversion de AEO `/aeo-2/` desde el bridge HTML temporal a `<greenhouse-form>`, preservando y mejorando la experiencia publica: una sola card visible, copy AEO, validacion inline, email corporativo, Turnstile invisible, dataLayer sin PII, dropdowns premium y mobile 390 sin overflow. No se tocó Home, hero ni el `/aeo` viejo.

## Why This Task Exists

El bridge AEO fue correcto como transicion, pero ya no debe quedarse como logica paralela: el renderer generico ya soporta `captchaToken`, `security.captcha`, validacion reactiva y submit gobernado. Mantener submit/captcha/email gate en HTML por landing vuelve caro escalar Growth Forms a otras landings.

## Goal

- Dejar AEO `/aeo-2/` usando el renderer portable `<greenhouse-form>` por `form-key`, sin bridge local de submit/captcha/validacion.
- Superar el baseline del bridge con una variante premium reusable: campos blancos con borde, dropdowns custom limpios con placeholders `Selecciona país` / `Selecciona tamaño`, CTA teal, trust inline, single-surface, mobile 390 sin overflow y estados/foco accesibles.
- Hacer el cutover WordPress de forma gobernada: backup Elementor, `heroans` hash before/after, `Document::save()`, Kinsta purge y rollback documentado.
- Verificar desktop/mobile 390, overflow, focus/ARIA, email gate, Turnstile boundary, dataLayer sin PII, tipografia, visual integrity y API publica antes de cerrar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/documentation/growth/motor-formularios-publicos.md`

Reglas obligatorias:

- No tocar Home `postId=2791`.
- No usar/revivir `/aeo` viejo `postId=250255`.
- No tocar hero salvo instruccion explicita; proteger widget derecho `heroans` con hash `e0b951b2456a83578cd9e22005900521`.
- Mutar Elementor solo con `\Elementor\Plugin::$instance->documents->get($post_id)->save([...])`, nunca escribir `_elementor_data` directo.
- Crear backup meta antes de guardar y purgar Kinsta cache despues.
- Verificar desktop/mobile, especialmente 390px, `scrollWidth == clientWidth`, spacing, letter-spacing y solapes.

## Normative Docs

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/greenhouse-gvc-playwright/SKILL.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/tasks/to-do/TASK-1297-growth-forms-stable-identity-render-copy.md`

## Dependencies & Impact

### Depends on

- `TASK-1297` complete: public GET AEO expone `formKey`, `copy.submit`, `security.captcha` y resolucion por formKey.
- `TASK-1294`: renderer Turnstile/captchaToken parity.
- `TASK-1296`: AEO `security.captcha` serializado en produccion.
- `live_cutover_pending_after_pre_live_parity`: el renderer ya pasó evidencia pre-live contra fixture hostil y composición real en memoria; falta migración WordPress live gobernada y revisión/GVC final.
- WordPress page `postId=250265`, section/widget `convers`.

### Blocks / Impacts

- Desbloquea retirar la excepcion bridge HTML para AEO.
- Sirve como primera migracion publica real del renderer generico con Turnstile en una landing de Efeonce.
- Informa patrones para futuras landings Growth Forms.

### Files owned

- `scripts/public-website/verify-aeo-form-typography.ts` (el gate está acoplado al DOM del bridge; ver F1 — hay que reescribir los selectores de control a `.ghf-*` del renderer)
- WordPress `postId=250265` Elementor `convers` (mutación live vía `Document::save()` + backup meta)
- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- AEO live page: `https://efeoncepro.com/aeo-2/`, `postId=250265`, status `publish`.
- Conversion section: `convers`, `.gh-aeo-conversion`.
- Renderer host/card: `.gh-aeo-form-card gh-aeo-growth-form-host` + `.gh-aeo-growth-form-card` con `<greenhouse-form>`.
- Renderer endpoint: `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`.
- Public contract: slug `efeonce-aeo-diagnostic`, **`formKey` real `b120566a-dd1a-43c8-956a-4e0121e805b8`** (TASK-1297 complete), versión publicada v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d` con `style_variant=diagnostic_premium`, `copy.submit="Solicitar diagnóstico gratis →"`, `security.captcha` y placeholders `Selecciona país` / `Selecciona tamaño`, surface `fhsf-efeonce-aeo-diagnostic`. GET por formKey === por slug verificado.
- Live gate: `pnpm public-website:verify-aeo-live-contract`.

### Gap

- Ningun gap bloqueante de TASK-1298. El bridge local fue reemplazado; WordPress ya no es dueño del submit, `/verify-email`, Turnstile execution ni error state.
- Follow-up opcional: aplicar `styleVariant=diagnostic_premium` a otros formularios donde convenga la misma estética.

### Renderer reality (ground-truth `src/growth-forms-renderer/**`, verificado 2026-06-30)

Lo que el renderer SÍ trae (apoyarse en esto, no reimplementar): skeleton de carga (no blank), errores inline con `aria-invalid`/`aria-describedby`/`role=alert`, email-gate debounced + typo-suggest con degradación honesta (404 → no bloquea), submit pending + anti-doble-submit, success inline/redirect, error de servidor **sanitizado** (nunca muestra `reason` crudo), estados honestos `"Formulario no disponible"` y `"No pudimos cargar… Reintentar"`, reduced-motion global, Turnstile invisible 1px sin layout shift, telemetry con allowlist dura sin valores de campo. Light-DOM (clases `.ghf-*`), themable por `--ghf-*`.

Lo que el renderer NO trae y la task debe autorar como markup WordPress (NO existe en el renderer):

- **No dibuja card** — solo un fill `--ghf-bg`. Para integrarlo en la card AEO (Opción A): `greenhouse-form { --ghf-bg: transparent }`.
- **No renderiza ningún heading** (`h1`–`h6`) — el título de la card (`.gh-aeo-growth-form-title`) es markup WP.
- **No tiene "Agenda una conversación →" / contacto / direct-link** — es markup WP y además el fallback honesto si el form no carga.
- **No auto-renderiza el no-JS fallback** (`noScriptFallback`) — el contenido interno de `<greenhouse-form>…</greenhouse-form>` es lo que se ve si el script no carga; autorarlo (el direct-link sirve doble).
- **`color-scheme` solo fuerza light y no está en `observedAttributes`** — setear `color-scheme="light"` en el embed (la banda `convers` es clara; sin esto, un visitante con OS dark vería el form oscuro).
- **`--ghf-font` default = `system-ui`** — setear stack DM Sans para alinear con la landing Ohio.
- **`form-key` ya existe** (TASK-1297 complete) y no es el bloqueo actual.
- **Falta paridad visual en host Ohio live** — el renderer light-DOM fue vulnerable a estilos del tema: inputs grises, selects con caret tileado y CTA oscuro. Ya existe un primer hardening de controles + fixture local hostil, pero la task no puede volver a migrar hasta demostrarlo en preview/live-safe frames contra la composición real de AEO.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante publico con interes en diagnostico AEO.
- Momento del flujo: seccion final de conversion de `/aeo-2/`.
- Resultado perceptible esperado: el formulario se siente igual o mas confiable que el bridge, sin card doble ni cambios de copy aprobada.
- Friccion que debe reducir: duplicacion de validacion/captcha por landing y riesgo de drift entre WordPress y Growth Forms.
- No-goals UX: redisenar hero, FAQ, secciones anteriores o crear un nuevo layout de landing.

### Surface & system decision

- Surface: WordPress/Elementor page `postId=250265`, section `convers`.
- Composition Shell: `no aplica` — landing WordPress/Elementor existente, no vista Greenhouse React.
- Primitive decision: `reuse` — `<greenhouse-form>` portable renderer.
- **Card composition (F2 = Opción A):** la card aprobada `.gh-aeo-growth-form-card` (borde hairline + sombra baja + radio + padding) es la única superficie visible y envuelve al renderer; el host `.gh-aeo-form-card` queda transparente (como hoy) y el renderer va `--ghf-bg: transparent`. NO se le da chrome de card al renderer (un solo dueño del chrome = CSS de la landing AEO, consistente con market/pipeline/diagnostic). Título + trust + privacidad + direct-link son markup WP dentro de la card.
- Adaptive density / The Seam: `no aplica` — no se crea card primitive Greenhouse; se adapta con CSS scoped del host.
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: `render_contract.copy` para CTA del renderer + copy local aprobado en AEO wrapper. **Los labels/placeholders de campo salen del `field_schema` del contrato publicado, no del bridge** — verificar pre-save que matchean la copy es-CL aprobada (F6).
- Access impact: `none`; surface/origin/CORS ya gobernados por Growth Forms.

### State inventory

- Default: renderer montado con campos AEO visibles.
- Loading: estado de carga del renderer no deja caja vacia ni salto severo.
- Empty: N/A; form debe existir.
- Error: errores inline del renderer; errores submit sanitizados (el renderer nunca muestra `reason` crudo).
- Degraded / partial: el renderer muestra `"Formulario no disponible"` (404) o `"No pudimos cargar… Reintentar"` (red/otros) — fallback honesto real, no blank. Además, el direct-link `Agenda una conversación →` (markup WP, siempre visible dentro de la card) es la recovery CTA si el renderer no monta, y dobla como no-JS fallback dentro de `<greenhouse-form>…</greenhouse-form>`.
- Permission denied: N/A para publico; origin/surface failure debe mostrarse como unavailable, no raw error.
- Long content: mobile 390 sin overflow ni solapes.
- Mobile / compact: una columna, CTA y privacidad visibles.
- Keyboard / focus: foco al primer campo invalido; todos los campos operables por teclado.
- Reduced motion: sin motion nueva; cualquier transicion existente debe respetar reduced-motion.

### Interaction contract

- Primary interaction: completar campos y enviar via renderer; no submit HTML custom.
- Hover / focus / active: usar estilos del renderer o CSS scoped sin romper contraste.
- Pending / disabled: submit pending visible y anti doble-submit del renderer.
- Escape / click-away: N/A.
- Focus restore: invalid submit lleva al primer error.
- Latency feedback: email verification y Turnstile submit no deben parecer congelados.
- Toast / alert behavior: no toasts; errores inline/status del renderer.

### Motion & microinteractions

- Motion primitive: `none` — contrato dedicado en `docs/ui/motion/TASK-1298-aeo-greenhouse-form-migration-motion.md`
- Enter / exit: no nuevo.
- Layout morph: no nuevo.
- Stagger: no nuevo.
- Timing / easing token: N/A.
- Reduced-motion fallback: renderer/page deben mantenerse estables.
- Non-goal motion: no agregar animaciones decorativas al form.

### Implementation mapping

- Route / surface: `https://efeoncepro.com/aeo-2/`, WordPress `postId=250265`, section `convers`.
- Primitive / variant / kind: `<greenhouse-form form-key>` / `diagnostic_intake` / AEO form contract.
- Component candidates: HTML widget existing host + renderer script; scoped CSS variables/classes.
- Copy source: `render_contract.copy.submit` from `TASK-1297`; section/trust copy remains in WordPress wrapper.
- Data reader / command: public Growth Forms GET/POST/verify-email por `formKey` con slug backward-compatible.
- API parity: WordPress embeds only; business logic stays in Growth Forms.
- Access / capability: public surface allowlist + CORS.
- States to implement: default, loading, field error, email gate, submit pending, captcha failure, success/unavailable.

### GVC scenario plan

- Scenario file: direct route capture or new scenario under `scripts/frontend/scenarios/` if assertions need persistence.
- Route: `https://efeoncepro.com/aeo-2/`.
- Viewports: desktop `1440x1200`, mobile `390x1100`, reduced-motion.
- Required steps: scroll to `.gh-aeo-conversion`, assert renderer mount, required errors, Gmail/free email block, corporate email verification path, submit boundary.
- Required captures: conversion section default, error state, email gate state, mobile 390.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root, submit button.
- Assertions: `scrollWidth == clientWidth`, CTA copy, no card-on-card, no technical kicker, `heroans` hash stable, dataLayer event allowlist no PII.
- Scroll-width checks: desktop and mobile 390.
- Reduced-motion / focus evidence: reduced-motion no visual instability; keyboard/focus invalid state checked.

### Design decision log

- Decision: replace bridge logic with portable renderer while preserving AEO shell.
- Alternatives considered: keep bridge, fork renderer for AEO, rewrite all conversion markup.
- Why this pattern: avoids per-landing captcha/validation drift and proves the renderer as reusable public primitive.
- Reuse / extend / new primitive: reuse.
- Open risks: renderer CSS may need scoped host tuning; verify before saving live and back up Elementor data.

### Visual verification

- GVC scenario: `pnpm fe:capture --route=/aeo-2/ --env=prod` or public URL equivalent plus Playwright script for form states.
- Viewports: desktop and mobile 390.
- Required captures: conversion section and form states.
- Required `data-capture` markers: `.gh-aeo-conversion`.
- Scroll-width check: `scrollWidth == clientWidth`.
- Accessibility/focus checks: invalid submit focus and ARIA.
- Before/after evidence: screenshot/capture before mutation and after.
- Known visual debt: none accepted; card-on-card is a blocker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Renderer parity lab before live migration

- Mantener WordPress prod en bridge mientras se trabaja la paridad/modernización.
- Reproducir como baseline mínimo el bridge aprobado en un entorno controlado antes de guardar live: inputs blancos con borde, selects limpios, placeholders aprobados, CTA teal, trust inline, single-surface y mobile 390 sin overflow.
- Diseñar la versión renderer modernizada como evolución permitida: mejor jerarquía visual, helper text más útil, validación inline más elegante, pending state claro, success/error calmado, foco visible y microinteracciones breves que orienten sin decorar.
- Resolver el aislamiento/hardening del renderer en hosts Ohio hostiles. Shadow DOM sigue siendo opción si el hardening CSS no alcanza; si se mantiene light DOM, debe pasar `pnpm public-website:verify-aeo-form-visual-contract` y luego demostrarse con frames de la página guardada.
- Probar renderer AEO en navegador sin guardar live para observar layout/copy/states (incluyendo dark-mode del OS y tipografía vs DM Sans).
- **Verificar PRE-save que el `field_schema` del contrato publicado tiene los labels/placeholders es-CL aprobados** (`Nombre`, `Correo corporativo`, `Sitio web de tu marca`, `País principal`, `Tamaño de la empresa`, `Competidor principal (opcional)` + placeholders) — el renderer los toma del contrato, no del bridge (F6). Si difieren, es bloqueante de `TASK-1297` (copy del contrato), no de esta task.
- Ejecutar `pnpm public-website:verify-aeo-prelive-contract` contra WordPress bridge/`heroans`, tipografia, bridge restaurado y el renderer hardenizado + la composición real inyectada en memoria antes de cualquier cutover.

### Slice 2 — Inspect and guarded Elementor migration (only after Slice 1 passes)

- Inspeccionar Elementor `convers`, widget IDs/classes/CSS page-scoped y bridge HTML vigente.
- Crear backup meta y validar `heroans` hash antes de cualquier save.
- Reemplazar la logica bridge por embed `<greenhouse-form form-key="..." surface="..." locale="es-CL" color-scheme="light">` + script renderer, con **contenido interno de fallback no-JS** (el direct-link) dentro de `<greenhouse-form>…</greenhouse-form>`.
- **Opción A:** mantener `.gh-aeo-growth-form-card` como única card visible envolviendo al renderer; host `.gh-aeo-form-card` transparente; renderer `--ghf-bg: transparent`. NO dar chrome de card al renderer.
- CSS scoped (solo dentro de `.gh-aeo-conversion`): `greenhouse-form { --ghf-bg: transparent; --ghf-font: <DM Sans stack Ohio>; }` + alinear `--ghf-accent`/radio/gap al lenguaje AEO si hace falta.
- Conservar como markup WP dentro de la card: título (`.gh-aeo-growth-form-title`, contrato `letter-spacing:-0.045em`), trust bullets (`.gh-aeo-growth-form-proof`), nota de privacidad y direct-link. NO renderizar kicker técnico.
- Preservar/ajustar CSS scoped solo dentro de `.gh-aeo-conversion`; no tocar seams globales.

### Slice 3 — Typography gate + verification and closure

- Mantener `scripts/public-website/verify-aeo-form-typography.ts` verde contra el estado vigente del bridge mientras no haya cutover.
- Extender o duplicar el gate al momento del cutover para que valide el DOM del renderer sin perder las aserciones del bridge aprobado.
- Ejecutar `pnpm public-website:verify-aeo-prelive-contract`; este gate falla si WordPress deja de estar en bridge restaurado, `heroans` cambia, el bridge/live page o el renderer pre-live regresan a inputs grises, select chevron-wall, CTA oscuro, placeholders incorrectos, trust ausente, overflow o frames stale/blank.
- Purgar Kinsta.
- Verificar desktop/mobile 390/reduced-motion, overflow, spacing, letter-spacing, no solapes, focus/ARIA, email gate, Turnstile boundary, dataLayer no PII, **dark-mode del OS forzado a light**, y `heroans` hash.
- **Reescribir la sección `convers` de `docs/documentation/public-site/aeo-landing-elementor.md`** (describe hoy el bridge → describir el renderer + Opción A + el contrato de tematización `--ghf-*`). Actualizar manuales/skills si cambian contratos operativos.

## Out of Scope

- Hero, Home, `/aeo` viejo.
- Cambiar engine/backend de Growth Forms.
- Cambiar HubSpot mapping/destination.
- Rediseñar FAQ o secciones anteriores.
- Crear renderer fork para AEO.

## Detailed Spec

Embed objetivo:

```html
<greenhouse-form form-key="<AEO_FORM_KEY>" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL" color-scheme="light" appearance="bare">
  <!-- Fallback no-JS / si el renderer no carga: el direct-link aprobado -->
  <a href="<AGENDA_URL>">¿Prefieres coordinar directo? Agenda una conversación →</a>
</greenhouse-form>
```

`<AEO_FORM_KEY>` debe venir del `form_key` real publicado por `TASK-1297`; no inventarlo ni reemplazarlo por slug/surface/page. `color-scheme="light"` es obligatorio (la banda `convers` es clara; sin él, un visitante con OS dark vería el form oscuro). `appearance="bare"` (chromeless, lo entrega `TASK-1297`) es la forma canónica de dejar el renderer sin chrome dentro de la card AEO; si por timing aún no estuviera, el equivalente es `--ghf-bg: transparent` en CSS scoped. El contenido interno de `<greenhouse-form>` es el fallback no-JS (el renderer NO auto-renderiza `noScriptFallback`). El host debe cargar el renderer desde `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js` siguiendo el contrato del widget/host actual. Si el widget Elementor existente ya provee esta carga, preferirlo sobre HTML manual.

Esta migración es el **primer consumidor real** del contrato de tematización transversal (`--ghf-*` + `appearance` + `color-scheme` + composición de card) documentado en `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md` → §"Tematización y composición de card (transversal)". No re-derivar la receta acá: consumir la del manual.

Tematización CSS scoped (dentro de `.gh-aeo-conversion`) — solo lo específico de AEO sobre la receta transversal:

```css
.gh-aeo-conversion greenhouse-form {
  /* appearance="bare" ya deja el renderer transparente; --ghf-bg solo como fallback si no está */
  --ghf-font: "DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1297` debe estar complete antes de ejecutar esta task, incluyendo el `formKey` real de AEO y el GET publico por formKey.
- Slice 1 renderer parity lab + visual gate -> Slice 2 backup/hash/preview/save Elementor -> Kinsta purge -> Slice 3 verification.
- No ejecutar Slice 2 mientras el renderer no pase paridad visual como mínimo contra el bridge aprobado en desktop y mobile 390; si el diseño modernizado difiere, debe tener frame review/GVC que pruebe que la diferencia mejora la experiencia y no degrada conversión/confianza.
- Si `heroans` hash cambia, detener y revertir solo el cambio de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Renderer no alcanza baseline visual aprobado | public-site/growth | high | Slice 1 obligatorio + `public-website:verify-aeo-prelive-contract` + revisión de screenshots/GVC antes de live | inputs grises, select chevron-wall, CTA oscuro |
| Modernización decorativa o confusa | public-site/growth | medium | microinteracciones solo si reducen incertidumbre; copy funcional; reduced-motion; frame review | motion teatral, helper copy genérico, foco perdido |
| Card-on-card o visual regression | public-site | low | Opción A (renderer `--ghf-bg:transparent` dentro de la card aprobada) + Playwright desktop/mobile | screenshot/capture |
| Gate `verify-aeo-form-typography` rompe (selectores del bridge) | public-site/tooling | high | reescribir selectores de control a `.ghf-*` en Slice 3 antes de cerrar | gate rojo o pasa vacío |
| Form se ve oscuro sobre banda clara (OS dark) | public-site | medium | `color-scheme="light"` en el embed + verificar con `prefers-color-scheme:dark` | form dark en `convers` claro |
| Tipografía del form clashea con la landing (system-ui vs DM Sans) | public-site | medium | `--ghf-font` DM Sans scoped + computed-style check | familia distinta al resto |
| Labels del contrato ≠ copy aprobada | growth | medium | verificar `field_schema` pre-save (F6) | label/placeholder en inglés u otra copy |
| Renderer no carga por CSP/CORS | public-site/growth | medium | GET script + public contract smoke antes de save + fallback no-JS (direct-link) | blank form/unavailable |
| Submit/captcha falla | growth/public-site | medium | smoke fail-closed + Turnstile boundary | `captcha_failed` unexpected |
| Hero se altera por Document::save | public-site | low | hash `heroans` before/after | md5 drift |

### Feature flags / cutover

Sin flag nuevo. Cutover vive en WordPress Elementor con backup meta y rollback por restore de backup.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no-op si solo inspeccion/preview | inmediato | si |
| Slice 2 | restaurar backup Elementor meta y purgar Kinsta | <10 min | si |
| Slice 3 | revertir a backup si cualquier gate visual/funcional falla | <10 min | si |

### Production verification sequence

1. `pnpm public-website:wpcli -- --eval-file ./tmp/<inspect>.php --wp-user 12`
2. Save via `Document::save()` con backup meta.
3. Purgar Kinsta.
4. Playwright/GVC desktop + mobile 390.
5. `pnpm public-website:verify-aeo-form-typography`.
6. Contract GET/POST fail-closed smoke.
7. Hash `heroans` unchanged.

### Out-of-band coordination required

El cambio live WordPress **no queda autorizado solo por existir esta task**. Mientras el blocker `live_cutover_pending_after_pre_live_parity` siga activo, el trabajo permitido es pre-live/read-only/in-memory. El cutover requiere aprobacion explicita del operador para mutar WordPress live, backup Elementor documentado, `heroans` hash before/after y plan de rollback inmediato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## 4-Pillar Score

### Safety

- **What can go wrong**: el browser recibe mapping/secret/HubSpot `formGuid`, o dataLayer filtra PII.
- **Gates**: el renderer no expone destination/secrets (server-only); telemetry con allowlist dura sin valores de campo; CORS/origin/surface gobernados por el engine; WordPress nunca captura datos.
- **Blast radius**: público (`/aeo-2/`). Mitigado por backup Elementor + rollback por restore.
- **Residual**: `page_uri` en dataLayer si la URL de la landing trae PII en query — aceptado (no aplica a `/aeo-2/`).

### Robustness

- **Atomicity**: mutación Elementor vía `Document::save()` + backup meta; rollback por restore.
- **Race protection**: hash `heroans` before/after; abort si drift.
- **Constraint coverage**: bridge vigente protegido por `verify-aeo-prelive-contract`; renderer hardening, composición real pre-live, `heroans` y frame-health cubiertos por `verify-aeo-prelive-contract`; migración futura exige gatear el DOM real ya guardado antes de cerrar.
- **Gap abierto**: renderer/Ohio visual parity en la composición real live-safe no está cerrado; por eso la task sigue `in-progress`.

### Resilience

- **Estados honestos**: el renderer trae unavailable + load-error+Reintentar (no blank); direct-link WP siempre visible = recovery + no-JS fallback.
- **Recovery**: restore de backup Elementor + Kinsta purge.
- **Degradation**: ningún `$0`/blank; estados con texto.

### Scalability

- **Patrón reusable**: primera migración real del renderer portable con Turnstile en una landing Efeonce; informa futuras landings.
- **Cost**: una página; sin cambio de engine.

## Acceptance Criteria

- [x] `TASK-1297` esta complete y el `formKey` real existe en produccion.
- [x] AEO `/aeo-2/` usa `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8">` para render/validation/submit en lugar del bridge HTML.
- [x] El target se identifica por `formKey`, no por pagina, screenshot, slug o surface.
- [x] La version publicada vigente es v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d` con `style_variant=diagnostic_premium`, CTA `Solicitar diagnóstico gratis →`, `security.captcha` y placeholders `Selecciona país` / `Selecciona tamaño`.
- [x] Los dos dropdowns AEO (`Pais principal` y `Tamano de la empresa`) usan el listbox premium del renderer, no el select nativo vulnerable a Ohio.
- [x] Desktop conserva pares escaneables (`Nombre`/`Email`, `Pais`/`Tamano`) y campos largos full-width; mobile 390 apila en una columna sin scroll horizontal.
- [x] El cutover WordPress se hizo con Elementor `Document::save()` y backup meta `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- [x] Kinsta fue purgado despues del save.
- [x] `heroans` md5 sigue `e0b951b2456a83578cd9e22005900521`.
- [x] El embed declara `color-scheme="light"` y `appearance="bare"`; la card visible sigue siendo una sola superficie AEO.
- [x] CTA visible es `Solicitar diagnóstico gratis →` desde `render_contract.copy.submit`.
- [x] Email Gmail/free/disposable se bloquea inline antes de `/submit`.
- [x] Turnstile/captchaToken path funciona; submit sin token sigue fail-closed.
- [x] dataLayer events no contienen PII.
- [x] Desktop y mobile 390 tienen `scrollWidth == clientWidth`, sin solapes.
- [x] `scripts/public-website/verify-aeo-form-typography.ts`, `verify-aeo-form-visual-integrity.ts`, `verify-aeo-form-live-behavior.ts`, `verify-aeo-wordpress-guards.ts` y `verify-aeo-public-api-contract.ts` pasan contra el renderer migrado.
- [x] La sección `convers` de `docs/documentation/public-site/aeo-landing-elementor.md` describe el renderer live + variante premium, no el bridge como estado vigente.

## Verification

- `pnpm task:lint --task TASK-1298`
- `pnpm ui:wireframe-check --task TASK-1298`
- `pnpm ui:motion-check --task TASK-1298`
- `pnpm public-website:verify-aeo-form-typography`
- `pnpm public-website:verify-aeo-form-visual-integrity`
- `pnpm public-website:verify-aeo-form-visual-contract`
- `pnpm public-website:verify-aeo-wordpress-guards`
- `pnpm public-website:verify-aeo-public-api-contract`
- `pnpm public-website:verify-aeo-form-live-behavior`
- `pnpm public-website:verify-aeo-live-contract`
- `pnpm vitest run src/growth-forms-renderer/__tests__/renderer.test.ts src/growth-forms-renderer/__tests__/api-client.test.ts src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts src/lib/growth/forms/__tests__/policy-compiler.test.ts`
- `pnpm renderer:build`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1298 --ui --runtime --docs`
- `pnpm docs:closure-check`
- `pnpm docs:context-check`
- Public Growth Forms GET by slug/formKey returns same v6; POST without captcha returns `403` with `outcome=captcha_failed`, `message=missing_token`.
- WP-CLI read-only `tmp/_aeo_convers_extract.php`: `heroansHash=e0b951b2456a83578cd9e22005900521`.
- WordPress backup meta: `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`complete`, cutover live verificado)
- [x] el archivo vive en la carpeta correcta (`docs/tasks/complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el estado actual
- [x] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado
- [x] `Handoff.md` quedo actualizado
- [x] `changelog.md` quedo actualizado
- [x] docs public-site/Growth Forms actualizados si el contrato operativo cambia

## Follow-ups

- Aplicar el mismo patron a otras landings solo despues de que sus forms publiquen copy/security contract propio.

## Open Questions

- Ninguna para crear la task. El agente que la tome debe decidir, tras inspeccion, si usa el widget Elementor `greenhouse_growth_form` o un HTML host minimo con script renderer.
