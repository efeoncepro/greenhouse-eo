# Spec de mezcla / mastering / entrega — [nombre de la pieza]

> Artefacto rellenable. Define la cadena de proceso, los targets de loudness por destino, los
> formatos, las versiones y el naming, y cierra con el checklist de pre-entrega. **Loudness por
> destino, no "más fuerte".** Mide antes de entregar — no confíes en el oído para el número.

- **Pieza:** [nombre] · **Tipo:** [voz · música · podcast · jingle · mixto] · **Fecha:** [YYYY-MM-DD]
- **Destino(s):** [música streaming · podcast · broadcast · social · web] · **Owner:** [quién masteriza]

## 1. Cadena de proceso (mezcla → master)

| Etapa | Proceso | Ajuste objetivo |
|---|---|---|
| **EQ correctivo** | [limpiar rumble, medios embarrados, sibilancia] | [HPF ~80 Hz voz · cortes quirúrgicos] |
| **De-ess** | [domar ess/sh en la voz] | [banda 5-8 kHz · solo lo necesario] |
| **Compresión** | [controlar dinámica, densidad] | [ratio/attack/release según fuente] |
| **EQ estético** | [presencia, aire, cuerpo] | [realces suaves] |
| **Balance / niveles** | [voces parejas · música bajo VO] | [ducking donde aplique] |
| **Limiting (master)** | [subir loudness sin clip] | [true peak ≤ -1 dBTP] |

## 2. Target de loudness por destino (BLOQUEANTE)

| Destino | Integrated LUFS | True peak | Notas |
|---|---|---|---|
| **Música streaming** | **-14 LUFS** | -1 dBTP | [Spotify/Apple normalizan a ~-14] |
| **Podcast (mono)** | **-16 LUFS** | -1 dBTP | [voz mono, estándar podcast] |
| **Podcast (stereo)** | **-19 LUFS** | -1 dBTP | [equivalente perceptual del mono -16] |
| **Broadcast (radio/TV)** | **-23 LUFS** | -1 dBTP | [EBU R128 / -24 ATSC A/85 en US] |
| **Social (referencia)** | [~-14 LUFS] | -1 dBTP | [confirma norma por red → `social-media-studio`] |

- **Target elegido para esta pieza:** [___ LUFS · -1 dBTP] · **medidor usado:** [ ]

## 3. Formatos por destino

| Destino | Formato | Sample rate | Bit depth / bitrate |
|---|---|---|---|
| **Master de archivo** | WAV | [48 kHz] | [24-bit] |
| **Streaming/distribución** | [WAV/FLAC lossless o MP3 320k] | [44.1/48 kHz] | [ ] |
| **Podcast** | MP3 / AAC | [44.1 kHz] | [MP3 ~128-192k mono · AAC] |
| **Web/app** | [AAC/MP3/Opus] | [ ] | [ ] |

## 4. Versiones a entregar

| Versión | Descripción | Loudness | Formato |
|---|---|---|---|
| [Master principal] | [pieza completa] | [target] | [WAV 48k/24] |
| [es-CL / en-US] | [por idioma] | [ ] | [ ] |
| [30s / 15s] | [por duración] | [ ] | [ ] |
| [con música / sin música] | [bed on/off] | [ ] | [ ] |
| [stems] | [voz · música · SFX por separado] | [pre-master] | [WAV] |

## 5. Naming

- **Convención:** `[marca]_[pieza]_[idioma]_[duracion]_[version]_[LUFS].[ext]`
- **Ejemplo:** `efeonce_jingle-grader_es-CL_15s_final_-14LUFS.wav`

## 6. Checklist de pre-entrega

- [ ] **Loudness integrado medido** = target (no estimado de oído)
- [ ] **True peak** ≤ -1 dBTP en todas las versiones
- [ ] **Sin clip** (revisa picos y el master limiter)
- [ ] **Mono-compat** verificada (colapsa a mono — no se cancela nada por fase)
- [ ] Sin ruido/click/pop residual · sin cortes bruscos
- [ ] Naming aplicado · todas las versiones/idiomas presentes
- [ ] Metadata embebida si aplica (ISRC, chapters, tags)
- [ ] Licencia de música/voz/SFX documentada
- [ ] **Confirmación humana antes de entregar**

> **Regla dura.** Mide el loudness con un medidor, no lo estimes. Cada destino tiene su target;
> "más fuerte" no es una entrega. True peak -1 dBTP siempre para evitar distorsión inter-muestra.
