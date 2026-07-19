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

## Seed Audio 1.0 (ByteDance, vía Volcano Ark / agregadores)

Modelo **unificado**: diálogo multi-personaje + música + SFX + ambiente en **una pasada**; cloning
zero-shot; cross-lingual; hasta 2 min; ~$0.18/min. Ideal para **prototipar una escena de audio completa**
o multi-voz rápido. Verificar términos de licencia antes de uso comercial.

## Adobe (MCP)

`media_enhance_speech` — enhance/limpieza de voz grabada (útil para VO/podcast con ruido).

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
