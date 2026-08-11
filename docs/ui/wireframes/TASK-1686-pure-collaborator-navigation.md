# TASK-1686 / Navegación de colaborador puro — Wireframe

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1686-pure-collaborator-navigation.md`
- Visual direction mode: `repo-native-benchmark`
- Owner: TASK-1686; source runtime: shell Vuexy, TASK-1388/TASK-1675 y collaborator puro.
- Target evidence: desktop 1440×900; mobile 390×844 / iPhone 13.
- Objective: correct audience/orientation without new chrome, color system, card, primitive, or layout.

## Direction comparison

| Dirección | Lectura | Riesgo | Decisión |
| --- | --- | --- | --- |
| Herencia cliente | destinos cliente + Mi Ficha | identidad errónea | rechazada |
| Avatar espejo | rail y avatar enumeran /my/* | duplicación/altura | rechazada |
| Índice + identidad | rail trabajo; avatar perfil/salida | branch explícito | seleccionada |

## Desktop Target — 1440×900

```text
rail: Mi Greenhouse → MI FICHA → hojas buildMyNavItems → recursos plataforma otorgados
avatar abierto: identidad → [Mi Perfil] → [Salir]
```

El primer pliegue mantiene el rail como índice de trabajo: `Mi Greenhouse` da retorno a `/my`, y la sección `Mi Ficha` presenta solamente las hojas que devuelve `buildMyNavItems(access)`. La columna principal no cambia; el avatar queda en el header como utilidad de identidad. No muestra Pulse, Proyectos, Ciclos, Mi Equipo, Revisiones, Analytics, Campañas, Módulos ni Mi Cuenta. Avatar no enumera 13 hojas personales: es función del rail.

## Mobile Target — 390×844

El drawer a 390 px conserva el mismo orden: inicio `/my`, `Mi Ficha` y sus gates. Su contenido puede desplazarse en el eje vertical, pero el documento, drawer y Popper no desbordan horizontalmente. El trigger avatar semántico conserva su nombre accesible; Enter/Espacio abren, Escape/click-away cierran y restauran foco al trigger.

## Action Hierarchy

1. Rail: navegar al trabajo personal autorizado; es la acción primaria y contiene las hojas largas.
2. Avatar: confirmar identidad y llegar a `Mi Perfil`; es una acción utilitaria secundaria, no un segundo menú de trabajo.
3. Salir: acción terminal separada visualmente de `Mi Perfil` y de la identidad.

No existe CTA cliente equivalente ni un estado que convierta el avatar en acceso a Proyectos, Ciclos o Configuración.

## Visual Fidelity Mapping

- Jerarquía de navegación: estructura y densidad existentes de `GenerateVerticalMenu`; no se introduce una card ni una superficie flotante nueva.
- Identidad: Avatar, Popper, Paper, MenuList y MenuItem MUI existentes; el badge pasa a ser decorativo y el control mantiene focus ring canónico.
- Espaciado y tipografía: tokens del shell Vuexy/MUI ya aplicados por las primitives; no hay valores literales ni nuevos tokens.
- Movimiento: Fade y drawer existentes conservan su timing; reduced motion llega al mismo estado final sin una animación añadida.

## Copy Ledger

| id / source | region | visible text | purpose |
| --- | --- | --- | --- |
| `GH_MY_NAV.dashboard` | rail | Mi Greenhouse | return to `/my` |
| `GH_MY_NAV.profile` | avatar | Mi Perfil | open personal profile when permitted |
| `GH_MESSAGES.logout_button` (`src/lib/copy/client-portal`) | avatar | Salir del Greenhouse | id real del sign-out vigente |
| `GH_MY_NAV.fichaSection` (key NUEVA en nomenclatura + espejo en-US) | rail | Mi Ficha | tokeniza el literal `label: 'Mi Ficha'` de la rama no-interna (Slice 2) |
| `GH_INTERNAL_NAV.knowledge` / `adminDesignCatalog` / `adminDesignHandoff` | rail | Knowledge / Catálogo AXIS / Design handoff | recursos plataforma ya tokenizados; el rail collaborator los reusa tal cual |
| `GH_MY_NAV` dynamic leaves | rail | labels from builder | personal work navigation |

No new hardcoded client copy is introduced.

## State Copy

| state | visible copy | recovery / behavior |
| --- | --- | --- |
| ready | `Mi Greenhouse`, `Mi Ficha`, `Mi Perfil`, `Salir` | rail and avatar expose only authorized personal destinations |
| loading | existing avatar fallback, without client shortcuts | wait for the already-serialized session; do not fetch or substitute client links |
| empty | `Mi Greenhouse` remains visible when no personal leaf is eligible | user can return to `/my`; no empty client section is rendered |
| partial | eligible `Mi Ficha` labels only | contractor/document leaves remain omitted until their existing gates permit them |
| error | existing shell/session error surface | preserve current recovery path; this task adds no error copy or retry command |
| denied | no forbidden leaf or profile CTA | omit the destination without a broken href; existing page guards remain authoritative |

## Accessibility Contract

- Avatar is one semantic control with accessible name, `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`; its badge is not independently interactive.
- Enter/Space opens; Escape and click-away close; focus returns to the control after close.
- MenuList keeps semantic menu items, visible focus, and a maximum vertical viewport without horizontal overflow at 390 px.
- Rail keeps TASK-1388 focus, scroll-label and drawer behavior; reduced motion has the same final visual state.

## Implementation Mapping

- VerticalMenu: named pure-collaborator predicate precedes the client collection; reuse builder + GH_MY_NAV.
- UserDropdown: collaborator branch precedes client branch; renders gated `Mi Perfil` and sign-out; MUI semantic trigger with decorative badge.
- Reuse: Vuexy menu/drawer and MUI control/MenuList/Popper. No primitive or Composition Shell.
- API/data/access: no new API, data reader, view code, grant or guard; page guards remain the authorization boundary.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task-1686-pure-collaborator-navigation.scenario.ts` (primario, dual-viewport) + `scripts/frontend/scenarios/task-1686-pure-collaborator-mobile-drawer.scenario.ts` (drawer 390px).

- Quality profile: `premium`.
- Identity and route: `agent-collaborator@greenhouse.efeonce.org` storage state, `/my`; no superadmin substitution.
- Viewports: desktop 1440×900 and mobile 390×844.
- Captures: rail, open avatar, focus trigger, CmdK, open drawer and mobile avatar.
- Assertions: no client destinations; `scrollWidth === clientWidth` for document/drawer/Popper; profile CTA; Escape/click-away and focus restoration; axe, console/page/hydration errors and reduced motion.
- Review dossier: `pnpm fe:capture:review <capture-dir>` must be Apto before baseline acceptance.
- Baseline decision: create `task-1686-pure-collaborator-navigation` only after the collaborator review dossier is Apto.

## Design Decision Log

- Selected: index + identity. Rejected: client inheritance for false information scent, and avatar mirror for duplication and height.
- Reuse decision: existing rail, builder, MUI Popper/menu and copy source; no platform primitive.
- Out-of-scope risk: client deep links are authorization policy in TASK-1685, not a visual projection change.
