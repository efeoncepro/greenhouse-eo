# TASK-1686 — Visual Direction: personal cockpit navigation

## Thesis

El collaborator puro no es cliente reducido ni usuario interno incompleto. Su cockpit usa rail estable para trabajo y avatar mínimo para identidad.

## Alternatives

1. Cliente heredado: descartado, semántica errónea.
2. Duplicación total: descartado, segundo rail en avatar.
3. Personal cockpit: seleccionado, rail completo + avatar perfil/salida.

## Token and primitive mapping

- Rail: GenerateVerticalMenu/Vuexy.
- Avatar: MUI control interactivo, Popper, Paper, MenuList, MenuItem.
- Copy: GH_MY_NAV; theme existente; cero valor literal.
- Motion: Fade/drawer existentes.

## Signature details and anti-patterns

- Perfil es acción visible, no header ambiguo.
- Badge decorativo; avatar no es botón invisible.
- Sin widgets/chrome nuevo, rutas client ni lista duplicada.
