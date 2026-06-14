# TASK-1122 — Public Site Code Baseline + GitOps Binding

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Epic: `EPIC-019`
- Status real: `In progress; repo runtime privado creado, baseline live inicial pusheado y binding manifest registrado; faltan data model/readers Greenhouse y deploy dry-run`
- Rank: `TBD`
- Domain: `platform|commercial|marketing-ops|integrations|wordpress|release`
- Blocked by: `none`
- Branch: `task/TASK-1122-public-site-code-baseline-gitops-binding`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reconciliar el codigo vivo de `efeoncepro.com` en Kinsta con un repositorio gobernado y conectar ese repositorio al futuro modulo `Public Site` de Greenhouse. El operador seguira trabajando desde Greenhouse; GitHub queda como rail versionado/deployable detras de escena.

## Why This Task Exists

`efeonce-web` existe en GitHub como repo privado del sitio publico, pero representa un rebuild Astro/headless historico y no el runtime live actual. El runtime actual es WordPress/Kinsta con Ohio + Elementor + child theme + plugins propios. Tambien existe `/Users/jreye/Documents/efeonce-sp`, que contiene codigo WordPress mucho mas cercano, pero su remote es `cesargrowth11/efeonce-sp` y no esta reconciliado con Kinsta live.

Antes de construir `greenhouse-wp-bridge`, Greenhouse necesita saber cual repo/path controla el codigo deployable del sitio publico.

## Goal

- Crear una baseline versionada del codigo WordPress live que si debe ser deployable.
- Decidir si se usa/migra `efeonce-sp` o se crea un repo `efeoncepro/*` dedicado para runtime WordPress.
- Definir el binding Greenhouse -> GitHub repo -> Kinsta deploy/rollback para child theme y plugins.
- Dejar fuera de la baseline artefactos runtime/generados, backups temporales y secretos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/public-site-repository-control-plane-discovery-20260614.md`

Reglas obligatorias:

- Greenhouse es la UI/control plane; GitHub es rail de versionado y deploy, no una segunda herramienta que el operador deba abrir para trabajar.
- No tratar `efeonce-web` como runtime source actual sin ADR nuevo de migracion headless.
- No copiar secretos, uploads, backups temporales ni CSS generado por Elementor al repo baseline.
- No parchear el parent theme `ohio`; todo cambio de template/CSS propio vive en `ohio-child`.
- Direct edits en Kinsta son emergencia; todo cambio live debe backportearse al repo baseline.

## Normative Docs

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/wp-wpcli-and-ops/SKILL.md`
- `.codex/skills/wp-plugin-development/SKILL.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- `docs/operations/discovery-public-website-wordpress-20260614.md`
- `docs/operations/discovery-public-website-elementor-20260614.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md`

## Dependencies & Impact

### Depends on

- `TASK-1111` authenticated WordPress/WP-CLI discovery.
- Existing local candidates:
  - `/Users/jreye/Documents/efeonce-web`
  - `/Users/jreye/Documents/efeonce-sp`
- Kinsta SSH/WP-CLI access.

### Blocks / Impacts

- `TASK-1116` plugin deployment path and ownership.
- Future `greenhouse-wp-bridge` release/rollback.
- Greenhouse Public Site module inventory/drift/release surfaces.
- Child theme changes such as `parts/elements/page_headline.php` and `assets/css/global-fixes.css`.

### Files owned

- `docs/operations/public-site-repository-control-plane-discovery-20260614.md`
- `docs/tasks/in-progress/TASK-1122-public-site-code-baseline-gitops-binding.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/operations/public-site-runtime-repository-binding-20260614.json`
- Runtime repo/path: `https://github.com/efeoncepro/efeonce-public-site-runtime`

## Current Repo State

### Already exists

- `efeoncepro/efeonce-web`: Astro/Vercel headless repo, not current runtime.
- `/Users/jreye/Documents/efeonce-sp`: WordPress operational repo with child theme and custom plugins, remote `cesargrowth11/efeonce-sp`.
- Live Kinsta WordPress active theme `ohio-child`; active custom plugins `eo-headless-content` and `eo-vibe-coding-api`.
- Discovery doc with first repo/runtime comparison.
- Governed runtime repo: `https://github.com/efeoncepro/efeonce-public-site-runtime` (private), baseline `0fa6bfd`, tag `baseline-2026-06-14-live`.
- Binding manifest: `docs/operations/public-site-runtime-repository-binding-20260614.json`.

### Gap

- No Greenhouse data model exists for repo binding, baseline SHA, file manifest, deploy artifact or code drift.
- No non-mutating deploy/diff dry-run lane exists yet from repo artifact to Kinsta target.
- Branch protection/release policy for `efeonce-public-site-runtime` is not configured/documented yet.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Live code export and hygiene map

- Export read-only checksums and, when approved, filesystem copies of canonical live code:
  - `wp-content/themes/ohio-child`
  - `wp-content/plugins/eo-headless-content`
  - `wp-content/plugins/eo-vibe-coding-api`
- Use the repo helper:
  - `pnpm public-website:export-live-code`
  - `pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/manual`
- Classify files as canonical, generated, backup, secret-risk or unknown.
- Produce a `.gitignore`/release artifact policy for the runtime repo.

