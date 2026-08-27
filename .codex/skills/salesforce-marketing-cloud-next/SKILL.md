---
name: salesforce-marketing-cloud-next
description: Opera, diseña y vende Salesforce Marketing Cloud Next en ediciones Growth o Advanced, incluidos Data 360, Flow, Agentforce, canales, consentimiento y coexistencia con Marketing Cloud Engagement o Account Engagement. Úsala para evaluación de fit, arquitectura, implementación, propuesta comercial, migración selectiva y managed operations; no para operar Journey Builder o Automation Studio como producto principal.
---

# Salesforce Marketing Cloud Next

Esta skill aporta el dominio de **Marketing Cloud Next** para dos resultados: usar la plataforma con control y vender servicios que puedan entregarse. No supone autorización para mutar una org, activar canales, consumir créditos, importar personas ni enviar comunicaciones.

## Selecciona un modo

- `operate`: diseña, configura, verifica u opera Growth/Advanced. Lee `references/product-map-and-boundaries.md` y `references/implementation-and-operations.md`.
- `sell`: califica, diseña una oferta o redacta una propuesta. Lee `references/commercial-discovery-and-fit.md`; carga producto y operaciones para validar delivery.
- `coexist`: evalúa Engagement+, Account Engagement+ o una transición selectiva. Lee `references/coexistence-and-migration.md` antes de recomendar arquitectura.

Lee `SOURCES.md` y `references/release-ledger.md` siempre que cites edición, disponibilidad, entitlement, límite, consumo, precio o roadmap. Usa las plantillas sólo para el entregable solicitado.

## Contrato de decisión

1. Define el outcome, el stack instalado y el sistema de registro antes de elegir producto o edición.
2. Separa capacidad técnica, entitlement contractual, configuración y consumo. Que una opción aparezca en UI no demuestra derecho de uso ni costo incluido.
3. Modela Salesforce Platform, Data 360, identidad, consentimiento, CMS, Flow, canales y Agentforce como dependencias explícitas.
4. Diseña primero una activación reversible: audiencia de prueba, supresión, límites de consumo, observabilidad y reconciliación.
5. En venta, separa licencia, add-ons/créditos, implementación, migración y managed operations. Cotiza sólo con evidencia vigente.
6. Declara los supuestos, gaps de evidencia, riesgos y decisión `fit | fit condicionado | no fit`.

## Reglas duras

- **Nunca** presentes Marketing Cloud Next como cambio de nombre o reemplazo automático de Marketing Cloud Engagement o Account Engagement.
- **Nunca** recomiendes un `rip-and-replace` por defecto. Conserva activos que sigan siendo útiles y migra por capability, audiencia, journey y evidencia.
- **Nunca** uses funciones de Winter ’27 preview, beta, pilot o developer preview como base contractual, promesa de fecha, pricing o criterio de compra. Sólo productos y funciones GA verificadas pueden entrar al alcance comprometido.
- **Nunca** confundas `Agentforce Marketing`, marca/capacidad, con una edición contractual concreta. Confirma SKU, edición, permisos y créditos.
- **Nunca** actives Flow, campañas, segmentos o canales productivos sin confirmación humana, consentimiento verificable, población de prueba, supresión y rollback.
- **Nunca** afirmes precio, límite, disponibilidad regional, partner status o derecho de reventa de memoria. Registra fuente y `as-of`.
- **Nunca** trates datos unificados como consentimiento para contactar. Identidad, preferencia, propósito, canal y jurisdicción se gobiernan por separado.

## Evidencia y cierre

Marca hechos como `verificado | condicionado | no verificado`. Antes de llamar operativo a un diseño, exige evidencia proporcional de provisioning, permissions, Data 360, identidad, consentimiento, dominio/canal, pruebas, consumo y monitoreo. Una configuración local o captura de pantalla no prueba activación productiva.

Usa `ANTIPATTERNS.md` para revisar riesgos y `GLOSSARY.md` para preservar nomenclatura.
