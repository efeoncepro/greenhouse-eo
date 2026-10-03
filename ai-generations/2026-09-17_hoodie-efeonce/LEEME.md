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

## Vistas puestas por silueta, giro, espalda y oclusión (2026-10-03)

Vistas PUESTAS nuevas de este kit (las de escena, con una persona sin rostro dentro de la prenda), producidas en la
corrida [`2026-10-03_uniforme-vistas`](../2026-10-03_uniforme-vistas/LEEME.md): declaradas en `usoPorVista` del catálogo
(`scripts/foto/build-prompt.mjs`), con `cuando_usarla` en el manifiesto del kit, su prompt en `brief/`, selladas en
`scripts/foto/assets.lock.json` y publicadas al canon. Si faltan en disco, `pnpm foto:prompt` las baja solo.

### Cómo las elige `pnpm foto:prompt`

No se pasan a mano: el comando elige la vista por la `silueta` de quien viste la prenda (`hombre`/`mujer`), por el
giro de su vista de identidad (`45-*` → 45°, `perfil-*` → 70°) o por `giro` en el objeto (obligatorio de espaldas),
por `camara: "baja"` y por lo que tapa la marca (`tapa`; con una sola persona se infiere de la escena). Cadena de
respaldo: oclusión → cámara baja → giro → 45° del mismo lado → frente o espalda; en cada paso, primero la de la
silueta. Imprime una línea `·` con la elegida, el motivo y las alternativas; `puesta` en el objeto fuerza otra.

El macro del pecho viaja también con la prenda puesta (`macroEnUso: false` lo apaga). Ejemplo de ficha:

```json
"objetos": [{ "objeto": "hoodie-efeonce", "persona": "antonio", "giro": "espalda-70-der" }]
```

### Claves y números

#### Hoodie — `hoodie-efeonce` (29 vistas, números 23–51)

| Vista (clave base) | Qué muestra | Hombre | Mujer (`-mujer`) |
|---|---|---|---|
| `frente` | de frente | 15 (previa, `assetDeUso`) | 23 |
| `45-izq` | 45°, nariz a la izquierda del cuadro | 24 | 28 |
| `45-der` | 45°, nariz a la derecha | 25 | 29 |
| `70-izq` | 70°, izquierda | 26 | 30 |
| `70-der` | 70°, derecha | 27 | 31 |
| `frente-bajo` | de frente, cámara baja | 40 | 41 |
| `espalda-45-izq` | espalda a 45°, izquierda | 42 | 47 |
| `espalda-45-der` | espalda a 45°, derecha | 43 | 48 |
| `espalda-70-izq` | espalda a 70°, izquierda | 44 | 49 |
| `espalda-70-der` | espalda a 70°, derecha | 45 | 50 |
| `espalda-bajo` | espalda, cámara baja | 46 | 51 |
| `frente-mano` | oclusión: mano sobre el pecho (`tapa: "mano"`) | 32 | 33 |
| `frente-cruza` | oclusión: antebrazo con taza (`tapa: "cruza"`) | 38 | 39 |
| `frente-objeto` | oclusión: tablet contra el pecho (`tapa: "objeto"`) | 36 | 37 |
| `frente-brazos` | oclusión: brazos cruzados (`tapa: "brazos"`) | 34 | 35 |

Archivo: `efeonce-hoodie-NN-puesto-<clave>-<tam>-v01-fondo-estudio.png`. Vistas puestas previas del kit: `frente` = 15 (`assetDeUso`), `espalda` = 16, `espalda-mujer` = 22, `frente-cuerpo-b` = 17.

### Sumar una vista a este kit (procedimiento A)

1. Generarla **editando** una vista puesta aprobada del kit, con el macro del bordado como segunda imagen; si es un
   giro, partir del frente (un 45° de base arrastra su rotación). Entradas 3:4 padeadas a 2:3 espejando el pie.
2. Revisarla al 100 % con `pnpm foto:emblema`: esfera arriba, ventanas horizontales, letras exactas.
3. Copiarla a `final/` con la convención de nombre y declararla en `usoPorVista` con su clave
   `<giro>[-<tapa>|-bajo][-mujer]`.
4. Agregarla al manifiesto del kit (`cuando_usarla`) y su prompt a `brief/`.
5. `pnpm foto:assets:lock` → `pnpm creative:assets:publish apply` → `pnpm exec vitest run scripts/foto`.
6. Archivar la exploración con `pnpm ai-gen:archive apply --folder <carpeta>` y sumarla a la tabla de arriba.

Método completo y trampas medidas (marca rotada en el giro, oclusión esquivada, no componer sobre la vista):
[`garment-reference-kit.md`](../../.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md)
§Delta 2026-10-03.
