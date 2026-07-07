# TASK-1351 — Landing "Redes Sociales" — entrega a reunión + auditoría (Flow Contract)

## Meta

- Status: `draft`
- Owner task: `TASK-1351 — Landing pública de servicio Redes Sociales (/servicios/redes-sociales)`
- Related wireframe: [docs/ui/wireframes/TASK-1351-landing-redes-sociales.md](../wireframes/TASK-1351-landing-redes-sociales.md)
- Intended route / surface: `efeoncepro.com/servicios/redes-sociales`
- Flow type: `multi-surface` (landing pública → auditoría embebida vía `<greenhouse-form>` → HubSpot pipeline; y landing → HubSpot Meetings)
- Primary primitives: patrones marketing `modern-ui` + `<greenhouse-form>` embebido + link a HubSpot Meetings.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing`); es-LATAM neutro.

## Flow Brief

- Primary user: decisor de marketing (ICP Globe) evaluando proveedor de gestión de redes.
- Entry moment: llega por búsqueda ("agencia de redes sociales"/"gestión de redes sociales"), campaña o link interno; solution/product-aware.
- Successful outcome: (a) agenda una reunión (alta intención) **o** (b) deja sus datos para una auditoría de redes (bajo compromiso) — dos escalones de intención.
- Primary decision/action: click "Agenda una reunión" o completar el `<greenhouse-form>` de auditoría.
- Non-goals: no es self-serve del portal; no expone datos de cliente; no reconstruye el motor de forms ni el agendador.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Base page `/servicios/redes-sociales` | Entrada + contexto + oferta dual | Página larga, scroll natural, CTA sticky opcional post-hero | Stack 1-col; sticky CTA se oculta dentro/antes del form para no tapar campos | `modern-ui` marketing |
| `#auditoria` (form embebido) | Captura de lead de bajo compromiso | `<greenhouse-form>` renderizado inline al final | Idéntico, campos apilados | `<greenhouse-form>` (Growth Forms) |
| HubSpot Meetings (externo) | Agendamiento de alta intención | Nueva pestaña con UTM de la landing | Igual | Link externo gobernado |

## Flow Map

1. Entry: usuario aterriza en `/servicios/redes-sociales`.
2. Primary action: evalúa (hero → muro social vivo → prueba → cómo medimos) y elige un escalón: reunión o auditoría.
3. Transition: "Agenda una reunión" abre HubSpot Meetings (nueva pestaña, UTM); "Pide una auditoría" hace scroll ancla a `#auditoria` y enfoca el form.
4. User decision: completa el form de auditoría o agenda la reunión.
5. Completion: submit del form → Success Card del renderer (pipeline Growth Forms → HubSpot); o reunión agendada en HubSpot.
6. Recovery / exit: si el embed del form no carga (JS off/CORS), fallback link a `mailto:`/contacto con UTM — el CTA nunca muere.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click "Agenda una reunión" | Hero + CTA final | HubSpot Meetings (nueva pestaña) | Enter/Space en el link | UTM de la landing |
| Click "Pide una auditoría" | Hero + CTA final | Scroll ancla `#auditoria` + focus al primer campo | Enter/Space | No abre modal; es sección inline |
| Submit del form | `#auditoria` | Success/Error Card (renderer) | Enter en submit | Owned por el renderer (TASK-1320) |
| Abrir FAQ | Región FAQ | `<details>` expandido | Enter/Space en `<summary>` | Semántico nativo |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | Form colapsado/fuera de viewport | Carga de página | Scroll a `#auditoria` | Form montado pero no enfocado |
| opening | Scroll ancla al form | Click "Pide una auditoría" | Form en viewport | Scroll suave (o instantáneo bajo reduced-motion) |
| open | Form visible y enfocable | Form en viewport | Submit o abandono | Primer campo enfocable |
| loading | Submit en curso | Click submit | Respuesta del pipeline | Estado del renderer |
| error | Submit falló / captcha | Respuesta de error | Reintento | Error Card del renderer (texto+ícono, no solo color) |
| dirty | Campos con datos sin enviar | Usuario tipea | Submit o navegación | Sin confirmación bloqueante (form corto) |
| complete | Lead capturado | Submit ok | — | Success Card + próximos pasos |

## Routing Contract

- Route changes: `hash` (`#auditoria` para el ancla del form; sin cambio de ruta base).
- Canonical URL: `https://efeoncepro.com/servicios/redes-sociales/`.
- Deep-link behavior: `/servicios/redes-sociales#auditoria` lleva directo al form.
- Back button behavior: vuelve al referrer; el agendamiento abre en pestaña nueva (no rompe el back de la landing).
- Reload behavior: página estática re-renderiza; el form re-monta limpio.
- Shareability: URL pública compartible; el `#auditoria` es compartible.

## Focus & Accessibility

