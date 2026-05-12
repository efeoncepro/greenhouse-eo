---
name: forms-ux-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global forms-ux skill defaults. Load this first whenever forms-ux is invoked inside this repo.
type: overlay
overrides: forms-ux
---

# forms-ux — Greenhouse Overlay

Load global `forms-ux/SKILL.md` first → then read this overlay. Where they disagree, **this overlay wins**.

## Pinned decisions

### 1. Component primitives — Vuexy CustomTextField + CustomAutocomplete

NEVER raw MUI `<TextField>`, `<Autocomplete>`, `<Select>`. Use:

- `CustomTextField` from `@core/components/mui/TextField`
- `CustomAutocomplete` from `@core/components/mui/Autocomplete`
- `CustomChip` from `@core/components/mui/Chip` (for tag input / multi-select)
- `<Switch>` / `<Checkbox>` / `<Radio>` from MUI directly (Vuexy theme overrides applied)

### 2. Select pattern — CustomAutocomplete (≤2 clicks)

Searchable / filterable selects MUST use `CustomAutocomplete` (1 click open + 1 click select). NEVER `Popover + CustomTextField select` (3+ clicks). Enforced by `greenhouse-ui-review`.

### 3. Form state — React 19 `useActionState` + Server Actions

Default mutation path:

```tsx
'use client'
const [state, formAction] = useActionState(createXyzAction, { errors: {} })
<form action={formAction}>...</form>
```

Server Action validates with Zod, returns `{ errors?, message? }`. Tx PG + outbox event in same handler. `revalidatePath` / `revalidateTag` after success.

NEVER `fetch('/api/...')` from `onSubmit` when Server Action works. Greenhouse already migrated most forms to this pattern.

### 4. RUT input — canonical helper

`src/lib/copy/finance.ts` exports `formatRut(value)` + `validateRut(value)` (with Module 11 check digit). Use the helper, NEVER inline regex.

### 5. Currency input — `Intl.NumberFormat('es-CL', ...)` + CLP locale

Display formatted (`$ 1.234.567`), store unformatted (number). Helper: `formatCurrency(value, currency)` from `src/lib/copy/finance.ts`.

For multi-currency forms (CCA, intercompany), use the currency registry pattern from `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`.

### 6. Date input — `<DatePicker>` from `@mui/x-date-pickers`

Greenhouse uses MUI X. NEVER native `<input type="date">` (inconsistent across browsers, no locale config). Format: `dd/MM/yyyy` (es-CL).

### 7. Error copy — es-CL formal-operative

NEVER hardcode error strings in JSX. Use `getMicrocopy('errors.<key>')` from `src/lib/copy/`. Validate with `greenhouse-ux-writing` before merging.

Format: "Lo que falta + cómo arreglarlo". Tone: `tú` (tuteo), never `usted`. NEVER blame ("Tu input es inválido" → "Falta el RUT").

### 8. Wizard pattern — URL-driven step

Multi-step wizards persist current step + entered data in URL search params (`?step=2`) AND localStorage / server-persisted draft. Back button preserves data.

Wizard helpers in `src/components/greenhouse/wizard/` (`WizardShell`, `WizardStep`, `WizardProgress`).

### 9. Autofill — Microsoft SSO + agent auth dominate

Most Greenhouse production users sign in via Microsoft SSO — password fields are rare. When present (admin bootstrap), use:

- `autocomplete="username"` for email
- `autocomplete="current-password"` for password
- `autocomplete="new-password"` for password creation

NEVER `autocomplete="off"` on auth forms.

### 10. Bulk operations — TASK-743 density contract

Bulk-edit tables use `<DataTableShell>` + density (`compact` / `comfortable` / `expanded`) + `<InlineNumericEditor>` for inline edits. Documented in CLAUDE.md "Operational Data Table Density Contract".

## Compose with (Greenhouse skills)

- `greenhouse-ux-writing` — owns error / label / placeholder copy.
- `a11y-architect-greenhouse-overlay` — autofill + label + error a11y.
- `state-design-greenhouse-overlay` — form states (pending / success / error).
- `motion-design-greenhouse-overlay` — submit button motion.

## Version

- **v1.0** — 2026-05-11 — Initial overlay.
