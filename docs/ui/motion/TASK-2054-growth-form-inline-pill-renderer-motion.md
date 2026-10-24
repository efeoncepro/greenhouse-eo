# TASK-2054 — Formulario en línea: motion

## Intent

Que suscribirse o reservar se sienta como un solo gesto: el botón se abre en el campo, confirma con una señal clara y
queda en un estado final tranquilo.

## Motion Map

| Transición | Movimiento | Duración y curva |
|---|---|---|
| Reposo → abierto | el contenedor se estira hacia la izquierda; el botón se desvanece y escala a .96; el campo aparece | ancho 520 ms `cubic-bezier(0.2,0,0,1)`; campo 260 ms con 200 ms de retraso |
| Abierto → enviando | campo al 55 %; loader de la órbita en el botón | inmediato |
| Enviando → éxito | relleno del tono; pulso 1 → 1,035 → 1; check que se dibuja | 520 ms; check 420 ms con 140 ms de retraso |
| Éxito → listo (1,4 s) | el contenedor se angosta; «¡Listo!» sube y sale, el texto final entra | 520 ms; textos 260/360 ms |
| Nota legal | aparece 4 px hacia abajo | 220 ms con 260 ms de retraso |

## Tokens and Performance

- Sólo ancho del contenedor (una propiedad, una vez), `transform`, `opacity` y `stroke-dashoffset`.
- Curvas y duraciones como tokens `--ghf-inline-*` con default del canvas.

## Reduced Motion

- Sin estiramiento, pulso ni dibujo: cambio de estado instantáneo con el texto correcto.

## GVC / Micro Evidence

- GIF de la secuencia completa a 1440 y 390; captura con movimiento reducido.

## Design Decision Log

- **Decisión:** estado final más angosto que el abierto, para que la confirmación se lea como cierre.
- **Alternativa descartada:** mantener el ancho abierto con un mensaje (se leía como formulario pendiente).
