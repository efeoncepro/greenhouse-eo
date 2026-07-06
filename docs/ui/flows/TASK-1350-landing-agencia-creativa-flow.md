# TASK-1350 — Landing "Agencia Creativa" (conversión + recorrido) Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1350 — Landing pública "Agencia Creativa" (Efeonce · Design Engineer)`
- Related wireframe: [docs/ui/wireframes/TASK-1350-landing-agencia-creativa.md](../wireframes/TASK-1350-landing-agencia-creativa.md)
- Intended route / surface: página pública `efeoncepro.com/<slug>` (WordPress code-custom) `[slug pendiente]`
- Flow type: `multi-surface` (landing pública → HubSpot Meetings → confirmación; + ancla interna al bloque diferenciador)
- Primary primitives: bloques de theme custom + embed HubSpot Meetings (no primitives del portal)
- Copy source: contenido WP es-CL (validado `greenhouse-ux-writing`)

> **Programa (EPIC-019):** esta landing es un **nodo** del programa de landings públicas. El patrón de conversión (CTA → UTM → destino de contacto/booking) es el mismo continuo de demand-capture que estableció TASK-1345 (`/contacto/` + UTM → Growth Form/HubSpot/Meetings/WhatsApp). Este flow adopta ese contrato con **HubSpot Meetings como destino primario** y `/contacto/`+WhatsApp/mailto como fallback. Si emerge un master UI flow del EPIC-019, referenciarlo aquí y declarar este nodo.

## Flow Brief

- Primary user: decisor de marketing (CMO/Director) + sponsor (CEO/Gerente) — visitante público no autenticado.
- Entry moment: llega por orgánico/AEO/pauta/referido a la landing.
- Successful outcome: **agenda una reunión** (slot confirmado en HubSpot Meetings) con atribución UTM; o, secundario, "compra" el diferenciador de transparencia (llega y entiende el bloque 6).
- Primary decision/action: click en "Agenda una reunión".
- Non-goals: no self-serve del producto, no login al portal, no compra/checkout, no exponer datos de cliente.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Landing (base) | Entry + contexto + narrativa de conversión | página larga multi-sección con scroll; CTA sticky en header | igual; CTA visible/sticky; media más liviano | theme custom + Vite islands |
| Booking (HubSpot Meetings) | Agendar la reunión | modal/overlay (o sección dedicada) con el embed de Meetings | pantalla completa / sección; scroll propio | embed HubSpot Meetings |
| Ancla bloque 6 | Ver "cómo medimos" (CTA secundario) | scroll suave al bloque diferenciador | igual | ancla interna (`#`) |
| Fallback contacto | Recuperación si el booking falla | link a `/contacto/` + WhatsApp + mailto | igual | links del theme |

## Flow Map

1. Entry: el usuario aterriza en la landing con UTM en la URL (preservar a lo largo del flujo).
2. Primary action: click en "Agenda una reunión" (hero / header sticky / CTA final).
3. Transition: abre el booking de HubSpot Meetings (modal/embed) con UTM/`hutk` propagado.
4. User decision: elige slot y confirma en Meetings (o cierra y sigue leyendo).
5. Completion: HubSpot confirma el agendamiento (pantalla de confirmación de Meetings); GA4 registra el evento de conversión.
6. Recovery / exit: si el embed no carga o falla → fallback visible a `/contacto/` + WhatsApp/mailto; si el usuario cierra el modal → vuelve a la landing con foco restaurado. Secundario: "Mira cómo medimos" → scroll al bloque 6.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click "Agenda una reunión" | hero / header sticky / CTA final | Booking abierto (modal/embed Meetings) | Enter/Space en el CTA enfocado | preserva UTM |
| Click "Mira cómo medimos" | hero secundario | scroll suave a bloque 6 | Enter/Space | respeta reduced-motion (sin scroll animado si reduce) |
| Escape / click fuera | modal Meetings | Booking cerrado → landing | Escape | restaura foco al CTA disparador |
| Expandir/colapsar FAQ | acordeón (bloque 11) | item abierto/cerrado | Enter/Space; flechas | `aria-expanded` |
| Fallback contacto | estado error del booking | `/contacto/` / WhatsApp / mailto | Enter | nunca CTA muerto |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | booking no abierto (default de la landing) | carga inicial / cerrar modal | click en cualquier CTA "Agenda una reunión" | CTA visible/sticky; foco normal |
| opening | modal montando el embed de Meetings | click CTA | embed listo / error | motion de entrada (reduced-motion → sin animación); estado pending del CTA |
| open | embed de Meetings interactivo | embed listo | Escape/click-away/confirmación | foco dentro del modal; scroll lock del body; `aria-modal` |
| loading | esperando el embed de HubSpot | opening | listo / timeout | skeleton/spinner; no doble-submit |
| error | el embed no cargó | timeout / fallo de red | click fallback / cerrar | mensaje es-CL + `/contacto/`+WhatsApp/mailto |
| dirty | N/A (no hay form propio con estado editable; el form vive en HubSpot) | — | — | — |
| complete | reunión agendada | confirmación de Meetings | cerrar / seguir navegando | confirmación (de HubSpot) + GA4 event |

## Routing Contract

