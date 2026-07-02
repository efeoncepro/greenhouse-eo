# Public Site Architecture

This folder owns public-site runtime contracts for `efeoncepro.com`.

It is separate from the private Greenhouse app UI platform:

- Private portal primitives: `docs/architecture/ui-platform/PRIMITIVES.md` and `src/components/greenhouse/primitives/**`.
- Public-site primitives: [PRIMITIVES.md](./PRIMITIVES.md), backed by WordPress/Elementor runtime code in `/Users/jreye/Documents/efeonce-public-site-runtime`.

Use this folder when a reusable public landing component, Elementor widget, host adapter, or page pattern needs a long-lived contract.
