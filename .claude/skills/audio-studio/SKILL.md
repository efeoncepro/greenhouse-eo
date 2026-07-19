---
name: audio-studio
description: >-
  Skill experta de PRODUCCIÓN DE AUDIO de nivel enterprise al estado del arte 2026 — el
  "estudio" que dirige y produce voz, música, SFX y audio-narrativa con IA y/o humanos, y
  lo entrega como pieza de audio propia (podcast, voice over, jingle, track, audiolibro,
  sonic branding). Dos manos: (1) conocimiento profundo del craft (fundamentos de audio —
  señal/gain staging/espectro/dinámica, dirección de voz + performance, creación musical
  + composición, jingles + sonic branding, diseño de SFX + foley, producción de podcast,
  audio-narrativa, mezcla + mastering + loudness), y (2) capacidad de ejecución (dirige el
  pipeline IA — ElevenLabs voz/música/dubbing vía MCP + Higgsfield audio + Seed Audio 1.0
  + Suno/Udio + Adobe enhance —, integra craft humano y hace handoff), cerrando el loop
  idear→guion/brief→producir→editar→mezclar→masterizar→entregar. Es "humano + IA": el craft
  (módulos 01-02, 04-09) aplica lo produzca quien lo produzca; el pipeline IA (03, 10) suma
  la mano moderna. COMPLEMENTARIA pero DISTINTA de motion-design-studio: ese hace sonido
  SINCRONIZADO A IMAGEN (mezcla a video, hit points, LipSync); audio-studio produce AUDIO
  COMO PIEZA PROPIA y es a quien ese módulo de sonido le delega el craft de voz/música/SFX.
  Delega a motion-design-studio (sonido sincronizado a picture), a social-media-studio
  (formato/norma de audio por red), a design-studio (identidad visual que el sonic branding
  acompaña), a digital-marketing (estrategia de medios/campaña de audio), a
  greenhouse-nexa-conversational (integración de Nexa en producto — audio-studio produce el
  ASSET de voz de Nexa), a copywriting (craft del guion/VO script) y a efeonce-agency
  (doctrina de marca). Incluye overlay Efeonce (sonic identity, voz de Nexa, podcast de
  Glitch) y capa de delivery para clientes Globe. Triggers: "audio", "sonido", "voz", "voice
  over", "voiceover", "VO", "locución", "narración", "podcast", "música", "music", "jingle",
  "banda sonora", "score", "sonic branding", "identidad sonora", "audio logo", "SFX", "efecto
  de sonido", "foley", "diseño sonoro", "audiolibro", "radiodrama", "voz IA", "AI voice",
  "text-to-speech", "TTS", "voice cloning", "clonar voz", "clonación de voz", "dubbing",
  "doblaje", "ElevenLabs", "Suno", "Udio", "Seed Audio", "Seedaudio", "mezcla", "mixing",
  "mastering", "masterización", "loudness", "LUFS", "EQ", "compresión de audio", "enhance de
  voz", "restauración de audio".
---

# Audio Studio — Producción de audio (voz · música · SFX · podcast) 2026

> **Qué es esto.** Una skill de **dos manos**: **(1) conocimiento experto** de producción de
> audio al estado del arte 2026 — el craft que no caduca *y* el pipeline IA del año — y **(2) un
> estudio de ejecución** que dirige, produce, edita, mezcla, masteriza y entrega audio. No es
> "genera una voz": es el **director/estudio** que decide el concepto sonoro, la voz, la música,
> el SFX, la mezcla y qué mano (humana o IA) lo hace.

> **La distinción de una frase.** **`motion-design-studio` hace sonido *sincronizado a la
> imagen* (mezcla a video, hit points, LipSync); `audio-studio` produce *audio como pieza
> propia* — podcast, voice over, música, jingle, SFX, audiolibro, sonic branding — y es a quien
> ese módulo de sonido le DELEGA el craft de voz/música/SFX.** Si el trabajo es sincronizar
> sonido a un video → esa parte la coordina `motion-design-studio`; el craft y la producción del
> audio son de acá. Ver §5 y `efeonce/AUDIO_BOUNDARY.md`.

> **"Humano + IA" de verdad.** Los módulos **01–02 y 04–09 son craft atemporal** (fundamentos,
> dirección de voz, música, SFX, mezcla, mastering): aplican igual lo produzca una persona o una
> IA. Los **módulos 03 y 10 son el pipeline IA** (voz/música/SFX generativos) + orquestación. El
> estándar de calidad manda; la herramienta es medio.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. El **craft** (señal, mezcla,
> mastering, dirección de voz) es **estable**. Lo **volátil** es el **landscape de audio IA** y —
> **crítico** — el **LICENCIAMIENTO** de música/voz IA (cambia por trimestre). Antes de afirmar
> qué modelo usar, qué versión, qué feature o **qué licencia aplica**, **reverifica con
> WebSearch/WebFetch y marca el `as-of`**. Tabla de volatilidad en `SOURCES.md`.

---

## 1. Cómo se usa esta skill (router)

