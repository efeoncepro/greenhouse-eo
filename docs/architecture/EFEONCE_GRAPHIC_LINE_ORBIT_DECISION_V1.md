# Efeonce Graphic Line «La órbita» — Decision V1

> **Tipo de documento:** ADR (decisión de marca y sistema de diseño)
> **Estado:** Accepted (2026-09-25) — canonizada en AXIS; atribución sin logo sin medir
> **Creado:** 2026-09-25 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-28 por Claude (delta: el deck de la línea se compone entero desde el Artifact Composer, 69 de 69, con D1 medido por el gate). Antes, 2026-09-27 (delta: IA, social y staff, 19 glifos nuevos, D26; antes, el mismo día: oficio, 30 glifos nuevos, D25; antes, el mismo día: Plastilina en volumen, D24). Antes, 2026-09-26 (regla de la firma, la órbita no sustituye la composición, AXIS 0.2.7; delta (c): AXIS 0.3.0, contrato estable, `axis-graphic-line` y animaciones del logo V1.1; delta (d): lenguaje de movimiento como norma y `efeonceGraphicLine.motion` en `axis-tokens` 0.3.3; delta (e): decisiones del operador D1–D15 sobre contraste, logo en la órbita, halo, anillo de la esfera, convergencia con la foto y operación)
> **Manual canónico:** [`EFEONCE_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
> **Entregable:** [`Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](../operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf)
> **Sistema de diseño:** AXIS, página `references/graphic-line` en `axis.efeonce.org` y tokens `efeonceGraphicLine`

## Contexto

Efeonce tenía logo, paleta, tipografía y un lenguaje fotográfico aprobado, pero ninguna forma propia que se
reconociera sin el logo. Cada pieza resolvía su gráfica por separado: puntos finales, esferas, velos navy y fotos
repetidas. La exploración se hizo en un canvas de trabajo (39 láminas, 7 capítulos; hoy 40, con la 4.9 «Oficina en foto») y probó la línea en papelería,
merch, oficina, eventos, redes, decks, correo y producto (Efeonce Insights).

## Decisión

1. **La órbita es la forma canónica de Efeonce.** Anillo fino, arco con esfera y halo; la misma forma en las cuatro
   marcas de la familia (Efeonce, Globe, Wave, Reach), cambiando sólo el acento.
2. **Tres usos, un sistema.** La órbita rodea (logo, lente, objeto), mide (el arco es avance real: sin dato no hay
   arco) y enfoca (la lente: foto en navy apagado, a color dentro del círculo).
3. **Los valores son tokens, no copias.** Grosor, proporción del arco, radio de la esfera, halo, paleta de la órbita
   y reglas de logo e isotipo viven en `efeonceGraphicLine` del paquete de tokens de AXIS, con pruebas de contraste.
   Greenhouse y los demás consumidores los importan; nunca transcriben HEX o px.
4. **AXIS es el lugar canónico.** La página `references/graphic-line` reconstruye en HTML nativo todos los elementos
   del canvas. El canvas queda como taller; el MD y el PDF, como manual y entregable para personas.
5. **Reglas duras de la línea:**
   - Ningún texto cruza la órbita.
   - Donde aparezca `efeoncepro.com` va la burbuja oficial (`url-lum`), nunca la URL como texto. La fusión de
     luminosidad va horneada en dos variantes: clara `#848484` y sobre navy `#6F89A2`.
   - **Firma de piezas gráficas (2026-09-26, regla del operador):** un post, anuncio o portada con foto firma con el
     logo de Efeonce centrado abajo. La burbuja URL no se agrega por defecto: sólo reemplaza al logo cuando el logo ya
     aparece dentro de la imagen (mockup, objeto, merch), y va centrada, con fusión de luminosidad a opacidad plena y
     un gate que mide ≥ 4,5:1; nunca a un costado ni junto al logo. La fusión fija la luminosidad del gris, así que
     sólo pasa sobre lechos muy oscuros (manual §8.5). Los usos de la burbuja como pie no cambian.
   - **La órbita no sustituye la composición (2026-09-26, regla del operador):** ni la composición ni las formas del
     lenguaje fotográfico. Se usa en casos específicos, se declara a propósito, nunca por defecto, y nunca cruza el
     sujeto, las reservas de texto, el lecho ni la firma.
   - El logo puede vivir dentro de una frase de display sólo si está alineado a la línea base del texto.
   - La foto de la lente se produce con el lenguaje fotográfico de Efeonce (`pnpm foto:generar`), en registro
     documental y sin emblema legible. El banco propio de 8 tomas reemplazó a las tres fotos repetidas.
   - Una lente o una órbita por muro, por vidrio o por pieza; nunca como patrón.
