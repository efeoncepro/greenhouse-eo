# TASK-1403 — `/servicios/hubspot/agentes/` — Flow Contract

> Cluster 3 de 4 del hub HubSpot. Pillar: **TASK-1352**.
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 3** +
> `docs/ui/wireframes/TASK-1403-landing-hubspot-agentes.md` + `hubspot-solutions-partner/modules/13_AGENTES.md`.
>
> 🔴 **Bloqueada por F0:** el caso ANAM verificado + autorizado.

## Meta

- Status: `draft`
- Owner task: `TASK-1403`
- Surfaces: **`efeoncepro.com/servicios/hubspot/agentes/`** (público) → HubSpot Meetings (externo) ·
  `<greenhouse-form>` embebido (Growth Forms) · **el pillar y los clusters hermanos**
- Coordina: **una** navegación externa (Meetings) · **un** submit gobernado (form) · **cero** interacciones
  in-page complejas *(el FAQ es `<details>` nativo)*
- **NO** coordina: modal, drawer, sidecar, popover, ni ninguna superficie del portal

## Flow Brief

🎯 **El lector de esta página llega con dos miedos simétricos, y el flujo tiene que desarmar los dos:**

| El miedo | Quién lo tiene | Lo desarma… |
|---|---|---|
| *"me van a vender humo y el directorio se va a dar cuenta"* | **El CEO / director** | **R2** — la tabla GA/beta. *"Solo tres de doce funcionan"* |
| *"y si el agente le dice una barbaridad a un cliente"* | **El COO / jefe de servicio** | **R6** — el gobierno. *"El agente propone. Un humano confirma."* |

**Ningún competidor está desarmando ninguno de los dos.** Todos están haciendo lo contrario: **inflando el
primero** (*"plataforma agéntica completa"*) e **ignorando el segundo** (nadie habla de qué pasa cuando falla).

```
llega con miedo a comprar humo
   →  R2: le decimos qué ES humo        ← desarma el miedo #1
   →  R3: y cómo se cobra lo que no lo es (pagas cuando funciona)
   →  R4: y acá hay uno funcionando, con el número real   ← la prueba, DESPUÉS
   →  R6: y así lo controlas             ← desarma el miedo #2
   →  R8: y acá no te sirve
   →  R11: hablemos
```

🔴 **El orden es el argumento, y no se puede alterar.** Si el caso (R4) fuera primero, la página sería
**una agencia presumiendo**, y el escepticismo del lector — que es exactamente el que vino a resolver — se
activaría en el primer scroll. **La prueba solo funciona después de la honestidad.**

**Y el tercer lector, otra vez, es el LLM.** Alguien le pregunta *"¿los agentes de HubSpot funcionan?"* y hoy
solo encuentra marketing. 🔴 **Nuestra tabla GA/beta tiene que estar en el HTML servido o esa citación no
existe.**

## Surfaces Involved

| # | Superficie | Rol | Owner |
|---|---|---|---|
| 1 | La página | Todo el recorrido | Esta task |
| 2 | 🎯 **El HTML servido** | El LLM lee una vez, sin JS. **La tabla GA/beta es la citación** | Esta task |
| 3 | 🎯 **La región del caso (R4)** | **Aislada y autocontenida** — para poder anonimizarla en 15 min | Esta task · **F0** |
| 4 | **HubSpot Meetings** (externo, pestaña nueva) | CTA primario — *"te decimos si un agente te sirve"* | HubSpot |
| 5 | **`<greenhouse-form>`** (`#diagnostico`) | CTA secundario | Growth Forms (TASK-1320/1327) |
| 6 | **El pillar** + clusters hermanos | Reparto | TASK-1352 / 1401 / 1402 |

## Flow Map