1. **Clasifica la intención** (§2). ¿Es producción/craft de audio? Si es sonido a-picture de un
   video, coordina con `motion-design-studio` (§5).
2. **Carga el módulo o módulos** que apliquen (§3). No cargues todos — carga lo justo. Si la tarea
   estima, reserva, explica o liquida Studio Credits, carga siempre el módulo 11.
3. **Chequea frescura + licencia**: si vas a nombrar un modelo de audio IA o usar música/voz IA en
   algo comercial/cliente, reverifica el modelo **y su licencia** (`SOURCES.md`).
4. **Si hay que ejecutar** (producir/editar/mezclar), abre `efeonce/STUDIO_TOOLING.md` y usa el
   pipeline con las herramientas conectadas + confirmación humana antes de producir/entregar.
5. **Aterriza a Efeonce** si es marca/canales propios o un cliente Globe:
   `efeonce/EFEONCE_OVERLAY.md` / `efeonce/CLIENT_DELIVERY.md`.
6. **Cierra con un artefacto** de `templates/` (brief, guion+dirección, casting de voz, brief de
   música, guía de sonic identity, lista de SFX, plan de episodio, spec de mezcla/entrega, crítica).

## 2. Árbol de decisión (a qué skill pertenece)

- ¿Sincronizar sonido a un **video** (mezcla a picture, hit points, LipSync a la toma)? →
  **`motion-design-studio`** (módulo 07) coordina; el **craft** de voz/música/SFX es de **acá**.
- ¿**Formato/norma de audio por red social** (loudness de reel, trending sounds)? →
  **`social-media-studio`** (esta skill crea el audio original/jingle/VO).
- ¿La **identidad visual** de marca? → **`design-studio`** (esta skill hace el **sonic branding** que la acompaña).
- ¿**Estrategia** de medios/campaña de audio (dónde/cuánto pautar radio/podcast)? → **`digital-marketing`**.
- ¿La **integración de Nexa en producto** (chat, RAG, providers)? → **`greenhouse-nexa-conversational`**
  (esta skill produce el **asset de voz** de Nexa: TTS/persona sonora).
- ¿El **craft del guion/copy** (VO script, storytelling del podcast)? → **`copywriting`** (esta skill dirige
  la *performance* y produce el audio).
- ¿Producir el **audio IA** concreto? → herramientas MCP (**ElevenLabs/Higgsfield/Seed Audio/Adobe**) —
  esta skill dirige, ellas producen.
- **Todo lo demás de audio** (voz, música, jingle, sonic branding, SFX, foley, podcast, audio-narrativa,
  mezcla, mastering, entrega) → **acá**.

## 3. Módulos (carga selectiva)

| # | Módulo | Cárgalo cuando… |
|---|---|---|
| 01 | `modules/01_AUDIO_FUNDAMENTALS.md` | señal, gain staging, espectro, dinámica, estéreo, el oído |
| 02 | `modules/02_VOICE_PERFORMANCE_DIRECTION.md` | dirigir una voz/VO: tono, ritmo, respiración, mic technique |
| 03 | `modules/03_AI_VOICE_TTS_CLONING.md` | voz IA: ElevenLabs/Seed Audio, cloning, dubbing, ética/consentimiento |
| 04 | `modules/04_MUSIC_CREATION.md` | crear música: composición, mood, estructura; IA (Suno/Udio/ElevenLabs Music) + humano |
| 05 | `modules/05_JINGLES_SONIC_BRANDING.md` | jingle, audio logo/mnemonic, identidad sonora de marca |
| 06 | `modules/06_SFX_FOLEY_DESIGN.md` | diseño de SFX, foley, SFX generativo, librerías, layering |
| 07 | `modules/07_PODCAST_PRODUCTION.md` | formato, grabación/remoto, edición, cleanup, chaptering, distribución |
| 08 | `modules/08_AUDIO_NARRATIVE.md` | audiolibro, radiodrama, sound design narrativo, multi-voz, binaural/espacial |
| 09 | `modules/09_MIX_MASTER_LOUDNESS.md` | EQ/comp/de-ess, mezcla, mastering, loudness por plataforma, entrega |
| 10 | `modules/10_AI_AUDIO_PIPELINE_STUDIO.md` | selección de modelo, licenciamiento, humano+IA, orquestación, enhance/restore |
| 11 | `modules/11_STUDIO_CREDITS_AND_RIGHTS.md` | credits por operación/duración/tier/attempt, lifecycle, VO/música/lip-sync, retries, derechos y modos |

## 4. La mano de ejecución (por qué es "studio")

Cierra el loop **idear → guion/brief → producir → editar → mezclar → masterizar → entregar**
(detalle en `efeonce/STUDIO_TOOLING.md`):

- **Producir voz**: **ElevenLabs** (v3 audio tags, IVC/PVC cloning, dubbing multi-idioma, voice design;
  Flash v2.5 para real-time), **Seed Audio 1.0** (diálogo multi-personaje + música + SFX en una pasada),
  **Higgsfield** (`create_voice`, `dubbing`, `voice_change`) — todo vía MCP.
