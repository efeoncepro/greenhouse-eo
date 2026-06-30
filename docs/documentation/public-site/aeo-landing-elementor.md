# Public Site — Landing AEO `/aeo-2/` en Elementor

> **Tipo de documento:** Documentacion funcional / operativa
> **Version:** 1.0
> **Creado:** 2026-06-29 por Codex
> **Dominio:** Public Site
> **Sitio:** `https://efeoncepro.com/aeo-2/`
> **WordPress:** `postId=250265`, title `AEO`, slug `aeo-2`, status `publish`
> **Relacionados:** [Playbook de landings Ohio + Elementor](../../manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md), [Layout Ohio + Elementor](./wordpress-ohio-elementor-layout.md), [Custom Elementor Widgets y React](./wordpress-custom-widgets-react-strategy.md)

## Estado vigente

La landing AEO viva es `/aeo-2/`. El intento anterior `/aeo` (`postId=250255`) fue movido a papelera y no debe usarse como base. El Home (`postId=2791`) no debe tocarse para iteraciones de AEO.

La pagina se construyo como landing modular Elementor/Ohio, no como un bloque HTML monolitico. El HTML local de referencia fue `/Users/jreye/Documents/AEO/landing-aeo-efeonce-mockup.html`, pero se omitieron `<head>`, nav y footer porque Ohio gobierna esas capas.

Secciones raiz actuales:

- `hero`
- market
- pipeline
- levels
- diagnostic
- why
- conversion
- faq

El contenido usa contenedores/widgets Elementor y widgets Ohio cuando aplica (`ohio_heading`, `ohio_button`, `ohio_badge`). La pagina incluye schema JSON-LD `ProfessionalService` + `FAQPage`, Yoast title/metadescription/canonical y CSS page-scoped en `_elementor_page_settings.custom_css`.

## Hero actual

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Hero root | `hero280`, `.gh-aeo-hero` | Debe conservar `clb__dark_section` para que Ohio active header/logo/widgets en modo oscuro. |
| Copy column | `herocop`, `.gh-aeo-hero-copy` | Ritmo vertical controlado por CSS page-scoped. |
| Eyebrow | `herotag`, widget `ohio_badge` | Usar Ohio Badge nativo, no doble wrapper manual tipo tag+badge. |
| H1 | `herotit`, widget `ohio_heading` | Texto: `Tu próximo cliente ya le pregunta a la <span class="gh-aeo-title-accent">IA qué comprar</span>.<br>¿Hoy apareces tú, o tu competencia?` |
| Subcopy | `herosub` | Explica medicion en ChatGPT, Gemini, Perplexity y Claude. |
| Engines | `heroeng`, widget `greenhouse_aeo_engine_avatar_group` | TeamAvatarGroup-style con label `Medimos tu marca en`. |
| CTA | `herobut`, widget `ohio_button` | `Solicita tu diagnóstico gratis`. |
| Microcopy | `heronot` | `Recibe tu score, prompts críticos y competidores citados en 24-48h.` |
| Proof/social proof | `heropro` | Wordmark inline HubSpot + `Solutions Partner`, seguido de chips secundarios `+120 marcas` y paises. |
| Chat visual | `heroans`, widget HTML | Modulo derecho tipo conversacion. No cambiar sin pedido explicito. |

El hash de referencia del HTML del modulo derecho (`heroans`) es:

```text
e0b951b2456a83578cd9e22005900521
```

Usar ese hash como guardrail antes/despues de mutaciones que no deberian tocar el modulo.

## Seccion market actual

La seccion inmediatamente posterior al hero es `marketa`, con clases `.gh-aeo-market gh-aeo-market-optimized`. Su rol es explicar el cambio de comportamiento de busqueda antes de entrar en el resto del argumento.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `marketa`, `.gh-aeo-market` | Seccion full-width clara conectada visualmente con el hero navy mediante gradientes suaves y hairline teal. |
| Header | `marketh`, `.gh-aeo-section-header` | Contiene eyebrow y H2 centrado; no usar espaciadores para separar del grid. |
| Eyebrow | `markete`, `.gh-aeo-eyebrow` | Texto `El juego cambió`; en runtime se presenta en uppercase con lineas teal laterales. |
| H2 | `marketh`, widget `ohio_heading` | `El descubrimiento se mudó a la IA. La mayoría de las marcas son invisibles ahí.` |
| Grid | `marketg`, `.gh-aeo-grid-3 gh-aeo-market-grid` | Tres cards metricas con gap controlado; en mobile apilan a ancho completo sin padding interno extra. |
| Cards | `marketa`, `marketb`, `marketc`, `.gh-aeo-metric-card` | Conservan las tres estadisticas aprobadas; cards blancas con borde/top accent teal, sombra suave, fuente con logo/wordmark y minima altura mobile para evitar clipping de Elementor. |
| Statement inferior | `marketc`, `.gh-aeo-lead` | Frase final como barra navy: `SEO te hacía rankear... antes de que exista un clic.` |

