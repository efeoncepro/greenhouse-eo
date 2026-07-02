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
- service
- why
- diagnostic
- conversion
- faq

El contenido usa contenedores/widgets Elementor y widgets Ohio cuando aplica (`ohio_heading`, `ohio_button`, `ohio_badge`). La pagina incluye schema JSON-LD `ProfessionalService` + `FAQPage`, Yoast title/metadescription/canonical y CSS page-scoped en `_elementor_page_settings.custom_css`.

## Hero actual

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Hero root | `hero280`, `.gh-aeo-hero` | Debe conservar `clb__dark_section` para que Ohio active header/logo/widgets en modo oscuro. |
| Copy column | `herocop`, `.gh-aeo-hero-copy` | Ritmo vertical controlado por CSS page-scoped. |
| Eyebrow | `herotag`, widget `ohio_badge` | Texto vigente: `AEO · Visibilidad en IA`. Usar Ohio Badge nativo, no doble wrapper manual tipo tag+badge. |
| H1 | `herotit`, widget `ohio_heading` | Texto: `Tu próximo cliente ya le pregunta a la <span class="gh-aeo-title-accent">IA qué comprar</span>.<br>¿Hoy apareces tú, o tu competencia?` |
| Subcopy | `herosub` | Texto vigente: `Hacemos que los motores de IA —<strong>ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude</strong>— entiendan, citen y recomienden tu marca cuando tu comprador pregunta.` |
| Engines | `heroeng`, widget `greenhouse_aeo_engine_avatar_group` | TeamAvatarGroup-style con label `Medimos tu marca en`. |
| CTA | `herobut`, widget `ohio_button` | `Empieza con un diagnóstico gratis`; link `#diagnostico` hacia la sección de formulario. |
| Microcopy | `heronot` | `En 24–48h sabes en qué nivel estás — y por dónde empezamos a subirte · Sin costo · Sin compromiso`. |
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
| Eyebrow | `markete`, widget `ohio_badge`, `.gh-aeo-eyebrow gh-aeo-eyebrow-badge` | Texto `El juego cambió`; usa badge/chip Ohio `.ohio-widget.badge.-outlined`, sin lineas ni pseudo-elementos decorativos. |
| H2 | `marketh`, widget `ohio_heading` | `El descubrimiento se mudó a la búsqueda con IA. La mayoría de las marcas son invisibles ahí.` |
| Grid | `marketg`, `.gh-aeo-grid-3 gh-aeo-market-grid` | Tres cards metricas con gap controlado; en mobile apilan a ancho completo sin padding interno extra. |
| Cards | `marketa`, `marketb`, `marketc`, `.gh-aeo-metric-card` | Conservan las tres estadisticas aprobadas; cards blancas con borde/top accent teal, sombra suave, fuente con logo/wordmark y minima altura mobile para evitar clipping de Elementor. |
| Statement inferior | `marketc`, `.gh-aeo-lead` | Frase final como barra navy: `SEO te hacía rankear. AEO decide si los motores de IA te mencionan, te citan y te recomiendan — antes de que exista un clic.` |

Guardrails:

- No tocar el hero para ajustar esta seccion.
- No depender de IDs unicos en esta zona: Elementor contiene IDs repetidos (`marketa`, `marketc`) en root/widgets. Usar clase semantica + posicion estructural.
- Cualquier ajuste de esta seccion debe preservar el hash de `heroans` si no se pidio editar el modulo derecho del hero.
- Verificar mobile `390px`: las metric cards necesitan `height:auto` + `min-height` porque Elementor puede colapsarlas cuando se combinan container flex y `overflow:hidden`.
- Las fuentes de las tres cards se renderizan con `.gh-aeo-source-line`: HubSpot usa el SVG servido desde WordPress (`/wp-content/uploads/greenhouse-axis/hubspot-logotype.svg`), mientras McKinsey y SparkToro usan wordmarks inline accesibles para evitar hotlinks externos fragiles.
- Copy cards vigente: HubSpot mantiene `Caída interanual del tráfico orgánico de los clientes de HubSpot. La búsqueda tradicional ya no alcanza.`; McKinsey usa `De los consumidores ya usa búsqueda con IA, y la mayoría la prefiere para decidir qué comprar — en todas las generaciones.`; SparkToro usa `Probabilidad de que los motores de IA repitan la misma lista de marcas en dos respuestas. Sin un sistema, tu aparición es azar.`

## Seccion pipeline actual

La seccion posterior a `marketa` es `pipelin`, con clases `.gh-aeo-pipeline gh-aeo-pipeline-optimized`. Su rol es convertir el argumento de visibilidad en argumento comercial: aparecer en IA no es vanidad, es pipeline.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `pipelin`, `.gh-aeo-pipeline` | Seccion clara con halo/ruta vertical sutil para unir header, pruebas y conclusion. |
| Header | `pipelin`, `.gh-aeo-section-header` | Eyebrow `Por qué importa ahora`, H2 `Aparecer en las respuestas de IA no es vanidad. Es pipeline.` y bajada explicativa. |
| Proof grid | `pipelin`, `.gh-aeo-grid-2 gh-aeo-pipeline-proof-grid` | Dos proof tiles compactas: desktop en dos columnas, mobile apiladas. Marker CSS vigente `gh-aeo-pipeline-compact-proof-tiles-v1`. |
| Card 1 | `pipelin`, `.gh-aeo-metric-card` | Proof tile compacta: label `Conversión`, KPI `4,4×`, copy Semrush y source mark con SVG real `semrush-logotype.svg` + `2025`. |
| Card 2 | `pipelin`, `.gh-aeo-metric-card` | Proof tile compacta: label `Lead source`, KPI `~15%`, caso Docebo y source marks `HubSpot · Docebo · 2026`. |
| Statement inferior | `pipelin`, `.gh-aeo-lead` | Remate: `Por eso el AEO no es un experimento de marketing: es un canal de adquisición temprano, con ventaja para quien llega primero.` |

Guardrails:

- No tocar el hero ni la seccion market para ajustar `pipelin`.
- Preservar el modo secuencial de las cards: prueba de conversion -> prueba de lead source -> conclusion.
- No reintroducir lineas superiores/accent bars ni el layout row-card gigante en estas cards. La jerarquia aprobada vive en proof tiles compactas con KPI arriba, evidencia debajo y fuente quieta.
- No agregar hover/microinteracciones ornamentales: las cards no son clicables; la mejora aprobada es densidad y jerarquia, no motion.
- Mantener tracking de display solo en el H2. Eyebrow, lead, labels metricos (`Conversión`, `Lead source`), source marks/anios, copy y statement inferior deben quedar con `letter-spacing: normal/0` y sin uppercase forzado.
- HubSpot vuelve a usar el SVG servido desde WordPress; Semrush usa el SVG real AXIS/primitive `semrush-logotype.svg` inline en Elementor (`viewBox="0 0 363 44"`, no texto local); Docebo se mantiene como wordmark inline accesible.
- Verificar mobile `390px`: las cards necesitan `min-height` y el statement debe seguir legible aunque el toggle Light/Dark flotante pueda cruzar la zona baja de la pagina.
- Copy vigente: lead `Cuando tu marca es la que los motores de IA nombran, ganas algo más que visibilidad: ganas la conversación de compra antes que tu competencia. Y el tráfico que llega desde ahí llega más decidido a comprar.`; card Semrush `Los visitantes que llegan desde motores de IA convierten cerca de 4,4 veces más que los de búsqueda orgánica: llegan pre-calificados por el propio motor.`; card HubSpot/Docebo `De los leads de Docebo ya provienen del tráfico de IA tras priorizar su visibilidad en motores generativos.`
- Wireframe/decision log: `docs/ui/wireframes/aeo-pipeline-compact-proof-tiles.md`.

