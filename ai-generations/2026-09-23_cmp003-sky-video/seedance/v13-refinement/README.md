# SKY V13 · correcciones sobre V12

2026-09-24. Export para revisión: `sky-v13-refined-1080p.mp4`, 30 s, 1080×1920, 24 fps, 720 cuadros. **USD 0 adicionales.** Sin solicitudes de generación, publicación, commit ni push.

## Feedback aplicado

- **Transición:** V12 sustituía el portal por un bloom de V7. Ahora el tramo V11 nativo contiene la cita, la luz y la aparición del mismo avión. Fuente9,75–25 s, salida9–26 s. La primera parte se acelera1,5×; tras output14 s se conserva el movimiento de las nubes a menor velocidad. No hay unión entre portal y avión. Se mantiene un corte editorial V9→V11 en9 s.
- **URL Bubble:** SVG/alpha original y Luminosidad intactos; ancho620→320 px (−48,4%), centrado380,1245. Es una variante de escala solicitada por el operador; la aprobación original no se extiende automáticamente al nuevo cierre.
- **Morado:** objetivo#50015C, tomado del fallback del encabezado en la referencia archivada `kit/refs/home.html`, más profundo que#701C74. Es evidencia local del sitio, no validación de un manual actual de marca.
- **Música:** la referencia apreciada era V7, no V6. Separación instrumental local de V7 con modelos ya disponibles. Se excluyó TODO el material fuente15,1–24,4 s, incluidos los stems de ese intervalo, para no confiar en supresión de voz. Un puente repite material instrumental10,6–15,1 s a velocidad1×, con fundidos. Conserva el final original desde24,4 s. Derivado editorial, no stream idéntico ni nueva composición.
- **SFX:** se retiraron los32 recortes V6 de V12. Síntesis local por acción: teclas secas, Enter, deslizamiento de resultados, expansión del chat, fijación de cita, aire del portal, motor continuo con paneo/Doppler y dos acentos tipográficos (+ y SEO/AEO). Sin golpes por cada línea ni clic de URL. El cierre se apoya en la música.

## Verificación y límites

`qa/final-export.json` contiene hash y metadata. Decodificación completa sin errores. Revisión de overview30 s,180 cuadros consecutivos del tramo8,5–16 s, enlace a12 fps y cierre nativo. Cartelas mantienen fuentes/hashes; cielo sigue en movimiento. AAC final:−16,12 LUFS-I,−1,53 dBTP, LRA13 LU (`qa/audio-mix.json`).

ASR local en original V7 localizó la lectura15,46–23,76 s (`qa/speech-audio.json`); por eso se excluyó un intervalo mayor. El stem `other` dio vacío. El master produjo la frase ajena «Subtítulos…Amara.org» con palabras de duración cero; con VAD la misma frase se desplazó del final al inicio. Esto es compatible con un falso positivo, **no prueba auditiva ni resultado ASR limpio**. Los reportes se conservan íntegros.

El agente no dispone de entrada de audio y no efectuó escucha perceptual. No declarar el sonido aprobado ni garantir ausencia de artefactos de separación, calidad del puente o timbre del motor a partir de métricas. Presentar la mezcla como candidata para escucha. La limitación ya se comunicó en V12.

## Reproducción

`render-picture.py` → revisión/hash `qa/picture-review.json` → `compose-approved.mjs` → separación local cuatro stems V7 → `mix-audio.py`. `check-speech.py` y variante VAD son controles auxiliares locales; cero cargos de inferencia. El compositor protege exports existentes. Fuentes originales y V12 preservadas.
