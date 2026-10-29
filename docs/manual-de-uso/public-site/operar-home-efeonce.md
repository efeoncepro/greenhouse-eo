# Operar la home de Efeonce («La órbita»)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-29 por Claude
> **Documentacion tecnica:** [HOME_INICIO_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md)
> **Documentacion funcional:** [home-efeonce-la-orbita.md](../../documentation/public-site/home-efeonce-la-orbita.md)

## Para qué sirve

Para editar el contenido de la portada [efeoncepro.com](https://efeoncepro.com/) (página `251731`), cambiar su diseño
de forma gobernada, republicarla, regenerar su imagen social y revertirla si algo sale mal.

## Antes de empezar

- Lee el [contrato técnico](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md) y el
  [audit del rollout](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md).
- `251731` **es la portada pública**: todo lo que guardes se ve de inmediato en `/`.
- El checkout es compartido: corre `git status --short` en Greenhouse y en `efeonce-public-site-runtime` antes de
  compilar o empaquetar.
- El runtime vivo incluye el commit `af1a785`, que no está en `main` del repo runtime: parte siempre de un baseline
  vivo exportado, nunca de `main`.
- Para cualquier carril WP-CLI corre primero `pnpm public-website:ssh-check`.
- Mutar el sitio (deploy, publicación, SEO, rollback) requiere autorización del operador para ese cambio.

## Editar textos e imágenes en Elementor

Todo el contenido visible es editable, también las variantes que rotan o cambian con el scroll.

1. Abre `wp-admin/post.php?post=251731&action=elementor`.
2. En el navegador de estructura, elige el contenedor de la sección y su widget `greenhouse_inicio_*` (hero, marcas,
   motor, lineas, trabajo, aeo, agentes, greenhouse, metodo, respaldo, faq, agenda).
3. Edita textos, enlaces, imágenes y videos desde los controles; la media se elige desde la biblioteca.
4. Las variantes que rotan están expandidas como campos normales: palabras del hero, descripciones y rótulos,
   preguntas AEO y estados de «Tu marca», vistas de Greenhouse, pasos del método, testimonios, columnas del comparador
   y panel de preguntas frecuentes. Cambia el texto de cada variante en su propio campo.
5. En las listas (repetidores) agrega, quita o reordena filas: `lineas_hero`, `elenco`, `logos`, `herramientas`,
   `lineas`, `piezas_a`, `piezas_b`, `sparks`, `partners`, `faq`. No dupliques filas para «alargar» una cinta: el
   JavaScript crea solo las copias del loop.
6. Guarda, purga la caché y revisa la página en 1440, 1280 y 390 px.

Notas:

- En el editor no corre la animación: verás los estados quietos. Es lo esperado.
- La prueba completa de guardar y recargar desde el editor no quedó registrada en este rollout. Si al guardar notas
  algo raro, detente y escala antes de reintentar.
- Guardar desde Elementor reescribe la imagen destacada desde los ajustes de página; por eso la imagen social también
  está en esos ajustes. No la cambies desde el editor sin seguir [Regenerar la imagen social](#regenerar-la-imagen-social-og).
- Las cifras de Greenhouse y la escena AEO son ilustrativas. Si las cambias, deben seguir leyéndose como ejemplo.

## Cambiar el diseño (no el contenido)

El diseño vive en `scripts/public-website/inicio-source/` y en el plugin `eo-elementor-widgets`.

1. Edita la fuente (`Main.dc.html`, y `host.css` o `page-custom.css` si corresponde). No agregues el menú dibujado:
   la página usa el menú del sitio.
2. Recompila:

   ```bash
   node scripts/public-website/compile-inicio-elementor-source.cjs
   ```

3. Corre los gates del núcleo compartido; las otras landings deben quedar idénticas:

   ```bash
   node scripts/public-website/verify-source-led-compilers.cjs
   php scripts/public-website/verify-source-led-render.php
   ```

4. Revisa en local antes de tocar el sitio: renderiza los módulos con stubs (como `tmp/inicio-local/render.php`,
   basado en `verify-source-led-render.php`) y míralos en el navegador.
5. Exporta el baseline vivo y arma el paquete (escribe `tmp/inicio-elementor-release/{package.zip,manifest.json}`):

   ```bash
   pnpm public-website:export-live-code -- --output <dir-baseline>
   node scripts/public-website/build-inicio-elementor-package.cjs <dir-baseline>
   ```

   Revisa el diff de **todos** los archivos del paquete; el loader y la base source-led son compartidos y viajan
   completos.
6. Despliega:

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-inicio-elementor-package.php \
     --input-file ./tmp/inicio-elementor-release/package.zip \
     --input-file ./tmp/inicio-elementor-release/manifest.json --wp-user 12
   ```

   El deploy acepta sólo rutas de la home (incluye mp4), compara el SHA previo de cada archivo con el vivo, guarda
   un backup TAR en `/tmp` de Kinsta y purga la caché. Anota la ruta del backup: es tu rollback de archivos.
7. Si cambiaste el orden de módulos, `page-custom.css` o la estructura del documento, republica (siguiente sección).

## Republicar el cuerpo de la página

1. Lee el hash actual de `_elementor_data` de `251731` con una lectura que no escriba. Si no coincide con el último
   publicado, alguien editó la página en Elementor: revisa qué cambió antes de seguir, o lo perderás.
2. (Opcional) Prueba primero con `{ "mode": "preview" }`: crea una copia de QA con `noindex`, fuera de menús. Al
   terminar, mándala a la papelera.
3. Escribe el spec `{ "mode": "replace", "pageId": 251731, "expectedDataSha": "<hash leído>" }` en un archivo
   temporal y publica:

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/publish-inicio-elementor-page.php \
     --input-file ./scripts/public-website/inicio-source/page-custom.css \
     --input-file ./tmp/<spec>.json \
     --input-file ./.auth/site-nav-meeting-cta-surface.json --wp-user 12
   ```

   El tercer archivo es el del CTA del agendador del menú global (permisos 0600). No lo imprimas ni lo copies a otro
   lugar. Sin él, el módulo agenda no recibe la superficie del agendador.
4. Anota el snapshot que imprime (`_gh_home_orbita_before_<UTC>`): es tu rollback.
5. Verifica (ver [Qué revisar después](#qué-revisar-después)).

## Regenerar la imagen social (OG)

1. Edita `scripts/public-website/inicio-source/og/og.html` (1200×630). Mantén la composición centrada: la lente y el
   logo deben sobrevivir al recorte cuadrado de los chats y al 2:1 de X.
2. Renderízala con Playwright a 1200×630 como PNG (desde la raíz del repo; usa las fuentes de Google, necesita red):

   ```bash
   node -e "const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});await p.goto('file://'+process.cwd()+'/scripts/public-website/inicio-source/og/og.html');await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:'scripts/public-website/inicio-source/og/og-home.png'});await b.close()})()"
   ```

   Mira el PNG antes de aplicarlo.
3. Aplica con `configure-inicio-seo.php`, que recibe el PNG, lo importa **como adjunto nuevo** y lo deja como imagen
   OG, de Twitter y destacada (también en los ajustes de página de Elementor). Imprime su snapshot
   (`_gh_home_orbita_seo_before_<UTC>`).
4. Refresca la caché de LinkedIn Post Inspector y de Facebook Sharing Debugger antes de compartir.

No sobrescribas el archivo de la imagen en el lugar: las redes cachean por URL y seguirían mostrando la anterior.

## Rollback

| Qué revertir | Cómo |
| --- | --- |
| Cuerpo de la página | `rollback-inicio-elementor-page.php` con `{ "snapshot": "_gh_home_orbita_before_<UTC>" }`. Restaura Elementor, imagen destacada, metas Ohio y Yoast, reconstruye el indexable y purga Kinsta. Exige que la portada siga siendo `251731`. |
| Cuerpo + SEO posterior | El mismo script con `{ "snapshot": "…", "seoSnapshot": "_gh_home_orbita_seo_before_<UTC>" }`. |
| Sólo SEO/social | Restaura cada campo desde la opción `_gh_home_orbita_seo_before_<UTC>` (borra los que tenían `exists=false`, devuelve `post_featured_image` en los ajustes de Elementor), reconstruye el indexable Yoast y purga Kinsta. |
| Archivos del plugin | El backup TAR que imprimió el deploy, en `/tmp` de Kinsta. |
| Páginas retiradas | `wp_untrash_post( <id> )`, restaurar su estado y borrar su redirección con el gestor de redirecciones de Yoast. |

Snapshots del rollout del 2026-10-29: cuerpo `_gh_home_orbita_before_20261029_012508`; SEO
`_gh_home_orbita_seo_before_20261029_092107`.

## Qué revisar después

- 1440, 1280 y 390 px: sin desborde horizontal, sin imágenes rotas, sin errores de consola.
- El diálogo del agendador abre desde el módulo agenda (no agendes una reunión de prueba).
- Canónico `/`, `index, follow`, título y descripción intactos; un solo `<h1>`.
- Al cargar no se descarga video (los videos de trabajos sólo arrancan en pantalla).
- Haz scroll real hasta cada sección antes de medir o capturar: varias escenas dependen del scroll.

## Qué no hacer

- No edites el cuerpo de `251731` con otro script ni lo publiques sin `expectedDataSha`.
- No toques header ni footer desde este carril, ni portes el menú dibujado del canvas.
- No despliegues el checkout runtime completo ni partas de `main`.
- No pegues HTML, CSS ni JavaScript en Elementor: no hay campos para eso.
- No uses `create-yoast-redirect.php` para mandar una página a la portada: no acepta `/` como destino. Usa el patrón
  de los scripts `retire-*` (corrida en seco primero).
- No presentes las cifras de Greenhouse ni la escena AEO como datos reales.
- No agregues JSON-LD desde los widgets: Yoast es dueño del grafo.

## Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| Tamaños o rellenos distintos al canvas | El canvas usa `box-sizing: border-box`; no copies el reset `content-box` de Nosotros. |
| Los widgets laterales de Ohio se montan sobre el contenido en pantallas anchas | Hacen falta rieles desde 1181 px (`--gh-rail`). |
| Una escena de scroll se activa en el lugar equivocado | En el sitio, `offsetTop` es relativo al contenedor de Elementor; mide con `getBoundingClientRect().top + scrollY`. |
| El título accesible se lee con palabras sueltas repetidas | Las palabras del hero quedaron dentro del `<h1>`; deben vivir en `<template data-gh-words>`. |
| En móvil el rótulo de la lente se corta o la escena AEO no avanza | Reserva espacio para el rótulo; en móvil AEO es sección normal y la etapa avanza por pregunta. |
| En móvil hay Sparks encima del texto o las tarjetas del motor chocan | Los Sparks de media altura van ocultos (`gh-mid`); las tarjetas del motor van a las cuatro esquinas con letra menor. |
| El editor muestra un layout por cada fila en Sparks o partners | Es por los estilos inline por fila; está aceptado. |
| Al compartir se ve la imagen vieja | Caché de la red social: refresca en LinkedIn Post Inspector o Facebook Sharing Debugger. |
| La imagen destacada cambió después de guardar en Elementor | Elementor la reescribe desde `post_featured_image`; revisa que siga siendo la imagen social vigente. |

## Referencias técnicas

- [Contrato técnico](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md)
- [Audit del rollout y SEO](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md)
- [Registro de primitives públicas](../../architecture/public-site/PRIMITIVES.md#registry) (`InicioLandingModules`)
- Scripts: `scripts/public-website/{compile-inicio-elementor-source.cjs,build-inicio-elementor-package.cjs,deploy-inicio-elementor-package.php,publish-inicio-elementor-page.php,rollback-inicio-elementor-page.php,configure-inicio-seo.php}`