- Route changes: `none` (booking como modal sobre la misma URL) o `hash` para el ancla del bloque 6. `[decisión: modal preferido; sección dedicada es alternativa]`.
- Canonical URL: la de la página pública (canonical/Yoast); el booking no cambia la canonical.
- Deep-link behavior: `#como-medimos` (o el id real) hace scroll al bloque 6; un query param puede abrir el booking directo `[opcional]`.
- Back button behavior: si el booking es modal, back cierra el modal (o vuelve a la referrer si no hay historia intermedia); no debe romper el scroll.
- Reload behavior: recarga la landing en estado `closed`; UTM se re-lee de la URL.
- Shareability: la URL de la landing es compartible (con o sin UTM); el estado de booking no se comparte.

## Focus & Accessibility

- Initial focus: al abrir el booking, foco entra al primer control del embed (o al contenedor con `aria-label`).
- Escape behavior: Escape cierra el modal.
- Click-away behavior: click fuera del modal lo cierra (excepto sobre el embed).
- Focus restore: al cerrar, foco vuelve al CTA que abrió el booking.
- Modal vs non-modal semantics: modal (`role="dialog"` + `aria-modal="true"` + scroll lock) si se usa overlay; si es sección dedicada, foco al heading de la sección.
- Screen reader announcement: al abrir, anunciar "Agenda una reunión"; el embed de HubSpot aporta su propia semántica.
- Keyboard traversal: todo el flujo operable por teclado (CTA → modal → controles → cerrar).
- Reduced motion: `prefers-reduced-motion` → sin animación de apertura ni scroll suave; transición instantánea.

## Data & Command Boundaries

- Readers: ninguno de Greenhouse (contenido estático curado; métricas del bloque 6 ilustrativas).
- Commands: ninguno de Greenhouse. Agendar = HubSpot Meetings (contrato propio de HubSpot).
- API routes: N/A en Greenhouse; el embed llama a HubSpot directamente.
- Optimistic updates: N/A.
- Cache / invalidation: página cacheada por Kinsta; purgar al publicar/editar.
- Audit / signals: conversión = GA4 events (CTA click, booking open, booking complete) + atribución HubSpot vía `hutk`/UTM.
- Tenant / access boundary: público, sin tenant/auth; no toca aislamiento multi-tenant del portal.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | N/A (público) | — | — |
| not found / empty | N/A (contenido curado) | — | el bloque de métricas nunca muestra vacío; usa cifras curadas |
| partial / degraded | video de frontera no carga → still art-dirigido | ninguna acción del usuario; layout intacto | degradación silenciosa, contraste preservado |
| stale data | cifras del bloque 6 desactualizadas | revisión editorial | son ilustrativas; disclaimer explícito |
| timeout / API error | embed de Meetings no carga | mensaje es-CL + `/contacto/` + WhatsApp + mailto | nunca CTA muerto |
| dirty exit | N/A (sin form propio con estado) | — | el form vive en HubSpot |

## GVC Scenario Plan

- Scenario: recorrido de conversión de la landing pública (no aplica GVC del portal).
- Scenario file: **N/A** — Playwright live sobre la página publicada (patrón TASK-1343/1345).
- Route: URL pública `[una vez publicada]`.
- Viewports: 1440, 1280, 390.
- Required steps: cargar con UTM → scroll completo → click "Agenda una reunión" (abrir booking) → Escape (cerrar, verificar foco restaurado) → click "Mira cómo medimos" (scroll a bloque 6) → forzar `prefers-reduced-motion`.
- Required captures: landing (hero), booking abierto, foco restaurado tras cerrar, bloque 6, mobile 390 full-scroll, still con reduced-motion, estado error del booking (fallback).
- Required `data-capture` markers: N/A (portal); usar selectores de sección.
- Assertions: `errors=[]`, sin overflow horizontal (desktop + 390), foco restaurado al CTA tras cerrar el modal, fallback `/contacto/` presente si el embed falla, UTM preservado hacia el booking, reduced-motion respetado.
- Scroll-width checks: sí (desktop + 390).
- Accessibility/focus checks: foco visible, `aria-modal`, escape, restauración de foco, teclado.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: conversión primaria vía **HubSpot Meetings** (booking directo, coherente con "Agenda una reunión") con fallback a `/contacto/`+WhatsApp/mailto; CTA secundario "Mira cómo medimos" que apalanca la transparencia como argumento de venta.
- Alternatives considered: (a) form de contacto como primario (más fricción, menos "reunión"); (b) llevar a `/contacto/` genérico (rompe el momentum del CTA) — el booking directo reduce fricción y encaja con el copy.
- Why this pattern: minimiza fricción para un motion sales-led; el booking directo convierte la intención en un slot; el fallback garantiza que nunca haya CTA muerto.
- Reuse / extend / new primitive: reusa el contrato de conversión del sitio público (HubSpot Meetings/Forms, UTM) establecido en EPIC-019; nuevo one-off de theme para la landing.
- Open risks: disponibilidad/latencia del embed de Meetings; preservación de UTM a través del modal; back-button con modal.
- Follow-up: confirmar el embed/URL de Meetings vigente `[verificar]`; definir modal vs sección; contrato de Motion para la transición de apertura.

## Acceptance Checklist

- [x] The owning task declares this file in `Flow`.
- [x] Every surface has desktop and compact behavior.
- [x] Opening, closing, escape and focus restore are specified.
- [x] Route/deep-link/back-button behavior is explicit.
- [x] Data readers/commands are named and UI-only business logic is avoided (conversión = HubSpot, sin lógica de negocio en el componente).
- [x] Failure paths are user-safe and do not expose internals (fallback `/contacto/`; sin datos del portal).
- [x] GVC sequence captures prove the flow (Playwright live; se declara por qué GVC del portal no aplica).
- [x] Design decision log explains why the flow uses these surfaces/routes.
