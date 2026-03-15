# Greenhouse Accessibility Guidelines V1

> **Standard**: WCAG 2.2 Level AA | **Stack**: React + MUI + Next.js (App Router) + Recharts
> **Last Updated**: 2026-03-14

---

## Table of Contents

1. [WCAG 2.2 AA Compliance](#1-wcag-22-aa-compliance)
2. [ARIA Patterns](#2-aria-patterns)
3. [Color Contrast and Visual Accessibility](#3-color-contrast-and-visual-accessibility)
4. [Keyboard Navigation](#4-keyboard-navigation)
5. [Screen Reader Best Practices](#5-screen-reader-best-practices)
6. [Form Accessibility](#6-form-accessibility)
7. [Data Table Accessibility](#7-data-table-accessibility)
8. [Chart / Data Visualization Accessibility](#8-chart--data-visualization-accessibility)
9. [Motion and Animation](#9-motion-and-animation)
10. [MUI-Specific Accessibility](#10-mui-specific-accessibility)
11. [Dashboard Accessibility](#11-dashboard-accessibility)
12. [Testing Tools and Methodology](#12-testing-tools-and-methodology)

---

## 1. WCAG 2.2 AA Compliance

### Overview

WCAG 2.2 (released October 2023) contains **87 success criteria** across three conformance levels. Level AA compliance (the legal standard in most jurisdictions) requires meeting all **56 Level A + AA criteria**. WCAG 2.2 removed criterion 4.1.1 (Parsing) and added 9 new criteria.

### The Four Principles (POUR)

| Principle | Meaning |
|---|---|
| **Perceivable** | Information must be presentable in ways all users can perceive |
| **Operable** | UI components and navigation must be operable by all users |
| **Understandable** | Information and UI operation must be understandable |
| **Robust** | Content must be robust enough for diverse user agents and assistive technologies |

### New WCAG 2.2 Criteria Relevant to AA

| Criterion | Level | What It Requires |
|---|---|---|
| **2.4.11 Focus Not Obscured (Minimum)** | AA | When an element receives keyboard focus, it must not be entirely hidden by sticky headers, footers, cookie banners, or floating UI elements |
| **2.5.7 Dragging Movements** | AA | Any drag-based functionality must also be achievable via single-pointer actions (click point A, click point B) |
| **2.5.8 Target Size (Minimum)** | AA | Pointer targets must be at least **24x24 CSS pixels** (exceptions for inline text links, user-agent controls, and essential sizing) |
| **3.2.6 Consistent Help** | A | Help mechanisms (contact info, chat, FAQ) must appear in the same relative position across pages |
| **3.3.7 Redundant Entry** | A | Information previously entered must be auto-populated or available for selection; do not force re-entry |
| **3.3.8 Accessible Authentication (Minimum)** | AA | Authentication must not require cognitive function tests (CAPTCHAs, memorization) unless alternatives are provided |

### Implementation Rules

**Do:**
- Ensure all interactive targets are at least 24x24px (buttons, links, icon buttons, chips)
- Provide single-click alternatives for all drag-and-drop interactions
- Keep help/support links in consistent positions across all pages
- Auto-populate previously entered form data within multi-step flows
- Ensure sticky headers/footers do not fully obscure focused elements
- Support password managers and passkeys for authentication

**Don't:**
- Rely on icon-only buttons smaller than 24px without adjacent spacing
- Implement drag-only reordering (e.g., Kanban boards) without alternatives
- Move help links to different positions on different pages
- Force users to re-enter addresses, emails, or names across form steps
- Use CAPTCHAs without accessible alternatives

### Common Mistakes
- Sticky navigation bars that cover focused elements when tabbing through content
- Small touch targets on mobile (especially icon buttons in dense table toolbars)
- Drag-to-reorder lists without up/down button alternatives

---

## 2. ARIA Patterns

### Applicable WCAG Criteria
- **1.3.1 Info and Relationships** (A)
- **4.1.2 Name, Role, Value** (A)
- **1.3.5 Identify Input Purpose** (AA)

### The First Rule of ARIA

> **Use native HTML elements and attributes first.** Only use ARIA when there is no equivalent HTML semantics. Adding ARIA does not change behavior -- it only changes what assistive technologies announce.

### Pattern Reference

#### Data Tables
```tsx
// PREFER native HTML tables
<table>
  <caption>Monthly Revenue by Agency</caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Agency</th>
      <th scope="col" aria-sort="none">Revenue</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Agency Alpha</th>
      <td>$125,000</td>
    </tr>
  </tbody>
</table>
```

**Rules:**
- Use `<caption>` to provide a table title
- Use `scope="col"` and `scope="row"` on `<th>` elements
- Use `aria-sort="ascending|descending|none"` on sortable column headers
- Never use tables for layout purposes

#### Tabs
```tsx
<div role="tablist" aria-label="Dashboard sections">
  <button role="tab" aria-selected="true" aria-controls="panel-overview" id="tab-overview">
    Overview
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-finance" id="tab-finance" tabIndex={-1}>
    Finance
  </button>
</div>
<div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
  {/* content */}
</div>
```

**Rules:**
- Container gets `role="tablist"` with `aria-label`
- Each tab gets `role="tab"` with `aria-selected` and `aria-controls`
- Only the active tab has `tabIndex={0}`; inactive tabs get `tabIndex={-1}`
- Arrow keys navigate between tabs (roving tabindex pattern)
- Tab panels get `role="tabpanel"` with `aria-labelledby`

#### Modals / Dialogs
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Deletion</h2>
  <p id="dialog-description">This action cannot be undone.</p>
  {/* focus-trapped content */}
</div>
```

**Rules:**
- Use `role="dialog"` and `aria-modal="true"`
- Provide `aria-labelledby` pointing to the dialog title
- Trap focus within the dialog
- Close on Escape key
- Return focus to the trigger element on close
- Apply `inert` attribute to background content (preferred over `aria-hidden`)

#### Forms
```tsx
<form aria-label="Client registration">
  <fieldset>
    <legend>Contact Information</legend>
    <label htmlFor="email">Email (required)</label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      aria-invalid={hasError}
      aria-describedby="email-error email-hint"
    />
    <span id="email-hint">We will use this for login credentials</span>
    <span id="email-error" role="alert">
      {hasError && 'Please enter a valid email address'}
    </span>
  </fieldset>
</form>
```

#### Cards (KPI / Stat Widgets)
```tsx
<article aria-label="Total Revenue: $2.4M, up 12% from last month">
  <h3>Total Revenue</h3>
  <p aria-hidden="true">$2.4M</p>
  <p aria-hidden="true">+12%</p>
</article>
```

**Rules:**
- Use `<article>` or `<section>` with `aria-label` providing the full context
- Ensure the complete data point is readable as a single announcement
- Decorative icons inside cards should have `aria-hidden="true"`

#### Charts
```tsx
<figure role="img" aria-label="Bar chart showing monthly revenue trends from January to December 2025. Peak in July at $340K.">
  <RechartsBarChart accessibilityLayer>
    {/* chart content */}
  </RechartsBarChart>
  <figcaption>Monthly Revenue Trends 2025</figcaption>
</figure>
```

### Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `<div onClick={handler}>` without role or keyboard support | Use `<button>` or add `role="button"` + `tabIndex={0}` + `onKeyDown` |
| `aria-label` on a `<div>` that has no role | Add an appropriate role or use semantic HTML |
| Redundant ARIA: `<button role="button">` | Remove the redundant `role` -- `<button>` already has implicit role |
| `aria-hidden="true"` on focusable elements | Remove `aria-hidden` or make element non-focusable |
| Using `aria-label` when visible text exists | Use `aria-labelledby` to reference the visible text instead |

---

## 3. Color Contrast and Visual Accessibility

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **1.4.1 Use of Color** | A | Color must not be the only means of conveying information |
| **1.4.3 Contrast (Minimum)** | AA | Text: 4.5:1 ratio; Large text (18pt / 14pt bold): 3:1 ratio |
| **1.4.11 Non-text Contrast** | AA | UI components and graphical objects: 3:1 ratio against adjacent colors |
| **2.4.7 Focus Visible** | AA | Keyboard focus indicator must be visible |
| **2.4.11 Focus Not Obscured** | AA | Focused element must not be entirely covered by other content |

### Contrast Ratio Requirements

| Element Type | Minimum Ratio | Example |
|---|---|---|
| Normal text (< 18pt) | **4.5:1** | Body copy, labels, table cells |
| Large text (>= 18pt or >= 14pt bold) | **3:1** | Headings, large buttons |
| UI components (borders, icons, focus rings) | **3:1** | Input borders, icon buttons, chart elements |
| Disabled elements | Exempt | Greyed-out buttons (but still indicate state) |
| Logos and decorative text | Exempt | Brand marks |

### Focus Indicator Rules

**Do:**
- Use a visible focus ring with at least **3:1 contrast** against adjacent colors
- Make focus indicators at least **2px** thick
- Ensure focus is visible on all interactive elements (buttons, links, inputs, custom controls)
- Test focus visibility on both light and dark backgrounds

**Don't:**
- Remove `outline: none` without providing an alternative focus style
- Use only color changes (e.g., background tint) as focus indicators
- Let sticky elements obscure focused items

```css
/* Good focus indicator */
*:focus-visible {
  outline: 2px solid #1565C0;
  outline-offset: 2px;
}

/* Ensure focus not obscured by sticky elements */
:target {
  scroll-margin-top: 80px; /* height of sticky header */
}
```

### Color-Blind Safe Design

**Do:**
- Supplement color with icons, patterns, text labels, or shape differences
- Use a color-blind simulation tool to test all palettes
- For status indicators: use icons (checkmark, warning triangle, X) alongside color
- For charts: use pattern fills, different line styles, and direct labels
- Test with protanopia, deuteranopia, and tritanopia simulations

**Don't:**
- Use red/green alone to indicate success/error
- Rely on color alone to distinguish chart series, data points, or table row states
- Use adjacent colors that are indistinguishable under color vision deficiency

### Recommended Status Indicator Pattern

```tsx
// Instead of color-only status
// BAD: <span style={{ color: 'red' }}>Error</span>

// GOOD: icon + text + color
<span style={{ color: '#D32F2F' }}>
  <ErrorIcon aria-hidden="true" /> Error: Payment failed
</span>
```

### Common Mistakes
- Placeholder text with insufficient contrast (browsers default to light gray ~#999, which fails against white)
- Disabled button text that is indistinguishable from enabled text
- Chart legends using only color swatches without labels
- Focus indicators removed globally via CSS reset (`* { outline: none }`)
- Using brand colors that pass on white but fail on the actual background used

---

## 4. Keyboard Navigation

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **2.1.1 Keyboard** | A | All functionality available via keyboard |
| **2.1.2 No Keyboard Trap** | A | Focus can always be moved away using keyboard |
| **2.4.3 Focus Order** | A | Focus order preserves meaning and operability |
| **2.4.7 Focus Visible** | AA | Focus indicator is visible |
| **2.4.11 Focus Not Obscured** | AA | Focused element is not entirely hidden |

### Tab Order

**Do:**
- Follow the visual/logical reading order (top-to-bottom, left-to-right in LTR)
- Use DOM order to establish tab sequence (do not rely on CSS to reorder visually)
- Use `tabIndex={0}` to include custom interactive elements in tab order
- Use `tabIndex={-1}` for elements that need programmatic focus but should not be in tab order

**Don't:**
- Use `tabIndex` values greater than 0 (creates unpredictable tab order)
- Use CSS `order`, `flex-direction: row-reverse`, or `grid` reordering that contradicts DOM order
- Make non-interactive elements (headings, paragraphs) focusable without reason

### Focus Trapping in Modals and Drawers

When a modal or drawer opens:
1. Move focus to the first focusable element inside (or the dialog itself)
2. Trap Tab/Shift+Tab within the modal boundaries
3. Close on Escape key press
4. On close, return focus to the element that triggered the open
5. Apply `inert` attribute to all content behind the modal

```tsx
// Focus trap implementation pattern
import { useRef, useEffect } from 'react';

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}
```

### Skip Links

```tsx
// Place as the first element in the layout
<a
  href="#main-content"
  className="skip-link"
  // Visually hidden until focused
  sx={{
    position: 'absolute',
    left: '-9999px',
    '&:focus': {
      position: 'fixed',
      top: 8,
      left: 8,
      zIndex: 9999,
      padding: '8px 16px',
      backgroundColor: 'primary.main',
      color: 'primary.contrastText',
    }
  }}
>
  Skip to main content
</a>

// The target
<main id="main-content" tabIndex={-1}>
  {/* page content */}
</main>
```

### Roving TabIndex for Complex Widgets

Use roving tabindex for toolbars, tab lists, menu bars, tree views, and grids:

```tsx
// Only one item in the group has tabIndex={0}
// Arrow keys move tabIndex={0} between items
// Tab enters/exits the group

function RovingTabGroup({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      newIndex = (index + 1) % items.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      newIndex = (index - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = items.length - 1;
    }
    setActiveIndex(newIndex);
    itemRefs.current[newIndex]?.focus();
  };

  return items.map((item, i) => (
    <button
      key={item.id}
      tabIndex={i === activeIndex ? 0 : -1}
      onKeyDown={(e) => handleKeyDown(e, i)}
      ref={(el) => (itemRefs.current[i] = el)}
    >
      {item.label}
    </button>
  ));
}
```

### Common Mistakes
- Custom dropdown menus that trap focus with no Escape to exit
- Side drawers that do not trap focus (user tabs into hidden background content)
- After closing a modal, focus is lost (goes to `<body>` instead of the trigger)
- Using `onClick` without `onKeyDown` on non-button interactive elements
- Tab order jumps erratically due to CSS visual reordering

---

## 5. Screen Reader Best Practices

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **1.3.1 Info and Relationships** | A | Structure conveyed programmatically |
| **1.3.2 Meaningful Sequence** | A | Reading order is logical |
| **2.4.1 Bypass Blocks** | A | Skip repeated navigation |
| **2.4.2 Page Titled** | A | Pages have descriptive titles |
| **2.4.6 Headings and Labels** | AA | Headings and labels are descriptive |
| **4.1.2 Name, Role, Value** | A | All UI components have accessible names |

### Semantic HTML

**Do:**
- Use `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` for page landmarks
- Use `<section>` with `aria-label` for named regions
- Use `<article>` for self-contained content blocks (cards, posts)
- Use `<button>` for actions, `<a>` for navigation
- Use `<ul>`/`<ol>` for lists (screen readers announce "list of N items")

**Don't:**
- Use `<div>` or `<span>` for interactive elements
- Use `<a>` without an `href` (it becomes non-focusable)
- Use `<br>` tags for spacing (use CSS margin/padding)
- Put interactive content inside headings

### Heading Hierarchy

**Rules:**
- Exactly **one `<h1>` per page**, matching the page title
- No skipped levels: h1 -> h2 -> h3 (never h1 -> h3)
- Headings act as a table of contents -- screen reader users navigate by heading
- Heading text must be descriptive (not "Section 1" or "More")

```tsx
// Dashboard page heading structure
<h1>Agency Dashboard</h1>              // Page title
  <h2>Key Performance Indicators</h2>  // Section
    <h3>Revenue</h3>                   // KPI card heading
    <h3>Active Projects</h3>
  <h2>Recent Activity</h2>
    <h3>Tasks Completed This Week</h3>
  <h2>Financial Overview</h2>
    <h3>Monthly Revenue Trend</h3>     // Chart heading
```

### Landmarks

| HTML Element | ARIA Role | Purpose |
|---|---|---|
| `<header>` | `banner` | Site-wide header (logo, nav) |
| `<nav>` | `navigation` | Navigation sections (label each: `aria-label="Main navigation"`) |
| `<main>` | `main` | Primary page content (exactly one per page) |
| `<aside>` | `complementary` | Sidebar/supplementary content |
| `<footer>` | `contentinfo` | Site-wide footer |
| `<section aria-label="...">` | `region` | Named content regions |
| `<form aria-label="...">` | `form` | Named forms |

**Rule:** Include ALL page content within landmarks. Screen reader users who navigate by landmarks will miss content outside them.

### Live Regions for Dynamic Content

```tsx
// Pattern: persistent live region that announces updates
function LiveAnnouncer() {
  const [message, setMessage] = useState('');

  // Expose setter via context or ref
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className="sr-only" // visually hidden
    >
      {message}
    </div>
  );
}
```

**Critical Rules for Live Regions:**
1. The live region element **must exist in the DOM before content is injected** -- do not conditionally render it
2. Change the **text content** of the element; do not replace the element itself
3. Use `aria-live="polite"` for non-urgent updates (data loaded, item added)
4. Use `aria-live="assertive"` only for critical alerts (errors, session timeout)
5. Use `role="status"` (implicit `aria-live="polite"`) for status messages
6. Use `role="alert"` (implicit `aria-live="assertive"`) for urgent alerts
7. In React: **keep the container mounted at all times** -- React's virtual DOM can destroy and recreate elements, breaking the live region connection

### Announcing State Changes

```tsx
// Example: sorting a table column
const handleSort = (column: string, direction: string) => {
  setSortConfig({ column, direction });
  announceToScreenReader(`Table sorted by ${column}, ${direction} order`);
};

// Example: pagination
const handlePageChange = (page: number, totalPages: number) => {
  setCurrentPage(page);
  announceToScreenReader(`Page ${page} of ${totalPages}. Showing rows ${startRow} to ${endRow}.`);
};

// Example: filter applied
const handleFilter = (filterName: string, resultCount: number) => {
  announceToScreenReader(`Filter "${filterName}" applied. ${resultCount} results shown.`);
};
```

### Common Mistakes
- Pages with no `<h1>` or multiple `<h1>` elements
- Missing `<main>` landmark
- Multiple `<nav>` elements without unique `aria-label` values
- Live region added to DOM and immediately populated (screen reader misses it)
- Using `aria-live="assertive"` for non-critical notifications (interrupts users)
- Visually hidden content that is still focusable (confuses screen reader users)

---

## 6. Form Accessibility

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **1.3.1 Info and Relationships** | A | Form structure conveyed programmatically |
| **1.3.5 Identify Input Purpose** | AA | Input purpose can be determined (autocomplete) |
| **3.3.1 Error Identification** | A | Errors are identified and described in text |
| **3.3.2 Labels or Instructions** | A | Labels or instructions provided for input |
| **3.3.3 Error Suggestion** | AA | Suggestions provided for correctable errors |
| **3.3.4 Error Prevention (Legal/Financial)** | AA | Submissions are reversible, checked, or confirmed |
| **3.3.7 Redundant Entry** | A | Previously entered info is auto-populated |
| **3.3.8 Accessible Authentication** | AA | No cognitive function test for auth |

### Labels

**Do:**
- Every input **must** have a visible `<label>` associated via `htmlFor`/`id`
- Include "(required)" in label text for required fields (do not rely on asterisk alone)
- Use `autocomplete` attribute for common fields (name, email, address, phone)
- Place labels above or to the left of inputs (consistent positioning)

**Don't:**
- Use placeholder text as a substitute for labels (disappears on input, insufficient contrast)
- Use `aria-label` when a visible label is feasible
- Float labels that shrink to tiny text sizes on focus

```tsx
// MUI TextField with proper labeling
<TextField
  id="client-email"
  label="Email address (required)"
  type="email"
  required
  autoComplete="email"
  error={!!errors.email}
  helperText={errors.email?.message}
  inputProps={{
    'aria-describedby': 'email-helper-text',
    'aria-invalid': !!errors.email,
  }}
/>
```

### Error Messages

**Do:**
- Display error text adjacent to the invalid field (not only at the top of the form)
- Use `aria-invalid="true"` on the invalid input
- Use `aria-describedby` to associate the error message with the input
- Use `role="alert"` or `aria-live="assertive"` for error summaries
- Provide actionable error text: "Enter an email in the format name@example.com" (not just "Invalid input")
- On form submission failure, move focus to the first invalid field or to an error summary

**Don't:**
- Display errors only as color changes (red border without text)
- Display errors only as toast notifications (screen readers may miss them)
- Clear the user's input when showing an error
- Validate on every keystroke (overwhelming for screen reader users)

```tsx
// Error summary pattern
<div role="alert" tabIndex={-1} ref={errorSummaryRef}>
  <h2>Please correct the following errors:</h2>
  <ul>
    {errors.map((error) => (
      <li key={error.field}>
        <a href={`#${error.field}`}>{error.message}</a>
      </li>
    ))}
  </ul>
</div>
```

### Fieldset and Legend Grouping

**Use `<fieldset>` and `<legend>` for:**
- Radio button groups
- Checkbox groups
- Groups of related fields (address block, contact info, payment details)

```tsx
<FormControl component="fieldset">
  <FormLabel component="legend">Notification Preferences</FormLabel>
  <FormGroup>
    <FormControlLabel control={<Checkbox />} label="Email notifications" />
    <FormControlLabel control={<Checkbox />} label="SMS notifications" />
    <FormControlLabel control={<Checkbox />} label="Push notifications" />
  </FormGroup>
</FormControl>
```

### Validation Timing

| Timing | When to Use |
|---|---|
| On blur (field exit) | Best for most fields -- gives user time to complete input |
| On submit | Always validate on submit as a safety net |
| On change | Only for character counters or format masks (non-blocking) |
| Real-time (keystroke) | Avoid -- creates noise for screen reader users |

### Common Mistakes
- MUI `TextField` without an explicit `label` prop (renders unlabeled input)
- `Select` dropdowns without associated labels
- Radio groups without `<fieldset>`/`<legend>` (screen reader cannot determine grouping)
- Error messages not programmatically associated with inputs
- Date pickers that are keyboard-inaccessible
- Auto-advancing focus between fields (phone number split into 3 inputs)

---

## 7. Data Table Accessibility

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **1.3.1 Info and Relationships** | A | Table structure is programmatically determined |
| **1.3.2 Meaningful Sequence** | A | Reading order is logical |
| **2.4.6 Headings and Labels** | AA | Table headers are descriptive |

### Essential Table Structure

```tsx
<table aria-label="Client financial summary for Q4 2025">
  <caption>Client Financial Summary - Q4 2025</caption>
  <thead>
    <tr>
      <th scope="col">Client Name</th>
      <th scope="col" aria-sort="ascending">
        <button onClick={() => handleSort('revenue')}>
          Revenue
          <SortIcon aria-hidden="true" />
        </button>
      </th>
      <th scope="col" aria-sort="none">
        <button onClick={() => handleSort('status')}>
          Status
          <SortIcon aria-hidden="true" />
        </button>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Acme Corp</th>
      <td>$125,000</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

### Sortable Columns

**Do:**
- Use `<button>` elements inside `<th>` for sort triggers (keyboard accessible)
- Apply `aria-sort="ascending"`, `aria-sort="descending"`, or `aria-sort="none"` on the `<th>`
- Announce sort changes via live region: "Table sorted by Revenue, descending"
- Set `aria-sort="none"` on unsorted sortable columns (indicates they ARE sortable)

**Don't:**
- Make the entire `<th>` clickable without button semantics
- Use only an icon (arrow) to indicate sort direction
- Omit `aria-sort` on sortable columns (screen readers cannot determine sortability)

### Pagination

**Do:**
- Announce page changes: "Page 2 of 5. Showing rows 11 to 20 of 48."
- Provide clear labeling on pagination controls: `aria-label="Go to page 3"`
- Mark current page: `aria-current="page"`
- Move focus to the table or table caption after page change

```tsx
<nav aria-label="Table pagination">
  <button aria-label="Go to previous page" disabled={page === 1}>
    Previous
  </button>
  {pages.map((p) => (
    <button
      key={p}
      aria-label={`Go to page ${p}`}
      aria-current={p === currentPage ? 'page' : undefined}
    >
      {p}
    </button>
  ))}
  <button aria-label="Go to next page" disabled={page === totalPages}>
    Next
  </button>
</nav>
```

### Row Selection

**Do:**
- Use native checkboxes for row selection
- Label each row checkbox: `aria-label="Select Acme Corp"`
- Provide a "select all" checkbox in the header with `aria-label="Select all rows"`
- Announce selection count via live region: "3 rows selected"

**Don't:**
- Use clickable rows without explicit checkbox controls
- Fail to announce how many rows are selected
- Make row selection keyboard-inaccessible

### Caption and Summary

- `<caption>` is the preferred method to label a table -- visible and announced by screen readers
- For additional context, use `aria-describedby` pointing to explanatory text near the table
- If the caption is visually hidden, apply `sr-only` CSS class to the `<caption>` element

### MUI DataGrid Accessibility Issues

Known issues with MUI DataGrid:
- Unsorted columns may lack `aria-sort="none"`, giving no indication of sortability
- Column header buttons may be removed from keyboard focus order via `tabIndex={-1}`
- The grid `role` may intercept keystrokes, preventing screen reader access to header controls
- **Mitigation**: Test DataGrid with a screen reader; add custom ARIA attributes where MUI falls short

---

## 8. Chart / Data Visualization Accessibility

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **1.1.1 Non-text Content** | A | All non-text content has a text alternative |
| **1.4.1 Use of Color** | A | Color is not the sole means of conveying information |
| **1.4.11 Non-text Contrast** | AA | Graphical objects have 3:1 contrast against adjacent colors |

### Alt Text for Charts

**Do:**
- Wrap charts in `<figure>` with `role="img"` and a descriptive `aria-label`
- The `aria-label` should convey: chart type, what data is shown, key trends or outliers
- Include a `<figcaption>` for the visible title
- Provide a data table alternative accessible via a toggle or expandable section

```tsx
<figure
  role="img"
  aria-label="Line chart showing monthly revenue from January to December 2025. Revenue peaked in July at $340K and was lowest in February at $180K. Overall upward trend."
>
  <figcaption>Monthly Revenue Trend - 2025</figcaption>
  <RechartsLineChart accessibilityLayer>
    {/* chart content */}
  </RechartsLineChart>
  <details>
    <summary>View data as table</summary>
    <table aria-label="Monthly revenue data">
      {/* data table alternative */}
    </table>
  </details>
</figure>
```

**Don't:**
- Use generic alt text like "Chart" or "Revenue chart"
- Omit text alternatives for charts entirely
- Assume charts are self-explanatory for screen reader users

### Recharts-Specific Accessibility

- Use the `accessibilityLayer` prop to enable keyboard navigation of data points
- Recharts tooltips function as live regions, announcing updates as users navigate
- Adding `role="application"` to the chart container enables Forms Mode in JAWS/NVDA
- Consider wrapping the chart container in `role="img"` with `aria-label` when the full SVG internals should be hidden from screen readers

### Data Tables as Chart Alternatives

Every chart should have a data table alternative available:
- Use a toggle button: "Show as table" / "Show as chart"
- Or place the table in a `<details>` element below the chart
- The data table must meet all table accessibility requirements (headers, scope, caption)

### Color-Blind Safe Chart Design

**Do:**
- Use pattern fills (stripes, dots, crosshatch) in addition to color for bar/area charts
- Use different line styles (solid, dashed, dotted) for multi-series line charts
- Add direct labels on chart elements when feasible
- Maintain 3:1 contrast between adjacent data elements
- Test palettes with color-blindness simulation tools

**Don't:**
- Use only color to distinguish chart series
- Use red-green as the primary distinguishing pair
- Rely solely on a color legend to identify data series

### Common Mistakes
- Charts with no text alternative at all (opaque SVG to screen readers)
- Legends that use only color swatches
- Hover-only tooltips with no keyboard access
- Pie charts with too many similar-colored slices

---

## 9. Motion and Animation

### Applicable WCAG Criteria

| Criterion | Level | Requirement |
|---|---|---|
| **2.2.2 Pause, Stop, Hide** | A | Moving/blinking/scrolling content can be paused, stopped, or hidden |
| **2.3.1 Three Flashes or Below Threshold** | A | No content flashes more than 3 times per second |
| **2.3.3 Animation from Interactions** | AAA | Motion animation from interactions can be disabled (unless essential) |

### prefers-reduced-motion

**Always respect the user's OS-level motion preference:**

```css
/* Global: reduce all transitions and animations */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### React Hook for Motion Preference

```tsx
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(query.matches);

    const handler = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Usage
function AnimatedChart() {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <RechartsLineChart>
      <Line
        isAnimationActive={!reduceMotion}
        animationDuration={reduceMotion ? 0 : 300}
      />
    </RechartsLineChart>
  );
}
```

### Animation Rules

**Do:**
- Provide a mechanism to pause, stop, or hide auto-playing animations
- Keep transition durations short (150-300ms for UI responses)
- Use opacity and transform for smooth animations (avoid layout-triggering properties)
- Disable animations entirely when `prefers-reduced-motion: reduce` is active

**Don't:**
- Auto-play videos or carousels without pause controls
- Use parallax scrolling effects without a reduced-motion alternative
- Flash content more than 3 times per second
- Use continuous spinning loaders without a text fallback ("Loading...")
- Animate large portions of the screen (full-page transitions can trigger vestibular issues)

### Vestibular Trigger Avoidance

Content that can trigger vestibular disorders:
- Parallax scrolling
- Background video/animation
- Large-scale zoom/pan animations
- Content that moves while the user scrolls
- Rapid slide transitions

**Mitigation**: All of these should be disabled or replaced with static alternatives when `prefers-reduced-motion: reduce` is detected.

### Common Mistakes
- MUI `Fade`, `Slide`, `Grow`, `Collapse` transitions not respecting reduced motion
- Recharts animations continuing despite reduced-motion preference
- Loading spinners with no text alternative
- Auto-scrolling carousels with no pause button

---

## 10. MUI-Specific Accessibility

### Built-in Accessibility Features

MUI components provide significant accessibility support out of the box:

| Component | Built-in A11y Features |
|---|---|
| `Button` | Correct `role="button"`, keyboard support (Enter/Space), focus styling |
| `TextField` | Label association, helper text via `aria-describedby`, error states |
| `Select` | Listbox pattern, keyboard navigation, `aria-expanded` |
| `Dialog` | `role="dialog"`, `aria-modal`, focus trapping, Escape to close |
| `Tabs` | `role="tablist/tab/tabpanel"`, `aria-selected`, roving tabindex |
| `Menu` | `role="menu/menuitem"`, keyboard navigation, focus management |
| `Checkbox/Radio` | Proper input roles, label association, checked state |
| `Tooltip` | `aria-describedby` association, Escape to dismiss |
| `Snackbar` | `role="alert"`, `aria-live` support |
| `Accordion` | `aria-expanded`, `aria-controls`, keyboard support |
| `Breadcrumbs` | `<nav aria-label="breadcrumb">`, `aria-current="page"` |

### Common Pitfalls with Custom Wrappers

When creating wrapper components (like Vuexy's `CustomChip`, `CustomAvatar`, etc.):

**1. Lost ARIA Attributes**

```tsx
// BAD: Wrapper strips MUI's built-in accessibility
function CustomChip({ label, ...rest }) {
  return (
    <div className="custom-chip">
      <MuiChip label={label} />  {/* ARIA props in ...rest are lost */}
    </div>
  );
}

// GOOD: Forward all props including ARIA attributes
function CustomChip({ label, ...rest }) {
  return <MuiChip label={label} {...rest} />;
}
```

**2. Broken Ref Forwarding**

```tsx
// BAD: No ref forwarding breaks focus management
function CustomButton({ children, ...props }) {
  return <MuiButton {...props}>{children}</MuiButton>;
}

// GOOD: Forward refs for focus management
const CustomButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => (
    <MuiButton ref={ref} {...props}>{children}</MuiButton>
  )
);
```

**3. Icon-Only Buttons Without Labels**

```tsx
// BAD: No accessible name
<IconButton onClick={onEdit}>
  <EditIcon />
</IconButton>

// GOOD: Accessible name via aria-label
<IconButton onClick={onEdit} aria-label="Edit client record">
  <EditIcon />
</IconButton>
```

**4. Custom Avatar Missing Alt Text**

```tsx
// BAD: Decorative alt text or missing alt
<Avatar src={user.photo} />

// GOOD: Meaningful alt text
<Avatar src={user.photo} alt={`${user.name}'s profile photo`} />

// GOOD: If purely decorative (name is shown elsewhere)
<Avatar src={user.photo} alt="" />
```

**5. Tooltip-Only Labels**

```tsx
// BAD: Tooltip is the only way to know what a button does
<Tooltip title="Delete">
  <IconButton>
    <DeleteIcon />
  </IconButton>
</Tooltip>

// GOOD: aria-label provides the accessible name
<Tooltip title="Delete">
  <IconButton aria-label="Delete client">
    <DeleteIcon />
  </IconButton>
</Tooltip>
```

### MUI Theme Accessibility Checklist

- Default MUI theme meets WCAG 2.1 contrast requirements
- When customizing theme colors, verify contrast ratios for all text-on-background combinations
- Ensure custom focus styles maintain 3:1 contrast
- Check that `palette.action.disabled` colors are appropriate (disabled elements are exempt from contrast but should still be visually distinct)
- Use MUI's `visuallyHidden` utility for screen-reader-only text

```tsx
import { visuallyHidden } from '@mui/utils';

<Box component="span" sx={visuallyHidden}>
  Screen reader only text
</Box>
```

### Common Mistakes
- Overriding MUI's focus styles without providing alternatives
- Using `<Box component="div" onClick={...}>` instead of `<Button>`
- Not labeling `<Select>` components (MUI requires explicit `<InputLabel>`)
- Wrapping MUI components in extra `<div>` layers that break ARIA relationships
- Using `<Typography>` for headings without the correct `component="h2"` prop

---

## 11. Dashboard Accessibility

### Key Challenges

Dashboards combine multiple complex patterns (charts, tables, KPIs, filters) into dense layouts, creating unique accessibility challenges.

### Layout and Reading Order

**Do:**
- Establish a logical reading order: page title -> filters/controls -> primary KPIs -> detail charts -> data tables
- Use heading hierarchy to create an outline of dashboard sections
- Wrap each dashboard section in a `<section>` with `aria-label`
- Ensure all content is contained within landmarks

```tsx
<main>
  <h1>Agency Performance Dashboard</h1>

  <section aria-label="Date range filter">
    <h2 className="sr-only">Filters</h2>
    {/* filter controls */}
  </section>

  <section aria-label="Key performance indicators">
    <h2>Key Metrics</h2>
    <div role="list">
      <article role="listitem" aria-label="Total Revenue: $2.4M, up 12%">
        {/* KPI card */}
      </article>
      <article role="listitem" aria-label="Active Projects: 47, down 3">
        {/* KPI card */}
      </article>
    </div>
  </section>

  <section aria-label="Revenue trend chart">
    <h2>Revenue Trend</h2>
    {/* chart with figure/role="img"/aria-label */}
  </section>

  <section aria-label="Client data table">
    <h2>Client Details</h2>
    {/* accessible data table */}
  </section>
</main>
```

### KPI Cards and Stat Widgets

**Do:**
- Use `<article>` elements for individual KPI cards
- Provide a complete `aria-label` that includes: metric name, value, and trend context
- Group related KPIs with headings
- Ensure trend indicators (arrows, percentages) have text equivalents

**Don't:**
- Use decorative icons without hiding them (`aria-hidden="true"`)
- Rely on color alone for positive/negative trends (green up vs red down)
- Make KPI values readable only through visual formatting

```tsx
// KPI Card accessible pattern
<article aria-label="Monthly Revenue: $245,000. Up 12.5% compared to last month.">
  <h3>Monthly Revenue</h3>
  <p className="kpi-value" aria-hidden="true">$245K</p>
  <p aria-hidden="true">
    <TrendUpIcon aria-hidden="true" />
    <span style={{ color: 'green' }}>+12.5%</span>
  </p>
</article>
```

### Real-Time Updates

**Do:**
- Use `aria-live="polite"` regions for non-critical data updates
- Batch updates to avoid flooding screen readers with announcements
- Provide a "last updated" timestamp accessible to screen readers
- Allow users to pause auto-refresh

**Don't:**
- Use `aria-live="assertive"` for routine data refreshes
- Update live regions more frequently than every 10-15 seconds
- Announce every individual data point change in a multi-metric refresh

```tsx
// Batched update announcement
const announceDataRefresh = useCallback(() => {
  if (updatedMetrics.length > 0) {
    announce(`Dashboard data refreshed. ${updatedMetrics.length} metrics updated. Last update: ${timestamp}`);
  }
}, [updatedMetrics, timestamp]);
```

### Complex Dashboard Layouts

**Do:**
- Test tab order through the entire dashboard
- Ensure grid-based layouts maintain logical DOM order
- Provide keyboard shortcuts for common actions (document them in an accessible help dialog)
- Allow sections to be collapsed/expanded with proper `aria-expanded` states

**Don't:**
- Use CSS Grid or Flexbox ordering that contradicts DOM order
- Create dense layouts where small targets are adjacent (24px minimum)
- Require mouse hover to reveal controls (use visible buttons or keyboard-triggered reveals)

### Common Mistakes
- KPI cards with aria-labels that say "card" instead of the actual metric
- Charts without any text alternatives in dashboard context
- Tab order that jumps between unrelated sections
- Real-time updates that continuously interrupt screen reader users
- Dashboard filters that do not announce result count changes

---

## 12. Testing Tools and Methodology

### Automated Testing Tools

#### axe-core (Deque)
- Industry standard engine, used by Google Lighthouse and Microsoft Accessibility Insights
- Covers WCAG 2.0, 2.1, and 2.2 at all levels
- Zero false positives guarantee
- Catches ~30-40% of accessibility issues (automated tools cannot catch everything)

#### jest-axe (Unit Testing)

```tsx
// Setup: jest.setup.ts
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

// Test file
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

describe('ClientCard', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ClientCard client={mockClient} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Note:** jest-axe runs in JSDOM, which does not support color contrast checking. Use browser-based tools for contrast testing.

#### @axe-core/react (Development)

```tsx
// Only in development
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

Reports violations directly in the browser console during development.

#### Lighthouse

- Built into Chrome DevTools (Audits panel)
- Accessibility score 0-100
- Uses axe-core under the hood
- Also checks performance, SEO, and best practices

#### eslint-plugin-jsx-a11y

```json
// .eslintrc.json
{
  "extends": ["plugin:jsx-a11y/recommended"],
  "plugins": ["jsx-a11y"]
}
```

Catches issues at code-authoring time:
- Missing alt text on images
- Missing labels on form elements
- Click handlers on non-interactive elements
- Invalid ARIA attributes

#### Playwright / Cypress with axe

```tsx
// Playwright example
import AxeBuilder from '@axe-core/playwright';

test('dashboard has no a11y violations', async ({ page }) => {
  await page.goto('/dashboard');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Manual Testing Methodology

#### Keyboard Testing Checklist

1. Tab through the entire page -- is every interactive element reachable?
2. Is the focus order logical (matches visual order)?
3. Are focus indicators visible on every focused element?
4. Can modals/drawers be closed with Escape?
5. Does focus return to the trigger after closing modals?
6. Can all dropdown menus be operated with arrow keys?
7. Can data tables be navigated and sorted via keyboard?
8. Are there any keyboard traps?

#### Screen Reader Testing

**Recommended browser/screen reader combinations:**

| Screen Reader | Browser | OS | Usage Share |
|---|---|---|---|
| **NVDA** | Chrome / Firefox | Windows | ~40% |
| **JAWS** | Chrome | Windows | ~30% |
| **VoiceOver** | Safari | macOS / iOS | ~25% |
| **TalkBack** | Chrome | Android | ~5% |

**Screen reader test checklist:**
1. Is the page title announced on load?
2. Can you navigate by headings? Are they logical?
3. Are all landmarks announced and labeled?
4. Are form labels announced when focusing inputs?
5. Are error messages announced when they appear?
6. Are table headers announced when navigating cells?
7. Are live region updates (sort, filter, page changes) announced?
8. Are chart alternatives (alt text, data tables) available?
9. Are dynamic content changes (KPI updates) announced appropriately?

### Testing Pyramid for Accessibility

```
          /\
         /  \   Manual screen reader testing
        /    \  (catches ~30% of remaining issues)
       /------\
      /        \   Browser-based automated testing
     /          \  Lighthouse, axe DevTools, Playwright
    /------------\
   /              \   Unit/component testing
  /                \  jest-axe, React Testing Library
 /------------------\
/                    \  Static analysis (linting)
/                      \ eslint-plugin-jsx-a11y
```

- **Linting** catches ~5% of issues at code time (missing alt, missing labels)
- **Unit tests** catch ~15% of issues (component-level ARIA, role correctness)
- **E2E automated** catches ~20% of issues (rendered DOM, some contrast)
- **Manual testing** catches ~60% of issues (keyboard flow, screen reader UX, cognitive)

**Automated tools alone are insufficient.** They catch structural violations but miss context, usability, and the actual experience of assistive technology users.

### Recommended Testing Cadence

| Activity | Frequency |
|---|---|
| eslint-plugin-jsx-a11y in CI | Every commit |
| jest-axe component tests | Every PR |
| Lighthouse audit | Weekly / per sprint |
| Screen reader walkthrough | Per feature / per sprint |
| Full manual audit | Per release / quarterly |

---

## Quick Reference: WCAG Criteria by UI Component

| Component | Key Criteria | What to Check |
|---|---|---|
| **All text** | 1.4.3, 1.4.6 | Contrast ratios |
| **Images** | 1.1.1 | Alt text |
| **Forms** | 1.3.1, 3.3.1-3.3.4 | Labels, errors, instructions |
| **Tables** | 1.3.1, 2.4.6 | Headers, scope, caption, aria-sort |
| **Charts** | 1.1.1, 1.4.1, 1.4.11 | Alt text, color independence, contrast |
| **Modals** | 2.1.2, 2.4.3 | Focus trap, focus return, Escape |
| **Navigation** | 2.4.1, 2.4.3 | Skip links, focus order, landmarks |
| **Dynamic content** | 4.1.3 | Live regions, status messages |
| **Animation** | 2.2.2, 2.3.1 | prefers-reduced-motion, no flash |
| **Authentication** | 3.3.8 | No cognitive tests, password manager support |
| **Touch targets** | 2.5.8 | 24x24px minimum |
| **Drag interactions** | 2.5.7 | Single-pointer alternative |

---

## Sources

- [WCAG 2.2 Specification - W3C](https://www.w3.org/TR/WCAG22/)
- [What's New in WCAG 2.2 - W3C WAI](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [ARIA Authoring Practices Guide (APG) - W3C](https://www.w3.org/WAI/ARIA/apg/)
- [APG Patterns - W3C](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [Understanding Non-text Contrast (1.4.11) - W3C](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- [Understanding Contrast Minimum (1.4.3) - W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WebAIM: Keyboard Accessibility - Tabindex](https://webaim.org/techniques/keyboard/tabindex)
- [Complete Guide to Keyboard Accessibility](https://www.accessibility.build/guides/keyboard-accessibility)
- [Keyboard Navigation Patterns for Complex Widgets - UXPin](https://www.uxpin.com/studio/blog/keyboard-navigation-patterns-complex-widgets/)
- [WebAIM: Semantic Structure](https://webaim.org/techniques/semanticstructure/)
- [Landmark Regions - W3C APG](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [ARIA Live Regions - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [Complete Guide to ARIA Live Regions - A11Y Collective](https://www.a11y-collective.com/blog/aria-live/)
- [When Your Live Region Isn't Live - Fixing aria-live in React](https://k9n.dev/blog/2025-11-aria-live/)
- [Accessible Form Validation - Smashing Magazine](https://www.smashingmagazine.com/2023/02/guide-accessible-form-validation/)
- [Validating Input - W3C WAI](https://www.w3.org/WAI/tutorials/forms/validation/)
- [WebAIM: Form Validation and Error Recovery](https://webaim.org/techniques/formvalidation/)
- [Tables Tutorial - W3C WAI](https://www.w3.org/WAI/tutorials/tables/)
- [WebAIM: Creating Accessible Data Tables](https://webaim.org/techniques/tables/data)
- [MUI DataGrid Accessibility Issues - GitHub #4124](https://github.com/mui/mui-x/issues/4124)
- [Data Grid Accessibility - MUI X](https://mui.com/x/react-data-grid/accessibility/)
- [How Accessibility Standards Empower Better Chart Design - Smashing Magazine](https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/)
- [Ultimate Checklist for Accessible Data Visualizations - A11Y Collective](https://www.a11y-collective.com/blog/accessible-charts/)
- [Accessible Data Visualizations - TPGi](https://www.tpgi.com/making-data-visualizations-accessible/)
- [Recharts Accessibility Wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)
- [prefers-reduced-motion - CSS Tricks](https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/)
- [Accessible Animations in React - Josh W. Comeau](https://www.joshwcomeau.com/react/prefers-reduced-motion/)
- [CSS prefers-reduced-motion Technique - W3C](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- [Building Accessible Custom Components with MUI and React](https://laur.design/blog/accessible-custom-components-mui-react/)
- [MUI Chip Accessibility Issues - GitHub #17708](https://github.com/mui/material-ui/issues/17708)
- [Next.js Accessibility Architecture](https://nextjs.org/docs/architecture/accessibility)
- [Next.js Route Announcer - GitHub #49386](https://github.com/vercel/next.js/issues/49386)
- [axe-core - Deque](https://www.deque.com/axe/axe-core/)
- [jest-axe - npm](https://www.npmjs.com/package/jest-axe)
- [eslint-plugin-jsx-a11y - GitHub](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [Testing React Accessibility with axe-core](https://oneuptime.com/blog/post/2026-01-15-test-react-accessibility-axe-core/view)
- [WCAG 2.2 AA Checklist - Level Access](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)
- [All 87 WCAG 2.2 Success Criteria - TestParty](https://testparty.ai/blog/wcag-22-success-criteria-list)
