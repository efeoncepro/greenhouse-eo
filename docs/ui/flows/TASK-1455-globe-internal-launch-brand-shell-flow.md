# TASK-1455 — Globe internal launch flow

## Flow

`GET /` → enter CTA → `/auth/start` → Greenhouse authorize → Globe `/auth/callback` → secure local session → 303 `/studio` → optional revalidate/logout.

## Branches

- Unauthenticated: root shows one entry action.
- Internal allowed: callback stores only server-side access token, sets HttpOnly cookie and redirects.
- Client/not eligible: callback renders safe denial; no session.
- Revoked/suspended: `/studio` revalidation deletes session and shows recovery.
- OAuth/state/replay failure: safe error plus new attempt; no raw query/token.

## Focus and navigation

- Root starts at skip link then logo/headline/CTA.
- Successful callback targets/focuses authenticated `h1`.
- Error focuses alert heading; retry is next focusable control.
- Logout returns to `/` and focus starts at the primary heading.

## GVC Scenario Plan

- Record URL/status chain without storing query codes in durable artifacts.
- Capture anonymous, authenticated, denied and revoked terminal states.
- Assert cookie remains HttpOnly/Secure/SameSite=Lax and HTML contains no token.
- Quality profile: premium; desktop 1440×1000 and mobile 390×844.
- Review dossier and scroll-width evidence are required; baseline follows first-fold acceptance.

## Design Decision Log

- Use 303 after callback to remove one-time query parameters from the browser address bar.
- Keep JSON `/v1/session` for agents/API parity; human UI never replaces it.
