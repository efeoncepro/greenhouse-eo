# TASK-1358 — Landing "Agencia" (`/agencia`) Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1358`
- Related wireframe: [TASK-1358-landing-agencia.md](../wireframes/TASK-1358-landing-agencia.md)
- Intended route / surface: `https://efeoncepro.com/agencia/`
- Flow type: `multi-surface` (landing + task surface nativa dialog/full-screen; Agencia aún no promovida)
- Primary primitives: rail HTML gobernado Ohio/Elementor + Growth CTA `open_meeting_scheduler`
- Copy source: WordPress es-LATAM, validado `greenhouse-ux-writing`

> **Programa (EPIC-019):** esta landing es un **nodo** del programa de landings públicas. Adopta el contrato
> `open_meeting_scheduler` de Growth CTA + Growth Meetings; HubSpot permanece provider server-side. Agencia aún no
> está promovida y no hereda el binding del piloto `/agenda/`.

## Flow Brief

- Primary user: decisor de marketing mid-market/enterprise (BP1 CMO / BP2 Dir. Marketing·Head of Growth / BP3 CEO) llegando de SERP/IA por la categoría "agencia de marketing digital".
- Entry moment: click orgánico/pagado o cita de motor IA → aterriza en `/agencia/` frío.
- Successful outcome: agenda una reunión (lead gobernado en HubSpot con atribución) **o** avanza a un CTA de bajo compromiso (ver ecosistema / grader).
- Primary decision/action: "Agenda una reunión" (`open_meeting_scheduler`).
- Non-goals: no login, no self-serve, no exponer portal; no reemplaza spokes; no about-us.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
| --- | --- | --- | --- | --- |
| Landing `/agencia/` | Base | Página completa scrolleable; hero + secciones firma | Stack vertical; sticky CTA `.mcta` que se oculta dentro de `#agenda` | Ohio/Elementor doc + rail `.gh-agencia-*` |
| Launcher de agenda | Abrir booking nativo | Dialog gobernado | Full-screen gobernado | Growth CTA `open_meeting_scheduler` |
| CTA secundario | Bajo compromiso | "Mira cómo operamos" (video/tour) o link al grader | idem | anchor / link |
| Canales de contacto | Alternativa editorial independiente | Links fuera del estado de recuperación | idem | `/contacto/` / `mailto:` / WhatsApp |

## Flow Map

1. **Entry** — usuario aterriza en `/agencia/` (canonical apex) con UTM del origen; hero comunica reframe growth-partner en la 1ª fold.
2. **Primary action** — click "Agenda una reunión" (hero, CTAs intermedios o sticky mobile) → Growth CTA inicia `open_meeting_scheduler`.
3. **Transition** — el host abre dialog desktop o full-screen móvil y monta una sola instancia conectada del scheduler.
4. **User decision** — elige fecha, horario y completa datos dentro del scheduler, o cierra y sigue leyendo.
5. **Completion** — sólo un receipt server-confirmed reemplaza todo el shell por la confirmación nativa.
6. **Recovery / exit** — vacío/error se resuelven mediante grilla mensual, navegación y **Reintentar**. No aparece
   iframe/link HubSpot; cerrar restaura foco. Los canales de contacto no forman parte del recovery del scheduler.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
| --- | --- | --- | --- | --- |
| Click "Agenda una reunión" | Hero / CTAs intermedios / sticky mobile | task surface scheduler | Enter/Space sobre el launcher | dialog desktop; full-screen móvil |
| Escape/cerrar | scheduler abierto | landing | Escape/botón cerrar cuando es seguro | restaura foco al invocador |
| Click "Mira cómo operamos" | Hero secundario | abrir video/tour (o scroll a region 6) | Enter/Space | bajo compromiso |
| Confirmar reserva | scheduler details | `booking_started` → confirmed/recovery | Enter en botón | Turnstile + command idempotente; cero retry ambiguo |
| Abrir FAQ | `<summary>` | expandir respuesta | Enter/Space | `<details name>` exclusivo |
| Click logo/caso | Trust/cases | (sin navegación destructiva) | Tab + Enter | evita links que saquen del funnel salvo spokes |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
| --- | --- | --- | --- | --- |
| `closed` | Scheduler no abierto | carga inicial / cerrar | click launcher | CTA visible; sin efectos provider |
| `opening` | Task surface montándose | click launcher | config lista / error | shell estructural; reduced-motion equivalente |
| `open` | Calendario/agenda/datos operables | config + availability | booking / cerrar | foco contenido; timezone visitante visible |
| `loading` | Config, availability o booking pendiente | efecto/confirmación | respuesta | controles coherentes y sin doble submit |
| `error` | Fallo recuperable pre-write | respuesta sanitizada | **Reintentar** / navegar mes | recovery native-only, sin provider link |
| `ambiguous` | Provider pudo crear booking | timeout post-dispatch | reconciliación humana | bloquea retry y otra vía de reserva |
| `complete` | Reunión confirmada | receipt fresco | cerrar | éxito reemplaza todo el shell; foco/ARIA correctos |

## Routing Contract

- Route changes: ninguna por abrir el scheduler; `#faq` puede seguir como ancla editorial.
- Canonical URL: `https://efeoncepro.com/agencia/` (apex, mismo dominio).
- Deep-link behavior: no abre booking automáticamente sin una activación explícita del host.
- Back button behavior: no crea una ruta provider; cerrar devuelve a la landing y restaura foco.
- Reload behavior: vuelve al launcher cerrado; no repite ningún command de booking.
- Shareability: URL limpia compartible; UTM del origen preservado en la sesión para atribución.

