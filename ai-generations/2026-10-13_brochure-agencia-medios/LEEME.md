# Brochure «Agencia de Medios» — 2026

**Estado:** aprobado por el operador el 2026-10-16. Canon: delta del 2026-10-16 en
[`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).

- **Entregable:** `Efeonce-Brochure-Agencia-de-Medios.pdf` (65 páginas, índice con 15 vínculos internos), copiado a
  OneDrive `4. Comercial/Brochures/2026/Agencia de Medios/`.
- **Canvas:** https://claude.ai/code/artifact/d32a798b-3bb2-493f-85dc-8c46366ee077 (copia en `canvas/project/`:
  `canvas.json` con el orden y las notas, una `.dc.html` por lámina que apunta a su blob).
- **Línea:** Voice (acento `#f83902`, fondo `#001a33`).

## Recorrido

Portada · Índice · El cambio · Plataformas · Creatividad · Programática · Medición · Trabajar juntos · Glosario.
El orden exacto, con número de página, está en `canvas/project/canvas.json`; los destinos del índice, en
`pdf/build-pdf.mjs`.

## Cómo se produce cada tipo de lámina

| Tipo | Cómo | Dónde |
|---|---|---|
| Láminas de receta (portada, voz con foto) | `pnpm brand:compose -- --intent <json> --out <dir>` (`cover-brochure`, `proposal-cinematic`) | `intents/`, `out/` |
| Láminas nativas (formatos, performance, programática, capítulos, partners, cobro, índice) | `node native/formatos.mjs` → HTML → PNG con `shot.cjs` del deck SEO/AEO | `native/formatos/`, `laminas/` |
| Medición e insights | copiadas del brochure 360 y recoloreadas a Voice | `native/medicion/` |
| Pantallas con anuncios de ejemplo | composición por homografía (`componer-pantallas.mjs`) → acabado `pnpm ai:inpaint` → reponer el aviso exacto (`reponer-pantalla.mjs`) | `marca-ejemplo/`, `acabado/` |
| PDF | `node pdf/build-pdf.mjs` (Playwright, imágenes JPEG q90, índice HTML vivo en la página 2) | `pdf/` |

Las marcas de ejemplo son ficticias: **Nórtica** (`marca-ejemplo/nortica.mjs`) y **Andara** (`marca-ejemplo/ui.mjs`).

## Trampas medidas

- El acabado del modelo reescribe el logo de la marca de ejemplo («NÁRTIKA»): siempre reponer el aviso exacto encima.
- Pantallas fuera de foco: desenfocar dentro de la máscara de cada pantalla; el inpainting dejaba rectángulos claros.
- sharp: `removeAlpha` + `joinChannel` en el mismo pipeline pierde el alfa; `blur` sobre raw de 1 canal devuelve 3
  canales sin `.extractChannel(0)`.
- La receta `decision-case` exige tema claro: el caso se armó nativo.
- `outline: true` de Playwright no generó marcadores: la navegación es el índice.

## Pendientes antes de entregar afuera

Ver «Cautelas» en el delta del canon: cifra de Bresler contra su caso publicado, autorización de logos de clientes
(TASK-1937), readback de HubSpot Gold, inventario de Basis por mercado, alcance de DCO/incrementalidad con
Performance, y no mezclar «cinco países de operación» con el proof point «120+ empresas en 4 países».

Los PNG están fuera de git (`/ai-generations/**/*.png`); para recuperarlos, `pnpm ai-gen:where` / `pnpm ai-gen:pull`.
