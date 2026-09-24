# Piloto Omni V10-01: rechazado por discontinuidad

**Fecha:** 2026-09-24. **Estado técnico:** completado. **Estado creativo:** rechazado; no integrado al master. Una sola generación; no se generó audio nuevo por separado.

## Insumo y revisión

Ventana de v9 entre 6,50 y 16,00 s: 9,50 s, 1080×1920, 24 fps, 228 cuadros. MP4 más cuatro imágenes: tres vistas del avión y respuesta/cita. Payload, prompt y hashes en `cli-args.json`, `prompt.txt` y `references.json`. Salida nativa SHA-256: `cb062e17b9c48c9ab29afecfa259bc44493044028eb89d0d90f68b9198dc98fa`.

Se inspeccionaron los 228 cuadros de salida en ocho hojas, comparaciones de los extremos y el cuadro 106 a resolución completa. Índices base cero; tiempo local = cuadro/24; tiempo del master = local+6,50. No se declara reproducción audiovisual integral: el rechazo visual ya es concluyente. La revisión muda excluye el AAC entregado por el modelo.

## Hallazgos

| Lugar | Evidencia | Resultado |
| --- | --- | --- |
| Entrada, desde f0 / master 6,50 s | `qa/boundary-start.jpg`: cambia el volumen de nubes, horizonte y luz aunque conserva aproximadamente la UI | No empalma con la fuente |
| Salida del chip, aproximadamente f72–82 | `qa/output-all-02.jpg`: avión pequeño delante de letras SKY todavía enormes | Brillo más fuerte, escala/emergencia poco convincente |
| f102–111 / local 4,250–4,625 s / master 10,750–11,125 s | `qa/output-all-03.jpg` y `qa/double-aircraft-f106.png`: dos aviones superpuestos durante una disolvencia | Rechazo directo: reinicio de trayectoria y doble aeronave |
| Paso lateral y salida, tramo posterior | `qa/output-all-04.jpg` a `06.jpg`: conserva buena parte del gesto de la fuente | Material logrado ya disponible en v9; no compensa las regresiones |
| Salida, aproximadamente f223 / local 9,292 s / master 15,792 s | `qa/boundary-end.jpg`: cambia cielo, escala y posición del avión | Segundo salto; eliminar la cartela no resolvió continuidad |

## Qué corregir del planteamiento

El prompt pedía preservar extremos, cielo, movimiento y pass, pero eso es una instrucción semántica, no un bloqueo de píxeles. Además las imágenes de identidad contenían otros cielos: posible influencia no deseada, sin prueba causal. Pedir un nuevo puente y a la vez recuperar exactamente el pass anterior pudo favorecer la disolvencia entre dos soluciones; es una hipótesis, no un comportamiento universal del modelo.

Una futura prueba localizada debería reducir variables: clip como única autoridad espacial, referencias realmente aisladas sólo si hacen falta, una intervención central y margen de preservación revisado. Esto no garantiza continuidad y no se ejecutó otra llamada. No tapar fallos con disolvencias del avión ni reconstruir la UI por código fuera del alcance autorizado.

## Decisión y siguiente ruta

No integrar este clip ni encadenar más ventanas con esta configuración. La condición de continuidad del operador no está satisfecha. El master fuente y las cartelas v3 aprobadas permanecen intactos. Una generación completa evita empalmes entre reparaciones, aunque también requiere QA y una nueva decisión de gasto; el plan canónico conserva esa alternativa. No presentar esa ruta como garantía de buen resultado.

El orden obligatorio queda: cerrar película y composición de cartelas → revisión densa de cuadros y reproducción completa → cue sheet con eventos reales → generar música/SFX → mezcla y escucha integral. Música y SFX no se generan hasta fijar la imagen.

## Costo

Uso informado por Google: 58.012 tokens de entrada, 82.536 de video de salida y 642 de pensamiento. Aplicando tarifas consultadas: USD 1,537176 (~1,54), antes de impuestos/otros cargos. Estimación basada en uso, no factura. Desglose en `cost-usage.json`; respuesta del proveedor en `completion.log`. No hubo un segundo intento.
