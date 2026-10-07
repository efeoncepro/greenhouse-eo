# Registro de decisiones y versiones

> Delta Rooms verificado contra: decisión explícita del operador y fuentes de axis-design-system@f4dd2fe — 2026-10-07; revisión documental, sin implementación ni release Rooms. Los sellos anteriores conservan su ámbito histórico.

> Actualización de este corte verificada contra: axis-design-system@df2de61 — 2026-10-04. El historial anterior conserva sus fuentes por fecha.

> Verificado contra: greenhouse-eo `develop` en `b0efd42a3` (árbol local de TASK-1964) — 2026-10-02 (últimas filas: el login V4
> de Greenhouse y el avatar como referencia de identidad, 2026-10-02 (b) y (c)); antes, AXIS `d54c873` (tag `v0.4.11`) — 2026-10-01 (el Spark 2D, 2026-10-01 (g)); antes, greenhouse-eo `develop` en `d1a41babb` — 2026-10-01 (últimas filas: los perfiles sociales de
> Efeonce, 2026-10-01 a (d)); antes, `b84ec7084` — 2026-09-30 (el deck SEO/AEO aprobado y en el
> catálogo, TASK-1949; sin plantillas ni release de AXIS todavía); antes, AXIS `c92160b` (tag `v0.3.38`) y `package.json` de greenhouse-eo en `develop` — 2026-09-29, noche
> (últimas filas: el camino recorrido de la medida y los módulos de correo canonizados); antes, greenhouse-eo@f05c26e2f
> (`develop`) — 2026-09-29, noche; AXIS `0bd2758` (tag `v0.3.33`) — 2026-09-29
> (últimas filas: el deck de práctica Salesforce componible, el peso 700 de las negritas y el PDF de la propuesta sin
> insignia, TASK-1942; antes, greenhouse-eo@2c95e60b2 y AXIS `26097c5` (tag `v0.3.30`) — última fila de entonces: el Efeonce AI Visibility Report canonizado en AXIS y la pregunta abierta del camino recorrido;
> antes, las tres últimas decisiones de Marketing con Manzanitas y el patch AXIS `v0.3.29`; antes, greenhouse-eo@1050036e8: las siete decisiones publicadas en
> AXIS `v0.3.28` y su catálogo del Artifact Composer, TASK-1939; antes, greenhouse-eo@24e4c72ee:
> Glitch Flash publicado en AXIS `v0.3.24` y compuesto en el Artifact Composer).

> Documento vivo. Cada decisión del operador y cada versión publicada se registra acá con su fecha, en el mismo commit
> que la aplica. Lo que no está aquí no se da por decidido.

## Decisiones del operador (vigentes)