## Seccion levels actual

La seccion posterior a `pipelin` es `levels9`, con clases `.gh-aeo-levels gh-aeo-levels-optimized`. Su rol es explicar que AEO no es un binario "estoy/no estoy indexado", sino una escalera de madurez que va de visibilidad basica a preferencia de marca.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `levels9`, `.gh-aeo-levels` | Seccion clara con halo teal suave; no usar fondo dark completo porque viene despues de secciones de evidencia claras. |
| Header | `levelsh`, `.gh-aeo-section-header` | Eyebrow `Los 5 niveles del AEO`, H2 y bajada centrados. |
| H2 | `levelsh`, widget `ohio_heading` | `El AEO tiene <span class="gh-aeo-levels-title-accent">cinco niveles</span>. Estar indexado te deja en el nivel 1 o 2; del 3 en adelante hay que construirlo.` El acento teal es color-only. |
| Lead | `levelsl`, `.gh-aeo-section-lead` | `¿En cuál estás tú? Léelos hacia abajo: el primero que no te describa es tu próximo nivel. Cada nivel que subes cambia cuánto te recomiendan los motores de IA.` |
| Ladder | `levelsl`, `.gh-aeo-ladder gh-aeo-levels-ladder` | Stack vertical con rail progresivo; en desktop cada nivel es una fila de madurez, en mobile una card compacta. |
| Nivel 1 | `level1c`, `.gh-aeo-rung-level-1` | `Que te encuentre`, `Be Found`, estado `Base`, resultado `Visible`. Body: `Estás indexado y visible para buscadores y motores de IA. Si no te encuentran, nada de lo demás importa.` |
| Nivel 2 | `level2c`, `.gh-aeo-rung-level-2` | `Que te entienda`, `Be Readable`, estado `Base`, resultado `Legible`. Body: `Los motores de IA leen tu estructura, tu schema y tu contenido sin ambigüedad.` |
| Nivel 3 | `level3c`, `.gh-aeo-rung-level-3 gh-aeo-risk` | `Que te describa bien`, `Be Correct`, estado `Alto riesgo`, resultado `Preciso`. Body: `Lo que los motores de IA dicen de ti es verdad: sin features inventadas, precios viejos ni confusión con tu competencia. Que te lea no es que te describa bien.` |
| Nivel 4 | `level4c`, `.gh-aeo-rung-level-4` | `Que pueda actuar`, `Be Actionable`, estado `Sistema`, resultado `Accionable`. Body: `Un agente de IA puede comparar, reservar o comprar en tu sitio sin fricción.` |
| Nivel 5 | `level5c`, `.gh-aeo-rung-level-5 gh-aeo-goal` | `Que te prefiera`, `Be Intrinsic`, estado `La meta`, resultado `Preferido`. Body: `Eres parte de cómo los motores de IA entienden tu categoría: cuando alguien pregunta, tu marca es la recomendación por defecto.` |
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

## Seccion service actual

La seccion posterior a `levels9` es `servic`, con clases `.gh-aeo-service gh-aeo-service-method`. Su rol es explicar que Efeonce no solo entrega un tablero o score: opera un servicio continuo para cerrar la brecha con `Surround Discovery`.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `servic`, `.gh-aeo-service-method` | Seccion clara entre `levels9` y `why5421`, con halo suave, sin rail vertical central y CSS markers `gh-aeo-service-method-v1` + `gh-aeo-service-method-density-v3` + `gh-aeo-service-rhythm-cleanup-v1`. |
| Header | `serviceh`, `.gh-aeo-section-header gh-aeo-service-header` | Eyebrow `El servicio`, H2 y bajada centrados. |
| H2 | `serviceh`, widget `ohio_heading` | `Un tablero te muestra el problema.` + acento teal color-only `Cerrarlo es otra historia.` |
| Lead | `servicel`, `.gh-aeo-service-lead` | `No te entregamos un score y te deseamos suerte. Nos hacemos cargo de tu visibilidad en los motores de IA: con Surround Discovery —nuestro motor— subimos tu marca por la escalera, nivel a nivel y mes a mes, hasta que te prefieran.` |
| Grid | `serviceg`, `.gh-aeo-service-grid` | Grid 2x2 desktop, 1 columna mobile; cuatro cards estaticas, no clicables. |
| Icon style | `serviceis`, `.gh-aeo-service-icons-style` | Widget HTML con `<style id="gh-aeo-service-card-icons-v1">`; scoping por `.elementor-element-servic` porque Elementor no renderiza `id="servic"`. |
| Card 1 | `serv1ca`, `.gh-aeo-service-card` | `01 · Medir`, `Medimos, siempre`, monitoreo en ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude por mercado/prompt. |
| Card 2 | `serv2ca`, `.gh-aeo-service-card` | `02 · Crear`, `Creamos activos que los motores de IA citan`, contenido y arquitectura que entienden/citan/reproducen. |
| Card 3 | `serv3ca`, `.gh-aeo-service-card` | `03 · Distribuir`, `Te ponemos en cada superficie`, presencia donde los motores de IA descubren marcas. |
| Card 4 | `serv4ca`, `.gh-aeo-service-card` | `04 · Optimizar`, `Optimizamos en loop`, mejora continua de nivel, medicion y correccion. |
| Card icons | `serv1cat`-`serv4cat`, `.gh-aeo-service-card-icon` | PNG 3D decorativos/contextuales, `alt="" aria-hidden="true"`: measure/create/distribute/optimize. Adjuntos WP `250642`-`250645`; fuente repo en `docs/assets/public-site/aeo-service-icons/`. |
| Nota | `servicen`, `.gh-aeo-note gh-aeo-service-note` | Banda navy `Cómo trabajamos:` con el modelo de equipo AEO dedicado, ciclos, reporte de avance y `sin amarres`. |
| Resultado | `servicer`, `.gh-aeo-service-result` | Remate centrado: `El resultado: dejas de aparecer por azar. Subes de visible a preferido — y esa preferencia llega a la conversación de compra antes que tu competencia.` Los terminos `visible` y `preferido` van en `<em>`. |

Guardrails:

- No modificar los textos de esta seccion sin pedido explicito: vienen de referencia aprobada por el operador.
- No volverla un mockup de dashboard falso. La seccion debe explicar servicio/metodo, no simular una app.
- No reintroducir el pseudo-elemento central `.gh-aeo-service-method::before` como rail decorativo. El ritmo aprobado entre lead y cards usa un solo gap medido: grid `margin-top` 48px desktop y 32px mobile, con header `margin-bottom: 0`.
- No agregar hover/microinteracciones ornamentales: las cards no son clicables; el feedback correcto es jerarquia, lectura y responsive estable.
- Los iconos 3D son decorativos y no deben introducir logos de terceros, texto ni marcas de motores de IA. Mantenerlos como adjuntos estables bajo `wp-content/uploads/greenhouse/aeo-service-icons/` y fuente versionada bajo `docs/assets/public-site/aeo-service-icons/`.
- Mantener el acento de `Cerrarlo es otra historia.` como color-only: sin glow, underline, fondo ni pseudo-elementos.
- Mantener desktop 2x2 y mobile 390 en una columna sin overflow. La escala aprobada es compacta: H2 cercano al resto de titulos post-hero, cards bajas, nota navy legible y remate de resultado debajo.
- Wireframe/decision log: `docs/ui/wireframes/aeo-service-surround-discovery-section.md`.

## Seccion why actual

La seccion posterior a `servic` es `why5421`, con clases `.gh-aeo-why gh-aeo-why-optimized gh-aeo-why-reference-layout`. Su rol es responder por que Efeonce/Surround Discovery es mas que un tablero: diagnosticar muestra el gap, pero cerrarlo exige metodo, sistema y ejecucion sostenida.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `why5421`, `.gh-aeo-why gh-aeo-why-reference-layout` | Seccion clara con fondo suave y CSS page-scoped; no tocar hero ni Home para ajustar este bloque. |
| Header | `whyhead`, `.gh-aeo-section-header` | Eyebrow `Por qué nosotros`, H2 `No improvisamos el AEO. Lo operamos con método propio y casos reales.` con acento teal color-only en la segunda frase. El span teal debe heredar el tracking del H2; no dejarlo en `letter-spacing: normal` porque se abre visualmente contra el resto del título. |
| Objecion | `whybuil`, `.gh-aeo-note gh-aeo-why-objection-widget` | Banda navy con `¿Y si esto lo hace mi propio equipo?`, body literal de la referencia, tres cards internas con bullet teal (`Velocidad`, `Método`, `Foco`) y cierre `Complemento, no reemplazo: te damos un sistema probado y velocidad.` |
| Proof strip | `whylogo`, `.gh-aeo-why-proof-widget` | Texto centrado `Marcas que ya confían en nosotros`, separado visualmente del panel navy; widget `greenhouse_logo_marquee` (`whylogom`) con 7 logos únicos en 3 sets idénticos; meta tipo `TeamAvatarGroup` con discos solapados en color de Berel, Sky y Bresler, seguido por `+120 marcas - 4 países` con ícono flat de mundo. No volver al mono/dashed box genérico. El marquee debe mantener fades laterales, loop continuo `translate(-33.333%)`, set más ancho que el viewport, gap visual/fase ~55px y reduced-motion sin animación/duplicados. |
| Ocultos/no vigentes | `whygrid`, `whycred`, `whyearl` | No deben mostrarse en el layout vigente de referencia. |

Guardrails:

- Mantener el orden `service -> why -> diagnostic`; no devolver `why` debajo de `diagnos` salvo pedido explicito.
- Mantener el copy literal de la referencia del operador. No reintroducir el comparativo viejo `Medir por tu cuenta` vs `Surround Discovery`, credenciales ni timing en esta posicion.
- Las tres razones dentro del panel navy deben verse como cards con bullet teal, no como lista corrida.
- Elementor renderiza la clase del root desde `css_classes`; si se cambia este layout, actualizar `css_classes` y `_css_classes`.
- El proof de logos no debe validarse solo por DOM/gap CSS: revisar captura por fases. No incluir assets que ocupan ancho pero quedan invisibles o abren whitespace perceptible; el set live aprobado usa `sky/anam/gobierno-santiago/berel/carozzi/bresler/marca-chile`.
- Mantener tracking de display solo en el H2 completo, incluyendo spans internos de acento. Títulos internos, labels, pills, body copy y proof marks deben quedar con `letter-spacing: normal/0` y sin uppercase forzado.
- Verificar desktop/mobile: `whyOverflowX=0`, mobile 390 apilado y sin texto cortado. El mega menu absoluto del header puede producir falso positivo de `documentElement.scrollWidth` durante screenshots de locator; revisar `body.scrollWidth` y offenders antes de atribuirlo a esta seccion.

## Seccion diagnostic actual

La seccion posterior a `why5421` es `diagnos`, con clases `.gh-aeo-diagnostic gh-aeo-diagnostic-optimized`. Su rol es convertir la promesa de AEO en entregables concretos del diagnostico gratuito.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `diagnos`, `.gh-aeo-diagnostic` | Seccion clara con halo teal suave; no tocar el hero para ajustar este bloque. |
| Header | `diagnos`, `.gh-aeo-section-header` | Eyebrow `El primer paso del servicio`, H2 `Tu Diagnóstico de Visibilidad en IA` y lead centrado. |
| Lead | `diagnos`, `.gh-aeo-section-lead` | `Antes de mover nada, vemos exactamente dónde estás. Gratis y personalizado: es el mapa con el que arrancamos a subirte por la escalera.` |
| Grid | `diagnos`, `.gh-aeo-report gh-aeo-diagnostic-grid` | Grid responsive: 2 columnas desktop, 1 columna mobile; no usar contenedor unico con filas gigantes. |
| Card 1 | `diag1ca`, `.gh-aeo-diagnostic-card` | `Score real` + `Tu score real en ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude`; body `Sabes, con dato, si los motores de IA te ven o te ignoran hoy.`; salida `Score por motor`. |
| Card 2 | `diag2ca`, `.gh-aeo-diagnostic-card` | `Share of voice` + `Tu share of voice vs. tus competidores reales`; body `Descubres a quién están recomendando los motores de IA en tu lugar.`; salida `Mapa competitivo`. |
| Card 3 | `diag3ca`, `.gh-aeo-diagnostic-card` | `Prompts críticos` + `Los prompts —en español, por país— donde no apareces`; body `Ves el hueco exacto, no una idea vaga.`; salida `Prompts donde no apareces`. |
| Card 4 | `diag4ca`, `.gh-aeo-diagnostic-card` | `Plan priorizado` + `Un plan de acción priorizado`; body `Sales con los primeros movimientos claros, no con un PDF que archivas.`; salida `Primeros movimientos claros`. |
| Nota | `diagnos`, `.gh-aeo-note gh-aeo-diagnostic-note` | Banda navy `Lectura experta`: `No es un reporte automático. Nuestro equipo lo interpreta a la luz de tu categoría y tu mercado: qué significan los números para ti y qué hacer con ellos. El dato lo da la máquina; el criterio lo ponemos nosotros.` `para ti` va en `<em>`. |
| CTA | `diagnos`, `.gh-aeo-primary-cta gh-aeo-center-button` | `Empieza con un diagnóstico gratis`; mantener el CTA centrado y sin halo/glow extra. |

