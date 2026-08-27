# TASK-1780 — El servidor MCP interno declara sus escrituras

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El servidor MCP interno se anuncia como `greenhouse-read-only` con instructions que dicen
textualmente que no debe usarse para escrituras, y registra cuatro tools que sí escriben — una de
ellas comprometiendo gasto recurrente con DataForSEO. Un cliente MCP lee esas instructions como
contrato. Esta task las hace verdaderas.

## Why This Task Exists

`src/mcp/greenhouse/server.ts:16-22` declara `name: 'greenhouse-read-only'` y en `instructions`
afirma *«Greenhouse MCP V1 is read-only … must not be used for writes»*. En el mismo archivo,
`registerTool` corre 29 veces y **cuatro de esas descripciones empiezan con `THIS WRITES`**:
`track_seo_keywords`, `untrack_seo_keywords`, `discover_seo_keywords` y
`prepare_seo_grounded_queries`.

La distancia entre las dos afirmaciones no es cosmética. Un agente que lea las instructions concluye
que ahí nada muta y nada cuesta, y `discover_seo_keywords` **compromete presupuesto del proveedor**.
El helper interno refuerza la confusión: los writes se envuelven en una función llamada
`callReadTool`.

**Y el alcance de hoy es lo que la vuelve barata, no lo que la vuelve opcional.** La superficie HTTP
remota de este servidor está apagada — `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` no existe en Vercel ni
en Production ni en staging, así que `/api/mcp/greenhouse` devuelve 404 — y el gateway público
(`mcp.efeonce.org`) se declara honestamente como `efeonce-mcp`, sin heredar la afirmación falsa. El
consumidor vivo es el stdio local que corren los agentes desde el repo. Es una mina para el día que
alguien encienda la superficie remota, y mientras tanto un contrato falso hacia nuestros propios
agentes.

**El manual también se contradice a sí mismo**, y arreglarlo es parte del trabajo:
`docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md:205` ya dice *«16 tools SEO: 12 de lectura
y 4 de escritura»*, pero `:290` sigue diciendo *«salvo las **dos** excepciones gobernadas del §8»*.
Y el nombre del archivo reintroduce la mentira aunque el cuerpo se corrija.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.2.

## Goal

- El `name` y las `instructions` del servidor describen lo que el servidor realmente hace, incluidas
  sus cuatro escrituras y el hecho de que una de ellas gasta dinero.
- El helper interno deja de llamarse como si todo fuera lectura.
- El manual y su nombre de archivo dejan de afirmar read-only.
- Un test impide que la afirmación y el registro vuelvan a divergir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Las `instructions` de un servidor MCP son **contrato hacia el cliente**, no comentario interno: se
  tratan con el mismo rigor que la descripción de una tool.
- NUNCA describir como lectura una operación que compromete gasto del proveedor. El costo es efecto
  secundario aunque no mute estado propio.
- Esta task **no cambia el comportamiento de ninguna tool** ni toca el gateway público, que ya se
  declara honestamente.

## Normative Docs

- `docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md` — el manual a corregir y renombrar
- `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.2 y §3.4

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/server.ts` — el archivo a corregir (existe)
- `src/mcp/greenhouse/tools.ts` — el helper `callReadTool` (existe)

### Blocks / Impacts

- ⚠️ **`TASK-1694` posee `src/mcp/greenhouse/server.ts`.** Coordinar el orden: si 1694 está en vuelo,
  esta task espera o se integra como su primer commit. Modifican también `TASK-1699`, `TASK-1775`,
  `TASK-1776`, `TASK-1777`, `TASK-1779` y `TASK-1655`, todas de forma aditiva registrando tools.
- Cualquier agente local que hoy lee las instructions y concluye que ahí nada gasta.

### Files owned

- `src/mcp/greenhouse/server.ts` (modifica sin poseer — dueña `TASK-1694`)
- `src/mcp/greenhouse/tools.ts` (modifica sin poseer)
- `src/mcp/greenhouse/__tests__/server-contract.test.ts` (nuevo)
- `docs/manual-de-uso/plataforma/mcp-greenhouse-write-aware.md` (renombrado desde `mcp-greenhouse-read-only.md`)

## Current Repo State

### Already exists

- `src/mcp/greenhouse/server.ts` — 29 `registerTool`, 16 de ellas SEO, 4 con descripción que empieza
  con `THIS WRITES`.
- `src/mcp/greenhouse/remote.ts` — la superficie HTTP, hoy en 404 por token ausente.
- El gateway público `efeonce-mcp` — ya se declara honestamente, sin la afirmación falsa.
- `docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md` — parcialmente corregido (`:205`), con
  una contradicción viva en `:290`.

### Gap

