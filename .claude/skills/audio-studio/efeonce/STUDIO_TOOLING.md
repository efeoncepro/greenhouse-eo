# STUDIO_TOOLING — el pipeline real de ejecución

> Lo que vuelve a `audio-studio` un **estudio** y no un PDF: cablea las herramientas conectadas en
> el loop **idear → guion/brief → producir → editar → mezclar → masterizar → entregar**. Reverifica
> capacidades **y licencias** de cada modelo/MCP (cambian por mes/trimestre — ver `SOURCES.md`).

> **Frontera económica.** Antes de generar carga `../modules/11_STUDIO_CREDITS_AND_RIGHTS.md`.
> Credits miden la operación generativa por segundos/tier/attempt; edición, cleanup determinístico,
> mix/master, loudness, stems y export consumen `0 credits` aunque sí capacidad. Estimate/reservation/
> approval preceden la ejecución; settlement/release/refund siguen al review. No hay tarifa pública aprobada.

## El loop y qué corre cada paso

| Paso | Herramienta / skill | Qué hace |
|---|---|---|
| **Idear / dirigir** | esta skill (`../modules/`) + `templates/` | concepto sonoro, brief, guion+dirección |
| **Guion / copy** | `copywriting` | el texto del VO/podcast (esta skill dirige la performance) |
| **Producir voz** | **ElevenLabs** (v3/Flash, IVC/PVC, dubbing, voice design) · **Seed Audio 1.0** · **Higgsfield** (`create_voice`/`voice_change`/`dubbing`) | TTS, cloning, doblaje |
| **Producir música** | **ElevenLabs Music** (comercial) · **Suno/Udio** (interno) | jingle, track, score |
| **Producir SFX** | **ElevenLabs SFX** · **Seed Audio** · foley/librería | efectos, ambiences, stingers |
| **Enhance / restaurar** | **Adobe** `media_enhance_speech` · **Higgsfield** `enhanceSpeechPoll` · iZotope RX (humano) | limpiar voz grabada |
| **Editar / mezclar / masterizar** | DAW (humano) + Auphonic | montaje, mezcla, loudness al target |
| **Sonido a-picture** | `motion-design-studio` (07) | sincronizar a video (esta skill le da el craft) |

## ElevenLabs (MCP / API) — la mano de voz y música

- **Voz:** v3 (audio tags `[whispers]/[laughs]`, multi-speaker, 70+ idiomas, **no real-time**) ·
  Flash v2.5 (**real-time** ~75ms, 32 idiomas) · cloning **IVC** (sub-minuto) / **PVC** (3-6h) · **dubbing**
  que preserva la voz cross-idioma · **voice design** (crear voz custom). Precios bajaron ~55% (may-2026).
- **Música:** **ElevenLabs Music** = **licencia comercial desde día 1** → el default para jingles/cliente.
- **Conector ElevenLabs Creative (MCP de sesión) con `eleven_v4` [verificado 2026-10-03, spot «Sparks × Efeonce
  AEO»]:** más expresivo que v3 para narración. Flujo: `creative_list_voices` → voz por **ID** (la elegida fue «Andre –
  Clear Studio Voiceover Narration», `K7vlllngMGapgRQRDsqK`, es-latam, de la biblioteca; **no es** la «Andre» preset de
  Higgsfield) → `creative_generate_speech` con `eleven_v4` dentro de un flow (`creative_*`). Etiquetas de interpretación
  usadas: `[excited]` `[curious]` `[warmly]` `[dramatically]` `[fast]`. `generations_count` viene en 4 por defecto:
  pedir **2** tomas por línea. `estimate_only` dio 71 créditos por toma corta (~USD 0,016), pero el run **reportó 0
  créditos**: anotar los dos números y no prometer el costo. Sin ASR local, el texto dicho no se verifica solo: la
  escucha del operador es el control. Es out-of-band (sin presupuesto gobernado ni manifiesto).
