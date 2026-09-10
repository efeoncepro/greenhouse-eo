# TASK-1859 — Landing de capacidad de diseño (conversión, recorrido y fases de publicación) Flow Contract

## Meta

- Status: `draft — contrato de conversión alineado a EPIC-023; fases de publicación atadas al business model`
- Owner task: `TASK-1859 — Landing pública de capacidad de diseño (superficie de producto de Product Design 360)`
- Related wireframe: [docs/ui/wireframes/TASK-1859-landing-product-design-360.md](../wireframes/TASK-1859-landing-product-design-360.md)
- Related motion: [docs/ui/motion/TASK-1859-landing-product-design-360-motion.md](../motion/TASK-1859-landing-product-design-360-motion.md)
- Intended route / surface: página pública `efeoncepro.com` `[slug pendiente: candidato /servicios/diseno-ux-ui/]` — WordPress + Elementor
- Flow type: `multi-surface` — landing → scheduler nativo → confirmación; + anclas internas + salidas a landings hermanas
- Primary primitives: widgets públicos `eo-elementor-widgets` + Growth CTA `open_meeting_scheduler` + `<efeonce-meeting-scheduler>`
- Copy source: Copy Ledger del wireframe (es-CL)

## Program Nodes

Esta landing es **nodo de dos programas** y no crea un riel propio de conversión.

| Programa | Master flow | Qué nodo es esta landing | Regla heredada |
|---|---|---|---|
| **EPIC-023** — Growth CTA & Popup Engine | [`EPIC-023-growth-cta-popup-UI-FLOW.md`](EPIC-023-growth-cta-popup-UI-FLOW.md) | **host WordPress público** que monta `<greenhouse-cta>` con acción `open_meeting_scheduler` | un solo modelo; la política nunca cruza al navegador; nodos nuevos extienden ese flow, no crean rieles paralelos |
| **EPIC-019** — landings públicas | sin master flow `[no existe en docs/ui/flows/]` | landing de servicio, par de `TASK-1345` (sitio web) y `TASK-1350` (creativo) | patrón de conversión compartido del programa |

Si EPIC-019 crea su master flow, esta landing se declara ahí como nodo y este documento lo referencia.

## Flow Brief

- Primary user: Head of Design / Design Director con equipo in-house — visitante público no autenticado.
- Secondary user: CPO/CTO reenviado por el anterior.
- Entry moment: fase B — llega por **envío 1:1** en una conversación comercial (la página no se encuentra); fase C — orgánico, AEO, referido.
- Successful outcome: reunión agendada con receipt confirmado por servidor y atribución por `utm_content`.
- Secondary outcome: el visitante sale hacia la landing hermana correcta (sitio web o creativo) en vez de agendar una reunión equivocada.
- Primary decision/action: *Agenda una reunión*.
- Non-goals: self-serve, login al portal, checkout, cotización, exposición de datos de cliente.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Landing (base) | Entrada, reencuadre, oferta, resolución | página larga multi-región; CTA persistente en header | una columna; CTA primario visible sin scroll en el hero | widgets públicos |
| Scheduler nativo | Agendar | **dialog** sobre la página | **pantalla completa** | `<efeonce-meeting-scheduler>` vía `open_meeting_scheduler` |
| Anclas internas | Orientación | desplazamiento a `#frentes`, `#accesibilidad`, `#como-empezar`, `#preguntas` | igual | enlaces de ancla |
| Landings hermanas | Enrutamiento honesto | navegación de página completa | igual | enlaces internos sin UTM |
| Contacto de recuperación | Salida cuando la surface no está promovida | enlace a `/contacto/` | igual | enlace |

## Flow Map

