# Operar la landing Agencia Creativa

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-15 por Claude
> **Ultima actualizacion:** 2026-10-15 por Claude
> **Documentacion tecnica:** [AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md)
> **Documentacion funcional:** [agencia-creativa.md](../../documentation/public-site/agencia-creativa.md)

## Para qué sirve

Para editar el contenido de [`/agencia-creativa/`](https://efeoncepro.com/agencia-creativa/) (página
`249582`), cambiar su diseño de forma gobernada, publicarla y revertirla si algo sale mal.

## Antes de empezar

- Lee el [contrato técnico](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md) y el
  [audit del rollout](../../audits/public-site/2026-10-15-agencia-creativa-elementor-rollout.md).
- El checkout es compartido: corre `git status --short` en Greenhouse y en `efeonce-public-site-runtime`.
- Para cualquier carril WP-CLI, corre primero `pnpm public-website:ssh-check`.
- Confirma qué estás editando: `249582` es `/agencia-creativa/`; `251279` es `/agencia-creativa-v2/`
  («producción creativa a escala»), con sus módulos `escala-*`. `diagnostico` y `cierre` son compartidos:
  editarlos en Elementor afecta las dos páginas. La v2 se publica con `publish-creative-v2-page.php` y
  `creativa-source/page-custom-v2.css`; antes de republicar, actualiza el hash previo que exige el script.
- Al verificar, haz scroll real hasta cada sección: con «lazy load background images», Elementor fuerza
  `background-image:none !important` en todo contenedor que todavía no tiene la clase `e-lazyloaded`, así que
  una captura de página completa hecha deprisa muestra velos y pantallas vacías. No es un fallo: baja hasta la
  sección, espera a que cargue y recién ahí mide o captura.

## Editar textos, imágenes y colecciones en Elementor

1. Abre `wp-admin/post.php?post=249582&action=elementor`.
2. En el navegador de estructura, selecciona el contenedor de la sección y su widget `greenhouse_creativa_*`.
3. Edita textos, enlaces, imágenes y videos desde los controles. Las imágenes y videos se eligen desde la
   biblioteca de Media.
4. En las listas (portafolio, rutas, formatos, preguntas, etc.) agrega, quita o reordena filas. Si un
   repeater ofrece variantes de layout, elige una variante; no hay campo para HTML.
5. Para el medidor de Sky, cambia sólo el número: el arco se recalcula en el servidor.
6. Guarda, purga la caché y revisa la página en 1440 y 390 px.

La prueba completa de guardar y recargar desde el editor todavía no está certificada: si notas un
comportamiento raro al guardar, detente y escala antes de reintentar.

## Cambiar el diseño (no el contenido)

El diseño vive en la fuente aprobada `scripts/public-website/creativa-source/Main.dc.html` y en el plugin.
Un cambio de diseño se hace así:

1. Edita la fuente (y `host.css` o `page-custom.css` si corresponde). Las reglas de `host.css` para
   `diagnostico` y `cierre` se aplican en las dos landings: después de desplegar, verifica `249582` y `251279`.
2. Recompila con `node scripts/public-website/compile-creativa-elementor-source.cjs`; si hay media nueva,
   prepárala con `prepare-creativa-assets.cjs`.
3. Corre `php tests/creativa-modules.test.php` en el repo runtime.
4. Exporta el baseline vivo: `pnpm public-website:export-live-code -- --output <dir>`.
5. Arma el paquete: `node scripts/public-website/build-creativa-elementor-package.cjs <dir>`. Revisa el
   diff contra el baseline: el paquete lleva todo lo que no esté vivo, no sólo tu cambio.
6. Despliega los archivos:

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-creativa-elementor-package.php \
     --input-file <package.zip> --input-file <manifest.json> --wp-user 12
   ```

## Publicar el documento

Cuando el cambio altera la estructura de módulos o sus defaults, publica con el publisher:

```bash
pnpm public-website:wpcli -- --eval-file scripts/public-website/publish-creativa-elementor-page.php \
  --input-file <payload> --wp-user 12
