# TASK-1352 — Landing HubSpot — Flow Contract

> **Reescrito desde cero el 2026-07-13.** Fuente:
> **[PDR-006 reescrito](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)**
> + `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`.

## Meta

- Status: `draft`
- Owner task: `TASK-1352`
- Surfaces: **`efeoncepro.com/servicios/hubspot/`** (público; **301 desde `/servicios-contratar-hubspot/`**) →
  HubSpot Meetings (externo) · `<greenhouse-form>` embebido (Growth Forms) · **los 4 clusters del hub**
  (TASK-1401…1404) · Portal Grader en Think *(futuro, EPIC-024)*
- Coordina: **una** navegación externa (Meetings) · **un** submit gobernado (form) · **una** interacción
  in-page (el mapa dolor→Hub)
- **NO** coordina: modal, drawer, sidecar, popover, ni ninguna superficie del portal

## Flow Brief

**El flujo ES el argumento.** Cada región le quita un poco de riesgo al comprador antes de pedirle nada:

```
R3 te digo qué te duele  →  R4 te lo pruebo gratis  →  R5 te digo cuándo NO comprarme
                         →  R6 te quito USD 3.000   →  R7-R8 te digo qué hago, y cómo sin encerrarte
                         →  R12 recién ahí te pido algo
```

**El usuario no tiene que decidir "comprar". Tiene que decidir "quiero saber si me sirve".**
Es un compromiso mucho más barato — y es el único que la página le cobra.

## Surfaces Involved

| # | Superficie | Rol | Owner |
|---|---|---|---|
| 1 | La página (`244079`) | Todo el recorrido | Esta task |
| 2 | 🎯 **El mapa dolor→Hub (R3)** | Interacción in-page. **Progressive enhancement** | Esta task |
| 3 | **HubSpot Meetings** (externo, pestaña nueva) | CTA primario | HubSpot |
| 4 | **`<greenhouse-form>`** (`#diagnostico`) | CTA secundario — captura del diagnóstico | Growth Forms (TASK-1320/1327) |
| 5 | Portal Grader en Think | **Futuro** (EPIC-024 Fase 1). Hasta entonces el form es el interino | PDR-007 |

## Flow Map

```
   Llega por          ┌──────────────────────────────────────────────┐
   co-sell (PDM)      │  R1 HERO                                      │
   Solutions Directory│  "Antes de venderte HubSpot,                  │
   directo / marca    │   te mostramos si te sirve."                  │
   outbound           │  [Agenda una reunión]  [Ver mi diagnóstico]   │
   cross-sell         └───────────────┬──────────────────────────────┘
                                      │  scroll (la mayoría NO hace clic acá)
                      ┌───────────────▼──────────────────────────────┐
                      │  R3  EL MAPA — "¿Qué te duele?"              │
                      │  7 dolores → 7 Hubs.   ← LA DECISIÓN         │
                      │  Elige uno → se revela su respuesta          │
                      └───────────────┬──────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
 ¿Ya tienes HubSpot?          ¿No te encuentran?           Cualquier otro dolor
        │                             │                             │
        ▼                             ▼                             ▼
 ┌──────────────┐            ┌──────────────┐          ┌────────────────────────┐
 │ PORTAL       │            │ AI VISIBILITY│          │ LA REUNIÓN             │
 │ GRADER       │            │ GRADER       │          │ y en ella, lo primero: │
 │ #diagnostico │            │ → /aeo-2/    │          │ si NO te sirve,        │
 └──────┬───────┘            └──────┬───────┘          │ te lo decimos          │
        │                           │                  └───────────┬────────────┘
        └────────────┬──────────────┘                              │
                     │                                             │
                     ▼                                             ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  R5 límites → R6 waiver → R7 capas → R8 Kortex                │
        │  (siguen quitando riesgo, aunque no haya habido ningún clic)   │
        └───────────────────────────┬──────────────────────────────────┘
                                    ▼
                       ┌────────────────────────────┐
                       │  R12  CTA final             │
                       │  "Empieza por saber         │
                       │   si te sirve."             │
                       └────────────────────────────┘
```

