# Efeonce Channel & Commerce — Line & Offer Architecture Decision V1

## Architecture Decision 2026-09-10 — Abrir Channel & Commerce (trade marketing y BTL) como línea de negocio

- **Status:** Accepted
- **Date:** 2026-09-10
- **Owner:** Julio Reyes (owner de línea, interino) + Efeonce Strategy + Commercial
- **Required partners:** Finance (economics, caja, factoring) · Legal (figura de subcontratación) · Operations (capacidad) · Wave, Media & Distribution y Creative Services por composición
- **Scope:** apertura de la línea, taxonomía de la oferta (23 servicios en dos familias + una transversal), modalidad operativa, boundaries con líneas existentes, mercado inicial y secuencia por fases
- **Reversibility:** two-way-but-slow — revertir implica retirar la oferta del mercado y desmontar compromisos con proveedores; no hay runtime ni schema comprometido
- **Confidence:** high para taxonomía, boundaries y modalidad operativa · medium para posicionamiento competitivo · **low para demanda, willingness-to-pay y cost-to-serve**
- **Validated as of:** 2026-09-10
- **Evidence:** [`benchmark del mercado chileno`](../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md) · [`battlecards competitivas`](../audits/commercial/CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md)

### Contexto

Efeonce no tenía oferta de trade marketing ni de BTL. El dominio existía parcialmente y disperso: retail media
dentro de Media & Distribution, producción de piezas en Creative Services, medición en Wave. Ninguna de esas
capacidades resuelve la pregunta que un Gerente Comercial se hace cada ciclo: qué pasó en la góndola, qué costó y
dónde reasignar el próximo peso.

El benchmark del mercado chileno mostró un mercado consolidado con dos categorías ocupadas y un hueco entre ellas:

- **Software de retail execution** (Teamcore, Frogmi, Trax, Storecheck, Involves) detecta y prioriza, pero **no
  ejecuta**. Teamcore declara 500+ marcas en 20+ países y opera con respaldo de private equity.
- **Agencias de servicio integrado** (Touch Latam, Novaprom, Tradercom, ECR, Treid) ejecutan, pero su evidencia
  es un reporte descriptivo, no una decisión priorizada.
- **Ninguna de las dos conecta la ejecución física con la inversión digital de la marca** —retail media de la
  cadena, anaquel digital, visibilidad en motores de respuesta IA—, que es donde la categoría global se está
  moviendo y donde Efeonce tiene capacidad instalada.

### Decisión

1. **Se abre Channel & Commerce como línea de negocio**, con nombre de mercado *trade marketing* y nombre interno
   `Channel & Commerce` porque su alcance excede la ejecución en punto de venta. Owner interino: Julio Reyes.

2. **La oferta es completa desde el primer contrato**: 23 servicios en dos familias reconocibles por el mercado
   —13 de trade marketing y 9 de BTL— más una transversal. Catálogo canónico:
   [`docs/services/channel-commerce/`](../services/channel-commerce/README.md).

3. **Efeonce opera; la ejecución puede ser propia o de proveedor.** `Managed Channel Operations` es la modalidad
   transversal —plan del ciclo, método y estándar, dirección, control de calidad de la evidencia, gobierno de
   proveedores, decisión y accountability—, no un servicio adicional. Replica el patrón ya canonizado de Managed
   Media Operations. El fee remunera la operación; la ejecución de terceros es pass-through sin margen.

4. **La línea compone, no absorbe.** Retail media conserva ownership en Media & Distribution; digital shelf y
   medición en Wave; producción de piezas en Creative Services. Toda propuesta compuesta declara owner y RACI.

5. **Mercado inicial Chile**, único donde Efeonce tiene entidad, payroll propio y costo cargado conocido. México
   queda condicionado a entidad local o partner con REPSE.

6. **Secuencia por fases**, con la oferta estable y el mix build/partner variable: fase 1 integrador con
   accountability total; fase 2 internalización selectiva bajo tres condiciones; fase 3 tecnología propia
   **exclusivamente** en la capa de conexión física-digital, sobre Greenhouse.

7. **Capital asignado CLP 40.000.000**, que financia una cuenta ancla a la vez.

### Alternativas rechazadas

