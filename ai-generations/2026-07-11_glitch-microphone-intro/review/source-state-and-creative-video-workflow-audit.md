# Auditoría de causa raíz — estado fuente y workflow de video creativo

> Fecha de validación: 2026-07-11. Estado: **hallazgo confirmado; gasto congelado.** Esta auditoría no aprueba ningún take, no autoriza publicación y no agrega outputs a producción.

## Resumen ejecutivo

La ronda no falló solamente por escoger malos modelos. El error principal ocurrió antes de la inferencia: se declaró el key visual 4K como primer frame inmutable, aunque ese frame ya muestra la yema tocando la rejilla, los arcos azules activos, la pantalla con señal y el `ON AIR` encendido. Al mismo tiempo, el contrato exige comenzar con aire visible, hacer dos contactos nuevos y activar la señal sólo después del segundo.

Esas dos verdades no pueden cumplirse simultáneamente. Un modelo image-to-video debe respetar el estado inicial o inventar una retirada previa, apagar/reencender señales y después ejecutar dos taps. Los prompts T–Z intentaron resolver esa contradicción mediante texto, pero el texto no cambia el contenido del primer frame. La consecuencia repetida —contacto inicial, retirada adicional, apoyos prolongados o señal ajena— era previsible.

El preflight nativo de Magnific, ejecutado con el mismo brief y sin generar video, detectó la contradicción y bloqueó la generación hasta decidir si la toma comienza después del contacto existente o si primero debe retirarse el dedo. Ese gate debió ejecutarse antes de gastar.

## Evidencia local

### Matriz de compatibilidad del estado inicial

| Elemento | Estado visible en el 4K | Estado exigido al frame 0 | Compatibilidad |
| --- | --- | --- | --- |
| Índice | Yema en contacto con la rejilla | Hover con 6–10 mm de aire | **Incompatible** |
| Arcos azules | Ya visibles/activos | Respuesta sólo después del segundo lift | **Incompatible** |
| Pantalla/consola | Ya muestra actividad | Estado previo a confirmación | Ambiguo; requiere decisión |
| `ON AIR` | Encendido e integrado al estudio | Encendido e integrado desde el inicio | Compatible |
| Micrófono, set, color y composición | Estado canónico | Inmutables | Compatible |

El conflicto está versionado en:

- `sequence-script.md`: frames 0–4 exigen hover y frames 20–28 hacen aparecer la confirmación visual.
- `motion-and-sound-spec.md`: exige hover desde 0,00 s y reacción visual sólo después del segundo contacto.
- `prompts/seedance-2-source-keyvisual-t-tap-tap.md`: reconoce que el dedo parte tocando y ordena primero romper contacto antes de dos golpes.
- prompts U/V/X/Z: llaman al 4K “verdad visual inmutable” y, a la vez, describen un inicio en hover.
- `review/take-a-natural-review.md`: ya observaba que la fuente parte en contacto y con arcos visibles. Ese hallazgo no se promovió a gate de producción.

### Confirmación del preflight de Magnific

Se pasó el brief —incluida la contradicción explícita— a `video_plan`, sin adjuntar el asset ni llamar a generación. El plan respondió `Do not call video_generate` y pidió resolver primero:

1. si el video debe comenzar después del toque ya representado; o
2. si debe retirar primero el dedo para fabricar el hover antes de los dos taps.

Esto confirma que una capa de producción competente no considera el prompt listo. El hallazgo no depende de una opinión posterior sobre el output.

## Qué hacen mejor las plataformas creativas

La diferencia no es sólo el modelo. Higgsfield, Magnific, Runway, Adobe Firefly y Google Flow agregan una capa de producción encima del motor:

1. **Normalización del estado fuente.** Permiten editar o aprobar el still antes de animarlo. Higgsfield Canvas y el editor de frames de Firefly hacen visible esta etapa.
2. **Entradas con roles explícitos.** Separan frame inicial/final, identidad visual, ingredientes, referencia de movimiento, cámara y audio. El usuario no necesita esconder todas esas funciones en un prompt monolítico.
3. **Control visual.** Higgsfield Draw-to-Video y Magnific Visual Prompt permiten marcar regiones, flechas o instrucciones sobre la imagen. Esto reduce ambigüedad espacial, aunque no garantiza un contacto literal de uno o dos frames.
4. **Keyframes y motion reference.** Runway, Firefly, Google Flow, Luma y los workflows de Kling interpolan entre estados o transfieren una actuación. Eso es más adecuado que pedir microtiming sólo con texto.
5. **Preflight/model routing.** Magnific exige `video_plan` antes de generar; Google Flow advierte combinaciones no soportadas y recomienda evitar guía conflictiva; las Apps de Runway encapsulan modelos y defaults por tarea.
6. **Iteración sobre assets, no sobre prompts sueltos.** Mantienen frames, versiones, clips y workflows reutilizables, con edición/revisión antes del siguiente gasto.

### Fuentes primarias consultadas