- **Locución comercial para un mercado: voz de ese país, registro de locutor [operador, 2026-10-12].** Para el reel
  de muestra de una marca mexicana que pauta en TV: «tiene que ser de un mexicano (no coloquial) y… el motor más
  avanzado de Eleven Labs que es el V4». Regla: la voz se elige **por país del público** y en registro **profesional,
  no coloquial**; el motor por defecto para locución comercial por este conector es `eleven_v4`. Voz usada: **«Marco»**
  (locutor mexicano), id `fjL3LsPhPx7Isgj2S7NE`; siempre por **ID**. Se generó una toma y el montaje la cortó por frases
  (`vo.mp3`: 18 s, mono, 44,1 kHz [medido]). «El más avanzado» es la indicación del operador a esa fecha: reverificar
  el catálogo antes de repetirlo como hecho. El agente no oyó la toma: acento, registro y pronunciación los aprobó el
  operador al aprobar el reel.

## Higgsfield audio (MCP conectado)

`generate_audio`, `create_voice`, `create_voice_from_confirmed_audio`, `list_voices`, `dubbing`,
`voice_change`, `enhanceSpeechPoll` — útil cuando ya produces video en Higgsfield (audio+video en un pipeline).
La CLI `higgsfield` (con sesión desde 2026-09-24) lista `dubbing` y `voice_change` entre sus workflows cloud como
carril independiente del MCP; estado en `higgsfield-provider` §Estado local verificado.

## Seed Audio 1.0 (ByteDance, vía Volcano Ark / agregadores)

Modelo **unificado**: diálogo multi-personaje + música + SFX + ambiente en **una pasada**; cloning
zero-shot; cross-lingual; hasta 2 min; ~$0.18/min. Ideal para **prototipar una escena de audio completa**
o multi-voz rápido. Verificar términos de licencia antes de uso comercial.

## Adobe (MCP)

`media_enhance_speech` — enhance/limpieza de voz grabada (útil para VO/podcast con ruido).

## Rutas vía fal verificadas (2026-09-26)

Medidas al producir la identidad sonora de Efeonce (`EFEONCE_OVERLAY.md` §Identidad sonora). Scripts en
`ai-generations/2026-09-26_branding-sonoro/motor/` (los scripts están en git; maquetas, tomas re-grabadas y masters
que leen, no: si faltan en disco, `pnpm ai-gen:pull ai-generations/2026-09-26_branding-sonoro/<subcarpeta>` antes de correrlos):

| Ruta | Modelo fal | Lo medido | Script |
|---|---|---|---|
| TTS | `fal-ai/elevenlabs/tts/eleven-v3` | input `voice` por nombre (Brian = la de fábrica `nPczCjzI2devNBz1zQrb`; en el conector de ElevenLabs, siempre por ID: hay 25 «Brian») | `voz.ts` |
| STT | `fal-ai/elevenlabs/speech-to-text` | devuelve `words` con `start`/`end`: sirve para caer la esfera sobre una palabra | `transcribir.ts` |
| Música | `elevenlabs/music/v2.5` (sin prefijo `fal-ai`; USD 0,60/min) | acepta `composition_plan.chunks[].audio_reference` (`strength` low\|medium\|high\|xhigh, ventana ≤ 30 s, líneas ≤ 200 caracteres). Suena más producido pero **no respeta la estructura**: con high/xhigh se saltó el corte y el golpe final. **ElevenLabs Music v3 NO está en fal** | `ai-music.ts` |
| Re-grabación | `fal-ai/stable-audio-25/audio-to-audio` (USD 0,20 por pieza) | **conserva el tiempo al milisegundo** (golpe 32,874 s vs 32,875 de la maqueta); **redondea la duración a segundos enteros** (8,5 → 8): maquetas de duración entera | `ai-music.ts` |
| Cambio de estilo de una pieza del kit (2026-10-03, spot Sparks) | `fal-ai/stable-audio-25/audio-to-audio` (USD 0,20 por pieza) | rock de energía (120 BPM) → **punk**: reordenar la fuente oficial (56 s) y **acelerarla** con `atempo=1.3333` a 160 BPM y 42 s exactos; strength 0,65 y 0,8, elegida **0,8**. **Conserva el tempo acelerado** (autocorrelación fuerte a 80 = medio compás de 160): el tempo se cambia en la referencia, no en el prompt. **Salió con graves de más** (medios 21 % vs ~35 %) → EQ −4 dB bajo 180 Hz, +2 dB a 2,5 kHz. Licencia comercial vía fal sin confirmar | `ai-generations/2026-10-03_sparks-aeo-60s/audio/musica/regrabar-punk.ts` |
| Cama desde texto (**sólo Glitch**, 2026-09-27) | `elevenlabs/music/v2.5` (`--route el-bed`) · `fal-ai/stable-audio-25/text-to-audio` (`--route sa-bed`) | sin maqueta, desde estilos + negativos (`--plan <cama>`, `--seconds`, `--seed`). La **cama post-punk aprobada** salió de `--route el-bed --plan cama-postpunk`, seed 7, 32 s (negativos: vocals, singing, chiptune, video game, 8-bit, synthwave, arcade, lead synth, EDM drop): `composition_plan` de un tramo **sin referencia de audio** dio instrumentos reales y tempo exacto (150,00 BPM medido) con 38 % de medios. `--route sa-bed` también dio camas con cuerpo (36–37 % de medios), no elegidas | `ai-music.ts` |

