# TASK-1352 — Landing "HubSpot" — entrega a reunión + diagnóstico de portal (Flow Contract)

## Meta

- Status: `draft`
- Owner task: `TASK-1352 — Reposicionar la landing HubSpot (/servicios-contratar-hubspot/) al mundo Agentic Customer Platform`
- Related wireframe: [docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md](../wireframes/TASK-1352-landing-hubspot-agentic-platform.md)
- Intended route / surface: `efeoncepro.com/servicios-contratar-hubspot/`
- Flow type: `multi-surface` (landing pública → diagnóstico embebido vía `<greenhouse-form>` → HubSpot pipeline; y landing → HubSpot Meetings)
- Primary primitives: patrones marketing `modern-ui` + `<greenhouse-form>` embebido + link a HubSpot Meetings.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing`); es-LATAM neutro.

## Flow Brief

- Primary user: líder comercial / RevOps / marketing (LATAM/hispano) evaluando partner de HubSpot.
- Entry moment: llega por co-sell del PDM, HubSpot Solutions Directory, directo/marca o cross-sell (desde AEO/SEO/otras spokes) — NO por búsqueda bottom-funnel (que no existe para partner HubSpot en el bloque hispano). Solution/product-aware.
- Successful outcome: (a) agenda una reunión (alta intención) **o** (b) deja sus datos para un diagnóstico de portal (bajo compromiso) — dos escalones de intención.
- Primary decision/action: click "Agenda una reunión" o completar el `<greenhouse-form>` de diagnóstico.
- Non-goals: no es self-serve del portal; no expone datos de cliente; no reconstruye el motor de forms ni el agendador; no afirma un tier.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Base page `/servicios-contratar-hubspot/` | Entrada + contexto + oferta dual | Página larga, scroll natural, CTA sticky opcional post-hero | Stack 1-col; sticky CTA se oculta dentro/antes del form para no tapar campos | `modern-ui` marketing |
| `#diagnostico` (form embebido) | Captura de lead de bajo compromiso | `<greenhouse-form>` renderizado inline al final | Idéntico, campos apilados | `<greenhouse-form>` (Growth Forms) |
| HubSpot Meetings (externo) | Agendamiento de alta intención | Nueva pestaña con UTM de la landing | Igual | Link externo gobernado |
| HubSpot Marketplace (externo, listing Kortex) | Proof point verificable | Enlace en pestaña nueva desde la región Prueba | Igual | Link externo |

## Flow Map

1. Entry: usuario aterriza en `/servicios-contratar-hubspot/` (co-sell/directorio/directo/cross-sell).
2. Primary action: evalúa (hero teach-first → stack agéntico → diferenciación → prueba Marketplace) y elige un escalón: reunión o diagnóstico.
3. Transition: "Agenda una reunión" abre HubSpot Meetings (nueva pestaña, UTM); "Solicita un diagnóstico" hace scroll ancla a `#diagnostico` y enfoca el form; "Ver Kortex en el Marketplace" abre el listing (nueva pestaña).
4. User decision: completa el form de diagnóstico o agenda la reunión.
5. Completion: submit del form → Success Card del renderer (pipeline Growth Forms → HubSpot); o reunión agendada en HubSpot.
6. Recovery / exit: si el embed del form no carga (JS off/CORS — probable gap en este origin), fallback link a `mailto:`/contacto con UTM — el CTA nunca muere.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click "Agenda una reunión" | Hero + CTA final | HubSpot Meetings (nueva pestaña) | Enter/Space en el link | UTM de la landing |
| Click "Solicita un diagnóstico" | Hero + CTA final | Scroll ancla `#diagnostico` + focus al primer campo | Enter/Space | No abre modal; es sección inline |
| Click "Ver Kortex en el Marketplace" | Región Prueba | Listing del HubSpot Marketplace (nueva pestaña) | Enter/Space | Proof verificable de tercero |
| Submit del form | `#diagnostico` | Success/Error Card (renderer) | Enter en submit | Owned por el renderer (TASK-1320) |
| Abrir FAQ | Región FAQ | `<details>` expandido | Enter/Space en `<summary>` | Semántico nativo |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | Form colapsado/fuera de viewport | Carga de página | Scroll a `#diagnostico` | Form montado pero no enfocado |
| opening | Scroll ancla al form | Click "Solicita un diagnóstico" | Form en viewport | Scroll suave (o instantáneo bajo reduced-motion) |
| open | Form visible y enfocable | Form en viewport | Submit o abandono | Primer campo enfocable |
| loading | Submit en curso | Click submit | Respuesta del pipeline | Estado del renderer |
| error | Submit falló / captcha | Respuesta de error | Reintento | Error Card del renderer (texto+ícono, no solo color) |
| dirty | Campos con datos sin enviar | Usuario tipea | Submit o navegación | Sin confirmación bloqueante (form corto) |
| complete | Lead capturado | Submit ok | — | Success Card + próximos pasos |

## Routing Contract

- Route changes: `hash` (`#diagnostico` para el ancla del form; **sin cambio de ruta base** — reposición in-place preserva la URL existente).
- Canonical URL: `https://efeoncepro.com/servicios-contratar-hubspot/` (preservada; sin 301).
- Deep-link behavior: `/servicios-contratar-hubspot/#diagnostico` lleva directo al form.
- Back button behavior: vuelve al referrer; el agendamiento y el Marketplace abren en pestaña nueva (no rompen el back de la landing).
- Reload behavior: página estática re-renderiza; el form re-monta limpio.
- Shareability: URL pública compartible; el `#diagnostico` es compartible.

## Focus & Accessibility

