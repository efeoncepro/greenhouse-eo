# TASK-1926 — Registro cine en el pipeline `foto:*` y comando idempotente de punta a punta

## Delta 2026-10-02

- El traje biónico de Nexa y sus lentes ya se declaran por catálogo (`traje-bionico-nexa`, `lentes-bionicos-nexa`) y `foto:prompt` exige `"registro": "cine"` en la ficha (`validarTrajeNexa`): es el primer campo explícito de registro cine; `foto:cine` debería emitirlo. Escena con Sparks: dos con referencia como máximo (registro cine 1.7) — cerrado por trabajo en TASK-1940.

## Delta 2026-09-27 (d) — banco de plates gobernado (TASK-1931)

- TASK-1931 registra en un banco gobernado los plates aprobados por receta (sha256, ficha, emblema, isotipo, aprobación
  de una persona) y los sirve al render por `assetId`. La procedencia que produce esta task (isotipo declarativo, reuso
  por huella) es la entrada del banco: los plates con pendientes de QA de isotipo quedan `pending` en el banco hasta que
  esta task registre su procedencia. El banco no genera: la generación sigue siendo de esta task.

## Delta 2026-09-27 (c)

- **Las 69 láminas del deck quedaron aprobadas** [decisión del operador, 2026-09-27] y cada una tiene receta con su
  foto (plate, ficha, prompt compilado y post-proceso) en
  [`deck-recipes/`](../../operations/brand-graphic-line/deck-recipes/README.md) (`EFEONCE_DECK_SLIDE_RECIPES_V1.json`,
  campo `photo`). Es el inventario de entrada del pipeline: el orquestador debe poder regenerar desde su ficha cada
  plate que una receta declare.
- **Alcance del registro que se suma:** excepción aprobada del cine para las láminas de **sección y «about»**
  (`SP2b`, `SP1` espejado, `QS1b`, `QS2`); detalle en el
  [registro cine, delta (c)](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-09-27-c--excepción-para-secciones-y-láminas-about-del-deck).
- **Pendientes de QA que caen en esta task:** registros de procedencia de `foto:isotipo` faltantes (NX6b, CR2b, WB1b,
  RV1b, BR2b…) y plates sin isotipo compuesto (HW1, T2, T3, H2, LN4) → `foto:emblema` antes de publicar; los plates de
  «about» se regeneran con la reserva izquierda, sin el degradado de `quienes.mjs`. No se generó ninguna imagen en este
  cambio.

## Delta 2026-09-27 (b)

- **Plates de portada y contraportada aprobados** [decisión del operador, 2026-09-27]: brochure (tres portadas
  generales, una por cada línea de servicio (cinco) y dos contraportadas con foto) y propuesta comercial
  (contraportadas con foto). Receta de toma, plates por uso y rutas en
  [registro cine §16](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#16-plates-para-portada-y-contraportada-aprobado-2026-09-27).
- **`LN4` se produjo con `pnpm foto:generar` desde una ficha declarada**
  (`ai-generations/2026-09-27_portadas-lineas/fichas/LN4-voice-distribucion.json`, ≈ USD 0,04). La ficha es la fuente
  que la vuelve reproducible; que la corrida sea idempotente —sin volver a cobrar ni producir otro archivo con la misma
  entrada— sigue siendo el gap de esta task (§Gap).
- **Alcance que se suma:** el pipeline cine debe poder regenerar desde sus fichas estos plates —`BR1b`, `BR2b`, `BR3`,
  `BR4`, `LN4` y los de deck reusados como portada (`NX6b`, `CR2b`, `WB1b`, `RV1b`, `HW1`)—, con su isotipo cuando
  corresponda. Hoy la voz, la firma y la columna de las portadas salieron de scripts de la sesión, fuera del repo; la
  integración con el contrato de superficies es TASK-1927.
- Dos cosas que el orquestador no debe asumir: `HW1` es documental, no cine (registro cine §2 y §16.3); y `BR3` pide
  reserva arriba, que el compilador todavía convierte en reserva izquierda (trampa 6).

## Delta 2026-10-01

- los agentes del registro cine (antes «mini robots agentes» descritos a mano) se declaran como Sparks por catálogo (`spark`, `spark-*`, `sparks-plantel`); `foto:prompt` aborta una escena con robots sin Spark (`validarRobots`) — cerrado por trabajo en TASK-1941.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`

## Summary

El registro cine del lenguaje fotográfico de Efeonce está documentado
([`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md)) pero la
herramienta no lo conoce: se escribe a mano dentro de la escena, nada verifica sus guardas y producir una pieza son
cuatro pasos manuales, uno solo reproducible. Esta task lo convierte en un campo de la ficha con guardas verificadas y
agrega `pnpm foto:cine`, un comando idempotente de punta a punta —ficha → placa → isotipo → voz y firma— que, con la
misma entrada, no vuelve a gastar ni produce un archivo distinto.

