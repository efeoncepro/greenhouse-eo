# Kit de la tarjeta Umbral

Referencia única del producto para los motores de imagen y video. Sale de un modelo 3D con las medidas reales
de una tarjeta ID-1 (85,6 × 54 × 0,8 mm, esquinas de 3,18 mm, proporción 1:1,586), así que ningún ángulo viene
deformado.

| Archivo | Uso |
|---|---|
| `01-frente.png` · `02-reverso.png` | Diseño exacto de cada cara |
| `03`/`04` tres cuartos | Tarjeta en la mano o de pie en un plano medio |
| `05-canto.png` | Grosor real y la rendija que atraviesa el metal |
| `06-contrapicado.png` | Plano bajo, heroico |
| `07-plana-cenital.png` · `08-plana-rasante.png` | Tarjeta apoyada (departamento, plano final) |
| `tarjeta-umbral.blend` | Escena fuente para renderizar un ángulo nuevo |

Reglas al usarla como referencia:
- Pasar el render del ángulo más parecido al de la escena, no siempre el frente.
- Declarar en el prompt la proporción: «standard bank card, 85.6 × 54 mm, ratio 1.59:1, held vertically, taller than wide».
- La rendija atraviesa el metal: en el reverso queda al 38 % desde la izquierda y en el canto se ve una línea lima.
- Revisar la tarjeta al 100 % en cada keyframe y medir su proporción antes de animar.
