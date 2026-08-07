# TASK-1662 — Growth SEO: keyword gap — qué rankea la competencia y el cliente no

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1661`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La tercera pregunta del módulo, y la única que hoy no tiene ni datos ni contrato: **¿qué búsquedas
gana la competencia donde el cliente es invisible?** Esta task construye la fundación de datos —
competidores, su cobertura de keywords y el cruce contra el set del cliente. La superficie sale
después, cuando exista qué mostrar.

## Why This Task Exists

Search Console es **estructuralmente ciego** a lo que el cliente no rankea. Si no estás en el top
~100 no hay impresiones, así que esa búsqueda sencillamente **no existe** en tus datos. Todas las
superficies del módulo heredan esa ceguera: `/admin/growth/seo/keywords` sólo puede contestar *"de
lo que ya tengo, ¿qué empujo?"*, y la lente de objetivos (`TASK-1660`) sólo mide lo que alguien
declaró a mano.

Nadie puede contestar *"¿qué me estoy perdiendo entero?"*, que es la pregunta con más valor
comercial del módulo: es lo que se le muestra a un prospecto en la primera reunión —*"tu competidor
aparece en estas 40 búsquedas donde tú no existes"*— y lo que alimenta el plan de contenidos.

Revisado el 2026-08-07: de las 12 tasks abiertas de EPIC-022, **ninguna** cubre esto. No es una
decisión postergada, es una ausencia del roadmap.

## Goal

- Existe un modelo de competidores por sitio, declarado y auditable.
- Se puede responder qué keywords gana un competidor donde el cliente no aparece.
- El resultado es priorizable, no una lista cruda de miles de filas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **`enforceSeoRunEntitlement` antes de cualquier llamada al proveedor.** Esta task es la que más
  gasta del módulo: el universo de keywords de un competidor no tiene techo natural.
- Cliente DataForSEO canónico; ningún SDK paralelo.
- Un competidor es un **hecho declarado**, no una inferencia: quién lo declaró y cuándo quedan
  registrados. Un competidor mal elegido invalida todo el análisis río abajo.
- Boundary SEO ↔ AEO intacto: cero JOIN cross-motor.

## Normative Docs

- `docs/tasks/to-do/TASK-1661-growth-seo-keyword-market-data-capability.md` — su dependencia dura
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`

## Dependencies & Impact

### Depends on

- **`TASK-1661`** — sin volumen no hay forma de priorizar lo descubierto, y una lista de 5.000
  keywords sin priorizar es ruido, no producto. Es bloqueo duro
- `TASK-1300` (complete) — familia `labs` en el allowlist
- `TASK-1301` (complete) — entitlement y quota per-org

### Blocks / Impacts

- Superficie de gap (task futura, después de esta)
- `TASK-1314` — pillar-cluster health: el gap alimenta el plan de contenidos
- `TASK-1310` — reporte cliente: el gap es material comercial de primera reunión

### Files owned

- `migrations/[nueva]-task-1662-seo-competitors.sql`
- `src/lib/growth/seo/competitors.ts`
- `src/lib/growth/seo/keyword-gap-reader.ts`

## Current Repo State

### Already exists

- Cliente DataForSEO con familia `labs` y circuit breaker — `TASK-1300`
- `enforceSeoRunEntitlement` como chokepoint de gasto — `TASK-1301`
- `seo_targets` como el sitio del cliente

### Gap

- No hay modelo de competidor: ninguna tabla, ningún command, ningún reader
- No hay cobertura de keywords de terceros
- No hay cruce ni priorización

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/`; el fetch corre en `ops-worker`
- Future candidate home: `domain-package`
- Boundary: `readKeywordGap` es el único consumo; el cliente canónico el único transporte
- Server/browser split: `n/a` — server-side
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` — el gasto no tiene techo natural
- Impacto principal: `integration`
- Source of truth afectado: DataForSEO Labs (externo) + declaración humana de competidores
- Consumidores afectados: `UI` (futura), `MCP`, reporte
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: ninguno se modifica
- Contrato nuevo o modificado: `seo_competitors` + `readKeywordGap` + sus tools MCP
- Backward compatibility: `compatible` — todo aditivo
- Full API parity: declarar competidor es un **command** desde el día uno, con sus 3 lanes.
  ⚠️ Es **escritura**: va sobre `efeonce.mcp.seo.write`, el scope de dominio que **ya existe** —
  y por eso **no toca Entra**. Es exactamente el corolario de un scope por clase de blast-radius