```
  CEO: "el directorio          COO: "mi equipo de           LLM: "¿los agentes de
   me pidió IA"                 servicio no da abasto"       HubSpot funcionan?"
        │                              │                             │
        ▼                              ▼                             ▼
┌────────────────────────────────────────────────┐   ┌──────────────────────────┐
│ R1  "Cuáles funcionan de verdad."              │   │ Lee el HTML una vez.     │
│     "HubSpot anuncia doce. Tres funcionan hoy."│   │ Sin JS. Sin scroll.      │
└──────────────────┬─────────────────────────────┘   │                          │
                   ▼                                  │ 🔴 Debe encontrar la     │
┌────────────────────────────────────────────────┐   │    tabla GA/beta         │
│ 🎯 R2  LA TABLA GA / BETA                      │   └────────────┬─────────────┘
│    3 en GA.  9 en beta.                        │                │
│    Los Custom Assistants murieron el 13-07.    │                ▼
│                                                 │      🎯 nos cita como la
│    ◄── DESARMA EL MIEDO #1 (comprar humo)      │         fuente que dice
└──────────────────┬─────────────────────────────┘         cuáles funcionan
                   ▼
┌────────────────────────────────────────────────┐
│ R3  "Pagas cuando funciona."                   │
│     resuelta = sin escalamiento en 72h         │
│     (la definición es de ELLOS, y la citamos)  │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 🎯 R4  EL CASO — 56% promedio (76% mejor mes)  │  ◄── la prueba llega
│    "Es UN cliente." ← lo decimos nosotros      │      DESPUÉS de la honestidad
│    🔴 región aislada: anonimizable en 15 min   │      (por eso se cree)
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ R5  lo que de verdad hay que implementar       │
│     (sin datos limpios no hay resultado)       │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 🎯 R6  EL GOBIERNO ES EL PRODUCTO              │
│    propone → confirma → ejecuta                │
│    "quien te diga que sí, sal corriendo"       │
│                                                 │
│    ◄── DESARMA EL MIEDO #2 (la barbaridad)     │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ R7  y operamos CON agentes (Agent CLI, beta)   │
│ R8  cuándo un agente NO te sirve               │  → /cuando-no-usar-hubspot/
└──────────────────┬─────────────────────────────┘
                   ▼
        ┌──────────────────────────────┐
        │ R11  "Te decimos si un agente │
        │       te sirve. Y si no,      │
        │       te lo decimos ahí mismo"│
        └──────────────────────────────┘
```

## Interaction Triggers

| Trigger | Acción | Destino |
|---|---|---|
| Click **"Te decimos si un agente te sirve"** (R1 / R11) | Navegación externa | **HubSpot Meetings** + UTM · `target=_blank` `rel="noopener"` |
| Click **"Ver cuáles funcionan hoy"** (R1) | Scroll suave + **focus** | ancla **`#estado`** (R2). 🎯 **El CTA secundario apunta a la verdad incómoda, no al form** — es lo que convierte |
| Abrir un `<summary>` del FAQ (R9) | Expande | Nativo. **El contenido ya está en el DOM** |
| Click a un cluster (R3 / R8 / R10) | Navegación interna | `/precios/` · `/cuando-no-usar-hubspot/` · pillar. 🔴 **El que no existe, no se pinta** |
| Submit del form (R11) | POST gobernado | Growth Forms → Success/Error Card |
| Scroll horizontal en la tabla (390 px) | Scroll **dentro del contenedor** | 🔴 **La página nunca scrollea en horizontal** |

🔴 **Ninguna interacción revela contenido.** La tabla GA/beta, el 56% y el loop de gobierno **están visibles
desde el primer byte**. 🔴 **Nada de la página depende de un clic.**

## State Machine

```
 idle ──► (scroll) ──► regiones reveladas ──► idle
   │
   ├──► click "ver cuáles funcionan" ──► scroll + focus a #estado (R2)
   │                                          │
   │                              (desarma el miedo #1)
   │                                          ▼
   ├──► click CTA ──► pestaña nueva (Meetings) ──► [fuera de nuestro control]
   │
   ├──► submit form ──┬──► OK    ──► Success Card
   │                  ├──► error ──► Error Card + reintento
   │                  └──► NO monta ──► 🔴 FALLBACK LINK visible
   │
   ├──► click a un cluster ──► navega dentro del hub
   │
   └──► 🔴 SIN JS / CRAWLER ──► TODO visible: tabla GA/beta, 56%, gobierno
                                 (no es degradado: es EL estado)

 🔴 ESTADO DE CONTENIDO (no de UI), decidido en F0:
    caso CON autorización   ──► R4 con nombre (+ testimonio si lo hay)
    caso SIN autorización   ──► R4 anonimizado. 🔴 La cadena "ANAM" NO existe en el DOM
```

