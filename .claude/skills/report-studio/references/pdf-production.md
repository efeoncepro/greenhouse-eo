# Producción verificable de PDF A4

Consulta de fuentes: 2026-09-04. Este módulo prescribe un flujo de trabajo; no certifica conformidad de un archivo.

## 1. Elegir el carril por el entregable

- PDF para lectura digital: A4 210 × 297 mm salvo tamaño explícito; texto seleccionable, fuentes incrustadas, links e índice.
- HTML para generar PDF: tratar HTML como matriz editorial, no como producto web que el cliente debe operar.
- DOCX editable: estilos nativos, tablas reales, encabezados/pies, títulos y campos; exportar conservando estructura.
- Imprenta: obtener especificaciones de impresión y variante PDF/X, ICC, sangrado y cajas antes de producir.
- Archivo a largo plazo: PDF/A requiere un flujo y validación específicos; no nace de guardar como PDF.
- Accesibilidad: PDF/UA requiere validación contra la versión aplicable y controles humanos; `tagged: true` no basta.
- PDF digital RGB y archivo de imprenta son entregables distintos. No convertir colores de marca a CMYK por costumbre.

## 2. Contrato de producción

Registrar título, cliente, autor, idioma, audiencia, propósito, período, corte de datos, versión y destino.
Identificar fuente editorial y fuentes de datos; conservar las cifras independientes de la composición.
Registrar assets oficiales, licencias de fuentes/imágenes, variantes de logo y origen de contacto institucional.
Consultar el estándar de marca de informes Efeonce: bubble URL, dirección y teléfonos en todas las páginas.
Incluir logo Efeonce y, en informes para clientes, logo del cliente. No sustituir logos por texto recreado.
Dimensionar desde el principio el cuerpo, cabecera y pie; un pie superpuesto no puede cubrir contenido.
No inventar un máximo universal de páginas: la densidad y la complejidad determinan la extensión.

## 3. HTML como fuente

Usar `html lang`, un título principal y una jerarquía de encabezados coherente.
El orden DOM debe conservar el sentido al leer sin estilos; no reorganizar semántica con grid/flex.
Usar tablas para relaciones entre filas y columnas; `caption`, `th` y asociaciones de encabezados cuando corresponda.
Las fichas pueden sustituir tablas anchas si preservan todos los campos y sus etiquetas.
Usar textos alternativos útiles para imágenes informativas y excluir decoración de la lectura asistiva.
Cada gráfico necesita título, unidad, período, fuente y una explicación textual; conservar datos accesibles.
No introducir texto esencial como background-image, canvas o imagen sin equivalente textual.
Ocultar navegación web y controles de impresión al exportar; mantener índice editorial y links.
Evitar alturas fijas en bloques de texto, `overflow:hidden` y escalado global para que todo quepa.
Configurar `@page` explícito y comprobar el soporte del renderer usado.

## 4. Render determinista

1. Fijar versión del renderer y registrar versiones de librerías relevantes.
2. Cargar media print antes de esperar fuentes: los estilos de impresión pueden activar assets adicionales.
3. Esperar `document.fonts.ready`, comprobar familia/peso requerido y estados de carga.
4. Decodificar imágenes y comprobar dimensiones; fallar ante recursos necesarios ausentes.
5. Esperar el estado final de gráficos y datos mediante señal explícita; no usar sleeps como prueba.
6. Desactivar animaciones/transiciones para exportación y aplicar reduced motion.
7. Exportar con `preferCSSPageSize: true`, `printBackground: true`, `tagged: true`, `outline: true` cuando el motor lo soporte.
8. Generar un archivo raw separado del acabado; escribir atómicamente para no reemplazar un entregable con bytes incompletos.
9. No imprimir secretos, URLs firmadas ni payloads privados cuando falla un recurso.

Playwright usa estilos print en PDF. Sus plantillas de cabecera/pie no heredan CSS de la página ni ejecutan scripts.
No asumir que las margin boxes o named pages de una especificación están soportadas: comprobar la salida real.
Un recurso cargado en pantalla puede faltar al exportar; la verificación decisiva pertenece al PDF generado.

## 5. Paginación e índice

- Mantener títulos con contenido posterior; evitar títulos solos al final de página.
- Repetir encabezados de tablas; comprobar que el motor conserva continuidad sin duplicar datos.
- Evitar cortes de filas cortas y fichas; permitir flujo cuando un bloque supera una página completa.
- Usar viudas/huérfanas como ayudas, no promesas de composición perfecta.
- Resolver tablas anchas mediante selección editorial de columnas, fichas o anexos; no reducir texto hasta volverlo ilegible.
- Generar índice visible y bookmarks desde la misma jerarquía de contenido.
- Exportar, extraer destinos, actualizar números, regenerar y verificar convergencia.
- Limitar iteraciones; si no converge, fallar con diagnóstico en vez de entregar números antiguos.
- Cada cambio de copy, fuente, tamaño, margen o figura invalida la paginación anterior.
- Verificar tanto el número visible como el destino del enlace; una coincidencia de conteos no basta.

## 6. Acabado y metadata

