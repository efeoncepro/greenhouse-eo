# Lista de verificación antes de entregar una pieza con la órbita

> Verificado contra: axis-design-system@a5c21ae — 2026-09-26 · greenhouse-eo@7cb24df17 — 2026-09-26 · decisiones del
> operador D1–D17 del 2026-09-26 registradas (los chequeos marcados «0.3.1» vienen en el contrato publicado con contracts 0.3.5,
> tag `v0.3.5`). §8c (Plastilina en volumen, D24): AXIS `main@c18e3d3` — 2026-09-27. §8d (piezas compuestas con
> `pnpm brand:compose` y harness del gate visual): árbol local de `develop` de greenhouse-eo tras el cierre de
> TASK-1927 — 2026-09-27; filas de largo, cifras, logos y paridad: `develop` local en `64be8aa16` (TASK-1928) —
> 2026-09-27; fila de la portada con selección (`document-selection`, AXIS `v0.3.21`), filas de ítem, respuesta,
> plate repetido, prefijo CSS, auditoría renderizada y slot opcional — `develop` en `c58a94ccb`, 2026-09-28; filas de
> las láminas SEO/AEO, `variant-both-in-deck`, `figure-source-missing` y el camino «ausente» de un slot opcional —
> `develop` tras `af32d9353` (TASK-1934, AXIS `v0.3.23`), 2026-09-28.
>
> Cada ítem dice **cómo se verifica**. «Automático» = lo hace fallar un comando o una función; «Revisión» = hay que
> mirar el cuadro real (el adapter de Greenhouse lo marca `manual`). Una pieza no se entrega con un ítem en rojo, y
> pasar esta lista **no aprueba ni publica**: eso lo decide el operador.

## 0. Antes de empezar

- [ ] La pieza es **marca propia de Efeonce o su familia**. No es trabajo de un cliente ni interfaz de Greenhouse.
- [ ] La órbita hace uno de sus trabajos (rodear, medir, navegar, enfocar). Si no, la pieza va sin órbita.
- [ ] La intención valida sin códigos: `pnpm orbit:resolve -- --input intent.json` (AXIS) o
      `pnpm creative:orbit:resolve -- --input intent.json` (Greenhouse); en código, `validateGraphicLineIntent(intent)`
      devuelve `[]`.
- [ ] Todo valor sale del manifest o de los tokens: en el archivo de la pieza no hay HEX, grosores, radios ni grados
      escritos a mano (salvo el círculo de una pieza medida, que viene de `efeonceGraphicLine.pieces`).

## 1. Geometría

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | Un solo elemento con anillo en la pieza (orbit, measure, progress, lens, spotlight, family-map o brand-close) | Automático: `single-ring-per-piece` |
| [ ] | Alrededor de contenido, un solo anillo, sin órbitas interiores (interiores sólo en órbita vacía o mapa de familia) | Automático: `inner-orbits-never-around-content`; revisión: `grep -c 'inner-orbit'` del SVG = 0 en lente, deck y cierre |
| [ ] | El anillo está centrado en su objeto, con aire 0,12 × su radio (0,1 en el foco) | Revisión (`ring-center-on-target-center`); los `circles` del resultado vs tu medición |
| [ ] | La esfera está en la punta del arco, nunca suelta; la lente lleva anillo + arco + esfera | Revisión (`sphere-on-arc-end`); en el SVG existen `data-axis-part="arc"` y `"sphere"` dentro del grupo de la lente |
| [ ] | Arco genérico de acento de 50°, centrado en su posición (arriba a la izquierda = 200°→250°) | Automático por el contrato; revisión si el adapter es propio |
| [ ] | Una medida: la esfera en valor × 360° desde las 12 en sentido horario, estela ≤ 50° que no pasa antes de la partida, marca de partida visible; 0 % = esfera en la partida; 100 % = esfera de vuelta arriba | Automático: `measure-origin-is-top`, `trajectory.sweepDeg`; revisión: la marca `data-axis-part="origin"` (el adapter de Greenhouse no la pinta) |
| [ ] | Dos datos en la misma pieza comparten radio y partida | Revisión |
| [ ] | Progreso: portada con arco corto; cada sección suma su tramo; el cierre completa la vuelta **con** la esfera arriba | Automático: `closed`, `sphere` no nulo; prueba `4.2 · deck navigation` |
| [ ] | Formatos fijos reproducen su pieza medida (lente, foco, deck, retrato) | Automático: prueba «every fixed-format recipe paints its canvas piece» del paquete; si no usas la receta, compara con `efeonceGraphicLine.pieces`/`portrait` |
| [ ] | El foco lleva su anillo concéntrico con la luz y la lámpara arriba a la derecha | Automático en la receta; revisión si pintas a mano |
| [ ] | Formatos chicos: esfera ≥ 4 px de diámetro en pantalla (1,5 mm impresa), arco nunca un pelo | `minSphereRadiusPx` / `minArcStrokePx` en `PaintBindings`; `portraitOrbitSvg` ya aplica pisos |
| [ ] | Logo ≥ 96 px (25 mm impreso; recomendado ≥ 160 px); isotipo ≥ 24 px (8 mm); resguardo X respetado | Revisión |
| [ ] | El logo dentro de la órbita **sólo** en el cierre del deck, el cierre de video o el muro de recepción, con el anillo fuera de su resguardo X; nunca en el banner de LinkedIn, el reverso de la tarjeta ni un objeto (D5) | Revisión (el contrato acepta `targetKind: 'logo'` en cualquier pieza) |
| [ ] | El anillo propio de la esfera (`sphereRing`) sólo en algo **en vivo** (eco del impacto, estado «en el aire»), con `live: true` (D8) | Automático desde 0.3.1: `sphere-ring-only-live`; hoy, revisión |

