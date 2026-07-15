# Brief de arranque — iterar la oferta de SKY

> **Este documento existe para que una sesión nueva NO empiece a hacer.**
> Empieza **leyendo y mapeando**. Recién cuando el operador confirme el diagnóstico, se ejecuta.
>
> Escrito 2026-07-14 al cierre de la sesión que construyó la escalera y el portal.

---

## 🔴 DELTA 2026-07-14 (sesión de iteración — LEE ESTO PRIMERO, supersede §3/§4/§6)

**Los tres hilos del §4 están CERRADOS**, y el deck quedó en **23 láminas · PDF 12.5 MB**:

- **(a) el informe del grader** tiene lámina propia (`08-informe`, artifact-showcase con captura real
  del gauge + logos de motores + URL tokenizada horneada en chrome de navegador) **y** enlace clickeable.
  La muestra (`15-muestra`) es el x-ray real con el mismo tratamiento.
- **(b) los enlaces SON clickeables** — eran DOS bugs del motor: el sanitizador no admitía `<a>` **y**
  `copyPages` de pdf-lib descartaba las anotaciones al fusionar. Ambos arreglados en el motor; el PDF
  lleva 4 anotaciones `/URI` vivas. ⚠️ Verificar anotaciones **vía API pdf-lib**, nunca grep (object streams).
- **(c) la §3 de la técnica** ya no dice «tres capas encadenadas»: la oferta completa se reescribió
  (SEO primero · cifras del run 46 publicado · §5 «qué compra el valor mensual» · §14 riesgos · matriz
  de cumplimiento → anexo). La económica vende **capacidad, no piezas** (cero precio unitario; el ad-hoc
  de 260k dominaba al plan ampliado). El Excel se **genera** (`scripts/commercial/build-sky-economica-xlsx.mjs`).

**Más allá de los hilos:** lámina `citas` MUERTA (su claim contradecía el informe público) · claim
canónico ahora = **«citabilidad propia 0%»** (dato publicado; skyairline.com es la fuente #1 con 15
citas — nunca decir «no aparece») · escalera con el vocabulario del informe («Que te encuentre»…) ·
agenda con **números de página derivados del plan** (hook, nunca autorados) · equipo = `TeamGalleryFull`
con **fotos reales** (mapeo CONFIRMADO por el operador: Julio·Responsable 12% / María Fernanda·SEO
Copywriter 50% / Daniela·Creative Operations Lead 12% / Melkin·Senior Visual Designer 30% /
Andrés·SEO Specialist 25%) · Grupo Berel **con nombre autorizado** (`19-berel`) · penalidades como
statement (`20-seguro`).

**Piso de negociación ACTUALIZADO** (squad blueprint): a 2 años sin reajuste el piso real es
**≈ CLP 5,0M** (no 4,6M ni 3,9M) — espacio de negociación 130-320k. **La carta del BAFO (20/07) es el
plan de 6 piezas a 4,3M** (interno, NO se publica). Los 3 bugs de `04_PRICING` §6: cerrados.

**Garantía de reutilización:** slot opcional no provisto se LIMPIA (el copy del prototipo ya no puede
fugarse a otra licitación) + guard de 28 probes en `template-composability`. Delta completo:
`COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` → §`Delta 2026-07-14`.

**Estado de gates al cierre:** vitest 195/195 · visual gate 51 frames a 0 px (2 promociones declaradas
en `BASELINE_DELTAS.md`) · typecheck limpio · PDF con 4 `/URI`. **Pendiente humano:** subir a Wherex
(cierra **15/07**) — el agente prepara, el humano sube y firma.

---

## 0. Lo primero: NO EJECUTES

Tu primer turno es de **exploración**, no de producción. El operador va a pedir explícitamente cuándo
construir. Antes de eso:

1. Lee este brief entero.
2. Lee los artefactos de §2 (los que ya existen — no los reinventes).
3. **Mapea las piezas contra las láminas** y dime **qué está suelto** (§4 es mi hipótesis; verificala,
   no la copies).
4. Presentá el diagnóstico y **esperá**.

**Skills a cargar antes de opinar:** `greenhouse-public-private-tenders` (dueña de la licitación) ·
`deck-studio` (el oficio del deck; la de licitaciones es su *consumer*) · `seo-aeo-practice` (cómo se
vende el servicio) · `commercial-expert` · `copywriting`.

---

## 1. El contexto en una frase

