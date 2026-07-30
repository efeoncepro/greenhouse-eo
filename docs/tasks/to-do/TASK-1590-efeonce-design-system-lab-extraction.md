# TASK-1590 — AXIS Design System Lab Extraction

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1590-efeonce-design-system-lab.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1590-efeonce-design-system-lab-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `A MEDIAS, no pendiente (medido 2026-07-30). El Lab independiente YA EXISTE y está desplegado (apps/lab en axis-design-system → axis-design-system-lab.vercel.app), con la estructura de su dirección visual ya implementada: registry searchable + preview + panel de evidencia. Lo que falta es el CONTENIDO: 2 contratos en el Lab contra 43 rutas de /design-system en Greenhouse. Y dos desalineaciones con su propia spec: el Lab es PUBLICO (200 sin auth) cuando la task pide internal-only, y su acceptance criterion 1 ("Lab corre fuera de Greenhouse") ya se cumple. CONTRADICCION ABIERTA con TASK-1382, que quiere Labs como build unit DENTRO de Greenhouse: son dos destinos incompatibles para la misma superficie y ninguna declara a la otra`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `none` (foundation publicada; extracción del Lab sigue pendiente)
- Branch: `task/TASK-1590-efeonce-design-system-lab-extraction`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Separar el Pattern Lab del runtime Greenhouse y desplegarlo como proyecto Vercel
internal-only. `/design-system` seguirá siendo catálogo/control plane durante la migración.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/app/(dashboard)/design-system` en Greenhouse
- Future candidate home: `ui-package`
- Boundary: Lab consume packages y fixtures; no lógica de dominio ni secretos
- Server/browser split: browser-safe fixtures; Vercel estático/React en primera wave
- Build impact: proyecto Vercel separado y build reproducible
- Extraction blocker: rutas internas y handoff Figma siguen viviendo en Greenhouse

## UI/UX Contract

- Primitive decision: `reuse` del lenguaje y fixtures existentes; `extend` sólo cuando el Lab necesite un shell propio.
- Responsive: 1440 px y 390 px.
- Accessibility: keyboard, focus, reduced motion, contrast y labels.
- Evidence: captures del Lab y diff contra primitives Greenhouse seleccionadas.

## Acceptance Criteria

- [ ] Lab corre fuera de Greenhouse.
- [ ] Tiene catálogo searchable con owner, SoT, lifecycle y consumers.
- [ ] Tiene fixtures desktop/mobile/keyboard/reduced-motion.
- [ ] Preview Vercel definida sin mover producción ni retirar `/design-system`.

## Delta 2026-07-30 — el estado real, el rol que le da el ADR y una contradicción abierta

Medido contra el runtime, no leído de la spec.

### Sus cuatro acceptance criteria, contrastados

| Criterio | Estado real |
|---|---|
| "Lab corre fuera de Greenhouse" | ✅ **cumplido**. `apps/lab` vive en `axis-design-system` y está desplegado en `axis-design-system-lab.vercel.app` |
| "Catálogo searchable con owner, SoT, lifecycle y consumers" | 🟡 **el buscador existe** (`registry-list` + filtro por `id`/`owner`/`lifecycle`), pero sobre **2 contratos** |
| "Fixtures desktop/mobile/keyboard/reduced-motion" | 🔴 el Lab tiene `evidence-panel` y `check`, pero los fixtures reales viven en los canaries de los consumidores, no en el Lab |
| "Preview Vercel sin mover producción ni retirar `/design-system`" | 🟡 el proyecto existe y `/design-system` sigue intacto (43 rutas), **pero el Lab es público**: responde `200` sin autenticación, y esta task pide `internal-only` |

### El hallazgo: existe el contenedor, no el contenido

**2 contratos en el Lab contra 43 rutas de `/design-system` en Greenhouse.** La extracción no está
*pendiente* — está *a medias, y del lado incómodo*: la infraestructura nació y el catálogo no se mudó.

Eso hace que la task se lea peor de lo que está en su criterio 1 y mucho mejor de lo que está en el resto.
Su `Current home` (`src/app/(dashboard)/design-system`) sigue siendo cierto, pero su premisa —"el Lab
independiente está pendiente"— ya no.

### Rol nuevo que le asigna el ADR de ownership (aceptado 2026-07-29)

[`EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1`](../../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md)
le da al Lab una función que esta spec no contemplaba: si AXIS pasa a ser dueño del valor y del contrato,
**el Lab es la superficie donde se documenta el USO** — anatomy, estados, cuándo usar cuál, do/don't.

Hoy esa documentación **no existe en ninguna parte**: el gobierno vive en Greenhouse (decisiones, runbook,
tasks) y el catálogo de uso no está escrito. Eso refuerza el destino de esta task frente al de `TASK-1382`.

**Regla que no hay que romper al hacerlo:** el Lab **deriva del registry, nunca re-documenta**. Si alguien
escribe a mano "`efeonce.status` tiene 5 estados", eso drifta el día que el contrato cambie y nadie se
entera. Tiene que leerlo de `findPattern`, como ya hace con `id`, `version`, `owner` y `lifecycle`. Es el
mismo principio que el ADR aplica al valor: SSOT + derivación + gate, nunca copia.

### 🔴 Contradicción abierta con `TASK-1382`

`TASK-1382` (*Design System Labs build-unit pilot*, `to-do`) declara:

> *"Materializar la primera unidad de build independiente **de Greenhouse**: Design System Labs (…)
> demostrar que cambios Labs no construyen Portal"*

Son **dos destinos incompatibles para la misma superficie**:

- **Esta task**: el Lab vive en **AXIS**, otro repo, Vercel aparte.
- **`TASK-1382`**: Labs es un **build unit dentro de Greenhouse** (EPIC-026).

No pueden ser las dos, y **ninguna declara a la otra** en sus dependencias. `TASK-1382` es la que decide:
si Labs se queda como build unit de Greenhouse, esta task pierde su destino; si el catálogo se muda a AXIS,
`TASK-1382` pierde su sujeto. **Resolver antes de tomar cualquiera de las dos.**

### Decisión de acceso, pendiente y a propósito

El Lab está **público por omisión, no por decisión**. Un design system público no es un problema en sí
—Material, Carbon y Polaris lo son— pero esta task pide `internal-only` y la realidad dice otra cosa.
Antes de mudarle el catálogo de 43 rutas hay que decidir el nivel de acceso a propósito.

### Sobre los docs UI de esta task

`docs/ui/wireframes/TASK-1590-*.md` (6 líneas) y `docs/ui/motion/TASK-1590-*.md` (4 líneas) **son cortos
pero fieles**: describen registry-izquierda / preview-centro / evidencia-derecha con targets 1440 y 390, y
el Lab implementa exactamente eso (`registry-list`, `preview-panel`, `evidence-panel`). No son relleno para
el gate — son una declaración de dirección que ya se materializó.

Lo que **no** son es suficientes como contrato de implementación para mudar 43 rutas: falta el inventario de
superficies, el mapping a las rutas actuales de `/design-system`, los estados y el copy. `UI ready: no` es
correcto y debe seguir así hasta que eso exista.

## Rollout / Rollback

- Preview primero; dominio interno después de revisión humana.
- `/design-system` queda como fallback y catálogo Greenhouse.
