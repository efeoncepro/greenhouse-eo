# TASK-1684 — Decidir si las sesiones de agente deben seguir funcionando en producción

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `policy`
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
- Domain: `identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`AGENT_AUTH_ALLOW_PRODUCTION` está seteada en el environment **Production** de Vercel desde hace
~90 días, así que `/api/auth/agent-session` **acuña sesiones válidas en producción** — incluida la de
`agent@greenhouse.efeonce.org`, que tiene `efeonce_admin`. `CLAUDE.md` describe esa variable como
*"`true` para habilitar en prod (**no recomendado**)"*. Esta task decide si el estado vigente es
deliberado o deriva, y lo alinea en cualquiera de las dos direcciones.

## Why This Task Exists

Descubierto el 2026-08-09 al cerrar el release del carril de acceso del portal cliente: **verificando
un supuesto que había repetido toda la sesión sin comprobarlo.** Venía afirmando —tomándolo de una
nota del `Handoff`— que el endpoint devolvía 403 en producción "por diseño", y por eso declaré como
*pendiente del operador* una verificación que en realidad podía hacer yo. Cuando finalmente la corrí,
devolvió `200` y sesión válida.

Es un hallazgo de **postura**, no un bug: el endpoint hace exactamente lo que su código dice. Lo que
falta es la decisión, porque hoy conviven tres cosas que no encajan:

1. la variable está prendida en producción;
2. la doc canónica la marca como no recomendada;
3. la contraseña de las personas agente vive **escrita en `CLAUDE.md`** (`Gh-Agent-2026!`), que es
   público para todo agente que clone el repo.

La combinación de las tres significa que un secreto de bajo valor documentado + el
`AGENT_AUTH_SECRET` alcanzan para operar producción como superadmin. Puede ser una decisión
consciente —hay usos legítimos: smoke productivo, diagnóstico de incidentes, verificación de release
como la que hicimos hoy— pero entonces la doc debe decirlo y el alcance debe acotarse. Lo que no
puede quedar es la ambigüedad.

## Goal

- Existe decisión escrita: la variable se queda prendida (con su rationale y su alcance acotado) o se
  apaga.
- `CLAUDE.md` y el resto de la doc dicen lo mismo que el runtime.
- Si se queda, el riesgo residual está nombrado y el acceso está acotado a lo mínimo que lo justifica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (§Agent Auth)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

Reglas obligatorias:

- **NUNCA** apagar la variable sin verificar antes qué flujos productivos dependen de ella: hay
  verificaciones de release y diagnósticos que la usan hoy, y romperlos a ciegas cambia un riesgo por
  otro.
- **NUNCA** dejar la decisión implícita en un cambio de env var: la doc canónica dice "no recomendado"
  y tiene que quedar coherente con lo que se decida.
- **SIEMPRE** tratar la contraseña documentada de las personas agente como parte del análisis: el
  riesgo no es el endpoint solo, es el endpoint **más** la credencial pública.

## Normative Docs

- `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` — la fila del release `ee0d568b8614` registra el hallazgo con su evidencia
- `src/app/api/auth/agent-session/route.ts` — `isProductionBlocked()`, el guard real

## Dependencies & Impact

### Depende de

- `src/app/api/auth/agent-session/route.ts` — existe; el guard es `VERCEL_ENV === 'production' && !allowProd`
- La env var en el environment Production de Vercel — presente, `Encrypted`, ~90 días

### Impacta a

- Cualquier verificación de release que use sesiones de agente contra producción (se usó el 2026-08-09
  para las 9 rutas del portal cliente × 3 personas)
- `TASK-1679` — su §Rollout asumía que producción no aceptaba agent-session; el supuesto era falso
- El diagnóstico de incidentes que hoy dependa de entrar como persona agente

### Files owned

- `CLAUDE.md` (la fila de la tabla de Agent Auth)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (§Agent Auth)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (la variable no tiene fila hoy — `[verificar]` si corresponde agregarla, porque no es un `*_ENABLED` clásico)

## Current Repo State

### Already exists

- El guard `isProductionBlocked()` con su válvula explícita
- Las 3 personas agente provisionadas por migración, con sus roles
- La fila de `AGENT_AUTH_ALLOW_PRODUCTION` en la tabla de env vars de `CLAUDE.md`, marcada "no recomendado"

### Gap

- El runtime y la doc dicen cosas distintas.
- No hay registro de **quién** prendió la variable ni **por qué** (~90 días atrás).
- La variable no aparece en el ledger de flags, así que no hay un lugar donde su estado por
  environment esté declarado.
- No hay medición de qué usa hoy esa capacidad: sin eso, apagarla es a ciegas.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/app/api/auth/agent-session/route.ts` + env vars de Vercel
- Future candidate home: `remain-shared`
- Boundary: la decisión no crea superficie nueva; ajusta postura de una existente
- Server/browser split: server-only
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

