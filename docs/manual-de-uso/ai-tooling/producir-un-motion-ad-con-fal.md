# Producir un motion ad con el CLI de fal

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-22 por Claude
> **Ultima actualizacion:** 2026-09-22 por Claude — primera version, escrita desde la produccion del motion
> «No fuiste tú» (CMP-001, capitulo 3): 25,39 USD, 11 tomas, 5 iteraciones solo de audio
> **Modulo:** AI Tooling / Asset Generation
> **Comando:** `pnpm ai:fal`
> **Manual hermano:** [Operar el CLI de fal](operar-cli-fal-seedream-seedance.md) — ese explica el comando completo; este
> explica como se produce **una pieza de motion** con el
> **Documentacion tecnica:** [GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
> §3 (arbol de video) y §5 (fichas por familia)

## Para que sirve

Para producir un **motion ad** de 5 a 15 segundos —un anuncio social con personaje, capa grafica y diseño sonoro— con
un solo comando de terminal, partiendo de material que ya tienes: un plate, una pieza estatica aprobada y las poses del
kit del personaje.

Este manual no reemplaza al manual del comando. Ahi esta el detalle de cada capacidad; aca esta **el oficio**: que
tener listo, como estimar sin gastar, como se escribe el prompt de un motion, que medir antes de entregar y con que
ratios te vas a topar.

Caso fuente y unica pieza de referencia viva: el motion «No fuiste tú» (vocero no autorizado), entregado el
2026-09-22 en OneDrive bajo
`Alineación/5. Contenidos/15. Paid Media/03. Finales/2026-09-22_SEO-AEO_motion_vocero-no-autorizado/`. Su `LEEME.md`
registra que se produjo y que se aprendio; los prompts resueltos estan en `prompts/`.

---

## Antes de empezar

### 1. Los insumos visuales — el modelo no los inventa, se los pasas

Un motion de marca no se pide con palabras: se arma con referencias. El caso fuente uso **cuatro imagenes**, y cada
una cumple un papel distinto:

| # | Que es | Para que sirve | Si falta |
|---|---|---|---|
| 1 | La **pieza estatica compuesta**, ya aprobada, con CTA incluido | fija el look EXACTO del texto: tipografia, jerarquia, bounding box, cursores | el modelo inventa una tipografia y el titular sale generico |
| 2 | El **plate limpio** (la escena sin texto) | fija la escenografia: atril, soportes, barra encendida, fondo | el modelo recompone la escena y el encuadre deriva |
| 3 | La **pose del gesto** (del kit del personaje) | el modelo la copia en vez de improvisarla | el personaje gesticula de forma arbitraria |
| 4 | La **pose de reposo** (del kit) | define el primer y el ultimo cuadro, que es lo que cierra el loop | el loop no cierra |

Las poses salen de un kit ya generado (en el caso fuente,
`ai-generations/2026-09-17_codex-poses-3d/out/`). 🔴 **Las poses no se le piden al modelo: se le pasan.** Un modelo
al que le describes un gesto te devuelve un gesto distinto en cada pasada.

El orden de los `--image` importa: es el orden en que el prompt los nombra (`Image 1`, `Image 2`…). Si cambias el
orden de los flags tienes que cambiar el prompt.

### 2. El saldo — revisalo antes, es gratis

```bash
pnpm ai:fal --balance
```

Imprime el saldo USD de cada cuenta de fal configurada (`FAL_API_KEY` y `FAL_API_KEY_B`). No cobra y no encola nada.
Sin `--fal-account`, el comando usa la cuenta con mas saldo y, si fal bloquea una por saldo, pasa sola a la otra (el
bloqueo ocurre **antes** de encolar: no cobra).

Un motion no es una imagen: presupuesta **entre 10 y 30 USD** para llegar a una pieza aprobada, no el costo de una
toma. El caso fuente gasto 25,39 USD en once tomas, y de esas cinco fueron solo para arreglar el audio.

### 3. Donde va la salida

Trabaja bajo `ai-generations/<fecha>_<pieza>/`. Sin `--out` ni `--out-dir`, los archivos caen en
`public/images/generated/`, que no es lugar para exploraciones.

---

## Paso a paso

### 1. Elige el motor antes de escribir el comando

La guia canonica para decidir que modelo usar es
[GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
§3 (arbol de video) y §5 (fichas). El metodo de seleccion —y por que no se copia el dato aca— vive en la skill
`ai-model-selection`.

Para un motion con personaje, capa grafica y audio, lo que decidio el caso fuente:

- **Referencias a video (`r2v`)**, no texto a video ni imagen a video. Necesitas pasar cuatro imagenes con papeles
  distintos, y solo `r2v` acepta varias.
- **`h3max-r2v`** (Minimax H3 Max). Es el #1 de Artificial Analysis en imagen-a-video **con audio**, y en la
  comparacion directa contra `seedance25-r2v` gano en calidad *y* en precio: titular mas grande y mas nitido, a
  **13× menos** costo y en 20 s en vez de 3,5 min.

🔴 El dato que cambia el presupuesto: las dos tomas con Seedance 2.5 costaron 12,48 USD; las **nueve** iteraciones con
H3 Max costaron 9,96. Liderar un ranking general no es liderar tu caso.

### 2. Estima sin gastar

`--estimate` **valida el pedido completo e imprime el costo, sin encolar nada**. No cobra. Los archivos locales se
suben antes de estimar, y subir tampoco cobra.

```bash
pnpm ai:fal --capability h3max-r2v \
  --image pieza-con-cta.png --image plate-limpio.png \
  --image pose-gesto.png --image pose-reposo.png \
  --prompt-file brief/loop-9x16.prompt.txt \
  --duration 15 --resolution 1080P --aspect 9:16 \
  --prompt-expansion disabled \
  --estimate
```

Imprime `$ costo estimado ≈ USD X · <base del calculo>` y termina con
`(solo estimacion: no se encolo nada)` mas el cuerpo JSON exacto que se habria enviado. Ese JSON es la forma mas
rapida de verificar que `aspect_ratio` y `resolution` van como crees.

**Costo por segundo a 1080p** (tarifas publicadas al 2026-09-16; tabla completa en la guia §7.1):

| Motor | `--resolution` | USD / segundo | 15 s |
|---|---|---:|---:|
| Minimax H3 Max Turbo | `1080P` | 0,04 (promo 0,02) | 0,60 |
| **Minimax H3 Max** | `1080P` | **0,08** | **1,20** |
| Minimax H3 base | `2K` (no tiene 1080P) | 0,13 | 1,95 |
| Wan 3.0 | `1080p` | 0,20 | 3,00 |
| Wan 3.0 Prime | `1080p` | 0,28 | 4,20 |
| Flux 3 final | `1080p` | 0,29 | 4,35 |
| Seedance 2.0 base | `1080p` | ≈ 0,685 | ≈ 10,28 |
| Seedance 2.5 | `1080p` | ≈ 1,164 | ≈ 17,46 |

Seedance no cobra por segundo sino por tokens (`alto × ancho × segundos × 24 / 1024`); las cifras de la tabla son la
conversion de la guia para 1080p vertical. El comando ya aplica esa formula al estimar.

**El tope de confirmacion son USD 1.** Si la estimacion lo supera, el comando **se detiene antes de encolar** y pide
`--yes`. Subelo para esa corrida con `--max-usd <n>` o para la sesion con `FAL_COST_CONFIRM_USD`.

### 3. El comando, flag por flag

Este es el comando real de la toma final del caso fuente:

```bash
pnpm ai:fal --capability h3max-r2v \
  --image pieza-compuesta-con-cta.png \
  --image plate-limpio.png \
  --image codex-3d-08-idea-tres-cuartos-derecha.png \
  --image codex-3d-01-frente-heroe.png \
  --prompt-file brief/loop-9x16-FINAL.prompt.txt \
  --duration 15 --resolution 1080P --aspect 9:16 \
  --prompt-expansion disabled \
  --fal-account FAL_API_KEY_B --max-usd 2 --yes \
  --out out/loop-9x16-1080p.mp4
```

| Flag | Que hace | Si lo omites |
|---|---|---|
| `--capability h3max-r2v` | resuelve el slug y **valida en local** duracion, resolucion, aspecto y cupos antes de gastar | tendrias que usar `--model <slug>` y pierdes toda la validacion: fal rechaza despues de encolar |
| `--image <path>` (repetible) | referencia visual; viaja por `reference_image_urls` en el orden que la pasas. **Hasta 9** en `h3max-r2v` | `r2v` exige al menos una referencia visual: falla en local. Sin la pieza compuesta, el texto se inventa |
| `--prompt-file <path>` | lee el prompt de un archivo | usa `--prompt "<texto>"`. Para un motion el prompt tiene ~60 lineas: **siempre archivo**, y queda versionado |
| `--duration 15` | entero de **5 a 15** en H3 (Seedance acepta 4–30 y `auto`; Wan 2–30) | el endpoint aplica su default; el registro presupuesta 5 s. Una pieza social que se entrega en 15 s hay que pedirla en 15 |
| `--resolution 1080P` | escalon de salida. H3 escribe en **MAYUSCULAS** (`480P`, `768P`, `1080P`); el comando acepta `1080p` y lo corrige | 🔴 el comando envia la **mas barata** del endpoint —`480P` en H3 Max— y lo avisa. Sirve para explorar; **una entrega en 480P es un error caro de descubrir tarde** |
| `--aspect 9:16` | ratio de salida | 🔴 **devuelve 1920×1080 HORIZONTAL** aunque las cuatro referencias sean verticales. Ver el problema comun mas abajo. Costo una toma |
| `--prompt-expansion disabled` | apaga la reescritura del prompt por el proveedor. En H3 Max y Turbo el campo es **obligatorio** | el comando envia `balanced`: el proveedor **reescribe tu prompt**. En una pieza donde cada palabra fue calibrada (ver §4), eso deshace el trabajo |
| `--fal-account FAL_API_KEY_B` | fuerza una cuenta | usa la de mas saldo, y cambia sola si fal bloquea una |
| `--max-usd 2` | tope de confirmacion de esta corrida | el tope es USD 1 y el comando se detiene |
| `--yes` | confirma sobre el tope | se detiene y te lo dice. **Leelo antes de repetir con `--yes`**; no lo pongas por costumbre |
| `--out <path>` | archivo de salida | cae en `public/images/generated/` |
| `--detach` | encola, imprime `request_id` y cuenta, y termina | espera hasta 30 min (video). Un timeout local **no** detiene el trabajo en fal: sigue y se cobra |
| `--request-id <id>` | retoma un trabajo ya encolado y lo descarga **sin volver a pagar** | relanzar paga dos veces |
| `--status` | con `--request-id`, consulta una vez si termino. No cobra | — |

**H3 no acepta `--no-audio` ni `--bitrate`**, y **siempre** entrega audio. Si no quieres sonido, el camino es dirigir
el audio desde el prompt (§4) o quitar la pista en post — no hay toggle.

Render observado: **20–35 s por toma** con `h3max-r2v` a 1080P.

### 4. Como se escribe el prompt de un motion

Un prompt de motion no es una descripcion de escena: es una **partitura**. Tiene secciones fijas, y cada una existe
porque su ausencia produjo un defecto medible.

Usa como plantilla el prompt final real:
`ai-generations/2026-09-22_motion-codex-rueda-prensa/brief/loop-9x16-FINAL.prompt.txt` (copia entregada en
`prompts/prompt-9x16-FINAL.txt`).

#### Las ocho secciones

**a) El encabezado: duracion, formato y el marco sonoro.**

> «A 15-second seamless loop for a vertical social ad. THIS PIECE IS EFFECTIVELY SILENT: there is no dialogue and no
> music.»

Declara los tres invariantes de la pieza en la primera linea. 🔴 **El marco sonoro va arriba, no al final.** Si la
pieza es muda, declararla «cine mudo con score» desde el encabezado es un marco **autoconsistente**; decir «hay una
rueda de prensa pero nadie habla» le pide al modelo que sostenga una contradiccion, y no la sostiene.

**b) El mapa de referencias.**

