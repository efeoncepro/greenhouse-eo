# TASK-1598 — Landing Influencer Marketing, Creators & UGC — Wireframe

## Meta

- Status: `draft — UI ready: no`
- Owner task: `TASK-1598 — Landing pública Influencer Marketing, Creators & UGC`
- Visual source: `repo-native-benchmark`; producir 2–3 direcciones antes de build.
- Intended route: `efeoncepro.com/servicios/influencer-marketing` (working slug; validar).
- Copy source: contenido público validado con `copywriting`, `greenhouse-ux-content-accessibility` y context pack.
- SEO/AEO source: [Landing SEO/AEO Brief V1](../../public-site/CREATOR_INFLUENCE_CONTENT_LANDING_SEO_AEO_BRIEF_V1.md); la página nace con contrato técnico SEO/AEO, no con un panel runtime nuevo.
- Surface: WordPress/Ohio público; no Greenhouse portal.
- Primitive decision: `reuse` patrones públicos + sección firma page-scoped; no crear primitive del portal.

## Brief

Usuario: marketing, brand, ecommerce o content lead que necesita activar creadores o producir UGC con control.
Momento: solution/product-aware; compara agencia, manager, marketplace o ejecución interna.
JTBD: “Necesito que la colaboración con creators produzca relevancia y assets reutilizables sin perder control de
derechos, presupuesto ni medición”.
No-goals: directorio público, promesa de ventas, pricing instantáneo, contrato self-serve o auditoría sin delivery.

## Layout skeleton

| Región | Propósito | CTA / evidencia |
|---|---|---|
| 0 Header | Efeonce + navegación mínima | Agenda una reunión |
| 1 Hero | One thing: fit, contenido y derechos que pueden escalar | Agenda / Cuéntanos tu campaña |
| 2 Trust | Clientes/categorías/capacidad autorizada | Sólo logos/casos aprobados |
| 3 Problema | Followers, assets, derechos y paid suelen estar fragmentados | Diagnóstico del costo de la fragmentación |
| 4 Mecanismo | `fit → contenido → derechos → distribución → aprendizaje` | Diagrama editorial, no buzzwords |
| 5 Ofertas | Intelligence, Activation, UGC, Partnership, Amplification | Comparación por job |
| 6 Sección firma | Muestra assets, rights matrix, versiones y distribución | Show-don’t-tell; no base de datos falsa |
| 7 Cómo operamos | intake, scouting, vetting, negociación, producción, medición, renewal | Gate de seguridad |
| 8 Derechos y control | paid, whitelisting, exclusividad, expiración, disclosure | Confianza + enlace a rights pack resumido |
| 9 Prueba | Caso real o piloto rotulado | Resultado sólo con evidencia |
| 10 FAQ | “¿Cuánto cuesta?”, “¿trabajan en mi país?”, “¿UGC o influencer?” | `<details>` nativo |
| 11 Conversion | brief form + meeting | Form gobernado + scheduler |

## Copy ledger

| ID | String / intención |
|---|---|
| `media.creatorInfluence.landing.hero.eyebrow` | Influencer Marketing · Creators · UGC |
| `media.creatorInfluence.landing.hero.title` | Creadores que construyen confianza. Contenido que sigue trabajando. *(hipótesis)* |
| `media.creatorInfluence.landing.hero.body` | Activamos las personas y los assets correctos para tu objetivo, con derechos claros, distribución gobernada y aprendizaje por creador. *(hipótesis)* |
| `media.creatorInfluence.landing.hero.primaryCta` | Agenda una reunión |
| `media.creatorInfluence.landing.hero.secondaryCta` | Cuéntanos tu campaña |
| `media.creatorInfluence.landing.mechanism.title` | No empieza con una lista de nombres |
| `media.creatorInfluence.landing.mechanism.body` | Empieza con el problema, la audiencia, el contenido que necesitas y el uso que realmente quieres comprar. |
| `media.creatorInfluence.landing.mechanism.answer` | Una agencia de influencer marketing debería ayudarte a elegir creadores por fit, producir contenido utilizable, asegurar derechos y medir la contribución de cada activación. *(cápsula; validar con research)* |
| `media.creatorInfluence.landing.rights.title` | Lo que compras también debe poder demostrarse |
| `media.creatorInfluence.landing.form.title` | Cuéntanos qué quieres activar |
| `media.creatorInfluence.landing.form.helper` | Con el contexto mínimo te diremos qué tipo de colaboración tiene sentido y qué necesitamos validar. |
| `media.creatorInfluence.landing.form.submit` | Revisar mi campaña |

Todo copy marcado como hipótesis requiere validación de voz de cliente y claims antes de publicarse.

Los H2/H3 deben mapear al answer map del brief SEO/AEO. Las cápsulas son contenido visible, autocontenido y no una
promesa de rich result.

## State copy

- Ready: “Cuéntanos tu campaña”.
- Loading: renderer del Growth Form; nunca blank screen.
- Partial: “El brief no pudo cargar. Puedes agendar una reunión y revisamos el alcance contigo.”
- Error: “No pudimos enviar el brief. Revisa los campos marcados o inténtalo nuevamente.”
- Success: usar success card gobernada; no prometer plazo de respuesta no acordado.
- Reduced motion: todos los assets y relaciones visibles sin depender de animación.

## Accessibility contract

- Un solo H1; H2 por región; answer capsules accesibles para usuarios y motores.
- CTAs con verbos específicos y nombres accesibles.
- `<details>/<summary>` para FAQ; no hover-only.
- La sección firma tiene texto alternativo y una versión estática equivalente.
- Form con labels, errores locales, resumen cuando corresponda y focus visible.
- No comunicar derechos, estado o prueba sólo por color.

## Implementation mapping

- Host: WordPress/Ohio, CSS page-scoped y widgets gobernados.
- Form: `<greenhouse-form>` con form key gobernado; no lógica en WordPress.
- Meetings: `open_meeting_scheduler`/surface aprobada; no iframe improvisado.
- CTA: `<greenhouse-cta>` cuando la superficie esté publicada por el engine.
- Tracking: `gh_form_*`, `gh_cta_*`, `gh_meeting_*`; registrar en Tracking Plan antes de build.
- Modern Web Guidance: consultar patrones de accessible disclosure, form validation, reduced motion y performance.
- SEO/AEO: validar HTML inicial, metadata, canonical/indexation, schema visible, internal links, ALT/caption y estructura de respuestas. El seguimiento de prompts es posterior.

## GVC scenario plan

- Scenario: `public-servicios-influencer-marketing`.
- Viewports: 1440 y 390; teclado; reduced motion.
- Markers: `hero`, `mechanism`, `offers`, `rights`, `proof`, `faq`, `brief-form`, `meeting-cta`.
- Assertions: un H1, no overflow, CTA dual, form no blank, FAQ operable, sección firma equivalente estática.
- Evidence: first fold, full page, form ready/error/success, FAQ open, reduced-motion, focus.

## Design decision log

Seleccionar una dirección editorial que haga visible el sistema y no un catálogo de caras. Rechazar: marketplace de
influencers, hero de followers, muro de cards genéricas, dashboard falso, pricing table sin scope y motion que oculte
la evidencia. La página debe verse como la operación: clara, trazable y con un siguiente paso concreto.
