# Google Cloud — publicación del anuncio de partnership

Fecha: 2026-10-25. Estado: **publicado y verificado**, tras la autorización explícita de Julio «Ok publica». Publicación a las 12:58:30 de Santiago (15:58:30 UTC).

## Resultado

- Entrada **252108**, manifest `efeonce-google-cloud-partner-announcement`.
- Título: «Efeonce es partner de Google Cloud: más posibilidades para conectar tu negocio con la nube y la inteligencia artificial».
- Autor humano **Julio Reyes**, usuario 1; voz institucional Efeonce.
- Categoría y primaria Yoast: **Novedades Efeonce**, 116. Formato **Novedad**, 219. Etiquetas existentes google y partnership.
- URL pública: `https://efeoncepro.com/novedades/efeonce-partner-google-cloud/`.
- Edición: `https://efeoncepro.com/wp-admin/post.php?post=252108&action=edit`.
- Portada/OG **252106**, JPEG 2400 × 1260, 297.404 bytes. Apertura **252107**, WebP 1600 × 900. Ambas sin texto incrustado; los cuatro archivos finales permanecen en el paquete local.
- Hero reservado y sin activar por instrucción explícita del operador. No se cambió la curaduría del blog.
- Sumario en Recuadro, TOC poblado, secciones de producto H3, Destacado, cuatro Pasos, cuatro FAQ desplegables con schema del plugin y CTA a Contacto. No contiene una tabla ni depende del trabajo global de tablas, que el operador pospuso.
- SEO title, description, canonical, OG title/description/image, focus phrase y subtipo NewsArticle configurados en Yoast. El noindex de la fase privada se retiró: salida pública `index, follow`.
- El cuerpo no menciona al distribuidor ni afirma nivel, certificaciones o competencias de Google no verificadas. Gemini se presenta por casos de uso y selección de producto; no como catálogo irrestricto.

## Evidencia

Carpeta local: `outputs/google-cloud-partner-blog-2026-10-25/`.

- `articulo-spec.json` y `articulo-validado.json`: ensamblado por Content Factory; validación `pass`, sin findings, 41 bloques del validador (incluye anidados).
- `post-readback.json`, `media-readback.json` y `verificacion.log`: recibos de creación, enriquecimiento y comprobación independiente.
- Snapshot no autoload anterior al enriquecimiento: `_gh_google_post_before_252108_20261025_114554`.
- La URL futura devolvió la página 404 en navegador anónimo, sin exponer el cuerpo del artículo.
- Revisión de composición local con HTML generado por la plantilla activa `single.php`, CSS público real y shell local acotado al artículo. Sin scripts de tracking ni formularios. No equivale a una sesión HTTP autenticada ni certifica header/footer.
- A 1440 y 390: H1 único, sin desbordamiento horizontal en la composición, imagen natural 1600 px y ocho destinos TOC válidos. La primera FAQ abre correctamente.
- Modo oscuro local a 390: sin overflow, texto blanco sobre la superficie oscura; no se ejecutó axe completo.
- Capturas: `qa/escritorio-apertura.jpg`, `qa/movil.jpg`. Fixtures: `qa/preview.html`, `qa/preview-dark.html`.

## Publicación y verificación pública

- Se verificaron nuevamente los 13 controles privados y el fingerprint antes de publicar. La autorización explícita del operador permitió continuar con el artículo ya presentado; la revisión HTTP privada histórica no se hizo. La página completa sí se verificó anónimamente después de publicar.
- Operación acotada `publicar-post.php`, con guardas de ID, manifest, autor, hash, categoría, formato e imágenes. Snapshot completo no autoload `_gh_google_publish_before_252108_20261025`; rollback preparado con `rollback-publicacion.json` y el mismo script. No se cambió el cuerpo aprobado.
- Purga Kinsta ejecutada. Readback independiente WP-CLI: 9 controles en verde (`publicado-readback.log`); hash original preservado, autor 1, categoría 116, formato Novedad, hero y pin ausentes.
- Página anónima HTTP 200 en dos lecturas. Canonical único, robots `index, follow`, NewsArticle, Person Julio Reyes, publisher y cuatro preguntas dentro de un FAQPage único. OG JPEG 2400 × 1260, ALT único en OG y X, `summary_large_image`.
- Imágenes y siete destinos únicos del artículo devuelven 200; ocho anclas TOC válidas. Primera FAQ abierta mediante clic real. CTA conserva destino Contacto.
- Página real a 1440 × 1000 y 390 × 844 sin overflow horizontal; apertura cargada y título/cuerpo legibles. Capturas y resultados bajo `.captures/google-cloud-publish-2026-10-25/`. Se usó Playwright focalizado para comprobar DOM, metadatos, enlaces e interacción en el WordPress público; no se utilizó autenticación Greenhouse ni se ejecutó axe completo.
- Artículo visible en categoría Novedades y búsqueda del sitio, con portada en la tarjeta. La consulta automatizada de búsqueda recibió 403; se verificó correctamente en navegador real.
- Presente en `post-sitemap.xml`, lastmod `2026-10-25T15:58:30+00:00`. Veinte controles públicos pasan en `verification-summary.json`. Publicación y rastreabilidad verificadas; indexación en Google no comprobada ni prometida.
- Sin pendientes para esta publicación. El banner principal sigue desactivado por decisión del operador.

No cambió la capacidad del sitio, el schema compartido, un plugin, infraestructura, navegación o una taxonomía. Es una operación editorial bajo el contrato existente de Content Factory; no requiere un ADR nuevo ni una task de implementación.