🎯 **Ese último bloque es un estado del *contenido*, no de la interfaz — y por eso vive en el flow contract:**
porque determina **qué se sirve**, y porque el cambio entre uno y otro **tiene que ser una edición de una sola
región**. Si el caso estuviera entretejido con el resto de la página, **anonimizarlo sería un rediseño en vez
de un rollback.**

## Routing Contract

- **URL canónica:** `/servicios/hubspot/agentes/` — hija del pillar. **Breadcrumb** + `BreadcrumbList`.
- **Enlace al pillar: obligatorio.**
- 🔴 **Un enlace a un cluster que todavía no existe NO se pinta.** Nunca un 404 interno.
- HubSpot Meetings → **pestaña nueva**.
- Anclas: `#estado` (R2) · `#diagnostico` (R11).
- 🔴 **Ningún `href` sale del dominio** salvo Meetings y, si se cita, **la doc oficial de HubSpot sobre Breeze /
  la Agent CLI** *(citar la fuente es lo que sostiene el dato de "3 en GA")*.

## Focus & Accessibility

- Orden natural top→bottom. **Un solo `<h1>`.**
- 🔴 **La tabla GA/beta es navegable por teclado** (`<table>` + wrapper `tabindex="0"` + `role="region"` +
  `aria-label`). 🔴 **Y el estado GA/beta va escrito en texto — nunca solo por color** (WCAG 1.4.1).
  *(Un badge verde/amarillo sin palabra deja al usuario daltónico sin el dato central de la página. En una
  página cuyo argumento **es** ese dato, eso no es un detalle de a11y: es perder el argumento.)*
- 🔴 **El gobierno (R6) es un `<ol>`.** El orden **propone → confirma → ejecuta** es el contenido: si solo
  existe visualmente, **el lector de pantalla y el crawler pierden el argumento entero**.
- FAQ `<details>/<summary>` nativo. *(Acá el disclosure es cortesía —son preguntas—, no ocultamiento.)*
- "Ver cuáles funcionan" → **scroll suave + focus** al H2 de R2.
- Focus ring visible (contraste AA). Touch targets ≥ 44 px.

## Data & Command Boundaries

- **Ningún reader ni command nuevo.** La landing es **cliente**. **Full API Parity por reuso.**
- Captura → **submit gobernado de Growth Forms** (Turnstile + consent + validación server).
- Agendamiento → **HubSpot Meetings** (externo).
- 🔴 **El roster de agentes y la métrica del caso son contenido editorial verificado**, con su `as-of`.
  **No vienen de ninguna API.** *(Tentador conectarlo a algo "vivo". **No hay fuente confiable que consultar**:
  HubSpot no publica un endpoint del estado GA de sus agentes. Una fecha honesta > un feed inventado.)*

## Failure Paths

