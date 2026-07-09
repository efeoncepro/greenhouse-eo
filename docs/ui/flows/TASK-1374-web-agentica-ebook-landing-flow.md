# TASK-1374 — Web Agéntica Ebook Lead Magnet Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1374 — Landing pública del ebook "El fin de la web" (/web-agentica)`
- Related wireframe: [docs/ui/wireframes/TASK-1374-web-agentica-ebook-landing.md](../wireframes/TASK-1374-web-agentica-ebook-landing.md)
- Related motion: [docs/ui/motion/TASK-1374-web-agentica-ebook-landing-motion.md](../motion/TASK-1374-web-agentica-ebook-landing-motion.md)
- Intended route / surface: `think.efeoncepro.com/web-agentica`
- Flow type: `single-route` (con ancla interna al form; sin cambio de ruta hasta el email)
- Primary primitives: Think Astro landing shell + `BaseLayout` + form gobernado `<greenhouse-form>` + estados route-local del form dock
- Copy source: copy local de Think alineado a los estados gobernados de Growth Forms

## Flow Brief

- Primary user: prospecto anónimo evaluando si descargar el ebook de la web agéntica.
- Entry moment: llega desde búsqueda, social, email o navegación directa.
- Successful outcome: entiende la tesis, completa el form gobernado y recibe el ebook por email; ve un estado de éxito honesto en pantalla ("revisa tu email").
- Primary decision/action: dejar sus datos tras entender qué trae el ebook.
- Non-goals: entregar el ebook sin capturar el lead, crear un endpoint local de intake, generar un "reporte" (esto es contenido, no el grader), indexar cualquier URL con datos del lead.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| `/web-agentica` landing | Entrada, posicionamiento del ebook, host del form | Hero + tesis + contenidos arriba; form dock ancla accesible por CTA de scroll. | Secciones apiladas en el mismo orden; CTA lleva al form. | Think Astro page + `BaseLayout` |
| `<greenhouse-form>` (ebook) | Captura y submit gobernados + trigger del envío del ebook | Embebido en panel sobrio, `appearance="bare"`, con skeleton de carga. | Full-width con spacing estable y foco visible. | Growth Forms renderer |
| Estado de éxito | Confirmación en pantalla | Reemplaza el form con "Te enviamos el ebook a tu email". | Mismo, full-width. | Estado route-local del dock |
| Email con el ebook | Entrega real del lead magnet | Enviado por el fulfillment gobernado de Greenhouse (adjunto/enlace al PDF). | Igual. | Greenhouse email pipeline |

## Flow Map

1. Entry: el usuario abre `/web-agentica`; la página es indexable y presenta la tesis "El fin de la web" con CTA "Descargar el ebook gratis".
2. Primary action: revisa stats, tesis, contenidos y audiencia; hace scroll (o clic en CTA) hasta el form dock.
3. Submit: el renderer gobernado envía los datos a Greenhouse; el submit gobernado (`submitForm`: honeypot + consent + dedupe + outbox) los acepta.
4. Fulfillment: el evento outbox dispara el envío del ebook por email (fulfillment gobernado en Greenhouse). Think NO envía el email ni adjunta el PDF.
5. Success: en pantalla, el form se reemplaza por el estado "Te enviamos el ebook a tu email" (honesto: confirma envío, no descarga on-screen a menos que el contrato exponga un enlace directo).
6. Recovery / exit: si el form no carga, el submit falla o el origen no está autorizado, la landing muestra un estado degradado seguro sin exponer internals.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Load landing | Browser | `landing.ready` o `form.loading` | n/a | Ruta pública, sin auth. |
| CTA "Descargar el ebook gratis" | Usuario | Scroll suave al form dock | Enter/Space en el link/botón | Ancla `#web-agentica-form`, foco al heading del form. |
| Renderer script resuelto | `<greenhouse-form>` host | `form.ready` | n/a | Depende del allowlist gobernado + render contract. |
| Submit form | Usuario en el renderer | `form.submitting` → `form.success` o `form.error` | Submit nativo | Sin handler local salvo callbacks/eventos del renderer. |
| Submission accepted | Evento de éxito del renderer | `form.success` | n/a | Éxito = "revisa tu email"; el envío del ebook es async vía outbox. |
| Retry load | Form host degradado | `form.loading` | Enter/Space | Solo si el host puede re-pedir el renderer con seguridad. |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| landing.ready | Shell y secciones estáticas renderizadas. | Route load | Renderer empieza a cargar | El fold incluye tesis + CTA al form. |
| form.loading | El script/contrato del form está resolviendo. | Mount del componente | Éxito/error del contrato | Skeleton estable; sin salto de layout. |
| form.ready | Campos gobernados disponibles. | Éxito del contrato | Usuario envía | El host no duplica campos ni validación. |
| form.submitting | El renderer envía datos a Greenhouse. | Submit nativo | Accepted/error | El renderer previene doble submit. |
| form.success (thank-you) | Submit aceptado; la descarga tokenizada se dispara y el email de respaldo sale async. | Evento de éxito del renderer (con token del handoff) | n/a (final) | **Tarjeta inline** reemplaza el form (NO overlay): confirma descarga + email, botón "Descargar de nuevo" (gated con el token), un puente al grader `/brand-visibility`. Foco al título, `role=status`. |
| form.error | Submit falló o el renderer devolvió error seguro. | Error del renderer | Retry/editar | Copy seguro, sin stack/API. |
| form.denied | Origen/superficie no autorizado. | Fallo de CORS/surface guard | Fix de allowlist gobernado | Bloqueador pre-launch, no aceptable como final. |

## Routing Contract

