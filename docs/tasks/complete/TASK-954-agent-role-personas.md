# TASK-954 — Agent Role Personas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Completado`
- Rank: `TBD`
- Domain: `identity|platform|ops|documentation`
- Blocked by: `none`
- Branch: `task/TASK-954-agent-role-personas`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear personas agente operativas por rol para que los agentes puedan diagnosticar, validar, capturar, probar permisos y diseñar experiencias con menor privilegio que el superadmin. El cambio agrega usuarios dedicados para `collaborator` puro y cliente compuesto, documenta reglas de uso y mantiene el flujo existente de Agent Auth.

## Why This Task Exists

Greenhouse ya tiene `agent@greenhouse.efeonce.org` con `efeonce_admin` + `collaborator`, útil para diagnóstico transversal, pero demasiado amplio para validar restricciones reales por rol. Sin usuarios agente limitados, agentes futuros tienden a probar todo como superadmin y pueden aprobar experiencias que no funcionan para colaboradores o clientes.

## Goal

- Provisionar una persona agente `collaborator` pura.
- Provisionar una persona agente cliente compuesta para cobertura general de portal cliente.
- Documentar cuándo usar cada persona agente y cuándo no usar superadmin.
- Mantener compatibilidad con `POST /api/auth/agent-session`, `scripts/playwright-auth-setup.mjs` y `pnpm fe:capture`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No crear un mecanismo paralelo de autenticación; reutilizar Agent Auth.
- No asignar roles internos/admin al usuario cliente.
- No asignar roles cliente al usuario collaborator.
- Los usuarios son para agentes y automatización, no para acceso humano.
- Para validar diferencias finas entre `client_executive`, `client_manager` y `client_specialist`, crear personas separadas en una task posterior; la persona cliente compuesta cubre experiencia cliente general con acceso agregado.

## Normative Docs

- `AGENTS.md`
- `CLAUDE.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/documentation/operations/acceso-programatico-staging.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`

## Dependencies & Impact

### Depends on

- `src/app/api/auth/agent-session/route.ts`
- `src/lib/tenant/access.ts`
- `scripts/playwright-auth-setup.mjs`
- `scripts/frontend/lib/env.ts`
- `greenhouse_core.client_users`
- `greenhouse_core.user_role_assignments`
- `greenhouse_core.clients`
- `greenhouse_serving.session_360`

### Blocks / Impacts

- Mejora validación de rutas `/my/*` con persona collaborator.
- Mejora validación de rutas cliente con persona client.
- Reduce dependencia de `agent@greenhouse.efeonce.org` para pruebas que no requieren superadmin.

### Files owned

