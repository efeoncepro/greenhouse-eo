# Efeonce Talent Assurance — Economic Guardrails V1

## Status

- State: `Accepted` — principios económicos, aprobación del operador 2026-10-09
- Date: 2026-07-30
- Activation: costos, precios, reservas y pisos de margen concretos pendientes de validación Finance/Commercial
- Owner: Finance + Pricing + Commercial, con Talent/Operations como owners de capacidad
- Related decision: [Efeonce Talent Assurance Decision V1](../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md)
- Scope: ofertas que comprometen personas, pods, capacidad gestionada, embedded capacity o staffing para clientes

## Alcance de la aceptación

El operador aprobó Talent Assurance el 2026-10-09; estos guardrails son parte del estándar aceptado.
No se aprueban cifras, precios, contratos ni interfaces Finance por esa decisión. `TASK-1607` conserva la
implementación del gate y los owners económicos validan cada compromiso. La primera aplicación regional
documentada es el [modelo de capacidad CRM/RevOps](revenue-operations-crm/CRM_SPECIALIST_CAPACITY_BUSINESS_MODEL_V1.md).

## Purpose

Proteger la promesa `Verificado por Efeonce` de una economía que haga inviable contratar, entregar o retener la capacidad comprometida.

Este documento no fija precios, bandas salariales ni márgenes. Define qué debe estar costed y aprobado antes de prometer una capacidad.

## Core rule

```text
No se puede conservar la misma promesa
si el presupuesto no financia el estándar de capability,
la entrega, el gobierno y la continuidad.
```

Competitividad debe venir de menor costo de servir, mejor composición y scope claro; no de contratar por debajo del estándar o esconder riesgos en el margen.

## Cost layers to model

Por cuenta, oferta, país, rol y modalidad, el snapshot debe considerar:

- loaded cost de la persona;
- seniority y dedicación;
- Account/Delivery/Operations management;
- QA y revisión especializada;
- onboarding e inmersión del cliente;
- herramientas, infraestructura y licencias;
- backup, bench o sucesión;
- reemplazo y ramp-up;
- retrabajo y coordinación;
- working capital, FX, impuestos y obligaciones aplicables;
- margen bruto y contribution margin;
- sensibilidad base/downside/upside.

No esconder costo humano dentro de usage, pass-through o una promesa genérica de soporte.

## Feasibility gate

Antes de publicar una vacante o aprobar una propuesta, revisar:

1. estándar mínimo de capability;
2. talent availability/recruitability;
3. composición y seniority;
4. capacidad reservada y límites;
5. costo de continuidad;
6. margen mínimo y descuentos;
7. dependencia de una sola persona;
8. alternativa build/buy/borrow;
9. efecto sobre otras cuentas y sobrecarga;
10. decisión `go`, `re-scope`, `re-price` o `no-go`.

## Competitive options

Cuando el cliente presiona precio, las alternativas válidas son:

- reducir alcance o cadencia;
- reducir dedicación, manteniendo el estándar del rol;
- cambiar la composición del pod;
- separar capability senior de ejecución recurrente;
- usar especialistas compartidos;
- activar build o borrow verificado;
- modificar el engagement o mínimo comprometido;
- repricear la capacidad;
- declinar la oportunidad.

No es válido mantener el mismo alcance, seniority esperado y continuity promise con una economía que solo permite una contratación no reclutable.

## Candidate-market alignment

El intake de una vacante debe alinear:

- requirements indispensables;
- seniority real;
- modalidad y disponibilidad;
- compensación aprobada por Finance/Payroll;
- contexto y dificultad del cliente;
- tiempo de contratación;
- evidencia que se exigirá.

Una vacante con requisitos senior y un presupuesto no competitivo genera fricción innecesaria en Recruiting, deteriora candidate experience y empuja al sistema a aceptar evidencia insuficiente.

## Required evidence before commercial approval

- cost snapshot con fecha y jurisdicción;
- capacity envelope y composición;
- margen y sensibilidad;
- continuidad/backup plan;
- owner de staffing y owner de delivery;
- alcance, dependencias y exclusiones;
- evidencia de recruitability o alternativa de fulfillment;
- approval de Finance/Commercial cuando se cruce el piso o haya excepción.

## Decision states

- `hypothesis_only`: economics o disponibilidad no validadas;
- `approved_for_validation`: puede probarse con scope y stop condition;
- `commercially_approved`: economics, staffing y promesa aprobados;
- `scale_constrained`: la capacidad existe, pero no permite escalar al precio/volumen solicitado;
- `blocked_by_finance`: falta validación de costo, margen o cash;
- `no_go`: la promesa no puede sostenerse bajo las condiciones actuales.

## Aplicación local de los guardrails en Pricing V3

El [ADR operativo V3](../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y el
[Pricing Integrity Pack de capacidad](EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md) conectan estas capas
al costeo local: humano, recursos, plataforma genérica, Assurance/operación, continuidad y setup mantienen
identidad, cobertura, driver, moneda, vigencia y fuente. El catálogo no confirma una provisión por contener
un trial; los importes históricos o de prueba permanecen hipótesis hasta medir actividades y costos.

El compositor evita licencias duplicadas, valida usuarios/capacidad y atribuye pools e IA; el portfolio
reconcilia cuentas, interno y no asignado. Es evidencia aritmética de inputs declarados, no disponibilidad
real, recruitability, acceso contratado o continuidad financiada. Una licencia o precio público no demuestra
el estándar de capability de la persona. El preview de fee gestionado no convierte un rol en pod suficiente.

`compose assess` exige revisión económica/comercial aunque calcule, y reporta brechas con owner. Sus señales
no sustituyen el feasibility gate de Talent Assurance ni implementan TASK-1607/EPIC-038. TASK-2022 está completa
localmente; TASK-2017 conserva costos/asignaciones/terms pendientes. Cambios de salarios, licencias o reservas
crean versiones con impactos y nueva evidencia, nunca alteran snapshots aprobados ni contratos en vigor por
inferencia. [Manual de operación](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).

Delta 2026-10-11 — decisión del operador (CEO): en el cotizador, el costo de cada persona es el nivel salarial
objetivo del Excel de pricing (costo del perfil en Chile, ajustado por el factor de talento del país de la persona),
no la nómina actual, y no se conecta a ella. El margen real sobre personas hoy es mayor que el simulado; ese margen
simulado no mide lo que Efeonce paga ni reemplaza la evidencia de recruitability de este gate. Las cifras
comerciales y las excepciones al piso las decide el operador; `compose assess` no las aprueba.
