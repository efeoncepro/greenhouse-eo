# TASK-1938 — Wireframe: informe PDF del Grader de visibilidad en IA con «La órbita»

Creado 2026-09-29 a partir de la propuesta que el operador pidió diseñar en el canvas. Describe, región por región,
las páginas que TASK-1938 debe producir en el renderer PDF del Grader, con sus datos, estados y reglas.

> **Estado 2026-09-29:** propuesta en canvas, **sin aprobar**. Mientras el operador no la apruebe, este wireframe es
> la intención de diseño y no un contrato de fidelidad: `UI ready` sigue en `no`.

- Visual direction mode: source-led (pendiente de aprobación).
- **Fuente editable:** canvas «Correo de Efeonce Insights», página «Informe del Grader (PDF)»,
  <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd>. Archivos `project/GraderPortada.dc.html`,
  `project/GraderNiveles.dc.html`, `project/GraderBrecha.dc.html`, `project/GraderMercado.dc.html` y
  `project/GraderContraportada.dc.html` (se leen con la tool Artifact). Cifras ilustrativas tomadas de
  `src/components/growth/ai-visibility/report-artifact/fixtures.ts`; copy de `src/lib/copy/growth.ts`.
- **Referencia de familia:** los catálogos premium de Efeonce Insights (TASK-1889) y su dirección
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`. El Grader se homologa al
  **lenguaje** de esa familia, no a su marca: no lleva el lockup de Efeonce Insights.
- **Master flow del programa:** [`EPIC-020-AEO-PROGRAM-UI-FLOW.md`](../flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md). Esta
  superficie es el render `PDF (vectorial A4)` del nodo **S14 (report artifact)** y el adjunto del nodo **S3 (email del
  informe)**. No agrega nodos ni rutas.

## Desktop Target

El «desktop» es el documento a tamaño físico: A4 a 96 dpi, 794×1123 px por página. Cinco páginas: portada, 02, 03, 04
y contraportada (hoy son cuatro: la contraportada es nueva).

### Portada (fondo tinta `#001a33` de «La órbita»)

| Región | Contenido | Regla |
|---|---|---|
| Cabecera | «Informe de visibilidad en IA» en versalitas + etiqueta con el período | copy `GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT.header.title`; período de `ReportHeader.periodLabel` |
| Marca evaluada | nombre de la organización a 68 px en la voz de idea; debajo la fecha de los datos | `header.organizationName`; nunca un nombre inventado |
| **Órbita que mide** | anillo fino, marca a las 12, arco con estela de 50° y esfera en `score × 3,6°`, con halo; dentro el puntaje grande, «de 100» y la etiqueta de gravedad | reemplaza al `Gauge` actual, que es un arco que se llena (un indicador de carga, prohibido por la línea). Única órbita de todo el documento. Sin puntaje (`null`): anillo sin arco ni esfera y «—» dentro |
| Veredicto | «Veredicto ejecutivo» + `headline.frame` con dos pesos (fuerte + liviano) | ningún texto cruza el anillo |
| Cobertura | motores evaluados, número de preguntas y motores que respondieron | de `provenance`; los nombres visibles de los motores (Gemini, ChatGPT, Claude, Perplexity) salen de `engine-roster.ts` [verificar] |
| Firma | logo de Efeonce en blanco, centrado abajo | archivo oficial de `@efeoncepro/axis-brand-assets`; sin «Preparado por Efeonce · efeoncepro.com» como texto suelto |

### Página 02 — Marco de evaluación y canales

- Encabezado corrido: «Informe de visibilidad en IA · [organización] · [período]» a la izquierda y el folio a la
  derecha, sobre un filete. Pie: «Preparado por Efeonce» y `efeoncepro.com`.
- «Niveles para existir en un internet de agentes»: leyenda de los dos ejes (percepción, operabilidad) y cinco filas
  (ordinal, nombre ES · EN, pregunta, puntaje + etiqueta de gravedad, o «En cobertura» cuando el nivel no tiene puntaje).
- «Canales de respuesta»: una barra por motor con el porcentaje de presencia y «N de M respuestas».

### Página 03 — Dónde enfocar

- «Brecha principal» en tarjeta navy: dimensión y puntaje, etiqueta de gravedad, título de la brecha a 36 px y
  «Movimiento recomendado» con la primera recomendación.
- «Por qué ocurre»: siete dimensiones con barra, puntaje y gravedad; la dimensión sin dato muestra «—» y «Sin dato»,
  nunca cero.
- «Calidad de la presencia»: tres cifras (share de citas, sentimiento con barra apilada positivo/neutral/negativo,
  prominencia mejor/promedio).

### Página 04 — Mercado y plan

- «Benchmark competitivo»: barras de menciones; «Tu marca» destacada.
- «Plan prioritario»: recomendaciones numeradas, cada una con título, gravedad y acción.
- «Proveniencia y metodología»: fecha de los datos, número de preguntas, versión del puntaje y del paquete de preguntas;
  debajo el aviso de alcance vigente (`model.disclaimer`).

### Contraportada (fondo tinta)

«¿Conversamos? / Cuando quieras.», una línea de invitación, la burbuja URL oficial + las redes de
`EFEONCE_SOCIAL_LINKS` (`src/config/efeonce-brand.ts`), y abajo el logo de Efeonce centrado con el eslogan de la
línea de servicio y la razón social. El eslogan sólo aparece aquí.

## Mobile Target

No aplica: el PDF se lee a tamaño físico. La lectura en pantalla es el informe web (`report-artifact/web`), fuera de
esta task (ver Out of Scope de la task).

