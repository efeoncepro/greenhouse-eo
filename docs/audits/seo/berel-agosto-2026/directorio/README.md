> **Estado vigente:** portada seleccionada explícitamente por el usuario: opción 1 de Product Design, arquitectura azul con plano rojo. Véase [COVER_DIRECTION.md](COVER_DIRECTION.md). Las secciones de iteraciones siguientes son historia y no sustituyen esta selección.
> **Metodología completa:** [procedimiento reutilizable](../../../../operations/EFEONCE_EXECUTIVE_REPORT_DECK_METHOD_V1.md).

# Berel · Resumen para el directorio · Agosto 2026

Entregable: `BEREL_DIRECTORIO_AGOSTO_2026_A4_HORIZONTAL.pdf`. Quince láminas A4 horizontal (297 × 210 mm), incluidas portada y contraportada. Preparado para que el equipo de Berel presente resultados, desempeño y prioridades al directorio. No se ha enviado ni publicado externamente.

## Alcance y fuentes

Síntesis del [informe completo](../BEREL_INFORME_AGOSTO_2026_A4.pdf), con referencias por lámina. Conserva períodos, cohortes y límites: resultados de agosto frente a julio; revisión y acumulado al 4 de septiembre; AEO Grader del 3 de septiembre en calibración comercial. On-time distingue cierre, primer envío y cobertura; no incorpora RpA ni atribuye ventas.

## Dirección visual y composición

Se aplicaron Report Studio y Deck Studio. La dirección usa tipografía Poppins/Geist, azules institucionales Efeonce, acento rojo editorial Berel, logos oficiales y pie con únicamente la URL bubble oficial en todas las páginas. Los gráficos de barras se calculan desde los valores del plan con origen cero; los grupos del censo de artículos se superponen y no se suman.

Se priorizó la visualización de evidencia sobre fotografía decorativa: cifras, comparaciones, diagramas de etapas y responsables. La alternativa de reducir el informe vertical habría conservado demasiada densidad para exposición oral.

El catálogo existente deck-axis es 16:9. Para A4 se creó un catálogo local de siete plantillas mediante el contrato de catálogos de Artifact Composer, conforme a `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`. La composición usa la API pública `composeArtifact`; no modifica el motor ni registra una capacidad nueva en producción. Cada lámina declara plantilla y slots en `deck-plan.json`. `composition-manifest.json` conserva resolución y hashes de recursos.

## Regeneración

Desde la raíz del repositorio, con Node/tsx y Python con PyMuPDF disponibles:

```sh
pnpm exec tsx docs/audits/seo/berel-agosto-2026/directorio/compose.ts
python docs/audits/seo/berel-agosto-2026/directorio/finish-and-check.py
```

Después de regenerar, actualizar `composition-manifest.json` desde el manifiesto de `render/`. Los intermedios y capturas quedan locales e ignorados. El PDF final y las fuentes editables permanecen en esta carpeta.

## Verificación · 4 de septiembre de 2026

Revisión visual de las 15 páginas: agente principal 1–5; revisores independientes 6–10 y 11–15. Se simplificó el lenguaje de la lámina 10 tras la revisión. Se corrigieron separaciones de fuente/pie y se validó la geometría después de cargar las fuentes.

`qa.json` registra por página dimensiones exactas, presencia del texto de todos los slots, imágenes de marca, ausencia de datos de contacto y enlace de la URL bubble; también verifica fuentes incorporadas y hash del PDF final. El documento incorpora metadatos, idioma, marcadores y texto seleccionable. No se afirma conformidad PDF/UA ni PDF/X.

### Revisión UI/UX de marcas · iteración editorial

La banda superior blanca y el cambio de orden de marcas fueron rechazados por el usuario. No se consideran una dirección aprobada. Se invocaron Greenhouse AI Design Studio, UX Content Accessibility, Enterprise Review y el módulo editorial de Report Studio; revisión independiente centrada en composición, no únicamente en overflow.

Dirección elegida: portadas blancas, títulos azules y acento rojo; Efeonce a la izquierda y Berel a la derecha con tamaño óptico distinto para sus proporciones. La alternativa de mantener fondo oscuro exige una variante de Berel que contraste o una superficie lateral; se descartó improvisar otra caja o banda. El logo de Berel proviene del SVG oficial en `src/lib/artifact-composer/catalogs/deck-axis/assets/clients/berel.svg`; conserva sus trazos, inclinación y colores. No se recolorea ni se endereza.

