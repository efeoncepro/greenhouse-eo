# Pibank · Propuesta técnica SEO/AEO 2027 — carpeta de producción

Producción de la propuesta técnica para Pibank (Banco Pichincha Perú), v10 del 2026-10-07: 44 láminas 16:9, línea
Engine. Aprobada por el CEO para presentar y como **estilo alternativo canónico** para propuestas técnicas SEO/AEO
(los brochures siguen con las recetas de La órbita).

- Canvas Design (privado): https://claude.ai/artifact/XpdEeKjFLWrCikqBEvnSfw, página «tecnica».
- PDF: `out/Pibank-Propuesta-tecnica-SEO-AEO-2027.pdf` (copia en OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/`).
- Método y reglas: `.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md`.
- Intents del compositor: `docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/`.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `build-tecnica.py` | Generador de las láminas `Tec-NN.dc.html` y del índice del canvas. Versiones anteriores: `build-tecnica-v3/v4/v4-papel/v6/v7.py`. |
| `axis-assets.mjs` → `axis-assets.json` | Navegación de capítulo, medida e íconos Trazo desde AXIS. |
| `paint-selection.mjs` | Pinta la selección colaborativa canónica sobre el elemento marcado con `data-gl-sel`. |
| `borrar-seleccion.mjs`, `quitar-seleccion-portada.mjs` | Quitan la selección que algunas recetas pintan siempre (portada, equipo, clientes). |
| `logo-en-centro.mjs` | Reemplaza la palabra «Pibank» por el logo en una lámina compuesta. |
| `teal2engine.cjs` | Lleva el turquesa de una imagen al acento Engine (láminas importadas, E-E-A-T, reporte). Revisar fotos al 100 %. |
| `render-pdf.mjs` | Renderiza las láminas con las imágenes locales y arma el PDF 16:9. |
| `fichas/`, `prompts/` | Foto de cierre BR3e/BR3f (portal Engine). |
| `logos-terceros/FUENTES.md` | Procedencia de los logos de bancos peruanos. |

Las imágenes (plates, composiciones, íconos 3D del ciclo, PDF) quedan fuera de git.

## Regenerar

```bash
python3 ai-generations/2026-10-07_pibank-propuesta/build-tecnica.py <carpeta project del canvas>
node ai-generations/2026-10-07_pibank-propuesta/paint-selection.mjs <carpeta project del canvas>
```

Después se publica la carpeta al canvas. Para el PDF, se bajan los `/_blob/<id>` del canvas (Artifact read con `path`
de a uno) y se corre `render-pdf.mjs <project> <carpeta de blobs> <salida.pdf>` desde la raíz del repo.

## Pendiente antes de enviar (OK del CEO)

1. Cifras y logos de BICECORP, Banco BICE y Berel en esta licitación (TASK-1937 para logos).
2. Si el correo de Insights y el modo presentación están operando.
3. Si aplica `pnpm tender:canonical-gate`.
4. Melkin (quinto integrante, provisional) y la foto de cierre BR3f.
