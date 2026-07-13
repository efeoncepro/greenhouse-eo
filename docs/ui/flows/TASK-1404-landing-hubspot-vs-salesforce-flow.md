# TASK-1404 — `/servicios/hubspot/hubspot-vs-salesforce/` — Flow Contract

> Cluster 4 de 4 del hub HubSpot. Pillar: **TASK-1352**.
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 5** +
> `docs/ui/wireframes/TASK-1404-landing-hubspot-vs-salesforce.md` + `hubspot-solutions-partner/modules/05`.

## Meta

- Status: `draft`
- Owner task: `TASK-1404`
- Surfaces: **`efeoncepro.com/servicios/hubspot/hubspot-vs-salesforce/`** (público) → HubSpot Meetings (externo) ·
  `<greenhouse-form>` embebido · **el pillar y los clusters hermanos**
- Coordina: **una** navegación externa (Meetings) · **un** submit gobernado (form) · **cero** interacciones
  in-page complejas
- **NO** coordina: modal, drawer, sidecar, popover, ni ninguna superficie del portal

## Flow Brief

🎯 **Este es el único flujo del hub cuyo lector no está solo: está en un comité, y va a tener que defender lo
que decida.**

**No está eligiendo un CRM. Está protegiendo su carrera.** Si elige HubSpot y sale mal, alguien va a sacar el
Magic Quadrant en una reunión y va a preguntar *"¿tú sabías que estaba en Niche Players?"*.
🎯 **El flujo entero existe para que él pueda contestar: "sí, lo sabía. Y acá está por qué lo elegí igual."**

Eso significa que **el objetivo del flujo no es que se convenza: es que quede armado.**

```
llega con dos PDFs contradictorios y cero confianza
   →  R2: le damos el dato que nos hace daño, primero      ← compra la credibilidad
   →  R3: el número, con TODOS los supuestos
   →  R3: y el límite de nuestro propio argumento          ← EL MOMENTO
          ("si ya tienes un admin de SF, esto se te cae")
   →  R4: y acá gana el otro, sin adornos
   →  R7: y esto se rompe si migras
   →  R11: "te armamos el TCO con tus números —
            y si te conviene Salesforce, te lo decimos"
```

🔴 **El flujo tiene tres lectores hostiles, y los tres importan:**

| Lector | Qué busca | Si lo satisfacemos… |
|---|---|---|
| **El comité** | que no le oculten nada | compra |
| 🎯 **El AE de Salesforce** | un error para señalar en la reunión | **si no encuentra ninguno, el comité tampoco** |
| 🎯 **Un abogado de Salesforce** | publicidad comparativa denigrante o falsa | **no hay carta** |

**Diseñar el flujo para el lector hostil es lo que lo hace creíble para el amistoso.**

**Y el cuarto lector, otra vez, es el LLM:** *"¿HubSpot o Salesforce?"* hoy solo devuelve a los dos vendors y a
partners de cada bando. 🔴 **Falta la comparación con supuestos declarados — y tiene que estar en el HTML servido.**

## Surfaces Involved

| # | Superficie | Rol | Owner |
|---|---|---|---|
| 1 | La página | Todo el recorrido | Esta task |
| 2 | 🎯 **El HTML servido** | El LLM lee una vez, sin JS | Esta task |
| 3 | 🎯 **Los screenshots fechados de Salesforce** *(archivados, no publicados)* | **La evidencia.** Sostienen cada claim comparativo | Esta task · Slice 1 |
| 4 | **HubSpot Meetings** (externo, pestaña nueva) | CTA primario — *"te armamos el TCO con tus números"* | HubSpot |
| 5 | **`<greenhouse-form>`** (`#tco`) | CTA secundario | Growth Forms (TASK-1320/1327) |
| 6 | **El pillar** + clusters hermanos | Reparto | TASK-1352 / 1401 / 1402 / 1403 |
| — | 🔴 **Logos de Salesforce** | **NO EXISTEN.** Mención nominativa, nada más | — |

## Flow Map