6. **La línea es de Efeonce, no de Greenhouse.** Greenhouse es el plano de control que la documenta y la consume;
   no la adopta como su identidad de producto ni la aplica al trabajo de clientes.

### Delta 2026-09-26 — Efeonce firma todo; los productos son contexto

Decisión del operador: toda pieza sale con la firma de Efeonce, cualquiera sea la línea de servicio (creativa, web,
RevOps, medios). La marca que se posiciona es Efeonce. Globe (suite de estudio creativo, en desarrollo), Wave y Reach
aparecen como contexto: productos de esos servicios, subordinados a Efeonce, que nunca firman ni reemplazan su logo.
El lockup «Producto by efeonce» queda reservado a la superficie del propio producto. Kortex y Verk quedan fuera de la
línea gráfica por ahora. La palabra del eslogan pertenece a la **línea de servicio**: servicios creativos → «Empower your
Brand» (Globe); web, infraestructura, SEO y medición → «Empower your Engine» (Wave); medios y distribución → «Empower
your Voice» (Reach, por confirmar); Efeonce → «Growth», con **Greenhouse** como su producto, la plataforma que controla
todas las líneas (su interfaz sigue con `DESIGN.md`). Pendiente: palabra de RevOps y CRM y de Growth Strategy, y si los
acentos de producto se usan en piezas de Efeonce (recomendación: no). Manual §7 y §8.1.

### Delta 2026-09-26 (b) — La lente lleva la órbita; la esfera final es parte del texto

- **La lente** usa la anatomía de la órbita medida en la lámina 1.3 (anillo 1,4 px al 28 %, arco de 50° y esfera r
  5,6 px por 794 px de ancho, sólo por ancho). Se retira la esfera de acento suelta (0,14 del diámetro), que era seis
  veces más grande y sin arco.
- **La esfera que cierra la respuesta o el titular de marca propia es parte del texto:** guías, marcas de corte,
  selección y cursores la incluyen. Regla de contrato en AXIS (`answer-period-part-of-text`;
  `efeonce.collaboration-selection` 0.3.0 con `target.bounds`). Detalle en el manual §1.2, §1.5 y §6.

### Delta 2026-09-26 (c) — AXIS 0.3.0: la órbita como código y las animaciones del logo

- **Publicado en AXIS** (versionado independiente): `axis-tokens`, `axis-ui-contracts`, `axis-ui-registry` y
  `axis-brand-assets` en 0.3.0, y el paquete nuevo `@efeoncepro/axis-graphic-line` 0.3.1, que pinta la órbita, sus
  recetas (lente, foco, deck, retrato de la firma de mail) y su movimiento desde los tokens. El contrato
  `efeonce.graphic-line-orbit` 0.3.0 pasa a **`stable`** (evidencia: paquete, pruebas de trayectoria, archivos
  sellados y e2e del Lab). Tokens nuevos: `efeonceGraphicLine.pieces` (piezas de formato fijo medidas una por una del
  canvas) y `portrait` (retrato de la firma de mail, caja 208 → anillo r 96, foto r 78, arco 200°–250°, esfera r 7).
  Las recetas reproducen el canvas: el foco siempre con su anillo y un solo anillo alrededor del contenido.
- **Greenhouse** fija los cuatro primeros en 0.3.0 en `develop` (commit `a98751daa`; llega a producción con el próximo
  release) y no depende de `axis-graphic-line`: su adapter acepta el contrato 0.3.0, pinta la lente con arco y esfera
  y el progreso con un solo anillo, y `axis-advertising.mjs` exige la selección 0.3.0. `axis-graphic-line` tiene
  acceso de lectura desde Actions para los repos consumidores (runbook de paquetes privados de AXIS).
- **Animaciones del logo V1.1** (aprobadas por el operador): reveal 3,6 s, apertura 2,4 s y sting 1,6 s; conviven con
  el cierre anterior. Masters en el bucket público de AXIS `gs://efeonce-group-axis-public-media/motion/logo/v1.1/`
  (creado con autorización del operador), MP4, GIF y cuadros en OneDrive `13- Branding/Motion Órbita Efeonce/v1.1`,
  fichas y versiones web en el Lab (4.4.2). La animación de la órbita sin logo sale del paquete (`pnpm orbit:video`
  en AXIS). Spec: `docs/operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md`; manual §10.1, §10.2 y §13.

### Delta 2026-09-26 (d) — El lenguaje de movimiento de la órbita es norma y sus valores son tokens

