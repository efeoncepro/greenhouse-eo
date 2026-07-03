# TASK-1320 — Growth Forms Success Card Renderer Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1320 — Growth Forms Success Card — Renderer (ui-ux)`
- Related wireframe: [docs/ui/wireframes/TASK-1320-growth-forms-success-card-renderer.md](../wireframes/TASK-1320-growth-forms-success-card-renderer.md)
- Related motion: [docs/ui/motion/TASK-1320-growth-forms-success-card-renderer-motion.md](../motion/TASK-1320-growth-forms-success-card-renderer-motion.md)
- Intended route / surface: portable `<greenhouse-form>` renderer inside WordPress/Astro/Next.js host cards; first consumer AEO `/aeo-2/`
- Flow type: `platform-primitive` (in-card state swap) con salida `cross-route` opcional (CTA/redirect/reward)
- Primary primitives: Growth Forms renderer success state (`ghf-success-card`), CTA/link tokenizado del renderer
- Copy source: `success_behavior_json` + `copy_refs_json` + `src/growth-forms-renderer/copy.ts` fallback

> **Capacidad transversal, NO de AEO (frontera dura):** este flow describe un **platform primitive del renderer de Growth Forms**, gobernado por `success_behavior_json` y reusable por CUALQUIER form (lead magnet, contacto, diagnostico, suscripcion, evento) en CUALQUIER host (WordPress/Astro/Next.js/preview). El programa AEO NO es dueño de esta capacidad ni la contiene. El renderer es consumer-agnostico: no ramifica por AEO ni por ningun consumidor especifico.
>
> **AEO = primer consumidor verificable, no owner:** AEO `/aeo-2/` es solo la primera superficie donde se verifica en vivo (GVC + live verifier). CUANDO la card se renderiza en `/aeo-2/`, esa instancia actua como el nodo post-submit del [EPIC-020 — AEO Program · Master UI Flow](./EPIC-020-AEO-PROGRAM-UI-FLOW.md) (S1 intake → **nodo confirmacion in-card** → S2/S3 report+email) — pero eso es una relacion de esa *instancia*, no de la capacidad. Un futuro consumidor (otro form, Astro, un lead magnet distinto) reusa este mismo primitive sin ningun acoplamiento a EPIC-020.

## Flow Brief

- Primary user: visitante publico anonimo que acaba de enviar un Growth Form.
- Entry moment: el submit publico devolvio `accepted` (POST `/api/public/growth/forms/[formKey]/submit`).
- Successful outcome: la misma card del formulario se convierte en una Success Card que confirma la recepcion, explica el siguiente paso y ofrece opcionalmente UNA accion gobernada (agenda / recurso), sin salir de la pagina host por default.
- Primary decision/action: leer que fue recibido y (opcional) tomar el unico proximo paso ofrecido.
- Non-goals: Thank You page separada, modal/host DOM propio, confetti, echo de PII/valores, promesa de delivery downstream, menu de multiples CTAs.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Host card (`<greenhouse-form>`) | Entry + contenedor | El renderer reemplaza el form por la Success Card DENTRO del mismo root; el chrome del host (titulo/trust) lo maneja el host | Igual; single-column, sin scroll horizontal a 390 | Renderer root + `ghf-success-card` |
| Success Card (in-card) | Confirmacion + next steps + accion | Card tokenizada: status mark, titulo, body, steps, reward opcional, action row, support note | Single-column, CTAs wrap limpio | `ghf-success-card` + sub-elementos |
| Destino externo (opcional) | Agenda / recurso / descarga | `href` allowlisted del contrato abre en `_self`/`_blank` con rel safe | Igual | `<a>` nativo tokenizado |

## Flow Map

1. Entry: submit → `accepted`; el renderer emite `gh_form_submission_accepted` (ya existente, bubbles+composed) y llama `renderSuccess()`.
2. Ramaje por contrato: si `kind='redirect'` + `redirectUrl` → navega (comportamiento legacy preservado). Si `presentation='success_card'` → pinta la Success Card in-card.
3. Transition: swap corto CSS (160-220ms opacity+transform) form→card; con `prefers-reduced-motion` = reemplazo inmediato. Ver motion contract.
4. Focus: el foco se mueve al contenedor de la card (`role=status`, `tabindex=-1`) tras el paint; anuncio polite del estado accepted.
5. User decision: (opcional) el visitante clickea la UNICA accion gobernada (recomendacion CRO: un solo proximo paso, no menu).
6. Completion / exit: la card es el estado persistente in-card; una accion externa navega fuera (nueva pestaña o misma), o el visitante simplemente cierra.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Submit `accepted` | POST submit | Success Card render | Enter en el submit | Reemplaza el form; foco al contenedor |
| CTA/accion click | Success Card action | Destino externo (allowlisted) | Tab→Enter/Space (`<a>`/`<button>` nativo) | Emite `gh_form_success_action_clicked` con `action_kind`/`reward_kind` |
| `kind='redirect'` | contrato | Navegacion (legacy) | n/a | Emite `gh_form_asset_accessed`; sin card |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | Form visible pre-submit | mount | submit accepted | Form normal (fuera de scope de esta card) |
| opening | Transicion form→card | `accepted` | paint completo | CSS transition 160-220ms; reduced-motion = inmediato |
| open | Success Card visible | paint | navegacion externa / cierre | Titulo/body/steps + reward/action opcional; foco en contenedor |
| loading | Submit pending previo | submit click | accepted/rejected | Estado pending existente del renderer (no es esta card) |
| error | Submit rechazado | outcome ≠ accepted | reintento | NO success card; estados invalid/captcha/rate-limited existentes |
| partial | Reward/accion no disponible | contrato con reward degradado | — | Card accepted + omite/explica el reward sin fallar el submit |
| complete | Estado persistente in-card | open | — | La card queda; sin auto-dismiss |