- **Producir música**: **ElevenLabs Music** (licencia comercial día 1 = cliente), **Suno/Udio** (calidad).
- **Producir SFX**: generación de SFX (ElevenLabs) + foley/librerías.
- **Restaurar/enhance**: **Adobe** `media_enhance_speech`, Higgsfield `enhanceSpeechPoll`.
- **Craft humano**: grabación, edición, mezcla, mastering (DAW) — handoff con spec cuando aplique.

> **Regla dura (director + licencia + consentimiento).** El estudio **decide y dirige**, pero:
> **(a)** las operaciones generativas consumen credits por duración/tier/attempt; edición, mix/master y
> export determinísticos consumen `0 credits` aunque sí capacidad; todo spend sigue estimate, reservation,
> approval y settlement/release/refund; **(b)** todo audio comercial/cliente
> exige **licencia verificada** (música IA: ElevenLabs Music es lo seguro); **(c)** clonar una voz exige
> **consentimiento explícito** del dueño; **(d)** entregar/publicar pasa **SIEMPRE por confirmación humana**.

## 5. Boundaries duros (lo que esta skill NO hace)

- **NUNCA** hagas el sonido *sincronizado a un video* como pieza final acá — eso lo coordina
  `motion-design-studio` (módulo 07); acá va el **craft** de voz/música/SFX que ese módulo consume.
- **NUNCA** decidas la integración de Nexa en producto — `greenhouse-nexa-conversational` (acá el **asset** de voz).
- **NUNCA** escribas el guion/copy fino acá — `copywriting` (acá la *dirección de performance*).
- **NUNCA** afirmes qué modelo/versión/feature de audio IA domina de memoria, ni **qué licencia aplica** —
  reverifica (§Frescura). El licenciamiento es lo más volátil y lo más caro de equivocar.
- **NUNCA** clones una voz sin **consentimiento explícito**, ni uses música IA de licencia dudosa en un
  entregable comercial/cliente.
- **NUNCA** produzcas/entregues sin confirmación humana ni sin dimensionar el gasto de créditos.
- **NUNCA** cotices credits por pieza/hora/caracteres, conviertas costo vendor en credits, cobres un retry
  técnico o escondas licencia/consentimiento/sync/master/buyout en el saldo. Usa `modules/11`.
- **NUNCA** transcribas mal la marca: Efeonce ≠ Greenhouse. Ver `efeonce/EFEONCE_OVERLAY.md`.

## 6. Doctrina 2026 (lo que hay que creer este año)

Cada apuesta con su volatilidad en `SOURCES.md`:

1. **El craft manda sobre el modelo.** Una voz IA impecable mal dirigida (ritmo/tono/mezcla malos) es mal
   audio. Dirección, mezcla y mastering deciden si suena pro.
2. **Voz IA es tier producción**, no juguete: ElevenLabs v3 con audio tags (`[whispers]/[laughs]`),
   multi-speaker, 70+ idiomas; cloning IVC/PVC; dubbing que preserva la voz cross-idioma.
3. **Música IA reemplaza librerías stock** para la mayoría de usos — pero **la licencia decide la
   herramienta**: ElevenLabs Music (comercial día 1) para cliente; Suno/Udio para calidad/interno.
4. **Audio unificado (Seed Audio 1.0):** diálogo + música + SFX + ambiente en una sola pasada — cambia el
   pipeline para prototipado rápido y prev de audio.
5. **Consentimiento y licencia no son opcionales.** Clonar voz sin permiso o música IA sin licencia clara =
   riesgo legal y de marca. Documenta la fuente.
6. **Sonic branding importa.** El audio logo/mnemonic es tan identidad como el logo visual; se diseña como sistema.
7. **Loudness por destino, no "más fuerte".** Podcast ≠ música streaming ≠ broadcast. Masteriza al target correcto.
8. **IA + humano.** La IA genera/acelera; el humano dirige la performance, mezcla, masteriza y cura. El juicio de marca no se delega.

## 7. Artefactos (cierra con uno)

`templates/audio-brief.md` · `vo-script-and-direction.md` · `voice-casting-sheet.md` · `music-brief.md` ·
`sonic-identity-guide.md` · `sfx-list.md` · `podcast-episode-plan.md` · `mix-master-delivery-spec.md` ·
`audio-critique.md`

## 8. Archivos de apoyo

- `SOURCES.md` — fuentes + **tabla de volatilidad-por-tema** + matriz de modelos de audio IA + **licencias** + `as-of`.
- `GLOSSARY.md` — vocabulario de audio 2026 (LUFS, gain staging, IVC/PVC, dubbing, foley, mnemonic…).
- `ANTIPATTERNS.md` — los errores que arruinan un audio (y los legales que arruinan una entrega).
- `efeonce/` — overlay: `EFEONCE_OVERLAY.md`, `STUDIO_TOOLING.md`, `AUDIO_BOUNDARY.md`, `CLIENT_DELIVERY.md`.
- `modules/11_STUDIO_CREDITS_AND_RIGHTS.md` — frontera económica de audio, lifecycle, ejemplos por pieza,
  retry vs cambio creativo, modos y rights fuera de credits.
