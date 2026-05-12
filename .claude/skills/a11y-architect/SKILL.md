---
name: a11y-architect-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global a11y-architect skill defaults. Load this first whenever a11y-architect is invoked inside this repo.
type: overlay
overrides: a11y-architect
---

# a11y-architect — Greenhouse Overlay

Load global `a11y-architect/SKILL.md` first → then read this overlay → then apply rules. When the global skill and this overlay disagree, **this overlay wins**.

## Why this overlay exists

Greenhouse EO is a Next.js 16 + MUI 7.x portal that serves Efeonce internal teams + Globe clients (enterprise marketing teams across the Americas). The product is **es-CL first, en-US second** (i18n is real, not aspirational). Compliance target: WCAG 2.2 AA + Chile's Ley 21.719 (data protection, accessibility implications). EAA exposure exists for Globe clients headquartered in EU.

## Pinned decisions (OVERRIDE global)

### 1. Locale-first announce text

Every `aria-live` / `aria-label` / `role="alert"` / `role="status"` string passes through `getMicrocopy()` from `src/lib/copy/` (TASK-265). NEVER hardcode aria text in JSX. Validate with `greenhouse-ux-writing` skill BEFORE merging.

```tsx
// CORRECT
<button aria-label={getMicrocopy('aria.closeDialog')}>×</button>

// WRONG — hardcoded string
<button aria-label="Cerrar">×</button>
```

### 2. Focus return on drawer / modal close — mandatory pattern

Greenhouse uses MUI Drawer + Dialog heavily. The canonical pattern returns focus to the trigger:

```tsx
const triggerRef = useRef(null)
<Button ref={triggerRef} onClick={open}>Abrir</Button>
<Drawer
  open={isOpen}
  onClose={() => { setIsOpen(false); triggerRef.current?.focus() }}
  /* MUI handles trap + Esc */
/>
```

This is enforced by `greenhouse-microinteractions-auditor`.

### 3. Skip link mandatory at root layout

`(dashboard)/layout.tsx` ships a visually hidden "Saltar al contenido" link as first focusable element, targeting `<main id="main-content">`. Already in place. NEVER remove it.

### 4. Touch targets — 44×44 minimum (not 24×24)

Greenhouse pins to the Apple HIG standard, not the WCAG floor. Vuexy `size='small'` buttons default to 32×32 — must add `sx={{ minWidth: 44, minHeight: 44 }}` for primary actions in dense surfaces.

Exception: inline icon buttons inside data tables (TASK-743 density contract — `compact` mode allows 32×32 because tabular density is intentional).

### 5. Contrast — verified in BOTH `light` AND `darkSemi` themes

Greenhouse ships 2 themes (`light` + `darkSemi` from Vuexy). EVERY color contrast check passes both. Use `mergedTheme.ts` runtime hex values + WebAIM contrast checker.

The `customColors` palette tokens are pre-checked. Off-palette hex requires manual verification + a comment justifying the choice.

### 6. Forced-colors — test the 5 critical paths

Verify these 5 surfaces in Edge with `chrome://flags/#forced-colors`:

1. Login / agent auth
2. Home dashboard
3. Finance cash-out (TASK-772)
4. Payroll period review (TASK-758)
5. Admin governance writes (TASK-839)

If any breaks, fix before merge. Use `outline` (survives forced-colors) over `box-shadow` for focus indicators.

### 7. Reduced motion — use the `useReducedMotion` hook

Greenhouse imports `useReducedMotion` from `@/hooks/useReducedMotion` (or Framer Motion's hook if available). Wrap every animation. The hook reads `prefers-reduced-motion` AND respects the user's session preference if it exists.

```tsx
const reduce = useReducedMotion()
<Box sx={{ transition: reduce ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)' }} />
```

### 8. Screen reader testing — VoiceOver minimum

For Globe-facing surfaces, test with VoiceOver (macOS Safari) + NVDA (Windows Firefox) before merging. Internal Efeonce surfaces can ship after VoiceOver-only check.

The `greenhouse-mockup-builder` workflow includes a screen reader pass as part of the mockup-to-runtime promotion checklist.

### 9. Form auth — passkey + magic link preferred over password

WCAG 3.3.8 is hard-passed via `next-auth` Microsoft SSO (passkey-equivalent under the hood) + the `/api/auth/agent-session` magic-link-equivalent. Greenhouse does NOT ship a password-only auth path for production users.

### 10. Cognitive accessibility — Chile-specific

- Use **tuteo** (`tú` / `tuyo`) NEVER **usted** (formal). Validated by `greenhouse-ux-writing`.
- Avoid English jargon untranslated: "factura", not "invoice"; "pago", not "payment".
- Plain language: Flesch-Huerta (Spanish adaptation) target ≥60.
- Currency: `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })` — NEVER `$X.XXX` hardcoded.
- Date: `Intl.DateTimeFormat('es-CL')` — `"12 mar 2026"`, NEVER American `3/12/2026`.

## Canonical sources of truth

- **Tokens / contrast**: `mergedTheme.ts` (runtime authority) + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- **Aria copy**: `src/lib/copy/dictionaries/es-CL/aria.ts`
- **Skip link**: `src/components/layout/(dashboard)/SkipToContent.tsx`
- **Focus management hooks**: `src/hooks/useFocusReturn.ts`, `useReducedMotion.ts`

## Compose with (Greenhouse skills)

- `greenhouse-ux-writing` — owns the es-CL copy of every aria-label, error, announce.
- `greenhouse-microinteractions-auditor` — enforces focus return + reduced motion at audit time.
- `greenhouse-ui-review` — runs §11 of the floor (a11y) before commit.

## Version

- **v1.0** — 2026-05-11 — Initial overlay. Pins 10 Greenhouse-specific a11y decisions over the global skill.
