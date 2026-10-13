# UTEM · Propuesta técnica SEO/GEO/AEO — carpeta de producción

**Estado vigente 08/10/2026:** oferta presentada por Julio en Mercado Público. Neto CLP 4.800.000 + IVA 912.000 = total 5.712.000, por tres meses. HubSpot: `presentationscheduled` / Presentación de soluciones, `amount=4800000`, CLP; dos readbacks verificados. Siguiente paso: evaluación/resultado, sin adjudicación confirmada. Registro: `docs/commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md`. No regenerar ni sustituir los archivos del paquete presentado. Los comandos siguientes documentan su producción histórica.

Deck v1 del 2026-10-08, 21 láminas 16:9, línea Engine, molde «propuesta técnica para leer sin presentador» (Pibank).
Fuente narrativa: `docs/commercial/tenders/utem-seo-aeo-2026/oferta-tecnica.md` v1.0. Si cambia el Markdown, se
cambia `build-tecnica.py` y se regenera; nunca al revés.

- Canvas Design (privado): https://claude.ai/artifact/28wHXcgyA3ANNqaaeJcrfb
- Portada y cierre: `pnpm brand:compose -- --intent ai-generations/2026-10-08_utem-propuesta/utem-composer-document.json --artifact-id utem-tecnica-composer --out ai-generations/2026-10-08_utem-propuesta/composer`
  (recetas `cover-proposal` y `close-proposal`; logo en `logos-cliente/`, ver FUENTES.md). Después `node quitar-seleccion-portada.mjs composer/01-p01-deck-cover-proposal.png composer/portada-sin-seleccion.png`.
- Láminas HTML: `python3 build-tecnica.py <carpeta project del canvas>`.
- QA: `node check-overlaps.mjs <project>` (choques entre bloques) y `node render-shots.mjs <project> <out> <archivos>`.
- PDF: `render-pdf.mjs` (copiado de Pibank; filtra `Tec-NN`, así que agrega `Main.dc.html` antes de usarlo).

Sin precio, costos, margen ni nombres del equipo (salvo el responsable declarado en las bases). Sin casos de clientes.

## v2 (08/10, 35 láminas)

- Revisión pública: `serp/` (DataForSEO `serp-compare`, 15 búsquedas, Google Chile; resumen en `utem-serp-resumen.json`).
- Compositor: portada/cierre (`utem-composer-document.json`), equipo (`utem-equipo-document.json` + `logo-centro-equipo.mjs`),
  casos (`utem-casos-document.json`), secciones y clientes (`utem-secciones-clientes-document.json`), «A la vista»
  (`utem-vista-document.json`, artículo de ejemplo en `plates/`). Láminas claras Growth → `recolor-engine.mjs`.
- Importadas del deck SEO/AEO aprobado: `importadas/` (Todo junto, Cada mes).
- PDF: `node render-pdf-utem.mjs <project del canvas> out/<nombre>.pdf` (mapa de imágenes en `blobs.json`).
