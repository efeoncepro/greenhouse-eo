# Home — revisión visual iterativa del operador

## Hero — showreel modal, 2026-08-30

Pedido: reproducir `https://www.youtube.com/watch?v=yHUystNmtcQ` desde «Mira cómo operamos».
YouTube oEmbed confirmó «Efeonce Showreel 2025 | Branding, Diseño Web & Growth Marketing»; el video
se reprodujo realmente tanto en preview local como en Home. No se infiere reproducción de HTTP 200.
Dirección/alternativas: [showreel modal](../../ui/visual-directions/home-showreel-modal.md).

Se extiende `greenhouse_agency_experience` (ID `ca913f7`), conservando hero/CTA móvil y los otros 16 widgets.
Dialog nativo en top layer, navy, borde teal tenue, fondo oscurecido/blur, entrada fade/scale breve;
X 44×44, video 16:9, enlace alternativo. Retirados browser-chrome ficticio y copy de demo/90 segundos.
URL nativa `video_url`, caption/nombre accesible editables. URL allowlist HTTPS/YouTube; iframe nocookie
sólo tras clic, sin SDK. Editor no carga player; close/unmount destruye iframe y restaura scroll/foco.
`youtube-nocookie` no se presenta como garantía de ausencia de tratamiento por terceros tras reproducir.

Writer: `configure-agency-home-video.php`; snapshot `_gh_home_video_20260830_195821`;
hash `30bab640e2dae49b9f6b13582c6dd426c018c4fda2419c0f199634cdc659605c`.
Cuatro archivos publicados, backup `/tmp/eo-agency-before-20260830-195756.tar`.
Readback semántico exacto; Ohio/Yoast/template/thumbnail y ocho páginas protegidas sin cambios.
Rollback autorizado: restaurar esos cuatro archivos y el snapshot mediante Document::save, limpiar
Elementor/purgar Kinsta y verificar. No volver a ejecutar el writer guardado contra otro hash.

QA: PHP 281 pruebas de textos editables + URL nativa/sin iframe inicial; JS lifecycle PASS:
URL válidas/inválidas, editor sin terceros, un solo player, close/cancel/unmount, scroll/foco, filtros.
Elementor real PASS: 17 widgets, cero HTML, 414 campos raíz/seis repeaters. JS syntax/diff PASS.
Browser: reproducción visible; cero iframe antes de clic; X/exterior eliminan iframe; retorno al botón.
Escape probado con foco en X. Con foco dentro de YouTube, Escape de la herramienta no cerró el modal;
Tab tampoco avanzó en esta sesión. Por tanto NO se certifica recorrido completo de teclado ni Escape
desde el iframe. Dialog nativo conserva modalidad de navegador y X exterior siempre accesible.
Editor visual save/reload sigue pendiente de login, sin bloquear la prueba del frontend publicado.

Evidencia `.captures/agency-home-video/`: `live-desktop.png` (reproducción real), `live-tablet.png`,
`live-mobile.png` y `live-mobile.json`. Desktop 1280: panel 960×673 dentro del viewport 720 alto.
Tablet 890: sin overflow. Móvil 390: panel x12..378, 366×327, iframe 364×204, X44×44; scrollWidth390.
Las capturas emuladas del panel Browser se escalan dentro de su canvas; geometría medida complementa
esa limitación visual. Reduced motion: panel/backdrop animationName=none. Consola sin errores en lectura final.
GVC equivalente para WordPress es Browser in-app (el harness privado no sirve estos widgets).
Primera composición aceptada visualmente; jerarquía/densidad/economía de superficies 5/5 (un solo foco,
sin cards extra); proporción/espacio/profundidad/impacto/tipografía/contraste/iconos/fidelidad/firma/motion
4.5/5; responsive 4/5 por límite de captura. Media 4.61/5, sin dimensión inferior a 4.
Sin card-wallpaper ni chrome ficticio. Veredicto funcional PASS; cobertura teclado parcial,
no aprobación global de accesibilidad ni cierre del rework/copy de TASK-1358.

