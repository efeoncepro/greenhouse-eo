# «Efeonce | Adobe — Ahora somos partners»: anuncio en LinkedIn e Instagram (2026-10-20)

**Relación comercial que respalda el anuncio:** [registro de partnerships → Adobe](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md).
Estado al producir la pieza:
- Adobe Partner Connection Reseller Program, **Registered** (AM17480390);
- el upgrade a Certified está en revisión;
- el alta y el crédito con Nexsys están pendientes.

Por eso el copy dice «sumamos las soluciones de Adobe a nuestra oferta» y no «comercializamos». Si el día del
lanzamiento ya están aprobados el Certified y Nexsys, se puede subir a «comercializamos e implementamos».

**Serie:** tercera pieza. Orden vigente de publicación (actualizado el 2026-10-21):
1. [Google](2026-10-19-google-partner-announcement-production-method.md), 20-10.
2. [BytePlus](2026-10-20-byteplus-partner-announcement-production-method.md), 29-10.
3. Adobe (esta pieza), 05-11.
4. [Claude](2026-10-21-claude-partner-announcement-production-method.md), 19-11.
5. [OpenAI](2026-10-20-openai-partner-announcement-production-method.md), 26-11.
6. [AWS](2026-10-21-aws-partner-announcement-production-method.md), 03-12.
7. [Microsoft](2026-10-21-microsoft-partner-announcement-production-method.md), 10-12.

## Estado

- **Programado y todavía sin publicar** para el **jueves 05-11-2026**. Metricool, `autoPublish`, zona `America/Santiago`.
  Ese día no había otros posts en las dos marcas.
- Archivos locales: `ai-generations/2026-10-21_adobe-partner/` (los MP4 no están en git).
- Lienzo: https://claude.ai/artifact/ETWw3CfFq7QPCVLHq7GssH (artboard `AD-Feed`, fila «Efeonce | Adobe»).

| Canal | Marca Metricool | Hora Chile | ID de post | Forma |
|---|---|---|---|---|
| LinkedIn página Efeonce | Efeonce Group `3961547` | 11:00 | `401567944` | video 4:5 con sonido y portada PNG; `previewIncluded=false` |
| LinkedIn personal de Julio | Julio Reyes `5105024` | 11:30 | `401567971` | el mismo video 4:5 con portada |
| Instagram `@efeoncepro` | Efeonce Group `3961547` | 14:00 | `401568010` | `REEL` 9:16, `showReelOnFeed=true`, `isAiGenerated=true`, portada PNG |

## Concepto y decisiones del operador

**Concepto: «Capas que se arman».** Una pieza de campaña se separa en cinco láminas de vidrio en profundidad, dentro
de un estallido de pintura roja y cobalto congelado:
1. Pintura: óleo con impasto.
2. Vector: afiche estilo suizo.
3. Foto: una bailarina en pleno salto.
4. Tipografía: el titular «EN MOVIMIENTO».
5. Selección: un cuadro con tiradores.

Cada capa representa un oficio distinto. El operador pidió «muchísimo punch, impacto visual y arte».

**Lockup.** Va **«Efeonce | Adobe»** con el logotipo completo de Adobe (la «A» con la palabra), en blanco y equilibrado
ópticamente: 351 × 78 px junto a Efeonce en 392 × 92 px.
- El badge oficial «Adobe Registered Reseller» se probó y el operador lo descartó: *«quita eso de registered reseller,
  pon efeonce | adobe igual que las demás»*.
- La guía del programa (Program Guide LAM v10.1) otorga explícitamente el badge de cada nivel, no el logo corporativo.
  Usar el logo corporativo fue decisión del operador, igual que con Google.
- Fuente del logo: `public/images/logos/partners/adobe-logotype.svg`, con el relleno cambiado a blanco.

**Productos.** Firefly, Creative Cloud, Express y Acrobat, cada uno con su ícono oficial en gris `#b4c6da`; el glifo
blanco interior se pasa a transparente. El ícono de Firefly es el **«Fi»**, por comentario del operador en el lienzo.
Fuentes de los íconos:
- Firefly: `Adobe_Firefly_Logo.svg.png`, de OneDrive (`04. Logos & Partnership/02. Herramientas/Diseño`).
- Creative Cloud: el SVG de la misma carpeta.
- Express: el isotipo de `public/images/logos/axis/`.
- Acrobat: bajado de Wikimedia Commons (`Adobe_Acrobat_DC_logo_2020.svg`).

**Fondo de la serie.** El operador preguntó si todas las piezas debían tener el mismo fondo. La recomendación aceptada:
- se mantiene la estructura: navy, horizonte de luz, bloque del lockup y fila de productos;
- la luz toma el color del partner.

En Adobe, el horizonte entra rojo por la izquierda, queda blanco al centro y sale cobalto por la derecha. Es un tinte
determinístico (`comp/tinte.js`) aplicado sobre el acabado, que no toca la zona del lockup: el brillo medio del fondo del
lockup pasó de 70/58/84 a 72/58/82.

## Pipeline

1. **Capas generadas con GPT Image 2.5 Sunburst:**
   - fondo navy;
   - pintura;
   - vector, sobre fondo transparente;
   - bailarina, sobre fondo transparente;
   - estallido de pintura, sobre fondo transparente.

   Archivos en `capas/`.
