# TASK-1749 — Tracking de marketing por Resend sobre un dominio propio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseño; decisión de negocio pendiente (Resend vs HubSpot) antes de ejecutar`
- Rank: `TBD`
- Domain: `growth|integrations`
- Blocked by: `TASK-1746 (cutover del correo transaccional a mail.efeoncepro.com)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar medición de clics y aperturas para el correo de marketing que sale por Resend, sobre un
dominio de envío propio y separado, sin exponer jamás a reescritura los correos que llevan un enlace
con credencial.

## Why This Task Exists

Hoy `efeoncepro.com` tiene `click_tracking=true` y `open_tracking=true` pero **no mide nada**: falta
el `tracking_subdomain`, y Resend documenta que el tracking sólo se activa cuando se cumplen las dos
condiciones. O sea: la configuración aparenta estar encendida y no produce un solo dato.

Completarla sobre el apex sería un error por dos razones. Primero, por el apex sale también correo
transaccional (pagos a contractors, permisos, invitaciones) y Resend advierte que el tracking en
transaccionales **empeora la entregabilidad** — los proveedores lo leen como señal de correo masivo.
Segundo, y más grave: el tracking **reescribe todos los `<a href>`**, y lo que le ocurre a un enlace
con credencial en el fragmento (`#access=…`) **no está documentado por Resend** — barrido exhaustivo
de docs, blog, changelog y repo oficial. El modo de falla es silencioso: el enlace abre, la página
carga, y el candidato no entra.

Un tercer motivo hace la decisión urgente en el tiempo aunque la task no lo sea: configurar un
`tracking_subdomain` es **irreversible** — se puede cambiar, nunca remover. Es una decisión que
conviene tomar sobre el dominio correcto y con la pregunta comercial resuelta.

## Goal

