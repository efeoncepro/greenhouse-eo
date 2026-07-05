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
