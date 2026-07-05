# Módulo 03 — Voz IA: TTS, cloning, dubbing (VOLÁTIL)

> **⚠️ VOLÁTIL — `(as-of 2026-07 — reverificar)`.** El landscape de voz IA cambia por trimestre:
> versiones, features, idiomas, latencia, **precios** y —lo más caro de equivocar— **licencia y
> términos de uso**. Antes de afirmar "usa X modelo / versión / feature", **reverifica con
> WebSearch/WebFetch** y actualiza el `as-of`. La ÉTICA y el consentimiento (§5) NO son volátiles.

> **Los ejes de dirección del módulo 02 (tono, ritmo, energía, intención, énfasis) aplican igual
> a la voz IA.** Acá cambian las palancas (audio tags, puntuación, fonética) — no el criterio.

---

## 1. ElevenLabs — el tier producción de voz IA `(as-of 2026-07)`

Dos motores complementarios; eliges por el trade-off latencia vs expresividad:

| Motor | Fuerte en | Idiomas | Latencia | Úsalo para |
|---|---|---|---|---|
| **v3** (GA feb-2026) | expresividad máxima: **audio tags**, **multi-speaker**, matiz | **70+** | NO real-time | VO, narración, podcast, diálogo, e-learning premium |
| **Flash v2.5** | **tiempo real (~75 ms)**, eficiencia | 32 | real-time | agentes conversacionales, IVR, voz de producto live |

- **Audio tags (v3)**: instrucciones inline de performance — `[whispers]`, `[laughs]`, `[excited]`,
  `[sighs]`. Es el "dirigir la actuación" del TTS. Se combinan con puntuación para modular emoción.
- **Multi-speaker (v3)**: varias voces en una misma generación → diálogo/escenas sin pegar clips.
- **Precios bajaron ~55% en mayo-2026** → generar a escala es más barato que antes; igual **dimensiona
  el gasto de créditos** (regla dura de la skill) antes de producir tandas grandes.

### Voice cloning — IVC vs PVC

| Tipo | Muestra requerida | Calidad | Cuándo |
|---|---|---|---|
| **IVC** (Instant Voice Cloning) | **sub-minuto** de audio (tier Starter) | buena, rápida | prototipo, iteración, voz "suficiente", volumen |
| **PVC** (Professional Voice Cloning) | **3–6 h** (o desde **30 min+**) | **casi indistinguible** del original | voz de marca, locutor recurrente, producto final premium |

> Regla práctica: **IVC para iterar y prototipar; PVC cuando la voz ES el entregable** y tiene que
> pasar por casi-indistinguible. Ambos exigen **consentimiento explícito** del dueño de la voz (§5).

### Dubbing y voice design
- **Dubbing**: traduce y re-locuta **preservando la voz** del hablante cross-idioma — misma persona
  suena en otro idioma. Ideal para llevar una pieza es-CL a en-US (u otros) manteniendo identidad.
- **Voice design**: genera una voz nueva **desde una descripción** (no clona a nadie real) — útil para
  crear una persona sonora de marca sin problema de consentimiento (la voz no existe).
- **API**: todo lo anterior es orquestable por API/MCP para meterlo al pipeline del estudio.

---

## 2. Seed Audio 1.0 (ByteDance, jun-2026) — audio unificado `(as-of 2026-07)`

Genera **diálogo multi-personaje + música + SFX + ambiente en UNA sola pasada**.

- **Cloning zero-shot** + **cross-lingual**; hasta **~2 min** por generación; **~$0.18/min**.
- Cambia el pipeline para **prototipado rápido y previews de audio**: una escena completa (voces +
  cama musical + ambiente) en una pasada, en vez de producir y pegar capas por separado.
- Trade-off: menos control granular por capa que producir cada elemento aparte. **Para preview/prototipo
  es imbatible; para master final** normalmente re-produces las capas por separado y mezclas (módulo 09).

---

## 3. Higgsfield — audio vía MCP `(as-of 2026-07)`

Herramientas de audio expuestas por MCP (orquestables desde el estudio):
- **`create_voice`** — crea/registra una voz para reusar en generaciones.
- **`voice_change`** — transforma/recasta una voz sobre audio existente.
- **`dubbing`** — doblaje cross-idioma.
- (Enhance de voz: `enhanceSpeechPoll` para limpiar/mejorar — ver módulo 10.)

> Todas cuestan créditos y pasan por confirmación humana antes de entregar. Detalle de conexión y
> orquestación en `efeonce/STUDIO_TOOLING.md`.

---

## 4. Cuándo IA vs humano

| Elige **IA** cuando… | Elige **humano** cuando… |
|---|---|
| escala (cientos de líneas, catálogos, IVR) | la **emoción de marca premium** es el producto |
| **muchos idiomas** / localización rápida | matiz actoral fino, timing cómico, arco emocional |
| **iteración veloz** (cambiar copy sin re-convocar) | pieza insignia, spot hero, personaje memorable |
| **e-learning** / explicativo de gran volumen | cuando "que se note humano" es parte del valor |
| prototipo / scratch / preview de audio | riesgo reputacional alto si suena sintético |
| presupuesto/tiempo ajustado con calidad "buena" | dirección en vivo, ping-pong creativo con el locutor |