## Casos — CTA compacto aprobado, 2026-08-30

Dirección aprobada por el operador: reutilizar la tarjeta navy del CTA final en una banda compacta,
texto a la izquierda y un único botón teal a la derecha; móvil apilado. Se descarta mantener el grid de
cuatro casos o sumar otro carrusel. Copy aprobado: «Casos de éxito / Del desafío al trabajo hecho. /
Conoce los proyectos que hemos desarrollado junto a nuestros clientes. / Ver casos de éxito».
Destino verificado en CMS y Browser: Portafolio, página 247116, `/portafolio/`, con Bresler, Marca Chile,
Gobierno de Santiago y otros proyectos. El destino no fue creado ni modificado.

Decisión reuse/extend: widget existente `greenhouse_agency_cases`, ID `517e985`, reutiliza estilos de
Agenda con modificador scoped; cinco campos nativos (cuatro textos y URL), colores editables y ancla
`casos`. Se retiran repeater, cifras, cuatro tarjetas y nota inferior del documento y del schema activo.
No se borran proyectos; la composición anterior es recuperable desde snapshot y backup de archivos.
No hay HTML editable, nueva dependencia ni JavaScript adicional. Se preservan los otros 16 widgets,
cuatro enlaces de Servicios, Agenda y metas Ohio/Yoast/thumbnail.

Paquete de cuatro archivos: backup `/tmp/eo-agency-before-20260830-194241.tar`.
Writer `compact-agency-home-cases.php`; snapshot `_gh_home_compact_cases_20260830_194253`;
hash `f35aebed6c8bcc3674da84876c92fd589273d0c1392c6c81c4f6b4ab2730b40e`.
Document::save, readback exacto y protección de otras páginas PASS; purga Elementor/Kinsta aplicada.
Rollback: restaurar cuatro archivos exactos del backup y datos del snapshot por Document::save,
conservar metas y purgar/verificar. Tar temporal; el snapshot WordPress conserva los datos anteriores.

PHP renderer PASS (17 módulos, 281 aserciones de texto); casos cubre URL editable, registro nativo,
ausencia de cards y CTA único. Lifecycle JS PASS; probes anteriores de Agenda se acotan por sección
al reutilizar su clase visual. Elementor real PASS: 17 widgets, cero HTML, 415 campos raíz/seis repeaters.
Browser live 1280: tarjeta 1120×226,8 px, heading claro; hover sostenido teal claro `rgb(94,234,212)` con
tinta navy `rgb(4,34,61)`, sin background-image que tape el texto; flecha se desplaza 3 px.
890 y 390 con carga limpia sin overflow; móvil tarjeta x=20..370, botón x=50..340 debajo del texto.
Reduced motion: flecha sin transform y transición mínima; clic real llega a `/portafolio/`.
Capturas en `.captures/agency-home-compact-cases/`; desktop inspeccionado directamente. Las capturas
emuladas conservan la limitación de escala del host; geometría DOM valida el responsive. No se certifica
edición/guardado desde UI Elementor ni recorrido completo de teclado. Sin commit/push.

## Enlaces de servicios — 2026-08-30

Se enlazan sólo cuatro tarjetas con landings publicadas y pertinentes: SEO y AEO → página 251078
(`/servicios/posicionamiento-seo/`, incluye búsqueda con IA); Contenido y creatividad → 251279
(`/agencia-creativa-v2/`); CRM y automation → 244079 (`/servicios-contratar-hubspot/`);
Desarrollo web y CMS → 250816 (`/desarrollo-sitios-web/`). Las otras ocho permanecen sin enlace.
`services[].landing_link` es un control URL nativo de Elementor; vacío conserva la tarjeta estática.
El renderer extiende el h3 con un único enlace semántico y área de clic de toda la tarjeta, sin JS de
navegación; `-undash` conserva el hover Ohio y CSS delimita foco visible. No se cambian textos ni filtros.

