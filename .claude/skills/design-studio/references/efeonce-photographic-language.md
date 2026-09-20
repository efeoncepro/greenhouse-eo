# Lenguaje fotográfico de Efeonce — guía operativa para dirigir

Cargar cuando el trabajo sea **fotografía o imagen fotorrealista de la marca propia Efeonce** (redes, web,
KV, piezas de equipo, espacios, objetos o 3D en escena). No aplica a clientes: cada cliente tiene su lenguaje.
Aprobado por el operador (Julio Reyes) el **2026-09-19** («todas me gustaron»). Esta guía condensa lo operativo;
el contrato completo, las mediciones y los prompts verbatim viven en la documentación canónica (§14).

> **Estado honesto.** Es un **sistema consistente aprobado**, **no un activo distintivo medido**. Falta la prueba
> de reconocimiento (n≥100, distractores coherentes, antes/después). NUNCA afirmar que «se reconoce como Efeonce».

## Preflight visual obligatorio antes de generar

**Leer esta guía no sustituye mirar las imágenes que aprobó el operador.** Abre la hoja
`ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/personas/julio-nexa-firmadas.jpg` cuando salgan
Julio o Nexa, la hoja `rondas/curado/set-curado-12.jpg` para la serie de color y al menos dos finales individuales
comparables a tamaño completo. Antes del prompt, registra los archivos que viste y la comparación concreta:
oficio/momento, cómo viven el azul activo y el naranja **o** lima en la composición, lecho desenfocado, firma y rasgos
de identidad. Declara en la ficha su relación natural con luz, reflejos, materiales, superficies y planos de la
escena; ningún color exige un objeto propio ni utilería añadida para cumplir la paleta. **Un HEX en un bloque
genérico no basta**. Después de generar, mira el plate junto a las aprobadas y usa las métricas como apoyo, no como
cuota de píxeles: un acento visible en sombra puede medir poco. Si la relación cromática se siente forzada, el color
desaparece visualmente o el lecho falla, vuelve a dirigir y regenera; no lo declares aprobado. Canon operativo:
[pipeline §0](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

## 1. La idea: «El oficio a la vista»

Se fotografía **la obra y el oficio de cada servicio** (Creative, Growth, RevOps/CRM, Media, Digital/Wave,
Channel & Commerce), **el sistema o el dato** que lo sostiene y **personas decidiendo**. Nunca reuniones genéricas.
Objetivo del operador: que la foto y su colorimetría se sientan de la agencia, **premium, de clase mundial**.

Arquetipos a evitar: **consultora** (talleres, post-its, mesas genéricas), **performance** (dashboards sin idea),
**creativa pura** (oficio sin sistema). La V2 de «salas tonales + gente en mesas» se rechazó por genérica.

## 2. Barra de juicio (cada pieza la pasa o se rehace)

1. **Test de sustitución:** con el logo de otra agencia deja de funcionar.
2. **Hay obra** (algo que Efeonce hace), **hay mecanismo** (sistema, traza, dato) y **hay idea** (situación con tensión).
3. Funciona en los **3 modos** (equipo con uniforme, equipo sin marca, sin personas: objetos/espacios/3D) y a **390 px**.
4. **Verdad operativa:** nada que no hagamos; nada que parezca stock.
5. **Paleta = luz y material, no ropa.** «La colorimetría no es vestir de navy».
6. **Regla madre:** «una buena imagen de IA es la que no se siente que es IA».

## 3. La firma: lecho planeado + logo compuesto

- El primer plano desenfocado es una **herramienta o superficie del oficio** entre cámara y sujeto,
  **planeada en la toma** (va en el prompt como `FOREGROUND`). NUNCA se añade después.
- **Declarar SIEMPRE el tono del lecho** («DARK near black» / «VERY LIGHT almost white»). La madera de tono medio
  (lum 139–171) produjo 6+ fallos: el logo no pasaba ni en blanco ni en navy.
- **Medir** nitidez dentro del lecho (p99 Sobel): **p99 ≤ ~20 (máx ≤ ~25)**, muy por debajo del rostro (200–780).
  Transición gradual (≥5% del alto); cortes de 1–3% se leen como «banda». Si falla, **se regenera**.
- **Logo:** SVG oficial (`public/branding/logo-negative.svg` blanco / `logo-full.svg` navy `#023c70`), compuesto
  determinísticamente, **centrado horizontal**, centro vertical ≈ **93,5%** del alto en 4:5, **ancho 20%** del lienzo
  (decisión del operador 2026-09-20). Color por contraste medido: blanco contra el píxel más claro del área,
  navy contra el más oscuro; **mínimo 4,5:1**.
- **Sin firma** cuando el emblema bordado se lee a tamaño de consumo (polo) o un 3D de marca es protagonista.
  **Una sola marca protagonista por foto.**
- En feed, **alternar lechos claros/oscuros y materiales**: la misma banda repetida se vuelve plantilla.

Lechos probados: borde de mesa a ras del lente · respaldo de silla del espectador («tu lugar en la mesa») ·
escritorio del visitante · matte box / rig · consola de corrección de color · borde de mesa de luz · fila de
latas/botellas («casi tocando el lente, f/1.4, sin bordes», o sale nítido) · marco de vidrio · maleta de equipo
en el piso · techo de auto sin logos · cabezas del público · cámara de estudio · mostrador de fruta ·
**desenfoque óptico del tilt-shift** (el más natural) · borde curvo de mesa en ojo de pez.
Dron o tomas todo-enfocadas: sin lecho; firma sobre pavimento sereno claro — **decisión pendiente** (¿url-lum?).

Detalle: [firma y primer plano](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md)
y [brand-in-scene](../../social-media-studio/references/brand-in-scene.md).

### Selección colaborativa AXIS (recurso, ~1 de 3 piezas)

Cursores con nombre sobre el **objeto real**, vía `renderCollaborationSelection` +
`resolveCollaborationSelectionIntent` (nunca coordenadas decorativas). Etiquetas cortas: Arte (naranja `#F55D01`),
Cliente (lima `#6EC207`, aprueba), RevOps/Efeonce (azul `#0375DB`), Nexa (`#d6246e`), SEO (`#12afa2`).
Anclas hacia el espacio libre; mejor sobre objetos grandes que sobre UI chica. **NUNCA** el nombre de un cliente real.

## 4. Roles de color

| Color | Rol | Cómo aparece |
|---|---|---|
| Azul activo `#0375DB` | **La casa**, en todas | relación cromática integrada en luz, reflejos, materiales o planos de la escena; puede leerse como acento o campo |
| Naranja `#F55D01` | **La idea**, momento creativo | señal cromática nacida de la acción o de la composición; no requiere utilería naranja |
| Lima `#6EC207` | **El resultado** | señal cromática nacida del resultado o de la composición; no requiere tarjeta ni check |

- **Un solo acento** (naranja o lima) por pieza además del azul, nacido de la situación. El 1–5% **a ojo**
  orienta la lectura, no obliga a fabricar un objeto ni es un umbral de aprobación de `metricas.cjs`. Una relación
  entre áreas, un reflejo o una luz pueden llevarlo con naturalidad. Utilería puesta (jarrón o libro naranja) se lee
  falsa; la taza azul repetida en 3–4 piezas fue sesgo.
- **Los objetos sí son válidos** cuando pertenecen al oficio o al lugar y aportan un acento sutil y elegante.
  Evaluar su función y cómo se integran con luz, personas y espacio; «no obligatorio» nunca significa «prohibido»
  **[aclaración del operador, 2026-09-20]**.
- Azul **nunca intermedio en ropa grande** (camisa 16%, hoodie 17% = demasiado).
- Navy **nunca** en pared + ropa + logo a la vez; uniforme navy sobre set **no** azul (se funde con tinta).
- HEX en prompt se interpreta laxo (ΔE 15–19): **pedir por material** («dusty matte deep ink blue, low sheen»).

Detalle: [colorimetría](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md).

## 5. Balance de blancos y exposición

- **Sin grade.** El grade «Navy Shadow» (V0) fue rechazado: color natural. Si falla, **se regenera**; corrección
  técnica mínima sólo si es imprescindible.
- **Neutro-cálido ~5200 K**, blancos levemente cálidos, **sombras neutras, nunca azules**. **Exponer para las altas
  luces** (un KV pasó de 31,5% quemado a 0,05%).
- Lámparas prácticas encendidas dan look podcast-stock: en sets oscuros, apagadas o puntuales.
- Rangos objetivo (script de métricas Lab, pieza a 576 px): quemado ≤ 0,5–1% (contraluz ≤ 2–3%); aplastado ≤ 5%
  (clave baja ≤ 8%, pedir «shadows deep but always with visible texture»); contraste p95−p5 70–90 en piezas de
  impacto; croma p95 ≤ ~40 salvo campo azul; b\* altas +2 a +12; b\* sombras −3 a +3; piel L 44–61, C 18–31.
  La dispersión de tono es **control, no bloqueo**.

## 6. Palancas de impacto (nivel +1)

«El impacto viene de la luz y la composición, no del modelo»:

- **Luz con carácter:** haz de sol duro, sombras gráficas (persianas), contraluz, hora dorada, mediodía duro.
- **Momento decisivo:** harina en el aire, risa real, celebración, gesto a mitad.
- **Composición gráfica:** geometría, marco dentro del marco, escala (persona pequeña en espacio grande), espacio negativo.
- **Tres planos de profundidad** (lecho · sujeto · fondo) y **bloque de color** cuando el azul es campo.
- **Atmósfera** — aire con materia cuya función es **hacer visible la luz**: `polvo` dentro del haz, `bruma` que
  para los rayos como columnas sólidas, `vapor`, `humo` de escena a contraluz. **Exige un haz declarado**: sin
  luz con dirección no tiene qué revelar y se lee pegada (`pnpm foto:prompt` aborta). El polvo vive **sólo dentro
  de la luz**, nunca como suciedad. Es la palanca de mayor retorno **[medido 2026-09-20]**.
- **Acción suspendida** — congelar **lo que está en vuelo** en el pico de su arco, con peso y trayectoria reales;
  nunca un esparcido decorativo ni confeti. Se declara QUÉ vuela, en concreto. **Dosis: 1 de cada 4 piezas**
  **[decisión del operador]**; el comando cuenta la tanda y avisa con el número si se pasa.

> **«Épica» no es la palabra** (arrastra escala grandilocuente y horizonte, el stock premium que este lenguaje
> rechaza). Lo que se busca es **realismo cinematográfico**, y son cuatro cosas distintas: **registro documental**
> (la cámara llega a algo que ya pasaba), **momento decisivo** (el pico), **acción suspendida** (lo que vuela) y
> **atmósfera** (el aire que revela la luz). Ambas palancas se piden **por ficha**, nunca desde el bloque fijo.
> Detalle y evidencia: [pipeline §3.9](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

## 7. Catálogo corto de tomas (lente declarado en el prompt)

| Toma | Lente / ajuste | Uso | Lecho |
|---|---|---|---|
| Asiento en la mesa (base) | 50 mm f/2, lente a ras | co-creación, sesiones | borde de mesa oscuro/claro |
| Ojo de pez a ras / fuerte | 10 mm / 8 mm desde el borde de la mesa | taller, energía | borde curvo de mesa (tono declarado) |
| Tilt-shift | balcón 45°, franja nítida | rodaje en calle | desenfoque óptico |
| Contrapicado | 24 mm f/2,8, cámara en el piso | Run & Gun, dirección | maleta de equipo |
| Reflejo en vidrio | 50 mm f/2 | estrategia, journey | marco del vidrio |
| Tele | 200 mm f/2,8 | equipo en ciudad, escenario | techo de auto / público |
| Retrato | 105–135 mm f/2 | equipo | escritorio o mesa |
| Marco dentro del marco | 50 mm f/2,8 desde pasillo | estrategia | consola («dissolves into abstract blur») |
| Escala | 35 mm f/4 | datos, espacio | piso de concreto |
| Macro · barrido · noche · dron | 100 mm f/4 · 35 mm lento · 50 mm f/1,8 · cenital 25 m | textura · Run & Gun · cierre · eventos | según toma (dron: sin lecho) |

El operador aprobó **dos ángulos de Nexa**: ojo de pez fuerte (N1b) y ojo de pez a ras del borde de la mesa (N1).
Todo se probó en **4:5 1152×1440**; 9:16 y 16:9 nativos están **pendientes**. Catálogo completo con mediciones:
[cámara, lente y ángulo](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md).

## 8. Realismo sin suciedad

- Realismo desde **personas, luz y materiales**: poros, pelo suelto, pliegues, polvo en el haz, leve movimiento de
  manos, viñeteo natural, encuadre imperfecto. Espacios **limpios y cuidados** con 1–2 detalles de uso.
- **NUNCA** suciedad, manchas, cinta, cables ni «clutter» (la versión con coffee rings se rechazó: «tanto desorden
  y suciedad tampoco se ve bien»). Tampoco piel plástica, simetría perfecta, CGI, HDR ni sonrisas de stock.
- Nadie mira a cámara salvo decisión explícita; **sin texto ni logos** generados.
- Objetos de terceros: pedir «completely unbranded, no brand names» y **revisar al zoom** (se coló «Blackmagic»).
- Casting latinoamericano, caras no-modelo, edades variadas. Para **publicar**, preferir equipo real como base;
  la IA explora espacios, objetos y 3D [criterio del revisor adversarial].

## 9. Variedad de industrias (sesgo corregido)

**NUNCA anclar la serie en la categoría de un cliente real** ni insinuar trabajo con un cliente: demasiada pintura
se leyó como Berel («nosotros NO somos Berel»). Variar: café, bebidas, panadería, retail, finanzas, gastronomía,
eventos. Tampoco repetir el mismo objeto de acento ni el mismo panel azul de fondo entre piezas.

## 10. Pantallas: curación generativa, nunca UI pegada

Las composiciones deterministas sólo sirven **como referencia** para curar con IA. Método: plate con la pantalla en
**chroma verde puro `#00FF00`** («entirely inside the frame, no reflections») → UI de referencia determinística →
edición con plate + UI + **máscara** pidiendo glare, reflejo, perspectiva y oclusión → **restaurar** fuera de la
pantalla desde el plate original. La máscara no preserva píxeles: verificar identidad al zoom. Receta técnica
(máscara de un canal, gotchas): [greenhouse-ai-image-generator](../../greenhouse-ai-image-generator/SKILL.md#fotografía-de-marca-propia-efeonce).

## 11. Personas: Julio y Nexa

- Motor **`gpt-image-2.5-sunburst`** `--quality high` 1152×1440, referencias con rol («Images 1-3 are Julio
  (identity only; ignore their clothing and backgrounds)») + bloque **IDENTITY** con rasgos.
- Referencias: Julio `ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-01.png`, `-04.png`, `-07.png`;
  Nexa `ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-cuerpo-completo-v2.png`, `nexa-the-point.png`,
  `nexa-the-listen.png`. Identidad sostenida en 5 tomas (135/24/200/50/200 mm).
- Uniforme: kit del polo como Images 4-5; **revisar el emblema letra por letra** antes de publicar.
- Detalle: [personas, identidad y vestuario](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md).

## 12. Flujo de producción (resumen)

Ficha de toma (servicio/oficio, industria no-cliente, mercado, cámara/lente/ángulo, luz y hora, momento, acento y su
origen, lecho + tono, formato) → prompt = bloque realismo + bloque impacto + color/WB + escena + `FOREGROUND` →
`gpt-image-2.5-flare` `high` para explorar (Sunburst si hay identidad o edición; `xhigh` sólo masters) → hoja de
contacto → medir lecho → regenerar si falla → curar pantallas → componer firma (`LOGO=0.20`) → métricas → QA al zoom.
Costo observado ≈ USD 0,05 por imagen high 1152×1440 (xhigh ≈ 0,09). Bloques de prompt y scripts:
[bloques y pipeline](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

## 13. Checklist QA (antes de mostrar o entregar)

- [ ] Pasa la barra (§2): sustitución, obra, mecanismo, idea, 3 modos, 390 px, verdad operativa.
- [ ] Industria no-cliente y sin objeto de acento repetido en la serie.
- [ ] Azul y un solo acento (naranja o lima) integrados en la composición, nacidos de la situación; juzgar visualmente
      su función y naturalidad antes de interpretar los porcentajes medidos.
- [ ] Sin grade; WB neutro-cálido; sombras no azules; quemado y aplastado dentro de rango.
- [ ] Lecho planeado, tono declarado, p99 ≤ ~20 y transición gradual; o excepción sin firma justificada.
- [ ] Logo SVG oficial al 20%, centrado, contraste ≥ 4,5:1 medido; una sola marca protagonista.
- [ ] Sin texto ni marcas de terceros al zoom; pantallas curadas, sin fantasmas de máscara.
- [ ] Identidad (Julio/Nexa) y emblema verificados al zoom; nadie mira a cámara sin decisión.
- [ ] No se siente IA. Si hay duda, se regenera; no se parcha con grade.

## 14. Documentación canónica y evidencia

- [Índice de fotografía de marca](../../../../docs/operations/brand-photography/README.md)
- [Lenguaje fotográfico V1 (maestro)](../../../../docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md)
- [Firma y primer plano](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) ·
  [Colorimetría](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md) ·
  [Cámaras y ángulos](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) ·
  [Bloques y pipeline](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) ·
  [Personas y vestuario](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md)
- [Bitácora del método](../../../../docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md) ·
  [Manual de uso](../../../../docs/manual-de-uso/marketing/fotografia-de-marca-efeonce.md)
- Corrida: `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/` (rondas, prompts, scripts `medir.mjs`,
  `metricas.cjs`, `componer.mjs`). OneDrive: `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/`.

**Pendientes:** espacio para texto (pedido del operador, no trabajado), formatos 9:16 y 16:9, firma en tomas
todo-enfocadas, scripts como comando `pnpm`, prueba de reconocimiento, masters `xhigh` con equipo real.

## Los TRES comandos canónicos (2026-09-20)

- **`pnpm foto:doctor`** — ¿esta máquina puede generar? Ejercita la cadena entera (bloques, sharp, ADC, secreto,
  clave aceptada por OpenAI vía `/v1/models`, **sin costo**). La clave nunca se imprime. Sale 1 si algo bloquea.


- **`pnpm foto:prompt <ficha.json> [--batch <out.json>]`** — arma el prompt desde una ficha de toma. El formato,
  el porcentaje del lecho y el límite de sujetos salen de **una tabla**, no de un bloque copiado. La ficha declara
  además `identidad` (personas, con vista por ángulo), `objetos` (kits de marca: logo, mascota, prenda, merch),
  `atmosfera` (`polvo`/`bruma`/`vapor`/`humo`) y `suspendido` (qué está en el aire). Aborta si un
  bloque compartido trae un valor de formato adentro, si se pide una reserva en una toma que no la admite, o si un
  batch mezcla formatos. `--ficha-ejemplo` imprime la plantilla.
- **`pnpm foto:validar <plate.png> [--zona-texto] [--objeto x0,y0,x1,y1]`** — valida las seis reservas sobre el
  plate limpio y sale con código 1 si alguna **evaluada** falla. Las coordenadas van en fracciones, no en píxeles.

**NUNCA armes un prompt de foto de marca concatenando bloques a mano.** Esa es la vía por la que «Vertical 4:5.»
vivió dentro del bloque de realismo sin que nadie lo viera, y habría contaminado todo plate no-4:5.

## La regla de la luz y la reserva **[medido 2026-09-20]**

> **La luz con carácter va sobre el SUJETO; la reserva vive en la sombra pareja que esa luz deja, nunca en su
> camino.**

El canon ya la practicaba sin tenerla escrita. En la pieza aprobada, la luz dura entra por la ventana y cae sobre
el panadero; el titular vive en la sombra pareja del muro. Al pedir la sombra gráfica **sobre el muro que era la
reserva**, el contraste cayó de 82 a 77 y la zona de texto de 0,24 a 0,22: «campo parejo» y «luz dura» sobre la
**misma** superficie es una contradicción, y el modelo la resuelve **aplanando la escena entera**.

**NUNCA** pongas el dibujo de luz sobre la superficie que aloja la reserva. Escribe la luz en la escena —sube el
contraste de verdad— pero sobre el sujeto.

## Tres guardas nuevas del 2026-09-20 (por qué se perdió calidad)

Una tanda de 34 planchas salió **sin dirección fotográfica**: el armador de esa sesión nunca incluyó el bloque de
impacto. Medido sobre sus escenas contra la ronda que el operador aprobó: luz 64% vs **100%**, momento 26% vs
**100%**, y **planos de profundidad 0% vs 40%**. La planitud viene de ahí — el bloque de impacto es el que pide
«THREE distinct depth planes» y «rich but detailed darks, never flat, never evenly lit».

- **Tope de tanda:** más de **6 fichas** exige que cada una declare `piloto: "<ruta a un plate ya generado>"` que
  exista en disco. **La calidad nunca vino de un prompt mejor: vino de generar poco y MIRAR cada plate.** Con 34 de
  una sola vez nadie mira ninguna; se mira una hoja de contacto, que es donde una cara de stock o un fondo plano
  pasan desapercibidos.
- **Anclas de categoría de cliente:** hoy **pintura**. **[decisión del operador]** «nosotros NO somos Berel». La
  regla estaba escrita desde el 19/09 y una sesión generó igual un macro de un rodillo aplicando pintura azul.
  **Un doc no impide nada; un comando que aborta, sí.** Se amplía sólo con lo que el operador declare.
- **Avisos que no bloquean:** escena sin **fuente de luz** o sin **momento**. El aviso automático que cuestionaba
  paneles, pantallas y otras áreas azules se retiró: también hay campos azules naturales en las fotos aprobadas.
  La revisión visual decide si el color tiene razón de estar en la composición o si parece una pieza añadida.

El comando además imprime, antes de cada batch, la ruta de **las piezas aprobadas**: son el estándar y ninguna
sesión las tenía delante al armar.

## Lo que se corrigió el 2026-09-20 (leer antes de citar un número)

- **El tono nunca fue el problema; la materia lo es** **[decisión del operador]**. Una reserva **oscura está
  perfecta** cuando la superficie oscura **existe y tiene nombre**. Lo prohibido es la reserva **sin materia**, en
  cualquier tono: un prompt que pide un tono sin decir de qué está hecha la cosa obliga al modelo a inventar el
  objeto, y lo que inventa es un panel liso flotando — la «losa» que el operador rechazó por «extremadamente
  forzado». **NUNCA** decidas el tono por regla global («todo oscuro», «todo claro»): lo decide la escena.
- **Ninguna métrica de píxel detecta la losa.** Planitud, dureza de canto y calma en L\* fallan las tres; la versión
  buena tenía el canto **el doble de duro** que la rechazada. La diferencia es **semántica**. El detector está en la
  **entrada**: `pnpm foto:prompt` aborta si la materia falta o es genérica.
- **La calma se mide en L\*, no en luminancia lineal** **[medido]**. En Y la misma textura salta ~15× más arriba de
  la escala, así que el umbral **premiaba la oscuridad**: la losa pasaba con 12× de margen y un muro pálido liso
  reprobaba. `CALMA_MAX = 0.5`, de medir los dos extremos (pasa 0,18–0,29; reprueba 0,89–2,44).
- **El chequeo del lecho es señal débil** **[frágil]**. Ni Y ni L\* miden desenfoque de forma confiable; la prueba
  real del lecho sigue siendo **mirar el plate**. Medirlo bien está **[pendiente]**.
- **Retirada la regla del lecho de §3.8.3** **[refutado]**: decía, como medida, que el lecho falla sin la frase «so
  close to the lens». El prompt de esa corrida nunca se versionó, todos los prompts que sobreviven la llevan, y las
  franjas miden igual: lo que separaba los números era el **formato**. El comando la emite igual como **precaución
  declarada**; **NUNCA** la cites como evidencia de causa.
- **Lecho por formato** **[medido]**: 4:5 18% · 9:16 22% · 16:9 16% · 1:1 18% *(sin validar)*.
- **Reservas: seis, no cuatro.** Se sumaron «campo profundo al margen» (banda vertical continua ≥ 0,40 del alto;
  el piloto da **0,60**) y «lecho por formato». La caja de selección necesita **padding**: pegada al objeto da
  1,02:1, con 0,02 pasa a 3,29:1 y con 0,04 vuelve a caer. **Hay punto dulce, no monotonía** **[medido]**.

## Espacio para texto y formatos (2026-09-19)

- La zona del titular se pide en la toma con **tono declarado** («DEEP warm shadow… for white text» / «VERY LIGHT warm-white wall… for dark text») y **límite de cabezas** (verticales: bajo 36% del alto; 16:9: gente dentro del 55% derecho).
- Zonas: 4:5 tercio superior; 9:16 franja 11–31% (firma a 0,875); 16:9 costado izquierdo 42%. Firma al 20% del lado corto (decisión posterior del operador).
- Compositor `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/titular.mjs` (Bricolage `ideaImpact` a trazos, color por contraste, autoajuste de zona ≥4,5:1).
- **Canon operativo (aprobado, capa fotográfica):** [reserva de espacio en la toma](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) — las seis reservas, tono declarado, límite de cabezas, formato nativo, nunca scrim, medir antes de componer.
- Bitácora de la ronda (composición **no aprobada**): [zonas de composición y formatos](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md).

## La capa de composición no es sólo texto

Una pieza puede llevar etiqueta (Poppins `structureLabel`), entrada/dominante/cierre (Bricolage `ideaLead`/
`ideaImpact`/`ideaMedium` con `[[acento]]` naranja), tarjeta HUD (Poppins), gesto Guttery (1 por pieza, ≤3 palabras),
**caja de selección AXIS** (`eight-handles` · `four-corners` · `open-brackets`), **cursor solo** (un cursor, sin cursor
local) o **cursores multiplayer**, y la firma. Reservar en la toma: zona de texto con tono, objeto aislado para
enmarcar, zona pareja para HUD y para el gesto. Compositor: `scripts/composicion.mjs` (contraste por capa, autoajuste,
falla con glifos inexistentes como «→» y con gesto bajo 4,5:1). **Lo que la foto debe reservar** para todo esto está
en [reserva de espacio en la toma](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md);
**cómo se compone encima NO está aprobado** y su canon es `efeonce-advertising-creative` (brief + ficha tipográfica + gate).

**Compositor canónico:** `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer-foto.mjs`, adaptación
declarada del compositor del carrusel GTA VI (`2026-09-19_nivel-de-busqueda/componer-v2.mjs`): misma gramática de voces,
`richBlock`, scrims, tarjeta de vidrio, selección AXIS y QA de contraste; adaptado a foto, multiformato, tinta por pieza,
selección sobre objeto y logo automático. **NUNCA** escribir un compositor nuevo para una pieza: se extiende éste.

**NUNCA scrims ni overlays sobre la foto** para ganar contraste (decisión del operador 2026-09-19: «es muy 2010, le
resta limpieza»). El contraste se planifica en la toma con el tono declarado de la zona; si no pasa 4,5:1 se
regenera el plate o se mueve el texto.

**NUNCA** el marcador-estrella naranja junto a la etiqueta: fue puntual del post de GTA VI (marcaba la misión), no del
lenguaje de marca (`labelStar` opt-in, apagado por defecto).

**NUNCA** la tarjeta HUD de vidrio con línea naranja (era del post de GTA VI): el dato va como nota de texto limpio
(Poppins) sobre una zona clara de la foto. **NUNCA** caja de selección si la foto no tiene un objeto aislado que
enmarcar; el objeto se elige en la ficha de toma, no al componer.

**La caja de selección tiene propósito:** enmarca un objeto con sentido (la obra en revisión, el resultado aprobado)
o una palabra del titular para énfasis. Nunca sobre vacío, nunca sobre una persona, y si la foto no tiene ese objeto,
no va selección. El objeto se decide en la ficha de toma.

**Craft tipográfico (no negociable):** Bricolage es la **única** voz expresiva (sólo el dominante); etiqueta,
entrada, cierre y notas van en **Poppins** (`structureLabel` en mayúsculas +0,08 em; `structureCopy` leading 1,5).
El aire entre tramos se mide como **gap de tinta** ≈ **0,09 del tamaño del dominante** (0,10 tras la etiqueta), no
como leading; `componer-foto.mjs` lo reporta en `qa.json`.

> **Estado:** la **fotografía** de este lenguaje está aprobada (2026-09-19). La **capa de composición gráfica**
> (titulares, jerarquía, cursores sobre la foto) **NO**: las piezas de prueba fueron rechazadas por el operador.
> Valen las prohibiciones y las reglas de craft de arriba; para componer una pieza real, partir del brief y la
> ficha tipográfica de `efeonce-advertising-creative` y del compositor de «Nivel de búsqueda», y someterla a
> revisión humana: un contraste que pasa NO prueba que la composición esté bien.
