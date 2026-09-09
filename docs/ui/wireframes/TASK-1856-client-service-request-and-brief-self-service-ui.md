# TASK-1856 — Wireframe: solicitudes, brief y seguimiento

Diseño detallado 2026-09-09; UI ready: no. Sin implementación ni capturas GVC.
- Visual direction mode: repo-native-benchmark
- Product Design asset: docs/ui/visual-directions/TASK-1856-client-service-request-and-brief-self-service-ui.md
- Flow: docs/ui/flows/TASK-1856-client-service-request-and-brief-self-service-ui-flow.md
- Motion: docs/ui/motion/TASK-1856-client-service-request-and-brief-self-service-ui-motion.md

## Alcance, rutas y actores

Las rutas siguientes son nuevas propuestas, bajo la jerarquía de servicio definida en TASK-1854.
El scope proviene del servidor; cada página y command revalida vista, entitlement, organización y objeto.
No heredar permiso de escritura porque `/home` sea una vista base.

| ID | Pantalla / ruta de diseño | Objetivo |
|---|---|---|
| R0 | `/home/services/[serviceId]/requests` | Ver solicitudes accesibles, estado y próximo paso |
| R1 | `/home/services/[serviceId]/requests/new` | Preparar un brief contextual, sin crear todavía un recurso |
| R2 | Misma ruta, etapa local Revisar | Confirmar contenido legible y corregir secciones |
| R3 | `/home/services/[serviceId]/requests/[requestId]` tras creación | Acuse durable y detalle recuperable |
| R4 | Misma ruta, acción Completar información | Responder a preguntas explícitas sin sobrescribir historia |
| R5 | Mismo detalle, estado final | Leer resolución y seguir destinos de trabajo/entregas permitidos |

No crear URL `/new?submitted=true` como comprobante. La referencia y estado se recuperan de un reader.
No hay nuevo menú principal: se entra desde el servicio, un pendiente o un aviso. “Solicitudes” es sección
del servicio; “Brief” nombra la información del pedido. El rol interno gestiona por sus superficies dueñas;
esta task sólo diseña la perspectiva cliente y las respuestas/redacciones que puede ver.

| Capacidad resuelta | Puede ver | Puede hacer |
|---|---|---|
| Lectura de servicio | Contexto y enlace permitido | No implica leer todas las solicitudes |
| Lectura de solicitud | Campos e historial autorizados por objeto | No implica crear/completar |
| Crear solicitud | Plantillas y constraints autorizados | Enviar dentro de servicio/scope permitido |
| Completar información | Preguntas y revisión visible del objeto | Responder sólo campos/acción habilitados |
| Gestión interna | Fuera del alcance de esta UI | Aceptar/planificar/resolver sólo por command y policy dueños |

## Desktop Target

### R0 — Lista de solicitudes

```text
┌ Header: Inicio / Diseño digital / Solicitudes ─────────────────────┐
│ Solicitudes                                  [Nueva solicitud]*  │
│ Diseño digital · [organización]                                   │
│ [Buscar por título] [Estado ▾] [Período ▾]                         │
└───────────────────────────────────────────────────────────────────┘
┌ Hoja ─────────────────────────────────────────────────────────────┐
│ [requiere tu información: cantidad del reader]                     │
│ Solicitud              Estado          Actualización  Próximo paso│
│ Campaña de temporada   Necesita datos  [fecha]       Completar    │
│ Adaptaciones digitales Recibida        [fecha]       Ver detalle │
│ [paginación accesible · total sólo si backend lo conoce]           │
└───────────────────────────────────────────────────────────────────┘
* Sólo con create permitido. Sin permiso se conserva lectura.
```

Default propuesto: prioridad “requiere acción tuya” y después última actualización, con desempate estable
resuelto por el reader. Búsqueda/estado/período son parámetros tipados del reader, no filtros de una página
parcial en memoria que aparentan buscar todo el historial. Si backend no soporta un filtro, no mostrarlo.
Vacío inicial invita a crear sólo si está permitido; vacío por filtro ofrece Limpiar filtros.

