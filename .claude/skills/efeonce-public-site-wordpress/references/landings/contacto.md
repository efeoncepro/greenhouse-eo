# Contacto `/contacto/` — TASK-1801

Estado live verificado 2026-09-15: página `20729` reconstruida con cinco widgets Elementor propios, Growth Form
`efeonce-contacto`, dos Growth CTA de agenda y narración de Nexa. El hero conserva el header/footer globales,
usa `clb__dark_section`, omite el eyebrow redundante y mantiene una zona de respeto superior para que la imagen
no invada la navegación. Las notas manuscritas de Nexa ocupan una columna editorial separada del retrato desde
1200 px; la frase secundaria se compone en tres versos con sangría progresiva y se oculta antes de que el ancho
pueda provocar un solapamiento. La banda azul de reuniones también usa `clb__dark_section`. El CSS full-bleed se limita
al contenedor de contenido y nunca alcanza el `.page-container` del footer. GVC-style verificado a
1414/890/684/390 px, sin overflow del body. El Growth Form presenta iconos semánticos en sus ocho campos y
dos consentimientos; estos últimos conservan targets de 44 px con una separación visual de 4 px. Los iconos
de consentimiento se insertan antes del `input`: el renderer depende de la adyacencia
`input:checked + span` para pintar el estado marcado y esa estructura no se puede interrumpir. La opción
`Quiero ser parte del equipo` es una bifurcación, no un motivo enviable: conserva el selector para cambiar de
ruta, oculta los demás campos, consentimientos y acción de envío, y muestra un callout único hacia Careers. Su
composición editorial usa la gorra azul con el logotipo completo de Efeonce bordado como héroe visual, sin
etiquetas sobre el objeto; el fondo azul tinta, el titular partido, un CTA único y dos señales discretas mantienen
una jerarquía premium. Al volver a otra opción restaura el formulario completo. La tarjeta de
agenda usa altura intrínseca y comportamiento sticky desde 768 px; en móvil conserva el flujo apilado. El hero
móvil oculta visualmente el H1 y la descripción extensa —el H1 permanece disponible para la estructura
semántica— y ofrece una adaptación editorial propia: `Empecemos por escucharte.` seguido de una explicación
breve del rol de Nexa. Este bloque conserva aire bajo el header, usa balance tipográfico y antecede al retrato;
el audio y los pasos se reservan para desktop porque en móvil duplicaban la explicación y extendían el hero.
La capa azul móvil protege la legibilidad del texto en la zona superior, pero se aligera sobre el rostro y la
ropa para conservar piel, textura y profundidad.

El contrato responsive del formulario separa composición de campos y densidad de opciones. Hasta 767 px,
todos los campos ocupan la fila completa aunque el CSS inyectado por el renderer conserve su grid desktop; el
selector del motivo mantiene dos columnas entre 521 y 767 px y pasa a una sola columna desde 520 px. El CTA
primario ocupa el ancho completo en ambos casos. La verificación debe cubrir la ruta normal y la bifurcación de
Careers a 684 y 390 px, interacción real de ambos consentimientos, teléfono compuesto y
`scrollWidth === clientWidth`.

La revisión editorial y de UX writing del 2026-09-15 fija una sola promesa para la superficie: el mensaje llega
al equipo adecuado. El hero abre con `Cuéntanos qué necesitas`; el formulario pregunta `¿Cómo podemos
ayudarte?` y presenta motivos escritos como intenciones reconocibles. Escribir y agendar son rutas distintas:
los CTA son `Enviar mi mensaje` y `Agendar una reunión`. El consentimiento obligatorio explica el uso puntual
de los datos y el opt-in de contenidos permanece separado. No se promete un plazo de respuesta no gobernado.
El copy del formulario vive en una versión inmutable de Growth Forms; los valores técnicos de cada opción se
conservan aunque cambie su etiqueta visible, para no romper HubSpot ni la bifurcación de Careers.

