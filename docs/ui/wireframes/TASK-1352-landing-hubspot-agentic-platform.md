# TASK-1352 — Wireframe: landing HubSpot Sistema vivo de crecimiento

## Meta

- Status: `draft; research and first-fold acceptance required`.
- Owner task: `TASK-1352`.
- Product Design asset: [`TASK-1352-hubspot-immersive-pillar-direction.md`](../visual-directions/TASK-1352-hubspot-immersive-pillar-direction.md).
- Visual direction mode: `repo-native-benchmark`.
- Intended consumers: WordPress/Ohio public surface, GVC, copy, SEO/AEO, CRO and implementation agents.
- Copy source: copy deck created in TASK-1352 Slice 2; no inherited landing copy.
- Primitive decision: `extend` local sobre bloques públicos + `<greenhouse-form>` y Meetings gobernados.
- UI ready target: `no` hasta research, claims/assets, copy deck y `ACCEPT FIRST FOLD`.
- Canonical route: `/servicios/hubspot/`; legacy route redirects once.

## Brief

- Primary user: buying group mid-market/enterprise que evalúa plataforma, implementación, migración u operación
  HubSpot.
- User moment: reconoce fragmentación o una oportunidad de IA, pero aún necesita probar fit, alcance y riesgo.
- Job to be done: identificar la familia de resultado relevante, comprender cómo se conecta con el sistema completo
  y decidir si solicitar una evaluación inicial.
- Primary decision signal: “esta oferta comprende mi resultado y explica un siguiente paso proporcionado”.
- Primary conversion: solicitud aceptada de evaluación inicial sin costo.
- Secondary action: Meetings, siempre subordinado.
- Non-goals: catálogo, price list, grader autónomo, universo de agentes, dashboard ficticio, clon de HubSpot o
  refinamiento del diseño rechazado.

## Dependencias de contenido antes de maquetar

| Artefacto | Debe resolver | Gate |
|---|---|---|
| VoC/CRO dossier | pains, desired outcomes, triggers, objections, alternatives, literal language | required before copy |
| SEO/AEO dossier | intents, SERP, fan-out, clusters, passages, entity/schema | required before heading lock |
| Claim/proof ledger | source, date, authorization, volatility, placement | required before proof UI |
| Asset/token ledger | official asset, value, role, contrast, review date | required before visual polish |
| Copy deck | awareness, sophistication, big idea, framework, H1 bank, R0–R11 copy | required before first fold |

`COPY_SLOT` significa función pendiente de copywriting, no permiso para que el implementador invente texto.

## Desktop Target — 1440×1100

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ R0 HEADER PÚBLICO EFEONCE                                                  │
├───────────────────────────────────┬────────────────────────────────────────┤
│ R1 HERO / DECISIÓN               │ SYSTEM STAGE                           │
│ COPY_SLOT eyebrow factual        │ seis trayectorias, un sistema          │
│ COPY_SLOT H1 ganador             │ señal activa sin UI falsa              │
│ COPY_SLOT subhead                │ labels visibles y HTML fuera del SVG   │
│ [CTA evaluación]  Meetings       │                                        │
│ proof inmediata validada         │                                        │
├───────────────────────────────────┴────────────────────────────────────────┤
│ inicio visible del atlas / continuidad de scroll                           │
└────────────────────────────────────────────────────────────────────────────┘
```

- First fold contiene un único stage dominante; no más de tres superficies contained.
- La acción y explicación aparecen antes de que el arte termine de componerse.
- El atlas asoma para conectar hero con exploración, sin convertir el hero en diagrama denso.
- El header no recibe takeover ni lockup conjunto inventado.

## Mobile Target — 390×844

```text
R0 header compacto existente
R1 eyebrow
H1
subhead
[CTA evaluación]
Meetings
proof factual
visual compacta del sistema
inicio de estación 01
```

- El arte nunca desplaza CTA/proof fuera del primer viewport sólo por dramatismo.
- Layout de una columna; el orden visual coincide con DOM y lector de pantalla.
- No sticky CTA permanente, carrusel, canvas horizontal ni texto sobre trayectorias ilegibles.
- `scrollWidth === clientWidth`; targets ≥44 px; inputs ≥16 px; foco no queda bajo header.

## Action Hierarchy

- Primary: `COPY_SLOT assessment_cta` → `#evaluacion`.
- Secondary: `COPY_SLOT meetings_cta` → Meetings con contexto permitido.
- Contextual selection: familia o sector; cambia énfasis, no ejecuta negocio.
- Editorial: cluster publicado y verificable.
- Destructive: none.
- Pending/disabled: sólo submit; mantiene label, estado y prevención de doble envío.

