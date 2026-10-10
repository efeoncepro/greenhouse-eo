# Deck «Servicios web y digitales» de Efeonce (línea Engine) — aprobado 2026-10-09

Brochure de 29 láminas, 16:9, de todo lo que Efeonce vende en servicios web y digitales (las seis familias de
Wave + Experience LaunchOps + puertas de entrada + modelos de contratación). El operador lo aprobó el
2026-10-09 («este deck está listo»).

- **Canvas (privado):** <https://claude.ai/artifact/SnJS7zHHPTBPwcJvv7e9t7> (Design, sistema «Efeonce — La órbita»).
- **PDF (16:9, 29 páginas, rasterizado):** OneDrive
  `Alineación/4. Comercial/Brochures/2026/Web/Efeonce-Brochure-Servicios-Web.pdf`; copia en esta carpeta.
- **Fuente:** `project/*.dc.html` + `project/canvas.json` (copia exacta de lo publicado en el canvas, versión 67).
  `order.json` = orden de las láminas. `blobs/` = los assets del canvas (`/_blob/<id>`), bajados con
  `Artifact read path=<id>`; los PNG/JPG no entran a git (viven en el asset store del canvas y en esta carpeta).
- **Rehacer el PDF:** traer `artifact-type/dc-runtime.js` del canvas a `project/` (no va en git) y correr, desde
  la raíz de greenhouse-eo:
  `node ai-generations/2026-10-09_deck-web-nexa-spark/deck/exp/render-pdf.mjs ai-generations/2026-10-09_deck-web-nexa-spark/deck <salida.pdf>`.
  Es el mismo render del brochure Agencia Creativa: runtime real del canvas, captura 1920×1080 a
  `deviceScaleFactor` 2 en JPEG q88, una imagen a sangre por página. **No usar `page.pdf` por lámina:** deja borde
  blanco y aplana el 3D (Partners, Plataformas, Resultados en vivo, Caso Aguas Andinas).
- **Imágenes generadas** (Sunburst, PNG transparente): `plates/`, prompts en `prompts/`, fichas en `fichas/`.

## Orden

01 Portada · 02 Tesis «Humanos y agentes» · 03 El contexto (−27 % HubSpot 2026, 50 % McKinsey 2025, <1 en 100
SparkToro 2026) · 04 Visibilidad en IA · 05 Qué hacemos (aprobada) · 06 Web Experience 360 · 07 Dónde construimos
(WordPress, Webflow, Lovable, Adobe Experience Manager, Astro, HubSpot Content Hub, a la medida Next.js/React) ·
08 Experience LaunchOps · 09 Search Visibility 360 · 10 Measurement & Analytics · 11 Agent Systems & Platforms ·
12 Automation & Integrations · 13 Product Design 360 (aprobada) · 14 Sección «¿Por qué con ustedes? Un solo equipo» ·
15 La diferencia · 16 Clientes (+127 % Sky, +180 % Bresler) · 17 Caso Berel · 18 Caso Aguas Andinas (ANAM) ·
19 Partners · 20 Equipo «Expertos multidisciplinarios» · 21 Mercados · 22 Sección «¿Cómo empezamos? Contigo» ·
23 Resultados en vivo (Efeonce Insights) · 24 Puertas · 25 Plan de 90 días · 26 Cómo contratar · 27 Riesgos ·
28 Próximos pasos · 29 Contraportada.

## Pendientes antes de mandarlo a un prospecto

- **Caso Aguas Andinas (18): cifras inventadas como marcador** a pedido del operador (−45 %, 100 %, 3 → 1, 92 % y la
  línea de fuente «primeros seis meses»). Reemplazar por las reales.
- **Caso Berel (17):** cifras del deck SEO/AEO aprobado (+54 %, +120, ×2, +38 %, «12 meses»), pero la cuenta se
  adjudicó en mayo de 2026: confirmar plazo o fuente.
- **Titular repetido:** 26 y 27 dicen «Empiezas chico».
- Logos de clientes sólo con autorización de uso (TASK-1937).