Writer `link-agency-home-services.php`, snapshot `_gh_home_service_links_20260830_192809`, hash
`86cd9ca457e1836d005122450249fb99b40cf74e47f64b222d650a64ab07d66e`.
Readback exacto; Ohio, SEO, thumbnail, settings y documentos de referencia protegidos sin cambios.
Paquete de tres archivos respaldado en `/tmp/eo-agency-before-20260830-192624.tar`; reparación posterior
del helper URL en `/tmp/eo-agency-before-20260830-192741.tar`. La primera versión entregaba un default
URL escalar, incompatible con Elementor: interrumpió temporalmente el renderer. El writer abortó antes
de guardar; se normalizó el default a array y se agregó una prueba de registro que rechaza ese defecto.
Segunda ejecución completada y renderer público recuperado antes del cierre.

PHP renderer (incluye URL vacía, segura, externa, rechazo javascript y registro nativo), lifecycle JS,
lint PHP y contrato real Elementor PASS: 17 widgets, cero HTML, 415 controles raíz y siete repeaters.
Browser: cuatro navegaciones reales llegan a los destinos correctos; tres se activaron desde el área de
la tarjeta. Filtro Tecnología seleccionable sin perder enlaces. 1280/890/390 sin overflow; en 390 las doce
tarjetas quedan entre x=20 y x=370. Canonical root verificado con cuatro links y consola sin errores.
Los enlaces tienen tabindex nativo 0. La automatización Tab no avanzó desde el filtro; la navegación
completa por teclado queda no verificada, no se usa la captura `focus-1280.png` como prueba de foco del enlace.
Evidencia en `.captures/agency-home-service-links/`. Emulación 890 conserva el caveat de escala del host.
Rollback: restaurar datos del snapshot por Document::save y archivos exactos de los backups, preservando
metas; invalidar Elementor/Kinsta y verificar. Sin header/footer, commit ni push; no cierra la fase general de copy/editor.

## Rótulos narrativos — 2026-08-30

Por comentario del operador, «El problema · diagnóstico» pasa a «El costo de trabajar por separado»;
«El reencuadre» pasa a «Un equipo. Una misma dirección.». Craft institucional: consecuencia → respuesta,
creencias de integración operativa, sin notas de wireframe ni nuevos claims cuantificados.
Sólo dos controles de texto existentes: problem.f005_texto y reframe.f001_texto; titulares, cuerpo,
estilos y microinteracciones intactos. No cambia el schema/preset del widget ni se despliegan archivos runtime.
Writer `refine-agency-home-narrative-labels.php`; snapshot `_gh_home_narrative_labels_20260830_192130`;
hash `a2353611fe5f0346779410c1cdcd0d2ca9a3428dc3ba5a195a260f7ca6941601`.
Readback exacto y metas/otras páginas protegidas sin cambios. Reversión mediante Document::save desde
el snapshot, conservando metas; invalidación de Elementor y Kinsta. Esta edición no cierra la fase general de copy.
Browser canónico 1280: ambos rótulos nuevos, captura inspeccionada; móvil 390: anchos 310,86/262,82 px,
una línea, sin overflow de página. Evidencia `narrative-labels-1280.png` en la carpeta de quinta revisión.
PHP lint y readback PASS; closure-check sin errores (tres avisos transversales ya triados); sin cambio de workflow,
arquitectura o manual. La skill de copywriting orientó las etiquetas al lector, no al framework interno.

## Quinta tanda — ecosistema, logos y bucle continuo

Seis comentarios aplicados: Kortex usa el isotipo del repo hermano
`/Users/jreye/Documents/dev/kortex/apps/web/public/logo/isotipo.svg`; Wave usa
`public/branding/SVG/isotipo-negativo-wave.svg`. Ambos se distribuyen localmente y tienen controles Media.
No se renombra la tarjeta Visibilidad SEO/AEO. Verk y sus controles se retiran; el aviso de lanzamiento
queda oculto mediante `show_launch_notice=no`, conservando copy/enlace y opción para recuperarlo.

