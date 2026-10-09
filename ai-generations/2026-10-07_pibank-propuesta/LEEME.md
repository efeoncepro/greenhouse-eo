# Pibank · Propuesta técnica SEO/AEO 2027 — carpeta de producción

Producción de la propuesta técnica para Pibank (Banco Pichincha Perú). Vigente: **v12 del 2026-10-09**, 47 láminas
16:9, línea Engine: la v11 (evaluación 2026, registro `docs/audits/commercial/2026-10-08-pibank-propuesta-tecnica-v11.md`) más la lámina 20, «Muestra X-Ray», con un mockup dibujado del X-Ray publicado en Think y su enlace (QR y texto clicable en el PDF). La clave del enlace y el QR se leen del expediente del caso (`09-XRay-Pibank/SAMPLE_KEY.txt`, `qr-muestra.svg`), fuera de git. La v10 (44) y la v11 (46) se conservan. Aprobada por el CEO para presentar y como **estilo alternativo canónico** para propuestas técnicas SEO/AEO
(los brochures siguen con las recetas de La órbita).

- Canvas Design (privado): https://claude.ai/artifact/XpdEeKjFLWrCikqBEvnSfw, página «tecnica».
- PDF vigente: `out/Pibank-Propuesta-tecnica-SEO-AEO-2027-v12.pdf` (copia en OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/`, junto a la v10 y la v11). `render-pdf.mjs` copia los enlaces externos de cada lámina como zonas clicables.
- Método y reglas: `.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md`.
- Intents del compositor: `docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/`.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `build-tecnica.py` | Generador de las láminas `Tec-NN.dc.html` y del índice del canvas. Versiones anteriores: `build-tecnica-v3/v4/v4-papel/v6/v7/v10.py`. |
| `axis-assets.mjs` → `axis-assets.json` | Navegación de capítulo, medida e íconos Trazo desde AXIS. |
| `paint-selection.mjs` | Pinta la selección colaborativa canónica sobre el elemento marcado con `data-gl-sel`. |
| `borrar-seleccion.mjs`, `quitar-seleccion-portada.mjs` | Quitan la selección que algunas recetas pintan siempre (portada, equipo, clientes). |
| `logo-en-centro.mjs` | Reemplaza la palabra «Pibank» por el logo en una lámina compuesta. |
| `teal2engine.cjs` | Lleva el turquesa de una imagen al acento Engine (láminas importadas, E-E-A-T, reporte). Revisar fotos al 100 %. |
| `render-pdf.mjs` | Renderiza las láminas con las imágenes locales y arma el PDF 16:9. |
| `fichas/`, `prompts/` | Foto de cierre BR3e/BR3f (portal Engine). |
| `equipo/por-asignar.png` | Ficha neutra para un rol por asignar en `content-team` (exige cinco fichas). Fuera de git. |
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

1. Si aplica `pnpm tender:canonical-gate`.
2. Foto de cierre BR3f por aprobar.
3. Si la lámina de medición de negocio suma la definición de «inicio de solicitud».

Resuelto el 08-10: casos internacionales validados por Julio; equipo con nombres confirmados y diseño visual por
asignar; Insights y modo presentación operando.
