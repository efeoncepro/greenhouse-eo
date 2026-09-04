# Diseño editorial para informes de lectura autónoma

Este módulo convierte la arquitectura de lectura en páginas reales. El destino es el archivo solicitado,
no una captura de una web ni una presentación de diapositivas. Usa [producción](pdf-production.md)
para implementar la exportación y [QA](quality-and-delivery.md) para comprobarla.

## 1. Fijar el contrato físico antes del layout

- Registra formato final, orientación, impresión prevista, lectura digital y necesidad de edición.
- Para A4, verifica 210 × 297 mm en el PDF; una ventana de navegador con proporción similar no basta.
- Define caja de contenido, márgenes, encabezado, pie, folio y espacio de seguridad antes de componer.
- El tamaño del pie se reserva en todas las páginas, incluida la portada si lo exige el emisor.
- Prueba una página de apertura, una tabla extensa y una ficha de acción antes de maquetar el resto.
- No traslades un canvas 16:9 a A4 con escalado automático: rediseña jerarquía y distribución.
- No fijes un número arbitrario de páginas a costa de legibilidad o evidencia solicitada.

## 2. Dirección visual y marcas

Carga el [overlay Efeonce](efeonce-overlay.md) y el canon de marca vigente; no copies colores,
contactos ni familias tipográficas de un informe anterior sin verificar su procedencia.

- Reutiliza una dirección aprobada; compara alternativas sólo si hay una decisión visual abierta.
- Define roles de color: texto, superficie, acento, comparación y estado. Evita significados ambiguos.
- Usa logos oficiales en la variante adecuada para el fondo; conserva proporciones y zona de reserva.
- Un informe de cliente incluye identidad del emisor y del cliente sin simular una nueva marca conjunta.
- No conviertas el color del cliente en una alerta ni asignes verde por convención si no está autorizado.
- No reconstruyas un logo con texto, filtros o un dibujo generado cuando existe el activo oficial.
- Mantén activos, licencias y fuentes trazables en el paquete editable.

## 3. Retícula y ritmo

La retícula debe ayudar a reconocer funciones: título, contenido, evidencia, acción y referencia.
Una columna principal suele favorecer texto prolongado; dos columnas sirven para bloques breves,
comparaciones o datos relacionados. Elige por longitud real, no por simetría decorativa.

- Conserva alineaciones, sangrías y separación entre elementos equivalentes.
- Usa más espacio para separar asuntos distintos que para separar título y texto asociado.
- Evita cajas independientes alrededor de cada párrafo: fragmentan la lectura y consumen superficie.
- Una página ejecutiva puede ser aireada; una página de método puede ser densa sin volverse diminuta.
- No fuerces una página nueva para cada subtítulo cuando produce hojas casi vacías sin función.
- No llenes un vacío inevitable con imágenes irrelevantes ni datos redundantes.
- El ritmo se evalúa en la secuencia de páginas, además de en cada página aislada.

## 4. Tipografía en tamaño físico

- Usa la familia institucional para cada rol y confirma que los pesos realmente existen.
- Establece estilos para título, subtítulo, cuerpo, cifra, tabla, referencia y pie; no estilos por página.
- Como punto de partida editorial, prueba cuerpo de 10.5–12 pt y tablas de 9–10 pt en A4.
- Estos rangos son heurísticas internas: valida la fuente real y el público a tamaño de lectura.
- Si una tabla no cabe, simplifica columnas, cambia su estructura o distribúyela; no reduzcas todo.
- Evita párrafos largos en mayúsculas, tracking excesivo y grandes cantidades de negrita.
- Usa negrita para puntos de entrada; no para compensar una estructura sin jerarquía.
- Alinea cifras comparables por columna y usa cifras tabulares cuando la fuente las soporte.
- Revisa signos menos, porcentajes, tildes, separadores y unidades después de exportar.
- Comprueba fuentes incrustadas o sustituciones; el CSS correcto no demuestra el resultado PDF.

## 5. Jerarquía de lectura y navegación

El lector debe poder obtener las conclusiones, luego explorar su evidencia sin perderse.
La guía de [Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/writing-about-data/)
respalda ordenar primero lo importante y usar encabezados que anticipen el contenido.

- Incluye título específico, período, cliente y emisor visibles en la apertura.
- Ofrece índice con páginas reales y enlaces internos cuando la extensión lo justifica.
- Mantén una jerarquía semántica de títulos; un texto grande no sustituye un encabezado estructural.
- Usa encabezados corrientes discretos para identificar capítulo y folios continuos.
- Conserva IDs de hallazgo, figura y acción para referencias estables entre versiones.
- Los encabezados deben describir temas o conclusiones; evita secciones intercambiables y vagas.
- Cada apertura de capítulo puede resumir resultado, interpretación y siguiente paso.
- No repitas una síntesis completa en portada, introducción, resumen y apertura de cada capítulo.
- Una referencia al detalle incluye sección o ancla identificable, no sólo «ver más adelante».

## 6. Tablas y fichas

- Usa tablas para consulta exacta y comparación entre atributos estables.
- Declara unidad en cabecera o título y explica abreviaturas necesarias.
- Repite cabeceras al continuar en otra página y verifica que el lector identifica la continuación.
- Alinea texto a la izquierda y cifras comparables de manera consistente; evita centrado masivo.
- Conserva cada fila legible. Si la fila ocupa casi una página, considera una ficha estructurada.
- No cortes una decisión entre páginas separando hallazgo, implicación y acción imprescindible.
- Una ficha de acción incluye asunto, evidencia, responsable, dependencia y criterio de cierre.
- Los estados necesitan texto explícito; un punto de color sin etiqueta es insuficiente.
- No inventes responsables, fechas o severidades para completar una composición.
- Las tablas extensas permanecen auditables aunque una visualización resuma sus resultados.

## 7. Figuras, iconos e imágenes

Aplica [visualización de datos](data-visualization.md) a gráficos cuantitativos.
Para recursos no cuantitativos, exige una función: explicar proceso, identificar sección o demostrar algo.

- Usa una familia de iconos coherente en grosor, tamaño óptico y tratamiento.
- Acompaña iconos informativos de texto; no exijas aprender un vocabulario visual nuevo.
- Usa diagramas para relaciones verificadas; una flecha no debe sugerir causalidad inexistente.
- Las capturas de evidencia incluyen contexto, fecha y una región legible; oculta datos ajenos.
- Las fotografías requieren pertinencia y derechos. No son obligatorias para lograr calidad editorial.
- Mantén título, figura, explicación esencial y fuente próximos; evita una leyenda en la página siguiente.
- Las imágenes decorativas no deben alterar el orden de lectura ni ocultar contenido significativo.

## 8. Revisión editorial del archivo final

Recorre todas las páginas; luego inspecciona las densas, tablas y pies a escala de lectura.
Busca cortes, huérfanas, encabezados aislados, saltos sin intención y gráficos con etiquetas pequeñas.
Prueba si un revisor no especialista localiza la conclusión, su salvedad y la acción correspondiente.
Registra qué se inspeccionó y las limitaciones: una revisión independiente no equivale a validación del cliente.

Fuentes de criterio: [ONS Principles](https://service-manual.ons.gov.uk/data-visualisation/guidance/principles)
y [Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/writing-about-data/),
consultadas el 2026-09-04. Los rangos físicos y decisiones de composición anteriores son heurísticas
operativas del estudio; no son requisitos de ONS ni prueba de conformidad con un estándar.