### R1 — Preparar solicitud

```text
┌ Header: Inicio / Diseño digital / Solicitudes / Nueva solicitud ───┐
│ Nueva solicitud                                                  │
│ Diseño digital · [organización]                                  │
│ 1 Preparar  →  2 Revisar                                          │
└───────────────────────────────────────────────────────────────────┘
┌ Hoja de brief ─────────────────────────────────────────────────────┐
│ ¿Qué necesitas lograr?                                            │
│ Completa lo esencial. Podrás revisarlo antes de enviarlo.          │
│ Título de la solicitud *                                          │
│ [_______________________________________________________________]│
│ Objetivo *                                                       │
│ [                                                               ]│
│ [_______________________________________________________________]│
│ ─ Entregable y contexto ────────────────────────────────────────── │
│ [campos de plantilla del servicio; ver matriz]                     │
│ ─ Fecha solicitada ─────────────────────────────────────────────── │
│ [fecha opcional]  El equipo confirmará la planificación.           │
│ ─ Material y referencias ───────────────────────────────────────── │
│ [Adjuntar archivos] [Añadir enlace] · límites antes de seleccionar │
│ [archivo] [tamaño/tipo] [validando/disponible/error] [Retirar]        │
│ ────────────────────────────────────────────────────────────────── │
│ Este contenido aún no se ha enviado.                              │
│ [Cancelar]                                  [Revisar solicitud]   │
└───────────────────────────────────────────────────────────────────┘
```

No solicitar organización/correo/servicio editables si ya vienen resueltos. Al llegar sin servicio válido,
se regresa a selección autorizada; no usar texto libre como clave. No se ofrece un selector de cuenta
local dentro del brief. Si cambia el contexto global, aplicar protección de cambios antes de salir.

### R2 — Revisar antes de enviar

```text
┌ Header: ... / Nueva solicitud ─────────────────────────────────────┐
│ Revisa tu solicitud                                               │
│ Diseño digital · [organización] · 2 Revisar                        │
└───────────────────────────────────────────────────────────────────┘
┌ Brief legible ─────────────────────────────────────────────────────┐
│ [Título]                                                Editar    │
│ Objetivo: [texto completo con párrafos]                            │
│ Entregable: [tipo/formato/cantidad]                      Editar    │
│ Audiencia: [texto] · Canales: [valores]                             │
│ Fecha solicitada: [fecha] / Sin fecha solicitada                   │
│ Material: [sólo adjuntos validados; links legibles]       Editar    │
│ ─ Qué ocurre después ───────────────────────────────────────────── │
│ El equipo revisará el alcance y te indicará el siguiente paso.    │
│ Enviar no confirma una fecha de entrega ni modifica tu servicio.  │
│ [Volver a editar]                              [Enviar solicitud] │
└───────────────────────────────────────────────────────────────────┘
```

Mostrar también ausencia de opcionales relevantes como fecha/material, sin “No disponible” que parezca
error. No añadir checkbox genérico de aceptación de términos si el command no lo requiere. Si un requisito
real exige confirmación explícita, su texto/versionado proviene del contrato y debe revisarse con la dueña.
Cada Editar vuelve al campo/grupo correcto y conserva el contenido. Volver a revisión valida lo modificado.

### R3 — Acuse y detalle

```text
┌ Header: ... / Solicitudes / [referencia] ───────────────────────────┐
│ [Título de la solicitud]                                          │
│ [referencia] · Diseño digital · Recibida · [fecha y hora]          │
└───────────────────────────────────────────────────────────────────┘
┌ Hoja de seguimiento ───────────────────────────────────────────────┐
│ Solicitud recibida                                                │
│ La registramos con la referencia [referencia].                     │
│ Próximo paso: el equipo revisará el alcance.                       │
│ Responsable: [nombre permitido / Equipo Efeonce]                   │
│ Fecha solicitada: [fecha] · Fecha confirmada: Aún no definida      │
│ [Ver solicitudes]                                                │
│ ─ Brief enviado ───────────────────────────────────────────────── │
│ [contenido estructurado de la revisión durable]                    │
│ ─ Historial ───────────────────────────────────────────────────── │
│ [fecha] Solicitud recibida · [actor permitido]                     │
│ [fecha] Información solicitada · [pregunta visible]                │
│ [si requiere acción]                         [Completar información]│
└───────────────────────────────────────────────────────────────────┘
```