Guardrails:

- No tocar el hero para ajustar esta seccion.
- No depender de IDs unicos en esta zona: Elementor contiene IDs repetidos (`marketa`, `marketc`) en root/widgets. Usar clase semantica + posicion estructural.
- Cualquier ajuste de esta seccion debe preservar el hash de `heroans` si no se pidio editar el modulo derecho del hero.
- Verificar mobile `390px`: las metric cards necesitan `height:auto` + `min-height` porque Elementor puede colapsarlas cuando se combinan container flex y `overflow:hidden`.
- Las fuentes de las tres cards se renderizan con `.gh-aeo-source-line`: HubSpot usa el SVG servido desde WordPress (`/wp-content/uploads/greenhouse-axis/hubspot-logotype.svg`), mientras McKinsey y SparkToro usan wordmarks inline accesibles para evitar hotlinks externos fragiles.

## Seccion pipeline actual

La seccion posterior a `marketa` es `pipelin`, con clases `.gh-aeo-pipeline gh-aeo-pipeline-optimized`. Su rol es convertir el argumento de visibilidad en argumento comercial: aparecer en IA no es vanidad, es pipeline.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `pipelin`, `.gh-aeo-pipeline` | Seccion clara con halo/ruta vertical sutil para unir header, pruebas y conclusion. |
| Header | `pipelin`, `.gh-aeo-section-header` | Eyebrow `Por qué importa ahora`, H2 `Aparecer en la IA no es vanidad. Es pipeline.` y bajada explicativa. |
| Proof grid | `pipelin`, `.gh-aeo-grid-2 gh-aeo-pipeline-proof-grid` | Dos pruebas apiladas como secuencia de evidencia; no forzar dos columnas si rompe el ritmo narrativo. |
| Card 1 | `pipelin`, `.gh-aeo-metric-card` | Fila de evidencia sin linea superior: bloque lateral `Conversión` + `4,4×`, copy Semrush y source mark `Semrush · 2025`. |
| Card 2 | `pipelin`, `.gh-aeo-metric-card` | Fila de evidencia sin linea superior: bloque lateral `Lead source` + `~15%`, caso Docebo y source marks `HubSpot · Docebo · 2026`. |
| Statement inferior | `pipelin`, `.gh-aeo-lead` | Remate con `El punto:` destacado dentro de una caja clara, no como parrafo suelto. |

Guardrails:

- No tocar el hero ni la seccion market para ajustar `pipelin`.
- Preservar el modo secuencial de las cards: prueba de conversion -> prueba de lead source -> conclusion.
- No reintroducir lineas superiores/accent bars en estas cards. La jerarquia aprobada vive en el bloque metrico lateral (desktop) y superior (mobile), con acento de superficie suave.
- Mantener tracking de display solo en el H2. Eyebrow, lead, labels metricos (`Conversión`, `Lead source`), source marks/anios, copy y statement inferior deben quedar con `letter-spacing: normal/0` y sin uppercase forzado.
- HubSpot vuelve a usar el SVG servido desde WordPress; Semrush y Docebo se renderizan como wordmarks inline accesibles para no depender de hotlinks externos.
- Verificar mobile `390px`: las cards necesitan `min-height` y el statement debe seguir legible aunque el toggle Light/Dark flotante pueda cruzar la zona baja de la pagina.

## Seccion levels actual

