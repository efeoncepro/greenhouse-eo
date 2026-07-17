# Customer Agent ANAM — ledger de evidencia externa

> **Corte:** 2026-07-17
>
> **Uso:** soporte editorial y E-E-A-T del segundo artículo del caso ANAM
>
> **Frontera:** ninguna cifra externa mide el desempeño de ANAM ni prueba que el agente esté operativo
>
> **Lifecycle:** snapshot histórico del ledger usado antes de publicar; el status público vigente vive en
> [la auditoría WordPress y cierre live](./HUBSPOT_CUSTOMER_AGENT_ANAM_WORDPRESS_PRIVATE_AUDIT_V1.md). Las fuentes,
> atribuciones y prohibiciones de extrapolación de este ledger permanecen vigentes.

## Decisión editorial

El artículo ya contiene evidencia first-party más fuerte que un benchmark genérico: inventario autenticado,
23 fuentes, 356 registros técnicos, diseño de intenciones, conteos separados de QA, limitaciones observadas y un
estado runtime verificado negativamente. Las cifras externas se limitan a tres funciones:

1. respaldar que aclarar una ambigüedad puede ser preferible a responder con una interpretación errónea;
2. dimensionar la frustración de perder contexto durante una transferencia;
3. mostrar que una tasa de resolución necesita definición y no puede extrapolarse al caso.

## Claims incorporados

| Claim | Fuente y población | Confianza | Límite obligatorio | Ubicación |
| --- | --- | --- | --- | --- |
| Dos experimentos analizaron 386 casos; pedir aclaración obtuvo resultados perceptuales similares al chatbot sin error, mientras el error no resuelto redujo intención de adopción. | Sheehan, Jin y Gottlieb, *Journal of Business Research* (2020); 189 + 197 casos analizados entre participantes estadounidenses. | Media-alta | Escenario ferroviario ficticio; no evaluó exactitud, HubSpot ni ANAM. | `¿Qué debe recordar y qué no puede prometer una IA?` |
| 74% se frustra cuando debe repetir información durante la atención. | Zendesk CX Trends 2026; 6.182 consumidores, 22 países —incluido Chile—, junio de 2025. | Media-alta | Encuesta declarativa de un proveedor; no mide causalmente la calidad del handoff. | `¿Cuándo transferir a una persona es la respuesta correcta?` |
| Customer Agent resolvía 65% de las conversaciones y reducía 39% el tiempo de resolución entre más de 8.000 clientes activados. | HubSpot, anuncio del 13 de abril de 2026; telemetría agregada reportada por el fabricante. | Media | No publica distribución, ventana, baseline ni metodología suficiente; no es resultado de ANAM. | `¿Por qué configurado, probado y operativo son estados distintos?` |
| HubSpot evalúa una resolución 72 horas después de la última respuesta y exige que no exista handoff durante esa ventana. | Documentación oficial de Customer Agent, consultada el 17 de julio de 2026. | Alta para la definición del producto | Es una definición propia; limita comparaciones con métricas de otros productos. | Junto al benchmark agregado de HubSpot. |

## Fuentes verificadas

- [Experimentos sobre errores y aclaraciones en chatbots](https://doi.org/10.1016/j.jbusres.2020.04.030).
- [Zendesk CX Trends 2026](https://cxtrends.zendesk.com/) y su [metodología](https://cxtrends.zendesk.com/about).
- [HubSpot: resultados agregados de Customer Agent, abril de 2026](https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete).
- [HubSpot: definición de resolución y ventana de 72 horas](https://knowledge.hubspot.com/customer-agent/understand-the-customer-agent).

## Claims investigados pero no incorporados

- Expectativas globales de resolución inmediata, adopción o crecimiento de IA: aportaban contexto, pero alejaban
  el artículo de su pregunta central y dependían mayormente de encuestas de proveedores.
- Predicciones sobre porcentaje futuro de casos atendidos por IA: son proyecciones, no evidencia observable.
- Tasas de confianza general en IA: no son específicas de atención al cliente ni de la decisión analizada.
- Benchmarks de madurez y ROI: útiles para otro artículo, pero podían convertir el caso en una pieza sobre
  adopción de mercado.
- Cifras chilenas sobre incomodidad ante bots: pertinentes, pero con metodología pública menos completa que la
  evidencia seleccionada.
- Precios y créditos: se verificaron para comprender la dependencia de facturación, pero no se publican porque
  pueden cambiar y el artículo evita exponer o insinuar condiciones comerciales de ANAM.

## Guardrails de uso

- Atribuir cada cifra junto al claim; la bibliografía final no reemplaza la atribución contextual.
- Mantener denominador, fecha, procedencia y límite.
- No calcular una tasa de éxito de ANAM combinando universos de prueba distintos.
- No mezclar benchmarks de mercado dentro de infografías que representan evidencia propia del caso.
- Revalidar las fuentes vivas de HubSpot y Zendesk el día de publicación.
- Mantener el post privado hasta completar el gate humano de publicación y el QA live.
