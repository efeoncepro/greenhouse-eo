# 09 · AI Video Pipeline — dirigir el modelo como a un director de fotografía

> **Tesis.** Este módulo es el corazón "humano + IA". La IA **no reemplaza** el craft de los
> módulos 01–08: los **ejecuta más rápido**. El diferenciador no es "generar un video" — es
> **dirigir** el modelo (cámara, ritmo, consistencia) con el mismo lenguaje del `modules/03`, y
> **curar/finalizar** con juicio humano. Quien no dirige, obtiene clips genéricos; quien dirige,
> obtiene tomas.

> **Sello de frescura — MUY marcado.** El landscape de video IA cambia **por mes**: qué modelo
> lidera, qué features de cámara/consistencia existen, y el pricing. **Todo lo de este módulo está
> marcado `(as-of 2026-07 — reverificar)` y DEBE reverificarse con WebSearch/WebFetch antes de
> comprometer un pipeline.** El **framework** de prompt cinematográfico y los **modos de fallo**
> son más estables que la tabla de modelos.

> Cierra con `templates/shot-prompt-sheet.md` (una hoja por toma). Ejecución real y credenciales:
> `efeonce/STUDIO_TOOLING.md`. Boundaries: keyframes/stills → `greenhouse-ai-image-generator` /
> `design-studio`; formato por red → `social-media-studio`.

---

## 1. Selección de modelo por toma `(as-of 2026-07 — reverificar)`

No hay "el mejor modelo" — hay **el mejor modelo para ESTA toma**. Elige por lo que la toma necesita
(consistencia, control de cámara, duración, presupuesto, audio).

| Modelo / plataforma | Fuerte en | Notas clave `(as-of 2026-07)` |
|---|---|---|
| **Higgsfield** (agregador, MCP) | Acceso a 30+ modelos + tools propietarias | Sora 2, Veo 3.1, Kling 3.0, Seedance 2.0, Wan 2.6, MiniMax Hailuo bajo un techo. **Cinema Studio** (cámara), **Soul ID** (personaje), **LipSync**, i2v, upscaling. MCP = generar desde el chat |
| **Higgsfield Cinema Studio** | Control de cámara nombrado y **repetible** | Presets: dolly, crash zoom, orbit, crane, pan, tilt, tracking + elegir **focal length** + física óptica. El control de cámara más dirigible |
| **Higgsfield Soul ID** | **Consistencia de personaje** | Subir 3–5 fotos, entrenar ~5–10 min, reusar el mismo rostro en todas las tools. EL diferenciador |
| **Runway Gen-4.5** | **Cine dirigido** | Entiende beats y coreografía de cámara (pan/truck/handheld). Fuerte para narrativa dirigida |
| **Seedance 2.0** | Briefs detallados + refs multimodales | Reference-to-video con hasta 9 imágenes + 3 videos + 3 audios; 4–15 s; native audio. Puede usar previs 3D como **video exportado**; no recibe `.blend`. |
| **Seedance 2.5 vía Fal** | T2V, I2V y R2V; briefs largos, audio nativo y muchas refs | OpenAPI actual: 480p/720p, 4–30 s; I2V acepta `image_url` y `end_image_url`; R2V admite hasta 30 imágenes, 10 videos, 10 audios y 50 archivos totales, con audio condicionado a imagen/video. No declara 4K, máscara, storyboard, shots ni precio fijo; el costo publicado es una fórmula de Fal y debe refrescarse. |
| **Seedance 2.5 vía Higgsfield MCP** (`seedance_2_5`) | UI legible en la pantalla de un dispositivo, producto y refs indexadas; el operador lo indicó como el más potente para esto | `generate_video` con `mode: omni_reference` y roles `start_image`, `end_image`, `image_references`, `video_references`, `audio_references`; 4–30 s; 480p/720p/1080p; `bitrate_mode` standard/high; `generate_audio`. Medido 2026-09-11: **72 créditos Higgsfield por 8 s a 1080p**, ~4–5 min por render. Mecánica del MCP en `efeonce/STUDIO_TOOLING.md`; receta de pantallas en §7. |
| **Kling 3.0** | **Storyboarding multi-shot + Voice Binding** | Voz consistente en 6 cortes / 5 idiomas. Económico |
| **Veo 3.1** | **Broadcast** | Frame rate de cine, sync audio-visual nativo. ~$0.10/s |
| **Gemini Omni** | **Edición conversacional multi-turn** | Multimodal, consistencia entre turnos. Vertex (proyecto efeonce-group) |
| **Sora 2** | Consistencia temporal/física (líder) | ⚠️ **API deprecada 2026-03-24, shutdown 2026-09-24** → **NO basar nada nuevo**. Sigue accesible vía agregadores (Higgsfield) |
| **Magnific** (MCP + API) | **Upscale / enhance / finish** | Video Sequence Enhancement (frame-consistent), Precision API (detalle fiel), 2x–16x/8K. Paso de finishing, no de generación. Detalle en `modules/08 §8` |