Licitación de **producción de contenido para el blog de SKY Airline** (Wherex, cierra **15/07/2026**,
TCV CLP 124.800.000 a 2 años). La propuesta se entrega como **deck**, más oferta técnica y económica.
**El agente prepara; el humano sube y firma.**

🔴 **Regla dura de esta licitación:** todo lo client-facing va en **registro formal de usted** (o
institucional en 3ª persona). Nada de tuteo. Es un documento contractual que evalúa un comité.

---

## 2. Las piezas que YA existen (no las reinventes — leelas)

| Pieza | Dónde | Estado |
|---|---|---|
| **Deck** — 19 láminas | `deck-plan.json` (FUENTE) → `pnpm deck:compose` | ✅ compone; PDF 4 MB |
| **Oferta técnica** | `oferta-tecnica.md` (13 secciones) | ✅ (§9 recién sincronizada con el portal) |
| **Oferta económica** + Excel | `oferta-economica.md` · `propuesta-economica.xlsx` | ✅ |
| **Radiografía AEO** (muestra de trabajo) | 🌐 **VIVA:** `think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37/` | ✅ en producción |
| **Informe del AI Visibility Grader** | 🌐 **VIVO:** `think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f` (run `EO-GRUN-00046`) | ✅ publicado |
| **Diagnóstico** (INTERNO — no va a SKY) | `diagnostico-INTERNO.md` | ✅ |
| **Squad blueprint** (INTERNO — loaded cost) | `squad-blueprint-INTERNO.md` | ✅ |
| **Benchmark competencia** (INTERNO) | `benchmark-competencia-INTERNO.md` | ✅ |
| **Bases** (fuente normativa, manda sobre todo) | `bases/bases-licitacion-sky.txt` | — |

⚠️ **Los `-INTERNO` NUNCA se entregan.** El squad blueprint trae loaded cost y piso de negociación.

---

## 3. Las 19 láminas de hoy

```
 1 portada          11 lineas            (bullet-list)
 2 agenda           12 seo-aeo           (capabilities-grid)
 3 entendimiento    13 muestra           (highlight — la Radiografía)
 4 diagnostico      14 portal            (comparison — el argumento)
 5 escalera    🆕   15 portal-vista 🆕   (artifact-showcase — el tablero)
 6 citas            16 equipo
 7 terreno          17 cumplimiento
 8 metodo           18 economica
 9 ciclo            19 contraportada
10 arranque
```

---

## 4. 🔴 Lo que el operador señaló como suelto (VERIFICALO, no lo asumas)

Palabras textuales del operador al cerrar la sesión:

> *«tenemos el informe del grader que **no lo veo aquí en ninguna parte en las slides**, tenemos el
> informe o lo tenemos disgregado, deberíamos también poner **el link clickeable**»*

**Tres hilos abiertos, y el trabajo de la sesión nueva es mapearlos antes de tocar nada:**

### (a) El informe del grader no tiene lámina propia

Está **disgregado**: sus cifras alimentan la lámina 4 (tres hechos) y la 5 (la escalera), pero **el
informe como artefacto no aparece**. Y existe, vivo, publicado, verificable por el comité.

**Pregunta a resolver:** ¿va como lámina (`artifact-showcase` — la plantilla ya existe) o como enlace
desde la escalera? ¿O ambas? Ojo con la regla del oficio: **dos enlaces diluyen ambos**.

### (b) Los enlaces no son clickeables

La Radiografía (lámina 13) y el informe del grader **viven en la web** — ése es su valor: el comité los
verifica solo. Pero el PDF del deck **hoy no emite anotaciones de link**.

**Verificá primero si el composer ya soporta links** (`src/lib/artifact-composer/` → el emisor de PDF
usa `pdf-lib`; `pdf-lib` **sí** puede crear anotaciones `/Link`). Si no lo soporta, es un **gap del
motor**, no de una plantilla — y el fix es en el emisor, no en el catálogo.

⚠️ Y hay una trampa: si el enlace no es clickeable, **la URL tiene que estar escrita y ser tipeable**.
Un token de 64 caracteres no se tipea. Eso puede forzar un acortador o un QR — decisión del operador.

### (c) El discurso de la oferta técnica

El operador quiere **armar las piezas y el discurso** de la oferta técnica. Hoy la oferta es correcta
pero su **§3 «Nuestro enfoque»** dice *«tres capas encadenadas: estrategia / producción / medición»* —
**eso lo dice cualquier agencia**. La landing de SEO tiene un método con forma (base técnica →
autoridad temática → entidad y autoridad) y el **E-E-A-T** que explica *por qué* el contenido va a
rankear. Nada de eso está en la oferta.

