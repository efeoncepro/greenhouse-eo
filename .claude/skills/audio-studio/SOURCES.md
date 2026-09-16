# SOURCES — audio-studio

> **Núcleo verificado as-of 2026-07.** El **craft** (señal, mezcla, mastering, dirección de voz,
> loudness) es **estable**. Lo **volátil** es el **landscape de audio IA** y — **crítico** — el
> **LICENCIAMIENTO** de música/voz IA (cambia por trimestre; equivocarlo es caro legalmente).
> Regla dura: nunca cites de memoria un modelo, versión, feature **ni qué licencia aplica** —
> corre `WebSearch`/`WebFetch` y actualiza el `as-of` inline.

## Tabla de volatilidad por tema

| Tema | Volatilidad | Reverificar antes de afirmar… | Módulo |
|---|---|---|---|
| Fundamentos (señal, gain staging, espectro, dinámica) | **estable** | — | 01 |
| Dirección de voz / mic technique / sala | **estable** | — | 02 |
| Mezcla / mastering / EQ / compresión | **estable** | — | 09 |
| Targets de loudness por plataforma | **semestral** | valores LUFS/dBTP exactos | 09 |
| Estándares de audiolibro (ACX-style) | **anual** | RMS/pico/piso de ruido | 08 |
| Qué modelo de voz IA lidera / features | **volátil (mensual)** | ElevenLabs/Seed Audio, versiones, cloning | 03 |
| Qué modelo de música IA lidera | **volátil (mensual)** | Suno/Udio/ElevenLabs Music, calidad | 04 |
| **LICENCIAMIENTO de música/voz IA** | **volátil (trimestral) — CRÍTICO** | qué se puede usar comercialmente, settlements | 03, 04, 10 |
| Pricing de modelos IA | **volátil (mensual)** | $/min, tiers | 10 |
| Capacidades MCP (Higgsfield/Adobe audio) | **trimestral** | qué tool hace qué | 10, STUDIO_TOOLING |

## Acceso programático — Fal.ai API (desde 2026-07-06)

Además de ElevenLabs MCP, Greenhouse tiene un **path API a Fal.ai** — agregador que también hostea modelos de audio (TTS, música, SFX) junto a imagen/video. Cliente canónico `src/lib/ai/fal.ts` (`runFalModel({ model, input })`, pasas el slug fal). **Ojo con LICENCIAMIENTO** (regla dura de esta skill): el modelo hosteado en fal conserva su propia licencia comercial — verificarla igual que si lo corrieras directo, fal no la cambia. Secretos server-side `FAL_API_KEY` / `FAL_API_KEY_B` vía `*_SECRET_REF` (dos cuentas con failover por saldo desde 2026-09-16), nunca hardcodear; producción out-of-band. Catálogo completo de modelos + slugs (TTS, música/SFX, STT, voice-changer, isolation): `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §8-10. Contrato: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

**Slugs de audio verificados en vivo (2026-07-19).** **Seed Audio** (ByteDance) NO vive en `bytedance/seed-audio` (da 404); vive en **`fal-ai/seed-audio`** — **CON** el prefijo `fal-ai/` (el prefijo depende del ENDPOINT, no del proveedor: Seedream 5 y Seedance 2.x van sin él; Seedream 4/4.5 y Seedance v1/v1.5, con él) y usa el campo **`prompt`**. **ElevenLabs** verificado en vivo: TTS **`fal-ai/elevenlabs/tts/multilingual-v2`**, **`fal-ai/elevenlabs/sound-effects`** y **`fal-ai/elevenlabs/music`** (todos con prefijo `fal-ai/`). **Método barato para chequear un slug sin gastar:** `POST {}` (body vacío) a `https://fal.run/<slug>` → **404** = la app no existe · **422** = la app existe (falló la validación de input por falta de campos).

**Audio que llega pegado al video (2026-09-16).** Minimax H3 (`pnpm ai:fal --capability h3*`) no expone toggle de audio pero **entrega el video con pista de audio** (soundscape/música generados, descritos en `expanded_prompt`); verificado en 9 corridas reales. No es un motor de audio: si la pieza lleva mezcla, voz o música licenciada, trata esa pista como provisional y reemplázala en post. Fuentes: OpenAPI de fal por endpoint + corridas reales; detalle en `motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`.

