# TASK-1779 — Memoria de trabajo del cliente (fundación transversal)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `db`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la memoria de trabajo por organización: el contexto de negocio que hoy vive en la cabeza de
quien atiende la cuenta, las notas sobre sus competidores, el rol declarado de sus páginas clave, y
un registro de qué investigación pagada ya se compró y qué concluyó. Cada fila declara quién la
escribió — persona, Nexa o un agente MCP — sobre el mismo primitive.

## Why This Task Exists

Tres huecos distintos que son el mismo hueco.

**Se vuelve a comprar lo que ya se pagó.** El ledger `greenhouse_growth.seo_provider_spend_daily`
registra cuánto se gastó por organización, familia y día, pero no **qué** se compró. Un agente que
retoma una cuenta la semana siguiente no tiene forma de saber que la misma consulta a DataForSEO
corrió hace seis días, así que la vuelve a pedir. El gasto es real y la información ya estaba.

**El conocimiento de la cuenta no tiene dónde vivir.** Quién es el competidor que importa y por qué,
cuál es la página que gana dinero y cuál es sólo tráfico, qué posicionamiento declaró el cliente en
la reunión de kickoff: hoy nada de eso tiene tabla. Vive en un hilo de Teams, en la memoria de una
persona, o se infiere de nuevo en cada corrida. `brand_intelligence` del grader es derivado por un
modelo, no autorado por quien conoce la cuenta — y por eso no sirve como fuente.

**Y sin procedencia, Nexa no puede escribir.** El contrato de Full API Parity exige que UI, Nexa y
MCP sean consumers del mismo primitive. Para una memoria compartida eso obliga a que cada fila
declare **quién la escribió**: sin ese campo, la primera vez que un agente corrija una nota humana
nadie va a poder distinguirlo, y la memoria deja de ser confiable justo cuando empieza a usarse.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §4.2 y §7.4.
El barrido por dominio y superficie sobre las 76 tasks del carril Growth no encontró ninguna que
declare esta superficie.

## Goal

- Existe una memoria por organización que persiste contexto de negocio, notas de competidor, rol de
  página y registro de investigación, con procedencia por fila.
- Antes de comprar investigación paga, un consumer puede preguntar si esa misma consulta ya corrió
  dentro de una ventana declarada, y reusar el resultado en vez de volver a pagarlo.
- La memoria nace con contrato gobernado: reader, command y tool MCP en el mismo PR, de modo que
  persona y agente escriban sobre el mismo primitive sin lógica duplicada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- La memoria **extiende** el objeto canónico `Cliente`/`Organización` por FK a
  `greenhouse_core.organizations`. NUNCA crea una identidad paralela de cliente.
- NUNCA toma propiedad de `greenhouse_growth.seo_competitors`: esa tabla ya está reclamada por
  `TASK-1699`, que le da su primer consumer. Las notas de competidor de esta task **cuelgan** de esa
  fila, jamás la reemplazan ni la duplican.
- El registro de investigación es **append-only**: se consulta y se agrega, nunca se edita. Una
  conclusión pasada no cambia porque hoy sepamos más.
- Procedencia obligatoria en cada fila, reusando el vocabulario canónico ya vigente en
  `src/lib/growth/seo/contracts.ts` (`operator_ui | nexa | mcp | seed | backfill`). NUNCA acuñar un
  vocabulario nuevo para lo mismo.
- Toda escritura pasa por command con capability; NUNCA un `INSERT` desde un route handler.

## Normative Docs

