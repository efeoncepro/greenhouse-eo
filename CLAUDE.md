# CLAUDE.md

## Project Overview

Greenhouse EO — portal operativo de Efeonce Group. Next.js 16 App Router + MUI 7.x + Vuexy starter-kit + TypeScript 5.9. Deploy en Vercel.

### Operator Communication Style

- Hablarle al operador en español neutro latinoamericano, natural para una persona venezolana viviendo en Chile.
- Evitar modismos argentinos y voseo rioplatense (`che`, `boludo`, `vos`, `tenés`, `querés`, `laburo`, etc.).
- Mantener un tono claro, cercano y profesional; se permite chilenismo operativo solo cuando sea contexto del producto/país, no como muletilla.

### Data Architecture

- **PostgreSQL** (Cloud SQL `greenhouse-pg-dev`, Postgres 16, `us-east4`) — OLTP, workflows mutables, runtime-first
- **BigQuery** (`efeonce-group`) — raw snapshots, conformed analytics, marts, histórico
- Patrón de lectura: **Postgres first, BigQuery fallback**
- Schemas PostgreSQL activos: `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_hr`, `greenhouse_crm`, `greenhouse_delivery`, `greenhouse_ai`

### BigQuery DML Struct Timestamp Hard Rules (ISSUE-082 / TASK-941)

- Nunca declarar un campo temporal como `TIMESTAMP`/`DATETIME`/`DATE` dentro de `types: { rows: [STRUCT] }` si el valor JS viene como ISO string. El cliente Node de BigQuery puede escribir NULL silenciosamente dentro de `ARRAY<STRUCT>`.
- Patrón canónico: serializar con `toBigQueryStructTimestamp()` y declarar el campo como `STRING`; convertir en SQL con `TIMESTAMP(s.<col>)` en el `SELECT FROM UNNEST(@rows)`.
- El lint rule `greenhouse/no-bq-struct-string-timestamp` queda en modo error. Si un writer necesita otro patrón, debe documentar el motivo y probar round-trip real.
- Un run que ve data cruda elegible pero materializa 0 records nunca es `succeeded`: debe degradar/fallar con evidencia observable.
- No ejecutar un DELETE destructivo de período antes de validar el payload reemplazo. Si no se puede validar, skip/degrade y preservar el último estado bueno.

### Payroll Operational Calendar

- Calendario operativo canónico: `src/lib/calendar/operational-calendar.ts`
- Hidratación pública de feriados: `src/lib/calendar/nager-date-holidays.ts`
- Timezone canónica de base: `America/Santiago` vía IANA del runtime
- Feriados nacionales: `Nager.Date` + overrides persistidos en Greenhouse
- No usar helpers locales de vista para decidir ventana de cierre o mes operativo vigente

### International Internal Contract Type Invariants (TASK-894)

- `international_internal` es un `ContractType` canónico: `payRegime='international'` + `payrollVia='internal'`. No es Deel, no es EOR y no se degrada automáticamente a `contractor`.
- Efeonce SpA actúa como operational payer, no como employer of record/local-country legal employer en V1. No aplicar AFP, salud, cesantía, SIS, mutual, APV, IUSC ni retención SII a este perfil.
- Writes reales requieren capability `payroll.contract.use_international_internal` y `legalReviewReference` >= 10 caracteres. No loggear ni publicar el valor crudo en outbox/Sentry; el evento usa solo `hasLegalReviewReference`.
- Toda mutación de `contract_type`/`pay_regime`/`payroll_via` debe pasar por los helpers canónicos y emitir `member.contract_type.changed v1` + audit row append-only en la misma transacción.
- La DB protege la matriz contractual: miembros validan la tupla completa `(contract_type, pay_regime, payroll_via)` y `compensation_versions` valida `(contract_type, pay_regime)` para nuevas/actualizadas rows. No bypass por SQL directo.
- Los consumers downstream deben detectar `international_internal` por `contractType`, no por heurísticas compuestas de régimen/vía.

### Canonical 360 Object Model

- `Cliente` → `greenhouse.clients.client_id`
- `Colaborador` → `greenhouse.team_members.member_id`
- `Persona` → `greenhouse_core.identity_profiles.identity_profile_id`
- `Proveedor` → `greenhouse_core.providers.provider_id`
- `Space` → `greenhouse_core.spaces.space_id`
- `Servicio` → `greenhouse.service_modules.module_id`

Regla: módulos de dominio extienden estos objetos, no crean identidades paralelas.

### Deploy Environments

- **Production** → `main` → `greenhouse.efeoncepro.com`
- **Staging** → `develop` (Custom Environment) → `dev-greenhouse.efeoncepro.com`
- **Preview** → ramas `feature/*`, `fix/*`, `hotfix/*`

### Local-First Development Workflow

**Spec canonica:** `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`.

Regla base: `local = taller`, `branch/PR = validacion remota acotada`, `develop = integracion compartida`, `main = produccion via release control plane`.

Para reducir costo GitHub Actions/Vercel/GCP sin perder calidad, Claude/agents deben iterar y validar en local por defecto. No hacer push remoto como cierre automatico de cada flujo salvo instruccion explicita del operador, hotfix documentado o release controlado.

Comandos canonicos:

```bash
pnpm local:check       # lint + tsc
pnpm local:check:ui    # local:check + design:lint + build
pnpm local:check:full  # local:check + test + build
```

Antes de reducir o redisenar GitHub Actions por costo:

```bash
pnpm actions:cost:audit --from YYYY-MM-DD --to YYYY-MM-DD
```

Ese reporte local usa GitHub Actions Runs/Jobs API via `gh` para estimar hotspots por workflow/job. La factura oficial sigue siendo `cloud.billing.github`; no mezclar `estimatedGrossUsd` con billing neto.

Si el cambio toca UI visible, levantar `pnpm dev` y entregar la URL `localhost` exacta antes de pedir push. No usar Vercel Preview como loop de exploracion si localhost puede validar el cambio.

Prompt operativo recomendado:

```text
Implementa esto local-first. No hagas push.
Trabaja slice por slice, valida con pnpm local:check y tests focales.
Si toca UI, levanta pnpm dev y dame la URL localhost exacta.
Espera mi confirmacion antes de empujar a develop o crear preview remoto.
```

### Vercel Deployment Protection

- **SSO habilitada** (`deploymentType: "all_except_custom_domains"`) — protege TODO salvo custom domains de Production.
- El custom domain de staging (`dev-greenhouse.efeoncepro.com`) **SÍ tiene SSO** — no es excepción.
- Para acceso programático (agentes, Playwright, curl): usar la URL `.vercel.app` + header `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`.
- Hook operativo browser diagnostics: si el usuario pide abrir, revisar, diagnosticar, capturar o testear una ruta/URL del portal, usar automáticamente usuario agente dedicado + Playwright/Chromium. No pedir login ni navegar anónimo como primer intento. Enviar `x-vercel-protection-bypass` solo a origins Greenhouse/Vercel, no a terceros como Sentry.
- **Hook obligatorio de diseño UI (skills + GVC en loop) — ANY UI work**: para CUALQUIER trabajo de UI (componente nuevo, cambio visual, layout, estados, microinteracciones, mockup, copy visible), ANTES de escribir JSX nuevo **invocar las skills de product design** que apliquen — `greenhouse-ux` (layout + componente Vuexy/MUI + tokens), `modern-ui` (jerarquía/tipografía/spacing/balance), `state-design` (loading/empty/error/degraded honestos), `forms-ux` (inputs/validación/combobox), `greenhouse-ux-writing` (microcopy es-CL → `src/lib/copy/*`) — y DESPUÉS **verificar con GVC en loop**: `pnpm fe:capture`, leer el frame PNG, ajustar, re-capturar hasta que se vea enterprise. NUNCA pintar UI freehand ni declarar "listo" en UI sin una captura GVC mirada. Para mockup↔runtime, paridad por copy-and-patch + `fe:capture:diff`. Enforcement humano de Julio (sesión TASK-997): el loop atrapó pills→filas enterprise, `Autocomplete` crudo→`CustomAutocomplete`, prefill verificado, copy "workspace"→"Teamspace".
- Hook operativo de verificación visual UI: si el trabajo toca UI visible, screenshots, microinteractions, responsive, design QA, frame sequences o revisión visual, la evidencia primaria debe generarse con **Greenhouse Visual Capture** (`GVC`, `pnpm fe:capture`) / `pnpm fe:capture:review` y sus relacionados. Usar scenario existente cuando exista; usar `pnpm fe:capture --route=<path> --env=staging --hold=3000` para evidencia rápida; crear scenario en `scripts/frontend/scenarios/` si el flujo es repetible, tiene interacciones o requiere scroll/captura de secciones; usar `pnpm fe:capture:diff` para before/after y `pnpm fe:capture:health` para salud local del helper. Para pantallas largas, preferir `scroll selector`, `scrollTo`, `mark fullPage` y `mark clipSelector` antes de scripts ad-hoc. Para flows críticos, declarar `readiness`/`assertions`; para microinteractions, preferir `interaction` V2 con intención y frames relativos; para responsive, usar `viewports`; para mockup aprobado→runtime, usar `baseline`. Playwright ad-hoc solo como complemento cuando se necesiten console/network/API payloads o una interacción no soportada por el DSL; guardar artifacts bajo `.captures/` y documentar por qué no bastó `GVC`.
- **NUNCA crear manualmente** `VERCEL_AUTOMATION_BYPASS_SECRET` en Vercel — la variable es auto-gestionada por el sistema. Si se crea manualmente, sombrea el valor real y rompe el bypass.
- URLs de staging:
  - Custom domain (SSO, no para agentes): `dev-greenhouse.efeoncepro.com`
  - `.vercel.app` (usar con bypass): `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
- Proyecto canónico: `greenhouse-eo` (id: `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`, team: `efeonce-7670142f`). NUNCA crear un segundo proyecto vinculado al mismo repo.

### Vercel CLI Scope Discipline (ISSUE-076, desde 2026-05-13)

Bug class recurrente: agentes corriendo `vercel` CLI desde local crean proyectos duplicados auto-vinculados al repo en su scope personal por NO pasar `--scope efeonce-7670142f` explícito. Ocurrió 2 veces:

- **ISSUE-013** (2026-04-05): `prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8` creado en `julioreyes-4376's projects` scope. Borrado.
- **ISSUE-076** (2026-05-13): `prj_FKsbIbQfUHp8OlNgnWp5j7RHnYsL` creado por "Kortex Agent" durante sesión de bridge identity (commit `76255825`, 2026-04-14). 29 días generando email burst hasta detección y borrado.

**Defense in depth canónico** (3 capas):

1. **`.vercel/project.json` checked-in al repo** (desde 2026-05-13): pinea `projectId` + `orgId` al canonical. Vercel CLI lo lee automáticamente — operadores/agentes locales NO necesitan pasar `--scope` explícito porque el directory contiene el link.
2. **`.gitignore` ajustado** `.vercel/*` + `!.vercel/project.json`: permite trackear el pin pero preserva `.env*.local` files (secrets) ignorados.
3. **Regla operativa documentada** (esta sección): aún con `.vercel/project.json` checked-in, cualquier comando ad-hoc desde un directory que NO sea la raíz del repo (e.g. agente en un worktree, script standalone) DEBE pasar `--scope efeonce-7670142f` explícito.

**⚠️ Reglas duras**:

- **NUNCA** correr `vercel link`, `vercel deploy`, `vercel env`, `vercel project rm`, ni cualquier `vercel` command de mutation sin verificar primero que `cat .vercel/project.json` retorna `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`. Si no existe o difiere, pasar `--scope efeonce-7670142f` explícito.
- **NUNCA** modificar `.vercel/project.json` para apuntar a un scope distinto. Si emerge necesidad legítima (testing personal experimental), trabajar en un fork del repo o usar un dir separado.
- **NUNCA** committear archivos `.vercel/*.local` (contienen secretos). El `.gitignore` con `.vercel/*` los protege, pero verificar con `git status --short` antes de cualquier commit que toque `.vercel/`.
- **NUNCA** delete project sin verify-then-delete defensive pattern: resolve ID via `vercel project inspect` y compare con expected ID antes del `rm`. Pattern fuente: TASK-827 follow-up live 2026-05-13.
- **SIEMPRE** que un agente nuevo emerja necesitando Vercel CLI access, asegurar que primero corre `cat .vercel/project.json` para confirmar canonical link. Si está en un fork/worktree donde `.vercel/project.json` no está clonado, hacer `vercel link --scope efeonce-7670142f --project greenhouse-eo --yes`.

**Patrón canónico de delete defensive (ISSUE-076 verify-then-delete)**:

```bash
EXPECTED_ID="prj_<authorized_id>"
RESOLVED_ID=$(vercel project inspect <name> --scope <scope> 2>&1 | awk '/ID/{print $2; exit}')
if [ "$RESOLVED_ID" = "$EXPECTED_ID" ]; then
  echo "y" | vercel project rm <name> --scope <scope>
else
  echo "ABORT — ID mismatch (resolved=$RESOLVED_ID, expected=$EXPECTED_ID)"
  exit 1
fi
```

CLI Vercel targetea por `name+scope`, NO por ID directo. El pattern resuelve el ID via `inspect`, compara contra el ID authorized por humano, y aborta si mismatch. Único patrón seguro para destructive Vercel actions cuando el target fue autorizado by ID (no by name+scope).

**Spec canónica**: `docs/issues/resolved/ISSUE-076-vercel-cli-duplicate-project-recurrent-bug-class.md` (cierra recurrencia de ISSUE-013).

### Cross-repo action safety (desde 2026-05-18, post Kortex over-application)

Cuando una instrucción menciona "repos hermanos" o pide aplicar un cambio a múltiples repos del ecosystem (e.g. documentar transfer, agregar notas cross-link, broadcast cambios canonical), **antes de commitear a cualquier repo distinto de `efeoncepro/greenhouse-eo`**, el agente debe verificar 2 condiciones:

1. **Relevancia operacional**: ¿el repo target consume o referencia el cambio? `GREENHOUSE_REPO_ECOSYSTEM_V1.md` lista repos hermanos pero algunos son **productos separados** (e.g. `efeoncepro/kortex` es plataforma CRM/HubSpot, NO Greenhouse ecosystem operacional). Aplicar la instrucción literal a TODOS los repos del doc sin filtrar = over-application.

2. **CI/CD del target repo**: ¿el repo tiene auto-deploy en push a `main` (Vercel/GitHub Actions/etc.)? Si SÍ, un commit benigno (incluso solo al README) **dispara el pipeline completo** — puede revelar bugs pre-existing dormant y generar email burst al owner. Antes de commit directo, verificar el último deploy status. Si está en Error, NO commitear (re-disparás el fail).

**⚠️ Reglas duras**:

- **NUNCA** commit directo a `main` de un repo sibling sin (a) confirmar relevancia operacional del cambio, (b) check del último deploy status del repo target, (c) decisión explícita del user si el repo tiene auto-deploy productivo.
- **NUNCA** asumir "instrucción literal aplica a todos los repos listados en el ecosystem doc". Filtrar por relevancia operacional ANTES de actuar. Si emerge duda, preguntar al user.
- **PREFERIR** PR + review en lugar de commit directo cuando el repo target tiene auto-deploy productivo y el cambio no es critical hotfix.
- **SIEMPRE** que la instrucción del user incluya "todos los repos hermanos" o equivalente plural, enumerar primero los repos candidate + propuesta filter por relevancia + esperar confirmación antes de bulk apply.

**Caso fuente (2026-05-18, Kortex over-application)**: durante governance fix del transfer `notion-bigquery` → `efeoncepro` org, agregué ecosystem note cross-link al README de los 4 repos hermanos listados en `GREENHOUSE_REPO_ECOSYSTEM_V1.md`. Kortex es **producto separado** sin relación operacional al sync notion-bigquery, pero apliqué la instrucción literal. Mi commit benigno (solo README) disparó auto-deploy Vercel productivo que falló por bug pre-existing 33 días dormant. Email noise al owner + 5 min cleanup (revert vía git clone). Lesson: relevancia + CI/CD check ANTES de cross-repo actions.

## Quick Reference

- **Package manager:** `pnpm` (siempre usar `pnpm`, no `npm` ni `yarn`)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Test:** `pnpm test` (Vitest)
- **Type check:** `npx tsc --noEmit`
- **PostgreSQL connect:** `pnpm pg:connect` (ADC + proxy + test), `pnpm pg:connect:migrate`, `pnpm pg:connect:status`, `pnpm pg:connect:shell`
- **PostgreSQL health:** `pnpm pg:doctor`
- **Migrations:** `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:create <nombre>`, `pnpm migrate:status`
- **DB types:** `pnpm db:generate-types` (regenerar después de cada migración)

### Solution Quality Contract

- Greenhouse espera soluciones seguras, robustas, resilientes y escalables por defecto; no parches locales salvo mitigacion temporal explicita.
- Antes de implementar, validar si el problema es sintoma local o causa compartida y preferir la primitive canonica del dominio.
- Todo workaround debe quedar documentado como temporal, reversible, con owner, condicion de retiro y task/issue asociada cuando aplique.
- Fuente canonica: `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.

### Full API Parity Principle

**Regla base:** todo lo que se pueda hacer dentro de Greenhouse debe poder hacerse, o tener camino planificado para hacerse, a traves de un contrato programatico gobernado. La UI no es el source of truth de una capacidad: es un cliente de commands, readers, projections y API contracts server-side.

**Implicaciones duras:**

- **NUNCA** implementar una accion de negocio solo dentro de un componente UI si puede afectar estado, permisos, datos, aprobaciones, exports, recoveries, reportes o configuracion. Extraer primero la primitive canonica en `src/lib/**`.
- **NUNCA** crear endpoints que sean simples "click handlers remotos" acoplados al componente visible. Modelar el aggregate/recurso/command y su contrato estable.
- **SIEMPRE** que una feature nueva agregue una accion visible, declarar el camino programatico esperado: Product API interna, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, CLI/runbook, o task follow-up si se difiere.
- **SIEMPRE** que el write pueda reintentarse o venga de integracion/agente, aplicar command semantics explicita, authorization tenant-safe, audit/outbox cuando aplique, idempotencia, errores sanitizados y observabilidad.
- **SIEMPRE** que la UI consuma una operacion, preferir reuse de readers/commands canonicos antes de crear logica paralela para la pantalla.

**Fuente canonica:** `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` + `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` + decision "Full API parity" en `docs/architecture/DECISIONS_INDEX.md`.

### Session access derivation must honor role-assignment lifecycle (TASK-987 / ISSUE-083, desde 2026-06-01)

Toda derivación de **acceso de sesión** desde `user_role_assignments` (route_groups, role_codes, y cualquier proyección derivada de roles) **debe** aplicar el **mismo predicado de ciclo de vida**: `ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)`. Un rol **revocado/expirado NUNCA confiere acceso** — ni route group, ni vista, ni capability, ni ítem de menú.

**Bug class fuente (over-exposure)**: el view `greenhouse_serving.session_360` agregaba `role_codes` CON el filtro de lifecycle pero `route_groups` SIN él (solo `FILTER (WHERE rg.rg IS NOT NULL)`). Resultado: roles revocados seguían aportando su `roles.route_group_scope`. Una `collaborator` con `efeonce_account` revocado seguía viendo Personas/Comercial; otra collaborator veía Finanzas+HR por 3 roles revocados. 5 usuarios afectados, silencioso por falta de detector. El fallback BQ (`getIdentityAccessRecord`) sí filtraba `ura.active=TRUE AND status='active'` al JOIN — solo el view PG divergía.

**⚠️ Reglas duras**:

- **NUNCA** agregar/derivar un campo de acceso (route_groups, role-derived flags) en un read model o helper sin el predicado de lifecycle idéntico al de `role_codes`. Los dos agregados deben moverse juntos; si uno filtra activo, el otro también.
- **NUNCA** parchear un caso individual de over-exposure ("filtrá a Valentina"). El fix es la corrección de la **derivación canónica** + detector de drift; el caso individual es síntoma.
- **NUNCA** restaurar acceso legítimo de un usuario vía hardcode ni dejándolo apoyado en la fuga de un rol revocado. Re-otorgar el **rol ACTIVO canónico** (que carga route_groups + `role_view_assignments` + `role_entitlement_defaults`). Caso fuente: Humberly ("Finance Manager") → re-grant `finance_admin`+`hr_manager` activos, NO hardcode finance/hr.
- **NUNCA** asumir que las superficies de supervisor (Mi equipo/Aprobaciones/Organigrama) dependen de route groups — se gatean por `supervisorAccess` (TASK-727, `canAccessSupervisorPeople = hasDirectReports || hasDelegatedAuthority`), independiente de route groups. El fix de route groups NO las toca.
- **SIEMPRE** que emerja una derivación de acceso desde roles, shippear el **detector de drift** correspondiente. Signal canónico: `identity.session.route_group_drift` (kind=drift, moduleKey=identity, severity=error si >0, steady=0) — cuenta usuarios cuyo `route_groups` ⊋ derivación desde roles activos. Reader: `src/lib/reliability/queries/identity-session-route-group-drift.ts`.
- **SIEMPRE** que cambie el shape de derivación de `session_360`, incluir un DO block de verificación en la migración (aborta si queda fuga) — patrón de la migración `20260601194051024`.

**Open question (gobernanza, no resuelta en TASK-987)**: el mapa TS `ROLE_ROUTE_GROUPS` (`src/lib/tenant/role-route-mapping.ts`) y el DB `greenhouse_core.roles.route_group_scope` difieren en `people` para `efeonce_operations`/`hr_payroll`. El runtime usa el DB (via el view); el TS es fallback. Reconciliar los VALORES del mapping es decisión de gobernanza del operador — NO cambiar unilateralmente.

**Spec canónica**: `docs/tasks/complete/TASK-987-session-route-groups-lifecycle-fix.md` + `docs/issues/resolved/ISSUE-083-session-route-groups-leak-from-revoked-roles.md`. Migración: `migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql`.

### Runtime Rollout Completion Gate

**Regla dura:** no declarar una task, incidente o flujo como terminado si solo esta implementado en codigo pero falta cualquier paso para que funcione en el runtime real. `code complete` no es `operationally complete`.

Antes de cerrar, verificar y documentar segun aplique:

- flags/env vars configuradas en todos los targets relevantes (`Production`, `staging`, `Preview (develop)`, workers, crons, Cloud Run);
- redeploy/restart aplicado cuando Vercel, Cloud Run o el worker no toman env vars nuevas en caliente;
- migraciones aplicadas, backfills/recoveries ejecutados y data shape confirmado en PostgreSQL/BigQuery/source of truth;
- integracion externa probada con evidencia real si el flujo depende de Entra/SCIM, Microsoft Graph, HubSpot, Notion, Teams, Vercel, GCP, Azure, webhooks o crons;
- API/UI runtime verificada contra el deployment activo, no solo contra tests unitarios o mocks;
- Handoff actualizado con lo aplicado, lo verificado y cualquier pendiente bloqueante.

Si falta algo, reportar el estado como `code complete, rollout pendiente` o `operativamente bloqueado`; no mover lifecycle a complete ni decir "listo" como si el usuario ya pudiera usarlo.

**Caso fuente 2026-06-01:** Workforce Activation/SCIM tenia codigo TASK-872/874/876, pero sin `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true`, `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true`, redeploy de Vercel y backfill de usuarios ya creados, Entra seguia creando solo `client_users` y no `members`. La pantalla prometia activacion laboral, pero Maggie Borralles no aparecia hasta completar rollout + recovery.

### Documentation Closure Gate

Despues de cualquier implementacion, incidente, rollout, cambio de arquitectura/workflow o skill local, invocar `greenhouse-documentation-governor` antes de declarar el trabajo completo y usar `pnpm docs:closure-check` como primera pasada mecanica. La skill decide y ejecuta la sincronizacion documental proporcional: arquitectura/ADR, `DECISIONS_INDEX`, changelog, `Handoff.md`, task lifecycle, `AGENTS.md`, `CLAUDE.md`, `project_context.md`, docs funcionales, manuales, auditorias y relacionados. Paths canonicos: `.codex/skills/greenhouse-documentation-governor/SKILL.md` y `.claude/skills/greenhouse-documentation-governor/SKILL.md`.

Regla corta: si los docs, rollout, lifecycle y evidencia no quedaron sincronizados, el estado correcto es `code complete, rollout pendiente` u `operativamente bloqueado`, no `complete`.

### Task Closing Quality Gate — full test + production build local (desde 2026-05-13, TASK-827 follow-up)

**ANTES de mover una task de `in-progress/` a `complete/`** y declarar "ship done", correr **ambos** comandos local como gate final canonical:

```bash
pnpm test          # full suite (NO solo focal del modulo tocado)
pnpm build         # produccion Turbopack (next build) — NO el dev server
```

**Por que el pre-push hook NO basta** (canonizado live 2026-05-13 post 2 CI failures consecutivos en TASK-827):

El pre-push hook canonical del repo corre `pnpm lint` + `pnpm tsc --noEmit` (~90s). Es **first filter**, NO gate final. Especificamente NO corre:

- `pnpm test` (full suite ~12 min con coverage) — atrapa test contracts cross-module que tu modulo focal no toca pero tu cambio invalida (ej. test pin-eando `VIEW_REGISTRY` length; lint rule cubriendo recurso compartido; column-parity test SQL)
- `pnpm build` (Turbopack next build ~8 min) — atrapa boundary violations que tsc/lint NO enforcen: `import 'server-only'` transitivo a client bundle, dynamic imports rotos, hidden type errors solo en Turbopack pipeline, etc.

CI corre ambos. Si tu task no los corre local pre-close, CI los descubre post-push → rojo + email burst + perdes el deploy automatico hasta el siguiente push fix.

**Reglas duras**:

- **NUNCA** declarar una task complete + move a `complete/` + sync `README.md` sin haber corrido `pnpm test` (full suite) y `pnpm build` (production) local en el ultimo commit del slice final. Pre-push hook (lint + tsc) NO sustituye este gate — son layers diferentes.
- **NUNCA** asumir que los tests focales de tu modulo cubren el blast radius. Si tu task toca un **recurso compartido** (`VIEW_REGISTRY`, `RELIABILITY_REGISTRY`, `entitlements-catalog`, `EVENT_CATALOG`, public types exportados ampliamente, migrations seedeando registries), el blast radius incluye tests cross-module que tu modulo no ve. Solo full suite los atrapa.
- **NUNCA** asumir que `tsc --noEmit` cubre boundary contracts runtime. `server-only` / `client-only` son runtime contracts; TypeScript no los enforce. Solo `next build` con Turbopack lo detecta.
- **NUNCA** considerar un CI rojo como "el sistema funcionando bien". Si CI falla por algo que tu hubieras detectado con `pnpm test && pnpm build` local, es un escape de mi proceso de pre-close, NO de la "red de seguridad CI".
- **SIEMPRE** que un slice introduzca:
  - Component nuevo con `'use client'` que importe de un modulo `src/lib/` → `pnpm build` antes del push (Turbopack detecta server-only transitivo)
  - Modification a un registry / catalog / shared resource → `pnpm test` antes del push (full suite captura cross-module assertions)
  - Cambio a un public type exportado / firma de helper canonico → ambos
- **SIEMPRE** que cierres una task `in-progress/` → `complete/`, los ultimos comandos en tu shell antes del move deberian ser `pnpm test && pnpm build`. Si alguno falla, NO cierres — debug primero.

**Bug class canonizada (TASK-827, 2026-05-13)**: 2 CI failures consecutivos post "task complete":

1. `client-role-visibility.test.ts` pin-eaba 11 viewCodes en `VIEW_REGISTRY section='cliente'`; Slice 0 agrego 11 mas → 22 total → test rompe assertions de length + matrix coverage. Detectable con `pnpm test` full suite. NO detectable con `pnpm test src/lib/client-portal/` (focal).
2. `ClientPortalNavigationList.tsx` ('use client') importaba tipos + helper puro de `menu-builder.ts` que declara `import 'server-only'`. Turbopack en `next build` detecta server-only transitivo a client bundle y rompe. tsc/lint/vitest pasan (mock `server-only`); solo build produccion detecta. Detectable con `pnpm build` local.

Ambos fueron escapes de mi proceso pre-close. Esta regla canonical los previene.

**Trade-off explicito**: ~20 min extra pre-close vs 12+ min de CI failure + email burst de Vercel + push fix + nueva ronda CI. Net positive cuando count tests + build cost local < (CI roundtrip + dev context switch + reputational cost de "shipped roto").

**Bug class adicional canonizado live 2026-05-28 (TASK-943 follow-up)**: cuando tu working tree contiene **orphan uncommitted changes** de sesiones previas (e.g. stashed code, lifecycle moves pendientes, helpers half-committed), tu `pnpm build` local pasa porque ejercita el WT completo — pero Vercel construye contra el SHA exacto que recibió, sin el orphan state. Si tus commits dependen del orphan (e.g. `import { helper } from '@/lib/x'` donde `helper` solo existe uncommitted), **Vercel rompe en build aunque local esté verde**. Detectado live: Slice 2 + Slice 3 de TASK-943 importaban `toBigQueryStructTimestamp` desde `@/lib/bigquery` cuya exportación vivía solo en mi WT como orphan TASK-941 closure — 4 deploys staging consecutivos en Error hasta que un commit ajeno agregó el export al remoto.

**Reglas duras** (adicionales al gate canonical):

- **NUNCA** committear código que dependa de un símbolo exportado por archivo cuyas modificaciones estén uncommitted/stashed. **ANTES de cada commit**, correr `git status --short` y verificar que cualquier archivo modificado del cual dependo está incluido en el stage o ya está pusheado. Si emerge orphan state al stagear (sesión anterior dejó cosas a medio cerrar), o (a) committearlo formalmente PRIMERO como su propio commit cerrando la sesión anterior, o (b) stashearlo y volver después — NUNCA dejarlo "convivir" con commits que dependen de él.
- **SIEMPRE** que detectes orphan state en `git status --short` antes de empezar trabajo nuevo, decidir explícitamente: (1) commit + push para cerrar la sesión anterior, (2) stash con nombre claro para preservar, o (3) revert si era residual no deseado. NUNCA dejarlo flotante asumiendo que "no afecta mis commits nuevos" — los Vercel builds remotos no ven tu WT.
- **SIEMPRE** que tu commit toque `import X from '@/lib/foo'` para un símbolo nuevo, verificar con `git ls-tree -r origin/develop --name-only | grep foo` que el archivo está en remoto Y `git show origin/develop:src/lib/foo.ts | grep "export.*X"` que el símbolo está exportado. Si no, primer commit = agregar el export; segundo commit = usarlo.

**Pre-push defense-in-depth recomendado**: cuando un commit toca imports cross-module críticos, correr `git stash --keep-index && pnpm build && git stash pop` ANTES del push — eso ejercita el build solo con lo staged, replicando lo que Vercel verá. Es ~30s extra que detecta este bug class sin pasar por el CI roundtrip.

**Post-push verificación obligatoria de despliegues Cloud Run workers** (canonizado live 2026-05-28 TASK-943 follow-up): cualquier commit pushado a `develop` que toque archivos bajo `src/lib/**` que sean consumidos por los 4 workers Cloud Run (`ops-worker`, `ico-batch-worker`, `commercial-cost-worker`, `hubspot-greenhouse-integration`) — es decir, **casi cualquier cambio backend** — DEBE verificarse en GitHub Actions ANTES de declarar la task complete. Pre-push hook (lint + tsc) NO ejercita el bundle esbuild de los workers; Vercel build NO ejercita los workers tampoco. Los workers tienen su propia pipeline de deploy con esbuild bundler distinto al Turbopack de Next.js, y pueden fallar independientemente.

**⚠️ Reglas duras**:

- **NUNCA** mover una task a `complete/` sin verificar que los 4 workflows de Cloud Run workers afectados por los commits de la task estén en `conclusion=success`. Verificar con: `gh run list --workflow=ico-batch-deploy.yml --limit 5` + idem `ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `hubspot-greenhouse-integration-deploy.yml`. Si alguno está `failure`/`cancelled`, **re-disparar** con `gh workflow run <workflow> --ref develop -f environment=staging -f expected_sha=$(git rev-parse origin/develop)` y monitorear hasta success.
- **NUNCA** asumir que un workflow `cancelled` por commit subsequent es "OK porque el siguiente lo cubre" — workflows production-deploy son SEPARADOS por workflow, NO por commit; cada uno necesita su propio run success para garantizar que el último SHA de develop está deployado a las revisions Cloud Run productivas.
- **NUNCA** pushear múltiples commits al hilo a `develop` sin verificar entre pushes que el deploy del commit anterior completó (o aceptar que el siguiente cancelará al anterior — y entonces re-disparar el último al final).
- **SIEMPRE** que la task touch `src/lib/{bigquery,ico-engine,sync,reliability,observability,postgres}/**` (consumed by workers), el cierre canonical INCLUYE: `gh run list --workflow=<deploy>.yml --limit 1 --json conclusion` para los 4 workers + estado terminal `success` + revision Cloud Run actualizada con `GIT_SHA == expected_sha`.

**Patrón canonical de cierre post-Vercel-Ready** (TASK-943 follow-up canonizado):

```bash
# 1. Verifica que los 4 deploy workflows estén success en el último SHA
LATEST_SHA=$(git rev-parse origin/develop)
for WF in ico-batch-deploy.yml ops-worker-deploy.yml commercial-cost-worker-deploy.yml hubspot-greenhouse-integration-deploy.yml; do
  STATUS=$(gh run list --workflow=$WF --limit 1 --json status,conclusion,headSha -q '.[0] | "\(.status) \(.conclusion) \(.headSha)"')
  echo "$WF: $STATUS"
done

# 2. Si alguno NO matchea LATEST_SHA con conclusion=success, re-disparar:
gh workflow run <workflow>.yml --ref develop -f environment=staging -f expected_sha=$LATEST_SHA

# 3. Monitorear hasta success (Monitor canonical or gh run watch <run-id>)
```

**Excepcion legitima** (documentar): hotfix critico bajo incident response real (ej. ISSUE-### activo, production down) puede saltar este gate priorizando velocidad. En ese caso, post-push correr ambos comandos remoto via CI (`gh run watch`) y reportar verde como cierre.

### Admin Center Entitlement Governance (TASK-839, desde 2026-05-11)

- Surface canónica: `/admin/views`, Admin Users > `[usuario]` > Acceso y APIs `/api/admin/entitlements/**`. No crear rutas paralelas `/api/admin/governance/access/**`.
- Todo write de role defaults, user overrides o startup policy debe pasar por `src/lib/admin/entitlements-governance.ts` para mantener transacción única: governance table + audit append-only + outbox.
- Cada endpoint debe hacer doble gate: `requireAdminTenantContext()` para entrada broad y `can(tenant, 'access.governance.*', action, 'tenant')` para least privilege granular.
- Antes de persistir una capability, validar que exista en `greenhouse_core.capabilities_registry` y `deprecated_at IS NULL`. Nunca bypassar el registry ni escribir grants con strings ad hoc.
- Grants sensibles (`*_sensitive`, `.reveal_sensitive`, `.export_snapshot`) quedan `pending_approval` y requieren segunda firma con actor distinto. Pending grants no se aplican al acceso efectivo.
- Outbox governance debe incluir `schemaVersion: 1` y `affectedUserIds` cuando el cambio impacte usuarios; `organizationWorkspaceCacheInvalidationProjection` soporta fan-out vía `extractScopes`.
- Signals canónicos: `identity.governance.audit_log_write_failures` y `identity.governance.pending_approval_overdue`. Steady state esperado: 0.

### Deprecated Capabilities Discipline (TASK-840, desde 2026-05-11)

- Cuando una capability se remueve del TS catalog (`src/config/entitlements-catalog.ts`), acompañar el cambio con una migration que marque `greenhouse_core.capabilities_registry.deprecated_at`; nunca borrar rows del registry.
- No deprecar una capability que todavía existe en el TS catalog. Eso es drift inverso y se corrige seedeando/actualizando `capabilities_registry`.
- Usar `markCapabilityDeprecated()` o el endpoint canónico `/api/admin/entitlements/capabilities/[capabilityKey]/deprecate`; no escribir `deprecated_at` a mano desde rutas nuevas.
- Antes de deprecar, verificar grants activos en `role_entitlement_defaults` y `user_entitlement_overrides`. Si existen, migrar/documentar esos grants primero.
- El reporter one-shot `scripts/governance/find-deprecated-candidates.ts` lista candidates en CSV; no auto-depreca ni reemplaza revisión de operador.

### View Registry Governance Pattern (TASK-827, desde 2026-05-13)

Cualquier `viewCode` agregado a `VIEW_REGISTRY` en `src/lib/admin/view-access-catalog.ts` **debe acompañarse en el MISMO PR** de una migration que:

1. INSERT en `greenhouse_core.view_registry` (gobernanza persistida)
2. INSERT en `greenhouse_core.role_view_assignments` con `granted=TRUE` para CADA role que deba acceder ese viewCode

**Por qué**: el helper `roleCanAccessViewFallback()` en `src/lib/admin/view-access-store.ts:99-125` opera como signal de gobernanza pendiente. Cuando un viewCode NO tiene fila explícita en `role_view_assignments`, el fallback heurístico resuelve `granted=true` por route_group match Y emite WARNING `role_view_fallback_used` (Sentry domain=identity) — funciona correctamente operacionalmente, pero es ruido de gobernanza incompleta.

**Bug class detectado live (TASK-827 Slice 0, 2026-05-13)**: agregué 11 viewCodes nuevos al TS registry sin migration acompañante → Sentry emitió 10 warnings en sesión cliente real (alert JAVASCRIPT-NEXTJS-4X). Causa raíz: gap entre TS source-of-truth y DB seed. Solución canónica: migration de seed (44 filas: 11 viewCodes × 4 roles), NO patch del fallback ni desactivar telemetría.

**Pattern canónico** (mirror TASK-750/749/827):

```sql
-- Up Migration
INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('<section>.<view_code>', '<section>', '<Label>', '<Description>', '<route_group>', '/<path>', 'tabler-<icon>', <N>, TRUE, 'migration:TASK-XXX')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon, active = TRUE, updated_at = NOW(), updated_by = 'migration:TASK-XXX';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('<role_code>', '<section>.<view_code>', true, 'migration:TASK-XXX', NOW(), NOW(), 'migration:TASK-XXX')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted, updated_at = NOW(), updated_by = 'migration:TASK-XXX';

-- Anti pre-up-marker check (CLAUDE.md regla migration markers)
DO $$
DECLARE registered_count INTEGER; granted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry WHERE view_code IN (...);
  IF registered_count < <N> THEN
    RAISE EXCEPTION 'TASK-XXX anti pre-up-marker: expected <N> view_registry rows, got %', registered_count;
  END IF;
  -- repeat para role_view_assignments
END $$;

-- Down Migration (idempotent, append-only audit)
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-XXX:revert'
WHERE updated_by = 'migration:TASK-XXX';
```

**⚠️ Reglas duras**:

- **NUNCA** agregar entry a `VIEW_REGISTRY` TS sin migration acompañante en el mismo PR. La telemetría `role_view_fallback_used` lo detectará en producción y genera ruido Sentry.
- **NUNCA** desactivar el helper `roleCanAccessViewFallback` ni la captureMessageWithDomain del path. ES la señal canonical de drift gobernanza — load-bearing.
- **NUNCA** parchear el fallback heurístico para "evitar" el warning. La solución canonical es seed migration; el warning ES el detector.
- **NUNCA** borrar filas de `role_view_assignments` (append-only governance). Down migration marca `granted=FALSE` preservando audit trail.
- **NUNCA** definir un viewCode sin `routePath` válido (incluso si la página es placeholder forward-looking — declara el path canonical, page se crea en TASK derivada).
- **SIEMPRE** que un viewCode se vuelva accesible para más roles (e.g. nuevo addon), migration nueva con INSERT ON CONFLICT DO UPDATE para los grants adicionales. NO modificar la migration original.
- **SIEMPRE** usar `migration:TASK-XXX` como `granted_by`/`updated_by` audit marker — preserva trazabilidad cross-migration.
- **SIEMPRE** incluir DO block anti pre-up-marker check (TASK-838 pattern) en migrations que seedean view_registry/role_view_assignments, validando COUNT esperado post-INSERT.

**Spec canónica**: `docs/tasks/complete/TASK-827-client-portal-composition-layer-ui.md` Slice 0 + incident hardening commit `2fd8a60c` (seed 44 filas, 11 viewCodes × 4 roles client_executive/client_manager/client_specialist/efeonce_admin).

### Secret Manager Hygiene

- Secretos consumidos por `*_SECRET_REF` deben publicarse como scalar crudo: sin comillas envolventes, sin `\n`/`\r` literal y sin whitespace residual.
- Patrón recomendado:
  ```bash
  printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
  ```
- Siempre verificar el consumer real después de una rotación:
  - auth: `/api/auth/providers` o `/api/auth/session`
  - webhooks: firma/HMAC del endpoint
  - PostgreSQL: `pnpm pg:doctor` o conexión real
- Rotar `NEXTAUTH_SECRET` puede invalidar sesiones activas y forzar re-login.

### AI Visual Asset Generator

- Skill canonica para pedir, promptear, generar y QA assets visuales con IA: `.claude/skills/greenhouse-ai-image-generator/SKILL.md` (Codex mirror: `.codex/skills/greenhouse-ai-image-generator/SKILL.md`). Usarla cuando el usuario pida iconos, UI elements, empty states, banners, assets transparentes, OpenAI/GPT Image/Imagen/Nano Banana o mejora de prompts para imagenes.
- La skill no solo opera el provider: debe actuar como direccion de arte, con brief visual, composicion, materiales/acabados, iluminacion, paleta, iteracion single-change y rubric de QA profesional. Guia compartida: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`.
- Entry point canonico para assets visuales generados por agentes: `src/lib/ai/image-generator.ts`.
- `generateImage()` soporta providers `google-imagen` y `openai-image`; no llamar APIs de imagen desde scripts paralelos si el helper cubre el caso.
- `GREENHOUSE_IMAGE_PROVIDER` controla el default runtime, pero cada llamada puede pasar `provider`.
- OpenAI usa `src/lib/ai/openai-image.ts` y resuelve la key solo server-side con `OPENAI_API_KEY` / `OPENAI_API_KEY_SECRET_REF`; el secreto canonico es `greenhouse-openai-api-key` en GCP Secret Manager. Nunca hardcodear `sk-*` en repo, Vercel env directo, logs, tests ni docs.
- Para PNG transparente, pedir `format: 'png'` + `background: 'transparent'`; `gpt-image-2` no soporta transparencia y el helper aplica fallback seguro a `gpt-image-1.5`, dejando `requestedModel` y `modelFallbackReason`.
- Modos OpenAI disponibles: `generateOpenAIImage()` para text-to-image, `editOpenAIImage()` para imagenes de referencia/mascara, y `runOpenAIImageTool()` para Responses API multi-turn con `image_generation`.
- Fuente canonica: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

**⚠️ Reglas duras (canonical secret resolution, arch-architect verdict 2026-05-10)**:

- **NUNCA** componer `projects/{id}/secrets/{name}/versions/{ver}` inline en TS/JS. Toda resolución pasa por `resolveSecret()` / `resolveSecretByRef()` / `getCachedResolvedSecret()` en `src/lib/secrets/secret-manager.ts`. Inline composition es la causa raíz del bug class detectado en run 25634673015 (path inválido `<name>:latest/versions/latest` por doble suffix).
- **NUNCA** duplicar `normalizeSecretRef` ni `normalizeSecretRefValue` en scripts. `scripts/` puede importar directo del canónico — el archivo canónico NO tiene `import 'server-only'`, sin shim. Mirror duplicado se desincroniza inevitablemente (caso real: `scripts/pg-doctor.ts` consolidado a canónico 2026-05-10 después de detectar bug por mirror divergente).
- **SIEMPRE** soportar tres formas de `*_SECRET_REF` en consumers (el normalizador canónico las acepta):
  - `<name>` (bare, default `latest`)
  - `<name>:<version>` (shorthand Vercel display + gcloud convention)
  - `projects/.../versions/<version>` (full path)
- **PREFERIR** la forma bare `<name>` en workflows YAML committeados. La shorthand `<name>:latest` es para humanos copiando del UI Vercel/gcloud — no para configuración estática (defense-in-depth: no normalizar garbage si no hace falta).

**⚠️ Reglas duras V2 (TASK-870 — normalizer hardening + active drift detection 2026-05-12)**:

- **NUNCA** registrar un env var `*_SECRET_REF` desde shell usando `echo "valor" | vercel env add` ni equivalentes que appendean newline. Usar siempre `printf %s "<valor>" | vercel env add <NAME> production --force` para escritura atómica sin newline trailing (`--force` overwrite es atomic; rm+add tiene gap-window).
- **NUNCA** duplicar la lógica `stripEnvVarContamination` ni `SECRET_REF_SHAPE` regex en scripts/consumers. Toda higiene de env var values pasa por `normalizeSecretValue` / `normalizeSecretRefValue` en `src/lib/secrets/secret-manager.ts`. Para auditores externos, usar el predicate `isCanonicalSecretRefShape(value)` exportado del mismo módulo.
- **NUNCA** loggear el VALOR sanitizado de un `*_SECRET_REF` rechazado por shape validation (puede contener PII, tokens, leak info). Solo length + first/last char class si se requiere observability local. El reliability signal `secrets.env_ref_format_drift` reporta NOMBRES de env vars afectadas, no valores.
- **NUNCA** swallow Sentry capture en code paths donde `resolveSecretByRef` retornó null. Diferenciar:
  - `resolveSecretByRef` → null = **ref env var corrupto o secret no existe**. Degradar silente a fallback (PAT / cache / unconfigured). NO capturar a Sentry — el reliability signal `secrets.env_ref_format_drift` ya cubre detección upstream.
  - Secret resuelto pero CONTENIDO inválido (e.g. PEM sin `-----BEGIN`) = **falla real de configuración del secret content**. Throw + `captureWithDomain('<domain>', ...)` legítimo, requiere intervención humana.
- **SIEMPRE** que emerja un consumer nuevo de `resolveSecretByRef`, aplicar el patrón canónico de TASK-870: validar return value, diferenciar "ref corruption" (silent degrade) de "content corruption" (Sentry alert). Patrón fuente: `src/lib/release/github-app-token-resolver.ts` (líneas 174-195).
- **Reliability signal canónico** `secrets.env_ref_format_drift` (kind=drift, severity=error si count>0, subsystem `cloud`, steady=0). Detecta env vars `*_SECRET_REF` cuyo valor falla `isCanonicalSecretRefShape` post-strip. Cuando alerta: re-set la env var ofensora con `printf %s "<clean-value>" | vercel env add <NAME> production --force` + redeploy.
- **Bug class canonizada (2026-05-12)**: `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` quedó persistida en Vercel production como `"greenhouse-github-app-private-key\n"` (bytes hex `... 6b 65 79 5c 6e 22`). El normalizer legacy NO stripaba quotes envolventes (solo `\n`/`\r` literales + `.trim()`) → resource name resultante con quotes embebidos → GCP NOT_FOUND silencioso → `resolveGithubAppInstallationToken` lanzaba "is not valid PEM" + `captureWithDomain` cada ~3min → preflight check `sentry_critical_issues` bloqueaba production release orchestrator. Fix V2: `stripEnvVarContamination` single-source-of-truth + `SECRET_REF_SHAPE` regex en boundary + signal `secrets.env_ref_format_drift` upstream + resolver `github-app-token` diferencia ref/content corruption.

### GitHub Actions workflows — pnpm + Node setup ordering

**⚠️ Reglas duras (canonical workflow setup ordering, arch-architect verdict 2026-05-10)**:

- **SIEMPRE** invocar `pnpm/action-setup@v6` ANTES que `actions/setup-node@v5` en cualquier workflow `.github/workflows/*.yml` que use ambos. Order inverso (Node antes que pnpm) hace que `setup-node@v5` falle con `Unable to locate executable file: pnpm` cuando `cache: 'pnpm'` esta activo. Detectado live 2026-05-10 con 3 fallos consecutivos del watchdog scheduled (runs 25632589166, 25634395735, 25635607342) hasta que se consolido al patron canonico.
- **NUNCA** especificar `version:` en `pnpm/action-setup@v6`. Heredamos del campo `packageManager` en `package.json` (Corepack canonical, single source of truth desde 2026-05-10). Specificar `version:` aqui re-introduce drift del que ya nos quemamos.
- **SIEMPRE** usar `cache: 'pnpm'` en `actions/setup-node@v5` para reusar el pnpm store entre runs (acelera install ~30%). Requiere que pnpm este ya en PATH (regla anterior).
- **PREFERIR** `node-version: '24'` en workflows nuevos (production deploy + CI). Node 20 esta deprecated en GH Actions runners (deprecation warning visible desde 2026 Q2; removal 2026-09-16). Workflows legacy con Node 20 que sigan corriendo OK no son urgentes pero migrar oportunamente.
- Patron canonico verbatim (replicado en `production-release.yml` Job 1, `ci.yml`, `design-contract.yml`, `playwright.yml`, `reliability-verify.yml`, `production-release-watchdog.yml`):

  ```yaml
  - name: Setup pnpm
    uses: pnpm/action-setup@v6
  - name: Setup Node 24
    uses: actions/setup-node@v5
    with:
      node-version: '24'
      cache: 'pnpm'
  - name: Install dependencies
    run: pnpm install --frozen-lockfile
  ```

- **CI gate sistemico** (TASK-855 V1.1, pendiente): `scripts/ci/workflow-pnpm-node-ordering-gate.mjs` parseara YAML de todos los workflows y validara ordering. Replica patron de `vercel-cron-async-critical-gate.mjs`. Hasta que aplique, esta regla es enforcement humano + code review.

## Key Docs

- `AGENTS.md` — reglas operativas completas, branching, deploy, coordinación, PostgreSQL access
- `DESIGN.md` — contrato visual compacto agent-facing en formato `@google/design.md`; leerlo cuando el cambio toque UI, UX, tipografía, color, spacing o selección de componentes. **CI gate activo** (TASK-764): `.github/workflows/design-contract.yml` corre `pnpm design:lint --format json` strict (errors + warnings block) en cada PR que toca DESIGN.md / V1 spec / package.json. Agregar/modificar tokens requiere actualizar también el contrato de componente que los referencia (anti-bandaid: NO namespace `palette.*`). Validar local con `pnpm design:lint` antes de commitear.

### Efeonce brand assets (SSOT `src/config/efeonce-brand.ts`)

Hechos de marca canónicos — NO hardcodear en otro lado, importar del SSOT. Documentados también en `DESIGN.md` (sección "Brand assets — Efeonce").

- **Arquitectura de marca — Efeonce (paraguas) vs Greenhouse (plataforma)**: **EFEONCE** es la marca paraguas/institucional; **Greenhouse** es la plataforma/app de Efeonce. Los dos logos **coexisten** (no intercambiables): logo **Greenhouse** en todo lo de la **app** (navegación, dashboards, surfaces in-app); logo + eslogan **Efeonce** en lo **institucional/externo** (recibos/comprobantes, reportes, finiquitos, contratos, emails transaccionales, PDFs institucionales). Un documento institucional lleva marca **Efeonce**, no Greenhouse.
- **URL pública**: `efeoncepro.com` (`EFEONCE_URL`). Ya usada en el footer del PDF de payroll + emails transaccionales.
- **Dirección legal (fallback)**: `Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile` (`EFEONCE_LEGAL_ADDRESS_FALLBACK`). Preferir el `legalAddress` de la operating entity runtime (`getOperatingEntityIdentity()`); el constante es fallback.
- **Entidad legal (fallback)**: `Efeonce Group SpA` (`EFEONCE_LEGAL_NAME_FALLBACK`).
- **Eslogan "Empower your Growth"** — elemento de **brand-zone** (header/masthead), **NUNCA** el footer legal. Tipografía Poppins: `Empower` = ExtraBold Italic (800 italic), `your` = ExtraBold (800), `Growth` = Black Italic (900 italic). **Color canónico gris `#848484`** (= token `text-disabled`; `EFEONCE_SLOGAN_COLOR` en el SSOT, es el default de ambos componentes — override solo sobre fondo oscuro). Fuentes en `src/assets/fonts/Poppins-{ExtraBold,ExtraBoldItalic,Black,BlackItalic}.ttf` (Google Fonts v24 Latin, SIL OFL 1.1), registradas en `src/lib/finance/pdf/register-fonts.ts`. Render canónico: web `src/components/greenhouse/brand/EfeonceSlogan.tsx`, PDF `src/lib/finance/pdf/efeonce-slogan-pdf.tsx` — NUNCA re-implementar inline.
  - **Logo y eslogan son elementos SEPARADOS** — se usan solos o compuestos, **nunca fusionados en un único asset**. En un lockup (logo + eslogan): el eslogan es **subordinado** (claramente más pequeño, NO compite ni iguala el ancho del logo) y va **centrado** debajo del logo con separación mínima. El **tamaño del eslogan es contextual** (depende del tamaño del logo en esa superficie) — elige un `fontSize` que lo mantenga visiblemente menor; NO hay un pt fijo (el reporte de contractors usa ~7.5pt contra logo ~116pt como ejemplo de la **proporción**, no como regla). Detalle en `DESIGN.md` → "Slogan".
- **Footer PDF reusable**: `src/lib/finance/pdf/efeonce-pdf-footer.tsx` (`EfeoncePdfFooter`) — footer institucional canónico de **todos** los PDFs Efeonce (entidad · RUT + dirección + `efeoncepro.com` + generado/página). Lleva **solo identidad legal/contacto**; el eslogan va en la brand-zone, no acá. PDFs nuevos reusan este footer, no rollean uno propio.
- `project_context.md` — estado vigente del repo, stack, decisiones y restricciones; leer primero su sección "Estado vigente para agentes"
- `Handoff.md` — cabina de mando activa: trabajo en curso, riesgos y próximos pasos
- `Handoff.archive.md` — caja negra histórica; usar para auditoría de resoluciones sin tratar entradas antiguas como contrato vigente
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` — regla canónica para navegar `project_context.md`, `Handoff.md` y `Handoff.archive.md` sin perder auditoría ni inflar el handoff activo
- `docs/tasks/README.md` — pipeline de tareas `TASK-###` y legacy `CODEX_TASK_*`
- `docs/issues/README.md` — pipeline de incidentes operativos `ISSUE-###`
- `docs/architecture/` — specs de arquitectura canónicas (30+ documentos)
- `docs/documentation/` — documentación funcional de la plataforma en lenguaje simple, organizada por dominio (identity, finance, hr, etc.). Cada documento enlaza a su spec técnica en `docs/architecture/`
- `docs/manual-de-uso/` — manuales prácticos por dominio para usar capacidades concretas del portal paso a paso, con permisos, cuidados y troubleshooting
- `docs/audits/` — auditorías técnicas y operativas reutilizables. Úsalas frecuentemente cuando trabajes una zona auditada, pero antes de confiar en ellas verifica si sus hallazgos siguen vigentes o si el sistema requiere una auditoría nueva/refresh.
- `docs/operations/` — modelos operativos (documentación, GitHub Project, data model, repo ecosystem)
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` — politica canonica de ADRs: cuando una decision requiere ADR, donde vive, lifecycle append-only y gate para tasks.
- `docs/architecture/DECISIONS_INDEX.md` — indice maestro de decisiones arquitectonicas aceptadas; buscar aqui antes de proponer o cambiar contratos compartidos.
- Fuente canónica para higiene y rotación segura de secretos:
  - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Fuente canónica para trabajo multi-agente (Claude + Codex en paralelo):
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` — incluye higiene de worktrees, `rebase --onto`, `force-push-with-lease`, CI como gate compartido, squash merge policy, background watcher pattern para auto-merge sin branch protection
- Fuente canonica para calidad de solucion:
  - `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — regla anti-parche: causa raiz, primitives canonicas, resiliencia, seguridad, escalabilidad y workaround solo temporal/documentado
- Convenciones de skills locales:
  - Claude: `.claude/skills/<skill-name>/SKILL.md` (convencion oficial vigente; existen skills legacy en `skill.md` minuscula)
  - Codex: `.codex/skills/<skill-name>/SKILL.md` (mayuscula)
- Mockups Greenhouse: invocar `greenhouse-mockup-builder` para cualquier mockup/prototipo visual. Por defecto deben ser rutas reales del portal con mock data tipada (`src/app/(dashboard)/.../mockup/page.tsx` + `src/views/greenhouse/.../mockup/*`), usando Vuexy/MUI wrappers y primitives del repo; no HTML/CSS aparte salvo pedido explicito de artefacto estatico.

## Skill obligatoria: greenhouse-finance-accounting-operator

**INVOCAR SIEMPRE** la skill `greenhouse-finance-accounting-operator` (ubicada en `.claude/skills/greenhouse-finance-accounting-operator/SKILL.md` + global `~/.claude/skills/`) ANTES de:

- Tocar cualquier módulo de **finanzas** (`/finance/*`, `src/lib/finance/`, `src/app/api/finance/*`, `greenhouse_finance.*` schema): bank, cash-out, cash-in, expenses, income, suppliers, payment_orders, reconciliation, account_balances, settlement_legs, OTB declaration.
- Tocar cualquier módulo de **costos / cost intelligence** (`src/lib/commercial-cost-attribution/`, `src/lib/finance/postgres-store-intelligence.ts`, member-period attribution, client_economics, labor allocation, CCA shareholder accounts, loaded cost models, ICO economics).
- Tocar cualquier flujo **fiscal/tributario** (Chile SII, DTE, IVA débito/crédito, F22/F29, retenciones honorarios 14.5%, gastos rechazados Art 21, Capital Propio Tributario, ProPyme/14A regime, gratificación legal, indemnización años servicio).
- Tocar cualquier flujo de **payments / treasury** (cashflow forecast, working capital, FX hedging, payment rails ACH/SEPA/SWIFT/PIX, factoring, invoice discounting, internal_transfers, fx_pnl_breakdown, account_balance materialization).
- Tocar **P&L / reporting / KPIs financieros** (revenue recognition ASC 606/IFRS 15, EBITDA quality, gross margin, contribution margin, unit economics CAC/LTV, variance analysis, budget vs actual, FP&A).
- Tocar **cierre mensual / period close / reconciliation** (trial balance, accruals, deferrals, bank rec, intercompany matching, audit trail).
- Tocar **internal controls / audit / compliance** (COSO, SOX, segregation of duties, materiality ISA 320, fraud detection, going concern, Ley 20.393 MPD, UAF reporting, gobierno corporativo).
- Tocar **economic_category** (TASK-768), **expense_payments_normalized** (TASK-766), **account_balances FX** (TASK-774), **OTB cascade** (TASK-703), **payment orders bank settlement** (TASK-765), **fx_pnl_breakdown** (TASK-699), **internal_account_number** (TASK-700).

**Triggers léxicos** que disparan la invocación: "audit", "audita", "P&L", "EBITDA", "cashflow", "balance", "cierre", "conciliación", "IVA", "DTE", "factura", "boleta", "honorarios", "gratificación", "indemnización", "SII", "F22", "F29", "PPM", "retención", "gasto rechazado", "leasing", "depreciación", "amortización", "provisión", "deferred", "accrual", "revenue recognition", "5 pasos", "ASC 606", "IFRS 15", "IFRS 16", "IAS 7", "COSO", "SOX", "segregation of duties", "materiality", "going concern", "fraud triangle", "Benford", "ABC costing", "throughput", "standard costing", "absorption", "direct costing", "variance", "DSO", "DPO", "DIO", "CCC", "working capital", "13-week forecast", "hedge", "forward", "natural hedging", "factoring", "supply chain finance", "letter of credit", "cost-plus", "value-based", "retainer", "fixed-fee", "T&M", "loaded cost", "utilization rate", "realization rate", "CAC", "LTV", "payback", "unit economics", "ROIC", "ROE", "FCF", "CFO", "EBIT", "NOPAT", "WACC", "due diligence", "transfer pricing", "TP", "MPD", "PEP", "lavado activos", "cohecho", "auditor externo", "CPA", "Big-4", "qualified opinion", "adverse opinion", "going concern", "restatement", "impairment", "fair value", "mark-to-market", "MTM", "hedge effectiveness", "OCI", "comprehensive income".

**Razón**: la skill combina IFRS / US GAAP / Chile NIIF / COSO / ISA / AICPA con runtime Greenhouse (helpers canónicos, VIEWs, reliability signals). Sin invocarla: alto riesgo de violar contratos canónicos (TASK-766/768/774/703), recomendar tratamientos contables incorrectos, perder material de framework, o no escalar a CPA/auditor cuando corresponde.

**Cuándo NO invocarla**: tareas de plumbing puramente técnico sin razonamiento contable (ej. "qué endpoint usa esta vista" → `greenhouse-backend`; "ajusta este chart de Apex" → `greenhouse-ux`). Si la pregunta combina técnico + contable, invocar AMBAS.

**Sinergia con otras skills**:

- Si toca **payroll** (cálculo nómina, AFP/Salud/SIS, indemnizaciones runtime): combinar con `greenhouse-payroll-auditor`.
- Si toca **HubSpot bridge** (CCA, products, deals): combinar con `hubspot-greenhouse-bridge`.
- Si toca **PostgreSQL** queries finance: combinar con `greenhouse-postgres`.
- Si toca **Cloud Run** ops-worker (reactive consumers finance, projection refresh): combinar con `greenhouse-cron-sync-ops`.

### Architecture Docs (los más críticos)

- `DECISIONS_INDEX.md` — indice maestro de ADRs y decisiones aceptadas
- `GREENHOUSE_ARCHITECTURE_V1.md` — documento maestro de arquitectura
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico 360
- `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato completo de Payroll
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PostgreSQL + BigQuery
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso (runtime/migrator/admin)
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — desacople de Notion/HubSpot
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — identidad y acceso (12/12 implementado)
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — modelo canónico de autorización: `routeGroups` + `authorizedViews` + entitlements capability-based + startup policy
- `GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo de eventos outbox
- `GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separación auth principal vs canonical identity
- `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` 🆕 — **SPEC RAÍZ del modelo económico Greenhouse** (2026-04-28). Modelo dimensional Provider × Tool × Member × Client × Period × Expense, full absorption costing, snapshots inmutables, overhead policies. Subordina parcialmente `GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` (modelo dimensional + period governance) y recontextualiza `GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` como V0. Programa de tasks: `TASK-710` (Tool Consumption Bridge), `TASK-711` (Member↔Tool UI), `TASK-712` (Tool Catalog), `TASK-713` (Period Closing). Roadmap por fases en §11.
- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance: P&L engine, dual-store, outbox, allocations
- `GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md` 🆕 — **modelo dimensional analítico/operativo separado de la taxonomía fiscal** (TASK-768): `economic_category` ortogonal a `expense_type`/`income_type`, clasificador automático con 10 reglas, diccionario extensible (`known_regulators` + `known_payroll_vendors`), defensa-en-profundidad de 5 capas, herramientas operativas (reclassify endpoints + manual queue + backfill), contrato downstream con TASK-178/710-713/080+/705/706. Cierra ISSUE-065
- `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — matriz canónica de monedas por dominio, FX policy, readiness contract, currency registry
- `GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerías disponibles, patrones de componentes
- `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — infraestructura de webhooks inbound/outbound
- `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — playbook de proyecciones reactivas + recovery
- `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` — business lines canónicas, BU comercial vs operativa, ICO by BU
- `GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely, conexión centralizada, ownership model
- `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person↔org: poblaciones A/B/C, grafos operativo vs estructural, assignment sync, session org context
- `GREENHOUSE_STAGING_ACCESS_V1.md` — acceso programático a Staging: SSO bypass, agent auth, `staging-request.mjs`, troubleshooting
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — API Platform (lanes ecosystem/app/event-control), Platform Health V1 contract (TASK-672) para preflight programático de agentes/MCP/Teams bot
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — Reliability Control Plane (registry de módulos, signals, severity rollup, AI Observer)

## Issue Lifecycle Protocol

Los issues documentan incidentes operativos detectados en runtime. Viven en `docs/issues/{open,resolved}/`.

### Al detectar un incidente

1. Crear `docs/issues/open/ISSUE-###-descripcion-breve.md` con la plantilla de `docs/issues/README.md`
2. Registrar en `docs/issues/README.md` tabla Open
3. Documentar: ambiente, síntoma, causa raíz, impacto, solución propuesta

### Al resolver un incidente

1. Mover archivo de `open/` a `resolved/`
2. Actualizar `docs/issues/README.md` — mover de Open a Resolved
3. Agregar fecha de resolución y verificación realizada

### Diferencia con Tasks

- **Tasks** (`TASK-###`) son trabajo planificado (features, hardening, refactors)
- **Issues** (`ISSUE-###`) son problemas encontrados en runtime (errores, fallos, degradación)
- Un issue puede generar una task si la solución requiere trabajo significativo

## Task Lifecycle Protocol

Todo agente que trabaje sobre una task del sistema debe gestionar su estado en el pipeline de tareas. Las tareas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

- **Tasks nuevas** usan `TASK-###`, nacen desde `docs/tasks/TASK_TEMPLATE.md` (plantilla copiable) y siguen el protocolo de `docs/tasks/TASK_PROCESS.md`.
- **Tasks existentes** — tanto `CODEX_TASK_*` como `TASK-###` ya creadas en el backlog — siguen vigentes con su formato original hasta su cierre.

### Al iniciar trabajo en una task

1. Mover el archivo de la task de `to-do/` a `in-progress/`
2. Cambiar `Lifecycle` dentro del markdown a `in-progress`
3. Verificar que carpeta y `Lifecycle` digan lo mismo
4. Actualizar `docs/tasks/README.md` — cambiar estado a `In Progress`
5. Registrar en `Handoff.md` qué task se está trabajando, rama y objetivo

### Al completar una task

1. Cambiar `Lifecycle` dentro del markdown a `complete`
2. Mover el archivo de `in-progress/` a `complete/`
3. Verificar que carpeta y `Lifecycle` digan lo mismo
4. Actualizar `docs/tasks/README.md` — mover entrada a sección `Complete` con resumen de lo implementado
5. Documentar en `Handoff.md` y `changelog.md`
6. Ejecutar el chequeo de impacto cruzado (ver abajo)

Regla dura:

- una task no está cerrada si el trabajo terminó pero el archivo sigue en `in-progress/`
- un agente no debe reportar "task completada" al usuario mientras `Lifecycle` siga en `in-progress`

### Chequeo de impacto cruzado (obligatorio al cerrar)

Después de completar implementación, escanear `docs/tasks/to-do/` buscando tasks que:

- **Referencien archivos que se modificaron** → actualizar su sección "Ya existe"
- **Declaren gaps que el trabajo acaba de cerrar** → marcar el gap como resuelto con fecha
- **Tengan supuestos que los cambios invaliden** → agregar nota delta con fecha y nuevo estado
- **Estén ahora completamente implementadas** → marcar para cierre y notificar al usuario

Regla: si una task ajena cambió de estado real (un gap se cerró, un supuesto cambió), agregar al inicio del archivo:

```markdown
## Delta YYYY-MM-DD

- [descripción del cambio] — cerrado por trabajo en [task que lo causó]
```

### Dependencias entre tasks

Cada task activa debe tener un bloque `## Dependencies & Impact` que declare:

- **Depende de:** qué tablas, schemas, o tasks deben existir antes
- **Impacta a:** qué otras tasks se verían afectadas si esta se completa
- **Archivos owned:** qué archivos son propiedad de esta task (para detectar impacto cruzado)

Cuando un agente modifica archivos listados como "owned" por otra task, debe revisar esa task y actualizar su estado si corresponde.

### Reclasificación de documentos

Si un archivo en `docs/tasks/` no es una task sino una spec de arquitectura o referencia:

- Moverlo a `docs/architecture/`
- Actualizar `docs/tasks/README.md` con nota de reclasificación
- Si tiene gaps operativos pendientes, crear una task derivada en `to-do/`

## Platform Documentation Protocol

La documentación funcional de la plataforma vive en `docs/documentation/` y explica cómo funciona cada módulo en lenguaje simple (no técnico). Su índice es `docs/documentation/README.md`.

### Estructura

```
docs/documentation/
  README.md                    # Índice general + links a docs técnicos
  identity/                    # Identidad, roles, acceso, seguridad
  admin-center/                # Admin Center, governance
  finance/                     # Módulo financiero
  hr/                          # HR, nómina, permisos
  people/                      # Personas, directorio, capacidad
  agency/                      # Agencia, operaciones, delivery
  delivery/                    # Entrega, ICO, proyectos
  ai-tooling/                  # Herramientas IA, licencias
  client-portal/               # Portal cliente
```

### Cuándo crear o actualizar

- **Al completar una task** que cambie comportamiento visible de un módulo, verificar si existe documentación funcional del módulo afectado en `docs/documentation/`. Si existe, actualizarla. Si no existe y el cambio es significativo, considerar crearla.
- **Al cerrar un bloque de tasks** (como un hardening o una feature completa), crear el documento funcional del dominio si aún no existe.
- **Al modificar roles, permisos, menú o acceso**, actualizar `docs/documentation/identity/sistema-identidad-roles-acceso.md`.

### Convención de nombres

- **Archivos**: `dominio-del-tema.md` en kebab-case. Usar nombre sustantivo formal, no verbos ni preguntas.
  - Correcto: `sistema-identidad-roles-acceso.md`, `motor-ico-metricas-operativas.md`
  - Incorrecto: `como-funciona-identidad.md`, `que-es-el-ico-engine.md`
- **Títulos (h1)**: Nombre del sistema o módulo + alcance. Ej: `# Motor ICO — Metricas Operativas`
- **Subcarpetas**: por dominio (`identity/`, `delivery/`, `plataforma/`, etc.)

### Formato de cada documento

Cada documento debe incluir un encabezado con metadatos:

```markdown
> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** YYYY-MM-DD por [nombre o agente]
> **Ultima actualizacion:** YYYY-MM-DD por [nombre o agente]
> **Documentacion tecnica:** [link a spec de arquitectura]
```

Contenido:

- Lenguaje simple, sin jerga técnica
- Tablas y listas para información estructurada
- Al final de cada sección, un bloque `> Detalle técnico:` con links a la spec de arquitectura y al código fuente relevante
- No duplicar contenido de `docs/architecture/` — referenciar con links relativos

### Versionamiento

- Cada documento tiene un número de versión (`1.0`, `1.1`, `2.0`)
- Incrementar versión menor (1.0 → 1.1) al agregar o corregir secciones dentro del mismo alcance
- Incrementar versión mayor (1.x → 2.0) cuando cambie la estructura o el alcance del documento
- Registrar quién actualizó y la fecha en el encabezado
- No es necesario mantener historial de cambios dentro del documento — el git log es la fuente de verdad para el historial detallado

### Diferencia con docs de arquitectura

- `docs/architecture/` → contratos técnicos para agentes y desarrolladores (schemas, APIs, decisiones de diseño)
- `docs/documentation/` → explicaciones funcionales para entender cómo funciona la plataforma (roles, flujos, reglas de negocio)

## User Manual Protocol

Los manuales de uso viven en `docs/manual-de-uso/` y explican cómo operar una capacidad concreta del portal paso a paso. Su índice es `docs/manual-de-uso/README.md`.

### Cuándo crear o actualizar

- **Al completar una implementación visible** que agregue una feature, botón, panel, workflow o módulo que el usuario debe aprender a operar, revisar `docs/manual-de-uso/`.
- Si ya existe un manual para esa capacidad, actualizarlo.
- Si no existe y el flujo tiene pasos, permisos, estados, riesgos operativos o troubleshooting, crear uno.
- Si la feature solo cambia reglas internas sin cambio visible, normalmente basta con `docs/documentation/` o `docs/architecture/`.

### Estructura

```
docs/manual-de-uso/
  README.md
  finance/
  identity/
  admin-center/
  hr/
  agency/
  plataforma/
```

### Formato mínimo

Cada manual debe incluir:

- para qué sirve
- antes de empezar
- paso a paso
- qué significan los estados o señales
- qué no hacer
- problemas comunes
- referencias técnicas

Regla: escribir para el operador del portal, no para el implementador. El manual debe permitir usar la feature sin leer código.

### Heurística de acceso para agentes

Cuando una solución toque permisos, navegación, menú, Home, tabs, guards o surfaces por rol, pensar siempre en los planos de acceso de Greenhouse al mismo tiempo:

- `routeGroups` → acceso broad a workspaces o familias de rutas
- `views` / `authorizedViews` / `view_code` → surface visible, menú, tabs, page guards y proyección de UI
- `entitlements` / `capabilities` (`module + capability + action + scope`) → autorización fina y dirección canónica hacia adelante
- `startup policy` → contrato separado para entrypoint/Home; no mezclarlo con permisos

Regla: no diseñar una task o arquitectura nueva describiendo solo `views` si también hay autorización fina, y no describir solo `capabilities` si la feature además necesita una surface visible concreta.

## Conventions

### Estructura de código

- Componentes UI compartidos: `src/components/greenhouse/*`
- Vistas por módulo: `src/views/greenhouse/*`
- Lógica de dominio: `src/lib/*` (organizada por módulo: `payroll/`, `finance/`, `people/`, `agency/`, `sync/`, etc.)
- Tipos por dominio: `src/types/*`
- **Nomenclatura de producto + navegación**: `src/config/greenhouse-nomenclature.ts` (Pulse, Spaces, Ciclos, etc.)
- **Microcopy funcional shared (locale-aware)**: `src/lib/copy/` (TASK-265). API: `import { getMicrocopy } from '@/lib/copy'`. Namespaces: `actions` (CTAs), `states` (Activo/Pendiente), `loading` (Cargando…/Guardando…), `empty` (Sin datos/Sin resultados), `months`, `aria`, `errors`, `feedback`, `time`. NO duplicar texto que ya existe en `greenhouse-nomenclature.ts`.
- **Copy reutilizable por dominio**: `src/lib/copy/<domain>.ts` (por ejemplo `agency.ts`, `finance.ts`, `payroll.ts`). Si una pantalla de dominio necesita titulos, subtitulos, CTAs, estados, empty states, tooltips, labels, aria o mensajes reutilizables, extender este archivo antes de escribir literals en JSX.

### Microcopy / UI copy — regla canónica (TASK-265)

**ANTES de escribir cualquier string visible al usuario** (label, placeholder, helperText, title, alert, snackbar, empty state, error message, status label, loading text, aria-label, tooltip, KPI title), invocar la skill de UX writing/content vigente para validar tono (es-CL tuteo) y revisar si la string ya existe en alguna de estas capas:

1. `src/lib/copy/` — microcopy funcional shared (CTAs, estados, loading, empty, etc.)
2. `src/lib/copy/<domain>.ts` — copy reusable por dominio (`GH_AGENCY`, `GH_MRR_ARR_DASHBOARD`, `GH_PAYROLL_PROJECTED_ARIA`, etc.)
3. `src/config/greenhouse-nomenclature.ts` — product nomenclature + navegación + labels institucionales

**Enforcement mecánico**: ESLint rule `greenhouse/no-untokenized-copy` (modo `warn` durante TASK-265 + sweeps TASK-407/408; promueve a `error` al cierre TASK-408). Detecta aria-labels literales, status maps inline, loading strings, empty states, y secondary props (label/placeholder/etc) en JSX. Excluidos: theme files, global-error, public/**, emails/**, finance/pdf/**.

**Decision tree**:

- ¿Es product nomenclature (Pulse, Spaces, Ciclos, Mi Greenhouse) o navegación? → `greenhouse-nomenclature.ts`
- ¿Es microcopy funcional reusada en >3 surfaces (CTAs, estados, loading, empty, aria)? → `src/lib/copy/dictionaries/es-CL/<namespace>.ts`
- ¿Es copy reutilizable de una capability o pantalla de dominio? → `src/lib/copy/<domain>.ts`
- ¿Es copy único, efímero y no reutilizable? → puede vivir cerca del componente, pero no debe duplicar shared/domain copy ni cubrir CTAs, estados, empty states, errores, loading, aria o labels reutilizables.
- ¿La pantalla viene de `/mockup/` y pasa a runtime? → extraer shell runtime fuera de `/mockup/` y migrar el copy productivo a `src/lib/copy/*` antes de conectar datos reales.

### API Routes

- HR: `/api/hr/payroll/**`, `/api/hr/core/**`
- Finance: `/api/finance/**`
- People (read-only): `/api/people/**`
- Admin Team (writes): `/api/admin/team/**`
- Admin Tenants: `/api/admin/tenants/**`
- Capabilities: `/api/capabilities/**`
- Agency: `/api/agency/**`
- AI: `/api/ai-tools/**`, `/api/ai-credits/**`
- Cron: `/api/cron/**`, `/api/finance/economic-indicators/sync`
- Agent Auth: `/api/auth/agent-session` — sesión headless para agentes/Playwright (requiere `AGENT_AUTH_SECRET`)

### Canonical API error response contract (desde 2026-05-14)

Toda respuesta de error API que cruce al cliente **debe** usar el helper canónico `canonicalErrorResponse(code, options?)` desde `src/lib/api/canonical-error-response.ts`. Reemplaza el anti-patrón `NextResponse.json({ error: 'English prose' }, { status: N })` que generaba el bug class "string inglés crudo en UI es-CL" (caso real 2026-05-14: banner "Member identity not linked" surfacing literalmente al usuario via `payload?.error || 'fallback es-CL'` pattern en `/api/my/*` consumers). Complementario a TASK-878 (session-member-identity-self-heal): TASK-878 cierra la causa raíz (sesiones internas sin memberId), este contrato cierra la causa UX (string crudo) hasta que la self-heal converja.

**Shape canónico**:

```json
{
  "error": "Tu cuenta aún no está enlazada a un colaborador. Pídele a People Ops que active tu identidad.",
  "code": "member_identity_not_linked",
  "actionable": false
}
```

- `error`: prose es-CL canónico, safe para mostrar al usuario verbatim (backward compat con consumers legacy que leen `payload.error` directo).
- `code`: stable machine identifier (snake_case) del enum cerrado `CanonicalErrorCode`. Consumers nuevos lo usan para mapear a UX específico (CTA "Contactar HR" vs "Reintentar").
- `actionable`: hint binario. `true` cuando reintentar puede resolver (timeout, network blip); `false` cuando la causa es estructural (identity no enlazada, permiso revocado, configuración faltante). UI usa este flag para hide/show del botón "Reintentar".

**Consumer-side**: helper canónico `throwIfNotOk(res, fallbackMessage)` + clase `CanonicalApiError` en `src/lib/api/parse-error-response.ts`. Reemplaza el anti-patrón `throw new Error(payload?.error || 'fallback')`.

**⚠️ Reglas duras**:

- **NUNCA** retornar `NextResponse.json({ error: 'English prose' }, { status: N })` desde un route handler. Usar `canonicalErrorResponse(code, ...)`. Para nuevos error paths, extender el enum `CanonicalErrorCode` + agregar fila a `CANONICAL_ERRORS` (single source of truth).
- **NUNCA** poner prose en inglés en `error` (campo client-facing). Toda string debe ser es-CL canónico, ideal extraído de `src/lib/copy/*` (TASK-265).
- **NUNCA** poner detalle técnico (stack trace, SQL error, internal IDs, PII) en `error`. Eso va a `captureWithDomain` en Sentry, NO al cliente. Usar `redactErrorForResponse` cuando se necesite preservar parte del error original.
- **NUNCA** en el cliente: `throw new Error(payload?.error || 'fallback')`. El `payload?.error` puede venir en inglés desde un endpoint legacy. Usar `throwIfNotOk(res, fallbackEsCl)` que parsea canonical body y fallbackea al string es-CL local cuando el shape no es canónico.
- **NUNCA** mostrar botón "Reintentar" cuando `actionable=false`. Reintentar no resuelve causas estructurales (identity no enlazada, permiso revocado) — confunde al usuario y oculta la acción real (contactar HR/admin).
- **SIEMPRE** que un consumer UI maneje errores de un endpoint que pasa por canonical helper, propagar `actionable` + `code` al render para que la UI decida CTA correcto. Patrón: `error: { message, actionable, code }` state, render condicional según `actionable`.
- **SIEMPRE** que se introduzca un nuevo bloqueador estructural (e.g. `account_suspended`, `mfa_required`), extender `CanonicalErrorCode` enum + `CANONICAL_ERRORS` map. NO usar strings ad-hoc — rompe el contrato.

**Reliability signal canónico**: `identity.workforce.unlinked_internal_user` (kind=data_quality, severity warning si 1-3 / error si >3, steady=0). Detecta usuarios internos activos sin `member_id` enlazado — son los que verán el banner `member_identity_not_linked`. Cuando alerta, escalación es vía TASK-877 (workforce external identity reconciliation) o `workforce.member.complete_intake` endpoint (TASK-872 Slice 5).

**Spec canónica**: helper en `src/lib/api/canonical-error-response.ts`; cliente parser en `src/lib/api/parse-error-response.ts`; reader del signal en `src/lib/reliability/queries/workforce-unlinked-internal-users.ts`.

### Auth en server components / layouts / pages — patrón canónico

- **NUNCA** llamar `getServerAuthSession()` directo desde un layout o page con `try/catch + redirect` ad hoc. Usar siempre los helpers canónicos de `src/lib/auth/require-server-session.ts`:
  - `requireServerSession(redirectTo = '/login')` — para layouts/pages que **requieren** sesión activa. Si no hay session, redirige; si hay, devuelve `Session` non-null.
  - `getOptionalServerSession()` — para pages que opcionalmente quieren saber si hay sesión (login, landing pública). Devuelve `Session | null`. La decisión de redirect queda al caller.
- **Razón**: ambos helpers detectan el `DYNAMIC_SERVER_USAGE` que Next.js lanza durante prerender (cuando NextAuth lee cookies/headers via SSG) y lo re-lanzan correctamente para que Next marque la ruta como dynamic — en lugar de loggearlo como `[X] getServerAuthSession failed:` que ensucia los logs de build y enmascara errores reales.
- **Combinar con `export const dynamic = 'force-dynamic'`** en cada page/layout que consuma sesión — evita que Next intente prerender la ruta en build phase.
- Patrón canónico:
  ```ts
  import { requireServerSession } from '@/lib/auth/require-server-session'

  export const dynamic = 'force-dynamic'

  const Layout = async ({ children }) => {
    const session = await requireServerSession()
    // session.user es non-null acá
    return <Providers session={session}>{children}</Providers>
  }
  ```
- API routes (`route.ts`) siguen usando `getServerAuthSession()` directo — no necesitan los wrappers porque las routes son siempre dynamic por default y el manejo de error es distinto (return 401 JSON, no redirect).

### Agent Auth (acceso headless para agentes y E2E)

Permite que agentes AI y tests E2E obtengan una sesión NextAuth válida sin login interactivo.

**Personas agente operativas:**

Usar siempre la persona agente de menor privilegio que represente el caso. `agent@greenhouse.efeonce.org` queda reservado para diagnóstico transversal, admin, permisos y smoke amplio; no debe ser el default para validar experiencias collaborator/client si existe una persona dedicada más limitada.

| Persona       | Email                                             | `user_id`                       | `tenant_type`      | Roles                                                 | Uso canónico                                                                 |
| ------------- | ------------------------------------------------- | ------------------------------- | ------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Superadmin    | `agent@greenhouse.efeonce.org`                    | `user-agent-e2e-001`            | `efeonce_internal` | `efeonce_admin` + `collaborator`                      | Admin, permisos, diagnóstico transversal, smoke amplio                       |
| Collaborator  | `agent-collaborator@greenhouse.efeonce.org`       | `user-agent-collaborator-001`   | `efeonce_internal` | `collaborator`                                       | `/my`, self-service, experiencia personal y validación sin privilegios admin |
| Client        | `agent-client@greenhouse.efeonce.org`             | `user-agent-client-001`         | `client`           | `client_executive` + `client_manager` + `client_specialist` | Portal cliente general, rutas `client`, dashboards y reporting client-facing |

Todas usan password `Gh-Agent-2026!` en modo credentials y están provisionadas por migraciones PostgreSQL:

- `20260405151705425_provision-agent-e2e-user.sql` — superadmin.
- `20260531020000000_task-954-agent-role-personas.sql` — collaborator y client.

La persona `agent-client@...` es compuesta para cobertura cliente general. No sirve para probar límites finos entre `client_executive`, `client_manager` y `client_specialist`; si una task requiere esos límites, crear personas separadas por rol antes de cerrar la validación.

**Flujo rápido:**

```bash
# 1. Con dev server corriendo en localhost:3000
curl -s -X POST http://localhost:3000/api/auth/agent-session \
  -H 'Content-Type: application/json' \
  -d '{"secret": "<AGENT_AUTH_SECRET>", "email": "agent@greenhouse.efeonce.org"}'
# → { ok, cookieName, cookieValue, userId, portalHomePath }

# 2. Playwright (genera .auth/storageState.json)
AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs

# 3. Usar una persona limitada cuando el rol importe
AGENT_AUTH_EMAIL=agent-collaborator@greenhouse.efeonce.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
```

**Variables de entorno:**

| Variable                      | Propósito                                                   | Requerida        |
| ----------------------------- | ----------------------------------------------------------- | ---------------- |
| `AGENT_AUTH_SECRET`           | Shared secret (`openssl rand -hex 32`)                      | Sí               |
| `AGENT_AUTH_EMAIL`            | Email del usuario (default: `agent@greenhouse.efeonce.org`) | Sí               |
| `AGENT_AUTH_PASSWORD`         | Password (`Gh-Agent-2026!`) — solo modo credentials         | Solo credentials |
| `AGENT_AUTH_ALLOW_PRODUCTION` | `true` para habilitar en prod (no recomendado)              | No               |

**Seguridad:**

- Sin `AGENT_AUTH_SECRET` → endpoint devuelve 404 (invisible)
- En production → 403 por defecto
- Comparación timing-safe con `crypto.timingSafeEqual`
- No crea usuarios — solo autentica emails que ya existen en PG

**Archivos clave:**

- Endpoint: `src/app/api/auth/agent-session/route.ts`
- Lookup PG-first: `getTenantAccessRecordForAgent()` en `src/lib/tenant/access.ts`
- Setup Playwright: `scripts/playwright-auth-setup.mjs`
- Spec técnica: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (sección Agent Auth)

### Playwright smoke navigation contract

- En `tests/e2e/smoke/*.spec.ts`, **NUNCA** usar `page.goto(...)` directo.
- Usar `gotoWithTransientRetries()` desde `tests/e2e/fixtures/auth.ts` para rutas que solo deben probar "no 5xx" o render/redirect tolerante.
- Usar `gotoAuthenticated()` cuando la ruta debe preservar sesion valida y fallar si cae en `/login`, `/signin`, `/auth/signin` o `/auth/access-denied`.
- No reemplazar este contrato con timeouts locales por spec. Los retries solo cubren errores transitorios de navegacion; HTTP `4xx/5xx`, redirects de auth indebidos y asserts funcionales deben fallar loud.
- Mantener verde `pnpm test scripts/lib/e2e-smoke-navigation-contract.test.ts`. Esa prueba existe para que otro agente no reintroduzca `page.goto` crudo en smoke specs.
- ADR canonico: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md#delta-2026-05-09--issue-073-follow-up-smoke-navigation-contract`.

### Staging requests programáticas (agentes y CI)

- Staging tiene **Vercel SSO Protection** activa — todo request sin bypass es redirigido a la SSO wall.
- **Comando canónico**: `pnpm staging:request <path>` — maneja bypass + auth + request en un solo paso.
- Ejemplos:
  ```bash
  pnpm staging:request /api/agency/operations
  pnpm staging:request /api/agency/operations --grep reactive
  pnpm staging:request POST /api/some/endpoint '{"key":"value"}'
  pnpm staging:request /api/agency/operations --pretty
  ```
- El script `scripts/staging-request.mjs` auto-fetch del bypass secret desde la Vercel API si no existe en `.env.local`.
- **NUNCA** hacer `curl` directo a la URL `.vercel.app` de staging sin bypass header.
- **NUNCA** crear `VERCEL_AUTOMATION_BYPASS_SECRET` manualmente en Vercel — es auto-gestionada.

### Teams Bot outbound smoke y mensajes manuales

- Greenhouse/Nexa debe enviar mensajes proactivos a Teams vía **Bot Framework Connector**. Microsoft Graph sirve para discovery/lectura, no como contrato principal de envío del bot.
- Secreto runtime: `greenhouse-teams-bot-client-credentials` en GCP Secret Manager, JSON `{ clientId, clientSecret, tenantId }`. Nunca loggear tokens ni `clientSecret`.
- OAuth: token desde `https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token` con scope `https://api.botframework.com/.default`.
- Delivery:
  - Resolver primero el `chatId`/conversation id exacto (`teams_notification_channels.recipient_chat_id`, conversation reference cache o Teams connector `_resolve_chat`).
  - Enviar `POST {serviceUrl}/v3/conversations/{encodeURIComponent(chatId)}/activities`.
  - Usar failover de service URL: `https://smba.trafficmanager.net/teams`, `/amer`, `/emea`, `/apac`.
- Para group chats con `@todos`, usar `textFormat: "xml"`, `<at>todos</at>` y mention entity con `mentioned.id = chatId`, `mentioned.name = "todos"`. El transcript puede mostrar `todos` sin arroba; si importa la notificación real, verificar en Teams.
- Para chats individuales ya instalados por usuario, **no crear 1:1 a ciegas con AAD Object ID**. Resolver el `oneOnOne` existente y postear ahí. El intento `members: [{ id: "29:<aadObjectId>" }]` puede fallar con `403 Failed to decrypt pairwise id` aunque el usuario exista.
- En 1:1 no hace falta mencionar al destinatario; Teams notifica el chat. Para smoke scripts locales con imports server-side, usar `npx tsx --require ./scripts/lib/server-only-shim.cjs ...`.
- Producto/UI: cualquier canal manual debe converger con Notification Hub / `TASK-716` (intent/outbox, preview, aprobación, idempotencia, retries, audit, delivery status y permisos `views` + `entitlements`), no con un textbox que postea directo a Teams.
- **Helper canónico ya existe para anuncios manuales vía TeamBot**:
  - comando: `pnpm teams:announce`
  - runbook: `docs/operations/manual-teams-announcements.md`
  - runtime: `src/lib/communications/manual-teams-announcements.ts`
  - destinos registrados: `src/config/manual-teams-announcements.ts`
  - guardrails: `--dry-run` primero, `--yes` para enviar, `--body-file` con párrafos separados por línea en blanco, CTA `https` obligatorio
  - para futuras peticiones del tipo "envía este mensaje por Greenhouse/TeamBot", reutilizar este helper antes de crear scripts temporales o usar el conector personal de Teams
- Chats verificados:
  - `EO Team`: `19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2`.
  - `Sky - Efeonce | Shared`: `19:bf42622ef7b44d139cd4659e8aa22e81@thread.v2`.
  - Mention real de Valentina Hoyos: `text = "<at>Valentina Hoyos</at>"`, `mentioned.id = "29:f60d5730-1aab-45ec-a435-45ffe8be6f54"`.
- Referencia de tono: el 2026-04-28 Nexa se presentó en `Sky - Efeonce | Shared` como AI Agent de Efeonce y anunció a Valentina Hoyos como `Content Lead` del Piloto Sky de mayo. Activity id: `1777411344948`. Mantener copy cálido, claro, con emojis moderados y enfoque de coordinación útil.

### Cloud Run ops-worker (crons reactivos + materialización)

- Servicio Cloud Run dedicado (`ops-worker`) en `us-east4` para crons reactivos del outbox y materialización de cost attribution.
- 3 Cloud Scheduler jobs: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`.
- Endpoint adicional: `POST /cost-attribution/materialize` — materializa `commercial_cost_attribution` + recomputa `client_economics`. Acepta `{year, month}` o vacío para bulk. Las VIEWs complejas (3 CTEs + LATERAL JOIN + exchange rates) que timeout en Vercel serverless corren aquí.
- SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`.
- Si el cambio toca `src/lib/sync/`, `src/lib/operations/`, `src/lib/commercial-cost-attribution/`, o `services/ops-worker/`, verificar build del worker.
- **ESM/CJS**: servicios Cloud Run que reutilicen `src/lib/` sin NextAuth shimean `next-auth`, providers y `bcryptjs` via esbuild `--alias`. Patrón en `services/ops-worker/Dockerfile`.
- **Deploy canónico via GitHub Actions** (`.github/workflows/ops-worker-deploy.yml`): trigger automático en `push` a `develop` o `main` que toque `services/ops-worker/**`. Trigger manual: `gh workflow run ops-worker-deploy.yml --ref <branch>` o desde la UI de Actions. El workflow autentica con WIF, corre `bash services/ops-worker/deploy.sh` (mismo script idempotente que upsertea Cloud Scheduler jobs), verifica `/health` y registra el commit. Confirmar deploy con `gh run list --workflow=ops-worker-deploy.yml --limit 1` o `gh run watch <run-id>`. **Manual local (`bash services/ops-worker/deploy.sh`) solo para hotfix puntual** con `gcloud` autenticado contra `efeonce-group`; el path canónico para que el deploy quede trazable es el workflow.
- Las rutas API Vercel (`/api/cron/outbox-react`, etc.) son fallback manual, no scheduladas.
- Run tracking: `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health.
- Fuente canónica: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5.

### Vercel cron classification + migration platform (TASK-775)

Toda decisión "dónde vive un cron" pasa por las **3 categorías canónicas** de `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`:

- **`async_critical`** — alimenta o consume pipeline async (outbox, projection, sync downstream) que QA/staging necesita. **Hosting canónico: Cloud Scheduler + ops-worker. NO Vercel cron.**
- **`prod_only`** — side effects que solo importan en producción real (compliance, GDPR cleanup, FX rates externos). Hosting Vercel cron OK.
- **`tooling`** — utilitarios para developers/QA/monitoreo (synthetic monitors, data quality probes). Hosting Vercel cron OK.

**Patrón de migración canónico** (cuando crees un cron nuevo o migres uno existente):

1. Lógica pura en `src/lib/<dominio>/<orchestrator>.ts` o `src/lib/cron-orchestrators/index.ts` — reusable desde Vercel route + Cloud Run.
2. Endpoint Cloud Run en `services/ops-worker/server.ts` via helper canónico `wrapCronHandler({ name, domain, run })` — centraliza `runId`, `captureWithDomain`, `redactErrorForResponse`, audit log, 502 sanitizado.
3. Cloud Scheduler job en `services/ops-worker/deploy.sh` con `upsert_scheduler_job` (idempotente).
4. Si era cron Vercel scheduled, eliminar entry de `vercel.json` (la route queda como fallback manual via curl + `CRON_SECRET`).
5. Sincronizar snapshot `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en **dos** lugares:
   - `src/lib/reliability/queries/cron-staging-drift.ts` (reader runtime)
   - `scripts/ci/vercel-cron-async-critical-gate.mjs` (CI gate)

**Defensas anti-regresión**:

- **Reliability signal `platform.cron.staging_drift`** (subsystem `Event Bus & Sync Infrastructure`): kind=`drift`, severity=`error` si count>0, steady=0. Lee `vercel.json`, matchea contra `ASYNC_CRITICAL_PATH_PATTERNS` (`outbox*`, `sync-*`, `*-publish`, `webhook-*`, `hubspot-*`, `entra-*`, `nubox-*`, `*-monitor`, `email-delivery-retry`, `reconciliation-auto-match`), verifica equivalente Cloud Scheduler, honra `KNOWN_NON_ASYNC_CRITICAL_PATHS` (`sync-previred` = prod_only legítimo) y override `// platform-cron-allowed: <reason>` adyacente al path en vercel.json.
- **CI gate `pnpm vercel-cron-gate`** (`.github/workflows/ci.yml` después de Lint, modo `--warn` durante TASK-775; promueve a strict tras estabilización). Falla CI si detecta async-critical sin equivalent.

**⚠️ Reglas duras**:

- **NUNCA** agregar a `vercel.json` un path que matchea pattern async-critical sin Cloud Scheduler equivalent. CI gate bloquea, reliability signal alerta. Si emerge un caso legítimo prod_only/tooling cuyo path matchea pattern, agregarlo a `KNOWN_NON_ASYNC_CRITICAL_PATHS` (en AMBOS readers) o usar override comment.
- **NUNCA** crear handler Cloud Run sin pasar por `wrapCronHandler`. Sin él, perdés runId estable, audit log consistente, captureWithDomain canónico, sanitización de error y 502 contract uniforme.
- **NUNCA** duplicar lógica de cron entre route Vercel y server.ts del ops-worker. Toda lógica vive en `src/lib/<...>/orchestrator.ts` y ambos endpoints la importan. Single source of truth.
- **NUNCA** sincronizar `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en uno solo de los dos lugares (reader + gate). Drift entre ambos = falsos positivos en CI o falsos negativos en runtime dashboard.
- **NUNCA** modificar pattern array en uno solo. Si emerge un nuevo pattern async-critical, agregarlo en AMBOS lugares con comentario justificando la categoría.
- Cuando se cree un cron nuevo, **categorizarlo PRIMERO** según las 3 categorías canónicas, luego elegir hosting. NO al revés.

**Spec canónica**: `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (categorías + decision tree + inventario).
**Helper canónico**: `services/ops-worker/cron-handler-wrapper.ts` (`wrapCronHandler`).
**Reader runtime**: `src/lib/reliability/queries/cron-staging-drift.ts`.
**CI gate**: `scripts/ci/vercel-cron-async-critical-gate.mjs`.

### Reliability dashboard hygiene — orphan archive, channel readiness, smoke lane bus, domain incidents

Cuatro patrones que evitan que el dashboard muestre falsos positivos o señales `awaiting_data` perpetuas.

#### 1. Orphan auto-archive en `projection_refresh_queue`

- `markRefreshFailed` (`src/lib/sync/refresh-queue.ts`) corre los `ENTITY_EXISTENCE_GUARDS` antes de rutear a `dead`. Si el `entity_id` no existe en su tabla canónica (e.g. `team_members.member_id`), la fila se marca `archived=TRUE` en el mismo UPDATE.
- Dashboard query filtra `WHERE COALESCE(archived, FALSE) = FALSE`. Cero ruido por test residue, deletes, snapshot drift.
- **Agregar un guard nuevo** = añadir entry al array `ENTITY_EXISTENCE_GUARDS` con `(entityType, errorMessagePattern, checkExists)`. Cheap (single PG lookup), runs solo al moment dead-routing.
- **NO borrar rows archived** — quedan para audit. Query `WHERE archived = TRUE` para ver el cleanup history.

#### 2. Channel provisioning_status en `teams_notification_channels`

- Tabla tiene `provisioning_status IN ('ready', 'pending_setup', 'configured_but_failing')`. `pending_setup` significa "config existe en PG pero secret no está en GCP Secret Manager" — sends se skipean silenciosamente, NO cuentan en el subsystem failure metric.
- Dashboard query Teams Notifications (en `get-operations-overview.ts`) filtra `NOT EXISTS` por `secret_ref` matching channels en `pending_setup`.
- **Provisionar un channel nuevo**: crear row con `provisioning_status='pending_setup'`, después subir el secret a GCP Secret Manager, después flip a `'ready'`. El dashboard nunca pinta warning durante el periodo de setup.

#### 3. Smoke lane runs vía `greenhouse_sync.smoke_lane_runs` (PG-backed)

- CI publica resultados Playwright vía `pnpm sync:smoke-lane <lane-key>` después de cada run (auto-resuelve `GITHUB_SHA`, `GITHUB_REF_NAME`, `GITHUB_RUN_ID`).
- Reader (`getFinanceSmokeLaneStatus` y similares) lee la última row por `lane_key`. Funciona desde Vercel runtime, Cloud Run, MCP — no más dependencia de filesystem local.
- **Lane keys canónicos**: `finance.web`, `delivery.web`, `identity.api`, etc. Stable, lowercase, dot-separated. Coinciden con expectations del registry.
- **Agregar nueva lane**: solo upsertear desde CI con un nuevo `lane_key`. El reader genérico se adapta sin migration.

#### 4. Sentry incident signals via `domain` tag (per-module)

- Wrapper canónico: `captureWithDomain(err, 'finance', { extra })` en `src/lib/observability/capture.ts`. Reemplaza `Sentry.captureException(err)` directo donde haya un dominio claro.
- Reader: `getCloudSentryIncidents(env, { domain: 'finance' })` filtra issues por `tags[domain]`. UN proyecto Sentry, MUCHOS tags — sin overhead de proyectos por dominio.
- Registry: cada `ReliabilityModuleDefinition` declara `incidentDomainTag` (`'finance'`, `'integrations.notion'`, etc.). `getReliabilityOverview` itera y produce un `incident` signal per module. Cierra el `expectedSignalKinds: ['incident']` gap para finance/delivery/integrations.notion sin per-domain Sentry projects.
- **Agregar un módulo nuevo**: añadir `incidentDomainTag: '<key>'` al registry + usar `captureWithDomain(err, '<key>', ...)` en code paths del módulo. Cero config Sentry-side adicional.

**⚠️ Reglas duras**:

- **NO** borrar rows de `projection_refresh_queue` por DELETE manual. Usar el orphan guard si es residue, o `requeueRefreshItem(queueId)` si es real fallo a recuperar.
- **NO** contar failed de `source_sync_runs WHERE source_system='teams_notification'` sin excluir `pending_setup` channels — re-introduce el ruido que la migration `20260426162205347` resolvió.
- **NO** leer Playwright results desde filesystem en runtime (Vercel/Cloud Run no tienen el archivo). Usar `greenhouse_sync.smoke_lane_runs`. El fallback fs queda solo para dev local.
- **NO** usar `Sentry.captureException()` directo en code paths con dominio claro — el tag `domain` no se setea y el módulo correspondiente NUNCA ve el incidente. Usar `captureWithDomain()`.

### Async observer liveness — heartbeat, no output freshness (TASK-937, desde 2026-05-26)

Cuando un proceso async produce un artefacto que también se **deduplica** (el AI Observer del RCP persiste `overview`/módulos solo si el fingerprint del snapshot cambió), su **liveness NO puede inferirse de la frescura de su output**. Una postura estable hace que el artefacto no se re-persista por días — eso es sano, no "apagado". El bug class (TASK-637/638 → TASK-937, detectado live 2026-05-26): el banner `/admin` gateaba "AI Observer no activo" sobre una observación `overview` fresca en ventana de 24h; con el portal estable el overview no se re-persistía (4 días) → banner falso, aunque el cron horario corría y Vertex respondía.

**El patrón canónico desacopla tres preguntas distintas que NO deben colapsarse en un booleano**:

| Pregunta | Fuente de verdad | NUNCA |
|---|---|---|
| ¿El proceso **corre**? | heartbeat append-only en `greenhouse_sync.source_sync_runs` | inferir de la frescura/presencia del output |
| ¿Está **sano**? | reliability signal que lee el heartbeat | medir solo "hay output reciente" |
| ¿Hay **artefacto fresco**? | el último artefacto (sin filtro de edad, con label "hace X") | esconderlo tras una ventana que se confunde con "apagado" |

**⚠️ Reglas duras**:

- **NUNCA** inferir la liveness de un observer/cron/proyección async desde la frescura de su output cuando ese output se deduplica. Liveness = heartbeat propio.
- **NUNCA** crear tabla de run-tracking nueva para un heartbeat. Reusar `source_sync_runs` con un `source_system` nuevo (precedentes: `reactive_worker`, `reliability_synthetic`, `reliability_ai_observer`). El `status` debe respetar el CHECK enum (`running|succeeded|failed|partial|cancelled`) — `skipped` NO existe; mapear "deshabilitado" a `cancelled` y "falló" a `failed`.
- **NUNCA** dejar que el heartbeat rompa el proceso principal. Va en wrapper boundary con `try/catch + warn` (non-blocking).
- **NUNCA** togglear off el `thinkingConfig:{thinkingBudget:0}` del AI Observer (`src/lib/reliability/ai/runner.ts`). `gemini-2.5-flash` corre con *thinking* ON por default y quema el `maxOutputTokens` → trunca el JSON estructurado (`unbalanced_or_truncated_json`). Con `responseSchema` (constrained decoding) + thinking apagado + budget adecuado, el JSON sale válido. Loggear `candidates[0].finishReason` para distinguir `MAX_TOKENS` (truncado por budget) de JSON malformado.
- **SIEMPRE** que un async path nuevo necesite "¿está vivo/sano?", shippear (a) heartbeat en `source_sync_runs`, (b) reliability signal que lo lee, (c) el reader del artefacto distingue `loading|empty|degraded|healthy_stable` sin colapsar en un estado ambiguo.

**Spec canónica**: `docs/tasks/complete/TASK-937-ai-observer-reliability-hardening.md`. Helpers: `src/lib/reliability/ai/ai-observer-run-tracker.ts` (heartbeat), `src/lib/reliability/queries/ai-observer-unhealthy.ts` (signal `reliability.ai_observer.unhealthy`, moduleKey `cloud`).

### Platform Health API Contract — preflight programático para agentes (TASK-672)

Contrato versionado `platform-health.v1` que un agente, MCP, Teams bot, cron de CI o cualquier app puede consultar antes de actuar. Compone Reliability Control Plane + Operations Overview + runtime checks + integration readiness + synthetic monitoring + webhook delivery + posture en una sola respuesta read-only con timeouts por fuente y degradación honesta.

- **Rutas**:
  - `GET /api/admin/platform-health` — admin lane (`requireAdminTenantContext`). Devuelve payload completo con evidencia y referencias.
  - `GET /api/platform/ecosystem/health` — lane ecosystem-facing (`runEcosystemReadRoute`). Devuelve summary redactado, sin evidence detail hasta que TASK-658 cierre el bridge `platform.health.detail`.
- **Composer**: `src/lib/platform-health/composer.ts`. Llama 7 sources en paralelo via `Promise.all` con `withSourceTimeout` per-source. Una fuente caída produce `degradedSources[]` + baja `confidence` — NUNCA un 5xx.
- **Helpers reusables NUEVOS**:
  - `src/lib/observability/redact.ts` (`redactSensitive`, `redactObjectStrings`, `redactErrorForResponse`) — strip de JWT/Bearer/GCP secret URI/DSN/email/query secret. **USAR ESTE helper** antes de persistir o devolver cualquier `last_error` o response body que cruce un boundary externo. NUNCA loggear `error.stack` directo.
  - `src/lib/platform-health/with-source-timeout.ts` — wrapper canónico `(produce, { source, timeoutMs }) → SourceResult<T>`. Reutilizable por TASK-657 (degraded modes) y cualquier otro reader que necesite timeout + fallback estructurado.
  - `src/lib/platform-health/safe-modes.ts` — deriva booleans `readSafe/writeSafe/deploySafe/backfillSafe/notifySafe/agentAutomationSafe`. Conservador: en duda → `false`.
  - `src/lib/platform-health/recommended-checks.ts` — catálogo declarativo de runbooks accionables filtrados por trigger.
  - `src/lib/platform-health/cache.ts` — TTL 30s in-process per audience.
- **Cómo lo usa un agente**: consultar `safeModes` + respetar las banderas tal cual vienen. Si `agentAutomationSafe=false`, escalar a humano. NO interpretar `degraded` como `healthy`.

**⚠️ Reglas duras**:

- **NO** crear endpoints paralelos de health en otros módulos. Si un nuevo módulo necesita exponer su salud, registrarlo en `RELIABILITY_REGISTRY` (con `incidentDomainTag` si tiene incidents Sentry) y el composer lo recoge automáticamente.
- **NO** exponer payload sin pasar por `redactSensitive` cuando contiene strings de error o de fuente externa.
- **NO** computar safe modes ni rollup en el cliente. Consumir las banderas tal como vienen del contrato.
- **NO** cachear el payload más de 30s del lado del cliente. El composer ya cachea in-process.
- **NO** depender de campos no documentados. Solo `contractVersion: "platform-health.v1"` garantiza shape estable.
- Tests: `pnpm test src/lib/platform-health src/lib/observability/redact` (47 tests cubren composer, safe-modes, redaction, with-source-timeout, recommended-checks).
- Spec: `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (sección Platform Health), doc funcional `docs/documentation/plataforma/platform-health-api.md`, OpenAPI `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` (schema `PlatformHealthV1`).

### Notion Integrations Registry — token ↔ servicio ↔ scope canónico (desde 2026-05-22)

Existen **3 integraciones Notion productivas/no-productivas** + **1 dedicada al sandbox demo**. Cada una mapea a un secret GCP distinto, la usa un consumer distinto y tiene un scope de acceso (qué teamspaces puede ver) estrictamente delimitado. Conectar la integración equivocada a un teamspace es una violación de aislamiento (root cause investigado 2026-05-22: el sandbox demo quedó compartido con *BigQuery Sync*; no hubo fuga porque el demo nunca se registró en el mirror BQ del sync, pero fue mina latente).

| Integración Notion | Secret GCP / env var | Consumer | Scope permitido | Entorno |
|---|---|---|---|---|
| **BigQuery Sync** | `notion-token` (2026-03-08) | Cloud Run `notion-bq-sync` (sync legacy Notion → BigQuery, daily 03:00 Santiago) | SOLO teamspaces productivos registrados en `space_notion_sources WHERE sync_enabled=TRUE` (Efeonce + Sky) | Productivo |
| **Greenhouse** | env `NOTION_TOKEN` (staging/dev) | Runtime no-productivo (`dev-greenhouse`, preview, local) | Efeonce + Sky (staging/dev) | **Staging/Dev** |
| **Greenhouse PRD** | `notion-integration-token-greenhouse-prd` (2026-05-21) → env `NOTION_TOKEN` | Runtime Vercel prod + `ops-worker` (re-fetch status transitions TASK-912 + writeback `[GH]` properties TASK-916) | Efeonce + Sky (productivo) | Producción |
| **(dedicada demo)** | `notion-integration-token-greenhouse-metrics-demo` (2026-05-19) → `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` | `ops-worker` compute/writeback demo (TASK-913) | **SOLO** teamspace `Demo Greenhouse` (`36339c2f-…`) | Sandbox demo |
| **Por cliente (scoped, TASK-998)** | `notion-integration-token-greenhouse-<slug>` → `space_notion_sources.notion_token_secret_ref` (ej. `notion-integration-token-greenhouse-berel`, 2026-06-03) | sync per-space (pendiente en `notion-bigquery`) + checklist onboarding | **SOLO** el teamspace de ESE cliente (el token ES el scope) | Producción (clientes nuevos) |

**⚠️ Reglas duras**:

- **NUNCA** conectar **BigQuery Sync** ni **Greenhouse PRD** al teamspace `Demo Greenhouse`. El demo se conecta **SOLO** a la integración dedicada demo (`notion-integration-token-greenhouse-metrics-demo`), con permisos restringidos exclusivamente a ese teamspace. Esa es la integración canónica del demo (TASK-913) — ni BigQuery Sync, ni Greenhouse, ni Greenhouse PRD.
- **NUNCA** conectar **BigQuery Sync** a un teamspace que no deba llegar a BigQuery. Su endpoint `/discover` enumera **TODO lo que la integración puede ver** vía Notion search, bypassando `space_notion_sources` por completo — cualquier teamspace compartido con esta integración es contaminación potencial de BQ con un solo `/discover` o un flip de `sync_enabled`.
- **NUNCA** usar la integración **Greenhouse** (staging/dev) en producción ni **Greenhouse PRD** en staging/dev. El sufijo `PRD` separa los entornos; cruzarlos rompe el aislamiento prod/staging.
- **NUNCA** flipear `sync_enabled=TRUE` para el space demo en `space_notion_sources`. Está sembrado `FALSE` (migración `20260519120713456`) y ausente del mirror BQ — doble defensa que evita que el sync legacy lo procese aunque BigQuery Sync tuviera acceso.
- **NUNCA** "conectar todas las integraciones por las dudas" al crear un teamspace/database nuevo en Notion. Conectar **solo** la integración cuyo dominio corresponde al propósito del teamspace.
- **NUNCA** usar el secret `notion-token` (BigQuery Sync) ni `notion-integration-token-greenhouse-prd` (Greenhouse PRD) como fuente del token del pipeline demo. El demo resuelve su token exclusivamente vía `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` ([notion-demo-client.ts](src/lib/notion-metrics/notion-demo-client.ts)).
- **SIEMPRE** que emerja una integración Notion nueva (e.g. otro cliente, otro pipeline), agregarla a este registry con su secret + consumer + scope + entorno antes del primer uso, y enumerar a qué teamspaces se le concede acceso.

**Verificación operador-side** (no es código — son settings de Notion): la lista de integraciones conectadas a un teamspace se ve en Notion → teamspace → Settings → Connections. Para auditar fuga a BQ: `bq query 'SELECT source_database_id, space_id, COUNT(*) FROM efeonce-group.notion_ops.raw_pages_snapshot GROUP BY 1,2'` — todo `source_database_id` debe pertenecer a Efeonce (`spc-c0cf6478-…`) o Sky (`spc-ae463d9f-…`); cualquier `36339c2f…` (demo) es fuga.

### Notion teamspace linking — token POR teamspace + cómo enumerar DBs (TASK-998, desde 2026-06-03)

Para vincular el teamspace Notion de un **cliente nuevo** (Berel, ANAM, …) a Greenhouse, el modelo canónico es **una integración interna scoped SOLO al teamspace de ese cliente**, cuyo token **es el scope**. La integración compartida `notion-token` (BigQuery Sync) queda **solo para Efeonce/Sky legacy** — los clientes nuevos NO se agregan a ella (aislamiento duro; mismo principio que el token dedicado del demo, TASK-913).

**Hechos verificados live (2026-06-03, Grupo Berel) — qué NO funciona para enumerar teamspaces**:

- **La API REST de Notion NO enumera teamspaces.** `GET /v1/teams` → `400 invalid_request_url` (no existe). `POST /v1/search` devuelve data_sources cuyo `parent` es `database_id`, no teamspace → el nombre del teamspace **no está en REST**. Las DBs de un teamspace **NO comparten prefijo de id** (Berel: Tareas/Proyectos/Sprints=`35c39c2f`, "Wiki de Berel"=`98239c2f`, "Content Hub"=`35f39c2f`) → cualquier heurístico de prefijo es **inválido**.
- **El MCP claude.ai (`notion-get-teams`) SÍ enumera** teamspaces por nombre — pero usa el **OAuth personal interactivo** del operador (dueño del workspace, ve todo) y **NO es runtime-available** (absent en headless/cron, CLAUDE.md). Sirve para que un **agente** obtenga IDs durante el onboarding, NUNCA como dependencia del runtime.
- **El Cloud Run `notion-bq-sync` v3.0.0 `/discover` devuelve config snapshot, no discovery en vivo.** No se puede usar para enumerar el teamspace de un cliente nuevo.

**El gate real NO es discovery — es el ACCESO de la integración.** El token compartido `notion-token` da `404 object_not_found` en las DBs de Berel porque la integración no tiene acceso a ese teamspace. Ningún camino (REST, MCP, Cloud Run) puede leer un teamspace que no esté compartido con su credencial — por diseño de seguridad.

**Modelo canónico — token-por-teamspace (el token ES el scope)**:

1. El operador crea en Notion una **integración interna** (Settings → Developers → New connection) scoped al teamspace del cliente (capacidades: Leer/Actualizar/Insertar contenido) + copia el token `ntn_…`. Ej. live: conexión **"Greenhouse - Berel"** sobre el teamspace `Grupo Berel` (`35c39c2f-…`).
2. En el **checklist de onboarding** (item `provision_notion_workspace`, NO el wizard de nacimiento — separación de concerns), el operador pega el token. `discoverNotionDatabasesForToken(token)` ([src/lib/client-onboarding/notion-token-connect.ts](src/lib/client-onboarding/notion-token-connect.ts)) hace `POST /v1/search` (filter data_source, Notion-Version `2026-03-11`) → como el token está acotado, devuelve **SOLO las DBs de ese cliente** (cero cross-tenant) → auto-clasifica Tareas/Proyectos/Sprints por título (tolerante a espacio final/acentos/mayúsculas vía `classifyNotionDatabaseTitle`) → sugiere los 3 ids; el operador confirma/ajusta.
3. Al confirmar: el token se guarda en **GCP Secret Manager** (`notion-integration-token-greenhouse-<slug>`, ej. `notion-integration-token-greenhouse-berel`) con `printf %s` (sin newline) + se persiste el **`*_SECRET_REF`** en `greenhouse_core.space_notion_sources.notion_token_secret_ref` (columna TASK-998). **NUNCA el token crudo en PG/logs/Notion.** `notion_token_secret_ref` NULL = usar el `notion-token` compartido legacy (Efeonce/Sky).

**⚠️ Reglas duras**:

- **NUNCA** enumerar teamspaces Notion con `/v1/search` crudo + heurística de prefijo de id. La API no enumera teamspaces; las DBs de un teamspace no comparten prefijo. Usar el **token scoped por cliente** (el token = el scope) + clasificación por título.
- **NUNCA** cablear el MCP claude.ai (`notion-get-teams`) a un backend (Cloud Run, Vercel, ops-worker). Es OAuth interactivo, absent en headless. Solo un agente lo usa para obtener IDs durante onboarding.
- **NUNCA** agregar un teamspace de cliente nuevo a la integración compartida `notion-token` (BigQuery Sync) "para que el discover lo vea". Rompe el aislamiento duro. Cada cliente nuevo = su propia integración scoped + su propio token.
- **NUNCA** persistir el token Notion crudo en `space_notion_sources`, PG, logs ni el payload de un evento. Solo el `*_SECRET_REF`. El token va a Secret Manager con `printf %s` (Secret Manager Hygiene).
- **NUNCA** vincular el teamspace en el **wizard de nacimiento** del cliente. El vínculo vive en el **checklist de provisioning** (nacimiento ≠ provisioning de tooling — separación de concerns TASK-992/997).
- **SIEMPRE** que un token Notion se pegue en texto plano (chat, form sin enmascarar), tratarlo como expuesto: guardarlo en Secret Manager + recomendar rotación. El campo del form debe ser `type=password`, el POST server-side directo, sin echo.
- **SIEMPRE** que emerja una integración Notion nueva de cliente, agregarla al **Notion Integrations Registry** (arriba) con secret + consumer + scope + entorno antes del primer uso.

**Teams channel linking (lado Teams del mismo checklist)**: el bot Graph (`greenhouse-teams-bot-client-credentials`) **YA puede** listar teams + canales con los permisos actuales — verificado live: `GET /v1.0/teams` (vio "Berel - Efeonce") + `GET /v1.0/teams/{id}/channels` (vio "Squad Berel"). Sin permisos Azure nuevos. (Los chats 1:1 `/v1.0/chats` requieren `Chat.ReadBasic.All`, no concedido — fuera de scope; los canales son el target del registry `teams_notification_channels`.) El reader self-serve reusa `src/lib/integrations/teams/bot-framework/token-cache.ts`.

**Sync end-to-end por cliente nuevo — RESUELTO (TASK-1000 + TASK-1003, 2026-06-04)**: el Cloud Run `notion-bq-sync` ya **resuelve el token POR space** (`notion_token_secret_ref` → Secret Manager; TASK-1000) Y **queryea el endpoint canónico `/v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** (TASK-1003, mata el deprecado `/v1/databases/{id}/query`). Un cliente nuevo registrado por el wizard (data_source ids + token scoped) con `sync_enabled=TRUE` drena nativo a diario. Verificado live con Grupo Berel (3/3 tables, token scoped). Ver §"Notion data_sources endpoint canónico (TASK-1003)" abajo.

### Notion data_sources endpoint canónico — extractor notion-bq-sync (TASK-1003, desde 2026-06-04)

El extractor `notion-bq-sync` (repo hermano `efeoncepro/notion-bigquery`, Cloud Run `us-central1`) queryea Notion **SIEMPRE por el endpoint canónico `POST /v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** (revisión live `00021-wkl`, flag `NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true`). El endpoint legacy `/v1/databases/{id}/query` (deprecado por Notion 2025-09-03) queda muerto.

- **Resolver runtime canónico** `resolve_data_source_id(configured_id)` (`main.py`): acepta AMBOS tipos de id por construcción — `GET /v1/data_sources/{id}`→200 (ya es data_source: Berel/clientes nuevos del wizard) o fallback `GET /v1/databases/{id}`→`data_sources[0].id` (Efeonce/Sky con database ids legacy en el BQ mirror). Multi-data-source (>1) → fail-fast (nunca adivinar). Hereda el token per-space (TASK-1000) vía `_notion_headers`. Cache estable por mapping.
- **`database_id` configurado se conserva como identidad** para snapshot/binding (`source_database_id`, `_resolve_space_context`); SOLO la URL de query usa el id resuelto. NO mezclar.
- **`in_trash` (no `archived`)**: bajo 2026-03-11 el campo page-level de borrado es `in_trash`. El write usa `page.get("in_trash", page.get("archived", False))` (safe ambas versiones; la columna BQ sigue `archived`). NO volver a `page.get("archived", False)` solo.
- **404 NO transitorio**: `_is_transient_sync_error` clasifica 4xx (salvo 429) como NO transitorio (mata el reintento 3x inútil). NO revertir a "cualquier RequestException → transient".

**⚠️ Reglas duras**:

- **NUNCA** reintroducir `/v1/databases/{id}/query` ni Notion-Version `2022-06-28` en el extractor. El endpoint legacy está deprecado; toda query nueva usa data_sources + 2026-03-11.
- **NUNCA** guardar parent database ids de un cliente nuevo para meterlo por el endpoint viejo (anti-patrón rechazado en TASK-1003; viola Solution Quality Contract). El resolver runtime maneja ambos id-types.
- **NUNCA** desplegar `notion-bq-sync` con `bash deploy.sh` a secas: usa `--env-vars-file`/`--set-secrets` (REPLACE) y borraría las vars per-space + el secret `GREENHOUSE_POSTGRES_PASSWORD` que viven manuales en la revisión (no en `.env.yaml`, que es gitignored). Deploy canónico: `gcloud run deploy notion-bq-sync --source --function=notion_bq_sync --update-env-vars=... --update-secrets=...` (MERGE, preserva per-space+PG+secrets). Re-aseverar explícitamente `NOTION_PER_SPACE_TOKEN_ENABLED=true` + `GREENHOUSE_POSTGRES_{INSTANCE_CONNECTION_NAME,DB,USER}` + ambos secrets.
- **NUNCA** flipear `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` ni bumpear `NOTION_VERSION` sin correr el gate de paridad `parity_check_task1003.py` (read-only, no escribe BQ) sobre Efeonce/Sky → PARIDAD TOTAL. Rollback <5 min: flag OFF + `gcloud run services update --update-env-vars` o traffic a revisión previa.
- **SIEMPRE** que emerja un cliente nuevo: el wizard guarda data_source ids + token scoped → con `sync_enabled=TRUE` sincroniza nativo, cero casos especiales (proceso idempotente/escalable, NO repetir el cutover por cliente).

**Spec canónica**: `docs/tasks/complete/TASK-1003-notion-bq-sync-data-sources-endpoint-migration.md`. Skill `notion-platform` §0 (estado canónico). Gate: `parity_check_task1003.py` (repo hermano).

### Notion sync canónico — Cloud Run + Cloud Scheduler (NO usar el script manual ni reintroducir un PG-projection separado)

**El daily Notion sync es un SOLO ciclo de DOS pasos en `ops-worker` Cloud Run**, schedulado por Cloud Scheduler. No hay otro path scheduled.

- **Trigger**: Cloud Scheduler `ops-notion-conformed-sync @ 20 7 * * * America/Santiago` → `POST /notion-conformed/sync` en ops-worker. Definido en `services/ops-worker/deploy.sh` (idempotente, re-run del deploy script lo upsertea).
- **Step 1 — `runNotionSyncOrchestration`**: notion_ops (BQ raw) → `greenhouse_conformed.delivery_*` (BQ). Si BQ conformed ya está fresh contra raw, hace skip ("Conformed sync already current; write skipped"). Esto NO es bug — es comportamiento intencional.
- **Step 2 — `syncBqConformedToPostgres` (UNCONDICIONAL)**: lee BQ `greenhouse_conformed.delivery_*` y escribe `greenhouse_delivery.{projects,tasks,sprints}` en PG vía `projectNotionDeliveryToPostgres`. **Este step DEBE correr siempre**, regardless del skip de Step 1, porque BQ puede estar fresh y PG stale (que es exactamente el bug que llevó 24 días sin detectar antes).

**⚠️ NO HACER**:

- NO mover el PG step adentro del path no-skip de Step 1. Antes vivía ahí (`runNotionConformedCycle` → bloque "Identity reconciliation — non-blocking tail step" precedente) y dejaba PG stale cuando BQ estaba current.
- NO crear un cron Vercel scheduled para `/api/cron/sync-conformed`. La ruta existe como fallback manual, pero el trigger automático canónico vive en Cloud Scheduler. Vercel cron es frágil para syncs largos (timeout 800s vs 60min Cloud Run, sin retry exponencial nativo, no co-located con Cloud SQL).
- NO depender del script manual `pnpm sync:source-runtime-projections` para escribir PG. Sirve para developer ad-hoc, NO para producción. Antes era el único path PG (24 días stale en abril 2026 = root cause del incidente que parió esta arquitectura).
- NO inyectar sentinels (`'sin nombre'`, `'⚠️ Sin título'`, etc.) en `*_name` columns. TASK-588 lo prohíbe vía CHECK constraints. NULL = unknown. Para mostrar fallback amigable usar el helper `displayTaskName/displayProjectName/displaySprintName` de `src/lib/delivery/task-display.ts` o el componente `<TaskNameLabel/ProjectNameLabel/SprintNameLabel>`.
- NO castear directo `Number(value)` para escribir BQ-formula columns a PG INTEGER (e.g. `days_late`). BQ formulas pueden devolver fraccionales (`0.117...`) y PG INT los rechaza. Usar `toInteger()` (con `Math.trunc`) que vive en `src/lib/sync/sync-bq-conformed-to-postgres.ts`.

**Helpers canónicos (orden de uso)**:

- `runNotionSyncOrchestration({ executionSource })` — wrapper completo BQ raw → conformed (solo lo invoca el endpoint Cloud Run y el endpoint admin manual).
- `syncBqConformedToPostgres({ syncRunId?, targetSpaceIds?, replaceMissingForSpaces? })` — drena BQ conformed → PG. Reusable desde cualquier admin endpoint o script de recovery. Default: todos los spaces activos, `replaceMissingForSpaces=true`.
- `projectNotionDeliveryToPostgres({ ... })` — primitiva más baja: UPSERT por `notion_*_id` directo a PG. Usado por `syncBqConformedToPostgres` y por la wiring inline dentro de `runNotionConformedCycle`. Idempotente, per-row, no table locks.

**Manual triggers / recovery**:

- Cloud Scheduler manual: `gcloud scheduler jobs run ops-notion-conformed-sync --location=us-east4 --project=efeonce-group`
- Admin endpoint Vercel (auth via agent session, sin cron secret): `POST /api/admin/integrations/notion/trigger-conformed-sync` — corre los 2 steps secuencialmente (`runNotionSyncOrchestration` + `syncBqConformedToPostgres`).
- Vercel cron `/api/cron/sync-conformed` (CRON_SECRET) — fallback histórico, queda activo pero no se debe usar como path principal.

**Kill-switch defensivo**: env var `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED=false` revierte el step PG dentro de `runNotionConformedCycle` sin requerir deploy. **NO** afecta el step PG del endpoint Cloud Run (que vive en `services/ops-worker/server.ts`), ese es UNCONDICIONAL.

**Defensas anti-tenant-cross-contamination** (Sky no rompe Efeonce ni viceversa):

- `replaceMissingForSpaces` filtra `WHERE space_id = ANY(targetSpaceIds)` — nunca toca rows fuera del cycle.
- UPSERT por `notion_*_id` (PK natural Notion) es idempotente y no depende del orden.
- Cascade de title `nombre_de_tarea` / `nombre_de_la_tarea` resuelve correctamente para ambos tenants (Efeonce usa la primera columna, Sky la segunda — verificado en vivo via Notion REST API + Notion MCP).

**Schema constraints relevantes**:

- BQ `delivery_*.{task_name,project_name,sprint_name}` están NULLABLE (alineado con TASK-588 PG decision). Helper `ensureDeliveryTitleColumnsNullable` en `sync-notion-conformed.ts` aplica `ALTER COLUMN ... DROP NOT NULL` idempotente al startup.
- PG `greenhouse_delivery.*` tiene CHECK constraints anti-sentinel desde TASK-588 (migration `20260424082917533_project-title-nullable-sentinel-cleanup.sql`). Cualquier sentinel string los va a rechazar.
- DB functions `greenhouse_delivery.{task,project,sprint}_display_name` (migration `20260426144105255`) producen el fallback display data-derived al READ time. Mirror exacto en TS via `src/lib/delivery/task-display.ts` (paridad regression-tested).

**Admin queue de hygiene**: `/admin/data-quality/notion-titles` lista las pages con `*_name IS NULL` agrupadas por space, con CTA "Editar en Notion" → page_url. Cuando el usuario edita el title en Notion, el next sync drena el cambio y la row sale del queue.

### Canonical task status vocabulary V1 — single source of truth cross-tenant (2026-05-18)

Toda comparación de `task_status` / `estado` en TS o SQL embebido **debe** pasar por el módulo canonical `src/lib/delivery/task-status-canonical.ts`. Single source of truth para los 11 estados V1 del lifecycle de tareas Greenhouse + alias map cubriendo Efeonce legacy + Sky legacy + English/accent variants.

**Módulo canonical**: `src/lib/delivery/task-status-canonical.ts` (NOT server-only — safe en client + server).

- `TASK_STATUS_CANONICAL` — 11 estados V1: `Sin empezar`, `Brief listo`, `Pendiente aprobación interna`, `En pausa`, `Bloqueado`, `En curso`, `Listo para revisión`, `Cambios solicitados`, `Aprobado`, `Cancelado`, `Archivado`.
- `TASK_STATUS_ALIASES` — frozen map: 11 canonical self-maps + 7 Efeonce legacy (`Listo→Aprobado`, `Cancelada→Cancelado`, `Archivadas→Archivado`, `Detenido→En pausa`, `Listo para diseñar→Brief listo`, `Pendiente Dir. Arte→Pendiente aprobación interna`, `Cambios Solicitados→Cambios solicitados` con S→s) + 3 Sky legacy (`Tomado→Brief listo`, `Pendiente→Pendiente aprobación interna`, `En feedback→Cambios solicitados`) + 8 English/accent variants (Done/Finalizado/Completado→Aprobado, Cancelled/Canceled→Cancelado, sin tilde, capital case, Backlog→Sin empezar, Archivada singular).
- `TASK_STATUS_GROUPS` — semantic groups: `BRIEFING`, `ACTIVE`, `BLOCKED`, `COMPLETED`, `EXCLUDED`, `READY_FOR_REVIEW`, `CLIENT_CHANGES`.

**Helpers puros** (client + server):

- `normalizeTaskStatus(raw)` → canonical V1 string o null.
- `isCanonicalStatus(raw, canonical)` → boolean predicate.
- `isCanonicalStatusInGroup(raw, group)` → boolean predicate.
- `allVariantsForCanonical(canonical)` → string[] con TODAS las variantes (legacy + canonical).
- `allVariantsForGroup(group)` → string[] expandido.

**SQL builders** (server-side):

- `taskStatusSql(canonical)` → `'A','B','C'` SQL-safe IN list para un canonical.
- `taskStatusGroupSql(group)` → group expandido con todas las variantes.
- `buildTaskStatusToCscPhaseSql(column)` → CASE WHEN canonical mapeando a CSC phase (briefing / produccion / revision_interna / cambios_cliente / aprobado / bloqueado / excluido / unknown).

**Pattern canónico**:

```ts
// TS predicate (client + server)
if (isCanonicalStatusInGroup(row.task_status, TASK_STATUS_GROUPS.COMPLETED)) { ... }

// SQL embebido (server)
const sql = `
  COUNTIF(task_status IN (${taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)})) AS done
`

// UNNEST(@param) pattern para BQ parameterized
const params = { completedStatuses: allVariantsForGroup(TASK_STATUS_GROUPS.COMPLETED) }
const sql = `COUNTIF(estado IN UNNEST(@completedStatuses)) AS done`
```

**⚠️ Reglas duras**:

- **NUNCA** hardcodear un literal de status en TS/SQL/BQ (`if (status === 'Cambios Solicitados')`, `WHERE estado = 'Listo'`, etc.). Toda comparación pasa por canonical helpers + constants.
- **NUNCA** comparar status con `===` contra un nombre canonical sin normalizar el lado raw antes. Pre-rename data tiene variantes case-mismatched (`'Cambios Solicitados'` capital S vs canonical `'Cambios solicitados'`) — la comparación directa falla silente. Usar `isCanonicalStatus(raw, canonical)` o `normalizeTaskStatus(raw)` primero.
- **NUNCA** modificar `TASK_STATUS_ALIASES` para REMOVER un legacy alias sin verificar que BQ/PG no tiene rows residuales con ese nombre. La eliminación es decisión coordinada cuando TASK-908 ship + 0% data en BQ con el nombre viejo.
- **NUNCA** agregar aliases para nombres custom de cliente nuevo. Si entra cliente con custom status names, **enforce canonical template L1** en Notion antes del onboarding (eso es lo escalable). Los aliases son SOLO para legacy transition window.
- **NUNCA** importar este módulo desde código que tenga `import 'server-only'` directive en un componente cliente — el módulo en sí NO es server-only (sin directive), pero los SQL builders solo tienen sentido server-side.
- **NUNCA** usar el output de `taskStatusGroupSql` / `taskStatusSql` en un endpoint que acepte user input para el group/canonical (potencial SQL injection). Los inputs DEBEN ser constants `TASK_STATUS_GROUPS.*` o `TASK_STATUS_CANONICAL.*`, no strings runtime.
- **SIEMPRE** que emerja un nuevo callsite que necesite comparar/filtrar status, usar canonical helpers. NO replicar inline arrays como `['Listo', 'Done', 'Finalizado', 'Completado']`.
- **SIEMPRE** que emerja un cliente nuevo con custom status names en Notion, NO agregar aliases. Migrar el template Notion del cliente al canonical V1 ANTES del onboarding. L1 universalización es la única solución escalable.

**Pattern fuente**: TASK-742 (single source of truth + frozen maps + helper canonical pattern). Migration path: Plan B (TASK-908) introduce `status_code` enum persistido en PG al boundary del sync — código matchea por código estable, no por nombre. Cuando shipee, los aliases legacy se eliminan en cleanup PR.

**Spec canónica**: commit `1525e51c` en `develop` 2026-05-18. Tests anti-regresión: 68 asserts en `src/lib/delivery/task-status-canonical.test.ts`.

### Notion delivery PG projection — robust integer cast + per-row resilience (2026-05-18)

`projectNotionDeliveryToPostgres` (`src/lib/sync/project-notion-delivery-to-postgres.ts`) es el writer canónico de `greenhouse_delivery.{projects,tasks,sprints}` PG desde BQ conformed. Toda INSERT de una columna INTEGER pasa por **SQL-boundary cast** + **per-row try/catch** + **Sentry diagnostic capture** + **result shape con skipped counters**. Defense in depth de 4 capas.

**Helpers canónicos** (`src/lib/sync/project-notion-delivery-to-postgres.ts`):

- `intArg(value)` → `sql\`(${value})::numeric::integer\``. Cast doble que acepta string (`"0.44"`), number (`0.44`), null, undefined → coerce a INTEGER truncando fraccional. Belt-and-suspenders con TS `toInteger` upstream.
- `arrayArg(value)` → `sql\`COALESCE(${value}::text[], ARRAY[]::text[])\``. Mirror del `intArg` pattern para ARRAY NOT NULL columns. BQ runtime puede devolver `null` para repeated-string properties sin valores (e.g. task sin Subtareas relation). PG ARRAY NOT NULL DEFAULT '{}' rechaza ese null. Helper coerce `null → []` en SQL boundary. Aplica a las 4 columnas ARRAY NOT NULL canónicas (`assignee_member_ids`, `project_source_ids`, `subtareas_ids`, `tarea_principal_ids`) + cualquier columna ARRAY NOT NULL futura.
- `summarizePgError(err)` → extrae `{message, code, position, column, constraint}` de un PG error sin row-level data.

**Pattern canónico per upsert helper**:

```typescript
for (const row of rows) {
  if (!row.entity_source_id) continue
  try {
    await sql`INSERT INTO greenhouse_delivery.X (...)
              VALUES (...,
                ${intArg(row.integer_col)},
                ${arrayArg(row.array_col)},
                ...)
              ON CONFLICT (...) DO UPDATE SET ...`.execute(db)
    written += 1
  } catch (err) {
    skipped += 1
    const summary = summarizePgError(err)
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'delivery_projection', entity: '<project|sprint|task>' },
      extra: { syncRunId, entityId: row.entity_source_id, ...summary }
    })
    if (failures.length < 20) failures.push({ entityType, entityId, error: summary })
  }
}
```

**Result shape canónico** (extendido a `ProjectNotionDeliveryToPostgresResult`):

- `projectsSkipped` / `sprintsSkipped` / `tasksSkipped` — real counters per entity (no capped).
- `failureSamples[]` — capped a 20 samples para audit payload bounded.

**Bug class disparadores (2026-05-18)**:

- **INTEGER NOT NULL** (commit `ca465ac0`): BQ formula columns emiten valores fraccionales como string `"0.44"`. El TS contract `<col>: number | null` PASSED tsc, pero runtime podía leak strings. PG INTEGER rechazaba con `invalid input syntax for type integer: "0.44"`. Solución: `intArg`.
- **ARRAY NOT NULL** (commit `550c0e67`): BQ devuelve `null` para repeated-string properties sin valores (e.g. task sin Subtareas). PG `ARRAY NOT NULL DEFAULT '{}'` rechaza con `null value in column "tarea_principal_ids" of relation "tasks" violates not-null constraint`. Detected en vivo durante Efeonce canonical rename cascade (1322 rows skipped en Step 1, Sentry alert JAVASCRIPT-NEXTJS-64). Solución: `arrayArg`.

Sin per-row try/catch, una sola row mala fallaba el batch entero. Sin diagnostic capture, RCA requería deep grep post-facto. La per-row resilience + diagnostic capture hicieron que el bug class ARRAY fuera SURFACEABLE inmediatamente (Sentry alert clara con `column: "tarea_principal_ids"`) sin bloquear la cascada (Step 2 UNCONDITIONAL drain bypaseó el bug y dejó PG canonical).

**Columnas protegidas actualmente**:

- INTEGER (10): `days_late`, `rescheduled_days`, `client_change_round_final`, `frame_versions`, `frame_comments`, `open_frame_comments`, `blocker_count`, `workflow_change_round`, `completed_tasks_count`, `total_tasks_count`.
- ARRAY NOT NULL (4): `assignee_member_ids`, `project_source_ids`, `subtareas_ids`, `tarea_principal_ids`.

Cualquier columna nueva (INTEGER o ARRAY NOT NULL) queda automáticamente protegida por la primitiva canonical cuando se envuelve con el helper apropiado.

**⚠️ Reglas duras**:

- **NUNCA** pasar una columna INTEGER a un INSERT sin envolver el valor en `intArg(...)`. Aunque el TS contract diga `number | null`, el runtime puede leak strings desde BQ formulas.
- **NUNCA** pasar una columna ARRAY NOT NULL a un INSERT sin envolver el valor en `arrayArg(...)`. Aunque el TS contract diga `string[] | null`, BQ runtime puede devolver `null` cuando la repeated property Notion no tiene valores.
- **NUNCA** envolver un upsert helper (`upsertProjects/Sprints/Tasks`) sin per-row try/catch. Resilience canónica: una row mala no debe bloquear el batch.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'delivery_projection', entity: '<project|sprint|task>' }, extra: { syncRunId, entityId, ...summary } })`.
- **NUNCA** loggear el row completo en el catch (puede contener PII). Solo `entityId` + `summarizePgError(err)` output (campos estructurales sin user data).
- **NUNCA** modificar el shape `ProjectNotionDeliveryToPostgresResult` removiendo campos. Adding-only es safe; removing rompe consumers.
- **SIEMPRE** que emerja una columna INTEGER nueva en el schema, agregarla al INSERT con `intArg(...)`. Lint rule no la enforce hoy — code review humano.
- **SIEMPRE** que emerja una columna ARRAY NOT NULL nueva en el schema, agregarla al INSERT con `arrayArg(...)`. Mismo enforcement humano.
- **SIEMPRE** que emerja un nuevo upsert helper (e.g. para `revisions` o cualquier delivery entity nueva), seguir el mismo pattern: try/catch + intArg + arrayArg + captureWithDomain + skipped/failures wiring.
- **SIEMPRE** caller del helper debe loggear `pgResult.{projectsSkipped, sprintsSkipped, tasksSkipped}` en cron summary line + first `failureSamples[0]` si totalSkipped > 0. Cron visibility canónica.

**Spec canónica**: commits `ca465ac0` (intArg + per-row resilience) + `550c0e67` (arrayArg) en `develop` 2026-05-18. Pattern fuente: TASK-742 7-layer auth resilience (per-row try/catch + diagnostic capture + Sentry domain), TASK-571/766/774 (VIEW canónica + helper + signal + lint).

### Cloud Run hubspot-greenhouse-integration (HubSpot write bridge + webhooks) — TASK-574

- Servicio Cloud Run Python/Flask en `us-central1` (NO `us-east4` — region bloqueada para preservar URL pública).
- Expone 23 rutas HTTP + webhook handler inbound. URL: `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app`.
- Ubicación canónica post TASK-574 (2026-04-24): `services/hubspot_greenhouse_integration/` en este monorepo. Antes vivía en el sibling `cesargrowth11/hubspot-bigquery`.
- Deploy: `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (WIF, pytest → Cloud Build → Cloud Run deploy → smoke `/health` + `/contract`).
- Manual: `ENV=staging|production bash services/hubspot_greenhouse_integration/deploy.sh`.
- 3 secretos: `hubspot-access-token`, `greenhouse-integration-api-token`, `hubspot-app-client-secret` (Secret Manager project `efeonce-group`).
- Si el cambio toca rutas del bridge, webhooks HubSpot inbound, o secretos → invocar skill `hubspot-greenhouse-bridge`.
- Consumer principal: `src/lib/integrations/hubspot-greenhouse-service.ts` (no cambia pre/post cutover — mismo contract HTTP).
- **Sibling `cesargrowth11/hubspot-bigquery` ya no es owner del bridge**: conserva solo el Cloud Function HubSpot→BigQuery (`main.py` + `greenhouse_bridge.py` batch bridge) + app HubSpot Developer Platform (`hsproject.json`).

### HubSpot inbound webhook — p_services (0-162) auto-sync (TASK-813)

Cuando alguien crea o actualiza un service en HubSpot custom object `p_services` (objectTypeId `0-162`), Greenhouse lo refleja automáticamente en `greenhouse_core.services` via webhook + handler canónico. Ningún sync manual ni cron requerido para el flow normal.

**Pipeline canónico (mismo patrón TASK-706 hubspot-companies)**:

1. **HubSpot Developer Portal** → suscripción a `p_services.creation`, `p_services.propertyChange`. Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services`. Signature method: v3.
2. **Endpoint genérico** `/api/webhooks/hubspot-services` recibe POST.
3. **Handler `hubspot-services`** (`src/lib/webhooks/handlers/hubspot-services.ts`) valida firma v3 (HMAC-SHA256, secret `HUBSPOT_APP_CLIENT_SECRET`, timestamp expiry < 5 min, timing-safe compare).
4. Extrae service IDs (subscriptionType `p_services.*`).
5. Batch read de service properties via `fetchServicesForCompany` helper (`src/lib/hubspot/list-services-for-company.ts`).
6. Per service: resuelve `hubspot_company_id` via association lookup, resuelve space en GH via `clients.hubspot_company_id`, UPSERT en `services`.
7. Outbox event `commercial.service_engagement.materialized` v1.
8. Failures individuales loggeadas en Sentry `domain='integrations.hubspot'`.

**Mapping unmapped pattern**: si `ef_linea_de_servicio` está NULL en HubSpot, la fila se materializa con `hubspot_sync_status='unmapped'`. Downstream consumers (P&L, ICO, attribution) **deben filtrar por** `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'` para excluir filas sin clasificación. Operador resuelve via Slice 7 UI (futuro).

**Backfill operacional** (one-shot post setup):

```bash
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces
```

Idempotente: re-correr es safe, UPSERT por `hubspot_service_id` UNIQUE.

**Helper canónico para escapar el bridge bug**: `src/lib/hubspot/list-services-for-company.ts` (`fetchServicesForCompany`, `batchReadServices`, `listServiceIdsForCompany`) llama HubSpot API directo via `HUBSPOT_ACCESS_TOKEN` env o secret `gcp:hubspot-access-token`. Bypass del bridge Cloud Run que usa `p_services` en URLs en lugar de `0-162` (HubSpot rechaza con 400 "Unable to infer object type"). Bridge fix queda como follow-up task separada.

**Reliability signals (subsystem `commercial`)**:

- `commercial.service_engagement.sync_lag` — kind=lag, severity=warning si count > 0. Cuenta services con `hubspot_service_id` poblado pero `hubspot_last_synced_at NULL` o > 24h. Detecta webhook caído o sync stale. Steady state = 0.
- `commercial.service_engagement.organization_unresolved` — kind=drift, severity=error si > 7 días. Cuenta `webhook_inbox_events.status='failed'` con `error_message LIKE 'organization_unresolved:%'` y antiguedad > 7d. Operador comercial resuelve creando client en Greenhouse o archivando service en HubSpot.
- `commercial.service_engagement.legacy_residual_reads` — kind=drift, severity=error si > 0. Cuenta filas archived (`status='legacy_seed_archived'`) que tienen `service_attribution_facts` con `created_at > services.updated_at` (consumer no respeta filtro). Steady state = 0.

**Hard rules**:

- **NUNCA** crear fila en `core.services` con `hubspot_service_id IS NULL` y `engagement_kind != 'discovery'`. Solo discovery legítimo + legacy_seed pueden carecer del bridge.
- **NUNCA** sincronizar Greenhouse → HubSpot `0-162`. Solo back-fill de propiedades `ef_*` (TASK-813 follow-up V1.1, default OFF).
- **NUNCA** matchear services por nombre (colisión real demostrada en audit 2026-05-06: SSilva tiene 3 services HubSpot vs 4 GH con naming distinto).
- **NUNCA** borrar las 30 filas legacy. Solo archivar (script `scripts/services/archive-legacy-seed.ts` con `--apply`).
- **NUNCA** invocar `Sentry.captureException` directo en code path commercial. Usar `captureWithDomain(err, 'integrations.hubspot', ...)`.
- **SIEMPRE** que un consumer Finance/Delivery necesite "el servicio del cliente X período Y", filtrar `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'`.

### HubSpot Service Pipeline lifecycle invariants (TASK-836)

`upsertServiceFromHubSpot()` consume el mapper canónico `service-lifecycle-mapper.ts` y la cascade canónica `engagement-kind-cascade.ts` para resolver `pipeline_stage|status|active|engagement_kind` desde HubSpot. Reemplaza el hardcode que tratba a TODOS los services como `active`.

**HubSpot Service Pipeline (`0-162`) stage IDs canónicos** (verificados 2026-05-09 + stage validation creada):

| Greenhouse pipeline_stage | HubSpot label | HubSpot stage ID | Active | Status |
|---|---|---|---|---|
| `validation` | Validación / Sample Sprint | `1357763256` | TRUE | active |
| `onboarding` | Onboarding | `8e2b21d0-7a90-4968-8f8c-a8525cc49c70` | TRUE | active |
| `active` | Activo | `600b692d-a3fe-4052-9cd7-278b134d7941` | TRUE | active |
| `renewal_pending` | En renovación | `de53e7d9-6b57-4701-b576-92de01c9ed65` | TRUE | active |
| `renewed` | Renovado | `1324827222` | TRUE | active (transitorio) |
| `closed` | Closed | `1324827223` | FALSE | closed |
| `paused` | Pausado | `1324827224` | FALSE | paused |

**Property HubSpot canónica** (creada 2026-05-09 vía API):
- internal name: `ef_engagement_kind` (label visible: `Tipo de servicio`)
- type: `enumeration` / fieldType: `select`
- options: `regular|pilot|trial|poc|discovery` (labels: Contratado/Piloto/Trial/POC/Discovery)

**Outbox event canónico granular**:
- `commercial.service_engagement.lifecycle_changed v1` emitido SOLO cuando hay diff real en `pipeline_stage|active|status|engagement_kind`. Refresh idempotente sin diff NO emite.
- `commercial.service_engagement.materialized v1` (TASK-813) sigue emitiéndose en cada UPSERT — son complementarios.

**4 reliability signals nuevos bajo subsystem `commercial`**:
- `commercial.service_engagement.lifecycle_stage_unknown` (kind=drift, severity=error si > 0).
- `commercial.service_engagement.engagement_kind_unmapped` (kind=drift, severity=warning).
- `commercial.service_engagement.renewed_stuck` (kind=drift, severity=warning si > 60 días).
- `commercial.service_engagement.lineage_orphan` (kind=data_quality, severity=error).

**Schema delta** (migration `20260509125228920`):
- CHECK `pipeline_stage` extendido con `'validation'`.
- CHECK structural a `status` (`active|closed|paused|legacy_seed_archived`).
- CHECK structural a `hubspot_sync_status` (`pending|synced|unmapped`).
- Columna `unmapped_reason TEXT NULL` con CHECK enum cerrado (`unknown_pipeline_stage|missing_classification`).
- Columna `parent_service_id TEXT NULL` FK self con `ON DELETE RESTRICT`.
- Trigger `services_lineage_protection_trigger` (BEFORE INSERT OR UPDATE).

**⚠️ Reglas duras**:

- **NUNCA** hardcodear `pipeline_stage='active'`, `status='active'` ni `active=TRUE` en INSERT/UPDATE de `services` cuando la fuente es HubSpot. Toda mutación pasa por el mapper canónico.
- **NUNCA** depender del label visible HubSpot (`Tipo de servicio`, `Activo`, `Closed`, etc.) en código. Solo internal names + stage IDs. Labels son traducibles y mutables.
- **NUNCA** sobrescribir `engagement_kind` con NULL desde un UPSERT inbound. La cascade canónica preserva PG cuando HubSpot devuelve NULL (casos 3-4 de la cascade).
- **NUNCA** asumir un default de `engagement_kind` para services nuevos en stage `validation`. Sin clasificación explícita, queda `unmapped` y reliability signal alerta.
- **NUNCA** crear servicio con `engagement_kind='regular'` AND `parent_service_id IS NOT NULL` cuyo parent tenga `engagement_kind='regular'`. Trigger PG lo bloquea; signal `lineage_orphan` lo detecta defense-in-depth.
- **NUNCA** mutar `pipeline_stage`, `status` o `active` directo via SQL en producción. Toda mutación pasa por `upsertServiceFromHubSpot()` o revert canónico via outbox.
- **NUNCA** filtrar "servicios operativos del periodo" con `WHERE pipeline_stage = 'active'` solo. `renewed` y `renewal_pending` también son operativos. Usar `WHERE active=TRUE` o whitelist explícita.
- **NUNCA** promover unilateralmente desde Greenhouse `pipeline_stage='renewed'` a `'active'`. HubSpot es source of truth de stage; signal `renewed_stuck` escala drift.
- **NUNCA** agregar stage HubSpot nuevo sin extender el mapper + agregar tests + actualizar `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`. Default unknown stage al fail-safe `unmapped`, NUNCA a `active`.
- **NUNCA** ejecutar backfill sin pre/post snapshot documentado y plan de revert via outbox `lifecycle_changed`.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'commercial', ...)`.
- **SIEMPRE** que ocurra una transición de `pipeline_stage`, `active`, `status` o `engagement_kind`, emitir `commercial.service_engagement.lifecycle_changed v1` en la misma transacción. Refresh idempotente sin diff NO emite.
- **SIEMPRE** validar `engagement_kind` contra el enum cerrado `regular|pilot|trial|poc|discovery`. Valores fuera del enum → `hubspot_sync_status='unmapped'` + `unmapped_reason='missing_classification'`, NUNCA cast silencioso.
- **SIEMPRE** que un Sample Sprint convierta a service regular, el child hereda `parent_service_id` apuntando al Sample Sprint padre. Trigger enforce; signal `lineage_orphan` defense-in-depth.

### HubSpot webhook events — dual-format invariant (TASK-836 follow-up)

HubSpot Developer Platform 2025.2 cambió el shape del payload de webhooks. **Ambos formatos coexisten** y el handler debe soportar ambos via clasificador canónico — NUNCA branch por prefix de `subscriptionType` solo.

| Format | `subscriptionType` | Discriminador |
|---|---|---|
| Legacy (apps OAuth tradicionales) | `company.creation`, `contact.propertyChange`, `service.creation`, `p_services.creation`, `0-162.creation` | Single field encapsula objeto + acción |
| Developer Platform 2025.2 (Build #24+, deploy 2026-05-06) | `object.creation`, `object.propertyChange` (genérico) | `objectTypeId` separate (`0-1` contact, `0-2` company, `0-162` service) o `objectType` (`contact`, `company`, `service`, `p_services`) |

**Helper canónico** — `classifyHubSpotEvent(event) → 'company' | 'contact' | 'service' | 'unknown'`:

- En `src/lib/webhooks/handlers/hubspot-companies.ts` (TASK-706 handler — companies + contacts intake)
- En `src/lib/webhooks/handlers/hubspot-services.ts` (TASK-813 handler — p_services intake) — equivalente `isHubSpotServiceEvent`

**⚠️ Reglas duras**:

- **NUNCA** filtrar events con `subscriptionType.startsWith('company.')` / `startsWith('p_services.')` / equivalentes solo. **DEBE** pasar por `classifyHubSpotEvent()` o `isHubSpotServiceEvent()`. Lint manual durante review — la regresión silente del 2026-05-06 es la prueba.
- **NUNCA** asumir que el formato del próximo Build HubSpot va a ser legacy. La app puede flippear silenciosamente al formato 2025.2 sin notice. Defense in depth: classifier soporta ambos siempre.
- **NUNCA** ignorar events con `objectTypeId` desconocido (e.g. `0-999`). Devolver `'unknown'` y log silente — NO crashear el handler completo (puede haber events legítimos de objects que no nos interesan en el mismo batch).
- **SIEMPRE** que emerja un nuevo handler de webhook HubSpot (deals `0-3`, tickets, custom objects), reusar el pattern dual-format desde el day-1. Single source of truth en TS, helper compartido.
- **SIEMPRE** validar tests anti-regresión que cubran legacy + 2025.2 + mixed formats antes de mergear cambios al handler.

**Tests anti-regresión**: `src/lib/webhooks/handlers/hubspot-companies.test.ts` describe block `classifyHubSpotEvent dual-format (TASK-836 follow-up)` — 4 tests cubren formato 2025.2 puro, mixed legacy+2025.2 dedup, contact event con `associatedObjectId`, y `objectTypeId` desconocido ignorado.

**Spec canónica**: `docs/tasks/in-progress/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`. Runbook config HubSpot: `docs/operations/runbooks/hubspot-service-pipeline-config.md`.

### Sample Sprint outbound projection invariants (TASK-837)

Cuando alguien declara un **Sample Sprint** (`engagement_kind IN ('pilot','trial','poc','discovery')`) vía wizard `/agency/sample-sprints`, Greenhouse:

1. **Exige un HubSpot Deal abierto** — el wizard requiere selección de Deal; el server revalida server-side antes de mutar.
2. **Persiste el service localmente** con `hubspot_deal_id`, `idempotency_key = service_id`, `hubspot_sync_status='outbound_pending'` en una sola tx PG + outbox event `service.engagement.outbound_requested v1`.
3. **Async outbound projection** consume el event y proyecta a HubSpot `p_services` (custom object 0-162) en stage `Validación / Sample Sprint` (ID `1357763256`) con asociaciones Deal+Company+Contacts atómicas.
4. **Reliability**: 7 signals bajo subsystem `commercial` cubren todos los failure modes (overdue, dead_letter, partial_associations, deal_closed, drift, outcome_terminal, legacy).

**Pipeline canónico end-to-end**:

```text
Wizard submit (Vercel route handler /api/agency/sample-sprints)
  ├─> validateDealEligibility (getEligibleDealForRevalidation, NEVER trust client)
  ├─> declareSampleSprint() en tx PG:
  │   ├─ INSERT services (hubspot_deal_id, idempotency_key, hubspot_sync_status='outbound_pending')
  │   ├─ INSERT engagement_approvals + audit_log
  │   ├─ publishOutboxEvent('service.engagement.declared')      (TASK-808 path, cache invalidation TASK-835)
  │   └─ publishOutboxEvent('service.engagement.outbound_requested')  (TASK-837 trigger Slice 4)
  ├─> respond 201 con {serviceId, status:'outbound_pending', idempotencyKey}
  │
  ┊  (async, decoupled — Cloud Scheduler ops-reactive-finance */5 min)
  │
Reactive consumer 'sample_sprint_hubspot_outbound':
  ├─ re-read service desde PG (NO confiar payload)
  ├─ idempotency check: GET /services/by-idempotency-key/<idempotency_key>
  ├─ si match: skip POST + UPDATE local (hubspot_service_id, status='ready')
  ├─ si no match: POST /services con properties + associations (Deal+Company+Contacts)
  ├─ UPDATE atomic local: hubspot_service_id, hubspot_last_synced_at, status='ready'|'partial_associations'
  └─ on bridge fail: rollback in_progress → outbound_pending + retry exponencial (maxRetries=3) → outbound_dead_letter
```

**Webhook eco cascade** (anti-duplicate row): cuando HubSpot dispara webhook `service.creation` post-outbound, el handler `hubspotServicesIntakeProjection` aplica lookup cascade ANTES del UPSERT TASK-813b:

1. Si `properties.ef_greenhouse_service_id` matches `services.idempotency_key` local → UPDATE atomic linkando `hubspot_service_id` y skip UPSERT (evita segunda fila).
2. Fallback: UPSERT canónico TASK-813b (path inbound puro).

**Hard rules (18 invariantes anti-regresión)**:

- **NUNCA** ejecutar POST/PATCH/DELETE a HubSpot inline en un route handler Vercel para Sample Sprints. Toda mutación outbound pasa por outbox event + reactive consumer en `ops-worker` Cloud Run (anti-pattern TASK-771).
- **NUNCA** responder 5xx al cliente cuando PG commiteó y solo HubSpot falló. El cliente recibe 201 con `outbound_pending`; el reactive consumer reintenta async.
- **NUNCA** declarar Sample Sprint sin `hubspotDealId` validado server-side contra Deal abierto. La UI nunca decide elegibilidad final — la revalidación corre en `declareSampleSprint` vía `getEligibleDealForRevalidation` (cache bypass).
- **NUNCA** filtrar Deals elegibles por label visible HubSpot. Solo `is_closed`/`is_won`/stage IDs sincronizados desde `hubspot_deal_pipeline_config`.
- **NUNCA** crear `p_services` HubSpot sin idempotency key. `ef_greenhouse_service_id` (creada en TASK-837 Slice 0.5a) es la property writable canónica — `hs_unique_creation_key` es READ-ONLY en `0-162` (verificado en Checkpoint A 2026-05-09).
- **NUNCA** crear property HubSpot `ef_source_deal_id` ni `ef_engagement_origin`. Reusar `ef_deal_id` y `ef_engagement_kind` (las dimensiones ortogonales "tipo" vs "Deal" ya existen).
- **NUNCA** persistir `hubspot_service_id` sin `idempotency_key` previamente persistido. La idempotency key vive en `services.idempotency_key` desde el INSERT local, ANTES del POST HubSpot.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del outbound projection. Usar `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'sample_sprint_outbound', stage: '...' } })`.
- **NUNCA** loggear payload completo del bridge response (puede contener PII de contactos). Usar `redactErrorForResponse` y `redactSensitive` antes de persistir o loggear.
- **NUNCA** crear segunda fila `services` cuando webhook eco entra para un service ya creado por outbound. El handler inbound aplica lookup cascade por `idempotency_key` (TASK-837 Slice 4 patch a `hubspot-services-intake.ts`).
- **NUNCA** mover `p_services` HubSpot a Closed automáticamente cuando outcome Greenhouse es terminal (V1 manual). Reliability signal `outcome_terminal_pservices_open` lo escala operativamente. Automatizar es task derivada V1.1.
- **NUNCA** inventar Deal retroactivamente para Sample Sprint legacy sin Deal. Operador comercial decide via manual queue: vincular existente, declarar legacy o cerrar.
- **NUNCA** depender de `ef_pipeline_stage` como source of truth de HubSpot stage. Solo `hs_pipeline_stage`. La property `ef_pipeline_stage` quedó deprecated para Sample Sprints (Checkpoint D resuelto).
- **NUNCA** modificar el CHECK constraint `services_hubspot_sync_status_check` sin extender ambos sets de valores: inbound (`pending|synced|unmapped` TASK-813/836) + outbound (`outbound_pending|outbound_in_progress|ready|partial_associations|outbound_dead_letter` TASK-837).
- **SIEMPRE** que un Sample Sprint se declare via wizard, emitir outbox event `service.engagement.outbound_requested v1` en la misma tx PG. NO confundir con `service.engagement.declared v1` (TASK-808) que tiene cache invalidation consumer (TASK-835).
- **SIEMPRE** revalidar elegibilidad del Deal server-side al submit (stage abierto + company + ≥1 contacto). El cache del reader tiene TTL 60s; la revalidación es fresh (NEVER cache).
- **SIEMPRE** que outbound projection reciba 429 de HubSpot, respetar `Retry-After` header del bridge response. Backoff exponencial automatico via outbox state machine TASK-773.
- **SIEMPRE** que un service entre en `outbound_dead_letter`, requiere humano via dead-letter UX (`commercial.engagement.recover_outbound` capability, FINANCE_ADMIN o EFEONCE_ADMIN solo).

**Helpers canónicos**:

- `getEligibleDealForRevalidation(hubspotDealId)` — `src/lib/commercial/eligible-deals-reader.ts`, fresh PG read.
- `listEligibleDealsForSampleSprint({...})` — wizard reader con cache TTL 60s per subject.
- `declareSampleSprint(input)` — `src/lib/commercial/sample-sprints/store.ts`, atomic tx + 2 outbox events.
- `sampleSprintHubSpotOutboundProjection` — `src/lib/sync/projections/sample-sprint-hubspot-outbound.ts`, reactive consumer.
- `createHubSpotGreenhouseService` / `findHubSpotGreenhouseServiceByIdempotencyKey` / `updateHubSpotGreenhouseService` — `src/lib/integrations/hubspot-greenhouse-service.ts`, bridge clients.

**Reliability signals (subsystem `commercial`, steady=0)**:

- `commercial.sample_sprint.outbound_pending_overdue` (lag/warning)
- `commercial.sample_sprint.outbound_dead_letter` (dead_letter/error)
- `commercial.sample_sprint.partial_associations` (drift/warning)
- `commercial.sample_sprint.deal_closed_but_active` (drift/warning)
- `commercial.sample_sprint.deal_associations_drift` (drift/warning)
- `commercial.sample_sprint.outcome_terminal_pservices_open` (drift/warning)
- `commercial.sample_sprint.legacy_without_deal` (data_quality/warning)

**Spec canónica**: `docs/tasks/in-progress/TASK-837-deal-bound-sample-sprint-service-projection.md`. Runbook recovery: `docs/operations/runbooks/sample-sprint-outbound-recovery.md`. Bridge endpoints: `services/hubspot_greenhouse_integration/app.py` (POST `/services`, PATCH `/services/<id>`, GET `/services/by-idempotency-key/<key>`).

### Cross-runtime observability — Sentry init invariant (TASK-844)

`src/lib/**` corre en **5 runtimes distintos** y todos consumen el wrapper canónico `captureWithDomain` (207 callsites) para emitir incidents a Sentry con tag `domain` para roll-up por módulo en el reliability dashboard.

| Runtime | Sentry init path | Status |
|---|---|---|
| **Vercel** (Next.js 16 App Router) | Auto vía `src/instrumentation.ts` → `sentry.server.config.ts` → `next.config.ts withSentryConfig` | ✅ canónico desde día 1 |
| **ops-worker** Cloud Run (generic Node ESM) | `services/ops-worker/server.ts` línea de init invocando `initSentryForService('ops-worker')` desde `services/_shared/sentry-init.ts` | ✅ TASK-844 Slice 3 |
| **commercial-cost-worker** Cloud Run | mismo patrón ops-worker | ✅ TASK-844 Slice 4 |
| **ico-batch** Cloud Run | mismo patrón ops-worker | ✅ TASK-844 Slice 4 |
| **hubspot_greenhouse_integration** Cloud Run (Python) | Out of scope (Python services tienen su propio SDK Sentry si emerge necesidad) | N/A |

**Helper canónico**: `services/_shared/sentry-init.ts` (`initSentryForService(serviceName, options?)`).

- DSN missing → `console.warn` once + return (graceful degradation, captureWithDomain hace no-op via Sentry SDK builtin fallback).
- DSN present → `Sentry.init({ dsn, environment, serverName, release, tracesSampleRate })` + `Sentry.setTag('service', serviceName)`.
- Idempotente — singleton flag previene doble init + warn spam.
- Secret canónico GCP: `greenhouse-sentry-dsn` (Secret Manager). Si no existe, deploy.sh continúa con warn.

**Wrapper canónico**: `src/lib/observability/capture.ts` importa `@sentry/node` (NO `@sentry/nextjs`). `@sentry/node` es el SDK underlying que `@sentry/nextjs` envuelve — runtime-portable. Sentry hub es global singleton: ambos runtimes acceden al mismo hub.

**Contexto root cause** (ISSUE-074): TASK-813b (async intake p_services HubSpot via webhook → outbox → reactive consumer) nunca funcionó end-to-end en producción porque el wrapper importaba `@sentry/nextjs` cuyo shape variaba en runtime Cloud Run, causando `Sentry.captureException is not a function`. Detectado durante smoke test post-merge PR #113 (TASK-836 follow-up). Cerrado live 2026-05-09 19:30:04 con cycle PATCH→materialized verificado.

**⚠️ Reglas duras**:

- **NUNCA** importar `@sentry/nextjs` directamente en código bajo `src/lib/`. Usar `captureWithDomain(err, '<domain>', { extra })` desde `src/lib/observability/capture.ts` que abstrae `@sentry/node` runtime-portable.
- **NUNCA** crear nuevo Cloud Run Node service sin `initSentryForService(name)` como primera línea ejecutable de `server.ts`, después de imports y antes de `createServer`. Lint rule `greenhouse/cloud-run-services-must-init-sentry` (modo `error`) bloquea el commit.
- **NUNCA** invocar `Sentry.captureException()` directo en code path con dominio claro. Usar `captureWithDomain(err, '<domain>', { extra })`. Sin tag `domain`, el incident no aparece en signals per-module del reliability dashboard.
- **NUNCA** modificar `services/_shared/sentry-init.ts` para cambiar el contract de degradation. DSN missing DEBE no-op silenciosamente; observabilidad nunca bloquea path principal.
- **NUNCA** mover el call `initSentryForService(...)` después del primer createServer/listen en `server.ts`. Tiene que correr antes de cualquier handler HTTP que pueda invocar funciones de `@/lib/**`.
- **NUNCA** importar el helper desde `@/lib/...` o re-exportarlo desde `src/`. Vive intencionalmente en `services/_shared/` para preservar el boundary runtime (Vercel runtime usa init Next.js auto; Cloud Run runtime usa este helper explícito).
- **NUNCA** crashear el helper si DSN tiene formato inválido — Sentry SDK valida internamente y degrada graceful.
- **SIEMPRE** que emerja un Cloud Run Node service nuevo, agregar `initSentryForService('<nombre>')` + `COPY services/_shared/ ./services/_shared/` en Dockerfile + opcionalmente SENTRY_DSN secret mount en deploy.sh.
- **SIEMPRE** que un nuevo runtime aparezca (ej. Cloudflare Workers, AWS Lambda, generic Bun service), validar que `@sentry/node` corre allí o adaptar el wrapper sin cambiar la superficie de import.

**Defense-in-depth (3 capas)**:

1. **Lint rule** `greenhouse/cloud-run-services-must-init-sentry` (modo `error`, TASK-844 Slice 6): bloquea commits que crean `services/<svc>/server.ts` con import de `@/lib/**` sin `initSentryForService` import + call.
2. **Reliability signal** `observability.cloud_run.silent_failure_rate` (TASK-844 Slice 5): cuenta filas en `outbox_reactive_log` con `last_error LIKE '%captureException is not a function%'` últimas 24h. Steady=0; cualquier > 0 indica regresión runtime.
3. **Cloud Logging stderr fallback**: si Sentry no está configurado, errores siguen visibles en Cloud Logging via `console.error`/`console.warn`. Helper escribe warn al startup cuando DSN missing.

**Spec canónica**: `docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md`. ISSUE relacionado: `docs/issues/resolved/ISSUE-074-ops-worker-missing-sentry-bundle-blocks-projections.md` (post Slice 8).

### PostgreSQL connection management — runtime invariants (TASK-846)

Greenhouse comparte una única instancia Cloud SQL PostgreSQL 16 entre 5 runtimes (Vercel + 3 Cloud Run Node services + hubspot Python). Cada runtime tiene su propio pool de `pg-node` independiente. Sin coordinación cross-runtime explícita, cualquier runtime puede saturar el budget global de 100 conexiones (ISSUE detectado 2026-05-09: 103% saturation live + Sentry NEW issue 7 errors `remaining connection slots are reserved`).

**Architectural decision V1 deployed (TASK-846)**: defense-in-depth de 3 capas, deployment data-driven del multiplexer. NO se deploya PgBouncer en V1 — la evidencia post-Slice 1 ALTER ROLE (saturation 103% → 66%) indica que el problema fundamental era leak de idle connections, no demanda > capacidad.

**Topología V1 canónica**:

```text
Vercel functions × N    pool max=3, idleTimeoutMillis=10s    ──→ Cloud SQL
ops-worker              pool max=15, idleTimeoutMillis=30s        max_connections=100
commercial-cost-worker  (TASK-846 Slice 3)                        ALTER ROLE idle_session_timeout=5min
ico-batch                                                          (TASK-846 Slice 1)
                            ┌─ Reliability signal ─┐
                            │ runtime.postgres.    │
                            │ connection_saturation│   ← V2 trigger data-driven
                            │ ok < 60%             │
                            │ warning > 60%        │
                            │ error > 80%          │
                            └──────────────────────┘
```

**V2 contingente (TASK-846)**: si reliability signal alerta sustained > 60%, deploy PgBouncer en GKE Autopilot (~$75-85/mes). Cloud Run NO soporta TCP raw → PgBouncer NO va en Cloud Run.

**⚠️ Reglas duras**:

- **NUNCA** crear `Pool` de `pg-node` directo sin pasar por `getGreenhousePostgresConfig()` desde `src/lib/postgres/client.ts`. El helper aplica runtime detection (Vercel max=3, Cloud Run max=15) automáticamente. Lint rule `greenhouse/no-direct-pg-pool` (TASK-846 Slice 7) bloquea regresión.
- **NUNCA** configurar `max > 15` en Vercel function. La VLA ya satura PG con 5-10 functions concurrentes. Override solo con justificación documentada en task spec.
- **NUNCA** removeer `ALTER ROLE greenhouse_app SET idle_session_timeout = '5min'` ni `greenhouse_ops SET idle_session_timeout = '15min'`. Settings persistidos en `pg_roles.rolconfig` cross-restart. Verificación: `SELECT rolname, rolconfig FROM pg_roles WHERE rolname IN ('greenhouse_app', 'greenhouse_ops')` debe devolver el timeout configurado.
- **NUNCA** usar `LISTEN/NOTIFY` desde aplicación. Greenhouse usa outbox pattern canónico (TASK-773). Garantiza compatibilidad con V2 PgBouncer transaction pooling cuando se deploye.
- **NUNCA** usar prepared statements server-side (`PREPARE ... EXECUTE`). `pg-node` por default usa simple Query — preserva compatibilidad transaction pooling.
- **NUNCA** ignorar el reliability signal `runtime.postgres.connection_saturation` en estado `unknown` por > 24h. Es la señal data-driven que dispara V2 deployment.
- **NUNCA** invocar `Sentry.captureException` directo en code path `src/lib/postgres/`. Usar `captureWithDomain(err, 'cloud', ...)`.
- **SIEMPRE** que emerja un nuevo runtime que necesite Postgres, usar `getGreenhousePostgresConfig()` que detecta runtime automáticamente. Override via env vars `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` / `GREENHOUSE_POSTGRES_IDLE_TIMEOUT_MS` solo con razón documentada.
- **SIEMPRE** monitorear `runtime.postgres.connection_saturation` en `/admin/operations`. Steady < 30% (V1 funcional). Sustained > 60% → escalar a TASK-847 V2 deployment.

**Defense-in-depth V1 (3 capas)**:

1. **PG-side `idle_session_timeout` por role** (ALTER ROLE): PG corta connections idle > 5min server-side. Persistente cross-restart.
2. **pg-node Pool tuning per-runtime**: max conservador, idleTimeoutMillis agresivo. Backpressure local.
3. **Reliability signal `runtime.postgres.connection_saturation`**: detecta regresión global. Trigger V2 deployment data-driven.

**Spec canónica**: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`. Task implementación V1: `docs/tasks/in-progress/TASK-846-postgres-connection-pooling-v1-data-driven.md`. Task contingencia V2: `docs/tasks/to-do/TASK-847-postgres-pgbouncer-gke-v2-deployment.md`.

### HubSpot inbound webhook — companies + contacts auto-sync (TASK-706)

Cuando alguien crea o actualiza una company/contact en HubSpot, **NO requerir sync manual ni esperar al cron diario**. La app HubSpot Developer envía webhooks v3 a Greenhouse y el portal sincroniza automáticamente.

**Coexistencia con paths previos** (no se contraponen — los 3 convergen en el mismo motor `syncHubSpotCompanies`):

| Path | Trigger | Latencia | Rol |
|---|---|---|---|
| **Webhook** (TASK-706, default) | Event HubSpot | <10s | Path por defecto en producción. Captura el 99% de cambios en tiempo real. |
| **Adoption manual** (TASK-537) | Click en Quote Builder | <2s | Fallback rápido cuando el operador necesita avanzar antes que llegue el webhook (timeout, race UI), o adopt company antigua que predates webhook subscription. |
| **Cron diario** (TASK-536) | Schedule | ~24h | Safety net — sweep periódico que captura events perdidos (HubSpot retries exhausted, handler bug). NO desactivar aunque webhook esté en prod. |

Los 3 hacen UPSERT idempotente por `hubspot_company_id`. Si convergen al mismo company en el mismo segundo, no hay duplicados.

**Pipeline canónico**:
1. **HubSpot Developer Portal** → suscripción a `company.creation`, `company.propertyChange`, `contact.creation`, `contact.propertyChange`. Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies`. Signature method: v3.
2. **Endpoint Next.js** `/api/webhooks/hubspot-companies` (genérico `/api/webhooks/[endpointKey]/route.ts`) recibe POST.
3. **`processInboundWebhook`** lookup en `greenhouse_sync.webhook_endpoints` por `endpoint_key='hubspot-companies'`. Inbox row creado para idempotencia (dedupe by `event_id`).
4. **Handler `hubspot-companies`** (en `src/lib/webhooks/handlers/hubspot-companies.ts`) valida firma HubSpot v3 internamente (`auth_mode='provider_native'`):
   - HMAC-SHA256 sobre `POST + uri + body + timestamp` con `HUBSPOT_APP_CLIENT_SECRET`.
   - Rechaza requests con timestamp > 5 min de antigüedad.
   - Comparison timing-safe.
5. Extrae company IDs únicos del array de events (deduplica). Para `contact.*` usa `associatedObjectId` como company id.
6. Para cada company id, llama `syncHubSpotCompanyById(id, { promote: true, triggeredBy: 'hubspot-webhook' })`:
   - Fetch `/companies/{id}` y `/companies/{id}/contacts` desde Cloud Run bridge.
   - UPSERT en `greenhouse_crm.companies` + `greenhouse_crm.contacts`.
   - Llama `syncHubSpotCompanies({ fullResync: false })` para promover crm → `greenhouse_core.organizations` + `greenhouse_core.clients`.
7. Failures individuales se capturan en Sentry con `domain='integrations.hubspot'`. Si TODOS fallan → throw para que HubSpot reintente.

**⚠️ Reglas duras** (TASK-878 canonical async, desde 2026-05-14):
- **NO** crear endpoints paralelos para HubSpot. Si emerge necesidad de webhook para deals, products, etc., agregar nuevo handler bajo `src/lib/webhooks/handlers/` y nuevo `webhook_endpoints` row, NO endpoint custom.
- **NUNCA** llamar `syncHubSpotCompanyById` desde el webhook handler `hubspot-companies` (request path). El path canónico es emitir outbox event `commercial.hubspot_company.sync_requested v1` via `enqueueHubSpotCompanyEventsAsync`. La projection `hubspot_companies_intake` (TASK-878 Slice 2) consume el event en ops-reactive-finance cron fuera del request path.
- **NUNCA** hacer bridge fetch (Cloud Run hubspot-greenhouse-integration) sincrono dentro del webhook handler — HubSpot timeout 5s; el sync toma 3-10s y dispara retries concurrentes que generaron la race condition cerrada en Slice 1 (RETURNING canónico).
- **NUNCA** generar `company_record_id` / `contact_record_id` en TS antes del INSERT con la intención de hacer SELECT-verify posterior. Siempre `INSERT … ON CONFLICT DO UPDATE … RETURNING <pk>` (patrón canónico TASK-878 Slice 1, ya usado en `nubox/sync-nubox-balances.ts` y `sync/projections/hubspot-services-intake.ts`). El verify defensivo cazaba el síntoma, no la causa.
- **NUNCA** llamar `syncTenantCapabilitiesFromIntegration` inline en el webhook handler. La capability sync vive dentro del `refresh` de la projection (post-TASK-878 Slice 2).
- `syncHubSpotCompanyById` sigue invocable desde CLI scripts (`scripts/integrations/hubspot-sync-company.ts`), admin endpoint (`/api/admin/integrations/hubspot/sync-company`), Quote Builder adopt (TASK-537), y la projection `hubspot_companies_intake` — todos paths que corren fuera del 5s budget HubSpot.
- **NO** sincronizar manualmente si el webhook está activo. El CLI queda solo para backfills históricos o casos de recuperación.
- **NUNCA** loggear el body crudo del webhook en logs (puede contener PII de contactos). El sistema generic ya lo persiste en `greenhouse_sync.webhook_inbox_events` con scrubbing apropiado.
- Cuando se cree un nuevo cliente Greenhouse manualmente (sin pasar por HubSpot), seguir el patrón `hubspot-company-{ID}` solo si tiene HubSpot ID; si NO tiene HubSpot, usar otro prefix (ej. `internal-`, `nubox-`, etc.) para evitar colisión.
- **Reliability signal canónico** `commercial.hubspot_company.intake_dead_letter` (kind=dead_letter, severity=error si count>0, steady=0, subsystem rollup `commercial`). Cuando alerta: bridge Cloud Run caído, `HUBSPOT_ACCESS_TOKEN` corrupto/expirado, permisos OAuth revocados, o schema PG drift.

**Configuración HubSpot Developer Portal** (one-time):
1. App "Greenhouse Bridge" en `developers.hubspot.com/apps`.
2. Webhooks > Create subscription per evento.
3. Activar la app en el portal HubSpot del tenant (Account Settings > Integrations > Connected Apps).

**Tests**: `pnpm test src/lib/webhooks/handlers/hubspot-companies` (6 tests cubren signature validation, timestamp expiry, dedup, partial failures, retry semantics).

**Spec canónica**: `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (sección HubSpot inbound).

### PostgreSQL Access

- **Script automatizado `pg-connect.sh`** — resuelve ADC, levanta Cloud SQL Proxy, conecta con el usuario correcto y ejecuta la operación solicitada. **Usar esto primero antes de intentar conectar manualmente.**
  ```bash
  pnpm pg:connect              # Verificar ADC + levantar proxy + test conexión
  pnpm pg:connect:migrate      # Lo anterior + ejecutar migraciones pendientes
  pnpm pg:connect:status       # Lo anterior + mostrar estado de migraciones
  pnpm pg:connect:shell        # Lo anterior + abrir shell SQL interactivo
  ```
  El script selecciona automáticamente el usuario correcto: `ops` para connect/migrate/status, `admin` para shell.
- **Método preferido (runtime en todos los entornos)**: Cloud SQL Connector vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`. Conecta sin TCP directo — negocia túnel seguro por la Cloud SQL Admin API. Funciona en Vercel (WIF + OIDC), local, y agentes AI.
- **La IP pública de Cloud SQL NO es accesible por TCP directo** — no hay authorized networks configuradas. Intentar conectar a `34.86.135.144` da `ETIMEDOUT`.
- **Migraciones y binarios standalone** (`pnpm migrate:up`, `pg_dump`, `psql`): requieren Cloud SQL Auth Proxy como túnel local. Usar `pnpm pg:connect` para levantarlo automáticamente, o manualmente:
  ```bash
  cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432
  # .env.local: GREENHOUSE_POSTGRES_HOST="127.0.0.1", PORT="15432", SSL="false"
  ```
- **Guardia fail-fast**: `scripts/migrate.ts` aborta inmediatamente si `GREENHOUSE_POSTGRES_HOST` apunta a una IP pública. No esperar timeout.
- **Regla de prioridad** (runtime): si `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida, el Connector toma prioridad sobre `GREENHOUSE_POSTGRES_HOST`. Ver `src/lib/postgres/client.ts:133`.
- **Perfiles**: `runtime` (DML), `migrator` (DDL), `admin` (bootstrap), `ops` (canonical owner)
- **Canonical owner**: `greenhouse_ops` es dueño de todos los objetos (122 tablas, 11 schemas)
- Health check: `pnpm pg:doctor`

### Database Connection

- **Archivo centralizado**: `src/lib/db.ts` — único punto de entrada para toda conexión PostgreSQL
- **Import `query`** para raw SQL, **`getDb()`** para Kysely tipado, **`withTransaction`** para transacciones
- **NUNCA** crear `new Pool()` fuera de `src/lib/postgres/client.ts`
- Módulos existentes usando `runGreenhousePostgresQuery` de `@/lib/postgres/client` están OK
- Módulos nuevos deben usar Kysely (`getDb()`) para type safety
- Tipos generados: `src/types/db.d.ts` (140 tablas, generado por `kysely-codegen`)

### Database Migrations

- **Framework**: `node-pg-migrate` — SQL-first, versionado en `migrations/`
- **Comandos**: `pnpm migrate:create <nombre>`, `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:status`
- **Flujo obligatorio**: `migrate:create` → editar SQL → `migrate:up` (auto-regenera tipos) → commit todo junto
- **Regla**: migración ANTES del deploy, siempre. Columnas nullable primero, constraints después.
- **Timestamps**: SIEMPRE usar `pnpm migrate:create` para generar archivos. NUNCA renombrar timestamps manualmente ni crear archivos a mano — `node-pg-migrate` rechaza migraciones con timestamp anterior a la última aplicada.
- **Spec completa**: `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

### Finance — reconciliación de income.amount_paid (factoring + withholdings)

Una factura (`greenhouse_finance.income`) puede saldarse por **3 mecanismos** distintos, y `amount_paid` es el total saldado independiente de cuál cerró cada porción:

1. **Pagos en efectivo** → `income_payments.amount`
2. **Fees de factoring** → `factoring_operations.fee_amount` cuando `status='active'`. La factura ESTÁ saldada por esa porción aunque la fee nunca llegue como cash — se vendió el riesgo AR al factoring provider. (Componente: `interest_amount` + `advisory_fee_amount`).
3. **Retenciones tributarias** → `income.withholding_amount`. El cliente retuvo parte y la paga al SII directo. La factura ESTÁ saldada por esa porción aunque nunca llegue a Greenhouse.

**Ecuación canónica**:

```text
amount_paid == SUM(income_payments.amount)
             + SUM(factoring_operations.fee_amount WHERE status='active')
             + COALESCE(withholding_amount, 0)
```

Cualquier diferencia es **`drift`** — un problema real de integridad de ledger que requiere humano.

**Reglas duras**:

- **NUNCA** computar drift como `amount_paid - SUM(income_payments)` solo. Eso ignora factoring + withholdings y produce drift falso para cada factura factorada.
- **Usar siempre** la VIEW canónica `greenhouse_finance.income_settlement_reconciliation` o el helper `src/lib/finance/income-settlement.ts` (`countIncomesWithSettlementDrift`, `getIncomeSettlementBreakdown`, `listIncomesWithSettlementDrift`).
- Cuando aparezca un nuevo mecanismo de settlement (notas de crédito, write-offs parciales, retenciones extranjeras, etc.), extender **ambos**: la VIEW (migración nueva con `CREATE OR REPLACE VIEW`) y el helper TypeScript. Nunca branchear la lógica en un consumer.
- El Reliability Control Plane (`Finance Data Quality > drift de ledger`) lee desde esta VIEW. Bypass = dashboards inconsistentes.

### Finance — Ledger drift detection: superseded exclusion + honest degradation (TASK-929, desde 2026-05-24)

Dos invariantes canónicos descubiertos/canonizados live al remediar `JAVASCRIPT-NEXTJS-4Q`:

**1. La VIEW `income_settlement_reconciliation` DEBE excluir pagos superseded en `payments_total`.** El subquery de pagos filtra `superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL AND superseded_at IS NULL` — mirror EXACTO de `fn_recompute_income_amount_paid`. Antes de TASK-929 la VIEW sumaba TODOS los `income_payments` (incluyendo superseded) mientras el `fn` los excluía → **dos definiciones de la misma ecuación desalineadas** → falsos positivos de drift en facturas factorizadas (el pago NUBOX original superseded por el modelo factoring se contaba doble). Con el ledger churning (Nubox re-sync supersede/re-add constante), la VIEW vieja **flickeaba** drift.
- **NUNCA** modificar `income_settlement_reconciliation` (ni `fn_recompute_income_amount_paid`) sin actualizar el otro en paralelo. Son la MISMA ecuación canónica — settlement = `SUM(pagos activos) + factoring_fee (active) + withholding`. Drift entre ambos = falsos positivos/negativos de drift.
- **NUNCA** sumar `income_payments` sin filtrar las 3 cadenas de supersede (`superseded_by_payment_id`, `superseded_by_otb_id`, `superseded_at`) cuando el propósito es reconciliación de `amount_paid`.

**2. `getFinanceLedgerHealth` NO debe colapsar un error de query a "0 drift" (false-healthy).** Cada check va envuelto en `tracked(name, promise, fallback)` que registra el check en `degradedChecks: string[]` cuando su query falla. `healthy` exige `degradedChecks` sin ningún check `DECISION_CRITICAL` degradado — no se puede declarar el ledger sano estando ciego a un check. Bug class ISSUE-071 / Pillar 3: verificado live 2026-05-24 (un probe con blip de proxy devolvió `healthy=true` mientras la VIEW tenía 4 drift rows).
- **NUNCA** envolver un check de `getFinanceLedgerHealth` en `.catch(() => [])` plano. Usar `tracked(...)` para que el fallo sea visible en `degradedChecks`, no silencioso.
- **NUNCA** agregar un check decision-critical nuevo sin añadirlo al set `DECISION_CRITICAL_CHECKS`. Los checks `*_sample`/informacionales degradados se surfacing pero NO flipean `healthy`.
- El `driftSignature` del cron ops-worker (`buildFinanceLedgerDriftSignature`) incluye `degradedChecks` → un check degradado cambia la firma y dispara alerta Sentry distinta del drift normal.

**Signal canónico**: `finance.ledger.unresolved_drift_items` (`src/lib/reliability/queries/ledger-unresolved-drift-items.ts`, subsystem Finance Data Quality). Severidad tiered: settlement drift > 0 → `error` (integridad); solo unanchored > 0 → `warning` (data-completeness — los gastos sin FK-anchor que tienen `economic_category` no rompen P&L); ambos 0 → `ok`.

**Inventory read-only** (control surface, NO muta): `getLedgerDriftInventory()` + `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/ledger-drift-inventory.ts`. Clasifica drift por tipo + rutea unanchored por materialidad ($50k CLP default, `LEDGER_DRIFT_UNANCHORED_MATERIALITY_CLP` env). La materialidad gobierna **routing**, NUNCA detección (la VIEW detecta todo a tolerancia 0.01).

**Spec canónica**: `docs/tasks/in-progress/TASK-929-finance-ledger-drift-remediation-control.md`.

### Finance — Unanchored paid expense acknowledgment (TASK-934, desde 2026-05-25)

Un gasto pagado sin FK-anchor (todos `payroll_entry_id`/`tool_catalog_id`/`supplier_id`/`tax_type`/`loan_account_id`/`linked_income_id` NULL) pero CON `economic_category` es **data-completeness, no integridad**. Dos resoluciones canónicas:

- **Anclar** (vendor real, ej. Vercel/Beeconta): reuse del PUT existente `/api/finance/expenses/[id]` con `supplierId`. NO endpoint nuevo.
- **Aceptar como deuda conocida** (labor a personas — contratistas internacionales, staff interno — + regulatory/bank fees, donde un `supplier_id` sería category error): helper canónico `acknowledgeUnanchoredExpense` (`src/lib/finance/ledger-drift/acknowledge-unanchored.ts`) + `POST /api/admin/finance/expenses/[id]/acknowledge-unanchored` (capability `finance.expenses.acknowledge_unanchored`).

**⚠️ Reglas duras**:

- **NUNCA** modelar la "cola de revisión" de unanchored como tabla-cola paralela con state machine. El acknowledgment vive ON the expense (columnas `unanchored_acknowledged_at/by/reason`), single source of truth — espejo de `dismiss-phantom.ts` (que usa `superseded_at` en la fila). Una tabla-cola duplicaría el estado del expense → sync risk.
- **NUNCA** usar las columnas `unanchored_acknowledged_*` para VOID/supersede. El gasto se queda íntegro en P&L; acknowledgment solo registra "aceptado, clasificado por economic_category, sin supplier apropiado". NO confundir con `dismiss-phantom` (que sí anula un payment phantom).
- **NUNCA** acknowledgear un gasto que tenga cualquier FK-anchor o que no esté `paid`. El helper hace guards defensivos (throw 422 `ACKNOWLEDGE_ALREADY_ANCHORED` / `ACKNOWLEDGE_NOT_PAID`).
- **NUNCA** mutar `unanchored_acknowledged_*` por SQL directo. Toda aceptación pasa por `acknowledgeUnanchoredExpense` (idempotente, reason >= 10 chars, outbox `finance.expense.unanchored_acknowledged v1`).
- **SIEMPRE** que un consumer lea "unanchored pendiente" (health/inventory/signal), filtrar `AND unanchored_acknowledged_at IS NULL`. Los acknowledged se exponen separados (`acknowledgedDebt` en health, sección `acknowledged` en inventory) — SUM-of-unadjusted, visible pero fuera de pendientes; NO afectan `healthy`.

**Spec canónica**: `docs/tasks/in-progress/TASK-934-unanchored-paid-expense-anchoring-review-queue.md`. Capability: `finance.expenses.acknowledge_unanchored` (FINANCE_ADMIN + EFEONCE_ADMIN). Evento: `finance.expense.unanchored_acknowledged v1`.

### Finance — FX P&L canónico para tesorería (Banco "Resultado cambiario")

El "Resultado cambiario" del Banco se compone de **3 fuentes legítimas** y debe leerse SIEMPRE desde la VIEW canónica + helper, no re-derivar:

1. **Realized FX en settlement** — diferencia entre rate documento (issuance) y rate pago para invoices/expenses no-CLP. Persistido en `income_payments.fx_gain_loss_clp` + `expense_payments.fx_gain_loss_clp`, agregado por día en `account_balances.fx_gain_loss_realized_clp`.
2. **Translation FX** — revaluación mark-to-market diaria de saldos no-CLP cuando se mueve el tipo de cambio. Computado en `materializeAccountBalance` como `closing_balance_clp − previous_closing_balance_clp − (period_inflows − period_outflows) × rate_today`. Persistido en `account_balances.fx_gain_loss_translation_clp`.
3. **Realized FX en transferencias internas** — placeholder = 0 hoy. Se activa cuando una TASK derivada introduzca `greenhouse_finance.internal_transfers` con rate spread vs mercado.

**Read API canónico**: VIEW `greenhouse_finance.fx_pnl_breakdown` + helper `src/lib/finance/fx-pnl.ts` (`getBankFxPnlBreakdown`).

**UI honesta — NO mostrar `$0` silencioso**: la card debe distinguir tres estados:
- `hasExposure === false` → "Sin exposición FX" con stat `—` (caso Efeonce hoy: 100% CLP)
- `hasExposure && !isDegraded` → total + breakdown "Realizado X · Translación Y" + tooltip canónico
- `isDegraded === true` → "Pendiente" + warning rojo (rate ausente para alguna cuenta no-CLP)

**Reglas duras**:

- **NUNCA** sumar FX P&L desde `income_payments`/`expense_payments` directo en un nuevo query. Toda lectura cruza la VIEW o el helper.
- **NUNCA** dejar `$0` literal cuando `hasExposure === false`. Es un cero ambiguo que confunde "sin exposición" con "cálculo roto".
- **NUNCA** branchear la ecuación en un consumer. Cuando aparezca una fuente nueva (notas de crédito en moneda extranjera, forward contracts, etc.), extender **ambos**: la VIEW (migración con `CREATE OR REPLACE VIEW`) y el helper TS.
- **NUNCA** loggear silenciosamente cuando `resolveExchangeRateToClp` falla. Usar `captureWithDomain(err, 'finance', { tags: { source: 'fx_pnl_translation' } })` y degradar a `translation = 0` — degradación honesta, nunca bloquear la materialización del snapshot diario.
- Patrón canónico replicado de `income_settlement_reconciliation` (TASK-571 / TASK-699). Cuando se necesite "una columna compuesta de N mecanismos legítimos", aplicar este shape: VIEW + helper TS + comments anti re-derive + UI con estados honestos.

### Finance — CLP currency reader invariants (TASK-766)

Toda lectura de `expense_payments` o `income_payments` que necesite saldos en CLP **debe** ir por la VIEW canónica + helper TS. NUNCA recomputar `monto_clp = ep.amount × exchange_rate_to_clp` en SQL embebido.

**Por qué**: el campo `exchange_rate_to_clp` vive en el documento original (`expenses` / `income`). Cuando un expense en USD se paga en CLP (caso CCA shareholder reimbursable TASK-714c), multiplicar el monto CLP nativo del payment por el rate USD del documento infla los KPIs en mil millones por payment. Incidente real 2026-05-02: `/finance/cash-out` mostraba $1.017.803.262 vs real $11.546.493 (88× inflado), todo por **un** payment HubSpot CCA.

**Read API canónico**:
- VIEW: `greenhouse_finance.expense_payments_normalized` y `greenhouse_finance.income_payments_normalized`. Exponen `payment_amount_clp` (COALESCE chain: `amount_clp` first → CLP-trivial fallback `WHEN currency='CLP' THEN amount` → `NULL` + `has_clp_drift=TRUE`). Aplican filtro 3-axis supersede inline.
- Helpers TS: `src/lib/finance/expense-payments-reader.ts` y `src/lib/finance/income-payments-reader.ts`.
  - `sumExpensePaymentsClpForPeriod({fromDate, toDate, expenseType?, supplierId?, isReconciled?})` → `{totalClp, totalPayments, unreconciledCount, supplierClp, payrollClp, fiscalClp, driftCount}`
  - `sumIncomePaymentsClpForPeriod({fromDate, toDate, clientProfileId?, isReconciled?})` → `{totalClp, totalPayments, unreconciledCount, driftCount}`
  - `listExpensePaymentsNormalized({...})` y `listIncomePaymentsNormalized({...})` para detalle paginado
  - `getExpensePaymentsClpDriftCount()` y `getIncomePaymentsClpDriftCount()` para reliability signals

**Backfill + drift defense (Slice 2)**:
- `expense_payments` y `income_payments` tienen columna `requires_fx_repair BOOLEAN` que marca filas con `currency != 'CLP' AND amount_clp IS NULL`.
- CHECK constraint `payments_amount_clp_required_after_cutover` (NOT VALID + VALIDATE atomic, mirror del patrón TASK-708/728 con cutover 2026-05-03): rechaza INSERT/UPDATE post-cutover sin `amount_clp` para non-CLP, salvo supersede activo.
- Reliability signals canónicos: `finance.expense_payments.clp_drift` + `finance.income_payments.clp_drift` (kind=drift, severity=error si count>0, steady=0). Subsystem rollup: `Finance Data Quality`.

**Lint rule mecánica (Slice 3)**:
- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` modo `error`. Detecta SQL embedido con 4 patrones (expense + income, con/sin COALESCE) — `ep.amount * exchange_rate_to_clp`, `ep.amount * COALESCE(e.exchange_rate_to_clp, 1)`, idem `ip.amount`. Bloquea el commit.
- Override block en `eslint.config.mjs` exime los readers canónicos (`src/lib/finance/expense-payments-reader.ts`, `src/lib/finance/income-payments-reader.ts`) — son la única fuente legítima de la VIEW.

**Repair admin endpoint (Slice 5)**:
- `POST /api/admin/finance/payments-clp-repair` (capability `finance.payments.repair_clp`, FINANCE_ADMIN + EFEONCE_ADMIN). Body: `{kind: 'expense_payments'|'income_payments', paymentIds?, fromDate?, toDate?, batchSize?, dryRun?}`. Resuelve rate histórico al `payment_date` desde `greenhouse_finance.exchange_rates` (rate vigente al pago, NO el actual) y poblá `amount_clp + exchange_rate_at_payment + requires_fx_repair=FALSE` per-row atomic. Idempotente. Outbox audit `finance.payments.clp_repaired` v1.

**⚠️ Reglas duras**:
- **NUNCA** escribir `SUM(ep.amount * exchange_rate_to_clp)`, `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))` ni variantes con `ip.amount`. Lint rule `greenhouse/no-untokenized-fx-math` rompe build.
- **NUNCA** sumar `payment.amount` directo y luego multiplicar por rate del documento en código TS — el rate del documento puede ser de issuance USD pero el payment puede ser CLP nativo. La VIEW resuelve esto correctamente.
- **NUNCA** crear un nuevo callsite de KPIs CLP sin pasar por `sumExpensePaymentsClpForPeriod` / `sumIncomePaymentsClpForPeriod`. Si el caso de uso pide breakdown nuevo (e.g. por supplier_id), extender el helper, NO duplicar SQL.
- **NUNCA** ignorar `driftCount` en surfaces que ya lo exponen. UI debe banner anomalies cuando `driftCount > 0` para que el operador invoque `/api/admin/finance/payments-clp-repair`.
- **NUNCA** hacer DELETE manual de filas con `requires_fx_repair=TRUE` para "limpiar" el dashboard. Usar el endpoint de repair (idempotente, audit trail completo).
- **NUNCA** modificar la VIEW sin actualizar también: helpers TS, tests anti-regresión KPI, lint rule (si emerge un nuevo anti-patrón), reliability signals.
- Cuando emerja una nueva primitiva de payment (e.g. `treasury_movement`, `intercompany_transfer`), debe nacer con `amount_clp` desde el INSERT (la helper canónica `recordExpensePayment` / `recordIncomePayment` ya resuelven rate histórico al insert) y CHECK constraint anti-NULL desde el day-1.

**Spec canónica**: `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`. Replica los patrones de TASK-571 (settlement reconciliation), TASK-699 (FX P&L breakdown), TASK-721 (canonical helper enforcement), TASK-708/728 (CHECK NOT VALID + VALIDATE atomic).

### Finance — Account balances FX consistency (TASK-774, extiende TASK-766)

`materializeAccountBalance` (`src/lib/finance/account-balances.ts`) **debe** consumir las VIEWs canónicas TASK-766 (`expense_payments_normalized`, `income_payments_normalized`) + COALESCE(`settlement_legs.amount_clp`, ...) para computar `period_inflows`/`period_outflows`. NUNCA `SUM(payment.amount)` directo.

**Por qué**: bug Figma EXP-202604-008 (2026-05-03). Payment USD $92.9 desde TC Santander Corp (cuenta CLP) sumaba +$92.9 nativo en lugar de +$83,773.5 CLP equivalente. Mismo anti-patrón sistémico que TASK-766 cerró para cash-out KPIs, quedó vivo en path account_balances.

**Read API canónico** (extiende TASK-766):

- En `getDailyMovementSummary` (helper privado del materializer):
  - `income_payments`: lee `income_payments_normalized.payment_amount_clp` (VIEW canónica TASK-766).
  - `expense_payments`: lee `expense_payments_normalized.payment_amount_clp` (VIEW canónica TASK-766).
  - `settlement_legs`: COALESCE inline `COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)`. Settlement_legs no tiene VIEW propia (1 callsite, YAGNI; promover a VIEW si emerge segundo callsite).
- Toda agregación SUM se hace sobre el alias resultante del subselect (`SUM(amount)`), NO sobre `SUM(ep.amount)` / `SUM(ip.amount)` / `SUM(sl.amount)` directo.

**Reliability signal canónico**:

- `finance.account_balances.fx_drift` (kind=`drift`, severity=`error` si count>0, steady=0). Recompute expected delta desde VIEWs canónicas + COALESCE settlement_legs y compara contra persisted (`period_inflows - period_outflows`). Tolerancia $1 CLP (anti FP-noise). Ventana 90 días. Reader: `src/lib/reliability/queries/account-balances-fx-drift.ts`. Subsystem rollup: `Finance Data Quality`.

**Lint rule mecánica** (extiende TASK-766):

- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` modo `error`. Nuevos patrones TASK-774:
  - `SUM(ep.amount)` → usar `payment_amount_clp` via `expense_payments_normalized`
  - `SUM(ip.amount)` → usar `payment_amount_clp` via `income_payments_normalized`
  - `SUM(sl.amount)` → usar `COALESCE(sl.amount_clp, CASE WHEN currency='CLP' THEN amount END)`

**Backfill defensivo**:

- Cron diario `ops-finance-rematerialize-balances` rematerializa últimos 7 días automáticamente — el fix se propaga sin script para casos recientes (incluye Figma 2026-05-03).
- Para histórico > 7 días: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-account-balances-fx-fix.ts --account-id=<id> --from-date=<YYYY-MM-DD>` (idempotente, dry-run mode).

**⚠️ Reglas duras** (sumadas a las de TASK-766):

- **NUNCA** leer `expense_payments` / `income_payments` directo en `account-balances.ts` ni en cualquier materializer downstream. Use VIEWs canónicas TASK-766.
- **NUNCA** sumar `settlement_legs.amount` sin COALESCE con `amount_clp`. Settlement_legs tiene columna `amount_clp` opcional desde migration `20260408103211338`.
- **NUNCA** crear materializer nuevo (e.g. `account_balances_monthly`, `treasury_position`, `cashflow_summary`) sin pasar por estas VIEWs. Si emerge necesidad de nueva VIEW (ej. `treasury_movements_normalized` para una nueva primitiva), aplicar el mismo patrón TASK-766 (CTE COALESCE + filtro 3-axis supersede inline + `payment_amount_clp` column).
- Cuando emerja un nuevo callsite que necesite CLP-equivalent, agregar a la VIEW canónica un campo nuevo (e.g. `payment_amount_clp_excluding_fx_gain`) — NO recompute inline.

**Spec canónica**: `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md`. Patrón aplicado al path account_balances después de TASK-766 que cubrió cash-out.

### Finance — Rolling rematerialize anchor contract (TASK-871, supersedes ISSUE-069, 2026-05-13)

Todo callsite que invoque `rematerializeAccountBalanceRange` desde un cron rolling o el remediation control plane **debe** pasar por las dos primitives canónicas:

1. `computeRollingRematerializationWindow(today, lookbackDays)` → `{ targetStartDate, seedDate, materializeStartDate, materializeEndDate, lookbackDays, policy: 'rolling_window_repair' }` ([services/ops-worker/finance-rematerialize-seed.ts](services/ops-worker/finance-rematerialize-seed.ts)).
2. `resolveCleanSeedDate({ client, accountId, candidateSeedDate, maxExpandDays=30 })` → `{ ok: true, cleanSeed, ... }` o `{ ok: false, reason: 'exceeded_max_expand', ... }` ([src/lib/finance/account-balances-clean-seed-resolver.ts](src/lib/finance/account-balances-clean-seed-resolver.ts)).

**Por qué**: el contrato canónico de `rematerializeAccountBalanceRange` ([src/lib/finance/account-balances-rematerialize.ts:258](src/lib/finance/account-balances-rematerialize.ts#L258)) **NO materializa el día seed** — itera desde `seedDate + 1`. El día seed se inserta como ancla muda para preservar reconciliation snapshots TASK-721 y respetar el OTB anchor TASK-703.

**Bug class** (ISSUE-069 partial → TASK-871 complete): el fix de ISSUE-069 cambió `today − lookbackDays` → `today − (lookbackDays + 1)`, moviendo el día ciego un día atrás pero NO eliminando la clase estructural. Si en el `seedDate` resultante existen movements canonicos (`settlement_legs`, `income_payments_normalized`, `expense_payments_normalized`), esos movements quedan invisibles. La clase recurrió el 2026-05-13 con 3 cuentas afectadas en `2026-05-05`.

**Fix canónico** (TASK-871, defense-in-depth):

- El cron handler (services/ops-worker/server.ts) compone window + integrity check per-account:
  - Si protected snapshot en window → anchor on it (skip integrity check; operator-accepted closing IS truth).
  - Si no → `resolveCleanSeedDate(window.seedDate)`. Walks backward hasta clean anchor o devuelve `exceeded_max_expand` para escalar.
- El remediator (`src/lib/finance/account-balances-fx-drift-remediation.ts`) tiene 5to policy value `rolling_window_repair`:
  - classifier: matches seed-blind-spot signature + open period + no protected snapshot en día exacto → `auto_remediable, reason='rolling_window_repair_eligible'`.
  - executor: `seedMode='explicit'` (preserves OTB cache) + `evidenceGuard='block_on_reconciled_drift'` (canonical, no restate over reconciled).
- `computeRematerializeSeedDate` permanece como wrapper back-compat que devuelve `window.seedDate` — tests ISSUE-069 siguen verdes.

**⚠️ Reglas duras**:

- **NUNCA** pasar a `rematerializeAccountBalanceRange` un `seedDate` que tenga `settlement_legs` / `income_payments_normalized` / `expense_payments_normalized` con `transaction_date = seedDate`. La primitive seed = ancla muda; movements ahí desaparecen del materialized. El integrity check `resolveCleanSeedDate` es la única forma canónica de garantizarlo.
- **NUNCA** modificar el contrato de `rematerializeAccountBalanceRange` (seed no se materializa). Es load-bearing para reconciliation snapshots TASK-721 + OTB anchor TASK-703.
- **NUNCA** (TASK-938) materializar `account_balances` con `balance_date < genesis_date` del OTB activo de la cuenta. El `rematerializeAccountBalanceRange` aplica un **genesis floor** vía `applyGenesisFloor` (pura): si el seed resuelto cae antes del genesis, clampea al genesis + opening del OTB. Sin ese floor, un rematerialize en modo `explicit` seedeado < genesis re-crea filas pre-anchor que el cascade TASK-703b prunea (regresión real: global66-clp quedó con filas stale 03-06/04-04 re-creadas ~22h después del cascade). Cualquier callsite nuevo que invoque el rematerializer hereda el floor — NO lo bypasees. Espejo en el detector: `finance.account_balances.fx_drift` ignora fechas `< genesis` (son pre-anchor; el OTB las absorbe), evitando drift artificial. Si emerge necesidad de limpiar filas pre-genesis stale ya existentes, hacerlo vía `cascade_supersede_pre_otb_transactions` (gated, dry-run, ojo con transferencias internas que superseden un solo lado) — NUNCA con DELETE manual.
- **NUNCA** modificar `computeRollingRematerializationWindow` para devolver `seedDate = targetStartDate`. El contracto `seedDate = materializeStartDate − 1` es invariante canónico.
- **NUNCA** usar `seedMode='active_otb'` en un cron rolling. Mutaría `accounts.opening_balance` cache para drift transitorio. Reservado para audited backfills / full replays.
- **NUNCA** usar `evidenceGuard: 'warn_only'` en rolling repair. `warn_only` se reserva para `known_bug_class_restatement` con intent operador explícito.
- **NUNCA** silenciar el escalation cuando `resolveCleanSeedDate` devuelve `ok=false`. El caller DEBE emitir `captureWithDomain('finance', ...)` + skip + permitir escalación humana a `historical_restatement`.
- **NUNCA** crear nuevo callsite que invoque rematerialize sin pasar por las dos primitives. Si emerge un cron nuevo (e.g. `rematerialize-monthly-balances`), extender o componer las primitives; nunca duplicar date math inline.
- **NUNCA** modificar el SQL de `resolveCleanSeedDate` para reducir scope sin extender el reliability signal `finance.account_balances.fx_drift` en paralelo. Drift detection y prevention deben moverse juntos.
- **SIEMPRE** que emerja un nuevo movement primitive (e.g. `treasury_movement`, `intercompany_transfer`, `factoring_leg`), debe ser detectado por `resolveCleanSeedDate` — extender el SQL del helper, NO duplicar lógica inline.
- **SIEMPRE** que se modifique el state machine del rolling repair (window primitive, resolver, classifier, executor), correr el test suite anti-regresión `services/ops-worker/finance-rematerialize-invariants.test.ts` (4 invariantes pin-eados: shape, cleanSeed semantics, escalation, composition).

**Helpers canónicos**:

- Window: [services/ops-worker/finance-rematerialize-seed.ts](services/ops-worker/finance-rematerialize-seed.ts)
- Integrity check: [src/lib/finance/account-balances-clean-seed-resolver.ts](src/lib/finance/account-balances-clean-seed-resolver.ts)
- Remediation policy: [src/lib/finance/account-balances-fx-drift-remediation.ts](src/lib/finance/account-balances-fx-drift-remediation.ts) (`rolling_window_repair` value)
- Cron handler wire-up: [services/ops-worker/server.ts](services/ops-worker/server.ts) `handleFinanceRematerializeBalances`

**Tests anti-regresión**:

- [services/ops-worker/finance-rematerialize-seed.test.ts](services/ops-worker/finance-rematerialize-seed.test.ts) (20 tests: shape, invariants, edge cases, back-compat)
- [src/lib/finance/account-balances-clean-seed-resolver.test.ts](src/lib/finance/account-balances-clean-seed-resolver.test.ts) (11 tests: clean/dirty days, max expand, incident shape)
- [src/lib/finance/account-balances-fx-drift-remediation.test.ts](src/lib/finance/account-balances-fx-drift-remediation.test.ts) (6 new tests: classify, executor, telemetry, skip)
- [services/ops-worker/finance-rematerialize-invariants.test.ts](services/ops-worker/finance-rematerialize-invariants.test.ts) (7 tests: 4 structural invariants + 30-iter property check)

**Diagnostic operator tool**: [scripts/finance/diagnose-fx-drift.ts](scripts/finance/diagnose-fx-drift.ts) — lista detalle por (account, fecha) con drift activo. Útil para verificar qué cuentas necesitan recovery antes de invocar el remediator con policy=`rolling_window_repair`.

**Spec canónica**: `docs/tasks/complete/TASK-871-account-balance-rolling-anchor-contract.md`. Predecesor (parcial): `docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md` (actualizado 2026-05-13 con nota "fix parcial; TASK-871 cierra contrato completo").

### Finance — Account drawer temporal modes contract (TASK-776)

Todo drawer/dashboard de finance que muestre agregaciones temporales DEBE declarar `temporalMode: 'snapshot' | 'period' | 'audit'` (declarado en `instrument-presentation.ts` per categoría) y resolver su ventana via helper canónico `resolveTemporalWindow`. NUNCA calcular `fromDate`/`toDate` inline en consumers.

**Por qué**: el `AccountDetailDrawer` mezclaba 4 surfaces con 4 ventanas temporales independientes sin contract declarado (KPIs acumulados + chart 12m + lista filtrada por mes + banner OTB). Caso real 2026-05-03: balance Santander Corp $1.225.047 correcto post-fix TASK-774, pero lista "Movimientos" vacía porque filtraba Mayo 2026 mientras el cargo Figma fue 29/04. Operador veía "balance bajó pero no veo el cargo" → confusión + ticket.

**Contract canónico** (`src/lib/finance/instrument-presentation.ts` + `src/lib/finance/temporal-window.ts`):

- `TemporalMode = 'snapshot' | 'period' | 'audit'` enum cerrado.
- `TemporalDefaults = { mode: TemporalMode; windowDays?: number }` declarado per profile.
- Helper `resolveTemporalWindow({mode, year?, month?, anchorDate?, windowDays?, today?})` retorna `{fromDate, toDate, modeResolved, label, spanDays}`.
- Degradación honesta: input incompleto (e.g. `mode='period'` sin year/month) cae a snapshot, NO throw silente.

**Defaults declarativos por categoría**:

- `bank_account` / `credit_card` / `fintech` → `snapshot` (windowDays=30) — caso de uso "qué pasa hoy".
- `shareholder_account` (CCA) → `audit` — auditoría completa desde anchor.
- `processor_transit` (Deel/Stripe/etc.) → `period` — cierre mensual comisiones.

**Endpoint** `/api/finance/bank/[accountId]`:

- Query params: `?mode=snapshot|period|audit&windowDays=30&year=2026&month=5&anchorDate=2026-04-07`. Todos opcionales.
- Backward compat 100%: si solo viene `year+month` sin `mode`, comportamiento legacy intacto (`mode='period'` implícito).
- Response incluye `movementsWindow: {fromDate, toDate, mode, label}` para chip header del drawer.

**Drawer**:

- Selector inline `ToggleButtonGroup` con 3 modos (Reciente | Período | Histórico) + tooltips MUI.
- Chip header: "Mostrando: Últimos 30 días" / "Mostrando: Mayo 2026" / "Mostrando: Desde 07/04/2026".
- Banner OTB condicional: SOLO en `mode='audit'` o `'period'` pre-anchor. En `'snapshot'` sin movimientos, hint para cambiar a Histórico.
- `useEffect` resetea `temporalMode` cuando cambia `accountId` (nueva cuenta hereda su default declarativo via primera carga sin override).

**⚠️ Reglas duras**:

- **NUNCA** calcular `fromDate`/`toDate` inline en un drawer/dashboard de finance. Toda resolución pasa por `resolveTemporalWindow`.
- **NUNCA** mezclar modos en surfaces del mismo render (e.g. KPIs `period` + lista `snapshot` simultáneamente). Los 3 modos son atómicos por surface temporal.
- **NUNCA** crear un drawer/dashboard nuevo de finance que muestre agregaciones temporales sin declarar `temporalDefaults` en su `InstrumentDetailProfile`. Default fallback `period` (legacy) solo cubre back-compat — explicitar siempre.
- **NUNCA** hardcodear el `mode` en el componente UI. Default viene del profile (declarativo, extensible). Operator override via selector inline.
- Cuando emerja un nuevo modo (`quarter`, `ytd`, `last_n_months`), agregar al enum `TemporalMode` + extender helper. NO branchear en consumers.

**Spec canónica**: `docs/tasks/in-progress/TASK-776-account-detail-drawer-temporal-modes-contract.md`. Doc funcional: `docs/documentation/finance/drawer-vista-temporal.md`.

### Finance — Economic Category Dimension Invariants (TASK-768)

**`expense_type` y `income_type` son taxonomía FISCAL/SII** (legacy `accounting_type` alias). Para análisis económico (KPIs, ICO, P&L gerencial, Member Loaded Cost, Budget Engine, Cost Attribution) se usa la dimension separada **`economic_category`** persistida en `greenhouse_finance.expenses.economic_category` y `income.economic_category`.

**Por qué**: el bank reconciler defaultea `expense_type='supplier'` cuando crea expenses desde transacciones bancarias sin metadata rica. Eso sesga KPIs Nómina/Proveedores en mil-millones cuando un payment económicamente-payroll cae en bucket fiscal-supplier (caso real abril 2026: ~$3M en pagos a Daniela España, Andrés Colombia, Valentina, Humberly, Previred clasificados como Proveedor cuando económicamente son Nómina).

**Decision tree para nuevo código**:

- ¿Es lectura para SII / VAT / IVA / regulatory? → usa `expense_type` / `income_type`.
- ¿Es lectura para KPIs / dashboards / P&L gerencial / ICO / cost attribution? → usa `economic_category`.

**API canónico**:

- VIEW `expense_payments_normalized` y `income_payments_normalized` (TASK-766 + TASK-768 extendidas) exponen ambas dimensiones via JOIN.
- Helpers `sumExpensePaymentsClpForPeriod` / `sumIncomePaymentsClpForPeriod` retornan `byEconomicCategory` breakdown (11 keys expense, 8 keys income) + `economicCategoryUnresolvedCount` + campos legacy preservados (backwards-compat TASK-766).
- Resolver canónico `resolveExpenseEconomicCategory(...)` / `resolveIncomeEconomicCategory(...)` (`src/lib/finance/economic-category/resolver.ts`) — único helper que mapea inputs a categoría con rules engine declarativo.
- Reclassification endpoints: `PATCH /api/admin/finance/expenses/[id]/economic-category` + mirror income (capability granular `finance.expenses.reclassify_economic_category` / `finance.income.reclassify_economic_category`, FINANCE_ADMIN + EFEONCE_ADMIN, audit log + outbox `finance.expense.economic_category_changed` v1).
- Manual queue: `greenhouse_finance.economic_category_manual_queue` para filas con confidence low/manual_required pendientes de operador.
- Audit log append-only: `economic_category_resolution_log` (trigger anti-update/delete).

**Defensa-en-profundidad**:

- Trigger PG `populate_expense_economic_category_default_trigger` BEFORE INSERT — poblar default desde transparent map de `expense_type` (cero invasivo a 12 canonical writers existentes).
- Trigger mirror `populate_income_economic_category_default_trigger`.
- CHECK constraint `expenses_economic_category_required_after_cutover` (NOT VALID; VALIDATE post-resolución manual queue).
- CHECK constraint `expenses_economic_category_canonical_values` (VALIDATED — 11 valores enumerados; 8 income).
- Lint rule `greenhouse/no-untokenized-expense-type-for-analytics` modo `error` — bloquea `e.expense_type =`, `GROUP BY e.expense_type`, `FILTER (WHERE i.income_type ...)` en código nuevo. Override block exime SII/VAT/operacional/resolver.
- Reliability signals canónicos: `finance.expenses.economic_category_unresolved` + `finance.income.economic_category_unresolved` (kind=drift, severity=error si count>0, steady=0 post-cleanup, subsystem `finance_data_quality`).

**⚠️ Reglas duras**:

- **NUNCA** filtres/agrupes por `expense_type` / `income_type` en consumers analíticos. Lint rule rompe build.
- **NUNCA** modifiques `expense_type` legacy histórico — está reservado para SII/VAT y blast radius enorme.
- **NUNCA** poblar `economic_category` con string libre — solo valores del enum canónico (CHECK constraint `canonical_values` lo bloquea).
- **NUNCA** computes `economic_category` en read-time (lente derivada). Es columna persistida; consumers la leen directo.
- **NUNCA** bypass del resolver canónico. Si emerge un nuevo path de payments (ej. wallets, intercompany), debe llamar `resolveExpenseEconomicCategory` / `resolveIncomeEconomicCategory` o agregar regla nueva al rules engine.
- Cuando emerja un nuevo proveedor regulador chileno (otra Isapre, AFP nueva) o vendor de payroll internacional (Multiplier++, etc.), agregar fila a `greenhouse_finance.known_regulators` o `known_payroll_vendors` (seed declarativo) — NO código nuevo.

**Spec canónica**: `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`. Patrones reusados: TASK-571/699/721/708/728/766 (mismo shape: VIEW canónica + helper + reliability + lint + CHECK + trigger).

### Finance — Reactive projections en lugar de sync inline a BQ (TASK-771)

Post-cutover PG-first, **toda proyección a BigQuery debe correr async vía consumer reactivo del outbox**, NUNCA inline en el request handler. La regla canónica es:

```text
tx PG (write + emit outbox event)  →  outbox event        →  reactive consumer (ops-worker)
        ↓ commitea atómico                ↓ pending             ↓ cron 5 min Cloud Scheduler
        respond 201/200 al cliente        ↓ published           MERGE BQ idempotente
                                                                retry+dead-letter automático
                                                                reliability signal cubre drift
```

**Por qué**: el incidente 2026-05-03 ("Error al crear proveedor" silencioso) ocurrió porque `syncProviderFromFinanceSupplier` ([src/lib/providers/canonical.ts](../src/lib/providers/canonical.ts)) ejecutaba MERGE BQ + UPDATE BQ + DDL inline en el POST/PUT supplier handler. Cualquier falla BQ devolvía 500 al cliente aunque PG ya hubiese commiteado, dejando 3 suppliers persistidos silenciosamente sin que el operador lo supiera (figma-inc, microsoft-inc, notion-inc).

**Helpers canónicos**:

- **Projection registration**: `registerProjection(...)` en `src/lib/sync/projections/index.ts`. Cada projection es un `ProjectionDefinition` ([src/lib/sync/projection-registry.ts](../src/lib/sync/projection-registry.ts)) con `triggerEvents`, `extractScope`, `refresh`, `maxRetries`. El dispatcher V2 (`src/lib/sync/reactive-consumer.ts`) hace el fetch/grouping/dead-letter/circuit-breaker automáticamente.
- **Re-leer de PG en `refresh`**: NUNCA confiar en payload del outbox event como source of truth. Usar el `entityId` del scope para re-leer la fila desde su tabla canónica (e.g. `getFinanceSupplierFromPostgres(entityId)`). Esto garantiza consistencia ante updates posteriores al evento o backfills con payloads stale.
- **Idempotencia**: el `refresh` debe ser safe re-run. MERGE por PK natural + UPDATE filtrado con `COALESCE diff` son los patrones más comunes.
- **Reliability signal**: cada projection crítica debe tener su signal `dead_letter` en `src/lib/reliability/queries/<projection>-dead-letter.ts` (clonar de `provider-bq-sync-dead-letter.ts` o `payment-orders-dead-letter.ts`). Wire-up en `get-reliability-overview.ts`. Steady=0; >0 indica que la projection está en dead-letter y un consumer downstream verá datos stale.
- **Backfill script one-shot**: `scripts/finance/backfill-<projection>.ts` (clonar de `scripts/finance/backfill-provider-bq-sync.ts`) para recovery manual. Idempotente. NO se corre LIVE desde local; el ops-worker auto-drena post-deploy.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `bigQuery.query({MERGE INTO ...})`, `UPDATE`, o `INSERT` BigQuery dentro de un route handler `route.ts`. La proyección va a una projection registrada.
- **NUNCA** llamar `ensureFinanceInfrastructure()` / `ensureAiToolingInfrastructure()` desde un route handler en hot path. Bootstrap BQ vive en startup del worker o en migration explícita BigQuery.
- **NUNCA** propagar una falla BQ como 500 cuando la primary store (PG) commiteó. Si BQ falla y la operación es síncrona inevitable, envolver en try/catch + `captureWithDomain(err, 'finance', { tags: { source: '<sync_name>', stage: '<...>' } })` y devolver el response basado en datos PG.
- **NUNCA** usar `Sentry.captureException()` directo en code paths con dominio claro. Usar `captureWithDomain(err, '<domain>', ...)` desde `src/lib/observability/capture.ts` para que reliability dashboards roleen el incidente al subsystem correcto.
- Cuando emerja una nueva proyección downstream (Snowflake mart, search index, AI tooling cache, etc.), debe nacer como `ProjectionDefinition` consumiendo el outbox event relevante. NUNCA acoplada al request path.
- El BQ-fallback path en finance routes (cuando PG está caído) sí puede mantener sync inline porque ahí el outbox no es accesible — pero envuelto en try/catch para no bloquear el response degraded.

**Spec canónica**: `docs/tasks/complete/TASK-771-finance-supplier-write-decoupling-bq-projection.md`. Patrón reusable end-to-end: para futuras projections finance, clonar la estructura de `provider_bq_sync` (projection + reliability signal + backfill script).

### Finance — Expense display contract (TASK-772)

Toda lectura de `greenhouse_finance.expenses` que vaya a UI o exports **debe** consumir el contract canónico extendido de `FinanceExpenseRecord`. Resuelve identidad del proveedor, fecha de orden y monto pendiente sin que el consumer tenga que recomputar joins ni semántica financiera.

**Campos derivados canónicos** (resueltos server-side via LEFT JOIN suppliers + LEFT JOIN LATERAL aggregate desde VIEW canónica TASK-766 `expense_payments_normalized`):

- **`supplierDisplayName`** — `COALESCE(NULLIF(TRIM(expenses.supplier_name), ''), suppliers.trade_name, suppliers.legal_name)`. Display canónico que tolera datos legacy con `supplier_name=NULL`.
- **`sortDate`** — `COALESCE(document_date, payment_date, created_at::date)`. Una obligación se identifica primero por su emisión, luego por cuándo se va a pagar, finalmente por cuándo se creó.
- **`amountPaidClp`** — `SUM(payment_amount_clp)` desde la VIEW. CLP-safe sin importar mix de monedas en payments.
- **`amountPaid`** — moneda original del documento. Best-effort:
  - `currency='CLP'` → igual a amountPaidClp (1:1)
  - `currency != 'CLP'` + payments homogéneos → `SUM(payment_amount_native)`
  - mix de monedas (caso CCA TASK-714c) → **null + `amountPaidIsHomogeneous=false`**
- **`pendingAmountClp`** = `total_amount_clp - amountPaidClp` (clamp ≥0). Siempre confiable.
- **`pendingAmount`** = `total_amount - amountPaid` (null cuando heterogéneo).

**Defense-in-depth supplier snapshot**:

- **Reader fallback** (lectura): el LEFT JOIN suppliers resuelve `supplierDisplayName` para datos legacy. Inmediato sin migration.
- **Writer snapshot** (escritura): POST `/api/finance/expenses` resuelve `supplier_name` desde la tabla suppliers cuando viene `supplierId` sin name. FinanceValidationError 400 si supplierId no existe. Garantiza que registros nuevos no nazcan con FK válida pero `supplier_name=NULL`.

**CTE en INSERT/UPDATE para outbox payload completo**:

`createFinanceExpenseInPostgres` y `updateFinanceExpenseInPostgres` envuelven el `RETURNING *` en un `WITH inserted/updated AS (...)` + LEFT JOIN suppliers + LEFT JOIN LATERAL aggregate, garantizando que el outbox event payload (`finance.expense.created/updated`) tenga el contract completo desde la misma transacción. Sin esto, los consumers del outbox recibirían `supplierDisplayName=null` y `pendingAmountClp=0` aunque la fila tuviera datos correctos en lecturas posteriores.

**⚠️ Reglas duras**:

- **NUNCA** lee `expenses.supplier_name` directo en consumers UI. Usar siempre `supplierDisplayName` del contract.
- **NUNCA** recomputa `pendingAmount = totalAmountClp - amountPaid` en consumers (mezcla CLP con currency original — root cause del bug Cash-Out 2026-05-03 que mostraba `USD 83.773,50` en lugar de `USD 92,90`). Usar `pendingAmount` (moneda original) o `pendingAmountClp` (CLP) según el contexto.
- **NUNCA** invente conversiones FX cuando `amountPaid=null` (mix de monedas heterogéneo). Caer a `amountPaidClp` con disclaimer "(equiv. CLP)" — es honesto y respeta TASK-766 contract.
- **NUNCA** agrupe documentos en UI por `supplierName || 'Sin proveedor'`. Use `supplierKey = supplierId || supplierDisplayName || supplierName || '__unassigned__'` (estable e idempotente). El label visible es `supplierDisplayName ?? supplierName ?? 'Sin proveedor'`. "Sin proveedor" solo aplica cuando NO hay supplierId Y NO hay display name.
- **NUNCA** sortear obligaciones client-side por `paymentDate` solo. Usar `sortDate` (server-side) o respetar el orden natural del backend.
- **NUNCA** crear expense con `supplierId` que no existe en la tabla. El POST handler valida y devuelve 400 con error claro.
- Cuando emerja un nuevo entity con problema análogo (ej. `income.client_name` snapshot vs `clients` tabla), replicar el patrón: extender reader con LEFT JOIN canónico + writer snapshot hydration + tests regresión.

**Spec canónica**: `docs/tasks/complete/TASK-772-finance-expense-supplier-hydration-cash-out-selection.md`. Patrón replicable a `income`, `payment_orders` y futuros agregados que mezclen identidad referenciada + amounts en moneda mixta.

### Outbox publisher canónico — Cloud Scheduler, no Vercel (TASK-773)

El **outbox publisher** mueve eventos de `greenhouse_sync.outbox_events` (Postgres) a `greenhouse_raw.postgres_outbox_events` (BigQuery) y los marca como `status='published'`. El **reactive consumer** (que materializa projections downstream — account_balance, provider_bq_sync, etc.) filtra `WHERE status='published'`. Si el publisher está caído o un batch persiste fallando, NINGUNA projection corre, NINGUN account_balance se rematerializa, NINGUN downstream side effect ocurre.

**El publisher canónico vive en Cloud Scheduler + ops-worker, NO en Vercel cron**:

- `Cloud Scheduler ops-outbox-publish` (cron `*/2 min`) → `POST /outbox/publish-batch` en ops-worker.
- Helper canónico: `publishPendingOutboxEvents` ([src/lib/sync/outbox-consumer.ts](../src/lib/sync/outbox-consumer.ts)) con state machine atómica.
- Endpoint: `services/ops-worker/server.ts:handleOutboxPublishBatch`.

**Por qué Cloud Scheduler y no Vercel cron**: Vercel solo ejecuta crons en deploys de **Production**. Staging custom environment **no los corre**. Eso significa que **cualquier flow async que dependa del outbox queda invisible en staging** (root cause del incidente Figma 2026-05-03 cuando el pago no rebajaba TC). Cloud Scheduler corre por proyecto GCP, igual en staging y prod, sin distinción.

**State machine canónica**:

```text
                 ┌──────────────┐
                 │   pending    │  (writer INSERT default)
                 └──────┬───────┘
                        │ SELECT FOR UPDATE SKIP LOCKED
                        ▼
                 ┌──────────────┐
                 │  publishing  │  (worker tomó el lock)
                 └──┬───────┬───┘
            BQ OK   │       │   BQ FAIL
                    ▼       ▼
            ┌───────────┐  ┌─────────┐
            │ published │  │ failed  │  (retries++)
            └───────────┘  └────┬────┘
                                │ retries >= OUTBOX_MAX_PUBLISH_ATTEMPTS (5)
                                ▼
                          ┌─────────────┐
                          │ dead_letter │  (humano interviene)
                          └─────────────┘
```

**Reliability signals canónicos** (visibles en `/admin/operations`):

- `sync.outbox.unpublished_lag` — events `pending`/`failed` con edad > 10 min. Steady=0. Si > 0, publisher caído o falla persistente.
- `sync.outbox.dead_letter` — events agotaron retries. Steady=0. Cualquier > 0 requiere humano: replay manual o investigación root cause.

**⚠️ Reglas duras**:

- **NUNCA** agregar nuevos crons de outbox/event-bus/projection-refresh a `vercel.json`. Solo se permiten crons Vercel para tareas que pueden correr únicamente en producción (e.g. backfill nocturno, scheduled report). Los crons del path async crítico van a `services/ops-worker/deploy.sh`.
- **NUNCA** modificar la state machine sin actualizar la CHECK constraint `outbox_events_status_check` + comentario en CLAUDE.md.
- **NUNCA** filtrar eventos por `WHERE status='pending'` en consumers downstream. El reactive consumer canónico filtra `'published'`. Si necesitas un consumer que toque pending (e.g. UI de troubleshooting), declara explícitamente el contract.
- **NUNCA** catch + swallow errores del helper `publishPendingOutboxEvents`. La state machine atómica se basa en que la tx PG complete o aborte limpio.

**Spec canónica**: `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md`. Patrón replicable: cuando emerja otro Vercel cron infrastructure-critical (TASK-258 sync-conformed pipeline, TASK-259 entra-profile-sync), seguir el mismo template (helper canónico → endpoint ops-worker → Cloud Scheduler job → reliability signal).

### Production Release Control Plane invariants (TASK-848)

La promoción `develop → main` vive en un control plane canónico con manifest persistido + state machine append-only + capabilities granulares + concurrency fix kills bug class del incidente 2026-04-26 → 2026-05-09. Todo release production debe respetar estos invariantes — son los que evitan que workflows queden deadlocked, que rollback aplique revisión incorrecta, o que un release degraded quede silente sin rollback.

**Read API canónico**:

- Tablas: `greenhouse_sync.release_manifests` (manifest persistido, source of truth) + `greenhouse_sync.release_state_transitions` (audit append-only). Anti-UPDATE/DELETE triggers enforced. Schema `greenhouse_sync` (NO `greenhouse_ops` que es ROLE).
- PK formato `<targetSha[:12]>-<UUIDv4>` via `randomUUID()`. Ordering via INDEX `(target_branch, started_at DESC)`.
- State machine cerrado (8 estados): `preflight → ready → deploying → verifying → released | degraded | aborted`; `released → rolled_back`; `degraded → rolled_back | released`. CHECK constraint a nivel DB.
- Partial UNIQUE INDEX `WHERE state IN ('preflight','ready','deploying','verifying')` garantiza 1 release activo por branch.
- Outbox events versionados v1: `platform.release.{started, deploying, verifying, released, degraded, rolled_back, aborted}`. Documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- 3 capabilities granulares least-privilege: `platform.release.execute` (EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->), `platform.release.rollback` (EFEONCE_ADMIN solo), `platform.release.bypass_preflight` (EFEONCE_ADMIN solo, requiere `reason >= 20 chars` + audit).

**Concurrency fix Opción A (V1 deployed)**:

```yaml
concurrency:
  group: <worker>-deploy-${{ github.ref }}
  cancel-in-progress: ${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production') || github.ref == 'refs/heads/main' }}
```

Aplicado a 3 worker workflows (`ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `ico-batch-deploy.yml`). Mata el bug class del incidente histórico: pushes nuevos a production cancelan stale pending en lugar de quedar deadlocked. Staging preserva `cancel-in-progress: false`.

**Reliability signals canónicos** (subsystem `Platform Release`, V1 deployed = 2 of 4):

- `platform.release.stale_approval` (kind=drift, severity warning>24h err>7d). Detecta runs production "waiting" del environment Production. Steady=0.
- `platform.release.pending_without_jobs` (kind=drift, severity error si count>0 sostenido >5min). Detecta runs queued/in_progress con `jobs.length===0`. Steady=0 = concurrency fix Opción A operando.
- `platform.release.deploy_duration_p95` (V1.1 — TASK-854): kind=lag, p95 release ventana 30d.
- `platform.release.last_status` (V1.1 — TASK-854): kind=drift, último release `degraded|aborted|rolled_back`.

Ambos consultan GitHub API via `GITHUB_RELEASE_OBSERVER_TOKEN` con degradación honesta (severity=`unknown` sin token).

**Rollback CLI canónico** (`scripts/release/production-rollback.ts`):

- Vercel alias swap: `vercel alias set <PREV_URL> greenhouse.efeoncepro.com` (atomic).
- Cloud Run workers: `gcloud run services update-traffic <svc> --to-revisions=<prev>=100` por cada worker.
- HubSpot integration Cloud Run: mismo patrón.
- **Azure config / Bicep**: NO automático V1 — manual gated en runbook `docs/operations/runbooks/production-release.md` con `az deployment group what-if` mandatory antes de apply.

**⚠️ Reglas duras**:

- **NUNCA** disparar release production sin pasar por workflow orquestador (V1.1 — TASK-851). Workers deploy directo queda reservado para break-glass documentado.
- **NUNCA** modificar `release_manifests.{release_id, target_sha, started_at, triggered_by, attempt_n}` post-INSERT. Anti-immutable trigger lo bloquea.
- **NUNCA** hacer DELETE de filas en `release_manifests` o `release_state_transitions`. Append-only enforced por trigger PG. Para correcciones, INSERT nueva fila con `metadata_json.correction_of=<previous_id>`.
- **NUNCA** transicionar `state` fuera del matrix canónico. `released → deploying` o `aborted → *` están prohibidos: create new release row.
- **NUNCA** introducir un signal coarse `platform.release.pipeline_health` que lumpee multiples failure modes. Greenhouse pattern es 1 signal por failure mode (TASK-742, TASK-774, TASK-768).
- **NUNCA** loggear secrets/tokens/JWT/refresh tokens/payload completo Vercel/GCP/Azure response sin pasar por `redactErrorForResponse` o `redactSensitive`.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: '<...>' } })` para que el rollup `Platform Release` lo recoja.
- **NUNCA** rollback automático de Azure config/Bicep en V1. Manual gated en runbook hasta demostrar reapply safe + reversible (TASK-853).
- **NUNCA** crear tabla nueva paralela a `release_manifests` para tracking de workflow runs (extender, no parallelizar).
- **NUNCA** mezclar dimensiones en state machine: `state` es lifecycle del release; outcome de cada step (Vercel ok, worker ok, Azure ok) vive en `post_release_health JSONB`, NO como variantes del enum.
- **NUNCA** revertir el concurrency fix dynamic expression a `cancel-in-progress: false` en los 3 worker workflows production. Reintroduce el deadlock determinista del incidente 2026-04-26 → 2026-05-09.
- **SIEMPRE** que un release entre `state IN ('degraded','aborted','rolled_back')`, escalar via outbox event + reliability signal `platform.release.last_status` (V1.1).
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo al `RELEASE_DEPLOY_WORKFLOWS` canonico en `src/lib/release/workflow-allowlist.ts` (TASK-849 Slice 0 — single source of truth) + verificar WIF subjects para `environment:production`.
- **SIEMPRE** que se modifique el state machine, actualizar AMBOS: CHECK constraint DB en migration nueva + tipo TS `ReleaseState` (V1.1) + tabla en spec V1 + ADR.

**Spec canónica**: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`. Runbook operativo: `docs/operations/runbooks/production-release.md`. Migration: `migrations/20260510111229586_task-848-release-control-plane-foundation.sql`. V1.1 follow-ups (4 tasks compactadas): TASK-850 (Preflight CLI), TASK-851 (Orchestrator + Worker SHA), TASK-853 (Azure gating), TASK-854 (2 signals + Dashboard).

### Production Release Watchdog invariants (TASK-849)

Watchdog manual-only temporal (desde 2026-05-24 hasta TASK-920) que detecta los 3 sintomas del incidente 2026-04-26 → 2026-05-09 (stale approvals + pending sin jobs + worker revision drift). Originalmente corría scheduled en GitHub Actions y emitía alertas Teams a `production-release-alerts`; el schedule se pausó porque los últimos 100 runs tuvieron 72 fallos y generaban falsos positivos. El workflow remoto quedó `disabled_manually` como emergency stop mientras `main` conserva el schedule viejo; usar CLI local hasta promover el archivo sin `schedule` y re-enablear el workflow.

**Helpers canonicos** (V1.0 + V1.1 obligatorios al tocar release watchdog):

- `src/lib/release/github-helpers.ts` — `resolveGithubToken` (async, GH App primary → PAT fallback), `resolveGithubTokenSync` (back-compat PAT-only), `buildGithubAuthHeaders`, `fetchGithubWithTimeout`, `githubRepoCoords`, `assertGithubResponseOk`, `githubFetchJson`. Single source of truth para todas las queries GitHub API observer-only.
- `src/lib/release/github-app-token-resolver.ts` — `resolveGithubAppInstallationToken()` async con cache + JWT mint. Mint flow: cache hit → JWT firmado RS256 con private key → POST `/app/installations/<id>/access_tokens` → cache 1h con renovacion 5min antes expiry. Degradacion canonica: si GH App config faltante o JWT mint falla, retorna null y caller fallback a PAT.
- `src/lib/release/workflow-allowlist.ts` — `RELEASE_DEPLOY_WORKFLOWS` canonical array (6 workflows + Cloud Run service mapping para drift detection). `RELEASE_DEPLOY_WORKFLOW_NAMES` set O(1) lookup. `WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION` filtered subset (4 workflows). `findWorkflow()` lookup.
- `src/lib/release/severity-resolver.ts` — `WatchdogSeverity` superset (`ok|warning|error|critical`), `WATCHDOG_THRESHOLDS` frozen, 3 resolvers per detector, `aggregateMaxSeverity`, `severityRank`, `isSeverityEscalation`, `watchdogSeverityToReliabilitySeverity` (collapse critical→error).
- `src/lib/release/watchdog-alerts-dispatcher.ts` — `dispatchWatchdogAlert()` + `dispatchWatchdogRecovery()` con dedup atomic + at-least-once Teams delivery + `clearDedupRow()`.

**3 reliability signals canónicos** (subsystem `Platform Release`, steady=0):

- `platform.release.stale_approval` (TASK-848 V1.0) — runs `waiting` con Production approval. warning>24h, error>7d (reader); warning>2h, error>24h, critical>7d (watchdog).
- `platform.release.pending_without_jobs` (TASK-848 V1.0) — runs queued/in_progress con `jobs.length === 0`. error>5min (reader); warning>5min, error>30min (watchdog).
- `platform.release.worker_revision_drift` (TASK-849 V1.0) — Cloud Run latest revision SHA != ultimo workflow run success SHA. error si drift confirmado, warning si data_missing (NO falso positivo).

**Tabla dedup** `greenhouse_sync.release_watchdog_alert_state`:

- PK compuesta `(workflow_name, run_id, alert_kind)` permite mismo run con kinds distintos por escalation
- CHECK enum cerrado sobre `alert_kind` y `last_alerted_severity`
- Owner `greenhouse_ops`, GRANT SELECT/INSERT/UPDATE/DELETE a `greenhouse_runtime` (NO triggers anti-DELETE — cuando blocker se resuelve, row se borra)
- Indexes: `(first_observed_at)` para recovery sweep, `(workflow_name, alert_kind, last_alerted_at DESC)` para drilldown

**Capability granular**: `platform.release.watchdog.read` (scope=all, EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->). NO reusa `platform.release.execute` — semantica distinta (leer estado vs disparar release).

**GitHub auth strategy canonica (V1.1)**: GitHub App installation token primary, PAT fallback. Setup one-time documented en runbook §8.1 (App ID + Installation ID + private key en GCP Secret Manager `greenhouse-github-app-private-key`). Vercel env vars: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF`. Costo: $0 GitHub side, ~$0.72/anio GCP secret. Beneficios sobre PAT: token NO ligado a usuario, rate limit 15K req/h vs 5K, auditoria per-installation.

**Worker GIT_SHA env var** (TASK-849 Slice 1): pre-requisito para `worker_revision_drift` reader. Cada worker emite `GIT_SHA` env var con commit SHA del deploy. Resolution: `$GITHUB_SHA → git rev-parse HEAD → 'unknown'`. Workers sin GIT_SHA aun deployado producen `data_missing` (NO falso drift).

**Hosting decision vigente**: manual-only hasta TASK-920. Hosting decision original: GitHub Actions schedule (NO Vercel cron, NO Cloud Scheduler), porque el detector consume primariamente GH API. No reactivar schedule sin corregir falsos positivos/failures en TASK-920 o documentar incidente explícito.

**Concurrency**: `cancel-in-progress: true` en watchdog workflow. La ultima foto siempre gana — NO causa deadlock como los workers pre-TASK-848 porque watchdog NO tiene environment approval gate.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `gh run cancel` o `gh run approve` automaticamente desde el watchdog. El watchdog SOLO recomienda; humano decide.
- **NUNCA** reactivar el schedule del watchdog antes de TASK-920 sin justificarlo como incidente explícito y documentar evidencia. Mientras esté manual-only, ejecutar `workflow_dispatch`/CLI post-release cuando se necesite una foto.
- **NUNCA** introducir un signal coarse `platform.release.watchdog.health` que lumpee los 3 failure modes. Greenhouse pattern (TASK-742, TASK-774, TASK-768) es 1 signal por failure mode.
- **NUNCA** loggear payload completo de respuesta GitHub/Cloud Run sin pasar por `redactSensitive`/`redactErrorForResponse`. GitHub responses pueden incluir email del actor que dispara el run.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release_watchdog', stage: '<...>' } })`.
- **NUNCA** crear endpoint admin `/api/admin/release-watchdog/*` en V1. Out of scope; el watchdog corre solo en GitHub Actions + CLI local.
- **NUNCA** persistir history de findings en PG en V1. YAGNI hasta que TASK-851 orchestrator manifest exista. La derivacion on-demand del estado GH Actions + Cloud Run es suficiente para forensic.
- **NUNCA** alertar Slack ni cualquier canal que no sea Teams via helper canonico `sendManualTeamsAnnouncement`. Greenhouse opera en Teams.
- **NUNCA** comparar worker revision drift contra `main` HEAD (ruido — main HEAD puede tener commits que no tocaron worker paths). Comparar contra ultimo workflow run `success`.
- **NUNCA** modificar el contract JSON output del CLI sin bumpear version + actualizar consumer en preflight CLI futuro (TASK-850).
- **NUNCA** duplicar los helpers canonicos del watchdog en otros code paths del control plane. Single source of truth en `src/lib/release/`.
- **NUNCA** persistir `last_alerted_severity='ok'` en la tabla dedup. CHECK constraint lo bloquea — recovery se maneja via DELETE row.
- **NUNCA** committear el GitHub App private key (`.pem`) al repo. Solo via GCP Secret Manager. Borrar el `.pem` local con `shred -u` despues de subir.
- **NUNCA** crear PAT con scopes mas amplios que `Actions:read + Deployments:read + Metadata:read`. Si emerge necesidad de mas permisos, evaluar primero si GH App lo cubre (preferred).
- **NUNCA** usar `resolveGithubTokenSync` en code paths nuevos. Es back-compat layer V1.0; nuevos consumers usan `resolveGithubToken` async para preferir GH App.
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` en `src/lib/release/workflow-allowlist.ts` ANTES del primer deploy. Sin esto el watchdog NO lo detecta.
- **SIEMPRE** que el dispatcher Teams falle, mantener at-least-once delivery: NO actualizar dedup state si Teams send failed. Aceptable: alert duplicado en re-try vs alert perdido.

**Spec canónica**: TASK-849 → `docs/tasks/complete/TASK-849-production-release-watchdog-alerts.md`. Runbook operativo: `docs/operations/runbooks/production-release-watchdog.md`. Migration: `migrations/20260510122723670_task-849-watchdog-alert-state.sql`. CLI: `pnpm release:watchdog [--json|--fail-on-error|--enable-teams|--dry-run]`.

**Setup completado live (2026-05-10)**:

| Componente | Valor canonico |
|---|---|
| GitHub App | `Greenhouse Release Watchdog` (slug `greenhouse-release-watchdog`, App ID `3665723`) — https://github.com/apps/greenhouse-release-watchdog |
| Installation | ID `131127026` en `efeoncepro` org, scope `All repositories` |
| Permissions | `Actions: Read-only`, `Deployments: Read-only`, `Metadata: Read-only` |
| GCP Secret | `greenhouse-github-app-private-key` (Secret Manager, project `efeonce-group`, replication automatic, version 1) |
| Vercel env vars production | `GITHUB_APP_ID=3665723`, `GITHUB_APP_INSTALLATION_ID=131127026`, `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key` |

**Setup scripts canonicos**:

- `pnpm release:setup-github-app` — flow completo end-to-end (manifest creation + install + GCP upload + Vercel config + redeploy). 2 clicks browser + 3 confirmaciones CLI. Bugs corregidos en commit `655e653d`: race condition `/start` ↔ `/callback`, `hook_attributes` validation, PKCS#1 vs PKCS#8.
- `pnpm release:complete-github-app-setup --app-id=<N> --installation-id=<N> --pem-file=<path>` — recovery script si setup-github-app crashea mid-flow. Reusa App ya creado, solo necesita private key nuevo via UI.

**Verificacion live ejecutada 2026-05-10**: GH App resolver path validado end-to-end. Mintea JWT con private key (PKCS#1 o PKCS#8), exchange por installation token (cache 1h), readers retornan severity real:

```bash
GCP_PROJECT=efeonce-group GITHUB_APP_ID=3665723 \
  GITHUB_APP_INSTALLATION_ID=131127026 \
  GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key \
  pnpm release:watchdog --json
# stale_approval: ok ✓
# pending_without_jobs: ok ✓
# worker_revision_drift: warning (data_missing — esperado pre-merge develop→main)
```

**Estado vigente 2026-05-24**:

1. Workflow `production-release-watchdog.yml` mantiene `workflow_dispatch`.
2. Schedule removido temporalmente por ruido/falsos positivos.
3. TASK-920 debe corregir la semántica antes de reactivar alertas automáticas.

### Production Preflight CLI invariants (TASK-850)

CLI `pnpm release:preflight` que ejecuta los **12 checks fail-fast** ANTES de promover `develop → main`. Composer pattern (TASK-672 mirror) con timeout independiente por check, output JSON machine-readable + humano, y `readyToDeploy` boolean conservador. Es el gate canonico que TASK-851 orchestrator workflow + TASK-855 dashboard van a consumir.

**Read API canonico**:

- Composer puro: `composeFromCheckResults(input)` en `src/lib/release/preflight/composer.ts` — worst-of-N rollup (any error → blocked, any warning → degraded, all ok → healthy, else unknown). `readyToDeploy = healthy AND zero degraded sources` (conservador).
- Runner async: `runPreflight({audience, input, checks})` en `src/lib/release/preflight/runner.ts` — Promise.all + `withSourceTimeout` per-check (default 6s, override per registry entry). Defensive composer-level catch produces all-placeholders payload sin throw.
- Registry canonico: `PREFLIGHT_CHECK_REGISTRY` en `src/lib/release/preflight/registry.ts` — single source of truth de los 12 check definitions. Adding/reordering requires extending `PreflightCheckId` union + `PREFLIGHT_CHECK_ORDER` array.
- Contract versionado: `PRODUCTION_PREFLIGHT_CONTRACT_VERSION = 'production-preflight.v1'`. Breaking shape changes bumpean v2; new optional fields no requieren bump.
- Helper canonico para integraciones GitHub: reusa `src/lib/release/github-helpers.ts` (TASK-849), `RELEASE_DEPLOY_WORKFLOW_NAMES` (workflow-allowlist), `listWaitingProductionRuns` (TASK-848 V1.0 reader extracted), `listPendingRuns` (TASK-848 V1.0 reader extracted).

**12 checks canonicos** (orden estable):

| # | checkId | Severity strict/degraded | Source |
|---|---|---|---|
| 1 | target_sha_exists | strict (404 → error) | GitHub API |
| 2 | ci_green | strict (any failure → error) | GitHub API |
| 3 | playwright_smoke | strict (failure → error, missing → warning) | GitHub API |
| 4 | release_batch_policy | strict (split_batch \| requires_break_glass → error) | git diff local |
| 5 | stale_approvals | strict (>=7d → error, >24h → warning) | GitHub API |
| 6 | pending_without_jobs | strict (any → error, sintoma deadlock) | GitHub API |
| 7 | vercel_readiness | degraded (warning; bloquea production normal via `readyToDeploy=false`) | Vercel API |
| 8 | postgres_health | strict (pg:doctor fail → error) | subprocess pnpm |
| 9 | postgres_migrations | strict (pending → error) | subprocess pnpm |
| 10 | gcp_wif_subject | strict (drift → error) | gcloud CLI |
| 11 | azure_wif_subject | degraded (warning; bloquea production normal via `readyToDeploy=false`) | az CLI |
| 12 | sentry_critical_issues | strict (>=10 → error, 1-9 → warning, API down → unknown bloquea) | Sentry API |

**Check #4 release_batch_policy** (mas novel): clasifica diff `origin/main...target_sha` por dominio (`payroll`, `finance`, `auth_access`, `cloud_release`, `db_migrations`, `ui`, `docs`, `tests`, `config`, `unclassified`), detecta sensitive paths, computa irreversibility flags. Decision tree:
- Empty → `ship`
- INDEPENDENT sensitive mix sin marker `[release-coupled: <razon>]` en commit body → `split_batch` (error)
- Cualquier IRREVERSIBLE domain (db_migrations, auth_access, payroll, finance, cloud_release) → `requires_break_glass` (error a menos que `--override-batch-policy` flag con capability)
- Solo dominios reversibles → `ship`

**3 capabilities granulares least-privilege** (migration `20260510144012098_task-850-preflight-capabilities.sql`):

- `platform.release.preflight.execute` — disparar CLI / orchestrator. EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->.
- `platform.release.preflight.read_results` — leer JSON output desde dashboards futuros (TASK-855). EFEONCE_ADMIN + FINANCE_ADMIN (observabilidad) <!-- spec original menciona DEVOPS_OPERATOR — removido por TASK-935 (rol no existe en ROLE_CODES) -->.
- `platform.release.preflight.override_batch_policy` — break-glass override del check release_batch_policy. **EFEONCE_ADMIN solo**. Requires reason >= 20 chars + audit row.

**CLI usage canonico**:

```bash
# Local exploratory (todas exits 0 unless --fail-on-error)
pnpm release:preflight                       # human output contra git HEAD vs main
pnpm release:preflight --json                # JSON only, machine-readable
pnpm release:preflight --target-sha=<sha>    # explicit SHA
pnpm release:preflight --target-branch=develop

# CI gate canonico (TASK-851 orchestrator)
pnpm release:preflight --json --fail-on-error
# exit 1 si readyToDeploy=false → degraded/unknown tambien frenan production

# Break-glass operator
pnpm release:preflight --override-batch-policy --fail-on-error
# Downgrade release_batch_policy errors a warnings (requiere capability + audit)
```

**Reliability signals**: 0 nuevos en V1.0. Reusa los 3 existentes (`platform.release.{stale_approval, pending_without_jobs, worker_revision_drift}`) embebidos como checks #5, #6.

**Outbox events**: 0 nuevos en V1.0. TASK-851 orchestrator (futuro) emitira `platform.release.preflight_executed v1` cuando consuma este CLI.

**⚠️ Reglas duras**:

- **NUNCA** modificar el shape de `ProductionPreflightV1` sin bumpear `contractVersion` a v2. TASK-851 orchestrator + TASK-855 dashboard dependen de la estabilidad. New optional fields OK sin bump.
- **NUNCA** invocar checks individuales fuera del registry canonico. Si emerge necesidad de un nuevo callsite (e.g. dashboard que solo quiere ver Vercel readiness), ejecutar `runPreflight({checks: [PREFLIGHT_CHECK_REGISTRY[6]]})` con subset filtrado, no clonar la logica.
- **NUNCA** componer la decision `readyToDeploy` en cliente. Lee `payload.readyToDeploy` directo. La derivacion vive en el composer puro.
- **NUNCA** agregar un check nuevo sin extender `PreflightCheckId` union + `PREFLIGHT_CHECK_ORDER` array + registry + tests anti-regresion. Composer rechaza checks fuera del orden canonico.
- **NUNCA** mostrar "ship" en CLI human output cuando hay degraded sources. El composer baja `confidence` y operador debe ver el detail. `readyToDeploy=false` es la senal canonica.
- **NUNCA** reducir el timeout default 6s sin justificacion. La paralelizacion via `Promise.all` ya es agresiva; reducir mas significa que checks slow legitimos (gh API rate limit, subprocess slow) van a degradar a timeout silente.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Use `captureWithDomain(err, 'cloud', { tags: { source: 'preflight', stage: '<check_id>' } })`.
- **NUNCA** loggear stack trace o payload completo del check en stderr/stdout. Use `redactErrorForResponse` antes.
- **NUNCA** modificar `IRREVERSIBLE_DOMAINS` o `INDEPENDENT_DOMAIN_PAIRS` sin tests anti-regresion + documentar el porque del cambio en commit body.
- **NUNCA** flagear `override_batch_policy` como default. Es opt-in explicito que requiere capability + audit row.
- **NUNCA** capturar el JSON output del CLI redirigiendo stdout con `>` (ej. `pnpm release:preflight --json > result.json`). pnpm/tsx imprimen banners al stdout antes que el script TS arranque, y esos prefixes contaminan el archivo y rompen `jq` downstream con "Invalid numeric literal at line 2 column 2". Patron canonico: usar la flag `--output-file=<path>` que el CLI escribe atomicamente desde dentro del proceso TS (inmune a banners de wrappers). Live discovery durante primer release real (run 25634157306).
- **SIEMPRE** que emerja un nuevo workflow production deploy, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` ANTES del primer deploy (mismo invariant que TASK-849 watchdog) — ci_green check lo filtra automaticamente del set CI relevante.
- **SIEMPRE** que se cambie copy es-CL en el output formatter, mantener consistencia con `getMicrocopy()` patterns aunque CLI no use el helper directamente (es operator-facing).

**Spec canonica**: `docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md`. Migration: `migrations/20260510144012098_task-850-preflight-capabilities.sql`. CLI: `pnpm release:preflight [--json|--output-file=<path>|--fail-on-error|--override-batch-policy|--bypass-preflight-warnings|--target-sha=<sha>|--target-branch=<name>]`.

### Production Release Operational Playbook (TASK-871 follow-up — lessons 2026-05-13)

5 patterns descubiertos durante el pase a producción de TASK-871 + bundled accumulated develop (4 orchestrator attempts antes de success). Canónicos para que **el próximo release tome <30min** vs las 4+ horas que tomó cerrar este. Spec runs: `25821880395` (vercel timing) + `25822955070` (watchdog loop) + `25823823716` (incomplete bypass) + `25825280928` (SUCCESS con todas las fixes shipped). Manifest released: `e02cb32e9c30-5acb894c-f164-486c-99c0-074d42aefbeb`.

#### Lesson 1 — Vercel BUILDING timing race (~5-8 min)

`git push origin main` triggea Vercel production deploy automaticamente via Git integration. Vercel toma **5-8 min** en build. Si dispatchas el orchestrator inmediatamente, el preflight `vercel_readiness=BUILDING` lo bloquea con `severity=error`.

**Pattern canónico**: **NO** dispatchar el orchestrator inmediatamente post-push a main. Esperar a `vercel inspect <deploy-url>` que reporte `status: ● Ready` (5-8 min típico) ANTES del `gh workflow run production-release.yml`. Alternativamente, verificar con `vercel list greenhouse-eo --scope=efeonce-7670142f | head -3` que la última deployment en Production esté `Ready`.

**⚠️ Regla dura**: **NUNCA** dispatch orchestrator <8 min post-push main. El `vercel_readiness` check NO se reintenta dentro del preflight — un fail aborta el orchestrator.

#### Lesson 2 — Production Release Watchdog self-reference loop

El workflow `Production Release Watchdog` (originalmente scheduled cada 30min, TASK-849; manual-only desde 2026-05-24 hasta TASK-920) reporta `worker_revision_drift` cuando detecta workers Cloud Run en SHAs distintos al último deploy.yml successful. Cuando hay drift pre-existente, el watchdog **FAILA loud**. El preflight `ci_green` cuenta esa failure como CI block.

**Patrón canónico**: el watchdog DEBE estar en `RELEASE_DEPLOY_WORKFLOWS` allowlist (`src/lib/release/workflow-allowlist.ts`) — mismo pattern que `Production Release Orchestrator` ya tenía documentado para su propia self-reference loop. Sin esto, drift pre-existente bloquea TODA promoción a producción incluso cuando el release ES la solución al drift.

**Closed en commit `4f1e09de` (2026-05-13)** agregando `Production Release Watchdog` al array `RELEASE_DEPLOY_WORKFLOWS` + 2 tests anti-regresión (`workflow-allowlist.test.ts`). Allowlist size 7→8.

**⚠️ Regla dura**: **NUNCA** agregar un nuevo workflow scheduled de monitoring (e.g. `Reliability Synthetic Probe`, `Cost Watchdog`) sin agregarlo al allowlist `RELEASE_DEPLOY_WORKFLOWS` con `cloudRunService: undefined`. Sin esto, cada `failure` del monitoring scheduled bloquea producción para siempre — exactamente lo opuesto a la safety intent.

#### Lesson 3 — `bypass_preflight_reason` era una bypass mechanism INCOMPLETA

La spec CLAUDE.md decía:
> `bypass_preflight_reason >=20 chars + capability platform.release.bypass_preflight` → operator override broad

Pero la CLI sólo implementaba `--override-batch-policy` (downgrade `release_batch_policy` errors a warnings). Otras checks que producen warnings persistentes (`playwright_smoke: 0 workflows for main pushes by design`, `sentry_critical_issues: 1-9 issues = warning`, `vercel_readiness: BUILDING timing race`) seguían bloqueando vía `readyToDeploy=false` aunque el operador supliera bypass_preflight_reason.

**Closed en commit `c594f066` (2026-05-13)** con:

1. CLI nueva flag `--bypass-preflight-warnings` en `scripts/release/production-preflight.ts`.
2. `shouldFailPreflightCommand(payload, failOnError, bypassWarnings)` extendido: cuando `bypassWarnings=true` solo `overallStatus === 'blocked'` (ERROR severity) bloquea.
3. Orchestrator workflow `.github/workflows/production-release.yml` pasa AMBOS `--override-batch-policy --bypass-preflight-warnings` cuando `bypass_preflight_reason >= 20`.
4. 5 tests anti-regresión en `exit-policy.test.ts` (passes degraded, passes unknown, blocks errors, no-op without failOnError, no-op on healthy).

**Resultado**: la spec canónica documentada en CLAUDE.md ahora SÍ matchea el comportamiento del orchestrator. Bypass mechanism completo.

**⚠️ Regla dura**: **NUNCA** documentar un control en CLAUDE.md (override / bypass / capability / gate) sin verificar que el código TS/YAML CompletELY implementa esa semántica. Spec sin implementation completa = self-blocking architectural debt. Pattern: SPEC describes intent → IMPLEMENTATION partial → GAP solo aparece en release real → 4+ hours debugging. Este pattern lo vimos 3 veces hoy (watchdog allowlist incompleto, bypass-preflight-warnings incompleto, Production env approval gate doble invocación no documentada).

#### Lesson 4 — Production environment gate se invoca DOS VECES, no UNA

El workflow `production-release.yml` tiene environment `production` para 2 sets de jobs distintos:

1. **First gate** (post Vercel ready): aprueba los **4 Cloud Run workers** (ops-worker + commercial-cost-worker + ico-batch-worker + hubspot-greenhouse-integration).
2. **Second gate** (post worker deploys): aprueba los **2 Azure Bicep deploys** (Teams Notifications + Teams Bot).

El operador debe aprobar la `Production` environment **DOS VECES** — primera para workers, segunda para Azure. Cada aprobación crea un `pending_deployment` separado.

**Pattern canónico para auto-approval scriptable** (cuando el operador autorizó plenariamente):

```bash
# Approve first gate (workers)
gh api -X POST repos/<owner>/<repo>/actions/runs/<run_id>/pending_deployments \
  -F 'environment_ids[]=12831857432' \
  -f state=approved \
  -f comment="<reason>"

# Wait for workers to deploy → then second gate auto-emerges for Azure
# Approve second gate (Azure)  — same env_id, second invocation
gh api -X POST repos/<owner>/<repo>/actions/runs/<run_id>/pending_deployments \
  -F 'environment_ids[]=12831857432' \
  -f state=approved \
  -f comment="<reason>"
```

`environment_ids[]` apunta al mismo numeric ID del environment Production (`12831857432` en este repo). Cada gate genera deployment ID distinto (`4680795919` workers, `4680866226+4680866228` Azure).

**⚠️ Regla dura**: **NUNCA** asumir que aprobar el environment Production una sola vez completa el release. Verificar `gh api repos/<owner>/<repo>/actions/runs/<run_id>/pending_deployments` post-workers; si retorna 1+ deployments pendientes, aprobar nuevamente.

#### Lesson 5 — Path B "recovery + ship" requiere code-first cuando ambos usan el mismo bug class

Durante TASK-871 (mismo session) intenté "recovery + ship" como Path B (remediator con `policy='rolling_window_repair'`) ANTES de shippear el código que implementaba esa policy. Falló silenciosamente porque el remediator tenía la MISMA bug class TASK-871 internamente.

**Pattern canónico**: cuando una recovery primitive depende de código que aún no está deployed, la secuencia DEBE ser:

1. Code-first: implementar fix + tests + deploy ops-worker (auto via push develop).
2. Wait for revisión Cloud Run con nuevo GIT_SHA LIVE.
3. Recovery via la primitive ya deployada (cron Cloud Scheduler manual o admin endpoint).
4. Verify signal returns ok=0.
5. Re-run smoke tests post-recovery.
6. Then release develop→main.

**⚠️ Regla dura**: **NUNCA** invocar una recovery primitive (remediator / repair endpoint / cron manual) cuando el código que implementa la nueva policy aún no está deployed. Si la primitive tiene la bug class que estás intentando arreglar, recovery falla silente. Pattern reusable: code → deploy → verify revision → recovery → verify signal → release.

#### Operational checklist canónico (para próximo release develop → main)

Tiempo objetivo: **<30 min** para bundled releases típicos.

```text
[ ] 1. Verify develop green (CI + Playwright + ops-worker deploy SUCCESS por commit reciente)
[ ] 2. Fetch + merge origin/main → develop si hay hotfixes en main
[ ] 3. Switch a main + merge develop --no-ff con "release: ..." commit message
[ ] 4. git push origin main
[ ] 5. WAIT 5-8 min para Vercel production BUILDING → READY (`vercel list ... | head -3`)
[ ] 6. WAIT for CI on the merge commit to complete green
[ ] 7. Dispatch orchestrator: `gh workflow run production-release.yml --ref main -f target_sha=<sha> -f bypass_preflight_reason="<>=20 chars>"`
[ ] 8. Approve first env gate via gh api (workers)
[ ] 9. WAIT for workers to deploy
[ ] 10. Approve second env gate via gh api (Azure Bicep)
[ ] 11. WAIT for orchestrator transition_state → released SUCCESS
[ ] 12. Dispatch watchdog: `gh workflow run production-release-watchdog.yml --ref main`
[ ] 13. Verify all 4 Cloud Run GIT_SHAs match target_sha
[ ] 14. Move resolved issues + update Handoff/changelog + close tasks
```

**Skills obligatorias antes de dispatch**: `greenhouse-production-release` (read SKILL.md + PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md + GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md).

**Spec canónica**: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` + `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` + `docs/operations/runbooks/production-release.md`. Last successful release: `25825280928` manifest `e02cb32e9c30-5acb894c-f164-486c-99c0-074d42aefbeb` (2026-05-13).

### Production Release Orchestrator invariants (TASK-851)

Workflow GitHub Actions canonico `production-release.yml` que coordina la promocion `develop → main` end-to-end consumiendo el CLI preflight (TASK-850), helpers manifest-store (TASK-848 V1.0), y los 4 worker workflows refactoreados a `workflow_call` con `expected_sha` input + post-deploy GIT_SHA verification.

**Skill obligatoria para agentes**: antes de cualquier promocion, preflight,
approval, rollback, watchdog drift recovery o cambio del control plane de
produccion, invocar `greenhouse-production-release`. Paths canonicos:
`.claude/skills/greenhouse-production-release/SKILL.md` y
`.codex/skills/greenhouse-production-release/SKILL.md`.

**Mantenimiento de skill**: si cambia el flujo critico (orquestador, worker
`workflow_call`, mappings Cloud Run, state machine, Vercel readiness, watchdog,
Azure gating o rollback), actualizar ambas skills en el mismo cambio junto con
arquitectura/runbooks/docs vivas aplicables.

**Triggers**: `workflow_dispatch` solo. Inputs: `target_sha` (required, 40 hex), `force_infra_deploy` (default false, gated TASK-853), `bypass_preflight_reason` (>=20 chars + capability `platform.release.bypass_preflight`).

**8 jobs canonicos**:

1. `preflight` — `pnpm release:preflight --json --fail-on-error`. `bypass_preflight_reason >=20 chars` → `--override-batch-policy` flag pass-through. Artifact `preflight-result.json` para audit.
2. `record-started` — `pnpm release:orchestrator-record-started` (CLI Slice 0) → `release_id` stdout. Auth WIF + Cloud SQL Connector. Emite outbox `platform.release.started v1` + audit row en misma tx.
3. `approval-gate` — `environment: production` (required reviewers en repo settings). Timeout 3 dias.
4. `deploy-{ops-worker, commercial-cost-worker, ico-batch, hubspot-integration}` — parallel matrix `uses: ./.github/workflows/<worker>-deploy.yml@<sha>` con `expected_sha` + `environment` inputs.
5. `wait-vercel` — poll Vercel API `/v6/deployments?target=production` hasta encontrar deployment con `meta.githubCommitSha === target_sha` y `state=READY`. Timeout 900s.
6. `post-release-health` — ping `https://greenhouse.efeoncepro.com/api/auth/health`. Soft-fail (exit 78) → release `degraded` en lugar de `aborted`.
7. `transition-released` — 4 state machine transitions (`preflight→ready→deploying→verifying→released|degraded`) via CLI Slice 0. Si post-release-health success → `released`, sino → `degraded`.
8. `summary` — `GITHUB_STEP_SUMMARY` tabla con results + `release_id` + workflow run link.

**Concurrency**: `production-release-${{ inputs.target_sha }}` con `cancel-in-progress: false`. Distinct SHAs deploy independientemente. Partial UNIQUE INDEX TASK-848 V1.0 enforce 1 release activo per branch a nivel DB.

**Worker workflow contract canonico** (TASK-851 Slice 2):

- Trigger paths: `push:develop` (staging auto), `workflow_dispatch` (break-glass operator), `workflow_call` (orquestador production).
- `workflow_call` inputs canonicos: `environment` (string, req), `expected_sha` (string, req).
- `workflow_call` secrets canonicos: `GCP_WORKLOAD_IDENTITY_PROVIDER` (req).
- ENV var `EXPECTED_SHA` resuelve `workflow_call.inputs.expected_sha > workflow_dispatch.inputs.expected_sha > github.sha`.
- Step "Poll Ready=True bounded" timeout 300s para que el orquestador tenga step nombrado al cual `await success()`.

**Worker deploy.sh contract canonico** (TASK-851 Slice 1):

- Aceptan env var `EXPECTED_SHA` (orchestrator passes; fallback chain `EXPECTED_SHA > GITHUB_SHA > git rev-parse HEAD > 'unknown'`).
- `GIT_SHA` env var en Cloud Run revision = `EXPECTED_SHA`.
- Post-deploy verify: `gcloud run revisions describe <latest>` + Python JSON parse de `containers[].env` + match `GIT_SHA` vs `EXPECTED_SHA`. Mismatch → `exit 1` fail-loud.
- Skipea verify cuando `EXPECTED_SHA='unknown'` (no git context, e.g. dev local).

**State machine canonica** (TS↔SQL parity):

- `RELEASE_STATES = ['preflight','ready','deploying','verifying','released','degraded','rolled_back','aborted']` (8 estados, TS enum).
- DB CHECK constraint `release_manifests_state_canonical_check` mirror exacto. Live parity test `state-machine.live.test.ts` rompe build si emerge drift (skipea cuando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` no esta seteada).
- Transition matrix V1 §2.3: `preflight → ready|aborted`, `ready → deploying|aborted`, `deploying → verifying|aborted`, `verifying → released|degraded|aborted`, `released → rolled_back`, `degraded → released|rolled_back`. `rolled_back` y `aborted` terminales sin recovery (re-INSERT con `attempt_n + 1`).
- Application guard `assertValidReleaseStateTransition` enforce ANTES de tocar DB (defense in depth).

**CLI scripts canonicos**:

- `pnpm release:orchestrator-record-started --target-sha=<sha> --triggered-by=<actor> [--target-branch=main] [--source-branch=develop] [--preflight-result-file=<path>]`
- `pnpm release:orchestrator-transition-state --release-id=<id> --from-state=<state> --to-state=<state> --actor-label=<actor> [--actor-kind=member|system|cli] [--reason=<text>] [--metadata-json=<json>]`

**⚠️ Reglas duras**:

- **NUNCA** modificar `RELEASE_STATES` enum sin actualizar paralelamente la DB CHECK constraint via migration. Live parity test rompe build si drift emerge.
- **NUNCA** transitar `state` fuera de la matrix canonica V1 §2.3. `assertValidReleaseStateTransition` lo throw fail-loud antes de tocar DB.
- **NUNCA** convertir `cancel-in-progress: ${{ <production-only expression> }}` a literal `false` en los 3 worker workflows production. Reintroduce el deadlock 2026-04-26 → 2026-05-09. Test `concurrency-fix-verification.test.ts` rompe build si emerge regression.
- **NUNCA** reintroducir `push:main` como production deploy automatico para workers Cloud Run. El incidente 2026-05-11 mostro que un run directo de HubSpot cancelado puede abortar el manifest canónico via webhook.
- **NUNCA** flagear `--override-batch-policy` en el orquestador sin `bypass_preflight_reason >=20 chars` + capability `platform.release.bypass_preflight`. Audit row en `release_state_transitions.metadata_json` registra reason.
- **NUNCA** llamar `recordReleaseStarted` directo desde un workflow YAML — usar siempre el CLI `pnpm release:orchestrator-record-started`. Mismo para `transitionReleaseState` → `pnpm release:orchestrator-transition-state`. Garantiza atomicidad (UPDATE + audit + outbox en misma tx).
- **NUNCA** modificar `release_manifests` directamente via SQL. Anti-immutable trigger (TASK-848 V1.0) bloquea cambios a campos identity. Para correcciones, INSERT nueva fila con `metadata_json.correction_of=<previous_id>`.
- **NUNCA** convertir el partial UNIQUE INDEX `release_manifests_one_active_per_branch_idx` a UNIQUE INDEX completo. El partial garantiza solo 1 release activo por branch — el INDEX completo bloquearia re-attempts terminados.
- **NUNCA** introducir advisory lock PG aplicativo en el orquestador. El partial UNIQUE INDEX en DB es sufficient.
- **NUNCA** modificar shape de `inputs.environment` ni `inputs.expected_sha` en workflow_call de los workers. TASK-851 orquestador depende de la estabilidad. Adding optional inputs OK; renaming requires bumpear contract version.
- **NUNCA** disparar el orquestador sin tener `target_sha` ya pusheado a `main`. Vercel deploy es automatico via push (git integration); el orquestador WAIT for READY, no triggers deploy.
- **NUNCA** flagear release `released` cuando post-release-health soft-failed. La transition canonica es `verifying → degraded` y operador decide via runbook si rollback o forward-fix.
- **NUNCA** invocar `Sentry.captureException` directo en orchestrator code path. Use `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: '<step>' } })`.
- **SIEMPRE** que emerja un nuevo worker workflow production deploy, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` (TASK-849 workflow-allowlist) Y al matrix de jobs en `production-release.yml` ANTES del primer deploy via orquestador.
- **SIEMPRE** que se modifique la transition matrix, actualizar AMBOS: `RELEASE_TRANSITION_MATRIX` TS + spec V1 §2.3 + arch doc Delta. Live parity test no cubre matrix (solo enum).

**Spec canonica**: `docs/tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md`. Workflow: `.github/workflows/production-release.yml`. CLI: `pnpm release:orchestrator-{record-started,transition-state}`. Tests: `concurrency-fix-verification.test.ts` + `state-machine.test.ts` + `state-machine.live.test.ts`.

### Azure Infra Release Gating invariants (TASK-853)

Los 2 workflows Azure (`azure-teams-deploy.yml` Logic Apps + `azure-teams-bot-deploy.yml` Bot Service) operan con gating canonico cuando se invocan desde el orquestador (TASK-851) — Bicep apply real solo corre si hay diff `infra/azure/<sub>/**` o `force_infra_deploy=true`. Health check Azure (preflight-style) corre SIEMPRE.

**Trigger paths canonicos** (los 3 coexisten):
- `push:main` con path filter `infra/azure/<sub>/**` (auto-deploy cuando alguien pushea cambio Bicep)
- `workflow_dispatch` con `force_infra_deploy` boolean input (operator manual)
- `workflow_call` desde `production-release.yml` orquestador (gated por diff entre `origin/main~1` y `inputs.target_sha`)

**5 jobs canonicos** (idénticos en ambos workflows):

1. `health-check` — preflight-style. Azure login WIF + provider register (`Microsoft.Logic+Web` para teams-notifications, `Microsoft.BotService` para teams-bot) + RG ensure idempotent. Outputs `env_label`, `rg_name`, `params_file` para downstream jobs. **Corre SIEMPRE** independiente del diff.
2. `validate` — `az bicep build --file <main.bicep>` lint check.
3. `diff-detection` — decide `should_deploy: true|false`:
   - `force_infra_deploy=true` → `true` (force flag short-circuit)
   - Push event → `true` (path filter implícito ya filtró)
   - workflow_call/dispatch sin force → `git diff --name-only origin/main~1...target_sha -- 'infra/azure/<sub>/**'` → `true` si cambios, `false` si no
4. `deploy` — `if: ${{ needs.diff-detection.outputs.should_deploy == 'true' }}` → `az deployment group create`.
5. `skip-deploy-summary` — `if: ${{ needs.diff-detection.outputs.should_deploy == 'false' }}` → annotation `::notice::` + `GITHUB_STEP_SUMMARY` con razón explícita del skip.

**workflow_call interface canonico**:

- `inputs.environment` (string, required) — `staging` | `production`
- `inputs.target_sha` (string, required) — para diff detection vs `origin/main~1`
- `inputs.force_infra_deploy` (boolean, optional default false) — operator override
- `secrets.{AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID}` (required) — repo-level secrets

**Patron canonico para secrets en orchestrator** (corregido 2026-05-10 post arch-architect verdict): `secrets: inherit` para callee workflow_call que requiere AZURE_*. AZURE_* DEBEN ser **repo-level**, NO environment-scoped. Razon: GitHub Actions NO permite combinar `uses: workflow_call` con `environment:` en el mismo job (limitacion documentada). Por lo tanto el caller orchestrator NO ve environment-scoped secrets cuando invoca el callee, y `secrets: inherit` falla con `Secret X is required, but not provided while calling`. AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID son **identifiers no-sensitives** (NO credentials) — la auth real corre via WIF subjects (`repo:efeoncepro/greenhouse-eo:environment:production` + `:ref:refs/heads/main`) que YA estan registradas en el Azure AD App Registration. Mover los identifiers a repo-level NO pierde security; isolation real esta en WIF subjects, no en secret scope. Caso real 2026-05-10 run 25635535801: 2 jobs Azure Bicep validate fallaron en 2 segundos sin runner por este bug class, validado arch-architect 4-pillar, fix consolidado en mismo commit.

**WIF subjects canonicos Azure** (federated credential del Azure AD App Registration en tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4`):

- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main` (deploys auto via push:main)
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/develop` (staging)
- `repo:efeoncepro/greenhouse-eo:environment:production` (cuando workflow declara `environment: production`)

Verificación: `az ad app federated-credential list --id <AZURE_CLIENT_ID> -o table`. Adicion: `az ad app federated-credential create --id <AZURE_CLIENT_ID> --parameters <json>`.

**Critical path en orchestrator**: los 2 jobs Azure corren en paralelo con los 4 workers Cloud Run para acortar duración total del release. `post-release-health.needs` espera por ambos antes de pingear `/api/auth/health`.

**Reliability signals**: 0 nuevos en TASK-853. Los signals existentes del subsystem `Platform Release` cubren el flow.

**Outbox events**: 0 nuevos. Reusa los 7 existentes via manifest-store helpers (TASK-848 V1.0).

**Capabilities**: 0 nuevas. `force_infra_deploy=true` reusa `platform.release.execute` (TASK-848 V1.0).

**⚠️ Reglas duras**:

- **NUNCA** modificar el shape de `inputs.{environment, target_sha, force_infra_deploy}` ni `secrets.AZURE_*` en los 2 Azure workflow_call. TASK-851 orquestador depende de la estabilidad. Adding optional inputs OK; renaming requires bumpear contract version.
- **NUNCA** colapsar el `health-check` job en `deploy` job. Health check corre SIEMPRE como preflight-style — su valor es detectar WIF roto o RG borrado ANTES de tocar Bicep, incluso cuando el deploy real skip por no-diff.
- **NUNCA** convertir `secrets: inherit` a explicit pass-through en orchestrator (e.g. `secrets: AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}`). Los AZURE_* son environment-scoped — explicit pass-through devuelve null porque el caller orchestrator no tiene environment declarado en el job que invoca workflow_call. `inherit` es el patron canonico.
- **NUNCA** declarar `environment: production` directamente en el job orchestrator que invoca el workflow_call (`deploy-azure-*`). GH Actions no permite combinar `uses:` con `environment:` en el mismo job. El callee declara environment en sus propios jobs y resuelve secrets ahi.
- **NUNCA** skipear el `health-check` job cuando `should_deploy=false`. La idea de health-check es preflight independiente del Bicep apply.
- **NUNCA** modificar el `git diff --name-only origin/main~1...target_sha` para usar `HEAD~1` o `HEAD~N`. `origin/main~1` apunta al "previo deployado en main" cuando se invoca via orchestrator post-merge a main. Si el target_sha no es descendiente de origin/main~1, la diff puede dar falso positivo.
- **NUNCA** automatizar Azure rollback en V1. Reapply de Bicep templates puede ser destructivo (`delete-on-deletion`, federated credential rotation, App Service config reset). V2 contingente con `what-if` mandatory.
- **NUNCA** invocar `Sentry.captureException` directo en code paths del orchestrator wiring. Use `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: 'azure_deploy' } })`.
- **SIEMPRE** que emerja un nuevo Bicep stack (e.g. `infra/azure/<new-stack>`), aplicar el mismo patron canonico: refactor a workflow_call con los 5 jobs + agregar al orquestador como job nuevo `deploy-azure-<stack>` con `secrets: inherit` + extender `post-release-health.needs` y `summary.needs`.
- **SIEMPRE** que se modifique un Azure workflow, correr `concurrency-fix-verification.test.ts` para verificar que los 5 jobs canonicos siguen presentes + workflow_call contracts intactos.

**Spec canonica**: `docs/tasks/in-progress/TASK-853-azure-infra-release-gating.md`. Workflows: `.github/workflows/azure-{teams,teams-bot}-deploy.yml`. Tests: `concurrency-fix-verification.test.ts` (sección TASK-853). Runbook: `docs/operations/runbooks/production-release.md` §6.1, §6.2, §6.3.

### Release Observability Completion invariants (TASK-854)

Cierra el subsystem `Platform Release` con 5 of 5 reliability signals canonicos + dashboard operator-facing `/admin/releases`. Los 2 signals nuevos dependen de `release_manifests` populated por TASK-851 orquestador (data emerge tras primer release exitoso).

**2 signals nuevos (5 of 5 ahora completos)**:

- `platform.release.deploy_duration_p95` (kind=lag): lee `listRecentReleases` ventana 30d, computa p95 de `completed_at - started_at` SOLO para releases en estado `released` (filtra degraded/aborted/rolled_back/in-flight). Severity: ok (<30min), warning (30-60min), error (>=60min), unknown (sin samples). Steady esperado: ok (orchestrator P95 teorico ~5-15 min).
- `platform.release.last_status` (kind=drift): lee ultimo release de main (started_at DESC limit 1). Severity per estado:
  - `released` → ok (steady)
  - `degraded|aborted|rolled_back` <24h → error (incident reciente)
  - `degraded|aborted|rolled_back` 24h-7d → warning
  - `degraded|aborted|rolled_back` >7d → ok (resolved historicamente)
  - `preflight|ready|deploying|verifying` → unknown (in-flight)
  - sin releases → unknown (pipeline no usado)

Wire-up canonico: `getReliabilityOverview` source `productionRelease[]` ahora invoca 5 readers en paralelo via Promise.all (vs 3 anteriores). Cada uno con `catch(()=>null)` → degradacion honesta sin bloquear dashboard.

**Dashboard `/admin/releases` (V1 read-only)**:

- Server page `src/app/(dashboard)/admin/releases/page.tsx` con `requireServerSession` + capability `platform.release.execute` (read-equivalent V1; emergera `platform.release.read_results` granular si V1.2 expone superficies adicionales)
- Initial fetch + `lastStatusSignal` en paralelo via Promise.all
- Cursor pagination canonica (keyset on `started_at DESC`, no offset → no slow queries en deep pagination); helper `listRecentReleasesPaginated` fetcha `pageSize+1` para detectar `hasMore` sin COUNT separate
- API route `GET /api/admin/releases?cursor=&pageSize=` reusa misma capability check
- View client `AdminReleasesView` con tabla TanStack + Card outlined + Alert banner condicional (cuando `lastStatusSignal.severity = error|warning`) + `EmptyState` canonico cuando 0 releases + footer "Cargar mas" con CircularProgress inline
- Drawer `ReleaseDrawer` anchor='right' width 480px desktop / 100% mobile con metadata rows + comando rollback con copy-to-clipboard via `sonner` toast
- Microcopy es-CL en `src/lib/copy/release-admin.ts` (`GH_RELEASE_ADMIN`) — domain copy module per CLAUDE.md decision tree (mismo patron `GH_AGENCY`/`GH_FINANCE`)

**Tokens visuales canonicos** (greenhouse-ux skill):

| Estado release | Chip color | Tabler icon |
|---|---|---|
| `released` | success (#6ec207) | tabler-circle-check |
| `degraded` | warning (#ff6500) | tabler-alert-triangle |
| `aborted` / `rolled_back` | error (#bb1954) | tabler-x / tabler-arrow-back |
| `preflight` / `ready` / `deploying` / `verifying` | info (#00BAD1) | tabler-loader-2 |

**Microinteracciones canonicas** (greenhouse-microinteractions-auditor skill):

- Row hover: `theme.palette.action.hover` background, cursor pointer
- Row click + Enter/Space → drawer abre 200ms ease-out (MUI Drawer default)
- Loading "Cargar mas": spinner inline en boton (no full skeleton — wait localizado)
- Empty state: `EmptyState` canonico (no animacion en error states)
- Copy clipboard: `sonner` toast 3s auto-dismiss, no persistente
- Reduced motion: respetado nativamente por MUI Drawer

**Accessibility canonical**:

- Tabla: `<caption className='sr-only'>` + `scope='col'` + `tabIndex={0}` + `onKeyDown` Enter/Space rows
- Banner: `role='alert'` implicito en MUI Alert
- Drawer: `role='dialog'` + `aria-modal='true'` + `aria-labelledby` + Escape close + focus trap (todos por MUI default)
- Estado chip: color + icon + text label (no color-only — WCAG 2.2 AA)

**⚠️ Reglas duras**:

- **NUNCA** modificar el filter `state === 'released'` en `release-deploy-duration.ts` para incluir degraded/aborted. P95 mide tiempo de releases EXITOSOS — incluir failures contamina la metrica con outliers de aborts (typically <1 min) o degradeds (typically >2x normal).
- **NUNCA** cambiar la ventana 30d sin coordinar con `last_status` ventana threshold. Si el operador necesita p95 7d como vista alternativa, agregar nuevo signal `deploy_duration_p95_7d`, no mutar el existente.
- **NUNCA** ajustar thresholds (30min warning, 60min error) sin observar 30 dias de steady state real. La spec V1 marca explicitly "tune post-30d steady-state observados".
- **NUNCA** expandir `last_status` a leer ultimos N releases. La semantica del signal es "el ultimo" — para tendencias usar el dashboard `/admin/releases` o el deploy_duration_p95.
- **NUNCA** computar duration o severity en cliente. La server-side se encarga via reader → wire-up → `productionRelease[]` source. Cliente solo renderiza.
- **NUNCA** mostrar el dashboard a roles distintos de EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->. Capability `platform.release.execute` es read-equivalent V1; para audiencias distintas (FINANCE_ADMIN observabilidad), V1.2 introducira `platform.release.read_results` granular.
- **NUNCA** disparar release desde el dashboard. V1 es read-only por design — operator dispara via `gh workflow run production-release.yml` o GitHub UI. Add release CTA queda como follow-up V1.2 con capability separada.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Use `captureWithDomain(err, 'cloud', { tags: { source: 'admin_releases_*', stage: '<step>' } })`.
- **NUNCA** componer la decision banner show/hide en cliente. La server-side calcula `lastStatusSignal.severity`, cliente solo renderiza si severity in {error, warning}.
- **NUNCA** cachear el dashboard data > 30s sin invalidacion. release_manifests cambia mid-release; stale data confunde al operador.
- **NUNCA** convertir el cursor pagination a offset-based sin justificacion documentada. Keyset es O(log N) consistent en deep pages; offset es O(N) que escala mal.
- **SIEMPRE** que emerja un signal nuevo para `productionRelease[]` source, agregarlo a la lista del wire-up + extender el dashboard banner trigger si severity != ok deberia bannear.
- **SIEMPRE** que se modifique el shape del manifest (tablas TASK-848 V1.0), regenerar tipos via `pnpm migrate:up` + actualizar `rowToManifest` helper en `list-recent-releases-paginated.ts`.

**Spec canonica**: `docs/tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md`. Files canonicos:
- `src/lib/reliability/queries/release-deploy-duration.ts` + tests
- `src/lib/reliability/queries/release-last-status.ts` + tests
- `src/lib/release/list-recent-releases-paginated.ts`
- `src/lib/copy/release-admin.ts`
- `src/app/(dashboard)/admin/releases/page.tsx`
- `src/app/api/admin/releases/route.ts`
- `src/views/greenhouse/admin/releases/{AdminReleasesView,ReleaseDrawer,columns}.tsx`

### Finance write-path E2E gate (TASK-773 Slice 6)

Cualquier task que toque handlers `POST/PUT/PATCH/DELETE` en `src/app/api/finance/**/route.ts` **debe verificar el flow end-to-end downstream**, no solo el contract API. Bug class detectada 2026-05-03: el endpoint Figma respondía 200 OK pero el TC Santander no rebajaba — porque el contract API funcionaba pero el side effect downstream (outbox → BQ → reactive → account_balance) calló silencioso.

**Gate**: `pnpm finance:e2e-gate` (warn) o `pnpm finance:e2e-gate --strict` (error).

**Evidencia válida** (cualquiera):

1. Algún commit del branch tiene `[downstream-verified: <flow-name>]` en el message body.
2. Algún archivo `tests/e2e/smoke/finance-*.spec.ts` fue creado o modificado en el branch.
3. El cambio NO modifica handlers POST/PUT/PATCH/DELETE (typo, comments, formatting). El gate detecta esto y skipea.

**Flujos críticos canónicos** (verificar end-to-end ANTES de cerrar):

| Flow | Action | Downstream verification |
|---|---|---|
| Crear supplier | POST `/api/finance/suppliers` | Aparece en `/admin/payment-instruments` directory + NO 500 |
| Crear expense | POST `/api/finance/expenses` | Aparece en `/finance/expenses` con sortDate correcto + supplierDisplayName |
| Registrar pago | POST `/api/finance/expenses/[id]/payments` | expense.status=paid + **account_balance refleja cargo** + cash-out drawer ya no muestra el doc |
| Anular payment | DELETE `/api/finance/expenses/[id]/payments/[paymentId]` | balance vuelve atrás |
| Conciliar período | POST `/api/finance/reconciliation/[periodId]/match` | Reconciliación completa + signals reliability OK |

**Verificación recomendada con Playwright + Chromium + agent auth**:

```bash
# Setup once (genera .auth/storageState.json)
AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs

# E2E del flow específico (browser real con sesión NextAuth válida)
pnpm playwright test tests/e2e/smoke/finance-cash-out.spec.ts --project=chromium
```

**⚠️ Regla**: cuando cierres una task que toque write paths finance, agregá `[downstream-verified: <flow>]` al último commit y describí qué verificaste. Patrón:

```text
feat(finance): TASK-XXX Slice 5 — registro pago atómico

[downstream-verified: cash-out-payment]
- POST /api/finance/expenses/[id]/payments → 201 OK
- account_balances rematerializa < 5 min via /admin/operations
- /finance/bank muestra cargo en TC Santander
- /finance/cash-out drawer ya no muestra el documento
```

**Spec canónica**: `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md` (Slice 6).

### Database — Migration markers (anti pre-up-marker bug)

Toda migration `.sql` en `migrations/` DEBE comenzar con el marker `-- Up Migration` exacto. `node-pg-migrate` parsea el archivo buscando ese marker para identificar la sección Up; si falta, la sección queda vacía y la migración se registra como aplicada en `pgmigrations` SIN ejecutar el SQL real (silent failure detectado en TASK-768 Slice 1, repetido por TASK-404 → ISSUE-068 con 3 governance tables nunca creadas).

**Estructura canónica de toda migration**:

```sql
-- Up Migration

-- 1. DDL: CREATE TABLE / ALTER TABLE / CREATE INDEX / CREATE FUNCTION
CREATE TABLE IF NOT EXISTS schema.table (...);
CREATE UNIQUE INDEX IF NOT EXISTS table_unique_idx ON ...;

-- 2. Anti pre-up-marker bug guard: bloque DO con RAISE EXCEPTION que aborta
--    si la tabla/columna/constraint NO quedó realmente creada.
DO $$
DECLARE expected_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'schema' AND table_name = 'table'
  ) INTO expected_exists;

  IF NOT expected_exists THEN
    RAISE EXCEPTION 'TASK-XXX anti pre-up-marker check: schema.table was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- 3. GRANTs (read/write a runtime, ownership a ops)
GRANT SELECT, INSERT, UPDATE, DELETE ON schema.table TO greenhouse_runtime;

-- Down Migration

-- SOLO statements de undo (DROP / ALTER ... DROP). NUNCA CREATE TABLE aquí.
DROP TABLE IF EXISTS schema.table;
```

**Reglas duras**:

- **NUNCA** poner `CREATE TABLE` / `ALTER TABLE ADD COLUMN` / `CREATE INDEX` / `CREATE FUNCTION` debajo de `-- Down Migration`. Ese marker es **solo para undo** (DROP / ALTER ... DROP). Si te encuentras escribiendo CREATE en Down, tienes los markers invertidos — STOP y mover a Up. Es exactamente la clase de bug que parió ISSUE-068 (TASK-404 governance tables nunca creadas).
- **NUNCA** sobrescribir un archivo de migration sin preservar la línea `-- Up Migration` al inicio.
- **NUNCA** editar una migration ya aplicada (registrada en `pgmigrations`). Si la migration tiene bug, **forward fix con migration nueva idempotente** (`IF NOT EXISTS` + bloque DO de verificación). Editar la legacy rompe environments fresh.
- **NUNCA** asumir que `pnpm migrate:up` ejecutó SQL solo porque retornó "Migrations complete!" — verifica con `pnpm pg:connect:shell` o un script `node` con `pg` que los objetos esperados (tablas, columnas, constraints) existen, o agrega bloque DO con RAISE EXCEPTION en la propia migration.
- **SIEMPRE** usa `pnpm migrate:create <slug>` para generar el archivo (incluye los markers correctos).
- **SIEMPRE** después de `pnpm migrate:up`, valida con SELECT contra `information_schema.columns` / `pg_constraint` / `pg_indexes` que el DDL fue aplicado, O incluye un bloque DO con RAISE EXCEPTION en la propia migration que aborta si los objetos esperados no existen post-apply.
- **SIEMPRE** que migrations creen tablas críticas para runtime, escribir bloque DO de verificación post-DDL en la misma migration. Pattern fuente: `migrations/20260508104217939_task-611-capabilities-registry.sql` y `migrations/20260507183122498_task-810-engagement-anti-zombie-trigger.sql`.
- Si la down migration es destructiva, separar con marker `-- Down Migration` exacto. Sin él, el rollback no opera. Y sus statements son SOLO DROP / undo, NUNCA CREATE.

**Defense in depth (CI gate, en construcción — Fase 2 de ISSUE-068)**: `scripts/ci/migration-marker-gate.mjs` detectará automáticamente migrations con sección Up vacía + sección Down con DDL keywords. Modo blocking en PRs. Hasta que aplique, la regla anterior es enforcement humano + code review.

### SQL embebido — type alignment + live testing (ISSUE-071, 2026-05-08)

Cualquier query SQL embebido en TS que use **uniones de tipos** (COALESCE de subqueries, CASE WHEN, NULL coalescing entre tipos heterogéneos) debe **ejercitarse contra PG real ANTES de mergear**, no solo via mocks Vitest.

**Bug class** (ISSUE-071): el CTE `subject_admin` del relationship resolver de TASK-611 hacía `SELECT 1 AS is_admin` (integer) pero el `COALESCE((SELECT is_admin FROM subject_admin), FALSE)` combinaba con boolean. PG rechaza con `COALESCE types integer and boolean cannot be matched`. El catch silencioso convertía el throw a `degradedMode=true` y el banner "Workspace en modo degradado" se mostraba al usuario. Bug latente desde el merge de TASK-611, descubierto solo cuando un usuario real ejerció el path post TASK-613 V1.1.

**⚠️ Reglas duras**:

- **NUNCA** mergear queries con CTEs + COALESCE/CASE/NULL handling sin un live test contra PG (vía `pg:connect` proxy + `pnpm tsx`, o `*.live.test.ts`).
- **NUNCA** confiar SOLO en unit tests con mocks para validar type alignment SQL. Los mocks ejercitan la lógica TS, NO el SQL crudo.
- **SIEMPRE** que `COALESCE((SELECT ... FROM cte), default)`, verificar que el tipo del SELECT del CTE matchee el tipo del `default`. PG hace casting implícito entre tipos numéricos (INT → NUMERIC) pero NO entre INT y BOOL ni entre TEXT y NUMERIC.
- **SIEMPRE** que un read path tenga catch + degraded mode honesto (correcto desde safety perspective), confirmar que `captureWithDomain` está emitiendo a Sentry — sino el bug class queda completamente oculto al equipo y aparece solo cuando un usuario real reporta el síntoma.

**Defense-in-depth recomendado**: cuando una query nueva emerja, agregar un script temporal `scripts/<dominio>/_sanity-<query-name>.ts` (gitignored o committed según necesidad) que la ejecute contra el proxy local con datos reales. Después del primer ejercicio exitoso el script es opcional pero útil como debugging aid futuro.

**Spec canónica**: `docs/issues/resolved/ISSUE-071-workspace-relationship-resolver-coalesce-type-mismatch.md`.

### Finance — Internal Account Number Allocator (TASK-700)

Algoritmo canónico para asignar números de cuenta internos a CCAs hoy y wallets/loans/factoring mañana. **Toda cuenta interna que necesite identificador legible debe pasar por este allocator** — no se generan números en consumers.

Formato v1: `TT-XX-D-NNNN`
- `TT` = `greenhouse_core.spaces.numeric_code` (2-digit, NOT NULL UNIQUE)
- `XX` = `greenhouse_finance.internal_account_type_catalog.type_code` (`90` = shareholder hoy)
- `D` = Luhn mod-10 sobre payload `TT‖XX‖NNNN`
- `NNNN` = secuencial monotónico zero-padded por `(space, type)` — los últimos 4 chars del rendering son siempre dígitos puros, por lo que `slice(-4)` produce un mask `•••• 0001` distintivo

Allocator atómico:
- SQL: `greenhouse_finance.allocate_account_number(space_id, type_code, target_table, target_id)` — advisory lock per `(space, type)`, computa Luhn, persiste en `account_number_registry`
- TS: `allocateAccountNumber(...)` en `src/lib/finance/internal-account-number/` — wrapper Kysely de la SQL function. Acepta `client?: Kysely | Transaction` para compartir transacción con el INSERT del consumer.

Helpers TS exportados: `luhnCheckDigit`, `formatAccountNumber`, `parseAccountNumber`, `validateAccountNumber`, `maskAccountNumber`. Hay test de paridad TS↔SQL contra el número del backfill (`01-90-7-0001`).

Catálogo de type codes (extender insertando filas — no requiere migrar generador):
- `90` shareholder_account (CCA — implementado)
- Rangos reservados (no materializados): `10-19` wallets de usuario, `20-29` wallets de cliente, `30-39` wallets de proveedor, `70-79` intercompany loans, `80-89` factoring/structured.

**Reglas duras**:
- **NUNCA** componer un internal account number manualmente en un consumer. Siempre `allocateAccountNumber(...)` o la SQL function.
- **NUNCA** alterar el formato inline. Para evolucionar, bumpear `format_version` en BOTH la SQL function y el módulo TS — los emitidos coexisten.
- **NUNCA** bypass del registry escribiendo directo a `accounts.account_number` para una categoría que usa el registry. El registry es la fuente de verdad audit.
- **NUNCA** desincronizar TS y SQL del Luhn — el test `luhn-parity` rompe build si pasa.
- Cuando se cree el módulo de wallets, agregar fila al catalog y reusar el allocator. Cero código nuevo de generación.

### Finance — Payment order ↔ bank settlement invariants (TASK-765)

Toda transición de `payment_orders` a `state='paid'` debe rebajar el banco en la cuenta origen, atómicamente. El path canónico end-to-end es:

```text
payroll_period.exported
  → finance_expense_reactive_intake (materializa expenses)
    → payment_obligations.generated (TASK-748)
      → payment_orders.draft → pending_approval → approved → submitted (TASK-750)
        → markPaymentOrderPaidAtomic (TASK-765 Slice 5):
          1. SELECT FOR UPDATE
          2. assertSourceAccountForPaid (Slice 1 hard-gate)
          3. UPDATE state='paid' (anti-zombie trigger Slice 6 valida)
          4. recordPaymentOrderStateTransition (audit log Slice 6 append-only)
          5. Per line: recordExpensePayment(input, client) → expense_payment + settlement_leg
          6. publishOutboxEvent('finance.payment_order.paid')
          7. ROLLBACK completo si CUALQUIER step falla
        → account_balances rematerialization
        → BANCO REBAJADO
```

**Reglas duras:**

- **NUNCA** marcar `state='paid'` con `source_account_id IS NULL`. Hard-gate triple: CHECK constraint `payment_orders_source_account_required_when_paid` (DB) + `assertSourceAccountForPaid` (TS) + UI Tooltip + trigger `payment_orders_anti_zombie_trigger` (defense in depth).
- **NUNCA** dejar `state='paid'` sin downstream completo. El path atómico `markPaymentOrderPaidAtomic` (`src/lib/finance/payment-orders/mark-paid-atomic.ts`) corre TODO en una sola tx. Si rollback ocurre, la order vuelve a `submitted` — nunca queda zombie. El proyector reactivo `record_expense_payment_from_order` queda como **safety net read-only** (idempotencia preservada por partial unique index).
- **NUNCA** skipear silencioso desde el resolver. `recordPaymentForOrder` (`record-payment-from-order.ts`) ahora throw + outbox `finance.payment_order.settlement_blocked` cuando: (a) `expense_not_found` después de invocar materializer sincrono, (b) `out_of_scope_v1` (lines no-payroll), (c) `recordExpensePayment` falla.
- **NUNCA** modificar el INSERT de `expenses` / `income` / `income_payments` / `expense_payments` sin verificar paridad column-count vs expression-count. El test `expense-insert-column-parity.test.ts` valida 14 INSERT sites canónicos en CI; cualquier drift rompe build (mismo bug que dejó dead-letter el materializer 2026-05-01).
- **NUNCA** transicionar estados fuera del matrix canónico (`draft → pending_approval → approved → submitted → paid → settled → closed` + cancellation paths). El trigger PG `payment_orders_anti_zombie_trigger` enforce a nivel DB; el TS helper `assertValidPaymentOrderStateTransition` enforce en código.
- **NUNCA** modificar `payment_order_state_transitions` (audit log). Es append-only enforced por trigger PG `payment_order_state_transitions_no_update/no_delete_trigger`. Para correcciones, insertar nueva fila con `metadata_json.correction_of=<transition_id>`.
- **Reliability signals** (`/admin/operations`): `paid_orders_without_expense_payment` (drift), `payment_orders_dead_letter` (dead_letter), `payroll_expense_materialization_lag` (lag). Steady state = 0. Cualquier valor > 0 indica un breakage en el path canónico.
- **Capabilities granulares** (least privilege): `finance.payroll.rematerialize` (admin endpoint rerun materializer) y `finance.payment_orders.recover` (recovery endpoint para órdenes zombie). Reservadas FINANCE_ADMIN + EFEONCE_ADMIN.

**Helpers canónicos:**

- `markPaymentOrderPaidAtomic({orderId, paidBy, paidAt?, externalReference?})` — path atómico canónico.
- `assertSourceAccountForPaid(orderId, sourceAccountId, targetState)` — hard-gate Slice 1.
- `recordPaymentOrderStateTransition({...}, client)` — append-only audit log writer (slice 6).
- `recordExpensePayment(input, client?)` — extiende firma con `client?` opcional (post-Slice 5).
- `materializePayrollExpensesForExportedPeriod({periodId, year, month})` — idempotente, invocable sincrono dentro de tx atómica.
- `checkInsertParity(sql)` — anti-regresión universal para INSERTs SQL embebidos.
- `POST /api/admin/finance/payroll-expense-rematerialize` — admin endpoint rerun materializer (capability `finance.payroll.rematerialize`).
- `POST /api/admin/finance/payment-orders/[orderId]/recover` — recovery endpoint para zombies (capability `finance.payment_orders.recover`).

**Outbox events nuevos:** `finance.payment_order.settlement_blocked` (v1, 5 reasons) + `finance.payroll_expenses.rematerialized` (v1, audit-only). Documentados en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` Delta 2026-05-02.

**Spec canónica:** `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`.

### Finance — Payment Provider Catalog + category provider rules (TASK-701)

Toda cuenta operativa (banco, tarjeta, fintech, CCA, wallet futura) declara un proveedor que opera el ledger. El catálogo y las reglas son canónicos: el form admin y el readiness contract leen de aquí, no hay branching por categoría en consumers.

**Tablas**:
- `greenhouse_finance.payment_provider_catalog` — FK desde `accounts.provider_slug`. `provider_type` ∈ `bank`, `card_network`, `card_issuer`, `fintech`, `payment_platform`, `payroll_processor`, **`platform_operator`**. Cada fila declara `applicable_to TEXT[]` con las categorías que puede servir.
- `greenhouse_finance.instrument_category_provider_rules` — regla por `instrument_category` (`requires_provider`, `provider_label`, `provider_types_allowed`, `default_provider_slug`, `requires_counterparty`, `counterparty_kind`, `counterparty_label`).

**Greenhouse-as-platform_operator**: el provider con slug `greenhouse` es first-class. Representa que la plataforma misma opera ledger internos (CCA hoy, wallets/loans/factoring mañana). Para shareholder_account (y futuras categorías internas), `default_provider_slug='greenhouse'` → form lo pre-asigna read-only.

**Helper canónico**: `getCategoryProviderRule(category)` en `src/lib/finance/payment-instruments/category-rules.ts` mirror del seed SQL.

**Reglas duras**:
- **NUNCA** escribir un `provider_slug` inventado. Solo slugs presentes en el catálogo (FK lo bloquea).
- **NUNCA** branchear UI/readiness por `instrument_category` para decidir qué campos mostrar. Leer la rule.
- **NUNCA** mezclar dimensiones: el `provider_slug` es "quién opera el ledger". El counterparty (cuando aplica) es "quién es el otro lado del wallet" — vive en `metadata_json` para shareholder hoy, columna dedicada cuando se materialicen futuras wallets.
- Cuando ship una categoría nueva (`employee_wallet`, `client_wallet`, `intercompany_loan`, `escrow_account`):
  1. INSERT row en `internal_account_type_catalog` (TASK-700)
  2. UPDATE `payment_provider_catalog` para agregar la categoría al `applicable_to` de `greenhouse`
  3. INSERT row en `instrument_category_provider_rules` con la regla
  4. Agregar entrada en `getCategoryProviderRule` (mirror TS)
  El form admin se adapta solo. Cero refactor de UI.

### Finance — Bank ↔ Reconciliation synergy (TASK-722)

`/finance/bank` y `/finance/reconciliation` son ahora un solo flujo operativo. Banco es el tablero (cuentas + saldos + snapshots + drift + evidencia); Conciliación es el workbench transaccional (importar extractos, matching, cierre de periodo).

**Bridge contract** (read-only): `getReconciliationFullContext({periodId | accountId+year+month})` en `src/lib/finance/reconciliation/full-context.ts` retorna `{ account, period?, latestSnapshot?, evidenceAsset?, statementRows, difference, nextAction }` con state machine `nextAction: declare_snapshot → create_period → import_statement → resolve_matches → mark_reconciled → close_period → closed → archived`.

**Period creation desde snapshot** (atomic): `createOrLinkPeriodFromSnapshot({snapshotId, actorUserId})` en `src/lib/finance/reconciliation/period-from-snapshot.ts`. Idempotente (re-llamar devuelve `alreadyLinked=true`), atomic (insert period + UPDATE snapshot.reconciliation_period_id en misma tx), race-safe (UNIQUE (account_id, year, month) constraint).

**API**:
- `POST /api/finance/reconciliation/from-snapshot` — gated por `finance.reconciliation.declare_snapshot`
- `GET /api/finance/reconciliation?year=&month=` retorna `orphanSnapshots[]` adicional cuando se piden
- `GET /api/finance/reconciliation/[id]` retorna campo `bridge` con full context

**Capabilities** (TASK-403 motor, no DB tabla):
- `finance.reconciliation.read` — finance route_group / FINANCE_ADMIN / EFEONCE_ADMIN
- `finance.reconciliation.match` — mismo set
- `finance.reconciliation.import` — mismo set
- `finance.reconciliation.declare_snapshot` — mismo set
- `finance.reconciliation.close` — solo FINANCE_ADMIN / EFEONCE_ADMIN (acción terminal)

Guards `can()` agregados a 11 endpoints de mutación. `requireFinanceTenantContext` se mantiene como guard transversal.

**Reglas duras**:

- **NUNCA** sumar reconciliation logic inline en views. Toda composición pasa por `getReconciliationFullContext`.
- **NUNCA** crear periodo concurrent sin pasar por `createOrLinkPeriodFromSnapshot` o `createReconciliationPeriodInPostgres`. Ambas usan idempotency: la UNIQUE (account_id, year, month) constraint detecta race conditions a nivel DB.
- **NUNCA** mostrar match status sin distinguir `matched_settlement_leg_id` (canal canónico TASK-708) vs `matched_payment_id` (legacy). UI usa chip diferenciado "Canónico" vs "Legacy".
- **NUNCA** disable "Marcar conciliado" sin explicación clara en tooltip + alert. Operador debe saber qué falta.
- Banco es read-only sobre el modelo de conciliación; toda mutación va por endpoints del workbench. El botón "Abrir workbench" en BankView no muta — solo navega.
- Cuando emerja una nueva surface (e.g. cierre de período Q4 dashboard), reusa el bridge. Cero composición ad-hoc.

### Finance — Evidence canonical uploader (TASK-721)

Toda evidencia que respalde un snapshot de conciliación (cartola, screenshot OfficeBanking, statement PDF) o futura declaración de OTB / loan / factoring **debe** subirse via el uploader canónico de assets, NO declararse como text-input libre.

**Flow canónico**:
1. UI usa `<GreenhouseFileUploader contextType='finance_reconciliation_evidence_draft'>`. PDF/JPG/PNG/WEBP, max 10MB.
2. POST `/api/assets/private` calcula SHA-256, dedup por `content_hash` (mismo hash + mismo context → reuse asset existente, sin duplicar bucket object).
3. `createPrivatePendingAsset` sube a bucket `greenhouse-private-assets-{env}` con prefijo `finance-reconciliation-evidence/{assetId}/...` y persiste fila en `greenhouse_core.assets` con `retention_class='finance_reconciliation_evidence'`.
4. UI envía `evidenceAssetId` al endpoint `/api/finance/reconciliation/snapshots`.
5. `declareReconciliationSnapshot` en una sola transacción: insert snapshot con `evidence_asset_id` FK + `attachAssetToAggregate` (status pending → attached, owner_aggregate_id = snapshotId, owner_aggregate_type = 'finance_reconciliation_evidence').

**Reglas duras**:

- **NUNCA** aceptar `source_evidence_ref` como text libre en flujos nuevos. La columna existe solo para audit histórico pre-TASK-721.
- **NUNCA** subir directo al bucket público `greenhouse-public-media` para finance evidence. Bucket privado por seguridad (IAM restringida).
- **NUNCA** persistir `evidence_asset_id` apuntando a un asset que no existe — el FK con `ON DELETE SET NULL` cubre el delete, pero el detector `task721.reconciliationSnapshotsWithBrokenEvidence` flag-ea cualquier inconsistencia.
- **Permisos**: solo route group `finance` o `efeonce_admin` puede subir `finance_reconciliation_evidence_draft`. NO se acepta member-only.
- **Dedup**: `findAssetByContentHash` reusa asset existente si SHA-256 + context coinciden y status='pending'. Idempotente — el operador puede re-subir el mismo PDF y NO se duplica.
- **Reusable**: cuando emerjan loans / factoring / OTB declarations / period closings, agregar nuevos contexts (`finance_loan_evidence_draft`, etc.) al type union + dictionaries en `greenhouse-assets.ts`. El uploader, dedup y detector son transversales.

### Finance — Bank KPI aggregation policy-driven (TASK-720)

Los KPIs del módulo Banco (`Saldo CLP`, `Saldo USD`, `Equivalente CLP`) se computan a partir de la tabla declarativa `greenhouse_finance.instrument_category_kpi_rules`. Cada `instrument_category` (bank_account, fintech, payment_platform, payroll_processor, credit_card, shareholder_account + reservadas employee_wallet, intercompany_loan, factoring_advance, escrow_account) declara cómo contribuye a cada KPI: `contributes_to_cash`, `contributes_to_consolidated_clp`, `contributes_to_net_worth`, `net_worth_sign` (+1 asset / -1 liability), `display_group` (cash / credit / platform_internal).

**Helper canónico**: `aggregateBankKpis(accounts, rules)` en `src/lib/finance/instrument-kpi-rules.ts`. Es la única fuente de los KPIs en `getBankOverview`. Si una cuenta tiene `instrument_category` sin rule → `MissingKpiRuleError` (fail-fast).

**Detector**: `task720.instrumentCategoriesWithoutKpiRule` en `getFinanceLedgerHealth`. Steady state = 0. Si > 0, agregar fila al catálogo antes de activar cuentas en esa categoría.

**FK enforcement**: `accounts.instrument_category` → `instrument_category_kpi_rules.instrument_category`. Cualquier INSERT con categoría unknown falla con FK violation.

**Reglas duras**:

- **NUNCA** sumar `closingBalance` de cuentas Banco inline para computar KPIs. Toda agregación pasa por `aggregateBankKpis`.
- **NUNCA** activar una cuenta con `instrument_category` que no tenga fila en `instrument_category_kpi_rules`. Agregar la rule primero (1 INSERT con `display_label`, `display_group`, `rationale`).
- **NUNCA** mezclar asset + liability sin signo en cálculos de Banco. La sign convention TASK-703 está embebida en `net_worth_sign`.
- Cuando emerja una categoría nueva (wallets, loans, factoring), seed la rule + el detector ledger-health pasa solo. Cero refactor de agregador.

### Finance — OTB cascade-supersede (TASK-703b)

Cuando una cuenta liability/asset necesita re-anclar su Opening Trial Balance (porque el anchor inicial fue mal interpretado, porque emerge bank statement authoritative más reciente, o porque hay phantom pre-OTB data en chain), el mecanismo canónico es **cascade-supersede**.

**Ecuación canónica del anchor**:

- `OTB.genesisDate` = SOD (start of day). `OTB.openingBalance` representa el balance al INICIO del día genesis (= EOD del día anterior).
- Movements ON `genesisDate` son **post-anchor**, se cuentan en el chain.
- Movements `< genesisDate` son **pre-anchor**, son cascade-superseded por el OTB.

**Convención de signo para liability** (credit_card, shareholder_account, futuros loans/wallets):

- `closing_balance > 0` = deuda activa con la contraparte = "Cupo utilizado" en bank UI.
- `closing_balance < 0` = sobrepago / crédito a favor del cliente.
- `closing = opening + outflows − inflows` (inverso a asset).
- En UI de credit_card: `consumed = max(0, closingBalance)` (se clampa a 0 porque banco no muestra "deuda negativa", muestra crédito por separado).

**Cómo re-anclar** (patrón reusable):

1. Identificar el bank statement authoritative más reciente (PDF cycle close, cartola con saldo running, OfficeBanking screenshot con timestamp).
2. Editar `scripts/finance/declare-opening-trial-balances.ts` con: nueva `genesisDate` (SOD), nueva `openingBalance` (= bank reality), `auditStatus='reconciled'`, `evidenceRefs` apuntando al PDF/cartola.
3. Ejecutar `pnpm finance:declare-otbs`. El helper `declareOpeningTrialBalance` automáticamente:
   - INSERT new OTB row.
   - UPDATE old active OTB → `superseded_by = new.obtb_id`.
   - SQL function `cascade_supersede_pre_otb_transactions` marca settlement_legs/income_payments/expense_payments con `transaction_date < genesisDate` como `superseded_by_otb_id = new.obtb_id` (audit-preserved, anti-DELETE).
   - DELETE account_balances rows con `balance_date < genesisDate` (proyecciones derivadas, no audit data).
   - Outbox event `finance.account.opening_trial_balance.declared` con `cascadeCounts`.
4. Ejecutar `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/rematerialize-account.ts <accountId>` para limpiar y reconstruir el chain desde el nuevo anchor.
5. Verificar que `account_balances` última row closing ≈ bank reality. Drift residual aceptable < 5-10% suele venir de: refunds pendientes de capturar como income_payment, FX rate diff entre nuestro mid-day y settlement banco, holds bancarios (authorizations no posteadas que reducen disponible pero no deuda).

**⚠️ Reglas duras**:

- **NUNCA** declarar OTB con `openingBalance` cuyo signo no haya sido validado contra la convención liability/asset. Para liability: positivo = deuda (cupo utilizado). Para asset: positivo = saldo a favor (caja). El PDF de tarjeta puede mostrar valores con signo invertido respecto a esta convención (banco usa "saldo adeudado" donde negativo = crédito a favor del cliente).
- **NUNCA** hardcodear el opening_balance en código. Vive en `account_opening_trial_balance` con `evidenceRefs` apuntando al artefacto bank source-of-truth.
- **NUNCA** DELETE manual de `account_balances` o `expense_payments` para "limpiar" un chain. Usar `cascade_supersede_pre_otb_transactions` o la declaración de nueva OTB que dispara el cascade automáticamente.
- **NUNCA** computar "Consumido" / "Cupo utilizado" en UI a partir de `periodOutflows` para cuentas revolving. Use `closingBalance` (running cumulative debt). El periodOutflows es solo "cargos del mes seleccionado" — semánticamente distinto.
- **NUNCA** filtrar transacciones a mano en queries de finance. Aplicar siempre `superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL` (las dos columnas están coordinadas — una es payment-chain, la otra es anchor-chain).
- Cuando aparezca un nuevo tipo de transaction primitive (ej. `treasury_movement`, `loan_principal_repayment`), **debe nacer con `superseded_by_otb_id`** desde su migration y respetar el cascade pattern.

**Tests** (en TASK-703b followup): paridad TS↔SQL del cascade function (assert idempotency + correct counts), liability sign convention smoke test, OTB supersede chain integrity.

**Spec canónica**: `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md` (Delta 2026-04-28 sección).

### Finance — Labor allocation consolidada (TASK-709) — invariante anti double-counting

`greenhouse_serving.client_labor_cost_allocation` es una VIEW que emite **1 row por (payroll_entry × client_team_assignment)**. Si en un mismo mes hay múltiples payroll entries para un miembro (e.g. nómina mes anterior + mes corriente posteadas en el mismo mes calendario), la VIEW emite N rows por (member, year, month, client_id) — cada una con la misma `fte_contribution` pero distinto `allocated_labor_clp`.

**Eso es semánticamente válido** para consumers que necesitan granularidad por payroll_entry (e.g. P&L close-period detail, audit del materializer payroll). **Pero es un bug** para consumers comerciales que JOIN-ean con expenses prorrateados — el JOIN multiplica los expenses N veces por la cardinalidad de payroll entries del período.

**Solución canónica**: VIEW consolidada `greenhouse_serving.client_labor_cost_allocation_consolidated` que agrupa por `(period_year, period_month, member_id, client_id)` con `SUM(allocated_labor_clp)` y `MAX(fte_contribution)`. Una row por miembro × cliente × período. Expone `source_payroll_entry_count` para drift detection.

**⚠️ Reglas duras**:

- **NUNCA** JOIN-ar `client_labor_cost_allocation` (cla cruda) con `expenses` o cualquier tabla con `payment_date` para attribution comercial. Eso causa double-counting determinístico cuando hay > 1 payroll entry por (member, period). Usa siempre `client_labor_cost_allocation_consolidated`.
- **USAR** la cla cruda solo cuando el caso de uso requiere granularidad por payroll_entry (audit, debug, payroll engine internal).
- **NO** modificar la VIEW cla cruda — rompe consumers que dependen de la granularidad por entry. La consolidación vive en una VIEW separada.
- **Reliability signal**: VIEW `labor_allocation_saturation_drift` detecta `SUM(fte_contribution) > 1.0` por (member, period) — imposible en realidad. Si emite rows, hay bug en `client_team_assignments` upstream (overlapping assignments mal partitionados por date range). El subsystem `Finance Data Quality` rolls up esta métrica como `labor_allocation_saturation_drift`. Cuando > 0 → status warning + plataforma degradada.
- Helper TS canónico: `readConsolidatedLaborAllocationForPeriod` y `getLaborAllocationSaturationDrift` en `src/lib/commercial-cost-attribution/labor-allocation-reader.ts`.
- Tests: 6 tests en `labor-allocation-reader.test.ts` cubren consolidation parsing + drift detection.

**Spec canónica**: migration `20260428110246262_task-709-labor-allocation-uniqueness-and-quality.sql` + migration `20260428110726148_task-709b-v2-attribution-uses-consolidated.sql`. La VIEW `commercial_cost_attribution_v2` (TASK-708) y `member-period-attribution.ts` ambos consumers fueron refactorizados para usar consolidada.

**Caso de prueba real (Sky Airline marzo 2026)**:
- Pre-fix: `expense_direct_member_via_fte` = $5,122,256 (2x duplicado)
- Post-fix: `expense_direct_member_via_fte` = $2,561,128 ✓
- `source_payroll_entry_count` = 2 documenta que cada miembro consolidó 2 entries (nómina febrero + marzo posteadas en marzo)

### Tests y validación

- Tests unitarios: Vitest + Testing Library + jsdom
- Helper de render para tests: `src/test/render.tsx`
- Validar con: `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit`

### Charts — política canónica (decisión 2026-04-26 — prioridad: impacto visual)

**Stack visual de Greenhouse prioriza wow factor y enganche** sobre bundle/a11y. Los dashboards (MRR/ARR, Finance Intelligence, Pulse, ICO, Portfolio Health) son la cara del portal a stakeholders y clientes Globe — la apuesta es visual primero.

- **Vistas nuevas con dashboards de alto impacto** (MRR/ARR, Finance, ICO, Pulse, Portfolio, Quality Signals, executive views): usar **Apache ECharts** vía `echarts-for-react`. Animaciones cinemáticas, tooltips multi-series ricos, gradientes premium, geo/sankey/sunburst/heatmap si se necesitan en el futuro. Lazy-load por ruta para mitigar bundle (~250-400 KB).
- **Vistas existentes con ApexCharts** (32 archivos al 2026-04-26): siguen activas sin deadline. ApexCharts se mantiene como segundo tier oficial — no es deuda técnica, es un stack válido vigente. Migración Apex → ECharts es oportunista, solo si la vista se toca y se busca subir el tier visual.
- **NO usar Recharts** como default para vistas nuevas. Recharts gana en bundle/ecosystem pero pierde en wow factor sin una capa custom de polish (que no existe). Reservar Recharts solo para sparklines compactos en KPI cards o cuando explícitamente no se necesita impacto visual.
- **Excepción única**: si necesitas un tipo de chart que ECharts no cubre o querés control absoluto Stripe-level, usar Visx (requiere construcción custom).
- **Por qué este orden** (ECharts > Apex > Recharts):
  - ECharts gana en visual atractivo (10/10), enganche (10/10), cobertura de tipos (heatmap, sankey, geo, calendar).
  - Apex ya cubre el portal con visual decente (8/10) y no urge migrar.
  - Recharts es 7/10 visual sin inversión adicional — solo gana si construimos `GhChart` premium encima, lo cual es trabajo no priorizado.
- Spec completa y trigger conditions: `docs/tasks/to-do/TASK-518-apexcharts-deprecation.md`.

### Tooling disponible (CLIs autenticadas)

Estos CLIs están autenticados localmente. Cuando una task toca su dominio, **úsalos directamente** en vez de pedirle al usuario que lo haga manualmente desde portal/web UI:

- **Azure CLI (`az`)**: autenticado contra el tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4` de Efeonce. Se usa para gestionar Azure AD App Registrations (redirect URIs, client secrets, tenant config), Bot Service, Logic Apps, Resource Groups, etc. Comandos canónicos: `az ad app show --id <client-id>`, `az ad app update`, `az ad app credential reset`, `az ad sp show`. Tenant ID Microsoft de Efeonce: `a80bf6c1-7c45-4d70-b043-51389622a0e4`. Subscription ID: `e1cfff3e-8c21-4170-8b28-ad083b741266`.
- **Google Cloud CLI (`gcloud`)**: autenticado como `julio.reyes@efeonce.org` con ADC. Usar para Secret Manager, Cloud Run, Cloud SQL, Cloud Scheduler, BigQuery, Cloud Build, Workload Identity Federation. Project canónico: `efeonce-group`.
  - **Regla operativa obligatoria**: cuando un agente necesite acceso interactivo local a GCP, debe lanzar **siempre ambos** flujos y no asumir que uno reemplaza al otro:
    - `gcloud auth login`
    - `gcloud auth application-default login`
  - Motivo: `gcloud` CLI y ADC pueden quedar desalineados; si solo se autentica uno, pueden fallar `bq`, `psql` via Cloud SQL tooling, Secret Manager o scripts del repo de forma parcial y confusa.
- **GitHub CLI (`gh`)**: autenticado contra `efeoncepro/greenhouse-eo`. Usar para issues, PRs, workflow runs, releases.
- **Vercel CLI (`vercel`)**: autenticado contra el team `efeonce-7670142f`. Usar para env vars, deployments, project config. Token en `.env.local` o config global.
- **PostgreSQL CLI (`psql`)** vía `pnpm pg:connect`: levanta proxy Cloud SQL + conexión auto. No requiere credenciales manuales.
- **Timeout en macOS (`gtimeout`)**: este workspace corre en macOS, donde `timeout` GNU no existe por defecto. `coreutils` está instalado vía Homebrew y el comando canónico es `gtimeout <duración> <comando>` (ej. `gtimeout 30s pnpm test`). No usar `timeout` crudo en recetas para agentes; si un script debe ser portable, detectar `gtimeout || timeout` o implementar timeout en Node.
- **Greenhouse Visual Capture (`GVC`, `pnpm fe:capture`)**: herramienta canónica para grabar `.webm` + frames PNG marker-based + GIF opcional de cualquier ruta del portal via Playwright + agent auth. Reemplaza el patrón ad-hoc de `_cap.mjs`. Scenario DSL declarativo bajo `scripts/frontend/scenarios/`. Output `.captures/<ISO>_<scenario>/` (gitignored). Triple gate para production. Comandos: `pnpm fe:capture <scenario> --env=staging [--gif] [--headed]` o `pnpm fe:capture --route=/path --env=staging --hold=3000`. Relacionados: `pnpm fe:capture:review <scenario|capture-dir>` para dossier UI review, `pnpm fe:capture:diff <prev> <curr>` para before/after, `pnpm fe:capture:health` para salud local y `pnpm fe:capture:gc [--apply]` para purga >30d. Para pantallas largas usar scenario con `scroll selector`, `scrollTo`, `mark fullPage` o `mark clipSelector`; preferir `data-capture="<seccion>"` sobre offsets frágiles. Arquitectura: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`. Manual: `docs/manual-de-uso/plataforma/captura-visual-playwright.md`.

**Regla operativa**: cuando un agente diagnostica un incidente y la causa raíz vive en una de estas plataformas, debe **ejecutar el fix con el CLI** (con guardrails y verificación), no documentar pasos manuales. Si el fix es destructivo (eliminar app registration, drop database, force-push) sí confirma con el usuario primero.

### Auth resilience invariants (TASK-742)

7 capas defensivas que protegen el flujo de autenticación. Cualquier cambio que toque NextAuth, secrets de auth, o el flujo de sign-in debe respetar estos invariantes — son los que evitan que una rotación mal hecha o un cambio en Azure App registration vuelva a romper login silenciosamente como en el incidente 2026-04-30.

**⚠️ Reglas duras**:

- **NUNCA** cambiar `signInAudience` de la Azure AD App Registration a `AzureADMyOrg` (single-tenant). Greenhouse es multi-tenant por arquitectura — clientes Globe (Sky, etc.) entran desde sus propios tenants Azure. El valor canónico es **`AzureADMultipleOrgs`** (work/school accounts de cualquier tenant; rechaza personal Microsoft Accounts). El callback `signIn` en `auth.ts` rechaza tenants no provisionados via lookup en `client_users` por `microsoft_oid`/`microsoft_email`/alias — la autorización fina vive en Greenhouse, no en Azure. El 2026-04-30 alguien flipeó esto a `AzureADMyOrg` y rompió SSO para todos los users. `pnpm auth:audit-azure-app` detecta drift en segundos.
- **NUNCA** remover redirect URIs registradas en la Azure App. Las canónicas son `https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (production) y `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (staging). El auditor las verifica como dura.
- **NO** llamar `Sentry.captureException(err)` en code paths de auth. Usar siempre `captureWithDomain(err, 'identity', { extra: { provider, stage } })` desde `src/lib/observability/capture.ts`. El subsystem `Identity` rolls up por `domain=identity`.
- **NO** publicar secretos críticos sin pasar por `validateSecretFormat` (`src/lib/secrets/format-validators.ts`). Si agregas un secret crítico nuevo, agregá su rule al catálogo `FORMAT_RULES`. `resolveSecret` rechaza payloads que no pasan validation.
- **NO** rotar un secret en producción manualmente. Usar `pnpm secrets:rotate <gcp-secret-id> --validate-as <ENV_NAME> --vercel-redeploy <project> --health-url <url>`. El playbook hace verify-before-cutover y revert automático si health falla.
- **NUNCA** mutar el JWT/signIn callbacks de NextAuth sin envolverlos en try/catch + `recordAuthAttempt(...)`. NextAuth swallow-ea errores → opaque `?error=Callback`. El wrapping garantiza que la próxima falla emita stage + reason_code estable a `greenhouse_serving.auth_attempts` y a Sentry.
- **NUNCA** computar SSO health en el cliente. La UI de Login lee `/api/auth/health` (contract `auth-readiness.v1`) y oculta/deshabilita botones degradados. Single source of truth.
- **NUNCA** persistir el raw token de un magic-link. Solo `bcrypt(token)` con cost 10. TTL=15min, single-use enforced en consume time. Usar `src/lib/auth/magic-link.ts` — no inventar tokens nuevos.
- **NUNCA** crear un `client_users` row con `auth_mode='both'` sin `password_hash`, ni `auth_mode='microsoft_sso'` sin `microsoft_oid`. La CHECK constraint `client_users_auth_mode_invariant` lo bloquea. Si necesitas estado transicional, usar `auth_mode='sso_pending'` (sin password ni SSO link, ready para link en próximo signIn).
- **NO** depender de `process.env.NEXTAUTH_SECRET` plano en producción si existe `NEXTAUTH_SECRET_SECRET_REF`. El resolver prefiere Secret Manager. Tener ambos crea drift.

**Helpers canónicos**:

- `validateSecretFormat(envName, value)` — Capa 1
- `getCurrentAuthReadiness()` desde `src/lib/auth-secrets.ts` — Capa 2
- `recordAuthAttempt({ provider, stage, outcome, reasonCode, ... })` desde `src/lib/auth/attempt-tracker.ts` — Capa 3
- `requestMagicLink({ email, ip })` / `consumeMagicLink({ tokenId, rawToken, ip })` — Capa 5
- `pnpm secrets:audit` / `pnpm secrets:rotate` — Capa 7

**Observability surfaces**:

- `/api/auth/health` — public read-only readiness
- `greenhouse_serving.auth_attempts` — append-only ledger (90-day retention)
- `greenhouse_sync.smoke_lane_runs` con `lane_key='identity.auth.providers'` — synthetic monitor cada 5min via Cloud Scheduler
- Sentry `domain=identity` — todos los errors de auth

**Spec completa**: `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`.

### Home Rollout Flag Platform (TASK-780)

Toda flag que controle variantes de shell o features rollouteables del módulo home debe vivir en `greenhouse_serving.home_rollout_flags` (tabla canónica con scope precedence `user > role > tenant > global`). Reemplaza la env var binaria `HOME_V2_ENABLED` que causó divergencia visible entre dev (`dev-greenhouse.efeoncepro.com`) y prod (`greenhouse.efeoncepro.com`) el 2026-05-04.

**Read API canónico**:

- Resolver: `src/lib/home/rollout-flags.ts` (`resolveHomeRolloutFlag`, `isHomeV2EnabledForSubject`). PG-first → env fallback → conservative default disabled. In-memory cache TTL 30s.
- Mutations: `src/lib/home/rollout-flags-store.ts` (`upsertHomeRolloutFlag`, `deleteHomeRolloutFlag`, `listHomeRolloutFlags`). Validation: scope_id constraints, reason ≥ 5 chars, idempotent UPSERT.
- Admin endpoint: `GET/POST/DELETE /api/admin/home/rollout-flags` (gated by `requireAdminTenantContext`).
- Reliability signal: `home.rollout.drift` (kind=`drift`, severity=`error` si count>0). Detecta missing global row, PG↔env divergence, opt-out rate > 5%.

**Defensa-en-profundidad**:

- CHECK constraint `home_rollout_flags_key_check` whitelist de `flag_key` (extender CHECK al agregar flag nueva).
- CHECK constraint `home_rollout_flags_scope_id_required` (scope_id NULL solo cuando scope_type='global').
- Audit trigger `set_updated_at` BEFORE UPDATE.
- Sentry tag `home_version: 'v2' | 'legacy'` en `captureHomeError` y `captureHomeShellError`.
- Defensive try/catch en `src/app/(dashboard)/home/page.tsx`: V2 throw → degrade graceful a legacy + Sentry tagged.

**⚠️ Reglas duras**:

- **NUNCA** crear env vars binarias para feature flags nuevas de UI/shell. Toda flag debe nacer como fila en `home_rollout_flags` (variantes de shell) o `home_block_flags` (kill-switches per-block dentro de V2).
- **NUNCA** leer `process.env.HOME_V2_ENABLED` directo en código nuevo. Solo el resolver canónico lo hace, y solo como fallback graceful cuando PG falla.
- **NUNCA** componer la decisión de variant en cliente. Server-only por construcción (`import 'server-only'`).
- **NUNCA** reportar 5xx desde el endpoint admin con stack traces. Errores sanitizados (sin env leakage).
- **NUNCA** hardcodear `homeVersion='v2'` cuando el flag resolution dice `legacy`. El tag tiene que reflejar la variante real renderizada para que el dashboard distinga correctamente.
- **NUNCA** invalidar el cache del resolver desde mutations sin invocar `__clearHomeRolloutFlagCache`. La store helpers ya lo hacen — los consumers nunca tocan el cache directo.
- Cuando emerja una flag nueva (e.g. `home_v3_shell`, `home_layout_experimental`), extender CHECK constraint `home_rollout_flags_key_check` + agregar al type union `HomeRolloutFlagKey` + agregar admin UI eventualmente.

**Spec canónica**: `docs/tasks/in-progress/TASK-780-home-rollout-flag-platform.md`.

### Nexa Insights detail page canonical invariants (TASK-947, desde 2026-05-28)

Toda surface que necesite "navegar al detail de un Nexa Insight" (Home bento, Agency ICO, Person 360 narrative, Space 360 overview, Finance dashboard, Weekly Digest email, Teams notifications, futuras superficies) **debe** apuntar al routing canonical `/nexa/insights/[id]` y consumir el helper `readNexaInsightDrill(id, subject)` para resolver el detail. Cierra el bug class 404 sistemático del CTA "Ver causa raíz" (drift TASK-696).

**Read API canónico**:

- Routing: `/nexa/insights/[id]` (top-level cross-domain, NO `/agency/insights/*` legacy). Mirror del precedente `/admin/...` (lane cross-domain, no dominio).
- Dispatch prefix canonical:
  - `EO-AIS-*` (12 hex) — signal-anchored (default cards "Ver causa raíz" del current). Estable cross-period TASK-943 append-only. Generado por `stableAiId('AIS', ...)` (ico-engine/ai/types.ts:80).
  - `EO-AIE-*` (8 hex) — enrichment-anchored (share permalinks TASK-449). Snapshot específico. Generado por `stableEnrichmentId(signalId, promptHash)` (llm-types.ts:343).
  - `EO-AIH-*` (8 hex) — enrichment-history forensic. Generado por `stableEnrichmentHistoryId(runId, enrichmentId)` (llm-types.ts:346).
- Helper canonical único: `readNexaInsightDrill(id, subject) → NexaInsightDrillResult` server-only en `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`. Detecta prefix → dispatchea lookup → aplica subject-aware filter → retorna discriminated union.
- 5 states canonical: `current` | `superseded` (con `currentSignalDrillId` link al vigente) | `expired` (con `resolvedAt`) | `not_found` | `degraded` (con `reason: 'pg_read_failed' | 'history_unavailable' | 'pg_stale'`).
- Capability: `nexa.insights.read` (module `delivery`, action `read`, scope `tenant/all`). Seedeada en `greenhouse_core.capabilities_registry` (migration `20260529004012583`). Grant matriz canonical V1: `EFEONCE_ADMIN ∪ FINANCE_ADMIN ∪ HR_MANAGER` (role) + route_groups `internal/finance/hr` (broad operational).
- Helper URL: `buildNexaInsightDrillHref(id)` → `/nexa/insights/<id>`. Centraliza la shape para evitar drift cross-surface.

**3-tier lookup canonical** (enrichment-anchored `EO-AIE-*`):

1. PG serving `greenhouse_serving.ico_ai_signal_enrichments` (current `status='succeeded'`).
2. Fallback `greenhouse_serving.ico_ai_signal_enrichment_history` (TASK-914 history). Si hit → `superseded` state con link al `signalId` vigente.
3. Miss → `not_found`.

**Subject-aware filter canonical** (sin 403, anti-oracle TASK-872):

- `tenantType='client'` → SIEMPRE `not_found` (V1 internal-only).
- `EFEONCE_ADMIN` → SIEMPRE permitido.
- `route_groups` broad `internal/finance/hr` → permitido (acceso operacional).
- Collaborator sin route_group broad → solo si `subject.memberId === insight.memberId` (self-access).
- Cualquier fallback → `not_found`.

**⚠️ Reglas duras**:

- **NUNCA** crear detail page de Nexa Insights bajo route_group de dominio (`/agency/...`, `/finance/...`, `/people/...`). Canonical es `/nexa/insights/[id]` top-level. Mismo principio que `/admin/...` lane.
- **NUNCA** consumer downstream compone su propio drawer/modal/detail para Nexa Insights. Toda navegación pasa por `/nexa/insights/[id]` (deep-linkable, share-friendly, estable cross-time/tenant/domain).
- **NUNCA** crear URLs canonical ancladas al `enrichmentId` para cards "Ver causa raíz" del current. Cards usan `signalId` (estable cross-period). `enrichmentId` reservado para share/forensic explícito (TASK-449 V1.3).
- **NUNCA** retornar `403` desde el detail page cuando subject sin acceso. `notFound()` siempre (anti-oracle TASK-872). 403 leakea info de existencia al atacante; legítimos bloqueados se detectan via reliability signals upstream.
- **NUNCA** read directo de `ico_engine.ai_signals` raw BQ ni de `ico_ai_signal_enrichments`/`ico_ai_signal_enrichment_history` PG en consumers. Pasa por `readNexaInsightDrill`. VIEW canonical `ai_signals_current` TASK-943.
- **NUNCA** colapsar UI states `not_found` + `expired` + `superseded` + `degraded` en un único "Sin datos" ambiguo. Mapping explícito TASK-946 framework (`current → default` / `superseded → partial banner amber` / `expired → empty-positive` / `not_found → notFound()` / `degraded → error banner`).
- **NUNCA** mostrar narrativa superseded sin banner explícito "versión histórica" + link al `currentSignalDrillId` cuando exista.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'nexa_insight_detail', stage: 'pg_read' | 'page_loader' } })`.
- **NUNCA** seed `nexa.insights.read` en TS catalog sin grant en `runtime.ts` mismo PR (invariant TASK-873 + TASK-935). Guard mecánico `capability-grant-coverage.test.ts` rompe build si emerge drift.
- **NUNCA** emit URL `/agency/insights/*` desde loader/componente nuevo. Canonical `/nexa/insights/[id]`. Grep `rg "/agency/insights/" src --include='*.ts' --include='*.tsx'` debe estar vacío (excepto comentarios y tests).
- **NUNCA** romper el dispatch prefix `EO-AIS-*` / `EO-AIE-*` / `EO-AIH-*` en el resolver. Semántica anchor estable vs snapshot share-friendly vs forensic — los 3 tienen propósitos distintos.
- **NUNCA** modificar la `severity_color` / `severity_label` map en `GH_NEXA` para un caso específico del detail. Reusa los tokens canonical existentes (TASK-696 / TASK-945) — single source of truth.
- **SIEMPRE** que email/Teams notification incluya link a insight, usar `/nexa/insights/<signalId>` (estable cross-time + cross-tenant + cross-domain). Cards default = `signalId`; share buttons = `enrichmentId` explícito.
- **SIEMPRE** que emerja consumer cross-surface nuevo que necesite "detail de un Nexa Insight", navegar al canonical — cero composición ad-hoc.
- **SIEMPRE** que el LLM-enrichment-worker regenere un enrichment, el URL `/nexa/insights/EO-AIS-*` sigue válido apuntando al current (signal-anchored = estable cross-regeneration por design).
- **SIEMPRE** que se introduzca una nueva surface emisora de drillHref a Nexa Insights, agregar test focal anti-regresión que assert (a) la URL es `/nexa/insights/*` (NO `/agency/insights/*`) y (b) usa `signalId` (NO `enrichmentId`) para cards default.

**Spec canónica**: `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md`. Patrones fuente: TASK-611 (organization workspace projection — detail page server-side con projection + degraded honest), TASK-872 (anti-oracle `notFound()` pattern), TASK-873 (capability runtime grant invariant + guard mecánico), TASK-935 (capability grants reconciliation + DEVOPS_OPERATOR no-existe enforcement), TASK-946 (12 canonical UI states framework). Helpers canónicos: `readNexaInsightDrill`, `buildNexaInsightDrillHref`, `detectNexaIdKind`, `NEXA_ID_PREFIXES` (todos en `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`).

### Quick Access Shortcuts Platform (TASK-553)

Toda surface que renderice atajos top-level de navegación (header `<ShortcutsDropdown />`, Home `recommendedShortcuts`, futuras command palettes, Mi Greenhouse, settings personales) **debe** consumir el resolver canónico desde `src/lib/shortcuts/resolver.ts`. Reemplaza los arrays hardcodeados de shortcuts que vivían en `NavbarContent.tsx` (vertical + horizontal) y los desacopla del catálogo Home.

**Read API canónico**:

- Catálogo: `src/lib/shortcuts/catalog.ts` (`SHORTCUT_CATALOG`, `AUDIENCE_SHORTCUT_ORDER`, `getShortcutByKey`, `isKnownShortcutKey`). Single source of truth de IDs, labels, subtitles, routes, iconos, módulo y dual-plane gates opcionales (`viewCode` + `requiredCapability`).
- Resolver: `resolveAvailableShortcuts(subject)`, `resolveRecommendedShortcuts(subject, limit?)`, `validateShortcutAccess(subject, key)` (write-path boolean), `projectShortcutForHome(shortcut)` (legacy projection bridge).
- Store: `src/lib/shortcuts/pins-store.ts` (`listUserShortcutPins`, `pinShortcut` idempotente, `unpinShortcut` idempotente, `reorderUserShortcutPins` atómica, `listDistinctPinnedShortcutKeys` para reliability).

**Persistencia**: `greenhouse_core.user_shortcut_pins` con FK CASCADE on user delete, audit trigger `updated_at`, ownership `greenhouse_ops` + grants `greenhouse_runtime`. Scope per-usuario (no por tenant): los pins son navegación personal, la revalidación de acceso ocurre en READ time contra session vigente.

**API canónica** (`/api/me/shortcuts`):

- `GET /api/me/shortcuts` → `{ recommended, available, pinned }` para usuario actual.
- `POST /api/me/shortcuts` → pin idempotente. Body: `{ shortcutKey }`.
- `DELETE /api/me/shortcuts/[shortcutKey]` → unpin idempotente.
- `PUT /api/me/shortcuts/order` → reorder atómico. Body: `{ orderedKeys: string[] }`.

Auth: `getServerAuthSession` + `can(subject, 'home.shortcuts', 'read')` + `validateShortcutAccess` server-side antes de cualquier write. Errores sanitizados con `redactErrorForResponse` + `captureWithDomain('home', ...)`.

**Reliability signal canónico**: `home.shortcuts.invalid_pins` (kind=`drift`, severity=`warning` si count>0, steady=0). Detecta llaves pineadas sin entry en el catálogo TS. UI no rompe (reader filtra), pero ops detecta drift.

**⚠️ Reglas duras**:

- **NUNCA** hardcodear arrays de shortcuts en un layout o `NavbarContent`. La fuente única es `src/lib/shortcuts/catalog.ts`. Drift detectado por code review.
- **NUNCA** decidir visibilidad de un shortcut desde el cliente. El cliente lee `/api/me/shortcuts` que devuelve solo lo autorizado.
- **NUNCA** persistir un pin sin pasar por `validateShortcutAccess` server-side. El POST handler lo enforce — no replicar la lógica del cliente.
- **NUNCA** mostrar un shortcut pineado sin re-validar acceso al render. El reader del API ya lo filtra; cualquier consumer alternativo debe pasar por el resolver.
- **NUNCA** mezclar el shape de header (`{key, label, subtitle, route, icon, module}`) con el legacy de Home (`{id, label, route, icon, module}`). Use `projectShortcutForHome` cuando se necesite el shape legacy.
- **NUNCA** introducir un nuevo gate (e.g. `requiredFeatureFlag`) sin extender `CanonicalShortcut` + `isShortcutAccessible` en el resolver. Cero branching inline en consumers.
- Cuando emerja una surface adaptativa nueva (Mi Greenhouse, command palette, settings personales con atajos), debe consumir el resolver — no copiar el catálogo ni reimplementar el gate.

**Spec canónica**: `docs/tasks/complete/TASK-553-quick-access-shortcuts-platform.md`. Doc funcional: `docs/documentation/plataforma/accesos-rapidos.md`. Manual: `docs/manual-de-uso/plataforma/accesos-rapidos.md`. Delta UI Platform: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (2026-05-04).

### Operational Data Table Density Contract (TASK-743)

Toda tabla operativa con celdas editables inline o > 8 columnas debe vivir bajo el contrato de densidad. Resuelve el overflow horizontal contra `compactContentWidth: 1440` de manera robusta y escalable, sin parchear caso-por-caso.

- **3 densidades canonicas** (`compact` / `comfortable` / `expanded`) con tokens fijos: row height, padding, editor min-width, slider visibility, font size.
- **Resolucion**: prop > cookie `gh-table-density` > container query auto-degrade (< 1280px baja un nivel) > default `comfortable`.
- **Wrapper canonico**: `<DataTableShell>` con `container-type: inline-size`, `ResizeObserver`, sticky-first column, scroll fade en borde derecho cuando hay overflow.
- **Primitive editable canonica**: `<InlineNumericEditor>` (reemplaza `BonusInput`). En `compact` solo input, en `comfortable` input + slider en popover-on-focus, en `expanded` input + slider inline + min/max captions.
- **Ubicacion**: `src/components/greenhouse/data-table/{density,useTableDensity,DataTableShell}.tsx` y `src/components/greenhouse/primitives/InlineNumericEditor.tsx`.
- **Spec canonica**: `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`.
- **Doc funcional**: `docs/documentation/plataforma/tablas-operativas.md`.

**⚠️ Reglas duras**:

- **NUNCA** crear una `Table` MUI con > 8 columnas o con `<input>`/`<TextField>`/`<Slider>` dentro de `<TableBody>` sin envolverla en `<DataTableShell>`. Lint rule `greenhouse/no-raw-table-without-shell` bloquea el commit.
- **NUNCA** hardcodear `minWidth` en una primitiva editable inline. Debe leer la densidad via `useTableDensity()`.
- **NUNCA** mover `compactContentWidth: 1440` a `'wide'` global para "resolver" un overflow. Es cortoplacista y rompe consistencia con dashboards diseñados a 1440. La solucion canonica es el contrato.
- **NUNCA** duplicar `BonusInput`. Esta marcado como deprecated re-export que delega en `<InlineNumericEditor>`. Cualquier consumer nuevo debe usar la primitiva canonica directamente.
- **NUNCA** desactivar el visual regression test `payroll-table-density.spec.ts` para forzar un merge. Si falla por overflow, respetar el contrato; no bypass.
- Cuando emerja una tabla operativa nueva (ProjectedPayrollView, ReconciliationWorkbench, IcoScorecard, FinanceMovementFeed), migrarla al contrato de manera oportunista. La lint rule la fuerza al primer toque significativo.

### Final Settlement Document Lifecycle invariants (TASK-863 V1.5.2)

Toda transición del state machine de `greenhouse_payroll.final_settlement_documents` (renuncia voluntaria; extensible a futuras causales) **debe** regenerar el PDF persistido para mantener el invariante "`pdf_asset_id` apunta a un PDF rendereado con el `documentStatus` actual de DB". El bug class detectado live 2026-05-11 con el finiquito de Valentina Hoyos: el doc se aprobó en DB pero el operador descargaba el asset persistido con el render original del estado `rendered` (badge "Borrador HR" + watermark "PROYECTO"), porque solo `issued` y `signed_or_ratified` regeneraban — las 5 transitions restantes (`in_review`, `approved`, `voided`, `rejected`, `superseded`) dejaban el PDF stale.

**Read API canónico**:

- Helper canónico atómico: `regenerateDocumentPdfForStatus(client, document, newStatus, actorUserId, ratification?)` en [src/lib/payroll/final-settlement/document-store.ts](src/lib/payroll/final-settlement/document-store.ts). Acepta el set canónico cerrado `'in_review' | 'approved' | 'issued' | 'signed_or_ratified' | 'voided' | 'rejected' | 'superseded'`. Falla soft (transition de DB ya commiteó; estado legal es source of truth) con `captureWithDomain('payroll', err, ...)` para Sentry rollup.
- Asset metadata canónica: cada regen persiste `metadata_json.documentStatusAtRender = newStatus` en `greenhouse_core.assets`. NUNCA cambiar el nombre de esta key sin actualizar el reader del signal.
- Reliability signal: `payroll.final_settlement_document.pdf_status_drift` ([src/lib/reliability/queries/final-settlement-pdf-status-drift.ts](src/lib/reliability/queries/final-settlement-pdf-status-drift.ts)). Detecta `document_status` actual != `asset.metadata_json->>'documentStatusAtRender'`. Steady=0. Severity warning si count>0, error si drift > 24h.
- Test anti-regresión: `document-status-regen-invariant.test.ts` parsea el source y verifica que TODA `SET document_status = 'X'` (excepto `rendered`) tiene un call matchedo a `regenerateDocumentPdfForStatus(client, ..., 'X', ...)`. Rompe build si emerge un transition nueva sin regen.

**Matriz canónica de watermark + badge per status** (idempotente con la matriz V1.1 en spec finiquito):

| documentStatus | Watermark | Badge label |
| --- | --- | --- |
| `rendered` | PROYECTO (warning) | Borrador HR |
| `in_review` | PROYECTO (warning) | En revisión interna |
| `approved` | PROYECTO (warning) | Aprobado · pendiente de emisión |
| `issued` | CLEAN | Listo para firma |
| `signed_or_ratified` | CLEAN | Firmado / ratificado |
| `voided` | ANULADO (error) | Anulado |
| `rejected` | RECHAZADO (error) | Rechazado por trabajador |
| `superseded` | REEMPLAZADO (neutral) | Reemplazado |

**⚠️ Reglas duras**:

- **NUNCA** hacer `UPDATE greenhouse_payroll.final_settlement_documents SET document_status = 'X' ...` sin llamar a `regenerateDocumentPdfForStatus(client, document, 'X', actorUserId, ...)` dentro de la misma transacción inmediatamente después. El test anti-regresión rompe build si emerge un callsite que viole esto.
- **NUNCA** invocar `Sentry.captureException()` directo en el regen failure path. Usar `captureWithDomain(err, 'payroll', { tags: { source: 'final_settlement_pdf_regen', stage: newStatus }, extra: { ... } })`.
- **NUNCA** persistir un PDF de finiquito sin `metadata_json.documentStatusAtRender`. El reliability signal lo detecta como drift y operador puede ver el problema antes de que un cliente lo reporte.
- **NUNCA** asumir que el snapshot en memoria refleja el documentStatus actual post-update sin re-leer la fila o sin pasar por el helper. El helper hace el regen+UPDATE pdf_asset_id en una sola tx atomic.
- **NUNCA** bloquear la transition de estado si el render falla. La DB es source of truth del estado legal; el PDF es un artefacto derivado. Reportar via Sentry y dejar que el reliability signal alerte hasta que el operador haga reissue.
- **NUNCA** agregar una transition nueva al state machine (e.g. `archived`, `notified_to_dt`) sin: (a) extender el type union `DocumentStatusForRegen` en el helper, (b) llamar al helper en el código de la transition, (c) extender la matriz canónica de watermark/badge, (d) extender el test anti-regresión + el array `REGEN_REQUIRED_STATUSES`.
- **NUNCA** modificar la key `documentStatusAtRender` en el asset metadata sin actualizar paralelamente: (a) el reader del reliability signal, (b) el test anti-regresión que la valida.
- **SIEMPRE** que un caller del helper retorne `null` (regen failure), preservar el `pdf_asset_id` previo del documento + spread del row de DB original (ver pattern `regenerated ? { ...document, pdfAssetId, contentHash } : document`).

**Spec canónica**: `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Delta V1.5.2). Task evidence: `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` Delta V1.5.2.

### Real-Artifact Iterative Verification Loop — metodología canónica para features visuales (TASK-863 V1.1→V1.5.1)

Para cualquier feature que **emita o renderice un artefacto consumido por humanos fuera del agente** — PDFs operativos, documentos legales, emails transaccionales, layouts de detalle complejos, dashboards ejecutivos, exports Excel, recibos, certificados, contratos, addenda — el contrato técnico (`tsc --noEmit` + `pnpm lint` + tests unitarios + fixtures sintéticos) **NO es suficiente** para garantizar production-readiness. El bug class detectado live 2026-05-11 en el finiquito de Valentina Hoyos (5 rondas iterativas V1.1→V1.5 + hotfix V1.5.1) lo demostró: 12 hallazgos visuales + 5 bloqueantes legales **invisibles** al audit pre-emisión emergieron solo al **emitir un caso real**, capturarlo, y re-auditarlo con skills sobre el artefacto real.

**Metodología canónica de 7 pasos** (reusable cross-feature):

1. **Implementar V1** con audit pre-emisión normal (skills de dominio consultadas pre-implementation, `tsc --noEmit`, `pnpm lint`, tests unitarios, fixtures sintéticos, lint rules, type checks).
2. **Acuerdo explícito con el usuario** para entrar al loop de verificación visual con caso real. El usuario aporta datos productivos (cliente/colaborador/proveedor real con datos reales — nombre, RUT, dirección, cargo, monto). El agente NO inventa datos; opera sobre el caso que el usuario aprueba.
3. **Sesión Playwright + Chromium con agent auth** (NO mocks):
   - Setup: `AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs` genera `.auth/storageState.json` con sesión NextAuth válida del usuario `agent@greenhouse.efeonce.org`.
   - Navegar al portal real (dev local `http://localhost:3000`, staging `dev-greenhouse.efeoncepro.com` via bypass, o producción cuando aplica — coordinar con el usuario).
   - Trigger la acción que emite el artefacto (click "Emitir", "Calcular", "Enviar", "Generar PDF", etc.) usando la UI exacta del operador.
4. **Capturar el artefacto real**:
   - **PDFs**: descargar el asset emitido (`/api/assets/private/[id]` con sesión válida), abrir con macOS Preview / pdf viewer y screenshot de cada página.
   - **Emails**: invocar el preview endpoint canónico (`/api/emails/preview/[template]`), screenshot del render Chromium o exportar HTML.
   - **UI**: screenshot del browser Chromium con la página completa rendereada (Playwright `page.screenshot({ fullPage: true })` o equivalente manual).
   - **Excel**: descargar el archivo y abrirlo con Numbers/Excel para inspección visual + verificar agregaciones.
   - **Compartir captura con el agente** en el chat (drag & drop / paste image / file path) para que el agente la consuma visualmente.
5. **Re-audit comprehensive con 3 skills sobre el artefacto real** (no fixture sintético):
   - **Skill de dominio** del feature (e.g. `greenhouse-payroll-auditor` para nómina/finiquitos, `greenhouse-finance-accounting-operator` para finance, `greenhouse-hr` para HR, `commercial-expert` para GTM/sales, etc.).
   - **Skill UX writing del registro** correspondiente (`greenhouse-ux-writing` en modo `es-CL formal-legal` para textos jurídicos, `es-CL operativo` para docs operacionales, `es-CL técnico` para integraciones, `en-US` para audiencias internacionales).
   - **Skill visual** apropiada (`modern-ui` para jerarquía/tipografía/spacing/balance, `greenhouse-ux` para layout/component selection, `greenhouse-microinteractions-auditor` cuando hay motion/feedback).
   - Las 3 skills miran la **misma evidencia visual** (el screenshot/PDF/email real) y reportan independientemente; sus hallazgos se consolidan.
6. **Iterar fixes hasta limpieza total**:
   - Aplicar fixes al código.
   - Re-emitir el artefacto (paso 3 + 4 nuevamente).
   - Re-auditar (paso 5 nuevamente).
   - Cerrar bloqueantes uno a uno; cada round produce un commit V1.x.
   - El loop termina cuando las 3 skills reportan zero blockers Y el usuario aprueba visualmente el resultado.
7. **Canonizar el resultado** en:
   - Spec arquitectónica (`docs/architecture/<DOMAIN>_V1_SPEC.md` con Delta del round).
   - Doc funcional (`docs/documentation/<domain>/<feature>.md` con bump de versión).
   - Manual de uso (`docs/manual-de-uso/<domain>/<feature>.md`) si aplica al operador.
   - ADR en `DECISIONS_INDEX.md` si la decisión es contractual cross-domain.
   - CLAUDE.md + AGENTS.md con invariantes duros si emergen reglas reusables (caso real: Semantic Column Invariants).
   - Task delta con resumen de los rounds + aprendizaje canonizado.

**Aprendizaje meta canonizado** (TASK-863 evidencia):

Sin paso 3-5 (loop real con artefacto + 3-skill audit), bugs como:

- B-1 cláusula PRIMERO mezclando hitos legales distintos (vicio defendible en demanda)
- B-2 cláusula SEGUNDO con verbo performativo incorrecto (vicio de consentimiento)
- B-3 cláusula CUARTO citando solo modificatoria (jurídicamente débil)
- V1.5.1 cargo del trabajador en col empleador (mezcla semántica de partes)
- Ligature "fi" rota produciendo "frma" / "defnitivo" / "ratifcada" (typography drift)
- Footer overlap visual / page break partiendo cláusulas (layout drift)

**quedan latentes** hasta que un cliente, abogado, contralor o auditor externo los detecte — momento en que el costo de remediación (relación con cliente, retraso operativo, riesgo legal/financiero) es **órdenes de magnitud mayor** al costo del loop.

**Cuándo aplicar el loop (decision tree)**:

- ¿El feature emite un artefacto que un humano externo al equipo va a leer/firmar/auditar? → SÍ, aplicar loop completo (pasos 1-7).
- ¿El feature es solo backend (endpoint, sync, cron) sin render visual? → NO, audit técnico es suficiente.
- ¿El feature es UI interna del agente (admin tools, debug surfaces)? → Loop simplificado (pasos 1-3 + visual review, sin 3-skill audit).
- ¿El feature es UI de operador interno (HR, Finance, Agency)? → Loop completo si el resultado de la UI afecta decisiones operativas con blast radius (e.g. cálculo de finiquito, conciliación bancaria, cierre mensual). Audit simplificado si es read-only.

**Herramientas canónicas del loop**:

| Capa | Herramienta canónica | Comando / archivo |
| --- | --- | --- |
| Agent auth | NextAuth headless | `POST /api/auth/agent-session` con `AGENT_AUTH_SECRET` |
| Playwright setup | Storage state generation | `node scripts/playwright-auth-setup.mjs` |
| Staging request bypass SSO | `staging-request.mjs` | `pnpm staging:request <path>` |
| PDF capture | Asset download + macOS Preview screenshot | `/api/assets/private/[id]` + `cmd+shift+5` |
| Email preview | Template render endpoint | `/api/emails/preview/[template]` |
| UI screenshot | Playwright full-page | `await page.screenshot({ fullPage: true })` |
| Excel inspection | Numbers / Excel macOS | descarga + apertura manual |
| Skill re-audit | Agent invocation con artefacto | drag-drop screenshot al chat + invocar skills |

**Pattern fuente** (canonizado live 2026-05-11): TASK-863 V1.1→V1.5.1 cerró 5 rondas iterativas en `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` (sección Delta V1.1-V1.5.1). Es el caso reusable: cuando alguien implemente el próximo doc legal (contrato de trabajo, addenda, certificado de servicio, finiquito de otras causales), seguir esta receta verbatim.

### Semantic Column Invariants — frontend / PDFs / emails / documentos legales (TASK-863 V1.5.1)

Cuando una surface renderiza datos en N columnas donde cada columna **representa una entidad distinta** (empleador vs trabajador, deudor vs acreedor, sender vs receiver, parte A vs parte B), la asignación de cada dato a su columna **NO es detalle visual — es invariante semántico de integridad de datos**. Romperlo en un documento legal produce vicio defendible (caso real: PDF de finiquito con "Cargo" del trabajador en col empleador detectado primer emisión real Valentina Hoyos, hotfix V1.5.1 2026-05-11).

**Bug class**: grid 2-cols con `flexWrap` (`@react-pdf/renderer`, CSS flexbox/grid, MUI `Grid container`, HTML email tables) deja el flujo de wrap decidir dónde aterriza cada cell. Cuando una dimensión existe solo para una parte (e.g. `jobTitle` solo para personas naturales; `taxId` solo para entidades; `birthDate` solo para naturales), el cell aterriza en la columna equivocada y mezcla semánticamente datos de las dos partes.

**⚠️ Reglas duras**:

- **NUNCA** dejar que `flexWrap`, `grid-auto-flow` o `column-wrap` decida la columna semántica de un dato. Si una columna representa una entidad, TODOS los datos de esa entidad aterrizan explícitamente en su columna — NUNCA por accidente del wrap.
- **NUNCA** intercalar campos de entidades distintas en grid 2-cols cuando una tenga más dimensiones que la otra. Inserta **spacer canónico** (`<View style={styles.field} />` en react-pdf; `<td>&nbsp;</td>` en email; `<Grid item />` empty en MUI) en la columna que no aplica para preservar la invariante.
- **NUNCA** "rellenar" la columna vacía con contenido falso/derivado (`N/A`, `—`, `No aplica`, repetir un dato del otro lado) para "balancear" visualmente. Mezcla semántica y confunde al lector.
- **NUNCA** asumir que el audit pre-emisión cubrió este bug class. El layout-by-wrap se ve correcto cuando todas las dimensiones son simétricas; el bug emerge cuando aparece un campo asimétrico. **Validar con caso real** del dominio, NO con fixture sintético.
- **NUNCA** acoplar el `label` del campo a la entidad mediante posicionamiento (e.g. "Cargo" sin prefix asumiendo la posición lo deja claro). El label debe ser auto-explicativo (`Cargo del trabajador`, `Domicilio empleador`, `RUT empleador`) por si la columna se rompe.
- **SIEMPRE** que emerja un campo asimétrico en layout 2-cols, insertar spacer en la otra columna en el MISMO commit. Tests visuales/snapshot capturan la asimetría.
- **SIEMPRE** que un documento legal/regulatorio (finiquito, contrato, addenda, certificado, factura, boleta, recibo, carta formal) tenga partes comparecientes, las columnas DEBEN preservar la invariante: parte A en col 1, parte B en col 2, parte C (ministro de fe, testigo, garante) en col 3. Sin excepción.
- **SIEMPRE** que un email transaccional tenga sender + receiver visibles, preservar el contrato visual de columnas en `src/views/emails/`.

**Pattern fuente** (canonizado live 2026-05-11 vía TASK-863 V1.5.1):

```tsx
// src/lib/payroll/final-settlement/document-pdf.tsx — fix canónico V1.5.1
<View style={styles.partyGrid}>
  <Field label='Empleador' value={employer.legalName} />
  <Field label='Trabajador/a' value={collaborator.legalName} />
  <Field label='RUT empleador' value={employer.taxId} />
  <Field label='RUT trabajador/a' value={collaborator.taxId} />
  <Field label='Domicilio empleador' value={employer.address} />
  <Field label='Domicilio trabajador/a' value={worker.address} />
  <View style={styles.field} />                                {/* col 1 — spacer canónico: empleador no tiene cargo */}
  <Field label='Cargo' value={collaborator.jobTitle} />        {/* col 2 — trabajador */}
</View>
```

**Aplicabilidad cross-surface**:

| Surface | Stack | Ejemplos |
| --- | --- | --- |
| PDFs operativos | `@react-pdf/renderer` | Finiquitos, contratos, addenda, certificados, boletas, recibos, cartas formales |
| Emails transaccionales | React Email + HTML tables | Confirmación pago, notificaciones cambio contrato, recordatorios firma |
| Tablas operativas MUI | DataTableShell (TASK-743) | Conciliación bancaria (movimiento vs match), payment orders (origen vs destino), payroll (haberes vs descuentos) |
| Layouts de detalle | MUI Grid container | Drawers cliente vs proveedor, perfiles persona vs organización |
| Comparativos visuales | CSS Grid / Flexbox | Before/after, plan A vs plan B, propuesta vs contrato firmado |

**Pattern canónico post-emisión real** (aprendizaje del loop V1.1→V1.5):

Para cualquier documento legal/regulatorio nuevo o cambio mayor que vaya a ser firmado/notarizado/auditado externamente, el pre-emisión audit técnico (`tsc --noEmit` + `pnpm lint` + visual review) NO es suficiente:

1. Implementar V1 con fixtures + audit técnico.
2. **Emitir 1 caso real** del dominio (datos reales del cliente/colaborador/proveedor).
3. Invocar **comprehensive audit 3-skills** sobre el documento real emitido:
   - Skill de dominio (e.g. `greenhouse-payroll-auditor`, `greenhouse-finance-accounting-operator`).
   - Skill UX writing del registro (`greenhouse-ux-writing` con foco es-CL formal-legal para textos jurídicos; operativo para docs operacionales; técnico para integraciones).
   - Skill visual (`modern-ui` o `greenhouse-ux`) para jerarquía/tipografía/spacing/balance.
4. Iterar fixes hasta cerrar bloqueantes.
5. **Canonizar** aprendizajes: AGENTS.md + CLAUDE.md + spec arquitectónica + doc funcional + manual de uso + ADR si toca contratos compartidos.

Sin paso 3 (audit comprehensive post-real-emit), bugs como B-1/B-2/B-3 (cláusulas legales con vicio defendible) o V1.5.1 (cargo del trabajador en col empleador) quedan latentes y se manifiestan recién cuando un cliente, abogado, contralor o auditor externo lo detecta — costo mucho mayor.

**Spec asociada**: `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md` (Legal Signatures helper canónico V1.4); `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Finiquito Delta V1.5 + V1.5.1).

### Sample Sprints Runtime Projection invariants (TASK-835)

Toda surface que renderice `/agency/sample-sprints` (command center, wizards, futuras superficies organization-first) **debe** consumir el `runtime` field del payload del API. La projection vive en `src/lib/commercial/sample-sprints/runtime-projection.ts` y es la única capa que traduce datos de dominio (services + engagement_* + cost attribution + Commercial Health) al view model que la UI runtime consume.

**Read API canónico**:

- Resolver: `resolveSampleSprintRuntimeProjection({tenant, selectedServiceId?, prefetchedItems?, prefetchedDetail?}) → SampleSprintRuntimeProjection`. Server-only enforce, cache TTL 30s in-memory keyed por `(subjectId, tenantId)`.
- Helpers asociados (todos extendidos en TASK-835):
  - `readCommercialCostAttributionByServiceForPeriodV2({serviceIds, fromPeriod, toPeriod, attributionIntents?})` — sibling del reader byClient TASK-708, comparte VIEW canónica
  - `enrichProposedTeam(proposedTeam[]) → {team, hasUnresolvedMembers}` — LEFT JOIN `greenhouse_core.members WHERE active=TRUE`
  - `resolveCapacityRiskForSprint({team, startDate, targetEndDate}) → {capacityRisk, allLookupsFailed}` — usa `getMemberCapacityForPeriod` existente
  - 6 health helpers (`countCommercialEngagement{OverdueDecision,BudgetOverrun,Zombie,UnapprovedActive,StaleProgress}` + `getCommercialEngagementConversionRateSnapshot`) ahora aceptan `options?: {tenantContext?}` opcional. Backward compat 100%.
- API endpoints: `GET /api/agency/sample-sprints` y `GET /api/agency/sample-sprints/[serviceId]` adjuntan `runtime` field al payload existente (Checkpoint C). Backward compat 100%.

**Reactive cache invalidation**: el consumer `sampleSprintRuntimeCacheInvalidationProjection` (`src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.ts`) escucha 6 outbox events `service.engagement.{declared, approved, rejected, capacity_overridden, progress_snapshot_recorded, outcome_recorded}` y dropea el cache scoped al `service_id`. Idempotente.

**Reliability signal**: `commercial.sample_sprint.projection_degraded` (kind=`drift`, severity=`warning` si count>0, steady=0). Reader: `getSampleSprintProjectionDegradedSignal`. Subsystem rollup: `commercial`. Cuenta degradaciones `severity=error` observadas en los últimos 5 minutos (counter in-memory).

**Convención canónica de progress**: el `%` de avance vive en `engagement_progress_snapshots.metrics_json.deliveryProgressPct` como número ∈ [0,100]. El runtime acepta `metrics.progressPct` como fallback compat. Future tasks que persistan progreso DEBEN respetar la key — el wizard `RuntimeProgressWizard` ya escribe `metricsJson.deliveryProgressPct`.

**⚠️ Reglas duras**:

- **NUNCA** derivar `progressPct`, `actualClp`, `team`, `capacityRisk` ni signals en componentes React. Toda derivación pasa por `runtime-projection.ts` server-side.
- **NUNCA** importar la projection desde código cliente. Enforce con `import 'server-only'` al inicio del módulo.
- **NUNCA** consumir `commercial_cost_attribution_v2` directo en componentes. Siempre via `readCommercialCostAttributionByServiceForPeriodV2` o sibling reader del mismo módulo. NUNCA SQL inline en projection.
- **NUNCA** mostrar `0` literal cuando un valor no se pudo computar. Usar `null` + degraded honest. UI distingue `loading | ready | empty | degraded` (cuatro estados, no tres).
- **NUNCA** derivar severity de signals client-side por status enum. Severity viene del helper canónico server-side.
- **NUNCA** mostrar equipo desde `client.organizationName` o `space.spaceName`. El team es `proposedTeam` enriquecido con `members.display_name + role_title`.
- **NUNCA** invocar los 6 health helpers de `health.ts` con scope global desde la surface comercial. Usar siempre `tenantContext` resuelto del subject. Solo `/admin/ops-health` (path admin) consume global.
- **NUNCA** inventar `kind` de signal nuevos en la projection. Mapear 1:1 a los 6 kinds canónicos de Commercial Health: `overdue-decision | budget-overrun | zombie | unapproved-active | stale-progress | conversion-rate-drop`.
- **NUNCA** escribir literals de copy en JSX para degraded states. Extender `GH_AGENCY.sampleSprints.degraded.<code>` en `src/lib/copy/agency.ts` (TASK-265).
- **NUNCA** crear endpoint nuevo `/api/agency/sample-sprints/runtime` preventivo sin segundo consumer demostrado. La projection vive embebida en el payload existente (Checkpoint C).
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de la projection. Usar `captureWithDomain(err, 'commercial', { tags: { source: 'sample_sprints_runtime_projection', stage: '<stage>' } })`.
- **SIEMPRE** que un outbox event afecte un sprint (declared / approved / rejected / capacity_overridden / progress_snapshot_recorded / outcome_recorded), invalidar cache scoped al `service_id` via consumer reactivo registrado.
- **SIEMPRE** que emerja un nuevo `degraded.code`, agregarlo al enum cerrado `SampleSprintProjectionDegradedCode` en `runtime-projection-types.ts` antes de mergear; NUNCA string libre.
- **SIEMPRE** persistir `metricsJson.deliveryProgressPct: number ∈ [0,100]` en `engagement_progress_snapshots` cuando emerja UI nuevo de registro de progreso.
- **SIEMPRE** revisar la microcopy con `greenhouse-ux-writing` antes de mergear (TASK-265).

**Patrones fuente reusados**: TASK-611 (organization-workspace projection + cache + reactive consumer), TASK-742 (degraded enum cerrado), TASK-265/407/408 (microcopy hygiene), TASK-708 (commercial_cost_attribution_v2 sibling reader pattern).

**Spec canónica**: `docs/tasks/complete/TASK-835-sample-sprints-runtime-projection-hardening.md`.

### Organization Workspace projection invariants (TASK-611)

Toda surface que renderice el detalle de una organización (`/agency/organizations/[id]`, `/finance/clients/[id]`, futuros entrypoints organization-first) **debe** consumir el helper canónico:

```ts
import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'

const projection = await resolveOrganizationWorkspaceProjection({
  subject,           // TenantEntitlementSubject completo (userId + tenantType + roleCodes + ...)
  organizationId,
  entrypointContext  // 'agency' | 'finance' | 'admin' | 'client_portal'
})
```

El helper devuelve un contrato versionado con `visibleFacets`, `visibleTabs`, `defaultFacet`, `allowedActions`, `fieldRedactions`, `degradedMode`, `degradedReason`. Composición determinística per spec V1.1 §4.4 (5 categorías canónicas de relación × 9 facets × 4 entrypoints), cache TTL 30s in-memory.

**Single source of truth runtime**: `src/config/entitlements-catalog.ts` declara las 11 capabilities `organization.<facet>.<action>`. **Reflexión declarativa DB**: `greenhouse_core.capabilities_registry` (TASK-611 Slice 2). Parity test runtime (`src/lib/capabilities-registry/parity.ts` + `parity.live.test.ts`) rompe build si emerge drift TS↔DB.

**5 relaciones canónicas** (resueltas por `relationship-resolver.ts` con un solo CTE PG, cross-tenant isolation enforced en SQL):

- `internal_admin` — efeonce_admin role
- `assigned_member` — `client_team_assignments` matched para esta org via `spaces` bridge
- `client_portal_user` — `client_users.tenant_type='client'` + `client_id` resolves to org via `spaces`
- `unrelated_internal` — internal sin admin ni assignment
- `no_relation` — base case

**Bridge canónico user ↔ organization**: `client_team_assignments.client_id` ⇄ `greenhouse_core.spaces.client_id` ⇄ `spaces.organization_id`. La tabla `clients` NO tiene `organization_id` directo — el puente es `spaces`.

**Reactive cache invalidation**: el consumer `organizationWorkspaceCacheInvalidationProjection` (`src/lib/sync/projections/organization-workspace-cache-invalidation.ts`) responde a 5 events canónicos (`access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `role.assigned`, `role.revoked`, `user.deactivated`) y droppa el cache scoped al subject afectado. Idempotente.

**Reliability signals canónicos** (subsystem `Identity & Access`):

- `identity.workspace_projection.facet_view_drift` (drift, warning si > 0). Detecta drift estructural FACET_TO_VIEW_CODE × VIEW_REGISTRY (rename de viewCode sin update del mapping). Steady=0.
- `identity.workspace_projection.unresolved_relations` (data_quality, error si > 0). Cuenta `client_users` activos con `tenant_type='client'` que no resolverán a ninguna org via spaces. Steady=0.

**⚠️ Reglas duras**:

- **NUNCA** computar visibilidad de facet en cliente. La projection es server-only (`import 'server-only'` en `projection.ts`).
- **NUNCA** mencionar literalmente capabilities `organization.<facet>` ni importar `hasEntitlement`/`can` desde `@/lib/entitlements/runtime` en componentes UI bajo `src/components/`, `src/views/`, `src/app/`. La lint rule `greenhouse/no-inline-facet-visibility-check` (modo `error`) bloquea. Override block exime los archivos canónicos en `src/lib/organization-workspace/`, `src/lib/capabilities-registry/`, `src/lib/entitlements/`.
- **NUNCA** asumir relación subject↔org en código de presentación. Toda decisión pasa por `resolveSubjectOrganizationRelation`.
- **NUNCA** mezclar `entrypointContext` con `scope` de capability. Entrypoint es presentación (default tabs, copy en es-CL); scope es autorización (own/tenant/all).
- **NUNCA** branchear UI por `relationship.kind` inline. La projection ya filtró — el shell solo lee `visibleFacets` / `allowedActions`.
- **NUNCA** materializar la projection en BQ/PG. Es read-light + cacheable. Si en futuro emerge listado >100 orgs con projection per-row, agregar `accessLevel` summary endpoint (no projection completa).
- **NUNCA** llamar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'workspace_projection_*' }, extra })`.
- **NUNCA** persistir un grant fino sin pasar por `capabilities_registry`. Cuando emerja `entitlement_grants` (cleanup ISSUE-068 / TASK-404), agregar FK al registry.
- **NUNCA** crear capability nueva en TS sin migration que la seedee en `capabilities_registry`. La parity test rompe el build.
- **SIEMPRE** marcar `degradedMode=true` con `degradedReason` enumerado (`relationship_lookup_failed | entitlements_lookup_failed | no_facets_authorized`) cuando la projection no puede resolverse — nunca crashear, nunca devolver `visibleFacets: []` silenciosamente.
- **SIEMPRE** invalidar cache vía `clearProjectionCacheForSubject(subjectId)` cuando un grant/revoke se aplica al subject (consumer del outbox event ya maneja esto para los 5 events canónicos).
- **SIEMPRE** que emerja un nuevo entrypoint organization-first, reusar el helper + shell. Cero composición ad-hoc.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (V1.1 con Delta 2026-05-08). Doc funcional: `docs/documentation/identity/sistema-identidad-roles-acceso.md` sección "Facets de Organization Workspace". ISSUE asociado: `docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md`.

### Client Portal BFF / Anti-Corruption Layer invariants (TASK-822, desde 2026-05-12)

`src/lib/client-portal/` es un **Backend-for-Frontend / Anti-Corruption Layer** del route group `client`. NO es un dominio productor. Surfaces curated re-exports de readers que viven (y son owned por) producer domains (`account-360`, `agency`, `ico-engine`, `commercial`, `finance`, `delivery`, `identity`). El módulo es **hoja del DAG** de dominios: producer domains NUNCA importan de él.

**Module classification dual** (mutuamente excluyente, spec §3.1):

- `readers/curated/` — re-export puro de un reader que vive en un producer domain. `ownerDomain` non-null. La firma sigue exacta al upstream; si el upstream cambia, el re-export refleja el cambio automáticamente.
- `readers/native/` — nacido en `client_portal` porque no hay producer domain que lo posea. `ownerDomain: null`. V1.0 ships ZERO native readers; primer candidato emerge con TASK-825 (resolver de `modules`).

**Metadata canónica obligatoria** (`src/lib/client-portal/dto/reader-meta.ts`):

```ts
export interface ClientPortalReaderMeta {
  readonly key: string                                          // matchea el filename
  readonly classification: 'curated' | 'native'
  readonly ownerDomain: ClientPortalReaderOwnerDomain | null   // null SOLO en native
  readonly dataSources: readonly ClientPortalDataSource[]      // non-empty
  readonly clientFacing: boolean
  readonly routeGroup: 'client' | 'agency' | 'admin'
}
```

Cada archivo bajo `readers/{curated,native}/` exporta un `*Meta: ClientPortalReaderMeta`. `assertReaderMeta()` enforce invariantes en runtime (usado en tests anti-regresión).

**Sentry domain canónico** `client_portal` agregado al `CaptureDomain` union de `captureWithDomain` (TASK-822 Slice 2). Reliability rollup completo emerge con TASK-829 (subsystem `Client Portal Health`).

**Domain import direction enforced** (spec §3.2, hoja del DAG):

- Permitido: `src/lib/client-portal/**` → `src/lib/{account-360,agency,ico-engine,commercial,finance,delivery,identity}/**`
- Permitido: `src/{app,views,components}/**` → `src/lib/client-portal/**`
- **Prohibido**: `src/lib/{producer-domain}/**` → `src/lib/client-portal/**`

**Defense in depth** (3 capas):

1. ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` modo `error` (TASK-822 Slice 3). Cubre 4 shapes: static ESM, dynamic `import()`, `require()`, relative `../client-portal/`. Override block en `eslint.config.mjs` exime `src/lib/client-portal/**` + el rule + sus tests fixtures.
2. Grep negativo en code review: `rg "from '@/lib/client-portal" src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/` debe estar vacío.
3. Doctrina canonizada acá (CLAUDE.md) — cuando emerja un patrón análogo (`partner_portal`, `vendor_portal`, `internal_admin_portal`) replicar verbatim.

**⚠️ Reglas duras**:

- **NUNCA** mover físicamente un reader de su producer domain a `src/lib/client-portal/readers/curated/`. La curated layer es un puntero, NO una mudanza. El reader sigue owned por el producer domain.
- **NUNCA** clasificar como `curated` un reader que aplica thin adaptation (e.g. agrega un parámetro `clientPortalContext`). Si adapta, es `native` con `ownerDomain` documentando la fuente original — pero antes de crear native, evaluar si la adaptation pertenece al producer domain (extender API upstream suele ser correcto).
- **NUNCA** importar `@/lib/client-portal/*` desde un producer domain. La rule lo bloquea; si emerge la tentación, el caller está en la capa equivocada (debería estar bajo `src/app/`, `src/views/`, `src/components/`) o el reader que se quiere reusar está en el lugar equivocado (sacarlo del client_portal al producer correspondiente).
- **NUNCA** mezclar dimensiones: `classification` (curated/native) y `ownerDomain` son ortogonales. Curated siempre tiene `ownerDomain` non-null; native siempre tiene `ownerDomain: null`. El runtime invariant en `assertReaderMeta()` rompe el test si emerge drift.
- **NUNCA** crear un reader curated sin `dataSources[]` non-empty. La whitelist `ClientPortalDataSource` enumera los producer surfaces; si emerge una nueva, agregarla al type union + coordinar con TASK-824 para mantener parity con `greenhouse_client_portal.modules.data_sources[]` en DB.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de `src/lib/client-portal/`. Usar `captureWithDomain(err, 'client_portal', { extra })`.
- **NUNCA** crear carpeta `commands/` ni helpers nuevos en `client_portal` sin consumer real demostrado. La regla "Don't add abstractions beyond what the task requires" aplica fuerte acá — placeholder files = drift.
- **NUNCA** desactivar la ESLint rule via `// eslint-disable-next-line`. Si emerge un caso legítimo, agregarlo al override block en `eslint.config.mjs` con comentario justificando.
- **SIEMPRE** que un dominio adicional con shape BFF emerja (partner portal, vendor portal, etc.), replicar el patrón: hoja del DAG + lint rule canónica + classification curated/native + metadata tipada. NO inventar primitiva nueva.

**Spec canónica**: `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.1 §3.1 + §3.2 + §10 patrón aplicable. Module README: `src/lib/client-portal/README.md`. Doctrine source pattern: TASK-611 (organization workspace projection — domain boundary lint rule canonical sibling).

### Organization-by-facets — receta canónica para extender (TASK-613)

Patrón canónico cuando emerja la necesidad de un **facet nuevo** (e.g. `marketing`, `legal`, `compliance`) o un **entrypoint nuevo** que renderee el Organization Workspace shell desde su propia ruta (e.g. `/legal/organizations/[id]`, `/marketing/accounts/[id]`):

#### Para agregar un facet nuevo (5 pasos canónicos)

1. **Catálogo**: extender `OrganizationFacet` enum en `src/lib/organization-workspace/facet-capability-mapping.ts` + agregar `viewCode` underlying en `src/lib/organization-workspace/facet-view-mapping.ts`.
2. **Capabilities**: seedear `organization.<facet>:read` (+ `:read_sensitive` si aplica) en `capabilities_registry` con migration. Documentar matriz `relationship × capability → access` en spec V1.
3. **Facet content** (`src/views/greenhouse/organizations/facets/<Name>Facet.tsx`): self-contained, queries propias, drawers propios. NUNCA renderiza chrome (header, KPIs, tabs) — el shell ya lo hace. Si necesita divergir per-entrypoint, inspeccionar `entrypointContext` adentro del facet (NO crear facets paralelos).
4. **Registry**: agregar entry al `FACET_REGISTRY` en `src/components/greenhouse/organization-workspace/FacetContentRouter.tsx` con `dynamic()` lazy load.
5. **Reliability signal** (recomendado para facets críticos): reader en `src/lib/reliability/queries/<facet>-*.ts` siguiendo el patrón TASK-613 `finance-client-profile-unlinked.ts` (5 tests: ok / warning / SQL anti-regresión / degraded / pluralización).

#### Para agregar un entrypoint nuevo (5 pasos canónicos)

1. **Type union**: extender `EntrypointContext` en `src/lib/organization-workspace/projection-types.ts`.
2. **Rollout flag**: migration que extienda CHECK constraint `home_rollout_flags_key_check` con `organization_workspace_shell_<scope>` + INSERT global `enabled=FALSE` por default. Extender también `WorkspaceShellScope` en `src/lib/workspace-rollout/index.ts` y `HomeRolloutFlagKey` en `src/lib/home/rollout-flags.ts` — drift entre los 3 = falsos positivos en runtime.
3. **Server page** (`src/app/(dashboard)/<scope>/.../[id]/page.tsx`): mirror exacto de `agency/organizations/[id]/page.tsx` o `finance/clients/[id]/page.tsx`:
   - `requireServerSession` (prerender-safe)
   - `isWorkspaceShellEnabledForSubject(subject, '<scope>')` con `try/catch → false` (resilient default a legacy)
   - Resolver canónico del módulo (Postgres-first + fallback) → devuelve `organizationId` o `null`
   - Si flag disabled OR sin organizationId → render legacy view (zero-risk fallback)
   - `resolveOrganizationWorkspaceProjection({ subject, organizationId, entrypointContext: '<scope>' })`
   - Errores en cualquier step → `captureWithDomain(err, '<domain>', ...)` y degradar a legacy.
4. **Client wrapper** (`<ScopeOrganizationWorkspaceClient>`): mirror del Agency/Finance wrapper. Mismos slots: `kpis`, `adminActions`, `drawerSlot`, `children` render-prop. Mismo deep-link `?facet=` con URL sync via `useSearchParams + router.replace`.
5. **Per-entrypoint dispatch** (si aplica): si un facet existente debe cambiar contenido para el nuevo entrypoint, agregar branch dentro del facet inspeccionando `entrypointContext` (patrón canónico `FinanceFacet` desde TASK-613).

#### ⚠️ Reglas duras canónicas (organization-by-facets)

- **NUNCA** crear una vista de detalle organization-centric que NO use el Organization Workspace shell. Toda nueva surface (clientes, prospects, partners, vendors, etc.) pasa por el shell.
- **NUNCA** componer la projection en el cliente. Server-side por construcción — el shell consume la projection prebuilt y la pasa down.
- **NUNCA** branchear `entrypointContext` afuera del facet. Si Finance vs Agency necesitan contenido distinto en la tab Finance, la decisión vive **adentro** del FinanceFacet, no en el page o el router.
- **NUNCA** modificar `OrganizationView` legacy (`src/views/greenhouse/organizations/OrganizationView.tsx`) sin migrar paralelamente al shell. Mantener legacy intacto durante el rollout.
- **NUNCA** seedear capabilities `organization.<facet>:*` sin agregar entry al spec table en `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Apéndice A. La matriz `relationship × capability → access` es contractual.
- **NUNCA** crear una flag `organization_workspace_shell_*` sin extender los 3 lugares (CHECK constraint + `WorkspaceShellScope` + `HomeRolloutFlagKey`). Drift entre los 3 = falsos positivos en runtime.
- **NUNCA** mezclar dimensiones (e.g. "qué facet" + "qué entrypoint") en un solo enum. Son ortogonales: `OrganizationFacet × EntrypointContext`.
- **NUNCA** computar la decisión `legacy fallback vs shell` en runtime sin envolver en `try/catch + captureWithDomain(...)`. Resilient defaults: en duda, legacy.
- **NUNCA** modificar la flag `organization_workspace_shell_*` directamente vía SQL. Toda mutación pasa por el admin endpoint `POST /api/admin/home/rollout-flags` (TASK-780).
- **SIEMPRE** declarar `incidentDomainTag` en el module registry cuando un facet tiene dataset propio que puede generar incidents Sentry.
- **SIEMPRE** que un nuevo facet emerja con dataset que pueda quedar unlinked al canonical 360, agregar reliability signal análogo a `finance.client_profile.unlinked_organizations` (TASK-613).
- **SIEMPRE** seguir el rollout staged: V1 OFF default → V1.1 pilot users → V2 flip global con steady-state ≥30 días → V3 cleanup legacy ≥90 días sin reverts.

#### Patrón canónico per-entrypoint dispatch en facet (TASK-613 reference)

```tsx
// src/views/greenhouse/organizations/facets/FinanceFacet.tsx
const FinanceFacet = ({ organizationId, entrypointContext }: FacetContentProps) => {
  if (entrypointContext === 'finance') {
    return <FinanceClientsContent lookupId={organizationId} />
  }

  return <FinanceFacetAgencyContent organizationId={organizationId} />
}
```

El facet sigue siendo self-contained: queries propias, drawers propios. NO renderiza chrome — el shell ya lo hace. Es el patrón de referencia cuando un facet necesite divergir per-entrypoint sin fragmentar el FACET_REGISTRY.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08 (receta detallada). Tasks de referencia: TASK-611 (foundation), TASK-612 (shell + Agency entrypoint), TASK-613 (Finance entrypoint + dual-dispatch pattern).

### Payroll — Receipt presentation contract (TASK-758, v4 desde 2026-05-04)

Toda surface que renderice recibos individuales de Payroll **debe** consumir el helper canónico `buildReceiptPresentation` desde `src/lib/payroll/receipt-presenter.ts`. Single source of truth para la clasificación de régimen + struct declarativo de presentación + tokens visuales (badges régimen). Cierra el bug raíz `isChile = entry.payRegime === 'chile'` que afectaba a 3 de los 4 regímenes.

**API canónica**:

- `resolveReceiptRegime(entry) → 'chile_dependent' | 'honorarios' | 'international_deel' | 'international_internal'` — detector con cascade `contractTypeSnapshot` → `payrollVia === 'deel'` → `siiRetentionAmount > 0` → `payRegime === 'international'` → default `chile_dependent`.
- `buildReceiptPresentation(entry, breakdown?) → ReceiptPresentation` — struct declarativo con `employeeFields[4]`, `haberesRows`, `attendanceRows`, `deductionSection`, `adjustmentsBanner`, `infoBlock`, `manualOverrideBlock`, `fixedDeductionsSection`, `hero`. Surfaces consumen verbatim — cero lógica de régimen en componentes.
- `groupEntriesByRegime(entries) → Record<Regime, T[]>` — exportado para reuso TASK-782 (PeriodReportDocument + Excel).
- `RECEIPT_REGIME_BADGES` + `RECEIPT_REGIME_DISPLAY_ORDER` — tokens compartidos cross-task (preview MUI, PDF, period report, Excel).

**Comportamiento canónico**:

| Régimen | Bloque deducción | InfoBlock | Hero |
| --- | --- | --- | --- |
| `chile_dependent` | `Descuentos legales` (AFP split + salud obl/vol + cesantía + IUSC + APV + gratificación legal) | — | `Líquido a pagar` |
| `honorarios` | `Retención honorarios` (Tasa SII + Retención) | `Boleta de honorarios Chile · Art. 74 N°2 LIR · Tasa SII <year>` | `Líquido a pagar` |
| `international_deel` | (ninguno) | `Pago administrado por Deel` + `Contrato Deel: <id>` opcional | `Monto bruto registrado` + footnote |
| `international_internal` | (ninguno) | `Régimen internacional` | `Líquido a pagar` |
| **`excluded`** (terminal) | (omitido) | `Excluido de esta nómina — <reason>` (variant `error`) | `Sin pago este período · $0` (degraded) |

**⚠️ Reglas duras**:

- **NUNCA** ramificar render por `entry.payRegime === 'chile'` solo. Toda detección pasa por `resolveReceiptRegime`.
- **NUNCA** `font-family: monospace` en surfaces user-facing del recibo. IDs técnicos (deelContractId): `font-variant-numeric: tabular-nums` + `letter-spacing: 0.02em` sobre Geist Sans.
- **NUNCA** `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canónica V1).
- **NUNCA** `borderRadius` off-scale (3, 5, 7, 12). Usar tokens `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
- **NUNCA** color como única señal de estado. InfoBlock siempre lleva título + body explicativo.
- **NUNCA** lime `#6ec207` para texto sobre blanco (falla 4.5:1). Variante contrast-safe `#2E7D32` cuando emerja necesidad.
- Cualquier nuevo `ContractType` agregado en `src/types/hr-contracts.ts` requiere extender el switch de `buildReceiptPresentation` antes de mergear (compile-time `never`-check defiende esto).
- Cualquier cambio visual del PDF requiere bump `RECEIPT_TEMPLATE_VERSION` en `generate-payroll-pdf.tsx`. Lazy regen automático al próximo acceso.
- Mockup canónico vinculante: `docs/mockups/task-758-receipt-render-4-regimes.html`. Cualquier desviación visual requiere update + re-aprobación del mockup ANTES de mergear.

**Cuándo usar `getEntryAdjustmentBreakdown` + `buildReceiptPresentation`**: siempre que se renderice un recibo individual del colaborador (preview MUI, PDF, futuras superficies). El breakdown es opcional pero canónicamente recomendado para reflejar adjustments (factor reducido, manual override, exclusión).

**Spec**: `src/lib/payroll/receipt-presenter.ts` + `src/lib/payroll/receipt-presenter.test.ts` (46 tests). Doc funcional: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.b.

### Payroll — Period report + Excel disaggregation (TASK-782, desde 2026-05-04)

`PeriodReportDocument` (PDF reporte mensual) y `generate-payroll-excel.ts` (export operador-facing) **deben** consumir `groupEntriesByRegime` exportado por TASK-758. Single source of truth de clasificación de régimen across receipts (recibo individual) y reporte/export operador-facing.

**⚠️ Reglas duras**:

- **NUNCA** sumar `chileTotalDeductions` cross-régimen como subtotal único. El motor asigna `chileTotalDeductions = siiRetentionAmount` para honorarios — sumar todo bajo "Total descuentos Chile" mezcla retención SII con cotizaciones previsionales reales y rompe reconciliación contra Previred + F29.
- **Subtotales mutuamente excluyentes** son obligatorios:
  - `Total descuentos previsionales` (solo `chile_dependent`) → reconcilia con Previred.
  - `Total retención SII honorarios` (solo `honorarios`) → reconcilia con F29 retenciones honorarios.
- **Régimen column con 4 valores** (`CL-DEP`/`HON`/`DEEL`/`INT`) reusando tokens `RECEIPT_REGIME_BADGES` exportados desde `receipt-presenter.ts`. NUNCA `CL`/`INT` solo.
- **Orden canónico** vía `RECEIPT_REGIME_DISPLAY_ORDER`: chile_dependent → honorarios → international_deel → international_internal. Stable, no depende de orden alfabético.
- **Grupos vacíos se omiten completos** (divider + filas + subtotal). Excel: omitir la sheet entera si ambas secciones internas están vacías.
- **Celdas N/A llenan con `—`** (clase `dim` text-faint), NUNCA `$0`. Distinción semántica: `$0` = aplica pero monto cero; `—` = no aplica al régimen.
- **Estado `excluded`** (entries con `grossTotal === 0 && netTotal === 0`) se renderiza visible en el PDF con chip `(excluido)` inline + Base/OTD/RpA dim `—`. No se omite.
- Cualquier nueva surface operador-facing que muestre agregaciones mensuales por régimen DEBE consumir `groupEntriesByRegime` + tokens canónicos en lugar de duplicar el filter.

**Layout canónico**:

- PDF: 10 columnas `Nombre / Régimen / Mon. / Base / OTD / RpA / Bruto / Desc. previs. / Retención SII / Neto`. Summary strip ampliado a 8 KPIs con counters per-régimen. Meta row `UF / Aprobado / Tabla tributaria`.
- Excel: sheets canónicas `Resumen` (subtotales separados) + `Chile` (2 secciones internas) + `Internacional` (2 secciones internas) + `Detalle` (audit raw, preservado) + `Asistencia & Bonos` (preservado).

**Spec canónica**: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.c. Mockup vinculante: `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html`. Tests: `src/lib/payroll/generate-payroll-pdf.test.ts` + `generate-payroll-excel.test.ts` (12 tests anti-regression).

### Legal Signatures Platform invariants (TASK-863 V1.4, desde 2026-05-11)

Toda surface que renderice un documento legal firmado por el **representante legal del empleador** (finiquitos hoy; contratos, addenda, cartas formales mañana) **debe** consumir el helper canónico `@/lib/legal-signatures` para resolver la firma digitalizada. NUNCA reimplementar el resolver inline en otro flow.

**Convención de filename**: `src/assets/signatures/{taxId_normalizado}.png`. `taxId_normalizado` = `taxId` con puntos + espacios removidos (guion preservado). Efeonce SpA RUT 77.357.182-1 → `77357182-1.png`.

**API canónica** (`src/lib/legal-signatures/index.ts`):

```typescript
import {
  buildSignatureFilenameForTaxId,
  resolveLegalRepresentativeSignaturePath,
  getLegalRepresentativeSignatureAbsolutePath,
  LEGAL_SIGNATURE_BASE_DIR
} from '@/lib/legal-signatures'
```

**Path-safe protection** (4 checks defensivos):

1. Empty/null → `null` (graceful fallback)
2. `..` (path traversal) → `null`
3. Path absoluto (`/`) → `null`
4. Extensión NO en `{png, jpg, jpeg}` → `null`
5. `existsSync` falla → `null`

Si cualquier check falla, el consumer renderea la **línea de firma vacía** para firma manual presencial.

**⚠️ Reglas duras**:

- **NUNCA** reimplementar el resolver inline. Consumir `@/lib/legal-signatures`.
- **NUNCA** componer paths absolutos hardcoded. Siempre via `buildSignatureFilenameForTaxId(taxId)` + `resolveLegalRepresentativeSignaturePath`.
- **NUNCA** confiar en path strings provenientes de usuario sin pasarlos por el resolver.
- **NUNCA** usar este helper para firmas de personas naturales (trabajadores). Las firmas de trabajadores son SIEMPRE físicas presenciales (art. 177 CT).
- **SIEMPRE** dejar graceful fallback en el render si el path resuelve a `null`.
- **SIEMPRE** preservar PNG transparente con aspect ratio ~2.2-2.4:1 (recomendado 1718×734).

**Forward-compat V2**: migrar storage a asset privado canónico (`greenhouse_core.assets` con `retention_class='legal_signature'` + FK desde `organizations.legal_representative_signature_asset_id`). Misma signature pública del helper → backwards-compatible.

**Spec canónica**: `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md`. Tests: `src/lib/legal-signatures/index.test.ts` (11 tests anti-regresión).

### Finiquito V1.5 — Cláusulas legales state-conditional + auto-regeneración PDF (TASK-863, desde 2026-05-11)

Comprehensive audit enterprise por skills `greenhouse-payroll-auditor` + UX writing es-CL formal-legal + `modern-ui` cerró 5 bloqueantes legales/UI del PDF de finiquito de renuncia voluntaria post primer caso real (Valentina Hoyos):

**B-1 Cláusula PRIMERO separa hitos legales distintos** — `FiniquitoClauseParams` expone `resignationNoticeSignedAt` (firma trabajador, obligatorio) + `resignationNoticeRatifiedAt` (ratificación notarial art. 177 CT, null hasta ratificación). Copy state-conditional pre/post ratificación. Antes mezclarlas era vicio defendible en demanda chilena.

**B-2 Cláusula SEGUNDO verbo performativo state-conditional** — `FiniquitoClauseSegundoParams` expone `isRatified: boolean`. Pre-ratificación → "declara que recibirá, al momento de la ratificación..." (futuro). Post-ratificación → "declara haber recibido en este acto..." (perfecto consumado). Antes "declara recibir en este acto" sobre doc no ratificado era vicio de consentimiento.

**B-3 Cláusula CUARTO cita artículo operativo Ley 14.908** — Texto canónico: "artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021". Antes citaba solo la modificatoria sin operativo → jurídicamente débil.

**B-4 Simetría visual 3 columnas firma** — `signatureColumn` con `paddingTop: 36` reserva espacio simétrico arriba de la línea en las 3 columnas (empleador + trabajador + ministro de fe). `signatureImageEmployer` absoluta en `top: 0`. Las 3 líneas caen al mismo Y absoluto → balance enterprise.

**B-5 Title legal DOMINA visualmente vs KPI monto** — Title 20pt Poppins Bold + KPI 14pt Poppins SemiBold (ratio 1.43x). Antes 18pt vs 16pt era marketing pattern, no legal pattern. Notarios/abogados leen primero el ACTO, después el monto.

**Auto-regeneración canónica del PDF al transicionar** (TASK-863 V1.1): el helper privado `regenerateDocumentPdfForStatus` reemplaza `pdf_asset_id` del MISMO documento cuando transita a `issued` o `signed_or_ratified` (sin bump versión, sin reissue). Wire en `issueFinalSettlementDocumentForCase` + `markFinalSettlementDocumentSignedOrRatifiedForCase`. Idempotente: si falla render, transition ya commiteo y operador puede usar reissue.

**Matriz canónica de watermark per `documentStatus`**:

| documentStatus | Watermark |
|---|---|
| rendered / in_review / approved | "PROYECTO" warning |
| **issued / signed_or_ratified** | **CLEAN** |
| blocked | "BLOQUEADO" error |
| rejected | "RECHAZADO" error |
| voided | "ANULADO" error |
| superseded | "REEMPLAZADO" neutral |

`renderFinalSettlementDocumentPdf(snapshot, options?: { documentStatus?: string | null })` acepta documentStatus explícito. Backward-compat: callsites sin documentStatus caen al patrón inferido por `ratification + readiness`.

**⚠️ Reglas duras**:

- **NUNCA** mezclar fecha de firma del trabajador con fecha de ratificación notarial en la cláusula PRIMERO. Son 2 hitos legales distintos.
- **NUNCA** renderizar el verbo "declara recibir en este acto" cuando `documentStatus != 'signed_or_ratified'`. Usa `isRatified` para state-condicional.
- **NUNCA** citar Ley 21.389 sin el artículo operativo Ley 14.908. Citar solo la modificatoria es jurídicamente débil.
- **NUNCA** renderear la firma del empleador rompiendo simetría con las otras 2 columnas (trabajador + ministro). `paddingTop: 36` en `signatureColumn` reserva espacio simétrico.
- **NUNCA** componer KPI monto con peso visual superior al title del acto jurídico. El acto legal domina.
- **NUNCA** dejar el `pdf_asset_id` apuntando a un asset con watermark cuando `documentStatus IN ('issued', 'signed_or_ratified')`. El auto-regen lo refresca; si falla, reissue recovery.

**Spec canónica**: `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Delta 2026-05-11 V1.1 + V1.4 + V1.5). Doc funcional + manual de uso: `docs/documentation/hr/finiquitos.md` + `docs/manual-de-uso/hr/finiquitos.md` (v1.3).

### Person Legal Profile invariants (TASK-784, desde 2026-05-05)

Toda surface que muestre o consuma identidad legal de una persona natural (RUT, documento de identidad, direccion legal/residencia) **debe** pasar por el modulo canonico `src/lib/person-legal-profile/`. Reemplaza el patron legacy donde `final_settlement_documents` hardcodea `taxId: null` y BigQuery `member_profiles.identity_document_*` era la unica fuente.

**Frontera canonica**:

- `organizations.tax_id` → identidad tributaria de organizaciones / personas juridicas / clientes / proveedores empresa / facturacion. NO se reemplaza por TASK-784.
- `greenhouse_core.person_identity_documents` → identidad legal de personas naturales. Anclado a `identity_profiles.profile_id`. Soporta CL_RUT + 23 tipos internacionales extensible.
- `greenhouse_core.person_addresses` → direcciones legal/residencia/correspondencia/emergencia.

**Read API canonico**:

- Default reader: `listIdentityDocumentsForProfileMasked(profileId)` / `listAddressesForProfileMasked(profileId)` → masked, NUNCA expone `value_full` ni `presentation_text`.
- Snapshot autorizado para document generators: `readFinalSettlementSnapshot(profileId)` / `readPersonLegalSnapshot({useCase})` → server-only, escribe audit `export_snapshot`, devuelve `valueFull` solo cuando `verification_status='verified'`.
- Reveal con capability + reason + audit: `revealPersonIdentityDocument({reason >= 5, ...})`. Caller DEBE haber validado `person.legal_profile.reveal_sensitive` ANTES; el helper escribe audit + outbox y devuelve `valueFull`.
- Readiness gates: `assessPersonLegalReadiness({profileId, useCase})` → `{ready, blockers[], warnings[]}` para 5 casos: `payroll_chile_dependent`, `final_settlement_chile`, `honorarios_closure`, `document_render_payroll_receipt`, `document_render_onboarding_contract`.

**Encryption strategy** (TASK-697 pattern, NO KMS envelope V1):

- Plaintext at rest en `value_full` con grants estrictos `greenhouse_runtime` (sin DELETE).
- `value_hash` = SHA-256(pepper || normalized) via secret `greenhouse-pii-normalization-pepper` (GCP Secret Manager). Sin pepper, hash de RUT 8-9 digitos es trivialmente reversible.
- `display_mask` precomputado al INSERT/UPDATE (`xx.xxx.NNN-K` para CL_RUT, last-4 generic).
- Sanitizers extendidos en `src/lib/observability/redact.ts` para `[redacted:rut]` + `[redacted:long-id]`.
- AI sanitizer (`sanitizePiiText`) ya cubre CL_RUT.
- Cloud SQL ya cifra at-rest a nivel disco. KMS envelope queda como follow-up si compliance Ley 21.719 lo escala.

**Capabilities granulares (6, least privilege)**:

| Capability | Module | Action | Scope | Allowed source |
|---|---|---|---|---|
| `person.legal_profile.read_masked` | people | read | own/tenant | route_group=my (own) o route_group=hr / EFEONCE_ADMIN (tenant) |
| `person.legal_profile.self_update` | my_workspace | create/update | own | route_group=my |
| `person.legal_profile.hr_update` | hr | create/update | tenant | route_group=hr / EFEONCE_ADMIN |
| `person.legal_profile.verify` | hr | approve | tenant | route_group=hr / EFEONCE_ADMIN |
| `person.legal_profile.reveal_sensitive` | hr | read | tenant | EFEONCE_ADMIN / FINANCE_ADMIN solo |
| `person.legal_profile.export_snapshot` | hr | export | tenant | route_group=hr (server-only para document generators) |

**Outbox events versionados v1 (12 nuevos)**:

- `person.identity_document.{declared, updated, verified, rejected, archived, revealed_sensitive}`
- `person.address.{declared, updated, verified, rejected, archived, revealed_sensitive}`

**Reliability signals (4) bajo modulo `identity`**:

- `identity.legal_profile.pending_review_overdue` — drift, warning si > 0
- `identity.legal_profile.payroll_chile_blocking_finiquito` — data_quality, error si > 0
- `identity.legal_profile.reveal_anomaly_rate` — drift, warning/error segun threshold (3 reveals/24h por actor)
- `identity.legal_profile.evidence_orphan` — data_quality, error si > 0

**⚠️ Reglas duras**:

- **NUNCA** leer `value_full` directo en consumers. Use readers canonicos (`*Masked`, `readPersonLegalSnapshot`, `revealPersonIdentityDocument`).
- **NUNCA** loggear `value_full` / `value_normalized` / `street_line_1` / `presentation_text` en errors / Sentry / outbox payloads / AI context. Los `diff_json` describen QUE campos cambiaron, no su valor pleno.
- **NUNCA** llamar `revealPersonIdentityDocument` ni `revealPersonAddress` sin validar capability + reason >= 5 chars en el route handler. El helper enforce internamente, pero defense in depth.
- **NUNCA** persistir `value_full` sin pasar por `normalizeDocument` + `computeValueHash` + `formatDisplayMask`. Los 3 helpers garantizan idempotencia + dedup + masking precomputado.
- **NUNCA** confiar automaticamente datos backfilled (`source='legacy_bigquery_member_profile'`). Quedan en `verification_status='pending_review'` y NO se cuentan como verified hasta que HR los apruebe via `verifyIdentityDocument`.
- **NUNCA** cambiar `organizations.tax_id` para guardar RUT personal. La columna es identidad tributaria de organizaciones / facturacion. Si emerge una persona natural facturable como organizacion, modelar como organizacion separada con `organization_type='natural_person'`.
- **NUNCA** branchear UI por pais hardcodeado. Use copy pais-aware: "RUT" cuando `documentType='CL_RUT'`, "Documento de identidad" como fallback.
- **NUNCA** exponer error.message raw en HTTP responses. Use `redactErrorForResponse(error)` + `captureWithDomain(error, 'identity', { extra })` desde `src/lib/observability/{redact,capture}.ts`.

**Spec canonica**: `docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md`. Migracion: `migrations/20260505015628132_task-784-person-identity-documents-and-addresses.sql`. Pattern fuente: TASK-697 (`src/lib/finance/beneficiary-payment-profiles/reveal-sensitive.ts`).

### Workforce role title source-of-truth + Entra drift governance (TASK-785, desde 2026-05-05)

`members.role_title` es la **fuente de verdad laboral** del cargo en Greenhouse (contrato, finiquito, payroll, KPIs comerciales). `identity_profiles.job_title` es enriquecimiento operativo (Entra/Graph/SCIM) que sirve como dato bruto pero NUNCA sobreescribe el cargo formal HR.

**Invariantes duras**:

- **NUNCA** modificar `members.role_title` directamente vía SQL o helpers ad-hoc en consumers. Toda mutación pasa por `updateMemberRoleTitle()` (`src/lib/workforce/role-title/store.ts`) — atomic tx con audit + outbox event + resolución de drift pendiente.
- **NUNCA** dejar que el sync Entra sobrescriba `role_title` cuando `role_title_source='hr_manual' AND last_human_update_at IS NOT NULL`. El helper canónico `applyEntraRoleTitle()` (`sync-from-entra.ts`) enforce esta regla y registra drift_proposal cuando los valores divergen.
- **NUNCA** computar fallback de cargo per-context inline en consumers (e.g. `members.role_title || identity_profiles.job_title`). Usar el resolver canónico `resolveRoleTitle({ memberId, context })` con uno de los 6 contextos: `internal_profile`, `client_assignment`, `payroll_document`, `commercial_cost`, `staffing`, `identity_admin`.
- **NUNCA** modificar `member_role_title_audit_log` (append-only enforced por triggers PG `prevent_update_on_audit_log` y `prevent_delete_on_audit_log`). Para correcciones, insertar nueva fila con `action='reverted'`.
- **NUNCA** transicionar drift proposals fuera del state machine `pending → approved | rejected | dismissed`. Toda resolución pasa por `resolveRoleTitleDriftProposal()` (`drift-store.ts`) — atomic tx con audit + outbox event.
- **NUNCA** escribir capability checks de role-title manualmente. Usar `can(tenant, 'workforce.role_title.update', 'update', 'tenant')` o `can(tenant, 'workforce.role_title.review_drift', 'read|approve', 'tenant')`.

**Helpers canónicos** (`src/lib/workforce/role-title/`):

- `updateMemberRoleTitle({ memberId, newRoleTitle, reason, actorUserId, ... })` — single source of truth para HR mutation. Reason >=10 chars obligatorio, audit log + resolución de drift pendiente como rejected en misma tx.
- `applyEntraRoleTitle({ memberId, entraJobTitle, ... })` — sync path Entra→members. Skipea overwrite cuando hay HR override; registra drift proposal cuando diverge. Returns `{ applied, skipped, driftProposed }` non-blocking.
- `resolveRoleTitle({ memberId, context, assignmentId? })` — resolver canónico per-contexto. Devuelve `{ value, source, sourceLabel, hasDriftWithEntra, assignmentOverride? }`.
- `resolveRoleTitleDriftProposal({ proposalId, decision, resolutionNote, actorUserId, ... })` — HR review queue resolver. Decision `accept_entra` aplica valor Entra al member (source='entra', clear last_human_update_at). `keep_hr` mantiene HR override sin cambio. `dismissed` cierra sin cambio.
- `getRoleTitleGovernanceForMember(memberId)` — reader para UI HR. Single query: cargo actual + source + Entra job_title + drift status + pending proposal.

**API canónica**:

- `PATCH /api/admin/team/members/[memberId]/role-title` (capability `workforce.role_title.update:update`, FINANCE_ADMIN/HR/EFEONCE_ADMIN).
- `GET /api/hr/workforce/role-title-drift` (capability `workforce.role_title.review_drift:read`).
- `POST /api/hr/workforce/role-title-drift/[proposalId]/resolve` (capability `workforce.role_title.review_drift:approve`).
- `GET /api/hr/workforce/members/[memberId]/role-title` (capability `workforce.role_title.update | review_drift`).

**Outbox events**: `member.role_title.changed`, `member.role_title.drift_proposed`, `member.role_title.drift_resolved`.

**Reliability signals** (subsystem `Identity & Access`):

- `workforce.role_title.drift_with_entra` (drift, warning) — informativo: miembros con HR != Entra. Steady state variable.
- `workforce.role_title.unresolved_drift_overdue` (drift, error) — drift proposals pendientes >30 días. Steady state = 0.

**Spec canonica**: `docs/tasks/in-progress/TASK-785-workforce-role-title-source-of-truth-governance.md`. Migración: `migrations/20260505123242929_task-785-role-title-governance.sql`. Pattern fuente: `reporting_hierarchy_drift_proposals` (TASK-731).

### SCIM Internal Collaborator Provisioning invariants (TASK-872, desde 2026-05-13)

SCIM POST `/api/scim/v2/Users` con `tenant_type='efeonce_internal'` Y eligibility verdict `eligible=true` invoca primitive atomic `provisionInternalCollaboratorFromScim` que materializa `client_user + identity_profile + identity_profile_source_links × 2 + member + person_membership` + role assignment + 3 outbox events en una sola tx PG.

**Helpers canónicos**:

- `evaluateInternalCollaboratorEligibility(input)` en `src/lib/scim/eligibility.ts` — función pura 4-layer policy (L1 hard reject `#EXT#`/domain, L2 funcional regex, L3 name shape, L4 admin allowlist/blocklist override). Discriminated union return `EligibilityVerdict`.
- `provisionInternalCollaboratorFromScim(input)` en `src/lib/scim/provisioning-internal-collaborator.ts` — primitive atomic. Idempotency gate first-step + cascade D-2 (4 niveles: profile_id → azure_oid → email legacy → INSERT new) + drift detection 3 kinds + outbox consolidado `scim.internal_collaborator.provisioned v1`.
- `createScimEligibilityOverride / supersedeScimEligibilityOverride / listActiveOverridesForTenantMapping` en `src/lib/scim/eligibility-overrides-store.ts` — CRUD canónica con audit append-only via PG trigger.

**Feature flags (default false en producción — zero behavioral change post-merge)**:

| Flag | Default | Efecto cuando true |
| --- | --- | --- |
| `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` | `false` | SCIM CREATE internal eligible invoca primitive; ineligibles van a legacy `createUser` |
| `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` | `false` | Payroll reader `pgGetApplicableCompensationVersionsForPeriod` filtra `m.workforce_intake_status = 'completed'` |
| `SCIM_ELIGIBILITY_FUNCTIONAL_PATTERNS_ENABLED` | `false` (V1.0) | Reservado V1.1 — control de L2 regex |

**6 reliability signals canónicos (subsystem Identity & Access)**:

- `identity.scim.users_without_identity_profile` (data_quality, error >0, steady=0)
- `identity.scim.users_without_member` (drift, error >0, steady=0 post-backfill)
- `identity.scim.ineligible_accounts_in_scope` (drift, warning 1-5 / error >5, steady<5)
- `identity.scim.member_identity_drift` (data_quality, error >0, steady=0)
- `workforce.scim_members_pending_profile_completion` (drift, warning >7d / error >30d, steady=0)
- `identity.scim.allowlist_blocklist_conflict` (data_quality, error >0, steady=0)

**⚠️ Reglas duras**:

- **NUNCA** ejecutar los 6 writes del primitive fuera de `withTransaction`. Si se necesita refactor de un helper downstream, agregar `client?: PoolClient` opcional (dual-mode pattern TASK-765/TASK-872). Helpers refactored: `syncOperatingEntityMembershipForMember`, `createMembership`, `deactivateMembership`.
- **NUNCA** decidir merge automático en drift D-2. Throw `MemberIdentityDriftError` con `kind` discriminator (`profile_oid_mismatch | oid_profile_mismatch | email_profile_mismatch`) + signal alerta + humano resuelve via runbook escenario 3.
- **NUNCA** poblar `members` SCIM-provisioned sin `workforce_intake_status='pending_intake'` + `azure_oid` poblado. Backfill bypasa con default `'completed'` SOLO para legacy members existentes pre-TASK-872.
- **NUNCA** incluir members con `workforce_intake_status != 'completed'` en una corrida payroll cuando `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true`. Gate canonical en `pgGetApplicableCompensationVersionsForPeriod` (postgres-store.ts) — único punto de verdad.
- **NUNCA** insertar `scim_sync_log` dentro del primitive. Logging vive en endpoint handler (post-call). Permite logging de fallos cuando primitive throws.
- **NUNCA** emitir outbox event fuera de la tx del primitive. `publishOutboxEvent(event, client?)` acepta client opcional desde TASK-771 — pass through dentro del withTransaction.
- **NUNCA** DELETE physical sobre `scim_eligibility_overrides`. Solo supersede via `effective_to` + audit row append-only en `scim_eligibility_override_changes` (trigger PG enforce).
- **NUNCA** invocar `Sentry.captureException` directo en code path SCIM. Usar `captureWithDomain(err, 'identity', { tags: { source: 'scim_provisioning', stage: '...' } })`.
- **NUNCA** flippear `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en producción sin: (1) verify 7 legacy members all `'completed'`; (2) HR signoff workflow complete_intake; (3) smoke staging con member pending_intake synthetic + corrida payroll mock excluye correctamente.
- **NUNCA** marcar Felipe Zurita / Maria Camila Hoyos backfill como complete sin: (1) flag SCIM enabled staging + smoke `provisionOnDemand` test user verde; (2) comunicación humana a Felipe/Maria sobre badge "Ficha pendiente"; (3) operador humano ejecuta apply con allowlist explícita; (4) signals post-apply en steady state esperado.
- **SIEMPRE** que primitive devuelva `idempotent: true`, NO emitir outbox events (re-emit duplicates downstream).
- **SIEMPRE** que un consumer nuevo emerja que enumere members para payroll/capacity/compensation/assignments, agregar el mismo gate `workforce_intake_status = 'completed'` detrás del flag canónico (defense in depth).
- **SIEMPRE** que cascade outcome sea `reactivated_via_oid_reuse`, signal `identity.scim.member_reactivated_via_oid_reuse` (info-only V1.0) alerta a operador para audit del caso raro.

**Outbox event consolidado canonical `scim.internal_collaborator.provisioned v1`** (aggregateType='client_user'): payload incluye `userId, scimId, identityProfileId, memberId, azureOid, microsoftTenantId, primaryEmail, displayName, roleCode, workforceIntakeStatus, eligibilityVerdict, cascadeOutcome, operatingEntityMembershipAction, provisionedAt`. Single source of truth audit forensic para "qué pasó cuando entró este colaborador".

**Capabilities granulares canónicas (4 nuevas)**:

- `scim.eligibility_override.create` (organization, create, tenant) — EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->
- `scim.eligibility_override.delete` (organization, delete, tenant) — EFEONCE_ADMIN only
- `scim.backfill.execute` (organization, execute, all) — EFEONCE_ADMIN only
- `workforce.member.complete_intake` (workforce, update, tenant) — FINANCE_ADMIN + EFEONCE_ADMIN

**Spec canónica**: `docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md`. Runbook: `docs/operations/runbooks/scim-internal-collaborator-recovery.md`. Migrations: `migrations/20260513234436189_task-872-scim-eligibility-overrides.sql` + `migrations/20260514000116899_task-872-members-workforce-intake-status.sql` + `migrations/20260514000207733_task-872-capabilities-registry-seed.sql`.

### Capability runtime grant invariant (TASK-873, desde 2026-05-14)

Cuando una task seed-ea una capability nueva en `greenhouse_core.capabilities_registry` (DB) Y en `src/config/entitlements-catalog.ts` (TS), **debe también granteear esa capability a algún subject en `src/lib/entitlements/runtime.ts`** en el mismo PR. Sin el grant en runtime, el endpoint protegido por `can(subject, '<capability>', ...)` retorna 403 incluso para EFEONCE_ADMIN — la capability existe en el registry pero ningún subject la posee.

**Bug class canonizada live 2026-05-14**: TASK-872 Slice 1.5 seedeó `workforce.member.complete_intake` en TS catalog + DB capabilities_registry pero olvidó el grant en runtime.ts. El endpoint `POST /api/admin/workforce/members/[memberId]/complete-intake` quedó shipped pero inaccesible para cualquier rol durante todo el periodo desde TASK-872 SHIPPED (2026-05-13) hasta TASK-873 Slice 1 fix (2026-05-14, commit `00730a82`).

**⚠️ Reglas duras**:

- **NUNCA** agregar entry al `ENTITLEMENT_CAPABILITY_CATALOG` en `src/config/entitlements-catalog.ts` que se chequee vía `can()` sin agregar grant correspondiente en `src/lib/entitlements/runtime.ts` en el mismo PR. **Enforcement mecánico desde TASK-935**: el guard `src/lib/entitlements/capability-grant-coverage.test.ts` (puro, no-DB, corre en CI) parsea todos los `can()` usages en `src/app`+`src/lib` y asserta que toda capability del catalog chequeada vía `can()` está granteada a ≥1 rol. Si agregás un `can()` sobre una capability sin grant, este test rompe el build. (La parity test live `parity.live.test.ts` es complementaria: valida TS↔DB shape/module parity, NO grant coverage.)
- **NUNCA** agregar grant en runtime.ts sin un comentario `// TASK-XXX — <descripción del fix>` que documente la decisión + el set canónico de roles. El comentario es lo que permite al próximo agente entender el alcance del gate.
- **NUNCA** asumir que "la capability ya está en DB" significa "los usuarios tienen acceso". DB registry es **gobernanza** (qué capabilities existen + auditoría); runtime.ts es **policy** (qué subjects las tienen). Son ortogonales.
- **NUNCA** branchear `roleCodes.includes(...)` inline en route handlers o views. Toda autorización pasa por `can(subject, capability, action, scope)`. Los grants en runtime son la única fuente.
- **SIEMPRE** que un endpoint nuevo proteja recursos sensibles vía `can(...)`, smoke-test localmente con un usuario real del role objetivo (e.g. agent auth + Playwright + un member con el rol intended) ANTES de mergear. Sin smoke, el bug class del 2026-05-13→05-14 se repite.
- **SIEMPRE** que emerja una task que cubra Slice "Capabilities Registry Seed" (canonical pattern TASK-839/840/848/849/850/872), el slice **debe** incluir tanto la migration DB como el grant runtime.ts. NO scope-creep al slice anterior ni posterior; mismo commit.

**Defense in depth**: cuando una capability es operacionalmente crítica (e.g. transición state machine, mutación HR/Finance, reveal sensitive), agregar smoke test E2E en `tests/e2e/smoke/` que verifique el flow con un usuario del rol esperado. Sin smoke, el endpoint queda en "shipped pero inaccesible" hasta que un usuario real lo reporta.

**Spec canónica**: `docs/tasks/complete/TASK-873-workforce-intake-ui.md` (Slice 1 fix). Pattern fuente: `src/lib/entitlements/runtime.ts` líneas con grant `workforce.member.complete_intake` (matriz `hr ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN`).

**TASK-935 (2026-05-25) — reconciliación sistémica + guard mecánico**: el bug class TASK-873 había recurrido 13 veces (capabilities can()-checked en endpoints `/api/admin/*` sin runtime grant → 403 para todos). Causa raíz: specs documentaron roles intended (`DEVOPS_OPERATOR`, `commercial_admin`, `operations`) que **nunca existieron como `ROLE_CODES`**, así que el grant nunca se escribió. TASK-935 agregó los 13 grants (colapsando a `EFEONCE_ADMIN` + `FINANCE_ADMIN`, el set real que pasa `requireAdminTenantContext`) + el guard `capability-grant-coverage.test.ts` que **previene la recurrencia mecánicamente**. **NUNCA** documentar un rol intended en una spec/capability sin verificar que existe en `src/config/role-codes.ts`; si no existe, el grant colapsa al rol real más cercano (típicamente `EFEONCE_ADMIN`). Spec: `docs/tasks/complete/TASK-935-capability-governance-reconciliation.md`.

**Reflejo canonical antes de citar cualquier rol** (TASK-947 follow-up 2026-05-29): cuando un agente o spec mencione un rol, DEBE verificarlo primero contra el snapshot canonical de abajo (single source of truth: `src/config/role-codes.ts`, `ROLE_CODES` const). El guard `capability-grant-coverage.test.ts` atrapa el bug en CI cuando hay capability sin grant, pero el daño documental (specs/CLAUDE.md/AGENTS.md confusos) NO lo atrapa el guard. Esta regla cubre el lado documental.

#### ROLE_CODES vigentes (snapshot 2026-05-29, V1.0 canonical)

**13 roles reales** — son los ÚNICOS valores legítimos para `roleCodes`/`primaryRoleCode` en `TenantContext` / `TenantEntitlementSubject`. Cualquier mención fuera de esta tabla es bug documental. Fuente: `src/config/role-codes.ts:5-19` + `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` §"Role codes internos actuales" + `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`.

**Internos Efeonce (10)**:

| `role_code` | Nombre visible | Para qué sirve | Route groups típicos |
|---|---|---|---|
| `efeonce_admin` | Superadministrador | Control total de Greenhouse (usuarios, roles, settings, vistas). Override global. Pasa `requireAdminTenantContext`. Es el colapso canonical de roles fantasma (DEVOPS_OPERATOR, commercial_admin). | `internal`, `admin` + acceso transversal |
| `finance_admin` | Administrador de Finanzas | Configuración + operaciones financieras sensibles. Pasa `requireFinanceTenantContext`. Co-grant canonical para observabilidad financiera. | `internal`, `finance` |
| `finance_analyst` | Analista de Finanzas | Operación financiera del día a día (read-write acotado, no settings sensibles). | `internal`, `finance` |
| `hr_payroll` | Nómina | Gestión de payroll, compensaciones y períodos. | `internal`, `hr` |
| `hr_manager` | Gestión HR | Gestión HR de personas, estructura y approvals de dominio. **NO confundir con `HR_ADMIN` (fantasma).** | `internal`, `hr` |
| `efeonce_operations` | Operaciones | Visibilidad operativa cross-space y cross-tenant. **NO confundir con `operations` (fantasma — no es rol, es término genérico).** | `internal` |
| `efeonce_account` | Líder de Cuenta | Responsabilidad comercial y salud de cuentas. | `internal` |
| `people_viewer` | Lectura de Personas | Lectura de People, capacidad, assignments y memberships. | `internal`, `people` |
| `ai_tooling_admin` | Administrador de Herramientas AI | Gobierno de catálogo, licencias y wallets AI. | `internal`, `ai_tooling` |
| `collaborator` | Colaborador | Experiencia personal del miembro en Greenhouse (Mi Ficha, Mi Nómina). Lo tiene todo colaborador interno además de su rol funcional. | `my` |

**Externos cliente (3)**:

| `role_code` | Nombre visible | Para qué sirve | Route groups |
|---|---|---|---|
| `client_executive` | Cliente Ejecutivo | CMO/VP-level. Dashboard ejecutivo, KPIs alto nivel, overview de equipo. | `client` |
| `client_manager` | Cliente Manager | Marketing manager. Contexto operativo profundo, drilldowns de proyecto, detalle de sprint. | `client` |
| `client_specialist` | Cliente Specialist | Coordinador externo. Restringido a proyectos o campañas específicas via scope filters. | `client` |

**Helpers TS canonical para citar roles** (no escribir strings literales):

```ts
import { ROLE_CODES, type RoleCode, isRoleCode, isSuperadmin } from '@/config/role-codes'

// CORRECTO
hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)
addEntitlement(entries, { source: 'role', ... }) // donde tenant.roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

// PROHIBIDO
subject.roleCodes.includes('devops_operator') // fantasma — no existe
subject.roleCodes.includes('hr_admin') // fantasma — el real es hr_manager
subject.roleCodes.includes('commercial_admin') // fantasma — colapsa a efeonce_admin
```

**Mapping route_groups (NO son roles, no confundir)**: `internal`, `admin`, `client`, `finance`, `hr`, `people`, `my`, `ai_tooling`. Son derivados del rol según `src/lib/tenant/access.ts`. Un rol puede pertenecer a múltiples route_groups.

#### Bug class — roles fantasma que han contaminado specs

Estos NO existen en `ROLE_CODES` pero se siguen citando incorrectamente. Cuando emerjan en draft de task / spec / análisis, colapsar inmediatamente al rol real más cercano:

| Rol fantasma | Origen del bug | Colapso canonical |
|---|---|---|
| `DEVOPS_OPERATOR` / `devops_operator` | TASK-848/849/850/854/872/908 specs (release/SCIM/delivery). | `EFEONCE_ADMIN` solo (release ops + SCIM admin), opcional `+ FINANCE_ADMIN` para observabilidad. |
| `HR_ADMIN` / `hr_admin` | TASK-908 spec (ICO status transitions). | `HR_MANAGER`. |
| `commercial_admin` / `COMMERCIAL_ADMIN` | Drafts comerciales pre-TASK-935. | `EFEONCE_ADMIN`. |
| `operations` (como rol) | Confusión con route_group `internal` / con `efeonce_operations`. | `EFEONCE_OPERATIONS` si el intent es el rol; `internal` como route_group si el intent era acceso broad. |

**Protocolo obligatorio cuando un agente vaya a citar un rol** (nuevo draft, capability matrix, grant analysis, doc nueva, edit a CLAUDE.md/AGENTS.md):

1. Leer `src/config/role-codes.ts` (`ROLE_CODES` const) — los 13 valores arriba.
2. Listar los roles que el draft/análisis menciona.
3. Flag cualquier rol que no esté en la tabla.
4. Proponer colapso canonical (típicamente `EFEONCE_ADMIN` para admin/release, `+ FINANCE_ADMIN` para finance observability, `HR_MANAGER` para HR governance).
5. Documentar el colapso con marcador inline si la spec original tiene valor histórico (patrón: `<!-- spec original menciona X — colapsado a Y por TASK-935 -->`).

### SQL Signal Reader Schema Validation Gate (TASK-893 hotfix #3, desde 2026-05-16)

Toda query SQL embebida en TS que aparezca en code paths productivos — especialmente signal readers, reliability queries, materializers, audit scripts — **debe validar sus assumptions de schema contra PG real antes de mergear**. `db.d.ts` (Kysely codegen) NO es source of truth — infiere DATE columns como `Timestamp` TS, lo cual lleva al bug class `EXTRACT(EPOCH FROM (date - date))` que produce `function pg_catalog.extract(unknown, integer) does not exist` en runtime.

**Bug class historico** (3 incidentes Sentry 2026-05-16 antes de las 12:00 UTC-4):

1. `column pe.superseded_by_entry_id does not exist` en GET /admin (commit 468505e5 hotfix).
2. `function pg_catalog.extract(unknown, integer) does not exist` en GET /admin (mismo commit).
3. `function pg_catalog.extract(unknown, integer) does not exist` en POST /reliability-ai-watch (commit bec374c8 hotfix).

Causa raíz comun: developers asumen tipos basados en `db.d.ts` (TS shapes inferred). En PG real:

- `date - date = integer` (días). `EXTRACT(EPOCH FROM integer)` NO existe.
- `timestamp - timestamp = interval`. `EXTRACT(EPOCH FROM interval)` OK.
- `date - integer = date`. `date + integer = date`.

**4 capas defense-in-depth canonical**:

#### 1. Lint rule `greenhouse/no-extract-epoch-from-date-subtraction` (mode error)

Detecta patterns SQL inseguros via 7 regex AST:

- `EXTRACT(EPOCH FROM (CURRENT_DATE - X))` — CURRENT_DATE es DATE.
- `EXTRACT(EPOCH FROM (X - CURRENT_DATE))` — mirror.
- `EXTRACT(EPOCH FROM (X::date - Y))` — cast explícito a DATE dispara bug.
- `EXTRACT(EPOCH FROM (X - Y::date))` — mirror.
- `EXTRACT(EPOCH FROM (MAX(*_date) - X))` — heurística: columnas con sufijo `_date` son típicamente DATE.
- `EXTRACT(EPOCH FROM (X.*_date - Y))` — column reference.
- `EXTRACT(EPOCH FROM (effective_from - start_date))` — caso TASK-890/TASK-872 canonical.

Modo `error` desde commit-1 (tolerancia cero — el bug class ya generó 2 Sentry alerts en producción).

#### 2. Smoke test pre-merge (canonical workflow)

Cuando un signal reader nuevo emerja o se modifique una query SQL existente, el dev DEBE ejecutar la query contra PG real via proxy ANTES de mergear:

```bash
# Levantar proxy
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432 &

# Smoke script canonical (one-shot, tira la query + valida no error)
cat > /tmp/_smoke-reader.ts <<'EOF'
import 'server-only'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  const r = await runGreenhousePostgresQuery(`<the new SQL query here>`)
  console.log('OK', r.length, 'rows')
}
main().catch(err => { console.error('FAIL:', err.message); process.exit(1) })
EOF

# Run con env
set -a && source .env.local && set +a
cp /tmp/_smoke-reader.ts scripts/_smoke-reader.ts
pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/_smoke-reader.ts
rm -f scripts/_smoke-reader.ts
```

Si la query falla → fix antes de mergear. NO mergear assumiendo que `db.d.ts` es source of truth.

#### 3. Schema verification protocol canonical

Cuando se necesite saber el tipo real de una columna en PG:

```bash
pnpm pg:connect:shell
greenhouse_app=> SELECT data_type FROM information_schema.columns
                 WHERE table_schema='greenhouse_finance'
                   AND table_name='account_balances'
                   AND column_name='balance_date';
```

O via TS:

```ts
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
const r = await runGreenhousePostgresQuery(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema=$1 AND table_name=$2
`, ['greenhouse_finance', 'account_balances'])
```

**Reglas para columnas DATE vs TIMESTAMP**:

- Sufijo `_date` (`balance_date`, `effective_from`, `start_date`, `hire_date`) → **típicamente DATE** en PG real.
- Sufijo `_at` (`created_at`, `updated_at`, `attached_at`, `lifecycle_stage_since`) → **típicamente TIMESTAMPTZ**.
- `CURRENT_DATE` → DATE. `NOW()` / `CURRENT_TIMESTAMP` → TIMESTAMPTZ.
- En duda → verificar con `information_schema.columns`.

#### 4. Canonical fix patterns

Cuando emerja la necesidad de "días entre dos fechas":

```sql
-- ✓ Pattern canonical #1: días directos (date - date = integer)
SELECT (CURRENT_DATE - MAX(balance_date))::int AS days_stale
FROM greenhouse_finance.account_balances;

-- ✓ Pattern canonical #2: cast explícito a timestamptz si necesitas epoch
SELECT EXTRACT(EPOCH FROM ((finished_at)::timestamptz - (started_at)::timestamptz)) AS seconds
FROM greenhouse_sync.source_sync_runs;

-- ✓ Pattern canonical #3: días con decimales
SELECT EXTRACT(DAY FROM ((x)::timestamptz - (y)::timestamptz)) AS days
FROM some_table;

-- ✗ Pattern PROHIBIDO (bug class TASK-893 hotfix)
SELECT EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(balance_date)))::int / 86400 AS days
FROM greenhouse_finance.account_balances;
-- Runtime: ERROR — function pg_catalog.extract(unknown, integer) does not exist
```

**⚠️ Reglas duras**:

- **NUNCA** confiar en `db.d.ts` (Kysely codegen) como source of truth de tipos PG. Es estimate inferred — DATE columns aparecen como `Timestamp` TS sin distinción.
- **NUNCA** usar `EXTRACT(EPOCH FROM (X - Y))` cuando X o Y es DATE. Use `(X - Y)::int` para días directos o cast a `::timestamptz` ambos lados.
- **NUNCA** mergear un signal reader nuevo o reliability query sin haber ejecutado la query al menos una vez contra PG real via proxy. Lint rule mecánica catch los patterns conocidos; smoke test catch el rest.
- **NUNCA** fixear el bug class en un solo callsite cuando emerja por Sentry alert. Hacer audit global (`grep -rn 'EXTRACT(EPOCH FROM' src/ services/`) + fixear TODOS los broken callsites en un solo commit + agregar lint rule + smoke test pre-merge.
- **NUNCA** desactivar la lint rule `greenhouse/no-extract-epoch-from-date-subtraction` para callsites legítimos sin agregar override block explícito en `eslint.config.mjs`. Override block requiere razón documentada en comentario.
- **SIEMPRE** que un nuevo reader/query emerja, validar contra PG real via proxy ANTES de mergear. Schema verification protocol canonical es 1-line query a `information_schema.columns`.
- **SIEMPRE** que el bug class se manifieste vía Sentry alert, escalation es: (1) audit global, (2) fix sistemático, (3) lint rule update (si falta cobertura), (4) CLAUDE.md update. NO fixear un callsite y shippear.

**Spec canónica**: lint rule en `eslint-plugins/greenhouse/rules/no-extract-epoch-from-date-subtraction.mjs` + tests en `__tests__/`. Override block en `eslint.config.mjs`.

### Workforce Exit Payroll Eligibility invariants (TASK-890, desde 2026-05-15)

Toda decision "este miembro esta en scope payroll en este periodo" pasa por el **resolver canonico server-only** `src/lib/payroll/exit-eligibility/`. Reemplaza el patron actual donde el reader payroll embebia el gate inline (`NOT EXISTS offboarding_cases WHERE status='executed' AND last_working_day < periodStart`), ignorando casos `external_payroll` (Deel/EOR) que cierran via proveedor externo sin transicionar a `executed`.

Bug class disparador: caso `EO-OFF-2026-0609A520` Maria Camila Hoyos, lane `external_payroll`/Deel `last_working_day=2026-05-14` status `draft`. Nomina proyectada mostraba full-month USD 530 para mayo 2026 porque external_payroll cierra fuera del state machine interno.

**Read API canonico** (`src/lib/payroll/exit-eligibility/index.ts`):

- `resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd) → Map<memberId, WorkforceExitPayrollEligibilityWindow>` — bulk-first. Devuelve `projectionPolicy` (`full_period | partial_until_cutoff | exclude_from_cutoff | exclude_entire_period`) + `eligibleFrom/eligibleTo` + `cutoffDate` + `warnings[]`.
- `isMemberInPayrollScope(memberId, asOf) → boolean` — thin predicate wrapper para capability gates, drawer state, checks single-member.

**Matriz canonica per lane** (§2 ADR):

| `rule_lane` (DB) | Threshold de exclusion | Policy con cutoff en periodo |
|---|---|---|
| `internal_payroll` / `relationship_transition` | `status = 'executed'` | `partial_until_cutoff` (prorratear hasta LWD) |
| `external_payroll` / `non_payroll` | `status IN ('approved','scheduled','executed')` | `exclude_from_cutoff` (Greenhouse no paga internal) |
| `identity_only` | N/A — siempre `full_period` | Identity ortogonal a payroll |
| `unknown` | conservador — `full_period` + warning `unclassified_lane` | — |

**Rationale asymmetric threshold**: internal_payroll requiere `executed` porque Greenhouse paga finiquito Chile que debe estar emitido + ratificado (TASK-862/863). External_payroll/Deel nunca paga Greenhouse; `approved` es momento canonico de decision firmada. Esperar `executed` para evento que vive afuera del runtime Greenhouse es deuda operativa permanente.

**Cutoff canonico**: `COALESCE(last_working_day, effective_date)`. Schema CHECK constraints (TASK-760) garantizan `effective_date NOT NULL` en `approved+` y `last_working_day NOT NULL` en `scheduled+`. NUNCA usar `last_working_day` solo — entre `approved` y `scheduled` puede ser NULL.

**Feature flag canonico** `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (default `false` V1.0):

- `false` (default): `pgGetApplicableCompensationVersionsForPeriod` mantiene gate legacy bit-for-bit (solo excluye `executed` AND `last_working_day < periodStart`). Zero-risk parity.
- `true` (post staging shadow compare ≥7d con Maria-fixture verde): post-filter via resolver + attach `exitEligibilityWindow?: WorkforceExitPayrollEligibilityWindow` opcional al row para que consumers downstream (`project-payroll.ts`) puedan prorratear.

Pattern fuente: `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872).

**Degraded mode honesto**: si `resolveExitEligibilityForMembers` falla (DB transient, schema drift), `captureWithDomain('payroll', err, { source: 'exit_eligibility.integration_degraded' })` + fallback a legacy SQL path. Payroll nunca rompe full. Reliability signal `payroll.exit_eligibility.bq_fallback_invoked` cubre detection en V1.1.

**Lint rule canonica** `greenhouse/no-inline-payroll-scope-gate` (modo `warn` V1.0, promueve a `error` post 30d steady): detecta SQL embebido con `NOT EXISTS ... work_relationship_offboarding_cases ... status='executed' AND last_working_day` o variantes EXISTS positive. Override block exime: `src/lib/payroll/exit-eligibility/**`, `src/lib/payroll/postgres-store.ts` (gate legacy behind flag — grandfathered), tests del rule.

**⚠️ Reglas duras**:

- **NUNCA** filtrar inclusion payroll inline en un SQL embebido en TS. Toda decision pasa por `resolveExitEligibilityForMembers` o `isMemberInPayrollScope`. Lint rule bloquea regresion.
- **NUNCA** distinguir entre `rule_lane` valores con strings literales en consumers. Usar enum `ExitLane` del resolver (DB-aligned 1:1) o consumer reads `projectionPolicy` directly.
- **NUNCA** mezclar el gate de intake (`workforce_intake_status` TASK-872) con el gate de exit (`exitLane × status`). Son ortogonales by design — features distintos.
- **NUNCA** modificar el threshold por lane sin actualizar AMBOS: matriz §2 ADR + tests anti-regresion + lint rule + reliability signal evidence.
- **NUNCA** ejecutar payroll real (no proyectada) sin que el mismo resolver filtre las compensation versions aplicables. Single source of truth across projected + actual.
- **NUNCA** auto-mutar Person 360 desde read path. Solo signal en V1 (Slice 6). Write reconciliation = command auditado V1.1+.
- **NUNCA** usar `last_working_day` solo como cutoff. Toda decision usa `COALESCE(last_working_day, effective_date)`. Schema CHECK invariants TASK-760 garantizan que `effective_date` esta poblado en `approved+`.
- **NUNCA** invocar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'payroll' | 'hr' | 'identity', { tags: { source: 'exit_eligibility_*' } })`.
- **NUNCA** modificar el shape de `WorkforceExitPayrollEligibilityWindow` sin actualizar consumers en el mismo PR. Tipo es contractual cross-module.
- **NUNCA** activar `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en production sin: (a) staging shadow compare verde >=7d; (b) Maria-like fixture green; (c) signal `payroll.exit_window.full_month_projection_drift` count=0 sustained.
- **NUNCA** un consumer payroll que necesite saber "este miembro esta en scope" recomputa el gate inline. Opciones canonicas en orden de preferencia:
  1. Lee `exitEligibilityWindow` del row mapped que devuelve `pgGetApplicableCompensationVersionsForPeriod` (auto-attached cuando flag activo).
  2. Llama `resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd)` directamente (bulk).
  3. Llama `isMemberInPayrollScope(memberId, asOf)` para single-member checks (capability gates, drawer state).
- **SIEMPRE** que emerja un `rule_lane` nuevo en schema (e.g. `eor_provider`, `intercompany_loan`), extender §2 tabla ADR + `ExitLane` type + matriz `derivePolicy` + tests + lint rule en el mismo PR.
- **SIEMPRE** que un consumer nuevo necesite "members en scope laboral interno" (capacity, staffing, cost attribution), llamar al resolver. Cero composicion ad-hoc.
- **SIEMPRE** que BQ fallback path se invoque (cuando emerja replicacion en BQ V1.1+), emitir `captureWithDomain('payroll', warn, { source: 'bq_fallback_no_exit_gate' })`.

**Spec canonica**: `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`. Task: `docs/tasks/in-progress/TASK-890-workforce-exit-payroll-eligibility-window.md`. Patrones fuente: TASK-571/766/774 (VIEW canonica + helper + signal + lint), TASK-742 (defense-in-depth), TASK-872 (feature flag gate), TASK-720 (TS-only declarative reader), TASK-672 (rich struct + thin predicate).

### Payroll Participation Window invariants (TASK-893, desde 2026-05-16)

Toda decision "esta persona participa en este periodo y por cuanto" pasa por el **resolver canonico server-only** `src/lib/payroll/participation-window/`. Compone TASK-890 (exit eligibility) + compensation effective dating + observe-only onboarding source. Reemplaza el patron legacy donde `prorateEntry` rescala monetary fields post-hoc (rompe `chileGratificacionLegalAmount` cap, `chileTotalDeductions` aggregate, `siiRetentionAmount` traceability).

**Pattern canonico (BL-1)**: escalar la compensation **antes** de `buildPayrollEntry`, NUNCA rescale post-hoc del output. La canonical calculator recomputa deducciones, gratificacion legal cap, y retencion SII desde las bases prorrateadas.

**Read API canonico** (`src/lib/payroll/participation-window/`):

- `resolvePayrollParticipationWindowsForMembers(memberIds, periodStart, periodEnd) → Map<memberId, PayrollParticipationWindow>` — canonical bulk resolver.
- `isMemberParticipatingInPayroll(memberId, asOf) → boolean` — thin predicate para capability checks.
- `prorateCompensationForParticipationWindow<T>(compensation, factor) → T` — pure helper que escala los inputs canonicos pre-buildPayrollEntry. Generic over T. Idempotente.
- `derivePayrollParticipationPolicy(facts) → PayrollParticipationWindow` — pure function que computa policy + reason codes + prorationFactor weekday-basis.
- `isPayrollParticipationWindowEnabled() → boolean` — flag check (`PAYROLL_PARTICIPATION_WINDOW_ENABLED`, default `false`).

**Flag dependency canonical**: `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` REQUIERE `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente. Sin esa pre-condicion, el resolver emite warning `exit_resolver_disabled` por miembro afectado (partial correctness es el peor failure mode). Enforce code-side en `resolver.ts` invocando `isPayrollExitEligibilityWindowEnabled()` explicito.

**4 reliability signals canonicos** bajo subsystem `Finance Data Quality` (moduleKey='finance', mirror TASK-765/766/768/774):

- `payroll.participation_window.full_month_entry_drift` — kind=drift, severity=warning >0, steady=0 post flag-ON. Detecta mid-period entries no prorrateados.
- `payroll.participation_window.source_date_disagreement` — kind=drift, severity=warning >0, steady=0 post-cleanup. Detecta drift compensation.effective_from vs onboarding.start_date > 7 dias.
- `payroll.participation_window.projection_delta_anomaly` — kind=drift, severity=unknown V1.0 (honest degradation; shadow compare wiring es V1.1 follow-up).
- Bonus: lint rule `greenhouse/no-inline-payroll-scope-gate` (TASK-890 herencia) sigue cubriendo el path roster.

**⚠️ Reglas duras**:

- **NUNCA** rescale monetary fields post-`buildPayrollEntry` para members con participation factor < 1. Pattern canonical: escalar compensation primero, dejar al calculator recomputar deducciones + gratificacion legal cap + retencion SII desde gross prorrateado. El helper `prorateCompensationForParticipationWindow` es la unica fuente de truth para ese scale.
- **NUNCA** prorratear `colacionAmount` ni `movilizacionAmount` automaticamente en el path de participation. Son asignaciones no imponibles fijas; la decision es contractual del operador HR (jurisprudencia chilena Art 50 CT no las auto-prorratea).
- **NUNCA** consumir el modulo `participation-window` desde codigo client-side. Server-only enforce con `import 'server-only'`.
- **NUNCA** activar `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` sin (a) `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en mismo env, (b) staging shadow compare >=7d verde, (c) HR/Finance written approval en `Handoff.md`, (d) allowlist explicita de members afectados.
- **NUNCA** activar el flag productivo sin haber shippeado la capability `payroll.period.force_recompute` (V1.1 reclassified to pre-flag-ON gate por finance auditor 2026-05-16). Sin esa capability, BL-5 deja al operador stuck cuando necesite recompute en periodo exportado pre-flag-flip.
- **NUNCA** recomputar single-member entry bajo flag ON via `recalculatePayrollEntry`. El path esta blocked con canonical error `recalc_blocked_by_participation_window` para evitar bypass del participation factor. Usar period-level `calculatePayroll` que respeta participation correctamente.
- **NUNCA** recomputar periodo `reopened` bajo flag ON sin capability `payroll.period.force_recompute`. Guard canonico `isReopenedRecomputeBlockedByParticipationWindow(status, flagEnabled)` enforce.
- **NUNCA** consumir `payroll_entries.gross_total` ni cualquier campo devengado para base imponible legal del finiquito (Art 159, 161, 50, 67 CT). Source canonical es `compensation_versions.base_salary` nominal full-month (cross-spec invariant lift en `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` Delta 2026-05-16).
- **NUNCA** modificar la cap mensual de gratificacion legal (4.75 × IMM ÷ 12 ≈ $213,354 en 2026) para mes parcial. El cap es MENSUAL, NO se prorratea (jurisprudencia chilena Opcion A canonical, Dictamen DT 2937/050 2002). Si HR decide entry month = $0 gratificacion, debe usar `gratificacionLegalMode='ninguna'` (override manual).
- **NUNCA** modelar los dias previos al ingreso contractual como ausencia. Participation NO es attendance. `days_absent`, `daysOnUnpaidLeave`, readiness de asistencia: ninguno debe inflarse para representar no-participacion.
- **SIEMPRE** que un consumer payroll necesite "el monto del mes para member X", leer `payroll_entries.gross_total` (que viene prorrateado correctamente cuando flag ON). NUNCA recomputar inline desde compensation × dias trabajados.
- **SIEMPRE** que emerja un nuevo path que muta o calcula payroll_entries, verificar que invoque `prorateCompensationForParticipationWindow` ANTES de `buildPayrollEntry` (mirror del pattern en `project-payroll.ts` + `calculate-payroll.ts`). Single-member paths bypass son anti-pattern bajo flag ON — blockear con canonical error.

**Spec canonica**: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16. Task: `docs/tasks/complete/TASK-893-payroll-participation-window.md`. Pre-flag-ON gates documentados en ADR seccion "Pre-flag-ON-producción gates". Patrones fuente: TASK-890 (exit eligibility composition), TASK-758 (4 regimenes canonicos), TASK-742 (defense-in-depth 7-layer), TASK-872 (flag gate), TASK-765/766/768/774 (reliability signals canonical pattern + builder).

### Leave Accrual Participation-Aware invariants (TASK-895, desde 2026-05-16)

Toda decision de **accrual de feriado legal CL Art 67 CT** para un colaborador en un year pasa por el **resolver canonico server-only** `src/lib/leave/participation-window/`. El resolver es un **year-scope aggregator** que compone TASK-893 (Payroll Participation Window, month-scope) mes a mes + filtra `rule_lane='internal_payroll'` para excluir periodos contractor/honorarios/external. Cierra bug class regulatorio CL: cuando un colaborador transita `contractor → dependent` mid-year, el helper legacy `calculateAccruedLeaveAllowanceDays` ancla accrual desde `members.hire_date` ignorando el periodo non-dependent — generando sobreacumulación + sobrepago al finiquito + precedente contractual riesgoso.

**Read API canonico** (`src/lib/leave/participation-window/`):

- `resolveLeaveAccrualWindowsForMembers(memberIds, year, options?: { asOfDate?: string }) → Map<memberId, LeaveAccrualEligibilityWindow>` — canonical bulk resolver.
- `resolveLeaveAccrualWindowForMember(memberId, year, options?)` — single-member helper.
- `deriveLeaveAccrualPolicy(facts) → LeaveAccrualEligibilityWindow` — pure function (33 tests verde).
- `fetchCompensationFactsForLeaveAccrual(memberIds, yearStart, yearEnd)` — bulk PG query.
- `isLeaveAccrualParticipationAwareEnabled() → boolean` — flag check con triple flag dependency enforcement.
- `buildDegradedLeaveAccrualWindow(...)` — helper canonical para construir degraded windows desde el resolver wrapper.

**Boundary semantic**:

| Domain | Scope | Owns |
|---|---|---|
| Leave (TASK-895) | Year | `LeaveAccrualEligibilityWindow.eligibleDays` + `firstServiceCycleDays` |
| Payroll Participation (TASK-893) | Month | `PayrollParticipationWindow.prorationFactor` + `exitEligibility` |
| Workforce Exit (TASK-890) | Period (case-driven) | `WorkforceExitPayrollEligibilityWindow.projectionPolicy` + `eligibleTo` |

**Flag dependency canonical (triple enforcement)**: `LEAVE_PARTICIPATION_AWARE_ENABLED=true` REQUIERE `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` AND `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente. El helper `isLeaveAccrualParticipationAwareEnabled()` enforce la dependencia al boundary: retorna `true` solo cuando las 3 flags están ON. Sin esa pre-condición, retorna `false` (legacy bit-for-bit fallback) — degraded honesto.

**Integration canonical en `postgres-leave-store.ts`**: el helper local `tryComputeParticipationAwareAllowanceDays` valida 4 pre-condiciones antes de aplicar la fórmula canonical `roundLeaveDays((annualDays * eligibleDays) / firstServiceCycleDays)`:

1. `isLeaveAccrualParticipationAwareEnabled()` returns true.
2. `policy.accrualType === 'monthly_accrual'`.
3. `member.pay_regime === 'chile'`.
4. Resolver returns `degradedMode === false`.

Si cualquier pre-condición falla → fallback a `calculateAccruedLeaveAllowanceDays` legacy bit-for-bit. Preserva CL legal floor en cada degraded path.

**Reliability signal canonical**: `hr.leave.accrual_overshoot_drift` (kind=`drift`, severity=`warning` si count>0, steady=0 post-flag-ON + re-seed). Subsystem rollup: `'Payroll Data Quality'` (moduleKey `'payroll'`) — unificado con TASK-893 signals. Reader pattern SHAPE detector (NO recompute exacto): identifica miembros con `hire_date` >30 días antes del `MIN(effective_from)` qualifying dependent CL.

**Auditoría canonical**: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/leave/audit-accrual-drift.ts --target-year=<year> [--output=<path>]`. Read-only dry-run que reporta drift exacto por miembro (legacy vs participation-aware). Documentado en `docs/operations/runbooks/leave-accrual-drift-audit.md`.

**⚠️ Reglas duras**:

- **NUNCA** reescribir el helper puro `calculateAccruedLeaveAllowanceDays` en `src/lib/hr-core/leave-domain.ts`. Integration ocurre en el call site (`postgres-leave-store.ts:1078,1102`) behind flag. Preserva 7 tests pure verdes legacy + SRP.
- **NUNCA** extender `PayrollParticipationWindow` con `contractType`/`payRegime` para servir a Leave. Leave hace su propia query independiente a `compensation_versions` + compose TASK-893/890 solo para exit cutoff. DAG-leaf rule.
- **NUNCA** importar `@/lib/leave/participation-window` desde un módulo de Payroll. DAG direction: Leave → Payroll, NUNCA reverse. Anti-corruption layer enforced en barrel.
- **NUNCA** computar accrual inline desde `hire_date` solo cuando `LEAVE_PARTICIPATION_AWARE_ENABLED=true` y `memberId` disponible. El call site debe consumir el resolver canónico via `tryComputeParticipationAwareAllowanceDays`.
- **NUNCA** mutar `leave_balances` automáticamente cuando se activa el flag. Backfill audit script V1.1a es read-only dry-run; mutation auditada queda V1.2 con capability `leave.balances.reconcile`.
- **NUNCA** activar `LEAVE_PARTICIPATION_AWARE_ENABLED=true` sin: (a) las dos flags parent ON en mismo env, (b) staging shadow audit ≥30d con signal count=0, (c) HR + Legal written approval en `Handoff.md` con specific members allowlist, (d) audit script S4 dry-run con review HR documentado.
- **NUNCA** consumir el modulo `participation-window` desde codigo client-side. Server-only enforce con `import 'server-only'` en cada archivo del modulo.
- **NUNCA** validar SQL queries de signal readers contra `db.d.ts` shapes inferred como ground truth. **Lección canonical** del hotfix Sentry 2026-05-16: schema real PG es source of truth, no TS types. Future readers DEBEN validar contra PG real via proxy (`pnpm pg:connect:shell` + smoke script) ANTES de mergear. Bug class concreto detectado: `compensation_versions.payroll_via` NO existe en PG real (Kysely codegen drift); `payroll_via` vive en `members`. Y `compensation_versions.effective_from` es `date` no `timestamp` (`date - date = integer`, no `interval`).
- **SIEMPRE** que un consumer downstream necesite "días efectivos de dependent CL en este year", llamar al resolver canonico. Cero composicion ad-hoc.
- **SIEMPRE** que emerja un nuevo path que compute accrual de feriado legal, verificar que pase por `tryComputeParticipationAwareAllowanceDays` (mirror del pattern aplicado a `computeBalanceSeedForYear`). Single source of truth canonical.

**Open questions (deliberadamente NO en V1.1a)**:

- Honorarios + feriado proporcional opcional: hoy NO. Solo `dependent` (`indefinido`/`plazo_fijo`).
- Saldos negativos por vacaciones tomadas pre-transición contractor→dependent: V1.2 write-path reconciliation con capability `leave.balances.reconcile`.
- Tracking historical de `members.payroll_via` (cambios mid-year): V1.2 si emerge necesidad concreta.

**Spec canonica**: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16 §"TASK-895 V1.1a S0". Task: `docs/tasks/complete/TASK-895-leave-accrual-participation-aware.md`. Runbook: `docs/operations/runbooks/leave-accrual-drift-audit.md`. Patrones fuente: TASK-893 (month-scope primitive composer), TASK-890 (exit lanes), TASK-742 (defense-in-depth flag dependency).

### Person 360 Relationship Reconciliation invariants (TASK-891, desde 2026-05-15)

Toda mutación de relaciones legales (`greenhouse_core.person_legal_entity_relationships`) que cierre una relación activa y abra una nueva en su lugar — el caso disparador es drift `member.contract_type='contractor' / payroll_via='deel'` con relación activa `'employee'` — **debe** pasar por el helper canónico `reconcileMemberContractDrift` (`src/lib/person-legal-entity-relationships/reconcile-drift.ts`). NUNCA SQL inline en consumers; NUNCA auto-mutar desde cron / read path.

**Read API canónico**:

- Helper canónico: `reconcileMemberContractDrift(input)` en `src/lib/person-legal-entity-relationships/reconcile-drift.ts`. Composes `endPersonLegalEntityRelationship` (TASK-337) + `createContractorLegalEntityRelationship` (TASK-337) envueltos en `withGreenhousePostgresTransaction` atomic. REUSE > CREATE.
- Error class: `PersonRelationshipReconciliationError` con 8 codes canónicos (`reason_too_short`, `member_not_found`, `member_inactive`, `member_missing_identity_profile`, `no_active_employee_relationship`, `multiple_active_employee_relationships`, `invalid_contractor_subtype`, `invalid_external_close_date`). Es-CL safe para exponer en API boundary.
- Route handler: `POST /api/admin/person/relationships/[memberId]/reconcile-drift`.
- UI form: `/admin/identity/drift-reconciliation?memberId=<id>`. Reachable vía deep link desde signal alert.

**Defense in depth dual-gate**:

- DB: capability seed en `greenhouse_core.capabilities_registry` (migration `20260515150631235_task-891-...`).
- App: `requireAdminTenantContext` (route_group=admin + role=EFEONCE_ADMIN) + `can(subject, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')`.
- TS catalog: `src/config/entitlements-catalog.ts` con `module='people'` (alineado con TASK-784 `person.legal_profile.*`).
- Runtime grant: `src/lib/entitlements/runtime.ts`. V1.0 grant **SOLO EFEONCE_ADMIN** (drift Person 360 cross-domain). Delegación a HR queda V1.1+.

**Auto-escalation severity** del signal `identity.relationship.member_contract_drift`:

- `count = 0` → `ok`
- `count > 0 AND oldestDriftAgeDays < 30` → `warning` (reciente)
- `count > 0 AND oldestDriftAgeDays >= 30` → `error` (sostenido, write path disponible)
- `query falla` → `unknown`

Threshold `SUSTAINED_DRIFT_THRESHOLD_DAYS = 30` (mismo bar TASK-848/849 production release stale_approval).

**Outbox events**: NO crear `.reconciled` v1 nuevo. Reusar `.deactivated` + `.created` existentes con `metadata_json.reconciliationContext = { commandId: 'reconcile-member-contract-drift', supersededRelationshipId, supersededRelationshipType, reason, actorUserId, reconciledAt, externalCloseDate, contractorSubtype }` en la new row. Correlation forensic via `actor_user_id` idéntico + `created_at` mismo segundo + metadata.

**Notes marker append-only** (forensic readable):

- Legacy row (status='ended'): `[TASK-891 reconciled by actor=USER_ID on YYYY-MM-DD — superseded by new contractor relationship] <reason>`
- New row (status='active'): `Reconciled from employee via TASK-891 (actor=USER_ID, YYYY-MM-DD) — reason: <reason>`

**Reason length**: `>= 20 chars` (bar más alto que TASK-890 close_external_provider `>= 10` porque blast Person 360 es cross-domain — payroll readiness, payslips, reportes legales, ICO). Pattern fuente TASK-848 production release bypass.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `DELETE FROM person_legal_entity_relationships`. Solo supersede via `effective_to + status='ended'`. Append-only audit.
- **NUNCA** escribir SQL inline en consumers que muten `person_legal_entity_relationships`. Toda mutación pasa por helpers canónicos del módulo (`endPersonLegalEntityRelationship`, `createContractorLegalEntityRelationship`, `reconcileMemberContractDrift`).
- **NUNCA** auto-mutar Person 360 desde un read path / cron / cleanup automático. V1.0 es operator-initiated single-member. V2 (cron) requiere ADR nuevo + HR approval explícito.
- **NUNCA** fabricar `relationship_type` fuera del enum del schema (`shareholder`, `founder`, `legal_representative`, `board_member`, `executive`, `employee`, `contractor`, `shareholder_current_account_holder`, `lender_to_entity`, `borrower_from_entity`). TASK-891 V1.0 solo soporta target `contractor` con subtype en `metadata_json.relationshipSubtype`.
- **NUNCA** mutar a María Camila Hoyos como parte de TASK-891. Recovery espera staging synthetic fixture verde + HR approval explícito + ejecución vía dialog UI con reason ≥20 chars.
- **NUNCA** emitir el evento `.reconciled` (no existe en V1.0). Reusar `.deactivated` + `.created` + metadata correlation.
- **NUNCA** grant `person.legal_entity_relationships.reconcile_drift` a HR ni FINANCE_ADMIN en V1.0. Solo EFEONCE_ADMIN. Delegación = decisión V1.1.
- **NUNCA** exponer `error.message` raw desde el route handler. Sanitiza via canonical error response con `code + actionable + evidence` + `captureWithDomain('identity', err, ...)`.
- **NUNCA** invocar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'person_relationship_reconcile_drift' } })`.
- **SIEMPRE** envolver UPDATE legacy + INSERT new + outbox publish en `withGreenhousePostgresTransaction`. Si cualquier paso falla, rollback completo.
- **SIEMPRE** validar `reason.trim().length >= 20` en client UI (button disabled) + server (canonical error). Defense in depth.
- **SIEMPRE** persistir `metadata_json.reconciliationContext` en la new row para correlation forensic.
- **SIEMPRE** append marker forensic a `notes` de ambas rows (legacy + new) con shape `[TASK-891 reconciled by actor=X on Y]`.
- **SIEMPRE** que un consumer downstream necesite reaccionar a reconciliación, correlar via `actor_user_id + created_at` o leer `metadata_json.reconciliationContext` de la new row. Si emerge necesidad real de meta-evento, V1.1 considera `.reconciled v1`.
- **SIEMPRE** auto-escalation severity respecta `SUSTAINED_DRIFT_THRESHOLD_DAYS = 30`. Si emerge necesidad de ajustar el threshold, hacerlo en `identity-relationship-member-contract-drift.ts` con tests anti-regresion + delta en doc canonical.

**Spec canónica**: `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md`. Task: `docs/tasks/in-progress/TASK-891-person-relationship-drift-reconciliation-write-path.md`. Patrones fuente: TASK-337 (helpers reusados), TASK-877 (signal-then-command), TASK-890 (predecesor del signal), TASK-742 (defense-in-depth), TASK-839/TASK-873 (capability triple-layer canonical), TASK-848 (reason >=20 bar), TASK-672 (rich struct + thin predicate).

### Offboarding Closure Completeness Aggregate invariants (TASK-892, desde 2026-05-15)

Toda surface que renderice el detalle operativo de un offboarding case (work-queue inspector, drawer, future Pulse cards, future organization-workspace "Salida" facet) **debe** consumir el aggregate canonical `closureCompleteness` de `OffboardingWorkQueueItem`. El `primaryAction` se deriva de `pendingSteps[0]` actionable, NUNCA hardcoded por `closureLane` solo.

El bug class observado live 2026-05-15 con María Camila Hoyos: case `executed` con drift Person 360 sin reconciliar mostraba `primaryAction = 'Cerrar con proveedor'` (boton de Layer 1 ya terminal). Tres de las 4 capas alineadas, la cuarta (Person 360) reportaba drift detectado por signal `identity.relationship.member_contract_drift` desde TASK-890, pero la UI ignoraba esa capa y mostraba un CTA obsoleto que el state machine rechazaría con 4xx.

**Aggregate canonical** (`src/lib/workforce/offboarding/work-queue/closure-completeness.ts`):

- 4 layer alignment fields ortogonales: `caseLifecycle` / `memberRuntime` / `personRelationship` / `payrollScope`.
- `closureState`: enum cerrado `'pending' | 'partial' | 'complete' | 'blocked'`.
- `pendingSteps[]`: array ordenado por constant canonical `STEP_PRIORITY = ['case_lifecycle', 'reconcile_drift', 'verify_payroll_exclusion']`.
- Helper canonical `computeClosureCompleteness(facts)` pure function — 100% testable, NO IO.
- `derivePrimaryActionFromCompleteness(completeness, legacyAction)` decide el primaryAction desde primer step actionable.

**⚠️ Reglas duras**:

- **NUNCA** computar `primaryAction` inline en componentes de UI desde `closureLane` solo. Toda derivación pasa por `derivePrimaryActionFromCompleteness` server-side dentro de `buildOffboardingWorkQueueItem`.
- **NUNCA** modificar `STEP_PRIORITY` sin extender paralelamente: (a) `OffboardingClosureStepCode` type union, (b) un `build*Step` builder pure function en `closure-completeness.ts`, (c) test anti-regresión cubriendo el nuevo step en al menos 2 paths (actionable + skip). El orden es contractual — moverlo invalida el bug-class fix y rompe consumers que asumen "primer step actionable = CTA principal".
- **NUNCA** componer la decisión `closureState` en cliente. Server-only por construcción — `closure-completeness.ts` lleva `import 'server-only'` al inicio.
- **NUNCA** filtrar pendingSteps en UI por capability inline. Cada step declara `capability: string | null`; UI esconde steps sin capability via gate runtime (`can(subject, capability, action)`). NO duplicar la matriz `relationship × capability → access` en componentes.
- **NUNCA** crear paths paralelos para "ver el cierre real" (e.g. badge custom en algún card que no consume `closureCompleteness`). Single source of truth.
- **NUNCA** asumir que `personRelationshipDrift === null` significa "no drift". Es `unknown` (member sin profile o lookup downstream falló). `degradedReasons[]` en `OffboardingWorkQueue` reporta cuándo lookups fallan honestamente.
- **NUNCA** mostrar `Cierre parcial` sin explicar las capas pendientes. La seccion UI "Capas pendientes" es obligatoria — sino el operador no sabe qué hacer y reincide en el bug class previo.
- **NUNCA** mutar Maria Camila Hoyos operativamente como parte de TASK-892. Recovery espera ejecución manual via TASK-891 dialog post staging validation. El aggregate solo *visibiliza* el cierre parcial — no auto-resuelve drift Person 360.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del aggregate. Usar `captureWithDomain(err, 'identity', { tags: { source: 'offboarding_closure_completeness', stage: '<...>' } })`.
- **SIEMPRE** que emerja un step nuevo (e.g. `verify_assignment_closure`, `unblock_blocker`, `download_certificate`), agregar al enum + builder pure + STEP_PRIORITY posicion explícita + tests anti-regresión. El builder retorna `null` cuando el step no aplica al case (e.g. case non-terminal para verify_payroll_exclusion).
- **SIEMPRE** que un consumer downstream (Pulse, organization workspace facet "Salida", report PDFs) muestre el estado del cierre, leer `closureCompleteness.closureState` directo — NUNCA recomputar.
- **SIEMPRE** preservar el patrón "informational vs actionable" en pendingSteps. Steps `actionable: false` se renderean como hints/alerts sin CTA. Steps `actionable: true` se renderean como CTAs con href si lo declaran.

**Reusable cross-flow**: el patrón "`pendingSteps[]` decide el primaryAction" se replica para Onboarding work queue (TASK-875), hiring pipeline, workforce activation (TASK-874), contractor closure (TASK-797 futuro), final settlement document lifecycle (TASK-863). Cuando emerja una surface con `primaryAction` derivado de una sola dimensión pero realidad operativa multi-capa, replicar: pure function + STEP_PRIORITY + state machine cerrado + signal de cierre parcial.

**Spec canónica**: `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` (Delta 2026-05-15). Task: `docs/tasks/in-progress/TASK-892-offboarding-closure-completeness-aggregate.md`. Reliability signal: `hr.offboarding.completeness_partial` (kind=drift, severity warning >0, steady=0, subsystem Identity & Access). Patrones fuente: TASK-742 (4-pillar checklist), TASK-672 (composer + degraded honest), TASK-880 (decision tree por capability + audience), TASK-873 (capability triple-layer canonical).

### Contractor Engagements invariants (TASK-790, desde 2026-05-29)

`ContractorEngagement` (`greenhouse_hr.contractor_engagements`) es el agregado canónico del contrato operativo contractor/honorarios, bajo **Workforce/HR — NO Payroll**. Fundación de Contractor Payables (EPIC-013). El pago real NO nace aquí (eso es TASK-791..793 hacia Finance). Módulo TS: `src/lib/contractor-engagements/` (barrel **pure-only**; el store es server-only y se importa directo desde `@/lib/contractor-engagements/store` para no arrastrar `import 'server-only'` a un client bundle — bug class TASK-827).

**Anchor (D1)**: el engagement FK-anchora a `greenhouse_core.person_legal_entity_relationships.relationship_id` (PK real `relationship_id`) `ON DELETE RESTRICT`. La relación contractor **activa** se resuelve vía `resolveActivePersonLegalEntityRelationships({profileId, relationshipTypes:['contractor']})` en `src/lib/account-360/person-legal-entity-relationships.ts`. El engagement **NUNCA** crea relaciones (eso es TASK-789 `transitionEmployeeToContractor` / TASK-891 `reconcileMemberContractDrift`).

**Subtype SSOT (D2)**: `contractor_engagements.relationship_subtype` (5 valores finos: `honorarios_cl`, `freelance`, `independent_professional`, `international_contractor`, `provider_platform`) es SSOT propio del engagement, validado por **consistencia de familia** contra el subtype coarse de la relación (`{contractor,honorarios}` en `metadata.relationshipSubtype`) vía `assertSubtypeConsistency` (honorarios→honorarios_cl; contractor→el resto). Sin write-back a la relación.

**payroll_via ortogonal (D3)**: `contractor_engagements.payroll_via` es el canal del engagement (enum propio `internal/deel/remote/oyster/manual_provider/direct_international`, tipo TS `ContractorEngagementPayrollVia` **distinto** del `PayrollVia` de payroll).

**State machine + CHECK + audit trio** (pattern TASK-700/765): `contractor_engagements` (mutable, CHECK enums + BEFORE UPDATE `contractor_engagements_validate_transition` trigger + CHECK `contractor_engagements_active_requires_clear_risk`) + append-only `contractor_engagement_events` (triggers anti-UPDATE/anti-DELETE). Matriz: `draft→{pending_review,active,cancelled}`, `pending_review→{active,draft,cancelled}`, `active→{paused,ending,cancelled}`, `paused→{active,ending,cancelled}`, `ending→{ended,active,cancelled}`, `ended`/`cancelled` terminales. Mirror TS: `assertValidEngagementTransition` (`state-machine.ts`).

**Classification risk first-class**: `computeClassificationRisk({factors, reviewed, block})` (`classification-risk.ts`) determinístico. `clear` requiere review explícito (`reviewed=true`) — un engagement fresco nunca auto-clarea (floor `needs_review`). Subordinación material (schedule+supervision, o exclusividad+dependencia económica, o rol interno indistinguible) → `legal_review_required`; `blocked` solo escala manual. Riesgo bloqueante (`legal_review_required`/`blocked`) impide `active` (CHECK DB + app guard); escalar riesgo en un engagement `active` lo **auto-pausa**.

**Tax owner mandatory**: `tax_compliance_owner` NOT NULL (default por `resolveDefaultTaxComplianceOwner`: honorarios_cl→greenhouse_policy; deel/remote/oyster→provider_owned; resto→manual_review_required). honorarios CL snapshot de tasa SII (`getSiiRetentionRate` — SSOT del valor) + `tax_withholding_policy_code` versionado (`cl_honorarios_2026_15_25`).

**⚠️ Reglas duras (no-regresión Payroll)**:

- **NUNCA** escribir/mutar `greenhouse_payroll.payroll_entries`, `payroll_adjustments`, `compensation_versions`, `final_settlements`/`final_settlement_documents` desde el engagement. Contractor payables jamás entran como payroll dependiente (nacen en 791-793 hacia Finance).
- **NUNCA** sobrescribir `members.payroll_via`, `members.contract_type` ni `members.pay_regime`. El motor payroll clasifica por las columnas del member; el engagement declara su propio canal (D3).
- **NUNCA** aplicar deducciones Chile dependientes (AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC) a honorarios. Solo retención SII versionada.
- **NUNCA** habilitar finiquito laboral para contractor/honorarios — su cierre futuro es `contractor_closure` (TASK-797).
- **NUNCA** componer un internal account number, transición, ni riesgo de clasificación inline en consumers. Usar los helpers canónicos del módulo.
- **NUNCA** re-exportar el store desde el barrel `index.ts` (server-only transitive). Importar `@/lib/contractor-engagements/store` directo en server.
- **NUNCA** seedear una capability del engagement sin grant en `runtime.ts` en el mismo PR (guard `capability-grant-coverage.test.ts`).
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio.

**Access**: capabilities `hr.contractor_engagement` (read/create/update/manage) + `hr.contractor_classification` (read/approve). Grants: read+manage → HR route_group ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN; classification.approve → EFEONCE_ADMIN ∪ FINANCE_ADMIN ∪ HR_MANAGER. API `/api/hr/contractors` (GET/POST) + `/api/hr/contractors/[id]` (GET/PATCH action=transition|update|review_classification).

**Reliability signal**: `hr.contractor_engagement.classification_risk_open` (kind=drift, moduleKey=identity, steady=0) — cuenta engagements no terminales con riesgo bloqueante. **Outbox v1**: `workforce.contractor_engagement.{created,activated,paused,ended,cancelled,classification_risk_flagged}` (aggregateType `contractor_engagement`).

**Spec canónica**: `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (V1.1 Delta 2026-05-29). Task: `docs/tasks/complete/TASK-790-contractor-engagements-runtime-classification-risk.md`. Migración: `20260529221452562`. Patrones fuente: TASK-789/891 (substrate anchor), TASK-700/765 (state machine + CHECK + audit), TASK-742 (defense-in-depth), TASK-873/935 (capability grant coverage), TASK-758 (SII retention SSOT).

### Contractor Invoice Assets invariants (TASK-791, desde 2026-05-30)

Toda invoice/boleta, evidencia de trabajo o documento de proveedor de un contractor se sube y adjunta vía el **uploader privado canónico** (`createPrivatePendingAsset` + `attachAssetToAggregate` + `greenhouse_core.assets`, TASK-721) — **NUNCA** un bucket, storage helper, `gs://`, signed URL ni URL externa como contrato primario. La asociación al dominio contractor vive en el ledger append-only `greenhouse_hr.contractor_invoice_assets`.

**Contexts canónicos** (en `src/types/assets.ts` `GreenhouseAssetContext`): `contractor_invoice_draft`/`contractor_invoice`, `contractor_work_evidence_draft`/`contractor_work_evidence`, `provider_invoice_draft`/`provider_invoice`, `provider_payout_statement`. Los 3 `*_draft` están en `DraftUploadContext` (uploadables vía `/api/assets/private`). Retention classes: `contractor_invoice`, `contractor_work_evidence` (nuevas); provider reusa `provider_supporting_doc`.

**Anchor (D-791-1)**: `contractor_invoice_assets` FK NOT NULL a `contractor_engagements.contractor_engagement_id` ON DELETE RESTRICT. `contractor_invoice_id` queda `TEXT NULL` sin FK (forward-compat: TASK-792 crea `contractor_invoices` + agrega la FK). El asset se adjunta vía `attachAssetToAggregate(ownerAggregateType=<final context>, ownerAggregateId=invoice_asset_id, client)` en la **misma tx** que el INSERT del link row (patrón TASK-721). Helper canónico: `attachContractorInvoiceAsset` (`src/lib/contractor-engagements/invoice-assets.ts`).

**Access (D-791-2)**: usa el patrón canónico de assets `hasRouteGroup`/`hasRoleCode` (NO nuevas capabilities `can()`). Contractor invoice/evidence → self (ownerMemberId==memberId) ∪ HR ∪ Finance ∪ admin. Provider invoice/payout → HR ∪ Finance ∪ admin (oculto al contractor por defecto — pueden contener fees/márgenes/otros trabajadores).

**MIME (D-791-4)**: `CONTEXT_EXTRA_MIME_TYPES` agrega `application/xml`/`text/xml`/`application/json` SOLO a `contractor_invoice_draft` + `provider_invoice_draft` (factura electrónica estructurada). El resto sigue pdf/jpeg/png/webp. ZIP/ejecutables fuera (V1).

**⚠️ Reglas duras**:

- **NUNCA** crear bucket/uploader/storage helper paralelo para invoices de contractor. Reusar `createPrivatePendingAsset`/`attachAssetToAggregate`.
- **NUNCA** reusar los contextos `contractor_invoice*`/`contractor_work_evidence*`/`provider_*` para recibos de nómina ni documentos de finiquito. Son retention classes + aggregates distintos.
- **NUNCA** mutar contextos ni retention classes de assets payroll existentes al agregar contractor (solo agregar).
- **NUNCA** adjuntar un `contractor_invoice_asset` a un `payroll_entry`, `final_settlement_document` ni aggregate de nómina. `resolveFinalAttachContext` solo resuelve contextos contractor/provider (retorna null para el resto → el helper rechaza con `asset_context_not_contractor`).
- **NUNCA** UPDATE/DELETE sobre `contractor_invoice_assets` (triggers append-only). Reemplazar un documento = subir nuevo asset + nueva fila; el histórico se preserva.
- **NUNCA** adjuntar el mismo asset dos veces al mismo engagement (UNIQUE `(contractor_engagement_id, asset_id)`).
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', ...)`.
- **SIEMPRE** que un consumer downstream (TASK-792 invoices, TASK-793 payables, TASK-796 UI) necesite adjuntar un soporte, pasar por `attachContractorInvoiceAsset`. Cuando TASK-792 cree `contractor_invoices`, agregar la FK `contractor_invoice_id` (additiva) + setearla en el helper.

**Reliability signal**: `hr.contractor_invoice_assets.broken_evidence` (kind=data_quality, moduleKey=identity, steady=0) — cuenta link rows cuyo `asset_id` apunta a un asset inexistente/eliminado. Mirror TASK-721.

**Spec canónica**: `docs/tasks/complete/TASK-791-contractor-invoice-assets-uploader-contexts.md`. Migración: `20260530203116605`. Patrones fuente: TASK-721 (evidence uploader + attach-in-tx + broken-evidence signal), TASK-790 (contractor engagement anchor), TASK-700/765 (append-only ledger + CHECK + triggers).

### Contractor Work Submissions invariants (TASK-792, desde 2026-05-30)

`greenhouse_hr.contractor_work_submissions` es la evidencia de trabajo del contractor (timesheet/milestone/deliverable/project_fee/expense/off_cycle_adjustment) con lifecycle de aprobación/disputa/rechazo. **La aprobación operacional NO es ejecución de pago** — una submission aprobada es INPUT de la readiness del payable (TASK-793), nunca alimenta payroll. Módulo: `src/lib/contractor-engagements/work-submissions/` (barrel pure-only; store server-only importado directo).

**State machine + CHECK + audit trio** (patrón TASK-700/765/790): `contractor_work_submissions` (CHECK enums + CHECK `status='approved' ⇒ gross_amount NOT NULL` + BEFORE UPDATE transition trigger) + append-only `contractor_work_submission_events` (anti-UPDATE/DELETE). Matriz: `draft→{submitted,cancelled}`, `submitted→{approved,disputed,rejected,cancelled}`, `disputed→{submitted,rejected,cancelled}`, `approved→{cancelled}`, `rejected`/`cancelled` terminales. Mirror TS: `assertValidWorkSubmissionTransition` (`work-submissions/state-machine.ts`).

**Evidencia (D-792-1)**: las submissions NO tienen tabla de evidencia propia — reusan el ledger TASK-791 `contractor_invoice_assets` vía la columna additiva `contractor_work_submission_id` (FK). `attachContractorInvoiceAsset` acepta `contractorWorkSubmissionId` opcional. Delivery refs (project/sprint/document) viven en `metadata_json` (refs canónicas, NUNCA texto libre como única evidencia).

**Readiness + dup guard (D-792-3)**: `listWorkSubmissionsReadyForPayable(engagementId)` retorna `status='approved' AND consumed_by_payable_id IS NULL`. `markContractorWorkSubmissionConsumed` (idempotente) la marca consumida — rechaza doble consumo. `consumed_by_payable_id` es `TEXT NULL` forward-compat (TASK-793 agrega la FK).

**Access (D-792-4)**: 2 capabilities least-privilege — `hr.contractor_work_submission` (read/create/update/manage: submit/editar-borrador/cancelar) + `hr.contractor_work_submission.review` (read/approve: approve/dispute/reject). Grants: HR route_group ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN. API `/api/hr/contractors/work-submissions` (GET/POST) + `[id]` (GET/PATCH action=update|submit|approve|dispute|reject|cancel).

**⚠️ Reglas duras**:

- **NUNCA** alimentar `payroll_entries`, `payroll_adjustments` ni crear `compensation_versions` desde una work submission. La submission aprobada es input de readiness del payable (TASK-793), NO de payroll.
- **NUNCA** tratar la aprobación de trabajo como ejecución de pago. El pago nace en payable → Finance (TASK-793).
- **NUNCA** aprobar una submission sin `gross_amount` (app guard `approve_requires_gross_amount` + DB CHECK). El monto se declara en create/draft.
- **NUNCA** disputar/rechazar sin `reason` (≥10 chars) — app guard + audit.
- **NUNCA** cancelar una submission ya consumida por un payable (`consumed_by_payable_id` NOT NULL).
- **NUNCA** UPDATE/DELETE sobre `contractor_work_submission_events` (triggers append-only).
- **NUNCA** transicionar fuera de la matriz canónica (trigger DB + `assertValidWorkSubmissionTransition`).
- **NUNCA** consumer downstream recomputa "qué submissions están listas" inline — usar `listWorkSubmissionsReadyForPayable`.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', ...)`.
- **SIEMPRE** que TASK-793 cree `contractor_payables`, agregar la FK `consumed_by_payable_id → contractor_payables` (additiva) + setearla vía `markContractorWorkSubmissionConsumed` dentro de la tx de creación del payable.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio.

**Reliability signal**: `hr.contractor_work_submission.review_overdue` (kind=drift, moduleKey=identity, steady=0) — submissions en submitted|disputed > 14d. **Outbox v1**: `workforce.contractor_work_submission.{submitted,approved,disputed,rejected,cancelled}` (aggregateType `contractor_work_submission`).

**Spec canónica**: `docs/tasks/complete/TASK-792-contractor-work-submissions-approval-dispute-flow.md`. Migración: `20260531000000000`. Patrones fuente: TASK-790 (engagement anchor + state machine trio), TASK-791 (evidence ledger reuse), TASK-700/765 (append-only audit + CHECK + triggers), TASK-873/935 (capability grant coverage).

### Contractor Payables → Finance bridge invariants (TASK-793, desde 2026-05-30)

`greenhouse_hr.contractor_payables` es la **obligación económica aprobada del contractor, PREVIA a Finance** (Workforce/HR → Finance). El payable listo genera UNA `payment_obligation` vía bridge reactivo. Finance sigue siendo owner de payment orders, banco y conciliación. Módulo: `src/lib/contractor-engagements/payables/` (barrel pure-only: types/state-machine/withholding/readiness; el store es server-only, importado directo). El payout del contractor es `economic_category='labor_cost_external'` — **NUNCA payroll dependiente**.

**State machine + CHECK + audit trio** (patrón TASK-700/765/790/792): `contractor_payables` (CHECK enums + CHECK `net_payable = gross_amount - withholding_amount` + CHECK `economic_category = 'labor_cost_external'` + BEFORE UPDATE transition trigger) + append-only `contractor_payable_events` (anti-UPDATE/DELETE). Matriz: `pending_readiness→{ready_for_finance,blocked,cancelled}`, `ready_for_finance→{obligation_created,blocked,cancelled}`, `obligation_created→{payment_order_created,cancelled}`, `payment_order_created→{paid,cancelled}`, `blocked→{pending_readiness,cancelled}`, `paid`/`cancelled` terminales. Mirror TS: `assertValidPayableTransition` (`payables/state-machine.ts`).

**Anchor + dup guard**: FK NOT NULL a `contractor_engagements` (RESTRICT) + FK opcional a `contractor_work_submissions`. `createContractorPayableFromSubmission` lockea la submission `approved ∧ consumed_by_payable_id IS NULL`, inserta el payable y setea `consumed_by_payable_id` **en la misma tx** (dup-guard: lock + DB UNIQUE partial `WHERE status<>'cancelled'`). El ALTER de TASK-793 cierra la FK que TASK-792 dejó NULL forward-compat. `createContractorPayableOffCycle` (reason ≥10) para ajustes/bonus sin submission.

**Withholding (D-793-8)**: `computeContractorWithholding` (pure) retiene SOLO honorarios CL bajo `taxComplianceOwner='greenhouse_policy'` con `taxWithholdingRateSnapshot` del engagement (TASK-790 — **NUNCA recomputa la tasa SII**); todo otro lane retiene 0 (provider/country engine maneja su tax local). `net = gross − withholding` enforced por CHECK DB.

**Readiness fail-closed**: `evaluatePayableReadiness` (pure, 7 gates) — source aprobado / invoice-asset presente cuando `requires_invoice` / net reconcilia / `obligationCurrency ∈ {CLP,USD}` / FX resuelto cuando `payment_currency ≠ currency` / payment-profile resuelto **o waiver gobernado** / provider-split presente cuando `payroll_via ∈ {deel,remote,oyster}`. `assessPayableReadiness` (server) resuelve los inputs (invoice via `listContractorInvoiceAssetsByEngagement`, FX via `getLatestStoredExchangeRatePair`) y alimenta el evaluador puro. `transitionPayableToReadyForFinance` → si OK `ready_for_finance` (+emite el evento que dispara el bridge); si no, persiste blockers + `blocked` + throw.

**Bridge (TASK-771 reactive pattern)**: projection `contractor_payable_finance_obligation` consume `workforce.contractor_payable.ready_for_finance`, **re-lee el payable de PG (NUNCA confía el payload)**, skip idempotente si no existe / no-ready / unsupported currency, crea UNA `payment_obligation` (`createPaymentObligation`, idempotente por su UNIQUE; `source_kind=contractor_payable`, `sourceRef=payableId`, `amount=net_payable`, `obligation_kind=provider_payroll`) y marca `obligation_created` (`markPayableObligationCreated`, no-op si ya linkeado al mismo id). `maxRetries=5`. ALTER `payment_obligations` source_kind `+contractor_payable` (additivo, shared Finance infra — solo agrega un valor al enum).

**Access**: capabilities `finance.contractor_payable` (read/create/manage) + `finance.contractor_payable.waive_payment_profile` (update, **admins-only**) + runtime grants (finance route_group ∪ FINANCE_ADMIN ∪ EFEONCE_ADMIN; waiver solo FINANCE_ADMIN ∪ EFEONCE_ADMIN) — grant-coverage test verde. API `/api/finance/contractor-payables` (GET list / POST create) + `[id]` (GET) + `[id]/{ready,cancel,waive-payment-profile}` (POST), gated por `can(tenant,…)` (el helper acepta el tenant context directo — NO existe `@/lib/entitlements/subject`).

**⚠️ Reglas duras** (no-regresión Payroll + canónicas):

- **NUNCA** escribir/mutar `payroll_entries`, `payroll_adjustments`, `compensation_versions`, `final_settlements` desde el payable ni desde el bridge. El payout contractor jamás entra como payroll dependiente.
- **NUNCA** sobrescribir `members.{payroll_via,contract_type,pay_regime}`. El payable usa `payroll_via`/`tax_compliance_owner` del engagement como input read-only.
- **NUNCA** aplicar deducciones Chile dependientes (AFP/Fonasa/AFC/SIS/IUSC) — solo retención SII versionada para honorarios CL.
- **NUNCA** crear el `payment_obligation` con `amount=gross`. SIEMPRE `amount=net_payable` (la retención ya se descontó; provider fees/FX spread son obligaciones separadas — TASK-795).
- **NUNCA** confiar el payload del evento en el bridge — re-leer el payable de PG por `contractorPayableId` (defensive re-read, TASK-771).
- **NUNCA** transicionar fuera de la matriz canónica (trigger DB + `assertValidPayableTransition`) ni UPDATE/DELETE sobre `contractor_payable_events`.
- **NUNCA** marcar `ready_for_finance` sin pasar el readiness fail-closed; el waiver de payment-profile requiere capability admin + reason ≥10.
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', …)`.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio (verde: 522 passed).
- **SIEMPRE** que emerja un mecanismo nuevo de payout contractor (provider fee, FX leg — TASK-795), modelarlo como obligación separada, NO mezclarlo en el `net_payable` del payable.

**Reliability** (moduleKey finance, rollup Finance Data Quality, steady=0): `finance.contractor_payable.ready_without_obligation` (lag, ready >30min sin `finance_obligation_id`) + `finance.contractor_payable.bridge_dead_letter` (dead_letter, reactive log `handler='contractor_payable_finance_obligation:…' AND result='dead-letter'`). **Outbox v1**: `workforce.contractor_payable.{created,ready_for_finance,obligation_created,blocked,cancelled}` (aggregateType `contractor_payable`).

**Spec canónica**: `docs/tasks/complete/TASK-793-contractor-payables-finance-obligations-bridge.md`. Migración: `20260531010000000`. Patrones fuente: TASK-790 (engagement anchor + trio), TASK-791 (invoice-asset readiness), TASK-792 (submission consume dup-guard), TASK-748/765 (payment_obligations + idempotencia), TASK-771 (reactive projection + re-read defensivo), TASK-873/935 (capability grant coverage).

### Chile Honorarios Compliance invariants (TASK-794, desde 2026-05-30)

`src/lib/contractor-engagements/chile-honorarios/` es la **capa de compliance Chile honorarios** sobre Contractor Engagements + Payables. **NO es dueña de la tasa SII**: la tasa vive en `getSiiRetentionRate` (payroll SSOT, `src/types/hr-contracts.ts`) y se expone a contractors vía `resolveHonorariosWithholdingPolicy` (TASK-790). El módulo reusa esas primitivas + el `computeContractorWithholding` (TASK-793) y agrega los invariantes honorarios. Barrel pure-only; `readiness.ts` server-only importado directo (TASK-827).

**Tasa SII oficial** (Ley 21.133 schedule gradual, verificado watchlist payroll-auditor): 2024=13.75%, 2025=14.5%, **2026=15.25%** (desde 2026-01-01), 2027=16%, 2028=17%. Vive en `SII_RETENTION_RATES` — **NUNCA tocar desde este dominio**.

**3 gates fail-closed** en `evaluatePayableReadiness` + `assessPayableReadiness`:
- `classification_risk_blocking` — **universal** (todos los lanes). Defensa payable-level que espeja el CHECK del engagement `active ⇒ classification_risk no bloqueante` (`isClassificationRiskBlocking`).
- `rut_unverified` — **honorarios only**. RUT chileno verificado vía person-legal-profile `honorarios_closure` (CL_RUT `verified`; sin dirección; fail-closed: lookup que falla = bloqueado).
- `honorarios_withholding_mismatch` — **honorarios only**. Recompute SII-only (`computeChileHonorariosPayout`) y bloquea si el `withholding`/`net` persistido difiere → atrapa cualquier deducción dependiente o tasa errónea.

**⚠️ Reglas duras (no-regresión payroll + canónicas)**:
- **NUNCA** romper el cálculo honorarios legacy de payroll (`src/lib/payroll/calculate-honorarios.ts`) ni mutar `SII_RETENTION_RATES` al converger hacia contractor payable. Cero cambio de números — gate `pnpm vitest run src/lib/payroll` bit-for-bit.
- **NUNCA** aplicar AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC/APV/gratificación legal a honorarios (ni payroll legacy ni contractor payable). Solo retención SII. El guard `assertNoDependentDeductions` + `DEPENDENT_DEDUCTION_KINDS` es el SSOT de lo prohibido.
- **NUNCA** re-implementar `gross * rate` para honorarios — `computeChileHonorariosPayout` delega a `computeContractorWithholding` (TASK-793 SSOT). El número del payable nace del path genérico (parity garantizada); el módulo honorarios lo **recompute en readiness** como defensa.
- **NUNCA** hardcodear la tasa SII inline. Versionada en `tax_withholding_policy_code` (`cl_honorarios_<year>_<rate>`) + `tax_withholding_rate_snapshot` (snapshot al start del engagement, TASK-790).
- **NUNCA** crear `final_settlements`/`final_settlement_documents` para honorarios — su cierre es `contractor_closure` (TASK-797), NUNCA finiquito.
- **NUNCA** migrar masivamente honorarios payroll legacy a contractor payables. Convergencia gradual por miembro; los pagos legacy no se rompen (cutover documentado en arch Delta 2026-05-30).
- **SIEMPRE** que un payable honorarios necesite "¿se puede pagar?", pasar por `assessPayableReadiness` (los 3 gates corren ahí, solo honorarios_cl salvo classification que es universal). Cero recompute inline en consumers.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` como gate al tocar este dominio.

**Reliability**: `hr.contractor_payable.honorarios_rut_unverified` (kind=data_quality, moduleKey=identity, steady=0) — honorarios_cl activos sin CL_RUT verificado (payable bloqueado). **Sin migración, sin capabilities/outbox nuevos** (reusa `finance.contractor_payable:manage` + evento `workforce.contractor_payable.blocked v1`).

**Spec canónica**: `docs/tasks/complete/TASK-794-chile-honorarios-compliance-sii-retention.md`. Arch Delta: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (2026-05-30). Patrones fuente: TASK-790 (tax-policy SSOT + classification-risk), TASK-793 (withholding + readiness fail-closed), TASK-784 (person-legal-profile readiness), TASK-758 (SII retention SSOT payroll), TASK-721/766/774 (VIEW/helper + reliability signal pattern).

### International Contractor Boundary invariants (TASK-795 Fase A, desde 2026-05-30)

Fase A de TASK-795 sobre Contractor Payables. Establece la **frontera tributaria** del contractor internacional/provider en el readiness fail-closed, **sin computar withholding** (eso es el motor `international_internal`, TASK-905/906/907). **Cero migración, cero capability, cero outbox, cero código payroll** (mismo patrón TASK-794). Fase B (provider settlement split + EOR beneficiary + reconciliación) **diferida** (minoría; el grueso de contractors son directos por `Efeonce Group SpA`).

**2 gates nuevos** en `evaluatePayableReadiness` + `assessPayableReadiness`:
- `tax_owner_review_required` — **universal, fail-closed**. Bloquea cuando `engagement.taxComplianceOwner ∈ {manual_review_required, country_engine_owned}`. El dominio contractor **NUNCA** aplica una tasa Chile→no-residente por su cuenta; bloquea y **escala** al withholding engine (TASK-905) o a revisión humana (D-795-4).
- `fx_policy_unresolved` — **solo cross-currency** (`fxNeeded`). Exige `fx_policy_code` declarado en el engagement; una tasa que existe (`fxSupported`) NO basta — el cambio debe ser auditable, no incidental (D-795-1). `payment_currency` ∈ {CLP,USD} ya lo refuerza `currency_unsupported`.

**Dimensión raíz canónica** (D-795-5): la **entidad contratante** vive en `contractor_engagements.legal_entity_organization_id` (NOT NULL, Operating Entity `is_operating_entity=TRUE`). El `tax_compliance_owner` (de ahí los gates) es **consecuencia** de la entidad contratante × país del contractor. Hoy la única es `Efeonce Group SpA` (Chile); roadmap multi-entidad (EEUU) → leer del campo, **NUNCA hardcodear "Efeonce/Chile"**.

**⚠️ Reglas duras**:
- **NUNCA** computar una retención Chile→no-residente desde el dominio contractor (790-798). Ese motor es `international_internal` (TASK-905/906/907). El gate `tax_owner_review_required` bloquea y escala; jamás aplica una tasa.
- **NUNCA** aplicar deducciones estatutarias Chile a un payable internacional/provider (ya garantizado: `computeContractorWithholding` retorna 0 para no-honorarios).
- **NUNCA** liquidar un payable cross-currency sin `fx_policy_code` declarado (gate `fx_policy_unresolved`) ni en moneda fuera de {CLP,USD} (gate `currency_unsupported`). Lo exótico → `manual_review`/off-rail.
- **NUNCA** mutar `members.{pay_regime,payroll_via,contract_type}` ni generar `payroll_entries` desde un payable contractor.
- **NUNCA** hardcodear "Efeonce/Chile" como el pagador; leer `legal_entity_organization_id`.
- **SIEMPRE** que un payable necesite "¿se puede pagar?", pasar por `assessPayableReadiness` (los gates corren ahí). Cero recompute inline.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` al tocar este dominio.

**Reliability** (moduleKey finance, steady=0): `finance.contractor_payable.tax_review_overdue` (drift, blocked por tax-owner >7d) + `finance.contractor_payable.fx_unresolved_overdue` (lag, blocked por FX >3d).

**Invariantes contables** (review `greenhouse-finance-accounting-operator`): la retención es **pasivo a remesar al SII** (F29/F50), no resta de costo (gasto = bruto); reconocimiento por **devengo** en el período del trabajo; clasificación P&L con categorías canónicas existentes (worker→`labor_cost_external`, provider fee→`vendor_cost_professional_services`, FX spread→`financial_cost`, remesa→`tax`). Detalle en el arch doc.

**Spec canónica**: `docs/tasks/complete/TASK-795-international-contractor-provider-boundary-fx-policy.md` (D-795-1..5). Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (Delta 2026-05-30). Fase B diferida → promovible a task derivada cuando exista un contractor real por plataforma/EOR. Patrones fuente: TASK-794 (readiness gate + signal pattern), TASK-790 (tax-policy + entidad contratante), TASK-893 (timestamp arithmetic gate).

### Contractor Self-Service Hub invariants (TASK-796, desde 2026-05-30)

Las dos superficies UI del dominio contractor (`/my/contractor` self-service + `/hr/contractors` workbench HR) consumen **una projection canónica server-only** que es el ÚNICO productor del view-model. La UI NUNCA re-deriva readiness, timeline, blockers ni KPIs desde rows de dominio. Los mockups (`src/views/greenhouse/contractors/mockup/**`) quedan intactos como referencia aprobada + escenarios GVC; el runtime vive en `src/views/greenhouse/contractors/*` (sin `/mockup`).

**Capa de datos canónica** (patrón TASK-835 sample-sprints / TASK-611 organization-workspace):

- `src/lib/contractor-engagements/projection-types.ts` — view-model puro `ContractorSelfServiceScenario` + `ContractorHrWorkbenchProjection` (NOT server-only; shared client+server). Mirror del mockup `ContractorScenario` para wiring de cambio mínimo.
- `self-service-scenario.ts` — mapper PURO (no IO, testeable). Deriva kind/readiness/timeline/blockers/KPIs/supportItems. **Filtra Finance-only** (provider_statement/payout_receipt/fx_receipt) — el contractor NUNCA ve provider statements/fees.
- `self-service-projection.ts` — orquestador server-only: `getActiveContractorEngagementForProfile(identityProfileId)` + composición via `withSourceTimeout` + degradación honesta + cache TTL 30s. El engagement se resuelve del `identityProfileId` de sesión (sin IDOR).
- `hr-workbench-projection.ts` — compone la cola HR de los 3 listers (engagements `pending_review` + submissions `submitted/disputed` + payables `blocked/ready/paid`) + signals derivados honestamente. Cache TTL 30s.
- `active-engagement-flag.ts` — EXISTS barato fail-safe para el flag JWT del nav (NO importar la projection desde auth.ts — pulls el grafo finance).

**API self-service canónica** (`requireMyTenantContext`, scope=own, member-scoped — el carril que faltaba; todo lo entregado en 790-795 era HR/Finance-gated):

- `GET /api/my/contractor` (capability `personal_workspace.contractor.read_self`) — projection propia.
- `POST /api/my/contractor/work-submissions` (capability `personal_workspace.contractor.submit_self`) — create+submit contra el engagement PROPIO (engagementId resuelto server-side, NUNCA del cliente).
- `POST /api/my/contractor/attach-asset` — adjunta boleta/evidencia via `attachContractorInvoiceAsset` (TASK-791); rechaza roles provider-only.
- HR workbench: `GET /api/hr/contractors/workbench` (reusa `hr.contractor_work_submission:read`); review por el PATCH existente `/api/hr/contractors/work-submissions/[id]` (TASK-792).

**Nav dinámico** (decisión operador 2026-05-30): el ítem `/my/contractor` aparece SOLO si el member tiene engagement activo → flag JWT `hasActiveContractorEngagement` resuelto una vez por sesión en `auth.ts` (mirror `supervisorAccess`, fail-safe) → session → `TenantContext` → `VerticalMenu`. `/hr/contractors` gated por viewCode `equipo.contratistas` (HR + Finance + Admin).

**⚠️ Reglas duras**:

- **NUNCA** modificar los mockups bajo `src/views/greenhouse/contractors/mockup/**` — son la referencia aprobada + escenarios GVC. El runtime vive en `src/views/greenhouse/contractors/*`.
- **NUNCA** re-derivar readiness/timeline/blockers/KPIs en la UI ni en el route handler. Toda derivación pasa por el mapper puro `self-service-scenario.ts`. La projection es el único productor.
- **NUNCA** exponer al contractor provider statements / fees / montos Finance-only. El mapper filtra los asset roles `provider_statement/payout_receipt/fx_receipt`; los blockers se mapean a responsable `Contractor` vs `Finance`.
- **NUNCA** copy que implique nómina dependiente / sueldo / finiquito / AFP / liquidación en las superficies contractor. Validar con `greenhouse-ux-writing`. La aprobación operacional NO ejecuta el pago.
- **NUNCA** aceptar un `contractorEngagementId` del cliente en el carril self-service. El engagement se resuelve server-side del `identityProfileId` de sesión (anti-IDOR).
- **NUNCA** importar `self-service-projection.ts` (ni su grafo) desde `auth.ts`. El flag JWT usa `active-engagement-flag.ts` (módulo mínimo fail-safe). Un error en la resolución del flag NUNCA debe romper auth (degrada a `false` → el ítem no aparece).
- **NUNCA** reconstruir Payment Profiles dentro de TASK-796. El handoff solo enlaza/lee estado de `/my/payment-profile` (TASK-753). Closure es visibility-only (cierre real = TASK-797).
- **NUNCA** agregar viewCode a `VIEW_REGISTRY` TS sin migración seed acompañante en el mismo PR (governance TASK-827) — aplica a `mi_ficha.mi_contratacion` + `equipo.contratistas` (migración `20260531030000000`).
- **SIEMPRE** que emerja una surface contractor nueva, consumir la projection canónica + reusar las primitivas; cero composición ad-hoc.

**Spec canónica**: `docs/tasks/complete/TASK-796-contractor-self-service-hub.md`. Doc funcional: `docs/documentation/hr/contratistas-self-service.md`. Manual: `docs/manual-de-uso/hr/contratistas.md`. Patrones fuente: TASK-835 (runtime projection), TASK-611 (projection + degraded honest), TASK-753 (`/api/my/*` member-scoped + payment profile handoff), TASK-791/792 (assets + work submissions), TASK-827 (View Registry Governance), TASK-727 (flag JWT por sesión).

### Contractor domain ↔ Finiquito/Offboarding non-regression boundary (hard rule, desde 2026-05-30)

El dominio Contractor Engagements (TASK-790→796 + la transición employee→contractor TASK-956) **NUNCA** debe romper el cálculo de finiquito (TASK-863) ni el flujo de offboarding (TASK-862/890/892) — son sistemas owned por Payroll/Workforce con mucho desarrollo invertido. La relación entre dominios es **read-only / append-only**: el contractor domain cierra la relación legal + abre la contractor + crea el engagement; **nunca toca el finiquito ni muta el offboarding**.

- **NUNCA** escribir/mutar `greenhouse_payroll.final_settlements` ni `final_settlement_documents` desde código del dominio contractor (engagements, payables, work submissions, transición). El finiquito es owner exclusivo de Payroll (TASK-863): el contractor domain no crea, modifica, anula ni regenera ningún finiquito, ni importa su calculator (`src/lib/payroll/final-settlement/**`).
- **NUNCA** gatear el cierre de una relación laboral (`endPersonLegalEntityRelationship`) a la ratificación del finiquito, ni forzar/disparar la ratificación notarial. Relación legal y finiquito están **desacoplados por diseño** (un offboarding `executed` NO cierra la relación; nadie llama `endPersonLegalEntityRelationship` desde offboarding). La transición cierra la relación canónicamente con el finiquito en cualquier estado.
- **NUNCA** modificar el state machine, lanes, work-queue ni la ejecución del offboarding de forma que altere comportamiento existente. El wiring del lane `relationship_transition` es **ADITIVO** (dispara el comando de transición + appendea el evento canónico `offboarding_case.relationship_transition_completed` que ya emite TASK-789). El offboarding case se lee `FOR UPDATE` pero **solo se le appendea evento** — nunca se re-ejecuta, re-clasifica ni se muta su `status`/`rule_lane`/`separation_type`. NUNCA re-ejecutar un case ya `executed`.
- **NUNCA** mutar `members.{contract_type,pay_regime,payroll_via}` desde la transición a contractor sin resolver primero el riesgo de doble-pago (reclasificar a `honorarios` puede re-incluir a la persona en el payroll honorarios legacy). El payout del contractor fluye SOLO por engagement → payable → Finance, jamás por `payroll_entries` ni finiquito. La exclusión de payroll post-salida la da el offboarding case `executed` (TASK-890), no `member.contract_type`.
- **SIEMPRE** correr como gate de cierre obligatorio de cualquier slice que toque el dominio contractor o su transición: `pnpm vitest run src/lib/payroll` (incluye toda la suite de finiquito) + `pnpm vitest run src/lib/workforce/offboarding`. Cualquier rojo en finiquito u offboarding es **regresión** (no "test ajeno") → NO cerrar.

**Spec canónica**: `docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md` (§Payroll & Offboarding Non-Regression Guardrails). Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (§Non-Negotiable Distinctions: contractor cierre ≠ finiquito).

### Employee→Contractor connected command invariants (TASK-956, desde 2026-05-30)

`transitionEmployeeToContractorEngagement(input)` (`src/lib/contractor-engagements/transition-from-employee.ts`) es el **único entry point canónico** para convertir a un colaborador en contractor con engagement. Cierra el seam huérfano: antes `transitionEmployeeToContractor` (TASK-789) tenía 0 callers y la creación de engagement vivía solo en seeds/tests. El comando compone, en **una sola transacción atómica**, el cierre de la relación `employee` + la apertura de la `contractor` + la creación del `ContractorEngagement` (TASK-790). Keyed en el offboarding case `executed` (decoupled de la ratificación del finiquito → cierra sin forzar notaría).

**⚠️ Reglas duras**:

- **NUNCA** convertir a un colaborador en contractor llamando `endPersonLegalEntityRelationship` + `createContractorEngagement` por separado desde un consumer. Toda transición employee→contractor con engagement pasa por `transitionEmployeeToContractorEngagement` — single source of truth atómico. Llamadas separadas dejan estado parcial (relación cerrada sin engagement, o engagement sin relación) que el signal `hr.contractor.transition_orphan` detecta.
- **NUNCA** componer la transición sin pasar `client` (el `PoolClient` de la tx) a los helpers dual-mode (`transitionEmployeeToContractor`, `createContractorEngagement`). El dual-mode (`client?: PoolClient` opcional, patrón TASK-765/771/872) es lo que garantiza atomicidad — sin él, un fallo a mitad deja estado parcial sin rollback.
- **NUNCA** mutar `member.contract_type`/`pay_regime`/`payroll_via`, el finiquito ni el status del offboarding desde el comando (ver §boundary arriba). El comando es read-only/append-only sobre esos dominios.
- **NUNCA** crear el engagement con un subtype derivado inline. Usar el mapper puro `mapRelationshipSubtypeToEngagementSubtype` (honorarios→honorarios_cl; contractor+CL→freelance; contractor+non-CL→international_contractor).
- **SIEMPRE** el comando debe ser idempotente/orphan-resume: re-ejecutar sobre un case ya transicionado retorna `already_complete`; si la relación contractor existe pero falta el engagement, lo crea (`engagement_created_on_existing_relationship`). NUNCA re-ejecutar un cierre de relación ya cerrado.
- **SIEMPRE** que emerja una transición desde otro contexto (provider/plataforma, EOR — TASK-955), reusar este comando extendiendo el mapper + el subtype, NO duplicar el wiring atómico.

**Reliability signal**: `hr.contractor.transition_orphan` (moduleKey identity, kind drift, steady=0) — relaciones contractor activas creadas por transición sin engagement asociado. **Spec**: `docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md`.

### Contractor ↔ Legacy Payroll double-rail exclusion + current work classification (TASK-957, desde 2026-05-30)

Una persona puede cobrar por **dos rieles de pago que no se hablan**: la nómina legacy honorarios (el motor rutea por `compensation_versions.contract_type='honorarios'` → `calculateHonorariosTotals` aplica retención SII) y el contractor payable nuevo (TASK-794, misma retención SII por el riel contractor → payable → Finance). Si ambos corren para la misma persona/período → **doble-pago + doble declaración F29 retenciones honorarios** (Efeonce remesa doble al SII + doble crédito tributario). Veredicto 3-skill (finance + payroll + arch): el **SSOT de "¿se paga por nómina interna?" es la existencia de un `ContractorEngagement` activo, NO `member.contract_type`**.

**Slice A — gate de exclusión + señal (SHIPPED)**:
- Módulo canónico `src/lib/payroll/contractor-exclusion/` (espejo de `exit-eligibility/`): `resolveContractorEngagementPayrollExclusion` / `resolveContractorExcludedMemberIds`. Post-filtro en `pgGetApplicableCompensationVersionsForPeriod` gateado por `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` (default OFF → parity bit-for-bit). Excluye del roster legacy a quien tiene engagement engaged (active/paused/ending). NO foldear dentro de `resolveExitEligibilityForMembers` (dimensión ortogonal).
- Señal `payroll.contractor.double_rail_overlap` (moduleKey payroll, kind drift, severity error si count>0, steady=0): detecta engagement no-terminal + compensation_version vigente. Corre **regardless del flag** (detector temprano).

**Slice B — clasificación laboral vigente (SHIPPED)**:
- Resolver canónico `resolveCurrentWorkClassification({profileId, memberContractType?})` (`src/lib/account-360/current-work-classification.ts`): lee la relación activa (`person_legal_entity_relationships`) + `ContractorEngagement` activo → `{kind, employmentContractType, contractorSubtype, classificationRiskStatus, displayLabel, source}`. Prioriza `employee` (conservador si ambas activas). Person 360 (`PersonProfileTab`, el tab vivo) muestra "Estado vigente" desde el resolver + "Contrato de empleo" (historia).

**⚠️ Reglas duras**:
- **NUNCA** mutar `member.contract_type` para reflejar una relación contractor. Es el tipo de contrato de **EMPLEO** — queda como historia cuando el empleo termina. `'honorarios'` rutearía al riel SII legacy → doble declaración F29. Un nuevo valor de enum = SSOT competidor del `relationship_subtype` del engagement + extiende la taxonomía gobernada `payroll.contract_taxonomy.invalid_tuple_drift` (3 tuplas) + rompe el boundary payroll↔contractor. PROHIBIDO.
- **NUNCA** branchear la clasificación laboral vigente inline en una surface. Pasa por `resolveCurrentWorkClassification`. El SSOT de estado vigente es `person_legal_entity_relationships` + `ContractorEngagement`; `member.contract_type` es derivación histórica de empleo.
- **NUNCA** filtrar "empleados activos" por `contract_type IN ('indefinido','plazo_fijo') AND active=TRUE` (incluiría por error a un contractor ex-empleado activo). Filtrar por relación de empleo activa. (Audit 2026-05-30: 0 callsites legacy.)
- **NUNCA** keyear el gate de exclusión por `contract_type='contractor'`. Keyea por engagement → los contractors internacionales legacy modelados como `member.contract_type='contractor'`+`payroll_via='deel'` SIN engagement (Andrés/Daniela/Melkin) NO son tocados (siguen su passthrough Deel).
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'payroll' | 'identity', ...)`.
- **SIEMPRE** que un contractor con engagement activo NO debe tener compensation_version vigente (su compensación vive en el engagement); cerrar la comp version al transicionar (canónicamente vía el `closeFuturePayrollEligibility` del offboarding o el script `scripts/payroll/close-contractor-orphan-comp-version-task957.ts`). La señal `double_rail_overlap` lo detecta.

**Nota toDateStr (Slice B)**: `getPersonHrContext` lanzaba `v.slice is not a function` para cualquier miembro con `hire_date` no-null (pg devuelve DATE como objeto Date; `toDateStr` asumía string) → toda la sección HR fallaba. Fix: `toDateStr` robusto a string|Date (espejo del `toDateString` de account-360). Bug latente pre-existente surfaceado por la feature (patrón TASK-765).

**Spec canónica**: `docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md`. Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30. Helpers: `resolveContractorExcludedMemberIds`, `resolveCurrentWorkClassification`. Señal: `payroll.contractor.double_rail_overlap`.

### Contractor Closure + Transition Controls invariants (TASK-797, desde 2026-06-01)

El cierre de un contractor es un **lifecycle PROPIO** — **NUNCA finiquito laboral**. Se modela sobre el state machine existente del engagement (`active/paused → ending → ended`, TASK-790) + columnas de metadata de cierre en `greenhouse_hr.contractor_engagements`. **NO** hay tabla/aggregate de cierre aparte (el cierre es 1:1 con el engagement; el audit vive en el append-only `contractor_engagement_events`). Módulo: `src/lib/contractor-engagements/closure/` (barrel pure-only: types + readiness; el store es server-only, importado directo).

**Readiness** (`closure/readiness.ts`, pure — mirror de `evaluatePayableReadiness` TASK-793): blockers **ACKNOWLEDGEABLE** (`open_work_submissions`, `open_payables`, `provider_termination_ref_missing`, `classification_risk_blocking`) — el operador puede cerrar de todas formas reconociéndolos con razón (override gobernado + auditado); `ready` exige cero blockers SIN reconocer. Advisory `access_handoff_reminder` (solo si hay portal member): informativo, **NUNCA bloquea** — el access offboarding es SEPARADO del cierre contractual.

**Comandos** (`closure/store.ts`, server-only): `assessContractorClosureReadiness` (resolver read-only), `initiateContractorClosure` (→ `ending`, winding-down), `executeContractorClosure` (→ `ended`, readiness-gated, atómico two-step active/paused→ending→ended en una tx), `setPostClosureInvoicesAllowed` (política post-cierre). API: `GET/POST /api/hr/contractors/[id]/closure` (capability `hr.contractor_engagement:manage`/`:read`).

**⚠️ Reglas duras (boundary payroll TASK-890 + canónicas)**:

- **NUNCA** disparar `greenhouse_payroll.final_settlements`/`final_settlement_documents` ni el flujo "Calcular finiquito" desde el cierre contractor. El cierre es `contractor_closure` (lifecycle propio), no finiquito dependiente. NUNCA usar causales DT ni documento de finiquito para contractor/honorarios.
- **NUNCA** alterar las lanes de `work_relationship_offboarding_cases` (`relationship_transition`/`internal_payroll`/`external_payroll`/`non_payroll`/`identity_only`) que consume el exit eligibility resolver (TASK-890), ni reactivar una relación dependiente cerrada al cerrar la contractor.
- **NUNCA** llevar un engagement a `ending`/`ended` por la transición genérica (`PATCH /api/hr/contractors/[id]` action `transition`). El cierre se canaliza SIEMPRE por el flujo dedicado (`POST .../closure`) que aplica readiness + metadata + eventos. El route handler rechaza targets `ending`/`ended` (`use_closure_flow`).
- **NUNCA** crear nuevas work submissions cuando el engagement está en `ending`/`ended`/`cancelled`. Guard canónico `isPostClosureLockedEngagementStatus` (distinto de `isTerminalEngagementStatus`, que excluye `ending`).
- **NUNCA** crear payables tras `ended` salvo `post_closure_invoices_allowed=TRUE` (política explícita auditada vía `setPostClosureInvoicesAllowed`); `cancelled` NUNCA permite payables. Durante `ending` (winding-down) SÍ se liquidan los payables de trabajo ya aprobado. Guard `assertPayableCreationAllowedForClosure` en ambos paths de create.
- **NUNCA** recomputar la readiness de cierre inline en consumers — pasar por `evaluateContractorClosureReadiness` (pure) o `assessContractorClosureReadiness` (server). Un blocker nuevo se agrega al enum `ContractorClosureBlockerCode` + al evaluador, no inline.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'contractor_closure_*' } })`.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` como gate de cierre (boundary finiquito + exit eligibility intactos).

**Eventos**: `workforce.contractor_engagement.closure_initiated v1` (nuevo, → ending) + `ended v1` reusado con payload enriquecido (`lifecycle:'closure_executed'`, `closureReason`, `postClosureInvoicesAllowed`). **Signal**: `hr.contractor_engagement.closed_with_open_payables` (data_quality, moduleKey=identity, steady=0) — defense-in-depth de cierres con payables abiertos por liquidar.

**Spec canónica**: `docs/tasks/in-progress/TASK-797-contractor-closure-transition-controls.md`. Arch: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-06-01. Migración: `20260601131829099`. Patrones fuente: TASK-790 (engagement state machine + audit trio), TASK-793 (readiness fail-closed evaluator), TASK-892 (closure-completeness aggregate), TASK-890 (boundary payroll).

### Compensation version tuple drift — payroll-safe reconcile + validated CHECK (TASK-958, desde 2026-05-31)

`members.contract_type` (CHECK 3-way `members_contract_payroll_tuple_check`, validado) y `compensation_versions.contract_type` pueden divergir. El CHECK `compensation_versions_contract_pay_regime_check` estaba **NOT VALID** → filas viejas con tuplas inconsistentes (`(indefinido, international)`) quedaban grandfathered. Caso fundacional: contractors internacionales Deel (Melkin/Andres/Daniela) con comp versions tempranas mal clasificadas como `indefinido`. TASK-958 cerró el drift class.

**⚠️ Reglas duras**:

- **NUNCA** reconciliar la tupla `(contract_type, pay_regime)` de una `compensation_version` sin **probar payroll-neutralidad before/after**: el primitivo canónico `scripts/payroll/reconcile-compensation-version-tuple.ts` computa `buildPayrollEntry` con la tupla actual vs target y solo aplica si los campos **monetarios** (`grossTotal`, `netTotalCalculated`, todas `chile*`, `siiRetentionAmount`) son byte-idénticos; si difieren, **aborta sin mutar**. Las etiquetas (`contractTypeSnapshot`, `payRegime`, `deelContractId`) cambian a propósito y se excluyen de la comparación.
- **NUNCA** asumir que tocar una `compensation_version` afecta sueldos ya pagados: los `payroll_entries` guardan sus **propios montos snapshot** (`gross_total`, `net_total`, `contract_type_snapshot`) en tabla separada — congelados. El reconcile UPDATEa solo `compensation_versions` → los pagos son intocables (verificado: payroll_entries byte-idénticos before/after).
- **NUNCA** reconciliar la tupla del member-side: el `member` es el SSOT canónico; se reconcilia la **comp version PARA matchear al member** (el primitivo aborta si el member tuple no es canónico). Para versiones históricas usar `--include-historical` (necesario para VALIDAR el CHECK, que verifica todas las filas).
- **SIEMPRE** que se valide un CHECK `NOT VALID` poblado, remediar TODOS los violadores (vigentes + históricos) primero; la migración incluye un DO block que aborta si quedan violadores (fuerza el orden remediación → VALIDATE) + un DO block post-VALIDATE que confirma `convalidated=true`.
- **NUNCA** crear un member `payroll_via='deel'` (`contractor`/`eor`) sin `deel_contract_id`. La señal `payroll.deel_member_without_contract_id` (moduleKey payroll, data_quality, steady=0) lo detecta; el valor real se backfillea operacionalmente desde Deel.

**Spec canónica**: `docs/tasks/complete/TASK-958-compensation-version-tuple-drift-remediation.md`. Script: `scripts/payroll/reconcile-compensation-version-tuple.ts` (dry-run default, `--apply`, `--include-historical`, assert payroll-neutral). Migración: `20260531105200124`. Señal: `payroll.deel_member_without_contract_id`.

### Contractor Remittance Advice invariants (TASK-960, desde 2026-05-31)

El **Comprobante de Pago / Remittance Advice** es una **proyección read-only del `ContractorPayable` pagado** (TASK-793) hacia el contractor — confirmación de pago de cuentas por pagar, jurisdiction-neutral, **NO laboral, NO documento tributario**. Módulo: `src/lib/contractor-engagements/remittance/`. Un solo `RemittancePresentation` struct alimenta dos renderers (visor MUI in-app + react-pdf descargable) → cero drift de contenido (patrón TASK-758). El struct shape ES el contrato (idéntico al mockup aprobado).

**Numeración `EO-RA-NNNNNN`** — correlativa **gapless**, **atómica** (advisory lock por issuer, mirror TASK-700) y **persistida una sola vez por payable** (idempotente — re-emitir muestra el mismo número). Registry append-only `greenhouse_hr.remittance_advice_numbers` + SQL fn `allocate_remittance_advice_number(issuer, payable)`. Serie scoped por `issuer_organization_id` (Operating Entity) → V1 una entidad, multi-entidad hereda serie-por-entidad gratis. Asignación **lazy en la primera emisión** (view/download); el read path de las listas solo LEE números (`getRemittanceAdviceNumbersForPayables`, batched) — null hasta primera emisión. Un hueco en la serie = comprobante anulado = red flag de auditoría.

**Helpers canónicos**:
- `allocateRemittanceAdviceNumber({issuerOrganizationId, contractorPayableId, client?})` / `getRemittanceAdviceNumber(payableId)` / `getRemittanceAdviceNumbersForPayables(payableIds)` — `remittance-number-allocator.ts`.
- `buildRemittanceAdvice(input, locale)` — PURE (`remittance-presenter.ts`). Mapea el data bag → struct; gross/withholding/net leídos **verbatim** del payable (cero recompute). Honest degrade para tax id / provider doc ausentes.
- `resolveRemittanceAdvice(payableId, {localeOverride?})` — server-only (`remittance-resolver.ts`). Gate `status='paid'`, issuer por id, beneficiario (name + tax masked) + locale (`identity_profiles.preferred_locale`) + número idempotente; surface `engagementProfileId` para anti-IDOR.
- `generateContractorRemittancePdf(presentation)` — react-pdf (`generate-contractor-remittance-pdf.tsx`, `REMITTANCE_TEMPLATE_VERSION`).
- `RemittanceAdviceViewer` + `RemittanceAdviceSection` — `src/components/greenhouse/contractors/`.

**Endpoints**: `GET /api/my/contractor/remittance/[payableId]` (own, anti-IDOR `engagementProfileId === session.identityProfileId`, 404 no 403) + `GET /api/hr/contractors/remittance/[payableId]` (tenant, `?locale` toggle). Ambos: JSON struct o `?format=pdf` (`?disposition=inline|attachment`). Capabilities reusadas: `personal_workspace.contractor.read_self` (own) + `hr.contractor_engagement` (tenant) — sin capability nueva.

**⚠️ Reglas duras**:
- **NUNCA** llamar al documento "liquidación", "recibo (de sueldo)" ni anclar el título a un régimen/jurisdicción (`honorarios`/`SII`/`Chile`). Canónico técnico `Remittance Advice`; label es-CL **"Comprobante de Pago"**. Título único global; solo el **breakdown** varía.
- **NUNCA** recomputar montos en el presenter ni en consumers. Se leen verbatim del `ContractorPayable` (SSOT TASK-793/794). La retención SII 15.25% (2026) viene de `engagement.taxWithholdingRateSnapshot` (TASK-794), NUNCA recalculada.
- **NUNCA** componer el número `EO-RA` en TS ni con `nextval` (no gapless). Toda allocación pasa por la SQL fn (advisory lock + idempotencia + CHECK shape). NUNCA reasignar/re-numerar un payable ya emitido.
- **NUNCA** renderear el documento desde dos fuentes. Visor MUI + PDF consumen el **mismo struct** del presenter. NUNCA tocar la dirección visual aprobada (un solo acento verde `#2E7D32` en el neto, título neutro, chip neutro, disclaimer caja neutra, logo Efeonce única marca, **sin firma**).
- **NUNCA** hardcodear el emisor ("Efeonce", RUT, domicilio). El issuer se resuelve desde `contractor_engagements.legal_entity_organization_id` → `getOrganizationIssuerIdentityById` (multi-entidad forward-compat).
- **NUNCA** servir el comprobante al contractor sin re-validar `engagementProfileId === session.identityProfileId` server-side. Mismatch/unpaid/missing → `404` (anti-oracle, nunca leak de existencia). Finance-only fields nunca visibles al contractor.
- **NUNCA** emitir para un payable no `paid`. El resolver gatea `status='paid'`.
- **NUNCA** tratar el documento como comprobante tributario del contractor. Referencia su BHE/invoice (`contractorInvoiceId`, TASK-791) pero no lo reemplaza; footer lo declara explícito.
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', { tags: { source: 'remittance_*' } })`.
- **NUNCA** mutar/borrar filas de `remittance_advice_numbers` (append-only). Un hueco = comprobante anulado.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio (EPIC-013 no-regresión).
- **V1**: línea FX informacional omitida (el payable tiene `fxPolicyCode`, no la tasa aplicada → honest degrade, nunca inventa FX). Follow-up: poblar `fx` cuando se capture la tasa aplicada.

**Spec canónica**: `docs/tasks/complete/TASK-960-contractor-remittance-advice.md`. Migración: `20260531131226949`. Doc funcional: `docs/documentation/hr/contratistas-comprobante-de-pago.md`. Manual: `docs/manual-de-uso/hr/contratistas-comprobante-de-pago.md`. Patrones fuente: TASK-758 (presenter struct → MUI + PDF), TASK-700 (allocator gapless atómico), TASK-796 (self-service hub + projection), TASK-784 (tax id masked), TASK-872 (anti-oracle 404).

### Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968, desde 2026-05-31)

El **monto acordado** del contractor (`contractor_engagements.rate_amount` + `rate_type` + `payment_cadence`) lo **FIJA HR desde las vistas admin** — el contractor NUNCA lo tipea, solo lo ve derivado. Es la separación de funciones (SoD) canónica del dominio: **HR fija ≠ contractor cobra ≠ Finance paga**. Tres superficies + un guardrail fail-closed lo enforzan; el mockup aprobado (`src/views/greenhouse/contractors/mockup/ContractorCompensationMockupView.tsx`) es la referencia visual vinculante.

**Las 3 superficies canónicas**:

| Superficie | Quién | Qué hace |
| --- | --- | --- |
| Admin compensation editor (`ContractorEngagementCompensationDrawer` + `CompensationPanel` en el workbench) | HR/Finance/admin (`hr.contractor_engagement:update`) | Fija `rateType`/`rateAmount`/`paymentCadence` vía `PATCH /api/hr/contractors/[id]` action `update`. **Moneda read-only** (se define al crear el engagement). |
| Contractor self-service (`ContractorSubmissionComposer` + `ContractorSelfServiceView`) | Contractor (own) | Ve el monto **derivado read-only** (`agreedRate`); NO existe campo libre de bruto. El bruto se deriva del rate acordado (fixed → rate; timesheet → qty × rate). Sin rate → submit deshabilitado + warning "contacta a HR". |
| Finance workbench (`ContractorPaymentsWorkbenchView` en `/finance/contractor-payments`, TASK-974) | Finance admin (`finance.contractor_payable.override_agreed_amount`) | Autoriza el override gobernado (reason ≥10, auditado) desde el detalle del payable en Finanzas. El panel HR `ContractorGuardrailPanel` quedó **read-only** (muestra el bloqueo + link a Finanzas) — la autorización NO vive en superficie HR (cierra la ambigüedad SoD, ver TASK-974). |

**Guardrail fail-closed** (`evaluatePayableReadiness`, gate `payment_exceeds_agreed_amount`):

- Flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (default OFF → parity bit-for-bit). ON: un payable cuyo `gross > agreedAmount` (tolerancia 0.01) se bloquea salvo override.
- **Solo aplica a rate types de PERÍODO** (`fixed`/`retainer`/`milestone`/`project` — `PERIOD_AGREED_RATE_TYPES`). Unit-rate (`hourly`/`daily`) = no-op (qty × rate excede legítimamente el rate unitario; comparar un solo gross contra un rate por-unidad no tiene sentido → `agreedAmount=null`).
- Override: `agreed_amount_override_reason` en el payable (espejo del waiver `payment_profile_waiver_reason` TASK-793); actor + timestamp viven en `contractor_payable_events` (append-only). Helper `overridePayableAgreedAmount` + endpoint `POST /api/finance/contractor-payables/[id]/override-agreed-amount`.

**⚠️ Reglas duras**:

- **NUNCA** permitir que el contractor defina/tipee/edite su monto acordado. Se fija SOLO desde admin (`hr.contractor_engagement:update`). El composer del contractor NO tiene campo libre de bruto — lo deriva read-only del rate acordado. Cualquier UI nueva contractor-facing que muestre el monto lo muestra read-only.
- **NUNCA** otorgar la capability de override (`finance.contractor_payable.override_agreed_amount`) al mismo rol/persona que fija el monto. Es maker-checker: capability **distinta** de `hr.contractor_engagement` (HR fija; Finance no lo supera sin override). Admin-only (FINANCE_ADMIN + EFEONCE_ADMIN).
- **NUNCA** aplicar el guardrail a un rate type unit-rate (`hourly`/`daily`) — `agreedAmount` resuelve a `null` para esos → gate no-op. Solo `PERIOD_AGREED_RATE_TYPES` carga un monto comparable.
- **NUNCA** quitar el flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` ni cambiar su default OFF sin staging shadow-compare verde + sign-off Finance. OFF = `assessPayableReadiness` no evalúa el gate (parity pre-TASK-968).
- **NUNCA** mutar `agreed_amount_override_reason` por SQL directo. Toda autorización pasa por `overridePayableAgreedAmount` (reason ≥10, audit append-only en `contractor_payable_events`).
- **NUNCA** derivar/recomputar el monto del período en la UI del contractor o en un consumer — el bruto derivado lo computa el composer desde `agreedRate` (fixed → rate; timesheet → qty × rate); la projection (`self-service-scenario.ts`) expone `agreedRate` read-only.
- **NUNCA** invocar `Sentry.captureException` directo en estos paths. Usar `captureWithDomain(err, 'finance' | 'identity', ...)`.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate de cierre al tocar este dominio (boundary EPIC-013/TASK-957: no romper finiquito ni nómina legacy).
- **SIEMPRE** que emerja un mecanismo nuevo de pago contractor que pueda exceder lo acordado, pasarlo por `evaluatePayableReadiness` (el gate corre ahí). Cero comparación inline en consumers.

**Reliability signals** (steady=0): `hr.contractor_engagement.rate_unset` (data_quality, moduleKey identity, warning>0 — engagements activos sin `rate_amount`, detecta "falta fijar el monto") + `finance.contractor_payable.exceeds_agreed_amount` (drift, moduleKey finance, warning>0 — payables bloqueados por el guardrail sin override).

**Spec canónica**: `docs/tasks/complete/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md`. Migración: `20260531160513123`. Mockup aprobado: `src/views/greenhouse/contractors/mockup/`. Patrones fuente: TASK-790 (engagement rate fields), TASK-793 (waiver/override + readiness fail-closed), TASK-796 (self-service projection + composer), TASK-758 (presenter read-only), TASK-873/935 (capability grant coverage + SoD distinct capability).

### Contractor Payable Bank Settlement invariants (TASK-977, desde 2026-05-31)

El **settlement al banco de un contractor payable** (el net que efectivamente se le paga) corre por el **mismo motor de liquidación compartido con nómina** (`recordPaymentForOrder` + `markPaymentOrderPaidAtomic`), extendido con una **rama aditiva detrás de flag**. Cierra el gap verificado donde el motor lanzaba `out_of_scope_v1` para todo lo que no fuera `payroll`/`employee_net_pay` → el contractor no se podía pagar al banco. El path de nómina queda **100% intacto**.

**El expense del contractor es la precondición del settlement** (igual que nómina). Se materializa **reactivamente** cuando el payable llega a `ready_for_finance` (espejo de `payroll-expense-reactive` al `exported`), NO en el settlement:

- Helper: `materializeContractorPayableExpense` (`src/lib/finance/contractor-payable-expense-reactive.ts`) → `createFinanceExpenseInPostgres` con `expense_type='contractor'`, `source_type='contractor_payable'`, `economic_category='labor_cost_external'`, `total_amount=GROSS`, `supplier_id=NULL`, anclado por la columna nueva `expenses.contractor_payable_id` (FK, mirror de `payroll_entry_id`).
- Proyección reactiva: `contractor_payable_expense_materialize` (sibling del bridge `contractor_payable_finance_obligation`, mismo evento `workforce.contractor_payable.ready_for_finance`). Idempotente (dedup por `contractor_payable_id`).
- El settlement (rama contractor) resuelve el expense por `contractor_payable_id` → `recordExpensePayment(amount=net, paymentSource='contractor_system')` → settlement_leg → bank debit. Fallback defensivo: materialize on-demand si la proyección reactiva lagueó.

**Accounting canónico (invariante TASK-795 "gasto = bruto, retención = pasivo"):** `expense.total_amount = bruto`; `expense_payment.amount = neto`; la retención SII (bruto−neto) es **pasivo a remesar al SII por separado (F29)** — **out of scope de TASK-977**. Consecuencia: para honorarios CL el expense queda `partial` hasta que exista el flujo de remesa SII; para withholding=0 queda `paid`.

**⚠️ Reglas duras**:

- **NUNCA** modificar la rama `payroll`/`employee_net_pay` del motor de settlement al extenderlo. La rama contractor es **aditiva** (predicate `isContractorSettlementLine` + resolver `resolveContractorExpenseId*`); el path de nómina debe quedar bit-for-bit. Gate de cierre: `pnpm vitest run src/lib/payroll` + `src/lib/finance/payment-orders` verde.
- **NUNCA** cambiar el **default en código** del flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (sigue siendo `false` en `contractor-settlement-flag.ts`; se activa por env var override). OFF = el contractor lanza `out_of_scope_v1` (parity pre-TASK-977). **Estado vigente desde 2026-06-01**: el flag está **ON** (`="true"`) en los tres runtimes por decisión explícita del operador (Julio) — Vercel staging (live), Vercel producción (live tras redeploy `greenhouse-mbk5eu9z5`), y ops-worker (default `true` en `deploy.sh`). El gate canónico documentado (staging shadow + finance sign-off formal) se aceptó condensado en la decisión del operador; impacto inmediato bajo (sólo el engagement EO-CENG-0001 existe, sin órdenes de pago contractor materializadas aún). Si se necesita **revertir**, set env `="false"` en Vercel (ambos envs) + `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED=false bash services/ops-worker/deploy.sh` + redeploy — NO tocar el default de código.
- **NUNCA** clasificar el expense del contractor como nómina. `economic_category='labor_cost_external'` (resolver Rule 0 `CONTRACTOR_PAYABLE_SOURCE`, source-driven, first-match — crítico: un contractor que también es member activo resolvería a `labor_cost_internal` por Rule 1 si la regla source no fuera primera).
- **NUNCA** deducir la retención SII del `total_amount` del expense. El gasto es el bruto; la retención es pasivo. `withholding_amount` se persiste solo para audit.
- **NUNCA** anclar el expense del contractor por `member_id` (el beneficiary puede ser `identity_profile`, no member). El ancla canónica es `contractor_payable_id`.
- **NUNCA** usar `paymentSource='payroll_system'` para un pago de contractor. Es `'contractor_system'` (CHECK widened, distinguible/queryable).
- **NUNCA** invocar `Sentry.captureException` directo en estos paths. Usar `captureWithDomain(err, 'finance', ...)`.
- **SIEMPRE** que emerja un mecanismo nuevo de payout (provider split/EOR multi-leg — TASK-795 Fase B/955), modelarlo como rama aditiva del settlement con su propio resolver, NO mezclarlo con la rama contractor ni con nómina.

**Reliability signal**: `finance.contractor_payable.expense_unmaterialized` (data_quality, moduleKey finance, warning>0, steady=0) — payables comprometidos (>30min) sin expense materializado = precondición del settlement rota (materializador dead-letter).

**Out of scope (follow-ups)**: remesa SII de la retención (el expense honorarios queda `partial`); regla de `due_date` cierre+5d + SLA (TASK-978); corrida mensual (TASK-979). **Pendiente para pagar al banco end-to-end**: flip del flag + la UI de Finanzas (TASK-974).

**Spec canónica**: `docs/tasks/complete/TASK-977-contractor-payable-bank-settlement.md`. Migraciones: `20260531184945430` (anchor) + `20260531185842386` (payment_source CHECK). Patrones fuente: TASK-765 (settlement engine + atomic), TASK-793 (bridge reactivo), TASK-768 (economic_category resolver), TASK-795 (gasto=bruto/retención=pasivo), TASK-411 (payroll expense materializer reactivo).

### Contractor Payment Due-Date + SLA invariants (TASK-978, desde 2026-05-31)

El `due_date` de un `contractor_payable` se **deriva** del compromiso de Efeonce de pagar dentro de los **primeros 5 días hábiles posteriores al cierre de mes** (aplica a colaboradores Y contractors). Helper canónico `resolveContractorPaymentDueDate` (`src/lib/contractor-engagements/payables/due-date.ts`, puro) = **cierre del mes operativo del payable + 5 días hábiles**.

- **NUNCA** computar días hábiles / ventana de cierre con lógica local. Toda aritmética de días hábiles pasa por `addBusinessDays(date, n)` en `src/lib/calendar/operational-calendar.ts` (SSOT canónico, mismo calendario que nómina — feriados Nager + overrides + timezone `America/Santiago`). NUNCA `EXTRACT(EPOCH FROM (date - date))` para días (gate TASK-893; usar `CURRENT_DATE - due_date` = integer).
- **NUNCA** sobreescribir un `due_date` provisto manualmente. La derivación aplica **solo** cuando `dueDate` no fue provisto (override manual gana). Aplicado en `createContractorPayableFromSubmission`/`OffCycle`.
- **NUNCA** reusar `getOperationalPayrollMonth`/`getLastBusinessDayOfMonth`/`addBusinessDays` con valores distintos a `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS` (=5) sin razón documentada. El ancla es el **mes operativo** del payable (el payable NO tiene `service_period`).
- **NUNCA** confundir el **SLA de pago NETO al contractor** (signal `finance.contractor_payable.payment_sla_overdue`, cierre+5 hábiles) con la **remesa de la retención SII** (honorarios CL) — esa es una obligación DISTINTA con su propio deadline **F29 (día 12 papel / 20 electrónico del mes siguiente)** y otro beneficiario (el SII). El SLA mide solo el neto al contractor; la remesa es out of scope (TASK-977 invariant).
- **NUNCA** convertir el signal en un gate. `finance.contractor_payable.payment_sla_overdue` (kind=lag, moduleKey finance, steady=0) es **observabilidad** — mide payables comprometidos (`ready_for_finance`/`obligation_created`/`payment_order_created`) no pagados con `due_date < CURRENT_DATE`. NUNCA bloquea la creación ni el pago del payable.
- **SIEMPRE** que emerja una regla de "N días hábiles desde el cierre" en otro dominio (e.g. alinear las obligaciones de nómina, que hoy usan `dueDate: periodEnd`), reusar `addBusinessDays` + `resolveContractorPaymentDueDate` o componer las mismas primitivas canónicas. NO duplicar la aritmética.

**Spec canónica**: `docs/tasks/complete/TASK-978-contractor-payment-due-date-sla.md`. Helper calendario: `addBusinessDays` en `operational-calendar.ts`. Signal: `src/lib/reliability/queries/contractor-payable-payment-sla-overdue.ts`. Sin migración/capability/outbox nuevos. Patrones fuente: TASK-571/766 (VIEW/helper + signal canónico), TASK-893 (date arithmetic gate), Payroll Operational Calendar (calendario SSOT).

### Monthly Contractor Payment Run invariants (TASK-979, desde 2026-05-31)

La **corrida mensual** barre los `payment_obligations` `provider_payroll` (source_kind `contractor_payable`) aún NO batcheados y los agrupa por **moneda** en payment orders `pending_approval`. **Prepara — NO paga.** Helper canónico `prepareMonthlyContractorPaymentRun` (`src/lib/contractor-engagements/payables/monthly-run.ts`, server-only): cutoff = cierre del mes operativo + 5 días hábiles (TASK-978), barre `due_date <= cutoff` (incluye overdue stranded), prioriza por `due_date ASC`.

- **NUNCA** la corrida paga, aprueba ni mueve una orden a `paid`. Crea órdenes en `pending_approval`; la aprobación doble-firma + el mark-paid son acciones humanas (SoD intacto, maker-checker).
- **NUNCA** mezclar monedas en una orden. Agrupar por moneda (regla V1 de `createPaymentOrderFromObligations`); processor/cuenta quedan null al sweep y los resuelve el operador al aprobar. `batchKind='supplier'` (label; contractors = proveedores externos).
- **NUNCA** crear la transición `obligation_created → payment_order_created` del payable fuera del helper canónico `markPayablePaymentOrderCreated` (`store.ts`, dual-mode `client?`). Es el **writer ÚNICO** de ese estado (la state machine lo exige antes de `paid`; nadie más lo escribe). Emite `workforce.contractor_payable.payment_order_created v1`.
- **NUNCA** confiar en una tabla para la idempotencia del barrido. La idempotencia REAL = filtro un-ordered (`LEFT JOIN payment_order_lines` line NULL) + status orderable (`generated`/`partially_paid`) + lock UNIQUE `payment_order_lines(obligation_id)` (dos corridas concurrentes: el perdedor aborta con `obligation_already_locked`). `greenhouse_sync.contractor_payment_runs` (append-only, triggers anti-UPDATE/DELETE, mirror TASK-900) es **auditoría + observabilidad**, NO el mecanismo de idempotencia.
- **NUNCA** ejecutar el sweep + creación de órdenes + transición de payables fuera de UNA transacción. Si algo falla, rollback total (cero órdenes parciales). El dry-run (`dryRun: true`) NO crea fila de corrida ni muta nada — es solo preview.
- **NUNCA** activar un schedule automático (Cloud Scheduler) en producción antes de que el flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (TASK-977) esté ON + staging validado. V1 es **manual** (endpoint + botón en `/finance/contractor-payments`); el schedule queda como follow-up detrás de `CONTRACTOR_MONTHLY_RUN_ENABLED` (no construido).
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'finance', { tags: { source: 'contractor_monthly_run' } })`.
- **NUNCA** confundir el signal de cobertura `finance.contractor_payable.unbatched_overdue` (obligación vencida SIN batchear → remediación: disparar la corrida) con `finance.contractor_payable.payment_sla_overdue` (TASK-978, más amplio → aprobar/pagar) ni con `ready_without_obligation` (TASK-793, tramo anterior). Son tres failure modes distintos con tres remediaciones distintas.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/finance/payment-orders src/lib/contractor-engagements` como gate de cierre — la corrida toca SOLO contractor payables (`labor_cost_external`), cero nómina/`contract_type`/finiquito.

La **remesa de la retención SII (F29)** NO es parte de la corrida — la corrida paga el NETO al contractor (invariante TASK-977/978).

**Spec canónica**: `docs/tasks/complete/TASK-979-monthly-contractor-payment-run.md`. Helper: `prepareMonthlyContractorPaymentRun` + `markPayablePaymentOrderCreated`. Endpoint: `POST /api/finance/contractor-payables/monthly-run` (capability `finance.contractor_payable:manage`, reuso). Migración: `20260531235624882` (tabla + CHECK `event_type`). Signal: `finance.contractor_payable.unbatched_overdue`. Patrones fuente: TASK-750 (createPaymentOrderFromObligations), TASK-793 (bridge), TASK-900 (run-tracking append-only), TASK-978 (due-date/SLA).

### Contractor Run Report ("Nómina de Contractors") invariants (TASK-980, desde 2026-05-31)

El reporte de período de pagos a contractors (PDF + Excel) es una **proyección read-only** del período — espejo del reporte de payroll (TASK-782) + infraestructura del comprobante individual (TASK-960). Reader canónico `buildContractorRunReport` (`run-report-reader.ts`, server-only) + generadores puros `generateContractorRunPdf` / `generateContractorRunExcel`.

- **NUNCA** recomputar bruto/retención/neto en el reporte. Se leen **verbatim** del payable (TASK-793/794 son dueños de los montos); la tasa SII viene del `taxWithholdingRateSnapshot` del engagement (frozen, TASK-790). El reporte no es un calculator.
- **NUNCA** clasificar el régimen del contractor inline. Pasar por el helper canónico compartido `deriveContractorRemittanceRegime` (`remittance/regime.ts`, single source of truth que consumen el comprobante TASK-960 Y el reporte). Los 4 régimenes (`honorarios_cl`/`international_withholding`/`provider_managed`/`cross_currency`) colapsan a 2 grupos contables vía `toContractorReportRegimeGroup` (`honorarios_cl` vs `international`).
- **NUNCA** mezclar en un subtotal la retención SII (honorarios → reconcilia F29), el neto comprometido y el neto pagado (`paid` → reconcilia banco). Son tres números mutuamente excluyentes. NUNCA sumar monedas distintas en un total (CLP/USD segmentados).
- **NUNCA** mostrar `$0` ambiguo para una columna que no aplica; usar `—` (distinguir "no aplica" de "cero"). Regla TASK-863 Semantic Column Invariants: cada fila = un contractor, cada columna = una dimensión; no mezclar montos de contractors distintos en una celda.
- **NUNCA** anclar el reporte al mes calendario de `due_date`. Ancla = **mes operativo** (`getOperationalPayrollMonth(due_date ?? created_at)`), consistente con TASK-978/979 (un payable de mayo-operativo vence a inicios de junio y se reporta bajo Mayo). Incluidos = comprometidos (`ready_for_finance`/`obligation_created`/`payment_order_created`/`paid`); excluidos = `blocked`/`pending_readiness` (visibles, fuera de subtotales); `cancelled` omitido.
- **NUNCA** asignar un número `EO-RA` desde el reporte. Se **lee** el ya asignado (`getRemittanceAdviceNumbersForPayables`, batch read) para los `paid`. La allocación es exclusiva del comprobante (TASK-960).
- **NUNCA** rollear un footer/eslogan propio. El PDF usa `EfeoncePdfFooter` (institucional, fixed, página X de Y) + `EfeonceSloganPdf` (Poppins, brand-zone) + Geist body (`ensurePdfFontsRegistered`) — idéntico al comprobante TASK-960. Acento verde solo en el neto.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'finance', { tags: { source: 'contractor_run_report_api' } })`.
- **SIEMPRE** que cambie el layout del PDF, bumpear `CONTRACTOR_RUN_REPORT_TEMPLATE_VERSION`. Gate de cierre: `pnpm vitest run src/lib/contractor-engagements src/lib/payroll` (no-regresión EPIC-013/957; el reporte toca solo contractor payables `labor_cost_external`, cero nómina/finiquito).

La **remesa de la retención SII (F29)** NO es el neto del reporte — el reporte paga (muestra) el NETO al contractor; la retención es pasivo a remesar al SII (invariante TASK-977/978). El reporte lo declara explícito en la nota contable.

**Spec canónica**: `docs/tasks/complete/TASK-980-contractor-payment-run-report-pdf-excel.md`. Reader: `run-report-reader.ts`. Generadores: `generate-contractor-run-{pdf,excel}.ts(x)`. Helper compartido: `remittance/regime.ts`. Endpoint: `GET /api/finance/contractor-payables/run-report?format=pdf|excel` (capability `finance.contractor_payable:read`, reuso). Patrones fuente: TASK-782 (reporte payroll), TASK-960/758 (presenter + montos verbatim + footer/slogan/Geist), TASK-863 (Semantic Column Invariants), TASK-978/979 (mes operativo).

### Contractor Payable Paid Lifecycle + Remittance Email invariants (TASK-981, desde 2026-06-01)

Cierra el **tramo final del lifecycle** del contractor payable y el **pegamento reactivo** que envía el comprobante TASK-960 al contractor por email. Antes de TASK-981 **ningún writer** transicionaba el payable a `paid` ni emitía un evento (mismo gap-class que TASK-979 cerró para `payment_order_created`); consecuencia colateral: el comprobante TASK-960 (gate `status='paid'`) era **inalcanzable**. Cadena canónica decoupled:

```text
finance.payment_order.paid (settlement TASK-765/977)
  → projection contractor-payable-paid-cascade: markPayablePaid por cada payable
    enlazado (payment_order_id, status='payment_order_created') → emite
    workforce.contractor_payable.paid v1
      → projection contractor-payable-paid-email: resolveRemittanceAdvice (gate paid,
        re-read PG) → generateContractorRemittancePdf → getProfileNotificationRecipient
        (canonical_email) → sendEmail('contractor_remittance_paid', adjunto PDF)
```

**Helpers/archivos canónicos**:
- `markPayablePaid(input, client?)` (`payables/store.ts`, dual-mode) — **writer ÚNICO** de `paid`; idempotente (no-op si ya `paid`, no re-emite); mirror de `markPayablePaymentOrderCreated`.
- `listPayableIdsByPaymentOrderForPaidCascade(orderId)` — reader del cascade (filtra `status='payment_order_created'` en SQL → no-op para órdenes no-contractor).
- `contractor-payable-paid-cascade` projection (trigger `finance.payment_order.paid`).
- `contractor-payable-paid-email` projection (trigger `workforce.contractor_payable.paid`).
- `ContractorRemittanceEmail.tsx` + emailType `contractor_remittance_paid` (transactional, registerTemplate + registerPreviewMeta).
- Evento `workforce.contractor_payable.paid v1` (event-catalog `contractorPayablePaid`).
- Migración: extiende CHECK `contractor_payable_events.event_type` con `paid` (additivo sobre TASK-979).

**⚠️ Reglas duras**:
- **NUNCA** transicionar un contractor payable a `paid` fuera de `markPayablePaid` (writer ÚNICO). Cualquier UPDATE `status='paid'` inline rompe la emisión del evento + el comprobante. La state machine ya permite `payment_order_created → paid` (TASK-793 forward-fix).
- **NUNCA** marcar el payable `paid` desde el settlement atómico (TASK-977 marca la **orden**, no el payable). El cascade reactivo es el puente decoupled `order paid → payable paid`.
- **NUNCA** confiar el payload del evento `.paid` en el email projection — re-leer vía `resolveRemittanceAdvice(payableId)` (gate `status='paid'`, SSOT de montos TASK-960). Mismo principio que el bridge TASK-793.
- **NUNCA** bloquear el batch reactivo por un comprobante sin destinatario o no resoluble: el email projection **skipea honesto** (capture + return), NO throw. Sólo un fallo de envío genuinamente transitorio throwea → retry → dead-letter.
- **NUNCA** recomputar montos para el email — el neto sale del row `emphasis` del `breakdown` de la presentation (verbatim TASK-960). El email NO es documento tributario.
- **NUNCA** `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', { tags: { source: 'contractor_payable_paid_email' | 'contractor_payable_paid_cascade' } })`.
- **SIEMPRE** idempotencia del email vía `sendEmail({ sourceEventId, sourceEntity })` (`wasEmailAlreadySent` dedup) — un retry del dispatcher nunca re-envía.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` como gate al tocar este dominio (boundary EPIC-013/957).

**Reliability signal**: `finance.contractor_remittance_email.dead_letter` (kind=dead_letter, moduleKey finance, steady=0) — payables `paid` cuyo email agotó retries (Resend down / render fail / recipient persistente). Skips honestos NO alertan acá.

**Spec canónica**: `docs/tasks/complete/TASK-981-contractor-payment-email-remittance.md`. Patrones fuente: TASK-979 (writer único dual-mode + gap-class), TASK-793 (bridge reactivo + re-read defensivo), TASK-960 (comprobante PDF + montos verbatim), TASK-759 (payslip-on-payment-paid email projection mold), TASK-771 (decoupling reactivo).

### Navigation Reachability Governance (TASK-982, desde 2026-06-01)

Toda ruta real bajo `src/app/(dashboard)/**/page.tsx` **debe ser alcanzable** por navegación. Cierra el bug class **"superficie huérfana"** (disparador: `/hr/contractors/new` onboarding TASK-976 sin menú ni botón → solo por URL). Es el **espejo navegacional de TASK-827** (ahí la señal `role_view_fallback_used` detecta drift `viewCode↔DB`; acá el gate detecta drift `ruta↔nav`).

**Contrato de alcanzabilidad** — una ruta `(dashboard)` es alcanzable si cumple UNA de:
- (a) es target de un link de navegación interno en `src/` (`href` / `router.push|replace` / `redirect|permanentRedirect`, literal string),
- (b) está declarada como **child route** en `src/lib/navigation/route-reachability-manifest.ts` (sub-acción reached desde un parent surface — header CTA, row action, inline link, tab), o
- (c) es ruta dinámica (contiene `[segment]`, reached por click de fila).
Mockups (`**/mockup/**`) excluidos.

**Patrón canónico header primary-action**: todo workbench/lista con ruta `…/new` (crear) expone esa ruta como **1 botón primary contained** ("Nuevo X", `tabler-plus`) en su header, gated por la capability de crear. Regla greenhouse-ux: 1 primary contained + N tonal (las acciones contextuales bajan a tonal). Patrón fuente: `ContractorAdminWorkbenchView` "Nuevo contractor" → `/hr/contractors/new`.

**Doctrina IA de dominio multi-superficie** (4 sistemas de nav, Rosenfeld): un workbench por (dominio × audiencia) anclado en la casa de la audiencia (NO un grupo de menú nuevo por dominio); header con acción primaria; tabs locales cuando el workbench tenga >1 vista; drawers por fila para acciones por-entidad; ⌘K como red supplemental. Reusable por TASK-797/798.

**⚠️ Reglas duras**:
- **NUNCA** crear un `page.tsx` bajo `(dashboard)` sin hacerlo alcanzable por (a)/(b)/(c). El gate `pnpm route-reachability-gate` lo detecta.
- **NUNCA** declarar una ruta-hija en el manifest sin `parent` + `via` + `reason`. El manifest es el SSOT tipado; el gate lo parsea por `route: '...'` (mantener ese formato literal).
- **NUNCA** centralizar un dominio multi-superficie en un grupo de menú nuevo. Organizar por audiencia/mental-model (regla dura IA). NUNCA por backend schema.
- **NUNCA** poner 2 primary contained en un header. La acción de crear es la primary; las contextuales (selection-dependent) bajan a tonal.
- **NUNCA** mover un item de menú a otra sección sin preservar su `canSeeView(viewCode)` filter (la capability NO cambia con el anclaje — caso TASK-982 Slice 1b: "Pagos a contractors" reubicado a Nómina conservando `finanzas.contractor_payables`).
- **SIEMPRE** que emerja un dominio nuevo con ruta `…/new` o `…/create`, agregar el header CTA + (si no es link estático) declararla en el manifest. **El gate corre en `--strict` desde TASK-983** (el backlog legacy de 19 se triagió a 0): un `page.tsx` huérfano nuevo **bloquea el build**.
- El gate reconoce 5 formas de alcanzabilidad (todas determinísticas, NUNCA heurística fuzzy `path:`/`to:`): (1) `href:`/`href=`/`push`/`replace`/`redirect` con string literal, (2) los mismos con **template literal** (`` `/ruta?x=${id}` `` → prefijo estático), (3) **`routes: ['/a','/b']`** arrays (registry data-driven, ej. `AdminCenterView` DomainCard), (4) child declarada en el manifest, (5) dinámica `[id]`.

**Gate**: `scripts/ci/route-reachability-gate.mjs` (`pnpm route-reachability-gate [--strict]`), corre en `ci.yml` warn mode. Manifest SSOT: `src/lib/navigation/route-reachability-manifest.ts`. Spec: `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md`. Skills de diseño: `info-architecture` + `greenhouse-ux`.

### Identity Bridge Cutover Protocol (TASK-877 follow-up, desde 2026-05-16)

Cuando se migra un bridge identity / lookup table de una store legacy (BQ direct, manual, `members.<columna>`) a una nueva store canónica (PG `identity_profile_source_links`, source_links, etc.), la PR que hace el cutover **debe** incluir 3 invariantes atómicos en el mismo PR. Sin esto, la cutover degrada silenciosamente y el bug class se manifiesta días después en consumers downstream (ICO, payroll, capacity, cost attribution).

**Bug class canónico (2026-05-16)**: TASK-877 cambió `loadNotionMemberMapPostgresFirst` para preferir PG sobre BQ. La condición `if (map.size > 0) return PG; else BQ fallback` aceptó un mapa parcial (2 entries de SCIM) como "PG está activa", silenciando BQ fallback que tenía 6 entries correctas. Resultado: cobertura del bridge cayó de 95%+ → 3.7% durante 2 días. Materializer ICO wipeaba metrics_by_member cada noche y reinsertaba vacío → bonificaciones OTD/RpA proyectadas colapsaron a $0 para todos los colaboradores.

**Invariantes obligatorios al hacer cutover**:

1. **Migration de backfill atómico en el MISMO PR**: una migration que copia los datos canónicos de la store legacy a la store nueva. Idempotente (UPDATE conditional sobre prev value), con anti pre-up-marker DO block que verifique post-INSERT count == expected. Pattern fuente: `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`.

2. **Reliability signal canónico de coverage drift**: detector que mide cobertura del bridge en tiempo real. Steady = baseline esperado (puede ser 60% si hay externos legítimos, o 100% si solo internal). Severity: ok / warning (caída significativa) / error (regresión sistémica). Pattern fuente: `src/lib/reliability/queries/identity-notion-bridge-coverage.ts`.

3. **NUNCA gate `if (result.size > 0) return primary`**: el contador "primary tiene algo" NO es válido para decidir "primary está completa". Patrones canónicos para resolver multi-source:
   - **Always UNION** ambas fuentes + dedup + log diff (más resiliente, más cost). Recomendado por default.
   - **Parity check**: shadow-read secondary en paralelo + assert `|primary - secondary| < tolerance` antes de aceptar primary.
   - **Coverage threshold**: `if (primary.size >= expected_minimum)` donde `expected_minimum` viene de un cálculo upstream (e.g. COUNT(*) en `members` activos).

**⚠️ Reglas duras**:

- **NUNCA** mergear cutover de un bridge identity (Notion↔member, HubSpot owner↔member, Azure OID↔member, similares) sin migration de backfill atómico en el mismo PR.
- **NUNCA** decidir "store A está activa" basándose en `if (result.size > 0)` cuando la respuesta correcta es "A está completa". Una store puede retornar 2 entries de 10 esperadas y eso NO es completa.
- **NUNCA** introducir un nuevo bridge resolver canónico sin reliability signal de coverage drift en el mismo PR.
- **NUNCA** sobrescribir bulk `members.notion_user_id` (o equivalentes) desde un script sin transacción atómica + verificación pre-state (UPDATE conditional sobre valor previo conocido).
- **NUNCA** asumir que un cutover funcionó porque "el resolver retorna algo". Verificar coverage % concreto en producción dentro de las primeras 24h post-merge.
- **SIEMPRE** que un bug afecte UNIFORMEMENTE a todos los entities downstream, sospechar primero del bridge / resolver / config compartida ANTES que del calculator per-entity. El bug del 2026-05-16 ocupó 4 horas de diagnóstico que hubieran sido 30 min si se hubiera empezado por el bridge.

**Spec canónica**: `src/lib/identity/reconciliation/notion-member-map.ts` (resolver canónico, post-TASK-877). Signal canónico: `identity.notion_bridge.coverage_drift` en `src/lib/reliability/queries/identity-notion-bridge-coverage.ts`. Migration fuente: `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`. Patrones fuente: TASK-742 (defense-in-depth 7-layer), TASK-720 (`instrumentCategoriesWithoutKpiRule` detector), TASK-571/766/774 (VIEW canónica + helper + signal).

### ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)

Patrón canonical para los 5 materializers ICO (`metrics_by_{member,project,sprint,organization,business_unit}`) y futuros downstream (Frame.io, HubSpot snapshots, Nubox financial materialization). Reemplaza el patrón legacy DELETE+INSERT por **MERGE incremental + freshness gate + tracking persistente + delta filter** — defense in depth contra el bug class TASK-877 follow-up donde upstream degraded destruyó 2 noches de data buena vía DELETE+INSERT sin warning.

**Pipeline canonical**:

```text
Cloud Scheduler ico-materialize-daily (3:15 AM Santiago, monthsBack=3)
  → POST /ico/materialize en ico-batch-worker Cloud Run
  → materializeMonthlySnapshots()
  → para cada materializer (member/project/sprint/organization/business_unit):
     runIcoMaterializerCycle({tableName, periodYear, periodMonth, runLegacy, runMerge, ...}):
       Capa 1: runUpstreamFreshnessGate()
         ├─ safe=false → skipIcoMaterializationRun + captureWithDomain('delivery', warning) + return 0
         └─ safe=true → procede
       Capa 2: beginIcoMaterializationRun (status='running') si useMerge
       Capa 2b: getLastSuccessfulMaterializationAt (delta cutoff lookup) si useMerge && useIncrementalDelta
       Capa 3: ejecutar runMerge(deltaCutoffIso) o runLegacyDeleteInsert
         ├─ throw → failIcoMaterializationRun + captureWithDomain('delivery', error) + re-throw
         └─ rowCount → continúa
       Capa 4: completeIcoMaterializationRun (status='succeeded' + rows_merged + notes)
```

**3 flags graduados default OFF** (cutover progresivo post staging shadow >= 7d):

- `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED` — invoca `runUpstreamFreshnessGate` antes de ejecutar
- `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED` — usa MERGE BQ atomic vs legacy DELETE+INSERT
- `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED` — filter `entity_last_edited >= deltaCutoff` (REQUIRES MERGE)

Defaults OFF garantiza zero behavioral change post-merge — el cron sigue con DELETE+INSERT bit-for-bit hasta que operador active explícitamente los flags.

**Helpers canonical**:

- `runUpstreamFreshnessGate({requireSignals?, blockingSeverity?}) → Promise<{safe, reason, blockingSignals}>` — `src/lib/ico-engine/materialize-guards.ts`. Default consume `identity.notion_bridge.coverage_drift`; `requireSignals` array es injectable. Degradación honest: signal que rechaza promise se filtra a null y NO bloquea.
- `runIcoMaterializerCycle(input)` — `src/lib/ico-engine/materialize-orchestrator.ts`. Orchestrator canonical de las 4 capas. Recibe callbacks `runLegacyDeleteInsert` + `runMerge(deltaCutoffIso)` per-entity + flag readers como inputs (test-friendly).
- `buildLegacyDeleteInsertSql` / `buildMergeSql` / `buildPostCountSql` — `src/lib/ico-engine/materialize-sql-builders.ts`. Builders desde `MaterializerSqlConfig` declarativa. Generan SQL canonical sin copy-paste cross-entity.
- `beginIcoMaterializationRun` / `completeIcoMaterializationRun` / `skipIcoMaterializationRun` / `failIcoMaterializationRun` / `getLastSuccessfulMaterializationAt` / `countRecentSkippedSafetyRuns` — `src/lib/ico-engine/materialize-tracking.ts`. CRUD canonical sobre `greenhouse_sync.ico_materialization_runs` (append-only, anti-UPDATE/DELETE triggers).

**MERGE pattern canonical** (per `buildMergeSql`):

```sql
MERGE INTO `<project>.ico_engine.<table>` AS t
USING (
  SELECT <key_cols>, period_year, period_month, <metric_cols>, materialized_at
  FROM (
    SELECT
      <key_select_sql>,
      @periodYear AS period_year,
      @periodMonth AS period_month,
      ${buildMetricSelectSQL()},
      MAX(te.last_edited_time) AS entity_last_edited,
      CURRENT_TIMESTAMP() AS materialized_at
    FROM ${buildDeliveryPeriodSourceSql(projectId)} te
    WHERE <where_clause_sql>
    GROUP BY <group_by_sql>
  )
  WHERE entity_last_edited >= TIMESTAMP(@deltaCutoff)  -- opcional, si delta enabled
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY <partition_by_sql>
    ORDER BY materialized_at DESC
  ) = 1
) AS s
ON t.<key> = s.<key> AND t.period_year = s.period_year AND t.period_month = s.period_month
WHEN MATCHED THEN UPDATE SET <metric_cols> = s.<metric_cols>, materialized_at = s.materialized_at
WHEN NOT MATCHED THEN INSERT (...) VALUES (...)
-- CRÍTICO: NO `WHEN NOT MATCHED BY SOURCE THEN DELETE` — preserva historicos cuando upstream parcial
```

**Tracking table canonical** `greenhouse_sync.ico_materialization_runs` (migration `20260518141020881`):

- `(table_name, period_year, period_month, started_at, completed_at, status, rows_merged, blocking_signals JSONB, notes)`
- CHECK status IN ('running','succeeded','skipped_safety','failed')
- CHECK skipped_safety REQUIERE blocking_signals NOT NULL
- INDEX `(table_name, period_year, period_month, started_at DESC)` para lookup O(log n) `getLastSuccessfulMaterializationAt`
- INDEX parcial `WHERE status='skipped_safety' ORDER BY started_at DESC` para reliability signal
- Anti-UPDATE trigger: solo permite transición `running → succeeded|failed|skipped_safety`; identity cols (id/table_name/period/started_at/created_at) immutables
- Anti-DELETE trigger: unconditionally rejected
- Ownership `greenhouse_ops`, GRANT SELECT/INSERT a `greenhouse_runtime`

**Reliability signal canonical** `delivery.ico_materializer.skipped_safety` (`src/lib/reliability/queries/ico-materializer-skipped-safety.ts`):

- kind=`drift`, moduleKey='delivery', subsystem rollup automatic via registry
- Severity: count=0 → ok | 1-5 → warning | >5 en 24h → error | query throws → unknown
- Steady state esperado = 0 (gate confía en upstream)
- Complementario a `identity.notion_bridge.coverage_drift` — cuando alerta es porque protegió data buena downstream

**⚠️ Reglas duras**:

- **NUNCA** ejecutar un DELETE+INSERT sobre una tabla materializada de ICO sin pasar por el orchestrator canonical `runIcoMaterializerCycle`. Si emerge un materializer downstream nuevo (Frame.io, HubSpot, etc.), reusa el orchestrator con su `MaterializerSqlConfig` declarativa.
- **NUNCA** filtrar a nivel TASK con `WHERE te.last_edited_time >= cutoff` en el aggregate source. **DEBE** filtrar a nivel BUCKET vía `MAX(te.last_edited_time) AS entity_last_edited` + outer WHERE. Filtrar tasks corrompe metrics (e.g. member con 10 tasks, 1 editada → aggregate de 1 task en lugar de 10).
- **NUNCA** incluir `WHEN NOT MATCHED BY SOURCE THEN DELETE` en el MERGE. La omisión es load-bearing: preserva data buena cuando upstream parcial. La diferencia entre destruir y proteger.
- **NUNCA** activar `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=true` sin `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true`. Code-side `assertMaterializerFlagCoherence` throw runtime — defense in depth.
- **NUNCA** abortar silenciosamente el materializer: si el gate skipea, emite `captureWithDomain(err, 'delivery', {source: 'ico_materializer_skipped_safety'})` + persiste `status='skipped_safety'` + `blocking_signals` JSONB en tracking table.
- **NUNCA** mutar/borrar `greenhouse_sync.ico_materialization_runs`. Anti-UPDATE / anti-DELETE triggers PG enforce. Para correcciones, INSERT nueva fila — append-only audit trail.
- **NUNCA** computar `last_materialization_at` derivado de `metrics_by_*.materialized_at` (BQ). Usar siempre PG tracking SSOT — BQ es eventually consistent, PG es source of truth governance.
- **NUNCA** invocar `Sentry.captureException` directo en code paths del materializer. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'ico_materializer_*', table: '<name>' } })` para rollup canonical en `/admin/operations`.
- **NUNCA** reescribir un materializer sin tests anti-regresión que simulen upstream degraded + verifiquen preservación de data previa (pattern `materialize-member-merge.test.ts`).
- **SIEMPRE** que emerja un materializer nuevo (Frame.io, HubSpot, Nubox, etc.), reusar `runIcoMaterializerCycle` + builders + tracking. Cero código nuevo de orquestación.
- **SIEMPRE** que emerja un signal upstream nuevo cuya regression podría corromper el materializer ICO, agregar su fetcher al `requireSignals` array del gate (sin refactor del orchestrator).

**Bug class fuente** (canonizado live 2026-05-18): TASK-877 follow-up 2026-05-14 → 2026-05-16. Bridge Notion→member degradado destruyó 2 noches consecutivas de data buena en `ico_engine.metrics_by_member` vía DELETE+INSERT. Operador vio TODOS los colaboradores con OTD/RpA proyectado en $0 por ~2 días aunque la nómina actual de Abril persistida en `payroll_entries` era correcta. Mitigación temporal commit `4fc8c0c4` (reliability signal `identity.notion_bridge.coverage_drift`) detecta el síntoma en horas vs 2 días — **pero no previene el bug, solo lo expone**. TASK-900 cierra la causa raíz arquitectónica.

**Spec canónica**: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (ADR). Files canónicos:

- Helpers: `src/lib/ico-engine/materialize-{guards,orchestrator,tracking,flags,sql-builders}.ts`
- Migration: `migrations/20260518141020881_ico-materializer-tracking.sql`
- Signal reader: `src/lib/reliability/queries/ico-materializer-skipped-safety.ts`
- Wire-up: `src/lib/reliability/get-reliability-overview.ts` (`icoMaterializerSkippedSafety` source)

### Nexa AI Signals append-only event log invariants (TASK-943, desde 2026-05-28)

`ico_engine.ai_signals` y `ico_engine.ai_prediction_log` son **observaciones históricas event-sourced** (hermanas de `task_status_transitions` TASK-908, outbox events TASK-773, audit logs TASK-742) — NO estado mutable. Una anomalía detectada el 5 de mayo "Daniela OTD bajó 30%" sigue siendo verdad sobre el 5 de mayo aunque el 20 ya no se observe; full-replace destruye evidencia operativa irrecuperable. Para sprints de 15 días, la evolución intra-mes ES la señal de gestión.

**Dicotomía canonical** (supersede el framing erróneo "estable vs volátil" del Delta TASK-942 2026-05-27 en la ADR — ver Delta 2026-05-28):

| Tipo de dato | Patrón canonical |
|---|---|
| Estado mutable (`metrics_by_*.otd_pct`) | **MERGE upsert por key** (TASK-900) |
| Observación histórica (`ai_signals`, `ai_prediction_log`, `task_status_transitions`, outbox, audit) | **Append-only event log** (TASK-943) |

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `DELETE FROM ai_signals` ni `DELETE FROM ai_prediction_log` (excepto cleanup operativo manual auditado con capability). Materializer canónico (`appendBigQuerySignalsForPeriod`, `appendPredictionLogs`) es INSERT-only.
- **SIEMPRE** leer "qué señales aplican AHORA al período X" via la VIEW canonical `ai_signals_current` (latest-per-`signal_id`) — NO la raw `ai_signals`. Idem `ai_prediction_log_current` para predictions. Raw tables se leen SOLO cuando se quiere historia evolutiva intra-período o cuando se usa `FOR SYSTEM_TIME AS OF` (BQ time travel no funciona sobre VIEWs).
- **SIEMPRE** el cron `/api/cron/ico-materialize` opera con `monthsBack=1` por default (solo período actual). Meses cerrados quedan inmutables. Operator override via `?monthsBack=N` (cap 1..6) para backfill manual auditado.
- **ÚNICA excepción mutable** del contract append-only: `ai_prediction_log.actual_value` + `actual_recorded_at` (+ `error_pct` derivado) vía `hydratePredictionActuals`. Esta función es la ÚNICA fuente legítima de UPDATE sobre `ai_prediction_log`, guarded por `WHERE actual_value IS NULL` (no double-overwrite) + `period < currentPeriod` (no toca in-progress). NUNCA agregar campos al UPDATE ni quitar los guards.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'ico_ai_*' } })` para rollup canonical en `/admin/operations`.
- **NUNCA** consumers downstream (Person 360 narrative, Home Nexa Insights, Agency ICO `aiLlm.totals`, Finance Nexa Insights, reliability signals) leen raw `ai_signals` directo. Toda lectura pasa por:
  - VIEW canonical `ai_signals_current` (default), o
  - PG serving `greenhouse_serving.ico_ai_signals` (proyectado desde la VIEW por `icoAiSignalsProjection`), o
  - PG history `greenhouse_serving.ico_ai_signal_enrichment_history` (append-only, narrativas enriquecidas — TASK-914).
- **SIEMPRE** que emerja una entidad nueva en ICO cuyo dato responde a "qué se vio cuando" (no "cuál es el valor actual"), nacer como append-only event log + VIEW current. NO usar replace semantics. La pregunta correcta es semántica del dato, no si "el set parece volátil entre runs".

**Signal de heartbeat canonical**: `nexa.insights.no_new_signals_in_24h` (kind=`lag`, severity warning >24h, error >48h, unknown sin signals, steady=ok). Reader `src/lib/reliability/queries/nexa-insights-no-new-signals.ts`. Cierra la pérdida de observabilidad implícita del DELETE+INSERT (un cron caído ya no "borra" la última corrida, queda silente).

**Bug class fuente** (canonizado live 2026-05-28 ISSUE-082 RCA): el delta TASK-942 (2026-05-27) modeló `ai_signals` como "set volátil → full-replace canonical". El operador identificó el error de framing: las anomalías son observaciones temporales con valor histórico, no estado mutable. Rolling 3 meses con DELETE+INSERT era doble error (borra evidencia ya capturada + recomputa lo que ya no cambia). El delta TASK-942 queda supersedido por el delta TASK-943 (2026-05-28) en la ADR. Cross-ref: `BUG-CLASS-004` en `~/.claude/skills/greenhouse-ico/reference/bug-class-catalog.md`.

**Spec canónica**: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` Delta 2026-05-28. Files canónicos:

- Writer: `src/lib/ico-engine/ai/materialize-ai-signals.ts` (`appendBigQuerySignalsForPeriod` + `appendPredictionLogs` + `hydratePredictionActuals` única excepción mutable).
- VIEW canonical: `src/lib/ico-engine/schema.ts` (`buildAiSignalsCurrentView`, `buildAiPredictionLogCurrentView`) — auto-provisioned por `ensureIcoEngineInfrastructure`.
- Cron: `src/app/api/cron/ico-materialize/route.ts` (default `monthsBack=1`).
- Consumers migrados (lectura via VIEW): `src/lib/reliability/queries/nexa-insights-freshness.ts`, `src/lib/sync/projections/ico-ai-signals.ts`, `src/lib/ico-engine/ai/llm-enrichment-worker.ts` (branch SYSTEM_TIME → raw, default → VIEW).
- Heartbeat signal: `src/lib/reliability/queries/nexa-insights-no-new-signals.ts` + wire-up en `get-reliability-overview.ts`.

Patrones fuente reusados: TASK-571/699/766/774 (VIEW + helper + reliability + lint), TASK-742 (defense in depth 7-layer), TASK-848 (state machine + tracking append-only), TASK-873 (capability granularity), TASK-720/768/777 (declarative config + lint rule pattern para futuros materializers).

### ICO Status Transition Foundation invariants (TASK-908, desde 2026-05-18)

Foundation canonical de Status Transition Tracking que sostiene el motor ICO completo de métricas basadas en eventos observables (RpA, FTR, Cycle Time canonical). Reemplaza el anti-patrón legacy de leer Notion property formulas (frágil — bug class TASK-877 follow-up).

**Cadena canonical de dependencias** (orden de ship):

```text
TASK-908 (foundation, esta task)                TASK-901 (RpA)                      TASK-909 (FTR)
─────────────────────────────                   ──────────────────                  ─────────────────
• Tabla task_status_transitions             →   • calculateRpa(taskId)          →   • calculateFtr(taskId)
• countCorrectionTransitions helper             ↳ delega a count... (zero lógica)   ↳ delega a calculateRpa===0
• calculateCycleTime helper
• CT SLO config helper
```

**Read API canonical (V1.0 shipped)**:

- `countCorrectionTransitions(input)` — `src/lib/notion-metrics/count-correction-transitions.ts`. Cuenta transiciones canonical `'Listo para revisión' → 'Cambios solicitados'` en `greenhouse_delivery.task_status_transitions`. Source mode discrimination canonical: `'canonical'` (tarea con rows en table) vs `'unavailable'` (tarea sin rows, pre-deployment). Consumido por `calculateRpa` (TASK-901) + transitively por `calculateFtr` (TASK-909).
- `calculateCycleTime(inputs)` — `src/lib/notion-metrics/calculate-cycle-time.ts`. Pure function canonical V1 con 4 decisiones (Delta 2026-05-17): inicio `'En curso'`, fin `completedAt`, feedback time SÍ cuenta, Bloqueado SE EXCLUYE (clamp intervals).
- `getSLOThreshold(taskType?)` + `isWithinSLO(cycleTimeDays, taskType?)` — `src/lib/notion-metrics/cycle-time-slo-config.ts`. V1 default uniforme 14.2 días (Engine doc §A.5.5). V2 calibración per tipo de pieza queda forward-compat.

**Tabla canonical** `greenhouse_delivery.task_status_transitions`:

- Append-only enforced por triggers PG anti-UPDATE/anti-DELETE (mirror pattern TASK-848 release_state_transitions + TASK-900 ico_materialization_runs)
- CHECK constraint enum cerrado canonical en `from_status` Y `to_status` — solo permite los 11 canonical V1 (`Sin empezar`, `Brief listo`, `Pendiente aprobación interna`, `En pausa`, `Bloqueado`, `En curso`, `Listo para revisión`, `Cambios solicitados`, `Aprobado`, `Cancelado`, `Archivado`)
- Webhook handler (TASK-912 futuro) normaliza legacy variants via `normalizeTaskStatus` (de `task-status-canonical.ts`, ya existente desde TASK-742 prep commit `1525e51c`) ANTES de insertar. La tabla NUNCA almacena strings legacy.
- Indexes: source_event_id UNIQUE partial (dedup canonical), task_lookup (hot path history per task DESC), to_status recent (queries "tareas en X estado"), correction_event_partial (TASK-901 calculateRpa + TASK-909 calculateFtr hot path)
- `source_quality TEXT` discrimina origen: `'canonical'` (event.timestamp webhook), `'proxy'` (polling lossy), `'backfilled'` (reconstruido históricamente)

**Reliability signal canonical**: `notion.correction_transitions.source_availability` (kind=`data_quality`, moduleKey=`delivery`). Detecta % tareas completadas 90d sin rows en table. Steady state post-deployment + backfill: < 10%. Pre-deployment esperado 100% (foundation aún sin webhook capturando).

**Capabilities canonical V1.0** (granular least-privilege):

- `cycle_time.compute.execute` (delivery / execute / all) — EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->
- `correction_transitions.compute.read` (delivery / read / all) — EFEONCE_ADMIN + HR_MANAGER <!-- spec original menciona DEVOPS_OPERATOR + HR_ADMIN — colapsado a EFEONCE_ADMIN + HR_MANAGER por TASK-935 (DEVOPS_OPERATOR no existe; HR_ADMIN no existe, el real es HR_MANAGER) -->

**Fix B.1 canonical (Slice 6)**: `EXCLUDED_FROM_METRICS_STATUSES = EXCLUDED_STATUSES ∪ BLOCKED_STATUSES`. Tareas en `Bloqueado` / `En pausa` / legacy `Detenido` ahora excluidas del denominador OTD/RpA/FTR via `CANONICAL_OPEN_TASK_SQL`. Pre-fix: contaminaban métricas. Post-fix: métricas suben ligeramente (ESPERADO).

**Fix B.2 canonical (Slice 7 — verify ya done)**: `buildTaskStatusToCsc()` consume `allVariantsForCanonical` + `allVariantsForGroup` que incluyen TODOS los aliases legacy Sky (`Tomado`, `En feedback`, `Pendiente`) + Efeonce (`Listo para diseñar`, `Pendiente Dir. Arte`, `Cambios Solicitados` capital S) → CSC mapping canonical universal funciona post-rename operador-side.

**⚠️ Reglas duras canonical**:

- **NUNCA** persistir row en `task_status_transitions` con string legacy. Webhook handler upstream DEBE normalizar via `normalizeTaskStatus` antes del INSERT. La table CHECK constraint enforce el canonical enum cerrado (11 V1).
- **NUNCA** persistir row sin `transitioned_at` populated. Es el timestamp canonical de la métrica downstream (Cycle Time, Lead Time, Time-in-Status). Webhook handler usa `event.timestamp` source-of-truth; polling fallback usa `last_edited_time` con `source_quality='proxy'`.
- **NUNCA** consumer downstream recomputa "número de correcciones" inline. Toda lógica de contar correciones vive en `countCorrectionTransitions` — single source of truth canonical. RpA (TASK-901) + FTR (TASK-909) delegan.
- **NUNCA** consumer downstream recomputa Cycle Time inline. Toda lógica vive en `calculateCycleTime` helper o `cycle_time_days` column materializada (post Slice 4 futuro de TASK-912).
- **NUNCA** modificar fórmula `cycle_time_days` SQL en `schema.ts:108-113` sin migration + backfill verified contra snapshot pre-cambio. Cambio afecta `metrics_by_*` downstream materializados.
- **NUNCA** ejecutar DELETE / UPDATE sobre `task_status_transitions` (anti-UPDATE/anti-DELETE triggers enforce). Para correcciones, INSERT row nueva con `source_quality='backfilled'`.
- **NUNCA** invocar `Sentry.captureException` directo. Use `captureWithDomain(err, 'delivery', { tags: { source: 'cycle_time_*' | 'correction_transitions_*' } })`.
- **SIEMPRE** que un consumer downstream necesite "una corrección observada", consumir `countCorrectionTransitions({taskSourceId, windowStart?, windowEnd?})`. NO leer Notion property `Correcciones` (anti-patrón legacy bug class TASK-877).
- **SIEMPRE** que el helper devuelva `sourceMode='unavailable'`, downstream consumer mapea a `dataStatus='unavailable'` + `value=null` (NO `value=0`). Distingue "no datos" vs "0 correcciones reales".
- **SIEMPRE** que emerja un nuevo cliente Notion con custom status names, **enforce canonical template L1** en Notion antes del onboarding. Single source of truth (`task-status-canonical.ts`) — NO agregar aliases custom-per-cliente.

**Deferred a TASK-912 follow-up** (requiere coordinación operador-side de Notion webhook subscription):

- Slice 2: webhook handler `notion-status-transitions` + HMAC validation + outbox event
- Slice 3: reactive consumer ops-worker que persiste transitions
- Slice 4: cycle_time_days BQ formula update (status → En curso start + descontar Bloqueado)
- Slice 5: métrica `cycle_time_slo_pct` materialization en metric-registry + dashboards
- Slice 9: backfill histórico opcional via Notion API page history

**Spec canonical**: `docs/architecture/metrics/{RPA,CYCLE_TIME,CT_SLO_PCT,FTR}_V1.md`. Migration: `migrations/20260518193001910_task-status-transitions-foundation.sql`. Helpers: `src/lib/notion-metrics/`. Signal reader: `src/lib/reliability/queries/notion-correction-transitions-source-availability.ts`. ADRs: `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md` + `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` + `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones B+C+D.

### Delivery Metrics Ownership Boundary invariants (TASK-901 + TASK-908 + TASK-909, desde 2026-05-17)

**Notion = Task Operating System. Greenhouse ICO Engine = motor exclusivo de cómputo de métricas.** Notion captura datos operativos primitivos (asignación, fechas, estado, tipo de entregable, archivos) y sirve como UI de gestión. Greenhouse computa TODAS las métricas (RpA, OTD, FTR, Cumplimiento, Cycle Time, Throughput, Pipeline Velocity, BCS, TTM, Iteration Velocity, futuras) desde eventos canonical y escribe los valores de vuelta a Notion vía bulk PATCH a propiedades `[GH] <métrica>` read-only.

**Bug class disparador** (TASK-877 follow-up 2026-05-16): 3,168 tareas Sky en 10 meses con `rpa=null` 100% — la fórmula `RpA` vivía como propiedad formula Notion editable por cualquier operador, sin git history, tests, code review ni observabilidad. El sync `notion-bq-sync` perdía el valor silenciosamente y nadie se enteraba hasta que un usuario reportó UI rota.

**Pipeline canonical**:

```text
Notion edit (operador) → webhook canonical (HMAC + echo-loop filter)
  → outbox event → ops-outbox-publish (TASK-773)
  → reactive consumer en ops-worker
  → ICO Engine canonical compute (calculate<Metric>(taskId) en Greenhouse code)
  → Cloud Tasks throttled (vs Notion rate limit 3 req/sec)
  → PATCH /v1/pages/bulk (Notion-Version 2026-02-01, up to 100 pages)
  → propiedades [GH] <métrica> updated en Notion
  → operador ve métrica live en UI Notion
```

Plus safety net nocturno: Cloud Run Job escanea tareas con `last_edited_time > checkpoint`, recomputa via mismo helper canonical, detecta drift Greenhouse vs Notion-stored, re-writeback.

**Semántica canonical de "corrección"** (TASK-909):

> **1 corrección = 1 transición `Listo para revisión → En Feedback`** en el status history canonical de la tarea.

No es ronda interna, no es comentario sin resolver, no es review del workflow team. Es específicamente "el cliente vio el entregable y pidió cambios", observado como evento de transición de estado capturado por TASK-908.

- `calculateRpaV2(inputs)` (TASK-901 Slice 1, SHIPPED) **delega a** `countCorrectionTransitions(taskId)` (TASK-908). NO lee propiedad Notion `Correcciones`.
- `calculateFtr(inputs)` (TASK-909 Slice 1, SHIPPED 2026-05-24) **delega a** `calculateRpaV2(inputs).value === 0 ? 'pass' : 'fail'`. NO duplica lógica.

Forward-compat Frame.io: cuando exista la integración, `calculateRpa` extiende inputs sin breaking change (combinar `correctionTransitionsCount` + `clientReviewOpen` + `workflowReviewOpen` + `openFrameComments` bajo policy a definir).

**Migración progresiva canonical** (strangler pattern, NO migramos todas las métricas de una vez):

| Fase | Métrica | Task | Status |
|---|---|---|---|
| Foundation | Status transition tracking + `countCorrectionTransitions` helper | TASK-908 | En diseño 2026-05-17 |
| V1 | RpA (writeback completo del pattern) | TASK-901 | En diseño 2026-05-17 |
| V2 | OTD writeback | TASK-902 (futuro) | Backlog |
| V3 | FTR writeback (delega a calculateRpa) | TASK-903 (futuro) | Backlog post TASK-909 |
| V4 | Cumplimiento writeback | TASK-904 (futuro) | Backlog |
| V5+ | Throughput, Cycle Time SLO%, Pipeline Velocity writebacks | TBD | Backlog |
| V6+ | BCS, TTM (AI-derived) | TASK-910 + futura TTM | Backlog |

Cada Vn ship con shadow mode mínimo 7 días verde antes de activar writeback. Después del writeback, las fórmulas Notion originales se mantienen en paralelo 7-14 días más para paridad cross.

**⚠️ Reglas duras canonical**:

- **NUNCA** introducir una propiedad formula nueva en Notion para calcular una métrica ICO. Toda métrica nueva nace en Greenhouse code (con tests + reliability signal + writeback).
- **NUNCA** modificar/editar/reemplazar una fórmula Notion existente de métrica ICO sin coordinar paralelamente con el helper canonical en Greenhouse — la métrica vive en código, Notion es solo display vía writeback.
- **NUNCA** computar una métrica ICO leyendo otra propiedad Notion como input cuando esa propiedad sea derivable de eventos canonical (transitions, fechas). Ejemplo prohibido: leer Notion `Correcciones` rollup para computar RpA — el RpA canonical viene de `countCorrectionTransitions(taskId)`.
- **NUNCA** consumer downstream (UI, dashboard, scorecard, report PDF, agente IA) recomputa una métrica ICO inline. Toda lectura pasa por la columna materializada (`v_tasks_enriched.<metric>`, `metrics_by_*.<metric>`) o por el helper canonical (`calculate<Metric>(taskId)`).
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de compute o writeback de métricas ICO. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'metric_compute' | 'metric_writeback', metric: '<name>' } })`.
- **NUNCA** activar writeback de una métrica nueva sin: (a) feature flag `NOTION_<METRIC>_WRITEBACK_ENABLED` default false, (b) shadow mode 7 días verde, (c) reliability signal `notion.metrics.shadow_paridad_<metric>` steady=0, (d) approval explícito en `Handoff.md` con allowlist de propiedades target Notion.
- **NUNCA** crear template Notion DB nuevo con formulas de métricas ICO embedded. Templates nuevos declaran solo propiedades primitivas + las propiedades `[GH] <métrica>` (read-only target del writeback). Templates legacy con formulas se mantienen como fallback histórico inactivo.
- **SIEMPRE** que un input nuevo emerja para una métrica (e.g. Frame.io integration aporta `client_change_round` real para RpA), extender el helper canonical en Greenhouse + agregar tests anti-regresión + NO crear fórmula Notion paralela.
- **SIEMPRE** que se cree una propiedad Notion `[GH] <métrica>`, documentar en el ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` + DECISIONS_INDEX + spec arquitectónica de la métrica que la propiedad es **read-only para operadores** (solo Greenhouse integration token escribe).
- **SIEMPRE** TASK-908 (status transition tracking) es prerequisito arquitectónico de cualquier migración Vn que dependa de eventos canonical observados (RpA, FTR, Cycle Time canonical, futuras). NO shipear Vn write-back path antes que TASK-908 Slices 0-3 estén verde.

**Helpers canonical**:

- `countCorrectionTransitions(taskId) → number` — en TASK-908 foundation, lee `greenhouse_delivery.task_status_transitions`
- `calculateCycleTime(taskId) → CycleTimeResult` — en TASK-908, lee transitions + descuenta Bloqueado
- `calculateRpaV2(inputs) → RpaV2Result` — `src/lib/notion-metrics/calculate-rpa-v2.ts` (TASK-901 Slice 1 SHIPPED, estrangulador RpA V2), delega a `countCorrectionTransitions`
- `calculateFtr(inputs) → FtrResult` — `src/lib/notion-metrics/calculate-ftr.ts` (TASK-909 Slice 1 SHIPPED 2026-05-24), delegación pura a `calculateRpaV2` (`FTR = RpA.value === 0 ? 'pass' : 'fail'`, `ftr_v1.0`). Lint rule `greenhouse/no-inline-ftr-calculation` (warn) bloquea recompute inline del veredicto. NO duplica lógica; cuando Frame.io shippee se extiende `calculateRpaV2` y FTR se beneficia automático

**Spec canónica**: `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (ADR canonical). Cross-refs: `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones F + G; `docs/architecture/Greenhouse_ICO_Engine_v1.md` (conceptual spec, drift por resolver post-TASK-908/909/901). Patrones fuente: TASK-742 (defense-in-depth 7-layer), TASK-773 (outbox publisher canonical), TASK-771 (decoupling write paths via outbox), TASK-706 (HMAC webhook ingestion), TASK-720 (TS-only declarative reader pattern).

### ICO Metrics Progressive Migration invariants (TASK-901 + TASK-908 + TASK-910, desde 2026-05-17)

La migración del compute canonical de las 14 métricas ICO (RpA, FTR, OTD, Cumplimiento, Cycle Time, CT Variance, CT SLO%, Throughput, Pipeline Velocity, CSC Distribution, Stuck Assets, Stuck %, OCF + 3 narrative-level deferred V2: BCS/TTM/Iteration Velocity) **NO es big-bang**. Es strangler pattern obligatorio con stop-gates canonical, demo teamspace pre-prod, recovery primitives explícitas, backward compatibility 90+ días.

**Bug class motivador**: TASK-877 follow-up (3,168 tareas Sky con `rpa=null` 10 meses, nómina Sky proyectada perdía bonus RpA silenciosamente). Big-bang × 14 métricas × N meses = riesgo inaceptable.

**Timeline canonical**: 12-14 meses end-to-end para 13 métricas operacionales. **NO acelerar**.

**Demo teamspace canonical** (TASK-910) ya creado live 2026-05-17:

| Asset | Name | Page ID | Data Source ID |
|---|---|---|---|
| Teamspace | `Demo Greenhouse` | `36339c2f-efe7-814c-a0f5-0042863dbb5a` | N/A |
| Tareas | `Tareas` | `36339c2f-efe7-80e2-9109-e7e9e41b36e4` | `36339c2f-efe7-81a6-980c-000b0056bba8` |
| Proyectos | `Proyectos` | `36339c2f-efe7-800e-9bba-c5c1661dd242` | `36339c2f-efe7-8116-8c15-000be81c5538` |
| Sprints | `Sprints ` (con space trailing) | `36339c2f-efe7-803c-a94a-e52bc41c8e77` | `36339c2f-efe7-81cc-8f2f-000b112ee87c` |

IDs distintos vs productivos (Efeonce DS `5126d7d8-...`, Sky DS `23039c2f-...`) — cero overlap, cero risk cross-contamination.

**⚠️ Reglas duras canonical (8 stop-gates obligatorios per flip de writeback)**:

- **NUNCA** flip writeback de métrica ICO sin pasar por los 8 stop-gates del ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §3. Falta cualquiera → NO flip. No "casi listo":
  1. Foundation completa (TASK-908 Slices 0-3.5 + backfill histórico verde)
  2. Demo teamspace pre-prod (TASK-910 verde 4 semanas runtime end-to-end)
  3. Shadow mode prod verde 30d bonus / 7d operational
  4. Pilot scope ≤ 1 cliente (Efeonce primero, Sky después de Efeonce verde 30d)
  5. HR/Finance written sign-off (bonus metrics solamente: RpA + OTD)
  6. Snapshot pre-flip BQ restorable <1h
  7. Kill switch verificado staging <5min revert
  8. Runbook operativo + cliente sign-off (cliente externo Sky vía QBR)
- **NUNCA** flip global directo cross-cliente. SIEMPRE pilot Efeonce primero, después Sky.
- **NUNCA** borrar formula Notion legacy durante la migración. Mínimo 90 días coexistencia post-flip stable.
- **NUNCA** computar bonus para demo members. `fetchKpisForPeriod` filtra `tenant_type='demo'` + helpers bonus tienen pre-check `if (member?.tenantType === 'demo') return {amount: 0, qualifies: false}`. Defense in depth dual. Demo NUNCA toca payroll real.
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`. Tabla separada `task_status_transitions_demo` enforced por reactive consumer demo (filtra `metadata.demo_mode=true`).
- **NUNCA** compartir webhook secret HMAC entre prod y demo. Secrets separados en GCP Secret Manager (`notion-webhook-signing-secret-efeonce` vs `notion-webhook-signing-secret-demo`).
- **NUNCA** permitir acceso de cliente externo (Sky) al teamspace demo. Solo equipo interno Greenhouse + HR + Delivery interno.
- **NUNCA** desincronizar schema del demo con el template productivo. Cuando Efeonce template agrega status option o property nueva, el demo se actualiza en el mismo PR.
- **NUNCA** archivar el demo durante la migración (12-14 meses). Demo es load-bearing — sin él, los siguientes flips de Fase 2-5 pierden el gate canonical de testing pre-prod.
- **NUNCA** acelerar timeline canonical "porque va bien". 12-14 meses es el contrato canonical. Acelerar reintroduce risk class TASK-877 follow-up.
- **NUNCA** ignorar reliability signal `notion.metrics.shadow_paridad_<metric>` con count > 0. Drift sostenido pre-flip = NO flip; post-flip = rollback.
- **NUNCA** flip nuevo si hay rollback de cualquier métrica últimos 30 días. Estabilizar antes de avanzar.
- **NUNCA** flip OTD% antes de RpA stable V1.0 (90 días post-Sky verde). Diversificar risk.
- **NUNCA** flip métrica narrative-level Revenue Enabled (BCS, TTM, Iteration Velocity) sin Frame.io + ad platforms integration. V1 mostly proxy honesto es OK.
- **NUNCA** ejecutar rollback parcial (e.g. solo para member X). Rollback es per-cliente vía feature flag — granularidad menor no soportada V1.
- **NUNCA** confundir IDs del demo con IDs de Efeonce/Sky productivos. Demo teamspace ID = `36339c2f-...4c-a0f5-0042863dbb5a`, prefix consistente `36339c2f-...` en todos los assets demo. Productivos tienen prefixes distintos (Efeonce `5126d7d8-...` Tasks DS; Sky `23039c2f-...` Tasks DS).
- **SIEMPRE** que emerja bug class durante pilot Efeonce, halt migration completa + RCA documentada antes de retry.
- **SIEMPRE** snapshot BQ pre-flip persistido + restorable <1h antes de cualquier flip.
- **SIEMPRE** HR reconciliation bonus mes 1 post-flip antes de declarar pilot pass.
- **SIEMPRE** runbook canonical publicado per métrica antes del flip.

**Spec canónica**: `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (ADR — 8 stop-gates + demo gate + 6 fases ramp + recovery primitives). Demo teamspace governance: `docs/tasks/to-do/TASK-910-notion-demo-teamspace-migration-sandbox.md` §Detailed Spec.

### Notion Demo Teamspace Sandbox invariants (TASK-910, desde 2026-05-19)

Setup canonical Greenhouse-side del demo teamspace `Demo Greenhouse` (Notion `36339c2f-efe7-814c-a0f5-0042863dbb5a`) creado live 2026-05-17 por operador. Gate canonical pre-Fase 1 del ADR Progressive Migration. Demo NUNCA afecta colaboradores reales en KPIs, bonus, payroll, ni dashboards productivos.

**Defense in depth canonical de 9 capas**:

1. **Tabla físicamente separada** `greenhouse_delivery.task_status_transitions_demo` (CHECK `workspace_id='demo'` + triggers anti-UPDATE/anti-DELETE — shipped migration `20260519120713456`)
2. **Discriminator canonical** `members.is_demo BOOLEAN NOT NULL DEFAULT FALSE` con index parcial
3. **Webhook dedicated** `/api/webhooks/notion-tasks-demo` + HMAC secret separado `NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF` (GCP `notion-webhook-signing-secret-demo`)
4. **Sync legacy NO procesa demo** — `space_notion_sources.sync_enabled = FALSE` para demo space (notion-bq-sync legacy excluye)
5. **Helper `isDemoMember` strict** `=== true` canonical (anti-coersion contra truthy values)
6. **Filter SQL canonical** en `fetchKpisForPeriod`: `filterOutDemoMembers()` excluye demo del payroll input ANTES de BQ query
7. **Pre-check helpers** `calculateRpaBonusForMember` + `calculateOtdBonusForMember` (defense in depth dual con wrappers canonical)
8. **Reactive consumer filter** `payload.metadata.demo_mode === true` (strict, anti-coersion) — demo events solo entran a tabla demo
9. **Reliability signal `payroll.bonus.demo_member_contamination`** (steady=0, ERROR canonical si > 0 — NUNCA debe pasar)

**Capabilities canonical V1.0**:

- `notion.metrics.demo.execute` (module=admin, scope=tenant) — EFEONCE_ADMIN
- `notion.metrics.demo.read` (module=admin, scope=tenant) — EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS

**6 reliability signals canonical** bajo subsystem rollup `delivery` (5) + `payroll` (1 critical):

- `notion.metrics.shadow_paridad_rpa_demo` (drift)
- `notion.metrics.echo_loop_detected_demo` (drift, steady=0)
- `notion.metrics.webhook_signature_failures_demo` (drift, steady=0)
- `notion.metrics.writeback_dead_letter_demo` (drift, deferred TASK-913 V1.1)
- `notion.metrics.demo_teamspace_drift` (drift, schema vs canonical V1)
- `payroll.bonus.demo_member_contamination` (drift, **ERROR canonical si > 0**)

**⚠️ Reglas duras canonical**:

- **NUNCA** computar bonus para demo members. Filter SQL en `fetchKpisForPeriod` + pre-check en `guardDemoMemberBonus` wrappers garantizan defense in depth dual.
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`. Físicamente separadas — CHECK constraint `workspace_id='demo'` rechaza INSERT cross-tenant.
- **NUNCA** compartir webhook HMAC secret entre prod y demo. GCP secrets separados (`notion-webhook-signing-secret-{efeonce|sky|demo}`). Leak en uno NO compromete los otros.
- **NUNCA** permitir cliente externo (Sky, etc.) access al demo teamspace. Solo interno Greenhouse + HR + Delivery (`notion.metrics.demo.read` capability matrix canonical).
- **NUNCA** desincronizar schema demo del template Efeonce sin update governance doc + reliability signal `demo_teamspace_drift` review.
- **NUNCA** archivar demo durante la migración (12-14 meses canonical per ADR Strangler). Demo es load-bearing.
- **NUNCA** activar `sync_enabled=TRUE` en demo `space_notion_sources` row. Sync legacy NO procesa demo — defense in depth contra contaminate `greenhouse_conformed.delivery_*` + `metrics_by_*` productivos.
- **NUNCA** marcar real member con `is_demo=TRUE` manualmente. Helper `registerDemoMember` rechaza convertir real (is_demo=FALSE existente) a demo. Invariant anti-corruption.
- **NUNCA** invocar `Sentry.captureException()` directo en demo code paths. Usar `captureWithDomain('integrations.notion', { tags: { source: 'demo_<stage>' } })` o `'payroll'` para signal contamination.
- **NUNCA** desactivar el filter SQL en `fetchKpisForPeriod` ni los wrappers `calculateRpaBonusForMember/calculateOtdBonusForMember`. Defense in depth dual es load-bearing.
- **SIEMPRE** que un nuevo bug class demo emerja, agregar test anti-regresión en `bonus-proration.test.ts` (demo member → $0 bonus + qualifies=false canonical).
- **SIEMPRE** que un consumer payroll nuevo emerja que llame `fetchKpisForPeriod`, verificar que el filter `filterOutDemoMembers` corre antes de cualquier read BQ.

**Helpers canonical**:

- `src/lib/identity/demo-members.ts`: `registerDemoMember`, `isDemoMember`, `listDemoMembers`, `countDemoMembers`
- `src/lib/webhooks/handlers/notion-tasks-demo.ts`: webhook handler con HMAC + echo-loop + property allowlist + status normalization
- `src/lib/sync/projections/notion-status-transition-capture-demo.ts`: reactive consumer + filter strict + persist en tabla demo
- `src/lib/payroll/bonus-proration.ts`: `guardDemoMemberBonus`, `calculateRpaBonusForMember`, `calculateOtdBonusForMember`
- `src/lib/reliability/queries/notion-metrics-demo-signals.ts`: 6 signal readers canonical

**Spec canónica**: `docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md`. Governance doc: `docs/operations/notion-demo-teamspace-governance.md`.

### RpA V2 Demo Pipeline End-to-End invariants (TASK-913, desde 2026-05-19)

Pipeline canonical RpA V2 demo end-to-end: captura status transition Notion → persiste en tabla demo → computa RpA V2 via helper canonical → persiste snapshot → PATCH Notion property `[GH] RpA v2`. Carril paralelo invisible al productive durante toda la migración Strangler (per ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`). El pipeline corre **sólo sobre el teamspace Demo Greenhouse**; NUNCA toca Efeonce/Sky productivos.

**Cadena canonical event-driven** (4 capas decoupled vía outbox, mirror del pattern TASK-771):

```text
Notion edit status (operador demo) → webhook /api/webhooks/notion-tasks-demo (HMAC + echo-loop filter)
  → outbox event notion.task.status_transitioned (metadata.demo_mode=true)
    → capture-demo (TASK-910 Slice 3) persiste task_status_transitions_demo
      → emite chain event notion.task.transition_captured.demo (TASK-913 Slice 1)
        → compute-demo invoca calculateRpaV2Demo (foundation helper sibling demo)
          → persiste row en task_rpa_demo_snapshots (CHECK workspace_id='demo')
          → emite chain event notion.task.metrics_writeback_requested.demo (Slice 1)
            → writeback-demo (Slice 2) re-reads PG defensive + PATCH Notion [GH] RpA v2
              → marca snapshot.written_to_notion_at = NOW()
```

**Diseño simétrico canonical sibling-pattern** (forward-compat productive cutover por repointing, NO rediseño):

| Demo (V1 shipped 2026-05-19) | Productive sibling (TASK-901 Slice 4+ futuro) |
|---|---|
| `count-correction-transitions-demo.ts` | `count-correction-transitions.ts` (TASK-908 shipped) |
| `calculate-rpa-v2-demo.ts` | `calculate-rpa-v2.ts` (TASK-901 shipped) |
| `notion-status-transition-capture-demo.ts` | `notion-status-transition-capture.ts` (TASK-912 futuro) |
| `notion-rpa-compute-demo.ts` | `notion-rpa-compute.ts` (futuro) |
| `notion-rpa-writeback-demo.ts` | `notion-rpa-writeback.ts` (futuro) |
| `notion-demo-client.ts` (token `NOTION_METRICS_DEMO_TOKEN_SECRET_REF`) | `notion-client.ts` (token `NOTION_TOKEN`) |
| `task_rpa_demo_snapshots` (PG demo) | `task_rpa_snapshots` (PG productive, futuro) |
| `task_status_transitions_demo` | `task_status_transitions` (TASK-908 shipped) |
| Events `notion.task.*.demo` | Events `notion.task.*` o `*.prod` (futuro) |
| Property Notion `[GH] RpA v2` (demo teamspace) | Property `[GH] RpA v2` (Efeonce/Sky DBs) |

**Eventos canonical V1** (3 nuevos outbox events bumpeados al catálogo):

- `notion.task.status_transitioned` (heredado TASK-908/910) — webhook source, discriminado por `metadata.demo_mode`
- `notion.task.transition_captured.demo` (TASK-913 Slice 1) — chain event canonical post-persist, garantiza happens-before vs race condition del dispatcher reactivo paralelo
- `notion.task.metrics_writeback_requested.demo` (TASK-913 Slice 1) — chain event post-compute, dispara writeback

**Tabla canonical** `greenhouse_delivery.task_rpa_demo_snapshots` (migration `20260519130951001`):

- PK `snapshot_id UUID`
- CHECK `workspace_id = 'demo'` PG-side
- CHECK `rpa_data_status IN (valid|unavailable|low_confidence|suppressed)`
- CHECK `source_mode IN (canonical|unavailable)`
- UNIQUE partial INDEX sobre `source_event_id WHERE NOT NULL` (idempotency canonical)
- 3 indexes hot path: `task_latest_desc`, `writeback_pending`, `paridad`
- Append-only triggers anti-UPDATE/anti-DELETE (EXCEPCIÓN canonical: writeback columns `written_to_notion_at`, `notion_writeback_event_id`, `notion_writeback_attempt_count`, `notion_writeback_last_error` SÍ pueden mutar para idempotency canonical writeback)
- Ownership `greenhouse_ops` + GRANT SELECT/INSERT/UPDATE a `greenhouse_runtime`

**2 reliability signals nuevos** (TASK-913 Slice 3) bajo subsystem rollup `delivery`:

- `notion.metrics.writeback_dead_letter_demo` (drift): real signal post-Slice 2 que detecta `notion_writeback_attempt_count >= 4 AND notion_writeback_last_error IS NOT NULL AND written_to_notion_at IS NULL`. Steady=0. ERROR si > 0.
- `notion.metrics.writeback_lag_demo` (lag): snapshots `valid + NOT written + < dead-letter threshold + computed_at > 30 min ago`. Steady=0. Warning 1-3, error > 3.

**Nightly safety net canonical**: script `scripts/rpa-demo/retrigger-pending-writebacks.ts` re-emite `notion.task.metrics_writeback_requested.demo` para snapshots lag overdue. Idempotent (PATCH idempotent + snapshot guard downstream). Pattern fuente TASK-878.

**Defense in depth canonical 9 capas** (heredadas TASK-910 + extendidas por TASK-913):

1-9: ver TASK-910 sección Notion Demo Teamspace Sandbox
10. **Token Notion físicamente separado** `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` (GCP `notion-integration-token-greenhouse-metrics-demo`) con permisos SOLO en teamspace Demo Greenhouse — NUNCA accesible a Efeonce/Sky databases
11. **Re-read snapshot from PG defensive** en writeback projection — NUNCA confía el `rpaValue` del payload del event (source of truth = PG)
12. **Skip honest cuando token NO configurado** — degraded mode honest, reliability signal alerta vs degradar silenciosamente al productive
13. **Idempotency triple**: ON CONFLICT DO NOTHING (compute snapshot) + `written_to_notion_at` guard (writeback skip si already_written) + PATCH Notion idempotent (mismo body NOOP)
14. **maxRetries=4** en writeback projection antes de dead-letter (3 retries + initial)

**⚠️ Reglas duras canonical**:

- **NUNCA** hacer drift entre las firmas/types de los helpers demo (`count-correction-transitions-demo`, `calculate-rpa-v2-demo`) y sus siblings productive. Re-export types canonical desde productive (mismo shape `RpaV2Result`, `CountCorrectionTransitionsResult`). Cualquier cambio en uno debe reflejarse en el otro.
- **NUNCA** mezclar la lógica de demo y productive en el mismo módulo. Siblings físicamente separados es el patrón canonical — `if (isDemo) { ... } else { ... }` está prohibido. Lint manual durante code review.
- **NUNCA** introducir parametrize `tableName: string` en los foundation helpers (`countCorrectionTransitions[Demo]`). Bug futuro podría pointear productive al table demo o vice-versa. Siblings físicos enforce el boundary a nivel código.
- **NUNCA** invocar `calculateRpaV2` (productive) desde un code path que opera sobre demo. Y vice-versa. Lint manual code review.
- **NUNCA** compartir el integration token de Notion entre demo y productive. Secret físicamente separado en GCP (`notion-integration-token-greenhouse-metrics-demo` vs `NOTION_TOKEN`). Permisos del demo token DEBEN estar restringidos al teamspace Demo Greenhouse — NUNCA tener acceso a databases Efeonce/Sky.
- **NUNCA** escribir a la propiedad `[GH] RpA v2` en databases productivas usando el demo writeback projection. Defense in depth dual: filter `workspaceId === 'demo'` strict + integration token con permisos restringidos.
- **NUNCA** crear consumer downstream que confíe el `rpaValue` del payload del event sin re-read PG. El payload es trigger; la fuente de verdad es `task_rpa_demo_snapshots` (defense in depth pattern TASK-771 sample-sprint).
- **NUNCA** ON UPDATE las columnas append-only de `task_rpa_demo_snapshots` (todas excepto writeback columns). Trigger PG enforce. Para correcciones, INSERT nueva fila con `source_event_id` distinto.
- **NUNCA** persistir un snapshot con `rpa_data_status='valid'` Y `rpa_value=NULL`. CHECK constraint PG-side rechaza. Para tasks pre-deployment (sin transitions), persiste `rpa_data_status='unavailable'` + `rpa_value=NULL`.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del pipeline demo. Usar `captureWithDomain('integrations.notion', { tags: { source: 'demo_<stage>' } })` para rollup canonical en `/admin/operations`.
- **NUNCA** introducir nuevo chain event (e.g. para BCS, TTM, OTD) sin agregar (a) entry en `EVENT_TYPES`, (b) outbox aggregateType canonical, (c) projection registrada con `triggerEvents`, (d) tests anti-regresión, (e) reliability signal observable downstream.
- **NUNCA** correr el pipeline demo en paralelo con el legacy sync (`space_notion_sources.sync_enabled=TRUE` para demo). El sync legacy NO procesa demo — pero garantizar que sigue OFF es load-bearing canonical anti-contamination.
- **NUNCA** auto-promover pipeline demo a productive (Efeonce/Sky) sin pasar por los 8 stop-gates canonical del ADR Strangler `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (foundation + demo verde 4 semanas + shadow 30d bonus / 7d operational + pilot scope ≤ 1 cliente + HR sign-off + snapshot pre-flip + kill switch + runbook + cliente sign-off).
- **NUNCA** escalar volumen de writeback demo > Notion rate limit ~3 req/s sin migrar a Cloud Tasks queue throttled. V1 demo low volume <10/day es seguro con reactive consumer cada 5min; productive cutover REQUIERE Cloud Tasks rate=3/s explícito.
- **NUNCA** modificar el `formula_version='rpa_v2.0'` retroactivamente. Bump a `rpa_v3.0` cuando Frame.io integration shippee + extender helpers en paralelo a productive — NUNCA modificar V2 in-place.
- **NUNCA** crear consumer/dashboard que lea `task_rpa_demo_snapshots` para cualquier propósito payroll/bonus/KPI productivo. La tabla es demo-only; el bonus payroll productivo lee `metrics_by_member.rpa_avg` (V1 legacy) hasta cutover Fase D del Strangler ADR.
- **SIEMPRE** que un consumer demo nuevo emerja, validar (a) filter strict `metadata.demo_mode === true`, (b) workspace check, (c) defense in depth dual mínimo (filter + tabla/secret físicamente separada).
- **SIEMPRE** que se modifique el writeback projection (`notion-rpa-writeback-demo`), verificar que el counter `notion_writeback_attempt_count` se incrementa en AMBOS paths (success + fail). Sin counter, dead-letter signal pierde observabilidad.
- **SIEMPRE** que se modifique cualquier column del schema `task_rpa_demo_snapshots`, regenerar tipos via `pnpm migrate:up` (auto) y actualizar consumers TypeScript. Drift entre PG schema + TS types rompe build.
- **SIEMPRE** que un cliente productivo nuevo (Sky, futuro) emerja con custom property names en Notion, NO agregar property aliases — enforcer canonical template L1 ANTES del onboarding (mismo principio que TASK-742 canonical status vocabulary).

**Capabilities canonical V1.0** (heredadas TASK-910 + reusadas):

- `notion.metrics.demo.execute` (module=admin, scope=tenant) — EFEONCE_ADMIN
- `notion.metrics.demo.read` (module=admin, scope=tenant) — EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS

**Helpers canonical** (todos `import 'server-only'`):

- `src/lib/notion-metrics/count-correction-transitions-demo.ts`: foundation helper sibling demo
- `src/lib/notion-metrics/calculate-rpa-v2-demo.ts`: mapper canonical demo (delegates a foundation helper)
- `src/lib/notion-metrics/notion-demo-client.ts`: Notion API client demo-only con token físicamente separado
- `src/lib/sync/projections/notion-rpa-compute-demo.ts`: reactive consumer compute (invoca calculateRpaV2Demo + persiste snapshot + emite chain event)
- `src/lib/sync/projections/notion-rpa-writeback-demo.ts`: reactive consumer writeback (PATCH Notion + idempotent + retryable)
- `src/lib/sync/projections/notion-status-transition-capture-demo.ts` (TASK-910 extended Slice 1): emite chain event post-persist en correction transitions
- `src/lib/reliability/queries/notion-metrics-demo-signals.ts`: 7 signal readers canonical (5 + 2 nuevos Slice 3)
- `scripts/rpa-demo/retrigger-pending-writebacks.ts`: nightly safety net script

**Spec canónica**: `docs/tasks/in-progress/TASK-913-rpa-v2-demo-pipeline-end-to-end.md`. ADR: `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`. Cross-refs TASK-910 (demo teamspace foundation), TASK-908 (status transition tracking foundation), TASK-901 (calculateRpaV2 productive helper).

### Notion Status Transition Capture — productive pipeline invariants (TASK-912, desde 2026-05-21)

Sibling PRODUCTIVO (Efeonce + Sky) del pipeline de captura demo (TASK-910/914). Cierra el loop de captura de TASK-908 Foundation: cuando el operador active el flag + secret, `countCorrectionTransitions` empieza a retornar `sourceMode='canonical'` y desbloquea TASK-901 Slice 4 / TASK-916 (RpA prod). **Aditivo + flag OFF por default → cero impacto en métricas existentes al merge.**

**Pipeline canónico** (sibling físicamente separado del demo):

```text
Notion webhook (suscripción ÚNICA y AMPLIA, todos los teamspaces)
  → /api/webhooks/notion-status-transitions  (handler notion-status-transitions)
     ├─ verification handshake → ACK siempre
     ├─ kill-switch NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED OFF → ACK + drop
     ├─ HMAC (secret productivo separado del demo) + echo + demo-drop best-effort
     └─ emite notion.task.page_change_signal (trigger liviano, sin from/to)
  → consumer notion-status-transition-capture (reactivo, ops-worker)
     ├─ re-fetch página (NOTION_TOKEN, read 2026-03-11)
     ├─ resuelve workspace por parent.data_source_id → Efeonce/Sky o SKIP (autoritativo)
     ├─ derive from de última transición en task_status_transitions (PG)
     ├─ persist-if-changed en task_status_transitions (workspace_id resuelto)
     └─ emite notion.task.status_transitioned (canonical, con from/to) para downstream
```

**Helpers canónicos**:
- `resolveProductiveWorkspace(notionId)` / `isDemoTareasDataSource(notionId)` — `src/lib/notion-metrics/notion-productive-workspaces.ts` (data source IDs Efeonce `5126d7d8-…` / Sky `23039c2f-…` / demo `36339c2f-…`, normalización dashless).
- `fetchPageStatus(pageId)` — `src/lib/space-notion/notion-client.ts` (lee `Estado` + `parent.data_source_id`, read version 2026-03-11).
- `isNotionStatusTransitionsWebhookEnabled()` — `src/lib/notion-metrics/status-transitions-flags.ts`.

**⚠️ Reglas duras (no-interferencia con flujos de métricas existentes)**:

- **NUNCA** quitar el kill-switch flag `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` ni cambiar su default OFF. Es lo que garantiza cero actividad al merge.
- **NUNCA** confiar el `parent.id` del webhook para decidir workspace. El shape (DS vs DB id) no está garantizado. La resolución autoritativa es `parent.data_source_id` del GET de la página (consumer). El handler solo hace demo-drop best-effort.
- **NUNCA** persistir en `task_status_transitions` una tarea cuyo workspace NO resuelva a Efeonce/Sky. `resolveProductiveWorkspace` null → SKIP. Garantía anti-contaminación (la suscripción amplia trae demo + otros teamspaces).
- **NUNCA** escribir a Notion desde este pipeline (captura = solo GET re-fetch read-only). El writeback es TASK-916.
- **NUNCA** reusar el secret HMAC del demo ni el integration user id genérico. Secret productivo dedicado + `NOTION_PRODUCTIVE_INTEGRATION_USER_ID` separado.
- **NUNCA** consumir el evento `notion.task.page_change_signal` desde el consumer demo (filtra `metadata.demo_mode === true`) ni viceversa. Eventos + tablas físicamente separados.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'status_transition_capture' | 'notion-status-transitions-webhook' } })`.
- **NUNCA** modificar `notion-bq-sync` (flujo legacy de métricas) desde este pipeline — no comparte código; sigue intacto.
- **SIEMPRE** que emerja un teamspace productivo nuevo, agregarlo a `PRODUCTIVE_TAREAS_DATA_SOURCE_IDS` (el consumer lo resuelve automáticamente).

**Reliability signals** (subsystem `delivery`): `notion.task_status_transitions.ingestion_lag` (lag) + `notion.task_status_transitions.refetch_failed` (dead_letter). Steady=0.

**Estado**: Slices 1-5 shipped + verificados en `develop` (flags OFF). Captura (1-2) + BQ materializer reactivo (3) + `cycle_time_days` canónica de-correlada (4, verificada contra BQ real ambas ramas) + `cycle_time_slo_pct` (5). El flip de `cycle_time_days`/`cycle_time_slo_pct` (flags ON) está gated por shadow mode 7d + arch-architect 4-pillar — NO flipeado. **Slice 6 (backfill histórico) BLOQUEADO por falta de fuente**: la API Notion no expone property-history y los snapshots BQ son stale (4 días mar–abr). Path canónico = forward-accumulation (activar captura → esperar 1 período completo → flip). Ver TASK-912 spec Delta 2026-05-21.

**Spec canónica**: `docs/tasks/in-progress/TASK-912-ico-status-transition-webhook-ingestion-and-bq-formula.md`. Pattern fuente: demo siblings TASK-910/913/914.

### RpA V2 productive compute + writeback invariants (TASK-916, desde 2026-05-21)

Siblings PRODUCTIVOS (Efeonce + Sky) del pipeline RpA V2 demo (TASK-913/914). Clonado mecánico + repointeo, NO rediseño. Carril paralelo invisible al productive durante la migración Strangler (ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`). **Aditivo + writeback flag OFF por default → cero impacto en métricas/Notion productivo al merge.**

**Pipeline canónico** (sibling físicamente separado del demo):

```text
Notion edit status (Efeonce/Sky) → captura prod TASK-912 (notion-status-transition-capture)
  → emite notion.task.status_transitioned (con from/to, workspaceId resuelto autoritativo)
    → notionRpaComputeProjection (reactivo): calculateRpaV2 sobre task_status_transitions
      → persiste snapshot en task_rpa_snapshots (CHECK workspace_id IN ('efeonce','sky'))
      → emite chain event notion.task.metrics_writeback_requested cuando rpaDataStatus='valid'
        → notionRpaWritebackProjection (reactivo, GATED NOTION_RPA_WRITEBACK_ENABLED default OFF):
          re-read PG defensive → PATCH [GH] RpA v2 vía patchNotionPage/NOTION_TOKEN → mark written
```

**Diseño simétrico sibling-pattern** (mismo invariante que TASK-913): cada pieza prod es 1:1 mappable a su sibling demo — la lógica difícil ya está peleada. Diferencias: tabla `task_rpa_snapshots` (no `_demo`), evento sin `.demo`, property `[GH] RpA v2` (coexiste con legacy `RpA`), token `NOTION_TOKEN` (no el demo separado), gate `NOTION_RPA_WRITEBACK_ENABLED`.

**Helpers/archivos canónicos**:

- `src/lib/notion-metrics/calculate-rpa-v2.ts` (reusado tal cual — ya lee `task_status_transitions`, NO variante prod).
- `src/lib/space-notion/notion-client.ts` → `patchNotionPage(pageId, properties)` (mirror de `patchNotionDemoPage`, vía `notionRequest`/`NOTION_TOKEN`/`2022-06-28`).
- `src/lib/sync/projections/notion-rpa-compute.ts` + `notion-rpa-writeback.ts`.
- `src/lib/reliability/queries/notion-metrics-rpa-signals.ts` (`notion.metrics.writeback_dead_letter` + `notion.metrics.writeback_lag`, subsystem `delivery`, steady=0).
- Migration `20260521182825984_task-916-rpa-v2-snapshots.sql`.

**⚠️ Reglas duras**:

- **NUNCA** hacer drift entre las firmas de los siblings prod (`notion-rpa-compute`, `notion-rpa-writeback`) y los demo. Si cambia uno, reflejar en el otro. NO mezclar la lógica prod/demo en el mismo módulo (`if (isDemo) {...}` prohibido — siblings físicamente separados es el patrón canónico).
- **NUNCA** invocar `calculateRpaV2Demo` desde el compute prod ni `calculateRpaV2` desde el demo. Mismo para tablas: prod escribe `task_rpa_snapshots`, demo `task_rpa_demo_snapshots`. CHECK constraints PG-side enforce.
- **NUNCA** quitar el gate `NOTION_RPA_WRITEBACK_ENABLED` ni cambiar su default OFF. Es lo que garantiza cero escrituras a Notion productivo hasta TASK-917 Flip A.
- **NUNCA** confiar el `rpaValue` del payload del chain event en el writeback. SIEMPRE re-read del snapshot por `snapshotId` desde `task_rpa_snapshots` (defensive re-read, pattern TASK-771).
- **NUNCA** filtrar el compute prod solo por workspace sin chequear `demo_mode !== true` (anti-coersion strict), ni viceversa. Defense in depth dual.
- **NUNCA** crear formula property nueva en Notion para RpA — boundary canónico (Notion = OS, Greenhouse = motor). El productivo escribe `[GH] RpA v2` read-only para operadores; coexiste con `RpA` legacy (NO se toca durante la migración Strangler).
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'rpa_compute' | 'rpa_writeback' } })`.
- **NUNCA** activar `NOTION_RPA_WRITEBACK_ENABLED=true` sin: (a) crear la propiedad `[GH] RpA v2` en Efeonce/Sky (NO existe aún — verificado 2026-05-21), (b) los 8 stop-gates del ADR Strangler, (c) ~3-4 semanas de captura acumulada vía TASK-912. Eso es TASK-917 Flip A.
- **SIEMPRE** que el compute persista snapshot pero el chain event emit falle, NON-blocking: el snapshot persistido es source of truth; el signal `writeback_lag` detecta el pending overdue.
- **SIEMPRE** que emerja una métrica V2 nueva (OTD, FTR, etc.) con writeback productivo, replicar este patrón sibling (compute + writeback + snapshot table + 2 signals + chain event), NO improvisar.

**Echo-loop**: el writeback escribe un number (`[GH] RpA v2`), NO el status. El webhook que dispara → captura prod re-fetchea STATUS → unchanged → noop → no `status_transitioned` → no recompute. Sin loop.

**⚠️ Característica de MUESTREO canónica (no es bug — BUG-CLASS-003, canonizada 2026-05-21)**: la captura de transiciones es un **sistema de muestreo**, no un registro continuo. Dos hechos: (1) el webhook de Notion NO trae valores (solo IDs de propiedad — payload real verificado `updated_properties:["PyIi","notion://tasks/status_property"]`) → el consumer re-fetchea y obtiene solo el estado ACTUAL; (2) el dispatcher reactivo (`reactive-consumer.ts` Phase B) coalescia todos los eventos de la misma página en UN `refresh()` por batch (~5 min). Consecuencia: **transiciones más rápidas que la cadencia (o ida-y-vuelta al mismo estado dentro de un batch) se COLAPSAN** — solo se registran las que persisten a través de ≥1 read reactivo. Estados intermedios nunca observados son irreconstruibles (Notion no expone property-history).

- **NUNCA** tratar esto como bug a "arreglar" dentro de webhook+re-fetch — es inherente (no se puede reconstruir un estado no muestreado). Quitar el coalescing NO lo arregla (dos eventos post-cambios re-fetchean el mismo estado). La única mejora sería re-fetch al llegar el webhook (gap ~segundos), pero rompe el decoupling outbox (TASK-771) y sigue siendo muestreo. **YAGNI hasta que la paridad lo justifique.**
- **Aceptable para RpA**: las correcciones reales son client-driven sobre horas/días → siempre persisten a través de batches → se capturan bien. El subconteo solo ocurre con toqueteo sub-minuto (no es uso real). El demo de TASK-914 (RpA=2) funcionó porque las transiciones estaban espaciadas en batches distintos.
- **Protección del bono (Flip B)**: gate `shadow_paridad_rpa ≥95%` 30 días + sign-off HR. Si el subconteo fuera material, la paridad lo detecta antes de mover plata (RpA bajo = mejor → subcontar infla calidad → el gate lo frena). Flip A (display) no toca el bono.
- **Para DEMOS/tests**: para verificar que una corrección se captura, **espaciar las transiciones entre batches reactivos** (o verificar la captura del paso N antes del N+1). Toqueteo sub-minuto colapsa y NO es representativo. Verificado live 2026-05-21: demo espaciado → `[GH] RpA v2=1`; toqueteo en segundos → 0 (colapso esperado).
- **SIEMPRE** que se canonice un fix de captura vía webhook+re-fetch, documentar JUNTO al fix esta característica de muestreo. Lección dura de TASK-916: BUG-CLASS-002 documentó el fix re-fetch pero NO su límite residual → se re-descubrió costosamente en TASK-916. El fix y su límite de muestreo se documentan **juntos** o el aprendizaje se pierde.

**Estado**: V1.0 SHIPPED en `develop` 2026-05-21 (writeback flag OFF). Migration aplicada + tipos regenerados. 44 tests focales + full suite 5197 passed + tsc 0 + lint 0 + build ✓. Smoke PG real: tabla queryable 0 rows, signals dead_letter/lag = 0, CHECK rechaza `workspace='demo'`. Activación → TASK-917 Flip A.

**Spec canónica**: `docs/tasks/complete/TASK-916-rpa-v2-productive-compute-writeback.md`. Pattern fuente: demo siblings TASK-913/914.

### FTR writeback invariants (TASK-903, sibling de TASK-916, desde 2026-05-24)

Pipeline FTR writeback PRODUCTIVO (Efeonce + Sky) — **clone mecánico de TASK-916 RpA repointeado a FTR**, NO rediseño. FTR es **derivada pura de RpA** (`FTR pass ⇔ RpA.value === 0`); el compute delega a `calculateFtr` (TASK-909, que delega a `calculateRpaV2`). Default flag OFF → cero escrituras a Notion al merge.

**Pipeline canónico** (siblings físicamente separados del RpA):

```text
notion.task.status_transitioned (captura TASK-912)
  → notionFtrComputeProjection: calculateFtr → persist task_ftr_snapshots → emit notion.task.ftr_writeback_requested (solo si ftr_data_status='valid' + pass/fail)
    → notionFtrWritebackProjection (gated NOTION_FTR_WRITEBACK_ENABLED default OFF):
      re-read PG defensive → PATCH select [GH] FTR (Pass/Fail) → mark written
```

**Archivos canónicos**:
- `src/lib/sync/projections/notion-ftr-compute.ts` + `.test.ts`
- `src/lib/sync/projections/notion-ftr-writeback.ts` + `.test.ts`
- `migrations/20260524200315533_task-903-ftr-snapshots.sql` (`task_ftr_snapshots`, CHECK workspace_id IN efeonce/sky, append-only triggers, writeback cols mutables)
- `src/lib/reliability/queries/notion-metrics-ftr-signals.ts` (2 signals)
- `EVENT_TYPES.notionTaskFtrWritebackRequested` ('notion.task.ftr_writeback_requested') v1
- `NotionPropertyValue.select` (forward-compat, extendido por esta task)

**⚠️ Reglas duras** (mirror TASK-916):

- **NUNCA** recomputar el veredicto FTR inline — toda lectura vía `calculateFtr`. Lint rule `greenhouse/no-inline-ftr-calculation` (warn) lo bloquea.
- **NUNCA** crear formula property en Notion para FTR — compute en Greenhouse + writeback select `[GH] FTR`.
- **NUNCA** confiar el `ftrValue` del payload del chain event en el writeback — re-read del snapshot desde `task_ftr_snapshots` por `snapshot_id` (defensive re-read, pattern TASK-771).
- **NUNCA** escribir a `[GH] FTR` con el flag OFF. Default OFF + override per-cliente `NOTION_FTR_WRITEBACK_ENABLED_<EFEONCE|SKY>`.
- **NUNCA** emitir el chain event cuando `ftr_data_status != 'valid'` (low_confidence/unavailable no se escriben — degraded honest, mirror RpA `valid`-only).
- **NUNCA** drift entre los siblings FTR y RpA (compute/writeback) — clone + repoint, NO `if (isFtr)`. Físicamente separados.
- **NUNCA** invocar `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'ftr_compute' | 'ftr_writeback' } })`.

**Paridad**: NO existe `notion.metrics.shadow_paridad_ftr` standalone — FTR es derivada pura de RpA y no tiene fórmula Notion legacy que diffear; su paridad queda cubierta por `notion.metrics.shadow_paridad_rpa` (TASK-916) por construcción (RpA paridad ≥95% ⇒ FTR paridad ≥95%).

**Activación (flip `NOTION_FTR_WRITEBACK_ENABLED=true`)** — gated por FTR_V1 §9.1: TASK-916 RpA writeback `enabled` 30d + TASK-912 captura activa + `[GH] FTR` creada en Efeonce/Sky + decisión explícita "FTR explícito vale vs derivar de RpA" (ver TASK-903 "Why This Task Exists").

**Estado**: SHIPPED `develop` 2026-05-24 (flag OFF). Migration aplicada + tipos regenerados. 42 tests focales + tsc 0 + lint 0. Smoke PG real: tabla queryable, CHECK rechaza demo, signals = 0.

**Spec canónica**: `docs/tasks/complete/TASK-903-ftr-writeback-notion-gh-property.md`. Pattern fuente: TASK-916 (RpA productive writeback). Consumer real de `calculateFtr` (TASK-909).

### OTD Bucket Classifier Ownership invariants (TASK-923, M1, desde 2026-05-24)

Greenhouse es el **clasificador autoritativo del bucket OTD** (`on_time` / `late_drop` / `overdue` / `carry_over` / `na`). El cómputo del bucket vive en un helper canónico TS + su espejo BQ — NUNCA en una fórmula Notion. M1 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16: movió el clasificador desde la fórmula Notion `Indicador de Performance` (→ synced `performance_indicator_code`) a Greenhouse en **modo paridad** (freeze-off, replica la semántica cruda actual), escrito a la columna shadow `gh_otd_bucket`. Es aditivo: el bono sigue leyendo `otd_pct` legacy intacto.

**Helpers canónicos** (`src/lib/notion-metrics/`):

- `classifyOtdBucket(inputs: TaskInputsForOtdBucket) → OtdBucketResult` — pure helper canonical, **freeze-aware togglable** (M1 = freeze off / paridad; M2 = freeze on). Un solo helper, no dos. server-only. Importa `task-status-canonical.ts` (Aprobado/Cancelado/Archivado + `normalizeTaskStatus`).
- `buildOtdBucketSql(cols, frozenDaysSql='0') → string` — espejo BQ CASE del helper. TS es source of truth; la expresión BQ se valida con test de paridad TS↔SQL.
- `OTD_BUCKET_FORMULA_VERSION='otd_bucket_v1.0'` en `otd-bucket-types.ts`.
- `isOtdClassifierGhShadowEnabled()` (`OTD_CLASSIFIER_GH_SHADOW_ENABLED`, default OFF) en `otd-classifier-flags.ts`.

**Columna shadow** `gh_otd_bucket` (STRING): en `v_tasks_enriched` (VIEW additive) + `delivery_task_monthly_snapshots` (DDL + `REQUIRED_COLUMN_MIGRATIONS`). La materialize la inserta vía `buildOtdBucketSql`.

**Reliability signal** `notion.metrics.shadow_paridad_otd_classifier` (PG-based, moduleKey `delivery`, kind `drift`): compara `performance_indicator_code IN ('on_time','late_drop')` legacy vs el recompute del helper, **solo sobre tareas COMPLETADAS** (buckets estables now()-independientes), últimos 90d. Severity: mismatch ≤2% ok / ≤10% warning / >10% error.

**⚠️ Reglas duras**:

- **NUNCA** computar el bucket OTD leyendo la fórmula Notion `Indicador de Performance` ni `performance_indicator_code` para cómputo nuevo. El bucket canónico se computa con `classifyOtdBucket`. `performance_indicator_code` queda como display/paridad legacy hasta ≥90d post-cutover M3.
- **NUNCA** crear un helper de clasificación OTD paralelo. Si M2 (TASK-922 freeze) o futuros movimientos necesitan más semántica, **extender `classifyOtdBucket`** (es freeze-aware togglable by design) + extender `buildOtdBucketSql`. Un solo helper.
- **NUNCA** modificar `classifyOtdBucket` sin actualizar paralelamente `buildOtdBucketSql` + el test de paridad TS↔SQL. La expresión BQ debe espejar el helper byte-semánticamente.
- **NUNCA** el bono lee `gh_otd_bucket` antes de M3 (cutover gateado: ≥30d shadow + sign-off HR). M1/M2 escriben solo la columna shadow que el bono NO lee → matemáticamente no alteran `otd_pct`.
- **NUNCA** medir paridad M1 sobre tareas abiertas (`overdue`/`carry_over`). Esos buckets dependen de `now()` + del gate `esMesActual` → la divergencia es esperada, no falla. La signal mide solo completadas (`on_time`/`late_drop`).
- **NUNCA** subir `OTD_CLASSIFIER_GH_SHADOW_ENABLED` a un comportamiento que cambie un número que el bono ve. El flag es de observabilidad/shadow; el cutover real del bono es M3 (futura task gateada).
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'otd_classifier_*' } })`.
- **SIEMPRE** que emerja un movimiento downstream (M2 freeze, M3 cutover), reusar el helper canónico + columna shadow + signal de paridad. Cero plumbing nuevo.

**Spec canónica**: `docs/tasks/complete/TASK-923-greenhouse-owns-otd-bucket-classifier-parity-shadow.md`. ADR: `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 (Delta 2026-05-24 — M1 shipped). Desbloquea M2 (TASK-922). Patrón fuente: TASK-908 (calculate-cycle-time + cycle-time-formula TS↔SQL mirror), TASK-901 (RpA helper canonical), Delivery Metrics Ownership Boundary (Notion = OS / Greenhouse = motor).

### Due-Date Change Capture invariants (TASK-921, M0, desde 2026-05-24)

`greenhouse_delivery.task_due_date_changes` es el log **append-only** canónico de cambios de fecha límite + motivo de reprogramación. M0 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16 — foundation que TASK-922 (M2 freeze/atraso imputable) consume. Reemplaza el casillero único Notion `Fecha límite original` + fórmula `Días reprogramados` por un historial real (cuántas veces, de→a, por qué). NO computa atraso — eso es TASK-922.

**Captura canónica** (reusa infra TASK-912, NO segundo webhook):

- El webhook `notion-status-transitions` (TASK-912) ya emite `notion.task.page_change_signal` para CUALQUIER cambio de propiedad. La captura de fecha es un **2do consumer** de ese evento (`notionDueDateChangeCaptureProjection`), NO un endpoint/HMAC/suscripción nueva.
- Re-fetch canónico (`fetchPageDueDate` en `notion-client.ts`, sibling de `fetchPageStatus`): lee `Fecha límite` + `Fecha límite original` (baseline seed) + select `Motivo de reprogramación` (confirmación operador) + estado + `parent.data_source_id` (workspace autoritativo). NUNCA confía el payload del webhook.
- **Flag propio** `NOTION_DUE_DATE_CAPTURE_ENABLED` (default OFF) en `status-transitions-flags.ts`. Load-bearing: el webhook de TASK-912 YA está ON en prod → sin flag propio el merge capturaría inmediato. OFF → consumer no-op.

**Motivo (ADR §5/§6)**: `inferRescheduleReason()` (`reschedule-reason-inference.ts`, pure) infiere `reason_code` desde `status_at_change` + transiciones recientes. Partición disjunta: `client_requested`/`scope_change` extienden la fecha justa; `external_blocker` lo maneja el freeze; `internal_not_prioritized`/`unspecified` no extienden. El operador confirma/corrige en Notion → `reason_source='operator_confirmed'`.

**⚠️ Reglas duras**:

- **NUNCA** crear un segundo webhook endpoint/HMAC/suscripción para capturar cambios de fecha. Reusar `notion.task.page_change_signal` con un consumer. Lo mismo para futuras propiedades capturables (otra dimensión Notion) — fan-out del mismo evento.
- **NUNCA** confiar el payload del webhook para el valor de la fecha. Siempre re-fetch (`fetchPageDueDate`). Notion no manda valores (notion-platform Pillar 1).
- **NUNCA** persistir en `task_due_date_changes` una tarea cuyo workspace no resuelva a Efeonce/Sky (`resolveProductiveWorkspace` null → skip). Garantía anti-contaminación de la suscripción amplia.
- **NUNCA** usar el motivo inferido como confirmado — `reason_source` distingue; el bono (TASK-922+) SOLO usa `operator_confirmed`.
- **NUNCA** inferir `scope_change` (indistinguible de `client_requested` desde señales de estado). Solo el operador lo confirma. La inferencia client-driven default es `client_requested`.
- **NUNCA** computar `days_delta` ni edad de filas con `EXTRACT(EPOCH FROM (date - date))` (PG lo rechaza — gate TASK-893). Usar `date - date = integer` o computar en TS (`computeDaysDelta`).
- **NUNCA** DELETE/UPDATE las columnas de observación (fechas, status, changed_at, source_event_id) — append-only (trigger PG). SOLO `reason_code`/`reason_source`/`reason_confidence` son mutables (confirmación operador).
- **NUNCA** computar atraso/fecha justa/bucket en esta capa — eso es TASK-922 (M2). M0 solo captura.
- **NUNCA** invocar `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'due_date_change_capture' } })`.
- **SIEMPRE** que el bono o un consumer downstream necesite "la fecha justa / el motivo de una reprogramación", leer `task_due_date_changes` (el motivo confirmado), NO el casillero `Fecha límite original` legacy.

**Deferido a follow-up**: writeback de la sugerencia inferida a Notion (mostrar el `[Motivo sugerido]` en la propiedad) — mirror del patrón TASK-927. El path de confirmación-read del operador SÍ está incluido en M0.

**Spec canónica**: `docs/tasks/complete/TASK-921-due-date-change-capture-reschedule-reason.md`. Migration: `20260524100613341_task-921-task-due-date-changes.sql`. ADR §16.8 (Delta 2026-05-24 — M0 shipped). Patrón fuente: TASK-908/912 (task_status_transitions + captura sibling), TASK-742 (defense-in-depth).

### Attributable Lateness invariants (TASK-922, M2, desde 2026-05-24)

El **atraso imputable** mide SOLO el slip atribuible a la agencia: días posteriores a la **fecha justa** menos el tiempo en estados de **freeze**. M2 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16 — corrige el bucket OTD que hoy refleja atraso bruto (causa raíz ISSUE-081). Construido en **shadow** (flag OFF); el bono NO cambia hasta el cutover gated (M3).

**Fórmula canónica** (ADR §4): `fecha_justa = COALESCE(original, vigente) + Σ extensiones FORWARD confirmadas ∈ {client_requested, scope_change}`; `atraso = max(0, días(fin, fecha_justa) − freeze posterior)`. Mirror de `calculateCycleTime` con 3 diferencias: reloj en fecha justa, set de exclusión = 3 estados de freeze ({Listo para revisión, Bloqueado, En pausa}), solo intervalos posteriores. **El set de exclusión del atraso DIFIERE del de Cycle Time** (que solo excluye `Bloqueado`).

**Helpers canónicos**:

- `calculateAttributableLateness(inputs)` (`src/lib/notion-metrics/calculate-attributable-lateness.ts`, pure, server-only) — source of truth del atraso. Delega el bucket a `classifyOtdBucket`.
- `classifyOtdBucket(... applyMonthGate: false)` — M2 reusa el clasificador M1 (single source of truth) con el gate de mes apagado (ADR §16.5). NO crear bucket classifier nuevo.
- Consumer `notionAttributableLatenessComputeProjection` (trigger `notion.task.status_transitioned`) → UPSERT `greenhouse_delivery.task_attributable_lateness_shadow`. Flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (default OFF).

**⚠️ Reglas duras**:

- **NUNCA** extender la fecha justa por motivos que ya maneja el freeze (`external_blocker`/revisión/pausa) — doble descuento (ADR §5). Solo `client_requested`/`scope_change` extienden.
- **NUNCA** usar motivo inferido (sin confirmar) para el bucket que afectará el bono. Solo `reason_source='operator_confirmed'`. Sin confirmar → `legacy_unknown` (conservador, mide vs vigente).
- **NUNCA** computar el output M2 en BQ ni crear un mirror BQ del freeze. El freeze multi-ciclo (3-estado, clamp post-fairDeadline) no es un CASE BQ mantenible en paridad — el helper TS es source of truth (patrón RpA V2: helper + snapshot PG + consumer reactivo). NO clobbear `gh_otd_bucket` de M1.
- **NUNCA** flipear `ATTRIBUTABLE_LATENESS_OTD_ENABLED=true` ni cutover del bono sin 8 stop-gates + sign-off HR + ≥30d shadow verde (ADR §16.2 M3).
- **NUNCA** recompute en consumers — leer el helper / shadow table canónicos.
- **NUNCA** computar días con `EXTRACT(EPOCH FROM (date - date))` (gate TASK-893); el helper computa en TS (`MS_PER_DAY`).
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery', ...)`.
- **SIEMPRE** documentar que el set de exclusión del atraso (3 estados) difiere del de Cycle Time (1 estado).
- **SIEMPRE** degradación honesta: sin transitions → `unavailable` (no 0 falso); reschedule extending sin confirmar → `legacy_unknown`.

**Reliability signals** (subsystem `delivery`): `delivery.attributable_lateness.shadow_paridad` (% buckets que el freeze cambia; ok ≤30%, warning >30% sanity) + `delivery.attributable_lateness.freeze_reschedule_overlap` (invariante anti-doble-descuento, steady=0). `delivery.reschedule.pending_reason_confirmation` se reusa de TASK-921.

**Spec canónica**: `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md` + ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §4-7, §16.9. Task: `docs/tasks/complete/TASK-922-attributable-lateness-helper-otd-bucket-shadow.md`. Migration: `20260524104127717`. Patrón fuente: TASK-908 (calculate-cycle-time interval pattern), TASK-913/916 (RpA V2 helper + snapshot + consumer), TASK-923 (classifyOtdBucket).

### Canonical Organization Write SSOT invariants (TASK-991, desde 2026-06-02)

TODA derivación de `organization_type` pasa por `deriveOrganizationType` (`src/lib/account-360/organization-type.ts`, SSOT) y TODA escritura de la fila `greenhouse_core.organizations` que toque `organization_type`/`lifecycle_stage` reconcilia ambos. Cierra el bug class fuente (Grupo Berel): las puertas se repartían las columnas de `organizations` sin SSOT — la puerta HubSpot (`createPartyFromHubSpotCompany`) escribía `lifecycle_stage`+`hubspot_company_id` pero NUNCA `organization_type`/`tax_id`/`country`/`legal_name`, dejando `active_client` con `organization_type='other'` (invisible en Finanzas) + `country='CL'` ciego (Berel es MX) + `public_id` NULL.

- `organization_type` y `lifecycle_stage` son ortogonales pero deben reconciliarse: `active_client ⇒ client/both`, `provider_only ⇒ supplier`, dual ⇒ `both`, prospect/opportunity ⇒ `other`. `deriveOrganizationType({lifecycleStage, hasClientRole, hasSupplierRole, currentType})` es la ÚNICA fuente (reemplaza `promoteToClientCapableType` inline). NUNCA degrada un rol ya adquirido. NO incluye `efeonce_internal` (la operating entity usa el flag `is_operating_entity`, no `organization_type`).
- **Los TRES writers de `organization_type`** lo derivan: (1) `upsertCanonicalOrganization` (`organization-identity.ts`, writer canónico de las puertas finance/supplier — siempre deriva, no gated), (2) `createPartyFromHubSpotCompany` (puerta HubSpot INSERT — gated), (3) `promoteParty` (`commands/promote-party.ts`, reconcilia el type en el MISMO UPDATE al promover a active_client/provider_only — gated). `promoteParty` es el ÚNICO writer de `lifecycle_stage` (sweeps/overrides funnelean por él).
- `deriveOrganizationType` NO es columna GENERATED (necesita inputs de rol que no viven solo en el lifecycle). Es columna gobernada por los writers + 4 signals (drift) + un CHECK DB `organizations_type_lifecycle_consistent` **diferido a post-release** (ver abajo). Defense-in-depth en producción inmediata: writers (app, default ON) + signals; el CHECK es la capa DB que se agrega cuando el código nuevo está en TODOS los runtimes.
- `upsertCanonicalOrganization` llena `public_id` + `origin` en cada INSERT. Modo `overrideIdentity` (remediación dirigida, ej. country CL→MX) sobreescribe identidad provista; default COALESCE preserva (no-regresión).
- `country`/`tax_id` se derivan del origin, NUNCA default ciego. La puerta HubSpot propaga `crm.companies.country_code` (NULL honesto si falta), no el default de columna `'CL'`. `tax_id` queda operator-supplied (HubSpot no trae RFC confiable).
- 4 reliability signals (subsystem `Commercial Health`, steady=0): `commercial.organization.type_lifecycle_drift` (error>0), `commercial.organization.incomplete_identity` (warning, acotado a client-grade — NO a prospects), `commercial.client.active_without_profile`, `commercial.client.active_without_space`.
- **Kill-switch `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` (default ON)**: gatea el comportamiento corrector de la puerta HubSpot (INSERT) + `promoteParty` (UPDATE). Default ON = la escritura correcta es el comportamiento por defecto en TODOS los runtimes sin setear env por runtime (evita el drift dual-env, que es la clase de bug que esta task combate). Solo `=false` lo apaga (emergencia). El helper finance/supplier NO está gated (siempre canónico).
- **CHECK `organizations_type_lifecycle_consistent` — DIFERIDO a post-release (hazard de deploy-ordering)**: `active_client ⇒ organization_type IN (client,both)`. NO está aplicado en la DB (el Cloud SQL `greenhouse-pg-dev` es compartido por TODOS los runtimes; aplicarlo mientras producción corre el código viejo —que aún escribe `active_client+other`— rompería el HubSpot sync de prod con un CHECK violation). Sin el CHECK, los writes legacy del código viejo siguen permitidos → la ventana de deploy es segura (código nuevo escribe canónico, código viejo escribe legacy-pero-permitido; el signal `type_lifecycle_drift` lo cubre). Se aplica como **paso manual post-develop→main** (cuando el código nuevo esté en prod), como su propia migración `pnpm migrate:create`. SQL canónico: `ALTER TABLE greenhouse_core.organizations ADD CONSTRAINT organizations_type_lifecycle_consistent CHECK (lifecycle_stage IS DISTINCT FROM 'active_client' OR COALESCE(organization_type,'other') IN ('client','both')) NOT VALID;` luego `VALIDATE CONSTRAINT` (idempotente, guarded). Owner del DROP/ADD = `greenhouse_ops`.
- Remediación de orgs a medias: SIEMPRE vía `scripts/commercial/remediate-half-baked-orgs.ts` (dry-run/apply/allowlist/actor/reason/expected-count abort), que pasa por `upsertCanonicalOrganization`. NUNCA SQL directo.

**⚠️ Reglas duras**:

- **NUNCA** escribir `greenhouse_core.organizations` (account-360 doors) fuera de `upsertCanonicalOrganization`. Toda puerta es caller.
- **NUNCA** hand-setear `organization_type` inconsistente con el lifecycle. Usar `deriveOrganizationType`. Cualquier writer nuevo de `lifecycle_stage='active_client'` DEBE setear el type en el mismo statement (sino, cuando el CHECK post-release esté activo, lo rechaza).
- **NUNCA** dejar `lifecycle_stage='active_client'` con `organization_type='other'`. Los writers lo reconcilian; el signal lo detecta; el CHECK (DB, post-release) lo bloquea.
- **NUNCA** default ciego `'CL'` en escrituras de sync. Derivar del origin; NULL explícito si falta.
- **NUNCA** aplicar el CHECK `organizations_type_lifecycle_consistent` contra el Cloud SQL compartido mientras producción corra el código viejo (pre develop→main). Es el hazard de deploy-ordering que rompería el HubSpot sync de prod. Aplicarlo SOLO post-release, cuando el código nuevo esté en todos los runtimes. Una vez activo el CHECK: **NUNCA** apagar el kill-switch (`=false`) sin dropear primero el CHECK (la puerta legacy volvería a producir `active_client+other` → rechazo).
- **SIEMPRE** que emerja una puerta nueva de nacimiento de org, hacerla caller del helper SSOT + setear `origin`.

**Spec canónica**: `docs/tasks/in-progress/TASK-991-canonical-client-birth-lifecycle.md` + audit `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md`. Migración aplicada: `20260602144943699` (origin, additivo seguro). CHECK `organizations_type_lifecycle_consistent` = paso manual post-release (no migración auto-aplicable, por el deploy-ordering). Orquestador lifecycle + wizard = TASK-992.

### Client Lifecycle Orchestrator invariants (TASK-992, onboarding V1.0 desde 2026-06-03)

`greenhouse_core.client_lifecycle_cases` es el agregado canónico del ciclo de vida del cliente (`onboarding | offboarding | reactivation`) — espejo comercial de TASK-760 (offboarding de colaboradores). V1.0 implementa SOLO `onboarding` (+ scaffolding `reactivation`); `offboarding` queda diferido. Vive detrás del flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (default OFF — el código está live en `develop`, las tablas vacías no se consumen). Implementa `GREENHOUSE_CLIENT_LIFECYCLE_V1` §5-§13 verbatim. Módulo: `src/lib/client-lifecycle/` (barrel pure: `types.ts` + `state-machine.ts`; `store.ts` + `commands/**` + `api-helpers.ts` son server-only, importados directo — patrón TASK-822).

**4 tablas** (`greenhouse_core`): `client_lifecycle_cases` (aggregate + state machine), `client_lifecycle_case_events` (append-only, anti-UPDATE/DELETE triggers), `client_lifecycle_checklist_templates` (declarativo, versionado, append-only), `client_lifecycle_checklist_items` (snapshot materializado al abrir). Migración `20260603004341038`. Seed `standard_onboarding_v1` (10 items §5.5 verbatim). Defensa-en-profundidad DB: CHECK status/kind enums + UNIQUE partial (un caso activo por `(organization_id, case_kind)`) + trigger `client_lifecycle_case_transition_check` (matriz §6.3 + gate "no completar con required+blocking pendientes salvo override vía `SET LOCAL app.client_lifecycle_blocker_override='true'`").

**5 comandos canónicos** (`commands/**`, atómicos + idempotentes + outbox v1, dual-mode `client?: PoolClient`): `provisionClientLifecycle` (idempotente por `(org, kind)`), `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`/`resolveLifecycleBlocker`. Cada mutación appendea `client_lifecycle_case_events` + emite el evento `client.lifecycle.*` v1 **dentro de la misma tx**. El cascade del `.completed` (onboarding) invoca `instantiateClientForParty` si no existe (swallow `OrganizationAlreadyHasClientError`).

**⚠️ Reglas duras**:

- **NUNCA** escribir `greenhouse_core.organizations` desde el lifecycle. El org row es exclusivo de `upsertCanonicalOrganization` (TASK-991), invocado por el wizard composer (Slice 2) ANTES de `provisionClientLifecycle(organizationId)`. El lifecycle recibe un `organizationId` ya existente.
- **NUNCA** invocar `instantiateClientForParty` ni `archiveClientForParty` directo desde UI/route — siempre como cascade del case completion (o desde el wizard composer en su propia tx).
- **NUNCA** UPDATE/DELETE sobre `client_lifecycle_case_events` (triggers append-only). Para correcciones, INSERT nueva fila.
- **NUNCA** transicionar el case fuera de la matriz §6.3. La transición se valida en TS (`assertCaseTransition`) Y en el trigger DB (defensa-en-profundidad). `completed`/`cancelled` son terminales.
- **NUNCA** completar un caso con ítems required+blocking pendientes sin pasar por `overrideBlockers` (capability `client.lifecycle.case.override_blocker`, EFEONCE_ADMIN only, `overrideReason >= 20`). El trigger DB lo bloquea salvo el session var de override.
- **NUNCA** materializar checklist sin `template_code` activo. El comando lee `readActiveTemplateItems`; el signal `client.lifecycle.case_without_template` detecta drift. `template_code` es columna snapshot (no FK — templates usa PK compuesta).
- **NUNCA** modificar un template existente; crear versión nueva (`standard_onboarding_v2`) + deprecar la vieja vía `effective_to`. Los casos snapshot el template al abrirse.
- **NUNCA** loggear `reason`/`cancellation_reason`/`override_reason` raw — usar `redactSensitive` / `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle' } })`. NUNCA `Sentry.captureException` directo.
- **NUNCA** error API crudo: las rutas usan `authorizeLifecycle(capability)` + `mapLifecycleError` (es-CL, `redactErrorForResponse` en el path 502).
- **NUNCA** seedear una capability `client.lifecycle.case.*` sin grant en `runtime.ts` mismo PR. Grants colapsados a ROLE_CODES reales (anti-rol-fantasma TASK-935): open/resolve → EFEONCE_ADMIN + FINANCE_ADMIN; advance/read → route_groups `commercial`/`finance` + admins; override_blocker → EFEONCE_ADMIN only. La spec V1 §8 menciona `commercial_admin`/`operations` que NO existen.
- **SIEMPRE** que un comando nuevo mute el case, emitir el evento `client.lifecycle.*` v1 + appendear el case_event en la misma tx. 5 reliability signals (subsystem Commercial Health, steady=0; override anomaly steady<3/30d): `onboarding_stalled`, `checklist_orphan_items`, `cascade_dead_letter`, `case_without_template`, `blocker_override_anomaly_rate`.

**Capabilities**: `client.lifecycle.case.{open,advance,resolve,override_blocker,read}` (módulo `commercial`). API §9: `GET/POST /api/admin/clients/[organizationId]/lifecycle[/onboarding]`, `PATCH /api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]`, `POST .../resolve`, `GET .../cases`, `GET .../health`. Eventos: 8 `client.lifecycle.*` v1 (EVENT_CATALOG Delta 2026-06-03).

**Slice 2 (puerta única / wizard) — desde 2026-06-03**: el composer canónico `provisionClientFromWizard` (`src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`) es la ÚNICA puerta de alta de cliente: en UNA tx atómica hace `upsertCanonicalOrganization` (SSOT TASK-991, identidad + client role) → `instantiateClientForParty` (Cliente + `client_profiles` con moneda de facturación, **incl. MXN**) → `promoteParty('active_client')` (**único writer canónico de `lifecycle_stage` + history**; su instantiate interno es no-op porque el cliente ya existe → preserva el perfil MXN) → `provisionClientLifecycle` (abre el caso). Endpoint: `POST /api/admin/clients/lifecycle/provision`. La moneda se valida contra `CURRENCY_DOMAIN_SUPPORT.finance_core ∪ {UF,UTM}` (derivada del registry, NO hardcode); `billingDefaults.paymentCurrency` widened a `CLP|USD|MXN|UF|UTM`. Pickers + gate "ya existe" buscan el backbone canónico vía `GET /api/admin/clients/lifecycle/org-search`. UI runtime: `/agency/clients/new` (`ClientOnboardingView`, gated por flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` + capability `client.lifecycle.case.open`), **cableada 1:1 del mockup APROBADO por copy-and-patch** (mismo JSX → paridad visual estructural; solo cambian data + commit).

**⚠️ Reglas duras Slice 2**:
- **NUNCA** parir un cliente fuera de `provisionClientFromWizard` (o del cascade de `resolveLifecycleCase`). El wizard es la puerta única; el drawer de Finanzas se redefine a "completar facet" (Slice 2c, pendiente), NO pare.
- **NUNCA** escribir `lifecycle_stage` desde el composer salvo vía `promoteParty` (history + reconcile type). `upsertCanonicalOrganization` NO recibe `lifecycleStage` en este path.
- **NUNCA** instanciar el cliente DESPUÉS de `promoteParty` (su instantiate usaría CLP default). Orden canónico: upsert → instantiate(moneda) → promote.
- **NUNCA** hardcodear la moneda de facturación; validar contra el registry. `client_profiles.payment_currency` no tiene CHECK en PG (MXN ya aceptado).
- **NUNCA** modificar/borrar los `*/mockup/*` ni implementar el runtime dentro de `/mockup/`. El runtime vive en `src/views/greenhouse/agency/clients/*` (fuera de `/mockup/`) e **iguala visualmente** el mockup. Cualquier estado/visual NUEVO (loading/degraded de pickers, código del SuccessScreen, entrada de nav) pasa por el loop product-design (`state-design`/`modern-ui`/`greenhouse-ux`) + GVC `fe:capture:diff` ANTES de pintarse — NO freehand.
- **SIEMPRE** verificar paridad con `pnpm fe:capture:diff <mockup-capture> <runtime-capture>` antes de cerrar Slice 2.

**Pendiente Slice 2c + 3**: redefinir `CreateClientDrawer` → "completar facet financiero"; triggers HubSpot deal/adopt → onboarding case `draft`; timeline lifecycle en Account 360 (TASK-611). Ítems para el loop GVC: estados loading/degraded de pickers (`state-design`), código legible del caso en SuccessScreen (`public_id` en `client_lifecycle_cases`?), entrada de nav discoverable (exponer flag al menú client).

**Spec canónica**: `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` + `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`. Patrón fuente: TASK-760 (offboarding de colaboradores). Migración: `20260603004341038`.

### Client Portal User Invitation SSOT (TASK-1001, desde 2026-06-03)

Toda creación de un usuario de portal cliente (`client_users` + `user_role_assignments` + email de invitación) pasa por el **helper canónico SSOT** `inviteClientPortalUser` (`src/lib/client-onboarding/invite-client-portal-user.ts`). Extraído de `/api/admin/invite` (que ahora lo consume con `onExisting:'error'`, preservando el 409). El onboarding lo consume con `onExisting:'ensure'` (idempotente: usuario existente → asegura rol additive, no duplica fila, no re-emaila). La invitación de personas del portal en el alta vive en el **ítem de checklist canónico existente `provision_client_users_access`** (NO se crea ítem paralelo) del timeline de onboarding (TASK-992), vía el `PortalUsersPanel` que siembra candidatos desde HubSpot (`listClientPortalPersonCandidates`) y sugiere rol por cargo (`suggestClientPortalRole`).

**⚠️ Reglas duras**:

- **NUNCA** crear `client_users` ni `user_role_assignments` por SQL inline para portal users. Pasar por `inviteClientPortalUser` (single source of truth, tx atómica, emite `role.assigned` v1 in-tx para los roles recién asignados).
- **NUNCA** asignar a un portal user un rol fuera de los 3 client_* (`client_executive`/`client_manager`/`client_specialist`). El helper valida `isRoleCode`; el endpoint valida `isClientPortalRole`. NUNCA un rol interno (collaborator/efeonce_*).
- **NUNCA** usar `updateUserRoles` para invitar (reemplaza el set completo → destructivo). La asignación es additive (`ON CONFLICT DO NOTHING` + RETURNING para detectar el alta real).
- **NUNCA** invitar en el wizard de nacimiento. Vive en el checklist de provisioning (separación de concerns — mismo principio Notion/Teams TASK-998).
- **NUNCA** gatear la invitación solo con `client.lifecycle.case.advance`. Capability dedicada **`client.lifecycle.portal_user.invite`** (least-privilege: invitar otorga ACCESO, distinto de avanzar bookkeeping). Listar candidatos usa `client.lifecycle.case.read`. Grant en `runtime.ts` al tier advance (commercial/finance route_group + admins) — `capability-grant-coverage.test.ts` lo enforce.
- **NUNCA** resolver el `client_id` del body en el endpoint de invite. Se resuelve server-side desde la org (`resolveAccountScope`, anti-tamper). Sin Cliente → degrada honesto `client_not_ready`.
- **SIEMPRE** sembrar candidatos desde los contactos HubSpot ya capturados; el operador confirma/ajusta rol. Idempotente (dedup por email).

**Spec canónica**: `docs/tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md`. Helpers: `inviteClientPortalUser`, `suggestClientPortalRole`, `listClientPortalPersonCandidates` (`src/lib/client-onboarding/`). Sin migración (capability mirror de la familia TASK-992 catalog+runtime), sin reliability signal nuevo (ítem `required=FALSE`), sin evento nuevo (reuso `role.assigned`).

### Notion onboarding preflight — "configurado ≠ fluyendo" (TASK-1009, desde 2026-06-04)

La verificación de que un cliente nuevo **fluye de verdad al portal** (raw → client_id → readiness → template L1 → conformed → PG) pasa por el composer canónico `getNotionOnboardingReadiness(spaceId)` ([src/lib/integrations/notion-onboarding-preflight.ts](src/lib/integrations/notion-onboarding-preflight.ts)). Es **reuse-first**: compone los helpers de readiness/freshness que ya existen (`getNotionRawFreshnessGate`, `space_notion_sources.last_synced_at` de TASK-1007, `resolveSecretByRef`) y solo agrega los eslabones que ninguno cubría (#6 Estado mapeable a V1, #8 tareas en `greenhouse_delivery.tasks`, #4 client_id como verificación de TASK-1004). El evaluador puro `evaluateNotionOnboardingReadiness` es la SSOT de `readyToOnboard`. El gate es el ítem **bloqueante** `verify_notion_flowing` de `standard_onboarding_v1`.

**⚠️ Reglas duras**:

- **NUNCA** duplicar la validación de onboarding que el wizard/checklist ya hacen (estructura via `resolveClientCompleteness`, token+DBs via `notion/validate`). El preflight SOLO cubre el tramo "fluyendo" — si necesitás un check nuevo, agregalo como eslabón del composer, no como validador paralelo.
- **NUNCA** agregar aliases de status/título por cliente para "pasar" el check L1 (#6). El fix es alinear el template L1 del cliente en Notion (consistente con "Canonical task status vocabulary V1"). El check usa `normalizeTaskStatus` sobre los estados distintos del space — un alias custom enmascara el drift.
- **NUNCA** marcar `verify_notion_flowing` verde estando rojo. La auto-completación vive SOLO en `POST .../cases/[caseId]/notion-preflight` (reusa capability `client.lifecycle.case.advance`), que corre el preflight server-side y avanza el ítem **solo si `readyToOnboard`**. El space se resuelve del caso server-side (anti-tamper).
- **NUNCA** correr el preflight pesado (9 checks, BQ) por caso dentro del reliability dashboard. El signal `integrations.notion.onboarding_incomplete` es un COUNT PG O(1) sobre casos abiertos con el ítem pendiente >7d; el preflight pesado es on-demand (CLI/endpoint).
- **NUNCA** colapsar advisory y crítico: token (#1) y freshness (#9) son advisory (no bloquean `readyToOnboard` — el raw landing ya prueba el token); el resto es crítico. Un crítico en `degraded` (fuente caída) ⇒ NO listo (conservador).
- **SIEMPRE** que un eslabón nuevo del pipeline emerja (otra capa, otra tabla), agregalo como check del composer + su rama en el evaluador puro + test, no inline en consumers.

**Spec canónica**: `docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md` + Delta en `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`. Migración aditiva `20260604224502258`. CLI `pnpm notion:onboarding-preflight <spaceId> [--json]`. Verificado live: Berel 9/9 verde.

### Onboarding checklist evidence layer — el estado se deriva de evidencia real, no se marca a ciegas (TASK-1017, desde 2026-06-05)

El estado de un ítem **auto-derivable** del checklist `standard_onboarding_v1` se deriva del estado REAL del runtime, no se marca a ciegas. La capa vive en `src/lib/client-lifecycle/evidence/` y extiende el patrón thin + reuse-first de TASK-1009 (`verify_notion_flowing`) a los 6 ítems auto-derivables: `verify_hubspot_company_synced`, `assign_team_members`, `provision_notion_workspace`, `provision_communication_channels`, `provision_client_users_access`, `confirm_billing_setup`. Cada resolver **reusa** el reader/tabla canónica existente (HubSpot `getClientLifecycleStage`, Notion `getNotionOnboardingReadiness`, equipo/Teams/portal/facturación por su tabla) y clasifica en **`detected | pending | unverifiable`** vía un clasificador **puro** (testeable) + gatherer IO `settle`-wrapped. El composer `resolveOnboardingEvidence(caseId)` resuelve el scope (org→client→space) **una vez** y corre los 6 en paralelo. El endpoint `POST .../cases/[caseId]/verify-evidence` (auth `client.lifecycle.case.advance`) expone la evidencia y, detrás de flag, auto-completa. Cero migración / capability / outbox / tabla.

**⚠️ Reglas duras**:

- **NUNCA** clasificar evidencia como `pending` cuando la fuente falló. Error de IO → `unverifiable` (degradación honesta; la fuente está caída, ≠ "todavía no está hecho"). El gatherer va envuelto en `settle`; el clasificador es puro y nunca lanza.
- **NUNCA** componer la evidencia de los ítems en el read del timeline/inbox (hot path de listas). Es **on-demand** (botón "Verificar evidencia" → un endpoint batched por caso). Componerla en el read = N+1 sobre BigQuery (el preflight Notion solo hace ~6 queries BQ). Mirror exacto de TASK-1009.
- **NUNCA** auto-completar un ítem sin pasar por `canAutoCompleteFromEvidence` (decisión pura SSOT): cierra SOLO si evidencia `detected` + `requires_evidence=false` + estado `pending`/`in_progress`. **Anti-fake-green** (jamás con `pending`/`unverifiable`); **respeta el override manual** (jamás sobre `completed`/`skipped`/`not_applicable`/`blocked`).
- **NUNCA** auto-completar un ítem `requires_evidence=true` (p.ej. `provision_notion_workspace`): la evidencia del sistema NO reemplaza el asset humano requerido → muestra la evidencia pero queda manual.
- **NUNCA** auto-derivar los ítems **declarativos** (`confirm_legal_documents`, `declare_engagement_kind`, `declare_commercial_terms`, `declare_engagement_phases`): no tienen fuente automática, siguen manuales, sin evidencia inventada. `isAutoDerivableItem` es la lista cerrada canónica.
- **NUNCA** activar el flag `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED=true` sin validar la evidencia contra la realidad en ≥1 caso real por resolver (production verification sequence). La exposición read va sin flag; el auto-complete (mutación) es lo gated.
- **NUNCA** crear un sync nuevo para un ítem auto-derivable: se **componen** los readers/tablas canónicas existentes. Si emerge un ítem nuevo, agregar su resolver al registry reusando su reader canónico.
- **SIEMPRE** que emerja un ítem auto-derivable nuevo, agregar (a) su `item_code` a `AUTO_DERIVABLE_ITEM_CODES`, (b) su resolver (clasificador puro + gatherer settle), (c) tests del clasificador, y (d) la rama PG-queryable al signal `client.lifecycle.evidence_detected_not_marked` si su evidencia vive en PG.

**Spec canónica**: `docs/tasks/complete/TASK-1017-onboarding-checklist-item-evidence-auto-verification.md`. Helpers: `resolveOnboardingEvidence`, `canAutoCompleteFromEvidence`, `isAutoDerivableItem` (`src/lib/client-lifecycle/evidence/`). Signal: `client.lifecycle.evidence_detected_not_marked` (commercial, drift, PG-only, steady=0). Patrón fuente: TASK-1009 (composer thin + evaluador puro + degradación honesta + auto-complete solo-si-verde).

### Git hooks canonicos (Husky + lint-staged) — auto-prevention de errores CI

Repo tiene 2 hooks instalados via Husky 9 (`pnpm prepare` los activa
automaticamente al `pnpm install`):

- **`.husky/pre-commit`**: corre `pnpm exec lint-staged` → `eslint --fix` sobre
  archivos staged. Errores auto-fixable se aplican; errores no-fixable bloquean
  el commit. Latencia tipica < 5s (cache eslint en `node_modules/.cache/eslint-staged`).
- **`.husky/pre-push`**: corre `pnpm local:check` (`pnpm lint` full repo + `pnpm exec tsc --noEmit`).
  Bloquea push si hay 1+ error. Latencia tipica < 90s. Defense in depth sobre
  pre-commit (cubre archivos NO staged que otro agente pudo dejar rotos).

**Reglas duras**:

- **NUNCA** ejecutar `git commit --no-verify` o `git push --no-verify` sin
  autorizacion explicita del usuario. Bypassear los hooks rompe el contrato
  con el CI gate y deja errores que otro agente tiene que limpiar despues
  (anti-pattern: el ciclo de revert+repush que vimos pre-2026-05-05).
- **NUNCA** desinstalar / deshabilitar / mover los hooks sin discutir antes.
  Estan disenados para autoenforcement — todos los agentes (Claude, Codex,
  Cursor) los heredan al clonar el repo.
- Si un hook falla por causa ajena a tu cambio (e.g. lint warning preexistente
  en archivo NO tocado), arreglalo solo si la regla esta en `error`. Warnings
  no bloquean. Si error preexistente bloquea, documenta en commit message
  y abrir issue/task para el cleanup separado.
- Si necesitas saltar el hook por emergencia documentada (e.g. hotfix de
  produccion bloqueante), pide autorizacion al usuario primero, documenta el
  bypass en el commit message con razon + fecha + task de cleanup posterior.

**Beneficio para multi-agente**: cualquier agente (presente o futuro) que
clone el repo y haga `pnpm install` recibe los hooks automaticamente. El CI
gate sigue activo como tercera linea de defensa.

### Avatares de usuario — helper canónico (fuente única, desde 2026-06-05)

Toda resolución de la foto/avatar de un usuario pasa por el helper canónico **`resolveAvatarUrl(avatarUrl, userId)`** en [src/lib/person-360/resolve-avatar.ts](src/lib/person-360/resolve-avatar.ts). Es la **fuente única** para que NO haya fotos distintas por todos lados: los avatares se guardan como `gs://` en la DB y se sirven SIEMPRE por el proxy canónico `/api/media/users/{userId}/avatar`; el helper hace exactamente esa traducción (`gs://` + userId → proxy URL; cualquier otra URL → tal cual; null → null).

**⚠️ Reglas duras**:

- **NUNCA** componer `/api/media/users/${userId}/avatar` inline en un consumer (es justo la duplicación que el helper evita — había copias en `get-person-profile`, `my/organization/members`, `my/assignments`, `UserDropdown`, todas reemplazadas/a reemplazar por el canónico). Toda foto de usuario sale de `resolveAvatarUrl`.
- **NUNCA** usar `session.user.avatarUrl` crudo en un `<Avatar src>` — puede ser un `gs://` no servible. Pasarlo siempre por `resolveAvatarUrl(avatarUrl, userId)` primero.
- **`resolveAvatarUrl` es `import 'server-only'`** → en un componente cliente (`'use client'`) NO se puede importar. Patrón canónico: resolverlo en el **server component / route / reader** y pasar el `avatarUrl` ya resuelto como prop/campo del VM (el cliente solo renderiza `<Avatar src={vm.avatarUrl ?? undefined}>` con fallback a iniciales). Caso fuente: `OnboardingCasesInboxView` (TASK-1015) recibe `operator.avatarUrl` resuelto en su page server.
- **SIEMPRE** que un reader/route/VM exponga un avatar de usuario, mapearlo con `resolveAvatarUrl(rawAvatarUrl, userId)` (mirror de los facets person-360 / account-360 / people / finance responsibles que ya lo consumen).

### Otras convenciones

- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Tasks nuevas: usar `TASK-###` (registrar en `docs/tasks/TASK_ID_REGISTRY.md`)