La seccion posterior a `pipelin` es `levels9`, con clases `.gh-aeo-levels gh-aeo-levels-optimized`. Su rol es explicar que AEO no es un binario "estoy/no estoy indexado", sino una escalera de madurez que va de visibilidad basica a preferencia de marca.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `levels9`, `.gh-aeo-levels` | Seccion clara con halo teal suave; no usar fondo dark completo porque viene despues de secciones de evidencia claras. |
| Header | `levelsh`, `.gh-aeo-section-header` | Eyebrow `Los 5 niveles del AEO`, H2 y bajada centrados. |
| H2 | `levelsh`, widget `ohio_heading` | `El AEO tiene <span class="gh-aeo-levels-title-accent">cinco niveles</span>. Estar indexado te deja en el 1 o 2; del 3 en adelante hay que construirlo.` El acento teal es color-only. |
| Lead | `levelsl`, `.gh-aeo-section-lead` | `Indexar te hace visible. Optimizar te vuelve elegible, correcto, accionable y finalmente preferido por la IA.` |
| Ladder | `levelsl`, `.gh-aeo-ladder gh-aeo-levels-ladder` | Stack vertical con rail progresivo; en desktop cada nivel es una fila de madurez, en mobile una card compacta. |
| Nivel 1 | `level1c`, `.gh-aeo-rung-level-1` | `Que te encuentre`, `Be Found`, estado `Base`, resultado `Visible`. |
| Nivel 2 | `level2c`, `.gh-aeo-rung-level-2` | `Que te entienda`, `Be Readable`, estado `Base`, resultado `Legible`. |
| Nivel 3 | `level3c`, `.gh-aeo-rung-level-3 gh-aeo-risk` | `Que te describa bien`, `Be Correct`, estado `Alto riesgo`, resultado `Preciso`. |
| Nivel 4 | `level4c`, `.gh-aeo-rung-level-4` | `Que pueda actuar`, `Be Actionable`, estado `Sistema`, resultado `Accionable`. |
| Nivel 5 | `level5c`, `.gh-aeo-rung-level-5 gh-aeo-goal` | `Que te prefiera`, `Be Intrinsic`, estado `La meta`, resultado `Preferido`. |
| Note/metodo | `levelsn`, `.gh-aeo-note` | Banda navy de `Surround Discovery` con chips del ciclo `Medir`, `Crear`, `Distribuir`, `Optimizar`. |

Guardrails:

- No volver la seccion una lista plana de cards iguales. La jerarquia aprobada es escalera: rail + numero + contenido + resultado.
- El estado del nivel 3 (`Alto riesgo`) y la meta del nivel 5 deben comunicarse por texto/badge, no solo por color.
- Mantener el tracking de display solo en el H2 (`letter-spacing` negativo moderado, cercano al hero). El span `gh-aeo-levels-title-accent` debe quedarse en teal color-only: sin underline, fondo, borde, glow, `text-shadow` ni pseudo-elementos.
- Mantener `letter-spacing` plano/normal en eyebrow, lead, titulos internos de cards, terminos ingleses, cuerpos, badges, `Resultado` y `Surround Discovery`. No forzar uppercase en esos microtextos; el tracking amplio o heredado del theme hace que la seccion se sienta menos alineada al sitio.
- Los terminos ingleses de cada nivel (`Be Found`, `Be Readable`, etc.) deben alinearse opticamente con el titulo del nivel. No dejarlos caidos por alineacion de baseline; el contrato actual usa `display:inline-flex`, `line-height:1` y un `translateY` sutil.
- En mobile, el bloque `Resultado` debe quedar compacto como pill; las cajas grandes alargan demasiado la lectura.
- No depender de IDs unicos sin validar: Elementor repite IDs entre container y widget (`levelsh`, `levelsl`, `level1c`, etc.). Usar clase semantica + texto/estructura.
- Verificar desktop/mobile `scrollWidth == clientWidth` despues de cambios; el rail de la escalera no debe crear overflow.

## Seccion diagnostic actual

