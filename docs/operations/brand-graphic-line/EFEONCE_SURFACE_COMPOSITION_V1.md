# Línea gráfica Efeonce — Composición por superficie V1

> **Tipo de documento:** Norma de marca (composición por superficie)
> **Versión:** 1.3
> **Creado:** 2026-09-27 por Claude, con la dirección del operador (Julio Reyes)
> **Última actualización:** 2026-09-27 por Claude (1.3: las 69 láminas del canvas «Deck» aprobadas y convertidas en
> recetas por lámina — [catálogo](./deck-recipes/README.md) `efeonce.deck-slide-recipes.v1`; tríptico con tres esferas,
> sección partida por la izquierda con dos variantes nuevas, cotización en tres variantes, día a día y «vívelo»,
> próximos pasos con impacto y excepción del registro cine para secciones y «about»; ver el delta de abajo. Antes, 1.2:
> §4.6 «Portadas y contraportadas» completa — reglas 1–10, catálogo
> aprobado de brochure y propuesta, receta medida de la columna de voz, selección en portadas, láminas de sección
> reubicadas y descartes; §6 filas 15–20. Antes, 1.1: ruta por el Artifact Composer, §2.1 — 20 recetas aprobadas como
> plantilla con `pnpm brand:compose`, TASK-1919; contrato 0.1.1 publicado en AXIS `v0.3.8` y fijado en Greenhouse)
> **Estado:** Vigente para lo marcado **aprobado**. Las opciones y los pendientes no se usan como canon hasta que el
> operador los apruebe. El contrato AXIS que la acompaña está en `candidate`.
> **Valores:** tokens `efeonceGraphicLine.surfaces.<superficie>` en `@efeoncepro/axis-tokens` (AXIS). Este documento
> dice qué se aprobó, qué reglas rigen y cómo se compone; **no guarda números**. Si un valor no está en el token, no
> existe: se agrega al token con su razón.
> **Contrato:** `efeonce.surface-composition` 0.1.1 (`candidate`, owner `efeonce-brand-studio`, manifest
> `axis.surface-composition.v1`; acepta intents 0.1.0) en `efeoncepro/axis-design-system`. **Publicado** en AXIS
> `v0.3.8` (`axis-tokens` 0.3.8 con `efeonceGraphicLine.surfaces`, `axis-ui-contracts` 0.3.7) y **fijado en
> Greenhouse** (2026-09-27). Lab: https://axis.efeonce.org/references/surfaces/ ([JSON](https://axis.efeonce.org/references/surfaces.json)).
> **Canvas del equipo (por superficie):** [La órbita — superficies](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7),
> con las páginas «DOOH · pDOOH», «Web», «Motion», «Producción audiovisual», «Deck» y «Firma y 1:1». A la izquierda de
> cada página hay una lámina guía, «Guía · cómo componer …», que resume para esa superficie lo que esta norma detalla.
> **Relacionados:** [manual de la línea gráfica](./EFEONCE_GRAPHIC_LINE_V1.md) (§10.0 y §10.1) ·
> [lenguaje de movimiento](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md) · [spec del motion del logo](./EFEONCE_ORBIT_REVEAL_MOTION_V1.md) ·
> [lenguaje fotográfico](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) ·
> [producción de video](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) ·
> [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) ·
> [manual de uso](../../manual-de-uso/creative/componer-por-superficie-con-axis.md) ·
> [documentación funcional](../../documentation/creative/linea-grafica-efeonce.md) ·
> [recetas por lámina del deck](./deck-recipes/README.md)

## Delta 2026-09-27 (c) — las 69 láminas del deck, aprobadas y con receta **[decisión del operador, 2026-09-27]**

El operador aprobó **las 69 láminas** de la página «Deck» del canvas. Cada una tiene su receta (qué comunica, cuándo
sí, cuándo no y qué conviene en su lugar, pares, data slots del Artifact Composer, elementos fijos, selección, foto y
prompt de composición) en el catálogo [`deck-recipes/`](./deck-recipes/README.md)
(`EFEONCE_DECK_SLIDE_RECIPES_V1.json`, esquema `efeonce.deck-slide-recipes.v1`, índice con `pnpm brand:deck-recipes`).
Decisiones que cambian esta norma (detalle en §4.6, «Recetas por lámina»):

1. **Todo lo que era opción, prueba u «opción sin elegir» en el deck pasa a aprobado:** lente, sangre, partida, foco,
   respiro, hoja de contactos, secciones de cine (servicios y equipo), las tres portadas generales del brochure y la de
   cinco líneas con selección y cursor de Nexa.
2. **Tríptico:** una palabra por toma, cada una con su esfera («Escucha.» «Crea.» «Mide.»); reemplaza la frase única
   con la esfera al final.
3. **Sección partida:** el indicador sube por la **izquierda** y la esfera queda arriba a la izquierda (corrige «sube
   por la derecha»); se suman las variantes esquina abajo y panel a la derecha; la órbita a la derecha, descartada.
4. **Excepción del registro cine** para las secciones partidas y las láminas «about» («Quiénes somos», «Por qué lo
   hacemos»): personas en luz dramática; no amplía el cine a otras superficies (§3, regla 5).
5. **Cotización** en tres variantes (tabla, en escena, en vivo); **día a día** con cuatro momentos, herramientas y dos
   «vívelo»; **próximos pasos** con impacto (reemplaza las tres columnas); **clientes** en un tono navy con excepción
   tonal; **caso Sky** con foto de ejemplo; **BeX** con la escalera como principal.

Los tokens y las recetas de AXIS todavía describen parte de lo anterior (sección partida por la derecha, frase única
del tríptico, próximos pasos en tres columnas, opciones sin aprobar); se sincronizan en
[TASK-1927](../../tasks/in-progress/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md), con las fotos en
[TASK-1926](../../tasks/to-do/TASK-1926-cine-register-idempotent-photo-pipeline.md). Mientras tanto manda esta norma.

## Para qué sirve

La línea gráfica ya tenía contratos por **elemento**: `efeonce.graphic-line-orbit` pinta la órbita, la lente, el
progreso, la voz y la firma; `efeonce.collaboration-selection` pinta la selección y los cursores; `resolveIcon` pinta
los íconos. Faltaba decir **dónde vive la pieza**: un hero de sitio no se compone como un caminero de carretera, ni un
zócalo de video como una lámina de propuesta. Esta norma fija, **por superficie**, qué papel cumple la pieza, qué
recetas aprobó el operador, qué reglas rigen, cómo firma y con qué herramientas se compone.

Es para el equipo creativo y para los agentes. Un agente no elige coordenadas: declara la superficie, el formato, el
papel y la receta; AXIS resuelve reservas, escala de voces, firma y tiempos desde los tokens y le entrega los intents
ya rellenados para los contratos de elemento.

Alcance: **marca propia de Efeonce y su familia**. Nunca trabajo de clientes ni la interfaz de Greenhouse.

---

## 1. De elemento a superficie

