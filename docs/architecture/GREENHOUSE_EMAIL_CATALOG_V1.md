# CODEX TASK -- Greenhouse Email Catalog v1: transactional, security, executive y domain notifications

## Estado

Baseline de producto y arquitectura al 2026-03-19.

Esta task no reemplaza `CODEX_TASK_Transactional_Email_System.md`.

La relacion correcta entre ambas es:
- `CODEX_TASK_Transactional_Email_System.md` define la infraestructura base de envio, tokens, templates y flows de acceso
- esta task define el catalogo mas amplio de emails que Greenhouse necesitara como portal ejecutivo-operativo

## Resumen

Greenhouse ya necesita una capa de email mas amplia que el baseline de:
- `forgot password`
- `invite`
- `accept invite`
- `verify email`

Como portal multi-tenant de visibilidad ejecutiva y contexto operativo, Greenhouse debe enviar emails que cubran cuatro familias:

1. `Access & Identity`
2. `Security`
3. `Executive Digests & Decision Support`
4. `Domain Notifications`

La regla principal es:
- Greenhouse no debe convertirse en un sistema de spam operativo
- el email debe reservarse para acceso, riesgo, resumen ejecutivo y eventos de decision
- el detalle fino del trabajo diario sigue viviendo en Notion, Frame.io u otras fuentes

## Problema

Sin un catalogo claro de emails:
- se tiende a mezclar necesidades de acceso con necesidades de negocio
- cada modulo puede terminar inventando notificaciones por su cuenta
- se pierde consistencia de branding, microcopy, prioridad y reglas de audiencia
- el sistema puede terminar mandando demasiados emails o emails pobres en contexto

## Objetivo

Definir el catalogo oficial de emails de Greenhouse para priorizar implementacion y evitar drift entre:
- auth
- product
- data node / scheduled reports
- creative / ico
- finance / hr / ai tooling

## Principios

- `Resend` sigue siendo el canal de envio transaccional y operativo por defecto
- `React Email` sigue siendo la capa canonica de templates
- `PostgreSQL` debe guardar preferencias, programaciones, tokens y control plane de envio cuando aplique
- `BigQuery` se usa para logging, analytics y reporting de entregabilidad
- no todo evento merece un email
- si un evento se ve mejor como card, badge o inbox interno, no debe salir por email automaticamente

## Familias de email

## 1. Access & Identity

Emails centrados en acceso, onboarding y activacion de cuenta.

### Ya existentes o en baseline inmediato

- `forgot_password`
- `password_reset_success`
- `invite_user`
- `invite_reminder`
- `accept_invite_success`
- `verify_email`
- `welcome_account_activated`

### Valor

- reduce soporte manual
- mejora onboarding
- deja trazabilidad clara del lifecycle de acceso

## 2. Security

Emails centrados en eventos de seguridad o cambios sensibles.

### Recomendados

- `password_changed`
- `new_sso_linked`
- `security_alert_reset_attempts`
- `security_alert_email_changed`
- `security_alert_login_method_changed`

### Regla

Estos emails deben priorizar:
- claridad
- auditabilidad
- accion inmediata

No deben depender de lectura de dashboards ni de data warehouse pesado.

## 3. Executive Digests & Decision Support

Emails centrados en resumen y decision, no en micro-eventos.

### Recomendados

- `daily_executive_digest`
- `weekly_executive_digest`
- `monthly_executive_summary`
- `risk_alert_digest`

### Contenido esperado

- KPIs clave
- highlights
- riesgos
- proximos hitos
- CTA al portal

### Regla

Estos emails deben ser:
- client-first
- breves
- visuales
- accionables

No deben intentar reemplazar al dashboard.

## 4. Domain Notifications

Emails ligados a capacidades o modulos especificos, pero solo cuando el evento importa.

### Creative / Delivery / ICO

- `review_ready`
- `creative_feedback_pending`
- `delivery_risk_alert`
- `campaign_milestone`
- `ico_threshold_breach`

### Finance

- `invoice_issued`
- `payment_received`
- `invoice_overdue_alert`
- `aging_digest`

### HR / Payroll

- `leave_request_submitted`
- `leave_request_approved`
- `leave_request_rejected`
- `payroll_period_approved`
- `payroll_export_ready`

