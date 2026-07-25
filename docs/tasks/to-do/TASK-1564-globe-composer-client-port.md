# TASK-1564 — Globe Composer sobre el payload cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1564-globe-composer-client-port.md`
- Flow: `docs/ui/flows/TASK-1564-globe-composer-client-port-flow.md`
- Motion: `docs/ui/motion/TASK-1564-globe-composer-client-port-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `to-do — bloqueada por nada; es el siguiente slice de ADR-014`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none` (TASK-1559 entregó el transporte, el resolver de bytes y los tokens)
- Branch: `task/TASK-1564-globe-composer-client-port`
- GitHub Issue: `TBD`

## Summary

Construye el **composer** del Producer sobre el payload cliente: la superficie donde un operador escribe un
prompt, elige ruta y modelo, ve el estimado y **gasta creditos**. Es el Slice 3 de ADR-014 y la última pieza
que falta para que `/producer` se pueda cambiar de una sola vez.

## Why This Task Exists

Tres razones, en orden de peso:

1. **Es la única superficie que gasta.** `globe.lab.experiment.execute` mueve crédito real. Todo lo demás del
   Producer es lectura o metadata.
2. **Es el cuello de botella del retiro del payload viejo.** El inventario de paridad
   (`legacy-parity.ts`) declara 38 capabilities; **14 son del composer**, más 4 del riel de créditos que el
   composer necesita para decidir si se puede gastar. Sin composer, `TASK-1560` no puede correr.
3. **Es donde el trabajo `source-led` rinde más.** El vanilla llama 38 de ~74 contratos. El composer es la
   superficie con más contratos gobernados **sin consumidor**: presets, estilos materializados, registro de
   voces, historial de prompts, estimado de reintento.

## Goal

Un composer que pueda **preparar y ejecutar una generación real** sobre el payload cliente, con el estimado
antes del gasto, la readiness de la flota visible, y las cuatro razones de negación distinguidas — sin haber
perdido ninguna garantía de gobierno que el payload viejo ya tenía.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **ADR-014** (`EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`) — Slice 3. Y su Delta 2026-07-25: trabajo
  `source-led` contra el prototipo aprobado, convivencia por ruta, retiro por paridad ejecutable.
- **ADR-005** (Producer Human Execution) — trust boundary. Las cuatro razones de negación no colapsan.
- **ADR-003** — el **nombre** del modelo es público; el `routeId`, el slug del proveedor, su costo y el margen
  **nunca** salen. Crítico acá: el composer muestra un selector de rutas, y la ruta tiene slug de wire.
- `GLOBE_CLIENT_MOTION_CONTRACT_V1.md` — el isotipo generando se comparte con el feed.

## Normative Docs

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`
- `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`
- `docs/manual-de-uso/creative-studio/operar-feed-viewer-producer-globe.md`
- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`

## 🔴 La regla de reconciliación — prototipo vs implementado

**Este bloque es el núcleo de la task.** El prototipo aprobado tiene riquezas que el vanilla no tiene, y el
vanilla tiene riquezas que el prototipo no tiene. Unir las dos listas es la respuesta equivocada: hay que
**clasificar** y aplicar una regla por clase, porque la autoridad cambia según la clase.

### Medición (2026-07-25), no impresión

| Señal | Prototipo aprobado | Payload vanilla |
|---|---|---|
| `@keyframes` / animaciones | **11 / 12** | — |
| `transition` declaradas | **9** | — |
| menciones de gating | 82 (`disabled` ×38) | `gateFor` ×54, `gateUnavailable` ×17 |
| `idempotencyKey` | **0** | 7 |
| `assertCurrentEpoch` | **0** | 19 |
| reautenticación | **0** | 9 |
| `aria-live` | **1** | 9 |
| restauración de foco | 0 | 10 |
| confirmaciones destructivas | 0 | 15 |

### Las cinco clases y su regla

