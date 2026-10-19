# Pibank · Anexo «Cómo busca y decide el ahorrista peruano» · 19-10-2026

**Enviado** a Jesús Vargas Serpa el 19-10-2026 a las 17:49 (Chile), adjunto a la respuesta de precisiones. Su objetivo es
mostrar con evidencia que entendemos el mercado peruano sin inventar una referencia local. Se hizo sólo con la
investigación ya capturada (06-10 y 08-10), sin gasto nuevo de proveedor.

- **Entregado:** [v5/Pibank-Anexo-ahorrista-peruano-2026-10-19.pdf](v5/Pibank-Anexo-ahorrista-peruano-2026-10-19.pdf),
  3 páginas A4, con copia idéntica en OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/`. HTML, capturas de
  QA y [manifiesto](v5/manifest.json) con hashes de fuentes, assets y salidas.
- **Renderer:** [render.mjs](render.mjs). Lee `../reconstruccion-2027/demanda-audiencia-2026-10-08/panel.csv` (33
  familias, 66.030 búsquedas al mes) y `../research/pichincha-ai-mode-results.json` (3 consultas de ahorro, 21 fuentes
  únicas). Falla si los totales no cuadran o si aparece una fuente sin clasificar. Para una versión nueva:
  `node docs/commercial/prospects/banco-pichincha-peru-seo-2026/anexo-ahorrista-peruano/render.mjs v6`. Rechaza una
  carpeta de salida ocupada; nunca se regenera la `v5` enviada.
- **Marca:** línea Engine (SEO/AEO), tokens y assets de AXIS, Bricolage y Poppins embebidas. La portada lleva una órbita
  que mide el 76% de las fuentes de AI Mode que no son bancos; las interiores no llevan órbita. `measureSvg` viene del
  build de AXIS main (0.17.0) porque el `axis-graphic-line` 0.11.0 que fija Greenhouse no pinta el camino recorrido
  (pendiente de TASK-2014). Queda declarado en `manifest.measureRenderer`.
- **Logo de Pibank:** del sitio oficial, el archivo `pibank-logo-inverso.svg` es el de **letras navy para fondo claro**
  y `pibank-logo.svg` es el blanco. Los nombres parecen al revés.

## Cifras y de dónde salen

| Cifra | Fuente |
|---|---|
| 76% de las fuentes citadas no son bancos (16 de 21); 4 de Banco Pichincha y 0 de Pibank | Google AI Mode vía DataForSEO, Perú, 28-09-2026 |
| 66.030 búsquedas al mes; 64% nombra un producto rival (42.180) | DataForSEO Labs, Google Perú en español, base de sept. 2026 |
| 0 de 3 búsquedas genéricas con pibank.pe entre los 20 primeros; marca en posición 5 (FAQ) | SERP móvil, 06-10-2026 (`research/PIBANK-DEMAND-2026-10-06.md` §4) |
| Tasas: Pibank 5% TREA; Súper Tasa 0,5% en el tramo de S/ 10.000; Power hasta 4,6%; Efectibank 4,5% | Sitios oficiales, 06-10-2026 (§5) |
| A/B: 10,4% de los hogares del Perú y 21% de los de Lima | APEIM 2025 |