## 2. Texto y voz

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | **Ningún texto cruza el anillo** (cada caja entera adentro o entera afuera) | Automático: `textCrossesRing(box, circle)` para cada caja; `runAdapterChecks({ svg, circles, texts })`; las recetas lanzan «crosses the ring»; Greenhouse: `bindings.texts` → check `text-never-crosses-ring` |
| [ ] | Ningún texto se sale del lienzo | Automático en recetas («does not fit the canvas») |
| [ ] | Respuesta de 1 a 3 palabras, en Bricolage 760, ≥ 3× la pregunta | Automático: `voice-answer-too-long` (con `answerText`), recetas «more than 3 words»; revisión del tamaño |
| [ ] | La respuesta cierra con la esfera (0,2 em, en el acento, hueco óptico de su última letra) escrita con `answerHtml` o con los valores del manifest | Revisión; nunca un punto tipeado ni una esfera dibujada a mano |
| [ ] | La esfera es parte del texto: guías, marcas de corte, selección y cursores miden palabras + esfera | Automático: `runAdapterChecks({ answers: [{ group: answerGroupBox(...), tools }] })` → `answer-period-part-of-text`; `toolContainsAnswer` |
| [ ] | Sin esfera en la pregunta, eyebrow, etiquetas, cuerpo ni eslogan; una esfera final por pieza | Revisión |
| [ ] | Pregunta real con su anillo chico delante; un solo par pregunta/respuesta | Automático: `single-voice-pair-per-piece`; revisión del copy |
| [ ] | Una medida imprime su valor (`trajectory.valueLabel`, p. ej. «60 %») **y su fuente** como texto | Revisión (`measure-shows-value-and-source`) |
| [ ] | El arco de acento no queda junto a un número | Revisión (`accent-arc-never-reads-as-data`) |
| [ ] | Eslogan sólo en cierres, desde el archivo oficial, sin esfera, sin mayúsculas, sin traducir; palabra final = la de la línea | Automático: `slogan-closes-only`; revisión de pesos (*Empower* 800 itálica, *your* 800, palabra 900 itálica) |
| [ ] | El foco va con su prueba («Y lo medimos.» o el mecanismo) y sin competidores reales en la penumbra | Automático en `spotlightRecipe` (sin `proof` lanza); revisión |
| [ ] | Español neutro con tuteo, sin voseo; la respuesta no promete lo que no se prueba | Revisión |

## 3. Color y contraste

