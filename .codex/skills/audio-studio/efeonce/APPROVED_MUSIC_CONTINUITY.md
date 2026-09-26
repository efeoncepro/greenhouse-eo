# Continuidad de música aprobada en versiones audiovisuales

> Receta comprobada 2026-09-13 en Fiestas Patrias de Efeonce. Coordinar con Motion Design Studio.
> Caso completo: [metodología integral](../../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md).

## Dirección, aprobación y procedencia

La música responde al contexto cultural y al tono de la pieza: el pedido fue una cueca chilena, no una pista
latina genérica. Instrumentación, fraseo, pulso y carácter se juzgan mediante escucha. La autenticidad percibida
no se puede inferir del prompt, nombre del archivo o modelo. La aprobación del operador «Ya la escuché y la
cueca suena muy bien» cerró la revisión musical de esta campaña; no seguir reportándola como pendiente por
repetir el LEEME de una versión anterior.

Conservar fuente original, proveedor, fecha de generación, plan/licencia y comprobación aplicable a la pieza.
En este caso la pista existente procedía de ElevenLabs vía Magnific; v08 registró plan pagado y consulta de
licencia comercial en `https://www.magnific.com/ai/music-generator` el 2026-09-13. Es evidencia histórica de
esta producción, no una autorización universal para futuras pistas. Reverificar licencia/plan cuando cambie
el activo, uso o proveedor; documentar los derechos fuera del saldo de créditos.

## Versionar imagen sin alterar el audio aprobado

1. Identificar el master cuya música fue escuchada y aceptada. La versión visual más nueva no implica una
   nueva versión musical. Registrar duración, puntos de entrada/salida y mezcla aprobada.
2. Si el nuevo export conserva duración y sincronía, reutilizar su AAC con mapeo explícito y `-c:a copy`.
   Así v09 y v10 preservaron la cueca sin recodificar. No sustituirla por el audio generado por el motor de video.
3. Comparar el SHA-256 del **payload de audio** entre masters. El MP4 completo debe cambiar cuando cambia
   la imagen. Una extracción comparable puede usar FFmpeg `-map 0:a:0 -c:a copy -f hash -hash sha256 -` en
   cada archivo; conservar el resultado y el comando utilizado.
4. Si se necesita otro corte, duración o mezcla, no prometer identidad de stream: guardar el original, producir
   derivado explícito y revisar la transición/escucha afectada. Igualdad de audio codificado tampoco demuestra
   por sí sola igual sincronización; revisar timestamps/duración y reproducción del nuevo contenedor.
5. Mantener el audio integrado en el MP4 de publicación y verificar que el export contiene el stream correcto.
   No generar música nueva por una adaptación de aspecto cuando la aprobada cumple el nuevo montaje.

## Medición y límites

v08 documentó estéreo 48 kHz, −16.03 LUFS-I y −3.15 dBTP. Son resultados medidos del caso, no targets
universales ni prueba de autenticidad musical. Validar loudness/true peak contra el destino y la mezcla;
la escucha evalúa además instrumentos, fraseo, transiciones, sensación de volumen y relación con la imagen.
No confundir decode sin errores, aprobación visual y aprobación sonora.

El payload AAC de v08/v09/v10 quedó registrado con hash:
`e85b016506bed5ceb39a9d47a04b327e00c7717c063b9c260df565053380bd5a`.
Evidencia: `.captures/fiestas-patrias-2026-v08/LEEME.md`,
`.captures/fiestas-patrias-2026-v09/LEEME.md` y `.captures/fiestas-patrias-2026-v10-reel/LEEME.md`.
La continuidad técnica evitó nuevos créditos musicales; la capacidad de edición sigue existiendo aunque
no haya gasto generativo. Guardar export, fuente y registro de aprobación junto al paquete de entrega.

## Aprobación del carácter musical con mezcla contaminada

SKY (2026-09-24) distingue música que gusta de un master que contiene voz no permitida. No heredar
la aprobación a un stem separado con residuos vocales. Preservar la referencia; recuperar el original
instrumental si existe o proponer una pista nueva equivalente. Procedimiento y parámetros verificados:
[`NO_VOICE_MUSIC_SFX.md`](NO_VOICE_MUSIC_SFX.md). No acelerar nueve tramos para seguir la imagen;
alinear efectos al cue sheet y mantener continuidad musical.