La seccion posterior a `levels9` es `diagnos`, con clases `.gh-aeo-diagnostic gh-aeo-diagnostic-optimized`. Su rol es convertir la promesa de AEO en entregables concretos del diagnostico gratuito.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `diagnos`, `.gh-aeo-diagnostic` | Seccion clara con halo teal suave; no tocar el hero para ajustar este bloque. |
| Header | `diagnos`, `.gh-aeo-section-header` | Eyebrow `Tu punto de partida`, H2 `Tu Diagnóstico de Visibilidad en IA` y lead centrado. |
| Lead | `diagnos`, `.gh-aeo-section-lead` | `Gratis y personalizado para tu marca: un mapa accionable de dónde apareces, dónde pierdes y qué corregir primero.` |
| Grid | `diagnos`, `.gh-aeo-report gh-aeo-diagnostic-grid` | Grid responsive: 2 columnas desktop, 1 columna mobile; no usar contenedor unico con filas gigantes. |
| Card 1 | `diag1ca`, `.gh-aeo-diagnostic-card` | `Visibilidad real` + `Tu score real en ChatGPT, Gemini, Perplexity y Claude`; salida `Score por motor`. |
| Card 2 | `diag2ca`, `.gh-aeo-diagnostic-card` | `Competencia viva` + `Tu share of voice frente a competidores reales`; salida `Mapa competitivo`. |
| Card 3 | `diag3ca`, `.gh-aeo-diagnostic-card` | `Huecos de demanda` + prompts por idioma/pais donde no aparece; salida `Prompts críticos`. |
| Card 4 | `diag4ca`, `.gh-aeo-diagnostic-card` | `Prioridad comercial` + plan de accion priorizado; salida `Primeros movimientos`. |
| Nota | `diagnos`, `.gh-aeo-note gh-aeo-diagnostic-note` | Banda navy `Lectura experta`: debe aclarar que no es un reporte automatico y que el equipo interpreta los numeros. |
| CTA | `diagnos`, `.gh-aeo-primary-cta gh-aeo-center-button` | `Solicita tu diagnóstico gratis`; mantener el CTA centrado y sin halo/glow extra. |

Guardrails:

- No volver esta seccion una lista plana dentro de una sola card. Debe leerse como cuatro entregables concretos.
- No depender de IDs unicos sin validar: Elementor repite `diagnos` entre root, header, grid, nota y CTA. Usar clase semantica + texto/estructura.
- La clase base `.gh-aeo-card` trae padding global; dentro de `gh-aeo-diagnostic-optimized` debe neutralizarse para que no exista doble padding con el card inner.
- Mantener tracking de display solo en el H2. Titulos internos, labels (`Visibilidad real`, `Entregable`, etc.), body copy y salida deben quedar con `letter-spacing: normal/0` y sin uppercase forzado.
- La nota `Lectura experta` debe cerrar la objecion de automatizacion: dato de la maquina + criterio del equipo. No tratarla como advertencia/error.
- Verificar desktop/mobile `scrollWidth == clientWidth`; desktop debe quedar en 2 columnas alineadas y mobile en 1 columna sin texto cortado.

## Seccion why actual

La seccion posterior a `diagnos` es `why5421`, con clases `.gh-aeo-why gh-aeo-why-optimized`. Su rol es responder por que Efeonce/Surround Discovery es mas que un tablero: diagnosticar muestra el gap, pero cerrarlo exige metodo, sistema y ejecucion sostenida.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `why5421`, `.gh-aeo-why` | Seccion clara con fondo suave y CSS page-scoped; no tocar hero ni Home para ajustar este bloque. |
| Header | `whyhead`, `.gh-aeo-section-header` | Eyebrow `Por qué nosotros`, H2 centrado y acento teal color-only en `Cerrarlo`. |
| Comparison grid | `whygrid`, `.gh-aeo-why-compare-grid` | Dos cards comparativas de igual peso visual en desktop; apilan en mobile. |
| Card izquierda | `whyacar`, `.gh-aeo-why-compare-card gh-aeo-why-compare-card-muted` | `Medir por tu cuenta` / `Te muestra el problema`; debe explicar que una herramienta o analisis suelto no cierra el gap. |
| Card derecha | `whybcar`, `.gh-aeo-why-compare-card gh-aeo-why-compare-card-primary` | `Surround Discovery` / `Lo convierte en sistema`; debe conectar estrategia, arquitectura de contenido, ejecucion y pipeline. |
| Objecion | `whybuil`, `.gh-aeo-note gh-aeo-why-objection` | Banda navy `Objeción honesta`: responde si el equipo interno puede hacerlo con velocidad, metodo y foco. |
| Proof strip | `whylogo`, `.gh-aeo-why-proof-strip` | Texto/pills de marcas LatAm (`Sky Airline`, `Pinturas Berel`, `ANAM`, `+120 marcas · 4 países`). |
| Credenciales | `whycred`, `.gh-aeo-why-cred-grid` | Grid de dos credenciales: `HubSpot Solutions Partner` y `Liderado por Julio Reyes`. |
| Credencial HubSpot | `credaca`, `.gh-aeo-why-cred-card` | Enfatiza integracion con la suite comercial y pipeline. |
| Credencial metodo | `credbca`, `.gh-aeo-why-cred-card` | Enfatiza Surround Discovery como metodo propio y liderazgo publico. |
| Timing | `whyearl`, `.gh-aeo-why-timing` | Callout teal suave: `Ventaja de timing`, con cierre `Sé quien lo vio venir.` |

