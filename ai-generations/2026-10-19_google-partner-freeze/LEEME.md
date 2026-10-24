# Efeonce | Google — Oficialmente partners (2026-10-19)

Carpeta de producción del anuncio de partnership con Google: video y portadas para LinkedIn (4:5) e Instagram (Reel 9:16),
programados en Metricool para el 20-10-2026.

- **Lienzo de la pieza:** https://claude.ai/artifact/ETWw3CfFq7QPCVLHq7GssH
- **Método, publicación y pendientes:** [`docs/operations/social/2026-10-19-google-partner-announcement-production-method.md`](../../docs/operations/social/2026-10-19-google-partner-announcement-production-method.md)

## Qué está aprobado

Sólo `export/` contiene la pieza aprobada y entregada:

| Archivo | Uso |
|---|---|
| `efeonce-google-feed-4x5.mp4` | video de LinkedIn (página Efeonce y perfil de Julio), 1080×1350 |
| `efeonce-google-story-9x16.mp4` | Reel de Instagram, 1080×1920 |
| `efeonce-google-feed-4x5.png` · `efeonce-google-story-9x16.png` | cuadro fijo de cada formato |
| `portada-linkedin-4x5.jpg` · `portada-instagram-reel-9x16.jpg` | portadas propias de cada red |

Las copias publicadas viven en `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-10-google-partner/` con
nombres `efeonce-google-partner-…-v1`.

## Qué es exploración

| Ubicación | Contenido |
|---|---|
| `v1-gpt-image-2/` y archivos sueltos de la raíz (`impacto-3d.png`, `objetos-*.png`, `acabado-gigi.txt`, `pantallas.txt`, `mask-pantallas.png`, `inpaint/`, `batch.json`) | primera ronda: impacto de esferas en alta velocidad y variante con la mascota Gigi saliendo de pantallas. Descartada |
| `r4-impacto-premium/` | versión premium del impacto de esferas en 4:5 y 9:16. Descartada |
| `r5-cine/` | fondos de cine, íconos compuestos y acabado con GPT Image 2.5: es la base de la pieza aprobada, pero sus archivos son intermedios, no entregables |

## Versionado

Los MP4 están en `.gitignore` (`/ai-generations/**/*.mp4`): no viajan con el repo. Este `LEEME.md` sí se versiona.