## Cambio de duración después de aprobar la música

**Caso SKY V17, 2026-09-24.** El montaje pasó de 30 a 29,5 s al reducir una espera visual previa a la activación.
Se conservaron el arreglo y la velocidad de la canción respecto a V16; no se conservaron sus timestamps ni
el AAC del master anterior. La mezcla se reconstruyó desde WAV/stems y se codificó de nuevo una sola vez.

### Procedimiento

1. Registrar el mapa viejo→nuevo de imagen y los tiempos antes/después de música, UI, marca, vuelo y cierre.
   Separar cues que permanecen de cues que se desplazan, retiman o necesitan otro diseño.
2. Clasificar el cambio musical: `stream idéntico`, `muestras desplazadas`, `arreglo editado`, `tempo cambiado`
   o `pista nueva`. No usar “misma música” como sustituto de esta precisión.
3. Si desplazar la canción completa permite conservar arreglo, entrada y cola, medir el margen que se elimina.
   Comprobar silencio inicial exacto cuando la receta depende de él; no recortar un ataque o cola baja sólo
   porque parezca silencio en una forma de onda pequeña. La escucha confirma intención/naturalidad.
4. Preservar los eventos visuales iniciales que no cambiaron. En V17 la UI se mantuvo fija; música, marca,
   avión y cierre se movieron−0,5 s. No aplicar ese desplazamiento a todas las producciones ni a todo el master.
5. Si la duración exacta es requisito y el arreglo ya no cierra, presentar la decisión editorial: redistribuir
   un hold útil, usar otro arreglo autorizado o hacer una edición musical revisable. No extender una imagen
   congelada o insertar un vacío sólo para que el contador alcance el objetivo.
6. Mezclar desde stems, conservar fuente y premaster. Comparar muestras donde se promete conservación;
   después de normalización/compresión puede haber diferencias válidas de nivel o codec. Registrar etapa y
   objeto exacto de cada comparación, no afirmar identidad de todo el resultado.
7. Verificar el audio del mux final: sincronía, timestamps, duración, resolución musical y niveles reales AAC.
   Preservar entre resoluciones el mismo payload de audio cuando corresponda; eso no prueba aprobación sonora.

### Lo que demostró el caso

- El arreglo corto de Envato había recibido un único ajuste uniforme de tempo 1,14× en V15. V17 no añadió otro
  cambio de tempo. “Sin cortes internos” no significa “sin tratamiento” ni “idéntico al original de Envato”.
- Los primeros 0,5 s retirados de los stems desplazados se comprobaron como silencio digital; el foley inicial
  terminó antes del intervalo modificado. El script tiene asserts para esas condiciones de **ese** montaje.
- La canción pasó a entrar a 1,11 s, después de Enter ≈0,996 s. Es una consecuencia del mapa concreto, no una regla
  de inicio musical para otras campañas.
- La resolución de la canción y el cierre se trasladaron juntos. No se resolvió con corte interno, nueve
  tempos por escenas ni un puente para ocultar un silencio.
- La revisión de muestras y mediciones no sustituyó escucha perceptual; el agente la declaró no realizada.

Fuentes: [mix-v17.py](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/mix-v17.py),
[README V17](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/README.md) y
[companion de posproducción](../../motion-design-studio/companions/video-postproduction-and-delivery.md).

## Estados y autorizaciones independientes

Aprobación del **carácter musical**, aprobación de **pista**, aprobación de **mezcla sincronizada** y
aprobación de **entrega final** deben tener alcance y versión. Un feedback positivo de ritmo no autoriza
publicar ni confirma que se escuchó el archivo final. Tampoco hay que olvidar una aprobación explícita por
repetir un README antiguo. Actualizar el registro del trabajo con la evidencia más reciente.

Entregar un derivado para revisión dentro del encargo autorizado no exige otra aprobación previa. La nueva
publicación o gasto fuera de alcance sí conserva su gate. El paquete puede estar exportado y entregado mientras
la escucha/aprobación perceptual permanece pendiente, siempre que se comunique ese estado con precisión.
