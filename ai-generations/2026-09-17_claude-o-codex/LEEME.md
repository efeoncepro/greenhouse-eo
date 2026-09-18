# «¿Claude o Codex?» — pieza de estudio (2026-09-17)

Pedido del operador: él **detrás de una mesa, tipo estudio de podcast pero sin micrófono**, con Clawd y Codex, y el
titular **¿Claude o Codex?** más su línea entre comillas.

## Pieza vigente

`out/claude-o-codex-4x5-v03.png` (1152 × 1440) sobre `plates/plate-final.png`. Tres capas, ninguna generada:

1. **Marca sobre el primer plano desenfocado** — una barra de acrílico fuera de foco cruza el borde frontal de la
   mesa con la cara limpia, y el logo navy se apoya **nítido** y centrado en su ancho, en `multiply` porque la barra
   es clara. **El desenfoque es del objeto, no del logo**: el primer intento desenfocó también la marca y quedó
   ilegible (corrección del operador). Regla completa en `social-media-studio`, referencia `brand-in-scene`.
2. **Jerarquía en tres niveles** — titular 98 px dominante · cita 33 px al margen izquierdo, fuera del eje, como un
   aparte humano · la marca sólo en el bokeh. Antes eran titular y subtítulo centrados en el mismo eje: dos tamaños,
   un solo nivel.
3. **Selección colaborativa AXIS sobre el titular** — caja de ocho tiradores, cursor de Clawd en su naranja
   (`#d77757`) y de Codex en su azul (`#2f67db`, medido sobre el plate), más el cursor local. La decisión es el
   objeto seleccionado y las dos mascotas se la disputan.

### Cómo se llegó al plate

`plate-v04` trae la cara buena. El primer plano se agregó con **pasada enmascarada** y se recortó a mano: el modelo
regenera todo aunque le des `--mask` (delta medido en la zona protegida: 221/255, y los ojos 147/255), así que la
esquina nueva se compone sobre `plate-v04` invirtiendo el alfa de la misma máscara. Verificado: rostro con **delta
máximo 0**. Ver `docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md`.

Descartes: `plate-v05` (panel bien, ojos oscuros), `plate-v06` y `plate-v07` (el panel lateral choca con la cara y
con las manos), `out/claude-o-codex-4x5-v01.png` y `-v02` (mascotas en la mesa / jerarquía plana).

## Piezas anteriores

| Formato | Master | Medida social | Plate |
|---|---|---|---|
| 4:5 | `out/claude-o-codex-4x5-v02.png` (1152 × 1440) | `out/claude-o-codex-4x5-1080x1350.png` | `plates/plate-v03.png` |
| 9:16 | `out/claude-o-codex-9x16-v02.png` (1088 × 1936) | `out/claude-o-codex-9x16-1080x1920.png` | `plates/plate-9x16.png` |
| 16:9 | `out/claude-o-codex-16x9-v02.png` (1936 × 1088) | `out/claude-o-codex-16x9-1920x1080.png` | `plates/plate-16x9.png` |

`out/claude-o-codex-4x5-v01.png` queda como **descarte**: las mascotas estaban sobre la mesa y la cabeza salía
desproporcionada respecto al cuerpo (ver regla 6).

```bash
node ai-generations/2026-09-17_claude-o-codex/componer.mjs [plate.png] [salida.png]
```

El compositor **elige la disposición según el formato**: en vertical el titular y la cita van apilados arriba; en
horizontal no caben sin chocar con la coronilla, así que la cita baja a la mesa y el logo se va al extremo opuesto.

## Cómo se hizo

**Dos capas, como manda el contrato:** el modelo entrega **sólo el medio limpio** (foto sin una sola letra) y el
texto se **compone** con fontkit a trazos SVG desde las fuentes oficiales y las recetas de `axisAdvertising`:

- Titular `¿Claude o Codex?` — Bricolage Grotesque, receta `ideaImpact` (peso 780, ancho 96, óptico 88,
  tracking −0,035 em), `color.inkOnDark`, ajustado al ancho objetivo del formato **midiendo la tinta real**, no la métrica.
- Cita `“No sé cuál elegir”` — Poppins Medium, tracking de `structureTagline`, `color.softOnDark`, proporcional al
  cuerpo del titular.
- Logo Efeonce en negativo, centrado abajo sobre la mesa.

**Ortografía:** el operador lo dictó como «No se cual elegir». Se compuso **con tildes** —«No sé cuál elegir»— porque
sin ellas es una falta en una pieza de marca. Las comillas y los signos de interrogación se respetaron tal cual.

## Reglas que se aplicaron

1. **Los ojos se declaran, no se dejan al azar.** La pieza anterior (`2026-09-17_julio-con-mascotas`) salió con los
   ojos extraños. Lo que lo corrige es un párrafo propio: ambos ojos idénticos en tamaño, forma y color, igual de
   abiertos, pupilas redondas apuntando al mismo punto, cristales sin reflejos ni aumento, el marco sin cortar la
   pupila, y brillos especulares en la misma posición en los dos.
2. **El espacio para el titular se pide como composición, no como «aire».** «Room to breathe above his head» devolvió
   60 px. Lo que funciona: «el TERCIO SUPERIOR ENTERO está vacío — sólo panel acústico desenfocado, sin cabeza, sin
   pelo, sin lámpara, sin brillo — la coronilla empieza debajo de ese tercio».
3. **Lo que NO debe aparecer se declara.** «Estudio de podcast sin micrófono» se escribió como «no mic, no boom arm,
   no pop filter, no headphones, no cables, nada sobre la mesa salvo las dos figuras»: nombrar el estudio arrastra el
   micrófono.
4. **Escala anclada a un objeto del cuadro:** cada figura mide lo que su cabeza de mentón a coronilla, y **apoya**
   sobre la mesa con sombra de contacto.
5. **Persona real, con su consentimiento.** Fotos entregadas por él mismo; `refs` en `2026-09-17_equipo-vestuario`.
6. **Nunca sólo retratos, ni siquiera en un plano de busto.** La primera versión pasó `julio-reyes-01` y `-02`, las
   dos de rostro, y devolvió la cabeza desproporcionada respecto al cuerpo. La regla ya estaba escrita y se rompió.
   Corrección: `-01` para la cara y `-07` de **cuerpo entero** para construir el cuerpo, lente 135 mm a varios metros,
   cámara a la altura del pecho, y la proporción anclada a algo medible del cuadro — «el ancho de hombro a hombro es
   unas dos veces y media el ancho de su cabeza» y «del mentón a la mesa hay al menos una cabeza». Declarar la
   anatomía en fracciones de la altura total no basta cuando el encuadre corta a la altura de la mesa: no hay altura
   total visible contra la cual medir.

## QA medido (pieza vigente)

Contraste sobre los píxeles reales, contra el píxel **más claro** de cada zona:

| Zona | Medido |
|---|---|
| Titular (blanco) | 8,80:1 |
| Cita (`softOnDark`) | 10,63:1 |

La cita empezó bajo el titular y ahí caía sobre el pelo: **1,17:1**, ilegible. Se movió al margen izquierdo, que es
donde el fondo deja de ser claro. El contraste de una línea de texto se mide **donde queda**, no donde se diseñó.

**Logo sobre la barra desenfocada:** contraste de la tinta contra la cara de la barra **9,17:1**. El logo es lo
único enfocado de esa zona, y ese contraste de nitidez contra el fondo borroso es lo que lo hace destacar sin
competir con el rostro, que está en otro plano.

Revisado además a 390 px de ancho: titular y cita siguen legibles. Mascotas verificadas al 100 % (cubos naranja con
ojos rectangulares; nube azul con `>_` cian en pantalla y blanco en el pecho) y el emblema del polo con la nave a la
derecha.

## Pendiente

No está en OneDrive ni programada.
