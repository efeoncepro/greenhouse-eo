# ARMOR EPPS — fee Efeonce del piloto de 90 días

**Pricing Integrity Pack · 27/10/2026 · veredicto `hypothesis_only` (pendiente de aprobación de Julio).**
Costeo interno para la propuesta del jueves 29 o viernes 30. No es una cotización emitida ni un precio aprobado,
y los costos y márgenes de este documento **no se muestran al cliente**. Caso de negocio:
[CASO-DE-NEGOCIO.md](CASO-DE-NEGOCIO.md).

## Por qué no salió del cotizador V3

El cotizador V3 vigente (`operating-review-2026-10-22-v13`) tiene **tres ofertas**: servicio gestionado creativo,
servicio gestionado SEO/AEO y staffing por dedicación. **No tiene una oferta de performance ni factor de mercado
para Ecuador.** Sus reglas prohíben cotizar un servicio con la oferta de otra práctica, así que este fee no se
puede emitir como «la cotización» V3 sin una decisión del CEO que agregue la oferta (o el mercado).

Se costeó con el método del [pack de pricing de Performance](../../../business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md),
que es el que gobierna paid media: **costo cargado = horas × costo por hora × (1 + 12 % de herramientas y
overhead)** y **precio = costo cargado ÷ (1 − margen)**, con **piso 45 % y objetivo 55 %**. Los costos por perfil
son los **costos objetivo del catálogo V3** (no nómina). El cálculo es reproducible con
`armor_cost.py` (en el scratchpad de la sesión); sus cifras están abajo.

## Qué se cobra

```text
Fee Efeonce = puesta en marcha (única, semanas 0–2) + operación mensual (3 meses)
+ inversión en medios: USD 6.000/mes, pagada por ARMOR directo a LinkedIn y Google (cuentas a su nombre)
+ impuestos (por confirmar con Finance)
```

Sin markup sobre medios. Diseño gráfico lo hace ARMOR (equipo interno declarado); la producción audiovisual nueva
no está incluida.

## Puesta en marcha (semanas 0–2)

| Perfil (catálogo V3) | Horas | Qué hace | Costo USD |
| --- | ---: | --- | ---: |
| ECG-008 Paid Media Manager | 24 | Estructura de cuentas, audiencias y listas ABM por país, pronóstico de audiencias, Keyword Planner, armado de campañas | 465 |
| ECG-009 Media Buyer | 24 | Carga de campañas y variantes, negativas, configuración por país | 270 |
| Performance Lead (hipótesis del pack: USD 5.500/mes) | 8 | Plan, criterios de compuerta, revisión | 275 |
| ECG-031 Analista de implementación GA4/GTM | 32 | GTM, eventos GA4, Insight Tag, conversión de Google Ads, consentimiento, captura de `utm`/`gclid`/`li_fat_id`, plantilla de conversiones offline | 360 |
| ECG-012 Desarrollador WordPress | 24 | Landings por país y oferta, chat con origen (`setMeta`), microformulario | 240 |
| ECG-021 Marketing Automation Specialist | 16 | Campos y etapas en Kommo, LinkedIn Lead Gen → Kommo, Zapier → LinkedIn CAPI, lead de prueba de punta a punta | 200 |
| ECG-011 Copywriter | 24 | Textos de landings, guía técnica de selección (validada por ARMOR), matriz inicial de anuncios | 225 |
| ECG-016 Project/Account Manager | 8 | Coordinación con ARMOR, accesos, cronograma | 106 |
| **Costo de equipo** | **160** | | **2.141** |
| **Costo cargado (+12 %)** | | | **2.398** |
| Precio al piso (45 %) | | | 4.360 |
| Precio al objetivo (55 %) | | | 5.329 |

## Operación mensual (meses 1–3)

| Perfil | Horas/mes | FTE | Qué hace | Costo USD/mes |
| --- | ---: | ---: | --- | ---: |
| ECG-008 Paid Media Manager | 56 | 0,35 | Optimización semanal de LinkedIn y Google en 3 países, diseño de pruebas, lectura | 1.085 |
| ECG-009 Media Buyer | 20 | 0,13 | Variantes, pacing, negativas, audiencias de remarketing | 225 |
| ECG-019 Data Analyst | 24 | 0,15 | Exportación de Kommo, carga semanal de conversiones offline, tablero, informe mensual | 300 |
| Performance Lead (hipótesis) | 11 | 0,07 | Gobierno mensual, compuerta de escala, recomendación de presupuesto anual | 378 |
| ECG-011 Copywriter | 10 | 0,06 | Renovación de textos de anuncios y Conversation Ads | 94 |
| **Costo de equipo** | **121** | **0,76** | | **2.082** |
| **Costo cargado (+12 %)** | | | | **2.332** |
| Precio al piso (45 %) | | | | 4.239 |
| Precio al objetivo (55 %) | | | | 5.182 |

## Precio recomendado

