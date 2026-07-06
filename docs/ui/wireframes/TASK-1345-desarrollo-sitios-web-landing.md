# TASK-1345 / Desarrollo de sitios web — Landing Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1345`
- Product Design asset: wireframe, flow/interlink map y HTML Velo/v11 importados desde la carpeta local `diseno-web` (2026-07-05). El HTML es referencia de implementacion, NO artefacto productivo aprobado.
- Intended consumers: sitio publico Efeonce (`efeoncepro.com`, runtime WordPress/Elementor hoy -> Astro publico futuro). NO es portal Greenhouse.
- Copy source: contenido de pagina publica adaptado de los docs externos y validado con `docs/context/05_voz-tono-estilo.md`.
- Primitive decision: `reuse` — patrones marketing del sitio publico + form/contacto gobernado. NO se crea primitive del portal.
- UI ready target: `no`

## Brief

- Primary user: founder, gerente comercial o marketing manager que necesita renovar/construir un sitio web para vender mejor.
- User moment: busca proveedor de diseno/desarrollo web o llega por interlink desde Efeonce. Sabe que necesita web, pero no necesariamente entiende SEO tecnico, AI-ready ni conversion infrastructure.
- Job to be done: entender por que Efeonce no entrega "una web linda" sino una superficie comercial medible, y pedir cotizacion sin friccion.
- Primary decision signal: "esta gente entiende que mi sitio debe vender, medir, rankear y quedar listo para buscadores/IA/agentes".
- Non-goals: no es pricing; no es portfolio completo; no es manifiesto de marca; no reconstruye HubSpot/Growth Forms.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Nav global + anchors de la landing | Header publico existente | sitio |
| 1 | Hero | Categoria, H1, subhead, CTA primario/secundario | Hero editorial con proof chips | estatico |
| 2 | Dos visitantes | Diferenciar humano + buscador/IA/agente | Two-panel contrast section | estatico |
| 3 | Metodo IDD | Explicar proceso: investigar, disenar/desarrollar, desplegar/medir | Step cards / timeline | estatico |
| 3.5 | CTA strip | Captura temprana sin interrumpir | Banda CTA premium `strip-premium` + `data-capture="architecture-cta"` | form/contacto |
| 4 | Niveles AI-ready | Escalera de madurez del sitio para IA | Maturity ladder premium `levels-premium` + `data-capture="ai-ready"` | estatico |
| 5 | Sale listo | Manifiesto de entregables/productizacion | Checklist editorial | estatico |
| 6 | Segmentacion/jobs | Mapear necesidades por tipo de cliente | Cards con un job destacado | estatico |
| 7 | Performance habilitado | SEO tecnico, medicion, velocidad, conversion | Feature grid | estatico |
| 8 | Proof | Casos/logos/resultados verificables | Proof cards/testimonial | casos aprobados |
| 9 | De-risk + modelo | Reducir objeciones de compra | Objection cards + process | estatico |
| 10 | FAQ | Preguntas con answer-first copy | Acordeon accesible + JSON-LD | estatico |
| 11 | Conversion form | Formulario/agenda/WhatsApp gobernado | Growth Form / HubSpot / Meetings | integration existente |
| 12 | Footer | Footer global + related links | Footer existente | sitio |

## Copy Ledger

