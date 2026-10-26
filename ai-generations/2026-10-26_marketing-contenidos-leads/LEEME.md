# Refresh «Marketing de contenidos para generar leads» (post 244883) — imágenes

Artículo: [`docs/public-site/CONTENT_MARKETING_LEADS_REFRESH_DRAFT_V1.md`](../../docs/public-site/CONTENT_MARKETING_LEADS_REFRESH_DRAFT_V1.md).
Estado al 2026-10-26: **portada, `hero` y tarjeta listas, sin subir**; Julio aprobó el texto de la portada. **Infografía 1 lista, sin subir.**

## Portada, `hero` y tarjeta

- **Ficha:** `fichas/MCB-CML1-169.json` (línea `brand`, registro cine, sin persona; nació con
  `pnpm foto:cine:nueva --desde MCB-AEO1-169`). Fenómeno: un cubo blanco de 5 cm sobre una mesa oscura, iluminado por
  **tres focos** que dejan tres sombras distintas desde la misma base (una larga y baja hacia la derecha, una alta y
  angosta hacia el fondo, una cuadrada hacia la cámara): una misma pieza, cada canal con su forma. Cámara a 45°, ≈ 4 m,
  85 mm f/4; el único color es el borde azul de la luz.
- **Concepto:** Julio aprobó «las sombras» y después el cambio a tres focos («Ok»): el primer planteamiento con un solo
  foco era físicamente imposible (un foco no da tres sombras), lo marcó el `cine-reviewer`.
- **`cine-reviewer` sobre la ficha: CORREGIR → APROBABLE.** La última corrección neutralizó las frases heredadas de la
  receta base («single hard source», «only key light», «NO front light») que contradecían los tres focos.
- **Una generación** (`foto:generar --quality high --size 2560x1440`): `plates/MCB-CML1-169.png` (sha256 `c682ae79…`).
  `foto:validar:cine` sin fallas (sombra 94 %); `foto:validar` 4/4.
- **Medido en el lienzo de 1200 × 675:** cubo en x ≈ 838–900 · y ≈ 355–415; la sombra derecha llega a x ≈ 1110 (fuera
  del recorte cuadrado x 285–915, que el manual admite); canto lejano de la mesa horizontal en y ≈ 262.

### Textos (La órbita §4, delta 2026-10-25: frase en dos tiempos, sin par forzado)

| Candidato | `answerOverflowPx` | Estado |
|---|---|---|
| «○ Una idea fuerte llega a / **cada canal**●» | 0 | **aprobado por Julio el 2026-10-26** (`final/candidatos/portada-4.*`) |
| «○ Una pieza suelta no genera leads. / **El sistema, sí**●» | 29 | descartado (desborda) |
| «○ Una pieza suelta no genera leads. / **El sistema sí**●» | 15 | descartado (desborda) |
| «○ Una idea, / **cada formato**●» | 70 | descartado (desborda y es jerga del artículo) |

Hoja de revisión: `final/candidatos/revision-textos.png`. Nunca se achica el texto para que entre: se reescribe.

### Archivos listos (no versionados)

| Imagen | Archivo | Medidas | sha256 |
|---|---|---|---|
| 1 · Tarjeta del rail | `final/marketing-de-contenidos-leads-2026-card.webp` (50 KB): el plate sin los 560 px de arriba; `--focus "85% 50%"` (el cubo y sus sombras quedan arriba de la tarjeta en escritorio 440 × 600 y en el teléfono 304 × 540) | 2560 × 880 | `f9d7bc75…` |
| 2 · Portada | `final/marketing-de-contenidos-leads-2026.jpg` (171 KB), sin firma (Manzanitas §5.6); recorte cuadrado en `-recorte-movil.png` | 2400 × 1260 | `92aff117…` |
| 3 · Slider (`hero`) | `final/marketing-de-contenidos-leads-2026-hero.webp` (48 KB): el plate sin los 160 px de arriba; el cubo cae a la derecha del título y sobre la tarjeta «Siguiente», sin taparse | 2400 × 1200 | `ebae4201…` |

Simulación del rail y del slider con sus zonas: `final/revision-superficies.png`.

### Alt propuestos

- **Portada:** «Portada de Marketing con Manzanitas: un cubo blanco sobre una mesa oscura, iluminado por tres focos que
  le dan tres sombras distintas, junto al texto «Una idea fuerte llega a cada canal.»».
- **Tarjeta y `hero`:** «Un cubo blanco sobre una mesa oscura, iluminado por tres focos: la misma pieza proyecta tres
  sombras distintas.»

### Para subir (con OK de Julio y aviso a las sesiones del blog)

1. Portada: `blog-post-cover-apply.php` sin modificar (simulación → apply), leyendo antes `expectedThumb`/`expectedOg`
   del post. Avisar a la sesión de Analytics, que mantiene ese script.
2. `pnpm public-website:blog-home hero 244883 --image final/marketing-de-contenidos-leads-2026-hero.webp --alt "…"`
3. `pnpm public-website:blog-home card 244883 --image final/marketing-de-contenidos-leads-2026-card.webp --alt "…" --focus "85% 50%"`
   (sólo si el artículo publicado se lee en 12 minutos o más y entra al rail).

## Infografía 1 — «Una idea, cada formato»

- **Carpeta:** `infografia/` con el mismo método que las del ICP (`2026-10-25_icp-infografias`): `build.mjs` toma los
  valores de La órbita de `@efeoncepro/axis-tokens`, la órbita de `orbitSvg` y los íconos de `resolveIcon`, en la línea
  `brand` (la de la portada). `source/` lleva texto vivo; `delivery/` lleva el texto contorneado y es lo que se sube.
  `node build.mjs && node preview.mjs` la rehace y deja los PNG de revisión en `review/` (no versionados).
- **Contenido:** la idea al centro («Una pieza suelta compite sola.», el ejemplo del paso 2 del artículo), marcada con
  la órbita alrededor de un cubo (el de la portada). Salen cinco formatos, cada uno con su trabajo y su canal: artículo,
  carrusel, newsletter, video corto y respuesta en la IA. Cierra con «La idea es el activo; **cada formato la lleva a
  otro lugar.**», la frase en negrita del artículo. Fuente: «Esquema ilustrativo · Marco editorial Efeonce».
- **Íconos:** todos en la voz Trazo (`contenido`, `swipe`, `correo`, `multimedia`, `ia`); `auditIconGroup` pasa sin
  avisos. Plastilina quedó fuera porque no se mezcla con el Trazo en un mismo grupo.
- **Comprobaciones del build (`build-report.json`):** cero textos fuera del lienzo o sobre el pie, cero textos que
  crucen la órbita y cero textos encimados, en las cuatro versiones.
- **Archivos:** escritorio 1600 × 1000 y teléfono 900 × 2150, cada una en claro y oscuro (≈ 195 KB y ≈ 178 KB).
  Alt, leyenda y ubicación en `infografia/media-meta.json`.