---

## 5. Lo que aprendimos hoy y NO hay que volver a aprender

🔴 **El framework Be X vive DENTRO de la superficie AEO.** No es un puente SEO↔AEO. Me equivoqué **dos
veces** con esto en una sola sesión:

- **Surround Discovery™** = la metodología madre: **5 superficies** (SEO · AEO · Video Discovery ·
  Social Discovery · Marketplace Optimization) + el motor **S⁴** (SENSE → SHAPE → SURFACE → SOLVE).
- **Be X** = la **escalera de madurez de la visibilidad en IA** (Found → Readable → Correct →
  Actionable → Intrinsic). **Es lo que el grader mide.** SEO **no es** ninguno de sus peldaños.
- ⚠️ **`PDR-001` dice lo contrario y está `Accepted`** (*«SEO = cimiento Be Found + Be Readable»*). Es
  un atajo de posicionamiento, no el framework. **Y la landing de AEO también se contradice con el
  medidor** (su peldaño 1 dice *«indexado para buscadores y motores de IA»*; el grader lo mide como
  `ai_visibility` puro). **El framework no tiene SSOT.** Eso hay que arreglarlo — y es la razón por la
  que cualquier agente que lo lea saca una versión distinta.
- **SSOT real del Be X:** `src/components/growth/ai-visibility/report-artifact/model.ts` (`REPORT_LEVEL_*`).

🔴 **CERO cifras sin fuente googleable.** La auditoría de la Radiografía encontró que **3 de las 6
cifras que exhibía no resistían una verificación** — y una citaba un estudio que **no existe con ese
nombre**. Un evaluador **va a buscar la fuente**. Antes de escribir una cifra: `seo-aeo/SOURCES.md` +
`seo-aeo/ANTIPATTERNS.md` (una prevalencia **no** es un lift).

🔴 **Los gates del composer no se saltan, se satisfacen.** Cada uno atrapó un bug real hoy:
- `pnpm vitest run src/lib/artifact-composer` — el guard sintetiza un payload y **llena las 27**.
- **`pnpm composer:visual-gate` a CERO píxeles.** Un frame nuevo/cambiado se declara en
  `BASELINE_DELTAS.md` y se re-promueve con `--freeze`.
- **Si insertás una lámina en el medio, RENUMERA todo lo que va detrás.** Verificá con
  `shasum -a 256` que los desplazados sean **byte-idénticos** a su baseline previo **antes** de
  promover — si no, el renombre esconde una regresión.
- **NUNCA declares un deck listo sin MIRAR LOS FRAMES, TODOS.** Los tests verdes no son el gate: las
  dos plantillas nuevas salieron con **una banda muerta** que ningún test vio.

🔴 **El autor nunca elige `template`.** Declara `contentType` + slots; el selector resuelve
(`TemplateAuthorityError` si no calza). Y **si ningún contentType puede afirmar lo que querés decir,
eso es un GAP del catálogo** — se abre una plantilla, **no se improvisa** ni se sube un `maxItems` para
que entre.

---

## 6. Estado de los gates al cerrar

```
✓ pnpm vitest run src/lib/artifact-composer   → 163/163
✓ pnpm composer:visual-gate                   → 46 frames · 0 píxeles
✓ pnpm deck:compose                           → 19 láminas · PDF 4 MB
```

**Commit:** `a9bc52adc` — dos plantillas nuevas + fix del `--freeze` + deck a 19.
**Sin pushear.**

---

## 7. Follow-ups vivos (fuera del alcance de la licitación)

- 🔴 **Las credenciales de Shutterstock siguen filtradas y ACTIVAS** (verificado: token vivo,
  `GET /v2/user` → 200). Republicar en Secret Manager **NO es rotar**: hay que regenerar la app en el
  portal de Shutterstock, y eso requiere login humano. **Bloquea el flip del flag en producción de
  TASK-1411.** El operador lo dejó en pausa a conciencia. **Las credenciales nuevas NUNCA se pegan en
  un chat** — así se filtraron las primeras.
- El **framework Be X no tiene SSOT** (§5). `PDR-001` y la landing de AEO se contradicen con el
  medidor. Merece una decisión.
- La **Radiografía** todavía no está registrada como artefacto `client_facing` en el README de esta
  licitación.
