# TASK-1791 — Growth SEO: señal de pertinencia del candidato (dos productores, ninguno la declara)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

Un candidato de keyword **no lleva ninguna señal de pertinencia al negocio**: la tabla tiene ocho
columnas de sustancia y ninguna es marca, categoría ni relevancia. Un término completamente ajeno
pasa **todos** los checks del módulo, porque tiene volumen, intención y barrera de enlaces. Esta task
agrega esa señal como **advertencia con evidencia** —hermana de `clusterConflict`—, nunca como filtro.

## Why This Task Exists

**Evidencia real, de una corrida con gasto (2026-08-27, sesión `greenhouse-eo-63`):** una expansión de
`keyword_ideas` para **Efeonce** —agencia B2B que vende AEO en Chile— devolvió 50 keywords de
consumidor sobre ChatGPT como producto: `chatgpt en linea` (volumen 480), `dueño de chatgpt` (90),
`chatgpt rojo` (10), `compartir suscripciones chatgpt`. Cero relación con el negocio, y **ni un solo
check las marca**. La causa mecánica: `keyword_ideas` resuelve una **categoría** desde las seeds, y si
una seed lleva una entidad dominante, la categoría se resuelve a esa entidad.

**Hay DOS productores de candidatos y ninguno declara pertinencia**, y ése es el alcance real del
hueco:

1. **Discovery por seeds** (`TASK-1664`). Vector conocido; el caso de arriba salió de una seed mal
   elegida, así que es en parte error de uso.
2. **Gap competitivo** (`TASK-1662`). 🔴 **Acá el vector es estructural, no un error de uso: nadie
   eligió las seeds — las eligió el competidor.** Un competidor sirve segmentos, líneas de producto y
   mercados que el cliente no, y esas keywords entran con volumen alto y todos los checks en verde.
   No hay a quién atribuirle el desvío. ⚠️ **Hipótesis a contrastar**, no hecho: el razonamiento es
   estructural y **no se verificó contra la implementación**, porque `TASK-1662` sigue `in-progress`
   con su Slice 4 pendiente. Comprobarlo es parte del Slice 1.

**Por qué corre el reloj: el daño se congela.** El orden por defecto del reader es volumen
descendente. Si el `priority_score` de `TASK-1700` hereda esa señal, `chatgpt en linea` (480) queda
**por encima** de un término genuinamente relevante con volumen 10 — y ese aggregate es
**append-only**, así que el score entra escrito y no se corrige después. Es la misma clase de
problema que `TASK-1694` existía para evitar (duplicados y barrera engañosa congelados en el primer
snapshot), por otra puerta.

**La materia prima ya existe y nadie la usa.** El lado AEO tiene brand intelligence por perfil
(`getActiveBrandIntelligence`, con `categoryLabel` y `businessModel`). Discovery no la toca: el único
archivo de `growth/seo/` que la referencia es `grounded-query-bridge.ts`, que es el puente AEO.

## Goal

- Señal de pertinencia por candidato con **vocabulario cerrado de tres valores** y evidencia
  adjunta, disponible para quien decide ordenar (`TASK-1700`) o promover a tracking.
- Cobertura de **los dos productores**, no sólo del discovery por seeds.
- `unknown` como estado de primera clase que **jamás** se lee como `clear`.
- Cero filtrado: ningún candidato se descarta por esta señal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§1.1 (boundary duro SEO↔AEO: la
  restricción central de esta task, ver `Detailed Spec §2`)**, §4.2 (candidates append-only), §5
  (honestidad de lentes), §7.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — dónde vive brand
  intelligence y qué garantiza.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- 🔴 **NUNCA** JOIN, VIEW ni FK entre `seo_keyword_discovery_candidates` y
  `greenhouse_growth.grader_brand_intelligence`. Es tabla `grader_*` y §1.1 lo prohíbe. La
  composición es **en memoria por `organization_id`**.
- 🔴 **NUNCA** filtrar ni descartar un candidato por esta señal. Es advertencia, no compuerta.
- **NUNCA** tratar `unknown` como `clear`. Sin brand intelligence resuelta no hay juicio, y decir
  "es pertinente" ahí sería inventarlo.
