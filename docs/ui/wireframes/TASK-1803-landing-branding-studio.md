# TASK-1803 — Landing Branding Studio — Wireframe narrativo y de conversión

## Meta

- Status: `draft; detailed contract, copy and runtime decisions pending`
- Owner task: `TASK-1803 — Landing Branding Studio: la marca como sistema de decisión`
- Product Design asset: `docs/ui/visual-directions/TASK-1803-landing-branding-studio.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: visitante público, equipo comercial, diseño/copy, WordPress/Elementor, SEO/AEO, Growth.
- Copy source: voz institucional Efeonce; controles Elementor/WordPress page-scoped; no `src/lib/copy/*` para body editorial.
- Primitive decision: `extend` módulos públicos gobernados sólo tras discovery; set-piece relacional `one-off` si no existe primitive.
- UI ready target: `no` hasta cerrar VoC, claim/case ledger, slug, CTA, runtime mapping y GVC baseline.

## Brief

- Primary user: CEO/GM, CMO/Head of Marketing o Brand Manager de una empresa cuya operación evolucionó más rápido que su marca.
- User moment: percibe desalineación, complejidad de portafolio, inconsistencia o retrabajo y busca una intervención de branding empresarial.
- Job to be done: entender si el problema es de definición, activación o producción; reconocer qué intervención necesita y dar un siguiente paso calificado.
- Primary decision signal: `necesitamos redefinir el sistema de marca` frente a `la marca está definida; necesitamos activarla o producirla`.
- Non-goals: vender logo-only, publicar pricing no aprobado, presentar Branding Studio como empresa separada, reemplazar Agencia/Producción, simular un diagnóstico o inventar proof.

## Copywriting Contract

### Speaker, research and awareness

- Speaker: Efeonce institucional, nunca voz personal de Julio.
- Awareness: mezcla `problem-aware` y `solution-aware`; no educar desde cero ni asumir que el comprador ya distingue estrategia, identidad y governance.
- Voice-of-customer required: entrevistas/transcripciones comerciales, propuestas ganadas/perdidas, testimonios autorizados, briefs de rebranding y lenguaje de BP3/BP6.
- Sin VoC suficiente, todo copy de este documento conserva estado `hipótesis a validar`.
- Big idea / one thing: **una marca clara no sólo se reconoce; ayuda a decidir y puede operar a escala**.
- Enemigo: crecimiento/transformación de la empresa sin un sistema de marca equivalente; no “las agencias malas” ni “la falta de creatividad”.
- Mecanismo diferencial: `decisión + expresión + operación`, conectado a Agencia Creativa y Producción Creativa.

### Framework by page stage

| Stage | Framework | Trabajo del copy |
|---|---|---|
| Hero + síntomas | PAS sobrio | Reconocer tensión sin dramatización artificial |
| Tesis + madurez | QUEST/FAB | Educar sobre el mecanismo y traducir componentes a utilidad |
| Ofertas + artefactos | BAB/FAB | Contrastar estado actual/deseado y explicar el puente |
| Casos + gobierno | StoryBrand + prueba | Cliente como protagonista; Efeonce como guía/sistema |
| Conversión | 4 Ps sin urgencia falsa | Promesa, imagen concreta, proof y siguiente paso |

### Headline gate

- Generar 15–25 variantes antes de aprobar el H1.
- Evaluar Useful, Unique y Ultra-specific; Urgent sólo si existe un trigger real.
- El H1 nombra el cambio que vive el comprador, no la taxonomía `Branding Studio`.
- H1, SEO title, OG title y slug comparten tesis pero cumplen trabajos distintos.
- Rechazar: `Creamos marcas memorables`, `Impulsamos tu marca`, `Branding 360`, `Marcas con propósito`,
  `Transformamos negocios a través del diseño` y cualquier variante intercambiable con otra consultora.

### Claims and proof gate

- Cada claim se clasifica como `hecho verificado | inferencia | hipótesis | no autorizado`.
- Ninguna cifra, logo, caso, testimonio o “resultado” entra al wireframe final sin owner, fuente, periodo y permiso.
- No atribuir revenue completo a branding; declarar `controla | influye | monitorea` para métricas.
- No prometer optimización para ChatGPT; explicar claridad de entidad, consistencia y evidencia.

## Desktop Target — 1440×1000

La primera pantalla muestra, en este orden: masterbrand/servicio, tensión, promesa, mecanismo resumido, acción y
set-piece fragment-to-system. El H1 y la acción no esperan una animación. En el primer scroll aparece un índice
semántico `Define · Expresa · Opera`, seguido por síntomas reconocibles. El contenido alterna argumento y evidencia;
ninguna zona below-fold repite el patrón de tres cards sin una función comparativa.

## Mobile Target — 390×844

La primera pantalla prioriza H1, subhead y CTA; el set-piece se convierte en una secuencia estática compacta debajo.
Los síntomas son una lista/accordion semántico; la selección no es necesaria para acceder al contenido. El modelo de
tres sistemas, la madurez y las rutas Creative Services se apilan con labels persistentes. No hay sticky narrative,
pinning, carrusel obligatorio ni scroll horizontal. Las CTAs mantienen target táctil, foco y copy completo.

## Action Hierarchy

- Primary: `Cuéntanos qué cambió` o `Solicita un Brand Diagnostic`; wording final depende del packaging aprobado.
- Secondary: `Identifica tu desafío` — ancla al selector de situaciones, sin abrir modal.
- Contextual: `Necesito activar una marca definida` y `Necesito producir a escala` — enlaces a páginas hermanas.
- Destructive: ninguna.
- Selection vs action: síntomas/madurez cambian explicación local; no envían datos ni simulan score. Navegar y convertir son acciones explícitas separadas.
- Pending / disabled: sólo en Growth Form/Meetings real; ningún `setTimeout` o success local.

## Layout Skeleton

| Región | Slot | Propósito | Copy/interaction | Candidate runtime module |
|---|---|---|---|---|
| R0 | Native chrome | Mantener relación Efeonce | menú Ohio, breadcrumb opcional, cero header duplicado | Ohio native |
| R1 | Hero | Reconocer cambio y prometer sistema | H1 + subhead + CTA + fragment-to-system | Elementor hero module |
| R2 | Symptom mirror | Convertir malestar difuso en problema nombrable | 5–6 síntomas seleccionables, todos visibles sin JS | semantic list/tabs |
| R3 | Core thesis | Definir marca útil | `Decisión · Expresión · Operación` + answer capsule | relational set-piece |
| R4 | Maturity | Ubicar punto de partida | Fragmentada → Definida → Expresada → Activada → Gobernada | accessible stepper/list |
| R5 | Buying moments | Mostrar cuándo intervenir | cambio empresarial, portafolio, lanzamiento, escala, inconsistencia, AI discoverability | editorial moments |
| R6 | Offer ladder | Productizar sin vender horas | Diagnostic → Strategy Sprint → System/Activation → Governance | offer comparison |
| R7 | Artifact proof | Hacer tangible el trabajo | objeto + decisión que habilita + owner/uso | specimen modules |
| R8 | Creative ecosystem | Explicar sinergia y enrutar | `Branding define · Agencia activa · Producción escala` | shared navigator |
| R9 | Cases | Probar transformación | cambio → tensión → decisión → sistema → activación/impacto | case chapters |
| R10 | Semantic identity | Diferenciar sin hype de IA | entidad, aliases, categoría, claims, proof, URLs/relationships | semantic specimen |
| R11 | Governance | Mostrar supervivencia post-launch | owner, approvals, exceptions, source, training, review | governance trace |
| R12 | Measurement | Delimitar accountability | clarity, distinctive assets, adoption, ops, trust, visibility, commercial | evidence table |
| R13 | Route selector | Autoseleccionar Define/Activa/Escala | frases del usuario → página correcta | link decision matrix |
| R14 | FAQ | Resolver objeciones | 8–12 respuestas answer-first | accessible accordion |
| R15 | Conversion | Capturar contexto suficiente | CTA + form/scheduler governed + reassurance | Growth Forms/Meetings host |
| R16 | Native footer | Cierre institucional | navegación/legales Efeonce | Ohio native |

## Copy Ledger — hypothesis v0

| Copy id | Región | Texto candidato | Estado / trabajo |
|---|---|---|---|
| `branding.hero.eyebrow` | R1 | `Efeonce Branding Studio` | arquitectura de la oferta; verificar naming visible |
| `branding.hero.h1.a` | R1 | `Tu empresa cambió. Hagamos que tu marca esté a la altura.` | candidata recomendada; tension-led |
| `branding.hero.h1.b` | R1 | `Una marca clara no sólo se reconoce. Ayuda a decidir.` | candidata mechanism-led |
| `branding.hero.h1.c` | R1 | `Si cada equipo explica tu marca distinto, no falta creatividad. Falta sistema.` | candidata problem-led; validar tono |
| `branding.hero.subhead` | R1 | `Conectamos estrategia, arquitectura, identidad y gobierno para convertir lo que tu negocio es hoy en un sistema que toda tu organización pueda utilizar.` | cortar tras VoC/edit |
| `branding.hero.primary` | R1 | `Cuéntanos qué cambió` | CTA de menor ansiedad; destino por decidir |
| `branding.hero.secondary` | R1 | `Identifica tu desafío` | ancla R2 |
| `branding.symptoms.title` | R2 | `Una marca empieza a quedar atrás antes de que alguien decida cambiar el logo.` | PAS sobrio |
| `branding.thesis.title` | R3 | `Una marca útil conecta tres sistemas.` | answer-first |
| `branding.thesis.answer` | R3 | `Decide qué representa. Expresa esa decisión con consistencia. Permite que equipos y partners la operen sin reinventarla.` | capsule 40–60 palabras a editar |
| `branding.maturity.title` | R4 | `No todas las marcas necesitan empezar en el mismo lugar.` | reduce venta indiscriminada |
| `branding.moments.title` | R5 | `Intervenimos cuando el negocio cambia más rápido que la marca.` | situación de compra |
| `branding.offers.title` | R6 | `La intervención correcta depende de la decisión pendiente.` | productización, no menú |
| `branding.artifacts.title` | R7 | `No entregamos archivos aislados. Dejamos decisiones que tu equipo puede usar.` | alinear con Why sin humo |
| `branding.delivery.bridge` | R7 | `No dejamos la estrategia guardada en un brand book. La conectamos con activación y producción para que entre en uso.` | hipótesis diferencial; publicar sólo con capability proof |
| `branding.ecosystem.title` | R8 | `La marca no termina cuando se aprueba. Empieza cuando entra en uso.` | puente a hermanas |
| `branding.ecosystem.branding` | R8 | `Branding define el sistema.` | ruta actual |
| `branding.ecosystem.agency` | R8 | `Agencia Creativa lo convierte en una idea movilizadora.` | link contextual |
| `branding.ecosystem.production` | R8 | `Producción Creativa lo lleva a formatos, canales y mercados.` | link contextual |
| `branding.semantic.title` | R10 | `Tu marca también debe poder ser interpretada correctamente.` | AI-readable sin claim de ranking |
| `branding.governance.title` | R11 | `El sistema tiene que sobrevivir al lanzamiento.` | diferenciador operacional |
| `branding.routing.title` | R13 | `¿Qué necesita resolver tu equipo ahora?` | selector explícito |
| `branding.final.title` | R15 | `Tu empresa ya cambió. Ahora hagamos que todos puedan reconocerlo.` | cierre BAB |
| `branding.final.cta` | R15 | `Solicita un Brand Diagnostic` | sólo si oferta/condición se aprueba |
| `branding.final.support` | R15 | `Cuéntanos qué cambió, qué dejó de funcionar y qué necesita poder hacer tu marca.` | reducción de incertidumbre |

## Regional content contract

### R2 — symptoms

- La empresa evolucionó, pero su explicación no.
- Productos y servicios crecieron sin una arquitectura comprensible.
- Ventas, marketing y dirección usan mensajes incompatibles.
- Cada campaña vuelve a interpretar la marca.
- El manual existe, pero no resuelve decisiones reales.
- Buscadores y sistemas de IA encuentran descripciones o claims contradictorios.

La selección actualiza un panel `Esto suele indicar…` y recomienda leer R3/R4; no calcula score ni cambia la CTA por
persuasión encubierta. Todos los síntomas siguen disponibles como HTML y teclado.

### R3 — decision, expression, operation

- `Decisión`: categoría, audiencia, tensión, posición, arquitectura, naming y límites.
- `Expresión`: identidad verbal/visual/motion, messages, claims y principios de experiencia.
- `Operación`: owners, approvals, excepciones, activos, formación, medición y evolución.
- Cada capa muestra input → decisión → evidencia, no una lista de disciplinas.

### R4 — maturity

Los cinco niveles no producen un score agregado ni suponen una secuencia comercial obligatoria. Cada nivel muestra:
`qué ya existe`, `qué falla`, `qué decisión sigue` y `qué intervención podría corresponder`.

### R6 — offer ladder

- Brand Diagnostic: 5–10 días orientativos; diagnóstico y decisión recomendada, no auditoría gratuita.
- Brand Strategy Sprint: 2–4 semanas orientativas; plataforma estratégica, narrativa y criterios.
- Brand System / Activation Sprints: portfolio, launch, verbal/visual system, enablement o expansión.
- Brand Governance Partner: 3–6 meses mínimos orientativos; responsabilidad, cadencia y decisiones, no producción ilimitada.
- El pricing, gratuidad, disponibilidad y SLA no se publican sin aprobación de Commercial/Finance.

### R6/R7 — delivery credibility

La escalera comercial explica **cómo contratar**; la cadena `Diagnóstico → Estrategia → Sistema → Activación →
Gobernanza` explica **cómo entrega Efeonce**. No deben colapsarse en un mismo conjunto de cards.

R7 presenta cada etapa como una unidad verificable:

- pregunta que resuelve;
- output que recibe/utiliza el cliente;
- decisión o aprobación requerida;
- responsable y handoff a Agencia Creativa, Producción Creativa o equipo cliente;
- ejemplo real autorizado, artefacto sanitizado o metodología explícitamente identificada como tal;
- límite: qué no incluye y cuándo requiere otra especialidad.

«Ayuda a decidir» se refiere a posicionamiento, arquitectura, naming, mensajes, identidad, experiencia, campañas,
touchpoints y gobernanza de marca. No implica estrategia corporativa, pricing, cultura, diseño organizacional ni
transformación operacional completa. Si falta owner, experiencia demostrable o prueba para una etapa, se elimina o se
presenta como capacidad por desarrollar, nunca como servicio disponible.

### R8/R13 — page synergy

La ruta actual se marca `Estás aquí`. Cada ruta incluye `empieza aquí si…`, `deberías venir desde…` y `siguiente
paso natural`. Los enlaces no están relegados al footer.

### R9 — case contract

Cada caso exige: trigger empresarial, tensión, decisión, sistema, activación, adopción/impacto, fuente y autorización.
Si no hay dos casos suficientemente probados, el diseño usa artefactos/metodología verificable y conserva el slot de
casos sin inventar logos, métricas o testimonios.

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Cuéntanos qué cambió` | contexto breve del intake | `Continuar` o acción governed | no prometer diagnóstico gratis |
| loading | `Estamos preparando el siguiente paso` | `Conservamos lo que ya completaste.` | none | sólo si existe espera real |
| empty cases | `La prueba tiene que ser verificable` | no publicar placeholder al visitante; ocultar módulo | none | estado editorial, no UI pública |
| partial proof | `Qué cambió` | mostrar sólo evidencia autorizada y alcance real | `Conoce el enfoque` | no completar con estimaciones |
| form error | `No pudimos enviar tu solicitud` | `Tus respuestas siguen aquí. Intenta nuevamente o usa el canal alternativo.` | `Reintentar` | error real del host |
| form success | `Recibimos el contexto` | `Te confirmaremos el siguiente paso por el canal indicado.` | destination governed | sólo tras receipt server-confirmed |
| scheduler unavailable | `La agenda no está disponible ahora` | explicar alternativa oficial | `Enviar contexto` | sin link HubSpot improvisado |

## Accessibility Contract

- Heading order: un H1; H2 por región; H3 sólo para ofertas/casos/FAQ debajo de su H2.
- Diagram alternatives: toda relación visual tiene lista/tabla textual equivalente en DOM.
- Aria labels: describen acción/destino, no apariencia; `Estás aquí` se expone semánticamente.
- Focus notes: selector R2 y ruta R13 tienen patrón semántico elegido antes de implementación; no links disfrazados de tabs.
- Color-independent state labels: madurez, selección y ruta usan texto/estructura además de color/motion.
- Form: labels persistentes, errores asociados, summary si es largo, foco en primer error, live status para receipt.
- Motion: contenido visible en estado natural, reduced motion y JS-off conservan orden, relaciones y destinos.

## Implementation Mapping

- Route / surface: WordPress/Kinsta `efeoncepro.com`; slug provisional `/branding/`; nueva work page `noindex` hasta cutover.
- Primitives: Ohio native chrome; módulos Elementor semánticos; Growth Forms/Meetings existentes si el CTA los utiliza.
- Variants / kinds: nombres de módulos y schemas se congelan en Discovery; no inventarlos desde este wireframe.
- Component candidates: hero, symptom selector, relational system, maturity, offers, artifact specimens, Creative Services navigator, case chapters, semantic specimen, governance trace, FAQ, conversion host.
- Copy source: controles Elementor escapados + documentación de copy/claim ledger; strings funcionales del host permanecen en su runtime canónico.
- Data reader / command: ninguno nuevo. Conversiones consumen contratos Growth existentes; si falta capability reusable, separar task backend.
- API parity: WordPress/browser no escribe HubSpot ni simula éxito; usa host/comando gobernado.
- Access / capability: pública; datos renderizados allowlisted; cero información interna de Greenhouse.
- Runtime consumers: sitio público y potencial navegación/cross-links de Home/Agencia/Producción.
- Print/email/PDF considerations: fuera de scope.
- GVC markers: raíces semánticas `hero`, `symptoms`, `brand-system`, `maturity`, `offers`, `ecosystem`, `cases`, `governance`, `routing`, `conversion`.

## GVC Scenario Plan

- Scenario file: nuevo escenario público TASK-1803, nombre/path confirmado al implementar.
- Route: draft/work URL `noindex`; luego canonical aprobada.
- Viewports: 1440×1000, 1280×900, 390×844; spot-check 2048.
- Quality profile: `premium` equivalente para sitio público.
- Required steps: first paint; navegación por síntomas; teclado; oferta; rutas hermanas; FAQ; abrir/completar/errar conversion host sin crear lead accidental; reduced motion; JS-off.
- Required captures: hero, R3 states, R4, R6, R8, caso, R10/R11, R13, form default/error/success simulado por fixture autorizado, mobile full scroll.
- Required `data-capture` markers: raíces anteriores o selectores equivalentes documentados.
- Assertions: H1/CTA visibles sin JS; URL/canonical/robots correctos; links semánticos; consola limpia; no nested links; schema visible=JSON-LD; form sin fake success.
- Scroll-width checks: `scrollWidth === clientWidth` en todos los viewports y estados.
- Accessibility/focus checks: tab order, visible focus, selector keyboard, FAQ semantics, error focus, escape/focus restore si hay modal.
- Reduced-motion evidence: mismo contenido/orden; sin pinning/travel/stagger/autoplay; selected states claros.
- Review dossier: `docs/ui/reviews/TASK-1803-landing-branding-studio/`.
- Baseline: required after direction/first-fold approval; source is repo-native benchmark, not competitor screenshots.

## Design Decision Log

- Decision: narrativa larga de decisión considerada, organizada por síntomas → mecanismo → intervención → proof → routing → conversion.
- Alternatives considered: portfolio visual primero; listado de servicios; quiz de score; página corta de campaña.
- Why this pattern: ticket/ciclo alto y audiencia problem/solution-aware necesitan reconocer la causa, entender el mecanismo y resolver objeciones antes de convertir.
- Reuse / extend / new primitive: reuse chrome/hosts; extend módulos adaptables; one-off relacional sólo para R3 si discovery lo justifica.
- Open risks: copy sin VoC; casos/derechos; CTA/offer; slug/canibalización; fronteras con TASK-1350 y página legacy.
- Follow-up: investigación SEO, inventario de casos y decisión comercial son Slice 0, no supuestos de implementación.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger or explicitly delegated to an existing governed host.
- [ ] R6 separa packaging comercial de R7/cadena de entrega y cada etapa visible tiene owner, output, handoff, límite y prueba.
- [ ] Ningún copy convierte capacidad adyacente o futura en experiencia entregada por Efeonce.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Diagrams have list/table alternatives.
- [ ] State and aria copy is ready for implementation after VoC/claim review.
- [ ] Implementation mapping names runtime, copy source, integration boundary and public route.
- [ ] GVC scenario plan proves the page and conversion flow.
- [ ] Design decision log explains reuse/extend/one-off before implementation.
