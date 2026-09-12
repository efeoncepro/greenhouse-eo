# Auditoría de tipografía editorial, agrupación de marca y fusión

Aplica a titulares sobre fotografía, posts, stories, portadas y key visuals. Compone `design-studio` con
`typography-design` (Claude) o `greenhouse-typography-accessibility` (Codex). El agente conserva la entrega:
cargar otra skill no exige detenerse ni crear un subagente. Este protocolo no modifica tokens de producto UI.

## 1. Argumentar antes de mover elementos

Escribir una cadena comprobable: idea humana → mecanismo creativo → evidencia visible → orden de lectura →
papel de marca. Distinguir intención de resultado observado. Por ejemplo, una silla vacía junto a un lugar
preparado hace visible la ausencia; «Hay ausencias que se sientan.» conecta la expresión figurada con la acción
literal de sentarse. La mesa cuidada y el gesto de preparar el lugar pueden sugerir continuidad del vínculo.
Son interpretaciones creativas, no pruebas de una respuesta emocional universal ni de activación neurológica.

Para cada elemento, declarar si aporta significado, contexto cultural, lectura o atribución. Si sólo repite lo
que ya comunica la imagen, evaluar retirarlo; conservar siempre el copy literal acordado. No añadir ocasión,
fecha, CTA o una segunda familia sólo para completar una plantilla. El concepto debe sobrevivir a explicar la
pieza sin mencionar el efecto gráfico empleado.

## 2. Auditar la composición antes del color

1. Identificar el sujeto narrativo, el primer nivel tipográfico y la firma. No confundir un titular dominante
   con permiso para tapar o eclipsar el objeto que permite entenderlo.
2. Revisar la pieza completa y una reducción al tamaño de consumo. Anotar qué elementos parecen competir y
   por qué: tamaño, luminosidad, aislamiento, detalle o posición. Presentar esto como revisión visual, no como
   eye tracking ni predicción verificada de atención.
3. Una firma pequeña pero blanca y aislada en una esquina puede formar un foco independiente. Primero comparar
   ubicación, agrupación, escala y aire; después evaluar tono, opacidad o fusión. Bajar opacidad no cambia su
   distancia al bloque ni su papel compositivo.
4. Si la marca funciona como autora, probar una firma subordinada próxima al titular, alineada ópticamente y
   con protección suficiente. No convertir proximidad en contacto ni crear un nuevo logotipo institucional:
   es un agrupamiento editorial específico. Si la marca es producto, seguir `brand-in-scene.md`.
5. Resolver cada relación de aspecto con composición propia. Conservar sentido y jerarquía; no conservar
   coordenadas ni ratios a costa de legibilidad. En formatos verticales, auditar especialmente la separación
   entre cabecera y firma inferior. No existe una prohibición universal de logos inferiores.

## 3. Medir tinta, no solamente cajas

Guardar por cada línea: texto, fuente real/licencia, ejes variables, peso, tamaño, tracking, funciones OpenType,
baseline, origen, caja de tinta y color. Registrar unidades y dimensiones del lienzo.

- **Baseline**: origen vertical de composición. Dos baselines bien espaciadas no garantizan aire visual.
- **Caja de tinta**: límites de glifos visibles tras shaping, offsets y transformaciones. Medir la separación
  vertical como `top(tinta siguiente) − bottom(tinta anterior)`. Un valor negativo indica solapamiento de cajas;
  comprobar los contornos, pues la caja no describe por sí sola una colisión real.
- **Alineación óptica**: comparar bordes de tinta y forma inicial, no sólo el `x` de los contenedores. Curvas,
  sidebearings, diagonales y signos pueden necesitar compensación. Conservar una corrección óptica explícita;
  no deformar glifos ni logos para hacer coincidir extremos.
- **Leading mixto**: en titulares con tamaños diferentes, definir el aire entre líneas por su relación visual
  y lectura. No aplicar el mismo multiplicador ciegamente ni equiparar baseline gap con espacio blanco.
- **Tracking**: partir del shaping/kerning de la fuente, revisar pares y espacios de palabra a tamaño final,
  ajustar por línea o tramo y registrar `em` y equivalente en píxeles. No aplicar un tracking negativo universal
  a todos los tamaños. No comprimir para solucionar una línea demasiado larga: reconsiderar corte o tamaño.
- **Kerning**: corregir pares puntuales sólo con evidencia visual y sin perder el avance/offset del motor.
  No contar espacios entre letras como prueba de que el ritmo es uniforme.
- **Ejes variables**: verificar rango real, ausencia de sustitución y resultado de `opsz`, `wdth`, `wght`.
  Los valores intermedios disponibles en una fuente de campaña no están sujetos a la escalera de pesos MUI.

Revisar signos, acentos, contraformas cerradas, colisiones, blancos entre palabras y tangencias con la foto.
Guardar el texto editable además de contornos si el pipeline lo permite. No sustituir un logo por texto.

## 4. Contraste tipográfico es más que contraste de luminancia

