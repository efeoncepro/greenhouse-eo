# Hoodie Efeonce — kit de referencia de prenda (2026-09-17)

Pedido del operador: distintas vistas del hoodie para pasarlas como referencia cuando haya que vestir a Nexa o a
cualquier persona, de modo que el modelo no invente la prenda. La espalda debe llevar el **logo completo** y, debajo,
**«Empower your Growth»** centrado respecto al logo y más chico.

## Qué contiene (21 vistas, `final/`)

`efeonce-hoodie-<id>-<ancho>x<alto>-v01-<fondo-estudio|transparente>.png` + `efeonce-hoodie-manifiesto.json`
(cada vista con su descripción y **cuándo usarla**).

- **Prenda sola:** frente · espalda con estampa · tres cuartos izq/der · lateral · capucha puesta · doblada · percha ·
  plano cenital frente y espalda.
- **Detalles:** emblema del pecho · puño y cordón · interior de la capucha · cuello por dentro.
- **Puesta en cuerpo neutro sin rostro:** frente, espalda y un segundo cuerpo con otro tono de piel.
- **Variantes de color:** blanco hueso y gris jaspeado, frente y espalda, con la tinta en navy `#023c70`.
- **Transparentes:** las 14 vistas de prenda sola y planos; los primeros planos y las vistas puestas no se recortan.

## Invariantes

- **Emblema del pecho:** mismo tamaño y posición que el asset oficial. **Nunca se reduce** (corrección del operador).
- **Estampa de espalda:** al **38 %** del ancho de la espalda. Al 55 % no se veía realista.
- **La estampa se compone, no se genera:** `estampa-espalda.mjs` arma logo negativo + eslogan con los tres pesos del
  contrato (`src/config/efeonce-brand.ts`): *Empower* ExtraBold itálica, *your* ExtraBold, *Growth* Black itálica.
  Entra como imagen 2 y el modelo sólo la apoya sobre la tela. El texto exacto nunca se le pide al modelo.
- **Color de tela:** azul royal del asset oficial; medido entre (10,54,155) y (25,76,186) en las vistas navy, con Δ
  máximo 38 en primeros planos (la luz cercana lo oscurece). Tinta navy `#023c70` en las variantes clara y gris.
- **Contrato de realismo** en todos los prompts: lente de 100 mm, arrugas asimétricas, pelo de la tela, costuras
  levemente irregulares, tinta serigráfica mate apoyada sobre las fibras y deformada por los pliegues; nada de brillo
  plástico ni simetría perfecta.

## Cómo se usa

Elegir la vista por el **ángulo de la toma**: de espaldas → vista de espalda; tres cuartos → la que corresponda. Se
pasa junto con las referencias de rostro y cuerpo de la persona. La prenda la fija esta referencia; la escena, el
prompt. Es el mismo contrato del [kit 3D del logo](../2026-09-17_efeonce-logo-3d/LEEME.md).

## Trampas observadas

- El eslogan compuesto con `<tspan>` pierde los espacios en librsvg: usar espacios duros y `xml:space="preserve"`.
- Un pedido de «detalle de puño y cordón» devolvió un collage de dos paneles; hay que exigir «una sola fotografía».
- La primera tanda se generó antes del contrato de realismo y no combinaba con el resto: al cambiar el contrato hay
  que **rehacer la serie completa**, no sólo la vista nueva.
- La espalda gris perdió el eslogan en un intento; siempre verificar la estampa vista por vista.

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 26 generaciones con descartes.