### Data model and invariants

- Entidades/tablas/views afectadas: `seo_competitors` (nueva) + tabla de cobertura
- Invariantes que no se pueden romper:
  - Un competidor es **declarado**, con autor y fecha. Nunca inferido en silencio
  - El gap es **derivado**, no persistido como verdad: se recalcula desde cobertura + set del
    cliente. Persistirlo lo congela y envejece sin avisar
  - "El competidor rankea y el cliente no" ≠ "el cliente rankea peor". Son dos hechos y el contrato
    los separa; colapsarlos produce un gap inflado que nadie puede accionar
  - Techo explícito de competidores por sitio: cada uno multiplica el gasto
- Tenant/space boundary: competidores por `seo_target_id` → `organization_id`
- Idempotency/concurrency: declarar dos veces el mismo competidor es no-op idempotente
- Audit/outbox/history: evento al declarar o retirar un competidor

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: **flag OFF**. Nace apagado: prenderlo empieza a gastar
- Backfill plan: ninguno. Los competidores se declaran hacia adelante
- Rollback path: flag OFF + revert PR
- External coordination: **ninguna en Entra**. Sí en `ops-worker`: el flag va en `deploy.sh` **y**
  en vivo

### Security and access

- Auth/access gate: `growth.seo.target.configure` para declarar competidores; lectura con la
  capability de observación
- Sensitive data posture: dominios públicos; sin PII. ⚠️ El **listado de competidores de un
  cliente es información comercial sensible**: nunca cruza el boundary de org