| Capa | Qué resuelve | Dónde vive |
|---|---|---|
| **Superficie** (nueva) | formato, papel, receta, reservas por región, escala de voces, firma, tiempos y referencias aprobadas | contrato `efeonce.surface-composition` + tokens `efeonceGraphicLine.surfaces` |
| Elemento: órbita, lente, progreso, voz, firma | la geometría y el dibujo de cada elemento | contrato `efeonce.graphic-line-orbit` + tokens `efeonceGraphicLine` (`lens`, `pieces`, `signature`, `type`, `motion`, `brandClose`) |
| Elemento: selección y cursores | cajas, esquinas, colaboradores | contrato `efeonce.collaboration-selection` |
| Elemento: íconos | glifo y voz (Trazo o Plastilina); en el objeto protagonista de la superficie (portada, key visual, escenario), **Plastilina en volumen**: uno por pieza, ≥ 160 px, nunca en contenido de deck ni UI ([manual §14.1](./EFEONCE_GRAPHIC_LINE_V1.md#141-plastilina-en-volumen-d24-2026-09-27)) | `resolveIcon` de `@efeoncepro/axis-graphic-line/icons` + `efeonceGraphicLine.icons`; el volumen, PNG de `@efeoncepro/axis-brand-assets` (`volumeIconUrl`; 0.3.3 publicado y fijado en Greenhouse) |
| Foto | registro, palancas, reservas, lecho | [lenguaje fotográfico](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) + `pnpm foto:*` |

El contrato de superficie **no repinta nada**: traduce la superficie a intents de los contratos de elemento. Por eso
el canal (`social`, `screen`, `deck`, `print`) del contrato de la órbita ya no lo elige una persona ni un agente: lo
fija el `delegate` que entrega la superficie.

**Superficies del contrato:** `web`, `dooh`, `pdooh`, `motion`, `audiovisual`, `deck`. Social, 1:1 y la firma siguen
en `efeonce.graphic-line-orbit` con su canal `social` y no se duplican aquí (§5).

---

## 2. Cómo se compone con AXIS

```text
intent (superficie + formato + papel + receta + voz + foto + pasos)
   │
   ▼  en AXIS:  pnpm surface:resolve -- --input <intent.json> --out <manifest.json>
manifest axis.surface-composition.v1
   ├─ canvas · safeArea · reserves · type · signature · timeline · rules · references · issues
   └─ delegates ──► efeonce.graphic-line-orbit  ──► Greenhouse: pnpm creative:orbit:render
                ├─► efeonce.collaboration-selection ──► Greenhouse: pnpm creative:layout / pnpm foto:componer:cta
                ├─► resolveIcon (glifo + voz de la línea) ──► AXIS: pnpm icons:export · Greenhouse: resolveIcon en src/lib/brand-surfaces
                └─► ficha fotográfica esperada (registro + reservas) ──► Greenhouse: pnpm foto:prompt → foto:generar → foto:validar
```

1. **Escribe el intent** con la forma del schema `docs/agent-composition/surface-composition-intent.schema.json` de
   AXIS. Parte del ejemplo más cercano en `docs/examples/surfaces/<superficie>-<receta>-intent.json`.
2. **Resuélvelo en AXIS** con `pnpm surface:resolve`. Si el manifest trae `issues`, la pieza no sigue: se corrige el
   intent (una receta que no corresponde al papel, más pasos de los permitidos, registro cine sin Nexa ni la receta
   `proposal-cinematic`, pregunta donde la distancia sólo admite la respuesta, etc.).
3. **Entrega cada `delegate` a su compositor de Greenhouse:**

   | Delegate | Compositor | Qué hace |
   |---|---|---|
   | `efeonce.graphic-line-orbit` (voz, órbita, lente, progreso, firma) | `pnpm creative:orbit:render -- --intent --bindings --out-dir` | pinta, rasteriza, firma y mide contraste y el chequeo `orbit-never-over-subject-or-reserves` |
   | `efeonce.collaboration-selection` | `pnpm creative:layout` (capa de selección) o `pnpm foto:componer:cta` en piezas con CTA | selección con la esfera dentro de la caja y colaboradores |
   | Pieza con foto, voz y selección en formato social o pauta | `pnpm foto:componer` | jerarquía por voces sobre la foto, con la regla del dominante |
   | Íconos | `resolveIcon` / `pnpm icons:export` en AXIS | glifo en reposo, voz de la línea; el grupo pasa `auditIconGroup` |
   | Ficha fotográfica | `pnpm foto:prompt`, `pnpm foto:generar`, `pnpm foto:validar`, `pnpm foto:emblema` | toma nativa del formato, reservas medidas, emblema revisado al 100 % |
   | Motion del logo (reveal, apertura, sting) | `scripts/creative/brand-motion/` (`render-orbit-motion.mjs`, `orbit-sound.mjs`, `encode-orbit-motion.mjs`) | lee cada tiempo de `efeonceGraphicLine.motion` |
   | **Pieza completa de una receta aprobada** (deck, web, DOOH, capas de video, cuadros de motion) | `pnpm brand:compose -- --intent <intent.json>` (Artifact Composer, §2.1) | resuelve el intent con el contrato y compone el PDF o el PNG final con órbita, voz, selección e íconos; no reemplaza la revisión |
   | Lámina de deck | `deck-studio` + Artifact Composer (`src/lib/artifact-composer/`) | la receta de la lámina sale del [catálogo de recetas por lámina](./deck-recipes/README.md); las que tienen plantilla, del catálogo `graphic-line-deck` (§2.1); el resto del deck, `deck-studio` |

4. **Revisa sobre los píxeles finales** con los chequeos de cada compositor y la lista del manual de uso. Componer y
   medir no aprueba ni publica: la aprobación es del operador.

**Guías por superficie en AXIS** (en `main` desde el 2026-09-27; [páginas del Lab](https://axis.efeonce.org/references/surfaces/)):
[README](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/README.md) ·
[web](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/web.md) ·
[dooh-pdooh](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/dooh-pdooh.md) ·
[motion](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/motion.md) ·
[audiovisual](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/audiovisual.md) ·
[deck](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surfaces/deck.md) ·
[schema del intent](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/surface-composition-intent.schema.json).
**Lab:** `axis.efeonce.org/references/surfaces/` (índice) y `/references/surfaces/<superficie>/`, con un gemelo en
JSON para agentes.

### 2.1 La ruta por el Artifact Composer (desde el 2026-09-27, TASK-1919)

Las recetas **aprobadas** ya no se arman como maqueta: son plantillas del Artifact Composer y una pieza sale entera de
un intent, con un solo comando en Greenhouse:

```bash
pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]
# salida por defecto: .captures/brand-surfaces/<id>/ ; deja además <id>.surface-manifest.json
```

El comando valida que la receta esté aprobada, resuelve el intent con el contrato de AXIS (`resolveSurfaceComposition`;
si hay `issues`, no compone), arma el plan con el builder de la receta y compone: órbita y lente con
`paintGraphicLine`, íconos con `resolveIcon`, selección y CTA con el adaptador de Greenhouse, y el plate declarado en
`photo.plateRef`. Los ejemplos de intent de cada receta están en `src/lib/brand-surfaces/examples/*-intent.json`.

| Catálogo | Salida | Recetas con plantilla |
|---|---|---|
| `graphic-line-deck` | PDF 16:9 | `proposal-cinematic`, `method-staircase`, `section-classic`, `section-split`, `content-measure`, `triptych` |
| `graphic-line-stills` | PNG | web `hero-lens`, `hero-bleed`, `hero-uniform-tablet`, `hero-mobile-native` (una plantilla por ancho: 360, 390 y 430); DOOH `caminero-lens`; motion `loop-lens-reveal` (el **último cuadro** del loop, su estático de respaldo) y `storyboard` |
| `graphic-line-overlays` | PNG con alfa (capas para montar sobre el video) | `cartela`, `zocalo`, `callout-selection`, `data-super`, `subtitles`; opacas: `split-screen` y `shot-plan` |

**Qué queda fuera, a propósito:**

- **Las opciones y pendientes** (paleta DOOH, todo pDOOH) no tienen plantilla: el comando falla con
  `recipe-not-approved`. Una receta entra al catálogo sólo cuando el operador la aprueba. Las láminas del deck
  aprobadas el 2026-09-27 que todavía no tienen plantilla (§4.6, «Recetas por lámina») tampoco salen del comando
  hasta TASK-1927 (el contrato fijado las trata como opción o no las conoce): están aprobadas, pero su plantilla no
  existe aún.
- **El video.** El composer entrega cuadros fijos y capas; la animación sigue en la pipeline de motion (§4.4, §4.5).
  `audiovisual.close-reveal` falla con `recipe-outside-composer`: el cierre son los masters del reveal v1.1 o
  `pnpm orbit:video` en AXIS.
- **La ruta productiva** (API, `artifact-worker`, MCP): es
  [TASK-1921](../../tasks/to-do/TASK-1921-brand-surface-pieces-governed-production-route.md). Hoy `brand:compose` es el
  taller local.

Componer no aprueba: la pieza sigue pasando la revisión de §4 y del manual de uso. Paso a paso y errores:
[manual de uso](../../manual-de-uso/creative/componer-por-superficie-con-axis.md). Gate visual:
[runbook](../runbooks/composer-visual-gate.md) (scope `graphic-line`).

---

## 3. Reglas transversales (decididas por el operador)

1. **El fondo Efeonce se mantiene** en todas las láminas y piezas de línea; las otras líneas de servicio sólo aportan
   el acento (`accentOnDark` de la línea). No hay «fondo de Brand» ni «fondo de Revenue».
2. **Una esfera por pieza**, cierra la respuesta; nunca como viñeta. **Una órbita por pieza o lámina.** La única
   excepción declarada es la luz de una foto aprobada (las cinco esferas de la lámina de líneas de servicio con Nexa,
   §4.6): son luz de la escena, no la esfera de la voz.
3. **Firma:** la pieza gráfica firma con el logo centrado; la burbuja URL sólo cuando el logo ya está en la imagen. En
   el deck la burbuja va en el pie y el logo sólo en portada, cierre o cuando la marca es el sujeto. Fuera de social y
   pauta, **la superficie decide dónde firma** (§4); el porcentaje del lado corto no manda ahí.
4. **El isotipo en prendas generadas se compone** desde `@efeoncepro/axis-brand-assets`; nunca se acepta el que dibuja
   el modelo. Se revisa al 100 % con `pnpm foto:emblema`.
5. **Registro cine:** sólo en piezas con **Nexa protagonista** y en la receta **`proposal-cinematic`** (§4.6), con
   proporciones reales (cámara a unos 2 m, 85 mm, sin escorzo) y nunca dos personas mirándose de cerca. **Excepción
   aprobada (2026-09-27):** las láminas de **sección** del deck (las secciones partidas) y las láminas **«about»**
   («Quiénes somos», «Por qué lo hacemos») llevan personas en luz dramática de cine. La excepción es del deck: no
   abre el cine a social, web, publicidad ni contenido
   ([registro cine, delta 2026-09-27 (c)](../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-09-27-c--excepción-para-secciones-y-láminas-about-del-deck)).
6. **El acento nunca va en texto de menos de 24 px** (D1, `efeonceGraphicLine.accentContrast`): ahí va blanco o el
   suave de la voz sobre oscuro, navy sobre papel.
7. **Precios siempre como placeholder; cifras sólo con fuente** citada en la pieza.
8. **Valores sólo desde tokens.** Un script de maqueta con números escritos es referencia de dirección, no fuente.

---

## 4. Por superficie

Convención de estados: **aprobado** = el operador lo aprobó en el canvas o lo registró como decisión · **opción** =
existe y se puede proponer, pero no es canon · **pendiente** = el operador lo dejó abierto · **rechazado** = no se
usa ni como referencia.

### 4.1 Web

**Página del canvas:** «Web». **Papel:** hero de sitio, en escritorio y en teléfono. **Tokens:**
`efeonceGraphicLine.surfaces.web` (formatos de escritorio y los anchos de teléfono, reservas, escala de voces, CTA y
selección).

| Receta | Qué es | Estado |
|---|---|---|
| A · lente gigante | la lente AXIS grande a la derecha con la foto hecha para ella; la voz a la izquierda | **aprobado** |
| B · puesta en escena a sangre | foto a sangre del estratega de uniforme; la voz sobre el espacio oscuro | **aprobado** |
| C · uniforme, la tableta viene hacia ti | foto a sangre con la palanca `pov`: la pantalla viene hacia quien mira | **aprobado** |
| Teléfono | toma vertical nativa, el mismo HTML a los tres anchos del token; todo en fracciones del viewport | **aprobado** |
| Hero «foco» | `spotlightRecipe` sobre el sujeto | opción |
| W1, W1b, W2 | primera ronda: la foto 16:9 entera bajo el texto en el teléfono | superado |

**Reglas**

- Una pareja pregunta–respuesta por hero; la respuesta en 1 a 3 palabras y al menos 3 veces la pregunta.
- El CTA es un grupo de selección de corchetes abiertos con cursor local; el descriptor va bajo el cursor.
- La selección toma la respuesta **con su esfera** y lleva un solo colaborador (rol: Estrategia o Growth).
- **Nada de escritorio encogido:** el teléfono se compone mobile-first, con toma vertical nativa, posiciones en
  fracciones del viewport y el CTA en la zona del pulgar.

**Firma:** la foto del hero no lleva logo; firma el encabezado del sitio (**opción**: el tablero de firma no está
marcado como aprobado).

**Cómo se compone:** la imagen del hero (las cuatro recetas aprobadas, el teléfono en sus tres anchos) sale entera con
`pnpm brand:compose` (§2.1, catálogo `graphic-line-stills`). En el sitio público la implementación sigue las skills
`efeonce-public-site-wordpress` y `astro`, con el manifest como especificación.

**Pendiente:** el contrato de la órbita no tiene canal `web` (la lente se resolvió como `screen`); lo resuelve el
`delegate`.

### 4.2 DOOH (vía pública estática)

**Página del canvas:** «DOOH · pDOOH». **Papel:** caminero de carretera y paleta de ciudad. **Tokens:**
`efeonceGraphicLine.surfaces.dooh` (formatos reales y escala de maqueta, distancias y tiempos de lectura, reservas,
escala de voces y firma por soporte).

| Receta | Qué es | Estado |
|---|---|---|
| Caminero 12 × 4 m · lente AXIS · logo abajo a la izquierda | voz arriba a la izquierda, la lente a la derecha con la foto nativa 3:1; el logo cierra el recorrido de lectura | **aprobado** («elegida») |
| Caminero con el logo arriba o centrado | versiones previas | superado |
| Paleta 1 × 2 m | voz arriba, logo centrado abajo, a dos tamaños a comparar | opción |
| Prueba a distancia | hoja para mirar la pieza al tamaño angular real (paleta a 5 y 15 m, caminero a 80 y 150 m) | opción (instrumento de revisión) |

**Reglas**

- Se diseña para la **distancia y el tiempo de lectura**: carretera se lee de lejos y en pocos segundos; ciudad, de
  cerca. A distancias de carretera el contrato puede admitir sólo la respuesta (issue
  `question-not-allowed-at-distance`).
- La foto es **nativa del formato** (3:1 para el caminero), con luz motivada; nadie mira al lente.
- Sin íconos, sin selección y sin tiempos.

**Firma:** caminero — logo abajo a la izquierda, al final del recorrido de lectura, con su tamaño derivado de la
legibilidad a la distancia máxima (**aprobado**). Paleta — logo centrado abajo; el tamaño entre las dos propuestas del
canvas está **pendiente**.

**Cómo se compone:** el caminero aprobado sale entero con `pnpm brand:compose` (§2.1, `dooh.caminero-lens`); la foto,
con una ficha 3:1. La paleta no tiene plantilla hasta que el operador la apruebe (`recipe-not-approved`).

**Pendientes:** el formato `3:1` de `foto:prompt` sigue local y sin validar (se reconcilia en
[TASK-1918](../../tasks/to-do/TASK-1918-photo-prompt-and-lens-checks-graphic-line.md), Slice 1); el lecho de firma del
caminero está «por medir».

### 4.3 pDOOH (pantalla digital programática)

**Página del canvas:** «DOOH · pDOOH». **Papel:** pantalla LED, mupi digital, spot corto y variantes por franja.
**Tokens:** `efeonceGraphicLine.surfaces.pdooh` (formatos, escala de voces, firma y la línea de tiempo del spot).

| Receta | Qué es | Estado |
|---|---|---|
| Pantalla LED horizontal | lente muro AXIS, **sólo la respuesta**; el sujeto mira hacia el texto | opción |
| Mupi digital vertical | lente story AXIS con pregunta y respuesta | opción |
| Spot corto sin audio | abre la pregunta, el arco trae la respuesta, la esfera la cierra con su golpe y el resto es sostén | opción |
| Variantes dinámicas | un estático completo por franja horaria, con un respaldo para cualquier hora | opción |

**Reglas**

- **Sin audio** en vía pública.
- **La voz se arma en 2 s como máximo** y el mensaje completo ocupa al menos el 80 % del tiempo.
- En el sostén sólo se mueve la foto dentro de la lente; el último cuadro es el estático de respaldo.
- Cada variante dinámica es un estático completo; nunca una pieza que depende de la anterior.

**Firma:** LED — logo bajo la respuesta; mupi — logo centrado abajo. Ambas **opción**, con el tamaño en el token.

**Cómo se compone:** la lente sale del `delegate` de la órbita; la línea de tiempo del spot, del manifest
(`timeline`), con las curvas y golpes de `efeonceGraphicLine.motion`.

**Pendientes:** ninguna receta de pDOOH está aprobada todavía; el tamaño de la respuesta de la lente muro difiere
entre la receta del paquete y la pieza medida (tabla §6).

### 4.4 Motion (gráfica animada con foto fija)

**Página del canvas:** «Motion». **Papel:** la gráfica de la línea animada sobre una foto fija. **Tokens:**
`efeonceGraphicLine.motion` (curvas, sobrepaso, pulso, jerarquía del cuadro) y
`efeonceGraphicLine.surfaces.motion` (los tramos de la gráfica con foto: lente, voz, selección, sostén y cierre).

| Receta | Qué es | Estado |
|---|---|---|
| Animación en bucle: foto hecha para la lente + reveal | la lente se abre, el arco corre, la esfera golpea, entra la voz, encaja la selección, sostén y cierre con el reveal V1.1 | **aprobado** |
| Storyboard cuadro a cuadro | los mismos tramos con su cuadro de respaldo y la tapa final con logo y eslogan | **aprobado** |

**Reglas** (del tablero «Motion · reglas», aplicadas por las dos piezas aprobadas):

1. La foto es material fijo: pasa el QA de foto fija antes de animar. Se anima la línea, no la foto.
2. Se mueven la órbita (arco, esfera, halo) y la voz, con las siete reglas del
   [lenguaje de movimiento](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md). **Nunca tiempos escritos en un script.**
3. La foto sólo se acerca, dentro de su lente o a sangre, hasta el límite del token, en escala logarítmica y nunca
   mientras entra la voz.
4. El mensaje completo ocupa al menos el 80 % del tiempo (en pDOOH, la voz se arma en 2 s como máximo).
5. El último cuadro es la pieza estática completa: respaldo y versión con movimiento reducido.
6. En vía pública, sin audio; con sonido, sólo el golpe sintetizado.
7. La firma va en el cierre (reveal o sting), sólo en marca propia; nunca en piezas de clientes.
8. Nunca se genera la animación con un modelo de video ni con paralaje falso sobre la foto.

**Firma:** la toma nunca lleva logo; firma el cierre.

**Cómo se compone:** el cierre sale de `scripts/creative/brand-motion/`. El Artifact Composer entrega el **último
cuadro** del loop (`motion.loop-lens-reveal`, el estático de respaldo) y el **storyboard** (`motion.storyboard`) con
`pnpm brand:compose` (§2.1). La animación de la gráfica con foto **todavía no tiene un render canónico** en Greenhouse:
la pieza aprobada se armó como maqueta de dirección con tramos escritos a mano, y el composer no anima. Un master nuevo
lee los tramos de `efeonceGraphicLine.surfaces.motion` (tabla §6).

### 4.5 Producción audiovisual (video)

**Página del canvas:** «Producción audiovisual». **Papel:** video de marca con planos filmados o generados y recursos
de texto. **Tokens:** `efeonceGraphicLine.surfaces.audiovisual` (escala de la cartela, zócalo, super de dato,
subtítulos, tiempos de entrada y duración de cada recurso). El método general de producción sigue en
[VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md); esta
sección suma la gramática de la línea.

| Receta | Qué es | Estado |
|---|---|---|
| Storyboard de planos «Cómo trabajamos» | plano general en terreno, inserto de manos, plano medio en la sala del cliente y cierre con el reveal | **aprobado** («dirección aprobada») |
| Escenas con generadores de texto | cartela de apertura, zócalo, callout con selección, super de dato, pantalla dividida, subtítulos quemados y cierre | **aprobado** |

**Seis reglas de producción**

1. El primer cuadro de cada plano es una foto que pasó el QA fijo (`pnpm foto:validar`); recién entonces se anima.
2. Una luz con carácter y un registro por pieza: los planos se emparejan, no se mezclan.
3. Grade: sólo empareja hacia la colorimetría de la foto, sin look propio y sin azul en las sombras.
4. Uniforme por registro de escena; el emblema se revisa cuadro a cuadro (si el modelo lo reinventa, no se lee o se
   compone).
5. Texto sólo en las reservas planeadas del plano, como cartela compuesta después, nunca generado.
6. Formato nativo por plano (16:9, 9:16, 1:1): no se recorta uno desde otro.

**Recursos de texto:** la **cartela de apertura** lleva la voz y la órbita que mide el capítulo (`progress`); el
**zócalo** trae contexto con anillo y el rol con esfera, con entrada corta; el **callout** usa la selección sobre un
objeto; el **super de dato** es una órbita que mide un dato con fuente; la **pantalla dividida** reparte dos planos
con un divisor en el acento; los **subtítulos** van quemados, en el tercio inferior y sin caja. Una esfera por
pantalla.

**Firma:** firma la marca, nunca la toma: el cierre es el reveal aprobado, con sonido.

**Cómo se compone:** los recursos de texto salen como **capas PNG con alfa** del catálogo `graphic-line-overlays`
(cartela, zócalo, callout con selección, super de dato y subtítulos; la pantalla dividida y el plan de planos, opacos)
con `pnpm brand:compose` (§2.1); se montan sobre el plano en la edición. El cierre (`close-reveal`) es video: falla en el
composer con `recipe-outside-composer` y sale de los masters del reveal v1.1.

### 4.6 Deck

**Página del canvas:** «Deck». **Papel:** presentación 16:9 de marca propia (propuesta, sección, contenido, respiro,
cierre). **Tokens:** `efeonceGraphicLine.surfaces.deck` (recetas, reservas y escala de voces) sobre las piezas medidas
de `efeonceGraphicLine.pieces.deck`.

**Base común:** margen de deck, eyebrow, pregunta con anillo, respuesta en Bricolage; pie con la burbuja URL; la
órbita es la navegación (una por lámina); papel u oscuro según la lámina; en las láminas de línea, **fondo Efeonce y
sólo el acento de la línea**. Logos de terceros en un tono y con el mismo peso óptico. La lámina con foto no lleva
logo: firman la portada y el cierre. El cierre lleva el logo dentro de la órbita y la palabra final del eslogan en el
acento ([manual §10.1](./EFEONCE_GRAPHIC_LINE_V1.md#101-pantalla-y-campaña)).

**Las 69 láminas de la página «Deck» están aprobadas (2026-09-27)** y cada una tiene su receta en el
[catálogo de recetas por lámina](./deck-recipes/README.md) (JSON `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, esquema
`efeonce.deck-slide-recipes.v1`). **Para elegir una lámina, empieza por el catálogo:** trae el índice por familia y por
documento (propuesta, brochure, pitch, QBR), cuándo sí, cuándo no y qué conviene en su lugar, pares y data slots. Esta
sección guarda las reglas y las decisiones; el catálogo, la receta de cada lámina.

| Receta | Qué es | Estado |
|---|---|---|
| Sección clásica | `deckSlideHtml('section')`: el número dentro del anillo que marca la sección | **aprobado** |
| Sección partida (`section-split`) | panel en papel con una esquina curva arriba a la derecha; la foto se extiende bajo la curva; **el indicador sube por la izquierda** y la esfera queda arriba a la izquierda | **aprobado** (corregido el 2026-09-27) |
| Sección partida, esquina abajo (`section-split-corner-bottom`) y panel a la derecha (`section-split-panel-end`) | las dos variantes de ritmo de la sección partida, con el mismo indicador por la izquierda | **aprobado** (2026-09-27) |
| Contenido «la órbita mide la cifra» | la lente con el arco que barre el porcentaje real, con fuente o «datos de muestra» | **aprobado** |
| Tríptico «Escucha. Crea. Mide.» | tres tomas verticales nativas a sangre; **una palabra por toma, cada una con su esfera** | **aprobado** (corregido el 2026-09-27) |
| **`proposal-cinematic`** | foto de cine a sangre y la propuesta de un servicio (abajo) | **aprobado** (seis láminas) |
| **`method-staircase`** | el método como escalera, sin foto (abajo); la principal de BeX | **aprobado** (BeX, 2026-09-27) |
| Sección con lente, sección a sangre, respiro, foco, hoja de contactos, secciones de cine (servicios, equipo, quiénes somos, por qué lo hacemos) y las láminas de contenido, método, prueba, propuesta por línea, cotización y próximos pasos | el resto de las láminas del canvas | **aprobado** (2026-09-27); receta de cada una en el catálogo |

**Reglas del deck**

- La selección toma **una sola cosa** por lámina.
- Las viñetas nunca llevan la esfera. La órbita con satélites lleva el arco largo en degradé **sin esfera**.
- Una receta nueva nace en el canvas, se aprueba y recién entonces entra al catálogo de recetas, al token y al
  contrato.
- **Una receta aprobada no es todavía una plantilla.** Hoy `pnpm brand:compose` produce la sección clásica,
  «la órbita mide la cifra», `method-staircase` y `proposal-cinematic` con `layout: 'service'`; la sección partida y el
  tríptico tienen plantilla en su versión anterior y el resto no la tiene. Lo que no tiene plantilla se arma como
  maqueta de dirección declarada con el `prompts.composition` de su receta (TASK-1927).

#### Receta `proposal-cinematic` (aprobada el 2026-09-27)

La lámina que vende un servicio con una imagen que se recuerda. Seis aprobadas:

| Lámina | Voz | Escena |
|---|---|---|
| Servicios creativos digitales | «¿Tu marca en cada pantalla? En todas.» | la directora dirige una órbita de pantallas |
| Web | «¿Para quién es tu web? Para todos.» | la web en acción con el estratega en polo (placa `WB1b`; ver la página «Deck» del canvas) |
| La carrera de Nexa | «¿Listos para la carrera? Vamos.» | Nexa biónica con lentes y luces de partida (Nexa protagonista) |
| RevOps | «¿Tu CRM vende contigo? Con agentes.» | un moño de luz que capta, cierra y hace crecer, con los agentes en el flujo; la líder de RevOps con la chaqueta Efeonce |
| AEO | «¿Te encuentra la IA? Visible.» | entre miles de tarjetas oscuras, el haz de una burbuja de respuesta de IA ilumina una sola; la estratega SEO con el polo Efeonce |
| Líneas de servicio con Nexa | — | cinco esferas de luz en los acentos de las líneas orbitan a Nexa, la naranja en su palma; cada nombre de la pila va en el color de su esfera |

Las tres primeras se aprobaron en la ronda del 2026-09-27; RevOps, AEO y líneas de servicio, ese mismo día a la 01:46.

**Excepción de la lámina de líneas de servicio con Nexa (decisión del operador):** las cinco esferas son **luz de la
foto**, no la esfera de la voz; la respuesta sigue cerrando con **una sola** esfera. Es también la única lámina donde
conviven los acentos de las cinco líneas, porque presenta la familia; cada nombre de la pila va en el acento de su
línea y a 24 px o más (D1). Fuera de esta lámina rigen «una esfera por pieza» y «un acento por pieza».

| Región | Regla |
|---|---|
| Foto | de cine, a sangre; el **sujeto a la derecha mira a cámara**; lo digital o el servicio **en acción** y el color de la línea saliendo de la escena, no pintado encima |
| Voz | a la izquierda, en el espacio oscuro que la toma reserva (la ficha declara la reserva): eyebrow «Nuestra propuesta · \<línea\>», pregunta con anillo y respuesta con esfera |
| Selección | sobre la respuesta, con su esfera, y un colaborador de tipo departamento («Cliente»; «Nexa» en la pieza de Nexa) |
| Bajada | una frase que explica el servicio |
| Prueba | una cifra o un hecho **con fuente**; si no hay fuente, no hay prueba |
| Pasos | hasta cuatro, con íconos de la voz de la línea (Brand = Plastilina; Growth, Engine y Revenue = Trazo), en reposo; el **rótulo del primer paso va en blanco o en el suave de la voz, nunca en el acento** (texto menor de 24 px, D1) |
| Pie | la burbuja URL; sin logo en la lámina |
| Navegación | las piezas aprobadas van sin indicador de deck; la navegación la retoman las secciones |

**La foto de la receta**

- Registro **cine**, ampliado por el operador a esta receta con **personas del equipo** (además de Nexa protagonista):
  cada persona con el **uniforme correcto por registro de escena**. Detalle y guardas en el
  [lenguaje fotográfico, delta 2026-09-27](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md).
- **Proporciones reales:** cámara a unos 2 m, 85 mm, plano medio, sin escorzo hacia el lente.
- **Isotipo oficial compuesto** en la prenda, desde `@efeoncepro/axis-brand-assets`; nunca el que dibuja el modelo (la
  prenda se pide lisa y se revisa con `pnpm foto:emblema`; si muestra un emblema distinto, el oficial se compone con
  `pnpm foto:isotipo`, TASK-1920, regla `.claude/rules/brand-photography.md`).
- **Los mini robots agentes** funcionan como **hilo visual entre láminas**: aparecen en varias propuestas y cosen el
  deck sin repetir la misma foto.

**Pendientes:** ninguno. Con la aprobación de RevOps, AEO y líneas de servicio con Nexa (2026-09-27, 01:46), todas
las láminas de la ronda de propuestas quedaron aprobadas o rechazadas.

**Rechazadas (no usar ni como referencia):**

| Lámina | Por qué |
|---|---|
| Servicios creativos en Plastilina (bombillo gigante con órbita sesgada) | no era digital ni artística; la voz Plastilina sigue vigente para los íconos de Brand |
| La carrera v1 | la cámara pegada desproporcionó la cabeza y el modelo inventó el emblema del pecho |
| Nexa y un director de arte mirándose de cerca sobre la misma prueba | se lee como escena romántica |
| Líneas de servicio con Nexa presentando la pila de líneas | sin punch |

**Cómo se compone:** la voz, la selección y los íconos salen de los `delegates`; la foto, de la ficha esperada
(`foto:prompt` con el registro y la reserva izquierda). La lámina sale entera con `pnpm brand:compose` (§2.1,
catálogo `graphic-line-deck`, PDF 16:9), igual que las otras cinco recetas aprobadas del deck; el resto del deck se arma
con `deck-studio`. No vive en `deck-axis`, que es el catálogo de las ofertas a comité.

#### Receta `method-staircase` (aprobada el 2026-09-27)

La lámina que muestra un **método por niveles** cuando la imagen es el propio método. Aprobada con **BeX
«escalera»**: cinco peldaños de vidrio azul que se iluminan al subir; el quinto, **Be Intrinsic**, es un bloque
sólido en el acento de Engine.

| Región | Regla |
|---|---|
| Imagen | **sin foto**: la escalera es la imagen; los peldaños suben hacia la derecha y se encienden de a uno |
| Último peldaño | el nivel de llegada va en bloque sólido en el acento de la línea; los anteriores, en vidrio |
| Voz | pregunta y respuesta con esfera en el espacio libre; una sola esfera en la lámina |
| Texto de cada peldaño | el nombre del nivel en blanco o en el suave de la voz cuando es menor de 24 px; nunca en el acento |
| Fondo | Efeonce, con el acento de la línea del método (Engine en BeX) |

No lleva registro fotográfico ni personas. Los valores (número y proporción de peldaños, brillo, escala) viven en
`efeonceGraphicLine.surfaces.deck`. Se compone igual que `proposal-cinematic`: `pnpm brand:compose` (§2.1); la
selección, cuando la lleva, toma un nivel de la escalera (`selection.level`, 1 = el de abajo).

#### Portadas y contraportadas (aprobadas el 2026-09-27) **[decisión del operador, 2026-09-27]**

Esta es la norma completa de portadas y contraportadas del **brochure** y de la **propuesta comercial**, y de las
láminas de sección que salieron de la misma ronda. **Fuente visual:** la página «Deck» del
[canvas por superficie](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7), donde el operador las
aprobó. **Recetas:** recetas de portada y contraportada del AXIS Lab › Superficies › Deck (formalización en curso). La
integración en Greenhouse (renderizarlas desde el contrato) es parte de
[TASK-1927](../../tasks/in-progress/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) y la producción idempotente
de sus fotos, de [TASK-1926](../../tasks/to-do/TASK-1926-cine-register-idempotent-photo-pipeline.md). Hasta que eso cierre, **no tienen plantilla en el Artifact Composer**: los scripts que las
renderizaron en el canvas no viven en el repo, y `pnpm brand:compose` no las produce.

##### Las reglas

> **Si la portada lleva fotografía, la contraportada va sin fotografía, y al revés.**

| # | Regla |
|---|---|
| 1 | **Foto y sin foto se alternan** entre portada y contraportada. Vale para el brochure y para la propuesta comercial. **[decisión del operador, 2026-09-27]** |
| 2 | **El mensaje de la contraportada depende del documento.** Propuesta comercial: el mensaje principal es el eslogan **«Empower your Growth»**, grande y protagonista, en sus pesos oficiales, porque la propuesta llega **después** de conversar y «¿Conversamos?» no aplica. Brochure: **«¿Conversamos? Cuando quieras.»** en la voz pregunta–respuesta, con el eslogan como firma debajo, porque el brochure busca abrir la conversación. **[decisión del operador, 2026-09-27]** |
| 3 | **Los textos de portada siguen la voz de la línea** ([manual §4](./EFEONCE_GRAPHIC_LINE_V1.md#4-la-voz-pregunta-y-respuesta)): eyebrow en Poppins 500, mayúsculas espaciadas · pregunta en Poppins Light 300 con su anillo en el acento · respuesta en Bricolage 760 con su esfera en el acento, de una a tres palabras y **al menos 3× la pregunta** · evidencia en Poppins 400 con una palabra en negrita. **Nada de títulos sueltos** tipo «Servicios 2026» sin voz. **[decisión del operador, 2026-09-27]** |
| 4 | **El eslogan va sólo en el cierre**, nunca en la portada. El operador lo preguntó y se descartó: recarga la portada, repite la respuesta y la esquina inferior derecha es zona del sujeto o de la órbita. **[decisión del operador, 2026-09-27]** |
| 5 | **La órbita gigante sin foto es el recurso de la portada de propuesta**, no de la portada de brochure (se retiró como portada de brochure). Como **contraportada** sin foto del brochure sí está aprobada, con «¿Conversamos? Cuando quieras.». **[decisión del operador, 2026-09-27]** |
| 6 | **La portada de propuesta comercial** lleva un espacio fijo para el **logo del cliente** dentro de la órbita y la **burbuja URL** alineada con la columna de texto. El nombre del cliente **no se repite como título**: vive en la evidencia («Preparada para [Cliente] · Confidencial») y en su logo. La portada de brochure no lleva cliente. **[decisión del operador, 2026-09-27]** |
| 7 | **El logo de Efeonce va a 500 px en 1920** en portada y contraportada, para leerse a 96 px o más en un teléfono de 390 px (≥ 473 px en 1920: `efeonceGraphicLine.logo.minScreenPx`). Las recetas clásicas del contrato (230 y 220 px) no llegan. **[decisión del operador, 2026-09-27]** |
| 8 | **Ningún texto cruza la órbita ni al sujeto de la foto.** La columna de texto vive en el tercio o el 45 % izquierdo oscuro. Si una pregunta o una evidencia cruza un haz, una mano o la órbita, se acorta o se parte la evidencia en dos o tres líneas (casos: «¿Qué hacemos por tu marca?» → «¿Qué hace Efeonce?»; «¿Dónde pongo el presupuesto?» → «¿Dónde invierto?»). **[decisión del operador, 2026-09-27]** |
| 9 | **Cada portada de línea de servicio toma el acento de su línea** en el anillo y en la esfera (tokens `efeonceGraphicLine.lines`) y lista como evidencia las categorías de la línea, del catálogo de [`docs/services/`](../../services/README.md). **[decisión del operador, 2026-09-27]** |
| 10 | **Selección colaborativa y cursores en portadas:** sólo sobre la columna de texto o sobre el logo del cliente, **nunca sobre la persona**; en 16:9, **un solo cursor** (propio o de un colaborador). Las fotos de cine van, por defecto, sin interfaz. Dónde quedó, en la tabla de abajo. **[decisión del operador, 2026-09-27]** |

##### Las parejas

| Documento | Portada | Contraportada |
|---|---|---|
| Brochure | con foto (registro cine): Nexa frente a la órbita, Nexa y las cinco líneas o Nexa y el equipo con agentes; o una de las cinco portadas por línea | sin foto: la órbita gigante con «¿Conversamos? Cuando quieras.» |
| Propuesta comercial | sin foto, con el logo del cliente: la órbita gigante, o la órbita que sale como el sol | con foto: «Empower your Growth» hacia la órbita, o al amanecer |

**Nota:** las dos contraportadas de brochure **con foto** (Nexa hacia la órbita y al amanecer, con «¿Conversamos? Cuando
quieras.») también están aprobadas, pero por la regla 1 sólo emparejan con una
portada **sin** foto, y hoy no hay una portada de brochure sin foto aprobada (la órbita gigante se retiró como portada
de brochure). Queda como pregunta al operador en §6.

##### Brochure — portadas con foto

**Sistema común (aprobado):** logo de 500 px arriba · eyebrow «Brochure · Servicios 2026» · «¿Qué hace Efeonce?» (anillo
teal) · **«Crecer.»** (esfera teal) · evidencia «**Cinco** líneas de servicio: Growth · Brand · Engine · Voice ·
Revenue».

| Foto | Plate (`ai-generations/…`) | Receta | Estado |
|---|---|---|---|
| Nexa frente a la órbita | `2026-09-27_brochure/plates/BR1b-portada-orbita-isotipo.png` | `cover-brochure-cine-orbit` | **aprobado** (2026-09-27) |
| Nexa y las cinco líneas (cinco esferas) + burbuja URL | `2026-09-26_deck-nexa/plates/NX6b-nexa-cinco-orbitas-isotipo.png` | `cover-brochure-cine-lines` | **aprobado** (2026-09-27) |
| Nexa y el equipo con agentes | `2026-09-27_brochure/plates/BR2b-portada-equipo-isotipo.png` | `cover-brochure-cine-team` | **aprobado** (2026-09-27) |
| La de las cinco líneas con selección y cursor de Nexa sobre «Crecer.» | la misma de las cinco líneas | `cover-brochure-cine-lines-selection` | **aprobado** (2026-09-27; antes «prueba») |

##### Brochure — una portada por línea de servicio (aprobadas las cinco)

Mismo sistema que la portada general, con el acento de la línea en el anillo y en la esfera (regla 9). Los cinco pares
quedaron **aprobados** y salen del estado de candidatos del banco del
[manual §4](./EFEONCE_GRAPHIC_LINE_V1.md#4-la-voz-pregunta-y-respuesta).

| Línea (token) | Acento | Eyebrow | Pregunta / respuesta | Evidencia | Plate (`ai-generations/…`) |
|---|---|---|---|---|---|
| Growth Strategy & Measurement (`growth`) | teal `#36c8bf` | Brochure · Growth Strategy | ¿Lo medimos? **Siempre.** | **Seis** capacidades: Estrategia · GTM · Revenue enablement · Analítica · Medición · Orquestación | `2026-09-26_deck-hibrido/plates/HW1-mismo-trabajo.png` |
| Creative Services (`brand`) | naranja `#ff6500` | Brochure · Creative Services | ¿Quién crea mi contenido? **Tu squad.** | **Seis** capacidades: Squad creativo · Brand systems · Campañas · Contenido y social · Audiovisual · Run & Gun | `2026-09-26_deck-creativo/plates/CR2b-constelacion-isotipo.png` |
| Digital Services & Engineering (`engine`) | azul `#0375db` | Brochure · Digital Services | ¿Te encuentra la IA? **Visible.** | **Cinco** capacidades: Search Visibility · Web Experience · Medición · Sistemas de agentes · Automatización | `2026-09-26_deck-web/plates/WB1b-web-para-todos-isotipo.png` |
| Media & Distribution (`voice`) | rojo anaranjado `#f83902` | Brochure · Media & Distribution | ¿Dónde invierto? **Donde rinde.** | **Tres** soluciones y una operación: Estrategia de distribución · Performance · Influencia y earned · Managed Media | `2026-09-27_portadas-lineas/plates/LN4-voice-distribucion.png` (nueva; ficha `2026-09-27_portadas-lineas/fichas/LN4-voice-distribucion.json`, USD ~0,04; bordado revisado al 100 % = isotipo oficial) |
| RevOps & CRM (`revenue-hubspot`) | magenta HubSpot `#e86bd0` | Brochure · RevOps & CRM | ¿Y el reporte del viernes? **Ya lo viste.** | **Seis** soluciones: Marketing y AEO · Ventas y pipeline · Revenue lifecycle · Servicio · Datos y CRM · Operación con agentes | `2026-09-26_deck-revops/plates/RV1b-motor-de-revenue-isotipo.png` |

**Pendiente opcional:** la variante de RevOps para Salesforce (`revenue-salesforce`, cielo `#2fb8ff`).

##### Brochure — contraportadas (aprobadas las tres)

Bloque común: logo de 500 px · **«¿Conversamos? Cuando quieras.»** · el eslogan como firma · burbuja URL y redes
(Spotify, Instagram, LinkedIn, Threads, YouTube, TikTok) · correo, dos teléfonos y dirección.

| Contraportada | Modo | Plate (`ai-generations/…`) |
|---|---|---|
| Nexa camina hacia la órbita | foto | `2026-09-27_brochure/plates/BR3-contra-horizonte.png` |
| Nexa y un agente hacia la órbita, al amanecer | foto | `2026-09-27_brochure/plates/BR4-contra-amanecer.png` |
| La órbita gigante | sin foto (SVG, sin plate) | — ; lleva además corchetes abiertos y el cursor propio sobre «Cuando quieras.». Es la pareja de las portadas de brochure con foto (regla 1) |

##### Propuesta comercial — portadas sin foto con el logo del cliente (aprobadas las cuatro)

Voz común: eyebrow «Propuesta comercial · Octubre 2026» · «¿Cómo crecemos en 2027?» · **«Con foco.»** · evidencia
«Preparada para **[Cliente]** · Confidencial» · burbuja URL alineada con la columna. Selección: marco de 8 manijas sobre
el logo del cliente y un cursor de colaborador («Cliente» en la plantilla, «SKY» en el ejemplo).

| Portada | Composición | Versiones aprobadas |
|---|---|---|
| La órbita gigante sostiene el logo del cliente | el logo del cliente en una caja fija de 460 × 200 dentro de la órbita | plantilla (marcador «Logo del cliente») y ejemplo con SKY (`sky-on-dark.svg` de la biblioteca del composer) |
| La órbita sale como el sol (amanecer) | eje central, logo de Efeonce a 480 px, texto centrado; el logo del cliente en una caja de 340 × 130 dentro del domo | plantilla y ejemplo con SKY |

##### Propuesta comercial — contraportadas con foto (aprobadas las dos)

Logo de 500 px · el eslogan **«Empower your Growth»** a 72 px como mensaje principal (Empower en ExtraBold itálica,
your en ExtraBold, Growth en Black itálica en teal) · burbuja URL y redes · contacto completo. **Sin «¿Conversamos?».**

| Contraportada | Plate (`ai-generations/…`) |
|---|---|
| «Empower your Growth» hacia la órbita | `2026-09-27_brochure/plates/BR3-contra-horizonte.png` |
| «Empower your Growth» al amanecer | `2026-09-27_brochure/plates/BR4-contra-amanecer.png` |

##### La columna de voz — receta medida (1920 × 1080)

Medida sobre las láminas aprobadas del canvas. Es la **referencia** hasta que entre al token
`efeonceGraphicLine.surfaces.deck` con la formalización de las recetas (TASK-1927); cuando el token exista, manda el
token.

| Elemento | Posición | Medida |
|---|---|---|
| Columna | a la izquierda, x = 140 (el margen de deck) | — |
| Logo de Efeonce | en `top` | 500 px |
| Eyebrow | `top` + 190 | 22 px |
| Pregunta | `top` + 238 | 40 px |
| Respuesta | `top` + 300 (+ 28 si lleva selección) | 124 px, Bricolage 760, interlineado 0,95; cierra con la esfera (0,2 em, en el acento) |
| Evidencia | 34 px bajo la respuesta (130 px si lleva selección, para que quepa la etiqueta del colaborador) | 28 px, interlineado 1,3, Poppins 400 |
| Burbuja URL | abajo a la izquierda, a 51–72 px del borde inferior | — |
| Eslogan de la contraportada de propuesta | `top` 420 | 72 px; el bloque de contacto en 600 |

`top` típico: entre 200 y 300.

**El plate de una portada con foto (registro cine):** sujeto en la **mitad derecha**, de la cintura hacia arriba, a
85 mm y unos 2 m, mirando al lente; el **45 % izquierdo es estudio oscuro y calmo** (sin haces, objetos ni órbita), con
lecho oscuro abajo; la luz de acento es la de la línea. Guardas del registro en el
[lenguaje fotográfico, delta 2026-09-27](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md).

##### Selección y cursores en portadas (regla 10), dónde quedó

| Pieza | Selección | Cursor |
|---|---|---|
| Portadas de propuesta (las cuatro) | marco de 8 manijas sobre el logo del cliente | colaborador «Cliente» o «SKY» |
| Lámina de sección de servicios («Crecer.») | 8 manijas sobre «Crecer.» | propio |
| Contraportada órbita gigante del brochure | corchetes abiertos sobre «Cuando quieras.» (invitación a actuar) | propio |
| Portada de las cinco líneas con Nexa (`cover-brochure-cine-lines-selection`) | sobre «Crecer.» | de Nexa — **aprobado** (2026-09-27) |
| Fotos de cine | ninguna por defecto | — |

##### Láminas de sección (reubicadas como interiores)

| Lámina | Dónde va |
|---|---|
| «¿Qué hace Efeonce? Crecer.» con Nexa frente a la órbita | abre la **sección de servicios** (brochure o propuesta); 8 manijas y cursor propio sobre «Crecer.» |
| «¿Quién hace crecer tu marca? Este equipo.» (Nexa, el equipo y los agentes) — **aprobada** | abre la **sección del equipo** |
| BeX «escalera» (`method-staircase`, aprobada) | lámina **interior** y la **principal** de BeX; la BeX original (`method-staircase-flat`) queda como variante |

Las seis láminas de cine con punch (`proposal-cinematic`, arriba) siguen siendo láminas interiores. Las tres fotos
generales del brochure quedaron aprobadas **como portada** y también como láminas interiores: Nexa frente a la órbita
abre la sección de servicios (`section-cine-services`), Nexa y el equipo abre la del equipo (`section-cine-team`) y
Nexa y las cinco líneas es la lámina de líneas de servicio (`proposal-cinematic-nexa-lines`). En un mismo documento la
misma foto no se usa dos veces (resuelve §6, fila 19).

##### Descartado — no volver a proponer

- Las portadas clásicas de propuesta del contrato (logo de 230 px) y su versión con el logo a 500 px.
- El anillo completo con el logo del cliente al centro (PC3).
- La órbita gigante como portada de **brochure** (sigue aprobada como portada de propuesta y como contraportada de
  brochure).
- El cierre clásico de AXIS del contrato (logo de 220 px) como contraportada.
- Las portadas genéricas: la clásica de brochure y la de sólo logo.
- Las contraportadas partidas y la v4 centrada.
- «Plastilina en su órbita» y «Tipográfica XXL» sin foto.
- El eslogan en la portada (regla 4) y los títulos sueltos sin voz (regla 3).
- La sección partida con la órbita a la derecha (2026-09-27) y el indicador que «sube por la derecha».
- El tríptico con una sola frase («Escucha, crea y mide.») y la esfera sólo al final (2026-09-27).
- Los próximos pasos en tres columnas (2026-09-27): los reemplaza la versión con la agenda abierta.

#### Recetas por lámina (aprobadas el 2026-09-27) **[decisión del operador, 2026-09-27]**

Catálogo completo, con el índice por familia y documento: [`deck-recipes/`](./deck-recipes/README.md). Aquí van las
decisiones que la norma fija para todas las recetas; el detalle de cada lámina (slots, fijos, foto, prompt) vive en el
JSON.

| Tema | Receta(s) | Decisión |
|---|---|---|
| **Aprobación** | las 69 | todo lo que el canon o AXIS marcaban como opción, prueba u «opción sin elegir» pasa a aprobado. No quedan opciones en la página «Deck» |
| **Tríptico** | `triptych` | una palabra por toma, **cada una con su esfera**: «Escucha.» «Crea.» «Mide.», en Bricolage blanca sobre el lecho oscuro de cada toma y a la misma altura; la pregunta («¿Cómo trabajamos?») arriba a la izquierda. Es la única lámina con tres esferas de voz: las tres palabras son una respuesta repartida en tres tomas, no tres respuestas. Tres tomas verticales nativas, nunca recortes |
| **Sección partida** | `section-split` (esquina arriba), `section-split-corner-bottom` (esquina abajo), `section-split-panel-end` (panel a la derecha) | el indicador nace abajo a la izquierda y **sube por la izquierda** en sentido horario; la esfera queda **arriba a la izquierda** del panel (también con el panel a la derecha). El texto vive entero en el papel. Se alternan: nunca dos con la misma esquina seguidas. Pares aprobados: «¿Quién decide el corte? **El dato.**», «¿Cuánto tarda tu campaña? **En días.**», «¿Qué responde la IA? **Tu marca.**» |
| **Cotización** | `content-pricing` (tabla), `content-pricing-stage` (en escena 3D, Pro al frente), `content-pricing-live` (en vivo, cursor en «Aprobar propuesta») | tres variantes aprobadas; se elige una por deck: la tabla para una sala de lectura, la escena para impacto en sala, la en vivo cuando el alcance está acordado y hay una sola cotización. Montos siempre `[MONTO]`, con periodicidad y «neto + IVA»; capacidad gobernada, nunca horas ni piezas. Sólo en propuesta, nunca en brochure. Pares: «¿Cómo se cotiza? **Por capacidad.**» y «¿Cuánto cuesta? **Sin letra chica.**» |
| **Día a día** | `content-day`, `content-day-tools`, `content-day-live-progress`, `content-day-live-results` | cuatro momentos en la órbita-reloj (base) + la alternativa con las herramientas + dos «vívelo»: avanza a la vista (Notion y Frame.io, cursor en «Aprobar») y resultados en vivo (Insights, Greenhouse y Teams). Interfaces genéricas; sólo los isotipos son reales |
| **Próximos pasos** | `decision-next-steps` | la versión con impacto —la agenda del diagnóstico abierta, el cursor del cliente en «Agenda un diagnóstico» y las dos fichas siguientes en profundidad— **reemplaza** la de tres columnas. Horarios de muestra; contacto desde el SSOT de marca. En una propuesta enviada después del diagnóstico no va: el gesto es aprobar (`content-pricing-live`). Par: «¿Y ahora qué sigue? **Empecemos.**» |
| **Clientes** | `content-clients` | logos en **un solo tono navy** con el mismo peso; Aguas Andinas y UC Temuco en tonos del mismo navy para conservar sus formas. Cifras sólo con fuente |
| **Caso Sky** | `decision-case` | la foto es de **ejemplo** y se reemplaza por una real del caso antes de que la lámina salga |
| **BeX** | `method-staircase` · `method-staircase-flat` | la escalera es la principal; la plana, la variante para impresión o sobriedad total |
| **Secciones de cine y «about»** | `section-cine-services`, `section-cine-team`, `section-cine-about`, `section-cine-purpose` | aprobadas; «Quiénes somos» y «Por qué lo hacemos» cuentan la pasión por el trabajo («+10 años» es un dato, no el centro). Registro cine con la excepción de §3, regla 5 |

**La excepción del registro cine para secciones y «about».** Las fotos de las secciones partidas
(`section-split-corner-bottom`, `section-split-panel-end`) y de «Quiénes somos» / «Por qué lo hacemos» quedaron
aprobadas con personas en **luz dramática de cine**, aunque no protagonice Nexa ni sean `proposal-cinematic`. La
excepción vale **sólo** para láminas de sección y «about» del deck: no abre el cine a social, web, publicidad ni a las
láminas de contenido, que siguen en los registros A, B o C. Guardas iguales al resto del registro: proporciones
reales, uniforme por registro de escena con el isotipo compuesto, nunca dos personas mirándose de cerca y ningún texto
sobre el sujeto. En la variante con el panel a la derecha, la persona es **del cliente** (sin uniforme Efeonce) y su
pantalla nunca muestra una interfaz legible de terceros. El contrato AXIS (`cine-requires-nexa-or-proposal`) todavía no
la conoce: se lleva al contrato en TASK-1927.

**Pendientes de QA** (no bloquean la aprobación; la plantilla usa el valor del canon): respuestas bajo 3× la pregunta
en cotización, clientes, plan, partners y contraportadas de brochure; acento en texto de menos de 24 px en etiquetas
chicas; cifras sin fuente visible (clientes, por qué elegirnos, «quiénes somos», prueba de Sky); partners sin burbuja
URL; el degradado de las láminas «about»; el logo chico de las secciones de cine; el logo dentro de la órbita en el
cierre (§6, fila 17); isotipos sin registro de procedencia; un plate repetido (P1) y la dirección de contacto desde
`EFEONCE_CONTACT`. Lista completa: [catálogo, «Pendientes de QA»](./deck-recipes/README.md#pendientes-de-qa).

---

## 5. Firma y 1:1

La firma de social y pauta y el formato 1:1 siguen en el contrato `efeonce.graphic-line-orbit` (canal `social`) y en
el token `efeonceGraphicLine.signature`: logo centrado abajo, al porcentaje del lado corto que fija el token (más
ancho en 16:9, regla del operador del 2026-09-23). Página del canvas: «Firma y 1:1».

- **1:1 con los ajustes aplicados: aprobado en el canvas** (voz arriba en su banda, lecho abajo, logo centrado; una
  de las cuatro tomas es pieza muda, sólo foto y firma). La salida formal de `sinValidar` en el compositor con CTA
  queda coordinada con [TASK-1918](../../tasks/to-do/TASK-1918-photo-prompt-and-lens-checks-graphic-line.md); hasta
  entonces el código no cambia.
- **Firma por soporte** (fuera de social y pauta, el porcentaje no manda): web firma el encabezado; deck firma la
  portada y el cierre; motion y video firman el cierre; DOOH y pDOOH firman según §4.2 y §4.3.

---

## 6. Contradicciones del inventario y cómo quedan

El inventario del 2026-09-26/27 encontró estos choques entre el canvas, los scripts de maqueta, los tokens y los docs.

| # | Qué chocaba | Cómo queda |
|---|---|---|
| 1 | El registro cine estaba escrito sólo para piezas con Nexa protagonista, pero el canvas aprobó P2c y P3b con personas del equipo | **Resuelto:** el operador amplió la excepción a la receta `proposal-cinematic`, con uniforme por registro y las mismas guardas ([lenguaje fotográfico, delta 2026-09-27](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md)) |
| 2 | En las propuestas, el rótulo del primer paso (texto chico) iba en el acento, contra D1 | **Resuelto:** va en blanco o en el suave de la voz; el acento queda para gráfico y texto de 24 px o más |
| 3 | La regla de firma decía «1:1 no se usa: está `sinValidar`» y el canvas aprobó el 1:1 con ajustes | **Resuelto en la norma:** la receta ajustada está aprobada; la salida formal de `sinValidar` se coordina con TASK-1918 sin tocar código ahora |
| 4 | La regla de motion prohíbe tiempos en un script, pero la maqueta aprobada escribió sus tramos y curvas a mano | **Resuelto:** la maqueta queda como referencia de dirección; los tramos de la gráfica con foto pasan a `efeonceGraphicLine.surfaces.motion` y las curvas se toman de `efeonceGraphicLine.motion` |
| 5 | El contrato de la órbita no tenía canal `web`, `dooh`, `pdooh` ni `video`; el caminero se resolvió como `print` y el mupi reutilizó la receta `story` de redes | **Resuelto:** la superficie la declara `efeonce.surface-composition` y su `delegate` fija el canal del contrato de elemento; nadie lo elige a mano |
| 6 | Los tramos del spot pDOOH, de la gráfica con foto y de los recursos de video vivían en tableros, no en tokens | **Resuelto:** pasan a `efeonceGraphicLine.surfaces.<superficie>` (`timeline`) |
| 7 | La receta de lente muro del paquete declara un tamaño de respuesta distinto del que salió en la pieza LED medida | **Pendiente:** manda el valor del token de superficie; la causa de la diferencia no está verificada y se revisa antes de aprobar el LED |
| 8 | El «máximo 35 %» del logo y el umbral de formato apaisado de la regla de firma social no están en tokens | **Pendiente:** no se aplican hasta que el operador los apruebe y entren a `efeonceGraphicLine.signature` |
| 9 | La firma por soporte (web en el encabezado, LED bajo la respuesta, paleta centrada) no estaba marcada como aprobada; sólo el caminero lo está | **Resuelto a medias:** el caminero es canon; el resto queda como opción en §4 hasta la aprobación |
| 10 | La estructura v02 del caminero tenía el logo centrado y la elegida lo lleva abajo a la izquierda | **Resuelto:** vale la elegida |
| 11 | El storyboard de planos dura 12,6 s y el de textos 13,1 s | **No es contradicción:** son dos maquetas distintas; la duración de cada video la fija su guion |
| 12 | «La órbita es la navegación» del deck frente a las propuestas aprobadas sin indicador | **Resuelto por las piezas aprobadas:** `proposal-cinematic` va sin indicador; a confirmar con el operador si quiere indicador en una versión futura |
| 13 | «Con dos personas, la mirada va al otro o al mismo objeto» frente al rechazo de la escena romántica | **Resuelto en el lenguaje fotográfico:** en plano cercano, la cercanía y la tensión se dirigen al trabajo o a la cámara, nunca al otro |
| 14 | La lámina aprobada de líneas de servicio con Nexa muestra cinco esferas y cinco acentos, contra «una esfera por pieza» y «un acento por pieza» | **Resuelto por el operador:** las cinco esferas son luz de la foto, no la esfera de la voz (la respuesta cierra con una sola); los cinco acentos se admiten sólo en esa lámina, que presenta la familia de líneas |
| 15 | Las dos contraportadas de brochure **con foto** están aprobadas, pero todas las portadas de brochure aprobadas llevan foto y la regla 1 exige alternar | **Pendiente (operador):** hoy la única pareja válida del brochure es portada con foto + órbita gigante sin foto; falta decidir si las contraportadas con foto esperan una portada de brochure sin foto |
| 16 | La documentación funcional y el manual de uso dicen «una portada con foto se firma con el logo de Efeonce abajo, al centro»; las portadas aprobadas del brochure llevan el logo de 500 px **arriba**, en la columna | **Pendiente (operador):** confirmar que la firma centrada abajo es de social y pauta, y que el deck y el brochure firman según §4.6 (la firma por soporte de §5 apunta en esa dirección, pero no lo dice de forma explícita) |
| 17 | El manual §10.1 y la base común de §4.6 dicen «la portada lleva un arco corto» y «el cierre lleva el logo dentro de la órbita»; las portadas de propuesta aprobadas usan la órbita gigante o el amanecer y las contraportadas aprobadas no declaran el logo dentro de la órbita | **Pendiente (operador):** decidir si las recetas del 2026-09-27 reemplazan esas reglas para el brochure y la propuesta o si conviven |
| 18 | Esta norma dice que «no guarda números», pero §4.6 registra la receta medida de la columna de voz | **Transitorio:** la receta queda como medida de referencia de las láminas aprobadas hasta que entre al token `efeonceGraphicLine.surfaces.deck` (TASK-1927); después manda el token |
| 19 | «Nexa frente a la órbita» y «Nexa y el equipo con agentes» figuran como opción de portada de brochure y, a la vez, como láminas interiores de sección reubicadas | **Resuelto por el operador (2026-09-27):** las 69 láminas quedaron aprobadas; las fotos sirven como portada (`cover-brochure-cine-orbit`, `cover-brochure-cine-team`) y como apertura interior (`section-cine-services`, `section-cine-team`), nunca las dos veces en el mismo documento |
| 20 | El manual §4 describe la pregunta «con anillo teal»; las portadas por línea llevan el anillo y la esfera en el acento de su línea | **Resuelto por el operador (regla 9 de §4.6):** en una pieza de línea, anillo y esfera toman el acento de la línea |
| 21 | El tríptico aprobado muestra una esfera por palabra; la norma, el token AXIS (`voice.mode: phrase-across-panels`) y la plantilla del composer pedían una frase única con la esfera al final | **Resuelto por el operador (2026-09-27):** una palabra por toma, cada una con su esfera. Token AXIS y plantilla `triptych` pendientes de actualizar (TASK-1927) |
| 22 | La sección partida aprobada sube por la izquierda; la norma, el token AXIS (`progress.flipped`) y `src/lib/brand-surfaces/recipes/deck.ts` (`sectionSplit`) decían «sube por la derecha». Además, el arco mide (n−1) × 72° en los prototipos y n/N en la lente y la clásica | **Resuelto por el operador (2026-09-27):** sube por la izquierda, con la esfera arriba a la izquierda, en las tres variantes. Token, plantilla y la unificación del barrido quedan para TASK-1927 |
| 23 | Las fotos aprobadas de las secciones partidas (esquina abajo, panel a la derecha) y de «Quiénes somos» / «Por qué lo hacemos» son de cine sin cumplir «Nexa protagonista o `proposal-cinematic`» | **Resuelto por el operador (2026-09-27):** excepción aprobada del registro cine para secciones y láminas «about» (§3, regla 5); el issue AXIS `cine-requires-nexa-or-proposal` debe conocerla (TASK-1927) |
| 24 | El token AXIS de `decision-next-steps` (tres columnas, CTA con el descriptor bajo el cursor) y su referencia describen la versión anterior | **Resuelto por el operador (2026-09-27):** manda la versión con la agenda abierta; AXIS actualiza token y referencia (TASK-1927) |

---

## 7. Estado y pendientes

- **Contrato:** `efeonce.surface-composition` 0.1.1 `candidate` (acepta intents 0.1.0); pasa a `stable` sólo con la
  aprobación del operador y con evidencia (paquete, pruebas y Lab). Publicado en AXIS `v0.3.8` (`axis-tokens` 0.3.8,
  `axis-ui-contracts` 0.3.7); la 0.1.1 modela el contenido de las láminas aprobadas (`levels`, `note`, `panels`,
  `figures` con fuente, `nav`, `photo.focus`/`native`, título y marcos de hojas, `chapter`, `selection.box`, `shots`,
  `subtitles`, `selection.level`). Greenhouse lo fija y lo consume en `src/lib/brand-surfaces` (§2.1).
- **Recetas por aprobar:** todas las de pDOOH, la paleta de DOOH y la firma por soporte (salvo el caminero). El deck
  ya no tiene opciones: las 69 láminas quedaron aprobadas el 2026-09-27.
- **Herramientas:** render canónico de la animación de la gráfica con foto para motion (§4.4), el formato `3:1` en
  `foto:prompt` (TASK-1918) y la ruta productiva de `brand:compose` (API, `artifact-worker`, MCP:
  [TASK-1921](../../tasks/to-do/TASK-1921-brand-surface-pieces-governed-production-route.md)). **Hechos el
  2026-09-27:** las 20 recetas aprobadas como catálogo del Artifact Composer (TASK-1919, §2.1) y el isotipo compuesto
  sobre la prenda con `pnpm foto:isotipo` (TASK-1920).
- **Preguntas abiertas del operador (TASK-1919):** la posición de la lente del caminero (el token dice 0,70 y la
  lámina aprobada la muestra cerca de 0,77); el super de dato, ¿arco completo como en la lámina o la estela canónica
  de la medida?; la burbuja URL en `section-classic`, `section-split`, `content-measure` y `triptych` (las láminas
  aprobadas no la llevan y el manifest del deck dice `url-bubble-footer`: se siguió la lámina); el gris del descriptor
  y la bajada web, que no tiene token; y la paleta DOOH, 20 % o 35 %. Hasta decidir, las plantillas siguen la lámina
  aprobada y no se inventa un token.
- **Láminas del deck:** las 69 de la página «Deck» quedaron aprobadas el 2026-09-27 y tienen receta en el
  [catálogo](./deck-recipes/README.md). Falta llevarlas a plantilla del composer y sincronizar AXIS (tokens, recetas,
  `cine-requires-nexa-or-proposal`): TASK-1927; fotos idempotentes: TASK-1926; pendientes de QA en §4.6.
- **Portadas y contraportadas (2026-09-27):** aprobadas y descritas en §4.6; sus recetas se publican en AXIS Lab ›
  Superficies › Deck (formalización en curso) y la integración en Greenhouse queda en TASK-1927. Preguntas abiertas en
  §6, filas 15 a 18 (la 19 quedó resuelta el mismo día).

## 8. Referencias

- Manual de la línea: [`EFEONCE_GRAPHIC_LINE_V1.md`](./EFEONCE_GRAPHIC_LINE_V1.md) (§10.0 «Composición por
  superficie», §10.1, §13, §14).
- Movimiento: [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md) ·
  [`EFEONCE_ORBIT_REVEAL_MOTION_V1.md`](./EFEONCE_ORBIT_REVEAL_MOTION_V1.md).
- Foto: [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md).
- Compositor con CTA: [`EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md`](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).
- Recetas por lámina del deck: [`deck-recipes/`](./deck-recipes/README.md) (JSON `efeonce.deck-slide-recipes.v1`,
  índice con `pnpm brand:deck-recipes`).
- Skill viva: [`efeonce-graphic-line`](../../../.claude/skills/efeonce-graphic-line/SKILL.md) (y `deck-studio`,
  `motion-design-studio`, `efeonce-advertising-creative`, `design-studio`).
- AXIS (en `main` desde el 2026-09-27): guías `docs/agent-composition/surfaces/`, schema
  `docs/agent-composition/surface-composition-intent.schema.json`, ejemplos `docs/examples/surfaces/`, comando
  `pnpm surface:resolve`, tokens `efeonceGraphicLine.surfaces`.
