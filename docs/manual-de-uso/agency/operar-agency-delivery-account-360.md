# Operar Agency, Delivery y Account 360

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Agency / Account 360 / Delivery
> **Rutas:** `/agency`, `/agency/organizations/[id]`, `/agency/clients`, `/agency/delivery`, `/agency/economics`, `/agency/sample-sprints`
> **Documentacion relacionada:** `docs/documentation/agency/agency-delivery-account-360-end-to-end.md`

## Antes de empezar

Usa Agency para operar cuentas y delivery. Usa Finance para caja/cobros/pagos. Usa HR/People para datos de colaboradores.

## Revisar una cuenta

1. Abre `/agency/organizations`.
2. Selecciona la organizacion.
3. Revisa facetas disponibles: identidad, CRM, delivery, economics, finance, services, spaces, team.
4. Si una faceta aparece degradada, abre el detalle o revisa el source indicado.
5. No interpretes una faceta faltante como cero; puede ser dato no sincronizado.

## Leer delivery e ICO

1. Abre `/agency/delivery` o la faceta delivery de Account 360.
2. Revisa periodo, freshness y fuente.
3. Mira RpA, OTD, FTR, cycle time, throughput y stuck assets.
4. Si hay señales Nexa/AI, tratalas como lectura operacional, no como evaluacion formal HR.
5. Si el periodo esta abierto, no lo compares como cierre definitivo.

## Revisar economics

1. Abre `/agency/economics`.
2. Revisa revenue/cost/margin por cuenta o space.
3. Si el detalle por servicio aparece incompleto, busca unresolved attribution.
4. No inventes margen de servicio si hay attribution unresolved.

## Operar Sample Sprints

1. Abre `/agency/sample-sprints`.
2. Revisa eligible deals y estado del sprint.
3. Registra progreso, aprobacion o outcome desde la superficie correspondiente.
4. No conviertas un sample sprint en revenue cerrado sin el flujo comercial/finance.

## Que no hacer

- No tomar `null` como cero.
- No tratar señales ICO como evaluaciones disciplinarias.
- No usar Agency para registrar cobros o pagos.
- No prometer Service P&L completo cuando la attribution esta unresolved.
- No abrir acceso a facetas por URL si el rol no lo permite.

## Problemas comunes

### Una faceta no aparece

Puede ser acceso insuficiente o source degradado. Revisa permisos, freshness y errores de facet.

### El margen por servicio no cuadra

Primero revisa `service_attribution_unresolved`. Si hay unresolved, el margen por servicio no esta listo para decision.

### Nexa da una recomendacion de delivery

Usala como apoyo operacional. La accion final sigue siendo del operador y debe respetar permisos, capacity y contexto comercial.
