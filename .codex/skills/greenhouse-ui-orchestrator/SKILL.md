---
name: greenhouse-ui-orchestrator
description: Orchestrate Vuexy and MUI pattern selection for Greenhouse UI work. Use when a human, Claude, Codex, or any other agent asks for a new interface, a layout adaptation, a reusable component choice, or a `full-version` port and you need a deterministic recommendation or implementation path.
---

# Greenhouse UI Orchestrator

Use this skill when the task is to decide which Vuexy or MUI pattern Greenhouse should use.

## Workspace detection

- If the current workspace contains `starter-kit`, use `starter-kit` as the working repo.
- Otherwise, if the current workspace already contains `project_context.md` and `src/app`, treat the current workspace as the working repo.

## First reads

Read only what the task needs, in this order:
- `<repo>/AGENTS.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `<repo>/docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `<repo>/docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `<repo>/docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`

If the task is visual or needs extra Vuexy heuristics:
- use the existing `greenhouse-vuexy-portal` skill
- read its `references/ui-ux-vuexy.md`

## Input contract

The upstream request may come from:
- a human
- Claude
- Codex
- another agent

Treat that upstream request as raw input, not as the final brief.

Normalize it into:
- source actor
- surface
- page intent
- data shape
- data quality
- action density
- repeatability
- constraints and non-goals

## Workflow

1. Confirm the active phase and route surface.
2. Normalize the request with `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`.
3. Inspect local shared components before opening `full-version`.
4. Choose one primary pattern family from `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`.
5. Inspect at most 1 to 3 `full-version` references for that family.
6. Decide whether the implementation belongs in:
   - `src/components/greenhouse/*`
   - `src/views/greenhouse/<module>/*`
   - `src/views/greenhouse/admin/**`
7. Return an implementation-ready recommendation.

## Hard rules

- Do not copy full demo pages from `full-version`.
- Do not preserve demo semantics, demo copy, or fake business logic.
- Do not choose patterns by aesthetics alone.
- Do not render `seeded`, `override`, or partial data as authoritative without provenance.
- If the request depends on a missing source of truth for team, capacity, or campaigns, stop and model first.

## Output contract

When responding, include:
- request normalization
- recommended pattern
- optional alternate pattern if it is materially useful
- local target path
- `full-version` references
- guardrails and anti-patterns
- validation notes

## Implementation rule

If asked to implement after the recommendation:
- build the smallest reusable slice first
- promote repeating primitives into `src/components/greenhouse/*`
- keep route-only composition local