## Layout Skeleton

| Región | Slot | Propósito | Patrón candidato | Fuente |
|---|---|---|---|---|
| R0 | Header | identidad y navegación | Ohio header existente | WordPress |
| R1 | Hero | categoría, thesis, CTA, proof | editorial split + system stage | copy/claim/asset ledgers |
| R2 | Tensión | reconocer situación actual | open editorial contrast | VoC/CRO dossier |
| R3 | Atlas | explorar seis outcomes | connected rail + editorial panel | offer V2 |
| R4 | Sectores | aplicar una lente | segmented buttons/list + adjacent content | sector docs + VoC |
| R5 | Fit/no-fit | criterio y límites | quiet editorial band | eligibility + sources |
| R6 | Oferta | gratis vs blueprint | comparison threshold | offer V2 |
| R7 | Delivery | entender intervención | operating sequence | service architecture |
| R8 | Elegibilidad | producto/IA sin promesa absoluta | requirements matrix/editorial list | verified product sources |
| R9 | Proof | verificar relación y resultados | evidence ledger | claim ledger |
| R10 | Clusters/FAQ | profundizar y responder fan-out | editorial links + native details | SEO/AEO dossier |
| R11 | Conversion | enviar evaluación | conversion chamber + governed form | Growth Forms/Meetings |

## Regiones detalladas

### R0 — Header público

- Reusar header/footer vigentes; no alterar navegación global salvo actualizar la URL canónica.
- Breadcrumb `Servicios / HubSpot` sólo si el patrón público existente lo permite sin ruido.
- Efeonce conserva ownership; HubSpot no reemplaza el logo maestro.

### R1 — Hero y sistema vivo

Orden obligatorio:

1. eyebrow factual de categoría/relación, condicionado por ledger;
2. H1 ganador del banco de 10–25 variantes;
3. subhead con mecanismo y límite, una idea principal;
4. CTA primaria y Meetings subordinado;
5. proof inmediata de máximo tres señales;
6. system stage con las seis trayectorias visibles.

No se aprueba el first fold si el H1 podría pertenecer a cualquier partner, si la visual domina la acción, si el
proof es un logo wall o si la categoría sólo se entiende leyendo módulos posteriores.

### R2 — Tensión derivada de VoC

- Entre dos y cuatro tensiones, sólo después de encontrar recurrencia en VoC.
- Patrón: lenguaje literal/observado → consecuencia operacional → transición a sistema conectado.
- No usar fear marketing, cifras sin base, icon cards ni problemas inventados para llenar columnas.
- Cada tensión se vincula a una o más familias sin mostrar el nombre del Hub como respuesta automática.

### R3 — Atlas de seis outcomes

| # | Familia canónica | Pregunta del comprador que debe resolver | Capabilities subordinadas posibles |
|---|---|---|---|
| 01 | Marketing, Content & AEO | ¿Cómo crear demanda, contenido y visibilidad que llegue a revenue? | Marketing Hub, Content Hub, AEO, AI marketing |
| 02 | Sales & AI Pipeline | ¿Cómo priorizar, vender y mantener consistencia en el pipeline? | Sales Hub, prospecting/workspace, AI sales |
| 03 | Revenue Lifecycle | ¿Cómo pasar de oportunidad a contrato, cobro y expansión con continuidad? | Revenue Hub, Contracts, quotes/CPQ eligible |
| 04 | Service, Customer Success & Delivery | ¿Cómo atender, adoptar, retener y entregar sin handoffs ciegos? | Service Hub, Customer Success, Customer Agent case, Projects, Services |
| 05 | Data, Integration & CRM Intelligence | ¿Cómo unificar datos, modelo e integraciones con gobierno? | Smart CRM, Data Hub, objects, sync, intelligence |
| 06 | Agent Hub & Agentic Operations | ¿Cómo diseñar, habilitar y gobernar agentes sobre datos confiables? | Agent Hub/Builder, eligible agents, integrations |