**Heurística rápida:**
- Personaje recurrente y consistente → **Soul ID** (Higgsfield) para fijar rostro; **Voice Binding**
  (Kling) para fijar voz.
- Movimiento de cámara preciso y repetible → **Cinema Studio** (presets + focal).
- Muchas refs de producto/personaje + económico → **Seedance**.
- Broadcast con sync de audio → **Veo 3.1**.
- Iterar por conversación → **Gemini Omni**.
- Subir resolución / limpiar → **Magnific** (después del grade).

---

## 2. Framework de prompt cinematográfico

**Dirige la IA como a un director de cine: describe una escena FILMÁNDOSE, no una imagen.** El prompt
canónico tiene cuatro partes:

**`[dirección de cámara] + [ritmo de escena] + [acción/movimiento] + [detalles atmosféricos]`**

Ejemplo: *"Close-up, slow dolly forward while tilting up, revealing subject's face, cinematic shallow
DoF, 4s, smooth movement."*

- **Dirección de cámara** — tipo de plano + movimiento: *close-up, wide, aerial; slow push-in, dolly
  forward, tracking shot, crane up, orbit, whip pan*. Terminología técnica real (`modules/03`).
- **Ritmo de escena** — velocidad y calidad del movimiento: *slow, smooth, deliberate; snappy, urgent*.
  Duración: *4s*. Verbos de movimiento: *glides, drifts, swirls, rushes, creeps*.
- **Acción / movimiento** — qué pasa y en qué orden: *revealing…, as the door opens…, then settles on…*.
- **Detalles atmosféricos** — lente/óptica/luz/textura: *shallow DoF, anamorphic flare, volumetric
  light, film grain, backlit haze, 35mm, golden hour*.

**Reglas de prompt:**
- Usa **verbos de movimiento**, no adjetivos estáticos (una imagen "hermosa" no dirige; algo que
  *glides* sí).
- Especifica **focal length** y **DoF** cuando importe la óptica (Cinema Studio lo respeta).
- **Un movimiento dominante por toma.** Apilar dolly + orbit + zoom + tilt en 4s = caos. Una toma, una
  intención de cámara.
- **Duración explícita** (ver §5: tomas cortas, montar después).
- Itera el prompt como un director da notas: cambia **una** variable por vez para aislar qué mejora.

---

## 3. Image-to-video — keyframes primero (controlabilidad)

**Doctrina (SKILL §6.7): para tomas con inicio/fin claros, genera keyframes precisos y usalos como
referencia — mucho más control que text-to-video puro.**

1. **Diseña el/los keyframe(s)** como stills exactos (encuadre, personaje, luz, look). Generación de
   stills → **`greenhouse-ai-image-generator` / `design-studio`** (boundary). El still lleva ya la
   composición y el look que quieres.
2. **i2v desde el keyframe:** el modelo anima *desde* esa imagen, respetando composición y estilo.
   Reduce la deriva enormemente vs text-to-video. Excepción medida: en `omni_reference` (Seedance 2.5 vía
   Higgsfield) el `start_image` orienta, pero **no fija el encuadre**; el modelo puede reencuadrar durante el
   clip (ver §7).
