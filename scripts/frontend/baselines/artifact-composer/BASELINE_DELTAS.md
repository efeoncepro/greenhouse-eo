# Artifact Composer — BASELINE_DELTAS (contrato de dos vías)

<!-- manifest-digest: f38c1ab079609bf049f249dac0974fa622c63a115ff3fe5298daa99912102aed -->

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
