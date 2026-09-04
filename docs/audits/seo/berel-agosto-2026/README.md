# Informe de Berel — agosto 2026

Informe PDF A4 completo, con HTML como matriz editable de composición. Incluye auditoría, continuidad histórica, AEO Grader y desempeño del equipo. No se ha enviado al cliente ni publicado en un sitio público.

## Archivos

- `BEREL_INFORME_AGOSTO_2026_A4.pdf`: entregable para el cliente, 55 páginas A4.
- `DIRECCION_Y_QA_A4.md`: dirección visual, alternativas y revisión UI/UX.
- `qa-pdf.json`: verificación estructural del PDF.

- `REPORTE_BEREL_AGOSTO_2026.html`: documento autónomo; incorpora fuentes y logos.
- `reporte-cliente.md`: redacción completa para una audiencia con conocimientos básicos de SEO/AEO.
- `report.css` y `build-report.cjs`: presentación y generación.
- `evidencia-performance.json`: método, alcance y registro de los entregables gráficos contabilizados.
- Auditoría canónica: `../BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md`.
- [Auditoría en Notion](https://app.notion.com/3d139c2fefe781ba8928eef8dadfb219).

## Identidad visual

Se reemplazó la primera propuesta verde por los azules Efeonce `blue/800`, `blue/900` y `blue/500`, con neutros del snapshot `src/lib/artifact-composer/brand-packs/axis/axis-ppt-snapshot.json`. Poppins 600 para títulos y Geist 400–700 para lectura y cifras, desde el manifiesto de fuentes del mismo paquete, con derechos de incrustación OFL-1.1 declarados. No se presenta esta tipografía como la tipografía propia de Berel: es la identidad de Efeonce como emisor del informe.

El acento rojo editorial de Berel `#B3153A` procede de su [paleta aprobada en Notion](https://app.notion.com/3c639c2fefe7807fbc9df1e6d9855fe5). Logos oficiales: recurso local Efeonce `public/branding/pdf/efeonce-wordmark-white.png` y `https://berel.com/logo-berel.jpg`. Los logos conservan sus colores originales.

Dirección: portada azul con degradado, lectura sobre blanco, jerarquía Poppins/Geist, cifras destacadas y tablas con cabeceras repetidas. La navegación lateral se oculta al imprimir. Se descartó la dirección editorial verde y serif por no corresponder a la marca.

## Regeneración y verificación

Desde la raíz del repositorio:

```sh
node docs/audits/seo/berel-agosto-2026/build-report.cjs
```

Verificación del 4 de septiembre de 2026: las 55 páginas se inspeccionaron visualmente en tres tramos, con revisión independiente. Se corrigieron las etiquetas de prioridad y se uniformaron encabezados y pies. PDF A4 vertical, fuentes incorporadas, índice paginado con enlaces y marcadores; 23 tablas y cinco conjuntos de fichas conservan las 648 celdas y campos del HTML. T01–T33 completos. Sin páginas vacías ni cortes detectados.

Para generar el PDF, ejecutar `node render-pdf.cjs` desde esta carpeta después del build. El acabado y la verificación usan Python con PyMuPDF: `python finish-pdf.py` y `python validate-pdf.py`. Si cambia la paginación, `finish-pdf.py` actualiza `page-map.json` y solicita regenerar HTML/PDF antes del acabado. El documento se distribuye digitalmente en RGB; no se presenta como PDF/X de imprenta.

Desempeño guardado en la auditoría existente de Notion y comprobado mediante lectura completa posterior. Cifras acumuladas al 4 de septiembre: 58 contenidos desarrollados y 154 entregables gráficos cerrados, no archivos individuales. Agosto: On-time de cierre 55/74 (74,3%); 63/63 envíos documentados a revisión a tiempo, con 11 fechas de envío ausentes. No se calculó RpA.

## Revisión final de marca y Product Design

El pie de todas las páginas, incluida la portada, incorpora la URL bubble oficial enlazada, dirección y ambos teléfonos desde `back-cover-full.slots.json`. El logo blanco de portada y el positivo azul interior son assets oficiales. Los SVG de bubble y logo se rasterizaron sin cambiar colores a resoluciones superiores a 300 ppp porque el conversor SVG de PDF no interpretaba sus clases CSS; la fuente SVG permanece canónica. Iconos Tabler MIT desde el paquete existente `@iconify/json` en `assets/report-icons.json`.

Se añadieron dos barras de On-time/cobertura y un gráfico de cuatro controles sobre el censo de 115 artículos. Los grupos del censo se superponen y se indica expresamente. Se mejoraron títulos del plan, lectura ejecutiva y limitación del Grader. Revisión independiente documentada en `PRODUCT_DESIGN_AUDIT.md`. El acabado PDF sanea el estado gráfico de las páginas antes de colocar marca y enlaces para evitar recortes heredados del exportador.


## Report Studio · revisión del 4 de septiembre

Skill nueva en `.claude/skills/report-studio` y `.codex/skills/report-studio`, con investigación primaria, módulos, plantillas, pruebas y overlay institucional. El informe ahora explicita cobertura 63/74 (85,1%), período/escala de comparaciones y límite causal del esquema de resultados. El colofón incluye contacto textual y enlaces dentro de la fuente semántica.

El renderer espera fuentes e imágenes después de aplicar estilos de impresión. Genera `BEREL_INFORME_AGOSTO_2026_A4.raw.pdf` como intermedio local ignorado; el acabado parte siempre de ese archivo y completa metadata/idioma. Dos acabados consecutivos producen las mismas imágenes en las 55 páginas y los mismos conteos de enlaces: no duplican pies.

`pdf-check-manifest.json` configura el preflight reutilizable; `qa-preflight.json` registra resultado y hash. Ejecución desde la raíz: `python .codex/skills/report-studio/scripts/check_pdf.py docs/audits/seo/berel-agosto-2026/BEREL_INFORME_AGOSTO_2026_A4.pdf --manifest docs/audits/seo/berel-agosto-2026/pdf-check-manifest.json --output docs/audits/seo/berel-agosto-2026/qa-preflight.json` (requiere PyMuPDF).

La conservación de 648 campos ahora consume las ocurrencias en orden, evitando que una aparición cubra dos celdas repetidas. Se revisaron las páginas modificadas 3, 4, 6 y 55 y se mantuvo el mapa de 55 páginas ya inspeccionadas. Tags y texto seleccionable presentes; orden asistivo y etiquetado de anotaciones del acabado no validados integralmente. No se afirma conformidad PDF/UA.
