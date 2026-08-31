# Content Marketing — módulos Elementor V1

Corte de publicación, revisión editorial y evidencia: 2026-08-31 en la página `242603`, conservando
`https://efeoncepro.com/servicio-marketing-de-contenidos/` y el header/footer Ohio.

## Fuente y decisión

La instrucción del operador autoriza implementar y publicar el diseño aprobado de Claude Design.
Fuente: `~/Documents/Landing Content Marketing/Content Ops.zip`, archivo
`Landing Content Marketing v2.dc.html`, SHA256
`27187938992c412cc4119432e0e5c3ec4d20a82ab6be0d572cf2d67d36b39f6d`.
El corte inicial preservó composición, tokens, copy, imágenes, recorrido y estados. Se excluyen header/footer del
export y se reemplaza la simulación de formulario por captura real en Growth Forms.

Se extiende el patrón existente de módulos semánticos del plugin `eo-elementor-widgets`; no hay
iframe, widget HTML monolítico ni dependencia del runtime externo de Claude Design. Las expresiones y
acciones del diseño se compilan a JS local; el navegador no evalúa el export ni usa `eval`.
La captura sigue el [ADR del motor](../GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md) y su
[arquitectura vigente](../GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md): definición/versiones en PostgreSQL, lifecycle de commands, renderer portable y políticas del
motor. No se cambia source of truth, schema, autorización, API ni destinos externos.

## Implementación

Runtime: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.
Trece widgets `greenhouse_content_{hero,proof,problem,system,atomization,hub,review,editorial,modes,ecosystem,business,faq,conversion}`,
cada uno en un contenedor Elementor. `EO_Content_Marketing_Base` registra controles nativos `text`,
`textarea`, `url` y `media` desde `includes/content-marketing/schemas/`; los iconos se editan como texto
Tabler (`ti ti-*`), no con un selector visual de iconos. Añade switch de motion y padding responsive;
conversion añade claves de formulario y surface. Los grupos Contenido contienen hasta doce controles.

El export aprobado determina estructura, assets y defaults. Los settings guardados en el documento
Elementor determinan el contenido de cada instancia. Las keys `content_NNN` y `sourceValue` enlazan
los templates SSR con el diccionario de actualización: no son un schema genérico para crear secciones
o reordenar colecciones. Valores idénticos del mismo tipo dentro de un módulo comparten control. El
contenido inicial se renderiza en PHP; `content-marketing.js` mejora el DOM con funciones compiladas. Las actualizaciones
preservan el nodo de captura y los valores escritos. Los tabs admiten flechas, Home y End.

Compilación: `compile-content-marketing-source.cjs` + `content-marketing-client.cjs`.
El parser conserva las directivas en tablas (htmlparser2, HTML mode). El JS de la fuente se evalúa
sólo durante la compilación local, sobre el artefacto aprobado; nunca como API de producto.
`build-content-marketing-package.cjs <baseline-exportada>` genera ZIP/manifest con hashes de entrada,
archivos previos y fuente del renderer. Sólo ese empaquetador respeta `PUBLIC_SITE_RUNTIME_ROOT`;
compiler y client fijan actualmente el checkout `/Users/jreye/Documents/efeonce-public-site-runtime`.
El empaquetador compila el renderer, pero no ejecuta los otros dos scripts ni genera PHP, host CSS o
portada social. Reconstruir requiere esos archivos existentes y el árbol de assets del export.

El paquete incluye el loader compartido completo. La allowlist no separa cambios ajenos dentro de
ese archivo: se debe comparar su diff con un baseline live reciente antes de desplegar. El deploy
valida todos los hashes y paths antes de escribir, conserva backup y escribe cada archivo mediante
rename, con registro/loader al final. No es una transacción del paquete completo: un fallo intermedio
puede requerir rollback. El digest de fuente queda registrado, pero el compilador no rechaza por sí
solo un export distinto; corresponde verificarlo antes de compilar. [Procedimiento](../../manual-de-uso/public-site/content-marketing.md).

CSS del host aislado: neutraliza la compensación de gutters de Ohio sólo en esta página y despeja
el hero bajo el masthead; no cambia estilos globales. Al montar, el pin requiere ancho ≥940 y alto ≥740; el handler de resize sólo exige ancho ≥940.
Esta asimetría permite activarlo tras un resize con poca altura y queda como riesgo de verificación.
Móvil bajo ese ancho, reduced motion y sin JS muestran los siete capítulos en flujo normal. El estado de navegación
programática suprime temporalmente la sincronización con scroll para evitar capítulos intermedios.

## Captura y SEO

- Form: `efeonce-content-marketing`; key `18b228e9-106a-402e-a6f2-a8c5469e73d7`.
- Surface: `fhsf-efeonce-content-marketing`; orígenes de producción con/sin www.
- Versión publicada vigente en este corte: v3 `fver-e96ca2e9-d2b2-4f72-ad50-33d2b2be9245`; variante
  `content_marketing`, presentación `multi_step_light`. Sustituye a v2, deprecada después del readback.
  Labels, ayudas, placeholders, CTA y confirmación pertenecen al contrato publicado de Growth Forms;
  las opciones/valores, validadores, consentimiento, seguridad y destino no cambiaron.
- Pasos: identidad y contexto; consentimiento y Turnstile del motor. Destino `greenhouse_only`.
- Renderer compilado y fijado en `content-marketing-forms.js`; la variante nueva no implica despliegue
  del bundle genérico de otros consumidores. La presentación vive en el renderer; el host sólo pasa tokens.
