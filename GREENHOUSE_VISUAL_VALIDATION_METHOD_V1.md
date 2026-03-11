# GREENHOUSE_VISUAL_VALIDATION_METHOD_V1

## Objective

Define a repeatable method to validate Greenhouse UI changes visually before closing a dashboard or admin iteration.

This method exists because:
- `lint` and `build` confirm structural health, not visual proportion
- many Greenhouse surfaces depend on authenticated routes
- the dashboard often needs tenant-specific validation through `view-as`

## When To Use It

Use this method when a change affects:
- layout hierarchy
- card proportions
- responsive behavior
- copy density
- spacing or alignment
- admin previews of client-facing surfaces

## Validation Principles

- Validate a real route, not isolated JSX.
- Prefer the exact tenant benchmark relevant to the change.
- If the dashboard is tenant-facing and the available login is admin, validate through `view-as`.
- Keep local-only secrets or env setup out of Git.
- Clean up temporary files and processes after the check.

## Standard Local Flow

### 1. Prepare local env

- Use a Git-ignored `.env.local`.
- Prefer minimal local vars over copying full secret payloads when ADC already works.
- For auth routes, ensure at least:
  - `GCP_PROJECT`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `NEXT_PUBLIC_APP_URL`

Recommended local pattern:
- keep `.env.skycheck.local` or another source file as reference only
- write a minimal `.env.local` for the current validation session
- remove `.env.local` after finishing

### 2. Start the app in a clean port

- Prefer `npx next dev --turbopack --port <port>` when another dev server may still hold `3000`.
- If port collisions or `.next/dev/lock` appear, stop the old process first instead of trusting the retry.

### 3. Authenticate with a real user

- Use the internal admin account when the client tenant still lacks active end-user onboarding.
- If the target surface is client-facing, log in as admin and then navigate to:
  - `/admin/tenants/<clientId>/view-as/dashboard`

### 4. Capture the real page

- Use Playwright for deterministic validation.
- Run Playwright from a temporary workspace outside the repo if the project does not already depend on it.
- Wait for:
  - login redirect
  - route transition to complete
  - final dashboard URL
  - a short stabilization delay before screenshot

### 5. Review the screenshot against the intent

Check at minimum:
- first fold hierarchy
- hero height vs side cards
- card alignment
- typography density
- obvious accessibility regressions such as missing labels or unreadable chips

### 6. Clean up

- stop local dev processes used only for validation
- delete temporary logs, screenshots, test-results, and `.env.local`
- do not commit validation artifacts unless they are intentionally part of repo tooling

## Playwright Pattern Used In This Repo

This is the pattern validated during the dashboard hero/capacity iteration on `2026-03-11`:

1. Start local app on a clean port, for example `3100`
2. Open `/login`
3. Sign in with internal admin
4. Navigate to `/admin/tenants/space-efeonce/view-as/dashboard`
5. Wait for final URL and network idle
6. Capture a full-page screenshot

Why `space-efeonce`:
- it is the richest benchmark tenant in current Greenhouse
- it stresses hero, top stats, module-aware cards, and long dashboard sections better than sparse tenants

## Recommended Command Pattern

Example local server:

```powershell
npx next dev --turbopack --port 3100
```

Example Playwright flow:

```js
await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
await page.getByLabel('Work Email').fill('<admin-email>')
await page.getByLabel('Password').fill('<admin-password>')
await page.getByRole('button', { name: /enter portal/i }).click()
await page.waitForURL(/internal\/dashboard|auth\/landing|dashboard/, { timeout: 60000 })
await page.goto('http://localhost:3100/admin/tenants/space-efeonce/view-as/dashboard', { waitUntil: 'networkidle' })
await page.waitForURL(/view-as\/dashboard/, { timeout: 60000 })
await page.waitForTimeout(8000)
await page.screenshot({ path: 'dashboard-check.png', fullPage: true })
```

## Failure Diagnosis

If login fails locally:
- first separate env problems from UI problems
- verify `GCP_PROJECT`
- verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
- if BigQuery auth is involved, prefer refreshing ADC instead of pasting serialized credentials by hand

If the admin lands on `/internal/dashboard`:
- that is expected for the internal role
- continue to the client dashboard through `view-as`

If the dashboard route renders but proportions still look wrong:
- compare the screenshot against the product goal
- document the specific visual defect in the relevant UX gap doc before another iteration

## Exit Criteria

A visual validation is considered complete when:
- `npx pnpm lint` passes
- `npx pnpm build` passes
- the real target surface was opened locally or in preview
- the relevant tenant benchmark was visually reviewed
- temporary validation artifacts were cleaned up
