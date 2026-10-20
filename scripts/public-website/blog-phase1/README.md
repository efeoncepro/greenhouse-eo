# Blog · etapa 1 (preview local, sin publicar)

Autorización del operador: implementar y mostrar escritorio/móvil en `develop`. **No autoriza publicación, push, merge ni release a main.**

## Fuentes y repositorios

- Editorial: WordPress publicado; `/blog/`, página 18456. No se cambia `page_for_posts`, taxonomía, URLs, posts ni metadatos SEO.
- Runtime: `efeonce-public-site-runtime`, rama local `develop`, worktree aislado `../efeonce-public-site-runtime-develop`. Commits locales `5488689` (base funcional) y `e90fa54` (opción 2). Su checkout original en main y su WIP quedan intactos.
- Preparación/QA/docs: `greenhouse-eo`, rama `develop`.
- Fixture público: runtime `tests/fixtures/blog-public-20261020.json`, 44 artículos y 12 categorías no vacías. Lectura autenticada sin PII con `read-inventory.php`.

## Contrato técnico y funcional

`greenhouse_blog_section` es un widget nativo de Elementor con selector de sección. Su familia usa `includes/blog/model.php` (lecturas y selección) y `render.php` (SSR común a preview y runtime). Se registra en el plugin existente; no instala otro plugin ni lleva React a WordPress.

Orden: cabecera/temas + lectura principal → cinco lecturas recientes → Glitch destacado + dos ediciones → cuatro objetivos → dos recursos → novedades si son recientes → suscripción.

- Glitch y Novedades tienen carriles dedicados; el general admite automáticamente todas las demás categorías, incluidas futuras. La consulta no depende de una lista manual de temas. Fecha descendente + ID como desempate; consultas acotadas independientes.
- Novedades: sólo publicaciones de los últimos 120 días. El archivo conserva sus enlaces desde Temas. Este umbral es una decisión inicial de implementación, revisable antes de publicar.
- Temas: `get_terms(hide_empty=true)`, nombres/conteos y enlaces reales. No expone tags con deuda editorial.
- Objetivos: enlaces directos a archivos de categorías existentes; no finge colecciones de la etapa 2.
- Recursos: guía Web agéntica y diagnóstico de visibilidad en IA. Registro curado de dos destinos públicos verificados. No se prometen grabaciones ni eventos próximos.
- Posts sin imagen: presentación tipográfica; no genera una portada ni sustituye la imagen editorial.
- Suscripción: mismo host, form key, surface y CSS aprobado del paquete `blog-growth-form`. Mantiene validación/destino en Growth Forms. El renderer comparte handle con `GrowthFormEmbed`. No publica la versión review.
- Header/footer: heredados de Ohio; el newsletter global del footer es responsabilidad separada. Se sustituye sólo el cuerpo de la página.
- Colores/espaciados/tipo desde AXIS instalado; logos originales de `axis-brand-assets`. CSS scoped, Bricolage/Poppins. Sin cambio de tokens o nuevas primitivas compartidas.

ADR gate: continúa PDR-019 y el contrato existente WordPress/Gutenberg + Elementor; no cambia source of truth, rutas, autorización ni schemas. Widget candidato específico del blog, no graduado a plataforma.

## Diseño y aceptación

Dirección vigente: **opción 2 seleccionada por el operador**. La primera composición sobre papel fue rechazada. Portada navy con imagen editorial protagonista, titular editable, logo MCM negativo oficial, lecturas sobre papel, Glitch oscuro y formulario aprobado. Alternativas descartadas: retener tarjetas/eventos manuales (no resuelve frescura) y una nueva biblioteca con filtros (etapa 2). Header/sidebar/footer permanecen los actuales. Rigor `ui-standard` para sitio público; MUI/CompositionShell y gates de TASK de producto no aplican al runtime WordPress.

Primera vista revisada a 1440 y 390; luego se compactó la navegación móvil. GVC sustituido por Playwright enfocado porque la página se compone sólo en memoria, con fixtures/renderer interceptados y red de escritura bloqueada. El mismo renderer PHP se monta dentro de la estructura Elementor y el shell Ohio real; no es un sitio publicado ni un screenshot de una maqueta ajena al código.

## Reproducir (sólo local)

```sh
pnpm exec tsx scripts/public-website/blog-phase1/build.ts
php ../efeonce-public-site-runtime-develop/tests/blog-phase1.test.php
pnpm exec tsx scripts/public-website/blog-phase1/preview.ts
```

`BLOG_RUNTIME_DIR` permite localizar otro worktree del mismo runtime. El generador consume el `host.css` aprobado, copia logos oficiales y produce assets en el worktree y `elementor-body.preview.json`. Este último es **una propuesta de estructura, no un comando de publicación**. No hay writer CMS ni deploy en el paquete.

La preview usa el fixture de Forms de `.captures/2026-10-20-blog-growth-form/render-contract.preview.json`; debe existir desde la preparación anterior. No contiene contactos. Si falta, recuperar la preparación por su lector; no crear/publicar un formulario para generar la preview.

Artefactos: `.captures/2026-10-20-blog-phase1/`, full page y primera vista a 1440/390/320, accesibilidad, temas abiertos y `evidence.json`. Todos los POST/PUT/DELETE se bloquean; GTM/colección se bloquean. Aceptación y entrega a HubSpot no se ejercitan.

## Medición preparada

Cada enlace editorial lleva `data-blog-content-id` y `data-blog-content-type`, dentro de `data-blog-section`. Estos markers permiten preparar `select_content` con `content_id`, `content_type` y ubicación, sin correo, título libre ni URL con query. **No emiten eventos ni acreditan medición GA4**: el binding GTM, consentimiento y validación DebugView siguen pendientes de autorización. No se mezcla selección de contenidos con conversión de suscripción.

