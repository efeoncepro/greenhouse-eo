# TASK-2045 — Growth Forms y Growth CTA: formularios diseñados en diálogo, tal cual

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
- Wireframe: `docs/ui/wireframes/TASK-2045-growth-form-dialog-design-fidelity.md`
- Flow: `docs/ui/flows/TASK-2045-growth-form-dialog-design-fidelity-flow.md`
- Motion: `docs/ui/motion/TASK-2045-growth-form-dialog-design-fidelity-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Code complete 2026-10-23 (Slices 1–5). Formularios vivos sin cambio (0 px) y contratos idénticos; popup medido a 0–2 px del canvas; axe limpio en 4 viewports. Consumidor publicado: formulario efeonce-partner-application (HubSpot directo, smoke 200/200) + CTA partners-become-partner. Rollout pendiente: Slice 6 (renderers a main — no autorizado), Turnstile interactivo real en el diálogo, embeber el CTA en /partnership/ y DLV/GA4 de activation_mode con ese release`
- Rank: `TBD`
- Domain: `growth|public-site|forms|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-10-23

- TASK-2044 dejó el contrato code complete en `develop` (local): `presentation.width`, `consent.presentation` + `privacyLinkLabel` + `{privacyLink}`, `successBehavior.icon` (no `presentation.icon`: `presentation` ya era un enum) y acción `dismiss`; CTA `open_growth_form.presentation` + `dialog`. Ya no bloquea.

## Summary

Extiende el renderer de Growth Forms (`<greenhouse-form>`) y el de Growth CTA (`<greenhouse-cta>`) para que un
formulario diseñado en un canvas se publique tal cual: esquema oscuro, ancho por campo, tokens de campo, etiqueta,
placeholder y botón, consentimiento compacto con el enlace en la frase, éxito con el glifo de La órbita y «Cerrar», y
un diálogo modal accesible que abre el formulario al pulsar un botón. Primer caso: el popup «Quiero ser partner» de la
landing de Partners. Consume el contrato de **TASK-2044**.

## Why This Task Exists

Hoy los formularios de los canvas se ven bien en el diseño y al implementarlos con Growth Forms hay que rediseñarlos,
porque el renderer no los soporta. Medido el 2026-10-23 contra el popup de Partners:

- `element.ts` sólo honra `color-scheme="light"` (~líneas 67 y 164): no hay formulario oscuro sobre una tarjeta navy.
- `fieldPrefersFullWidth` (`renderer.ts` ~783–807) pone `url` y `textarea` a fila completa y no deja pedir «Sitio web»
  en media columna.
- No hay tokens para alto de campo, tamaño y peso de etiqueta, color de placeholder ni radio del botón.
- El consentimiento es una tarjeta con un párrafo de enlace fijo (`copy.ts:141`); el diseño usa una casilla compacta con
  el enlace dentro de la frase.
- La tarjeta de éxito siempre muestra el ícono de celebración y sus acciones exigen `href`: no existe «Cerrar».
- Turnstile pone su contenedor en `document.body` (`turnstile.ts`): dentro de un diálogo modal quedaría inerte y fuera
  de la vista.
- El CTA sólo despliega el formulario dentro de su propia tarjeta (`action.ts`); no hay diálogo. La colocación
  `popup_modal` del contrato es interruptiva y no está implementada.

Sin esto, cada landing con formulario propio termina con CSS de parche o con un formulario distinto al aprobado.

## Goal

- El popup de Partners publicado con Growth Forms + Growth CTA queda igual al canvas v14 a 1440 y a 390 (≤ 2 px de
  diferencia en medidas), sin CSS de la landing más allá de tokens y hooks.
- El diálogo cumple el contrato de accesibilidad del flujo (foco, Escape, inert, scroll, retorno de foco) y no dispara
  medición antes de abrirse.
- Los formularios y CTAs vivos no cambian su render.
- El siguiente diseño de canvas sólo declara valores: el kit queda documentado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`
- `docs/architecture/ui-platform/MOTION.md`
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (el glifo de la órbita y la forma de la tarjeta)

Reglas obligatorias:

- Light DOM y tokens `--ghf-*` / `--ghcta-*`: la landing sólo toca tokens y hooks `data-ghf-*` / `data-ghcta-*`, nunca
  selectores internos. Cada token nuevo tiene un default igual al render actual.
- El renderer no lleva marca de Efeonce por defecto; el glifo `orbit` es una opción declarada por el contrato.
- Nada de `innerHTML` con texto del contrato: el enlace del consentimiento y el encabezado del diálogo se construyen con
  DOM y `textContent`.
