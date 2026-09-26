# Efeonce Marketing Studio — lessons (append; newest first; each with date, symptom, cause, rule)

- **2026-09-25 · One Postgres query per thumbnail exhausted the role.** Symptom: grids of 20+ pieces showed broken
  images; `too many connections for role` on `marketing_studio_app` (limit 20); reproduced 18 of 40 concurrent
  requests = 500. Cause: `/renditions/{id}` authorized each image against the DB. Fix (`c949d3f`): readers return
  HMAC-signed `/api/v1/media/{token}` links (secret `STUDIO_MEDIA_URL_SECRET`, different per environment, expiry
  rounded to the week so browser cache keeps working) served from the bucket without touching the DB; `MediaImage`
  retries once then shows «Vista previa no disponible». Verified 108/108 concurrent OK. Rule: authorization happens
  once in the reader; media transport never opens a DB connection. If the secret is missing in an environment the
  links silently fall back to the DB path — check the secret first.
- **2026-09-25 · Preview cropped pieces.** A fixed `max-height: 320` cut vertical formats. Rule: preview by format —
  9:16 as a story, 1:1/4:5/16:9 in a feed card with the real ratio.
- **2026-09-25 · Agents asked for the 1600 px preview by default.** Rule (`d3ab68e`): `studio.asset.preview` defaults
  to `thumb` (640 px); `preview` only for fine detail. Image payload caps at 2 MB in the gateway.
- **2026-09-25 · Vercel blocks deploys whose author is not in the team** (`COMMIT_AUTHOR_REQUIRED`, state
  `BLOCKED`). `jreye@MacBook-Air.local` and `jreyes@efeoncepro.com` failed. Rule: `git config user.email jreyes@efeonce.cl`
  in the Studio repo before committing.
- **2026-09-25 · `axis-packages-read-token` is a full `.npmrc`, not a token.** Copying it whole into `NODE_AUTH_TOKEN`
  gives pnpm `ERR_INVALID_CHAR`. Rule: only the `_authToken` value of `npm.pkg.github.com` goes to Vercel; locally use
  `NODE_AUTH_TOKEN="$(gh auth token)"`.
- **2026-09-25 · `vercel api` env POST takes one object per request** (`--input`); an array fails. `vercel env add NAME
  preview ""` targets all preview branches. A deployment built before the var existed does not see it: redeploy.
- **2026-09-25 · DATE columns shifted a day.** pg parsed `date` (oid 1082) into a JS `Date` at local midnight. Rule:
  parser `1082` → string (`connection.ts`); format date-only values in UTC; times with `hourCycle: 'h23'`.
- **2026-09-25 · Shared constants imported from a `'use client'` module arrive as a client reference in a Server
  Component.** Rule: put shared constants in a neutral module (the theme cookie lives in `components/theme.ts`).
- **2026-09-25 · Cloud SQL users via `gcloud sql users create` join `cloudsqlsuperuser`** and could read Greenhouse.
  Rule: create Studio roles by SQL under `SET ROLE cloudsqlsuperuser`. IAM DB auth is unavailable (flag absent on the
  shared instance; enabling it modifies Greenhouse's production instance) ⇒ passwords in Secret Manager.
- **2026-09-25 · Studio roles can open `CONNECT` to `greenhouse_app` through PUBLIC.** Verified 0 readable tables and
  no reachable `SECURITY DEFINER`, but it is residual risk. Rule: tracked as TASK-1897 (Greenhouse change); never
  "fix" it from the Studio side.
- **2026-09-25 · Expired ADC ⇒ `database: unreachable` locally.** Rule: from greenhouse-eo run
  `pnpm gcloud:auth:playwright -- --force`; `.env.local` uses the proxy on port 15433 (not Greenhouse's).
- **2026-09-25 · The gateway version gate measures the surface with every provider maximal.** A new provider must be
  declared in `src/surface.ts` and in the policy coverage test, or its tools stay out of the versioned surface. A
  description change alters the surface digest (it changes agents' tool choice): bump the version.
- **2026-09-25 · Two Zods in the tree.** `@vercel/oidc` → `@vercel/cli-config` pinned zod 4.1.11 exact. Rule: single
  version via `overrides: { zod: 'catalog:' }`; `dependency-catalog-gate` fails on duplicates unless listed in
  `ALLOWED_DUPLICATES` with reason (only `google-auth-library` 10 inside `google-gax`).
- **2026-09-25 · TypeScript 6+ ships no global types.** Rule: `tsconfig.base.json` `types: ["node"]` + `@types/node`
  per package. Next 16.3.6 uses TS 7 natively in the build type check (a deliberate type error fails the build).
- **2026-09-25 · `next dev` rewrites files.** It generates `apps/web/AGENTS.md`/`CLAUDE.md` (committed) and rewrites
  `next-env.d.ts` — never commit the dev variant.
- **2026-09-25 · The certificate did not issue on its own after DNS (~7 min).** Rule:
  `vercel certs issue studio.efeonce.org --scope efeonce-7670142f`. The `studio` CNAME does not affect Outlook
  (MX, autodiscover, SPF live at the root and `autodiscover`).
- **2026-09-25 · Greenhouse cannot validate Studio tool names** (the manifest lives in another repo). Rule: Greenhouse
  validates only the `studio.` prefix of the manual's `appliesTo`; the gateway (which has both artifacts) checks
  existence (`skill_governs_unknown_tool`).
- **2026-09-25 · Pushing Greenhouse `develop` was blocked by foreign WIP.** A remote commit collides with another
  session's work in `scripts/foto`. Rule: in the shared checkout, never sweep foreign WIP into a Studio commit; stage
  and commit in one call with explicit paths.

## 2026-09-26 — Turning on the provider in production

- **A sister-platform OAuth client policy is validated by `sisterPlatformOAuthPolicyV1Schema`, not by the migration's DO
  guard.** `revocation.requireOnPrivilegedAction` must be literally `true`. With `false`, the exchange answers 503
  ("OAuth client policy is unavailable"), and the gateway surfaces it as `upstream_unavailable`, which looks like Studio
  is down. Fixed forward by `20260926071321910`. When seeding a client, copy a working one (client-services) and parse
  the policy with the real schema.
- **A conditional secret belongs in the step that runs `gcloud run deploy`.** Revision `00058-9jq` started without
  `MARKETING_STUDIO_API_TOKEN`; the verified promotion kept `00057` serving.
- **After a failed promotion, check `spec.traffic`.** It stayed pinned to the broken revision and every later deploy
  failed. Fix: `update-traffic` to the serving revision, then re-dispatch.
- **Diagnose by hop.** Studio with the service bearer (curl) → Greenhouse exchange (Vercel runtime logs of
  `/api/integrations/v1/sister-platforms/oauth/token`) → gateway (sanitized logs).
