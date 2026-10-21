# «Efeonce | OpenAI — Ahora somos partners»: anuncio en LinkedIn e Instagram (2026-10-20)

**Relación comercial que respalda el anuncio:**
- [registro de partnerships → OpenAI](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md);
- [revisión del Partner Portal](../../audits/commercial/OPENAI_PARTNER_NETWORK_REVIEW_2026-10-20.md).

Estado al producir la pieza: **Registered Partner** del OpenAI Partner Network. Por eso:
- el copy dice «implementamos» y nunca «vendemos» ni «revendemos licencias», porque no se encontró una cláusula de
  reventa;
- no hay insignia, que sólo existe desde Select.

**Riesgo declarado:** las Badge Brand Guidelines indican que el lockup de partnership lo entrega OpenAI. El operador
decidió armarlo igual («No dejes el espacio reservado, armalo»). Mitigación posible antes del 26-11: pedirle a Support
que lo apruebe.

**Serie:** quinta pieza. Antes vienen [Google](2026-10-19-google-partner-announcement-production-method.md),
[BytePlus](2026-10-20-byteplus-partner-announcement-production-method.md) y
[Adobe](2026-10-20-adobe-partner-announcement-production-method.md). Claude queda propuesta para el 19-11, todavía sin
producir; AWS y Microsoft van en diciembre.

## Estado

- **Programado y todavía sin publicar** para el **jueves 26-11-2026**. Metricool, `autoPublish`, zona
  `America/Santiago`. Ese día no había otros posts en las dos marcas.
- Archivos locales: `ai-generations/2026-10-21_openai-partner/`. Los MP4 no están en git; los copies están en
  `export/copies-openai-v1.md`.

| Canal | Marca Metricool | Hora Chile | ID de post | Forma |
|---|---|---|---|---|
| LinkedIn página Efeonce | Efeonce Group `3961547` | 11:00 | `401634027` | video 4:5 con sonido y portada PNG; `previewIncluded=false` |
| LinkedIn personal de Julio | Julio Reyes `5105024` | 11:30 | `401634041` | el mismo video 4:5 con portada |
| Instagram `@efeoncepro` | Efeonce Group `3961547` | 14:00 | `401634087` | `REEL` 9:16, `showReelOnFeed=true`, `isAiGenerated=true`, portada PNG |

## Concepto: «Velocidad de luz», v2

1. Polvo en la oscuridad.
2. Salto al hiperespacio, con líneas que aceleran.
3. Las líneas colapsan en un punto y el impacto hace nacer el horizonte.
4. Las chispas estallan y se congelan en el aire.
5. Golpe del lockup.

La v1, minimalista, se descartó porque tenía menos punch que las demás (comentario del operador). El fondo también se
rehízo: la primera versión se leía negra y no navy. La base es `#001a33` con un brillo radial.

**Lockup:** «Efeonce | OpenAI», Efeonce en 392 × 92 y `openai-blanco.svg` en 362 × 98. Fila de productos en gris:
ChatGPT Enterprise y Codex. Eyebrow: «AHORA SOMOS PARTNERS». El bloque va en la zona tranquila sobre el horizonte; más
abajo, las chispas pasaban por detrás de la fila.

## Pipeline

1. **Fijo con acabado de modelo.** El acabado determinístico del canvas se rechazó («la única forma sería que lo
   pasaras a un modelo»). El impacto se re-renderizó con GPT Image 2.5 Sunburst (`comp/acabado-openai.txt`), con el
   4:5 padeado a 2:3 con bandas en espejo. El primer cuadro (`comp/inicio.txt`) tiene el mismo acabado. Los logos
   siempre se componen encima, nunca se generan.
2. **Animación con Seedance 2.0** (cuenta BytePlus `3004839361`): primer y último cuadro, 5 s, 3:4, 1080p, sin audio y
   `{"watermark": false}`. El prompt de `video/toma.txt` lleva los tiempos de la hoja de cues. Tarea
   `cgt-20261021073335-hpxnf`.
   - **Trampa:** con PNG de entrada la subida venció por timeout sin dejar ID de tarea. Con JPEG funcionó. Pudo quedar
     un cobro duplicado de hasta USD 1,87.
3. **Retemporización:** `fps=30`, el impacto pasa de 1,96 s a 2,0 s con un cuadro clonado al inicio, y el último cuadro
   se sostiene hasta 8 s (240 cuadros).
   - 4:5: `scale=1080:1440,crop=1080:1350:0:45`.
   - 9:16: `crop=936:1664:156:0` sobre el 1248 × 1664 original y luego `scale=1080:1920`. **No hubo que generar de
     nuevo.** El flash del impacto cae en el mismo cuadro en los dos formatos.
