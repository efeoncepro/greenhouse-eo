# TASK-1856 — Dirección visual: un brief claro, una conversación con memoria

Versión 2026-09-09. Visual direction mode: `repo-native-benchmark`. UI ready: no.
Selección de diseño para implementación; sin prototipo renderizado, prueba con usuarios ni score visual.

## Tesis

Pedir trabajo debe sentirse como entregar un buen brief a un equipo que ya conoce el servicio: contexto
precargado, preguntas pertinentes, revisión antes de enviar y un acuse que explica qué ocurrirá después.
El cliente no debe aprender nuestro modelo interno de tareas, convertir formatos mentalmente ni repetir
lo que el sistema ya sabe. La apariencia premium depende de esa continuidad y de una composición serena.

La solicitud es una unidad con historial. El brief es su información estructurada; no otro formulario
inconexo ni una promesa de producción. “Recibida” confirma registro; sólo el equipo/command puede confirmar
aceptación, planificación y entrega. No inventar un SLA para tranquilizar al cliente.

## Alternativas comparadas

| Dirección | Experiencia | Ventaja | Decisión |
|---|---|---|---|
| A. Modal rápido de contacto | Título, texto y botón enviar | Inicio inmediato para pedidos mínimos | No sostiene briefs, adjuntos, recovery ni móvil; descartada |
| B. Wizard largo de una pregunta por pantalla | Conversación aparente con muchos pasos | Puede reducir carga por pantalla | Esconde alcance, multiplica navegación y frustra edición; descartada como patrón universal |
| C. Hoja de brief con revisión | Contexto, campos agrupados y resumen final en la misma familia visual | Hace visible el alcance y permite corregir; acuse continúa al detalle | Seleccionada: dos etapas locales, Preparar y Revisar, sin recurso remoto hasta enviar |

La lista de solicitudes usa filas operativas; el formulario usa `settingsFlow`; el detalle usa una hoja
`analyticsReport`. Mantener una identidad visual no significa forzar el mismo layout para tres trabajos.

## Benchmarks y decisiones de sistema

- `SurfaceRecipe` y `WorkbenchHeader` aportan planos y jerarquía; la cabecera nunca se coloca en primary.
- `FormSectionAccordion` existe, pero cada instancia añade borde/superficie: no usarlo para todas las
  secciones. Campos esenciales abiertos; ayuda opcional con disclosure canónico. Si se usa un accordion
  para material opcional, contabilizarlo y no envolverlo en otra card.
- Wrappers Vuexy de formulario conservan validación y teclado. No adoptar inputs de una librería paralela.
- `GreenhouseStateTransition variant='inline' active={false}` puede representar un cambio confirmado
  sin contenedor extra ni animaciones legacy. Su API real no expone duration/ease.
- `GreenhouseCommandFeedback` existe pero añade card tonal: no apilarlo sobre un acuse completo. Preferir
  mensaje persistente dentro del plano, con semántica accesible, cuando no se necesita esa card.
- `GreenhouseStepperProgressMicro` cuenta pasos completos; no usar ese porcentaje como avance productivo
  de una solicitud. Preparar/Revisar se presentan como dos etapas locales, sin “50 % del servicio”.

## Primer fold y firma visual

Una cabecera pequeña sitúa el servicio. La pregunta “¿Qué necesitas lograr?” es el inicio de la hoja;
antes de escribir el cliente ve qué enviará, qué datos son opcionales y que podrá revisar.
El primer fold contiene título, contexto, instrucción y primer campo. No hay una portada de bienvenida.

La firma aparece en la revisión: un brief ordenado y legible como documento, con grupos claros, formato
label/valor y enlaces “Editar” específicos. Tras confirmar, la misma estructura conserva el título y
el contexto, añade referencia/estado durable y se convierte en el hilo de seguimiento. La continuidad
es semántica y espacial; no requiere una animación que transforme el texto en una tarjeta.

## Ritmo y jerarquía

