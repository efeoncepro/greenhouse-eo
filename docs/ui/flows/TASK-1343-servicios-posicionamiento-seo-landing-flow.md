# TASK-1343 — Landing SEO `/servicios/posicionamiento-seo` Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1343 — Landing pública de servicio SEO`
- Related wireframe: [docs/ui/wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md](../wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md)
- Intended route / surface: `efeoncepro.com/servicios/posicionamiento-seo` (público; WordPress/Elementor hoy → Astro `efeonce-web`)
- Flow type: `multi-surface` (landing → `<greenhouse-form>` embebido → nodo grader en `think.efeoncepro.com` → reporte/email)
- Primary primitives: patrones marketing `modern-ui` + `<greenhouse-form>` (Growth Forms renderer) + nodo grader (Think)
- Copy source: contenido de página pública (no `src/lib/copy`); validado `greenhouse-ux-writing` + context pack 05

> **Nodo del programa.** Esta landing es un **nodo de entrada** del flow maestro
> [EPIC-020 AEO Program UI Flow](EPIC-020-AEO-PROGRAM-UI-FLOW.md). NO re-autora el
> journey form→grader→reporte→email: ese journey lo poseen TASK-1327 (landing
> lead-magnet + embed) y TASK-1336 (handoff tokenized report). Este contrato solo
> especifica **cómo la landing SEO entrega al usuario a ese flow existente**.

## Flow Brief

- Primary user: decisor de marketing (ICP Globe) evaluando proveedor SEO.
- Entry moment: llega por búsqueda ("agencia seo"/"posicionamiento web") o link interno.
- Successful outcome: inicia el diagnóstico (grader) o contacta al equipo — lead capturado en el pipeline gobernado.
- Primary decision/action: click en "Diagnostica tu visibilidad" (CTA primario, repetido en hero/grader/final).
- Non-goals: no ejecuta el análisis del grader en esta página; no muestra el reporte; no reconstruye el form.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Landing `/servicios/posicionamiento-seo` | Entry + contexto | Página editorial multisección | Stack 1-col | Patrones marketing `modern-ui` |
| `<greenhouse-form>` embebido (sección grader) | Captura gobernada | Form inline en card | Form full-width | Growth Forms renderer (existente) |
| Nodo grader `think.efeoncepro.com` | Diagnóstico + reporte | Navegación/handoff (nueva pestaña o ruta) | Igual | Superficie Think (existente) |
| `/servicios/aeo` (hermana) | Cross-link cimiento→filo | Link desde banda puente | Igual | Landing AEO (follow-up) |

## Flow Map

1. Entry: usuario aterriza en la landing SEO (búsqueda / nav / campaña).
2. Primary action: click en "Diagnostica tu visibilidad" (hero, sección grader o CTA final).
3. Transition: (a) si el `<greenhouse-form>` está embebido → completa en la página; (b) si es link → va al nodo grader en Think.
4. User decision: enviar datos del diagnóstico o "Habla con el equipo" (form/contacto existente).
5. Completion: submit aceptado → el journey continúa en el flow maestro (Success Card TASK-1320 → status → reporte TASK-1336 → email).
6. Recovery / exit: si el embed no carga (JS off/bloqueado) → fallback link directo al grader en Think (CTA nunca muere); si abandona, no hay estado sucio (página informativa).

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click "Diagnostica tu visibilidad" | Hero / grader / final CTA | Form embebido o nodo grader | Enter/Space en `<a>`/`<button>` | CTA primario repetido |
| Click "Habla con el equipo" | Hero secundario | Form/contacto existente | Enter/Space | acción secundaria |
| Click "Ver AEO" | Banda puente | `/servicios/aeo` | Enter/Space | cross-link hermana |
| Toggle ítem FAQ | Sección FAQ | Expandir/colapsar | Enter/Space (`<summary>`) | `<details>` nativo |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | Landing en reposo | carga de página | click CTA | contenido + CTAs activos |
| opening | N/A (sin overlay propio) | — | — | — |
| open | Form embebido visible | scroll a sección grader | submit / abandono | form renderer con sus estados |
| loading | Loading del form embebido | submit | accepted/error | owned por renderer TASK-1320 |
| error | Error del form | fallo submit | reintento | owned por renderer; página muestra fallback link |
| dirty | N/A | — | — | página informativa, sin dirty-state propio |
| complete | Submit aceptado | accepted | continúa en flow maestro | handoff a Think (TASK-1336) |

## Routing Contract

