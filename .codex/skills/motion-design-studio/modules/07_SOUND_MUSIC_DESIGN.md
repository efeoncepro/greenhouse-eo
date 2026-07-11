# 07 · Sound & Music Design — la mitad invisible del motion

> **Tesis.** El sonido es **la otra mitad del motion**, no un adorno final. Un motion con
> timing impecable y grade premium se siente amateur si el sonido está pegado, plano o
> desincronizado; un motion visualmente modesto se siente pro si el sonido respira, golpea
> en el beat y mezcla limpio. **El oído perdona menos que el ojo.** El craft de esta sección
> es **atemporal** (no reverificar). Lo único volátil es la síntesis de voz IA (§8).

> Cierra con `templates/sound-design-brief.md`. Se sincroniza con `modules/02` (timing/tempo/
> hit points) y `modules/06` (el corte cae donde cae el sonido).

> **Borde con `audio-studio`.** Este módulo cubre el sonido **sincronizado a la imagen** (hit
> points, sync al corte, LipSync, mezcla a picture). El **craft profundo de audio como pieza
> propia** — dirección de voz, creación musical/jingle, sonic branding, SFX/foley, producción de
> podcast, mezcla/mastering al target de loudness, y el pipeline de audio IA (ElevenLabs/Seed
> Audio/Suno/Udio con sus **licencias**) — vive en la skill **`audio-studio`**. Para producir la VO,
> la música o los SFX de una pieza, **dirígete a `audio-studio`** y sincroniza el resultado acá.

---

## 1. Por qué el sonido decide si un motion se siente pro

- **El sonido dirige la atención.** Un whoosh empuja el ojo hacia el elemento que entra; un
  impacto ancla el momento clave. Sin diseño sonoro, el ojo no sabe qué mirar.
- **El sonido crea peso y física.** Un logo que aterriza con un *thump* grave pesa; el mismo
  logo sin sonido flota. El sonido completa los 12 principios (`modules/01`) que la imagen sola
  no termina de vender.
- **El sonido fija el género.** Los mismos frames con música orquestal → épico; con synthwave →
  retro; con piano solo → íntimo. La banda decide el tono emocional antes que el color.
- **El silencio es una herramienta.** Un corte a silencio absoluto antes del climax pega más que
  subir el volumen. Dinámica > loudness constante.

**Regla dura:** ningún motion se entrega "listo" sin pasada de sonido. Un render mudo es un
work-in-progress, no un master.

---

## 2. Las cuatro capas del diseño sonoro

| Capa | Qué es | Ejemplos | Rol |
|---|---|---|---|
| **SFX / diseño** | Sonidos de eventos y transiciones | whoosh, impact, riser, sub-drop, glitch, UI-tick, click | Puntúa la acción, marca los golpes |
| **Foley** | Sonidos de objetos/cuerpo "reales" | pasos, tela, papel, líquido, teclado | Realismo, textura háptica |
| **Ambience / room tone** | Fondo continuo del espacio | oficina, calle, viento, hum de sala | Espacio, continuidad, "pega" los cortes |
| **Música** | Score o track licenciado | orquestal, electrónica, tensión, stinger | Emoción, tempo, arco |

- **Layering:** un buen impacto casi nunca es un solo archivo. *Sub* (peso grave) + *body* (medio) +
  *transient/crack* (agudo) apilados y ecualizados. Un whoosh premium = ruido filtrado con
  automatización de pan + pitch bend + reverb tail.
- **Ambience como pegamento:** un room tone tenue y continuo bajo toda la pieza disimula los
  empalmes entre tomas (crítico con tomas IA que no comparten espacio real, ver `modules/09`).

### Silencio activo y acciones repetidas

Cuando una intro no lleva música ni VO, el silencio no elimina el diseño: hace más importante el
foley. Cada contacto físico relevante necesita su propio transient y su propia liberación; no copies
un click idéntico si la actuación debe leerse humana. Si sólo el segundo gesto abre una señal, la
respuesta técnica entra después de ese segundo contacto y deja el primero sin recompensa sonora. El
audio nativo del modelo puede orientar timing, pero el master conserva foley/licencias/mezcla propios.

**Regla de rescate Omni (Glitch, 2026-07-11):** un MP4 de Omni puede ofrecer foley útil y fallar
visualmente al mismo tiempo. No adoptes el clip entero: cuenta los transientes, corta sólo las
ventanas solicitadas, elimina acentos inventados y remúxalos sobre la placa visual aprobada. Un prompt
literal `audio-only` fue rechazado en este caso; si se pide sonido nativo, la llamada debe ser una
edición audiovisual localizada y su video sigue sujeto al gate temporal completo.

