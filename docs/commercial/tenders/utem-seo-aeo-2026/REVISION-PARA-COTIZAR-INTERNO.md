# UTEM · revisión para preparar la cotización — INTERNO

**Estado vigente 08/10/2026:** oferta presentada por Julio en Mercado Público. Neto CLP 4.800.000 + IVA 912.000 = total 5.712.000, por tres meses. HubSpot: `presentationscheduled` / Presentación de soluciones, `amount=4800000`, CLP; dos readbacks verificados. Siguiente paso: evaluación/resultado, sin adjudicación confirmada. [Registro final](PRESENTACION-2026-10-08.md). Las referencias de preparación que siguen son historia; no reabren el envío.

Revisión: 08/10/2026, 14:23 America/Santiago. Owner: Julio Reyes / Commercial.
Compra Ágil **5251-1060-COT26**. Documento interno: no adjuntar al comprador.

## Resultado y estado

Se revisaron las cuatro páginas del PDF original de especificaciones, los antecedentes administrativos,
la técnica v1.1, su handoff y las 35 láminas del PDF del deck v2. La orientación anterior era
un servicio integral por tres meses, cercano a **CLP 6.800.000 netos**; la corrección del operador
registrada abajo sustituye usar ese techo como precio objetivo. Posteriormente Julio aceptó
**CLP 4.800.000 netos** y ordenó crear la cotización con el servicio completo en HTML para PDF.
Se prepararon ambos archivos, aprobados por Julio y presentados por él en Mercado Público; no se añadió firma gráfica a la técnica/cotización. El costeo de UTEM sigue sin validación medida.

### Cotización preparada después de la revisión

Precio de tres meses: **neto CLP 4.800.000; IVA 19 % CLP 912.000; total CLP 5.712.000**.
Equivalente mensual: neto CLP 1.600.000; IVA CLP 304.000; total CLP 1.904.000, únicamente
como distribución aritmética, sin convertirlo en calendario de facturación. Este acuerdo sustituye
el candidato anterior de CLP 4.500.000 y la recomendación inicial de usar el techo.

[HTML](cotizacion/UTEM%20-%20Cotizacion%20SEO%20GEO%20AEO.html) y
[PDF](cotizacion/UTEM%20-%20Cotizacion%20SEO%20GEO%20AEO.pdf): cuatro páginas A4 verticales,
portada, alcance/calendario, detalle económico y condiciones. Fuentes y logos oficiales incluidos;
PDF final revisado visualmente, texto y cifras cotejados. Copias locales en `06. Cotizacion` de
OneDrive; sincronización remota no certificada. Datos, autoridad de precio, hashes y QA en
[el manifiesto propio de la cotización](cotizacion/delivery-manifest.json).

El alcance incluye el panel Greenhouse durante tres meses y reportes mensuales con Insights,
según las fuentes disponibles, sin integraciones nuevas con sistemas de UTEM. La vigencia de
30 días corridos es una condición de la oferta, no un plazo exigido en las bases. Esta preparación
no comprueba costos, margen, capacidad asignada ni disponibilidad operativa del panel para UTEM.

Readback `pnpm licitalab opportunity 5251-1060-COT26 --no-login --json`, realizado en esta revisión:
`Publicada`, `is_closed=false`, cierre **08/10/2026 18:00 Chile**, presupuesto estimado **CLP 6.800.000**,
un ítem de servicio, cantidad **1 Unidad**. Es evidencia de LicitaLAB; no una verificación independiente
de la pantalla de postulación de Mercado Público. El buscador público no devolvió el proceso por código.

La revisión inicial no constituyó aprobación económica, firma, actualización CRM ni presentación.
La instrucción posterior autorizó el precio y la preparación; Julio presentó y aportó comprobante. Después autorizó actualizar CRM: cambio ejecutado y releído. No se añadió firma gráfica a la técnica/cotización.

## Corrección del operador: competir por costo en Compra Ágil

Julio precisó que CLP 6.800.000 es el presupuesto máximo y que se busca calidad al costo más bajo
posible. La recomendación previa del agente de ofertar el techo queda retirada: el presupuesto
no demuestra costo de ejecución ni precio competitivo.