| Clase | Autoridad | Regla |
|---|---|---|
| **1. Forma, composición, motion, copy** | **PROTOTIPO** | Es el diseño aprobado. Se porta medido, no estimado. El vanilla no tiene voz acá |
| **2. Invariantes de runtime** — idempotencia, epoch, single-flight, reautenticación | **VANILLA** | Un HTML de fixtures **no puede** tenerlos: sus `disabled` son decorativos. Ya portados en TASK-1559 y **no se rediseñan** |
| **3. Plomería de accesibilidad** — live regions, restauración de foco, confirmación destructiva | **VANILLA** | Contraintuitivo pero medido: 9 `aria-live` vs 1, 10 restauraciones vs 0. El prototipo es un artefacto **visual** y es débil acá |
| **4. Afordancias que el prototipo promete SIN contrato gobernado** | ninguna de las dos | Se renderizan **deshabilitadas con su razón visible**. Ni inventadas ni escondidas — la misma regla ya aplicada a Serie/Compartir/Buscar en el feed |
| **5. Afordancias que el vanilla muestra y NUNCA despacha** | — | **No son riqueza: son promesas muertas.** Dropearlas no es regresión |

### La clase 5 en concreto, porque es el hallazgo que cambia el cálculo

El vanilla **gatea** 12 capabilities que **nunca despacha**. El botón existe, se ilumina si hay grant, y no
llama a nada:

`library.bulk.prepare` · `library.bulk.execute` · `library.export.request` · `experiment.evidence` ·
`experiment.list` · `experiment.tree` · `recipe.get` · `prompt.enhancement.accept` ·
`prompt.enhancement.reject` (+ los 2 de private-ingest y el de reauth, que son otro dominio y transporte).

Están declaradas en `LEGACY_PARITY_EXCLUSIONS` con su motivo. **La conclusión operativa:** cuando alguien
diga "el vanilla tiene X y el nuevo no", hay que preguntar si X **despacha**. Si sólo se gatea, X nunca
funcionó.

### El caso difícil, declarado por adelantado

**Retoque regional (inpaint).** El prototipo lo desarrolla mucho (117 menciones: diálogo, cursor de pincel,
intents). El vanilla tiene el diálogo y lo gatea contra `experiment.prepare`, pero el enmascarado real es un
placeholder. Cae en **clase 4**: la forma es autoridad del prototipo, y como no hay contrato de máscara, se
renderiza deshabilitado con su razón. **No se implementa el enmascarado en esta task.**

## Dependencies & Impact

- **Depende de:** `governed-transport.ts` (epoch + idempotencia + single-flight), `governed-media.ts` (bytes),
  el SSOT de tokens, y las primitives del payload cliente. Todo entregado por TASK-1559.
- **Impacta a:** `TASK-1560` (retiro del payload viejo) — es su bloqueante principal. `TASK-1565` (motion),
  porque el isotipo generando se comparte. `legacy-parity.ts`, cuyo campo `surface` se usa para medir avance.
### Files owned

- `apps/studio-client/src/surfaces/producer/composer/**` — la superficie completa
- `apps/studio-client/src/data/composer-recipe.ts` — el modelo tipado de la recipe y la vigencia del estimado
- `apps/studio-client/src/copy/index.ts` — namespace `producerComposer` (compartido; sólo se agrega)
- `apps/studio-client/scripts/producer-composer-canary.mjs` — el canary
- `apps/studio-web/src/app.ts` — la ruta `/producer/compose` (compartido; sólo se agrega una rama)

## Current Repo State

**Ya existe:**

- `apps/studio-client/src/data/governed-transport.ts` — dispatch tipado con epoch, refresh single-flight y
  la garantía de que un command sin `idempotencyKey` **falla antes de salir a la red**.
- `apps/studio-client/src/data/governed-media.ts` — bytes con ciclo de vida de object URLs.
- `apps/studio-client/src/data/legacy-parity.ts` — el inventario de 38 con su `surface`.
- `apps/studio-web/src/producer-controller.ts` — el composer vanilla, referencia de **clase 2 y 3**.
- El prototipo aprobado en `~/Documents/Globe/Producer/Suite de IA Generativa Creativa/`, referencia de
  **clase 1**.

**Gap:**