- `migrations/20260531020000000_task-954-agent-role-personas.sql`
- `migrations/20260531021000000_task-793-contractor-payables-schema-forward-fix.sql` (unblock forward fix)
- `CLAUDE.md`
- `AGENTS.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/documentation/operations/acceso-programatico-staging.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Agent Auth emite sesiones para usuarios existentes via `POST /api/auth/agent-session`.
- `agent@greenhouse.efeonce.org` existe como superadmin + collaborator.
- `AGENT_AUTH_EMAIL` permite seleccionar el usuario autenticado.
- GVC y Playwright ya consumen Agent Auth.

### Gap

- No existe persona agente de mínimo privilegio para collaborator puro.
- No existe persona agente cliente para validar superficies client-facing sin permisos internos.
- Las reglas operativas no fuerzan elegir la persona más limitada que represente el caso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Ejecutado directamente por instrucción del usuario.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provisioning

- Crear migración idempotente para `agent-collaborator@greenhouse.efeonce.org`.
- Crear migración idempotente para `agent-client@greenhouse.efeonce.org`.
- Crear cliente sandbox dedicado `agent-client-sandbox` para la persona cliente.

### Slice 2 — Operational Contract

- Documentar la matriz de personas agente en `CLAUDE.md` y `AGENTS.md`.
- Documentar ejemplos de uso con `AGENT_AUTH_EMAIL`.
- Establecer regla de mínimo privilegio para agentes.

### Slice 3 — Functional Docs & Verification

- Actualizar arquitectura y documentación funcional de identidad.
- Actualizar documentación de acceso staging y GVC.
- Aplicar migración y verificar sesiones para ambas personas.

## Out of Scope

- Crear usuarios separados por cada rol cliente individual.
- Cambiar `POST /api/auth/agent-session`.
- Cambiar guards, route groups, entitlements o startup policy.
- Usar estos usuarios para producción humana o cuentas personales.

## Detailed Spec

Personas creadas:

| Persona | Email | User ID | Tenant | Roles | Uso |
|---|---|---|---|---|---|
| Superadmin agent | `agent@greenhouse.efeonce.org` | `user-agent-e2e-001` | `efeonce_internal` | `efeonce_admin` + `collaborator` | Diagnóstico transversal, admin, smoke amplio |
| Collaborator agent | `agent-collaborator@greenhouse.efeonce.org` | `user-agent-collaborator-001` | `efeonce_internal` | `collaborator` | `/my`, self-service, permisos de colaborador puro |
| Client agent | `agent-client@greenhouse.efeonce.org` | `user-agent-client-001` | `client` | `client_executive` + `client_manager` + `client_specialist` | Portal cliente general y validación client-facing |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 provisioning debe correr antes de documentar validación como disponible.
- Slice 2 docs debe quedar sincronizado con la migración.
- Slice 3 aplica y verifica la migración en Cloud SQL dev antes de cerrar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Persona cliente obtiene acceso interno por roles incorrectos | identity/access | low | Migración solo asigna roles `client_*`; verificación de `route_groups={client}` | Session payload / route guard |
| Persona collaborator prueba flujo que requiere `member_id` real | identity/hr | medium | Documentar que cubre permisos/UX collaborator puro; casos payroll personales reales pueden necesitar persona con member linkage posterior | UI empty/degraded en `/my` |
| Cliente sandbox se confunde con cliente real | data/ops | low | `client_id='agent-client-sandbox'`, notas explícitas y sin HubSpot/Nubox IDs | Revisión DB |

### Feature flags / cutover

Sin flag — cambio aditivo de identidad operativa. No modifica usuarios reales ni rutas productivas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Ejecutar down de la migración o borrar assignments/users sandbox por `user_id` y cliente sandbox si no tiene usuarios | <10 min | si |
| Slice 2 | Revertir documentación | <5 min | si |
| Slice 3 | Revertir task/docs y repetir `pnpm pg:connect:migrate` tras down si fuera necesario | <10 min | si |

### Production verification sequence

1. Aplicar migración en Cloud SQL dev con `pnpm pg:connect:migrate`.
2. Verificar `greenhouse_serving.session_360` para ambas personas.
3. Verificar `POST /api/auth/agent-session` para ambos emails en local.
4. Verificar docs y task lint.

### Out-of-band coordination required

No requiere coordinación externa. El cambio se limita a repo + Cloud SQL dev, no introduce Azure/GCP/Vercel secrets nuevos y no cambia proveedores de identidad externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe usuario agente collaborator puro con solo role `collaborator`.
- [x] Existe usuario agente cliente compuesto con solo roles `client_*`.
- [x] El usuario cliente queda anclado a un cliente sandbox dedicado.
- [x] `POST /api/auth/agent-session` emite sesión para ambas personas.
- [x] `CLAUDE.md` y `AGENTS.md` documentan cuándo usar cada persona.
- [x] Docs funcionales/manuales relevantes quedan sincronizados.

## Verification

- `pnpm pg:connect:status` — OK, `No migrations to run!`.
- `pnpm pg:connect:migrate` — OK tras reparar la cadena local de migraciones:
  - se eliminó el marker stale `20260530104907111_task-791-contractor-invoice-assets` que no tenía archivo vigente;
  - se agregó la forward-fix migration `20260531021000000_task-793-contractor-payables-schema-forward-fix.sql` porque `20260531010000000_task-793-contractor-payables.sql` ya estaba registrada como aplicada y no debía editarse;
  - se reaplicó TASK-954 con `node-pg-migrate` y luego se aplicó la forward fix idempotente.
- `public.pgmigrations` verificado con `TASK-791` vigente (`20260530203116605`), `TASK-792`, `TASK-793`, `TASK-954` y la forward fix `20260531021000000`, sin alias stale.
- Schema live verificado:
  - `greenhouse_hr.contractor_payables`
  - `greenhouse_hr.contractor_payable_events`
  - FK `contractor_work_submissions_consumed_by_payable_fkey`
  - CHECK `payment_obligations_source_kind_check` incluye `contractor_payable`.
- `greenhouse_serving.session_360` verificado para ambas personas:
  - `agent-collaborator@greenhouse.efeonce.org` -> roles `{collaborator}`, routeGroups `{my}`, home `/my`.
  - `agent-client@greenhouse.efeonce.org` -> roles `{client_executive,client_manager,client_specialist}`, routeGroups `{client}`, tenant `agent-client-sandbox`, home `/home`.
- `POST /api/auth/agent-session` local para las tres personas (`superadmin`, `collaborator`, `client`) -> OK.
- `scripts/playwright-auth-setup.mjs` generó `.auth/task-954-collaborator.json` y `.auth/task-954-client.json`.
- `pnpm exec vitest run src/lib/contractor-engagements/payables/state-machine.test.ts src/lib/contractor-engagements/payables/readiness.test.ts src/lib/contractor-engagements/payables/withholding.test.ts` -> 21 tests OK.
- `pnpm task:lint --task TASK-954`
- `git diff --check`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado
- [x] `changelog.md` quedo actualizado
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Crear personas cliente separadas por `client_executive`, `client_manager` y `client_specialist` si se necesita validar restricciones finas entre esos roles.

## Delta 2026-05-30

Task creada y ejecutada inmediatamente por instrucción del usuario. El bloqueo de `pnpm pg:connect:migrate` quedó resuelto en la causa raíz: se limpió el marker stale de TASK-791, se agregó una forward-fix migration para materializar el schema de TASK-793 sin editar una migración ya aplicada, y TASK-954 quedó aplicada por el runner canónico con `pg:connect:status` verde.