| ✓ | Ítem | Umbral / valor medido | Cómo se verifica |
|---|---|---|---|
| [ ] | Un acento por pieza, el de la línea de servicio; nunca dos acentos en una órbita | — | `manifest.palette.accent`; revisión |
| [ ] | El teal claro `#36c8bf` sólo sobre oscuro | 8,51:1 sobre `#001a33`; 2,06:1 sobre blanco (prohibido) | Revisión |
| [ ] | El acento (arco, esfera, halo y texto de 24 px o más) mide ≥ 3:1 contra su fondo (D1, token `accentContrast`) | todos pasan; los más bajos: Voice/papel 3,53 · Engine/`#091951` 3,60 · Growth `#0e8c82`/papel 3,87 | Medir sobre los píxeles finales, en el formato más chico |
| [ ] | **Ningún texto de menos de 24 px en el acento** (eyebrow, etiquetas, cifras chicas, palabra del eslogan chico): va en navy `#023c70` sobre claro o blanco sobre oscuro | `accentInSmallText: false` | Automático desde el contrato 0.3.1: `accent-text-min-size`; hoy, revisión |
| [ ] | Todo texto de menos de 24 px ≥ 4,5:1 contra su fondo real | blanco/`#001a33` 17,56 · navy/papel 10,47 · «Empower your» `#6b6b6b`/papel 5,00 · `#e2e2e2`/`#001a33` 13,56 | Medir sobre los píxeles finales |
| [ ] | Halo sobre papel a media intensidad (D7) | `orbit.haloOnLightScale` 0,5 | Automático con el contrato 0.3.1; con 0.3.0 el halo claro sale igual al oscuro: revisar y reducir |
| [ ] | Cierre del deck: la palabra del eslogan en el acento, no en blanco (D3) | 8,5:1 sobre `#001a33` (Growth) | `deckSlideHtml('close')` desde axis-graphic-line 0.3.2; revisión si se arma a mano |
| [ ] | Estado por forma (anillo/esfera) en el acento de la línea, nunca rojo/amarillo/verde | — | Automático: `state` resuelve `trafficLightColorsAllowed false`; revisión |
| [ ] | No usar el gris viejo del eslogan `#848484` sobre claro | 3,51:1 sobre papel (falla) | Revisión (ojo: `src/config/efeonce-brand.ts` y el render de motion aún lo usan) |
| [ ] | Sobre producción física, color con prueba del proveedor (valores son sRGB) | — | Revisión |

## 4. Firma

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | Una sola firma, y es de **Efeonce** (cualquier línea) | Automático: `single-signature-per-piece`; `assetId` empieza con `efeonce-logo-` o es la burbuja |
| [ ] | Logo centrado abajo: ancho 20 % del lado corto (25 % en 16:9), margen inferior 9 % del lado corto | Automático: check `signature-centered` (Greenhouse: ≤ 1 px del centro); el pintor lo ubica solo |
| [ ] | Logo negativo sobre oscuro, positivo sobre claro; nunca con velo encima | `assetId` del manifest; revisión |
| [ ] | La burbuja URL firma **sólo** si el logo de Efeonce ya está en la imagen (`brandInScene: true` / `marcaEnEscena: true` / `brand_in_scene: true`) | Automático: contrato; `pnpm foto:cta:gate` regla `firma-burbuja`; `creative:layout` exige burbuja centrada |
| [ ] | Nunca burbuja y logo juntos ni burbuja a un costado; en social nunca `url-bubble` suelto | Automático: `signature-already-decides-url-bubble`, `social-signs-with-signature-not-url-bubble`, gate `firma-burbuja` |
| [ ] | Contraste de la firma ≥ 4,5:1 sobre los píxeles finales (1 % peor de su tinta sólida); la burbuja, con su umbral `urlBubble.minContrast` 4,5 (D4) | Automático: Greenhouse `renderGraphicLine` → `signature.contrast` + check `signature-min-contrast`; gate `firma-contraste`. La burbuja fusionada sólo pasa sobre lechos muy oscuros (a opacidad 1: 6,17:1 sobre `#001a33` en el píxel máximo; del orden de 4,4–4,9:1 en el 1 % peor; 1,6–3,1:1 sobre fondos medios o claros) |
| [ ] | La firma no cae sobre el sujeto ni sobre un canto de luz | Automático: Greenhouse `orbit-never-over-subject-or-reserves` (firma sobre `subject`/`reserve`); gate `firma-sobre-sujeto`, `firma-canto` |
| [ ] | Burbuja en web con fusión de luminosidad (`url-bubble-source`); en correo, PDF o visores sin fusión, la horneada (`url-bubble-baked-light` / `-dark`) | `assetId` y `blend` del manifest |
| [ ] | La URL nunca como texto | Automático en Greenhouse: un texto con `efeoncepro.com` falla `url-as-bubble-never-text` |

