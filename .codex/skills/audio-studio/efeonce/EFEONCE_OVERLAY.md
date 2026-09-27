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
- **Voz:** Brian (ElevenLabs v3, ID `nPczCjzI2devNBz1zQrb`, nunca por nombre fuera de fal), «Empower your <Línea>.», inglés nunca traducido; la palabra final cae con la
  esfera; pausa «Empower»→«your» igualada a 0,14 s. NUNCA otra voz para el eslogan.
- **Reglas clave:** un solo golpe por pieza y sin comprimirlo; nivelar por destino (−14 LUFS video/redes,
  −16 podcast, pico −1 dBFS); usar los archivos del kit, no regenerar. NUNCA en clientes ni en la UI de
  Greenhouse; la pantalla de recepción va sin sonido.
- **Dónde vive:** página AXIS `https://axis.efeonce.org/references/sonic-brand/` y JSON para agentes
  `https://axis.efeonce.org/references/sonic-brand.json` (esquema `axis.efeonce-sonic-brand.v1`; se publican
  publicado 2026-09-26, PR AXIS #4 squash `55486aa`) · bucket `gs://efeonce-group-axis-public-media/sonic/v1/` (`masters/` + `web/`) ·
  producción en Greenhouse `ai-generations/2026-09-26_branding-sonoro/` (`LEEME.md`, `motor/`, `entrega/`, `guia/`).
- **Pendiente para canonizar:** licencias (Stable Audio vía
  fal; voz ElevenLabs) · prueba de reconocimiento sin logo antes de pautar · tokens AXIS + reemplazo del
  sonido de los masters V1.1. Glitch ya no es pendiente de esta identidad: tiene su diseño sonoro propio, aprobado (B),
  sólo de Glitch (ver §Glitch abajo); esta identidad sigue «recomendada».

## Glitch (sólo Glitch, APROBADO versión B — 2026-09-27)

> **No es parte de la identidad sonora de Efeonce.** Glitch (el magazine semanal) tiene un diseño sonoro propio en
> **APROBADO, versión B** (2026-09-27): «el sonido de Efeonce, con un bug» — Mi · Mi · Mi (el tercero se rompe en bytes) → La (la manzana,
> el único golpe grave). Nunca en piezas de Efeonce, su familia ni clientes; nunca mezclado con el kit de arriba.
> Canon: norma de Glitch [`GLITCH_GRAPHIC_LINE_V1.md`](../../../../docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
> §13.11; operativo en `efeonce-graphic-line` → `references/glitch.md` §13.

- **Reglas clave:** afinado en La mayor; el sonido de la ronda 6 es diseño sonoro, no música (la música aprobada
  va aparte, ver **Música** abajo); sin whooshes, subidas de tráiler ni chiptune (el
  corte es silencio digital en seco); un golpe grave por aparición de la manzana y el golpe sin comprimir; **la falla
  nunca sobre la voz del host** y ninguna transición suena hacia o desde la toma del host; la firma de Efeonce muda.
- **Qué hay:** un WAV sidecar por cada `.mov` del motion (mismo nombre y duración; las transiciones con pista por
  formato), en la versión **B** (más punch), la aprobada; la A (contenida) queda como alternativa descartada. Motor
  determinístico migrado al taller `efeonce-brand-workshop` (commit `2d411b8`): `tools/glitch-motion/src/sound.mjs`
  sobre `tools/brand-sound`; regenerar = correr el mismo comando de `glitch-motion` (la copia
  `motor/glitch-sfx.mjs` queda como histórico; ver `STUDIO_TOOLING.md`); archivos por URL + SHA-256 desde
  `https://axis.efeonce.org/references/glitch.json` (campo `sound`), en el bucket
  `gs://efeonce-group-axis-public-media/glitch/sound/v1/` (sólo la B: `masters/` y `web/`); entrega al editor en
  OneDrive `Alineación/5. Contenidos/09. Glitch/Motion/piloto/sonido-propuesta/b/` (la carpeta conserva su nombre).
- **Estado:** **aprobado, versión B** (2026-09-27): «La b me encanta más. Sus sonidos están aprobados». Quedaron
  resueltas las cuatro decisiones: B; dos golpes graves (apertura y Drop); ~~voz sola bajo las noticias~~ (**reemplazada
  el 2026-09-27** por la cama post-punk, ver abajo); el clic del micrófono y el trazo del plumón sintetizados se quedan. Observación no bloqueante: en B, el golpe del cuadro 74 de la
  tarjeta final queda más tapado que en A.
- **Música (APROBADA 2026-09-27, sólo Glitch):** tema B, irreverente y desafiante (big beat de banda: breakbeat, bajo
  saturado con Mi · Mi · Mi → La, quintas sucias; 150 BPM amarrados al motion, una semicorchea = 3 cuadros a 30 fps):
  intro con pre-roll, cortina entre noticias (corta en seco en 1,6 s, cae con la cabecera siguiente) y salida, en
  versión vlog (−14 LUFS) y podcast (−16); y **cama post-punk** en bucle de 19,2 s bajo el relato de cada noticia
  («Post-punk definitivamente»). Cama: 15 dB bajo la voz, ducking por sidechain (umbral 0,05, 3:1, 15 ms / 350 ms),
  **sin recortar medios**, nunca bajo el Drop ni la tarjeta final. Lección medida: lo «arcade» es falta de medios
  (13 % en la cama rechazada contra 45 % en la intro y 38 % en la cama aprobada); nunca síntesis pura para la música de
  Glitch. Másteres por URL + sha256 en `gs://efeonce-group-axis-public-media/glitch/music/v1/` (con `index.json`);
  **nunca se regeneran**: un cambio es una ronda nueva aprobada por el operador. Detalle, tabla de sha256, producción y
  pendientes: `efeonce-graphic-line` → `references/glitch.md` §13.7; canon: norma §13.12 «Música — sólo Glitch».

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
