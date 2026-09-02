# TASK-1598 — Landing Influencer Marketing, Creators & UGC — Wireframe

## Meta

- Status: `approved source-led — UI ready: yes`
- Owner task: `TASK-1598 — Landing pública Influencer Marketing, Creators & UGC`
- Visual source: `source-led`; export aprobado y versionado en `docs/ui/sources/TASK-1598/claude-design-source-2026-08-28.zip`.
- Live route: `efeoncepro.com/servicios/agencia-de-influencers/`.
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

| Región               | Propósito                                                             | CTA / evidencia                           |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| 0 Header             | Efeonce + navegación mínima                                           | Agenda una reunión                        |
| 1 Hero               | One thing: fit, contenido y derechos que pueden escalar               | Agenda / Cuéntanos tu campaña             |
| 2 Trust              | Clientes/categorías/capacidad autorizada                              | Sólo logos/casos aprobados                |
| 3 Problema           | Followers, assets, derechos y paid suelen estar fragmentados          | Diagnóstico del costo de la fragmentación |
| 4 Mecanismo          | `fit → contenido → derechos → distribución → aprendizaje`             | Diagrama editorial, no buzzwords          |
| 5 Ofertas            | Intelligence, Activation, UGC, Partnership, Amplification             | Comparación por job                       |
| 6 Sección firma      | Muestra assets, rights matrix, versiones y distribución               | Show-don’t-tell; no base de datos falsa   |
| 7 Cómo operamos      | intake, scouting, vetting, negociación, producción, medición, renewal | Gate de seguridad                         |
| 8 Derechos y control | paid, whitelisting, exclusividad, expiración, disclosure              | Confianza + enlace a rights pack resumido |
| 9 Prueba             | Caso real o piloto rotulado                                           | Resultado sólo con evidencia              |
| 10 FAQ               | “¿Cuánto cuesta?”, “¿trabajan en mi país?”, “¿UGC o influencer?”      | `<details>` nativo                        |
| 11 Conversion        | brief form + meeting                                                  | Form gobernado + scheduler                |

## Copy ledger

| ID                                                 | String / intención                                                                                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `media.creatorInfluence.landing.hero.eyebrow`      | Influencer Marketing · Creators · UGC                                                                                                                                                                           |
| `media.creatorInfluence.landing.hero.title`        | Creadores que construyen confianza. Contenido que sigue trabajando. _(hipótesis)_                                                                                                                               |
| `media.creatorInfluence.landing.hero.body`         | Activamos las personas y los assets correctos para tu objetivo, con derechos claros, distribución gobernada y aprendizaje por creador. _(hipótesis)_                                                            |
| `media.creatorInfluence.landing.hero.primaryCta`   | Agenda una reunión                                                                                                                                                                                              |
| `media.creatorInfluence.landing.hero.secondaryCta` | Cuéntanos tu campaña                                                                                                                                                                                            |
| `media.creatorInfluence.landing.mechanism.title`   | No empieza con una lista de nombres                                                                                                                                                                             |
| `media.creatorInfluence.landing.mechanism.body`    | Empieza con el problema, la audiencia, el contenido que necesitas y el uso que realmente quieres comprar.                                                                                                       |
| `media.creatorInfluence.landing.mechanism.answer`  | Una agencia de influencer marketing debería ayudarte a elegir creadores por fit, producir contenido utilizable, asegurar derechos y medir la contribución de cada activación. _(cápsula; validar con research)_ |
| `media.creatorInfluence.landing.rights.title`      | Lo que compras también debe poder demostrarse                                                                                                                                                                   |
| `media.creatorInfluence.landing.form.title`        | Cuéntanos qué quieres activar                                                                                                                                                                                   |
| `media.creatorInfluence.landing.form.helper`       | Con el contexto mínimo te diremos qué tipo de colaboración tiene sentido y qué necesitamos validar.                                                                                                             |
| `media.creatorInfluence.landing.form.submit`       | Revisar mi campaña                                                                                                                                                                                              |

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

