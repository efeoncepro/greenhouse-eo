# 12 · Creative Workflows — recetas validadas end-to-end

> **Qué es esto.** No es teoría de craft ni catálogo de herramientas: son **recetas encadenadas,
> probadas en producción real**, que combinan las manos (mograph, IA, captura, composite) en un
> orden que *funciona*. Cada workflow trae: cuándo usarla, pasos, plantilla de prompt y evidencia.
>
> **Sello de frescura.** Los pasos son estables; los modelos/precios son volátiles
> `(as-of 2026-07 — reverificar → SOURCES.md)`.

---

## ⭐ Workflow A — "Reference-Video → Omni Enhance" (VALIDADO 2026-07-05, spot AEO Grader)

**La receta estrella.** **Construís tú un video/frame de referencia crisp** (mograph HTML+Playwright,
o un keyframe diseñado) **y se lo pasás a Gemini Omni como referencia** → el resultado **eleva el look
dramáticamente** (profundidad, glass, cámara, materiales, atmósfera premium que un mockup plano no tiene).

**Por qué funciona:** a Omni le das **composición, layout, marca y "qué mostrar" exactos**; Omni sólo
tiene que aportar el *tratamiento cinematográfico*. Es text-to-video dirigido por una referencia fuerte,
no un prompt a ciegas.

**Pasos:**
1. **Construí la referencia crisp** — con **logos y assets REALES** (ver Regla de logos abajo). Elementos
   focales **grandes y claros**, fondo oscuro con "aire" para que Omni meta profundidad/reflejos.
2. **Exportá:** UI → mockup HTML + captura Playwright (Workflow C); escena → keyframe (`design-studio` /
   `greenhouse-ai-image-generator`).
3. **Pasá a Omni** — `inlineData` (image/png **o** video/mp4) + el prompt template de abajo.
   Endpoint/contrato: `efeonce/STUDIO_TOOLING.md` (global · `responseModalities:[TEXT,VIDEO]`).
4. **Evaluá el output:** look ✅ — pero **micro-texto/logos se deforman** (no-determinista: en el test
   "ChatGPT→ChatOFT", "Perplexity→Pespically", precio 890→850, logo fantasmeado). **Nunca confíes la
   exactitud al output IA.**
5. **Componé la UI/logos reales crisp ENCIMA** del plate Omni (o mezclá beats): **el plate da el look,
   el overlay da la exactitud.** Este es el cierre canónico.

**Regla de logos (señalada por el operador 2026-07-05):** la **referencia DEBE llevar los logos/assets
REALES** — Efeonce (`public/branding/*`) + marcas reales de los motores (ChatGPT/OpenAI, Perplexity,
Google, Gemini, Copilot) desde **fuente oficial / brand kit**, NUNCA monogramas estilizados ni dibujados
a mano (regla `greenhouse-digital-brand-asset-designer`). Dos motivos: (a) Omni aproxima mejor la
forma/color real; (b) son los que después se componen crisp en el overlay.

**Plantilla de prompt (Omni-enhance) — mejorada:**
```
[REFERENCIA adjunta: pantalla/UI]. Re-render this exact interface as a premium, high-end cinematic
product shot. PRESERVE EXACTLY, do not change/translate/invent: all headline text, the question, the
citations and their order, the engine names and logos, the Efeonce logo, all prices and numbers.
TREATMENT: the interface floats in a dark premium studio; slow [push-in | lateral drift] camera;
soft shallow depth of field; subtle glass reflections and rim glow; elegant grade (deep teal + warm
amber); cinematic bokeh behind. Keep composition and layout IDENTICAL to the reference. 24fps, 720p.
```
> El "PRESERVE EXACTLY" **reduce** el garbling pero no lo elimina — por eso el paso 5 (overlay) es
> obligatorio para todo texto/logo que sea el mensaje.

**Costo:** ~$1 / clip 10s 720p. **Evidencia:** `~/Documents/Efeonce-AEO-Spot/AEO-Slice1_Omni-cinematic.mp4`.

---

## Workflow B — "Reference-Chaining" (continuidad entre tomas, VALIDADO)

Tomas text-to-video independientes se ven **desconectadas**. Solución: **cada toma usa el ÚLTIMO frame
de la anterior como `inlineData` de referencia** + el prompt del beat siguiente → mundo/luz/composición
consistentes (probado: la referencia salió casi idéntica). Es la cura de la "desconexión".

## Workflow C — "UI-heavy sin After Effects" (HTML + Playwright)

UI/producto (prompt box, chat, citas, cursor, gauge) **NO con video IA** (deforma texto/logos). Mockup
HTML/CSS/JS animado (timeline `setTimeout`/CSS) con **logo real embebido** → captura Playwright
(`recordVideo` 1280×720, **correr el `.mjs` desde la raíz del repo**) → empaquetado con
`pnpm media:web-video` si va a web. Legible, on-brand, cero créditos, frame-perfect. Detalle en
`efeonce/STUDIO_TOOLING.md`.

## Workflow D — "Híbrido mundo-IA + UI real compuesta" (el spot completo)

- **Mundo / emoción / cámara** → Gemini Omni (Workflow A/B).
- **UI / citas / gauge / logo / texto exacto** → mograph crisp (Workflow C), compuesto encima o en cortes.
- **Hilo** → un POV + transiciones (pull-back / match-cut) que conectan los beats.
- **Sonido** → `audio-studio`. **Grade/finish/upscale** → módulos 08 + Magnific.

---

## Cómo elegir

| Necesito… | Workflow |
|---|---|
| Que un mockup/keyframe se vea premium-cinematográfico | **A** (reference → Omni enhance) + overlay |
| Que varias tomas IA no se vean sueltas | **B** (reference-chaining) |
| UI/texto/citas/gauge **legibles y exactos** | **C** (HTML + Playwright) |
| Un spot que mezcla mundo IA + producto | **D** (híbrido) |

> **Regla transversal:** el **look** puede venir de IA; la **exactitud** (texto, citas, logos, números,
> marca) **siempre** de assets/mograph reales compuestos. El operador aprueba antes de entregar; gasto
> gobernado en cada generación IA.

**Generaliza:** el patrón "construí una referencia real → deja que la IA le suba el tratamiento → componé
lo exacto encima" también aplica en `design-studio` (imagen) y `audio-studio` (voz de referencia → estilo).
