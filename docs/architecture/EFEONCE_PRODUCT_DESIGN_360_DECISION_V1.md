# Efeonce Product Design 360 — Capability & Offer Architecture Decision V1

## Architecture Decision 2026-09-10 — Product Design 360 como capability de oficio con dos ofertas

- **Status:** Proposed
- **Date:** 2026-09-10
- **Owner:** Efeonce Strategy + Wave + Design (owner comercial por confirmar)
- **Required partners:** Finance (piso de margen por lane, loaded cost local) · Legal/IP (IP del design system, datos de research, portfolio rights) · Commercial (validación G1) · Web Experience 360 (composición de la superficie de sitio público)
- **Scope:** ubicación de Product Design / UI-UX en el portfolio, separación capability ↔ oferta, las dos superficies y sus compradores, la arquitectura de lanes, las reglas de composición con Web Experience 360 y Creative Services, y los invariantes comerciales
- **Reversibility:** two-way — documental; no hay runtime, schema ni contrato firmado. Revertir = retirar la sexta familia y replegar la capability dentro de Web Experience 360 (salida prevista si falla G1)
- **Confidence:** high para boundaries, taxonomía y la separación capability/oferta · medium para posicionamiento competitivo · **low para demanda, willingness-to-pay y cost-to-serve** · **nula para mid-market y LATAM** (la evidencia es enterprise NA/EU)
- **Validated as of:** 2026-09-10
- **Canonical model:** [`Product Design 360 — Business Model V1.1`](../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md)
- **Service catalog:** [`Ficha de servicio`](../services/wave/product-design-360.md)
- **Evidence:** §15 del modelo — investigación de mercado 2026-09-10 (cuatro frentes), WebAIM Million verificado en fuente primaria, precios verificados en la página de cada proveedor

### Contexto

Product design y UI/UX no estaban modelados en ninguna parte del portfolio. El [ADR de Wave](EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md)
le entregó a **Web Experience 360** el *diseño técnico, delivery y operación* de la web —construir y operar—, y a
**Globe** el contenido y la producción creativa. Nadie poseía **decidir cómo debe ser la experiencia**: research,
arquitectura de información, flujos, prototipado, interfaz, design system, accesibilidad, validación y design ops.

La disciplina caía en la costura entre Wave (ingeniería) y Globe (producción), y es precisamente el oficio con el
que Efeonce construye Greenhouse —AXIS, la UI Platform, GVC, el Premium UI Delivery Standard—, sin haberlo vendido
nunca como servicio nombrado.

La investigación de mercado agregó tres hechos que condicionan la forma de la oferta:

- **El comprador mid y enterprise ya tiene equipo de diseño in-house.** Una oferta de sustitución compite con él;
  una de extensión de capacidad lo convierte en comprador.
- **El oficio es uno, los compradores son dos.** El sitio público vive en el presupuesto de Marketing (CMO); el
  producto, en el de Producto/Tecnología. Mismo trabajo, dos comités.
- **Nadie vende capacidad de *producto*; todos venden producción.** Las suscripciones llegan hasta landing pages;
  Superside incluye UI/UX como *specialist production* sin página de servicio; A.Team y Andela pivotearon a
  ingeniería. El único comparable directo vende por persona, no como capacidad gobernada.

### Decisión

1. **Product Design 360 se propone como sexta familia de Wave**, modelada como **capability**: posee el oficio
   —método, gente, quality gates, práctica de design system, telemetría— en todas las superficies.

2. **Dos ofertas consumen la misma capability**, separadas por comprador, no por oficio:

   | Superficie | Vende y responde por el outcome | Comprador |
   |---|---|---|
   | **Producto** — app, portal de cliente, SaaS, herramienta interna | **Product Design 360** | Head of Design → CPO/CTO |
   | **Sitio público** — marca, campaña, landings | **Web Experience 360**, consumiendo esta capability | CMO → Head of Digital |

   No es gramática nueva: las familias de Wave ya son capabilities base sobre las que se componen ofertas.

3. **Motion primario: extensión de capacidad, no sustitución.** El comprador principal tiene equipo in-house. El
   diseño integral para clientes sin equipo queda como motion secundario.