- `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` — §4.2 (el hallazgo), §7.4 (la forma propuesta)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` — objeto canónico al que cuelga la memoria (existe)
- `src/lib/entitlements/runtime.ts` + `src/config/entitlements-catalog.ts` — para la capability nueva
- `src/lib/postgres/client.ts` — conexión canónica

### Blocks / Impacts

- `TASK-1669` (plan diario agéntico): es el consumer natural del registro de investigación; hoy no
  tiene de dónde leer qué ya se investigó.
- `TASK-1699` y `TASK-1662`: poseen `seo_competitors`; esta task **agrega notas** sobre esas filas y
  debe coordinar el orden — si 1699 aterriza primero, esta cuelga de su modelo ya declarado.
- `src/lib/growth/seo/entitlement.ts`: gana un consumer de lectura para la regla anti-recompra.
- Cualquier superficie futura que quiera mostrar la memoria — queda como task `ui-ux` aparte.

### Files owned

- `migrations/[nueva]-task-1779-client-working-memory.sql`
- `src/lib/client-memory/contracts.ts`
- `src/lib/client-memory/store.ts`
- `src/lib/client-memory/commands.ts`
- `src/lib/client-memory/readers.ts`
- `src/lib/client-memory/research-log.ts`
- `src/app/api/platform/ecosystem/client-memory/**`
- `src/mcp/greenhouse/server.ts` (registro de tools nuevas — modifica sin poseer)
- `src/config/entitlements-catalog.ts` (capability nueva — modifica sin poseer)

## Current Repo State

### Already exists

- `greenhouse_core.organizations` — el objeto canónico de cliente.
- `greenhouse_growth.seo_provider_spend_daily` (`migrations/20260805134439202_...`) — registra cuánto
  se gastó por `organization × familia × día`, sin saber qué se compró.
- `greenhouse_growth.seo_competitors` — existe desde `migrations/20260805134439202_...:59-76`, hoy sin
  lectores ni escritores; `TASK-1699` la reclama.
- `src/lib/growth/ai-visibility/**` → `grader_brand_intelligence` — contexto de marca **derivado por
  LLM**, no autorado. No sirve como memoria declarada.
- `src/lib/growth/seo/contracts.ts` — el vocabulario de procedencia que esta task reusa.
- `src/lib/api-platform/resources/**` — el patrón de lane ecosystem a replicar.

### Gap

- No existe ninguna tabla de contexto de negocio autorado por org.
- No existe registro de qué investigación se compró: el ledger tiene el monto, no el objeto.
- No existe modelo de rol de página (`hub` / `spoke` / `money`) en ninguna parte del repo.
- No existe procedencia por fila que distinga escritura humana de escritura de agente en un objeto
  compartido.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/client-memory/` en el portal Next.js, con su lane bajo `api/platform/ecosystem`
- Future candidate home: `domain-package`
- Boundary: `commands` y `readers` de `src/lib/client-memory/` como primitive único; consumers autorizados son UI del portal, lane ecosystem, tools MCP y Nexa
- Server/browser split: `store.ts` es `server-only`; el browser sólo recibe VMs ya resueltos, nunca acceso a Postgres
- Build impact: `none`
- Extraction blocker: `FK a greenhouse_core.organizations obliga a compartir la base con el portal`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `db`
- Source of truth afectado: `tablas nuevas bajo greenhouse_core`, con FK a `organizations`
- Consumidores afectados: `UI del portal, lane ecosystem, MCP, Nexa`
- Runtime target: `local + staging + production`

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`, `src/lib/growth/seo/contracts.ts` (vocabulario de procedencia)
- Contrato nuevo o modificado: `readers` y `commands` de `src/lib/client-memory/`, su lane ecosystem y sus tools MCP
- Backward compatibility: `compatible`
- Full API parity: `un primitive server-side por capacidad; UI, Nexa y MCP lo consumen, ninguno reimplementa la regla`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.client_memory_sections`, `client_memory_competitor_notes`, `client_memory_key_pages`, `client_research_log`
- Invariantes que no se pueden romper:
  - `client_research_log` es append-only: sin `UPDATE`, sin `DELETE`, protegido por trigger.
  - Cada fila declara `written_by` con el vocabulario canónico; sin valor por defecto que oculte al autor.
  - Las notas de competidor referencian la fila canónica de `seo_competitors`; esta task no la crea ni la muta.
  - Un rol de página es declarado por una persona o propuesto por un agente, y el registro distingue ambos casos.
- Write-target allowlist: `N/A — el dominio no tiene boundary test hoy; la task crea el suyo junto con el store`
- Tenant/space boundary: `organization_id` obligatorio en las cuatro tablas, con FK `ON DELETE RESTRICT`
- Idempotency/concurrency: el registro de investigación usa clave natural `(organization_id, research_kind, subject_hash)` para que un mismo objeto no se registre dos veces en la misma ventana
- Audit/outbox/history: el propio `client_research_log` es el histórico; las secciones de contexto conservan versión previa al reescribirse

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF`
- Backfill plan: `sin backfill — la memoria nace vacía y se puebla por uso`
- Rollback path: `flag a false + revert PR; las tablas quedan vacías y sin consumers`
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: `capability nueva del catálogo, con grant a rol real en el mismo PR`
- Sensitive data posture: `contexto comercial de cliente — no es PII regulada, pero no se expone al portal cliente`
- Error contract: `canonicalErrorResponse con códigos del enum; nunca prosa en inglés`
- Abuse/rate-limit posture: `sin rate limit propio — las escrituras son de baja frecuencia y pasan por capability`

### Runtime evidence

- Local checks: `pnpm local:check` + tests del paquete
- DB/runtime checks: sanity contra Postgres real vía proxy, verificando que el trigger append-only rechaza `UPDATE` y `DELETE`
- Integration checks: `N/A`
- Reliability signals/logs: sin señal propia en esta task; queda como follow-up si el registro de investigación se vuelve load-bearing del gasto
- Production verification sequence: aplicar migración en staging, verificar objetos con readback, prender el flag, escribir una fila por cada procedencia y confirmar que el reader las distingue

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema y contratos

- Migración aditiva con las cuatro tablas bajo `greenhouse_core`, marker `-- Up Migration` al inicio
  y bloque `DO` con `RAISE EXCEPTION` que aborta si los objetos no quedaron creados.
- Trigger append-only sobre `client_research_log` que rechaza `UPDATE` y `DELETE`.
- `contracts.ts` con los tipos y el vocabulario de procedencia reusado.
- `pnpm db:generate-types` y commit de los tipos en el mismo PR.

### Slice 2 — Commands y capability

- `commands.ts` con las escrituras gobernadas: registrar sección de contexto, anotar competidor,
  declarar rol de página, registrar investigación.
- Capability nueva en el catálogo TS y en `capabilities_registry`, con grant a un rol real en el
  mismo PR, para que el guard de cobertura no rompa el build.
- Cada escritura persiste su procedencia; ninguna la infiere.

### Slice 3 — Readers y regla anti-recompra

- `readers.ts` con la lectura de la memoria por organización.
- `research-log.ts` con la consulta canónica: dada una consulta y una ventana en días, responde si ya
  se compró y con qué resultado.
- Test que ejercita la ventana en ambos bordes.

### Slice 4 — Lane ecosystem y tools MCP

- Rutas bajo `api/platform/ecosystem/client-memory/**` siguiendo el patrón vigente del lane.
- Tools MCP registradas en el mismo PR, con `annotations` declarando su blast radius y descripción
  que obliga a consultar el registro antes de comprar investigación.
- Entrada correspondiente en el manifiesto de paridad del gateway, o exclusión declarada con razón.

## Out of Scope

- **Cualquier superficie visible.** La cara de esta memoria es una task `ui-ux` posterior, con su
  wireframe y su plan de GVC. Mezclarla acá rompería el perfil de ejecución.
- **Propiedad de `seo_competitors`.** Es de `TASK-1699`. Acá sólo cuelgan notas.
- **Acciones gobernadas de Nexa sobre la memoria.** El primitive nace apto para el loop
  `propose → confirm → execute`, pero registrar las acciones en el registry de Nexa es otra task.
- **Backfill de contexto histórico** desde hilos de Teams, Notion o el grader.
- **Cualquier cambio al ledger de gasto.** El registro de investigación es complementario, no lo
  reemplaza ni lo modifica.

## Detailed Spec

La forma de las cuatro tablas, en prosa; el SQL exacto lo produce Discovery.

**`client_memory_sections`** — contexto de negocio en prosa tipada por sección (modelo de negocio,
objetivo declarado, posicionamiento, preferencias de tono). Clave por `(organization_id, section_kind)`.
Al reescribirse conserva la versión previa, para que se pueda ver qué dijo el cliente en kickoff y qué
dice hoy.

**`client_memory_competitor_notes`** — nota libre sobre un competidor ya declarado, con FK a la fila
canónica de `seo_competitors`. Responde «por qué este competidor importa», que es justamente lo que
un dominio no dice.

**`client_memory_key_pages`** — URL con su rol declarado (`hub`, `spoke`, `money`) y quién lo declaró.
El rol es una decisión comercial, no una inferencia: por eso se persiste en vez de derivarse.

**`client_research_log`** — qué investigación se compró, cuándo, contra qué sujeto, con qué costo y
qué concluyó. Es el corazón de la regla anti-recompra y el motivo por el que esta task existe.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema) → Slice 2 (writes) → Slice 3 (reads) → Slice 4 (lane + MCP).
- Slice 4 NUNCA antes que Slice 2: exponer un contrato programático sobre un command que todavía no
  existe publica una superficie que miente.
- La capability de Slice 2 y su grant van en el MISMO PR. Sembrarla sin grant rompe el guard de
  cobertura y deja una capability inalcanzable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La migración choca con el modelo de competidor que `TASK-1699` está por declarar | migration | medium | Coordinar el orden: si 1699 aterriza primero, esta task cuelga de su forma ya declarada en vez de proponer una propia | sin señal — emerge en el conflicto de migración |
| La memoria se llena de contexto derivado por modelo y deja de ser fuente autorada | data quality | medium | La procedencia es obligatoria por fila y el reader la expone; una sección escrita por agente jamás se presenta como declarada por el cliente | sin señal — emerge en revisión |
| La regla anti-recompra devuelve un falso positivo y bloquea una compra legítima | integration | low | La regla informa, no bloquea: el consumer decide. La ventana es un parámetro, no una constante | sin señal — el consumer registra su decisión |
| El registro de investigación crece sin límite | db | low | Poda declarada por ventana, como follow-up; en esta task el volumen es de decenas de filas por org y mes | sin señal |

### Feature flags / cutover

- Env var `CLIENT_MEMORY_ENABLED` (default `false`). Con el flag apagado, los readers responden vacío
  y los commands rechazan con código canónico. Revert: flag a `false` y redeploy.
- ⚠️ **Multi-runtime.** Antes de prender, mapear dónde se lee (`grep -rn "CLIENT_MEMORY_ENABLED" src/ services/`)
  y aplicarlo en cada runtime que lo consuma. Si algún consumer async lo lee, vive en el `ops-worker`
  y su declaración va en `services/ops-worker/deploy.sh`, no sólo en Vercel.
- Registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR, con el runtime
  declarado. El gate de cierre falla si el flag no está en el ledger.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Migración inversa; las tablas nacen vacías y sin consumers | <10 min | si |
| Slice 2 | Flag a `false`; los commands rechazan y no persisten | <5 min | si |
| Slice 3 | Revert PR; los readers no tienen consumers productivos aún | <5 min | si |
| Slice 4 | Retirar las tools del registro y del manifiesto de paridad; revert PR | <10 min | si |

### Production verification sequence

1. `pnpm migrate:up` en staging y readback de las cuatro tablas contra `information_schema`.
2. Verificar que el trigger append-only rechaza `UPDATE` y `DELETE` sobre el registro de investigación.
3. Deploy con el flag apagado y confirmar que los readers responden vacío sin romper ninguna pantalla.
4. Prender el flag en staging y escribir una fila por cada procedencia; confirmar que el reader las
   distingue y que la regla anti-recompra responde en ambos bordes de la ventana.
5. Repetir en producción, declarando el runtime en la fila del ledger de flags.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las cuatro tablas existen bajo `greenhouse_core` con `organization_id` y FK a `organizations`.
- [ ] El registro de investigación rechaza `UPDATE` y `DELETE` por trigger, verificado contra Postgres real.
- [ ] Cada fila persiste su procedencia con el vocabulario canónico ya vigente; ninguna la infiere ni la deja nula.
- [ ] Ninguna escritura ocurre fuera de un command de `src/lib/client-memory/commands.ts`.
- [ ] La capability nueva está en el catálogo TS, en `capabilities_registry` y con grant a un rol real, todo en el mismo PR.
- [ ] La regla anti-recompra responde si una consulta ya se compró dentro de una ventana dada, con test en ambos bordes.
- [ ] Existe lane ecosystem y tools MCP para leer y escribir la memoria, con `annotations` declarando su blast radius.
- [ ] Las tools quedan en el manifiesto de paridad del gateway, o declaradas como exclusión con razón escrita.
- [ ] Esta task no crea, altera ni escribe `greenhouse_growth.seo_competitors`.
- [ ] El flag está registrado en el ledger con su runtime declarado.

## Verification

- `pnpm local:check`
- `pnpm test`
- Sanity contra Postgres real vía proxy, verificando el trigger append-only y la clave natural del registro.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1699` y `TASK-1662` quedaron revisadas por el acople de notas de competidor

## Follow-ups

- Task `ui-ux` que dibuje la memoria del cliente como superficie del operador.
- Cablear la regla anti-recompra dentro del chokepoint de gasto de Growth SEO, para que el ahorro sea
  mecánico y no dependa de que el agente recuerde consultarla.
- Acciones gobernadas de Nexa sobre la memoria, en el registry de acciones.
- Poda por ventana del registro de investigación, si el volumen lo justifica.
- Evaluar si el contexto de negocio derivado por el grader debe proponerse como sección con
  procedencia de agente, en vez de vivir aparte.

## Open Questions

- ¿La memoria es visible para el portal cliente, o es estrictamente interna? Esta task asume interna
  y no expone ninguna ruta al lane de cliente.
- ¿El rol de página se declara por URL exacta o por patrón? Discovery decide con un caso real.