El encabezado conserva título/contexto y añade referencia. No transformar una respuesta local en “Recibida”
sin reader/resultado durable. Si el envío existe pero el readback está temporalmente indisponible, conservar
la referencia confirmada y mostrar “Solicitud registrada. No pudimos cargar el seguimiento.” con Reintentar.
La falla de email/in-app no convierte la solicitud en fallida ni activa un segundo POST.

### R4 — Completar información

Mostrar pregunta(s) del equipo, fecha y autor visible; debajo, campos permitidos y acción “Enviar información”.
El brief original permanece en lectura. Se envía una revisión/respuesta con expectedVersion, sin editar
silenciosamente el contenido enviado. Un requerimiento cerrado por otro actor produce conflicto recuperable.
Al confirmar, el detalle muestra el aporte registrado y el siguiente estado leído; no supone “En producción”.
Si sólo se permite lectura, no mostrar composer; explicar bloqueo temporal únicamente cuando el reader lo autorice.

### R5 — Resolución

Presentar estado final, motivo/redacción cliente, fecha y enlaces permitidos a entregables. “Resuelta” describe
la solicitud; la entrega/publicación se verifica en su propio objeto. Para nueva necesidad, Nueva solicitud
si está permitido, sin clonar brief/adjuntos automáticamente. Cancelar/reabrir no se ofrece en V1 salvo
command y capability explícitos ya confirmados por TASK-1855; no crear botones aspiracionales.

## Campos y validación por servicio

Esta matriz es el **requerimiento de producto** para la plantilla versionada de TASK-1855. Los nombres
son labels, no keys de schema existentes. Los límites son propuestas concretas para conciliar con sus
constraints server-side antes de implementar; no imponer dos fuentes de verdad front/backend.

### Base común

| Campo | Requisito / límite propuesto | Ayuda y validación |
|---|---|---|
| Organización, servicio, solicitante | Resueltos por servidor, sólo lectura | No confiar en valores ocultos del browser como autoridad |
| Tipo de solicitud | Enum permitido por servicio; obligatorio si hay más de un tipo | Si sólo hay uno, presentarlo sin selector redundante |
| Título | Obligatorio; 5–120 caracteres tras trim | “Describe el entregable o la necesidad.”; no truncar lo que se guarda |
| Objetivo | Obligatorio; 20–2000 caracteres | “¿Qué necesitas que cambie o qué decisión apoyará este trabajo?” |
| Audiencia | Según plantilla; hasta 500 caracteres | No confundir público destinatario con usuarios de portal |
| Contexto / restricciones | Opcional; hasta 2000 caracteres | Incluir antecedentes y lo que debe respetarse, sin datos innecesarios |
| Fecha solicitada | Opcional; fecha de calendario válida, zona del servicio | No fecha pasada para nueva solicitud; no equivale a fecha comprometida |
| Referencias | Opcionales; hasta 5 URLs HTTPS propuestas | Label legible; no fetch/crawl automático de URL privada al pegar |
| Material adjunto | Opcional o requerido por plantilla | Tipos/cantidad/tamaño desde policy; ver contrato de archivos |

Validar required, longitud, enum, fecha y relación entre campos en el command; espejo de feedback en UI.
No deshabilitar Revisar sólo por campos incompletos: permitir activarlo y descubrir errores con resumen.
Bloquear envío final mientras hay uploads pendientes/fallidos obligatorios o durante resultado indeterminado.

### Berel — Marketing de contenidos

