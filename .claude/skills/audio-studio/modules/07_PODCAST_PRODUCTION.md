# 07 · Producción de podcast — grabación → cleanup → mezcla → master → distribución

> **Qué cubre.** El workflow completo de un episodio: formato y estructura del show,
> setup de grabación (local y remoto), edición y montaje, cleanup (reducción de ruido
> multi-pasada), mezcla, mastering al target de podcast, chapters/ID3/metadata/artwork,
> export y distribución, más la extracción de clips 60–90s para short-form.
> **El craft es estable**; lo volátil son las herramientas IA de cleanup y los detalles de
> loudness de cada plataforma `(as-of 2026-07 — reverificar)`. Cierra con
> `templates/podcast-episode-plan.md`.

---

## 1. Formato y estructura del show (decisión antes de grabar)

La estructura es un contrato con el oyente: se repite episodio a episodio y crea hábito.

| Bloque | Duración típica | Función |
|---|---|---|
| **Cold open** | 10–30 s | Un hook: el mejor momento del episodio o una pregunta que abre bucle. Engancha antes de la intro. |
| **Intro + mnemonic** | 5–15 s | Sonic branding del show (audio logo/mnemonic) + nombre del podcast + tagline. Igual cada vez. |
| **Bienvenida / setup** | 30–90 s | Quién habla, de qué va el episodio, por qué importa hoy. |
| **Segmentos (2–5)** | el cuerpo | Bloques temáticos con transiciones sonoras (stinger corto) entre uno y otro. |
| **Ad / mención** | 15–60 s | Si aplica: patrocinio o autopromoción, marcado como capítulo aparte. |
| **Outro + CTA** | 20–45 s | Cierre, agradecimiento, **un solo CTA claro** (suscríbete / deja reseña / link), y mnemonic de salida. |

> **Regla de consistencia.** Mismo sonido, misma estructura, **mismo día y hora de salida**.
> Esto no es estética: es **confianza algorítmica** (las plataformas premian regularidad) y
> **hábito del oyente**. Define esta plantilla una vez y respétala.

**Antes de grabar, define:** duración objetivo, número de voces, si hay invitado remoto,
qué segmentos, qué música/stingers, y quién dirige el ritmo.

---

## 2. Setup de grabación

**Especificación base (no negociable):**

- **24-bit / 48 kHz** en la captura. 24-bit da headroom real; 48 kHz es el estándar de
  producción audiovisual. No grabes a 16-bit "para ahorrar" — pierdes margen de edición.
- **Niveles / headroom:** apunta picos entre **-20 y -12 dBFS**. Nunca cerca de 0. El
  headroom es tu seguro contra clipping en risas, énfasis y toses; la loudness se resuelve
  después en el master, no subiendo el gain hasta el techo.
- **Mic technique:** distancia constante (un puño del micro), eje estable, filtro anti-pop,
  y separación de fuentes de ruido (aire, teclado, teléfono en silencio). Un buen tratamiento
  de sala vence a cualquier plugin de cleanup.

**Remoto — graba doble-ender (patrón Riverside/Zencastr-style):**

- Cada participante graba **su propia pista local** en alta calidad; la llamada solo sirve
  para conversar. Al final, cada quien sube su archivo limpio. Evitas la compresión y los
  dropouts de la llamada.
- Pide **pista por persona** (no mezcla estéreo) para editar y mezclar cada voz por separado.
- Ten un respaldo: graba también la llamada como red de seguridad por si un local falla.

**Checklist pre-grabación:** ☐ 24-bit/48kHz confirmado ☐ picos -20/-12 dB en prueba
☐ audífonos cerrados (evita bleed) ☐ pista por voz ☐ 10 s de **room tone** al inicio
☐ nivel de invitado calibrado ☐ notificaciones y ventiladores apagados.

---

## 3. Edición y montaje

El montaje define el ritmo. Un episodio bien editado se siente más corto de lo que dura.

- **Corte de estructura primero:** arma el orden de segmentos, mete cold open, intro y outro.
- **Quita muletillas y aire muerto:** "eh", "este", "o sea", silencios largos, falsos arranques
  y divagaciones. No sobre-edites hasta que suene robótico: deja respiraciones naturales y el
  ritmo humano de la conversación.
- **Ritmo:** acorta pausas entre turnos, pero conserva las pausas dramáticas intencionales.
- **Transiciones:** stinger o fade corto entre segmentos; nunca un corte seco de un tema a otro.
- **J-cuts / L-cuts** entre voces para que las entradas suenen conversacionales, no cortadas.

---

## 4. Cleanup (reducción de ruido — pasadas LIGERAS múltiples)

> **Principio.** Varias pasadas **suaves** suenan mejor que una pasada agresiva. Una sola
> reducción fuerte deja artefactos metálicos ("underwater voice"). Aplica poco, escucha,
> repite.

