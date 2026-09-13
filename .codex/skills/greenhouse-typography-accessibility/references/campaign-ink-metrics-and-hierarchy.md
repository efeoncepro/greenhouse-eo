# Tipografía de campaña: cajas de tinta, jerarquía y composición exacta

Rama editorial fuera de la UI. Complementa
[editorial-typography-brand-audit](../../social-media-studio/references/editorial-typography-brand-audit.md).
Caso y evidencia: [Fiestas Patrias 2026](../../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md).
No cambia Poppins/Geist, variantes, tokens ni pesos autorizados de producto.

## Decidir por significado

Asignar a cada tramo una función antes de elegir tamaño: entrada, afirmación dominante, remate, saludo,
firma. Contrastar por escala y peso dentro de la lectura, no poniendo todo en ExtraBold. En seasonalities
Efeonce, Bricolage puede llevar la idea dominante y Poppins su entrada/apoyo, usando los archivos reales.
No añadir una línea secundaria sólo para utilizar otra familia.

Para este caso, la portada lee `Hay cosas que / no necesitan / rediseño`: Poppins 500 y Bricolage 750/800.
Es un contraste deliberado permitido en campaña, no un precedente para introducir peso 500 en la UI.
La palabra “rediseño” domina porque contiene el mecanismo, no porque sea la última línea disponible.

## Interespaciado: diagnosticar la dimensión correcta

- **Tracking:** espacio agregado a cada avance del tramo. No abrir una frase para que alcance el ancho
  de otra; puede destruir la unidad de lectura. Partir del shaping de la fuente y ajustar sólo con motivo.
- **Kerning:** relación local entre pares. No sustituirlo por tracking global.
- **Leading:** distancia entre baselines. No describe por sí sola el blanco visible entre dos familias.
- **Gap de tinta:** `top(linea siguiente) − bottom(linea anterior)`. Captura el blanco realmente visible.
- **Separación de bloques:** aire entre concepto, saludo y firma; es una decisión semántica distinta.

Si el usuario dice “interespaciado excesivo”, revisar estas cinco dimensiones y mostrar el resultado,
no corregir sólo `line-height`. No comprimir con escala horizontal arbitraria ni convertir la compacidad
en colisión de acentos/descendentes. Una misma interlínea nominal no resuelve familias y tamaños mixtos.

## Procedimiento determinístico con fontkit

1. Abrir el archivo exacto y registrar ruta/peso. Para Bricolage variable registrar `wght`, `wdth`, `opsz`;
   nunca simular negrita con stroke ni dar por hecho que el renderer carga un peso declarado.
2. Ejecutar `font.layout(texto)` para conservar glifos, kerning y posiciones. El texto sigue siendo el
   literal aprobado, incluidos tildes, ñ, signos de apertura y puntos suspensivos.
3. Calcular escala `fontSize / unitsPerEm`. Si hay límite de ancho, decidir antes si se cambia el corte
   o el tamaño; registrar el tamaño efectivo cuando se ajusta a ancho.
4. Para cada glifo aplicar avances y offsets del shaping. Con SVG de eje Y descendente y bbox de fuente
   ascendente, usar `xGlyph = cursorX + xOffset * scale`, `yGlyph = baseline − yOffset * scale`;
   `top = yGlyph − bbox.maxY * scale`, `bottom = yGlyph − bbox.minY * scale`.
5. Unir bboxes de todos los glifos para obtener los bordes de tinta de la línea. Alinear ópticamente con
   esos bordes; el origen del texto no siempre coincide con su borde visible.
6. Exportar contornos SVG y componerlos sobre el plate mediante Sharp u otro compositor. Conservar copy
   editable, fuente y parámetros porque los contornos ya no contienen texto seleccionable ni accesible.
7. Guardar JSON de texto, archivo/familia, ejes, peso, tamaño efectivo, baseline, caja de tinta, color y
   ancho máximo. Revisar el PNG/MP4 final; el JSON no verifica la percepción.

## Ejemplo medido, no escala universal

Evidencia local: `.captures/fiestas-patrias-2026-v10-reel/portada.cjs` y `metricas-portada.json`.
Portada 1080×1920; Bricolage `wdth=100`, `opsz=96`. El código no agrega tracking manual.

| Tramo | Familia/peso | Tamaño px | Baseline Y | Tinta top–bottom |
| --- | --- | ---: | ---: | --- |
| Hay cosas que | Poppins Medium 500 | 52 | 296 | 259.860–309.624 |
| no necesitan | Bricolage 750 | 104 | 395 | 320.744–396.456 |
| rediseño | Bricolage 800 | 126 | 498 | 407.406–499.764 |

Los gaps visibles son **11.120 px** y **10.950 px**, aunque las baselines distan 99 y 103 px. Los bordes
izquierdos de tinta son 80.900, 77.848 y 78.536 px. Esto explica una composición compacta con tamaños
muy distintos; no convertir estos valores en regla para otros textos, tamaños, fuentes o ratios.

La firma usó `public/branding/logo-negative.svg`, ancho 240 px, X=420, Y=1570. Su ubicación es un dato
del cover de este caso; los clear spaces oficiales, el fondo y el crop de cada destino gobiernan otros.

## Contraste y lectura final

Medir contraste local sobre el fondo real, no sobre una muestra de paleta. La zona bajo letras puede
cambiar en video: revisar entrada, hold y salida. La medición técnica complementa la revisión móvil,
miniatura y tamaño completo. No inventar ratios WCAG ni tiempos de lectura cuando no se midieron.

Leer primero sin logo y luego con firma para detectar ambigüedad: “¡Felices Fiestas Patrias!” debe
saludar a la audiencia; Efeonce debe reconocerse como emisor. Si parece destinatario, corregir la
agrupación, jerarquía o secuencia. En este caso el logo inferior centrado se resolvió sin “Un saludo de”.

La portada y el cierre tienen funciones distintas. Una portada puede expresar la frase completa sin
elipsis; el video puede repartirla entre planos y conservar elipsis de continuidad. Revisar todo el
texto en secuencia, no sólo cuadros bonitos aislados.
