# UI Visual Reviews

Versioned human/agent scorecards for actual GVC evidence. Use
`TASK-####-short-slug.scorecard.json` and `SCORECARD_TEMPLATE.json`.

Automated GVC heuristics inform the scorecard but do not assign aesthetic
quality. Every dimension needs rationale and evidence. Scores below 4.5 also
need a concrete next action. Prefer durable baseline images and a versioned
review note over gitignored `.captures/` paths so the evidence survives across
machines and agents.

Acceptance:

- average ≥4.5;
- floor ≥4;
- hierarchy, surface economy, visual impact, fidelity and generic-template resistance ≥4.5;
- desktop/mobile/dossier evidence exists.

Validate with `pnpm ui:quality --task TASK-####`.
