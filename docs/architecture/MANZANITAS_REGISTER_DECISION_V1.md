# Registro Marketing con Manzanitas — registro complementario de «La órbita» — Decision V1

> **⚠️ Alcance: esta decisión aplica SÓLO a piezas de Marketing con Manzanitas (MCM)**, la marca editorial evergreen
> del blog de Efeonce. No reemplaza ni modifica la línea gráfica de Efeonce ([ADR «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)),
> no se aplica a otras piezas de Efeonce y no se mezcla con la [sub-línea de Glitch](./GLITCH_GRAPHIC_LINE_DECISION_V1.md).
>
> **Tipo de documento:** ADR (decisión de marca y de composición)
> **Estado:** **Accepted** (2026-09-28) — aprobado por el operador (Julio Reyes): toda la línea del canvas v39 y su
> canonización como registro complementario de La órbita (citas en [Contexto](#contexto)). El [plan de AXIS](#plan-en-axis-ejecutado-el-2026-09-28)
> **se ejecutó y se publicó el 2026-09-28** (tag `v0.3.26`; ver [Delta 2026-09-28](#delta-2026-09-28--publicado-en-axis)).
> **Fecha:** 2026-09-28
> **Owner:** Marca Efeonce (operador: Julio Reyes). Greenhouse guarda el canon humano; AXIS es el dueño de los
> valores y del contrato desde el 2026-09-28.
> **Alcance técnico:** este ADR, la norma operativa y la referencia para agentes de la skill `efeonce-graphic-line`. En
> AXIS, **publicados**: token `manzanitasRegister`, contrato `efeonce.manzanitas-register`, `assets/manzanitas/`, módulo
> `charts` de `axis-graphic-line` y Lab `/references/manzanitas/`. Ningún runtime de Greenhouse depende todavía del registro
> (Greenhouse aún no fija esas versiones).
> **Reversibilidad:** `two-way` (documentación y piezas; ver [Reversibilidad](#reversibilidad)).
> **Confianza:** `high` en la decisión (aprobación y canonización explícitas del operador) y en su publicación en AXIS.
> **Validado al:** 2026-09-28 — valores medidos en el canvas v39 y publicados en AXIS `v0.3.26` (verificado contra los
> paquetes publicados, el Lab en vivo y el CI de `main`).
> **Creado:** 2026-09-28 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-28 por Claude (delta: publicado en AXIS por TASK-1936)
> **Norma operativa:** [`MANZANITAS_REGISTER_V1.md`](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
> **Referencia para agentes:** `.claude/skills/efeonce-graphic-line/references/manzanitas.md` (skill `efeonce-graphic-line`)
> **Línea madre:** [`EFEONCE_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) ·
> [ADR «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
> **Hermana (no se mezcla):** [ADR de la sub-línea de Glitch](./GLITCH_GRAPHIC_LINE_DECISION_V1.md)
> **Relacionadas:** [Biblioteca de recursos de MCM](../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md) ·
> [ADR del Artifact Composer](./GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md)
> **Canvas de referencia (privado):** [«Marketing con Manzanitas · Línea v1»](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG), versión 39
> **Sistema de diseño de referencia (privado):** [«Efeonce — La órbita»](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc)


## Delta 2026-09-28 — publicado en AXIS

TASK-1936 llevó el registro a AXIS con autorización explícita del operador («Ejecuta todo tu plan entonces», «Coordinate
con las peer session y avanza con todo» y, al ver qué salía, «Empuja todo junto»). `main` de AXIS quedó en `06cb62d`, con
CI verde; el tag `v0.3.26` (commit `aca07c2`) publicó, con `release-packages.yml` verde:

| Paquete | Versión | Qué trae |
|---|---|---|
| `@efeoncepro/axis-tokens` | `0.3.26` | `manzanitasRegister` (top-level, `status: 'candidate'`, fuera de `axisTokens`) |
| `@efeoncepro/axis-ui-contracts` | `0.3.24` → **`0.3.27`** (tag `v0.3.27`) | `efeonce.manzanitas-register` 0.1.0 → **0.1.1** (`candidate`; 0.1.1 exige que el carrusel empiece con su portada y termine con su contraportada, y acepta intents 0.1.0): `validateManzanitasRegisterIntent`, `resolveManzanitasRegisterIntent`, `resolveManzanitasChart`; 45 códigos es-CL; falla cerrado y devuelve `pending-decision` cuando la regla depende de una pendiente |
| `@efeoncepro/axis-brand-assets` | `0.4.1` | `AXIS_MANZANITAS_ASSETS`: `manzanitas-logo-{positive,negative}`, `manzanitas-wordmark-{positive,negative}`, `manzanitas-apple`; la manzana y los puntos en `[data-axis-accent="topic-line"]` |
| `@efeoncepro/axis-graphic-line` | `0.10.0` | `/charts` (no se exporta desde la raíz): `manzanitasChartSvg`, una función por receta, `runManzanitasChartChecks` |

En el mismo push salió el release de Glitch que otra sesión había dejado en local (`v0.3.25`: `axis-tokens` 0.3.25 y
`axis-ui-contracts` 0.3.23). Página y JSON: [axis.efeonce.org/references/manzanitas/](https://axis.efeonce.org/references/manzanitas/)
(`axis.manzanitas-register.v1`). Guía para agentes, schema y 16 ejemplos (9 válidos, 7 inválidos) en AXIS:
`docs/agent-composition/manzanitas.md`, `docs/agent-composition/manzanitas-register-intent.schema.json`,
`docs/examples/manzanitas/`. ADR de AXIS: `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`.

Decisiones de la ejecución (en el ADR de AXIS): claves de datos en inglés (`rows`, `parts`, `tasks`, `stages`); la
paridad con el canvas es **geométrica** (largos, posiciones, esfera y destacado), no de píxeles, porque el canvas maqueta
el texto en HTML y el paquete pinta SVG; en el Embudo, con empate, se destaca el primer paso; el Ranking dice «1 vez»
cuando tu marca lidera; los nombres del plan `channels` y `close` salieron como `canvases` y `slogan`/`backCover`.

**Sigue abierto:** ninguna de las pendientes se decidió; las diez están en `manzanitasRegister.pendingDecisions`
(incluida `masthead-ink-navy`, el navy `#022a4e` del logo). Greenhouse todavía **no** fija estas versiones ni tiene un
catálogo `manzanitas` en el Artifact Composer: son follow-ups de TASK-1936.
## Contexto

Marketing con Manzanitas (MCM, «marketing explicado simple») es la marca editorial evergreen del blog de Efeonce. Sale
en carruseles de LinkedIn, stories, banners del blog, miniaturas de YouTube y portadas de pódcast, con un logo propio: la
manzana en contorno con tres puntos arriba y el texto «Marketing con Manzanitas».

La órbita es la línea gráfica de Efeonce y ya fija la voz, la esfera, la medida, la lente, los acentos por línea, la
firma, el eslogan, la iconografía y la tipografía. Lo que no fija son las decisiones propias de una marca editorial
recurrente: de qué color va su manzana, dónde va su cabecera, cómo se alternan foto y lámina diseñada en un carrusel,
dónde va el «Desliza», cómo cierra una contraportada que pide conversación y con qué gráficos se explica un dato. La
exploración se hizo en el canvas «Marketing con Manzanitas · Línea v1».

El 2026-09-28, sobre la versión 39 del canvas, el operador aprobó:

> «Me encantan, queda aprobada toda la línea gráfica»

La aprobación cubre los formatos Pizarra, Escena, Lente y Recreo, la cabecera y la firma, la contraportada A, los
acentos por línea, los 9 gráficos y las 3 láminas de texto denso. Acto seguido precisó su naturaleza (verbatim):

> «esta línea gráfica no reemplaza The Orbit que es la /efeonce-graphic-line sino que la complementa con un nuevo
> registro para marketing con Manzanitas»

Esa segunda frase es la que canoniza: lo aprobado no es una línea gráfica nueva, sino un **registro** de La órbita.

## Decisión

### 1. Registro complementario, no línea nueva

1. **MCM es un registro complementario de La órbita**, no una línea nueva ni un reemplazo.
2. La órbita («The Orbit», skill `efeonce-graphic-line`) **sigue siendo la línea gráfica de Efeonce y manda en todo lo
   que el registro no dice**.
3. El registro **suma** reglas, estilos y piezas propias **sólo para piezas de MCM**. No cambia ninguna regla de La
   órbita ni se aplica a otra pieza de Efeonce.

### 2. Nombre canónico

- El nombre canónico es **«registro Marketing con Manzanitas»**; abreviado, «registro MCM» o «registro Manzanitas».
- **«Registro» aquí no es un registro fotográfico.** La órbita y el lenguaje fotográfico de Efeonce ya llaman «registro»
  a los modos de la foto (documental, puesta en escena, respuesta, cine). El registro Manzanitas es un registro de marca
  editorial; dentro de él, las fotos siguen usando los registros fotográficos de Efeonce (en MCM, **cine**). Cuando los
  dos términos aparezcan juntos, hay que aclararlo.

### 3. Qué hereda de La órbita (sin cambios)

- **La voz** pregunta + respuesta (`EfeonceOrbit.Voice`): anillo abierto antes de la pregunta, respuesta en Bricolage
  760 con la esfera que cierra; la respuesta ≤ 3 palabras y ≥ 3 veces la pregunta (`answer-dominates-3x`).
- **Una esfera por pieza** (`one-sphere-per-piece`) y **una órbita por pieza** (`one-orbit-per-piece`); ningún texto
  cruza la órbita.
- **La medida en la órbita**: esfera en valor × 360° desde las 12, en sentido horario, con estela corta de 50°
  (`efeonceGraphicLine.trajectory.measure`). **La Lente** (`EfeonceOrbit.Lens`).
- **Acentos por línea de servicio** desde `efeonceGraphicLine.lines` (Growth, Brand, Engine, Voice, Revenue):
  `accentOnLight` sobre papel y `accentOnDark` sobre navy. El valor vive en el token y nunca se transcribe al construir;
  referencia medida:

  | Línea | `accentOnLight` | `accentOnDark` |
  |---|---|---|
  | Growth | `#0e8c82` | `#36c8bf` |
  | Brand | `#bb1954` | `#ff6500` |
  | Engine | `#0375db` | `#0375db` |
  | Voice | `#f83902` | `#f83902` |
  | Revenue (HubSpot) | `#8e1b82` | `#e86bd0` |

- **La regla del acento:** ≥ 3:1 contra su fondo en gráfico y en texto ≥ 24 px; **nunca en texto de menos de 24 px**
  (`accent-text-min-size`). El acento es luz, gráfico y palabra, **nunca superficie**.
- **El eslogan** («Empower your Growth | Brand | Engine | Voice | Revenue») **sólo cierra**, en bloque con el logo de
  Efeonce: logo arriba, eslogan debajo al 64 % del ancho del logo (`efeonceGraphicLine.motion.layout.sloganOfLogo`),
  separado 1,35 veces su fuente (`sloganGapOfFont`).
- **La firma:** logo de Efeonce centrado abajo; la burbuja URL sólo reemplaza al logo si el logo ya está en la imagen.
- **Íconos** sólo del catálogo de AXIS (`resolveIcon`), en reposo, con la voz de la línea
  (`efeonceGraphicLine.icons.voiceByLine`: Brand = Plastilina; Growth, Engine y Revenue = Trazo; Voice = sin definir).
- **Superficies:** navy `efeonceGraphicLine.color.dark` (`#001a33`) y papel `color.paper` (`#f7f8f6`); texto navy
  `#023c70`.
- **Tipografía:** Bricolage Grotesque (respuesta y cifras, peso 760, tracking −0,035em) y Poppins (pregunta 300; texto
  400/500).
- **Lenguaje fotográfico** de Efeonce, en registro cine.

### 4. Qué es propio del registro

Las medidas de esta sección son la referencia del canvas v39. El detalle vive en la
[norma operativa](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md); cuando AXIS las publique,
mandan los tokens (ver [Consecuencias](#consecuencias)).

#### 4.1 Acentos por la línea del tema

Decisión del operador (2026-09-28, verbatim): «el marketing con manzanitas ajusta sus acentos como el color de la manzana
de los puntos de la orbita etc como dice la línea gráfica que es por linea de negocios».

- La manzana y sus tres puntos (en la cabecera, la portada y el cierre), el arco, la esfera, la barra o la cifra
  destacada van en el acento de la **línea del tema**.
- **La línea la decide el TEMA, no la pieza**: AEO / visibilidad en IA = Engine; creatividad = Brand.
- El texto del logo queda en navy (`#022a4e`, el del asset) sobre papel y en blanco sobre navy.
- Una lámina tiene **un solo selector, «Línea del tema»**: al cambiarlo cambia todo a la vez (manzana, puntos, gráfico,
  palabra del eslogan y la voz del ícono «Desliza»).
- Nunca la manzana en un color fijo ni en el acento de otra línea.

#### 4.2 Cabecera

- El logo de MCM (manzana en contorno con tres puntos arriba + «Marketing con Manzanitas») va **siempre arriba a la
  izquierda**, en todos los formatos. En el carrusel 1080 × 1350: x 80, y 72, 200 × 90 px; otras piezas usan 160 × 72,
  180 × 81 o 240 × 108 según formato.
- **Sin manzana** (sólo el texto «Marketing con Manzanitas») en la portada Pizarra y en la contraportada, porque ahí la
  manzana grande está en la lámina.
- En la portada con foto, la pregunta va en una línea para que la voz termine sobre la cabeza.
- El SVG oficial del logo tiene 25 trazos; los cuatro últimos son la manzana y los tres puntos, y esos toman el acento.
  Los SVG oficiales están en OneDrive `Alineación/5. Contenidos/13- Branding/SVG` y usan `<style>`: hay que inlinear los
  fills antes de subirlos.
- La manzana va siempre con su silueta completa legible (dos lóbulos, hendidura, hoja y tallo); puede sangrar un borde.
- Los tres puntos son ADN de familia (las ventanas de la nave), **no esferas**.

#### 4.3 Formatos de lámina y Recreo

- **Pizarra** («Diseñado»): papel o navy, la manzana, la voz y los pasos. Sirve para la portada, los pasos, el dato y el
  cierre. **El dato con fuente y el cierre van siempre en Pizarra.** Es la única que lleva la manzana grande.
- **Escena** («Foto completa»): una fotografía a sangre, con la voz en su reserva y la firma sobre el lecho, en registro
  cine. Sin manzana grande ni órbita dibujada: **la luz de la foto es la órbita de la pieza**. La foto dice lo que dice
  el texto y el lecho sale de ella: es lo que de verdad hay entre la cámara y el sujeto (la mesa donde Nexa revisa, la
  mesa del cliente, la silla del visitante), nativo, nunca agregado; la firma va dentro de su materia, con aire sobre su
  borde. El isotipo del traje de Nexa se compone y el modelo sólo lo termina sobre su silueta.
- **Lente** («Foto señalada»): la foto apagada afuera y a color dentro del círculo, para señalar a una persona o un
  objeto (`EfeonceOrbit.Lens`). Sólo en láminas interiores (la portada con foto es Escena). No se combina con otra órbita
  ni con el foco. La foto se toma para la lente: la cara y el objeto caben en el círculo fijo del formato y nadie mira al
  lente.
- **Recreo** (la mezcla): con portada Pizarra, cerca de un tercio de las láminas lleva foto (≈ 2 de 7); con portada
  Escena, la foto ya es la promesa y el carrusel llega a casi la mitad (≈ 3 de 7). Reglas: nunca dos láminas con foto
  seguidas; nunca más de tres Pizarras seguidas; el dato con fuente y el cierre, siempre en Pizarra; todas las fotos de
  un carrusel comparten registro y luz; la lámina que sigue a una foto retoma la voz (la foto nunca carga sola el
  argumento).
- **Story y blog:** una sola pieza, Escena o Pizarra, nunca las dos. Story con foto: la voz en la banda alta y la firma
  centrada sobre la mesa, dentro de la zona segura. Blog y banner: la foto se genera en 16:9 y se lleva a 1,9:1
  (1200 × 630); la voz va en el lado oscuro y la firma puede ir abajo a la izquierda, cerrando la columna del texto.
- **YouTube:** la miniatura es una Escena 16:9 con el logo abajo a la izquierda.
- **Pódcast (1:1):** la cabecera del programa en grande (420 px), porque la portada se ve a 160 px.

#### 4.4 La mano «Desliza»

- Mismo lugar en todas las láminas que la llevan (Pizarra, Escena, Lente): pegada al margen derecho (80 px); en
  1080 × 1350, a **1033 px** del borde superior en la portada y a **985 px** en los interiores (x 936, 64 × 64 px).
- Nunca junto a la voz cuando la voz va arriba, nunca en la fila de la firma, nunca sobre el sujeto (la foto se toma con
  ese rincón en calma; si el sujeto lo ocupa, se rehace la toma).
- Va en reposo. No va en la última lámina ni en la story.
- Voz del ícono por línea: Brand = Plastilina `mano` (D29); Growth, Engine y Revenue = Trazo `swipe` (D28); Voice =
  pendiente (mientras, Trazo).

#### 4.5 Firma y eslogan

- **Una sola altura de firma** en todo el carrusel: el logo de Efeonce arriba en **y 1202** (de 1350; 216 × 51 px, a
  97 px del borde inferior), en Pizarra, Escena y Lente. En la Escena queda dentro de la mesa.
- El eslogan sólo cierra: el cierre del carrusel, la story de cierre y el cierre del video; su palabra es la línea del
  tema. **Nunca** en la portada, el blog, la miniatura ni el pódcast.
- En el cierre, el logo mide 400 px para que el eslogan llegue a 24 px (el mínimo para que la palabra vaya en su
  acento); el bloque termina en la línea de firma (y 1253).
- La burbuja URL sobre la mesa de la estratega **no pasa** (1 % peor 3,80:1): esa lámina sigue con el logo.

#### 4.6 Contraportada A («A a escala», aprobada el 2026-09-28)

- Es una pieza social, no una hoja: pide **una sola conversión**, el comentario ligado a una acción que el lector hace
  hoy. La voz: pregunta + respuesta accionable + bajada en una línea «En los comentarios: …». Engine: «¿Te nombra la
  IA? Pregúntale.» + «En los comentarios: cuéntanos si te nombró.». Brand (Creative Workflows): bajada «En los
  comentarios: el primer ingrediente de tu receta.».
- La manzana de la portada vuelve **3,8 veces más grande**, recortada por arriba y por la derecha: su cuerpo con los tres
  puntos queda como una burbuja escribiendo, en el acento de la línea, sin astilla del tallo en el borde. 100 px de aire
  bajo la manzana y 120 px sobre el logo. La cabecera va sin manzana.
- **Nada simula un botón** (post orgánico): guardar, compartir y enviar se piden en el copy del post cuando hacen falta,
  nunca los cuatro a la vez. No van íconos sociales: una conversión por carrusel, los botones ya existen en la interfaz
  de LinkedIn y un comentario con sustancia pesa más.
- Se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al grader por UTM cuando aplique.

#### 4.7 Gráficos y texto denso

Nueve láminas interiores con gráficos y tres láminas de texto denso, aprobadas el 2026-09-28. Su gramática es parte de
esta decisión: ver [Gramática de los gráficos](#gramática-de-los-gráficos).

### 5. Qué nunca

- La manzana en un color fijo o en el acento de otra línea; la línea la decide el tema.
- La manzana recortada a sólo hoja + tallo, o sin su silueta completa legible.
- El acento como superficie (a sangre) o en texto de menos de 24 px.
- El hex de un acento o de una superficie transcrito al construir: sale del token.
- El eslogan en la portada, el blog, la miniatura o el pódcast.
- Dos láminas con foto seguidas o más de tres Pizarras seguidas; el dato con fuente o el cierre fuera de Pizarra.
- La Lente en la portada, o combinada con otra órbita o con el foco.
- Un lecho agregado en la Escena: el lecho es nativo de la foto.
- «Desliza» en la última lámina o en la story, junto a la voz cuando va arriba, en la fila de la firma o sobre el sujeto.
- Algo que simule un botón, o íconos sociales, en la contraportada.
- En un gráfico: una dona de partes, un círculo suelto, una barra dibujada a mano, más de un acento o una cifra sin
  fuente.
- Cualquier elemento de Glitch en una pieza de MCM, o del registro en una pieza de Glitch (ver punto 6).

### 6. Relación con Glitch

- Glitch (el magazine semanal) tiene su **propia sub-línea**: norma [`GLITCH_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md),
  referencia de la skill `glitch.md`, token `glitchLine` y contrato `efeonce.glitch-line`.
- El registro Manzanitas y la sub-línea de Glitch son **hermanos: los dos complementan La órbita y no se mezclan**.
  - **Glitch** usa la manzana **llena** como esfera, el verde `#6ec207`, la falla en bytes, Guttery y la cabecera
    «EDICIÓN #N».
  - **MCM** usa la manzana **en contorno con tres puntos** (una burbuja escribiendo) y el acento de la línea del tema.
- Ninguno usa elementos del otro.

### 7. Piezas aprobadas (2026-09-28)

Aprobadas por el operador sobre el canvas v39: los formatos **Pizarra, Escena, Lente y Recreo**; la **cabecera y la
firma**; la **contraportada A**; los **acentos por línea**; los **9 gráficos**; y las **3 láminas de texto denso**.

No son canon (ver [Pendientes del operador](#pendientes-del-operador)): la contraportada B (queda como prueba), la
portada Pizarra con la mano en respuesta (en estudio), el registro cine con personas del equipo en redes y los Trazo
candidatos `republicar` y `enviar` (en borrador).

## Alcance

- **Aplica** a toda pieza de MCM: carrusel de LinkedIn (1080 × 1350), story, banner del blog, miniatura de YouTube,
  portada de pódcast y el cierre del video.
- **No aplica** a ninguna otra pieza de Efeonce (siguen sólo La órbita) ni a Glitch (sigue su sub-línea).
- Las recetas de gráficos quedan **aprobadas sólo para MCM**. Si pasan a La órbita para piezas de Efeonce es un
  pendiente del operador (pendiente 8).

## Gramática de los gráficos

Reglas comunes de las 9 láminas con gráficos, a nivel de decisión (el detalle de medidas vive en la norma):

1. **La dona de la línea es la medida de la órbita.** No hay dona de partes: tres segmentos en un anillo serían un
   arco que se llena, y la órbita recorre, nunca se llena. Las partes (hasta 3) van en una barra al 100 %.
2. **Una esfera por pieza.** En la medida y en la tendencia la esfera ES el dato, así que esas dos no llevan la voz con
   su esfera: llevan la pregunta arriba (Poppins 300). Las otras siete cierran con la voz (`EfeonceOrbit.Voice`).
3. **Ningún círculo suelto** en un gráfico: el conteo va en cuadrados y el Venn en discos translúcidos sin anillo, para
   que nada se lea como esfera ni como órbita.
4. **Un acento, sólo donde está la idea.** El resto va en navy `#023c70` y gris `#c9d2dc` (el `before` de la receta de
   deck `decision-chart`); sobre navy, lo que no destaca va en `rgba(207, 228, 250, 0.22)` y el texto suave en
   `#cfe4fa`. El texto en acento, sólo desde 24 px.
5. **Las barras salen de su número** (`bars-from-values`) y parten de cero; ninguna se dibuja a mano.
6. **Cifras con fuente** (`figures-with-source`): sin fuente, la cifra no sale.
7. **Datos de muestra marcados** (`illustrative-data-marked`): la línea al pie dice «Ejemplo ilustrativo · Fuente:
   [FUENTE, AÑO]» hasta tener la real.
8. **Se calculan desde su dato.** La lógica de la lámina recibe `datos` (arreglo u objeto) o `valor` (entero 0–100) y
   calcula largos, posiciones, la esfera, el destacado y la respuesta cuando es un número. La plantilla sólo pinta. Las
   respuestas en palabras son texto y se editan en la lámina; las numéricas salen del dato.
9. **Todas son Pizarra** (papel o navy), 1080 × 1350, con cabecera, «Desliza» en 985 y firma en 1202. Rótulos de
   24–26 px y cifras en Bricolage 760.

Los nueve gráficos aprobados:

| # | Gráfico | Pregunta que responde | Dato | Respuesta | Superficie |
|---|---|---|---|---|---|
| 1 | Medida en la órbita | ¿Qué parte del total? | `valor` 0–100 | la cifra (sin voz) | navy |
| 2 | Ranking | ¿Quién va primero y cuánto nos separa? | `datos` [{label, v, rol}] | «N veces» = líder ÷ tu marca | papel |
| 3 | Antes y después | ¿Cuánto cambió? | `datos` {antes, despues} (índice, antes = 100) | en palabras | papel |
| 4 | Tendencia | ¿Hacia dónde va? | `datos` 12 valores mensuales | el último valor (sin voz) | navy |
| 5 | Partes de un todo | ¿De qué está hecho? | `datos` hasta 3 partes | «1 de N» | papel |
| 6 | De cada 100 | ¿Cuántos de cada 100? | `valor` 0–100 | «N de 100» | navy |
| 7 | Venn de tres | ¿Dónde se cruzan tres cosas? | concepto, sin dato ni fuente | en palabras | papel |
| 8 | Matriz 2 × 2 | ¿Qué hago primero? | `datos` [{label, esfuerzo, impacto, foco?}] | en palabras | navy |
| 9 | Embudo | ¿Dónde se pierde? | `datos` [{label, v}] en orden | en palabras | papel |

La geometría de la medida (1) sale de `measureSvg` de AXIS y se verificó contra él en 5 valores (0,05 / 0,38 / 0,62 /
0,9 / 1).

Las tres láminas de texto denso (para explicar un concepto complejo: la voz arriba y el texto debajo): **Concepto y tres
puntos** (papel), **Comparación en dos columnas** (navy) y **Paso a paso** (papel), con la cifra o el encabezado
destacado en el acento.

## Consecuencias

- Toda pieza de MCM sigue La órbita más el registro. Toda pieza de Efeonce que no es de MCM ignora lo propio del
  registro. Glitch sigue su sub-línea y no toma nada del registro.
- **La norma operativa** [`MANZANITAS_REGISTER_V1.md`](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
  guarda el detalle y las medidas para personas. **La referencia para agentes**
  `.claude/skills/efeonce-graphic-line/references/manzanitas.md` es la que carga un agente al componer una pieza de
  MCM, junto con la skill `efeonce-graphic-line`.
- **Hasta que AXIS publicó** (2026-09-28), las medidas vivían como referencia en el canvas v39 y en la norma, sin
  validador ni resolver.
- **Desde que AXIS publicó** (`v0.3.26`), rige la regla de La órbita: los valores son tokens, no copias. Como en Glitch, los números de
  la norma pasan a ser una referencia humana espejada del token y, si difieren, gana el token.
- Las recetas de gráficos no se usan todavía en piezas de Efeonce fuera de MCM (pendiente 8).
- La Escena con personas del equipo en redes espera la aprobación del registro cine con personas (pendiente 6); la
  estratega de la Escena interior es una persona por rol, generada.
- Después de AXIS, en Greenhouse y en tareas aparte: subir los pins de AXIS, crear el catálogo `manzanitas` del Artifact
  Composer para componer carruseles desde datos y hacer que la skill consuma el paquete.

### Fuente de verdad vigente

| Qué | Desde el 2026-09-28 (publicado en AXIS) | Antes |
|---|---|---|
| Decisión y alcance | este ADR | este ADR |
| Detalle y medidas | token `manzanitasRegister` (`axis-tokens` 0.3.26); la [norma](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) lo espeja y, si difieren, gana el token | canvas v39 + norma |
| Reglas verificables | contrato `efeonce.manzanitas-register` 0.1.1 (`axis-ui-contracts` 0.3.27), `pnpm manzanitas:resolve` en AXIS | criterio humano; skill `efeonce-graphic-line` |
| Gráficos | `@efeoncepro/axis-graphic-line/charts` (0.10.0): `manzanitasChartSvg` + `runManzanitasChartChecks` | dibujados en el canvas |
| Componentes heredados | DS «Efeonce — La órbita» (`EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`), por referencia desde el token | los mismos |
| Logo y manzana | `AXIS_MANZANITAS_ASSETS` en `@efeoncepro/axis-brand-assets` 0.4.1 (trazos idénticos a los SVG oficiales) | SVG oficiales en OneDrive (`13- Branding/SVG`) |

## Plan en AXIS (ejecutado el 2026-09-28)

> **Ejecutado y publicado** (ver [Delta 2026-09-28](#delta-2026-09-28--publicado-en-axis)); lo que sigue es el plan tal como se
> aprobó, útil como registro. Se ejecutó por [TASK-1936](../tasks/complete/TASK-1936-manzanitas-register-axis-token-contract-charts-lab.md), que fija el orden: ADR, token, assets, **contrato antes que gráficos** (`axis-graphic-line` depende de `axis-ui-contracts`), Lab y release. Plan visual y maqueta del Lab: https://claude.ai/artifact/WdEJAsC6HGkKdvyNvkDbvk.

> Era la propuesta para llevar el registro a código, siguiendo el precedente de
> Glitch: ADR de Greenhouse [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](./GLITCH_GRAPHIC_LINE_DECISION_V1.md) + norma
> `glitch/GLITCH_GRAPHIC_LINE_V1.md` → ADR de AXIS `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md`, token
> top-level `glitchLine`, contrato `efeonce.glitch-line` con validador y resolver que falla cerrado,
> `pnpm glitch:resolve`, ejemplos `docs/examples/glitch/*.json`, assets en `assets/glitch/` sellados fuera de
> `AXIS_BRAND_ASSETS`, Lab `/references/glitch/` + `glitch.json` → Greenhouse TASK-1922/1923/1924.

1. **ADR de AXIS** `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`.
2. **Token top-level `manzanitasRegister`** en `@efeoncepro/axis-tokens`, no rama de `efeonceGraphicLine`. Hereda por
   **referencia** (test de identidad) las líneas, las superficies, la voz, la trayectoria y el eslogan. Test de
   aislamiento contra `glitchLine` y contra `efeonceGraphicLine`: nada de La órbita referencia al registro. Contenido:
   cabecera (tamaños, trazos de acento), formatos, piezas aprobadas, «Desliza», firma, contraportada, Recreo, gráficos y
   texto denso, pendientes.
3. **Assets** en `@efeoncepro/axis-brand-assets`: `assets/manzanitas/` (logo con el grupo manzana + puntos como atributo
   de color, texto solo, manzana en contorno), sellados como `MANZANITAS_ASSET_SEALS` y declarados en
   `AXIS_MANZANITAS_ASSETS`, fuera de `AXIS_BRAND_ASSETS`. Colores como atributos, nunca `<style>`.
4. **Módulo `charts`** en `@efeoncepro/axis-graphic-line` con las 9 recetas (dato → SVG + manifiesto; la medida
   reutiliza `measureSvg`) y sus chequeos: barras desde el valor, un acento, una esfera, fuente, marca de ejemplo,
   ≤ 3 partes, sin dona de partes, texto en acento ≥ 24 px. Genérico por línea; aprobado sólo para MCM (pendiente 8).
5. **Contrato `efeonce.manzanitas-register` 0.1.0 (`candidate`)** en `@efeoncepro/axis-ui-contracts`: intent (pieza,
   formato, línea del tema, superficie, datos), validador que acumula issues con mensaje es-CL y resolver que falla
   cerrado; `pnpm manzanitas:resolve`; ejemplos válidos e inválidos en `docs/examples/manzanitas/`.
6. **Lab `/references/manzanitas/`** + `/references/manzanitas.json` (datos del token y del contrato). Secciones:
   alcance «complementa, no reemplaza», acentos por línea con selector, cabecera y firma, formatos y Recreo, «Desliza»,
   contraportada, gráficos en vivo desde datos, texto denso, nunca, para agentes y pendiente. Con tests unitarios y e2e
   y entrada en la navegación.
7. **Release:** versiones nuevas de tokens, contracts, graphic-line y brand-assets con tag; `pnpm design:check`.
8. **Después, en Greenhouse** (tareas aparte): subir los pins de AXIS, catálogo `manzanitas` del Artifact Composer para
   componer carruseles desde datos y que la skill consuma el paquete.

**Coordinación:** el checkout de AXIS es compartido. Hoy lo usa la sesión de Insights (rama `docs/insights-lab`) y hay
una rama local `docs/glitch-flash-composer` con 2 commits de otra sesión. El trabajo de MCM va en rama propia desde
`main` cuando el checkout se libere, y los releases se secuencian para no chocar versiones. **Empujar a `main` de AXIS y
crear tags es una mutación externa: requiere autorización explícita del operador.**

## Pendientes del operador

No se deciden por cuenta propia:

1. La voz del ícono «Desliza» en la línea Voice (`voiceByLine.voice` está vacío en AXIS; mientras, Trazo).
2. Si los gráficos cuentan para «nunca más de tres Pizarras seguidas» (recomendación: sí).
3. La portada Pizarra con la mano en respuesta (dos esferas): ¿excepción registrada o vuelve a reposo?
4. La zona segura de la story: la firma de la Escena story (1620–1671) cae en la franja de interfaz (franja desde
   y 1580 o el 87 % de AXIS).
5. El copy de cierre de la story (hoy «Guárdala», genérico).
6. El registro cine con personas del equipo en redes aún no está aprobado (la estratega de la Escena interior es una
   persona por rol, generada).
7. Los Trazo candidatos `republicar` y `enviar` siguen en borrador.
8. Si las recetas de gráficos pasan a La órbita para piezas de Efeonce (hoy aprobadas sólo para MCM).
9. El navy `#022a4e` del texto del logo de MCM: viene del archivo oficial y la sub-línea de Glitch lo declara exclusivo de su wordmark (`glitchLine.scope.exclusive: navy-wordmark`). ¿Es la tinta compartida de la familia Manzanitas o el logo de MCM pasa al navy de Efeonce (`#023c70`)? Hoy va el del archivo oficial.
10. El acento de un tema de Revenue en Salesforce: el selector usa Revenue (HubSpot, `revenue-hubspot`); AXIS define también `revenue-salesforce` y falta decidir cuándo aplica en MCM.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Tratar MCM como una línea gráfica nueva | Contradice la canonización del operador: la línea de MCM «no reemplaza The Orbit … sino que la complementa». La órbita sigue siendo la línea de Efeonce y manda en lo que el registro no dice |
| Aplicar lo propio de MCM a otras piezas de Efeonce | El registro es sólo para piezas de MCM; extenderlo convertiría un registro en un reemplazo de La órbita |
| Modelar el registro en AXIS como rama de `efeonceGraphicLine` | Todo consumidor de La órbita recibiría reglas que sólo valen para MCM. Igual que `glitchLine`, se propone un token top-level (`manzanitasRegister`) que hereda de La órbita por referencia, con test de identidad, y tests de aislamiento: nada de La órbita referencia al registro y el registro no toca `glitchLine` |
| Mezclar MCM con la sub-línea de Glitch (las dos usan una manzana) | Son hermanos que no se mezclan: la manzana llena como esfera, el verde `#6ec207`, la falla en bytes, Guttery y «EDICIÓN #N» son de Glitch; MCM usa la manzana en contorno con tres puntos y el acento de la línea del tema |
| Contraportada C (acento a sangre) | Rechazada por el operador: «Logo azul Efeonce acá??? … muchísima saturación». El acento nunca es superficie y el logo positivo trae el isotipo azul |
| Contraportada B (órbita, más sutil) | No se eligió; queda como prueba, no es canon |
| Recortar la manzana a sólo hoja + tallo | Se leyó como «orejas de conejo»; la manzana va siempre con su silueta completa legible |
| Íconos sociales o botones simulados en la contraportada | Una conversión por carrusel; los botones ya existen en la interfaz de LinkedIn; un comentario con sustancia pesa más |
| Lechos agregados en la Escena (mesa «matte black» en estudio vacío, cabezas del público, dorso de un portátil, «consola», piso que corta las piernas) | Rechazados: el lecho es lo que de verdad hay entre la cámara y el sujeto, nativo de la foto |
| Burbuja URL sobre la mesa de la estratega | No pasa el contraste (1 % peor 3,80:1); esa lámina sigue con el logo |
| Dona de partes | Tres segmentos en un anillo serían un arco que se llena; la órbita recorre, nunca se llena. Las partes van en una barra al 100 % |
| Círculos en el conteo o Venn con anillo | Se leerían como esfera u órbita; el conteo va en cuadrados y el Venn en discos translúcidos sin anillo |

## Reversibilidad

Alta (`two-way`). Hoy el registro es documentación y piezas; nada del runtime de Greenhouse depende de él. Revertir la
decisión es retirar la norma y volver a componer MCM sólo con La órbita. Si el plan de AXIS se ejecuta, revertir en AXIS
es deprecar el token, el contrato y `AXIS_MANZANITAS_ASSETS` en una versión nueva (lo publicado no se borra), como en
Glitch. El costo de revertir crece cuando el catálogo `manzanitas` entre al Artifact Composer.

## Revisar cuando

- El operador decida cualquiera de los [pendientes](#pendientes-del-operador), en especial el 8 (recetas de gráficos en
  La órbita), que cambia el alcance.
- AXIS publique el token y el contrato: se registra en un Delta la versión, el tag y el paso de la fuente de verdad al
  token.
- El contrato `efeonce.manzanitas-register` deje de ser `candidate`.
- Una pieza de MCM necesite algo que ni La órbita ni el registro resuelven.

## Referencias

- **Canvas** «Marketing con Manzanitas · Línea v1», versión 39: https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG
  (tableros `Grafico-1…9`, `Texto-1…3`, `Graficos-resumen` «cómo funcionan», `Graficos-lineas` «acentos por línea»,
  `Formatos`, `Cierre-acciones`, `CW-*`, `Escena-*`, `Lente-interior`, `Story-cierre`, `Podcast-1x1`, `YouTube-cierre`).
- **Sistema de diseño** «Efeonce — La órbita»: https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc (componentes
  `EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`).
- **Norma operativa del registro:** [`MANZANITAS_REGISTER_V1.md`](../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md).
- **Referencia para agentes:** `.claude/skills/efeonce-graphic-line/references/manzanitas.md`; skill
  `efeonce-graphic-line` (criteria §3.4 y §8, ledger 2026-09-28).
- **Biblioteca de recursos de MCM:** [`MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md`](../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
- **SVG oficiales del logo:** OneDrive `Alineación/5. Contenidos/13- Branding/SVG`.
- **La órbita:** [ADR](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [manual](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).
- **Glitch (hermana, precedente del plan de AXIS):** [ADR](./GLITCH_GRAPHIC_LINE_DECISION_V1.md) ·
  [norma](../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · ADR de AXIS
  `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md` (repo `efeoncepro/axis-design-system`).