## 5. Interacción con la foto (lenguaje fotográfico)

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | La órbita se declaró a propósito; la foto conserva su composición | Revisión |
| [ ] | El anillo no cruza el sujeto ni las reservas de texto (ni el lecho ni la firma) | Automático: paquete `runAdapterChecks({ protectedBoxes })` / `ringCrossesBox`; Greenhouse `bindings.protect` (`subject`, `reserve`, `bed`) y `creative:layout` agrega el campo de copy como reserva |
| [ ] | Lente: el sujeto cabe dentro del círculo que la lente **muestra** en ese formato (el 55 % se mide sobre el círculo visible, D10 P-3) y la esfera no toca la cara | Revisión (`lens-subject-inside-circle` queda `manual` hasta la task de P5) |
| [ ] | Lente: sin otro anillo dibujado dentro de la escena (cuenta como órbita: otro plate, P-4); palanca que concentra, nunca una que llena el cuadro (P-9); azul portador y acento dentro del círculo visible (P2) | Revisión; detalle en `photography-convergence.md` §8 |
| [ ] | Foto producida con el pipeline fotográfico (`pnpm foto:prompt`, `pnpm foto:generar`, `pnpm foto:validar`), sin emblema legible, sin banco de imágenes, sin velo navy encima | Revisión y el QA del pipeline fotográfico |
| [ ] | Si la foto la pinta un rasterizador (sharp), el tratamiento de afuera de la lente usa filtros SVG (como el adapter de Greenhouse), no `filter` CSS | Revisión del PNG final |

## 6. Movimiento

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | La órbita sola: anillo 0–500 ms, arco 400–1400, la esfera asienta 1400–1700, halo 1200–2000, firma 1900–2500 | `ORBIT_MOTION_TIMELINE` (prueba «motion follows the brand close») |
| [ ] | Con `prefers-reduced-motion: reduce` se ve el cuadro final | Revisión en el navegador con movimiento reducido; `ORBIT_MOTION_CSS` lo incluye |
| [ ] | El foco y su órbita se mueven como un solo conjunto | Revisión (`spotlight-light` y `spotlight-orbit`) |
| [ ] | Animaciones del logo: valores leídos de `efeonceGraphicLine.motion`, curvas por papel (llega `emphasized`, transforma `standard`, sale `emphasizedAccelerate`), un protagonista a la vez, golpe al llegar, resorte ≤ 1,5 %, desenfoque sólo en tramos rápidos | Prueba de `tokens.test.ts` («the orbit motion language»); storyboard `--storyboard` comparado con el anterior |
| [ ] | Jerarquía del cuadro: anillo héroe 78/80/84 % del lado corto; logo final 50/56/66 %; eslogan al 64 % del logo | Revisión del cuadro final |
| [ ] | Sonido: 48 kHz, 24 bit, pico −1 dBFS, fundido 450 ms | Revisión del WAV |
| [ ] | Nada generado con un modelo de video; el cuadro final es el logo oficial | Revisión |
| [ ] | `brand-close` no se usa en impresos | Automático: `brand-close-needs-motion-channel` |

## 7. Archivos y entrega

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | Logos, isotipos y burbujas salen de `@efeoncepro/axis-brand-assets` por su id; ninguna copia editada | `findBrandAsset(id)`; en Greenhouse `src/config/efeonce-brand-assets.test.ts` |
| [ ] | Si el medio no ejecuta JS (correo, Office, diseño), usar las órbitas estáticas `orbit-<línea>-<superficie>-<canal>` | `findOrbitAsset(line, surface, channel)` |
| [ ] | Correo: tablas y estilos en línea, 460 px, imágenes PNG (retrato a 2×, íconos a 3×) desde URL pública, regla de sección como borde de celda, franja de partners como una imagen, sin frase de cierre, se ve bien sin fuentes web y a 390 px | `AXIS_EMAIL_SIGNATURE_BUILDER_CHECKS` + `validateEmailSignatureIntent` sin códigos |
| [ ] | Partners en la firma sólo con estado `active`, `accepted` o `declared` | Automático: `endorsement-partner-claim-not-allowed` |
| [ ] | Ids SVG: piezas idénticas en una misma página llevan cada una su `idPrefix` | Revisión: ningún `id="…"` repetido en la página; prueba del paquete «different pieces never share an id» |
| [ ] | Masters pesados (ProRes, WebM/HEVC con alfa, 4K) en el bucket público de AXIS u OneDrive, nunca en git | Revisión |
| [ ] | Merch y oficina: la foto IA es maqueta de dirección; la producción sale del vector con prueba física | Revisión |
| [ ] | Greenhouse: `qa.json` con `status: 'pass'` y los `manual` revisados a ojo | `pnpm creative:orbit:render` (sale 1 si falla) |

## 8. Accesibilidad