```
   CFO: "¿cuánto             RevOps: "¿nos vamos      CIO: "¿y mis
    me cuesta a 3 años?"      a quedar cortos?"        integraciones?"
          │                          │                        │
          └──────────────┬───────────┴────────────────────────┘
                         ▼
        ┌────────────────────────────────────────────────┐
        │ R1  "La comparación que ninguno de los dos      │
        │      te va a dar."                              │
        │     "Somos partner de HubSpot. Y vamos a        │
        │      empezar por lo que juega en nuestra contra."│
        └────────────────────┬───────────────────────────┘
                             ▼
        ┌────────────────────────────────────────────────┐
        │ 🎯 R2  GARTNER: HubSpot = NICHE PLAYER en SFA  │
        │    (Leaders: Salesforce, Microsoft, Oracle)     │  ◄── compramos
        │    + el contexto: Leader en B2B MA, 5.º año     │      la credibilidad
        │    "Son dos reportes distintos.                 │      con el dato que
        │     La mitad de los partners los mezcla."       │      nos hace daño
        └────────────────────┬───────────────────────────┘
                             ▼
        ┌────────────────────────────────────────────────┐
        │ 🎯 R3  EL TCO — 295k vs 611k                   │
        │    SUPUESTOS DECLARADOS ARRIBA                  │
        │                                                 │
        │    🔴 y en la MISMA región:                    │
        │    "el delta no lo hace la licencia (17%).      │  ◄── EL MOMENTO
        │     Lo hace el admin. Si ya tienes un admin     │      (acá el CFO
        │     de Salesforce, la mitad de este             │       decide que
        │     argumento se te cae."                       │       somos la
        └────────────────────┬───────────────────────────┘       única fuente
                             │                                    honesta de
        ┌────────────────────┴───────────────────┐                la mesa
        ▼                                        ▼
┌──────────────────────┐            ┌──────────────────────┐
│ 🔴 R4  DÓNDE GANA    │            │ R5  DÓNDE GANA       │
│    SALESFORCE        │  ═══════   │     HUBSPOT          │
│  CPQ · territorios · │  simétricas│  admin · adopción ·  │
│  forecasting · Apex  │  MISMO peso│  TTV · marketing     │
│                      │  tipográfico                      │
│ "Si tu caso está acá,│            │                      │
│  la respuesta es     │            │                      │
│  Salesforce."        │            │                      │
└──────────┬───────────┘            └──────────┬───────────┘
           │                                   │
           ▼                                   ▼
    ┌─────────────────┐              ┌────────────────────────┐
    │ SE VA CON       │              │ R6 agentes → /agentes/ │
    │ SALESFORCE      │              │ R7 qué se rompe        │
    │                 │              │    al migrar           │
    │ 🎯 Y NOS CREE.  │              └──────────┬─────────────┘
    │ (vuelve en 2    │                         ▼
    │  años, o nos    │            ┌──────────────────────────────┐
    │  refiere)       │            │ R11 "Te armamos el TCO con   │
    └─────────────────┘            │      tus números. Y si te    │
                                    │      conviene Salesforce,    │
                                    │      te lo decimos."         │
                                    └──────────────────────────────┘
```

## Interaction Triggers

| Trigger | Acción | Destino |
|---|---|---|
| Click **"Te armamos el TCO con tus números"** (R1 / R11) | Navegación externa | **HubSpot Meetings** + UTM · `target=_blank` `rel="noopener"` |
| Click **"Ver el TCO a 3 años"** (R1) | Scroll suave + **focus** | ancla **`#tco`** (R3). 🎯 **El CTA secundario apunta al número — es lo que el CFO vino a buscar** |
| Abrir un `<summary>` del FAQ (R9) | Expande | Nativo |
| Click a un cluster (R6 / R10) | Navegación interna | `/agentes/` · `/cuando-no-usar-hubspot/` · `/precios/` · pillar. 🔴 **El que no existe, no se pinta** |
| Submit del form (R11) | POST gobernado | Growth Forms → Success/Error Card |
| Scroll horizontal en la tabla (390 px) | Scroll **dentro del contenedor** | 🔴 **La página nunca scrollea en horizontal** |

🔴 **Ninguna interacción revela contenido.** El TCO, sus supuestos, la frase del admin y "dónde gana Salesforce"
**están visibles desde el primer byte**.

## State Machine

```
 idle ──► (scroll) ──► regiones reveladas ──► idle
   │
   ├──► click "ver el TCO" ──► scroll + focus a #tco (R3)
   │                                 │
   │                    (lee los supuestos ANTES que el número)
   │                                 │
   │                    (y el límite del argumento en la misma región)
   │                                 ▼
   ├──► click CTA ──► pestaña nueva (Meetings) ──► [fuera de nuestro control]
   │
   ├──► submit form ──┬──► OK    ──► Success Card
   │                  ├──► error ──► Error Card + reintento
   │                  └──► NO monta ──► 🔴 FALLBACK LINK visible
   │
   ├──► 🎯 SE VA CON SALESFORCE ──► [ÉXITO PARCIAL: nos cree, y vuelve o refiere]
   │
   └──► 🔴 SIN JS / CRAWLER ──► TODO visible: TCO, supuestos, admin, R4
                                 (no es degradado: es EL estado)
```

🎯 **Igual que en `/cuando-no-usar-hubspot/`, "se va con el competidor" es un estado terminal legítimo** — y no
hay ninguna transición que intente sacarlo de ahí. **Un comité al que le dijimos la verdad y eligió Salesforce
nos va a llamar cuando cambie el problema. Uno al que le ocultamos el Magic Quadrant, no.**

