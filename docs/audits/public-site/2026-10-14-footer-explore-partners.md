# Footer público — Explora Efeonce y partners monocromos

**Estado: publicado y verificado el 14/10/2026.** El operador aprobó «Explora Efeonce» y publicar la franja de partners. Luego rechazó la propuesta de dos badges de colores: pidió escala de grises y tomar las firmas corporativas como referencia. La variante de dos badges nunca se publicó.

## Resultado y autoridad

`efeoncepro.com` conserva el footer nativo de Ohio/WordPress. `widget_block[45]` reemplaza los cuatro enlaces de demo por Servicios, Cómo trabajamos, Casos de éxito y Blog. Los dos primeros apuntan a anchors de Home con URL absoluta, para funcionar también desde landings. `widget_block[34]` contiene una fila común debajo de las tres columnas; `block-14` (título vacío) se retira sólo de sidebar4.

Nueve logotipos del conjunto aprobado en las firmas v3.1: HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus. Se recuperaron los PNG monocromos existentes mediante `ai-gen:where`/`ai-gen:pull`, verificando los 18 originales del directorio contra el inventario archivado; nueve copias sin cambios van a Media Library. CSS `grayscale(1)` elimina el tinte azul de la firma. Mantienen el peso óptico relativo; escritorio muestra nueve, tablet cinco y móvil tres columnas. No hay tarjetas, carrusel ni retorno al color al hover.

Esta reutilización fue pedida por el operador. No cambia los estados contractuales/tier pendientes del [registro maestro](../../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md), ni inventa designaciones de programas. Fuente de firma: `ai-generations/2026-09-29_avatares-equipo/firmas/entregables/firma-julio-reyes/firma-fondo-navy.html`. No se altera la firma de correo ni el paquete AXIS. Es un adapter de presentación del consumidor; no cambia SoT, schema, API, tracking o plataforma UI, por lo que no requiere ADR nuevo.

## Aplicación y reversión

Paquete operativo: [README](../../../scripts/public-website/footer-refresh-v1/README.md), [payload y hashes](../../../scripts/public-website/footer-refresh-v1/payload.json), writer `widgets.php` y purga `cache.php`. SSH preflight PASS; `update_option` nativo, sin SQL serializado ni escritura de Elementor. Snapshot durable **`eo_footer_refresh_20261014_v1`**, `autoload=false`. Recursos WP **251950–251958**. [Readback CMS](2026-10-14-footer-explore-partners-cms.json): todos los checks PASS, incluidas instancias hermanas, newsletter, Careers, home/Elementor y plantilla. `wp cache flush` y `wp kinsta cache purge --all` PASS; la primera carga fue anterior a la propagación, la recarga normal posterior ya mostró el cambio. No se repitió el writer.

Rollback: enviar el mismo JSON con `mode=rollback` al writer; restaura sólo dos instancias y sidebar4, protegido contra ediciones posteriores. Luego purgar y repetir QA. Los medios se conservan. No se desplegó el checkout runtime ni WIP ajeno. No se tocó Think.

## Verificación

[Readback navegador](2026-10-14-footer-explore-partners-browser.json): cuatro navegaciones nuevas, URLs normales de Home y `/servicios-contratar-hubspot/` × **1440/390**. Sin HTML/CSS inyectado en la prueba final. Nueve imágenes cargadas, filtro gris calculado; cuatro enlaces propios, cero enlaces demo, un formulario newsletter, un Careers con `target=_blank`/`noopener noreferrer`, un acceso legal «Preferencias de cookies». Footer `scrollWidth === clientWidth` en los cuatro casos. Destinos `/portafolio/`, `/blog/` y Home HTTP200; anchors `servicios`/`metodo` presentes. Tab de Servicios a Cómo trabajamos con foco visible teal 2px/offset6; nav/section con headings accesibles, nueve alt con nombres.

Capturas finales: [escritorio](2026-10-14-footer-explore-partners/desktop.png) y [móvil](2026-10-14-footer-explore-partners/mobile.png). Se revisaron visualmente también ambas capturas de la landing. Playwright focal se usó para inspección de DOM, widgets CMS, imagen decodificada, transporte de assets y comparación de preview inyectado versus navegación pública; el helper GVC está orientado a targets Greenhouse y no representa este flujo WordPress. Artefactos originales en `.captures/footer-refresh-2026-10-14/`.

Validación proporcional: PHP syntax PASS, hashes CMS/recursos y QA pública. Sin build pesado, sin formularios enviados, sin leads/reservas sintéticos y sin nueva prueba de entrega Meta/GA4. Deuda previa fuera de alcance: URL Instagram duplicada, Spotify `#`, etiquetas accesibles de redes y copy newsletter/legal mixto.
