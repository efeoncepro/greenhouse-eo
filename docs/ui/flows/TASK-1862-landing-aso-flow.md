# TASK-1862 — Landing ASO — Flow Contract

## Meta

- Status: `proposed`
- Owner task: `TASK-1862`
- Surface: `/servicios/aso/` (working route)
- Flow type: `multi-surface` — landings hermanas / envío 1:1 → landing → brief inline o scheduler nativo →
  confirmación → calificación comercial; más la máquina de fases de publicación.
- **Program master flow:** [`EPIC-023 Growth CTA & Popup Engine — Master UI Flow`](EPIC-023-growth-cta-popup-UI-FLOW.md).
  Esta landing es una instancia del nodo **host WordPress público**: consume `<greenhouse-form>` y `<greenhouse-cta>`
  con `open_meeting_scheduler`, sin rieles paralelos. Aplican sus reglas: el CTA nunca duplica el form, la política
  no cruza al navegador y la verdad de conversión es el ledger de Growth Forms.
- **Relación con EPIC-020:** las landings SEO y AEO son nodos de entrada del
  [flujo del programa AEO](EPIC-020-AEO-PROGRAM-UI-FLOW.md). Esta página **no** entra a ese flujo —el AI
  Visibility Grader no mide apps—; sólo recibe y devuelve tráfico entre spokes.
- Wireframe: [`TASK-1862-landing-aso.md`](../wireframes/TASK-1862-landing-aso.md)

## Actores y superficies

| Actor | Superficie | Qué hace |
|---|---|---|
| Visitante | Landing en `efeoncepro.com` | Lee, entiende, decide |
| Visitante | Landings hermanas SEO (`251078`) y AEO (`250265`) | Llega o vuelve por enlaces por función |
| Visitante | Renderer `<greenhouse-form>` en la landing | Pide el diagnóstico |
| Visitante | Scheduler nativo abierto por Growth CTA | Agenda la reunión |
| Greenhouse | Growth Forms · Growth CTA · Growth Meetings | Acepta el envío, arbitra el CTA, confirma la reserva |
| Commercial | Oportunidad calificada | Recibe plataforma, país, necesidad, acceso a consolas y próxima versión |
| Owner de la extensión | Estado del modelo de negocio | Autoriza el paso de fase |

## Puntos de entrada

| Entrada | Fase | Llegada | Primer contacto esperado |
|---|---|---|---|
| Envío 1:1 (Berel, prospectos) | B | URL con `utm_source=direct-outreach` | Hero → diagnóstico |
| Landing SEO · puente SEO→AEO | C | Misma URL | Hero → R4 |
| Landing AEO · FAQ 15 | C | Misma URL, a veces con `#tres-lugares` | R4 → hero |
| Menú `Visibilidad` · hub `/servicios/` | C | Misma URL | Hero |
| Motor de respuesta IA | C | Misma URL, a veces con `#que-es` | Cápsula citada → hero |
| Orgánico definicional (`que es aso`, `app store optimization`) | C | Misma URL | Cápsula → R3 |
| Retorno | B y C | Misma URL | Directo a `#diagnostico` vía CTA fijo móvil |

## Journeys

### J1 — Diagnóstico (intención principal)

1. Llega y lee el hero.
2. Activa `Pide el diagnóstico de tu app` en el hero, R6 o el CTA fijo móvil.
3. La página hace scroll a `#diagnostico` y el foco pasa al primer campo.
4. Completa nombre, correo, empresa, enlace de la app, plataformas y necesidad; opcionalmente mercado, acceso a
   consolas, próxima versión y contexto.
5. Envía; el renderer valida el enlace y el correo, y al aceptar muestra la success card gobernada.

### J2 — Reunión

1. Activa `Agenda una reunión` en el hero o en la conversión.
2. Con la surface enlazada, Growth CTA abre el diálogo nativo sobre `fhsf-efeonce-lead-gen-web` / `discovery`.
3. Elige horario y confirma; la reserva se confirma server-side.
4. Sin la surface enlazada (estado `not-promoted`), el CTA navega a `/contacto/`.

### J3 — Viene de SEO (fase C)

1. En la landing SEO lee el puente y la línea "¿Tu marca tiene app?".
2. Llega al hero; R4 le muestra la tienda como tercera superficie de lo que ya contrata o evalúa.
3. Entra a J1, o vuelve a SEO por el enlace de R4 sin perder contexto.

### J4 — Viene de AEO (fase C)

1. En la FAQ de AEO abre "¿También trabajan la visibilidad de apps?" y sigue el enlace.
2. Llega a R4 o al hero; FAQ 5 le explica qué se puede y qué no se puede medir de la IA en apps.
3. Entra a J1 o vuelve a AEO.

