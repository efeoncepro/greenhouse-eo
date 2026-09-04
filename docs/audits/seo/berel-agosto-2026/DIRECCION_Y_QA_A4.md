# Dirección y revisión editorial A4 — 4 de septiembre de 2026

## Destino y criterio

El entregable es PDF A4 vertical para envío digital al cliente. HTML es únicamente la matriz de composición. No es una interfaz Greenhouse: no corresponden CompositionShell, controles de aplicación, motion ni gates TASK de producto. Se aplican los criterios de jerarquía, densidad, fidelidad de marca, accesibilidad y crítica visual de `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility` y `design-studio`, con revisión independiente en subagentes.

## Alternativas

1. Mantener el informe web y exportarlo: descartado; navegación lateral, glosario repetido y tablas demasiado pequeñas.
2. Convertirlo en diapositivas con pocas cifras: descartado; perdería el detalle necesario de auditoría y continuidad.
3. Informe editorial A4: elegido. Apertura ejecutiva, producción, comparativas, explicación visual, índice paginado, glosario y cuerpo completo con anexos.

## Contrato visual

- A4 vertical (210 × 297 mm), márgenes interiores de 17 mm laterales, 19 mm superior y 18 mm inferior; portada a página completa.
- Poppins 600 para títulos; Geist para datos y lectura. Fuentes incrustadas desde el paquete de marca con derechos declarados.
- Azules Efeonce, neutros y rojo editorial Berel. Logos oficiales sin recreación.
- Cuerpo 10,5 pt; tablas 9 pt; fichas 10 pt; cifras tabulares y contraste independiente del color.
- Iconografía SVG lineal coherente: búsqueda, análisis, contenido, enlaces, IA, tiempo, recorrido y comprobación. Complementa títulos textuales y no sustituye etiquetas.
- Cinco tablas narrativas convertidas en registros verticales: producción editorial, acciones y continuidad. Las 23 tablas restantes conservan comparación por columnas y cabeceras repetidas.
- Esquema explicativo de producción → visibilidad → visitas → acciones. No afirma un embudo cuantitativo ni una causalidad demostrada.
- Fotografía decorativa descartada: no aporta evidencia a este informe. Los gráficos y esquemas son vectores nítidos.
- Sin movimiento; lectura completa y estado de evidencia visible en papel. Índice con enlaces, folios reales y marcadores de navegación PDF.

## Verificación inicial (52 páginas; histórico)

Se genera con Chromium y se espera `document.fonts.ready`. Se inspecciona el PDF renderizado, no solo el HTML. Se comprueban tamaño de todas las páginas, fuentes, índice frente a marcadores, conservación de celdas y texto, presencia de T01–T33 y cortes de página. Los revisores inspeccionan las páginas 1–17, 18–35 y 36–52 en paralelo. Cualquier cambio posterior exige regenerar el mapa del índice y validar el PDF resultante.

Este PDF es para distribución digital en RGB, no un PDF/X para imprenta con perfil CMYK y sangrado.

## Resultado inicial (sustituido por revisión 4)

Los tres tramos se revisaron individualmente: 1–17 por el agente principal, 18–35 por el revisor UX y 36–52 por el revisor visual independiente. Ambos revisores pidieron explicitar «Prioridad» en las fichas del plan; corregido y comprobado en el PDF regenerado. También se corrigieron dos erratas y la referencia a «cuadro» del plan. Se uniformaron los encabezados/pies mediante acabado PDF posterior a la paginación. Índice real verificado: 13 secciones, 52 páginas; 648 celdas/campos conservados y los 33 hallazgos históricos presentes.

Veredicto: entrega digital A4 lista. No se detectaron solapamientos, recortes, tablas ilegibles ni encabezados huérfanos. La tabla del Grader continúa con una fila en la siguiente página, con cabecera repetida; se conserva para mantener el cuerpo de 9 pt y evitar reducir legibilidad.

Estado vigente: 55 páginas; ver `PRODUCT_DESIGN_AUDIT.md` y `README.md`. La revisión inicial anterior se conserva como evidencia de iteración, no como estado de entrega.