La sección institucional posterior a la banda de reuniones funciona como un directorio editorial de cuatro
entradas: correo general, teléfonos de Chile y Estados Unidos, casa matriz en Santiago y cobertura. El móvil de
Chile, el teléfono de Estados Unidos y la dirección se toman del `contactDetails` canónico del Artifact Composer;
la línea `600 914 0660`, exclusiva para Chile, fue confirmada directamente por el operador el 2026-09-15. Los
números se publican como `tel:` y la dirección como texto postal. No se agrega mapa, horario, WhatsApp ni promesa
de atención presencial. Esta información vive en la landing y no modifica ni duplica la composición del footer global.

La revisión SEO/AEO del 2026-09-15 mantiene la URL canónica e indexable en el sitemap y corrige la representación
social a `website`. El título SEO es `Contacto Efeonce | Escríbenos o agenda una reunión` y la descripción resume
los motivos, la casa matriz en Santiago y la vía de agenda sin inventar horarios ni SLA. El Open Graph usa una pieza
determinística de 1200×630 construida desde el retrato aprobado de Nexa y el logotipo canónico; no regenera el rostro
ni el logo. Yoast conserva la propiedad del grafo: la página se expresa como `ContactPage`, su imagen principal apunta
a la misma pieza social, el nodo `Organization` existente se enriquece con dirección y puntos de contacto, y el bloque
visible de preguntas se vincula como `FAQPage`. No se agrega `LocalBusiness`, `Service`, reseñas ni horarios porque la
página no ofrece evidencia suficiente para esos claims. La mutación SEO se guarda bajo
`_gh_contacto_before_seo_20260915_145610`; el adjunto social vigente es `251930`.

`TASK-1801` cerró el 2026-09-15 por aprobación explícita del operador sobre esta landing pública. El cierre es
page-scoped: no inferir owners/SLA, destinos, booking end-to-end ni graduación completa de Meetings desde la
implementación visual y su readback público. La dirección legacy del footer global tampoco queda corregida por esta
unidad.

## Selector premium de países — 2026-09-15 (⚠️ desplegado recién el 2026-09-16; ver delta al final)

La siguiente iteración elimina en anchos de hasta 767 px la costura horizontal que aparecía porque el asset de Nexa
comenzaba 150–175 px debajo del hero. El retrato se ancla al borde superior, el gradiente pasa a ser continuo y el
intro móvil baja al tercio final sobre una zona tinta; a 390 px la posición óptica cambia para conservar el rostro
completo junto al bloque de marca. Audio y pasos continúan ocultos porque duplican la explicación en este contexto.

La banda de reuniones usa dos filas responsive: icono + bloque editorial en la primera, CTA de ancho completo en la
segunda. El ancho fijo desktop de 190 px no puede sobrevivir en móvil. Evidencia local con CSS candidato sobre el HTML
live: `.captures/2026-09-15_contacto-responsive-composition/`; 684 y 390 px tienen `overflow=0`, hero continuo, CTA de
560/358 px y banda menor a 274 px. Verificador:
`scripts/public-website/verify-contacto-responsive-composition.ts`.

El renderer y las banderas fueron publicados y la versión v3 de `efeonce-contacto` quedó activa mediante el comando
gobernado. Readback público: `country_select`, placeholder `Selecciona tu país` y 250 opciones. La activación no
requiere mutar Elementor; no saltar las guardas con un write WP-CLI directo.

Pendiente para el próximo release del renderer: promover `e5d4a0fb2` para sustituir el glifo `↗` que aún puede
aparecer junto a “País” por el SVG geográfico. No crear otra versión del formulario; la v3 ya está activa.

Canon de producto: `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md`. Task cerrada:
`docs/tasks/complete/TASK-1801-contacto-multistakeholder-form-agenda.md`.

Capas documentales: contrato técnico `docs/architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md`,
funcional `docs/documentation/public-site/contacto.md` y manual `docs/manual-de-uso/public-site/contacto.md`.

Guardrails: descubrir ID/hash antes de escribir; snapshot + ownership guard + `Document::save`; Ohio header/footer;
Growth Forms y Meetings como dueños de interacción/routing; no secretos/mapping en WordPress; no Las Bellotas,
teléfono antiguo, WhatsApp, horario u oficina por país sin verificación; coverage actual CL/US/CO/MX/PE no amplía
claims históricos. Publication requires owners/SLA/destinations, staging E2E, GVC 1440/1280/890/390, purge and
public readback.

