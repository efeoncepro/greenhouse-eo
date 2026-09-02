# HubSpot — revisión SEO/AEO completa de la landing

Fecha: 2026-08-31. Página WordPress `244079`.
URL: <https://efeoncepro.com/servicios-contratar-hubspot/>.
Estado: **correcciones de la landing publicadas y verificadas; pendientes globales y de evidencia editorial identificados**.

## Alcance y criterio

Revisión de metadatos, schema, indexación real, canonical, robots, sitemap, variantes de URL, HTML servidor,
semántica, intención comercial, enlaces inmediatos, imágenes, móvil, accesibilidad, rendimiento y medición.
No equivale a un crawl de todo el dominio, una auditoría exhaustiva de backlinks ni una promesa de ranking.
Objetivo: leads B2B para implementación, migración y operación HubSpot; español, Chile/LatAm.
Skills: `seo-aeo` (Technical, Content, Entity, AEO/GEO, Measurement, antipatterns),
`seo-aeo-practice` (límite comercial), `efeonce-public-site-wordpress`, QA y documentación.
Se consultaron fuentes oficiales de Google, Schema.org, Yoast y HubSpot.

## Cambios publicados

| Elemento | Antes | Después / decisión |
| --- | --- | --- |
| Título interno WordPress | Empodera tu crecimiento con HubSpot + Efeonce | Servicios HubSpot, consistente con la etiqueta aprobada del menú. Slug e H1 intactos. |
| SEO title | Implementación y operación de HubSpot \| Efeonce | Conservado: describe la oferta; no se reescribió para perseguir longitud o un semáforo. |
| Meta description | Habilitamos HubSpot Hub por Hub y después lo operamos contigo. Implementación, migración y operación con Efeonce, Solutions Partner Gold. | Ajuste posterior autorizado tras revisión con `copywriting`: Implementamos y migramos tu HubSpot, Hub por Hub, y lo operamos contigo. Trabaja con Efeonce, Solutions Partner Gold. |
| Open Graph | Título anterior y descripción centrada sólo en onboarding | Mismo título y descripción vigentes que SEO. `og:type=website`. |
| Twitter/X | Título anterior y lectura estimada de artículo | Título/descripción explícitos y coherentes; sin tarjeta de tiempo de lectura. |
| Breadcrumb schema | Empodera tu crecimiento con HubSpot + Efeonce | Servicios HubSpot, mediante campo nativo Yoast. |
| Schema de servicio | Cinco nodos Yoast sin entidad del servicio | `Service` conectado a `WebPage.mainEntity` y al `Organization` existente. Un único grafo. |
| Prueba de partner | URL visible como texto sin enlace | Enlace real al perfil oficial, con control URL nativo Elementor. |
| Fuentes | Dos `@import` anidados en CSS | Dependencia única de fuentes descubierta en el head, `display=swap`; mismos tipos/pesos. |
| Iconos | Fuente completa de 877.984 bytes | Subset de 2.424 bytes para los 11 glifos utilizados; contornos idénticos verificados. |
| CSS de iconos | Hoja bloqueante externa de jsDelivr | Misma hoja completa alojada en el sitio sólo para esta landing. Otros iconos conservan fallback a la fuente original. |

La imagen social existente (2001×959 WebP) y la destacada (2001×801 WebP) fueron revisadas visualmente:
representan Efeonce + HubSpot Gold y no contienen el titular anterior. Se conservaron. No se generó arte nuevo.
No se modificaron el diseño aprobado, header/footer, URL, formulario, menú, tracking ni opciones globales Yoast.

## Schema y datos de entidad

- Una sola salida JSON-LD de Yoast: `WebPage`, `ImageObject`, `BreadcrumbList`, `WebSite`, `Organization`, `Service`.
- `Service.name` procede del título nativo; descripción de la página Yoast; provider reutiliza el ID publicado
  por `WebSite.publisher`. No hay una segunda Organization ni datos comerciales duplicados en otro plugin.
