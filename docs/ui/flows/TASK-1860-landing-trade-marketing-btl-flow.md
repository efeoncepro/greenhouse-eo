# TASK-1860 — Landing Trade Marketing & BTL — Flow Contract

## Meta

- Status: `proposed`
- Owner task: `TASK-1860`
- Surface: `/servicios/trade-marketing/` (working route)
- Flow type: `multi-surface` — landing → brief inline o scheduler nativo → confirmación → calificación comercial.
- **Program master flow:** [`EPIC-023 Growth CTA & Popup Engine — Master UI Flow`](EPIC-023-growth-cta-popup-UI-FLOW.md).
  Esta landing es una instancia del nodo **host WordPress público** de ese flujo: consume `<greenhouse-cta>` con
  `open_meeting_scheduler` y `<greenhouse-form>` sin rieles paralelos. Sus reglas de coherencia aplican tal cual:
  el CTA nunca duplica el form, la política no cruza al navegador y la verdad de conversión es el ledger de Growth
  Forms.
- Wireframe: [`TASK-1860-landing-trade-marketing-btl.md`](../wireframes/TASK-1860-landing-trade-marketing-btl.md)

## Actores y superficies

| Actor | Superficie | Qué hace |
|---|---|---|
| Visitante | Landing en `efeoncepro.com` | Lee, compara, decide |
| Visitante | Renderer `<greenhouse-form>` montado en la landing | Completa el brief |
| Visitante | Scheduler nativo abierto por Growth CTA | Agenda la reunión |
| Greenhouse | Growth Forms · Growth CTA · Growth Meetings | Acepta el envío, arbitra el CTA, confirma la reserva |
| Commercial | Oportunidad calificada | Recibe contexto: categoría, canal, necesidad, cobertura |

## Puntos de entrada

| Entrada | Llegada | Primer contacto esperado |
|---|---|---|
| Orgánico, término cabeza | `/servicios/trade-marketing/` | Hero → cápsula de definición |
| Orgánico, modificador BTL o sub-intención | Misma URL | Hero → grupo BTL o servicio correspondiente |
| Motor de respuesta IA | Misma URL, a veces con fragmento | Cápsula citada → hero |
| Menú `Crecimiento Multicanal` | Misma URL | Hero |
| Hub `/servicios/` | Misma URL | Hero |
| Enlace de prospección con radiografía | URL con UTMs de campaña | Hero → reunión |
| Retorno | Misma URL | Directo a `#conversion` vía dock |

## Journeys

### J1 — Intención alta: agendar

1. Llega y lee el hero.
2. Activa `Agenda una reunión` en el hero, la conversión o el dock.
3. Growth CTA ejecuta `open_meeting_scheduler`; se abre el diálogo nativo sobre `fhsf-efeonce-lead-gen-web` /
   `discovery`.
4. Elige horario y confirma dentro del scheduler.
5. La reserva se confirma server-side; la landing no simula la confirmación.

### J2 — Intención media: brief

1. Lee hasta posición, ciclo o servicios.
2. Activa `Cuéntanos tu canal` desde el hero, trade, BTL o dock.
3. La página hace scroll a `#conversion` y el foco pasa al primer campo del brief.
4. Completa categoría, canal, necesidad y, si quiere, cobertura y contexto.
5. Envía; el renderer muestra el estado y, al aceptar, la success card gobernada.

### J3 — Informativo que se convierte

1. Llega por "qué es el trade marketing" y lee la cápsula.
2. Sigue a problema y posición porque la definición le resultó útil.
3. Entra a J2 o sale sin fricción. Una salida desde aquí no es un fracaso: la cápsula cumple su trabajo de
   citabilidad.

### J4 — Búsqueda de empleo

1. Llega por el término cabeza buscando trabajo.
2. Lee la línea de desvío bajo la definición y sale a la página de vacantes.
3. No llega al formulario. **Condicional:** si no existe página de vacantes, la línea no se renderiza.

### J5 — Sin JavaScript o con fallo del renderer

1. El contenido completo se lee desde el HTML servido.
2. Los CTAs de reunión enlazan a `/contacto/`.
3. Si el renderer no monta, la conversión muestra el estado `partial` con la reunión como alternativa.

## Flow map

```text
[entrada] → R1 hero ──────────────┬── Agenda una reunión ──► [scheduler nativo] ──► [reserva confirmada server-side]
                                  │
                                  └── Cuéntanos tu canal ──► #conversion (foco al 1er campo)
   │                                                              │
   ▼                                                              ▼
R2 definición ── desvío de empleo ──► [vacantes]          [brief] ── submit ──► success card
   │                                                              │                  │
   ▼                                                              ├── error ──► corregir y reintentar
R3 → R4 → R5 → R6 → R7 → R8 → R9 → R10 → R11 → R12 → R13          ├── denied ──► correo de trabajo / reunión
   ▲                                                              └── partial ──► reunión / contacto
   └──────────── dock visible entre R2 y R13 ───────────────────────────────────────────┘
```

## Transitions