- **Espera y recuperación:** `runFalModel` espera 120 s por defecto; para música usa `pollTimeoutMs` mayor. Un
  trabajo vencido se recupera **sin volver a pagar** con `awaitFalRequest` (`recuperar.ts`). Costo: `precio.ts`.
- **Conector MCP de ElevenLabs (local):** credencial mal cargada (se cargó el ID de la clave, no la clave `sk_…`; error
  `api_key_id_used_as_api_key`). Seguía igual el 2026-10-03 (no se tocó). Mientras no se corrija, ElevenLabs va por fal
  o por el conector **ElevenLabs Creative** (arriba), que sí funciona.
- **Delta 2026-10-09 (reel X-Ray Pibank):** los dos conectores locales (`elevenlabs` y «ElevenLabs Player») seguían con
  la clave mal (ID en vez de `sk_…`). La música salió por el **remoto oficial**: `creative_generate_in_flow`, nodo
  `music`, modelo `eleven_music_v2_5`, ≈ US$0,35 por pista y ≈ 5–7 min por generación. Antes de declarar bloqueo,
  probar los demás conectores del mismo servicio. **Ausencia de voz:** verificada con `whisper-cli` local (modelos en
  `~/.cache/hyperframes/whisper/models/`); es señal ASR, no escucha. Mezcla a −16 LUFS (medido −15,5) para el
  reproductor web de la muestra. Receta: `motion-design-studio/workflows/approved-photos-to-vertical-reel-with-logo-transition.md`.
- **Delta 2026-10-12 (reel de muestra Sika, 25 s) — estado de herramientas a esa fecha; puede cambiar:**
  - Los **dos servidores MCP locales** de ElevenLabs (`elevenlabs` y «ElevenLabs Player») fallan con `invalid_api_key`:
    tienen cargado el id de la clave, no la `sk_…`. Es la misma causa ya registrada el 2026-10-03 y el 2026-10-09
    (entonces el error se anotó como `api_key_id_used_as_api_key`).
  - **Funciona el conector de claude.ai:** voz con `creative_generate_speech` (modelo `eleven_v4`); música con
    `creative_generate_in_flow`, nodo `music`, modelo `eleven_music_v2_5` (instrumental); el avance se sondea con
    `creative_get_flow_run_status` hasta que termina. Es out-of-band: sin presupuesto gobernado; costo no registrado.
  - La música pedida para 25 s **salió de 43 s**: se usa un tramo continuo, no se reedita
    (`APPROVED_MUSIC_CONTINUITY.md` §«Pista generada más larga que el video»).
  - **Mezcla en ffmpeg:** `amix` deja la salida en **mono** si la voz es mono: poner
    `aformat=channel_layouts=stereo` después de cada `amix`. Cierre con `loudnorm` y `aresample=48000`. El caso usó
    `loudnorm=I=-15:TP=-1.5:LRA=11` en una pasada: es el parámetro que usó el caso, no un target ni una medición del resultado; para video y redes la
    norma pide −14 LUFS y `master.sh` lo hace en dos pasadas. `bc` imprime `.70` y rompe `afade st=`: calcular con
    `awk 'BEGIN{printf "%.2f", …}'`.
  - **Sin escucha propia:** sincronía de voz, golpes y música las juzgó el operador. Receta completa:
    `motion-design-studio/workflows/client-sample-reel-stills-to-clips-with-brand-motion-overlay.md`.
