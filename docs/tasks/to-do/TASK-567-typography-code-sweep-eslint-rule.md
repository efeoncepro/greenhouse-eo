# TASK-567 — Typography Code Sweep + ESLint Governance Rule

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio-alto` (deuda técnica + governance permanente)
- Effort: `Medio` (~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `TASK-566`
- Branch: `task/TASK-567-typography-code-sweep`

## Summary

Una vez que TASK-566 landed la foundation, este task hace el sweep exhaustivo de **todo `fontFamily` y `fontWeight` hardcoded en componentes** (~10+ archivos identificados más los que aparezcan en discovery), elimina las ocurrencias de `fontFamily: 'monospace'` globales, y establece una ESLint rule custom que bloquea futuras violaciones.

## Why This Task Exists

Aunque TASK-566 corrige el theme, los componentes siguen teniendo `sx={{ fontFamily: ... }}` inline que bypass el theme. Confirmado por grep inicial:

- `src/components/greenhouse/GreenhouseFunnelCard.tsx`
- `src/components/agency/SpaceHealthTable.tsx`
- `src/components/agency/SpaceCard.tsx`
- `src/components/agency/PulseGlobalHeader.tsx`
- Otros por identificar en Discovery

TASK-021 (legacy) intentó parcialmente esto pero con premisa DM Sans+Poppins. Este task supersede TASK-021 con el sweep completo post-Geist-migration, y agrega ESLint rule para prevenir regresiones.

Sin ESLint rule, el sistema va a driftear de nuevo: alguien va a hardcodear `fontFamily: 'var(--font-poppins)'` en un chip "porque queda bonito", y el sistema recupera la inconsistencia en 3 meses.

## Goal

- Cero `fontFamily` hardcoded en componentes bajo `src/app/(dashboard)/**`, `src/views/greenhouse/**`, `src/components/**` (excepto cases justificados con comentario + `eslint-disable-next-line` explícito).
- Cero `fontFamily: 'monospace'` en todo `src/**`.
- ESLint rule custom activa que bloquea ambas.
- Componentes afectados usan variants del theme (`<Typography variant='monoId'>`, etc.) o heredan el default implícito.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3.1 (post-566 rewrite)
- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md` (task legacy que este supersede parcialmente)

Reglas obligatorias:

- Preferir variant del theme sobre `sx` override. Ej: `<Typography variant='monoId'>EO-123</Typography>` en vez de `sx={{ fontFamily: 'monospace' }}`.
- Si el caso requiere Poppins fuera de h1-h4 (ej. brand moment marketing), agregar comentario `// brand-moment: Poppins intentional` + `eslint-disable-next-line` justificando.
- ESLint rule debe ser custom (no existe una built-in para este caso).

## Normative Docs

- `docs/epics/to-do/EPIC-004-typography-unification-poppins-geist.md`
- `docs/tasks/to-do/TASK-566-typography-foundation-geist-poppins-theme.md` (debe estar complete)

## Dependencies & Impact

### Depends on

- `TASK-566` — foundation del theme debe estar landed. Sin eso este sweep rompería el producto.

### Blocks / Impacts

- Desbloquea cierre del epic (TASK-569 depende de 567 + 568 completas)
- Reclasifica `TASK-021` (supersede parcial)
- Afecta visibilidad en componentes listados + otros por discovery

### Files owned

- `src/components/greenhouse/GreenhouseFunnelCard.tsx` [verificar]
- `src/components/agency/SpaceHealthTable.tsx` [verificar]
- `src/components/agency/SpaceCard.tsx` [verificar]
- `src/components/agency/PulseGlobalHeader.tsx` [verificar]
- Otros identificados en Discovery (grep exhaustivo)
- `.eslintrc.*` o `eslint.config.*` (nueva rule)
- `eslint-rules/no-hardcoded-fontfamily.js` (nuevo archivo custom rule)
- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md` (reclasificar/mover a complete)

## Current Repo State

### Already exists

- TASK-566 foundation landed (theme, layout, token doc)
- ESLint config actual en el repo (ubicación a verificar: `.eslintrc.js` / `.eslintrc.json` / `eslint.config.js`)
- Componentes con `fontFamily` hardcoded (listados arriba + otros)

### Gap

- No existe ESLint rule que bloquee `fontFamily` hardcoded.
- No hay inventario exhaustivo de violaciones en el codebase (grep inicial identifica algunos, falta sweep completo).
- `TASK-021` sigue abierta con premisa pre-epic.

## Scope

### Slice 1 — Discovery exhaustiva + inventario

- `grep -rn "fontFamily:" src/ --include='*.tsx' --include='*.ts'` — inventario completo
- `grep -rn "fontFamily: .monospace." src/ --include='*.tsx' --include='*.ts'` — inventario monospace
- Categorizar cada ocurrencia:
  - **Justificada**: marketing brand moment, requiere opt-in con comentario
  - **Migrable a variant**: reemplazar por `<Typography variant='monoId|monoAmount|kpiValue|caption'>`
  - **Redundante**: remover (theme ya lo aplica)
- Documentar inventario en comment del PR + `Handoff.md` update

### Slice 2 — Sweep de componentes

- Remover `fontFamily` inline en cada archivo del inventario
- Reemplazar por variant del theme donde aplica (`monoId`, `monoAmount`, `kpiValue`, etc.)
- Para casos justified (marketing brand moment), agregar comentario explícito + `eslint-disable-next-line greenhouse/no-hardcoded-fontfamily` en la línea
- Test unitario touches: verificar que los componentes renderizan sin errores (tests existentes deberían pasar sin modificación)

### Slice 3 — ESLint custom rule

- Crear `eslint-rules/no-hardcoded-fontfamily.js` (plugin local)
- Rule lógica:
  - Bloquea property `fontFamily` en un object literal que sea argumento de `sx` prop
  - Bloquea string literal `'monospace'` en cualquier property `fontFamily`
  - Excepción: archivos marcados explícito con `/* eslint-disable greenhouse/no-hardcoded-fontfamily */` header
  - Excepción: línea con `// eslint-disable-next-line greenhouse/no-hardcoded-fontfamily`