> «Image 1 is the EXACT target look… Image 2 is the clean set. Images 3 and 4 are the same character in the exact
> poses it must hit.»

Le dice al modelo **que papel cumple cada `--image`**. Sin este mapa el modelo promedia las cuatro y ninguna manda.

**c) EL SET — y la camara.**

Describe la escenografia **tomandola de la imagen** («from image 2, locked»), y fija la camara:
`LOCKED OFF for the whole shot: no pan, no tilt, no zoom, no dolly`. En una pieza con texto, cualquier movimiento de
camara arrastra la capa grafica y la vuelve ilegible.

🔴 **La escenografia la cargan las imagenes, no las palabras.** Esto no es un detalle de estilo: es la palanca que
resolvio el problema del audio (§g).

**d) LA ACTUACION — con timings, y con lo que el personaje NO es.**

```
- 0.0–1.0s   At rest behind the lectern, arms down… (pose of image 4).
- 1.0–3.5s   It leans forward and raises ONE short arm… (pose of image 3, restrained).
- 3.5–6.0s   A second brief gesture — a short dismissive wave…
- 6.0–13.0s  It holds still, facing slightly away, as if it is finished…
- 13.0–15.0s It settles back into the exact rest pose of the first frame.
```

Dos cosas que parecen opcionales y no lo son:

1. **Las negaciones de actitud.** «It is NOT celebrating, NOT happy, NOT triumphant: it is detached, procedural and
   faintly bored.» En el caso fuente el personaje remataba triunfal con los brazos arriba, y eso **contradecia el
   texto**: la tesis no era triunfo sino usurpacion. Con el personaje celebrando, el espectador piensa «que simpatico»;
   con el personaje indiferente, siente el desaire. El gesto que significa «ni te pregunto nada» es el vocero que
   termina, se queda quieto y no toma preguntas.
2. **La quietud es el centro emocional, no relleno.** El bloque `6.0–13.0s` es el mas largo del guion a proposito.

**e) El elemento que NO cambia.**

> «THE GLOWING BAR stays COMPLETELY EMPTY for all fifteen seconds: its small text cursor blinks slowly and no words
> ever appear inside it. This emptiness is the point of the piece.»

Si el remate de la pieza esta en algo que **no ocurre**, hay que declararlo con la misma fuerza con la que se declara
lo que si ocurre. Un modelo rellena huecos por defecto.

**f) LA CAPA GRAFICA — orden de entrada, sosten y salida.**

Numerada, con hora y verbo de entrada para cada elemento:

```
1. 1.0s   La linea fina "Hoy alguien habló en nombre de tu empresa." entra en fade.
2. 2.0s   El titular "No fuiste tú." SLAMS in — punch-in de 104% a 100%, sin rebote.
3. 3.0s   Un cursor "IA" entra desde la derecha y dibuja el rectangulo de seleccion.
…
8. 7.5–13.0s  🔴 EL SOSTEN LARGO. Todo visible y PERFECTAMENTE QUIETO durante 5,5 s.
9. 13.0–14.3s Fade lento de todo junto — nunca un corte.
10. 14.3–15.0s El cuadro queda LIMPIO e identico al primero.
```

