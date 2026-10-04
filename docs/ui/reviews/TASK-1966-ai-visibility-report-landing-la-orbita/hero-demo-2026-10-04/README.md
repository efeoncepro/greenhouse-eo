# Hero demostrativo · AI Visibility Report · 2026-10-04

Estado vigente al cierre del 04/10: Think `6aab907` (hero) y `56a300a` (ancho acotado) publicados en `origin/main`, Vercel success y readback público 1710/2560 confirmado. Hover azul profundo `06449ca` comprometido sólo local; sin push. Producción conserva Entrega primero; el contrato candidato Marca primero no se activó. Documentación Greenhouse local.

## Corte inicial del hero · histórico

Los apartados Dirección y Verificación local registran la primera iteración. El control visible y hover pálido descritos allí fueron sustituidos por los ajustes posteriores de este dossier. Capturas antiguas se conservan como historia; las vigentes para cada ajuste se identifican abajo.

## Dirección

Se conserva la identidad oficial Engine, lockup y pregunta–respuesta. El hero anterior separaba la animación del mensaje con una reserva absoluta en tablet/móvil; ahora usa grid y flujo normal. Escena: pregunta → texto de respuesta → énfasis sobre una marca → fuente citada. En esta primera iteración se rotulaba visiblemente como ejemplo, sin resultados reales ni logos de proveedores que atribuyan la respuesta a un motor. Se usa el SVG orbital oficial sin modificarlo. Navy/papel y un único acento desde el adapter existente.

Se descartó agrandar las tarjetas abstractas (no explica el producto) y añadir un video/autoplay externo (innecesario para esta secuencia). Dirección elegida: demostración legible en DOM/CSS, con una sola órbita y sin dependencias nuevas. La composición y tiempos son una propuesta de esta superficie autorizada para implementar, no una nueva norma de AXIS.

- Escritorio: texto/CTA y escena lado a lado. Tablet/móvil: titular, explicación, motores, escena, CTA.
- Copy: «Descubre cómo aparece tu marca, quién aparece en su lugar y qué mejorar primero».
- Botones: contraste, borde de acento y avance breve de flecha; presión con borde interno. Se elimina elevación del embed sólo en esta landing, sin cambiar el renderer compartido ni sus botones secundarios.
- Pausa secundaria integrada en el pie de la escena; área 44 px y nombre accesible. Escena gráfica aria-hidden y descripción textual estable, sin anuncios repetidos.
- Fallback sin JS/reduced-motion: ejemplo completo y estable. La pausa detiene todos los elementos, incluida la órbita. Se conserva suspensión por visibilidad de pestaña e IntersectionObserver.

## Verificación local

- Think type-check: 0 errores / 0 warnings, 17 hints existentes.
- Think build: PASS.
- CUA con renderer real y contrato candidato, envíos deshabilitados: 360, 390, 698, 1024 y 1440 px sin overflow horizontal. Revisión visual en móvil, tablet y escritorio.
- Pausa: todos los seis elementos animados reportan animation-play-state paused. Reanudar devuelve data-playing true; CTA al formulario la pone en false por salir de pantalla.
- Reduced motion emulado: ninguna animación activa, pausa oculta, escena legible. Emulación retirada después de QA.
- CTA conserva foco en brand-visibility-form-title.
- Hover Reintentar en localhost:4331: papel azul/navy, transform none, verificado en el botón señalado por el operador; captura retry-hover.png.
- Hover Continuar: navy/blanco → papel azul/navy, borde azul y halo de foco, transform none. Avanza Marca → Mercado y Atrás retorna correctamente. Sólo fixture sintética preexistente; sin aceptar consentimiento, CAPTCHA ni enviar.
- Capturas desktop-1440.png y mobile-390.png: estado estable de movimiento reducido. La banda inferior identifica el entorno QA; no es parte de la landing productiva.
- No se acredita un nuevo smoke de entrega, PDF o correo real ni validación visual del operador. No se altera el orden publicado del contrato.

## Error local del formulario: causa verificada

GET público del formulario 69cd5269-5f97-4d32-99c4-0b23f41aa2f5 contra greenhouse.efeoncepro.com devuelve HTTP 200 en ambos casos, pero:

- Origin http://localhost:4331: sin Access-Control-Allow-Origin.
- Origin https://think.efeoncepro.com: Access-Control-Allow-Origin https://think.efeoncepro.com.

El browser local no puede leer la respuesta cross-origin. El resolver src/app/api/public/growth/forms/cors.ts obtiene los orígenes de surfaces activas y falla cerrado ante un origen desconocido. No se amplió la allowlist, no se cambió seguridad y no se ocultó el error. No es un fallo del nuevo hero.

Revisión completa: http://localhost:4332/brand-visibility con el harness existente scripts/growth/preview-ai-visibility-landing.cjs, contrato candidato compilado y POST deshabilitado. La landing normal de desarrollo sigue en localhost:4331 y conserva ese error CORS al intentar usar producción.

## Archivos runtime

