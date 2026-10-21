# «Efeonce | Claude — Ahora somos partners»: anuncio en LinkedIn e Instagram (2026-10-21)

**Relación comercial que respalda el anuncio:**
- [registro de partnerships → Anthropic](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md);
- [revisión del Claude Partner Network](../../audits/commercial/CLAUDE_PARTNER_NETWORK_REVIEW_2026-10-20.md).

Efeonce es **Registered** en el Claude Partner Network. Por eso:
- el copy dice «implementamos», nunca «vendemos licencias», porque no hay acuerdo de reventa;
- no lleva la insignia «Claude Partner», que se otorga recién en Certified.

**Serie:** cuarta pieza. Orden vigente de publicación (actualizado el 2026-10-21):
1. [Google](2026-10-19-google-partner-announcement-production-method.md), 20-10.
2. [BytePlus](2026-10-20-byteplus-partner-announcement-production-method.md), 29-10.
3. [Adobe](2026-10-20-adobe-partner-announcement-production-method.md), 05-11.
4. Claude (esta pieza), 19-11.
5. [OpenAI](2026-10-20-openai-partner-announcement-production-method.md), 26-11.
6. [AWS](2026-10-21-aws-partner-announcement-production-method.md), 03-12.
7. [Microsoft](2026-10-21-microsoft-partner-announcement-production-method.md), 10-12.

## Estado

- **Programado y todavía sin publicar** para el **jueves 19-11-2026**. Metricool, `autoPublish`, zona `America/Santiago`.
  Las dos marcas tenían el día libre; el perfil de Julio tiene otro post el 18-11.
- Archivos locales: `ai-generations/2026-10-21_claude-partner/`. Los MP4 no están en git; los copies están en
  `export/copies-claude-v2.md`.

| Canal | Marca Metricool | Hora Chile | ID de post | Forma |
|---|---|---|---|---|
| LinkedIn página Efeonce | Efeonce Group `3961547` | 11:00 | `402024265` | video 4:5 con sonido y portada PNG; `previewIncluded=false` |
| LinkedIn personal de Julio | Julio Reyes `5105024` | 11:30 | `402024305` | el mismo video 4:5 con portada |
| Instagram `@efeoncepro` | Efeonce Group `3961547` | 14:00 | `402024348` | `REEL` 9:16, `showReelOnFeed=true`, `isAiGenerated=true`, portada PNG |

## Cómo se llegó al concepto (lo que no se deduce del resultado)

El operador rechazó cinco direcciones antes de aprobar esta:
1. **Constelación en un perímetro:** un diagrama chico, sin impacto.
2. **Red aérea de luz y esfera de vidrio:** la iconografía más gastada de la IA.
3. **Oficina que se ordena.**
4. **Murmuración sobre dunas.** Era hermosa, pero genérica: «no refleja tanto el partnership con Claude».

**Lo que destrabó:** el operador pidió algo «relacionado con Sonnet 5.5, el mundo de su lanzamiento». Los demos de
Anthropic son marfil, tinta y un sol terracota, con el formato «el modelo escribe un programa y lo corre».

**Concepto aprobado: «Lo que Claude crea se escapa de la pantalla».** Claude escribe código sobre marfil mientras se
traza un dibujo en tinta. En `volar()`, el sol del dibujo detona, la ventana estalla y los pájaros salen hacia la cámara
hasta el mundo real. Ahí la ola de estorninos rompe sobre el sol y entra el lockup.

**Regla aprendida:** la pieza de un partner tiene que salir del mundo visual de ese partner. Un guiño de medio segundo
no alcanza; los primeros segundos son 100 % su estética.

## Grilla: imagen, SFX y música sobre el mismo mapa

**120 BPM** (tiempo = 0,5 s). Fuente: `escapa/audio-cues-escapa.json`, escrita en 128 BPM y llevada a 120 a pedido
del operador («ralentizar solo un poco»).

| Tiempo | Imagen | Sonido |
|---|---|---|
| 0–1,75 s | Código en semicorcheas; cada línea cierra en un tiempo con zoom seco y golpe de cámara; las dunas, el sol y los pájaros se trazan | Una sola pulsación de tecla repetida en cada semicorchea, zoom en cada tiempo y pluma |
| 1,75–2,0 s | Congelado | **Silencio absoluto** (medido a −180 dB) |
| **2,0 s** | Golpe 1: el sol detona y la ventana estalla; un tiempo de cámara lenta | Estallido de papel, sub drop sintetizado, braam y succión; drop de la música |
| 2,5–3,58 s | Estallido de pájaros y rayos, y corte al vuelo entre la bandada | Pájaros que rozan, arena, aleteo en crescendo y barrido |
| **4,0 s** | Golpe 2: la ola rompe sobre el sol con destello, sacudida y empuje de zoom | Braam, sub y cristal; la música reinicia su drop, un compás después del golpe 1 |
| 4,6–4,98 s | La ola se asienta | **Vacío** del resto de la mezcla: solo suena la subida del sting |
| **5,0 s** | El lockup entra en etapas: logos, «AHORA SOMOS PARTNERS» a 30 px y la fila de productos | Pico del sting |
| 5–8 s | Bandada viva (toma extra de Seedance) | Pad, alas lejanas y fundido |

**Master:** −14,0 LUFS, pico real de −3,1 dBTP.

## Producción

- **Apertura en HTML** (`escapa/apertura-120.html`): texto y código compuestos, el dibujo en tres capas recortadas
  (dunas, sol y cielo) y la cámara con zoom seco. Un modelo deforma las letras, así que el texto nunca pasa por uno.
- **Seedance 2.0:**
  - toma de tinta a murmuración;
  - toma dentro de la bandada;
  - toma de vida para el cierre;
  - toma de la detonación (`escapa/tomaB`).

  Cada una se mide con curvas de brillo y de movimiento, y se usa solo el tramo bueno. Por ejemplo, la detonación
  terminaba en un plano de mar vacío que se descartó.
- **Montaje:** a 24 fps nativos, con la cantidad de cuadros fijada por segmento para que los golpes caigan exactos.
  La cámara lenta usa `minterpolate`. Los fogonazos y las sacudidas se aplican con `zoompan` y capas de color.
- **Música:** generada en ElevenLabs y ajustada a 120 BPM con `atempo` (sin cambiar el tono). Su drop, medido en el
  segundo 3,83 del archivo, se alinea con el golpe 1 y se reinicia en el golpe 2. Trae un coro sin palabras.
- **QA:** con `pnpm ai:listen` (Gemini). Sirvió para elegir tomas de SFX y para detectar el cierre congelado, pero
  **sus tiempos y niveles fallaron varias veces**: dijo «sting enterrado» y «sin silencio» cuando la medición mostraba
  lo contrario. Toda afirmación verificable se contrasta con ffmpeg.

## Menciones verificadas (2026-10-21)

| Red | Cuenta | Identificador |
|---|---|---|
| LinkedIn | Claude | `106863934` (3,89 M) |
| LinkedIn | Anthropic | `74126343`, página `anthropicresearch` (5,28 M); la página `anthropic` es un fondo de inversión ajeno |
| Instagram | `@claudeai` | oficial (2 M); `@claude` tiene 0 publicaciones |

**Media pública:** `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-11-claude-partner/`. Respondió 200 y
las copias de Metricool tienen el mismo tamaño en bytes.

## Pendientes de verificación

- [ ] Después de las 14:00 del 19-11-2026, releer los tres posts por ID y confirmar `PUBLISHED` con `publicUrl`.
- [ ] Comprobar en LinkedIn que las menciones a Claude y Anthropic quedaron enlazadas.
