# Branding sonoro Efeonce — ronda 1 (2026-09-26)

Estado: **versión recomendada armada** (2026-09-26), sin canonizar. **Publicada en AXIS:** https://axis.efeonce.org/references/sonic-brand/ + `/references/sonic-brand.json`
(PR efeoncepro/axis-design-system#4, squash `55486aa`); archivos en `gs://efeonce-group-axis-public-media/sonic/v1/`
(índice medido en `bucket-index.json`, generador de `sonic-brand-assets.ts`). Canon en Greenhouse:
`docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md`. Guía: https://claude.ai/artifact/NgfYHfeNJX6Frjco6hXtnG · historial de rondas: la sala de escucha. Sala de escucha: https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9

## Decisiones del operador (2026-09-26)

- Todo se produce en casa, sin músico ni compositor humano: motor propio + ElevenLabs + Higgsfield.
- Puntos de contacto, en orden: video y redes → podcast Glitch → eventos.
- Los cierres largos llevan etiqueta con voz: «Empower your <Línea>».

## Elecciones de la ronda 1 (operador, 2026-09-26)

- Territorio **Puntos suspensivos** (Mi Mi Mi → La) · voz **Brian** (ElevenLabs v3) · el **acento por línea se queda**.
- El timbre de **Voice** (coro) no gustó: ronda 2 propone `eco`, `cuerda` (Karplus-Strong) y `pulso` (trémolo 6 Hz).
- Pidió escucharlo en el **reveal**: `--mode reveal` calza con `pieces.reveal` V1.1 (tres notas en 1,42/1,54/1,66 s,
  esfera con el golpe a 1,87 s, acorde a 2,75 s). Versión con Brian: `--bloom 3.08` y la voz desplazada 2,09 s para
  que «Growth» y el acorde caigan cuando termina de entrar el eslogan.

## Elecciones de la ronda 2 (operador, 2026-09-26)

- **Voice = `eco`** (cuerda y pulso descartados). Es el default de `--line voice` en el motor.
- **Reveal: se quedan las dos versiones**, con voz y sin voz, según el contexto.
- Ronda 3: **apertura** (`--mode open`: tres notas mientras se recogen las letras, esfera con el lanzamiento a 1,15 s,
  termina en el anillo abierto) y **etiquetas de las cinco líneas con Brian**. Las tomas se igualaron en ritmo: pausa
  «Empower»→«your» a 0,14 s recortando sólo el silencio (Brian la alargaba hasta 0,28 s en Engine, Voice y Revenue;
  subir la estabilidad a 0,8 no bastó). Tomas elegidas y palabra final en `voz/final/` (`onsets.json`).

## Elecciones de la ronda 3 (operador, 2026-09-26)

- **Apertura aprobada** tal cual: termina en el anillo abierto.
- **Las cinco etiquetas con Brian aprobadas.**
- Ronda 4 (`motor/composer.mjs` sobre `motor/dsp.mjs`, 96 BPM): **pieza larga** de 40,5 s (la esfera responde siempre La
  mientras la armonía cambia: La · Re/La · Fa♯m7 · Mi sus4) y **Glitch** (intro 8,5 s, cortina 2,4 s, outro 6,5 s; la
  tercera ventana tartamudea con reducción de resolución; el outro suena limpio). Masterización en `motor/master.sh`:
  realce +3 dB sobre 5 kHz y loudnorm en dos pasadas (−14 LUFS video/redes, −16 LUFS podcast).
- Trampa medida: normalizar por pico dejó la cortina a −8,8 LUFS y la intro a −17,9 (el golpe grave manda el pico);
  cada pieza se normaliza por sonoridad a su destino, nunca por pico.
- Balance: la primera versión de la pieza larga tenía ~5 dB de graves de más y ~5 dB de agudos de menos contra el logo
  aprobado (bandas <200 Hz, 200 Hz–2 kHz y >2 kHz). Sigue más oscura que el logo (colchón): decisión de carácter pendiente.

## Ronda 5 — versión rock (operador, 2026-09-26: «más punch, sin perder los puntos suspensivos»)

- Traducción: tres golpes apagados de guitarra en Mi (las ventanas) y el acorde abierto con bombo, platillo y bajo (la
  esfera). A 120 BPM, tres semicorcheas = 0,375 s: la misma pausa del logo.
- Método en tres capas: (1) maqueta propia `motor/rock.mjs` (riff exacto, batería, bajo, guitarras Karplus-Strong con
  saturación y caja, dobladas L/R); (2) re-grabación con IA vía fal (`motor/ai-music.ts`); (3) la esfera exacta encima
  (`motor/sello.mjs`: campana La + golpe grave) y masterización (`motor/master.sh <in> <out> <LUFS> [shelf]`).
- **Stable Audio 2.5 audio-to-audio** (`fal-ai/stable-audio-25/audio-to-audio`, USD 0,20 por pieza) conserva el tiempo al
  milisegundo: silencio 32,00–32,25 s y golpe final en 32,874 s (maqueta 32,875). Candidatas: intensidad 0,5 y 0,7.
- **ElevenLabs Music v3 no está en fal** (2026-09-26): lo más nuevo es `elevenlabs/music/v2.5` (USD 0,60/min), que
  acepta `audio_reference` por tramo (`strength` low|medium|high|xhigh, ventana ≤ 30 s, líneas de texto ≤ 200 caracteres).
  Suena más producido pero **no respeta la estructura**: con `high` y con `xhigh` se saltó el corte y el golpe final
  (termina ~34 s), y con `xhigh` alargó la intro a 10 s. Uso posible: colchón hasta la subida (versión «híbrida»).
- Trampas: Stable Audio **redondea la duración a segundos enteros** (8,5 → 8; 2,6 → 2): las maquetas se hacen de
  duración entera. `runFalModel` espera 120 s por defecto; Stable Audio a 37 s necesita `pollTimeoutMs` mayor, y un
  trabajo vencido se recupera sin volver a pagar con `motor/recuperar.ts <modelo> <requestId> <salida>`.
- **Licencia pendiente de verificar** antes de uso comercial pagado: salidas de Stable Audio 2.5 y ElevenLabs Music vía fal.

## Versión recomendada (operador, 2026-09-26: «vamos con tu recomendación»)

- **Dos registros, mismo ADN:** fondo (serena, 96 BPM; debajo de locución, webinars, explicativos) y energía (rock,
  120 BPM, Stable Audio 2.5 a 0,7 «re-grabación libre»; redes, lanzamientos, eventos). Nunca se cambia de registro
  dentro de una pieza ni va energía debajo de una locución. El híbrido con ElevenLabs quedó descartado (el empalme cae
  justo antes de la firma).
- **Glitch: pendiente** de decisión del operador.
- Kit en `entrega/` (01 logo por línea · 02 etiquetas Brian · 03 motion WAV + MP4 16:9 y 9:16 · 04 piezas largas ·
  05 cierre de energía 5,1 s cortado del rock desde 31,9 s · 06 voz sola). Nivelado a −14 LUFS; los logos de Brand,
  Revenue y Voice quedan en −15 porque el golpe toca el techo de pico (−1 dBFS) y no se comprime.
- Pendiente para canonizar: Glitch · licencias (Stable Audio: uso comercial declarado, licencia comunitaria hasta
  USD 1M/año — confirmar vía fal; voz ElevenLabs) · prueba de reconocimiento sin logo · tokens AXIS + reemplazo del
  sonido de los masters V1.1 + guía en el manual de la línea gráfica.

## Concepto

«Tres puntos que se vuelven uno»: el anillo (acorde abierto) pregunta, tres notas breves piensan (las tres ventanas
de la nave), hay una pausa y la esfera responde con golpe. Todo en La mayor, la tonalidad del motion V1.1, para no
chocar con los videos aprobados. La línea de servicio cambia sólo el timbre de la esfera; la melodía no cambia nunca.
En el cierre con voz, la esfera cae en la palabra final del eslogan.

## Qué hay

| Carpeta | Contenido |
|---|---|
| `motor/sonic-engine.mjs` | Síntesis determinística (sin muestras ni modelos de terceros). `--territory puntos\|pregunta\|orbita --mode logo\|sting --line growth\|brand\|engine\|voice\|revenue` |
| `motor/voz.ts` | Etiqueta de voz con ElevenLabs v3 vía fal (`runFalModel`) |
| `motor/glitch-sfx.mjs` | **HISTÓRICO:** la versión viva está en el taller (`tools/glitch-motion/src/sound.mjs` + `tools/brand-sound`, commit `2d411b8`). **Glitch, diseño sonoro (ronda 6, aprobado en B el 2026-09-27):** `--intensity a\|b --outdir <dir>` → apertura, cierre, bucle y animatic amarrados a los cuadros del piloto de motion v2 (`efeonce-brand-workshop/tools/glitch-motion`, `pieces.mjs` TIMING y `overlays.mjs`) |
| `glitch-sfx/<a\|b>/kit/` · `transiciones/` | Un WAV por overlay del kit (incluida la transición de bytes) y por transición entre escenas (3 orígenes × 2 velocidades + héroe, reel y vlog), leídos de la misma programación de celdas que la imagen |
| `glitch-sfx/` | WAV de A y B y `web/` con los videos del piloto con sonido (fuera de git; copia en OneDrive `09. Glitch/Motion/piloto/sonido-propuesta/`) |
| `motor/glitch-theme.mjs` | **Glitch, el tema (ronda 9, PROPUESTA, sólo Glitch):** tres etapas — `--stage maqueta` (banda derecha: bajo distorsionado con el motivo, batería, acordes sucios), re-grabación con `ai-music.ts --plan tema-a\|tema-b --strength 0.75` (A experto y oscuro · B irreverente), y `--stage final --from <regrabado>` (cortes y tartamudeo sobre la grabación real, la apertura aprobada intacta, sub de la manzana, silencio en f108). Salidas en `glitch-tema/r9/`. **La ronda 8 (síntesis pura) quedó descartada: «se escucha muy arcade; Glitch es irreverente, desafiante, experto».** Ronda 8: `--version vlog\|podcast --apertura glitch-sfx/b/apertura.wav`. La música sale del sonido aprobado B: 150 BPM (una semicorchea = 3 cuadros, todos los golpes del motion en la grilla), instrumentos de la paleta B, groove grabado derecho y editado como cinta (repeticiones de búfer y silencio digital), grave sólo en la manzana y la apertura aprobada intacta como drop. Salidas en `glitch-tema/` (fuera de git) |
| `motor/glitch-music.mjs` | **DESCARTADA (ronda 7):** «no combina con el punch de la intro y el cierre del motion, no tiene el espíritu Glitch» (operador, 2026-09-27). Eran géneros aparte del sonido B. Glitch, música: `--style pulso\|club --piece intro\|cortina [--no-apple]`. Maqueta con la estructura exacta; usa las primitivas del taller (`tools/brand-sound`, `BRAND_SOUND_DIR` lo sobreescribe). Se re-graba con `ai-music.ts --route sa --plan <estilo>-<pieza> --outdir glitch-musica/ai --strength 0.6` y la manzana propia se monta con `sello.mjs` en el instante de `<pieza>.json` |
| `glitch-musica/` | Ronda 7: `maqueta/`, `ai/` (Stable Audio 0,6, sello y `onsets.json`), `final/` (−14 LUFS) y `web/` (MP3). Fuera de git |
| `motor/transcribir.ts` | QA: transcripción con marcas de tiempo por palabra (ElevenLabs STT vía fal) |
| `candidatos/` · `sting/` · `cierre/` · `lineas/` · `voz/` | WAV 48 kHz / 24 bits, MP4 del sting (fuera de git) |
| `web/` | MP3/MP4 publicados en la sala de escucha |
| `referencia/` | Masters del motion V1.1 (sting y reveal 16:9 navy) bajados del bucket público de AXIS |

## Verificado

- Notas, tiempos y ausencia de clics: espectrogramas en `qa/` (se corrigió un corte seco del golpe grave y de las notas).
- Volumen: −13 a −15 LUFS integrados, pico −1 dBFS.
- Voces: las cuatro dicen «Empower your growth» (transcripción); el golpe de la esfera cae en el inicio de «growth».
- Reproductor (AXIS y las dos páginas privadas): el botón de pausa no respondía porque el script reemplazaba el `innerHTML` del botón en cada cuadro y el clic humano perdía su destino. Se arma el SVG una vez y sólo cambian atributos, con `pointer-events: none` en el SVG (AXIS PR #6). **Probar con un clic sostenido real, no con `el.click()`:** el `.click()` sintético pasaba y escondía el bug.
- Brian es la voz de fábrica, ID `nPczCjzI2devNBz1zQrb` (hay 25 «Brian» en la biblioteca de ElevenLabs). Toma de prueba en el conector
  de ElevenLabs (`voz/conector/`, USD 0,0044): 0,85 de similitud de hablante contra `growth-brian.mp3`; las demás
  etiquetas aprobadas 0,73–0,83; George y otras dos «Brian» 0,62–0,72 (Resemblyzer). Falta la confirmación de oído.
- Glitch, ronda 6 (2026-09-27): cada golpe cae en su cuadro (espectrograma con marcas de cuadro); el corte de la apertura baja a silencio digital real (−180 dBFS); apertura con el golpe de la manzana en −1 dBFS de pico (≈ −19 LUFS, casi todo transiente) y la misma escala en todas las pistas. Ajustes tras mirar el espectrograma: la campana de la manzana decae 2,2 veces más rápido (tapaba «se abre»), el temblor pasa por un pasa-bajos de 7 kHz (aliasing áspero) y el golpe 3 sube 2–3 dB.
- Glitch, ronda 7 (2026-09-27): Stable Audio conservó el golpe final de las intros al milisegundo (Pulso 0 ms, Club −2 ms; medido por ataque); en la cortina de Pulso el detector de ataque tomó un corte del tartamudeo (−126 ms) y la energía confirmó el golpe en 0,98 s, igual que la maqueta. Todo a −14 LUFS. Si el operador la aprueba, la sesión de motion la integra al taller (`tools/glitch-motion/src/music.mjs`).
- Glitch, ronda 8 (2026-09-27): cuadros del video contra el audio — quiebre en 4,0 s, manzana en 4,8 s (el único sub), «se abre» en 5,5 s, silencio digital en 6,8 s (vlog); el pre-roll corta a silencio justo antes de la apertura. −14 LUFS, pico −1 dBFS.
- Glitch, ronda 9 (2026-09-27): las cuatro re-grabaciones quedaron alineadas a la grilla (0 a 5 ms) antes de cortarlas; −14 LUFS. El espectrograma pasó de líneas de tono puro (lo arcade) a textura de banda distorsionada; el juicio es del operador.
- **Sin verificar:** si suena propio, si se recuerda, si se siente Efeonce. Nadie de esta sesión escuchó el audio.

## Trampas

- El conector MCP de ElevenLabs tiene mal la credencial: le cargaron el ID de la clave, no la clave `sk_…`
  (`api_key_id_used_as_api_key`). Mientras no se corrija, ElevenLabs va por fal.
- `tsx` con el shim compila a CJS: sin top-level await (envolver en `main()`).
- Dos MP3 del mismo largo pesan igual (tasa fija); verificar con hash, no con el tamaño.

## Siguiente

Con el territorio, la voz y el acento por línea elegidos: pieza larga (30–60 s) sobre el motivo, cortinillas para
Glitch, re-sonorizar reveal y apertura, y llevar los valores a tokens AXIS (`efeonceGraphicLine.motion.sound`)
con su guía de identidad sonora.
