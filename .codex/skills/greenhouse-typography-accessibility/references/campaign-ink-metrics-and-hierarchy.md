# Tipografía de campaña: cajas de tinta, jerarquía y composición exacta

Para globos de diálogo, medir padding contra el interior visible, no contra sombra/cola.
Compactar con kerning nativo y comprobar a tamaño móvil. En el caso Pódcast, 1.20→1.02
mide distancia entre centros de tinta del script, **no leading entre líneas base**; no trasladarlo
como token universal ni comprimir letras horizontalmente. Ver
[caso y medidas](../../../../docs/operations/social/2026-09-13-podcast-fotohistoria-production-method.md).

Rama editorial fuera de la UI. Complementa
[editorial-typography-brand-audit](../../social-media-studio/references/editorial-typography-brand-audit.md).
Caso y evidencia: [Fiestas Patrias 2026](../../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md).
No cambia Poppins/Geist, variantes, tokens ni pesos autorizados de producto.

## Canon AXIS para aplicaciones publicitarias

El punto de partida compartido vive en `packages/tokens/src/tokens.ts` del repo AXIS como
`axisAdvertising`, registrado por el contrato `efeonce.advertising-typography`. No es una escala de UI ni una
hoja global: es una especificación portable que cada consumidor traduce a su motor sin cambiar sus valores.

| Rol | Recetas AXIS | Intención |
| --- | --- | --- |
| Idea / Bricolage | `ideaImpact`, `ideaShort`, `ideaMedium`, `ideaLong`, `ideaLead`, `ideaFocus` | Variar masa y ritmo según longitud; evitar que todo sea ExtraBold |
| Estructura / Poppins | `structureLabel`, `structureCopy`, `structureEmphasis` | Ordenar contexto y lectura; cursiva sólo como énfasis de hasta tres palabras |
| Gesto / Guttery | `gesture` | Una intervención puntual de una línea; nunca cuerpo, legal o segundo titular |

Las recetas también fijan safe areas por `feed`, `story` y `cover`, colores funcionales y pisos WCAG de
`4.5:1` para texto normal, `3:1` para texto grande y `3:1` para elementos gráficos necesarios. Medir siempre
contra el píxel real del fondo: sobre fotografía o video, el token de color por sí solo no prueba contraste.

En Tailwind v4, el consumidor puede traducir el contrato con `@theme inline` y `@utility`; esa hoja debe ser
local, opt-in y limitada a superficies publicitarias. No cargarla en el runtime global de Greenhouse ni
distribuirla como CSS desde AXIS. Los binarios de fuente tampoco viajan en el contrato.

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

### Rangos de partida para campaña

Estos rangos ayudan a iniciar una prueba; no son tokens de producto ni límites automáticos:

| Uso | Tracking inicial | Leading inicial | Validación |
| --- | ---: | ---: | --- |
| Bricolage `28–47 px` | `0` a `-0.020em` | `1.00–1.12` | Titular medio, tildes y signos despejados |
| Bricolage `48–79 px` | `-0.010em` a `-0.030em` | `0.92–1.02` | Palabra completa a tamaño final |
| Bricolage `80 px` o más | `-0.020em` a `-0.040em` | `0.88–0.98` | Gap de tinta positivo entre líneas |
| Poppins de apoyo o cuerpo | `0` a `-0.010em` | `1.45–1.65` | Zoom `200 %`, ancho de lectura y reflow |
| Poppins en overline breve | `+0.060em` a `+0.100em` | `1.20–1.40` | Mayúsculas cortas, nunca párrafos |
| Guttery puntual | Espaciado nativo | Una sola línea | Ligaduras, acentos y revisión óptica |

La prueba visual debe incluir al menos tres estados con la misma familia, peso, tamaño y copy:

- **DON’T cerrado:** tracking próximo a `-0.070em` o leading próximo a `0.76`; evidencia letras pegadas,
  contraformas cerradas o colisión de tinta.
- **DO equilibrado:** punto inicial cercano a `-0.020em`/`0.92` en Bricolage display, ajustado al copy y al
  gap de tinta real.
- **DON’T abierto:** tracking próximo a `+0.050em` o leading próximo a `1.18`; evidencia pérdida de unidad
  verbal, no “más aire” por sí mismo.

Si el texto no cabe, cambiar corte, tamaño o medida. Nunca usar tracking para forzarlo dentro de una caja.
Revisar ñ, tildes, signos de apertura, pares problemáticos, miniatura y móvil antes de aprobar.

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
