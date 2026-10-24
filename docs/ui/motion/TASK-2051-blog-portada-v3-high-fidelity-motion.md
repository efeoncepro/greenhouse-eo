# TASK-2051 — Portada del blog v3: motion

> Fuente: canvas aprobado v67. Los valores de esta tabla son los del canvas y se copian tal cual; el gate de
> fidelidad captura cada sección en su estado final.

## Intent

Que la portada se sienta viva y de agencia sin cansar: el movimiento acompaña el cambio de destacado, el foco al
escribir y la confirmación de un formulario. Nada se mueve en reposo salvo el slider en autoplay y la cinta.

## Motion Map

| Pieza | Disparo | Movimiento | Duración y curva |
|---|---|---|---|
| Slider: cambio de diapositiva | autoplay 7 s, flechas, arrastre, teclado | barrido con `clip-path` derecha→izquierda (o al revés si va atrás) | 1000 ms `cubic-bezier(0.7,0,0.2,1)` |
| Slider: título | diapositiva activa | cada palabra sube desde una máscara (`translateY(140%)` → 0) con 45 ms de desfase | 850 ms `cubic-bezier(0.2,0,0,1)` |
| Slider: bajada, chip, CTA | tras el título | sube 16 px y aparece | 700 ms `cubic-bezier(0.2,0,0,1)` |
| Slider: imagen | continuo | zoom lento + paralaje ±6 px con el cursor | CSS `transform`, sin JS por frame |
| Slider: contador | cambio | el número gira verticalmente | 600 ms |
| Barras de progreso | autoplay | llenado lineal 7 s; pausa con hover, foco y `visibilitychange` | lineal |
| Buscador: haz | foco | anillo de luz continuo (conic, 6,4 s/vuelta) + cometa por el perímetro real (SVG rect, 3,2 s/vuelta, velocidad constante) + aura que respira (3,2 s) | lineal / `ease-in-out` |
| Buscador: tecleo | cada tecla | el haz se ensancha 3 → 4,5 px durante 420 ms | 220 ms |
| Botones | hover/foco | texto que rueda (`translateY(-50%)`) + flecha cuyo palo se dibuja (`stroke-dasharray .5 2 → 1 2`) y avanza 3 px | 450 ms `cubic-bezier(0.34,1.56,0.64,1)` |
| Botón que se transforma | clic | la píldora se estira (252 → 480 px Glitch; 236 → 470 px evento) y aparece el campo | 520 ms `cubic-bezier(0.2,0,0,1)` |
| Éxito del formulario | respuesta OK | relleno de color + pulso 1,035 + check que se dibuja; a 1,4 s pasa a «Ya estás suscrito» | 520 ms / 420 ms |
| Punto «en vivo» | continuo | aro que crece y se desvanece | 1,8 s |
| Riel | flechas | desplazamiento suave una tarjeta | nativo `scroll-behavior` |
| Tarjetas | hover | sube 4–6 px; imagen zoom 4 % | 300 / 600 ms |
| Selector de años | clic | indicador navy se desliza | 300 ms |
| Cinta | continuo | desplazamiento horizontal 70 s/vuelta | lineal |

## Tokens and Performance

- Sólo `transform`, `opacity`, `clip-path` y `stroke-dashoffset`; nada que dispare layout por frame.
- `@property --beam` para el anillo; el cometa del buscador con keyframes explícitos por capa (no `var()` en keyframes:
  no anima en Chromium, medido 2026-10-24).
- Nada de unidades de contenedor (`cqi`) en tamaños críticos: el canvas no las respetó (medido 2026-10-24); valores fijos en px.
- Presupuesto: INP ≤ 150 ms; el slider no bloquea el hilo principal; la imagen del primer destacado no se anima antes de pintar (LCP).

## Reduced Motion

- Sin autoplay (el slider espera interacción), sin barrido (cambio instantáneo), sin paralaje ni zoom.
- Título y bajada aparecen sin desplazamiento.
- Haz del buscador: anillo estático con aura fija.
- Formularios: cambian de estado sin estiramiento ni pulso.
- Cinta detenida.

## GVC / Micro Evidence

- Video corto (`pnpm fe:capture … --gif` equivalente con Webwright) del cambio de diapositiva, del haz al escribir y de
  la transformación del formulario a éxito, a 1440 y 390.
- Captura con `prefers-reduced-motion: reduce` de cada sección.

## Design Decision Log

- **Decisión:** el aura del buscador es una excepción aprobada por el operador a la regla de La órbita contra el
  resplandor (2026-10-24), acotada al foco del buscador web; se registra en `efeonce-graphic-line/references/ledger.md`
  desde TASK-2052.
- **Alternativa descartada:** haz por ángulo con dos cometas (ritmo irregular en una píldora ancha).
- **Riesgo:** costo del autoplay en móviles de gama baja; se mide INP en el gate.