### Slice 2 — Repository decision

- Decide one:
  - migrate/mirror `efeonce-sp` into `efeoncepro`;
  - create a new `efeoncepro/efeonce-public-site-runtime`;
  - another repo name approved by operator.
- Preserve `efeonce-web` as historical/headless reference unless a separate ADR reopens migration.
- Record repo URL, default branch, protected branch strategy and deploy folder layout.

### Slice 3 — Baseline commit

- Commit reconciled live baseline to the chosen repo.
- Include only canonical runtime code and docs needed for deploy/rollback.
- Tag or record baseline SHA in Greenhouse docs.

### Slice 4 — Greenhouse binding contract

- Define the Greenhouse model/reader shape for:
  - public-site repository binding;
  - live Kinsta code manifest;
  - baseline SHA;
  - drift status;
  - deploy/release record.
- Keep it implementation-ready for a later UI/API task.

### Slice 5 — Deployment lane dry-run

- Prove a non-mutating or no-op deployment/diff path from repo artifact to Kinsta target.
- Do not overwrite live code until a later release task explicitly approves deployment.

## Out of Scope

- Building the `greenhouse-wp-bridge` plugin itself.
- Publishing or changing live WordPress content.
- Clearing Kinsta cache.
- Migrating `efeoncepro.com` to Astro/headless.
- Building the Greenhouse UI surface.
- Committing uploads, media, database dumps, `.env`, secrets or Kinsta config.

## Detailed Spec

Baseline manifest shape candidate:

```ts
type PublicSiteCodeBaselineV1 = {
  contractVersion: 'public-site-code-baseline.v1'
  repository: {
    provider: 'github'
    owner: string
    name: string
    defaultBranch: string
    baselineSha: string
  }
  kinsta: {
    siteUrl: 'https://efeoncepro.com'
    wordpressPath: '/www/efeoncegroup_752/public'
  }
  artifacts: Array<{
    kind: 'theme' | 'plugin'
    wordpressPath: string
    repositoryPath: string
    liveHash: string
    repoHash: string
    status: 'in_sync' | 'repo_missing' | 'live_only' | 'drifted' | 'ignored'
  }>
}
```

Greenhouse should show repo status to the operator, but direct GitHub interaction remains optional/behind-the-scenes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- `TASK-1116` must not create a bridge plugin in an unconfirmed repo/path.
- Any live filesystem write waits for a later explicit release/deploy task.

### Evidence so far

- 2026-06-14: added and ran `pnpm public-website:export-live-code`.
- Export output: `tmp/public-site-code-baselines/2026-06-14T13-18-16-257Z/` (ignored local artifact).
- Manifest exported 49 files from live Kinsta code candidates.
- Found: `ohio-child`, `eo-headless-content`, `eo-vibe-coding-api`.
- Missing: `eo-ohio-elementor-widgets`, `eo-ohio-gutenberg-blocks`, `ohio-hubspot-form-styler`.
- 2026-06-14 follow-up export: `tmp/public-site-code-baselines/2026-06-14T13-47-14-635Z/`.
- Created private repo `efeoncepro/efeonce-public-site-runtime`.
- Initial runtime baseline commit pushed: `0fa6bfd`.
- Initial baseline tag pushed: `baseline-2026-06-14-live`.
- Baseline tracks 47 canonical files; excludes 2 live backup artifacts recorded in `manifests/live-baseline-2026-06-14T134717Z.json`.
- Added non-mutating drift helper `pnpm public-website:diff-runtime`.
- Drift evidence written to `docs/operations/public-site-drift/drift-2026-06-14T14-13-37-068Z.json`: `in_sync=47`, `ignored_live=2`, `drifted=0`, `repo_missing=0`, `repo_extra=0`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Baseline omite un archivo live necesario | WordPress/Kinsta | medium | Hash manifest + live-vs-repo diff before deploy | drift status `repo_missing` |
| Se versionan backups/generados y ensucian deploys | GitHub/release | medium | Ignore policy + file classification gate | many `*.bak-*` or generated CSS in diff |
| Repo elegido no esta bajo control Efeonce | GitHub/access | medium | Transfer/mirror to `efeoncepro` or explicit access decision | remote owner not `efeoncepro` |
| Greenhouse depende de GitHub UI manual | Product ops | medium | Greenhouse command/read model + repo binding | release action has no Greenhouse audit record |
| Direct edit en Kinsta genera drift | WordPress/Kinsta | high | emergency-only policy + backport requirement | live hash != baseline hash |

### Feature flags / cutover

- No runtime flag in this task.
- Future Greenhouse write/deploy commands must remain disabled until a repo binding exists.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Discard local/exported inventory artifacts | <5 min | si |
| Slice 2 | Reopen repository decision before baseline commit | <30 min | si |
| Slice 3 | Revert baseline commit or create correction commit | <15 min | si |
| Slice 4 | Revert docs/schema proposal | <10 min | si |
| Slice 5 | Stop before live write; no-op dry-run only | immediate | si |

### Production verification sequence

1. Confirm repo owner/path.
2. Confirm live Kinsta hash inventory.
3. Confirm repo baseline hash inventory.
4. Confirm ignored/generated files are not deploy candidates.
5. Confirm Greenhouse docs record baseline SHA and next bridge path.
