# TASK-1582 — Asset Workspace and Contextual Reuse Wireframe

## Direction

`repo-native-benchmark`: Focused Editorial Workspace. The media remains dominant; context and actions are adjacent, progressive and evidence-backed.

## Targets

- Desktop: `1440×1000`, media stage plus inspector/action rail.
- Mobile: `390×844`, full-height media-first workspace with bottom action dock and sheets.

## Wireframe

```text
┌ back · project / collection / session · close ┐
│                                                │
│                 MEDIA STAGE                    │
│                                                │
├ title · status · modality · credits · rights   │
│ lineage · review · related candidates          │
│ Continue · Recreate · Reference · Compare      │
│ Review · Download · Share · More               │
└────────────────────────────────────────────────┘
```

## Action hierarchy

1. Continue/edit or inspect media.
2. Compare/lineage.
3. Review or create Element.
4. Download/share.

## State/copy inventory

Loading, preview pending, ready, degraded, not found, access denied, trashed, superseded, action gated, pending and command failed. Copy is keyed and explains recovery.

## Implementation Mapping

- Base: existing `ProducerViewer` and governed media resolver.
- Context: `TASK-1580`.
- Lineage: `TASK-1498`.
- Asset actions: `TASK-1503`.
- Media stages: `TASK-1568`, `TASK-1570`, `TASK-1571`.
- Motion: epic master motion contract.

## GVC Scenario Plan

Scenario `globe-producer-asset-workspace`; open image/video/audio from a card, compare valid/invalid lineage, trigger gated action, close and restore. Assert focus trap, inert background, no raw alt text, no no-op action and no overflow.

## Design Decision Log

- Viewer becomes workspace, not a larger lightbox.
- Context is progressive; media remains dominant.
- Parent/child relationships are only server-backed.
- One active playback source per workspace.