🔴 **Aparecer lento no es lo mismo que desaparecer lento.** El primer intento de dar tiempo de lectura estiro la
**entrada**, y no era eso: lo que hacia falta era que la composicion **ya armada se sostuviera**. La forma correcta es
**entrada a ritmo (7 s) → sosten largo y quieto (5,5 s) → fade lento (1,3 s)**.

El paso 10 es el que cierra el loop: si queda texto en el ultimo cuadro, el loop salta.

**g) TAMAÑOS Y LAYOUT — en porcentaje del cuadro, nunca en pixeles.**

```
- El bloque de texto ocupa el 45% superior, ALINEADO A LA IZQUIERDA, al 7% del borde
  izquierdo y 5% desde arriba.
- El titular es ENORME: su linea abarca ~62% del ancho del cuadro. Es por lejos el
  elemento mas grande. NO lo rindas chico ni centrado.
- La linea fina de arriba es ~1/5 de la altura del titular.
- El boton ocupa ~40% del ancho, con su descriptor justo debajo.
```

Los porcentajes son lo unico que sobrevive al cambio de ratio: **esta es la seccion que reescribes** cuando pasas de
9:16 a 1:1 o a 3:4, y la unica. Las demas quedan iguales.

**h) SOUNDTRACK — el bloque mas caro de la pieza.**

El audio consumio cinco iteraciones. La secuencia real fue: balbuceo en español → «gritando en un baile escoces» →
suena a portugues → vuelve a hablar → mudo. Tres cosas que aprender:

1. 🔴 **La referencia equivocada produce el sonido equivocado, literalmente.** El «baile escoces» fue un error de
   prompt: se pidio *brass band march* con tuba y caja, que es **exactamente** una banda de gaitas.
2. 🔴 **La causa de fondo era estructural y medible.** El prompt tenia **13 terminos que inducen habla** —5
   «microphone», 3 «statement», 2 «announce», «spokesperson», «press conference», «declared»— contra **2
   prohibiciones de voz**. Se le estaba pidiendo a un modelo que viera una rueda de prensa y no generara voz. **La
   escena inducia lo que el prompt prohibia.**
3. ✅ **Lo que lo resolvio, y es la receta: quitar los inductores en vez de prohibir mas fuerte.** Los microfonos
   pasaron a «foam-topped stands on slim chrome arms» — visualmente identicos (la imagen los aporta igual) y
   **semanticamente mudos**. Mas el marco autoconsistente del encabezado (§a).

   > Si te descubres agregando una tercera prohibicion, cuenta los inductores. El problema esta del otro lado.

La seccion de sonido lista **cada golpe con su hora y su accion**, y declara explicitamente los tramos vacios:

```
- un golpe seco de madera a 0.0s al abrir;
- un whoosh liviano a ~1.0s cuando se inclina;
- un tick agudo cada vez que entra una linea de texto: 1.0, 2.0, 4.0, 5.0 y 6.0s;
- un click de mouse a ~7.0s al presionar el boton.
Durante el sosten (7.5–13.0s) NO hay sonido mas alla del room tone.
```

**Sin musica quedo mejor que con musica.** Una fanfarria **abre una expectativa** de anuncio; como no viene ninguno,
queda colgada. Sin ella, el vacio deja de ser un bache y pasa a ser el mensaje.