Cada panel contiene:

- outcome en lenguaje comprador;
- señales de fit y no-fit;
- preguntas de discovery;
- intervención Efeonce y modo de entrega;
- mecanismos HubSpot elegibles, nunca garantía;
- proof/límite asociado;
- CTA contextual que conduce a la misma evaluación.

Desktop enfatiza una familia sin ocultar las demás. Mobile/no-JS presenta las seis completas en secuencia o
`details` semánticos. No existe un R8 “Agentes” que compita con el atlas: agentes viven en familia 06 y capacidades
IA de dominio permanecen en su familia respectiva.

### R4 — Lentes sectoriales

Orden canónico:

1. Servicios profesionales y B2B.
2. SaaS y tecnología.
3. Manufactura y distribución.

Cada lente sólo puede cambiar:

- JTBD y vocabulario observado;
- señales de fricción/fit;
- ejemplos autorizados;
- preguntas de evaluación;
- orden de énfasis de familias.

No cambia claims estructurales, precio, eligibility ni la conversión. Estado inicial: `Todos los sectores`. Sin
prueba/owner, la lente se mantiene general y no genera una URL propia.

### R5 — Fit y no-fit

- Quiet zone sin reveal ornamental.
- Responde una pregunta real: “¿Cuándo HubSpot no es la mejor decisión?”.
- Cada límite usa `condición → impacto → qué verificar → alternativa/siguiente paso`.
- No hardcodear límites volátiles. Cluster `cuando-no-usar` sólo si está live.
- No-fit informado es un resultado válido y no activa captura forzada.

### R6 — Evaluación gratuita y blueprint pagado

| Dimensión | Evaluación inicial sin costo | Blueprint pagado |
|---|---|---|
| Propósito | fit, contexto, orientación y cotización | investigación y decisión estructurada |
| Input | conversación e información inicial | acceso/entrevistas/datos según alcance |
| Output | siguiente paso y propuesta si aplica | artefacto autónomo reutilizable |
| Compromiso | no obliga a implementar | puede contratarse separado |
| No promete | score, auditoría o informe automático | resultado de implementación |

La tabla se valida con copy y oferta. Debajo: `qué necesitamos`, `qué ocurre después`, privacidad y tiempo sólo si
está confirmado. No usar waiver/descuento como promesa universal.

### R7 — Delivery

Secuencia estable, adaptada por alcance:

1. intake y baseline;
2. blueprint/arquitectura cuando corresponde;
3. implementación o migración;
4. adopción/enablement y lanzamiento;
5. operación gestionada;
6. medición, optimización y governance.

Cada etapa muestra outcome, aceptación, owner y modalidad (`advisory`, `project`, `implementation`, `managed
operation`, `continuous optimization`). “Services” producto y “servicios Efeonce” se distinguen por contexto.

### R8 — Elegibilidad y límites de capabilities

- Matriz o lista editorial transversal, no showcase de agentes.
- Gates: release, portal/tier, seats, créditos, región/idioma, permisos, data readiness, integración y readback.
- Distingue `sellable/evidence`, `discovery-qualified` y `pilot-first` cuando la oferta V2 lo exija.
- Todo elemento volátil tiene fecha de verificación; no se presenta roster fijo.

### R9 — Proof ledger visible

- No exponer el ledger interno completo; traducirlo a evidencia comprensible con fuente/alcance/fecha cuando aplique.
- Tipos: relación/partner, certificaciones reales, Marketplace, caso autorizado, método, seguridad factual.
- Prueba se ubica junto al claim sostenido y puede repetirse como referencia, no como slogan.
- Sin autorización o vigencia: anonimizar si está permitido o remover. Layout tolera ausencia sin huecos.

### R10 — Clusters y FAQ AEO

- Clusters sólo si responden 200, tienen canonical propio, son indexables y contienen valor mínimo.
- Links descriptivos: precios, cuándo no usar, agentes y HubSpot vs Salesforce según rutas confirmadas.
- FAQ nace de SERP, fan-out, sales questions y VoC; no de una lista genérica.
- Cada `h2/h3` formula pregunta literal o afirmación clara; respuesta inicial autocontenida y visible.
- `details/summary` nativo; contenido disponible en HTML servido.

