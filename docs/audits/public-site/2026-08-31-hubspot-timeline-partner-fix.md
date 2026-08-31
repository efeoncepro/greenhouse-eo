# HubSpot: timeline y bloque de partner

Fecha: 2026-08-31. Página 244079, `/servicios-contratar-hubspot/`.
Autorización: dos comentarios del operador sobre el timeline roto y la reducción del bloque de partner
a sus dos primeras columnas, con badge mayor. El resto del diseño y metadatos queda protegido.

## Diagnóstico y dirección

Corrección `ui-lite`, source-led: se extienden los widgets nativos existentes, sin nueva pantalla o primitive.
Fuente intacta: `Documents/landing hubspot/HubSpot services offer/Landing HubSpot Pillar.dc.html`,
SHA `f95b6254c2434b58a4d6855dded40dd3a38acb19b881e090e1928674ab8bb812`.
La versión anterior imponía fondos blancos/azules a los controles del timeline. El JavaScript seleccionaba
paneles, pero dejaba congelados el punto activo, los puntos completados y el ancho de la línea del export.

Se restaura el control transparente, señal terracota del diseño, puntos 10/16 px (hover 13 px), halo activo,
etiquetas y avance 0/25/50/75/100%. Se reutilizan tokens de fuente, color, borde y motion del export.
Se conserva contenido, selección directa, flechas/Inicio/Fin, foco visible, paneles SSR y reduced motion.
Se rechaza reinterpretar el timeline como botones llenos o cambiar su narrativa/composición.

El bloque inferior conserva «HubSpot Solutions Partner Gold» y «En el directorio de HubSpot».
Se elimina la columna «Trazabilidad, no promesas» del template y sus tres controles sin renumerar los demás.
Sus valores históricos guardados no se reescriben. Badge original 58→116 px en escritorio y 96 px en móvil;
dos columnas en escritorio, apiladas bajo 700 px, enlace al directorio conservado.

## Alcance técnico

Cinco archivos del plugin: CSS `hubspot-elementor`, JS `hubspot-landing`, templates `delivery`/`proof-ledger`
y schema de controles `proof-ledger`. Sin cambios en formulario, otros módulos, theme, header/footer,
title, metadescripción, schema SEO, URL ni datos Elementor.
El compilador incorpora estas adaptaciones después de extraer los campos, evitando que una recompilación
restaure el defecto o desplace sus claves. Dry run sin escrituras verificó schema, contenido y claves estables.

## Verificación

PHP: 188 campos de texto raíz editables y escapados, repeaters y ausencia de controles de formulario duplicados.
Preview local sobre HTML público: 30 estados verificados (cinco etapas × tres viewports × dos preferencias
de movimiento), fondos transparentes, geometría/color de puntos, progreso, panel correcto, ausencia de overflow,
foco y teclado. Se inspeccionaron capturas desktop 1414×909 y móvil 390×909 frente al timeline de la fuente.
Script: `node scripts/public-website/verify-hubspot-timeline.cjs --preview`; sin flag comprueba producción
sin interceptar respuestas y añade fallback sin JavaScript. No envía formularios ni crea leads.

Se usa Playwright focalizado para interceptar únicamente los archivos del preview y verificar estados/computed
styles en el renderer WordPress real; las capturas y JSON viven en `.captures/hubspot-visual-fix-20260831/`.
Resultado público posterior a propagación: **PASS**, los mismos 30 estados, teclado/foco y cinco paneles
visibles sin JavaScript. Cero pageErrors, sin overflow en 1414/768/390 px; dos columnas en escritorio y una
en móvil, badge 116/96 px. Capturas live inspeccionadas. Title/meta description/SEO graph y redirects PASS.
[Evidencia de preview y producción, manifest y readback](2026-08-31-hubspot-timeline-partner-evidence.json).
El primer intento live recibió cache anterior; se repitió tras propagación, sin republicar. Otra pasada detectó
overflow transitorio al llevar el puntero desde las etapas hasta el header global; la prueba final mueve el
puntero debajo de la etapa, espera geometría estable y sigue exigiendo `scrollWidth === innerWidth`.
No se modificó el header para acomodar el test. QA general advisory y cierre documental ejecutados.

## Publicación y rollback

Snapshot WordPress: `_gh_hubspot_visual_fix_20260831_102751`.
Backup de los cinco archivos: `/tmp/eo-hubspot-before-20260831-103126.tar` (comprobar retención antes de usar).
Manifest local: `tmp/hubspot-visual-fix/manifest.json`; SHA previo contrastado contra runtime antes del write.
Readback posterior coincide con el SHA nuevo de cada archivo. Post y árbol Elementor conservados,
hash `b44adec9c6120b94bab004fa4d5d162ef7e5c8e53835288b47551cd880ada151`; Home y Creative intactas.
El guard posterior alertó por `_elementor_page_assets`, cache derivada que clear_cache elimina; se inspeccionó
el diff completo: sólo esa cache, `_elementor_css` y `_elementor_element_cache`. No hubo drift editorial,
de metas Ohio, imagen o Yoast. No se reejecutó la publicación.

Rollback autorizado: contrastar hashes actuales con manifest, restaurar sólo esos cinco archivos desde backup,
invalidar cachés Elementor/Kinsta y verificar públicamente. No restaurar todo el post ni sus metas.
Sin commit/push, sin cambio de rama o worktree, sin deploy general de Greenhouse.
