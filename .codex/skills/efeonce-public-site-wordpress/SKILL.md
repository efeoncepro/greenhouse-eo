---
name: efeonce-public-site-wordpress
description: Operate and update the Efeonce public WordPress site safely. Use for efeoncepro.com, Kinsta, WordPress REST/WP-CLI, WP Abilities, Ohio theme, Elementor, public landing pages, Greenhouse-to-WordPress bridge, Growth Forms embeds, HubSpot attribution, custom Elementor widgets, AI Content Factory/Gutenberg workflows, public-site layout incidents, authenticated discovery, runtime repo binding, or EPIC-019/TASK-1111/TASK-1116/TASK-1122/TASK-1123 work.
---

# Efeonce Public Site WordPress

> **Ecosistema digital Efeonce — layering canónico** (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`; índice `docs/public-site/`). Dos ejes ortogonales: **superficies** front-of-house (por audiencia/etapa de funnel — **adquisición** como continuo bow-tie: `Think` = demand-gen + nurturing top-of-funnel [blog *Marketing con Manzanitas* → *Glitch* newsletter semanal IA/Marketing/Negocios + tools *AI Visibility Grader*/ebooks/webinars] · sitio `efeoncepro.com` = demand-capture + conversión; **experiencia** con dos caras: cliente [sky → `experiencia.efeoncepro.com`] y operador [cockpit Greenhouse]) que consumen **plataformas/backbones** (runtime Greenhouse PG+BQ/360, **Kortex** = CRM peer system + producto, Verk). El grader es la costura top→bottom. Cargar PDR-003 al razonar sobre superficies, capas, hosts o dónde nace una capacidad del ecosistema.

This skill is a **router**, not the full memory store. Keep this file short.
Load only the references required by the current landing, widget, or operation.

## Hard Rules

- Be read-only by default. Do not publish, delete, clear cache, install plugins, or mutate live WordPress unless the user explicitly asks.
- Never print, store, commit, or screenshot raw Application Passwords, SSH passwords, private keys, bearer tokens, cookies, or authorization headers.
- Public site runtime is WordPress on Kinsta at `https://efeoncepro.com`; active theme is `ohio-child`; parent is `ohio`.
- Use the repo wrapper for remote WP-CLI PHP:
  `pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12`
- Do not write `_elementor_data` directly for normal mutations. Load the Elementor document and call:
  `\Elementor\Plugin::$instance->documents->get($post_id)->save([ 'elements' => $elements, 'settings' => $settings ])`.
- Before any live mutation, identify post/page id, snapshot relevant Elementor data/settings, Ohio metas, `_thumbnail_id`, and any landing-specific guard hashes.
- After live mutation, purge Kinsta cache, verify browser render, and document rollback.
- Prefer page-scoped Elementor/Ohio controls and page-scoped CSS. Do not patch global header/footer/sidebar seams for a local landing issue.
- Do not use `efeonce-web` as deploy source for the live public site unless a new ADR moves the runtime to Astro/headless.
- Treat direct Kinsta filesystem edits as emergency-only and backport governed runtime code changes to `efeoncepro/efeonce-public-site-runtime`.
- For visual landing work, pair with `greenhouse-gvc-playwright`; close with Playwright/GVC-style evidence on desktop and mobile 390px, including overflow checks.
- At closure for implementation, rollout, incident, workflow, skill, or docs changes, use `greenhouse-documentation-governor`.

## Load Matrix

Read the minimal set:

| Work type | Load |
| --- | --- |
| Any public landing visual/content work | `references/landing-workflow.md` + `references/landing-registry.md` + the landing file under `references/landings/` |
| New or unregistered landing | `references/landing-workflow.md` + `references/landing-registry.md` |
| Elementor mutation / page-scoped CSS | `references/elementor-mutation.md` |
| Growth Forms or public form embed | `references/growth-forms-wordpress.md` |
| AI Content Factory, Gutenberg posts, draft/private clones | `references/content-factory-gutenberg.md` |
| Custom Elementor widget/plugin work | `references/custom-elementor-widgets.md` |
| Historical layout incident or older public page | `references/layout-incidents.md` |
| Runtime discovery, bridge inspection, repo binding, Kinsta/WP inventory | `references/runtime-and-discovery.md` |
| AEO `/aeo-2/` | `references/landings/aeo.md` |
| Agencia Creativa `/agencia-creativa/` | `references/landings/agencia-creativa.md` |
| HubSpot services `/servicios-contratar-hubspot/` | `references/landings/hubspot-services.md` |

If several domains apply, load the smallest union. Do not preload every reference.

## Canonical Docs

Use repo docs as source of truth for long-lived contracts:

- `docs/operations/discovery-public-website-wordpress-20260614.md`
- `docs/operations/discovery-public-website-elementor-20260614.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md`
- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/operations/public-site-repository-control-plane-discovery-20260614.md`

For AEO/Growth Forms also use:

- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`

## Common Commands

```bash
pnpm public-website:discover
pnpm public-website:discover -- --authenticated --wpcli --write
pnpm public-website:bridge-inspect -- --page-id <id>
pnpm public-website:export-live-code
pnpm public-website:diff-runtime
pnpm public-website:runtime-status
pnpm public-website:deploy-dry-run
pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12
```

For AEO form typography/overflow/renderer visual parity (AEO-specific; new forms use a proportional
Growth Forms embed gate from `references/growth-forms-wordpress.md`):

```bash
pnpm public-website:verify-aeo-form-typography
pnpm public-website:verify-aeo-live-contract
```

## Update Protocol

When a public-site discovery, incident, landing contract, widget pattern, Kinsta flow, or bridge rule changes:

1. Update the canonical doc first when one exists.
2. Update the smallest matching reference file under this skill.
3. Update both copies of the skill bundle:
   - `.codex/skills/efeonce-public-site-wordpress/`
   - `.claude/skills/efeonce-public-site-wordpress/`
4. Keep `SKILL.md` as a router; do not re-add long incident history here.
5. Run skill validation and the relevant docs closure checks.
