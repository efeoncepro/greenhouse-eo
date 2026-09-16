# Selección de motor por contrato de fidelidad — no por canal

> **Estado:** evidencia operativa limitada — 2026-07-11 (operación de Flux 3, Wan 3.0, video a video, verificación completa de Seedance/Wan, costo real, filtro de contenido y candidatos no conectados actualizada 2026-09-16; **árbol por necesidad, costos por resolución y correcciones de precio/fórmula/H3/LoRA 2026-09-16 (b)**). No declara un ganador universal ni sustituye el gate de revisión humana.
>
> **Guía canónica de selección (imagen + video, todos los modelos de `pnpm ai:image` y `pnpm ai:fal`):** `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`. Este workflow es su aplicación al video; ante conflicto, manda la guía.
>
> **Evidencia empírica:** [`Social Wall`](../../../../ai-generations/2026-07-08_social-wall-assets/README.md) (paquete de key visuals con `gpt-image-2` → Gemini Omni image-to-video, publicado) y [`Glitch`](../../../../ai-generations/2026-07-11_glitch-microphone-intro/review/take-s-seedance-source-keyvisual-review.md) (Seedance retuvo el set, pero el take aún se rechazó por actuación/foley).

## La regla

**No elegir el motor por “es para RRSS”, “es una landing” o su precio por clip.** Elegirlo por el contrato de fidelidad de la toma:

| Contrato de la toma | Primera mano | Por qué |
| --- | --- | --- |
| Un paquete de stills ficticios define tono/campaña, pero cada microescena puede interpretarse; no hay texto ni objeto diegético que deba ser exacto | **Gemini Omni image-to-video** | Convierte cada key visual en un beat vivo y breve; funciona especialmente bien para UGC, Reel, Historia y Creador si se describe la acción humana concreta. |
| Un key visual existente es la verdad del set y hace falta una **toma nueva**: composición, producto/practical, color y profundidad deben seguir reconocibles | **Seedance 2.x image/reference-to-video** (`pnpm ai:fal`) | Fallback de producción para ángulo, acción o continuidad nuevos preservando mundo/objeto. Sigue siendo candidato técnico y debe pasar actuación, texto y sonido. |
| La toma necesita cámara, blocking o timing espacial preplaneados; el look puede reinterpretarse | **Seedance reference-to-video** con playblast/viewport **exportado** + keyframe de look | El modelo puede tomar video e imagen como referencias; requiere un endpoint que exponga ambos y una prueba aislada. Capacidad investigada, no receta validada. |
| Falta una acción/objeto que no existe y se necesita explorar o editar hablando sobre una escena que tolera reinterpretación | **Gemini Omni edit/generation** | Su valor diferencial es el loop conversacional, no una promesa de fidelidad frame-perfect. |
| Sólo cambia orden, pausa, trim, freeze, grade o copy no diegético exacto | **Post determinista / mograph** | No gastar generación ni fingir física que no existe en los frames. |
| El clip tiene crop, pacing, safe-zone, texto/logo, captions, grade, foley, mezcla o loudness defectuosos | **Post determinista / audio post** | Son defectos editoriales; Seedance no es un reparador de finish. |

La plataforma o canal es un dato de formato; la **fidelidad permitida**, la presencia de un practical y la semántica física de la acción son la decisión de motor.

**Regla de fallback:** Seedance 2.x entra porque falta verdad temporal nueva —otra toma, ángulo, acción o
continuidad—, no porque una edición existente necesite arreglo. Si la acción ya existe, termina en NLE/composite/
audio. Si no existe y es el significado del plano, reabre producción de toma integral y vuelve al animatic.

## Árbol de decisión por necesidad (después de fijar el contrato de fidelidad)

La regla de arriba decide **si** generar y con qué tolerancia; este árbol decide **qué endpoint** de `pnpm ai:fal`.
Etiquetas: [verificado] corrida real 2026-09-16 · [oficial] fal/fabricante · [tercero] ranking fechado · sin dato.