## Delta 2026-09-16 — el rollout que la documentación daba por hecho

🔴 **La composición responsive descrita arriba como «publicada el 2026-09-15» NO estaba en producción.**
El sitio servía `contact-landing.css` con 30.960 bytes; el repo runtime tenía 32.820. El
`clamp(27px, 5.5vw, 33px)` del titular de la banda aparecía **cero veces** en el archivo live. La
evidencia local en `.captures/` era real y el verificador pasaba, pero el paquete nunca se desplegó:
se declaró `code complete` como `operationally complete`. Es el *Runtime Rollout Completion Gate* de
`CLAUDE.md`, y se detectó sólo porque el operador reportó que la banda se veía mal en su teléfono.

**Lo que producción servía de verdad, medido a 390 px antes de desplegar:** `.gh-contact__band-inner`
con `grid-template-columns: 56px 267px`, `padding-block: 0`, titular a 34 px partido en **tres**
líneas, y la curva decorativa `::after` cruzando por encima del CTA. El overflow era 0 — por eso la
verificación de la unidad anterior no lo atrapó: **medir overflow no es medir composición.**

**Después del despliegue, medido en producción:** grid `40px 306px`, `padding-block: 25px / 27px`,
titular a 27 px en dos líneas, curva por debajo del botón, overflow 0. Desktop 1440 sin regresión:
grid `86px 864px 190px`, banda de 160 px, titular en una línea y CTA en la misma fila.

**Copy de cobertura.** La entrada «Cobertura» del directorio decía `Trabajamos con organizaciones en
Chile y otros mercados.` y ahora nombra los cinco: `Trabajamos con organizaciones en Chile, Estados
Unidos, Colombia, México y Perú.` Salen de `EFEONCE_OPERATING_MARKETS` en `src/config/efeonce-brand.ts`.
Se conserva el verbo «trabajamos con organizaciones **en**» a propósito: expresa cobertura y no sedes.
La entrada vecina publica la dirección postal de la casa matriz, así que «estamos en» o «tenemos
presencia en» habrían implicado oficina por mercado, que el brief prohíbe.

**Alcance real del release, declarado.** El paquete acotado lleva 9 archivos y sólo 2 diferían del
live. Pero el diff del CSS tenía **488 líneas cambiadas y sólo 12 eran de la banda**: viajó también el
resto del set del 2026-09-15 que tampoco estaba desplegado (hero, columna de formulario, callout de
Careers, FAQ, grid de canales, audio, notas de Nexa, wave y meeting card). Se verificó antes con
`scripts/public-website/verify-contacto-responsive-composition.ts` sobre el HTML vivo —asserts en
verde, banda de 273 px a 390 px— y se comprobó desktop después, pero la superficie desplegada fue
mayor que los dos cambios pedidos.

**Carril usado, sin token de Kinsta.** `export-live-code` → `build-contacto-elementor-package.cjs
<baseline>` → `wpcli --eval-file deploy-contacto-elementor-package.php --input-file package.zip
--input-file manifest.json --wp-user 12`. Resultado `scoped_package_installed`, 9 archivos, backup de
rollback en el servidor: `/tmp/eo-contacto-widgets-before-20260916-120717.tar`. ⚠️ `production_deploy_apply`
figura como capacidad bloqueada en `runtime-status` porque **la API de Kinsta no está configurada**; eso
NO bloquea el deploy — SSH/WP-CLI es un carril independiente y es el que corresponde. Leerlo como
bloqueo cuesta una sesión entera.

**Verificación del asset, y la trampa.** No hace falta purgar caché: el plugin versiona por `filemtime`
y el `?ver=` saltó solo de `1789484153` a `1789560441`. Pero pedir la URL del CSS **sin** query string
devuelve una variante cacheada vieja: verificar siempre contra la URL versionada que pide el HTML.
