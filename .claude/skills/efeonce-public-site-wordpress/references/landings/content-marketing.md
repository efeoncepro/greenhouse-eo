# Content Marketing / Content Ops

Verificado 2026-08-31: página `242603`, publicada en
`https://efeoncepro.com/servicio-marketing-de-contenidos/`. Trece widgets `greenhouse_content_*`;
header/footer Ohio originales. Diseño aprobado `Content Ops.zip`, hash fuente
`27187938992c412cc4119432e0e5c3ec4d20a82ab6be0d572cf2d67d36b39f6d`.

Canon: `docs/architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md`;
QA: `docs/audits/public-site/2026-08-31-content-marketing-publication.md`.

Form `efeonce-content-marketing`, surface `fhsf-efeonce-content-marketing`, API base resuelta por el
renderer canónico, Turnstile y consentimiento del motor, destino greenhouse_only. Bundle fijado
`content-marketing-forms.js`, variante `content_marketing`. Carga/validación verificadas; no smoke aceptado/GA4.

Preservar el host del formulario durante hidratación; no reiniciar datos por selección de modo.
Los capítulos usan bloqueo temporal de scroll-sync al navegar por click. Mantener flujo completo
para móvil/reduced motion/sin JS. Neutralizar gutters Ohio sólo en los contenedores de esta página.
No reemplazar por HTML monolítico ni ejecutar DC/React. No modificar paleta aprobada por SEO.

Meta/Service vive en Yoast + adapter de página. Imagen social attachment `251825`.
Hash Elementor `dd6275695aa878020d6471c91ab121ed36b175b16c417ccd3732797d8c86f020`;
snapshot `_gh_content_marketing_before_20260831_121810`. Revalidar antes de cualquier write.

Menú primario `61`: item `242917`, **Soluciones → Crecimiento Multicanal → Content Marketing**, misma URL y posición; verificado 2026-08-31.
Snapshot de menú `_gh_content_marketing_menu_20260831_122837`; se reutilizó el item existente.
El readback acredita secuencia visible restaurada y cambio de etiqueta, no igualdad de todos los valores
raw de `menu_order`: cargar `references/native-navigation.md` antes de la siguiente mutación de menú.

Verificadores mantenidos: `scripts/public-website/verify-content-marketing-{landing,seo}.cjs` y
`scripts/public-website/verify-content-marketing-elementor.php`. El writer de publicación inicial conserva
la guarda del documento anterior: no repetirlo sobre esta landing. Si un check falla tras escribir,
leer estado efectivo y completar sólo las etapas faltantes (`references/elementor-mutation.md`).
