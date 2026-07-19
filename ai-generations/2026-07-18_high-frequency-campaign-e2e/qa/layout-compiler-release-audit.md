# QA Release Audit - Campaign Layout Compiler V1

## Verdict

PASS

Closure state: complete

## Scope

- Changed files reviewed: `scripts/creative/layout-compiler/`, package scripts/dependencies, executable contract,
  generated SVG/manifests/QA evidence, architecture/functional/manual docs and mirrored Codex/Claude skills.
- Runtime or environment reviewed: local deterministic CLI on the High Frequency worked example plus private GCS
  archival verified with authenticated `gcloud`; no product runtime, provider API or media platform was changed.
- Out of scope / unrelated worktree changes: none observed.

## Risk Classification

| Risk                                       | Level      | Why                                                                  |
| ------------------------------------------ | ---------- | -------------------------------------------------------------------- |
| Local developer/creative tooling           | Low-Medium | New CLI, schema, renderer and hashes; no deployed consumer           |
| AI/agent workflow documentation            | Low-Medium | Changes shared production instructions, not model autonomy           |
| Creative output fidelity                   | Medium     | Incorrect layout or lineage could silently degrade a campaign set    |
| Runtime/deploy/auth/data/provider calls    | None       | No runtime wiring, secrets, IAM, deploy or model/provider calls       |
| Existing private GCS archival              | Low        | Canonical upload path exercised; manifest carries size, hash and URI  |

## Injected Skills

- `design-studio`: governed layout, finish and human craft responsibilities.
- `greenhouse-ai-image-generator`: preserved the clean-plate/provider boundary.
- `software-architect-2026`: reviewed deterministic boundaries, portability and extension contract.
- `greenhouse-browser-diagnostics`: loaded because QA routing matched a documentation-only task link; no browser
  or Greenhouse UI surface changed, so route/GVC gates do not apply.
- `greenhouse-documentation-governor`: enforced technical, functional and manual documentation plus continuity.
- `greenhouse-qa-release-auditor`: issued this final risk-based verdict.

## Evidence

| Gate                      | Result | Evidence                                                                                   |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Compiler unit/adversarial | PASS   | `pnpm creative:layout:test`: 4/4; happy path, pending finish, baseline drift and tampering |
| Focal lint                | PASS   | `pnpm exec eslint scripts/creative/layout-compiler/*.mjs`                                  |
| Syntax                    | PASS   | `node --check` on CLI, compiler and contract                                               |
| High Frequency compile    | PASS   | `--mode compile`: 3 formats, `creative_release_candidate`, QA true                         |
| Re-verification           | PASS   | `--mode check`: 3/3                                                                        |
| Visual inspection         | PASS   | `review/layout-compiler-contact-sheet.jpg` reviewed at original resolution                 |
| Fidelity migration guard  | PASS   | normalized MAE `0.001096–0.001155`, threshold `0.002`                                      |
| Portability and lineage   | PASS   | no operator absolute paths; source/finished plate and output SHA-256 recorded separately   |
| Skill validation          | PASS   | Codex routers and both image-generator routers pass `quick_validate`; Claude-specific design-studio frontmatter parsed with its native keys |
| Remote binary archive     | PASS   | 84 objects / `148861636` bytes in private GCS; three compiler underlays listed; `artifacts.remote.json` written |
| Documentation closure     | PASS   | `pnpm docs:closure-check`: only advisory task-lifecycle match; both task diffs are link-only and `ops:lint` is green |
| Operations lint           | PASS   | `pnpm ops:lint --changed`: 0 errors, 0 warnings                                            |
| Context check             | PASS   | `pnpm docs:context-check:strict`: 0 errors, 0 warnings after canonical changelog rotation  |
| QA routing                | PASS   | `pnpm qa:gates --changed --agent codex`                                                    |

## Blockers

None.

## Conditional Follow-Ups

1. Add new hook renderers only with schema, fixture, QA and documentation; V1 deliberately supports
   `frequency-rail|none`.
2. A future visual editor/Figma adapter may consume the same contract, but is not needed for V1 closure.

## False-Closure Traps Checked

- tests green but runtime missing: not applicable; this is explicitly local out-of-band tooling and ran on the
  real worked-example assets.
- UI screenshot/capture absent: no product UI changed; the generated contact sheet was visually inspected.
- env/flag/redeploy/backfill pending: none.
- docs/task lifecycle drift: technical, functional, manual, skills, changelog, context and handoff are synced;
  the two touched task files only update the EPIC-028 canonical link, so README/registry state does not change.
- Sentry/observability not verified: not applicable; no deployed runtime.
- happy-path-only validation: rejected; tests prove finish checkpoints, baseline drift and post-compile tampering
  fail closed.

## Final Call

Campaign Layout Compiler V1 can be called complete as a local creative-production capability. It deterministically
recompiled three real campaign ratios without provider spend, preserved visual fidelity inside the declared
tolerance, generated editable and auditable artifacts, and failed closed on the principal regression paths. Media
activation, provider finishing and future hook/editor expansion remain separate workflows, not rollout debt.