2. **Escena 3D en HTML y CSS** (`comp/escena.html`): perspectiva y `translateZ` por capa, renderizada con Playwright.
3. **Acabado con Sunburst** (`comp/acabado.txt`): bordes de vidrio, luz volumétrica, profundidad de campo y grano, sin
   mover ni re-escribir nada. El texto quedó letra por letra, verificado al 100 %.
   - El 4:5 se padeó a 2:3 con bandas en espejo arriba y abajo.
   - El 9:16 se padeó a 2:3 con bandas en espejo a los lados.
4. **Tinte del horizonte y lockup HTML encima** (`comp/final-tinte.html` y `comp/final-story.html`).

**Trampa de sharp:** en una misma cadena, `resize` se ejecuta **antes** que `composite`, así que
`composite(...).resize(...)` falla con «Image to composite must have same dimensions or smaller». Hay que componer a un
buffer y redimensionar después.

## Animación (`comp/anim2.js`, 9,5 s, 285 cuadros a 30 fps)

El operador pidió que fuera más lenta y que la pieza, después de componerse, se separara y volviera a su lugar.

| Tiempo | Qué pasa |
|---|---|
| 0,5–3,0 s | Las capas entran volando, una cada 0,45 s, y se juntan en una pieza casi plana y de frente |
| 3,0–3,6 s | La pieza compuesta respira, con un empuje leve de cámara |
| 3,6 s | Se separa: las capas llegan a 1,6 veces la separación final mientras gira la cámara y crece el estallido; aparecen las etiquetas |
| 4,2–4,7 s | Vuelve a su lugar |
| 4,7 s | Congelado con flash y sacudida; bajo el flash, fundido al fijo con acabado |
| 4,9 s | Golpe del lockup, después el eyebrow y la fila de productos |

El último cuadro coincide con el fijo: diferencia media de 0,60 en el 4:5 y de 0,41 en el 9:16.

**Trampa:** al armar la página de animación desde la escena, quedaron duplicados los ids del lockup viejo (`eb`, `lk`,
`row`). `getElementById` animaba los elementos ocultos y el lockup nunca aparecía. Siempre comprobar que cada id
aparezca una sola vez.

## Sonido

El operador aprobó la propuesta **«construcción táctil, silencio y drop»**, pensada para distinguirse del tráiler con
bronces de BytePlus. Se generó en ElevenCreative, en el flujo `eDM3gqNgLjSn0yucTZvz`, con 8 nodos de 2 variaciones cada
uno.

| Tiempo | Sonido |
|---|---|
| 0–1,25 s | Whoosh de entrada (`succion-b`), para que el video no arranque mudo |
| 1,20 · 1,65 · 2,10 · 2,55 · 3,00 s | Golpe táctil (`golpe-b`, ataque en 0,83 s) y una nota (`pluck-b`) transpuesta 0, 2, 4, 7 y 12 semitonos con `asetrate` |
| desde 1,14 s | Colchón `musica-b`, cuyo pulso salió a ~133 BPM: sus negras quedan alineadas con cada llegada |
| 3,0–3,6 s | Casi silencio |
| 3,6 s | `drop-b` y salpicadura `splash-a` |
| 3,92 s | `succion-a`, que corta seco en el congelado |
| 4,7 s | `congelado-b` y cola de `musica-a` desde su segundo 3,8 |
| 4,62 s | Sting de Efeonce, con su pico al aterrizar el lockup |

**Master:** -13,7 LUFS y pico real de -1,4 dBFS (`audio/mezcla-adobe-v2.wav`).

**Duraciones:** ElevenLabs no respetó varias de las duraciones pedidas; por ejemplo, el acorde de 6 s salió de 1 s. Por
eso cada pista se mide con su envolvente antes de usarla.

## Media pública y portadas

Bucket: `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-11-adobe-partner/`. Se verificó HTTP 200 en cada
URL antes de programar:
- `efeonce-adobe-partner-{linkedin-4x5,instagram-reel-9x16}-v1.mp4`
- `efeonce-adobe-partner-{linkedin,instagram}-portada-v1.png`

Las portadas son PNG en paleta de 256 colores (573 KB y 717 KB). En el recorte 3:4 de la grilla de Instagram el lockup
se ve completo. Las portadas guardadas por Metricool responden 200 con su medida.

## Copies

- **LinkedIn de Efeonce:** abre con «Hoy sumamos a la marca que define cómo se crea en el mundo: Efeonce es partner de
  Adobe.», describe los cuatro productos y cierra con «La tecnología acelera. El oficio decide cada capa.».
- **Instagram:** versión corta, con @adobe.
- **LinkedIn personal:** abre con «Producir nunca fue tan fácil. Que se vea como tu marca nunca fue tan difícil.».
- **Mención en LinkedIn:** `@[urn:li:organization:1480|Adobe]`, con el ID verificado en el HTML público de
  `linkedin.com/company/adobe`.
- **Agradecimientos:** no se nombró a Nexsys porque el alta sigue en proceso.
- **Respaldo de «trabaja con Adobe todos los días»:** proyectos de After Effects y Premiere en OneDrive, y egresos de
  Adobe en Finanzas.

## Pendientes de verificación

- [ ] Antes del 05-11, revisar si el Certified y Nexsys ya están aprobados; si lo están, cambiar «sumamos a nuestra oferta» por «comercializamos e implementamos».
- [ ] Después de las 14:00 del 05-11-2026, releer los tres posts por ID y confirmar `PUBLISHED` con `publicUrl`.
- [ ] Comprobar en LinkedIn que la mención a Adobe quedó enlazada y que la portada se aplicó.
