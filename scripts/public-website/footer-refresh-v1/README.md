# Footer nativo — Explora Efeonce + partners

Aplicación autorizada el 14/10/2026, con corrección explícita del operador: nueve logotipos de las firmas corporativas en escala de grises. No usar los dos badges de colores de la propuesta descartada.

## Fuentes y alcance

- Navegación nativa `widget_block[45]`: Servicios `/#servicios`, Cómo trabajamos `/#metodo`, Casos de éxito `/portafolio/`, Blog `/blog/`.
- Partners `widget_block[34]`, `ohio-sidebar-footer-4`: HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI, BytePlus. Se retira de la asignación `block-14` (título vacío), sin borrar su instancia.
- Recursos PNG monocromos aprobados de la firma v3.1; originales recuperados con `ai-gen:where`/`ai-gen:pull`, hashes verificados contra `ai-generations/2026-09-26_firma-partners/artifacts.remote.json`. Copias sin cambios, identificadas por SHA256 en `payload.json`; el CSS aplica `grayscale(1)`. No se inventan tiers ni insignias de programa. La autorización actual reutiliza el conjunto de la firma; no resuelve los readbacks contractuales pendientes del registro maestro.
- HTML corporativo fuente: `ai-generations/2026-09-29_avatares-equipo/firmas/entregables/firma-julio-reyes/firma-fondo-navy.html`.
- Plantilla Ohio conservada; CSS acotado al marcador `data-eo-footer-partners="v1"`. Tres columnas y fila de partners; nueve logos en escritorio, cinco en tablet y tres en móvil. Sin carrusel ni color al hover.
- Se protegen home/Elementor, plantilla, todos los widgets hermanos, newsletter, Careers y pie legal. No altera seguimiento/consentimiento ni Think.

## Operación

Correr primero `pnpm public-website:ssh-check`. El wrapper `pnpm public-website:wpcli -- --eval-file scripts/public-website/footer-refresh-v1/widgets.php --wp-user 12` acepta `--input-file payload.json` y luego los nueve PNG **en el orden de `assets`**. Usar rutas completas desde este directorio en cada argumento; no ejecutar sin los inputs.

`apply` es de una sola aplicación, con guardas del sitio y hashes iniciales, deduplicación de Media Library por checksum y copia durable en la opción **no autoload** `eo_footer_refresh_20261014_v1`. `readback` requiere sólo JSON con `mode: "readback"`. `rollback` requiere `mode: "rollback"`: revierte sólo las dos instancias y asignación de sidebar4, con guardas contra cambios posteriores. Conserva medios y hermanos. El snapshot incluye estado previo y esperado; un error tras escritura requiere readback y resolución de la etapa pendiente antes de reintentar.

Después de aplicar/revertir, ejecutar `cache.php` por el mismo wrapper y verificar URLs normales en Home + landing de servicio a 1440/390. La fuente activa es WordPress; un commit de este paquete no publica ni revierte el footer. Ediciones futuras requieren redescubrir los hashes; no reciclar las guardas iniciales.
