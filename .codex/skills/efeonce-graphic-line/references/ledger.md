# Registro de decisiones y versiones

> Documento vivo. Cada decisión del operador y cada versión publicada se registra acá con su fecha, en el mismo commit
> que la aplica. Lo que no está aquí no se da por decidido.

## Decisiones del operador (vigentes)

| Fecha | Decisión |
|---|---|
| 2026-09-25 | «La órbita» es la línea gráfica canónica de la marca propia Efeonce y su familia: rodea, mide y enfoca. |
| 2026-09-26 | Efeonce firma todas las piezas; Globe, Wave, Reach y Greenhouse son contexto. Verk y Kortex quedan fuera por ahora. |
| 2026-09-26 | La palabra del eslogan es de la línea de servicio: Growth (Efeonce/Greenhouse, «el producto que controla todo»), Brand (Globe), Engine (Wave), Voice (Reach), Revenue (RevOps). |
| 2026-09-26 | RevOps es sublínea de Efeonce operada sobre HubSpot o Salesforce: dos acentos (HubSpot magenta berenjena `#e86bd0`/`#8e1b82`, Salesforce cielo `#2fb8ff`/`#00739e`). |
| 2026-09-26 | Firma de una pieza: logo de Efeonce centrado; la burbuja URL sólo reemplaza al logo cuando éste ya aparece en la imagen. |
| 2026-09-26 | La órbita no sustituye el lenguaje fotográfico: se declara a propósito (lente, medida, progreso, foco, cierre) y nunca cruza sujeto, reservas, lecho ni firma. |
| 2026-09-26 | Trayectoria: un dato es la posición de la esfera (parte a las 12, sentido horario, valor × 360°) con estela corta; la órbita recorre, nunca se llena como un loader; al 100 % la esfera se queda. |
| 2026-09-26 | Todas las formas del canvas se soportan en el paquete (halo, plana, satélites, mapa de familia, foco, estado, cierre). |
| 2026-09-26 | La esfera que cierra el texto es parte del texto: guías, marcas, selección y cursores la incluyen. |
| 2026-09-26 | Un solo anillo alrededor del contenido; las órbitas interiores sólo en una órbita vacía. |
| 2026-09-26 | Las recetas reproducen la composición del canvas pieza por pieza (lente, foco, deck, firma de correo). |
| 2026-09-26 | Motion del logo V1.1 aprobado (reveal 3,6 s, apertura 2,4 s, sting 1,6 s; más punch; eslogan al 64 % del logo) y su lenguaje de movimiento como norma, con valores en tokens. |
| 2026-09-26 | Firma de correo v3.1 con franja de partners (contrato `efeonce.email-signature`). |
| 2026-09-26 | Firma de equipo (buzón de un área), variante `team`: sin foto; la zona `area-mark` dibuja la misma órbita del retrato alrededor del ícono del área; nombre = el área con su punto («Talent.»); sólo el correo del área. Áreas en `emailSignature.team.areas` (talent, finance, commercial); un área nueva nace en esos tokens. |
| 2026-09-26 | La línea gráfica converge con el lenguaje fotográfico, que sigue vigente: se enriquecen mutuamente (ver `photography-convergence.md`). |
| 2026-09-26 | **Contraste del acento (D1):** 3:1 contra su fondo para gráfico (arco, esfera, halo) y texto ≥ 24 px; el acento **nunca** en texto de menos de 24 px (ahí navy `#023c70` sobre claro, blanco sobre oscuro). Medido: Growth `#0e8c82`/papel 3,87 · Engine `#0375db`/`#091951` 3,60 · Voice `#f83902`/papel 3,53: pasan 3:1; Engine y Voice conservan sus colores. Token `efeonceGraphicLine.accentContrast` (axis-tokens 0.3.5) y chequeo del adapter `accent-text-min-size` (contrato `graphic-line-orbit` 0.3.1). |
| 2026-09-26 | **Revenue-HubSpot (D2):** el magenta queda como está (`#e86bd0` oscuro 5,9:1 · `#8e1b82` claro 7,5:1). El naranja de HubSpot no se usa: choca con Globe/Reach y es el color del partner. |
| 2026-09-26 | **Cierre del deck (D3):** «Growth» del eslogan va en el acento de la línea, no en blanco (8,5:1 sobre `#001a33`). `deckSlideHtml('close')` pinta la palabra en el acento (axis-graphic-line 0.3.2). |
| 2026-09-26 | **Burbuja URL (D4):** umbral de contraste 4,5:1, token `urlBubble.minContrast: 4.5`. |
| 2026-09-26 | **Logo dentro de la órbita (D5):** sólo en cierres de marca —cierre del deck, cierre de video y muro de recepción—, con su resguardo X respetado (el anillo queda fuera). **Nunca** en el banner de LinkedIn (4.1) ni en el reverso de la tarjeta (4.6): en objetos, el logo va solo en el dorso. En todo lo demás rige el manual §8.3 n.º 8 (la órbita nunca rodea el logo). |
| 2026-09-26 | **Órbitas interiores del banner de LinkedIn (4.1) y del fondo de Teams (4.3) (D6):** se reproducen con un solo anillo. |
| 2026-09-26 | **Halo sobre papel (D7):** a media intensidad. Token `efeonceGraphicLine.orbit.haloOnLightScale: 0.5`; el resolver del contrato multiplica la opacidad de cada parada del halo por ese factor en superficie clara, y el render del motion lee el mismo token. |
| 2026-09-26 | **Anillo propio de la esfera (D8):** `sphereRing` queda reservado a «en vivo»: el eco del pulso de impacto en movimiento y el estado activo / «en el aire». El intent de `orbit` suma `live?: boolean` y el contrato rechaza `sphereRing: true` sin `live: true` (código `sphere-ring-only-live`). |
| 2026-09-26 | **Sinergia con la fotografía (D9):** aprobadas las reglas P1–P12 de `photography-convergence.md` §6. P5 y P9 necesitan código: se abre una task «foto:prompt y chequeos de la lente» (sin ID todavía). |
| 2026-09-26 | **Conflictos entre canon (D10):** P-1 el oscurecimiento de la lente cuenta como la reserva del texto (el «nunca scrim» sigue en piezas sin lente) · P-2 se pide el lecho igual (= P12) · P-3 el 55 % es del círculo visible de la lente: se ajusta la toma · P-4 un anillo en la escena cuenta como órbita → otro plate · P-5 capa gráfica sobre foto aprobada sólo en los casos de la línea (voz, lente, medida con fuente) · P-6 1200×627 nativo en `foto:prompt` (task), nunca recortado de 16:9 · P-7 el retrato de perfil es categoría propia del lenguaje fotográfico, se permite mirar a cámara, su barra está por escribir · P-8 el límite del 36 % de cabezas y manos sólo con reserva de texto (task) · P-9 en piezas con lente manda el encuadre; las palancas que llenan el cuadro sólo en piezas sólo foto. |
| 2026-09-26 | **Firma de correo (D11):** cada persona la instala en Outlook desde el HTML generado; `people@efeoncepro.com` usa la firma de equipo del área **Talent**. |
| 2026-09-26 | **«Te hacemos visible» (D15, regla reafirmada):** revisión legal antes de cualquier pauta. |
| 2026-09-26 | **Plastilina (D19):** la iconografía plana complementaria es la dirección E, que se llama **Plastilina**: masa blanda de contorno a mano, proporciones con carácter, giro, calados redondos, la esfera como la acción y gesto en el protagonista. Es la voz del oficio creativo (Brand); el **Trazo** sigue siendo la voz de lo que se mide. Especificación en exploración: canvas «Íconos de La órbita», sección 2. |
| 2026-09-26 | **Trazo sin rasgo propio (D23):** el operador descartó «El corte» (hueco con la medida de la esfera en cada glifo del Trazo, exploración X1–X2 del canvas): «no me gusta, la diferenciación la lograremos con los clay». El Trazo queda como está: voz funcional y ordenada, sin buscar distinción; la distinción de la iconografía la carga **Plastilina** («clay», no un render 3D) y la órbita sesgada. No volver a proponer rasgos propios para el Trazo salvo pedido del operador. |
| 2026-09-27 | **Plastilina en volumen (D24):** «Bien, ese estilo me gusta, canonízalo y mándalo también a la web y a todos los espacios que corresponda». La **tercera capa** de la iconografía (Trazo · Plastilina plana · Plastilina en volumen): cada glifo de Plastilina en arcilla mate, inflada, sin aristas, generado **desde su vector aprobado**; complementa al plano, no lo reemplaza. Sólo en momentos protagonistas (portada, KV, social de un objeto, escenario, merch, objeto en escena), **uno por pieza**, desde 160 px; nunca en listas, tablas, navegación, contenido de deck, dashboards ni UI, ni en un grupo con el plano o el Trazo. El set: 18 glifos en respuesta, acento de Brand, gesto donde existe, PNG 1024 px con alfa y sin sombra de contacto. **Rechazado antes el mismo día:** extruir el vector en Blender (plano, «galleta cortada»: «no me gusta, al menos no así»); el operador pidió «otra vía: GPT entre imágenes con alpha» y aprobó la edición con GPT Image 2.5 Sunburst sobre el ícono plano (lámina Y2 del canvas; Y1, Blender, descartada). Nombre canónico **Plastilina** («clay» es el nombre genérico del estilo 3D; alias en inglés «Plasticine»). Vive en AXIS `main@c18e3d3`: tokens `efeonceGraphicLine.icons.volume`, `@efeoncepro/axis-brand-assets` `volume/<glifo>.png` + `volumeIconUrl`, `pnpm icons:volume`, Lab `/references/iconography/#volumen`, guía §9 y delta D24 del ADR de iconografía. Detalle: [iconography.md](iconography.md) §12. |
| 2026-09-27 | **Oficio: 30 íconos nuevos (D25):** «Bien, subamos esos íconos al package de axis y a su web, cuidando el diseño que ya tiene la web y documentando para agentes y el equipo». Aprobados 30 glifos producidos con el método de alta de cada voz y revisados en el canvas «Íconos de La órbita», sección 7: **15 de Trazo** (`correo`, `llamada`, `calendario`, `reunion`, `objetivo`, `presentacion`, `contrato`, `checklist`, `codigo`, `base-de-datos`, `nube`, `integracion`, `seguridad`, `ubicacion`, `reloj`) y **15 de Plastilina** (`lapiz`, `rodillo`, `aerosol`, `escuadra`, `postit`, `encuadre`, `pelicula`, `vinilo`, `guitarra`, `reproducir`, `varita`, `taza`, `lampara`, `trofeo`, `estrella`), estos últimos también en volumen (D24). El set queda en **27 Trazo + 33 Plastilina = 60**; volumen, 33 PNG. El Trazo del teléfono se llama `llamada`: `telefono` ya es la Plastilina y las claves son únicas entre voces. Notas de diseño conservadas (checklist, integración, correo a 20 px, presentación y la keynote de ejemplo, varita/estrella, encuadre, aerosol, vinilo, base-de-datos sin arcos elípticos): [iconography.md](iconography.md) §13. Vive en AXIS main (2026-09-27): `@efeoncepro/axis-graphic-line` 0.5.0 y `@efeoncepro/axis-brand-assets` 0.3.3 (tag `v0.5.0`), guía §«Catálogo aprobado», delta D25 del ADR de iconografía y Lab `/references/iconography/`. |
| 2026-09-26 | **Iconografía canonizada (D22):** el operador canonizó la iconografía completa («esto es lo que quiero»): Trazo (12 glifos) y Plastilina (18 glifos, receta, método, «no hacer», formatos) y las dos voces por línea (Trazo: Growth, Engine, Revenue; Plastilina: Brand; Voice por decidir). Vive en AXIS: tokens `efeonceGraphicLine.icons` (`axis-tokens` 0.3.6), `@efeoncepro/axis-graphic-line/icons` (0.4.0) con `resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg` y los comandos `icons:export|check|vectorize`, página `/references/iconography/` y guía `docs/agent-composition/iconography.md` (PR efeoncepro/axis-design-system#3 mergeado; publicado el 2026-09-26 con el tag `v0.3.6`). |
| 2026-09-26 | **Fondo de la iconografía (D21):** el fondo Efeonce `#001a33` va en **todas** las líneas de servicio, no sólo en Growth («El fondo de Efeonce es el que quiero»). En AXIS queda como `efeonceGraphicLine.icons.background = '#001a33'` (`axis-tokens` 0.3.6, publicado 2026-09-26), que `iconColors` usa en todas las líneas; el `darkBg` de `lines[]` (`#091951` fuera de Growth) sigue rigiendo las superficies de las piezas sin íconos. Todos los acentos pasan 3:1 contra ese fondo (Engine 3,8; Voice 4,7). |
| 2026-09-26 | **Órbita sesgada (D20):** se queda como la firma de Plastilina. Una elipse inclinada alrededor del objeto protagonista, que pasa por detrás y por delante con un calado (el gesto del isotipo, la nave dentro de su órbita); el arco en el acento recorre el frente y termina en la esfera, fuera del objeto. Sólo alrededor del protagonista de Plastilina, una por pieza, nunca cruza el texto y **nunca mide**: todo lo que mide, enfoca o cierra la marca sigue siendo circular. |
| 2026-09-26 | **Íconos planos, color (D18):** consistente dentro de cada línea de servicio (fondo, tinta y el acento de la línea) y cambia de acento según la línea; nada de colores por objeto ni tintes inventados. La primera exploración a mano quedó descartada. |
| 2026-09-26 | **Íconos, especificación (D17): aprobada.** Grilla 24 con margen 2; trazo 1,5 (1,75 en 20 px o menos; tope de 4 px sobre 64 px); remates y uniones redondos; esfera rellena de radio 1,75 en el acento con 0,5 de aire; respuesta desde 20 px; responde sólo el ícono activo o protagonista, descansa si la pieza ya tiene esfera y nunca va como viñeta. Documentada en `iconography.md`. |
| 2026-09-26 | **Íconos (D16): híbrido A + B.** El trazo limpio es el ícono (estado **reposo**); la esfera es un estado (**respuesta**), no parte del dibujo: una pieza del glifo se vuelve esfera (reemplaza) o la esfera aparece donde la acción se resuelve (completa). Tinta blanco/navy; el acento sólo en la esfera. La dirección C (órbita abierta, contornos con corte) queda descartada. Canvas de trabajo: claude.ai/artifact/Y9mx42L72zYc6iLg4j3Maj. |
| 2026-09-26 | **Capa gráfica sobre la foto, entera (amplía P-5 de D10):** el operador la aprobó también fuera de los casos de la línea (voz, lente, medida). Se compone sobre las reservas de la toma, sin scrim; los ejemplos compuestos rechazados del 19-09 siguen sin valer. Canon: maestro §9, §10 y P-5; `photography-convergence.md` P-5. |
| 2026-09-26 | **Banco de fotografía y guía «El porqué» en AXIS:** aprobados por el operador y publicados (`/references/photography/` y `/references/photography/why/`, con `why.json` para agentes). Complementan las skills de fotografía; el canon sigue en `docs/operations/brand-photography/`. |
| 2026-09-27 | **Glitch: sub-línea complementaria de La órbita, sólo para Glitch.** Aprobados el sistema de portada A/B/C con su regla de rotación (nunca dos semanas seguidas con la misma plantilla) y el feed de nueve semanas, la lámina interior y la contraportada del carrusel; ajustes aplicados: cabecera sin línea fina, «El micrófono se abre…» abre la noticia 1 (no la portada), «Desliza» con la mano Plastilina. Detalle y estado por pieza: [glitch.md](glitch.md). |
| 2026-09-27 | **El video no se compone en el Artifact Composer (opción b, TASK-1919):** el composer entrega cuadros fijos, el último cuadro del loop y capas con alfa; la animación sigue en la pipeline de motion (`orbit:video`, masters del reveal v1.1). Sólo las recetas **aprobadas** tienen plantilla; `audiovisual.close-reveal` falla con `recipe-outside-composer`. |

## Pendientes del operador (no decidir por tu cuenta)

- **Plantillas de La órbita (TASK-1919, 2026-09-27):** posición de la lente del caminero (token 0,70 vs ≈0,77 en la
  lámina aprobada); super de dato con arco completo (lámina) o la estela canónica de la medida; burbuja URL en
  `section-classic`, `section-split`, `content-measure` y `triptych` (las láminas no la llevan, el manifest del deck
  dice `url-bubble-footer`; se siguió la lámina); gris del descriptor y la bajada web, sin token; paleta DOOH 20 % vs
  35 %. Hasta decidir, la plantilla sigue la lámina aprobada y no se inventa un token.
- **Glitch (2026-09-27):** la manzana como esfera y el verde `#6ec207` como token de franquicia en AXIS; la línea de
  servicio de Glitch (Growth recomendado, Brand alternativa); aprobar lente, blog (banners, maqueta, callout v2), vlog
  16:9, kit de overlays del reel y tarjetas finales; alta de los cinco glifos Plastilina; licencia de Guttery; pasar el
  flujo de composición a ADR aceptado y a tasks. Detalle: [glitch.md](glitch.md) §8–§9.
- **Banco de pares pregunta/respuesta (D12):** el operador lo revisa y aprobará **2 pares por línea de servicio** con
  respuestas verificables. Hasta entonces el banco es candidato: calibra el tono, no es copy aprobado.
- **Archivos de impresión (D13):** se empieza por la tarjeta de presentación y el muro de recepción, en PDF vectorial
  salido de las recetas. **Bloqueado** hasta tener la especificación de la imprenta. Hoy ninguna pieza física tiene
  archivo final de imprenta (manual §12).
- **Prueba de atribución sin logo (D14)** (600 personas) y firma A/B: va **antes de cualquier pauta con la órbita**;
  proveedor y presupuesto los decide el operador. Hasta correrla, la órbita es un sistema consistente, **no** un activo
  distintivo demostrado.
- **Firma de correo:** la URL de LinkedIn de la empresa.
- **Íconos, pendientes tras D22:** la opacidad del anillo de la órbita sesgada (22 % o 30 %); si Voice usa Trazo o
  Plastilina; en piezas con las dos voces, si la esfera va en la respuesta o en el ícono; decidir el reemplazo de Tabler en las firmas;
  revisar si «Automatización» en respuesta se lee como indicador de carga (hallazgo de la segunda prueba a ciegas). **Detectado en la prueba a ciegas (2026-09-26):**
  a 20 px el trazo sube a 1,75 y el aire de la esfera baja de 0,5 a ~0,375 (la regla D17 se midió con 1,5). Opciones:
  respuesta desde 24 px, o aceptar 0,375 de aire a 20 px. Hasta decidir, la regla sigue siendo «respuesta desde 20 px».
  Diferidos: el motion de los íconos (necesita los
  tokens `axisMotion` y `motion-design-studio`) y la llegada a AXIS (tokens y SVG, cuando la especificación esté
  aprobada).
- **Íconos:** el inventario del set (qué íconos necesita la marca) y si reemplaza a los Tabler outline de la firma de
  correo y de equipo. La **iconografía plana** complementaria (rayo, paleta, pincel, cuentagotas, bombillo, tablet,
  laptop, Mac de escritorio, teléfono) está en exploración: tres tratamientos en el canvas; no se usa hasta decidir.
- **Identidad sonora (2026-09-26): recomendada, NO canon** («vamos con tu recomendación»). Elecciones del operador:
  territorio «Puntos suspensivos» (Mi Mi Mi → La); acento por línea como timbre de la esfera (Voice = eco); etiqueta
  con voz en cierres con **Brian** (las cinco tomas aprobadas); reveal con y sin voz; apertura tal cual; pieza larga en
  dos registros, **fondo** y **energía** (rock re-grabado con Stable Audio 2.5). **Pendiente:** Glitch (podcast, sin
  decisión: al operador «aún no le convence»); licencias (Stable Audio vía fal; voz ElevenLabs); prueba de
  reconocimiento sin logo antes de pautar (como D14); valores a tokens junto a `motion.sound` y reemplazo del sonido
  de los masters V1.1; (publicado en AXIS: PR #4, squash `55486aa`). Detalle: [motion.md](motion.md) §Sonido.

### Pendiente de implementación (decidido, falta código o texto)

- Íconos (D16–D22): **hecho y publicado** (tag `v0.3.6`: `axis-tokens` 0.3.6, `axis-graphic-line` 0.4.0). Falta que un
  consumidor los fije. Los SVG del set se exportan con `pnpm icons:export` (no van a `axis-brand-assets`).
- Plastilina en volumen (D24): **hecho y publicado** (tag `v0.3.7`, 2026-09-27: `axis-tokens` **0.3.7** con
  `efeonceGraphicLine.icons.volume` y `axis-brand-assets` **0.3.2** con `volume/`, 18 PNG y `volumeIconUrl`). Greenhouse
  ya fija esas versiones (commit `f3f93c926`, 2026-09-27, con `axis-ui-contracts` 0.3.6 y `axis-graphic-line` 0.4.0
  como dependencia directa). El Lab
  (`/references/iconography/#volumen`) sigue sirviendo para descargar el PNG a mano.
- Oficio (D25): **hecho y publicado** (tag `v0.5.0`, 2026-09-27: `axis-graphic-line` **0.5.0** con los 60 glifos en
  `ICON_CATALOG` y `axis-brand-assets` **0.3.3** con 33 PNG en `volume/`; `axis-tokens` sigue en 0.3.7). Greenhouse
  ya lo fija (2026-09-27: `axis-graphic-line` 0.5.0 y `axis-brand-assets` 0.3.3).

- Composición por superficie en Greenhouse (TASK-1919): **hecho, local en `develop`** — las 20 recetas aprobadas son
  plantillas del Artifact Composer (`graphic-line-deck`, `graphic-line-stills`, `graphic-line-overlays`), `pnpm
  brand:compose` y gate `--catalog=graphic-line` a 0 px. Falta la ruta productiva (TASK-1921: API, `artifact-worker`,
  MCP) y cinco preguntas del operador: lente del caminero (token 0,70 vs ≈0,77 en la lámina), super de dato con arco
  completo o estela canónica, burbuja URL en sección/contenido/tríptico (se siguió la lámina, sin burbuja), gris del
  descriptor/bajada web sin token y paleta 20 % vs 35 %.
- Task «foto:prompt y chequeos de la lente» (sin ID): P5 (chequeos de lecho y reservas para lente y foco;
  `lens-subject-inside-circle` medido), P9 (campo `reservas.lente`), P-6 (formato nativo 1200×627) y P-8 (el límite del
  36 % sólo con reserva de texto). Hasta que llegue, `foto:prompt` sigue emitiendo el límite del 36 % y no genera
  1200×627.
- La barra fotográfica del retrato de perfil (P-7), en el canon fotográfico.
- Publicación de axis-tokens 0.3.5, axis-ui-contracts 0.3.5 y axis-graphic-line 0.3.2 (ver versiones) y su adopción en
  Greenhouse.

## Versiones publicadas

| Fecha | Paquete | Versión | Qué trae |
|---|---|---|---|
| 2026-09-26 | tokens, contracts, registry, brand-assets | 0.3.0 | contrato `graphic-line-orbit` 0.3.0 estable, líneas de servicio, trayectoria, `lens.anatomy`, `pieces`, `portrait`, selección 0.3.0 |
| 2026-09-26 | axis-graphic-line | 0.3.1 | el paquete de la órbita (recetas, deck fiel a 4.2, motion CSS, React y Web Component) |
| 2026-09-26 | tokens, contracts | 0.3.2 | tokens `emailSignature` y contrato `efeonce.email-signature` (sin `motion`) |
| 2026-09-26 | axis-tokens | 0.3.3 | `efeonceGraphicLine.motion` (el lenguaje de movimiento) |
| 2026-09-26 | tokens, contracts | 0.3.4 | firma de equipo: `emailSignature.team.areas`, variante `team` (`area-mark`, errores `team-has-no-portrait` y `area-mark-only-for-team`, respuesta con área) |
| 2026-09-26 | axis-tokens 0.3.5 · axis-ui-contracts 0.3.5 (contrato `graphic-line-orbit` 0.3.1) · axis-ui-registry 0.3.1 · axis-brand-assets 0.3.1 (órbitas estáticas regeneradas) · axis-graphic-line 0.3.2 | publicado (tag `v0.3.5`) | `accentContrast`, `urlBubble.minContrast`, `haloOnLightScale`, `live` + `sphere-ring-only-live`, `accent-text-min-size`, cierre del deck con Growth en acento |
| 2026-09-27 | axis-tokens 0.3.7 · axis-brand-assets 0.3.2 · axis-ui-contracts 0.3.6 (AXIS `main@c0020b6`; `axis-graphic-line` sigue en 0.4.0) | publicado (tag `v0.3.7`) | Plastilina en volumen (D24): `efeonceGraphicLine.icons.volume`, `volume/<glifo>.png` (18 PNG), `AXIS_VOLUME_ICONS`, `findVolumeIcon`, `volumeIconUrl`; publicada coordinada junto con los cambios de superficies |
| 2026-09-27 | axis-graphic-line 0.5.0 · axis-brand-assets 0.3.3 (AXIS main@aa66225, 2026-09-27; `axis-tokens` sigue en 0.3.7) | publicado (tag `v0.5.0`) | Oficio (D25): 30 glifos nuevos en `ICON_CATALOG` (27 Trazo + 33 Plastilina = 60) y los 15 volúmenes de oficio en `volume/` (33 PNG) |
| 2026-09-27 | axis-tokens 0.3.8 · axis-ui-contracts 0.3.7 | publicado (tag `v0.3.8`) | contrato `efeonce.surface-composition` 0.1.1 (`candidate`, acepta intents 0.1.0): modela el contenido de las láminas aprobadas (`levels`, `note`, `panels`, `figures` con fuente, `nav`, `photo.focus`/`native`, título y marcos de hojas, `chapter`, `selection.box`, `shots`, `subtitles`, `selection.level`). `efeonceGraphicLine.surfaces` entró en 0.3.7 (contrato 0.1.0). Greenhouse lo fija (commit `016d0a183`) |

Lab AXIS (`c2affc6`, 2026-09-26): la lámina 6.1 lista las decisiones del 26-09 y lo que sigue abierto; el acento ya no colorea texto de menos de 24 px en 1.2 y en las láminas de Insights; la anatomía de 1.2 ya no dibuja el anillo de la esfera; 5.4, 5.1 y 4.5 al día. Quedan en acento sólo rótulos de cotas en diagramas técnicos («0,20 em», la «X» del resguardo), que no son piezas.

Greenhouse: tokens y contracts 0.3.5, registry y brand-assets 0.3.1 en `develop` desde el 2026-09-26 (llega a producción con el próximo release); el adapter soporta el contrato de la órbita 0.3.1; no usa todavía el contrato de firma. Motion V1.1: las 30 variantes en el bucket (7596 archivos verificados) y en la galería del Lab (AXIS `d847b44`).