- Medir clics y aperturas del correo de marketing que efectivamente sale por Resend.
- Dejar estructuralmente imposible que esa medición toque un correo con credencial.
- Resolver antes si ese tracking es incremental o si HubSpot ya lo cubre, para no pagar el costo de
  entregabilidad a cambio de un dato duplicado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/operations/runbooks/resend-email-lifecycle-rollout.md`
- `.claude/skills/resend-email-platform/SKILL.md`

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

- **Depende de:** el cutover del correo transaccional a `mail.efeoncepro.com` (TASK-1746). Mientras
  los correos con credencial sigan saliendo por el apex, activar tracking ahí los rompe.
- **Impacta a:** cualquier consumidor de métricas de correo de Growth; la entregabilidad del correo
  que se mueva al dominio nuevo.

### Files owned

- `src/lib/email/delivery.ts` — resolución del remitente por tipo de correo.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — estado de tracking por dominio.
- `.claude/skills/resend-email-platform/SKILL.md` — mapa de dominios y su postura de tracking.

## Current Repo State

**Ya existe:**

- `resolveEmailFromAddress(emailType)` en `src/lib/email/delivery.ts:46` — el remitente **ya se
  resuelve por tipo de correo**, no es global. Hoy separa los tipos con marca de agencia del resto.
- `mail.efeoncepro.com` creado en Resend el 2026-08-19 (`us-east-1`), con `click_tracking=false` y
  `open_tracking=false`. **NO está verificado todavía:** al 2026-08-19 19:00 UTC su estado es `pending`. El DNS en
  HostGator está completo y correcto — DKIM `resend._domainkey.mail` publicado con valor idéntico byte a byte al
  esperado (218 chars, una sola cadena, TTL 14400), SPF TXT y MX de `send.mail` publicados — así que no falta nada del
  lado nuestro; falta que Resend complete su chequeo. ⚠️ **No re-disparar `POST /domains/{id}/verify`**: resetea los
  tres registros a `pending` y alarga la espera (la zona tiene negative-cache SOA de 86400 s, que puede explicar la
  demora si Resend consultó antes de que el registro existiera).
- El apex `efeoncepro.com` verificado, con `click_tracking=true`/`open_tracking=true` y
  `tracking_subdomain=None` — encendido sin efecto.

**Gap:**

- No existe un dominio de envío dedicado a marketing.
- No está resuelto qué correos de marketing salen por Resend y cuáles por HubSpot (el SPF del apex
  incluye `48713323.spf02.hubspotemail.net`).
- Los flags del apex están en un estado engañoso: encendidos sin producir datos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION PLAN (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Decisión: ¿Resend o HubSpot?** Inventariar qué tipos de correo de marketing salen hoy
  por Resend (`ai_visibility_grader_report`, `growth_ebook_delivery`, `broadcast`, los que aplique) y
  cuáles por HubSpot. Si HubSpot ya cubre la medición del correo comercial, la task se cierra como
  `no aplica` con esa evidencia y se apagan los flags huérfanos del apex. Entregable: nota de
  decisión con el inventario.
- **Slice 2 — Dominio de marketing.** Verificar `news.efeoncepro.com` (o el nombre que se decida) en
  Resend, publicar sus DNS y configurarle `tracking_subdomain` + `click_tracking`/`open_tracking`.
  Readback obligatorio con `GET /domains/{id}` — el `PATCH` devuelve sólo `{object, id}` y no
  confirma estado.
- **Slice 3 — Ruteo del remitente.** Extender `resolveEmailFromAddress` para que los tipos de
  marketing salgan por el dominio nuevo, igual que hoy se hace con los de agencia. Sin tocar el
  ruteo de los tipos token-sensitive.
- **Slice 4 — Higiene del apex.** Apagar `click_tracking`/`open_tracking` en `efeoncepro.com`: no
  producen datos y su estado encendido invita a completarlos sobre el dominio equivocado.

## Out of Scope

- Tocar el tracking de `mail.efeoncepro.com`. **Nunca**, en ninguna circunstancia.
- Mover correo transaccional (pagos, permisos, invitaciones) al dominio de marketing.
- Migrar campañas desde HubSpot a Resend, o al revés.
- Construir dashboards o reportes sobre las métricas nuevas.

## Detailed Spec

El mecanismo canónico de Resend para tener tracking en marketing y no tenerlo en transaccional es
**un dominio de envío por propósito**: cada dominio (incluidos subdominios) es un objeto independiente
con su propia configuración de tracking. No existe override por email, por link ni por header — la
granularidad es el dominio, y eso está confirmado contra la documentación oficial.

Beneficio adicional documentado: aislar la reputación. Si una campaña de marketing acumula quejas, el
correo que un candidato necesita recibir no se ve afectado.

Detalle técnico completo en `.claude/skills/resend-email-platform/SKILL.md` y sus referencias.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

El Slice 1 decide si los demás existen. **No ejecutar el Slice 2 antes de confirmar que el cutover
transaccional de TASK-1746 está completo y verificado**: mientras un correo con credencial salga por
un dominio con tracking, el riesgo está vivo.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Activar tracking sobre un dominio que emite credenciales | Hiring / acceso candidato | Baja | El tracking sólo se configura en el dominio de marketing; el transaccional ya migró | `hiring.assessment.access_never_exchanged` |
| Configurar `tracking_subdomain` en el dominio equivocado | Correo global | Media | **Es irreversible**: sólo se puede cambiar, nunca remover. Verificar el `id` del dominio antes del `PATCH` | Readback `GET /domains/{id}` |
| Peor entregabilidad del correo movido | Growth | Media | Warmup gradual; DMARC ya en `p=none` | Bounce rate < 4%, quejas < 0.08% |
| Duplicar medición que HubSpot ya hace | Growth | Media | El Slice 1 lo resuelve antes de gastar esfuerzo | — |

### Feature flags / cutover

Sin feature flag: el cutover es configuración de dominio en Resend más el ruteo del remitente. El
rollback es revertir el remitente al valor anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | N/A — sólo produce una decisión documentada | — | Sí |
| 2 | Dejar el dominio sin usar; **el `tracking_subdomain` NO se puede remover** | — | Parcial |
| 3 | Revertir el remitente al dominio anterior | < 10 min | Sí |
| 4 | Volver a encender los flags del apex | < 5 min | Sí |

### Production verification sequence

Verificar con `GET /domains/{id}` que el dominio de marketing quedó con tracking y que **`mail.` y el
apex siguen sin `tracking_subdomain`**. Enviar un correo de marketing de prueba y confirmar que el
evento `email.clicked` llega al webhook. Confirmar que un correo de assessment sigue llegando con su
enlace intacto.

### Out-of-band coordination required

Publicación de DNS del dominio nuevo (fuera del repo) y la decisión comercial del Slice 1.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/email/`
- Future candidate home: `remain-shared`
- Boundary: la resolución de remitente vive en `src/lib/email/delivery.ts`; la configuración de dominios es externa (Resend) y no se modela en el repo
- Server/browser split: server-only
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- **Source of truth:** la configuración de dominios vive en Resend, no en el repo. El repo sólo decide qué remitente usa cada tipo de correo.
- **Contract surface:** `resolveEmailFromAddress(emailType)` en `src/lib/email/delivery.ts`.
- **Data invariants:** un tipo de correo token-sensitive **nunca** puede resolver a un dominio con tracking configurado.
- **Tenant/access boundary:** no aplica; es configuración global de la plataforma de correo.
- **Idempotency/concurrency:** no aplica.
- **Migration/backfill/rollback:** sin migración. Rollback = revertir el remitente.
- **Sensitive data/error posture:** ningún cambio en el manejo de credenciales; el punto entero de la task es no exponerlas.
- **Audit/signal posture:** la señal `hiring.assessment.access_never_exchanged` cubre el fallo silencioso de enlace roto.
- **Runtime evidence:** readback del dominio vía API más un correo de prueba con evento de clic recibido.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una decisión documentada sobre si el tracking de marketing por Resend es incremental respecto de HubSpot, con el inventario de tipos de correo por proveedor.
- [ ] Si se decide avanzar: el dominio de marketing está verificado y su `GET /domains/{id}` muestra `tracking_subdomain` configurado y tracking activo.
- [ ] `GET /domains/{id}` de `mail.efeoncepro.com` muestra `tracking_subdomain = null` y ambos flags de tracking en `false`.
- [ ] `resolveEmailFromAddress` rutea los tipos de marketing al dominio nuevo y ningún tipo token-sensitive resuelve a un dominio con tracking.
- [ ] Un correo de marketing de prueba produce un evento `email.clicked` recibido por el webhook.
- [ ] Un correo de assessment de prueba llega con su enlace íntegro, verificado sobre el href recibido.
- [ ] Los flags de tracking del apex quedan apagados o justificados por escrito.

## Verification

`pnpm local:check` · tests focales de `src/lib/email` · readback de los tres dominios vía API de Resend · smoke de href recibido.

## Closing Protocol

- [ ] Fila actualizada en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el estado de tracking por dominio.
- [ ] `.claude/skills/resend-email-platform/SKILL.md` y su espejo reflejan el mapa final de dominios.
- [ ] Handoff y changelog actualizados.
- [ ] Lifecycle movido a `complete` y `docs/tasks/README.md` + registry sincronizados.

## Follow-ups

- Si el Slice 1 concluye que HubSpot ya cubre la medición, cerrar la task como `no aplica` y dejar sólo el Slice 4.

## Open Questions

- ¿Qué tipos de correo de marketing salen hoy por Resend y cuáles por HubSpot?
- ¿Nombre del dominio de marketing: `news`, `marketing`, u otro?