Hero reutiliza Berel/SKY/Bresler de AEO en un repeater Media. Logo Marquee incorpora una opción gobernada
`proofOnly`/`brandProof.v1`; las superficies AEO/About conservan su marcado anterior.
El operador detectó que al cambiar el marcado se perdió el hover de las iniciales: el selector antiguo
`data-av-stack` se reemplazó por las clases semánticas del grupo. Se recuperan elevación de 6 px, escala
1,08, halo y prioridad sobre los vecinos. Reduced motion elimina la transformación.

Carrusel: el 50% de la pista no representaba el período con gap y dos grupos eran insuficientes en
pantalla ancha. Ahora se mide el desplazamiento entre originales/copia y se calcula cobertura para
viewport + período. ResizeObserver reconstruye grupos; las imágenes se preparan cerca del viewport.
Copias inertes/aria-hidden; editor y movimiento reducido no duplican ni animan las filas.

Despliegue: 14 archivos, backup `/tmp/eo-agency-before-20260830-190735.tar`; follow-up CSS de hover:
`/tmp/eo-agency-before-20260830-191359.tar`. Snapshot `_gh_home_fifth_review_20260830_190751`.
Writer `refine-agency-home-fifth-review.php`, sólo Hero/Ecosistema por Document::save; hash final
`b3dada4b994a67624ce5f85a441e1df99d347ecea2b5fd2cb6f72f99c824911e`.
Metadatos, thumbnail, Ohio/SEO y hashes de Home anterior, RRSS, AEO y Diseño Web conservados.

PHP renderer PASS (282 pruebas de texto), lifecycle JS PASS, geometría dinámica de carrusel PASS.
Elementor real PASS: 17 widgets, cero HTML, 415 controles raíz y siete repeaters; Media/Select/Repeater registrados.
Browser: recursos oficiales cargados y ausencia de Verk/aviso; hover real en URL canónica devuelve
`matrix(1.08,0,0,1.08,0,-6)`, z-index 6 y transición 280 ms. Captura 890 inspeccionada.
Ambas filas se observaron a través del reinicio a 890 y 1920 px: nunca dejan descubierta la derecha;
a 1920 generan tres grupos. A 390 px, recursos cargados, cobertura suficiente y scrollWidth=clientWidth.
Reduced motion verificado tras recarga real: cero clones, ambas animaciones none, logo sin transformación.
AEO conserva tres logos y marcado anterior. Sin errores de consola de la Home.
La emulación CDP móvil produce capturas con escala/composición del host; no se usan como prueba de tamaño
físico 1:1. La comprobación móvil de esta tanda se apoya en geometría DOM; la captura 890 es visual directa.
Artefactos: `.captures/agency-home-fifth-review/`; JSON de muestras guarda el ancho realmente medido.

Rollback: restaurar primero el CSS del follow-up y después los archivos del paquete base; recuperar datos
del snapshot por Document::save, preservar metas y purgar Elementor/Kinsta. Los backups tar son temporales.
La retirada de Verk es recuperable desde el snapshot. No se tocaron header/footer ni se hizo commit/push.

## Cuarta tanda — color e isotipos oficiales

Tres comentarios aplicados: HubSpot CRM hereda el teal `rgb(15,118,110)` de los otros servicios y blanco
durante hover sostenido de 1,2 s. Máscara SVG alpha por instancia sobre el Media existente, sin filtros.
Greenhouse usa `public/images/greenhouse/SVG/negative-isotipo.svg`; Globe usa
`public/branding/SVG/isotipo-globe-negativo.svg`. Copias de los SVG oficiales (sólo newline final añadido),
sin redibujar formas. Versión negativa blanca sobre navy, 32 px y 28 px respectivamente, `object-fit:contain`.
Ambos son controles Media nativos; `globe_logo` reemplaza el antiguo `f005_icono_tabler`.

