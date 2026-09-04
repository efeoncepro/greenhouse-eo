# Calidad y entrega

Este módulo gobierna el archivo que recibirá el lector. Una captura del HTML, un render sin errores o un PDF con tags no bastan para aprobarlo.

## Matriz de aceptación proporcional

| Dimensión | Pregunta | Evidencia | Condición de rechazo |
|---|---|---|---|
| Cobertura | ¿Está todo lo solicitado? | Mapa encargo→sección→página | Falta una parte sustantiva |
| Evidencia | ¿Se puede reconstruir la afirmación? | Ledger, cálculo y fuente | Cifra sin procedencia o método inválido |
| Continuidad | ¿Explica qué cambió? | Registro de hallazgos anterior/actual | Cierre sin comprobación |
| Comprensión | ¿Se entiende sin al autor al lado? | Lectura independiente | Conclusión ambigua, jerga sin explicar |
| Responsabilidad | ¿Queda claro quién actúa? | Acciones con dueño y cierre | Trasladar al cliente nuestro trabajo |
| Identidad | ¿Emisor y cliente están bien representados? | Assets y contacto canónicos | Logo incorrecto o pie omitido |
| Composición | ¿Cada página se puede leer? | Inspección de todas las páginas | Cortes, superposiciones o texto ilegible |
| Navegación | ¿Se llega al contenido correcto? | Índice, enlaces y marcadores | Destinos ausentes o equivocados |
| Accesibilidad | ¿Qué se verificó realmente? | Semántica, orden, contraste y prueba asistiva | Declaración de conformidad no sustentada |
| Reproducción | ¿Puede regenerarse? | Scripts, datos, versiones y hashes | Fuente perdida o exportación acumulativa |

## Preflight automatizado

Usa `python scripts/check_pdf.py informe.pdf --manifest manifiesto.json --output qa.json`.
Requiere PyMuPDF ya disponible en el entorno; no instala dependencias. La ausencia de una dependencia es un problema de entorno, no un PDF aprobado. La plantilla del manifiesto describe la expectativa; ajústala al encargo antes de ejecutar.

El helper comprueba:

- Apertura del archivo, páginas y tamaño físico con tolerancia declarada.
- Rotación cero cuando el contrato pide retrato, metadata y título.
- Fuentes con bytes incorporados; extraibilidad de texto.
- Presencia del idioma y árbol de estructura si se exige, sin certificar su calidad.
- Texto requerido, conteos exactos de frases únicas y orden de unidades de contenido.
- Contacto esperado en cada página; enlaces requeridos y destinos internos válidos.
- Enlaces locales accidentalmente expuestos y marcadores fuera de rango.
- Huella del archivo y versión del inspector.

Unidades de contenido: usa frases o registros suficientemente específicos. No uses palabras comunes como prueba de cobertura. Para evitar falsos positivos, delimita las unidades a secciones o exige ocurrencias exactas sólo cuando realmente deben ser únicas. El orden extraído puede diferir del orden semántico en documentos con columnas; un fallo requiere inspección, nunca ocultarlo con una normalización excesiva. Normalizar espacios y Unicode es razonable; borrar números, signos o negaciones destruye la prueba.

El helper no verifica cálculos contra un proveedor, fidelidad de imágenes, colores de marca, orden semántico de tags, asociaciones complejas de tabla ni comprensión humana. Registra esas dimensiones aparte.

## Revisión visual del PDF final

1. Renderiza todas las páginas con un motor PDF; crea una hoja de contacto para detectar ritmo y anomalías.
2. Abre cada página a escala de lectura. La hoja de contacto sola no permite evaluar texto pequeño.
3. Revisa cabecera, pie, folio, inicio/final de párrafo, tablas, etiquetas, acentos, símbolos y contraste.
4. Inspecciona especialmente las páginas densas, gráficos, cambios de sección y última página.
5. Comprueba que un fondo no oculte texto ni que una superposición de postproceso cubra contenido.
6. Registra páginas revisadas, hallazgo, severidad, corrección y versión del PDF.
7. Después de corregir, exporta de nuevo. Si cambió la paginación, vuelve a revisar índice y todas las páginas afectadas.

Un gráfico con poco texto no es una página vacía. Un detector por caracteres sólo crea candidatos. Del mismo modo, dos imágenes por página no prueban que sean los dos logos correctos: inspecciona los assets y su apariencia.

## Revisión de comprensión

Pide al revisor responder sin consultar los scripts:

- ¿Cuál es el resultado principal y qué período cubre?
- ¿Qué cambia respecto al informe anterior?
- ¿Qué tres decisiones o actuaciones siguen y quién las ejecuta?
- ¿Qué indicador tiene una limitación que puede cambiar su interpretación?
- ¿Qué es trabajo producido y qué es resultado observado?

Si las respuestas requieren explicar oralmente el documento, corrige el texto. Para público básico, la terminología especializada debe explicarse en contexto. El glosario es ayuda secundaria.

## Revisión independiente

Usa subagentes sólo con autorización vigente. Asigna ownership por dimensión o rango de páginas para no editar simultáneamente el mismo archivo. Un editor final integra hallazgos y resuelve conflictos.

Un encargo útil: «Lee el PDF final y la evidencia; señala únicamente fallos concretos con página, efecto para el lector y corrección verificable». Evita «evalúa si se ve premium» sin criterios.

Para evaluar esta skill, usa `evals/cases.json`: entrega un caso a un agente que no haya redactado el módulo, observa qué recursos carga y exige evidencia de aceptación. Los casos son escenarios de evaluación, no pruebas ya ejecutadas. Guarda los resultados reales y sus límites.

## Severidad y cierre

- Bloqueante: dato material incorrecto, pérdida de contenido, identidad equivocada, corte ilegible, comparación engañosa.
- Mayor: navegación rota, responsabilidad ambigua, limitación decisiva escondida, contraste insuficiente.
- Menor: espaciado o consistencia local sin pérdida de significado.

Corrige bloqueantes y mayores. No congeles una entrega por preferencias menores no acordadas; registra la decisión editorial. No uses un puntaje propio de 9/10 como evidencia de aprobación.

Entrega: PDF o formato final pedido, fuente editable, evidencia reproducible y registro de QA. Conserva fecha, versión y alcance de revisión. No declares envío, publicación ni guardado remoto sin efectuarlo y leerlo de vuelta. El mensaje al usuario debe distinguir mejoras aplicadas de verificaciones que siguen pendientes.