> No es binario: patrón común = **humano para la voz hero de marca**, **IA para volumen, idiomas e
> iteración**. La IA genera y acelera; el humano dirige, cura y decide (doctrina de la skill).

---

## 5. ÉTICA Y LEGAL — no negociable

- **Consentimiento explícito para clonar**: NUNCA clones la voz de una persona real (locutor, cliente,
  figura pública, un tercero) sin **permiso explícito y documentado del dueño de la voz**. Es la regla
  dura de la skill. Sin consentimiento, no se clona — punto.
- **No imitar voces reales sin permiso**: recrear la voz de alguien identificable sin autorización es
  riesgo legal (derechos de imagen/voz) y de marca, aunque el modelo lo permita técnicamente.
- **Disclosure cuando aplique**: si el contexto o la norma lo exige (o si el oyente podría sentirse
  engañado), **declara que la voz es sintética**. La transparencia protege a la marca.
- **Licencia y términos**: verifica que los términos del proveedor permitan el uso comercial que darás
  al audio. Documenta la fuente y la licencia (lo más volátil y lo más caro de equivocar).
- **Voice design como salida limpia**: cuando no necesitas una voz real específica, **diseña una voz
  nueva** (§1) — sin persona real detrás, sin problema de consentimiento.

---

## 6. Cómo dirigir TTS (las palancas)

- **Audio tags (ElevenLabs v3)**: `[whispers]`, `[laughs]`, `[excited]`, `[sighs]` inline para marcar
  la emoción/acción por tramo. Es tu principal palanca de performance.
- **Puntuación como dirección**: comas y puntos crean pausas y ritmo; puntos suspensivos alargan;
  signos de exclamación/interrogación cambian entonación. Escribe el guion **para que suene**, no solo
  para que se lea.
- **SSML-like / control de prosodia**: donde el motor lo soporte, usa marcas de pausa, énfasis y
  velocidad para afinar el pacing (mismo criterio de ritmo del módulo 02).
- **Fonética / pronunciación**: nombres propios, siglas, marcas y palabras raras se deletrean fonética
  o se guían para que el modelo no invente. Verifica SIEMPRE cómo pronuncia nombres de marca/cliente.
- **Pacing y respiraciones**: no busques cero pausa — un pacing con aire suena humano. Ajusta velocidad
  y micro-pausas hasta que respire.
- **Consistencia de voz**: fija la voz/seed y los parámetros para que una serie (varios episodios,
  varias líneas) suene igual. Documenta los settings ganadores.
- **Itera con dirección, no a ciegas**: cambia UN eje por generación (una más lenta, una más cálida) —
  mismo principio que dirigir a un locutor.

---

## 7. Tabla — IA vs humano por caso

| Caso | Recomendado `(as-of 2026-07)` | Motor / nota |
|---|---|---|
| Spot hero de marca (emoción premium) | **humano** (o PVC de locutor con consentimiento) | la voz ES el valor |
| E-learning / capacitación (alto volumen) | **IA** | ElevenLabs v3, consistencia de voz fija |
| Agente conversacional / IVR / voz de producto live | **IA real-time** | ElevenLabs Flash v2.5 (~75 ms) |
| Localización a varios idiomas de una pieza existente | **IA dubbing** | ElevenLabs dubbing (preserva la voz) / Higgsfield `dubbing` |
| Prototipo / scratch / preview de escena completa | **IA** | Seed Audio 1.0 (voces+música+SFX en una pasada) |
| Voz de persona sonora de marca sin persona real | **IA voice design** | voz diseñada, sin consentimiento de tercero |
| Personaje narrativo con arco/timing fino | **humano** | matiz actoral; IA como scratch |
| Asset de voz de Nexa (TTS/persona sonora) | **IA** | producir acá; integración → `greenhouse-nexa-conversational` |

---

## 8. Handoff

- Cierra el casting/decisión de voz con **`templates/voice-casting-sheet.md`** (voz elegida, IA vs
  humano, IVC/PVC, consentimiento, settings/seed, licencia, `as-of`).
- Para conectar y orquestar los modelos (ElevenLabs/Higgsfield/Seed Audio vía MCP + gasto de
  créditos + confirmación humana), abre **`efeonce/STUDIO_TOOLING.md`**.
- Para restaurar/mejorar la voz generada o grabada (enhance/de-noise), ve al **módulo 10**.

> **Cierre.** La voz IA hoy es tier producción, pero una voz IA impecable **mal dirigida** (ritmo,
> tono, pronunciación de marca, mezcla) sigue siendo mal audio. Dirige la IA como dirigirías a un
> locutor — y **nunca** clones sin consentimiento ni uses una voz de licencia dudosa en algo comercial.
