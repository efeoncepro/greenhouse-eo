# Overlay Efeonce / Greenhouse — índice (audio-studio)

> Aterriza el conocimiento portable de audio en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van la marca, las herramientas y los boundaries reales.
> **Reverifica el estado en el repo y en las plataformas** (el landscape IA + licencias cambian rápido).

## Cuándo usar este overlay

Cuando el audio toca la marca Efeonce, sus canales/superficies (Think/Glitch/grader, sitio público,
Nexa) o un cliente Globe. Para audio genérico basta `../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `STUDIO_TOOLING.md` | El pipeline real: ElevenLabs + Higgsfield + Seed Audio + Suno/Udio + Adobe + craft humano. |
| `AUDIO_BOUNDARY.md` | La costura vs motion-design-studio / social-media-studio / design-studio / nexa-conversational / copywriting. |
| `CLIENT_DELIVERY.md` | Audio as-a-service para clientes Globe: jingles, dubbing multi-idioma, audio ads con licencia limpia. |

## Marca (dura)

- **Efeonce ≠ Greenhouse.** Greenhouse es el portal operativo interno (los clientes NO lo ven).
  Todo lo público/audio es **marca Efeonce** (agencia). SSOT: `src/config/efeonce-brand.ts`.
- **Sonic identity de Efeonce:** ver la sección «Identidad sonora de Efeonce» abajo (recomendada, NO canon).
- **Voz de Nexa:** `audio-studio` produce el **asset de voz** de Nexa (TTS/persona sonora — timbre, tono,
  idioma, audio tags), pero la **integración en producto** (chat, RAG, providers, elección de voz en runtime)
  es de `greenhouse-nexa-conversational`. Coordina; no invadas su runtime.

## Identidad sonora de Efeonce (recomendada 2026-09-26)

> **Estado: recomendada, NO canon** (el operador: «vamos con tu recomendación»). Doc canónico:
> [`EFEONCE_SONIC_IDENTITY_V1.md`](../../../../docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md).
> Todo se produce en casa, sin músico ni compositor humano (motor propio + ElevenLabs + Stable Audio vía fal).

- **Concepto «Tres puntos que se vuelven uno»:** la gramática de La órbita en sonido. Anillo = acorde abierto
  de quinta (pregunta) · tres ventanas de la nave = tres notas breves en Mi · esfera = La con el **único golpe**
  (la respuesta) · halo = el acorde de La mayor florece y se apaga. Territorio elegido: «Puntos suspensivos».
- **Motivo:** Mi5 · Mi5 · Mi5 → La5 (MIDI 76 76 76 81), notas de 140 ms, pausa de 370 ms, La mayor (la del motion V1.1).
- **Dos registros, mismo ADN:** **fondo** (96 BPM, sereno, síntesis propia determinística; la esfera responde
  siempre La mientras la armonía cambia) y **energía** (120 BPM, rock; maqueta propia re-grabada con Stable
  Audio 2.5 a intensidad 0,7 + la esfera propia encima). NUNCA cambiar de registro dentro de una pieza ni
  poner energía debajo de una locución; el fondo va ~15 dB bajo la voz.
- **Acento por línea = timbre de la esfera:** Growth campana · Brand marimba · Engine FM · Voice eco · Revenue
  campana grave (Revenue HubSpot y Salesforce comparten). La melodía y su pausa no cambian nunca.
- **Voz:** Brian (ElevenLabs v3), «Empower your <Línea>.», inglés nunca traducido; la palabra final cae con la
  esfera; pausa «Empower»→«your» igualada a 0,14 s. NUNCA otra voz para el eslogan.
- **Reglas clave:** un solo golpe por pieza y sin comprimirlo; nivelar por destino (−14 LUFS video/redes,
  −16 podcast, pico −1 dBFS); usar los archivos del kit, no regenerar. NUNCA en clientes ni en la UI de
  Greenhouse; la pantalla de recepción va sin sonido.
- **Dónde vive:** página AXIS `https://axis.efeonce.org/references/sonic-brand/` y JSON para agentes
  `https://axis.efeonce.org/references/sonic-brand.json` (esquema `axis.efeonce-sonic-brand.v1`; se publican
  publicado 2026-09-26, PR AXIS #4 squash `55486aa`) · bucket `gs://efeonce-group-axis-public-media/sonic/v1/` (`masters/` + `web/`) ·
  producción en Greenhouse `ai-generations/2026-09-26_branding-sonoro/` (`LEEME.md`, `motor/`, `entrega/`, `guia/`).
- **Pendiente para canonizar:** Glitch (podcast, **sin decisión** del operador) · licencias (Stable Audio vía
  fal; voz ElevenLabs) · prueba de reconocimiento sin logo antes de pautar · tokens AXIS + reemplazo del
  sonido de los masters V1.1.

## Ecosistema digital (SSOT: `docs/public-site/decisions/PDR-003`)

Dónde entra el audio:

- **Think / Glitch:** *Glitch* (newsletter semanal IA/Marketing/Negocios) es candidato natural a **podcast**
  (`../modules/07`): mnemonic de intro, formato consistente, clips 60-90s para social.
- **El grader:** un explainer de audio / jingle del grader es pieza compartible.
- **Landings (`/aeo-2/`):** VO para video hero, jingle de marca.

## Coherencia con las skills hermanas

audio-studio es **producción de audio**. Encadena con: `motion-design-studio` (le da voz/música/SFX para
el sonido a-picture), `social-media-studio` (audio para redes), `design-studio` (sonic branding ↔ identidad
visual), `greenhouse-nexa-conversational` (asset de voz de Nexa), `copywriting` (guion/VO script),
`efeonce-agency` (doctrina de marca). Detalle en `AUDIO_BOUNDARY.md`.