| Campo específico | Requisito propuesto | Presentación / alcance |
|---|---|---|
| Necesidad | Enum del servicio: contenido nuevo / ajuste de contenido | Enum versionado, no se deduce de un nombre comercial |
| Tema o pregunta a resolver | Obligatorio; 10–500 caracteres | “¿Sobre qué debe tratar el contenido?” |
| Tipo de pieza | Enum autorizado: artículo, tutorial u otros confirmados | No habilitar todos los formatos del catálogo global |
| Audiencia / uso | Obligatorio; hasta 500 caracteres | Ayuda sobre lectores, etapa y utilidad esperada |
| Producto/contexto de marca | Opcional; hasta 1000 caracteres | No pedir claims comerciales sin fuente |
| Pieza existente | Obligatoria para ajuste; objeto/URL autorizada | Identificar original; no sobrescribir Notion/Drupal |
| Palabras clave / referencias | Opcional; hasta 10 términos propuestos | Sugerencias del cliente, no estrategia SEO validada |
| Idioma/mercado | Default permitido del servicio; editable sólo si plantilla lo permite | Berel es-MX según contrato editorial, no por navegador |

No se genera un artículo, plan mensual ni publicación al enviar. El cliente propone tema/objetivo; el
flujo editorial existente conserva investigación, brief, comentarios anclados, revisión y CMS.

### Berel — SEO

| Campo específico | Requisito propuesto | Presentación / alcance |
|---|---|---|
| Necesidad | Análisis de una página / consulta de desempeño / revisión técnica, si el backend las permite | Solicitud humana, no ejecución automática de proveedor |
| Página o sección | Requerida para análisis/revisión puntual | URL dentro del sitio autorizado o selección de objeto existente |
| Pregunta o cambio observado | Obligatorio; 20–2000 caracteres; puede usar el Objetivo común | No duplicar dos textareas con la misma pregunta |
| Período relacionado | Opcional, opciones autorizadas | Precargar contexto del servicio cuando corresponda |
| Términos de interés | Opcional; hasta 10 | Sin promesa de posicionamiento o volumen |

No cobrar créditos, lanzar crawls ni conectar Search Console al enviar. Una solicitud de informe Efeonce
Insights se deriva a su builder/command autorizado, sin crear un pedido SEO duplicado.

### Sky — Diseño digital

| Campo específico | Requisito propuesto | Presentación / alcance |
|---|---|---|
| Necesidad | Nueva pieza / adaptación de pieza existente | Dependiente de plantilla autorizada |
| Tipo de pieza | Enum del servicio confirmado | No suponer ads, video, impresión o producción Globe contratados |
| Canal de uso | Requerido; enum autorizado + texto permitido por schema | Aclara destino, no concede acceso al canal |
| Formato / dimensiones | Requerido según pieza; preset o ancho/alto/unidad válidos | No mezclar px/mm; ratio derivado del schema, no texto ambiguo |
| Cantidad / versiones | Entero positivo; máximo por policy | No equivale a aprobación de cupo/precio |
| Audiencia y mensaje principal | Obligatorios, hasta 500 y 1000 caracteres respectivamente | Distinguir objetivo del mensaje que verá el destinatario |
| Copy disponible | Sí / pendiente, según plantilla | Si existe: texto/material; si falta, indicar dependencia sin prometer copywriting |
| Original a adaptar | Obligatorio para adaptación; referencia/archivo autorizado | Conservar versión y relación con fuente |
| Restricciones de marca | Opcional; hasta 2000 caracteres | Links/material permitidos; no asumir logos o banco de assets |

La UI reutiliza secciones/campos por contrato, no tres formularios hardcoded por nombres Berel/Sky.
Un tipo desconocido o versión incompatible adopta estado seguro y no permite enviar payload incompleto.

### Material y adjuntos

- Antes del picker: mostrar tipos admitidos, límite por archivo, cantidad y total emitidos por el backend.
  No fijar “20 MB” ni aceptar “cualquier archivo” sin policy. Esta parte bloquea upload hasta estar definida.
- Estados por archivo: seleccionado localmente → cargando → validando → disponible; error/rechazado/retirado
  son distintos. Sólo disponible puede formar parte del envío confirmado. Un 2xx de storage no es validación.
