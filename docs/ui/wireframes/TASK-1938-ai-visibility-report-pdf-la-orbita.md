# TASK-1938 — Wireframe: informe PDF del Grader de visibilidad en IA con «La órbita»

Creado 2026-09-29 a partir de la propuesta que el operador pidió diseñar en el canvas. Describe, región por región,
las páginas que TASK-1938 debe producir en el renderer PDF del Grader, con sus datos, estados y reglas.

> **Estado 2026-09-29:** propuesta en canvas, **sin aprobar**. Mientras el operador no la apruebe, este wireframe es
> la intención de diseño y no un contrato de fidelidad: `UI ready` sigue en `no`.

- Visual direction mode: source-led (pendiente de aprobación).
- **Fuente editable:** canvas «Correo de Efeonce Insights», página «Informe del Grader (PDF)»,
  <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd>. Archivos `project/GraderPortadaProspecto.dc.html`,
  `project/GraderPortadaCliente.dc.html`, `project/GraderQueHacer.dc.html`, `project/GraderPorQue.dc.html`,
  `project/GraderDonde.dc.html`, `project/GraderMercado.dc.html`, `project/GraderContraProspecto.dc.html` y
  `project/GraderContraCliente.dc.html` (se leen con la tool Artifact). Cifras del ejemplo tomadas de
  `src/components/growth/ai-visibility/report-artifact/fixtures.ts` y recalculadas con las reglas del modelo (ver
  «Datos»); copy de `src/lib/copy/growth.ts` salvo lo marcado como nuevo.
- **Referencia de familia:** los catálogos premium de Efeonce Insights (TASK-1889) y su dirección
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`. El Grader se homologa al
  **lenguaje** de esa familia, no a su marca: no lleva el lockup de Efeonce Insights.
- **Master flow del programa:** [`EPIC-020-AEO-PROGRAM-UI-FLOW.md`](../flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md). Esta
  superficie es el render `PDF (vectorial A4)` del nodo **S14 (report artifact)** y el adjunto del nodo **S3 (email del
  informe)**. No agrega nodos ni rutas.

## Dos audiencias, un documento

El informe se genera para **no clientes** (prospectos que piden el diagnóstico público) y para **clientes** (el
Grader es parte de su servicio). Decisión del operador, 2026-09-29: dos portadas y dos contraportadas; **a un cliente
nunca se le «ofrece» el Grader ni se le vende**. Las cuatro páginas interiores son las mismas.

| | No cliente (prospecto) | Cliente |
|---|---|---|
| Rótulo de portada | «Diagnóstico de visibilidad en IA» | «Informe de visibilidad en IA» |
| Identidad | nombre de la marca a 64 px | «Preparado para» + logo del cliente + nombre |
| Bajo la órbita | «Primera medición: tu punto de partida» | «▲ N puntos desde el [fecha anterior]» (`trend.overall`) |
| Contraportada | «¿Conversamos? / Cuando quieras» + «Agenda 30 minutos →» (enlace a la agenda, sin correo) + burbuja URL y redes | «¿Lo revisamos juntos? / Cuando quieras» + responsable de la cuenta + próximo informe; sin CTA comercial ni redes |

**Qué decide la variante:** el Grader ya identifica al cliente cuando el informe viene de uno, con su país y su logo
(perfil con organización, país y mercado en `provision-profile.ts`; logo por `resolveOrganizationLogoUrl` en `store.ts`;
operador, 2026-09-29). Con cliente identificado → versión cliente; lead del intake público → versión no cliente. La
variante es un dato del informe que el renderer recibe, nunca una deducción visual.

## Desktop Target

El «desktop» es el documento a tamaño físico: A4 a 96 dpi, 794×1123 px por página. Seis páginas por variante:
portada, 02, 03, 04, 05 y contraportada. Orden «respuesta primero»: qué hacer → por qué → dónde → mercado.

### Portada (fondo tinta `#001a33`)

