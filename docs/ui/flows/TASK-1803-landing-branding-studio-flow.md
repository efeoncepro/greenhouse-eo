# TASK-1803 — Landing Branding Studio — Flow Contract

## Meta

- Status: `draft; route and conversion bindings pending`
- Owner task: `TASK-1803 — Landing Branding Studio: la marca como sistema de decisión`
- Related wireframe: `docs/ui/wireframes/TASK-1803-landing-branding-studio.md`
- Intended route / surface: nueva landing pública Efeonce; slug provisional `/branding/`.
- Flow type: `cross-route` con interacción `single-surface` y conversion host gobernado.
- Primary primitives: enlaces semánticos, anclas, selector accesible, FAQ, Growth Forms/Meetings existente.
- Copy source: Efeonce institucional + controles Elementor; microcopy de form/scheduler permanece en su runtime canónico.

## Flow Brief

- Primary user: buyer empresarial que reconoce un problema de marca, pero puede confundir definición, activación y producción.
- Entry moment: búsqueda orgánica/AEO, Home, referencia comercial, caso, Agencia Creativa o Producción Creativa.
- Successful outcome: identifica la naturaleza del problema, llega al servicio adecuado y entrega contexto o agenda sin promesas falsas.
- Primary decision/action: `necesito definir/redefinir el sistema de marca` y solicita el siguiente paso de Branding Studio.
- Secondary outcomes: se enruta correctamente a Agencia Creativa o Producción Creativa; aprende el método aunque no convierta.
- Non-goals: quiz puntuado, recomendación automática definitiva, cotización instantánea, lead gate antes de entregar valor, cambio de estado empresarial desde WordPress.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Branding landing | Contexto, diagnóstico educativo y prueba | narrativa completa con selector y anclas | flujo vertical completo | Elementor modules |
| Symptom selector | Reconoce situación y orienta lectura | lista + panel contextual | accordion/lista; sin overflow horizontal | tabs/radio/accordion según semantic audit |
| Creative Services navigator | Distingue Define/Activa/Escala | tres rutas comparables | tres bloques apilados con estado actual | semantic links |
| Conversion host | Recibe contexto o abre agenda | inline o dialog canónico según binding | inline o full-screen canónico | Growth Forms/Meetings |
| Agencia Creativa | Destino cuando falta idea/campaña | navegación normal | navegación normal | anchor/link |
| Producción Creativa | Destino cuando falta capacidad/escala | navegación normal | navegación normal | anchor/link |

## Entry Contracts

| Entry | Supuesto del visitante | Primer contenido que debe confirmarlo | Next best action |
|---|---|---|---|
| Search `agencia branding/rebranding` | busca proveedor/solución | hero + síntomas + definición answer-first | R2/R3 o CTA |
| Home `Branding y estrategia` | conoce Efeonce, explora capacidad | hero + relación con masterbrand | R3/R6 |
| Agencia Creativa | el brief no tiene posición/mensaje | entry anchor opcional a R2/R3 | confirmar problema upstream |
| Producción Creativa | el retrabajo viene de reglas ambiguas | entry anchor opcional a R2/R11 | evaluar sistema/governance |
| Referral/direct | conoce un proyecto o caso | hero + caso verificable | R9/CTA |

Los deep links internos pueden usar hashes estables si el runtime los preserva. No usar query params sólo para animar
una entrada ni mantener un estado que no necesita compartirse.

## Primary Flow Map — Define

1. **Entry:** hero confirma cambio empresarial y presenta el mecanismo sin hacer que el usuario espere motion.
2. **Recognition:** visitante revisa o selecciona un síntoma en R2.
3. **Interpretation:** panel explica la clase de problema y apunta a R3/R4; no emite score.
4. **Understanding:** R3 muestra decisión, expresión y operación; R4 ubica madurez.
5. **Fit:** R5/R6 conecta la situación con Diagnostic, Strategy Sprint, System/Activation o Governance.
6. **Trust:** R7/R9/R10/R11 prueban artefactos, casos, identidad semántica y adopción.
7. **Decision:** R13 permite confirmar `Define` o cambiar a `Activa/Escala`.
8. **Conversion:** CTA abre/navega al host aprobado; el usuario entrega contexto o agenda.
9. **Completion:** sólo un receipt server-confirmed muestra éxito y siguiente paso.
10. **Recovery/exit:** error conserva datos; agenda no disponible ofrece canal canónico; Back devuelve al CTA/contexto.

## Lateral Flow — Activate