Declarar el énfasis semántico antes de asignar tamaños. Combinar escala, peso, ritmo y espacio con moderación:
una palabra enormemente mayor puede romper la frase o absorber al sujeto. Comparar la lectura conjunta y la
lectura de esa palabra aislada. Un salto evidente no requiere maximizar el ratio.

Diseñar cortes por unidades de sentido. Evitar que conectores queden como escalones sueltos por un accidente de
cabida. «Que se sientan.» puede conservarse como unidad cuando cabe; otro corte puede ser válido si aporta ritmo
y se comprueba en la composición. No declarar incorrectos todos los cortes después de un conector en poesía o
headline art: justificar la excepción concreta.

## 5. Fusión de marca: elegir una operación, no un adjetivo

Preservar el asset oficial, proporción, contraformas y protección. La fusión modifica interacción cromática;
no crea perspectiva, relieve, desplazamiento ni sombra de contacto. Para una marca física se requieren esas
relaciones por separado. Un efecto no autoriza redibujar, estirar ni inventar colores institucionales.

Adobe documenta que Multiply con blanco deja intacto el fondo; Screen con blanco produce blanco. Soft Light
modula claros y oscuros en función del color de mezcla. Por ello no elegir Multiply para hacer visible una
firma blanca. Opacidad de grupo y opacidad por objeto tampoco son intercambiables cuando hay solapamientos.
Fuente: [Adobe Illustrator — Transparency and blending modes](https://helpx.adobe.com/illustrator/using/transparency-blending-modes-alt.html), consultada 2026-09-12.

Procedimiento de producción:

1. Componer primero una versión normal con geometría y ubicación resueltas.
2. Si existe una razón estética o material concreta, comparar sólo los modos pertinentes sobre el mismo fondo,
   tamaño y posición. Un resultado normal puede ser el ganador; no forzar el efecto porque está disponible.
3. Registrar modo, opacidad, máscara, espacio de color, orden de capas y motor real. Si se usa una operación
   equivalente en otro software, nombrar ese motor; no afirmar que se trabajó en Illustrator.
4. Verificar la apariencia ya aplanada: logo reconocible, detalles internos presentes, ningún tramo desaparece
   sobre luces/texturas, color resultante compatible con la aplicación autorizada y jerarquía subordinada.
5. Conservar evidencia comparativa y el motivo de elegir/descartar. Una simulación nunca demuestra por sí sola
   fidelidad material, percepción de marca o rendimiento comercial.

## 6. Contraste local y exportación

Medir contra el fondo real bajo las letras después de cualquier scrim, máscara o fusión. En composición
transparente, comparar el color resultante de la letra con el fondo que tendría ese mismo punto sin letra;
medir sólo el color fuente frente al promedio de la foto puede ocultar el peor tramo. Registrar método de
muestreo, umbral de máscara, mínimo y limitaciones; revisar además contornos suavizados visualmente.

WCAG 1.4.3 distingue texto normal (4.5:1), grande (3:1) y la excepción de logotipos. No clasificar como grande
por sus píxeles del archivo maestro: considerar el tamaño presentado. Es una referencia de contraste, no una
certificación integral del JPG ni de su publicación. La excepción normativa del logo no justifica hacerlo
irreconocible. Fuente: [W3C — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), consultada 2026-09-12.

Inspeccionar el PNG/JPG final al 100%, a tamaño de consumo y en miniatura. Anotar las dimensiones de revisión;
no afirmar «lectura en un segundo» sin una prueba temporal real. Revisar texto completo, bordes, acentos,
compresión, nitidez del logo, zonas de interfaz y recortes. El contraste numérico no detecta por sí solo mala
jerarquía, tracking incómodo o una firma desconectada. No afirmar aprobación humana a partir de QA propio.

## 7. Evidencia mínima del cierre

Entregar argumento del concepto; hallazgos antes/después; decisión por formato; parámetros reproducibles;
fuente del logo/fuente tipográfica; comprobación de exportación; imágenes finales y limitaciones. Separar
«medido», «observado en revisión visual» e «hipótesis pendiente de audiencia». Guardar los valores del caso en
su auditoría, no como mandatos universales de esta skill. Mostrar las piezas corregidas cuando se solicitó
producción: un informe de auditoría no sustituye el resultado.

## Firma inferior que cierra un eje narrativo

Caso «Hay abrazos que encendemos»: el operador valoró la versión 4:5 con logo blanco inferior centrado
por encima de la firma junto al titular. La llama, la veladora y el camino de pétalos forman un eje continuo;
la firma puede cerrarlo sin quedar aislada lateralmente. Esto no contradice agrupar marca/titular cuando el
encuadre carece de ese recorrido. Evaluar ambos patrones desde la geometría y el significado de cada pieza.

En adaptaciones, conservar la jerarquía y la metáfora, no copiar coordenadas: revisar zonas de interfaz en
Historia y tamaño de miniatura en YouTube; evitar la esquina inferior derecha destinada a la duración.
Mantener logo oficial proporcional, aire y contraste local. La preferencia por una versión no aprueba
automáticamente derivados ni publicación. No afirmar que el layout mejora rendimiento sin prueba.
