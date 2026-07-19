# Clean generative shot → deterministic 15/10/6 campaign family

> Estado: **validado** — 2026-07-18 · Evidencia:
> `ai-generations/2026-07-18_high-frequency-campaign-e2e/`

## Cuándo usarla

Cuando existe un clean motion shot aprobado de 5–10 s y una familia still exacta, pero la campaña
necesita masters de **15 s, 10 s y 6 s** sin inflar duración artificialmente ni pedir una generación
larga por cada entrega. Funciona especialmente cuando la propuesta puede demostrarse con los formatos
reales de la campaña.

No usarla para ocultar que falta una acción, un segundo punto de vista o continuidad física. En ese
caso se produce un nuevo shot —Seedance desde referencias cuando preservar set/sujeto sea prioritario;
Omni cuando la microescena pueda reinterpretarse— y se vuelve al animatic.

## Contrato

- **Input:** clean shot aprobado + 2–3 stills con claims exactos + formatos release + end card.
- **Locks:** identidad, dirección de movimiento, paleta, copy, logo, URL, duración y safe zones.
- **Variable:** timing de beats, crop/pan determinista y composición del format wall.
- **Output:** familia 15/10/6 exacta, 16:9 + 9:16 según matrix, audio medido por archivo y lineage
  sin inferencia incremental.
- **Gate humano:** animatic/EDL antes del render; reproducción completa y escucha antes de publicación.

## Pasos

1. Formaliza cinco beats: **gancho motion → beneficio → sistema → demostración → resolución**.
2. Fija timecodes en animatic y EDL. El hero validado usó `7.2 + 1.5 + 1.5 + 2.3 + 2.5 = 15.0 s`.
3. Usa el clean shot sólo donde aporta movimiento. Los claims y la firma vienen de stills oficiales,
   nunca de texto/logos generados.
4. Construye el **format wall** con piezas release reales. Las entradas laterales demuestran escala;
   no es una transición decorativa.
5. Compón en el raster fuente, luego escala determinísticamente al raster de entrega. Declara que
   1080p es raster escalado si el shot fuente es 720p; no lo presentes como detalle nativo.
6. Diseña audio desde el animatic. En el caso validado, el audio nativo se unió con `acrossfade`,
   recibió compressor y `loudnorm`; el primer limiter fue rechazado por inter-sample peaks.
7. Monta 15/10/6 como tres argumentos, no como trims ciegos (tabla siguiente).
8. Mide con EBU R128 después de cada encode AAC. Gate validado: `−17..−15 LUFS` y true peak `≤ −1 dBFS`.
9. Genera poster, contact sheet, hashes, manifest y agrega cada duración aprobada al review board/paquete.

## Arquitectura temporal 15/10/6

| Duración | Trabajo narrativo | Estructura mínima | Qué se elimina primero |
|---|---|---|---|
| 15 s hero | explicar el sistema completo | hook → beneficio → sistema → format wall/prueba → resolución/end card | detalle secundario, nunca la prueba |
| 10 s master | argumento condensado | hook → beneficio/sistema unidos → prueba → resolución/end card | pausa, repetición y support copy |
| 6 s bumper | reconocimiento + evidencia instantánea | hook (0–1,5 s) → prueba (1,5–3,5 s) → firma/resolución (3,5–6 s) | explicación; una idea, un claim |

- Cada duración tiene su propia EDL, poster y safe-zone check; no usar `trim 15s → 10s → 6s` como método.
- El clean shot puede ocupar proporciones distintas del tiempo, pero nunca se congela o estira para llenar.
- Copy, logos, claims, URL, captions y end card vienen de assets exactos. El modelo aporta mundo/movimiento,
  no precisión tipográfica.
- Si la prueba no cabe en 6 s, simplificar el mensaje; no acelerar hasta volverlo ilegible.

## Audio y post por duración

1. Diseñar una sesión modular con stems: `native-approved`, foley, whoosh/transitions, tonal bed/music,
   VO opcional y stinger/end card. Audio nativo Omni/Seedance es scratch hasta revisión aislada.
2. Reeditar eventos para cada EDL; un impacto no puede quedar fuera de sincronía por recortar el master.
3. Usar `acrossfade`/fades para continuidad, compressor sólo si resuelve dinámica y limiter true-peak al final;
   el caso validado rechazó un primer limiter por inter-sample peaks.
4. Medir 15, 10 y 6 por separado después del encode final. Un stem aprobado no garantiza el master AAC.
5. Captions, logo/end card, grade, resize, sharpen y codec pertenecen a post determinístico y conservan rollback.

## Router Gemini Omni vs Seedance 2.0

| Necesidad real | Mano | Regla |
|---|---|---|
| Animar un clean plate que tolera reinterpretación; microescena o transformación conversacional | Gemini Omni | un delta, gate temporal y audio scratch |
| Crear **otra toma**, ángulo, acción inexistente o continuidad adicional preservando sujeto/set/objeto | Seedance 2.0 image/reference-to-video | fallback de producción de shot, no herramienta de finish |
| Cambiar timing, orden, trim, freeze, crop, safe zone, copy/logo, captions, grade, foley, mezcla o loudness | NLE/composite/audio post | defecto editorial; no regenerar |
| Anatomía, actuación o causalidad física no existe en ningún frame | reabrir toma integral: Seedance/Omni/filmación/3D según fidelidad | no falsificar con retime u overlay |

**Seedance no es fallback para defectos de edición.** Sólo entra cuando falta verdad temporal nueva. Si el
shot ya contiene la acción correcta, terminar 15/10/6 en post. Si no la contiene, producir una nueva toma y
volver al animatic antes de tocar el resto de la familia.

## Qué no hacer

- No estirar o congelar un clip hasta 15 s sólo para llenar tiempo.
- No convertir una secuencia de stills en slideshow sin arco ni demostración.
- No regenerar por problemas de timing, copy, logo, formatos o audio.
- No declarar PASS por el filtro configurado: medir cada archivo AAC final.
- No usar Seedance/Omni para fabricar un segundo plano si el animatic funciona con material existente.
- No llamar “cutdown” a un trim que perdió hook, prueba o end card.

## Fallback Seedance para toma nueva

Usa Seedance 2.0 image/reference-to-video si la revisión completa detecta que la familia depende demasiado
de una sola toma y requiere un ángulo, acción o continuidad **nuevos** preservando colibrí, estela, set y
dirección. Cotiza segundos × variantes, aprueba gasto, produce sólo ese shot y revisa continuidad a
1×/0.5×/contact sheet. No lo uses para reparar crop, pacing, copy/logo, grade o audio/post.

## Costo y evidencia

- Inferencia incremental del hero validado: **USD 0**.
- Resultado validado: dos hero de 15 s, dos masters de 10 s y dos bumpers de 6 s, 16:9/9:16 según matriz,
  H.264/AAC. Los 10/6 reutilizaron el shot aprobado y composición determinística; no añadieron inferencia.
- QA: 16:9 `−16.3 LUFS / −2.0 dBFS`; 9:16 `−16.4 LUFS / −2.2 dBFS`.
- Script reproducible:
  `ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/10-compose-hero-15s.mjs`.
