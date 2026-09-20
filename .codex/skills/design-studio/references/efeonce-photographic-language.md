# Lenguaje fotográfico de Efeonce — guía operativa para dirigir

Cargar cuando el trabajo sea **fotografía o imagen fotorrealista de la marca propia Efeonce** (redes, web,
KV, piezas de equipo, espacios, objetos o 3D en escena). No aplica a clientes: cada cliente tiene su lenguaje.
Aprobado por el operador (Julio Reyes) el **2026-09-19** («todas me gustaron»). Esta guía condensa lo operativo;
el contrato completo, las mediciones y los prompts verbatim viven en la documentación canónica (§14).

> **Estado honesto.** Es un **sistema consistente aprobado**, **no un activo distintivo medido**. Falta la prueba
> de reconocimiento (n≥100, distractores coherentes, antes/después). NUNCA afirmar que «se reconoce como Efeonce».

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
  determinísticamente, **centrado horizontal**, centro vertical ≈ **93,5%** del alto en 4:5, **ancho 15%** del lienzo
  (20% se leía como sello o marca de agua). Color por contraste medido: blanco contra el píxel más claro del área,
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
| Azul activo `#0375DB` | **La casa**, en todas | luz u objeto; acento 3–10% o **campo protagonista** (set azul, pantalla gigante) |
| Naranja `#F55D01` | **La idea**, momento creativo | dentro de la obra: manga, luz REC, lápiz graso, bolsa de arena |
| Lima `#6EC207` | **El resultado** | tarjeta «Ganado», cursor Cliente que aprueba, check |

- **Un solo acento** (naranja o lima) por pieza además del azul, **1–5% del cuadro**, nacido de la situación.
  Utilería puesta (jarrón o libro naranja) se lee falsa; la taza azul repetida en 3–4 piezas fue sesgo.
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
contacto → medir lecho → regenerar si falla → curar pantallas → componer firma (`LOGO=0.15`) → métricas → QA al zoom.
Costo observado ≈ USD 0,05 por imagen high 1152×1440 (xhigh ≈ 0,09). Bloques de prompt y scripts:
[bloques y pipeline](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

## 13. Checklist QA (antes de mostrar o entregar)

- [ ] Pasa la barra (§2): sustitución, obra, mecanismo, idea, 3 modos, 390 px, verdad operativa.
- [ ] Industria no-cliente y sin objeto de acento repetido en la serie.
- [ ] Azul presente como luz u objeto; un solo acento (naranja o lima) de 1–5%, nacido de la situación.
- [ ] Sin grade; WB neutro-cálido; sombras no azules; quemado y aplastado dentro de rango.
- [ ] Lecho planeado, tono declarado, p99 ≤ ~20 y transición gradual; o excepción sin firma justificada.
- [ ] Logo SVG oficial al 15%, centrado, contraste ≥ 4,5:1 medido; una sola marca protagonista.
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

## Los dos comandos canónicos (2026-09-20)

- **`pnpm foto:prompt <ficha.json> [--batch <out.json>]`** — arma el prompt desde una ficha de toma. El formato,
  el porcentaje del lecho y el límite de sujetos salen de **una tabla**, no de un bloque copiado. Aborta si un
  bloque compartido trae un valor de formato adentro, si se pide una reserva en una toma que no la admite, o si un
  batch mezcla formatos. `--ficha-ejemplo` imprime la plantilla.
- **`pnpm foto:validar <plate.png> [--zona-texto] [--objeto x0,y0,x1,y1]`** — valida las seis reservas sobre el
  plate limpio y sale con código 1 si alguna **evaluada** falla. Las coordenadas van en fracciones, no en píxeles.

**NUNCA armes un prompt de foto de marca concatenando bloques a mano.** Esa es la vía por la que «Vertical 4:5.»
vivió dentro del bloque de realismo sin que nadie lo viera, y habría contaminado todo plate no-4:5.

## Espacio para texto y formatos (2026-09-19)

- La zona del titular se pide en la toma con **tono declarado** («DEEP warm shadow… for white text» / «VERY LIGHT warm-white wall… for dark text») y **límite de cabezas** (verticales: bajo 36% del alto; 16:9: gente dentro del 55% derecho).
- Zonas: 4:5 tercio superior; 9:16 franja 11–31% (firma a 0,875); 16:9 costado izquierdo 42%. Firma al 15% del lado corto.
- Compositor `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/titular.mjs` (Bricolage `ideaImpact` a trazos, color por contraste, autoajuste de zona ≥4,5:1).
- **Canon operativo (aprobado, capa fotográfica):** [reserva de espacio en la toma](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) — las cuatro reservas, tono declarado, límite de cabezas, formato nativo, nunca scrim, medir antes de componer.
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