Dirección seleccionada: `Landing Influencer Marketing.dc.html`, con hero editorial asimétrico, video vertical y la
proposición “Creadores que construyen confianza. Contenido que sigue trabajando.”. Se rechaza la alternativa
`Landing Influencer Marketing v1.dc.html` por menor impacto promocional y exceso de explicación. El export gobierna
la intención visual, no sus valores literales ni su header/footer.

El runtime WordPress conserva el masthead y footer globales de Efeonce. Desktop mantiene la composición seleccionada;
390 px recompone navegación implícita, hero y stacks para corregir los solapamientos observados en el export. Se
mantienen como antipatrones: marketplace de influencers, hero de followers, muro genérico de cards, dashboard falso,
pricing sin scope y motion que oculte evidencia.

### Dirección del Growth Form · review premium 2026-08-28

Canon reusable: [Growth Form — Editorial Premium Brief Style V1](../GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md).

Rigor: `ui-standard`, `source-led`. La tarjeta conserva la composición aprobada y adopta una dirección **editorial
premium**: una sola superficie blanca sobre el plano Midnight, encabezado compacto, controles suaves, iconografía
lineal funcional y profundidad contenida. Se rechazaron (a) glassmorphism/glow, por competir con confianza y
legibilidad; (b) wizard de varios pasos, porque agregaba navegación sin reducir los datos; y (c) campos flotantes con
placeholder como label, por accesibilidad y peor escaneo.

- Recipe/primitive: `reuse` del `<greenhouse-form>` gobernado dentro de un host card; `extend` únicamente con chrome y
  CSS page-scoped. No se bifurcan campos, validación, consentimiento, Turnstile, destino ni telemetría.
- Header: icono lineal sin disco, eyebrow `Brief de campaña`, título `Cuéntanos lo esencial`, explicación de una sola
  idea y badge `2 minutos`; señales `Datos protegidos` y `Respuesta con contexto` bajo divisor.
- Campos: labels visibles con seis iconos semánticos; controles de 56 px y texto de 16 px; superficie neutral suave,
  borde perceptible, hover/focus/autofill/error diferenciados por más de un indicador. Nombre/correo y empresa/mercado
  pueden compartir fila sólo cuando el contenedor lo permite; activación, objetivo y consentimiento ocupan todo el
  ancho. Tablet/móvil vuelven a una columna.
- Acción: `Enviar mi brief` ocupa todo el ancho con foco doble y hover de elevación; el scheduler permanece como
  alternativa separada. Consentimiento vive en una sub-superficie ganada por su función legal, no como card decorativa.
- Modern Web Guidance aplicada: labels sobre controles, Gestalt proximity, `autocomplete`, `:autofill` progresivo,
  validación al salir/enviar, errores locales, resumen enfocable, tap targets ≥48 px y reduced-motion equivalente.
- GVC/live evidence: `.captures/task1598-influencer-fidelity-2026-08-29T02-03-15-736Z/` y
  `.captures/task1598-form-premium-live-2026-08-29T0206Z/` en 1440/890/390.

### Refinamiento editorial · 2026-08-29

Rigor: `ui-standard`, `source-led`. El benchmark de Redes Sociales y Desarrollo Web favoreció superficies continuas,
ritmo editorial y contraste por sección. Se rechazó sumar más cards o copiar literalmente sus layouts.

- Recipe: `reuse | extend` de la composición Elementor page-scoped; no aparece un primitive ni runtime compartido.
- Confianza: tres pruebas en una sola franja con divisores y cuatro marcas de altura visual normalizada; tres columnas
  en desktop, una en mobile.
- Mecanismo: plano Midnight con retícula de 48 px, luz radial y anillos discretos; mantiene legibilidad y evita otro
  glow azul plano.
- Distribución: marcas sociales reales monocromas cuando existe identidad de canal; bolsa/correo cuando el destino es
  funcional. Todos son inline, sin círculo, pill o color oficial que compita con el asset.
- Form: megáfono para tipo de activación; helper y contador comparten la fila inmediata al textarea con separación de
  8 px. La iconografía explica la función y nunca reemplaza el label.
- Evidencia live: `.captures/task1598-influencer-fidelity-2026-08-29T11-00-28-401Z/` en 1536/1440/890/390 y reduced
  motion.

### Trust marquee compartido

