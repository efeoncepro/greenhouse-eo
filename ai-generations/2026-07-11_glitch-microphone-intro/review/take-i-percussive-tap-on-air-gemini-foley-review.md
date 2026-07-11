# Revisión — Take I, percussive tap + practical `ON AIR` + foley Gemini

> Dictamen creativo final: **rechazado.** El `ON AIR` fue compuesto después y se percibe añadido al video; el movimiento sigue leyendo como presión y el foley no corresponde suficientemente a una prueba física de micrófono. Se conserva sólo como evidencia del piloto. La ruta vigente está en [recovery-plan-v2-integral-practical-and-foley.md](../recovery-plan-v2-integral-practical-and-foley.md).

## Identificación

| Campo | Valor |
| --- | --- |
| Placa visual | `exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.mp4` |
| Finish | `finish-glitch-percussive-tap-with-gemini-foley.mjs --execute` |
| Candidato | `exports/glitch-microphone-intro-i-percussive-tap-on-air-5s-gemini-foley.mp4` |
| Formato | 5.000 s · 720×1280 · H.264 · 24 fps · AAC 48 kHz estéreo |
| Hash del candidato | `e0db767a4624f92ace6b9075681a5cd9330887ca7393e6bbbddabf7b1687f587` |
| Foleys Gemini | Interacción `video-97db98fe-6cd4-454a-ae75-caa20381e97f`; se usan sólo las ventanas 0,30–0,57 y 0,83–1,20 s. |

## Gates verificados

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Acción | Pasa | Dos golpes cortos de yema con rebote: el contacto no se sostiene ni se lee como presión. |
| `ON AIR` | Pasa | Crop 4K 180×118 a x=400/y=257; se percibe como practical del estudio y no tapa el dedo. |
| Píxeles finales | Pasa | El `framemd5` del stream de video I es idéntico al de F: `992bee1b4fda7e8e3690279f5c383b269d0bc84cf56aa7fcfbc18b2c37bcb372`. |
| Foley | Pasa técnico | Sólo dos transientes; `silencedetect` los sitúa cerca de 0,395 s y 0,824 s, dentro de un frame de los contactos de la edición. El segundo es más firme. |
| Silencio | Pasa | Fuera de las dos colas no hay música, voz, room tone, beep, whoosh ni tercer acento. |
| Omni H | Rechazado como video | Sus píxeles/tercer acento no se usan. Ver `take-h-omni-sound-guidance-review.md`. |

## Cierre de este candidato

No pasa a archive, upscale ni publicación. No se permite repararlo agregando un nuevo letrero, crop, máscara, tracking o retime. La siguiente producción debe generar/filmar una toma íntegra con practical integrado, actuación de impacto y foley aprobado por escucha.
