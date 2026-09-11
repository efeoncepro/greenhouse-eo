# TASK-1865 — Landing Performance Marketing — Flow Contract

## Meta

- Status: `proposed`
- Owner task: `TASK-1865`
- Surface: `/servicios/performance-marketing/` (working route), que absorbe a la página legacy `242862`
  (`/servicio-gestion-campanas-publicitarias/`).
- Flow type: `multi-surface` — landing → brief inline o scheduler nativo → confirmación → calificación comercial; más la
  migración de la URL legacy.
- **Program master flow:** [`EPIC-023 Growth CTA & Popup Engine — Master UI Flow`](EPIC-023-growth-cta-popup-UI-FLOW.md).
  Esta landing es una instancia del nodo **host WordPress público** de ese flujo: consume `<greenhouse-cta>` con
  `open_meeting_scheduler` y `<greenhouse-form>` sin rieles paralelos. Sus reglas de coherencia aplican tal cual: el CTA
  nunca duplica el form, la política no cruza al navegador y la verdad de conversión es el ledger de Growth Forms.
- Wireframe: [`TASK-1865-landing-performance-marketing.md`](../wireframes/TASK-1865-landing-performance-marketing.md)

## Actores y superficies

| Actor | Superficie | Qué hace |
|---|---|---|
| Visitante | Landing en `efeoncepro.com` | Lee, prueba la firma, compara, decide |
| Visitante con enlace antiguo | URL legacy `/servicio-gestion-campanas-publicitarias/` | Llega por un marcador, un enlace externo o un resultado de búsqueda antiguo |
| Visitante | Renderer `<greenhouse-form>` montado en la landing | Completa el brief |
| Visitante | Scheduler nativo abierto por Growth CTA | Agenda la reunión |
| Greenhouse | Growth Forms · Growth CTA · Growth Meetings | Acepta el envío, arbitra el CTA, confirma la reserva |
| Commercial | Oportunidad calificada | Recibe contexto: tipo de negocio, canal, rango de inversión, mercados, necesidad, CRM |
| WordPress / Yoast | Redirect 301 y menú | Lleva la URL legacy a la nueva y apunta el menú |

## Puntos de entrada

| Entrada | Llegada | Primer contacto esperado |
|---|---|---|
| Orgánico, "agencia de performance marketing" | `/servicios/performance-marketing/` | Hero |
| Orgánico, "qué es performance marketing" | Misma URL, a veces con `#que-es` | Cápsula de definición → hero |
| Motor de respuesta IA | Misma URL con fragmento | Cápsula citada o respuesta del FAQ |
| URL legacy | 301 hacia la nueva URL | Hero |
| Menú `Performance Marketing` | Misma URL | Hero |
| Hub `/servicios/` | Misma URL | Hero |
| Enlaces desde otras landings (Trade Marketing `#digital`, Influencer Marketing, SEO, AEO) | Misma URL, a veces con `#canales` | Canales o hero |
| Campaña pagada propia | URL con UTMs | Hero → reunión o diagnóstico |
| Retorno | Misma URL | Directo a `#conversion` vía dock |

## Journeys

### J1 — Intención alta: agendar

1. Llega y lee el hero.
2. Activa `Agenda una reunión` en el hero, la conversión o el dock.
3. Growth CTA ejecuta `open_meeting_scheduler`; se abre el diálogo nativo sobre `fhsf-efeonce-lead-gen-web` /
   `discovery`.
4. Elige horario y confirma dentro del scheduler.
5. La reserva se confirma server-side; la landing no simula la confirmación.

### J2 — Intención media: diagnóstico

1. Lee hasta la firma, las dos formas de trabajar o los canales.
2. Activa `Pide un diagnóstico` desde el hero, 2026, la escalera o el dock.
3. La página hace scroll a `#conversion` y el foco pasa al primer campo del brief.
4. Completa tipo de negocio, canal, rango de inversión, mercados, necesidad y, si quiere, CRM y contexto.
5. Envía; el renderer muestra el estado y, al aceptar, la success card gobernada.

