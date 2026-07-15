# Artifact Composer — BASELINE_DELTAS (contrato de dos vías)

## 2026-07-14 (2ª promoción) — Feedback del operador: deck SKY 22 → 23 + agenda funcional + showcases vivos

**Motor:** los `layoutHooks` del catálogo ganan acceso opcional al `deckPlan` completo
(`CatalogLayoutHook` 3er parámetro) — chrome que depende de OTRAS láminas (el número de página real
de un capítulo) se DERIVA, nunca se autora. Render standalone sin plan → el hook no pinta.

**templates/:**

- `AgendaFull.png` — **sin cambio de píxel** (el hook de páginas no pinta sin plan; sólo CSS nuevo `.pg`)
- `DualTextSplit.png` — los glifos de texto (• / ✓) pasan a **SVG resolvibles** (`dual-concept-icon`:
  search/ai/data/users/target → Solar); el probe sintético llena el `icon` opcional → glifo nuevo
- `TeamGalleryFull.png` — lavado ice detrás de las fotos (los recortes flotando sobre blanco puro se
  veían inconclusos — feedback del operador) + `object-position: bottom`
- `ArtifactShowcaseFull.png` — `lead` pasa a rich-string (`em/strong/a`); el probe llena texto plano
  → **sin cambio de píxel esperado**

**sky/ (22 → 23):**

| Frame | Qué pasó |
|---|---|
| `08-informe` | 🆕 ArtifactShowcaseFull — **el informe del grader como artefacto**: screenshot real (gauge 61 + dimensiones + motores con logos) con chrome de navegador y la URL tokenizada horneada + **enlace clickeable** en el lead. Pedido explícito del operador (no estaba en la PPT) |
| `15-muestra` | de HighlightWave a **ArtifactShowcaseFull**: el x-ray real (artículo \| capa de máquina, con chrome + URL) — «ese layout no le hacía justicia al X-ray» (operador) |
| `18-equipo` | mapeo CONFIRMADO por el operador: Julio (Responsable de Cuenta 12%) · **María Fernanda (SEO Copywriter 50%** — foto encontrada en OneDrive Kit media, fondo removido vía Adobe, allowlist +1) · Daniela (Creative Operations Lead 12%) · Melkin (Senior Visual Designer 30%) · Andrés (SEO Specialist 25%). **Sale Valentina.** + lavado ice tras las fotos |
| `02-agenda` | **números de página reales por capítulo** (hook derivado del plan: pág. 04/09/10/12/18/22→ posiciones vivas) — «la agenda no está fungiendo como agenda» (operador) |
| `09-terreno` | íconos con semántica: buscador → lupa (magnifer), IA → cpu — el bullet genérico no decía nada (operador) |
| renombres byte-idénticos | los 18 frames restantes verificados con `shasum -a 256` contra su baseline previo (18/18 idénticos, sólo desplazamiento por la inserción de `informe` en la posición 8) |

Assets nuevos del catálogo: `assets/squad/squad-maria-fernanda.png` (recorte real) ·
`assets/product/radiografia-sky-xray.png` · `assets/product/informe-grader-sky.png` (capturas en vivo
2026-07-14 con chrome + URL horneada).

Aprobado por el operador en sesión 2026-07-14 (feedback sobre los 6 frentes, con mapeo de nombres dictado).

**Manifiesto literal (nombres completos para el matcher del freeze):**

