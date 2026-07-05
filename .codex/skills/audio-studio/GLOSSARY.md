# GLOSSARY — audio-studio (vocabulario de audio 2026)

> Términos que hay que usar bien. es-CL neutro (tuteo). Los datos con fecha (modelos, licencias,
> targets) son volátiles → ver `SOURCES.md` y reverificar antes de citarlos.

## Señal y niveles

- **dBFS**: decibeles full-scale (digital). 0 dBFS = el techo; todo lo demás es negativo.
- **Headroom**: margen entre tu pico y 0 dBFS. Grabar con picos -20 a -12 dB deja headroom.
- **Gain staging**: manejar el nivel correcto en cada etapa de la cadena para no ensuciar ni saturar.
- **True peak (dBTP)**: pico real tras la conversión a analógico/codec. Techo típico -1 dBTP.
- **LUFS**: Loudness Units Full Scale — el estándar de **sonoridad percibida** (integrado, short, momentary).
- **LRA (Loudness Range)**: cuánto varía la sonoridad a lo largo de la pieza (rango dinámico).

## Frecuencia y dinámica

- **Espectro**: sub (<60Hz), graves (60-250), medios (250-2k), presencia (2-5k), aire (>10k).
- **EQ**: ecualización. *Substractiva* (quitar lo que sobra) antes que aditiva. *High-pass* corta graves
  innecesarios (voz ~80Hz). *De-mud* = quitar barro 200-400Hz. *Presencia* 3-5kHz = claridad de voz.
- **Compresión**: reduce el rango dinámico (ratio/threshold/attack/release). Voz típica 3:1-4:1.
- **De-ess**: comprimir la sibilancia (5-8kHz) de las "s".
- **Limiting**: compresión extrema que impide pasar de un techo (master).

## Voz

- **Proximity effect**: realce de graves al acercarse mucho al micrófono.
- **Off-axis**: apuntar el mic a la esquina de la boca (no de frente) para reducir plosivas/sibilancia.
- **Plosivas**: golpes de aire (P/B/T) que saturan; se controlan con pop filter + ángulo.
- **Room tone**: el "silencio" de la sala; se graba para rellenar y dar consistencia.
- **IVC / PVC**: Instant Voice Cloning (muestra sub-minuto) vs Professional (3-6h, calidad alta). Ambos
  exigen **consentimiento**.
- **Audio tags** (ElevenLabs v3): etiquetas inline `[whispers]`, `[laughs]`, `[excited]`, `[sighs]` que dirigen emoción.
- **Dubbing**: doblaje IA que preserva las características de la voz cross-idioma.

## Música y sonic branding

- **Sonic logo / mnemonic / audio logo**: frase musical corta (2-5s) que transmite la identidad de marca.
- **Sistema sónico**: framework flexible derivado del mnemonic → long-form, cues cortos, UI sounds, broadcast.
- **Score**: música original compuesta para una pieza (vs library/stock).
- **Stem**: pista/grupo separado de una mezcla (voz, música, SFX) para re-mezclar.
- **BPM**: beats por minuto; el tempo.

## SFX y narrativa

- **SFX**: efecto de sonido. **Foley**: SFX de cuerpo/objetos hechos a mano y sincronizados.
- **Ambience / atmósfera**: capa de fondo que sitúa la escena (calle, oficina, naturaleza).
- **Stinger / whoosh / impact**: acentos sonoros de transición.
- **Binaural / espacial (Atmos)**: audio 3D que ubica sonidos alrededor del oyente.

## Producción y IA

- **DAW**: Digital Audio Workstation (el software de producción).
- **Noise reduction multi-pass**: limpiar en varias pasadas ligeras, no una agresiva (suena más natural).
- **Auphonic / iZotope RX**: motores de mastering / restauración.
- **Loudness normalization**: las plataformas nivelan todo a un target (por eso "más fuerte" ya no gana).
- **Seed Audio 1.0**: modelo unificado (diálogo + música + SFX + ambiente en una pasada).
- **Licencia comercial**: el derecho a usar el audio en algo monetizado/cliente. **ElevenLabs Music** la da
  desde día 1; **Suno/Udio** tienen historia más compleja. Documenta la fuente.
- **Consentimiento de voz**: permiso explícito del dueño para clonar/usar su voz. No opcional.