- Error contract: degradación honesta; un competidor sin datos se dice, no se omite
- Abuse/rate-limit posture: techo de competidores + circuit breaker + quota per-org

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`
- DB/runtime checks: sanity contra PG real — declarar, retirar, recalcular gap
- Integration checks: una corrida acotada a **un** competidor con costo verificado en el ledger
- Reliability signals/logs: frescura de cobertura + gasto por corrida de gap
- Production verification sequence: ver Zone 3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo de competidores

- Tabla `seo_competitors` con autoría, fecha y techo por sitio
- Commands `declareCompetitor` / `retireCompetitor`, append-only, con evento
- Los 3 lanes (app, ecosystem, MCP) en el mismo PR, sobre el scope de escritura ya existente

### Slice 2 — Cobertura de keywords del competidor

- Fetch acotado tras flag OFF, con `enforceSeoRunEntitlement` y dry-run de costo
- Persistencia con fecha de captura, append-only
- **Un competidor a la vez** en V1: el costo se mide antes de escalar

### Slice 3 — Reader de gap

- `readKeywordGap`: keywords del competidor donde el cliente no aparece, priorizadas por volumen
  (de `TASK-1661`) y separadas de "el cliente aparece peor"
- Tool MCP de lectura en el mismo PR
- Señal de frescura de cobertura

## Out of Scope

- **La superficie visible.** Va en task aparte, con su wireframe y su flow, cuando exista qué
  mostrar. Diseñarla antes de ver la forma real de los datos es adivinar
- Descubrir competidores automáticamente. Se declaran; un competidor mal elegido invalida todo el
  análisis y esa decisión es humana
- Análisis de contenido de las páginas del competidor
- Backlinks del competidor

## Detailed Spec

**Por qué el gap se deriva y no se persiste.** El gap es una diferencia entre dos conjuntos que
cambian todos los días: lo que el competidor rankea y lo que el cliente rankea. Persistirlo lo
congela en el momento del cálculo y lo hace envejecer sin ninguna señal — dos semanas después
alguien lee "40 oportunidades" y ya no son 40. Se persisten los **insumos** con su fecha; el gap se
calcula al leer.

**Por qué un competidor a la vez en V1.** El universo de keywords de un competidor mediano son
miles. Con tres competidores el costo se triplica antes de que nadie haya visto si el resultado
sirve. Uno primero da el número real y la forma de los datos.

**La distinción que hace la lista accionable.** "El competidor rankea y yo no existo" es una
oportunidad de contenido nuevo. "El competidor rankea mejor que yo" es una oportunidad de
optimización — y ésa ya la cubre la pantalla de oportunidades. Mezclarlas produce una lista enorme
donde lo verdaderamente nuevo se pierde entre lo que ya sabíamos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (competidores) → Slice 2 (cobertura) → Slice 3 (gap).
- 🔴 El dry-run del Slice 2 corre **antes** de cualquier corrida con gasto, y la primera es sobre
  **un** competidor de **una** org.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El universo de keywords de un competidor dispara el gasto | gasto externo | **high** | flag OFF + entitlement + dry-run + un competidor a la vez + techo por sitio | `seo_provider_spend_daily` fuera de patrón |
| Gap persistido envejece y se reporta como vigente | data quality | **high** | el gap se deriva al leer; se persisten insumos con fecha | conteos que no cambian entre semanas |
| Competidores de un cliente visibles a otra org | seguridad | low | boundary por `organization_id` + test de aislamiento | dominio ajeno en un reader |
| El flag se prende en Vercel y el fetch nunca corre | worker | **high** | el fetch vive en `ops-worker`; flag en `deploy.sh` **y** en vivo | sin gasto en el ledger y sin cobertura |
| Lista cruda sin priorizar se entrega como producto | producto | medium | `TASK-1661` es bloqueo duro: sin volumen no se prioriza | miles de filas sin orden útil |

### Feature flags / cutover

Flag propio, default **OFF**, declarado en `services/ops-worker/deploy.sh` y aplicado en vivo, con
fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR. Encendido por org, empezando
por una.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; los competidores declarados quedan (append-only, sin daño) | < 10 min | sí |
| Slice 2 | flag OFF → deja de gastar de inmediato | < 5 min | sí |
| Slice 3 | revert PR; el gap deja de calcularse, los insumos quedan | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` + verificar tablas.
2. Declarar un competidor real por los 3 lanes; verificar el evento.
3. Dry-run: conteo de keywords y **costo estimado**.
4. Primera corrida sobre **un** competidor de **una** org; verificar `provider_cost` en el ledger.
5. Leer el gap y verificar la separación entre "no existo" y "rankeo peor".
6. Medir el costo por competidor antes de habilitar más.

### Out-of-band coordination required

Ninguna en Entra: la escritura usa el scope de dominio ya existente. Sí en `ops-worker` para el flag.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un competidor es un hecho declarado con autor y fecha; no se infiere
- [ ] Existe techo de competidores por sitio
- [ ] El gap se **deriva al leer**; no se persiste como verdad
- [ ] El reader separa "el cliente no aparece" de "el cliente aparece peor"
- [ ] El resultado viene priorizado por volumen (`TASK-1661`)
- [ ] Ninguna llamada al proveedor ocurre sin `enforceSeoRunEntitlement`
- [ ] El dry-run reporta conteo y costo antes de gastar
- [ ] El flag nace OFF, está en `ops-worker/deploy.sh` y tiene fila en el ledger
- [ ] Los competidores de una org **nunca** son visibles desde otra, con test de aislamiento
- [ ] Commands y reader tienen sus 3 lanes en el mismo PR, sin scope nuevo en Entra

## Verification

- `pnpm vitest run src/lib/growth/seo`
- `pnpm tsx scripts/growth/_sanity-task-1662-keyword-gap.ts` contra PG real
- `pnpm flags:audit --strict --no-vercel`
- `pnpm lint` · `pnpm typecheck` · `pnpm build`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Superficie de keyword gap, con wireframe y flow propios.
- Varios competidores por sitio, con el costo por competidor ya medido.
- Alimentar el plan de contenidos de `TASK-1314` con el gap priorizado.
