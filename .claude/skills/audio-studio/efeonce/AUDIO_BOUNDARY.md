# AUDIO_BOUNDARY — la costura completa

> Dónde termina `audio-studio` y empieza cada skill hermana. Regla de precedencia al final.
> El borde más fino es con `motion-design-studio` (sonido para video).

## La frase que resuelve el 80% de los casos

**`motion-design-studio` (módulo 07) hace sonido *sincronizado a la imagen* (mezcla a video, hit
points, LipSync); `audio-studio` produce *audio como pieza propia* (podcast, VO, música, jingle,
SFX, audiolibro, sonic branding) y es a quien ese módulo le DELEGA el craft de voz/música/SFX.**

## Tabla de hand-offs

| Si el trabajo es… | Pertenece a… | audio-studio aporta… |
|---|---|---|
| Sincronizar sonido a un **video** (mezcla a picture, hit points, LipSync a la toma) | `motion-design-studio` (07) | el **craft** y la producción de voz/música/SFX |
| **Formato/norma de audio por red social** (loudness de reel, trending sounds) | `social-media-studio` | el audio original/jingle/VO que la red usa |
| La **identidad visual** de marca | `design-studio` | el **sonic branding** que la acompaña (audio logo ↔ logo visual) |
| **Estrategia** de medios/campaña de audio (pauta radio/podcast) | `digital-marketing` | la producción del audio ad |
| La **integración de Nexa en producto** (chat, RAG, providers, voz en runtime) | `greenhouse-nexa-conversational` | el **asset de voz** de Nexa (TTS/persona sonora) |
| El **guion/copy fino** (VO script, storytelling del podcast) | `copywriting` | la **dirección de performance** + la producción |
| Doctrina de **marca/GTM/ASaaS** | `efeonce-agency` | la expresión sonora de esa marca |
| Producir el **audio IA** concreto | ElevenLabs/Higgsfield/Seed Audio/Adobe (MCP) | la dirección (concepto, voz, mezcla) |

## Zonas donde SÍ mandamos (para no regalarlas)

- Fundamentos de audio · dirección de voz + performance · voz IA (TTS/cloning/dubbing) · creación musical ·
  jingles + **sonic branding** · SFX + foley · producción de **podcast** · audio-narrativa (audiolibro/radiodrama) ·
  mezcla + mastering + loudness · orquestación del pipeline de audio IA + entrega.

## El borde con motion-design-studio (detallado)

- **`motion-design-studio`** decide cómo el sonido cae sobre la imagen (hit points, sync al corte, LipSync,
  mezcla a picture, loudness del entregable de video). Su output final **es un video con audio**.
- **`audio-studio`** decide y produce **el audio en sí** (la voz, la música, el jingle, el SFX, el podcast).
  Su output **es una pieza de audio** (o el craft de audio que motion consume).
- Flujo típico de un video: motion dirige la narrativa/picture → **le pide a audio-studio** la VO, la música y
  los SFX → motion los sincroniza y mezcla a la imagen. Un jingle o un podcast **son de audio-studio directamente**.

## El borde con nexa-conversational (voz de Nexa)

- **`audio-studio`** diseña/produce el **asset de voz** de Nexa: timbre, tono, idioma, audio tags, muestras.
- **`greenhouse-nexa-conversational`** decide cómo se **integra** en producto (elección de voz en runtime, TTS
  en el chat, providers, latencia). Coordina; no invadas su runtime ni su system prompt.

## Regla de precedencia

1. Si el output final **es un video con audio** → `motion-design-studio` (esta skill le da el craft de audio).
2. Si es **producto/runtime de Nexa** → `greenhouse-nexa-conversational` (esta skill le da el asset de voz).
3. Si es **formato por red** → `social-media-studio`. Si es **identidad visual** → `design-studio`.
4. Si es **producción de audio como pieza** (voz, música, jingle, SFX, podcast, sonic branding) → **esta skill manda**.
5. Ante duda genuina, nombra ambas y aclara el hand-off; no invadas silenciosamente.