### J3 — B2B que busca pipeline

1. Llega por el menú, por LinkedIn Ads o por un enlace desde la landing de HubSpot.
2. Lee la columna Empresas B2B de R6 y la nota B2B de la firma.
3. Entra a J2; en el brief elige `A empresas (B2B)` y su CRM.
4. Commercial recibe el brief con el motion B identificado.

### J4 — Informativo que se convierte

1. Llega por "qué es el performance marketing" y lee la cápsula.
2. Sigue al problema y a la firma porque la definición le resultó útil.
3. Entra a J2 o sale sin fricción. Una salida desde aquí no es un fracaso: la cápsula cumple su trabajo de citabilidad.

### J5 — Visitante con la URL legacy

1. Abre `/servicio-gestion-campanas-publicitarias/` desde un marcador, un enlace externo o un resultado antiguo.
2. Yoast responde 301 a `/servicios/performance-marketing/`. Un fragmento de la URL, si existe, lo conserva el navegador.
3. Llega al hero de la página nueva. Los anchors de la legacy no tienen equivalente garantizado; no se mapean.

### J6 — Sin JavaScript o con fallo del renderer

1. El contenido completo se lee desde el HTML servido, incluidas las dos listas de la firma.
2. Los CTAs de reunión enlazan a `/contacto/`.
3. Si el renderer no monta, la conversión muestra el estado `partial` con la reunión como alternativa.

## Flow map

```text
[legacy URL] ──301──┐
                    ▼
[entrada] → R1 hero ──────────────┬── Agenda una reunión ──► [scheduler nativo] ──► [reserva confirmada server-side]
                                  │
                                  └── Pide un diagnóstico ──► #conversion (foco al 1er campo)
   │                                                                │
   ▼                                                                ▼
R2 definición → R3 → R4 2026 ─┐                              [brief] ── submit ──► success card
                              │                                     │                  │
R5 firma [Clics ⇄ Ventas]     │                                     ├── error ──► corregir y reintentar
   │                          │                                     ├── denied ──► correo de trabajo / reunión
   ▼                          │                                     └── partial ──► reunión / contacto
R6 → R7 → R8 → R9 ────────────┴── Pide un diagnóstico ──► #conversion
   │
   ▼
R10 → R11 → R12 → R13 → R14
   ▲
   └──────────── dock visible entre R2 y R14 ───────────────────────────────────────────┘
```

## Transitions

| Desde | Evento | Hacia | Foco | URL / hash | Medición |
|---|---|---|---|---|---|
| URL legacy | Petición HTTP | Página nueva | Inicio de la página | 301 a `/servicios/performance-marketing/` | Page view de la nueva URL |
| Hero, conversión o dock | Activar `Agenda una reunión` | Diálogo del scheduler | Primer control del diálogo | Sin cambio | `gh_cta_clicked` |
| Diálogo del scheduler | Cerrar | Landing | Vuelve al CTA que lo abrió | Sin cambio | — |
| Diálogo del scheduler | Reserva confirmada | Confirmación del scheduler | Mensaje de confirmación | Sin cambio | Evento server-confirmed del scheduler |
| Hero, 2026, escalera o dock | Activar `Pide un diagnóstico` | `#conversion` | Primer campo del brief | `#conversion` | `gh_cta_clicked` |
| Control de la firma | Flecha, Espacio o clic | Estado `Clics` o `Ventas` | Se mantiene en el control | Sin cambio | — (sin evento en V1) |
| Brief | Primer input | Brief en edición | Campo actual | Sin cambio | `gh_form_started` |
| Brief | Submit con errores | Brief con resumen | Resumen de errores | Sin cambio | `gh_form_field_validation_failed` |
| Brief | Submit aceptado | Success card | Título de la success card | Sin cambio | `gh_form_submission_accepted` → `generate_lead` |
| FAQ | Abrir `<details>` | Respuesta visible | Se mantiene en el summary | Sin cambio | — |
| Canales | Enlace interno | Landing hermana | — | Navegación | — |

