# TASK-822 — Client Portal Domain Consolidation: src/lib/client-portal/ BFF Layer + Reader Migration

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Implementacion v1.1 (sobre develop directamente, sin branch separada por instruccion explicita 2026-05-12)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none`
- Branch: `develop` (direct work, no feature branch — user override)

## Delta 2026-05-12 (arch-architect verdict aplicado)

Tres correcciones estructurales aplicadas al spec original antes de Slice 1:

1. **Reframe semántico** — `src/lib/client-portal/` es un **BFF / Anti-Corruption Layer** del route group `client`, NO el owner físico de los datos que expone. Re-export NO transfiere ownership. `account-360/`, `agency/`, `ico-engine/` siguen siendo owners canónicos de sus readers.
2. **Module classification dual** — los readers viven en `readers/curated/` (re-exports de dominios productores) o `readers/native/` (nacidos en client-portal, V1.1+). Distinción explícita evita que un agente futuro mueva físicamente readers fuera de su dominio owner.
3. **Domain boundary direction declarada + enforced** — `client_portal` es hoja del DAG: importa de Commercial/Finance/Account360/ICO Engine/Identity; NUNCA es importado por ellos. ESLint rule canónica bloquea el camino inverso.

Adicional: `@dataSources` JSDoc reemplazado por export TS tipado (machine-checkable, grep-able, compile-checked). `commands/` carpeta vacía removida de V1.0 (anti-pattern; crear cuando TASK-825/826 la necesiten). Acceptance criteria extendido con smoke test del Sentry domain efectivo.

## Summary

Crea la carpeta canónica `src/lib/client-portal/` como **BFF / Anti-Corruption Layer** del route group `client` y migra por re-export los readers de dominios productores (`agency`, `account-360`, `ico-engine`) que sirven al portal cliente. NO transfiere ownership; los readers siguen siendo owned por sus dominios canónicos. Establece el módulo como hoja del DAG con Sentry domain `client_portal`, exports tipados de metadata (`data_sources[]`), boundary direction enforced por ESLint y módulo classification dual (curated vs native).

## Why This Task Exists

Hoy "client portal" es un route group + lente de visibilidad sin owner técnico ni boundary explícito. Cualquier cambio cross-cutting (e.g. agregar un card al Creative Hub) requiere tocar 5+ archivos en 3 dominios. Es prerequisito estructural para los slices 2-8 (que introducen módulos on-demand): sin un **BFF canónico curado** sobre readers de dominios productores, los siguientes slices van a duplicar lógica o ensuciar dominios productores.

El framing correcto: client_portal **NO es un dominio productor** (ver spec §1 "compositivo, no productor"). Es la capa de presentación curada que el route group `client` consume. Los readers re-exportados siguen owned por sus dominios canónicos (`account-360`, `agency`, `ico-engine`); client_portal los **expone**, no los **posee**.

## Goal

- `src/lib/client-portal/` con subcarpetas estándar: `readers/curated/` + `readers/native/` + `dto/` + `helpers/` (sin `commands/` en V1.0 — crearlo cuando TASK-825/826 lo requieran)
- Migración **por re-export** de readers de dominios productores que sirven al portal cliente; ownership permanece en el dominio original
- `src/lib/client-portal/index.ts` exporta surface pública del BFF
- Sentry domain `client_portal` registrado en `captureWithDomain` whitelist
- **Metadata tipada machine-checkable** por export (`ClientPortalReaderMeta`) listando `dataSources[]`, `clientFacing`, `routeGroup` — NO JSDoc tags (no enforceable)
- ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` enforcing domain direction (client_portal es hoja del DAG)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §1 (Core Thesis: compositivo), §3 (Domain Boundary), §3.1 (Module classification — agregada por esta task), §3.2 (Domain import direction — agregada por esta task), §17 (Dependencies)
- `CLAUDE.md` sección "Sentry + reliability rollup" + "Output redaction"
- Patrones canonizados reusados:
  - TASK-721 (canonical helper enforcement: lint rule + módulo + override block)
  - TASK-742 (defense-in-depth: Sentry domain whitelist = layer 4 observability)
  - TASK-780 (declarative platform pattern reusado en TASK-825 resolver)

Reglas obligatorias:

- NO duplicar lógica al migrar; re-export puro desde la nueva carpeta
- NO cambiar comportamiento (consolidación de presentación, no feature)
- NO mover físicamente readers fuera de su dominio owner. `account-360/queries.ts` sigue siendo source; `client-portal/readers/curated/account-summary.ts` re-exporta
- Sentry domain `client_portal` agregado a whitelist en `src/lib/observability/capture.ts`
- Cada export bajo `readers/curated/` o `readers/native/` declara `ClientPortalReaderMeta` tipado (compile-checked, grep-able)
- Mantener back-compat: callers existentes pueden seguir importando desde paths viejos (re-export sin deprecation hard en V1.0; deprecation lint warning sale en V1.1 cuando los siblings hayan migrado)
- ESLint rule canónica bloquea imports de `@/lib/client-portal/*` desde `src/lib/{agency,finance,hr,account-360,ico-engine,identity}/**` (regla de hoja del DAG)

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
- `src/lib/client-portal/README.md` (boundary + classification rules)
- `src/lib/client-portal/dto/reader-meta.ts` (`ClientPortalReaderMeta` interface)
- `src/lib/client-portal/dto/index.ts`
- `src/lib/client-portal/readers/curated/` (re-exports de dominios productores)
- `src/lib/client-portal/readers/native/` (vacío en V1.0; documentado para V1.1+)
- `src/lib/client-portal/readers/index.ts`
- `src/lib/client-portal/helpers/index.ts`
- `src/lib/observability/capture.ts` (extender domain whitelist con `client_portal`)
- `eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal.mjs` (nuevo)
- `eslint.config.mjs` (wire-up regla)

## Current Repo State

### Already exists

- `src/lib/agency/` con readers ICO + creative hub (owner canónico)
- `src/lib/account-360/` con readers de cuenta (owner canónico)
- `src/lib/ico-engine/` con métricas (owner canónico)
- `captureWithDomain` (TASK-742) + sistema de dominios Sentry
- Patrón ESLint custom plugin `eslint-plugins/greenhouse/` (TASK-721, TASK-766, TASK-768, TASK-846)

### Gap

- No existe `src/lib/client-portal/` carpeta
- No existe Sentry domain `client_portal` (errors van a `commercial` o `agency` por defecto)
- Sin boundary explícito → cualquier reader nuevo client-facing cae en `agency/` por inercia
- Sin lint que prevenga imports inversos `agency → client_portal` (riesgo de ciclos a 3-6 meses)
- Sin distinción curated vs native → readers re-exportados pueden ser percibidos como owned por client_portal, invitando movimiento físico erróneo

## Scope

### Slice 1 — Estructura BFF + DTO tipado de metadata

- Crear `src/lib/client-portal/{readers/curated,readers/native,dto,helpers}/` (sin `commands/` en V1.0)
- `src/lib/client-portal/dto/reader-meta.ts` con interface `ClientPortalReaderMeta` (tipado, machine-checkable)
- `src/lib/client-portal/index.ts` con barrel exports (re-exports puros)
- `src/lib/client-portal/README.md` documentando boundary, classification dual (curated vs native), domain direction (hoja del DAG)

### Slice 2 — Sentry domain registration (layer 4 de TASK-742)

- Extender whitelist en `src/lib/observability/capture.ts` con `'client_portal'`
- Tests unit del domain whitelist
- Smoke test que verifica que `captureWithDomain(err, 'client_portal', { extra })` produce evento Sentry con tag `domain=client_portal` activo (no solo strings en código)

### Slice 3 — ESLint rule canónica `no-cross-domain-import-from-client-portal`

- Crear `eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal.mjs` modo `error`
- Bloquea imports de `@/lib/client-portal/*` desde `src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/**`
- Wire-up en `eslint.config.mjs` con override block para `src/lib/client-portal/**` (módulo puede importarse a sí mismo)
- Test unit del rule con fixtures matched/unmatched

### Slice 4 — Migration por re-export (carpeta `readers/curated/`)

Identificar readers que sirven al portal cliente y crear re-exports tipados:

- `src/lib/client-portal/readers/curated/account-summary.ts` → re-export `getClientAccountSummary` from `account-360`
- `src/lib/client-portal/readers/curated/ico-overview.ts` → re-export from `ico-engine`
- `src/lib/client-portal/readers/curated/creative-hub.ts` → re-export 16 cards composers from `agency/`
- `src/lib/client-portal/readers/curated/assigned-team.ts` → re-export from `agency/assigned-team` (TASK-535 Delta)
- `src/lib/client-portal/readers/curated/pulse.ts` → re-export
- `src/lib/client-portal/readers/curated/csc-pipeline.ts` → re-export
- `src/lib/client-portal/readers/curated/brand-intelligence.ts` → re-export