- **Delta 2026-10-21 (serie de anuncios «Efeonce | Partner», piezas de 8 s sin voz; caso fuente AWS):** método en
  `docs/operations/social/2026-10-21-aws-partner-announcement-production-method.md` (§«Grilla» y §«Producción»);
  fuentes en `ai-generations/2026-10-21_aws-partner/` (`audio-cues.json`, `audio/mezcla.sh`).
  - **Grilla de la serie, 120 BPM** (tiempo = 0,5 s): golpe 1 en **2,0 s** con **silencio absoluto** de 1,75 a 2,0
    (medido a −inf); golpe 2 en **4,0 s**; vacío de la mezcla de 4,6 a 4,98; pico del sting de Efeonce en **5,0 s**
    (`ai-generations/2026-10-20_byteplus-partner/audio/efeonce-sting.wav`, pico en 0,59 s → el archivo entra en
    4,41); el lockup firma en `T_SIGN` 4,65.
  - **La música se alinea midiendo el drop, no por la duración pedida.** AWS eligió la pista B porque tenía el build
    más fuerte y el drop en el segundo 10,0 exacto (pico de −1 dB), y se armó por tramos: build 0–1,75, silencio
    absoluto 1,75–2,0, drop en 2,0 y reiniciado en 4,0.
  - **ElevenLabs (flows de claude.ai) no entrega las duraciones pedidas:** varios SFX de «2 s» o «3 s» salieron de 1 s.
    Medir onset y pico de cada archivo con `astats` (ventanas cortas; el caso usó 50 ms para silencios y golpes) antes de
    ubicarlo en la grilla. Riser, aire y sub se sintetizaron con `aevalsrc` y `anoisesrc`.
  - **Mezcla en dos pasos:** un grafo con **dos `amix`** produjo una salida de 0,11 s. Primero el bus con **un solo
    `amix`** y el ducking por expresión de `volume`; después, en otra pasada, el sting.
  - **Master:** medir con `loudnorm` → aplicar la ganancia hasta **−14 LUFS** → `alimiter`. AWS cerró en −14,1 LUFS y
    −2,2 dBTP.
  - **`pnpm ai:listen` (Gemini) sirve de criterio, no de medición:** su observación de que el cierre se sentía estático
    era real y se aplicó; su pedido de «profundizar el silencio» no, porque el silencio medía −inf. Todo tiempo o
    nivel que afirme se verifica con ffmpeg antes de actuar. Desde la v2 lo hace la propia CLI: `--verify` (silencio,
    golpe, desfase) y `--cues audio-cues.json` (cada cue de la grilla medido sin depender del modelo); la mezcla se
    pasa como WAV aparte porque el audio de un video le llega a 1 kbps mono.
  - **zsh en las recetas:** `$R:a` y `$BG:s` son modificadores (ruta absoluta y sustitución), no texto: `r=$R:a=0.5`
    se expandió a una ruta. Siempre `${VAR}` antes de `:`.
- **Método «maqueta propia → re-grabación IA → sello propio encima»:** la estructura y el tiempo salen de una
  maqueta determinística propia (`rock.mjs`, `composer.mjs`, `dsp.mjs`); Stable Audio 2.5 audio-to-audio la
  re-graba (intensidad 0,7) conservando el tiempo; la esfera propia (campana La + golpe grave) se monta encima
  como pista (`sello.mjs`). Masterización por destino con `master.sh <in> <out> <LUFS> [shelf]`
  (loudnorm en dos pasadas, por sonoridad, nunca por pico). Logo/sting/reveal/apertura: `sonic-engine.mjs`.

## Motores de síntesis propia (sin fal, sin muestras)

Viven en `ai-generations/2026-09-26_branding-sonoro/motor/` junto a los de arriba; costo de proveedor cero.

