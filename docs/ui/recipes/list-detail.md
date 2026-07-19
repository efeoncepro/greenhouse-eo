# Recipe: List-detail

## Intent

Explorar entidades y leer o editar una a la vez con navegación estable y alta densidad informativa.

## Composition

- Shell: `masterDetail`.
- Navigator: `InventoryList` con grupos opcionales y `SelectionRow variant='compact'`.
- Detail: `DetailHero kind='entity'`, secciones progresivas y command bar contextual solo cuando hay acciones.
- Primer fold: orientación + contador + ítem activo + resumen significativo.
- Mobile: el detalle se abre con affordance explícito y retorno de foco al row origen.

## States and motion

- Skeleton conserva geometría de filas y hero.
- La transición de selección es interrumpible; reduced-motion elimina desplazamiento, no feedback.
- Dirty state permanece visible antes de cambiar de selección.

## Anti-patterns

- Tabla completa embebida dentro de cada detalle.
- Navegación y acciones mezcladas en una misma fila.
- Duplicar título/status en tres cards consecutivas.