## Action Hierarchy

Ver el puntaje y el veredicto → entender dónde enfocar (brecha principal) → revisar por qué (dimensiones y calidad) →
comparar con el mercado → leer el plan → contactar a Efeonce desde la contraportada. El documento no tiene acciones de
negocio; los enlaces (URL, redes) son reales.

## Visual Fidelity Mapping

- Paleta de «La órbita» en vez de la actual (`#023c70` + azul `#0375db`): tinta `#001a33` en portada y contraportada,
  navy `#023c70` en estructura y tarjeta de brecha, texto claro `#cfe4fa` sobre oscuro, acento turquesa sólo como
  gráfico sobre fondo oscuro o en cifras ≥ 24 px con contraste ≥ 3:1. Valores desde `efeonceGraphicLine`
  (`@efeoncepro/axis-tokens`), nunca escritos a mano en el componente; `report-pdf-tokens.ts` es el único mapa.
- Gravedad (crítico, atención, óptimo, sin dato) desde `axisSemanticHex`; la tinta oscura de «atención» (`warningInk`)
  se conserva para texto sobre papel.
- Tipografía: **decisión abierta** (ver Design Decision Log). La propuesta del canvas usa Bricolage para títulos y
  cifras y Poppins para estructura (sistema «La órbita»); los catálogos A4 de Insights usan Poppins + Geist.
- Logo de Efeonce y burbuja URL: archivos de `@efeoncepro/axis-brand-assets`; redes con el ícono de contorno de la
  firma de correo (`efeonceGraphicLine` email-signature `icons`).

## Copy Ledger

Todo el copy existente sigue en `src/lib/copy/growth.ts` (`GH_GROWTH_AI_VISIBILITY` y
`GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT`). Copy nuevo a agregar ahí: «¿Conversamos?», «Cuando quieras.», la línea de
invitación de la contraportada, «Preparado por Efeonce» del pie y el título «Lo que más pesa hoy» si el operador lo
aprueba (hoy la sección se titula «Brecha principal»). Validar con `greenhouse-ux-writing`.

## State Copy

| State | Qué se ve | Regla |
|---|---|---|
| informe completo | cinco páginas | ninguna |
| puntaje `null` | anillo sin arco ni esfera, «—» y «Sin dato» | nunca un arco en 0 |
| nivel sin puntaje | «En cobertura» | no se dibuja barra |
| dimensión sin dato | «—» y «Sin dato» en gris | nunca 0/100 |
| sin brecha principal (`primaryGap` ausente) | la tarjeta no se dibuja | no se inventa |
| sin benchmark competitivo | la sección no se dibuja | idem |
| motores que no respondieron | «N de M motores respondieron» | cobertura honesta |
| nombres largos (organización, competidores) | ajuste de línea | sin cortar con «…» |

## Accessibility Contract

Texto seleccionable; contraste AA medido en papel y en tinta; la gravedad nunca se comunica sólo por color (siempre va
la etiqueta); lectura verificada en escala de grises; enlaces con destino real.

## Implementation Mapping

- Superficie: `src/components/growth/ai-visibility/report-artifact/pdf/AiVisibilityReportPdf.tsx` (react-pdf) y sus
  tokens `report-pdf-tokens.ts`. `Nav placement: none`.
- Consumidor: `src/lib/growth/ai-visibility/public-delivery/email/build-report-attachment.ts` (adjunto del correo). No
  cambia su contrato: `renderAiVisibilityReportPdf(model, header)` sigue devolviendo el mismo buffer.
- Modelo: `ReportArtifactModel` (`report-artifact/model.ts`) sin cambios de forma.
- Fuentes: `src/lib/finance/pdf/register-fonts.ts`. Si se adopta Bricolage, react-pdf necesita instancias estáticas
  por peso (el archivo del repo es variable).
- Primitive: `extend` del renderer existente; sin librería nueva.

## GVC Scenario Plan

- Quality profile: premium.
- Scenario: **no aplica** GVC de portal (no hay ruta). Evidencia = PDF real renderizado con el fixture y con un
  informe real de staging, abierto página por página, en color y en escala de grises.
- Fidelidad: cada página contra la hoja aprobada del canvas (exportada a `docs/ui/visual-directions/TASK-1938-*/`),
  lado a lado en el dossier `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/`.
- Assertions: el test `report-artifact-pdf-no-leak.test.tsx` sigue verde; cifras iguales al modelo; fuentes embebidas.
- Scroll-width: no aplica a PDF.

## Design Decision Log

- **Lenguaje de Insights, marca de Efeonce.** El Grader es un diagnóstico público; Insights es un producto para
  clientes. Comparten sistema visual, no lockup.
- **La órbita mide el puntaje.** El `Gauge` actual se llena como un indicador de carga; la línea exige la esfera en la
  posición del valor con estela corta.
- **Una sola órbita** (la portada); el resto del documento usa barras y cifras.
- **Contraportada nueva** con contacto y eslogan, igual que las piezas de marca y los informes de Insights.
- **Motor sin cambiar en esta task (react-pdf).** Pasar al Artifact Composer es mejor a largo plazo, pero hoy el render
  es de a una salida cada 2 minutos y el correo del Grader adjunta el PDF en el momento; esa migración es un follow-up
  con su propio contrato.
- **Abiertas:** tipografía (Bricolage + Poppins o Poppins + Geist); si el turquesa oscuro va en ordinales y en «Tu
  marca» sobre papel (TASK-1889 lo limita a acento sobre navy); qué palabra del eslogan corresponde al Grader.