| Plataforma | Evidencia relevante | Confianza |
| --- | --- | --- |
| Higgsfield | [Cinema Studio 3.0](https://higgsfield.ai/blog/cinema-studio-3), [Draw-to-Video](https://higgsfield.ai/blog/Turn-Your-Sketch-Into-a-Cinema), [Canvas](https://higgsfield.ai/blog/Introducing-Higgsfield-Image-Editing), [Start/End Frame](https://higgsfield.ai/blog/A-Guide-to-Kling-Turbo-Start-End-Frame), [Motion Control 3.0](https://higgsfield.ai/blog/kling-motion-control-3) | Alta para existencia del workflow; media para eficacia, porque es documentación del vendor. |
| Magnific | [Video Generator](https://www.magnific.com/de/ai/docs/video-generator), [Spaces](https://www.magnific.com/ru/ai/docs/spaces-overview), [Media nodes](https://www.magnific.com/ru/ai/docs/media-nodes) y preflight `video_plan` observado en esta sesión | Alta para workflow/preflight; eficacia del output aún no probada en este plano. |
| Runway | [Seedance 2.0](https://help.runwayml.com/hc/en-us/articles/50488490233363-Creating-with-Seedance-2-0), [Kling Motion Control](https://help.runwayml.com/hc/en-us/articles/50280558448147-Creating-with-Kling-3-0-Motion-Control), [Edit Studio](https://help.runwayml.com/hc/en-us/articles/51683104370451-Creating-with-Edit-Studio) | Alta para capacidades y límites documentados. |
| Adobe Firefly | [Image-to-video con first/last frames](https://helpx.adobe.com/sg/firefly/web/work-with-audio-and-video/work-with-video/generate-videos-using-images.html), [motion reference](https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-video/match-camera-motion-to-reference-video.html), [edición de frames](https://helpx.adobe.com/sg/firefly/web/work-with-audio-and-video/work-with-video/modify-videos-by-editing-frames.html) | Alta para capacidades y restricciones del producto. |
| Google Flow / Veo | [Crear videos con frames e ingredientes](https://support.google.com/flow/answer/16353334?hl=en), [matriz de modelos y features](https://support.google.com/flow/answer/16352836?hl=en) | Alta. Su guía dice expresamente que el prompt debe complementar, no contradecir, los inputs visuales. |
| Luma Dream Machine | [Keyframes start/end](https://lumalabs.ai/learning-hub/how-to-use-keyframes) | Alta para la existencia de interpolación; no evaluada para este macro táctil. |

## Qué hicimos mal

### Fallos de preproducción

- No hubo un gate `source state ↔ first-frame contract`.
- Se trató “1–2 frames” como parámetro controlable por prompt. A 24 fps son 42–83 ms; los modelos continuos suelen traducir “tap” a una pose perceptible y no ofrecen garantía contractual por frame.
- Se intentó resolver una contradicción visual con prompts más rígidos en vez de preparar un frame precontacto aprobado.
- Se produjo audio antes de aprobar la física visual, aunque el audio depende de contactos que aún no existían correctamente.

### Fallos experimentales

- U, V y X repitieron la misma hipótesis de referencia temporal con varios cambios simultáneos; no constituyeron A/B controlado.
- Las guías temporales se construyeron reordenando frames de T, ya rechazado, en vez de una actuación humana ground-truth.
- W partió de un frame generado de V y no del 4K canónico; Y editó W y apiló deriva; Z mezcló el 4K con una actuación proveniente de otro estudio.
- Se cambiaron modelo, modo Standard/Fast, resolución, audio y guía entre intentos. El resultado no permite atribuir mejora o fallo a una sola variable.
- Se continuó después de dos fallos equivalentes. El stop rule era declarativo, no operativo.
- El blocking 3D demostró timing fácil, pero no resolvió el problema difícil: fidelidad visual. No debió proponerse como puente a otro modelo y queda descartado por dirección.

### Fallos documentales

- `README.md` todavía llamaba a I “candidato editorial actual” aunque el mismo documento y su revisión lo rechazan.
- `manifest.json` conservaba estados `technical-candidate`/`awaiting-creative-approval` históricos sin una advertencia suficientemente visible.
- Revisiones históricas S/T describían el audio como golpe directo de rejilla; el contrato vigente es respuesta amplificada por monitor/corneta.
- La retrospectiva concluía que la ruta siguiente era práctica o 3D. La evidencia sólo permite cerrar la ruta **con la fuente contradictoria actual**; no permite descartar workflows generativos con un frame inicial correcto.

## Workflow corregido y stop rules

### Gate 0 — decisión narrativa obligatoria

Elegir una sola opción antes de generar:

- **A. Aceptar el estado actual:** el plano abre con el dedo ya tocando y la señal ya activa. Entonces se elimina el hover inicial y no se narran dos taps nuevos.
- **B. Mantener la acción solicitada — recomendada:** crear y aprobar un nuevo key visual precontacto, derivado del diseño 4K, con la yema elevada 8–12 mm, sin arcos de respuesta previos y con el estado de consola definido. El `ON AIR` sigue encendido como practical diegético.

No existe una opción C que llame inmutable al frame de contacto y simultáneamente lo use como frame de hover.

### Escalera de prueba

1. Aprobar el still precontacto aislado: composición, mano, micrófono, color, `ON AIR` y ausencia de señal posterior anticipada.
2. Ejecutar preflight del producto (`video_plan` o equivalente) y validar que no detecte contradicciones ni referencias faltantes.
3. Probar **un solo tap**, silencioso, en un clip corto. Evaluar contacto perceptual y rebote; no exigir todavía doble tap ni audio.
4. Si pasa, probar doble tap con una referencia de actuación humana original a 60/120 fps cuando el motor admita motion control. La referencia debe mostrar sólo mano/dedo, cámara fija y el timing deseado; no debe provenir de un take rechazado.
5. Sólo después ampliar a cinco segundos y revisar continuidad completa.
6. Diseñar/montar exactamente dos respuestas `micrófono → preamp → monitor/corneta` únicamente sobre un visual aprobado.
7. Preparar candidata, upscale y transición sólo después de todos los gates.

### Registro experimental mínimo

Cada intento debe declarar: hipótesis, una sola variable, asset source-of-truth, rol de cada referencia, modelo/modo/resolución, costo simulado, costo real, artefactos, gate y decisión. Máximo dos fallos equivalentes por arquitectura; el tercero requiere cambiar representación o volver a preproducción.

## Decisión vigente

- No generar de nuevo desde el 4K actual bajo el contrato hover/doble tap/señal posterior.
- No continuar 3D, no usarlo como referencia y no apilar ediciones sobre takes rechazados.
- No generar ni mezclar audio hasta aprobar la actuación.
- No declarar que Higgsfield, Magnific u otro producto garantizará contactos de 1–2 frames. Sus workflows son mejores para preparar y controlar el experimento, pero el gate se valida en el output.
- Reabrir gasto sólo después de aprobar la opción A o B y documentar un preflight sin contradicciones.

## Estado de cierre

El piloto permanece **sin master aprobado / sin candidata / sin publicación**. Los binarios existentes son evidencia privada archivada; esta auditoría es documentación operativa, no un output de producción.
