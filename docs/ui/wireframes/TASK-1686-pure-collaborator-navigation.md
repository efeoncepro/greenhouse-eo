# TASK-1686 / Navegación de colaborador puro — Wireframe

## Product-design source

- Owner: TASK-1686; mode `repo-native-benchmark`.
- Source: shell Vuexy, TASK-1388/TASK-1675 y runtime collaborator puro.
- Desktop: 1440×900. Mobile: 390 px / iPhone 13.
- Objetivo: corregir audiencia/orientación sin chrome, color, card, primitive o layout nuevo.

## Direction comparison

| Dirección | Lectura | Riesgo | Decisión |
| --- | --- | --- | --- |
| Herencia cliente | destinos cliente + Mi Ficha | identidad errónea | rechazada |
| Avatar espejo | rail y avatar enumeran /my/* | duplicación/altura | rechazada |
| Índice + identidad | rail trabajo; avatar perfil/salida | branch explícito | seleccionada |

## Desktop layout

```text
rail: Mi Greenhouse → MI FICHA → hojas buildMyNavItems → recursos plataforma otorgados
avatar abierto: identidad → [Mi Perfil] → [Salir]
```

No muestra Pulse, Proyectos, Ciclos, Mi Equipo, Revisiones, Analytics, Campañas, Módulos ni Mi Cuenta. Avatar no enumera 13 hojas personales: es función del rail.

## Mobile layout

Drawer 390 px conserva home + Mi Ficha y gates desktop. Trigger avatar semántico; Popper contenido; Enter/Espacio abre, Escape/click-away cierran y restauran foco.

## State and accessibility inventory

| Estado | Rail | Avatar |
| --- | --- | --- |
| normal | home + Mi Ficha | identidad, Mi Perfil, salir |
| claim vacío | fallback personal, cero cliente | perfil si href, nunca cliente |
| parcial | builder omite sólo hoja no permitida | CTA se omite si falta href |
| largo/mobile | scroll/drawer equivalente | Popper compacto, sin overflow |
| teclado/reduced motion | foco/estado final equivalente | trigger/menu semánticos |

## Implementation Mapping

- VerticalMenu: predicado collaborator puro antes colección client; builder + GH_MY_NAV.
- UserDropdown: branch collaborator antes client; Mi Perfil visible; trigger MUI semántico, badge decorativo.
- Reuse: Vuexy menu/drawer y MUI control/MenuList/Popper. Sin primitive/Composition Shell.
- API/data/access: ninguno nuevo; guards sin cambio.

## GVC Scenario Plan

- Scenarios TASK-1686 con storage collaborator, no superadmin.
- Capturas: rail, avatar, focus, cmdk, drawer 390 y avatar móvil.
- Premium: axe, runtime, layout, keyboard, reduced motion y rubric.
- Asserts: ausencia cliente, scrollWidth === clientWidth, CTA perfil, Escape/click-away/focus restore.
- Baseline: task-1686-pure-collaborator-navigation después de dossier Apto.

## Design Decision Log

- Selección: índice + identidad. Rechazados: herencia cliente por información falsa y espejo avatar por duplicación.
- Riesgo fuera scope: deep-link cliente es policy TASK-1685.
