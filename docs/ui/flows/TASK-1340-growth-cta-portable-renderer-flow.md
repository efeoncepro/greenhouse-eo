# Flow — TASK-1340 Growth CTA Portable Renderer (CTA → open_growth_form)

## Meta

- Task: `TASK-1340`
- Epic: `EPIC-023`
- Program master flow: `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md` `[verificar / crear si no existe]` — esta surface (CTA embedded → form) es un nodo del sistema CTA, no una pantalla aislada.
- Related program: EPIC-020 AI Visibility lead magnet — el CTA follow-up es el puente reporte → nuevo lead.
- Contract: `greenhouse-growth-cta-popup.v1` (TASK-1339) + Growth Forms contract (`open_growth_form`).

## Flow Brief

El visitante ve un CTA embebido (follow-up del reporte AI Visibility en Think, o banner en WP), lo activa, y el renderer abre el grader form gobernado in-place — sin salir de la página, sin duplicar el form. El CTA coordina la apertura/cierre del `<greenhouse-form>` (montaje del custom element), por eso es un flow: cruza del prompt (CTA) al form (otra primitive) y de vuelta al outcome. El submit del form sigue su propio contrato (TASK-1327/1336); el CTA solo guarda la relación.

## Surfaces Involved

- WordPress host layer (`efeoncepro.com`): shortcode/block emite `<greenhouse-cta>`.
- Think (`think.efeoncepro.com`): wrapper Astro island emite `<greenhouse-cta>` como follow-up del reporte.
- Greenhouse admin preview (`/admin/growth/ctas/preview`): mismo custom element, superficie interna de QA.
- Growth Forms renderer (`<greenhouse-form>`): destino de `open_growth_form`.

## Flow Map

```
[surface load]
      │  GET /api/public/growth/ctas/render (arbitrado server-side)
      ▼
[¿contrato resuelve?] ──no──▶ [no render] (fail-closed, greenhouse_cta_error)
      │ sí
      ▼
[CTA embedded visible] ──dismiss──▶ [colapsa] → POST events (suppressed/dismissed)
      │  click primary (open_growth_form)
      ▼
[monta <greenhouse-form> in-place] → greenhouse_cta_form_opened + POST events(form_opened)
      │  submit (contrato Growth Forms, TASK-1327/1336)
      ▼
[form success / handoff] → greenhouse_cta_form_submitted + relación CTA↔submission (join)
```

## Interaction Triggers

- Render: al cargar la surface + eligibilidad server-side (route/surface match).
- Primary CTA (`open_growth_form`): monta el form gobernado in-place (embed) o abre su superficie.
- Dismiss: colapsa el card y registra suppression.
- Escape / click-away: sobre el card embebido no aplica (no-modal); aplica al form si abre como modal (contrato del form).

## State Machine

```
idle → resolving → (no_render | visible)
visible → dismissed              (suppression registrada)
visible → form_opening → form_open
form_open → form_submitted       (autoridad de conversión = ledger del form)
form_open → form_abandoned       (cierra sin submit; el CTA no reclama conversión)
(cualquiera) → error → no_render (fail-closed en superficie pública)
```

## Routing Contract

- El CTA NO navega de ruta por sí solo en esta task (placement embedded); `open_growth_form` monta el form in-place. Si el `action_policy` fuera `link_url`/`open_think_tool`, sería navegación gobernada por el contrato (fuera de scope acá).
- Deep-link / query params: el CTA propaga UTM/campaign context al form como contexto (NO PII), respetando la allowlist del telemetry.
- El submit y su handoff al reporte se rigen por TASK-1336 (tokenized report success), no por esta task.

## Focus & Accessibility

- El card embebido no roba foco al montar; el orden de tab sigue el DOM del host.
- Al abrir el form: si el form se presenta como modal, el foco entra al form y retorna al CTA al cerrar (contrato del `<greenhouse-form>`); si embebido inline, el foco avanza natural.
- Dismiss accesible por teclado; foco no queda huérfano tras el colapso (pasa al siguiente elemento lógico).

## Data & Command Boundaries

- Read: `GET /api/public/growth/ctas/render` (contrato arbitrado, TASK-1339).
- Write (ingest): `POST /api/public/growth/ctas/events` (viewed/clicked/dismissed/form_opened/form_submitted) — `trust_level`, allowlist, sin PII.
- Action boundary: `open_growth_form` resuelve el form contract vía el reader de `growth.forms`; el CTA NUNCA duplica campos/validación/consent. El submit del form escribe en el ledger de Growth Forms (autoridad de conversión); el CTA guarda solo el join.
- Full API Parity: renderer = consumer del primitive `growth.cta`; misma superficie que Nexa/MCP consumirían.

## Failure Paths

- Contrato no resuelve / 4xx-5xx: fail-closed (no card), `greenhouse_cta_error` + `growth.cta.render_error_rate`.
- Ingest falla: no rompe la UX; reintento idempotente; `growth.cta.event_ingest_error_rate`.
- `open_growth_form` no resuelve el form: no abre; `greenhouse_cta_error` + `growth.cta.form_handoff_failed`; el CTA no queda en estado colgado.
- Surface/embed key inválido: server rechaza (403) + `growth.cta.surface_unauthorized_attempt`; el card no aparece.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts` (compartido con el wireframe).
- Route: Think report staging + WP test page (o admin preview).
- Viewports: 1440 · 390.
- Required steps: load → visible → click primary → form_open → submit (mock/staging) → success; y rama dismiss.
- Required captures: `cta-default`, `cta-form-open`, `cta-dismissed`.
- Assertions: transición CTA→form sin salto de layout; foco correcto al abrir/cerrar el form; fail-closed si el contrato no resuelve.

## Design Decision Log

- Decision: `open_growth_form` monta el form gobernado in-place, el CTA no reimplementa el form.
- Alternatives considered: (A) el CTA linkea a una página de form separada — peor fricción/medición; (B) el CTA embebe una copia del form — rechazado (viola boundary Growth Forms, arch Alternative C).
- Why this pattern: el CTA es orquestación; el form es captura. Mantener el boundary preserva consent/validación/ledger del form como autoridad.
- Open risks: coordinación del foco CTA↔form si el form abre modal — cubierta por el contrato de `<greenhouse-form>`.

## Acceptance Checklist

- [ ] El flow CTA → `open_growth_form` → form success está cableado en WP + Think con el mismo contrato.
- [ ] El CTA no duplica el form; el submit usa el ledger de Growth Forms como autoridad; el CTA guarda el join.
- [ ] Estados `no_render`/`dismissed`/`form_open`/`form_abandoned`/`error` cubiertos.
- [ ] Foco correcto en apertura/cierre del form; dismiss por teclado.
- [ ] Failure paths (contrato/ingest/handoff/surface) fail-closed con señal, sin card roto en público.
- [ ] Referencia al master flow del programa registrada (o master flow creado si faltaba).
