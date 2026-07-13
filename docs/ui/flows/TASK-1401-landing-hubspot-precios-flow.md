# TASK-1401 — `/servicios/hubspot/precios/` — Flow Contract

> Cluster 1 de 4 del hub HubSpot. Pillar: **TASK-1352**.
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 2** +
> `docs/ui/wireframes/TASK-1401-landing-hubspot-precios.md`.

## Meta

- Status: `draft`
- Owner task: `TASK-1401`
- Surfaces: **`efeoncepro.com/servicios/hubspot/precios/`** (público) → HubSpot Meetings (externo) ·
  `<greenhouse-form>` embebido (Growth Forms) · **el pillar y los otros 3 clusters** (navegación interna)
- Coordina: **una** navegación externa (Meetings) · **un** submit gobernado (form) · **cero** interacciones
  in-page complejas *(el FAQ es `<details>` nativo)*
- **NO** coordina: modal, drawer, sidecar, popover, ni ninguna superficie del portal

## Flow Brief

🎯 **Esta es la única página del hub a la que se llega sin conocernos.** Las otras cuatro las visita alguien que
ya está en el sitio o que llega por canal. **Acá cae tráfico frío de Google que solo quería un número.**

Eso cambia todo el diseño del flujo: **el usuario no vino a conocernos, y no le importamos.**

```
Vino por el número  →  se lo damos, completo y gratis
                    →  y de paso ve tres cosas que HubSpot no le dijo
                    →  ahí decide que somos confiables   ← EL MOMENTO
                    →  recién ahí le ofrecemos algo
```

🔴 **El flujo NO puede pedirle nada antes de darle el número.** Ni un email, ni un scroll gate, ni un
*"agenda una demo para conocer el precio"*. **Eso es exactamente lo que lo hizo salir de hubspot.com.**
Si esta página hace lo mismo, no tiene razón de existir.

**Y hay un segundo lector, tan importante como el humano: el LLM.** Un modelo que resuelve *"¿cuánto cuesta
HubSpot?"* lee esta página **sin ejecutar JavaScript, sin hacer scroll y sin hacer clic**. **Su recorrido es
"leer el HTML de arriba abajo una vez"** — y ese recorrido tiene que devolver la respuesta completa.
🔴 **Si el flujo humano y el flujo del crawler divergen, perdimos el flujo que más escala.**

## Surfaces Involved

| # | Superficie | Rol | Owner |
|---|---|---|---|
| 1 | La página `/servicios/hubspot/precios/` | Todo el recorrido | Esta task |
| 2 | 🎯 **El HTML servido** *(el "recorrido" del crawler)* | **Consumidor de primera clase.** Lee una vez, sin JS | Esta task |
| 3 | **HubSpot Meetings** (externo, pestaña nueva) | CTA primario — *"te lo cotizamos sin costo"* | HubSpot |
| 4 | **`<greenhouse-form>`** (`#cotizar`) | CTA secundario — captura si no quiere hablar todavía | Growth Forms (TASK-1320/1327) |
| 5 | **El pillar** `/servicios/hubspot/` | Destino de reparto (obligatorio) | TASK-1352 |
| 6 | Clusters hermanos (`/agentes/`, `/hubspot-vs-salesforce/`, `/cuando-no-usar-hubspot/`) | Reparto contextual | TASK-1402/1403/1404 |

## Flow Map