La [Directiva 35/2025 de ChileCompra](https://www.chilecompra.cl/wp-content/uploads/2025/12/563BRes-Directiva35CompraAgil.pdf)
indica seleccionar la oferta más económica que cumpla los mínimos, o aplicar los criterios combinados
cuando se hayan definido; seleccionar otra requiere justificación objetiva. No se recuperaron
ponderaciones específicas de UTEM. No se conocen ofertas competidoras.

**Candidato anterior del agente, sustituido por el acuerdo de CLP 4.800.000 netos: CLP 4.500.000 netos por todo el servicio**, IVA
CLP 855.000, total CLP 5.355.000. Pendiente de aceptación del operador y validación económica;
no es el mínimo sostenible comprobado ni una garantía de ser la oferta más barata.
El costo debe considerar íntegramente la técnica y el deck; no recortar entregables por descuento.
Como sensibilidad aritmética, costo completo CLP 3.150.000 daría margen de 30 % sobre ese neto:
es una condición ilustrativa, no costo real medido ni umbral corporativo aprobado.
Encontrar el menor precio sostenible exige estimar dedicaciones y leer costos cargados reales.

La corrección de estrategia no confirma por sí sola si el techo publicado incluye IVA.
Los CLP 5.355.000 totales quedan por debajo de CLP 6.800.000 incluso si ese techo fuese bruto.
El escenario de 6,8 M de la sección siguiente se conserva como referencia anterior, no recomendación vigente.

## Alcance que debe cubrir el precio

| Frente | Mínimo de UTEM / fuente original | Diseño de ejecución que agrega la técnica/deck |
| --- | --- | --- |
| Auditoría | Una auditoría SEO/GEO/AEO y diagnóstico priorizado; p.1 | Inventario, revisión técnica/editorial/autoridad y línea base |
| Implementación | Desarrollo e implementación de la estrategia, acompañamiento; pp.1–2 | Hasta diez páginas existentes prioritarias; ajustes sobre componentes del CMS, publicación de artículos con permisos y aprobación |
| Editorial | Quince artículos originales, cinco por mes; temas y publicación aprobados por UTEM; p.2 | Ficha SEO/AEO, investigación, fuentes, edición, dos rondas consolidadas por artículo y QA de publicación |
| Autoridad | Una campaña de linkbuilding/PR y reporte de acciones/enlaces cuando corresponda; pp.2–3 | Al menos diez destinos/interlocutores pertinentes, preparación, gestión, seguimiento y verificación; sin compra de enlaces ni publicaciones pagadas |
| Medición | Línea base y seguimiento según datos/herramientas disponibles; pp.2–3 | Quince consultas, dos sistemas de respuesta y tres cortes; seguimiento orgánico y matriz de ejecución |
| Informes | Auditoría, seguimiento y final; p.3 | PDF y editable, inventarios, matriz y transferencia |
| Coordinación | Responsable y acompañamiento durante tres meses; p.2 | Inicio, coordinación quincenal y cierre; equipo interno, sin subcontratación |

Los parámetros adicionales son propuestas de Efeonce; no se atribuyen como cantidades exigidas por UTEM.
El precio debe incluirlos si permanecen en el paquete comercial. No vender los artículos por separado
ni asignarles tarifa unitaria como unidad pública principal.

El plazo se cuenta desde el inicio fijado por UTEM. La antigua discrepancia de tres días en la ficha
ya fue resuelta por Julio a favor de los tres meses de las bases; no reabrir esa consulta.

## Diferencia comprobada entre deck y técnica

La inspección visual del PDF encontró compromisos adicionales en:

- **Lámina 23, «Todo junto»:** Teams, Notion, Frame.io, reporte en vivo de Efeonce Insights y panel
  Greenhouse, con el texto «todo tu SEO y AEO a la vista en tu panel, sin esperar el informe».
- **Lámina 24, «A la vista»:** plan en Notion y revisión/aprobación de cada artículo sobre la página.
- **Lámina 25, «Cada mes»:** reporte SEO/AEO mensual armado por Insights y revisión en Teams.
  La tarjeta sí dice **«Datos de muestra»**; sus cifras no son baseline ni resultados de UTEM.

La técnica v1.1 contempla informes, matrices y coordinación, pero no promete expresamente el acceso
al panel ni la automatización de Insights. Antes de emitir, resolver esa coherencia: si se mantienen
las láminas, describir y costear el acceso durante los tres meses, configuración, disponibilidad,
fuentes, soporte y forma de revisión; si se adapta esa oferta, alinear el deck y la técnica.
No inferir una licencia indefinida ni una integración nueva con sistemas institucionales.

El roster nombrado es Andrés, Valentina, Julio, Daniela y Melkin. El handoff anterior registra a
Melkin como provisional: las cinco fichas visuales no prueban dedicación, capacidad disponible ni
costo asignado. No se encontró exigencia de nombres completos/CV en las cuatro páginas de bases;
no convertirlos en un nuevo requisito de admisibilidad.

La fuente exacta del caso Sky sigue pendiente en el expediente. Esto afecta el respaldo del paquete
técnico, no autoriza a trasladar sus porcentajes al resultado contratado para UTEM.

## Base económica y condiciones de cobro

La interpretación neta del presupuesto es un supuesto comercial aceptado previamente por Julio,
no una definición tributaria confirmada por UTEM. Mantenerlo visible en la revisión interna y
expresar neto, IVA y total en la cotización.

| Referencia de preparación, no cotización aprobada | CLP |
| --- | ---: |
| Neto total del servicio si se fija en 6.800.000 | 6.800.000 |
| IVA 19 % | 1.292.000 |
| Total con IVA | 8.092.000 |

Tasa general consultada en el [SII](https://www.sii.cl/aprenda_sobre_impuestos/impuestos/impuestos_indirectos.htm).
La aritmética es un escenario anterior de preparación; el precio exacto acordado se registra arriba. No reducir
automáticamente el neto para encajar en 6,8 millones con IVA: esa no fue la orientación acordada.

Según p.4 de las bases: recepción conforme por contraparte técnica antes de facturar; número de
Orden de Compra Mercado Público obligatorio en la factura; envío a `facturas@utem.cl`; transferencia
electrónica; **sin anticipos**. No hay calendario de pagos mensuales/parciales ni plazo de pago
específico documentado. El cronograma mensual de entregas no demuestra facturación mensual.
Para dimensionar caja, usar un escenario prudente de financiar el servicio completo hasta su
recepción y cobro; es una hipótesis interna, no una cláusula adicional del comprador.

No se identificó una planilla económica especial entre los dos originales. Las bases exigen
cotización formal, anexos firmados y fichas técnicas. La carga debe contrastarse con los campos
efectivos de Mercado Público; no sustituir la cotización por el deck técnico.

## Estructura recomendada para construirla

Hacia UTEM: **un servicio integral de posicionamiento SEO/GEO/AEO para Educación Continua UTEM,
duración tres meses, cantidad 1**, con alcance referenciado a la técnica, monto neto, IVA y total.
Puede explicar sus componentes y fases sin convertirlos en servicios opcionales ni precio por artículo.
El detalle interno separa:

1. Auditoría, estrategia, investigación y línea base.
2. Producción y edición de quince artículos, revisiones, carga y QA.
3. Implementación y optimización de páginas existentes.
4. Campaña de autoridad/PR, preparación, gestión y reporte.
5. Medición, informes, herramientas y eventual panel/Insights.
6. Dirección, coordinación, transferencia y reserva operativa/financiera.

Costear por rol y mes con costo cargado y dedicación real. Evitar doble conteo de herramientas y
overhead si ya están incluidos en el costo cargado. Añadir costos externos sólo cuando existan,
reserva y costo de capital según escenario de caja. Los costos ausentes permanecen pendientes,
no se registran como cero. El margen se calcula sobre el neto, sin tratar el IVA como ingreso.

## Decisiones restantes para emitir

| Decisión / dato | Estado | Owner |
| --- | --- | --- |
| Precio exacto del programa | CLP 4,8 M netos acordados con Julio; HTML/PDF preparados; costeo medido pendiente | Julio / Commercial |
| Capacidad, costo cargado, margen y caja | No validados para UTEM en las fuentes revisadas | Operations / Finance / Julio |
| Panel, Insights y revisión colaborativa del deck | Incluidos y delimitados en la cotización durante tres meses; verificar habilitación efectiva para UTEM | Julio / Operations |
| Vigencia de cotización | 30 días corridos como condición de oferta; no exigencia atribuida a UTEM | Commercial |
| Respaldo exacto del caso Sky | Pendiente documental anterior | Commercial |
| Presentación | Ejecutada por Julio; captura de Mercado Público aportada y conservada; etapa/importe CRM releídos | Julio |

Ya están resueltos por el operador los anexos 1/2B/3/4 y declaraciones, habilitación, ausencia de
deudas, tres meses y preparación sin contacto previo. No pedir nuevamente esas confirmaciones.
La autorización previa de firma cubre los anexos administrativos, no se extiende por inferencia
a una nueva oferta económica.

## Fuentes y archivos revisados

- [Expediente de requisitos y decisiones](../licitalab-deep-review-2026-10-07/UTEM-5251-1060-COT26-REVISION-2026-10-08.md).
- [Técnica v1.1](oferta-tecnica.md), [handoff interno](CLAUDE-HANDOFF-INTERNO.md) y [registro del deck](../../../audits/commercial/2026-10-08-utem-deck-propuesta-tecnica.md).
- Originales y entregas locales: `OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/UTEM/1. Agencia SEO-AEO/`.
  PDF técnico original de cuatro páginas, auxiliares de anexos, PDF del deck de 35 páginas.
- [Ficha LicitaLAB](https://app.licitalab.cl/search/agile/5251-1060-COT26), releída mediante la CLI.

Se verificaron archivos locales; no se certificó sincronización remota OneDrive, estado CRM/Notion,
disponibilidad de las plataformas para esta institución ni costo real del equipo.
