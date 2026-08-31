# Content Marketing — copy de operación y revisión creativa

Pedido del operador: mejorar la redacción completa de `#content-hub-proof` y
`#creative-review-proof` con copywriting. Página `242603`, misma URL. **Publicado** mediante
controles nativos Elementor; sin cambios de diseño, código del plugin, assets ni interacciones.

## Decisiones editoriales

- Content Hub: «Cada pieza, con su estado y su próximo paso.» Beneficios explicados mediante estado,
  responsable, fecha, fuentes y comentarios vinculados a una versión.
- Revisión creativa: «Comentarios claros. Cambios que puedes comprobar.» Se sustituyó la oposición
  entre feedback/opinión por instrucciones concretas y cambios verificables entre cortes.
- Revisión de todos los textos y estados: 49 campos del hub y 34 de revisión actualizados. Se conservan
  nombres claros de vistas, formatos, estados, fechas y numeración cuando no requieren reescritura.
- Ejemplos identificados como ficticios. Notion se presenta como herramienta de trabajo, sin vender
  licencias ni sugerir una alianza. Frame.io conserva su papel de herramienta de revisión; gestión
  de redes sociales permanece como servicio separado.
- El reel pendiente del hub pasa a primer corte, con fecha de comentarios anterior a la aprobación
  del tercero. Sus comentarios y los de las tres versiones explican ubicación y acción requerida.
- Skills aplicadas: `copywriting`, `greenhouse-ux-content-accessibility`, carril WordPress,
  GVC/Playwright y gobernador documental. Sin delegación adicional.

## Publicación y guardas

Antes/después exhaustivo: `scripts/public-website/content-marketing-hub-review-copy.json`.
Writer existente: `scripts/public-website/update-content-marketing-copy.php`, ampliado únicamente
para admitir `hub` y `review` además del par editorial anterior. Dry-run: 83 campos válidos.

- Hash anterior: `cabf8dbfecef8f45fc9d5d9d17545b2d77fb13bc7780d6e8ff7ad286957d0e2f`.
- Hash posterior: `0396480870fe897452704a696be50ae2c64e3eea68232fb56c397bca85439d29`.
- Snapshot durable: `_gh_content_marketing_copy_20260831_160457`.
- Readback: árbol completo esperado, otras once secciones, SEO, thumbnail, menú y shell conservados;
  hashes de cinco páginas de referencia intactos. Cachés Elementor/Kinsta purgadas.

No se reescriben `sourceValue`, defaults del export, estilos ni scripts. Los settings de esta
instancia conservan la autoridad editorial. El patch anterior de problem/system sigue intacto.
No se hizo commit ni push. Para recuperar, validar el estado actual, tomar snapshot nuevo y revertir
sólo los 83 campos `before` con `Document::save()`, protegiendo metadata y thumbnail; luego purgar
cachés y repetir QA. No repetir este writer con un hash sustituido sin analizar deriva.

## Verificación

Evidencia en `.captures/content-marketing/hub-review-copy/`: configuración pública de los 83 textos,
las tres vistas y cinco fichas del hub, teclado entre vistas, tres cortes y sus seis comentarios,
marcadores y tiempos del video, capturas en 1440/878/390. Verificación por Playwright público porque
el runtime dueño es WordPress, sin ruta local de Greenhouse. Evidencia general mantenida:
`verify-content-marketing-landing.cjs` y `verify-content-marketing-seo.cjs`, con resultados en
`.captures/content-marketing/{browser,seo}.json`.

Resultado: PASS de los 83 textos y de las 18 combinaciones viewport/vista-versión, sin errores JS
y con ancho de documento igual al viewport en 1440/878/390. Un primer chequeo inmediatamente
después de una captura completa obtuvo geometría transitoria; se repitió tras estabilizar la
página, además de comprobar el estado inicial y el tercer corte en una sesión independiente.
Los verificadores generales de interacciones y SEO también finalizaron correctamente.

No se envían leads, no se prueba conversión GA4 y no se certifican WCAG, CWV ni indexación Google.
Los pendientes de contraste, resize del pin y editor visual completo del corte original permanecen
fuera del alcance de esta revisión editorial.

## Ajuste de concisión tras QA en tablet

Cinco campos se abreviaron después de revisar las capturas: notas de fuentes/comentarios/bloqueos,
descripción de formatos del banner y leyenda de duración del video. Dos recuperan el texto corto
original; permanecen 81 diferencias netas respecto al baseline, sobre 83 controles revisados.
Patch incremental: `scripts/public-website/content-marketing-hub-review-copy-refinement.json`.
Snapshot `_gh_content_marketing_copy_20260831_160749`; hash final
`4fcdb402a2e509a6fa6a103e02ae136309a7b42a83f2817426e28729a81764fd`.
Guardas, readback de árbol completo y protección SEO/shell pasan en ambos guardados. Para recuperar
toda la revisión, usar los valores iniciales del primer patch, no el baseline intermedio del segundo.
La comprobación focal y las capturas se repiten con los valores finales combinados de ambos patches.
La primera lectura automatizada tras el ajuste no coincidió con todos los textos finales; se
comprobó el HTML anónimo posterior (HTTP 200, caché HIT, todos los valores presentes) y se repitió
la revisión focal, sin volver a guardar el documento.
