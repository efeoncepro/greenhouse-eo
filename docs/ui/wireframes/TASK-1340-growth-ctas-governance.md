# Wireframe — TASK-1340 (delta operador) Gobernanza del motor de CTAs (`/growth/ctas`)

## Meta

- Task: `TASK-1340` (delta operador 2026-07-18: "esto se gobierna desde el menú de Growth")
- Epic: `EPIC-023`
- UI rigor: `standard` (superficie interna operador; reusa patrones del cockpit Growth TASK-1276)
- Surface: `/growth/ctas` — routeGroup `internal`, viewCode `gestion.growth_ctas` (seed migration `20260718074718550`), menú Growth junto a AEO/Forms.
- Rol: operador growth interno (`efeonce_admin`/`efeonce_account`/`efeonce_operations`); NUNCA `client_*`.

## Brief

Una sola página de gobernanza del motor de CTAs: (1) estado honesto del flag del motor, (2) inventario de CTAs con su versión/estado y las acciones de lifecycle que ya expone la API admin de TASK-1339 (publicar/pausar/reanudar — capability fina `growth.cta.*`, la API re-valida), (3) surfaces registradas (sin exponer credenciales), (4) preview del renderer portable con fixtures deterministas y selector de variante visual. El cockpit completo de autoría/reportes sigue siendo task futura; esta superficie gobierna lo que existe.

## Layout Skeleton

```
┌─ Header ────────────────────────────────────────────────────────────┐
│ CTAs y popups                                   [chip flag ON/OFF]  │
│ subtitle gobernanza                                                 │
├─ Card: Inventario de CTAs ─────────────────[data-capture="cta-inventory"]┤
│ tabla: CTA (name+slug) · Estado (chip) · Ubicación · Campaña ·      │
│        Versión · Acciones [Publicar|Pausar|Reanudar] (por estado)   │
│ empty state: "Aún no hay CTAs"                                      │
├─ Card: Surfaces registradas ───────────────[data-capture="cta-surfaces"]┤
│ tabla: Surface · Tipo · Origins · Credencial (embedKeyId) · Estado  │
├─ Card: Preview del renderer ───────────────[data-capture="cta-preview"]─┤
│ chips selector variante (Default/Spotlight/Minimal/Banner/Long)     │
│ <div> monta CtaRenderer core con fixture elegida (offline)          │
└─────────────────────────────────────────────────────────────────────┘
```

- Mobile (≤390px): tablas con scroll horizontal contenido en su card (`overflow-x: auto`); preview full-width.
- Acciones de lifecycle deshabilitadas + hint cuando el flag está OFF (estado honesto, no botones muertos).

## Copy Ledger

Todo en `GH_GROWTH_CTA_OPERATOR` (`src/lib/copy/growth.ts`) — títulos, columnas, estados, confirmaciones, éxitos/errores, flag on/off. El copy de campaña del preview viene de las fixtures del renderer (espejo del contrato publicado).

## States

- Flag OFF: chip `Motor apagado en este ambiente` + hint + acciones disabled (tooltip con el hint).
- Inventario vacío / surfaces vacías: EmptyState con CTA de siguiente paso honesto.
- Acción en vuelo: botón loading; éxito → snackbar de `actions.success`; error → snackbar con el mensaje canónico del endpoint (`canonicalErrorResponse` es-CL) o el fallback local.
- Confirmación destructiva/visible: publicar y pausar confirman con diálogo (título pregunta + consecuencia + verbo específico — nunca Sí/No).

## Accessibility

- Acciones con `aria-label` específicos (`actions.*Aria`); diálogos con foco inicial en el botón seguro; tablas con headers reales; chips de estado con texto (nunca color-only).

## Implementation Mapping

- Page: `src/app/(dashboard)/growth/ctas/page.tsx` — guard `hasAuthorizedViewCode('gestion.growth_ctas')` + redirect defensivo `tenantType==='client'`; server-side `listCtasAdmin()` + `listCtaSurfacesAdmin()` + `isCtaEngineEnabled()`.
- View: `src/views/greenhouse/growth/ctas/GrowthCtasGovernanceView.tsx` (`'use client'`): MUI Cards + tabla simple + acciones → `POST /api/admin/growth/ctas/{ctaId}/lifecycle` (la API re-valida capability + flag).
- Preview: import dinámico del core del renderer (`@/growth-cta-renderer/renderer` + `styles` + `fixtures`) en `useEffect` sobre un `<div ref>` con clase `ghc-scope` (patrón del preview de forms; NO monta el custom element ni hace red).
- Nav: `VerticalMenu` sección Growth (`GH_INTERNAL_NAV.growthCtas`, `tabler-hand-click`).

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts` (ruta `/growth/ctas`).
- Viewports: 1440 · 390. Captures: `cta-governance-default` (fullPage con clipSelector por `data-capture`), preview en variantes `default` y `spotlight`.
- Assertions: `scrollWidth == clientWidth` en 1440/390 (page); tablas scrollean dentro de su card.

## Design Decision Log

- Decision: gobernanza en `/growth/ctas` (menú Growth) por instrucción directa del operador; el preview vive DENTRO de esta superficie (no en /admin/design-system) — una sola surface, cero duplicación.
- Alternatives: (A) preview en Design System como forms — descartada por el delta del operador (el DS es catálogo de plataforma, no operación del programa); (B) esperar al cockpit completo — descartada (deja el motor sin lever operable, y el freno de emergencia §16.3 necesita superficie).
- Reuse: patrones de tabla/chips/EmptyState del cockpit AEO (TASK-1276); API lifecycle de TASK-1339 sin cambios (la view es un consumer más — Full API Parity).

## Acceptance Checklist

- [ ] `/growth/ctas` visible solo para el set operador (viewCode + seed); client redirigido.
- [ ] Inventario refleja estado real (reader canónico); acciones respetan capability + flag con estado honesto.
- [ ] Preview pinta las variantes del renderer con fixtures (sin red).
- [ ] GVC 1440/390 mirado; sin scroll horizontal de página.
