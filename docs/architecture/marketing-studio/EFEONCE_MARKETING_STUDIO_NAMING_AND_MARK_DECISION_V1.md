# ADR — Efeonce Marketing Studio: «Studio» como nombre corto y su marca

- **Status:** Accepted (nombre) · Proposed (marca, en revisión)
- **Date:** 2026-10-02
- **Owner:** Efeonce Brand / Product
- **Scope:** cómo se nombra y abrevia Efeonce Marketing Studio frente a Efeonce Globe (Creative Studio), y el sistema de marca de producto que lo acompaña. No cambia rutas, dominios, código, datos ni contratos de API.
- **Reversibility:** two-way-but-slow. Los rótulos se pueden cambiar; una vez en el portal, íconos de app y piezas comerciales, el cambio tendrá inercia de marca.
- **Confidence:** high para la regla de nombres (decisión explícita del operador); medium para la marca, que espera aprobación del acento y del gris del ícono.
- **Validated as of:** 2026-10-02. Decisión del operador en la sesión de diseño del logo (canvas «Logo Marketing Studio»), contrastada con el contexto de producto, la ADR de Globe y el dominio vivo.

## Context

Efeonce tiene dos productos con «Studio» en su nombre:

- **Efeonce Marketing Studio** (`studio.efeonce.org`, [arquitectura](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)): el sistema de registro de campañas. Ya ocupa la palabra en su dominio.
- **Efeonce Globe**: su nombre canónico es Globe; **Creative Studio** es su descriptor funcional y su nombre público sigue pendiente ([ADR de Globe](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md), [contexto de producto](../../context/03_ecosistema-producto.md)). Globe ya tiene logo e isotipo propios en `@efeoncepro/axis-brand-assets` y su interfaz se titula «Globe · …».

Al diseñar el logo de Marketing Studio hizo falta una forma corta. «MKT» se descartó: Efeonce ya es una agencia de marketing y tecnología, así que repetía lo que la nave de Efeonce ya dice. «Studio» es lo que distingue al producto, pero abreviado a secas podía confundirse con Creative Studio.

## Decision

1. **«Studio» a secas es Efeonce Marketing Studio.** La forma corta del producto es **Efeonce | Studio** (y «efeonce Studio» en compacto). La respalda el dominio `studio.efeonce.org`.
2. **Globe se llama Globe.** «Creative Studio» queda sólo como descriptor y, hacia afuera, siempre acompaña a Globe («Globe, el estudio creativo de Efeonce»). Nunca se abrevia a «Studio» ni se usa como nombre suelto en una superficie visible para clientes o el público.
3. **Las abreviaturas acortan el producto, nunca la marca.** Donde Efeonce no está ya en pantalla, la pieza la lleva: el lockup, el compacto o el ícono con la nave de Efeonce.
4. **Sin «MKT».** No se usa como abreviatura del producto.

La documentación técnica interna (arquitectura, tasks, modelos de negocio, nombres de repos y skills) puede seguir usando «Creative Studio» como descriptor de Globe: la regla rige lo que ve un cliente o el público.

## Marca de producto (Proposed)

Sigue la regla de la familia de submarcas (`axis-brand-assets` 0.4.2, «la órbita vive en la O»): «Marketing Studio» en Poppins Bold, la «o» de Studio cambiada por un anillo fino con la esfera a la 1:30 y un corte alrededor; junto a Efeonce, el producto en el gris medido de la marca y sólo la esfera en el acento.

| Pieza | Dónde va |
| --- | --- |
| Lockup **Efeonce \| Marketing Studio** | Por defecto, siempre que quepa |
| Lockup **Efeonce \| Studio** y compacto **efeonce Studio** | Espacios angostos, chips, junto a otros productos |
| Ícono: la nave de Efeonce sobre «Studio» liso | Fuera del portal: ícono de app, avatar, sticker (una sola esfera: la de la nave) |
| Símbolo: la **S** rodeada por la órbita | Sólo dentro del portal: favicon y barra colapsada; «Studio» solo encabeza la barra abierta |

Pendiente para pasar a Accepted: el acento de la esfera (propuesto: Growth, el de la marca madre, como Insights; alternativas Voice y Brand; Engine queda para SV360/AEO) y si «Studio» va en gris o en blanco en el ícono. Al aprobarse, los archivos se generan con un script en `scripts/brand/` (mismo método que `build-seo-aeo-logos.mjs`), se publican en `@efeoncepro/axis-brand-assets` y se sellan; nunca se editan a mano.

## Consequences

- **Positivas:** cada producto tiene una sola forma de nombrarse; la abreviatura de Studio respeta la regla de la familia (la órbita en su «o»); Globe conserva su nombre propio y su planeta.
- **Costo:** las superficies visibles que hoy usan «Creative Studio» como nombre suelto deben revisarse. Inventario al 2026-10-02: el catálogo de servicios de los decks de propuesta (`src/lib/brand-surfaces/**`, `src/lib/artifact-composer/catalogs/graphic-line-deck/proposal-cinematic.slots.json`) y el pilar publicado de Creative Workflows (`docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V1.json`). Cada cambio se propone al operador antes de aplicarse; los catálogos de decks pasan por `pnpm composer:visual-gate`.
- **Riesgo residual:** una pieza suelta (ícono de app, avatar) con «Studio» puede leerse como Creative Studio mientras el nombre público de Globe no esté fijado; por eso el ícono lleva la nave de Efeonce y Globe se presenta siempre como Globe.
