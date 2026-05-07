# TASK-822 — Client Portal Domain Consolidation: src/lib/client-portal/ + Reader Migration

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none`
- Branch: `task/TASK-822-client-portal-domain-consolidation`

## Summary

Crea la carpeta canónica `src/lib/client-portal/` y migra los readers que hoy viven dispersos en `src/lib/agency/`, `src/lib/account-360/`, `src/lib/ico-engine/` (los que sirven al portal cliente) sin cambiar comportamiento. Establece el módulo como dominio de primer nivel con su propio Sentry domain `client_portal`, helpers internos y boundary explícito vía exports.

## Why This Task Exists

Hoy "client portal" es un route group + lente de visibilidad sin owner técnico. Cualquier cambio cross-cutting (e.g. agregar un card al Creative Hub) requiere tocar 5+ archivos en 3 dominios. La consolidación es prerequisito estructural para los slices 2-8 (que introducen módulos on-demand): sin un home canónico para los readers, los siguientes slices van a duplicar lógica o ensuciar dominios productores.

## Goal

- `src/lib/client-portal/` con subcarpetas estándar: `readers/`, `commands/`, `dto/`, `helpers/`
- Migración por re-export de readers existentes que sirven al cliente (NO cambiar callers en V1.0; mantener back-compat)
- `src/lib/client-portal/index.ts` exporta surface pública del dominio
- Sentry domain `client_portal` registrado en `captureWithDomain` whitelist
- Documentación inline (JSDoc) en cada export listando data_sources que lee

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §3 (Domain Boundary), §17 (Dependencies)
- `docs/architecture/GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md` — patrones de dominio
- `CLAUDE.md` sección "Sentry + reliability rollup" + "Output redaction"

Reglas obligatorias:

- NO duplicar lógica al migrar; re-export desde nueva carpeta
- NO cambiar comportamiento (esta es task de consolidación, no de feature)
- Sentry domain `client_portal` agregado a whitelist en `src/lib/observability/capture.ts`
- JSDoc en cada export listando `data_sources[]` (acopla con TASK-824 modules.data_sources catalog)
- Mantener back-compat: callers existentes pueden seguir importando desde paths viejos (re-export con deprecation comment)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/observability/capture.ts` (TASK-742) ✅ existe
- Readers existentes en `src/lib/agency/`, `src/lib/account-360/`, `src/lib/ico-engine/`

### Blocks / Impacts

- TASK-823 (API namespace) — necesita el módulo lib creado
- TASK-825 (resolver) — vive bajo `src/lib/client-portal/modules/`
- TASK-827 (composition layer UI) — consume `src/lib/client-portal/index.ts`

### Files owned

- `src/lib/client-portal/index.ts`
- `src/lib/client-portal/readers/` (re-exports + new readers)
- `src/lib/client-portal/dto/` (interfaces compartidas)
- `src/lib/client-portal/helpers/`
- `src/lib/observability/capture.ts` (extender domain whitelist)

## Current Repo State

### Already exists

- `src/lib/agency/` con readers ICO + creative hub
- `src/lib/account-360/` con readers de cuenta
- `src/lib/ico-engine/` con métricas
- `captureWithDomain` (TASK-742)

### Gap

- No existe `src/lib/client-portal/` carpeta
- No existe Sentry domain `client_portal` (errors van a `commercial` o `agency`)
- Sin boundary explícito → cualquier reader new ad-hoc cae en `agency/` por inercia

## Scope

### Slice 1 — Estructura de carpeta + index

- Crear `src/lib/client-portal/{readers,commands,dto,helpers}/`
- `src/lib/client-portal/index.ts` con barrel exports
- README inline documentando boundary

### Slice 2 — Sentry domain registration

- Extender `src/lib/observability/capture.ts` con domain `client_portal`
- Tests unit del domain whitelist

### Slice 3 — Migration por re-export

Identificar readers que sirven exclusivamente al portal cliente y crear re-exports:

- `src/lib/client-portal/readers/account-summary.ts` → re-export `getClientAccountSummary` from `account-360`
- `src/lib/client-portal/readers/ico-overview.ts` → re-export from `ico-engine`
- `src/lib/client-portal/readers/creative-hub.ts` → re-export 16 cards composers from `agency/`
- `src/lib/client-portal/readers/assigned-team.ts` → re-export from `agency/assigned-team` (TASK-535 Delta)
- `src/lib/client-portal/readers/pulse.ts` → re-export

JSDoc en cada export con `@dataSources` tag listando los dominios que lee.

### Slice 4 — Tests no-regression

- Smoke import test desde `@/lib/client-portal` para cada export
- Verificar que callers existentes (consumers) siguen funcionando con paths viejos
- `pnpm tsc --noEmit` verde

## Out of Scope

- Crear nuevos readers (ese es trabajo de slices posteriores)
- Cambiar comportamiento de readers existentes
- Modificar callers existentes (back-compat preservado vía re-export)
- DDL — TASK-824
- API endpoints — TASK-823
- Resolver canónico — TASK-825

## Detailed Spec

```
src/lib/client-portal/
├── README.md                          # boundary + data ownership rules
├── index.ts                           # barrel public exports
├── dto/
│   ├── module.ts                      # ResolvedClientPortalModule interface (preview, used by slice 4 TASK-825)
│   └── index.ts
├── readers/
│   ├── account-summary.ts             # re-export from account-360
│   ├── ico-overview.ts                # re-export from ico-engine
│   ├── creative-hub.ts                # re-export from agency creative hub
│   ├── assigned-team.ts               # re-export from agency assigned team
│   ├── pulse.ts                       # re-export from agency pulse
│   ├── csc-pipeline.ts                # re-export
│   ├── brand-intelligence.ts          # re-export
│   └── index.ts
├── commands/                          # vacía en V1.0; usada por TASK-825/826
├── helpers/
│   └── index.ts
```

JSDoc canonical pattern:

```ts
/**
 * Returns the account summary visible to a client user.
 *
 * @dataSources commercial.engagements, finance.invoices, agency.ico
 * @clientFacing true
 * @routeGroup client
 */
export { getClientAccountSummary } from '@/lib/account-360/queries'
```

## Acceptance Criteria

- [ ] Carpeta `src/lib/client-portal/` creada con subestructura completa
- [ ] `src/lib/client-portal/index.ts` exporta todos los readers re-exportados
- [ ] Cada export tiene JSDoc con `@dataSources` tag
- [ ] Sentry domain `client_portal` agregado a whitelist
- [ ] `captureWithDomain(err, 'client_portal', ...)` funciona en tests
- [ ] Callers existentes siguen funcionando (no se rompe nada — back-compat)
- [ ] `pnpm tsc --noEmit` verde
- [ ] `pnpm lint` verde
- [ ] `pnpm test` verde (smoke import tests pasan)

## Verification

- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm test src/lib/client-portal`
- Grep `import.*from.*@/lib/client-portal` debe estar vacío después de la task (back-compat) — los re-exports están listos para que slices futuros lo consuman

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo cruzado: TASK-823, TASK-825 desbloqueadas

## Follow-ups

- TASK-823 puede arrancar inmediatamente
- Considerar deprecation lints sobre paths viejos en V1.1 cuando todos los callers migren a `@/lib/client-portal/*`

## Open Questions

- ¿Re-exports preservar firma exacta o permitir thin adaptation (e.g. agregar `clientPortalContext` opcional)? Recomendación: firma exacta en V1.0 (back-compat puro); adaptation en V1.1 si emerge necesidad.
