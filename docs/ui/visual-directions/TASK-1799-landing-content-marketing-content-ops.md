# TASK-1799 — Dirección visual: Sistema de Contenidos Vivo

## Meta

- Task: `TASK-1799`
- Surface: landing pública Content Marketing
- Mode: `repo-native-benchmark`
- Rigor: `ui-standard`
- Status: selected direction; implementation not authorized by this document
- Thesis: **una idea se transforma en un sistema visible**

## Decision

Seleccionar **Sistema de Contenidos Vivo — «La idea que se multiplica»**. La experiencia sigue una
unidad editorial desde su research hasta sus expresiones por canal. El hilo visual no es una línea de
producción impersonal: es una corriente gobernada donde el equipo del cliente puede ver decisiones,
versiones, responsables y siguiente paso.

La landing debe sentirse como entrar a la operación, no como mirar una colección de servicios. La
inmersión nace de causalidad —cada gesto revela qué cambió y por qué—, escala tipográfica, profundidad
controlada y continuidad espacial. No depende de video, 3D, sonido ni un scroll secuestrado.

## Alternatives

### A — Sistema de Contenidos Vivo — selected

- Visual central: un núcleo editorial que empieza como pregunta/insight y se expande en brief,
  artículo, reel, post, historia, banner, email o sales asset.
- Gramática: corriente, nodos, capas de evidencia y estados de revisión.
- Sensación: precisa, humana, contemporánea, transparente.
- Ventaja: demuestra partnership y operación; une estrategia, craft y distribución.
- Riesgo: convertirse en diagrama técnico. Se mitiga con copy humano, arte editorial y una sola
  lectura dominante por fold.

### B — Revista editorial cinética — rejected

- Visual central: spreads, titulares gigantes, crops fotográficos, marginalia y collage.
- Ventaja: expresa oficio editorial y podría dar una firma visual fuerte.
- Rechazo: sobrepondera craft/Think; el visitante podría interpretar «estudio editorial» y seguir sin
  entender revisión, atomización, CMS, responsabilidades o operación diaria.

### C — Content Factory / command center — rejected

- Visual central: consola oscura, pipelines, métricas, agentes y entregables entrando/saliendo.
- Ventaja: hace visible escala y orquestación.
- Rechazo: suena a fábrica autónoma y software; debilita el partnership humano, puede confundirse con
  Globe y empuja a dashboard/card soup. También convierte herramientas en protagonista.

## First-fold reading order

1. Eyebrow: `CONTENT MARKETING · CONTENT OPS`.
2. H1: categoría + diferenciador de partnership.
3. Subcopy: qué hace Efeonce y qué cambia para el equipo.
4. CTA primario; CTA secundario subordinado.
5. Núcleo visual: una idea y su transformación, comprensible como imagen estática.
6. Micro-proof: operación visible, CMS del cliente y modelos flexibles; sólo claims aprobados.

El H1 y CTA ocupan el primer plano semántico. El núcleo visual es dominante en impacto, no en orden de
lectura ni accesibilidad. Ningún claim aparece sólo dentro de una animación.

## Desktop target — 1440

### Composition

- Hero de 80–95vh sin bloquear el comienzo de la siguiente región.
- Grid asimétrico aproximado 5/7: copy a la izquierda, stage a la derecha, con una corriente que cruza
  el gutter y conecta ambos lados.
- Un único plano oscuro inmersivo para hero/sistema; transición a papel editorial claro para evidencia
  y business case; cierre oscuro de conversión que recupera el núcleo.
- El stage admite una escena pinned localizada durante el sistema, nunca una página completa pinned.
- Ritmo alterna macro-secciones abiertas, bands de evidencia y una sola superficie de revisión cuando
  la semántica exige containment.

### Signature moment

Una ficha/idea entra como research. Al avanzar, su contorno conserva identidad mientras aparecen
capas: hipótesis, fuentes, brief, contenido madre, feedback y derivados. Los formatos no explotan como
confeti; se organizan alrededor de una decisión central y muestran por qué cada canal requiere una
adaptación distinta.

## Mobile target — 390

- Hero vertical: eyebrow → H1 → copy → CTAs → stage estático/compacto.
- La corriente se convierte en espina vertical de capítulos con nodos numerados; no hay rail ancho.
- El stage no se pinnea. Cada capítulo revela su estado final al entrar, o queda estático con reduced
  motion.
- Atomización usa selector/tabs con targets táctiles y contenido visible debajo; no carousel que oculte
  la existencia de formatos.
- Modos de operación se presentan como matriz por responsabilidad con header persistente local, no
  como tres cards largas repetitivas.
- CTA puede reaparecer en hitos, pero no como sticky bar que tape contenido o controles del navegador.

## Action hierarchy

- Primary: `Conversemos sobre tu operación de contenidos`.
- Secondary: `Mira cómo trabajamos`, ancla al sistema.
- Tertiary: enlaces contextuales a servicios hermanos y artículos de soporte.
- Exploratory controls: derivados y modos; apariencia de selector, no CTA comercial.
- El primario conserva label e intención en hero y cierre. No alternar con «Cotiza», «Agenda» o
  «Contáctanos» como si fueran objetivos distintos.