Orden recomendado de cleanup:

1. **De-hum / de-noise de banda ancha** — quita zumbido eléctrico y ruido de fondo constante,
   suave. Usa el room tone capturado como perfil de ruido.
2. **De-click / de-mouth** — chasquidos de boca y saliva.
3. **De-breath** — atenúa (no elimines) respiraciones fuertes; bajarlas 6–12 dB suele bastar.
4. **Spectral repair** — quita eventos puntuales (una silla, un golpe, una notificación).

**Herramientas** `(as-of 2026-07 — reverificar)`: **iZotope RX 11** (de-click, de-breath,
spectral repair — el estándar de restauración), **Adobe Podcast / Enhance** (limpieza de voz
"un clic", útil para material remoto malo), Higgsfield `enhanceSpeechPoll`, Adobe
`media_enhance_speech`. Detalle de enrutado IA en el módulo 10.

---

## 5. Mezcla

- **EQ substractivo primero:** high-pass en la voz ~80 Hz (quita retumbe), atenúa barro
  200–400 Hz, suma presencia 3–5 kHz, aire suave >10 kHz. (Craft completo en el módulo 09.)
- **Compresión de voz:** ratio **3:1 a 4:1**, attack medio, release adaptado al habla; iguala
  la dinámica sin aplastar. De-ess si hay sibilancia (5–8 kHz).
- **Nivel de la voz:** apunta la voz a **-16 LUFS integrado** en la mezcla.
- **Música bajo la voz:** cuando hay voz encima, la música va **-18 a -20 dB** por debajo, con
  **ducking** automático para que baje al hablar y suba en los silencios.
- **Balance entre voces:** iguala loudness percibida entre host e invitado (no dejes que uno
  suene lejos y el otro encima).

---

## 6. Mastering (al target de podcast)

- **Loudness integrado:** **-16 LUFS mono** (voz sola) / **-19 LUFS estéreo** si el episodio
  lleva música/estéreo. `(as-of 2026-07 — reverificar targets por plataforma.)`
- **True peak ceiling:** **-1 dBTP**. Deja margen para la codificación lossy (MP3/AAC).
- **Motor de mastering:** **Auphonic** automatiza loudness normalization, true-peak limiting y
  leveling multi-track de forma consistente episodio a episodio — ideal para no depender del
  oído cada semana. Alternativa manual: limiter + loudness meter en el DAW.
- **Verifica** en el meter: integrado en target, LRA sano, sin true-peak sobre -1 dBTP.

---

## 7. Chapters, ID3, metadata y artwork

- **Chapter markers:** cold open, cada segmento, ad, outro. Mejoran navegación y son citables.
- **ID3 tags:** título del episodio, nombre del show, número/temporada, autor, año, género.
- **Descripción (show notes):** resumen, timestamps, links, invitados, créditos. Es SEO y AEO
  del episodio — trátala como contenido, no como relleno.
- **Artwork:** portada del episodio en la resolución que exige la plataforma (cuadrada, alta
  resolución). Coordina la identidad visual con `design-studio`.

---

## 8. Export y distribución

| Contenido | Formato | Bitrate | Canales |
|---|---|---|---|
| Voz sola | MP3 | **128 kbps** | **mono** |
| Con música / estéreo | MP3 | **192 kbps** | **estéreo** |

- Mono para voz: mitad de tamaño, misma inteligibilidad. Estéreo solo cuando el contenido lo
  justifica (música, ambiente, radiodrama).
- Sube al host (RSS), publica en el mismo día/hora habitual, propaga a las plataformas.

**Clips 60–90 s para short-form:** extrae 2–4 momentos con gancho, subtitúlalos, formatea el
audio a la norma de cada red (coordina con `social-media-studio`) y úsalos como puerta de
entrada al episodio completo. El clip vende el episodio; el episodio construye el hábito.

---

## 9. Checklist de cierre del episodio

☐ Grabado 24-bit/48kHz, picos -20/-12 dB · ☐ Doble-ender si hubo remoto · ☐ Montaje con
muletillas fuera y ritmo cuidado · ☐ Cleanup multi-pasada (sin voz "underwater") ·
☐ Voz -16 LUFS, música -18/-20 dB con ducking · ☐ Master -16 LUFS mono / -19 estéreo,
-1 dBTP · ☐ Chapters + ID3 + show notes + artwork · ☐ Export MP3 128 mono / 192 estéreo ·
☐ Clips 60–90s extraídos · ☐ Publicado en día/hora consistente · ☐ Confirmación humana antes
de publicar.

> **Remite a** `templates/podcast-episode-plan.md` para planificar el episodio completo
> (estructura, segmentos, música, invitados, distribución) antes de grabar.