**Wan 3.0 y la pista de audio (2026-09-16).** Wan 3.0 (`pnpm ai:fal --capability wan3-*`) genera audio por defecto con el campo `audio` (no `generate_audio`); `--no-audio` lo apaga. Los 6 endpoints quedaron verificados en real 2026-09-16 (`wan3-t2v`: 854×480 con audio); en r2v acepta hasta 5 `--audio` de referencia (≤ 15 s en total, leído del OpenAPI; el uso con audio de referencia no consta en las corridas). Igual que en H3 y Flux 3, esa pista es provisional si la pieza lleva mezcla, voz o música licenciada. Detalle en `motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`.

**Flux 3 y la pista de audio (2026-09-16).** Flux 3 (`pnpm ai:fal --capability flux3-*`) genera audio por defecto (`--no-audio` lo apaga). **`flux3-extend` exige que el video de origen traiga pista de audio, aunque sea silencio:** con un origen mudo fal encola y luego rechaza con un 422 genérico (aislado en corridas reales). Si el origen salió con `--no-audio`, agrégale una pista silenciosa antes de extender; el audio generado sigue siendo provisional y se reemplaza en post. Por qué lo exige: la continuación usa **hasta 4 s del video y de su audio** como contexto [oficial BFL]; es decir, el audio del origen **condiciona** el audio de la extensión, y la salida es sólo la continuación (unir origen y continuación en post, cuidando el empalme de audio).

**Qué motor de video genera audio y cómo apagarlo (resumen 2026-09-16).** Guía canónica de selección:
`docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`.

| Motor (`pnpm ai:fal`) | ¿Genera audio? | ¿Apagable? | Cómo | Notas [fuente] |
|---|---|---|---|---|
| Seedance 2.5 / 2.0 (base, fast, mini, us) | Sí, conjunto con el video | Sí | `--no-audio` (campo `generate_audio`) | Diálogo entre comillas → voz y labios sincronizados; 24 fps [oficial fal]. r2v acepta `--audio` de referencia (2.5: 10; 2.0: 3) |
| Minimax H3 (base, Max, Max Turbo, camera) | Sí, **siempre** (estéreo 48 kHz: voz, efectos y música) | **No** | — (no hay toggle) | Reemplazar en post si hay diseño sonoro [oficial MiniMax; verificado 9 corridas] |
| Flux 3 (finales, drafts, extend) | Sí, por defecto (diálogo con lip sync, efectos, ambiente) | Sí | `--no-audio` | `extend` exige audio en el origen y lo usa como contexto; `edit`: si conserva el audio, sin dato. Idiomas: BFL lista español, fal dice "inglés principal" → probar español antes de prometer diálogo [oficial] |
| Wan 3.0 / Prime | Sí, por defecto (diálogo, BGM, efectos) | Sí | `--no-audio` (campo `audio`) | 30 fps; Alibaba reconoce que la textura del audio aún no está donde la quieren [oficial] |
| Gemini Omni Flash | Sí (reference/video edit + audio) | — | Directo por Google, sin CLI | — |

Regla: en toda pieza con mezcla, voz, música licenciada o loudness de entrega, el audio generado es **provisional**.
Si no lo vas a usar, apágalo en los motores que lo permiten (no ahorra por sí mismo un costo documentado: sin dato)
y en H3 descártalo en post.

## Fuentes base (as-of 2026-07)

**Música IA + licencia**
- AI Magicx — Suno vs Udio vs ElevenLabs Music 2026 — https://www.aimagicx.com/blog/suno-vs-udio-vs-elevenlabs-music-comparison-2026
- Dubspot — AI Music Licensing Explained 2026 — https://blog.dubspot.com/ai-music-licensing-explained-2026
- DigitalApplied — AI Music Generation 2026 — https://www.digitalapplied.com/blog/ai-music-generation-platforms-suno-udio-elevenlabs-2026

**Voz IA (ElevenLabs) + Seed Audio**
- ElevenLabs — Text to Speech docs — https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- Coval — ElevenLabs Review 2026 (v3, Scribe, Agents) — https://www.coval.ai/blog/elevenlabs-review-2026-voice-cloning-and-synthesis-capabilities-explained
- MindStudio — What Is Seed Audio 1.0 (ByteDance) — https://www.mindstudio.ai/blog/what-is-seed-audio-1-0-bytedance
- ByteDance Seed — modelos — https://seed.bytedance.com/en/models

**Producción (craft): podcast, VO, mezcla, mastering, sonic branding**
- NextMedia London — Podcast Editing Workflow 2026 — https://nextmedia.london/podcast-editing-workflow-2026/
- iZotope — Tips to Record Professional-Quality Voice Over at Home — https://www.izotope.com/community/blog/tips-to-record-professional-quality-voice-over-at-home
- Sonarworks — Recording Vocals at Home (mic/room) — https://www.sonarworks.com/blog/learn/recording-vocals-at-home-microphone-room-tips
- Soundplate — Streaming Loudness LUFS Table 2026 — https://soundplate.com/streaming-loudness-lufs-table/
- Stephen Arnold Music — State of Sonic 2026 (sonic branding trends) — https://stephenarnoldmusic.com/the-state-of-sonic-2026-trends-in-sonic-branding/

