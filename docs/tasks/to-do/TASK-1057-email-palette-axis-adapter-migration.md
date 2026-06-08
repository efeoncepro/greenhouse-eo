# TASK-1057 — Email palette → AXIS semantic adapter (inline-hex por medio)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño — diferido explícitamente por TASK-1053/1054 (color overhaul "Restraint v1"). La paleta de emails quedó fuera del scope aprobado porque los emails no tienen cascada CSS (requieren hex inline) y deben resolverse vía adapter por medio, no por theme runtime.`
- Rank: `TBD`
- Domain: `ui | design-system | communications`
- Blocked by: `none` (depende del SoT AXIS + sub-valores ya shipped en TASK-1053/1048)

## Why This Task Exists

`src/emails/constants.ts` (`EMAIL_COLORS`) es el SoT de color de los emails transaccionales y mantiene **hex crudos** desacoplados de la capa AXIS:

```
background #F2F4F7 · containerBg #FFFFFF · headerBg #022a4e (Midnight Navy) ·
headerAccent/primary #0375db (Core Blue) · primaryHover #025bb0 · text #1A1A2E ·
secondary #344054 · muted #667085 · border #E4E7EC · success #12B76A · footerBg #F9FAFB
```

El `success #12B76A` **diverge** del success AXIS (`#157F47` ink / `#28c76f` ramp) — drift de feedback color en un medio externo. El resto son brand-navy/neutrales que mayormente coinciden con `customColors`/`GH_COLORS` pero hardcodeados.

Los emails **no pueden** consumir `theme.palette.*` (no hay runtime React/CSS-vars en el cliente de correo; Gmail/Outlook exigen hex inline). Por eso el contrato canónico es el principio **"un SSOT semántico + adapter por medio"** (mismo precedente que typography PDF/email y que `axisSemanticHex`): los roles salen del SoT AXIS y un **adapter de email** los baja a hex literales en build/render time, sin re-hardcodear.

## Scope

1. **Adapter de email** que derive `EMAIL_COLORS` desde la capa runtime-agnóstica de design tokens (`src/lib/design-tokens/*` — ya existe `semantic-sub-values.ts` de TASK-1048; agregar lo que falte: brand navy + neutrales). Los emails importan del adapter, NUNCA hex sueltos.
2. **Reconciliar `success`**: `#12B76A` → `axisSemanticSubValues.success.ink` (`#157F47`) o el valor de marca que el operador apruebe para correo (verificar contraste sobre `containerBg #FFFFFF` y `footerBg`).
3. **Mapear brand/neutrales** a los tokens existentes (`GH_COLORS.brand.*` / neutrales AXIS) en vez de literales.
4. **Verificación visual**: preview de los 6 templates (`/api/emails/preview/*` o equivalente) antes/después — los emails son artefacto consumido por humanos externos → loop GVC/preview real (no solo tsc/lint).

## Out of Scope

- Cambiar la estructura/layout de los templates (solo color).
- Tipografía de email (`EMAIL_FONTS`) — su propio follow-up del adapter de tipografía PDF/email.
- Migrar a CSS vars en email (imposible por el medio).

## Acceptance Criteria

- [ ] `EMAIL_COLORS` deriva de `src/lib/design-tokens/*` vía adapter; cero hex de feedback crudo que diverja del SoT AXIS.
- [ ] `success` de email reconciliado con AXIS (o valor de marca aprobado, con contraste verificado sobre fondos de email).
- [ ] Brand/neutrales mapeados a tokens existentes (no literales nuevos).
- [ ] Preview real de los 6 templates revisado (before/after).
- [ ] Gates: `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm design:lint` (los emails están exentos de `no-hardcoded-hex-color` hoy; si el adapter elimina los literales, evaluar levantar la excepción para `src/emails/**`).

## Dependencies & Impact

- **Depende de:** SoT AXIS + `src/lib/design-tokens/semantic-sub-values.ts` (TASK-1048) ya shipped.
- **Impacta a:** `src/emails/**` (render de correos transaccionales). Bajo blast radius (paleta centralizada en 1 constante).
- **Archivos owned:** `src/emails/constants.ts` + adapter nuevo en `src/lib/design-tokens/` (o `src/emails/`).

## Origen

Diferido por TASK-1053 (color overhaul "Restraint v1") y TASK-1054 (chart SoT migration). Registrado en el cierre de ambas (2026-06-08).