- El diálogo es abierto por el visitante; no comparte reglas de frecuencia ni de supresión móvil con las colocaciones
  interruptivas.
- La medición usa los eventos existentes con `presentation=dialog`; ningún evento nuevo sin pasar por el plan de
  medición.

## Normative Docs

- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/operar-motor-cta.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/alta-surface-growth-form-checklist.md`
- `.claude/skills/greenhouse-growth-forms/SKILL.md`
- `.claude/skills/greenhouse-growth-ctas/SKILL.md`
- `.claude/skills/efeonce-graphic-line/SKILL.md`

## Dependencies & Impact

### Depends on

- **TASK-2044**: los campos `presentation.width`, consentimiento `compact` con `{privacyLink}`, éxito `dismiss` e
  `icon`, y `open_growth_form.presentation` + `dialog`.
- Renderer de formularios: `src/growth-forms-renderer/{element.ts, renderer.ts, styles.ts, copy.ts, turnstile.ts, contract.ts}`.
- Renderer de CTA: `src/growth-cta-renderer/{action.ts, renderer.ts, element.ts, styles.ts, copy.ts, disclosure-focus.ts, slide-in.ts, meeting-action.ts}`.
- Canal de publicación de los renderers (`docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`).

### Blocks / Impacts

- Despliegue de la landing de Partners con su popup (follow-up).
- **TASK-1750** (recuperación del desafío interactivo de Turnstile): mover el contenedor dentro del formulario le
  cambia el punto de montaje; recibe Delta y se coordina.
- **TASK-1320** (tarjeta de éxito, `in-progress`): el render de `dismiss` e `icon` toca su superficie; recibe Delta.
- **TASK-2038** (renderer en AXIS): si cierra antes, esta task se hace sobre el código en AXIS; si cierra después, el
  port lleva estos cambios. Recibe Delta.
- **TASK-1429** (slide-in interruptivo): comparte utilidades de foco; no cambia su comportamiento.

### Files owned

- `src/growth-forms-renderer/element.ts`
- `src/growth-forms-renderer/renderer.ts`
- `src/growth-forms-renderer/styles.ts`
- `src/growth-forms-renderer/copy.ts`
- `src/growth-forms-renderer/turnstile.ts`
- `src/growth-cta-renderer/action.ts`
- `src/growth-cta-renderer/renderer.ts`
- `src/growth-cta-renderer/styles.ts`
- `src/growth-cta-renderer/copy.ts`
- `src/growth-cta-renderer/dialog.ts` (nuevo)
- pruebas de ambos renderers y el fixture del popup de Partners
- `docs/ui/wireframes/TASK-2045-growth-form-dialog-design-fidelity.md`, `docs/ui/flows/TASK-2045-growth-form-dialog-design-fidelity-flow.md`, `docs/ui/motion/TASK-2045-growth-form-dialog-design-fidelity-motion.md`

## Current Repo State

### Already exists

- Renderer de formularios en light DOM con tokens `--ghf-*`, grilla de una o dos columnas por container query, estados
  de validación, envío y error, Turnstile y tarjeta de éxito.
- Renderer de CTA con colocaciones `embedded`, `inline_banner` y `slide_in`, acción `open_growth_form` desplegada en la
  tarjeta, utilidades de foco (`disclosure-focus.ts`) y el slide-in con su propia gestión de foco (`slide-in.ts`).
- El agendador nativo (`meeting-action.ts`) ya abre una superficie modal desde un CTA: referencia de cómo se monta un
  componente al abrir.

### Gap

- Sin esquema oscuro, sin ancho por campo, sin tokens de campo/etiqueta/placeholder/botón.
- Sin consentimiento compacto con enlace en la frase.
- Sin éxito con glifo de órbita ni acción de cierre.
- Turnstile fuera del formulario.
- Sin presentación en diálogo para `open_growth_form`.
- Sin fixture que pruebe un diseño de canvas real contra el renderer.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/growth-forms-renderer` y `src/growth-cta-renderer` (bundles públicos servidos por el canal del renderer)
- Future candidate home: `ui-package`
- Boundary: custom elements greenhouse-form y greenhouse-cta; la página anfitriona sólo usa atributos, tokens CSS y hooks data-ghf/data-ghcta
- Server/browser split: el render ocurre sólo en el navegador; el contrato llega por la API pública de Growth Forms y la proyección del CTA, sin secretos ni PII
- Build impact: renderer-bundle
- Extraction blocker: TASK-2038 mueve el renderer de formularios a AXIS; esta task debe quedar en el lado que exista al tomarla

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: visitante del sitio público (mouse, teclado, lector de pantalla, tacto)
- Momento del flujo: decide postular, pedir o dejar datos desde un botón de una landing
- Resultado perceptible esperado: el formulario aparece en un diálogo idéntico al diseño, se envía sin salir de la página y al cerrar vuelve donde estaba
- Friccion que debe reducir: formularios distintos al diseño aprobado, rediseños para encajar el renderer, salto a otra página
- No-goals UX: popups que aparecen solos, formularios de varios pasos, cambios al agendador nativo