Guardrails:

- No reintroducir HTML rico con nested `<div>` dentro de widgets `text-editor` en esta seccion. Elementor/Ohio puede descartar el contenido y renderizar lorem ipsum. Usar markup simple (`small`, `h3`, `p`, `ul/li`, `span`) o mover piezas complejas a un widget/HTML widget seguro.
- Si se agregan logos reales en lugar de pills de texto, hacerlo como widget seguro y verificar carga live. Assets encontrados durante la iteracion: Sky (`EO_Logo-SKY.png`) y ANAM (`EO_Logo-Anam.webp`); no se encontro asset Berel estable.
- Mantener el acento del H2 color-only: sin underline, fondo, glow, borde, `text-shadow` ni pseudo-elementos.
- La microinteraccion aprobada es sutil: hover con desplazamiento corto en cards y `prefers-reduced-motion` sin transiciones ni transform. No convertirlo en animacion continua.
- Mantener tracking de display solo en el H2. Títulos internos, labels, pills, body copy y proof marks deben quedar con `letter-spacing: normal/0` y sin uppercase forzado.
- Verificar desktop/mobile/reduced-motion: `scrollWidth == clientWidth`, cards comparativas de altura coherente y `transitionDuration=0s`/`translate=0px` en reduced motion.

## Seccion conversion actual

La seccion posterior a `why5421` es `convers`, con clase `.gh-aeo-conversion`. Su rol es convertir la intención del diagnóstico gratuito en un submit real gobernado por Growth Forms, sin recibir destination mapping ni secretos desde WordPress.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `convers`, `.gh-aeo-conversion` | Seccion clara antes del FAQ; no tocar el hero ni Home para ajustar este bloque. |
| Header | `convers`, `.gh-aeo-section-header` | Eyebrow `Tu primer paso`, H2 `Descubre hoy cómo te ve la IA. Gratis.` y bajada `Recibe tu Diagnóstico de Visibilidad en IA...`. |
| Form card | `convers`, widget `html`, `.gh-aeo-form-card gh-aeo-growth-form-host` | Card estilo Growth Forms, con metadata `data-greenhouse-growth-form="efeonce-aeo-diagnostic"` y `data-growth-surface="fhsf-efeonce-aeo-diagnostic"`. |
| Campos | `.gh-aeo-growth-form-fields` | `Nombre`, `Email corporativo`, `Marca / sitio web`, `País`, `Tamaño de empresa`, `Principal competidor (opcional)`. |
| CTA principal | `.gh-aeo-growth-form-button` | `Quiero mi diagnóstico gratis →`; ejecuta Turnstile invisible y luego `POST https://greenhouse.efeoncepro.com/api/public/growth/forms/efeonce-aeo-diagnostic/submit`. |
| Trust/privacidad | `.gh-aeo-growth-form-proof`, `.gh-aeo-growth-form-privacy` | Mantener `Sin costo`, `Sin compromiso`, `Sin amarres`, `Tus datos están seguros` y link a `/politica-de-privacidad/`. |

Guardrails:

- No capturar datos en WordPress. WordPress solo renderiza la card y manda el payload al endpoint publico gobernado de Greenhouse con `surfaceId`, campos, `consent:true`, `captchaToken`, `pageUri` y honeypot.
- El formulario gobernado vigente es `efeonce-aeo-diagnostic` (`fdef-efeonce-aeo-diagnostic`, `fver-efeonce-aeo-diagnostic-v1`) y la surface es `fhsf-efeonce-aeo-diagnostic`. Destination HubSpot: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6`.
- Mapping HubSpot vigente: `firstName → firstname`, `email → email`, `country → pais_gh`, `companySize → tamano_de_la_empresa`, `mainCompetitor → marca_de_competencia`. `brandWebsite` se conserva en Greenhouse pero no se envia a HubSpot porque el form `AEO - Lead Form` no expone un campo equivalente.
- El renderer canonico `<greenhouse-form>` todavia no emite `captchaToken`; por eso la landing usa un host bridge HTML scoped con Turnstile invisible. Cuando el renderer incorpore Turnstile, migrar a `<greenhouse-form form="efeonce-aeo-diagnostic" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL">`.
- El API publico de Growth Forms necesita CORS para `https://efeoncepro.com` / `https://www.efeoncepro.com` en `GET`, `POST` y `OPTIONS`; se corrigio en producción el 2026-06-30.
- El bloque actual debe mantener `letter-spacing:0` en labels, inputs, trust bullets y links. El H2 de la seccion conserva el tracking display global de la landing.
- Los selects necesitan `appearance:none` + caret scoped; el theme Ohio puede repetir flechas nativas si se elimina ese CSS.
- Verificar desktop/mobile: 4 inputs, 2 selects, CTA teal, privacidad visible, `scrollWidth == clientWidth` y browser fetch desde la pagina devuelve `captcha_failed/missing_token` si se prueba sin token (sin crear lead).

