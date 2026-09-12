# TASK-1865 — Landing Performance Marketing — Visual Direction

## Estado y autoridad

- Status: `proposed — pending owner approval`. **Esta dirección no está aprobada.** Hasta que el owner de Media &
  Distribution la apruebe o la reemplace por un source externo aprobado, `UI ready` permanece `no`.
- Owner task: `TASK-1865`.
- Surface: sitio público WordPress/Ohio + Elementor, working route `/servicios/performance-marketing/`, que reemplaza a
  la página legacy `242862` (`/servicio-gestion-campanas-publicitarias/`).
- Rigor: `ui-standard` con gate premium.
- Posicionamiento que gobierna el contenido: [PDR-022](../../public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md).
- Oferta que la página vende: [ficha de Performance & Commerce Distribution](../../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md).
- Esta dirección gobierna composición, jerarquía, identidad visual, responsive y firma. **No** aprueba claims ni copy:
  el copy del wireframe es hipótesis hasta el Slice 2 de la task.

## Mode and source

- Mode: `repo-native-benchmark`.
- Durable source: este documento.
- Provenance / approval: redactado el 2026-09-11 a partir de la ficha de servicio, la decisión de oferta, PDR-022, la
  investigación de mercado del 2026-09-10 y los precedentes vivos del sitio (`/servicios/agencia-de-influencers/`,
  `/servicio-marketing-de-contenidos/`) y en diseño (`TASK-1860`). Aprobación pendiente del owner.
- Selected frame/state: dirección A, first fold desktop 1440×1000 y mobile 390×844; firma en estado `Clics` y en estado
  `Ventas`.
- Alternativa válida: si el owner prefiere producir un export en Claude Design, esta dirección se usa como brief y la
  task cambia a `source-led` con el export versionado en `docs/ui/sources/TASK-1865/`.

## Problema perceptual a resolver

El visitante llega con una imagen fija de lo que es una agencia de performance: un tablero con ROAS, CPC y flechas
verdes, un muro de logos de plataformas y la promesa de "maximizar tu inversión". La página legacy es exactamente eso,
con contadores que hoy muestran `0`. El mercado chileno está lleno de páginas iguales y los rankings auto-publicados
dominan la búsqueda.

La página tiene que ubicar a Efeonce en otro lugar en los primeros segundos, sin mostrar un solo número inventado:

1. esto es performance marketing, para marcas que ya invierten;
2. lo que distingue es **qué aprende la pauta**, no cuánto sabemos de una plataforma;
3. hay un siguiente paso proporcional: una reunión o un diagnóstico.

## Alternatives

### A — La señal · **recomendada**

- **Idea:** la protagonista es la señal, el dato que vuelve de la venta a la plataforma y le enseña qué funciona. En el
  hero es un circuito de cuatro nodos: anuncio, visita, venta u oportunidad y, de vuelta, la plataforma que aprende. En la
  sección firma, un control permite cambiar lo que aprende la plataforma, de `Clics` a `Ventas`, y la lista de campañas
  se reordena para mostrar que el ganador cambia.
- **First fold:** eyebrow con el término comercial → H1 con `performance marketing` → cuerpo de tres líneas → CTA dual →
  micro-línea de mercados y tipos de negocio → a la derecha, el circuito de la señal con el arco de retorno destacado.
- **Densidad:** baja en el hero, media en canales y módulos, alta sólo en la tabla de posición.
- **Profundidad:** dos planos: papel editorial para lectura y plano Midnight para la firma, la conversión y el dock.
- **Firma:** el control `Clics / Ventas` con la lista que se reordena; la barra de cada campaña representa presupuesto
  relativo, sin cifras.
- **Responsive:** en 390 px el circuito se vuelve vertical con los cuatro nodos apilados; el control de la firma queda a
  ancho completo; sin JavaScript, las dos listas se muestran lado a lado.
- **Riesgo genérico:** bajo, si el circuito es un diagrama propio con texto real y no una ilustración de stock.

### B — Tablero de resultados · rechazada

- First fold con un dashboard de ROAS, CPA, conversiones y gráficos al alza.
- Es el lenguaje de la página legacy y de la competencia local. **Exige números para verse creíble y no hay números
  propios publicables**: terminaría en un dashboard ficticio, antipatrón explícito del sitio público, y en una promesa de
  retorno que la decisión de oferta prohíbe.