### Surface & system decision

- Surface: diálogo modal del renderer de Growth CTA con el renderer de Growth Forms dentro
- Nav placement: `none` — sitio público, fuera del portal Greenhouse
- Composition Shell: `no aplica` — componente embebible del sitio público
- Primitive decision: `extend` — los dos renderers existentes; sin componente nuevo en la landing
- Adaptive density / The Seam: `no aplica` — dos formas, diálogo centrado y hoja inferior (corte 760 px)
- Floating/Sidecar/Dialog decision: `<dialog>` nativo con `showModal()`, abierto por el visitante
- Copy source: contrato del formulario y del CTA (TASK-2044) + diccionario de cada renderer (`copy.ts`) para la microcopy propia (Cerrar, Reintentar, estados)
- Access impact: `none`

### State inventory

- Default: cerrado; sólo el botón del CTA
- Loading: esqueleto de la grilla dentro de la tarjeta mientras llega el contrato
- Empty: no aplica (el formulario siempre tiene campos)
- Error: contrato no disponible → mensaje y enlace de respaldo; envío fallido → alerta con Reintentar y datos conservados
- Degraded / partial: sin JS → enlace de respaldo; Turnstile pide desafío → widget dentro de la tarjeta
- Permission denied: no aplica
- Long content: la tarjeta hace scroll propio (`max-height: calc(100vh - 48px)`); etiquetas largas envuelven
- Mobile / compact: hoja inferior bajo 760 px; `half` colapsa a una columna
- Keyboard / focus: foco al primer campo; tabulación encerrada; Escape cierra salvo enviando; foco devuelto al botón
- Reduced motion: sólo opacidad, sin desplazamiento; arco de éxito sin trazo animado

### Interaction contract

- Primary interaction: abrir con el botón, completar y enviar
- Hover / focus / active: borde agua al foco con halo de 3 px; × aclara su borde; botón primario según tokens
- Pending / disabled: botón en espera y diálogo no cerrable mientras envía
- Escape / click-away: cierran el diálogo, salvo durante el envío
- Focus restore: al botón que abrió el diálogo; si no está visible, al primer enfocable de su sección
- Latency feedback: esqueleto inmediato; indicador en el botón al enviar
- Toast / alert behavior: alertas dentro de la tarjeta, nunca toasts fuera del diálogo

### Motion & microinteractions

- Motion primitive: `CSS` (`@starting-style`, `transition-behavior: allow-discrete`); JS sólo para el cierre diferido
- Enter / exit: tarjeta 450 ms `emphasizedDecelerate` desde `translateY(32px) scale(.97)`; salida 250 ms `emphasizedAccelerate`
- Layout morph: cambio de formulario a éxito con cruce de opacidad y ajuste de altura sin salto
- Stagger: ninguno
- Timing / easing token: `--ghcta-dialog-*` con defaults alineados a `axisMotion`
- Reduced-motion fallback: opacidad 150 ms
- Non-goal motion: animaciones de campos, rebotes, bucles

### Implementation mapping

- Route / surface: fixture «partners-dialog» del renderer y la landing `/partnership/` cuando se despliegue
- Primitive / variant / kind: `<greenhouse-cta>` acción `open_growth_form` `presentation: 'dialog'`; `<greenhouse-form>` `color-scheme="dark"`
- Component candidates: `src/growth-cta-renderer/dialog.ts` (nuevo), `action.ts`, `renderer.ts`, `styles.ts`; `src/growth-forms-renderer/element.ts`, `renderer.ts`, `styles.ts`, `turnstile.ts`
- Copy source: contrato de TASK-2044 + `copy.ts` de cada renderer
- Data reader / command: API pública de Growth Forms por slug; proyección del CTA; envío por el endpoint público existente
- API parity: sin capacidad nueva de escritura; el formulario y el CTA se autoran por las vías gobernadas existentes (admin, scripts de publicación) con los campos de TASK-2044
- Access / capability: ninguna nueva; superficie pública con origen permitido
- States to implement: los del inventario y la tabla de estados del wireframe

