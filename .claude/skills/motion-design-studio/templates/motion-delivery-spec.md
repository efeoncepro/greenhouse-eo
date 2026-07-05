# Motion Delivery Spec — [Nombre del proyecto]

> **Qué es esto.** La especificación técnica de entrega: cada master y versión con su formato exacto
> por destino. Regla dura: **el destino define el formato**, no al revés — un master broadcast no se
> sube a un feed vertical sin reencodear. Doctrina: `modules/08_COLOR_GRADE_FINISH.md`; adaptación por
> red social → `social-media-studio`.

## Encuadre

| Campo | Valor |
|---|---|
| Pieza | [nombre · tipo] |
| Master de origen | [resolución/codec del render maestro] |
| Estado | [en render · en QC · entregado] |

## Entregables por destino

| Destino | Resolución | Aspecto | FPS | Codec | Bitrate | Color space | Loudness |
|---|---|---|---|---|---|---|---|
| Web / hero | [1920×1080] | [16:9] | [24/25/30] | [H.264] | [10-16 Mbps] | [Rec.709] | [-14 LUFS] |
| Social — Instagram/TikTok | [1080×1920] | [9:16] | [30] | [H.264] | [10 Mbps] | [Rec.709] | [-14 LUFS] |
| Social — feed | [1080×1080] | [1:1] | [30] | [H.264] | [ ] | [Rec.709] | [-14 LUFS] |
| YouTube | [3840×2160] | [16:9] | [ ] | [H.265] | [ ] | [Rec.709 / P3] | [-14 LUFS] |
| Broadcast | [1920×1080] | [16:9] | [25/29.97] | [ProRes 422 HQ] | [—] | [Rec.709] | [-23 LUFS] |
| OOH / pantalla | [según pliego] | [ ] | [ ] | [ProRes / H.265] | [ ] | [Rec.709 / P3] | [n/a o según] |

> Confirma el pliego de cada destino antes de renderear. Codec: **H.264** (compatibilidad), **H.265**
> (4K eficiente), **ProRes** (broadcast/edición sin pérdida). Color: **Rec.709** default, **P3** solo
> si el destino lo soporta y el grade lo aprovecha.

## Versiones

| Versión | Idioma | Duración | Subtítulos | Safe-caption | Con/sin logo | Notas |
|---|---|---|---|---|---|---|
| Master | [es-CL] | [30s] | [quemados / off] | [n/a] | [con] | [ ] |
| Cutdown | [es-CL] | [15s] | [ ] | [sí] | [con] | [ ] |
| Bumper | [es-CL] | [6s] | [ ] | [sí] | [con] | [ ] |
| Doblaje | [en-US] | [30s] | [ ] | [ ] | [con] | [M&E de `sound-design-brief.md`] |

## Naming de archivos

- **Convención.** `[proyecto]_[version]_[aspecto]_[idioma]_[duración]_[fecha].[ext]`
- **Ejemplo.** `[grader-brandfilm_master_16x9_es-CL_30s_2026-07-05.mp4]`

## Upscale / finishing

- **Upscale.** [Magnific / `upscale_video` a 2K/4K · qué versiones lo requieren] · [n/a]
- **Grade final.** [LUT aplicada · corrección por toma resuelta en DaVinci] — `modules/08`
- **Grano / textura.** [film grain final aplicado sobre el grade, no antes]

## Checklist de pre-entrega

- [ ] Cada destino tiene su archivo con el formato exacto de la tabla (no un master reetiquetado)
- [ ] Loudness verificado por destino (-14 web / -23 broadcast) y true peak ≤ -1 dBTP
- [ ] Safe zones / captions no chocan con UI en verticales
- [ ] Subtítulos correctos y sincronizados en las versiones que los llevan
- [ ] Color space correcto por destino (no entregar P3 donde se espera Rec.709)
- [ ] Nombres de archivo siguen la convención
- [ ] Versiones de idioma con M&E / doblaje revisadas
- [ ] QC final mirado en el device de destino (no solo en el monitor de edición)
- [ ] Entrega/publicación pasa por confirmación humana (`SKILL.md` §4)