- Lista con nombre completo accesible, tamaño legible, tipo y error específico sanitizado. El progreso sólo
  usa bytes reales; validación usa estado indeterminado. Reintentar archivo no reenvía la solicitud.
- URLs privadas cortas/firmadas se obtienen al abrir según autoridad; no se guardan como links permanentes
  ni se copian a telemetría. Sin previews antes de validación; no inline de contenido activo no permitido.
- Retirar antes del submit quita la referencia local y usa limpieza del owner; no borra un archivo fuente
  compartido. Uploads huérfanos tienen expiración/cleanup backend definido antes del rollout.
- El snapshot de revisión debe coincidir con las referencias aceptadas; revocación o rechazo tardío invalida
  envío de ese adjunto y explica qué retirar/reemplazar, conservando el texto restante.
- Drop zone es complemento; siempre botón de selección y teclado. Nombre largo no causa overflow.

## Mobile Target

```text
[Inicio / Diseño digital / Solicitudes]
Nueva solicitud
Diseño digital · [organización]
1 Preparar → 2 Revisar
──────────────────────────────────────
¿Qué necesitas lograr?
Título de la solicitud *
[texto legible a ancho completo       ]
Objetivo *
[                                    ]
[                                    ]
[ayuda visible]
… secciones en una columna …
[archivo con nombre que puede envolver]
Estado: Validando archivo
──────────────────────────────────────
Aún no has enviado esta solicitud.
[          Revisar solicitud          ]
[              Cancelar               ]
```

Footer en flujo; no tapa teclado ni safe area del sistema. En R2, label/valor vertical y Editar con target
completo. En R3, referencia puede envolver, estado conserva texto y fecha no depende de tooltip.
No usar scroll horizontal para formularios, historial ni archivos. Paginación del historial conserva foco
al botón/primer elemento nuevo según acción explícita, sin reiniciar el scroll del detalle.

## Action Hierarchy

| Pantalla/estado | Primaria | Secundarias | Foco |
|---|---|---|---|
| R0 | Nueva solicitud si permitida | Abrir solicitud, filtrar | Encabezado al entrar; resultado anunciado tras filtro |
| R1 | Revisar solicitud | Cancelar, adjuntar, abrir ayuda | Primer error si invalid; no autofocus de campo al entrar en móvil |
| R2 | Enviar solicitud | Volver a editar, Editar sección | Encabezado de revisión; campo específico al editar |
| Enviando | “Enviando solicitud…” en control estable | No repetir envío | Conservar foco; aria-busy y estado polite |
| Resultado indeterminado | Comprobar envío | Mantener resumen en lectura | Mensaje persistente; no crear nueva key |
| R3 confirmada | Ver solicitud/seguir siguiente paso según momento | Ver solicitudes | Encabezado del detalle con referencia |
| R4 | Enviar información | Volver al detalle | Resumen error o respuesta registrada |
| R5 | Nueva solicitud si corresponde | Ver entrega / historial | Sin CTA Aprobar/Cerrar inventado |

## State Copy

Claves propuestas en `src/lib/copy/client-service-requests.ts`, con pluralización y variables seguras.