### R11 — Conversion chamber

- Ancla `#evaluacion`; heading + expectativa + frontera + privacidad antes del primer campo.
- `<greenhouse-form>` gobernado, no form ad hoc.
- Hidden context sólo con allowlist: page/family/sector/UTM; nunca texto libre o PII en analytics.
- Success explica recepción y siguiente paso real; Meetings opcional, nunca autoabierto.
- Si el renderer no monta: fallback visible y factual.

## Content and Copy Ledger

| Copy id | Región | Función | Estado | Restricción |
|---|---|---|---|---|
| `hubspot.hero.eyebrow` | R1 | relación/categoría | research-dependent | factual, ledger-backed |
| `hubspot.hero.h1` | R1 | big idea + outcome | unresolved | elegir entre 10–25 variantes |
| `hubspot.hero.subhead` | R1 | mecanismo + límite | unresolved | una idea, sin feature list |
| `hubspot.cta.assessment` | R1/R3/R11 | primary action | function locked | verbo + valor, wording consistente |
| `hubspot.cta.meetings` | R1/R11 | secondary path | function locked | subordinada |
| `hubspot.tension.*` | R2 | relevancia | VoC-dependent | no fear/hype |
| `hubspot.family.<id>.*` | R3 | outcome/fit/mechanism | offer locked, wording open | exact family names |
| `hubspot.sector.<id>.*` | R4 | contextual lens | evidence-dependent | no vertical claim invented |
| `hubspot.fit.*` | R5 | qualify/disqualify | source-dependent | condition + impact + alternative |
| `hubspot.assessment.*` | R6/R11 | commercial boundary | concept locked | free ≠ autonomous diagnosis |
| `hubspot.delivery.*` | R7 | process | architecture-backed | distinguish product Services |
| `hubspot.eligibility.*` | R8 | constraints | volatile | verify at publish |
| `hubspot.proof.*` | R9 | credibility | ledger-dependent | source/date/authorization |
| `hubspot.faq.*` | R10 | retrieval/objection | SEO/VoC-dependent | answer-first |
| `hubspot.form.*` | R11 | expectation/recovery | renderer contract | no false SLA |

El copy deck final completa texto, dynamic values, source y approval. Este wireframe no aprueba frases provisionales.

## State Copy

| Estado | Título funcional | Body requirement | CTA/recovery |
|---|---|---|---|
| ready | evaluación disponible | qué recibirá y qué se solicita | CTA de evaluación |
| validating | revisar información | resumen + errores locales | corregir primer campo |
| submitting | enviando solicitud | no cerrar ni reenviar | disabled con estado |
| accepted | solicitud recibida | expectativa real, sin SLA inventado | Meetings opcional/volver |
| rejected | no pudimos aceptar | motivo seguro/no sensible | revisar o canal alternativo |
| rate-limited | demasiados intentos | cuándo reintentar si se conoce | canal alternativo |
| transport error | no se pudo enviar | datos preservados y causa genérica | reintentar/fallback |
| embed unavailable | formulario no disponible | alternativa y privacidad | Meetings/contacto |
| claim unavailable | evidencia retirada | eliminar bloque, no mostrar error | n/a |

El wording exacto se produce en el copy deck; causa, recuperación y semántica no son opcionales.

## Accessibility Contract

- Heading order: un `h1`; `h2` por región; `h3` por familia/pregunta subordinada.
- Atlas: control semántico elegido después de prototype; no inventar tabs si no cumple roving focus/ARIA.
- Aria labels: describen acción/estado, no color o icono.
- Focus: CTA in-page mueve foco al heading de R11; form error al resumen/primer campo; close restaura al trigger.
- Color-independent: número, label, icon/shape y ARIA acompañan cualquier señal cromática.
- No-JS: seis familias, sectores, FAQ y oferta siguen disponibles.
- Reduced motion: mismo orden, significado, CTA y estado final.
- Forms: labels explícitos, error association, summary cuando aplique, valores preservados y zoom móvil evitado.
- SVG/canvas: decorativo `aria-hidden`; todo texto crítico vive en HTML.

## Visual Fidelity Mapping

