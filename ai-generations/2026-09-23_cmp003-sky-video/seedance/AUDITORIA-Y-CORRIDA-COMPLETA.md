# CMP-003 — auditoría de la prueba v4 y corrida completa Seedance

## Por qué se veían dos aviones con ritmos distintos

`sky-v4-plane-preview-916.mp4` era un ensamble local con FFmpeg: H3 v3 0–7,90 s; Seedance multivista 0,70–2,50 s; H3 v3 9,70–15,104 s. Se mantuvo la pista completa de audio de H3 v3. El salto entre un avión frontal que crece rápido, un plano lateral que avanza más lento y la salida trasera no fue generado por Seedance como una sola trayectoria. La prueba no sigue la ruta acordada en `PRODUCCION.md` (H3 exploratorio → Seedance completo 18–20 s).

La estela blanca pertenece al regreso al video H3 v3. Su prompt pedía literalmente `a contrail forming` en la toma 8,8–10,2 s. La nueva instrucción elimina humo, estelas y chorros de condensación; los motores no deben tener escape visible.

## Qué referencias se usaron realmente en las pruebas cortas

| Corrida | Entrada | Resultado |
| --- | --- | --- |
| `probe-chip-to-sky-916.mp4` | R3 chip-sol; render oficial V02; R4 avión en cielo | Cielo y entrada con impacto, pero el avión perdió la marca y terminó genérico. Rechazada. |
| `plane-pass-multiview-916.mp4` | R4; render oficial V02; render oficial V10; render oficial VR | Conservó mejor la marca durante la aproximación; deformó detalles al acercarse demasiado. Sólo se usó un tramo en el montaje rechazado. |
| `plane-v10-continuation-916.mp4` | Un cuadro editado con `image_gen` a partir de V10, C1-b y R4 | Alternativa de prueba. No se usa como referencia de la corrida completa: el avión oficial sigue siendo la autoridad geométrica y de marca. |

## Corrida completa en Seedance 2.5

Request ID: `01a0d0e7-5f62-7761-9d2a-45f6bd11053b`; seed devuelto `312163878`. Endpoint `bytedance/seedance-2.5/reference-to-video`. Resultado: `sky-full-seedance-19s-916-480p.mp4`, 19,04 s, 480×854, 24 fps, un solo stream de video y ningún stream de audio. Es un video completo para evaluar estructura, no un montaje H3/Seedance. Prompt: `sky-full-19s-916.prompt.txt`. La mezcla final tendrá música y SFX, sin voz. La prueba de marca en Seedance ya pasó; no se usó el video H3 como referencia porque contiene el humo y el ritmo problemáticos.

| Número | Archivo | Función |
| --- | --- | --- |
| @Image1 | `../cielo/C1-b.png` | Cielo fotográfico y luz continua. |
| @Image2 | `../h3v3/R1-busqueda.png` | Caja, pregunta y tres resultados. |
| @Image3 | `../h3v3/R2-respuesta-ia.png` | Respuesta de IA. |
| @Image4 | `../h3v3/R3-chip-sol.png` | Chip SKY y destellos. |
| @Image5 | `../h3v3/R4-avion.png` | Avión oficial en el cielo para la entrada. |
| @Image6 | `refs/A320neo_CFM_SKY_V02.png` | Vista oficial frontal de tres cuartos. |
| @Image7 | `refs/A320neo_CFM_SKY_VR.png` | Perfil oficial. |
| @Image8 | `refs/A320neo_CFM_SKY_V10.png` | Vista oficial inferior. |
| @Image9 | `refs/A320neo_CFM_SKY_V16.png` | Vista oficial posterior de tres cuartos. |
| @Image10 | `../h3v3/R9-avion-lateral.png` | Salida con el mismo avión en el mismo cielo. |
| @Image11 | `../h3v3/R5-prueba.png` | Año y volumen de piezas. |
| @Image12 | `../h3v3/R6-noticia.png` | Agencia SEO/AEO. |
| @Image13 | `../h3v3/R7-gracias.png` | Agradecimiento. |
| @Image14 | `../h3v3/R8-cierre.png` | Firma final. |

## Criterios de revisión antes de escalar resolución

1. De chip a avión: origen en el mismo destello, rumbo y luz coherentes.
2. Avión: una sola célula A320neo; nariz, cola, alas, motores, SKY y verde/morado consistentes con las vistas oficiales. Tamaño en pantalla crece en la aproximación y disminuye únicamente después del paso.
3. Cielo: apariencia fotográfica, sin costuras ni cambio arbitrario de hora o sol.
4. Cero humo, estela o vapor saliendo de alas o motores.
5. Búsqueda, resultados, IA, textos y logos: verificar visualmente; cualquier texto o firma reinterpretable se reemplaza por las piezas exactas del kit, manteniendo la toma completa de Seedance como base de movimiento.
6. Audio: agregar música y SFX por separado, sin voz ni canto. Revisar la exportación en 9:16 y después generar/adaptar 3:4 para 4:5.

## QA inicial del video completo de 19 s

- **Resuelto en esta prueba:** búsqueda → tres resultados → respuesta IA → chip → destello → aproximación, paso y alejamiento del mismo avión → anuncio → agradecimiento → cierre. La escala del avión avanza y luego retrocede sin el reinicio de velocidad/distancia que produjo el empalme anterior. No se observa estela blanca detrás de las alas o motores en el muestreo de cuadros.
- **Marca del avión:** la palabra SKY, cola morada, acento lima y puntas verdes sobreviven al paso principal. Inscripciones pequeñas del motor se deforman en el acercamiento; no aprobar como reproducción exacta de esos detalles.
- **Texto/UI:** los cuadros estables de resultados y respuesta son legibles; en cuadros transitorios hay deformación de letras. Las frases principales a 14,5 y 16,5 s se leen correctamente. Debe verificarse la tipografía exacta y sustituir texto sensible con el kit si no coincide.
- **Cierre:** el logo Efeonce y la URL del último cuadro no son fieles/legibles a 480p. Deben componerse desde los archivos oficiales del kit, como prevé `PRODUCCION.md`.
- **Pendiente para máster:** revisión en reproducción a velocidad real, calidad 720p o superior, audio original con música/SFX y adaptación 3:4→4:5. Esta prueba permanece mudo y no es un master final.
