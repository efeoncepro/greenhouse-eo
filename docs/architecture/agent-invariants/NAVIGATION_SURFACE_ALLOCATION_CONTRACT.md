# Contrato de Asignación de Superficies de Navegación (TASK-1389)

> **Tipo:** invariantes operativos para agentes (load-on-demand)
> **Dueñas del estado actual:** TASK-1388 (reequilibrio interno) · TASK-1686 (colaborador puro) · TASK-1389 (este contrato + gate)
> **Gate mecánico:** `pnpm nav:budget` (`scripts/ci/nav-budget-gate.mjs` sobre el evaluador `src/lib/navigation/nav-budget.ts`) + test `src/components/layout/vertical/VerticalMenu.budget.test.tsx` en la suite.

## Por qué existe

El sidebar llegó a ~96 hojas en 12 grupos **por ausencia de freno**, no por una mala decisión: cada
task colgaba su pantalla del rail sin declarar superficie ni chocar contra un tope. TASK-1388 arregló
el estado; este contrato + su gate evitan la reincidencia (mismo aprendizaje que el budget de
`CLAUDE.md` y los lints `no-untokenized-*`: la regla escrita se ignora, el número que rompe el build
no).

## La regla: cada tipo de destino tiene UNA superficie

| Tipo de destino | Superficie | Ejemplos |
|---|---|---|
| **Operativo** (dominios de trabajo) | **Sidebar** — dentro de una zona (`Operación` · `Administración` · `Recursos`) | Finanzas, Personas, Admin Center |
| **Personal** (`/my/*`) | **Menú del avatar** (internos) / rail propio del colaborador puro | Mi Nómina, Mis Permisos |
| **Cola larga** (salto por nombre) | **⌘K** (`GlobalCommandPalette`, deriva de `VIEW_REGISTRY` + audiencia) | cualquier vista autorizada |
| **Frecuente/adaptativo** (atajos) | **`ShortcutsDropdown`** (resolver canónico `src/lib/shortcuts/resolver.ts`, TASK-553) | pins per-user |

**Reglas duras:**

- **NUNCA** duplicar un destino en dos superficies (caso fuente: Sample Sprints en Agencia Y Comercial; atajos admin en avatar Y sidebar — ambos eliminados en TASK-1388).
- **NUNCA** colgar una ruta personal `/my/*` del sidebar interno (viven en el avatar vía `buildMyNavItems`; el colaborador puro es la excepción diseñada — su rail ES su contenido, TASK-1686).
- **NUNCA** agregar un ítem al primer nivel del rail fuera de una zona `isSection` (la única excepción es el Home pineado). Un destino operativo nuevo entra DENTRO de un dominio existente o abre la conversación de si merece dominio propio — con presupuesto.
- **NUNCA** el ⌘K ni el avatar se vuelven surface de shortcuts (los atajos salen del resolver TASK-553; la palette deriva del registry — fronteras distintas).
- **SIEMPRE** que una task agregue un destino de navegación visible, declara `Nav placement` en su `## UI/UX Contract` (campo del `TASK_UI_UX_ADDENDUM.md`).

## El presupuesto del sidebar interno

Constantes en `src/lib/navigation/nav-budget.ts` (editable SOLO con justificación en el PR + update de este doc):

| Constante | Valor | Qué mide |
|---|---|---|
| `MAX_TOP_LEVEL_SLOTS` | **8** | Slots de primer nivel interactivo del rail del superadmin (Home pineado + hijos directos de las zonas). Es la medición EXACTA post-TASK-1388 — cero aire, deliberado: agregar un slot exige quitar otro o justificar el aumento acá. |
| `MAX_INTERACTIVE_DEPTH` | **2** | Niveles colapsables anidados (dominio → sección). Las hojas viven a profundidad ≤ 3; las zonas `isSection` son headings, no cuentan. |

Reglas estructurales adicionales del evaluador (sin constante, binarias):

- **Zonas solo en la raíz** — un `isSection` anidado dentro de un submenú es violación.
- **Raíz solo para Home** — cualquier entrada de primer nivel fuera de una zona que no sea el Home pineado es violación (es exactamente cómo se infló el rail viejo).
- **Cero `/my/*` en el rail interno** — el set personal se deriva del builder `my-nav-items.ts`, no de una lista hardcodeada.

## El gate

- `pnpm nav:budget` — corre el test de presupuesto contra el **árbol real** (el harness de
  `VerticalMenu.budget.test.tsx` renderiza `VerticalMenu` con la sesión superadmin y evalúa el
  `menuData` grabado — cero drift de parser frente al código imperativo del árbol).
- **Severidad**: nació directo en su severidad final (`error`) porque la condición de promoción de la
  spec — TASK-1388 verde y el sidebar bajo el tope — ya estaba cumplida y MEDIDA al implementarlo
  (precedente TASK-1680: medir primero, promover con 0 violaciones). El test corre en `pnpm test`
  (suite/CI) y el workflow `design-contract.yml` ejecuta el gate en PRs que tocan navegación.
- Cross-check del manifest: una ruta `/my/*` declarada con `surface: 'sidebar'` en
  `route-reachability-manifest.ts` es violación.

## Límite técnico declarado

El gate cubre el **rail interno** (árbol determinista por sesión). El menú del portal cliente es
module-driven (TASK-1675: su forma depende de `module_assignments` per-org) — un tope para ese carril
se calibra en su propio follow-up y su insumo sería el resolver, no este evaluador.

## Relación con el manifest de alcanzabilidad (TASK-982)

Son complementarios: el manifest responde "¿cómo se LLEGA a esta ruta?" (href/child/via); este
contrato responde "¿en qué SUPERFICIE vive?". El campo opcional `surface` del manifest une ambos para
las rutas que no son ítems literales del rail.