Guardrails:

- No volver esta seccion una lista plana dentro de una sola card. Debe leerse como cuatro entregables concretos.
- Copy vigente: sigue la referencia marcada por el operador el 2026-07-02. Mantener el layout 2x2 actual salvo pedido explicito de convertirlo a filas planas.
- No depender de IDs unicos sin validar: Elementor repite `diagnos` entre root, header, grid, nota y CTA. Usar clase semantica + texto/estructura.
- La clase base `.gh-aeo-card` trae padding global; dentro de `gh-aeo-diagnostic-optimized` debe neutralizarse para que no exista doble padding con el card inner.
- Mantener tracking de display solo en el H2. Titulos internos, labels (`Visibilidad real`, `Entregable`, etc.), body copy y salida deben quedar con `letter-spacing: normal/0` y sin uppercase forzado.
- La nota `Lectura experta` debe cerrar la objecion de automatizacion: dato de la maquina + criterio del equipo. No tratarla como advertencia/error.
- Verificar desktop/mobile `scrollWidth == clientWidth`; desktop debe quedar en 2 columnas alineadas y mobile en 1 columna sin texto cortado.

## Seccion conversion actual

La seccion posterior a `diagnos` es `convers`, con clase `.gh-aeo-conversion`. Su rol es convertir la intención del diagnóstico gratuito en un submit real gobernado por Growth Forms, sin recibir destination mapping ni secretos desde WordPress.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `convers`, `.gh-aeo-conversion`, HTML id `diagnostico` | Banda clara propia antes del FAQ; es el destino único de los CTAs de la landing que llevan al formulario. No tocar el hero ni Home para ajustar este bloque. |
| Header | `convers`, `.gh-aeo-section-header` | Eyebrow `Diagnóstico gratis`, H2 `Descubre en qué nivel estás hoy — y empieza a subir.` y bajada `En 24–48h sabes en qué nivel estás y por dónde empezamos a subirte. Sin costo, sin compromiso.` + `Para marcas medianas y grandes con equipo de marketing y compra considerada —B2B o B2C.` |
| Form host/card | `convers`, widget `html`, `.gh-aeo-form-card gh-aeo-growth-form-host` + `.gh-aeo-growth-form-card` | El host Elementor `.gh-aeo-form-card` debe ser transparente, sin borde, sin sombra y sin padding para evitar card-on-card; la única superficie visible es `.gh-aeo-growth-form-card`, con `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL" color-scheme="light" appearance="bare">`. |
| Campos | renderer `.ghf-*` | `Nombre`, `Email corporativo`, `Marca / sitio web`, `País`, `Tamaño de empresa`, `Principal competidor`. Placeholders vigentes: `nombre@tuempresa.com`, `tuempresa.com`, `Selecciona tu país`, `Selecciona un rango`, `marca de tu competencia`. `País`, `Tamaño de empresa` y `Principal competidor` siguen opcionales; el suffix `(opcional)` lo agrega el renderer desde el contrato de validación, no desde el label. |
| CTA principal | renderer `.ghf-btn` | `Empezar con mi diagnóstico →`; respeta validación reactiva por campo, consulta `POST /verify-email` para bloquear correos no corporativos, ejecuta Turnstile invisible y finalmente `POST https://greenhouse.efeoncepro.com/api/public/growth/forms/<formKey-or-slug>/submit`. |
| Trust/privacidad | `.gh-aeo-growth-form-proof`, `.gh-aeo-growth-form-privacy` | Mantener `Sin costo`, `Sin compromiso`, `Sin amarres`, `Tus datos están seguros`, la salida `¿Ya quieres hablar del servicio? Agenda una conversación →` y la nota `Tratamos tus datos según nuestra política de privacidad.` |

Guardrails:

- No capturar datos en WordPress. WordPress solo renderiza la card y el renderer manda el payload al endpoint publico gobernado de Greenhouse con `surfaceId`, campos, `consent:true`, `captchaToken`, `pageUri` y honeypot.
- Todos los CTAs Ohio externos al formulario (`herobut`, CTA de `diagnos`, `faqctad`) deben apuntar a `#diagnostico`. El CTA submit del renderer se mantiene como `<button type="submit">` y no debe convertirse en anchor.
- El formulario gobernado vigente es `efeonce-aeo-diagnostic` (`fdef-efeonce-aeo-diagnostic`, `formKey` `b120566a-dd1a-43c8-956a-4e0121e805b8`, versión publicada `fver-f2f8abde-3b11-42b3-bf78-a309ef7678ad` / v7; v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d` y v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4` deprecadas) y la surface es `fhsf-efeonce-aeo-diagnostic`. La v7 conserva `copy.submit`, Turnstile, destino, placeholders `Selecciona tu país` / `Selecciona un rango` y `style_variant=diagnostic_premium`. Destination HubSpot: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6`.
- El campo `email` debe usar `validator=corporate_email` y la versión publicada debe conservar `validation_schema.emailPolicy={mode:"block_field",field:"email"}`. El renderer consulta `/api/public/growth/forms/<formKey-or-slug>/verify-email` de forma reactiva/debounced y antes de pedir Turnstile; si el correo es Gmail/free/disposable, muestra el error inline en el campo email y no llama `/submit`.
- El renderer debe mantener capacidades de Growth Forms: errores por campo con `role="alert"`, `aria-invalid`, `aria-describedby`, estado de verificación de correo junto al campo y success del email solo después de `/verify-email` real. Los errores requeridos aplican a `firstName`, `email` y `brandWebsite`; `country` y `companySize` siguen opcionales según el contrato publicado vigente.
- Mapping HubSpot vigente: `firstName → firstname`, `email → email`, `country → pais_gh`, `companySize → tamano_de_la_empresa`, `mainCompetitor → marca_de_competencia`. `brandWebsite` se conserva en Greenhouse pero no se envia a HubSpot porque el form `AEO - Lead Form` no expone un campo equivalente.
- El renderer canonico `<greenhouse-form>` emite `captchaToken` desde TASK-1294 cuando el contract declara `security.captcha`; desde TASK-1298 el widget `convers` live usa ese renderer. No restaurar el bridge temporal salvo rollback explicito del operador usando el backup meta `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- El bridge restaurado de 2026-06-30 fue el piso visual, no el techo estetico. El renderer live lo supera con `diagnostic_premium`: jerarquia mas premium, helper/error copy por campo, foco visible, pending/success mas claros, CTA teal con microinteraccion y dropdowns custom para evitar el popup nativo/Ohio. Desktop conserva dos columnas para pares escaneables (`Nombre`/`Email`, `País`/`Tamaño`) y deja campos largos full-width; mobile 390 apila a una columna. Gate obligatorio tras cualquier cambio: `pnpm public-website:verify-aeo-live-contract`.
- TASK-1298 esta complete desde 2026-07-01. Cualquier cambio futuro en esta seccion debe tratarse como nuevo cambio live con backup Elementor, `heroans` guard, Kinsta purge y gate live.
- El API publico de Growth Forms necesita CORS para `https://efeoncepro.com` / `https://www.efeoncepro.com` en `GET`, `POST` y `OPTIONS`; se corrigio en producción el 2026-06-30.
- La separación visual pertenece a la seccion `.gh-aeo-conversion`, hoy como banda `#f4f8fa`; no volver a resolverla con una card exterior alrededor del formulario. Si se ajusta el fondo, hacerlo en la seccion, no en `.gh-aeo-form-card`.
- No exponer metadata interna en la landing. El kicker técnico `Growth Forms · Diagnóstico AEO` no debe renderizarse; la card pública empieza directamente con los campos renderizados, sin restaurar el H3 interno `Solicita tu diagnóstico AEO`.
- El bloque actual debe mantener `letter-spacing:0` en lead, labels, inputs, trust bullets y links. Los dos titulos del formulario tienen contrato de heading: el H2 de seccion y `.gh-aeo-growth-form-title` deben computar `letter-spacing:-0.045em`. Ojo: Ohio/Elementor tiende a dejar reglas page-scoped con `!important`; verificar siempre el valor computado en navegador, no solo la presencia de la regla en el widget. Marcadores vigentes: `gh-aeo-form-typography-spacing-v1`, `gh-aeo-form-title-letter-spacing-html-v1` y `gh-aeo-form-title-letter-spacing-specificity-v1`. Gate obligatorio tras tocar esta seccion: `pnpm public-website:verify-aeo-live-contract`.
- La card host del renderer tiene un contrato visual propio y no puede depender solo del child theme pendiente: marcador live vigente `gh-aeo-growth-form-host-polish-v2` en CSS page-scoped. Ese bloque restaura padding real de `.gh-aeo-growth-form-card`, trust inline con checks, CTA teal centrado y oculta del layout inicial los `.ghf-help`/`.ghf-counter` del renderer sin quitar la descripcion accesible. Backup live asociado: `_gh_backup_before_aeo_growth_form_host_polish_20260701T102857Z` + `_gh_backup_page_settings_before_aeo_growth_form_host_polish_20260701T102857Z`.
- Los dropdowns live no usan el popup nativo del `<select>`: `diagnostic_premium` renderiza triggers/listboxes `.ghf-select-trigger` / `.ghf-select-list`. Si se modifica el renderer, mantener roles ARIA, teclado y panel blanco con borde para ambos dropdowns.
- Verificar desktop/mobile: banda de seccion visible, una sola card de formulario, host exterior sin borde/sombra/padding, `.gh-aeo-growth-form-card` con padding >=30px desktop / >=18px mobile, trust como `display:flex` sin bullets, helpers/contadores del renderer sin ocupar layout inicial, sin kicker técnico, 4 inputs, 2 selects, CTA teal, privacidad visible, `scrollWidth == clientWidth`, Gmail/free email bloqueado inline con `/verify-email` y `submit=0`, required errors inline para `firstName`/`email`/`brandWebsite`, success de email corporativo solo después de `/verify-email`, y browser fetch desde la pagina devuelve `captcha_failed/missing_token` si se prueba sin token (sin crear lead).

## Seccion FAQ actual

La seccion final de preguntas frecuentes es `faq5b46`, con clases `.gh-aeo-faq`. Su rol es cerrar objeciones sin alargar la pagina: las respuestas viven en disclosure progresivo, antes del CTA final.

Elementos clave:

| Pieza | Element ID / clase | Contrato |
| --- | --- | --- |
| Root | `faq5b46`, `.gh-aeo-faq` | Seccion clara; no debe volver a un listado plano ni a `<details>` manual. |
| Header | `faqhead`, `.gh-aeo-section-header` | Eyebrow `Antes de avanzar` y H2 `Respuestas claras para decidir`. Mantener tono de cierre orientado a decision, no headline generico de FAQ. |
| FAQ accordion | `faqlist`, widget `ohio_accordion`, `.gh-aeo-faq-accordion` | Primitive Ohio canonica para FAQ. `block_layout=outline`, 14 tabs, primera pregunta abierta por defecto. Tratamiento visual vigente: lista editorial ligera, sin card exterior/interior, ancho maximo `840px`, filas cerradas de ~58px desktop y ~54-66px mobile. |
| CTA | `faqctad`, widget `ohio_button` | `Solicita tu diagnóstico gratis`; mantener centrado y sin halo/glow extra. |
| Schema + init | `schema3`, widget `html`, `.gh-aeo-jsonld` | Conserva JSON-LD `ProfessionalService` + `FAQPage` y contiene inicializador scoped vigente `gh-aeo-faq-accordion-init-v5` para apertura/cierre, ARIA, toggle del item activo y motion por altura medida. |

Guardrails:

- Usar `ohio_accordion` para FAQ; no reintroducir `text-editor` con `<details>`.
- Mantener los tabs como `list_title`, `list_content_type=editor`, `list_content_editor`; no usar templates Elementor para respuestas simples.
- Copy vigente: las preguntas vienen del HTML fuente actualizado `/Users/jreye/Documents/AEO/landing-aeo-efeonce-mockup.html` y deben responder decisiones, no solo definiciones: qué es AEO, equivalencia AEO/GEO/Answer Engine, cómo lograr que ChatGPT recomiende una marca, 5 niveles, alcance del servicio, cómo trabajamos, diagnóstico vs servicio, diferencia con SEO, objeción de análisis gratis, precio, tiempo, contrato/permanencia, industria/país y HubSpot.
- Si cambia el copy visible de `faqlist`, sincronizar en el mismo save el nodo `FAQPage` dentro del `@graph` JSON-LD de `schema3`. No dejar schema FAQ con preguntas antiguas.
- El runtime publico de esta landing necesita un inicializador scoped en `schema3` para que la primitive Ohio alterne paneles y exponga `aria-expanded`/`aria-controls`. El v1 renderizaba, pero el handler Ohio podia dejar `visible` sin `active` y colapsar el cuerpo a altura `0`; el v2 arreglo click/keyboard pero forzaba `display:none`/`height:auto`, generando un pop visual. El vigente v5 captura click/keyboard en `.accordion-button`, `.icon-button` y `.accordion-header`, abre un item cerrando los demas, permite cerrar el item activo con un segundo click, escribe `height` inline con prioridad para ganarle a Ohio y anima `0px -> scrollHeight` con reduced-motion respetado. Si se elimina, verificar antes que el handler nativo de Ohio siga abriendo/cerrando en frontend publico.
- El estilo aprobado vive en CSS page-scoped con markers `gh-aeo-faq-ohio-accordion-v1`, `gh-aeo-faq-ohio-accordion-active-body-fix-v1`, `gh-aeo-faq-accordion-body-padding-v2`, `gh-aeo-faq-compact-density-v1`, `gh-aeo-faq-compact-density-v2`, `gh-aeo-faq-accordion-motion-v1`, `gh-aeo-faq-accordion-motion-v2`, `gh-aeo-faq-editorial-list-v1`, `gh-aeo-faq-editorial-list-v2` y `gh-aeo-faq-editorial-list-v3`: lista editorial ligera, inner `.ohio-widget.accordion` transparente, sin borde/radio/sombra, separadores inset, icono con padding interno y respuesta alineada al texto sin rail teal. No volver a `height:auto` para transicionar; CSS no interpola `auto` y el resultado se siente como pop.
- Mantener `letter-spacing: normal` y `text-transform: none` en preguntas/respuestas; el H2 conserva tracking de display.
- No reintroducir card sobre card en FAQ: `.gh-aeo-faq-accordion` y su hijo `.ohio-widget.accordion` deben computar `background: transparent`, `border: 0`, `box-shadow: none`, `border-radius: 0`; `.accordion-body` no debe usar `border-left` teal.
- Verificar desktop/mobile/reduced-motion: `hasAccordion=true`, `hasDetails=false`, 14 items, click funcional en fila/icono/titulo, panel abierto con altura real, segundo click sobre el activo deja `activeIndex=-1` y `aria-expanded=false`, muestras intermedias durante la apertura/cierre, `scrollWidth == clientWidth`, `transitionDuration=0s` en reduced-motion.