## Routing Contract

- Route changes: `none` por default (in-card swap, sin cambio de URL). `path`/externo solo si el contrato define `redirect` o una accion externa clickeada.
- Canonical URL: la misma ruta host (`/aeo-2/` para el primer consumidor); la card no introduce ruta nueva.
- Deep-link behavior: no hay deep-link a la card (es un estado post-submit efimero por sesion).
- Back button behavior: n/a (no hay push de historia por la card); un redirect legacy sigue su propio historial.
- Reload behavior: reload vuelve al form vacio (el submit fue single-use; el borrador PII-safe ya se limpio en `accepted`).
- Shareability: no shareable (estado post-submit, sin URL propia).

## Focus & Accessibility

- Initial focus: contenedor de la Success Card (`role=status`, `tabindex=-1`) — anuncia el estado accepted. NO saltar el foco directo al CTA (evita hijack y saltarse la confirmacion).
- Escape behavior: n/a (no es modal).
- Click-away behavior: n/a (no es modal ni popover).
- Focus restore: n/a — los controles del form se reemplazan intencionalmente tras accepted.
- Modal vs non-modal semantics: NO modal; region in-card con live region polite.
- Screen reader announcement: un solo anuncio polite del estado accepted; sin anuncios repetidos por sub-elementos decorativos.
- Keyboard traversal: CTA(s) en orden visible, `<a>`/`<button>` nativos, targets ≥24px.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` → reemplazo inmediato, foco igual se mueve.

## Data & Command Boundaries

- Readers: render contract publicado (`getPublishedRenderContractByRef`) transporta la success-card metadata browser-safe (TASK-1319).
- Commands: submit publico gobernado (`submitForm`) sigue siendo el unico primitive de accepted; la card no ejecuta writes.
- API routes: GET `[formSlug]` (contrato) + POST `[formSlug]/submit` (accepted) existentes; sin ruta nueva.
- Optimistic updates: ninguno (la card solo renderiza tras `accepted` real del server).
- Cache / invalidation: n/a.
- Audit / signals: `gh_form_submission_accepted` (existente) + `gh_form_success_viewed`/`gh_form_success_action_clicked` (allowlisted en TASK-1319); nunca field values/PII/HubSpot IDs/private tokens.
- Tenant / access boundary: superficie publica anonima; host surface allowlist + form key + CORS/captcha/rate-limit existentes.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | Copy unauthorized/disabled existente | reintento segun estado existente | No success card |
| not found / empty | n/a (la card requiere accepted) | — | — |
| partial / degraded | Card accepted + reward omitido/explicado ("El siguiente paso puede tardar unos minutos") | accion opcional de reintento/acceso | No falla el submit |
| stale data | n/a | — | La card es post-submit puntual |
| timeout / API error (submit) | Estado de error del submit existente (sanitizado) | reintentar submit | No hay card en fallo |
| dirty exit | n/a | — | Form ya reemplazado; borrador limpiado |

## GVC Scenario Plan

- Scenario: Growth Forms success card render (default + reward variant + mobile + reduced-motion).
- Scenario file: `scripts/frontend/scenarios/growth-forms-success-card.ts` o extension del AEO live verifier (`verify-aeo-live-contract.ts`).
- Route: `/aeo-2/` (primer consumidor) + fixture/preview interno para la variante reward si esta disponible.
- Viewports: desktop 1440/2048 y mobile 390.
- Required steps: cargar form, llenar datos validos, completar Turnstile/test harness donde aplique, submit, esperar `accepted`, afirmar que el form fue reemplazado por la card.
- Required captures: `before-submit`, `after-success`, reward variant si existe, mobile 390, `after-success-reduced-motion`.
- Required `data-capture` markers: `growth-form-success-card`, `growth-form-success-reward`, `growth-form-success-actions`.
- Assertions: sin mensaje legacy bottom-only, sin echo de `firstName`/`fullName`/PII, sin `submissionId` crudo, card con titulo/body, reward/accion solo desde contrato allowlisted, foco en contenedor.
- Scroll-width checks: `scrollWidth == clientWidth` desktop y mobile 390.
- Accessibility/focus checks: active element = contenedor de la card; semantica de status presente.
- Reduced-motion evidence: la transicion colapsa a swap inmediato, sin contenido oculto ni foco diferido.

## Design Decision Log

- Decision: la thank-you es un estado in-card del renderer portable gobernado por `success_behavior_json`, no una pantalla/DOM host-specific.
- Alternatives considered: Thank You page redirect, bloque WordPress-local, success message nativo de HubSpot, toast generico, modal.
- Why this pattern: preserva el contexto de la pagina host, evita drift por-host, mantiene el destino server-side, es medible, y crea una capacidad reusable de reward/lead-magnet para todos los forms.
- Host chrome swap (frontera dura): el renderer NUNCA dibuja el chrome/titulo del host. Si un host quiere neutralizar su propio titulo al pasar a success, se suscribe al `CustomEvent gh_form_submission_accepted` (ya emitido) — sin logica en el host renderer, mantiene Full API Parity. Ver el contrato de heading en la task/wireframe.
- Reuse / extend / new primitive: extiende el estado success del renderer; no importa primitives del portal ni crea motion global nuevo.
- Open risks: CSS hostil del host, layout jump mobile, over-permisividad de URLs de reward, copy que sobre-promete delivery. Cubiertos por renderer-scoped CSS + allowlist (TASK-1319) + copy `accepted`-only + GVC.
- Follow-up: si multiples forms necesitan reward reveals mas ricos, promover el motion del reward a una variante documentada del renderer.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
- [ ] Este flow referencia el program master flow EPIC-020 y declara que nodo es.
