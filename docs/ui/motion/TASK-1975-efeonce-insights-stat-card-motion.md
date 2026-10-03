# TASK-1975 — Motion de la tarjeta de cifra (informe Live)

## Meta

- Task: `TASK-1975`
- Status: `approved` (operador, 2026-10-03)
- Motion type: `micro-interaction de dato` (entrada de una cifra y su variación)
- Superficie: informe Live de Efeonce Insights en Think (`think.efeoncepro.com/insights/r/<token>` y `/insights/muestra`).
  El PDF A4 y el deck son estáticos: no animan.
- Evidencia de aprobación: canvas «TASK-1975 · Tarjeta de cifra»
  (<https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>), tablero interactivo «Live · la cifra cuenta su cambio»
  (`Think-Cifra-Animada.dc.html`).
- Tokens: curvas y duraciones de `axisMotion` que Think ya expone (`--ins-ease-emphasized` =
  `cubic-bezier(0.2, 0, 0, 1)`, `--ins-ease-standard` = `cubic-bezier(0.4, 0, 0.2, 1)`).

## Tesis

La cifra **cuenta su cambio**: no aparece con su número final, recorre el cambio desde el valor del período anterior (el
mismo que dice «vs …») hasta el de este período. Al llegar, la variación toma su dirección y su tono. El movimiento dice
lo mismo que el dato y nada más: nunca cuenta desde cero, porque ese recorrido no existe en el dato.

## Línea de tiempo de una tarjeta

| Tiempo | Pieza | Movimiento |
|---|---|---|
| 0–300 ms | Nombre, ícono, «Estimado» | Suben 8 px y aparecen (enfatizada). |
| 0 ms | «vs {valor} en {período}» | Ya está visible: es el punto de partida; su cifra se resalta mientras el número corre. |
| 150–1.250 ms | Cifra | Recorre del valor anterior al actual con curva enfatizada (rápida al inicio, se asienta al final). |
| 1.250–1.600 ms | Variación | El tono pasa de gris a verde o rojo (estándar, 300 ms); el triángulo redondeado entra en su dirección (▲ desde abajo, ▼ desde arriba, 8 px); aparece la cifra de la variación. |
| 1.600–1.900 ms | «Menor es mejor» | Aparece, si aplica. Después la tarjeta queda estática. |

En una retícula, cada tarjeta empieza **70 ms** después de la anterior, en orden de lectura (izquierda a derecha, arriba
abajo): la misma cadencia que el `data-stagger` del informe.

## Estados

| Estado | Comportamiento |
|---|---|
| Con anterior | Recorrido completo + variación. |
| Sin cambio | Recorrido nulo (la cifra no se mueve); la variación entra en gris con el cuadrado redondeado. |
| Sin anterior | La cifra sube y aparece; sin recorrido ni variación. |
| Sin dato | «—» y «Sin dato en …» aparecen; sin recorrido ni variación. Nunca 0. |
| Movimiento reducido (`prefers-reduced-motion`) | Estado final desde el primer cuadro. |
| Sin JavaScript | Estado final (mejora progresiva de Think). |
| Impresión | Estado final. |

## Reglas

- **Disparo:** al entrar la retícula en pantalla, con el mismo observador del informe (`data-reveal` / `data-stagger`).
  Una sola vez por carga; no se repite al volver a hacer scroll.
- **Cifras tabulares:** la cifra conserva su ancho final durante el recorrido (sin saltos de diseño).
- **Formato:** las cifras intermedias usan el mismo formato que la final (separadores es-CL, decimales y prefijo o
  sufijo de la unidad). Think no los deduce: el modelo web trae el valor de origen, el de destino, los decimales y las
  piezas de la cifra (`InsightWebStatItemV1.count` y `parts`).
- **Accesibilidad:** el número que corre es `aria-hidden`; el lector de pantalla recibe siempre el valor final y la
  frase completa de la variación («baja 17,0 % contra 16.390 en agosto 2026, empeora»), nunca valores intermedios.
- **Rendimiento:** un solo `requestAnimationFrame` por retícula, que se detiene al terminar; nada anima fuera de pantalla.
- **No se hace:** contar desde cero; rebote o escala de la píldora; parpadeo de color; animar al pasar el cursor (la
  tarjeta no es interactiva); animar en el PDF o en el deck.

## Tono y forma de la variación (decisión del mismo día)

- Triángulo de puntas redondeadas en todas las superficies.
- Sobre papel (Live, A4): píldora teñida con texto en tono.
- Sobre navy (deck y secciones oscuras del Live): sin píldora rellena; el tono va sólo en el triángulo y la cifra en
  tinta suave.
