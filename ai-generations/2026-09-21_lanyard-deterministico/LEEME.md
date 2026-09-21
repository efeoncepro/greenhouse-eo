# Lanyard Efeonce armado determinísticamente (2026-09-21)

**Por qué existe.** El modelo **tergiversa el logotipo de Efeonce**. Medido el 2026-09-21 en cuatro
pasadas sobre la misma pieza: la nave que ocupa la «o» salió distinta cada vez, y en la peor fue un
borrón con forma de flecha. Da igual cuánta descripción se le dé — describirlo es justamente lo que el
kit prohíbe— y tampoco basta pasarle el arte plano.

**La salida es no pedirle que dibuje.** Acá el lanyard se **arma pieza por pieza** desde los artes
oficiales, y al modelo se le pide **sólo el acabado**: textura de tela, relieve de la serigrafía,
plástico, metal, acrílico, sombras de contacto. Ninguna marca se genera.

```bash
node ai-generations/2026-09-21_lanyard-deterministico/construir.mjs   # arma el plano
# y después, el acabado (el prompt completo está en el commit):
pnpm ai:image --model gpt-image-2.5-sunburst --size 1024x1536 --image piezas/lanyard-armado-plano.png --prompt "…"
```

## Las seis piezas, y de dónde sale cada una

| Pieza | Origen | Generada |
|---|---|---|
| Tela serigrafiada | `ref/arte-cinta.png` proyectado sobre el trazado con warp bilineal | **no** |
| Regulador | SVG plano | no |
| Yoyo | carcasa SVG + `ref/arte-yoyo.png` | **no** |
| Clip | SVG plano | no |
| Portacarnet | marco rígido en SVG (la foto del kit trae su propio lanyard y tapaba el carnet) | no |
| Carnet | `ref/arte-carnet-julio.png` | **no** |
| Material y luz | el modelo, sobre el armado | sí — y **sólo** eso |

## Dos proporciones que se CALCULAN, no se fijan a ojo **[medido]**

- **El patrón.** Una unidad (logotipo + eslogan) mide **7,05 veces** el ancho de la cinta. Con un
  valor puesto a mano (3,4) el logotipo salió alargado y el eslogan achatado — «está pésimo», y con
  razón. Ahora sale de `ANCHO × (UNIDAD / alto_del_arte)`.
- **El yoyo.** Su diámetro es **1,6 veces** el ancho de la cinta (32 mm contra 20 mm reales). Estaba
  en 2,5 y el operador lo cazó a la primera: «el yoyo es un poquito más pequeño en la vida real».

## La trampa de la orientación

El arte es una tira horizontal y la cinta cuelga vertical, así que el muestreo hay que invertirlo
**en un solo eje**: el de la lectura (`ax`), nunca el del ancho (`ay`). Invertir los dos rota 180°;
invertir el del ancho **espeja las letras**. Los dos errores se cometieron antes de acertar.

## Entrega

La vista quedó en el kit del lanyard como **`14-conjunto-deterministico`**, con fondo de estudio y
transparente, declarada en su manifiesto con su `cuando_usarla`:

> **Para USAR el lanyard en una escena, la referencia es esta foto del producto terminado.** El arte
> plano sirve para PRODUCIR vistas del kit, no para vestir a alguien.