1. **Entry:** aterriza con UTM en la URL (fase B: `utm_source=direct-outreach`). La UTM se preserva hasta la conversión.
2. **Reconocimiento:** lee hero (región 1); decide seguir o salir.
3. **Rama de orientación:** *Mira los 7 frentes* → `#frentes`; o recorre linealmente.
4. **Rama de enrutamiento:** si en la región 10 se identifica con marca/campañas o sitio web → sale a `/agencia-creativa/` o `/desarrollo-sitios-web/`. **Es una salida exitosa, no una fuga.**
5. **Acción primaria:** *Agenda una reunión* (header, hero, región 6 contextual, región 12).
6. **Transition:** Growth CTA ejecuta `open_meeting_scheduler` con `meetingSurfaceId` + `schedulerKey` de esta surface → scheduler nativo.
7. **Decisión:** elige horario y confirma; o cierra y vuelve a la página.
8. **Completion:** receipt confirmado por servidor → confirmación nativa → evento de conversión.
9. **Recovery:** errores del scheduler se resuelven dentro del scheduler (calendario, navegación y **Reintentar**); un resultado ambiguo bloquea el reintento.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click *Agenda una reunión* | header / hero / región 12 | scheduler `opening` | Enter/Space sobre el CTA enfocado | `utm_content` = `header` / `hero` / `final` |
| Click *Empieza por accesibilidad* | región 6 | scheduler `opening` | Enter/Space | `utm_content=lane-accesibilidad`; mismo binding |
| Click *Mira los 7 frentes* | hero | ancla `#frentes` | Enter | desplazamiento instantáneo bajo reduced-motion |
| Click enlace de costura | región 5 | `/desarrollo-sitios-web/` | Enter | enlace interno sin UTM |
| Click salida de región 10 | región 10 | `/agencia-creativa/` o `/desarrollo-sitios-web/` | Enter | salida exitosa |
| Escape | scheduler abierto | scheduler `closed` | Escape | foco vuelve al CTA disparador |
| Click fuera del dialog | scheduler desktop | `closed` | — | nunca sobre el contenido del scheduler |
| Toggle de pregunta | región 11 | panel abierto/cerrado | Enter/Space | estado expuesto por el control nativo |
| CTA con surface no promovida | cualquier CTA primario | `/contacto/` | Enter | fases A y B antes de binding |

## State Machine

Los estados del scheduler los define Growth Meetings; esta tabla fija lo que la landing debe respetar. Nombres internos exactos `[verificar contra GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md]`.

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | scheduler no montado; default | carga / cierre | click en un CTA | CTA visible; foco normal |
| opening | Growth CTA monta el scheduler | click CTA | configuración cargada / error | el CTA muestra estado pendiente; sin doble activación |
| loading | configuración y disponibilidad | opening | grilla lista / error | estructura del calendario visible; sin iframe |
| open | grilla mensual interactiva | loading completo | selección / cierre | foco dentro del dialog; body sin scroll; `aria-modal` |
| submitting | booking en curso por command idempotente | confirmación del usuario | receipt / ambiguo / error | controles bloqueados; sin reenvío |
| confirmed | receipt confirmado por servidor | receipt | cierre | confirmación nativa; **sólo aquí se emite la conversión** |
| ambiguous | el resultado no se pudo confirmar | respuesta incierta | resolución por servidor | **bloquea reintento**; mensaje explícito |
| error | fallo de configuración/disponibilidad/booking | fallo | Reintentar / cierre | conserva calendario y navegación; **Reintentar** |
| not-promoted | surface sin binding activo | carga en fases A/B | promoción en fase C | el CTA es enlace a `/contacto/` |

## Publication Phases

La navegación y la indexación dependen del estado del business model (ver Publication Gate del wireframe).

| Fase | Business model | Cómo se llega | Robots / sitemap | Menú y enlaces | Scheduler |
|---|---|---|---|---|---|
| A | `Proposed` | preview privada | no pública | ninguno | `not-promoted` |
| B | `Approved for validation` | **envío 1:1** (se envía, no se encuentra) | `noindex, follow`; fuera del sitemap | fuera del menú; landings hermanas **no** enlazan aquí | `not-promoted` hasta binding; luego promovido con aprobación |
| C | `Commercially approved` | orgánico, AEO, referido | `index, follow`; en sitemap | menú *Servicios* + enlaces desde `TASK-1345`/`TASK-1350` | promovido |