## Contrato visual post-hero

- Desde `market` hasta `FAQ`, las secciones alternan bandas claras (`#f4f8fa`) y superficies blancas para evitar que la landing parezca una suma de estilos distintos.
- Los headers de seccion usan una jerarquia comun: `ohio_badge` como eyebrow, `ohio_heading` para H2, lead centrado cuando aplica. No volver a implementar eyebrows como `text-editor` con lineas `::before`/`::after`; el patron aprobado es chip/badge Ohio `.ohio-widget.badge.-outlined` con `letter-spacing:0`, `text-transform:none`, radio `10px` y borde/fondo teal suave.
- Ritmo header-contenido vigente: no sumar `margin-bottom` del header con `margin-top` del primer bloque. El contrato medido es 52px desktop / 28px mobile para secciones normales, 48px / 32px para `service`, y 40px / 32px para `why` porque no tiene lead bajo el H2. CSS marker vigente: `gh-aeo-section-rhythm-cleanup-v1`.
- Cards, FAQ y formulario usan una misma gravedad visual: borde hairline, sombra baja y radios consistentes. La conversion mantiene una sola card visible (`.gh-aeo-growth-form-card`) sobre banda de seccion; no restaurar card exterior.
- La motion post-hero es sutil y opcional: hover de cards solo en `pointer:fine`; con `prefers-reduced-motion: reduce` debe quedar `transitionDuration=0s` y sin transforms.

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
11. **Eyebrows post-hero:** usar el widget Ohio `ohio_badge` como chip, no lineas decorativas ni pseudo-elementos. El hero tambien usa `ohio_badge`, pero su variante oscura es propia del hero; los badges post-hero son light/outlined.
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
- Copy de seccion market 2026-07-01: se alinearon solo textos con la referencia visual del operador, sin tocar estilo/estructura: H2 cambia a `búsqueda con IA`, card McKinsey agrega `— en todas las generaciones`, card SparkToro usa `los motores de IA` + `Sin un sistema`, y la frase inferior usa `los motores de IA te mencionan, te citan y te recomiendan`. Cambio aplicado por Elementor `Document::save()` con backup `_gh_backup_before_aeo_market_reference_copy_20260701T213539Z` + settings backup; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`) y Kinsta purgada. Verificacion: Playwright desktop/mobile 390 con textos exactos, 3 cards y `overflowX=0`; `pnpm public-website:verify-aeo-live-contract` verde.
- Verificacion de la seccion pipeline: root `pipelin` con `.gh-aeo-pipeline-optimized`, grid `.gh-aeo-pipeline-proof-grid`, proof tiles compactas, source marks Semrush/HubSpot/Docebo presentes, Semrush renderizado como SVG AXIS inline real, HubSpot SVG cargando desde WordPress y Playwright desktop/mobile sin overflow.
- Copy de seccion pipeline 2026-07-01: se alinearon solo textos con la referencia visual del operador, sin tocar estilo/estructura: H2 `Aparecer en las respuestas de IA...`, lead con `motores de IA nombran` + tráfico más decidido, card Semrush `pre-calificados por el propio motor`, y statement inferior `Por eso el AEO no es un experimento...`. La card HubSpot/Docebo ya coincidia y no se tocó. Cambio aplicado por Elementor `Document::save()` con backup `_gh_backup_before_aeo_pipeline_reference_copy_20260701T214355Z` + settings backup; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`) y Kinsta purgada. Verificacion: Playwright desktop/mobile 390 con textos exactos, 2 cards y `overflowX=0`; `pnpm public-website:verify-aeo-live-contract` verde.
- Verificacion de la seccion levels: root `levels9` con `.gh-aeo-levels-optimized`, ladder `.gh-aeo-levels-ladder`, cinco niveles reestructurados como escalera de madurez con resultado visible, banda `Surround Discovery` con ciclo de metodo y Playwright desktop/mobile sin overflow.
- Copy de seccion levels 2026-07-01: se alinearon solo textos con la referencia visual del operador, sin tocar estilo/estructura: H2 agrega `en el nivel 1 o 2`, lead pregunta `¿En cuál estás tú?`, y los bodies de los niveles 1, 2, 3 y 5 explicitan buscadores/motores de IA, schema, precisión y recomendación por defecto. Nivel 4 ya coincidia. Cambio aplicado por Elementor `Document::save()` con backup `_gh_backup_before_aeo_levels_reference_copy_20260701T221320Z` + settings backup; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`) y Kinsta purgada. Verificacion: Playwright desktop/mobile 390 con textos exactos, 5 cards y `overflowX=0`; capturas `.captures/aeo-levels-reference-copy-2026-07-01T22-14-01-409Z/`; `pnpm public-website:verify-aeo-live-contract` verde.
- Nueva seccion service 2026-07-01: se inserto `servic` entre `levels9` y `diagnos` con copy literal de la referencia del operador, header `El servicio`, H2 `Un tablero te muestra el problema. Cerrarlo es otra historia.`, cuatro cards `Medir/Crear/Distribuir/Optimizar` y nota navy `Cómo trabajamos:`. Cambio aplicado por Elementor `Document::save()` con backup `_gh_backup_before_aeo_service_section_20260701T222734Z` + settings backup; luego se compacto visualmente con backups `_gh_backup_before_aeo_service_density_20260701T223351Z` y `_gh_backup_before_aeo_service_density_v3_20260701T223807Z`; CSS page-scoped markers `gh-aeo-service-method-v1`, `gh-aeo-service-method-density-v2` y estado vigente `gh-aeo-service-method-density-v3`; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`) y Kinsta purgada. Verificacion: Playwright desktop/mobile 390 con textos exactos, orden `levels -> service -> diagnostic`, 4 cards, `sectionOverflowX=0`, H2 desktop `48px`, cards desktop `178-202px`, capturas `.captures/aeo-service-density-2026-07-01T22-38-25-067Z/`; `pnpm public-website:verify-aeo-live-contract` verde.
- Remate service 2026-07-01: se agrego el widget `servicer` bajo la nota navy con el texto `El resultado: dejas de aparecer por azar. Subes de visible a preferido — y esa preferencia llega a la conversación de compra antes que tu competencia.`, usando `<em>` en `visible` y `preferido`. Cambio aplicado por Elementor `Document::save()` con backup `_gh_backup_before_aeo_service_result_20260701T224148Z` + settings backup; CSS marker `gh-aeo-service-result-v1`; `heroans` preservado y Kinsta purgada. Verificacion: Playwright desktop/mobile 390 con texto exacto, remate debajo de la nota, `sectionOverflowX=0`, capturas `.captures/aeo-service-result-2026-07-01T22-42-24-428Z/`; `pnpm public-website:verify-aeo-live-contract` verde.
- Iconos 3D service 2026-07-01: se generaron cuatro PNG 3D contextuales (`measure`, `create`, `distribute`, `optimize`) con fondo removido y fuente local en `docs/assets/public-site/aeo-service-icons/`. Se subieron a WordPress como adjuntos `250642`-`250645` en `wp-content/uploads/greenhouse/aeo-service-icons/`, se insertaron como `<img class="gh-aeo-service-card-icon" alt="" aria-hidden="true">` dentro de `serv1cat`-`serv4cat`, y se agrego el style widget `serviceis` con selector real `.elementor-element-servic`. Backups `_gh_backup_before_aeo_service_uploaded_icons_20260701T231937Z` y `_gh_backup_before_aeo_service_icon_loading_cleanup_20260701T232650Z`; se removio el intento previo de CSS `#servic` (`gh-aeo-service-3d-icons-v1`) que no aplicaba porque Elementor usa `data-id`/clase, no DOM id. Verificacion: `.captures/aeo-service-icons-2026-07-01T23-26-50-762Z/`, desktop/mobile 390 con 4 PNG cargados, `pageOverflowX=0`, `sectionOverflowX=0`, iconos dentro de card y sin solapar kicker/title; `pnpm public-website:verify-aeo-wordpress-guards` verde.
- Verificacion de la seccion diagnostic: root `diagnos` con `.gh-aeo-diagnostic-optimized`, grid `.gh-aeo-diagnostic-grid`, cuatro entregables alineados en desktop 2x2 y mobile 1 columna, banda `Lectura experta`, `heroans` estable y Playwright desktop/mobile sin overflow (`scrollWidth == clientWidth`).
- Reorden y referencia de la seccion why 2026-07-01: `why5421` se subio para quedar entre `servic` y `diagnos`, con copy literal de la referencia del operador: H2 `No improvisamos el AEO. Lo operamos con método propio y casos reales.`, panel navy `¿Y si esto lo hace mi propio equipo?`, tres cards internas con bullet teal (`Velocidad`, `Método`, `Foco`), cierre `Complemento, no reemplazo: te damos un sistema probado y velocidad.` y proof centrado `Marcas que ya confían en nosotros`. Se ocultan/no renderizan `whygrid`, `whycred` y `whyearl` en el layout vigente. Backups relevantes `_gh_backup_before_aeo_why_reference_layout_20260701T233922Z`, `_gh_backup_before_aeo_why_reference_detail_fix_20260701T234404Z`, `_gh_backup_before_aeo_why_bullet_rows_20260701T234700Z`, `_gh_backup_before_aeo_why_bullet_cards_20260701T235030Z`, `_gh_backup_before_aeo_why_bullet_cards_20260701T235343Z` y `_gh_backup_before_aeo_why_bullet_cards_20260701T235543Z`; CSS marker vigente `gh-aeo-why-reference-layout-v1`; `heroans` preservado y Kinsta purgada. Verificacion: `.captures/aeo-why-reference-layout-2026-07-01T23-56-04-870Z/` muestra desktop con cards y bullets, mobile 390 apilado, textos exactos, orden `service -> why -> diagnostic`, `whyOverflowX=0`; el `pageOverflowX=489` de ese script fue falso positivo del megamenu absoluto del header abierto durante `locator.screenshot`, con probe limpio `bodyScrollWidth=clientWidth`. `pnpm public-website:verify-aeo-wordpress-guards` verde.
- Follow-up de proof/typography why 2026-07-02: el marquee `whylogom` quedó con 7 logos únicos en 3 sets idénticos, viewport desktop 1160px, set ~1218px, gap visual/fase ~55px y proof row tipo `TeamAvatarGroup` con logos en color + `+120 marcas - 4 países`. Se corrigió el drift de `letter-spacing` de acentos internos en títulos display: `herotit`, `levelsh`, `serviceh` y `whyhead` deben heredar el tracking del H1/H2 padre; el bug restante estaba en `serviceh` mobile porque Elementor post CSS cargaba después del plugin y pisaba `.gh-aeo-service-title-accent` a `normal`. Marker page-scoped `gh-aeo-title-accent-letter-spacing-v1`; backup `_gh_backup_before_aeo_title_accent_letter_spacing_20260702T082026Z`. H3 internos/proof/body siguen en `normal/0`. Verificacion final: `.captures/aeo-logo-marquee-2026-07-02T08-21-25-109Z/`, auditoría de 42 headings sin findings desktop/mobile, `pageOverflowX=0`, `rootOverflowX=0`, 21 imagenes cargadas, reduced-motion sin animacion/duplicados y `pnpm public-website:verify-aeo-wordpress-guards` verde.
- Proof row de-emphasis 2026-07-02: la pill inferior debe verse como prueba secundaria, no como CTA/badge. Estado vigente: fondo blanco translúcido, borde y sombra muy sutiles, discos de logos compactos, separador hairline y globe inline slate sin círculo teal. Evidencia focal `.captures/aeo-proof-pill-polish-2026-07-02T08-26-desktop.png`; gate marquee `.captures/aeo-logo-marquee-2026-07-02T08-27-11-050Z/`.
- Verificacion de la seccion FAQ 2026-07-02: root `faq5b46`, widget `faqlist` como `ohio_accordion`, `data-ohio-accordion=true`, 14 items sincronizados desde `/Users/jreye/Documents/AEO/landing-aeo-efeonce-mockup.html`, sin `<details>`, primera pregunta abierta, click funcional para abrir la segunda pregunta y segundo click para dejar `activeIndex=-1`, `FAQPage` JSON-LD con las mismas 14 preguntas, `heroans` estable y Playwright desktop 2048/mobile 390 sin overflow (`scrollWidth == clientWidth`). Marker page-scoped adicional `gh-aeo-page-menu-overflow-guard-v1` oculta el megamenu Ohio inactivo solo cuando `#site-navigation` no está en hover/focus para que capturas visuales no hereden ancho absoluto del header.
- Verificacion tipografica de levels: H2 con tracking ajustado al hero, `cinco niveles` en teal color-only, terminos ingleses alineados opticamente con sus titulos, y lead/titulos internos/cuerpos/eyebrow/badges/labels de resultado/`Surround Discovery`/chips de metodo con `letter-spacing: normal/0` y sin `text-transform: uppercase` forzado para alinearlo al ritmo del hero.
- Verificacion de cohesion post-hero 2026-06-30: 7 eyebrows (`markete`, `pipelin`, `levelse`, `diagnos`, `whyeyeb`, `convers`, `faqeyeb`) convertidos a `elementor-widget-ohio_badge`; cada uno renderiza `.ohio-widget.badge.-outlined`, sin `::before/::after`, desktop/mobile 390 con `overflowX=0`, FAQ funcional y reduced-motion sin transforms.
- Verificacion tipografica del formulario 2026-07-02: el H2 de conversion usa el contrato de heading `letter-spacing:-0.045em` (`Descubre...` computa `-1.944px` desktop / `-1.35px` mobile). La card de formulario ya no renderiza H3 interno; labels, inputs, selects, CTA, trust copy y links mantienen `letter-spacing: normal/0`. Se documento como drift frecuente de Ohio/Elementor: una regla page-scoped con `!important` puede pisar el CSS correcto, asi que la evidencia aceptable es computed style desktop/mobile, no inspeccion estatica. El gate durable `pnpm public-website:verify-aeo-form-typography` permite ausencia del H3 interno y falla si aparece overflow en desktop/mobile 390.
- Verificacion pre-live contract 2026-06-30: `pnpm public-website:verify-aeo-prelive-contract` verifica por WP-CLI read-only que `/aeo-2/` sigue published, `heroans` conserva hash `e0b951b2456a83578cd9e22005900521`, `convers` sigue en bridge y no contiene `<greenhouse-form>`; luego valida API publica de Growth Forms por slug y `formKey` (misma v5, `copy.submit`, `security.captcha`, sin leak de HubSpot/mapping, `POST` sin captcha = `403 captcha_failed/missing_token`), tipografia, bridge live restaurado, fixture local con CSS hostil tipo Ohio (`input/select/button` con `!important`, select background repetido y botón negro), renderer inyectado en `/aeo-2/` sólo en memoria del navegador, estados foco/error/reduced-motion del renderer y review PNG fresh/nonblank. El frame review tambien carga manifests de bounding boxes y muestrea píxeles de inputs/selects/CTA: exige superficies de campo blancas, bajo ratio de píxeles oscuros en selects y alto ratio teal en el CTA. El renderer hardenizado debe seguir computando y viéndose como inputs blancos con borde, selects sin background-image tileada y placeholders `Selecciona país` / `Selecciona tamaño`, CTA teal, trust inline, foco visible, error summary con links de recuperación, desktop con pares `Nombre`/`Email` y `País`/`Tamaño`, y `overflowX=0` desktop/mobile 390. Capturas: `.captures/aeo-form-visual-integrity-{desktop,mobile390}.png`, `.captures/aeo-renderer-ohio-fixture-{desktop,mobile390}.png`, `.captures/aeo-renderer-real-composition-preview-{desktop,mobile390}.png`, `.captures/aeo-renderer-interaction-{focus,error}-{desktop,mobile390}.png`, `.captures/aeo-renderer-interaction-reduced-motion-desktop.png`; manifests: `.captures/aeo-form-visual-integrity-manifest.json`, `.captures/aeo-renderer-ohio-fixture-manifest.json`, `.captures/aeo-renderer-real-composition-preview-manifest.json`, `.captures/aeo-form-visual-frame-review.json`.
- Verificacion live contract 2026-07-02: `pnpm public-website:verify-aeo-live-contract` verifica por WP-CLI que `convers` contiene `<greenhouse-form>` por `form-key`, no contiene el bridge temporal, conserva el hash `heroans`, y que la API publica devuelve v7 `fver-f2f8abde-3b11-42b3-bf78-a309ef7678ad` con `style_variant=diagnostic_premium`, CTA `Empezar con mi diagnóstico →` y placeholders `Selecciona tu país` / `Selecciona un rango`. En navegador valida desktop/mobile 390 sin overflow, inputs blancos, dropdowns premium blancos con borde para país/tamaño, CTA teal, focus/ARIA, bloqueo Gmail/free antes de submit, Turnstile fake con `captchaToken` en body interceptado y dataLayer sin PII.
- Hotfix visual live 2026-07-01: se corrigio la regresion donde el renderer quedo dentro de una card sin padding, con proof como `<ul>` default y helpers/contadores visibles. Cambio aplicado por Elementor `Document::save()` solo en CSS page-scoped, marker `gh-aeo-growth-form-host-polish-v2`; backup `_gh_backup_before_aeo_growth_form_host_polish_20260701T102857Z`, settings backup `_gh_backup_page_settings_before_aeo_growth_form_host_polish_20260701T102857Z`; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`) y Kinsta purgada. El gate `pnpm public-website:verify-aeo-form-visual-integrity` ahora falla tambien si colapsa el padding de card, si el trust vuelve a lista default o si `.ghf-help`/`.ghf-counter` ocupan layout inicial. Verificacion final: `pnpm public-website:verify-aeo-live-contract` verde desktop/mobile 390.
- Copy hero 2026-07-01: `herotag` quedo como `AEO · Visibilidad en IA` y `herosub` como el statement de motores IA, con `ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude` en `<strong>`. Cambio aplicado por Elementor `Document::save()` con backups `_gh_backup_before_aeo_hero_copy_20260701T211532Z` / `_gh_backup_before_aeo_hero_engine_bold_20260701T212629Z` + settings backups; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`) y Kinsta purgada. Verificacion: Playwright desktop/mobile 390 con copy exacto, `<strong>` en DOM, `font-weight:700` y `overflowX=0`; `pnpm public-website:verify-aeo-live-contract` verde.
- Verificacion visual de `why` 2026-06-30: CSS page-scoped `gh-aeo-why-proof-surface-balance-v1` compacta `whylogo` como proof centrado y elimina la doble surface de `whyearl` reseteando el `<p>` interno. Backup meta `_gh_aeo_backup_20260630_122440_why_proof_surface`; `heroans` preservado (`e0b951b2456a83578cd9e22005900521`); Kinsta cache purgada. Playwright desktop/mobile 390: `scrollWidth == clientWidth`, proof sin desbalance de columnas, timing con un solo borde/fondo visible y conversion form host transparente. Capturas: `.captures/aeo-why-proof-surface-balance-v1/`.
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