| Cue | Token/patrón | Intent preserved | Literal rejected |
|---|---|---|---|
| energía HubSpot | `--hsx-signal-primary` verified | reconocimiento/acción | HEX recordado |
| base Efeonce | public brand tokens | ownership/confianza | copiar background HubSpot |
| seis conexiones | atlas page-scoped | integración causal | network/particle visual |
| profundidad | 3 planos + surface roles | jerarquía | glass cards repetidas |
| editorial rhythm | open bands/quiet zones | decisión y lectura | bento/card soup |
| CTA | primary public button pattern | acción única | varios botones sólidos |
| mobile | vertical stations | relación/orden | desktop comprimido |

## Implementation Mapping

- Route/surface: WordPress page id registrado; cutover a `/servicios/hubspot/`.
- Primitives: Ohio public blocks, semantic HTML, `<greenhouse-form>`, Meetings link/embed existente.
- Variants/kinds: page-scoped atlas/lens patterns; no primitive global nueva.
- Component candidates: hero stage, outcome atlas, sector lens, fit band, offer threshold, delivery sequence,
  eligibility list, proof evidence, FAQ and conversion chamber.
- Copy source: approved TASK-1352 copy deck; reusable renderer strings remain canonical.
- Data reader/command: none new; reuse existing server-side form/Meetings contracts.
- API parity: UI is client; no CRM write in page JS.
- Access: public; consent/cookies/tracking contracts apply.
- Runtime consumers: WordPress renderer, search/answer crawlers, assistive technology and GVC.
- GVC markers: `hubspot-hero`, `hubspot-proof`, `hubspot-atlas`, `hubspot-sectors`, `hubspot-fit`,
  `hubspot-assessment`, `hubspot-delivery`, `hubspot-eligibility`, `hubspot-faq`, `hubspot-conversion`.

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot`.
- Scenario file: `docs/ui/gvc-scenarios/TASK-1352-hubspot-landing.yaml` if supported by current runner.
- Route: stable preview, then canonical live URL.
- Viewports: 1440×1100, 1024×900, 390×844.
- Quality profile: `premium`.
- Steps: cold load; first fold; atlas family 01/03/06; sector change/reset; fit; threshold; FAQ; form empty/error/
  accepted fixture; embed failure; keyboard; no-JS; reduced motion; legacy redirect.
- Captures: every marker plus first fold default/focus/reduced and form error/success.
- Assertions: exact six families/order; three sectors/order; one H1; one primary conversion; claim/asset ledger;
  canonical/schema/links; no hidden critical copy; no PII telemetry; no duplicate lead.
- Scroll-width: equality at all viewports after every interactive state.
- Accessibility: axe, heading tree, tab order, focus restore, errors, 44 px targets and contrast base/intermediate.
- Review dossier: `docs/ui/reviews/TASK-1352-hubspot-landing/`.
- Baseline: promote only after `ACCEPT FIRST FOLD`; rejected Claude output is never baseline.

## Design Decision Log

- Decision: one connected atlas of exact canonical outcome families; sector and eligibility are lenses/constraints.
- Alternatives: Hub catalog, pain→Hub map, agent showcase, dashboard, refinement of old design.
- Why: keeps buyer intention before product, makes platform breadth understandable and supports SEO/CRO without
  sacrificing immersive identity.
- Reuse/extend/new: extend locally; no platform primitive yet.
- Open risks: research may change hierarchy/copy; asset authorization; proof availability; exact form identity;
  cluster readiness; mobile density; performance.
- Follow-up: resolve risks in TASK-1352 Slice 1–4, not during final polish.

## Acceptance Checklist

- [ ] Reset prevents reuse of old composition/copy.
- [ ] All visible strings map to the copy deck/ledger; no fake final copy.
- [ ] Six families and three sectors exactly match offer V2.
- [ ] Customer Agent and Agent Hub do not dominate outside their proper family.
- [ ] Desktop and mobile are distinct compositions with identical semantic order.
- [ ] One primary conversion and factual free/paid boundary appear before the form.
- [ ] SEO/AEO headings/passages remain visible in served HTML.
- [ ] Claim/asset absence degrades cleanly.
- [ ] State, focus, error, no-JS and reduced-motion contracts are complete.
- [ ] Implementation mapping, GVC markers and decision log are executable.
- [ ] First fold earns human `ACCEPT` and premium score before full build.