**Regla:** en fase B la página sí enlaza **hacia** las hermanas (región 10), pero las hermanas no enlazan **hacia** ella. Un enlace entrante desde una página indexada la haría descubrible antes de tiempo.

## Routing Contract

- Route changes: `none` — el scheduler es dialog/pantalla completa sobre la misma URL; las anclas usan `hash`.
- Canonical URL: la propia de la página; el scheduler no la altera.
- Deep-link behavior: `#frentes`, `#accesibilidad`, `#como-empezar`, `#preguntas` desplazan a su región con el encabezado visible bajo el header persistente. Apertura directa del scheduler por parámetro `[verificar si Growth CTA lo soporta; opcional]`.
- Back button behavior: con el dialog abierto, *atrás* cierra el dialog sin abandonar la página `[verificar comportamiento del scheduler nativo]`; con el dialog cerrado, vuelve a la referencia.
- Reload behavior: recarga en `closed`; la UTM se relee de la URL.
- Shareability: la URL de la página es compartible con o sin UTM; el estado del scheduler no se comparte. En fase B, compartir la URL no la vuelve descubrible por buscadores.
- Internal links: **nunca con UTM** — rompen la atribución de la sesión.

## Focus & Accessibility

- Initial focus: al abrir el scheduler, el foco entra al primer control del dialog (o a su contenedor con nombre accesible).
- Escape behavior: cierra el scheduler.
- Click-away behavior: cierra el dialog en desktop; en pantalla completa móvil sólo el control de cierre.
- Focus restore: el foco vuelve exactamente al CTA que abrió el scheduler.
- Modal vs non-modal semantics: modal (`role="dialog"`, `aria-modal="true"`, fondo inerte, body sin scroll).
- Screen reader announcement: el scheduler nativo anuncia su título al abrir; la landing no duplica anuncios.
- Keyboard traversal: el recorrido completo de la página y del scheduler es operable sólo con teclado.
- Anchor focus: al activar una ancla, el foco se mueve al encabezado destino (con `tabindex="-1"` si no es enfocable) y el encabezado no queda tapado por el header (WCAG 2.4.11).
- Reduced motion: apertura del dialog y desplazamientos de ancla sin animación.

## Data & Command Boundaries

- Readers: ninguno de Greenhouse para el contenido de la página (curado y estático).
- Commands: booking por el command gobernado de Growth Meetings (idempotente, server-side). La landing no contiene lógica de negocio.
- API routes: las del contrato browser-safe de Growth CTA (render/events) y Growth Meetings (config/availability/booking); ninguna ruta nueva.
- Optimistic updates: prohibidas; la confirmación sólo existe tras receipt de servidor.
- Cache / invalidation: página cacheada por Kinsta; purgar al publicar o editar.
- Audit / signals: `greenhouse_cta_*` (navegador) + `gh_meeting_*`; conversión = receipt confirmado; sin PII en eventos del navegador.
- Tenant / access boundary: público; no toca aislamiento multi-tenant del portal.
- Provider boundary: **HubSpot nunca se llama desde WordPress ni desde el navegador**; no hay iframe, enlace ni fallback al proveedor.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| surface no promovida | el CTA abre `/contacto/` | escribir por contacto | declarado, no oculto |
| error de configuración o disponibilidad | el scheduler conserva estructura y ofrece **Reintentar** | reintento | nunca iframe ni enlace a HubSpot |
| mes sin horarios | calendario visible, navegación a otros meses | cambiar de mes | no se muestra vacío sin salida |
| resultado ambiguo | mensaje explícito; reintento bloqueado | resolución por servidor | evita doble reserva |
| falla la zona visual o el esquema | el texto sigue completo | ninguna acción | degradación sin pérdida de significado |
| JavaScript deshabilitado | la página se lee entera; los CTA funcionan como enlaces | `/contacto/` | verificado en la evidencia |
| cifra de WebAIM vencida por nueva edición | — | actualizar o retirar la región 6 | revisión editorial por as-of |