- **Norma:** [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)
  convierte las animaciones del logo V1.1 aprobadas en siete reglas que cualquier pieza nueva de Efeonce sigue: ritmo
  lento–rápido–lento con anticipación y un protagonista a la vez; llegar con golpe (sobrepaso por papel, pulso con eco,
  onda de acento y resorte casi crítico); curvas por papel; la velocidad no salta en los relevos; desenfoque real sólo
  en los tramos rápidos y color en OKLab; geometría oficial con oclusión coherente y jerarquía del cuadro; y un golpe
  sonoro por impacto. Una pieza que no las sigue no es el movimiento de Efeonce aunque use el logo.
- **Valores:** viven en el token `efeonceGraphicLine.motion` de `@efeoncepro/axis-tokens` 0.3.3, con prueba en AXIS
  (tramos dentro de cada pieza, curvas por papel, resorte ≤ 1,5 %). El render de Greenhouse
  (`scripts/creative/brand-motion/`) los lee de ahí; al pasarlos del script al token se verificó que los 90 cuadros
  clave de reveal, apertura y sting y los tres sonidos salen idénticos byte a byte. Con esto se cierra el pendiente de
  «pasar los tiempos a tokens» (antes nombrado `brandReveal` / `brandOpen`).
- **Corrección:** el logo final mide el 50 % del lado corto en 16:9, el 56 % en cuadrado y el 66 % en vertical
  (`layout.logoOfShortSide`); un comentario del script decía «46 % / 58 %» y estaba desactualizado.
- **Greenhouse** fija `axis-tokens` 0.3.3 en `develop` (commit `0fdd8f492`, todavía no en `main`); el resto de los
  paquetes sigue en 0.3.0. Cambiar un valor exige cambiar el token y su prueba, publicar, fijar la versión y comparar
  el storyboard antes de producir masters; si altera una pieza aprobada, lo aprueba el operador.

### Delta 2026-09-26 (e) — Decisiones del operador D1–D15 (color, logo, órbita, convergencia con la foto, operación)

Aprobadas por el operador (Julio Reyes) el 2026-09-26. Detalle y ubicación en el manual §12.

**Color y contraste**

- **D1.** El acento de la línea llega a **3:1** contra su fondo en gráfico (arco, esfera, halo) y en texto de 24 px o
  más; **nunca** en texto de menos de 24 px (ahí navy `#023C70` sobre claro y blanco sobre oscuro). Medido: Growth
  `#0E8C82` sobre papel 3,87:1, Engine `#0375DB` sobre `#091951` 3,60:1, Voice `#F83902` sobre papel 3,53:1; pasan 3:1
  y no 4,5:1. Engine y Voice conservan su color. Token `efeonceGraphicLine.accentContrast` (`axis-tokens` 0.3.5).
- **D2.** Magenta de Revenue-HubSpot aprobado tal como está: `#E86BD0` en oscuro (5,9:1 sobre `#091951`) y `#8E1B82`
  en claro (7,5:1 sobre papel). Sin naranjo HubSpot: choca con Globe y Reach y es el color del partner.
- **D3.** En el cierre del deck, «Growth» va en el acento de la línea, no en blanco (teal sobre `#001A33` = 8,5:1).
- **D4.** Umbral de la burbuja URL: **4,5:1** (texto chico que se lee). Token `urlBubble.minContrast: 4.5`. Cierra el
  pendiente del umbral.

**Logo y órbita**

- **D5.** El logo va dentro de la órbita **sólo en cierres de marca** (cierre del deck, cierre de video, muro de
  recepción), con el anillo fuera del resguardo X. Nunca en el banner de LinkedIn (4.1) ni en el reverso de la tarjeta
  (4.6): en objetos, el logo va solo en el dorso y la órbita no entra en su resguardo. Todo otro uso sigue la regla
  n.º 8 del manual §8.3.
- **D6.** Las órbitas interiores del banner de LinkedIn (4.1) y del fondo de Teams (4.3) se reproducen con un solo
  anillo.
- **D7.** Halo sobre papel a la mitad (paradas × 0,5). Token `efeonceGraphicLine.orbit.haloOnLightScale: 0.5` (el render
  de movimiento ya lo hacía).
- **D8.** El anillo propio de la esfera (`sphereRing`) queda reservado a lo «en vivo»: el eco del pulso de impacto en
  movimiento y el estado activo o «en el aire» (por ejemplo, la cabina de llamadas). El contrato rechaza `sphereRing`
  sin `live: true` (issue `sphere-ring-only-live`).

**Convergencia con la fotografía**

- **D9.** Reglas de sinergia P1–P12 aprobadas (referencia `photography-convergence.md` §6 de la skill
  `efeonce-graphic-line`). P5 y P9 necesitan código: van a la task de `foto:prompt` y chequeos de la lente.