### GVC scenario plan

- Scenario file: Playwright del renderer con el fixture «partners-dialog» `[verificar ruta de las pruebas e2e del renderer]`; GVC del portal no aplica al sitio público
- Route: fixture del renderer; después `/partnership/` en la vista previa de la landing
- Viewports: 1440×900, 1024×768, 390×844, 360×740
- Quality profile: `premium`
- Required steps: cerrado → abierto → validación → enviando → éxito → cerrado; R1 (contrato no disponible) y R4 (reabrir conserva datos)
- Required captures: un frame por paso y viewport, más el board del canvas v14 a los mismos anchos
- Required `data-capture` markers: `growth-cta-dialog`, `growth-form`
- Assertions: `<greenhouse-form>` ausente antes de abrir; ningún `gh_form_viewed` antes de abrir; Turnstile dentro del `<dialog>`; foco devuelto al botón; medidas ≤ 2 px del canvas
- Scroll-width checks: `scrollWidth == clientWidth` con el diálogo abierto; `body` sin scroll mientras está abierto
- Reduced-motion / focus evidence: `transform` nulo con movimiento reducido; orden de tabulación registrado
- Review dossier: comparación lado a lado con el canvas de Partners v14
- Baseline decision / surface ID: baseline nueva, `public-growth-form-dialog`

### Design decision log

- Decision: presentación `dialog` de la acción `open_growth_form` en el renderer del CTA, con `<dialog>` nativo y el formulario montado al abrir
- Alternatives considered: colocación `popup_modal` (interruptiva); modal propio en la landing; formulario incrustado en la página
- Why this pattern: abre por intención del visitante, hereda accesibilidad nativa, no mide vistas falsas y no exige código de la landing
- Reuse / extend / new primitive: extend de los dos renderers
- Open risks: soporte de `@starting-style` en Safari antiguo (cae a cierre sin animación); interacción con el banner de cookies y el dock inferior de las landings (z-index); coordinación con TASK-1750 y TASK-2038

### Visual verification

- GVC scenario: ver el plan de arriba
- Viewports: los del plan
- Required captures: los del plan
- Required `data-capture` markers: `growth-cta-dialog`, `growth-form`
- Scroll-width check: todos los viewports
- Accessibility/focus checks: axe sin violaciones en abierto, validación y éxito; lector anuncia título, errores y éxito
- Before/after evidence: canvas v14 frente al fixture; formularios vivos antes/después sin cambio
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-2045-growth-form-dialog.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

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

### Slice 1 — Formulario: esquema oscuro, ancho y tokens

- `color-scheme="dark"` aceptado con su bloque de tokens.
- `presentation.width` manda sobre la heurística; `half` colapsa bajo 520 px de contenedor.
- Tokens nuevos de alto de campo, etiqueta (tamaño y peso), placeholder y radio del botón; hook `data-ghf-submit`.
- Pruebas: render por defecto idéntico (snapshot de los tres formularios vivos), dark y anchos.

### Slice 2 — Formulario: consentimiento compacto y éxito

- Consentimiento `compact` con el marcador reemplazado por un enlace creado con DOM; sin párrafo de enlace aparte.
- Éxito con `icon: 'orbit' | 'none' | 'celebration'` y acción `dismiss` que emite `ghf:dismiss`.
- Pruebas: enlace sin `innerHTML`, `dismiss` sin navegación, íconos.

### Slice 3 — Turnstile dentro del formulario

- Contenedor del widget dentro de `<greenhouse-form>`; coordinado con TASK-1750.
- Prueba: el widget queda dentro de un `<dialog>` modal y es interactivo.

### Slice 4 — CTA: presentación en diálogo

- `dialog.ts`: `<dialog>` con `showModal()`, encabezado del contrato, ×, velo, bloqueo y restauración de scroll,
  retorno de foco, cierre bloqueado durante el envío, hoja inferior en teléfono, motion y movimiento reducido.
- `action.ts`: monta `<greenhouse-form>` al abrir, lo conserva al cerrar en la visita, escucha `ghf:dismiss` y el
  éxito; `presentation=dialog` en la medición.
- Pruebas: foco, Escape, inert, eventos en orden, un solo diálogo a la vez.

