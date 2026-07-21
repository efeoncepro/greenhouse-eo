# Motion Delivery Spec — Alta frecuencia

| Campo | Valor |
|---|---|
| Pieza | Sistema de campaña motion |
| Master de origen | Gemini Omni 720p/24 fps + composición determinista |
| Estado | Creative QC; publicación pendiente de aprobación humana |

## Entregables

| Versión | Resolución | Aspecto | FPS | Codec | Color | Audio |
|---|---:|---:|---:|---|---|---|
| Hero 15 s horizontal | 1920×1080 | 16:9 | 24 | H.264 High | Rec.709/YUV420p | AAC, −16,3 LUFS / −2,0 dBFS |
| Hero 15 s vertical | 1080×1920 | 9:16 | 24 | H.264 High | Rec.709/YUV420p | AAC, −16,4 LUFS / −2,2 dBFS |
| Master 10 s horizontal | 1280×720 | 16:9 | 24 | H.264 High | Rec.709/YUV420p | AAC, −20,4 LUFS / −1,0 dBFS |
| Master 10 s vertical | 720×1280 | 9:16 | 24 | H.264 High | Rec.709/YUV420p | AAC, −30,7 LUFS / −8,9 dBFS |
| Bumper 6 s horizontal | 1280×720 | 16:9 | 24 | H.264 High | Rec.709/YUV420p | AAC, −19,0 LUFS / −1,0 dBFS |
| Bumper 6 s vertical | 720×1280 | 9:16 | 24 | H.264 High | Rec.709/YUV420p | AAC, −30,6 LUFS / −10,0 dBFS |

Los hero de 15 s se escalan determinísticamente a raster de entrega 1080p; no se declara detalle
nativo 1080p ni upscale generativo. Broadcast, DOOH o inventario con pliego propio requiere render
dedicado, loudness del canal y validación del operador.

## Naming

`high-frequency-m01-brand-light-hero-{9x16|16x9}-15s-v1.mp4`

## Pre-entrega

- [x] Duración, aspecto, FPS, codec y raster verificados por `ffprobe`.
- [x] Copy, logo y URL provienen de stills oficiales.
- [x] Mensaje comprensible sin audio.
- [x] Loudness/peak medidos en los seis releases; los dos heroes pasan target −16 LUFS.
- [ ] Normalizar y volver a medir masters/bumpers si esas cuatro variantes se trafican como piezas finales.
- [ ] Escucha humana en audífonos y teléfono.
- [ ] Aprobación humana antes de publicar.