## Density, depth and surface economy

- Densidad editorial: títulos grandes, cuerpo compacto y evidencia suficiente; no párrafos pared.
- Tres planos máximos por fold: base, contenido operativo y estado seleccionado/floating.
- Cards sólo cuando existe objeto con boundary real: artefacto, frame de revisión o respuesta FAQ.
- Dividers, rails, bandas y cambios de fondo hacen el trabajo de agrupación antes que bordes/radios.
- Notion/Frame.io no se reconstruyen como dashboards completos. Se muestran artefactos concretos y
  rotulados dentro de la narrativa.

## Typography roles

- Display: tipografía pública de marca vigente, gran contraste de escala y ancho controlado; máximo
  10–12 palabras legibles por bloque antes del wrap responsive.
- Body: alta legibilidad, line length de lectura editorial.
- Mono/utility: reservado para estados, pasos, fuentes o labels de formato; nunca cuerpo completo.
- La palabra «partner» no se trata como sticker decorativo; la demuestra la operación.

## Color roles

- `Midnight`: escenario de hero/sistema, profundidad y foco.
- `Electric blue/cyan`: corriente activa, enlaces y señal de transformación.
- `Paper/ice`: evidencia, lectura larga y transición editorial.
- `Warm signal` o `lime signal`: sólo para estado aprobado/siguiente paso; nunca segundo color de marca
  dominante ni decoración indiscriminada.
- Colores exactos se obtienen del sistema público vigente después del audit. Este documento fija roles,
  no autoriza hex literales.

## Imagery and evidence

- Prioridad: screenshots/artefactos reales aprobados, recortados y redactados; luego demostraciones
  conceptuales claramente rotuladas; por último ilustración abstracta.
- Evitar stock de «equipo mirando laptop», manos con post-its y grids de logos como sustituto de prueba.
- Mostrar research, comentario, estado o versión sólo si el texto puede leerse públicamente.
- Logos de Notion, Frame.io, WordPress, Drupal, Webflow o Modyo nombran compatibilidad/uso, no alianza.

## Token mapping

Los roles `Midnight`, `Electric`, `Paper` y `Signal` se resuelven contra tokens/variables vigentes del
sitio público antes de implementación. Tipografía, spacing, radius, elevation y timings siguen la
misma regla: una variable semántica page-scoped puede adaptar el runtime, pero ningún valor literal
disperso se convierte en lenguaje de diseño. La firma visual viene de composición, contraste de escala
y continuidad causal, no de inventar una paleta paralela.

## Implementation mapping

| Intent | Public-site implementation | Constraint |
|---|---|---|
| Stage inmersivo | root `gh-content-marketing-*` + CSS variables de rol | page-scoped; sin override global Ohio |
| Corriente causal | SVG semánticamente decorativo + CSS transforms | estado final existe en HTML; reduced motion |
| Artefacto seleccionado | `landing-pattern` dentro del mismo scope | no nested card wallpaper |
| Proof frame | figure/figcaption con asset aprobado | alt/aria y redacción obligatorios |
| Selector de derivados | buttons/tabs semánticos | keyboard, touch, focus, contenido no hover-only |
| Captura | `GrowthFormEmbed`/CTA/Meetings vigente | no form ni routing paralelo |
| Motion | CSS/JS page-scoped, posible GSAP ya presente | cero dependencia nueva sin justificación |

## Motion character

- Preciso: desplazamientos cortos, continuidad de origen y destino.
- Causal: una transición responde a scroll localizado o selección explícita.
- Interrumpible: nunca bloquea scroll, click, tab o lectura.
- Calmado: no ambient loops permanentes ni movimientos que compitan con el texto.
- Equivalente: reduced motion y JS-off preservan orden, significado y CTA.

## Signature details

- Una línea/corriente atraviesa sistemas sin convertirse en timeline corporativo genérico.
- Cada derivado conserva una marca visual de su idea madre, pero cambia estructura y ratio por canal.
- Los comentarios/revisión se representan como decisiones resueltas, no como burbujas decorativas.
- El cambio dark → paper ocurre cuando la promesa se convierte en evidencia.
- El cierre reúne de nuevo los derivados en una vista de operación completa: el sistema aprende.

## Anti-patterns

- Card grid de seis servicios con iconos intercambiables.
- «AI-powered content factory» o lenguaje de volumen infinito.
- Mockup de software falso presentado como producto Efeonce.
- Scroll hijacking, cursor personalizado, autoplay audible, parallax profundo o 3D pesado.
- Texto que aparece tarde o queda oculto si falla JS.
- Marquee de logos como única prueba.
- Herramientas más grandes que el resultado o el equipo.
- Desktop reducido proporcionalmente en mobile.
- Gradientes, glows y glass usados como decoración sin función.

## Acceptance signature

La dirección está lista para implementar sólo si el first fold puede responder en cinco segundos:
qué se ofrece, para quién, por qué es distinto y qué hacer; y si la misma escena, congelada, sigue
explicando que una idea se convierte en un sistema gobernado. Si la experiencia necesita ser vista en
movimiento para entenderse, la dirección se considera fallida.
