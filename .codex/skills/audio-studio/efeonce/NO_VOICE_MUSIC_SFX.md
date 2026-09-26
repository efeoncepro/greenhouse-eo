# Música y SFX sin voz: fuentes limpias y sincronización

**As-of 2026-09-24.** Procedimiento consolidado tras SKY V17. Los apartados por versión conservan la historia de
pruebas y rechazos; no describen todos el master vigente. V17 fue exportado y revisado técnica/visualmente;
el agente no realizó escucha perceptual. La doctrina reutilizable y sus gates se amplían al final de este archivo.

## Separar intención de fuente

Que guste la música de un video no significa que su mezcla con narración sea un master aprobado. Conservar la referencia y su identidad musical. Si hay un stem original instrumental limpio, priorizarlo. Si no existe, la separación puede servir para escuchar la composición, pero un `no_vocals.wav` puede conservar fonemas, respiraciones o reverberación vocal. No llamarlo limpio por su nombre ni porque ASR devuelva vacío.

Nunca degradar repetidamente el audio para disimular la lectura de texto. Si la contaminación no se elimina sin daño audible, producir una instrumental nueva con carácter equivalente y presentarla como nueva: no prometer identidad exacta de melodía/arreglo.

## Controles reales por superficie

| Superficie verificada | Configuración | Límite |
| --- | --- | --- |
| ElevenLabs directo, nodo `music`, modelo `eleven_music_v2` | `lyrics_type: instrumental`, `instrumental: true`, duración explícita | Disponibilidad de modelo confirmada por `creative_get_flow_node_types`; costo/saldo no confirmado por schema |
| API ElevenLabs Music Compose | `force_instrumental: true` con `prompt` | No combinar con `composition_plan`; no trasladar ese nombre de parámetro al conector |
| ElevenLabs directo, nodo `sfx` | Modelo `eleven_text_to_sound_v2`, duración 0,5–30 s, `loop: false` para one-shots | Describir efecto no verbal; revisión auditiva obligatoria |
| Higgsfield, catálogo audio | `sonilo_music` y `mirelo_text_to_audio` aparecieron como **Game pipeline only** | No asumir que el tool genérico de TTS los ejecuta; verificar operación antes de proponerlos como sustituto |

Magnific, ElevenLabs directo, Higgsfield y Google Cloud tienen facturación distinta. Un saldo o cotización de una superficie no acredita otra. En SKY Magnific quedó excluido por aviso del operador de falta de créditos; no se leyó una factura ni saldo de ElevenLabs directo.

