# ISSUE-151 — Alertas Sentry por bridge de Facebook y gobernanza incompleta de Créditos Globe

## Ambiente

- Producción: error cliente en `/public/careers/EO-OPN-0061/apply`.
- Preview: warning de gobernanza en `GET /api/notifications/unread-count`.

## Detectado

2026-08-12, alerta por correo de Sentry y revisión posterior del operador.

## Síntoma

Sentry reportó dos alertas recientes:

1. `Error invoking postMessage: Java object is gone` desde Facebook Android al abrir la postulación pública.
2. `role_view_fallback_used` para `efeonce_admin` y `administracion.globe_credits`.

## Causa raíz

Son incidentes independientes:

1. La primera excepción nace en el bridge nativo inyectado por Facebook (`app://navigation_performance_logger_android`), que pierde su objeto Java durante el ciclo de vida de WebView. Careers no usa `postMessage` ni iframe; la página y el contrato del formulario respondieron `200` con user-agent de Facebook Android y Chrome Android. No hay evidencia de fallo de React, Next, Turnstile ni el submit.
2. TASK-1483 agregó `administracion.globe_credits` al `VIEW_REGISTRY` en `c3122c538`, pero sin la migration que persiste la vista y su grant. El fallback interno concede por el route group `admin` y emite el warning correctamente; el endpoint de notificaciones sólo coincidió con el refresh de claims.

## Impacto

- Careers: ruido de observabilidad que puede ocultar errores reales si no se filtra de forma exacta; no se comprobó falla de postulación.
- Créditos Globe: la superficie sigue accesible para el administrador, pero falta su gobernanza persistida y el warning se repite en cada refresh de claims.

## Solución aplicada en código

- `beforeSend` cliente descarta únicamente el evento que combina el mensaje exacto, navegador Facebook y frame exacto del bridge Android. Errores de Careers, Turnstile, Android y Facebook que no cumplan los tres criterios siguen llegando a Sentry.
- Migration `20260812093000000_issue-151-seed-globe-credits-view-access.sql` hace upsert del registry y del único grant autorizado: `efeonce_admin → administracion.globe_credits`, con verificación `DO` post-apply. No cambia ni silencia el fallback.

## Verificación

- Focal local: 22/22 pruebas verdes (`sentry-client-event-filter`, `view-access-store`, `view-access-resolution`), ESLint focal, typecheck y `git diff --check`.
- La URL de Careers respondió `200` con los user-agent de Facebook Android y Chrome Android; su HTML expone `<greenhouse-form>` y no iframe.
- La API de Sentry no permitió inspección adicional: el token local respondió 403 por scope insuficiente.
- gcloud CLI y ADC locales ya están renovados y alineados para `efeonce-group`. La comprobación live de PostgreSQL sigue pendiente porque el perfil local no declara `GREENHOUSE_POSTGRES_OPS_USER`/`ADMIN_USER`; el proxy alcanzó a iniciar, pero no se improvisó esa credencial. No se afirma aún que la fila esté ausente o que el warning haya cesado en runtime.

## Estado

open — código listo; rollout y verificación runtime pendientes.

## Relacionado

- `docs/tasks/complete/TASK-1483-globe-credits-operations-workbench.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (§ View Registry Governance Pattern)
- Sentry: JAVASCRIPT-NEXTJS-8W y JAVASCRIPT-NEXTJS-8V.
