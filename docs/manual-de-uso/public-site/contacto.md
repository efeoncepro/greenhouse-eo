# Operar y revisar la landing Contacto

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 2.0
> **Creado:** 2026-09-15 (commit «document approved Contacto landing»)
> **Ultima actualizacion:** 2026-10-31 por Claude
> **Documentacion tecnica:** [Contrato técnico de la landing Contacto](../../architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md)
> **Documentacion funcional:** [Contacto](../../documentation/public-site/contacto.md)

## Antes de tocarla

- Lee el [contrato técnico](../../architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md), el [brief](../../public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md)
  y la referencia de Contacto de la skill WordPress.
- Comprueba `git status --short`; el checkout es compartido.
- Para una mutación WordPress identifica primero page ID/hash, toma snapshot y usa `Document::save`; nunca edites
  `_elementor_data` directamente.

## Revisión visual mínima

Comprueba `/contacto/` en 1440, 1280, 890 y 390 px. Revisa hero, formulario, rama Careers, agenda, datos
institucionales, FAQ y footer. Con el selector abierto verifica que `scrollWidth === clientWidth`, que el
chevron cerrado mire abajo y que al abrir gire 180° hacia arriba. Recorre el formulario sólo con teclado y
comprueba foco visible, etiquetas, consentimiento y restauración del foco al cerrar la agenda.

Usa los verificadores existentes cuando correspondan:

```bash
pnpm public-website:runtime-status
node scripts/public-website/verify-contacto-seo.cjs
pnpm docs:closure-check
```

El verificador responsive y el selector de país pueden describir un candidato local; no los marques como
publicados sin readback del runtime, purge y evidencia GVC.

## Cambios seguros

- Copy, iconos y layout deben permanecer page-scoped; no corrijas un incidente local alterando header/footer
  globales de Ohio.
- Mantén `hola@efeoncepro.com` y la línea `600 914 0660` diferenciada como teléfono exclusivo de Chile.
- Careers debe seguir siendo un desvío: no agregues campos de candidatura ni envío de CV al formulario.
- Lo que la versión 2 publica fue confirmado por el operador el 2026-10-31: WhatsApp del móvil, enlace «Cómo llegar»
  a Maps y «Te respondemos en un día hábil». No agregues horarios, otro plazo, `LocalBusiness` ni destinos de CRM
  sin owner y evidencia.
- Todo botón o enlace propio lleva la clase `-undash`; sin ella, el hover de Ohio lo pinta blanco sobre blanco.
- Ninguna sección sube de `z-index: 3`: las barras laterales de Ohio («Follow Us», Dark/Light) están en 4.
- Insignia HubSpot: se elige por contraste con la superficie, nunca la crema sobre fondo claro. Usa la tabla de
  `public/branding/partners/hubspot/solution-partner/README.md` o `getHubSpotSolutionPartnerBadgeForSurface()`.
- Después de un cambio, actualiza primero el documento canónico, luego esta guía y la referencia espejada de la
  skill; ejecuta closure-check y el context gate al final si tocaste Handoff/changelog.

## Rollback y escalamiento

Para un cambio Elementor, restaura el snapshot gobernado y purga la caché Kinsta. Para un cambio Growth Forms o
Meetings, revierte la versión/binding mediante sus comandos canónicos; no borres submissions. Si el runtime no
coincide con el repo, registra `code complete, rollout pendiente` y escala al owner de Public Site/Growth Forms.

## Release aplicado del selector de países

El release quedó aplicado el 2026-09-15. La versión activa es `fver-c00955ca-863a-4e7d-99c7-c09706660a3a` (v3).
El readback público confirma 250 países y el navegador confirma el combo `ghf-1-country`.

El override page-scoped `ghf-country-icon-ohio-override-v1` se probó y se revirtió el 2026-09-16: no atraviesa el
Shadow DOM del renderer y dejaba `globe` junto al SVG. Se restauró el snapshot `_gh_contacto_before_country_icon_override`;
no queda parche live para ese problema. Después del release se detectó una duplicación distinta entre el pin azul
del host y el globo SVG del renderer; se corrigió sin release con CSS page-scoped `ghf-country-icon-dedup-v1`,
ocultando solo el globo en `/contacto/`. El hotfix del renderer es `d15bb9256` (sobre `e5d4a0fb2`); la v3 sigue activa.

Para una futura modificación, repite el precheck de renderer/banderas, toma snapshot, ejecuta el comando gobernado
con `--apply`, verifica el readback y revisa desktop/390 px, teclado, giro del chevron y ausencia de overflow.

No edites directamente la versión publicada ni borres la versión anterior: el rollback debe hacerse mediante los
comandos canónicos de Growth Forms.

## Release aplicado del copy de cobertura y la banda de reuniones (2026-09-16)

Se ejecutó por el carril SSH/WP-CLI sobre la página `20729`, sin token de Kinsta. Tres pasos, en este orden:

