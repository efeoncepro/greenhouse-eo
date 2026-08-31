# Content Marketing — CMS del cliente y modos de colaboración

Pedido explícito: reescribir editorial/modos con copywriting y añadir logos de WordPress, Webflow,
Drupal y Modyo, sin limitar la oferta a esas plataformas. Estado: **publicado**, página `242603`.

## Mensaje y diseño

53 campos revisados mediante controles nativos Elementor. Editorial explica carga, formato, revisión
y publicación en el CMS del cliente; retira la nota interna de capacidades «por confirmar» y las
promesas de tráfico o producción sin esfuerzo. El seguimiento a seis meses se identifica como ejemplo.
Modos explica qué se delega, qué se comparte y qué opera el cliente. Conserva nombres y valores
internos del formulario, así como la aprobación final a cargo del cliente; no promete arrancar el lunes.

Se extiende el módulo editorial existente. Grupo compacto de cuatro logos con nombre visible, en
cuatro columnas que caben a 390 px. Se descartaron una pared de logos y el solapamiento de avatares:
los wordmarks necesitan conservar espacio y legibilidad. No son enlaces ni badges de certificación.
Se reutilizan tipografía, radios y bordes del diseño; el blanco fijo es el soporte de las marcas,
para conservar sus colores originales. No hay animación nueva. `¿Usas otro CMS?` mantiene abierta
la oferta y vincula la operación a los requisitos del cliente.

## Fuentes de marca

- [WordPress: Graphics & Logos](https://wordpress.org/about/logos/), W mark PNG oficial.
- [Webflow: Brand Assets](https://brand.webflow.com/brand-assets), logo completo azul/negro SVG.
- [Drupal: Media Kit](https://www.drupal.org/about/media-kit/logos/) y header de
  [Drupal.org](https://www.drupal.org/): SVG oficial con el fill navy de su CSS incorporado,
  sin alterar paths ni proporciones. La navegación de navegador al sitio no resolvió el logo;
  HTML y CSS públicos descargados permitieron verificarlo y renderizarlo localmente.
- [Modyo](https://www.modyo.com/): SVG del header oficial, sin alterar geometría ni colores.

Catálogo con URLs de origen y hashes: `scripts/public-website/content-marketing-cms-logo-sources.json`.
Uso identificativo de plataformas, por pedido del operador; no prueba partnership ni certificación.
Assets servidos desde el plugin propio, sin hotlink ni dependencia de un CDN de logos.

## Implementación y publicación

- Ocho controles nuevos, `cms_{wordpress,webflow,drupal,modyo}_{logo,name}`: Media y texto nativos.
  Los campos anteriores conservan keys y `sourceValue`; los logos tienen defaults de archivo del plugin.
- `content-marketing-cms-logos.cjs` agrega schema/template y la misma estructura al árbol del cliente.
  El compilador aplica el adapter después de recoger los controles originales; no recompiló la landing
  completa durante este pase. El client builder incluye el adapter sin cambiar los otros módulos.
- Sólo ocho archivos de runtime: schema/template editorial, host CSS, JS y cuatro imágenes. Loader
  compartido, theme, forms bundle y código ajeno excluidos. Allowlist de deploy añade PNG.
- Package builder: `build-content-marketing-cms-package.cjs <baseline-json>`. Manifest con hashes
  anteriores/comprobación de todos los paths; paquete en `tmp/content-marketing-cms/release/`.
- Backup de runtime: `/tmp/eo-content-marketing-before-20260831-161523.tar`. Retención temporal no garantizada.
- Copy: `content-marketing-editorial-modes-copy.json` y writer existente con ambos módulos autorizados.
- Snapshot: `_gh_content_marketing_copy_20260831_161533`.
- Hash anterior: `4fcdb402a2e509a6fa6a103e02ae136309a7b42a83f2817426e28729a81764fd`.
- Hash posterior: `8c19d40b1d21c95a01f8568df86aaee5150d91adc8409a5df10592a9d7789e7d`.

Readback de árbol completo, once módulos ajenos, SEO/thumbnail, menú, opciones del shell y cinco
páginas protegidas: sin cambios no previstos. Caché Elementor y Kinsta purgada. Sin commit/push.
Rollback: verificar deriva y snapshot, revertir sólo los campos editados con `Document::save()`;
restaurar los cuatro archivos modificados de runtime desde backup y retirar los cuatro assets nuevos
sólo si no hay consumidores posteriores. No restaurar loader ni sitio entero. Volver a purgar y verificar.

## QA

Preview local de los assets/código/copy contra el HTML público antes de desplegar, en 1440/878/390:
cuatro imágenes cargadas y una sola lista después de hidratación. La captura completa de una sección
larga puede omitir el reveal del título si empieza centrada; la verificación pública desplaza al inicio.
Verificador focal mantenido: `node scripts/public-website/verify-content-marketing-cms-modes.cjs`.
Evidencia: `.captures/content-marketing/cms-modes/`, más verificadores generales de landing y SEO.

Resultado PASS: 53 valores públicos, cuatro logos cargados, nueve combinaciones de modo/viewport
(1440/878/390), una sola lista tras hidratación, contenido y logos presentes sin JS, cero errores JS
y ancho del documento igual al viewport. Los checks generales de landing y SEO también pasan;
se conserva el prefill Content Engine y el retorno de formulario sin borrar datos.

Sin envíos de leads. No certifica editor GUI completo, contraste global, indexación ni CWV.
El defecto previo de resize del pin sigue fuera de alcance. Referencias: [contrato](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md), [manual](../../manual-de-uso/public-site/content-marketing.md).