Paquete de cinco archivos con hashes y backup `/tmp/eo-agency-before-20260830-184932.tar`.
Writer `refine-agency-home-brand-marks.php`: snapshot `_gh_home_brand_marks_20260830_184944`, sólo widget
`861a6e9`; hash `fa8e73b18ea690d0e3fa6064cdf58c3b867d5728bed6d393dbe5edcbb89b47d2`.
Readback exacto por Document::save; copy, header/footer, thumbnail, SEO, antigua Home y RRSS sin cambios.
PHP renderer, lifecycle JS y contrato real Elementor pasan: 17 widgets, cero HTML, 420 campos/seis repeaters.
Browser 390×844, 890×909 y 1280×909: recursos cargados, isotipos contenidos, cero overflow; screenshots
inspeccionados en `.captures/agency-home-brand-marks/`, incluyendo el sprocket visible normal y hover.
Rollback: restaurar los archivos afectados del backup y snapshot por Document::save, preservar metadatos,
limpiar archivos Elementor y purgar Kinsta. Los dos SVG nuevos quedan inertes al restaurar las plantillas.

## Tercera tanda — hover, contacto, copy e identidad

Seis comentarios aplicados en la Home 251731. El hover sostenido reveló la causa omitida en la pasada
anterior: Ohio `links-underline` añade un gradiente `currentColor` que acaba cubriendo el CTA.
Se usa la exclusión nativa `-undash` en Agenda y FAQ, no un override global del tema.
FAQ ya no muestra mail ni sus tres controles obsoletos; conserva CTA y seis preguntas. Su ayuda ahora dice
«Conversemos sobre tu pregunta en una reunión de 30 minutos». El mail de Agenda permanece.
Copywriting, voz institucional, edición de claridad: «Marketing, tecnología y datos. Conectados en una misma
operación» sustituye el cierre «6 de 6 / el único». No se cambia el resto de la tabla: su revisión de claims sigue pendiente.
CRM y automation usa el sprocket local en Media `services[].icon_media`; Stack y Respaldo oficial conservados.
Ecosistema usa halo elíptico de sección completa; se evita el recorte lateral del gradiente circular alto.
Hero: isotipo al 11,5% del gráfico, máximo 62 px, misma profundidad de parallax que el núcleo. También se corrige
el mismo recorte del halo azul detectado al inspeccionar el hero móvil, sin tocar header/footer.

Despliegue de nueve archivos con hashes previos/nuevos; backup `/tmp/eo-agency-before-20260830-184000.tar`.
Follow-up de halo hero: `/tmp/eo-agency-before-20260830-184358.tar`. Paquetes en `.captures/agency-home-third-review/`.
Guardado vía `Document::save`, snapshot `_gh_home_followup_20260830_184109`; sólo tres widgets modificados.
Hash resultante `0e09940d8697b456bd9b3cee971a6a8ccfdf7b4b6eb2b428939224d7c19d6fcd`; metas, thumbnail,
Home anterior y RRSS intactos. 17 widgets, cero HTML, 420 campos raíz y seis repeaters.
La primera ejecución del script abortó antes del snapshot/save por registro lazy de widgets; se inicializó el
registro antes de repetir. Elementor real y readback decodificado pasan. No hubo escritura parcial de contenido.

QA: PHP renderer (289 probes de texto), lifecycle JS, contrato Elementor real y Browser 1280×909/890×909/390×844 PASS.
`verify-agency-home-third-review.mjs` sostiene hover 1,2 s, exige fondo sin imagen/animación y texto/flecha navy;
comprueba las esquinas del isotipo dentro del círculo, tres logos HTTPS cargados, copy y mail, y cero overflow/errores.
Capturas inspeccionadas en `.captures/agency-home-third-review/browser/`. La captura móvil adicional muestra la órbita.
La publicación de templates requiere invalidar caché de elementos Elementor además de Kinsta; se incorpora al deploy rail.
Rollback: restaurar archivos de ambos backups en orden inverso y, para contenido, el snapshot por Document::save;
preservar metadatos, limpiar archivos Elementor y purgar Kinsta. Backups de `/tmp` son temporales.

## Segunda tanda — cuatro comentarios adicionales

