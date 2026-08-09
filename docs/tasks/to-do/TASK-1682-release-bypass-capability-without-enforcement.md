# TASK-1682 — Que la capability del bypass de release sea un gate y no una nota al pie

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

`platform.release.bypass_preflight` y `platform.release.preflight.override_batch_policy` existen en
el catálogo de entitlements, se citan como requisito en cinco archivos del control plane y en el
propio YAML del orquestador — y **no tienen grant en `runtime.ts` ni un solo `can()` que las
verifique**. Lo único que valida el workflow es que la razón tenga ≥20 caracteres. Esta task las
convierte en gate real o las retira del catálogo.

## Why This Task Exists

Detectado el 2026-08-09 durante el release `2c87d71e2eca`, al necesitar el bypass del batch policy.
La documentación es consistente y enfática —`CLAUDE.md`, la skill de release, el runbook y el
comentario del workflow dicen "requires capability + reason ≥20 chars + audit row"— así que el
operador razonablemente cree que hay un control. El control no existe: cualquiera que pueda
dispatchar el workflow puede escribir 20 caracteres.

Lo que hace esto interesante y no un simple TODO: el guard `capability-grant-coverage.test.ts`
**no falla**, y hace bien en no fallar. Ese guard parsea llamadas `can(subject, '<cap>', ...)` y
rompe el build cuando una capability verificada no tiene grant. Acá no hay `can()`, así que la
capability es invisible para el guard. Es decir: la red que `CLAUDE.md` describe como
*"capability ⇒ grant coverage"* tiene un agujero exacto — **una capability que nadie verifica no
está cubierta por nada**, y se ve idéntica a una capability sana.

Es la clase de deuda que se descubre sólo cuando alguien va a usar el control y mira si existe.

## Goal

- O el bypass verifica la capability de verdad, o la capability sale del catálogo. No queda un
  tercer estado donde la doc promete un control que no corre.