| Clave | Copy | Conducta |
|---|---|---|
| draftLocal | “Aún no has enviado esta solicitud.” | Nunca “Guardado” sin almacenamiento durable |
| leaveDirty | “Si sales, perderás los cambios que no has enviado.” | “Seguir editando” / “Salir sin enviar”; foco inicial en conservar |
| validationSummary | “Revisa [n] campos antes de continuar.” | Lista enlazada; abrir sección del campo |
| required | “Completa [campo].” | No toast único |
| tooLong | “Usa hasta [límite] caracteres.” | Contador por constraint; no cortar el texto |
| requestedDate | “El equipo confirmará la planificación.” | Junto al campo y en revisión |
| uploadRejected | “No pudimos usar este archivo: [motivo seguro].” | Retirar/reemplazar; otros campos se conservan |
| sending | “Estamos registrando tu solicitud.” | No porcentaje ni fecha de respuesta inventada |
| uncertain | “Estamos comprobando si tu solicitud quedó registrada.” | Comprobar por la misma operación; no asegurar fallo |
| received | “Solicitud recibida.” | Referencia durable y próximo paso real |
| readbackFailure | “Solicitud registrada. No pudimos cargar el seguimiento.” | Referencia confirmada + Reintentar lectura |
| extraInfo | “El equipo necesita esta información para continuar.” | Preguntas concretas; no formulario completo repetido |
| responseReceived | “Información recibida.” | Versión/fecha y siguiente estado del reader |
| conflict | “La solicitud cambió mientras la editabas.” | Ver cambios, conservar aporte, revalidar antes de enviar |
| offline | “No tienes conexión. Conservamos lo escrito en esta pantalla.” | No prometer recuperación tras recargar/cerrar |
| expiredSession | “Tu sesión venció. Inicia sesión para continuar.” | Advertir pérdida si login abandona documento sin draft durable |
| denied | “No tienes acceso a esta solicitud.” | No datos, títulos ni nombres ajenos |
| noResults | “No hay solicitudes con estos filtros.” | Limpiar filtros |
| empty | “Aún no hay solicitudes para este servicio.” | Nueva solicitud si autorizada |
| policyChanged | “Cambió la información requerida para este servicio.” | Conservar campos compatibles, señalar lo que debe revisarse |

No copiar errores de provider/SQL, IDs de trazas sensibles ni lenguaje como “payload inválido”. El cliente
recibe referencia de soporte sanitizada sólo si el contrato la emite. El título de error describe la acción.

## Accessibility Contract

- Un form semántico; labels persistentes, campos required marcados textual y programáticamente; fieldsets
  y legend para grupos. Hint/error conectado con aria-describedby, aria-invalid al validar.
- Submit inválido enfoca resumen con enlaces; al activar enlace, abrir sección y enfocar campo. Validación
  de blur sólo después de interacción; no inundar de rojo la pantalla recién abierta.
- Textarea Enter inserta línea; no submit implícito inesperado ni atajo global de envío en V1.
- Dos etapas no son una barra de cumplimiento contractual. aria-current identifica etapa de formulario.
- Cambios de estado anunciados una vez; no dueto de toast y live region leyendo el mismo mensaje.
- Dialog de salida: trap de foco, Escape equivale a seguir editando, click-away nunca descarta contenido.
- Contraste AA, objetivos 44×44 de experiencia, 200 % zoom, foco visible; no shake de campos ni fade de errores.
- Revisar documento completo con lector, teclado, adjuntos y errores. La captura sólo complementa esa prueba.

## Implementation Mapping

| Rol | Componente / owner | Decisión |
|---|---|---|
| Lista/detalle | `SurfaceRecipe kind='analyticsReport'` | reuse single; sin drawer obligatorio para URL directa |
| Formulario/revisión | `SurfaceRecipe kind='settingsFlow'` | reuse focused; body en primary, header independiente |
| Header | `WorkbenchHeader kind='report'` | reuse; máximo una acción principal, navegación en supporting |
| Grupos | `OperationalSection variant='open' kind='content'` | reuse sin cards por bloque |
| Inputs | Wrappers Vuexy `CustomTextField`, `CustomAutocomplete` y controles canónicos | reuse; no fields con schema propio divergente |
| Progreso local | Lista semántica Preparar/Revisar con controles canónicos | No usar porcentaje de GreenhouseStepperProgressMicro como delivery |
| Cambio confirmado | `GreenhouseStateTransition variant='inline' active={false}` | reuse opcional estático; evitar keyframes legacy locales |
| Salida con cambios | Dialog de confirmación canónico sobre MUI según catálogo | reuse, no nueva primitive ni navegación forzada |
| Modelo | TASK-1855 | Plantilla versionada, constraints, policy de adjuntos, commands, reader e historial |
| Servicio/período | TASK-1853 | Contexto inicial y destinos; nada de stores en cliente |
| Avisos | Dueñas de Notification Hub/Insights | Canal/redacción/entrega independientes del éxito de solicitud |

