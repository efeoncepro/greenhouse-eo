# SKY V11 — resultado revisado

**Estado:** completado y rechazado para composición final. 713 cuadros revisados; USD34,162558 facturados, excediendo USD25. [Informe](REVIEW.md). Sin audio nuevo ni segundo intento.

## Operación concreta

- fal `bytedance/seedance-2.5/reference-to-video`, tarea `reference`.
- Una salida de 30 s, 1080p, 9:16, H.264, bitrate alto.
- `generate_audio:false`; ninguna referencia sonora.
- Diez imágenes: búsqueda vacía/lateral, búsqueda escrita/lateral, resultados, turno de usuario, respuesta/cita, activación de cita y cuatro vistas aisladas del A320neo.
- Un MP4 mudo de exactamente 5 s / 120 cuadros: v9 entre 10,5 y 15,5 s. Sólo gobierna aproximación, pass y salida; no orden ni timing global.
- Fuente local, rol, hash y orden en `references.local.json`; URLs después de subir en `references.uploaded.json`; payload literal en `request.json`.
- Dos nuevas referencias de búsqueda renderizadas desde el kit existente. Corrigen el encuadre recortado de la referencia lateral v6. Son insumos del modelo, no una sustitución de la UI generativa del film.

## Dirección y preservación

El prompt fija toda la secuencia: búsqueda → Enter → resultados → turno → respuesta → cita → brillo/avión → cielo limpio → azul → morado. Tres comportamientos de cámara abarcan interfaces y vuelo. El impulso de cita debe continuar al avión, sin plano lejano estático ni disolvencias de dos aeronaves. La referencia corta transmite el movimiento aéreo logrado sin copiar el animatic completo con frenada y cierre incorrecto.

Entre 15,75 y 25,75 s: cielo vivo continuo con centro reservado para cartelas v3. Transición a azul completada a 26 s, azul hasta 27,5; transición a morado hasta 28,5; hold hasta 30. No se envían textos/logo/URL de las cartelas al modelo. Se componen después en las capas aprobadas, URL Bubble en Luminosidad.

## Presupuesto

Tarifa consultada 2026-09-24: `1080 × 1920 × (5 + 30) × 24 / 1024 / 1000 × 0,0234 × 0,6` = **USD 23,88204**. Propuesta: un único intento, presupuesto USD 25 para generación, antes de impuestos. Estimación, no tope de factura impuesto por fal. El margen absorbe variación menor de duración/dimensiones; no autoriza reintentos. Audio excluido porque se genera después del cierre de imagen.

Fuente: https://fal.ai/models/bytedance/seedance-2.5/reference-to-video
Schema audio/tarea/resolución: https://fal.ai/models/bytedance/seedance-2.5/reference-to-video/api

La regla de gasto de `motion-design-studio/modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md` exige monto/alcance aprobados antes del POST; el turno anterior dejó ese importe pendiente. `fal-job.ts submit` exige un `budget-approval.json` con hash del payload, presupuesto y un solo intento, más saldo suficiente y guardia exclusiva contra doble envío. No crear ese registro hasta recibir aprobación del operador.

## Ejecución y QA después de aprobación

1. Registrar aprobación ligada al hash del request. Enviar una sola vez; persistir request ID inmediatamente.
2. Monitorear el mismo ID; nunca reenviar tras timeout. Descargar al completarse y comparar saldo con límites de atribución si hay gasto concurrente.
3. Inspeccionar todos los cuadros a fps nativo, reforzar con cuadros completos las interfaces, activación, paso aéreo y reservas. Reproducir el film íntegro para ritmo y continuidad. El proveedor completado produce un candidato, no una aprobación.
4. Verificar cámara lateral al escribir, secuencia AEO, ortografía/identidad, ausencia de doble avión/frenada/retroceso, cielo animado sin letras y cierre correcto. Rechazar defectos visibles; no gastar otro intento automáticamente.
5. Componer v3 y URL sin cambiar sus fuentes aprobadas; comprobar legibilidad y timing sobre la placa real. Si los tiempos derivan, revisar esa variante antes de fijar imagen.
6. Sólo con imagen cerrada: cue sheet de eventos reales, generar/reusar instrumental y SFX limpios, mezcla a velocidad estable, escucha integral sin voz y export final.

## Qué no acredita esta preparación

No acredita fidelidad del próximo resultado, continuidad perfecta por contrato, master final, audio, factura ni publicación. Esta sección describe el preflight histórico. La ejecución y su rechazo están registrados en REVIEW.md; el master aprobado no se modificó.

## Ejecución autorizada

El operador confirmó el presupuesto y pidió aprovechar un solo intento. `budget-approval.json` liga esa autorización al hash exacto del request; `qa/pre-submit-review.md` registra revisión final. fal aceptó con HTTP 202 y el ID quedó persistido antes de salir. No hay autorización de un segundo intento.
