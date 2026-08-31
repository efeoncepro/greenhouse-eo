# Content Marketing / Content Ops

## Estado verificado y fuentes

Verificado 2026-08-31: página `242603`, publicada e indexable en
`https://efeoncepro.com/servicio-marketing-de-contenidos/`. Trece widgets `greenhouse_content_*`;
header/footer Ohio originales. Diseño aprobado `Content Ops.zip`, hash fuente
`27187938992c412cc4119432e0e5c3ec4d20a82ab6be0d572cf2d67d36b39f6d`.

Último hash Elementor observado: `b8d379697673969a8add5ece01e0b41c12563907470555768febe8c79b14f753`;
snapshot del último ajuste `_gh_content_marketing_copy_20260831_194706`. Son evidencia fechada:
leer el documento actual antes de cualquier write. Hashes y snapshots intermedios viven en las auditorías.

Canon: `docs/architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md`.
Operación: `docs/manual-de-uso/public-site/content-marketing.md`.

- Menú primario `61`, item existente `242917`: **Soluciones → Crecimiento Multicanal → Content Marketing**.
  Se conservan destino y secuencia visible. La recuperación del orden no demuestra igualdad de todos
  los valores raw de `menu_order`; cargar `references/native-navigation.md` antes de editar navegación.
- Meta/Service: Yoast + adapter de página; imagen social attachment `251825`. Un grafo Yoast, sin
  FAQPage para esta landing. Indexabilidad técnica no acredita indexación en GSC.
- Form `efeonce-content-marketing`, surface `fhsf-efeonce-content-marketing`, copy publicado v3;
  destino `greenhouse_only`, sin nuevos envíos a HubSpot ni correo. Renderer canónico con variante
  `content_marketing`, bundle fijado `content-marketing-forms.js`, Turnstile y consentimiento del motor.
  Contrato: `.codex/skills/greenhouse-growth-forms/references/CONTENT_MARKETING_HOST_AND_RENDERER.md`.

## Contrato para siguientes iteraciones

- Editar copy y enlaces en controles de la instancia Elementor por `Document::save()`. El writer
  `scripts/public-website/update-content-marketing-copy.php` admite uno o dos módulos declarados,
  con allowlist, widget id, controles, valores previos y hash. No recompilar defaults ni repetir el
  writer de publicación inicial para cambios editoriales; conservar `sourceValue` y keys del lookup.
- Proteger SEO, thumbnail, shell, menú y módulos ajenos. Leer resultado semántico antes de reintentar:
  el save puede retirar `_thumbnail_id` o actualizar `_yoast_indexnow_last_ping`; restaurar sólo la
  imagen capturada si corresponde. El timestamp IndexNow no prueba indexación.
- El correo copiable debe usar los mismos valores editoriales que su vista y saltos de párrafo reales,
  no constantes del export. Probar contenido exacto del portapapeles y confirmación asíncrona.
- El formulario pertenece a Growth Forms: su copy se publica por versión gobernada, no mediante
  reemplazos de DOM. Preservar su nodo durante hidratación y comprobar datos al cambiar modo/paso.
- Logos WordPress, Webflow, Drupal y Modyo: assets oficiales locales con controles Media/texto y
  procedencia en `scripts/public-website/content-marketing-cms-logo-sources.json`. Demuestran capacidad
  descrita, no partnership ni una lista cerrada de CMS. Adapter `content-marketing-cms-logos.cjs`
  conserva keys y paridad SSR/cliente.
- Los dos wordmarks de modos usan CSS acotado al módulo, mantienen SVG/proporción y permiten wrap
  en cabecera de tabla. No modificar tipografía o header global para aumentar una marca.
- Ecosistema enlaza las seis landings verificadas mediante controles URL y anchors completos;
  comprobar navegación real. HTTP 200 no prueba indexabilidad. Redes Sociales quedó habilitada
  después del pase de enlaces; su antigua observación noindex es histórica.
- Equilibrar texto/formulario con copy conciso, conservando títulos, pasos y legibilidad. El último
  ajuste condensó cinco campos, sin reducir tipografía, estirar el formulario ni añadir CSS/JS.
- Conservar bloqueo temporal de scroll-sync al navegar capítulos por click y flujo completo móvil,
  reduced motion y sin JS. Neutralizar gutters Ohio sólo en contenedores propios. No ejecutar DC/React
  ni sustituir por HTML monolítico; no cambiar paleta aprobada por SEO.

## Verificación y evidencia

Verificadores mantenidos en `scripts/public-website/`: `verify-content-marketing-{landing,seo}.cjs`,
`verify-content-marketing-elementor.php` y los focales `verify-content-marketing-{cms-modes,ecosystem-faq,business-conversion}.cjs`.
Tras guardar/purgar, comprobar URL pública normal y estado efectivo si llega caché anterior; no
repetir un save correcto para resolver una primera lectura stale (`references/elementor-mutation.md`).

Auditorías en `docs/audits/public-site/`:

- `2026-08-31-content-marketing-publication.md`: publicación inicial, menú, shell y límites.
- `2026-08-31-content-marketing-editorial-copy.md`: problem/system.
- `2026-08-31-content-marketing-hub-review-copy.md`: operación y revisión, incluido ajuste breve tablet.
- `2026-08-31-content-marketing-cms-modes.md`: CMS, logos oficiales y modalidades.
- `2026-08-31-content-marketing-ecosystem-faq.md`: seis destinos y FAQ.
- `2026-08-31-content-marketing-mode-logo.md`: escala de wordmarks y rollback CSS.
- `2026-08-31-content-marketing-business-conversion.md`: caso interno, clipboard, form v3 y equilibrio final.
- `2026-08-31-menu-indexability.md`: 18 destinos del menú indexables; sólo Redes Sociales requirió cambio.

Copy/clipboard/formulario y responsive verificados sin enviar leads. Contraste global, pinning en
resize a viewport corto, editor GUI edit/save/reload, smoke aceptado/GA4, GSC y CWV conservan sus
límites documentados; no convertir estos checks en certificación de esas capas.
