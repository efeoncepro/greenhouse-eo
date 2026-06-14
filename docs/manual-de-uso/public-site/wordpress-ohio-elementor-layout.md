# Operar Layout Ohio + Elementor en el Public Site

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Ultima actualizacion:** 2026-06-14 por Codex
> **Modulo:** Public Site
> **Sitio:** `https://efeoncepro.com`
> **Pagina de referencia:** `/blog` (`page_id=18456`)
> **Documentacion relacionada:** [Public Site WordPress — Layout Ohio + Elementor](../../documentation/public-site/wordpress-ohio-elementor-layout.md)

## Para que sirve

Este runbook explica como diagnosticar, corregir y revertir problemas de contenedor/ancho en el sitio publico Efeonce cuando Ohio y Elementor dejan lineas laterales, desfases o regresiones en el sidebar fijo.

## Antes de empezar

Necesitas acceso SSH al sitio Kinsta y WP-CLI. El patron validado localmente es:

```bash
gtimeout 30s ssh -i /Users/jreye/.ssh/greenhouse_efeonce_kinsta_ed25519 \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  -o ConnectTimeout=10 \
  -p 64805 efeoncegroup@161.153.204.166 \
  'cd /www/efeoncegroup_752/public && wp --info'
```

No pegues ni imprimas secretos en logs. La Application Password de WordPress debe vivir en Secret Manager o en el mecanismo seguro definido por Greenhouse; no debe quedar en comandos ni documentacion.

## Diagnostico rapido

1. Verifica que la pagina afectada use Ohio con sidebar:

```bash
wp post list --post_type=page --name=blog --fields=ID,post_title,post_name,post_status
wp post meta get 18456 page_full_width_margins_size
```

2. Inspecciona el gutter efectivo del theme en navegador:

```js
getComputedStyle(document.documentElement).getPropertyValue('--clb-grid-gutter')
```

3. Si el residuo lateral equivale a la diferencia entre `page_full_width_margins_size` y `--clb-grid-gutter`, corrige el meta de pagina en vez de mover footer/sidebar global.

## Fix aplicado el 2026-06-14

Para `/blog`, el gutter efectivo era `16px` y el meta estaba en `20px`. Se corrigio asi:

```bash
wp post meta update 18456 page_full_width_margins_size 16px
wp cache flush
```

Luego se agrego un override page-scoped en:

```text
wp-content/themes/ohio-child/assets/css/global-fixes.css
```

El override protege el sidebar fijo cuando Ohio agrega `.light-typo` sobre secciones oscuras:

```css
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .hamburger,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .hamburger-outer,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .icon-button:not(.-overlay-button):not(.-small) {
  color: #161519 !important;
}

body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .hamburger.icon-button {
  background-color: rgba(136, 135, 137, 0.08) !important;
  color: #161519 !important;
}

body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding:not(.text-logo) .logo {
  opacity: 1 !important;
}

body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding:not(.text-logo) .logo-dynamic .light,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding:not(.text-logo) .logo-dynamic .dark {
  opacity: 0 !important;
}
```

## Verificacion esperada

En `/blog`:

- El pre-footer y footer deben empezar alineados con el canvas principal, sin linea residual entre sidebar y contenido.
- El menu hamburguesa debe verse como en la parte superior de la pagina: icono oscuro sobre circulo claro.
- El logo vertical de Efeonce debe mantenerse azul/oscuro sobre el rail blanco.
- Al llegar al pre-footer/footer oscuro, el sidebar no debe cambiar a blanco ni perder contraste.

Cuando uses navegador automatizado, valida tambien el caso forzando `.light-typo`:

```js
document
  .querySelector('#masthead.header-sidebar .header-dynamic-typo')
  ?.classList.add('light-typo')
```

Valores esperados:

- hamburger `color`: `rgb(22, 21, 25)`;
- hamburger `background-color`: `rgba(136, 135, 137, 0.08)`;
- logo base `opacity`: `1`;
- logo dinamico `.light` / `.dark` `opacity`: `0`.

## Rollback

Para volver el meta de `/blog` al valor anterior:

```bash
wp post meta update 18456 page_full_width_margins_size 20px
wp cache flush
```

Para revertir el CSS al backup previo:

```bash
cp wp-content/themes/ohio-child/assets/css/global-fixes.css.bak-20260614020413-before-blog-sidebar-header-fix \
  wp-content/themes/ohio-child/assets/css/global-fixes.css
wp cache flush
```

Backups disponibles en el runtime:

```text
wp-content/themes/ohio-child/assets/css/blog-page-meta-backup-20260614015717.txt
wp-content/themes/ohio-child/assets/css/global-fixes.css.bak-20260614020413-before-blog-sidebar-header-fix
```

## Que no hacer

- No cambiar `#masthead` globalmente para resolver una pagina.
- No tocar el theme parent `ohio`.
- No corregir una linea lateral agregando fondos absolutos que cubran el rail.
- No mezclar fixes del home/hero con fixes del blog.
- No hacer publish/draft/deploy de landings desde Greenhouse hasta que EPIC-019 tenga flujo formal de preview, audit, cache y rollback.

## Problemas comunes

Si la linea lateral vuelve a aparecer, compara primero el meta `page_full_width_margins_size` con `--clb-grid-gutter`.

Si el logo o hamburguesa cambian de color solo sobre secciones oscuras, revisa si Ohio agrego `.light-typo` y confirma que el override page-scoped siga cargando despues del CSS del theme.

Si el cambio no se ve, limpia cache con WP-CLI y Kinsta segun corresponda; no repitas el mismo cambio con selectores mas globales.