- Ubica a Efeonce como "otra agencia de Google y Meta", justo el comparison set que la investigación ordena evitar.

### C — Muro de plataformas · rechazada

- First fold con los logos de Google, Meta, TikTok, LinkedIn, X y OpenAI como prueba de alcance.
- Convierte el canal en producto, contra la regla "canal = cobertura". Los logos se leen como **badges de partner** que
  hoy no están verificados; es el mismo problema que ya tiene la página legacy con "Somos Google Partners y Meta Business
  Partners".
- Depende de marcas de terceros con guías de uso propias y no dice nada del mecanismo.

## Decision

Se recomienda **A — La señal**. Es la única que hace visible el diferenciador real —optimizar hacia venta u oportunidad,
no hacia el clic—, se construye sin cifras inventadas ni logos de terceros, y es honesta sobre lo que la automatización
hace sola. B y C quedan rechazadas porque cada una devuelve la página al lenguaje de la legacy y al comparison set de las
agencias de gestión de pauta.

## Visual thesis

- **First-fold reading order:** eyebrow → H1 → cuerpo → `Agenda una reunión` → `Pide un diagnóstico` → micro-línea →
  circuito de la señal.
- **Dominant decision:** agendar una reunión.
- **Density:** baja arriba, media en el cuerpo; la tabla de posición es el único bloque denso.
- **Depth model:** papel editorial para lectura; Midnight para firma, conversión y dock; sin glassmorphism ni glow.
- **Typography role:** Poppins 700 para H1 y H2; Geist 400 para lectura; Geist 600 para labels, overlines, chips y CTAs;
  fechas y rangos en Geist con `tabular-nums`; sin monoespaciada.
- **Color role:** azul Efeonce para lectura, enlaces, el arco de retorno y el estado `Ventas`; neutro medio para el estado
  `Clics`; Midnight para planos de firma y conversión; verde reservado **únicamente** al CTA de reunión; neutros para
  superficies. El color nunca es la única señal: cada estado tiene nombre visible.
- **Signature details:** circuito de cuatro nodos con el arco de retorno rotulado "La plataforma aprende"; control
  `Clics / Ventas` con reordenamiento de la lista; chips de estado por canal con icono y texto; rótulo visible de ejemplo
  ilustrativo en la firma.

## Desktop target

Composición a 1440×1000:

| Zona | Contenido | Proporción |
|---|---|---|
| Masthead Ohio global | Header del sitio en su variante de fondo claro | ~88 px |
| Hero, columna izquierda | Eyebrow · H1 en ≤2 líneas · cuerpo ≤3 líneas · CTA dual en una fila · micro-línea | 7 de 12 columnas |
| Hero, columna derecha | Circuito de la señal en HTML/SVG inline, cuatro nodos con texto real, arco de retorno destacado | 5 de 12 columnas |
| Borde inferior del fold | Arranque visible de la banda de definición | Anticipa que la página responde |

El H1 alcanza el tamaño display del sistema; el cuerpo, 18 px; los CTAs, 48 px de alto. El first fold no lleva carrusel,
video, tabla ni logos de plataformas.

## Mobile target

Transformación a 390×844:

| Orden | Contenido | Regla |
|---|---|---|
| 1 | Eyebrow | Una línea |
| 2 | H1 | ≤4 líneas, sin cortes de palabra |
| 3 | Cuerpo | ≤5 líneas |
| 4 | `Agenda una reunión` | Ancho completo, 48 px |
| 5 | `Pide un diagnóstico` | Enlace secundario de 44 px, alineado al inicio |
| 6 | Circuito de la señal | Vertical, cuatro nodos apilados y arco de retorno como línea lateral, debajo de los CTAs |
| 7 | Banda de definición | Comienza al hacer scroll corto |

El CTA primario queda dentro del primer viewport. El circuito nunca empuja los CTAs fuera del fold. Sin scroll horizontal
de página en ningún ancho.

## Token mapping

