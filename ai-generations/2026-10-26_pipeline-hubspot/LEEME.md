# Refresh «Pipeline de ventas en HubSpot» (post 246045) — imágenes

Artículo: [`docs/public-site/HUBSPOT_PIPELINE_REFRESH_DRAFT_V1.md`](../../docs/public-site/HUBSPOT_PIPELINE_REFRESH_DRAFT_V1.md).
Nada de esta carpeta está subido como portada, `hero` ni tarjeta: espera la aprobación de Julio.

## Interfaz de HubSpot (cuerpo del artículo)

- `hubspot-ui/`: siete SVG oficiales del Solutions Partner Hub (Brandfolder), sin modificar; procedencia y SHA en
  `hubspot-ui/provenance.json`. Acuerdo de uso aceptado el 2026-10-26 con el OK de Julio (Efeonce es Solutions Partner).
- `webp/` (no versionado): seis WebP de 1400 px exportados con sharp desde esos SVG. Subidos como adjuntos
  **252155–252160** (`tmp/pipeline-review/upload-media.php`, idempotente por `_eo_source_sha256`). Se usan en la copia
  privada 252161.

## Portada, `hero` y tarjeta (2026-10-26, sin subir)

- **Ficha:** `fichas/MCB-PIPE1-169.json` (línea `revenue-hubspot`, sin persona ni vidrio, fórmula nueva del
  2026-10-25). Fenómeno: tres umbrales bajos de metal negro en fila sobre una mesa negra, cada uno con una banda de luz
  azul en el umbral; bloques de aluminio grafito 4-3-2-1 en filas, y uno solo acaba de cruzar el último umbral bajo el
  único foco: sólo avanza lo que cumple el criterio de salida.
- **`cine-reviewer`: CORREGIR → APROBABLE.** Correcciones: sin magenta en la foto (el acento de la línea queda sólo en
  la esfera del texto; el color de la foto es el azul de la luz, como en Loop); cámara a 45° para que los umbrales no se
  anidaran en túnel; umbrales como marcos negros que proyectan la luz sobre la mesa (no neón ni portal); 4-3-2-1 en
  filas transversales con bloques de aluminio que no se lean como dados; tamaño en fracciones; momento declarado.
- **Una generación** (gpt-image-2.5-sunburst high, 2560 × 1440, ≈ USD 0,055): `plates/MCB-PIPE1-169.png`
  (sha256 `8dc62053…`). Conteo 4-3-2-1 y tres umbrales correctos, el azul como único color. `foto:validar:cine` sin
  fallas (sombra 93 %); `foto:validar` 4/4.
- **Medido en el lienzo de 1200:** el conjunto ocupa x ≈ 780–1000 (salió más grande de lo pedido, como en AEO y Loop);
  el bloque que cruzó en x ≈ 888 · y ≈ 185 de 675. En el recorte cuadrado (x 285–915) el texto entra entero y el
  conjunto queda a medias, lo que el manual admite.

### Textos (La órbita §4, delta 2026-10-25: frase en dos tiempos, sin par forzado)

| Candidato | `answerOverflowPx` | Estado |
|---|---|---|
| «○ Que tu pipeline en HubSpot / **no mienta**●» | 0 | **elegido por Julio el 2026-10-26** |
| «○ Que en tu pipeline avance / **sólo lo real**●» | 0 | candidato no elegido (`final/candidatos/descartes/portada-2.*`) |
| «○ Haz que tu pipeline / **diga la verdad**●» | 79 | descartado (desborda) |
| «○ Tu pipeline en HubSpot, / **sin negocios inflados**●» | 348 | descartado (desborda) |

Antes se descartaron «Tú decides», «Se califica» y «el comprador» sin componerlos: Julio los rechazó por absurdos
(remates de acertijo y jerga). Hoja de revisión: `final/candidatos/revision-textos.png`.

### Archivos listos (no versionados)

| Imagen | Archivo | Medidas | sha256 |
|---|---|---|---|
| 1 · Tarjeta del rail | `final/pipeline-de-ventas-hubspot-2026-card.webp` (58 KB): el plate entero; `--focus "91% 50%"` (fórmula del manual: se ve x 54–95 % en escritorio y x 62–94 % en el teléfono; el conjunto está en x 65–83 %) | 2560 × 1440 | `25a3c91d…` |
| 2 · Portada | `final/pipeline-de-ventas-hubspot-2026.jpg` (183 KB), texto «Que tu pipeline en HubSpot no mienta.»; recorte cuadrado en `-recorte-movil.png` | 2400 × 1260 | `a34b7e7c…` |
| 3 · Slider (`hero`) | `final/pipeline-de-ventas-hubspot-2026-hero.webp` (46 KB): el plate sin los 160 px de arriba; umbrales en x ≈ 66–82 %, a la derecha del título; la tarjeta «Siguiente» tapa el extremo derecho de la fila de abajo | 2400 × 1200 | `b4d7f5c8…` |

Simulación del rail (440 × 600 y 304 × 540) y del slider (escritorio con zonas y teléfono):
`final/revision-superficies.png`.

### Alt propuestos

- **Portada:** «Portada de Marketing con Manzanitas: tres umbrales de luz azul en fila sobre una mesa oscura; cuatro
  bloques esperan ante el primero, cada umbral deja pasar menos y sólo uno cruza el último bajo un foco, junto al
  texto «Que tu pipeline en HubSpot no mienta.»».
- **Tarjeta y `hero`:** «Tres umbrales de luz azul en fila sobre una mesa oscura: de cuatro bloques, cada umbral deja
  pasar menos y sólo uno cruza el último, bajo un foco.»

### Para subir (con OK de Julio y aviso a las sesiones del blog)

1. Portada: `blog-post-cover-apply.php` (simulación → apply), leyendo antes `expectedThumb`/`expectedOg` del post
   (hoy sin portada propia conocida: verificar). Avisar a la sesión de Analytics, que mantiene ese script.
2. `pnpm public-website:blog-home hero 246045 --image final/pipeline-de-ventas-hubspot-2026-hero.webp --alt "…"`
3. `pnpm public-website:blog-home card 246045 --image final/pipeline-de-ventas-hubspot-2026-card.webp --alt "…" --focus "91% 50%"`
   (sólo si el artículo publicado se lee en 12 minutos o más y entra al rail).