- **Schema.org Validator sobre la URL publicada: cero errores y cero advertencias**, con `Service` resuelto
  dentro de `WebPage.mainEntity`. No se presenta un simple `JSON.parse` como validación externa.
- No se añadieron precios, puntuaciones, reseñas, área geográfica, certificaciones adicionales ni métricas de éxito
  que el contenido/fuentes no acreditan. `Service` describe semántica; no garantiza un rich result de Google.
- Las seis FAQ siguen accesibles en HTML. No se agregó `FAQPage` como supuesto desbloqueo de resultados:
  Google retiró esa función el 7 de mayo de 2026. El tipo puede existir en Schema.org sin esa elegibilidad.
- Las siete URLs de políticas publicadas en Organization responden 200 y tienen títulos/H1 correspondientes.
  Esto comprueba destinos; no constituye revisión legal del contenido.
- Nombre/descripción globales de WebSite, contacto corporativo y rango de empleados 51–200 son heredados.
  Su veracidad institucional requiere revisión global; no se sobrescribieron para una sola landing.

## Rastreo e indexación

| Comprobación | Resultado |
| --- | --- |
| URL HTTPS pública | 200, sin login ni restricción de indexación. |
| Robots HTML | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`. |
| robots.txt | 200, permite rastreo y declara sitemap_index.xml. |
| Sitemap índice / páginas | 200; landing incluida una vez; lastmod `2026-08-31T09:35:53+00:00`. |
| Canonical | Una, HTTPS y autorreferente; coincide con og:url y schema. |
| www y sin slash | 301 al destino canónico. |
| UTM sobre HTTPS | 200 y canonical sin parámetros; correcto. |
| HTTP y HTTP con UTM | **Corregido: 301 a HTTPS**, conservando parámetros de campaña. |
| Idioma | HTML `es`, schema `es`; sin variantes traducidas verificadas que justifiquen hreflang. |
| HTML sin JavaScript | Un H1, 11 módulos, 23 paneles y seis FAQ; contenido principal no depende del cliente. |
| Google Search Console URL Inspection | **Enviada e indexada**, robots permitido, fetch correcto, canonical de Google = canonical declarada. |
| Último rastreo Google | `2026-08-27T03:16:28Z`, smartphone: anterior a esta publicación. No certifica el contenido nuevo ya procesado. |

La redirección se limita a esta página y utiliza detección de transporte nativa de WordPress.
El primer intento registraba el hook demasiado tarde, al cargar widgets; se corrigió su inicialización en
el loader antes de `template_redirect`. Se verificó HTTP 301 y HTTPS 200 sin bucle. No se cambiaron cabeceras
del proxy, DNS ni reglas globales de hosting. La skill WordPress prohíbe parchear seams compartidos globales
para un problema local; se conservó el header/footer pedido por el operador.
No se utilizó Indexing API para esta landing ni se afirmó una solicitud manual de indexación.
Yoast actualizó su timestamp IndexNow durante el guardado nativo; esto no prueba indexación nueva en Google.

## Contenido, intención y AEO

La página responde a evaluación inicial, CRM que no rinde, escalamiento, Hubs, sectores, licencias,
implementación por fases, adopción, operación mensual, propiedad de datos y controles humanos de IA.
El CTA y el formulario conducen a la reunión de alcance. H1 expresivo y título SEO descriptivo son compatibles.
No se añadió una lista artificial de keywords ni texto sólo para buscadores.

| Intención / pregunta | Cobertura |
| --- | --- |
| Implementación y operación de HubSpot | Hero, cinco etapas y Managed CRM. |
| Qué Hubs necesito / qué queda instalado | 14 paneles con alcance y entregable. |
| Cuánto cuesta / licencias / créditos | Dimensionamiento y cotización por alcance, sin precios inventados. |
| Migración de CRM existente | Mencionada en hero/metadatos y diagnóstico; oportunidad futura de explicar reconciliación/cutover con ejemplos propios. |
| Tiempo, propiedad y seguridad | FAQ y etapas; no promete plazos universales. |
| Partner Gold y experiencia | Tier contrastado con directorio oficial; enlace público corregido. |
| Resultados medidos | Requiere respaldo adicional para 56%/76%; ver pendientes. |
| Agentes / Claude / ChatGPT | Alcance conversacional, permisos y aprobación humana explicados. |

Los paneles y respuestas se pueden recuperar del HTML inicial; no se requieren archivos especiales para IA.
La calidad de un pasaje y su respaldo importan más que agregar marcado sin contenido.
No se midió cuota de citación en motores IA ni volumen de keywords; no se inventó un resultado AEO.

## Enlaces, móvil y accesibilidad

- 40 destinos/recursos únicos de la página completa comprobados; las anclas del cuerpo resuelven.
  Perfil HubSpot adicional comprobado en su directorio oficial. No hay página huérfana: menú y Home la enlazan.
- Cuerpo: agenda como fallback del formulario, anclas de navegación y ahora prueba externa enlazada.
  El enlazado editorial a futuros casos/guías puede crecer cuando existan piezas públicas pertinentes;
  no se inventaron URLs ni se usaron documentos privados como prueba pública.
- Tres imágenes del cuerpo con ALT y tamaño reservado; ALT vacío deliberado en símbolo decorativo.
  Sin imágenes del cuerpo por HTTP ni recursos de imagen rotos en la prueba anónima.
- Prueba real de 1440, 1024, 768 y 390 px, normal/reduced motion, sin desbordamiento; pestañas,
  FAQ, teclado y formulario de tres pasos verificados. No se envió ningún lead real.
- Lighthouse reporta accesibilidad 91/100. Avisos sobre enlaces sociales sin nombre y heading vacío del footer
  son compartidos. Los avisos masivos de contraste de paneles oscuros se contrastaron con captura/estilo real:
  el auditor automático tomó el fondo claro detrás del gradiente. No se recoloreó el diseño por ese falso positivo.
  La captura móvil verifica el fondo oscuro y texto legible; no equivale a una certificación WCAG completa.

## Rendimiento y medición

Lighthouse 12.8.2, Chrome headless, móvil simulado, página pública sin mocks. Son **datos de laboratorio**,
no percentiles reales de usuarios. Las cargas externas y las cachés introducen variación.

| Métrica | Antes | Final móvil |
| --- | ---: | ---: |
| Performance | 43/100 | 59/100 |
| First Contentful Paint | 9,8 s | 5,2 s |
| Largest Contentful Paint | 16,3 s | 8,6 s |
| Total Blocking Time | 530 ms | 120 ms |
| Cumulative Layout Shift | 0,004 | 0,004 |
| Transferencia total observada | 2691 KiB | 1805 KiB |
| SEO automatizado | 100/100 | 100/100 |

Dos mediciones intermedias dieron LCP 8,1 y 7,7 s; una no pudo descargar robots.txt (92/100) y se repitió.
La lectura HTTP independiente y las siguientes corridas verificaron robots correcto.
Desktop final: Performance 76/100, SEO 100/100, FCP 1,1 s, LCP 3,9 s, TBT 10 ms y CLS 0,015. No se interpreta ese fallo
transitorio como una directiva robots rota. El score SEO ya era 100 antes: cubre comprobaciones básicas,
no invalida los problemas reales de contenido social/schema ni demuestra buen posicionamiento.
El LCP móvil sigue alto. Persisten CSS/iconografías del tema y plugins globales, fuentes adicionales,
HubSpot Analytics, Clarity y otros terceros. No se eliminó analítica, consentimiento ni controles de seguridad
para mejorar un score. PageSpeed Insights API respondió 429; no hay certificación CrUX/CWV de campo.

Search Console API viva, propiedad `sc-domain:efeoncepro.com`, búsqueda web:

| Período de 28 días | Clics | Impresiones | CTR | Posición media |
| --- | ---: | ---: | ---: | ---: |
| 4–31 julio 2026 | 0 | 27 | 0% | 23,56 |
| 1–28 agosto 2026 | 0 | 9 | 0% | 15,00 |

Son datos anteriores al diseño nuevo; muestra pequeña, sin inferencia causal ni promesa de aumento de CTR.
Sólo una query no anonimizada aparece en el desglose: «busco software con excelente servicio al cliente»,
1 impresión y posición 14. El total por página es 9: el desglose por query no reproduce todo por privacidad.
La tabla materializada local tenía sólo esa fila; se obtuvo el total y URL Inspection directamente de Google,
respetando la conexión y los resolvers canónicos. No se confundió cache parcial con tráfico total.

## Pendientes priorizados

RICE cualitativo: no hay alcance/impacto cuantificado suficiente para fabricar un score numérico.

| Prioridad / confianza | Hallazgo | Siguiente paso / owner |
| --- | --- | --- |
| P1 editorial / alta sobre falta de respaldo | 56% medio, 76% máximo, «permiso de uso» sin reporte localizado | Práctica HubSpot/operador: aportar período, baseline, denominador, metodología y permiso; después enlazar caso público aprobado. No amplificar cifras en schema/metadatos. |
| P1 global / alta | Footer: `instagram.com.com`, términos 404, enlaces demo Colabrio/ThemeForest, sociales sin nombre | Dueño del sitio: corregir footer canónico para todas las páginas, conservando diseño. YouTube devolvió 404; verificar perfil antes de sustituir. No se trató 403 anti-bot de otros destinos como prueba de enlace roto. |
| P2 rendimiento / alta | LCP móvil aún 8,6 s y recursos globales sin uso local | Optimización del tema/plugins y estrategia de terceros, con regresión de Home, footer, consentimiento, formularios y medición. |
| P2 credibilidad / media | «Comprar directo no te sale más barato» y condiciones de licencias absolutas | Práctica comercial: respaldar condiciones vigentes o precisar excepciones; no afirmar equivalencia universal sin fuente contractual. |
| P2 entidad / media | Naming, empleados y datos corporativos heredados en schema global | Revisar contra fuentes institucionales; no sustituir hechos por supuestos. |
| P2 contenido / media | Falta caso público con metodología y detalle propio de migración | Publicar piezas con evidencia; luego enlazarlas desde esta landing. |
| P2 medición / alta | Google aún no rastreó la nueva versión; falta CWV de campo | Revisar GSC tras nuevo crawl y comparar 28 días con cautela. Sin monitor programado ni seguimiento automático creado. |

## Evidencia y reversión

Datos sanitizados: [evidencia SEO](2026-08-31-hubspot-seo-evidence.json).
Código runtime: `includes/hubspot/seo.php`, registro de widgets, CSS/fuentes y control de fuente pública.
Owner: plugin existente `eo-elementor-widgets`; no plugin nuevo ni segundo proveedor de schema.
Las opciones globales, menú y hashes de otras páginas permanecieron intactos. Hash Elementor `244079`:
`b44adec9c6120b94bab004fa4d5d162ef7e5c8e53835288b47551cd880ada151`.

Snapshot durable WordPress: `_gh_hubspot_seo_20260831_093553` (post, metadata y estado protegido).
Backups de archivos: `/tmp/eo-hubspot-before-20260831-093537.tar`, `094025.tar` y entrega final de inicialización registrada en la evidencia; no asumir retención de `/tmp`.
El primer guardado se detuvo al detectar el timestamp derivado de IndexNow; un readback normalizado confirmó
que los únicos cambios no funcionales fueron ese timestamp y el contador EAEL de visitas. Se completó la
verificación protegida y purga, sin restaurar ni sobrescribir datos editoriales.

Rollback: revertir los archivos de esta entrega desde hashes/backups y restaurar título/campos SEO del snapshot;
no restaurar todo el postmeta ni `_elementor_data` sobre cambios posteriores. Desactivar `_eo_hubspot_seo_enabled`
retira el adapter del grafo, la redirección HTTP y las optimizaciones exclusivas de la página; reconstruir indexable Yoast y purgar cache.
Las fonts se registran también para widgets en preview; no borrar dependencias mientras el registry las referencie.

Verificador repetible: `node scripts/public-website/verify-hubspot-seo.cjs`.

Pruebas: 191 campos editables/escape, controles/repeaters; test semántico de grafo y aislamiento; igualdad de
contornos de los 11 glifos; PHP/JS syntax; browser anónimo; Schema.org Validator y GSC vivos; hashes/metadata.
`qa:gates --changed` es orientador sobre todo el WIP compartido, no ejecución de tests de otros dominios.
Gates: sintaxis y diff limpios; `docs:closure-check` completado con dos avisos orientadores del WIP compartido
(project_context/registro de skills). Esta intervención se documenta en arquitectura, manual, audit y handoff,
sin modificar el contrato global de agentes. Context strict: 0 errores, 0 advertencias.
No commit, push, cambios de branch, migraciones, deployment Vercel ni contactos externos.

## Fuentes primarias

- [Google: títulos](https://developers.google.com/search/docs/appearance/title-link) y [snippets](https://developers.google.com/search/docs/appearance/snippet).
- [Google: políticas de datos estructurados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- [Google: AI features](https://developers.google.com/search/docs/appearance/ai-features) y [retiro FAQ](https://developers.google.com/search/updates).
- [Schema.org Service](https://schema.org/Service) y [validador de esta URL](https://validator.schema.org/#url=https%3A%2F%2Fefeoncepro.com%2Fservicios-contratar-hubspot%2F).
- [Yoast Schema API](https://developer.yoast.com/features/schema/api/).
- [Perfil oficial Efeonce Group, Gold](https://ecosystem.hubspot.com/es/marketplace/solutions/efeoncepro).
- [Kinsta: HTTPS](https://kinsta.com/docs/wordpress-hosting/wordpress-getting-started/go-live-checklist/).


## Aclaración posterior: preservar la estética aprobada

El operador rechazó cualquier cambio estético durante la corrección SEO. Se retiró el subrayado añadido al
perfil oficial y su regla adicional de salto de línea. El enlace mantiene color y fuente heredados, sin
fondo/decoration nuevos; sigue siendo rastreable. No se cambiaron composición, colores, familias tipográficas,
imágenes ni header/footer. CSS única: respaldo `/tmp/eo-hubspot-before-20260831-100220.tar`.
La restricción rige también futuras correcciones: no reinterpretar SEO como permiso para rediseñar.

## Ajuste posterior de copy de metadatos

El operador autorizó quitar la redundancia «operamos / operación» tras revisar `copywriting`, su módulo de
edición y la voz institucional, junto con `seo-aeo`. Nueva descripción en la tabla superior; title conservado.
Se modificaron sólo `_yoast_wpseo_metadesc`, `_yoast_wpseo_opengraph-description` y
`_yoast_wpseo_twitter-description`; Yoast propaga la descripción a WebPage y Service. Snapshot durable:
`_gh_hubspot_meta_copy_20260831_102004`. Post y restantes metas, incluidos Elementor, Ohio e imagen, idénticos.
Rollback: verificar ausencia de drift y restaurar sólo esas tres claves desde `meta` del snapshot,
reconstruir el indexable Yoast de 244079 y purgar caché. No restaurar el post ni el conjunto completo de metas.
Readback anónimo de la URL sin parámetros y navegador: descripción nueva en SEO/OG/Twitter y schema
WebPage/Service; title conservado, once módulos presentes. La purga necesitó propagación de caché edge.

### Identificación del caso por revisión visual posterior

El operador solicitó explícitamente mostrar el logo ANAM el 2026-08-31. Se identificó el caso y se retiró
la nota de anonimización contradictoria. Esto no aporta documentación nueva para las cifras 56%/76%
ni prueba consentimiento escrito externo. Metadatos y schema SEO permanecen sin cambios.