> Es una task `policy`: no cambia código ni schema. La sección se completa igual porque la decisión
> **sí** altera una superficie de autenticación en producción, y el lint del contrato de tasks tiene
> razón en pedirla para el dominio `identity`.

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `none` (postura de configuración; el guard ya está implementado y es correcto)
- Source of truth afectado: la env var `AGENT_AUTH_ALLOW_PRODUCTION` del environment Production de
  Vercel + `isProductionBlocked()` en `src/app/api/auth/agent-session/route.ts`
- Consumidores afectados: quien verifique release o diagnostique producción con sesiones de agente
- Runtime target: `production` únicamente (staging y local no dependen de esta variable: ahí
  `VERCEL_ENV !== 'production'` ya permite el endpoint)

### Contract surface

- Contrato existente a respetar: `POST /api/auth/agent-session` — su forma **no cambia**
- Contrato nuevo o modificado: ninguno; cambia si el endpoint responde o no en producción
- Backward compatibility: `gated` — si se apaga, todo flujo que hoy dependa de sesión de agente
  productiva empieza a recibir 403. Ése es el punto del Slice 1: saber cuáles antes de decidir.
- Full API parity: sin superficie nueva

### Data model and invariants

- Entidades afectadas: ninguna (read path de autenticación; no escribe)
- Invariantes que no se pueden romper:
  - el endpoint **nunca** crea usuarios: sólo autentica emails que ya existen en PG
  - la comparación del secreto sigue siendo timing-safe
  - sin `AGENT_AUTH_SECRET` el endpoint responde 404 (invisible), y eso no se toca
- Tenant/space boundary: la sesión emitida hereda el tenant de la persona; el endpoint no lo elige
- Idempotency/concurrency: `n/a`
- Audit/outbox/history: `n/a` — el rastro de uso vive en logs de Vercel y Sentry, y medirlo es el Slice 1

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — la variable ya está prendida; esta task decide si sigue
- Backfill plan: `n/a`
- Rollback path: volver a setear/quitar la env var + redeploy (<10 min)
- External coordination: sólo si la opción (b) implica rotar `AGENT_AUTH_SECRET`

### Security and access

- Auth/access gate: es el propio gate
- Sensitive data posture: **la sesión emitida da acceso a datos de clientes reales.** Con la persona
  superadmin, a todo el portal interno además.
- Error contract: el 403 actual ya es correcto y no filtra por qué
- Abuse/rate-limit posture: `none` hoy. Si la decisión es dejarla prendida, evaluar si un endpoint que
  acuña sesiones productivas merece rate-limit — queda como pregunta del Slice 2.

### Runtime evidence

- Local checks: `n/a` (no hay código nuevo)
- DB/runtime checks: `POST /api/auth/agent-session` contra producción, con el resultado esperado
  declarado **antes** de correrlo
- Integration checks: recorrer una ruta cliente con la sesión emitida, si la decisión la conserva
- Reliability signals/logs: el conteo de invocaciones productivas de los últimos 90 días (Slice 1)
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

### Slice 1 — Medir qué depende de esto antes de decidir

- Buscar en Sentry / logs de Vercel las invocaciones a `/api/auth/agent-session` contra producción de
  los últimos 90 días: cuántas, desde dónde, con qué persona.
- Si el volumen es cero, la decisión es trivial (apagar). Si no lo es, la lista dice qué se rompería.

### Slice 2 — Decidir, con las tres opciones a la vista

- **(a) Apagar.** La verificación productiva pasa a ser manual con credenciales humanas. Cierra el
  riesgo por completo; encarece cada verificación de release y cada diagnóstico.
- **(b) Dejarla prendida y acotar.** Restringir la persona permitida en producción a la de menor
  privilegio que sirva (`agent-client`/`agent-collaborator`, **no** el superadmin), y rotar
  `AGENT_AUTH_SECRET` fuera de `CLAUDE.md`. Conserva el uso legítimo y baja el techo del daño.
- **(c) Dejarla como está.** Sólo con rationale escrito de por qué el acceso superadmin productivo
  vía credencial documentada es aceptable.

