# 12 · Creative Workflows — recetas validadas end-to-end

> **Qué es esto.** No es teoría de craft ni catálogo de herramientas: son **recetas encadenadas,
> probadas en producción real**, que combinan las manos (mograph, IA, captura, composite) en un
> orden que *funciona*. Cada workflow trae: cuándo usarla, pasos, plantilla de prompt y evidencia.
>
> **Sello de frescura.** Los pasos son estables; los modelos/precios son volátiles
> `(as-of 2026-07 — reverificar → SOURCES.md)`.

> **Frontera importante.** Esta biblioteca empieza **después** de una decisión creativa: una receta
> validada es producción convergente, no exploración, conversación o un prompt prometedor. El agente
> puede proponer un plan editable, pero no elevarlo a workflow compartible sin evidencia, rúbrica,
> owner builder y límites de gasto/approval. Doctrina: `docs/research/RESEARCH-009-creative-operations-agentic-workflows.md`.

> **Cómo nace una receta.** La persona creativa preserva, explora, rechaza y aprueba; el sistema compila
> esas decisiones. No se le exige construir nodos. Esta biblioteca registra evidencia `efeonce-managed`;
> graduar una receta a `co-operated` o `client-operated` requiere responsabilidades, variables permitidas,
> derechos, costo, rúbrica y ruta de escalamiento explícitos sobre el mismo run.

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

## Workflow E — "Editar el clip existente → revisar → finish determinista" (VALIDADO CON CAVEAT 2026-07-11, Glitch)

**La distinción crítica:** que Omni complete una edición no significa que la actuación, anatomía y continuidad hayan pasado. La edición generativa es un **nuevo take técnico** y debe revisarse completa. Si el cambio pedido es sólo orden/timing de poses que ya existen, texto exacto, logo/practical o sonido, no hace falta pedir píxeles nuevos: se termina el **mismo clip** con post determinista.

1. **Clasifica el cambio antes de gastar:** cambio de geometría/objeto/acción inexistente → Omni edit; timing, repetición, freeze, orden de beats, texto/logo exacto o grade → edición/composite humano del clip existente. Foley nativo Omni sólo si el operador lo pide y siempre como guía de eventos, no promoción automática del video.
2. **Para Omni edit:** persiste la interacción (`store:true`), usa una sola instrucción delimitada y guarda `interaction_id`, prompt, input y output. El output `completed` es sólo candidato.
3. **Gate temporal obligatorio:** revisar a 1×, 0.5× y en contact sheet. Rechazar si deriva cámara, cantidad/anatomía de mano, objeto, iluminación o si aparecen artefactos fuera del cambio solicitado.
4. **Fallback correcto:** si las poses necesarias viven en el master, retima sólo material contiguo y reversos legibles; no regeneres por reordenar una acción. Componer tipografía/marks/practicals desde el asset fuente real, no desde letras IA.
5. **Finish:** foley independiente, room tone cuando la dirección lo pida, grade y QC. Un MP4 Omni puede aportar foley y fallar visualmente: extrae ventanas aprobadas, elimina acentos inventados y remúxalas sobre la placa que pasó QA. El render mudo o el MP4 del modelo nunca son master final por defecto.

El caso Glitch probó ambas rutas: Omni Interactions procesó el video pero fue rechazado por artefactos de continuidad. El finish F/I también se rechazó: retimar una presión no creó un golpe real y recomponer `ON AIR` lo hizo parecer una capa. La ruta exige una toma íntegra nueva; Seedance preservó su set pero aún no aprobó gesto/foley. Receta y límite: `workflows/omni-in-place-edit-and-deterministic-finish.md`.

## Workflow F — "Elegir por contrato de fidelidad" (EVIDENCIA LIMITADA 2026-07-11)

**No clasifiques por canal.** El caso RRSS fue `gpt-image-2` → set de key visuals ficticios → Omni image-to-video → beats web: funcionó porque cada microescena podía reinterpretarse dentro de la misma campaña y no contenía texto/practical exacto. Glitch exige lo contrario: el key visual es la verdad del set y el gesto/sound deben ser físicamente inequívocos; Seedance fue más fiel al mundo, pero aún no es un take aprobado.

Antes de gastar, declara si la referencia es una **ancla visual flexible** o una **identidad de set**; clasifica copy/UI, practical y actuación hero. Elige Omni para microescenas donde el modelo pueda interpretar desde un paquete de stills o para el loop conversacional; empieza por Seedance cuando la imagen existente, objeto y espacio deben conservarse; usa post sólo si los frames ya contienen la verdad física. Detalle y evidencia: `workflows/engine-selection-by-fidelity-contract.md`.

---

## Cómo elegir

| Necesito… | Workflow |
|---|---|
| Que un mockup/keyframe se vea premium-cinematográfico | **A** (reference → Omni enhance) + overlay |
| Que varias tomas IA no se vean sueltas | **B** (reference-chaining) |
| UI/texto/citas/gauge **legibles y exactos** | **C** (HTML + Playwright) |
| Un spot que mezcla mundo IA + producto | **D** (híbrido) |
| Cambiar una escena ya generada sin regenerar por reflejo | **E** (editar sólo si hacen falta píxeles nuevos; post determinista si no) |
| Elegir motor para una referencia, practical o acción física | **F** (contrato de fidelidad antes que canal/precio) |
| Convertir un clean shot aprobado en familia 15/10/6 sin nueva inferencia | **G** (`workflows/single-shot-to-deterministic-campaign-hero.md`) |

### Regla de routing de Workflow G

- **Omni** anima o edita una microescena cuando el plate tolera reinterpretación.
- **Seedance 2.0** sólo abre una toma, ángulo, acción o continuidad nuevos cuando conservar set/sujeto es
  prioritario. No se usa para reparar crop, pacing, copy/logo, grade, foley, mezcla ni loudness.
- Si los frames aprobados ya contienen la verdad visual, 15/10/6 se cierra con montaje, mograph y audio post
  determinísticos; cada duración tiene EDL, end card, poster y medición propios.

> **Regla transversal:** el **look** puede venir de IA; la **exactitud** (texto, citas, logos, números,
> marca) **siempre** de assets/mograph reales compuestos. El operador aprueba antes de entregar; gasto
> gobernado en cada generación IA.

> **Regla de aceptación:** `completed`, `succeeded` o un MP4 reproducible son estados técnicos. La aceptación creativa sólo ocurre después de revisar la actuación, continuidad, texto exacto y el corte con sonido.

**Generaliza:** el patrón "construí una referencia real → deja que la IA le suba el tratamiento → componé
lo exacto encima" también aplica en `design-studio` (imagen) y `audio-studio` (voz de referencia → estilo).