`templates/DualTextSplit.png` · `templates/TeamGalleryFull.png` · `templates/ArtifactShowcaseFull.png` ·
`templates/AgendaFull.png` ·
`sky/02-agenda.png` · `sky/08-terreno.png` · `sky/08-informe.png` · `sky/09-operacion.png` ·
`sky/09-terreno.png` · `sky/10-ciclo.png` · `sky/10-operacion.png` · `sky/11-arranque.png` ·
`sky/11-ciclo.png` · `sky/12-arranque.png` · `sky/12-lineas.png` · `sky/13-lineas.png` ·
`sky/13-seo-aeo.png` · `sky/14-muestra.png` · `sky/14-seo-aeo.png` · `sky/15-muestra.png` ·
`sky/15-portal.png` · `sky/16-portal.png` · `sky/16-portal-vista.png` · `sky/17-equipo.png` ·
`sky/17-portal-vista.png` · `sky/18-berel.png` · `sky/18-equipo.png` · `sky/19-berel.png` ·
`sky/19-seguro.png` · `sky/20-cumplimiento.png` · `sky/20-seguro.png` · `sky/21-cumplimiento.png` ·
`sky/21-economica.png` · `sky/22-contraportada.png` · `sky/22-economica.png` · `sky/23-contraportada.png`

## 2026-07-14 — Deck SKY 19 → 22 + TeamGalleryFull + enlaces clickeables (iteración de la oferta, licitación Wherex)

**Motor (afecta render, no baseline per-se):** el sanitizador de rich-strings admite `<a href>`
(sólo `https://` o ancla), `deck-mold.css` estila el anchor (color heredado + subrayado — el default
UA azul era ilegible sobre navy), y `mergeSlidePdfs` porta las anotaciones `/Link → /URI` que
`copyPages` de pdf-lib descartaba (medido: Chromium emite 2, el merge llegaba con 0). El PDF final
lleva 4 anotaciones vivas (informe del grader en `diagnostico`, Radiografía en `muestra`).

**templates/ (27 → 28):**

- `TeamGalleryFull.png` — **NUEVO**. Materializa el `personaAssetContract` pre-declarado en
  quote-split/narrative-split: roster de FOTOS REALES del squad vía resolver `squad-person`
  (allowlist cerrada de 7; nombre desconocido → `UnknownResolverValueError`). Canvas navy de
  TimelineFull (gradientes declarados en `gradient-inventory.json`, 3/4 hashes ya aprobados).

**sky/ (19 → 22) — la iteración completa de la oferta (cifras del run publicado EO-GRUN-00046):**

