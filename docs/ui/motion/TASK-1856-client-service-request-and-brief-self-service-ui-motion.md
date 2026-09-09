# TASK-1856 — Motion: de intención a confirmación verificable

Contrato detallado 2026-09-09; sin runtime, captura o scorecard. UI ready: no.
Complementa wireframe y flow TASK-1856. No decide enums de solicitud ni tiempos de respuesta del equipo.

## Motion brief

El formulario conserva orientación durante edición/revisión y hace inequívoca la diferencia entre esperar,
registrar y necesitar correcciones. La calidad se percibe en controles estables, lectura sin saltos y
continuidad del título/contexto al llegar al detalle. No celebrar una solicitud como si fuera una entrega.

La transición más importante es semántica: **Enviar → Comprobando o Recibida** según evidencia real.
Nunca usar la duración de una animación para activar un acuse, un reintento o un cambio de negocio.

## Owners y capacidades reales

| Elemento | Implementación prevista | Qué se reutiliza / límite |
|---|---|---|
| Layout | SurfaceRecipe settingsFlow/analyticsReport → CompositionShell | Rich del shell; no layer adicional de animación de formulario |
| Botones/campos | Primitives Greenhouse y wrappers Vuexy | Tier 1 y foco; hit areas estables |
| Ayuda/disclosure | Primitive canónica; FormSectionAccordion sólo si se justifica | Controller posee expansión, reduced y cleanup |
| Resultado de cambio | GreenhouseStateTransition inline con `active={false}` opcional | Render estático confirmado; API no admite duration/ease |
| Error/acuse | Texto persistente en plano con role adecuado | Sin card tonal adicional para cada mensaje |
| Dialog de salida | Confirmación canónica sobre MUI | Focus trap, Escape conservador y transición heredada |
| Escala | `motion/core/tokens.ts` | `motionCss.duration.short/standard/medium`; `motionCss.ease.standard/emphasized/emphasizedAccelerate` |

Se inspeccionaron GreenhouseStateTransition, GreenhouseCommandFeedback y GreenhouseStepperProgressMicro.
Sus versiones actuales incluyen timings/keyframes internos; no copiarlos al consumer ni atribuirles
props tokenizadas inexistentes. Esta task usa StateTransition estático si conviene y no adopta spinner/
progreso legacy para simular envío. Cualquier mejora del controller compartido requiere su propio alcance,
contrato y verificación; no se modifica la plataforma sólo para hacer coincidir este documento.

## State transitions

| ID | Disparador | Feedback / movimiento | Interrupción y final | Reduced motion |
|---|---|---|---|---|
| M56-01 focus → edición | Usuario entra a campo | Foco Tier 1 inmediato; label estable | Blur no borra ayuda ni contenido | Igual |
| M56-02 ayuda cerrada → abierta | Disclosure explícito | Expansión canónica; `standard` como intención | Repetir invierte; sólo una geometría animada | Instantáneo, expanded correcto |
| M56-03 Preparar → Revisar | Validación local correcta | Contenido reemplazado, header/contexto conservados; reflow del shell si aplica | H1 revisión enfocado; no carousel lateral | Reemplazo instantáneo |
| M56-04 Revisar → Editar | Link a sección | Volver y enfocar campo; scroll necesario nativo | No smooth scroll obligatorio ni esperar animación | Igual foco sin desplazamiento animado |
| M56-05 validación inválida | Intentar continuar/enviar | Error inline y resumen; no shake ni flash | Foco resumen, link a campo; input permanece | Igual |
| M56-06 archivo → validación | Upload real | Progreso bytes si disponible; luego texto Validando | Rechazo no anima éxito; retry sólo archivo | Indicador estático equivalente |
| M56-07 revisar → enviando | Click explícito | Botón conserva anchura/posición, label Enviando; aria-busy de región | No doble submit; navegación no se bloquea por un tween | Mismo estado |
| M56-08 enviando → comprobando | Resultado incierto | Mensaje persistente cambia una vez; sin cuenta atrás | Espera lookup real; no success por timeout local | Mismo estado |
| M56-09 enviando/comprobando → recibido | Resultado durable | Navegar a detalle, título/contexto estables; acuse textual | Foco al encabezado; no confetti ni pulse infinito | Igual confirmación |
| M56-10 envío → rechazo definitivo | Error sin efecto confirmado | Resumen accesible, valores conservados | Volver a editar/revisar según error; no reset del form | Igual |
| M56-11 respuesta → conflicto | expectedVersion obsoleto | Mensaje y comparación autorizada; sin animar cambio de valores | Conservar aporte y pedir conciliación; no replay | Igual |
| M56-12 dirty → salir | Intento de abandonar | Dialog del sistema; foco en Seguir editando | Escape/click-away conserva; descarte sólo explícito | Dialog estático funcional |
| M56-13 detalle → nueva actividad | Refresh confirmado | Añadir evento del reader con label temporal | No scroll al final ni apropiación de foco en background | Igual |
| M56-14 permitido → revocado | Policy nueva | Retirar contenido inmediatamente, cancelar efectos | No animación de salida que prolongue exposición privada | Igual, inmediato |

