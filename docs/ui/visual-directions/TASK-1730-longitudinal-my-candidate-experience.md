# TASK-1730 — Dirección visual · `/my` longitudinal candidato

## Direction mode

`repo-native-benchmark` · ui-standard. Fuente: `/my` runtime existente, Composition Shell, Hiring Application 360
y la arquitectura longitudinal aceptada. No existe un mockup externo que copiar.

## Alternativas comparadas

### A. Dashboard de cards

Una card por postulación y otra por cada bloque de perfil. Escaneable al inicio, pero escala mal, convierte mobile en
una columna interminable y oculta la próxima acción entre contenedores equivalentes. Rechazada por card soup.

### B. Wizard de candidatura

Una secuencia lineal de completar perfil→CV→preguntas. Buena para una postulación, incorrecta para varias
postulaciones simultáneas y para una identidad que luego suma funciones laborales. Rechazada por modelar un proceso
único donde existe un workspace longitudinal.

### C. Workbench personal con journey y acciones — seleccionada

Una cabecera personal estable, un lead compacto de “lo que necesita tu atención”, una región primaria con
postulaciones/journey y contexto secundario de perfil/progreso informativo. Las rutas hermanas mantienen el mismo
chrome. La completitud ayuda a la persona, nunca se presenta como score de selección.

## Tesis seleccionada

“Una sola historia, la próxima acción siempre visible”. La primera lectura responde: quién soy, qué necesita acción,
dónde están mis procesos y qué información controlo. La identidad visual proviene de una línea temporal editorial y
un plano de trabajo dominante, no de KPIs ni gamificación.

## Desktop target

- `WorkbenchHeader` con título `Mi espacio`, supporting tabs y meta sólo factual.
- Composition `leadPlusContext`: lead horizontal de acción; primary timeline/lista; aside de perfil/documentos.
- Máximo dos superficies contained simultáneas en el primer fold.
- Primary action sólo cuando existe una acción requerida; si no, el journey domina.

## Mobile target · 390 px

- Header y tabs desplazables sin cortar el activo.
- Orden: acción pendiente → aplicaciones → perfil/documentos → privacidad.
- El aside se integra como secciones abiertas, no como cards apiladas idénticas.
- Acciones destructivas permanecen secundarias y confirmadas; cero scroll horizontal.

## Action hierarchy

1. Completar la acción pendiente más próxima.
2. Abrir una postulación y revisar estado/evidencia enviada.
3. Actualizar perfil/CV.
4. Gestionar privacidad, Talent Pool o retirar una aplicación.

## Fidelity and token mapping

- Tipografía: variants canónicas Geist/Poppins; estado y fechas en jerarquía secundaria.
- Color: canvas/surface/semantic desde theme AXIS; status usa label+icono, nunca sólo color.
- Spacing/radius/elevation: theme; cero literales.
- Timeline/upload/forms: primitives Greenhouse/MUI existentes antes de extender.
- Motion: causal y localizada; esta task no requiere contract motion dedicado.

## Signature details

- Journey longitudinal como columna vertebral visible.
- “Necesitamos algo de ti” funciona como banda de acción y no como alerta alarmista.
- Perfil muestra freshness/provenance útil, no porcentaje competitivo.
- La aparición de capacidades workforce se siente como expansión del mismo espacio, no cambio de producto.

## Anti-patterns

- Semáforo, ranking, match score, posición frente a otros candidatos.
- Cinco cards KPI de estado/completitud.
- Raw stage interno o copy que promete fechas no controladas.
- Datos legales/payroll visibles antes de entitlement.
- Mobile como desktop serializado.

## Acceptance signature

El primer fold muestra una próxima acción o el journey, al menos una postulación y una señal clara de que el perfil
es reutilizable. A 390 px el usuario llega a la primera postulación sin atravesar una pantalla completa de chrome.
