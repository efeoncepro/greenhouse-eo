# TASK-1345 — Wave diseno y desarrollo web Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1345 — Landing publica Wave: diseno y desarrollo web`
- Related wireframe: [docs/ui/wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md](../wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md)
- Intended route / surface: `efeoncepro.com/servicios/diseno-desarrollo-web/` propuesta
- Flow type: `multi-surface` (landing -> form/contacto gobernado -> HubSpot/Meetings/WhatsApp; interlinks a servicios relacionados)
- Primary primitives: patrones marketing public-site + conversion primitive gobernado `[verificar]`
- Copy source: contenido de pagina publica, no `src/lib/copy`

## Flow Brief

- Primary user: decisor que evalua renovar o construir un sitio web comercial.
- Entry moment: busqueda organica, nav, anuncio, Wave Hub o interlink desde AEO/SEO/Globe/Home.
- Successful outcome: usuario pide cotizacion o agenda/contacta por canal secundario; lead queda trazable en el pipeline gobernado.
- Primary decision/action: click en "Quiero cotizar".
- Non-goals: no calcula precio automaticamente; no ejecuta un diagnostico AI Visibility; no reconstruye HubSpot.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Landing `/servicios/diseno-desarrollo-web/` | Entry + persuasion + conversion | Pagina larga con anchors | Stack 1-col con CTA claro | public-site marketing patterns |
| Conversion form/contacto | Captura de cotizacion | Inline/embedded en region 11 | Full-width, labels visibles | Growth Forms / HubSpot / Meetings `[verificar]` |
| HubSpot/CRM | Registro comercial | Invisible para usuario | Invisible para usuario | integration existente |
| WhatsApp/Meetings | Salida secundaria | Link externo/embedded booking | Link externo/booking | canal existente `[verificar]` |
| Related services | Interlinks AEO/SEO/CRM/Think/Wave/Loop | Links contextuales + modulo bajo FAQ | Links stack | paginas publicas |

## Flow Map

1. Entry: usuario llega desde busqueda, nav, anuncio o interlink.
2. Orientation: hero explica categoria, outcome y CTA.
3. Meaning: "dos visitantes" instala la tesis humano + buscador/IA/agente.
4. Method: IDD reduce incertidumbre sobre como se construye el sitio.
5. Mid-intent: CTA strip permite saltar al formulario si ya hay intencion.
6. Qualification: AI-ready + "sale listo" + segmentacion ayudan al usuario a verse en un caso.
7. Proof/risk: performance + proof + de-risk reducen miedo a una web inutil.
8. Objections: FAQ responde compra, tecnologia, SEO, IA, tiempos y costo.
9. Conversion: formulario solicita contexto y entrega a HubSpot/Meetings/WhatsApp.
10. Completion: success del renderer/canal confirma recepcion y deja siguiente paso.
11. Secondary exits: interlinks relacionados viven como aprendizaje/continuacion sin competir con CTA principal.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click "Quiero cotizar" | Hero / CTA strip / final | Scroll o foco en conversion form | Enter/Space | CTA principal |
| Click "Prefiero agendar una llamada" | Hero/form | Meetings/contacto | Enter/Space | destino real `[verificar]` |
| Click WhatsApp | Form/fallback | WhatsApp | Enter/Space | secundario |
| Click "Producir a escala" | Segmentacion | Form con contexto o scroll | Enter/Space | preselect si form soporta metadata |
| Click interlink contextual | Body/related | AEO/SEO/CRM/Think/Wave/Loop | Enter/Space | no abrir modal |
| Toggle FAQ | FAQ | Expand/collapse | Enter/Space | acordeon accesible |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| browsing | Usuario leyendo landing | page load | click CTA/interlink | contenido completo, anchors activos |
| mid_intent | Usuario activo antes del cierre | click CTA intermedio | scroll/focus form | no overlay invasivo |
| segment_selected | Usuario eligio job/caso | click card segmentacion | scroll/focus form | mantener contexto si posible |
| form_ready | Form o fallback visible | llegada a region 11 | submit / salida secundaria | labels, errores, privacy/consent si aplica |
| form_loading | Submit en progreso | submit | success/error | owner renderer/canal |
| form_error | Fallo de envio/carga | error renderer | retry/fallback | mensaje claro + canal alternativo |
| submitted | Solicitud recibida | submit accepted | cierre | success y siguiente paso |
| secondary_exit | Agenda/WhatsApp | click secondary | navegador externo/back | camino no bloquea |
| related_exit | Usuario abre related service | click interlink | back button | pagina shareable, sin dirty state |