- **D10.** Conflictos P-1..P-9 resueltos: el exterior apagado de la lente cuenta como reserva del texto y «nunca un
  scrim» sigue para piezas sin lente (P-1); en piezas con lente se pide el lecho igual (P-2); el 55 % es del círculo
  visible de la lente y se ajusta la toma (P-3); un anillo dibujado en la escena cuenta como órbita y se elige o rehace
  el plate (P-4); la capa gráfica sobre la foto se aprueba **sólo** en los casos declarados de la línea (voz
  pregunta–respuesta, lente, medida con fuente) y sigue cerrada para todo lo demás (P-5); formato nativo 1200 × 627 en
  `foto:prompt`, nunca recortado de 16:9 (P-6, task); el retrato de perfil entra al lenguaje fotográfico como categoría
  propia donde se permite mirar a cámara, con su barra por redactar (P-7); el límite de cabezas y manos bajo el 36 %
  aplica sólo con reserva de texto (P-8, task); en piezas con lente manda la cláusula de encuadre y las palancas que
  llenan el cuadro quedan para piezas de sólo foto (P-9).

**Operación**

- **D11.** Firma de correo: cada persona la instala en Outlook desde el HTML generado; `people@efeoncepro.com` usa la
  firma del área Talent. Pendiente del operador: la URL de LinkedIn de la empresa.
- **D12.** Banco de pares pregunta–respuesta: dos por línea de servicio, sólo con respuestas verificables; pendiente de
  la revisión del operador.
- **D13.** Archivos de impresión: primero la tarjeta de presentación y el muro de recepción, en PDF vectorial desde las
  recetas; bloqueado por la especificación técnica de la imprenta.
- **D14.** La prueba de atribución sin logo corre **antes** de que la órbita entre a medios pagados con presupuesto;
  proveedor del panel y presupuesto son decisión del operador.
- **D15.** «Te hacemos visible»: revisión legal antes de cualquier pauta, sin excepción (regla reafirmada).

### Delta 2026-09-26 (f) — Iconografía canónica: Trazo y Plastilina (D16–D22)

El operador definió en el canvas «Íconos de La órbita» y canonizó (D22) la iconografía de la línea, en dos voces de
una familia: **Trazo** (lo que se mide; grilla 24, trazo 1,5, esfera 1,75) y **Plastilina** (lo que se crea; masa
blanda en grilla 48, esfera 3,4 con anillo calado, gesto en tinta del protagonista), con la esfera como **estado**
(reposo o respuesta, en el acento de la línea de la pieza), el fondo `#001a33` en todas las líneas (D21) y la **órbita
sesgada** como firma de Plastilina (D20: nunca mide; lo que mide sigue siendo circular). Voz por línea: Trazo para
Growth, Engine y Revenue; Plastilina para Brand; Voice por decidir.