| Script | Qué genera | Notas |
|---|---|---|
| `glitch-sfx.mjs` | **Sólo Glitch, APROBADO en su versión B** (2026-09-27; nunca Efeonce): el diseño sonoro de Glitch — `apertura.wav`, `cierre.wav`, `bucle.wav`, `animatic.wav`, `kit/<overlay>.wav` (uno por `.mov`), `transiciones/<reel\|vlog>/…wav` y `demos/`. **Histórico:** ya migrado al taller `efeonce-brand-workshop` (commit `2d411b8`, 2026-09-27) como `tools/glitch-motion/src/sound.mjs`; esta copia (`node …/motor/glitch-sfx.mjs --intensity b --outdir <dir>`) ya no es la fuente. Regenerar = correr el mismo comando de `glitch-motion` (`render`, `kit`, `transiciones` o `heroe`, p. ej. `pnpm -C ../efeonce-brand-workshop --filter glitch-motion kit -- …`), que entrega el WAV B junto a cada `.mov` | **Determinístico** (mismo comando, mismo archivo; la migración fue fiel: los 30 WAV de la B salen idénticos byte a byte). En el taller lee todos los tiempos del código (`TIMING`, `KIT_TIMING`, `APPLE_BYTES`, `ANIMATIC` y `schedule()`). Reglas en `EFEONCE_OVERLAY.md` §Glitch |
| `glitch-theme.mjs` | **Sólo Glitch, APROBADO** (2026-09-27): el tema B (intro, cortina, salida) en tres etapas: `--stage maqueta` (banda propia) → re-grabación con IA (`ai-music.ts --route sa --plan tema-b --strength 0.7–0.75`) → `--stage final --piece intro\|cortina\|salida --version vlog\|podcast --from <regrabado> [--apertura\|--cierre glitch-sfx/b/…]` | Cortes, tartamudeo de búfer y silencio digital sobre la grabación real; apertura/cierre B intactos; sub sólo en la manzana. **No es la fuente:** las piezas aprobadas son los másteres del bucket `glitch/music/v1/` (URL + sha256); nunca se regeneran. Reglas en `EFEONCE_OVERLAY.md` §Glitch |
| `glitch-cama-bucle.mjs` | **Sólo Glitch, APROBADO** (2026-09-27): el bucle sin costura de la cama post-punk bajo la noticia (`--start 0.83 --bars 12` = 19,2 s a 150 BPM), fundido de potencia constante de 30 ms en la juntura, máster −16 LUFS con `master.sh` | **Determinístico** (dos corridas, mismo sha256). Parte de la toma de `ai-music.ts --route el-bed`; el máster aprobado vive en el bucket, `masters/glitch-cama-bucle.wav` |
| `dsp.mjs` | primitivas compartidas (tono, ruido, modal, tick, colocación estéreo, escritura WAV) | `write()` ahora acepta **ganancia fija** (`gain`: todas las pistas con la misma escala, sin normalizar por pico) y **corte en seco** (`gate(t)`: multiplicador final que también se lleva la cola del halo); hay **`addMono`** para colocar un segmento mono con paneo. **La versión viva está en `tools/brand-sound` del taller `efeonce-brand-workshop`** (pasó sin cambios, con pruebas; commit `2d411b8`); si migra el motor de la identidad sonora de Efeonce, que use esa (una sola lógica) |

## Música de Glitch en el taller y en AXIS (sólo Glitch, 2026-09-27)

Los scripts de arriba produjeron los másteres; **quien los entrega hoy es el taller**, y nunca los regenera.

| Dónde | Qué | Uso |
|---|---|---|
| Taller `efeonce-brand-workshop` → `tools/glitch-motion/src/music.mjs` | fija los siete másteres por URL + sha256 (`MUSIC_V1`, bucket `glitch/music/v1/`); los baja y verifica; si el bucket cambia, falla | lo usan `render` (pre-roll animado de la intro, intro y salida con sus efectos ya montados, versiones de podcast; **sin** `apertura.wav` ni `cierre.wav`) y `kit` (cama, cortina y animatic de 48,4 s). **`--music off`** apaga la música. Comando tipo: `pnpm -C ../efeonce-brand-workshop --filter glitch-motion kit -- …`. README: `tools/glitch-motion/README.md` §«Música» |
| Taller → `tools/glitch-motion/src/sound.mjs` sobre `tools/brand-sound` | el diseño sonoro (golpes y falla) | suma un animatic sin apertura ni cierre para la mezcla con música |
| AXIS | `https://axis.efeonce.org/references/glitch/#sonido` y `#musica`; `/references/glitch.json` → `sound` y `music`; buckets `glitch/sound/v1/` y `glitch/music/v1/` (éste con `index.json`) | la fuente por URL + sha256 para agentes y editores |
| Greenhouse `ai-generations/2026-09-26_branding-sonoro/` | `motor/glitch-theme.mjs`, `motor/ai-music.ts` (`--route sa`, `el-bed`, `sa-bed`), `motor/glitch-cama-bucle.mjs`, `motor/master.sh`; `glitch-sfx.mjs` y `dsp.mjs` históricos; `LEEME.md` | producción de una **ronda nueva** (la aprueba el operador), nunca para rehacer un máster aprobado; si un `--from` no está en disco, `pnpm ai-gen:pull`, nunca regenerarlo |

