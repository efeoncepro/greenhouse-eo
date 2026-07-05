# Sound Design Brief — [Nombre del proyecto]

> **Qué es esto.** El plan de audio: música, SFX/foley, ambiences, sync, voz y mezcla. El sonido es
> el 50% del impacto y el primero que se descuida. Regla dura: **el sonido se diseña, no se pega al
> final** — nace con el animatic. Doctrina: `modules/07_SOUND_MUSIC_DESIGN.md`; sync a corte → `edit-decision-list.md`.

## Encuadre

| Campo | Valor |
|---|---|
| Pieza | [nombre · tipo · duración] |
| Destino de sonido | [ON (sala/broadcast) · OFF-first (feed social) · ambos] |
| Basado en | [animatic-shotlist.md · edit-decision-list.md] |
| Estado | [scratch · en diseño · mezcla · masterizado] |

## Música

- **Mood.** [aspiracional · tensión · cálido · épico · minimal/tech]
- **Tempo / BPM.** [n] — debe coincidir con los cortes del EDL
- **Referencia(s).** [tracks de referencia · qué tomar de cada uno]
- **Origen y licencia.** [librería (nombre) · original/compuesta · cliente aporta · **licencia confirmada: sí/no**]
- **Estructura.** [intro · build · drop/pico · outro — mapeados a los beats de la pieza]

## SFX / Foley por momento

| Timecode / toma | Elemento | Tipo | Nota |
|---|---|---|---|
| [00:02] | [whoosh de transición] | [SFX] | [en el whip-pan del corte 2] |
| [00:05] | [impacto / stinger] | [SFX] | [refuerza el clímax] |
| [00:xx] | [foley: pasos/tela/click] | [foley] | [realismo del personaje/objeto] |
| [00:14] | [logo sting] | [SFX] | [en el corte al logo] |

## Ambiences

- **Camas de ambiente.** [room tone · exterior · textura de fondo — dan cuerpo y continuidad entre cortes]
- **Dónde entran/salen.** [por sección · fade con los cortes]

## Hit points y sync

- **Hit points musicales.** [timecodes donde música + corte + acción coinciden]
- **Sync a la imagen.** [qué eventos visuales exigen acento sonoro: entrada de texto, impacto, reveal de logo]
- **Silencio como recurso.** [dónde bajar todo para que el siguiente hit pegue]

## Voz en off / VO

- **¿Hay VO?** [sí/no] · **Idioma(s).** [es-CL · +en-US] · **Tono.** [cercano · autoritario · cálido]
- **Guion.** [pega el guion o link · tiempos por línea]
- **LipSync.** [aplica si hay personaje hablando — modelo/herramienta: Higgsfield LipSync / Kling Voice Binding]
- **Origen de voz.** [talento humano · voz IA (`generate_audio` / `create_voice`) · **disclosure si aplica**]

## Mezcla

- **Niveles / balance.** [VO al frente · música de soporte · SFX puntual · jerarquía clara]
- **Ducking.** [música baja bajo la VO automáticamente · dónde]
- **Loudness target.** [**-14 LUFS** web/social · **-23 LUFS** broadcast (EBU R128) · **-16 LUFS** podcast] — confirma por destino
- **True peak.** [≤ -1 dBTP]

## Entregables de audio

| Entregable | Formato | Destino |
|---|---|---|
| [mezcla estéreo] | [WAV 48kHz/24-bit · AAC en el master] | [web/social] |
| [stems] | [música / VO / SFX separados] | [archivo / futuras versiones] |
| [versión sin VO / M&E] | [música + efectos] | [doblajes / otros idiomas] |

## Checklist de cierre

- [ ] Música con licencia confirmada (no se entrega con track sin derechos)
- [ ] BPM de la música coincide con los cortes del EDL
- [ ] Hit points diseñados donde imagen + sonido deben pegar juntos
- [ ] Loudness al target del destino (-14 web / -23 broadcast) y true peak ≤ -1 dBTP
- [ ] Ducking hace que la VO siempre se entienda sobre la música
- [ ] Si el destino es OFF-first, la pieza no depende del audio para el mensaje
- [ ] Voz IA con disclosure si el contexto lo exige (`SKILL.md` §5)
- [ ] Stems / M&E entregados para versiones e idiomas futuros