- Una capability que existe en el catálogo y **nadie** verifica queda detectada por un guard, igual
  que hoy queda detectada una que se verifica sin grant.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` (§`Capability grant coverage + ROLE_CODES`)

Reglas obligatorias:

- **NUNCA** grantear una capability de release a un rol amplio para "hacerla funcionar": el bypass
  de un gate de producción es `efeonce_admin` o no es.
- **NUNCA** dejar la capability en el catálogo si se decide que el control no va: una capability sin
  verificador es peor que ninguna, porque la doc la cita como si protegiera algo.
- **SIEMPRE** que se agregue el `can()`, agregar el grant en `runtime.ts` **en el mismo PR** — es la
  regla cross-cutting de `CLAUDE.md`, y el guard existente la hace mecánica desde ese momento.

## Normative Docs

- `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` — la fila del release `2c87d71e2eca` registra el hallazgo con su evidencia
- `src/lib/entitlements/capability-grant-coverage.test.ts` — el guard vigente y su alcance exacto

## Dependencies & Impact

### Depende de

- `src/config/entitlements-catalog.ts` — ambas capabilities existen (líneas ~1480 y ~1558)
- `src/lib/entitlements/runtime.ts` — existe; ninguna de las dos aparece
- `.github/workflows/production-release.yml` — valida sólo el largo de `bypass_preflight_reason`

### Impacta a

- Todo release que necesite bypass del batch policy — o sea, por diseño del classifier, **todo
  release que toque `migrations/`, `src/lib/release/**` o `.github/workflows/`**
- `TASK-1681` — trabaja sobre el mismo classifier; coordinar para no chocar en `batch-policy/`

### Files owned

- `src/lib/entitlements/runtime.ts`
- `src/lib/entitlements/capability-grant-coverage.test.ts` (o el guard nuevo que se agregue)
- `src/config/entitlements-catalog.ts` (sólo si se decide retirar)
- `.github/workflows/production-release.yml` (sólo si el `can()` se verifica en el workflow)

## Current Repo State

### Already exists

- Las dos capabilities en `entitlements-catalog.ts`, con sus `actions`
- El guard `capability-grant-coverage.test.ts`, que cubre el caso inverso (verificada sin grant)
- La validación de largo ≥20 en el step de preflight del workflow

### Gap

- Cero `can()` sobre ambas capabilities: las 6 ocurrencias en `src/lib/release/**` son comentarios
  y strings de mensaje, no verificaciones.
- Cero grant en `runtime.ts`.
- El guard de coverage no las ve, y no es un bug del guard: su contrato es "verificada ⇒ grantee".
  Falta el contrato simétrico "en el catálogo ⇒ alguien la verifica".
- El workflow no tiene forma de conocer la identidad del operador que dispatcha más allá de
  `github.actor`, así que verificar la capability ahí requiere decidir el mapeo actor→sujeto
  \[verificar si existe algún puente actor GitHub → usuario Greenhouse].

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/entitlements/**` + `.github/workflows/production-release.yml`
- Future candidate home: `remain-shared`
- Boundary: la autorización sigue resolviéndose por el runtime canónico de entitlements; esta task
  no crea un carril de permisos propio del release
- Server/browser split: server-only puro
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`
- Consumidores afectados: el step de preflight del orquestador de release
- Runtime target: `local` + `staging` + `production` (GitHub Actions)

### Contract surface

- Contrato existente a respetar: el input `bypass_preflight_reason` del workflow — su forma no cambia
- Contrato nuevo o modificado: la verificación de autoridad detrás de ese input
- Backward compatibility: `gated` — si el `can()` se cablea, un dispatch que hoy pasa podría empezar
  a fallar. Ése es el objetivo, y es lo que obliga a verificarlo en staging antes.
- Full API parity: la autorización se resuelve con el runtime canónico, no con una condición local
  del workflow

### Data model and invariants

- Entidades afectadas: `greenhouse_core.capabilities_registry` (SELECT), governance de entitlements
- Invariantes que no se pueden romper:
  - una capability en el catálogo tiene alguien que la verifica, o no está en el catálogo
  - una capability verificada tiene grant a ≥1 rol real de `role-codes.ts`
  - el bypass de un gate de producción no se grantea a un rol amplio
- Tenant/space boundary: `n/a` — capability interna de plataforma
- Idempotency/concurrency: `n/a` — read path de autorización
- Audit/outbox/history: el audit row del bypass ya existe en el manifest; esta task no lo cambia

### Migration, backfill and rollout

- Migration posture: `seed` si la capability se grantea (fila en governance), `none` si se retira
- Default state: `enabled with rationale` — un flag acá repetiría el problema: un control que hay
  que acordarse de prender no es un control
- Backfill plan: `n/a`
- Rollback path: `revert PR + redeploy`
- External coordination: ninguna

### Security and access

- Auth/access gate: es el propio gate
- Sensitive data posture: `no sensitive data` — la razón del bypass es prosa operativa, ya visible
  en el manifest
- Error contract: si la verificación falla, el step falla con mensaje accionable (qué capability
  falta), **sin** filtrar el subject resuelto
- Abuse/rate-limit posture: `none with rationale` — superficie de CI autenticada

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/entitlements`, `pnpm local:check`
- DB/runtime checks: si se seedea el grant, verificar contra PG que la fila existe y que
  `capabilities_registry` no la tiene `deprecated_at`
- Integration checks: un dispatch de prueba del orquestador en staging con y sin la capability
- Reliability signals/logs: `n/a` (sin path async)
- Production verification sequence: ver §Rollout

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decidir, con el costo de cada opción a la vista

Producir la decisión escrita entre tres caminos, porque no es obvia:

- **(a) Cablear el `can()` en el step de preflight.** Requiere resolver actor GitHub → sujeto
  Greenhouse, que hoy no existe \[verificar]. Es el único camino que hace el control real.
- **(b) Retirar ambas capabilities del catálogo** y dejar el bypass como lo que es: un input
  auditado por el manifest, con autoridad humana fuera de banda. Honesto y barato; pierde la
  posibilidad de granularizar después.
- **(c) Mantener la capability y agregarle grant** sin `can()`. **Descartar salvo argumento
  fuerte:** deja la doc igual de mentirosa y agrega la ilusión de gobernanza.

La decisión queda en la task antes del Slice 2.

### Slice 2 — Implementar la decisión

- Si (a): `can()` + grant a `efeonce_admin` en `runtime.ts` + mensaje de error accionable.
- Si (b): retirar del catálogo, y corregir las cinco citas en prosa del control plane +
  `CLAUDE.md` + ambas skills de release, que hoy prometen un control inexistente.

### Slice 3 — El guard simétrico

- Test que falle si una capability del catálogo **no tiene ningún verificador**: ni un `can()` ni
  una exención declarada con razón. Es el complemento del guard vigente, que cubre el caso inverso.
- Correrlo sobre el catálogo completo y clasificar lo que aparezca: es probable que estas dos no
  sean las únicas.

## Out of Scope

- Rediseñar el batch policy o su severidad — es `TASK-1681`.
- Cambiar la forma del input `bypass_preflight_reason` o el flujo del orquestador.
- Auditar las ~400 capabilities del catálogo una por una: el Slice 3 produce la lista, actuar sobre
  ella es trabajo derivado.

## Detailed Spec

**Por qué el guard vigente no es el que falta.** `capability-grant-coverage.test.ts` implementa el
contrato *"si se verifica, se grantea"*. Es correcto y sigue siendo necesario. Lo que no existe es
el contrato inverso, *"si está en el catálogo, alguien la verifica"*, y sin él una capability puede
vivir años siendo citada como control sin serlo. Los dos guards juntos cierran el ciclo: el catálogo
no tiene entradas muertas y lo verificado siempre está granteado.

**Por qué la opción (b) es legítima y no una rendición.** Un bypass de gate de producción con audit
row en un manifest append-only y razón forense obligatoria **ya tiene** trazabilidad. Lo que no
tiene es autorización previa. Si el equipo decide que la trazabilidad alcanza —porque el universo de
gente que puede dispatchar el workflow ya está restringido por los permisos de GitHub— entonces la
capability no aporta y sacarla es más honesto que fingirla.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 **antes** que Slice 2: implementar sin decidir produce la opción (c) por omisión.
- Slice 3 es independiente y puede ir primero si conviene tener la lista antes de decidir.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Cablear el `can()` bloquea un release legítimo en medio de un incidente | Release control plane | Media | Verificar en staging con y sin capability antes de promover; mensaje de error que diga exactamente qué falta | Dispatch de prueba en staging |
| El mapeo actor GitHub → sujeto Greenhouse no existe y se improvisa | Identity | Media | El Slice 1 lo declara como precondición de la opción (a); si no existe, (a) crece de alcance y hay que reconsiderar | Discovery del Slice 1 |
| Retirar la capability y olvidar las citas en prosa | Documentación | Alta | El Slice 2 lista los archivos exactos a corregir | `grep` de la capability post-cambio |
| El guard nuevo del Slice 3 sale rojo con decenas de capabilities | Governance | Media | Nace en modo reporte; su promoción a bloqueante es trabajo derivado con la lista a la vista | Salida del propio guard |

### Feature flags / cutover

Sin flag. Un control de autorización detrás de un flag default-OFF es un control apagado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Nada que revertir: produce una decisión escrita | — | sí |
| 2 | revert PR + redeploy | <5 min | sí |
| 3 | revert PR (el guard deja de correr) | <5 min | sí |

### Production verification sequence

1. Si (a): dispatch del orquestador en staging con un actor **sin** la capability → el step falla con
   mensaje accionable.
2. Dispatch con la capability → pasa.
3. Confirmar que el audit row del manifest sigue registrando la razón igual que antes.

### Out-of-band coordination required

Ninguna, salvo que la opción (a) requiera decidir el puente de identidad actor→sujeto, que es
decisión de arquitectura de identity.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe decisión escrita entre (a), (b) y (c), con su rationale.
- [ ] Ninguna de las dos capabilities queda en el estado actual: o se verifica, o sale del catálogo.
- [ ] Si se verifica: tiene grant a un rol real de `src/config/role-codes.ts`, en el mismo PR.
- [ ] Si se retira: las cinco citas en prosa del control plane, `CLAUDE.md` y ambas skills de release
      dejaron de prometer un control inexistente.
- [ ] Existe un guard que falla si una capability del catálogo no tiene ningún verificador.
- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/entitlements`
- `pnpm test`
- Dispatch de prueba en staging si se elige (a)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-1681`)
- [ ] `CLAUDE.md` y ambas skills de release corregidas si la capability se retira

## Follow-ups

- La lista que produzca el guard del Slice 3: capabilities del catálogo sin verificador. Es probable
  que estas dos no sean las únicas, y cada una es una promesa de control sin cumplir.

## Open Questions

1. ¿Existe hoy algún puente actor GitHub → sujeto Greenhouse que el workflow pueda usar para resolver
   un subject de entitlements? Si no existe, la opción (a) crece de alcance bastante y conviene
   reconsiderar (b). \[verificar en Discovery]
2. ¿El universo de gente que puede dispatchar `production-release.yml` ya está suficientemente
   restringido por los permisos de GitHub? Si la respuesta es sí, (b) es la opción correcta y la
   capability nunca aportó.