---

## 3. Vocabulario de SFX de motion (los que más se usan)

- **Whoosh / swish** — transición, entrada/salida rápida. Direccional (pan L→R sigue el movimiento).
- **Impact / hit / thump** — aterrizaje, corte fuerte, aparición de logo. Con sub para peso.
- **Riser / uplifter** — tensión ascendente antes de un reveal o corte. Termina exacto en el hit.
- **Sub-drop / boom** — el golpe grave que acompaña al riser cuando "cae".
- **Glitch / stutter / digital** — estética hecha-a-mano/imperfecta (doctrina §5 de SKILL), tech, error.
- **Ticks / clicks / UI** — mográficos de datos, contadores, tipografía kinética que "teclea".
- **Drone / pad** — tensión sostenida bajo diálogo o texto, sin melodía.
- **Stinger** — acento musical corto que marca el logo final o un beat de marca.

> Curá una **paleta sonora** por proyecto igual que una paleta de color: 2-3 familias de SFX
> coherentes, no una bolsa aleatoria de sonidos "cool".

---

## 4. Música: elección, tempo y hit points

1. **Elige por función, no por gusto.** ¿La música lleva la emoción (brand film) o solo sostiene
   el ritmo (explainer)? Define energía, instrumentación y si hay o no melodía en primer plano.
2. **Tempo primero.** El BPM del track fija el ritmo del corte y del motion. Elige la música
   **antes** de bloquear el edit fino, o al menos el tempo objetivo. Editar contra un tempo estable
   es lo que hace que todo "caiga en su lugar" (ver `modules/02` y `modules/06`).
3. **Hit points / mickey-mousing controlado.** Identificá los golpes musicales (downbeats, el drop,
   el break) y alineá los momentos clave visuales a ellos: reveal del logo en el drop, corte duro en
   el downbeat. No mickey-mousees *todo* (cansa), pero los 3-5 golpes grandes sí.
4. **Arco emocional / sube-baja.** Un motion de 30s no es energía plana: build → break → drop →
   resolución. Mapeá el arco de la música al arco de la historia (`modules/04`). El bajón antes del
   climax hace que el climax pegue.
5. **Estructura y edición musical.** Casi siempre hay que **editar la música** (recortar, loopear,
   reordenar secciones) para que dure exactamente lo del corte y el drop caiga en el frame correcto.
   Corte musical limpio en cruces de fase, con crossfade corto.
6. **Licencia y disclosure.** Verificá licencia (comercial vs personal, broadcast vs web). Música IA
   generada: chequea términos de uso comercial `(as-of 2026-07 — reverificar)`.

---

## 5. Sync audio-visual — la regla de oro

**El corte y el movimiento caen en el beat.** Este es el único principio no-negociable del sonido
en motion:

- El **corte** (cambio de toma) cae en un downbeat o transient musical.
- El **golpe de animación** (el logo que aterriza, el texto que entra, el whoosh) coincide **frame-
  exacto** con su SFX y, si hay música, con el beat.
- **Anticipación sonora:** el riser empieza *antes* del hit visual; el sonido "anuncia" el movimiento.
  El transient del impacto cae en el frame del contacto, no un frame después.
- **Offset perceptual:** el oído detecta desync de audio adelantado ~20ms y de audio atrasado ~40ms.
  Para acentos, alineá el *transient* del SFX (no el inicio del archivo) al frame del evento.

**Checklist de sync:**
- [ ] Cada corte grande está en un beat (o silencio intencional).
- [ ] Cada golpe visual tiene su SFX frame-exacto.
- [ ] Los risers terminan exactos donde cae el hit.
- [ ] La entrada/salida de texto kinético tiene tick/whoosh alineado.
- [ ] El stinger del logo cae en el último downbeat.

---

## 6. Mezcla — niveles, ducking, loudness

- **Jerarquía de mezcla:** decidí qué manda en cada momento. Diálogo/VO > música > SFX > ambience,
  salvo en un golpe puntual donde el SFX manda 1 segundo.
- **Ducking:** baja automáticamente música y ambience bajo la voz (sidechain o keyframes de volumen,
  −4 a −8 dB durante la locución). Sin ducking, la VO pelea con la música y se pierde inteligibilidad.
- **Rango de niveles guía** (referencia, ajustar a la mezcla): VO/diálogo pico ~−6 a −3 dBFS, música
  de fondo −18 a −12 dBFS bajo voz, SFX según impacto. Deja headroom, no clipees.
- **EQ de separación:** haz espacio. Baja los medios de la música (~2-4 kHz) donde vive la voz.
  Filtrá lo que no aporta (high-pass a ambiences, low-cut a SFX finos).
