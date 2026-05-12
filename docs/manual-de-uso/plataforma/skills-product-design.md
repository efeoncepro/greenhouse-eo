# Usar las skills de Product Design

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-11
> **Modulo:** Plataforma
> **Ruta en portal:** Transversal (agentes Claude / Codex que trabajan sobre el repo)
> **Documentacion relacionada:** convenciones de skills en `CLAUDE.md`; design system en `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` + `DESIGN.md`

## Para que sirve

Esta guia explica el sistema de skills de diseno de producto que se incorporo el 2026-05-11. Las skills son **expertos especializados** que un agente (Claude, Codex, Cursor) invoca cuando trabaja sobre el repo. Cada skill carga un cuerpo de reglas, decisiones canonicas, patrones modernos 2026 y antipatrones para responder con criterio senior en su dominio.

Antes solo habia 3 skills product-design (`modern-ui`, `microinteractions-auditor`, `greenhouse-ui-review`). Ahora hay **17** que cubren accesibilidad, motion, performance, formularios, estados, dataviz, IA de navegacion, arquitectura frontend y gobernanza del design system, con override Greenhouse para cada una.

## Que cambio

### Skills nuevas (16 archivos)

8 nuevas skills globales en `~/.claude/skills/` (fuera del repo, las consume cualquier proyecto):

| Skill global | Cubre |
|---|---|
| `a11y-architect` | WCAG 2.2 AA, EAA, ADA 2027, APG patterns, screen readers, forced-colors, reduced motion |
| `motion-design` | Tokens duracion/easing, View Transitions, Motion/GSAP/Rive, FLIP, choreografia |
| `web-perf-design` | Core Web Vitals 2026 (INP), image/font stack, bundle budgets, INP debugging |
| `forms-ux` | Layout, validacion 3-stage, React 19 `useActionState`, autofill, masked inputs |
| `state-design` | 12 estados canonicos, optimistic UI, honest degradation, streaming SSR |
| `dataviz-design` | Question→chart tree, color encoding colorblind-safe, libraries 2026 |
| `info-architecture` | Sitemap, URL design, Next.js App Router topology, wayfinding |
| `frontend-architect` | RSC vs Client, Server Actions, Cache Components (Next.js 16), state hierarchy |

9 overrides Greenhouse en `.claude/skills/` (vivos en el repo, deltas especificos):

- `a11y-architect-greenhouse-overlay` — locale-aware aria, focus return en Drawer, 44x44 targets
- `motion-design-greenhouse-overlay` — duraciones tokenizadas, MUI transitions primero, cubic-bezier(0.2,0,0,1)
- `web-perf-design-greenhouse-overlay` — budgets per-route, ECharts lazy, Vercel RUM
- `forms-ux-greenhouse-overlay` — CustomTextField, RUT/CLP helpers, Server Actions
- `state-design-greenhouse-overlay` — `SourceResult<T>`, primitives `EmptyState`/`ErrorState`
- `dataviz-design-greenhouse-overlay` — customColors palette, ECharts canonico, KPI tabular-nums
- `info-architecture-greenhouse-overlay` — modulos canonicos, Vuexy sidebar, nomenclatura
- `frontend-architect-greenhouse-overlay` — Next.js 16 + MUI 7 + Vuexy + Cloud SQL + Server Actions
- `design-system-governance` — 3-layer parity DESIGN.md / V1 / mergedTheme (Greenhouse-only)

### Skills existentes preservadas

`modern-ui`, `microinteractions-auditor`, `greenhouse-ui-review`, `greenhouse-ux`, `greenhouse-ux-writing`, `greenhouse-microinteractions-auditor`, `greenhouse-dev` siguen vigentes. Las nuevas se componen con ellas.

## Antes de empezar

- Las skills se **invocan automaticamente** cuando un agente reconoce un trigger (palabra clave o contexto). No requieren comando explicito.
- Si trabajas dentro de `greenhouse-eo`, el overlay Greenhouse se carga **siempre** despues del global y gana en conflicto.
- Cada skill declara con que otras se compone. No tenes que orquestar — el agente lo hace.

## Paso a paso — pedir trabajo asistido

### Caso 1 — Disenar un componente nuevo

Decile al agente que vas a construir algo. El agente debe invocar la combinacion correcta. Ejemplos:

| Lo que pedis | Skills que carga el agente |
|---|---|
| "Diseñame un nuevo drawer de filtros para Finance" | `greenhouse-ux` + `modern-ui-greenhouse-overlay` + `a11y-architect-greenhouse-overlay` + `motion-design-greenhouse-overlay` + `forms-ux-greenhouse-overlay` |
| "Creame un dashboard con KPIs y un grafico" | `greenhouse-ux` + `dataviz-design-greenhouse-overlay` + `state-design-greenhouse-overlay` + `web-perf-design-greenhouse-overlay` |
| "Necesito un wizard de 4 pasos para onboarding" | `forms-ux-greenhouse-overlay` + `state-design-greenhouse-overlay` + `a11y-architect-greenhouse-overlay` + `frontend-architect-greenhouse-overlay` |
| "Donde deberia ir esta funcionalidad en el menu" | `info-architecture-greenhouse-overlay` |
| "Cual es el chart correcto para mostrar la varianza vs target" | `dataviz-design-greenhouse-overlay` |