## Deep links y anchors

| Anchor | Región | Uso |
|---|---|---|
| `#que-es` | Definición | Citas de motores de respuesta y enlaces editoriales |
| `#2026` | Qué cambió en 2026 | Correos de prospección y publicaciones sobre los cambios |
| `#senal` | Firma | Envío en conversaciones comerciales |
| `#como-trabajamos` | Dos formas de trabajar | Enlace desde la landing de HubSpot para B2B |
| `#canales` | Canales | Enlaces desde Trade Marketing, Influencer Marketing, SEO y AEO |
| `#como-empezamos` | Escalera | Seguimiento comercial |
| `#posicion` | Posición | Seguimiento comercial |
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
| Firma sin JS | Dos listas lado a lado | — |
| Legacy sin redirect | La legacy sigue publicada | Antes del Slice 6 es el estado esperado; después, el gate de redirect falla y se revierte |
| No JS | Contenido completo servido | Reunión → `/contacto/` |
| Reduced motion | Mismo contenido y estados | Saltos instantáneos |

## Boundaries

- La landing no crea negocio ni copia la lógica de Growth Forms, Growth CTA ni Meetings.
- El navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos allowlisted.
- No se envían al dataLayer nombre, correo, empresa, contexto, rango de inversión, mercados, CRM ni el brief.
- No se crea un booking ni un lead real durante QA sin aprobación explícita.
- Los micro-eventos se registran sólo después de actualizar el Tracking Plan.
- El 301 se crea con la API de redirects de Yoast SEO Premium; nunca se reescribe la opción completa de redirects.

## GVC Scenario Plan

- Scenario: `public-servicios-performance-marketing`, Quality profile: `premium`.
- Viewports: 1536, 1440, 890 y 390.
- Recorridos a capturar: clic en ambos CTAs del hero; scroll y foco en `#conversion`; firma cambiada con teclado de
  `Clics` a `Ventas` y de vuelta; submit vacío con resumen; apertura y selección de los selects premium; diálogo del
  scheduler abierto y cerrado con devolución de foco; FAQ abierto; dock visible entre R2 y R14 y oculto en R14; la URL
  legacy seguida hasta la nueva.
- Aserciones: foco en el primer campo tras el CTA secundario; foco devuelto al CTA tras cerrar el scheduler; foco que se
  queda en el control de la firma; anuncio de la región live al cambiar la señal; dock oculto sin foco; cero reservas y
  cero envíos reales; 301 con `Location` hacia la URL nueva; `scrollWidth === clientWidth`; consola sin errores propios.

## Design Decision Log

| Decisión | Alternativa | Por qué |
|---|---|---|
| Nodo del flujo maestro de EPIC-023 | Crear un flujo maestro nuevo para EPIC-019 | La landing consume exactamente los contratos del nodo host WordPress público; un flujo paralelo duplicaría reglas |
| CTA secundario lleva al form inline | Abrir el form en un modal | El inline conserva contexto, es indexable y no suma una capa de foco |
| Scheduler en diálogo nativo | Enlace al proveedor · iframe | Contrato vigente del sitio: sin enlaces ni copy del proveedor |
| 301 desde la legacy | Mantener dos URLs · canonical cruzado | Una sola URL indexable para el mismo servicio; el canonical cruzado deja dos páginas vivas |
| La legacy queda `private` | Borrarla | Conserva el rollback sin mantener una segunda página pública |
| Firma sin evento de analítica en V1 | Evento por cambio de señal | No hay decisión de negocio que dependa de ese evento; se agrega con el Tracking Plan si aparece |
| Foco al primer campo tras el CTA | Sólo scroll | Reduce un paso y es la expectativa del teclado |
| Fallback a `/contacto/` sin JS | Sin fallback | El CTA primario no puede quedar muerto |