| ✓ | Ítem | Cómo se verifica |
|---|---|---|
| [ ] | El SVG de la órbita es decorativo: `aria-hidden="true"` y `focusable="false"`, sin `<title>`, `<desc>` ni `tabindex` | Automático: `isDecorativeSvg(svg)`; `runAdapterChecks` → `decorative-svg`. Ojo: el adapter de Greenhouse sólo pone `aria-hidden` (le falta `focusable="false"`) |
| [ ] | Las palabras de la pieza viven en nodos de texto propios, no dentro del SVG | Revisión |
| [ ] | La foto de una lente o foco lleva `alt` descriptivo | Automático: `photo-alt-required` |
| [ ] | La firma tiene su texto alternativo (`alt` del manifest: «Efeonce» o «efeoncepro.com») | `manifest.elements[signature].alt` |
| [ ] | El significado nunca depende sólo del color: el estado lleva su etiqueta en texto; la medida, su valor y fuente en texto | Automático: `state-label-required`; revisión de la medida |
| [ ] | La burbuja URL enlaza con el texto `efeoncepro.com` donde hay enlace (web, correo) | `linkText` del manifest; revisión |
| [ ] | Firma de correo: foto con `alt` = nombre, contacto como texto vivo, íconos decorativos, franja de partners con `alt` que nombra a cada uno | `accessibility` del contrato `efeonce.email-signature`; `endorsement.alt` |
| [ ] | Movimiento reducido respetado | ver §6 |

## 8b. Íconos

Detalle y geometría en [iconography.md](iconography.md).

| | Chequeo | Cómo se verifica |
|---|---|---|
| [ ] | El glifo sale del set (§9 de iconography.md), en la grilla 24 con margen 2, trazo 1,5 y remates redondos | Revisión contra la geometría canónica |
| [ ] | Trazo óptico: 1,75 en 20 px o menos; tope de 4 px sobre 64 px | Revisión (medir el trazo en el export) |
| [ ] | La esfera: rellena, radio 1,75 en la grilla, en el acento de la línea, con 0,5 de aire contra todo trazo | Revisión |
| [ ] | Responde a lo más un ícono por pieza, y sólo si la pieza no tiene otra esfera (órbita o respuesta) | Revisión |
| [ ] | En listas, tablas, contacto, satélites y dentro de una órbita, reposo; bajo 20 px, reposo | Revisión |
| [ ] | Tinta blanca sobre oscuro y navy sobre papel; el acento ≥ 3:1 contra su fondo; nunca `#36c8bf` sobre papel | Medir sobre los píxeles finales |
| [ ] | Sin volumen, brillo, degradé ni patrón en el Trazo o el plano (el volumen sólo es el del set aprobado, §8c); nunca mezclado con otra familia de íconos (salvo Tabler en la firma, mientras dure) | Revisión |
| [ ] | Fondo `#001a33` en todas las líneas (D21) | Revisión |
| [ ] | Íconos pintados con `resolveIcon` de `@efeoncepro/axis-graphic-line/icons` (sin geometría ni colores a mano) y sin `warnings` sin reportar | Revisión del código o del SVG |
| [ ] | El grupo pasa `auditIconGroup(items, { pieceHasSphere })` sin issues | Ejecutar la función |
| [ ] | Glifo nuevo: `pnpm icons:check` en AXIS sale 0 y el operador aprobó el alta | Salida del comando + ledger |
| [ ] | Plastilina: el glifo sale del maestro (`IconoE`), grilla 48, tamaño óptico por área, desde 32 px (más chico, Trazo) | Revisión contra `iconography.md` §11 |
| [ ] | Plastilina: esfera de radio 3,4 con su anillo calado; gesto en tinta, sólo en el protagonista; una sola esfera responde por pieza | Revisión |
| [ ] | Plastilina: los calados se leen a 32 px; si se empastan, se simplifica el objeto | Render a 32 px |
| [ ] | Trazo, glifo nuevo: control a 64, 32, 24 y 20 px sobre `#001a33` y papel; aire ≥ 0,5 con trazo 1,5 | Render + medición |
| [ ] | Nunca Trazo y Plastilina en un mismo grupo; en una pieza con las dos, Plastilina manda y el Trazo apoya en chico | Revisión |
| [ ] | Órbita sesgada: sólo alrededor del protagonista de Plastilina, pasa detrás y delante con su calado, nunca cruza el texto ni mide | Revisión sobre los píxeles finales |

## 8c. Plastilina en volumen (D24)

Detalle en [iconography.md](iconography.md) §12.

