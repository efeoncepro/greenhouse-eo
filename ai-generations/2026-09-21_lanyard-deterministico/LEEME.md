# Lanyard Efeonce armado determinísticamente (2026-09-21)

**Por qué existe.** El modelo **tergiversa el logotipo de Efeonce**. Medido el 2026-09-21 en cuatro
pasadas sobre la misma pieza: la nave que ocupa la «o» salió distinta cada vez, y en la peor fue un
borrón con forma de flecha. Da igual cuánta descripción se le dé — describirlo es justamente lo que el
kit prohíbe— y tampoco basta pasarle el arte plano.

**La salida es no pedirle que dibuje.** Acá el lanyard se **arma pieza por pieza** desde los artes
oficiales, y al modelo se le pide **sólo el acabado**: textura de tela, relieve de la serigrafía,
plástico, metal, acrílico, sombras de contacto. Ninguna marca se genera.

```bash
# arma el plano; el carnet es lo único que cambia entre personas
node ai-generations/2026-09-21_lanyard-deterministico/construir.mjs [arte-carnet.png] [salida.png]
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


## Delta 2026-09-21 — Nexa

Mismo conjunto con el carnet de **Nexa · AI Specialist** **[cargo dictado por el operador]**: es el que le
corresponde como **AI influencer** de Efeonce.

```bash
# 1. el retrato: la referencia es de cuerpo entero, así que se recorta cabeza y hombros ANTES
#    (pasada directa al script, el encuadre salió con la cara diminuta dentro del círculo)
node .../retrato-carnet.mjs nexa-busto.png nexa/retrato-nexa.png 0.06
# 2. el carnet, determinístico
node .../arte-carnet.mjs nexa/retrato-nexa.png "Nexa" "AI Specialist" nexa/arte-carnet-nexa.png
# 3. el armado y su acabado
node construir.mjs nexa/arte-carnet-nexa.png nexa/lanyard-armado-nexa.png
```

Entregado como vista **`15-conjunto-deterministico-nexa`**, con fondo y transparente. El retrato de
partida es `nexa-mic-drop.png`, la única frontal mirando a cámara — que es lo que un carnet pide,
aunque el lenguaje fotográfico diga lo contrario para las piezas de marca.
