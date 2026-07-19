# Recipe: Settings/flow

## Intent

Configurar una capacidad o completar un proceso secuencial con confianza, reversibilidad y progreso claro.

## Composition

- Shell: `focused`.
- Header: `WorkbenchHeader kind='settings'` con estado de guardado.
- Cuerpo desktop: composición asimétrica decisión/impacto; lista en `OperationalSection variant='open'` e impacto en un único plano `emphasized`. Mobile reordena decisión → impacto → comando.
- Dock: `ContextCommandBar kind='settings'` con guardar como única acción primaria.
- Primer fold: alcance del cambio, progreso, impacto y primer campo/decisión.
- Mobile: acciones persistentes sin tapar contenido; pasos y errores visibles antes del submit.

## States and motion

- Guardado optimistic solo si es reversible; confirma resultado y timestamp.
- La aparición de dependencias usa reveal breve, conserva foco y respeta reduced-motion.
- Error se asocia al campo y resume el bloqueo en el command bar.

## Anti-patterns

- Formulario largo sin secciones ni impacto.
- Save repetido en cada card.
- Switches sin explicación de alcance.
- Una card exterior de formulario que contiene cards por opción y otra card de impacto.