- Dirección elegida: conservar las tres señales regionales como contexto de servicio y sustituir únicamente el rail
  de logos por `greenhouse_social_trust`, el mismo primitive vivo de la landing de Redes Sociales.
- Recipe/primitive: `reuse`; el widget conserva su label, marquee `logoMarquee.v2`, sets duplicados para movimiento
  continuo, assets monocromáticos y reduced motion. La landing sólo aporta el shell full-width ya existente.
- Alternativas rechazadas: copiar el HTML/CSS del marquee —creaba drift—; mantener cuatro logos estáticos —menor
  prueba y ritmo—; reemplazar también las señales regionales —el comentario del owner seleccionaba sólo el rail de
  marcas y esas señales siguen cumpliendo una función distinta.
- Evidencia: `.captures/task1598-influencer-fidelity-2026-08-29T11-29-33-710Z/trust-marquee-890.png` y
  `trust-marquee-390.png`; cero overflow en 1536/1440/890/390.

### Dock de conversión

- Dirección elegida: superficie Midnight flotante y contenida, con borde fino, sombra controlada y acento superior;
  preserva contexto visual sin convertirse en una segunda barra de navegación.
- Jerarquía: reunión es el único botón sólido verde; brief es transparente con contorno e icono diagonal. En móvil el
  dock prioriza las dos acciones y reduce el copy auxiliar.
- Alternativas rechazadas: dos botones sólidos —competían por la misma prioridad—; glass excesivo —bajaba contraste—;
  franja full-width —pesaba demasiado y parecía parte del chrome global—.
- Evidencia: `.captures/task1598-influencer-fidelity-2026-08-29T11-08-21-257Z/dock-890.png` y `dock-390.png`.

### Selects premium semánticos

- Dirección elegida: `reuse` del combobox/listbox `diagnostic_premium` de Growth Forms; Elementor sólo decora las
  opciones existentes, sin asumir su valor, eventos o validación.
- Mercado: banderas SVG circulares locales para CL/CO/MX/PE y símbolos de región/ubicación. La bandera también
  acompaña el valor seleccionado; se centra con `top: 50%` + traslado vertical, sin blur, a 28 px en lista y 26 px
  en trigger. Activación: creator, video UGC, partnership, pauta y brújula de estrategia. El
  check verde queda reservado al estado seleccionado.
- Alternativas rechazadas: decorar `<option>` nativo —inconsistente entre navegadores—; emojis de bandera —familia
  visual no controlada—; segundo select JavaScript —duplicaba estado, teclado y accesibilidad—. El host sólo
  sincroniza el adorno del valor ya elegido por el renderer.
- Desktop y 390 px: lista blanca elevada, targets ≥46 px, scroll acotado, selected/active distinguibles y trigger sin
  truncamiento. Evidencia: `.captures/task1598-influencer-fidelity-2026-08-29T11-19-13-501Z/`.

### Jerarquía tipográfica y semántica de derechos

- Dirección elegida: documento como icono de brief; Poppins reservado al título del host y Geist para overline,
  explicación, trust, labels, controles, ayudas y submit. El peso 650 se elimina: 600 comunica función y 400 lectura.
- La franja de divulgación IA es full-bleed, pero su texto conserva la misma retícula de contenido.
- En los assets se separa plazo de contexto: `12 meses` + `Publicación del creator`; `90 días` + `Pauta autorizada`;
  `6 meses` + `Canales de la marca`. Fechas absolutas de demo se rechazan porque caducan sin aportar decisión.
- Kicker y chips usan superficie tonal neutra sobre Midnight; el verde queda como señal iconográfica, no como relleno.
- El CTA `Cuéntanos tu campaña` en ofertas reutiliza la jerarquía secundaria del dock adaptada a blanco: contorno navy,
  superficie blanca e icono `arrow-up-right`.
- El submit del brief usa azul Efeonce `primary` con texto blanco; teal se rechaza porque no pertenece a la paleta de
  esta landing y diluye la continuidad entre formulario, links y CTA secundarios.
- Evidencia live: `.captures/task1598-influencer-fidelity-2026-08-29T12-26-32-586Z/` en
  1536/1440/1414/890/390 y reduced motion.
