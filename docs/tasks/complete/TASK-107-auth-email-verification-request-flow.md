# TASK-107 - Auth Email Verification Request Flow

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Medio` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Rank | `34` |
| Domain | `identity` |
| Legacy ID | `CODEX_TASK_Transactional_Email_System` |
| GitHub Project | `Greenhouse Delivery` |

## Summary

Hoy el repo tiene el template `verify_email` y el consumidor de entrega para emails centralizados, pero no tiene un flujo canónico que emita el token de verificación y mande ese correo.

Esta task cierra esa deuda adyacente sin mezclarla con `TASK-095`: el objetivo es exponer un endpoint de request de verificación que genere el token `verify` y envíe el mail usando `sendEmail()`.

## Why This Task Exists

El brief histórico de email transaccional todavía documenta `POST /api/auth/verify-email` como flujo esperado, pero en runtime solo existe el consumer que consume el token y marca el email como verificado.

Resultado:
- existe template y registry, pero no sender real
- el flujo de verificación queda incompleto para onboarding o cambio de email
- el naming y la ruta actual no están alineados con el spec histórico

## Goal

- Exponer un endpoint canónico para solicitar verificación de email.
- Generar token `verify` con expiración de 24 horas.
- Enviar el correo con `verify_email` vía `sendEmail()`.
- Mantener el endpoint actual de consume funcionando o alinearlo explícitamente si se decide unificar naming.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/CODEX_TASK_Transactional_Email_System.md`

Reglas obligatorias:

- el request de verificación debe reutilizar la capa centralizada de email delivery
- el token de verificación debe seguir el contrato canónico de `auth-tokens`
- el flujo de consume no debe romper lo que ya valida/verifica hoy
- el cambio no debe mezclar onboarding, reset password o invite en el mismo slice

## Dependencies & Impact

### Depends on

- `TASK-095` (complete) — capa centralizada de email delivery ya disponible
- `src/lib/auth-tokens.ts` — emisión/consumo de tokens `verify`
- `src/emails/VerifyEmail.tsx` — template ya existente

### Impacts to

- `src/app/api/account/verify-email/route.ts` — consume actual
- `src/app/api/auth/verify-email/route.ts` o ruta equivalente de request
- `src/lib/email/templates.ts` — si se ajusta el contexto o el caller
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`

### Files owned

- `src/app/api/auth/verify-email/route.ts`
- `src/app/api/account/verify-email/route.ts`
- `src/lib/auth-tokens.ts`
- `src/lib/email/templates.ts`
- `src/lib/email/types.ts`
- `src/app/(blank-layout-pages)/auth/**` si se agrega CTA/UI de reenvío

## Current Repo State

### Ya existe

- `verify_email` template registrado en `src/lib/email/templates.ts`
- `VerifyEmail.tsx` implementado en `src/emails/VerifyEmail.tsx`
- `sendEmail()` centralizado en `src/lib/email/delivery.ts`
- route de consume de verificación en `src/app/api/account/verify-email/route.ts`
- token store con tipos `reset`, `invite`, `verify`

### Gap actual

- no existe el sender canónico para solicitar verificación de email
- la documentación histórica habla de `POST /api/auth/verify-email`, pero runtime no lo expone
- el flujo de cambio de email/onboarding queda incompleto desde el punto de vista de UX y soporte

## Scope

### Slice 1 - Request endpoint canónico

- crear endpoint de request para verificación de email
- validar identidad o email según el flujo definido
- emitir token `verify` con TTL de 24h
- construir `verifyUrl` seguro
- enviar `verify_email` vía `sendEmail()`

### Slice 2 - Alignment del consume actual

- revisar si `src/app/api/account/verify-email/route.ts` debe quedarse como consume o moverse a naming más explícito
- asegurar que el consume siga validando y marcando `email_verified` sin regresiones
- ajustar docs y microcopy si el naming final cambia

### Slice 3 - Tests y docs

- tests para emisión + envío del correo
- tests para consume de token `verify`
- actualizar arquitectura viva y handoff

## Out of Scope

- rediseñar onboarding completo de Auth
- agregar UI de settings para cambio de email si no es necesario para cerrar el flujo
- tocar reset password o invite más allá de reutilizar la capa central
- agregar analytics o tracking de apertura/click

## Acceptance Criteria

- [ ] Existe un endpoint de request que genera token `verify` con expiración de 24h
- [ ] El request envía un correo con `verify_email` usando `sendEmail()`
- [ ] El consume actual sigue marcando `email_verified = true` al validar token
- [ ] Tests unitarios o de ruta cubren request y consume
- [ ] La arquitectura y el task index quedan alineados al flujo real

## Verification

- `pnpm exec vitest run` sobre tests de Auth/email relacionados
- `pnpm exec eslint` sobre las rutas y helpers tocados
- `pnpm build`