| Región | Contenido | Regla |
|---|---|---|
| Cabecera | rótulo en versalitas (según variante) + etiqueta con el período | período de `ReportHeader.periodLabel` |
| Identidad | ver tabla de audiencias | nunca un nombre inventado; sin logo del cliente, «Preparado para» con el nombre solo |
| **Órbita que mide** | anillo fino, marca a las 12, arco con estela de 50° y esfera en `score × 3,6°`, con halo; dentro el puntaje, «de 100» y la etiqueta de gravedad | reemplaza al `Gauge` actual (arco que se llena). Única órbita del documento. Puntaje `null`: anillo sin arco ni esfera y «—» |
| Tendencia | ver tabla de audiencias | `trend.status` sin histórico → el texto de primera medición, nunca «▲ 0» |
| **Escala** | «0–39 Crítico · 40–69 Atención · 70–100 Óptimo», con su punto de color | umbrales de `src/lib/growth/ai-visibility/report/recommendations.ts` (`SEVERITY_CRITICAL_BELOW = 40`, `SEVERITY_ATTENTION_BELOW = 70`); nunca escritos a mano en el renderer |
| **Veredicto** | «Te encuentran, pero casi no te citan.» en dos pesos | un hallazgo de los datos (presencia óptima + citas críticas), no la frase comodín `headline.frame`; ver Copy Ledger |
| Cobertura | discos blancos con el logo de cada motor + «Evaluado en N motores de respuesta» y «N preguntas · N de M respondieron» | roster de `engine-roster.ts` |
| Firma | logo de Efeonce en blanco, centrado abajo | `@efeoncepro/axis-brand-assets`; sin eslogan (sólo cierra) |

### Página 02 — Qué hacer

- Encabezado corrido (rótulo · organización · período, folio) y pie «Preparado por Efeonce · efeoncepro.com» en todas
  las interiores.
- «Lo que más pesa hoy»: tarjeta navy con la brecha principal (dimensión y puntaje, gravedad), un titular que dice el
  hallazgo («Te mencionan, pero no te citan.») y la **evidencia** en vez de repetir la acción: «Solo 32 de cada 100
  respuestas con cita apuntan a tu sitio, y la fuente más citada sobre tu categoría es un tercero (g2.com, 18 de 45
  citas)» (`citationInsight` + `citationSourceBreakdown`).
- «Plan prioritario»: tres movimientos numerados con título, gravedad y acción, más una línea «Mueve [dimensión] · hoy
  N/100 · peso P % del puntaje». Sin «impacto esperado» mientras el modelo no lo traiga: no se inventa.

### Página 03 — Por qué ocurre

- «Siete dimensiones, con su peso»: una fila por dimensión con ícono, nombre en español, peso (`SCORE_DIMENSION_CONFIG`:
  25, 15, 15, 15, 15, 10, 5 %), barra **navy**, puntaje y gravedad como punto + etiqueta. Sin dato: «—» y «Sin dato».
- «Calidad de la presencia»: share de citas, sentimiento con barra apilada (positivo navy, neutral gris, negativo rojo) y
  prominencia (mejor posición y promedio).

### Página 04 — Dónde estás

- «Niveles para existir en un internet de agentes» con la leyenda de los ejes que dice qué niveles pertenecen a cada uno
  (Percepción: 01, 02, 03 y 05; Operabilidad: 04, según `REPORT_LEVEL_AXIS` de `model.ts`) y el eje en cada fila
  («Nivel 02 · Percepción»).
- El puntaje de cada nivel es el promedio ponderado de sus dimensiones (`REPORT_LEVEL_DIMENSIONS`); en el ejemplo:
  01 → 72 (óptimo), 02 → 51, 03 → sin dato (su única dimensión no tiene dato), 04 → en cobertura, 05 → 59.
- «Motor por motor»: logo del motor en disco, barra navy, porcentaje y «N de 24» con el punto de gravedad; el subtítulo
  nombra dónde más se pierde presencia (los dos motores más bajos).

