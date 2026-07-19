# Sound Design Brief — Alta frecuencia · hero 15 s

| Campo | Valor |
|---|---|
| Destino | Web/social con sonido ON, pero mensaje comprensible en mute |
| Basado en | `motion-15s-animatic-shotlist.md` + `motion-15s-edl.md` |
| Estado | Mezcla técnica; escucha humana final pendiente |

## Dirección

- **Paleta:** ambience electrónico-orgánico del clean master; sin VO y sin música externa.
- **Continuidad:** dos pasadas del audio nativo unidas con `acrossfade` para cubrir 15 s.
- **Hit points:** los cortes visuales funcionan sin depender de SFX añadidos; no se inventan impactos
  que no estén respaldados por la física del material.
- **Cierre:** fade progresivo desde 13,8 s para dejar respirar la URL.
- **Licencia:** audio generado dentro del output Omni de esta campaña; sin track de terceros.

## Mezcla

- Target operativo: **−16 LUFS integrado** para el master social/web compartido.
- True peak: **≤ −1 dBTP**.
- Codec de entrega: AAC 48 kHz, 192 kbps.
- Sin VO; no requiere ducking ni subtítulos.
- El mensaje completo vive también en imagen: apto para autoplay mute.

## Gate pendiente

- [ ] Escucha humana con audífonos.
- [ ] Escucha humana en parlante de teléfono.
- [x] Loudness medido: 16:9 `−16,3 LUFS`; 9:16 `−16,4 LUFS`.
- [x] True peak medido: 16:9 `−2,0 dBFS`; 9:16 `−2,2 dBFS`.
- [ ] Confirmar auditivamente que el crossfade no se perciba como loop.

## Medicion de la familia completa

Medicion local con FFmpeg `ebur128=peak=true`, redondeada a 0,1. Sólo los heroes se normalizaron al
target compartido; masters y bumpers conservan la mezcla de referencia y no se declaran channel-ready.

| Variante | Aspecto | Integrated | Peak | Politica |
|---|---:|---:|---:|---|
| Hero 15 s | 16:9 | −16,3 LUFS | −2,0 dBFS | target −16 LUFS, PASS |
| Hero 15 s | 9:16 | −16,4 LUFS | −2,2 dBFS | target −16 LUFS, PASS |
| Master 10 s | 16:9 | −20,4 LUFS | −1,0 dBFS | measurement-only; normalizar si se trafica |
| Master 10 s | 9:16 | −30,7 LUFS | −8,9 dBFS | measurement-only; normalizar si se trafica |
| Bumper 6 s | 16:9 | −19,0 LUFS | −1,0 dBFS | measurement-only; normalizar si se trafica |
| Bumper 6 s | 9:16 | −30,6 LUFS | −10,0 dBFS | measurement-only; normalizar si se trafica |
