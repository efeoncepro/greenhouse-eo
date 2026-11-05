# Oferta económica — Fiordo Austral, Wherex 428823 (v3, Pro esbelto)

> **Estado:** cuadro editorial v3 del 05/11/2026. El escenario es «Pro esbelto», elegido por Julio. **Todavía no es una cotización emitida.** Se emite con la plantilla A4 (`docs/commercial/templates/cotizacion-a4/`) una vez confirmados la moneda y el waiver del onboarding.
> **Licencias:** precio del portal Efeonce, consultado el 05/11/2026. Salen del pricebook de TASK-1405:
> `pnpm --silent pricing:v3 hubspot estimate --hub sales --tier pro --seats 10 --waive-onboarding`
> (US$ 1.000 al mes, US$ 12.000 el año 1). La evidencia está en `docs/services/hubspot-as-a-service/HUBSPOT_PORTAL_PRICING_SNAPSHOT_2026-11-05.md`.
> **Regla:** las licencias van separadas de la implementación. Las factura HubSpot a Fiordo Austral y nunca se suman a lo que factura Efeonce.
> **Registro:** formal. Las bases piden detallar los costos de licencias, implementación y capacitación (§8).

## A. Licencias HubSpot (contrato directo de Fiordo Austral con HubSpot)

Las licencias las factura HubSpot directamente a Fiordo Austral, a su precio vigente. Efeonce gestiona la contratación y la administración inicial.

| Ítem | Cantidad | Precio de lista | Mensual | 12 meses |
| --- | --- | --- | --- | --- |
| Sales Hub Professional, licencia | 10 | US$ 100 por licencia al mes | US$ 1.000 | **US$ 12.000** |
| Onboarding obligatorio de HubSpot | 1 | — | — | **US$ 0**: no aplica cuando implementa un Solutions Partner certificado *(confirmar por escrito con HubSpot)* |

Incluye 3.000 créditos de HubSpot al mes.

## B. Servicios de implementación Efeonce (pago único, US$ + IVA)

| Componente | Alcance | Valor |
| --- | --- | --- |
| Implementación | Descubrimiento, seguridad e identidad con Entra ID (SSO, colector Wazuh, respaldo diario inmutable), configuración del CRM, migración desde Excel, integraciones con Microsoft 365, pruebas y prueba técnica de seguridad, puesta en marcha y estabilización | US$ 6.900 |
| Capacitación | 10 usuarios y administradores, con material y grabaciones | US$ 1.000 |
| **Total implementación** | | **US$ 7.900** |

## C. Soporte y operación Efeonce (mensual, meses 5 a 12, US$ + IVA)

| Componente | Mensual | 8 meses |
| --- | --- | --- |
| Soporte con SLA S1–S4, mantenimiento preventivo e indicadores mensuales | US$ 250 | US$ 2.000 |

## D. Resumen año 1

| Factura | Concepto | Año 1 |
| --- | --- | --- |
| HubSpot | Licencias Sales Hub Professional | US$ 12.000 |
| Efeonce | Implementación, capacitación y soporte (+ IVA) | US$ 9.900 |

## E. Opciones (no incluidas)

| Opción | Valor |
| --- | --- |
| **Sales Hub Enterprise.** Agrega de forma nativa auditoría completa por API, sandbox, conjuntos de permisos, permisos por campo, objetos personalizados, aprobaciones nativas y respaldo diario programado | Licencias: US$ 150 por licencia al mes, US$ 1.500 al mes (US$ 18.000 anuales). Servicios: implementación y capacitación por US$ 11.900 y soporte por US$ 375 al mes. |
| Integración con ERP QAD, de QAD hacia HubSpot | A cotizar tras la factibilidad (F4) |
| Licencias Microsoft faltantes, por ejemplo Entra ID P1/P2 o Defender for Cloud Apps | A cotizar como CSP según el inventario de Fiordo Austral |

## Condiciones propuestas

- **Hitos de pago de la implementación:**
  - 50 % al firmar.
  - 50 % con el acta de paso a producción.
- **Soporte:** mensual, a mes vencido.
- **Validez de la oferta:** 60 días.

---

## Interno — no va al comprador

- **Horas (Pro):**

  | Consultor | Implementador | Desarrollador | Seguridad | Datos | PM | Total |
  | --- | --- | --- | --- | --- | --- | --- |
  | 16 h | 40 h | 100 h | 16 h | 12 h | 16 h | 200 h |

  - Costo de implementación y capacitación: ≈ US$ 5.400.
  - Costo del soporte: ≈ US$ 134 al mes.
- **Margen sobre los servicios:** ≈ 35 %, bajo el piso de 45 %.
  - Julio eligió este escenario sabiendo ese margen, que estaba en la tabla comparativa del 05/11/2026.
  - Si la ejecución exige más horas, el riesgo lo absorbe el margen. Hay que vigilar el alcance de F1 (colector Wazuh y respaldo).
- **Opción Enterprise:** margen ≈ 50 %.
- **Comisión partner (no es descuento):** 20 % del MRR de licencias, hasta 3 años. Con Professional son ≈ US$ 2.400 al año.
- **Pendientes antes de emitir:**
  - moneda de presentación (USD o CLP);
  - waiver del onboarding y precio de US$ 100 frente a US$ 90 con compromiso anual, a confirmar con el especialista de HubSpot (nserrano@hubspot.com);
  - comisión de Wherex si se adjudica.
