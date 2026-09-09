# TASK-1854 — Motion: orientación y continuidad del servicio

Contrato detallado 2026-09-09. Diseño, sin animaciones implementadas ni evidencia GVC. UI ready: no.
Wireframe y flow del mismo TASK son dependencias: la coreografía no altera sus estados ni permisos.

## Motion brief

El movimiento debe ayudar a reconocer qué seleccioné, qué cambió y dónde permanece el contexto.
La pieza central es la continuidad de una hoja de servicio: controles estables, cambios de datos honestos,
disclosure de evidencia y navegación a un objeto reconocible. No hay entrada de marketing, parallax,
count-up de métricas, scroll-jacking ni celebraciones por abrir una página.

Prioridad: información visible → foco correcto → feedback inmediato → transición opcional. Sin JS o sin
soporte de transiciones, la página conserva contenido y navegación. Ningún request espera la animación.

## Owners y tokens

| Responsabilidad | Owner real | Contrato de consumo |
|---|---|---|
| Layout/size class | `CompositionShell`, vía `SurfaceRecipe` | `fluidity='rich'` lo declara el recipe; no segunda animación del grid en el consumer |
| Hover/focus/selección | GreenhouseButton, links y controls | CSS Tier 1 del componente; no handlers de mouse que inventan easing |
| Disclosure | GreenhouseDisclosureTrigger y disclosure del sistema | Trigger y contenido comparten expanded; no dos timelines sobre el mismo nodo |
| Carga | Texto de estado estable + Skeleton decorativo MUI | Sin fade del copy ni card adicional; reduced desactiva animación del skeleton |
| Menús/selector | Floating Surface/control canónico | Microinteracción de su primitive, sin GSAP de página |
| Valores de motion | `src/components/greenhouse/motion/core/tokens.ts` | `motionCss.duration` / `motionCss.ease` o adaptador canónico |

Tokens permitidos por intención: `short` para feedback, `standard` para disclosure, `medium` para
reacomodo del shell cuando su contrato lo resuelva; `emphasized` para entrada, `emphasizedAccelerate`
para salida y `standard` para cambio discreto. Los consumers no copian sus ms ni curvas.
Esto describe intención; si la primitive no expone esos parámetros, gobierna su controller existente.
Un gap requiere extensión en la primitive, nunca prop inexistente ni CSS local que compita con ella.

## State transitions

| ID / transición | Disparador y propósito | Movimiento / feedback | Final e interrupción | Reduced motion |
|---|---|---|---|---|
| M54-01 idle → focus/hover | Interacción sobre botón/fila | Feedback Tier 1 `short`; foco inmediato, sin mover hit area | Blur/pointer leave revierte; activación no espera salida | Mismo foco/selección estáticos |
| M54-02 elegir servicio | Activación explícita de fila | Navegación estándar; selección legible antes de cambio si el runtime lo permite | Nuevo h1 recibe foco; no enlazar animación con fetch | Ruta y foco idénticos |
| M54-03 período → loading | Cambio de alcance | Header estable, aria-busy sólo región; datos viejos etiquetados o loading | Última clave de request gana; no cola de cambios | Mismo estado sin transición |
| M54-04 loading → datos | Reader confirma clave activa | Sustitución atómica de contenido; shell puede resolver reflow | Valores finales aparecen directamente; no interpolar números | Sustitución instantánea |
| M54-05 fuente cerrada → abierta | Pedir explicación | Disclosure canónico, `standard` como intención; icono acompaña expansión | Repetir invierte desde estado actual; no remount de la hoja | Expandir/contraer inmediatamente |
| M54-06 tab → tab | Navegación entre paneles del mismo servicio | Indicador del control canónico; panel anterior deja de ser interactivo | No fade de ambos paneles ni doble contenido para lector | Panel y aria-selected instantáneos |
| M54-07 partial → recuperado | Retry exitoso de una sección | Retirar mensaje y mostrar datos reales; sin bounce ni flash verde | No mover foco si retry ya terminó y usuario avanzó | Igual resultado y anuncio |
| M54-08 permiso → denegación | Revalidación retira acceso | Retirar contenido privado inmediatamente, sin animación de salida | Cancelar fetch/transiciones/caché del scope | Igual, inmediato |
| M54-09 desktop → compact | Cambio de contenedor | Reflow gobernado por shell; filas adaptan contenido | No doble owner de width/height; preservar selección | Reflow sin tween |
| M54-10 objeto → Back | Historia del navegador | Navegación normal y restauración; sin transición global inventada | Recuperar servicio, período, scroll/fila si existe | Igual comportamiento |

