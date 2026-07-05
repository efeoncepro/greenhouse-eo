# 09 · Mezcla · mastering · loudness — el craft que hace que suene pro

> **Qué cubre.** El oficio que decide si un audio suena amateur o profesional: EQ,
> compresión, de-ess, gating, espacio (reverb/delay), balance/paneo, cadena de master,
> limiting; los **targets de loudness 2026 por destino**; metering; y export/formatos.
> **El craft es estable**; los **targets de loudness son lo volátil** — reverifícalos
> `(as-of 2026-07 — reverificar)`. Cierra con `templates/mix-master-delivery-spec.md`.

---

## 1. EQ — sustractivo primero

Corta antes de sumar. Quitar lo que sobra limpia más que realzar lo que falta.

| Movimiento | Zona | Efecto |
|---|---|---|
| **High-pass (voz)** | ~**80 Hz** | Quita retumbe, popping y rumble de sala sin adelgazar la voz. |
| **De-mud** | **200–400 Hz** | Atenúa el "barro"/cartón que emborrona la voz y la mezcla. |
| **Presencia** | **3–5 kHz** | Suma inteligibilidad y cercanía; con cuidado, la fatiga vive aquí. |
| **Aire** | **>10 kHz** | Brillo y "aire" sutil; shelf suave, no realce agresivo. |

- **Substractivo antes que aditivo:** encuentra la frecuencia molesta con un boost estrecho de
  barrido, luego **córtala**. Reserva los realces para el pulido final.
- **EQ dinámico / multibanda** cuando una zona molesta solo en los picos (sibilancia, resonancia
  puntual) — corrige solo cuando aparece, no todo el tiempo.

---

## 2. Compresión — controlar la dinámica con intención

Sabe qué hace cada parámetro y por qué lo mueves:

- **Threshold:** dónde empieza a actuar. Bájalo hasta que la compresión toque solo los picos que
  quieres domar.
- **Ratio:** cuánto reduce. Voz hablada **3:1–4:1** (control transparente); una voz muy dinámica
  o un bus puede pedir más. Ratios altos (8:1+) = limitación, para picos, no para color.
- **Attack:** rápido aplasta transientes (quita "punch"); lento los deja pasar (mantiene
  presencia). En voz, un attack medio conserva la consonante y controla la vocal.
- **Release:** rápido "respira" (puede bombear); lento suaviza. Ajusta al ritmo del habla/tempo.
- **Makeup gain:** recupera el nivel perdido para comparar a igual loudness (si no, "más fuerte"
  parece "mejor" y te engañas).

> **Serial > brutal:** dos compresores suaves (3 dB c/u) suenan más naturales que uno haciendo
> 6 dB. Igual que en cleanup: varias etapas suaves ganan a una agresiva.

---

## 3. De-ess, gating, espacio

- **De-ess:** doma la sibilancia en **5–8 kHz**. Usa un de-esser (compresión de banda estrecha)
  en vez de un corte fijo de EQ, para que solo actúe en las "s".
- **Gating / expansión:** baja el ruido entre frases sin cortar de golpe. Usa umbral y release
  suaves para no comerte el final de las palabras ni el room tone.
- **Espacio (reverb / delay) con criterio:** la reverb ubica y da cohesión, pero **demasiada
  aleja e enturbia**. En voz de podcast/VO: poca o nada. En narrativa: la reverb es narrativa
  (define el lugar). Manda la reverb por un **send** (bus), nunca insertada al 100% en la pista,
  y filtra sus graves y agudos para que no compita con la voz seca.
- **Delay** para profundidad sin embarrar: un slap corto o un eco rítmico suman espacio con más
  claridad que subir la reverb.

---

## 4. Balance, paneo y cadena de master

- **Balance:** iguala la loudness percibida de cada elemento (no el fader, el **oído**). La voz
  al frente; música y efectos ceden espacio con EQ complementario y ducking.
- **Paneo:** ubica elementos en el estéreo para que no se peleen por el centro; en podcast/VO la
  voz va **al centro y mono-compatible**.
