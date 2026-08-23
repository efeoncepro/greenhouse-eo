# TASK-1773 — El pipeline se opera desde el portal y desde ningún otro lado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Diseño — hueco verificado 2026-08-23 contra el repo: el command de decisión existe como ruta interna pero NO en api/platform/app/, y src/lib/nexa/ no menciona hiring ni una vez`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El eje de desenlace del pipeline —seis desenlaces, causa gobernada obligatoria, invariante `closed` ⟺
desenlace— se entregó completo el 2026-08-22/23 por `TASK-1765`, `TASK-1754`, `TASK-1748` y `TASK-1755`,
y **sin su contrato programático gobernado**. Se puede cerrar una postulación desde el portal y desde
ningún otro lado: ni desde el carril `api/platform/app/**`, ni desde MCP, ni desde Nexa.

Es una violación directa del principio de **Full API Parity**, no una omisión menor. Y el agravante es
que **ninguna de las cuatro tasks lo declaró como pendiente**: la pregunta obligatoria del principio
—«¿esta capability tiene contrato gobernado a nivel capability?»— no se hizo en ninguna, ni en la
auditoría que las revisó.

## Why This Task Exists

### El hueco, verificado contra el repo (2026-08-23)

| Superficie | Estado |
|---|---|
| `POST /api/hiring/applications/[id]/decide` | **existe** — la lógica NO está atrapada en un componente |
| `PATCH` de etapa (`/api/hiring/applications/[id]`) | **existe** — misma situación |
| `api/platform/app/hiring/**` (carril gobernado) | **no expone ninguno de los dos** |
| Herramienta MCP para decidir o mover de etapa | **no existe** |
| Nexa | **cero menciones de `hiring` en todo `src/lib/nexa/`** |

La mitad buena es real y hay que decirla: **el command está extraído**, es invocable por HTTP y está
cubierto por tests. Lo que falta no es refactor, es **exposición en el carril correcto**.

### El precedente está en el mismo dominio y funciona

El **Banco de Talento** sí está federado: nueve rutas bajo `src/app/api/platform/app/hiring/` — búsqueda,
detalle, disponibilidad, invitación `propose`/`confirm`, consentimiento `request`/`withdraw`, revisión de
candidaturas y su packet. Y usa exactamente el loop que esta task necesita: **el modelo propone, un humano
confirma, y la mutación ocurre sólo en el endpoint de confirmación**.

O sea que la forma ya está resuelta dentro de Hiring. Falta aplicarla al pipeline.

`TASK-1214` hizo lo mismo para payroll y sirve como segundo precedente de la forma.

### Por qué importa más que la simetría

- **El desenlace es la decisión con más consecuencias del dominio**: arranca el reloj de retención de la
  Ley 21.719, elige el tipo de correo, materializa el handoff y decide si la persona entra al Banco de
  Talento. Que sólo se pueda tomar desde una pantalla concentra en la UI una capacidad que el resto de la
  plataforma no puede auditar, automatizar ni asistir.
- **La causa gobernada existe justamente para ser leída por máquina** (el embudo de equidad ramifica por
  ella), y hoy sólo se puede escribir a mano.
- **Nexa es el consumidor que hace evidente el hueco**: no puede responder «¿cuántas quedaron sin
  selección por falta de cupo este mes?» ni proponer cerrar una cohorte, porque no tiene ni lectura.

## Goal

Que el eje de desenlace del pipeline sea operable desde **cualquier consumer gobernado** —portal, App API,
MCP y Nexa— sobre el mismo command canónico, con el loop `propose → confirmación humana → ejecución` y sin
que ningún modelo escriba directo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`** — el principio que esta task cierra. La UI es un cliente
  de commands, no el source of truth de una capacidad.
- **`GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`** — lanes `app` y `ecosystem`, y qué va en cada uno.
- **`agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`** — el runtime de acción gobernada: el LLM
  nunca escribe; muta sólo el endpoint de confirmación humana.
- **`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`** — los tres ejes y el invariante
  que el contrato debe respetar.
- **`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`** — la capability `hiring.application.decide`
  ya existe y está granteada; el carril nuevo la reusa, no crea una paralela.

## Normative Docs

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`

## Dependencies & Impact

**Depende de:**

- `none` en lo bloqueante. El command canónico (`decideHiringApplication`), la capability, el invariante
  como `CHECK` y la causa gobernada están todos aplicados en producción desde el 2026-08-23.

**Impacta a:**

- `TASK-1766` — la superficie kanban del desenlace. Si esta task define el shape del DTO, 1766 lo consume
  en vez de inventar el suyo. Conviene coordinarlas, no secuenciarlas a ciegas.
