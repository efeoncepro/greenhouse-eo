# GLOSSARY — motion-design-studio (vocabulario de motion/cine 2026)

> Términos que hay que usar bien. es-CL neutro. Los datos con fecha (modelos, features) son
> volátiles → ver `SOURCES.md` y reverificar antes de citarlos.

## Craft de animación

- **Timing vs spacing**: *timing* = cuántos frames dura un movimiento; *spacing* = cómo se
  distribuyen las posiciones dentro de ese tiempo. El spacing decide el peso y el ease.
- **Easing (slow in / slow out)**: acelerar/desacelerar en vez de velocidad constante; lo que
  hace que un movimiento se sienta físico, no robótico.
- **Anticipación / follow-through / overlapping**: preparar un movimiento, y que las partes
  sigan/se arrastren tras el impulso. Los que dan vida.
- **Arco**: los movimientos naturales siguen curvas, no líneas rectas.
- **Hold**: una pausa deliberada; el silencio del movimiento.
- **Beat**: el pulso rítmico; el corte y el movimiento "caen" en el beat de la música.
- **Frame rate**: fps. 24 = look de cine; 30/60 = video/fluidez. Decide la sensación.

## Cine y cámara

- **Tipos de plano**: wide/establishing, medium, close-up, extreme close-up.
- **Movimientos de cámara**: dolly (adelante/atrás), truck (lateral), pan (gira horizontal), tilt
  (gira vertical), crane/jib, orbit, tracking, push-in, crash zoom, handheld.
- **Distancia focal / lente**: wide (más contexto/distorsión) vs tele (compresión/bokeh). DoF =
  profundidad de campo; shallow DoF = fondo desenfocado (look cine).
- **Eje 180° (line of action)**: regla de continuidad; no cruzar el eje entre planos o se
  desorienta al espectador.
- **Match on action / L-cut / J-cut / jump cut / match cut**: tipos de corte.

## Storyboard y producción

- **Storyboard**: la película dibujada plano por plano antes de producir.
- **Animatic**: storyboard con timing + audio scratch = el primer "corte" que prueba el ritmo
  barato, antes de gastar en producción.
- **Previs**: previsualización 3D/animada de tomas complejas.
- **Shotlist**: lista de tomas a producir (con cómo se produce cada una: humano o modelo IA).
- **EDL (Edit Decision List)**: el plan de montaje (qué clip, in/out, transición).

## Sonido y finish

- **Sound design / foley / SFX / ambience**: capas de audio (efectos, foley = sonidos del cuerpo/
  objetos, ambiente). El sonido es la mitad del motion.
- **Hit point / sync**: momento donde audio y video "pegan" juntos.
- **Ducking**: bajar la música bajo la voz automáticamente.
- **Loudness (LUFS)**: nivel percibido; target ~-14 LUFS web, ~-23 broadcast.
- **Color grading vs corrección**: *corrección* = balance técnico; *grading* = el "look" (cálido/frío,
  contraste, teal&orange). **LUT** = preset de look.
- **Render / codec**: exportar. H.264/H.265 (web), ProRes (edición/master). Rec.709 (HD) vs P3/HDR.

## Video IA (ver matriz en `SOURCES.md`)

- **Image-to-video (i2v)**: generar video desde una imagen fija (keyframe) — más control que text-to-video.
- **Keyframe**: still preciso de inicio/fin que ancla la toma.
- **Soul ID**: identidad de personaje entrenada (Higgsfield) para consistencia entre tomas.
- **Voice Binding**: voz consistente de un personaje entre cortes/idiomas (Kling).
- **Cinema Studio**: presets de cámara + focal length (Higgsfield) para dirigir la toma.
- **Generative upscaling / hallucination**: subir resolución inventando detalle plausible (Magnific).
- **Video Sequence Enhancement**: upscaling frame-consistent de video (Magnific analiza el movimiento
  entre frames, no cada frame aislado).
- **Chunking**: generar tomas largas en trozos de 5–8s (los modelos fallan >10s) y montarlos.
- **Character drift**: cuando el rostro/voz de un personaje cambia entre tomas IA; se evita con Soul ID/refs.
