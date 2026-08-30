# TASK-1799 — Landing Content Marketing & Content Ops — Flow Contract

## Meta

- Task: `TASK-1799`
- Actor: operador de Marketing; CMO como aprobador
- Primary outcome: solicitud/reunión cualificada sobre la operación de contenidos
- Entry points: búsqueda orgánica, navegación de Servicios, referrals, links desde spokes/editorial
- Exit points: captura/reunión, spoke relevante, regreso posterior o salida informada

## Flow map

```text
[Llegada]
   ↓
[Reconocimiento: partner + Content Marketing]
   ├─ no-fit → [spoke/FAQ/salida informada]
   ↓
[Comprensión: sistema de una idea]
   ↓
[Confianza: Hub + review + CMS + responsabilidades]
   ├─ explora formato → [derivado seleccionado] ─┐
   ├─ explora modo ───→ [RACI seleccionado] ─────┤
   └─────────────────────────────────────────────┘
   ↓
[Justificación: business case para CMO]
   ↓
[CTA primario]
   ├─ formulario → validate → submit → success / recovery
   └─ scheduler  → available → slot → booking / recovery
```

La página no fuerza una secuencia. El usuario puede saltar por anclas, usar búsqueda interna del
navegador o llegar directo a una sección sin perder contexto.

## Conversion progression

| Stage | Pregunta del operador | Región que responde | Signal |
|---|---|---|---|
| Recognition | ¿Esto es lo que busco? | hero | CTA view / bounce cualitativo |
| Fit | ¿Trabajan como necesito? | problema + modos | mode exploration |
| Understanding | ¿Qué hacen realmente? | sistema + atomización | system depth |
| Trust | ¿Puedo auditar el día a día? | Hub + review + CMS | proof engagement |
| Justification | ¿Cómo lo defiendo al CMO? | business case | internal-case view/share intent |
| Action | ¿Cuál es el siguiente paso? | conversion | accepted form / qualified meeting |

La North Star es reunión cualificada originada o asistida. Scroll depth no sustituye calidad comercial.

## Primary CTA flow

1. Activación preserva source/surface ID y consentimiento según contrato vigente.
2. Si abre formulario in-page, foco va al heading/primer campo por contrato del host.
3. Campos mínimos: nombre, email laboral, empresa, desafío; modo opcional.
4. Validación no borra valores ni anuncia errores sólo por color.
5. Submit pending impide duplicado y comunica progreso.
6. Success sólo aparece después de aceptación real; describe siguiente paso sin promesa de tiempo falsa.
7. Error ofrece retry/recovery y conserva campos permitidos.
8. Si el flujo continúa a agenda, usa el scheduler canónico; nunca una URL HubSpot expuesta como fallback.

## Secondary exploration flow

- `Mira cómo trabajamos` navega a `content-system-stage` con offset correcto bajo header.
- La navegación no reproduce animaciones ya pasadas de forma obligatoria.
- En reduced motion es un salto/scroll nativo.
- Un CTA contextual después del sistema devuelve a conversión sin cambiar label.

## Derivative selector flow

- Default muestra overview y un formato seleccionado.
- Click, tap, Enter o Space seleccionan un formato.
- Cambia preview + explicación de adaptación; no cambia la idea madre.
- Flechas sólo si se implementa tabs conforme al patrón; Tab sale del control.
- El estado seleccionado se expresa en texto/icono/contraste, no sólo color.
- Sin JS, todos los formatos quedan como lista legible.

## Operating-mode flow

- Overview primero: los tres modos y su diferencia en publicación/distribución.
- Selección resalta una columna y actualiza un resumen textual; la matriz completa permanece accesible.
- El CTA puede transportar el modo como contexto opcional, nunca como dato oculto indispensable.
- Ningún modo se presenta como plan/precio si pricing y scope no están definidos.

## State and recovery

| State | User sees | Recovery / invariant |
|---|---|---|
| JS unavailable | narrativa estática completa | CTA y links funcionan |
| reduced motion | capítulos finales sin pinning | mismo orden y significado |
| form invalid | errores por campo + summary | foco primer error; valores preservados |
| submit pending | progreso no ambiguo | un submit; no navegar fuera |
| submit error | error humano y retry | no success optimista |
| scheduler loading | host canónico | live region única |
| scheduler unavailable | recovery nativo | cero provider leak |
| booking complete | confirmación real | foco/next step verificable |
| proof absent | demo conceptual rotulada | no caso/cliente inventado |

## Internal handoff path

El bloque para el CMO debe poder leerse o compartirse sin interacción especial. Resume:

- problema operativo actual;
- sistema propuesto;
- qué hace Efeonce y qué conserva el cliente;
- outcomes cualitativos verificables;
- modo recomendado a discutir;
- próximo paso de bajo compromiso.

No se genera PDF ni deck en esta task. Si la medición demuestra uso, puede abrirse un follow-up.

## Boundaries

- No hay login, Content Hub real, upload ni comentarios live.
- No se administra RRSS desde esta landing.
- No se captura brief de procurement antes de una conversación.
- No se crea un segundo formulario/scheduler ni routing CRM.
- Los spokes mantienen su propia conversión y canonical.
- Analytics respeta consentimiento; no fingerprinting ni PII en event payloads.

## GVC Scenario Plan

- Hero CTA por teclado y click.
- Secondary anchor con focus/offset correctos.
- Selector de derivados por teclado/touch y estado accesible.
- Selector de modos y lectura completa a 390px.
- Form empty-submit, invalid, pending, error controlado y success sandbox si el host lo permite.
- Scheduler recovery y focus restore si forma parte del flujo elegido.
- JS-off y reduced-motion con conversión alcanzable.
- Back/forward no deja overlays, focus ni selection en estado imposible.

## Design Decision Log

- El flow es exploratorio y no lineal: la narrativa recomienda orden, pero no bloquea deep links.
- Se conserva un único objetivo primario y se usa el sistema como secondary exploration.
- Formulario y scheduler son hosts canónicos; la landing no posee su state machine.
- Los selectores de derivados y modos enriquecen comprensión, pero su información existe sin JS.
- El business case es contenido HTML compartible; no se crea PDF ni gate de email.
