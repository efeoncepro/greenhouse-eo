# TASK-1531 — Creative Prompt Studio Visual Direction

## Decision

Seleccionar **Direction B — Editorial Workbench**: el prompt bar sigue siendo el punto de partida, pero al invocar
al Creative Prompt Engineer se expande en un workbench inline de fuente→interpretación→propuesta. La experiencia
debe sentirse como trabajar con un director creativo experto, no como recibir texto mágico de una caja negra.

## Alternatives

### Direction A — Invisible polish

Una propuesta compacta reemplazable bajo el textarea. Es rápida y económica, pero oculta intención, decisiones y
advertencias; no expresa la nueva capacidad profesional. Rechazada por baja confianza y poco valor percibido.

### Direction B — Editorial Workbench — selected

Fuente y propuesta mantienen continuidad visual; una rail breve explica interpretación, target y decisiones. El
usuario puede comparar, inspeccionar advertencias y aceptar sin abandonar el composer. Equilibra riqueza, control
y economía de superficie.

### Direction C — Conversational copilot

Chat lateral multi-turn con historial. Es flexible, pero introduce navegación, memoria, mayor latencia y un modelo
mental distinto para una acción que hoy es atómica. Rechazada; requiere evidencia y task separada.

## Desktop target

En `1440×1000`, el prompt field conserva prioridad. Al analizar, una banda editorial se despliega bajo él con:
estado/target, lectura de intención, propuesta principal, “qué cambió” y acciones. La comparación usa dos regiones
ligeras dentro de una sola superficie, no cards anidadas. Los detalles secundarios son disclosure progresivo.

## Mobile target

En `390×844`, la secuencia es vertical: estado→intención→propuesta→cambios→acciones sticky dentro de la banda.
Original y propuesta nunca aparecen en columnas estrechas. El contenido largo hace wrap y el composer no excede
el viewport.

## Token mapping

- Color: roles existentes Globe para surface, accent, info, warning y success; sin HEX local.
- Depth: una sola elevación contextual del workbench; divisores y tintes para regiones internas.
- Type: jerarquía Globe existente; propuesta en body cómodo, metadata en label.
- Spacing/radius: tokens del Producer Console; ningún multiplicador arbitrario.
- Motion: state transition causal y breve mediante contrato TASK-1531; nunca progreso ficticio.

## Signature details

- “Creative read”: frase corta que refleja la intención entendida antes de la propuesta.
- Target lens: chip client-safe con modalidad/modelo público/operación.
- Preservation rail: restricciones preservadas, inferencias y warnings con provenance visible.
- Change map: categorías modificadas, no diff carácter por carácter como señal principal.

## Anti-patterns

- Chat falso, card wall, modal de texto, spinner sin estado, shimmer eterno.
- Prometer “resultado garantizado” o mostrar un score de calidad no calibrado.
- Exponer system prompt, chain-of-thought, provider slug o detalles operator-only.
- Reemplazar automáticamente el original, ocultar warnings o depender sólo del color.
- Comprimir desktop en mobile o usar tabs que escondan la acción primaria.
