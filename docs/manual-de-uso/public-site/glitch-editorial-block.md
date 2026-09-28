# Bloque editorial Glitch — operar, verificar y revertir

> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.1
> **Creado:** 2026-07-04 por Claude (TASK-1337)
> **Ultima actualizacion:** 2026-09-28 por Claude (inserción desde un agente, caso Glitch Flash 251941)
> **Documentacion tecnica:** `docs/documentation/public-site/glitch-drop-gutenberg-block.md` · `docs/architecture/public-site/PRIMITIVES.md`

## Para que sirve

`Glitch` es un bloque de Gutenberg propio para el POV editorial de Efeonce dentro
de la serie `Glitch de la semana` en `efeoncepro.com/blog`. Se ve como **Glitch**
en el editor; técnicamente es `efeoncepro/glitch-drop`. Renderiza un `aside`
(no una cita), con el wordmark de Glitch y el comentario en cuerpo derecho.

## Antes de empezar

- El bloque ya está **desplegado y activo** en producción (WP 7.0, Kinsta).
- Vive en el plugin `efeonce-editorial-blocks` del runtime repo
  `efeoncepro/efeonce-public-site-runtime` (`wp-content/plugins/`).
- No migra ni toca posts históricos ni citas `core/quote` reales.
- La versión en vivo es la **v0.1.0** (callout v1: panel claro, barra navy, wordmark). El callout «DROP» v2 está
  **aprobado** (`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` §6) pero requiere actualizar
  el plugin; el texto guardado en cada bloque no cambia con esa actualización.
