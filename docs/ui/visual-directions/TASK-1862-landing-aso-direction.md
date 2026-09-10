# TASK-1862 — Landing ASO — Visual Direction

## Estado y autoridad

- Status: `proposed — pending owner approval`. **Esta dirección no está aprobada.** Hasta que el owner la apruebe
  o la reemplace por un source externo aprobado, `UI ready` permanece `no`.
- Owner task: `TASK-1862`.
- Surface: sitio público WordPress/Ohio + Elementor, working route `/servicios/aso/`.
- Rigor: `ui-standard` con gate premium.
- Posicionamiento: [PDR-023](../../public-site/decisions/PDR-023-landing-aso-posicionamiento.md).
- Esta dirección gobierna composición, jerarquía, identidad visual, responsive y firma. **No** aprueba claims ni
  copy: el copy es hipótesis hasta el Slice 2 de la task.

## Mode and source

- Mode: `repo-native-benchmark`.
- Durable source: este documento.
- Benchmarks del repo: las hermanas vivas `/servicios/posicionamiento-seo/` (página `251078`, diseño aprobado en
  Claude Design) y `/aeo-2/` (página `250265`), más el patrón de firma de `TASK-1860`.
- Provenance / approval: redactado 2026-09-10 a partir de PDR-023, la extensión Search & App Visibility, el
  módulo 10 de `seo-aeo` y los contratos vivos de las landings SEO y AEO
  (`efeonce-public-site-wordpress/references/landings/{posicionamiento-seo,aeo}.md`). Aprobación pendiente.
- Selected frame/state: dirección A, first fold desktop 1440×1000 y mobile 390×844.
- Alternativa válida: si el owner prefiere un export en Claude Design —como se hizo con la landing SEO—, esta
  dirección se usa como brief y la task cambia a `source-led` con el export versionado en `docs/ui/sources/TASK-1862/`.

## Problema perceptual a resolver

Quien llega trae una de tres imágenes de "ASO": un tablero de rankings de keywords (las herramientas), una
galería de capturas de teléfono (las agencias de apps) o, directamente, nada, porque es un término que casi no se
usa en español. La página tiene que decir en segundos que esto es **visibilidad de una app, conectada con la web y
con la IA**, y verse inequívocamente de la misma familia que las landings SEO y AEO.

Lo que el ojo tiene que entender, en orden:

1. esto es ASO: la app, en App Store y Google Play;
2. lo distinto es que la misma app se cuida en tres lugares —tienda, Google, asistentes de IA—;
3. es hermana de SEO y AEO, y hay un siguiente paso proporcional.

## Alternatives

### A — Una app, tres vitrinas · **recomendada**

- **Idea:** la protagonista es una sola app ilustrativa vista en tres marcos: un resultado de búsqueda, la
  respuesta de un asistente y la ficha de la tienda. Puntos numerados marcan dónde se contradicen —nombre,
  propuesta, categoría, precio, reseñas— y en la sección firma se convierten en una lista priorizada.
- **First fold:** eyebrow → H1 con `ASO` y `app` → cuerpo de tres líneas → CTA primario de diagnóstico y reunión
  secundaria → micro-línea → a la derecha, los tres marcos compactos con dos puntos visibles.
- **Densidad:** baja en hero, media en servicios, alta sólo en la tabla de medición.
- **Profundidad:** papel editorial claro (como el hero de SEO) y plano navy para la firma y la conversión (como el
  panel de AEO).
- **Firma:** los puntos de los tres marcos se ordenan en una lista priorizada con impacto y esfuerzo cualitativos.
- **Responsive:** a 390 px los marcos se apilan en una tira horizontal compacta con el marco de la tienda
  adelante; la lista siempre existe en el DOM como `<ol>`.
- **Riesgo genérico:** bajo, si los marcos son ilustraciones propias y genéricas, no réplicas de interfaces reales.

### B — Tablero de ASO · rechazada