| Concepto | Piso (45 %) | **Recomendado** | Margen real del recomendado |
| --- | ---: | ---: | ---: |
| Puesta en marcha (única) | 4.360 | **USD 5.400** | 55,6 % |
| Operación mensual | 4.239 | **USD 5.200 / mes** | 55,2 % |
| **Fee del programa** (puesta en marcha + 3 meses) | 17.079 | **USD 21.000** | 55,3 % |
| Inversión en medios (pagada por ARMOR a las plataformas) | — | USD 18.000 | — |
| **Inversión total de ARMOR en el piloto** | — | **USD 39.000** + impuestos | — |

Costo cargado del programa: USD 9.393. El recomendado redondea hacia arriba el precio al objetivo; no hay
descuento aplicado.

**Sensibilidad.** Si el Paid Media Manager necesita 25 % más horas, el costo mensual sube a USD 2.636 y el fee de
USD 5.200 queda con 49 % de margen (sobre el piso). Con 25 % menos, 61 %. El Performance Lead es una hipótesis del
pack (el catálogo no tiene el rol) y pesa 18 % del costo mensual.

## Lectura frente al pack de Performance

- **Nivel de complejidad.** El pack ubicaría a ARMOR en el **nivel 2** (tres mercados, señal nueva, CRM a
  conectar), con banda de USD 5.900–7.200/mes y un equipo de ~1,0 FTE. El costeo por horas da **0,76 FTE** porque
  la operación es de 2 canales con poca búsqueda, Perú sólo en alcance y el diseño lo pone ARMOR. Recomendar
  USD 5.200 queda **bajo la banda del nivel 2 y sobre el piso de margen**: es una decisión de Julio, no una
  excepción de Finance (el piso que gobierna es el de margen, y se cumple).
- **Puesta en marcha.** Equivale a un Sprint acotado a 2 semanas; el pack separa la implementación de medición
  (Wave) y de CRM (RevOps). Aquí van dentro de la puesta en marcha, pero el documento para el cliente puede
  mostrarlas como líneas separadas si conviene explicar qué compra.
- **Relación fee/medios.** USD 5.200 de fee contra USD 6.000 de medios al mes (0,87). Es alta para el cliente y
  conviene explicarla: la puesta en marcha construye la medición que la división no tiene y el fee no crece con la
  inversión.
- **LinkedIn ≥ USD 3.000/mes:** el escenario medio pone USD 5.200/mes en LinkedIn; cumple la regla del motion B.

## Condiciones sugeridas

| Concepto | Condición |
| --- | --- |
| Puesta en marcha | 50 % al aceptar, 50 % al validar el lead de prueba de punta a punta |
| Operación mensual | Mensual anticipado; compromiso de 3 meses (mínimo del servicio gestionado) |
| Medios | ARMOR paga directo a LinkedIn y Google; cuentas, píxeles y audiencias a su nombre |
| Moneda | USD (Ecuador está dolarizado) |
| Impuestos | **Por confirmar con Finance**: entidad que factura, retenciones y tratamiento en Ecuador |
| Bono por pipeline (opcional, pack §6) | Hasta 15 % del fee base por trimestre, sobre oportunidades calificadas con fuente pagada en Kommo por encima de su baseline. **No incluido**; decisión de Julio |
| Renovación | Al día 90, Managed Performance mensual según el presupuesto anual que salga del piloto |

## Lo que no cubre y qué validar

- No incluye producción audiovisual, diseño gráfico (lo hace ARMOR), desarrollo de un selector interactivo de
  filtros, operación de Kommo más allá de la medición, ni asesoría legal de privacidad.
- Si ARMOR no puede publicar landings en armorepps.com o el chat no es de Kommo, cambian las horas de WordPress y
  automatización.
- Costos por perfil: costo objetivo del catálogo V3, no nómina. El overhead de 12 % y el Performance Lead son
  hipótesis del pack que Finance debe reemplazar.
- Para emitir «la cotización» en la plantilla A4 V2 desde V3 hace falta agregar la oferta de performance y el
  mercado Ecuador al catálogo (decisión del CEO). Mientras tanto, la propuesta puede usar la
  [plantilla A4 versión 1 o 2](../../templates/cotizacion-a4/README.md) con el precio que Julio apruebe.

## Evidence ledger

| Dato | Fuente | Estado |
| --- | --- | --- |
| Costos objetivo por perfil | `data/pricing/v3-operating/catalog.review-v13.json` (registros `cost:*`, 2026-10-10/11) | confirmados en el catálogo |
| Método, pisos y bandas | Pack de Performance V1 (§1, §3, §6, §8, §9) | `hypothesis_only` |
| Horas por actividad | Estimación de este costeo a partir del diseño del piloto | supuesto |
| Overhead 12 % y Performance Lead USD 5.500 | Pack de Performance V1 | hipótesis |
| Medios USD 6.000/mes | Caso de negocio v1, escenario medio | escenario |

**Aprobación pendiente:** Julio (precio, condiciones y si va el bono). Finance: impuestos y entidad.