## Coreografía por momento

### Primer render

1. Shell/header disponibles primero sólo si no filtran autoridad no resuelta.
2. Loading ocupa la región esperada. No revelar datos protegidos bajo un overlay de “Comprobando acceso”.
3. Reader autorizado entrega contenido. No stagger de secciones que obligue a esperar para leer la acción.
4. H1 y primer CTA no aparecen con opacity parcial. Imágenes tardías reservan proporción cuando se conoce,
   no animan el alto de toda la página. El texto se renderiza aunque falle una miniatura.

### Cambio rápido de alcance

El selector responde inmediatamente. La red posee la latencia; motion no simula progreso. Si llegan
períodos A, C y B fuera de orden, sólo C (última intención) puede asentarse. El contenido saliente no
permanece interactivo ni visible bajo el título de otro período. Cancelar no deja skeleton permanente.

### Profundización en evidencia

Abrir Fuente y metodología amplía la explicación junto a la cifra. El trigger mantiene ubicación y
accessible name estable; expanded comunica estado. No usar modal para leer dos líneas ni sidecar que
reduzca la hoja hasta volver ilegibles los datos. Si la evidencia futura necesita un panel real, adopta
AdaptiveSidecar como una decisión adicional documentada, sin drawer artesanal en esta task.

## Layout ownership e interrupción

- Un único `instanceId` estable de shell por superficie; no dos nodos con view-transition-name idéntico.
- No animar altura del contenedor con CSS y del hijo con otro motor; el shell posee su geometría.
- No transiciones de ruta compartidas personalizadas: URLs/carga/foco no dependen de View Transitions.
- En unmount, navegación, pérdida de permiso o cambio de scope, cancelar/limpiar efectos por owner.
- Si la persona pulsa de nuevo durante expansión, invertir desde estado actual; no bloquear hasta completar.
- No usar timers de animación como timeout de red, límite de retries ni prueba de que se guardó un command.
- Texto de fuente/error/estado queda opaco y en contraste AA durante todos los frames; no blur de la evidencia.

## Reduced-motion y accesibilidad

| Preferencia / fallo | Resultado exigido |
|---|---|
| `prefers-reduced-motion: reduce` desde inicio | Sin interpolación espacial, skeleton/loader según fallback estático canónico |
| Preferencia cambia durante transición | Cancelar y llevar al estado lógico actual; no replay de entrada |
| Navegación por teclado | Foco visible siempre; no esperar animationend para enfocar |
| Lector de pantalla | Un anuncio de carga/resultado por región; no lectura de cada número actualizado |
| JS/transición no disponible | Contenido final accesible y links operativos; no elementos escondidos por estilos iniciales |

## Constraints

Sin números que ascienden desde cero, deltas que parpadean, shimmer de éxito, iconos que pulsan para fingir
urgencia ni entrada GSAP en cada scroll. `Motion` cinemático no es necesario en esta experiencia.
No añadir imports gsap/framer-motion/floating-ui directos en views para suplir una primitive.
No hover que cambie la anchura de fila o haga saltar CTA. No scroll automático durante refresh de background.
La preferencia reducida no elimina feedback, errores, selección, foco ni fecha de los datos.

## GVC evidence

Escenario propuesto de TASK-1854: registrar M54-01..10 con estado inicial, interacción, estado intermedio
cuando importe y estado final. Capturas estáticas no prueban interrupción; añadir evidencia temporal/DOM
para doble cambio de período, disclosure rápido, reflow y revocación. Medir ausencia de pérdida de foco,
contenido duplicado y scroll horizontal durante la transición, no sólo al final.

Comparar normal/reduced en 1440×900 y 390×844. Revisar contraste de texto sobre fondo compuesto en frames
intermedios. Registrar navegador, preferencia, fixture y fallbacks utilizados en el dossier real.
El score de motion requiere causalidad, estabilidad e igualdad funcional; no puntuar por cantidad de animaciones.
