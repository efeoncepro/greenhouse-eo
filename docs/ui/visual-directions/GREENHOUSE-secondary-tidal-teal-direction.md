# Greenhouse Secondary — Tidal Teal Visual Direction

## Mode and source

- Mode: `repo-native-benchmark`
- Durable source: Greenhouse AXIS runtime tokens + Midnight Navy + semantic feedback palette
- Provenance / approval: operator direction, 2026-07-18
- Selected state: light and dark semantic secondary across ramp, button and chip labs

## Alternatives

1. **Atlantic teal** — vivid and green-leaning; rejected for crowding success emerald.
2. **Tidal Teal** — balanced blue/green energy with deep petrol end; selected.
3. **Harbor cyan** — blue-leaning; rejected for crowding info and Core Blue.

## Decision

Select Tidal Teal, anchored at `500 #12AFA2`. Preserve a luminous 300–500 middle for visual impact and a controlled 700–900 end for enterprise text, borders and active states. Use mode-aware semantic mapping rather than forcing one value across both surface regimes.

## Visual thesis

- First-fold reading order: Core Blue primary action → Tidal Teal context/support → semantic feedback only when state exists.
- Dominant decision: secondary supports the primary hierarchy; it never becomes a second primary CTA.
- Density: teal appears in compact controls, selection seams, contextual highlights and focused evidence—not as large decorative wallpaper.
- Depth model: opacity 8/16 for tonal planes; solid 700 light / 400 dark for decisive controls.
- Typography role: semantic `main` may carry text only where the corresponding contrast gate passes.
- Color role: visually bridge Midnight Navy and bright operational surfaces while remaining distinct from success and info.
- Signature details: luminous teal on dark mode, deep petrol ink on light mode, no fluorescent lime wash.

## Desktop target

At 1440×1000, secondary controls remain clearly subordinate to a Core Blue primary, but selection/context is visible without relying on borders alone. The ramp reads as one continuous hue family without green or cyan jumps.

## Mobile target

At 390×844, teal remains legible in compact chips, icon controls and focus/selection treatments. No saturated teal field competes with content or sticky actions.

## Token mapping

| Cue | Canonical token / primitive / recipe | Deviation |
|---|---|---|
| Supporting action, light | `theme.palette.secondary.main` → 700 | none |
| Supporting action, dark | `theme.palette.secondary.main` → 400 | mode-aware by design |
| Tonal fill | `theme.palette.secondary.lightOpacity` or `theme.axis.opacity.secondary[8|16]` | none |
| Hover/active | `theme.palette.secondary.dark` | per-mode mapping |
| Special ramp specimen | `theme.axis.ramp.secondary[100..900]` | lab/chart-only |

## Anti-patterns

- Reintroducing lime/green for `secondary` or using success as decorative teal substitute.
- Using secondary as a second contained primary in one action cluster.
- Hardcoding `#12AFA2` in consumers instead of semantic tokens.
- Reusing light-mode 700 as dark-mode text/outline.
- Turning large cards or page backgrounds teal without a task-native semantic reason.

## Acceptance signature

- Average ≥4.5/5; hierarchy, surface economy, visual impact, fidelity and generic-template resistance each ≥4.5/5; no dimension below 4/5.
- Light and dark solid/text contrast AA.
- Ramp, Buttons and Chips labs accurately render semantic roles.
- Desktop/mobile evidence and no page-level horizontal overflow.
