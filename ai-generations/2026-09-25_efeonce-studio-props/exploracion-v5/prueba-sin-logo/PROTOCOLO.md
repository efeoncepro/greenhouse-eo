# Prueba sin logo — protocolo (v2, 2026-09-25)

## Pregunta
¿La línea gráfica (la órbita, el punto final, el anillo de pregunta, la lente y la paleta) hace que la gente reconozca a Efeonce en piezas **nuevas y sin logo**?

## Por qué cambió el diseño respecto de la v1
- **El reconocimiento de Efeonce en Chile es bajo** (`docs/context/15_panorama-competitivo-benchmark-industria.md`, §5). Con un panel en frío, casi nadie diría «Efeonce» en ninguna de las dos versiones: la prueba no mediría la línea, sino la fama previa. Por eso se agrega una **fase de aprendizaje**: primero se ven piezas con logo y después se atribuyen piezas nuevas sin logo. Es el diseño estándar para medir si una identidad transfiere la marca a piezas que no la muestran.
- **El tamaño de muestra de la v1 no alcanzaba.** Con 150 personas por versión sólo se detecta una diferencia de ~15 puntos. Para detectar 10 puntos (α = 0,05, potencia 80 %) hacen falta entre 199 y 356 por versión, según la tasa base (`potencia.mjs`). **Recomendado: 300 por versión (600 en total).**

## Diseño
- Entre sujetos, dos versiones asignadas al azar:
  - **Línea:** las piezas con la órbita, el punto final, el anillo, la lente y la paleta navy/teal.
  - **Distractor:** mismo copy, composición, foto y tipografía, sin órbita, esfera, anillo ni lente, y en gris neutro.
- **Fase 1, aprendizaje (con logo):** 4 piezas de la versión (`aprendizaje-L1…L4`) mezcladas con 4 piezas de relleno de marcas ficticias, 5 s cada una, en orden aleatorio. El relleno se produce aparte y es igual en las dos versiones.
- **Distracción:** 2 minutos con una tarea no relacionada (preguntas de hábitos de medios).
- **Fase 2, atribución (sin logo, piezas nuevas):** 8 piezas (`atribucion-R1…R8`), 5 s cada una, en orden aleatorio. Después de cada pieza se hacen las preguntas de atribución.

## Público
- Chile.
- Decisores o influenciadores de marketing y comercial: gerencia, jefatura o coordinación de marketing, marketing digital, comunicaciones o comercial.
- Empresas de 50 o más personas.
- Se excluyen trabajadores de agencias de publicidad, marketing o medios.

## Métrica principal y umbral
- **Atribución correcta asistida:** % de respuestas «Efeonce» en la pregunta cerrada, promediado sobre las 8 piezas.
- **Éxito:** la versión línea supera al distractor por **10 puntos o más**, con p < 0,05 (prueba z de dos proporciones sobre la tasa por persona; ver `analisis.mjs`).
- **Secundarias:**
  - atribución espontánea (pregunta abierta codificada);
  - atribución por pieza (qué aplicaciones cargan más la marca);
  - recuerdo de elementos (esfera, círculo u órbita, pregunta).

## Controles y riesgos conocidos
- **Emblema bordado:** en las fotos de R4, R5 y R6 se ve el emblema bordado en la ropa. Está igual en las dos versiones, así que no sesga la diferencia, pero es una pista de marca. Cuando exista el banco de fotos del brief O-08 (sin emblema legible), se reemplazan.
- **Canales en R8:** los íconos de Google, ChatGPT, Gemini y Perplexity aparecen en las dos versiones. Muestran dónde se mide; no implican alianza.
- **Sesgo de aquiescencia:** la pregunta cerrada incluye «No sé» y cinco competidores reales en orden aleatorio.
- **Atención:** se incluye una pregunta de control; quien la falle se excluye.

## Ejecución
- **Panel B2B en Chile** con cuotas por cargo. Proveedores a cotizar (sin precios verificados): Netquest, Cint y Toluna. Se pide cotización por completa para 600 personas con el filtro de cargo.
- **Plataforma de encuesta** con asignación aleatoria y control del tiempo de exposición (Qualtrics, SurveyMonkey Enterprise o la del panel).
- **Duración estimada:** 10–12 minutos.
- **Momento:** antes de lanzar la línea (esta medición) y otra vez a los 3 meses de uso público.

## Archivos
- `estimulos/`: 24 PNG (4 de aprendizaje y 8 de atribución, por versión).
- `CUESTIONARIO.md`
- `potencia.mjs`
- `analisis.mjs`: lee el CSV exportado.