- Registrar la rule en `.eslintrc.*` / `eslint.config.*` del repo con `plugins: ['greenhouse']`
- Ejecutar `pnpm lint` y confirmar 0 violaciones post-sweep

### Slice 4 — Reclasificar TASK-021

- Mover `docs/tasks/to-do/TASK-021-typography-variant-adoption.md` a `docs/tasks/complete/`
- Actualizar Lifecycle `to-do` → `complete` con nota "Superseded by EPIC-004 (TASK-566, TASK-567)"
- Actualizar `docs/tasks/README.md` — remover TASK-021 de backlog activo

## Out of Scope

- **No tocar theme** (`mergedTheme.ts`). Eso es TASK-566.
- **No tocar layout.tsx**. TASK-566.
- **No tocar email templates**. TASK-568.
- **No tocar PDF generation**. TASK-568.
- **No hacer visual regression sweep**. TASK-569.
- **No rediseñar ningún componente** — solo migrar tipografía inline a variants.

## Detailed Spec

### ESLint rule custom — lógica

Archivo: `eslint-rules/no-hardcoded-fontfamily.js`

Pseudocódigo:

```js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit hardcoded fontFamily in sx props and anywhere `monospace` is referenced as fontFamily value.',
      category: 'Stylistic Issues'
    },
    messages: {
      inSxProp: 'fontFamily hardcoded en sx prop. Usa variant del theme (monoId, monoAmount, kpiValue, h1-h4) o hereda default Geist.',
      monospace: "`fontFamily: 'monospace'` prohibido. Usa variant monoId o monoAmount que usa Geist Mono."
    }
  },
  create(context) {
    return {
      Property(node) {
        if (node.key.name !== 'fontFamily') return

        // Case 1: inside sx={{...}}
        const parent = findAncestor(node, 'JSXAttribute')
        if (parent?.name?.name === 'sx') {
          context.report({ node, messageId: 'inSxProp' })
          return
        }

        // Case 2: value is 'monospace' string literal
        if (node.value?.value === 'monospace') {
          context.report({ node, messageId: 'monospace' })
        }
      }
    }
  }
}
```