```
   Google: "cuánto cuesta hubspot"        ChatGPT/Perplexity: mismo intent
   (~1.500/mes, tráfico FRÍO)             (lee el HTML, no ejecuta JS)
              │                                        │
              ▼                                        ▼
   ┌──────────────────────────────┐     ┌──────────────────────────────┐
   │ R1 HERO + R2 TL;DR           │     │  Lee el HTML de arriba abajo │
   │ "Cuánto cuesta HubSpot       │     │  UNA vez. Sin scroll.        │
   │  de verdad."   + as-of       │     │  Sin clic. Sin JS.           │
   │  ← LA RESPUESTA, ARRIBA      │     │                              │
   └──────────────┬───────────────┘     │  🔴 Debe encontrar TODO:     │
                  │                     │  el TL;DR, los créditos,     │
                  │ scroll              │  el onboarding, el waiver    │
                  ▼                     └──────────────┬───────────────┘
   ┌──────────────────────────────┐                    │
   │ R3-R5 cobro · seats · saltos │                    ▼
   │ (el view-only gratis = el    │           🎯 nos cita como fuente
   │  primer regalo real)         │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────────────────┐
   │ 🎯 R6  LOS CRÉDITOS Y SUS DOS TRAMPAS    │
   │    20.000 → 5.000.  Sin rollover.        │  ◄── EL MOMENTO
   │    "Esta gente sabe algo que HubSpot      │      (aquí decide que
   │     no me dijo."                          │       somos confiables)
   └──────────────┬───────────────────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ R7 el cargo obligatorio      │  ← el susto (real, no fabricado)
   │ R8 …y te lo borramos         │  ← el alivio  = EL WAIVER
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │ R9 "y si tu caso es B2C      │  → /cuando-no-usar-hubspot/
   │     masivo, no te conviene"  │     (lo dejamos ir, a propósito)
   └──────────────┬───────────────┘
                  │
      ┌───────────┴────────────┬─────────────────────┐
      ▼                        ▼                     ▼
┌───────────────┐    ┌──────────────────┐   ┌─────────────────┐
│ R13 CTA       │    │ R12 al PILLAR     │   │ se va con el    │
│ "Te lo        │    │ "¿me sirve        │   │ número.         │
│  cotizamos    │    │  siquiera?"       │   │ 🎯 Y VUELVE.    │
│  sin costo"   │    └──────────────────┘   │ (o nos cita)    │
└───────────────┘                            └─────────────────┘
```

## Interaction Triggers

| Trigger | Acción | Destino |
|---|---|---|
| Click **"Te lo cotizamos sin costo"** (R1 / R13) | Navegación externa | **HubSpot Meetings** + UTM · `target=_blank` `rel="noopener"` |
| Click **"Ver dónde está la plata que no te muestran"** (R1) | Scroll suave + focus | ancla **`#creditos`** (R6). 🎯 **El CTA secundario apunta a la región firma, no al form** — porque lo que convierte es el dato, no el botón |
| Abrir un `<summary>` del FAQ (R11) | Expande | Nativo. 🔴 **El contenido ya está en el DOM** (citable aunque esté cerrado) |
| Click en un cluster (R6 / R9 / R12) | Navegación interna | Mismo hub, **sin UTM** (es tráfico propio) |
| Click al **pillar** (R12) | Navegación interna | `/servicios/hubspot/` |
| Submit del form (R13) | POST gobernado | Growth Forms → Success/Error Card del renderer |
| Scroll horizontal en una tabla (390 px) | Scroll **dentro del contenedor** | 🔴 **La página nunca scrollea en horizontal** |

🔴 **Ninguna interacción es requisito para leer nada.** Cero contenido detrás de un clic, un scroll gate o un
email. **La página se entiende entera leyendo el HTML servido de corrido.**

## State Machine

```
 idle ──► (scroll) ──► regiones reveladas ──► idle
   │
   ├──► click "dónde está la plata" ──► scroll a #creditos ──► lee la tabla
   │                                                              │
   │                                        (el momento de confianza)
   │                                                              ▼
   ├──► click CTA cotizar ──► pestaña nueva (Meetings) ──► [fuera de nuestro control]
   │
   ├──► submit form ──┬──► OK    ──► Success Card (renderer)
   │                  ├──► error ──► Error Card + reintento
   │                  └──► NO monta (CORS / JS off) ──► 🔴 FALLBACK LINK visible
   │
   ├──► click a un cluster ──► navega dentro del hub
   │
   └──► 🔴 SIN JS / CRAWLER ──► TODO visible, TODO legible, cifras incluidas
                                 (no es un estado degradado: es EL estado)
```

