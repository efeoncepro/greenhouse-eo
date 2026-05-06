# Greenhouse i18n Architecture V1

> Version: 1.2
> Created: 2026-05-06
> Updated: 2026-05-06 — TASK-431 persisted locale preferences
> Owner: Platform UI / Identity
> Source task: `TASK-428`

## Purpose

This ADR defines the i18n and globalization contract for Greenhouse EO after the copy and formatting foundations delivered by `TASK-265`, `TASK-407`, `TASK-408`, `TASK-429`, and `TASK-811`.

It decides:

- first-class locales and activation order
- library strategy
- routing strategy
- detection hierarchy
- dictionary namespaces and type safety
- email/server rendering rules
- how i18n interacts with access, startup policy, formatting, and existing schema

This document is the source of truth for `TASK-430` and `TASK-431`.

## Current Runtime

Greenhouse is currently a private enterprise portal on Next.js 16 App Router.

Runtime facts verified for this ADR:

- The portal root layout uses the effective locale in `<html lang>`.
- The dashboard layout is dynamic because it depends on the authenticated session.
- `src/proxy.ts` already owns the Next.js proxy boundary for security headers.
- `src/lib/copy/` is locale-aware with `es-CL` default and translated `en-US` shared namespaces.
- `src/lib/format/` is the canonical formatting layer and must remain separate from translated copy.
- `src/lib/email/locale-resolver.ts` maps legacy email locales (`es`, `en`) to platform locales (`es-CL`, `en-US`).
- PostgreSQL has legacy `greenhouse_core.client_users.locale TEXT DEFAULT 'es'` as compatibility state.
- PostgreSQL has canonical persisted locale fields from TASK-431:
  - `greenhouse_core.identity_profiles.preferred_locale`
  - `greenhouse_core.organizations.default_locale`
  - `greenhouse_core.clients.default_locale`
- `greenhouse_serving.session_360` exposes `preferred_locale`, tenant defaults and `effective_locale` for session resolution.

## Decision Summary

| Area | Decision |
| --- | --- |
| Library | Use `next-intl` for App Router runtime i18n. Use dictionary/core APIs for non-App Router rendering such as React Email. |
| Routing | Hybrid, conservative. Private authenticated portal stays state-only by default. Locale prefixes are reserved for future public/SEO routes and explicit localized entrypoints. |
| Default locale | `es-CL`. |
| Phase 1 activation locale | `en-US`. |
| Planned first-class locale | `pt-BR`, gated by dictionary coverage and business validation before activation. |
| Detection after persistence | user preferred locale → tenant default locale → legacy user locale → cookie/manual override → `Accept-Language` → `es-CL`. |
| Detection before persistence | explicit public route locale when present → cookie/manual override → `Accept-Language` → `es-CL`. |
| Formatting | Keep `src/lib/format/` as the canonical formatting primitive; i18n does not replace it. |
| Access model | Locale is presentation state, not authorization. No routeGroups, views, entitlements, or startup policy changes. |

## First-Class Locales

### Active

- `es-CL`: default and current production/staging language.

### Phase 1

- `en-US`: first additional locale for runtime proof and international stakeholders.

### Planned

- `pt-BR`: first LATAM expansion locale, planned because Efeonce operates with regional enterprise clients. It is not activated until `TASK-430` or a follow-up has real dictionary coverage and a validated pilot.

### Addition Criteria

A locale can be promoted to first-class only when all are true:

- It is represented in `SUPPORTED_LOCALES`.
- It has dictionary parity for all shared namespaces.
- Shell, CTAs, shared states, empty/loading/error copy, and email institutional copy have reviewed translations.
- `src/lib/format/` supports the locale for values needed by the target tenant/cohort.
- QA can verify at least one realistic tenant/user flow.
- Fallback behavior is documented.

Formatting helpers may accept arbitrary BCP 47 locale strings for transitional display. Copy dictionaries may not.

## Library Decision

Greenhouse chooses `next-intl`.

Why:

- It supports Next.js App Router and Server Components.
- It has middleware/proxy-compatible routing primitives when Greenhouse later needs public localized routes.
- It separates translated messages from formatting APIs well enough for Greenhouse to keep `src/lib/format/` as the canonical value formatter.
- The current package release is compatible with Next.js 16 and React 19.
- Its underlying `use-intl` core can support non-Next rendering patterns without tying React Email to an App Router provider.

Alternatives rejected:

- `react-intl`: strong React i18n library, but less aligned to Next.js App Router routing/provider conventions. It would push more custom integration into Greenhouse.
- `next-international`: type-safe and smaller, but lower ecosystem maturity for Greenhouse's App Router + routing + server rendering needs.
- Vuexy `full-version` i18n scaffold: useful as reference, but it is not the Greenhouse source of truth and uses a `[lang]` structure that would be too disruptive for the current private portal.

## Routing Strategy

Greenhouse uses a hybrid strategy.

### Private Authenticated Portal

The private portal keeps stable URLs without locale prefixes:

- `/home`
- `/finance`
- `/hr/payroll`
- `/my`
- `/admin/*`
- `/api/*`

Locale is resolved from session/cookie/header and applied by provider/layout, not by changing every URL.

Rationale:

- Existing deep links in emails and notifications stay valid.
- NextAuth callbacks and credential flows stay stable.
- Vercel staging/preview programmable access stays stable.
- `scripts/staging-request.mjs` can keep requesting `/api/...` paths.
- The portal has low SEO value behind auth; URL-localized private routes would add risk without matching value.

### Public / SEO / Share Routes

Locale prefixes are allowed only for public routes that benefit from shareability or SEO, such as future public marketing pages or localized quote-share experiences.

Rules:

- Public localized routes may use `/en-US/...` or a shorter route alias only after the ADR consumer defines it explicitly.
- Public route prefixes must not apply to `/api/*`, NextAuth callbacks, static assets, or Vercel automation paths.
- Existing public links must continue to work and may redirect only when backward compatibility is explicit.

### Proxy Contract

`src/proxy.ts` remains the single proxy boundary.

`TASK-430` must not add a parallel `middleware.ts`. If `next-intl` proxy/routing is needed later, it must be composed inside `src/proxy.ts` while preserving current security headers and matcher behavior.

## Detection Hierarchy

### Before TASK-431

Until persistence is implemented:

1. explicit public route locale when the route declares one
2. cookie/manual override, recommended name `gh_locale`
3. `Accept-Language` matched to `SUPPORTED_LOCALES`
4. `DEFAULT_LOCALE` (`es-CL`)

### After TASK-431

Once persistence exists:

1. user preferred locale
2. tenant default locale
3. legacy user locale from `client_users.locale` during compatibility reads
4. cookie/manual override for temporary testing or unauthenticated public routes
5. `Accept-Language`
6. `DEFAULT_LOCALE` (`es-CL`)

The session should expose `effectiveLocale` as a platform locale (`es-CL`, `en-US`, `pt-BR`, etc.).

### Cross-Tenant Semantics

For an internal Efeonce user viewing a client tenant:

- user preferred locale wins when present
- otherwise tenant default locale wins
- otherwise fallback chain applies

Rationale: a human user's explicit preference should remain stable across workspaces, but tenant default still gives client-facing users the expected language when they have not chosen one.

### Agent Auth

Headless agent sessions default to `es-CL` unless the agent user has a persisted preference after `TASK-431`.

`scripts/staging-request.mjs` must not need locale-prefixed paths.

## Schema Guidance for TASK-431

`greenhouse_core.client_users.locale` is legacy email-era state and currently stores short values such as `es`.

`TASK-431` must not blindly create a second user-locale source without migration semantics. The canonical target is:

- `greenhouse_core.identity_profiles.preferred_locale` for human preference
- tenant/account default locale on the tenant/account owner chosen by the current Identity architecture
- a compatibility read for `client_users.locale` during migration

Migration rules:

- normalize legacy `es` → `es-CL`
- normalize legacy `en` → `en-US`
- nullable-first schema changes
- CHECK constraints or code validation against `SUPPORTED_LOCALES`
- no invalid arbitrary locales in persisted preference fields

## Dictionary Contract

Greenhouse keeps the existing two-layer copy model:

- `src/config/greenhouse-nomenclature.ts`: product nomenclature, navigation constants, stable institutional product names
- `src/lib/copy/`: functional shared microcopy and domain reusable copy

`TASK-430` must build on this shape instead of replacing it with JSON-only dictionaries.

Canonical namespaces:

- `actions`
- `states`
- `loading`
- `empty`
- `months`
- `aria`
- `errors`
- `feedback`
- `time`
- `emails`
- domain modules in `src/lib/copy/*` when reusable across surfaces

Type-safety rules:

