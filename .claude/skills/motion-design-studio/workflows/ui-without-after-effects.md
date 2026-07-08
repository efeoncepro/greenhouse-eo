# UI-heavy sin After Effects (HTML + Playwright)

> **Estado:** validado — 2026-07-05 (spot AEO Grader, Slice 1).
> **Evidencia:** `~/Documents/Efeonce-AEO-Spot/AEO-Slice1_UI-crisp.mp4`.

## La idea en una frase

Cuando el motion es **UI/producto** (prompt box, chat, citas, cursor, gauge, dashboards, tipografía
legible), **NO uses video IA** (deforma texto/logos). Construye un **mockup HTML/CSS/JS animado** con el
**logo real embebido** y **captúralo con Playwright** → video legible, on-brand, frame-perfect, cero créditos.

## Cuándo usarla

- Beats donde el **texto/citas/números/logos deben ser exactos** (el corazón de un producto/answer-engine).
- Animaciones de UI: typing, cursor que "clickea", burbujas de chat, unfold de ventanas, gauges, contadores.
- Cuando no hay After Effects disponible y el agente debe **producirlo por sí mismo**.

## Pasos (encadenados)

1. **Escribí el mockup** `aeo_ui.html`: layout answer-engine (o el producto), timeline JS
   (`async/await` + `setTimeout`) para orquestar typing → cursor → burbujas → citas → ventana → boleto →
   end-card. Embebe el **logo real** (`<img src>` a un asset de `public/branding/*` copiado al lado).
2. **Script de captura** `capture.mjs` (Playwright): `newContext({ recordVideo:{dir,size:{1280,720}},
   viewport:{1280,720} })` → `page.goto('file://…')` → `waitForTimeout(<duración animación>)` →
   `context.close()` (flushea el webm).
3. **Córrelo DESDE LA RAÍZ DEL REPO** (gotcha: el scratchpad NO resuelve `node_modules` →
   `ERR_MODULE_NOT_FOUND`; copia el `.mjs` a la raíz, `node _cap.mjs`, bórralo). Playwright ya está instalado.
4. **Empaquetado web:** `pnpm media:web-video -- --input <webm> --out-dir <dir> --stem <name>`.
   Genera WebM + MP4 fallback + poster; ver `docs/operations/web-media-delivery-tooling.md`.
5. (Opcional) sube el look con `reference-video-to-omni.md` (pasas este mp4 a Omni) — pero la versión crisp
   es la que aporta la **exactitud** en el híbrido.

## Qué NO hacer / gotchas

- ❌ Correr el script Playwright desde el scratchpad (fuera del repo) → no resuelve `playwright`.
- ❌ Texto/logos por IA. Acá justamente **todo es real y legible**.
- ✅ Timeline determinista (timings explícitos) para que la captura sea reproducible.

## Costo

**Cero créditos IA.** Solo tiempo de CPU (captura ~duración del clip).

## Evidencia

`AEO-Slice1_UI-crisp.mp4` — pregunta del Mundial → thinking → citas (agencias) → clic → boleto → logo
Efeonce real. Todo nítido. 2026-07-05.
