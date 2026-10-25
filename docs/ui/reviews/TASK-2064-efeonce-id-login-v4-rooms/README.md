# TASK-2064 — Revisión local del login V4 de Efeonce ID

Revisado 2026-10-25 sobre los renderers reales en `http://127.0.0.1:19064`, anónimos y con DTOs ficticios. Se acepta el primer pliegue local como port de la dirección V4 elegida por Julio. No acredita despliegue, autenticación real ni aceptación de una release.

## Resultado y evidencia

- [Rooms desktop](rooms-desktop.png), [Rooms móvil](rooms-mobile.png), [neutral desktop](neutral-desktop.png), [editorial móvil](editorial-mobile.png), [banner móvil](banner-mobile.png), [email inválido](invalid-email-mobile.png).
- [Scorecard](scorecard.json): 4,5/5 para el alcance local indicado; límites expresos.
- GVC premium `.captures/2026-10-25T21-37-57_auth-login-v4-issuer`: 4 tamaños (1440×960,1280×800,390×844,320×740),28 frames, todos exit0 y enterprise pass.
- GVC premium `.captures/2026-10-25T21-37-58_auth-login-v4-issuer-announcements`: desktop/móvil,14 frames, todos exit0 y enterprise pass; elección text/banner, foco y reduced motion. Los textos son fixtures, no novedades publicadas.
- Cero errores console/page/CSP/HTTP/overflow en ambas corridas. La exclusión del guard de overflow sólo cubre el `g[clip-path]` y la imagen ampliada dentro de la lente: sus bounding boxes exceden la máscara por definición; el SVG exterior y el scroll de página siguen bajo prueba. Aviso `full_page_without_scroll` sólo donde todo cabe.
- [Contraste de píxeles](pixel-contrast.json):55 rangos,0 bajo piso; título fotográfico mínimo4.12:1 (piso3), CTA móvil4.74:1 (piso4.5). Se ocultan glifos en página diagnóstica aislada, se captura el fondo intacto y se escanea una rejilla4px en cada línea de texto; se informa el mínimo, no el promedio. No valida futuras combinaciones editoriales.
- [Contratos browser](browser-contracts.json):8 comprobaciones con/sin JS, preferencia dark/reduce, login neutral/Rooms, HTTP400 email inválido y consentimiento. POST correo real conservado; sin JS no aparece passkey inoperante; foco/error asociado; fonts web cargadas; sin requests externos ni comandos auth.
-116 tests UI/contratos/drift verdes; ESLint focal sin errores. Typecheck global limpio en la pasada compartida. `ui:code-lint --changed` PASS.

## Correcciones que salieron de mirar

Se corrigieron icono superpuesto al placeholder, radio del anillo interpretado como factor absoluto, escala responsive de la lente y contraste secundario4.37:1. La entrada del formulario ya no baja opacidad: al cambiar la preferencia reduced-motion, el fade reiniciaba y volvía ilegible una captura. En móvil, el cuerpo editorial se retira y el bloque baja igual que el V4 fuente para no invadir la camisa clara. El texto fotográfico usa blanco AXIS, no papel. El bundle de interacción resuelve cuatro escalares AXIS en build;22KB y guard40KB, sin entregar el catálogo entero al browser.

## Fronteras y pendientes

El contexto de producto es DTO resuelto por el registro RP servidor; UI escapa nombre y sólo presenta retorno HTTPS sin credenciales. No acepta branding desde query. Microsoft sólo existe si el backend lo habilita; WebAuthn sólo si el dispositivo lo soporta; correo conserva endpoint y campos. Sesión/permisos pertenecen a TASK-1834 y consumer Rooms.

El issuer no importa el reader de novedades ni la DB del portal. Sin un feed público acotado entrega la foto oficial sin titulares. El adapter admite text/banner y sólo imágenes locales revisadas; no promete cualquier URL remota. Vincular novedades reales requiere contrato de fuente, timeout/fallback y QA de contraste por contenido. La transición de acceso cross-origin y la animación editorial completa de Greenhouse no se simulan. Consentimiento, errores y step-up conservan el shell existente y regresiones. No hubo commit, deploy ni cambio de secretos.