## Routing Contract

- Canonical URL propuesta: `https://efeoncepro.com/servicios/diseno-desarrollo-web/`.
- Discovery obligatorio: tratar `https://efeoncepro.com/diseno-web/` como posible archivo/categoria legacy y decidir canonical/redirect/noindex.
- Deep links: anchors opcionales `#metodo`, `#ai-ready`, `#faq`, `#cotizar`.
- Back button: estandar del navegador; volver desde related/Meetings debe preservar la landing.
- Reload: idempotente; contenido publico.
- Shareability: pagina indexable con canonical unico.
- External links: abrir segun convencion del sitio; no perder accesibilidad.

## Focus & Accessibility

- Initial focus: no forzado; skip-link global si existe.
- CTA scroll: si el CTA mueve a formulario, foco debe aterrizar en heading/form intro o primer campo.
- Escape behavior: N/A, sin modal propio.
- Click-away: N/A.
- Focus restore: al cerrar booking/volver, comportamiento nativo.
- Modal vs non-modal semantics: no-modal.
- Screen reader announcement: form renderer anuncia loading/success/error; FAQ usa semantica nativa.
- Keyboard traversal: header -> hero -> secciones -> FAQ -> form -> footer.
- Reduced motion: no depende de animacion para indicar estado.

## Data & Command Boundaries

- Readers: ninguno nuevo.
- Commands: ninguno nuevo en Greenhouse por esta task. La captura debe usar un form/canal gobernado existente.
- API routes: no crear endpoint ad hoc de cotizacion en esta task.
- Optimistic updates: N/A.
- Cache / invalidation: cache del sitio publico; purgar en publish.
- Audit / signals: heredados de HubSpot/Growth Forms/Meetings segun canal elegido.
- Tenant / access boundary: publico; cualquier PII viaja por el canal gobernado.
- Form metadata recommended: `source=wave_web_landing`, `service=diseno_desarrollo_web`, `selected_job` si aplica.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| not found | 404 en ruta propuesta | publicar/redirect correcto | discovery previo |
| legacy conflict | `/diseno-web/` indexa archivo | canonical/redirect/noindex documentado | SEO |
| form unavailable | Form no carga | mostrar WhatsApp/agenda/contacto alternativo | CTA nunca muere |
| submit error | Error del renderer | reintentar o canal alternativo | no exponer internals |
| external URL missing | CTA secundario/interlink sin destino | remover o mantener texto sin link hasta resolver | no `href="#"` |
| proof unavailable | Caso no autorizado | usar copy honesto "casos en validacion" o remover | no placeholder |
| user abandons | Sale por related link | back button vuelve a landing | no dirty state |

## GVC Scenario Plan

- Scenario: landing -> CTA principal -> form/fallback + FAQ + secondary path.
- Scenario file: `scripts/frontend/scenarios/public-wave-diseno-desarrollo-web.capture.txt`
- Route: preview/staging de la landing publica.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; click CTA hero; validar foco/form; abrir FAQ; click segment card; validar secondary CTA visible; revisar related module.
- Required captures: hero, form/fallback, FAQ abierto, related services.
- Required `data-capture` markers: `hero`, `idd`, `segments`, `faq`, `conversion-form`.
- Assertions: CTA accionable; no `href="#"`; sin scroll horizontal; form/fallback visible; H1 unico.
- Scroll-width checks: `scrollWidth <= clientWidth` en ambos viewports.
- Accessibility/focus checks: focus ring visible; heading order; FAQ keyboard.
- Reduced-motion evidence: contenido intacto bajo reduced motion.

## Design Decision Log

- Decision: el flujo principal es single-page conversion, con interlinks secundarios controlados.
- Decision: no hay modal/sidecar; la landing debe poder leerse, compartirse e indexarse como documento publico.
- Decision: la captura no se implementa localmente; se entrega a un canal gobernado.
- Decision: related services bajo FAQ porque el usuario ya resolvio objeciones antes de explorar otros servicios.
- Alternatives considered: muchos CTAs a servicios antes del form (riesgo fuga), form JS local del HTML v11 (no gobernado), agenda como CTA primario (menos alineada a cotizacion).
- Reuse / extend / new primitive: reuse.
- Open risks: form/canal final, URLs de related services, route ownership legacy.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and include fallback contact.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow reuses governed conversion surfaces.
