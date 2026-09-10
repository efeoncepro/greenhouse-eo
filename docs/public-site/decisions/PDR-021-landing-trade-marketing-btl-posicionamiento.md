# PDR-021 — Posicionamiento de la landing Trade Marketing & BTL

> **Tipo:** Product Decision Record de posicionamiento y conversión del sitio público.
> **Estado:** Draft for validation · 2026-09-10
> **Ejecución propuesta:** `TASK-1860` · `EPIC-019`
> **Línea de negocio:** Channel & Commerce — ADR [`EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1`](../../architecture/EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md)
> **Skills:** `copywriting`, `growth-marketing-cro`, `seo-aeo`, `commercial-expert`, `greenhouse-growth-forms`,
> `greenhouse-growth-ctas`, `greenhouse-growth-meetings`, `efeonce-public-site-wordpress`,
> `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`, `modern-web-guidance`.

## Contexto

Efeonce abrió la línea Channel & Commerce el 2026-09-10 con un catálogo canónico de 23 servicios —13 de trade
marketing, 9 de BTL y 1 transversal— y ninguna superficie pública que la represente. Sin landing, la línea sólo
existe en conversaciones salientes, que es justo el motor comercial con peor win rate histórico (2–3 %).

Tres hechos condicionan esta página y no son opinables:

1. **La demanda está en el término cabeza, no en el modificador comercial.** En Chile, `trade marketing` tiene
   ~880 búsquedas mensuales; `agencia de trade marketing`, ~10; `servicios de trade marketing`, 0 (Semrush, base
   `cl`, `as-of 2026-09`). El patrón `/servicios/agencia-de-…` que funcionó para influencers no aplica acá.
2. **El SERP del término cabeza es mayoritariamente informativo y de empleo.** Universidades, blogs,
   Wikipedia y definiciones compiten con LinkedIn Jobs, Computrabajo, Chiletrabajos e Indeed. Los actores
   comerciales que aparecen son el peer set de las battlecards: Treid, Touch Latam, tmktchile, stmtrade, Involves.
3. **El comparison set real ocupa los dos extremos.** Las plataformas de retail execution detectan pero no
   ejecutan; las agencias de terreno ejecutan pero entregan un reporte descriptivo. Ninguna conecta la góndola
   con la inversión digital. Evidencia en el [benchmark](../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md)
   y las [battlecards](../../audits/commercial/CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md).

El contrato SEO/AEO de esta página vive en el
[Landing SEO/AEO Brief V1](../CHANNEL_COMMERCE_LANDING_SEO_AEO_BRIEF_V1.md).

## Decisión de posicionamiento

### One thing

> **Trade marketing que te dice qué arreglar primero, lo arregla y lo demuestra.**

Toda la página sirve a esa idea. Lo que no la sirve, se corta.

### Promesa

Auditamos la ejecución del canal tienda por tienda, priorizamos qué intervenir según impacto y costo, lo
ejecutamos y lo leemos junto a la inversión digital de la marca. Un solo responsable y evidencia validada en cada
ciclo. **No** prometemos venta, sell-out, share ni rotación: dependen de precio, surtido, negociación con la
cadena y demanda, que la línea no controla.

### Comprador

| Rol | Quién | Qué necesita leer en la página |
|---|---|---|
| **Operador y champion** | Trade Marketing Manager, Category Manager, Jefe de Trade | Que dejará de armar el consolidado de ejecución a mano y tendrá argumento propio ante Comercial |
| **Economic buyer** | Gerente Comercial o Director de Ventas — **no Marketing** | Que la inversión de canal se puede defender con evidencia y que hay un solo responsable |
| **Governance** | Finance y Compras | Que el cobro es transparente, sin porcentaje sobre la inversión y sin letra chica |

La página se escribe para el operador, porque es quien busca, lee y reenvía. El mensaje para el economic buyer
viaja en la sección de responsabilidad y en la FAQ de cobro.

### Posición: en el medio

| | Plataforma de ejecución | Agencia de terreno | Efeonce |
|---|---|---|---|
| Qué hace | Detecta y prioriza | Ejecuta en la tienda | Opera el ciclo completo |
| Qué entrega | Alertas y tableros | Un reporte que describe | Una lista priorizada, la corrección y la lectura del ciclo |
| Qué le falta | Alguien que vaya a la tienda | Priorizar y demostrar | — |
| Lo digital | No lo toca | No lo toca | Lo cruza con retail media, anaquel digital y visibilidad en IA |

La comparación se hace **por tipo de proveedor, nunca por nombre de empresa**, con nota visible de que cada caso
varía. Nombrar competidores en una página pública queda prohibido.

### Diferenciación demostrable

La página muestra, no afirma, el ciclo:

```text
estándar → cobertura → priorización → intervención → lectura
                                                        ↓
                          conexión con retail media · anaquel digital · visibilidad en IA
```

La sección firma lo hace visible con una góndola anotada que se convierte en una lista priorizada, rotulada como
ejemplo ilustrativo.

## Arquitectura de la oferta en la página

Los 23 servicios **no** se presentan como un muro de tarjetas. Se agrupan como los compra el mercado:

| Familia | Grupo en la página | Servicios del catálogo |
|---|---|---|
| Trade marketing | Entender | T1 Diagnóstico de Ejecución · T2 Auditoría de Inversión · T9 Estándar de Tienda Perfecta · T10 Arquitectura de Distribución |
| Trade marketing | Medir cada ciclo | T3 Cobertura Auditada · T5 Orquestación de Terreno · T11 Integración de Datos de Canal |
| Trade marketing | Intervenir | T4 Equipo de Terreno Gestionado · T8 Promociones · T12 Capacitación del Canal · T13 Gestión de Categoría |
| Trade marketing | Conectar con lo digital | T6 Anaquel Digital y Visibilidad en IA · T7 Retail Media y Commerce |
| BTL | En la tienda | B1 Activaciones en Sala · B2 Promotoría e Impulso · B3 Visual Merchandising |
| BTL | Fuera de la tienda | B4 Roadshow · B5 Street Marketing y Sampling · B6 Pop-up |
| BTL | En eventos | B7 Patrocinios · B8 Ferias · B9 Encuentros de Canal |
| Transversal | Línea bajo BTL | X1 Contenido y Material de Canal |

Los nombres de servicio son canon del catálogo y no se renombran en la página.

## Conversión y funnel

```text
orgánico (término cabeza + modificadores) · referral · enlaces internos · menú · outbound con radiografía
        ↓
landing: definición útil → problema → posición → ciclo → prueba de método → servicios → FAQ
        ↓
brief de canal (intención media) ───┐
                                    ├→ calificación comercial (cobertura, canal, necesidad)
reunión (intención alta) ───────────┘
        ↓
diagnóstico de alcance cerrado → ciclo recurrente → expansión
```

- **CTA primario:** `Agenda una reunión` — Growth CTA con `open_meeting_scheduler` sobre el surface de Meetings
  existente. Es la única acción con relleno en toda la página.
- **CTA secundario:** `Cuéntanos tu canal` — lleva al brief inline, un Growth Form gobernado nuevo
  (`efeonce-channel-commerce-brief`). Pide lo mínimo para calificar: categoría, canal, necesidad y cobertura
  aproximada. **No pide presupuesto**: la inversión de trade es información sensible y pedirla en frío baja la
  completitud; la cobertura cumple la función de calificación que el modelo de caja necesita.
- **Desvío de empleo:** una línea discreta bajo la definición redirige a quienes buscan trabajo en trade, si el
  sitio tiene página de vacantes. Reduce rebote y spam del formulario sin esconder la página del término cabeza.

## Prueba y honestidad

- **No hay casos de la línea todavía.** La página no inventa, no insinúa y no reutiliza resultados de otras
  líneas como si fueran de trade.
- La prueba es **de método**: qué recibe el cliente en cada ciclo, el ejemplo ilustrativo de la góndola y la
  sección de lo que no se promete.
- El carrusel de marcas se permite sólo con rótulo de empresa —`Marcas que confían en Efeonce`— y sin texto de
  trade adyacente que sugiera que son clientes de la línea.
- Toda ilustración o ejemplo lleva rótulo visible de referencial. Si se usan activos generados con IA, se declara.
- El único dato fechado de la página —la jornada de 42 horas desde el 26-04-2026, 40 en 2028, sin reducción de
  sueldo— se publica con su fuente y fecha, y se revisa antes de cada cambio de copy.

## Lo que la página no dice

- **Cómo Efeonce estructura su ejecución.** La página comunica operación y responsabilidad únicas; no menciona
  proveedores ni subcontratación. Esa información se entrega a procurement cuando corresponde, nunca en el pitch.
- Que el mercado no mide, que un competidor no reporta, o que Efeonce trae tecnología que no existe en Chile.
- Precios, bandas, cobertura nacional o tiempos de respuesta.
- "Perfect Store" como resultado: se usa como vocabulario del comprador, no como promesa.

## No-goals

- Una guía editorial de "qué es el trade marketing": la definición es una cápsula útil, no el cuerpo de la página.
- Un formulario de procurement o de licitación.
- Una radiografía gratuita como lead magnet público: cada una cuesta misiones reales y la capacidad no está
  dimensionada. Queda como activo de prospección saliente.
- Un runtime, form engine, scheduler, CTA o tracking nuevo.
- Implementar antes de tener copy ledger, dirección visual, form contract y tracking plan aprobados.

## Consecuencias

- La landing es una spoke de demand-capture en `efeoncepro.com`, bajo el hub `/servicios/`.
- Requiere un Growth Form y un Growth CTA nuevos, autorizados por el lifecycle existente; no hay backend nuevo.
- Entra al menú en el grupo `Crecimiento Multicanal`, junto a Performance y Content.
- Abre la posibilidad de satélites por sub-intención comercial con volumen propio —promotoras, mystery shopper,
  material POP, visual merchandising—, que quedan como follow-up condicionado a evidencia.

## Validaciones pendientes

1. Segunda fuente de demanda (DataForSEO negó autorización en esta sesión) y confirmación del slug `/servicios/trade-marketing/`.
2. Riesgo de canibalización con `/servicio-gestion-campanas-publicitarias/` por retail media.
3. Existencia de una página de vacantes pública para el desvío de empleo.
4. Revisión legal de la tabla comparativa por tipo de proveedor y del dato laboral fechado.
5. Nombre, campos y destino final del brief; duración real del meeting del surface `discovery`.
6. Aprobación de la dirección visual y del copy ledger por el owner de la línea.