- First fold dominado por rankings de keywords, curvas de descargas y posiciones por país.
- Ubica a Efeonce en el comparison set de las herramientas —AppTweak, Sensor Tower—, justo donde el módulo 14 de
  `seo-aeo-practice` dice que no competimos: *"tienes el dato; te falta decidir y hacerlo"*.
- Exige números para verse creíble y no hay números propios: terminaría en un dashboard ficticio.

### C — Teléfonos en vitrina · rechazada

- First fold con mockups de teléfonos, capturas de apps y un carrusel.
- Se lee como agencia de desarrollo o de creatividad de apps, y promete construir o diseñar la app.
- Requiere una app real para verse bien; una inventada con capturas se lee como caso falso.
- Pesa en el LCP móvil.

## Decision

Se recomienda **A — Una app, tres vitrinas**. Es la única que hace visible el diferencial real —la consistencia
entre tienda, web e IA, que las agencias de ASO puras no cruzan— sin datos inventados, y conecta visualmente con
SEO (Google) y AEO (motores de IA). B y C empujan la página al comparison set equivocado.

## Visual thesis

- **First-fold reading order:** eyebrow → H1 → cuerpo → `Pide el diagnóstico de tu app` → `Agenda una reunión` →
  micro-línea → tres marcos.
- **Dominant decision:** pedir el diagnóstico (misma convención que las hermanas).
- **Density:** baja arriba, media en el cuerpo; la tabla de medición es el único bloque denso.
- **Depth model:** papel claro para lectura; navy para firma y conversión; sin glassmorphism.
- **Typography role:** la de las hermanas. Títulos display H1/H2 con el tracking compacto de la familia
  (`-0.045em`, las spans de acento heredan); cuerpo, labels, chips y FAQ en tracking normal. **[verificar]** las
  familias y tamaños computados en `251078` y `250265` en el Slice 3: la kinship manda sobre el sistema genérico.
- **Color role:** azul Efeonce para lectura, enlaces y el CTA primario (gradiente de las hermanas); navy para
  planos de firma y conversión; teal como acento, igual que AEO; neutros para superficies. El color nunca es la
  única señal: cada punto lleva número y cada chip, texto.
- **Signature details:** marcos con etiqueta de texto ("Resultado de búsqueda", "Respuesta de un asistente",
  "Ficha de la tienda"); puntos numerados; líneas que unen el mismo punto en los tres marcos; lista priorizada con
  chips cualitativos; rótulo visible de ejemplo ilustrativo.

## Desktop target

Composición a 1440×1000:

| Zona | Contenido | Proporción |
|---|---|---|
| Masthead Ohio nativo | Header del sitio, variante de fondo claro como en SEO | ~88 px, absoluto |
| Hero, columna izquierda | Eyebrow · H1 en ≤2 líneas · cuerpo ≤3 líneas · CTA primario + reunión en una fila · micro-línea | 7 de 12 columnas |
| Hero, columna derecha | Tres marcos compactos escalonados, dos puntos visibles, sin texto crítico dentro de la ilustración | 5 de 12 columnas |
| Borde inferior del fold | Arranque visible de la banda de definición | Anticipa que la página responde |

H1 al tamaño display de la familia; cuerpo 18 px; CTAs de 48 px de alto. El primer fold no lleva carrusel, video,
tabla ni logos de tiendas.

## Mobile target

Transformación a 390×844:

| Orden | Contenido | Regla |
|---|---|---|
| 1 | Eyebrow | Una línea |
| 2 | H1 | ≤4 líneas, sin cortes de palabra |
| 3 | Cuerpo | ≤5 líneas |
| 4 | `Pide el diagnóstico de tu app` | Ancho completo, 48 px |
| 5 | `Agenda una reunión` | Enlace secundario de 44 px |
| 6 | Tira de marcos | Marco de la tienda adelante, un punto visible |
| 7 | Banda de definición | Comienza con un scroll corto |