| Cue | Canonical token / primitive / recipe | Deviation |
|---|---|---|
| Azul de lectura, enlaces y estado `Ventas` | Rol `primary` de la paleta pública Efeonce | Ninguna |
| Estado `Clics` | Rol neutro secundario del sitio | Ninguna; siempre acompañado de su nombre |
| Plano de firma, conversión y dock | Rol `midnight` del sitio público, como en `#mecanismo` de influencers | Ninguna |
| CTA de reunión | Rol verde de CTA primario del sitio | Exclusivo del CTA de reunión |
| Superficie editorial | Rol de papel neutro del sitio | Ninguna |
| Tipografía display | Poppins 700 del sistema tipográfico | Ninguna |
| Tipografía de lectura y UI | Geist 400 / 600 | Sin peso 650 |
| Iconografía | Tabler `ti ti-*`, trazo lineal, sin disco de fondo | Iconos de función, nunca logos de plataformas |
| Tabla de posición | `ComparisonTable` (`greenhouse_comparison_table`) | Instancia nueva, sin fork |
| Carrusel de marcas | `greenhouse_social_trust` / `logoMarquee.v2` | Rótulo de empresa, no de línea |
| Formulario | `GrowthFormEmbed` + `GrowthFormEditorialBriefHost` | Campos propios del brief de performance |
| Scheduler | `NativeMeetingSchedulerHost` vía Growth CTA | Ninguna |
| Dock de conversión | Patrón page-scoped del dock de influencers | No se gradúa a primitive en esta task |
| Foco | Anillo doble del sistema | Ninguna |

Los valores literales —HEX, radios, sombras— se resuelven desde los tokens existentes del runtime público en el Slice 5;
esta dirección no introduce ninguno nuevo. **[verificar]** los nombres exactos de las variables CSS en
`eo-elementor-widgets` antes de escribir estilos.

## Lenguaje de imagen

- **Circuito de la señal:** diagrama editorial propio en SVG inline con nodos en HTML. Cuatro nodos —`Anuncio`, `Visita`,
  `Venta u oportunidad`, `La plataforma aprende`— unidos por una línea continua; el tramo de retorno va en azul primario
  y más grueso. Sin personas, sin pantallas de dashboards, sin logos.
- **Firma:** cuatro filas de campaña con nombre, descriptor corto y una barra horizontal de presupuesto relativo. Las
  barras no llevan cifras; la posición y el largo cuentan la historia.
- **Iconos de canal y módulo:** Tabler lineales de función —`ti-search` (búsqueda), `ti-users-group` (redes),
  `ti-brand-whatsapp` sólo si el owner aprueba el uso de marca, `ti-device-mobile` (video corto), `ti-briefcase` (B2B),
  `ti-world` (programmatic), `ti-shopping-cart` (retail media), `ti-message-chatbot` (asistentes de IA),
  `ti-message-circle` (conversación pública), `ti-chart-dots-3` (medición), `ti-adjustments-horizontal` (operación),
  `ti-bulb` (creatividad), `ti-shield-check` (gobierno), `ti-flask` (incrementalidad)— sin fondo.
- **Prohibido:** capturas de dashboards de Looker o de plataformas, gráficos al alza, contadores animados, logos de
  plataformas como prueba, fotos de stock de personas frente a pantallas, "equipos" generados por IA.

## Anti-patterns

- Contadores o KPIs animados; cualquier número que no tenga fuente y fecha visibles.
- Dashboard ficticio con ROAS o CPA.
- Muro de logos de plataformas o badges de partner no verificados.
- Una tarjeta por canal con el mismo peso visual que los módulos: los canales son cobertura, no el producto.
- Verde usado en más de una acción.
- Scroll pinning en la firma o animaciones ligadas al scroll.
- Texto crítico dentro de una imagen raster.
- Glassmorphism, glow, gradientes decorativos, cohetes y flechas al alza.

## Acceptance signature

- Promedio ≥4,5/5; jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template genérico, cada
  una ≥4,5/5; ninguna dimensión bajo 4/5.
- El first fold se lee en el orden declarado en desktop y en 390 px.
- Ningún bloque puede confundirse con la página legacy: sin contadores, sin dashboards, sin logos de plataformas.
- La firma se entiende sin leer el cuerpo: al cambiar a `Ventas`, el primer lugar de la lista cambia.
- Evidencia desktop, 390 px y reduced motion; `scrollWidth === clientWidth` en todos los anchos.