⚠️ Pide siempre un **room tone** muy bajo debajo del silencio. En el caso fuente el silencio salio digital puro y
puede leerse como audio cortado; se arregla en post con una capa de ambiente, no exige regenerar.

#### Sobre meter el texto DENTRO del video

El canon manda **componer** el texto encima. Aca se genero dentro del video porque el operador lo pidio, y
**funciono**: el texto volvio bien escrito, con tildes y tipografia correcta.

🔴 **La frontera real no es «texto si / texto no» — es «texto si, marca no».** Una marca no tolera «parecido»: cuatro
pasadas dan cuatro logotipos distintos. Si la pieza lleva logotipo exacto, **se compone**.

---

### 5. El QA obligatorio

Nada se entrega sin estas cuatro medidas. Todas corren con `ffmpeg`/`ffprobe`, que ya estan instalados.

#### a) Dimensiones y duracion reales

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,nb_frames,r_frame_rate -of default=nw=1 pieza.mp4
```

La primera medida es la que atrapa el error mas caro: **un video horizontal cuando pediste vertical**. Corre esto
antes de mirar nada mas.

#### b) El loop — primer contra ULTIMO cuadro REAL

🔴 **El loop se mide entre el PRIMER y el ULTIMO cuadro reales, no en muestras comodas.** Medirlo contra un cuadro
intermedio que ya tiene texto encima da un **falso negativo**: en el caso fuente se reporto mal antes de corregirlo.

```bash
# primer cuadro
ffmpeg -v error -y -i pieza.mp4 -vf "select=eq(n\,0)" -frames:v 1 -update 1 first.png

# ULTIMO cuadro: -sseof salta al final y -update 1 sobrescribe hasta quedarse con el ultimo
ffmpeg -v error -y -sseof -0.5 -i pieza.mp4 -update 1 last.png

# diferencia media de luminancia entre ambos (escala 0–255)
ffmpeg -hide_banner -i first.png -i last.png \
  -lavfi "blend=all_mode=difference,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG" \
  -f null - 2>&1 | grep -i yavg
```

Como leerlo:

- **Es una medida comparativa, no un umbral universal.** El numero depende del encode. Mide **el archivo que vas a
  entregar** y compara contra **tus propias iteraciones**, nunca contra un numero ajeno.
- La progresion real del caso fuente, iteracion a iteracion, fue **7,84 → 1,09 → 0,96 → 0,56 → 0,55**: de «se ve el
  salto» a «no se ve». Un valor de un digito bajo es un loop que cierra; por encima de ~3 el corte se nota.
- Medido hoy con el comando de arriba sobre el master 9:16 entregado: **YAVG = 0,85**.
- Si el numero es alto, mira `last.png`: casi siempre **quedo texto en el ultimo cuadro**, y eso se arregla en el
  prompt (paso 10 de la capa grafica), no en post.

#### c) Los hitos de la animacion

Extrae los cuadros de los tiempos que declaraste en el prompt y miralos:

```bash
for t in 0 2 5 7 9 13 14.9; do
  ffmpeg -v error -y -ss "$t" -i pieza.mp4 -frames:v 1 -update 1 "frame-$t.png"
done
```

Lo que revisas: que el titular sea **por lejos** el elemento mas grande, que la caja de seleccion abrace el titular,
que la barra siga vacia, que el sosten este realmente quieto y que el ultimo cuadro este limpio.

#### d) El audio

```bash
# 1. ¿hay pista, y de que tipo?
ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name,channels,sample_rate -of default=nw=1 pieza.mp4

# 2. nivel de toda la pista
ffmpeg -hide_banner -i pieza.mp4 -af volumedetect -f null - 2>&1 \
  | grep -E "mean_volume|max_volume"

# 3. barrido segundo a segundo — esto es lo que de verdad prueba el diseño sonoro
for s in $(seq 0 14); do
  printf "%2ss  " "$s"
  ffmpeg -hide_banner -ss "$s" -t 1 -i pieza.mp4 -af volumedetect -f null - 2>&1 \
    | grep mean_volume | sed 's/.*mean_volume: //'
done
```

El barrido del master 9:16 entregado, medido hoy:

```
 0s  -20.3 dB   ← golpe de apertura
 1s  -69.0 dB
 2s  -26.1 dB   ← entra el titular
 3s  -41.0 dB
 4s  -23.3 dB
 5s  -46.0 dB
 6s  -91.0 dB
 7s  -33.8 dB   ← click del boton
 8s  -72.1 dB
 9s  -91.0 dB   ┐