Propuestos: componentes bajo `src/views/greenhouse/client-portal/`, copy en el diccionario nombrado y
rutas bajo `/home/services`. Los command names y errores se fijan por TASK-1855; usar su cliente tipado.
Contrato mínimo adicional: idempotency key por intención, expectedVersion por cambio, resultado durable,
reconciliación de operación indeterminada, estado del recurso separado de delivery/sync/canal y referencias
privadas de archivos. Estos son requisitos de integración, no un backend existente certificado.

## GVC Scenario Plan

Archivo propuesto `scripts/frontend/scenarios/task1856-client-services.scenario.ts`, `CaptureScenario`
tipado y `qualityProfile: 'premium'`. Markers: `client-request-list`, `client-request-form`,
`client-request-review`, `client-request-validation`, `client-request-attachments`, `client-request-submit`,
`client-request-receipt`, `client-request-next-step`, `client-request-history`, `client-request-state`.
Son anchors de pruebas propuestos, sin identificadores ni texto privados en sus valores.

| Caso | Secuencia | Evidencia exigida |
|---|---|---|
| R56-01 | Crear contenido sintético → revisar → editar → enviar | Datos iguales entre etapas y snapshot durable; first fold R1/R2/R3 |
| R56-02 | Adaptación diseño sin original/formato | Error específico, foco al campo, conservación del resto |
| R56-03 | Consulta SEO desde período → revisar | Contexto correcto; ningún proveedor/crawl ejecutado |
| R56-04 | Required/longitud/fecha/enum inválidos | UI y API rechazan igual; resumen enlazado desktop/390 |
| R56-05 | Upload parcial, archivo rechazado, nombre largo | Retry por archivo; no submit con referencia inválida; sin overflow |
| R56-06 | Doble clic + timeout tras commit | Exactamente un recurso; misma key; readback recupera referencia |
| R56-07 | Error previo a commit | Inputs conservados; reintento gobernado, sin falso acuse |
| R56-08 | Sin red en R1/R2 | Mensaje honesto; no envío en background ni reload automático |
| R56-09 | Salir/Back/cambiar cuenta con dirty | Seguir editando conserva; descartar requiere acción explícita |
| R56-10 | Sesión expira antes/durante submit | No fuga ni replay automático; distinguir contenido no durable de operación aceptada |
| R56-11 | Completar datos con expectedVersion obsoleto | Conflicto visible, aporte conservado, ninguna sobrescritura ciega |
| R56-12 | Aviso → login → solicitud resuelta | Estado actual y destino exacto; leer no responde ni resuelve |
| R56-13 | Revocación de objeto/adjunto | Denegación segura y caché purgada; sin mostrar brief ajeno |
| R56-14 | Solicitud existe, email falla | Acuse válido; no duplicación ni reenvío desde UI |
| R56-15 | Teclado, lector, 200 %, reduced motion | Labels/errores/etapas/foco correctos, significado equivalente |
| R56-16 | Cambia templateVersion mientras se revisa | Revalidación, campos compatibles preservados, sin envío obsoleto |

Capturas en 1440×900 y 390×844 para lista/formulario/revisión/acuse/completar/conflicto; reduced y teclado
como evidencia separada. Medir DOM `scrollWidth === clientWidth`, incluyendo archivos, dialogs y errores.
Fixtures sintéticos aislados; no enviar solicitudes o avisos a Berel/Sky durante QA técnica.

## Design Decision Log

Dirección C, dos etapas locales y detalle durable; navegación subordinada al servicio.
Campos/límites propuestos tienen owner backend, sin IDs ni APIs inventados como existentes.
El formulario no promete borrador persistente. Si el owner incorpora uno, extender contrato, recovery,
retención y pruebas antes de cambiar ese copy. No guardar briefs en localStorage/sessionStorage por defecto.
UI ready sigue no hasta cumplir dependencias, integración, primer fold y revisión GVC premium real.