- Se usa en la edición semanal (8 drops por edición desde la #14) y en el Glitch Flash (uno por pieza).

## Cómo se usa (editor)

1. En un post de Glitch, después de resumir la noticia, agrega un bloque nuevo.
2. Busca **Glitch** en el inserter (categoría *Texto*).
3. Escribe el POV de Efeonce en 1–4 frases cortas, separadas con salto de línea. El editor permite negrita,
   cursiva y enlace, pero la convención editorial es **sin enlaces dentro del drop**: el enlace va en el párrafo
   siguiente.
4. Guarda. El bloque se ve como un `aside` con el wordmark arriba.

Cuándo usarlo: interpretación propia de Efeonce sobre una noticia. Cuándo **no**:
citas textuales externas (esas siguen siendo `core/quote`).

## Cómo insertarlo desde un agente (Content Factory)

`GutenbergArticleSpec` todavía no tiene un tipo de bloque para Glitch, y el validador de Content Factory lo
rechaza (`unsupported_gutenberg_block`). La receta vigente, usada en el Glitch Flash 251941 (2026-09-28), es:

1. En el spec, donde va el drop, deja un párrafo marcador con texto único: `__GLITCH_DROP__` (o
   `__GLITCH_DROP_1__`, `__GLITCH_DROP_2__`… si hay varios).
2. Valida y crea el post **privado** como siempre:
   `pnpm public-website:content-factory:run -- --spec <spec.json> --send --author-id <id>`.
3. Guarda un snapshot del `post_content` antes de tocarlo.
4. Con un eval PHP revisado (`pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12`):
   comprueba el ID del post, su manifest y que cada marcador aparezca **una sola vez**; luego `parse_blocks`,
   reemplaza el párrafo marcador por el bloque `efeoncepro/glitch-drop` con el texto en el atributo `content`
   (frases unidas por `<br>`, texto en nowdoc UTF-8), `serialize_blocks` y `wp_update_post(wp_slash(...))`.
5. Lee de vuelta: el marcador ya no existe y hay tantos drops como esperabas.
6. Si el post ya está publicado: purga la caché (`wp cache flush` + `kinsta cache purge --all`) y revisa en vivo que
   cada `aside.gh-glitch-drop` se vea (`offsetHeight > 0`) a 1280 y 390 px.
7. Lee el drop junto a los párrafos vecinos: **ninguno puede repetir su frase**. En 251941 el párrafo siguiente
   repetía el remate y hubo que corregirlo tras la QA en vivo.

Nunca escribas a mano el comentario `<!-- wp:efeoncepro/glitch-drop … /-->`: lo serializa WordPress. Detalle y
propuesta para darle un tipo propio en el spec:
`.claude/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md` (§Glitch Drop sin `kind` y
§Propuesta de extensión).

## Cómo verificar en runtime (WP-CLI gobernado)

Desde `greenhouse-eo`, sin browser, contra el WordPress vivo:

```bash
# Inspección read-only (versión WP, si el bloque está registrado)
pnpm public-website:wpcli -- --eval-file ./ruta/inspect.php
```

Un script de verificación end-to-end (registro → post privado con el bloque →
`parse_blocks` sin invalid block → `do_blocks` rinde `aside` → borrar el post)
está documentado en la spec técnica. La verificación 2026-07-04 pasó completa.

## Qué significan las señales

- `BLOCK_REGISTERED: yes` → el plugin cargó y registró el bloque.
- `PARSE_BLOCKS_RECOGNIZED: yes` → no hay "Invalid block".
- `RENDER_HAS_ASIDE: yes` + `RENDER_NO_BLOCKQUOTE: yes` → semántica correcta.

## Activar / desactivar / revertir

El plugin se desplegó por SSH (scp) al filesystem de Kinsta y se activó con
`activate_plugin()` vía `pnpm public-website:wpcli`. Para revertir:

```bash
# Desactivar (deja los archivos; quita el bloque del inserter y del front-end)
#   eval-file: deactivate_plugins('efeonce-editorial-blocks/efeonce-editorial-blocks.php')
pnpm public-website:wpcli -- --eval-file ./ruta/deactivate.php

# Rollback total (SSH): borrar el directorio del plugin
#   rm -rf "$WP/wp-content/plugins/efeonce-editorial-blocks"
```

- Desactivar es reversible e inofensivo: ningún post público usa el bloque hasta
  que un editor lo inserte. Los posts que ya lo tuvieran mostrarían el bloque
  como no disponible hasta reactivar (dynamic block, el contenido no se pierde).
- Tras cualquier cambio de archivos/plugin en producción, **purgar la caché de
  Kinsta** y verificar el render en el browser.

## Qué no hacer

- No editar el plugin directo en Kinsta sin backportear al runtime repo (evita
  drift; el repo es la fuente de verdad).
- No usar el bloque para citas externas reales.
- No publicar en una edición de Glitch en vivo sin revisión editorial.
- No escribir el markup del bloque a mano ni meterlo en el spec como `core/html`.
- No poner enlaces dentro del drop ni repetir su frase en el párrafo de al lado.

## Problemas comunes

- **"Invalid block" en el editor:** confirma que el plugin está activo y que
  `block.json`/`index.js`/`render.php` están presentes; el bloque es dinámico y
  el contenido vive en el delimitador del comentario.
- **El wordmark no aparece:** falta `glitch-mark.svg` o la caché de Kinsta sirve
  CSS viejo. Verifica el archivo y purga caché.
- **El estilo no aplica en el front-end:** la caché de Kinsta. Purga y revalida.
- **El bloque no se ve en un post publicado (aunque el HTML lo trae):** el tema
  Ohio oculta todo `<aside>` en posts individuales
  (`.single-post aside { display: none !important }`). El bloque ya trae un
  override defensivo (`.gh-glitch-drop.wp-block-efeoncepro-glitch-drop { display: block !important }`);
  si un cambio de estilos lo pierde, el bloque desaparece. Tras editar CSS,
  **redeploy + purgar caché de Kinsta** (el CSS del bloque va inline en el HTML
  cacheado). Verifica con browser real que `offsetHeight > 0`.
- **El bloque sale anidado dentro de una cita / duplicado:** en el editor,
  saca el bloque Glitch fuera del bloque `core/quote` (déjalo a nivel raíz) y
  borra el quote redundante.

## Referencias técnicas

- Contrato: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- Registry: `docs/architecture/public-site/PRIMITIVES.md`
- Recetas de authoring: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- Task: `docs/tasks/**/TASK-1337-glitch-gutenberg-block.md`