### Página 05 — Mercado y fuentes

- «Participación de voz»: barras con el **porcentaje** de las menciones (48 → 33 %, 41 → 28 %, 32 → 22 %, 23 → 16 %,
  de 144) y las menciones debajo; «Tu marca» en navy, el resto en gris.
- «Fuentes que sostienen la respuesta»: dominios de `citationSourceBreakdown.domains` con su clasificación (terceros,
  comunidad, tu sitio, competidor) y las citas; el sitio propio destacado.
- «Procedencia y metodología»: fecha de los datos, número de preguntas, versión del puntaje y del paquete de preguntas;
  debajo el aviso de alcance vigente (`model.disclaimer`).

### Contraportada (fondo tinta, todo centrado en una sola columna)

- **Voz pregunta–respuesta** de la línea (`criteria.md` §4): pregunta a 24 px en Poppins Light con el anillo pequeño
  delante en el acento; respuesta «Cuando quieras» a 78 px en Bricolage 760 (3,25×) que cierra con la esfera del
  acento en lugar del punto; evidencia debajo en Poppins con una frase en negrita.
- Acción según la variante (tabla de audiencias). En la de no cliente el botón enlaza a la agenda (URL por definir) y
  debajo sólo «Elige el horario en la agenda de Efeonce»; nunca el correo comercial.
- **Bloque de marca** a 112 px de la acción: logo de Efeonce de 240 px y, debajo, el eslogan al **64 % del ancho del
  logo** (13,3 px; «Growth» en blanco porque mide menos de 24 px), separado 1,35 veces su cuerpo. La razón social al pie.

## Mobile Target

No aplica: el PDF se lee a tamaño físico. La lectura en pantalla es el informe web (`report-artifact/web`), fuera de
esta task (ver Out of Scope de la task).

## Action Hierarchy

Veredicto y puntaje → qué hacer (brecha y plan) → por qué (dimensiones y calidad) → dónde (niveles y motores) →
mercado y fuentes → siguiente paso (agendar si es prospecto; revisar con su equipo si es cliente). El documento no
tiene acciones de negocio; los enlaces (agenda, correo, URL, redes) son reales.

## Visual Fidelity Mapping

- Paleta de «La órbita» en vez de la actual (`#023c70` + azul `#0375db`): tinta `#001a33` en portada y contraportada,
  navy `#023c70` en estructura, barras y tarjeta de brecha, texto claro `#cfe4fa` sobre oscuro, acento turquesa sólo
  como gráfico (anillo, esfera, anillo de la pregunta) o en texto ≥ 24 px. Valores desde `efeonceGraphicLine`
  (`@efeoncepro/axis-tokens`); `report-pdf-tokens.ts` es el único mapa.
- **Gravedad sólo en etiquetas y puntos**, no en barras: las barras son navy (el ámbar a sangre saturaba la página y
  hacía que todo pareciera igual de urgente). Colores de `axisSemanticHex`; tinta oscura de «atención» (`warningInk`)
  para texto sobre papel.
- Tipografía **canónica de «La órbita»** (operador, 2026-09-29; `efeonceGraphicLine.type`): Bricolage Grotesque 760 para
  respuesta, titulares y cifras; Poppins 300 para la pregunta y 400/500 para el texto. No Geist.
- Logo de Efeonce y burbuja URL: archivos de `@efeoncepro/axis-brand-assets`; redes con el ícono de contorno de la
  firma de correo (`efeonceGraphicLine` email-signature `icons`).
- **Logos de los motores (obligatorio):** ChatGPT `public/images/logos/axis/gpt-isotype.svg`, Claude
  `claude-isologo.svg`, Gemini `gemini-isotype.svg`, Perplexity `perplexity-icon.svg`; Google AI Overview con la
  **lupa con destello de Google AI Mode** de AXIS (`apps/lab/public/references/ai-mode-magnifier-sparkle-on-light.svg`,
  guía `docs/agent-composition/search-boxes.md`), nunca el logo de Gemini. Disco blanco, logo al 55–60 %. Los SVG de
  ChatGPT y Claude pintan con `var(--fill-0, …)`: react-pdf y `<img>` no resuelven `var()`, así que se copian con el
  color literal (negro y `#D97757`).