## Seccion FAQ actual

La seccion final de preguntas frecuentes es `faq5b46`, con clases `.gh-aeo-faq`. Su rol es cerrar objeciones sin alargar la pagina: las respuestas viven en disclosure progresivo, antes del CTA final.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `faq5b46`, `.gh-aeo-faq` | Seccion clara; no debe volver a un listado plano ni a `<details>` manual. |
| Header | `faqhead`, `.gh-aeo-section-header` | Eyebrow `Antes de que preguntes` y H2 `Preguntas frecuentes`. |
| FAQ accordion | `faqlist`, widget `ohio_accordion`, `.gh-aeo-faq-accordion` | Primitive Ohio canonica para FAQ. `block_layout=outline`, 9 tabs, primera pregunta abierta por defecto. |
| CTA | `faqctad`, widget `ohio_button` | `Solicita tu diagnóstico gratis`; mantener centrado y sin halo/glow extra. |
| Schema + init | `schema3`, widget `html`, `.gh-aeo-jsonld` | Conserva JSON-LD `ProfessionalService` + `FAQPage` y contiene inicializador scoped vigente `gh-aeo-faq-accordion-init-v2` para apertura/cierre y ARIA. |

Guardrails:

- Usar `ohio_accordion` para FAQ; no reintroducir `text-editor` con `<details>`.
- Mantener los tabs como `list_title`, `list_content_type=editor`, `list_content_editor`; no usar templates Elementor para respuestas simples.
- El runtime publico de esta landing necesito un inicializador scoped en `schema3` para que la primitive Ohio alterne paneles y exponga `aria-expanded`/`aria-controls`. El v1 renderizaba, pero el handler Ohio podia dejar `visible` sin `active` y colapsar el cuerpo a altura `0`; el vigente v2 captura click/keyboard en `.accordion-button`, `.icon-button` y `.accordion-header` y fija `active`, `visible`, `hidden`, `display`, `height` y ARIA. Si se elimina, verificar antes que el handler nativo de Ohio siga abriendo/cerrando en frontend publico.
- El estilo aprobado vive en CSS page-scoped con markers `gh-aeo-faq-ohio-accordion-v1`, `gh-aeo-faq-ohio-accordion-active-body-fix-v1` y `gh-aeo-faq-accordion-body-padding-v2`: superficie unica, header activo teal suave, cuerpo alineado opticamente con el titulo.
- Mantener `letter-spacing: normal` y `text-transform: none` en preguntas/respuestas; el H2 conserva tracking de display.
- Verificar desktop/mobile/reduced-motion: `hasAccordion=true`, `hasDetails=false`, 9 items, click funcional en fila/icono/titulo, panel abierto con altura real, `scrollWidth == clientWidth`, `transitionDuration=0s` en reduced-motion.

## Aprendizajes de diseño