Comandos del taller para el audio de Glitch (desde `greenhouse-eo`, prefijo
`pnpm -C ../efeonce-brand-workshop --filter glitch-motion`): `render`, `kit`, `transiciones` y `heroe` entregan el WAV
junto a cada `.mov` con `--sound b|a|off` (**`b` por defecto**, la aprobada) y `render`/`kit` la música con
`--music on|off` (**`on` por defecto**); `sonido` rehace sólo el set de WAV sin render de video; `--skip-render`
(`kit`, `transiciones`) reutiliza los `.mov` y rehace verificaciones, WAV, vistas previas y entrega. Tabla completa de
argumentos: norma de Glitch §13.13. Mezcla de la cama (−15 dB bajo la voz, ducking 0,05 / 3:1 / 15 ms / 350 ms, sin
recortar medios, nunca bajo el Drop): `EFEONCE_OVERLAY.md` §Glitch.

**QA sin oído** (el agente no escucha): ebur128 (sonoridad), autocorrelación de ataques (tempo), balance espectral por
bandas (medios 300 Hz–3 kHz ≥ ~35 %), juntura del bucle (transiente contra un tiempo fuerte normal) y sha256
descargando del bucket. `pnpm ai:listen` aporta una escucha de criterio, pero sus tiempos y niveles se contrastan con
ffmpeg; `pnpm ai:listen --cues … --measure-only` mide la grilla sin Gemini en menos de 1 s (código 2 si una cue falla), y
`--preset sync --verify` suma la opinión de Gemini (delta 2026-10-21). Cómo suena lo aprueba siempre el operador. Reglas en `EFEONCE_OVERLAY.md` §Glitch.

## Router de producción (elige la mano correcta)

- **VO/narración de producción** → ElevenLabs v3 (o humano si es marca premium con emoción). **Locución comercial por
  el conector de claude.ai** → `eleven_v4`, por indicación del operador del 2026-10-12 (arriba); v3 sigue siendo la
  ruta medida por fal.
- **Voz en tiempo real / agente** → ElevenLabs Flash v2.5.
- **Escena de audio completa / multi-voz rápida** → Seed Audio 1.0.
- **Música comercial/cliente** → **ElevenLabs Music** (licencia limpia). **Música interna/calidad** → Suno/Udio.
- **Doblaje multi-idioma** → ElevenLabs dubbing / Higgsfield.
- **Limpiar voz grabada** → Adobe `media_enhance_speech` / iZotope RX.
- **Sonido para un video** → coordina con `motion-design-studio` (esta skill aporta el craft).

## Reglas duras: gasto + licencia + consentimiento + confirmación

- **Gasto gobernado:** estima capability, segundos, tier y attempts; costo vendor es evidencia interna, no
  conversión a credits. Reserva y exige approval antes de ejecutar; concilia settlement/release/refund.
- **Licencia:** todo audio comercial/cliente exige **licencia verificada**; documenta la fuente. ElevenLabs
  Music es lo seguro; Suno/Udio verificar términos.
- **Consentimiento:** clonar una voz exige **permiso explícito** del dueño.
- **Confirmación humana:** entregar/publicar pasa **siempre** por aprobación del operador.
- **Retry/cambio:** falla técnica sin output útil no se cobra dos veces; guion/idioma/voz/mood nuevos tras
  aprobación requieren branch y estimate nuevo.
- **Rights separados:** consentimiento, licencia, sync/master, territorio, plazo, talento y buyout no se
  compran con credits.
- **Vertex/clientes LLM:** los clientes canónicos de IA viven en `src/lib/ai/*`; no instanciar SDK paralelo en un dominio.