## Coreografía de envío

1. La intención explícita congela el payload del intento y deshabilita repetición. El estado pending se
   anuncia inmediatamente, aunque no haya motor de motion cargado.
2. El texto de revisión sigue disponible; no se blanquea la hoja ni se reemplaza por un spinner gigante.
3. No animar pasos “Recibida / Aceptada / En producción” en sucesión: todavía no ocurrieron.
4. Respuesta durable conduce al detalle, o respuesta incierta conduce a reconciliación del mismo intento.
5. La región de acuse conserva referencia y siguiente paso; el cambio de ruta no vuelve a enviar.
6. El historial se lee del backend. No fabricar una fila de actividad sólo para completar la animación.

## Coreografía de errores y corrección

- Los errores aparecen a opacidad completa y contraste suficiente; icono y texto, sin depender del color.
- El resumen es foco programático después de un intento inválido. Abrir grupo antes de enfocar su campo.
- Al corregir, retirar error con el criterio de validación definido, sin colapsar el espacio bajo el cursor
  mientras se está escribiendo. El form puede crecer verticalmente; no mantener alturas rígidas para ocultarlo.
- Un error nuevo de background no mueve foco ni abre un dialog mientras el usuario edita otro campo.
- Error de adjunto se ubica en su fila. No sacudir toda la lista ni eliminar archivos correctos.
- Conflicto ofrece contexto y aporte conservado; comparar no implica merge automático ni envío al terminar motion.

## Coreografía móvil

El keyboard es una transición del sistema operativo, no un motivo para animar el formulario entero.
Footer en flujo; ninguna barra se desliza por encima del campo/teclado. Cuando se enfoca un error bajo el
fold, usar scroll mínimo necesario y respetar reduced. Labels, fecha y CTA mantienen tamaño legible.
Cambiar orientación o ancho no resetea etapa, inputs, upload ni intención idempotente.
El shell reordena por contenedor; no anidar view transitions en cada fieldset.

## Layout ownership, cleanup e interrupción

- Un owner de composición por página, `instanceId` estable; evitar colisión de nombres entre formulario y detalle.
- La animación nunca controla submitting, dirty, validity, autorización o expectedVersion.
- Unmount cancela efectos visuales y lecturas obsoletas. Cancelar animación no cancela por sí solo un command
  ya aceptado; el flow de reconciliación sigue siendo necesario.
- Acciones repetidas de disclosure son interruptibles; el submit es no repetible por su estado de operación,
  no por un lock temporal del componente animado.
- No setTimeout para avanzar a éxito, borrar campos, reintentar o mandar avisos.
- Si falla una transición, renderizar estado lógico final; nunca dejar el formulario invisible o no enfocable.

## Reduced-motion, foco y anuncios

| Prueba | Resultado |
|---|---|
| Reduce antes de abrir | Mismo form, ayudas, feedback y acuse, sin movimiento espacial |
| Reduce durante expansión | Llegar al expanded actual, cancelar tween, conservar foco |
| Teclado en review | Editar enfoca campo correcto; submit no cambia de posición |
| Lector durante pending | Un anuncio; accessible name del botón sigue expresando acción/estado |
| Conflicto/error | Resumen persistente y enlaces; no sólo toast |
| JS de motion ausente | Inputs/links/confirmaciones funcionan con comportamiento estándar |

No esconder el estado por desactivar spinner. Sin animación no significa sin feedback.
Texto mantiene AA durante todos los frames; no usar opacity de parent que reduzca contraste de error/acuse.

## Constraints

No count-up, barra productiva de porcentaje, spinner en cada paso, confetti automático, morph de campos
que mueve el caret, slide de ruta global ni animación de “entrega” para el acuse. Cualquier movimiento
nuevo requiere causalidad, dueño y fallback aquí antes de implementarse; no nuevas curves/durations locales.
No importar GSAP/framer-motion directo en vistas ni duplicar transición de MUI dentro de una animación de página.

## GVC evidence

Escenario propuesto TASK-1856; cubrir M56-01..14 con normal/reduce, 1440×900 y 390×844.
Además de imágenes finales: secuencia temporal de error, pending, timeout, confirmación y conflicto; medir
foco/caret, accessible name, scroll y ausencia de doble submit. Repetir interacción durante transición.

El caso de respuesta perdida debe demostrar recurso único por reader/ledger del owner; el movimiento de
un check no demuestra persistencia. El caso de salida dirty debe probar Escape y click-away, no sólo
que el dialog existe. El caso de teclado móvil debe acreditar que ningún control cubre el error/campo.
No puntuar hasta revisar capturas reales; la calidad de motion se juzga por claridad, continuidad y estabilidad.
