# TASK-1688 — Wireframe: datos completos de contacto en Careers

## Purpose

Extensión source-led de la superficie Careers entregada por `TASK-354`: evita que un formulario público acepte datos que el ATS no guarda. No introduce una ruta, shell, modal, navegación ni dirección visual nueva.

## Meta

- Product Design asset: `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- Visual direction mode: `source-led`

## Visual Direction Contract

- Source: `docs/ui/wireframes/TASK-354-public-careers-landing.md`, runtime actual de `CareersApplyClient`, `CareersNativeGrowthFormClient` y `Application360View`.
- Visual direction mode: `source-led`.
- Fidelity mapping: conservar jerarquía, tokens, densidad, controles y microinteracciones existentes; sólo insertar campos y bloque de lectura necesarios.
- Targets: Careers estándar y native Growth Form, desktop 1440 y mobile 390; Application 360 interno desktop 1440 y mobile 390.
- Action hierarchy: enviar postulación sigue siendo la acción principal; declarar país es un requisito claro pero no un paso adicional; el reclutador lee contacto sin abrir otra superficie.
- Quality profile: `premium`.

## Product Design Asset

- Asset: `docs/ui/wireframes/TASK-354-public-careers-landing.md` es el source durable para la composición pública; `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` fija el nodo de apply ya existente.
- Uso: extender la sección de datos personales y el bloque de detalle de Application 360 sin modificar el sistema visual, las rutas ni la jerarquía de acciones.

## Desktop Target

- Careers: el select de país ocupa una línea completa inmediatamente después de correo; teléfono conserva prefijo y número en su composición actual; el textarea de mensaje conserva el ancho y ritmo vertical del formulario.
- Application 360: “Contacto” y “Contexto de esta postulación” se incorporan al summary existente; no se añade una columna, card ni sidecar que compita con la evaluación/pipeline.
- El contenido largo del mensaje sigue el patrón interno existente y no rompe el ancho de la página.

## Mobile Target

- A 390 px todos los campos se apilan, sin reducir labels ni ocultar la aclaración de residencia.
- Prefijo y teléfono respetan el patrón responsive actual; si se apilan, el orden es prefijo → número y no se pierde foco ni contexto.
- En Application 360, cada dato de contacto usa filas verticales legibles; no hay scroll horizontal ni truncamiento silencioso del mensaje.

## Action Hierarchy

1. Candidato: completar datos requeridos y usar “Enviar postulación”, la única acción primaria existente.
2. Candidato: corregir el primer error declarado antes de reenviar; teléfono y mensaje permanecen opcionales.
3. Reclutador autorizado: leer contacto y mensaje como contexto, sin acciones de escritura, exportación o contacto automático nuevas.

## Visual Fidelity Mapping

| Decisión de `TASK-354` | Extensión de `TASK-1688` |
|---|---|
| Formulario de una columna, labels sobre controles y error inline | País ocupa una fila completa con el mismo label/error; no se crea picker visual alterno. |
| Aclaración y consentimiento en copy reusable | Se añade una línea de ayuda textual para separar residencia de prefijo. |
| Application 360 como vista interna canónica | Los valores se ubican en grupos de detalle existentes, sin card nueva ni cambios de shell. |
| Tokens y espaciado del sistema actual | Sin nuevos colores, iconos, banderas, tamaños o motion. |

## Public apply — field order

```text
Datos personales
  Nombre y apellido
  Correo electrónico
  País de residencia *                    [select textual, accesible]
    “Indica dónde resides. No se deduce del prefijo telefónico.”
  Teléfono (opcional)                     [prefijo para formato] [número]

Perfil
  Portafolio / LinkedIn / disponibilidad / CV existentes
  Mensaje (opcional)                      [textarea, máximo 4.000]
  Consentimiento existente
  [Enviar postulación]
