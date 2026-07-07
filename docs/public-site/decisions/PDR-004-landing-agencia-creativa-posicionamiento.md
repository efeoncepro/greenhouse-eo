# PDR-004 — Posicionamiento de la landing "Agencia Creativa"

> **Tipo:** Product Decision Record (posicionamiento/GTM de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento) — sesión de diseño con el operador, 2026-07-06.
> **Skills:** `commercial-expert`, `efeonce-agency`, `growth-marketing-cro`, `seo-aeo`, `digital-marketing`, `design-studio`, `product-design-loop`.
> **Ejecución:** [`TASK-1350`](../../tasks/to-do/TASK-1350-landing-agencia-creativa.md) (+ [wireframe](../../ui/wireframes/TASK-1350-landing-agencia-creativa.md) + [flow](../../ui/flows/TASK-1350-landing-agencia-creativa-flow.md)). Epic: `EPIC-019`. Delta operador 2026-07-07: primer candidato live en WordPress + Elementor modular widgets en `/agencia-creativa-v2/`; el posicionamiento de este PDR se mantiene.
> **No-duplicación:** el sustrato estratégico ya vive en el context pack — este PDR **cita**, no copia: `docs/context/07_ico.md` (cadena de eficiencia → TTM), `docs/context/09_marca-agencia.md` (masterbrand + messaging por audiencia), `docs/context/13_icp-buyer-personas-jtbd.md` (Globe ICP1 "Escalar producción" + ICP3 "Ejecución a escala").

## Contexto

Efeonce no tenía una landing pública que posicionara su **capability creativa** (Globe) como oferta de marca — solo landings de servicio puntual (SEO/`TASK-1343`, desarrollo web/`TASK-1345`). El 68% de los compradores B2B dice que todas las agencias suenan igual (`09_marca-agencia`). Este PDR fija **cómo se posiciona públicamente** la oferta creativa para que la ejecución (`TASK-1350`) y cualquier campaña/variante futura partan de un marco compartido, sin re-litigar el ángulo.

## Decisión — cuatro capas que se refuerzan

### 1. Partner de producción que escala (no reemplazo)

El comprador es el **departamento de marketing y/o equipo creativo in-house** de una empresa **mid-market o enterprise** (decisor típico: Director/Gerente de Marketing; sponsor: CMO/CEO; validador: Compras). Ya tienen equipo; el dolor es que **no producen a la velocidad/volumen que el negocio exige** (mapea a Globe ICP1 "Escalar producción" e ICP3 "Ejecución a escala" en `13`). Efeonce **NO los reemplaza**: es la **capacidad de producción creativa que les permite escalar** su output sin sumar headcount y **sin perder control ni visibilidad**.

- Línea unificadora: **"Tu equipo dirige. Nosotros producimos a escala. Y lo ves todo."**
- Fricción que desactiva: el miedo del equipo in-house a tercerizar = perder control (lo resuelve la capa 2).

### 2. Time-to-Market como ventaja competitiva MEDIBLE

La ventaja no es "somos rápidos" (commodity); es **producir más rápido sin perder calidad, probado con el número**. Es el **output medido de la cadena de eficiencia de ICO** (`07`): más piezas bien a la primera (**FTR = guardrail de calidad**) + menos rondas (RpA) → ciclo más corto → **Time-to-Market más corto** → Revenue Enabled. El **TTM es el titular** (resultado de negocio: llegas al mercado a tiempo); FTR es la prueba de que la velocidad no cuesta calidad; la transparencia lo hace *visible*, no una promesa.

- Línea: **"Producir más rápido, sin bajar la calidad. Y con el número para probarlo."**
- Regla dura: liderar con la versión **medible/probada** (TTM + FTR), nunca con "agilidad" a secas.

### 3. Ejecución "Design Engineer" (arte + color + ingeniería)

El **medio es el mensaje**: la landing debe *probar* craft técnico, no describirlo. Concepto = **arte + color + ingeniería**: assets art-dirigidos producidos con el **stack IA propio** (`fal.ai` / Higgsfield / Magnific / Adobe CC — ver [catálogo fal.ai](../../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md)), montados como experiencia performante e interactiva. Decisión original 2026-07-06: build **WordPress code-custom** (theme + bundle Vite para islands), **NO Elementor**. Delta operador 2026-07-07: para implementar el diseño aprobado en `~/Documents/Creative/Ejecución de task 1350/`, el primer candidato se construye en WordPress con **Elementor por módulos/widgets propios**, no como HTML gigante. La fuente de diseño es el HTML rico aprobado (`TASK-1350 Landing Agencia Creativa.dc.html`), no los screenshots iterativos. Disciplina vigente: preservar craft/layout/motion desde widgets gobernados, art direction primero (evitar "AI slop"), color tokenizado, performance como señal de craft, `prefers-reduced-motion` + contraste AA. Evidencia del candidato: contrato de motion `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`, Playwright live desktop/mobile/reduced-motion y auditoría computada de colores fuente, keyframes, hover states y reduced-motion.

### 4. Marca y conversión

- **Lidera la masterbrand Efeonce** (Globe/Reach/Wave nunca solos; Globe Studio solo como "| Efeonce"). Beneficios antes que siglas (ICO/RpA/FTR solo en el bloque de prueba). Tuteo.
- **CTA primario: "Agenda una reunión"** → HubSpot Meetings + UTM; fallback `/contacto/`+WhatsApp/mailto. CTA secundario "Mira cómo medimos" (apalanca la transparencia).
- **Solo casos citables** (Sky +127% tráfico orgánico, Bresler +180% ventas digitales, Pinturas Berel retainer SEO+AEO, SSilva). **NUNCA GEA** ni cifras infladas.

## Consecuencias

- La landing es un **nodo de la capa de adquisición** (demand-capture) del ecosistema ([PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md)) en `efeoncepro.com`.
- El bloque diferenciador usa cifras **ilustrativas** del modelo (no live del portal); conectar data real sería una decisión/task aparte.
- Coherencia de marca: el bloque de operaciones medibles debe *verse* como el producto real (Greenhouse) — el claim de transparencia que el portal materializa.

## No-goals

- No es self-serve, no expone el portal ni datos de cliente, no vende un servicio puntual (esos son otras landings del EPIC-019).
- No lidera con "somos ágiles/rápidos" sin la prueba medible.
- No migra a Astro ni cambia de host. El candidato 2026-07-07 queda en WP/Elementor modular por override explícito del operador; una variante code-custom futura requeriría nueva decisión de ejecución.
- No genera logos de operating-entity por IA.
