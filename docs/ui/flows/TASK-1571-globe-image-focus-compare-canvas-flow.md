# TASK-1571 — Globe Image Focus + Compare Canvas flow

## Primary flow

1. Producer loads `/producer`; feed and composer remain available while image representations resolve.
2. Producer activates “Ver candidato” on an image card.
3. Existing native dialog opens with the image focus stage, inspector and a stable close target.
4. Focus moves into the dialog; the stage announces the image context and current view state.
5. Producer chooses “Acercar”, “Alejar”, “Ajustar”, “Tamaño real” or pans the image. The image never escapes the stage bounds.
6. If a lineage reader returns related variants, “Comparar variantes” becomes available. Otherwise it remains disabled with the explicit explanation from the copy ledger.
7. Producer compares related images in a two-up or split state, can inspect either side, and returns to the single-image state without losing the originating context.
8. Producer selects, downloads, references or recreates from the existing inspector actions.
9. Escape or close returns focus to the originating card; feed scroll position and state remain intact.

## Alternate states

- Preview pending: stable stage frame, progress/availability explanation, no dead controls.
- No preview: honest empty stage and existing safe actions; no raw error.
- Permission denied: explain that the image cannot be retrieved, keep the dialog closable.
- Relation unavailable: compare affordance is disabled, never fabricated from timestamps or adjacent cards.
- Mobile: inspector follows the stage, controls stay reachable, no horizontal overflow.
- Reduced motion: open/close and compare switch immediately; focus and context remain identical.

## Keyboard contract

- Enter/Space opens the focused card action.
- Tab reaches close, stage controls, inspector actions and compare when available.
- Escape closes the dialog and restores focus.
- Arrow keys pan only while the stage owns focus and the image is zoomed; do not steal browser scroll otherwise.
- Focus indicators remain visible and meet the existing contrast contract.
