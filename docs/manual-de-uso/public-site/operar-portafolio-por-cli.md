# Operar el portafolio por la CLI y sus herramientas

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-30 por Claude
> **Ultima actualizacion:** 2026-10-30 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)
> **Documentacion funcional:** [Portafolio de proyectos](../../documentation/public-site/portafolio-de-proyectos.md)
> **Manual hermano:** [Operar el portafolio de proyectos](operar-portafolio.md) (admin de WordPress, interruptor, lotes)

## Para qué sirve

`pnpm public-website:portfolio` es la forma gobernada de crear, editar, publicar y restaurar proyectos del portafolio
de [efeoncepro.com/portafolio/](https://efeoncepro.com/portafolio/) sin entrar al admin. La usan el equipo y cualquier
agente. Pasa por el mismo servicio de guardado que la pantalla del admin y que `wp eo-portfolio`: no tiene reglas
propias, así que lo que la CLI acepta es lo que el sitio acepta.

Este manual cubre también las herramientas alrededor: plantillas por tipo de proyecto, el validador local, el
paquete y despliegue del plugin, la purga de caché, la revisión local con WordPress Playground y los scripts de la
migración desde Ohio.

**Estado al 2026-10-30:**

- En producción corre el plugin **0.8.0** desde el 2026-10-30, con 17 proyectos publicados y los tipos social,
  audiovisual, producción con IA y SEO/contenidos disponibles.
- Si `validate <slug> --remote` rechaza un tipo nuevo, el sitio corre una versión anterior a la 0.8.0: la 0.7.1 no
  conocía `kind: "social"`, `role: "post"`, `channel`, etc.: `validate <slug> --remote` los marca como
  `INVALID_VALUE` o `UNKNOWN_FIELD` (comprobado el 2026-10-30) y `apply` no guardaría nada.

## Antes de empezar

- `pnpm public-website:ssh-check` responde `"status": "ok"`. Todo paso remoto (incluidos `list`, `pull` y `new`) va
  por SSH con `pnpm public-website:wpcli … --wp-user 12`; la CLI ya pone ese usuario.
- `php` instalado en tu máquina: la validación local corre el validador del plugin sin WordPress.
- El repo del runtime en `/Users/jreye/Documents/efeonce-public-site-runtime` (o en `PUBLIC_SITE_RUNTIME_ROOT`). La
  validación local lee el plugin de ahí; si ese repo está en otra versión que producción, lo vas a notar en el sitio.
- `apply`, `publish`, `unpublish` y `restore` **escriben en producción**. Cada uno necesita el OK del operador para esa
  acción concreta. Usa `--dry-run` primero cuando el comando lo acepte.
- Para publicar hace falta la **aprobación del cliente** registrada fuera del sitio: referencia opaca (`ref`, nunca el
  correo ni el nombre del contacto), fecha y alcance (`scope`: `logo`, `pieces`, `metrics`, `testimonial`, `creators`).
- Las copias de trabajo viven en `tmp/portfolio/<slug>/` (fuera de git):

  | Archivo | Qué es |
  |---|---|
  | `working.json` | Tu copia editable. |
  | `live.json` | La versión viva al momento del último `pull` (base del `diff`). |
  | `preview.json` | La proyección pública que generó `preview`. |
  | `before-r<N>-<ts>.json` | Respaldo de la versión viva que `apply` guarda antes de escribir. |
  | `working-r<N>-<ts>.json` | Tu copia anterior, si un `pull` encontró que el sitio avanzó de revisión. |

## Referencia de comandos

Forma general: `pnpm public-website:portfolio -- <comando> [argumentos]`. Sin comando (o con `help`) imprime la ayuda.
Los slugs van en minúsculas con guiones.

| Comando | Qué hace | Lee | Escribe |
|---|---|---|---|
| `list` | Proyectos del sitio con estado (`● publicado` / `○ borrador`) y revisión. | Sitio (SSH) | Nada |
| `pull <slug>` | Trae el documento vivo a `working.json` y `live.json`. Si tu copia partía de otra revisión, la guarda aparte antes de reemplazarla. | Sitio (SSH) | Sólo `tmp/` |
| `kinds` | Qué muestra la página de cada tipo y qué necesita su documento. | Local | Nada |
| `new <slug> --kind <tipo>` | Copia de trabajo nueva desde la plantilla del tipo (`campaign`, `social`, `audiovisual`, `ai-production`, `seo-content`). Pone el slug en todo `COMPLETAR-slug`. | Sitio (SSH: comprueba que el slug no exista) | Sólo `tmp/` |
| `new <slug> --from <archivo.json>` | Copia de trabajo nueva desde un documento de partida (un fixture, un export). | Sitio (SSH) | Sólo `tmp/` |
| `validate <slug>` | Validador del plugin en local, marcadores de plantilla pendientes y si ya se podría publicar. | Local | Nada |
| `validate <slug> --remote` | Lo anterior y además el validador del sitio vivo (con la compuerta de publicación). | Sitio (SSH) | Nada |
| `preview <slug>` | Qué vería el público según el alcance aprobado; guarda la proyección en `preview.json`. | Local | Sólo `tmp/` |
| `diff <slug>` | Qué campos de primer nivel cambian frente a `live.json`. | Local | Nada |
| `apply <slug> --message "<por qué>" [--dry-run]` | Valida en local, rechaza si quedan marcadores, hace un dry run en el sitio y guarda una revisión nueva. **Nunca publica.** Después hace `pull`. | Sitio | **Producción** (salvo `--dry-run`) |
| `publish <slug> --message "<por qué>" [--dry-run]` | Comprueba la compuerta en local (si hay copia), dry run en el sitio y publica la revisión guardada. Después corre `verify <slug>`. | Sitio | **Producción** (salvo `--dry-run`) |
| `unpublish <slug> --message "<por qué>"` | Despublica. No acepta `--dry-run`. Después corre `verify <slug>`. | Sitio | **Producción** |
| `revisions <slug>` | Historial con autor y mensaje. | Sitio (SSH) | Nada |
| `log <slug>` | Quién publicó o despublicó, cuándo, qué revisión y con qué aprobación. Interno: nunca sale por la REST. | Sitio (SSH) | Nada |
| `restore <slug> <revisión> --message "<por qué>"` | Crea una revisión nueva con el contenido de la elegida (el historial nunca se borra). Después hace `pull`. | Sitio | **Producción** |
| `verify [<slug>]` | Por HTTP público, sin SSH: la REST `/wp-json/eo/v1/portfolio`, la portada `/portafolio/` y, con slug, si está en el índice, su REST y su página. Falla si lo público expone campos internos (`clientApproval`, `greenhouseOrganizationId`, `revision`). | Sitio (HTTP) | Nada |

Opciones que no salen en la ayuda: `new … --force` reemplaza una copia de trabajo existente.

Comprobado el 2026-10-30:

```bash
pnpm public-website:portfolio -- list
pnpm public-website:portfolio -- verify
pnpm public-website:portfolio -- kinds
```

## Paso a paso: el ciclo completo

### 1. Crear

```bash
pnpm public-website:portfolio -- kinds
pnpm public-website:portfolio -- new <slug> --kind social
```

Edita `tmp/portfolio/<slug>/working.json`: reemplaza cada `[COMPLETAR…]` y cada `"mediaId": 1`. Las imágenes se
referencian por el `mediaId` de la biblioteca de medios (con sus `width` y `height` reales); los videos, por `src` y
`poster` del bucket público de AXIS (`https://storage.googleapis.com/efeonce-group-axis-public-media/portfolio/v<N>/<slug>/`).

### 2. Validar y ver

```bash
pnpm public-website:portfolio -- validate <slug>
pnpm public-website:portfolio -- preview <slug>
pnpm public-website:portfolio -- diff <slug>
```

`validate` responde, en este orden: si cumple `portfolio-entry.v1`, cuántos marcadores quedan (con sus rutas) y si
la compuerta de publicación pasa. Mientras quede un marcador, en vez de «se puede publicar» dice «Completa los
marcadores antes de guardar», y `apply` se niega a guardar (la aprobación de la plantilla trae texto de relleno, así que
la compuerta por sí sola pasaría).

### 3. Guardar (con el OK del operador)

```bash
pnpm public-website:portfolio -- apply <slug> --message "<por qué>" --dry-run
pnpm public-website:portfolio -- apply <slug> --message "<por qué>"
```

Queda como borrador. `apply` guarda contra la revisión de la que partiste: si alguien guardó entre medio responde
`eop_conflict` y no pisa nada.

### 4. Publicar (con el OK del operador)

```bash
pnpm public-website:portfolio -- publish <slug> --message "<referencia de la aprobación>" --dry-run
pnpm public-website:portfolio -- publish <slug> --message "<por qué>"
pnpm public-website:portfolio -- verify <slug>
```

### 5. Volver atrás

```bash
pnpm public-website:portfolio -- revisions <slug>
pnpm public-website:portfolio -- restore <slug> <revisión> --message "<por qué>"
pnpm public-website:portfolio -- unpublish <slug> --message "<por qué>"
```

Si un proyecto sale del portafolio para siempre, su URL no debe quedar en 404: `redirect-retired-entry.php` la
manda (301) a la entrada que ahora tiene ese trabajo y redirige directo allí las URL viejas que pasaban por ella.
Primero con `"apply": false` (plan), después `true`, con el OK del operador:

```bash
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/redirect-retired-entry.php --input-file retiro.json --wp-user 12
```

`retiro.json`: `{ "from": "<slug retirado>", "to": "<slug destino>", "apply": false }`. Se niega si el retirado sigue
publicado o el destino no lo está.

### Editar un proyecto que ya existe

```bash
pnpm public-website:portfolio -- pull <slug>
# editar tmp/portfolio/<slug>/working.json
pnpm public-website:portfolio -- diff <slug>
pnpm public-website:portfolio -- validate <slug>
pnpm public-website:portfolio -- apply <slug> --message "<por qué>"
```

La CLI envía el documento completo: lo que esté en `working.json` es lo que queda. Por eso parte siempre de un `pull`
reciente, nunca de una copia vieja.

El admin de WordPress todavía no tiene campos para los tipos nuevos (`specs`, `ai`, `search` y los campos de pieza
`channel`, `version`, `consentRef`, `aiStage`…). Al guardar desde el admin, el plugin **conserva** esos campos tal como
estaban (los vuelve a copiar de la revisión guardada si el formulario no los trae), así que editar el texto de un
proyecto social o de IA en el admin no los borra. Para cambiar esos campos, usa la CLI.

## Recetas por tipo de proyecto

Todos los tipos comparten la base: `client`, `title`, `audience`, `need`, `line`, `services` (claves de `schema/services.v1.json` del plugin: sólo líneas de negocio —`creative-services`, `digital-services-engineering`, `revenue-operations-crm`, `media-distribution`, `growth-strategy-measurement`, `channel-commerce`—, nunca product brands como Wave o Creative Studio),
`steps` (reto, idea, ejecución), `seo` (título completo de 65 caracteres o menos; descripción de 150 o menos),
`hero.mediaRef` (el `id` de un medio de algún capítulo) y `chapters` con sus `media`. Reglas que el validador hace
cumplir en todos:

- todo medio lleva `id` único, `width`, `height` y `alt`;
- una imagen usa `mediaId`; un video usa `src` y `poster` del bucket de AXIS y, si `hasVoice`, `captionsVtt`;
- toda cifra de `results` lleva `source`; un `percent` va de 0 a 100, sin el signo;
- ningún texto lleva HTML; los enlaces van en `https`;
- un campo de pieza sólo va en su rol (por ejemplo, `channel` fuera de un `post` da `INVALID_SHAPE`).

| Tipo (`kind`) | Plantilla | Lo obligatorio propio del tipo |
|---|---|---|
| `campaign` (o sin `kind`) | `campaign.json` | Nada extra. Piezas con su formato real. |
| `social` | `social.json` | Piezas con `role: "post"` y `channel`. |
| `audiovisual` | `audiovisual.json` | Hero en video; cortes con `role: "cut"` y `version`; rodaje con `role: "bts"` y `consentRef`. |
| `ai-production` | `ai-production.json` | El bloque `ai` con `models` y `teamDid`; piezas con `role: "ai"` y `aiStage`. |
| `seo-content` | `seo-content.json` | El bloque `search` con `source`, `period` y al menos una cifra; para publicar, `metrics` en el alcance. |

### Proyectos con varias campañas (explorador, 0.9.0)

Un proyecto con **dos o más capítulos** se muestra como un explorador: cada capítulo es una fila con su periodo,
mercados, una línea y tres miniaturas, y al abrirla aparecen sus piezas. Se ven tres y el resto queda tras «Ver N
campañas más»; si los capítulos cubren dos o más mercados, aparece un filtro por mercado. Con un solo capítulo la
galería sigue como antes. Cada capítulo puede declarar, además de `name`, `note` y `media`:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `period` | Cuándo se hizo, en texto | `"Noviembre 2025"` |
| `markets` | Mercados, de esta lista: `cl`, `pe`, `ar`, `uy`, `br`, `us`, `mx`, `co`, `ec`, `bo`, `py`, `es` | `["cl", "br", "us"]` |
| `summary` | Una línea sobre la campaña (si falta, se usa `note`) | `"La oferta del año, del 26/11 al 03/12."` |
| `madeWithAi` | `true` si sus piezas se hicieron con IA: la fila muestra «Producido con IA» | `true` |

El testimonio acepta `highlight`: una frase **copiada tal cual de la cita** que se muestra en negrita (si no está
dentro de la cita, el validador da `UNKNOWN_REFERENCE`). El logo del cliente va en `client.logoMediaId` (una imagen de
la biblioteca, idealmente su versión negativa porque se ve sobre fondo oscuro) y sólo se muestra si la aprobación
incluye `logo`.

`madeWithAi` declara la IA **sólo en esa campaña**. No uses el rol `ai` en un proyecto de campañas: marca todo el
proyecto como «Producido con IA». Ejemplo vivo: la entrada de Sky Airline (revisión 2, 2026-10-30), con cinco campañas.

### Roles de pieza y sus campos

| `role` | Campos | Obligatorio |
|---|---|---|
| `post` | `channel`, `placement`, `postText`, `postedAt` (AAAA-MM-DD) | `channel` |
| `cut` | `version`, `where`, `durationSeconds` (sólo en video, de 0,5 a 7200) | `version` |
| `bts` | `consentRef` (dónde quedó la autorización de quienes aparecen; **nunca se publica**) | `consentRef` |
| `ai` | `aiStage`, `label`, `compareTo` (el `id` de otra pieza del proyecto) | `aiStage` |
| `banner` | `size` (por ejemplo «1200 × 628») | — |

Valores válidos:

- `channel`: `instagram`, `facebook`, `linkedin`, `x`, `tiktok`, `youtube`, `threads`, `pinterest`.
- `placement`: `feed`, `story`, `reel`, `carousel`, `document`, `post`, `short`, `video`, `pin`, `thread`.
- `aiStage`: `anchor`, `angle`, `expression`, `pose`, `plate`, `scene`, `final`.
- `ai.models[].stage`: `image`, `video`, `voice`, `music`, `upscale`, `compositing`, `other`.
- `search.aeo.engines`: `chatgpt`, `gemini`, `perplexity`, `ai-overviews`, `copilot`, `claude`.
- `search.contents[].type`: `article`, `guide`, `comparison`, `service-page`, `faq`, `other`.

Los roles `web`, `section` y `ugc` (sitios, partes de una página, videos de creadores) se explican en el
[manual hermano](operar-portafolio.md#sitios-web-partes-de-un-sitio-y-videos-de-creadores).

### Social media

- Una pieza por publicación real, con `postText` copiado del post tal como salió y `postedAt` cuando se conozca.
- El marco de cada red y su isotipo oficial los pone la página: no subas capturas con la interfaz de la red.
- Nunca pongas cifras en los marcos ni en `postText` que no estén publicadas. Las métricas van en `results`, con su
  fuente, y se ven sólo si el alcance incluye `metrics`.
- Con tres o más publicaciones, el hero las pone a orbitar la marca; «Canal por canal» arma una pestaña por canal.

### Producción audiovisual

- El `hero.mediaRef` apunta a un video (la pieza madre).
- Cada versión es un `cut` con `version` («Pieza madre», «Corte de 15 s», «Vertical»), `where` y `durationSeconds`.
  Mide la duración, no la estimes:

  ```bash
  ffprobe -v error -show_entries format=duration -of csv=p=0 <video.mp4>
  ```

- Las fotos o videos de rodaje son `bts` con `consentRef`. Sin la autorización de quienes aparecen, no los cargues.
- `specs` arma la ficha técnica (hasta 10 pares `label`/`value`). Con tres o más `credits`, los créditos suben al final.

### Producción con IA

- El bloque `ai` es obligatorio: `models` (cada uno con `stage` y `name`, por ejemplo modelo y versión), `teamDid` (lo
  que hizo el equipo) y, opcionales, `aiDid` y `fictional: true` si el personaje no existe. La página declara siempre
  «Producido con IA»; no hay forma de ocultarlo.
- Las piezas son `ai` con su `aiStage` y un `label` corto («De frente», «Perfil», el nombre de la expresión).
- Para el antes y después, la pieza `plate` lleva `compareTo` con el `id` de la pieza `final`. Si el id no existe, el
  validador responde `UNKNOWN_REFERENCE`.

### SEO, AEO y contenidos

- `search.source` y `search.period` son obligatorios, y hace falta al menos una cifra entre `highlight`, `kpis`,
  `series`, `query`, `keywords` o `aeo`.
- Si `series` trae `compare`, debe tener tantos puntos como `values`.
- `contents` lista los contenidos publicados con su `url` real.
- Los banners de apoyo son piezas `banner` con `size`.
- **Las cifras sólo se muestran si la aprobación incluye `metrics`.** Sin ese alcance, un proyecto `seo-content` no se
  publica (`APPROVAL_SCOPE_METRICS`): la página quedaría vacía.
- La posición media sólo se informa con un piso de impresiones declarado en la fuente. No inventes cifras: si un dato
  es de ejemplo, no va a un documento real.

### Marketing de contenidos

- `kind: "content-marketing"` necesita `articles`: cada uno con su `title` y `url` publicados, `excerpt` (copia el
  primer párrafo tal como está publicado, sin reescribirlo), `published` (YYYY-MM), `label` corto, `swatch` (`name` y
  `code` tal como el cliente los imprime en sus piezas y `color` en hexadecimal tomado de la pieza) y `pieces`, los ids de
  sus piezas en los capítulos: banners (`banner`, con `caption`) y publicaciones (`post`, con `channel` y `placement`).
- `production` es la cifra del mes (`period`, `source`, hasta 4 `items` con un número entero) y `process`, de 3 a 6
  pasos. Ambos describen el trabajo de Efeonce: salen con `pieces`.
- No exige `metrics`. Si el cliente autoriza sus cifras, van en `results`/`measure` o en `search` con el alcance `metrics`.
- Cada capítulo puede llevar `swatch` (#hex) para teñir su fila; el proyecto puede llevar `links.liveWork`.
- Caso de referencia: Berel (`berel-pitaya-color-del-ano-2026`, 2026-10-30).

### Servicios con su página de venta

- `links.relatedServices` lista los slugs de las páginas del sitio donde se vende cada servicio del proyecto (por
  ejemplo `agencia-creativa`, `redes-sociales`, `servicio-marketing-de-contenidos`). «Detrás del trabajo» los muestra
  como enlaces con el título de la página; un slug que no es una página publicada no aparece.
- Todo proyecto nuevo debe declararlos: sin ellos, los servicios quedan como texto y el caso no conecta con la venta.

### Escribir `need`

- La ficha lo muestra como «{Cliente} necesitaba {need}»: escríbelo para que siga a «necesitaba» (una frase nominal o un
  infinitivo, sin punto final), por ejemplo «Lanzar campañas comerciales en días sin descuidar la marca».
- En los textos del proyecto habla en primera persona plural; nunca «Efeonce hizo…».

### La guarda de plantilla

Las plantillas traen marcadores para que nada de relleno llegue al sitio. Cuentan como pendientes:

- cualquier texto con `[COMPLETAR…`, `COMPLETAR-slug` o `/COMPLETAR`;
- cualquier `"mediaId": 1`.

`validate` los lista y `apply` se niega a enviar nada mientras quede uno (comprobado: una plantilla social recién
creada deja 28 pendientes).

## Las demás herramientas

### Desplegar el plugin

Gates en el repo del runtime antes de empaquetar:

```bash
cd /Users/jreye/Documents/efeonce-public-site-runtime
php tests/eo-portfolio.test.php
tests/playground/run-eo-portfolio.sh
```

La primera es la prueba unitaria del validador, la compuerta y la proyección (el 2026-10-30: 498 comprobaciones sobre
8 fixtures). La segunda levanta un WordPress Playground descartable, corre el e2e y las comprobaciones del admin y de
las páginas, y luego ejercita `wp eo-portfolio` como lo haría un agente por SSH.

Desde `greenhouse-eo`, con el OK del operador para el despliegue:

```bash
pnpm -s public-website:export-live-code -- --output tmp/public-site-code-baselines/portfolio
node scripts/public-website/build-portfolio-plugin-package.cjs tmp/public-site-code-baselines/portfolio
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/deploy-portfolio-plugin-package.php \
  --input-file tmp/portfolio-plugin-release/package.zip --input-file tmp/portfolio-plugin-release/manifest.json --wp-user 12
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/purge-portfolio-cache.php --wp-user 12
```

1. `export-live-code` toma la foto del código vivo (línea base).
2. `build-portfolio-plugin-package.cjs` arma `tmp/portfolio-plugin-release/` con cada archivo del plugin, su SHA y el
   SHA que tiene el sitio. Se niega si el plugin tiene cambios sin commitear en el repo del runtime.
3. `deploy-portfolio-plugin-package.php` valida la lista de archivos permitidos y los hashes, se niega si un archivo
   vivo cambió desde la línea base o si `/portafolio/` tiene páginas hijas, guarda un tar de respaldo, escribe el
   archivo principal al final y activa el plugin.
4. **Un despliegue de código no purga la caché de página** (un guardado de proyecto sí). Corre
   `purge-portfolio-cache.php` siempre que el cambio toque el marcado. El borde de Cloudflare suelta la copia vieja en
   uno o dos minutos. Compruébalo con el `?ver=<versión>` de `portfolio.js` en el HTML de `/portafolio/`.

Rollback: `wp plugin deactivate eo-portfolio` por el carril SSH y restaurar el tar que imprime el despliegue.

### Revisión local con WordPress Playground

| Comando (en el repo del runtime) | Para qué |
|---|---|
| `tests/playground/serve-eo-portfolio.sh` | WordPress local descartable en `http://127.0.0.1:9400/wp-admin/admin.php?page=eo-portfolio`, con sesión de admin y cuatro fixtures cargados (Sky, ANAM y el de sitio como borradores; PabellonToGo publicado). Sirve para revisar el admin. No toca ningún sitio real. |
| `tests/playground/run-eo-portfolio.sh` | El e2e completo y las comprobaciones de admin y páginas (incluye los fixtures de los tipos nuevos). Es el gate antes de empaquetar. |
| `php tests/eo-portfolio.test.php` | Prueba unitaria rápida, sin WordPress. |

Los fixtures viven en `tests/fixtures/portfolio/` del runtime (uno por tipo: `aurora-social.json`,
`aurora-audiovisual.json`, `lumen-ia.json`, `norte-seo.json`, más los de campaña y sitio). Llevan la marca
`[fixture]`: sirven de forma de ejemplo, **nunca se aplican en producción**.

### Scripts de la migración desde Ohio

Todos corren con `pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/<script> [--input-file <json>] --wp-user 12`.
Ya se usaron en `TASK-2046` y `TASK-2049`; quedan como referencia y para rollback.

| Script | Qué hace | Escribe |
|---|---|---|
| `inventory-ohio-portfolio.php` | Inventario y foto de rollback de las entradas `ohio_portfolio`. | Nada |
| `export-ohio-real-entries.php` | Export de las 15 entradas reales (campos, imágenes con dimensiones, SEO). | Nada |
| `build-migration-documents.cjs` (con `node`) | Arma los documentos `portfolio-entry.v1` y el mapa de redirects a partir del export y del mapa versionado. | Sólo archivos locales |
| `retire-ohio-demos.php` | 410 para los demos, demos a borrador, comentarios cerrados. | `dryRun` por defecto |
| `clean-ohio-real-entries.php` | Limpia restos de demo en las 15 reales. | `dryRun` por defecto |
| `apply-portfolio-bundle.php` | Carga un lote `{"projects":[…]}` (todo o nada); `"publish": true` publica, `"update": true` cambia existentes con su `revision`. | Producción |
| `import-portfolio-media.php` | Lleva a la biblioteca piezas que el sitio ya sirve y devuelve su `mediaId`. Idempotente. | Producción |
| `upload-portfolio-images.php` | Sube imágenes nuevas desde archivos locales a la biblioteca (manifiesto `source` + `files` y una `--input-file` por imagen) y devuelve `mediaId`, ancho y alto. Idempotente por `_eop_source`. Los videos no: van al bucket de AXIS. | Producción |
| `redirect-retired-entry.php` | Redirige (301) un proyecto retirado a otro y reapunta las redirecciones que pasaban por él. Plan primero. | Producción |
| `cutover-ohio-to-portfolio.php` | 301 de `/project/<slug>/` a `/portafolio/<nuevo>/`, encadena los redirects previos y pasa la entrada Ohio a borrador. | `dryRun` por defecto |
| `redirect-portfolio-categories.php` | Un 301 de `/portfolio-category/…` a `/portafolio/`. | `dryRun` por defecto |
| `set-portfolio-switch.php` | Interruptor de las páginas (`0`, `preview`, `1`), orden de la portada y cifras de la agencia. | Producción |
| `purge-portfolio-cache.php` | Purga la caché de página del portafolio. | Sólo caché |

Los que tienen `dryRun` por defecto sólo escriben con `"dryRun": false` en el JSON de entrada. Antes de mutar
producción, toma una foto (inventario o `revisions`) y, después, purga la caché.

## Qué significan los estados o señales

| Señal | Significado |
|---|---|
| `○ borrador` / `● publicado` | Estado del proyecto en `list`. Un borrador no se ve en el sitio ni en la REST. |
| `! Quedan N marcador(es)` | Hay texto de plantilla o `mediaId` 1 sin reemplazar. `apply` no guardará. |
| `Tiene aprobación del cliente con alcance` | La compuerta de publicación pasa. No revisa marcadores. |
| `eop_invalid` | El documento no cumple el esquema del sitio. No se guardó nada. |
| `eop_conflict` | Alguien guardó desde tu `pull`. Nada se pisó. |
| `eop_approval_required` | Falta la aprobación con referencia, fecha y alcance. |
| `eop_publish_gate` | El cambio dejaría sin aprobación a un proyecto publicado: despublícalo antes. |
| `eop_slug_taken` | Ya existe una página en `/portafolio/<slug>/`. |
| `eop_restore_noop` | La revisión que quieres restaurar es igual a la vigente. |
| `APPROVAL_SCOPE_METRICS` | Proyecto SEO sin `metrics` en el alcance. |
| `APPROVAL_SCOPE_CREATORS` | Proyecto de videos de creadores sin `creators` en el alcance. |
| `UNKNOWN_REFERENCE` | `hero.mediaRef` o `compareTo` apunta a un `id` que no existe en los capítulos. |
| `REQUIRED … /consentRef` | Una pieza de rodaje sin la referencia de autorización. |
| `INVALID_SHAPE` | Un campo puesto en un rol que no le corresponde, o `durationSeconds` en una imagen. |

## Qué no hacer

- No correr `apply`, `publish`, `unpublish` ni `restore` sin el OK del operador para esa acción.
- No publicar sin la aprobación del cliente registrada fuera del sitio. La `ref` es opaca: nunca un correo o un nombre.
- No inventar cifras, textos de posts ni duraciones. Si algo es de ejemplo, no va a un documento real.
- No cargar fotos de rodaje sin la autorización de quienes aparecen, ni poner esa autorización en un campo público.
- No dibujar ni subir logos de redes: la página usa los isotipos oficiales.
- No subir videos a la biblioteca de medios: van al bucket público de AXIS.
- No editar `post_content` ni las meta `_eop_*` a mano.
- No aplicar fixtures en producción.
- No cargar tipos nuevos (`social`, `audiovisual`, `ai-production`, `seo-content`) antes de que la 0.8.0 esté
  desplegada: el sitio los rechaza.
- No dar por desplegado el plugin sin purgar la caché y comprobar el `?ver=` en vivo.

## Problemas comunes

- **`apply` dice «Quedan marcadores de plantilla sin completar»:** corre `validate <slug>` para ver las rutas y
  reemplázalas. Revisa también los `mediaId` 1.
- **El sitio rechaza un tipo nuevo (`UNKNOWN_FIELD` en `channel`, `version`, `aiStage`…), aunque `validate` local
  pasó:** el sitio corre una versión anterior a la 0.8.0 (en producción desde el 2026-10-30). Revisa la versión
  instalada y despliega el paquete; compruébalo con `validate <slug> --remote`.
- **`UNKNOWN_REFERENCE` en `compareTo`:** el `id` del `plate` debe apuntar a otra pieza que exista; revisa que el `id`
  de la `final` sea exactamente ese.
- **`APPROVAL_SCOPE_METRICS`:** agrega `metrics` al `scope` sólo si el cliente aprobó mostrar las cifras. Si no, el
  proyecto SEO no se publica.
- **`REQUIRED` en `consentRef`:** registra dónde quedó la autorización de quienes aparecen y ponla en la pieza `bts`.
  Si no existe, saca la pieza.
- **Después de desplegar, el sitio sigue mostrando la versión anterior:** corre `purge-portfolio-cache.php`, espera uno
  o dos minutos y revisa el `?ver=` de `portfolio.js` en el HTML.
- **`verify` dice que el índice y la entrada no coinciden:** purga la caché y vuelve a verificar.
- **`new` dice que el slug ya existe:** usa `pull <slug>` para editarlo.
- **`No se pudo correr el validador local`:** revisa que tengas `php` y que `PUBLIC_SITE_RUNTIME_ROOT` apunte a un repo
  con `wp-content/plugins/eo-portfolio/`.
- **`Salida inesperada del sitio`:** corre `pnpm public-website:ssh-check`; suele ser el carril SSH.

## Referencias técnicas

- CLI: `scripts/public-website/portfolio/cli.ts` (comandos), `local.php` (validador y proyección sin WordPress),
  `remote.php` (puente a `wp eo-portfolio`, con lista cerrada de subcomandos), `templates/` (ver su `README.md`).
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/`: `schema/portfolio-entry.v1.schema.json`,
  `includes/class-eop-validator.php`, `class-eop-projection.php`, `class-eop-store.php`, `class-eop-kinds.php`,
  `class-eop-admin.php` (conserva los campos que el formulario no edita).
- Paquete y despliegue: `scripts/public-website/build-portfolio-plugin-package.cjs`,
  `scripts/public-website/deploy-portfolio-plugin-package.php`.
- Migración: `scripts/public-website/eo-portfolio/` (ver su `README.md`).
- Arquitectura: [PUBLIC_SITE_PORTFOLIO_V1](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md) §7.3 (tipos de
  proyecto). Decisión: [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md).
- Tasks: `TASK-2047` (plugin y CLI), `TASK-2048` (portada y entrada), `TASK-2049` (migración y tipos de proyecto).