- No existe ninguna superficie de composer en el payload cliente.
- No existe el riel de créditos (4 capabilities de `credits.*`).
- No existe `GlobeGeneratingMark` (primitive compartida con el feed).
- No existe un modelo tipado de la recipe (`composer-recipe.ts`).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer/composer/**`
- Future candidate home: `remain-shared`
- Future home rationale: vive donde vive el payload cliente; no crea frontera nueva
- Boundary: el composer consume `governed-transport` y `governed-media`; **no** habla con el DOM del payload
  viejo ni importa nada de `apps/studio-web/src/producer-*`
- Server/browser split: browser-only. El shell de `studio-web` sólo sirve el documento
- Build impact: `none` — el bundle del payload cliente ya existe
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador interno de Efeonce con `globe.studio.access` y grants de `lab.experiment.*`
- Momento del flujo: antes de que exista una pieza. Es el punto de entrada del trabajo creativo
- Resultado perceptible esperado: una corrida en vuelo, visible en el feed, con crédito reservado
- Friccion que debe reducir: "¿esto cuánto me va a costar y va a funcionar con este modelo?" — el estimado y
  la readiness de la flota tienen que estar **antes** del botón, no después del gasto
- No-goals UX: enmascarado de inpaint, operaciones batch de biblioteca, paleta de comandos

### Surface & system decision

- Surface: `/producer/compose` en el payload cliente (ruta propia; `/producer` sigue siendo el vanilla)
- Composition Shell: `no aplica` — es el payload de Globe, que materializa sus propios componentes (ADR-014 §8)
- Primitive decision: `new` — `GlobeGeneratingMark`, `FieldGroup`, `EstimateRail`; `reuse` de `Chip`,
  `FactList`, `StateBlock`, `Glyph`
- Adaptive density / The Seam: `no aplica` — contrato de Greenhouse, no de Globe
- Floating/Sidecar/Dialog decision: el composer es un **panel fijo** a la izquierda (geometría del prototipo:
  `minmax(24rem, 27.5rem)`), no un diálogo. Los selectores de ruta/estilo/voz son popovers
- Copy source: `apps/studio-client/src/copy/index.ts` → namespace nuevo `producerComposer`
- Access impact: `entitlements` — cada control se gatea por su capability

### State inventory

- Default: prompt vacío, ruta por defecto de la capability, estimado en `—` hasta que haya prompt
- Loading: catálogo/flota/estilos cargando → campos deshabilitados con skeleton, **no** un spinner global
- Empty: sin rutas elegibles → bloque de estado que nombra la capability faltante
- Error: estimado falla → el botón de generar queda deshabilitado con la razón. **Nunca** se ejecuta sin estimado
- Degraded / partial: flota parcialmente lista → las rutas no listas se muestran deshabilitadas con su motivo
- Permission denied: sin grant de `execute` → botón deshabilitado, y el resto del composer **sigue usable**
  (se puede escribir y estimar)
- Long content: prompt largo → el campo crece hasta un techo y después scrollea internamente
- Mobile / compact: el panel pasa a ocupar el ancho y el feed va abajo
- Keyboard / focus: `Cmd/Ctrl+Enter` genera; el foco vuelve al prompt después de ejecutar
- Reduced motion: ver el contrato de motion — el isotipo se congela visible

### Interaction contract

- Primary interaction: escribir prompt → (opcional) Mejorar → elegir ruta → ver estimado → Generar
- Hover / focus / active: cada control con anillo de foco; los popovers cierran con `Esc` y click afuera
- Pending / disabled: durante `prepare`+`execute` el botón queda en pendiente y **no se puede volver a
  apretar**. La idempotencia lo cubre en el transporte; la UI además lo impide
- Escape / click-away: cierran popovers, **nunca** cancelan una ejecución en curso
- Focus restore: al cerrar un popover el foco vuelve a su trigger
- Latency feedback: el estimado se pide con debounce; mientras viaja el valor anterior se muestra atenuado y
  marcado como no vigente — **jamás** se muestra un estimado viejo como si fuera el actual
- Toast / alert behavior: el resultado de la ejecución se anuncia por live region; el feed lo recibe por su
  propio ciclo de reanudación

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: entrada del panel y de los popovers (`overlayIn` .2s)
- Layout morph: ninguno
- Stagger: ninguno en el composer
- Timing / easing token: `--duration-overlay`, `--duration-breathe`, `--ease-enter` (ver el SSOT de motion)
- Reduced-motion fallback: ver `GLOBE_CLIENT_MOTION_CONTRACT_V1.md` §4
- Non-goal motion: no hay animación en el cambio de valor de un campo ni en el estimado

### Implementation mapping

- Route / surface: `/producer/compose` — server en `apps/studio-web/src/app.ts` (misma guarda de sesión que
  `/producer`), cliente en el router de `main.tsx`
- Primitive / variant / kind: `GlobeGeneratingMark` (new, compartida con el feed), `EstimateRail` (new),
  `FieldGroup` (new)
- Component candidates: `ComposerSurface`, `PromptField`, `RouteSelector`, `RecipeFields`, `EstimateRail`
- Copy source: `producerComposer` en `copy/index.ts`
- Data reader / command: las 14 de `surface: 'composer'` + las 4 de `surface: 'credits'` en `legacy-parity.ts`
- API parity: todas las capabilities existen server-side; esta task no crea contratos
- Access / capability: `lab.experiment.{estimate,prepare,execute,cancel}`, `producer.{catalog,fleet,style}.list`,
  `voice.preset.list`, `lab.prompt.{enhance,history}`, `credits.*`
- States to implement: los 11 del inventario

### GVC scenario plan

- Scenario file: `apps/studio-client/scripts/producer-composer-canary.mjs`
- Route: `http://127.0.0.1:4326/producer/compose`
- Viewports: 1440 · 390 · **320**
- Quality profile: `premium`
- Required steps: cargar catálogo → escribir prompt → estimar → intentar generar sin grant → con grant
- Required captures: default, loading, sin-grant, estimado-vigente, estimado-no-vigente, ejecutando, error
- Required `data-capture` markers: `producer-composer`, `producer-composer-estimate`,
  `producer-composer-state`, `producer-generating-mark`
- Assertions: (a) `routeId` **no** aparece en el DOM servido; (b) sin estimado vigente el botón está
  deshabilitado; (c) doble click en Generar produce **una** llamada a `execute`; (d) el estimado no vigente
  está marcado como tal
- Scroll-width checks: por panel y por documento, en los tres anchos
- Reduced-motion / focus evidence: pasada con `prefers-reduced-motion` emulado
- Review dossier: `docs/ui/reviews/TASK-1564-globe-composer-client-port.scorecard.json`
- Baseline decision / surface ID: `globe-producer-composer`

### Design decision log

- Decision: ruta propia `/producer/compose`, y la regla de reconciliación de cinco clases
- Alternatives considered: (a) reemplazar `/producer` de una vez — rechazado, deja al operador sin composer si
  algo falla; (b) unir prototipo y vanilla campo por campo — rechazado, la autoridad cambia según la clase y
  una unión ciega importa las promesas muertas del vanilla; (c) esperar a que el composer tenga todos los ~74
  contratos — rechazado, vuelve infalsable el criterio de retiro
- Why this pattern: la clasificación hace **decidible** cada diferencia, en vez de dejarla a criterio
- Reuse / extend / new primitive: `GlobeGeneratingMark` nace acá con dos consumidores reales (feed y composer)
- Open risks: el estimado con debounce es el punto más delicado — un estimado viejo mostrado como vigente es
  información falsa **sobre plata**

### Visual verification

- GVC scenario: `producer-composer-canary.mjs`
- Viewports: 1440 · 390 · 320
- Required captures: las 7 de arriba
- Required `data-capture` markers: los 4 de arriba
- Scroll-width check: por panel, no sólo documento
- Accessibility/focus checks: `Cmd/Ctrl+Enter`, retorno de foco, live region del resultado
- Before/after evidence: comparación contra el composer del vanilla, capturado con sesión interna
- Known visual debt: enmascarado de inpaint deshabilitado con razón
- Visual scorecard: `docs/ui/reviews/TASK-1564-globe-composer-client-port.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ZONE 2 — PLAN MODE (lo completa el agente que toma la task) -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo tipado de la recipe + estimado

`composer-recipe.ts`: la recipe como dato tipado por capability, con su validación. Estimado con debounce y
la distinción **vigente / no vigente**, con tests. Sin render.

### Slice 2 — Catálogo, flota y estilos

Lectores de `catalog.list`, `fleet.list`, `style.list`, `style.materialize`, `voice.preset.list`. Readiness de
la flota visible. Assert de que el `routeId` no se renderiza.

### Slice 3 — Superficie del composer

Panel con la geometría del prototipo, los campos por capability, prompt + Mejorar + historial. Los 11 estados.

### Slice 4 — Riel de créditos

Las 4 de `credits.*`: disponible / reservado / gastado, uso del mes, proyección, aviso de límite.

### Slice 5 — Prepare + execute

El camino que gasta: `prepare` → confirmación → `execute` con `idempotencyKey`. Doble click imposible.
Cancelación por `cancel`.

### Slice 6 — Canary + cutover de ruta

`producer-composer-canary.mjs`, los 4 asserts, y la ruta servida detrás de la guarda de sesión.

## Out of Scope

- **Enmascarado de inpaint.** Sin contrato de máscara. Se renderiza deshabilitado con razón.
- **Operaciones batch de biblioteca.** `library.bulk.*` está en las exclusiones: el vanilla las gatea y nunca
  las despacha.
- **Paleta de comandos y atajos globales.** Superficie propia.
- **Reemplazar `/producer`.** Es `TASK-1560`.
- **Crear contratos nuevos.** Todas las capabilities existen. `Backend impact: none` es literal.
- **Motion del isotipo.** Es `TASK-1565`; acá se consume la primitive.

## Detailed Spec

### El estimado es el invariante de plata de esta superficie

`experiment.estimate` es un reader, así que es barato y se puede pedir seguido. Pero **el estimado que se
muestra tiene que corresponder a la recipe que está en pantalla**. Tres reglas:

1. cada cambio de la recipe **invalida** el estimado vigente en el acto, antes del debounce;
2. mientras el nuevo viaja, el anterior se muestra atenuado y marcado como no vigente;
3. `execute` **no está disponible** sin estimado vigente. No es una advertencia: es el botón deshabilitado.

Sin la regla 3, un operador puede ver "12 créditos", cambiar la cantidad a 4, y ejecutar creyendo que gasta 12.

### `prepare` → `execute` y por qué son dos

`prepare` reserva y devuelve una reserva; `execute` la consume. Separarlos permite que el servidor rechace
antes de gastar. La UI **no puede** ejecutar sin haber preparado, y la clave de idempotencia se genera en el
`prepare` y se reusa en el `execute` — una clave nueva por intento convertiría un reintento en un gasto nuevo.

### La flota parcialmente lista no es un error

`fleet.list` devuelve readiness por modelo. Un modelo no listo se muestra **deshabilitado con su motivo**, no
oculto: esconderlo hace que el operador crea que el modelo no existe.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slices 1 y 2 (datos) **antes** de 3 (render). El estimado y su vigencia se prueban como función antes de tener
pantalla; con pantalla primero, la regla 3 se vuelve "un `if` en un componente" y se pierde en el próximo refactor.

Slice 5 (el que gasta) **último**, y sólo con los canaries de 1-4 verdes.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Estimado viejo mostrado como vigente | créditos del cliente | **Media** | invalidación sincrónica + botón deshabilitado sin estimado vigente + test | assert del canary |
| Doble ejecución por doble click | crédito real | Media | idempotencia en el transporte (ya) + botón en pendiente + assert de "una llamada" | contador del canary |
| `routeId` filtrado en el selector | ADR-003 | **Alta** — el selector *es* de rutas | render sólo `model.name`; assert sobre el DOM servido | assert del canary |
| Clave de idempotencia nueva por intento | crédito real | Media | la clave nace en `prepare` y se reusa; test que lo afirma | test |
| Se pierde una garantía de clase 2 o 3 al portar | gobierno | Media | la tabla de clases es parte de la task; el review la recorre | revisión humana |
| Se importa una promesa muerta del vanilla | confianza | Media | `LEGACY_PARITY_EXCLUSIONS` con motivo escrito | drift guard |

### Feature flags / cutover

Ninguno nuevo. `client_app_enabled` ya está en `true` y **no** sirve como interruptor (apagarlo apaga el share
board). La ruta es aditiva: `/producer/compose` no existe hoy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1-2 | revertir commit; nada las consume | < 5 min | sí |
| 3-4 | revertir commit; la ruta desaparece | < 5 min | sí |
| 5 | revertir commit. **Un gasto ya ejecutado no se revierte con un deploy** — se reconcilia por créditos | < 10 min + reconciliación | parcialmente |
| 6 | quitar la ruta del server | < 5 min | sí |

### Production verification sequence

1. `/producer/compose` con sesión → 200 y sin `<small>Producer</small>`;
2. `/producer` **sigue** sirviendo el vanilla;
3. estimado real de una recipe conocida coincide con el del vanilla;
4. una ejecución real termina en el feed con su crédito reservado;
5. doble click en Generar → **una** corrida.

### Out-of-band coordination required

Ninguna. Sin migraciones, sin secretos, sin infra.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/producer/compose` sirve el payload cliente detrás de la misma guarda de sesión que `/producer`, y
   `/producer` **no cambió** (test que lo afirma con el flag encendido).
- [ ] El `routeId` no aparece en el DOM servido en ninguno de los tres anchos, con el selector de rutas abierto.
- [ ] `execute` está deshabilitado sin estimado vigente, y cambiar cualquier campo invalida el estimado en el acto.
- [ ] Doble click en Generar produce **una** llamada a `execute`, verificado contando llamadas en el canary.
- [ ] La clave de idempotencia del `execute` es la misma que la del `prepare` que lo precedió.
- [ ] Un modelo no listo se muestra deshabilitado **con su motivo**, no oculto.
- [ ] Las 4 razones de negación se distinguen, y reintentar aparece sólo donde puede funcionar.
- [ ] Las 14 capabilities de `surface: 'composer'` + las 4 de `credits` se despachan de verdad — el test de
   paridad pasa con ellas.
- [ ] Las afordancias sin contrato (inpaint, batch) se renderizan deshabilitadas con su razón visible.
- [ ] `UI ready` pasa a `yes` sólo con mapping, plan GVC y decision log completos y `pnpm task:lint` sin findings.
- [ ] Scorecard visual: promedio ≥ 4.5, piso ≥ 4, fidelidad y resistencia a template ≥ 4.5.
- [ ] Canary a 1440/390/320 sin overflow de página ni de panel, más la pasada de `prefers-reduced-motion`.

## Verification

```bash
pnpm --filter @efeonce-globe/studio-client test
pnpm --filter @efeonce-globe/studio-web test
node apps/studio-client/scripts/producer-composer-canary.mjs
```

## Closing Protocol

1. Mover a `complete/` sólo con la verificación en runtime hecha, o declarar `code complete, rollout pendiente`.
2. Actualizar `legacy-parity.ts` si aparece una capability no declarada.
3. Actualizar `docs/manual-de-uso/creative-studio/operar-feed-viewer-producer-globe.md` con el composer.
4. Registrar en ADR-014 el cierre del Slice 3 y si `TASK-1560` queda desbloqueada.

## Follow-ups

- `TASK-1560` — retiro del payload viejo, desbloqueado por esta task.
- Enmascarado de inpaint: necesita contrato de máscara. Task propia.
- Operaciones batch de biblioteca: necesitan que `library.bulk.*` se despache de verdad.

## Open Questions

- **¿La biblioteca es parte del composer o superficie propia?** Las 6 capabilities de `surface: 'library'` no
  están en esta task. Decidir antes de `TASK-1560`, porque el retiro las necesita cubiertas.
- **¿El riel de créditos vive en el composer o es global?** Acá se construye dentro del composer porque es
  donde la decisión de gasto ocurre, pero el prototipo lo muestra en el header.
