# «Efeonce | Microsoft — Ahora somos partners»: anuncio en LinkedIn e Instagram (2026-10-21)

**Relación comercial que respalda el anuncio:**
- [registro de partnerships → Microsoft AI Cloud](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md);
- [revisión de Licencias OnLine, Microsoft y AWS](../../audits/commercial/LICENCIAS_ONLINE_MICROSOFT_AWS_REVIEW_2026-10-19.md).

Efeonce es Indirect Reseller activo en el CSP de Microsoft, a través de Licencias OnLine, desde el 20-10-2026. Por eso
el copy dice «comercializamos e implementamos» Azure, Microsoft 365 y Dynamics 365.

**Serie:** séptima pieza. Orden vigente de publicación (actualizado el 2026-10-21):
1. [Google](2026-10-19-google-partner-announcement-production-method.md), 20-10.
2. [BytePlus](2026-10-20-byteplus-partner-announcement-production-method.md), 29-10.
3. [Adobe](2026-10-20-adobe-partner-announcement-production-method.md), 05-11.
4. [Claude](2026-10-21-claude-partner-announcement-production-method.md), 19-11.
5. [OpenAI](2026-10-20-openai-partner-announcement-production-method.md), 26-11.
6. [AWS](2026-10-21-aws-partner-announcement-production-method.md), 03-12.
7. Microsoft (esta pieza), 10-12.

Es la tercera pieza de la **trilogía cloud**, después de Google Cloud y AWS. AWS va programada para el jueves 03-12, antes
que esta, sujeta a que Licencias OnLine confirme que AWS ya se transacciona.

## Estado

- **Programado y todavía sin publicar** para el **jueves 10-12-2026**. Metricool, `autoPublish`, zona
  `America/Santiago`. Las dos marcas tenían el día libre.
- Archivos locales: `ai-generations/2026-10-21_microsoft-partner/`. Los MP4 no están en git; los copies están en
  `export/copies-microsoft-v1.md`.

| Canal | Marca Metricool | Hora Chile | ID de post | Forma |
|---|---|---|---|---|
| LinkedIn página Efeonce | Efeonce Group `3961547` | 11:00 | `402061083` | video 4:5 con sonido y portada PNG; `previewIncluded=false` |
| LinkedIn personal de Julio | Julio Reyes `5105024` | 11:30 | `402061135` | el mismo video 4:5 con portada |
| Instagram `@efeoncepro` | Efeonce Group `3961547` | 14:00 | `402061180` | `REEL` 9:16, `showReelOnFeed=true`, `isAiGenerated=true`, portada PNG |

🔴 **Dos condiciones antes del 10-12:**
- **Dynamics 365:** confirmar con Licencias OnLine que se puede transaccionar por el CSP. Si no se puede, sacarlo del
  copy, que hoy lo nombra.
- **«Google Cloud, AWS y Microsoft Azure»:** la frase supone que AWS sale antes. Si AWS se atrasa, reescribirla.

## Cómo se llegó al concepto (lo que no se deduce del resultado)

**Encargo del operador:**
- foco en Azure y la nube;
- mencionar Dynamics 365 y Microsoft 365, que también se comercializan;
- «muy SaaS, muy tecnología, impacto visual y punch»;
- se pueden usar todos sus logos.

**Dos correcciones que definieron la pieza:**
1. **Vidrio no es glasmorfismo.** La primera tanda de keyframes eran cubos de vidrio, y el operador la rechazó como
   cliché. El lenguaje de Microsoft (Fluent) es **glasmorfismo**: superficies esmeriladas translúcidas, formas
   redondeadas, curvas y casi ninguna recta. Se regeneraron los cuatro keyframes: cápsula, estallido, túnel de cintas
   y nube.
2. **Los logos «se veían raros».** Los íconos de producto pasados a silueta gris plana perdían sus facetas. Se
   reemplazaron por una **escala de grises modelada**, que conserva las caras de cada ícono, con una rampa de
   `#6a7c92` (oscuros) a `#d6e2ee` (luces). Archivos en `comp/prod/`.

**Concepto aprobado: «Escala sin límites».** Una cápsula de vidrio esmerilado se duplica en cada tiempo: 2, 4, 8.
Después estalla en cientos y la cámara vuela por un túnel de cintas curvas. Al salir aparece la nube sobre el horizonte
de Azure y entra el lockup.

## Grilla: imagen, SFX y música sobre el mismo mapa

**120 BPM** (tiempo = 0,5 s). La fuente es `audio-cues.json`.

