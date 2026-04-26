# TASK-514.1 — Enable `react-hooks/set-state-in-effect` (React Compiler bundle, Wave 1)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (performance — atrapa cascading renders en producción)
- Effort: `Alto` (192 sitios detectados al inventariar la migración a ESLint 9)
- Type: `refactor` + `quality`
- Status real: `Backlog — TASK-514 follow-up Tier 1`
- Rank: `Post-TASK-514`
- Domain: `ui` + `platform`
- Blocked by: `none` (TASK-514 ya activó el plugin con la regla off)
- Branch: `task/TASK-514.1-react-hooks-set-state-in-effect`

## Summary

Activar la regla `react-hooks/set-state-in-effect` (parte del bundle React Compiler / React 19) que `eslint-config-next 16` ya trae instalada pero que TASK-514 dejó deliberadamente `off` para preservar el baseline 1:1.

La regla detecta llamadas síncronas a `setState` dentro de un `useEffect` body — patrón legacy que provoca cascading renders (cada `setState` re-dispara el effect) y que React 19 marca como anti-patrón explícito. La docu oficial dice: "the body of an effect should sync external state, not feed React's own state".

## Why This Task Exists

- 192 violaciones detectadas al ejecutar `pnpm lint` con la regla activa durante TASK-514. Cada una es un cascading render potencial en runtime.
- React 19 + Next 16 hacen el cost más visible (Server Components + streaming exponen los re-renders innecesarios).
- TASK-514 cerró la migración del linter; este es el primer slice de adopción del React Compiler bundle, que es la justificación técnica de habernos movido a `eslint-config-next 16`.

## Goal

1. Inventariar las 192 violaciones reales (puede haber falsos positivos en patterns legítimos de "fetch then setState" que sí queremos refactorear igual).
2. Refactorear cada uso a uno de los patterns canónicos:
   - Mover el cálculo a `useMemo` cuando el setState derivaba de props/state (no debió ser effect en primer lugar).
   - Mover el setState a un event handler cuando el effect respondía a una interacción.
   - Encapsular en una callback ref cuando el effect medía DOM.
   - Reemplazar fetch+setState por `useQuery` (TASK-513 ya dejó la foundation).
3. Activar `react-hooks/set-state-in-effect: error` en `eslint.config.mjs`.
4. Verificar 0 errors al final.

## Acceptance Criteria

- [ ] `react-hooks/set-state-in-effect` activa con severidad `error` en `eslint.config.mjs`.
- [ ] `pnpm lint` clean (0 errors / 0 warnings).
- [ ] Refactors agrupados por dominio en commits separados (finance, hr, agency, admin, my/people, components/views generales).
- [ ] Sin regresiones de comportamiento — tests pasando.
- [ ] Docs `GREENHOUSE_UI_PLATFORM_V1.md` actualizado con la regla activa y el catalog de patterns aceptados.

## Scope

### Inventario inicial

Ejecutar `pnpm lint --rule '{ "react-hooks/set-state-in-effect": "error" }' .` y agrupar por archivo + tipo de pattern.

### Refactor por dominio

Olas independientes para reducir blast radius:

1. **Wave A — Finance views** (`src/views/greenhouse/finance/**`).
2. **Wave B — HR / Payroll** (`src/views/greenhouse/hr-core/**`, `src/views/greenhouse/payroll/**`, `src/views/greenhouse/people/**`).
3. **Wave C — Agency / Admin / My** (`src/views/greenhouse/{agency,admin,my,organizations}/**`).
4. **Wave D — Components / shared primitives** (`src/components/**`, `src/hooks/**` excluyendo los useQuery wrappers de TASK-513 que ya son correctos).

### Activación final

Después de la última wave, flip de la regla en `eslint.config.mjs`:

```diff
- 'react-hooks/set-state-in-effect': 'off',
+ 'react-hooks/set-state-in-effect': 'error',
```

## Out of Scope

- Las otras reglas del bundle React Compiler (`refs`, `incompatible-library`, `preserve-manual-memoization`, `immutability`, etc.) — cada una tiene su propia task `TASK-514.2..N`.
- Migrar fetches a react-query — está como follow-up de TASK-513; aprovechar coincidencias cuando aparezcan, no forzarlas en esta task.
- React Compiler runtime activation (`experimental_reactCompiler`) — task aparte cuando el ecosistema esté estable.

## Detailed Spec

Patrones aceptables y su mapeo:

| Antipattern | Refactor canónico |
|---|---|
| `useEffect(() => { setX(deriveFrom(props)) }, [props])` | `const x = useMemo(() => deriveFrom(props), [props])` |
| `useEffect(() => { fetch().then(setX) }, [])` | `const { data: x } = useQuery({ ... })` (TASK-513) |
| `useEffect(() => { setX(initial) }, [])` | mover a `useState(() => initial)` o quitar |
| `useEffect(() => { if (!a) setA(default) }, [a])` | `const a = aProp ?? default` |
| `useEffect(() => { setLoading(true); ... }, [])` | el loading lo da `useQuery` o un `useTransition` |

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- Smoke staging por dominio refactoreado.

## Follow-ups

- TASK-514.2..N para el resto del bundle React Compiler.
- TASK-514.6 para activar `experimental_reactCompiler` cuando esté estable.