### J5 — Informativo que se convierte

1. Llega por "qué es el ASO" y lee la cápsula.
2. Sigue a R3 y R4 porque la definición le fue útil.
3. Entra a J1 o sale sin fricción. Una salida acá no es un fracaso: la cápsula cumple su trabajo de citabilidad.

### J6 — No es para él

1. Lee R8 y se reconoce en "No es para ti si…" (juego, app interna, poco tráfico, casi todo pagado).
2. Sale sin llenar el form, o pide reunión si el pivote (base de la ficha, CRO para paid) le hace sentido.

### J7 — Sin JavaScript o con fallo del renderer

1. Todo el contenido se lee desde el HTML servido.
2. Los CTAs de reunión enlazan a `/contacto/`.
3. Si el renderer no monta, la conversión muestra `partial` con la reunión como alternativa.

## Flow map

```text
[envío 1:1 (B)]  [SEO (C)]  [AEO (C)]  [menú/hub (C)]  [IA / orgánico (C)]
        └───────────┴──────────┴────────────┴──────────────┘
                              ▼
R1 hero ──┬── Pide el diagnóstico ──► #diagnostico (foco 1er campo) ──► [brief] ── submit ──► success card
          │                                                        ├── invalid URL ──► corregir enlace
          │                                                        ├── error ──► reintentar
          │                                                        ├── denied ──► correo de trabajo / reunión
          │                                                        └── partial ──► reunión / contacto
          └── Agenda una reunión ──► [scheduler nativo] ──► [reserva confirmada server-side]
                                  └─ not-promoted ──► /contacto/
   │
   ▼
R2 → R3 → R4 ──► /servicios/posicionamiento-seo/  ·  /aeo-2/   (salida por función, ida y vuelta)
   → R5 → R6 → R7 → R8 → R9 → R10 → R11
   ▲
   └──── CTA fijo móvil entre R2 y R11 (oculto dentro de #diagnostico) ────┘
```

## Máquina de fases de publicación

| Fase | Entra cuando | Estado WordPress | Robots / sitemap | Enlaces entrantes | Surface de Meetings |
|---|---|---|---|---|---|
| A | Hoy (`Proposed`) | Borrador o privado con preview | Sin URL pública | Ninguno | Puede no estar enlazada → CTA a `/contacto/` |
| B | Extensión `Approved for validation` + gates verdes | Publicada | `noindex, follow`; fuera de sitemap | Ninguno: ni SEO, ni AEO, ni menú, ni hub | Enlazada si Commercial la aprueba |
| C | Extensión `Commercially approved` + gates verdes + aprobación del owner | Publicada | `index, follow`; canonical; sitemap | SEO (puente), AEO (FAQ 15), menú `Visibilidad`, hub | Enlazada |

**Regla:** en fase B la página enlaza **hacia** las hermanas (R4 y FAQ), pero las hermanas no enlazan **hacia**
ella: un enlace entrante desde una página indexada la haría descubrible antes de tiempo. Retroceder de fase
revierte los enlaces en el mismo cambio.

## Transitions

| Desde | Evento | Hacia | Foco | URL / hash | Medición |
|---|---|---|---|---|---|
| Hero, R6 o CTA fijo | Activar `Pide el diagnóstico de tu app` | `#diagnostico` | Primer campo del brief | `#diagnostico` | `gh_cta_clicked` |
| Hero o conversión | Activar `Agenda una reunión` | Diálogo del scheduler | Primer control del diálogo | Sin cambio | `gh_cta_clicked` |
| Hero o conversión | Activar reunión en `not-promoted` | `/contacto/` | — | Navegación | `gh_cta_clicked` |
| Diálogo del scheduler | Cerrar | Landing | CTA que lo abrió | Sin cambio | — |
| Diálogo del scheduler | Reserva confirmada | Confirmación nativa | Mensaje de confirmación | Sin cambio | Evento server-confirmed |
| Brief | Primer input | Brief en edición | Campo actual | Sin cambio | `gh_form_started` |
| Brief | Enlace inválido | Error de campo | Campo del enlace | Sin cambio | `gh_form_field_validation_failed` |
| Brief | Submit con errores | Brief con resumen | Resumen de errores | Sin cambio | `gh_form_field_validation_failed` |
| Brief | Submit aceptado | Success card | Título de la success card | Sin cambio | `gh_form_submission_accepted` → `generate_lead` |
| R4 | Enlace "Cómo trabajamos el SEO" | Landing SEO | — | Navegación | `gh_cta_clicked` con destino |
| R4 | Enlace "Cómo trabajamos el AEO" | Landing AEO | — | Navegación | `gh_cta_clicked` con destino |
| Punto de la firma | Enter o Espacio | Panel del punto | Se mantiene en el botón | Sin cambio | — |
| Panel del punto | Escape | Punto cerrado | Botón del punto | Sin cambio | — |
| FAQ | Abrir `<details>` | Respuesta visible | Summary | Sin cambio | — |

