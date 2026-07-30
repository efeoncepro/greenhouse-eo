# Efeonce Talent Assurance — Economic Guardrails V1

## Status

- State: `Proposed`
- Date: 2026-07-30
- Owner: Finance + Pricing + Commercial, con Talent/Operations como owners de capacidad
- Related decision: [Efeonce Talent Assurance Decision V1](../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md)
- Scope: ofertas que comprometen personas, pods, capacidad gestionada, embedded capacity o staffing para clientes

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