- **Iconografía:** sólo el Trazo del catálogo de AXIS (`resolveIcon` de `@efeoncepro/axis-graphic-line/icons`, superficie
  clara, en reposo porque la pieza ya tiene la esfera de la portada); los cuatro grupos pasan `auditIconGroup`.
  Niveles: `busqueda`, `codigo` (legible por máquinas), `checklist`, `integracion` (lo pueden usar), `objetivo`.
  Dimensiones: `ia`, `crm`, `objetivo`, `medios`, `prensa`, `social`, `revenue`. Calidad: `prensa`, `social`,
  `medicion`. Procedencia: `calendario`, `composer`, `medicion`, `contrato`. Descartados por leerse mal: `contenido`
  (lápiz: escribir, no entender), `automatizacion` (flecha circular: «recargar»), `buscador` (parece un interruptor).

## Copy Ledger

Copy existente en `src/lib/copy/growth.ts` (`GH_GROWTH_AI_VISIBILITY`, `GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT`).
Nuevo, a agregar ahí y validar con `greenhouse-ux-writing`:

- Rótulos «Diagnóstico de visibilidad en IA» (prospecto) y «Preparado para» (cliente); «Primera medición: tu punto de
  partida»; «▲ N puntos desde el [fecha]»; la leyenda de la escala.
- **Nombres de las dimensiones en español** (hoy `SCORE_DIMENSION_CONFIG` sólo trae los nombres en inglés): Visibilidad
  en IA, Claridad de identidad, Dominio de la categoría, Participación de voz, Calidad de las citas, Alineación del
  mensaje, Intención de compra.
- Títulos de sección: «Qué hacer / Lo que más pesa hoy», «Por qué ocurre / Siete dimensiones, con su peso», «Dónde
  estás», «Motor por motor», «Participación de voz», «Fuentes que sostienen la respuesta», «Procedencia y metodología»
  (reemplaza «Proveniencia»).
- **Veredicto y titular de la brecha como hallazgo:** se eligen por reglas sobre los datos (p. ej. nivel 01 óptimo y
  citas críticas → «Te encuentran, pero casi no te citan»), con una frase por combinación aprobada; si ninguna regla
  aplica, se usa `headline.frame`. Nunca los escribe un modelo de lenguaje sin validación.
- Contraportadas: «¿Conversamos? / Cuando quieras», «Agenda 30 minutos», «o escríbenos a …» (prospecto); «¿Lo
  revisamos juntos? / Cuando quieras», «Tu equipo», «Próximo informe», «Medimos lo mismo, mes a mes» (cliente).

## State Copy

| State | Qué se ve | Regla |
|---|---|---|
| informe completo | seis páginas | ninguna |
| puntaje `null` | anillo sin arco ni esfera, «—» y «Sin dato» | nunca un arco en 0 |
| sin histórico (`trend` sin comparación) | «Primera medición: tu punto de partida» | nunca «▲ 0» |
| nivel sin dimensiones medidas | «—» y «Sin dato» | nunca 0 |
| nivel del eje de operabilidad sin probes | «En cobertura» | no se dibuja barra |
| dimensión sin dato | «—» y «Sin dato» en gris | nunca 0/100 |
| sin brecha principal (`primaryGap` ausente) | la tarjeta no se dibuja; el plan sube | no se inventa |
| sin benchmark o sin fuentes citadas | la sección no se dibuja | idem |
| motores que no respondieron | «N de M motores respondieron» | cobertura honesta |
| cliente sin logo | «Preparado para» con el nombre | sin marcador vacío en producción |
| cliente sin responsable de cuenta asignado | la tarjeta muestra el correo general de la cuenta | [verificar la fuente del responsable] |
| nombres largos | ajuste de línea | sin cortar con «…» |

