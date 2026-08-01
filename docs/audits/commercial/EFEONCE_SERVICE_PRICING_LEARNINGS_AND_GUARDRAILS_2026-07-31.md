# Efeonce — aprendizajes y guardrails de pricing para servicios digitales

> **Estado:** hipótesis / guía de validación comercial
> **Fecha:** 2026-07-31
> **Owner:** Commercial + Strategy; validación económica pendiente de Finance
> **Alcance:** servicios digitales B2B con implementación web, medición, SEO/AEO, social media y CRM
> **No es:** tarifario público, aprobación financiera, autorización de venta, contrato ni sustituto del CPQ/runtime financiero

## Propósito

Este documento consolida aprendizajes obtenidos al contrastar una propuesta B2B de landing, medición,
SEO/AEO, social media y HubSpot con referencias públicas del mercado chileno y con la lógica interna de
Product Services. Sirve para formular propuestas comparables y detectar riesgos de packaging; no fija precios
vigentes ni autoriza descuentos, pisos de margen o compromisos de capacidad.

La hipótesis principal es que una oferta de entrada debe separar con claridad:

1. una **implementation fee** única por construir una base digital medible;
2. un **retainer mensual** por capacidad editorial, estratégica y de optimización;
3. licencias, pauta, producción de terceros y otros costos externos como **pass-through**;
4. límites de capacidad que hagan auditable el costo de servir.

## Aprendizajes comerciales

### 1. La landing no debe cotizarse como una página commodity

Cuando la landing nace con estrategia, copy de conversión, SEO técnico inicial, GA4, GTM, eventos,
formularios, medición de conversiones y conexión con CRM, la unidad económica es una implementación,
no sólo diseño o desarrollo. El fee único debe cubrir esa base y su aceptación; la operación posterior no
debe absorber silenciosamente nuevas páginas, nuevos mercados o nuevas integraciones.

El precio debe comunicarse por el sistema que queda habilitado —captación y medición— y no por cantidad de
secciones o horas internas. El alcance técnico sigue siendo necesario para controlar costos, pero no es la
propuesta de valor completa.

### 2. El retainer debe vender capacidad, no una lista abierta de tareas

SEO/AEO y social media son servicios recurrentes. El cliente compra una capacidad mensual priorizada,
con canales, volumen, profundidad y cadencia definidos. Un retainer sin límites puede parecer atractivo en
la venta y erosionar margen durante el delivery.

Cada propuesta debe declarar, como mínimo:

- canales activos y canal prioritario;
- cantidad máxima de piezas principales y adaptaciones;
- número de iniciativas SEO/AEO y actualizaciones web;
- nivel de community management y horario de atención;
- reuniones, reporting y responsables;
- qué ocurre cuando el cliente solicita volumen o complejidad adicional.

El exceso de alcance se prioriza, reprograma o cotiza como expansión/ad hoc. No se absorbe como cortesía
permanente.

### 3. Tres tiers ayudan a comprar sin convertir la propuesta en una negociación de descuento

La arquitectura `good / better / best` permite presentar tres niveles crecientes de capacidad:

- **Base:** presencia, captación y medición continua con capacidad editorial acotada.
- **Intermedio:** mayor profundidad de SEO/AEO, optimización de conversión y operación de contenidos.
- **Alto:** más volumen, más iniciativas, mayor acompañamiento estratégico y preparación para expansión.

El tier intermedio puede ser la recomendación comercial, pero los tres deben ser rentables por separado.
No deben existir tiers artificiales que sólo cambien el nombre o agreguen entregables cuyo costo no fue
modelado.

Los nombres, volúmenes y precios de cada propuesta son variables comerciales. Este documento sólo conserva
la arquitectura y los guardrails.

> **No existe una tarifa web estándar derivada de este documento.** El monto preparado para
> [Brightcell LIC-95](../../commercial/tenders/brightcell-lic-95/README.md) pertenece exclusivamente a ese alcance
> y conserva su propio gate de Finance; no debe reutilizarse automáticamente en Polpaico ni en otra licitación.
> Cada web, landing, portal o desarrollo debe dimensionarse y costearse según alcance, complejidad, plataforma,
> integraciones, contenido, medición y margen validado por Finance.

### 4. HubSpot CRM Free puede funcionar como diferenciador, no como revenue oculto

La configuración inicial de HubSpot CRM Free puede incluirse como beneficio dentro del paquete cuando el
alcance sea básico: pipeline, propiedades esenciales, formularios, conexión de conversiones, dashboard
inicial y capacitación. Debe presentarse como habilitador de seguimiento comercial, no como licencia propia
ni como promesa de implementación enterprise.

HubSpot Starter, Sales Hub, Marketing Hub, seats adicionales, límites excedidos, integraciones avanzadas y
otros módulos deben tratarse como costo de plataforma del cliente o pass-through explícito. Efeonce no debe
financiar indefinidamente licencias de terceros ni reconocer su costo como margen de servicios.

### 5. Las cifras comerciales deben expresarse netas y separadas de impuestos

