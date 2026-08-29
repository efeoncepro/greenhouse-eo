# TASK-1785 — La lente deja de ser una instrucción y pasa a ser un campo del contrato

## Delta 2026-08-28 (release a producción) — la superficie creció: 20 → 26 tools SEO

El release `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208, run `33178544139`,
manifest `released`) y el deploy del gateway `mcp.efeonce.org` (revisión
`efeonce-mcp-gateway-00024-8b8`) sumaron 6 tools SEO federadas. La cifra «20 tools SEO con
`outputSchema` común» de §Estado actual quedó stale: el registry interno declara hoy **26 tools
SEO** en `src/mcp/greenhouse/server.ts` y el gateway federa **27**.

Dos de las nuevas emiten cifras que caen de lleno en el gap de esta task:
`get_seo_serp_top_results` y `get_seo_competitor_candidates` (recurrencia derivada de esa serie).

> **Corrección 2026-08-29 (durante la implementación).** Este párrafo asignaba a
> `get_seo_serp_top_results` la lente `measured`, con el argumento de que la posición del SERP
> comprado es *exacta*. **Se implementó como `estimated`**, y la corrección es load-bearing:
> **exacto no es medido**. Esa consulta la hicimos nosotros, desde una ubicación que elegimos, y
> ningún usuario la hizo; `§5` de la arquitectura reserva `●` para Search Console precisamente por
> eso. Rotularla `measured` la habría vuelto promediable con GSC —la mezcla exacta que esta task
> existe para impedir— y habría roto además la asimetría de `readKeywordGap`, que **excluye** las
> keywords con impresiones medidas porque la lente medida gana en vez de promediarse. Hay test de
> regresión (`lens-contract.test.ts`). El párrafo original no venía de la autoría de la task sino de
> un Delta posterior sobre el release `c983be7f18e6`. Al aterrizar el campo `lens`,
entran al alcance junto con `get_seo_keyword_gap`, cuyos factores ya declaran procedencia y
`sin_dato` — precedente vecino del mismo invariante, aunque expresado con otro vocabulario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El invariante más load-bearing del módulo —**`●` medido y `◑` estimado jamás se promedian ni se
mezclan**— hoy vive como **prosa dentro de la descripción de cada tool**. Cada una lo dice bien. Pero
un agente que llama dos tools de lentes distintas y redacta un párrafo **las mezcla igual**, y ninguna
tool puede impedirlo: la regla es una instrucción a quien lee, no un mecanismo sobre lo que se
devuelve. Esta task le da mecanismo: la lente viaja como **campo estructural** en cada cifra que cruza
el contrato, y existe una lectura compuesta que devuelve ambas series **ya separadas y etiquetadas**,
para que lo correcto sea también lo más barato de hacer.

## Why This Task Exists

Una guarda es una **afirmación** hasta que un mecanismo la sostiene. El módulo aprendió esa lección
tres veces el 2026-08-27: un ledger de flags que afirmaba `prod: OFF` sobre un runtime que decía
`true`; una cabecera que prometía contención de redirects que el código no implementaba; un probe que
leía `res.ok` como *"observé la página"* cuando sólo significaba *"recibí bytes"*. Las tres eran la
misma cosa — una regla escrita sin nada que la hiciera cumplir.

El contrato `●`/`◑` es hoy exactamente eso. Está escrito en la descripción de cada tool
(*"never average or mix them with GSC series"*) y en `§5` de la arquitectura. Y es correcto. Pero
**opera en la capa equivocada**: la mezcla no ocurre dentro de una tool, ocurre **entre** dos, cuando
alguien compone la respuesta. Ninguna tool ve esa composición, así que ninguna puede defenderla.

El costo de que falle no es cosmético. Es el corazón comercial del módulo: la posición promediada de
GSC (real, ponderada por impresiones, del dominio propio) y la posición exacta de una SERP scrapeada
(de cualquier dominio, con features) **no son la misma magnitud**. Promediarlas produce una cifra sin
referente, presentada a un cliente con la confianza de un dato medido.

**El primitive correcto ya existe en el repo.** `TASK-1709` definió `ProspectFact` con exactamente
esta forma: `{ magnitude, lens, capturedAt, source }`, con `magnitude: null` que significa *"no lo
medimos"* y jamás `0`. Esta task **extiende ese primitive** al resto del contrato agéntico en vez de
inventar uno nuevo.

## Goal

- Toda cifra que cruce el contrato agéntico viaja con su lente **como campo**, no como frase: nadie
  puede consumir un número sin saber de qué naturaleza es.
- `magnitude: null` como estado explícito de *"no medido"*, nunca `0` — el invariante que el grader ya
  sostiene con `score: null ≠ 0`, aplicado un nivel más abajo.
- Una lectura compuesta que devuelva ambas lentes **separadas y etiquetadas**, para que componer bien
  cueste menos esfuerzo que componer mal.
- Un test de contrato que **falle** si una cifra cruza la frontera sin lente. La regla deja de
  depender de que alguien recuerde la descripción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§5 (el contrato de honestidad: la
  fuente del invariante que esta task convierte en mecanismo)**, §1.1 (boundary SEO↔AEO: el cruce es
  en memoria por `organization_id`, jamás JOIN/VIEW/FK — la lectura compuesta de esta task **no** lo
  viola porque compone en memoria), §7 (Full API Parity).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — `score: null ≠ 0`,
  el precedente del invariante.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers: la
  lente se resuelve server-side, jamás en cada consumer.
- `CLAUDE.md §"SQL embebido — type alignment + live testing"` — ejercitar contra PG real toda query nueva.

Reglas obligatorias:

- 🔴 **NUNCA** emitir una cifra de mercado sin su lente y su `capturedAt`.
- 🔴 **NUNCA** una lectura compuesta que promedie, sume o combine `●` con `◑`. Compone = devolver las
  dos, separadas y rotuladas. Jamás fusionarlas en un solo número.
- **NUNCA** `0` donde corresponde `null`. Cero es una medición; ausencia es otra cosa.
- **NUNCA** resolver la lente en el consumer (UI, Nexa, MCP): sale del reader, una sola vez.
- El campo es **aditivo**: ningún consumer vigente puede romperse por su llegada.

## Normative Docs

- `docs/tasks/in-progress/TASK-1709-growth-seo-prospect-diagnostic-lane.md` — `Detailed Spec §5`,
  donde `ProspectFact` define el shape canónico que esta task generaliza.
- `docs/issues/open/ISSUE-154-seo-keywords-lente-sin-declarar-cuando-hay-dato.md` — el mismo
  invariante roto en la superficie visible; contexto de por qué duele.
- `.claude/skills/arch-architect/decision-frameworks/4-pillar-checklist.md`

## Dependencies & Impact

### Depends on

- `src/lib/growth/seo/contracts.ts` — donde viven los tipos del módulo.
- `src/lib/growth/seo/**` readers: `rank-evolution-reader.ts`, `performance/`, `keyword-market-data.ts`, `domain-overview/`, `url-visibility/`, `backlinks/`, `overview/`.
- `src/mcp/greenhouse/{tools.ts,server.ts}` — la superficie que expone el contrato.
- `TASK-1709` — su `ProspectFact` es el precedente; si sigue `in-progress`, coordinar para no divergir el shape.

### Blocks / Impacts

- **`TASK-1691`** (`ui-ux`/`copy`) — declara la lente en la **tabla visible**. **Partición explícita:**
  1691 es la superficie humana, 1785 es el contrato agéntico. No comparten archivos: 1691 vive en la
  vista, 1785 en `src/lib/growth/seo/**` y `src/mcp/**`. 1785 le da a 1691 el campo que hoy tiene que
  inferir.
- **`TASK-1784`** — complementaria y sin solape: 1784 mejora **cuál** tool se elige; 1785 impide que
  el resultado se mezcle mal **después**. Pueden correr en paralelo.
- **Nexa** — consumer directo; gana la capacidad de citar la naturaleza del dato sin adivinarla.
- **`TASK-1313`** — su unión por URL cruza justamente las dos lentes; hereda el campo.

### Files owned

- `src/lib/growth/seo/contracts.ts`
- `src/lib/growth/seo/lens.ts`
- `src/lib/growth/seo/composed/read-dual-lens-visibility.ts`
- `src/lib/growth/seo/__tests__/lens-contract.test.ts`
- Los readers listados en `Depends on` (sólo el mapeo de salida)
- `src/mcp/greenhouse/{tools.ts,server.ts}` (aditivo)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (compartido con `TASK-1784`)

## Current Repo State

### Already exists

- El invariante **declarado** en `§5` de la arquitectura y repetido en las descripciones de las tools
  (`get_seo_domain_overview`: *"lens=estimated … never average or mix them with GSC series"*).
- El shape correcto ya implementado en un dominio: `ProspectFact` de `TASK-1709`
  (`{ magnitude, lens, capturedAt, source }`, con `magnitude: null` explícito).
- El precedente del invariante en el grader: `score: null ≠ 0`.
- `RankEvolutionPoint` con `aiOverview?: boolean` emitido **sólo cuando es `true`**: precedente de
  campo aditivo que no cambia el shape de los consumers legacy.
- 20 tools SEO con `outputSchema` común (`greenhouseMcpToolOutputSchema`).

### Gap

- Fuera del carril de prospecto, **ninguna cifra lleva lente como campo**: la naturaleza del dato
  viaja sólo en la prosa de la descripción de la tool.
- No existe ninguna lectura que devuelva ambas lentes juntas y separadas; hoy componer exige que el
  agente llame dos tools y decida por su cuenta cómo presentarlas.
- No existe ningún test que falle si una cifra cruza la frontera sin lente.
- `grep` de `lens` en `src/lib/growth/seo/` sólo aparece en el diseño de 1709, no en los readers vivos.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/seo/**` con exposición por `src/mcp/greenhouse/**` y `api/platform/**`
- Future candidate home: `domain-package`
- Boundary: primitives `resolveLens` y `readDualLensVisibility`; consumers autorizados son los route handlers de `api/platform/**`, las tools MCP y Nexa
- Server/browser split: la resolución de lente ocurre server-side; al browser llega el DTO con el campo ya resuelto
- Build impact: `none` — tipos y mapeo de salida, sin dependencia nueva
- Extraction blocker: `none` — el cambio es interno al dominio y aditivo en su frontera

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo — la lente se **deriva** de la fuente que ya produjo el dato (GSC = `measured`, DataForSEO = `estimated`); no se persiste una columna nueva
- Consumidores afectados: MCP, Nexa, `api/platform/app` y `ecosystem`, y las vistas que hoy la infieren
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: los DTO vigentes de cada reader y `greenhouseMcpToolOutputSchema`.
- Contrato nuevo o modificado: tipo `Lens = 'measured' | 'estimated'`; campo `lens` + `capturedAt` en las cifras que cruzan; reader compuesto `readDualLensVisibility`; tool MCP que lo expone.
- Backward compatibility: `compatible` — el campo es **aditivo**. Se sigue el precedente de `aiOverview`: donde agregar el campo cambiaría el shape que un consumer legacy compara por igualdad, se emite sólo cuando aporta.
- Full API parity: un primitive resuelve la lente; UI, Nexa y MCP la consumen. Ningún consumer la infiere.

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna nueva y ninguna migración.** La lente es propiedad de la *fuente*, no del dato guardado: `seo_gsc_daily` siempre produce `measured`; las tablas alimentadas por DataForSEO siempre `estimated`. Persistirla sería denormalizar un hecho constante por tabla.
- Invariantes que no se pueden romper:
  - Toda cifra que cruza el contrato lleva `lens` y `capturedAt`.
  - `null` significa *no medido*; `0` es una medición. Jamás se sustituye uno por otro.
  - La lectura compuesta **devuelve** las dos lentes; **nunca** las combina en un número.
  - La lente se deriva server-side, una sola vez.
  - `captured_by_organization_id` sigue sin salir al cliente.
- Write-target allowlist: `N/A` — esta task no escribe en ninguna tabla.
- Tenant/space boundary: sin cambios; los readers conservan su gate por `organization_id` + `seo_v2`.
- Idempotency/concurrency: `N/A` — sólo lectura.
- Audit/outbox/history: sin evento nuevo.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — un campo aditivo en un DTO no necesita flag; su peor caso es que un consumer lo ignore, que es el comportamiento actual.
- Backfill plan: `N/A` — la lente se deriva en lectura, no se almacena.
- Rollback path: revert del PR.
- External coordination: redeploy del gateway para que la tool compuesta quede federada.

### Security and access

- Auth/access gate: sin cambios.
- Sensitive data posture: sin PII. Se conserva la exclusión de `captured_by_organization_id`.
- Error contract: sin cambios; `no_market_data` sigue siendo estado y no cero.
- Abuse/rate-limit posture: ⚠️ la lectura compuesta puede duplicar el trabajo de lectura si se implementa como dos consultas ingenuas. Debe reusar los readers existentes y respetar sus límites, nunca abrir un camino nuevo a PG.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo src/mcp`.
- DB/runtime checks: live test del reader compuesto contra PG real — recordar que `runGreenhousePostgresQuery` devuelve un **array pelado**, no `{ rows }`.
- Integration checks: llamada real a la tool compuesta por el lane ecosystem en staging, verificando que las dos series llegan separadas y con lente.
- Reliability signals/logs: ninguna señal nueva; el test de contrato es el mecanismo.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes, boundary y postura de idempotencia explícitos.
- [ ] Sin tablas nuevas ni migración: justificado por qué la lente se deriva y no se persiste.
- [ ] Postura de rollback explícita.
- [ ] Evidencia runtime listada.
- [ ] Sin fuga de datos sensibles.

## Capability Definition of Done — Full API Parity gate

- [ ] La derivación de lente vive en el primitive, no en la UI ni en el prompt de Nexa.
- [ ] La lectura compuesta es un reader canónico, no un handler de pantalla.
- [ ] Expuesta por `api/platform/ecosystem` + tool MCP en la misma task.
- [ ] Un primitive, muchos consumers: cero inferencia de lente duplicada.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El tipo y su derivación canónica

- `Lens = 'measured' | 'estimated'` y `resolveLens(source)` en `src/lib/growth/seo/lens.ts`, con el
  mapeo fuente→lente declarado en un solo lugar.
- Shape canónico de cifra, generalizado desde el `ProspectFact` de `TASK-1709`:
  `{ magnitude: number | null, lens, capturedAt, source }`.
- Coordinar con 1709 para que ambos usen el MISMO tipo; si 1709 aún está `in-progress`, alinear
  antes de que su shape se congele.

### Slice 2 — Los readers emiten la lente

- Mapeo de salida en los readers vigentes: rank evolution, performance (GSC), keyword market data,
  domain overview, url visibility, backlink profile, overview KPIs.
- **Aditivo y con el precedente de `aiOverview`**: donde agregar el campo rompería una comparación
  estructural de un consumer legacy, emitirlo sólo cuando aporta, y documentar cuál es cuál.
- Cero cambios de semántica: ninguna cifra cambia de valor en este slice.

### Slice 3 — El test de contrato que le da mecanismo a la regla

- Test que recorre los DTO de todos los readers del módulo y **falla** si una cifra numérica cruza sin
  `lens` o sin `capturedAt`.
- Cubre el caso inverso: un `0` donde la fuente no tenía dato debe ser `null`.
- Es el entregable que convierte la afirmación en guarda: sin este slice, los otros son cosmética.

### Slice 4 — La lectura compuesta

- `readDualLensVisibility({ organizationId, subject, range })`: devuelve `{ measured: […], estimated: […] }`
  **separadas**, cada serie con su lente y su `as-of`, reusando los readers existentes.
- 🔴 **Jamás** un campo combinado, ni un promedio, ni un "consolidado". Componer = presentar las dos.
- Tool MCP que la expone, con descripción que diga explícitamente que las dos series **no** son
  comparables punto a punto.

### Slice 5 — Cierre documental

- Delta en `§5` de la arquitectura declarando que el invariante pasó de instrucción a mecanismo.
- Aporte a `MCP_TOOL_SURFACE_INVARIANTS.md` (compartido con `TASK-1784`).
- `Handoff.md`, `changelog.md`, delta en `TASK-1691` avisando que ya tiene el campo que necesitaba.

## Out of Scope

- **La superficie visible.** Declarar la lente en la tabla de oportunidades es `TASK-1691`.
- **Persistir la lente en columnas.** Se deriva en lectura; ver `Detailed Spec §2`.
- **Cambiar valores.** Ninguna cifra cambia de magnitud en esta task, sólo gana metadatos.
- **El ruteo de selección entre tools** — es `TASK-1784`.
- **Fusionar las dos series en un índice único.** Prohibido por el invariante: si alguien lo pide,
  es una decisión de producto que exige su propia ADR.
- **Extender la lente a dominios fuera de `growth/seo`** (finance, payroll). Si el patrón resulta,
  generalizarlo es follow-up.

## Detailed Spec

### 1. Por qué la capa importa: el invariante opera entre tools, no dentro

Ninguna tool mezcla lentes. La mezcla ocurre cuando alguien **llama dos y escribe un párrafo**. Esa
composición no la ve ninguna tool, así que ninguna descripción puede defenderla — por bien escrita
que esté.

Dos formas de darle mecanismo, y esta task hace las dos:

1. **Que el dato se lleve su naturaleza puesta.** Si `lens` es un campo, quien compone no tiene que
   recordar de dónde vino cada número: lo tiene al lado.
2. **Que lo correcto sea lo más barato.** Hoy presentar bien las dos lentes exige dos llamadas y una
   decisión; presentarlas mal exige una llamada y ninguna. Mientras esa asimetría exista, la regla
   pierde. El reader compuesto la invierte.

### 2. Por qué la lente se DERIVA y no se persiste

Sería tentador agregar una columna `lens` a las tablas. Es incorrecto: **la lente es constante por
tabla**. `seo_gsc_daily` es medida por definición; `seo_domain_overview_snapshots`, estimada por
definición. Una columna que vale siempre lo mismo dentro de su tabla es denormalización que
eventualmente diverge — alguien la escribe mal en un INSERT y ahora hay filas GSC marcadas
`estimated`.

Deriva de la **fuente**, en un solo lugar (`resolveLens`), y ninguna migración puede corromperla.

### 3. `null` no es `0`, y es el mismo invariante que el grader ya sostiene

`score: null ≠ 0` está en la arquitectura del grader. `magnitude: null` de `ProspectFact` lo repite un
nivel más abajo, y `TASK-1778` lo repitió otra vez con `truncated`/`observable`: **un probe de
presencia jamás afirma ausencia sin evidencia de que pudo observar.**

Es el mismo invariante tres veces. Esta task lo hace explícito en el tipo compartido, para que la
próxima vez no haya que redescubrirlo.

### 4. Forma del contrato

```ts
type Lens = 'measured' | 'estimated'

interface SeoFigure {
  magnitude: number | null   // null = no medido. JAMÁS 0 por ausencia.
  lens: Lens
  capturedAt: string         // ISO. Sin as-of, la cifra no es reportable.
  source: string             // 'gsc' | 'dataforseo_labs' | 'dataforseo_backlinks' | …
}

interface DualLensVisibility {
  measured: SeoFigure[]      // GSC. Verdad del dominio propio.
  estimated: SeoFigure[]     // DataForSEO. Verdad de mercado.
  // NO hay campo combinado. Es deliberado y es el punto entero de la task.
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tipo + derivación) → Slice 2 (readers) → Slice 3 (test de contrato).
- 🔴 **Slice 3 no es opcional ni diferible.** Sin el test, la lente es un campo que alguien puede
  omitir en el próximo reader y nadie se entera: volveríamos a tener una afirmación.
- Slice 4 depende de Slice 2.
- Slice 5 al final.
- Coordinación con `TASK-1709`: si sigue `in-progress` cuando se tome ésta, alinear el tipo **antes**
  del Slice 1, no después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Agregar el campo rompe un consumer que compara DTO por igualdad estructural | UI / MCP / Nexa | medium | Precedente de `aiOverview`: emitir sólo donde aporta; barrido de consumers en Discovery; `pnpm test` completo | Test de consumer en rojo |
| Se implementa el campo pero no el test, y el próximo reader nace sin lente | data quality | **high** | Slice 3 declarado no diferible y con orden duro | Un reader nuevo sin `lens` que igual mergea |
| Alguien agrega un campo "consolidado" a la lectura compuesta porque un consumer lo pide | credibilidad | medium | Prohibido en `Out of Scope`; el shape no tiene dónde ponerlo; exigir ADR propia | PR que agrega un promedio |
| La lectura compuesta duplica consultas y encarece la lectura | runtime | low | Reusa los readers existentes; sin camino nuevo a PG | Latencia del lane ecosystem |
| El tipo diverge del `ProspectFact` de 1709 y quedan dos shapes para lo mismo | mantenimiento | medium | Coordinación explícita en el ordering; un solo tipo compartido | Dos definiciones de `lens` en el repo |
| Persistir la lente por comodidad y que diverja de la fuente | data quality | low | `Detailed Spec §2` lo prohíbe con razón escrita | Columna `lens` en una migración |

### Feature flags / cutover

Sin flag — aditivo, cutover inmediato. Un campo nuevo en un DTO no tiene modo "apagado" útil: el
consumer que no lo usa se comporta igual que hoy. El riesgo real (romper una comparación estructural)
se detecta en `pnpm test`, antes del merge, no en producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — tipos puros sin consumers | < 5 min | sí |
| Slice 2 | Revert PR del mapeo de salida | < 10 min | sí |
| Slice 3 | Retirar el test (⚠️ deja la regla sin mecanismo: sólo como último recurso) | < 5 min | sí |
| Slice 4 | Revert PR + retirar la tool del registro MCP | < 10 min | sí |
| Slice 5 | Revert del doc | < 5 min | sí |

### Production verification sequence

1. `pnpm test` completo verde: es el gate que detecta consumers rotos por el campo aditivo.
2. Deploy a staging; llamada real por el lane ecosystem a dos tools de lentes distintas, confirmando que cada cifra llega con `lens` y `capturedAt`.
3. Llamada a la tool compuesta: confirmar que las dos series llegan **separadas** y que no existe ningún campo combinado.
4. Una conversación real con Nexa pidiendo el estado de un cliente: verificar que en su respuesta distingue medido de estimado sin que el prompt se lo recuerde.
5. Redeploy del gateway y canary.

### Out-of-band coordination required

- Redeploy del gateway para federar la tool compuesta.
- Coordinar con `TASK-1709` si sigue abierta, para compartir el tipo.
- Avisar a `TASK-1691` que el campo que necesitaba ya existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un único tipo `Lens` y una única función `resolveLens(source)`; ningún consumer infiere la lente.
- [ ] Todos los readers del módulo emiten `lens` y `capturedAt` en sus cifras.
- [ ] Existe un test de contrato que **falla** si una cifra numérica cruza sin lente o sin `as-of`.
- [ ] Existe un test que falla si una ausencia se emite como `0` en vez de `null`.
- [ ] `readDualLensVisibility` devuelve las dos series separadas y **no expone ningún campo combinado**.
- [ ] La tool MCP que la expone declara en su descripción que las series no son comparables punto a punto.
- [ ] Ninguna cifra cambió de valor: probado con test de regresión sobre los readers.
- [ ] Ningún consumer vigente se rompió: `pnpm test` completo verde.
- [ ] No se creó ninguna columna `lens` en ninguna tabla, y el porqué está escrito.
- [ ] El tipo es el mismo que usa `TASK-1709`; no hay dos shapes para lo mismo.
- [ ] `captured_by_organization_id` sigue sin aparecer en ningún DTO.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo src/mcp`
- `pnpm test` (suite completa — es el gate que detecta consumers rotos)
- Live test del reader compuesto contra PG real vía proxy
- Llamada real por el lane ecosystem en staging
- Conversación real con Nexa sobre un cliente vivo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-1691`, `TASK-1784`, `TASK-1709` y `TASK-1313`
- [ ] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §5 declarando que el invariante ganó mecanismo
- [ ] delta en `TASK-1691` avisando que el campo ya existe

## Follow-ups

- Generalizar `SeoFigure` a otros dominios que mezclan medido y estimado (finance forecast vs actual, delivery estimado vs real), si el patrón resulta.
- Evaluar si `ISSUE-154` puede cerrarse con 1691 una vez que este campo exista.

## Open Questions

- ¿`source` es vocabulario cerrado con CHECK a nivel de tipo, o string libre? La propuesta es cerrado: si el motor sólo entiende N fuentes, que el tipo las enumere.
- ¿La tool compuesta reemplaza a `get_seo_visibility_360` o convive? La propuesta es convivir — no se quita nada — y que `TASK-1784` rutee entre ambas.
