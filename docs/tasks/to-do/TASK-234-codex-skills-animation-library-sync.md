# TASK-234 — Codex Skills: Animation Library Knowledge Sync

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `docs`
- Domain: `tooling / skills`
- Blocked by: `TASK-230` (completed)
- Branch: `—`

## Summary

Actualizar las skills de Codex en `.codex/skills/` para que conozcan el stack de animacion integrado por TASK-230 (`lottie-react`, `framer-motion`, `AnimatedCounter`, `EmptyState.animatedIcon`, `useReducedMotion`).

Las skills de Claude Code (`~/.claude/skills/greenhouse-dev`, `greenhouse-ux`, `greenhouse-ux-writing`) ya fueron actualizadas. Falta propagar el mismo conocimiento a las skills equivalentes de Codex.

## Why This Task Exists

Codex tiene 5 skills que orientan trabajo de UI/UX pero no conocen el stack de animacion. Si un agente Codex toma una task que involucra animaciones, va a ignorar los wrappers existentes, el hook `useReducedMotion`, y las reglas de adopcion. El riesgo es que importe `framer-motion` directo, ignore `prefers-reduced-motion`, o cree componentes duplicados.

## Scope

Actualizar estas 5 skills de Codex con conocimiento de animacion:

| Skill | Path | Que agregar |
|-------|------|-------------|
| `greenhouse-agent` | `.codex/skills/greenhouse-agent/skill.md` | Stack de animacion en tech stack, imports canonicos, regla de reduced motion |
| `greenhouse-portal-ui-implementer` | `.codex/skills/greenhouse-portal-ui-implementer/skill.md` | AnimatedCounter y EmptyState.animatedIcon como componentes disponibles, patron de uso |
| `greenhouse-ui-orchestrator` | `.codex/skills/greenhouse-ui-orchestrator/skill.md` | Decision framework: cuando recomendar AnimatedCounter vs KPI estatico, cuando recomendar animatedIcon |
| `greenhouse-vuexy-ui-expert` | `.codex/skills/greenhouse-vuexy-ui-expert/skill.md` | Component catalog ampliado, reglas de accesibilidad para animacion |
| `greenhouse-ux-content-accessibility` | `.codex/skills/greenhouse-ux-content-accessibility/skill.md` | Copy guidelines para empty states animados, AnimatedCounter null fallback, reduced motion copy |

### Conocimiento a propagar

Usar como fuente canonica:

1. **Arquitectura**: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` seccion `## Animation Architecture (TASK-230)`
2. **Skill de referencia DEV**: `~/.claude/skills/greenhouse-dev/skill.md` seccion `## Animation Patterns`
3. **Skill de referencia UX**: `~/.claude/skills/greenhouse-ux/skill.md` — cambios en Component Catalog, Motion and animation, Decision Framework
4. **Skill de referencia UX Writing**: `~/.claude/skills/greenhouse-ux-writing/skill.md` — subsecciones "Animated empty states" y "AnimatedCounter in KPI cards"

### Reglas clave que cada skill debe conocer

- **Imports**: `import Lottie from '@/libs/Lottie'`, `import { ... } from '@/libs/FramerMotion'` — nunca directo
- **Reduced motion**: `import useReducedMotion from '@/hooks/useReducedMotion'` — obligatorio para toda animacion
- **AnimatedCounter**: `format='currency'|'percentage'|'integer'`, `value`, `duration`, `currency='CLP'`
- **EmptyState**: `animatedIcon` prop (Lottie JSON path), `icon` como fallback, backward-compatible
- **Assets**: `public/animations/` directorio, < 50KB, kebab-case
- **Anti-patterns**: no GSAP, no Three.js para micro-interacciones, no animar error states, "Sin datos" siempre estatico

## Acceptance Criteria

- [ ] Las 5 skills de `.codex/skills/` actualizadas con conocimiento de animacion
- [ ] Cada skill referencia los wrappers correctos, no importaciones directas
- [ ] Cada skill menciona `useReducedMotion` como obligatorio
- [ ] El contenido es coherente con lo documentado en `GREENHOUSE_UI_PLATFORM_V1.md`

## Verification

- Lectura cruzada entre las 5 skills y el doc de arquitectura
- No requiere build, lint ni tests (solo docs)