| Fecha | Decisión |
|---|---|
| 2026-10-07 | «efeonce-graphic-line es el nuevo design system»: Rooms adopta La órbita en toda su UI, Bricolage editorial/Poppins funcional, componentes/color/iconografía/motion canónicos. AXIS distribuye; sustituida la base Poppins/Geist propuesta. Arte cliente intacto y sin imponer narrativa pregunta/respuesta. Dossier y EPIC-052 corregidos; sin implementación, pins, release ni migración automática de Greenhouse. |
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
| 2026-09-27 | **Oficio: 30 íconos nuevos (D25):** «Bien, subamos esos íconos al package de axis y a su web, cuidando el diseño que ya tiene la web y documentando para agentes y el equipo». Aprobados 30 glifos producidos con el método de alta de cada voz y revisados en el canvas «Íconos de La órbita», sección 7: **15 de Trazo** (`correo`, `llamada`, `calendario`, `reunion`, `objetivo`, `presentacion`, `contrato`, `checklist`, `codigo`, `base-de-datos`, `nube`, `integracion`, `seguridad`, `ubicacion`, `reloj`) y **15 de Plastilina** (`lapiz`, `rodillo`, `aerosol`, `escuadra`, `postit`, `encuadre`, `pelicula`, `vinilo`, `guitarra`, `reproducir`, `varita`, `taza`, `lampara`, `trofeo`, `estrella`), estos últimos también en volumen (D24). El set queda en **27 Trazo + 33 Plastilina = 60**; volumen, 33 PNG. El Trazo del teléfono se llama `llamada`: `telefono` ya es la Plastilina y las claves son únicas entre voces. Notas de diseño conservadas (checklist, integración, correo a 20 px, presentación y la keynote de ejemplo, varita/estrella, encuadre, aerosol, vinilo, base-de-datos sin arcos elípticos): [iconography.md](iconography.md) §13. Vive en AXIS main@cf77452 (2026-09-27): `@efeoncepro/axis-graphic-line` 0.5.0 y `@efeoncepro/axis-brand-assets` 0.3.3 (tag `v0.5.0`), guía §«Catálogo aprobado», delta D25 del ADR de iconografía y Lab `/references/iconography/`. |
| 2026-09-27 | **IA, social y staff: 19 íconos aprobados (D26):** «Subelos todos a excepción del hoodie de trazo que no parece un hoodie». Aprobados **9 de Trazo** (`ia`, `composer`, `buscador`, `influencer`, `prensa`, `social`, `multimedia`, `assets`, `staff-gorra` con label «Staff») y **10 de Plastilina** (`chispa`, `prompt`, `barra-busqueda`, `aro-de-luz`, `television`, `like` «Me gusta», `galeria`, `biblioteca` «Biblioteca de assets», `hoodie` «Hoodie Efeonce», `gorra` «Gorra Efeonce»), cada Plastilina con su volumen. **No entró** el Trazo del hoodie (`staff-hoodie`): no se leía como hoodie; el hoodie existe sólo en Plastilina. Una clave por voz para cada concepto: ia/chispa, composer/prompt, buscador/barra-busqueda, influencer/aro-de-luz, prensa/television, social/like, multimedia/galeria, assets/biblioteca, staff-gorra/gorra. Ninguno imita la interfaz ni el logo de un asistente de terceros (ChatGPT, Gemini); hoodie y gorra van sin logo dibujado: la marca la pone la esfera (capucha en el hoodie, panel frontal en la gorra). Notas de uso: influencer (Trazo) al responder se parece a talent, no van juntos; chispa no va con estrella ni varita; galería y biblioteca se usan separados; prompt es el más débil a 32 px. El set queda en **36 Trazo + 43 Plastilina = 79**; volumen, 43 PNG. Vive en AXIS main@cf77452 (2026-09-27): `@efeoncepro/axis-graphic-line` 0.6.0 y `@efeoncepro/axis-brand-assets` 0.3.4 (tag `v0.6.0`), guía §«Catálogo aprobado», delta «IA, social y staff: 19 glifos nuevos (D26)» del ADR de iconografía y Lab `/references/iconography/`. Detalle: [iconography.md](iconography.md) §13 y §13.2. |
| 2026-09-28 | **Trazo swipe «Desliza» (D28):** «Ok, ese icono queda aprobado y hay que canonizarlo, ahora haz su versión también de plastilina y ponla aparte porque debemos tener las dos». Entra el Trazo `swipe` (clave distinta de la Plastilina `deslizar` de D27, que ya existía): mano inclinada 15°, arco sobre el dedo y esquina del set como flecha. AXIS `main@3e1d971`, `axis-graphic-line` 0.8.0 (tag `v0.8.0`); el set queda en **37 Trazo + 48 Plastilina = 85**. La Plastilina candidata con la misma forma queda **pendiente**: aprobarla y decidir si reemplaza a la `deslizar` de Glitch o convive como `mano`. Detalle: [iconography.md](iconography.md) §13.3. |
| 2026-09-28 | **Plastilina mano «Desliza» (D29):** «Aprobada»; ante reemplazar o convivir con la `deslizar` de Glitch, el operador eligió **conviven**. `mano` es el par de `swipe`: mano inclinada, flecha curva maciza con punta compacta sobre el dedo y esfera en la punta del dedo. Rechazada antes la versión sin flecha («el objetivo no es la mano, es que se entienda el concepto del swipe»). AXIS `main@efe4d32`, `axis-graphic-line` 0.9.0 y `axis-brand-assets` 0.3.6 (tag `v0.9.0`); set **37 Trazo + 49 Plastilina = 86**, 49 volúmenes. Detalle: [iconography.md](iconography.md) §13.3. |
| 2026-09-26 | **Iconografía canonizada (D22):** el operador canonizó la iconografía completa («esto es lo que quiero»): Trazo (12 glifos) y Plastilina (18 glifos, receta, método, «no hacer», formatos) y las dos voces por línea (Trazo: Growth, Engine, Revenue; Plastilina: Brand; Voice por decidir). Vive en AXIS: tokens `efeonceGraphicLine.icons` (`axis-tokens` 0.3.6), `@efeoncepro/axis-graphic-line/icons` (0.4.0) con `resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg` y los comandos `icons:export|check|vectorize`, página `/references/iconography/` y guía `docs/agent-composition/iconography.md` (PR efeoncepro/axis-design-system#3 mergeado; publicado el 2026-09-26 con el tag `v0.3.6`). |
| 2026-09-26 | **Fondo de la iconografía (D21):** el fondo Efeonce `#001a33` va en **todas** las líneas de servicio, no sólo en Growth («El fondo de Efeonce es el que quiero»). En AXIS queda como `efeonceGraphicLine.icons.background = '#001a33'` (`axis-tokens` 0.3.6, publicado 2026-09-26), que `iconColors` usa en todas las líneas; el `darkBg` de `lines[]` (`#091951` fuera de Growth) sigue rigiendo las superficies de las piezas sin íconos. Todos los acentos pasan 3:1 contra ese fondo (Engine 3,8; Voice 4,7). |
| 2026-09-26 | **Órbita sesgada (D20):** se queda como la firma de Plastilina. Una elipse inclinada alrededor del objeto protagonista, que pasa por detrás y por delante con un calado (el gesto del isotipo, la nave dentro de su órbita); el arco en el acento recorre el frente y termina en la esfera, fuera del objeto. Sólo alrededor del protagonista de Plastilina, una por pieza, nunca cruza el texto y **nunca mide**: todo lo que mide, enfoca o cierra la marca sigue siendo circular. |
| 2026-09-26 | **Íconos planos, color (D18):** consistente dentro de cada línea de servicio (fondo, tinta y el acento de la línea) y cambia de acento según la línea; nada de colores por objeto ni tintes inventados. La primera exploración a mano quedó descartada. |
| 2026-09-26 | **Íconos, especificación (D17): aprobada.** Grilla 24 con margen 2; trazo 1,5 (1,75 en 20 px o menos; tope de 4 px sobre 64 px); remates y uniones redondos; esfera rellena de radio 1,75 en el acento con 0,5 de aire; respuesta desde 20 px; responde sólo el ícono activo o protagonista, descansa si la pieza ya tiene esfera y nunca va como viñeta. Documentada en `iconography.md`. |
| 2026-09-26 | **Íconos (D16): híbrido A + B.** El trazo limpio es el ícono (estado **reposo**); la esfera es un estado (**respuesta**), no parte del dibujo: una pieza del glifo se vuelve esfera (reemplaza) o la esfera aparece donde la acción se resuelve (completa). Tinta blanco/navy; el acento sólo en la esfera. La dirección C (órbita abierta, contornos con corte) queda descartada. Canvas de trabajo: claude.ai/artifact/Y9mx42L72zYc6iLg4j3Maj. |
| 2026-09-26 | **Capa gráfica sobre la foto, entera (amplía P-5 de D10):** el operador la aprobó también fuera de los casos de la línea (voz, lente, medida). Se compone sobre las reservas de la toma, sin scrim; los ejemplos compuestos rechazados del 19-09 siguen sin valer. Canon: maestro §9, §10 y P-5; `photography-convergence.md` P-5. |
| 2026-09-26 | **Banco de fotografía y guía «El porqué» en AXIS:** aprobados por el operador y publicados (`/references/photography/` y `/references/photography/why/`, con `why.json` para agentes). Complementan las skills de fotografía; el canon sigue en `docs/operations/brand-photography/`. |
| 2026-09-27 | **Glitch: sub-línea complementaria de La órbita, sólo para Glitch.** Aprobados el sistema de portada A/B/C con su regla de rotación (nunca dos semanas seguidas con la misma plantilla) y el feed de nueve semanas, la lámina interior y la contraportada del carrusel; ajustes aplicados: cabecera sin línea fina, «El micrófono se abre…» abre la noticia 1 (no la portada), «Desliza» con la mano Plastilina. Detalle y estado por pieza: [glitch.md](glitch.md). |
| 2026-09-27 | **Glitch: decisiones del operador (Delta del ADR de Glitch):** «Si, aprueba la manzana, temas licencia de Gutery, glitch es línea growth, la próxima edición efectivamente es la 17, aprueba el alta de los 5 glifos, el nemonico hay que evaluarlo y aprobarlo, que lleva el lower third? Me gustaría definirlo junto contigo». **Aprobados:** la manzana como esfera de Glitch y el verde `#6ec207` como acento de franquicia (dejan de ser exploración; el token `glitchLine` de TASK-1922 ya no está bloqueado por esa aprobación); Glitch es línea de servicio **Growth** (eslogan «Empower your Growth», como ya estaba); la próxima edición es la **#17** (la serie sigue la del blog y del pipeline editorial; los «#11»–«#14» del canvas son ejemplos de diseño; el conflicto #11 vs #16 queda resuelto); el alta de los 5 glifos Plastilina (guardar, compartir, recomendar, comentar, deslizar), que libera el gate de ese slice en TASK-1922. **Sin decidir:** el mnemónico del video (evaluarlo y aprobarlo en una evaluación dedicada); el contenido del lower third (en definición con el operador); la licencia de Guttery (respuesta ambigua, **por confirmar con el operador**); el paso del flujo de composición del ADR a `Accepted` (sin respuesta). Detalle: [glitch.md](glitch.md). |
| 2026-09-27 | **Glitch: licencia de Guttery confirmada.** El operador aclaró «En gutery tenemos licencia»: Guttery se usa en web y video para las muletillas del narrador; TASK-1922 registra la referencia del contrato y la sella en AXIS. Detalle: [glitch.md](glitch.md). |
| 2026-09-27 | **El video no se compone en el Artifact Composer (opción b, TASK-1919):** el composer entrega cuadros fijos, el último cuadro del loop y capas con alfa; la animación sigue en la pipeline de motion (`orbit:video`, masters del reveal v1.1). Sólo las recetas **aprobadas** tienen plantilla; `audiovisual.close-reveal` falla con `recipe-outside-composer`. |
| 2026-09-27 | **Portadas y contraportadas de brochure y propuesta (canvas por superficie, página Deck):** foto ↔ sin foto entre portada y contraportada; mensaje de la contraportada por documento (propuesta: «Empower your Growth» como mensaje principal, sin «¿Conversamos?»; brochure: «¿Conversamos? Cuando quieras.» con el eslogan de firma); la portada habla con la voz de la línea y **nunca lleva el eslogan**; logo de Efeonce a 500 px en 1920 (las clásicas del contrato, 230 y 220 px, retiradas); ningún texto cruza la órbita ni al sujeto (se acorta la frase); una portada de brochure por línea con su acento y **cinco pares aprobados** (`criteria.md` §4); la órbita gigante sin foto es portada de propuesta (con el logo del cliente dentro, caja fija) y contraportada de brochure, nunca portada de brochure; selección y cursores sólo sobre la columna o el logo del cliente, un cursor en 16:9. Norma: `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6; resumen en `applications.md` §L y en la skill `deck-studio`. Sin receta del contrato todavía: TASK-1926 (plates) y TASK-1927 (contrato). |
| 2026-09-27 | **Las 69 láminas del deck aprobadas, con receta por lámina** (canvas por superficie, página Deck): todo lo que era opción, prueba u «opción sin elegir» pasa a aprobado (lente, sangre, partida, foco, respiro, hoja de contactos, secciones de cine, las tres portadas generales del brochure y la de cinco líneas con selección y cursor de Nexa). **Tríptico:** una palabra por toma, cada una con su esfera («Escucha.» «Crea.» «Mide.»), reemplaza la frase única. **Sección partida:** el indicador sube por la **izquierda** con la esfera arriba a la izquierda, en tres variantes (esquina arriba, esquina abajo, panel a la derecha); la órbita a la derecha, descartada. **Registro cine:** excepción aprobada para las láminas de sección y «about» («Quiénes somos», «Por qué lo hacemos»), sin ampliar a otras superficies. **Cotización** en tres variantes (tabla, escena, en vivo; `[MONTO]`); **día a día** con cuatro momentos, herramientas y dos «vívelo»; **próximos pasos** con la agenda abierta (reemplaza tres columnas); **clientes** en un tono navy (Aguas Andinas y UC Temuco en tonos de navy); **caso Sky** con foto de ejemplo a reemplazar; **BeX:** la escalera es la principal. Catálogo: `docs/operations/brand-graphic-line/deck-recipes/` (JSON `efeonce.deck-slide-recipes.v1`, `pnpm brand:deck-recipes`); norma §4.6 «Recetas por lámina» y delta (c). AXIS (tokens, recetas, `cine-requires-nexa-or-proposal`) y las plantillas del composer se sincronizan en TASK-1927; pendientes de QA en el README del catálogo. |
| 2026-09-27 | **Glitch: música aprobada, sólo Glitch** (tema B: intro, cortina y salida; cama post-punk bajo la noticia): «Definitivamente la B es la decisión», «Me parecen bien todas», «Post-punk definitivamente». Reemplaza la decisión «voz sola bajo las noticias» del sonido. Másteres en el bucket `glitch/music/v1/` (URL + sha256, nunca regenerados); integrada al taller (`tools/glitch-motion/src/music.mjs`, pre-roll animado de la intro elegido por el operador, `--music off`); en producción en AXIS (`/references/glitch/#musica`, `glitch.json → music`, commit `87c3298`). Único pendiente: probar la mezcla con la voz real del host. Detalle: [glitch.md](glitch.md) §13.7. |
| 2026-09-27 | **Glitch: motion y sonido aprobados, sólo Glitch.** Motion (apertura y tarjeta final v2, kit de overlays con el lower third de la órbita, transición de bytes entre piezas y entre escenas, héroe): «Si, el tuyo también está aprobado». Diseño sonoro **versión B**: «La b me encanta más» / «Sus sonidos están aprobados» (la A queda descartada, sólo con `--sound a`). Pre-roll de la intro «los tres puntos al ritmo» (3,2 s, opaco, empalme PSNR ∞ con la apertura), elegido por el operador. Todo se produce en el taller `efeoncepro/efeonce-brand-workshop` (`tools/glitch-motion`, HyperFrames; sonido en `src/sound.mjs` sobre `tools/brand-sound`; música en `src/music.mjs`), empujado a `main` = `ed89a0b`. Verificado: v2 37/37, kit 95/95, 12/12 pruebas. Detalle: [glitch.md](glitch.md) §12–§13; comandos: norma de Glitch §13.13. |
| 2026-09-27 | **Deck compuesto: aprobación visual del operador (TASK-1927).** El operador aprobó a ojo las láminas compuestas con `pnpm brand:compose`: las composiciones `hero` y `lines` de `proposal-cinematic` y el brochure de nueve páginas. Con esa aprobación TASK-1927 quedó `complete` (empujada después a `origin/develop`). Las portadas y contraportadas aprobadas ese día ya tienen receta del contrato y plantilla (`cover-brochure`, `cover-proposal`, `close-brochure`, `close-proposal`); `cover-classic` y `close-classic` **no** están aprobadas. Detalle: `applications.md` §L, «Componer el deck hoy». |
| 2026-09-28 | **Selección en la portada de brochure (relaja «sin selección en `cover-brochure`»).** El operador relajó la regla para la portada de cinco líneas con Nexa (`cover-brochure-cine-lines-selection`). AXIS `v0.3.21` (`axis-tokens` 0.3.21, `axis-ui-contracts` 0.3.19; delta (l) del ADR de composición por superficie) suma a `cover-brochure` el layout `document-selection`: la misma columna y foto que `document`, selección de ocho tiradores sobre la respuesta («Crecer.»), **nunca sobre la persona**, y un solo cursor colaborador «Nexa» abajo al final (escala 1.1, sin overlay); la respuesta baja 28 px (`column.answerWithSelectionExtraPx`), la evidencia queda 130 px debajo (`bodyBelowAnswerPx.withSelection`) y el logo arriba en 200. `document` y `line` siguen rechazando la selección (`selection-not-in-recipe`). Greenhouse la compone como `deck.cover-brochure.document-selection` sobre la misma plantilla `CoverBrochure`: **69 de 69** recetas del deck componen. Como la portada de cinco líneas de TASK-1927, firma con el logo y no lleva burbuja URL. |
| 2026-09-28 | **Cine en Marketing con Manzanitas: el lecho es nativo y la firma del banner puede ir fuera del centro.** El lecho es lo que de verdad hay entre la cámara y el sujeto (la mesa donde Nexa revisa cinco tarjetas); se rechazaron la mesa «matte black» en estudio vacío, las cabezas del público, el dorso de un portátil, la «consola» (salió de sonido) y el piso que le cortaba las piernas. La foto dice lo que dice el texto (opción C). En portada de blog y banner el logo puede ir abajo a la izquierda, alineado con la columna del texto. El isotipo del traje de Nexa se compone y el modelo lo termina sólo sobre su silueta. Detalle: `design-studio`, `efeonce-photographic-language.md` §3, y `.claude/rules/brand-photography.md`. |
| 2026-09-28 | **Marketing con Manzanitas: firma, cabecera, canales y eslogan, probados y aprobados** («Ok aprueba todas esas»; canvas de la línea, versión 27, sección «Pruebas»). **Una sola altura de firma** en el carrusel: la de las piezas medidas de AXIS (logo arriba en y 1202 de 1350), también en la Escena, porque la Lente del sistema firma ahí y no se mueve desde el tablero (bajar las Pizarras a 1237 no unificaba). **Cabecera de Manzanitas con su manzana, siempre arriba a la izquierda**; en la portada con foto la pregunta va en una línea. **El eslogan sólo cierra** (carrusel, story de cierre, cierre del video). **YouTube:** miniatura Escena 16:9 con el logo abajo a la izquierda. **Pódcast:** cabecera del programa a 420 px (a 160 px de grilla, 62 px). La burbuja URL sobre la mesa de la estratega **no pasa** (1 % peor 3,80:1): esa lámina sigue con el logo. |
| 2026-09-28 | **La contraportada de un carrusel es una pieza social, no una hoja** (operador: «estás tratando esa contraportada como una hoja de documento bonita… es la contraportada de un post de social media»; «en vez de dejar un cierre genérico… un texto corto accionable… conversacional»; «la idea es que haya equilibrio»). Pide **una sola conversión**, el comentario ligado a una acción que se hace hoy (Engine: «¿Te nombra la IA? **Pregúntale.**» + «cuéntanos en los comentarios si apareces»; Brand: «¿Qué no cambia en tu marca? **Escríbelo.**»). La **manzana de la portada vuelve «escribiendo»** con sus tres puntos, en el acento de la línea (escala 3,3, sin texto encima), y la cabecera va sin manzana, como en la portada. **Nada simula un botón**: se retiraron la fila de íconos de Recomendar, Compartir y Enviar; guardar, compartir y enviar se piden en el copy del post. **Eslogan en bloque con el logo, debajo y más chico** (logo de 400 px arriba, eslogan de 24 px debajo al 64 % de su ancho y separado 1,35 veces su fuente; el bloque termina en la línea de firma). Canon social: una conversión por carrusel y ningún botón falso (`docs/audits/social/2026-07-28-carousel-storytelling-platform-research.md`). |
| 2026-09-28 | **Contraportada de Manzanitas aprobada: la manzana a escala** («Nos quedaremos con esto»). De tres caminos de punch (A escala, B órbita, C color), el operador eligió la A refinada: la manzana de la portada 3,8 veces más grande, recortada por arriba y por la derecha, con su cuerpo y los tres puntos como burbuja escribiendo y sin astilla del tallo en el borde; 100 px de aire bajo la manzana y 120 sobre el logo; bajada en una línea («En los comentarios: …»). La C (acento a sangre) quedó rechazada por saturación y porque el logo positivo trae el isotipo azul (ver `criteria.md`). Vale para Brand y Engine; canvas de la línea, versión 38. |
| 2026-09-28 | **Marca de producto de Efeonce Insights, canónica** («Me encanta, canonízalo»; canvas «Insights en vivo»). Sigue la regla de la familia (Globe, Wave, Reach: palabra en sans geométrica pesada + una sola letra convertida en símbolo del acento): «insights» en Poppins Bold, minúscula, tracking −18/1000, y **el punto de la primera «i» es una órbita mínima** —anillo en la tinta de la palabra (trazo 56/1000, un tercio del fuste; radio exterior 130), esfera en el acento de Growth (`#36c8bf` en oscuro, `#0e8c82` en papel; radio 48) a las 1:30 con un corte de 14 alrededor—. Refinado respecto de la propuesta: anillo del 20 % al 33 % del fuste, tope bajado de 948 a 890 (cerca del ascendente) y esfera incrustada con corte en vez de flotar. Isotipo = esa «i» sola. **Va junto al logo de Efeonce** (separador fino; los tres centrados en vertical, con las alturas de x ópticamente alineadas, ±1 px), **sin «by efeonce»** y **nunca firma**. Mínimo sugerido 18 px de cuerpo. Se construye con `scripts/brand/build-insights-logo.mjs` (Greenhouse) y vive en `axis-brand-assets` (`insights-logo-*`, `insights-isotype-*`; commit AXIS `25b5ecf`). **Lockup con Efeonce: Insights baja su brillo** (operador: «hay que bajar a uno de los dos brillo»; medido: Efeonce ya pesa 34 % más en tinta, así que bajar Efeonce enfrentaría peso contra brillo y ninguna mandaría). La palabra y el anillo van en el gris de marca medido —`#6f89a2` sobre el fondo oscuro `#001a33` (4,83:1; sobre el navy `#023c70` baja a 3,07:1; el gris fusionado de la burbuja) y `#6b6b6b` sobre papel (5,0:1; el de «Empower your»)— y sólo la esfera conserva el acento, como el eslogan; el logo de Insights **solo** sigue a tinta plena. El lockup es **un archivo oficial** (`insights-lockup-{positive,negative}`, tipo nuevo `lockup`): Efeonce 30 px, aire 20, filete 1 × 26, aire 20, Insights 31,5, centrados; nunca se rearma. **Publicado:** `axis-brand-assets` **0.4.0** (tag `v0.4.0`, commit AXIS `4760e3e`). |
| 2026-09-28 | **Glitch: dos formatos, la edición semanal y el Glitch Flash.** «este es un glitch flash porque no es la edición entera, por tanto en este caso solamente no lleva edición con número, puede ponerse algo como flash en la imagen». La edición semanal sale los lunes, se numera «Edición #N» y es un Top 8; el **Flash** se dispara ante una noticia puntual y **no lleva número**: su cabecera dice «NO ESPERA AL LUNES» sobre una estela de bytes + «FLASH»; chip interior «ANUNCIO», sin avance n/8; Threads, la portada sola sin «Desliza». El operador pidió «más personalidad» y aprobó el resultado publicado. Detalle: [glitch.md](glitch.md) §14. |
| 2026-09-28 | **Glitch: la muletilla de la contraportada varía por edición.** El gesto del narrador (Guttery) no es una frase fija: se escribe para cada edición, conversacional. En un Flash no aplica «el #N+1 sale el lunes.»; «el resto, el lunes» se rechazó («no se escucha natural»); aprobada «léelo completo / en nuestro blog.» en dos líneas («para que no esté tan pesado»). Detalle: [glitch.md](glitch.md) §2. |
| 2026-09-28 | **Glitch: el chip de la portada productiva es «LA NOTICIA».** «PORTADA» sirvió para la prueba; «en una versión productiva hay que sustituir por "La noticia" o algo así». Aplica a la portada con foto productiva (carrusel, banners del blog, Threads). Implementado el mismo día: `CoverPhoto`, `BlogBannerPhoto` y `BlogSquarePhoto` pintan «LA NOTICIA» (`24e4c72ee`, `BASELINE_DELTAS` (p)). Detalle: [glitch.md](glitch.md) §3. |
| 2026-09-28 | **Glitch: hito, primer Glitch lanzado con la nueva línea gráfica.** El Glitch Flash de Claude Sonnet 5.5 se produjo y se lanzó de punta a punta con la línea (canvas https://claude.ai/artifact/KjHuJNQXkH4vLA7pumUiaz → LinkedIn de Efeonce, Instagram, Threads y LinkedIn personal de Julio → blog https://efeoncepro.com/glitch/glitch-flash-claude-sonnet-5-5/, post 251941). Imágenes de Anthropic publicadas con crédito y sin licencia (decisión del operador para esa pieza). El operador revisa los copys antes de programar. Esa noche el Flash pasó a sistema: AXIS `v0.3.24` y seis plantillas `Flash*` en el Composer (fila siguiente). |
| 2026-09-28 | **Glitch Flash a sistema (push directo a AXIS autorizado por el operador).** AXIS tag `v0.3.24` (commit `5b3056f` en `main`; rama `c2bd797` tokens, `8a71e9e` contrato, `d33f874` docs/Lab), ejecutado por Codex tras el bloqueo del clasificador de esta sesión: `glitchLine.editions` (`weekly` \| `flash`; `editions.flash` `approved` 2026-09-28), seis piezas `flash-*` y contrato `efeonce.glitch-line` 0.2.0 (fila de versiones). Greenhouse lo fija en `53002b352` (instalación con credencial efímera autorizada por el operador) y lo compone en `24e4c72ee`: `GlitchFlashManifest`, `planGlitchFlash`, seis plantillas `Flash*`, estela determinista `flash-trail.ts` (semilla 1755, reproduce las 34 celdas publicadas) y `pnpm glitch:compose` que despacha semanal/Flash; gate visual Glitch 32/32 a 0 px. Detalle: [glitch.md](glitch.md) §9.1 y §14. |
| 2026-09-28 | **Marketing con Manzanitas: los acentos van por línea; láminas interiores con gráficos y de texto denso (propuesta).** Regla del operador: «el marketing con manzanitas ajusta sus acentos como el color de la manzana de los puntos de la orbita etc como dice la línea gráfica que es por linea de negocios». Se aplicó en el canvas de la línea (https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG, versión 39): la manzana y los tres puntos de la cabecera toman el acento de la línea en las 15 piezas canónicas; las `Antes-*` y `Prueba-*` quedan como historia. **Propuesta en revisión:** nueve láminas con gráficos (medida en la órbita, ranking, antes y después, tendencia que termina en la esfera, partes al 100 %, de cada 100, Venn de tres, matriz 2 × 2 y embudo) y tres de texto denso (concepto, comparación y paso a paso). Todas se calculan desde su dato en la lógica de la lámina y van acompañadas de los tableros «Gráficos · cómo funcionan» y «Gráficos · acentos por línea». **Pendiente:** la voz del ícono en la línea Voice (`voiceByLine.voice` vacío; mientras tanto, Trazo) y si los gráficos cuentan para «nunca más de tres Pizarras seguidas». Detalle en [criteria.md](criteria.md) §3.4 y §8. |
| 2026-09-28 | **Marketing con Manzanitas: la línea queda aprobada completa y se canoniza como registro complementario de La órbita.** «Me encantan, queda aprobada toda la línea gráfica» (canvas https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG, versión 39): quedan aprobados los formatos Pizarra, Escena, Lente y Recreo, la cabecera y la firma, la contraportada A, los acentos por línea, los 9 gráficos y las 3 láminas de texto denso (la fila anterior los llamaba «propuesta»). Canonización: «esta línea gráfica no reemplaza The Orbit que es la /efeonce-graphic-line sino que la complementa con un nuevo registro para marketing con Manzanitas»: el **registro Marketing con Manzanitas** suma reglas y piezas sólo para MCM y La órbita manda en todo lo demás. Documentado en el ADR `docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md`, la norma `docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md`, [manzanitas.md](manzanitas.md), la doc funcional y el manual. **Nada está aún en AXIS**: el plan (token, contrato, assets, módulo `charts` y Lab) queda en la norma §14, en su task y en el canvas del plan https://claude.ai/artifact/WdEJAsC6HGkKdvyNvkDbvk. Pendientes: [manzanitas.md](manzanitas.md) §13. |
| 2026-09-28 | **Marketing con Manzanitas publicado en AXIS (push y tags autorizados por el operador: «Empuja todo junto»).** AXIS `main` `06cb62d`, tag `v0.3.26`: `axis-tokens` 0.3.26 (`manzanitasRegister`), `axis-ui-contracts` 0.3.24 (`efeonce.manzanitas-register` 0.1.0 `candidate`, `pnpm manzanitas:resolve`), `axis-brand-assets` 0.4.1 (`AXIS_MANZANITAS_ASSETS`) y `axis-graphic-line` 0.10.0 (`/charts`); el release de Glitch `v0.3.25` salió primero en el mismo push. Lab https://axis.efeonce.org/references/manzanitas/. Paridad geométrica con el canvas, no de píxeles; ninguna pendiente decidida. Greenhouse aún no fija estas versiones. Al cerrar la task salió el parche `v0.3.27` (`axis-ui-contracts` 0.3.27, contrato 0.1.1): el carrusel empieza con su portada y termina con su contraportada; antes una Lente podía abrirlo. Detalle: [manzanitas.md](manzanitas.md) §10.3 · TASK-1936 |
| 2026-09-29 | **El eslogan es un elemento gráfico que acompaña la marca, no un texto: siempre debajo del logo y al 64 % de su ancho** («el eslogan no es un simple texto es un elemento gráfico que acompaña la marca»; pidió 85 % y confirmó el 64 % del canon: «Ponlo a 64% entonces esta bien»). Se dimensiona desde el logo (cuerpo = 0,64 × logo ÷ 11,586 em). Aplicado al correo de Insights y al informe del Grader en el canvas. |
| 2026-09-29 | **«¿Conversamos? Cuando quieras.» sigue siempre la norma de la voz** («debe ser las normas de /efeonce-graphic-line»): pregunta chica con anillo, respuesta ≥ 3× en Bricolage 760 con la esfera en lugar del punto, también fuera del deck (contraportada A4 del informe del Grader). |
| 2026-09-29 | **Marketing con Manzanitas: siete pendientes decididas y el registro compone en el Artifact Composer (TASK-1939).** Decisiones del operador: (1) la voz de «Desliza» en Voice es **Trazo** (`swipe.lineOverrides.voice`; en La órbita, Voice sigue sin voz de ícono); (2) los gráficos, la lámina de dato y el texto denso **no suman** a «nunca más de tres Pizarras seguidas» **ni cortan** la racha (`recreo.pizarraRun`); (3) la portada Pizarra con la mano en respuesta es una **excepción registrada** (`cover-pizarra-swipe-response`); (4) la zona segura de la story es **el 87 % de AXIS** (la firma de la Escena story sube a y 1619); (8) las recetas de gráficos siguen **sólo para MCM**; (9) el navy `#022a4e` del texto del logo es **tinta compartida de la familia Manzanitas** (Glitch lo declaró compartido: `glitchLine.scope.sharedWithEditorialFamily`, Greenhouse `c1e0ddfae`); (10) un tema de **Salesforce** lleva `revenue-salesforce` y uno de HubSpot o genérico, `revenue-hubspot`. **Siguen abiertas:** (5) el copy de cierre de la story, (6) el cine con personas del equipo en redes y (7) los Trazo `republicar` y `enviar`. Publicadas en AXIS con el tag `v0.3.28` (commit `2bfe206` en `main`): `axis-tokens` 0.3.28 (`manzanitasRegister.resolvedDecisions`), `axis-ui-contracts` 0.3.28 (contrato `efeonce.manzanitas-register` **0.2.0**, acepta intents 0.1.x) y `axis-graphic-line` 0.10.1; Greenhouse las fija con `axis-brand-assets` 0.4.1. **Composer (TASK-1939, `in-progress`, commit `1050036e8`):** `pnpm manzanitas:compose`, dos catálogos sobre una carpeta (`manzanitas-carousel` PDF y `manzanitas-stills` PNG), 18 plantillas para las 26 piezas aprobadas, painter de gráficos inyectado, assets precoloreados por línea, reglas de una línea que fallan cerradas y gate `pnpm composer:visual-gate --catalog=manzanitas` (sección `2026-09-29 (r)` de `BASELINE_DELTAS.md`). Los tres cierres aplican la regla del eslogan del 2026-09-29: con el logo de 400 px **sólo Voice** lleva la palabra en el acento (consecuencia que se le presenta al operador), y el cierre de YouTube pasa el eslogan de encima a debajo del logo. **Pendiente:** la aprobación visual del operador de los carruseles de ejemplo. Hallazgos para un patch de AXIS y detalle: [manzanitas.md](manzanitas.md) §10.1, §10.3 y §13 · ADR `MANZANITAS_REGISTER_DECISION_V1.md`, Delta 2026-09-29. |
| 2026-09-29 (tarde) | **Marketing con Manzanitas sin decisiones abiertas: las tres últimas decididas y el patch AXIS `v0.3.29`.** (5) **El texto de cierre cambia con el contexto y nunca queda fijo**; se normaliza su extensión («El texto de cierre tiene que variar dependiendo el contexto, no puede quedar fijo, lo que sí puedes normalizar es su extensión para que no rompa el diseño»): `manzanitasRegister.closeCopy` (`varies: 'by-context'`, `fixed: false`, piezas `back-cover-a` y `story-close`, `maxChars` pregunta 44, respuesta 10, bajada 56); el contrato devuelve `close-copy-too-long` y exige la voz de la story de cierre (`voice-missing`); el «Guárdala» provisional se retira. (6) **Las fotos cine de MCM pueden mostrar a personas reales del equipo actual**, sólo desde las fotos que mantiene Greenhouse («tienes que ponerlas sin la foto de María Fernanda, en sustitución de María Fernanda está Valentina Hoyos»): `teamPeople = { allowed: true, rosterSource: 'greenhouse-team-roster', onlyCurrentTeam: true }`, sin nombres en el token; roster `docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md` (equipo con hoodie Efeonce, Julio con polo, Valentina con su ropa: «Esos retratos son viejos, hoy todos a excepción de Valentina y de mí salen con Hoodie Efeonce»), seis personas nuevas en `PERSONAS` de `foto:prompt` **en prueba** hasta que el operador apruebe cada hoja de contacto, y el cuarto caso del registro cine. (7) **Los Trazo `republicar` y `enviar` entran al catálogo** («tienes autorización de crearlos»): `republicar` en `replace` (la punta de la flecha de arriba es la esfera, aire 0,500) y `enviar` en `complete` (avión de papel; la esfera donde llega el envío, aire 1,389); `ICON_CATALOG` pasa a 88 (39 Trazo + 49 Plastilina). **Patch autorizado** («Te autorizo a publicar el patch de axis que indicas»): tag `v0.3.29`, AXIS `main` `f722a6f`, «Release UI packages v0.3.29» y CI de `main` en verde: `axis-tokens` 0.3.29 (`pendingDecisions: []`, `resolvedDecisions` con diez), `axis-ui-contracts` 0.3.29 (contrato `efeonce.manzanitas-register` **0.3.0**) y `axis-graphic-line` 0.11.0; `axis-brand-assets` sigue 0.4.1 y `axis-ui-registry` 0.3.1. Cierra los hallazgos de TASK-1939: `efeonceGraphicLine.slogan.widthEmByWord` y adiós a `closeLockup.sloganPx` (el manifiesto trae `slogan.px`, `gapPx`, `widthEm`, `wordInAccent`, `wordColor`, `position: 'below-logo'`), rótulos del gráfico en el contrato (`chart-labels-invalid`), la órbita del paso en `pieces['step-pizarra'].orbit`, ejemplos corregidos («Aún no», «Quién cita», «De cada 100» sin «leads»; todos 0.3.0) y el Lab al día. **Greenhouse** (`2c95e60b2` en `develop`) fija esas versiones, regenera `brand:tokens`, `glitch:tokens` y `manzanitas:tokens` sin drift y deja el gate visual a 0 px (manzanitas 18, glitch 32, graphic-line 73); el catálogo toma el eslogan y la órbita del paso del token y los slots de cierre usan `closeCopy.maxChars`. Detalle: [manzanitas.md](manzanitas.md) §4.2, §7, §10 y §13 · [iconography.md](iconography.md) §13.4 · ADR `MANZANITAS_REGISTER_DECISION_V1.md`, Delta 2026-09-29 (b). |
| 2026-09-29 (tarde) | **Submarcas de producto SEO/AEO, aprobadas con logo: «la órbita vive en la O».** «todas estas son submarcas de producto de Efeonce» y «están aprobados todos» (canvas de registro «Marcas SEO y AEO de Efeonce», https://claude.ai/artifact/3wPmSbb24fm1pJqAPcv9ac: sistema, hojas por marca, versión en blanco y aplicaciones). **Efeonce \| SV360** (Search Visibility 360, la capacidad completa SEO + AEO), **Efeonce \| AEO** (visibilidad de marca en respuestas de IA), **Efeonce \| AEO Assessment** (el proceso que evalúa la marca; el operador corrigió «AI Assessment» por «AEO Assessment») y **Efeonce \| AI Visibility Report** (el entregable). Acompañan a Efeonce y nunca firman (patrón de Insights). La o de Efeonce ya es la nave en órbita y cada submarca la hereda en su O: AEO (esfera a las 1:30), el 0 de SV360 (vuelta completa: esfera a las 12) y la o de «Report»; Poppins Bold, descriptores en Medium más chicos; anillo fino en la tinta, esfera en el acento de **Engine** (`#0375db`), corte alrededor de la esfera; **descartado el anillo pleno** (se lee como una C con punto). Lockups con las medidas del de Insights, submarca en gris medido (`#6b6b6b` / `#6f89a2`), sólo la esfera en el acento; variantes `positive`, `negative` y **`white`** (nueva: todo blanco, para fotos y fondos de color). SEO/AEO = línea **Engine** (`#0375db`, fondo `#091951`, «Empower your Engine»); la paleta Engine quedó aprobada con la portada del informe. Primera aplicación: el PDF del Grader (TASK-1938). Actualiza el ADR de naming AEO (Delta 2026-09-29). Canon: manual §7.2; [criteria.md](criteria.md); [applications.md](applications.md) §B3c. |
| 2026-09-29 (noche) | **El vestuario del equipo en las fotos lo decide la línea de la pieza, no la persona** («para todas las líneas de negocio sea la bomber y/o softshell de los uniformes corporativos, y para los servicios creativos sea el hoodie, esto por la "personalidad" de las líneas de negocio»; antes, el operador aprobó las seis identidades: «Está perfecto, aprobado»). Servicios creativos (`brand`) → **hoodie** Efeonce; `growth`, `engine`, `voice`, `revenue-hubspot` y `revenue-salesforce` → **bomber o softshell**, con el polo debajo si se quiere (las dos chaquetas se diseñaron para ir sobre el polo) y nunca el polo solo. Vale para todo el equipo, Julio y Valentina incluidos: la ropa por persona («Julio con polo», «Valentina con su ropa») describía las fotos de referencia. En esas piezas la línea manda sobre el código de vestuario por registro de escena, que sigue para piezas sin línea. `pnpm foto:prompt` lo exige: con alguien de `EQUIPO_REAL` en `identidad` y `linea` declarada, la prenda de `objetos` debe ser la de la línea (`validarVestuarioDeLinea`, que lee las líneas de `efeonceGraphicLine.lines`); el auditor de registro ya no avisa por polo bajo chaqueta. Los plates piloto (hoodie) aprueban identidad, no vestuario. Canon: roster `EFEONCE_TEAM_ROSTER_V1.md` §«El vestuario lo decide la línea de servicio» · [manzanitas.md](manzanitas.md) §4.2. |
| 2026-09-29 (noche) | **Avatares oficiales y firmas del equipo.** Todo el equipo con la **bomber** sobre el **polo piqué** (Julio y Valentina incluidos: «No, Julio y Valentina ponles bomber»). Fondo del avatar: «pon el fondo navy con el halo de la línea gráfica la órbita» (el navy solo «pequeño se siente plano»): el que pinta `orbitSvg` sobre oscuro (`#001a33` + halo del acento con las paradas del token, radio `haloRadiusRatio` × órbita de retrato), **sin anillo ni arco**, porque la órbita la pone la firma (`portrait`). Caras del mismo tamaño y a la misma altura medidas con Vision (medir a ojo erró hasta 104 px de mentón); Daniela y Humberly más lejos del lente para que se vea la chaqueta. Firmas v3.1 para las seis personas con esos avatares; teléfono: el WhatsApp de la agencia (+56 9 3732 3064), Julio el suyo; LinkedIn después. Dónde: GCP `gs://efeonce-group-axis-public-media/team/avatars/v1/{1080,800}/` · firmas `…/email-signature/v3.1/people/` · OneDrive `Alineación/6. Marca/Kit media/{Firmas,Avatar/2026-09 La órbita}/`. Luis salió del equipo. Canon: roster `EFEONCE_TEAM_ROSTER_V1.md` §«Avatares oficiales del equipo» y §«Firmas de correo del equipo». |
| 2026-09-29 (noche) | **El Efeonce AI Visibility Report, aprobado y canonizado en AXIS; su órbita dice la gravedad.** El operador aprobó el informe (el PDF del AEO Assessment, submarca de producto en la línea Engine) y pidió canonizarlo en AXIS. **Medida con gravedad:** sólo un puntaje con escala de gravedad publicada colorea la estela, la esfera, su brillo y el punto de la etiqueta (sobre `#091951`: `error[400]` `#e25a61`, `warning[500]` `#ffb703`, `success[400]` `#46a877`, cada uno ≥ 4,5:1; sobre claro `error[600]`, `warning[900]`, `success[500]`, ≥ 3:1); anillo, marca de partida y cifra no cambian; etiqueta en texto obligatoria y escala visible; sin dato, anillo y partida solos, «—» sin «de 100»; los umbrales son del productor. **No** es permiso para la marca de estado, que sigue sin semáforo ([criteria.md](criteria.md) §3.4 y §3.10). Publicado en AXIS `v0.3.30` (fila en «Versiones publicadas»). Dirección sellada en Greenhouse: `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md` (commit `c76d75711`); el renderer y la adopción de AXIS 0.3.30 son de TASK-1938. |
| 2026-09-29 (noche) | **El deck de práctica Salesforce, aprobado y canonizado en el catálogo** («Esto está aprobado todo, canonicemos»): 19 láminas en cinco actos; doce recetas nuevas (`content-one-platform`, `method-agent-supervisor`, `decision-platform-coexistence`, `decision-provider-fit`, `content-service-lanes`, `content-season-launches`, `method-identity-consent`, `method-migration-reconcile`, `content-day-release-cycle`, `content-day-live-library`, `content-live-chat`, `content-measure-formulas`) sin plantilla todavía, y ocho láminas como `approvedUses` de recetas existentes (cuatro no caben en sus slots). La línea `revenue-salesforce` pasa a aprobada en la portada de línea; el badge «Salesforce Partner» es un slot opcional condicionado a readback (`partnerMark`); Agent Astro, Claude y Claudeforce, slots opcionales sujetos a autorización; eslogan en bloque al 64 % registrado en `close-proposal-horizon` (cierra el delta de TASK-1933 para esa receta). Pendiente del operador: portada de brochure con contraportada de propuesta en la narrativa aprobada. Deck HubSpot pendiente (TASK-1943). Norma §4.6 «Deck de práctica Salesforce»; TASK-1942. |
| 2026-09-29 (noche) | **Deck Salesforce: decisiones del operador al canonizar.** (1) SF5, SF10, SF11 y SF18 no cabían en sus recetas y nacen como recetas propias: `decision-diagnosis-verdict`, `method-waves`, `content-day-live-console` y `content-day-live-approval` (94 recetas, 16 sin plantilla; las 78 anteriores no cambian `contentType` ni slots). (2) **Servicio de SF16: «Enablement conversacional».** (3) **Dos cierres:** como brochure, `close-brochure-orbit` en la línea `revenue-salesforce` («¿Conversamos? Cuando quieras.» + eslogan firma; la lámina no existe todavía: la compone el composer y necesita visto bueno); como propuesta, SF19. Los dos planes validan (`pnpm brand:deck-plan`, 0 errores, 16 avisos) y son fixtures probados. (4) **Logo de 700 px sólo en la contraportada Salesforce** (`sloganBlock`); las del 2026-09-27 siguen a 500 px. (5) **Columna de la portada en 190** como se aprobó: reserva propia de la línea en AXIS `v0.3.32`, sin tocar las demás portadas. Norma §4.6; TASK-1942. |
| 2026-09-29 (noche, c) | **Marketing con Manzanitas aprobada para usar, como sub-línea de La órbita igual que Glitch** («Ok manzanitas esta aprobado, pero ojo no sustituye a la orbita es una sublinea dentro del design system de la orbita igual que glitch»). «Registro complementario» y «sub-línea» nombran lo mismo; desde hoy se dice sub-línea. Se usa con `pnpm manzanitas:compose` (TASK-1939 `complete`); falta la ruta productiva (TASK-1921). **Promovidas a estable Manzanitas y Glitch** con autorización del operador («Si, hazlo»): AXIS `v0.3.37` (`glitchLine` y `manzanitasRegister` `canonical`; `efeonce.glitch-line` 0.2.0 y `efeonce.manzanitas-register` 0.3.0 `stable`), sin cambio de valores ni render; los catálogos del Artifact Composer siguen `candidate` porque miden la ruta de Greenhouse, no el contrato. ADR `MANZANITAS_REGISTER_DECISION_V1.md`, delta (c). |
| 2026-09-29 (noche) | **Deck Salesforce: las negritas se componen en el peso 700 del token, no en el 800 de las láminas aprobadas.** SF16 y SF18 se ven en 800 porque el script de dirección no cargaba la cara Poppins 700 y el navegador cayó al peso más cercano; la diferencia es mínima a tamaño real y no justifica otra release de AXIS. Lección en [lessons.md](lessons.md) (2026-09-29, deck Salesforce). TASK-1942. |
| 2026-09-29 (noche, b) | **Deck Salesforce: «Todo está aprobado» y la insignia «Salesforce Partner» autorizada por Salesforce** («Todo está aprobado. Necesito que tengan el Badge de Salesforce Partner ya está autorizado por Salesforce»). (1) **La insignia va por defecto** en la portada (`cover-brochure-line-revenue`) y en la contraportada de propuesta (`close-proposal-horizon`, `sloganBlock`); «Operamos sobre» queda de respaldo; referencia estable `salesforce-partner-authorization-2026-09-29` (registro de partnerships; en el composer, `partnerMark.readbackRef`, que sigue siendo obligatorio: otro partner sin autorización falla cerrado). Logo e íconos de producto de Salesforce, autorizados; Agent Astro sigue fuera de los packages (edición interpretativa); Claude y Claudeforce esperan a Anthropic. (2) **SF20 aprobada** como cierre del deck como brochure (`close-brochure-orbit`, intent de ejemplo con 0 px contra la aprobada). (3) **Largos aprobados tal cual:** pregunta de SF6 (máximo 28 → 30) y nombres de paso de SF7 (24 → 28); gate `graphic-line` a 0 px. (4) **Costo de color** de los íconos de producto en SF1 y SF8, aprobado. Archivar la copia escrita de la autorización: recomendado, no bloqueante. Supersede la fila «SIN insignia» de abajo. AXIS `v0.3.36` publicado (tokens/contracts 0.3.36, brand-assets 0.4.5; fila en «Versiones publicadas»). [applications.md](applications.md) §L. TASK-1942. |
| 2026-09-29 (noche) | **Deck Salesforce: la propuesta se entrega SIN insignia de partner mientras falte el readback.** *(Superada por la fila (b) de arriba: la insignia está autorizada.)* El PDF `ai-generations/2026-09-29_deck-salesforce/out/Efeonce-Propuesta-Servicios-Salesforce.pdf` (19 páginas, `render-src/pdf-propuesta.mjs`) usa las variantes `-sin-badge` de SF0 y SF19 («Operamos sobre» + logo de Salesforce); la portada lleva el rótulo «Propuesta · Servicios Salesforce» (`DOC=propuesta`). Las marcas de terceros siguen sujetas a la autorización escrita. [applications.md](applications.md) §L. TASK-1942. |
| 2026-09-29 (noche) | **Firma de correo: el avatar con su órbita mide lo mismo que el bloque de texto de al lado** («Sí, voy con C»; antes le pregunté «¿cómo ves el avatar con respecto al texto de al lado?» y precisó «el bloque de avatar con la órbita con respecto al bloque de texto»). Medidos los bloques de texto, del tope del nombre a la fila de la URL: **130 px** en la personal y **106 px** en la de área (sin teléfono). `emailSignature.portrait.sizePx` 96 → 130 y `team.areaMark.sizePx` 96 → 106, publicados con el tag `v0.3.35` (autorizado: «Vamos con todo lo que indicas»). Las fotos se exportan a 3× desde el token (`ai-generations/2026-09-29_avatares-equipo/firmas/fotos-orbita.mjs`). Con el avatar grande, a 380 px el correo largo desbordaba y comprimía su ícono: la celda del ícono lleva `min-width` y el correo se parte antes de la «@» sólo cuando no cabe. Las 9 firmas, sus páginas «Copiar mi firma» y los zip de OneDrive quedaron regenerados; la URL de la foto no cambia, así que las firmas ya instaladas ven la foto nueva a 96 px hasta que la persona la vuelva a copiar. **El operador avisa al equipo** («No avises al equipo, yo les aviso»). |
| 2026-09-29 (noche) | **Fondos de Teams en la oficina de Efeonce y kit por persona.** Aprobados nueve fondos fotográficos del mismo piso moderno (01 «Responder.», 02 «Crecimiento orgánico.», 03 «Cerrar.», 04 cocina, 05 «final_final_v27», 06 «Hecho a mano. (casi)», 07 «¿Cuántos formatos? Todos.», 09 «¿Cuántas tomas? Una.», 10 «¿Y la marca? Intacta.»); el 08 nocturno se rechazó («no tiene ningún impacto visual»). Decisiones del operador: el logo de Efeonce **siempre presente**, «en 3D volumétrico o lo que sea», pero **como product placement** («en esa al menos se siente muy forzado») y **manda sobre el de Globe** («el rey es el logo de Efeonce»); oficinas **modernas**; en los fondos AEO una señal sutil (pantallas con el lockup Efeonce AEO) y en los creativos una digital (selección con cursor, la nave 3D en la tableta); **Nexa sin el uniforme no tiene sentido**; tazas de Efeonce en la cocina. Cada persona tiene su página del kit con avatar, los nueve fondos y su firma (`team/kit/<nombre-apellido>.html`). **Parqueado:** portadas de LinkedIn/YouTube y avatar de redes: se hicieron según A6/A7 («Te hacemos visible.») y el operador objetó que Efeonce no hace sólo eso (también AEO, creativo, RevOps); la propuesta de portadas por servicio quedó sin decidir. |
| 2026-09-29 (noche, d) | **La medida dibuja el camino recorrido desde las 12, en todas** («aplícalo en todas»). Cierra la pendiente del mismo día: el operador vio en el correo de Insights que un 62 % con sólo la estela corta «me hace pensar que está a menos», porque el ojo no sabe la dirección. Regla: bajo la estela, el arco de las 12 a la esfera en el mismo color al **60 % de opacidad** y con **0,75 × el trazo de la estela**; al 100 % es el anillo completo, en 0 % no existe; con gravedad, el color de la gravedad. Vale para **toda medida**, incluida la portada del AI Visibility Report. **Reemplaza** «nunca un arco que crece desde el origen» de [criteria.md](criteria.md) §3.4; la órbita sigue recorriendo (la esfera y la estela dicen el dato). AXIS `v0.3.38`: token `trajectory.measure.travelledPath`, contrato de la órbita **0.5.0** (`travelled` en toda `measure`), `axis-graphic-line` 0.13.0 (pintor, `measureSvg` y `aiVisibilityReportOrbitSvg`); las 48 órbitas estáticas, re-selladas con la misma geometría (son de acento). Greenhouse sin adoptar: su adapter sólo acepta 0.3.1. Lección: [lessons.md](lessons.md), 2026-09-29. |
| 2026-09-29 (noche, d) | **Módulos de correo de Efeonce aprobados y canonizados; el correo de Insights es una aplicación, no la plantilla.** El operador aprobó el correo de entrega de Efeonce Insights (canvas https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd v21, página «Correo»: enlace en escritorio, en celular y PDF adjunto) y pidió canonizarlo con este alcance: se canonizan definitivamente **el pie**, **los módulos de CTA** y **el bloque de marca del pie**; otros correos arman bases parecidas con su propio cuerpo. La palabra del eslogan sigue la línea de servicio (Growth, Brand, Engine, Voice, Revenue). **«Suscribirme» queda retirado**: «Agendar una reunión» lo reemplaza en todo correo y va a `https://efeoncepro.com/contacto/` con UTM (`utm_medium=email`, `utm_source={producto}`, `utm_content=pie`), nunca a un correo. Pie en orden: tarjeta de agenda `#023c70` radio 16 («¿Lo revisamos juntos?», Bricolage 700 22 px, bajada 13 px `#cfe4fa`, píldora blanca) → bloque de marca (logo 220 px y eslogan debajo al 64 %, palabra en blanco) → burbuja URL + LinkedIn, Instagram, YouTube, Threads → filete → legal 11 px `#9fb3c8` desde `src/config/efeonce-brand.ts` → filete → preferencias y baja 11 px → motivo y © 10 px. CTA principal: píldora navy `#001a33` a todo el ancho. AXIS `v0.3.38`: token `efeonceEmail`, contrato `efeonce.email-modules` 0.1.0 `candidate` (23 códigos, 6 chequeos de adapter), PNG @2x en `axis-brand-assets` 0.4.6 (logo y eslogan **separados**), Lab `/references/email/`. Dirección sellada en Greenhouse `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md`. **Greenhouse no los adopta todavía** (`src/emails/` sin cambios). Tensión registrada, sin resolver: TASK-1764 (política de presentación de correos, `Proposed`). [applications.md](applications.md) §C4. |
| 2026-09-29 (noche, e) | **Propósito del correo de Insights: servicio al cliente con excepción explícita.** El correo de entrega de Insights va a clientes: `relationship_transactional`. Como excepción explícita y documentada (`efeonce-insights-delivery`) conserva el pie aprobado completo: agenda «Agendar una reunión», redes y preferencias y baja «Dejar de recibir estos informes»; el operador la eligió frente a «sólo el botón». Los demás correos siguen la política de presentación (sin agenda, redes ni baja en transaccionales y de servicio; baja obligatoria en suscripción y marketing; redes opcionales en suscripción y obligatorias en marketing). Excepciones por tipo, con aprobador, fecha y motivo. AXIS: `efeonce.email-modules` 0.2.0 (`purpose` + `application`, sin `cta-agenda-required`), publicado en `v0.3.39` (commit `1c18a2e`). Cierra la tensión con TASK-1764 para Insights. [applications.md](applications.md) §C4. |
| 2026-09-30 | **Deck SEO/AEO (Search Visibility 360) aprobado en tres documentos** («esto está aprobado todo»; sesión «SEO deck para brochure y propuestas»). Completo 33 · brochure 24 · propuesta 29, cinco capítulos, línea Engine; SEO al nivel de AEO (SV360 paraguas; AEO Assessment, AI Visibility Report e Insights). Seis recetas nuevas sin plantilla (`content-brand-family`, `content-service-mockups`, `content-report-formats`, `content-committee-deck`, `content-industries`, `content-markets`; 100 recetas, 94 con plantilla); `productMark` opcional (lockups de `axis-brand-assets` 0.4.5); eyebrow de `proposal-cinematic-seo`/`-aeo` con `requiredUnless: productMark`; `section-cine-team.body`; 27 usos aprobados en 25 recetas; planes `golden-{completo,brochure,proposal}-seo.json` (0 errores, 6 avisos). Reglas: anotaciones fuera del deck (se quedan `mark`, `sampleMark`, `report.sample`), una sola sección partida, casos en puesta en escena con el logo del cliente compuesto (excepción `caso` de `foto:prompt`, `bb7e34b37`), logos de clientes con autorización (TASK-1937). Catálogo `2f2784d93`, intents `2382ed624`, orden del brochure `b84ec7084`. Norma §4.6 «Deck SEO/AEO»; TASK-1949 (Slices 2 y 3: plantillas y AXIS, en curso). |
| 2026-09-30 (b) | **Deck SEO/AEO: los datos quedan tal cual y el operador asume la responsabilidad** («Deja esos datos... No marques nada en el deck como provisional, asumo la responsabilidad»). Las cifras de los tres casos, su fuente, los formatos de Insights, las industrias y la cifra de Bresler se usan como están, sin marca de «provisional» ni «próximamente»; ningún agente los rotula ni los quita. El contexto (cifras reales no cargadas; correo de Insights no vivo y modo presentación sin probar al 2026-09-30; sin prueba por industria; Bresler no es cifra de SEO) queda sólo como registro en `DECISIONES.md` (`8ceb2418f`). La condición de los logos de clientes (TASK-1937) no la cubre esta decisión. |
| 2026-10-01 | **Portadas sociales y destacados de Instagram de Efeonce aprobados** (canvas «Portadas sociales Efeonce» https://claude.ai/artifact/THt6cp3Pc2njxN7Takevuu; «Esa de Nexa queda», «Bien. Estamos Ok.», «Aprobadas todas.»). Decisiones: (1) **las portadas de la página de Efeonce llevan el logo abajo** (centrado al 25 % del lado corto; si el centro cae sobre el sujeto, va bajo la columna de texto) y **las de perfiles personales lo llevan pequeño** (120 px, fuera de la órbita); (2) **la portada necesita una idea propia, no un par del catálogo**: «¿Qué hace Efeonce? Crecer.» se rechazó («Really? WTF?») y «Te hacemos visible.» ya estaba objetada; aprobadas las cinematográficas con Nexa «¿Cuántos formatos? Todos.» (foto nativa 3:1 `PS1b`) y su serie de variaciones, más «¿Entre cientos de marcas, a quién cita la IA? A ti.» (`PS2c`, línea Engine); (3) **registro cine con Nexa protagonista en portadas sociales y destacados**, aprobado por el operador al aprobar las piezas (amplía §2 del registro cine para estas superficies); (4) **destacados de Instagram como mezcla de recursos, no nueve tomas iguales** («una del ojo puede servir, una de Nexa puede servir… podemos tener híbridos»; «somos agencia de Marketing, no una óptica»): Glitch (ojo de Nexa con la manzana en bytes, sub-línea Glitch), AEO y Creatividad a escala (Nexa con el objeto de su mundo), Portafolio, Studio (Run & Gun, detrás de cámara), Agents (los Sparks), Podcast, Recetas (IA generativa) y Behind the build; un color de luz por destacada sobre oscuro, sin firma en el círculo; (5) **fuentes en el canvas Design como asset `/_blob/`** (la ruta relativa al sistema de diseño no carga). Archivos: `ai-generations/2026-09-30_portadas-sociales/` (fichas, plates, `finales/destacados-instagram/`). **Pendiente:** las historias de adentro de cada destacada; avatar de redes (opción B recomendada, sin decidir) |
| 2026-10-01 (b) | **Avatar de redes de Efeonce y entrega del kit de portadas** («Y sobre el avatar ok, es el que mejor ves? Si es así Ok»; «Subelo»). El avatar canónico de las redes es el **isotipo en negativo al 60 % sobre el oscuro Efeonce (`#001a33`) con el halo de la órbita** (paradas del token), sin anillo ni arco: un solo archivo de 1080 × 1080 para LinkedIn, Instagram, Facebook y YouTube. Portadas aprobadas en tres redes con medidas verificadas: LinkedIn 1128 × 191; Facebook 1640 × 624 (texto termina antes de la foto de perfil, abajo a la izquierda; franja central de 1110 px para el celular); YouTube 2560 × 1440 (< 6 MB; texto y logo en la zona segura ~1546 × 423; cara de Nexa centrada en la franja de escritorio). Entregado en OneDrive `Alineación/5. Contenidos/05. Highlights/2026-10 Destacados La órbita/v01/` y `13- Branding/Redes sociales Efeonce/2026-10 La órbita/v01/` con LEEME y manifiesto SHA-256. **Pendiente:** publicar en cada red e historias de adentro de los destacados |
| 2026-10-01 (c) | **Destacados de Instagram como historias completas 9:16** (operador: «para crear una historia destacada primero debes crear una historia… varias tienen azules arriba y abajo y no la historia completa»). Una portada de destacado sobre bandas lisas sirve sólo para **cambiar** la portada; para **crear** el destacado hace falta la historia 9:16 entera, con la escena llenando el cuadro, y el círculo central (y 420–1500) es la portada. Método aplicado: extender la foto aprobada con GPT Image 2.5 (relleno con máscara sobre base espejada a 1152 × 2048), igualar el tono de la extensión al cuadro aprobado en baja frecuencia y reponer el aprobado **por el borde del círculo** (radio 488 → 540 px), no por una línea recta: la unión recta se ve a tamaño real aunque el tono calce, y una segunda pasada de relleno sobre la unión **posteriza las sombras y copia la línea**. Entregado como `v02` junto a la `v01` en OneDrive `05. Highlights/2026-10 Destacados La órbita/` (manifiesto SHA-256). **Pendiente:** publicar |
| 2026-10-01 (d) | **Portadas de LinkedIn personales en el kit del equipo y aviso 1:1** («agrega también las portadas de LinkedIn para que ellos elijan la que quieran y se las envías 1:1 por Teambot»). Ocho portadas de perfil personal, 1584 × 396, derivadas de las corporativas aprobadas (2 mensajes × 4 fotos cine de Nexa): el texto empieza en x 480 para dejar libre la foto de perfil; la foto se corre a la derecha y el hueco se llena reflejando su propio borde (Formatos 240 px, Estallido 220 px; el resto 80 px); logo de 120 px bajo el texto, fuera de la órbita. Generador `ai-generations/2026-09-30_portadas-sociales/personal/linkedin-personal.mjs`; archivos en `gs://efeonce-group-axis-public-media/team/linkedin-covers/v1/` (PNG 1584 × 396 + `min/` JPG 792 × 198) y OneDrive `Alineación/6. Marca/Kit media/Portadas de LinkedIn/2026-10 La órbita/`; nueva sección «Tu portada de LinkedIn» (`#linkedin`) en la página del kit de cada persona (`ai-generations/2026-09-29_avatares-equipo/kit/paginas-kit.mjs`). Aviso por TeamBot 1:1 a Andrés, Daniela, Melkin, Humberly y Valentina (`personal/avisos-linkedin-1a1.ts`; identidad confirmada en Entra antes de cada envío; los cinco ok; correlación `manual-linkedin-cover-announcement-2026-10-01-linkedin-portadas`); commit `d1a41babb`. El operador declaró el set de perfiles sociales parte del universo gráfico de Efeonce («ya forma parte del universo gráfico de Efeonce»). Detalle: [applications.md](applications.md) §A11. **Pendiente:** publicar en cada red del perfil de Efeonce, crear los destacados y las historias de adentro (decisión y acción del operador) |
| 2026-10-01 (e) | **Ajuste de las portadas de LinkedIn personales tras verlas puestas** (el operador, con su portada ya en su perfil: «¿lo ves bien distribuido?» → «Ajusta esa y todas»). Nexa estaba pegada al borde derecho con la mano cortada y el logo flotaba lejos del texto. Ahora: foto a 1300 px sin recortar arriba, cara de Nexa en x ≈ 1190 (1130–1140 en las dos AEO con burbuja), huecos reflejados, logo de 120 px pegado bajo el mensaje y mensaje más grande (32 / 120–124 px). Publicadas en `team/linkedin-covers/v2/`, kit del equipo y OneDrive actualizados; Lab de AXIS `91c6f8b` (`social-profiles/v1/{masters,web}/linkedin-perfil/v2/`, SHA del JSON verificados en producción) |
| 2026-10-01 (f) | **El Spark en el acento de cada línea de negocio** («¿un agente Spark por color de nuestras líneas?» → recomendación: no personajes nuevos sino el mismo Spark con el LED en el acento de la línea → «Aprobados todos»). Engine (azul `#0375DB`) es el defecto; Growth, Brand, Voice, Revenue HubSpot y Revenue Salesforce sólo en piezas de esa línea; toda la luz de un solo color y el cuerpo blanco neutro. Cuidados: Salesforce casi no se distingue de Engine en un LED pequeño, Brand y Voice son vecinos, y los cálidos se prueban en cine antes de una foto oscura. 26 vistas × 5 líneas transparentes; catálogo `spark` con `patronPorColor`. Canon: `docs/operations/brand-characters/SPARKS_V1.md` §6.1 |
| 2026-10-01 (g) | **El Spark 2D, una clase aparte de los Sparks** («Puedes hacer los sparks de efeonce en versión 2d?» → «la idea no es reemplazar los 3d, es tener una versión alternativa» → «Bien, me gusta, canonízalos y mándalos al lab»; «no sustituyen [al 3D], son una clase 2D de los Sparks»). El mismo personaje en vector plano para composiciones de la línea: sin brazos, accesorio del plantel flotando a la izquierda, contorno navy sobre papel, detalle simple a 72 px o menos. **En una pieza el Spark cuenta como la órbita** (sin otra órbita ni lente) **y la voz va completa**: pregunta con anillo, respuesta con su esfera, evidencia (corrección del operador: «no siguen tanto el estilo de /efeonce-graphic-line»; mismo criterio que las portadas con Nexa, §A11). Publicado en AXIS `axis-brand-assets` 0.4.11 (tag `v0.4.11`, `d54c873`: 94 SVG, `AXIS_SPARK_2D_ASSETS`, `findSpark2dAsset`) y Lab `/references/sparks/#en-2d`. Greenhouse aún fija 0.4.10. Canon: `SPARKS_V1.md` §8.2 |
| 2026-10-02 | **El Spark que mira es canónico** («Bien canonicemoslo, porque vamos a usarlo en varias partes» → plan (a) AXIS ahora, (b) Greenhouse como task aparte → «Ok. Vamos»). Publicado en AXIS (tag `v0.4.12`, `ef7f5b2`, release en verde): `axis-brand-assets` 0.4.12 (14 capas WebP por línea, `assets/sparks-rig/v2.2/`, `AXIS_SPARK_RIG`, `sparkRigBase`, `sparkRigLayerUrl`), `axis-ui-contracts` 0.3.41 (`efeonce.spark-rig` 0.1.0 **stable**, `resolveSparkRigIntent`: el acento de la línea sale de los tokens), `axis-ui-registry` 0.3.5 y `axis-graphic-line` 0.14.0 (`/spark-rig` → `<efeonce-spark-rig>`, `/react` → `<SparkRig>`). El Lab usa el paquete y genera el archivo único público (~15 KB) en cada build. Reglas en `AXIS_SPARK_RIG_RULES`: el mismo Spark del kit, un rig por pantalla, acompaña y no decora, color de línea sólo en su superficie, movimiento reducido = sólo ojos, ningún estado sólo en el movimiento, nunca una captura en una foto. Una versión de capas nunca se pisa. Greenhouse aún fija 0.4.10 / 0.11.0: la adopción es una task aparte. Canon: `SPARKS_V1.md` §8.1 |
| 2026-10-02 (b) | **La línea en el login V4 de Greenhouse** (TASK-1964; dirección V4 aprobada por el operador ese día). Primera pantalla del producto Greenhouse con La órbita, contra el alcance escrito («No: la interfaz del producto Greenhouse»): **riesgo abierto declarado en la task**, no una regla nueva (ver Pendientes). Lo decidido: (1) la **Lente** del escenario se construye al canon de AXIS —anillo a 1,12 × el radio de la foto (`1 + orbit.ringAirRatio`), foto interior ampliada × `lens.zoom` (no saturada), exterior con `lens.outside`, trazos y esfera × ancho/794 con los pisos `orbit.arcStrokePx[0]`/`sphereRadiusPx[0]`, arco de 50° centrado en `upper-start` con la esfera en su punta y el acento de la línea de servicio de la novedad—; (2) las novedades **cine van sin lente**, porque su luz ya es la órbita de la pieza (aceptado por el operador); (3) la **voz**: «El ring y la esfera faltan como manda /efeonce-graphic-line» → anillo pequeño delante del kicker y la esfera como punto del titular, en el acento; (4) fotos del escenario aprobadas: `LG1`, `LG2e` (cine) y `LG3e` (registro B), con la excepción de cine para una persona de casting en el login (registro cine, delta 2026-10-02 (c)). Detalle: [applications.md](applications.md) §A12 |
| 2026-10-02 (c) | **El avatar oficial con la bomber es la referencia de identidad del equipo** («Es el último, descarta los anteriores, es donde salen con la bomber»). Andrés, Daniela, Melkin, Humberly y Valentina se anclan en su avatar (maestro 1080 de `gs://efeonce-group-axis-public-media/team/avatars/v1/1080/`, copiado como `ai-generations/_identidad-equipo/<persona>/avatar-bomber-2026-09.png`); `actual` y `antiguo` quedan en disco, fuera de uso. Julio conserva su set propio. Aplicado en `scripts/foto/build-prompt.mjs` (`PERSONAS`), `scripts/foto/assets.lock.json` (376 assets), el roster y `_identidad-equipo/LEEME.md`. Reemplaza la regla del 2026-09-29 que trataba los avatares como derivados no aptos de referencia |
| 2026-10-03 | **El cine también vale en superficies de producto** («Si, para producto también es necesario el estilo cine»). Caso 6 del registro cine, `alcance: "producto"` en `ALCANCES_CINE` (`scripts/foto/build-prompt.mjs`, con aviso y prueba): escenario del login, hero de producto; protagonista Nexa, roster con la prenda de su línea o casting anclado a su retrato; la superficie no dibuja otra órbita encima. `LG2e` pasa de `publicidad-prueba` a `producto`. **Pendiente:** llevarlo al contrato AXIS (`surfaces.photo.cine`, issue `cine-requires-nexa-or-proposal`) |

## Pendientes del operador (no decidir por tu cuenta)

- **La línea en la interfaz de Greenhouse (2026-10-02, TASK-1964):** el alcance de esta skill, el manual y el ADR
  dicen que La órbita no va en la interfaz del producto; el login V4 la usa (Lente, voz, mini órbita y `OrbitLoader`).
  Falta que el operador decida si es una excepción del acceso o si la línea entra a la UI de Greenhouse, y canonizarlo
  en AXIS (follow-up de la task). Mientras tanto, nadie la extiende a otra pantalla del producto. En el mismo login:
  respuesta de 1–3 palabras y kicker como etiqueta, no como pregunta ([criteria.md](criteria.md) §4).

- **Deck SEO/AEO (2026-09-30, TASK-1949):** (1) la autorización de los logos de BICECORP, Banco BICE y Berel
  (TASK-1937); (2) los cuatro largos aprobados que pasan su receta (subir el máximo o acortar, Slice 2); (3) si el lockup
  SV360 cuenta como firma en `content-markets` (foto a sangre); (4) si `content-text` conserva `productMark` sin lámina
  de referencia; (5) si las ciudades de `content-markets` son sedes o la ciudad de referencia; (6) Frame.io como canal de
  aprobación del equipo SEO; (7) si la decisión «datos tal cual» alcanza a las reglas generales de
  `content-report-formats` y `content-committee-deck` en otros decks. ~~Cifras de los casos, formatos de Insights,
  industrias y Bresler~~: **decidido** el 2026-09-30, quedan tal cual (fila de decisiones).

- **Deck de práctica Salesforce (2026-09-29, TASK-1942):** todo aprobado por el operador el 2026-09-29 (SF20, largos
  de SF6 y SF7, costo de color de SF1 y SF8) y la insignia «Salesforce Partner» autorizada por Salesforce. Sigue
  abierta sólo la **autorización escrita de Anthropic** para Claude y Claudeforce (SF16; TASK-1937): sin ella, esas
  dos marcas no salen. Archivar la copia escrita de la autorización de Salesforce junto a `DECISIONES.md` es
  recomendado, no bloqueante.

- ~~**Camino recorrido en una medida (2026-09-29):**~~ **decidido el mismo día (noche, d):** «aplícalo en todas».
  Toda medida lo dibuja, incluida la portada del AI Visibility Report; publicado en AXIS `v0.3.38` (fila de
  decisiones y de versiones). [criteria.md](criteria.md) §3.4.
- ~~**Módulos de correo vs. política de presentación (2026-09-29, tensión registrada):**~~ **decidido para Insights el
  mismo día (noche, e):** `relationship_transactional` con la excepción `efeonce-insights-delivery` (pie completo); los
  demás correos siguen la política. Otra excepción es decisión del operador, por tipo.
- **Marca de Insights fuera de Think (2026-09-28):** el archivo oficial sólo se aplica en el informe live de Think
  (lockup negativo en el hero y en la portada del modo presentación, positivo sólo al imprimir; OG propio). Las
  portadas del PDF A4 y del deck (y el pie de las aperturas de capítulo del A4 y del deck) componen una versión
  **tipográfica**: logo de Efeonce + filete + «INSIGHTS» en mayúsculas espaciadas (`uppercase` + `letter-spacing`, no
  versalitas de fuente); pie y contraportada del PDF, logo de Efeonce. **Sin decisión:** si esas portadas pasan al archivo oficial
  `insights-lockup-*` (tocarlas pasa por el contrato de fidelidad de TASK-1889), si el
  correo de Insights la lleva (hoy `brand='efeonce'`), el favicon de Think para `/insights/**` (hoy genérico), la ficha
  de Insights en la receta `content-day-live-results` (hoy isotipo de Efeonce) y en `content-day-tools` (el Composer usa
  el ícono `probe`; la nota de la receta pide el isotipo de Efeonce: desalineadas), el portal y MCP, y el **tamaño
  mínimo del lockup** (el logo tiene 18 px sugeridos; el lockup, ninguno; el menor en producción es 24 px en móvil). Mapa completo: `efeonce-insights` →
  `references/ui-and-brand.md` §2 y [applications.md](applications.md) §B3b.
- **Color de «INSIGHTS» en las portadas PDF/deck (2026-09-28):** en las portadas navy del A4 (y el bloque navy de la
  clara) y del deck, «INSIGHTS» va en el acento (`navyAccent` = teal-500, 12 px; `insights-report/report-editorial.css`,
  `insights-deck/insights-cover.html`) y con proporciones propias (A4: Efeonce 32 px, aire 16, filete 1 × 24 al 26 %;
  deck: 30 px, 16, 1 × 22). Choca con «junto a Efeonce, Insights baja su brillo; sólo la esfera conserva el acento» y
  con «el acento nunca en texto de menos de 24 px». **Sin decisión:** cambiarlo toca el contrato de fidelidad de
  TASK-1889. Los pies de capítulo ya van en `navyMuted` (A4 8 px, deck 9 px).
- **Mini-órbita de Insights y «una órbita por pieza» (2026-09-28):** interpretación de quien construyó la marca: el
  anillo y la esfera de la «i» son parte del logo (como el planeta de Efeonce) y no cuentan como la órbita de la pieza;
  el hero de Think y la OG la ponen junto a una órbita de acento, revisado a ojo. **Falta la confirmación del operador.**
- ~~**Íconos de Trazo `republicar` y `enviar` (2026-09-28):**~~ **resuelto el 2026-09-29 (tarde):** el operador
  autorizó crearlos y entraron a `STROKE_GLYPHS` en `axis-graphic-line` 0.11.0 (fila de ese día). Los borradores de aquí
  (aire 0,535 y 0,611) no son los publicados.
- **Manzanitas, prueba de contenidos creativos (2026-09-28):** carrusel de Creative Workflows en la línea Brand
  (acento naranja/frambuesa, «Empower your Brand», Plastilina, luz naranja en las fotos `MCB1c` y `MCB3`). Espera la
  revisión del operador; no es canon todavía.
- **Manzanitas, registro (actualizado el 2026-09-29, tarde):** las diez pendientes quedaron decididas ese día (filas de
  decisiones del 2026-09-29; `pendingDecisions: []`). Espera al operador una aprobación, no una decisión del token: la
  consecuencia del eslogan en los cierres (con el logo de 400 px, sólo Voice lleva la palabra en el acento; con ~460 px
  la llevarían todas). Los carruseles de ejemplo del Composer quedaron aprobados el 2026-09-29 y TASK-1939 cerrada. Las identidades del equipo quedaron aprobadas el 2026-09-29
  (ronda piloto en `ai-generations/2026-09-29_manzanitas-equipo/`; [manzanitas.md](manzanitas.md) §13).
- **Deck compuesto (TASK-1927, 2026-09-27):** la aprobación visual ya está dada (fila del 2026-09-27 arriba). Sigue
  abierta la pregunta de la **sección partida**, anotada en el token: el indicador barre las secciones ya recorridas,
  (n−1) de N: ¿se unifica a n de N? Hasta decidir, la plantilla sigue el token.
- **Plantillas de las 38 recetas restantes (TASK-1928, 2026-09-27):** el operador **aprobó a ojo** las seis familias
  y la portada con selección el 2026-09-28 (hojas en `ai-generations/2026-09-27_deck-recetas/`). Las plantillas aplican la norma vigente
  sobre las referencias aprobadas (fila de implementación abajo); si el operador pide volver a la referencia en algún
  punto (por ejemplo, el logo chico en las secciones de cine, que era pregunta abierta y resolvió la norma), se
  registra aquí como decisión suya. La selección en `cover-brochure` ya no está abierta: se resolvió el 2026-09-28
  (layout `document-selection`, AXIS `v0.3.21`; fila de decisiones).

- **Plantillas de La órbita (TASK-1919, 2026-09-27):** posición de la lente del caminero (token 0,70 vs ≈0,77 en la
  lámina aprobada); super de dato con arco completo (lámina) o la estela canónica de la medida; burbuja URL en
  `section-classic`, `section-split`, `content-measure` y `triptych` (las láminas no la llevan, el manifest del deck
  dice `url-bubble-footer`; se siguió la lámina); gris del descriptor y la bajada web, sin token; paleta DOOH 20 % vs
  35 %. Hasta decidir, la plantilla sigue la lámina aprobada y no se inventa un token.
- **Glitch · numeración (DISCREPANCIA, 2026-09-28):** [glitch.md](glitch.md) dice que la próxima edición es la **#17**
  (decisión del 2026-09-27), pero el blog ya publicó «Glitch #16» (2026-07-21) y «Glitch #17» (2026-07-28, post
  251605). La serie del blog y la del sistema gráfico no coinciden: **pregunta abierta para el operador**; no fijes el
  número de una edición real hasta que responda.
- **Glitch Flash (2026-09-28, actualizado esa noche):** el Flash **ya está** en AXIS (`v0.3.24`) y en el Composer
  (`24e4c72ee`, local). Queda por decidir: si la publicación de imágenes de terceros con crédito y sin licencia
  (decidida para el Flash de Sonnet 5.5) vale para otros Flash; la **última frase del video** (overlays
  `overlay-cta-reel.html` / `overlay-cta-vlog.html` y la pieza `cta` del taller dicen «el #N sale el lunes.» fijo, contra
  la muletilla que varía por edición); y el chip de la portada semanal en AXIS (`pendingDecisions: weekly-cover-chip`;
  en Greenhouse ya es «LA NOTICIA»). Pendiente de implementación (no de decisión): la ruta productiva del Flash
  (TASK-1921 sólo conoce `planGlitchEdition`), las tres medidas de la estela que el token no publica (ancho grande
  150 px, separación compacta 8 px y del banner 10 px; hoy en `glitch.css`) y el `kind` de `efeoncepro/glitch-drop` en
  Content Factory (propuesta en `efeonce-public-site-wordpress`, `references/content-factory-gutenberg.md`).
- **Glitch (actualizado 2026-09-27, cierre del día):** decidir cómo el bloque WordPress `efeoncepro/glitch-drop` pasa al
  callout v2 desde la #17 sin cambiar los posts anteriores (variante dentro del bloque, recomendada, o bloque nuevo;
  TASK-1337); confirmar si portada del reel, miniatura y overlays PNG del reel van al Composer (TASK-1923); registrar
  la referencia de la licencia de Guttery; del video: fps de grabación (hoy 30), prueba de los editores con una edición
  real y la voz del host (incluye validar el ducking de la cama), a qué piezas va la transición de bytes
  (recomendación: tarjetas y Drop), estilo de subtítulos, parámetro de ritmo (factible, no hecho), excepción de
  rostros y los textos reales de la #17. Ya resueltos: manzana y verde, línea Growth, edición #17, alta de los glifos,
  flujo de composición `Accepted`, y el vlog 16:9, el kit, el lower third, las tarjetas finales, el mnemónico, el
  sonido (B), la música, el pre-roll (sólo vlog; el reel abre con la apertura), el blog completo (banners 16:9, 1:1
  con plantilla propia, maqueta del post, callout v2 desde la #17) y la lámina con lente como variante ocasional
  (filas del 2026-09-27 arriba). Detalle: [glitch.md](glitch.md) §8, §9 y §12.7.
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
  dos registros, **fondo** y **energía** (rock re-grabado con Stable Audio 2.5). Glitch ya no queda pendiente aquí: tiene sonido y música propios, aprobados y sólo de
  Glitch ([glitch.md](glitch.md) §13). **Pendiente:** licencias (Stable Audio vía fal; voz ElevenLabs); prueba de
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
  lo fijó ese día (`axis-graphic-line` 0.5.0 y `axis-brand-assets` 0.3.3).
- IA, social y staff (D26): **hecho y publicado** (tag `v0.6.0`, 2026-09-27: `axis-graphic-line` **0.6.0** con los 79
  glifos en `ICON_CATALOG` y `axis-brand-assets` **0.3.4** con 43 PNG en `volume/`; `axis-tokens` iba en 0.3.8 en ese
  release y no cambió por D26). Greenhouse fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4.

- Contrato 0.1.2 en Greenhouse (TASK-1927, 2026-09-27): **hecho; la task está `complete`**
  (`docs/tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md`), en `origin/develop`. Los
  gates se leen en la task. Hecho: Greenhouse fijó `axis-tokens` 0.3.14 y `axis-ui-contracts` 0.3.12 (hoy 0.3.21 y
  0.3.19, fila siguiente); `pnpm brand:compose`
  compone `proposal-cinematic` en `service`, `hero` y `lines`, la sección partida por la izquierda en tres
  composiciones, el tríptico de una palabra por toma, y el marco aprobado (`cover-brochure`, `cover-proposal`,
  `close-brochure`, `close-proposal`); compone documentos (`pages`) en un PDF con manifest y procedencia
  (`planSurfaceDocument`); gate `--catalog=graphic-line` con 32 frames a 0 px (deltas b–e en `BASELINE_DELTAS.md`).
  `cover-classic` y `close-classic` no entran (no aprobadas; `supersededBy` en AXIS), ni
  `cover-brochure-cine-lines-selection` (en ese momento el contrato no admitía selección en esa portada; compone desde
  el 2026-09-28 con el layout `document-selection`). **Aprobado a ojo por el operador** (2026-09-27).
  **Pendiente:** la ruta productiva, que debe aceptar también el intent de documento (TASK-1921, `in-progress` en otra
  sesión); plates idempotentes (TASK-1926); el control de foco de la sección partida (el builder `sectionSplit` no
  lee `photo.focus`; exige un cambio en AXIS y otro en Greenhouse, y **no tiene task**). Diferencias conocidas contra los prototipos: tamaño de «Cuando
  quieras.», burbuja URL horneada, caja de selección unos píxeles más ajustada.
- Plantillas de las 38 recetas restantes (TASK-1928, 2026-09-27): **`complete` el 2026-09-28**, aprobada por el operador,
  con `pnpm test` y `pnpm build` verdes y empujada a `develop`. Hecho: 34
  plantillas nuevas en `graphic-line-deck` (dos recetas comparten `SectionCine`, cuatro comparten `ProposalService`)
  para las 38 recetas restantes, y el 2026-09-28 la portada con selección sobre `CoverBrochure` (sin plantilla nueva):
  **69 de 69 recetas componen con 50 plantillas**. Greenhouse fija `axis-tokens` 0.3.21 y `axis-ui-contracts` 0.3.19;
  gate `--catalog=graphic-line` con 66 frames a 0 px (entradas (f) y (h)…(m) de `BASELINE_DELTAS.md` —la (g) es
  Glitch— y (n) con el frame `CoverBrochure` re-promovido). Decisiones de norma
  aplicadas sobre las referencias aprobadas (no son decisiones nuevas del operador):
  - **D1**, el acento nunca en texto de menos de 24 px: «Recomendado», cabecera de la cotización en vivo, «01 ·
    Diagnóstico · Sin costo», rol del interlocutor, rótulos de los pilares de «por qué lo hacemos», «Revisamos contigo»
    del reloj y la tarjeta en revisión van en navy (papel) o en el texto claro (oscuro).
  - **3×**, la respuesta al menos 3 veces la pregunta: cotizaciones, plan, clientes, partners y testimonio suben a
    120 px; la auditoría renderizada del gate lo mide en `content-pricing` (y `.stage`/`.live`), `content-clients`,
    `decision-plan` y `content-partners`.
  - **Cifras con fuente visible:** toda cifra llega por `figures` (valor, rótulo, fuente obligatoria) y la lámina
    imprime «Fuente: …»; el foco cita el caso publicado de Sky en vez de «Datos de muestra».
  - **Lámina interior con foto, sin logo:** las secciones de cine retiran el logo chico heredado de las portadas.
  - **Sin velo sobre la foto** en «quiénes somos» y «por qué lo hacemos».
  - **Burbuja URL** en el pie de `content-partners`; montos `[MONTO]`; contacto desde `EFEONCE_CONTACT`.
  - **Logos de terceros normalizados** al componer (un tono, el mismo peso óptico), con la excepción tonal de Aguas
    Andinas y la UC de Temuco; las barras del gráfico salen de su número (índice, antes = 100); el stack no pinta los
    «pilares de luz» del guion (en la referencia aprobada nunca se vieron).
  **Pendiente:** nada de TASK-1928; siguen TASK-1930…1933 y la ruta productiva (TASK-1921).
- Plan del deck contra el catálogo (TASK-1929, 2026-09-28): **complete (2026-09-28), en `develop`** (commits `651bb0972`,
  `5a1fb974b`, `248d3e1de`), `in-progress` hasta docs y gates de cierre. Catálogo de runtime
  `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` (esquema `efeonce.deck-recipes.runtime.v1`, lo genera
  `pnpm brand:deck-recipes`), `validateDeckPlan` (piso AXIS + 14 errores y 3 avisos del catálogo) y
  `proposeDeckPlan` (`claude-sonnet-5`, enum de ids, un reintento, fail-closed); CLI `pnpm brand:deck-plan`. Decisiones
  de implementación: `sequence-order` retirada (`pairsWith sequence` no tiene dirección); `rhythm-paper-dark` de la spec
  quedó como `rhythm-paper-run` (sólo papel: tres oscuras seguidas es la norma); `variant` = no adyacentes. Lo que no
  hace: confirmación humana, API, Nexa y MCP (TASK-1932), datos reales en slots (TASK-1930), plates por `assetId`
  (TASK-1931), QA abierta del catálogo (TASK-1933).
- Datos reales en los slots del deck (TASK-1930, 2026-09-28): **`in-progress`, Slices 1–4 y 7 en `develop`** (commits
  `a2b7d26bd`, `f456921c3`, `ac1942620`, `07b417011`). `bindDeckSlots` + mapa de las 78 recetas
  (`DECK_SLOT_BINDING_MAP`) + CLI `--bind`; verificado contra la propuesta real `prop-5965260d` (SKY blog 2026).
  Decisiones del operador: ningún deck usa evidencia interna; muro de logos mínimo 9. Corrigió un bug latente de
  TASK-1929 (un slot `metric` no aceptaba lista). Abierto: montos (TASK-1417) y equipo (TASK-1418); biblioteca de
  autorizaciones por tercero en TASK-1937.
- Composición por superficie en Greenhouse (TASK-1919): **hecho, en `origin/develop`** — las 20 recetas aprobadas son
  plantillas del Artifact Composer (`graphic-line-deck`, `graphic-line-stills`, `graphic-line-overlays`), `pnpm
  brand:compose` y gate `--catalog=graphic-line` a 0 px. Falta la ruta productiva (TASK-1921, `in-progress` en otra sesión: API, `artifact-worker`,
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
| 2026-09-27 | axis-graphic-line 0.6.0 · axis-brand-assets 0.3.4 (AXIS main@cf77452 (2026-09-27); `axis-tokens` va en 0.3.8 y no cambia) | publicado (tag `v0.6.0`) | IA, social y staff (D26): 19 glifos nuevos en `ICON_CATALOG` (36 Trazo + 43 Plastilina = 79) y los 10 volúmenes nuevos en `volume/` (43 PNG). Greenhouse fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4 |
| 2026-09-27 | axis-tokens 0.3.9 · axis-ui-contracts 0.3.8 (AXIS `main@ff0505a`) | publicado (tag `v0.3.9`) | contrato `efeonce.surface-composition` 0.1.2 (`candidate`, aditivo): `use` proposal/brochure, recetas aprobadas `cover-classic` y `close-classic` (logo sin burbuja URL; cierre con eslogan en tres tramos), `layout` service/hero/lines de `proposal-cinematic`, `selection.anchor`, documento `resolveSurfaceDocument`/`validateSurfaceDocumentIntent` (manifest `axis.surface-document.v1`). Greenhouse lo integró el mismo día con TASK-1927 (fila siguiente) |
| 2026-09-27 | axis-tokens 0.3.11 · axis-ui-contracts 0.3.9 (TASK-1927; repo `axis-design-system`, rama `main`) | publicado (tag `v0.3.11`) | contrato `efeonce.surface-composition` 0.1.2, deltas (b) y (c) |
| 2026-09-27 | axis-tokens 0.3.12 · axis-ui-contracts 0.3.10 · axis-brand-assets 0.3.5 · axis-graphic-line 0.7.0 (TASK-1922, Glitch; AXIS `29a40b5`) | publicado (tag `v0.3.12`) | token `glitchLine` (`candidate`), contrato `efeonce.glitch-line` 0.1.0 (23 códigos), `AXIS_GLITCH_ASSETS` y los cinco glifos Plastilina de Glitch (D27); Greenhouse los fija en `4dfb147f7`. Detalle: [glitch.md](glitch.md) §9 |
| 2026-09-27 | axis-tokens 0.3.13 · axis-ui-contracts 0.3.11 (TASK-1927) | publicado (tag `v0.3.13`) | contrato 0.1.2, delta (e): tokens del marco de portadas y contraportadas — `column.top`, `column.body`, `column.closeOffsetsPx`, `axis` (eje del amanecer), `orbitPaint` (giant, rising), `contact.style`, `clientLogo.box`, `section-split.progress.startFromTopDeg` y `sweep`. `cover-classic` y `close-classic` quedan `supersededBy`. `axis-ui-contracts` 0.3.11 no cambia de código: se republica porque fija la versión exacta de `axis-tokens` |
| 2026-09-27 | axis-tokens 0.3.14 · axis-ui-contracts 0.3.12 (TASK-1927) | publicado (tag `v0.3.14`) | tipografía completa de las contraportadas: interlineado y tracking de la voz en `close-brochure`; interlineado del eslogan en las dos. `axis-ui-contracts` 0.3.12 tampoco cambia de código (misma razón). Greenhouse fijó `axis-tokens` 0.3.14 y `axis-ui-contracts` 0.3.12 hasta TASK-1928 (`axis-graphic-line` 0.7.0 y `axis-brand-assets` 0.3.5 los fijó TASK-1922). El tag `v0.3.12` es de TASK-1922 (Glitch), no de esta serie |
| 2026-09-27 | axis-tokens 0.3.15 · axis-ui-contracts 0.3.13 (TASK-1928) | publicado (tag `v0.3.15`) | delta (f): propuestas sobrias (`proposal-service`) |
| 2026-09-27 | axis-tokens 0.3.16 · axis-ui-contracts 0.3.14 (TASK-1928) | publicado (tag `v0.3.16`) | delta (g): método (escalera plana, anillo de puntaje, fuerza híbrida, plan) |
| 2026-09-27 | axis-tokens 0.3.17 · axis-ui-contracts 0.3.15 (TASK-1928) | publicado (tag `v0.3.17`) | delta (h): cotización, próximos pasos y respiro |
| 2026-09-27 | axis-tokens 0.3.18 · axis-ui-contracts 0.3.16 (TASK-1928) | publicado (tag `v0.3.18`) | delta (i): prueba (foco, clientes, partners, riesgo, caso, gráfico, testimonio, por qué nosotros) |
| 2026-09-27 | axis-tokens 0.3.19 · axis-ui-contracts 0.3.17 (TASK-1928) | publicado (tag `v0.3.19`) | delta (j): secciones y quiénes somos; `section-cine` gana `about` y `purpose` |
| 2026-09-27 | axis-tokens 0.3.20 · axis-ui-contracts 0.3.18 (TASK-1928) | publicado (tag `v0.3.20`) | delta (k): contenido y día a día; `content-day` gana `tools`, `live-progress` y `live-results`. En la serie el contrato también ganó `progress: false` por composición, `voice.maxWords` por receta (testimonio hasta 6 palabras; el resto, 3), pasos sin íconos (`steps.icons: false`), `steps.min` y colores por nombre de paleta. Greenhouse las fijó hasta el 2026-09-28 |
| 2026-09-28 | axis-tokens 0.3.21 · axis-ui-contracts 0.3.19 (TASK-1928) | publicado (tag `v0.3.21`) | delta (l): `cover-brochure` gana el layout `document-selection` (selección sobre la respuesta, un cursor «Nexa»; `column.answerWithSelectionExtraPx`, `bodyBelowAnswerPx.withSelection`) |
| 2026-09-28 | axis-tokens 0.3.22 · axis-ui-contracts 0.3.20 (TASK-1934) | publicado (tag `v0.3.22`, `8dd702d`) | las nueve láminas SEO/AEO del deck ([applications.md §L](applications.md)) |
| 2026-09-28 | axis-tokens 0.3.23 · axis-ui-contracts 0.3.21 (TASK-1934) | publicado (tag `v0.3.23`, `bc9f60c`) | medidas de las plantillas SEO/AEO |
| 2026-09-28 | axis-tokens 0.3.24 · axis-ui-contracts 0.3.22 (Glitch Flash; AXIS `main@5b3056f`) | publicado (tag `v0.3.24`; CI y «Release UI packages» en verde) | `glitchLine.editions` (`weekly` \| `flash`; `editions.flash` `approved`, cabecera «NO ESPERA AL LUNES» + estela + «FLASH», chips, `progress: none`, `narratorCloser`), seis piezas `flash-*` con `derivesFrom`, `chip` y `coverTemplate: null`, `pendingDecisions` `edition-numbering-blog-vs-system` y `weekly-cover-chip`; contrato `efeonce.glitch-line` **0.2.0** (`edition` número o `{ kind, number? }`, campo `progress`, códigos `edition-kind-invalid`, `edition-kind-mismatch`, `flash-edition-number-not-allowed`, `flash-progress-not-allowed`, `progress-invalid`; 28 en total; un intent 0.1.0 resuelve igual). Lab `/references/glitch/#flash`. **Vigente: Greenhouse fija `axis-tokens` 0.3.24 y `axis-ui-contracts` 0.3.22 desde `53002b352`** (el bump exigió `pnpm brand:tokens` además de `pnpm glitch:tokens`: `609353e83`) |
| 2026-09-28 | axis-graphic-line 0.8.0 (AXIS `main@3e1d971`) | publicado (tag `v0.8.0`) | Trazo `swipe` «Desliza» (D28): `ICON_CATALOG` pasa a 85 (37 Trazo + 48 Plastilina). Greenhouse sigue fijando axis-graphic-line 0.7.0 hasta que una tarea lo suba |
| 2026-09-28 | axis-graphic-line 0.9.0 · axis-brand-assets 0.3.6 (AXIS `main@efe4d32`) | publicado (tag `v0.9.0`) | Plastilina `mano` (D29) con su volumen: `ICON_CATALOG` pasa a 86 (37 Trazo + 49 Plastilina) y `volume/` a 49 PNG. Greenhouse sigue fijando axis-graphic-line 0.7.0 y axis-brand-assets 0.3.5 hasta que una tarea los suba |
| 2026-09-28 | axis-brand-assets 0.4.0 (AXIS `25b5ecf` + `4760e3e`, en `main`) | publicado (tag `v0.4.0`) | marca de producto de Efeonce Insights: `insights-logo-*`, `insights-isotype-*` y el tipo nuevo `lockup` (`insights-lockup-{positive,negative}`); 25 SVG sellados. **Greenhouse sigue fijando `axis-brand-assets` 0.3.5** (`package.json`), así que no trae estos archivos hasta que una tarea suba la versión; Think usa copias manuales |
| 2026-09-29 | axis-brand-assets 0.4.2 (tag `v0.4.2`) | **publicado** (AXIS `main` `7f9c8bb`; CI y Release UI packages en verde; en el registro 2026-09-29 10:30 UTC) | submarcas de producto SEO/AEO: 33 SVG nuevos (58 en total) — `{sv360,aeo,aeo-assessment,ai-visibility-report}-logo-{positive,negative,white}`, `{sv360,aeo}-isotype-{…}`, `{…}-lockup-{…}` y `sv360-name-lockup-{…}`; export nuevo `AXIS_SEO_AEO_BRANDS` y variante nueva `white`. Generados con `scripts/brand/build-seo-aeo-logos.mjs` y re-sellados. **Greenhouse fija `axis-brand-assets` 0.4.1** (`package.json`); los recibe cuando se implemente TASK-1938. Lab `/references/seo-aeo/` + `/references/seo-aeo.json` y guía `docs/agent-composition/seo-aeo.md` en construcción el mismo día |
| 2026-09-29 | axis-tokens 0.3.30 · axis-ui-contracts 0.3.30 · axis-graphic-line 0.12.0 · axis-brand-assets 0.4.3 · axis-ui-registry 0.3.2 (tag `v0.3.30`) | **publicado** (AXIS `main` `26097c5`; verificado en el registro) | Efeonce AI Visibility Report: token `efeonceGraphicLine.measureSeverity` y export `aiVisibilityReport` (anatomía: paleta, tipo, A4, orden de seis páginas, capítulos con glifo Trazo, dos audiencias, geometría de la órbita de portada, cabecera y pie interiores, contraportada, es/en/pt-BR con fallback es, lista `never`); contrato nuevo `efeonce.ai-visibility-report` 0.1.0 `candidate` (manifest `axis.ai-visibility-report-composition.v1`, 22 códigos, 9 chequeos de adapter, `pnpm report:resolve`); `efeonce.graphic-line-orbit` 0.3.1 → **0.4.0** (`measure` gana `severity`, `severityLabel`, `scaleVisible`, `glow`; códigos `measure-severity-label-required`, `-scale-required`, `-invalid`, `-label-without-severity`); `@efeoncepro/axis-graphic-line/report` (`aiVisibilityReportOrbitSvg`, `aiVisibilityReportSeverityColor`) y `measureSvg` con gravedad; las 48 órbitas estáticas re-selladas con el contrato 0.4.0 (mismo dibujo). Lab `/references/ai-visibility-report/` + `.json` (schema `axis.efeonce-ai-visibility-report.v1`); ADR `docs/architecture/AI_VISIBILITY_REPORT_COMPOSITION_DECISION_V1.md`, guía `docs/agent-composition/ai-visibility-report.md`, esquema del intent y `docs/examples/ai-visibility-report/`. **Greenhouse sigue fijando** tokens y contracts 0.3.29, graphic-line 0.11.0 y brand-assets 0.4.1: los sube TASK-1938 |
| 2026-09-29 | axis-tokens 0.3.31 · axis-ui-contracts 0.3.31 · axis-brand-assets 0.4.4 (tag `v0.3.31`) y axis-tokens 0.3.32 · axis-ui-contracts 0.3.32 (tag `v0.3.32`) | **publicado** (AXIS `main` `88ac9b5` y `61e34a4`; CI y Release UI packages en verde; 0.3.32 verificado en el registro) | Deck Salesforce. `v0.3.31`: las doce recetas del deck con el estilo vivo en el acento de la línea, la línea `revenue-salesforce` aprobada en la portada de línea con `partnerMark` opcional, `sloganBlock` en `close-proposal` y `AXIS_PARTNER_ASSETS` (delta (o)). `v0.3.32`: las cuatro recetas de la segunda ronda (`decision-diagnosis-verdict`, `method-waves` —su órbita es la trayectoria—, `content-day-live-console`, `content-day-live-approval`), tres reglas nuevas, `LayoutToken.reservesByLine` (la portada de línea Salesforce cuelga la columna de 190 con reserva propia, sin tocar las demás) y `sloganBlock.appliesTo` (logo de 700 px sólo en Salesforce) (delta (p)); Lab con 94 láminas y la referencia de `content-live-chat` con «Enablement conversacional». Greenhouse fijó 0.3.31 en `9289cab0c` y saltó a 0.3.33 en `2e002673e` (sin pasar por 0.3.32) |
| 2026-09-29 | axis-tokens 0.3.33 · axis-ui-contracts 0.3.33 (tag `v0.3.33`) | **publicado** (AXIS `main` `0bd2758`; CI y Release UI packages en verde; verificado en el registro) | Delta (q), criterio del operador «manda la lámina aprobada»: lo que las láminas Salesforce pintan y las recetas no medían, medido en `render-src/salesforce.mjs` — `headerGapBottomPx` (SF1 12, SF2 10, SF3 14, SF12 10, SF14 14), colores `leadColor`/`restColor` (SF4, SF12), `status.heightPx` 26 y `title.topPx` 52 (SF9), `glyphWeight` 700 (SF12, SF14), la pantalla del video, el play al 44 % y la duración en 18/16 (SF14), `document` propio (SF15, SF16), la columna `[MONTO]` (`measuredStartPx`, SF16), `runLineHeight: 'normal'` del eslogan de la contraportada Salesforce (la tinta aprobada ~9 px más abajo que con 1) y los colores de `method-waves`. Sin cambio de código en contracts. **Greenhouse fija 0.3.33** desde `2e002673e` (tokens y contracts; `axis-brand-assets` 0.4.4, `axis-graphic-line` 0.11.0): las 94 recetas componen y el baseline `graphic-line` quedó sellado en la sección (s) de `BASELINE_DELTAS.md` (`f05c26e2f`) |
| 2026-09-29 | axis-tokens 0.3.34 · axis-ui-contracts 0.3.34 (tag `v0.3.34`) | **taggeado en AXIS** (`main` `4f370d1`; registro no verificado en este barrido) | Delta (r), limpieza **sin cambio de render**: el resolver de pasos sólo resuelve por los `steps.layouts` declarados (una receta con `steps` sin layouts ya no lanza `TypeError`), anatomía de pasos de `method-waves`, geometría del triángulo de alerta de `decision-diagnosis-verdict`, `console.mark.border.inset` y colores `ink` de `content-day-live-console`, `loop.number.color` en suave en `content-day-live-approval` (lo que ya se componía). El bump de Greenhouse lo lleva otra sesión: sin commitear al cerrar el barrido de TASK-1942 |
| 2026-09-29 | axis-tokens 0.3.36 · axis-ui-contracts 0.3.36 · axis-brand-assets 0.4.5 (tag `v0.3.36`) | **publicado** (AXIS `main` `302f7f7`; «Release UI packages» y CI en verde; verificado en el registro; Lab responde 200) | Deck Salesforce, delta (s), sin cambio de render: insignia «Salesforce Partner» autorizada por Salesforce — `AXIS_PARTNER_ASSETS` con íconos e insignia `authorized-by-partner` (referencia `salesforce-partner-authorization-2026-09-29`), claim `authorized`, Claudeforce esperando a Anthropic, Agent Astro fuera; referencias del Lab de SF0 y SF19 con la insignia y sus títulos; reglas `partner-claim-readback` y `third-party-mark-authorization` con la referencia de la autorización. **Greenhouse fija 0.3.36 y 0.4.5** y regenera `brand:tokens`, `glitch:tokens` y `manzanitas:tokens` (sólo cambia el número de versión); gate `graphic-line` 89 frames a 0 px sin freeze |
| 2026-09-29 | axis-tokens 0.3.35 · axis-ui-contracts 0.3.35 (tag `v0.3.35`) | **publicado** (AXIS `main` `e22051d`; «Release UI packages» y CI en verde) | firma de correo: `emailSignature.portrait.sizePx` 130 y `team.areaMark.sizePx` 106, a la altura del bloque de texto de al lado; contracts se republica sin cambio de fuente. Greenhouse lo fija y regenera `brand:tokens`, `glitch:tokens` y `manzanitas:tokens` (sólo cambia el número de versión en el encabezado) |
| 2026-09-29 | axis-tokens 0.3.38 · axis-ui-contracts 0.3.38 · axis-graphic-line 0.13.0 · axis-brand-assets 0.4.6 · axis-ui-registry 0.3.3 (tag `v0.3.38`) | **publicado** (AXIS `main` `c92160b`; verificado en el registro) | Módulos de correo y camino recorrido: export `efeonceEmail` (pie, CTA principal, agenda, bloque de marca por línea, datos institucionales, `retired: ['cta-subscribe']`, `applications` con el correo de Insights, reglas `emailSafe`, ids de assets) y `efeonceGraphicLine.trajectory.measure.travelledPath`; contrato nuevo `efeonce.email-modules` 0.1.0 `candidate` (manifest `axis.email-modules-composition.v1`, 23 códigos, 6 chequeos de adapter, `pnpm email:resolve`) y `efeonce.graphic-line-orbit` 0.4.0 → **0.5.0** (toda `measure` resuelve `travelled`); el pintor y `aiVisibilityReportOrbitSvg` dibujan el camino; `AXIS_EMAIL_ASSETS` (PNG @2x: `email-logo-negative`, `email-slogan-<línea>-negative`, `email-social-<red>-white`, `url-bubble-baked-dark-email`; `pnpm email:assets`) y las 48 órbitas estáticas re-selladas (misma geometría). Lab `/references/email/`; ADR `docs/architecture/EMAIL_MODULES_DECISION_V1.md`, guía `docs/agent-composition/email-modules.md`. **Greenhouse sigue fijando** tokens y contracts 0.3.37, graphic-line 0.11.0, brand-assets 0.4.5 y registry 0.3.1; su adapter de la órbita sólo acepta 0.3.1 |
| 2026-09-29 | axis-tokens 0.3.37 · axis-ui-contracts 0.3.37 (tag `v0.3.37`) | **publicado** (AXIS `main` `436aafd`; «Release UI packages» y CI en verde) | Glitch y Marketing con Manzanitas **estables** como sub-líneas de La órbita (operador: «no sustituye a la orbita es una sublinea dentro del design system de la orbita igual que glitch»; «Si, hazlo»): `glitchLine` y `manzanitasRegister` `canonical`, `efeonce.glitch-line` 0.2.0 y `efeonce.manzanitas-register` 0.3.0 `stable`; metadato aditivo, sin cambio de valores, reglas ni render (los manifiestos de ejemplo sólo cambian su sello). **Greenhouse fija 0.3.37** y regenera `brand:tokens`, `glitch:tokens` y `manzanitas:tokens` (versión y `status`); suites del Artifact Composer y `brand-surfaces` en verde |

Lab AXIS, Insights (2026-09-28): página de **referencia** `/references/insights/`, **publicada el 2026-09-28** (rama
`docs/insights-lab` integrada por fast-forward a `main` de AXIS en `3dfbf0e`, CI verde;
[axis.efeonce.org/references/insights/](https://axis.efeonce.org/references/insights/) y `/references/insights.json`
responden 200; revisada por quien la construyó: sin detalles de WAF en la página pública, hechos corregidos, galería live
recapturada, e2e 2/2). La muestra `think.efeoncepro.com/insights/muestra` sigue siendo el ejemplo vivo del producto.
Las copias `apps/lab/public/branding/insights-*.svg` también están en `main` (fuente
`apps/lab/src/pages/references/insights.astro`, JSON para agentes `insights.json.ts`, guía
`docs/agent-composition/insights.md`), creada en paralelo al barrido documental de ese día: muestra la marca, sus
aplicaciones aprobadas, las secciones del informe y la UI del informe live con datos de muestra. No publica componentes
ni contratos (la UI de Insights vive en Greenhouse y Think). Las láminas 7.1/7.2 de `/references/graphic-line/` siguen
siendo pruebas.

Lab AXIS (`c2affc6`, 2026-09-26): la lámina 6.1 lista las decisiones del 26-09 y lo que sigue abierto; el acento ya no colorea texto de menos de 24 px en 1.2 y en las láminas de Insights; la anatomía de 1.2 ya no dibuja el anillo de la esfera; 5.4, 5.1 y 4.5 al día. Quedan en acento sólo rótulos de cotas en diagramas técnicos («0,20 em», la «X» del resguardo), que no son piezas.

Greenhouse: tokens y contracts 0.3.5, registry y brand-assets 0.3.1 en `develop` desde el 2026-09-26 (llega a producción con el próximo release); el adapter soporta el contrato de la órbita 0.3.1; no usa todavía el contrato de firma. Motion V1.1: las 30 variantes en el bucket (7596 archivos verificados) y en la galería del Lab (AXIS `d847b44`).

## 2026-10-04 — Producción del set AEO autorizada; formas en revisión

Operador: «Bien, hazlos todos», sobre la propuesta de diez glifos nuevos y ocho reutilizados. Se produjeron como
colección Trazo/Engine candidata, con API de revisión, 72 SVG y Lab local. En esa primera entrega la geometría estaba pendiente de aprobación visual. Estado y promoción: [aeo-icons.md](aeo-icons.md).
Verificado contra: `axis-design-system@c4bfefe` + cambios locales de esta colección — 2026-10-04.


### Aprobación posterior — 2026-10-04

Operador: «Las apruebo todas». Diez formas nuevas aprobadas, sin cambio geométrico. Alta en ICON_CATALOG,
API AEO delegada al renderer canónico y Lab actualizado. 60 Trazo + 49 Plastilina; versión local 0.17.0.
En esa etapa quedaban commit, push y publicación pendientes; la publicación `v0.17.0` documentada abajo cierra esos pasos.


## 2026-10-04 — Colección SEO y corrección de redondez

«Vamos con todos» autoriza los 24 conceptos (12 nuevos + 12 reutilizados). «Muy cuadrados deben ser mas redondeados»
corrige R1. R2 redondea contornos, nodos y conexiones. Pendiente aprobación visual; no es canon ni release.
Verificado contra axis-design-system@c4bfefe + cambios locales. [Inventario](seo-icons.md).


## 2026-10-04 — Trece formas de autoridad y enlaces autorizadas

«Bien, hagamos todos, adicional hoy con AEO se suma el concepto de Brand Authority». Doce off-page + autoridad-marca.
Contornos redondeados; Brand Authority compartida SEO/AEO, con autoridad de dominio/página diferenciada.
Producción y QA completos; aprobación visual pendiente. La publicación posterior de 0.17.0 conserva candidate. [Detalle](authority-icons.md).


## Publicación verificada · 2026-10-04

Estado posterior a la producción local descrita arriba: AXIS `main` y tag `v0.17.0` en
`a41e81f92c8b3e0e7f03219366e0d57623f5cd66`. Publicado **@efeoncepro/axis-graphic-line@0.17.0**;
[CI verde](https://github.com/efeoncepro/axis-design-system/actions/runs/37202238028),
[release verde](https://github.com/efeoncepro/axis-design-system/actions/runs/37202260863) y
[versión leída en GitHub Packages](https://github.com/orgs/efeoncepro/packages/npm/axis-graphic-line/1334240140).
Build, typecheck, 485 tests y design:check pasaron en una copia limpia sin WIP ajeno.
El tarball contiene JS y tipos de `/icons/aeo`, `/icons/seo` y `/icons/authority`.
Vercel confirmó success para el mismo SHA; manifests públicos leídos HTTP 200 con AEO 19, SEO 37 y
Autoridad 13 entradas, Brand Authority presente en las tres. Render de Autoridad inspeccionado en navegador.
Publicación no cambia aprobación: 10 AEO nuevos canónicos; 12 SEO R2 y 13 autoridad candidatos.
Lab: [AEO](https://axis.efeonce.org/references/aeo-iconography/),
[SEO](https://axis.efeonce.org/references/seo-iconography/),
[Autoridad](https://axis.efeonce.org/references/authority-iconography/).
No se modificaron pins de consumidores ni se publicaron cambios de Greenhouse.


## Aplicación en el Lab · 2026-10-04 · componentes

> Verificado contra: axis-design-system@aee99d2 — 2026-10-04; componentes incorporados en `9eb3da9`.

El operador pidió: «Quiero renovar los componentes y patrones con la nueva línea gráfica».
Se aplica la línea en el catálogo y las fichas de AXIS, conservando la navegación aprobada.
Implementación y límites: [lab-components.md](lab-components.md). No es promoción de
contratos, adopción de Greenhouse ni publicación de paquetes. Aceptación visual final
por el operador y publicación de paquetes siguen siendo evidencias separadas del deploy del Lab.


## 2026-10-04 — Logos completos y agrupados

Verificado contra: axis-design-system@aee99d2 — 2026-10-04; logos incorporados en `617ee02`.

El operador detectó que faltaban Wave, Globe, AEO y sus familias, Marketing Studio, Insights y Greenhouse.
Decisión aplicada: un catálogo central en Marca → Logotipos, proyectado desde packages y descubierto por
búsqueda global. No redibujar las marcas ni mantener listas de archivos paralelas en el Lab. Las identidades
editoriales conservan su alcance; los logos de clientes y partners mantienen sus permisos separados.
Código incorporado a `main` en `617ee02` y Lab publicado; export `/logos` y nuevos assets pendientes de release instalable.


### 2026-10-04 — El operador pide también las otras marcas

Verificado contra: axis-design-system@aee99d2 — 2026-10-04.
Se incorpora la biblioteca existente de herramientas y plataformas al catálogo central, separada por
colección y con procedencia visible. No se recrean logos ni se convierte un PNG en un supuesto SVG.
Las restricciones previas de clientes y badges internos se conservan. Total: 52 marcas, 223 archivos;
22 E2E de logos, búsqueda y agentes pasan en desktop y móvil. Push y Lab verificados; publicación npm pendiente.

## 2026-10-04 — Entrada agentic, catálogo de iconos y tipografía editorial

- `060174c`: entrada `/agents/` y manifest del registry; 41 capacidades conectan packages, Lab,
  ejemplos, CLIs y adapters. Búsqueda global indexa recursos versionados sin DB de catálogo.
- `bf93d3a`: «Ajusta eso entonces» tras detectar SEO/AEO ausentes en la galería principal. Un catálogo
  de 134 únicos con estados, filtros y JSON, compartido con búsqueda. No cambia aprobación ni renderers.
- `aee99d2`: «Corrígelo de forma robusta y escalable» tras detectar Poppins en títulos de Insights.
  `LabHeading` deriva Bricolage del token; carga compartida, gates de fuentes y recorrido dinámico de
  65 rutas / 132 casos E2E. Preserva specimens y tipografía de producto. Push solicitado por el operador;
  Vercel success y readback HTTP 200 de Insights/Iconography/Agents confirmados; CI `37216960966` en curso al actualizar. Evidencia final en `docs/audits/2026-10-04-axis-documentation-closure.md`. [Implementación](lab-components.md).

Estado de distribución: `axis-graphic-line` 0.17.0 publicado; nuevas exports de logos en fuente
`axis-brand-assets` 0.4.18 pendientes de un nuevo release. No actualizar pins de consumidores por inferencia.

## 2026-10-04 — Familia de botones, órbita y contexto de negocio

Operador: loader con La órbita, CTA con flecha animada opcional, completar variantes y
patrones compuestos, analizar adaptación por línea de negocio. Implementación: contexto
optativo `line`, separado del tono funcional; seis líneas del canon, neutral/peligro invariantes.
HTML/CSS portable, React opcional, 26 íconos funcionales y grupos/toggles/menús/split en el Lab.
Release inicial v0.3.43 success (run 37221054045), instalación privada y Lab público verificados; adopción de productos separada.

> Verificado contra: axis-design-system@1bccb3f — 2026-10-04.

Evidencia de distribución de botones: [auditoría](../../../../docs/audits/2026-10-04-axis-buttons-release.md).

Corte anterior de botones: primitives 0.1.1 y registry 0.4.1 (parche documental sin cambios
de API/CSS), tokens 0.3.43 y contracts 0.4.0. Release e instalación privada verificados.
Verificado contra: axis-design-system@31b146e, tag v0.4.1 — 2026-10-04.

Distribución vigente verificada: primitives **0.2.1**, registry **0.5.1**, tokens 0.3.43 y contracts 0.4.0
(AXIS `13db367`, tag `v0.5.1`, release `37223839523` success, 2026-10-04). Instalación privada limpia:
HTML/CSS sin React y ocho componentes con React 18.3.1. Lab público y menús modales comprobados.
52 recorridos y 32 referencias visuales; VoiceOver/NVDA manual, zoom nativo e iPhone físico pendientes.


## 2026-10-04 — La órbita prevalece en la hoja de colores

El operador establece: «Prevalece por encima de todo la órbita que es la nueva línea».
Canon de identidad: `efeonceGraphicLine.color` y `.lines`; las rampas heredadas de Greenhouse
no gobiernan la identidad nueva. La hoja `references/colors` aún muestra sólo `axisRamp` y
requiere reorganización: paleta madre, seis líneas con acento claro/oscuro, semántica funcional
y compatibilidad separadas. Decisión registrada; no se han cambiado tokens, consumidores ni Lab.
Criterio completo: [criteria.md](criteria.md#prioridad-de-la-paleta-vigente-en-axis--2026-10-04).

> Verificado contra: axis-design-system@13db367 — 2026-10-04.


## Colores de La órbita en packages y Lab — 2026-10-04

Decisión: La órbita prevalece como identidad; el operador exige tokens en packages y rampas propias.
Implementación local en AXIS, base `13db367`, tokens **0.4.0 preparado, no publicado**:
`axisColorSystem` (`axis.color-system.v1`) referencia `efeonceGraphicLine.color` y `.lines`;
`resolveAxisColorRoles(line, surface)` entrega fondo, tinta, acento y contraste, con validación de claves.
`axisOrbitRamp`, `axisOrbitRampContrast`, `axisOrbitRampMethod` aportan seis líneas × dos anclas
× nueve pasos (100–900): 500 conserva el acento canónico; el resto son tonos técnicos derivados
por `orbit-oklab-v1`, sin asignación automática de roles ni promoción a acentos canónicos.
CSS genera `--axis-orbit-<paleta>`, `--axis-orbit-<linea>-<light|dark>-<background|text|accent>`
y `--axis-orbit-<linea>-<light|dark>-<100…900>`. No transcribir HEX ni reconstruir las rampas.
La hoja `/references/colors/`, su JSON y DESIGN.md consumen esta autoridad. `axisRamp` conserva
compatibilidad de producto; no gobierna la identidad. El acento sólo en texto ≥24 px; el contraste
se evalúa sin redondear. Estado no se comunica sólo por color. Botones conservan su contrato de estados.
ADR dueño: AXIS `docs/architecture/COLOR_SYSTEM_ORBIT_DECISION_V1.md`; consumo en
`packages/tokens/README.md`. Sin cambio de pins de Greenhouse ni publicación en esta sesión.

> Verificado contra: axis-design-system@13db367 + cambios locales de color — 2026-10-04.


### Destino de adopción Greenhouse — 2026-10-04

El operador confirma que Greenhouse migrará eventualmente a los colores de La órbita.
Las rampas heredadas son compatibilidad de transición, no una identidad paralela permanente.
`axisColorSystem.adoption.greenhouse` declara el destino como `planned`; el mapeo de roles y el
rollout siguen pendientes. La futura implementación debe mapear superficie, texto, borde, acción,
foco y estados mediante un adapter semántico del theme sobre los tokens del package, preservando
Vuexy y validando claro/oscuro y estados reales. El resolver de composición de marca no es todavía
un theme completo de producto. Esta dirección no inicia la migración ni cambia pins de Greenhouse.


## 2026-10-04 — Formularios, menús y cierre de packages

El operador pide completar las primitives, rechaza los desplegables pobres y el doble contorno de
foco, y pide íconos en los campos. AXIS `3299032` lleva diez contratos de formulario a packages
y Lab; Select enriquecido y NativeSelect explícito, configuradores con la misma implementación,
foco continuo e íconos funcionales mail/folder. Criterio: [criteria.md](criteria.md#formularios-claridad-y-foco-continuo--2026-10-04).

El operador autoriza push, publicación de packages y actualización de docs/skills mediante
subagentes. El tag `v0.7.0` (run `37238026404`) quedó detenido antes de publicar por overflow
del chip removible a 400% en WebKit móvil/Linux. Los runs de `v0.7.1` se cancelaron antes de publicar tras detectar cinco timeouts en
matrices que acumulaban doce contextos o diez rutas dentro de 30 segundos. La fuente `df2de61`
separa las pruebas por contexto/ruta, con la misma cobertura y sin ampliar timeout.
`v0.7.2` quedó publicado: release `37239150937` success; registry remoto e instalaciones limpias
HTML/CSS sin React y SSR React 18.3.1/19.2.7 verificadas. Este corte reemplaza como
estado de fuente los preparativos locales 0.4.0/0.3.0 de arriba: tokens 0.5.0, contracts 0.6.0,
primitives 0.4.0 y registry 0.7.2. Estado instalable en
[package-and-tokens.md](package-and-tokens.md#distribución-de-primitives-y-formularios--2026-10-04).
Se conserva adopción Greenhouse `planned`, sin cambio de pins; lectores de pantalla/dispositivos
físicos y baselines Linux pendientes. El catálogo de logos requiere otro release de brand-assets.

> Verificado contra: axis-design-system@df2de61 — 2026-10-04.


### 2026-10-05 — Agendador: AXIS primero

El operador señala que Growth Meetings no está adaptado a La órbita y autoriza construir primero en AXIS;
la adaptación del consumidor se evalúa después. Se implementa la composición candidata en packages y Lab,
con tokens y controles de la línea. Esta decisión autoriza implementación local, no aprobación visual,
publicación ni migración de Greenhouse. Verificado contra: axis-design-system@8adedef + WIP local — 2026-10-05.


### 2026-10-05 — Revisión del agendador: disponibilidad y motion

El operador valida la dirección visual y pide distinguir fecha/cantidad, señales explícitas de disponibilidad
y transiciones más robustas. Se añaden check/cantidad etiquetada, guion/leyenda, total en horarios,
View Transitions limitadas a la etapa y fallback Web Animations con reducción e interrupción.
La validación de dirección no equivale a aceptación de esta revisión ni publicación.
Verificado contra: axis-design-system@8adedef + WIP local — 2026-10-05.


### 2026-10-05 — El operador sustituye el check del calendario

En la revisión anotada pide calendario en vez de check, corregir celdas estrechas, consumir el Select
canónico y añadir íconos en campos. Se sustituye check/«disp.» por calendario + cantidad; el Lab pasa
a Field/Select/Button canónico. El problema observado era un `<select>` suelto en la demo, no un
defecto demostrado del Select. Campos con persona/correo/empresa del catálogo funcional Tabler.
AXIS @8adedef + WIP local; revisión implementada sin release ni adaptación de Growth Meetings.


### 2026-10-05 — Confirmación: celebración y comprobante

El operador solicita más intención visual y celebración en «Ya tenemos un espacio». Implementación
local: emblema Tabler confetti, tarjeta de fecha/hora/zona con íconos, burst acotado y único tras el
comprobante. Reduced motion mantiene el resultado estático. Tokens y renderer en AXIS; sin reserva
real ni cambio en Growth Meetings. Verificado @8adedef + WIP local, aceptación final pendiente.


### 2026-10-05 — Agendador AXIS aprobado visualmente

Aprobación explícita del operador: «Bien, está aprobado...», tras revisar calendario/disponibilidad,
Select canónico, campos con íconos y confirmación celebratoria. La revisión visual actual queda
aprobada; reemplaza el estado de aceptación pendiente de las entradas anteriores. Implementación
local sobre AXIS @8adedef + WIP; huella y alcance en `docs/quality/scheduler.md` de AXIS. Publicación
de packages/Lab y adaptación de Growth Meetings siguen pendientes, sin autorización de release inferida.


### 2026-10-05 — Push del agendador autorizado

El operador solicita «Push». Entrega AXIS `eeb24e2`: agendador aprobado y CI de su suite, aislados
del WIP de product primitives y AI Visibility Report. Instantánea de commit: build, typecheck,
suite global, design gate, agent gate y 37 pruebas de navegador PASS; 3 SKIP por API scoped ausente,
con fallback probado. Registro completo en `docs/quality/scheduler.md`. Esta autorización no incluye
publicación de versiones de packages ni adaptación de Growth Meetings.


### 2026-10-05 — Rechazo de la demo presentada como avance de Growth CTA

El operador solicita corregir la composición y aclarar si se trabajó Growth CTA. Se confirma que esta
entrega sólo desarrolló primitives y una demo en AXIS: el renderer y motor de Growth CTA no se
modificaron. Se corrigen separación/jerarquía en primitives y ejemplo, con revisión del borrador real.
No atribuir adopción del producto a una demo de infraestructura. La corrección no hereda la aprobación
visual del agendador; queda local y pendiente de revisión.


### 2026-10-05 — Growth CTA en AXIS, reusable por sitio público y Think

El operador solicita revisar todas las formas de render y crear la versión de la línea Efeonce en
AXIS; pregunta expresamente por su reutilización fuera del Lab. Decisión: implementación visual
portable en packages, referencia propia `/references/growth-cta/`, inventario de lo implementado
y lo sólo declarado. La futura adopción se hace en el renderer compartido Growth CTA, manteniendo
política y eventos bajo Growth. No se autorizan por inferencia publicación, conversión real ni
migración de hosts. Esta candidata no hereda la aprobación visual del agendador.
Verificado contra: axis-design-system@eeb24e2 + WIP local — 2026-10-05.


### 2026-10-05 — Rechazo visual de Growth CTA y dos formas de abrir la agenda

«No tiene la forma y limpieza»; el operador pide premium/elegante/atractivo y rechaza el contenedor
grueso del popup. Se revisan proporción, cierre, sombra, jerarquía y marco; se añade agenda modal
o desplegada bajo el CTA para compararlas. La primera candidata queda rechazada visualmente; la
segunda conserva estado pendiente, sin release ni adopción. Verificado contra:
axis-design-system@eeb24e2 + revisión local — 2026-10-05.


### 2026-10-05 — El titular del CTA se conserva; faltan anillo y esfera

El operador señala el hover editorial sin aire y las marcas ausentes. Aclara que la pregunta está
bien donde está. Se revierte la propuesta de cambiarla a pregunta chica/respuesta nueva, se restaura
el padding canónico y se prepara la variante explícita headlineMarks=ring-and-sphere conservando
el texto. La esfera usa answerHtml del package gráfico; el último término y la esfera no se separan.
Esta prueba local no es aprobación ni nueva regla general de voz.
Verificado contra: axis-design-system@eeb24e2 + WIP local — 2026-10-05.


2026-10-05 — Corrección explícita: el anillo NO acompaña la esfera en el titular grande. Va en
el título superior («VISIBILIDAD EN IA»); la pregunta conserva la esfera al cierre. Se corrige el
renderer de AXIS y se agrega una aserción de anatomía para no repetir la interpretación errónea.


2026-10-05 — El operador autoriza construir las dos propuestas de banner («Vamos con los dos»):
editorial compacto y de marca. Se materializan en las apariencias minimal/spotlight de inline_banner
y se exponen juntas en el Lab. Se conserva la corrección anterior: anillo arriba y esfera al cierre.
Pendientes de revisión visual; no se publica ni migra al consumidor por inferencia.


2026-10-05 — A petición del operador se añade contraste de pesos Bricolage a los Growth CTA:
introducción 400, idea principal 700. Misma pregunta, sin salto forzado ni nueva paleta. API
opt-in del package aplicada en ambas recetas de banner y las demás muestras. Revisión visual
pendiente; sin publicación.


### 2026-10-05 — Aprobación integral y cierre documental autorizado

El operador aprueba explícitamente la entrega final: «Aprobado todo, lanza subagentes y actualiza
toda la documentación y los skills que correspondan, luego push». Esto supersede la aceptación
pendiente de las revisiones históricas del producto y de Growth CTA. Aprobado: composición ligera,
anillo en eyebrow y esfera al cierre del titular, banners editorial compacto/de marca y contraste
Bricolage 400/700 mediante énfasis exacto opt-in; agenda modal e inline con estado conservado.
No se aprobó la primera candidata rechazada ni la interpretación de anillo junto a esfera en el
titular. Ambas se mantienen como historia para evitar repetirlas.

Verificado contra source local AXIS sobre `3c8a6dd`: 40/40 journeys CTA y 4/4 recorridos finales,
build/typecheck, 198 contracts, design/agent PASS; evidencia dueña en `docs/quality/growth-cta.md`.
La autorización de commit/push no acredita release de packages, instalación privada de los nuevos
exports ni adopción en Growth/sitio público/Think. Estado de esos planos permanece pendiente hasta
su readback independiente; el push final lo registra el coordinador con su SHA real.

### 2026-10-06 — Logo de Creative Studio (24 piezas)

El operador pidió el logo de Creative Studio «exactamente el mismo de Marketing Studio o parecido pero con el color de
la línea brand» y lo aprobó para AXIS con sus 24 piezas («Las 24 piezas»): 8 formas (`logo`, `lockup`,
`short-lockup`, `compact`, `stacked-lockup`, `short-stacked-lockup`, `isotype`, `icon`) × `positive`/`negative`/`white`,
`creative-studio-<forma>-<variante>.svg`. Acento Brand: `#bb1954` sobre papel, `#ff6500` sobre navy. Generador
Greenhouse `scripts/brand/build-creative-studio-logos.mjs` (copia del de Marketing Studio con `GL.lines` key `brand` y
la palabra «Creative»; usa `orbit-ring.mjs` y las terminaciones concéntricas de la familia). Destino:
`@efeoncepro/axis-brand-assets` 0.4.26 (AXIS `f4dd2fe` en `main`, tag `v0.4.26`, 2026-10-06). Quedan sólo en el
paquete, como las de HubSpot: el índice de búsqueda del Lab pasaba de 399 KB a 416 KB (`AXIS_LOGO_EXCLUSIONS` las
lista); entran al catálogo público al fragmentar el índice. **Regla de las piezas cortas:** las que dicen sólo
«Studio» (`short-lockup`, `compact`, `short-stacked-lockup`, `isotype` S, `icon` con nave sobre «Studio») se parecen a
las de Marketing Studio salvo por el acento; existen en el paquete, pero su uso visible queda sujeto a «Studio a secas
es Marketing Studio» y a nombrar cada vista completa en superficies visibles (ADR `EFEONCE_STUDIO_CREATIVE_VIEW_DECISION_V1`
D9 y §7). Primer uso: encabezado de las interfaces del brochure Agencia Creativa (lockup «efeonce | Creative Studio»).
Pendiente en el release AXIS: el README de `brand-assets` todavía dice que «Creative Studio» es sólo el descriptor de
Globe.

### 2026-10-07 — Propuesta para un cliente (Sika LIC-1164): firma, portada y excepción

- **Firma de Efeonce en una propuesta para la marca de un cliente:** pie navy `#001a33` en cada hoja con el lockup
  `creative-studio-lockup-negative`, el texto de la licitación y la burbuja `url-bubble-baked-dark`; fuera del material
  del cliente. Portadas y contraportada sin pie (operador: «para la portada únicamente esto no es necesario»).
- **Excepción del operador, sólo para esa pieza:** portada cine con el arte aprobado del cliente dentro de la foto
  (Karo presenta el Master Graphic de Sika en un lightbox), compuesta con `cover-brochure` layout `line` línea brand.
  Primer precedente de arte de cliente en foto cine; no es regla. Aprobada: «Está perfecta».
- Contraportada: `close-brochure-orbit` en línea brand; las `close-proposal` se descartaron porque sus fotos son de la
  línea Growth.
- Caso: `docs/commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md`.



### 2026-10-07 — Skins de reproductor compartido

El operador pidió crear en AXIS un reproductor portable para todo el ecosistema e invocar esta skill. Confirmó los tres usos: editorial, demos y revisión creativa. Se implementa un candidato Cinema/Editorial/Review; la elección de Media Chrome y la dirección visual son propuestas de implementación, no aprobación del operador. [Estado y fuentes](video-player.md). Sin commit/push/release/adopción. Verificado contra: axis-design-system@f4dd2fe + cambios locales — 2026-10-07.


### 2026-10-07 — Segunda iteración del reproductor

El operador autorizó implementar las seis mejoras propuestas («Vamos con todo») y aprovechar la skill sin forzar recursos. Candidato 0.2.0: Cinema/Editorial/Review diferenciados, timeline con capítulos/miniaturas/momentos, transcripción buscable, editor con confirmación asíncrona, estados del consumidor, actualización de media y adapter React. No se convierte esta autorización en aceptación de píxeles ni release. [Detalle](video-player.md). Verificado contra: axis-design-system@f4dd2fe + cambios locales V2 — 2026-10-07.


### 2026-10-07 — Redondez del reproductor

Decisión del operador: «En íconos y demás puede haber más redondez?». Se redondean los controles y contenedores del candidato local: geometrías funcionales Tabler originales con trazo de tokens, controles circulares, cápsulas y dock/campos suaves. No se cambia ni aprueba el catálogo de marca. [Detalle](video-player.md#redondez-solicitada--2026-10-07). Verificado contra AXIS `f4dd2fe` + V2 local — 2026-10-07.

### 2026-10-07 — Rechazo de iconos de video y corrección V3

El operador pidió geometrías nuevas de UI moderna con redondez y hover alejados del borde. Se sustituye la primera propuesta por 13 glifos originales del package y se añaden insets del dock en tokens. [Implementación y evidencia](video-player.md#corrección-v3--geometrías-propias-y-aire-interior). Sin aprobación visual ni release.

### 2026-10-07 — Video V4, conjunto autorizado

«Vamos con todos»: islas, profundidad, motion, timeline precisa, menú móvil y paneles Editorial/Review; señal puntual opt-in. Implementado en primitives, contrato 0.3.0 candidate y adapter DOM/React. [Estado y QA](video-player.md#v4--conjunto-autorizado-2026-10-07). Sin release ni aceptación visual implícita.

### 2026-10-07 — Volumen expandido sin desborde

Corrección del operador sobre V4: range con insets de tokens y clipping durante expansión; densidad por ancho real del controller evita empujar las otras islas. Regresión de extremos, foco y nueve anchos en las tres skins. [Detalle](video-player.md#corrección-del-volumen-expandido--2026-10-07). Candidato local.

- 2026-10-07 · Corrección del operador: los controles persistentes tapan el video/subtítulos. Cinema debe ocultarlos tras inactividad sin quedar fijado por el clic en Play; teclado y menú abierto conservan acceso. Implementación candidata local en AXIS `f4dd2fe` + V4; detalle y evidencia en `references/video-player.md` y QA AXIS. Sin publicación.

- 2026-10-07 · El operador señaló el timeline rectangular y el corte inferior del video vertical. Cinema compacto conserva cápsula/insets y radios inferiores del video; hover transparente sobre el target, énfasis sólo del riel. AXIS `f4dd2fe` + V4 local; detalle en `references/video-player.md`. Sin publicación.

- 2026-10-07 · «Ajustemos todo»: el operador autoriza quitar espacio permanente en inserciones de blog. Contrato candidato 0.4.0 añade presentación embedded/contextual; Cinema sólo video por defecto, contexto opcional; Editorial/Review mantienen herramientas por defecto. Título accesible preservado, autoocultado en todos los tamaños y documentación del Lab plegada. AXIS local `f4dd2fe` + cambios; sin release.

- 2026-10-07 · Video 0.5.0 local: auditoría implementada, barra compacta flotante y thumb separado de Play tras corrección del operador; Think + snapshot del último post público 251941. API/QA y límites en `references/video-player.md`. Sin publicación.

- 2026-10-07 · El operador pide replay dentro de La órbita y autoriza «ve pusheando lo que llevas y documentando». Replay canónico estático y accesible implementado; ramas de revisión, sin release/deploy. Incidente de imagen azul reaparecido en Think sigue abierto: imágenes decodificadas no acreditan píxeles visibles. Detalle en `video-player.md` y QA AXIS.

- 2026-10-07 · Push propio confirmado en los cuatro repos, rama `codex/video-player-20261007`; SHAs en `video-player.md`. Vercel Preview de Think falló por link local a AXIS; sin release ni merge. Incidente de imagen sigue abierto.
