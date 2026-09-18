# Nexa con el logo 3D en un set de TV (2026-09-17)

Pedido del operador: una pieza 9:16 con el logo de Efeonce en grande y Nexa apoyada en él, sonriendo a cámara, con el
hoodie de Efeonce, en un estudio tipo YouTube/TV grande; la cámara puesta **a un costado del set**, con los focos
dentro del cuadro apuntando hacia adelante. Aprobada la versión `prueba/estudio-v07-mesa-ajustes.png` («está bien así»).

Es la primera pieza que aplica el [kit 3D del logo](../2026-09-17_efeonce-logo-3d/LEEME.md) por **pasada directa**:
el render entrega la forma y el prompt la intención.

## Referencias usadas (orden importa)

1. Render del kit: `kit/<escala>-<color>/…-01-frente-altura-ojos-luz-der-transparente.png` — la única fuente de forma.
2. y 3. Nexa de pie: `refs/nexa-cuerpo-completo-v2.png` y `refs/nexa-the-read.png`, copiadas de OneDrive
   `5. Contenidos/10. Nexa (Influencer IA)/` (Avatar y Poses y expresiones).
4. Rostro: `2026-09-17_kv-tu-ia-no-conoce/refs/nexa-avatar-34-v2.png`.
5. Hoodie: `2026-09-17_kv-tu-ia-no-conoce/refs/efeonce-hoodie.png`.
6. Logo oficial plano: `2026-09-17_efeonce-logo-3d/ref/logo-silueta.png` — para verificar el emblema.

## Recorrido y correcciones (lo transferible)

| Versión | Qué falló | Corrección |
|---|---|---|
| v01 | Escena correcta pero el emblema se deformó: órbita circular y nave girada | Sumar el **logo oficial plano** como referencia extra y describir la geometría del emblema (nave a la derecha, órbita como elipse ancha con cortes, planeta encima) |
| v02 | El emblema creció más que las letras | Fijar proporción: «el emblema mide lo mismo que una letra y el conjunto conserva la proporción del logo oficial» |
| v03 | Con referencia en tres cuartos el emblema seguía inestable | Usar la referencia **frontal**: geometría más fácil de copiar |
| v03 | Letras navy sobre set oscuro: Nexa no resaltaba | **Laca blanca** en las letras; el hoodie navy pasa a ser el acento |
| v04 | Letras sin sombra ni reflejo, tercio superior ocupado, flare sobre la cara | Sombra de contacto y reflejo en piso, tercio superior oscuro y limpio para el titular, contraluz frío, sin flare en la cara |
| v05 | **Anatomía:** con letras de 1,4 m, apoyar el brazo exige estar hincada | Bajar a 1 m (altura de codo) y traer referencias de Nexa **de pie**; aun así el apoyo seguía leyéndose raro |
| v06 | — | **El logo sobre una mesa del set**: manos apoyadas en una superficie es una pose que se lee sola. Cámara más atrás (50 mm) y márgenes: nada toca los bordes |
| v06 | Nexa parecía no tener piernas ni pies | **Mesa abierta sin panel frontal** + rebote bajo que ilumina el piso: jeans, zapatillas y sombra visibles |
| v07 | — | Logo 30 % más grande cerca del borde frontal, laca de alto brillo con reflejos del set, manos con anatomía declarada. Aprobada |

## Reglas que quedan

- **El emblema es el punto frágil.** Siempre acompañar el render con el logo oficial plano y declarar: nave a la
  derecha, órbita como elipse ancha con cortes, planeta encima, emblema del alto de una letra.
- **Referencia frontal** para escenas complejas; la de tres cuartos exige más del modelo.
- **Color del logo por contraste con el sujeto:** sobre set oscuro y con hoodie navy, letras blancas. Si el logo va
  navy, el sujeto necesita otro color.
- **Anatomía:** apoyarse en un objeto a la altura del codo se lee mal; una mesa a la cadera con las manos encima se
  lee bien. Declarar qué parte del cuerpo se ve y a qué altura llega cada elemento.
- **Un cuerpo que se corta en la oscuridad parece incompleto:** iluminar el piso y declarar calzado visible.
- **Encuadre:** pedir márgenes explícitos y un tercio superior limpio si después va titular con AXIS.

Modelo: `gpt-image-2.5-sunburst`, xhigh, 1152×2048, ~USD 0,14 por intento; siete intentos en total.
Prompts en `prueba/*.prompt.txt`. Nada publicado ni programado.