El acabado siempre parte del raw, nunca de la última salida ya estampada.
Preservar contenido, outline y links; guardar título, autor, asunto e idioma del documento final.
El título de metadata debe describir el informe, no ser un nombre temporal de archivo.
Registrar fecha de emisión/revisión con su significado; no inventar una fecha histórica de generación.
Fuentes añadidas al pie también deben incrustarse y conservar extracción de caracteres.
Los elementos repetitivos de paginación necesitan tratamiento de artefactos para no interrumpir la lectura.
Contacto significativo debe estar disponible al menos una vez en contenido accesible o colofón.
Las anotaciones nuevas de enlaces requieren asociación correcta si se busca conformidad PDF/UA.
Estampar con una librería PDF después de exportar tags puede introducir contenido sin etiquetar.
No afirmar que `StructTreeRoot` existente prueba que las adiciones quedaron accesibles.
No insertar identificadores PDF/UA o PDF/A en metadata antes de validar el estándar completo.

## 7. Carril Word

Usar estilos de título/cuerpo/listas, no formatos manuales que sólo simulan estructura.
Definir idioma, propiedades del documento, alt y links descriptivos antes de exportar.
Crear tablas nativas con encabezados identificados y repetir filas de encabezado cuando se extienden.
Evitar celdas combinadas innecesarias y layouts mediante tablas que confunden lectura.
Construir índice y referencias con campos; actualizar todos los campos y comprobar paginación al final.
Ejecutar Accessibility Checker y resolver hallazgos antes de exportar con etiquetas de estructura.
Registrar versión de Office y configuración; validar el PDF resultante aunque DOCX pase el checker.
Cuando una opción de exportación use servicio online, respetar el carril autorizado de datos del cliente.
Entregar DOCX sólo si forma parte del pedido; no sustituir el PDF solicitado por instrucciones de exportación.

## 8. Verificación automática con alcance honesto

- Comprobar tamaño A4 de todas las páginas, rotación, cajas y número total.
- Validar extracción de texto, embedding de fuentes y caracteres; un nombre de fuente no prueba incrustación.
- Comparar unidades completas con secuencia y multiplicidad; substring global deja pasar omisiones de celdas repetidas.
- Reconciliar métricas, denominadores y porcentajes con la fuente, no con texto duplicado del generador.
- Comprobar índice/bookmarks/destinos, enlaces tel/URL y ausencia de rutas locales temporales.
- Detectar cajas de texto que invaden márgenes y pie; tratar heurísticas de overlap como candidatos a revisión.
- Verificar título/autor/idioma y presencia de estructura; separar existencia de tags de corrección semántica.
- Advertir páginas anormalmente vacías; una página visual con poco texto puede ser válida y requiere criterio.
- Guardar hash final, versiones, fecha, métricas del QA y lista de limitaciones.
- Repetir acabado desde el mismo raw debe conservar texto, páginas y conteos de links sin duplicación.

## 9. Verificación humana

Inspeccionar la hoja de contacto y después cada página a tamaño de lectura; profundizar en los casos densos o sospechosos. La hoja de contacto sola no acredita revisión de todas las páginas.
Para afirmar revisión completa, registrar las páginas efectivamente revisadas; muestreo no equivale a totalidad.
Comprobar legibilidad, contraste, glifos, logos, notas, pies, cortes y sentido de cada gráfico.
Evaluar lectura asistiva y navegación por teclado sobre el PDF final, no sólo sobre el HTML fuente.
Revisar orden de lectura y relaciones Table/TR/TH/TD en tablas complejas y páginas con columnas.
Los checkers distinguen verificaciones humanas; no cerrar esas verificaciones por un resultado automático verde.
Declarar estados por dimensión: integridad, visual, navegación y accesibilidad; documentar lo no probado.

## 10. Fuentes primarias

- [Playwright Page.pdf](https://playwright.dev/docs/api/class-page#page-pdf): opciones del renderer y límites de plantillas.
- [W3C CSS Paged Media](https://www.w3.org/TR/css-page-3/): modelo de página; comprobar implementación real.
- [W3C PDF3](https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF3): orden de lectura y navegación; actualización 2025-07-15.
- [W3C PDF6](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF6): estructura de tablas; actualización 2025-09-25.
- [W3C PDF14](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF14): encabezados/pies como ayudas de orientación.
- [W3C PDF18](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF18): título del documento.
- [W3C PDF2](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF2): bookmarks.
- [Adobe accessibility verification](https://helpx.adobe.com/acrobat/using/create-verify-pdf-accessibility.html): controles automáticos y manuales.
- [Matterhorn Protocol 1.1](https://pdfa.org/download-area/publications/Matterhorn-Protocol-1-1.pdf): PDF/UA-1; no usar como prueba de PDF/UA-2.
- [Microsoft accessible PDFs](https://support.microsoft.com/en-gb/office/create-accessible-pdfs-064625e0-56ea-4e16-ad71-3aa33bb4b7ed): checker y exportación con estructura.
- [Word PDF Accessibility](https://learn.microsoft.com/en-us/office/pdf/word/wordpdfaccessibility): conservación de semántica en Office.
- [PDF Association PDF/X](https://pdfa.org/technical-side-and-requirements-of-pdfx/) y [Adobe output intents](https://helpx.adobe.com/ca/acrobat/using/output-intents-pdfs-acrobat-pro.html): carril de imprenta dependiente de especificación.