3. **Start + end frame (cuando el modelo lo soporta):** dando el frame inicial **y** final, controlas
   el arco del movimiento (útil para transiciones y reveals precisos).
4. **Keyframes como red de seguridad de consistencia:** el mismo keyframe base reusado alimenta tomas
   coherentes entre sí.

> Regla: **primero los stills precisos, después el movimiento.** Text-to-video puro se reserva para
> plates/fondos/partículas donde el encuadre exacto no importa.

---

## 4. Consistencia de personaje / producto — EL diferenciador

**Sin consistencia, el personaje "deriva": cambia de cara, ropa, edad o voz entre tomas y se rompe la
ilusión.** Es el error #1 que separa el video IA amateur del pro. Herramientas `(as-of 2026-07)`:

- **Soul ID (Higgsfield):** subes 3–5 fotos, entrena ~5–10 min, y reúsas **el mismo rostro** en todas
  las tools (i2v, Cinema Studio, LipSync). El modo canónico para un personaje recurrente (incl. mascota).
- **Refs multi-imagen (Seedance 2.5 R2V, hasta 50 archivos):** cargas referencias de imagen, video y audio
  para orientar personaje, producto, movimiento, ritmo y voz; conserva el orden de las citas del prompt. Fuerte
  para producto (packaging, logo) que debe verse idéntico entre tomas, pero el límite documentado no es una
  garantía de consistencia de Globe.
- **Voice Binding (Kling):** fija la **voz** consistente en múltiples cortes/idiomas — la contraparte
  sonora de Soul ID (ver `modules/07 §8`).
- **Reference Image (Magnific)** en finishing: mantiene textura/estilo al upscalear.

**Disciplina:**
- Fija **identidad visual (rostro/producto) + voz** *antes* de generar volumen. Entrenar el Soul ID /
  cargar refs una vez, reusar en todas las tomas.
- Chequea deriva mirando las tomas **seguidas** (no una por una): rostro, ropa, color, escala, edad.
- Parte de la consistencia se refuerza en el **grade** (`modules/08 §4`), pero el grade corrige color,
  no un rostro que cambió. La consistencia se gana en la **generación**.
- Ilustraciones propietarias / mascota Nexa: no tratarlas como stock; disciplina de marca en
  `efeonce/EFEONCE_OVERLAY.md`.

---

## 5. Control de cámara — Cinema Studio y física óptica

- **Presets nombrados y repetibles (Cinema Studio):** dolly, crash zoom, orbit, crane, pan, tilt,
  tracking. Repetibles = puedes aplicar el **mismo** movimiento a varias tomas para coherencia de
  lenguaje de cámara en toda la pieza.
- **Focal length:** elegir la lente cambia el look — gran angular (dramatiza perspectiva, distorsiona
  bordes) vs teleobjetivo (comprime, aísla, aplasta fondo). Dirige la óptica, no solo el encuadre
  (`modules/03`).
- **Física óptica:** DoF, flares, distorsión coherentes con la lente elegida. Un shallow DoF real vende
  cine; un fondo plano delata IA barata.
- **Un movimiento por toma** (repetido de §2): la cámara tiene **una** intención por corte.

---

## 6. LipSync

- **LipSync Studio (Higgsfield) + voz (ElevenLabs / VO humana):** sincroniza labios del personaje a la
  pista de voz. Flujo: fijar personaje (Soul ID) → generar/elegir VO → LipSync → **revisar frame a
  frame** los fonemas de borde (labiales P/B/M, abiertas A/O — los que delatan el sync).
- Detalle de voz, prosodia y disclosure en `modules/07 §8`.

---

## 7. Modos de fallo 2026 y workarounds `(as-of 2026-07 — reverificar)`