| Tiempo | Imagen | Sonido |
|---|---|---|
| 0–0,5 s | Se enciende la cápsula | Campanilla de vidrio y tono grave |
| 0,5–1,5 s | Se duplica en cada tiempo, con retroceso seco de cámara | Campanillas que se duplican; riser que sube una octava por salto |
| 1,5–1,75 s | Estallido en espiral | Redoble de vidrio que se vuelve rugido |
| 1,75–2,0 s | Cámara lenta con empuje (no congelado: ver Producción) | **Silencio absoluto** |
| **2,0 s** | Golpe 1: fogonazo y corte al túnel | Drop de la música: impacto de vidrio, sub y braam |
| 2,0–4,0 s | Vuelo por el túnel con pulsos de luz | Pulso en corcheas y barrido creciente |
| **4,0 s** | Golpe 2: sale del túnel y aparece la nube | Acorde, braam y cristal; la música reinicia su drop |
| 4,6–4,98 s | La nube se asienta | **Vacío** del resto de la mezcla |
| **5,0 s** | Lockup en etapas. Arriba «AHORA SOMOS PARTNERS» a 30 px. Debajo, Microsoft en blanco y Efeonce. Al pie, la fila Azure · Microsoft 365 · Dynamics 365 | Pico del sting (el archivo entra en el segundo 4,4) |
| 5–8 s | Nube viva con un empuje lento | Pad y fundido |

**Master:** −14,0 LUFS, pico real de −3,3 dBTP.

## Producción

- **Keyframes:** `gpt-image-2.5-sunburst`, calidad high, a `1024x1536` y recortados a 4:5. Sin logos: el modelo no
  dibuja marcas de terceros. Los logos se componen en HTML desde los SVG oficiales: `comp/microsoft-blanco.svg`, con
  todos los rellenos en blanco, y `comp/efeonce.svg`.
- **Seedance 2.0:** tres tomas con primer y último cuadro.
  - Toma A, de la cápsula al estallido: `xpwld`.
  - Toma B, el túnel: `dtjvk`.
  - Toma C, de la salida a la nube: `qch54`.
- **El tirón «como si cargara»:** el operador lo vio dos veces.
  - **Causa:** un congelado y cámaras lentas por tramos que se sentían como un buffer.
  - **Primer intento:** pasar el congelado de 1,75–2,0 a cámara lenta con empuje. No bastó.
  - **Solución:** una **curva de velocidad continua**. La fuente se interpola a 96 fps con `minterpolate`. Un mapa PCHIP
    lleva del tiempo de salida al de la fuente, con claves `(0,0.25) (0.5,0.75) (1.0,2.29) (1.6,4.05) (2.0,4.45)`.
    Cada cuadro lleva blur de obturador con `tmix`. Entre las tomas B y C hay un `xfade`, y hay empujes lentos al inicio
    y al final.
  - **Verificación:** cada cuadro se mide con `tblend=difference` y el YAVG de `signalstats`. El criterio es **cero
    tramos bajo 0,15**, es decir, sin cuadros quietos. Pasó, y el operador lo aprobó.
- **Lockup:** `comp/lockup-overlay.html` y `lockup-overlay-story.html` se renderizan cuadro a cuadro sobre el master.
  El lockup entra en `T_SIGN 4.65` con un brillo azul.
- **Sonido:** SFX y música generados en ElevenLabs, con las duraciones medidas porque no son exactas. El sub drop, el
  riser y el barrido se sintetizaron con `aevalsrc` y `anoisesrc`. El drop de la música, medido en el segundo 8,0 del
  archivo, cae en el golpe 1 y se reinicia en el golpe 2.
- **Trampas de la mezcla:**
  - Un solo grafo con dos `amix` produjo un archivo de 0,11 s. Se resolvió mezclando en dos pasos: primero el bus,
    con el ducking hecho por expresión de `volume`; después el `amix` con el sting.
  - Para el master se mide con `loudnorm`, se aplica la ganancia a −14 LUFS con `volume` y se cierra con `alimiter`.
- **QA:** con `pnpm ai:listen`. Sus afirmaciones de tiempo y nivel se contrastaron con ffmpeg, igual que en Claude.

## Menciones verificadas (2026-10-21)

| Red | Cuenta | Identificador |
|---|---|---|
| LinkedIn | Microsoft | `1035` (29,3 M) |
| LinkedIn | Microsoft Azure | `96411081` (1,27 M) |
| LinkedIn | Licencias OnLine | `2453600` (73,6 K) |
| Instagram | `@microsoft`, `@microsoftazure`, `@licenciasonline` | — |

**Media pública:** `gs://efeonce-group-greenhouse-public-media-prod/campaigns/2026-12-microsoft-partner/`. Los seis
archivos que guardó Metricool (tres videos y tres portadas) tienen el mismo tamaño en bytes que el original, medido el
21-10.

## Pendientes de verificación

- [ ] Antes del 10-12: confirmar con Licencias OnLine que Dynamics 365 se transacciona por el CSP.
- [ ] Antes del 10-12: confirmar que AWS sale primero, para que la frase de la trilogía siga siendo cierta.
- [ ] Después de las 14:00 del 10-12-2026: releer los tres posts por ID y confirmar `PUBLISHED` con `publicUrl`.
- [ ] Comprobar en LinkedIn que las menciones a Microsoft, Azure y Licencias OnLine quedaron enlazadas.