1. **Fondo azul tipo Home:** funciona mejor que el fondo blanco para esta landing porque conecta con el lenguaje publico de Efeonce y da mas presencia al modulo de IA.
2. **Clase Ohio dark obligatoria:** el hero azul necesita `clb__dark_section`. Esa clase es la forma nativa de Ohio de activar `light-typo`, logo claro y widgets laterales legibles. No resolverlo solo con overrides manuales.
3. **Acento teal del H1:** el acento recomendado es corto: solo `IA qué comprar`. Frases mas largas pesan demasiado y colorear `competencia` le da protagonismo al rival. No subrayar: se percibe como link o correccion. El acento final es color puro teal, sin glow, sin `text-shadow`, sin fondo, sin borde y sin pseudo-elementos.
4. **Tipografia:** Ohio usa `DM Sans` para titulos. No cambiar a Poppins en esta landing si el objetivo es consistencia con el theme. El problema inicial era tracking/letter-spacing, no familia.
5. **No monospace:** todo texto visible del hero debe usar Inter/DM Sans. Los estilos tipo terminal fueron eliminados porque no corresponden al sistema visual publico.
6. **Ritmo:** evitar margenes laterales excesivos y espaciadores largos. El bloque izquierdo debe respirar pero permanecer compacto: eyebrow -> H1 -> subcopy -> engines -> CTA -> microcopy -> proof chips.
7. **Derecha estable:** el modulo derecho tipo chat no debe ser reemplazado por previews distintas salvo pedido explicito. Fue rechazado cambiarlo por una card diagnostico porque rompia la composicion aprobada.
8. **Social proof HubSpot:** en el hero no usar `HubSpot Solutions Partner` como badge generico. Debe reutilizar el patron del Home: `span.gh-hubspot-wordmark` con `hubspot-logotype.svg` blanco inline + `<strong>Solutions Partner</strong>`. El wrapper `.gh-aeo-hubspot-partner` debe quedar transparente, sin borde, sin padding y sin box-shadow; solo los elementos secundarios conservan look de chip.
9. **Market section:** la seccion `El juego cambió` no debe quedar como texto/cards flotando en un canvas claro. Debe funcionar como puente visual desde el hero: fondo claro con acentos navy/teal, cards con jerarquia numerica clara y statement final destacado.
10. **Pipeline section:** la seccion `Por qué importa ahora` debe leerse como prueba comercial, no como metricas decorativas. Mantener la secuencia de evidencia y cerrar con una tesis accionable.
11. **Levels section:** la seccion de cinco niveles debe leerse como escalera de madurez, no como checklist. El resultado de cada nivel ayuda a escanear el avance y evita depender de color o del texto largo.
12. **Diagnostic section:** la seccion del diagnostico debe vender claridad operativa, no volumen de reporte. Cuatro entregables con salida visible convierten mejor que una lista pesada de features.
13. **Why section:** la seccion `Por qué nosotros` debe responder la objecion comercial, no solo decorar credenciales. El contraste herramienta vs sistema y la objecion honesta hacen mas creible el paso del diagnostico a la solicitud.
14. **FAQ section:** para objeciones finales, usar disclosure canonico Ohio. El acordeon debe sentirse como una superficie unica y operable, no como una pila de lineas sueltas; validar siempre la interaccion real porque renderizar el widget no garantiza que el handler este alternando paneles en el frontend publico.

## Widgets custom usados

### `greenhouse_aeo_engine_avatar_group`

Widget Elementor agregado al plugin `eo-elementor-widgets` v0.9.0. Sirve para renderizar los motores evaluados como grupo de avatares:

- ChatGPT/OpenAI
- Gemini
- Claude/Anthropic
- Perplexity

Tambien expone shortcode fallback:

```text
[eo_aeo_engine_avatar_group]
```

Reglas visuales:

- discos circulares con borde blanco;
- solape de izquierda a derecha con el primer elemento visualmente encima;
- label compacto antes del grupo (`Medimos tu marca en`);
- assets servidos desde el plugin, no base64 ni HTML pegado en Elementor.

### Spectrum Beam

El borde/halo animado del modulo derecho se implemento como CSS page-scoped sobre `.gh-aeo-answer`, inspirado en la primitive `GreenhouseSpectrumBeam`/Nexa. No se importo React al runtime WordPress.

Reglas:

- el beam vive alrededor de la caja, no como relleno interno;
- paleta navy/blue/teal/white;
- animacion por custom property `--gh-aeo-spectrum-angle`;
- `prefers-reduced-motion` desactiva el movimiento;
- no cambiar el HTML del chat para ajustar el beam.

## Guardrails de implementacion

Usar siempre `Document::save()` para mutar Elementor:

```php
$document = \Elementor\Plugin::$instance->documents->get($post_id);
$document->save([
  'elements' => $elements,
  'settings' => $settings,
]);
```

Antes de guardar:

1. Respaldar `_elementor_data` y `_elementor_page_settings`.
2. Registrar metas Ohio relevantes y `_thumbnail_id`.
3. Calcular hash del modulo `heroans` si el cambio no lo toca.
4. Aplicar el cambio minimo.
5. Verificar hash de `heroans`.
6. Purgar cache Kinsta.
7. Verificar en desktop y mobile que `scrollWidth == clientWidth`.

## Validaciones usadas durante la sesion