| Modo de fallo | Síntoma | Workaround canónico |
|---|---|---|
| **Handheld / shaky** | Movimiento de cámara "a mano" sale tembloroso, con warping o grano raro | Genera **estático/suave** y agrega el *shake* en post (AE/Resolve), o suma grano en post. No pidas handheld al modelo |
| **Tomas > ~10s** | Deriva, morphing, pérdida de coherencia en clips largos | Genera en **chunks de 5–8s** y **monta** (`modules/06`). El master largo se arma editando, no generando de una |
| **Through-object moves** | Cámara que atraviesa un objeto (a través de una ventana, un anillo) se rompe | **Plates estáticos** + el *move* en post (compositing/3D camera en AE). No lo resuelve el modelo hoy |
| **Manos / texto / detalle fino** | Manos deformes, texto ilegible, logos derretidos | Evita primeros planos de manos/texto generado; pon el **texto real en post** (mograph, `modules/05`); logo compositeado, no generado. Excepción: la UI **dentro de la pantalla de un dispositivo** la renderiza el modelo (ver abajo) |
| **Texto chico en pantalla redibujado** | El modelo reescribe la UI desde el primer frame («B2S» por B2B) | Pantallas **video-safe** como `image_references` + frases exactas en el prompt (ver abajo) |
| **Reencuadre pese al `start_image`** | El sujeto crece o se desplaza durante el clip e invade el espacio del overlay | Mide el bounding box por frame y diagrama el overlay en las bandas libres (ver abajo) |
| **Edit `completed` con deriva temporal** | La edición cambia artefactos, cámara o anatomía fuera de la zona pedida | `completed` = candidato. Revisar 1×/0.5× + contact sheet; si sólo faltan timing/orden/repetición y las poses existen, retimar el mismo master en post (`workflows/omni-in-place-edit-and-deterministic-finish.md`) |
| **Deriva de identidad** | Personaje cambia entre tomas | Soul ID / refs / Voice Binding (§4) |
| **Deriva de color** | Cada toma con distinta temperatura/contraste | Grade de match unificador (`modules/08 §4`) |
| **Flicker en upscale** | Detalle "hierve" frame a frame | Video Sequence Enhancement frame-consistent, no upscale imagen-por-imagen (`modules/08 §8`) |

### Pantallas con UI dentro de un dispositivo (Seedance 2.5, verificado 2026-09-11)

Caso fuente: Short 9:16 «Nuestro Duo»
([`2026-09-11-iphone-duo-trendjack.md`](../../../../docs/operations/social/2026-09-11-iphone-duo-trendjack.md)).
Si la toma muestra un teléfono o plegable con UI legible, **la pantalla la renderiza el modelo dentro del
dispositivo**. Tres corridas lo fijaron:

| Corrida | Qué se probó | Resultado |
|---|---|---|
| 1 | Plate con las pantallas finales (texto chico) como `start_image` | Buen movimiento, pero el modelo **redibujó el texto** desde el primer frame: «B2S» por B2B, «Tu marce», «quieres» por «quieras». Rechazada |
| 2 | Pantallas en verde + reemplazo determinístico por frame con tracking de esquinas | Rechazada por el operador antes de usarse: el texto pegado no recibe luz, reflejos ni respuesta al movimiento, y no se ve dentro de la pantalla |
| 3 ✅ | Pantallas **video-safe** + plate como `start_image` + cada pantalla como `image_references` | Texto correcto y estable los 8 s, con brillo y reflejos nativos |

Receta aprobada:

1. **Pantallas video-safe:** mismo diseño, pero sólo pocas frases GRANDES. Fuera URLs, barra de estado,
   pestañas y texto diminuto; lo secundario pasa a barras grises.
2. **`mode: omni_reference`:** el plate como `start_image` y **cada pantalla como `image_references`**. En el
   prompt, indexa cada referencia (qué imagen va en qué pantalla) y lista las frases exactas entre comillas.
3. **No confíes el encuadre al `start_image`.** El modelo agrandó el teléfono y lo subió durante el clip (borde
   superior de 598 a 468 px; inferior máx. 1374 px) aunque el prompt pedía "upper 40% empty". Mide el bounding
   box del dispositivo por frame (ffmpeg a 4 fps + análisis de píxeles) y diagrama el overlay en las bandas
   libres. En este caso, logo + eyebrow + titular terminan en 440 px y la bajada parte en 1430 px, entre las
   manos, sobre la zona de UI de Shorts.