Se reutilizan las siete plantillas locales de Artifact Composer. La revisión es de composición editorial PDF A4, por lo que los contratos de interacción, responsive móvil y estado de una aplicación no aplican. Portada, página interior y contraportada inspeccionadas después de la exportación; las 15 páginas vuelven a pasar controles estructurales. La revisión técnica no constituye aprobación estética del cliente.

### Pie de deck

Por instrucción del operador, se eliminaron dirección, teléfonos, folio y línea divisoria de las 15 láminas. El pie conserva únicamente la URL bubble oficial enlazada. Las referencias de evidencia permanecen junto al contenido. La distinción entre informe escrito y deck quedó en el estándar institucional y en las skills Deck Studio y Report Studio de Claude/Codex.

### Contraportada oficial del Artifact Composer

Por instrucción del operador, la lámina 15 utiliza `BackCoverFull` del catálogo de licitaciones, adaptada a lienzo A4 horizontal como `BackCoverFullA4`. Conserva el degradado, textura, logo negativo, URL bubble, redes y contacto de la plantilla oficial. El badge opcional de partner se omite. La contraportada institucional es una composición de cierre; no se añade su bloque de contacto al pie de las otras 14 láminas. Procedencia y hash en `back-cover-provenance.json`. Se inspeccionó la página exportada y se verificaron las 15 páginas, fuentes, texto, contacto según tipo de lámina y URL enlazada.

### Portada mensual

Se sustituyó el eslogan por «Informe mensual», con agosto de 2026 como período visible. La portada usa un campo azul para título y emisor, y una columna blanca para la marca Berel, el mes/año y la URL bubble. Conserva contraste y proporciones de los activos oficiales. Se inspeccionó el PDF exportado; 15 páginas y preflight completos.

### Rediseño editorial completo en HTML/CSS

Entregables vigentes: PDF A4 horizontal de 15 láminas y `BEREL_DIRECTORIO_AGOSTO_2026.html`, autónomo con 15 documentos embebidos. No se utiliza PPTX. `compose.ts` resuelve los slots, aplica el layout y conserva cada documento con CSS incrustado; el HTML agrupa esas mismas láminas y el PDF procede de la composición verificada.

La portada anterior de dos paneles fue rechazada. La versión vigente utiliza `cover-premium.css`: portada editorial tipográfica, número de edición 08, título Informe mensual y fecha explícita. Los interiores usan `interior-premium.css`: cifras sin cajas repetidas, matriz de responsables, iconos Tabler de la fuente existente y jerarquía de fuentes/conclusiones. `charts-premium.css` contiene comparaciones con origen cero, valores directamente etiquetados y retícula de diagnóstico. Producción mensual incluye una barra de composición 8 + 54 + 10 + 2 = 74; puntualidad incluye 74 unidades visuales con 55 cierres a tiempo. Los datos proceden de los slots del plan; no se añadió una medición.

QA: revisión visual de las 15 páginas repartida entre agente principal y dos revisores. El revisor detectó artefactos de guías CSS en la exportación PDF de las páginas 5 y 11; se eliminaron las guías de degradado, se regeneró y se inspeccionaron ambas páginas. Se sustituyeron dos iconos ambiguos. Verificación del HTML autónomo en Chromium: 15 iframes, sin recursos fallidos ni desbordamiento horizontal, fuentes e imágenes completas. El preflight del PDF final conserva dimensiones, todos los textos del plan, fuentes incorporadas y política de contacto por tipo de lámina. No se afirma conformidad PDF/UA ni aprobación visual del cliente.

### Segunda revisión de dirección de arte e iconografía

La versión vigente incorpora nuevas composiciones para recorridos comerciales, IA, producción acumulada, On-time, continuidad, medición y acuerdos de seguimiento. Añade logos identificadores de plataformas, iconos Tabler y dos imágenes de piezas realmente publicadas del programa Berel. El detalle de las decisiones y la revisión de las 15 láminas está en [REVISION_UI_UX.md](REVISION_UI_UX.md). Las mejoras no sustituyen la validación del cliente.
