# TASK-1860 — Landing Trade Marketing & BTL — Visual Direction

## Estado y autoridad

- Status: `proposed — pending owner approval`. **Esta dirección no está aprobada.** Hasta que el owner de la línea
  la apruebe o la reemplace por un source externo aprobado, `UI ready` permanece `no`.
- Owner task: `TASK-1860`.
- Surface: sitio público WordPress/Ohio + Elementor, working route `/servicios/trade-marketing/`.
- Rigor: `ui-standard` con gate premium.
- Posicionamiento que gobierna el contenido: [PDR-021](../../public-site/decisions/PDR-021-landing-trade-marketing-btl-posicionamiento.md).
- Esta dirección gobierna composición, jerarquía, identidad visual, responsive y firma. **No** aprueba claims ni
  copy: el copy es hipótesis hasta el Slice 2 de la task.

## Mode and source

- Mode: `repo-native-benchmark`.
- Durable source: este documento.
- Provenance / approval: redactado 2026-09-10 a partir del catálogo canónico, PDR-021, el benchmark chileno y los
  precedentes vivos del sitio (`/servicios/agencia-de-influencers/`, `/servicio-marketing-de-contenidos/`).
  Aprobación pendiente del owner.
- Selected frame/state: dirección A, first fold desktop 1440×1000 y mobile 390×844.
- Alternativa válida: si el owner prefiere producir un export en Claude Design, esta dirección se usa como brief
  y la task cambia a `source-led` con el export versionado en `docs/ui/sources/TASK-1860/`.

## Problema perceptual a resolver

El visitante llega con una idea previa de lo que es una agencia de trade: gente en sala, fotos de exhibiciones y
un reporte a fin de mes. O con la de una plataforma: un tablero con semáforos. La página tiene que ubicar a
Efeonce **en otro lugar** en los primeros segundos, sin parecer ni lo uno ni lo otro, y sin mostrar datos que no
existen.

Lo que el ojo tiene que entender, en orden:

1. esto es trade marketing, para marcas;
2. lo que distingue es que prioriza, ejecuta y demuestra;
3. hay un siguiente paso claro y proporcional.

## Alternatives

### A — Góndola leída · **recomendada**

- **Idea:** la góndola es la protagonista. Una ilustración editorial de un anaquel real con seis puntos de
  lectura que, en la sección firma, se convierten en una lista priorizada. Lo que se ve es el mecanismo, no un
  resultado.
- **First fold:** eyebrow → H1 con `trade marketing` → cuerpo de tres líneas → CTA dual → micro-línea de
  cobertura → a la derecha, la góndola anotada con tres puntos visibles.
- **Densidad:** baja en hero, media en servicios, alta sólo en la tabla de posición.
- **Profundidad:** dos planos: papel editorial y plano Midnight para las secciones de mecanismo y firma.
- **Firma:** los puntos de lectura se ordenan en una lista priorizada con impacto y costo cualitativos.
- **Responsive:** la góndola se reduce a dos puntos visibles en 390 px; la lista priorizada siempre está en el
  DOM como `<ol>`, no depende de la animación.
- **Riesgo genérico:** bajo, si la ilustración es propia y específica del canal.

### B — Tablero de canal · rechazada

- First fold dominado por KPIs, semáforos y un mapa de tiendas.
- Comunica medición, pero **ubica a Efeonce en el comparison set del software** —Teamcore, Trax— justo donde la
  battlecard dice que no competimos.
- Exige números para verse creíble, y no hay números propios: terminaría en un dashboard ficticio, que es un
  antipatrón explícito del sitio público.

### C — Campo en movimiento · rechazada

- First fold con video o fotografía de activaciones, promotoras y sala en acción.
- Tiene energía, pero **ubica a Efeonce en el comparison set de las agencias de terreno** —Touch Latam, Novaprom—
  y compite por precio por persona.
- Requiere fotografía propia de terreno que no existe; el stock o la IA se leerían como prueba falsa.
- Pesa en LCP móvil.

## Decision

Se recomienda **A — Góndola leída**. Es la única de las tres que representa la posición real de la línea —en el
medio, ni software ni agencia—, se puede construir sin datos inventados ni fotografía de terreno, y hace visible
el mecanismo diferenciador. B y C quedan rechazadas porque cada una empuja a la página al comparison set que la
battlecard ordena evitar.

## Visual thesis

- **First-fold reading order:** eyebrow → H1 → cuerpo → `Agenda una reunión` → `Cuéntanos tu canal` →
  micro-línea → góndola anotada.
- **Dominant decision:** agendar una reunión.
- **Density:** baja arriba, media en el cuerpo; la tabla de posición es el único bloque denso.
- **Depth model:** papel editorial para lectura; Midnight para mecanismo, firma y dock; sin glassmorphism.
- **Typography role:** Poppins 700 para H1 y H2; Geist 400 para lectura; Geist 600 para labels, overlines y CTAs;
  cifras en Geist con `tabular-nums`; sin monoespaciada.
- **Color role:** azul Efeonce para lectura y enlaces; Midnight para planos de mecanismo; verde reservado
  **únicamente** al CTA de reunión; neutros para superficies. El color nunca es la única señal.