- `TASK-1767` — el embudo de equidad lee la causa gobernada; un lector federado le sirve.
- `TASK-1718` — ya expone el packet de revisión en el mismo lane; su patrón de minimización aplica.
- `TASK-1721`/`TASK-1722` — el recorrido de selección y su federación MCP. **No se solapan y hay que decir
  por qué:** 1721 orquesta el camino POSITIVO (seleccionar → decidir → correo → handoff → activación) y su
  confirm llama exclusivamente a `decideHiringApplication`; esta task federa el eje de desenlace COMPLETO,
  los seis valores. Comparten el mismo command, así que el DTO del desenlace debe ser UNO: si 1773 llega
  primero, 1722 lo consume; si llega 1722 primero, esta lo reusa. **NUNCA dos shapes del mismo desenlace.**
- `TASK-1762`/`TASK-1763` — el cierre de cohorte por cupo escribe `not_selected` + `capacity_filled` en lote.
  Es la MISMA causa gobernada que esta task expone para lectura. Cuando 1762 exista, decidir explícitamente
  si el lane federa también el cierre masivo o sólo la decisión individual; no dejarlo implícito.
- `TASK-1720` — federa assessment con el mismo loop `propose`/`confirm` en el mismo lane. Su forma manda:
  esta task copia, no inventa una variante.

### Files owned

- `src/app/api/platform/app/hiring/applications/**` (nuevo)
- `src/lib/hiring/decide.ts` (sólo si hace falta extraer un DTO; **el comportamiento no cambia**)
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (sólo si nace capability nueva)
- La superficie MCP de hiring y su registro

## Current Repo State

**Ya existe:**

- `decideHiringApplication` (`src/lib/hiring/decide.ts`) — command canónico, con causa gobernada,
  idempotencia por `sameReplayPayload` y emisión de evento.
- `POST /api/hiring/applications/[id]/decide` — ruta interna que lo consume.
- Nueve rutas del Banco de Talento en `src/app/api/platform/app/hiring/`, con el loop propose/confirm ya
  implementado — **la plantilla a copiar**.
- Capability `hiring.application.decide`, granteada en `runtime.ts`.
- El invariante como `CHECK` en la base, así que el carril nuevo no puede corromper el estado.

**Gap:**

