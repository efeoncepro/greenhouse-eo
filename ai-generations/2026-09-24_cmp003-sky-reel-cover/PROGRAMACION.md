# CMP-003 · Programación SKY nos eligió de nuevo

Estado: PROGRAMADO en Metricool; todavía no publicado. Autorización directa del operador el 2026-09-24: programar a mediados de octubre, en días hábiles y mejores horarios, los tres canales con video, portada y copies.

Zona: America/Santiago, UTC−03:00 en las fechas elegidas.

| Canal | Fecha y hora local | ID | Planner |
| --- | --- | --- | --- |
| Instagram Efeonce (@efeoncepro) | 2026-10-13T16:00:00 | 381420638 | [Abrir](https://app.metricool.com/planner/calendar?blogId=3961547&openWithPostUuid=2865505689355437489) |
| LinkedIn Efeonce | 2026-10-15T11:00:00 | 381420730 | [Abrir](https://app.metricool.com/planner/calendar?blogId=3961547&openWithPostUuid=-6530324135053210327) |
| LinkedIn Julio Reyes | 2026-10-16T11:00:00 | 381420855 | [Abrir](https://app.metricool.com/planner/calendar?blogId=5105024&openWithPostUuid=5258866990716306833) |

## Criterio de horario

Instagram: martes 13 a las 16:00, máximo semanal devuelto (311). LinkedIn personal: viernes 16 a las 11:00, máximo (2914). LinkedIn Efeonce: jueves 15 a las 11:00 (2790), siguiente pico hábil disponible porque el viernes 16 a las 11:00 ya existe el post 381375024; no se movió ni duplicó. Los índices de LinkedIn fueron idénticos entre marcas: se reportan como señal devuelta por Metricool, no como prueba de analítica personalizada ni predicción de rendimiento.

## Archivos y verificación

- Video V17 aprobado: 1080×1920, 29,5 s, 24 fps, H.264/Rec.709 + AAC estéreo 48 kHz. No recodificado para programar.
- Portada V4 aprobada: PNG 1080×1920, flecha SKY verde.
- Los tres MP4 y las tres portadas re-alojados en Metricool responden HTTP 200 y son idénticos byte por byte a las entregas aprobadas (SHA-256).
- Readback independiente tras crear: textos completos idénticos; cuenta/red, fechas, zona, video, videoThumbnailUrl y estado PENDING verificados. autoPublish=true; draft=false.
- Instagram REEL, showReelOnFeed=true, isAiGenerated=true. LinkedIn POST con video y portada.
- Copy personal conserva «mi equipo Efeonce»; institucional primera persona plural. Sin handles o etiquetas añadidos.
- mediaAltText devolvió null para videos: no se afirma alt text nativo. No se afirma haber escuchado el audio; su identidad se conserva porque el MP4 completo coincide.
- No se creó monitor; PENDING no prueba publicación futura. No commit ni push.

## Evidencia

posts-approved.json · metricool-readback.json · media-hashes.json · remote-media-verification.json · best-times.json.

La instrucción directa de programación gobierna esta operación. No se infiere del acto de programar que la firma de adenda histórica haya sido verificada.