### Caso 2 — Auditar algo que ya existe

Pedile al agente que audite. Las skills tienen un **lane de audit** con checklists.

| Auditoria | Skill |
|---|---|
| "Es accesible este formulario?" | `a11y-architect-greenhouse-overlay` (audit lane + WCAG 2.2 AA floor 13 filas) |
| "Por que es lenta esta pagina?" | `web-perf-design-greenhouse-overlay` (LCP/INP/CLS debug) |
| "Esta animacion se siente mal" | `motion-design-greenhouse-overlay` (5 sintomas) + `microinteractions-auditor` |
| "Me falta algun estado?" | `state-design-greenhouse-overlay` (12-state matrix) |
| "Esta tabla rinde mal con 500 filas" | `web-perf-design-greenhouse-overlay` + `frontend-architect-greenhouse-overlay` |
| "Esta UI se ve 2018, queda fea" | `modern-ui-greenhouse-overlay` (Lane C "is this modern" review) |

### Caso 3 — Antes de commitear UI

Invoca explicitamente el gate:

```
Antes de commitear, audita esto con greenhouse-ui-review
```

El agente corre el checklist de 13 secciones (tipografia, spacing, borderRadius, iconos, color, primitives, layout, interaction cost, motion, a11y, estados, antipatterns). Si falla algo BLOCKER, fix antes de commit.

### Caso 4 — Decidir donde vive un valor

Si vas a agregar un color, tamano de fuente, duracion o cualquier token:

```
Quiero agregar un nuevo color brand para Globe. Donde lo pongo?
```

El agente invoca `design-system-governance` y te lleva por el protocolo de 6 pasos (V1 spec → mergedTheme → DESIGN.md → lint).

## Que significan las relaciones entre skills

Las skills tienen 3 modos de interaccion:

| Modo | Que significa |
|---|---|
| **Compose** | Se cargan juntas. Ej: `forms-ux` siempre compone con `a11y-architect` porque labels y errores tienen contrato a11y. |
| **Defer to** | Una skill delega a otra. Ej: `motion-design` delega el contrato `prefers-reduced-motion` a `a11y-architect`. |
| **Override** | El overlay Greenhouse sobreescribe defaults del global. Ej: global pide OKLCH, Greenhouse pina sRGB + MUI palette. |

No tenes que orquestarlo a mano. Cada skill declara su grafo de relaciones al inicio del cuerpo.

## Que no hacer

- No invocar manualmente a una skill global cuando el overlay Greenhouse existe (perdes los pins repo-especificos). El agente lo hace automatico — solo deja que pase.
- No mezclar guidance de dos overlays distintos del mismo dominio. Si `forms-ux-greenhouse-overlay` dice `CustomTextField`, no propongas raw `<TextField>` "porque el global lo permite".
- No agregar un token visual nuevo sin pasar por `design-system-governance`. La triple parity DESIGN.md / V1 / mergedTheme lo detecta al lint.
- No saltearse el gate `greenhouse-ui-review` antes del commit cuando tocaste JSX/sx. Es lo que filtra antipatterns conocidos (monospace para numeros, Popover+Select, borderRadius off-scale, etc.).

## Problemas comunes

| Problema | Solucion |
|---|---|
| El agente no invoca la skill que esperaba | Mencioná la palabra trigger explicita. Ej: "audita accesibilidad" en vez de "revisa esto" |
| La skill global y la Greenhouse dicen cosas distintas | El overlay Greenhouse gana. Si la divergencia parece bug, mover la decision al overlay y dejar el global mas neutral |
| Quiero agregar otra skill | Crear `~/.claude/skills/<nombre>/SKILL.md` (global) o `.claude/skills/<nombre>/SKILL.md` (Greenhouse override). Estructura canonica: frontmatter (name + description + user-invocable + argument-hint) + cuerpo con triggers, compose, reglas duras, output format |
| Una skill tiene info desactualizada | Editar el archivo directo. Cuando el delta es repo-especifico va al overlay; cuando es transversal va al global |

## Referencias tecnicas

- **Canonica del sistema de skills**: convencion `.claude/skills/<name>/SKILL.md` (Claude) y `.codex/skills/<name>/SKILL.md` (Codex) — documentado en `CLAUDE.md` seccion "Convenciones de skills locales".
- **Plan completo de la suite**: commit `b018c17c` introduce los 9 archivos repo + 8 globales correspondientes. Ver mensaje del commit para el resumen tecnico.
- **Skills de referencia que siguieron el patron**: `arch-architect` (global + overlay) — el modelo de robustez que las nuevas replican (decision frameworks + hard rules + compose with).
- **Design system runtime**: `DESIGN.md` (contrato compacto), `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (spec extendida), `src/components/theme/mergedTheme.ts` (runtime authority).

## Quien mantiene esto

Cualquier agente trabajando en el repo puede actualizar una skill (global o overlay) cuando emerge una decision nueva canonizable. La regla: **canonizar desde TASKs reales**, no inventar desde aire. Cuando una TASK cierra un patron reusable, el overlay correspondiente se actualiza en el mismo PR.