El CTA primario queda dentro del primer viewport; la ilustración nunca lo empuja fuera. CTA fijo móvil al estilo
de SEO (`.mcta`), oculto en el hero y dentro de `#diagnostico`. Sin scroll horizontal en ningún ancho.

## Token mapping

| Cue | Canonical token / primitive / recipe | Deviation |
|---|---|---|
| Azul de lectura, enlaces y CTA primario | Rol `primary` y gradiente del CTA de las hermanas | Ninguna |
| Plano de firma y conversión | Navy del panel `why` de AEO / rol `midnight` del sitio | Ninguna |
| Acento | Teal de AEO | Nunca como única señal |
| Superficie editorial | Papel neutro de SEO | Ninguna |
| Tracking de títulos | `-0.045em` en H1/H2 y H3 grandes, spans heredan | Ninguna |
| Eyebrows post-hero | `ohio_badge` outlined, como AEO | Ninguna |
| Iconografía | Tabler `ti ti-*` con alcance a `.gh-aso-landing` | Sin iconos de marca de tiendas |
| Marcas de motores nombrados en R4 | SVG locales ya usados por SEO: Google, GPT, Perplexity | Sólo donde se nombra el motor |
| Tabla de medición | `ComparisonTable` (`greenhouse_comparison_table`) | Instancia nueva, sin fork |
| Marcas que confían | `greenhouse_social_trust` / `BrandProofAvatarGroup` | Rótulo de empresa |
| Formulario | `GrowthFormEmbed` + `GrowthFormEditorialBriefHost`, variante `diagnostic_premium` | Campos del brief de app |
| Scheduler | `NativeMeetingSchedulerHost` vía Growth CTA | Degrada a `/contacto/` sin binding |
| Foco | Anillo doble del sistema | Ninguna |

Los valores literales —HEX, radios, sombras— se toman de los tokens del runtime y de las hermanas en el Slice 5;
esta dirección no introduce ninguno nuevo. **[verificar]** los nombres de variables CSS en `eo-elementor-widgets`.

## Lenguaje de imagen

- **App ilustrativa:** una app ficticia de una categoría genérica, sin marca real ni nombre que se confunda con una
  existente. Ícono abstracto.
- **Marcos:** ilustraciones propias y simplificadas de un resultado, una respuesta y una ficha. **No** son
  capturas ni réplicas de la interfaz de Google, ChatGPT, App Store o Google Play; cada marco lleva su etiqueta de
  texto.
- **Puntos:** círculos numerados de 28 px con contraste AA y nombre accesible.
- **Iconos de servicio:** Tabler lineales —`ti-device-mobile`, `ti-list-search`, `ti-photo`, `ti-message-star`,
  `ti-rocket`, `ti-refresh`, `ti-message-chatbot`, `ti-chart-bar`— sin fondo.
- Se curan primero las librerías e ilustraciones propietarias de Efeonce; sólo se genera si no hay pieza apropiada,
  con divulgación visible.
- **Prohibido:** badges "Descárgalo en App Store" / "Disponible en Google Play", logo de Apple, capturas de apps
  reales, dashboards con cifras, teléfonos con apps de terceros.

## Anti-patterns

- Tablero de rankings o descargas con números inventados.
- Galería o carrusel de teléfonos.
- Badges o logos de tiendas como decoración.
- Réplica de la interfaz de Google, ChatGPT o de las tiendas.
- Muro de tarjetas de servicio.
- Dos acciones con relleno en el mismo bloque.
- Scroll pinning en la firma.
- Marquee o bucles animados.
- Texto crítico dentro de la ilustración.
- Glassmorphism, glow y gradientes sin función.

## Acceptance signature

- Promedio ≥4,5/5; jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template
  genérico, cada una ≥4,5/5; ninguna dimensión bajo 4/5.
- Puesta al lado de SEO y AEO, se reconoce de la misma familia.
- Ningún bloque puede confundirse con una herramienta de ASO ni con una agencia de desarrollo de apps.
- Evidencia desktop, 390 px y reduced motion; `scrollWidth === clientWidth` en todos los anchos.
