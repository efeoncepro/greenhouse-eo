# Precios HubSpot — lectura del portal Efeonce, 05/11/2026

> **Tipo:** evidencia fechada (snapshot). Fuente primaria de los precios de lista para el pricebook de TASK-1405 y para el cotizador.
> **Fuente:** las páginas de precios dentro del portal Efeonce `48713323`, `https://app.hubspot.com/pricing/48713323/<slug>`, leídas con la sesión de Julio en Chrome el 05/11/2026.
> **Moneda:** USD. Todas las páginas dicen «El precio se muestra en USD y está sujeto a los impuestos aplicables».
> **Ojo:** el portal muestra el precio que HubSpot le ofrece a **esta cuenta**. En Sales Hub Pro marca «SUSCRIPCIÓN ACTUAL» y muestra US$ 100 por licencia al mes. La página pública con compromiso anual lo ha mostrado como US$ 90 (fuentes secundarias). En una cotización a cliente usar el valor del portal, salvo que HubSpot confirme otra cosa para ese negocio.

## Hubs por licencia (precio por licencia y mes)

| Producto | Starter | Pro | Enterprise | Créditos incluidos (S / P / E) | Nota de la página |
| --- | --- | --- | --- | --- | --- |
| Sales Hub (`/sales`) | US$ 20/mes | US$ 100/mes/licencia | US$ 150/mes/licencia | 500 / 3.000 / 5.000 | Enterprise: «El precio no incluye la tarifa de incorporación única obligatoria». Incluye aprobaciones de pipeline y cuenta de entorno de pruebas estándar. |
| Service Hub (`/service`) | US$ 20/mes | US$ 100/mes/licencia | US$ 150/mes/licencia | 500 / 3.000 / 5.000 | Enterprise excluye la tarifa de incorporación obligatoria. |
| Smart CRM (`/smart-crm`) | — (no capturado) | US$ 50/mes/licencia | US$ 75/mes/licencia | — / 3.000 / 5.000 | Enterprise incluye un entorno de pruebas estándar (hasta 200.000 registros por tipo). |
| Revenue Hub (`/revenue`) | — | US$ 95/mes/licencia | US$ 140/mes/licencia | — / 3.000 / 5.000 | Cotizaciones en Pro y Enterprise; facturación y pagos en todos los planes. |

## Hubs por cuenta (precio de cuenta con licencias incluidas)

| Producto | Starter | Pro | Enterprise | Licencias incluidas (P / E) | Licencia principal adicional (P / E) | Contactos de marketing (S / P / E) | Créditos (S / P / E) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marketing Hub (`/marketing`) | US$ 20/mes; licencia adicional desde US$ 50/mes | US$ 890/mes | US$ 3.600/mes | 3 / 5 | desde US$ 50 / desde US$ 75 | 1.000 / 2.000 / 10.000 | 500 / 3.000 / 5.000 |
| Content Hub (`/content`) | US$ 20/mes (incluye 1 licencia) | US$ 500/mes | US$ 1.500/mes | 3 / 5 | desde US$ 50 / desde US$ 75 | — | 500 / 3.000 / 5.000 |
| Data Hub (`/data`) | US$ 20/mes | US$ 800/mes | US$ 2.000/mes | 1 / 1 | desde US$ 50 / desde US$ 75 | — | 500 / 5.000 / 10.000 |
| HubSpot para marketers, Marketing + Content (`/marketing-plus`) | — | US$ 1.000/mes | US$ 3.800/mes | 3 / 5 | desde US$ 50 / desde US$ 75 | — / 2.000 / 10.000 | — / 3.000 / 5.000 |
| Plataforma de Clientes (`/suite`) | US$ 20/mes (incluye 1 licencia y todos los Starter) | US$ 1.450/mes | US$ 4.700/mes | 6 / 8 | desde US$ 50 / desde US$ 75 | 1.000 / 2.000 / 10.000 | 500 / 5.000 / 10.000 |

- **Marketing Hub:** Enterprise excluye la tarifa de incorporación obligatoria. Aparece además un ítem a US$ 50/mes («US$ 50/mes si pagas anualmente»), con la nota «También incluido en Marketing Hub Pro y Enterprise»; no se identificó a qué producto corresponde.
- **Plataforma de Clientes:** «Descuentos disponibles solo para clientes nuevos. Oferta por tiempo limitado».

## Complementos (`/add-ons`)

| Complemento | Precio |
| --- | --- |
| Créditos de HubSpot adicionales | US$ 10 por 1.000 créditos (se renuevan mensualmente) |
| Aumento del límite de WhatsApp (+1.000 mensajes/mes) | US$ 70/mes |
| Aumento en el límite de anuncios | US$ 100/mes |
| SSL personalizado | US$ 100/mes |
| Aumento del límite de contexto conversacional | US$ 50/mes |
| Aumento del límite de números de teléfono | US$ 25/mes |
| Aumento del límite de videos | US$ 50/mes |
| Aumento del límite de usuarios | US$ 200/mes |
| Aumento del límite de workflows | US$ 200/mes |
| Aumento del límite de listas | US$ 200/mes |
| Aumento del límite de equipos | US$ 200/mes |
| Aumento del límite de minutos de llamadas | US$ 50/mes |
| Aumento en el límite de API | US$ 500/mes |
| Aumento del límite de informes | US$ 200/mes |
| SMS para ventas y servicio al cliente | US$ 75/mes |
| Aumento del límite de firmas electrónicas | US$ 60/mes |
| Aumento del límite de propiedades personalizadas | US$ 220/mes |

## Lo que el portal no muestra

- **Monto de la tarifa de incorporación (onboarding) obligatoria.** El portal sólo dice que el precio de Enterprise no la incluye. Los montos que se usaban hasta ahora salen del catálogo legal de HubSpot y de la skill, con as-of del 19/09/2026:
  - Marketing: US$ 3.000 en Pro y US$ 7.000 en Enterprise.
  - Sales y Service: US$ 1.500 en Pro y US$ 3.500 en Enterprise.
  - Bundle: no publicado.

  Hay que reverificarlos en `legal.hubspot.com/hubspot-product-and-services-catalog` antes de usarlos.
- **Precio con compromiso anual frente a mensual.** La lectura es la vista por defecto del portal, sin toggle visible.
- **Smart CRM Starter.**

## Cambios frente a la skill (as-of 19/09/2026)

| Producto | Antes (skill) | Portal (05/11/2026) |
| --- | --- | --- |
| Marketing Hub Pro | US$ 800/mes | **US$ 890/mes** |
| Sales / Service Hub Pro | US$ 90/licencia | **US$ 100/licencia** |
| Content Hub Pro | US$ 450/mes | **US$ 500/mes** |
| Data Hub Pro | US$ 720/mes | **US$ 800/mes** |
| Plataforma de Clientes Pro | US$ 1.300/mes | **US$ 1.450/mes** |

Los demás valores coinciden: Sales/Service Enterprise US$ 150, Marketing Enterprise US$ 3.600, Content Enterprise US$ 1.500, Data Enterprise US$ 2.000, Plataforma Enterprise US$ 4.700, Revenue US$ 95 / 140, y Smart CRM US$ 50 / 75.
