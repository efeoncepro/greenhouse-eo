# Reel de muestra para un cliente: cuadros fijos → planos → capa de motion con los elementos aprobados de la campaña

> **Estado:** validado — 2026-10-12 · reel v2.2 de 25 s (9:16, 1080×1920, 30 fps, locución y música) aprobado por el
> operador («Bien, vamos con ese») como muestra para la propuesta a Sika Mexicana (Wherex N.º 1164). La v1 (animatic con
> fondo plano + audio) fue rechazada. La propuesta se presentó el 2026-10-13; el MP4 (23 MB) no se adjuntó porque el portal admitía 20 MB por archivo: el comprador lo ve por la página con QR.
> **Evidencia y receta:** `ai-generations/2026-10-12_sika-propuesta-tecnica/reel/v2/` (`stills.batch.json`, `planos.sh`,
> `*.motion.txt`, `build-overlay.py`, `overlay-render.mjs`, `montaje.sh`) y su `LEEME.md` (§«Reel v2»).
> **Límite de verificación:** el agente no oye. Sincronía de voz, golpes y música las juzgó el operador; aquí sólo hay
> mediciones de archivo. El QR de la página no se escaneó con un teléfono real.

## La idea en una frase

Para una marca que pauta en TV, la muestra tiene que verse como un comercial: **una idea con antagonista**, planos
generados desde **cuadros fijos dirigidos**, y **encima** una capa de motion hecha con **los elementos ya aprobados del
manual de la campaña** (no dibujados de nuevo). El modelo pone mundo, luz y movimiento; la marca y el texto se componen.

## Cuándo usarla

- Un cliente o comprador pide «un video tipo reel» de muestra y la marca compite en TV o medios programáticos.
- Ya existe un manual o sistema gráfico de campaña aprobado (sello, firma, paneles, tipografía) con su generador.
- Hay un render oficial del producto que debe verse exacto (etiqueta incluida).

No aplica si el encargo admite storyboard y el operador no pidió video: se pregunta antes de producir.

## Pasos (encadenados)

### 0. Idea y estructura por tiempos (antes de generar)

Rechazo del operador a la v1: «no se ve cinemático y profesional como requiere Sika… es una marca gigante de México que
pauta en TV y medios programáticos, debe ser de impacto». El replanteo aprobado tiene un antagonista («El agua siempre
busca una entrada») y esta estructura, con los cortes fijados antes de producir:

| Tiempo | Plano | Capa de motion |
|---|---|---|
| 0–4 s | gancho macro: la gota cae y revienta contra la junta | — |
| 4–6 · 6–8 · 8–10 s | tres lugares de la casa (regadera, cocina, ventana) | etiqueta de lugar por plano |
| 10–12 s | negro | giro tipográfico a pantalla completa («UNO solo.») |
| 12–17 s | aplicación del producto | panel con el nombre del producto |
| 17–21 s | envase héroe frente al agua | sello de lanzamiento + titular |
| 21–25 s | firma de campaña (tomada de la pieza ya aprobada) | barrido de entrada |

Cortes: 4 · 6 · 8 · 10 · 12 · 17 · 21 s. La locución y los golpes se amarran a esos cortes en el montaje.

### 1. Cuadros fijos (GPT Image 2.5 Sunburst)

```bash
pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 1024x1536 --batch stills.batch.json
```

- El lote es un arreglo de `{ "filename", "prompt" }`. La CLI estimó ≈ USD 0,206 por los cinco cuadros (sólo salida).
- **Envase:** el mismo modelo con el **render oficial del cliente como `--image`** y un prompt que lo declara producto
  exacto (`s4-hero.prompt.txt`). La etiqueta se revisa **al 100 %** antes de pasar al video. `--allow-brand` no existe
  en `pnpm ai:image` (quedó como `FATAL: Unknown argument` en `_stills.log`).
- Cada cuadro se lleva a 1080×1920 (`stills/<plano>-916.png`) antes del video. En la carpeta no quedó el script de ese
  paso: al repetir, declarar cómo se recorta o escala.

### 2. Planos (Seedance 2.5 por BytePlus, desde el primer cuadro)

```bash
pnpm -s ai:byteplus --model seedance25 --image $R/stills/$n-916.png --prompt-file $R/$n.motion.txt \
  --duration 5 --aspect 9:16 --resolution 1080p --no-audio --out $R/clips/$n.mp4 --yes > $R/clips/$n.log 2>&1
```

(`planos.sh <plano…>` lo recorre en serie y anota el código de salida de cada uno en `clips/_fin.log`.)

- BytePlus fue pedido por el operador por ser la API más barata (su criterio; aquí no se comparó tarifa). La CLI avisa
  `precio variable, sin cota calculable`: por eso exige `--yes`.
