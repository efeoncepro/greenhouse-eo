# WB1c — «Web para todos» con el polo del kit bordado (2026-09-30)

Reemplaza a `WB1b` como plate canónico de la línea Engine (portada `cover-brochure-line-engine`, lámina de cine
`proposal-cinematic-web` y deck SEO/AEO). Misma escena y misma persona que `WB1`; cambia sólo el polo.

**Por qué.** `WB1` salió de la ficha `../WB1-web-para-todos.json` con el polo pedido por kit pero sin vista, y el emblema
volvió mal; `WB1b` lo tapó componiendo el isotipo plano encima, al costado y bajo el brazo. El operador (2026-09-30, al
enviar el deck SEO/AEO a un cliente): «la portada está muy mal armado el logo y ahí ni siquiera tiene que estar pintado
sino BORDADO en el pecho»; «No es el emblema, tenemos el polo piqué que tiene la referencia en distintos ángulos»;
«Busca la receta de ese prompt».

**Receta (editar conserva; nunca injertar ni componer el isotipo):**

1. `WB1-web-para-todos.png` (1792×1024) paddeado espejado 14 px por lado a 16:9 y llevado a 2048×1152.
2. Edición `pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 2048x1152` con `1-polo-kit.prompt.txt` e
   imágenes: el plate, `2026-09-17_polo-efeonce/final/efeonce-polo-navy-13-puesto-frente-…png` (el polo puesto, la misma
   referencia que resuelve `foto:prompt` para `polo-efeonce`), el macro `…-10-detalle-bordado-…png` y
   `2026-09-17_polo-efeonce/ref/isotipo-oficial.png`. Salió el polo del kit con el emblema en el pecho, pero el antebrazo
   tapaba su mitad inferior.
3. Edición con máscara (sólo la tela del pecho sobre el antebrazo, 3 px lejos de la piel) con `2-emblema-pecho.prompt.txt`,
   el macro y el isotipo oficial: el emblema completo, sin que el brazo lo toque.
4. De la pasada 3 se toma sólo el rectángulo del pecho (x 1195–1355, y 525–690 a 2048, fundido 12 px) sobre la pasada 2;
   el brazo de ambas coincide (diferencia media 3 niveles). Vuelta a 1820×1024 y recorte de 14 px por lado.

Verificado al 100 %: nave con tres ventanas y aleta, órbita con su corte y esfera, satin blanco sobre piqué, un solo
emblema, en el pecho izquierdo junto a la tapeta. Costo ≈ USD 1.