## Interaction Triggers

| Trigger | Acción | Destino |
|---|---|---|
| Click **"Agenda una reunión"** (R1 / R12) | Navegación externa | **HubSpot Meetings** + UTM · `target=_blank` `rel="noopener"` |
| Click **"Ver mi diagnóstico gratis"** (R1) | Scroll suave + focus | ancla `#diagnostico` (R12) |
| 🎯 **Click en un dolor del mapa (R3)** | **Revela su Hub y su ruta.** No navega, no abre modal | In-page. **Sin JS: ya está visible** |
| Click **"¿No te encuentran?"** (R4) | Navegación interna | `/aeo-2/` + UTM |
| Click **"¿Ya tienes HubSpot?"** (R4) | Scroll + focus | `#diagnostico` *(futuro: Portal Grader en Think)* |
| Submit del form (R12) | POST gobernado | Growth Forms → Success/Error Card del renderer |
| Abrir un `<summary>` del FAQ (R11) | Expande | Nativo |

🔴 **Ninguna interacción bloquea contenido.** El mapa es *enhancement*, no requisito: **sin JavaScript los 7
dolores y sus Hubs están todos visibles.** Los crawlers de IA no ejecutan JS y **deben poder leerlo entero** —
es un objetivo declarado de la task (ser citable por motores de respuesta).

## State Machine

```
 idle ──► (scroll) ──► regiones reveladas ──► idle
   │
   ├──► click dolor (R3) ──► ese dolor expandido ──► (click otro) ──► ese expandido
   │                              │
   │                              └──► (sin JS) TODOS expandidos, siempre
   │
   ├──► click CTA reunión ──► pestaña nueva (Meetings) ──► [fuera de nuestro control]
   │
   └──► click diagnóstico ──► scroll #diagnostico ──► form montado
                                       │
                                       ├──► submit OK    ──► Success Card (renderer)
                                       ├──► submit error ──► Error Card + reintento
                                       └──► NO monta (CORS / JS off) ──► 🔴 FALLBACK LINK visible
```

## Routing Contract

- 🔴 **URL canónica: `/servicios/hubspot/`.** `/servicios-contratar-hubspot/` → **301** (un solo salto, sin
  cadena). El canonical apunta a la **nueva**. **Ningún enlace interno queda apuntando a la vieja**
  (menú, home, `/servicios/`, `/aeo-2/`, footer, posts).
- 🎯 **Reparto a los clusters** (mismo hub, navegación interna, sin UTM — es tráfico propio):
  `/servicios/hubspot/precios/` · `/cuando-no-usar-hubspot/` · `/agentes/` · `/hubspot-vs-salesforce/`.
  🔴 **Un enlace a un cluster que todavía no existe NO se pinta.** Nunca un link a 404.
- Ancla única de navegación: `#diagnostico`. Los `data-capture` **no** son anclas.
- HubSpot Meetings → **pestaña nueva** (el usuario no pierde la página).
- `/aeo-2/` → navegación **interna** con UTM (`utm_source=hubspot-landing`).
- 🔴 **Ningún `href` sale del dominio** salvo Meetings y el listing de Kortex en el Marketplace.
  *(La página viva tiene "Más testimonios" → `themeforest.net/user/colabrio/reviews`. **Matarlo.**)*

## Focus & Accessibility

- Orden natural top→bottom. **Un solo `<h1>`.**
- 🔴 **El mapa (R3) es navegable por teclado**: cada dolor es un control real (`<button>` en una lista
  semántica, o `<details>/<summary>`) — **nunca un `div` con `onclick`**.
- `aria-expanded` en cada control del mapa; el contenido revelado es su `aria-controls`.
- "Ver mi diagnóstico" → **scroll suave + focus al primer campo** del form.
- Al volver de Meetings (pestaña nueva), el navegador restaura el foco solo.
- Focus ring visible (contraste AA) en CTAs, controles del mapa, `<summary>` y campos.