| Alternativa | Por qué se rechazó |
|---|---|
| Solución compuesta dentro de Media & Distribution en vez de línea propia | Más barata de operar y más fácil de revertir, pero sin foco comercial ni owner la oferta no existe en el mercado. Decisión de negocio del owner, con el trade-off registrado |
| Oferta acotada a inteligencia de canal, sin ejecución ni BTL | El estándar chileno es llave en mano; una oferta parcial se lee incompleta frente a incumbentes que resuelven todo |
| Construir plataforma propia de retail execution | Categoría global madura y en consolidación con respaldo de private equity. No es alcanzable ni es donde está la diferenciación |
| Construir red propia de captura por misiones en fase 1 | Existen redes crowdsourced regionales con una década de operación; construirla es competir por una capacidad contratable |
| Staff augmentation de personal de terreno | Rompe el boundary económico y, en Chile, la figura legal: sería suministro de personal, que Efeonce no presta |
| Cobrar como porcentaje del trade spend gestionado | Conflicto de interés e indefendible ante Finance del cliente |

### Invariantes que esta decisión fija

- **NUNCA** vender staff augmentation de personal de terreno, ni permitir que el cliente dirija el día a día de
  personas de Efeonce o de sus proveedores: en Chile deja de ser subcontratación de servicios y pasa a ser
  suministro de personal.
- **NUNCA** ejecutar producción física —montaje, mobiliario, estructuras, stands, bodega, transporte, permisos—
  como servicio propio. Se contrata, se responde por ella y se factura como pass-through.
- **NUNCA** comprometer ante el cliente algo que no esté respaldado por un compromiso equivalente y exigible del
  proveedor que lo ejecuta (**back-to-back o no se firma**).
- **NUNCA** prometer incremento de venta, sell-out, share o rotación, ni afirmar que el mercado no mide o que un
  competidor no reporta.
- **NUNCA** publicar al cliente un dato que Efeonce no validó; un ciclo bajo el umbral de cobertura se entrega
  degradado y declarado, nunca extrapolado.
- **NUNCA** aceptar un contrato mayor al tamaño financiable por caja más línea de factoring.
- **SIEMPRE** declarar la estructura de ejecución ante procurement, en el contrato, y cuando haya personas de un
  tercero en faena del cliente (Ley 20.123). No mencionarla en el pitch no equivale a negarla.

### Qué NO autoriza esta decisión

Precios publicados, bandas, claims de resultado, compromiso de cobertura o tiempos de respuesta, contratación de
capacidad de terreno propia, ni venta de recurrente. El business model está en `Proposed` y esos pasos dependen de
sus gates G1–G6, del feasibility gate de Talent Assurance y de la revisión legal de la figura.

### Consumidores y documentos canónicos

| Qué | Dónde |
|---|---|
| Catálogo de servicios, alcance, exclusiones y unidades | [`docs/services/channel-commerce/README.md`](../services/channel-commerce/README.md) |
| Modelo económico, gates y riesgos | [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md) |
| Fases y criterio build/partner | [`CHANNEL_COMMERCE_PHASED_ROADMAP_V1`](../business-models/channel-commerce/CHANNEL_COMMERCE_PHASED_ROADMAP_V1.md) |
| Capital, ciclo de caja y tamaño máximo de contrato | [`CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1`](../business-models/channel-commerce/CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1.md) |
| Proveedores, criterios y factoring | [`CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1`](../business-models/channel-commerce/CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1.md) |
| Apertura comercial y prospección | [`CHANNEL_COMMERCE_PROSPECTING_PLAN_V1`](../business-models/channel-commerce/CHANNEL_COMMERCE_PROSPECTING_PLAN_V1.md) |
| Evidencia de mercado y competencia | [`benchmark`](../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md) · [`battlecards`](../audits/commercial/CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md) |

### Documentación funcional y manual de uso

El [Platform Documentation Protocol](../../CLAUDE.md) exige tres capas. Aquí se aplica proporcionalidad y se
declara la razón:

| Capa | Estado |
|---|---|
| Técnica / decisión | **Cubierta** por este ADR + el business model + el catálogo de servicios |
| Funcional (`docs/documentation/`) | **No aplica todavía.** No hay capacidad de producto ni superficie de portal que explicar; la línea es comercial y documental. Condición de retiro: cuando exista una superficie en Greenhouse (scoring, reporte de ciclo o intake de la línea). Owner: Julio Reyes |
| Manual de uso (`docs/manual-de-uso/`) | **No aplica todavía.** No hay procedimiento operativo que un operador del portal deba ejecutar. Condición de retiro: la misma. Owner: Julio Reyes |

### Condiciones para revisar esta decisión

Que ningún diagnóstico se venda en la ventana de 12 semanas con menos de 5 conversaciones con economic buyer; que
la revisión legal declare inviable la figura para los servicios con personas en faena; que un cliente existente
pida ejecución de canal (cambia el motor comercial de new business a expansión); o que cambie la regulación de
subcontratación en Chile.
