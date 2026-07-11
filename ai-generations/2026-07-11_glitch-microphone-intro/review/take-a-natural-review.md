# Revision - Take A natural

> Dictamen tecnico: aprobar para post. Dictamen creativo y entrega final: pendiente de revision del operador.

## Identificacion

| Campo | Valor |
| --- | --- |
| Master | masters/glitch-microphone-intro-a-natural-omni-master.mp4 |
| Export editorial | exports/glitch-microphone-intro-a-natural-5s-silent.mp4 |
| Fuente canonica | microfono_broadcast_9x16_2160x3840.png; SHA-256 fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e |
| Adapter | sign-neutral-720-jpeg; JPEG 720x1280; SHA-256 df0a460dfbd9222b27fe84d7351b9327e4332248b5263fcd6c663b95b47de0de |
| Generacion | 2026-07-11 10:14:43-10:15:22 UTC; un intento |
| Master | 10 s; 720x1280; H.264; 24 fps; 2478786 bytes |
| Export | 5 s; 720x1280; H.264; 24 fps; sin audio; 1447706 bytes |

## Revision visual

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Anatomia de mano, yema y microfono | Pasa | Una mano continua, cinco dedos coherentes y rejilla sin penetracion visible en muestras 00:00:00.4, 00:00:01.7, 00:00:02.9, 00:00:03.8 y 00:00:05.0. |
| Arco humano | Pasa | Parte en contacto, sostiene el gesto y libera el indice sin golpe ni rebote duro; la retirada se lee alrededor de 00:00:03.8. |
| Camara y continuidad | Pasa | Close-up vertical estable con push-in muy leve, sin corte, paneo u orbita. |
| Senal | Pasa con caveat | Los arcos azules ya existen en el frame inicial del key visual; el acento posterior se lee como actividad de senal y luz, no como glitch digital. |
| Texto o UI inventados | Pasa | El adapter bloquea la lectura de ON AIR; el modelo devuelve una senal roja abstracta, no tipografia. Las pantallas permanecen de fondo e ilegibles. |
| Audio | Pendiente | Export deliberadamente silencioso. Montar foley y room tone segun motion-and-sound-spec.md; sin musica, voz, beep ni estatica. |

## Puntaje tecnico

| Criterio | Max. | Puntaje | Nota |
| --- | ---: | ---: | --- |
| Anatomia y fisica esencial | 5 | 4 | Natural y estable; conservar revision frame a frame en finish. |
| Hold, presion, liberacion y settle esencial | 5 | 4 | La presion es deliberadamente minima; la liberacion es legible. |
| Staging, camara y continuidad esencial | 4 | 4 | Respeta el key visual y el 9:16. |
| Respuesta de senal | 3 | 2 | Correcta, limitada por los arcos ya presentes en la fuente. |
| Luz, color y textura | 3 | 3 | Paleta nocturna broadcast coherente; negros con detalle. |
| Audio scratch | 2 | 0 | Foley pendiente. |
| Corte hacia Glitch | 3 | 3 | Frame de salida sobrio y estable para hard cut. |
| Total | 25 | 20 | Pasa el umbral tecnico para post. |

## Proximo gate

1. El operador aprueba o rechaza la lectura del gesto y el frame de corte.
2. Si aprueba, montar foley y revisar la transicion contra el primer frame real de Glitch.
3. Solo entonces archivar binarios, decidir upscale y marcar entrega final.
