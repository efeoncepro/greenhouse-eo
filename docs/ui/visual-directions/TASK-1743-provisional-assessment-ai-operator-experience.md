# TASK-1743 — Dirección visual de evaluación provisional de IA

## Decision

Extender el workbench de TASK-1738 con una franja de resumen provisional integrada, de tono informativo y densidad operativa. La propuesta debe sentirse disponible para trabajar, pero nunca confirmada: etiqueta, score y disclaimer forman una unidad inseparable.

## Alternativas comparadas

### A. Franja operativa integrada — seleccionada

- Resumen, cobertura y excepciones comparten la superficie existente.
- Reduce saltos de contexto y preserva la diferencia entre propuesta y resultado efectivo.
- Permite escanear decenas de aplicaciones sin abrir cada respuesta.

### B. Dashboard independiente — rechazada

- Facilita comparación entre postulantes y se acerca demasiado a ranking automatizado.
- Duplica navegación, permisos y estados ya resueltos por Application 360.

### C. Reutilizar barras/radar efectivos — rechazada

- Hace que una propuesta no calibrada parezca un resultado definitivo.
- Oculta cobertura, abstenciones, fallos y procedencia.

## Desktop target

En 1440 px, el encabezado del assessment conserva identidad y estado del test. Debajo aparece una franja horizontal con score provisional a la izquierda, disclaimer inmediatamente asociado y métricas de cobertura a la derecha. Competencias y excepciones continúan en el workbench existente; el score efectivo mantiene su bloque y título propios.

## Mobile target

En 390 px, la franja se convierte en stack: identidad provisional, score con disclaimer, cobertura y acción recuperable. Competencias se leen como lista de una columna y la evidencia se expande en flujo normal. No hay tablas horizontales ni labels recortados.

## Token mapping

- Fondo y borde: tokens semánticos `surface`/`info-subtle` ya usados por Hiring.
- Texto: jerarquía tipográfica existente de Application 360; score usa el display numérico vigente sin color de éxito.
- Estado provisional: `StatusChip` informativo/neutral; efectivo conserva su variante actual.
- Espaciado, radios y elevación: escala AXIS/Vuexy existente; ninguna literal nueva.
- Riesgo y errores: warning/error semánticos existentes, siempre acompañados por texto.

## Anti-patterns

- Verde de “Óptimo” aplicado al score provisional.
- Card-on-card, dashboard paralelo, ranking, comparación entre postulantes o CTA de decisión.
- Mostrar rationale antes de la muestra ciega o convertir abstención/fallo en cero.
- Animar el score, celebrar resultados o usar radar como fuente de autoridad.
- Truncar nombres de competencias, causas o evidencia sin acceso al contenido completo.

## Mapeo al sistema

- Decisión: `extend` de `AssessmentAiRunWorkbench`; subview local solo si reduce complejidad.
- Reusar `AdaptiveCard`, `StatusChip`, progress y patrones de disclosure/foco existentes.
- Copy estable vive en `src/lib/copy/hiring.ts`; datos variables llegan desde el reader server-side.
- No crear primitive global ni nuevo destino de navegación.
