---
name: salesforce-marketing-cloud-engagement
description: Diseña, opera y comercializa Salesforce Marketing Cloud Engagement, incluidos journeys, automatizaciones, contenido, datos, APIs, deliverability, Connect y coexistencia con Marketing Cloud Next. Úsala para Engagement; no la uses como guía principal de Account Engagement, Personalization, Intelligence, Data 360 ni Next.
---

# Salesforce Marketing Cloud Engagement

Ayuda a Efeonce a operar y vender Marketing Cloud Engagement (MCE) con límites de producto, permisos y evidencia explícitos.

## Selecciona el modo

- `operate`: arquitectura, configuración, integración, QA, lanzamiento o soporte. Lee [implementation-operations.md](references/implementation-operations.md) y, según el caso, [deliverability.md](references/deliverability.md), [connect-coexistence.md](references/connect-coexistence.md) o [managed-ops.md](references/managed-ops.md).
- `sell`: discovery, fit, alcance, propuesta, pricing o expansión. Lee [commercial-offers.md](references/commercial-offers.md) y [partner-claims.md](references/partner-claims.md).
- `coexistence`: convivencia con Sales/Service Cloud, Data 360, Engagement+ o Marketing Cloud Next. Lee [platform-boundaries.md](references/platform-boundaries.md) y [connect-coexistence.md](references/connect-coexistence.md).

Combina modos cuando el pedido lo requiera, pero separa diagnóstico, decisión de producto, licencia, implementación y operación administrada.

## Invariantes

1. Confirma producto, edición, MID/Business Unit, entorno, región, canales, contrato y permisos antes de diseñar o mutar.
2. No llames a Engagement `legacy`, descontinuado ni reemplazado. No infieras EOL, migración obligatoria ni paridad con Next.
3. No confundas Engagement con Account Engagement, Marketing Cloud Next, Data 360, Personalization o Intelligence. Usa [platform-boundaries.md](references/platform-boundaries.md).
4. Trata `Contact Key` como identidad durable. No lo cambies, recicles ni cargues sin mapa de identidad, deduplicación, consentimiento y reconciliación.
5. Toda activación o envío requiere audiencia autorizada, supresiones, consentimiento por canal/jurisdicción, test contacts, QA, aprobación y rollback proporcional.
6. No publiques journeys, automatizaciones, contenido, queries, imports, packages o envíos sin autorización explícita. Analizar o proponer no autoriza a mutar la org.
7. En integraciones, preserva idempotencia, límites de API, trazabilidad, redacción de secretos, reintentos acotados y reconciliación.
8. No prometas features, pricing, GA, certificaciones, nivel de partnership, capacidad de reventa ni SLA desde memoria. Registra la fuente y fecha en un ledger.
9. Si faltan accesos o evidencia, entrega diseño y checklist; marca el estado como no verificado.

## Flujo mínimo

1. Clasifica modo y superficie.
2. Obtén evidencia de org, datos, consentimiento, entregabilidad y ownership.
3. Define estado actual, objetivo, riesgos, dependencias, aceptación y rollback.
4. Ejecuta sólo dentro de la autorización; verifica en la superficie real.
5. Entrega evidencia, cambios, métricas, riesgo residual y siguiente decisión.

## Recursos

- Autoridad y vigencia: [SOURCES.md](SOURCES.md)
- Términos: [GLOSSARY.md](GLOSSARY.md)
- Errores que bloquear: [ANTIPATTERNS.md](ANTIPATTERNS.md)
- Plantillas: [templates/](templates/)