- Initial focus: natural (top de página); al hacer click en "Solicita un diagnóstico", foco al primer campo del form.
- Escape behavior: N/A (no-modal; el form es sección inline).
- Click-away behavior: N/A (no-modal).
- Focus restore: al volver de HubSpot Meetings/Marketplace (pestaña nueva), el foco de la landing se preserva.
- Modal vs non-modal semantics: non-modal (form inline, no dialog).
- Screen reader announcement: Success/Error Card con `role="status"`/`role="alert"` (owned por el renderer).
- Keyboard traversal: top→bottom; CTAs, `<summary>` y campos alcanzables en orden lógico.
- Reduced motion: el scroll ancla es instantáneo y el "stack agéntico" queda estático bajo `prefers-reduced-motion`.

## Data & Command Boundaries

- Readers: ninguno nuevo (la landing es contenido estático).
- Commands: ninguno nuevo — el submit reusa el command gobernado de Growth Forms.
- API routes: `<greenhouse-form>` render + submit del pipeline existente (Growth Forms); HubSpot Meetings + Marketplace externos.
- Optimistic updates: N/A (el renderer maneja el estado del submit).
- Cache / invalidation: N/A (contenido estático; CDN de Kinsta; purge tras publish).
- Audit / signals: el submit deja su rastro en el pipeline de Growth Forms (outbox `growth.forms.submission_accepted`); no se agregan signals nuevos.
- Tenant / access boundary: pública; sin tenant. La entrega CRM (HubSpot) queda `disabled` hasta cutover (misma postura que `efeonce-seo-diagnostic`).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | N/A (pública) | — | — |
| not found / empty | N/A (contenido curado) | — | — |
| partial / degraded | Form no carga (JS off/CORS) → fallback link a contacto/mailto con UTM | Escribir por mail/WhatsApp | El CTA nunca muere; CORS es probable gap en este origin |
| stale data | Cifras de Breeze desactualizadas | Reverificar antes de publicar; describir categorías, no precios | No hardcodear pricing/roster |
| timeout / API error | Error Card del renderer | Reintentar submit | Owned por TASK-1320 |
| dirty exit | Sin bloqueo (form corto, bajo compromiso) | — | No confirmación intrusiva |

## GVC Scenario Plan

- Scenario: `public-servicios-contratar-hubspot`
- Scenario file: `scripts/frontend/scenarios/public-servicios-contratar-hubspot.capture.txt` `[verificar/crear]`
- Route: URL pública del preview (WordPress staging).
- Viewports: desktop 1440 + mobile 390.
- Required steps: capturar before; cargar reposicionada; scroll por regiones; click "Solicita un diagnóstico" → verificar scroll+focus al form; abrir 1 FAQ; verificar el CTA de reunión y el link al Marketplace.
- Required captures: full-page desktop+mobile; form de diagnóstico montado y enfocado; FAQ abierto; fallback link (si aplica); reduced-motion; before/after.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `capas`, `stack-agentico`, `diferenciacion`, `prueba`, `puente`, `faq`, `cta-final`, `diagnostico`.
- Assertions: sin scroll horizontal (1440 y 390); el ancla `#diagnostico` enfoca el primer campo; CTA de reunión con `href` a HubSpot Meetings + UTM; link del Marketplace con `href` al listing; el sticky CTA se oculta dentro del form; canonical preservado.
- Scroll-width checks: `scrollWidth <= clientWidth` ambos viewports.
- Accessibility/focus checks: focus ring en CTAs, `<summary>` y campos; anuncio de Success/Error Card.
- Reduced-motion evidence: scroll ancla instantáneo; "stack agéntico" estático.

## Design Decision Log

- Decision: oferta de dos escalones (reunión de alta intención + diagnóstico de portal de bajo compromiso), form inline no-modal, agendamiento y Marketplace externos en pestaña nueva, reposición in-place que preserva la URL. Ver PDR-006.
- Alternatives considered: un solo CTA "Agenda una reunión" (pierde al que aún no quiere reunión); diagnóstico como modal (fricción innecesaria en superficie pública); spoke nueva con 301 (fragmenta equity, sin upside de demanda); lead magnet self-serve nuevo tipo "grader de HubSpot" (producto aparte) — descartados en PDR-006.
- Why this pattern: reusa la journey gobernada Growth Forms → HubSpot (Full API Parity por reuso) sin inventar un flujo multi-surface bespoke; el escalón "diagnóstico de portal" mapea a la capability Portal Audit de Kortex y baja la barrera del "cambiar de CRM da miedo" (JOLT).
- Reuse / extend / new primitive: reuse (Growth Forms + HubSpot Meetings). Sin flujo master de programa nuevo — es la journey estándar landing→form→CRM; el link al Marketplace es un enlace externo de proof.
- Open risks: CORS del `<greenhouse-form>` para el origin `/servicios-contratar-hubspot/*` (probable gap vs `/servicios/*`, verificar en Discovery); HubSpot delivery del form nuevo queda `disabled` hasta cutover; el escalón "diagnóstico" implica capacidad operativa real de entregarlo (coordinación con el equipo / Kortex Portal Audit); URL del listing del Marketplace por confirmar.
- Follow-up: cutover de HubSpot delivery para `efeonce-hubspot-portal-audit`; definir el entregable operativo del diagnóstico.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified (form inline no-modal; focus al primer campo).
- [ ] Route/deep-link/back-button behavior is explicit (`#diagnostico`; reunión y Marketplace en pestaña nueva; canonical preservado).
- [ ] Data readers/commands are named and UI-only business logic is avoided (reuso del command gobernado de Growth Forms).
- [ ] Failure paths are user-safe and do not expose internals (fallback link; Error Card del renderer).
- [ ] GVC sequence captures prove the flow, not only static screens (scroll+focus al form, "stack agéntico" en movimiento, before/after).
- [ ] Design decision log explains why the flow uses these surfaces/routes.
