# Content Marketing — revisión editorial de dos secciones

Solicitud: comentarios del operador sobre «El punto de partida» y la totalidad de «El sistema de
contenidos». Estado: **publicado**, página `242603`, misma URL. Skills: `copywriting` y
`greenhouse-ux-content-accessibility`; verificación pública con Playwright en modo WordPress.

## Alcance

118 controles nativos: 13 en `greenhouse_content_problem` y 105 en `greenhouse_content_system`.
Se revisaron todos los textos de ambas secciones, incluidas las siete etapas, navegación, resultados,
responsables, riesgos, notas del ejemplo y alternativas de imágenes. Numeración, nombres de formatos
y etiquetas claras se conservaron. La campaña ficticia de Aro 7 mantiene un objetivo de preventa;
se eliminó la mezcla con captación B2B. El aviso explicita que también los resultados son ficticios.

Titulares publicados: «Cada contenido exige volver a empezar.» y
«De una idea a una campaña. Con cada paso conectado.»

El antes/después exhaustivo vive en
`scripts/public-website/content-marketing-editorial-copy.json`. No se alteraron el export aprobado,
los defaults del plugin, `sourceValue`, keys, templates, CSS, JS, assets ni las otras once secciones.
Los settings de la instancia Elementor conservan la autoridad editorial. No hubo despliegue de plugin,
commit ni push en este pase.

## Publicación y recuperación

- Camino: `Document::save(elements, settings)`, después de preflight SSH y dry-run de 118 controles.
- Writer: `scripts/public-website/update-content-marketing-copy.php`; sin segundo archivo `APPLY`
  sólo valida. Guarda identidad, propiedad, hash, controles y valores anteriores; snapshot antes de escribir.
- Hash anterior: `dd6275695aa878020d6471c91ab121ed36b175b16c417ccd3732797d8c86f020`.
- Hash posterior: `cabf8dbfecef8f45fc9d5d9d17545b2d77fb13bc7780d6e8ff7ad286957d0e2f`.
- Snapshot durable: `_gh_content_marketing_copy_20260831_155803`.

El guard inicial detectó una actualización automática de `_yoast_indexnow_last_ping` después del
save. Se leyó el estado sin repetir la escritura: las 118 ediciones estaban guardadas y Elementor
había retirado `_thumbnail_id`. Se restauró sólo ese valor desde el snapshot, se comprobaron los
metadatos editoriales y se completó la purga de cachés Elementor/Kinsta. El timestamp operativo de
IndexNow no se revirtió ni se interpreta como prueba de indexación. El writer ahora protege
`_yoast_wpseo_*`, separado de ese timestamp operativo.

El readback comprobó el árbol completo esperado, los once módulos ajenos intactos, metadata SEO,
imagen destacada, opciones del shell, menú completo y hashes de cinco páginas protegidas.
No repetir este patch ni el cutover inicial: sus guardas representan estados anteriores.
Para revertir, leer el estado actual, comprobar que no hay ediciones posteriores y restaurar sólo los
118 campos `before` mediante `Document::save()` con snapshot nuevo. Verificar metadata y thumbnail,
purgar y repetir QA. Nunca restaurar el sitio entero ni escribir `_elementor_data` directamente.

## Evidencia y límites

- `.captures/content-marketing/editorial/report.json`: 118 valores públicos, siete estados por click,
  viewports 1440/878/390, ancho del documento igual al viewport y cero errores JS.
- Capturas `editorial/problem-*.png`, `step-*.png` y `mobile-step-*.png`; textos completos en
  `editorial/system-{878,390}.txt`. La primera captura de problem se repitió tras completar el reveal.
- Verificadores existentes `verify-content-marketing-{landing,seo}.cjs`: responsive 1440/1280/890/390,
  interacciones, validación local del formulario sin envío, reduced motion y sin JS; SEO público,
  grafo Yoast, enlaces y sitemap. Resultados en `.captures/content-marketing/{browser,seo}.json`.
- QA general es advisory; no se ejecutan migraciones ni gates de dominios ajenos por cambios WIP.

Este pase no certifica contraste, CWV, indexación Google, conversión aceptada/GA4 ni save/reload del
editor visual. El defecto de pin tras resize bajo 740 px y los pendientes de la publicación anterior
siguen separados. No se cambiaron diseño ni comportamiento para resolverlos durante una revisión de copy.
