# Footer completo V2 — 14/10/2026

El operador autoriza «hazlo todo» sobre la propuesta de cuatro columnas, tipografía unificada, newsletter integrado, empleo independiente, partners compactos y legales en español; corrige «Explora Efeonce» por redundancia junto al logo. Título final: **Explora**.

## Implementación nativa

- Se conservan Ohio, logo, dirección, formulario CF7 **242255**, consentimiento obligatorio y nueve recursos de partners ya publicados.
- Sidebar1 marca/dirección/redes; sidebar2 `block-45` navegación; sidebar3 sólo newsletter; sidebar4 `block-31` empleo + `block-34` partners/adapter. `block-32` permanece almacenado, sin asignación.
- CSS con marcador `data-eo-footer-partners="v2"`; cuatro columnas a >1100 px, dos en tablet, marca/navegación juntas en móvil y newsletter/empleo después. Wrapper de sidebar4 usa `display:contents` para ubicar empleo y partners en el grid compartido.
- Bricolage/Poppins ya servidas por el adapter público de consentimiento; no se cambia ese plugin. Colores paper/teal/navy de AXIS. Overrides locales vencen los estilos heredados Home/Ohio del newsletter (transform del botón, padding de email y hover verde), sin tocar la página.
- CF7 conserva names `your-email`, `checkbox-101`, required y el texto/valor exacto del consentimiento. Sólo cambia markup, etiqueta accesible, autocomplete y ortografía «Suscribirme». No es activación de una nueva integración ni prueba de entrega.
- Instagram corrige `instagram.com.com`; Spotify sin destino se retira. Los cuatro enlaces restantes reciben nombres accesibles y rel seguro. Los controles flotantes de `.elements-bar` se ocultan y quedan `inert` sólo mientras el footer intersecta el viewport; el menú conserva sus redes.
- «Volver arriba» respeta reduced motion; privacidad conserva su URL y el botón nativo HubSpot de preferencias. El enlace heredado a términos devolvía 404 y no tenía página publicada: se retiró mediante `legal-link-fix.php` con guarda del snapshot; no se creó contenido legal. Padding móvil reserva espacio al CTA fijo existente.
- El bootstrap JavaScript localiza primero el marcador `data-eo-footer-partners="v2"` y luego asciende con `closest('#colophon')`; no usa `:has()` en `querySelector`, para funcionar también en motores de monitoreo sin soporte de Selectors Level 4.

## Aplicación y reversión

Primero `pnpm public-website:ssh-check`. Aplicar:

```bash
pnpm public-website:wpcli -- --eval-file scripts/public-website/footer-refinement-v2/widgets.php --wp-user 12 --input-file scripts/public-website/footer-refinement-v2/payload.json
pnpm public-website:wpcli -- --eval-file scripts/public-website/footer-refresh-v1/cache.php --wp-user 12
```

Snapshot durable no autoload: `eo_footer_refinement_20261014_v2`. Writer guarda before/after de opciones y CF7; compara hashes del formulario, propiedades de entrega, Home/Elementor y plantilla. `readback` y `rollback` usan una copia de payload con ese `mode`; no modificar el payload sellado de aplicación. Rollback sólo restaura instancias/asignaciones propias con guardas y preserva claves hermanas; CF7 requiere hash completo sin deriva. Leer cualquier fallo posterior a una escritura antes de decidir cómo continuar; nunca repetir el apply inicial contra un estado parcial.

`footer.css` y `footer.js` son fuentes de revisión; `payload.json` incluye su CSS exacto y JS equivalente salvo líneas en blanco para publicar como bloque HTML nativo. Si se edita una fuente, actualizar payload y guardas tras redescubrir runtime. El commit no publica: el estado activo vive en WordPress.

## Delta 2026-10-31 — el newsletter del footer es la píldora de Glitch

El footer ya no usa CF7 **242255**. Por pedido del operador («si no es el Growth Form canónico de suscripción, el mismo
del blog, hay que corregir»), la columna `ohio-sidebar-footer-3` muestra el bloque `block-46` con la misma píldora de
Glitch del blog: formulario `efeonce-blog-subscription`, clave `6bc62588-a4a0-4214-9501-13b0c2948c81`, superficie
`fhsf-efeonce-blog-subscription`. Entrega directa a HubSpot con el tipo de suscripción `535702717`; el aviso de
privacidad es el consentimiento, sin casilla. El renderer se carga cuando el footer se acerca a la pantalla y nunca dos
veces (en Contacto y el blog ya viene cargado). El widget `ohio_widget_subscribe-2` quedó en widgets inactivos y el CF7
242255 no se tocó. Script: `scripts/public-website/footer-newsletter-growth-form.php` (volver a correrlo sólo refresca el
bloque); snapshots `_gh_footer_newsletter_before_20261031_125344` (cambio) y `…_125729` (ajuste de espaciado). Las
reglas de CF7 de este paquete quedan sin efecto.