- Initial focus: natural (top de página); al hacer click en "Pide una auditoría", foco al primer campo del form.
- Escape behavior: N/A (no-modal; el form es sección inline).
- Click-away behavior: N/A (no-modal).
- Focus restore: al volver de HubSpot Meetings (pestaña nueva), el foco de la landing se preserva.
- Modal vs non-modal semantics: non-modal (form inline, no dialog).
- Screen reader announcement: Success/Error Card con `role="status"`/`role="alert"` (owned por el renderer).
- Keyboard traversal: top→bottom; CTAs, `<summary>` y campos alcanzables en orden lógico.
- Reduced motion: el scroll ancla es instantáneo y el muro social vivo queda estático bajo `prefers-reduced-motion`.

## Data & Command Boundaries

- Readers: ninguno nuevo (la landing es contenido estático).
- Commands: ninguno nuevo — el submit reusa el command gobernado de Growth Forms.
- API routes: `<greenhouse-form>` render + submit del pipeline existente (Growth Forms); HubSpot Meetings externo.
- Optimistic updates: N/A (el renderer maneja el estado del submit).
- Cache / invalidation: N/A (contenido estático; CDN de Kinsta).
- Audit / signals: el submit deja su rastro en el pipeline de Growth Forms (outbox `growth.forms.submission_accepted`); no se agregan signals nuevos.
- Tenant / access boundary: pública; sin tenant. La entrega CRM (HubSpot) queda `disabled` hasta cutover (misma postura que `efeonce-seo-diagnostic`).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | N/A (pública) | — | — |
| not found / empty | N/A (contenido curado) | — | — |
| partial / degraded | Form no carga (JS off/CORS) → fallback link a contacto/mailto con UTM | Escribir por mail/WhatsApp | El CTA nunca muere |
| stale data | N/A (estático) | — | — |
| timeout / API error | Error Card del renderer | Reintentar submit | Owned por TASK-1320 |
| dirty exit | Sin bloqueo (form corto, bajo compromiso) | — | No confirmación intrusiva |

## GVC Scenario Plan

- Scenario: `public-servicios-redes-sociales`
- Scenario file: `scripts/frontend/scenarios/public-servicios-redes-sociales.capture.txt` `[verificar/crear]`
- Route: URL pública del preview (WordPress staging).
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; scroll por regiones; click "Pide una auditoría" → verificar scroll+focus al form; abrir 1 FAQ; verificar el CTA de reunión.
- Required captures: full-page desktop+mobile; form de auditoría montado y enfocado; FAQ abierto; fallback link (si aplica); reduced-motion.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `incluye`, `muro-social`, `prueba`, `medimos`, `puente`, `faq`, `cta-final`, `auditoria`.
- Assertions: sin scroll horizontal (1440 y 390); el ancla `#auditoria` enfoca el primer campo; CTA de reunión con `href` a HubSpot Meetings + UTM; el sticky CTA se oculta dentro del form.
- Scroll-width checks: `scrollWidth <= clientWidth` ambos viewports.
- Accessibility/focus checks: focus ring en CTAs, `<summary>` y campos; anuncio de Success/Error Card.
- Reduced-motion evidence: scroll ancla instantáneo; muro social estático.

## Design Decision Log

- Decision: oferta de dos escalones (reunión de alta intención + auditoría de bajo compromiso), form inline no-modal, agendamiento externo en pestaña nueva. Ver PDR-005.
- Alternatives considered: un solo CTA "Agenda una reunión" (pierde al que aún no quiere reunión); auditoría como modal (fricción innecesaria en superficie pública); lead magnet self-serve nuevo (producto aparte) — descartados en PDR-005.
- Why this pattern: reusa la journey gobernada Growth Forms → HubSpot (Full API Parity por reuso) sin inventar un flujo multi-surface bespoke; el escalón de auditoría baja la barrera del "otra agencia de redes".
- Reuse / extend / new primitive: reuse (Growth Forms + HubSpot Meetings). Sin flujo master de programa nuevo — es la journey estándar landing→form→CRM.
- Open risks: CORS del `<greenhouse-form>` para el origin `/servicios/*` (verificar en Discovery); HubSpot delivery del form nuevo queda `disabled` hasta cutover; el escalón "auditoría" implica capacidad operativa real de entregarla (coordinación con el equipo).
- Follow-up: cutover de HubSpot delivery para `efeonce-social-audit`; definir el entregable operativo de la auditoría.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified (form inline no-modal; focus al primer campo).
- [ ] Route/deep-link/back-button behavior is explicit (`#auditoria`; reunión en pestaña nueva).
- [ ] Data readers/commands are named and UI-only business logic is avoided (reuso del command gobernado de Growth Forms).
- [ ] Failure paths are user-safe and do not expose internals (fallback link; Error Card del renderer).
- [ ] GVC sequence captures prove the flow, not only static screens (scroll+focus al form, muro en movimiento).
- [ ] Design decision log explains why the flow uses these surfaces/routes.
