# TASK-1358 — Landing "Agencia" (`/agencia`) Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1358`
- Related wireframe: [TASK-1358-landing-agencia.md](../wireframes/TASK-1358-landing-agencia.md)
- Intended route / surface: `https://efeoncepro.com/agencia/`
- Flow type: `single-surface` (landing con ancla de conversión in-page + fallback cross-route a `/contacto/`)
- Primary primitives: rail HTML gobernado Ohio/Elementor + `<greenhouse-form>` (conversión)
- Copy source: WordPress es-LATAM, validado `greenhouse-ux-writing`

> **Programa (EPIC-019):** esta landing es un **nodo** del programa de landings públicas (public website landing control plane). Adopta el contrato compartido de demand-capture — **CTA → UTM/atribución → reunión/contacto gobernado** — establecido por TASK-1345 (desarrollo-web) y TASK-1343 (SEO). No inventa engine de forms ni de atribución propios; consume Greenhouse Growth Forms + HubSpot portal 48713323.

## Flow Brief

- Primary user: decisor de marketing mid-market/enterprise (BP1 CMO / BP2 Dir. Marketing·Head of Growth / BP3 CEO) llegando de SERP/IA por la categoría "agencia de marketing digital".
- Entry moment: click orgánico/pagado o cita de motor IA → aterriza en `/agencia/` frío.
- Successful outcome: agenda una reunión (lead gobernado en HubSpot con atribución) **o** avanza a un CTA de bajo compromiso (ver ecosistema / grader).
- Primary decision/action: "Agenda una reunión" (`#agenda`).
- Non-goals: no login, no self-serve, no exponer portal; no reemplaza spokes; no about-us.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
| --- | --- | --- | --- | --- |
| Landing `/agencia/` | Base | Página completa scrolleable; hero + secciones firma | Stack vertical; sticky CTA `.mcta` que se oculta dentro de `#agenda` | Ohio/Elementor doc + rail `.gh-agencia-*` |
| Bloque conversión `#agenda` | Captura de lead | Split editorial (copy izq / form der) | Form full-width, copy arriba | `<greenhouse-form>` |
| CTA secundario | Bajo compromiso | "Mira cómo operamos" (video/tour) o link al grader | idem | anchor / link |
| Fallback `/contacto/` + `mailto`/WhatsApp | Recuperación | Solo si el form falla o como no-script | idem | cross-route / `mailto:` |

## Flow Map

1. **Entry** — usuario aterriza en `/agencia/` (canonical apex) con UTM del origen; hero comunica reframe growth-partner en la 1ª fold.
2. **Primary action** — click "Agenda una reunión" (hero, o CTAs intermedios, o sticky mobile) → scroll suave a `#agenda`.
3. **Transition** — al entrar `#agenda` al viewport, el chrome de la sección se revela (staggered `is-in-view`) y el `<greenhouse-form>` monta (`data-form-ready="true"`).
4. **User decision** — completa el form (solicitud de reunión) **o** elige CTA secundario (ver ecosistema / grader) **o** abandona.
5. **Completion** — submit válido (Turnstile + consent) → success inline (`success_card`); lead entra a Greenhouse → dispatcher → HubSpot (async; delivery `disabled` hasta cutover del dispatcher).
6. **Recovery / exit** — si el form falla o el usuario prefiere otro canal → fallback `mailto:hola@efeoncepro.com` / `/contacto/` / WhatsApp; nunca un CTA muerto.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
| --- | --- | --- | --- | --- |
| Click "Agenda una reunión" | Hero / CTAs intermedios / sticky mobile | scroll a `#agenda` | Enter/Space sobre el anchor | scroll suave; respeta reduced-motion (salto instantáneo) |
| Entrar `#agenda` al viewport | IntersectionObserver | montar form + reveal chrome | — | WP owns chrome; Greenhouse owns fields |
| Click "Mira cómo operamos" | Hero secundario | abrir video/tour (o scroll a region 6) | Enter/Space | bajo compromiso |
| Submit form | `<greenhouse-form>` | `loading` → `complete`/`error` | Enter en último campo / botón | Turnstile invisible; fail-closed sin token |
| Abrir FAQ | `<summary>` | expandir respuesta | Enter/Space | `<details name>` exclusivo |
| Click logo/caso | Trust/cases | (sin navegación destructiva) | Tab + Enter | evita links que saquen del funnel salvo spokes |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
| --- | --- | --- | --- | --- |
| `closed` | Form aún no en viewport | carga inicial | scroll a `#agenda` | chrome no revelado; sin lead |
| `opening` | Sección revelándose | IntersectionObserver | reveal completo | stagger; reduced-motion = aparecer sin animar |
| `open` | Form montado y editable | `data-form-ready="true"` | submit / abandono | campos válidos, foco operable |
| `loading` | Enviando solicitud | click submit | respuesta API | botón disabled + feedback de latencia |
| `error` | Falló envío/captcha | respuesta 4xx/5xx | reintento / fallback | mensaje + `mailto`/`/contacto/`; sin lead creado |
| `dirty` | Campos con datos sin enviar | primer input | submit / navegación | no perder datos en scroll; sin trap |
| `complete` | Reunión solicitada | 200 OK | — | `success_card` inline; atribución preservada |

## Routing Contract

- Route changes: `hash` (`#agenda`, `#faq`) — sin cambio de path.
- Canonical URL: `https://efeoncepro.com/agencia/` (apex, mismo dominio).
- Deep-link behavior: `/agencia/#agenda` scrollea directo al bloque de conversión.
- Back button behavior: vuelve al origen (SERP/IA); el hash no crea historia atrapante.
- Reload behavior: idempotente; el form se re-monta; sin estado servidor perdido.
- Shareability: URL limpia compartible; UTM del origen preservado en la sesión para atribución.

