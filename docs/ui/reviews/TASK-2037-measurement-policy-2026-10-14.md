# TASK-2037 — Measurement policy review14/10

Candidate `af0e263f83ece95704105c4ffa1e1328e61555b6`, remote staging only. GVC premium first-fold
at1440×1000 and390×844 passed with focus/reduced-motion, axe/layout/runtime and enterprise checks
(`.captures/2026-10-14T14-12-42_growth-measurement-policy/review-dossier.md`). The full state harness
then passed12 frames14:34Z at the af0 candidate, including the corrected feedback contrast.
Desktop/mobile publication and conflict frames were actually opened and reviewed. Native disabled
controls intentionally represent immutable published content; editing creates another revision.

The controlled source received actual HTTP draft→review→publish commands and independent GET.
Policy `2b9ae007-713b-416c-a7ba-28afd17cbaac` revision3 is
`9e194c45-be7d-482e-8e74-174d680bcfdd`. No source-code or GTM change was needed to configure it.
The final run revised a source already created by the earlier UI run; it does not claim a second
new-source creation. Disabled/blocked/conflict/error/permission presentations use local browser
intercepts and are not production-state claims. Disable confirmation is exercised without
silently disabling a real commercial source. Backend lifecycle and permission tests cover the
real corresponding command boundaries. No submissions, bookings or provider calls in this UI run.

Receipt: `.captures/meta-lead-fix-2026-10-14/policy-ui-live/receipt.json`; zero findings and overflow
in all12 states. Functional/unit coverage is separate from visual scoring. Follow the runtime
ledger for cleanup, final CI, production and strict sGTM cutover; this review does not prove them.
The later agent-first addition reuses this client and panel; the relevant network/contract
checks passed on its final staging candidate. No visible layout is changed by that addition.

Local quality scorecard gate passes (average4.51/floor4.3). The visual contract-only gate passes;
the full local gate walker hits a pre-existing dangling dependency symlink under an unrelated
ignored `.captures/cotizacion-pibank-checkout-aislado-2026-10-08/` directory. It is preserved.
The referenced premium manifest/dossier and all12-frame quality results were read directly;
no gate was weakened and no unrelated capture tree was modified.

## Final verification

Final source `627ea6a8d92bf49dfbcc639725b5ea0841637cfb` premium capture at14:46Z:
`.captures/2026-10-14T14-46-00_growth-measurement-policy/`. Both desktop and mobile images
were opened and reviewed; focus/reduced-motion, axe/layout/runtime/enterprise checks passed.
24 targeted shared-client/agent/network checks passed. Production contract and a fresh-source
CLI lifecycle were independently verified after release.
[Final release evidence](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
