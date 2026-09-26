# Efeonce Graphic Line «La órbita» — Decision V1

> **Tipo de documento:** ADR (decisión de marca y sistema de diseño)
> **Estado:** Accepted (2026-09-25) — canonizada en AXIS; atribución sin logo sin medir
> **Creado:** 2026-09-25 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-26 por Claude (regla de la firma, la órbita no sustituye la composición, AXIS 0.2.7; delta (c): AXIS 0.3.0, contrato estable, `axis-graphic-line` y animaciones del logo V1.1; delta (d): lenguaje de movimiento como norma y `efeonceGraphicLine.motion` en `axis-tokens` 0.3.3; delta (e): decisiones del operador D1–D15 sobre contraste, logo en la órbita, halo, anillo de la esfera, convergencia con la foto y operación)
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

Se implementó en AXIS (rama `feat/iconography`, commit `b5a621f`, **sin publicar**): tokens `efeonceGraphicLine.icons`
(`axis-tokens` 0.3.6), `@efeoncepro/axis-graphic-line/icons` (0.4.0) con los 30 glifos aprobados y la API para agentes
(`resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg`), los comandos `pnpm icons:export|check|vectorize` para dar de
alta glifos nuevos, la página `/references/iconography/` y la guía `docs/agent-composition/iconography.md` (ADR de AXIS
`ICONOGRAPHY_DECISION_V1.md`). El método se validó con una prueba a ciegas (un agente sin contexto produjo una guitarra en
Plastilina y una keynote en Trazo sólo con la documentación); lo que tuvo que adivinar se corrigió. Criterio e historia en
la skill `efeonce-graphic-line` (`references/iconography.md`, `ledger.md` D16–D22). Pendientes: opacidad del anillo
sesgado, voz de Voice, aire del Trazo a 20 px, publicación de los paquetes y reemplazo de Tabler en las firmas.

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
