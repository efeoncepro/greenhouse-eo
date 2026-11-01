# Operar el footer global del sitio

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-31 por Claude
> **Ultima actualizacion:** 2026-10-31 por Claude
> **Documentacion tecnica:** [Footer global del sitio público V1](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md)
> **Documentacion funcional:** [Footer global del sitio](../../documentation/public-site/footer-global-del-sitio.md)

## Para qué sirve

Para cambiar con seguridad el pie de página de [efeoncepro.com](https://efeoncepro.com) (footer V3, cinco columnas, en
producción desde el 2026-10-31): un dato de contacto, el formulario de Glitch, colores y hovers, o volver a un estado
anterior. Todo se hace con scripts WP-CLI con guardas, nunca a mano en wp-admin.

## Antes de empezar

- **Acceso SSH.** Corre primero:

  ```bash
  pnpm public-website:ssh-check
  ```

  Si falla, no sigas.
- **Autorización.** Toda escritura en producción necesita el visto bueno del operador antes de correrla. Leer no
  necesita permiso.
- **Mapa.** Ten a mano el mapa de bloques: `block-17` (marca y banderas), `block-45` (Explora), `block-46` (Glitch),
  `block-47` (Contacto), `block-31` (Trabaja con nosotros), `block-34` (adaptador: todo el CSS/JS del footer y los
  partners). Copyright en la opción ACF `options_global_footer_copyright_left`. Ver
  [arquitectura §Mapa de bloques](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#mapa-de-bloques-y-sidebars).
- **Checkout compartido.** Corre `git status --short` antes de editar scripts: otras sesiones trabajan en el mismo repo.

Todos los scripts se corren así:

```bash
pnpm public-website:wpcli -- --eval-file <script> --wp-user 12
```

## Paso a paso

### Leer el estado actual

Antes de escribir un script nuevo, exporta el contenido vivo del bloque que vas a tocar y calcula su hash, por ejemplo
con un `--eval-file` de solo lectura que imprima `get_option( 'widget_block' )[47]['content']` y su
`hash( 'sha256', … )`. El script de escritura debe exigir ese hash o la coincidencia exacta del texto que reemplaza.

### Cambiar un dato de contacto

1. Escribe un script nuevo en `scripts/public-website/` siguiendo el patrón de
   `footer-refinement-v3/contact-type.php`: reemplazos exactos sobre `block-47`, cada uno debe aparecer **una sola
   vez**; si no, `WP_CLI::error` y no escribe.
2. Respaldo antes de escribir: `add_option( '_gh_footer_<tema>_before_' . gmdate( 'Ymd_His' ), …, '', false )`.
3. Escribe, relee y compara; termina con `wp cache flush` y `kinsta cache purge --all`.
4. Si el dato aparece en otros lugares (ficha de contacto `eoh_site_settings_contact_address`, páginas como
   `/agendar/`), cámbialo también con su propio script con guardas. Ejemplos:
   `fix-legacy-headquarters-address-copies.php` y `fix-agendar-phone.php`.
5. Mantén `mailto:` y `tel:` coherentes con el texto visible.

### Cambiar el formulario de Glitch

- El footer usa el **Growth Form canónico** del blog (`efeonce-blog-subscription`). Si cambias algo del formulario
  (campos, texto de ejemplo, aviso), se cambia en Greenhouse publicando una versión nueva del formulario, y se ve en el
  blog y en el footer a la vez. Ejemplo: «Tu correo» salió en la versión `fver-d0ecefaa-9bf5-429a-8eb3-2abd3826b67e`
  con `scripts/growth/revise-glitch-pill-placeholder.ts`. Ver la skill `greenhouse-growth-forms`.
- Si cambias el host (logo, bajada, variables de color de la píldora, carga del renderer), edita
  `scripts/public-website/footer-newsletter-growth-form.php` y vuelve a correrlo: refresca `block-46` con un respaldo
  nuevo en cada corrida. El script se niega si el blog dejó de apuntar al mismo formulario.
- Si el menú global cambia la versión de AXIS (carpeta `site-nav/0.7.13`), actualiza la URL del logo de Glitch en ese
  mismo script y vuelve a correrlo.

### Ajustar colores o hovers

1. Edita las reglas en `footer-refinement-v3/link-colors.php` (bloque marcado `/* Footer v3 link colours (canvas). */`)
   o `legal-links.php` (barra legal).
2. Vuelve a correr el script: reemplaza su propio bloque marcado. Si las reglas no cambiaron, termina con «Already
   applied» y no escribe.
3. Usa siempre las variables del adaptador (`--eo-ft-paper`, `--eo-ft-accent`, `--eo-ft-line`, `--eo-ft-text`) y el
   prefijo `#colophon:has([data-eo-footer-partners="v2"])`. Mientras exista la regla heredada de `global-fixes.css`,
   el color de enlaces necesita `!important` para verse fuera de Home.
4. Para un cambio de grilla, fondo o partners, escribe un script nuevo con guarda de hash sobre `block-34`, como
   `apply.php` o `cinco-columnas.php`. Esos dos ya están aplicados y fallan a propósito si los corres de nuevo.

### Revertir

1. Elige el respaldo más antiguo que cubra lo que quieres deshacer (lista en
   [arquitectura §Respaldos y reversión](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#respaldos-y-reversión)).
   Por ejemplo, `_gh_footer_v3_before_20261031_140528` vuelve al footer previo a la V3 completa.
2. Escribe un script que lea esa opción y restaure `widget_block`, `sidebars_widgets` y, si el respaldo lo guarda, el
   copyright. Los respaldos de `legal-links`, `link-colors` y `contact-type` sólo guardan el bloque que tocaron
   (`block34` o `block47`).
3. Respalda el estado actual antes de restaurar, relee, `wp cache flush` + purga de Kinsta.
4. Verifica en vivo (siguiente sección).

### Verificar en vivo

En Contacto, Home, el blog y Agenda, a 1440, 900 y 375 px:

- sin desborde horizontal;
- fondo azul noche (`rgb(0,15,31)`) también fuera de Home;
- hovers en turquesa fuera de Home;
- el renderer de Growth Forms cargado una sola vez (`script[src*="renderer-latest"]` = 1);
- cinco banderas, nueve logos, barra legal sin « | »;
- «Ver vacantes» abre en otra pestaña.

## Qué significan las señales

| Señal | Significado |
| --- | --- |
| `block-N drift. Re-export before applying.` | El bloque cambió desde que se escribió el script. No fuerces: vuelve a exportar y ajusta la guarda. |
| `expected one match, found 0` | El texto a reemplazar ya no existe (ya se aplicó o alguien editó). |
| `expected one match, found 2` | El texto aparece más de una vez; haz el reemplazo más específico. |
| `Already applied.` | `link-colors.php` o `legal-links.php` ya tienen esas reglas. No es un error. |
| `block-47 already exists.` | `cinco-columnas.php` ya se aplicó. |
| `Protected Home changed.` | La escritura tocó la Home por accidente: revisa con el respaldo indicado antes de seguir. |
| `Readback failed … Snapshot: …` | Lo leído no coincide con lo escrito. Usa el respaldo que indica el mensaje; no repitas la escritura a ciegas. |
| `The blog no longer points to the expected Glitch form` | El blog cambió de formulario; reconcilia antes de tocar el footer. |
| JSON con `status` y `snapshot` | Escritura correcta. Anota el nombre del respaldo. |

## Qué no hacer

- **Nunca** editar `block-34` (ni otro bloque del footer) a mano en wp-admin: rompe las guardas de hash y no deja
  respaldo.
- **Nunca** volver a poner el formulario de Contact Form 7 (242255) ni el widget `ohio_widget_subscribe-2`: el
  newsletter es el Growth Form canónico.
- **Nunca** vestir la píldora de Glitch con el verde de Glitch en el footer: el operador lo rechazó.
- **Nunca** cambiar `ohio-child/assets/css/global-fixes.css` sin un carril de despliegue gobernado.
- **Nunca** estilar el footer desde otra pieza (una landing, Elementor, el plugin de consentimiento): el adaptador de
  `block-34` es el único dueño del cromo.
- **Nunca** tocar el interior de `<greenhouse-form>`: sólo variables del host.
- **Nunca** volver a correr `apply.php` o `cinco-columnas.php` contra un estado distinto.

## Problemas comunes

**Un hover funciona en Home pero no en otras páginas.** Es la regla heredada de `global-fixes.css`, que fija los
enlaces y párrafos del footer en blanco al 75 % con `!important` fuera de Home. La regla del adaptador necesita
`!important` (ver `link-colors.php`).

**El fondo se ve gris carbón en alguna página.** La misma regla heredada (`#161519 !important`). El fondo del adaptador
lleva `!important`; si se perdió, revisa `block-34`.

**El fondo se ve negro, no azul.** Es el valor aprobado (`#000f1f`). Al lado de las bandas azules de Contacto y Agenda
se lee casi negro; en el canvas parece más azul por la interfaz gris que lo rodea. El operador decidió mantenerlo.

**Glitch aparece como botón y no abierto.** El renderer de producción todavía no es el 1.4.0 e ignora
`inline-initial-state="open"`. Se resuelve solo con el próximo release de Greenhouse a producción; no toques WordPress.

**La píldora de Glitch ocupa todo el ancho.** El renderer usa una consulta de contenedor: bajo 480 px de ancho del
contenedor, la píldora pasa a ancho completo. Es esperado en la columna angosta y en teléfono.

**Antes del formulario se ve «Suscríbete a Glitch».** Es el enlace de respaldo: el renderer se carga cuando el footer se
acerca a la pantalla. Si nunca cambia, revisa la consola y la red.

**Reaparece la barra « | » entre los enlaces legales.** La agrega el plugin `eo-measurement-consent`; el adaptador la
oculta con `font-size:0` en el contenedor. Si el plugin cambió su marcado, ajusta `legal-links.php`.

**Un texto nuevo en un bloque propio se ve con otro tamaño o interlineado.** Ohio aplica 14,8 px a los `li` y el
adaptador interlineado 1,75 a los `p`. Declara tamaño e interlineado en el propio bloque, como en `contact-type.php`.

## Referencias

- Arquitectura: [PUBLIC_SITE_FOOTER_V1.md](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md)
- Paquete V3: [`scripts/public-website/footer-refinement-v3/README.md`](../../../scripts/public-website/footer-refinement-v3/README.md)
- Paquete V2: [`scripts/public-website/footer-refinement-v2/README.md`](../../../scripts/public-website/footer-refinement-v2/README.md) y
  [auditoría V2](../../audits/public-site/2026-10-14-footer-composition-v2.md)
- Glitch: [`scripts/public-website/footer-newsletter-growth-form.php`](../../../scripts/public-website/footer-newsletter-growth-form.php)
- Referencia para agentes: `.claude/skills/efeonce-public-site-wordpress/references/site-footer.md`
- Diseño aprobado: canvas de Contacto, página «Footer»
  ([claude.ai/artifact/JKJAj4cQWd8CkcYprNcWYj](https://claude.ai/artifact/JKJAj4cQWd8CkcYprNcWYj))
