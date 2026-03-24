# TASK-010 - Login Dark Mode Polish

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`

## Summary

Ajustar elementos hardcoded del login redesign para que se comporten correctamente en dark mode. El panel izquierdo no requiere cambios (ya es oscuro). El panel derecho tiene dos elementos que no se adaptan.

## Why This Task Exists

El login redesign (commit `204a979`) usa valores hardcoded en dos puntos que no responden al dark mode de MUI/Vuexy:

1. **Botón Microsoft** — `bgcolor: '#022a4e'` (navy) se pierde contra el fondo oscuro de dark mode, necesita borde visible o fondo alternativo
2. **Logo mobile** — usa `greenhouse-full.svg` (colores originales sobre fondo claro); en dark mode necesita alternar a `negative-sin-claim.svg` (versión blanca)

## Goal

- Botón Microsoft visible y con contraste adecuado en dark mode
- Logo mobile alterna a versión negativa en dark mode
- Mantener apariencia actual en light mode sin regresión

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `src/config/greenhouse-nomenclature.ts` — colores de marca

Reglas obligatorias:

- No tocar archivos en `src/@core/`
- Usar tokens de MUI (`theme.palette.*`, `useColorScheme`) para detección de modo
- No agregar dependencias nuevas

## Dependencies & Impact

### Depends on

- Login redesign completado (commit `204a979` en develop)

### Impacts to

- Ninguna otra task — cambio visual aislado al login

### Files owned

- `src/views/Login.tsx` (solo los elementos hardcoded)

## Current Repo State

### Ya existe

- Login redesign con dos paneles funcionando en light mode
- Panel derecho usa tokens de MUI que ya se adaptan (`background.paper`, `text.primary`, `divider`)
- `useColorScheme` disponible en el stack

### Gap actual

- Botón Microsoft hardcoded navy sin borde en dark mode
- Logo mobile no alterna a versión negativa

## Scope

### Slice 1 - Botón Microsoft dark mode

- Agregar `border: '1px solid rgba(255,255,255,0.12)'` al botón Microsoft cuando dark mode activo, o cambiar bgcolor a un tono que contraste

### Slice 2 - Logo mobile dark mode

- Detectar modo con `useColorScheme`
- Alternar `greenhouse-full.svg` ↔ `negative-sin-claim.svg` según modo

## Out of Scope

- Cambios al panel izquierdo (ya es oscuro)
- Cambios a la lógica de auth
- Rediseño de los campos de formulario (ya usan `CustomTextField` que se adapta)

## Acceptance Criteria

- [ ] Botón Microsoft tiene contraste visible en dark mode
- [ ] Logo mobile muestra versión negativa en dark mode
- [ ] Light mode no tiene regresión visual
- [ ] WCAG AA contrast ratios mantenidos en ambos modos

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- Toggle dark mode en preview y verificar visualmente ambos paneles
