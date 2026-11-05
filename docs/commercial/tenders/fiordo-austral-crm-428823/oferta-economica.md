# Oferta económica — Fiordo Austral, Wherex 428823 (PRELIMINAR v2)

> **Estado:** cuadro editorial preliminar v2 del 05/11/2026. **No es una cotización emitida ni aprobada.** El documento para el comprador se emite con la plantilla A4 después de que Julio apruebe la edición y los montos.
> **Cambio respecto de v1:** las **licencias** van separadas de la **implementación**, por instrucción de Julio. La implementación se recalculó con un alcance esbelto, a precio de mercado chileno; se descarta el v1 de USD 47.900 en servicios.
> **Fuente de las licencias:** página de precios dentro del portal Efeonce (`app.hubspot.com/pricing/48713323/sales`), consultada el 05/11/2026. Los precios están en USD y sujetos a impuestos. Esa página **no muestra el monto** del onboarding obligatorio.
> **Registro:** formal. Las bases piden detallar los costos de licencias, implementación y capacitación (§8).

## A. Licencias HubSpot (contrato directo de Fiordo Austral con HubSpot)

Las licencias las factura HubSpot directamente a Fiordo Austral, a su precio vigente. Efeonce gestiona la contratación y la administración inicial. No forman parte del precio de los servicios de Efeonce.

| Edición | Precio por licencia | 10 licencias, mensual | 10 licencias, 12 meses |
| --- | --- | --- | --- |
| Sales Hub Professional | US$ 100 al mes | US$ 1.000 | **US$ 12.000** |
| Sales Hub Enterprise | US$ 150 al mes | US$ 1.500 | **US$ 18.000** |

- **Onboarding obligatorio de HubSpot:** no aplica cuando la implementación la realiza un Solutions Partner certificado. *(Confirmarlo por escrito con el especialista de HubSpot asignado a este negocio.)*
- **Créditos de HubSpot incluidos:** 3.000 en Professional y 5.000 en Enterprise.

## B. Servicios de implementación Efeonce (pago único)

Los servicios se cobran en USD más IVA.

| Componente | Alcance | Con Professional | Con Enterprise |
| --- | --- | --- | --- |
| Implementación | Descubrimiento, seguridad e identidad con Entra ID, configuración del CRM, migración desde Excel, integraciones con Microsoft 365, pruebas y prueba técnica de seguridad, puesta en marcha y estabilización | US$ 6.900 | US$ 10.900 |
| Capacitación | 10 usuarios y administradores, con material y grabaciones | US$ 1.000 | US$ 1.000 |
| **Total implementación** | | **US$ 7.900** | **US$ 11.900** |

## C. Soporte y operación Efeonce (mensual, meses 5 a 12)

| Componente | Con Professional | Con Enterprise |
| --- | --- | --- |
| Soporte con SLA S1–S4, mantenimiento preventivo e indicadores mensuales | US$ 250 al mes | US$ 375 al mes |
| 8 meses | US$ 2.000 | US$ 3.000 |

## D. Total año 1, como lo ve el comprador

| | Professional | Enterprise |
| --- | --- | --- |
| Licencias HubSpot (a HubSpot) | US$ 12.000 | US$ 18.000 |
| Implementación y capacitación (Efeonce, + IVA) | US$ 7.900 | US$ 11.900 |
| Soporte, 8 meses (Efeonce, + IVA) | US$ 2.000 | US$ 3.000 |
| **Total año 1** | **US$ 21.900** | **US$ 32.900** |

## E. Opcionales (no incluidos)

| Opcional | Valor |
| --- | --- |
| Integración con ERP QAD, de QAD hacia HubSpot | A cotizar tras la factibilidad. Rango indicativo a revisar con el criterio de mercado. |
| Licencias Microsoft faltantes, por ejemplo Entra ID P1/P2 o Defender for Cloud Apps | A cotizar como CSP según el inventario de Fiordo Austral |

## Condiciones propuestas (a aprobar)

- **Hitos de pago de la implementación:**
  - 50 % al firmar.
  - 50 % con el acta de paso a producción.
- **Soporte:** mensual, a mes vencido.
- **Validez de la oferta:** 60 días.

---

## Interno — no va al comprador

- **Base de costo:** costos de los perfiles HubSpot del portal y de V3 (Consultor ≈ US$ 62/h, Implementador ≈ US$ 43,6/h, Desarrollador ≈ US$ 20,4/h), con el alcance esbelto. El desarrollador hace la configuración y el colector; se usan menos horas senior.
- **Horas y costo:**

  | Edición | Consultor | Implementador | Desarrollador | Seguridad | Datos | PM | Costo de implementación y capacitación |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Professional | 16 h | 40 h | 100 h | 16 h | 12 h | 16 h | ≈ US$ 5.400 |
  | Enterprise | 20 h | 50 h | 110 h | 20 h | 12 h | 20 h | ≈ US$ 6.400 |

  - Soporte: ≈ US$ 134 de costo al mes.
- **Margen sobre los servicios:**
  - Professional: ≈ 35 %, **bajo el piso de 45 %**.
  - Enterprise: ≈ 50 %.
  - Si Julio acepta el margen de Professional por competitividad, es decisión suya.
- **Edición:** Julio prefiere Professional si eso permite ganar.
  - Con Professional, la API de auditoría hacia Wazuh solo recibe inicios de sesión y eventos de seguridad.
  - Tampoco hay sandbox, objeto personalizado ni aprobaciones nativas.
  - Ninguno de esos puntos es una ausencia total de los controles críticos, pero se declaran como «cumple parcialmente».
  - El anexo de seguridad actual está escrito para Enterprise y habría que rehacerlo si se oferta Professional.
- **Comisión partner (no es descuento):** 20 % del MRR de licencias, hasta 3 años. Equivale a ≈ US$ 2.400 al año con Professional y ≈ US$ 3.600 al año con Enterprise.