Las propuestas chilenas deben indicar de forma visible que los valores son **netos, sin IVA**. La base neta
permite comparar fee, costos de terceros y margen; el IVA se agrega según la regla fiscal aplicable al
documento de cobro. Pauta, hosting, dominio, licencias, viajes, producción audiovisual en terreno,
traducciones y otros terceros deben aparecer separados cuando no formen parte del fee Efeonce.

## Guía de packaging

| Capa | Unidad de cobro | Incluye conceptualmente | No debe absorber sin revisión |
| --- | --- | --- | --- |
| Implementation | Fee único por aceptación | estrategia base, landing, copy, SEO inicial, GA4/GTM, eventos, formularios y CRM básico | nuevas páginas, migraciones complejas, integraciones enterprise, nuevos países |
| Monthly retainer | Fee mensual por capacidad | estrategia, contenido, RRSS, SEO/AEO, optimización, reporting y governance según tier | volumen ilimitado, garantías de ranking, pauta, producción en terreno |
| Platform / pass-through | costo separado del cliente | licencias, media, hosting, dominio, proveedores y derechos externos | financiar terceros o esconder markup/comisión |
| Expansion / ad hoc | SOW o change order | nuevos mercados, canales, integraciones, campañas o capacidad adicional | tratar expansión como “incluida” sin modelar impacto |

## Guardrails de economía y Finance

Estas reglas son controles de validación, no aprobación financiera:

1. Antes de enviar una cotización, calcular `fully loaded cost` y `cost-to-serve` por tier y por cuenta.
2. Separar costo humano, proveedores, licencias, derechos, soporte, coordinación, retrabajo y contingencia.
3. Modelar utilización y sensibilidad: horas/capacidad comprometida, rondas de aprobación, volumen real,
   urgencias, mezcla de perfiles y costos de terceros.
4. Verificar margen de proyecto y margen recurrente contra el piso vigente de Finance. Este documento no fija
   ese piso ni puede inferirlo a partir de precios de mercado.
5. Registrar condiciones de pago, DSO, anticipos y exposición de caja; el pass-through no debe inflar el
   ingreso reconocido ni ocultar margen.
6. Revisar periódicamente si el retainer sigue cubriendo la capacidad consumida. La revisión contractual y
   el repricing deben ser posibles cuando cambie el alcance, los costos o la mezcla de perfiles.
7. No llamar ARR a un retainer de servicios ni presentar una hipótesis de precio como aprobación de Finance.

Fórmula mínima para evaluar una propuesta:

```text
project contribution = implementation fee neta - costo fully loaded de implementación - costos directos
monthly contribution = retainer neto - costo fully loaded de capacidad mensual - costos directos recurrentes
```

El resultado debe analizarse por escenario base, baja utilización, alta utilización y expansión de alcance.

## Referencia de mercado y nivel de confianza

Las referencias públicas chilenas consultadas durante 2026 muestran una dispersión amplia: landings de
commodity en el tramo bajo, landings estratégicas de agencia alrededor del tramo medio y servicios mensuales
de SEO o social media que aumentan según producción, estrategia, community management y medición. Son
señales direccionales, no comparables homogéneos ni evidencia de disposición a pagar de un cliente concreto.

Fuentes de referencia, consultadas el 2026-07-31:

- [OpenLanding](https://openlanding.cl/)
- [Landing Page Chile](https://www.landingpagechile.cl/)
- [Forrate](https://forrate.cl/blog/cuanto-cuesta-pagina-web-chile)
- [Big Media Partners — tarifario 2026](https://bigmediapartners.cl/tarifario-y-planes-2026/)
- [Mazmedia — planes](https://mazmedia.cl/precios-y-planes/)
- [Huasa Digital — planes 2026](https://huasadigital.cl/planes_huasa_2026.pdf)
- [Vitria — agencias de marketing en Chile](https://vitria.cl/blog/cuanto-cuesta-contratar-agencia-marketing-chile)
- [HubSpot CRM pricing](https://www.hubspot.com/pricing/crm)

No se debe usar una referencia low-cost para justificar una operación estratégica completa ni una referencia
enterprise para imponer un precio que el alcance, el buyer o el proceso de procurement no soportan.

## Checklist antes de convertir la hipótesis en oferta

- [ ] El outcome y el primer valor del cliente están escritos.
- [ ] La implementation fee tiene criterio de aceptación y límite de cambios.
- [ ] Cada tier tiene capacidad cuantificada y exclusiones explícitas.
- [ ] HubSpot Free, licencias pagadas y pass-through están separados.
- [ ] Los valores están marcados como netos, sin IVA.
- [ ] El costo fully loaded y el costo de servir fueron actualizados.
- [ ] Finance validó margen, sensibilidad, forma de pago y exposición de caja.
- [ ] Legal revisó impuestos, datos, derechos, licencias y terminación.
- [ ] La propuesta no se presenta como pricing aprobado si sólo existe esta guía.

## Estado y siguiente decisión

`Hypothesis / guide — not financially approved`.

El siguiente paso para cualquier oferta concreta es cargar el alcance en CPQ o en el proceso financiero
vigente, reconciliar costo y margen con Finance y obtener las aprobaciones proporcionales. Una licitación o
propuesta individual puede usar esta arquitectura como hipótesis de packaging, pero conserva su propio
ownership, evidencia y estado; este documento no la reemplaza.