10s  -91.0 dB   │ EL SOSTEN: piso de ruido, sin nada encima
11s  -91.0 dB   │
12s  -91.0 dB   ┘
13s  -36.9 dB   ← el personaje vuelve a reposo
14s  -91.0 dB
```

Ese perfil **es** la partitura del §4h hecha dato: los golpes caen donde dice el prompt y el sosten esta vacio.

Dos advertencias:

- 🔴 **El RMS no distingue musica de voz.** Sirve para probar que el silencio existe y para ubicar golpes de foley;
  **no** para afirmar que no hay habla. Eso lo juzga un oido. Escucha la pieza completa antes de entregar.
- El `mean_volume` de toda la pista del master mide −29,5 dB y su `max_volume` marca **0,0 dB**: la mezcla toca el
  techo digital. Si vas a pautar, revisa picos en post.
- El LEEME registro −163,9 dB de silencio en el material previo al encode; el master entregado mide −91 dB en la
  ventana de sosten. El criterio util es el **contraste** entre el sosten y los golpes, no el valor absoluto.

---

### 6. Ratios: cual soporta cada motor, y el agujero del 4:5

Verificado contra `src/lib/ai/fal-capabilities.ts` (2026-09-22):

| Motor / operacion | `--aspect` soportados |
|---|---|
| Seedance 2.5 y 2.0 (todas las variantes, t2v/i2v/r2v) | `auto` · `21:9` · `16:9` · `4:3` · `1:1` · `3:4` · `9:16` |
| Minimax H3 base y Max — texto a video | `21:9` · `16:9` · `4:3` · `1:1` · `3:4` · `9:16` |
| Minimax H3 base y Max — **referencias a video** (`-r2v`) | `adaptive` · `21:9` · `16:9` · `4:3` · `1:1` · `3:4` · `9:16` |
| Minimax H3 — **imagen a video** (`-i2v`) | **ninguno**: el comando rechaza `--aspect`; el encuadre sale de la imagen |
| Flux 3 | `auto` · `21:9` · `2:1` · `16:9` · `4:3` · `1:1` · `3:4` · `9:16` |
| Wan 3.0 y Wan 3.0 Prime | `adaptive` · `16:9` · `4:3` · `1:1` · `3:4` · `9:16` |

🔴 **NINGUN motor de video que opera `pnpm ai:fal` soporta 4:5.** Medido en los cinco (Seedance 2.5, Seedance 2.0,
Wan 3.0, Flux 3 y H3) y confirmado contra el registro: la cadena `4:5` no existe en ningun contrato. Todos ofrecen
`3:4` como lo mas cercano.

**Y 4:5 es el formato principal de las piezas estaticas aprobadas de Efeonce.** Quien planifique motion en 4:5 tiene
que contar con el recorte desde el brief.

**3:4 no es 4:5**: 0,750 contra 0,800. A 1080 de ancho son **1440 contra 1350 — 90 px, un 6,7 %**. Si subes un 3:4
donde la plataforma espera 4:5, **ella recorta y decide donde**.

#### El recorte, paso a paso

1. Genera en **3:4** con el prompt adaptado (solo la seccion de layout cambia: en el caso fuente el bloque de texto
   bajo de 45% a 40% del alto, porque el cuadro es mas corto).
2. **Mide las franjas antes de cortar.** No es un crop de conveniencia: hay que verificar que lo que sacrificas esta
   vacio. Mide **las dos franjas en todos los cuadros**, no en uno:

   ```bash
   # y=0 es la franja de arriba; y=1395 la de abajo (1440 - 45)
   for y in 0 1395; do
     printf "y=%s  " "$y"
     ffmpeg -hide_banner -i loop-3x4-15s.mp4 \
       -vf "crop=1080:45:0:$y,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG" \
       -f null - 2>&1 | grep -oE "YAVG=[0-9.]+" | cut -d= -f2 \
       | awk '{s+=$1; n++; if($1>m) m=$1} END {printf "media %.2f · max %.2f · %d cuadros\n", s/n, m, n}'
   done
   ```

   El criterio es **un digito bajo sobre 255 = negro, no sacrificas nada**. Medido hoy sobre el 3:4 del caso fuente:
   **media 2,59 · max 3,54** arriba y **media 0,64 · max 0,78** abajo, en los 362 cuadros. (El LEEME registro 1,8 y
   0,2 en su momento; el valor absoluto depende del archivo y del encode — lo que decide es el orden de magnitud.)

3. Recorta 45 px arriba y 45 abajo:

   ```bash
   ffmpeg -i loop-3x4-15s.mp4 -vf "crop=1080:1350:0:45" \
     -c:v libx264 -preset slow -crf 18 -c:a copy salida-4x5.mp4
   ```

   `-c:a copy` conserva la pista de audio tal cual: el recorte no vuelve a codificar el sonido.

4. **Vuelve a correr el QA completo** sobre el archivo recortado. El crop re-codifica el video y el loop se mide de
   nuevo.

⚠️ `--aspect adaptive` **NO adopta el ratio de las referencias.** Con referencias de 1152×1440 devolvio 1920×1080.
No es un atajo al 4:5 ni a ningun otro ratio.

---

## Que significan las señales

| Lo que imprime el comando | Que significa | Que hacer |
|---|---|---|
| `· sin --resolution: uso 480P, la mas barata de "h3max-r2v"` | no pasaste `--resolution` y vas a recibir el escalon mas barato | para explorar, sigue; para entregar, corta y agrega `--resolution 1080P` |
| `$ costo estimado ≈ USD X · <base>` | estimacion local antes de encolar | **leela**; es tu ultima oportunidad de parar |
| `la estimacion (USD X) supera el tope de USD 1.00` | el freno de gasto actuo **antes** de encolar. No cobro nada | repite con `--yes` o ajusta `--max-usd` |
| `(solo estimacion: no se encolo nada)` + `cuerpo: {...}` | `--estimate` termino bien | revisa en el JSON que `aspect_ratio` y `resolution` sean los que crees |
| `⋯ encolado · request_id <id> · cuenta <cuenta>` | el trabajo esta corriendo y **ya se esta cobrando** | anota el `request_id`: te salva si vence la espera |
| `↑ subiendo <archivo> …` | subida de un archivo local a fal | subir no cobra |
| `⚠ "<id>" esta declarada pero NO verificada contra el API real` | capacidad sin corrida real registrada | espera sorpresas; si funciona, anota la fecha en `fal-capabilities.ts` |

---

## Que no hacer

- **No entregues sin `--resolution` explicito.** Sin el flag el comando usa el escalon mas barato (`480P`). Bueno
  para explorar, inaceptable para entrega.
- **No omitas `--aspect` en `h3max-r2v` creyendo que las referencias mandan.** No mandan: devuelve 1920×1080. Costo
  una toma medida.
- **No uses `--aspect adaptive` para heredar el ratio de las referencias.** No lo hereda. Costo otra toma.
- **No pidas 4:5 a ningun motor.** No existe. Genera en 3:4 y recorta con franjas medidas.
- **No le describas las poses al personaje: pasaselas** como `--image` desde el kit. Describirlas produce un gesto
  distinto por pasada.
- **No dejes `--prompt-expansion` sin declarar en H3 Max o Turbo.** El comando envia `balanced` y el proveedor
  reescribe tu prompt.
- **No combatas un defecto de audio prohibiendolo mas fuerte.** Cuenta los inductores del prompt y quitalos. Trece
  terminos que inducen habla ganan contra dos prohibiciones.
- **No pongas una marca o un logotipo dentro del prompt esperando exactitud.** Texto si, marca no: el logotipo se
  compone encima.
- **No midas el loop contra un cuadro intermedio.** Primer y ultimo cuadro **reales**, o el resultado miente.
- **No afirmes que no hay voz porque el RMS es bajo.** El RMS no distingue musica de voz. Escuchalo.
- **No relances una toma que vencio por tiempo.** Retomala con `--request-id`: relanzar paga dos veces.
- **No regeneres por un defecto editorial.** Crop, texto, grade y mezcla se arreglan en post. Regenerar cuesta una
  toma completa.
- **No pongas `--yes` por costumbre.** Confirma solo despues de leer la linea del costo estimado.
- **No confundas «aprobado» con «autorizado a pautar».** Son dos decisiones distintas y la segunda es del operador.
- **No dejes las exploraciones en `public/images/generated/`** ni guardes las URLs temporales de fal en documentos;
  guarda los archivos descargados.

---

## Problemas comunes

### El video sale horizontal aunque todas las referencias son verticales

**Causa medida (2026-09-22, dos corridas):** falto `--aspect`. `h3max-r2v` **si** acepta `--aspect`, y sin el
devuelve **1920×1080** aunque las cuatro referencias sean verticales. El registro de capacidades solo anotaba «sin
aspect ratio» para la variante `-i2v`, que es otra cosa: esa no acepta el flag porque hereda el encuadre de su unica
imagen.

Con `--aspect adaptive` pasa lo mismo: con referencias de 1152×1440 devolvio 1920×1080. `adaptive` no adopta el ratio
de las referencias.

**Que hacer:** pasa `--aspect` explicito siempre, y corre `ffprobe` sobre la salida **antes** de mirar la pieza.

### El personaje deriva de forma entre tomas

**Causa:** le estas describiendo el personaje en vez de pasarselo. Un modelo que lee «un personaje azul con forma de
nube» dibuja uno distinto cada vez.

**Que hacer:** pasa las poses del kit como `--image` y en el prompt referencialas por numero («the exact poses it must
hit», «pose of image 3»). Nombra tambien el plate limpio como origen del set («from image 2, locked»).

### El modelo genera voz cuando la pieza debe ser muda

**Causa de fondo, medida:** el prompt tenia **13 terminos que inducen habla** contra **2 prohibiciones**. La escena
que describias inducia exactamente lo que prohibias.

**Que hacer, en este orden:**

1. **Cuenta los inductores.** «microphone», «spokesperson», «press conference», «statement», «announce», «declared»,
   «speech», «say».
2. **Quitalos y sustituyelos por su descripcion fisica muda.** Los microfonos pasaron a «foam-topped stands on slim
   chrome arms»: visualmente identicos, semanticamente mudos. La imagen aporta el objeto igual.
3. **Dale un marco donde la voz no cabe**, en la primera linea del prompt: cine mudo, o pieza silente con foley.
4. Recien entonces, la prohibicion explicita.

Sintoma adyacente: **el modelo canta en un idioma inventado**. El «minionés» no es un idioma inventado, es un pastiche
de idiomas **reales** deformados. Por eso reconoces palabras — y por eso, en una pieza que hay que **leer**, cada
palabra reconocible es un segundo que el ojo deja de leer. No es una salida elegante al problema de la voz.

### El texto sale chico, centrado o generico

**Causas y arreglos, en orden de frecuencia:**

1. **No pasaste la pieza compuesta como referencia 1.** Sin ella el modelo inventa la tipografia.
2. **No declaraste el tamaño en porcentaje del cuadro.** Escribe `su linea abarca ~62% del ancho del cuadro` y
   `es por lejos el elemento mas grande, varias veces mas alto que cualquier otra linea`.
3. **No prohibiste lo contrario.** Agrega `Do NOT render it small or centred` y `do not shrink it`.
4. **Dejaste `--prompt-expansion` en `balanced`.** El proveedor reescribio tu calibracion de tamaños.

### El silencio suena a audio cortado

**Causa:** el modelo entrego silencio digital puro en vez del room tone pedido.

**Que hacer:** no regeneres. Se arregla en post con una capa de ambiente muy baja bajo toda la pieza. Aun asi, pide
siempre el room tone en el prompt («a barely audible room tone… so the silence sounds like a real room and never like
a broken audio file»): a veces lo entrega.

### La espera del comando vence y el video no llego

El timeout es **local**: el trabajo sigue corriendo en fal y **se cobra igual**. No relances.

```bash
pnpm ai:fal --capability h3max-r2v --request-id <request_id> --status
pnpm ai:fal --capability h3max-r2v --request-id <request_id> --out out/toma.mp4
```

El `request_id` lo imprime la linea `⋯ encolado`. Espera por defecto en video: 30 min (`--timeout <ms>` la cambia).

### `User is locked` (403) o quieres saber cuanto saldo queda

```bash
pnpm ai:fal --balance
```

Es gratis. El comando usa la cuenta con mas saldo y cambia sola si fal bloquea una; el bloqueo ocurre **antes** de
encolar, asi que no cobra. Para forzar: `--fal-account FAL_API_KEY_B`.

---

## Referencias tecnicas

- Manual del comando completo: [`operar-cli-fal-seedream-seedance.md`](operar-cli-fal-seedream-seedance.md)
- Guia canonica de seleccion de modelos: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`
  (§3 arbol de video · §4.2 matriz de video · §5.5 ficha Minimax H3 · §7 presupuesto)
- Metodo de seleccion de modelo: skill `ai-model-selection`
- CLI: `scripts/ai/fal-image.ts` (`pnpm ai:fal`)
- Registro de capacidades y limites por endpoint: `src/lib/ai/fal-capabilities.ts`
- Reglas de validacion de entrada: `src/lib/ai/fal-input-rules.ts` · estimacion: `src/lib/ai/fal-pricing.ts`
- Cliente canonico: `src/lib/ai/fal.ts`
- Oficio de motion: skill `motion-design-studio` · direccion de arte y marca: `efeonce-advertising-creative`,
  `design-studio`
- Caso fuente entregado (LEEME, prompts y finales): OneDrive
  `Alineación/5. Contenidos/15. Paid Media/03. Finales/2026-09-22_SEO-AEO_motion_vocero-no-autorizado/`
- Prompts de trabajo del caso fuente: `ai-generations/2026-09-22_motion-codex-rueda-prensa/brief/`
