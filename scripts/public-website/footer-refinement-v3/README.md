# Footer completo V3 — 31/10/2026

El operador eligió en el canvas de Contacto (página «Footer») la propuesta de cinco columnas: «con 5 columnas se veía
bien». Este paquete la pasa al footer global de efeoncepro.com, sobre la base del footer V2 del 14/10.

## Qué cambió

- **Fondo:** azul noche de AXIS `#000f1f`, con una línea superior y separadores `#1d3a57`. Reemplaza el carbón
  `#161519` de Ohio, que chocaba con las bandas azules con que terminan Contacto y Agenda.
- **Cinco columnas:** Marca · Explora · Contacto · Glitch · Trabaja con nosotros. A 1440 px miden 250 · 130 · 230 ·
  290 · 200. Todas empiezan su contenido a la misma altura bajo el título.
- **Marca:** logo, «Trabajamos con organizaciones en Latinoamérica y Estados Unidos.», las cinco banderas circulares
  (Chile, Colombia, México, Perú y Estados Unidos, las mismas de Contacto) y las redes.
- **Contacto (nuevo, `block-47`):** casa matriz, `hola@efeoncepro.com`, `600 914 0660` («Solo desde Chile») y
  `+1 (239) 235-2073` («Estados Unidos»), con enlaces `mailto:` y `tel:`.
- **Glitch:** el título de la columna es el logo de Glitch en negativo, el oficial de AXIS servido desde la carpeta del
  menú (`ohio-child/assets/vendor/axis/site-nav/0.7.13/brand/glitch-logo-negative.svg`; si el menú cambia de versión,
  hay que actualizar la URL en `footer-newsletter-growth-form.php`). Bajada: «El newsletter semanal de IA, marketing y
  negocios, en tu correo.». El formulario sigue siendo la píldora canónica del blog.
- **Trabaja con nosotros:** el enlace subrayado pasa a una píldora de contorno «Ver vacantes» con una esfera papel y la
  flecha ↗; abre en otra pestaña y lo anuncia a lectores de pantalla.
- **Partners:** cada logo con una altura según su peso visual (`--eo-logo-h`) y el mismo espacio entre ellos.
- **Barra legal:** «© 2026 Efeonce Group SpA. Todos los derechos reservados.» (opción ACF
  `options_global_footer_copyright_left`).

## Scripts

Primero `pnpm public-website:ssh-check`. En orden:

```bash
pnpm public-website:wpcli -- --eval-file scripts/public-website/footer-refinement-v3/apply.php --wp-user 12
pnpm public-website:wpcli -- --eval-file scripts/public-website/footer-newsletter-growth-form.php --wp-user 12
pnpm public-website:wpcli -- --eval-file scripts/public-website/footer-refinement-v3/cinco-columnas.php --wp-user 12
```

`apply.php` y `cinco-columnas.php` hacen reemplazos exactos sobre los bloques vivos: exigen el hash exportado de cada
bloque y una sola coincidencia por reemplazo; si algo no calza, no escriben nada. Ambos guardan un respaldo antes de
escribir, lo releen después y purgan la caché. Ya están aplicados: volver a correrlos falla a propósito por la guarda de
hash.

Respaldos del 31/10: `_gh_footer_v3_before_20261031_140528`, `_gh_footer_newsletter_before_20261031_140533` y
`_gh_footer_v3_cinco_before_20261031_140842`. Para revertir, restaurar `widget_block`, `sidebars_widgets` y la opción
del copyright desde el respaldo más antiguo que corresponda, y purgar la caché.

## Lo que queda abierto

- El fondo lleva `!important` en el adaptador porque `ohio-child/assets/css/global-fixes.css` fija
  `#161519 !important` en todas las páginas salvo Home. Ese archivo no tiene carril de despliegue gobernado. Cuando lo
  tenga, conviene borrar esa regla y quitar el `!important` del adaptador.
- La columna de Glitch muestra el botón «Suscríbete a Glitch» a lo ancho. La versión aprobada en el canvas lo muestra ya
  abierto como formulario, pero el componente de Growth Forms no tiene hoy esa opción: se agrega en Greenhouse y se
  publica con un release.
