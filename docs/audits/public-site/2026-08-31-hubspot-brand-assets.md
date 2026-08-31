# HubSpot · iconografía oficial y caso ANAM · 2026-08-31

## Alcance y derechos

Pedido explícito: revisar Brandfolder para los iconos de cada Hub y poner ANAM en el espacio superior derecho del caso.
Se aplica la skill creative-rights-governance: activos originales, procedencia trazable y sin recolorear/recrear marcas.
Fuente oficial: [Solutions Partner Hub](https://brandfolder.com/hubspot/solutions-partner-hub), sección Brand Logos, Icons & Wordmarks.
La [guía de beneficios](https://www.hubspot.com/solutions-partners-tiers-and-benefits-2026) permite a partners usar iconos y recursos
para marketing siguiendo las guías. Esto no amplía permisos para usar el logo corporativo HubSpot en otros contextos.

[Provenance por activo, nombre del SVG y SHA](2026-08-31-hubspot-brand-assets-provenance.json).
Marketing, Sales, Service, Content, Data y Revenue se sirven localmente sin modificar los SVG descargados.
ANAM reutiliza el SVG ya publicado en assets/img/brand-logos/anam.svg (SHA
6032399c73e13ff7fa4c9fac4a18f34ca514812de94a2933d1fcd70cddd7fc8e).
El operador autorizó identificar ANAM; no se afirma haber obtenido un consentimiento externo adicional ni nueva prueba de 56%/76%.

## Implementación y publicación

Seis controles Media brand_*_icon en Hubs; Media f033_imagen_anam y ALT f034_alt_anam en proof-ledger.
Adaptador aditivo hubspot-brand-assets.cjs aplicado por el compilador después de extraer controles: no renumera keys.
Iconos decorativos con ALT vacío junto a nombres legibles, sin cambiar accesibilidad de botones.
ANAM a la derecha en escritorio; apilado en móvil. Única edición al árbol Elementor: f023_descripcion pasa a
«Caso ANAM · Customer Agent de HubSpot en producción.» mediante Document::save.
Header/footer, menú, featured image, SEO y otros diez widgets no se modifican.

Snapshot previo: _gh_hubspot_brands_20260831_104555. Hash Elementor previo:
b44adec9c6120b94bab004fa4d5d162ef7e5c8e53835288b47551cd880ada151.
Hash posterior: 0bd64d3e7a9026f099ce0114c9a5bae1cec0e8d95a3082b6f4b4d49d5f401e09.
[Manifest de 11 archivos](2026-08-31-hubspot-brand-assets-manifest.json).
Backup remoto: /tmp/eo-hubspot-before-20260831-104659.tar. No commit/push ni deploy general Greenhouse.

El guard inicial detuvo el cierre después del save por _elementor_controls_usage (inventario derivado de controles).
No se repitió la publicación: readback separado comprobó árbol exacto esperado y sólo cambios de ese inventario,
caches de Elementor e IndexNow. Hashes de Home y Creative intactos. Nueva purga completada.

## Verificación

- PHP: 189 campos de texto raíz editables/escapados, Media nativos y reordenamiento PASS.
- Preview real de la página pública con sólo módulos/activos locales sustituidos: 1414, 768 y 390 px,
  seis selecciones por ancho, teclado, imágenes cargadas y sin colisiones/overflow PASS; cero pageErrors.
- Capturas revisadas en .captures/hubspot-official-assets-20260831/.
- Readback WP: 11 hashes idénticos, árbol igual al snapshot salvo la nota autorizada, metadatos protegidos intactos.
- [Verificación anónima final](2026-08-31-hubspot-brand-assets-evidence.json): URL normal, sin interceptar requests,
  tres anchos, seis selecciones por ancho, teclado, ANAM, sin overflow ni pageErrors PASS.
- SEO: title/description, redirects, canonical, sitemap y grafo Yoast/Service PASS.
- Timeline previo: 30 estados, teclado, reduced motion, no-JS y partner de dos columnas PASS en producción.
- Gates: sintaxis Node/PHP, git diff --check, qa:gates y docs:closure-check PASS; dos avisos documentales
  globales por WIP previo ajeno, sin nuevos contratos generales ni nuevas skills.

## Rollback

Restaurar sólo los archivos del tar, retirar los seis SVG listados como nuevos en created-paths.json y restaurar
la nota f023_descripcion desde el snapshot mediante Document::save, conservando featured image y settings.
Antes de actuar, verificar hash posterior y ausencia de nuevas ediciones del operador. Nunca restaurar globalmente
la base de datos ni sobrescribir elementos ajenos. Purgar Elementor/Kinsta y repetir QA anónima.
