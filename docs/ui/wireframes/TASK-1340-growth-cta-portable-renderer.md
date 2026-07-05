# Wireframe — TASK-1340 Growth CTA Portable Renderer (embedded/banner, WordPress + Think)

## Meta

- Task: `TASK-1340`
- Epic: `EPIC-023`
- UI rigor: `ui-platform` (nueva primitive de renderer portable host-DOM, reusable cross-surface)
- Surfaces: WordPress público (`efeoncepro.com` host layer) + Think (`think.efeoncepro.com`, wrapper Astro) + Greenhouse admin preview
- Primitive base: extiende el precedente shipeado `src/growth-forms-renderer/**` (Web Component vanilla TS, tokens `--ghf-*`, `ElementInternals`, container queries, skeleton anti-CLS)
- Consumes contract: `greenhouse-growth-cta-popup.v1` (render contract publicado por TASK-1339)
- Placement de esta task: `embedded` / `inline_banner` (el interruptivo `popup_modal`/`slide_in` es task siguiente)

## Brief

Renderer portable host-DOM que pinta el **primer CTA real** (follow-up del reporte AI Visibility) a partir del render contract arbitrado server-side por TASK-1339. Un solo Web Component `<greenhouse-cta>` rinde **el mismo contrato publicado** en dos runtimes distintos —el sitio público WordPress y el hub Think— probando la tesis de portabilidad (rechaza Alternative B / snippets por página). La acción de este CTA es `open_growth_form`: abre el grader form gobernado sin duplicar su schema/validación/consent. Sin MUI/Vuexy en el renderer público; el admin preview sí usa primitives Greenhouse.

## Layout Skeleton

Placement `embedded`/`inline_banner` — card no-modal en el flujo de contenido, sin overlay ni focus trap:

```
┌───────────────────────────────────────────────────────────[data-capture="cta-card"]┐
│  [eyebrow / campaign label — opcional]                                      [✕ dismiss]│
│  H  Headline (1 línea, copy del contrato)                                              │
│     Supporting line (1–2 líneas, value/relevancia)                                     │
│                                                                                        │
│  [ ▸ Primary CTA — open_growth_form ]   [ secondary link — opcional ]                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
   ↑ reserva de altura (skeleton anti-CLS) antes de hidratar — NUNCA empuja el contenido del host
```

- Mobile (≤390px): stack vertical, CTA full-width ≥44px de alto, dismiss con target ≥24px, sin cubrir navegación ni campos esenciales.
- El card se dimensiona por su ancho (container query `--gh-cta-*`), no por viewport global — vive embebido en anchos distintos (columna WP vs bloque Think).
- Skeleton reserva el alto final antes de hidratar para CLS = 0.

## Copy Ledger

Todo copy visible sale del render contract publicado (server-side, es-CL, validado con `greenhouse-ux-writing`) — el renderer NO hardcodea strings. Fuente de copy reusable: `src/lib/copy/growth.ts` (`GH_GROWTH_CTA_*`) para labels estructurales (dismiss aria, loading, error), campaign copy viene del `cta_version`.

| Elemento | Fuente | Ejemplo (placeholder, copy final en el contrato/`growth.ts`) |
|---|---|---|
| Eyebrow | `cta_version.content_json` | `Tu visibilidad en IA` |
| Headline | `cta_version.content_json` | `Mira cómo te ve la IA` |
| Supporting | `cta_version.content_json` | `Genera tu informe de visibilidad en buscadores con IA en 2 min.` |
| Primary CTA | `cta_version.action_policy_json` | `Generar mi informe` |
| Dismiss aria-label | `src/lib/copy/growth.ts` | `Cerrar este aviso` |

## State Copy

- Loading (pre-hidratación): skeleton silencioso, sin texto placeholder ruidoso.
- Error (contrato no resuelve / red): el card NO se muestra (fail-closed); nunca un card roto/vacío en superficie pública. Se emite `greenhouse_cta_error` + señal server.
- Dismissed: colapsa sin dejar hueco; registra suppression vía ingest.
- Reduced motion: aparece sin transform/opacity animada, estado final directo.

## Accessibility Contract

- `embedded`/`inline_banner` NO usa `aria-modal` ni focus trap (no es modal); sigue el orden DOM natural.
- CTA primario y dismiss son controles con nombre accesible y focus visible (`:focus-visible` outline, forced-colors safe).
- Dismiss accesible por teclado; target ≥24px (≥44px móvil).
- Contenido no depende de color/animación/imagen-only text; contraste WCAG AA.
- El card no roba foco al cargar (no autofocus en superficie pública).