Notas:
- `payroll_period_approved` se usa como aviso de estado listo para exportar/revisar.
- `payroll_export_ready` debe entenderse como notificación downstream de cierre/exportación canonica de nómina, disparada desde `payroll_period.exported`, y puede incluir CSV/PDF adjuntos o enlaces seguros al portal.

### AI Tooling

- `license_assigned`
- `license_revoked`
- `wallet_low_balance`
- `wallet_exhausted`

### Admin / Governance

- `user_invited_not_activated`
- `tenant_provisioning_completed`
- `scim_provisioning_issue`

## Priorizacion recomendada

## P0 -- inmediatamente despues del baseline transaccional

- `welcome_account_activated`
- `invite_reminder`
- `password_changed`
- `review_ready`
- `daily_executive_digest`
- `delivery_risk_alert`

## P1 -- cuando Data Node / digests y Creative Hub esten mas maduros

- `weekly_executive_digest`
- `creative_feedback_pending`
- `campaign_milestone`
- `invoice_issued`
- `payment_received`
- `wallet_low_balance`

## P2 -- expansion por dominios

- `monthly_executive_summary`
- `invoice_overdue_alert`
- `aging_digest`
- `leave_request_*`
- `payroll_*`
- `scim_provisioning_issue`

## Audiencias

## Client users

Reciben:
- acceso
- digests ejecutivos
- riesgo operativo
- review notifications
- milestones

No deberian recibir:
- ruido de admin interno
- cambios tecnicos del sistema
- micro-eventos de backoffice

## Internal users

Reciben:
- seguridad
- invitaciones / onboarding
- alerts operativos
- governance
- notificaciones de dominio por rol

## Finance / HR / Admin specialists

Reciben:
- eventos especificos del dominio
- resúmenes operativos relevantes a su flujo

## Modelo de datos recomendado

Esta task no exige toda la implementacion ahora, pero define el shape recomendado.

### PostgreSQL

Tablas candidatas futuras:
- `greenhouse_core.user_email_preferences`
- `greenhouse_core.user_email_subscriptions`
- `greenhouse_sync.scheduled_email_jobs`
- `greenhouse_sync.email_delivery_events`

### BigQuery

Analitica y auditoria:
- `greenhouse.email_logs`
- futuros marts de entregabilidad, aperturas y clicks si se habilitan

## Relacion con Data Node

`Data Node` y esta task se tocan, pero no son lo mismo.

- `Data Node` usa email como canal de delivery de digests/reports
- esta task define el catalogo completo de emails del portal

Los `executive digests` y `scheduled reports` deben compartir:
- design system
- scheduling logic
- preferencias de recepcion

Pero no deben fusionarse en un solo brief.

## Relacion con Home + Nexa

`Home` y `Nexa` pueden reducir la necesidad de algunos emails de detalle.

Regla:
- si una señal funciona mejor como entrada diaria dentro del portal, no convertirla por defecto en email
- el email debe funcionar como empujon al portal, no como reemplazo del home

## Regla de diseño y copy

Todos los emails nuevos deben seguir:
- branding Greenhouse
- tono ejecutivo y claro
- CTA unico o muy pocos
- asunto entendible sin jerga interna
- version mobile legible

Evitar:
- correos demasiado largos
- tablas densas
- lenguaje operacional de Notion
- multiples CTA conflictivos

## Criterios de aceptacion

- existe un catalogo priorizado de emails de Greenhouse mas alla del baseline auth
- el equipo distingue claramente `transactional`, `security`, `executive digest` y `domain notifications`
- queda documentado que Greenhouse no debe enviar emails de micro-operacion indiscriminada
- `P0`, `P1` y `P2` quedan priorizados de forma explicita
- la task convive sin conflicto con `CODEX_TASK_Transactional_Email_System.md`

## Fuera de alcance

- implementar todos estos emails ahora mismo
- definir pricing comercial de digests enterprise
- tracking avanzado de open/clicks
- inbox interno del portal

## Proximo paso recomendado

Una vez cerrado el baseline tecnico de `Transactional Email`, abrir un task corto de ejecucion para:
- `welcome_account_activated`
- `invite_reminder`
- `password_changed`
- `review_ready`
- `daily_executive_digest`

Ese task deberia decidir:
- triggers exactos
- audiencias
- preferencias opt-in/opt-out
- templates concretos