- Route changes: ninguno (single-route). Éxito in-place; la entrega ocurre por email fuera del navegador.
- Canonical URL: `https://think.efeoncepro.com/web-agentica` (sin `/index.html`, sin trailing slash, sin redirect).
- Deep-link behavior: `#web-agentica-form` puede anclar al form de forma accesible.
- Back button / reload: reload vuelve a `landing.ready` y re-resuelve el contrato del form; sin persistencia de borrador local.
- Shareability: landing pública/indexable; ninguna URL con datos del lead se expone ni indexa.

## Focus & Accessibility

- Initial focus: default del browser; skip link al main.
- CTA de scroll: al activar, mueve foco al heading del form dock (`Descarga el ebook gratis`).
- Escape / click-away: ninguno; sin modal/drawer en V1.
- Focus restore: si success/error reemplazan el form host, el foco va al heading del nuevo estado cuando es técnicamente posible.
- Screen reader: loading/error/success usan live region polite si el host controla el estado.
- Keyboard traversal: header, CTA, campos del form, submit, retry y summaries del FAQ alcanzables en orden de documento.
- Reduced motion: ver contrato de motion; loaders ambientales colapsan a skeleton + texto.

## Data & Command Boundaries

- Readers: Growth Forms public render contract para el `formKey` del ebook (`[verificar]` — pendiente de crear la foundation backend-data).
- Commands: submit público gobernado por el renderer de Greenhouse (`submitForm`). El envío del ebook es un fulfillment/destination gobernado disparado por el evento outbox.
- API routes: solo APIs públicas de Growth Forms de Greenhouse; ninguna ruta de intake en Think.
- Audit / signals: submission, consent, telemetría y entrega del ebook viven en Greenhouse.
- Tenant / access boundary: origen público sin auth debe estar explícitamente autorizado por el allowlist gobernado de superficies (incluir `think.efeoncepro.com`).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | Mensaje seguro de que el form no está disponible desde esta superficie. | Autorizar el origen en el allowlist gobernado; sin workaround local. | Bloquea la captación. |
| not found / empty | Mensaje de form no disponible. | Retry; inspeccionar render contract. | No crear campos locales de fallback. |
| partial / degraded | Explicar que el form no cargó del todo. | Retry o contacto público. | Evitar términos internos (CORS). |
| timeout / API error | Estado de error seguro en el host. | Retry. | Sin errores crudos. |
| dirty exit | Comportamiento default del browser. | El usuario puede volver y reingresar. | Sin persistencia local. |
| ebook no entregado (fulfillment) | En pantalla el éxito es honesto ("te enviamos el ebook"); si el fulfillment falla, es un gap del contrato gobernado, no de Think. | Investigar el destination/fulfillment en Greenhouse. | Think no puede compensar el envío. |

## GVC Scenario Plan

- Scenario: Think Web Agéntica landing
- Scenario file: `scripts/capture.mjs /web-agentica web-agentica-landing` (capturador propio de Think) o Playwright local equivalente.
- Route: `/web-agentica`
- Viewports: 1440, 1280, 390
- Required steps: cargar, assert meta indexable + canonical sin `/index.html`, capturar hero settled, tab hacia el form, capturar loading/ready del form, capturar success sintético en modo seguro, scroll por stats/thesis/inside/audience/FAQ, verificar que ninguna URL con lead se indexa.
- Required captures: hero desktop, form loader, form ready, success, full page desktop, hero mobile, form mobile, full page mobile.
- Required `data-capture` markers: `web-agentica-landing`, `web-agentica-hero`, `web-agentica-stats`, `web-agentica-thesis`, `web-agentica-inside`, `web-agentica-audience`, `web-agentica-form`, `web-agentica-form-loader`, `web-agentica-faq`, `web-agentica-footer`.
- Assertions: sin overflow horizontal, sin campos locales fuera del `<greenhouse-form>`, sin `_ds/` ni DM Sans foráneos, ruta registrada en `greenhouse.repo.json`.
- Scroll-width checks: en desktop y 390px mobile.
- Accessibility/focus checks: foco visible por header/CTA/form/retry/FAQ; sin foco atrapado; headings en orden.
- Reduced-motion evidence: captura/assert con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: flujo single-route con landing pública indexable, form gobernado y entrega del ebook por email; éxito honesto en pantalla; sin generación de reporte (es contenido, no el grader).
- Alternatives considered: iframe del export, form local Astro, descarga directa sin captura, "reporte" on-screen (confunde con brand-visibility), success con progreso falso.
- Why this pattern: mantiene a Greenhouse como SSOT del submit/consent/entrega y a Think como renderer público; el lead magnet capta y entrega sin inventar lógica local.
- Reuse / extend / new primitive: reuse del renderer Growth Forms + patrón del form dock; sin primitive nueva.
- Open risks: el form_key del ebook + fulfillment + PDF no existen aún (foundation backend-data); allowlist debe incluir `think.efeoncepro.com`.
- Follow-up: si el fulfillment no está listo, los slices de scaffold + port visual proceden; el embed del form queda bloqueado.

## Acceptance Checklist

- [x] La task declara este archivo en `Flow`.
- [x] Cada superficie tiene comportamiento desktop y compacto.
- [x] Apertura, foco y restore están especificados.
- [x] Ruta/deep-link/back-button explícitos (single-route, sin `/index.html`).
- [x] Readers/commands nombrados; sin lógica de negocio UI-only.
- [x] Failure paths seguros, sin exponer internals.
- [x] La secuencia GVC prueba el flujo, no solo pantallas estáticas.
- [x] El decision log explica por qué el flujo usa estas superficies.
