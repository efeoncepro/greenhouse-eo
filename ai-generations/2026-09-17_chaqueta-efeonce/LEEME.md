# Chaqueta Efeonce — kit de prenda corporativa (2026-09-17)

Tercera prenda de la cápsula, después del [hoodie](../2026-09-17_hoodie-efeonce/LEEME.md) y del
[polo](../2026-09-17_polo-efeonce/LEEME.md). Diseñada desde cero con el
[método de kits de prenda](../../.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md).

## Decisión

Se propusieron tres tipos: softshell, bomber ligera y micropolar. El operador eligió **softshell y bomber**; descartó
la micropolar («es más de invierno»).

- **Softshell navy (oficial del equipo, kit completo de 16 vistas):** softshell de tres capas, cierre completo con
  tapeta interior y protector de mentón, cuello alto, dos bolsillos con cierre oculto, puños ajustables, cordón en el
  ruedo, sin capucha, corte limpio para ir sobre el polo.
- **Bomber ligera navy (pieza de imagen, set esencial de 6 vistas):** sarga técnica mate, cuello, puños y ruedo de
  punto acanalado, bolsillos ribeteados con cierre oculto, mangas raglán.

Ambas con **emblema bordado en hilo blanco** en el pecho izquierdo y **espalda limpia**: es ropa corporativa, no merch.

## Contenido (`final/`, 22 vistas)

Frente · espalda · tres cuartos izquierda y derecha · lateral · cierre abierto con el forro a la vista · doblada ·
percha · planos cenitales frente y espalda · macro del bordado · macro del cierre y la tapeta · macro de puño y
bolsillo · puesta de frente sobre polo navy, de espaldas y con un segundo cuerpo y tono de piel. Transparentes en las
vistas de prenda sola y planos. Manifiesto `efeonce-chaqueta-manifiesto.json` con **cuándo usar** cada vista.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| Los macros volvían como prenda completa aunque el prompt pedía primer plano | Describir el encuadre por lo que **no** debe verse: «la silueta de la chaqueta NO aparece — sin línea de cuello, sin ruedo, sin manga, sin fondo; sólo el tejido de cerca» |
| Riesgo de emblema espejado (visto en el polo) | Isotipo oficial como imagen 1 y QA del emblema **vista por vista al 100 %**: las 22 quedaron correctas |

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 25 generaciones con descartes.
