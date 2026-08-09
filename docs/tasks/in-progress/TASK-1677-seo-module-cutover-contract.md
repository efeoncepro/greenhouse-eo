# TASK-1677 — Cerrar el cutover `seo_v1 → seo_v2`: la fase contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La ventana expand/contract del cutover `seo_v1 → seo_v2` está **abierta a propósito** desde
`ISSUE-143`: las dos claves conviven vigentes porque en su momento había runtimes que todavía pedían
`seo_v1` literal. El release del 2026-08-09 cerró esa condición. Esta task ejecuta la **fase contract**
—dejar de leer `seo_v1` en código y luego supersederla en datos— y cierra el estado transitorio.

## Why This Task Exists

Una ventana de cutover abierta es deuda con fecha de vencimiento silenciosa. Mientras las dos claves
convivan:

1. **El invariante de simetría sólo se verifica al migrar.** La migración de reapertura
   (`20260808184512073`) aborta si las claves cubren organizaciones distintas, pero eso corre una vez.
   Si mañana alguien habilita SEO a una organización nueva por el command canónico, nace **sólo** en
   `seo_v2` y la ventana queda asimétrica **sin ningún detector**. No rompe nada hoy —porque todos los
   runtimes leen ambas— pero deja el sistema en un estado que nadie está vigilando.
2. **Dos claves para un módulo invitan al error.** Cualquiera que escriba una query nueva tiene que
   acordarse de leer las dos. El guardrail de `entitlement.test.ts` protege la dirección peligrosa
   (superseder lo que se lee), no ésta.

`ISSUE-143` declara esta fase pendiente con dueño `TASK-1310`. Se separa acá porque 1310 es `ui-ux`
con una auditoría premium abierta, y esto es `backend-data` de bajo riesgo: mezclarlos ataría una
operación de datos de 20 minutos a un ciclo de diseño que puede durar semanas.

## Goal

- `SEO_MODULE_KEYS_READ` queda sólo con `seo_v2`.
- Los assignments `seo_v1` quedan superseded, con su historia preservada (nunca `DELETE`).
- El canary del provider contra producción sigue verde después de cada paso.
- `ISSUE-143` puede marcarse cerrado del todo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§10.7 cutover + su delta 2026-08-08)
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (module assignments y sus commands)
- `docs/issues/resolved/ISSUE-143-seo-module-cutover-expand-contract-collapsed.md`

Reglas obligatorias:

- **NUNCA** una sola migración contiene el expand y el contract del mismo cutover. Ésta es **sólo** contract.
- **NUNCA** superseder una clave que el código vigente todavía lee. Por eso el código va **antes** que la migración (ver Slice ordering).
- **NUNCA** `DELETE` de assignments: el contract es `effective_to`, que preserva la historia.
- **NUNCA** dar por verificada esta migración con un `SELECT`. Se verifica con el canary del provider contra el host de producción.
- **NUNCA** editar las migraciones ya aplicadas (`20260808131441444`, `20260808184512073`). Forward fix.

## Normative Docs

- `docs/manual-de-uso/growth/habilitar-portal-seo-cliente.md` (§Rollout — su nota del paso 2 describe el incidente)

## Dependencies & Impact

### Depends on

- **Precondición ya cumplida y verificada el 2026-08-09** (ver Current Repo State). No hay bloqueo.

### Blocks / Impacts

- `ISSUE-143` — su único pendiente declarado es esta fase.
- `TASK-1310` — deja de arrastrar el contract como deuda propia.
- Cualquier query futura sobre el módulo SEO: pasa a tener una sola clave.

### Files owned

- `src/lib/growth/seo/entitlement.ts` (`SEO_MODULE_KEYS_READ`)
- `src/lib/growth/seo/__tests__/entitlement.test.ts` (el test que fija el contenido del array)
- `migrations/<nueva>_task-1677-seo-module-cutover-contract.sql`

## Current Repo State

### Already exists

Las tres precondiciones del contract, **verificadas el 2026-08-09 runtime por runtime**:

1. **`main` tiene el dual-read** — `SEO_MODULE_KEY = 'seo_v2'` + `SEO_MODULE_KEYS_READ = ['seo_v2','seo_v1']`.
2. **Producción responde bien** — canary del provider contra `https://greenhouse.efeoncepro.com` **100% verde**, incluidos `track`/`untrack` que ahora devuelven `400` (existen) en vez de `404` (no existían).
3. **El ops-worker corre el dual-read** — revisión con `GIT_SHA=e048ef3a`, verificado como ancestro de `origin/main`. Los otros dos Cloud Run no consumen SEO (todo el consumo vive en `src/lib/growth/seo/**`).

Además existe el guardrail que ordena esta task: `entitlement.test.ts` falla si una migración nueva
supersede una clave que `SEO_MODULE_KEYS_READ` todavía acepta.

### Gap

- `SEO_MODULE_KEYS_READ` sigue aceptando `seo_v1`.
- Las 2 organizaciones (Grupo Berel y Efeonce) siguen con assignments vigentes en **ambas** claves.
- La simetría de la ventana no tiene detector en runtime.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/` + `migrations/` (portal Vercel + ops-worker Cloud Run)
- Future candidate home: `remain-shared`
- Boundary: el resolver de entitlement SEO y su predicado de clave; consumers autorizados son los 5 ya existentes.
- Server/browser split: el entitlement SEO se consume sólo server-side — route handlers de Vercel y handlers del ops-worker. Ningún bundle de navegador lee la clave del módulo.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- **Source of truth:** `greenhouse_client_portal.module_assignments` (vigencia por `effective_to` + `status`).
- **Contract surface:** `resolveSeoEntitlement` y los 4 consumers de batch/overview; ninguno cambia de firma.
- **Data invariants:** toda organización con SEO contratado conserva **exactamente un** assignment vigente después del contract, y es `seo_v2`. Ninguna fila se borra.
- **Tenant/access boundary:** sin cambios. El acceso sigue siendo per-organización.
- **Idempotencia/concurrencia:** la migración es idempotente (`WHERE effective_to IS NULL AND module_key='seo_v1'`); correrla dos veces no cambia nada la segunda.
- **Migración/backfill/rollback:** rollback = reabrir la ventana (`effective_to = NULL`), que es literalmente lo que se hizo el 2026-08-08 y está probado.
- **Sensitive data / error posture:** sin PII. Sin cambios de superficie de error.
- **Audit/signal posture:** ⚠️ la migración escribe `module_assignments` fuera del command canónico. Es aceptable para un cutover técnico de clave (no es un alta comercial: no cambia quién tiene qué, sólo cómo se llama), pero **debe declararse en el cuerpo de la migración** para que no siente precedente.
- **Runtime evidence:** canary del provider contra producción, antes y después de cada paso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contraer el código

- `SEO_MODULE_KEYS_READ` pasa a `['seo_v2']`.
- Actualizar el test que fija su contenido: el assert deja de ser decorativo y pasa a declarar que el cutover cerró.
- Desplegar y verificar con el canary **antes** de tocar datos.

### Slice 2 — Contraer los datos

- Migración nueva que supersede los assignments `seo_v1` vigentes (`effective_to = CURRENT_DATE`).
- Bloque `DO` de verificación: después de aplicar, cero `seo_v1` vigentes **y** toda organización que tenía SEO conserva su `seo_v2` vigente. Si alguna quedara sin cobertura, abortar.
- Declarar en el cuerpo por qué escribe fuera del command canónico.

### Slice 3 — Cierre

- Verificar con el canary contra producción.
- Cerrar `ISSUE-143` del todo y retirar el pendiente de `TASK-1310`.
- Actualizar §10.7 de la arquitectura: el cutover pasa de "ventana abierta" a "cerrado", con su fecha.

## Out of Scope

- Tocar `role_view_assignments` (append-only, otro carril).
- Cambiar el catálogo de módulos (`modules` es append-only; `seo_v1` **sigue existiendo** como fila, sólo deja de tener assignments vigentes).
- La alcanzabilidad del ítem en el menú del cliente (`TASK-1675`).
- La ronda premium de `TASK-1310`.

## Detailed Spec

**Por qué el código va antes que los datos.** El guardrail de `entitlement.test.ts` falla si una
migración supersede una clave que `SEO_MODULE_KEYS_READ` todavía acepta. Ese test —escrito el
2026-08-08 a partir del incidente— dicta el orden: primero dejas de leerla, después la apagas. Si se
intentara al revés, el guardrail rompería el build, que es exactamente su trabajo.

Y el orden es seguro en los dos pasos: al contraer el código, **todas** las organizaciones ya tienen
`seo_v2` vigente (la ventana es simétrica y está verificada), así que dejar de leer `seo_v1` no le
quita el módulo a nadie.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (código) DEBE ir antes que Slice 2 (datos).** No es preferencia: el guardrail lo impone.
- Entre Slice 1 y Slice 2 hay que **desplegar y verificar**. Aplicar la migración contra un runtime que todavía corre el array viejo funciona igual (aceptaría ambas), pero verificar entre pasos es lo que convierte esto en un cutover y no en una apuesta.
- Slice 3 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una org queda sin assignment vigente tras el supersede | Entitlement SEO (y los 3 batches que pagan al proveedor) | Baja | Bloque `DO` que aborta si alguna org pierde cobertura + verificación con canary | `hasModule=false` en el canary; `no_entitlement` en los batches |
| Un runtime no desplegado sigue pidiendo `seo_v1` | Vercel / ops-worker | Muy baja (verificado 2026-08-09) | Re-verificar los 5 runtimes **el día de la ejecución**, no confiar en esta task | Canary rojo |
| Asignación nueva creada entre Slice 1 y Slice 2 | Datos | Baja | Nace en `seo_v2` (que ya es la clave de escritura), así que el contract no la afecta | — |

### Feature flags / cutover

Sin flag. El cutover es el propio orden de los slices.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Revert del array + redeploy | <10 min | Sí |
| 2 | Reabrir la ventana (`effective_to = NULL`) — probado el 2026-08-08 | <5 min | Sí |
| 3 | Revert docs | <5 min | Sí |

### Production verification sequence

1. Canary del provider **antes** de empezar (línea base).
2. Slice 1 → desplegar → canary verde.
3. Slice 2 → aplicar migración → canary verde.
4. Confirmar cero `seo_v1` vigentes y que cada organización con SEO conserva su `seo_v2`.

### Out-of-band coordination required

- Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `SEO_MODULE_KEYS_READ` contiene sólo `seo_v2`, y su test lo declara como cutover cerrado.
- [ ] Cero assignments `seo_v1` vigentes; ninguna fila borrada (todas conservan su historia con `effective_to`).
- [ ] Toda organización que tenía SEO conserva exactamente un assignment vigente, y es `seo_v2`.
- [ ] La migración lleva bloque `DO` que aborta si alguna organización pierde cobertura.
- [ ] La migración declara en su cuerpo por qué escribe fuera del command canónico.
- [ ] Canary del provider verde contra producción **después de cada slice**, no sólo al final.
- [ ] `ISSUE-143` cerrado del todo y §10.7 de la arquitectura dice "cutover cerrado" con fecha.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm migrate:up` + verificación del bloque `DO`
- Canary del provider contra `https://greenhouse.efeoncepro.com`
- `pnpm task:lint --task TASK-1677`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`ISSUE-143`, `TASK-1310`)
- [ ] §10.7 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` actualizado a "cerrado"

## Follow-ups

- Tooling menor: la regla `modular-placement-contract` de `task:lint` marca la palabra española **"todo"** como si fuera el marcador inglés `TODO`, así que cualquier campo que empiece con "todo el/la…" da falso positivo. Detectada al crear esta task; su hermana (corchetes leídos como placeholder) está anotada en `TASK-1675`.
- Señal de fiabilidad que vigile la simetría de una ventana de cutover en runtime. Con esta task la ventana de SEO se cierra, así que deja de ser urgente — pero el hueco de método sigue: hoy el invariante sólo se verifica en el momento de migrar, y la próxima ventana lo va a heredar.

## Open Questions

1. ¿Se retira `seo_v1` del catálogo `modules`? Propuesta: **no**. La tabla es append-only y la fila es historia legítima; lo que se cierra son los assignments, no el registro de que esa clave existió.