| | Chequeo | Cómo se verifica |
|---|---|---|
| [ ] | El PNG sale de `@efeoncepro/axis-brand-assets` (`volumeIconUrl(glyph)`) o de la descarga del Lab; nunca generado de nuevo dentro de la pieza | Revisión del origen del archivo |
| [ ] | Uno por pieza, y es el protagonista (portada, KV, social de un objeto, escenario, merch, objeto en escena) | Revisión |
| [ ] | No está en listas, tablas, navegación, contenido de deck, dashboards ni UI | Revisión |
| [ ] | No comparte grupo con Plastilina plana ni con el Trazo; no se mezcla con las ilustraciones «Clay 3D» del equipo | Revisión |
| [ ] | Se ve a 160 px o más en la pieza final; más chico, se usa el plano | Medir en los píxeles finales |
| [ ] | Los calados siguen abiertos y sin halo sobre el fondo de la pieza (el alfa no se rellenó ni se recortó con IA) | Revisión al 100 % sobre el fondo final |
| [ ] | La sombra de contacto, si la hay, se agregó al componer (el PNG no la trae) y no ensucia el calado | Revisión |
| [ ] | Glifo nuevo en volumen: antes entró al set plano con aprobación; `pnpm icons:volume -- check` corrido y **cada aviso mirado al 100 %** (se rechaza sólo si la forma se reinventó, un calado se volvió relieve o figura y fondo se invirtieron); `publish` selló el PNG; el operador aprobó | Salida del comando + revisión + ledger |
| [ ] | El prompt es el canónico de AXIS (`volume-prompt.txt`), sin reescribir; como mucho una línea agregada que nombra el detalle que falló | Diff contra el prompt canónico |

## 8d. Piezas compuestas con `pnpm brand:compose` (deck y documento)

Detalle en [applications.md §L](applications.md), «Componer el deck hoy» y «Cambiar la foto, el copy o la sección».