## Focus & Accessibility

- Initial focus: none forzado al cargar (evita robar scroll); primer tab = skip-link/nav.
- Escape behavior: N/A (no modal); FAQ colapsa con Enter/Space, no Escape.
- Click-away behavior: N/A (sin overlay modal).
- Focus restore: tras submit, foco al `success_card` (anuncio de éxito).
- Modal vs non-modal semantics: **non-modal** (form inline, no dialog).
- Screen reader announcement: éxito/error del form vía `role="status"`/`aria-live`; secciones con landmarks (`<section aria-labelledby>`).
- Keyboard traversal: DOM order = orden visual; CTAs y campos alcanzables por Tab; dropdowns del form con `aria-expanded`.
- Reduced motion: scroll suave → salto instantáneo; reveals/marquee detenidos; contenido completo y legible.

## Data & Command Boundaries

- Readers: **none** (landing estática; sin readers del portal).
- Commands: **none** del portal; la única escritura es el submit del Growth Form (gobernado server-side por Greenhouse, no por WordPress).
- API routes: `GET /api/public/growth/forms/{slug}` (render contract) + `POST /api/public/growth/forms/{slug}/submit` (+ `verify-email` si aplica). ACAO solo a `efeoncepro.com`.
- Optimistic updates: ninguno (submit confirma server-side; no se muestra éxito hasta 200 OK).
- Cache / invalidation: página estática cacheada en Kinsta; purgar tras cada `Document::save()`.
- Audit / signals: atribución vía HubSpot portal 48713323 + `hutk`/UTM + GA4; el lead lo audita Greenhouse dispatcher (no WordPress).
- Tenant / access boundary: público, sin tenant; el form no expone data de cliente ni del portal.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
| --- | --- | --- | --- |
| `denied` | N/A (público) | — | sin auth |
| `not found / empty` | N/A (sin listas) | — | — |
| `partial / degraded` | Si un asset (logo/video/imagen) falla, la sección colapsa a texto/fondo sólido | reintento de carga | nunca romper layout; sin white-on-white |
| `stale data` | Cifras del proof-engine son ilustrativas → no envejecen como live | — | declaradas ilustrativas |
| `timeout / API error` | Form muestra error del renderer | `mailto:hola@efeoncepro.com` / `/contacto/` / WhatsApp | CTA nunca muere; sin lead fantasma |
| `dirty exit` | Usuario abandona con campos llenos | sin trap; datos en el campo hasta reload | no bloquear salida |

## GVC Scenario Plan

- Scenario: conversión de la landing `/agencia`.
- Scenario file: **N/A** — GVC del portal no aplica a WP público; **Playwright live** sobre preview/publicada.
- Route: `/agencia/` (staging/preview antes de indexar).
- Viewports: `1440`, `1280`, `390`.
- Required steps: cargar → scroll por cada `data-capture` → click "Agenda una reunión" (verificar scroll a `#agenda`) → montar form (sin enviar lead real) → abrir 1 FAQ → probar fallback CTA.
- Required captures: hero fold; sección firma (motor + proof-engine); bloque de conversión con form montado; mobile 390 full-page.
- Required data-capture markers: los 12 del wireframe.
- Assertions: CTA hero → `#agenda` funciona; form monta `data-form-ready="true"`; `scrollWidth == clientWidth`; sticky mobile `.mcta` se oculta dentro de `#agenda`; ningún CTA muerto.
- Scroll-width checks: `scrollWidth == clientWidth` en 1440/1280/390.
- Accessibility/focus checks: foco visible en CTAs + form; success/error anunciados por SR; FAQ por teclado.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: conversión = ancla in-page `#agenda` + `<greenhouse-form>` gobernado (patrón vivo), con "Agenda una reunión" como CTA primario.
- Alternatives considered: (a) HubSpot Meetings embed directo — net-new, sin precedente gobernado en el sitio, mayor riesgo → Open Q; (b) solo `mailto` — pierde captura/atribución; (c) redirigir a `/contacto/` — fricción extra, saca del funnel.
- Why this pattern: reusa el engine de Growth Forms ya gobernado (atribución + consent + Turnstile + dispatcher), coherente con TASK-1343/1345; CTA nunca muere gracias al fallback.
- Reuse / extend / new primitive: `reuse` (Growth Forms + rail Ohio); ninguna primitive nueva.
- Open risks: mecanismo final del CTA "Agenda una reunión" (Meetings vs growth-form) sin resolver; delivery HubSpot `disabled` hasta cutover del dispatcher (lead se captura pero no fluye a HubSpot hasta prender).
- Follow-up: decidir mecanismo de agenda con el operador (Open Q de la task); confirmar cutover del dispatcher para que el lead fluya a HubSpot.

## Acceptance Checklist

- [ ] La task declara este archivo en `Flow`.
- [ ] Toda superficie tiene comportamiento desktop + compacto.
- [ ] Open/close/escape/focus-restore del bloque de conversión están especificados.
- [ ] Routing (hash `#agenda`/`#faq`), deep-link y back button son explícitos.
- [ ] Readers/commands nombrados (none del portal; Growth Forms API server-side) y sin lógica de negocio UI-only.
- [ ] Failure paths son user-safe y el CTA nunca queda muerto (fallback `mailto`/`/contacto/`).
- [ ] El GVC/Playwright plan prueba el flujo (CTA→`#agenda`→form monta), no solo un screenshot.
- [ ] El decision log explica superficies/rutas y el Open Q del mecanismo de agenda.