Cada archivo exporta **además** un `ClientPortalReaderMeta` tipado con `dataSources[]`, `clientFacing`, `routeGroup`. Esto es el contrato canónico que TASK-824 va a consumir para validar contra `modules.data_sources[]` catalog.

### Slice 5 — Tests no-regression + verification

- Smoke import test desde `@/lib/client-portal` para cada export curated
- Smoke test del Sentry domain efectivo (no solo whitelist textual)
- Verificar que callers existentes siguen funcionando con paths viejos (back-compat 100%)
- `pnpm tsc --noEmit` verde
- `pnpm lint` verde (incluye nueva rule)

## Out of Scope

- Crear nuevos readers nativos (V1.1+; en V1.0 `readers/native/` queda vacío con README documentando convención)
- Cambiar comportamiento de readers existentes (consolidación de presentación, no feature)
- Mover físicamente readers fuera de su dominio owner (NUNCA; los owners canónicos `account-360`, `agency`, `ico-engine` retienen ownership)
- Modificar callers existentes (back-compat preservado vía re-export)
- Deprecation lints sobre paths viejos (V1.1, cuando todos los callers client-facing hayan migrado)
- Carpeta `commands/` (anti-pattern crearla vacía; emerge cuando TASK-825/826 la necesiten)
- DDL — TASK-824
- API endpoints — TASK-823
- Resolver canónico — TASK-825

## Detailed Spec

### Folder structure (canónica V1.0)

```text
src/lib/client-portal/
├── README.md                                # BFF boundary + classification rules
├── index.ts                                 # barrel public exports
├── dto/
│   ├── reader-meta.ts                       # ClientPortalReaderMeta interface
│   └── index.ts
├── readers/
│   ├── index.ts                             # barrel
│   ├── curated/                             # re-exports de dominios productores
│   │   ├── account-summary.ts
│   │   ├── ico-overview.ts
│   │   ├── creative-hub.ts
│   │   ├── assigned-team.ts
│   │   ├── pulse.ts
│   │   ├── csc-pipeline.ts
│   │   └── brand-intelligence.ts
│   └── native/                              # vacío V1.0; README explica convención
│       └── README.md
└── helpers/
    └── index.ts
```

NOTA: `commands/` NO existe en V1.0. Cuando TASK-825 introduzca el resolver y TASK-826 los admin endpoints, esa carpeta nace ahí con contenido real.

### `ClientPortalReaderMeta` interface (single source of truth)

```ts
// src/lib/client-portal/dto/reader-meta.ts

/** Dominios productores válidos de los que un reader BFF puede consumir. */
export type ClientPortalDataSource =
  | 'commercial.engagements'
  | 'commercial.deals'
  | 'commercial.quotes'
  | 'finance.invoices'
  | 'finance.payments'
  | 'agency.ico'
  | 'agency.csc'
  | 'agency.brand_intelligence'
  | 'agency.creative_hub'
  | 'agency.revenue_enabled'
  | 'agency.pulse'
  | 'account_360.summary'
  | 'account_360.economics'
  | 'delivery.tasks'
  | 'delivery.projects'
  | 'assigned_team.assignments'
  | 'identity.organizations'

/**
 * Metadata canónica de un reader BFF del portal cliente.
 * Compile-checked (no JSDoc), grep-able, y consumible por TASK-824 catalog validation.
 */
export interface ClientPortalReaderMeta {
  /** Identificador estable del reader (matchea el nombre del archivo). */
  readonly key: string
  /** Clasificación: re-export de dominio productor (`curated`) o nacido aquí (`native`). */
  readonly classification: 'curated' | 'native'
  /** Si es curated, dominio owner canónico que retiene el reader (`account-360`, `agency`, `ico-engine`). */
  readonly ownerDomain: string | null
  /** Whitelist de dominios productores que alimentan la lectura. */
  readonly dataSources: readonly ClientPortalDataSource[]
  /** Si la lectura cruza un boundary client-facing (todos los V1.0 son `true`). */
  readonly clientFacing: boolean
  /** Route group canónico del consumidor primario. */
  readonly routeGroup: 'client' | 'agency' | 'admin'
}
```

### Pattern canónico per archivo curated

