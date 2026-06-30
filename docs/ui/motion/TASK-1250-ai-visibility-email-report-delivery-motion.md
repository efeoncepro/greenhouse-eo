# TASK-1250 — AI Visibility Email Report Delivery Motion Contract

## Meta

- Status: `static-contract`
- Owner task: `TASK-1250 — Growth AI Visibility: Email Report Delivery`
- Surface: transactional email body + attached report/PDF

## Decision

No runtime motion is allowed in this surface.

The email body must remain compatible with email clients, and the attached report is a static document. Any dynamic effect from the web report artifact is excluded from email/PDF delivery.

## Contract

- Email body: inline/static layout only; links are the only interactive affordance.
- PDF attachment: paginated static document; no hover, live charts, scripts or animated states.
- Reduced-motion handling: N/A by construction because no animated behavior ships.
- Verification: render/email tests and PDF smoke/no-leak tests are sufficient; GVC belongs to the web artifact in `TASK-1252`.