## Implementation Mapping

- Route / surface: WordPress host layer (shortcode/block/plugin que emite `<greenhouse-cta>` + enqueue del bundle pineado + `surface_id`/`embed_key` + CSP nonce) · Think wrapper Astro (island que emite el mismo custom element) · Greenhouse admin preview.
- Primitive / variant / kind: nueva primitive `growth-cta-renderer` (`src/growth-cta-renderer/**`), hermana de `src/growth-forms-renderer/**`; variant `placement=embedded|inline_banner` en esta task.
- Component candidates: Web Component `<greenhouse-cta>` (light DOM + `ElementInternals`), módulos `contract` (espejo browser-safe + drift guard vs `greenhouse-growth-cta-popup.v1`), `render`, `telemetry` (`greenhouse_cta_*` dataLayer + `CustomEvent` con allowlist dura, sin PII), `styles` (tokens `--gh-cta-*`, `@layer`, container queries, skeleton anti-CLS), `action` (invoca `open_growth_form` → monta `<greenhouse-form>`), `element`.
- Copy source: render contract (campaign) + `src/lib/copy/growth.ts` (estructural).
- Data reader / command: GET `/api/public/growth/ctas/render` (contrato arbitrado) + POST `/api/public/growth/ctas/events` (exposición/interacción) — TASK-1339.
- API parity: el renderer es un consumer más del primitive `growth.cta` (igual que Nexa/MCP); cero lógica de política/destino en el browser.
- Access / capability: superficie pública anónima; autorización por surface binding + embed key + origin (server-side, TASK-1339).
- States to implement: default, loading/skeleton, error (fail-closed), dismissed, reduced-motion, mobile/compact, keyboard/focus.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts`
- Route: staging Think report con el CTA follow-up + página WP de prueba con el shortcode (o Greenhouse preview `/admin/growth/ctas/preview`).
- Viewports: 1440 · 1280 · 390.
- Required steps: cargar surface → esperar hidratación del `<greenhouse-cta>` → capturar default → click primary → capturar apertura de `<greenhouse-form>` → dismiss → capturar colapso.
- Required captures: `cta-default`, `cta-form-open`, `cta-dismissed`, `cta-reduced-motion`.
- Required `data-capture` markers: `cta-card` (y `cta-form` cuando abre el form).
- Assertions: sin scroll horizontal de página en 1440/390; CLS = 0 (el card no empuja contenido); el card no aparece si el contrato no resuelve.
- Scroll-width checks: sí (1440 + 390).
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion` + evidencia de focus-visible en CTA y dismiss.

## Design Decision Log

- Decision: renderer portable host-DOM (Web Component vanilla), NO iframe por defecto, NO MUI en público.
- Alternatives considered: (A) iframe embed — rechazado (degrada GTM/dataLayer, responsive, a11y, tokens; arch Alternative E, solo fallback hostil); (B) snippet por página WP/Think — rechazado (drift de estilo/targeting/a11y; arch Alternative B); (C) reusar `GreenhouseFloatingSurface` MUI en público — rechazado (no puede depender de MUI/Next; arch Alternative F).
- Why this pattern: reusa el precedente shipeado de Growth Forms renderer (TASK-1231), preserva medición host y prueba portabilidad con un solo core.
- Reuse / extend / new primitive: **new** primitive hermana de forms-renderer, mismo patrón (contract mirror + tokens `--gh-*` + telemetry allowlist + ElementInternals).
- Open risks: paridad preview(MUI)↔público(WC) — mitigada con render-contract parity test; CLS en host WP con temas de terceros — mitigada con reserva de altura.

## Acceptance Checklist

- [ ] `<greenhouse-cta>` rinde el mismo render contract publicado en WordPress host layer + Think wrapper (+ admin preview).
- [ ] Placement `embedded`/`inline_banner` sin overlay/focus-trap; a11y (nombre accesible, focus visible, dismiss por teclado) cubierta.
- [ ] CLS = 0 (skeleton reserva altura); sin scroll horizontal de página en 1440/390.
- [ ] `open_growth_form` monta `<greenhouse-form>` del grader sin duplicar schema/validación/consent.
- [ ] Eventos `greenhouse_cta_*` en dataLayer con allowlist dura (sin PII); reconcilian con el ledger server-side.
- [ ] Reduced-motion preserva estado final; error = fail-closed (no card roto en público).
- [ ] Render-contract parity test preview↔público verde.
- [ ] GVC desktop + mobile capturado y mirado (enterprise).
