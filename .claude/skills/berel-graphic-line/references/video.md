# Video Berel — reel de transformación

> Solo Berel. Fuente de verdad de los valores: `creative-workbench/brands/berel/contracts/berel-video-reels.json`
> (schema `berel.video-reels.v1`, estado **candidato**). Lo de abajo es un **snapshot del 2026-11-02**: si el contrato
> cambió, manda el contrato. CLI: `brands/berel/scripts/reel.mjs`; funciones puras en `compose/video.mjs`.

## 1. Qué es un reel Berel

Del análisis de los 41 videos del Workspace Oficial (2026-11-02): 30 reels de 14 s a 750 × 1334, todos con la misma
forma, una sola transformación generada por IA de 8 s, sin cortes, más la tapa roja de cierre de 6 s. El marcador de
color entra hacia los 2–3 s y el titular hacia los 4–5 s. No hay voz; hay 4 pistas de música en todo el corpus. Las
fuentes de esos clips eran Firefly/Magnific a 720p.

El reel nuevo sale a **1080 × 1920, 30 fps, 14 s**: clip de 8 s + marcador (2,5 s, fundido 0,6) + titular (4,5 s,
fundido 0,8) + tapa vigente (`Tapa de Cierre_3._9.16-DOS.mp4`, nunca la carpeta «Viejo»).

## 2. Flujo

```bash
R=brands/berel/scripts/reel.mjs; O=projects/berel/<pieza>/salidas/video/<toma>
node $R cuadros --job projects/berel/<pieza>/jobs/<toma>-story.json --out $O --lugar "dining room" \
  --cambios "<cómo era antes>" --transformacion "<qué pasa en el video>" [--conservar "…"] [--luz "Sunny daylight"]
node $R capas --dir $O
node $R qa --dir $O --clip $O/flux3.mp4
node $R armar --dir $O --clip $O/flux3.mp4 --out $O/reel-flux3.mp4 --mes NOV
node $R comparar --out $O/../comparar.mp4 --modelos "flux3 omni" <dir> [<dir>…]
```

1. **Cuadros.** El reel parte del job de la **story** (hereda titular, marcador y focal). *Después* = recorte 9:16
   (864 × 1536) del plate ya corregido de color. *Antes* = edición de ese cuadro con GPT Image 2.5 Sunburst `xhigh`
   (clave personal; `cuadros` imprime el comando): misma cámara, muro sin color, sin lo que la escena va a ganar.
   Nombra lo que no cambia (ventanas, puerta, piedra, reja) para que el modelo lo conserve. **Mira antes y después
   juntos**: si la cámara se movió, el video lo delata.
2. **Capas.** `capas` compone la story sobre el cuadro después y separa marcador y titular en dos PNG transparentes.
3. **Clip.** Motor según §3. Guárdalo como `<toma>/<modelo>.mp4`.
4. **QA.** `qa` falla cerrado (salida 1). Además, **mira la hoja de cuadros**: un mueble que entra semitransparente
   no lo mide el salto.
5. **Armado.** `armar` pone capas, tapa y música. La pista del mes suena bajo los 14 s y los efectos de la tapa van
   encima a partir de los 8 s; mezcla a −14 LUFS (el corpus del squad va a −12).

## 3. Motor

| Motor | Uso | Costo | Por qué |
|---|---|---|---|
| **FLUX 3** (`flux_3_video`, Higgsfield) | **Por defecto** | 64 créditos / clip 1080p 8 s | El operador lo eligió: resuelve mejor y más fluida la aparición de los elementos |
| **Gemini Omni 1.1** (`pnpm ai:omni --task frames`, Greenhouse) | Alternativa por toma | ≈ USD 1,22 nominales (1080p reescalado) | Arma muebles por partes (cama: estructura → colchón → cojines), pinta muros largos con trazo de rodillo; reemplaza a FLUX 3 cuando éste deja un salto |
| Wan 3.0 | Descartado | 28 créditos | Corre el color: ΔE 18,3 (terracota → salmón) |
| MiniMax H3 | Descartado | 16 créditos (2K) | Fiel al color, pero los muebles entran como fundido semitransparente |
| Seedance 2.0 | Descartado | 96 créditos | El color más lejano (ΔE 2,8–4,4) sin ventaja sobre FLUX 3 ni Omni |

Evidencia (2026-11-02, mismos cuadros y prompts, pares ΔE / salto %):

| Toma | FLUX 3 | Omni | MiniMax H3 | Seedance 2.0 |
|---|---|---|---|---|
| Comedor | 3,4 / 3,9 | 2,3 / 1,9 | 2,4 / 2,4 | 2,8 / 2,9 |
| Recámara | 3,2 / 3,4 | 0,8 / 3,7 | 1,6 / 2,4 | 3,5 / 2,2 |
| Fachada | 1,4 / 1,8 | 2,9 / 1,9 | 2,3 / 2,0 | 3,0 / 2,1 |
| Herrería | 1,3 / **7,5** | 1,9 / 1,8 | 0,9 / 1,9 | 4,4 / 3,8 |

Higgsfield: `generate_video` con `start_image` (antes) y `end_image` (después), `duration 8`, `resolution 1080p`,
`aspect_ratio 9:16`, `generate_audio false`. Subida: `media_upload` → PUT con `If-None-Match: *` → `media_confirm`.
Omni: `--staging-uri` y `--gcs-output` en el bucket privado `gs://efeonce-group-greenhouse-private-assets-dev/…`,
`--max-usd 1.5` para 1080p/8 s, `--yes`, `--out`.

## 4. QA

- **Color:** ΔE (CIE76) del muro en el último cuadro contra el cuadro después, medido sobre la máscara del muro que
  dejó `ajustar-muro` (`<plate>.mascara.png`, recortada igual). Máximo 4. Sin máscara, `--zona x,y,w,h`.
- **Fluidez:** diferencia media entre cuadros consecutivos (gris 108 × 192, 24 fps); el salto más brusco no puede
  pasar del 5 % del cambio total. Detecta apariciones de golpe (FLUX 3 en herrería: 7,5 %, la reja y el muro de un
  cuadro a otro).
- **Lo que no mide:** muebles que entran semitransparentes (MiniMax, a veces Omni en el comedor), un círculo de pintura
  que crece de forma artificial o una mesa flotando. Eso se ve en la hoja de cuadros y en el clip.

## 5. Música y tapa

Envato Elements: el squad descarga las pistas con su licencia (confirmado por el operador el 2026-11-02). Una por mes
en `02_Recursos/11_Musica/Propuesta {n}_{MES}.mp3` (OCT, NOV, DIC), de 14,07 s: dura el reel completo. Admitidas en
`clients/berel/.resources-local/video/musica-<MES>.mp3`; la tapa en `video/tapa-cierre-9x16.mp4`. Mes nuevo = pista
nueva en `music.tracks` del contrato.

## 6. Pendientes

- Revisión de Berel (Daniela, Andrés o Melkin) de los reels piloto.
- El titular entra con fundido, no palabra a palabra como en el corpus.
- Si la exportación antigua a 750 × 1334 era decisión o límite (el reel nuevo sale a 1080 × 1920).
