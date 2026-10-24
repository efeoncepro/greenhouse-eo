# «Efeonce | Google — Oficialmente partners» — anuncio en LinkedIn e Instagram — 2026-10-19

**Relación comercial que respalda el anuncio:** [registro de partnerships → Google Cloud](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md#google-cloud).
**Receta reutilizable de programación:** [entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md)
(receta del 2026-10-19 y sección de menciones). Esta bitácora conserva la evidencia del caso; el método reutilizable
vive en la skill.

**Serie:** primera pieza. Orden vigente de publicación (actualizado el 2026-10-21):
1. Google (esta pieza), 20-10.
2. [BytePlus](2026-10-20-byteplus-partner-announcement-production-method.md), 29-10.
3. [Adobe](2026-10-20-adobe-partner-announcement-production-method.md), 05-11.
4. [Claude](2026-10-21-claude-partner-announcement-production-method.md), 19-11.
5. [OpenAI](2026-10-20-openai-partner-announcement-production-method.md), 26-11.
6. [AWS](2026-10-21-aws-partner-announcement-production-method.md), 03-12.
7. [Microsoft](2026-10-21-microsoft-partner-announcement-production-method.md), 10-12.

## Estado

- **Programado, todavía sin publicar**, para el **martes 20-10-2026** en Metricool (`autoPublish`, zona
  `America/Santiago`). `PENDING` significa programado; la publicación efectiva y el enlace de las menciones se
  confirman con un readback posterior a la hora.
- Pieza y archivos locales: `ai-generations/2026-10-19_google-partner-freeze/` (ver su `LEEME.md`).
- Lienzo de la pieza: https://claude.ai/artifact/ETWw3CfFq7QPCVLHq7GssH

| Canal | Marca Metricool | Hora Chile | ID de post | Forma |
|---|---|---|---|---|
| LinkedIn página Efeonce (`urn:li:organization:20503593`) | Efeonce Group `3961547` | 11:00 | `400571153` | video 4:5 1080×1350 + portada propia; `linkedinData.previewIncluded=false` |
| Instagram `@efeoncepro` | Efeonce Group `3961547` | 11:00 | `400571274` | `REEL` 9:16 1080×1920, `showReelOnFeed=true`, `isAiGenerated=true`, portada propia |
| LinkedIn personal de Julio | Julio Reyes `5105024` | 11:30 | `400580359` | mismo video 4:5 + portada; 30 min después del post de Efeonce |

## Concepto final

Lockup **«Efeonce | Google»** con los logos completos en blanco, eyebrow **«OFICIALMENTE PARTNERS»** y, bajo el lockup,
la fila de productos en gris. Fondo de cine con íconos de Google en profundidad, acabado con GPT Image 2.5 (Sunburst).
Animación: los íconos vuelan hacia la cámara y se congelan.

Se usaron **logos nominativos**. **No se usó ninguna insignia del programa** de Google Cloud, porque no hay autorización
registrada (ver el registro de partnerships).

## Rondas de exploración

Razones del operador (2026-10-19), ronda por ronda. Las rondas 1 y 2 vivieron sólo en el lienzo (sin carpeta).

| Ronda | Carpeta / archivos | Qué era | Resultado |
|---|---|---|---|
| 1 | lienzo (`Main`, `A-Story`) | Órbita de La órbita en trazo fino + par pregunta/respuesta «¿Quién lleva Google a mi empresa? / Nosotros» | Rechazada: «le falta muchísimo punch»; el par Q/A, «absurdo»; y la alianza es con Google, no sólo Google Cloud |
| 2 | lienzo (`B-Feed`, `B-Story`) | La misma idea con la «G» de Google en la órbita y estela congelada más marcada | Rechazada: «no lo tiene» (sin punch) |
| 3a | `v1-gpt-image-2/`, `impacto-3d.png` | Esferas en los colores de Google chocando con una esfera teal, salpicaduras congeladas | En evaluación; luego reemplazada por r4 |
| 3b | `objetos-suspendidos.png`, `objetos-gigi-*.png`, `inpaint/` | Explosión de objetos de oficina con Gigi saliendo de la laptop; después, contenido en las pantallas | Descartada: estética de banco de imágenes, Gigi es mascota de campaña de consumo (estudiantes) y Efeonce no aparece en la imagen; el contenido de pantallas, «quedó horrible, quítaselo» |
| 3c | lienzo (`R3-Tipografico`) | «Efeonce × Google» tipográfico con barrido de colores | Descartada: la palabra «Google» en Bricolage imita el logo; la «×» se lee como colaboración tipo drop |
| r4 | `r4-impacto-premium/` | Versión «premium» y minimalista del impacto de esferas | Rechazada: «parecen globos de pintura» |
| r5 | `r5-cine/` | Idea del operador: íconos del partner en profundidad, muy cine, y en el centro Efeonce \| Google | **Aprobada**, con acabado Sunburst, logos en blanco, énfasis en Gemini y Cloud y productos bajo el lockup |

## Pipeline de producción

1. **Fondo de cine** sin texto ni íconos (`r5-cine/fondo*-4x5.png`, `fondo*-9x16.png`), con el centro despejado para
   el título.
2. **Íconos compuestos** sobre el fondo (`escena*-feed.png`, `escena*-story.png`), sin dejar que el modelo los dibuje.
3. **Acabado** con GPT Image 2.5: el prompt (`r5-cine/acabado.txt`) conserva la silueta, símbolo, color, rotación,
   tamaño y posición de cada ícono y sólo agrega luz y comportamiento de lente (`acabado*-feed.png`,
   `acabado*-story.png`).
4. **Tipografía, logos y animación** (vuelo y congelamiento de los íconos) en el lienzo de la pieza.

## Export

En `ai-generations/2026-10-19_google-partner-freeze/export/` (medido con `ffprobe` y `sips`):

| Archivo | Medida |
|---|---|
| `efeonce-google-feed-4x5.mp4` | 1080×1350, H.264, 30 fps, 9,3 s, sin pista de audio |
| `efeonce-google-story-9x16.mp4` | 1080×1920, H.264, 30 fps, 9,3 s, sin pista de audio |
| `efeonce-google-feed-4x5.png` · `efeonce-google-story-9x16.png` | cuadro fijo, 1080×1350 y 1080×1920 |
| `portada-linkedin-4x5.jpg` | 1080×1350, 300 KB |
| `portada-instagram-reel-9x16.jpg` | 1080×1920, 390 KB |

Los MP4 están en `.gitignore` (`/ai-generations/**/*.mp4`); el `LEEME.md` sí se versiona.

## Portadas

Especificaciones investigadas el 2026-10-19 en guías de terceros. **Ni Meta ni LinkedIn las confirmaron
oficialmente**, y las guías no coinciden en las zonas seguras exactas: el diseño se hizo conservador, con todo lo
importante al centro.

- **Reel de Instagram:** portada 1080×1920. La grilla del perfil la recorta a 3:4 (1080×1440, 240 px menos arriba y
  abajo) y el feed la muestra en 4:5. Contenido clave centrado.
- **Video de LinkedIn:** video 4:5 1080×1350 con portada propia **de la misma proporción**, JPG o PNG de menos de 2 MB.

Fuentes: [Hopper HQ](https://hopperhq.com/blog/instagram-reel-size/) ·
[Oktopost](https://oktopost.com/blog/instagram-grid-size-guide/) ·
[Postfast](https://postfa.st/blog/instagram-reel-cover-size-safe-zones) ·
[Brandwatch](https://brandwatch.com/blog/linkedin-video-specs/) ·
[Postiz](https://postiz.com/blog/linkedin-post-dimensions).

**Desvío respecto de la regla de formato:** las portadas se exportaron y se subieron en **JPG**. La skill
`social-media-studio` exige PNG para imágenes sociales y admite JPG sólo ante un rechazo observado; no hay rechazo
registrado, y el PNG de 4:5 (1,29 MB) cabía bajo el límite de 2 MB de LinkedIn. En la próxima pieza, subir la portada
en PNG.

## Publicación

1. **Media pública.** Subida a `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-10-google-partner/`
   con nombres versionados `efeonce-google-partner-{linkedin-4x5,linkedin-portada,instagram-reel-9x16,instagram-portada}-v1.{mp4,jpg}`.
   HTTP 200 verificado en cada URL antes de programar. La sesión de `gcloud` estaba vencida y
   `pnpm gcloud:auth:playwright -- --force` lo resolvió.
2. **Un post por red.** El MP4 va en `media` y la portada en `videoThumbnailUrl`. Instagram: `REEL` con
   `showReelOnFeed=true` e `isAiGenerated=true`. LinkedIn: `previewIncluded=false`.
3. **Menciones en LinkedIn** con el formato `@[urn:li:organization:ID|Nombre]`, que Metricool documenta para la
   programación por CSV y que aquí se usó por API. IDs tomados del HTML público de LinkedIn; el nombre distingue
   mayúsculas:

   | Página | ID |
   |---|---|
   | Efeonce | `20503593` |
   | Google | `1441` |
   | Google Cloud | `3648281` |
   | Ingram Micro (página global; no existe página de Ingram Micro Chile) | `2576` |

   Fuente: [Metricool — mencionar y etiquetar otras cuentas](https://help.metricool.com/en/article/mention-and-tag-other-accounts-tl3osr).
   El post personal de Julio menciona `@[urn:li:organization:20503593|Efeonce]` (dos veces),
   `@[urn:li:organization:1441|Google]`, `@[urn:li:organization:3648281|Google Cloud]` y
   `@[urn:li:organization:2576|Ingram Micro]`.
4. **Menciones en Instagram** en el texto: `@google` y `@googlecloud` (cuentas oficiales conocidas). `@ingrammicro`
   **no se pudo verificar** (Instagram bloquea las consultas automáticas) y el operador decidió usarlo igual.

### Copies

- **LinkedIn Efeonce** abre con «Hoy lo hacemos oficial: Efeonce es partner de Google.», dice «Desde ahora
  comercializamos e implementamos en Chile las soluciones de Google para empresas: Gemini Enterprise, Google Cloud y
  Google Workspace.» y agradece al equipo de Google y de Google Cloud por el acompañamiento, y a Ingram Micro por
  hacerlo posible. Hashtags: #GooglePartner #GeminiEnterprise #GoogleCloud #GoogleWorkspace #InteligenciaArtificial
  #TransformaciónDigital.
- **Instagram** abre con «Es oficial: ahora somos partner de Google.», nombra las mismas soluciones, agradece con
  @google @googlecloud @ingrammicro y cierra con «¿Conversamos? Escríbenos por DM o en efeoncepro.com».
- **Advertencia registrada:** el registro de partnerships deja Gemini Enterprise «sujeto al catálogo comercial
  Ingram». El operador decidió mantener «comercializamos e implementamos».

## Pendientes de verificación

- [ ] Después de las 11:30 del 20-10-2026, releer los tres posts por ID: `PUBLISHED` con `publicUrl`, no `PENDING`.
- [ ] Comprobar en LinkedIn (página y perfil de Julio) que las cuatro menciones quedaron enlazadas a las páginas
      correctas. La sintaxis se aceptó por API, pero el resultado real no está verificado.
- [ ] Comprobar en Instagram que `@ingrammicro` es la cuenta correcta.
- [ ] Comprobar que la portada de cada red quedó aplicada y que el recorte 3:4 de la grilla de Instagram no corta el
      lockup.
- [x] Claim «partner de Google» frente al gate del registro: resuelto el 2026-10-20. El operador declara que Efeonce
      es partner completo de Google (no `Registrado`) y el gate quedó levantado en el registro de partnerships.