- **Dinámica sobre volumen:** compresión suave para pegar, pero preservá el contraste
  fuerte/suave. Un master aplastado a loudness constante mata el impacto.

### Loudness — estándar de entrega (crítico, se audita)

| Destino | Loudness objetivo | True Peak | Nota |
|---|---|---|---|
| **Web / social / streaming** | **−14 LUFS** integrado | ≤ −1 dBTP | YouTube/IG/TikTok normalizan cerca de −14 |
| **Broadcast (EBU R128)** | **−23 LUFS** integrado | ≤ −1 dBTP (−2 recomendado) | TV/emisión, tolerancia ±0.5 LU |
| **Broadcast US (ATSC A/85)** | **−24 LKFS** | ≤ −2 dBTP | equivalente US |
| **Cine / trailer** | según spec del canal | — | pedir spec al distribuidor |

> **Regla dura:** mide LUFS integrados con un medidor de loudness (Resolve Fairlight, plugin de
> loudness), no "a oído". Entregar a loudness equivocado = rebote del canal o audio que la
> plataforma baja y suena débil. Anotá el target en `templates/motion-delivery-spec.md`.

---

## 7. Ambiences y room tone — el detalle que separa pro de amateur

- Todo espacio "real" tiene un tono de sala. Un motion 100% seco (solo SFX sobre silencio) suena
  sintético. Pon un ambience tenue continuo.
- **Continuidad entre cortes IA:** las tomas generadas por IA no comparten un espacio acústico real.
  Un ambience unificador por encima de toda la secuencia crea la ilusión de un mismo mundo (mismo
  truco que el grade unificador de `modules/08`).
- **Reverb de cohesión:** manda los SFX a un bus de reverb común (misma sala) para que suenen en el
  mismo espacio, no pegados de fuentes distintas.

---

## 8. Voz / VO + LipSync IA `(as-of 2026-07 — reverificar todo lo IA)`

- **VO humana** sigue siendo el estándar para marca emocional; la IA acelera drafts, pruebas de
  guion y volumen/idiomas.
- **Síntesis de voz (ElevenLabs vía Higgsfield):** genera VO en múltiples voces/idiomas; útil para
  scratch tracks, versionado multi-idioma y personajes. Verificá licencia de uso comercial y
  disclosure cuando aplique (boundary §5 del SKILL).
- **LipSync Studio (Higgsfield):** sincroniza labios de un personaje generado a una pista de voz
  (VO humana o ElevenLabs). Flujo: genera/elige la VO → LipSync sobre la toma del personaje →
  revisa frame a frame los fonemas de bordes (labiales P/B/M y abiertas A/O son los que delatan).
- **Voice consistency:** para un personaje recurrente, fijá la **voz** con la misma disciplina que
  fijás el rostro (Soul ID). Modelos con *Voice Binding* (Kling) mantienen la voz consistente entre
  cortes/idiomas — ver `modules/09`. La voz que deriva rompe la ilusión igual que el rostro que deriva.
- **Prosodia > TTS plano:** dirigí la voz IA como a un actor — marca pausas, énfasis, ritmo. Una VO
  IA plana suena a robot; con dirección de prosodia pasa por humana.

**Checklist de VO IA:**
- [ ] Voz elegida coherente con la marca y consistente entre tomas.
- [ ] Licencia comercial verificada `(as-of 2026-07)`.
- [ ] LipSync revisado en labiales/abiertas.
- [ ] Prosodia dirigida (pausas, énfasis), no TTS crudo.
- [ ] Disclosure aplicado si la voz simula a una persona real.

---

## 9. Errores frecuentes de sonido (checklist de crítica)

- [ ] **Motion mudo entregado como final** — falta la pasada de sonido entera.
- [ ] **SFX genéricos de librería sin editar** — mismo whoosh de stock que todos usan, sin layering.
- [ ] **Sin ducking** — la música tapa la VO.
- [ ] **Loudness equivocado** — no medido en LUFS, la plataforma lo baja o rebota.
- [ ] **Desync** — el golpe visual y el SFX no caen en el mismo frame.
- [ ] **Energía plana** — sin arco, sin build/drop, sin silencio; todo al mismo volumen.
- [ ] **Sin ambience** — cortes IA "pegados", sin espacio común.
- [ ] **VO IA plana** — sin prosodia, suena a robot; o sin disclosure cuando lo requiere.

> **Handoff:** completá `templates/sound-design-brief.md` con paleta sonora, referencia musical
> (tempo/BPM, hit points), plan de VO/idiomas, target de loudness y mapa de sync. El brief de
> sonido se entrega junto con el `edit-decision-list.md` para que el corte y el sonido queden atados.
