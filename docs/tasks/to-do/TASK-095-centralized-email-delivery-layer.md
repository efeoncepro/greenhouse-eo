# TASK-095 - Centralized Email Delivery Layer

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | `10` |
| Domain | `platform` |
| GitHub Project | `Greenhouse Delivery` |

## Summary

Centralizar todas las solicitudes de email de Greenhouse en una capa de delivery unificada que use Resend como provider de salida, pero que exponga un contrato propio para request, template resolution, attachments, retries, observability y routing por tipo de notificación. La meta es que Payroll, Finance, Delivery, Permissions y flujos de sistema dejen de enviar mails por caminos ad hoc.

## Why This Task Exists

Hoy los emails del repo viven repartidos entre servicios y helpers concretos:

- auth y acceso
- recibos y payroll
- notificaciones reactivas
- posibles flujos de finanzas, permisos y delivery

Aunque ya existe infraestructura de notificaciones y Resend como canal transaccional, el contrato de envío sigue siendo fragmentado. Eso hace difícil:

- estandarizar templates y metadatos
- observar entregabilidad y retries
- compartir lógica de adjuntos o links seguros
- decidir qué eventos merecen email y cuáles deben quedarse en notificaciones in-app
- reutilizar la infraestructura existente de notifications sin inventar integraciones por módulo

## Goal

- Definir una capa canónica de delivery de emails para Greenhouse.
- Usar Resend solo como provider de salida, no como contrato de negocio.
- Centralizar reglas comunes de envío, retries, metadata y observabilidad.
- Permitir que el sistema de notificaciones y los módulos de negocio consuman una API estable de mail delivery.
- Reducir el drift entre flows de Payroll, Finance, Delivery, Permissions y Auth.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- Resend es el canal de salida, no la API de negocio
- el delivery de email debe poder ser invocado por módulos distintos sin duplicar lógica
- la notificación in-app y el email deben compartir, cuando aplique, un mismo contrato de evento o payload de negocio
- los attachments y links seguros deben resolverse desde la capa de delivery, no desde cada caller
- los emails de sistema no deben depender de gestos de UI para enviarse

## Dependencies & Impact

### Depends on

- `TASK-023` - notification system base, para alinear el delivery de mails con la infraestructura de notificaciones ya prevista
- `TASK-077` - receipts y delivery downstream como precedente operativo de adjuntos y batch delivery
- `TASK-094` - cierre de Payroll y notificación downstream a Finance/HR como primer caso de uso canónico

### Impacts to

- `src/lib/resend.ts`
- `src/emails/**`
- `src/lib/notifications/**`
- `src/lib/payroll/send-payroll-export-ready.ts`
- cualquier flujo futuro de auth, finance, delivery o permissions que hoy envía mails de forma ad hoc

### Files owned

- `src/lib/notifications/email-delivery/**`
- `src/lib/notifications/email-delivery.ts`
- `src/lib/resend.ts`
- `src/emails/**`
- `src/lib/notifications/**`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`

## Current Repo State

### Ya existe

- `Resend` ya está integrado como provider transaccional.
- `React Email` ya es la base de templates del repo.
- Hay notificaciones reactivas y un catálogo de emails ya documentado.
- Payroll ya envía correo downstream de cierre/exportación y recibos con helpers propios.

### Gap actual

- no existe una capa única y reusable para solicitar emails
- cada flujo puede terminar resolviendo destinatarios, templates y adjuntos por su cuenta
- no hay una política uniforme de delivery, metadata, retry ni trazabilidad por request
- la infraestructura de notificaciones todavía no opera como punto central de salida para los mails del producto

## Scope

### Slice 1 - Delivery API canónica

- definir un helper/servicio único para enviar emails de Greenhouse
- aceptar tipo de email, destinatarios, contexto de negocio, attachments y metadata
- resolver provider `Resend` detrás del helper

### Slice 2 - Template and policy registry

- centralizar resolución de templates por tipo de email
- definir reglas compartidas para asunto, preview text, from, recipients y adjuntos
- permitir que cada dominio aporte solo el contexto de negocio, no la infraestructura de envío

### Slice 3 - Notification synergy

- alinear la capa de delivery con el sistema de notificaciones existente
- permitir que ciertos eventos disparen notificación in-app y email desde el mismo contrato o payload
- dejar lista la base para Finance, Delivery, Permissions y futuras notificaciones de producto

### Slice 4 - First consumer migration

- migrar al menos un flujo canónico a la nueva capa
- Payroll puede ser el primer consumidor si no rompe la lane de cierre ya implementada
- dejar documentado qué flows siguen en legacy y cuáles ya usan la capa central

## Out of Scope

- rediseñar todo el sistema de notificaciones en una sola iteración
- reemplazar `React Email`
- cambiar el provider transaccional fuera de Resend
- migrar todos los emails del repo de una vez
- agregar campañas o newsletters

## Acceptance Criteria

- [ ] Existe una capa única para enviar emails de Greenhouse.
- [ ] Los módulos consumidores dejan de invocar Resend directamente para nuevos flujos.
- [ ] Templates, attachments y metadata pasan por un contrato compartido.
- [ ] La capa puede ser usada por Payroll, Finance, Permissions o Delivery sin duplicar lógica de entrega.
- [ ] El sistema de notificaciones puede compartir esa capa o integrarse con ella sin acoplamiento ad hoc.

## Verification

- tests unitarios de la capa de delivery
- tests de template resolution
- smoke de un flujo consumidor real
- `pnpm exec eslint ...`
- `pnpm exec vitest run ...`
- `pnpm build`