## Matriz de modelos de AUDIO IA (as-of 2026-07 — SoT; reverificar mensual + licencia)

> Regla 2026: **no te cases con un modelo — elige por tarea Y por licencia.** Para todo lo
> comercial/cliente, la **licencia decide la herramienta** más que la calidad.

### Voz (TTS / cloning / dubbing)

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **ElevenLabs v3** | expresividad (audio tags `[whispers]/[laughs]`), multi-speaker, 70+ idiomas, cloning IVC/PVC, dubbing que preserva voz | **no real-time** | VO/narración/dubbing de producción; el default de voz |
| **ElevenLabs Flash v2.5** | **real-time** (~75ms), 32 idiomas | menos expresivo que v3 | agentes de voz en vivo / latencia baja |
| **Seed Audio 1.0** (ByteDance) | **unificado**: diálogo multi-personaje + música + SFX + ambiente en una pasada; cloning zero-shot; cross-lingual; hasta 2 min; ~$0.18/min | ecosistema nuevo | prototipado rápido de escena de audio completa; multi-voz |
| **Higgsfield audio** (MCP) | `create_voice`, `voice_change`, `dubbing`, `generate_audio` bajo el mismo pipeline | — | cuando ya trabajas en Higgsfield (video+audio) |

- **Cloning:** **IVC** (Instant, muestra sub-minuto) para rapidez/testing; **PVC** (Professional, 3–6h)
  para calidad casi indistinguible. **Ambos exigen consentimiento explícito del dueño de la voz.**

### Música

| Modelo | Fuerte en | Licencia *(as-of 2026-07 — reverificar)* | Cuándo usarlo |
|---|---|---|---|
| **ElevenLabs Music** | calidad comercial | **licencia comercial desde día 1** (partnerships con sellos) | **cliente / comercial / monetizado — el seguro** |
| **Suno** (v4.5/v5) | **mejor calidad de output** (géneros, letras, prompt-following) | asentándose (demandas de training-data; settlements con sellos a fin 2025) | calidad / interno / no-comercial |
| **Udio** | calidad + **historia de licencia limpia** (UMG settled oct-2025; plataforma UMG×Udio 2026) | más clara que Suno | cuando quieres calidad con licencia más clara |
| **Seed Audio 1.0** | música + SFX + diálogo integrados | vía Volcano Ark (verificar términos) | escena de audio completa en una pasada |

### SFX y enhance/restore

| Herramienta | Qué hace |
|---|---|
| **ElevenLabs SFX / Seed Audio** | generación de efectos de sonido |
| **Adobe `media_enhance_speech`** (MCP) | enhance/limpieza de voz grabada |
| **Higgsfield `enhanceSpeechPoll`** (MCP) | enhance de speech |
| **iZotope RX** (humano) | restauración pro (de-noise/de-click/spectral repair) |

## Targets de loudness (as-of 2026-07 — reverificar semestral)

| Destino | Loudness integrado | True peak | Nota |
|---|---|---|---|
| **Música streaming** | **-14 LUFS** (Spotify/YouTube/Tidal/Amazon) | -1 dBTP (Amazon -2) | Apple ~-16; el rango dinámico es ventaja |
| **Podcast** | **-16 LUFS mono / -19 LUFS stereo** | -1 dBTP | voz a -16 ref; música bajo voz -18/-20 dB |
| **Broadcast** | **-23 LUFS** (EBU R128 / CALM Act) | -1 dBTP | TV/radio |
| **Audiolibro** (ACX-style) | RMS -23 a -18 dBFS | pico máx -3 dBFS | piso de ruido ≤ -60 dBFS |

## Doctrina estampada (as-of 2026-07 — reverificar según tabla)

- El craft manda sobre el modelo · voz IA es tier producción (v3 audio tags) · música IA reemplaza
  stock **pero la licencia decide la herramienta** (ElevenLabs Music = comercial seguro) · Seed Audio =
  audio unificado en una pasada · **consentimiento + licencia no son opcionales** · sonic branding =
  sistema, no logo suelto · loudness por destino · IA + humano.
- Craft de grabación: 24-bit/48kHz, picos -20 a -12 dB; mic 15-20cm off-axis + pop filter; **la sala
  importa más que el mic**; noise reduction en pasadas ligeras múltiples.
