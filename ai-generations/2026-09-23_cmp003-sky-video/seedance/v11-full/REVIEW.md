# SKY V11 · resultado del único intento

**Estado: render completado; rechazado para composición final.** No hay master terminado ni nuevo audio. Las cartelas punch-v3 aprobadas permanecen intactas.

## Archivo y cobertura

- Fuente: [sky-v11-fal-native.mp4](sky-v11-fal-native.mp4), 1080×1920, H.264, 24 fps, 713 cuadros, 29,708333 s; siete cuadros menos que los 30 s solicitados.
- Sin pista de audio: `generate_audio:false` funcionó, no es una pista vocal silenciada en posproducción.
- Revisados los 713 cuadros en 24 hojas `qa/native-all-00.jpg` a `23.jpg`, sin saltos de extracción. Respuesta ampliada en `qa/answer-full.png`.
- Reproducción 1× comprobada por Computer Use mediante estados puntuales. Esta comprobación no equivale a observación continua de movimiento a 1×; los hallazgos se apoyan en la secuencia completa de cuadros.
- SHA-256: `f5d2a72c3471cc6c614f257028a1ff9db810355424ebf8203b4f9f12c529025a`.

## Resultado frente al plan

| Tramo observado | Resultado | Decisión |
| --- | --- | --- |
| 0–5 s | Búsqueda legible, ligera perspectiva lateral. Escritura/hold demasiado largos y escaso viaje de cámara. Resultados recién cerca de 5 s, objetivo 1,8. | No cumple ritmo/cámara. |
| 5–6,46 s | Tres resultados en orden y textos reconocibles. Cambio directo al panel completo. | No cumple turno de usuario separado. |
| 6,46–10 s | Respuesta y cita legibles; copy de respuesta correcto en cuadro ampliado. Sin revelado progresivo hacia abajo. | Copy útil; coreografía no aprobada. |
| 10–10,75 s | Zoom al chip, letras gigantes y destello; avión aparece cuando aún queda parte del gesto gráfico. Luego plano lejano. | No mantiene impulso óptico. |
| 10,75–15,25 s | Aproximación y paso cercano, con continuidad de identidad visual generalmente mejor. Paso cercano alrededor de 15 s, objetivo 12,7–13,3. | Material aprovechable como referencia; timing desplazado. |
| 15,25–25,75 s | Seguimiento trasero coherente, cielo animado, sin doble avión evidente ni humo de alas. El avión permanece toda la reserva, cruzando parte de la banda prevista de lectura. | No hay placa limpia para las cartelas aprobadas. |
| 25,3–26,21 s | Disolvencia gradual de cielo y avión a azul; todavía se ve avión a 26,17 s. | Cierre llega tarde; no es salida física previa del avión. |
| 26,21–29,71 s | Azul limpio seguido de morado; sin letras inventadas. Valores de color exactos no certificados. | Orden de color útil, duración insuficiente para composición fija de 30 s. |

## Evaluación del método y responsabilidad

1. La planificación tenía todos los beats en texto, pero no daba una referencia visual específica de la salida completa del avión ni de la placa limpia posterior. Las cuatro vistas aisladas resuelven identidad, no resuelven ese destino espacial. La referencia de vuelo termina con el avión aún presente. Es una debilidad concreta del paquete; que haya causado la prolongación es una hipótesis, no una prueba causal.
2. Las referencias de estados de interfaz transmitieron apariencia/copy mejor que movimiento. El prompt describe viaje lateral y revelado, pero eso no constituyó evidencia de que el motor ejecutaría esa coreografía en un único intento. No se puede presentar una checklist de prompt como garantía.
3. El plan acopló la integración a un offset fijo de 15,75 s. El modelo no respetó los tiempos. Añadir v3 sin revisar taparía el avión y heredaría una aprobación que no existe sobre esta placa.
4. La separación de audio fue correcta: elimina la narración en la fuente. También fue correcto conservar cartelas/URL fuera del prompt, mantener una sola solicitud y monitorear hasta recuperar el archivo.
5. El control de presupuesto falló: comprobó una estimación pública y evitó duplicados, pero no impuso un máximo al proveedor. No basta con comprobar saldo ni con aplicar un descuento publicado como si estuviera validado en la factura.

## Costo confirmado

Solicitud `01a0d2c8-444a-7fd0-b606-5a2987148e87`, cuenta Efeonce 2: **USD34,162558**, confirmado por fila individual de Billing events en fal. Presupuesto autorizado USD25: excedido en **USD9,162558**. Estimación USD23,88204: diferencia USD10,280518. Saldo previo 55,747999486; saldo final 21,585441592; delta 34,162557894, consistente con la fila facturada.

La [página pública de precios](https://fal.ai/models/bytedance/seedance-2.5/reference-to-video) consultada indica fórmula por dimensiones/duración y multiplicador 0,6 con video. La cantidad facturada no coincide con la estimación aplicada. No está demostrado el motivo: no atribuirlo a bitrate, audio, descuento ausente o referencias de imagen sin evidencia adicional. Datos en `billing-verified.json` y `balance-final.json`.

## Decisión de producción y alcance restante

- No integrar cartelas ni generar música/SFX sobre esta versión. `qa/picture-review.json` bloquea el compositor.
- No reenviar ni crear otra generación: el único intento autorizado fue consumido.
- No existe corrección completa dentro del alcance de superponer sólo textos/cierre. Acelerar búsqueda no crea el turno ausente ni el movimiento; recortar vuelo no crea diez segundos de cielo limpio. Congelar, tapar o sustituir ese cielo incumpliría el brief.
- Conservar como piezas útiles la respuesta legible, referencia de vuelo continuo, fuente sin audio y coreografía punch-v3; no degradar la versión aprobada para aparentar un master.
- Si se decide revisar la ruta después: primero completar evidencia visual de salida y placa limpia; guiar movimientos de interfaz sin trasladar UI final a código; reconciliar precio real por solicitud; cualquier gasto nuevo requiere otra autorización. El audio sigue después de una imagen aceptada, con cue sheet medido sobre el archivo final.
