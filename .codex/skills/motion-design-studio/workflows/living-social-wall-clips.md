# Living Social Wall Clips — Omni i2v para formatos sociales vivos

> **Estado:** validado — 2026-07-08 (`/servicios/redes-sociales/`, muro `Muestra de trabajo`).
> **Evidencia:** `ai-generations/2026-07-08_social-wall-assets/motion-v3/review/wall-motion-v3-living-contact-sheet.jpg` + live verifier `/Users/jreye/Documents/greenhouse-eo/tmp/verify-social-wall-motion-v3.mjs`.

## Cuándo usarla

Usa esta receta cuando un sitio, deck o landing necesita mostrar piezas de
social media que se sientan como trabajo producido, especialmente cuando el
placeholder o formato dice:

- `UGC`;
- `Reel`;
- `Historia`;
- `Creador` / BTS / colaboración;
- cover/frame de una campaña social que debe sentirse viva.

No la uses para formatos que son naturalmente editoriales/estáticos
(`Carrusel`, `Post`, quote card) salvo que haya una razón narrativa fuerte.

## La idea en una frase

**Alive is not camera movement.** Un clip vivo no es una imagen con pan/zoom:
es una micro-escena donde sujeto, cámara, entorno y gramática del formato se
mueven con intención.

## Evidencia de cadena: imágenes primero, Omni después

Este no fue un caso de texto-a-video libre. La cadena publicada fue:

1. `gpt-image-2` generó un paquete ficticio de **ocho** key visuals de campaña: seis verticales desde `portrait-batch.json` y dos horizontales desde `landscape-batch.json`.
2. Los stills se revisaron como una familia coherente antes de animar: mural/macaws, paleta azul-verde, energía de campaña y **sin texto, logos ni UI que debieran sobrevivir literalmente**.
3. Sólo seis formatos que prometen footage (`Reel`, `Historia`, `UGC`, `Creador`) pasaron por Gemini Omni image-to-video con una referencia 720×1280 por slot; `Carrusel` y `Post` se mantuvieron estáticos.
4. Cada master Omni de 10 s se revisó, se recortó a un beat de 4 s y se publicó como WebM/MP4/poster **sin audio** para la pared de la landing.

Por eso es evidencia positiva para Omni en RRSS: la referencia funcionaba como ancla de **lenguaje visual** y la acción podía reinterpretarse dentro de la misma campaña ficticia. No demuestra que Omni sea la primera mano para todo visual de referencia; un set/producto/practical que debe retener identidad exacta y física hero se clasifica con el contrato de fidelidad: `engine-selection-by-fidelity-contract.md`.

## Pasos

1. **Define el trabajo del slot.** Decide si ese formato debe ser video o
   imagen. Mantén `Carrusel`/`Post` como WebP si su job es editorial.
2. **Genera o elige un still premium** que ya tenga composición, look y
   dirección de arte.
3. **Prepara referencia 9:16.** Para Omni/Vertex, escala/crop a 720x1280 para
   forzar salida vertical.
4. **Prompt por formato, no genérico.** Nombra acción, cámara, timing,
   física y fallos a evitar.
5. **Genera un sample primero.** En el caso validado, `muro-c1` UGC fue el
   gate porque expone lo falso rápido: si la persona no respira/parpadea/ríe,
   el batch no se corre.
6. **Genera el batch.** Produce masters 10s con Gemini Omni.
7. **Recorta a micro-loop usable.** Toma los mejores 3-4s, no todo el master.
8. **Transcode liviano.** Usa `pnpm media:web-video` para emitir WebM VP9
   primary + MP4 fallback + JPG poster, sin audio para muros autoplay. El
   runbook reusable vive en `docs/operations/web-media-delivery-tooling.md`.
9. **QA por contacto y runtime.** Contact sheet para evaluar vida/artefactos;
   Playwright para autoplay, hover pause, reduced-motion y overflow.

## Plantilla de prompt

```text
Global direction:
- Produce a premium fictional social media sample.
- This must feel like a living short-form clip captured in context, not a still image with pan/zoom.
- Preserve the supplied reference image's art direction, palette and premium craft.
- Keep the first 4 seconds as a complete usable beat for a website media wall.
- Motion must include believable anticipation, ease, arcs, overlap, blinking, breathing, fabric/hair/handheld micro-movement, lighting changes, shadows and parallax when humans or objects are present.
- Use cinematic social-native language: 24fps cadence, natural motion blur, shallow depth of field, textured light, subtle film grain.
- No readable text, no captions, no logos, no UI overlays, no watermarks.
- Avoid frozen faces, plastic skin, deformed hands, extra fingers, warped phones, melted murals, slideshow cuts, empty abstract motion, or camera-only movement.

Shot: <format-specific slot>.
Action: <what physically happens in the scene>.
Camera: <one dominant camera/lens move>.
Timing: 0.0-0.6 hold/anticipation, 0.6-2.7 action, 2.7-4.0 settle.
Failure modes: <what would make this feel fake>.
```

## Formato → acción mínima

| Formato | Debe sentirse vivo por… | Evita |
| --- | --- | --- |
| UGC | blink, laugh, shoulder/arm sway, front-camera imperfection, phone parallax | selfie still con zoom |
| Historia | hand/phone tilt, thumb/edge movement, glass reflections, screen/mural parallax | screenshot animado |
| Creador/BTS | framing adjustment, gimbal/phone movement, nod, background subject, production objects | poster de set |
| Reel/trend | body mechanics, foot contact, arm arc, mural/light reaction, settle pose | humano flotando o derretido |
| Reel finale | directional VFX arcs, depth, particles, final readable hero pose | abstract blobs sin intención |

## Qué NO hacer / gotchas

- ❌ Pan/zoom/glint sobre stills. El operador lo lee como falso aunque haya
  movimiento.
- ❌ Pedir "cinematic" sin nombrar física. Usa verbos y principios: blink,
  breathe, sway, rack focus, contact shadow, anticipation, arcs, follow-through.
- ❌ Animar todos los slots. Mantén static los formatos editoriales para no
  subir peso/ruido.
- ❌ Confiar en un batch sin sample gate. UGC/rostros/manos deben aprobarse
  primero.
- ❌ Olvidar reduced-motion. En web, el usuario que reduce motion debe ver el
  poster quieto.

## Costo / gasto gobernado

Gemini Omni/Vertex entrega masters de 10s. En el caso validado, cada master
reportó `57920` video output tokens. Genera primero un sample y sólo después el
batch. Recorta/transcodea sólo lo elegido.

## Evidencia

- Script: `ai-generations/2026-07-08_social-wall-assets/render-omni-motion-v3.mjs`.
- Review: `ai-generations/2026-07-08_social-wall-assets/motion-v3/review/wall-motion-v3-living-contact-sheet.jpg`.
- Runtime: `assets/video/social/wall/v3/`.
- Live verifier: `/Users/jreye/Documents/greenhouse-eo/tmp/verify-social-wall-motion-v3.mjs`.
- Captures: `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-motion-v3/`.
- Web packaging helper: `pnpm media:web-video`.
