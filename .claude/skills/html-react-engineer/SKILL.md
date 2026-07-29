---
name: html-react-engineer-greenhouse-overlay
type: overlay
overrides: html-react-engineer
description: >-
  Overlay Greenhouse de `html-react-engineer`. Pinea el orden de búsqueda de primitives (Greenhouse →
  Custom* Vuexy → MUI base) antes de escribir markup, la obligación de copy tokenizado, el contrato
  Full API Parity para cualquier acción de negocio, y el estado real de adopción de React 19 en el
  repo. Triggers: los de la skill base, dentro de greenhouse-eo.
---

# html-react-engineer — overlay Greenhouse EO

> ⚠️ **Este archivo es SOLO el overlay.** No contiene las referencias: pinea lo local y nada más.

## Router (rutas reales en este repo)

| Necesito | Archivo |
|---|---|
| Qué elemento uso: landmarks, headings, listas, tablas, ARIA-vs-nativo, forms | `.codex/skills/html-react-engineer/references/semantic-html.md` |
| `<dialog>`, `popover`, invoker commands, `<details>`, select personalizable | `.codex/skills/html-react-engineer/references/platform-elements.md` |
| Hooks, forms API, estado, keys, refs, React Compiler | `.codex/skills/html-react-engineer/references/react19-components.md` |
| Frescura + adopción real de React 19 por repo | `.codex/skills/html-react-engineer/SOURCES.md` |
| Regla cero, hard rules y fronteras | `.codex/skills/html-react-engineer/SKILL.md` |

(Mismo contenido en `~/.claude/skills/html-react-engineer/`, núcleo no versionado.)

## Precedencia

1. `CLAUDE.md` — **Full API Parity**, copy tokenizado, AXIS, closure gates. Siempre gana.
2. `greenhouse-ai-design-studio` — orquestador de UI nueva; esta skill es un **lane**.
3. `greenhouse-product-ui-architect` — Primitive+Variants+Kinds, Composition Shell, Adaptive Card.
4. `frontend-architect` — topología de render (RSC, boundaries, streaming).
5. Esta skill — markup y composición del componente.

## Antes de escribir markup: busca la primitive

Orden obligatorio, **siempre**:

```
Greenhouse primitive (src/components/greenhouse/primitives)
  → wrapper Vuexy Custom*
    → MUI base
      → recién ahí, markup propio
```

Nacer una primitive nueva tiene protocolo completo (Primitive+Variants+Kinds) y es de
`greenhouse-product-ui-architect`. Escribir un `<div>` con utilidades porque "es más rápido" salta
accesibilidad, estados, RTL y theme de una sola vez.

Casos con dueño explícito que **no** se improvisan:

- **Tabla con >8 columnas o con inputs en el body** → `<DataTableShell>` (invariante de UI Platform).
- **Input de fecha** → `GreenhouseDatePicker` (nunca `type="date"` nativo).
- **Avatar de usuario** → `resolveAvatarUrl()` resuelto en server/reader y pasado como prop
  (es `server-only`: no se importa desde un componente cliente).
- **Botón que invoca a Nexa** → `GreenhouseShinyBorder` + `GreenhouseNexaBrandMark`, nunca un
  `<Button>` MUI plano con ícono genérico.
- **Marca de terceros** → `BrandIsotypes`, nunca SVG transcrito a mano.

## Copy: ningún literal suelto

**Todo string visible pasa por `greenhouse-ux-writing`** y sale de `src/lib/copy/**` o
`src/config/greenhouse-nomenclature.ts`. Incluye `aria-label`, `placeholder`, `helperText`, estados,
loading y empty states. El lint `greenhouse/no-untokenized-copy` lo vigila.

## Full API Parity — el límite duro del componente

**Ninguna acción de negocio vive dentro de un componente.** Si puede afectar estado, permisos, datos,
aprobaciones, exports o configuración, va a un command/reader canónico en `src/lib/**` con su contrato
programático gobernado. El componente es un **cliente** de ese contrato.

Corolario para React 19: un Server Action que muta directo **viola** este contrato aunque funcione.
Si vas a introducir Server Actions, pasa por `frontend-architect` y por el contrato del dominio.

## Estado real de React 19 acá (verificado 2026-07-27)

`react@19.2.3`, Next 16.1.1, App Router. **931 archivos con `'use client'`; 282 de 286 `page.tsx` son
server. Pero: 0 Server Actions, 0 `useActionState`, 0 `useOptimistic`, 0 `use()`, 3 `Suspense`.**

Toda la mutación va por API routes + fetch cliente. **Ese es el idiom del repo.** Las APIs nuevas de
React 19 son greenfield: adoptarlas es una decisión de arquitectura con su propia task, no algo que se
introduce de pasada en una feature.

Nota: no hay React Compiler en este repo (sí en Globe). Acá `useMemo`/`useCallback` siguen teniendo
efecto real — pero sigue necesitando una razón para ponerlos.

## Cierre

Además del checklist del núcleo: `pnpm local:check:ui`, `design:lint`, y GVC cuando la superficie es
visual. El gate de score enterprise es del orquestador.

## Version

- **v1.0** — 2026-07-27