| Necesidad | Primera mano | Alternativa | Lo que decide |
| --- | --- | --- | --- |
| **Explorar** movimiento/actuación barato y rápido | `h3turbo-t2v`/`-i2v` a 480P (latencia 2,7–8 s [verificado]) | `flux3-*-draft` → `flux3-enhance` sólo del elegido · `seedance20-mini-*` a 480p | Subir de tier sólo con el take aprobado; no asumir que Turbo rinde como Max (diferencia técnica: sin dato) |
| **Hero** de máxima calidad | `seedance25-*` (lidera OpenArt en adherencia, estética, física y consistencia [tercero 2026-09-16]) | `h3max-i2v` (#1 imagen a video con audio en Artificial Analysis [tercero 2026-09-16]) · `wan3-*` | Los rankings **no coinciden**: probar con un take corto. El 1080p de Seedance 2.5 está **sin verificar** (fuentes contradictorias; podría ser reescalado) |
| **Toma larga** (> 15 s) | `seedance25-*` (≤ 30 s, toma continua) | `wan3-*` (≤ 30 s o `auto`; un job de 30 s **puede cortar** entre encuadres [tercero]) · `flux3-*` (≤ 20 s) | Seedance 2.5 se vende como toma sin cortes; para multi-shot con cortes, Wan o Flux 3 |
| **4K** | `seedance20-*` base (3840×2160 [verificado]; nativo o reescalado: sin dato) | `h3-*` base 4K | H3 base 2K/4K son **reescalados desde 768P** [oficial fal]; Flux 3 4K sólo en BFL directo (no conectado; fal llega a 1080p) |
| **Cámara** precisa sobre una imagen fija | `h3max-camera` (≤ 12 keyframes; empezar y terminar en el encuadre original [oficial]) | — | La escena queda congelada: si el sujeto debe actuar, no sirve |
| **Inicio y fin** exactos | `flux3-flf` (ambos obligatorios) | `wan3-i2v --end-image` · `seedance25-i2v --end-image` · `h3*-i2v --end-image` | Flux 3 flf no acepta `auto` |
| Pasar por **varios cuadros clave** | `flux3-keyframes` (1–10 `--keyframe img@frame_index`) | — | fal expone índice de cuadro; timestamps en segundos sólo en BFL directo |
| **Editar** un video **sin** personas ni marcas | `seedance25-r2v --task editing --video` | `flux3-edit` | Filtro de ByteDance cobra el rechazo |
| **Editar** un video **con** personas o marcas | `flux3-edit` (USD 0,03/s, conserva movimiento y encuadre; salida 720p) | — | Si conserva el audio: sin dato |
| **Extender** un video | sin personas/marcas: `seedance25-r2v --task extension --video` | con personas: `flux3-extend` | Flux 3 extend usa **hasta 4 s del video y su audio** como contexto [oficial BFL] → origen mudo = 422; entrega sólo la continuación |
| **Muchas referencias** multimodales | `seedance25-r2v` (30 img / 10 video / 10 audio) | `wan3-r2v` (10/5/5) · `h3*-r2v` (9/3/3) · `seedance20-*-r2v` (9/3/3, video sólo guía) | Con videos de referencia, Seedance 2.5 r2v cobra también la duración del video de entrada [oficial] |
| Video basado en una **web o documento** | `wan3-r2v --thinking --web-url <url>` / `--file <doc>` | — | Único conectado; exige prompt con guion (sin guion salió animación de la portada [verificado]). `--file`: sin corrida real |
| **Consistencia** de personaje/producto entre tomas | referencias `r2v` (Seedance / Wan / H3) | LoRA de H3 (sin verificar, postergada [decisión]) · Kling `elements` (no conectado) · Higgsfield Soul ID (otro carril) | Anclar siempre al mismo canónico |
| Cliente exige procesamiento en **EE. UU.** | `seedance20-us-*` | — | Hospedada en EE. UU., +20 % por token, techo 720p. Sin otra razón para elegirla |

**Audio:** Seedance (`--no-audio`, campo `generate_audio`), Wan (`--no-audio`, campo `audio`) y Flux 3
(`--no-audio`) lo generan y se puede apagar; **H3 no se puede apagar** y siempre entrega pista. Trátalo como
provisional si hay diseño sonoro. Detalle en `audio-studio/SOURCES.md`.

**fps de salida:** Wan 3.0 / Prime **30 fps**; Seedance, H3 y Flux 3 **24 fps** [oficial]. Declara el fps al montar
en NLE para no introducir judder al mezclar motores.

## Costo por resolución: fal cobra por escalón

🔴 **El precio del registro (`fal-capabilities.ts`, API de pricing) es el escalón MÁS BAJO**, no el de la resolución
por defecto. Presupuesta por la resolución que realmente pides y confirma con `pnpm ai:fal --balance` antes y después
de la corrida. USD por segundo de salida, publicado 2026-09-16 [oficial fal/BFL]:

| Familia | 480p / 480P | 720p / 768P | 1080p / 1080P | 2K | 4K | Default del endpoint |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Wan 3.0 | 0,05 | 0,10 | **0,20** | — | — | **1080p** (4× lo registrado) |
| Wan 3.0 Prime | 0,068 | 0,14 | **0,28** | — | — | 1080p (**más cara** que base en fal) |
| H3 base | 0,05 | 0,06 (768P) | — | **0,13** | 0,16 | **2K** (2,6× lo registrado) |
| H3 Max (fal rotula "50% off") | 0,025 | 0,04 (768P) | 0,08 | — | — | 768P; si es promo o lista: ambiguo |
| H3 Max Turbo | no listado | 0,02 (promo 0,01) | 0,04 (promo 0,02) | — | — | registro 0,0125 no calza → medir |
| Flux 3 final (t2v/i2v/flf/keyframes) | — | 0,17 | 0,29 | — | — | 720p |
| Flux 3 extend | — | 0,41 | 0,53 | — | — | 720p · drafts 0,06 (sin resolución) · edit 0,03 (720p) |
| Seedance 2.5 | ≈0,2205 | ≈0,4730 | ≈1,164 (sin verificar) | — | — | r2v con videos de referencia: 480p ≈0,1323, 720p ≈0,2838 |
| Seedance 2.0 base · fast · mini · us | mini ≈0,0721 · us 0,1731 | base 0,3024 · fast 0,2419 · mini ≈0,1547 · us 0,37 | por fórmula | — | por fórmula | — |

⚠️ **Flux 3: precio publicado ≠ registrado.** BFL y fal publican 0,17/s final, 0,06 draft y 0,41 extend; el registro
dice 0,085 / 0,03 / 0,205 (exactamente la mitad). Por qué: sin dato. Hasta medir, presupuesta con el publicado.

**Seedance se estima con la fórmula de fal** (corrige "estimar por tokens falla ~2×"; lo que fallaba era la
equivalencia de OpenArt, que subestima ~2×):

```text
tokens = alto × ancho × segundos × 24 / 1024
costo  = tokens × precio_por_1000 / 1000        # 2.5 0,0214 · 2.0 0,014 · fast 0,0112 · mini 0,007 · us 0,0168
```

Comprobado contra el gasto real de la cuenta B [verificado 2026-09-16]: 3 × `seedance20-fast` 864×496 × 4,13 s →
~1,39 calculado vs 1,37 medido; tanda 2.0 base i2v+r2v (4,06 s) + 2 Wan 480p de 2 s → ~1,33 vs 1,37.

**Costo por clip de 10 s a la resolución indicada** [inferencia sobre los precios publicados; confirmar con
`--balance`]: H3 Turbo 768P 0,20 (lista) · H3 Max 768P 0,40 · Wan 480p 0,50 · Flux 3 draft 0,60 · Seedance mini
480p ≈0,72 · H3 base 2K 1,30 · Flux 3 final 720p 1,70 · Wan 1080p 2,00 · Seedance 2.5 480p ≈2,21 · Wan Prime
1080p 2,80 · Flux 3 extend 720p 4,10 · Seedance 2.5 720p ≈4,73. Estrategia: explorar en el escalón barato y
generar el final sólo de la toma aprobada.

**Entrenamiento LoRA H3:** 0,005/step en t2v con **mínimo 100 steps facturables** (USD 0,50; i2v/flf2v ≥ USD 1,00
y ref2va ≥ USD 1,50 con los precios del registro). El plan "10 steps ≈ USD 0,40" es imposible. Además: subtítulos
por clip obligatorios en t2v (`.txt` con el mismo nombre, o `--trigger` como respaldo) y los clips de **menos de 73
cuadros se descartan en silencio**.

## Operar Seedance: `pnpm ai:fal` y elección de endpoint

Seedance se opera con el CLI `pnpm ai:fal` (`scripts/ai/fal-image.ts`, registro en `src/lib/ai/fal-capabilities.ts`),
out-of-band y nunca runtime del producto. No armar scripts ad-hoc sobre `runFalModel`. `pnpm ai:fal --list` es
gratis; cualquier corrida con `--capability` gasta, y fal no devuelve `usage`: el CLI no reporta costo por corrida.
El CLI opera dos cuentas de fal con failover por saldo (`pnpm ai:fal --balance` las lista gratis); el detalle vive en
`greenhouse-ai-image-generator` y en `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`.

```bash
pnpm ai:fal --capability seedance25-i2v --image frame.png --prompt "…" --duration 5 --resolution 720p --no-audio --out shot.mp4
```

Hay 15 endpoints: 2.5 y 2.0 × `t2v` / `i2v` / `r2v`, y 2.0 además en variantes `fast`, `mini` y `us`
(ids `seedance25-*`, `seedance20-*`, `seedance20-{fast,mini,us}-*`). Los slugs van **sin** `fal-ai/` (Seedance
v1/v1.5 sí lo llevan: el prefijo depende del endpoint). Los límites difieren **por endpoint** y el CLI los valida
**antes** de gastar:

| Endpoint | Duración | Resoluciones | Notas |
| --- | --- | --- | --- |
| 2.5 (`seedance25-*`) | 4–30 s o `auto` | 480p · 720p · 1080p | Sin 4K. Sólo su `r2v` acepta `--task reference\|editing\|extension` (los tres verificados en real 2026-09-16) |
| 2.0 base (`seedance20-*`) | 4–15 s o `auto` | 480p · 720p · 1080p · 4k | Único con 4K (verificado: 3840×2160 real) |
| 2.0 `fast` / `us` | 4–15 s o `auto` | 480p · 720p | `us` = hospedada en EE. UU., +20 % por token: sólo si un cliente exige procesamiento en EE. UU. |
| 2.0 `mini` | 4–15 s o `auto` | 480p · 720p | Sin `--bitrate` (no expone `bitrate_mode`) |

La duración mínima es **4 s** en todos (el registro decía 1 hasta 2026-09-16; ya está corregido y el CLI lo valida).

- Aspectos en todos: `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (`--aspect`).
- `i2v` acepta `--end-image` (último cuadro); `r2v` acepta `--image`, `--video` y `--audio` (repetibles). `--no-audio`
  apaga el audio generado. Espera de video por defecto: 30 min (antes 15; Seedance 2.5 con referencias la superó).
- `r2v` exige **al menos una referencia visual** (imagen o video): el audio solo no alcanza. Las referencias se citan
  en el prompt como `@Image1`, `@Video1`, `@Audio1`. Topes que el CLI valida antes de subir (leídos del OpenAPI):
  - **2.5:** hasta 30 imágenes, 10 videos (cada uno 1,8–30,2 s, ≤ 200 MB, 300–6000 px por lado, 24–60 fps;
    combinados ≤ 30,2 s) y 10 audios (1,8–30,2 s c/u, ≤ 15 MB; combinados ≤ 30,2 s); máximo 50 archivos.
  - **2.0 (base, fast, mini, us):** hasta 9 imágenes, 3 videos (combinados 2–15 s, < 50 MB, entre ~480p y ~720p) y
    3 audios (≤ 15 s combinados); máximo 12 archivos.
- `--task` (sólo `seedance25-r2v`): el CLI valida el valor; `editing` y `extension` exigen `--video`; `editing`
  rechaza `--duration` y `--aspect`, y `extension` rechaza `--aspect` (el proveedor los fuerza a `auto`).
- **Los 15 verificados en real 2026-09-16:** `seedance25-t2v`, `seedance25-i2v` (con upload de imagen local),
  `seedance20-t2v` (4K), `seedance20-i2v`, `seedance20-r2v`, los 9 `seedance20-{fast,mini,us}-{t2v,i2v,r2v}` y
  `seedance25-r2v` con `--task reference`, `editing` y `extension`.
- **Costo:** la equivalencia de tokens de OpenArt subestima ~2× y **no sirve para presupuestar**; la fórmula de fal
  (`alto × ancho × segundos × 24 / 1024`, ver §Costo por resolución) sí calzó con lo medido. Referencias medidas: 3 corridas `seedance20-fast` de 4 s a 480p ≈ USD 1,37; 3 `mini`
  ≈ USD 0,85. La tanda completa de verificación (17 corridas, incluidas 3 rechazadas) costó USD 7,71.
- **Filtro de contenido de ByteDance:** rechaza **después de encolar, y se cobra** (422 `content_policy_violation`,
  `partner_validation_failed`). Casos medidos: referencia con el isotipo de Efeonce → "potential copyright violation";
  video con una persona → "likenesses of real people". No mandes marcas ni personas identificables a Seedance.

**Criterio de elección:** toma larga (más de 15 s) → **2.5**; entrega en **4K** → **2.0 base**; exploración barata
de movimiento o actuación → **2.0 `mini`/`fast` a 480p**, y subir de tier sólo con el take aprobado. Catálogo
completo: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`.

**Retome sin recobro:** el CLI imprime el `request_id` apenas fal encola. Si el polling local vence (HTTP 408), el
trabajo **sigue corriendo y cobrando** en fal; no relances: `pnpm ai:fal --capability <id> --request-id <id>`
recupera la salida sin reenviar ni cobrar (verificado: mismo archivo byte a byte; se usó también para recuperar un
Seedance 2.5 con referencias que superó la espera anterior de 15 min). El código aplica a Seedance, H3, Flux 3 y Seedream. Alcance de la verificación: el retome se probó en real con `h3turbo-t2v` y con un Seedance 2.5 r2v (2026-09-16); Seedream y Flux 3 usan el mismo código (`awaitFalRequest`) pero no tienen corrida propia de retome.

**Trabajos largos sin esperar:** `--detach` encola, imprime `request_id`, cuenta y los comandos de estado/resultado,
y termina; `pnpm ai:fal --capability <id> --status --request-id <id>` consulta una vez (cola/progreso/completado) sin
costo; el resultado se baja con `--request-id`. Verificado en real 2026-09-16. Los webhooks de fal no se usan en el CLI.

## Operar Minimax H3: `pnpm ai:fal` (conectado 2026-09-16)

H3 se opera con el mismo CLI. Son 17 endpoints en tres familias (slugs sin `fal-ai/`, p. ej.
`minimax/h3/text-to-video`); `pnpm ai:fal --list` los agrupa en IMAGE / VIDEO / TRAINING.

```bash
pnpm ai:fal --capability h3turbo-t2v --prompt "…" --resolution 480P --out explora.mp4
pnpm ai:fal --capability h3max-camera --image kv.png --camera-trajectory '[{"distance":1,"elevation":5,"azimuth":0,"time":0},{"distance":0.8,"elevation":10,"azimuth":40,"time":1}]' --out orbita.mp4
```

| Familia (ids) | Resoluciones | USD fal (2026-09-16) | Cuándo elegirla |
| --- | --- | --- | --- |
| **Max Turbo** (`h3turbo-t2v`, `h3turbo-i2v`) | 480P · 768P · 1080P | registro 0,0125 / s; publicado 768P 0,02 · 1080P 0,04 (ver §Costo por resolución) | Divergencia barata y rápida: explorar movimiento/actuación antes de subir de tier |
| **Max** (`h3max-t2v`, `h3max-i2v`, `h3max-r2v`, `h3max-camera`) — post-entrenado **por fal** (2026-08-27), no un modelo de MiniMax; su 1080P se refina desde 768P | 480P · 768P · 1080P | 0,025 / s en 480P; 768P 0,04 · 1080P 0,08 | `h3max-camera`: **control de cámara real sobre una imagen congelada** (la escena no se mueve, sólo la cámara; hasta 12 keyframes `{distance, elevation -90..90, azimuth, time 0..1}`) |
| **Base** (`h3-t2v`, `h3-i2v`, `h3-r2v`) | 480P · 768P · **2K · 4K** (default 2K) | 0,05 / s en 480P; **2K 0,13** · 4K 0,16 | Única H3 con 2K/4K, pero **reescalados desde 768P** (no nativos) |
| **LoRA** (`h3-{t2v,i2v,r2v}-lora`) | como base | 0,0625 / s | Consistencia de marca/personaje con una LoRA propia (`--lora <path[@scale]>`, hasta 3, scale 0–4). **Sin verificar** |
| **Entrenadores** (`h3-train-{t2v,i2v,flf2v,ref2va}`) | — | t2v 0,005 / step (2000 ≈ USD 10) · ref2va 0,015 / step (≈ USD 30); **mínimo 100 steps facturables** | Producir esa LoRA: `--training-data <zip\|url>`, `--steps`, `--rank`, `--learning-rate`, `--trigger`. **Sin verificar**; timeout default 3 h. Sin flag para `weight_name`, `split_input_duration_threshold` ni la regla `number_of_frames % 17 == 5`: usar `--input` |

Límites que cambian la decisión (difieren de Seedance en la **forma** de los campos; el CLI valida antes de gastar):

- Duración **entera 5–15 s**, default 5, sin `auto`. Resolución en mayúsculas (el CLI acepta minúsculas y envía la canónica).
- **Sin toggle de audio** (`--no-audio`/`--bitrate` no aplican), pero **entrega video con pista de audio** (soundscape/
  música, descrito en `expanded_prompt`): si el audio va en post, reemplázalo; no asumas un clip mudo.
- `i2v` **no acepta `--aspect`** (el encuadre sale de la imagen); acepta `--end-image`. `t2v`: 21:9…9:16 (default 16:9);
  `r2v` agrega `adaptive`. `r2v`: hasta 9 `--image`, 3 `--video`, 3 `--audio` (verificado sólo con imagen).
- `--prompt-expansion`: en Max/Turbo es obligatorio (si no lo pasas, el CLI envía `balanced`); la reescritura del
  prompt es parte de la toma: revisa `expanded_prompt` (`--json` lo trae entero).
- `h3max-director` **no es operable por cola** (stream realtime con prompts en vivo): el CLI se niega y lo explica.

Verificados 2026-09-16 con 9 corridas reales (832×480, 5,18 s, con audio, latencias 2,7–8 s; cuadros revisados):
`h3-t2v`, `h3-i2v`, `h3-r2v`, `h3max-t2v`, `h3max-i2v`, `h3max-r2v`, `h3max-camera`, `h3turbo-t2v`, `h3turbo-i2v`.
LoRA y entrenadores siguen sin verificar: la primera corrida es prueba.

**H3 vs Seedance:** toma de **más de 15 s** → Seedance 2.5 (hasta 30 s, tope 1080p). **4K** → Seedance 2.0 base
(15 s) o H3 base (15 s): compara con un take corto antes de elegir. **Exploración barata** → H3 Max Turbo a 480P
(más rápido y más barato por segundo que subir de tier). **Movimiento de cámara sobre un KV aprobado sin que la escena
cambie** → `h3max-camera`. Seedance sigue siendo la mano para control de audio (`--no-audio`) y R2V con muchas
referencias. Ninguno es receta validada para actuación/física: aplican los mismos gates de este contrato.

## Operar Flux 3: `pnpm ai:fal` (conectado 2026-09-16)

En fal, **Flux 3 (Black Forest Labs) es un modelo de VIDEO**, no de imagen (los Flux 2 de imagen son otros slugs y no
están conectados al CLI). Son 12 endpoints con slugs **sin** `fal-ai/` (`blackforestlabs/flux-3/<modo>`), y los
**12 están verificados con corridas reales el 2026-09-16** (salidas 1280×704, 24 fps, 5,04 s; latencias de 40 s a
4 min, bastante más lento que H3).

| Modo | ids | USD fal (2026-09-16) | Cuándo elegirlo |
| --- | --- | --- | --- |
| Texto a video | `flux3-t2v` · `flux3-t2v-draft` | registro 0,085 / s · draft 0,03 / s (**publicado: 0,17 · 0,06**) | Explorar barato en draft y subir sólo el take aprobado con `flux3-enhance` |
| Imagen a video | `flux3-i2v` · `flux3-i2v-draft` | 0,085 / s · draft 0,03 / s | Animar un KV con el mismo flujo draft → enhance |
| Primer y último cuadro | `flux3-flf` · `flux3-flf-draft` | 0,085 / s · draft 0,03 / s | Controlar dónde arranca y dónde termina la toma: `--image` (primer cuadro) y `--end-image` (último), ambos obligatorios |
| Keyframes | `flux3-keyframes` · `flux3-keyframes-draft` | 0,085 / s · draft 0,03 / s | Controlar la trayectoria con 1 a 10 `--keyframe <imagen>@<frame_index>` (índice entero ≥ 0; probado con `@0` y `@96` en 5 s a 24 fps). No acepta `--image` |
| Edición | `flux3-edit` | 0,03 / s | Re-renderizar un video existente por prompt **conservando movimiento, timing y encuadre** (`--video`) |
| Extensión | `flux3-extend` · `flux3-extend-draft` | registro 0,205 / s (**publicado 720p 0,41**) · draft 0,06 / s | Continuar un video (`--video`); ver las dos trampas abajo |
| Mejora de draft | `flux3-enhance` | 0,085 / s | Convertir un draft en la versión final (`--draft-cache`; verificado: entregó 1920×1088 conservando la escena) |

```bash
pnpm ai:fal --capability flux3-i2v-draft --image kv.png --prompt "la cámara avanza lento hacia el producto" --out draft.mp4
pnpm ai:fal --capability flux3-enhance --draft-cache "https://URL-DEL-DRAFT-CACHE" --out final.mp4
pnpm ai:fal --capability flux3-keyframes --keyframe inicio.png@0 --keyframe final.png@96 --prompt "transición continua entre ambos cuadros" --duration 5 --out trayectoria.mp4
pnpm ai:fal --capability flux3-edit --video toma.mp4 --prompt "misma toma, de noche con luces cálidas" --out edit.mp4
```

Contrato (el CLI lo valida antes de gastar):

- **Duración:** `auto` o entero 5–20 s en t2v, i2v, extend y sus drafts; `flf` y `keyframes` entero 5–20 **sin** `auto`
  (default 5). `edit` y `enhance` no aceptan duración (heredan la del origen).
- **Resolución:** `720p` | `1080p` (default 720p) sólo en los finales (t2v, i2v, flf, keyframes, extend). Drafts,
  `edit` y `enhance` no aceptan `--resolution`.
- **Aspecto:** `auto`, `21:9`, `2:1`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (default `auto`); `edit` y `enhance` no lo aceptan.
- Audio generado por defecto (`--no-audio` lo apaga; sin `--bitrate`). `--safety-tolerance 0-4` (default 2).
- `edit`/`extend`: el origen va por `--video` (MP4, < 50 MB, < 15 s según el OpenAPI); no aceptan `--image`.
- **Draft → enhance:** cada draft devuelve un `draft_cache` (archivo `.bin` de ~2 KB con URL) y el CLI imprime el
  comando `flux3-enhance` listo para copiar. `--draft-cache` sólo lo acepta `flux3-enhance`, y ahí es obligatorio.

**Las dos trampas de `extend`** (aisladas con corridas reales):

1. **Exige pista de audio en el video de origen**, porque la continuación usa **hasta 4 s del video y de su audio**
   como contexto [oficial BFL] (un origen de más de 4 s no aporta más contexto [inferencia]). Con un origen sin audio (por ejemplo, generado con `--no-audio`),
   fal encola el trabajo y después lo rechaza con un 422 genérico `Invalid request parameters`, con cualquier
   duración. El CLI revisa con `ffprobe` los archivos locales y corta antes de subir; con URL remota o sin `ffprobe`
   sólo avisa. Si el origen es mudo, agrégale una pista (aunque sea silencio) antes de extender.
2. **Entrega sólo la continuación**, no el clip original más la extensión: la salida arranca en el último cuadro del
   origen y `--duration` son los segundos nuevos (5 → 5 s; `auto` → 15 s). Hay que unir origen y continuación en post
   (NLE o ffmpeg).

**Flux 3 vs H3 vs Seedance:** para **explorar barato y subir sólo el take aprobado** sin regenerar la escena, Flux 3
draft → enhance; para **fijar inicio/fin o una trayectoria** con cuadros concretos, `flux3-flf` o `flux3-keyframes`;
para tomas de **más de 20 s**, Seedance 2.5; para **4K**, Seedance 2.0 base o H3 base. Ninguno es receta validada para
actuación o física: aplican los gates de este contrato.

## Operar Wan 3.0: `pnpm ai:fal` (conectado 2026-09-16)

Wan 3.0 (Alibaba) entra porque es **#2 en video** del ranking externo OpenArt Arena v1.0 (Elo 1047, detrás de Seedance
2.5) y **#1 en la subcategoría Video Editing** (leído en `openart.ai/arena/leaderboard` el 2026-09-16; es un ranking
de preferencia, no evidencia interna). Son 6 endpoints, slugs **sin** `fal-ai/` (`alibaba/wan-3.0/<modo>` y
`alibaba/wan-3.0-prime/<modo>`), y son todos los que fal tiene de Wan 3.0: **no hay edición ni imagen en 3.0** (la
edición de video más reciente de Wan es la 2.7, **no conectada**).

