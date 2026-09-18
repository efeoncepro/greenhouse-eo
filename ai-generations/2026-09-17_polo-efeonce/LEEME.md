# Polo piqué Efeonce — kit de prenda corporativa (2026-09-17)

Decisión del operador: la polera de algodón queda para evento y producción; la **ropa corporativa del equipo** frente
a cliente es un **polo piqué**. Se diseñó desde cero (no existía asset) y se produjo con el
[método de kits de prenda](../../.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md).

## Prenda base

Piqué de algodón de peso medio, corte regular entallado, tapeta de tres botones tono sobre tono, cuello y puños de
punto plano, aberturas laterales, sin bolsillo ni etiqueta visible. **Emblema bordado** en el pecho izquierdo (~7 cm),
**espalda limpia**: la estampa con eslogan es lenguaje de merch, no de ropa corporativa.

Tres acabados propuestos: navy con bordado tono sobre tono, navy con bordado blanco y blanco con bordado navy.
El operador eligió **navy con bordado blanco (principal)** y **blanco con bordado navy (segunda)**; descartó el tono
sobre tono porque el logo se perdía.

## Contenido (`final/`, 21 vistas)

- **Navy, kit completo (15):** frente · espalda · 3/4 izquierda y derecha · lateral · doblado · percha · planos
  cenitales frente y espalda · macro del bordado · detalle de cuello y tapeta · macro de puño y abertura · puesto
  frente, espalda y un segundo cuerpo con otro tono de piel.
- **Blanco, set esencial (6):** frente · espalda · 3/4 izquierda · plano cenital · macro del bordado · puesto frente.
- **Transparentes:** las vistas de prenda sola y los planos; los macros y las vistas puestas no se recortan.
- `efeonce-polo-manifiesto.json` con la descripción y **cuándo usar** cada vista.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| El bordado tono sobre tono hacía desaparecer el logo | Hilo blanco sobre navy; el tonal se descarta para uso corporativo |
| Varias vistas volvieron como par frente+espalda o con un círculo de zoom | Exigir «una sola fotografía de una sola prenda: ni par, ni díptico, ni collage, ni inset» |
| Los detalles salían como prenda completa | Pedir **encuadre macro explícito**: «el bordado llena el cuadro y el resto de la prenda queda fuera» |
| **El emblema salía espejado** (nave apuntando a la izquierda) en las cuatro vistas blancas y en dos navy (percha y segundo cuerpo) | Pasar el **isotipo oficial** (`ref/isotipo-oficial.png`) como imagen 2 y describir su geometría: nave a la derecha, aletas abajo a la izquierda, órbita como elipse ancha con cortes, planeta arriba. Verificar el emblema **vista por vista** con recortes al 100 %: el defecto no se ve en la hoja de contacto |

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 29 generaciones con descartes.
