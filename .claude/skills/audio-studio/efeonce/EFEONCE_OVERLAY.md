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
- **Sonic identity de Efeonce:** si Efeonce define un audio logo/mnemonic, se diseña como **sistema**
  (`../modules/05`) alineado a los mismos atributos que la identidad visual (coordinar con `design-studio`).
- **Voz de Nexa:** `audio-studio` produce el **asset de voz** de Nexa (TTS/persona sonora — timbre, tono,
  idioma, audio tags), pero la **integración en producto** (chat, RAG, providers, elección de voz en runtime)
  es de `greenhouse-nexa-conversational`. Coordina; no invadas su runtime.

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
