# «Efeonce | BytePlus — Ahora somos partners»: anuncio en LinkedIn e Instagram (2026-10-20)

**Relación comercial que respalda el anuncio:** [registro de partnerships → BytePlus](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md).
Reglas de comunicación vigentes:
- decir sólo «partner»;
- nunca «alianza estratégica», «oficial» ni ByteDance como contraparte;
- nunca descuentos ni tarifas.

**Pieza hermana y receta de serie:** [anuncio Efeonce | Google](2026-10-19-google-partner-announcement-production-method.md).

**Serie:** segunda pieza. Orden vigente de publicación (actualizado el 2026-10-21):
1. [Google](2026-10-19-google-partner-announcement-production-method.md), 20-10.
2. BytePlus (esta pieza), 29-10.
3. [Adobe](2026-10-20-adobe-partner-announcement-production-method.md), 05-11.
4. [Claude](2026-10-21-claude-partner-announcement-production-method.md), 19-11.
5. [OpenAI](2026-10-20-openai-partner-announcement-production-method.md), 26-11.
6. [AWS](2026-10-21-aws-partner-announcement-production-method.md), 03-12.
7. [Microsoft](2026-10-21-microsoft-partner-announcement-production-method.md), 10-12.

## Estado

- **Programado y todavía sin publicar** para el **jueves 29-10-2026**. Metricool, `autoPublish`, zona `America/Santiago`.
  `PENDING` significa programado; la publicación se confirma releyendo los posts después de la hora.
- Archivos locales: `ai-generations/2026-10-20_byteplus-partner/` (los MP4 no están en git).
- Lienzo: https://claude.ai/artifact/ETWw3CfFq7QPCVLHq7GssH (artboard `BP-Feed`).

| Canal | Marca Metricool | Hora Chile | ID de post | Forma |
|---|---|---|---|---|
| LinkedIn página Efeonce | Efeonce Group `3961547` | 11:00 | `400995544` | video 4:5 con sonido y portada PNG; `previewIncluded=false` |
| LinkedIn personal de Julio | Julio Reyes `5105024` | 11:30 | `400995632` | el mismo video 4:5 con portada |
| Instagram `@efeoncepro` | Efeonce Group `3961547` | 14:00 | `400995580` | `REEL` 9:16, `showReelOnFeed=true`, `isAiGenerated=true`, portada PNG |
| Historia de Instagram `@efeoncepro` | Efeonce Group `3961547` | 14:30 | `402122763` | `STORY` con el mismo video 9:16 del Reel, sin texto (Metricool rechaza texto en historias autopublicadas); agregada el 21-10 |

### Por qué el jueves 29

El operador pidió el lunes 26 o el mejor día de esa semana. La curva de mejor hora de Metricool para la semana del 26 al 30
devolvió los mismos valores en las dos marcas, así que parece una curva general y no propia de cada cuenta.

**LinkedIn**, a las 11:00:

| Día | Valor |
|---|---|
| Lunes | 637 |
| Martes | 2.026 |
| Miércoles | 2.445 |
| Jueves | 2.790 |
| Viernes | 2.914 |

El viernes 30 y el martes 27 ya tenían un post de la página de Efeonce, y el miércoles 28 uno del perfil personal. Por
eso se eligió el jueves, el segundo mejor día. El post personal sale 30 minutos después del de la página, igual que en
la pieza de Google.

**Instagram** tiene una curva casi plana, entre 260 y 310. Se eligió el jueves a las 14:00, que vale 311 y es el pico de ese día.

## Concepto

Una campaña con aire de película: cuadros de cine generados con Seedream 5 Pro y clips de Seedance 2.0. Lockup «Efeonce
| BytePlus» con filete vertical, eyebrow «AHORA SOMOS PARTNERS» y la fila «Seedance · Seedream · ModelArk» en gris.

**Animación:**
1. Montaje en letterbox 2,39:1 de cuatro tomas: noir, thriller, faro y astronauta.
2. Alejamiento desde la pantalla de la astronauta hasta la escena final, con acabado GPT Image 2.5 Sunburst.
3. Flash y sacudida en el congelado.
4. Golpe del lockup.

Script: `ai-generations/2026-10-20_byteplus-partner/render-animacion.mjs`. Son 247 cuadros a 30 fps (8,23 s); el
impacto cae en 3,567 s y el lockup aterriza en 3,967 s.

## Sonido

El operador eligió la propuesta A: tráiler de cine híbrido más el sting de Efeonce. Se generó en ElevenCreative, en el flujo
`3ikshPyms8hI1FOIIzWo`: música (2 variaciones), BRAAM, golpe de corte y riser.

- **La música no respetó los tiempos del prompt.** Sus golpes cayeron en 4,8 s y 7,5 s, no en 3,5 s. Por eso la
  estructura se armó con los efectos sueltos:
  - colchón: `musica-a`, de 0 a 2,9 s;
  - golpes de corte en 0,6, 1,2 y 1,8 s;
  - `riser-b`, cuyo corte abrupto cae en el congelado;
  - `braam-a` en 3,567 s, con su nivel bajado después de 0,35 s;
  - el acorde de `musica-b` desde 7,18 s como cola;
  - el sting de Efeonce, cuyo pico (0,6 s dentro del archivo) cae al aterrizar el lockup.
- Las dos variaciones de música tenían `instrumental=false` en el nodo. En la mezcla no se detectó voz, pero no se
  verificó con transcripción.
- **Master:** -13,7 LUFS integrados y pico real de -1,5 dBFS. Archivo: `audio/mezcla-byteplus.wav`.
- **Trampa de ffmpeg:** con `-c:v copy`, `-shortest` recortaba el video a 8,10–8,13 s. Se montó sin `-shortest` porque el
  audio mide lo mismo que el video, y se verificaron los 247 cuadros.
- **MCP de ElevenLabs:** el local y el Player fallan porque su configuración tiene el ID de la clave, no la clave `sk_`.
  El conector remoto ElevenCreative sí funciona.

## Media pública

Bucket: `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-10-byteplus-partner/`. Se verificó HTTP 200 en
cada URL antes de programar:
- `efeonce-byteplus-partner-{linkedin-4x5,instagram-reel-9x16}-v1.mp4`
- `efeonce-byteplus-partner-{linkedin,instagram}-portada-v1.png`

Las portadas van **en PNG**, como pide la regla de formato. El PNG completo pesaba 3,3 MB, sobre el límite de 2 MB de
LinkedIn, así que se pasó a paleta de 256 colores con dithering (522 KB y 746 KB). Al 100 % no se ven bandas.

## Copies

Son los aprobados el 2026-10-20, después de la ronda de comentarios del operador:
- se quitó «este video lo hicimos con sus modelos»;
- el llamado es «¿Tu próxima campaña necesita más punch e impacto visual? Conversemos.»;
- el dato es Adobe: 71 % de más de 1.600 marketers;
- Seedance aparece como «uno de los modelos de video más potentes del mundo según los rankings independientes».

Menciones de LinkedIn: `@[urn:li:organization:67509143|BytePlus]` y, en el perfil personal, también
`@[urn:li:organization:20503593|Efeonce]`. En Instagram, BytePlus va nombrado sin @. Cloris y Ben van como texto,
porque no hay URLs de perfil.

## Pendientes de verificación

- [ ] Después de las 14:00 del 29-10-2026, releer los tres posts por ID y confirmar `PUBLISHED` con `publicUrl`.
- [ ] Comprobar en LinkedIn que la mención a BytePlus quedó enlazada a su página.
- [ ] Comprobar que la portada quedó aplicada y que el recorte 3:4 de la grilla de Instagram no corta el lockup.
