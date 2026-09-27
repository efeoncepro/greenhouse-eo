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
`ai-generations/2026-09-26_branding-sonoro/motor/` (binarios fuera de git):

| Ruta | Modelo fal | Lo medido | Script |
|---|---|---|---|
| TTS | `fal-ai/elevenlabs/tts/eleven-v3` | input `voice` por nombre (Brian = la de fábrica `nPczCjzI2devNBz1zQrb`; en el conector de ElevenLabs, siempre por ID: hay 25 «Brian») | `voz.ts` |
| STT | `fal-ai/elevenlabs/speech-to-text` | devuelve `words` con `start`/`end`: sirve para caer la esfera sobre una palabra | `transcribir.ts` |
| Música | `elevenlabs/music/v2.5` (sin prefijo `fal-ai`; USD 0,60/min) | acepta `composition_plan.chunks[].audio_reference` (`strength` low\|medium\|high\|xhigh, ventana ≤ 30 s, líneas ≤ 200 caracteres). Suena más producido pero **no respeta la estructura**: con high/xhigh se saltó el corte y el golpe final. **ElevenLabs Music v3 NO está en fal** | `ai-music.ts` |
| Re-grabación | `fal-ai/stable-audio-25/audio-to-audio` (USD 0,20 por pieza) | **conserva el tiempo al milisegundo** (golpe 32,874 s vs 32,875 de la maqueta); **redondea la duración a segundos enteros** (8,5 → 8): maquetas de duración entera | `ai-music.ts` |
| Cama desde texto (**sólo Glitch**, 2026-09-27) | `elevenlabs/music/v2.5` (`--route el-bed`) · `fal-ai/stable-audio-25/text-to-audio` (`--route sa-bed`) | sin maqueta, desde estilos + negativos (`--plan <cama>`, `--seconds`, `--seed`). La **cama post-punk aprobada** salió de `--route el-bed --plan cama-postpunk`, seed 7, 32 s (negativos: vocals, singing, chiptune, video game, 8-bit, synthwave, arcade, lead synth, EDM drop): `composition_plan` de un tramo **sin referencia de audio** dio instrumentos reales y tempo exacto (150,00 BPM medido) con 38 % de medios. `--route sa-bed` también dio camas con cuerpo (36–37 % de medios), no elegidas | `ai-music.ts` |

- **Espera y recuperación:** `runFalModel` espera 120 s por defecto; para música usa `pollTimeoutMs` mayor. Un
  trabajo vencido se recupera **sin volver a pagar** con `awaitFalRequest` (`recuperar.ts`). Costo: `precio.ts`.
- **Conector MCP de ElevenLabs:** credencial mal cargada (se cargó el ID de la clave, no la clave `sk_…`; error
  `api_key_id_used_as_api_key`). Mientras no se corrija, ElevenLabs va por fal.
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
| Greenhouse `ai-generations/2026-09-26_branding-sonoro/` | `motor/glitch-theme.mjs`, `motor/ai-music.ts` (`--route sa`, `el-bed`, `sa-bed`), `motor/glitch-cama-bucle.mjs`, `motor/master.sh`; `glitch-sfx.mjs` y `dsp.mjs` históricos; `LEEME.md` | producción de una **ronda nueva** (la aprueba el operador), nunca para rehacer un máster aprobado |

Comandos del taller para el audio de Glitch (desde `greenhouse-eo`, prefijo
`pnpm -C ../efeonce-brand-workshop --filter glitch-motion`): `render`, `kit`, `transiciones` y `heroe` entregan el WAV
junto a cada `.mov` con `--sound b|a|off` (**`b` por defecto**, la aprobada) y `render`/`kit` la música con
`--music on|off` (**`on` por defecto**); `sonido` rehace sólo el set de WAV sin render de video; `--skip-render`
(`kit`, `transiciones`) reutiliza los `.mov` y rehace verificaciones, WAV, vistas previas y entrega. Tabla completa de
argumentos: norma de Glitch §13.13. Mezcla de la cama (−15 dB bajo la voz, ducking 0,05 / 3:1 / 15 ms / 350 ms, sin
recortar medios, nunca bajo el Drop): `EFEONCE_OVERLAY.md` §Glitch.

**QA sin oído** (el agente no escucha): ebur128 (sonoridad), autocorrelación de ataques (tempo), balance espectral por
bandas (medios 300 Hz–3 kHz ≥ ~35 %), juntura del bucle (transiente contra un tiempo fuerte normal) y sha256
descargando del bucket. Cómo suena lo aprueba siempre el operador. Reglas en `EFEONCE_OVERLAY.md` §Glitch.

## Router de producción (elige la mano correcta)

- **VO/narración de producción** → ElevenLabs v3 (o humano si es marca premium con emoción).
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