## Routing Contract

- **URL canónica:** `/servicios/hubspot/hubspot-vs-salesforce/` — hija del pillar. **Breadcrumb** +
  `BreadcrumbList`.
- 🎯 **El slug es la query literal** (`hubspot-vs-salesforce`). Es lo que la gente escribe y lo que el LLM matchea.
- **Enlace al pillar: obligatorio.**
- 🔴 **Un enlace a un cluster que todavía no existe NO se pinta.**
- HubSpot Meetings → **pestaña nueva**.
- Anclas: `#tco` (R3) · `#formulario` (R11).
- 🔴 **Ningún `href` sale del dominio** salvo Meetings y —**si se cita la fuente**— **las páginas oficiales de
  Gartner/HubSpot/Salesforce**. 🎯 **Enlazar a la fuente de Salesforce es correcto y fortalece la página:**
  demuestra que el dato es suyo, no nuestro. `rel="noopener"`.
  🔴 **Lo que NO se hace es reproducir su logo, su tipografía o su identidad visual.** *(Enlazar ≠ usar la marca.)*

## Focus & Accessibility

- Orden natural top→bottom. **Un solo `<h1>`.**
- 🔴 **Los supuestos del TCO viven en el `<caption>` de la tabla.** 🎯 **Un lector de pantalla recibe los
  supuestos ANTES que los números** — igual que un vidente los lee arriba. **Si los supuestos quedan después de
  la tabla, el usuario de lector de pantalla escucha el número sin su contexto: exactamente el problema que la
  página denuncia.**
- 🔴 **El ganador de cada fila comparativa va escrito, no solo codificado por color.** Verde/rojo en un
  comparativo es el patrón por defecto **y deja al usuario daltónico fuera del argumento central** (WCAG 1.4.1).
- 🔴 **R4 y R5 tienen el mismo peso tipográfico y el mismo tratamiento.** No es solo estética: **es el argumento.**
  *(Y hay una assertion GVC que lo verifica — porque "confiamos en que quedó simétrico" no es un contrato.)*
- FAQ `<details>/<summary>` nativo.
- Tabla alcanzable por teclado (wrapper `tabindex="0"` + `role="region"` + `aria-label`).
- Focus ring visible (contraste AA). Touch targets ≥ 44 px.

## Data & Command Boundaries

- **Ningún reader ni command nuevo.** La landing es **cliente**. **Full API Parity por reuso.**
- Captura → **submit gobernado de Growth Forms**. Agendamiento → **HubSpot Meetings**.
- 🔴 **El TCO es contenido editorial verificado, con su `as-of` y su evidencia archivada.** **No es un cálculo
  en vivo.** *(Una calculadora pública **miente con precisión** — y en una página comparativa, un número
  calculado mal **es publicidad engañosa**, no un bug de UX.)*
- 🎯 **Los screenshots fechados de Salesforce se archivan, no se publican.** Son **la evidencia interna** de que
  el claim era exacto en su fecha. **Publicarlos sería reproducir su identidad visual.**

## Failure Paths