Evidencia de cierre acumulada:

- WP-CLI remoto con `pnpm public-website:wpcli -- --eval-file ... --wp-user 12`.
- Guardados via `Document::save()` exitosos.
- Cache Kinsta purgada despues de cambios live.
- Playwright desktop/mobile para capturas y medicion de overflow.
- Verificacion de `clb__dark_section`, `light-typo`, logo claro y widgets laterales.
- Verificacion computed del acento del H1: color teal, `textShadow=none`, `textDecorationLine=none`, `backgroundImage=none`, `borderBottomWidth=0px`, pseudo-elementos desactivados.
- Verificacion computed del CTA principal: `boxShadow=none` para evitar halo teal alrededor del boton.
- Verificacion computed del proof HubSpot: `hasLogo=true`, `background=transparent`, `padding=0px`, `filter=brightness(0) invert(1)`, desktop/mobile sin overflow.
- Verificacion de la seccion market: root `marketa` con `.gh-aeo-market-optimized`, grid `marketg` con `.gh-aeo-market-grid`, source logos/wordmarks visibles en las tres cards, `heroans` estable, cache Kinsta purgada y Playwright desktop/mobile sin overflow (`scrollWidth == clientWidth`).
- Verificacion de la seccion pipeline: root `pipelin` con `.gh-aeo-pipeline-optimized`, grid `.gh-aeo-pipeline-proof-grid`, cards sin linea superior presentadas como filas de evidencia con bloque metrico, source marks Semrush/HubSpot/Docebo presentes, HubSpot SVG cargando desde WordPress y Playwright desktop/mobile sin overflow.
- Verificacion de la seccion levels: root `levels9` con `.gh-aeo-levels-optimized`, ladder `.gh-aeo-levels-ladder`, cinco niveles reestructurados como escalera de madurez con resultado visible, banda `Surround Discovery` con ciclo de metodo y Playwright desktop/mobile sin overflow.
- Verificacion de la seccion diagnostic: root `diagnos` con `.gh-aeo-diagnostic-optimized`, grid `.gh-aeo-diagnostic-grid`, cuatro entregables alineados en desktop 2x2 y mobile 1 columna, banda `Lectura experta`, `heroans` estable y Playwright desktop/mobile sin overflow (`scrollWidth == clientWidth`).
- Verificacion de la seccion why: root `why5421` con `.gh-aeo-why-optimized`, comparativa `Medir por tu cuenta` vs `Surround Discovery`, objecion navy, proof strip, credenciales y callout de timing; `heroans` estable y Playwright desktop/mobile/reduced-motion sin overflow (`scrollWidth == clientWidth`), con motion reducido a `transitionDuration=0s` y `translate=0px`.
- Verificacion de la seccion FAQ: root `faq5b46`, widget `faqlist` como `ohio_accordion`, `data-ohio-accordion=true`, 9 items, sin `<details>`, primera pregunta abierta, click funcional en fila/icono/titulo para abrir la segunda pregunta, panel abierto con altura real, `heroans` estable y Playwright desktop/mobile/reduced-motion sin overflow (`scrollWidth == clientWidth`), con `transitionDuration=0s` en reduced-motion.
- Verificacion tipografica de levels: H2 con tracking ajustado al hero, `cinco niveles` en teal color-only, terminos ingleses alineados opticamente con sus titulos, y lead/titulos internos/cuerpos/eyebrow/badges/labels de resultado/`Surround Discovery`/chips de metodo con `letter-spacing: normal/0` y sin `text-transform: uppercase` forzado para alinearlo al ritmo del hero.
- Hash `heroans` estable en mutaciones de avatar group, dark section y H1 accent.

## Lo que no se debe repetir

- No clonar Home como base si el problema viene de como Home abre en Elementor; el clon hereda la rotura.
- No tocar Home para corregir AEO.
- No resolver el modo oscuro del header con selectores globales si falta `clb__dark_section`.
- No meter badge manual sobre `ohio_badge`; eso genera doble capsula.
- No hacer FAQ con `<details>` manual; usar `ohio_accordion` y verificar interaccion real.
- No pegar logos de motores como HTML/base64; usar `greenhouse_aeo_engine_avatar_group`.
- No subrayar el acento teal del H1.
- No convertir el wordmark HubSpot en una capsula/badge; el logo inline debe leerse como partner proof, no como tag.
- No cambiar el modulo derecho tipo chat sin pedir confirmacion.