### Slice 5 — Fixture, evidencia y kit

- Fixture «partners-dialog» con el contrato de prueba que reproduce el popup.
- Evidencia del plan GVC y scorecard.
- Kit documentado: tokens y hooks en `docs/architecture/growth-public-forms-runtime-contract.md` (sección que abre
  TASK-2044) y en los manuales de formularios y CTA, con el ejemplo de Partners.

### Slice 6 — Publicación del renderer

- Publicar las nuevas versiones de ambos renderers por su canal, verificar en la vista previa del sitio y dejar el
  canal anterior listo para volver.

## Out of Scope

- Contratos y validación en el servidor (TASK-2044).
- La colocación interruptiva `popup_modal`.
- El formulario «Quiero ser partner» (alta, destino en HubSpot, fila del plan de medición, avisos al equipo).
- El despliegue de la landing de Partners.
- Formularios de varios pasos y botón Atrás que cierre el diálogo.
- Mover el renderer a AXIS (TASK-2038).

## Detailed Spec

El wireframe, el flujo y el motion de esta task son la especificación; en resumen:

- **Diálogo** (`src/growth-cta-renderer/dialog.ts`): `openGrowthFormDialog({ trigger, form, header, onClose })` crea un
  `<dialog data-ghcta-dialog>` hermano del CTA (no dentro de su tarjeta, para escapar de `overflow` y `transform`
  del anfitrión), lo abre con `showModal()`, aplica `scrollbar-gutter: stable` y bloqueo de scroll del `body`, y al
  cerrar devuelve el foco a `trigger`. Un solo diálogo abierto por documento.
- **Tokens del diálogo**: `--ghcta-dialog-backdrop`, `--ghcta-dialog-blur`, `--ghcta-dialog-surface`,
  `--ghcta-dialog-border`, `--ghcta-dialog-radius`, `--ghcta-dialog-radius-sheet`, `--ghcta-dialog-shadow`,
  `--ghcta-dialog-max-width`, `--ghcta-dialog-padding`, `--ghcta-dialog-padding-sheet`, y los de motion.
- **Tokens del formulario**: `--ghf-field-min-height`, `--ghf-field-bg`, `--ghf-field-border`, `--ghf-field-radius`,
  `--ghf-focus-ring`, `--ghf-label-size`, `--ghf-label-weight`, `--ghf-label-color`, `--ghf-placeholder`,
  `--ghf-btn-radius`, `--ghf-consent-accent` `[verificar cuáles ya existen en styles.ts y reutilizarlos]`.
- **Valores del caso Partners** (piel de la landing, no defaults): tarjeta `#001a33`, borde `rgba(114,222,216,.28)`,
  radio `28px 28px 28px 6px`, campo 48 px / radio 12 px, etiqueta 13 px 500 `#cfe4fa`, placeholder
  `rgba(207,228,250,.45)`, foco `#36c8bf`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-2044 mergeada antes de empezar.
- Slices 1–3 (formulario) antes del 4 (diálogo), porque el diálogo depende de `dismiss` y de Turnstile dentro.
- Slice 6 sólo con la evidencia del Slice 5 completa.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un formulario vivo cambia de aspecto | Growth Forms en el sitio | medium | defaults = valores actuales; snapshot de los tres formularios vivos antes/después | diff visual en la evidencia |
| Turnstile deja de funcionar al moverlo | envíos públicos | medium | prueba con desafío forzado; coordinar con TASK-1750; volver al canal anterior | caída de `gh_form_submitted` o errores de desafío en logs |
| Diálogo tapado por el dock o el banner de cookies | landings | medium | `<dialog>` en la capa superior nativa; prueba con dock y banner visibles | capturas del plan GVC |
| Medición inflada | GA4 | low | montaje al abrir; aserción de eventos en orden | `gh_form_viewed` sin `gh_cta_clicked` previo |
| Safari sin `@starting-style` | visitantes iOS antiguos | low | cierre sin animación como fallback | prueba en WebKit |

### Feature flags / cutover

- Sin flag: el diálogo sólo existe cuando un CTA declara `presentation: 'dialog'`; los cambios del formulario son
  opt-in por versión de formulario. El corte es la publicación del renderer.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–5 | revert del commit (nada publicado todavía) | minutos | sí |
| Slice 6 | volver a publicar la versión anterior del renderer en su canal | < 15 min | sí |

### Production verification sequence