| Falla | Comportamiento | Regla |
|---|---|---|
| 🔴 **JS deshabilitado / crawler de IA** | **El TCO, los supuestos, la frase del admin y R4 se leen completos** | **No es fallback: es el flujo principal** |
| 🔴 **Un claim comparativo resulta incorrecto** | **Se corrige Y se anota la corrección en la página** | 🔴 **NUNCA una corrección silenciosa.** Con archivo web de por medio, callarla **es peor que el error** |
| **Salesforce cambia sus precios** | El `as-of` + los screenshots fechados **nos protegen**: dijimos la verdad el día que la dijimos | **La fecha es la defensa** |
| **HubSpot cambia de cuadrante** | Se actualiza el MQ y se anota el año | El MQ es anual |
| **El form no monta** | 🔴 **Fallback link visible** | **El CTA nunca muere** |
| 🎯 **El comité elige Salesforce** | **Nada. Es un éxito parcial: nos cree.** | **No hay retargeting agresivo ni exit-intent** |
| Un cluster hermano no existe | Su enlace no se pinta | Nunca un 404 interno |

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-vs-salesforce` · Viewports **1440 + 390**
- Pasos: cargar → capturar R2 → click "Ver el TCO" (**verificar scroll + focus a R3**) → 🎯 **capturar el TCO
  con sus supuestos y la frase del admin** → 🎯 **capturar R4 y R5 juntas (verificar simetría)** → abrir 2 FAQs
  → click CTA
- Capturas: full-page (desktop + mobile) · **R2** · 🎯 **el TCO completo** · 🎯 **R4 + R5 lado a lado** ·
  FAQ abierto · **reduced-motion** · **tarjetas en 390 px**
- **Assertions:**
  - 🔴 **Sin JS:** TCO + supuestos + **frase del admin** + R4 están en el HTML servido
  - 🔴 **`"Líder en CRM"` y `Forrester` NO existen** en el DOM
  - 🔴 **`Pardot` no aparece junto a `muerto`/`obsoleto`/`descontinuado`**
  - 🔴 **La frase del admin existe** *(assertion literal)*
  - 🔴 **La sección "Dónde gana Salesforce" existe** *(assertion literal)*
  - 🎯 **R4 y R5 tienen el mismo `font-size` de encabezado** *(la simetría, verificada — no asumida)*
  - 🔴 **Ningún `<img>` / SVG con la marca o el logo de Salesforce**
  - **Los supuestos están en el `<caption>`** de la tabla del TCO
  - 🔴 **Cero contadores animados** · `as-of` visible
  - **Enlace al pillar presente** · breadcrumb · canonical · un solo `<h1>` · sin scroll horizontal

## Design Decision Log

- 🎯 **Decisión: el flujo no busca convencer. Busca ARMAR al lector.** Está en un comité y va a tener que
  defender su decisión. El éxito del flujo es que pueda decir *"sí, sabía lo del Magic Quadrant. Y acá está por
  qué elegí igual."* **Todo el orden de las regiones sirve a eso.**
- 🎯 **Decisión: el dato que nos hace daño va primero (R2).** El AE de Salesforce va a llegar con el MQ impreso.
  **La única forma de sobrevivir a un dato en contra es traerlo tú, con contexto** — si lo trae él, el contexto
  es suyo y nosotros quedamos ocultando información.
  **Alternativa descartada:** *no mencionar el MQ* — es lo que hace todo el mercado, **y es exactamente por lo
  que ningún comité les cree.**
- 🎯 **Decisión: el límite de nuestro propio TCO va en la misma región del TCO.** *"Si ya tienes un admin de
  Salesforce, la mitad de este argumento se te cae."* **Un argumento que se derrumba solo en la última reunión
  es peor que uno declarado frágil desde el principio** — y este se derrumba **en el 100% de los deals donde el
  cliente ya tiene Salesforce**, que son **justo los que esta página persigue**.
  **Alternativa descartada:** *nota al pie* — la versión cobarde. **Y el CFO lee las notas al pie.**
- 🎯 **Decisión: el flujo se diseña para tres lectores hostiles** (el comité escéptico, el AE de Salesforce, un
  abogado de Salesforce). **Si ninguno encuentra un error, el comité tampoco puede.** Y la pasada legal deja de
  ser burocracia: **es parte del diseño.**
- 🔴 **Decisión: enlazamos a la fuente de Salesforce, pero no usamos su marca.** Enlazar **fortalece** (demuestra
  que el dato es suyo). Reproducir su logo **es uso de marca ajena**. **Son cosas distintas y la página las
  distingue.**
- **Decisión: el TCO no se calcula en vivo.** Una calculadora **miente con precisión** — y en una página
  comparativa, **un número mal calculado no es un bug de UX: es publicidad engañosa.** El TCO es contenido
  verificado, con evidencia archivada, y **el número del cliente sale de una conversación** — que es el CTA.
- **JOLT:** la indecisión de un comité es **miedo a que le oculten algo**. **Se desarma mostrando lo que uno
  mismo preferiría ocultar.** Esta página es esa jugada, llevada al extremo.

## Acceptance Checklist

- [ ] 🔴 **La página se lee entera sin JavaScript** (TCO, supuestos, frase del admin, R4).
- [ ] 🔴 **`"Líder en CRM"`, `Forrester` y `Pardot muerto/obsoleto` no existen en el DOM.**
- [ ] 🔴 **La frase del admin está en la región del TCO, sin suavizar.**
- [ ] 🔴 **"Dónde gana Salesforce" existe** y es **simétrica** a "dónde gana HubSpot" *(assertion verificada)*.
- [ ] 🔴 **Cero logos / identidad visual de Salesforce.** Enlaces a la fuente ✅, marca ❌.
- [ ] Los supuestos del TCO están en el `<caption>` (accesibles **antes** que los números).
- [ ] El ganador de cada fila va **escrito**, no solo por color.
- [ ] CTA dual con **fallback honesto**; el form no se reconstruyó.
- [ ] **Enlace al pillar presente.** Ningún `href` a un cluster inexistente.
- [ ] Focus + contraste AA. Un solo `<h1>`. Breadcrumb + canonical.
- [ ] **Ningún reader/command nuevo** — reuso gobernado (Full API Parity).
- [ ] GVC con las assertions de arriba, capturado **y mirado**.
