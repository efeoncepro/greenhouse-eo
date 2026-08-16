# TASK-1733 — Dirección visual · historia Hiring longitudinal en People 360

## Direction mode

`repo-native-benchmark` · ui-standard. Fuente: People 360 existente, Application 360, Activity Timeline y la
arquitectura identity-first TASK-1732.

## Alternativas comparadas

1. **Cards por aplicación:** rápida pero genera wallpaper y pierde secuencia cross-application. Rechazada.
2. **Tabla densa:** útil para inventario, débil para handoffs/activación y provenance. Rechazada como vista primaria.
3. **Timeline editorial + detail contextual:** seleccionada. La secuencia es dominante; application detail aparece
   bajo selección sin reemplazar People 360 ni abrir evidencia no autorizada.

## Tesis seleccionada

“Una persona, todas sus relaciones en el tiempo”. La UI distingue application, handoff y workforce activation por
icono/label/tipografía, no por grandes fondos semánticos. El detalle exacto conserva contexto y autorización.

## Desktop and mobile targets

- Desktop: timeline/lista dominante con filtros mínimos por tipo/fecha y Adaptive Sidecar sólo para detail útil.
- Mobile 390: lista cronológica; detail reemplaza el plano o usa Drawer canónico. El primer evento aparece dentro
  del fold y el tab HR conserva su chrome.
- Historia paginada/infinite explícita; no truncar silenciosamente a “último proceso”.

## Action hierarchy

1. Comprender la secuencia y estado de cada proceso.
2. Abrir la application exacta autorizada.
3. Revisar provenance/freshness del perfil.
4. Navegar a Hiring Desk sólo mediante deep link gobernado; cero writes locales.

## Primitive and token mapping

- Reuse Activity Timeline/list-detail/AdaptiveSidecar y state surfaces existentes.
- Theme/AXIS para color, spacing, depth y typography; status siempre con texto.
- No nace una primitive si el lookup confirma que timeline/sidecar cubren el patrón.

## Signature and anti-patterns

- Signature: una columna temporal continua cruza candidate→handoff→member sin corte visual de identidad.
- Evitar cards por evento, semáforos, raw scores/notas, CV del application equivocado y falsa ausencia ante error.

## Acceptance signature

En el primer fold se reconoce una sola persona, la pluralidad de aplicaciones y el punto de activación laboral. La
selección de un evento conserva contexto y nunca amplía disclosure.
