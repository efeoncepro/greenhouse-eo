# Footer público — composición integral V2

**Publicado y verificado el 14/10/2026**, por mandato «A ver hazlo todo». El operador rechaza repetir «Efeonce» junto al logo; título final **Explora**. Sustituye la [primera versión](2026-10-14-footer-explore-partners.md), conservando su historial.

## Dirección y resultado

Cuatro columnas alineadas: marca/dirección/redes · Explora · Newsletter · Trabaja con nosotros. Ancho máximo controlado en pantallas amplias, Bricolage/Poppins y espacios compactos. A 1440 px, altura del footer **851 → 531 px** (−38%); en móvil marca y navegación comparten fila, newsletter y empleo van después. Partners mantienen los nueve logotipos de las firmas, monocromos; Salesforce aumenta de 41 a 58 px de ancho visual. La fila de partners y el cierre legal ya no tienen una fila vacía de scroll independiente.

Newsletter conserva CF7 **242255**, campos obligatorios `your-email` y `checkbox-101`, texto/valor de consentimiento y configuración de entrega. Cambia sólo presentación: etiqueta accesible, autocomplete, botón «Suscribirme» y layout. Los overrides acotados resuelven el transform/padding/hover heredado de Ohio/Home sin editar la landing. No se acredita entrega ni activación del newsletter: esa integración mantiene su trabajo separado.

Empleo conserva un único enlace Careers externo seguro, ahora en su propia columna con CTA de texto. Instagram corrige `instagram.com.com`; Spotify `#` se retira al no existir destino. Redes visibles con nombres accesibles y `noopener noreferrer`. Redes verticales y selector de color de `.elements-bar` se ocultan y quedan `inert` mientras el footer intersecta el viewport; recuperan estado al salir. No se elimina la copia de redes del menú. «Volver arriba» funciona con scroll suave/reduced motion.

Copyright simplificado y español en el pie. Se conserva privacidad HTTP200 y un único botón nativo de preferencias HubSpot. **Incidencia heredada:** `/terminos-y-condiciones` devuelve404; discovery sólo encontró Política de Privacidad, ID3, como página legal publicada. Se retiró el enlace roto con guarda de snapshot; no se creó ni inventó texto legal. Una futura página de términos necesita contenido aprobado antes de reincorporar su enlace.

## Publicación, guardas y reversión

[Paquete operativo](../../../scripts/public-website/footer-refinement-v2/README.md): CSS/JS, payload, writer nativo y corrección del enlace legal. WordPress sigue siendo fuente activa: sidebar1 marca, sidebar2 `block-45`, sidebar3 sólo newsletter, sidebar4 `block-31` + `block-34`. `block-32` se conserva almacenado, sin asignación. Snapshot durable no autoload **`eo_footer_refinement_20261014_v2`**, con before/after de opciones y CF7. Sin deploy del checkout runtime, sin editar Home/Elementor o plantilla. No cambia Think ni permisos de tracking. Adapter local de presentación: SoT, plataforma UI y APIs no cambian; no requiere ADR nuevo.

[Readback CMS final](2026-10-14-footer-composition-v2-cms.json): todos los checks PASS, formulario completo esperado, propiedades de entrega idénticas, opciones completas/siblings y Home/plantilla protegidas. Snapshot inicial se actualizó sólo en su estado esperado tras retirar términos, preservando el before original. `mode=rollback` restaura las instancias/asignaciones propias tras verificar guardas, preservando otras claves; CF7 requiere hash completo sin deriva. Luego purgar cachés y repetir QA. `readback` se usa antes de cualquier recuperación de escritura parcial.

PHP syntax y ESLint PASS. CSS fuente incluido exactamente en payload; JS fuente formateado después, equivalente al JS publicado salvo líneas en blanco, verificado. `wp cache flush`/Kinsta purge PASS. La primera carga normal aún tenía caché anterior; recargas y seis pruebas finales de URLs normales ya sirvieron V2. No se repitió el apply por caché.

## Evidencia y límites

[QA de navegador](2026-10-14-footer-composition-v2-browser.json): Home/HubSpot landing × 1440/390, más Home1920 y768. Los seis casos sin overflow, nueve imágenes cargadas en gris, una suscripción, un Careers, un control de cookies y chrome flotante oculto/inert. Capturas finales [desktop](2026-10-14-footer-composition-v2/desktop.png) y [móvil](2026-10-14-footer-composition-v2/mobile.png), también revisadas visualmente tablet y pantalla amplia. Sin inyección de preview en la prueba final. Playwright focal se usa por inspección de render CMS/CF7, payload de assets e interacción con HubSpot; el helper GVC no representa este flujo WordPress. Originales en `.captures/footer-refinement-2026-10-14/`.

Teclado email→Suscribirme con foco teal2px; top alcanza scroll0 y recupera chrome sin inert. Preferencias abre el diálogo nativo; QA elige «Solo esenciales». Axe sobre footer: **0 violaciones, 30 checks PASS**; único incomplete de contraste corresponde a flecha decorativa `aria-hidden`, verificada manualmente (~10,16:1 para el tono heredado). La primera búsqueda por texto de Rechazar no coincidió con aria-label «Solo esenciales»; se corrigió el locator, sin fallo del producto. Privacidad/portafolio/blog200; términos404 retirado. No submissions, reservas, contactos o pruebas nuevas de recepción Meta/GA4. Sin build pesado.

## Compatibilidad del bootstrap — 2026-10-18

Site Quality Monitoring abrió una incidencia porque su motor no acepta `:has()` dentro de
`document.querySelector`, aunque el selector funciona en navegadores modernos. El bootstrap era válido pero
innecesariamente frágil. Se reemplazó sólo esa expresión por selección del marcador
`[data-eo-footer-partners="v2"]` seguida de `closest('#colophon')`; el CSS conserva `:has()` y no cambió ninguna
regla visual.

La escritura se limitó a `widget_block[34]` con guarda sobre el bloque completo, comparación de delta exacto y
snapshot no-autoload `eo_footer_compat_20261018` con before/after y rollback. El primer intento fue detenido antes
de escribir porque la guarda comparaba el hash del registro contra el contenido; corregida la granularidad, el
apply y el readback quedaron PASS. Se purgaron cache WordPress y Kinsta. Las respuestas sin caché de Home y de la
landing HubSpot sirven el selector nuevo.

QA Playwright focal —porque el flujo es WordPress/Ohio y no una ruta Greenhouse representable por GVC— sobre Home
y `/servicios-contratar-hubspot/` en 1440×1100 y 390×844: `data-eo-footer-ready=true`, cero overflow horizontal,
nueve logos, un enlace Careers, newsletter intacta y cero errores de consola. Capturas:
[`Home desktop`](../../../.captures/footer-compat-20261018/home-desktop-1440.png),
[`Home móvil`](../../../.captures/footer-compat-20261018/home-mobile-390.png),
[`HubSpot desktop`](../../../.captures/footer-compat-20261018/hubspot-desktop-1440.png) y
[`HubSpot móvil`](../../../.captures/footer-compat-20261018/hubspot-mobile-390.png). La composición y estética
coinciden con la V2 aprobada; no hubo envío de formulario, cambios de tracking ni modificación de contenido.
