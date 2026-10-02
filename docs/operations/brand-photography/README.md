# Fotografía de marca Efeonce — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.10
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-10-02 por Claude (1.10: el registro cine se opera sin consultor — casebook, `foto:cine:nueva`, `foto:validar:cine`, agente `cine-reviewer` y manual, [delta 2026-10-02 (b)](#delta-2026-10-02-b--el-registro-cine-se-opera-sin-consultor). 1.9: el traje biónico y los lentes biónicos de Nexa tienen kit y se piden por catálogo, sólo Nexa y sólo cine; las referencias de identidad dicen quién es, no cómo está, y las 12 expresiones fotográficas de Nexa entran al catálogo; la escena cine `NX7d` queda como referencia, [delta 2026-10-02](#delta-2026-10-02--traje-biónico-de-nexa-pose-y-expresiones). Antes, el 2026-09-28: portada de Creative Services con plate propio `CR4` y el caso de cambiar el plate de una pieza aprobada sin perder su concepto, [registro cine §16.7](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#167-cr4-el-squad-te-la-entrega-cambiar-el-plate-de-una-pieza-aprobada-sin-perder-su-concepto); antes, el 2026-09-27: excepción del registro cine para las láminas de sección y «about» del deck, [delta (c)](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-09-27-c--excepción-para-secciones-y-láminas-about-del-deck); antes, el mismo día: plates para portada y contraportada del registro cine, [§16](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#16-plates-para-portada-y-contraportada-aprobado-2026-09-27); antes, el mismo día: el registro cine tiene documento propio, [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](./EFEONCE_PHOTO_REGISTER_CINE_V1.md); antes, el 2026-09-26: la capa gráfica sobre la foto queda aprobada; guía «El porqué» en AXIS; antes, el mismo día: convergencia con la línea gráfica, la lente como reserva del texto, P1–P12 y P-1..P-9; antes: regla de la firma, órbita sobre la foto y marca fotografiada desde el arte plano)
> **Documentación relacionada:** [Lenguaje fotográfico V1](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Bitácora del caso](../social/2026-09-19-efeonce-photographic-language-production-method.md) · [Corrida de evidencia](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md)

Esta carpeta guarda el **Lenguaje Fotográfico de la marca propia de Efeonce**, aprobado por el operador (Julio
Reyes) el 2026-09-19 («todas me gustaron»). Aplica a fotografía e imagen fotorrealista de Efeonce. No aplica a
piezas de clientes ni a trendjacking que toma prestada una estética ajena.

Estado: **sistema aprobado y consistente, no activo distintivo medido**. La [auditoría ciega del 2026-09-20](./EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md) confirmó la consistencia desde fuera —dos evaluadores lo
reconocieron como un mismo autor— y encontró que **todavía no logra credibilidad**: ninguna pieza muestra
trabajo entregado. Su plan es la hoja de ruta vigente. Llamarlo activo distintivo exige antes la
prueba de reconocimiento descrita en los pendientes del documento maestro.

## Comandos de producción (empieza por acá)

```bash
pnpm foto:doctor                         # comprueba la cadena local sin generar ni gastar
pnpm foto:prompt --ficha-ejemplo          # plantilla de ficha de toma
pnpm foto:prompt <ficha.json> --batch <out.json>   # arma el prompt; el formato sale de UNA tabla
pnpm foto:validar <plate.png>             # valida las seis reservas sobre el plate limpio
pnpm foto:cine:nueva --listar             # registro cine: recetas aprobadas desde donde partir
pnpm foto:cine:nueva --desde <id> --id <nuevo> --dir <carpeta>   # ficha cine nueva copiada de una aprobada
pnpm foto:validar:cine <plate.png>        # registro cine: sombra y, en vertical, techo oscuro (aparte de foto:validar)
pnpm foto:componer <piezas.json>          # pieza SIN CTA; compositor general de voz/firma
pnpm foto:componer:cta <plan.json>        # pieza CON CTA: compone y emite su QA con huellas (out/qa-<plan>.json)
pnpm foto:cta:gate <plan.json>            # la certifica: sólo la salida 0 certifica; 3 = no certificable, no es pase
pnpm foto:lanyard --nombre "<N>" --cargo "<C>" --foto <r.png>   # arma el lanyard PIEZA POR PIEZA
```

**Dos categorías de pieza** **[operador, 2026-09-20]**: la **muda** —sólo foto y firma— es legítima y sirve de
**descanso visual** para relajar el feed; la **con voz** lleva la capa y **reserva su espacio en la toma**.
El prototipo gráfico rechazado el 2026-09-19 no es la receta vigente. El sistema publicitario
[Tres voces + acción](../EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) se aprobó el 2026-09-22 y la pieza con CTA
usa `foto:componer:cta` + `foto:cta:gate`; cada salida necesita revisión humana y la pauta autorización separada.

`foto:prompt` existe porque dos veces se coló un valor de un formato dentro de un bloque compartido
(«Vertical 4:5.», «bottom 18%») y ninguna se vio hasta medir. `foto:validar` es el arnés de reservas, promovido
desde una carpeta de corrida el 2026-09-20 porque una herramienta dentro de una carpeta fechada no la encuentra
nadie. Detalle en [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) §4.2 y §5.

## Documentos

| # | Documento | Qué resuelve | Autor |
|---|---|---|---|
| 1 | [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) | Documento maestro: alcance, origen en el posicionamiento, la idea «El oficio a la vista», principios, qué no es Efeonce, historia de decisiones y pendientes | Claude |
| 2 | [`EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md`](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) | La firma: primer plano desenfocado planeado desde la toma, catálogo de lechos, reglas medibles, logo, **burbuja URL sólo con el logo ya en la imagen** (§5.1, 2026-09-26) y selección colaborativa AXIS | Claude |
| 3 | [`EFEONCE_PHOTO_COLORIMETRY_V1.md`](./EFEONCE_PHOTO_COLORIMETRY_V1.md) | Colorimetría: roles de color (azul, naranja, lima), balance de blancos, métricas Lab y rangos objetivo | Otro agente |
| 4 | [`EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md`](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) | Catálogo de cámaras, lentes y ángulos probados, con su uso, su lecho y lo medido | Otro agente |
| 5 | [`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) | Bloques de prompt (realismo, impacto, FOREGROUND), ficha de toma y pipeline de producción con scripts | Otro agente |
| 6 | [`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) | Personas: casting, gesto, mirada, piel; Julio y Nexa (referencias, identidad, QA); uniforme | Claude |
| 7 | [`EFEONCE_PHOTO_LEVERS_CATALOG_V1.md`](./EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) | **Catálogo de palancas**: el índice de las **34 en cuatro familias** (5 siempre activas · 4 atmósferas · 1 acción suspendida · 24 de encuadre), qué campo pide cada una y cuántas admite una pieza; ficha completa de las 24 de encuadre; las 20 tomas de cámara nombradas; las cinco descartadas con su razón medida | Claude |
| 8 | [`EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md`](./EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md) | **Auditoría ciega**: dos evaluadores independientes sin acceso al canon; qué coincidió, los tells de generación, el plan derivado y la ronda «obra real» | Claude |
| 9 | [`NEXA_CHARACTER_BIBLE_FICHA_V1.md`](./NEXA_CHARACTER_BIBLE_FICHA_V1.md) | **Nexa, el Bible aplicado a producción**: qué referencia del repo corresponde a cada nombre del documento de marca (las 8 expresiones, los 5 contextos), la auditoría medida de qué cumple el material, el veredicto A/B contra la ficha y lo que queda abierto | Claude |
| 10 | [`NEXA_TECH_PROPS_V1.md`](./NEXA_TECH_PROPS_V1.md) | **Nexa, props y ecosistema tecnológico**: qué dispositivos lleva y usa —smartwatch, iPhone, iPad, MacBook, DJI, Rode, Shure, Sony/Canon—, cómo entran en la escena y qué NO es Nexa. La regla es la familia vigente, nunca un modelo descontinuado | Claude |
| 11 | [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](./EFEONCE_PHOTO_REGISTER_CINE_V1.md) | **Registro cine · la marca en su película**: cuándo se usa (Nexa protagonista, la receta de deck `proposal-cinematic` y, por excepción aprobada el 2026-09-27, las láminas de sección y «about» del deck), la idea (el servicio en acción, la línea como luz), cámara a ≈ 2 m y 85 mm, luz y bruma, color por línea desde tokens, vestuario y emblema compuesto, mini robots agentes, reservas y capa gráfica, plantilla de ficha comentada, trampas medidas, barra de juicio, evidencia y formatos publicitarios en prueba; **plates para portada y contraportada** de brochure y propuesta, aprobados el 2026-09-27 ([§16](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#16-plates-para-portada-y-contraportada-aprobado-2026-09-27): receta de toma, plates por uso, ficha `LN4` y la regla de que el texto nunca cruza; desde el 2026-09-28, la portada de Creative Services con su plate propio `CR4` y cómo cambiar el plate de una pieza aprobada sin perder su concepto, [§16.7](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#167-cr4-el-squad-te-la-entrega-cambiar-el-plate-de-una-pieza-aprobada-sin-perder-su-concepto)) | Claude |
| 12 | [`EFEONCE_TEAM_ROSTER_V1.md`](./EFEONCE_TEAM_ROSTER_V1.md) | **El equipo en la fotografía de marca**: quién del equipo actual puede aparecer con su identidad real, de qué foto sale y con qué ropa (la de la línea de la pieza: hoodie en Servicios creativos, bomber o softshell en las líneas de negocio; `foto:prompt` lo exige); decisiones del operador del 2026-09-29 | Claude |
| 13 | [`EFEONCE_PHOTO_CINE_CASEBOOK_V1.md`](./EFEONCE_PHOTO_CINE_CASEBOOK_V1.md) | **Registro cine · el casebook**: cómo se llega a una foto cine aprobable sin consultar a nadie — flujo en seis pasos, campos cine de la ficha, 13 fallas con síntoma, causa, corrección, caso y chequeo, fotos aprobadas desde donde partir, el medidor y sus límites, dos pruebas ciegas y las decisiones del operador. Guía operativa: el canon sigue siendo el documento 11 | Claude |

## Registros y evidencia

| Recurso | Ruta | Qué contiene |
|---|---|---|
| Character Bible de Nexa | [`docs/operations/social/NEXA_CHARACTER_BIBLE_V1.md`](../social/NEXA_CHARACTER_BIBLE_V1.md) | El documento de marca completo y legible: valores, voz, retrato físico, audio, wardrobe, expresiones, lenguaje corporal, entornos, iluminación, composiciones, backstory, transparencia y reglas de interacción. Original en OneDrive |
| Método de producción de ADS | [`social/2026-09-21-ads-brand-visibility-production-method.md`](../social/2026-09-21-ads-brand-visibility-production-method.md) | La capa gráfica **por formato** (4:5 · 9:16 · 16:9) con sus valores medidos, las cuatro voces, las seis trampas y la receta copiable |
| Bitácora del caso | [`docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md`](../social/2026-09-19-efeonce-photographic-language-production-method.md) | Ronda por ronda: qué se probó, qué resultó, qué decidió el operador, qué se aprendió, fallos con números |
| Corrida de evidencia | [`ai-generations/2026-09-19_lenguaje-fotografico-efeonce/`](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md) | Prompts verbatim por ronda (`batch*.json`, `*.txt`), bloques de prompt, scripts de medición y composición. Las imágenes son locales (gitignoreadas) |
| Entrega en OneDrive | `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/` | Carpeta de entrega de la versión 1 para el equipo |
| Banco de la lente (línea gráfica) | [`ai-generations/2026-09-25_banco-lente-orbita/`](../../../ai-generations/2026-09-25_banco-lente-orbita/LEEME.md) | Consumidor del lenguaje: 8 tomas documentales para la lente de [«La órbita»](../brand-graphic-line/README.md), hechas con `pnpm foto:generar`, sin emblema legible; reemplazaron a tres fotos repetidas. Plates locales |
| Manual de uso | [`docs/manual-de-uso/marketing/fotografia-de-marca-efeonce.md`](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md) | Paso a paso para producir una foto de marca (lo escribe otro agente) |
| Manual del registro cine | [`docs/manual-de-uso/creative/producir-foto-cine-de-marca.md`](../../manual-de-uso/creative/producir-foto-cine-de-marca.md) | Paso a paso para producir una foto cine: partir de una receta, completar la ficha, revisar, generar y medir |
| Recetas cine aprobadas | [`scripts/foto/cine-recetas.json`](../../../scripts/foto/cine-recetas.json) | Las 12 fotos cine aprobadas con su ficha, plate, formato, alcance, por qué funciona y advertencias; lo lee `foto:cine:nueva`. Todavía no hay ninguna cine vertical aprobada |
| Revisor del registro cine | [`.claude/agents/cine-reviewer.md`](../../../.claude/agents/cine-reviewer.md) | Agente de Claude Code que revisa la ficha y su prompt antes de gastar, y el plate después; veredicto APROBABLE / CORREGIR / FUERA DE ALCANCE con la frase a cambiar. Codex aplica la rúbrica leyendo el archivo |
| Pruebas ciegas del registro cine | `ai-generations/2026-10-02_prueba-ciega-cine/`, `ai-generations/2026-10-02_prueba-ciega-cine-2/`, `ai-generations/2026-10-02_experimento-luz-cine/` | Las dos rondas de sesiones nuevas sin consultor y el experimento de luz; lectura en el [casebook](./EFEONCE_PHOTO_CINE_CASEBOOK_V1.md#prueba-ciega-del-2026-10-02--lo-que-aprendimos) |
| Kit del traje biónico de Nexa | [`ai-generations/2026-10-01_traje-bionico-nexa/`](../../../ai-generations/2026-10-01_traje-bionico-nexa/LEEME.md) | El traje y los lentes biónicos como objeto (TASK-1940): 10 vistas en `final/` (fuera de git, selladas en el lock y publicadas en el canon), manifiesto con `cuando_usarla` y la técnica de cada marca, fichas y plates de la escena `NX7`–`NX7g`. Sólo Nexa, sólo registro cine. Manual: [usar el traje biónico de Nexa en fotos](../../manual-de-uso/creative/usar-traje-bionico-de-nexa-en-fotos.md) |
| Expresiones fotográficas de Nexa | [`ai-generations/_identidad-nexa/5-expresiones/`](../../../ai-generations/_identidad-nexa/LEEME.md) | Las 12 expresiones de rostro con el acabado de las anclas, pedidas con `expresion` desde el 2026-10-02. Todas comparten el mismo tres cuartos: aportan sólo el gesto |

## Orden de lectura recomendado

| Perfil | Orden |
|---|---|
| Quien decide o revisa la marca | 1 → 2 → bitácora |
| Quien produce una foto con IA | Manual → 5 → **7** → 2 → 3 → 4 → 6 |
| Quien produce una foto con personas reales o con Julio/Nexa | 6 → 2 → 4 → **7** |
| Quien produce una pieza **con Nexa** | **9** → **10** → 6 → 2 → **7** (con el traje biónico: **11** y el [manual del traje](../../manual-de-uso/creative/usar-traje-bionico-de-nexa-en-fotos.md)) |
| Quien produce una foto en **registro cine** | [Manual cine](../../manual-de-uso/creative/producir-foto-cine-de-marca.md) → **13** → **11** (por sección) → 5 |
| Quien quiere entender por qué es así | Bitácora → 1 |

## Dónde viven los archivos de `ai-generations/`

Las rutas `ai-generations/...` de este documento son **rutas lógicas**: el binario puede estar en disco, en el canon (`gs://efeonce-creative-canon`) o en el archivo (`gs://efeonce-group-greenhouse-private-assets-prod`, inventario en su `artifacts.remote.json`). Si falta en disco, `pnpm ai-gen:where <ruta>` y `pnpm ai-gen:pull <carpeta>` antes de componer; nunca regenerar, sustituir ni resellar el lock para tapar el faltante. Contrato: [`AI_GENERATIONS_STORAGE_V1.md`](../AI_GENERATIONS_STORAGE_V1.md).

## Reglas de la carpeta

- El documento maestro manda sobre los demás en alcance y principios; cada documento temático manda en su tema.
- Los números vienen de mediciones hechas en la corrida del 2026-09-19. Se marcan como **[medido]**; las decisiones
  del operador como **[decisión del operador]**; las recomendaciones propias como **[criterio]**; lo no resuelto como
  **[pendiente]**.
- Una regla nueva entra con su evidencia (ruta de la pieza y medición), no de memoria.

## Piloto de reservas nuevas — 2026-09-20 **[medido]**

Tres plates que prueban los bloques `SELECTION TARGET` (§3.8.1) y `MARGIN FIELD` (§3.8.2). **Son la referencia
vigente** para pedirle a la IA una foto que después aloje una caja de selección o una cita al margen.

| Dónde | Qué hay |
|---|---|
| Repo (índice + medición) | [`ai-generations/2026-09-20_piloto-reservas/README.md`](../../../ai-generations/2026-09-20_piloto-reservas/README.md) |
| Repo (prompts verbatim) | `ai-generations/2026-09-20_piloto-reservas/rondas/p1/batch-{45,169}.json` |
| **OneDrive (imágenes)** | `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/referencias/11-piloto-reservas-2026-09-20/` |

Las imágenes del repo están gitignoreadas: **la copia compartible es la de OneDrive**, con su `LEEME.md` al lado.

Resultados: `MARGIN FIELD` pasa en 4:5 y en 16:9 nativo con **banda continua hasta 0,60 del alto** (el caso
aprobado «¿Claude o Codex?» llegaba a 0,35). `SELECTION TARGET` sirve **con padding de 0,02 del lienzo** (3,29:1);
pegado al objeto falla (1,02:1) porque el objeto trae su propio borde claro, y con 0,04 vuelve a fallar porque la
caja toca a las personas. Hay punto dulce, no monotonía.

## Delta 2026-10-02 (b) — el registro cine se opera sin consultor

**[medido, TASK-1926]** Ninguna sesión llegaba sola a una foto cine aprobable: todas consultaban a la sesión de la
línea gráfica, por las mismas diez fallas. Lo construido actúa **sólo** con `"registro": "cine"` en la ficha; los demás
registros compilan idéntico (0 fichas no cine cambiadas en toda la iniciativa).

- **[Casebook](./EFEONCE_PHOTO_CINE_CASEBOOK_V1.md)** (documento 13): la guía operativa. El canon sigue siendo el
  [registro cine](./EFEONCE_PHOTO_REGISTER_CINE_V1.md), ahora en 1.9 con las siete decisiones del operador tras la prueba
  ciega ([delta 2026-10-02 (b)](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02-b--decisiones-del-operador-tras-la-prueba-ciega)).
- **`foto:prompt` en cine**: compila los campos cine de la ficha en el bloque `CINEMATIC CRAFT`, reemplaza las frases
  documentales de los bloques compartidos (`AJUSTES_CINE`) y avisa lo que falta. Detalle en
  [prompts y pipeline, delta 2026-10-02 (b)](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#delta-2026-10-02-b--el-registro-cine-en-fotoprompt).
- **`pnpm foto:cine:nueva`** parte de una de las 12 recetas aprobadas; **`pnpm foto:validar:cine`** mide sombra y techo
  oscuro, sin cambiar `foto:validar`; el agente **`cine-reviewer`** revisa la ficha antes de gastar y el plate después
  (APROBABLE no es aprobado).
- Paso a paso: [manual del registro cine](../../manual-de-uso/creative/producir-foto-cine-de-marca.md). En AXIS, la
  sección «Registro cine» del [banco fotográfico](https://axis.efeonce.org/references/photography/) muestra las 10
  primeras fotos con su receta.
- **[pendiente]** El veredicto del operador sobre los plates de la segunda prueba ciega y el orquestador idempotente
  `pnpm foto:cine` (resto de TASK-1926).

## Delta 2026-10-02 — traje biónico de Nexa, pose y expresiones

- 🔴 **El traje biónico y los lentes biónicos de Nexa son objetos del catálogo** **[decisión del operador,
  2026-10-01/02, TASK-1940]**. Nunca se vuelven a describir en la escena: se declaran en `objetos`
  (`traje-bionico-nexa`, `lentes-bionicos-nexa`) con `"registro": "cine"` explícito, y `foto:prompt` aborta si la
  ficha los pide para otra persona, sin Nexa o fuera del cine (`validarTrajeNexa`). Las marcas **viajan armadas en la
  referencia**: el isotipo incrustado en la pechera y el logo completo «efeonce» serigrafiado en la placa dorsal. Kit:
  [`ai-generations/2026-10-01_traje-bionico-nexa/`](../../../ai-generations/2026-10-01_traje-bionico-nexa/LEEME.md);
  paso a paso: [manual del traje](../../manual-de-uso/creative/usar-traje-bionico-de-nexa-en-fotos.md); vestuario:
  [personas, delta 2026-10-02](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md#delta-2026-10-02--el-traje-biónico-y-los-lentes-biónicos-de-nexa-por-catálogo).
- **La pose de Nexa sale de la escena, no de la referencia** **[medido, A/B `NX7d`→`NX7g`]**: las referencias de
  identidad dicen quién es, no cómo sostiene la cabeza. La ficha pide una expresión (`expresion`, 12 fotográficas
  nuevas), un ángulo (`vista`) o **las dos juntas** con Nexa sola en la toma (desde el 2026-10-02, `NX7j`), y
  `foto:prompt` avisa si Nexa llega sin ninguna. Detalle en
  [prompts y pipeline, delta 2026-10-02](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#delta-2026-10-02--las-referencias-dicen-quién-es-no-cómo-está)
  y en la [ficha de Nexa](./NEXA_CHARACTER_BIBLE_FICHA_V1.md#delta-2026-10-02--traje-biónico-12-expresiones-fotográficas-y-la-pose).
- **La escena de referencia con Nexa en el traje es `NX7d`**, «Nexa despliega a su squad» **[decisión del operador,
  2026-10-02]**: dos Sparks con referencia como máximo y el resto lejos y desenfocado. Receta en el
  [registro cine, delta 2026-10-02](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02--nexa-despliega-a-su-squad-qué-hace-cine-una-escena-con-sparks).
  **[pendiente]** su versión con titular (columna de texto 0,38 y lecho 2,98:1, ambos bajo el umbral).

## Delta 2026-09-27 (c) — excepción del registro cine para secciones y «about» del deck

**[decisión del operador, 2026-09-27]** Al aprobar las 69 láminas del deck, el operador aprobó las fotos de las
**secciones partidas** y de **«Quiénes somos» / «Por qué lo hacemos»** con personas en luz dramática de cine. Quedan
como **excepción aprobada** del registro cine **sólo para láminas de sección y «about» del deck**; no amplían el cine
a social, web, publicidad ni contenido. Plates, guardas y pendientes (el contrato AXIS todavía no la conoce; los plates
de «about» se regeneran sin el degradado lateral) en el
[registro cine, delta (c)](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-09-27-c--excepción-para-secciones-y-láminas-about-del-deck).
La receta de cada lámina, con su ficha, prompt y post-proceso, vive en el
[catálogo de recetas del deck](../brand-graphic-line/deck-recipes/README.md).

## Delta 2026-09-27 (b) — plates para portada y contraportada

**[decisión del operador, 2026-09-27]** El operador aprobó portadas y contraportadas de brochure y propuesta hechas
sobre plates del registro cine. La receta de toma (sujeto en la mitad derecha, cintura arriba, 85 mm a ≈ 2 m, mirando
al lente; 45 % izquierdo oscuro y calmo; luz de acento de la línea), la tabla de plates por uso, la ficha nueva `LN4` y
la regla de que ninguna palabra cruza al sujeto, un haz, una mano o la órbita están en
[registro cine §16](./EFEONCE_PHOTO_REGISTER_CINE_V1.md#16-plates-para-portada-y-contraportada-aprobado-2026-09-27). La
reserva de la columna de voz, medida, quedó en la [reserva de espacio en la toma](./EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md)
(delta 2026-09-27); la composición, en [superficie §4.6](../brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck).

## Delta 2026-09-27 — el registro cine tiene documento propio

**[decisión del operador, 2026-09-27]** «El registro cinematográfico me encantó»: el registro cine deja de vivir sólo
en dos deltas del maestro y pasa a [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](./EFEONCE_PHOTO_REGISTER_CINE_V1.md), que es
desde hoy su fuente vigente. Alcance sin cambios: **Nexa protagonista** o la receta de deck **`proposal-cinematic`**
(issue AXIS `cine-requires-nexa-or-proposal`); las pruebas publicitarias en 9:16 y 4:5 con personas del equipo quedan
**en prueba**, pendientes de decisión del operador. El documento trae la plantilla de ficha comentada y las trampas
medidas del compilador (reserva izquierda forzada en 16:9, accesorios de Nexa contra la ficha).

## Delta 2026-09-26 (b) — convergencia con la línea gráfica: decisiones del operador

- 🔴 **Capa gráfica sobre la foto: aprobada** **[decisión del operador, 2026-09-26]**. Primero se aprobó sólo para
  los casos de la línea gráfica (P-5: voz pregunta–respuesta, lente y medida con fuente); el mismo día el operador
  la aprobó entera. Se compone sobre las reservas de la toma, con los compositores canónicos y sin scrim.
- **La lente cuenta como reserva del texto** (P-1): su exterior apagado es un tratamiento de la línea, no un velo.
  **«Nunca un scrim» sigue vigente para toda pieza sin lente.**
- Aprobadas las reglas de sinergia P1–P12 y resueltos los conflictos P-2..P-9 (lecho pedido igual en piezas con lente,
  el 55 % es del círculo visible de la lente, un anillo dibujado en la escena cuenta como órbita, 1200 × 627 nativo,
  el límite de cabezas del 36 % sólo con reserva de texto, la cláusula de encuadre manda en la lente). El **retrato de
  perfil** (firma de correo, tarjetas de equipo) entra como categoría propia donde se permite mirar a cámara; su barra
  está por redactar. Lo que necesita código va a la task de `foto:prompt` y chequeos de la lente. Detalle:
  [maestro §11](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#11-la-línea-gráfica-en-la-foto).

## Delta 2026-09-26 — firma, órbita y marca fotografiada

- 🔴 **Firma de una pieza gráfica: el logo de Efeonce centrado** **[decisión del operador]**. La burbuja URL
  (`efeoncepro.com`) no se agrega por defecto: sólo reemplaza al logo cuando el logo ya aparece dentro de la imagen
  (mockup, objeto, merch), sola, centrada, fusionada a opacidad 1 y sobre un lecho muy oscuro (a 0,72 no llega a 4,5:1
  sobre ningún fondo). Se declara con `marcaEnEscena` en `foto:componer:cta` (tramo 17, gate `firma-burbuja`) y con
  `brand.signature` en `creative:layout`. Números y detalle en la
  [firma §5.1](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md#51-la-burbuja-url-como-firma--regla-del-operador-2026-09-26).
  Los pies de deck, informe, papelería y firma de mail no cambian.
- 🔴 **La órbita no sustituye la composición ni las formas de este lenguaje** **[decisión del operador]**. La línea
  gráfica [«La órbita»](../brand-graphic-line/README.md) es una capa para casos específicos (lente, medida, progreso,
  foco), declarada a propósito y nunca por defecto; nunca cruza el sujeto, las reservas de texto, el lecho ni la firma.
  La foto conserva su composición. Ver el [delta del documento maestro](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#delta-2026-09-26--la-órbita-no-sustituye-la-composición).
- **Marca fotografiada desde el arte plano** **[medido]**: las láminas 4.8 (merch, 17 fotos) y 4.9 (oficina, 9 fotos) de
  la línea gráfica usan el arte plano como referencia exacta y el modelo sólo pone espacio, material y luz, en registro
  documental. Lecciones: el arte va sin leyendas de lámina (el modelo las imprime), el logo chico se reinventa y se
  repone editando con el logo oficial, la puntuación se revisa letra por letra y se corrige editando la foto, no
  regenerando. Son maquetas de dirección. [Línea gráfica §10.9](../brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#109-oficina-en-foto).

## Delta 2026-09-22 — CTA aprobado sobre foto

[Tres voces + acción](../EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) aprueba la capa funcional de CTA en
texto/contorno/relleno. No aprueba automáticamente piezas completas ni rehabilita los ejemplos rechazados del 19/09.
Conserva foto sin scrims, reservas y firma; la superficie del CTA no habilita paneles para contenido.

## Delta 2026-09-19 (tarde)

- [**Banco aprobado**](https://axis.efeonce.org/references/photography/) y [**guía «El porqué»**](https://axis.efeonce.org/references/photography/why/) en AXIS — **aprobados por el operador (2026-09-26)**: 125 fotos con su receta (`manifest.json`, `recipes/<slug>.json`) y 57 reglas explicadas para el equipo, con lista de control (`why.json` para agentes). Explican el canon; si difieren, manda el canon.
- [**Reserva de espacio en la toma**](EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) — **aprobado (capa fotográfica)**: las cuatro reservas (texto, objeto para enmarcar, lecho de firma, aire para cursores), tono declarado, límite de cabezas, formato nativo, nunca scrim, medir antes de componer.
- [Espacio para texto y formatos nativos](EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md) — bitácora de la ronda: zona de titular con tono declarado y límite de cabezas; 4:5, 9:16 y 16:9 nativos. **Sus piezas compuestas fueron rechazadas; valen sus reglas** (ver estado abajo).

> **Estado:** aprobado el **lenguaje fotográfico** (maestro, firma, colorimetría, cámaras, personas,
> prompts/pipeline) el 2026-09-19, y **la capa gráfica sobre la foto** el 2026-09-26 (decisión del operador). Las
> pruebas compuestas de `EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md` fueron rechazadas por el operador: ese documento
> vale por sus reglas y prohibiciones, no por sus ejemplos.


## 🔴 Componer lo sensible, y que el modelo sólo TERMINE **[operador, 2026-09-21]**

**Para resultados óptimos, la composición se arma con todos sus elementos sensibles APARTE, se juntan
determinísticamente, y recién entonces se le pasa esa referencia al modelo, que aporta ACABADO y nunca
DIBUJO.**

Sensible es toda **marca, texto exacto, cifra o arte oficial**. Un modelo no sostiene una marca:
medido el 2026-09-21 en cuatro pasadas sobre la misma pieza, describirle el logotipo dio un borrón con
forma de flecha, pasarle el arte plano lo dejó ilegible y, aun con la foto del producto delante, la
nave de la «o» salió distinta cada vez. No se arregla pidiéndoselo mejor: se arregla **no
pidiéndoselo**.

| Paso | Qué se hace |
|---|---|
| 1 | **Separar lo sensible** y componerlo desde el archivo oficial; lo neutro va en SVG plano |
| 2 | **Armar** la pieza con esas partes ya resueltas (warp/composite determinístico) |
| 3 | **Pasarle el armado al modelo** pidiéndole SÓLO material y luz — tejido, relieve, plástico, metal, acrílico, sombras—, repitiendo que las marcas no se tocan |
| 4 | **Mirar el resultado al 100%** antes de usarlo |

Dos reglas que salieron del mismo caso:

- **Las proporciones se CALCULAN desde el objeto real, no se fijan a ojo.** El operador cazó dos a la
  primera: la unidad del patrón de la cinta mide **7,05 veces** su ancho (puesta a ojo en 3,4 el
  logotipo salió alargado y el eslogan achatado) y el yoyo **1,6 veces** ese ancho —32 mm contra 20 mm
  reales— cuando estaba en 2,5.
- **Arte plano ≠ foto del producto.** El arte plano sirve para **producir** vistas de un kit; para
  **usar** la pieza en una escena, la referencia es la **foto del producto terminado**.

Herramienta: **`pnpm foto:lanyard`**. Caso completo y medido:
`ai-generations/2026-09-21_lanyard-deterministico/LEEME.md`.


🔴 **ANTES de generar una pieza con un asset de marca —ropa corporativa, lanyard, merch, logo 3D,
isotipo, nave o mascotas— carga el [contrato de selección de referencias](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).** Hay **279 archivos en
10 kits**: el problema nunca es que falte la vista, es **elegir la correcta**. Resume tres reglas:

1. **Tres clases de asset, no intercambiables.** Arte plano → **producir** vistas del kit · pieza
   aislada → **construir** · **pieza en uso / producto terminado → USAR en una escena**. Darlos al
   revés hace que el modelo **reinvente la marca**.
2. **Lo sensible se compone; el modelo sólo termina.** Toda marca, texto exacto o arte oficial se arma
   determinístico y al modelo se le pide **sólo material y luz**. Un modelo no sostiene una marca:
   cuatro pasadas sobre la misma pieza dieron cuatro logotipos distintos.
3. **Las proporciones se calculan del objeto real**, nunca a ojo.

Y **abre el `LEEME.md` y el manifiesto del kit antes del prompt**: su `cuando_usarla` dice qué vista
corresponde, y si el kit trae **prueba en persona**, ésa es el punto de partida.

## Ads: proporción del lecho y continuidad

El lecho debe sostener la firma sin quitar protagonismo a la escena. La sesión SEO/AEO rechazó primero una firma alta y después el primer plano excesivo que seguía tapando casi media foto. Corregir juntos el encuadre físico y el SVG, conservar materia/desenfoque óptico y no imponer el porcentaje de un caso a todo el catálogo. [Método completo](../social/2026-09-22-seo-aeo-paid-media-production-method.md): ficha/prompt compilado, referencias, anatomía, composición, formatos, embudo y handoff. [Compositor CTA vigente y límites](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md). Desde el 2026-09-23, la firma de una pieza con CTA la verifica `pnpm foto:cta:gate` (el contrato de la firma está en el §18 de ese documento): sólo su salida 0 certifica, y ni con 0 reemplaza mirar el cierre al pie.
