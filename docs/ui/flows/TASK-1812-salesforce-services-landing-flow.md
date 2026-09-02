# TASK-1812 — Salesforce Services Landing Flow Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1812 — Landing pública de servicios Salesforce: universo conectado`
- Related wireframe: `docs/ui/wireframes/TASK-1812-salesforce-services-landing.md`
- Intended route / surface: nueva landing pública de servicios Salesforce en WordPress.
- Flow type: `single-surface`
- Primary primitives: route selector, anchored chapters, Growth Forms/Meetings host existente.
- Copy source: copy ledger TASK-1812 + microcopy canónico del host.

## Flow Brief

- Primary user: sponsor u operador que ya usa Salesforce, o comité que evalúa adoptarlo.
- Entry moment: llega desde servicios, búsqueda, presentación comercial, referral o campaña.
- Successful outcome: Efeonce recibe un intake server-confirmed o una reunión válida con el contexto de ruta.
- Primary decision/action: elegir contexto, reconocer necesidad y completar un único siguiente paso.
- Non-goals: assessment automático, recomendación de licencias, cotizador, auditoría técnica sin consentimiento o creación de lead al explorar.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Base page | explicar y calificar | capítulos + mapa localizado | capítulos verticales | WordPress/Elementor |
| Route selector | fijar contexto | opciones paralelas | opciones apiladas | tabs/links semánticos |
| Conversion host | capturar intake/agendar | inline preferido | inline full-width | Growth Forms/Meetings |
| Success state | confirmar receipt | receipt dentro del host | receipt visible sin salto | host canónico |

## Flow Map

1. Entry: carga contenido HTML completo; si existe ruta allowlisted en URL, se refleja sin ocultar la otra.
2. Primary action: elegir `Ya usamos Salesforce` o `Estamos evaluando Salesforce`.
3. Transition: el copy de journey, fit y conversión adapta contexto; no reordena la página ni envía datos.
4. User decision: explorar lanes/lifecycle y abrir el intake o la agenda.
5. Completion: submit/booking confirmado por servidor; mostrar receipt y próximos pasos reales.
6. Recovery / exit: conservar input cuando sea seguro, ofrecer retry/contacto y permitir Back sin lead accidental.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| elegir base instalada | hero/routes | `installed` | Enter/Space | actualiza contexto y URL allowlisted |
| elegir evaluación | hero/routes | `evaluate` | Enter/Space | no recomienda licencia |
| ver capacidad | lane/agent mission | detail visible | Enter/Space | aria-selected sincronizado |
| iniciar conversación | CTA | conversion host | Enter | foco a heading/primer campo |
| enviar/agendar | host | pending→complete/error | host native | receipt server-side |
| abrir FAQ | disclosure | expanded | Enter/Space | native semantics |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| ready | contenido disponible | first paint | route selection/CTA | HTML completo |
| installed | ya usa Salesforce | route choice/URL | other choice | texto `Seleccionado` |
| evaluate | evalúa Salesforce | route choice/URL | other choice | límites de licenciamiento claros |
| intake | host activo | CTA | submit/exit | focus y consent |
| loading | host/request real | network | ready/error | status textual |
| error | envío no confirmado | host failure | retry/edit | input preservado, sin raw error |
| denied | abuse verification | host policy | verification | recovery comprensible |
| complete | receipt confirmado | server success | contact/navigation | no confundir click con conversión |

## Routing Contract

- Route changes: `query`
- Canonical URL: se define en Discovery; query `context=installed|evaluate` no crea canonical separado.
- Deep-link behavior: contexto allowlisted; cualquier valor desconocido cae en estado neutral.
- Back button behavior: restaura selección y scroll nativos sin replay obligatorio.
- Reload behavior: conserva sólo el contexto de URL, nunca PII del formulario en query.
- Shareability: la ruta contextual es compartible; el estado de host/formulario no lo es.

## Focus & Accessibility

- Initial focus: navegación/documento nativos; no autofocus intrusivo.
- Escape behavior: sólo aplica si el host aprobado usa diálogo; cierra sin borrar silenciosamente.
- Click-away behavior: no cambia selección ni descarta datos.
- Focus restore: CTA de origen tras cerrar; heading de receipt tras éxito.
- Modal vs non-modal semantics: inline por defecto; dialog sólo si el primitive host lo exige.
- Screen reader announcement: cambio de contexto, pending, error y receipt; no scroll/motion ornamental.
- Keyboard traversal: DOM sigue lectura visual; no arrow handler global.
- Reduced motion: estados cambian inmediatamente y el mapa queda en su composición final.

## Data & Command Boundaries

- Readers: contenido público WordPress; ningún reader Salesforce/CRM en browser.
- Commands: command server-side existente del Growth Form o booking host aprobado.
- API routes: las ya gobernadas por el host; la task no crea endpoint paralelo.
- Optimistic updates: ninguno para submit/booking.
- Cache / invalidation: cache público se purga después de publish; receipt nunca depende de page cache.
- Audit / signals: route selection, CTA, form start y server-confirmed receipt como eventos distintos, sin PII.
- Tenant / access boundary: superficie pública; cero secretos, credenciales Salesforce o datos internos.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | verificación requerida | completar challenge/retry | no bucle invisible |
| not found / empty | omitir prueba inexistente | mostrar método | no placeholder |
| partial / degraded | contenido principal intacto | retry media/host | enhancement fail-safe |
| stale data | no publicar claim/partner badge | retirar módulo | rights gate |
| timeout / API error | input preservado + estado | retry/contacto | no fake success |
| dirty exit | aviso sólo si dialog/host lo soporta | continuar/salir | no interceptar Back global |

## GVC Scenario Plan

- Scenario: `TASK-1812-public-salesforce-services-flow`
- Scenario file: crear durante implementación.
- Route: work page `noindex`.
- Viewports: 1440, 390; reduced motion en ambos.
- Required steps: neutral→installed→evaluate→intake→invalid→pending→error→retry→complete; Back/reload/deep link.
- Required captures: ambos contextos, host states y receipt.
- Required `data-capture` markers: `routes|journey|conversion`.
- Assertions: selección/URL/aria alineados; cero submit al seleccionar; receipt sólo con confirmación; PII fuera de analytics/URL.
- Scroll-width checks: documento y host sin overflow.
- Accessibility/focus checks: teclado, focus visible/restore, announcements no duplicados.
- Reduced-motion evidence: cambio instantáneo y significado completo.

## Design Decision Log

- Decision: dos entradas contextuales convergen en una conversión, sin crear funnels o landing duplicadas.
- Alternatives considered: formulario único sin contexto, quiz multi-step y dos páginas separadas.
- Why this pattern: reduce fricción, conserva una sola promesa y captura la diferencia comercial más importante.
- Reuse / extend / new primitive: reusar hosts y disclosures; extender selector público; no command nuevo.
- Open risks: disponibilidad del host, contrato exacto del contexto allowlisted y atribución.
- Follow-up: validar con ventas que las preguntas de intake cambian sólo donde mejoran la preparación.

## Acceptance Checklist

- [x] The owning task declares this file in `Flow`.
- [x] Every surface has desktop and compact behavior.
- [x] Opening, closing, escape and focus restore are specified.
- [x] Route/deep-link/back-button behavior is explicit.
- [x] Data readers/commands are named and UI-only business logic is avoided.
- [x] Failure paths are user-safe and do not expose internals.
- [x] GVC sequence captures prove the flow, not only static screens.
- [x] Design decision log explains why the flow uses these surfaces/routes.