- `name` e `instructions` afirman read-only sobre un servidor que escribe.
- `callReadTool` envuelve los writes con nombre de lectura.
- Nada impide que la divergencia se reintroduzca: no hay test que compare la afirmación contra el
  registro real.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/mcp/greenhouse/` dentro del portal Next.js
- Future candidate home: `remain-shared`
- Boundary: el adapter MCP delega en el lane ecosystem; esta task no agrega lógica de dominio
- Server/browser split: `n/a` — el servidor MCP es server-only por construcción
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `api`
- Source of truth afectado: `las instructions y el name del servidor MCP interno`
- Consumidores afectados: `agentes locales por stdio; la superficie HTTP el día que se encienda`
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `src/mcp/greenhouse/server.ts` (metadata del servidor), `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- Contrato nuevo o modificado: `name` e `instructions` del servidor; ninguna tool cambia de forma
- Backward compatibility: `compatible` — es metadata declarativa; ningún cliente rompe
- Full API parity: `N/A — no introduce ni modifica capability`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna`
- Invariantes que no se pueden romper:
  - Ninguna tool cambia de nombre, de schema ni de comportamiento en esta task.
  - El gateway público no se toca: ya es honesto y su contrato es de otra task.
- Write-target allowlist: `N/A — sin escrituras a base de datos`
- Tenant/space boundary: `sin cambios`
- Idempotency/concurrency: `N/A`
- Audit/outbox/history: `N/A`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — corregir una afirmación falsa no necesita flag
- Backfill plan: `N/A`
- Rollback path: `revert PR`
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: `sin cambios`
- Sensitive data posture: `no sensitive data`
- Error contract: `sin cambios`
- Abuse/rate-limit posture: `sin cambios`

### Runtime evidence

- Local checks: `pnpm local:check` + el test de contrato nuevo
- DB/runtime checks: `N/A`
- Integration checks: levantar `pnpm mcp:greenhouse` y confirmar que un cliente MCP recibe las instructions corregidas
- Reliability signals/logs: `ninguna`
- Production verification sequence: `N/A — la superficie remota está en 404 y esta task no la enciende`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El servidor dice la verdad

- `name` deja de ser `greenhouse-read-only`.
- `instructions` describen: mayoría de lectura, **cuatro escrituras nombradas**, y que una de ellas
  compromete presupuesto del proveedor. Se conservan las afirmaciones que sí son ciertas: que es
  downstream del lane ecosystem, que usa un scope externo fijo, que preserva los request id y que no
  infiere tenancy desde texto libre.
- `callReadTool` se renombra por algo que describa lo que hace: delegar en el lane.

### Slice 2 — Un test que impide la reincidencia

- Test que extrae del propio `server.ts` las tools cuya descripción declara escritura y falla si las
  `instructions` afirman read-only o no las nombran.
- El test **lee el registro real**, no una lista espejo: una lista paralela reintroduce el mismo modo
  de falla que esta task cierra.

### Slice 3 — El manual y su nombre

- Corregir `:290`, que sigue diciendo dos excepciones cuando `:205` ya dice cuatro.
- Renombrar el archivo a uno que no afirme read-only, y actualizar los enlaces entrantes.

## Out of Scope

- **Cambiar cualquier tool**: nombre, schema, comportamiento o federación. Esta task sólo corrige lo
  que el servidor dice de sí mismo.
- **El gateway público `efeonce-mcp`**, que ya se declara honestamente. Sus annotations faltantes son
  de `TASK-1658`.
- **Encender la superficie HTTP remota.** Sigue en 404 y esta task no la toca.
- **Anotaciones `readOnlyHint` en el servidor interno.** Es trabajo adyacente pero distinto: esta
  task corrige la afirmación global, no el blast radius por tool.

## Detailed Spec

La forma de las instructions corregidas, en prosa: declarar que el servidor es mayoritariamente de
lectura y downstream del lane ecosystem; nombrar las cuatro tools que escriben; advertir
explícitamente que `discover_seo_keywords` compromete presupuesto del proveedor y que
`track_seo_keywords` compromete gasto **recurrente** hasta que alguien lo revierta; y conservar las
tres afirmaciones vigentes sobre scope fijo, request id y tenancy.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2. El test se escribe **después** de corregir la afirmación, o nace rojo sobre un
  estado que la task todavía no arregló.
- Slice 3 es independiente y puede ir en cualquier orden.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Conflicto de merge con `TASK-1694`, que posee el archivo | N/A | medium | Coordinar el orden antes de tomarla; el diff de esta task es de metadata y se rebasa fácil | sin señal — emerge en el merge |
| Un cliente MCP cachea las instructions viejas | N/A | low | Es metadata declarativa; el cliente la relee al reconectar | sin señal |

### Feature flags / cutover

Sin flag — additive, immediate cutover. Corregir una afirmación falsa sobre el propio servidor no
necesita rollout gradual: el estado previo es el defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | si |
| Slice 2 | revert PR | <5 min | si |
| Slice 3 | revert PR + restaurar el nombre anterior del manual | <5 min | si |

### Production verification sequence

N/A — la superficie remota está en 404 y esta task no la enciende. La verificación es local:
levantar el servidor por stdio y leer las instructions que recibe el cliente.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El `name` del servidor ya no afirma read-only.
- [ ] Las `instructions` nombran las cuatro tools que escriben y declaran que una compromete presupuesto del proveedor.
- [ ] Las instructions conservan las afirmaciones que sí son ciertas: downstream del lane, scope externo fijo, request id preservados, sin inferencia de tenancy desde texto libre.
- [ ] `callReadTool` ya no describe como lectura la delegación de una escritura.
- [ ] Existe un test que deriva del registro real las tools que escriben y falla si las instructions no las declaran.
- [ ] El test no depende de una lista espejo mantenida a mano.
- [ ] El manual ya no se contradice entre sus líneas 205 y 290, y su nombre de archivo no afirma read-only.
- [ ] Ninguna tool cambió de nombre, schema ni comportamiento.

## Verification

- `pnpm local:check`
- `pnpm test src/mcp/greenhouse`
- Levantar `pnpm mcp:greenhouse` y leer las instructions con un cliente MCP real.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] los enlaces entrantes al manual renombrado quedaron actualizados

## Follow-ups

- Anotaciones `readOnlyHint` por tool en el servidor interno, espejo de lo que `TASK-1658` hace en el gateway.
- Decidir si la superficie HTTP remota se enciende o se retira: hoy existe código en 404 permanente.

## Open Questions

- ¿El nombre nuevo del servidor debería alinearse con el del gateway (`efeonce-mcp`) o mantener su
  identidad propia? Discovery decide, pero el nombre no puede seguir afirmando read-only.