- **Cadena de bus/master (orden típico):** EQ correctivo → compresión de bus suave (glue, 1–3 dB)
  → EQ de color/tonal → **limiter** al final. Cada eslabón con propósito; no apiles plugins por
  inercia.
- **Limiting:** el último en la cadena; sube la loudness al target sin pasar el true-peak ceiling.
  No lo uses para "arreglar" una mezcla desbalanceada — arregla la mezcla antes.

---

## 5. Loudness por destino (2026) — el corazón de la entrega

`(as-of 2026-07 — reverificar targets por plataforma cada trimestre.)`

| Destino | Loudness integrado | True peak | Nota |
|---|---|---|---|
| **Música streaming** (Spotify, YouTube, Tidal, Amazon) | **-14 LUFS** | **-1 dBTP** (Amazon **-2**) | Estándar de música on-demand. |
| **Apple Music** | **-16 LUFS** | -1 dBTP | Apple normaliza más bajo que el resto. |
| **Podcast** | **-16 LUFS mono** / **-19 LUFS estéreo** | -1 dBTP | Voz mono ahorra tamaño; estéreo si hay música. |
| **Broadcast (TV/radio)** | **-23 LUFS** (EBU R128 / CALM Act) | -1 dBTP | Norma legal de broadcast; no es opcional. |
| **Social** | según red | varía | Coordina con `social-media-studio` (loudness por red). |

> **El rango dinámico es ventaja competitiva.** Las plataformas **normalizan** todo al mismo
> nivel: subir el master "más fuerte" aplastando la dinámica **no** lo hace sonar más alto en
> Spotify — solo lo deja más plano y sin vida frente a uno con dinámica. Masteriza al target y
> **conserva el rango**; ahí está la diferencia perceptible.

---

## 6. Metering (mide, no adivines)

- **LUFS integrado:** loudness promedio de toda la pieza — es lo que se compara con el target.
- **LUFS short-term (3 s) / momentary (400 ms):** la loudness instantánea; útil para ver picos de
  energía y balance en tiempo real.
- **True peak (dBTP):** el pico real tras reconstrucción D/A; mantenlo bajo el ceiling del
  destino (-1, o -2 en Amazon). Un peak digital a 0 dBFS puede pasarse a true-peak — por eso el
  margen.
- **LRA (loudness range):** cuánta dinámica tiene la pieza. Muy bajo = aplastado; muy alto para
  el destino = incómodo (una voz de podcast con LRA de disco de cámara se hace ininteligible en
  el auto). Ajusta al contexto de escucha.

---

## 7. Export y formatos

| Uso | Formato | Sample rate / bit | Nota |
|---|---|---|---|
| **Master de archivo / entrega a cliente** | **WAV** (o AIFF) | 24-bit / 48 kHz (o el del proyecto) | Sin pérdida; el master canónico del que sale todo. |
| **Distribución voz** | MP3 | 128 kbps mono | Podcast voz. |
| **Distribución música / estéreo** | MP3 / AAC | 192–320 kbps estéreo | AAC rinde mejor a igual bitrate. |

- **Dither** solo al reducir bit depth (24→16-bit) en el paso final; nunca dos veces.
- **Sample rate:** entrega al que pide la plataforma; convierte con un buen SRC y una sola vez.
- Entrega el **WAV master** más los derivados comprimidos que pida el destino; guarda el WAV como
  fuente de verdad.

---

## 8. Checklist de mezcla + master

☐ EQ substractivo (HP 80Hz, de-mud 200–400, presencia 3–5k, aire >10k) · ☐ compresión con
propósito (voz 3:1–4:1) · ☐ de-ess 5–8 kHz · ☐ gating suave sin comer palabras · ☐ reverb por
send y filtrada · ☐ voz centrada y mono-compatible · ☐ cadena de master ordenada · ☐ **target
de loudness correcto por destino** · ☐ true peak bajo el ceiling · ☐ LRA adecuado al contexto ·
☐ WAV master 24/48 + derivados · ☐ dither solo al bajar bits.

> **Remite a** `templates/mix-master-delivery-spec.md` para fijar por escrito el target de
> loudness, true peak, formato y entregables del proyecto antes de exportar, y a
> `templates/audio-critique.md` para auditar una mezcla existente.