## Routing Contract

- **URL canónica:** `/servicios/hubspot/precios/` — hija de `/servicios/hubspot/` (pillar), nieta de `/servicios/`.
  **Breadcrumb obligatorio** + `BreadcrumbList` en JSON-LD: es la señal de que existe un hub.
- **Enlace al pillar: obligatorio.** Un cluster que no devuelve al pillar es una página huérfana, y el hub
  deja de ser un hub.
- 🔴 **Un enlace a un cluster que todavía no existe NO se pinta.** Nada de *"próximamente"*. **Nunca un 404 interno.**
- HubSpot Meetings → **pestaña nueva** (el usuario no pierde el número que vino a buscar).
- 🔴 **Ningún `href` sale del dominio** salvo Meetings y, si se cita, la **página oficial de precios de HubSpot**
  *(y esa sale con `rel="noopener"`; **es correcto citar la fuente — es lo que hace creíble la página**)*.
- Anclas: `#creditos` (R6) · `#cotizar` (R13). Los `data-capture` **no** son anclas.

## Focus & Accessibility

- Orden natural top→bottom. **Un solo `<h1>`.** Jerarquía H2→H3 estricta.
- 🔴 **Las tablas son navegables**: `<table>` + `<caption>` + `<th scope>`; el wrapper con `overflow-x:auto`
  lleva `tabindex="0"` + `role="region"` + `aria-label` **para que sea alcanzable por teclado** (si no, un
  usuario de teclado no puede scrollear la tabla en móvil).
- FAQ: `<details>/<summary>` nativo → teclado y lector de pantalla gratis.
- "Ver dónde está la plata…" → **scroll suave + focus al encabezado de R6** (no solo scroll: **focus**, o el
  usuario de teclado queda perdido arriba).
- Focus ring visible (contraste AA) en CTAs, `<summary>`, enlaces y campos. Touch targets ≥ 44 px.
- El diagrama de escalón (R5) es `aria-hidden` — **su información vive en el texto**.

## Data & Command Boundaries

- **Ningún reader ni command nuevo.** La landing es **cliente**. **Full API Parity por reuso.**
- Captura → **submit gobernado de Growth Forms** (Turnstile + consent + validación server).
  Reusa el patrón de `efeonce-seo-diagnostic`; HubSpot delivery `disabled` hasta cutover.
- Agendamiento → **HubSpot Meetings** (externo).
- 🔴 **Ningún precio se lee de una API ni de una DB.** Son **contenido editorial verificado**, con su `as-of`.
  *(Un "precio dinámico" acá sería una promesa de frescura que no podemos cumplir: la fuente es hubspot.com,
  no un feed. **Mejor una fecha honesta que un endpoint mentiroso.**)*

## Failure Paths

