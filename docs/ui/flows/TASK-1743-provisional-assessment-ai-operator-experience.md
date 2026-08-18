# TASK-1743 — Flujo de evaluación provisional de IA

## Entry

El operador autorizado abre Application 360 y selecciona Evaluación. La ruta y la pestaña existentes no cambian.

## Main flow

1. El workbench carga la proyección provisional browser-safe.
2. Muestra score, cobertura y separación del resultado efectivo.
3. El operador puede expandir evidencia o ir a una excepción concreta.
4. Si el backend habilita una acción gobernada, se reutilizan los commands de confirmación, cancelación o reintento existentes.
5. Al cerrar el detalle, el foco vuelve al elemento que lo abrió.

## Alternate and failure flows

- Sin run: se explica la causa y solo aparece reintento cuando el command está habilitado.
- Parcial: se muestra el denominador real y acceso directo a abstenciones/fallos.
- Denegado: no se renderizan score, rationale, confidence ni evidencia.
- Stale: la propuesta anterior queda identificada y no sustituye el resultado efectivo.

## Exit and invariants

- No hay transición a ranking, decisión, stage move, asignación de test o comunicación.
- No se crea una ruta nueva ni se cambia la navegación de Application 360.
- El postulante nunca entra a este flujo ni recibe sus datos en payload o DOM.

## GVC Scenario Plan

- Capturar entrada, ready, partial, error/retry y denied en 1440×1100 y 390×844.
- Verificar restauración de foco al cerrar evidencia y ausencia de transiciones de ruta.
- Confirmar `scrollWidth === clientWidth`, copy provisional visible y payload candidate-facing sin resultados.

## Design Decision Log

- Decisión: extender el flujo existente de Application 360 sin ruta ni paso nuevo.
- Rechazado: dashboard de comparación, flujo separado de revisión y apertura automática de evidencia.
- Razón: el operador necesita contexto inmediato y la arquitectura debe impedir ranking o autoridad implícita.