## Focus & Accessibility

- Initial focus: none forzado al cargar (evita robar scroll); primer tab = skip-link/nav.
- Escape behavior: cierra el dialog sólo cuando no hay booking pendiente/ambiguo; FAQ conserva su teclado nativo.
- Click-away behavior: sigue la misma regla de salida segura; nunca descarta silenciosamente un command.
- Focus restore: al cerrar vuelve al launcher; al confirmar pasa al título del shell de éxito.
- Modal vs non-modal semantics: dialog desktop, full-screen móvil; un futuro host inline/page conserva el mismo controller.
- Screen reader announcement: pasos, errores y éxito mediante headings + live regions del scheduler.
- Keyboard traversal: trap modal, calendario semántico y targets de al menos 44 px.
- Reduced motion: transición directa/crossfade restringido, con foco y live regions equivalentes.

## Data & Command Boundaries

- Readers: meetings config + availability provider-neutral para la surface autorizada.
- Commands: verify-email y booking idempotente de Growth Meetings; WordPress no llama HubSpot directamente.
- API routes: `/api/public/growth/meetings/**`, gobernadas por surface/origin binding.
- Optimistic updates: ninguno; sólo el receipt server-confirmed habilita éxito/conversión.
- Cache / invalidation: página estática cacheada en Kinsta; purgar tras cada `Document::save()`.
- Audit / signals: `gh_meeting_step_reached` + receipt-gated `gh_meeting_booking_confirmed`; sin PII, slot exacto ni provider IDs.
- Tenant / access boundary: público, sin tenant; surface/binding exactos autorizan el host.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
| --- | --- | --- | --- |
| `denied` | N/A (público) | — | sin auth |
| `not found / empty` | Mes sin slots conserva grilla completa | navegar mes / reintentar | nunca panel blanco |
| `partial / degraded` | Si un asset (logo/video/imagen) falla, la sección colapsa a texto/fondo sólido | reintento de carga | nunca romper layout; sin white-on-white |
| `stale data` | Cifras del proof-engine son ilustrativas → no envejecen como live | — | declaradas ilustrativas |
| `timeout / API error` | Scheduler muestra error sanitizado | **Reintentar** si es pre-write | sin iframe/link provider |
| `ambiguous` | Reserva posiblemente creada | detener retry y reconciliar | no ofrecer otro booking/canal como recovery |
| `dirty exit` | Usuario cierra antes del command | restaura foco; instancia conserva draft al reabrir | no bloquear salida segura |

## GVC Scenario Plan

- Scenario: conversión de la landing `/agencia`.
- Scenario file: **N/A** — GVC del portal no aplica a WP público; **Playwright live** sobre preview/publicada.
- Route: `/agencia/` (staging/preview antes de indexar).
- Viewports: `1440`, `1280`, `390`.
- Required steps: cargar → click "Agenda una reunión" → verificar dialog/full-screen, calendario, mes vacío, retry,
  cerrar/reabrir y focus restore sin crear booking → abrir 1 FAQ.
- Required captures: hero fold; sección firma; launcher + scheduler abierto; mes vacío; mobile 390 full-page/full-screen.
- Required data-capture markers: los 12 del wireframe.
- Assertions: action `open_meeting_scheduler`, bundle vigente, cero links HubSpot en la superficie nativa,
  `scrollWidth == clientWidth`, selección persistente al reabrir y ningún booking en smoke visual.
- Scroll-width checks: `scrollWidth == clientWidth` en 1440/1280/390.
- Accessibility/focus checks: foco entra/sale correctamente del dialog, teclado de calendario, live regions y FAQ.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: conversión = Growth CTA `open_meeting_scheduler` + scheduler native-only; Agencia permanece OFF hasta completar su gate.
- Alternatives considered: (a) iframe/link HubSpot — rechazado para la experiencia nativa; (b) Growth Form de solicitud
  — no confirma un slot; (c) sólo `mailto` o `/contacto/` — rompe el momentum y pierde la reserva directa.
- Why this pattern: reusa el scheduler portable, su booking idempotente, validación, consentimiento y medición receipt-gated.
- Reuse / extend / new primitive: `reuse` (Growth CTA + Growth Meetings + rail Ohio); ninguna implementación paralela.
- Open risks: activar Agencia antes de su binding, booking/replay y `/g/collect` aprobados.
- Follow-up: completar el gate de rollout propio de Agencia; no inferir promoción desde `/agenda/`.

## Acceptance Checklist

- [ ] La task declara este archivo en `Flow`.
- [ ] Toda superficie tiene comportamiento desktop + compacto.
- [ ] Open/close/escape/focus-restore del bloque de conversión están especificados.
- [ ] Routing (hash `#agenda`/`#faq`), deep-link y back button son explícitos.
- [ ] Readers/commands de Growth Meetings nombrados y sin lógica de negocio duplicada en WordPress.
- [ ] Failure paths son native-only, user-safe y nunca ofrecen iframe/link provider.
- [ ] El GVC/Playwright plan prueba launcher→scheduler→recovery/reopen sin crear un booking.
- [ ] El decision log explica superficies/rutas y el gate pendiente de promoción de Agencia.