- Route changes: `path` (canónica `/servicios/posicionamiento-seo`); el CTA al grader puede ser `path` a Think o abrir el embed (sin cambio de ruta).
- Canonical URL: `https://efeoncepro.com/servicios/posicionamiento-seo`.
- Deep-link behavior: la página es indexable (a diferencia del reporte, que es `noindex`); anclas por sección (`#metodo`, `#faq`) opcionales.
- Back button behavior: estándar del navegador; volver desde Think/`/servicios/aeo` regresa a la landing intacta.
- Reload behavior: idempotente (contenido estático/SSR).
- Shareability: totalmente compartible (URL pública canónica; objetivo SEO primario).

## Focus & Accessibility

- Initial focus: none forzado (página de contenido); skip-link del sitio disponible.
- Escape behavior: N/A (sin modal propio); el form embebido gestiona su Escape.
- Click-away behavior: N/A.
- Focus restore: al volver de Think/`/servicios/aeo`, foco natural del navegador.
- Modal vs non-modal semantics: no-modal (página); el form es inline, no modal.
- Screen reader announcement: headings semánticos; el form anuncia sus estados vía su `role=status` (renderer).
- Keyboard traversal: orden lógico top→bottom; CTAs y FAQ (`<summary>`) alcanzables por teclado.
- Reduced motion: entradas/reveals desactivados bajo `prefers-reduced-motion` (ver Motion contract).

## Data & Command Boundaries

- Readers: ninguno nuevo (página estática/SSR).
- Commands: ninguno nuevo. La captura usa el submit gobernado del `<greenhouse-form>` (Growth Forms) → outbox → pipeline grader. Full API Parity satisfecho por **reuso**.
- API routes: reusa `/api/public/growth/forms/**` (existente) vía el renderer; la landing no llama endpoints directo.
- Optimistic updates: N/A.
- Cache / invalidation: cache del sitio público (Kinsta/CDN o Vercel); purgar en publish.
- Audit / signals: heredados del pipeline del grader (submission_accepted, projection). Sin señal nueva.
- Tenant / access boundary: público, sin auth; consent/Turnstile/surface-auth heredados del renderer gobernado.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | N/A (público) | — | — |
| not found / empty | 404 del sitio si la ruta no existe | publicar la página / 301 correcto | crawl confirma slug |
| partial / degraded | Embed del form no carga (JS off/bloqueado) | fallback link directo al grader en Think | CTA nunca muere |
| stale data | Contenido curado desactualizado | re-publish | no es data en vivo |
| timeout / API error | Error del submit del form | manejado por renderer (Success Card estados) | no reimplementar |
| dirty exit | N/A | — | sin dirty-state propio |

## GVC Scenario Plan

- Scenario: recorrido landing → CTA grader (embed visible o fallback link).
- Scenario file: `scripts/frontend/scenarios/public-servicios-posicionamiento-seo.capture.txt` (crear).
- Route: URL pública del preview (WordPress staging / Vercel preview).
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; scroll a sección grader; verificar embed o fallback; abrir 1 FAQ.
- Required captures: full-page desktop + mobile; sección grader; FAQ abierto.
- Required `data-capture` markers: `hero`, `grader`, `faq`.
- Assertions: CTA grader presente y accionable; sin scroll horizontal; H1 presente.
- Scroll-width checks: `scrollWidth <= clientWidth` ambos viewports.
- Accessibility/focus checks: focus visible en CTAs; contraste AA en bandas.
- Reduced-motion evidence: capturar con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: la landing es **nodo de entrada** del flow maestro EPIC-020; entrega al usuario al `<greenhouse-form>`/grader gobernado, no re-autora el journey.
- Alternatives considered: (a) reconstruir el form/grader en la página — descartado (Full API Parity, duplicaría contrato); (b) landing sin embed, solo link — posible fallback, pero el embed reduce fricción (mejor conversión).
- Why this pattern: reuso del renderer gobernado (consent/Turnstile/telemetry intactos) + un solo nodo grader (una engine, muchos entry points, PDR-002/003).
- Reuse / extend / new primitive: reuse (renderer + nodo grader + patrones marketing).
- Open risks: (1) estado del embed en el runtime público (WordPress vs Astro) — Discovery; (2) CORS/surface-allowlist del form para el origin `efeoncepro.com/servicios/*` (verificar TASK-1335 cubre este origin).
- Follow-up: sibling `/servicios/aeo` flow; guía pillar en Think.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified (form embebido owned por su renderer; página no-modal).
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided (reuso del submit gobernado; sin lógica en la página).
- [ ] Failure paths are user-safe (fallback link al grader; sin exponer internals).
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow reuses these surfaces/routes.
