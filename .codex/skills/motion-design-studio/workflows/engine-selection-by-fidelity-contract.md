# Selección de motor por contrato de fidelidad — no por canal

> **Estado:** evidencia operativa limitada — 2026-07-11. No declara un ganador universal ni sustituye el gate de revisión humana.
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

## Operar Seedance: `pnpm ai:fal` y elección de endpoint

Seedance se opera con el CLI `pnpm ai:fal` (`scripts/ai/fal-image.ts`, registro en `src/lib/ai/fal-capabilities.ts`),
out-of-band y nunca runtime del producto. No armar scripts ad-hoc sobre `runFalModel`. `pnpm ai:fal --list` es
gratis; cualquier corrida con `--capability` gasta, y fal no devuelve `usage`: el CLI no reporta costo por corrida.

```bash
pnpm ai:fal --capability seedance25-i2v --image frame.png --prompt "…" --duration 5 --resolution 720p --no-audio --out shot.mp4
```

Hay 15 endpoints: 2.5 y 2.0 × `t2v` / `i2v` / `r2v`, y 2.0 además en variantes `fast`, `mini` y `us`
(ids `seedance25-*`, `seedance20-*`, `seedance20-{fast,mini,us}-*`). Los slugs van **sin** `fal-ai/` (Seedance
v1/v1.5 sí lo llevan: el prefijo depende del endpoint). Los límites difieren **por endpoint** y el CLI los valida
**antes** de gastar:

| Endpoint | Duración máx. | Resoluciones | Notas |
| --- | --- | --- | --- |
| 2.5 (`seedance25-*`) | 30 s | 480p · 720p · 1080p | Sin 4K. Sólo su `r2v` acepta `--task reference\|editing\|extension` (rechazo verificado en local; uso real sin verificar) |
| 2.0 base (`seedance20-*`) | 15 s | 480p · 720p · 1080p · 4k | Único con 4K (verificado: 3840×2160 real) |
| 2.0 `fast` / `us` | 15 s | 480p · 720p | — |
| 2.0 `mini` | 15 s | 480p · 720p | Sin `--bitrate` (no expone `bitrate_mode`) |

- Aspectos en todos: `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (`--aspect`).
- `i2v` acepta `--end-image` (último cuadro); `r2v` acepta `--audio` y `--video` (repetibles). `--no-audio` apaga el
  audio generado. Timeout de video por defecto: 900 s.
- Verificados 2026-09-16: `seedance25-t2v`, `seedance25-i2v` (con upload de imagen local) y `seedance20-t2v` (4K).
  Los otros 12 están declarados sin verificar: el CLI lo advierte antes de gastar; la primera corrida es prueba.

**Criterio de elección:** toma larga (más de 15 s) → **2.5**; entrega en **4K** → **2.0 base**; exploración barata
de movimiento o actuación → **2.0 `mini`/`fast` a 480p**, y subir de tier sólo con el take aprobado. Catálogo
completo: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`.

**Retome sin recobro:** el CLI imprime el `request_id` apenas fal encola. Si el polling local vence (HTTP 408), el
trabajo **sigue corriendo y cobrando** en fal; no relances: `pnpm ai:fal --capability <id> --request-id <id>`
recupera la salida sin reenviar ni cobrar (verificado: mismo archivo byte a byte). El código aplica a Seedance, H3 y Seedream. Alcance de la verificación: el retome se probó en real sólo con `h3turbo-t2v`; Seedream y Seedance usan el mismo código (`awaitFalRequest`) pero no tienen corrida propia de retome.

## Operar Minimax H3: `pnpm ai:fal` (conectado 2026-09-16)

H3 se opera con el mismo CLI. Son 17 endpoints en tres familias (slugs sin `fal-ai/`, p. ej.
`minimax/h3/text-to-video`); `pnpm ai:fal --list` los agrupa en IMAGE / VIDEO / TRAINING.

```bash
pnpm ai:fal --capability h3turbo-t2v --prompt "…" --resolution 480P --out explora.mp4
pnpm ai:fal --capability h3max-camera --image kv.png --camera-trajectory '[{"distance":1,"elevation":5,"azimuth":0,"time":0},{"distance":0.8,"elevation":10,"azimuth":40,"time":1}]' --out orbita.mp4
```

| Familia (ids) | Resoluciones | USD fal (2026-09-16) | Cuándo elegirla |
| --- | --- | --- | --- |
| **Max Turbo** (`h3turbo-t2v`, `h3turbo-i2v`) | 480P · 768P · 1080P | 0,0125 / s (la más barata) | Divergencia barata y rápida: explorar movimiento/actuación antes de subir de tier |
| **Max** (`h3max-t2v`, `h3max-i2v`, `h3max-r2v`, `h3max-camera`) | 480P · 768P · 1080P | 0,025 / s | `h3max-camera`: **control de cámara real sobre una imagen congelada** (la escena no se mueve, sólo la cámara; hasta 12 keyframes `{distance, elevation -90..90, azimuth, time 0..1}`) |
| **Base** (`h3-t2v`, `h3-i2v`, `h3-r2v`) | 480P · 768P · **2K · 4K** (default 2K) | 0,05 / s | Única H3 con 2K/4K |
| **LoRA** (`h3-{t2v,i2v,r2v}-lora`) | como base | 0,0625 / s | Consistencia de marca/personaje con una LoRA propia (`--lora <path[@scale]>`, hasta 3, scale 0–4). **Sin verificar** |
| **Entrenadores** (`h3-train-{t2v,i2v,flf2v,ref2va}`) | — | t2v 0,005 / step (2000 ≈ USD 10) · ref2va 0,015 / step (≈ USD 30) | Producir esa LoRA: `--training-data <zip\|url>`, `--steps`, `--rank`, `--learning-rate`, `--trigger`. **Sin verificar**; timeout default 3 h |

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

## Previs 3D → Seedance: capacidad investigada, no evidencia interna

Seedance recibe referencias de texto, imagen, audio y video; una previs se aporta como media exportada, no como `.blend` ni escena editable. El video puede orientar cámara, composición, blocking y ritmo, mientras una imagen alineada define el look final. Esto sigue siendo condicionamiento interpretativo: no garantiza cámara 3D, geometría, contactos, texto ni continuidad frame-perfect.

Antes de probar, confirmar que el endpoint expone **video de referencia + imagen de referencia** (los `r2v` de `pnpm ai:fal` aceptan `--image` y `--video`; ninguno está verificado aún) y registrar modelo/tier, prompt, costo, metadata y rúbrica temporal. La fuente funcional, las referencias oficiales y el límite específico de Glitch viven en `docs/documentation/ai-tooling/previs-3d-y-referencias-seedance.md`. El blocking 3D Glitch fue rechazado por el operador: no reutilizarlo ni elevar esta capacidad a workflow validado sin un fixture nuevo autorizado.

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

El reintento T está documentado pero bloqueado por saldo Fal. No promocionar Seedance a receta “validada” hasta que pase esos gates.

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