> IDs con convencion public-site `public_site.web_development.*`. Los textos son direccion de copy, no obligan a copiar literal si el runtime/voz pide ajuste. Todo claim de prueba queda `[verificar]`.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public_site.web_development.hero.eyebrow` | 1 | Diseno y desarrollo web | — | categoria/eyebrow |
| `public_site.web_development.hero.h1` | 1 | Sitios web que trabajan como infraestructura comercial. | — | idea fuerza |
| `public_site.web_development.hero.subhead` | 1 | Disenamos y desarrollamos sitios rapidos, claros y preparados para SEO, performance e IA. No solo para que se vean bien: para que vendan, midan y puedan ser entendidos por buscadores, modelos y agentes. | — | adaptar a voz |
| `public_site.web_development.hero.cta_primary` | 1 | Quiero cotizar | — | CTA principal |
| `public_site.web_development.hero.cta_secondary` | 1 | Prefiero agendar una llamada | — | destino real `[verificar]` |
| `public_site.web_development.hero.proof_1` | 1 | Estrategia + UX + desarrollo | — | proof chip |
| `public_site.web_development.hero.proof_2` | 1 | SEO tecnico desde el build | — | proof chip |
| `public_site.web_development.hero.proof_3` | 1 | AI-ready sin humo | — | proof chip |
| `public_site.web_development.signature.h2` | 2 | Tu sitio ya no atiende a un solo visitante. | — | signature section |
| `public_site.web_development.signature.human.title` | 2 | Visitantes humanos | — | panel |
| `public_site.web_development.signature.human.body` | 2 | Necesitan entender rapido que haces, por que confiar y cual es el siguiente paso. | — | panel |
| `public_site.web_development.signature.agent.title` | 2 | Buscadores, IA y agentes | — | panel |
| `public_site.web_development.signature.agent.body` | 2 | Necesitan estructura, velocidad, schema, contenido claro y senales para interpretar tu negocio. | — | panel |
| `public_site.web_development.idd.eyebrow` | 3 | Metodo IDD | — | metodo |
| `public_site.web_development.idd.h2` | 3 | Investigar. Disenar y desarrollar. Desplegar y medir. | — | H2 |
| `public_site.web_development.idd.investigar.title` | 3 | Investigar | — | step |
| `public_site.web_development.idd.investigar.body` | 3 | Aclaramos el negocio, el cliente, las busquedas y la conversion antes de abrir el editor. | — | step |
| `public_site.web_development.idd.disenar.title` | 3 | Disenar y desarrollar | — | step |
| `public_site.web_development.idd.disenar.body` | 3 | Convertimos el mensaje en experiencia: arquitectura, UI, contenido, componentes y desarrollo. | — | step |
| `public_site.web_development.idd.desplegar.title` | 3 | Desplegar y medir | — | step |
| `public_site.web_development.idd.desplegar.body` | 3 | Dejamos la base lista para velocidad, indexacion, analytics, eventos y mejora continua. | — | step |
| `public_site.web_development.mid_cta.kicker` | 3.5 | Siguiente paso | — | CTA strip live |
| `public_site.web_development.mid_cta.h2` | 3.5 | ¿Tienes un proyecto en mente? Te proponemos la arquitectura correcta. | — | CTA strip live |
| `public_site.web_development.mid_cta.cta` | 3.5 | Quiero cotizar | — | CTA |
| `public_site.web_development.ai_ready.eyebrow` | 4 | Listos para la era de la IA | — | live |
| `public_site.web_development.ai_ready.h2` | 4 | Cinco niveles para existir en un internet de agentes | — | ladder live |
| `public_site.web_development.ai_ready.body` | 4 | No basta con rankear en Google. Llevamos tu sitio tan lejos como tu negocio lo necesite por los cinco niveles de preparación para la IA. | — | evitar hype |
| `public_site.web_development.ai_ready.framework.label` | 4 | Framework Efeonce | — | note card |
| `public_site.web_development.ai_ready.framework.title` | 4 | Percepción + operabilidad | — | note card |
| `public_site.web_development.ai_ready.framework.body` | 4 | Los agentes primero deben encontrarte, entenderte y representarte bien. Después pueden operar contigo y recomendarte con más confianza. | — | note card |
| `public_site.web_development.ai_ready.level_1.title` | 4 | Que te encuentre | — | Be Found |
| `public_site.web_development.ai_ready.level_2.title` | 4 | Que te entienda | — | Be Readable |
| `public_site.web_development.ai_ready.level_3.title` | 4 | Que te describa bien | — | Be Correct |
| `public_site.web_development.ai_ready.level_4.title` | 4 | Que pueda actuar | — | Be Actionable |
| `public_site.web_development.ai_ready.level_5.title` | 4 | Que te prefiera | — | Be Intrinsic, trayectoria |
| `public_site.web_development.ai_ready.footer.title` | 4 | Esto no se promete como un interruptor. | — | honesty guard |
| `public_site.web_development.ai_ready.footer.body` | 4 | Se construye como fundamento: primero claridad técnica, luego confianza semántica, después preferencia ganada. | — | honesty guard |
| `public_site.web_development.ready.h2` | 5 | Sale listo para trabajar. | — | manifiesto |
| `public_site.web_development.ready.body` | 5 | Un sitio de Efeonce debe salir con base comercial, tecnica y analitica. No como maqueta bonita esperando que alguien mas la conecte. | — | adaptar |
| `public_site.web_development.segments.h2` | 6 | Para que trabajo necesitas el sitio? | — | segmentacion |
| `public_site.web_development.segments.scale.title` | 6 | Producir a escala | — | featured card |
| `public_site.web_development.segments.scale.body` | 6 | Cuando necesitas landings, paginas de servicio o contenido reusable sin perder consistencia. | — | puede preselect form |
| `public_site.web_development.performance.h2` | 7 | Performance habilitado desde el build. | — | feature grid |
| `public_site.web_development.performance.body` | 7 | Velocidad, SEO tecnico, eventos, analytics y estructura no son extras: son parte del producto. | — | — |
| `public_site.web_development.proof.h2` | 8 | Prueba antes que promesa. | — | proof |
| `public_site.web_development.proof.body` | 8 | Casos, resultados y aprendizajes publicables se incorporan solo cuando esten verificados. | — | fallback honesto |
| `public_site.web_development.derisk.h2` | 9 | Como reducimos el riesgo de comprar una web. | — | objections |
| `public_site.web_development.faq.h2` | 10 | Preguntas frecuentes | — | FAQPage |
| `public_site.web_development.form.h2` | 11 | Coticemos tu sitio | — | form |
| `public_site.web_development.form.body` | 11 | Cuentanos que necesitas construir, mejorar o escalar. Te respondemos con el camino recomendado. | — | form intro |

## FAQ Candidates

| # | Pregunta | Direccion de respuesta |
|---|---|---|
| 1 | ¿Cuanto cuesta disenar y desarrollar un sitio web? | Depende del alcance, cantidad de vistas, contenido, integraciones y nivel de estrategia. La cotizacion parte por diagnosticar el trabajo que el sitio debe hacer. |
| 2 | ¿Cuanto tarda un proyecto web? | Dar rangos por alcance: landing/simple vs sitio corporativo vs sistema de landings. Evitar prometer fechas sin discovery. |
| 3 | ¿Trabajan con WordPress, Webflow, Astro u otras tecnologias? | Responder desde criterio: se elige la tecnologia segun operacion, performance, edicion y mantenimiento. |
| 4 | ¿El sitio queda preparado para SEO? | Si: arquitectura, headings, performance, metadata, schema y contenido base forman parte del build cuando aplica. |
| 5 | ¿Que significa que un sitio sea AI-ready? | Significa que el sitio queda mas facil de interpretar por buscadores, modelos y agentes: estructura, schema, contenido claro, entidad y performance. |
| 6 | ¿Pueden mejorar mi sitio actual sin rehacerlo completo? | Si el diagnostico muestra que conviene. A veces basta optimizar; a veces conviene redisenar la base. |
| 7 | ¿Incluye medicion y eventos? | Debe incluir plan de medicion basico y eventos clave si el cliente tiene analitica disponible. |
| 8 | ¿Pueden producir landings a escala? | Si; el sistema debe permitir repetir componentes, mensajes y patrones sin perder consistencia. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Coticemos tu sitio | Cuentanos que necesitas construir, mejorar o escalar. | Quiero cotizar | estado base |
| loading | Enviando solicitud | Estamos enviando tu informacion. | — | owner form/renderer |
| partial | No pudimos cargar el formulario | Puedes escribirnos por WhatsApp o agendar una llamada. | Abrir contacto alternativo | fallback obligatorio |
| error | No se pudo enviar | Revisa los datos o intenta por el contacto alternativo. | Reintentar / Contacto alternativo | owner form/renderer |
| success | Recibimos tu solicitud | Revisaremos el contexto y te contactaremos con el siguiente paso. | — | owner form/renderer |

## Accessibility Contract

- Heading order: un solo `<h1>` en hero; H2 por region; H3 para cards/FAQ. Sin saltos de nivel.
- Links/CTAs: todo CTA debe tener destino real o estar removido en publish. No `href="#"`.
- FAQ: preferir `<details>/<summary>` o acordeon accesible con teclado.
- Focus: ring visible en nav, CTAs, cards accionables, FAQ y form.
- Color-independent states: selected/hover/featured no dependen solo de color.
- Form: labels explicitos, errores asociados, autocomplete donde corresponda, fallback si no carga.
- Motion-independent meaning: ningun contenido aparece solo por animacion; fail-open visible.

## Implementation Mapping

- Route / surface: `efeoncepro.com/servicios/diseno-desarrollo-web/` propuesta.
- Runtime: WordPress/Elementor actual o Astro publico, decidir en discovery.
- Primitives: patrones marketing existentes del sitio; no portal primitives.
- Component candidates: hero editorial, two-panel contrast, step cards, ladder, feature grid, proof cards, FAQ, form embed.
- Copy source: este wireframe + pagina publica; no `src/lib/copy`.
- Data reader / command: ninguno nuevo.
- API parity: captura por Growth Forms/HubSpot/Meetings/WhatsApp gobernado.
- Runtime consumers: navegadores publicos, crawlers, motores de busqueda, answer engines.
- GVC markers: `hero`, `two-visitors`, `method`, `architecture-cta`, `ai-ready`, `segments`, `performance`, `proof`, `faq`, `conversion-form`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-desarrollo-sitios-web.capture.txt`
- Route: URL preview/staging de la landing publica.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; click nav anchor; scroll por secciones; abrir FAQ; foco en CTA; activar form/fallback.
- Required captures: full-page, hero, method, AI-ready, segmentacion, proof, FAQ abierto, form/fallback.
- Assertions: H1 presente; CTA primario accionable; no `href="#"`; no placeholder enterprise; sin scroll horizontal; FAQ keyboard.
- Scroll-width checks: `scrollWidth <= clientWidth`.
- Reduced-motion evidence: contenido visible con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: absorber los documentos externos al formato canonico del repo antes de ejecutar la landing.
- Decision: HTML Velo/v11 es referencia de implementacion porque ya contiene estructura y visual direction, pero se debe adaptar a runtime/patrones reales.
- Decision: una sola ruta comercial propuesta bajo `/servicios`, con discovery obligatorio de `/diseno-web/`.
- Decision: el modulo related services vive bajo FAQ para preservar el camino principal de conversion.
- Decision: el bloque `levels-premium` usa el framework Efeonce de cinco niveles como maturity model; `Be Intrinsic` queda como trayectoria/preferencia ganada, no garantia inmediata.
- Decision: el CTA intermedio `strip-premium` se integra como puente de arquitectura antes del maturity model, no como banner aislado.
- Reuse / extend / new primitive: reuse.
- Open risks: form final, proof publicable, hub de servicios/CRM/Think URLs.

## Acceptance Checklist

- [ ] All visible strings are represented in the copy ledger or intentionally delegated to form renderer.
- [ ] Dynamic values are named and bounded (proof/cases/form destination).
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is unverified.
- [ ] FAQ answers align with visible JSON-LD.
- [ ] Implementation mapping names route, runtime, data contract and GVC markers.
- [ ] Design decision log explains why HTML is reference, not source-to-paste.