- **Signature details:** puntos de lectura numerados sobre la góndola; transformación a lista priorizada; chips
  cualitativos de impacto y costo; rótulo visible de ejemplo ilustrativo.

## Desktop target

Composición a 1440×1000:

| Zona | Contenido | Proporción |
|---|---|---|
| Masthead Ohio global | Header del sitio, no propio de la landing | ~88 px |
| Hero, columna izquierda | Eyebrow · H1 en ≤2 líneas · cuerpo ≤3 líneas · CTA dual en una fila · micro-línea | 7 de 12 columnas |
| Hero, columna derecha | Góndola anotada, tres puntos visibles, sin texto crítico dentro de la imagen | 5 de 12 columnas |
| Borde inferior del fold | Arranque visible de la banda de definición | Anticipa que la página responde |

El H1 alcanza el tamaño display del sistema; el cuerpo, 18 px; los CTAs, 48 px de alto. El primer fold no lleva
carrusel, video ni tabla.

## Mobile target

Transformación a 390×844:

| Orden | Contenido | Regla |
|---|---|---|
| 1 | Eyebrow | Una línea |
| 2 | H1 | ≤4 líneas, sin cortes de palabra |
| 3 | Cuerpo | ≤5 líneas |
| 4 | `Agenda una reunión` | Ancho completo, 48 px |
| 5 | `Cuéntanos tu canal` | Enlace secundario de 44 px, alineado al inicio |
| 6 | Góndola | Reducida, dos puntos visibles, debajo de los CTAs |
| 7 | Banda de definición | Comienza al hacer scroll corto |

El CTA primario queda dentro del primer viewport. La góndola nunca empuja los CTAs fuera del fold. Sin scroll
horizontal de página en ningún ancho.

## Token mapping

| Cue | Canonical token / primitive / recipe | Deviation |
|---|---|---|
| Azul de lectura y enlaces | Rol `primary` de la paleta pública Efeonce | Ninguna |
| Plano de mecanismo y firma | Rol `midnight` del sitio público, como en `#mecanismo` de influencers | Ninguna |
| CTA de reunión | Rol verde de CTA primario del sitio | Exclusivo del CTA de reunión |
| Superficie editorial | Rol de papel neutro del sitio | Ninguna |
| Tipografía display | Poppins 700 del sistema tipográfico | Ninguna |
| Tipografía de lectura y UI | Geist 400 / 600 | Sin peso 650 |
| Iconografía | Tabler `ti ti-*`, trazo lineal, sin disco de fondo | Ninguna |
| Tabla de posición | `ComparisonTable` (`greenhouse_comparison_table`) | Instancia nueva, sin fork |
| Carrusel de marcas | `greenhouse_social_trust` / `logoMarquee.v2` | Rótulo de empresa, no de línea |
| Formulario | `GrowthFormEmbed` + `GrowthFormEditorialBriefHost` | Campos propios del brief de canal |
| Scheduler | `NativeMeetingSchedulerHost` vía Growth CTA | Ninguna |
| Dock de conversión | Patrón page-scoped del dock de influencers | No se gradúa a primitive en esta task |
| Foco | Anillo doble del sistema | Ninguna |

Los valores literales —HEX, px de radios, sombras— se resuelven desde los tokens existentes del runtime público en
el Slice 5; esta dirección no introduce ninguno nuevo. **[verificar]** los nombres exactos de las variables CSS en
`eo-elementor-widgets` antes de escribir estilos.

## Lenguaje de imagen

- **Góndola:** ilustración editorial propia —vector o 3D sobrio—, con productos genéricos sin marcas reales, luz
  de sala y perspectiva frontal. Se curan primero las librerías y las ilustraciones propietarias de Efeonce; sólo
  se genera si no hay pieza apropiada, con divulgación visible.
- **Puntos de lectura:** círculos numerados de 28 px, contraste AA sobre la ilustración, con nombre accesible.
- **Iconos de servicio:** Tabler lineales —`ti-building-store`, `ti-clipboard-check`, `ti-list-numbers`,
  `ti-truck-delivery`, `ti-speakerphone`, `ti-map-pin`, `ti-calendar-event`, `ti-device-analytics`— sin fondo.
- **Prohibido:** fotos de stock de supermercados, personas en sala generadas por IA presentadas como equipo real,
  tableros con cifras, mapas de calor inventados.

## Anti-patterns

- Muro de 23 tarjetas de servicio.
- Dashboard ficticio o semáforos con números inventados.
- Fotografía de promotoras o sala de stock.
- Hero con video pesado en móvil.
- Comparación que nombra competidores.
- Verde usado en más de una acción.
- Scroll pinning en la sección firma: el precedente de Content Marketing muestra el costo en viewports bajos.
- Texto crítico dentro de la ilustración.
- Glassmorphism, glow y gradientes sin función.

## Acceptance signature

- Promedio ≥4,5/5; jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template
  genérico, cada una ≥4,5/5; ninguna dimensión bajo 4/5.
- El first fold se lee en el orden declarado en desktop y en 390 px.
- Ningún bloque puede confundirse con un software de ejecución ni con una agencia de promotoras.
- Evidencia desktop, 390 px y reduced motion; `scrollWidth === clientWidth` en todos los anchos.
