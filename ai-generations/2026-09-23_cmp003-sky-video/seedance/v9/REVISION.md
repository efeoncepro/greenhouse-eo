# SKY v9 · resultado y revisión

## Estado real

**Generación completa en fal terminada, audio conformado y candidato de revisión exportado.** La secuencia narrativa y el control de voz mejoraron. La ambición cinematográfica en UI/títulos queda parcialmente cumplida: no se declara aprobación creativa final ni se sustituye v6 aprobada.

- Entrega de revisión: `sky-v9-fal-1080p-musica-sfx-sin-voz.mp4`.
- Bruto íntegro recibido: `sky-v9-fal-native.mp4`, 1080×1920, H.264, 24 fps, 721 cuadros, 30,041667 s, ningún stream de audio.
- Request fal: `01a0d271-00d5-73a2-ae97-ef2f1582cad2`; seed 259295049; una sola solicitud completa, sin generaciones de tramos.
- Se revisaron 361 muestras a 12 fps: las 16 hojas completas de `sky-v9-fal-native-qa/`. Además se examinaron frames PNG nativos de respuesta y avión. Las hojas JPEG reducidas exageran bloques de compresión; el frame nativo no presenta ese defecto a la misma escala.
- El video generado no fue recortado, sustituido ni remontado para esta entrega. Hash del stream idéntico entre bruto y master con audio (`final-qa.json`).

## Qué quedó bien y qué falta

| Tiempo real aproximado | Resultado observado |
|---|---|
| 0–2 s | Pregunta completa dentro del campo. Escritura visible, recorrido lateral discreto. Enter pequeño: claro como indicio, no un golpe visual fuerte. |
| 2,08 / 2,33 / 2,58 s | Tres resultados, una sola aparición. Perspectiva oblicua moderada; se retiran hacia 3,75–4,08. |
| 4,08–4,33 s | Pregunta sola y transición reconocible a turno de usuario. |
| 4,50 / 4,92 / 5,33 s | Respuesta se despliega hacia abajo en grupos. Texto correcto. No vuelve a resultados. |
| 5,83–8,65 s | Cita SKY adjunta a la respuesta, lectura estable. Resuelve la omisión principal de v7/v8. |
| 8,70–10,04 s | Chip brilla y el avance se dirige hacia él. Transición al avión conserva un cambio de escena bastante marcado; menos orgánica que la ambición del prompt. |
| 10,08–13 s | Aproximación creciente y dirección estable. En frame nativo12,5 s: geometría reconocible, superficies y reflejos coherentes con referencia; sin humo saliendo de alas. |
| 13–13,42 s | Pasada cercana y cambio a vista lateral/trasera motivado por cruce del fuselaje. |
| 13,42–15,75 s | Alejamiento continuo; no nueva vuelta frontal. Permanece un desvanecimiento final del avión pese a la instrucción de sustituirlo por salida natural. |
| 15,83–18,25 s | Año y SKY en dos jerarquías, lectura más larga. Cámara lateral/volumen muy sutiles; faltó una revelación cinematográfica más fuerte. |
| 18,33–18,88 s | Plus lima entra separado, número blanco después y «piezas.» al final. Objetivo de guiar la mirada conseguido. |
| 20,83 / 21,17 / 21,50 s | Intro → agencia → SEO/AEO en orden. Pausa suficiente. Arco de cámara poco perceptible, mantiene el carácter de la previs. |
| 24,33–26 s | Gracias amplio, sin desplazar el cierre. |
| 26–27,5 s | Logos y URL visibles sobre azul. |
| 27,5–28,5 / 28,5–30,04 s | Fondo pasa a morado; cierre estable hasta terminar. |

**Balance creativo:** la guía completa fue eficaz para orden, copy y pausas; el render se apegó mucho a su puesta en escena. Es razonable inferir que esa referencia limitó la libertad de reconstrucción, pero no conocemos el mecanismo interno. La intención de tres rigs en toda la película se expresa con fuerza en el avión y solo con gestos modestos en UI/títulos. No declarar que el impacto cinematográfico pedido quedó plenamente resuelto. No se lanzó otra corrida paga para corregirlo.

La comparación de guía y salida reducidas a720×1280 da SSIM global0,812470; no son archivos idénticos ni prueba de mera transcodificación. La métrica no evalúa impacto creativo. `guide-render-ssim.log`.

## Audio

- Fuente aprobada: identidad musical/SFX de v7, separada mediante Demucs para retirar voz. Ese proceso puede alterar timbre; se conserva original.
- Cues finales ajustados a eventos observados en `audio-cues.json`; teclas y microacentos adicionales mediante impulsos/osciladores/ruido filtrado sin muestras vocales.
- El modelo recibió `generate_audio=false`; bruto sin audio; mux explícito `0:v:0` + pista sonora propia. No depende de que Seedance obedezca una prohibición escrita de hablar.
- Lectura del MP4 final después de AAC: −16,47 LUFS-I, pico verdadero −1,49 dBTP, LRA10,4 LU. Primeros190ms con amplitud cero exacta; inicio planificado0,2s.
- Scribe final, generación `XGTiAkjnyCReUdZddUdb`, transcripción **vacía**. Evidencia `audio/final-speech-check.json`. También la prueba provisional fue vacía.
- Limitación de QA: no hubo escucha humana del master en esta ejecución. El canal de herramientas no admite audio como entrada al modelo; no se presenta el ASR como garantía perceptual absoluta. El operador revisa balance/fidelidad de la música en la reproducción.

## Costos y seguimiento

- Saldo fal B antes US$46,73737994; después US$5,747999486. Diferencia observada **US$40,989380454**, ≈US$40,99. La estimación fue US$40,94064; el readback inicial inmediatamente tras completarse aún no reflejaba el débito, por eso se repitió al liquidar.
- Payload, referencias/hashes, tiempos de cola y resultado preservados. No secretos almacenados en estos artefactos.
- Monitoreo mantenido hasta resultado, revisión y export; automatización de respaldo se pausa al comunicar conclusión. Sin publicación, commit ni reemplazo de versión aprobada.

## Criterios de aceptación

- [x] Archivo completo a1080×1920 y sin audio generado.
- [x] Revisión de toda la secuencia a12fps.
- [x] Búsqueda → resultados → usuario → respuesta con cita → brillo → avión → títulos → gracias → cierre azul/morado.
- [x] Plus independiente y orden semántico de agencia.
- [x] Continuidad de tres vistas de vuelo preservada.
- [x] Mezcla sincronizada y controles de niveles/ausencia de palabras reconocidas.
- [ ] Impacto cinematográfico de UI/títulos y transición orgánica del avión: parcial, pendientes de dirección adicional.
- [ ] Aprobación perceptual de audio y aprobación creativa final del operador.