## Deep links y anchors

| Anchor | Región | Uso |
|---|---|---|
| `#que-es` | Definición | Citas de motores de respuesta |
| `#que-cambio` | Qué cambió | Envíos 1:1 sobre la IA en tiendas |
| `#tres-lugares` | Tres lugares | Enlace desde AEO y SEO en fase C |
| `#tu-app` | Firma | Envíos de prospección |
| `#que-hacemos` | Qué hacemos | Enlaces comerciales |
| `#medicion` | Medición | Soporte comercial |
| `#limites` | Límites | Descalificación honesta |
| `#preguntas` | FAQ | `FAQPage` y soporte |
| `#diagnostico` | Conversión | CTAs primarios y CTA fijo |

Con reduced motion, el salto a un anchor es instantáneo. Las UTM se preservan hasta la conversión.

## State and recovery

| Estado | Requisito | Recuperación |
|---|---|---|
| Ready | CTAs visibles en el fold y form montado | — |
| Form loading | Estado de carga del renderer | Pasa a partial si no monta |
| Form empty submit | Resumen enfocable y errores por campo | Corregir; valores conservados |
| Form invalid URL | Error en el campo del enlace | Corregir sin perder el resto |
| Form error | Mensaje honesto | Reintento sin recargar |
| Form denied | Correo no corporativo o verificación fallida | Correo de trabajo o reunión |
| Form partial | Renderer no montó | Reunión en el mismo bloque y `/contacto/` |
| Success | Success card gobernada | Sin promesa de plazo; reunión opcional |
| Meeting unavailable | Recuperación nativa | Mes siguiente y "Reintentar" |
| Meeting not promoted | Surface sin binding | CTA a `/contacto/` |
| No JS | Contenido completo servido | Reunión → `/contacto/` |
| Reduced motion | Mismo contenido y estados | Saltos instantáneos |

## Boundaries

- La landing no crea negocio ni copia la lógica de Growth Forms, Growth CTA ni Meetings.
- El navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos allowlisted.
- No se envían al dataLayer nombre, correo, empresa, enlace de la app, contexto ni opciones del brief que
  identifiquen a la marca.
- No se crea un booking ni un lead real durante QA sin aprobación explícita.
- Las landings SEO y AEO se tocan sólo en fase C, con snapshot, sus gates y, en AEO, `heroans` sin cambios.

## GVC Scenario Plan

- Scenario: `public-servicios-aso`, Quality profile: `premium`.
- Viewports: 1536, 1440, 890 y 390.
- Recorridos: CTA primario del hero → foco en el primer campo; submit vacío con resumen; enlace inválido; selects
  premium abiertos; reunión abierta y cerrada con devolución de foco (o `/contacto/` en `not-promoted`); punto de
  la firma con Escape; FAQ abierto; CTA fijo móvil visible y oculto en `#diagnostico`; ida y vuelta a SEO y AEO
  desde R4 en fase B.
- Aserciones: foco en el primer campo; foco devuelto al CTA; CTA fijo oculto sin foco; cero reservas y cero envíos
  reales; robots `noindex` en fase B; ninguna página hermana enlaza hacia acá en fase B;
  `scrollWidth === clientWidth`; consola sin errores propios.

## Design Decision Log

| Decisión | Alternativa | Por qué |
|---|---|---|
| Nodo host de EPIC-023 | Flujo maestro nuevo | La landing consume exactamente sus contratos |
| Sin nodo en EPIC-020 | Enviar al grader | El grader no mide apps; reusarlo prometería algo que no entrega |
| Fase B "se envía, no se encuentra" | Publicar indexada al construir | La oferta está en `Proposed`; precedente `TASK-1859` |
| Enlaces salientes a hermanas desde fase B | Esperar a fase C | La costura con SEO/AEO es parte del argumento aun en envíos 1:1 |
| Enlaces entrantes sólo en fase C | Enlazar desde SEO/AEO al construir | Haría descubrible la página antes de la aprobación |
| Brief inline como primario | Modal | Conserva contexto, es indexable y no suma capa de foco |
| Reunión degrada a `/contacto/` | Ocultar el CTA | El CTA de reunión no puede quedar muerto |
