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

Ambas con **emblema bordado en hilo blanco** en el pecho izquierdo y, por decisión del operador, la **estampa canónica en la espalda** —logo completo + «Empower your Growth» centrado y más chico, al 38 % del ancho— igual que el hoodie. El polo es la excepción: mantiene la espalda limpia.

## Contenido (`final/`, 22 vistas)

Entrega: OneDrive `5. Contenidos/13- Branding/Chaqueta Efeonce/v01/`.

Frente · espalda · tres cuartos izquierda y derecha · lateral · cierre abierto con el forro a la vista · doblada ·
percha · planos cenitales frente y espalda · macro del bordado · macro del cierre y la tapeta · macro de puño y
bolsillo · puesta de frente sobre polo navy, de espaldas y con un segundo cuerpo y tono de piel. Transparentes en las
vistas de prenda sola y planos. Manifiesto `efeonce-chaqueta-manifiesto.json` con **cuándo usar** cada vista.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| Los macros volvían como prenda completa aunque el prompt pedía primer plano | Describir el encuadre por lo que **no** debe verse: «la silueta de la chaqueta NO aparece — sin línea de cuello, sin ruedo, sin manga, sin fondo; sólo el tejido de cerca» |
| La primera tanda salió con la espalda limpia por la regla del polo; el operador corrigió: en las chaquetas la espalda lleva logo y eslogan | Rehacer las cuatro vistas de espalda con la estampa canónica como imagen 2, al 38 % |
| Riesgo de emblema espejado (visto en el polo) | Isotipo oficial como imagen 1 y QA del emblema **vista por vista al 100 %**: las 22 quedaron correctas |

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 25 generaciones con descartes.

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

El macro del bordado viaja también con la prenda puesta (`macroEnUso: false` lo apaga). Ejemplo de ficha:

```json
"objetos": [{ "objeto": "chaqueta-bomber-efeonce", "persona": "karo", "giro": "espalda-45-izq", "camara": "baja" }]
```

### Claves y números

#### Bomber — `chaqueta-bomber-efeonce` (29 vistas, números 18–46)

| Vista (clave base) | Qué muestra | Hombre | Mujer (`-mujer`) |
|---|---|---|---|
| `frente` | de frente | 14 (previa, `assetDeUso`) | 18 |
| `45-izq` | 45°, nariz a la izquierda del cuadro | 19 | 23 |
| `45-der` | 45°, nariz a la derecha | 20 | 24 |
| `70-izq` | 70°, izquierda | 21 | 25 |
| `70-der` | 70°, derecha | 22 | 26 |
| `frente-bajo` | de frente, cámara baja | 35 | 36 |
| `espalda-45-izq` | espalda a 45°, izquierda | 37 | 42 |
| `espalda-45-der` | espalda a 45°, derecha | 38 | 43 |
| `espalda-70-izq` | espalda a 70°, izquierda | 39 | 44 |
| `espalda-70-der` | espalda a 70°, derecha | 40 | 45 |
| `espalda-bajo` | espalda, cámara baja | 41 | 46 |
| `frente-mano` | oclusión: mano sobre el pecho (`tapa: "mano"`) | 27 | 28 |
| `frente-cruza` | oclusión: antebrazo con taza (`tapa: "cruza"`) | 33 | 34 |
| `frente-objeto` | oclusión: tablet contra el pecho (`tapa: "objeto"`) | 31 | 32 |
| `frente-brazos` | oclusión: brazos cruzados (`tapa: "brazos"`) | 29 | 30 |

Archivo: `efeonce-chaqueta-bomber-NN-puesto-<clave>-<tam>-v01-fondo-estudio.png`. Vistas puestas previas del kit: `frente` = 14 (`assetDeUso`), `espalda` = 16, `espalda-mujer` = 15, `frente-cuerpo-b` = 17.

#### Softshell — `chaqueta-softshell-efeonce` (29 vistas, números 18–46)

| Vista (clave base) | Qué muestra | Hombre | Mujer (`-mujer`) |
|---|---|---|---|
| `frente` | de frente | 14 (previa, `assetDeUso`) | 18 |
| `45-izq` | 45°, nariz a la izquierda del cuadro | 19 | 23 |
| `45-der` | 45°, nariz a la derecha | 20 | 24 |
| `70-izq` | 70°, izquierda | 21 | 25 |
| `70-der` | 70°, derecha | 22 | 26 |
| `frente-bajo` | de frente, cámara baja | 35 | 36 |
| `espalda-45-izq` | espalda a 45°, izquierda | 37 | 42 |
| `espalda-45-der` | espalda a 45°, derecha | 38 | 43 |
| `espalda-70-izq` | espalda a 70°, izquierda | 39 | 44 |
| `espalda-70-der` | espalda a 70°, derecha | 40 | 45 |
| `espalda-bajo` | espalda, cámara baja | 41 | 46 |
| `frente-mano` | oclusión: mano sobre el pecho (`tapa: "mano"`) | 27 | 28 |
| `frente-cruza` | oclusión: antebrazo con taza (`tapa: "cruza"`) | 33 | 34 |
| `frente-objeto` | oclusión: tablet contra el pecho (`tapa: "objeto"`) | 31 | 32 |
| `frente-brazos` | oclusión: brazos cruzados (`tapa: "brazos"`) | 29 | 30 |

Archivo: `efeonce-chaqueta-softshell-NN-puesto-<clave>-<tam>-v01-fondo-estudio.png`. Vistas puestas previas del kit: `frente` = 14 (`assetDeUso`), `espalda` = 15, `espalda-mujer` = 17, `frente-cuerpo-b` = 16.

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