- Corrección compartida: select nativo restituye `initialValues` y su selección al volver entre pasos.
- Yoast conserva Organization/WebSite/BreadcrumbList y añade un Service conectado. No se agrega FAQ
  adicional. `includes/content-marketing/seo.php` se limita a página `242603` con el marker
  `_eo_content_marketing_enabled=1`; usa el publisher existente como provider y la descripción Yoast.
  Title, metadescripción, OG/Twitter, canonical, robots e imagen social configurados. El script inicial
  de cutover es de una sola ejecución y no es el editor de cambios posteriores.

## Operación y evidencia

Publicación mediante `Document::save()`, sin escritura directa de `_elementor_data`.
Rollback documental: opción `_gh_content_marketing_before_20260831_121810`; paquete inicial
`/tmp/eo-content-marketing-before-20260831-120751.tar`. Se conservan backups incrementales posteriores.
Hash Elementor inicial: `dd6275695aa878020d6471c91ab121ed36b175b16c417ccd3732797d8c86f020`.
Hash al cierre editorial: `b8d379697673969a8add5ece01e0b41c12563907470555768febe8c79b14f753`;
snapshot previo al ajuste final `_gh_content_marketing_copy_20260831_194706`.
Este último snapshot revierte cinco campos de conversión, no toda la secuencia de publicación.
Imagen social: attachment `251825`. Estos identificadores corresponden al corte de publicación y
deben releerse antes de cualquier cambio. Restaurar requiere revisar deriva y usar el snapshot con
`Document::save()` y metas anteriores; no restaurar todo el sitio ni archivos ajenos. No existe un
comando automático de rollback de esta landing; el backup temporal tampoco garantiza retención.

El menú global conserva el item `242917` del menú primario `61`, bajo Soluciones → Crecimiento
Multicanal, con título Content Marketing y destino a esta página. El cambio posterior del título
se respalda separadamente en `_gh_content_marketing_menu_20260831_122837`; no forma parte del
snapshot inicial de página ni exige duplicar el enlace. Su secuencia visible fue restituida y comprobada; la API normaliza `menu_order` a rangos 1..N,
por lo que esa evidencia no acredita igualdad de valores raw de la base.

La evidencia de navegador en `.captures/content-marketing/` cubre responsive, estados interactivos,
validación local y prefill/back del formulario. La igualdad de ancho del documento no certifica
que todo descendiente quepa: las tablas/contenedores tienen su propio comportamiento. Persisten
contraste señalado por axe, envío aceptado/ledger, conversión GA4, CWV y save/reload completo del
editor sin certificar. Registro de controles y readback CMS no equivalen a esa prueba del editor.

[Funcional](../../documentation/public-site/content-marketing.md) ·
[Manual](../../manual-de-uso/public-site/content-marketing.md) ·
[Auditoría](../../audits/public-site/2026-08-31-content-marketing-publication.md).

## Autoridad editorial y evidencia por sección

Los defaults del export permanecen como referencia; la instancia Elementor conserva el copy revisado.
`update-content-marketing-copy.php` admite uno o dos módulos declarados por patch y exige identidad,
hash del documento, campos y valores anteriores antes de `Document::save()`. Los JSON publicados son
históricos: no se encadenan contra la página actual ni se relajan sus guardas para repetirlos.

| Alcance publicado | Evidencia y recuperación |
| --- | --- |
| Problema y siete etapas: 118 controles | [Revisión editorial](../../audits/public-site/2026-08-31-content-marketing-editorial-copy.md) |
| Content Hub y revisión: 83 controles y refinamiento de cinco | [Operación y cortes](../../audits/public-site/2026-08-31-content-marketing-hub-review-copy.md) |
| CMS y modalidades: 53 textos, ocho controles nuevos de marca | [CMS y modos](../../audits/public-site/2026-08-31-content-marketing-cms-modes.md) |
| Ecosistema y FAQ: 37 textos, seis URL | [Servicios conectados](../../audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md) |
| Dos wordmarks Efeonce ampliados: sólo host CSS | [Legibilidad de marca](../../audits/public-site/2026-08-31-content-marketing-mode-logo.md) |
| Caso interno y cierre: 48 textos; cinco condensados después; formulario v3 y clipboard | [Conversión y equilibrio](../../audits/public-site/2026-08-31-content-marketing-business-conversion.md) |

El equilibrio final de conversión se resuelve con cinco textos más breves; no reduce tipografía ni
estira el formulario. El ajuste deja intactos los otros doce módulos y no cambia CSS, JS o versión
Growth Forms. Las dos columnas corresponden al primer paso; en móvil se apilan. La diferencia de
altura al pasar al segundo paso es propia de su contenido y no justifica forzar alturas fijas.

## Grupo de CMS — extensión editorial autorizada

El módulo editorial añade ocho controles `cms_{wordpress,webflow,drupal,modyo}_{logo,name}`.
Se extiende schema/template y árbol del cliente mediante `content-marketing-cms-logos.cjs`; no cambia
la identidad de campos previos. Marcas estáticas con nombre visible y assets locales, sin alianza
implícita. La oferta contempla otros CMS. [Fuentes, diseño, hashes y QA](../../audits/public-site/2026-08-31-content-marketing-cms-modes.md).

Ecosistema y FAQ conservan sus widgets y controles existentes: textos/textarea y seis URL nativas.
El writer editorial valida destinos internos concretos y preserva las demás propiedades del enlace;
SSR e hidratación usan esos mismos controles. No introduce navegación por click handlers ni schema
FAQ adicional. [Patch y evidencia](../../audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md).

El correo del caso interno se copia desde el lookup de los mismos controles Elementor que lo
renderizan, con saltos reales. El formulario tiene copy versionado en Growth Forms, no en el host.
[Revisión de business/conversion y formulario](../../audits/public-site/2026-08-31-content-marketing-business-conversion.md).