| | Chequeo | Cómo se verifica |
|---|---|---|
| [ ] | **Antes de componer**, el plan del deck (ids de receta en orden) pasó `pnpm brand:deck-plan -- --plan plan.json` con **cero errores** y los avisos se leyeron (`rhythm-paper-run`, `section-split-corner-adjacent`) | Automático: exit 1 con cualquier error (`frame-order`, `variant-both-in-deck`, `plate-repeated`, `slot-over-max-chars`, `figure-source-missing`, los de AXIS…); los avisos, revisión |
| [ ] | El deck lleva **una sola** lámina de cada par `variant` (tabla o escena o cotización en vivo; escalera o BeX plana; propuesta SEO sobria o de cine), aunque vayan separadas | Automático: `variant-both-in-deck` en el plan |
| [ ] | La receta tiene plantilla y el `layout` va explícito en el intent | Automático: el comando falla con `recipe-not-approved`, `recipe-without-template`, `layout-invalid` o `layout-not-in-recipe` |
| [ ] | La pieza nace de un intent propio, fuera de `src/lib/brand-surfaces/examples/` | Revisión; automático: `src/lib/brand-surfaces/__tests__/example-plans.test.ts` falla si se editó un ejemplo |
| [ ] | La foto viene declarada con `photo.plateRef` y `photo.alt`; el `alt` describe la escena, no el copy | Automático: `missing-photo`; revisión del texto del `alt` |
| [ ] | El plate existe en disco (vive fuera de git, en `ai-generations/**`) | Automático: el CLI falla antes de crear la salida |
| [ ] | El recorte no corta al sujeto (el CLI cubre el área y centra; la sección partida no tiene control de foco) | Revisión sobre la lámina compuesta; si corta, se cambia la foto |
| [ ] | En `panel-end`, la foto espejada no muestra texto ni logos al revés, y el isotipo del uniforme se lee bien | Revisión al 100 % sobre la lámina compuesta |
| [ ] | En portadas con columna, `column.topPx` se revisó con la foto final y ningún texto cruza al sujeto ni a la órbita | Automático: fuera de la reserva falla con `invalid-intent`; revisión de lo demás |
| [ ] | En portadas de propuesta, `clientLogo` trae `alt`; sin `clientLogo` sale el marcador «Logo del cliente» | Automático (el `alt`); revisión |
| [ ] | Tríptico: una palabra por toma | Automático: `invalid-intent` |
| [ ] | Ningún texto excede el largo del catálogo (el `maxChars` de la receta = `maxCharacters` del `slots.json`) | Automático: el compositor rechaza (`overflow=reject`); paridad en `recipe-slot-parity.test.ts` |
| [ ] | Toda cifra llega por `figures` con su fuente real y la lámina imprime «Fuente: …»; montos como `[MONTO]`; el contacto sale de `EFEONCE_CONTACT` | Automático: `figure-source-required` (AXIS) al componer y `figure-source-missing` en el plan para una cifra escrita como objeto con `value`; una cifra en texto plano en un slot `metric` («68 %») no la ve ninguno: revisión |
| [ ] | Láminas SEO/AEO con datos de muestra (`decision-ai-answer`, `decision-diagnosis-map`): la marca «Ejemplo ilustrativo» / «Datos de muestra» está visible, o el intent dice `dataOrigin: "client"` con su `evidenceRef` | Automático: `invalid-intent` sin la marca o sin la evidencia |
| [ ] | La interfaz de IA es genérica: ni logo, ni color, ni burbuja, ni composer de ChatGPT, Gemini u otro motor; los nombres de motores sólo como texto en el diagnóstico | Automático en la plantilla (test: sólo SVG, sin nombres ni colores de productos); revisión de lo que agregue el intent |
| [ ] | Las cifras de `decision-ai-market` (máximo tres) salen de un documento citado (hoy `aeo-landing-elementor.md` §market), nunca de memoria | Revisión del intent contra la fuente |
| [ ] | Logos de clientes y partners sólo de quienes autorizan su uso, normalizados por el compositor (un tono, mismo peso óptico; excepción tonal de Aguas Andinas y UC Temuco) | Revisión |
| [ ] | Documento: portada y contraportada alternan foto y sin foto; el conjunto pasa sin un solo issue | Automático: `frame-photo-must-alternate` y los demás códigos de documento; un issue deja al documento sin plan |
| [ ] | Portada con selección (`cover-brochure-cine-lines-selection`): va con `layout: 'document-selection'`; la selección cae sobre la respuesta («Crecer.»), nunca sobre la persona, con un solo cursor «Nexa»; sin burbuja URL | Automático: con `document` o `line` AXIS rechaza la selección (`selection-not-in-recipe`); el resto, revisión a ojo |
| [ ] | La respuesta va sin punto (lo pone la esfera) y en 1–3 palabras (el testimonio, hasta 6) | Automático: `voice-answer-too-long` dentro de `surface-issues`; el punto, revisión |
| [ ] | El ítem elegido (`selected`, o `recommended` en la cotización) existe en la lámina | Automático: `invalid-intent` si está fuera de rango |
| [ ] | Un mismo plate no se repite dentro del deck (el P1 de la lente aparece en varios ejemplos: es de muestra) y los isotipos compuestos en la ropa tienen procedencia (`pnpm foto:emblema` antes de publicar) | Automático para el plate si el plan declara `plateRef` (`plate-repeated`); lo demás, revisión (pendientes de TASK-1933) |
| [ ] | La salida no se retocó a mano ni se editó la plantilla para una pieza puntual | Revisión |
| [ ] | Se entregó con `<id>.provenance.json` y su manifest | Revisión de la carpeta de salida |

**Gate visual de las plantillas** (cuando se toca un catálogo `graphic-line-*`, `src/lib/brand-surfaces` o se sube AXIS):

