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