```ts
// src/lib/client-portal/readers/curated/account-summary.ts

import type { ClientPortalReaderMeta } from '../../dto/reader-meta'

/**
 * Account summary visible al cliente en su portal.
 * OWNER CANÓNICO: src/lib/account-360/queries.ts.
 * Esta capa es solo BFF — la firma sigue lo que account-360 exponga.
 */
export { getClientAccountSummary } from '@/lib/account-360/queries'

export const accountSummaryMeta: ClientPortalReaderMeta = {
  key: 'account-summary',
  classification: 'curated',
  ownerDomain: 'account-360',
  dataSources: ['commercial.engagements', 'finance.invoices', 'agency.ico'],
  clientFacing: true,
  routeGroup: 'client',
}
```

### ESLint rule canónica

```js
// eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal.mjs

// Bloquea: src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/**
// importando de @/lib/client-portal/*
// Razón: client_portal es BFF + hoja del DAG. Inversión = ciclo silencioso.
// Override block en eslint.config.mjs exime archivos bajo src/lib/client-portal/**
```

## Acceptance Criteria

- [ ] Carpeta `src/lib/client-portal/` creada con subestructura V1.0 (sin `commands/`)
- [ ] `src/lib/client-portal/dto/reader-meta.ts` declara `ClientPortalReaderMeta` con type union de `ClientPortalDataSource`
- [ ] `src/lib/client-portal/index.ts` exporta todos los readers curated + sus meta tipados
- [ ] Cada archivo en `readers/curated/` exporta un `*Meta: ClientPortalReaderMeta` con `classification: 'curated'` y `ownerDomain` no-null
- [ ] `readers/native/README.md` documenta la convención para readers nativos V1.1+
- [ ] Sentry domain `client_portal` agregado a whitelist en `src/lib/observability/capture.ts`
- [ ] Smoke test verifica que `captureWithDomain(err, 'client_portal', {extra})` produce evento Sentry con tag `domain=client_portal` (no solo string match en código)
- [ ] ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` modo `error` activa
- [ ] Override block en `eslint.config.mjs` exime `src/lib/client-portal/**` de la rule
- [ ] Test unit del rule con fixtures positivos (bloqueado) y negativos (permitido)
- [ ] Callers existentes siguen funcionando (back-compat 100% — no se cambia ningún consumer en V1.0)
- [ ] `pnpm tsc --noEmit` verde
- [ ] `pnpm lint` verde
- [ ] `pnpm test src/lib/client-portal` verde

## Verification

- `pnpm tsc --noEmit`
- `pnpm lint` (incluye la nueva rule)
- `pnpm test src/lib/client-portal`
- `pnpm test eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal`
- Grep negativo: `rg "from '@/lib/client-portal" src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/` debe estar vacío (defense in depth además del lint)
- Grep positivo de cobertura curated: cada archivo en `readers/curated/` exporta exactamente 1 `*Meta` matching `ClientPortalReaderMeta`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo cruzado: TASK-823, TASK-824, TASK-825 desbloqueadas
- [ ] Spec `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §3.1 (Module classification) + §3.2 (Domain import direction) reflejan lo implementado

## Follow-ups

- TASK-823 puede arrancar inmediatamente
- TASK-824 (catalog DDL) validará al insertar que `modules.data_sources[]` ∈ `ClientPortalDataSource` type union (cross-check TS ↔ DB; falta lint si emerge drift)
- V1.1: deprecation lint warning sobre imports desde paths viejos cuando todos los callers client-facing hayan migrado a `@/lib/client-portal/*`
- V1.1: si emerge primer reader **nativo** (no re-export), va a `readers/native/` con `classification: 'native'` y `ownerDomain: null`

## Open Questions

- ¿Re-exports preservar firma exacta o permitir thin adaptation (e.g. agregar `clientPortalContext` opcional)? Recomendación: firma exacta en V1.0 (back-compat puro); adaptation V1.1 si emerge necesidad. Si se adapta, deja de ser `curated` puro → reclasificar como `native` con `ownerDomain` documentando la fuente original.
- ¿Quién es el primer reader candidato a `native` en V1.1? Sospecha: el resolver de TASK-825 (`resolveClientPortalModulesForOrganization`) — nace nativamente en client_portal porque no tiene owner previo en otro dominio. Confirmar al diseñar TASK-825.
- ¿`ClientPortalDataSource` type union se sincroniza con `modules.data_sources` enum DB de TASK-824? Recomendación: sí, agregar parity test (`*.live.test.ts`) que rompe build si TS y DB divergen — mismo patrón que TASK-611 capabilities_registry parity.
