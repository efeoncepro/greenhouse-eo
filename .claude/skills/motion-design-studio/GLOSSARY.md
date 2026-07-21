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

## VFX y compositing (ver `modules/11`)

- **Compositing**: combinar múltiples elementos (plates, CGI, título, IA) en una toma creíble. *Node-based*
  (Nuke/Fusion) para complejo; *layer-based* (After Effects) para mograph/ligero.
- **Keying / chroma**: extraer un sujeto de un green/blue screen. **Spill suppression** = quitar el verde
  que rebota en el sujeto. **Light wrap** = envolver el borde con luz del fondo para integrar.
- **Rotoscoping (roto)**: aislar un elemento sin green screen, frame por frame (o con IA — Roto Brush 2/Runway).
- **Matte**: la máscara que define qué parte de la imagen se usa.
- **Tracking / matchmove**: pegar un elemento al movimiento. *2D point* (un punto), *planar* (una superficie,
  Mocha), *3D camera / matchmove* (reconstruir la cámara para meter 3D).
- **Integración CGI**: meter 3D creíble en una toma (igualar luz/HDRI, sombra de contacto, reflejo, grano).
- **Simulación / dynamics**: humo, fuego, fluidos, partículas, cloth, destrucción (Houdini/C4D/Blender).
- **Stock element**: elemento pregrabado (humo/fuego/polvo) composited con blend modes — alternativa barata a simular.
- **Cleanup / beauty**: remover rigs, cables, logos, objetos; retoque.
- **Mocap markerless**: motion capture sin traje, desde 1 cámara (Wonder Dynamics / Autodesk Flow Studio).
- **Relighting**: cambiar/recuperar la luz de un video en post (Beeble).
- **VFX invisible**: la regla de oro — el mejor VFX no se nota. Si se ve el efecto, falló.

## Creative Studio — economía gobernada

- **Studio Credit**: unidad provider-neutral de una operación generativa gobernada; no es dinero, token,
  hora, pieza, licencia ni costo de proveedor.
- **Capability / quality tier / attempt**: operación semántica prometida, banda de calidad/fidelidad y cada
  intento auditable. En video, duración, tier y attempts son drivers del estimate.
- **Estimate / reservation / settlement**: rango informativo; hold idempotente aprobado; y consumo elegible
  conciliado después de review. **Release** libera remanente; **refund adjustment** compensa sin borrar historia.
- **Retry técnico vs cambio creativo**: falla provider/plataforma/spec objetiva no se cobra dos veces; una
  nueva dirección tras output válido crea branch y estimate nuevos.
- **Mode-neutral credits**: la misma operación consume la misma banda en `efeonce-managed`, `co-operated`
  y `client-operated`; capacidad y accountability se cobran por otra línea.
- **Deterministic finishing**: edición, conform, grade, mix/master, overlays, captions, render/export y
  cutdowns sin nueva inferencia consumen `0 credits`, aunque sí capacidad.
- **Rights outside credits**: voz/likeness, música, stock, talento, sync/master, territorio, plazo,
  exclusividad y buyout nunca se compran con saldo.