```

El publisher valida el hash del contenido, prueba los controles y el render de los 15 widgets **antes** de
escribir, toma snapshot, guarda con `Document::save`, restaura metas Ohio y `_thumbnail_id=249672`, verifica
Home y v2, reconstruye el indexable Yoast y purga.

Después verifica: 1440 y 390 px sin overflow (`scrollWidth == clientWidth`), los 15 módulos con media, tabs
con clic y flechas, formulario visible, reduced motion sin animaciones ni videos, un solo `h1`, y Home/v2/
header/footer sin cambios.

## Publicar el formulario del diagnóstico en dos pasos

El diseño en dos pasos («Tu operación» → «Tus datos») está aprobado y sus estilos ya están en vivo en el módulo
`diagnostico`, pero la versión nueva del formulario todavía no se publica: necesita que el renderer de Growth
Forms con el commit `ab622e958` esté en producción (antes de ese commit, un campo `radio` fuera del estilo
`hubspot_pillar` se dibuja como una caja de texto vacía).

1. Confirma que la publicación de Greenhouse que trae `ab622e958` ya llegó a producción.
2. Corre el dry-run desde la raíz de Greenhouse:

   ```bash
   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-creative-diagnostic-two-step.ts
   ```

   Revisa que reporte la versión publicada esperada (`fver-79bbb3b4…`) y el renderer de producción listo.
3. Publica con el mismo comando y `--apply`. El script vuelve a medir sus guardas y **se niega** si la versión
   publicada cambió o si el renderer de producción no trae el arreglo (`renderer_not_released`). No intentes
   saltarte esa guarda: publicar antes deja las preguntas del paso 1 como cajas vacías en las dos landings.
4. Revincula la política de medición publicitaria a la versión nueva (está atada a la versión exacta):
   `pnpm --silent growth:measurement`, siguiendo el runbook
   [`10-growth-lead-matching-runtime.md`](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).
5. Purga la caché y verifica en vivo `/agencia-creativa/` y `/agencia-creativa-v2/` a 1440 y 390 px: dos
   pasos, tarjetas en «¿Qué te frena hoy?», píldoras en tamaño del equipo y plazo (la opción elegida en navy),
   íconos en las etiquetas, botón naranja a todo el ancho, enlace «Política de privacidad» legible y
   `scrollWidth == clientWidth`. Haz scroll hasta la sección antes de capturar.

## Previsualizar un cambio del formulario antes de publicarlo

Un cambio de contrato o de renderer se puede ver sobre la página real sin tocar producción: en un navegador de
prueba con Playwright, intercepta la respuesta de la API del contrato del formulario
(`GET /api/public/growth/forms/{slug}`) y, si hace falta, el bundle del renderer, y sírvelos con la versión que
quieres probar. Así compruebas el resultado en el host real (ancho de la tarjeta, CSS de Ohio, estilos de
`host.css`) a 1440 y 390 px antes de prometer el diseño o de publicar. La interceptación sólo afecta a ese
navegador; no publica nada.

## Rollback

1. Toma un snapshot del estado actual antes de revertir.
2. Lee la opción `_gh_creativa_before_20261015_143257`.
3. Restaura elements y settings con `Document::save` (nunca escribiendo `_elementor_data` a mano).
4. Restaura las metas y `_thumbnail_id=249672`.
5. Purga caché y verifica la landing, Home y v2.

Para archivos del plugin, restaura el tar de `/tmp` del deploy sólo sobre los paths del manifest. Los tar
remotos son temporales.

## Qué no hacer

- **No** pegues HTML, CSS ni JavaScript en un widget, ni agregues un widget HTML.
- **No** uses `Document::save` a mano ni edites `_elementor_data` directamente: usa el publisher, que hace
  preflight y restaura metas.
- **No** despliegues todo el checkout runtime: contiene WIP de otras sesiones. Usa el paquete acotado.
- **No** commitees ni reescribas el loader `class-eo-widgets-loader.php` sin resolver antes el WIP ajeno
  que también carga.
- **No** pongas defaults string en controles Media, URL o video: siempre arrays.
- **No** cambies el header/footer Ohio ni la Home para arreglar algo de esta landing.
- **No** corrijas el formulario con CSS page-scoped más allá de los tokens del host: los campos y el envío
  son de Growth Forms.

## Problemas comunes

- **La publicación falla con `array_merge(): Argument #2 must be of type array, string given`.** Un control
  Media/URL/video (a menudo dentro de un repeater) tiene default string. Si `Document::save` alcanzó a
  correr, la página queda **a medio escribir**: settings nuevos sobre el layout viejo, `_thumbnail_id`
  borrado y `_elementor_controls_usage` perdido, con `_elementor_data` intacto. Restaura settings,
  controls usage y thumbnail desde el snapshot que tomó el intento fallido, compara contra el snapshot y
  purga. Luego corrige el default, corre la prueba local y vuelve a publicar. Caso del 2026-10-15 en el
  [audit](../../audits/public-site/2026-10-15-agencia-creativa-elementor-rollout.md#incidente-del-primer-intento).
- **La imagen destacada desapareció tras guardar.** Elementor borra `_thumbnail_id` al guardar; restáuralo
  a `249672`.
- **El botón del formulario sale teal (`#36c8bf`) en vez del color del host.** La variante de estilo
  re-declara los tokens `--ghf-*` en `.ghf-root[data-ghf-style-variant]`. El override debe apuntar a
  `greenhouse-form :is(.ghf-scope,.ghf-root[data-ghf-style-variant])`, no sólo a `greenhouse-form`. Para la
  acción, declara los tokens sobre `.ghf-actions` (hoy `--ghf-accent:#ff6500`, naranja) en vez de pelear con
  `!important`.
- **El formulario sale en una sola columna.** Las dos columnas se activan cuando el `<greenhouse-form>` mide
  520 px o más. Desde el 2026-10-15 el host le da 622 px desde 1200 px de viewport (grilla `.82fr / 1.18fr` con
  el plan sticky) y lo apila a todo el ancho por debajo. Si vuelve a una columna, mide el ancho del
  `<greenhouse-form>` en vivo y revisa que no se haya pisado la regla de `diagnostico` en `host.css`.
- **El formulario todavía tiene listas desplegables y la URL de privacidad completa.** Es la versión vigente:
  la versión en dos pasos espera el renderer con `ab622e958` en producción (ver
  [Publicar el formulario del diagnóstico en dos pasos](#publicar-el-formulario-del-diagnóstico-en-dos-pasos)).
- **El formulario muestra el texto alternativo.** Revisa el `form-key` y la surface: un `form-key` inválido
  degrada al fallback.
- **La sección se ve corrida 16 px a la izquierda.** Falta o fue pisado el selector de `page-custom.css` que
  anula el `left:16px` de Ohio en `.e-con-full.e-parent`.

## Referencias técnicas

- [Contrato técnico](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md)
- [Contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md#diagnóstico-creativo-agencia-creativa)
- [Incrustar un formulario de Growth](../growth/incrustar-formulario-wordpress-astro.md)
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` (`class-eo-creativa-landing-*`).