## Future Integration Point — Calculadora de Capacidad

La Calculadora de Capacidad de Diseño (wedge declarado en el business model §11b) **no es parte de esta task** y no se reserva espacio vacío para ella. Cuando exista, entra como **CTA secundario** en la región 3 (el reencuadre es su lugar natural: produce el número que la pregunta insinúa) y como destino alternativo en la región 12. Su integración requerirá actualizar este flow.

## GVC Scenario Plan

- Scenario: recorrido de conversión y accesibilidad de la landing pública (GVC del portal no aplica).
- Scenario file: Playwright live + axe-core + WAVE sobre preview (fase A) o URL `noindex` (fase B).
- Route: URL de la página.
- Viewports: 1440, 1280, 390.
- Required steps: cargar con UTM → recorrido completo sólo con teclado → abrir scheduler desde el hero → Escape → verificar foco restaurado → abrir desde región 6 → cerrar → ancla `#accesibilidad` → verificar encabezado no tapado → salida a `/desarrollo-sitios-web/` desde región 10 → verificar que el enlace no lleva UTM → reduced-motion → JavaScript deshabilitado.
- Required captures: scheduler abierto (1440 y 390), foco restaurado, encabezado de ancla visible bajo el header, estado `not-promoted`, reduced-motion 390, página sin JavaScript.
- Required `data-capture` markers: los del wireframe.
- Assertions: foco restaurado al CTA disparador; UTM preservada hasta el scheduler; enlaces internos sin UTM; meta robots según fase; ninguna llamada de red a dominios de HubSpot desde la página; `errors=[]`; sin overflow horizontal.
- Scroll-width checks: sí (1440 y 390).
- Accessibility/focus checks: `aria-modal`, Escape, restauración de foco, foco no oculto, recorrido por teclado.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce`.

## Design Decision Log

- **Decision:** conversión por `open_meeting_scheduler` como nodo host de EPIC-023; publicación por fases con **fase B "se envía, no se encuentra"**; región 10 como enrutamiento honesto hacia landings hermanas.
- **Alternatives considered:**
  - *Formulario de contacto como primario* — más fricción y no coherente con "Agenda una reunión".
  - *Iframe o enlace de HubSpot Meetings* — rechazado por el contrato native-only de Growth Meetings.
  - *Indexar desde el primer día* — rechazado: claim público de una oferta `Proposed`.
  - *Que las hermanas enlacen hacia aquí en fase B* — rechazado: la volvería descubrible antes de tiempo.
- **Why this pattern:** motion sales-led con indecisión como competidor principal; un solo paso siguiente; y una salida honesta que evita reuniones equivocadas, que cuestan más que una fuga.
- **Reuse / extend / new primitive:** reutiliza Growth CTA y Growth Meetings sin fork; extiende el master flow de EPIC-023 con un nodo host.
- **Open risks:** binding de la surface no creado; comportamiento del botón *atrás* con el dialog por verificar; la página puede quedar en fase A indefinidamente si G1 no avanza.

## Acceptance Checklist

- [x] La task dueña declara este archivo en `Flow`.
- [x] Cada surface tiene comportamiento desktop y compacto.
- [x] Apertura, cierre, Escape y restauración de foco están especificados.
- [x] Ruta, deep links, botón atrás y recarga son explícitos.
- [x] La landing declara sus nodos de programa (EPIC-023 y EPIC-019).
- [x] Readers y commands nombrados; sin lógica de negocio en la UI.
- [x] Los caminos de falla son seguros y no exponen internos ni al proveedor.
- [x] Las fases de publicación están atadas al estado del business model.
- [x] La secuencia de verificación prueba el flujo y declara por qué GVC del portal no aplica.
- [x] El design decision log explica superficies, rutas y fases.