- Ninguna ruta del pipeline (decisión, cambio de etapa, lectura del desenlace) en el lane `app`.
- Ninguna herramienta MCP para el pipeline.
- Cero superficie Nexa: `grep -rln "hiring" src/lib/nexa/` → sin resultados.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/app/api/platform/app/hiring/` (portal Next.js, server-only)
- Future candidate home: `remain-shared`
- Boundary: el lane `app` es un adaptador; delega en el command canónico de `src/lib/hiring/` y no
  reimplementa reglas de dominio
- Server/browser split: server-only estricto; el navegador nunca consume este lane
- Build impact: `none`
- Extraction blocker: el adaptador depende del command y del catálogo de entitlements; mover uno exige
  mover los tres

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Source of truth: `greenhouse_hiring.hiring_application` vía `decideHiringApplication`. El lane nuevo
  **NUNCA** escribe SQL propio
- Contract surface: rutas `app` para leer el desenlace y para el loop `propose`/`confirm` de la decisión,
  más la herramienta MCP equivalente
- Data invariants: los tres ejes y el `CHECK` `closed` ⟺ desenlace se respetan por construcción, porque la
  escritura pasa por el command
- Tenant/access boundary: capability `hiring.application.decide` para confirmar; lectura con la de lectura.
  **NUNCA** ampliar el grant para que un agente pueda confirmar solo
- Idempotency/concurrency: reusar `sameReplayPayload` del command; una propuesta confirmada dos veces no
  decide dos veces
- Migration/backfill/rollback: `none`. Rollback es revert del código
- Sensitive data/error posture: sin PII en el payload de propuesta; errores por `canonicalErrorResponse`
- Audit/signal posture: el evento `hiring.application.decided` ya existe y no cambia. Señal nueva sólo si
  aparece un modo de fallo propio del lane
- Runtime evidence: ejercitar el loop completo contra staging con la persona agente de menor privilegio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo llena el agente que toma la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — lectura federada.** `GET` del desenlace de una postulación en el lane `app`: los seis
  valores, la causa, `decided_at` y el actor. Sin PII de candidato más allá de lo que el lane ya expone.
- **Slice 2 — el loop de decisión.** `propose` (calcula el efecto, no muta) y `confirm` (ejecuta vía el
  command canónico). Copiar la forma del Banco de Talento, incluida la revalidación entre propuesta y
  confirmación.
- **Slice 3 — herramienta MCP.** Lectura primero. La escritura, si se expone, va por el mismo
  `propose`/`confirm` y **nunca** en un solo paso.
- **Slice 4 — Nexa.** Retrieval del desenlace y la acción gobernada. El LLM propone; el humano confirma en
  la superficie de confirmación, no en el chat.
- **Slice 5 — el guard que impide que vuelva a pasar.** Un test o gate que falle cuando una capability de
  hiring esté `can()`-checked sin superficie en el lane `app`. Es el equivalente del guard de cobertura de
  grants, aplicado a parity.

## Out of Scope

- Cambiar el comportamiento del command de decisión. **No cambia nada** de lo que ya rige.
- El cambio de etapa como acción de agente: leerlo sí, escribirlo es decisión aparte — mover a alguien de
  etapa desde un agente tiene otras implicancias que las de cerrar.
- La superficie visible del desenlace en el kanban (es `TASK-1766`).
- Exponer nada de esto a B2B o a clientes. Este lane es interno.

## Detailed Spec

**La regla que gobierna todo el diseño:** el lane `app` es un **adaptador**, no un dominio. Valida
transporte y autorización, y delega. Si un agente necesita una regla de negocio que el command no tiene,
la regla va al command —donde la comparten todos los consumers— y no al adaptador.

**El loop, y por qué los dos pasos no son burocracia:** entre `propose` y `confirm` el mundo puede cambiar
—otra persona decide, la vacante se cierra, la postulación se archiva—. La confirmación **revalida** y falla
si el efecto ya no es el que se propuso. Es el mismo guard que el Banco de Talento y el que salvó a
`TASK-1755` de reintentar sobre una premisa muerta.

**Lo que NUNCA se hace:** que el modelo llame a `confirm`. La confirmación es de un humano con la
capability, y el registro tiene que poder distinguir quién propuso de quién confirmó.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Lectura antes que escritura (1 antes que 2). MCP y Nexa después del loop (3 y 4 después de 2): federar una
escritura antes de tener su confirmación humana es exactamente lo que el principio prohíbe. El guard (5) va
al final, y **después** de stagear los archivos que persigue.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Un agente confirma solo | pipeline | Baja | La capability de confirmar no se grantea a identidad de agente | audit del command |
| El adaptador reimplementa reglas | dominio | Media | Revisión: el lane no escribe SQL ni valida desenlaces por su cuenta | test de contrato |
| Propuesta confirmada sobre estado viejo | datos | Media | Revalidación en `confirm` + `sameReplayPayload` | evento duplicado |
| PII en el payload de propuesta | privacidad | Media | Minimización explícita, igual que el packet de `TASK-1718` | revisión |

### Feature flags / cutover

Flag por lane si se quiere abrir MCP/Nexa por separado del `app`. La lectura puede ir sin flag; la escritura
federada **sí** debería nacer detrás de uno, apagado, y registrarse en el ledger.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert de la ruta | minutos | sí |
| 2 | revert; el command no cambió | minutos | sí |
| 3 | retirar la herramienta del registro | minutos | sí |
| 4 | apagar el flag de Nexa | minutos | sí |
| 5 | retirar el guard | minutos | sí |

### Production verification sequence

1. Lectura por el lane con la persona agente de menor privilegio → devuelve el desenlace correcto.
2. `propose` sobre una postulación de prueba → no muta nada (verificar en base).
3. `confirm` → decide una sola vez; repetir el `confirm` no decide dos veces.
4. El evento `hiring.application.decided` sale igual que desde el portal.
5. Señales de hiring en su estado esperado.

### Out-of-band coordination required

Coordinar el shape del DTO con `TASK-1766` antes de fijarlo, para que la superficie visible y la
programática lean lo mismo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El desenlace de una postulación se lee desde `api/platform/app/hiring/**` con los seis valores y la causa.
- [ ] Existe el loop `propose`/`confirm` y `propose` **no muta** — verificado leyendo la base después.
- [ ] `confirm` delega en `decideHiringApplication`; el lane no escribe SQL propio (verificable por grep).
- [ ] Confirmar dos veces la misma propuesta decide una sola vez.
- [ ] Hay herramienta MCP de lectura del desenlace, y si hay de escritura pasa por `propose`/`confirm`.
- [ ] Nexa puede responder una pregunta sobre desenlaces citando el contrato, sin queryear la tabla.
- [ ] El guard del Slice 5 falla sobre una capability de hiring sin superficie en el lane.
- [ ] `pnpm task:lint --task TASK-1773` en `errors=0 warnings=0`.

## Verification

- `pnpm local:check`
- `pnpm test src/lib/hiring src/app/api/platform`
- Ejercicio del loop completo contra staging con `pnpm staging:request`
- `pnpm build` con autorización del operador (gate de costo de máquina)

## Closing Protocol

- [ ] `Lifecycle: complete` y archivo movido a `complete/`
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` y `changelog.md` actualizados
- [ ] Delta en el ADR de Full API Parity y en la spec de la API Platform
- [ ] Doc funcional + manual si cambia comportamiento visible
- [ ] Impacto cruzado sobre `TASK-1766`, `TASK-1767` y `TASK-1718`
- [ ] `pnpm docs:closure-check` sin errores

## Follow-ups

- El mismo barrido para el resto del dominio: `TASK-1718` y el Banco de Talento están federados, el
  pipeline no lo estaba. Vale preguntarse qué más de `EPIC-011` entregó capability sin carril.
- Si el guard del Slice 5 resulta generalizable, promoverlo a gate del repo — el hueco no es exclusivo de
  hiring.
