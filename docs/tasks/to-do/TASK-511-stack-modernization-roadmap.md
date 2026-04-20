# TASK-511 — Stack Modernization Roadmap (Linear/Stripe/Vercel 2026 bar)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (foundation + DX + security + a11y across el portal)
- Effort: `Alto` (12 sub-tasks distribuidas en 5 olas)
- Type: `platform` + `epic`
- Status real: `Roadmap vivo`
- Rank: `Post-TASK-509`
- Domain: `platform`
- Blocked by: `none`
- Branch: `none (meta-task; cada sub-task tiene su propia rama)`

## Summary

Audit completo del stack (2026-04-20) identificó qué librerías están state-of-the-art y cuáles son legacy frente al estándar enterprise 2026 (Linear, Stripe, Vercel, Ramp, Notion). Esta task es el **roadmap de modernización** distribuido en 5 olas. Cada upgrade concreto vive como sub-task independiente.

## Why This Task Exists

Post-TASK-509 (Floating UI) quedó claro que invertir en foundation tiene pay-off grande: un upgrade de stack puntual eliminó una clase entera de bugs (stale anchor) y abrió la puerta a patterns enterprise (Floating UI platform-wide via TASK-510). Mismo principio se aplica a otras capas.

El roadmap prioriza por **valor / esfuerzo / riesgo** — empezar con los wins rápidos (Ola 1) antes de tocar auth o data fetching.

## State of the art ya presente (no action)

- Next 16 + React 19 ✓
- TypeScript 5.9 ✓
- MUI 7.3 + Emotion ✓
- Tailwind 4.1 ✓
- Vitest 4 ✓
- `@floating-ui/react` 0.27 (TASK-509) ✓
- valibot 1.2 ✓
- react-hook-form 7.69 + @hookform/resolvers 5 ✓
- @tanstack/react-table 8 ✓
- cmdk 1.1 (command palette) ✓
- kysely 0.28 ✓
- framer-motion 12 ✓
- date-fns 4 ✓
- Tiptap 3.14 ✓
- recharts 3.6 ✓
- react-email 5 ✓
- @sentry/nextjs 10 ✓

## Las 5 olas

### Ola 1 — Foundation (valor alto / esfuerzo acotado)

| Task | Cambio | Por qué |
|---|---|---|
| **TASK-512** | `react-toastify` → `sonner` | sonner es el estándar Vercel/Linear/Resend. Bundle -85%, mejor stacking, promise integration, swipe dismiss. |
| **TASK-513** | Instalar `@tanstack/react-query` | Gap crítico — Linear/Stripe/Vercel lo usan para server state (cache, refetch, optimistic). Hoy rodamos fetches ad-hoc. |
| **TASK-514** | ESLint 8 → 9 flat config | v8 es EOL. v9 + `eslint.config.js` es default desde 2024. |
| **TASK-515** | `jsonwebtoken` → `jose` | jose es edge-runtime ready, typed, usado por Auth.js v5. |

### Ola 2 — Auth modernization

| Task | Cambio | Por qué |
|---|---|---|
| **TASK-516** | NextAuth v4 → Auth.js v5 | v4 es legacy. v5 es edge-compatible, typed sessions, named handler. |
| **TASK-517** | Setup Playwright E2E | Gap — tenemos Vitest (unit) pero no E2E. 5-10 smokes críticos (auth, quote create, payroll close). |

### Ola 3 — Charts & forms consolidation

| Task | Cambio | Por qué |
|---|---|---|
| **TASK-518** | Deprecate `apexcharts`, todo en `recharts` | Convivir 2 chart libs es deuda. Recharts es React-nativo, a11y mejor. |
| **TASK-519** | `react-datepicker` → MUI X DatePicker | Integración nativa con MUI 7 theme + i18n + tokens. |

### Ola 4 — Enterprise polish

| Task | Cambio | Por qué |
|---|---|---|
| **TASK-520** | `mapbox-gl` → `maplibre-gl` | Ahorro de costo (Mapbox paga); `react-map-gl 8` soporta ambos. |
| **TASK-521** | `classnames` → `clsx` + `tailwind-merge` | clsx es 200 bytes; tailwind-merge resuelve conflictos de clases (útil con Tailwind 4). |
| **TASK-522** | Instalar MSW para tests | Gap — hoy los mocks son ad-hoc. MSW es el estándar. |

### Ola 5 — Security (opcional)

| Task | Cambio | Por qué |
|---|---|---|
| **TASK-523** | `bcryptjs` → `@node-rs/argon2` | Argon2 es state-of-the-art. Requiere re-hash de passwords existentes al próximo login (política de transición). |

## Dependencias entre olas

- **Ola 1** sin dependencias — arranca cuando quieras.
- **Ola 2** TASK-516 (Auth.js v5) se beneficia de TASK-515 (jose) terminada, porque Auth.js v5 depende de jose nativamente. Orden: TASK-515 → TASK-516.
- **Ola 3** independiente de las anteriores.
- **Ola 4** independiente.
- **Ola 5** requiere coordinación con operaciones (política de re-hash).

## Fuera del roadmap (decisiones arquitecturales mayores)

Estos son gaps documentados pero se dejan **fuera del scope** de esta modernización. Si aparecen use-cases reales, se abre task dedicada:

- **Radix UI primitives** — adopción requiere design system overlay tipo shadcn. Hoy MUI cubre.
- **Zustand / Jotai** — solo si RTK está subutilizado. Requiere audit del uso real de Redux.
- **Biome / oxlint** — estado experimental; esperar madurez.
- **Drizzle ORM** — Kysely nos sirve bien; no hay razón para migrar.
- **tRPC** — no usamos client-server typed RPC; API routes + valibot cubren.

## Criterios de éxito del roadmap

- [ ] Cada sub-task TASK-512 a TASK-523 cerrada con gates tsc/lint/test/build verdes.
- [ ] `package.json` no tiene dependencias deprecadas al cierre.
- [ ] Bundle size: neto reducido o neutral tras Olas 1-4.
- [ ] Stack audit 2026-Q3 actualizado a "no legacy detectado".
- [ ] Docs `GREENHOUSE_UI_PLATFORM_V1.md` actualizado con el stack canónico.

## Follow-ups

- **TASK-510** (Floating UI platform-wide) ya creada, corre en paralelo a Ola 1.
- Audit complementario: auditar uso real de `@reduxjs/toolkit` (¿UI-only state? ¿RTK Query activo?) para decidir TASK futura de Zustand migration.