- `SUPPORTED_LOCALES` is the platform list.
- Every supported locale must satisfy the same TypeScript dictionary shape.
- Missing keys must fail TypeScript/build, not appear as runtime `[missing]` strings.
- Dictionary lookup may fallback to `es-CL` only as a controlled runtime fallback; build-time parity remains mandatory.
- Product names such as Greenhouse, Nexa, Pulse, Spaces and Mi Greenhouse should generally stay stable. Translate surrounding helper text, not the product mark, unless product leadership decides otherwise.

## Email and Non-App Rendering

React Email templates and background jobs must not depend on an App Router provider.

Rules:

- Use platform locale values (`es-CL`, `en-US`) at resolver boundaries.
- Keep `src/lib/email/locale-resolver.ts` as the bridge from legacy `es|en` inputs.
- Use dictionary/core APIs for SSR email rendering.
- Personalization tokens stay outside dictionaries: names, amounts, periods, URLs, unsubscribe links, generated narratives, client names and dynamic labels remain runtime data.
- If recipient locale is unknown, default to `es-CL`. TASK-431 makes recipient preference available through Identity/session primitives; email-specific rollout tasks should consume that value explicitly instead of depending on the App Router provider.

## Formatting Boundary

`next-intl` can provide translation runtime, but Greenhouse value formatting remains in `src/lib/format/`.

Rules:

- Visible dates, times, currency, numbers, percentages, relative labels and plural selection use the TASK-429 helpers.
- Do not reintroduce raw `Intl.*` or `toLocale*` calls in UI surfaces.
- `America/Santiago` remains canonical operational timezone for payroll and operational close.
- Locale changes presentation; they do not change payroll/tax/business semantics.

## Access Model

Locale does not grant access.

- `routeGroups`: no change
- `views` / `authorizedViews` / `view_code`: no change
- `entitlements`: no change
- `startup policy`: no change

Future settings surfaces that let a user change locale must reuse existing settings/admin authorization patterns. Locale itself must not become a permission layer.

## TASK-430 Contract

`TASK-430` delivered:

- `next-intl` installed and composed in `next.config.ts`
- provider/request loading configured for App Router
- private URLs preserved without locale prefixes
- `src/proxy.ts` preserved without i18n routing because TASK-430 does not need prefixes
- `<html lang>` corrected from hardcoded `en` to effective locale
- `en-US` activated for shell navigation and shared namespaces
- `src/lib/format/` kept as the formatting boundary
- `/api/*`, auth callbacks and staging automation kept unprefixed

`TASK-430` intentionally did not pass the full `src/lib/copy` dictionary as `next-intl` messages because `time` and `emails` contain functions. The App Router provider receives a serializable shared subset from `src/i18n/messages.ts`; emails and background jobs continue to use dictionaries/core APIs outside the provider.

## TASK-431 Contract

`TASK-431` delivered:

- persisted preference/default locale with nullable-first schema and CHECK constraints for `es-CL` and `en-US`
- legacy `client_users.locale` normalization (`es` → `es-CL`, `en` → `en-US`)
- `effectiveLocale` in `session_360`, `TenantAccessRecord`, NextAuth JWT/session, tenant context and app platform contexts
- `PATCH /api/me/locale` plus user settings dropdown
- `PATCH /api/admin/tenants/[id]/locale` plus admin tenant settings dropdown
- agent-session locale fields carried from the same tenant access record
- access model unchanged: locale remains presentation state

## Verification Expectations

For `TASK-430`:

- proxy tests cover security headers and any i18n composition
- session/provider tests cover locale resolution
- dictionary parity test fails on missing keys
- staging manual check can force locale by cookie/header without changing API paths

For `TASK-431`:

- migration generated by `pnpm migrate:create`
- `pnpm pg:doctor`
- resolver tests for user, tenant, cookie/header and fallback
- session/JWT tests for `effectiveLocale`
- API validation rejects unsupported locales

## References

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-429-locale-aware-formatting-utilities.md`
- `docs/tasks/complete/TASK-430-dictionary-foundation-activation.md`
- `docs/tasks/complete/TASK-431-tenant-user-locale-persistence.md`
- Next.js Proxy docs: `https://nextjs.org/docs/app/api-reference/file-conventions/proxy`
- next-intl App Router docs: `https://next-intl.dev/docs/getting-started/app-router`
- next-intl core library docs: `https://next-intl.dev/docs/environments/core-library`
