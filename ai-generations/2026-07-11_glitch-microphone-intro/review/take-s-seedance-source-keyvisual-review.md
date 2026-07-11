# Revisión — take S / Seedance 2.0 con key visual íntegro

## Identificación

| Campo | Valor |
| --- | --- |
| Motor | Fal.ai `bytedance/seedance-2.0/image-to-video` |
| Referencia | Key visual PNG 2160×3840 íntegro, SHA-256 `fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e` |
| Request Fal | `019f511d-84fc-7e31-b402-2c418ba6b78d` |
| Salida | 1080×1920, H.264, 24 fps, 5.042 s; AAC 44.1 kHz estéreo |
| Master local | `masters/glitch-microphone-intro-s-seedance-2-source-keyvisual-master.mp4` |

## Veredicto

**Rechazado como master de Glitch.** No se creó export editorial ni se aplicó post de corrección.

## Lo que sí pasó

- El motor partió del key visual 4K íntegro y conservó composición vertical, cámara, micrófono, boom, consola, mano, paleta navy/azul/verde y piel cálida.
- La señal roja existente permaneció como practical de fondo del estudio. No se añadió ninguna capa, tarjeta, máscara, tracking ni texto en post.
- El encuadre confirma que la conservación del diseño se puede pedir al motor sin reemplazar la dirección de arte con una escena nueva.

## Rechazos duros

### Actuación

La revisión en velocidad real, 0,5× y por fotogramas muestra que el índice permanece o vuelve a permanecer contra la rejilla durante una ventana perceptible. No entrega los dos eventos `golpe breve → rebote inmediato → aire visible → golpe breve → rebote` de uno a dos fotogramas. Por tanto, todavía se lee parcialmente como presión/pose apoyada, no como una prueba de sonido percutiva.

### Sonido

El audio nativo no demuestra dos foleys aislados de yema contra malla. El análisis de silencio detectó actividad adicional y colas largas entre los impactos; no es verificable como exactamente dos `toc` secos sincronizados. Se rechaza completo junto con el gesto: no se extrae ni reutiliza su audio.

## Evidencia de revisión

- `review/take-s-seedance-source-overview.png`
- `review/take-s-seedance-tap-window.png`
- `review/take-s-seedance-24fps-contact-window-1p5-4p1.png`
- `review/take-s-seedance-audio-0-3s.png`

## Siguiente estado

El prompt T endurece el contrato: ruptura de contacto inicial dentro de cuatro frames, dos contactos de máximo dos frames y al menos ocho frames de aire entre ellos. Fal rechazó su envío antes de crear un request con `HTTP 403 User is locked — Exhausted balance`; queda pendiente de recarga de saldo por el titular de Fal. No hay otro intento autorizado ni gasto pendiente en esta corrida.
