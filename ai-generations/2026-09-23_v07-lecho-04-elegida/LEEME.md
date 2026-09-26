# v07 · lecho de «Que te elijan» (04-elegida-916)

Corrección aprobada por el operador el 2026-09-23. La pieza final vive en `../2026-09-22_aeo-final-safe-v07/`; esta
carpeta guarda cómo se hizo el plate nuevo y los intentos que se descartaron.

## Qué pasaba

Esa mañana la firma de las cuatro stories finales subió a la zona segura de AXIS (caja 1619–1670 px de 1920). En esta
story la firma quedó sobre el **canto iluminado del lecho**, junto a un apoyabrazos cromado desenfocado, y no dentro de
la materia calma como en las otras tres. El contraste medido pasaba (6,53:1): lo vio el operador, no el QA.

## Método aprobado

`subir-primer-plano-v4.cjs` sube el primer plano completo —lecho y apoyabrazos— como **una capa rígida**, 60 px del
plate (69 px en la pieza), como si la cámara estuviera un poco más baja: lo cercano sube, el fondo no. El corte va pegado
al objeto (6 px sobre el canto medido en el lecho; 4 px sobre el halo del apoyabrazos, por una curva suave trazada sobre
la medición de luminancia), con 10 px de fundido. Sin IA y sin deformar la forma del canto.

```sh
node subir-primer-plano-v4.cjs ../2026-09-22_aeo-final-safe-v07/plates/04-elegida-916.png <salida.png> 60
```

Es determinista: da `e49c32ecd6505ea67328fe4f015050c58dce7b9e82b7d2dce268c97b5b74330c`, el sha256 de
`plates/04-elegida-916-lecho.png` en v07. La firma no se mueve; su contraste pasa de 6,53 a 11,58:1 y las otras 15
piezas salen idénticas byte a byte con la receta congelada de v07.

## Descartado

| Intento | Archivos | Por qué no |
|---|---|---|
| Inpainting con máscara sobre toda la franja inferior (GPT Image 2.5 Sunburst) | `prompt.txt` | Llenó la zona transparente entera con un panel oscuro plano de borde recto en el límite de la máscara y borró el apoyabrazos: se leía como un velo |
| Levantar sólo el centro del lecho + inpainting chico junto al apoyabrazos | `subir-lecho.cjs`, `hombro-prompt.txt` | Montículo y hombro artificiales; el operador: «demasiado forzado» |
| Capa rígida con corte por envolvente ancha | `subir-primer-plano.cjs` | Arrastraba bandas de la manga y rompía su contorno y la esquina de la mesa |
| Capa por mate de brillo | `subir-primer-plano-mate.cjs` | El apoyabrazos quedaba semitransparente, como fantasma |

Los PNG de esta carpeta (candidatos, máscaras y láminas de comparación) no se versionan.