Aplicada sobre el mismo documento sin escritura Elementor: hash `750ee98c…6960` intacto.
Ecosistema extiende `heading_color`; el resto de H2 oscuros revisados conserva contraste claro.
Agenda usa `#14b8a6` con tinta `#04223d`, hover `#5eead4` y tres controles de estilo editables.
Social Proof reutiliza el sprocket local ya usado en Stack, con Media independiente; no cambia claims.
FAQ corrige la causa estructural: CTA dentro de contacto, dos columnas en desktop, una a <=1024 px,
sin sticky en tablet/móvil o viewports de altura <=760 px. Se verificó apertura de FAQ tras bajar.

Runtime: cinco archivos, manifest en `.captures/agency-home-polish/release-manifest.json`, backup
temporal `/tmp/eo-agency-before-20260830-182819.tar`. No se tocaron página, header/footer ni metadatos.
PHP/lifecycle JS y Elementor real pasan; nuevos controles registrados como COLOR/MEDIA.
`verify-agency-home-polish.mjs`: PASS a 890×909, 390×844 y 1280×909, capturas inspeccionadas en
`.captures/agency-home-polish/browser/`; cero overflow/errores, ambos sprockets cargados por HTTPS,
CTA contenido en su tarjeta antes/después del scroll, títulos claros y CTA teal. A 1280×720 sidebar static.
El CTA de FAQ sigue llevando a `#agenda`. Las primeras capturas anteriores a reload mostraban el documento
previo; se recargó y verificó el HTML real antes de dar los cambios por desplegados.

Rollback: restaurar sólo los cinco archivos exactos del manifest y purgar; el contenido no cambió.
Siguen pendientes copy/claims y certificación del editor UI del rework amplio, no estos cuatro ajustes.

## Alcance y resultado

Aplicados en la Home pública `251731`, por el carril Elementor y el plugin runtime existente.
Se conservan 17 contenedores/widgets semánticos, cero HTML, 423 campos raíz y seis repeaters.
No se reescribieron los copys; header/footer Ohio, Home anterior y Redes Sociales conservados.

| Comentario | Resultado |
| --- | --- |
| 1 y 4 · títulos negros | Color claro `#eaf2ff`, control Elementor `heading_color`, acentos preservados. Ohio imponía el color oscuro a H2 sin color explícito. |
| 2 · imágenes de carrusel | Diez piezas horizontales existentes, cinco por fila, Media/etiqueta/alt editables; cero placeholders. |
| 3 · HubSpot | Sprocket de Simple Icons 16.21.0, SVG local HTTPS, campo Media independiente. |
| 5 · agenda sin form | Tarjeta horizontal a >760 px, apilada en móvil; botón a `/agenda/`. Retirados formulario demo, handler ficticio y controles obsoletos. |
| 6 · logos de Redes Sociales | Mismo `EO_Logo_Marquee_Widget::render_marquee()`, siete clientes, slow/compact; sin copiar el JS completo de Social. |