```bash
# 1. Exporta el código que está vivo hoy. Ése es el baseline del release.
pnpm public-website:export-live-code

# 2. Arma el paquete acotado contra ese baseline.
node scripts/public-website/build-contacto-elementor-package.cjs <baseline>

# 3. Instálalo. Responde {"status":"scoped_package_installed","files":9}.
pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-contacto-elementor-package.php \
  --input-file tmp/contacto-elementor-release/package.zip \
  --input-file tmp/contacto-elementor-release/manifest.json --wp-user 12
```

No saltees el paso 1. El manifest guarda el hash del archivo vivo (`previousSha256`) y el instalador aborta si
alguien lo tocó entre el export y el deploy.

Antes de instalar, mira el diff contra el baseline: el paquete arrastra todo lo que esté en el repo y no esté
vivo, no sólo lo que quieres cambiar. En este release, el CSS tuvo 488 líneas cambiadas y sólo 12 eran del cambio
pedido; el resto eran iteraciones del día anterior que tampoco estaban desplegadas. Declara en el cierre la
superficie que efectivamente saliste a publicar.

### Cómo verificar

No hace falta purgar caché: el plugin versiona el CSS por `filemtime` y el `?ver=` sube solo (acá pasó de
`1789484153` a `1789560441`). **Pide siempre la URL versionada que aparece en el HTML, no la URL desnuda del
CSS** — sin query string sigue respondiendo una variante cacheada vieja y vas a concluir que el deploy no salió.
Ese matiz hace perder tiempo si no lo tienes presente.

Sobre el HTML vivo puedes correr `scripts/public-website/verify-contacto-responsive-composition.ts`, y después
revisa a ojo 390 px y 1440 px: titular de la banda en dos líneas en teléfono y en una en desktop, curva
decorativa por debajo del botón, CTA en la misma fila en desktop y `scrollWidth === clientWidth`.

### Rollback

El deploy deja un backup en el servidor antes de escribir; el de este release es
`/tmp/eo-contacto-widgets-before-20260916-120717.tar`. Para revertir, restaura ese tar sobre el directorio del
plugin por el mismo carril SSH: al reescribir los archivos el `filemtime` sube y el `?ver=` cambia solo, así que
tampoco necesitas purga. No edites los archivos vivos a mano; si el cambio es nuevo, vuelve a exportar el
baseline y arma otro paquete.

## Release aplicado: Contacto v2 «La órbita» (2026-10-31)

El mismo carril de tres pasos (export vivo → paquete → instalador), repetido en cada ajuste del día, más dos
scripts gobernados con snapshot y readback:

- `scripts/public-website/reorder-contacto-closing.php` mueve la banda de reuniones al final como cierre
  (snapshot `_gh_contacto_before_v2_20261031_114459`).
- `scripts/public-website/fix-footer-headquarters-address.php` cambia la dirección del footer global de Las
  Bellotas a la casa matriz (bloque `block-17` de `ohio-sidebar-footer-1`; snapshot
  `_gh_footer_address_before_20261031_121306`). Sólo escribe si el bloque tiene exactamente el texto antiguo.

### Antes de armar el paquete: el JS compartido

`contact-landing.js` en el runtime local tiene un cambio de otra sesión (ícono del país) que no está publicado. Si
lo empaquetas, sale a producción sin revisión. Antes del paso 2 copia al runtime el JS del baseline vivo; después
del paquete devuelve la copia local. Si cambias el JS tú, aplica tu cambio sobre el baseline vivo, no sobre la
copia local.

### Recursos nuevos

El instalador sólo acepta rutas de su allowlist. Un recurso nuevo exige agregarlo a
`build-contacto-elementor-package.cjs` y a la expresión regular de `deploy-contacto-elementor-package.php`.

### Cómo verificar

En 1440 y 390 px: orden de secciones (portada, formulario, contacto directo, preguntas, cierre), overflow 0,
formulario cargado con Poppins, la agenda abre desde la portada, la tarjeta y el cierre sin marco extra, banderas
circulares, insignia HubSpot oscura de 72 px junto a Salesforce de 44 px de alto, y en el teléfono el texto de
partners en su propia línea con las dos insignias juntas debajo. En el footer: «Casa matriz · Dr. Manuel Barros
Borgoño 71, oficina 1105». No envíes el formulario ni reserves para verificar.

### Rollback

Cada instalación dejó su tar en `/tmp/eo-contacto-widgets-before-20261031-*.tar` del servidor; el último es
`…-121845.tar`. El orden de secciones vuelve con el snapshot `_gh_contacto_before_v2_20261031_114459` y la
dirección del footer con `_gh_footer_address_before_20261031_121306`; las demás copias de la dirección (opción ACF,
WooCommerce, `block-15`, `/agendar/` y dos páginas más) con `_gh_legacy_address_before_20261031_124200`. Purga la caché Kinsta después.

Si reaparece una línea blanca bajo el footer, revisa que el lienzo (`html`) siga con el color del footer: la página mide
una altura fraccional y el documento la redondea hacia arriba.
