# TASK-1121 — Retirar el preload huérfano de Public Sans (deuda de fuente Vuexy)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `cleanup`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|design-system|typography`
- Blocked by: `none`
- Branch: `task/TASK-1121-retire-public-sans-preload`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`src/@core/theme/index.ts` (capa Vuexy del starter-kit) instancia `Public_Sans` desde `next/font/google` con 7 pesos (300–900). Greenhouse **ya no usa** Public Sans — el runtime carga **Geist (texto) + Poppins (display)** (SoT de tipografía, TASK-1036/1038, vía `src/app/layout.tsx` + `mergedTheme`). Como `@core` sigue declarando Public Sans, `next/font` emite un `<link rel="preload">` para su CSS que **el browser nunca consume** → warning de Next dev (y prod) *"resource was preloaded using link preload but not used"* en **todas** las rutas del portal.

## Why This Task Exists

Detectado al diagnosticar la ruta `/design-system/composition-shell` (TASK-1117/1119): el warning de font-preload es **global y pre-existente**, NO específico de esa surface. Es deuda del starter-kit Vuexy: la migración tipográfica a Geist/Poppins se hizo por **override** (`mergedTheme`, como manda la regla "NUNCA editar `src/@core/theme/*`") y dejó la declaración de Public Sans viva en `@core`, preloadeando una fuente muerta. Cheap de limpiar, baja prioridad, pero ensucia la consola de toda la app + desperdicia una request de fuente.

## Goal

- Eliminar el `<link rel="preload">` huérfano de Public Sans → consola limpia en todo el portal + sin descarga de fuente sin uso.
- Cero regresión tipográfica (Geist/Poppins siguen siendo el SoT; nada visual cambia).

## Architecture Alignment

- Tipografía SoT: `src/components/theme/typography-tokens.ts` + `mergedTheme.ts` + drift-guard `typography-drift.test.ts` (TASK-1036/1038/1042).
- **Regla dura CLAUDE.md:** *"NUNCA editar `src/@core/theme/*` (override en mergedTheme)"*. Esta task es la excepción legítima — el objetivo ES retirar una declaración muerta de `@core` — pero exige cuidado: verificar que **ningún** consumidor lee `public_sans.style.fontFamily` y que el override Greenhouse provee la familia base en todas las superficies (web + el specimen de typography).
- Skills: `typography-design` (overlay Greenhouse) + `design-system-governance` + `modern-ui`.

## Dependencies & Impact

### Depends on
- Confirmación de que `mergedTheme` + `layout.tsx` cubren la familia base en el 100% de superficies (web).

### Blocks / Impacts
- Ninguna feature. Solo limpia consola + carga.

### Files owned
- `src/@core/theme/index.ts` (retirar el import + la instancia de `Public_Sans`; pasar la familia base correcta a `typography(...)` — Geist/Poppins según el SoT, NO Public Sans).
- Posibles consumidores de `public_sans.style.fontFamily` (grep antes de tocar).

## Current Repo State

### Already exists
- `src/@core/theme/index.ts:2,19,40` — `import { Public_Sans } … ` + `const public_sans = Public_Sans({...})` + `typography(public_sans.style.fontFamily)`.
- `src/app/layout.tsx` carga Geist + Poppins (el SoT real).
- `mergedTheme.ts` deriva las variantes tipográficas del SoT (Geist/Poppins), override-eando lo que `@core` setea.

### Gap
- `@core` preloadea Public Sans (muerta) → warning global + request inútil.

## Scope

### Slice 1 — Auditar el consumo real de `public_sans`
- Grep `public_sans` / `Public_Sans` / `style.fontFamily` en `@core` + verificar qué familia base termina en runtime (sonda real: `getComputedStyle` del `<body>` y de un `<Typography>` → debe ser Geist/Poppins, no Public Sans). Confirmar que retirar Public Sans NO deja a `typography()` sin familia fallback.

### Slice 2 — Retirar Public Sans de `@core/theme/index.ts`
- Reemplazar la familia base que `@core` pasa a `typography(...)` por la canónica del SoT (o por un fallback neutro que el `mergedTheme` igual override-ea), sin reintroducir otra Google font preloadeada. Verificar que el drift-guard de tipografía sigue verde.

### Slice 3 — Verificación
- `pnpm fe:capture` de ≥1 ruta (p.ej. `/design-system/composition-shell` + un dashboard real) → 0 warnings de font preload en `quality.runtime` (console). Diff visual GVC = sin cambios (nada tipográfico cambia). `pnpm build` + `typography-drift.test` verde.

## Out of Scope

- Cualquier cambio de la escala/SoT tipográfico (TASK-1036/1038 son la verdad — esto solo retira una fuente muerta).
- Otras fuentes legacy de Vuexy que no produzcan el warning.

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Romper la familia base si algún consumer leía `public_sans` | UI | low | grep + sonda runtime antes de tocar; drift-guard tipográfico | `typography-drift.test` + GVC |
| Reintroducir otro preload muerto | UI | low | no agregar Google font nueva; usar la familia del SoT | GVC console |

Operationally safe — additive cleanup, sin flags/migraciones/runtime externo.

## Verification

- 0 warnings de font-preload en la consola (GVC `quality.runtime`) en ≥2 rutas.
- `pnpm build` + `typography-drift.test` + `design:lint` verde.
- GVC diff visual = sin cambio tipográfico.
- `greenhouse-documentation-governor` al cierre (delta menor en typography docs si aplica).

## Procedencia

Detectado en TASK-1117/1119 (Composition Shell) durante la diagnosis de issues de Next dev tools — el font-preload warning resultó global/pre-existente, no de esa surface. Deuda del starter-kit Vuexy post-migración tipográfica Geist/Poppins (TASK-1036/1038).