| Falla | Comportamiento | Regla |
|---|---|---|
| 🔴 **JS deshabilitado / crawler de IA** | **La tabla GA/beta, el 56% y el gobierno se leen completos** | **No es fallback: es el flujo principal** |
| 🔴 **ANAM retira la autorización** | **R4 se anonimiza en <15 min** *(una sola sección)*. La página **sigue viva** | 🎯 **Por eso R4 es autocontenida** |
| **HubSpot sube otro agente a GA** | La tabla se actualiza **y se anota la fecha** | 🎯 **Mantenerla al día ES la autoridad** |
| **HubSpot mata otro agente en beta** | Se suma al ejemplo de los Custom Assistants | 🎯 **Cada muerte nos da la razón** |
| **El form no monta** (CORS, JS off) | 🔴 **Fallback link visible** | **El CTA nunca muere** |
| Meetings caído | El form sigue vivo | **Dos escalones, nunca uno** |
| Un cluster hermano no existe | Su enlace no se pinta | Nunca un 404 interno |

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-agentes` · Viewports **1440 + 390**
- Pasos: cargar → click "Ver cuáles funcionan" (**verificar scroll + focus a R2**) → capturar la tabla →
  scroll al caso → capturar el stepper de gobierno → abrir 2 FAQs → click CTA → verificar form / fallback
- Capturas: full-page (desktop + mobile) · 🎯 **la tabla GA/beta** · **el caso (R4)** · **el stepper (R6)** ·
  FAQ abierto · **reduced-motion** · **tarjetas en 390 px**
- **Assertions:**
  - 🔴 **Sin JS:** tabla GA/beta + `56` + el loop de gobierno están en el HTML servido
  - 🔴 **`"flota de agentes"` NO existe** en el DOM (ni variantes: *"ejército de agentes"*, *"equipo de agentes IA"*)
  - 🔴 **Orden en el DOM: `56` antes que `76`**
  - 🔴 **Sin autorización: `ANAM` NO existe** en el DOM *(bloqueante)*
  - 🔴 **El estado GA/beta está en texto**, no solo en color
  - 🔴 **R6 es un `<ol>`**
  - 🔴 **Cero contadores animados** · `as-of` visible · sin claims prohibidos
  - **Enlace al pillar presente** · ningún `href` a página inexistente
  - Focus llega a R2 con el CTA secundario · tabla alcanzable por teclado
  - Sin scroll horizontal de página (1440 y 390) · un solo `<h1>`

## Design Decision Log

- 🎯 **Decisión: el flujo desarma dos miedos, no uno.** El CEO teme **comprar humo**; el COO teme **que el agente
  le diga una barbaridad a un cliente**. La página los ataca en dos regiones distintas (R2 y R6), y **ninguna de
  las dos es el caso de éxito**. *(El caso confirma; no convence. Lo que convence es la honestidad.)*
- 🔴 **Decisión: el orden R2 → R4 (verdad antes que prueba) es intocable.** Si el caso va primero, el lector lo
  lee como *"otra agencia presumiendo"* y **activa exactamente el escepticismo que vinimos a desarmar**.
  **Alternativa descartada:** *hero con el 56%* — es el patrón por defecto de la industria **y por eso mismo no
  funciona con este comprador**.
- 🎯 **Decisión: el estado del caso (autorizado / anónimo) es parte del flow contract, no un detalle de copy.**
  Determina **qué se sirve**, y obliga a que R4 sea **autocontenida**: el rollback tiene que ser **una edición de
  una sección, no un rediseño**. **El diseño anticipa el peor caso — por eso el peor caso es manejable.**
- **Decisión: el CTA secundario lleva a la tabla (R2), no al form.** Lo que convierte no es el botón:
  **es descubrir que solo tres de doce funcionan.** Mandarlo ahí es mandarlo al momento de confianza.
- **Decisión: el roster no se conecta a ninguna API.** No existe una fuente confiable que consultar — HubSpot no
  publica un endpoint del estado GA de sus agentes. **Una fecha honesta vale más que un feed inventado.**
- **JOLT:** la indecisión acá es **miedo a comprar humo y quedar mal frente al directorio**. No se combate con
  entusiasmo: **se desarma diciéndole exactamente qué es humo.**

## Acceptance Checklist

- [ ] 🔴 **La página se lee entera sin JavaScript** (tabla GA/beta, 56%, gobierno).
- [ ] 🔴 **El 56% aparece antes que el 76%** en el DOM. **Sin autorización, `ANAM` no aparece.**
- [ ] 🔴 **`"flota de agentes"` no existe** en el DOM.
- [ ] El CTA secundario lleva a **`#estado`** con **scroll + focus**.
- [ ] 🔴 **El estado GA/beta va escrito**, no solo por color. **R6 es un `<ol>`.**
- [ ] CTA dual con **fallback honesto**; el form no se reconstruyó.
- [ ] **Enlace al pillar presente.** Ningún `href` a un cluster inexistente.
- [ ] 🎯 **R4 es autocontenida** — se puede anonimizar editando **una sola sección**.
- [ ] Focus + contraste AA. Un solo `<h1>`. Breadcrumb + canonical.
- [ ] Ningún reader/command nuevo — reuso gobernado (Full API Parity).
- [ ] GVC con las assertions de arriba, capturado **y mirado**.