- Dos superficies de base: header y documento/formulario. Las secciones se separan por espacio y divisor.
- Título `surfaceHeroTitle`; pregunta/sección `h5`; ayuda `body2`; labels del control canónico;
  referencia `monoId`; fecha `caption`. No reducir las ayudas críticas a un pie de letra ilegible.
- Un botón primario por etapa: Revisar solicitud → Enviar solicitud → Ver solicitud.
- Campos de texto amplios, labels encima, hints junto al dato. Formularios no usan filas densas de administración.
- No poner campos esenciales en columnas que obliguen a saltar visualmente. Dos columnas sólo para pares
  cortos relacionados en expanded, por ejemplo formato y cantidad, si el ancho disponible lo permite.
- El material adjunto usa una lista funcional: nombre, tipo, tamaño, estado y acción. Sin mural de thumbnails.
- Los errores se ubican junto al campo y en un resumen enlazado; no convierten toda la hoja en una alerta roja.

## Responsive y atención

| Contexto | Regla |
|---|---|
| 1440×900 | Formulario centrado por recipe focused, longitud de línea gobernada; ayuda breve junto al campo |
| 390×844 | Una columna; labels/valores completos, picker de archivos accesible, CTA al final del contenido |
| Teclado virtual | No dock fijo en V1; el footer en flujo no tapa campo, error ni adjunto |
| Revisión larga | Anchors Editar por sección; volver lleva al campo y conserva los demás datos |
| Seguimiento largo | Último paso material primero, historial paginado en orden del servidor |

La experiencia no debe depender de un sidebar abierto. El shell existente conserva contexto y navegación;
no crear una entrada principal “Briefs” ni otra “Solicitudes” fuera del servicio.

## Color, material y movimiento

Canvas/hoja/tipos/acciones usan tokens AXIS/MUI igual que TASK-1854. La autoridad del estado proviene del
texto y del hecho registrado, no de un fondo celebratorio. Sin confetti automático, gradientes de éxito,
spinners dentro de todos los pasos o avatars ficticios de responsables.

Motion acompaña disclosure y cambio de etapa; el texto permanece opaco y legible. Envío pendiente no
mueve el botón ni incrementa un progreso inventado. El acuse sólo aparece tras respuesta durable o
reconciliación positiva. Contrato completo en motion; reduced motion conserva todos los estados.

## Anti-patrones y pruebas de intención

- “Ya estamos trabajando” después de un POST exitoso, cuando sólo existe una solicitud recibida.
- Marcar el brief completo porque un contador de campos llegó al 100 %, sin validar requisitos de plantilla.
- Pedir al cliente que escriba su organización, servicio, identidad o datos que ya están autorizados.
- Un campo libre “fecha de entrega” que se presenta después como compromiso del equipo.
- Autosave que no persiste; botón Guardar borrador cuando no hay command durable.
- Perder campos al cambiar tipo, al volver desde revisión o al fallar un upload.
- Reintentar POST con una nueva clave porque hubo timeout; enviar de nuevo al reabrir una URL.
- Crear un informe Efeonce Insights mediante una solicitud de producción genérica.
- Usar correo/in-app como chat paralelo con estado distinto del detalle de solicitud.

## Decisiones y revisión

D56-01: formulario de página completa y revisión local, no modal extenso.
D56-02: V1 conserva edición en memoria durante la navegación local del formulario; no promete persistencia
tras recarga/cierre/salida al login. Un borrador durable requiere contrato explícito de TASK-1855 antes de ofrecerlo.
D56-03: campos y límites proceden de plantilla versionada del backend; este paquete define el contenido
necesario y los límites propuestos que su dueña debe conciliar, no un segundo schema en React.
D56-04: un acuse durable y un único historial; errores de notificación no revierten una solicitud creada.
D56-05: calidad visual promedio ≥4.5, floor ≥4; jerarquía, economía, impacto, fidelidad y resistencia a
plantilla ≥4.5. Primer fold y estados críticos en desktop/390 antes de aprobar implementación.

Reabrir la dirección si el formulario no puede conservar inputs entre etapas, si los límites no son
explicables antes de enviar o si el acuse no permite recuperar de forma inequívoca el recurso.