## Accessibility Contract

Texto seleccionable; contraste AA medido en papel y en tinta; la gravedad nunca se comunica sólo por color (siempre va
la etiqueta); lectura verificada en escala de grises; enlaces con destino real.

## Implementation Mapping

- Superficie: `src/components/growth/ai-visibility/report-artifact/pdf/AiVisibilityReportPdf.tsx` (react-pdf) y sus
  tokens `report-pdf-tokens.ts`. `Nav placement: none`.
- Consumidor: `src/lib/growth/ai-visibility/public-delivery/email/build-report-attachment.ts`.
  `renderAiVisibilityReportPdf(model, header)` suma un campo de **audiencia** (`prospect | client`) resuelto antes del
  render, más el logo del cliente y el responsable de la cuenta cuando existen [verificar fuentes en Discovery].
- Modelo: `ReportArtifactModel` ya trae lo necesario para tendencia (`trend`), fuentes (`citationSourceBreakdown`),
  niveles (`levels` con su eje) y pesos (vía `SCORE_DIMENSION_CONFIG`); el PDF hoy no dibuja tendencia ni fuentes.
- Fuentes: `src/lib/finance/pdf/register-fonts.ts`. Si se adopta Bricolage, react-pdf necesita instancias estáticas
  por peso (el archivo del repo es variable).
- Primitive: `extend` del renderer existente; sin librería nueva.

## GVC Scenario Plan

- Quality profile: premium.
- Scenario: **no aplica** GVC de portal (no hay ruta). Evidencia = PDF real de cada variante, renderizado con el fixture
  y con un informe real de staging, abierto página por página, en color y en escala de grises.
- Fidelidad: cada página contra la hoja aprobada del canvas (exportada a `docs/ui/visual-directions/TASK-1938-*/`),
  lado a lado en el dossier `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/`.
- Assertions: el test `report-artifact-pdf-no-leak.test.tsx` sigue verde; cifras y gravedades iguales al modelo; el
  pie de cada página interior queda dentro de la hoja; fuentes embebidas.
- Scroll-width: no aplica a PDF.

## Design Decision Log

- **Lenguaje de Insights, marca de Efeonce.** Comparten sistema visual, no lockup.
- **Dos portadas y dos contraportadas por audiencia** (operador, 2026-09-29): a un cliente no se le ofrece el Grader.
- **Respuesta primero:** el ejecutivo sabe qué decidir en dos páginas; además resolvió que las páginas 02 y 03 de la
  primera propuesta no cabían (el pie quedaba fuera de la hoja).
- **La órbita mide el puntaje**, una sola en el documento.
- **Gravedad desde las reglas del modelo, no del fixture:** el fixture marca AI Visibility 72 como «atención», pero con
  el umbral real (≥ 70) es óptimo; y los niveles se calculan desde sus dimensiones. El diseño muestra lo que el modelo
  produciría. Revisar el fixture en Discovery.
- **Barras navy, gravedad en etiquetas.**
- **Contraportada en una columna centrada**, con la voz de la línea y el bloque de marca al 64 %; logo de 240 px (la
  norma del brochure lo pone en torno al 26 % del ancho) para que domine la respuesta.
- **Motor sin cambiar en esta task (react-pdf)**; migrar al Artifact Composer es un follow-up.
- **Logos de los motores y la lupa de Google AI Mode** (operador: «importantísimo»). El informe web hoy asigna a Google
  AI Overview el logo de Gemini: se corrige en el follow-up de paridad.
- **Resueltas (2026-09-29):** tipografía canónica de «La órbita»; la audiencia sale del cliente que el Grader ya
  identifica; «Agenda 30 minutos» lleva a la agenda, sin correo; el ejemplo del informe se corrige a los umbrales reales.
- **Abiertas:** la palabra del eslogan para el Grader; la URL de la agenda; la fuente del responsable de la cuenta.