| Frame | Qué pasó |
|---|---|
| `06-citas` | ❌ **MUERTA** — su claim («no aparece ni una sola vez») contradecía el informe público que la lámina invitaba a abrir (skyairline.com = fuente #1, 15 citas). Redundante con `diagnostico` |
| `04-near-miss` | 🆕 MetricsSplit — las 4 páginas atascadas (Antofagasta 110k/pos12…), evidencia Semrush |
| `05-capa-tecnica` | 🆕 DualListSplit — no hay capa de SEO técnico instalada (verificado sobre el código fuente 2026-07-14) vs lo que la operación instala |
| `17-equipo` | 🆕 TeamGalleryFull — 5 fotos reales con rol+nombre+dedicación (⚠️ mapeo persona↔rol = propuesta; lo confirma el operador). Reemplaza al TeamSplit de glifos |
| `18-berel` | 🆕 HighlightWave — Grupo Berel como referencia verificable (nombre autorizado por el operador 2026-07-14; sin métrica inventada) |
| `19-seguro` | 🆕 QuoteSplit — penalidades aceptadas íntegras «porque el servicio está diseñado para no gatillarlas» |
| `02-agenda` | targets re-apuntados (cap 01 → near-miss) + cap 03 «El método» → «La operación» |
| `03-entendimiento` | el anillo pasa de Estrategia/Producción/Medición al método real de la técnica §4: Base técnica / Autoridad / Entidad (E-E-A-T) |
| `06-diagnostico` | cifras del run 46: LATAM 17→**16**, «Despegar y TripAdvisor» → fuentes reales (Trustpilot/Wikipedia/Instagram), claim nuevo = **citabilidad propia 0%** (dato publicado del informe) + **enlace clickeable** al informe |
| `07-escalera` | labels alineados al informe público («Que te encuentre»… antes «Ser encontrada»…) |
| `08-terreno` | «ningún blog de aerolínea» → «ningún contenido editorial de viaje» (defendible contra el informe) |
| `09-operacion` | ex-`metodo`: sectionLabel «EL MÉTODO» → «LA OPERACIÓN» (el método de 3 capas vive en `entendimiento`; los 4 frentes son la operación) |
| `10-ciclo` | «doble» → «triple» control de calidad (alineado con técnica §5: QA editorial + posicionamiento + marca). Atrapado por el shasum de renombre |
| `11-arranque` | fase 1 «Diagnóstico y quick wins» → «Capa técnica y quick wins» |
| `14-muestra` | la URL de la Radiografía ahora es **enlace clickeable** (subrayado del molde) |
| `20-cumplimiento` | summary honesto: «100%» → «9 de 9 · Los nueve, uno a uno, en la §13 de la Oferta Técnica» (mostraba 5 afirmando el total) |
| `21-economica` | ad-hoc a $260.000 **eliminado** (dominaba al plan ampliado: base+4 ad-hoc = 6,24M < 6,9M; y publicaba el precio unitario — regla dura #2 de pricing). 2 opciones excluyentes + ad-hoc «dentro de la capacidad» en condiciones |
| renombres byte-idénticos | `portada`(=01) · `ciclo`→10 *(ver arriba)* · `lineas`→12 · `seo-aeo`→13 · `portal`→15 · `portal-vista`→16 · `contraportada`→22 — verificados con `shasum -a 256` contra su baseline previo (6/7 idénticos; ciclo declarado) |

Aprobado por el operador en sesión 2026-07-14 (Berel con nombre · gap del catálogo · href al motor).

**Manifiesto literal de la promoción** (el gate matchea el nombre completo del frame; el renombre
19→22 desplaza casi toda la numeración — cada nombre viejo que desaparece y cada nombre nuevo que
aparece está cubierto por la tabla de arriba):

`templates/TeamGalleryFull.png` ·
`sky/02-agenda.png` · `sky/03-entendimiento.png` · `sky/04-diagnostico.png` · `sky/04-near-miss.png` ·
`sky/05-escalera.png` · `sky/05-capa-tecnica.png` · `sky/06-citas.png` · `sky/06-diagnostico.png` ·
`sky/07-terreno.png` · `sky/07-escalera.png` · `sky/08-metodo.png` · `sky/08-terreno.png` ·
`sky/09-ciclo.png` · `sky/09-operacion.png` · `sky/10-arranque.png` · `sky/10-ciclo.png` ·
`sky/11-lineas.png` · `sky/11-arranque.png` · `sky/12-seo-aeo.png` · `sky/12-lineas.png` ·
`sky/13-muestra.png` · `sky/13-seo-aeo.png` · `sky/14-portal.png` · `sky/14-muestra.png` ·
`sky/15-portal-vista.png` · `sky/15-portal.png` · `sky/16-equipo.png` · `sky/16-portal-vista.png` ·
`sky/17-cumplimiento.png` · `sky/17-equipo.png` · `sky/18-economica.png` · `sky/18-berel.png` ·
`sky/19-contraportada.png` · `sky/19-seguro.png` · `sky/20-cumplimiento.png` · `sky/21-economica.png` ·
`sky/22-contraportada.png`

<!-- manifest-digest: bb0971593ddfb48a5469d7361c141761ed63c272408ca0fc5c65fba4d84514ea -->

Este ledger existe porque **un rebaseline silencioso es peor que no tener gate**: el gate se
"arregla" promoviendo el baseline y nadie se entera.

**El contrato:**

- Todo cambio de píxel INTENCIONAL se declara acá, **lámina por lámina** (qué frame, qué cambió,
  por qué, quién lo aprobó) **ANTES** de correr `pnpm composer:visual-gate --freeze`.
- `--freeze` se niega a promover un frame cambiado que no esté declarado en este archivo.
- El marcador `manifest-digest` lo sella la promoción; el gate lo verifica. Editar el manifest o
  los PNG a mano, sin pasar por la promoción declarada, **también falla el gate**.
- El baseline se re-promueve **en el mismo PR** que declara el delta.

## 2026-07-12 — Baseline inicial (TASK-1393 · Slice 0)

- Congelado sobre el commit pre-refactor: 25 plantillas del catálogo (payload sintético compartido
  con `template-composability.test.ts`) + 15 láminas reales del deck SKY
  (`docs/commercial/tenders/sky-blog-2026/deck-plan.json`).
- Sin deltas: es la fotografía de partida que todo el refactor debe conservar a CERO píxeles.

## 2026-07-14 — Deck SKY: entra la lámina de la muestra (TASK-1410 · licitación Wherex)

**Qué cambió:** el deck SKY pasa de **15 a 16 láminas**. Se inserta `sky/12-muestra.png`
(`contentType: highlight` → `HighlightWave`, derivado por el selector — el plan **no** declara
`template`), justo después de `11-seo-aeo`: la 11 declara la capacidad AEO y la 12 la prueba,
enlazando la Radiografía publicada (`think.efeoncepro.com/muestras/sky-carretera-austral-…`).

**Por qué por ENLACE y no por captura:** el catálogo no tiene hoy ninguna plantilla capaz de mostrar
una captura de UI — el único slot de imagen (`leftVisual`, en `StatSplit`) está dimensionado para las
ilustraciones clay3d y reduciría la radiografía a una miniatura ilegible. Y de fondo: la pieza es
**interactiva** (su tesis es el acoplamiento al pasar el cursor), así que un PNG estático mata justo
lo que viene a demostrar. Aprobado por el operador, 2026-07-14.

**Frames afectados — CERO cambios de píxel:**

| Frame | Delta |
| --- | --- |
| `sky/12-muestra.png` | **nuevo** — la lámina de la muestra |
| `sky/13-equipo.png` | **solo renumeración** — era `sky/12-equipo.png` |
| `sky/14-cumplimiento.png` | **solo renumeración** — era `sky/13-cumplimiento.png` |
| `sky/15-economica.png` | **solo renumeración** — era `sky/14-economica.png` |
| `sky/16-contraportada.png` | **solo renumeración** — era `sky/15-contraportada.png` |

Frames retirados por el corrimiento (su contenido vive ahora en el número siguiente):
`sky/12-equipo.png`, `sky/13-cumplimiento.png`, `sky/14-economica.png`, `sky/15-contraportada.png`.

Los cuatro renumerados se verificaron **byte-idénticos** (`shasum -a 256`) contra su baseline previo
**antes** de promover: el renombre no esconde ninguna regresión. Ninguna plantilla cambió.

> 🔴 **Bug del propio `--freeze` (detectado acá, 2026-07-14):** la promoción **borra esta sección**.
> `visual-gate.ts:421` reescribe el ledger desde `INITIAL_DELTAS` cuando no puede releer el previo, y
> solo conserva el `manifest-digest` — es decir, **la promoción destruye la declaración que ella misma
> exigió**, que es exactamente el "rebaseline silencioso" que este archivo existe para impedir. Esta
> sección se restauró a mano después del `--freeze` (el digest sella el *manifest*, no la prosa, así
> que reponerla es seguro). **Hasta que se arregle: después de todo `--freeze`, verificá que tu
> declaración siga acá.**

**Follow-up abierto:** falta una plantilla de *artifact showcase* (captura a sangre + copy). La
Radiografía no va a ser el último artefacto que mostremos en un deck. No se construyó ahora por estar
a un día del cierre de la licitación.

---

## 2026-07-14 · `MaturityLadderFull` — plantilla NUEVA (el catálogo topaba en 4 y nuestros frameworks son de 5)

Ningún `contentType` podía afirmar una escalera de madurez: los tres candidatos topan en **4 items**
(`several-kpis` `maxItems:4` · `chart` 4 series · `four-pillars` 4 pilares) y la escalera son **5**.
Los 4 salieron de *lo que cabía en el layout*; los 5 salen de *la doctrina*. (Las **5 superficies** de
Surround Discovery van a topar igual.)

Aplanarla a 5 KPIs habría dicho *«sacó mala nota en 3 de 5 cosas»* (**boletín**) en vez de *«está
trabado abajo, y por eso lo de arriba no rinde»* (**diagnóstico con alcance**). Subir un `maxItems` de
4 a 5 habría pasado el gate y perdido la venta.

**Domain-free:** la plantilla no conoce AEO ni ningún framework. Es *«N etapas ordenadas y
acumulativas, con score, severidad y usted-está-aquí»*. **El score es la única verdad:** severidad,
peldaño destacado y ancho de barra se **derivan** — el autor no puede rotular "óptimo" un 37 ni marcar
dos peldaños como "el próximo". Umbrales idénticos a `severityFromScore` del informe de AI Visibility.

| Frame | Delta |
| --- | --- |
| `templates/MaturityLadderFull.png` | **nuevo** — la plantilla 26 |

---

## 2026-07-14 (b) · La escalera entra al deck de SKY — y renumera lo que va detrás

La lámina 4 traía la escalera **aplanada dentro de sus `goals`** (el boletín que la plantilla existe
para evitar). Ahora carga **tres hechos verificados** (0 citas del blog en 35 respuestas · LATAM 17 vs
JetSMART 9 · ~40.000 visitas orgánicas/mes) y la escalera vive donde tiene forma.

| Frame | Delta |
| --- | --- |
| `templates/MaturityLadderFull.png` | **corregido** — el primer freeze congeló una versión con banda muerta. Se detectó **mirando el frame**, no con un test |
| `sky/04-diagnostico.png` | **contenido nuevo** |
| `sky/05-escalera.png` | **nueva** |
| `sky/06-citas.png` | **solo renumeración** — era `sky/05-citas.png`, byte-idéntico |
| `sky/07-terreno.png` | **solo renumeración** — era `sky/06-terreno.png`, byte-idéntico |
| `sky/08-metodo.png` | **solo renumeración** — era `sky/07-metodo.png`, byte-idéntico |
| `sky/09-ciclo.png` | **solo renumeración** — era `sky/08-ciclo.png`, byte-idéntico |
| `sky/10-arranque.png` | **solo renumeración** — era `sky/09-arranque.png`, byte-idéntico |
| `sky/11-lineas.png` | **solo renumeración** — era `sky/10-lineas.png`, byte-idéntico |
| `sky/12-seo-aeo.png` | **solo renumeración** — era `sky/11-seo-aeo.png`, byte-idéntico |
| `sky/13-muestra.png` | **solo renumeración** — era `sky/12-muestra.png`, byte-idéntico |
| `sky/14-equipo.png` | **solo renumeración** — era `sky/13-equipo.png`, byte-idéntico |
| `sky/15-cumplimiento.png` | **solo renumeración** — era `sky/14-cumplimiento.png`, byte-idéntico |
| `sky/16-economica.png` | **solo renumeración** — era `sky/15-economica.png`, byte-idéntico |
| `sky/17-contraportada.png` | **solo renumeración** — era `sky/16-contraportada.png`, byte-idéntico |

**Retirados:** `sky/05-citas.png`, `sky/06-terreno.png`, `sky/07-metodo.png`, `sky/08-ciclo.png`, `sky/09-arranque.png`, `sky/10-lineas.png`, `sky/11-seo-aeo.png`, `sky/12-muestra.png`, `sky/13-equipo.png`, `sky/14-cumplimiento.png`, `sky/15-economica.png`, `sky/16-contraportada.png`.

Los 12 renumerados se verificaron **byte-idénticos** (`shasum -a 256`) antes de promover. 0 regresiones.

---

## 2026-07-14 (c) · El portal en vivo (`comparison`) — sin plantilla nueva

Faltaba el diferenciador más grande y **no estaba en ninguna pieza**: el acceso a **Greenhouse**, el
portal de clientes. La landing de SEO lo promete textual (*«acceso a Greenhouse […] con la misma verdad
que vemos nosotros»*) y la oferta técnica sólo ofrecía *«un informe dentro de los primeros 10 días
hábiles»*. **El deck no sobre-prometía: la oferta omitía un entregable que el servicio presta.** §9 se
sincronizó en la misma pasada.

Es además la lámina de *«por qué es seguro»* que el oficio exige: el portal no es una feature, es
**quitarle riesgo al comité** (*no tienen que confiar: lo ven*).

| Frame | Delta |
| --- | --- |
| `sky/14-portal.png` | **nueva** |

---

## 2026-07-14 (d) · `ArtifactShowcaseFull` — plantilla NUEVA: el portal se MUESTRA, no se describe

El mockup del tablero **ya existía** en la landing (`.gh-greenhouse-browser`) — no había que
reinventarlo. Se abrió la plantilla que faltaba desde el follow-up de la Radiografía:
**`artifact-showcase`** (captura a sangre + copy), **domain-free**: sirve para cualquier artefacto real
que una propuesta muestre.

**Va como ASSET, no como markup portado.** El HTML del portal son 18k de Elementor + 81k de CSS con
clases y HEX ajenos: meterlo al catálogo rompería su disciplina de tokens. Y hay una razón más fuerte:
**ese tablero es un demo por naturaleza** — volver sus cifras en slots implicaría que son datos reales,
lo cual sería **peor**. Captura a 2160×1290 (2×).

**🔴 El slot `caption` es OBLIGATORIO por contrato.** Una captura de producto con cifras adentro
**AFIRMA** algo: sin rótulo, un evaluador puede leer los números del demo (Domain authority 42, y unas
keywords que son las NUESTRAS) como si fueran los de SKY. **Eso es fabricación.** Misma disciplina que
el crédito de una fotografía — la lección que la Radiografía ya cobró.

| Frame | Delta |
| --- | --- |
| `templates/ArtifactShowcaseFull.png` | **nueva** — la plantilla 27 |
| `templates/MaturityLadderFull.png` | gradiente del peldaño destacado `.20` → `.28` (declarado en el inventario) |
| `sky/15-portal-vista.png` | **nueva** — el tablero, mostrado |
| `sky/16-equipo.png` | **solo renumeración** — era `sky/15-equipo.png`, byte-idéntico |
| `sky/17-cumplimiento.png` | **solo renumeración** — era `sky/16-cumplimiento.png`, byte-idéntico |
| `sky/18-economica.png` | **solo renumeración** — era `sky/17-economica.png`, byte-idéntico |
| `sky/19-contraportada.png` | **solo renumeración** — era `sky/18-contraportada.png`, byte-idéntico |

**Retirados:** `sky/15-equipo.png`, `sky/16-cumplimiento.png`, `sky/17-economica.png`,
`sky/18-contraportada.png`. Verificados byte-idénticos. **0 regresiones.** El deck queda en **19 láminas**.

---

## 🔴 Bug del propio `--freeze` — ENCONTRADO Y ARREGLADO (2026-07-14)

`--freeze` **rebobinaba este archivo entero a `INITIAL_DELTAS`**, llevándose puestas declaraciones ya
commiteadas. Mordió **4 veces** en un día antes de que alguien mirara la causa.

**La causa:** el ledger **vive dentro de `BASELINE_DIR`**, y la promoción hacía
`fs.rm(BASELINE_DIR, {recursive:true})` **antes** de leerlo. El `readFile` posterior fallaba, caía al
`.catch(() => INITIAL_DELTAS)`, y reescribía el ledger desde cero. **El guardián se comía su propia
evidencia** — el "rebaseline silencioso" que este archivo existe para impedir, cometido por el gate.

**El fix** (`visual-gate.ts`): leer el ledger **antes** del `rm`. Una línea.