1. Visitante declara o reconoce: `La marca está definida; necesitamos una idea/campaña`.
2. El módulo muestra qué inputs debería tener listos: posicionamiento, audiencia, message system y límites.
3. Link semántico abre Agencia Creativa; no dispara modal ni conversión de Branding.
4. UTM/referrer/evento allowlisted conserva `source_practice=branding` sin exponer taxonomía interna visible.
5. Si vuelve con Back, recupera scroll/foco en la ruta `Activa`.

## Lateral Flow — Scale

1. Visitante declara o reconoce: `Tenemos sistema e idea; necesitamos producir/versionar`.
2. El módulo muestra inputs: brief aprobado, assets, formatos, mercados, rights y governance.
3. Link semántico abre Producción Creativa.
4. Back restaura scroll/foco en la ruta `Escala`.

## Reverse-routing contract for sibling pages

| Origin | Trigger copy | Destination | Required context |
|---|---|---|---|
| Agencia Creativa | `Todavía no existe una posición, arquitectura o voz compartida` | Branding R2/R3 | `from=agency` sólo si tracking governance lo aprueba |
| Producción Creativa | `Cada pieza vuelve a discutir las reglas de marca` | Branding R2/R11 | no prometer que branding eliminará todo retrabajo |
| Branding | `La marca ya está definida; falta una idea movilizadora` | Agencia | link visible/contextual |
| Branding | `La idea ya está aprobada; falta capacidad para desplegarla` | Producción | link visible/contextual |

La modificación efectiva de las landing hermanas se coordina con TASK-1350 y sus owners; no se sobreescribe su
dirección visual ni se cambia su canonical sin aprobación.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| `Identifica tu desafío` | hero | R2 | link/Enter | ancla con focus contextual sin robar foco al hacer scroll |
| Select symptom | R2 | contextual explanation | arrows o tab+Enter según primitive | todos los síntomas existen sin JS |
| Select maturity level | R4 | detail/offer hint | pattern semántico elegido | no score, no auto-scroll agresivo |
| Open artifact | R7 | detail inline | Enter/Space | no hover-only content |
| Choose Define | R13 | current-page CTA/context | Enter | estado actual explícito |
| Choose Activate | R13 | Agencia Creativa | Enter | link, no button |
| Choose Scale | R13 | Producción Creativa | Enter | link, no button |
| Open FAQ | R14 | answer | Enter/Space | native disclosure preferred |
| Primary CTA | R1/R15 | form/scheduler | Enter | destino único aunque label varíe sólo con razón documentada |
| Submit | host | pending/success/error | Enter | response real; idempotency del host |
| Escape | dialog host if used | closed | Escape | focus restore exacto |

## State Machine — Page

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| `initial` | contenido SSR/natural | page load | enhancement | H1, body, links y CTA visibles |
| `enhanced` | JS disponible | runtime ready | interaction | no cambio semántico ni reflow severo |
| `symptom_selected` | orientación local | selection | new selection/continue | aria state y texto sincronizados |
| `maturity_selected` | detalle local | selection | new selection | sin score/lead capture |
| `route_define` | Branding confirmado | R13 | CTA/other route | current label + CTA |
| `route_activate` | Agencia recomendada | R13 | navigate/back | preview del destino + link |
| `route_scale` | Producción recomendada | R13 | navigate/back | preview del destino + link |
| `degraded` | enhancement/media falla | error/timeout | retry/reload | HTML y rutas siguen utilizables |

## State Machine — Conversion

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| `closed` | host no visible | page/close | CTA | CTA conserva destino y label |
| `opening` | transición local | CTA | open | no doble activación |
| `open` | intake disponible | host ready | submit/close | heading/labels/focus correctos |
| `invalid` | faltan datos o formato | submit/blur governed | correction | inline errors + summary si aplica |
| `pending` | request real en curso | valid submit | success/error | preservar respuestas; disable duplicate submit |
| `error` | request falló | server/network result | retry/edit | causa útil sin raw error; datos preservados |
| `unavailable` | scheduler/config no disponible | host state | alternate path | fallback canónico, no HubSpot directo improvisado |
| `complete` | receipt confirmado | server-confirmed result | destination/close | siguiente paso y tiempo sólo si están gobernados |

## Routing Contract

