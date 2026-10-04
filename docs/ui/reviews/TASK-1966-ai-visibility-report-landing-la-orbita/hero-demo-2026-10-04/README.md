# Hero demostrativo · AI Visibility Report · 2026-10-04

Estado: Think `6aab90731c3a96111d77d23a7e0b5f87b9d712ff` comprometido y empujado a `origin/main` con autorización del operador el 04/10. Remoto verificado por ls-remote; Vercel en despliegue al consultar. Readback público pendiente. Documentación Greenhouse local para no incluir los commits previos `39c197442` y `b9f7e314f` de Insights, todavía no publicados cuando se verificó el remoto.

## Dirección

Se conserva la identidad oficial Engine, lockup y pregunta–respuesta. El hero anterior separaba la animación del mensaje con una reserva absoluta en tablet/móvil; ahora usa grid y flujo normal. Escena: pregunta → texto de respuesta → énfasis sobre una marca → fuente citada. Siempre rotulada como ejemplo, sin resultados reales ni logos de proveedores que atribuyan la respuesta a un motor. Se usa el SVG orbital oficial sin modificarlo. Navy/papel y un único acento desde el adapter existente.

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