4. **Lockup como cuadros PNG transparentes** con Playwright (`omitBackground`), animados con `setT(t)`: golpe en
   T_SIGN = 2,7 s y aterrizaje en 3,0 s. El 9:16 usa `comp/lockup-overlay-story.html`, con eyebrow en 400, logos en 446
   y fila en 572 px, fuera del encabezado del Reel.

## Sonido: animación pensada con su hoja de cues

Regla del operador: *«Piensa las animaciones con el sonido que tendrán»*. Los tiempos salen de las constantes de la
animación y viven en `audio-cues.json` (grilla de 120 BPM). Se generó en ElevenCreative, flujo `8iddNkIfbAKEPy0kHYBu`:
6 efectos × 2 variaciones, más 2 de música.

| Tiempo | Sonido |
|---|---|
| 0–2,0 s | `succion-a` como túnel de viento (crece de −34 a −11 dB), entra en fundido y corta seco en 2,0 |
| 0,5–2,0 s | `musica-a`: su pulso salió en **corcheas exactas a 120 BPM** (0,25 s) y queda alineado a la grilla; volumen en rampa y corte en 2,0 |
| 1,0–2,0 s | `riser-a` **invertido** como succión: el original decae, invertido sube y termina en su pico justo en el impacto |
| 2,0 s | `impacto-a` con eco más `impacto-b` como cristal |
| 2,0–2,73 s | `chispas-b` con **tape stop** desde 2,38 s: la velocidad cae de 1 a 0 en 0,35 s (Python puro, `(1-x)²`) |
| 2,38 s | `congelado-a`, bajo |
| 2,4 s | Sting de Efeonce, con su pico en 3,0 s, cuando aterriza el lockup |
| 2,9–8,0 s | `pad-b` más `musica-b` desde su segundo 4,4, con reverb de cola; fundido 7,3–8,0 |

- **Duraciones:** ElevenLabs no respetó varias de las pedidas. El riser «de 2 s» salió de 1 s y decayendo; la música,
  de 11 s. Cada toma se midió con su envolvente RMS antes de elegirla.
- **Mezcla:** la v2 con compresor de master le quitó contraste al impacto y dejó la cola muda desde 6,3 s. La v3 usa
  un limitador que sólo recorta el pico del golpe y el colchón corre completo con reverb.
- **Master:** loudnorm en dos pasadas en modo lineal, **−14,0 LUFS** y pico real de **−3,0 dBTP**
  (`audio/mezcla-openai-final.wav`).
- **Trampa de zsh:** `offset=$5:linear=true` se leyó como el modificador `:l`. Hay que escribir `${5}`.

## Media pública y portadas

Bucket: `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-11-openai-partner/`. Se verificó HTTP 200 antes
de programar, y también las copias de Metricool, con el mismo tamaño en bytes:
- `efeonce-openai-partner-{linkedin-4x5,instagram-reel-9x16}-v1.mp4`
- `efeonce-openai-partner-{linkedin,instagram}-portada-v1.png`

Portadas en PNG con paleta de 256 colores (816 KB y 827 KB):
- la 4:5 es el fijo aprobado;
- la 9:16 es el último cuadro de Seedance con el mismo recorte y el lockup final.

En el recorte 3:4 de la grilla de Instagram el lockup se ve completo.

## Copies

Aprobados el 2026-10-20. Hilo: «La velocidad la pone la IA. La dirección la pone tu negocio.», que conecta el video
—velocidad que se convierte en horizonte— con el pitch «Tu IA no conoce tu negocio».
- **Público:** empresas e instituciones.
- **Productos nombrados:** ChatGPT Enterprise, Codex y la API.
- **Menciones de LinkedIn:** `@[urn:li:organization:11130470|OpenAI]`, con el ID verificado en el HTML público de
  `linkedin.com/company/openai`, y en el perfil personal también `@[urn:li:organization:20503593|Efeonce]`.
- **Instagram:** `@openai`.

## Pendientes de verificación

- [ ] Opcional antes del 26-11: pedir a Support del OpenAI Partner Network que apruebe el lockup.
- [ ] Después de las 14:00 del 26-11-2026, releer los tres posts por ID y confirmar `PUBLISHED` con `publicUrl`.
- [ ] Comprobar en LinkedIn que la mención a OpenAI quedó enlazada y que la portada se aplicó.