- Cada log guarda el id de tarea; se recupera con `--model seedance25 --task-id <id>` sin volver a enviar.
- Lo entregado [medido con ffprobe]: HEVC 1080×1920, **24 fps**, 5,04 s. El montaje lo conforma a 30 fps.
- La etiqueta del envase se mantuvo exacta en movimiento **en este caso**. No es garantía: revisar primer cuadro, último
  y dos intermedios al 100 %; si deriva, la etiqueta se compone.
- 🔴 **Cuadro externo con rostro humano:** se observó rechazo `PrivacyInformation`; el KYC solo no basta.
  Cargar el [preflight de retratos](../../greenhouse-ai-creative-rights-governance/references/byteplus-portrait-preflight.md)
  y el [ledger por cuenta](../../../../docs/operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md).
  Un `asset://` exige el mismo propietario que la API y estado literal `Active`; probar referencia y primer cuadro
  por separado a 480p/4 s antes de planificar este flujo a 1080p. Una fila histórica de otra cuenta no acredita
  compatibilidad. Seguir las vías oficiales del manual o la alternativa autorizada, sin «lavar» el cuadro por Seedream.

### 3. Capa de motion (HTML + GSAP → secuencia PNG con alfa)

```bash
python3 build-overlay.py        # escribe overlay.html (1080×1920, 25 s, fondo transparente)
node overlay-render.mjs [desde] [hasta]   # overlay/NNNN.png, 30 fps, 750 cuadros para 25 s
```

- **Los elementos salen del generador del manual de campaña**, no se redibujan: `build-overlay.py` importa `gen` del
  manual y usa `gen.sello_lanz(...)` y sus colores (`gen.Y`, `gen.K`, `gen.R`, `gen.TEAL`). Tipografía de la campaña.
- Una sola línea de tiempo GSAP en pausa, con cada entrada anclada al corte del paso 0.
- Render: Playwright a 1080×1920, `window.seek(t)` por cuadro y `locator('#st').screenshot({ omitBackground: true })`.
- `overlay.html` carga la tipografía y GSAP desde la red (Google Fonts y cdnjs): el render espera `networkidle` y
  `document.fonts.ready`. Sin red, la capa sale con otra fuente.

### 4. Montaje ffmpeg por segmentos

```bash
bash montaje.sh [ganancia_musica_dB]      # SOLO_AUDIO=1 reutiliza _imagen.mp4 y rehace sólo la mezcla
```

Forma del script: una función por tramo (`-ss`/`-t` sobre el plano, escala y recorte a 1080×1920, `fps=30`, grade leve y
grano), ocho intermedios `_seg-N.mp4`, `concat` con lista y `-c copy`, y una pasada final que superpone
`overlay/%04d.png`. Todas las llamadas con `-nostdin`; intermedios con `-preset veryfast`.

```bash
X="-an -c:v libx264 -crf 15 -preset veryfast -pix_fmt yuv420p -r 30"
seg() { ffmpeg -nostdin -v error -y -ss $2 -t $3 -i $1 -vf "$4" -t $5 $X _seg-$6.mp4; }
ffmpeg -nostdin -v error -y -f concat -safe 0 -i _lista.txt -c copy _base.mp4
ffmpeg -nostdin -v error -y -i _base.mp4 -framerate 30 -i overlay/%04d.png \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto:shortest=1,format=yuv420p[v]" -map "[v]" -t 25 … _imagen.mp4
```

### 5. Voz y música

Craft y estado de herramientas en `audio-studio` (`efeonce/STUDIO_TOOLING.md`, delta 2026-10-12, y
`efeonce/APPROVED_MUSIC_CONTINUITY.md`). Lo que el montaje hace:

- **Locución:** una toma (`vo.mp3`) cortada por frases; cada frase entra en su segundo del video con `atrim` +
  `adelay`, y fundidos de 20–50 ms.
- **Música:** la pista salió de 43 s; se usa **un tramo continuo de 25 s** (17,45–42,45), sin cortes internos.
- **Golpes:** seno de 48 Hz con caída, sintetizado, en los cortes que lo piden (10,0 y 21,0 s).
- **Mezcla:** la voz comprime la música por `sidechaincompress`; después `loudnorm` y salida a 48 kHz estéreo, AAC 256k,
  `-movflags +faststart`.

```bash
ffmpeg -nostdin -v error -y -i musica-43.mp3 \
  -af "atrim=17.45:42.45,asetpts=PTS-STARTPTS,afade=t=in:d=0.7" -t 25 musica.mp3
# en la mezcla: …amix=inputs=N:normalize=0,…,aformat=channel_layouts=stereo,…  y al final  loudnorm=I=-15:TP=-1.5:LRA=11
```

El `I=-15` es el valor de este caso, en una pasada; no es un target. La norma sonora pide −14 LUFS para video y redes
(companion de lecciones, F28): re-masterizar por destino.

### 6. Copia web y entrega

- Master: 25,0 s, H.264 1080×1920 30 fps, AAC 48 kHz estéreo, 23,4 MB [medido].
- **Copia web:** 9,2 MB, mismas dimensiones y audio, video a ≈ 2,7 Mb/s [medido]. El comando no quedó en la carpeta.
  Hace falta porque **la carga por lote de activos del lienzo rechaza archivos de más de 20 MB**.