| ids | Estado |
| --- | --- |
| `wan3-t2v` | **Verificado en real** 2026-09-16: 480p, `--duration auto` → 5,04 s, `--seed 7` respetado, `--no-prompt-expansion` → `actual_prompt` null, 854×480 con audio |
| `wan3-i2v`, `wan3-r2v`, `wan3prime-t2v`, `wan3prime-i2v`, `wan3prime-r2v` | **Verificados en real** 2026-09-16 (con la cuenta B de fal, tras el bloqueo por saldo de la A) |

```bash
pnpm ai:fal --capability wan3-t2v --prompt "…" --resolution 480p --duration auto --seed 7 --out explora.mp4
pnpm ai:fal --capability wan3-i2v --image kv.png --end-image cierre.png --resolution 720p --duration 8 --out toma.mp4
pnpm ai:fal --capability wan3-r2v --image producto.png --video gesto.mp4 --prompt "the subject in Image 1 walks past Video 1" --resolution 720p --out ref.mp4
pnpm ai:fal --capability wan3-r2v --web-url https://ejemplo.com/lanzamiento --thinking --resolution 720p --duration auto --out explicativo.mp4
```

Contrato (leído del OpenAPI 2026-09-16, igual en base y Prime; el CLI valida antes de gastar):

- **Precio (corregido 2026-09-16):** fal cobra por resolución — base 480p 0,05 · 720p 0,10 · **1080p 0,20 USD/s**;
  Prime 0,068 · 0,14 · **0,28** (más cara, no igual). Alibaba define Prime como versión **acelerada**; calidad frente
  a base: sin medir. Compara con un take corto antes de asumir que Prime rinde más. **30 fps** (el resto, 24).
  Alibaba ofrece edición, extensión y multi-shot de Wan 3.0, pero **fal no los expone**.