Fuente del isotipo: [Simple Icons 16.21.0](https://github.com/simple-icons/simple-icons/blob/16.21.0/icons/hubspot.svg).
No se generaron imágenes ni se modificaron las piezas originales.

## Medios elegidos

Verificados contra el documento de la antigua Home `2791` y vistos individualmente antes de elegirlos.
Los nombres de archivo históricos no siempre coinciden con la marca visible: la selección se hizo por imagen.

| Adjunto Media | Pieza visible |
| --- | --- |
| 248637 | SKY |
| 248778 | Bresler |
| 248638 | Gobierno de Santiago |
| 246382 | Mirador San Pablo |
| 246383 | Flick · Despacho |
| 246351 | Eusari · Email marketing |
| 247008 | Fivest |
| 246377 | Lipigas |
| 248793 | Ghamadent · Web |
| 246364 | Flick · Comercio electrónico |

Se descartaron los dos teléfonos verticales para evitar recortes y los recursos remotos del demo Ohio.
Las miniaturas de ~351 px son adecuadas para estas tarjetas, no para futuras ampliaciones a pantalla completa.

## Evidencia

- Pruebas PHP: PASS, 17 módulos; edición/escaping, repeaters, alt editable, renderer compartido, sprocket y ausencia de form.
- Lifecycle JS: PASS; montaje/reemplazo/remoción, reentrada, filtro, modal/foco, reduced motion y enlace de agenda.
- Elementor real: PASS; registro de controles y render probe, 17 widgets, cero HTML, 423 campos, seis repeaters.
- Browser integrado: capturas inspeccionadas a 1280×720, 890×909 y 390×844; `scrollWidth === clientWidth`,
  H2 claro, diez URLs de arte distintas cargadas, siete logos cargados, SVG cargado, agenda responsive, cero errores.
  Se comprueban imágenes visibles y URLs únicas decodificadas: originales lazy fuera del viewport pueden permanecer
  sin carga mientras su copia visible ya está decodificada; no se confunde esto con un asset roto.
- Filtros, FAQ y Escape/retorno de foco del tour pasan. Foco visible en enlace de contacto de agenda.
- Reduced motion live: 107 reveals visibles, cero clones de work y animación de logos `none`; emulación restablecida.
- Click del botón llega a `/agenda/`; el calendario existente carga 22 horarios. Sin seleccionar ni crear reserva.
- La prueba desde la interfaz de edición/guardado Elementor sigue pendiente de login; no se sustituye con el render probe.

Artefactos locales: `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/agency-home-review/`;
`browser/` contiene capturas y reportes, `assets/` los originales inspeccionados, `release-manifest.json` el alcance.
La evidencia usa Browser integrado conforme al carril de diagnóstico, sin arrancar un navegador Playwright externo.

## Mutaciones y recuperación

- Runtime: 11 archivos acotados; backup remoto temporal `/tmp/eo-agency-before-20260830-181731.tar`.
- Documento: `refine-agency-home.php`, snapshot durable `_gh_home_review_20260830_181803`.
- Tras `Document::save`, Elementor retiró `_thumbnail_id`; se restauró `248149` desde el snapshot.
  Los settings serializados se compararon decodificados; el timestamp operativo IndexNow no se confunde con configuración SEO.
- URL Media del isotipo normalizada a HTTPS en una segunda escritura protegida; snapshot `_gh_home_review_https_20260830`.
- Hash final: `750ee98c1aa3468e6430e279df960c0b367d8792eb8e84802be0c94b029e6960`.
- Home anterior: `600cd2fe663eb7380af64dd86775ae8fabdbeb698146e6df006fef86d3a165c3`, intacta.
- Redes Sociales: `4dfd7e4fe7d05ad29c4d9c1dfba244c4937db1c4cf6950a4d66500ac1df374d5`, intacta.
- Reversión: verificar drift y respaldar estado actual; restaurar el documento deseado mediante `Document::save`,
  preservar thumbnail/Ohio/SEO y restaurar sólo archivos del manifest. Nunca desplegar todo el WIP runtime.

## Cierre proporcional

PASS para los seis cambios solicitados y su publicación. TASK-1358 continúa `to-do`/`UI ready: no`:
copy/claims, certificación de editor UI y revisión final del rework no forman parte de este cierre.
QA/Documentación: skills WordPress, diseño, Browser, Growth Meetings, QA y documentación usadas; el carril
Vuexy/React no aplica al runtime WordPress. No se modificaron APIs de reservas, flags, IAM, secretos ni repos de producto.
Contrato, manual, documentación funcional, task y handoff actualizados; no cambian AGENTS ni project_context porque
no hay nuevas reglas transversales. Sin commit/push.

Gates: `qa:gates --changed --agent codex --task TASK-1358 --ui --runtime` revisado proporcionalmente;
`docs:closure-check` termina bien con tres avisos triados (sin nueva regla global, skills espejadas,
task sin cambio de estado); `task:lint --changed` sin errores, warning Motion:none del rework amplio todavía
abierto; `git diff --check` limpio. `docs:context-check:strict` pasa sin errores ni warnings.