Se implementó en AXIS (PR efeoncepro/axis-design-system#3, publicado el 2026-09-26 con el tag `v0.3.6`): tokens `efeonceGraphicLine.icons`
(`axis-tokens` 0.3.6), `@efeoncepro/axis-graphic-line/icons` (0.4.0) con los 30 glifos aprobados y la API para agentes
(`resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg`), los comandos `pnpm icons:export|check|vectorize` para dar de
alta glifos nuevos, la página `/references/iconography/` y la guía `docs/agent-composition/iconography.md` (ADR de AXIS
`ICONOGRAPHY_DECISION_V1.md`). El método se validó con una prueba a ciegas (un agente sin contexto produjo una guitarra en
Plastilina y una keynote en Trazo sólo con la documentación); lo que tuvo que adivinar se corrigió. Criterio e historia en
la skill `efeonce-graphic-line` (`references/iconography.md`, `ledger.md` D16–D22). Pendientes: opacidad del anillo
sesgado, voz de Voice, aire del Trazo a 20 px, publicación de los paquetes y reemplazo de Tabler en las firmas.

### Delta 2026-09-27 — Plastilina en volumen (D24)

El operador aprobó y canonizó (D24) una **tercera capa** de la iconografía: **Plastilina en volumen**, cada glifo de
Plastilina en arcilla mate, inflada y sin aristas, generado **desde su vector aprobado** (nunca una forma nueva).
Complementa al plano; no lo reemplaza. Viene de D23 (2026-09-26): el Trazo queda funcional y la distinción de la
iconografía la carga Plastilina.

- **Uso:** sólo en momentos protagonistas (portada, key visual, pieza social con un solo objeto, escenario, merch, el
  objeto en escena), **uno por pieza**, mínimo 160 px. Nunca en listas, tablas, navegación, contenido de deck,
  dashboards ni UI, ni en un grupo con Plastilina plana o con el Trazo. Sólo marca propia Efeonce.
- **Forma del set:** en respuesta, con el acento de Brand y el gesto donde existe; PNG de 1024 px con alfa y calados
  abiertos, sin sombra de contacto (se agrega al componer si hace falta). Un glifo nuevo entra primero al set plano.
- **Método:** edición con GPT Image 2.5 Sunburst sobre el ícono plano aprobado (referencia a 760 px sobre `#001a33`) y
  un prompt canónico que no se reescribe; recorte por color contra el fondo liso; QA de silueta, calados y piezas
  sueltas que avisa y no rechaza (el juicio final es mirar al 100 %).

**Alternativas descartadas:** extruir el vector en Blender (el operador lo rechazó: volumen plano, de «galleta»);
recortar con matting por IA (`pnpm ai:image:rmbg` rellenó los calados —3 966 px en el bombillo— y dejó
semitransparente una pieza suelta).

**Dónde vive:** AXIS, commit `c18e3d3` en `main` (2026-09-27) — tokens `efeonceGraphicLine.icons.volume`
(`axis-tokens` 0.3.7), 18 PNG en `@efeoncepro/axis-brand-assets` 0.3.2 (`AXIS_VOLUME_ICONS`, `findVolumeIcon`,
`volumeIconUrl`), `pnpm icons:volume -- refs|key|check|publish`, prompt `docs/agent-composition/iconography/volume-prompt.txt`,
guía `iconography.md` §9, ADR de AXIS `ICONOGRAPHY_DECISION_V1.md` (delta 2026-09-27) y la sección 05 del Lab
(`/references/iconography/#volumen`). Reglas en el manual §14.1.

**Estado:** canónico en AXIS `main` y en el Lab, y los dos paquetes están **publicados** con el tag `v0.3.7`
(2026-09-27, sobre `main@c0020b6`: `axis-tokens` 0.3.7 y `axis-brand-assets` 0.3.2; la 0.3.7 de tokens salió coordinada
junto con los cambios de superficies). Greenhouse ya fija esas versiones (commit `f3f93c926`,
2026-09-27).

### Delta 2026-09-27 — Oficio: 30 glifos nuevos (D25)

El operador aprobó (D25) **30 íconos de oficio**: «Bien, subamos esos íconos al package de axis y a su web, cuidando
el diseño que ya tiene la web y documentando para agentes y el equipo». Se produjeron con el método de alta de cada voz
y se revisaron en el canvas «Íconos de La órbita», sección 7: **15 de Trazo** (correo, llamada, calendario, reunión,
objetivo, presentación, contrato, checklist, código, base de datos, nube, integración, seguridad, ubicación, reloj) y
**15 de Plastilina** (lápiz, rodillo, aerosol, escuadra, post-it, encuadre, película, vinilo, guitarra, reproducir,
varita, taza, lámpara, trofeo, estrella), estos también en volumen (D24). El set queda en **27 Trazo + 33 Plastilina =
60 glifos**, con 33 PNG de volumen.

- **Claves únicas entre voces:** el Trazo del teléfono se llama `llamada`, porque `telefono` ya es la Plastilina del
  móvil.
- **Trazo sin arcos elípticos:** `samplePath` sólo mide arcos circulares; los óvalos (`base-de-datos`) son cuatro arcos
  circulares tangentes. Vale para cualquier glifo nuevo con óvalos.
- **Notas de uso conservadas:** checklist no va en una lista de verdad; varita y estrella no van en el mismo grupo;
  encuadre es composición y formatos, no recorte; presentación convive con la keynote de ejemplo, que queda sólo como
  ejemplo del método. Lista completa en la guía de AXIS y en la skill (`references/iconography.md` §13).

**Dónde vive:** AXIS main@cf77452 (2026-09-27) — `ICON_CATALOG` en `@efeoncepro/axis-graphic-line` **0.5.0** y los volúmenes en
`@efeoncepro/axis-brand-assets` **0.3.3**, publicados con el tag `v0.5.0` (`axis-tokens` sigue en 0.3.7); guía
`docs/agent-composition/iconography.md` §«Catálogo aprobado»; ADR de AXIS, delta «Oficio: 30 glifos nuevos (D25)»; el
Lab `/references/iconography/` mostró entonces los 60 del catálogo y los 33 volúmenes. (Greenhouse fijó 0.5.0 y 0.3.3
ese día; hoy fija las versiones de D26.)

### Delta 2026-09-27 — IA, social y staff: 19 glifos nuevos (D26)

El operador aprobó (D26) **19 íconos de IA, social y staff**: «Subelos todos a excepción del hoodie de trazo que no
parece un hoodie». **9 de Trazo** (ia, composer, buscador, influencer, prensa, social, multimedia, assets y
staff-gorra, rótulo «Staff») y **10 de Plastilina** (chispa, prompt, barra-busqueda, aro-de-luz, television, like
«Me gusta», galeria, biblioteca «Biblioteca de assets», hoodie «Hoodie Efeonce» y gorra «Gorra Efeonce»), cada uno con
su volumen. El Trazo del hoodie (`staff-hoodie`) **no entró**: no se leía como hoodie, y el hoodie existe sólo en
Plastilina. El set queda en **36 Trazo + 43 Plastilina = 79 glifos**, con 43 PNG de volumen.

- **Una clave por voz para cada concepto:** ia/chispa, composer/prompt, buscador/barra-busqueda,
  influencer/aro-de-luz, prensa/television, social/like, multimedia/galeria, assets/biblioteca, staff-gorra/gorra.
- **Sin terceros ni logos dibujados:** ninguno imita la interfaz ni el logo de un asistente de terceros (ChatGPT,
  Gemini); hoodie y gorra van sin logo, y la marca la pone la esfera (en la capucha y en el panel frontal).
- **Notas de uso:** influencer (Trazo) al responder se parece a talent, no van juntos; chispa no va con estrella ni
  varita; galería y biblioteca se usan separados; prompt es el más débil a 32 px.

**Dónde vive:** AXIS main@cf77452 (2026-09-27) — `ICON_CATALOG` en `@efeoncepro/axis-graphic-line` **0.6.0** y los volúmenes
en `@efeoncepro/axis-brand-assets` **0.3.4**, publicados con el tag `v0.6.0` (`axis-tokens` va en 0.3.8, publicado por
otra sesión con superficies, y no cambia por D26); guía `docs/agent-composition/iconography.md` §«Catálogo aprobado»;
ADR de AXIS, delta «IA, social y staff: 19 glifos nuevos (D26)»; el Lab muestra los 79 y los 43 volúmenes. Greenhouse
fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4.

### Delta 2026-09-28 — El deck de la línea se compone entero desde el Artifact Composer

- Las **69 láminas** aprobadas del deck (brochure y propuesta) tienen plantilla en el catálogo `graphic-line-deck` del
  Artifact Composer y salen de un intent validado por el contrato `efeonce.surface-composition` 0.1.2 de AXIS
  (`pnpm brand:compose`; un intent con `pages` compone el documento completo). TASK-1919, TASK-1927 y TASK-1928.
- Dos decisiones de este ADR dejaron de depender de la revisión a ojo en el deck: **D1** (el acento nunca en texto de
  menos de 24 px) la mide la auditoría renderizada del gate visual en todos los frames de La órbita, y la regla «respuesta
  al menos 3× la pregunta» se mide en las láminas de decisión (cotización, clientes, plan y partners).
- **D5** (logo dentro de la órbita en el cierre del deck) sigue abierto como pendiente de QA del catálogo: ninguna
  contraportada aprobada lo lleva así; las aprobadas ponen el logo arriba de la columna.
- Greenhouse fija `axis-tokens` 0.3.21, `axis-ui-contracts` 0.3.19, `axis-graphic-line` 0.7.0 y `axis-brand-assets` 0.3.5.
  Spec técnica: [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md); norma:
  [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Punto gigante o esfera tipográfica como forma principal | Se lee como puntuación, no como forma; no mide ni enfoca |
| Anillo teal como hilo de familia (opción B) | Duplicaba la órbita sin sumar significado |
| Velo navy sobre fotos de banco | Genérico, sin oficio; lo prohíbe el lenguaje fotográfico |
| Exportar las láminas como imágenes a AXIS | Un sistema de diseño no puede ser una galería de capturas: se perdían texto, vectores y tokens |

## Consecuencias

- Cuando una pieza nueva de Efeonce usa la órbita o la burbuja de URL, toma sus valores de los tokens de AXIS y sus
  archivos de `@efeoncepro/axis-brand-assets`. La órbita no va por defecto en toda pieza y la burbuja no es la firma
  por defecto (ver reglas duras).
- Cambiar un valor de la línea exige cambiar el token y su prueba, no el documento.
- La página de AXIS es pública; lo que allí aparece (piezas de muestra, carnet y firma) queda expuesto.

## Pendiente

- **Prueba de atribución sin logo:** 600 personas, panel a cotizar. Hasta medirla, la línea es un sistema
  consistente, no un activo distintivo demostrado. Desde el 2026-09-26 (D14) debe correr antes de que la órbita entre
  a medios pagados con presupuesto.
- Revisar el banco de pares de copy y aprobar dos por línea de servicio (criterio D12). (La firma de mail quedó
  resuelta el 2026-09-26: ver delta.)
- Archivos de impresión y plantillas editables. Delta 2026-09-25: la órbita ya tiene contrato de composición por intención en AXIS 0.2.6 (`efeonce.graphic-line-orbit`, candidate; ADR `GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1` en AXIS) con adapters en el Lab y en Greenhouse (`pnpm creative:orbit:render`).
- Delta 2026-09-26: contrato `0.2.0` (paquetes AXIS `0.2.7`) con `signature` (logo centrado; burbuja URL centrada
  y con fusión sólo si el logo ya está en la imagen), `slogan`, `state` y `brand-close`; la órbita no sustituye la
  composición fotográfica (check `orbit-never-over-subject-or-reserves`); archivos oficiales en el paquete nuevo
  `@efeoncepro/axis-brand-assets`; la órbita entra como capa opcional en `pnpm creative:layout`. La regla de la firma
  se aplica también en los dos compositores de campaña, sólo en piezas nuevas: `foto:componer:cta` (tramo 17,
  `marcaEnEscena` + gate `firma-burbuja`) y `creative:layout` (`brand.signature`); las piezas y contratos anteriores
  se dibujan igual y no se recertifican. En el Lab de AXIS, la sección 5.7 «Componer con agentes» y el banco de
  tipografía creativa firman con el logo centrado, y la sección nueva 4.9 muestra la oficina fotografiada.
- ~~Decisión del operador: si el umbral de la burbuja-firma sigue en 4,5:1 o baja a 3:1 (objeto gráfico).~~ Resuelto
  el 2026-09-26 (D4): se mantiene 4,5:1.
- Copy en inglés, revisión legal de «Te hacemos visible» (antes de cualquier pauta, D15) y tamaños mínimos validados
  con prueba de impresión. Archivos de impresión: primero tarjeta y muro de recepción, bloqueados por la especificación
  de la imprenta (D13).
- Task de `foto:prompt` y chequeos de la lente (P5, P9, P-6, P-8; D9–D10), la barra del retrato de perfil (P-7) y la
  URL de LinkedIn de la empresa (D11).
- Delta 2026-09-26 (tarde): **firma de correo v3.1 aprobada** en sus dos versiones (A sobre papel, B tarjeta navy).
  La línea que termina en la esfera va una vez; los partners abren su propia zona con una regla fina **sin esfera**.
  Contrato AXIS `efeonce.email-signature` 0.3.0 (`stable`), tokens `efeonceGraphicLine.emailSignature`, lámina 4.5 del
  Lab. Detalle en el manual §10.2.


## Delta 2026-10-07 — Reproductor compartido, candidato

El operador solicitó skins portables en AXIS para editorial, demos y revisión creativa. El candidato local Cinema/Editorial/Review usa tokens de La órbita y controles Media Chrome; no supone adopción de La órbita en el resto de Greenhouse. La decisión específica permanece Proposed en AXIS: `docs/architecture/VIDEO_PLAYER_SKINS_DECISION_V1.md`. [Estado y límites](../../.claude/skills/efeonce-graphic-line/references/video-player.md). Aceptación visual, distribución y adapters consumidores pendientes.

## Addendum 2026-10-07 — La órbita como design system de Efeonce Rooms

**Accepted, instrucción explícita del operador:** «Sobre la estética y tipografía hay que ajustar todos los documentos porque efeonce-graphic-line es el nuevo design system».

La órbita gobierna la totalidad de las superficies propias de Rooms: autoría, exploración, presentación, consola y evaluación. Bricolage editorial/Poppins funcional; paleta, componentes, iconografía y motion canónicos. AXIS es la infraestructura de distribución de ese sistema. La propuesta histórica Poppins/Geist para Rooms queda reemplazada. La composición específica sigue su revisión de píxeles; no se impone el formato pregunta/respuesta a las propuestas y no se altera el arte cliente.

La adopción de Rooms está documentada en [su ADR](rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md), [dirección visual](../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md) y [EPIC-052](../epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md). No implica migrar automáticamente el runtime de Greenhouse, modificar pins ni publicar nuevos assets. Decisión contrastada con tokens locales AXIS `f4dd2fe`, sin rollout Rooms.


### Delta video V2 — 2026-10-07, candidato local

Implementación ampliada por instrucción del operador: transcripción, miniaturas, Review con editor/estados delegados y API DOM/React. La órbita aporta valores, posición real y carga funcional; conserva el contenido sin firma ni anillo añadidos. Contrato `efeonce.video-player` 0.2.0 candidate; decisión y evidencia en AXIS `docs/architecture/VIDEO_PLAYER_SKINS_DECISION_V1.md` y `docs/quality/video-player.md`. Sin release ni adopción automática; el fixture audiovisual conserva su autorización separada para publicación.

### Delta video V3 — 2026-10-07, candidato local

Por corrección explícita del operador, las geometrías Tabler se sustituyen por una familia original de 13 controles UI curvos dentro de primitives. El dock añade margen interior para separar los hover del borde, con altura reservada coherente en las tres skins y móvil. No promueve el catálogo Trazo/Plastilina. Detalle y evidencia en la referencia `efeonce-graphic-line/references/video-player.md` y QA del repo AXIS.

### Delta video V4 — 2026-10-07, candidato local

Conjunto autorizado por el operador: islas, translucidez, motion, búsqueda fina, Ajustes móvil, transcripción lateral y Review con navegación/anotación puntual. Contrato 0.3.0 candidate; datos, versión y persistencia siguen bajo autoridad del consumidor. Estado y QA en skill `efeonce-graphic-line/references/video-player.md`. Sin publicación ni adopción implícita.

Video V4, corrección local del volumen (2026-10-07): insets del slider y densidad de controles por ancho del controller evitan desbordes al hover/foco. Tokens/renderer compartidos; detalle en la referencia de la skill `efeonce-graphic-line/references/video-player.md`. Sin publicación.

Video V4, corrección local del autoocultado (2026-10-07): Cinema retira controles tras 3 s de inactividad durante reproducción, sin bloquearse por foco residual del clic. Subtítulos independientes; teclado deliberado y ajustes abiertos conservan controles. Detalle en `efeonce-graphic-line/references/video-player.md`. Candidato local, sin publicación.

Video V4, detalle compacto/vertical (2026-10-07): timeline en cápsula con insets también en compacto, hover sin fondo rectangular y radios inferiores del video. Corrección compartida en AXIS, candidata local; referencia de la skill `efeonce-graphic-line/references/video-player.md`.

Video 0.4.0 candidato (2026-10-07): presentación embedded/contextual independiente de skin. Cinema inserta sólo video por defecto, sin pie ni reserva inferior; Editorial/Review conservan contexto. Título siempre accesible y contexto opcional mediante contrato compartido. Autorización del operador «Ajustemos todo»; implementación local, sin publicación. Detalle en `efeonce-graphic-line/references/video-player.md`.

Video 0.5.0 candidato local (2026-10-07): auditoría autorizada, compacto flotante con aire al marco y Play, búsqueda/captions, revisión protegida y extensiones explícitas. Primeras validaciones: Think y snapshot del último artículo público 251941, no adopción productiva. Estado/API/límites en `efeonce-graphic-line/references/video-player.md` y AXIS `docs/quality/video-player-0.5.0.md`. Sin publicación ni certificación física.

Video, continuidad 2026-10-07: replay contenido en órbita canónica estática con nombre accesible; commit/push autorizado hacia ramas de revisión, sin publicación ni adopción productiva. El incidente intermitente de imagen azul en Think sigue abierto aunque una reproducción fresca completa pasa. Estado detallado: skill `efeonce-graphic-line/references/video-player.md` y QA AXIS `docs/quality/video-player-0.5.0.md`.

## Distribución del reproductor — 2026-10-07

Publicado en GitHub Packages: `axis-ui-primitives@0.6.3`, `axis-tokens@0.6.0`, `axis-ui-contracts@0.7.0`. [Release v0.6.3](https://github.com/efeoncepro/axis-design-system/actions/runs/37630788367) SUCCESS, fuente `7fb549a4ee862f077a05e8ff6bc0fadc58f44ff0`. Instalación limpia, exports DOM/React/integrations, SSR y igualdad byte a byte del JS/CSS con el build verificado: PASS. Think fija registry + lockfile, sin `link:`; build y typecheck PASS, main `cd428c789a4fea2feab3b4b0d08cf68c7f07efd5`, Vercel Production Ready en https://think.efeoncepro.com/preview/video-player. AXIS main y https://axis.efeonce.org/references/video-player/ desplegados.

El incidente intermitente de pintura azul en sesiones antiguas del navegador integrado sigue ABIERTO; esta publicación no acredita su corrección. WordPress conserva bloque candidato sin activación ni modificación del artículo publicado. Dispositivos/AT físicos y streaming real mantienen sus gates. Registry empaquetado 0.7.2 conserva su inventario anterior; no inferir descubrimiento de video desde ese paquete histórico.