| Desde | Evento | Hacia | Foco | URL / hash | Medición |
|---|---|---|---|---|---|
| Hero, conversión o dock | Activar `Agenda una reunión` | Diálogo del scheduler | Primer control del diálogo | Sin cambio | `gh_cta_clicked` |
| Diálogo del scheduler | Cerrar | Landing | Vuelve al CTA que lo abrió | Sin cambio | — |
| Diálogo del scheduler | Reserva confirmada | Confirmación del scheduler | Mensaje de confirmación | Sin cambio | Evento server-confirmed del scheduler |
| Hero, trade, BTL o dock | Activar `Cuéntanos tu canal` | `#conversion` | Primer campo del brief | `#conversion` | `gh_cta_clicked` |
| Brief | Primer input | Brief en edición | Campo actual | Sin cambio | `gh_form_started` |
| Brief | Submit con errores | Brief con resumen | Resumen de errores | Sin cambio | `gh_form_field_validation_failed` |
| Brief | Submit aceptado | Success card | Título de la success card | Sin cambio | `gh_form_submission_accepted` → `generate_lead` |
| Punto de lectura | Enter o Espacio | Panel del punto | Se mantiene en el botón | Sin cambio | — |
| Panel del punto | Escape | Punto cerrado | Botón del punto | Sin cambio | — |
| FAQ | Abrir `<details>` | Respuesta visible | Se mantiene en el summary | Sin cambio | — |
| Definición | Desvío de empleo | Página de vacantes | — | Navegación | — |

## Deep links y anchors

| Anchor | Región | Uso |
|---|---|---|
| `#que-es` | Definición | Citas de motores de respuesta y enlaces editoriales |
| `#posicion` | Posición | Seguimiento de prospección |
| `#gondola` | Firma | Envío en correos de prospección |
| `#trade-marketing` | Trade | Enlace desde el hub y el menú |
| `#btl` | BTL | Enlace desde contenidos de BTL |
| `#digital` | Conexión digital | Enlaces desde Performance y SEO/AEO |
| `#preguntas` | FAQ | Schema `FAQPage` y soporte comercial |
| `#conversion` | Conversión | CTAs secundarios y dock |

Con reduced motion, el salto a un anchor es instantáneo.

## State and recovery

| Estado | Requisito | Recuperación |
|---|---|---|
| Ready | CTA dual visible en el fold y form montado | — |
| Form loading | Estado de carga del renderer, nunca bloque vacío | Pasa a partial si no monta |
| Form empty submit | Resumen enfocable y errores por campo | Corregir; valores conservados |
| Form error | Mensaje honesto | Reintento sin recargar |
| Form denied | Correo no corporativo o verificación fallida | Correo de trabajo o reunión |
| Form partial | El renderer no montó | Reunión en el mismo bloque y enlace a `/contacto/` |
| Success | Success card gobernada | Sin promesa de plazo; reunión opcional |
| Meeting unavailable | Recuperación nativa del scheduler | Navegación de mes y "Reintentar"; sin enlaces del proveedor |
| No JS | Contenido completo servido | Reunión → `/contacto/` |
| Reduced motion | Mismo contenido y estados | Saltos instantáneos |

## Boundaries

- La landing no crea negocio ni copia la lógica de Growth Forms, Growth CTA ni Meetings.
- El navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos allowlisted.
- No se envían al dataLayer nombre, correo, empresa, contexto, categoría con marca, cobertura ni el brief.
- No se crea un booking ni un lead real durante QA sin aprobación explícita.
- Los micro-eventos se registran sólo después de actualizar el Tracking Plan.

## GVC Scenario Plan

- Scenario: `public-servicios-trade-marketing`, Quality profile: `premium`.
- Viewports: 1536, 1440, 890 y 390.
- Recorridos a capturar: clic en ambos CTAs del hero; scroll y foco en `#conversion`; submit vacío con resumen;
  apertura y selección de los selects premium; diálogo del scheduler abierto y cerrado con devolución de foco;
  punto de lectura abierto y cerrado con Escape; FAQ abierto; dock visible entre R2 y R13 y oculto en R13.
- Aserciones: foco en el primer campo tras el CTA secundario; foco devuelto al CTA tras cerrar el scheduler; dock
  oculto sin foco; cero reservas y cero envíos reales; `scrollWidth === clientWidth`; consola sin errores propios.

## Design Decision Log

| Decisión | Alternativa | Por qué |
|---|---|---|
| Nodo del flujo maestro de EPIC-023 | Crear un flujo maestro nuevo para EPIC-019 | La landing consume exactamente los contratos del nodo host WordPress público; un flujo paralelo duplicaría reglas |
| CTA secundario lleva al form inline | Abrir el form en un modal | El inline conserva contexto, es indexable y no suma una capa de foco |
| Scheduler en diálogo nativo | Enlace al proveedor · iframe | Contrato vigente del sitio: sin enlaces ni copy del proveedor |
| Fallback a `/contacto/` sin JS | Sin fallback | El CTA primario no puede quedar muerto |
| Desvío de empleo condicional | Mostrarlo siempre | Un enlace a una página inexistente sería un enlace roto |
| Foco al primer campo tras el CTA | Sólo scroll | Reduce un paso y es la expectativa del teclado |
