# Mi Espacio y self-service end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** My Space / Self-service / Personas
> **Rutas principales:** `/my`, `/my/profile`, `/my/performance`, `/my/payment-profile`, `/my/payroll`, `/my/leave`, `/my/onboarding`, `/my/contracts`, `/my/contractor`, `/my/delivery`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md`, `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`, `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md`

## Para que sirve

Mi Espacio es la superficie self-service del colaborador o contractor. Permite ver datos propios, performance operativa, payroll/recibos, permisos, onboarding, payment profile, contratos/ofertas y contractor self-service.

La regla central: self-service siempre resuelve el sujeto desde la sesion. El navegador no debe decidir que `memberId` leer.

## Evidencia revisada

Codigo y rutas:

- APIs `src/app/api/my/**`, `src/app/api/hr/goals/my`, `src/app/api/hr/onboarding/my`.
- Vistas `src/views/greenhouse/my/**`, contractor self-service, payment profile, performance.
- Librerias `src/lib/person-360/**`, `src/lib/person-legal-profile/**`, `src/lib/contractor-engagements/self-service-*`, `src/lib/finance/beneficiary-payment-profiles/**`, `src/lib/ico-engine/**`.

DB agregada sin PII:

- `members`: 176; `identity_profiles`: 183.
- `member_skills`: 13; `member_tools`: 27; certifications/languages existen.
- `person_identity_documents`: 5; `person_addresses`: 9; con audit logs.
- Leave self-service: `leave_requests` 12, `leave_balances` 108.
- Onboarding: 40 instances y 376 items.
- Contractor self-service tiene engagement/submissions/payables reales.
- Payroll self-service tiene 21 entries y 23 receipts.

## Mapa funcional

| Surface | Que muestra/opera | Source |
|---|---|---|
| `/my/profile` | datos propios, identidad, organizacion, skills/tools | Core/person readers |
| `/my/performance` | ICO propio, Nexa advisory, metricas operativas | API self-service redacted |
| `/my/payment-profile` | solicitudes/perfiles de pago propios | beneficiary payment profiles |
| `/my/payroll` | recibos/entradas propias | payroll self-service |
| `/my/leave` | solicitudes de permisos propias | HR leave |
| `/my/onboarding` | checklist asignado | onboarding instances |
| `/my/contracts` y `/my/offers` | documentos/ofertas propios | workforce contracting |
| `/my/contractor` | evidencia, boletas/facturas, entregas | contractor engagement self-service |

## Fronteras de seguridad

- `/api/my/*` debe usar `requireMyTenantContext` o equivalente.
- No se acepta `memberId` arbitrario del cliente para ver otra persona.
- Performance self-service no muestra costo, salario, bill rate ni contexto admin-only.
- Nexa en Mi Espacio debe responder desde datos propios y documentos permitidos.
- Mentions o links a Agency/People solo deben navegar si el usuario ya tiene acceso.

## Que hace automatico Greenhouse

- Resuelve `memberId` desde la sesion.
- Redacta DTOs self-service.
- Muestra estados vacios/degradados cuando faltan fuentes.
- Usa readers propios para payroll, leave, onboarding, contractor y performance.

## Que hace el usuario

- Actualiza datos permitidos o solicita cambios.
- Sube evidencia/boleta si es contractor.
- Revisa recibos y documentos propios.
- Solicita permisos.
- Lee metricas personales como orientacion operacional, no evaluacion formal.

## Preguntas que Nexa debe responder

- Donde veo mi liquidacion/recibo?
- Como actualizo mi perfil de pago?
- Como subo evidencia como contractor?
- Como solicito permiso?
- Que significa mi desempeno en `/my/performance`?
- Por que Nexa no puede mostrarme datos de otra persona?

## Documentacion relacionada

- `docs/documentation/plataforma/mi-perfil.md`
- `docs/documentation/identity/datos-legales-personales.md`
- `docs/manual-de-uso/identity/datos-legales-personales.md`
- `docs/documentation/finance/mi-cuenta-de-pago-self-service.md`
- `docs/documentation/hr/contratistas-self-service.md`
- `docs/manual-de-uso/hr/contratistas.md`