Config en `.eslintrc.*`:

```js
{
  plugins: ['greenhouse'],
  rules: {
    'greenhouse/no-hardcoded-fontfamily': 'error'
  }
}
```

### Caso edge: override justificado

Si un componente necesita Poppins en un contexto que no es h1-h4 (ej. landing hero custom):

```tsx
// eslint-disable-next-line greenhouse/no-hardcoded-fontfamily
<Box sx={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
  {/* Brand moment: hero CTA marketing landing. Revisado {fecha}. */}
  Explora Greenhouse
</Box>
```

El disable explícito deja audit trail y fuerza comentario justificativo.

### Archivos probables a tocar (inventario inicial)

Desde grep inicial:

- `src/components/greenhouse/GreenhouseFunnelCard.tsx` [verificar línea]
- `src/components/agency/SpaceHealthTable.tsx` [verificar línea]
- `src/components/agency/SpaceCard.tsx` [verificar línea]
- `src/components/agency/PulseGlobalHeader.tsx` [verificar línea]

Discovery debe expandir este inventario con grep exhaustivo.

## Acceptance Criteria

- [ ] `grep -rn "fontFamily:" src/ --include='*.tsx' --include='*.ts' | grep -v 'mergedTheme.ts'` retorna solo casos con `eslint-disable` justificado
- [ ] `grep -rn "fontFamily: 'monospace'" src/ --include='*.tsx' --include='*.ts'` retorna 0 matches
- [ ] `pnpm lint` ejecuta la ESLint rule `greenhouse/no-hardcoded-fontfamily` y retorna 0 errors
- [ ] Rule funciona: test case (intencional `fontFamily: 'monospace'` en un archivo) hace fail a `pnpm lint`
- [ ] `TASK-021-typography-variant-adoption.md` movido a `docs/tasks/complete/` con nota "Superseded by EPIC-004"
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `pnpm test` pasa (tests existentes no rotos)
- [ ] `pnpm build` pasa
- [ ] Smoke test staging: componentes afectados (GreenhouseFunnelCard, SpaceHealthTable, SpaceCard, PulseGlobalHeader) renderizan correctamente post-sweep

## Verification

- `pnpm lint` (con nueva rule activa)
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual grep verification pre/post sweep
- Staging deploy Vercel READY
- Visual check en Pulse, Agency, Finance surfaces donde viven los componentes afectados

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] Archivo en `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con inventario encontrado + resolución
- [ ] `changelog.md` actualizado (ESLint rule nueva + code cleanup)
- [ ] Chequeo cruzado: TASK-021 cerrada, TASK-569 notificada (desbloqueada si TASK-568 también cerrada)

- [ ] EPIC-004 `Child Tasks` actualizado
- [ ] ESLint rule documentada en `AGENTS.md` o doc equivalente para contributors

## Follow-ups

- Si Discovery encuentra un número grande (>30) de componentes con `fontFamily` hardcoded, considerar spawning de un task adicional o agregar Slice 5 iterativo.
- Considerar ESLint rule adicional en TASK-569 que verifique consistencia de pesos (fontWeight) contra la escala canónica.

## Open Questions

- ¿La ESLint rule debería también bloquear `fontWeight` hardcoded, o solo `fontFamily`? **Default assumed**: solo `fontFamily` en este task. `fontWeight` queda como Follow-up.
- ¿Aplicamos la rule sobre `src/@core/**` también? **Default assumed**: NO — core theme files por convención no se tocan, y contienen refs a fontFamily legítimas del base theme.
- ¿Nombre del plugin ESLint: `greenhouse` o `greenhouse-eo`? **Default assumed**: `greenhouse` — más corto, más usable.
