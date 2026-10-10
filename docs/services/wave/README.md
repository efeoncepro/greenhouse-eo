# Wave — fichas de servicio

> **Marca de producto:** Wave, de Efeonce Group
> **Catálogo económico canónico:** [`Wave Business Model V1`](../../business-models/wave/WAVE_BUSINESS_MODEL_V1.md)
> **Boundary de ownership:** [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md)
> **Última actualización:** 2026-10-10

## Propósito

Este directorio contiene las fichas de servicio de las familias de Wave: resultado contratado, alcance,
entregables, evidencia de aceptación, responsabilidades, estados degradados, límites y continuidad.

El cliente contrata y se relaciona con **Efeonce**. Wave nombra el producto o capability que se entrega. Wave,
Globe, Reach y Efeonce Digital no se presentan como agencias o proveedores contractuales separados.

## Cobertura actual

| Familia | Estado en el portfolio | Ficha de servicio |
|---|---|---|
| Search Visibility 360 | Aceptada | Pendiente — el modelo vive en [`business-models/search-visibility-360/`](../../business-models/search-visibility-360/) |
| Web Experience 360 | Aceptada | Pendiente |
| Measurement & Analytics | Aceptada | Pendiente |
| Agent Systems & Platforms | Aceptada | Pendiente |
| Digital Automation & Integrations | Aceptada | Pendiente |
| **Product Design 360** | **Aprobada** por el operador el 2026-10-09 — sexta familia ([delta del ADR](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md#delta-2026-10-09--product-design-360-aprobada)); aprobación extendida a ADR propio, modelo, ficha, nombre público y venta el 2026-10-10 ([delta](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md#delta-2026-10-10--aprobación-total-de-product-design-360)) | [`product-design-360.md`](product-design-360.md) |

**Efeonce AEO** nombra la capacidad de entrada a visibilidad de marca en respuestas de IA;
**Efeonce AEO Assessment** es su diagnóstico público y **Efeonce AI Visibility Report** su
entregable. Su ruta de expansión pertenece a **Search Visibility 360**, no constituye una familia
Wave adicional. El [modelo AEO](../../business-models/aeo/EFEONCE_AEO_BUSINESS_MODEL_V1.md)
sigue `Draft`. [ADR de naming](../../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md).

Product Design 360 es la primera familia de Wave con ficha de servicio. Las cinco familias aceptadas el 2026-07-25
siguen gobernadas por el Wave Business Model y el ADR; que no tengan ficha todavía es un gap conocido de
documentación, no una diferencia de estatus en el portfolio.

**Delta 2026-10-09 — Product Design 360 aprobada.** El operador la aprobó como sexta familia y pidió presentarla
como definitiva en el brochure de servicios web («Si, incluyela como algo definitivo por qué está aprobado»). Hasta
el 2026-09-10 figuraba como `Proposed`. *(Lectura del 2026-10-09, superada al día siguiente:)* la aprobación cubre
el estatus de la familia en el portfolio; precios, piso de margen por lane y posición de Legal siguen los gates del
[modelo económico](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md), que no se
dieron por cerrados con esta decisión.

**Delta 2026-10-10 — aprobación total.** El operador corrigió esa lectura: «Todo product design hay que ponerlo
aprobado». La aprobación cubre la familia, su
[ADR propio](../../architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md) (`Accepted`), su
[modelo de negocio](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md) (`Approved`),
su [ficha de servicio](product-design-360.md), el nombre público «Product Design 360» y su venta. Ya no es «sólo
pilotos gobernados por SOW». Los gates G1–G6 del modelo quedan como validación posterior a la aprobación. Lo aprobó
el operador: no hay precios nuevos ni una revisión de Legal o de Finance registrada.

## Product Services compuestos

`Experience LaunchOps` y `Agentic Readiness` son composiciones sobre las capabilities base. Sus modelos viven en
[`business-models/experience-launchops/`](../../business-models/experience-launchops/) y en el Wave Business Model.
Una composición no crea una familia nueva ni transfiere ownership entre capabilities.

## Collateral comercial

- **Brochure «Servicios web y digitales»** (29 láminas, 16:9; línea Engine, firmado por Efeonce; aprobado por el
  operador el 2026-10-09): el collateral vigente para vender las familias de Wave y Experience LaunchOps en una sola
  pieza. Sirve para el prospecto o la cuenta que evalúa su capa web y digital completa y necesita ver el portfolio
  antes de entrar por una puerta. Recorre Web Experience 360, Experience LaunchOps, Search Visibility 360,
  Measurement & Analytics, Agent Systems & Platforms, Digital Automation & Integrations y Product Design 360; las
  puertas de entrada (AEO Assessment, Lista para agentes / Agentic Readiness, Diagnóstico de lanzamientos); y los
  modelos de contratación (Sample Sprint, On-Demand, On-Going). PDF en OneDrive
  `Alineación/4. Comercial/Brochures/2026/Web/Efeonce-Brochure-Servicios-Web.pdf` (29 páginas, rasterizado); canvas
  privado en <https://claude.ai/artifact/SnJS7zHHPTBPwcJvv7e9t7>. Fuente, copia del PDF, orden de las láminas y
  cómo rehacer el PDF: `ai-generations/2026-10-09_deck-web-nexa-spark/deck/LEEME.md`. **Antes de usarlo con
  prospectos** falta:
  - reemplazar las cifras del caso Aguas Andinas (lámina 18), que son un marcador inventado a pedido del operador
    (−45 %, 100 %, 3 → 1, 92 % y la línea de fuente «primeros seis meses»);
  - confirmar el plazo o la fuente del caso Berel (lámina 17): las cifras vienen del deck SEO/AEO aprobado y dicen
    «12 meses», pero la cuenta se adjudicó en mayo de 2026;
  - corregir el titular repetido «Empiezas chico» en las láminas 26 y 27;
  - contar con la autorización de uso de los logos de clientes
    ([TASK-1937](../../tasks/to-do/TASK-1937-third-party-brand-usage-authorization-library.md)).

  Armado y lecciones de oficio: skill `deck-studio`. Uso comercial de la parte de búsqueda: skill
  `seo-aeo-practice`.