## Data & Command Boundaries

- **Ningún reader ni command nuevo.** La landing es **cliente**.
- Captura de lead → **submit gobernado de Growth Forms** (Turnstile + consent + validación server).
  `efeonce-hubspot-portal-audit` = **config de form instance** del contrato existente;
  HubSpot delivery `disabled` hasta cutover.
- Agendamiento → **HubSpot Meetings** (externo).
- **Full API Parity por reuso.** No se reconstruye nada.

## Failure Paths

| Falla | Comportamiento | Regla |
|---|---|---|
| **JS deshabilitado / crawler de IA** | 🔴 **El mapa (R3) se ve completo** (7 dolores + sus Hubs). El waiver y los límites están en el HTML servido | **La página es 100% legible sin JS** |
| **El form no monta** (CORS, JS off) | 🔴 **Fallback link visible** (agendamiento / mailto con UTM) | **El CTA nunca muere** |
| Submit falla | Error Card del renderer + reintento | Owned por TASK-1320 |
| Meetings caído | El diagnóstico sigue vivo | **Dos escalones, nunca uno** |

## GVC Scenario Plan

- Scenario: `public-servicios-contratar-hubspot` · Viewports **1440 + 390**
- Pasos: before-capture → cargar → scroll por regiones → **click en 2 dolores del mapa** → abrir 1 FAQ →
  click "Ver mi diagnóstico" → verificar scroll + focus al form
- Capturas: full-page (desktop + mobile) · frame por región · **el mapa en 2+ estados** · FAQ abierto ·
  form montado · **reduced-motion** · **before/after**
- **Assertions:**
  - 🔴 **Sin JS:** `fetch` sin JavaScript → **los 7 dolores, la cifra del waiver y los límites están en el HTML**
  - 🔴 **Sin `href` foráneos** (salvo Meetings + listing de Kortex)
  - 🔴 **Sin claims prohibidos** en el DOM: `ISO 27001` · `Forrester` · `Líder en CRM` · `Commerce Hub` ·
    `Operations Hub` · `INBOUND`
  - El mapa es navegable por teclado; `aria-expanded` correcto
  - Sin scroll horizontal (1440 y 390) · un solo `<h1>` · canonical preservado
  - El CTA de diagnóstico es accionable **o** el fallback link es visible

## Design Decision Log

- **Decisión:** el flujo **es** el argumento — cada región quita riesgo antes de pedir algo. El usuario no
  decide *"comprar"*: decide **"quiero saber si me sirve"**. Compromiso barato → conversión alta.
- **Interacción central = el mapa dolor→Hub (R3)**, no un formulario ni un diagrama abstracto. Es un
  **mini-diagnóstico** que además **vende la plataforma completa** (7 dolores → 7 Hubs).
- **Alternativas descartadas:**
  - *Un solo CTA (reunión)* — pierde a quien tiene interés pero no está listo para hablar con nadie.
  - *El mapa como widget JS obligatorio* — **rompe la citabilidad por motores de respuesta**, que es un
    objetivo declarado de la task.
  - *Modal para el diagnóstico* — fricción innecesaria; el form inline convierte mejor y no rompe el back.
- **JOLT:** el flujo entero está diseñado para **quitar riesgo**, no para empujar. La región de límites (R5)
  **reduce el pipeline a propósito** — y **sube el win rate del que queda**.

## Acceptance Checklist

- [ ] Los dos escalones (reunión + diagnóstico) funcionan, con **fallback honesto**.
- [ ] 🔴 **El mapa (R3) es semántico, navegable por teclado y funciona sin JS.**
- [ ] 🔴 **La página es legible entera sin JavaScript** (crawlers de IA).
- [ ] Ningún `href` foráneo salvo los intencionales.
- [ ] Focus + `aria-expanded` correctos; contraste AA.
- [ ] Ningún reader/command nuevo — reuso gobernado (Full API Parity).
- [ ] GVC con las assertions de arriba, capturado **y mirado**.