## Why This Task Exists

El operador preguntó el 2026-09-27 si el registro estaba registrado y si el comando para producirlo era idempotente.
Respuesta medida: no. `foto:prompt` no tiene campo de registro cine (la palabra sólo aparece en una prop «claqueta»);
`foto:generar` regenera y cobra en cada corrida y no reusa la placa de una ficha idéntica; las cajas de
`foto:isotipo` se eligieron a ojo y no quedaron en la ficha; la voz y la firma de las piezas del 2026-09-27 salieron de
scripts de sesión con copy y rutas incrustadas (`ai-generations/2026-09-27_ads-cine/componer-ads-cine.mjs`,
`ai-generations/2026-09-27_brochure/componer-brochure.mjs`). El banco fotográfico de AXIS (125 recetas, 11 secciones)
tampoco tiene el registro. Se construye en Greenhouse porque el pipeline `foto:*` vive aquí hasta TASK-1925: hacerlo
en el repo taller partiría el pipeline en dos (decisión del operador, 2026-09-27).

## Goal

- La ficha declara el registro cine y `foto:prompt` aplica su bloque y rechaza lo que el canon prohíbe.
- `pnpm foto:cine <pieza.json>` produce la pieza final de forma idempotente y deja un manifiesto con huellas.
- Las piezas del 2026-09-27 (AD1–AD4, BR1b/BR2b/BR3) se reproducen desde manifiestos sin regenerar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` (canon del registro; §2 alcance, §11–§11.1 formatos, §12 ficha, §13 barra)
- `docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`
- `docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md` (compositor canónico con CTA y `graphicVoice`)
- `docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md` (§3: extender `foto:*` antes de la migración está permitido)

Reglas obligatorias:

- Nunca un compositor nuevo: la capa de voz y firma extiende `foto:componer` / `foto:componer:cta` (`graphicVoice`), no un script aparte.
- Nunca un catálogo de publicidad en el Artifact Composer de Greenhouse.
- El alcance del registro sale del token AXIS `efeonceGraphicLine.surfaces.photo.cine` y del issue `cine-requires-nexa-or-proposal`; nunca de una lista escrita a mano.
- El emblema nunca se usa tal como sale del generador; el isotipo oficial se compone desde `@efeoncepro/axis-brand-assets`.

## Normative Docs

- `.claude/rules/brand-photography.md`
- `docs/operations/brand-photography/EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md`
- `docs/operations/social/2026-09-21-ads-brand-visibility-production-method.md` (capa por formato)

## Dependencies & Impact

### Depends on

- `TASK-1918` modifica `scripts/foto/build-prompt.mjs` (chequeos de la lente). Esta task toca el mismo archivo: se
  ejecuta después de 1918 o acuerda el orden con su sesión; nunca en paralelo sobre ese archivo.
- `@efeoncepro/axis-tokens` con `efeonceGraphicLine.surfaces.photo.cine` (existe desde 0.3.8; vigente 0.3.10 al 2026-09-27).

### Blocks / Impacts

- `TASK-1925` migra `scripts/foto` al repo taller: lo que esta task agregue se muda con el resto.
- Skills que describen el pipeline (`design-studio`, `greenhouse-ai-image-generator`, `efeonce-advertising-creative`) y §12 del registro cine: cambian los comandos.

### Files owned

- `scripts/foto/build-prompt.mjs` (sólo el campo y bloque cine; coordinar con TASK-1918)
- `scripts/foto/generar.mjs`, `scripts/foto/isotipo.mjs`
- `scripts/foto/cine.mjs` (nuevo, orquestador) y sus pruebas
- `scripts/foto/bloques/` (bloque cine)
- `package.json` (entrada `foto:cine`)

## Current Repo State

### Already exists

- `pnpm foto:prompt`, `foto:generar`, `foto:validar`, `foto:emblema`, `foto:isotipo`, `foto:componer`, `foto:componer:cta` (+ `foto:cta:gate`).
- `scripts/foto/cta-graphic-voice.mjs`: materialización fotográfica opt-in de la voz AXIS de Efeonce (pregunta Poppins, `align: left`) dentro de `foto:componer:cta` [verificar si cubre la respuesta Bricolage con esfera y la firma de logo centrado].
- `scripts/foto/isotipo.mjs`: composición determinista con procedencia (paquete + sha256 del SVG).
- Fichas y placas de evidencia: `ai-generations/2026-09-26_deck-*/`, `ai-generations/2026-09-27_brochure/`, `ai-generations/2026-09-27_ads-cine/` (placas locales, gitignoreadas).

### Gap

- Sin campo `registro` cine en la ficha ni guardas.
- `foto:generar` sin reuso por huella.
- Cajas de isotipo fuera de la ficha.
- Voz y firma cine sólo en scripts de sesión.
- Sin comando orquestador ni manifiesto de pieza.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `greenhouse-eo/scripts/foto`
- Future candidate home: `undecided`
- Boundary: CLI local del pipeline de fotografía de marca; se muda al repo taller `efeonce-brand-workshop` con TASK-1925; consumers = el operador y los agentes desde sesiones en `greenhouse-eo`
- Server/browser split: `n/a` — sólo CLI local en Node
- Build impact: `none` — no entra al bundle de Next ni a los workers
- Extraction blocker: `none` más allá de los de TASK-1925 (import de `@/lib/secrets/secret-manager` y `pnpm ai:image` en `generar.mjs`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El registro cine en la ficha

- Campos nuevos: `registro: 'cine'`, `caso: 'nexa' | 'proposal-cinematic' | 'publicidad-prueba'`.
- `foto:prompt` agrega el bloque cine (cámara y lente desde el token AXIS, luz de la línea como única luz fuerte, bruma, pecho liso *«NO emblem, NO logo, NO symbol»*, estudio vacío declarado) y **aborta** si: el caso no está permitido por el token; la escena pide un emblema o describe el nuestro; dos personas se miran de cerca; en vertical no hay un objeto oscuro en primer plano como lecho; hay robots declarados a los pies en vertical.
- Pruebas en `build-prompt.test.ts` con un caso positivo y uno negativo por guarda.

### Slice 2 — `foto:generar` idempotente

- Huella = sha256(prompt compilado + sha256 de cada referencia + modelo + calidad + tamaño). La placa se guarda como `<id>.<huella12>.png` con un `.json` al lado.
- Si la huella ya existe, reusa sin llamar al proveedor y lo dice; `--force` regenera; `--elegir <archivo>` fija la placa aprobada de la ficha.

### Slice 3 — Isotipo declarativo

- La ficha declara `isotipos: [{ centro: [x, y], ancho, prenda }]`; `foto:isotipo --ficha <ficha>` los aplica en cadena sobre la placa elegida, determinista, con procedencia.

### Slice 4 — Voz y firma desde manifiesto

- `pieza.json`: placa (por huella), formato, línea, pregunta, respuesta y firma. La capa se compone con `foto:componer:cta` (`graphicVoice`) o su extensión, nunca con un script nuevo; mismo manifiesto → mismo sha256 del PNG.
- QA en la salida: respuesta ≥ 3× la pregunta; firma ≥ 4,5:1 medida bajo su caja y **fuera del sujeto**; la voz no cruza al sujeto.

### Slice 5 — `pnpm foto:cine`

- Orquesta los Slices 1–4 desde un `pieza.json`; idempotente de punta a punta; escribe `manifiesto.json` con cada archivo y su sha256.
- Reproduce AD1–AD4 y BR1b/BR2b/BR3 desde manifiestos, sin regenerar, con salida igual a la evidencia o diferencia declarada.

### Slice 6 — Documentación

- §12 del registro cine, skills que describen el pipeline y manual de fotografía con el comando nuevo.

## Out of Scope

- Migrar al repo taller (TASK-1925).
- La receta de anuncio en AXIS y subir piezas al banco fotográfico de AXIS: sólo después de que el operador apruebe las pruebas publicitarias (follow-up).
- Catálogos del Artifact Composer y `brand:compose`.
- Portadas cinematográficas del brochure como receta del contrato de superficie.

## Detailed Spec

Casos de prueba de las guardas, tomados de rechazos medidos: `NX2` (dos personas mirándose de cerca), `NX3` (cámara
pegada, cabeza ~35 % del alto), `AD1`/`AD4` (firma sobre el sujeto en vertical), `AD4b` (robots a los pies, lecho 3,01),
`AD4d` (cabeza en la franja de texto). Fichas en las carpetas de evidencia citadas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 después de TASK-1918 (o con su orden acordado). Slice 2 y 3 son independientes. Slice 4 antes del 5. Slice 6 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El reuso por huella sirve una placa vieja tras cambiar una referencia | Tooling | medium | la huella incluye el sha256 de cada referencia | placa reusada con referencias distintas en su `.json` |
| Una guarda nueva rompe fichas vigentes de otros registros | Tooling | medium | las guardas sólo corren con `registro: 'cine'`; pruebas de regresión sobre fichas existentes | `foto:prompt` aborta una ficha no cine |
| Choque con TASK-1918 en `build-prompt.mjs` | Tooling | medium | orden explícito entre sesiones | conflicto de merge o prueba roja de 1918 |

### Feature flags / cutover

- Sin flag: repo-only change, tooling local aditivo; la ficha sin `registro` sigue igual.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–6 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

1. Pruebas de `foto:*` en verde (`build-prompt.test.ts`, `componer-cta.pruebas`, `componer-cta.regresion`, `isotipo.test.ts`).
2. Reproducir AD1–AD4 desde manifiestos sin llamar al proveedor.
3. Una ficha cine nueva de punta a punta con `foto:cine`, dos veces: la segunda no gasta y devuelve el mismo sha256.

### Out-of-band coordination required

- Orden con la sesión que tome TASK-1918.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una ficha con `registro: 'cine'` produce el bloque cine y cada guarda aborta su caso negativo (NX2, NX3, AD1, AD4b, AD4d).
- [ ] Una ficha sin `registro` produce exactamente el mismo prompt que antes de esta task.
- [ ] `foto:generar` con la misma ficha dos veces llama al proveedor una sola vez.
- [ ] `foto:isotipo --ficha` compone todos los isotipos declarados y deja procedencia.
- [ ] `foto:cine` sobre el mismo `pieza.json` dos veces devuelve el mismo sha256 sin gastar.
- [ ] AD1–AD4 y BR1b/BR2b/BR3 se reproducen desde manifiestos.
- [ ] Ningún script de composición nuevo: la capa pasa por `foto:componer:cta` o su extensión.
- [ ] §12 del registro cine y las skills citan `foto:cine`.
- [ ] (Delta d) Cada plate producido por `foto:cine`/`foto:generar` deja su procedencia (ficha y su sha256, modelo, proveedor, sha del prompt, resultado de `foto:emblema`, registro de `foto:isotipo`) en un formato que `pnpm foto:banco -- --register` (TASK-1931) lee sin transformación manual.

## Verification

- `pnpm local:check`
- Pruebas de `scripts/foto`
- Doble corrida de `foto:cine` con igual sha256

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1925 quedó con delta: `foto:cine` y sus módulos migran con el resto de `foto:*`

## Follow-ups

- Receta de anuncio cine (9:16 y 4:5) en AXIS y sección del registro en el banco fotográfico de AXIS, tras la aprobación del operador.
- Portadas cinematográficas del brochure como receta del contrato de superficie.

## Open Questions

- ¿Nexa lleva smartwatch y anillo en el registro cine? Hoy `foto:prompt` los agrega siempre y las fichas cine los niegan.
