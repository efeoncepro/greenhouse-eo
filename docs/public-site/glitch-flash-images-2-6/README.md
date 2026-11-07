# Glitch Flash — Images 2.6

Estado real, 2026-11-05: **PUBLICADO y verificado anónimamente**, con pruebas propias y portada.

- Post **252401**, autor **1 · Julio Reyes**, categoría/primaria **183 · Glitch**, `index, follow`.
- [Artículo público](https://efeoncepro.com/glitch/glitch-flash-images-2-6/) · [Editor](https://efeoncepro.com/wp-admin/post.php?post=252401&action=edit).
- Preview multimedia local: `ai-generations/2026-11-05_glitch-flash-images-2-6/revision.html`; servidor de revisión `http://127.0.0.1:8793/revision.html`.
- Manifest estable: `greenhouse-cf-glitch-flash-images-2-6`; slug `glitch-flash-images-2-6`.
- Aproximadamente **3.700 palabras, 12 secciones, cinco Glitch Drops, tres tablas y un Destacado**.
- **11 imágenes nativas en el cuerpo + portada**. Cuatro imágenes son salidas propias crudas de GPT Image 2.6 Sunburst; **dos videos oficiales incrustados y reproducibles** mediante bloques nativos Vimeo. La comparación mantiene 16:9 y el montaje 4:1; ajuste responsive aplicado en Ohio, sin cambiar los bloques guardados.

## Entregables y fuentes

- [Texto completo](./articulo.md), [spec Gutenberg](./article-spec.json), [plan de medios](./media-plan.json), [investigación](./research.md).
- [Pruebas propias y límites](./own-tests.md).
- Fichas, prompts completos, referencias ordenadas y SHA-256, requests, receipts, logs, PNG crudos y revisión cine en `ai-generations/2026-11-05_glitch-flash-images-2-6/pruebas-propias/`.
- [Constructor local](./build-review.mjs), [ejecutor CLI acotado](./run-own-image.py) y [medición de diferencias](./measure-own.mjs). El ejecutor exige `--run` e impide sobrescribir un receipt o salida; no ejecutarlo para reconstruir una preview.
- Portada por `pnpm glitch:compose`, manifest Flash sin número, recursos propios. Carpeta `glitch-banners-cover/`; origen GF26-A con extensión de lienzo superior sólo para la portada, para que FLASH no cruce el rostro. La imagen cruda de prueba permanece intacta. Los renders previos en `glitch-banners/` son candidatos descartados por cruce de cabecera/rostro y recorte.

## Verificación

- Doctor fotográfico y preflight de identidad/catálogo: PASS. Dos fichas derivadas de NX7d/LG1, compiladas por `foto:prompt`; revisor cine previo al gasto: APROBABLE tras resolver primer plano duplicado (casebook, falla 25).
- Cuatro requests reales de `gpt-image-2.6-sunburst`: dos originales high/high y dos ediciones high/low a **2048×1152**, modelo leído de CLI, tokens y duración guardados. Nada de retoque ni recomposición protectora en los PNG usados como prueba.
- Gates y revisión posterior: se documentan aciertos y desvíos; **no** se dieron de alta recetas, identidades ni assets canónicos. [Detalle](./own-tests.md).
- Spec final: **Content Factory PASS sin findings**, 97 bloques en el validador tras sustituir los botones por embeds, imágenes con IDs reales, TOC y Drops nativos. El conteo de parser WP se registra por nombre de bloque, no se equipara al total del validador.
- Preflight WordPress: SSH comprobado; búsquedas todos los estados por manifest/slug/título/canonical sin duplicado; autor y categoría verificados.
- Importador idempotente: 12 attachments **252389–252400**, autor 1 y procedencia. Todos los cuatro PNG propios conservaron su hash al importar; el SVG oficial pasó por el saneador normal de WordPress y sus bytes cambiaron. Esto no se presenta como salida propia cruda.
- Creación gobernada privada, luego snapshot antes de categoría, portada, Yoast y parent de attachments. Snapshot: `_gh_glitch26_private_252401_20261105_113226`.
- Medios servidos por HTTP: **12/12 con 200** usando User-Agent normal y Referer del sitio; los cuatro PNG propios conservan su hash también en la descarga HTTP. El User-Agent predeterminado de urllib recibió 403, resuelto sin cambios del sitio.
- Readbacks en `wp-post.json`, `wp-independent-readback.json` y `wp-media-http-readback.json`, dentro de la carpeta del artefacto. Revisar esos archivos antes de cualquier modificación posterior.
- Preview local a 1440/390: un H1, cinco Drops, 12 imágenes cargadas, TOC válido, ancho del documento igual al viewport. Capturas `output/playwright/glitch-images26-review/own-tests-*.png`. Esto es QA de la preview, **no** prueba del render de Ohio del privado.
- Los videos proceden del anuncio oficial; reproducción del montaje comprobada por el agente de medios. Comparación de velocidad rotulada **8×**. Ratio real del montaje 4:1 según Vimeo oEmbed, corregido en inventario.

- Cierre documental acotado: `node scripts/check-documentation-closure.mjs --json -- docs/public-site/glitch-flash-images-2-6`, sin warnings (una nota informativa). No hay cambios en contratos compartidos que requieran un ADR nuevo.

## Publicación y QA final

Autorización explícita del operador: **«Ok publica»**, 2026-11-05. Se publicó el mismo post y fingerprint revisados; no se cambió el cuerpo ni se creó un duplicado. Fecha real de publicación UTC: **2026-11-05 12:20:03** (09:20:03 America/Santiago). Snapshot de publicación: `_gh_glitch26_publish_252401_20261105_122003`. `publish.php` y `publish-and-verify.py` registran la publicación original y su rollback a privado con el hash original. Tras la corrección de videos, usar el snapshot de republicación y sus hashes actuales; no reutilizar las guardas anteriores.

- Estado publicado y autor 1 leídos de vuelta por REST anónimo; entrada presente en el archivo `/glitch/`.
- HTTP 200 y segunda lectura anónima consistente tras purgar caché WordPress/Kinsta.
- Canonical exacto, `index, follow`, OG artículo y portada 252389, tarjeta social grande; schema Article/BlogPosting, Person Julio Reyes, WebPage y BreadcrumbList.
- URL presente en `post-sitemap.xml` con `lastmod` de la publicación; esto no afirma indexación de Google ni se solicitó una nueva indexación.
- Navegador real de la página publicada a **1440/390**: un H1 visible, 11 imágenes cargadas, cinco Drops visibles, 12 destinos de índice válidos, sin desborde horizontal y sin page errors. El aviso de cookies se cerró con «Solo esenciales» para la evidencia visual limpia.
- Evidencia: `wp-publication.json`, `publication-critical-checks.json`, `published-independent-readback.json`, `published-browser-check.json` y capturas `output/playwright/glitch-images26-review/published-*.png`.
- Corrección solicitada por el operador: ambos botones sustituidos por `core/embed` Vimeo con captions y URLs oficiales intactas. La comparación mantiene la aclaración **8×**. Diff acotado a esos dos lugares; sin cambios en texto, fecha de publicación, autor, portada, metadatos ni categorías. Readback SHA-256: `4663870ba414bbfb41b2b69dc8d6d920369a81948e955e60ae660234ab039b5f`. Snapshot del cuerpo anterior: `_gh_post_republish_252401_20261105_135648`.
- Se amplió `GutenbergArticleSpec` a `youtube | vimeo` y se reconstruyó desde el spec, sin HTML libre. **90 tests de autoría/escritura PASS** (44 de bloques editoriales, 46 de autoría y helpers), draft PASS sin findings.
- QA detectó que Ohio reducía el ancho pero mantenía la altura del iframe en móvil. Se corrigió el render nativo con `EO_Editorial_Styles::responsive_vimeo`, en el repo canónico `efeonce-public-site-runtime`. **39 checks con WP_HTML_Tag_Processor real PASS**; el despliegue cambia sólo esa clase PHP con drift guard, backup y readback. SHA final `ce3318605f86c259cd056a056b6342596c2f9354b43e6859794c3d17b124f21f`; backup remoto `/tmp/eo-vimeo-before-KflHfu`. Rollback por el mismo deploy con hashes invertidos y `runtime-before-embed.php`.
- Evidencia de esta corrección: `embed-applied.log`, `after-embed-readback.json`, `vimeo-native-parser-qa.json`, `vimeo-runtime-applied.log`, `embed-final-browser.json` y capturas `embedded-final-*.png`. La prueba de navegador recarga la URL pública, mide proporciones y reproduce ambos videos; no inyecta estilos locales.
- Site Kit registra un error de telemetría por la privacidad de los videos no listados de Vimeo; no impide reproducirlos. No se cambió tracking ni la privacidad del proveedor. La investigación también creó dos filas internas `oembed_cache` (252403/252404), sin crear entradas editoriales ni attachments.

**Solicitud de indexación:** runner canónico `pnpm public-website:gsc-index request https://efeoncepro.com/glitch/glitch-flash-images-2-6/ --apply`, confirmado `requested` el **2026-11-05 15:59:47 UTC** (12:59:47 Santiago), propiedad `sc-domain:efeoncepro.com`. Antes de pedirla, Search Console mostraba «La URL no está en Google». Google confirmó la solicitud; esto no acredita indexación completada. Registro: `scripts/public-website/gsc-indexing/ledger/2026-11.jsonl`; copia `gsc-indexing-request.json` en el artefacto. Chrome dedicado cerrado al terminar.

No se programaron redes ni correos. Las pruebas siguen sin promoverse al banco de identidad/recetas canónicas.

La corrección responsive modifica únicamente la clase editorial del plugin existente, conservando su versión 0.9.0 y el resto del runtime. No se modificaron claves, defaults de modelos ni trabajo ajeno. No hubo commit ni push.

## Reproducir la preview sin generar

```sh
node docs/public-site/glitch-flash-images-2-6/build-review.mjs
python3 -m http.server 8793 --bind 127.0.0.1 --directory ai-generations/2026-11-05_glitch-flash-images-2-6
```