- Route changes: `path` hacia páginas hermanas; `hash` opcional para R2/R11/R13; modal state no entra a URL salvo contrato del host.
- Canonical URL: provisional `https://efeoncepro.com/branding/`; decidir con research SEO y ownership matrix.
- Deep-link behavior: carga HTML completo y posiciona sección sin ocultarla bajo Ohio header.
- Back button behavior: vuelve a origen y restaura scroll/foco cuando el navegador lo soporta; no interceptarlo con router custom.
- Reload behavior: conserva página funcional; selecciones locales pueden volver a default sin pérdida de datos porque no son decisiones guardadas.
- Shareability: canonical principal + hashes estables sólo si agregan valor; no compartir estado transitorio del form.

## Focus & Accessibility

- Initial focus: navegador normal; no auto-focus al cargar.
- Escape behavior: sólo cierra dialog/modal real; no usa Escape para salir de scroll/sticky.
- Click-away behavior: definido por host; nunca cierra con pérdida silenciosa de respuestas.
- Focus restore: CTA exacta que abrió el host; Back a sibling vuelve al link cuando sea factible.
- Modal vs non-modal semantics: preferir inline; si Meetings exige dialog, usar primitive canónica con trap y label.
- Screen reader announcement: selección local describe nuevo panel; pending/success/error usa status/alert según severidad.
- Keyboard traversal: chrome → hero → síntomas → contenido → rutas → FAQ → form en orden DOM.
- Reduced motion: anclas y route changes inmediatos/crossfade; ningún travel largo ni smooth-scroll obligatorio.

## Data & Command Boundaries

- Readers: contenido público WordPress; config pública allowlisted del host si aplica.
- Commands: Growth Form submit o Meetings booking existente, nunca un command nuevo dentro de Elementor.
- API routes: las del host canónico; confirmar en Discovery y registrar sin copiar secretos/headers.
- Optimistic updates: prohibidas para success de lead/booking.
- Cache / invalidation: WordPress/Kinsta para contenido; host conserva su política.
- Audit / signals: receipt/failure del command canónico; GA4 sólo mide intención/estado confirmado, no inventa conversiones.
- Tenant / access boundary: página pública; payload allowlisted; HubSpot/Outlook/Teams server-side.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| JS absent | página completa estática | links/anclas/forms nativos | no contenido oculto |
| enhancement error | selector queda como lista | continuar scroll | consola capturada en QA |
| sibling route unavailable | link no se publica o muestra destino vigente | Home/contacto | verificar antes de cutover |
| no authorized cases | omitir módulo o usar método/artefactos honestos | seguir a governance/offers | no placeholders públicos |
| partial evidence | declarar alcance real | abrir caso completo | no completar con IA |
| form invalid | errores junto a campo + summary proporcional | corregir | sin validación prematura |
| timeout/API error | mensaje estable, datos preservados | retry o canal canónico | no raw errors |
| scheduler unavailable | explicar indisponibilidad | enviar contexto | no fallback externo no gobernado |
| duplicate submit | un receipt/idempotent result | no segunda creación | responsabilidad del host |

## GVC Scenario Plan

- Scenario: `TASK-1803-public-branding-flow` a crear.
- Scenario file: path confirmado al implementar según tooling público vigente.
- Route: draft `noindex`, luego canonical aprobada.
- Viewports: 1440, 1280, 390.
- Required steps: cada entry relevante; seleccionar primer/medio/último síntoma; madurez; rutas Define/Activa/Escala; Back; FAQ; conversion default/invalid/pending/error/success; unavailable; reduced motion; JS-off.
- Required captures: estados anteriores, focus visible y scroll restoration.
- Required `data-capture` markers: `symptoms`, `maturity`, `ecosystem`, `routing`, `conversion`.
- Assertions: URL/destino correctos, aria state sincronizado, no nested links, no fake success, no lead real en smoke no autorizado.
- Scroll-width checks: cada estado en desktop/mobile.
- Accessibility/focus checks: teclado completo, focus restore, status/alert, heading/modal name.
- Reduced-motion evidence: same meaning, no smooth travel/pinning/stagger.

## Design Decision Log

- Decision: flow de autoselección transparente con tres rutas; no funnel forzado que capture todo como branding.
- Alternatives considered: CTA único a reunión; quiz con score; tres landings aisladas; wizard obligatorio.
- Why this pattern: reduce leads mal calificados, hace visible la arquitectura comercial y permite entradas/reingresos no lineales.
- Reuse / extend / new primitive: reuse links/host; extend selector público sólo si semantic audit lo justifica; no nuevo router.
- Open risks: destinos/canonicals actuales; CTA paid/free; form vs scheduler; evento de atribución cross-page.
- Follow-up: cerrar decisión comercial antes de convertir el flow a `ready-for-implementation`.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named as existing boundaries; UI-only business logic is prohibited.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains the three-route model.