| Falla | Comportamiento | Regla |
|---|---|---|
| 🔴 **JS deshabilitado / crawler de IA** | **La página entera se lee**: TL;DR, tablas, créditos, onboarding, waiver, FAQ | **No es un fallback: es el flujo principal** |
| **El form no monta** (CORS, JS off) | 🔴 **Fallback link visible** (Meetings / mailto con UTM) | **El CTA nunca muere** |
| Submit falla | Error Card del renderer + reintento | Owned por TASK-1320 |
| Meetings caído | El form sigue vivo; y el número **ya lo tiene** | **La página cumple aunque no convierta** |
| Un cluster hermano no existe | Su enlace **no se pinta** | **Nunca un 404 interno** |
| 🔴 **Un precio quedó stale** | El `as-of` viejo dispara el copy de State Copy: *"confírmalos con nosotros"* | **La página envejece diciéndolo, no callándolo** |

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-precios` · Viewports **1440 + 390**
- Pasos: cargar → scroll por regiones → click "Ver dónde está la plata" (**verificar scroll + focus a R6**) →
  capturar la tabla de créditos → abrir 2 FAQs → click CTA → verificar form / fallback
- Capturas: full-page (desktop + mobile) · 🎯 **la tabla de créditos (R6)** · FAQ abierto · form montado ·
  **reduced-motion** · **tabla en 390 px con scroll interno**
- **Assertions:**
  - 🔴 **Sin JS:** `fetch` sin JavaScript → **TL;DR + tabla de créditos + onboarding + waiver + `as-of`** en el HTML
  - 🔴 **Cero contadores animados**
  - 🔴 **Sin claims prohibidos** en el DOM: `ISO 27001` · `Forrester` · `Líder en CRM` · `Commerce Hub` ·
    `Operations Hub` · `INBOUND`
  - 🔴 **Ningún `href` interno a una página inexistente** (crawl de los enlaces del hub)
  - **Enlace al pillar presente** · breadcrumb presente · canonical correcto
  - Focus llega a R6 al usar el CTA secundario · tablas alcanzables por teclado
  - **Sin scroll horizontal de página** (1440 y 390) · un solo `<h1>`

## Design Decision Log

- **Decisión: la página da el número antes de pedir nada.** Es tráfico frío que **ya se fue de una página que
  le pidió una demo para decirle el precio**. Repetir esa fricción sería reproducir el problema que la página
  denuncia. **El compromiso que le cobramos es cero.**
- **Decisión: el CTA secundario apunta a `#creditos`, no al formulario.** Lo que convierte no es el botón: es
  **el dato que nadie más le dio**. Mandarlo a la región firma es mandarlo al momento de confianza.
- 🎯 **Decisión: el crawler es un usuario, y su recorrido está en el contrato.** Lee el HTML una vez, sin JS,
  sin scroll, sin clic. **Si el diseño rompe ese recorrido, perdimos el canal que más escala** — y el hub entero
  se apoya en citabilidad. **Alternativa descartada:** *tabla de créditos como widget interactivo* — se ve mejor
  y **destruye exactamente el activo por el que la página existe**.
- **Decisión: los precios son contenido editorial, no data.** Un endpoint de precios promete una frescura que no
  podemos cumplir (la fuente es hubspot.com, no un feed). **Una fecha honesta vale más que un endpoint mentiroso.**
- **Alternativas descartadas:** *cotizador self-serve* (miente con precisión; quema la credibilidad) ·
  *gate de email para "ver los precios completos"* (**es el pecado que la página denuncia**) ·
  *modal de captura al salir* (dark pattern; prohibido).
- **JOLT:** la indecisión de este comprador no es *"¿HubSpot o el competidor?"* — es **"¿me van a sorprender con
  la factura?"**. La página mata ese miedo específico. **Por eso el onboarding (R7) va antes que el waiver (R8):
  primero se nombra el miedo, después se resuelve.**

## Acceptance Checklist

- [ ] 🔴 **La página se lee entera sin JavaScript**, con todas las cifras. *(El flujo del crawler es el principal.)*
- [ ] La página **da el número antes de pedir nada**: cero gates, cero email obligatorio, cero modal de salida.
- [ ] El CTA secundario lleva a **`#creditos`** con **scroll + focus**.
- [ ] CTA dual funciona con **fallback honesto**; el form no se reconstruyó.
- [ ] **Enlace al pillar presente.** Ningún `href` a un cluster inexistente.
- [ ] Tablas semánticas y alcanzables por teclado; scroll interno en 390 px, **nunca de página**.
- [ ] Focus + contraste AA. Un solo `<h1>`. Breadcrumb + canonical correctos.
- [ ] Ningún reader/command nuevo — reuso gobernado (Full API Parity).
- [ ] GVC con las assertions de arriba, capturado **y mirado**.
