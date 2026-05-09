# TASK-561 — Ops Registry Federation Contract for Sister Repos

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `design`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-558`, `TASK-559`
- Branch: `task/TASK-561-ops-registry-federation-contract-sister-repos`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar el contrato federado de `Ops Registry` para repos hermanos: identidad compuesta, config local por repo, outputs comunes, API/MCP compatibles y estrategia de operación/agregación futura sin centralizar la source of truth.

## Why This Task Exists

Greenhouse no quiere un helper local que solo sirva en este repo. Si el framework operativo ya existe en varios repos, la federación debe quedar explícita antes de que cada repo haga su propia variante incompatible.

## Goal

- definir el contrato cross-repo
- dejar claro qué es core compartido y qué es policy local por repo
- preparar un agregador futuro sin introducirlo todavía
- definir cómo se enrutan comandos de lectura y escritura entre repos
- definir cómo se versionan y overridian templates/policies por repo sin romper compatibilidad

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- identidad cross-repo compuesta `repoId:artifactId`
- federación por outputs derivados, no por centralización prematura
- API y MCP deben ser compatibles entre repos hermanos
- cada repo puede overridear templates/policies solo mediante config explícita y versionada

## Dependencies & Impact

### Depends on

- `TASK-558`
- `TASK-559`

### Blocks / Impacts

- futuros follow-ons de agregador cross-repo
- futuro mirror a Notion

### Files owned

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `src/lib/ops-registry/**`
- `ops-registry.config.ts`

## Scope

### Slice 1 — Cross-repo identity and outputs

- identidad compuesta
- outputs comunes por repo
- reglas de compatibilidad mínimas

### Slice 2 — Cross-repo API / MCP contract

- shape común para lectura
- shape común para comandos write-safe
- estrategia de routing al repo dueño del artefacto

### Slice 3 — Shared core vs local policy + progressive package extraction

**Decisión arquitectónica (Delta 2026-05-07)**: extracción progresiva a `@efeonce/ops-registry` workspace package + private registry, NO en V1.

**Fase 1 (V1 — TASK-558/559/560)**: el core vive en `src/lib/ops-registry/**` dentro de greenhouse-eo, **arquitecturado como extractable**:

- cero `import '@/...'` o paths Greenhouse-specific dentro del core
- toda especificidad Greenhouse vive detrás de `ops-registry.config.ts`
- extractability gate enforced por CI grep: `grep -rE "@/lib/|@/components/|@/types/" src/lib/ops-registry/` retorna 0
- `package.json` interno-modular: la extracción mañana es `mv src/lib/ops-registry packages/ops-registry/src` + actualizar imports

**Fase 2 (esta task — TASK-561)**: cuando un segundo repo (Kortex, hubspot-bigquery, sister) lo necesite **de verdad**, extraer:

- bootstrap pnpm workspaces en greenhouse-eo (`pnpm-workspace.yaml` + `packages/`)
- mover a `packages/ops-registry/` con `name: "@efeonce/ops-registry"` privado
- greenhouse-eo lo consume vía `workspace:*`
- publicar a **GitHub Packages npm** (`npm.pkg.github.com/@efeonce`) — reusa WIF + `gh` ya autenticados
- sister repos: `pnpm add -D @efeonce/ops-registry`

**Modos de consumo del paquete**:

| Modo | Comando | Uso |
| --- | --- | --- |
| Bootstrap | `npx @efeonce/ops-registry init` | Genera `ops-registry.config.ts` + `.generated/` |
| Daily ops | `pnpm exec ops-registry validate` | Pinneado por lockfile, reproducible |
| Library import | `import { parseTask } from '@efeonce/ops-registry/parser'` | Validators custom del repo |
| MCP server | `~/.claude/mcp_servers.json` apunta al bin | Claude/Codex consumen tools |

**Por qué progresivo y NO V1**:

- premature abstraction sin segundo consumidor: probabilidad de que el primer diseño de overrides API sea correcto = baja
- overhead pnpm workspaces (turbo/changeset) no se paga sin retorno
- CI velocity: workspace package activa rebuild de todo el grafo en cada cambio del core

**Razón arquitectónica para preferir GitHub Packages npm sobre Artifact Registry**:

- WIF + `gh` ya autenticados; cero infra nueva
- consumibles con `.npmrc` simple (sin gcloud auth helper en cada repo)
- alineado con flow de desarrollo (PRs en GitHub)

**Separación core vs config-by-repo** (qué vive dónde):

| Capa | Vive en | Ejemplo |
| --- | --- | --- |
| Schema artifacts + zod validators | core (paquete) | `ArtifactSchema`, `TaskSchema`, `EpicSchema` |
| Parser markdown (remark/unified) | core | `parseFrontmatter`, `parseRelationships` |
| Validators canónicos | core | `lifecycleVsFolderValidator`, `brokenLinksValidator` |
| Command handlers + materializers | core | `createTaskCommand`, `closeTaskCommand` |
| Outbox event emitters (16 schemas v1) | core | `emitOpsRegistryEvent` |
| Capability declarations per command | core | `ops.task.create:create`, etc. |
| MCP server scaffolding | core | tool registration + dry_run preview |
| `repoId` + paths canónicos | repo config | `ops-registry.config.ts` |
| Taxonomías y aliases de dominio | repo config | `domains: ['finance','hr',...]` |
| Validadores custom del repo | repo config (extension hook) | `customValidators[]` |
| Overrides de templates/procesos | repo config | `templateOverrides` (versionado) |
| Mapping de `artifact policies` activos | repo config | `enabledPolicies: ['task','epic',...]` |

### Slice 4 — Aggregation contract

- shape esperado para un agregador futuro
- límites explícitos de V1 para no construirlo antes de tiempo

## Out of Scope

- agregador cross-repo productivo
- panel único multi-repo
- sincronización bidireccional con Notion

## Acceptance Criteria

- [ ] Existe contrato explícito de federación para repos hermanos
- [ ] Queda definido qué parte vive en core compartido y qué parte en config/policies del repo
- [ ] El diseño deja claro cómo crecer a agregación cross-repo sin romper la truth local
- [ ] El contrato deja explícito cómo consultar y mutar artefactos entre repos vía API/MCP compatibles
- [ ] El contrato deja explícito cómo repos hermanos comparten o overridean templates/procesos por tipo de artefacto

## Verification

- revisión documental cruzada con `GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- chequeo de consistencia con schema/config del registry

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- agregador cross-repo
- mirror operacional a Notion
