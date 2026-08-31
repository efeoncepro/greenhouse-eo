# HubSpot · isotipos de producto y logo en licencias · 2026-08-31

## Pedido, fuentes y límites

Comentarios del operador: buscar Breeze/AEO en Brandfolder, mostrar el isotipo del producto seleccionado
arriba a la derecha de su panel, incorporar logo HubSpot completo sobre «Licencias y operación».
Después confirmó expresamente «Somos solutions partner tenemos autorización» al consultar el permiso de
logo corporativo. Esa declaración autoriza este uso; no equivale a revisar documentación externa del contrato.

- [Brandfolder Solutions Partner Hub](https://brandfolder.com/hubspot/solutions-partner-hub): Smart CRM Icon,
  Agent Hub - Icon Orange. [Archivos y SHA originales](2026-08-31-hubspot-product-marks-provenance.json).
- La búsqueda Breeze devuelve pictograma genérico y capturas, sin wordmark Breeze en el kit visible.
  El catálogo vigente incluye Agent Hub y [la página oficial](https://www.hubspot.com/products/artificial-intelligence)
  usa esa identidad para agentes. Se incorpora su isotipo en la tarjeta «Breeze y agentes de IA» y en su panel,
  sin cambiar el naming/copy aprobado. Se informó esta distinción al operador; no se rotula el archivo como logo Breeze.
- AEO: 12 activos de interfaz/capturas en la búsqueda del kit, ningún logo o isotipo propio identificado.
  Se deja tarjeta/panel sin símbolo, tal como condicionó el operador. No se inventa ni reutiliza el de Marketing Hub.
- Wordmark completo claro: SVG oficial del footer de la
  [página HubSpot de beneficios](https://www.hubspot.com/solutions-partners-tiers-and-benefits-2026), extraído
  de su imagen data URI sin modificar paths, colores ni proporciones. Autorización confirmada por el operador.

## Implementación

Misma página `244079`, mismo slug, mismos 11 widgets nativos. Ocho Media `brand_*_icon` gobiernan tarjeta
y panel: Smart CRM, seis Hubs, Agent Hub. El renderer comparte sólo Media de marca hacia plantillas SSR;
no hace una segunda sustitución sobre texto del editor. La identidad está en cada panel antes de hidratar JS,
por lo que no hay logo transitorio de la selección anterior y funciona sin JavaScript.

Fila superior del panel: número/categoría a la izquierda, isotipo 48 px a la derecha (40 px móvil), después
el cuerpo existente. Sin colisiones con título ni lista. Media `brand_hubspot_logo` y texto ALT
`brand_hubspot_alt` en Licencias; ancho 180 px y 28 px de separación al eyebrow.

El adaptador `scripts/public-website/hubspot-brand-assets.cjs` forma parte del compilador source-led y conserva
keys anteriores. Sin cambios a header/footer, ANAM, timeline, formulario, menú ni metadatos SEO.
No se renombró Breeze ni se alteraron cifras/copy comercial.

## Publicación y rollback

[Manifest](2026-08-31-hubspot-product-marks-manifest.json): 17 archivos del plugin, no checkout completo.
Snapshot `_gh_hubspot_product_marks_20260831_105551`; backup remoto
`/tmp/eo-hubspot-before-20260831-105640.tar`. Guard previo de SHA y página, instalación y purga Kinsta PASS.
Árbol Elementor inalterado:
`0bd64d3e7a9026f099ce0114c9a5bae1cec0e8d95a3082b6f4b4d49d5f401e09`.
Post y metadatos protegidos intactos; Home y Creative conservan hashes. No hubo Document::save en esta revisión.
No commit/push ni despliegue general Greenhouse.

Rollback: verificar hashes publicados, restaurar sólo archivos del tar y retirar los tres SVG nuevos listados
en created-paths.json. No revertir base de datos ni ediciones anteriores. Limpiar caché Elementor/Kinsta y
repetir navegador público. Conservar el adaptador y tests alineados al estado elegido.

## Verificación

- PHP renderer: 190 campos editables y escaping PASS; Media compartido tile/panel tras edición y reorder PASS.
  AEO no hereda iconos. Controles nativos Media/ALT, sin widget HTML.
- Preview navegador: 84 estados (14 selecciones × 1414/878/390 px × motion normal/reducida), selección única,
  correspondencia de URLs, imágenes decodificadas, sin colisiones/overflow, teclado y cero pageErrors PASS.
- Capturas inspeccionadas: `.captures/hubspot-product-marks-20260831/`.
- Readback WP: 17 hashes coinciden, ocho Media Hubs y Media/ALT Licencias registrados en Elementor real.
  Tres SVG públicos HTTP 200 y byte-identical a los originales; árbol Elementor/Home/Creative sin cambios.
- SEO PASS (title/description, canonical, redirects, sitemap y grafo Yoast/Service).
- Timeline anterior PASS: 30 estados, teclado, reduced motion, no-JS y partner.
- Primer recorrido al redimensionar dejó activo el hover del megamenú Ohio global, produciendo overflow
  transitorio ajeno al módulo. Se verificó 878 px en sesión nueva sin overflow y se corrigió el escenario
  para sacar el puntero del menú y esperar su cierre antes de medir; no se modificó el header.
- Gates de sintaxis, PHP, git diff --check, qa:gates y docs:closure-check PASS; dos avisos globales por
  WIP/documentación anterior. Context strict: cero errores/advertencias.
- [Recorrido anónimo final PASS](2026-08-31-hubspot-product-marks-evidence.json): 84 estados en la URL normal,
  sin interceptar requests, teclado y cero pageErrors. Ocho marcas SSR visibles sin JS. Capturas live
  de paneles y licencias inspeccionadas.