Think: src/pages/brand-visibility/index.astro, src/components/EngineHeroOrbit.astro, src/components/BrandVisibilityFormDock.astro. No cambios de backend, forma, rutas de informe ni PDF.

## Ajuste posterior del operador · control directo

Se retiran «Cómo funciona» de la cabecera y el pie visible «Ejemplo ilustrativo · No es un resultado real / Pausar», como pidió el operador. La descripción ilustrativa se conserva para lectores de pantalla. La escena completa es el área de un botón nativo transparente con nombre accesible Pausar/Reanudar demostración; admite clic, toque, Enter y espacio, con foco visible de teclado. Sin JS o con movimiento reducido, el control está oculto y queda el ejemplo estático.

CUA: clic detiene los seis elementos animados; Enter reanuda y espacio vuelve a pausar. Captura actual: hero-click-to-pause.png. Las capturas anteriores documentan la versión previa al retiro del pie y del enlace de cabecera. Type-check sin errores ni warnings; 17 hints existentes. Este ajuste está incluido en Think `6aab907`, empujado a main.

## Corrección de pantalla amplia · posterior a 6aab907

El operador reportó espacios excesivos en Think. Comparación DOM al mismo viewport de 1710 × 1000: producción y QA tenían idénticos topbar (98 px), hero-grid (963,24 px), escena (675,24 × 675,24 px) y comienzo de formulario (y=933,24). La diferencia de altura del formulario corresponde al contrato candidato de QA, no altera el inicio. El cambio de ancho de ventana explica la discrepancia percibida, no un asset/CSS distinto del hero.

Causa: grid de ancho de viewport sin límite; la escena tiene aspect-ratio 1, por lo que su ancho empuja la altura de toda la fila. Padding inferior de 200 px y encabezado/aire superior de 186 px amplificaban el vacío. El texto sólo ocupaba 310 px. Faltó QA en pantallas superiores a 1440 antes del push anterior.

Arreglo publicado en `56a300a`: cabecera y hero comparten el shell acotado a 1360 px del resto de la página, escena con max-width 500 px, aire superior/inferior ajustado. Se mantiene en móvil el flujo y padding previos. A 1710 px: escena 500, formulario y=678. A 2560 px: mismos 500 y 678. A 1024 y 360 sin overflow ni solape titular/escena; inspección visual 1710/360. Type-check 0 errores/warnings (17 hints existentes), build PASS. Corrección empujada a main en `56a300a` por pedido del operador; Vercel success. Captura local: wide-fix-1710.png (estado reducido para captura; emulación retirada).


Readback público de `56a300ada317ea17fdfd63c40c4a1cb9469b1560`: Think a 1710 y 2560 px conserva hero de 1360 px, escena de 500 px y formulario en y=678, sin overflow. Captura production-wide-fix-1710.png. El formulario de producción cargó en Entrega, su orden vigente; no se envió ni se activó el contrato candidato de QA. Documentación Greenhouse sigue local, separada del push de Think.


## Ajuste local del color de hover

El operador aclaró que el problema es el color. Se retira el celeste pálido del hover primario y se usa mezcla Engine accent 70% / ground 30%, con texto blanco; contraste calculado 6.80:1. No se añaden efectos de borde, flechas ni cambios de geometría. CUA confirmó background color(srgb 0.0188235 0.350588 0.696471), texto blanco y hover activo. Captura form-hover-engine-blue.png. Sólo dos declaraciones CSS, comprometidas en Think `06449ca`; no publicado.

Verificación final sobre esas dos declaraciones: `pnpm type-check` PASS (114 archivos, 0 errores/warnings, 17 hints existentes) y `pnpm build` PASS. Logs de sesión `/tmp/ai-landing-final-check.log` y `/tmp/ai-landing-final-build.log`; la captura anterior conserva la evidencia visual del color. No se agregaron efectos nuevos ni cambios de geometría.

## Cierre documental y skills · 2026-10-04

Tres subagentes revisaron por separado docs funcionales/dirección/motion/wireframe, skill de aplicaciones y runtime/QA. Se sincronizaron TASK-1966, Handoff, changelog y los dos espejos de `efeonce-graphic-line/references/applications.md`. `greenhouse-growth-forms`, `greenhouse-browser-diagnostics` y `greenhouse-ai-design-studio` fueron revisadas: conservan sus contratos, por lo que no requieren edición. No cambian arquitectura, ADR, API, seguridad ni tokens compartidos.

`task:lint --task TASK-1966` y `skills:mirrors` PASS. `docs:context-check:strict`: 0 errores y 0 warnings tras compactar el puntero de Handoff y archivar una entrada completa del changelog con su hash. Se prepararon únicamente hunks propios, conservando WIP ajeno incluso en Handoff/changelog.

El checker de cierre sobre los 14 archivos staged emite tres avisos heurísticos, revisados: `project_context.md` no requiere delta porque no cambia el contrato general; la skill existente actualiza una aplicación (no se registra una skill nueva); TASK-1966 mantiene lifecycle `complete`, confirmado en README y registro. Los pendientes del nuevo hover y del contrato candidato quedan explícitos en la task, sin certificar un rollout nuevo.
