# TASK-1686 — Visual Direction: personal cockpit navigation

## Decision

El collaborator puro no es cliente reducido ni usuario interno incompleto. Su cockpit usa rail estable para trabajo y avatar mínimo para identidad.

## Desktop target

A 1440 px, el rail es el índice persistente de `/my` y el avatar es una utilidad compacta de perfil/salida. La dirección conserva el shell Vuexy y no agrega chrome ni otra jerarquía de superficie.

## Mobile target

A 390 px, el drawer replica sólo inicio y `Mi Ficha`; el avatar conserva su affordance de menú semántico. Ambas superficies toleran contenido largo verticalmente sin overflow horizontal.

## Alternatives

1. Cliente heredado: descartado, semántica errónea.
2. Duplicación total: descartado, segundo rail en avatar.
3. Personal cockpit: seleccionado, rail completo + avatar perfil/salida.

## Token mapping

- Rail: GenerateVerticalMenu/Vuexy.
- Avatar: MUI control interactivo, Popper, Paper, MenuList, MenuItem.
- Copy: GH_MY_NAV; theme existente; cero valor literal.
- Motion: Fade/drawer existentes.

## Anti-patterns

- Perfil es acción visible, no header ambiguo.
- Badge decorativo; avatar no es botón invisible.
- Sin widgets/chrome nuevo, rutas client ni lista duplicada.