| | Chequeo | Cómo se verifica |
|---|---|---|
| [ ] | `pnpm composer:visual-gate --catalog=graphic-line` pasa a 0 px (73 frames desde TASK-1934: los 66 de TASK-1928, las siete plantillas SEO/AEO y el re-congelado de `ProposalCinematic`, congelados el 2026-09-28 tras la aprobación visual del operador en `c652f4f83`) | Salida del comando |
| [ ] | Toda alta o cambio de frame está declarado en `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md` | Revisión (entradas 2026-09-27 (b)–(e) para TASK-1927; (f) y (h)…(m), y 2026-09-28 (n) para TASK-1928; 2026-09-28 (o) para TASK-1934; la (g) es Glitch) |
| [ ] | Una receta nueva con plantilla declara sus `slots` en `recipe-map.json` y pasa la paridad | Automático: `src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts` |
| [ ] | La plantilla nueva estrena su prefijo CSS (nunca reusa uno), su builder mezcla el token base con el de la composición y devuelve su `contentType` | Revisión del HTML y del builder; automático: la lámina cae en la plantilla por defecto si falta el `contentType` |
| [ ] | La auditoría renderizada pasa: acento nunca en texto < 24 px (D1) y respuesta ≥ 3× la pregunta en las láminas de la lista de `graphic-line-shared/rendered-audit.ts` (agrega ahí una lámina de decisión nueva) | Automático: el gate aborta con la violación |
| [ ] | Un slot nuevo, aunque sea opcional, se declaró en `BASELINE_DELTAS.md` y su frame se re-promovió (el probe rellena todo slot no fijo) | Revisión + `--freeze` scoped (runbook §4bis) |
| [ ] | **Un slot opcional nuevo en una plantilla compartida tiene un test que compone una receta existente SIN el slot.** El probe del gate siempre lo rellena, así que el gate nunca ejercita el camino «ausente», y los snapshots de planes no renderizan | Automático sólo si el test existe (patrón: `src/lib/brand-surfaces/__tests__/proposal-cinematic-note.test.ts`); si no, el gate queda verde con la receta vieja rota ([lessons.md](lessons.md), TASK-1934) |
| [ ] | La lámina compuesta con el ejemplo se comparó a ojo con su referencia aprobada y toda diferencia por norma quedó declarada | Revisión + entrada en `BASELINE_DELTAS.md` y [ledger.md](ledger.md) |
| [ ] | Una plantilla con logo de cliente se prueba con el asset sintético `file:probe` de `GRAPHIC_LINE_PROBE_ASSETS` (`scripts/artifact-composer/visual-gate.ts`), nunca con el logo de un cliente real | Revisión del harness |
| [ ] | Un slot opcional que el probe debe omitir lleva `"example": null` en su `slots.json` (así el frame de la portada de propuesta muestra el marcador y no el logo) | Revisión del `slots.json` |
| [ ] | Si varias composiciones comparten un HTML (`section-split`, `close-brochure`), cada una tiene su contrato de slots, su plantilla en `registry.json` y su frame | Revisión de `registry.json` y de los frames |
| [ ] | El documento completo no tiene frame propio (usa fotos reales, no es determinista): se cubre con los frames de sus páginas | No se agrega un frame de documento |

## 9. Comandos y pruebas de referencia

| Qué | Dónde | Comando |
|---|---|---|
| Validar y resolver un intent | AXIS | `pnpm orbit:resolve -- --input intent.json` |
| Validar y resolver un intent | Greenhouse | `pnpm creative:orbit:resolve -- --input intent.json` |
| Pintar, firmar, medir contraste y correr chequeos | Greenhouse | `pnpm creative:orbit:render -- --intent i.json --bindings b.json --out-dir out/` |
| Pruebas del compilador y del adapter | Greenhouse | `pnpm creative:layout:test` |
| Campaña con capa `graphic_line` | Greenhouse | `pnpm creative:layout -- --contract c.yaml --mode check` |
| Piezas con CTA y firma | Greenhouse | `pnpm foto:componer:cta plan.json` + `pnpm foto:cta:gate plan.json` |
| Validar el plan de un deck (ids de receta) antes de componer | Greenhouse | `pnpm brand:deck-plan -- --plan <plan.json>` |
| Que el agente proponga el plan (sólo ids; un reintento; fail-closed) | Greenhouse | `pnpm brand:deck-plan -- --propose --context <context.json> [--out <plan.json>]` |
| Regenerar el índice del README y el catálogo de runtime tras editar las recetas (`--check` verifica) | Greenhouse | `pnpm brand:deck-recipes` |
| Componer una receta aprobada o un documento (`pages`) | Greenhouse | `pnpm brand:compose -- --intent <intent.json> [--artifact-id <id>] [--out <dir>]` |
| Gate visual de las plantillas de La órbita | Greenhouse | `pnpm composer:visual-gate --catalog=graphic-line` |
| Firma de correo | AXIS | `pnpm signature:resolve -- --input intent.json` |
| Pruebas de tokens, contratos, paquete y archivos (trayectoria, piezas medidas, ids, órbitas byte a byte, contrastes) | AXIS | `pnpm build && pnpm test` |
| e2e del Lab (página de la línea, ids duplicados, foco concéntrico) | AXIS | `pnpm --dir apps/lab test:e2e` |
| Regenerar órbitas estáticas tras cambiar tokens | AXIS | `pnpm orbit:assets` |
| Video de la órbita sola | AXIS | `pnpm orbit:video -- --format 16x9 --surface dark --out /tmp/orbita` |
| Plastilina en volumen: referencias, alfa por color, QA contra el plano y sello | AXIS | `pnpm icons:volume -- refs\|key\|check\|publish` |
| Storyboard de una animación del logo | Greenhouse | `node scripts/creative/brand-motion/render-orbit-motion.mjs --out <dir> --anim reveal --storyboard` |
