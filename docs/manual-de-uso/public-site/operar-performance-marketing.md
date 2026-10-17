# Operar la landing Performance Marketing

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-17 por Claude
> **Ultima actualizacion:** 2026-10-17 por Claude
> **Documentacion tecnica:** [Registro de primitives (`PerformanceLandingModules`)](../../architecture/public-site/PRIMITIVES.md#registry) ·
> [contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md#diagnóstico-de-pauta-performance-marketing)
> **Documentacion funcional:** [performance-marketing.md](../../documentation/public-site/performance-marketing.md)

## Para qué sirve

Para editar el contenido de [`/servicios/performance-marketing/`](https://efeoncepro.com/servicios/performance-marketing/)
(página `251997`, hija de `/servicios/` `251077`), cambiar su diseño de forma gobernada y revertir la publicación o la
migración de la página antigua si algo sale mal.

## Antes de empezar

- El checkout es compartido: corre `git status --short` en `greenhouse-eo` y en `efeonce-public-site-runtime` antes
  de tocar nada. No mezcles cambios ajenos en tu paquete ni en tu commit.
- Para cualquier operación por WP-CLI, corre primero `pnpm public-website:ssh-check`.
- Confirma la identidad: `251997` es la landing nueva; `242862` es la página antigua
  `/servicio-gestion-campanas-publicitarias/`, hoy **privada** (no borrada).
- El diseño aprobado es el canvas v25 (Design artifact `https://claude.ai/artifact/PHjnoeTQbcaXEXNUEXK67j`), con copia
  versionada en `docs/ui/sources/TASK-1865/`. La fuente que compila el carril vive en
  `scripts/public-website/performance-source/` (`Main.dc.html`, `blob-map.tsv`, `assets.json`, `used-assets.json`,
  `host.css`, `page-custom.css` con `__ID__`, `page.css`, `form.json`, `og/`).
- La guía operativa del agente para esta landing está en la referencia
  `efeonce-public-site-wordpress/references/landings/performance-marketing.md` de la skill.

## Editar textos y preguntas frecuentes en Elementor

1. Abre `wp-admin/post.php?post=251997&action=elementor`.
2. En el navegador de estructura selecciona el contenedor de la sección y su widget
   `greenhouse_performance_*` (hay diez: `hero`, `confianza`, `problema`, `solucion`, `plataformas`, `creatividad`,
   `autodiagnostico`, `recibes`, `condiciones`, `diagnostico`).
3. Edita textos, enlaces e imágenes desde los controles del widget (grupos de copy, enlaces, «Imágenes y video» y
   datos). Las imágenes se eligen desde la biblioteca de Media. Ningún control acepta HTML, CSS ni JavaScript.
4. Las preguntas frecuentes están en el widget `diagnostico`, como lista (repeater): agrega, quita o cambia filas.
   Esa lista alimenta el `FAQPage` de la página, así que lo visible y lo declarado a los buscadores cambian juntos.
5. En el mismo widget `diagnostico` están el `form key` y la `surface` del formulario incrustado y la descripción
   del `Service`. No los cambies salvo que estés reemplazando el formulario por otro publicado.
6. Cada widget tiene un interruptor «Animaciones»; con él encendido igual se respeta el movimiento reducido del
   visitante. Fuera de las preguntas frecuentes no hay listas: la cantidad de pestañas, preguntas del
   autodiagnóstico o tarjetas es fija y cambiarla es un cambio de diseño.
7. Guarda, purga la caché y revisa la página en 1440 y 390 px.

La prueba completa de abrir, guardar y recargar desde el editor **todavía no está certificada**. Si notas un
comportamiento raro al guardar (algo que desaparece, una sección que cambia de forma), detente y escala antes de
reintentar.

## Cambiar el diseño (no el contenido)

La estructura de cada sección no se edita en Elementor: sale de plantillas compiladas desde el canvas. Un cambio de
diseño sigue el carril canvas → compilar → paquete → deploy.

1. Cambia el diseño en el canvas aprobado y actualiza la fuente en `scripts/public-website/performance-source/`
   (más `host.css`, `page.css` o `page-custom.css` si corresponde).
2. Recompila. Escribe directo en el runtime compartido (`/Users/jreye/Documents/efeonce-public-site-runtime`, o lo
   que diga `PUBLIC_SITE_RUNTIME_ROOT`): `includes/performance/{schemas,templates}` y
   `assets/css/performance-landing.css`. No edites a mano los archivos generados.

   ```bash
   node scripts/public-website/compile-performance-elementor-source.cjs
   ```

3. Si cambió la media del canvas, prepara los assets (convierte a WebP lo que no es video ni SVG):

   ```bash
   node scripts/public-website/prepare-performance-assets.cjs
   ```

4. Exporta un baseline vivo reciente:

   ```bash
   pnpm public-website:export-live-code -- --output <dir-baseline>
   ```

5. Arma el paquete acotado (contrato `performance-elementor-release.v1`). Escribe
   `tmp/performance-elementor-release/{package.zip,manifest.json}` e imprime qué archivos existentes cambian:

   ```bash
   node scripts/public-website/build-performance-elementor-package.cjs <dir-baseline>
   ```

   Revisa esa lista y el diff de **todos** los archivos incluidos, en especial
   `includes/class-eo-widgets-loader.php`, que es compartido y se empaqueta completo. El paquete lleva todo lo que
   difiera del vivo, no sólo tu cambio.

6. Despliega los archivos (sólo con autorización vigente para ese cambio):

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-performance-elementor-package.php \
     --input-file ./tmp/performance-elementor-release/package.zip \
     --input-file ./tmp/performance-elementor-release/manifest.json --wp-user 12
   ```

   El deploy acepta sólo rutas de la allowlist de Performance, compara el SHA previo de cada archivo contra el vivo
   (si alguien cambió algo, se detiene con `Live drift`), guarda un backup TAR en `/tmp` de Kinsta, instala, limpia
   la caché de Elementor y purga Kinsta. Imprime `scoped_package_installed` con la ruta del backup.

7. Verifica en vivo (ver [Qué revisar después](#qué-revisar-después)).

**Ojo:** este carril cambia los archivos del plugin, no el documento guardado de la página. Si el cambio altera la
lista de módulos o sus títulos, reescribe el cuerpo con el **republicador** (nunca con el publicador de creación):

1. Lee el hash actual: `pnpm public-website:wpcli -- --eval-file ./scripts/public-website/republish-source-led-page.php
   --input-file ./scripts/public-website/performance-source/republish.json --input-file
   ./scripts/public-website/performance-source/page-custom.css --wp-user 12` con `"dryRun": true` (no escribe). Devuelve
   `currentSha`, si el árbol y el CSS ya coinciden y qué widgets conservan sus ajustes del editor.
2. Copia el spec a un archivo temporal con `"dryRun": false` y `"expectedDataSha": "<currentSha>"`, ajusta `modules`
   y vuelve a correrlo. Si alguien editó la página entre la lectura y la escritura, se detiene.
3. Resultado `republished_verified`: guardó, conservó la imagen destacada (`252002`), dejó snapshot
   `_gh_performance_republish_before_*` y purgó Kinsta. `unchanged` significa que no había nada que escribir.

La estructura común del carril (compilador y base de widgets) es compartida con Agencia de Medios: antes de
desplegar, corre `node scripts/public-website/verify-source-led-compilers.cjs` y
`php scripts/public-website/verify-source-led-render.php`.

## Scripts del carril (referencia)

| Script | Qué hace | Snapshot / salida |
| --- | --- | --- |
| `compile-performance-elementor-source.cjs` | Compila el canvas en schemas, plantillas y CSS | Archivos en el runtime |
| `prepare-performance-assets.cjs` | Convierte la media del canvas a assets del plugin | `assets/img/performance/` |
| `build-performance-elementor-package.cjs <baseline>` | Arma el paquete con hashes previos | `tmp/performance-elementor-release/` |
| `deploy-performance-elementor-package.php` | Instala el paquete con allowlist y guarda de SHA | Backup TAR en `/tmp` de Kinsta |
| `publish-performance-elementor-page.php` | Crea y publica la página (sólo crear) | Verifica hashes de páginas protegidas y del chrome global |
| `fix-performance-ohio-layout.php` | Copia 164 metas `page_*` desde `249582`; sidebar `without` | `_gh_performance_ohio_layout_before_20261017_181400` |
| `configure-performance-seo.php` | Metadatos Yoast + imagen social | `_gh_performance_seo_before_20261017_181342` |
| `migrate-performance-legacy.php` | 301, página antigua privada, menú | `_gh_performance_migration_before_20261017_181625` |
| `republish-source-led-page.php` + `performance-source/republish.json` | Reescribe el cuerpo con guarda de hash, conservando ediciones e imagen destacada | `_gh_performance_republish_before_*` |

Los scripts PHP que reciben el id de la página lo aceptan como número o como ruta a un archivo que contiene el id.
Por el wrapper de WP-CLI, pásalo **como archivo** (ver [Problemas comunes](#problemas-comunes)).

## Qué revisar después

- 1440 y 390 px sin desborde horizontal (`scrollWidth == innerWidth`).
- Los diez módulos inicializados; pestañas de plataformas y órbita del autodiagnóstico funcionando.
- Un solo `h1`, canonical propio, `index, follow`, OG/Twitter y los bloques `Service` y `FAQPage`.
- El formulario visible con sus 26 campos.
- En móvil, la barra «Agenda un diagnóstico» aparece tras el hero y se oculta al llegar al formulario.
- Header, footer y landings hermanas (`/servicios/agencia-de-medios/`, `/servicios-contratar-hubspot/`,
  `/agencia-creativa/`) respondiendo 200.

## Qué significan los estados

| Estado / señal | Qué significa |
| --- | --- |
| `scoped_package_installed` | El deploy terminó y dejó backup en `/tmp` de Kinsta |
| `Live drift: <ruta>` | Un archivo vivo no coincide con el baseline del paquete: alguien lo cambió. Relee el vivo; no cambies hashes |
| `Path outside Performance Marketing release scope.` | El manifest trae una ruta fuera de la allowlist |
| `published_verified` | El publicador creó y publicó la página y confirmó que no tocó páginas protegidas ni el chrome global |
| `Slug already exists. Inspect before retry.` | El publicador se negó porque la página ya existe (comportamiento esperado hoy) |
| `ohio_layout_copied` | Se copiaron las metas de layout de Ohio |
| `legacy_retired` | Quedaron aplicados el 301, la página antigua privada y el menú |
| `Source identity drift` / `Target identity drift` | Una guarda de identidad detuvo el script antes de escribir |

## Rollback

No hay script de rollback automático. Cada script dejó un snapshot en una opción de WordPress; restaura leyendo esa
opción, toma antes un snapshot del estado actual y purga Kinsta al final.

1. **Migración de la página antigua** (opción `_gh_performance_migration_before_20261017_181625`): borra el redirect
   de Yoast `servicio-gestion-campanas-publicitarias` (`WPSEO_Redirect_Manager::delete_redirects`), devuelve las tres
   redirecciones repuntadas a su destino anterior, vuelve `242862` a `publish` y restaura
   `_menu_item_object_id` del ítem `242915` a `242862`. Hazlo **antes** de despublicar la página nueva, para que el
   menú y las redirecciones no queden apuntando a un borrador.
2. **Página nueva:** pásala a borrador (`wp post update 251997 --post_status=draft`).
3. **SEO y layout Ohio:** restaura cada campo desde `_gh_performance_seo_before_20261017_181342` y
   `_gh_performance_ohio_layout_before_20261017_181400` (borra las claves que no existían).
4. **Archivos del plugin:** restaura el TAR del deploy (`/tmp/eo-performance-widgets-before-20261017-181240.tar` para
   el despliegue inicial) sólo sobre las rutas del manifest; revisa `created-paths.json` para no asumir que el TAR
   contiene la versión anterior de archivos que eran nuevos. Los TAR viven en `/tmp` y pueden desaparecer.
5. Purga caché y verifica la página antigua, el menú desde la Home, la redirección y las landings hermanas.

## Qué no hacer

- **No** pegues HTML, CSS ni JavaScript en un widget, ni agregues un widget HTML.
- **No** uses el publicador de creación para reescribir la página: se niega por diseño, y forzarlo duplicaría o
  pisaría el documento.
- **No** escribas `_elementor_data` a mano.
- **No** despliegues el checkout runtime completo: contiene trabajo de otras sesiones. Usa el paquete acotado.
- **No** cambies los hashes del manifest para saltarte un `Live drift`.
- **No** borres la página antigua `242862`: está privada a propósito para poder recuperarla.
- **No** des por hecho que Yoast conserva los parámetros de campaña en un 301: lo hace el mu-plugin.
- **No** declares verificado el envío del formulario ni `generate_lead` sin un envío real desde navegador.

## Problemas comunes

- **Después de re-guardar la página por script, el schema muestra una imagen `http://` del plugin.** Re-guardar el
  documento de Elementor desde WP-CLI con `get_settings()` borra la imagen destacada (pasó el 2026-10-17). Vuelve a
  fijarla con la imagen OG (adjunto `252002`), reconstruye el indexable de Yoast y purga Kinsta. Desde el editor visual
  no ocurre.
- **No logro pasar el id de la página a un script.** `pnpm public-website:wpcli` sólo reenvía archivos
  (`--input-file`) como argumentos; no existe `-- <arg>`. Escribe el id en un archivo (por ejemplo
  `tmp/performance-page-id.txt`) y pásalo con `--input-file`. Los scripts aceptan número o ruta.
- **Un script se detuvo con «Source identity drift» sin cambiar nada.** Al editar una línea PHP con varias
  asignaciones (`$id = …; $source = …;`), un comentario `//` al final comenta las asignaciones siguientes y la
  variable queda vacía. Pasó el 2026-10-17 y la guarda lo frenó antes de escribir. Separa las asignaciones o quita
  el comentario.
- **El loader del plugin tiene cambios de otra sesión.** `includes/class-eo-widgets-loader.php` es compartido. Antes
  de empaquetar, confirma con `diff` que el loader del checkout es igual al vivo. Al commitear en el runtime, mete
  sólo tu hunk (por ejemplo con `git hash-object -w` + `git update-index --cacheinfo`), no el archivo entero con el
  WIP ajeno.
- **La barra móvil o una animación «no aparece» (`opacity:0`).** En un panel de navegador oculto,
  `getComputedStyle` de las animaciones ligadas al scroll puede devolver un cuadro viejo. Fuerza un recálculo o toma
  una captura antes de concluir que está roto.
- **Un enlace con `?utm_` a la dirección antigua llega sin parámetros.** La query sobrevive al 301 gracias al
  mu-plugin `efeonce-redirect-query-passthrough` (desplegado el 2026-10-17), no a Yoast. Si se pierde, revisa que el
  mu-plugin siga activo. Diagnóstico:
  [`YOAST_REDIRECT_QUERY_STRING_DIAGNOSIS_V1.md`](../../public-site/YOAST_REDIRECT_QUERY_STRING_DIAGNOSIS_V1.md).
- **El formulario muestra el texto alternativo.** Revisa el `form key` y la `surface` del widget `diagnostico`
  contra el formulario publicado.

## Pendientes conocidos

Verificado al cierre de TASK-1865 (envío real, GA4, Meta, Rich Results, viewports, re-guardado). El núcleo común y
el republicador existen desde el 2026-10-17; la base común de widgets está desplegada desde las 21:25 UTC de ese día
(HTML de los módulos idéntico antes y después). Falta pedir indexación de la URL en la interfaz de Search Console.

## Referencias técnicas

- [Registro de primitives del sitio público](../../architecture/public-site/PRIMITIVES.md#registry)
- [Contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md#diagnóstico-de-pauta-performance-marketing)
- [Tracking Plan](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md#forms)
- [Incrustar un formulario de Growth](../growth/incrustar-formulario-wordpress-astro.md)
- [Decisión de posicionamiento PDR-022](../../public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md)
- [TASK-1865](../../tasks/complete/TASK-1865-landing-performance-marketing.md)
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` (`class-eo-performance-landing-*`,
  `includes/performance/`, `assets/js/performance-landing.js`).