- **NUNCA** hacer que el LLM decida sin evidencia adjunta y revisable: la señal viaja con **por qué**.
- **NUNCA** escribir el veredicto en la fila del candidato (es append-only y el juicio puede mejorar);
  ver `Detailed Spec §3`.

## Normative Docs

- `docs/tasks/complete/TASK-1694-*.md` — §smoke, con la corrida real y las 50 keywords de ChatGPT.
- `docs/tasks/complete/TASK-1664-*.md` — contrato de runs/candidates/actions append-only.
- `docs/tasks/to-do/TASK-1700-*.md` — el consumidor que ordena; su `priority_score` es lo que hay que
  proteger.
- `docs/tasks/in-progress/TASK-1662-*.md` — el segundo productor; la hipótesis a contrastar.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_keyword_discovery_candidates` (`TASK-1664`, migración `20260814140033339`).
- `src/lib/growth/seo/keyword-discovery/{reader.ts,runner.ts}`.
- `getActiveBrandIntelligence` (`src/lib/growth/ai-visibility/brand-intelligence/store.ts:54`) sobre `greenhouse_growth.grader_brand_intelligence`.
- `TASK-1662` — el segundo productor. Si sigue `in-progress`, coordinar antes de asumir su shape.

### Blocks / Impacts

- 🔴 **`TASK-1700`** — es el consumidor cuyo `priority_score` esta señal existe para proteger.
  **Debería consumirla antes de tomar su primer snapshot**, porque el aggregate es append-only y un
  score mal calculado queda escrito. Declarar el contrato entre ambas en Discovery.
- **`TASK-1662`** — segundo productor; hereda la señal.
- **`TASK-1667`/`1668`** (editorial work item, loop de QA) — consumidores aguas abajo.
- **`TASK-1789`** (content decay) — **no se solapa**: opera sobre páginas propias del cliente, que son
  pertinentes por definición.

### Files owned

- `src/lib/growth/seo/candidate-relevance/{signal.ts,reader.ts}`
- `src/lib/growth/seo/candidate-relevance/__tests__/*.test.ts`
- `src/lib/growth/seo/keyword-discovery/reader.ts` (aditivo en el DTO)
- `src/app/api/platform/ecosystem/growth/seo/keyword-discovery/route.ts` (aditivo)
- `docs/manual-de-uso/growth/interpretar-pertinencia-de-candidatos.md`

## Current Repo State

### Already exists

- `seo_keyword_discovery_candidates` con ocho columnas de sustancia: `keyword`,
  `normalized_keyword`, `seed_keywords_json`, `source_endpoint`, `source_rank`, `captured_at`,
  `market_source`, `raw_payload_hash`.
- Brand intelligence por perfil con `categoryLabel` y `businessModel`, en `grader_brand_intelligence`.
- `clusterConflict` como **precedente de forma**: advertencia con evidencia que no bloquea.
- Ledger de acciones append-only (`seo_keyword_discovery_actions`) donde puede vivir el veredicto.

### Gap

- Ninguna de las ocho columnas es marca, categoría ni relevancia — verificado contra la migración y
  contra el DTO.
- Discovery no importa brand intelligence: el único consumidor en `growth/seo/` es el puente AEO.
- Barrido del backlog por cuatro términos (`relevancia|relevance`, `deriva de entidad|entity drift`,
  `categoryLabel|businessModel`, `brand intelligence × discovery`): **cero tasks**.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/seo/candidate-relevance/**`, servido desde el portal Next.js
- Future candidate home: `domain-package`
- Boundary: primitives `resolveCandidateRelevance` (puro) y `readCandidateRelevance` (IO); consumers autorizados son el reader de discovery, `api/platform/**` y `TASK-1700`
- Server/browser split: la resolución ocurre server-only; al browser llega la señal ya resuelta
- Build impact: `none`
- Extraction blocker: la materia prima vive en el dominio AEO y se compone en memoria; mover uno de los dos exige resolver esa frontera

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo — la señal se **deriva** en lectura; el veredicto humano, si lo hay, va al ledger de acciones existente
- Consumidores afectados: reader de discovery, `api/platform/ecosystem`, MCP, `TASK-1700`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: el DTO de candidates y el ledger `seo_keyword_discovery_actions`.
- Contrato nuevo: `CandidateRelevance = { verdict: 'clear' | 'conflict' | 'unknown', evidence, resolvedAt }`, aditivo en el DTO del candidato.
- Backward compatibility: `compatible` — aditivo; un consumer que lo ignore se comporta como hoy.
- Full API parity: un primitive resuelve la señal; discovery, MCP y `TASK-1700` la consumen. Ninguno la infiere.

### Data model and invariants

- Entidades afectadas: lectura sobre `seo_keyword_discovery_candidates` y `grader_brand_intelligence`; escritura **sólo** si un humano emite veredicto, y va al ledger de acciones ya existente.
- Invariantes:
  - **Sin JOIN cross-dominio.** §1.1: la composición es en memoria por `organization_id`.
  - `verdict` con **CHECK de vocabulario cerrado** de tres valores; un cuarto rompe, no se cuela.
  - **`unknown` ≠ `clear`.** Sin brand intelligence resuelta para esa organización, el veredicto es `unknown` y así viaja.
  - La señal **nunca** descarta un candidato.
  - **No se escribe en la fila del candidato** (append-only, y el juicio puede mejorar cuando mejore la brand intelligence): se deriva en lectura.
  - La evidencia viaja con el veredicto: qué categoría se comparó contra qué.
- Write-target allowlist: `[confirmar boundary test en Discovery]`
- Tenant/space boundary: `organization_id` + entitlement `seo_v2`, heredado.
- Idempotency/concurrency: derivación pura en lectura; sin estado.
- Audit/outbox/history: sin evento nuevo. Un veredicto humano usa el ledger de acciones existente.

### Migration, backfill and rollout

- Migration posture: `none` — salvo que el ledger de acciones necesite un `action_kind` nuevo para el veredicto humano, en cuyo caso es aditivo sobre su CHECK.
- Default state: `enabled with rationale` — una señal aditiva que no filtra no necesita flag.
- Backfill plan: `N/A` — se deriva en lectura, así que los candidatos históricos la ganan sin reproceso.
- Rollback path: revert del PR.
- External coordination: ninguna.

### Security and access

- Auth/access gate: heredado del reader de discovery.
- Sensitive data posture: sin PII. ⚠️ El `categoryLabel` de brand intelligence sale de un read grounded por LLM: es **evidencia**, no verdad, y el contrato lo trata como tal.
- Error contract: `unknown` es el estado honesto ante ausencia de insumo, no un error.
- Abuse/rate-limit posture: sin llamadas al proveedor.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: live test del reader contra PG real (`runGreenhousePostgresQuery` devuelve **array pelado**).
- Integration checks: correr sobre la organización de Efeonce y verificar que las 50 keywords de ChatGPT salen `conflict` con evidencia; y sobre una organización **sin** brand intelligence, que salen `unknown` y no `clear`.
- Reliability signals/logs: sin señal nueva.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores con paths reales.
- [ ] Invariantes explícitos, incluido el no-JOIN cross-dominio.
- [ ] Sin migración, o aditiva y justificada.
- [ ] Evidencia runtime con los dos casos (conflicto y sin insumo).
- [ ] `categoryLabel` tratado como evidencia, no como verdad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrastar la hipótesis del segundo productor

- Verificar contra la implementación real de `TASK-1662` si el gap competitivo produce candidatos por
  un camino que también carece de pertinencia.
- 🔴 Si la hipótesis **no** se sostiene, el alcance se reduce a un productor y la task lo declara. No
  se escribe como hecho lo que no se comprobó.

### Slice 2 — El resolvedor, puro

- `resolveCandidateRelevance(candidate, brandIntel)`: función pura, sin IO, que devuelve
  `{ verdict, evidence }` con los tres valores del vocabulario cerrado.
- Tests de tabla con el caso real documentado (`chatgpt en linea` contra Efeonce) y con el caso
  inverso: un término de cola larga legítimo que **no** debe salir `conflict`.

### Slice 3 — El reader, componiendo en memoria

- Lectura de candidatos y de brand intelligence **por separado**, composición en memoria por
  `organization_id`. Cero SQL cross-dominio.
- `unknown` cuando no hay brand intelligence activa para esa organización.
- Live test contra PG real.

### Slice 4 — Exposición y cierre

- Campo aditivo en el DTO del reader de discovery + lane ecosystem.
- Delta en `TASK-1700` declarando que debe consumir la señal **antes** de su primer snapshot.
- Runbook de interpretación, `Handoff.md`, `changelog.md`, delta en §1.1 si hace falta aclarar el
  patrón de composición en memoria.

## Out of Scope

- **Filtrar o descartar candidatos.** Prohibido; es el error invisible que esta task existe para no cometer.
- **Ordenar o puntuar.** El `priority_score` es de `TASK-1700`; esta task le da un insumo.
- **Mejorar brand intelligence.** Se consume como está; si no resuelve, el veredicto es `unknown`.
- **Relevancia de páginas propias** — `TASK-1789` opera sobre contenido del cliente, pertinente por definición.
- **Cualquier JOIN entre `seo_*` y `grader_*`.**

## Detailed Spec

### 1. Señal, no filtro — y por qué la diferencia es el error invisible

Un filtro duro descartaría candidatos de cola larga legítimos **en silencio**: nadie ve lo que no
llegó a la lista, así que el error no se puede detectar por inspección. Una advertencia deja la
decisión donde corresponde y, si se equivoca, se ve.

Forma canónica, hermana de `clusterConflict`: `conflict` · `clear` · `unknown`. Y **`unknown` nunca
se lee como `clear`** — sin brand intelligence resuelta no hay juicio que emitir, y decir "es
pertinente" ahí sería inventarlo. Es el mismo invariante que `magnitude: null ≠ 0` y que
`score: null ≠ 0`.

### 2. 🔴 La restricción central: `grader_brand_intelligence` es tabla `grader_*`

La materia prima vive en `greenhouse_growth.grader_brand_intelligence`
(`brand-intelligence/store.ts:54`). El §1.1 prohíbe JOIN, VIEW y FK entre `seo_*` y `grader_*`, y la
implementación obvia —un JOIN por `organization_id`— **viola el boundary**.

La composición correcta es la misma que el módulo ya usa para el cuadrante 360 y que `TASK-1787`
usará para citas × tráfico: **leer los dos lados por separado y componer en memoria**. Cuesta una
consulta más y preserva la frontera que permite que los dos motores evolucionen sin acoplarse.

### 3. Por qué la señal se deriva y no se persiste en el candidato

La tabla de candidatos es **append-only**. Escribir el veredicto ahí lo congelaría con la calidad de
brand intelligence del día de la captura — y esa calidad **mejora**: un perfil que hoy no resuelve
categoría puede resolverla mañana. Un candidato marcado `unknown` en agosto seguiría diciendo
`unknown` en diciembre aunque ya haya insumo para juzgarlo.

Derivarla en lectura hace que la señal mejore sola. Lo que sí se persiste, en el ledger de acciones
que ya existe, es el **veredicto humano** cuando alguien lo emite: eso es una decisión, no una
derivación, y merece quedar registrada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 Slice 1 primero: puede reducir el alcance a la mitad, y escribir como hecho una hipótesis sin contrastar es justo lo que esta task combate.
- Slice 2 → Slice 3 → Slice 4.
- Coordinar con `TASK-1700` **antes** de que tome su primer snapshot: después, el score queda escrito.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alguien convierte la señal en filtro porque "es obvio" y se descarta long-tail en silencio | credibilidad | **high** | Prohibido en reglas duras y `Out of Scope`; el reader no expone un modo de descarte | Candidatos que desaparecen sin acción registrada |
| `unknown` se colapsa a `clear` en un consumer | credibilidad | **high** | Vocabulario cerrado de tres valores; test que falla si un consumer los binariza | Conteos de `clear` sospechosamente altos |
| Se implementa con JOIN a `grader_brand_intelligence` y se rompe §1.1 | arquitectura | medium | Regla dura + revisión de SQL en el PR; composición en memoria documentada | JOIN entre `seo_*` y `grader_*` |
| `TASK-1700` toma su primer snapshot antes de consumir la señal y congela scores malos | data quality | medium | Delta explícito en 1700; coordinación declarada en el ordering | `priority_score` alto en candidatos ajenos al negocio |
| La hipótesis de `TASK-1662` se escribe como hecho sin contrastarla | credibilidad | medium | Slice 1 la contrasta y la task declara el resultado, sea cual sea | Spec afirmando algo que la implementación no hace |
| `categoryLabel` se trata como verdad y no como evidencia de un read por LLM | data quality | medium | Declarado en el contrato; la evidencia viaja con el veredicto | Veredicto sin evidencia adjunta |

### Feature flags / cutover

Sin flag — señal aditiva que no filtra ni gasta. Su peor caso es que un consumer la ignore, que es el
comportamiento actual.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A — produce un informe | n/a | n/a |
| Slice 2 | Revert PR — función pura | < 5 min | sí |
| Slice 3 | Revert PR — sólo lectura | < 10 min | sí |
| Slice 4 | Revert PR del campo aditivo | < 10 min | sí |

### Production verification sequence

1. Live test contra PG real verde.
2. Correr sobre la organización de Efeonce: las 50 keywords de ChatGPT deben salir `conflict` **con evidencia legible**.
3. Correr sobre una organización sin brand intelligence: `unknown`, nunca `clear`.
4. Correr sobre un cliente con cola larga legítima: verificar que **no** se marcan `conflict` en masa.
5. Confirmar con `TASK-1700` que consume la señal antes de su primer snapshot.

### Out-of-band coordination required

- Coordinación con la sesión que lleve `TASK-1700` sobre el orden del primer snapshot.
- Coordinación con `TASK-1662` para contrastar la hipótesis del Slice 1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El Slice 1 dejó por escrito si el gap competitivo comparte el hueco, y la task refleja el resultado real — no la hipótesis.
- [ ] `verdict` tiene vocabulario cerrado de tres valores y `unknown` nunca se lee como `clear`, probado con test.
- [ ] Ningún candidato se descarta por esta señal; el reader no expone modo de filtrado.
- [ ] La evidencia viaja con el veredicto: qué categoría se comparó contra qué.
- [ ] No existe JOIN, VIEW ni FK entre `seo_keyword_discovery_candidates` y `grader_brand_intelligence`.
- [ ] La señal se deriva en lectura; **no** se escribe en la fila del candidato.
- [ ] Las 50 keywords de ChatGPT de la corrida real salen `conflict` con evidencia legible.
- [ ] Una organización sin brand intelligence devuelve `unknown` para todos sus candidatos.
- [ ] Un cliente con cola larga legítima no se marca `conflict` en masa.
- [ ] `TASK-1700` tiene delta declarando que consume la señal antes de su primer snapshot.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (gate de cierre)
- Live test contra PG real vía proxy
- Corrida sobre Efeonce, sobre una org sin brand intelligence y sobre un cliente con cola larga

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] impacto cruzado sobre `TASK-1700`, `TASK-1662`, `TASK-1664`, `TASK-1667` y `TASK-1668`
- [ ] delta en `TASK-1700` sobre el orden del primer snapshot
- [ ] runbook de interpretación creado

## Follow-ups

- Evaluar si la señal debe alimentar también la promoción a tracking (`trackKeywords`), donde el compromiso de gasto es recurrente.
- Evaluar una señal equivalente para los competidores declarados: ¿este dominio compite de verdad con el cliente?

## Open Questions

- ¿El veredicto humano necesita un `action_kind` nuevo en el ledger de acciones, o encaja en los existentes? Lo decide el Slice 4 tras revisar su CHECK.
- ¿El umbral de `conflict` es binario o gradual? La propuesta es binario con evidencia: un score continuo invita a que alguien lo use como filtro por umbral.