- **Página para verlo:** reproductor canónico de AXIS (`AxisVideoPlayer`, skin Cinema) en una página de Think con
  `noindex` y sin analítica, subtítulos VTT, póster WebP, QR y enlace en la propuesta. El token de la URL es discreción,
  no seguridad: el MP4 queda público por URL directa. Readback hecho: página 200, MP4 con rangos (206), VTT y póster.

## Plantilla de prompt

**Cuadro fijo** = escena concreta + reserva («The upper third is dark and empty») + un **bloque de look compartido** por
todos los planos, que es lo que los hace parecer de la misma película:

```text
Look: a high-end TV commercial for a construction brand, shot on a high-speed cinema camera with a 100 mm macro lens.
Deep black environment, one hard key light from the left that draws crisp specular highlights on water and glossy
surfaces, a warm amber-yellow rim light from behind as the only colour accent, shallow depth of field, fine film grain,
rich contrast, photorealistic, physically plausible water. No text, no letters, no logos, no brand names, no watermarks,
no people's faces.
```

**Movimiento** = qué se mueve y a qué velocidad + qué **no** se mueve + cámara + cierre fijo:

```text
… The camera does not move. Cinematic TV commercial, photorealistic, … Keep the framing, the lighting and every surface
exactly as in the first frame. No text, no logos, no people.
```

**Envase:** «Use the reference image as the exact product … label, colours, typography and proportions unchanged and
perfectly legible»; en movimiento: «stays perfectly still, rigid and dry … its printed label stays exactly as in the
first frame». Sólo el agua se mueve.

## Qué NO hacer / gotchas (medidos el 2026-10-12)

- ❌ **Estirar un plano para llenar su tiempo.** La gota «cae muy lento… es extraña la lentitud» (operador): el plano se
  usaba sólo hasta el segundo 2,85 y se estiró para cubrir el gancho. Se regeneró (`s1b-gota`) pidiendo la caída **a
  velocidad real** y la cámara lenta **sólo desde el impacto**; entra desde 0,15 s y dura 4 s sin retime.
- ❌ **Usar un plano más allá de donde se sostiene.** El plano original deformaba la junta después del segundo 2,85. Se
  revisa cada plano completo y se anota hasta dónde sirve; el prompt nuevo declara la junta «solid and rigid: it never
  deforms, breaks, splits, melts or moves».
- ❌ **`window.seek` que devuelve la línea de tiempo.** Playwright intenta serializar el valor devuelto y la página se
  cierra. Correcto: `window.seek = t => { tl.seek(t, false); }` y, en el render, `pg.evaluate(t => { window.seek(t) }, …)`.
- ❌ **Un solo ffmpeg con ocho entradas y `concat`.** Se quedó detenido dos veces en segundo plano. Montaje por
  segmentos, todo con **`-nostdin`** y `-preset veryfast` en los intermedios.
- ❌ **`bc` para calcular tiempos de `afade`.** Imprime `.70` (sin cero) y rompe `afade st=`. Usar
  `awk 'BEGIN{printf "%.2f", …}'`.
- ❌ **Confiar en que `amix` conserva el estéreo.** Con la voz en mono, la mezcla queda mono sin
  `aformat=channel_layouts=stereo` después de cada `amix`.
- ❌ **Aprobar la etiqueta por miniatura.** Se mira al 100 % en el cuadro fijo y en el plano.
- ❌ **Subir el master al lienzo.** Límite de 20 MB por activo en la carga por lote: se sube la copia web.
- ❌ **Reeditar la música en trozos** para calzarla con la imagen, **inventar un elemento de marca** o diseñar la capa
  gráfica sin el manual: ver el companion de lecciones, §13 (F34–F37).

## Costo / gasto gobernado

- Cuadros fijos: ≈ USD 0,206 estimados por la CLI para cinco (sólo salida); el del envase, aparte.
- Planos: siete generaciones de 5 s a 1080p (incluye la gota original y la regenerada). **El gasto total no quedó
  totalizado**; la CLI de BytePlus no da cota. Referencia de otra sesión (2026-10-07): un clip de 5 s a 720p ≈ USD 2,31.
- Voz y música por el conector de claude.ai: costo no registrado.
- Capa de motion, montaje y mezcla: locales, sin gasto de proveedor.

## Evidencia

- Scripts, prompts y logs: `ai-generations/2026-10-12_sika-propuesta-tecnica/reel/v2/`.
- Procedimiento y decisiones: `ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md` (v2, v2.1 y v2.2).
- Lecciones como modos de falla: [companion de lecciones §13](../companions/video-lessons-and-failure-modes.md).
- Receta vecina (capa HTML con `seek(t)` y montaje por segmentos, con Omni):
  [fotos aprobadas → reel vertical](approved-photos-to-vertical-reel-with-logo-transition.md).