La decisión se escribe en la task antes del Slice 3.

### Slice 3 — Alinear runtime y doc

- Aplicar la decisión en el environment correspondiente.
- Corregir `CLAUDE.md` y `GREENHOUSE_IDENTITY_ACCESS_V2.md` para que digan lo mismo que el runtime.
- Si queda prendida, dejar su estado declarado donde un agente futuro lo lea antes de asumir.

## Out of Scope

- Rediseñar el modelo de personas agente o sus roles.
- Rotar `NEXTAUTH_SECRET` u otros secretos no relacionados.
- La cobertura de smoke productivo en sí: esta task decide la postura, no construye la alternativa.

## Detailed Spec

**Por qué es `policy` y no `implementation`.** El código ya hace lo correcto: la variable existe justo
para permitir esta excepción y el guard la respeta. Lo que falta es la decisión humana sobre si la
excepción sigue vigente y con qué alcance. Implementarla es una env var y dos ediciones de doc.

**Por qué el Slice 1 va primero.** Apagar una capacidad que alguien usa —sin saber quién— cambia un
riesgo de seguridad por un riesgo operativo, y el segundo aparece en el peor momento: cuando hace
falta diagnosticar producción. La medición convierte la decisión en informada.

**La opción (b) merece atención especial** porque separa dos cosas que hoy están pegadas: *poder
entrar a producción* y *entrar como superadmin*. Casi todo uso legítimo —verificar que una página
cliente abre, reproducir un reporte— se hace con la persona de menor privilegio. El superadmin en
producción es el que no tiene justificación fácil.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 **antes** que Slice 2: sin la medición, cualquier decisión es a ciegas.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Apagar rompe una verificación de release que alguien da por sentada | Release control plane | Media | Slice 1 mide el uso real antes de tocar nada | Reporte del Slice 1 |
| Dejarla prendida y que la credencial documentada se filtre | Identidad / datos de clientes | Baja-Media | Opción (b): acotar a la persona de menor privilegio + rotar el secreto fuera del repo | — |
| La decisión se aplica al environment y la doc queda desalineada otra vez | Documentación | Alta si no se cuida | El Slice 3 exige tocar runtime y doc en el mismo cambio | `grep` de la variable post-cambio |

### Feature flags / cutover

La variable **es** el flag. No se agrega otro.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Nada que revertir: sólo mide | — | sí |
| 2 | Nada que revertir: produce una decisión escrita | — | sí |
| 3 | Volver a setear/quitar la env var + redeploy | <10 min | sí |

### Production verification sequence

1. Con la decisión aplicada, `POST /api/auth/agent-session` contra producción devuelve lo que la
   decisión dice (403 si se apagó; 200 sólo para la persona permitida si se acotó).
2. `CLAUDE.md` y la spec de identidad dicen lo mismo que ese resultado.

### Out-of-band coordination required

Ninguna, salvo que la opción (b) implique rotar `AGENT_AUTH_SECRET`, que sigue el runbook de rotación
de secretos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe medición del uso real de agent-session contra producción en los últimos 90 días.
- [ ] Existe decisión escrita entre (a), (b) y (c), con rationale.
- [ ] El runtime y `CLAUDE.md` dicen lo mismo sobre si producción acepta sesiones de agente.
- [ ] Si queda prendida: el alcance está acotado por escrito y el riesgo residual nombrado.
- [ ] Si se apaga: está verificado con un `POST` real que devuelve 403.

## Verification

- `POST /api/auth/agent-session` contra producción, con el resultado esperado declarado antes
- `grep -rn "AGENT_AUTH_ALLOW_PRODUCTION"` sin afirmaciones contradictorias

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `CLAUDE.md` corregido si la postura cambia
- [ ] `GREENHOUSE_IDENTITY_ACCESS_V2.md` §Agent Auth alineado

## Follow-ups

- La contraseña de las personas agente vive escrita en `CLAUDE.md`. Independiente de esta decisión,
  vale preguntarse si un secreto compartido de acceso debe estar en un doc que todo agente lee.

## Open Questions

1. ¿Quién prendió `AGENT_AUTH_ALLOW_PRODUCTION` y con qué caso de uso? La variable tiene ~90 días y no
   hay registro. Si nadie lo recuerda, eso ya es un argumento para la opción (a) o (b).
2. ¿Hay flujos automatizados —cron, monitor, canary— que dependan de sesiones de agente en producción
   hoy? El Slice 1 lo responde.