4. **Texto y logo de la pieza = overlay determinístico** con ffmpeg (PNG transparente, fade-in 0,6 s,
   `libx264 -crf 18`, 30 fps, AAC). Nunca pasan por el modelo.

QA: hoja de frames a 0/2/4/6/8 s; zoom de pantallas al inicio, medio y final para cazar texto deformado;
colisión overlay↔sujeto en el último frame. Mide el audio generado con `volumedetect` antes de mezclar (aquí:
media −29 dB, pico −11,5 dB). Salida publicada en YouTube vía Metricool como Short con
`isAiGeneratedContent: true`.

---

## 8. Upscale / finish con Magnific

Paso final de resolución/detalle, **después del grade**. Video → **Video Sequence Enhancement**
(frame-consistent); frames/stills → upscaler de imagen; nitidez fiel (texto/rostros/marca) →
**Precision API** con Resemblance alto. Cuesta créditos: dimensionar antes de volumen. Detalle
completo en `modules/08 §8`.

---

## 9. El loop IA + humano (cómo se produce de verdad)

```
dirigir (shot list + prompt sheet)
   → generar variaciones IA (rápido, volumen, barato por toma)
   → CURAR humano (elegir las tomas buenas, descartar deriva/artefactos)
   → clasificar el cambio: refinar una interacción sólo si faltan píxeles; si es editorial, terminar el clip existente de forma determinista
   → montar (edición, modules/06) → sonido (07) → grade (08) → upscale/finish (08 §8)
   → QC humano → entrega (con confirmación humana)
```

- **IA:** velocidad, volumen, variación (genera 3–5 variantes por toma y elige).
- **Humano:** composición final, timing, curaduría, polish, juicio de marca.
- El humano **dirige y cura**; el modelo **ejecuta**. No IA vs humano — IA + humano.

---

## 10. Gasto gobernado (regla dura)

**Producir/renderizar/upscalear con IA cuesta créditos.** Antes de correr sobre toda la pieza:

- **Dimensiona primero:** estima segundos totales × costo/s del modelo elegido (§1) + upscales. Una
  pieza de 30s a ~$0.10/s con 4 variantes por toma escala rápido.
- **Prueba en una toma**, valida calidad/consistencia, **recién ahí** genera el volumen.
- **Chunks, no clips largos** (§7) — también controla el gasto de re-tiradas.
- **Confirmación humana antes de volumen y antes de entregar** (boundary del SKILL §4/§5). El estudio
  dirige; no dispara créditos ni publica sin aprobación. Créditos/balance y ejecución:
  `efeonce/STUDIO_TOOLING.md`.

---

## 11. Tabla tarea/toma → modelo (plantilla de decisión)

| Toma / necesidad | Modelo recomendado `(as-of 2026-07)` | Por qué |
|---|---|---|
| Reveal cinematográfico con personaje consistente | Soul ID + Cinema Studio (Higgsfield) | Rostro fijo + cámara dirigida |
| Spot broadcast con audio sincronizado | Veo 3.1 | Frame rate de cine + sync nativo |
| Producto que debe verse idéntico en 6 tomas | Seedance 2.5 R2V (50 archivos totales) | Muchas refs orientan producto, movimiento y audio; validar continuidad antes del release |
| Diálogo de personaje multi-idioma | Kling (Voice Binding) + LipSync | Voz consistente 5 idiomas |
| Iteración conversacional de una escena | Gemini Omni | Edición multi-turn con consistencia |
| Plate / fondo / partículas | text-to-video (modelo barato del agregador) | Encuadre exacto no importa |
| Transición precisa inicio→fin | i2v con start+end frame | Control del arco de movimiento |
| Subir a 4K/8K + limpiar | Magnific (Sequence Enhancement / Precision) | Finish frame-consistent, después del grade |

> **Handoff:** una `templates/shot-prompt-sheet.md` por toma — plano, movimiento, focal, prompt de
> las 4 partes, modelo, refs de consistencia, duración, variantes a generar, costo estimado. La
> orquestación completa humano/IA/híbrido vive en `modules/10`.