La suscripción mantiene el [checklist de HubSpot/GA4](../blog-growth-form/PUBLICATION-CHECKLIST.md) y `gh_newsletter_subscription_accepted`, sin activar el histórico `sign_up` ni cambiar GTM Web7.

## Pendientes antes de producción

- [ ] Aprobar composición y política de 120 días.
- [ ] Verificar que el runtime nuevo se integra sobre un export live fresco (loader compartido tiene trabajo concurrente).
- [ ] Ejercitar controles y render en Elementor no productivo; las pruebas PHP/locales no sustituyen ese gate.
- [ ] Preparar paquete gobernado, diff y snapshots; proteger header/footer, Ohio metas, SEO y hash Elementor de 18456.
- [ ] Publicar Forms/worker/GTM sólo con autorización separada y según su checklist.
- [ ] Cutover del body por Document::save, nunca `_elementor_data` directo, después de aprobación.
- [ ] Smoke live desktop/móvil, enlaces/cachés y primer envío real autorizado a HubSpot + GA4.

Etapa 2 fuera de alcance: búsqueda, filtros combinados, paginación/archivo propio, colecciones persistidas, limpieza de tags y catálogo multiformato con editor de recursos.

## Evidencia final de esta preparación

- 18 pruebas de selección/render + 6 del contrato del widget nativo; PHP lint sin errores.
- 1440/390/320: 9 artículos únicos, 0 enlaces vacíos, 0 imágenes rotas, 0 overflow, un formulario del blog, consentimiento desmarcado y 0 aceptaciones.
- Menú de temas operado por teclado: 12 destinos, categoría vacía excluida; sin overflow abierto.
- Nueve destinos (siete categorías + dos recursos) respondieron 200 en navegador; `destinations.json`.
- En la preview sólo queda el error del tracker CF7 del footer al bloquear su POST, reproducido también en el blog original (`baseline-errors.json`). No es evidencia de fallo del nuevo widget. Ningún error de Elementor en el candidato final.
- La respuesta HTML se sustituye en memoria **antes** de inicializar Elementor. Reemplazar el DOM después dejaba handlers de motion de widgets retirados; la preview ya no usa ese método.

## Opción 2 — implementación local seleccionada (20/10/2026)

La elección visual autoriza implementar; **no autoriza publicar ni promover a main**. Product Design `image-to-code` aplicado al runtime existente, sin crear otro sitio/framework. [QA comparativa](design-qa.md).

- Hero art dedicado a post 249387 (Web agéntica): `assets/img/blog/web-agentica-hero.webp`, 69 KB, derivado con ImageGen del concepto seleccionado. El título breve es un alias editorial de esta lectura; el enlace accesible conserva el título original. Si cambia la lectura principal, se usa su propio título y portada, nunca este arte por defecto.
- Wordmark negativo MCM y Glitch originales de AXIS. Flecha y plus son originales de Tabler bajo MIT, licencia adjunta al runtime. El resto de las portadas/fechas/extractos sigue saliendo del contenido publicado.
- Texto de cuerpo de 16 px, navegación móvil compacta y temas por teclado. A 1024 px, encuadre independiente para separar fotografía y texto; 390/320 apila texto e imagen.
- Se conserva header-6/sidebar/pie real de Ohio. Por eso la barra global sigue clara, a diferencia de la barra navy ilustrada en el concepto. No se reemplaza ni modifica la navegación global.
- La página completa incluye las tres lecturas adicionales, objetivos y recursos que no entraban en el recorte conceptual. No se elimina ese alcance para parecerse a una captura parcial.
- Preview navegable local: `pnpm exec tsx scripts/public-website/blog-phase1/serve-preview.ts` → `http://127.0.0.1:8842/blog/`. Usa GET del shell público, renderer PHP local y fixture de Forms; bloquea escrituras, elimina trackers y limita conexiones a la propia preview. El `base-url` local sólo se sustituye en la respuesta de preview; el runtime conserva el destino canónico.
- Capturas finales reales en `.captures/2026-10-20-blog-option2/`: escritorio 1440, móvil390, primera vista320/1024 y QA. Servidor ligado sólo a127.0.0.1; no se sube ni expone públicamente.
- Pruebas:21 selección/render +6 widget. UI:12 temas,9 lecturas únicas, sin overflow a320/390/1024/1440; Gmail válido sin consentimiento queda bloqueado. HubSpot/GA4 real y editor Elementor siguen pendientes según checklist.


## Revisión de las seis anotaciones del operador (20/10/2026)

- Cabecera: retirada la línea redundante «El blog de Efeonce». El disclosure «Todos los temas» usa caja, padding y centrado explícitos; conserva teclado/foco y las doce categorías reales.
- Navegación local: «Lecturas por tema» sustituye «Según tu objetivo»; lleva a `#goals`. Esa sección presenta categorías editoriales (SEO/AEO, HubSpot/CRM, IA, Diseño/Contenidos), no fichas de servicios.
- Recursos: portada existente de la guía Web Agéntica y logo AEO oficial, jerarquía mayor y dos composiciones navy. Se conservan los dos destinos reales y sus markers de medición.
- Suscripción: cierre Glitch en navy con panel claro y copy explícito «Suscríbete a Glitch». El elemento Growth Form, key, surface y atributos permanecen byte-for-byte; host.css también sigue intacto. No se tocan consentimiento, validaciones ni eventos.
- Evidencia de esta iteración: `.captures/2026-10-20-blog-annotations/`, página completa 1440/390, cabecera y formulario a320; comparación anterior/nuevo y verificación a1024.
- Sólo preparación local en develop. No WordPress/HubSpot/GTM writes, publicación, push, merge o release. Los gates del checklist de publicación permanecen pendientes.
