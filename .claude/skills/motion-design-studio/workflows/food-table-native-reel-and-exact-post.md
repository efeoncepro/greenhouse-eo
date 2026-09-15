# Mesa gastronómica → video nativo por formato + post exacta

> Estado: producido y aprobado por el operador, 2026-09-13. Caso: Fiestas Patrias
> de Efeonce, v09 4:5 y v10 9:16. No es un benchmark de modelos ni una garantía de rendimiento social.
> Caso integral y programación: [metodología integral](../../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md).

## Cuándo usarla

Una campaña exige comida apetecible, verosimilitud cultural, una idea de agencia reconocible y texto/logo
exactos. El mundo fotográfico puede ser generado; la composición editorial y la acción gráfica se controlan
por separado. No hace falta modelar en 3D una empanada para este encuadre: solo considerar 3D si una acción,
rotación, continuidad multivista o control geométrico realmente lo exige.

## Pasos encadenados

1. Aprobar primero la dirección fija con Design y Social: mesa como contexto de servicio, empanada chilena
   bien armada, terremoto, anticuchos y pebre. Luz, textura y reflejos deben invitar a comer; la decoración
   cultural acompaña y no convierte el plano en un inventario folclórico. Reservar desde el plate espacios
   de lectura y una zona de firma con profundidad/bokeh natural.
2. Separar entregables: plate limpio sin texto/logo/cursor; referencia de composición; titular literal;
   logo oficial; overlays con transparencia; música; toma generativa original; export final y QA.
   Un contact sheet explica alternativas o resume una revisión, pero no reemplaza el plate ni el video.
3. Producir movimiento real cuando el brief lo necesita. En este caso, ImageGen construyó el keyframe y
   Seedance 2.5 produjo la toma con cámara fija y movimiento ambiental sutil. La animación local de textos
   o un pan sobre una foto no se debe presentar como una nueva toma cinematográfica. Conservar modelo,
   job, referencia, resolución recibida y gasto real; verificar disponibilidad/precio antes de reutilizar.
4. Componer texto, selección, cursor y logo en post. La ejecución comprobada usa `fontkit` para contornos
   de las fuentes locales Poppins/Bricolage y `sharp` para 216 overlays PNG a 24 fps. Esto evita sustitución
   tipográfica y deja peso, tamaño, posición y opacidad reproducibles. El logo proviene del SVG oficial.
5. Construir el chiste mediante una intención interrumpida: seleccionar la empanada, acercarse al tirador,
   dudar y retirarse. Ni el objeto ni el bounding box cambian de escala; no hay arrastre, morph o deformación.
   La frase «rediseño» remata la llegada al tirador. Una interfaz gráfica reconocible debe ser precisa y breve.
6. Hacer finishing localizado sobre la toma aceptada, sin regenerarla para problemas de altas luces,
   legibilidad o contraste. En v09 se comprimieron suavemente reflejos del terremoto y masa, se añadió
   definición leve a la empanada y se redujo presencia del vapor mediante máscaras graduales. Los filtros
   usan `curves`, `unsharp` moderado y `maskedmerge`; evitar halos, recortes visibles y blur artificial.
   Reubicar máscaras al cambiar de composición: sus coordenadas no son presets universales.
7. Preservar la cueca aprobada según `audio-studio/efeonce/APPROVED_MUSIC_CONTINUITY.md`. El cambio de imagen
   no autoriza reemplazar música o volver a cobrar su generación. Copiar el stream si duración y sincronía
   lo permiten; comparar su payload, no el hash del MP4 completo.
8. Adaptar de verdad cada formato. v09 recibió una fuente 1248×1664, recortada proporcionalmente a
   1248×1560 y escalada a 1080×1350. Para v10 el encuadre no se resolvía con ese crop: se produjo un keyframe
   vertical nuevo y una nueva toma Seedance nativa 1080×1920, recompuesta para 9:16. No se añadieron bandas,
   relleno de color, fondos duplicados ni estiramientos. Reposicionar texto, cursor, selección, firma y máscaras
   conservando el argumento y timing. Un recorte sí puede ser válido cuando conserva composición y acción;
   no prometer adaptación nativa si solo se ha recortado.
9. Diseñar la portada como pieza de lectura autónoma sobre un fotograma limpio real, con concepto completo
   y marca. No usar el saludo final como apertura del storytelling ni un contact sheet como thumbnail.
   Inspeccionar formato completo y recortes de preview pertinentes; un preview central 3:4 es prueba editorial,
   no garantía del recorte de todas las versiones de Instagram. Social gobierna carga y readback del thumbnail.
10. Exportar, revisar y guardar originales/masters sin confundir estados. Usar versiones distintas para cada
    formato y conservar procedencia, scripts, filtros, métricas y evidencia. Guardado local en OneDrive con
    hashes iguales no verifica sincronización remota. Programación, rehosting y publicación se verifican aparte.

## Timing comprobado del caso (9 segundos)

| Beat | Tiempo | Función |
|---|---|---|
| «Hay cosas…» | entrada 0.15–0.45; salida 2.05–2.30 s | Apertura y continuidad con puntos suspensivos |
| «…que no necesitan» | entrada 2.35–2.65 s | Completar lectura antes del remate |
| Selección | entrada 2.68–2.80 s | Identificar objeto sin alterarlo |
| «rediseño» | entrada 3.28–3.50 s | Coincidir con intención de escalar |
| Duda y retirada | pausa 3.35–3.95; retirada 3.95–4.45 s | Hacer comprensible la decisión de no intervenir |
| Deselección | 4.45–4.65 s | Resolver acción |
| Salida del concepto | 5.35–5.60 s | Dejar respirar la mesa hasta 5.95 s |
| «¡Felices Fiestas Patrias!» | entrada 5.95–6.30 s | Saludo exclusivamente al cierre |
| Logo oficial centrado | entrada 6.55–6.90 s | Firma, sin «un saludo de»; hold completo final de 2.10 s |

