# Bloque editorial Glitch — operar, verificar y revertir

> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-07-04 por Claude (TASK-1337)
> **Ultima actualizacion:** 2026-07-04 por Claude
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

## Cómo se usa (editor)

1. En un post de Glitch, después de resumir la noticia, agrega un bloque nuevo.
2. Busca **Glitch** en el inserter (categoría *Texto*).
3. Escribe el POV de Efeonce en 1–2 párrafos cortos. Solo formato inline
   (negrita, cursiva, enlace).
4. Guarda. El bloque se ve como un `aside` con el wordmark arriba.

Cuándo usarlo: interpretación propia de Efeonce sobre una noticia. Cuándo **no**:
citas textuales externas (esas siguen siendo `core/quote`).

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

## Problemas comunes

- **"Invalid block" en el editor:** confirma que el plugin está activo y que
  `block.json`/`index.js`/`render.php` están presentes; el bloque es dinámico y
  el contenido vive en el delimitador del comentario.
- **El wordmark no aparece:** falta `glitch-mark.svg` o la caché de Kinsta sirve
  CSS viejo. Verifica el archivo y purga caché.
- **El estilo no aplica en el front-end:** la caché de Kinsta. Purga y revalida.

## Referencias técnicas

- Contrato: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- Registry: `docs/architecture/public-site/PRIMITIVES.md`
- Recetas de authoring: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- Task: `docs/tasks/**/TASK-1337-glitch-gutenberg-block.md`