```

El país ocupa una fila completa y aparece antes de teléfono. El select muestra el nombre del país, no sólo una bandera, y se puede recorrer con teclado. El prefijo del teléfono sigue explicando formato; no preselecciona ni cambia el país de residencia.

## Public states

| Estado | Tratamiento |
|---|---|
| Default | País sin selección; teléfono y mensaje opcionales; labels sobre inputs. |
| País vacío al submit/blur | Error inline accesible: “Selecciona tu país de residencia para continuar.” Foco al campo si es el primer error. |
| País no disponible | Estado de recuperación honesto; no enviar con un valor supuesto. |
| Teléfono inválido | Error de formato sin borrar lo ingresado. |
| Error de servidor | Conserva todos los valores; muestra el error público genérico existente sin repetir PII. |
| Éxito/dedupe | Confirmación pública genérica existente; nunca enumera ni expone la postulación. |

## Copy Ledger

| Key / surface | es-CL | en-US | Regla |
|---|---|---|---|
| Label país | `País de residencia` | `Country of residence` | Campo requerido, texto visible. |
| Ayuda país | `Indica dónde resides. No se deduce del prefijo telefónico.` | `Tell us where you live. This is not inferred from your phone prefix.` | Evita inferencia engañosa. |
| Label teléfono | `Teléfono (opcional)` | `Phone (optional)` | El prefijo sólo comunica formato. |
| Label mensaje | `Mensaje (opcional)` | `Message (optional)` | Contexto application-scoped. |
| Histórico interno | `No informado` | `Not provided` | No sustituir por valores inferidos. |

Las keys reales viven con el namespace Careers bajo `src/lib/copy/dictionaries/{es-CL,en-US}/`; no se dejan literales en JSX.

## State Copy

| Estado | Copy visible | Recovery behavior |
|---|---|---|
| Ready | `País de residencia` + ayuda de residencia; CTA existente `Enviar postulación`. | El candidato puede completar/editar los tres campos; teléfono y mensaje siguen opcionales. |
| Loading | `Cargando opciones de país…` cuando el catálogo no esté disponible aún. | Mantener el resto del formulario estable; no aceptar un país implícito. |
| Empty | `No informado` en Application 360 cuando el registro histórico es nulo. | No solicitar ni inferir dato; mantener contexto histórico honesto. |
| Partial | `Algunas opciones no están disponibles. Inténtalo nuevamente.` | Reintentar catálogo antes del submit; conservar la entrada ya completada. |
| Error | `Selecciona tu país de residencia para continuar.` / error de teléfono existente. | Anunciar inline, enfocar el primer error y preservar campos. |
| Denied | Sin copy de datos: la vista mantiene el estado de acceso denegado existente de Application 360. | No serializar los campos en el DTO de quien no tiene autorización. |

## Accessibility Contract

- El nombre y la instrucción del país están disponibles como label/descripción programática; los errores usan el mismo patrón `aria-invalid`, `aria-describedby` y anuncio existente.
- No se comunica el país mediante bandera, color ni valor del prefijo; cada opción tiene nombre textual localizable.
- El select es usable con teclado; el foco llega al primer error y no se pierde tras un error server-side.
- Los datos internos se presentan en texto seleccionable/legible para tecnologías de asistencia sólo después de pasar la autorización del reader.
- Se verifica contraste, zoom/reflow y `scrollWidth === clientWidth` en 1440 y 390 px.

## Application 360 — lectura interna

```text
Resumen de postulación
  Contacto
    Correo                 persona@…
    Teléfono               +56 … / No informado
    País de residencia     Chile / No informado

  Contexto de esta postulación
    Mensaje del candidato  [texto completo; tratamiento existente para contenido largo]
```

El bloque sólo aparece dentro de Application 360 para el reader interno ya autorizado. No se replica en tarjetas de pipeline, payloads de cliente, shares, exportaciones ni vistas públicas. Las filas históricas usan “No informado”; nunca se sustituyen con una inferencia.

## Accessibility and privacy

- Label visible, instrucción textual y error programático para país; no usar bandera, color o prefijo como único significado.
- Teclado: tab ordenado, select navegable y foco al primer error.
- El mensaje conserva límite de 4.000 caracteres y no debe incluirse en telemetry, alerts ni screenshots versionados.
- El teléfono se presenta como PII interna; cualquier política de máscara/revelado sigue el patrón/permiso de Hiring existente y se valida durante la implementación.
- No se agregan animaciones. El comportamiento existente conserva `prefers-reduced-motion`.

## Implementation Mapping

| Surface | Reuse | Cambio |
|---|---|---|
| Careers estándar | `CareersApplyClient` + controles/copy existentes | país requerido, teléfono persistible y mensaje incluido en el payload canónico |
| Native Growth Form | `CareersNativeGrowthFormClient` + contrato Growth Forms | mismos campos, nombres y validación semántica que Careers estándar |
| Server | parser + `submitPublicHiringApplication` | normaliza/valida/persiste una vez; no hay write en React |
| Application 360 | reader/store y bloque de detalle existente | lectura interna de contacto y mensaje application-scoped |

## GVC Scenario Plan

- Scenario: extender `task354-careers-runtime-audit` o crear focal `task1688-careers-contact-completeness` según el plan aprobado.
- Routes: `/public/careers/[publicId]/apply` y `/agency/hiring/applications/[applicationId]`.
- Required captures: Careers estándar y native (idle + país inválido + respuesta genérica), Application 360 con valores de prueba autorizados y fila legacy “No informado”.
- Viewports: 1440 × 1024 y 390 × 844.
- Quality profile: `premium`.
- Assertions: `scrollWidth === clientWidth`; label/error/teclado; foco al primer error; país no cambia al escoger prefijo; valores no aparecen en consola, URL ni captura versionada sin redacción.
- Reduced motion: confirmar que la extensión no añade animación ni rompe el modo reducido.
- Review dossier: directorio de capturas GVC de la task y scorecard, con datos de prueba redactados; ninguna PII real se versiona.
- Baseline decision: comparar contra el source-led `TASK-354` y la Application 360 vigente; se acepta sólo el delta contractual de los campos, no un rediseño incidental.
- Baseline surface ID: `careers-apply-v1` y `hiring-application-360-v1`.

## Design Decision Log

- Decision: país de residencia explícito, textual y requerido; teléfono opcional y normalizado; mensaje propio de la postulación.
- Alternatives: inferir desde el prefijo telefónico (rechazado: dato insuficiente); ubicar el mensaje en la persona (rechazado: pierde contexto); nuevo paso de wizard (rechazado: fricción sin valor).
- Primitive decision: `reuse`; no se crea select/flag-picker paralelo ni un nuevo panel de Application 360.
- Open risk: la disposición física final de columnas y la máscara de teléfono requieren el ADR y la política PII antes de código.