Estos tiempos son la receta observada, no una norma para todas las duraciones. Evaluar lectura a tamaño móvil,
continuidad del gesto y tiempo de cierre antes de acelerar o añadir efectos.

## QA que cierra el loop

- `ffprobe`: dimensiones reales, SAR, fps, duración, codecs, audio y conteo de cuadros. En ambos masters:
  9 s, 24 fps, 216 cuadros, H.264/AAC; 4:5 1080×1350 y 9:16 1080×1920.
- Decodificar el archivo final completo para detectar fallos técnicos. Esto no evalúa composición ni movimiento.
- Extraer frames del export, no del mockup, incluyendo transiciones, tirador, remate y cierre. v09/v10
  documentaron 27 muestras reales y cierre a resolución completa. No afirmar inspección visual de cada cuadro.
- Revisar empanada/pliegues, comida y cristal sin deformaciones temporales; cursor no modifica geometría;
  texto sin saltos de baseline, viudas ni solapamientos; logo legible y sin tratamiento artificial del fondo.
- Revisar reproducción y escucha cuando estén disponibles. Declarar cualquier límite de inspección de forma
  concreta. Una métrica correcta o un job `completed` no sustituye aprobación creativa ni escucha humana.
- Registrar hashes de entrega y del audio conservado, evidencia de aprobación y estado exacto. Los LEEME de
  versiones anteriores son snapshots; no anulan una aprobación o programación posterior con evidencia.

## Reconstrucción técnica mínima

Conservar además el script completo en la entrega. Esta receta permite reconstruir el finishing sin depender
solo de `.captures`. Para 4:5, conformar con `crop=1248:1560:0:52,scale=1080:1350:flags=lanczos,setsar=1`.
Para la fuente vertical nativa, comenzar con `setsar=1` y conservar 1080×1920. Trabajar en `yuv444p` durante
las correcciones; terminar en `yuv420p` después de overlay. Cada corrección divide base/candidato/máscara,
aplica el ajuste al candidato y combina mediante `[base][candidato][mascara]maskedmerge`.

| Ajuste | Curva / operación | Máscara v09; sustituir centros/radios para v10 |
|---|---|---|
| Terremoto | `curves=all='0/0 0.45/0.45 0.75/0.73 1/0.93'` | `255*exp(-pow((X-906)/148,4)-pow((Y-394)/270,4))`; v10 886/166 y 640/340 |
| Empanada | `curves=all='0/0 0.4/0.4 0.7/0.70 0.9/0.88 1/0.96',unsharp=5:5:0.25:5:5:0` | `255*exp(-pow((X-500)/285,6)-pow((Y-790)/175,6))`; v10 465/330 y 1190/240 |
| Vapor | `curves=all='0/0 0.12/0.105 0.25/0.22 0.5/0.5 1/1'` | `180*exp(-pow((X-288)/190,4)-pow((Y-266)/104,4))`; v10 240/190 y 450/125 |

Construir máscaras con `format=gray,geq=lum='<expresión>'`. Son valores efectivos de este plano; reajustar
al contenido de cada nueva toma. Terminar filtro con
`[finished][1:v]overlay=shortest=1:format=auto,format=yuv420p[v]`.

Comando de ensamblaje reproducible orientativo (rutas locales de ejemplo; conservar el preset/CRF del export
cuando se requiera igualdad de codificación, que este comando no promete):

```sh
ffmpeg -i toma-original.mp4 -framerate 24 -i overlays24/%04d.png -i master-audio-aprobado.mp4 \
  -filter_complex_script finish.filter -map '[v]' -map 2:a:0 -t 9 -r 24 \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart master.mp4
ffprobe -v error -count_frames -show_entries \
  stream=codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels:format=duration,size \
  -of json master.mp4
ffmpeg -v error -i master.mp4 -f null -
ffmpeg -v error -i master.mp4 -map 0:a:0 -c:a copy -f hash -hash sha256 -
```

Overlays: evaluar el timeline en `t=i/24`, `i=0..215`; usar easing cúbico suave y opacidad de entrada/salida.
La caja v09 es `x197,y598,w609,h390`; v10 `x111,y946,w698,h490`. Sus ocho tiradores son cuadrados de 10 px,
relleno blanco y trazo azul 2 px; la caja tiene trazo azul claro 2 px. Mantener sus dimensiones constantes.
El texto de remate usa Bricolage 800 a 126 px, x74, baseline225 (v09) o353 (v10); la continuación usa
Poppins500 a54 px, x77, baseline112 o240. Reajustar por tinta visible, no solo por line-height nominal.

## Costos y evidencia

v08: intento fallido sin débito neto y toma completada por 90 créditos del proveedor; v09: 0 nuevos créditos
por finishing determinista. v10: nueva toma vertical por 90 créditos, saldo documentado 2008.75→1918.75,
job `25ffe273-cc12-4e90-8d17-a803f56005b9`. Son cargos históricos del proveedor, no una tarifa Studio Credits.

Evidencia local histórica (ignorada por Git): `.captures/fiestas-patrias-2026-v08/LEEME.md`,
`.captures/fiestas-patrias-2026-v09/{LEEME.md,render-overlays.cjs,finish.filter,qa-technical.json}` y
`.captures/fiestas-patrias-2026-v10-reel/{LEEME.md,render-reel.cjs,finish-reel.filter,portada.cjs,qa-technical.json}`.
El caso integral contiene la ubicación de entrega y los estados de programación; no duplicar aquí datos vivos.