- **Duración:** entero 2–30 s (default 5) o `--duration auto` (se envía `null`: **duración inteligente**, el modelo
  elige el largo según prompt y referencias).
- **Resolución:** `480p` | `720p` | `1080p`, **default 1080p** (el más caro de explorar: pasa `--resolution 480p` al
  divergir). **Aspecto:** `adaptive` (default), `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
- **Audio:** genera audio por defecto (campo `audio`, no `generate_audio`); `--no-audio` lo apaga.
- **Expansión de prompt:** activa por defecto; `--no-prompt-expansion` la apaga (ahorra ~20–60 s, puede bajar calidad).
  Es un booleano, distinto del `--prompt-expansion <modo>` de H3. La salida trae `actual_prompt` (prompt reescrito),
  `duration` y `seed`; el CLI muestra un extracto.
- **Razonamiento:** `--thinking` (default apagado). **Semilla:** `--seed <n>` (entero ≥ 0).
- **`i2v`:** `--image` = primer cuadro, `--end-image` opcional, prompt opcional.
- **`r2v`:** hasta **10 `--image`, 5 `--video`** (≤ 15 s en total, ≥ 16 fps) y **5 `--audio`** (≤ 15 s); se citan
  **por posición** en el prompt (`Image 1`, `Video 1`), no con `@Image1` como Seedance. Prompt opcional. También puede
  basar el video en una página (`--web-url <url pública>`) o un documento (`--file <path|url>`, el CLI lo sube); ambos
  **exigen `--thinking`** y no necesitan referencias de medios.
- El safety checker no se expone (desactivarlo exige autorización de cuenta).

**Cuándo elegir Wan 3.0:** toma de **hasta 30 s con duración decidida por el modelo** (`auto`); **video explicativo
basado en una web o un documento** (`--web-url`/`--file` + `--thinking`), que ningún otro motor conectado ofrece;
**R2V que mezcla imagen, video y audio** con topes intermedios (10/5/5). Para 4K sigue Seedance 2.0 base o H3 base
(Wan tope 1080p); para edición/extensión, Flux 3 o Seedance 2.5 (esta última sólo sin personas ni marcas). El #1 de OpenArt en edición **no se traduce** a edición
operable acá: Wan 3.0 no tiene endpoint de edición en fal.

## Video a video: qué motor

fal **no expone un endpoint video-to-video de Seedance**: su video a video vive en `reference-to-video`. Tres
opciones con estado distinto:

| Necesidad | Motor | Estado | Límites que deciden |
| --- | --- | --- | --- |
| **Editar** un clip existente | `flux3-edit` | **Verificado** (2026-09-16) | USD 0,03/s; conserva movimiento, timing y encuadre; origen MP4 < 50 MB y < 15 s (OpenAPI) |
| **Editar** un clip existente | `seedance25-r2v --task editing --video` | **Verificado** (2026-09-16: convirtió un viñedo en nieve conservando el encuadre) | El proveedor fuerza `aspect_ratio` y `duration` a `auto`; videos de referencia hasta 30,2 s combinados |
| **Extender** un clip | `flux3-extend` | **Verificado** (2026-09-16) | Exige audio en el origen; entrega sólo la continuación (5–20 s o `auto`), que se une en post |
| **Extender** un clip | `seedance25-r2v --task extension --video` | **Verificado** (2026-09-16: siguió el movimiento y reveló los Andes) | El proveedor fuerza `aspect_ratio` a `auto`; duración 4–30 s o `auto` |
| Usar un video sólo como **guía** (cámara, blocking, ritmo) | `seedance20-*-r2v` (se cita como `@Video1`) o `seedance25-r2v --task reference` | Endpoints verificados en real 2026-09-16 (`reference` incluido) | Seedance 2.0 no edita ni extiende: sólo condiciona la generación nueva |
| Usar un video como **referencia** junto a imágenes y audio | `wan3-r2v` / `wan3prime-r2v` (se cita como `Video 1`) | Endpoint **verificado** en real 2026-09-16; topes leídos del OpenAPI | Hasta 5 videos ≤ 15 s en total, ≥ 16 fps; genera una toma nueva, no edita el clip |

**Regla del filtro:** Seedance 2.5 `editing`/`extension` ya está verificado, pero el filtro de ByteDance rechaza
**después de encolar y cobra** el material con **marcas** o **personas reales identificables**. Úsalo sólo con
material sin personas ni marcas (paisaje, producto genérico, ambiente); con personas, la mano es **Flux 3**
(`flux3-edit`/`flux3-extend`) o **Wan 3.0** (r2v, toma nueva). Wan 3.0 **no edita** en fal (la edición de Wan es la 2.7, no conectada), aunque rankee #1 en
Video Editing en OpenArt.

## Candidatos evaluados, no conectados (revisión 2026-09-16)

No están en `pnpm ai:fal`: no los corras con scripts ad-hoc. Conectarlos es una decisión del operador; datos leídos
del catálogo/OpenAPI de fal el 2026-09-16, sin corridas.

| Modelo | Ranking OpenArt (2026-09-16) | Lo que aportaría | Precio fal |
| --- | --- | --- | --- |
| **Kling 3** — O3 (`fal-ai/kling-video/o3/{standard,pro,4k}/…`) y V3 (`fal-ai/kling-video/v3/…`) | O3 = "Kling 3.0 Omni", #8 video | **Multi-shot** (`multi_prompt`, varios planos con su duración), **`elements` con voz** (personaje/objeto consistente con `voice_id`), **motion-control** V3 (transferir movimiento de un video a una imagen), **4K nativo**, edición `video-to-video/edit`, series de 2–9 imágenes coherentes (`kling-image/o3`) | O3 standard/pro USD 0,14/s, 4k 0,42/s · V3 turbo 0,112–0,14/s · motion-control 0,126 y 0,168/s · imagen 0,028 |
| **Grok Imagine video v1.5** (`xai/grok-imagine-video/v1.5/…`) | #10 video | Exploración masiva muy barata: t2v/i2v 1–15 s hasta 1080p; r2v 1–7 imágenes hasta 720p; sin control de audio. Edit/extend sólo en la versión anterior (USD 0,05/s) | USD 0,01/s (el más barato revisado) |

Estos datos de Kling vía fal son un carril distinto de Kling vía Higgsfield (MCP): no los mezcles.

**Gemini Omni Flash va directo por Google, nunca por fal**, aunque fal lo ofrezca (`google/gemini-omni-flash/*`):
decisión del operador (más barato, misma calidad).

## Previs 3D → Seedance: capacidad investigada, no evidencia interna

Seedance recibe referencias de texto, imagen, audio y video; una previs se aporta como media exportada, no como `.blend` ni escena editable. El video puede orientar cámara, composición, blocking y ritmo, mientras una imagen alineada define el look final. Esto sigue siendo condicionamiento interpretativo: no garantiza cámara 3D, geometría, contactos, texto ni continuidad frame-perfect.

Antes de probar, confirmar que el endpoint expone **video de referencia + imagen de referencia** (los `r2v` de `pnpm ai:fal` aceptan `--image` y `--video`; los endpoints están verificados en real desde 2026-09-16, pero el flujo previs → Seedance no tiene corrida) y registrar modelo/tier, prompt, costo, metadata y rúbrica temporal. La fuente funcional, las referencias oficiales y el límite específico de Glitch viven en `docs/documentation/ai-tooling/previs-3d-y-referencias-seedance.md`. El blocking 3D Glitch fue rechazado por el operador: no reutilizarlo ni elevar esta capacidad a workflow validado sin un fixture nuevo autorizado.

## Caso validado: Redes Sociales

1. Se generó un **set de ocho key visuals ficticios**: seis verticales con `portrait-batch.json` y dos horizontales con `landscape-batch.json`, mediante `gpt-image-2`.
2. Se validó que los stills ya resolvían una campaña coherente: mural/macaws, paleta azul-verde, estética social, sin copy ni logos que debieran conservarse literalmente.
3. Se eligieron seis slots cuyo formato promete movimiento (`Reel`, `Historia`, `UGC`, `Creador`) y se derivó una referencia 720×1280 por slot.
4. Gemini Omni animó esas referencias en masters de 10 s con acciones específicas —risa/parpadeo, ajuste de cámara, reflejo en teléfono, paso/gesto—; cada master recibió `57.920` tokens de video.
5. Se eligieron beats de 4 s, se transcodificaron a WebM/MP4/poster sin audio y se verificaron en la landing real con autoplay, hover-pause, reduced-motion y mobile.

Aquí Omni fue correcto porque el still era un **ancla de lenguaje visual**, no una promesa de conservar cada píxel ni una escena con texto/practical crítico. La escena podía cobrar vida dentro de la misma familia creativa.

## Caso en curso: Glitch

El PNG 4K ya contiene el micrófono, la cabina y el `ON AIR` como objeto físico del set. El take S de Seedance fue el primer resultado que conservó satisfactoriamente esa dirección de arte; se rechazó de todos modos porque la yema sostuvo el contacto y el audio no acreditó dos golpes aislados. Esto demuestra dos cosas a la vez:

1. Seedance es la primera mano razonable cuando el set debe mantenerse reconocible.
2. Preservar el set no aprueba una actuación: `tap → rebote → aire → tap → rebote` y dos foleys reales siguen siendo gates independientes.

El reintento T quedó documentado y bloqueado por saldo Fal (desde 2026-09-16 hay saldo en la cuenta B; no consta re-corrida). No promocionar Seedance a receta “validada” hasta que pase esos gates.

## Preflight antes de gastar

1. Escribir qué puede reinterpretar el modelo y qué no puede cambiar.
2. Clasificar cada elemento como `ancla visual flexible`, `copy/UI exacto`, `practical diegético` o `actuación física hero`.
3. Si hay copy/UI exacto, resolverlo con asset/mograph; si hay practical/actuación hero, exigir una toma íntegra y prohibir overlay/retime de reparación.
4. Estimar una sola prueba por motor; revisar el primer output completo antes de abrir otro take.
5. Registrar fuente, prompt, modelo, costo estimado/confirmado, contact sheet, audio y veredicto creativo.

## Qué no inferir

- No inferir que **Omni sirve sólo para RRSS**: en RRSS funcionó porque el paquete de imágenes y la tolerancia de interpretación le daban el problema adecuado.
- No inferir que **Seedance siempre conserva física humana**: S preservó el set de Glitch, no el doble golpe pedido.
- No inferir que un MP4 terminado, un precio bajo o una referencia aceptada equivalen a master aprobado.
- No reparar en post un practical que pertenece al mundo ni una acción corporal cuyo significado no existe en la fuente.
- No mandar a Seedance defectos de edición que deben resolverse de forma reversible en post.

## Referencias

- `living-social-wall-clips.md` — receta y publicación de RRSS con Omni.
- `omni-in-place-edit-and-deterministic-finish.md` — límite de la edición Omni y del post determinista.
- `https://fal.ai/models/bytedance/seedance-2.0/reference-to-video` — capacidades/precio variables de Seedance; reverificar antes de gastar.
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` + `src/lib/ai/fal-capabilities.ts` — slugs y límites vigentes por endpoint.