Fuentes: [Music Compose](https://elevenlabs.io/docs/api-reference/music/compose), schemas actuales del conector consultados 2026-09-24. Volver a consultar al ejecutar si cambian parámetros. `video-to-music` está listado pero esta revisión no confirmó un control instrumental explícito en ese nodo; preferir música con control real.

## Flujo

1. Inventario con hash de fuente, duración y estado: aprobado, sólo referencia, contaminado, pendiente de escucha. Nunca sobreescribir el original.
2. Cerrar primero la generación/corrección visual y revisar minuciosamente sus fotogramas. Generar música y SFX después de fijar el picture/cue sheet, con duración, ritmo y eventos reales; no producir una pista anticipada para forzar después el video. Las cartelas ya aprobadas tienen reloj propio; ajustar SFX a sus fotogramas, no deformar su coreografía para una pista arbitraria.
3. Música instrumental continua, tempo constante y dinámica creciente. Un prompt de música describe género, instrumentos, ritmo y energía en 1–3 frases; no adjuntar el guion de textos como letra.
4. Bloquear voz, canto, coros, humming, spoken word y samples vocales tanto en parámetros como en dirección. Omitir letras. No proporcionar copy de cartelas, dominios ni números como contenido sonoro.
5. SFX separados por familias: teclado, submit/resultados, chat, energía de cita, motor/paso aéreo, acentos tipográficos y cierre. Reusar material limpio existente si sirve. No generar una mezcla entera para luego intentar desmontarla.
6. Sincronizar ataques al evento visual real (objetivo ±1 frame donde exista contacto inequívoco); registrar pre-roll intencional de risers y motores. Cada pulsación audible debe corresponder a escritura visible, no a una serie uniforme inventada.
7. Conservar continuidad musical. No encadenar tramos `atempo` ni insertar pausas para encajar marcas. Si hace falta otro arreglo, editar por frases con continuidad o pedir variante revisable. El motor se anticipa y cruza al pass; no empieza después del avión.
8. Mezclar por buses. Ajustar espacio espectral y ganancias sin vaciar toda la música en el punto de mayor energía. Loudness/true peak según destino; medir master real, no copiar números de un caso anterior.
9. Escucha completa con auriculares y altavoz/mono; revisión específica de todos los lugares que antes tenían texto leído. ASR/VAD son apoyo, no aprobación. Rechazar cualquier resto inteligible o fonético de voz.
10. Entregar WAV maestro, stems, cue sheet y video muxado. Verificar timestamps y sincronía tras codificación; los stems por separado no prueban el resultado final.

## Antipatrón documentado

SKY v9 reutilizó el audio separado de v7, nueve intervalos de `atempo`, solapes de 25 ms, ducking y SFX agregados. El operador reportó voz ahogada, retrasos y efectos ajenos a acciones. Corrección: retirar ese mix del rol de master, conservarlo como evidencia; reconstruir desde música instrumental limpia y SFX aislados.


## Recuperación local V12, 2026-09-24

V12 encontró música instrumental y tres SFX originales V6; reconstruyó32 cues sin usar mezclas contaminadas ni generar audio nuevo. Música 1× con envolvente, ataques alineados y pre-roll del motor; AAC medido −16,25 LUFS/−1,47 dBTP. Export técnico terminado. La sesión no admitió entrada de audio, por lo que la escucha perceptual no se realizó y no se declara garantía de ausencia de voz. Registrar esa limitación, no sustituirla por ASR o nombres de archivos.


## Verificar el modelo más reciente fuera del catálogo del conector

El 2026-09-24 el catálogo de ElevenCreative exponía `eleven_music_v1` y `eleven_music_v2`, pero la documentación oficial y la interfaz autenticada ya ofrecían **Music v2.5**, API `music_v2_5`. Un enum del conector sólo acredita su superficie, no el último modelo del proveedor. Al pedir el operador la última versión, verificar docs y la superficie que realmente la selecciona. Sound Effects sigue en `eleven_text_to_sound_v2` según el catálogo oficial consultado.

En la UI, revisar **Instrumental** después de cada navegación: la vista de historial puede devolver el selector a letras automáticas. Registrar modelo, una variante, duración y cotización antes de generar. Para continuidad, un prompt excesivamente seccionado o una indicación de silencio puede producir intro muda o una caída entre secciones. Medir la señal y revisar la estructura; no aprobar un silencio interno como pausa épica por conveniencia. Una reparación parcial también necesita revisar su enlace con la siguiente sección.

Fuentes: [modelos](https://elevenlabs.io/docs/overview/models), [Music v2.5](https://elevenlabs.io/docs/eleven-creative/products/music), [Compose](https://elevenlabs.io/docs/api-reference/music/compose). Estos datos se verificaron en la fecha indicada; consultar de nuevo si se pide la última versión.


## Referencia musical y rechazo de empalmes

En SKY V14 el operador rechazó un puente local aunque eliminaba el vacío medido: continuidad de señal no equivale a continuidad musical. Si pide una toma completa sin cortes, generar una pieza íntegra con el tema preferido adjunto como referencia. En Eleven Music, «Usar como referencia» permite reutilizar una canción nativa; registrar el ID realmente adjunto, influencia, modelo e Instrumental. Un extracto preparado localmente pero no subido no cuenta como referencia enviada. Evitar afirmar escucha desde RMS o ASR; reservar aprobación perceptual al operador cuando la sesión no permite oír audio.


## Transformación de marca: duración y cuerpo audible

Una transformación visual de varios segundos necesita una trayectoria sonora completa: anticipación, impacto y liberación que enlace con la siguiente acción. No reducirla a un clic sincronizado ni validar su importancia sólo porque el pico cae en el fotograma correcto. El acento debe relacionarse también con el pulso y la instrumentación de la música.

En SKY V15 el operador seguía percibiendo un clic: el cuerpo del efecto se había limitado a160Hz y el resto recaía en una textura breve de guitarra. El diagnóstico motivó un efecto continuo de3s con cuerpo en medios. Una comprobación por bandas y en mono ayuda a detectar que el efecto depende sólo del subgrave, pero no acredita cómo se oye en un teléfono ni sustituye la escucha. Mantener pre-roll, crest y cola registrados; no vaciar la música para que el efecto parezca fuerte. La nueva mezcla V16 conserva pendiente su aprobación perceptual.

## Doctrina de producción y posproducción consolidada

**2026-09-24, consolidación hasta SKY V17.** Las secciones V12/V14/V16 anteriores son registros históricos,
no estados vigentes del master. V17 está exportado y revisado técnica/visualmente; la escucha perceptual no fue
realizada por el agente. Usar el [companion de posproducción](../../motion-design-studio/companions/video-postproduction-and-delivery.md)
para lock, empalmes, restauración, overlays y entrega. Este procedimiento no representa automatización ya
implementada para cualquier video.

### Brief sonoro que sí se puede evaluar

1. Separar **referencia de carácter**, **fuente autorizada para uso** y **master aprobado**. Conservar el archivo
   preferido aunque su mezcla esté contaminada; no heredar aprobación a una separación derivada.
2. Traducir “épico/fresco” a pulso, instrumentación, energía, densidad, entrada y resolución escuchables. Un
   enlace o archivo concreto reduce ambigüedad; registrar si fue realmente enviado al modelo. Un archivo
   preparado en disco, pero nunca adjuntado, no cuenta como referencia utilizada por el motor.
3. Cerrar la imagen real antes de producir la mezcla final. La duración escrita en el prompt no es el reloj de
   los eventos generados. Motion entrega cuadro, tiempo y prioridad; Audio propone timbres y performance.
4. Seleccionar la superficie con el control necesario: generación instrumental, duración, variantes,
   referencia y acceso al resultado. “Dos conectores del mismo proveedor” no implica mismo catálogo,
   facturación, parámetros o versión. Registrar proveedor + superficie + modelo + fecha; consultar de nuevo
   sólo las capacidades volátiles necesarias antes de ejecutar. Las tablas históricas no garantizan el modelo
   más reciente ni el menor costo de hoy.

### Jerarquía de efectos y unidad con la música

Diseñar una lista de causas visibles y su peso dramático antes de producir SFX. Un evento puede necesitar
silencio o continuidad musical, no un one-shot adicional. No sonorizar cada palabra por obligación ni repetir
un motor cuando ya no hay avión. Los gestos de interfaz secundarios deben dejar espacio al momento de marca.

Para una transformación, registrar cuatro tiempos distintos: inicio de carga, crecimiento, crest y cola.
El crest puede ser un intervalo de energía sostenida, no el máximo de una muestra. Sincronizar ese gesto al
cambio de escala/luz/materia y conectarlo con el timbre o pulso musical. Si todo “cae a tiempo” pero parece
pegado encima, revisar primero familia tímbrica, frase, envolvente y jerarquía, antes de subir ganancia.

No equiparar fuerza a subgrave. Usar cuerpo medio y articulación superior de forma controlada cuando el
destino incluya parlantes pequeños. El balance por bandas y el mono detectan dependencia del subgrave o
cancelaciones; la escucha en dispositivo decide traducción real. Ninguna diferencia de dB entre buses es un
umbral universal de impacto. No rellenar con tres booms una transformación cuya dirección pide un gesto único.

### Preservar continuidad y resolución

- Definir entrada musical, desarrollo y resolución final con el arreglo real. Un silencio inicial deliberado
  no autoriza huecos interiores. Guardar la intención para no confundir un silencio diseñado con una falla.
- Usar una pista completa o un arreglo que cierre; la cola musical también pertenece al cierre. No llenar el
  tiempo restante con silencio, congelado o un fundido por defecto cuando el resultado se siente reiniciado.
- Un solo factor de tempo con afinación conservada puede resolver una duración si su efecto es aceptable;
  requiere escucha y registro. Evitar tempos distintos por escena como parche de sincronía. Conservar versión
  a velocidad original para comparar, sin afirmar que un algoritmo preserva siempre la calidad percibida.
- Separar foley, interfaz, transformación, paso, cartelas y cierre en stems editables. Versionar las ganancias,
  EQ, ducking y normalización. No insertar efectos en una canción impresa y después intentar desplazarlos
  independientemente mediante separación.
- Reabrir cue sheet si cambia el montaje. Desplazar sólo los eventos afectados; verificar comienzo y cola de
  canción antes de moverla completa. La receta V17 de−0,5 s funcionó porque el margen inicial de esos stems
  era silencio digital comprobado y el arreglo permanecía íntegro.

### Gate de ausencia de voz y entrega

| Prueba | Qué permite decir | Qué no permite decir |
| --- | --- | --- |
| Parámetro instrumental y prompt sin letra | Se solicitó una salida instrumental | El archivo carece de voz |
| Exclusión explícita del audio del video | Ese stream no entró a la mezcla nueva | Las demás fuentes están limpias |
| ASR/VAD sin detecciones | No se detectó habla en esa prueba | No hay fonemas, canto, respiración ni reverb vocal |
| Escucha completa de fuentes y mux | Juicio perceptual del oyente identificado | Aprobación del operador si no la dio |
| Mediciones y decode sin errores | Integridad/niveles de la prueba realizada | Naturalidad, frescura, impacto o voz ausente |

Guardar revisión por archivo/hash, dispositivo y persona/capacidad que escuchó. Si no existe entrada auditiva
del agente, entregar el archivo para revisión con ese límite preciso y mediciones útiles; no bloquear la
entrega técnica ya autorizada ni fingir escucha. La aprobación creativa/perceptual y publicación son estados
independientes. Una corrección rutinaria dentro del encargo no exige pedir permiso otra vez; una generación
pagada fuera del alcance aprobado sí necesita la decisión correspondiente.

### Errores que no se repiten y alternativa

| Error observado | Alternativa operativa | Gate |
| --- | --- | --- |
| Quitar voz degradando repetidamente la mezcla | Fuente instrumental limpia o nueva pista revisable | Escucha de fuente y master |
| Nueve tempos para perseguir eventos visuales | Canción continua y efectos por cue | Escucha de frase/desarrollo/cierre |
| Puente sin silencio, pero empalme audible | Volver a arreglo íntegro o edición musical expresamente aceptada | Escucha 1× del enlace y película completa |
| Clic correcto en tiempo, débil en significado | Diseñar anticipación/cuerpo/liberación | Contexto visual y escucha de impacto |
| Efecto filtrado sólo a graves | Recuperar información audible del gesto en medios/altos | Mono, bandas y dispositivo real |
| Música vaciada para destacar marca | Crear espacio gradual/espectral y preservar avance musical | No percibir pausa o reinicio |
| Reutilizar aprobación de otra versión | Identificar fuente, mezcla y delta realmente aprobados | Registro de alcance y versión |

Evidencia: [V17 y stems](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/README.md)
y [retrospectiva](../../../../docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md).
