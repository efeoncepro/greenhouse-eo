# Sika LIC-1164 — fuentes de la propuesta gráfica «POSIBLE»

Generadores con los que se construyó el lienzo y el PDF de la propuesta (2026-10-06/07). Se copiaron desde el
scratchpad de la sesión para que no se pierdan: **tienen rutas absolutas a ese scratchpad** y no corren tal cual; son
la referencia exacta de cómo se armó cada tablero.

| Carpeta | Qué hace |
|---|---|
| `fuentes/manual/` | `gen.py` (firma, sello de lanzamiento, página de tablero) · `gen2.py` (post y módulo de producto) · `gen3.py` (fórmula de titular) · `gen4.py` (Master Graphic y Evolución) · `gen_hoja3.py` (hoja 3) |
| `fuentes/storyboard/` | `frames.py` + `shot.cjs`: cuadros 1080×1920 del storyboard del reel |
| `fuentes/reel/` | `build.py`: composición HyperFrames del animatic |
| `fuentes/hoja3/` | piezas de la hoja 3, sombra de contacto desde la silueta y prompts de escenas nuevas |
| `fuentes/lienzo/` | `sign.py` (pie Efeonce Creative Studio, idempotente) · `sb_board.py` · `shot.cjs` (render local con mapa de blobs) · `canvas.json` |
| `fuentes/pdf/` | `build.cjs`: un tablero por página, a su tamaño |

Portada cine: `../2026-10-06_sika-portada-cine/`. Caso completo:
`docs/commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md`.