1. Pruebas de ambos renderers y fixture verdes en local.
2. Evidencia GVC del fixture frente al canvas.
3. Publicación al canal de vista previa; los tres formularios vivos sin cambio visual.
4. Publicación al canal estable y repetición de la comprobación.

### Out-of-band coordination required

- Canal de publicación de los renderers (sitio público): aviso a la sesión que opere el sitio antes del Slice 6.
- TASK-1750 (Turnstile) antes del Slice 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `<greenhouse-form color-scheme="dark">` aplica el bloque oscuro; sin el atributo el render es idéntico al actual. Evidencia: `design-fidelity.test.ts` + harness.
- [x] Un campo con `width: 'half'` ocupa media columna en el modo de dos columnas y la fila completa bajo 520 px. Evidencia: test + harness a 1440 (265 px) y 390 (324 px, una columna).
- [x] Los tokens nuevos existen con defaults iguales al render actual, comprobado con el snapshot de los tres formularios vivos. Evidencia: los contratos vivos de media, inbound, HubSpot y AEO dibujados con el bundle de producción y con el nuevo dan **0 píxeles de diferencia** a 1440 y 390 (`docs/ui/reviews/TASK-2045/live-forms-renderer-diff.json`).
- [x] El consentimiento `compact` muestra el enlace dentro de la frase, creado sin `innerHTML`, y no muestra el párrafo de enlace aparte. Evidencia: `design-fidelity.test.ts` (incluye texto con HTML que no se interpreta).
- [x] La tarjeta de éxito muestra el glifo de la órbita con `icon: 'orbit'` y «Cerrar» (`dismiss`) cierra el diálogo sin navegar. Evidencia: tests + harness (`success-1440.png`).
- [ ] El widget de Turnstile queda dentro del formulario y funciona dentro de un `<dialog>` modal. **Parcial:** el contenedor se monta junto al formulario (test en `renderer.test.ts`); el desafío interactivo real dentro del diálogo no se probó (requiere sitekey real en un host; coordinación con TASK-1750).
- [x] Un CTA con `presentation: 'dialog'` abre un `<dialog>` modal con el encabezado del contrato; Escape, × y el velo lo cierran salvo durante el envío; el foco vuelve al botón. Evidencia: `dialog.test.ts` + harness.
- [x] `<greenhouse-form>` no existe en el DOM y no hay `gh_form_viewed` antes de abrir; los eventos llevan la presentación (`activation_mode: 'dialog'`, el vocabulario ya usado por el agendador). Evidencia: `dialog.test.ts`; DLV/dimensión GA4 pendientes (TRACKING-PLAN).
- [x] El fixture «partners-dialog» queda a ≤ 2 px del canvas v14 en alto de campo, radios, paddings y separaciones a 1440 y 390. Evidencia: `docs/ui/reviews/TASK-2045/review-dossier.md` (Δ 0 px; 2 px en el ancho del botón).
- [x] `UI ready` permanece `no` hasta que implementation mapping, GVC scenario plan y design decision log estén completos; si queda en `yes`, `pnpm task:lint --task TASK-2045` pasa sin hallazgos. (Queda `no`: el escenario GVC del portal no aplica a una superficie pública.)
- [x] axe sin violaciones en abierto, validación y éxito; `scrollWidth == clientWidth` en los cuatro viewports. Evidencia: `docs/ui/reviews/TASK-2045/a11y-viewports.json` (1440, 1024, 390, 360).
- [x] Movimiento reducido: sin desplazamiento ni escala. Evidencia: Playwright con `reducedMotion: reduce` → `transform: none` en 1440 y 390.
- [x] El kit de tokens y hooks está documentado con el ejemplo de Partners (contrato de runtime + `partner-dialog-skin.css` + manuales).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/growth-forms-renderer src/growth-cta-renderer`
- `pnpm test` (suite completa antes de cerrar)
- Playwright del fixture en los cuatro viewports, con y sin movimiento reducido
- `pnpm task:lint --task TASK-2045`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] los manuales de formularios y CTA explican cómo pedir el diálogo y los tokens

## Follow-ups

- Formulario «Quiero ser partner» y despliegue de la landing de Partners con su popup.
- Botón Atrás que cierre el diálogo, si la medición muestra abandonos por esa vía.
- Llevar el diálogo a otras landings con formularios en la página.

## Open Questions

- ¿El diálogo debe registrar una entrada en el historial para que Atrás lo cierre? Propuesta: no en esta task.
- ¿El enlace de privacidad abre en pestaña nueva o en la misma? Propuesta: nueva, para no perder lo escrito.
