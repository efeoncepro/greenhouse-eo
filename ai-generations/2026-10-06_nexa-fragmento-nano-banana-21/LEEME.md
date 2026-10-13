# Nexa · fragmento · Nano Banana 2.1

Prueba local solicitada el 2026-10-06. Tres generaciones por Vertex `generateContent`, 4K, `thinking high`, 4:5, tres referencias vigentes resueltas por `foto:prompt`. Receta de partida: [F6 en AXIS](https://axis.efeonce.org/media/photography/recipes/palanca-fragmento-nexa.json). El plate Sunburst NO se envió al modelo.

Resultado para ver: [V3, PNG nativo 3712×4608](plates/NB21-NEXA-FRAGMENTO-v3.png). Alternativa: [V2](plates/NB21-NEXA-FRAGMENTO-v2.png). V1: [primera toma](plates/NB21-NEXA-FRAGMENTO.png).

| Versión | Revisión |
| --- | --- |
| V1 | Materia convincente; asoma el segundo ojo y la etiqueta naranja crece demasiado. Lecho blanco 4,98:1. |
| V2 | Un ojo; acento menor. Introduce oclusión vertical a la derecha y falla el lecho (2,05:1). |
| V3 | Piel/cabello fotográficos; un ojo y lecho 5,42:1. Persiste la oclusión vertical no solicitada y vuelve a crecer el acento. |

**No aprobada como fragmento puro.** Nano añade un objeto desenfocado a la derecha aun con la prohibición explícita; el Sunburst histórico corta por el encuadre con más limpieza. Comparación acotada: las anclas y los bloques compilados están actualizados respecto del histórico, no es un A/B controlado.

`foto:validar` V3: 3/4, exit 1 por campo profundo al margen; lecho, sombras y aire de cursores pasan. No hay reserva de titular ni firma compuesta: es un plate crudo de prueba, sin alta en el banco aprobado. No se afirma aprobación editorial ni gate global PASS.

Sin recorte, resize, upscale, retoque ni grade de salidas. Los extractos al 100 % sólo sirven para inspección en `.captures/`. Dos anclas se transportaron como sus copias JPEG calidad 98 / chroma 4:4:4 ya verificadas, sin cambiar dimensiones; expresión con bytes PNG originales. Fuentes, hashes, controles, usage y resultados completos: [evidence.json](evidence.json). Entradas 13,209 MiB. Tres imágenes nominales USD 0,2268, más entradas y razonamiento; no es factura total.

Fichas y prompts por versión en `fichas/` y `prompts/`; la ficha sin sufijo es la última y el prompt sin sufijo conserva V1 para reproducir la primera llamada. Usar siempre los pares con `-v1`, `-v2` o `-v3`.

No cambia defaults de CLI, runtime ni Globe. Sin publicación, commit ni push.