4. **Se venden lanes, no diseñadores.** Siete lanes, priorizadas por evidencia:
   L1 Accesibilidad · L2 Design system y tokens · L3 Research y validación · L4 Entrega de diseño (UI/UX) ·
   L5 Deuda de diseño y consistencia · L6 Design ops · L7 Endurecer lo generado con IA.

5. **L1 y L2 son compartidas entre superficies y se contratan una sola vez por cliente**, aunque compre las dos.

6. **Tres razones de compra, con recurrencia distinta:** expansión de capacidad y gap estructural nacen
   recurrentes; sólo el deterioro entra como proyecto y requiere conversión declarada a sostener.

7. **Unidad de cobro: envelope de capacidad mensual por lane.** El gobierno es línea propia.

### Invariantes duros

- **NUNCA** vender diseño por hora ni por pantalla.
- **NUNCA** dos ofertas de Efeonce compitiendo por la capacidad de diseño de la misma cuenta: una sola propuesta,
  con owner declarado por lane.
- **NUNCA** vender Staff Augmentation prometiendo outcome, ni usar "staff augmentation" como sinónimo de squad
  dedicado. La deriva a staff augmentation es métrica de alarma.
- **NUNCA** vender L4 (entrega de diseño) sola a un cliente con equipo in-house: se lee como sustitución.
- **NUNCA** firmar un Digital Product Design sin vía de implementación declarada.
- **NUNCA** recitar el contrato anti-desplazamiento como argumento de venta: es norma de delivery y cláusula de SOW.
  En el pitch sólo se dice la elección de frentes, como oferta de control.
- **NUNCA** presentar la capability interna (AXIS, UI Platform, GVC) como caso de cliente.
- **NUNCA** citar un comparable de precio que no esté verificado en la página del propio proveedor.
- **NUNCA** mostrar a un comprador chileno cifras de costo de EE.UU. sin rehacer el cálculo con loaded cost local.
- **SIEMPRE** declarar en todo SOW de arreglo el sostener que le sigue.
- **SIEMPRE** separar lo que se firma como SLA de lo que sólo se muestra como telemetría, antes de la reunión.

### Frontera con Creative Services / Globe — sin cambio de ownership

Product Design 360 diseña **la interfaz y el sistema con el que alguien opera algo**. Globe produce **contenido,
marca y piezas**. *Un brandbook no es un design system.* Cuando un engagement necesita ambas, se declara
composición con owner por lane.

### Lo que esta decisión NO hace

- No aprueba la sexta familia en el ADR de Wave: la deja registrada como propuesta.
- No autoriza precios, tarifario, claims públicos, venta general ni el nombre público "Product Design 360"
  (decisión abierta D1 del modelo: puede leerse como diseño industrial en LATAM).
- No convierte el moat de *accountability medida* en diferenciador probado: la investigación encontró un hueco de
  **oferta**, no una demanda articulada. Queda como hipótesis a validar.
- No cambia el ownership de ninguna capability existente.

### Condición de aceptación

Pasa a `Accepted` cuando se cumplan, en orden:

1. **G1** — demanda externa verificada: ≥3 Sample Sprints vendidos a 2 clientes distintos en 90 días, o su
   equivalente vía la Calculadora de Capacidad de Diseño si se adopta como experimento de G1.
2. **Posición de Legal** sobre IP del design system, datos de research y portfolio rights.
3. **Piso de margen por lane** fijado por Finance, con loaded cost local verificado (decisión abierta D7).
4. **Marco legal chileno de accesibilidad** verificado, antes de usar el argumento legal con clientes locales.

Si G1 falla, la salida prevista es **replegar la capability dentro de Web Experience 360** — decisión correcta, no
fracaso.

### Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| Capability dentro de Web Experience 360 | Subordina el diseño a "la web" e impide venderlo a quien tiene producto sin sitio nuevo. **Es la salida si G1 falla** |
| Capability transversal de Efeonce, sin familia | Sin dueño comercial que la venda |
| Una sola oferta para producto y sitio público | Mismo oficio, dos comités y dos presupuestos: una familia con dos compradores es el error de empaquetado que la investigación diagnosticó |
| Vender diseñadores dedicados | Es el único comparable directo existente; competir en su forma es competir por tarifa sin gobierno, sin memoria y sin margen defendible |
