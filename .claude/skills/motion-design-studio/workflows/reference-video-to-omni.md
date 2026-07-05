# Reference-Video → Omni Enhance ⭐

> **Estado:** validado — 2026-07-05 (spot AEO Grader, Slice 1).
> **Evidencia:** `~/Documents/Efeonce-AEO-Spot/AEO-Slice1_Omni-cinematic.mp4`.

## La idea en una frase

**Construyes tú una referencia crisp** (mockup HTML+Playwright, o un keyframe diseñado) **y se la pasas a
Gemini Omni** como `inlineData` (imagen **o** video) + un prompt de "vuélvelo cinematográfico premium" →
el resultado **eleva el look dramáticamente** (profundidad, glass, cámara, materiales, atmósfera) que un
mockup plano no tiene. Es text-to-video **dirigido por una referencia fuerte**, no un prompt a ciegas.

## Cuándo usarla

- Tienes un mockup/keyframe/diseño **plano** y quieres que se sienta **premium/cinematográfico**.
- Quieres el look de un modelo de video IA **sin perder tu composición, layout y marca**.
- El video de referencia (Playwright) sube aún más el resultado que un solo frame.

## Pasos (encadenados)

1. **Construye la referencia crisp** con **logos y assets REALES** (ver Regla de logos). Elementos focales
   **grandes y claros**; fondo oscuro con "aire" para que Omni meta profundidad/reflejos.
2. **Exporta:** UI → `ui-without-after-effects.md` (HTML + Playwright, mp4); escena → keyframe
   (`design-studio` / `greenhouse-ai-image-generator`).
3. **Pasa a Omni** — `inlineData` `image/png` **o** `video/mp4` + el prompt de abajo. Contrato completo:
   `efeonce/GEMINI_OMNI_VERTEX.md` (región `global` · `responseModalities:["TEXT","VIDEO"]` · `x-goog-user-project`).
4. **Evalúa el output:** look ✅ — pero **micro-texto/logos se deforman** (no-determinista; ver gotchas).
5. **Compón la UI/logos reales crisp ENCIMA** del plate Omni (o mezcla beats). **El plate da el look; el
   overlay da la exactitud.** Cierre obligatorio para todo texto/logo que sea el mensaje.

## Regla de logos (dura — señalada por el operador 2026-07-05)

La **referencia DEBE llevar los logos/assets REALES** — Efeonce (`public/branding/logo-negative.svg` para
fondo oscuro, `logo-full.svg`, `SVG/isotipo-efeonce-negativo.svg`) + marcas reales de los motores
(ChatGPT/OpenAI, Perplexity, Google, Gemini, Copilot) desde **fuente oficial / brand kit**, NUNCA
monogramas estilizados ni dibujados a mano (regla `greenhouse-digital-brand-asset-designer`). Motivos:
(a) Omni aproxima mejor forma/color reales; (b) son los que después se componen crisp en el overlay.
> Deuda actual: en Slice 1 usé monogramas estilizados de motores — **pendiente rehacer la referencia con
> los marks reales.**

## Plantilla de prompt (Omni-enhance)

```
[REFERENCIA adjunta: pantalla/UI]. Re-render this exact interface as a premium, high-end cinematic
product shot. PRESERVE EXACTLY, do not change/translate/invent: all headline text, the question, the
citations and their order, the engine names and logos, the Efeonce logo, all prices and numbers.
TREATMENT: the interface floats in a dark premium studio; slow [push-in | lateral drift] camera;
soft shallow depth of field; subtle glass reflections and rim glow; elegant grade (deep teal + warm
amber); cinematic bokeh behind. Keep composition and layout IDENTICAL to the reference. 24fps, 720p.
```

**Cómo iterar el prompt (a probar y documentar acá):** ser más específico en la **cámara** (velocidad,
dirección, focal), el **material** (glass/metal/holograma), la **atmósfera** (partículas/humo), y anclar
la **paleta** a la marca. Cuanto más "cinematográfico" pidas, más se aleja del layout — buscar el punto.

## Qué NO hacer / gotchas

- ❌ Confiar la **exactitud** (citas, nombres de motores, precio, logo) al output IA — los deforma
  (test: "ChatGPT→ChatOFT", "Perplexity→Pespically", precio 890→850, logo fantasmeado). Overlay real, siempre.
- ❌ Referencia con texto **chico**: Omni conserva mejor el texto grande; el chico se garbla.
- ❌ Saltar el paso 5 (overlay) cuando el micro-texto ES el mensaje.

## Costo / gasto gobernado

~**$1 / clip 10s 720p** (5.792 tok/s · $17.50/1M). Diverge barato, sube calidad de lo elegido; upscale a
1080p+ en el finish (Magnific/Higgsfield). Confirmación humana antes de entregar.

## Evidencia

- Referencia (mía, crisp): `AEO-Slice1_UI-crisp.mp4`.
- Omni desde frame: `AEO-Slice1_Omni-desde-frame.mp4`.
- Omni desde video (el mejor): `AEO-Slice1_Omni-cinematic.mp4`. Todos en `~/Documents/Efeonce-AEO-Spot/`.
