# Manual — Enviar informe AEO + crear Lead (cross-sell del operador)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0 · **Creado:** 2026-06-29 por Claude (TASK-1279)
> **Documentación funcional:** [ai-visibility-grader.md](../../documentation/growth/ai-visibility-grader.md) · **Técnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta TASK-1279)

## Para qué sirve

Cierra el loop comercial del diagnóstico AEO: después de correr y **publicar** el análisis de un cliente o prospecto, el operador (Growth/Account) **envía el informe** al contacto y **abre un Lead en HubSpot** de forma trazable y gobernada. El objeto que se crea es un **Lead** (objeto `leads`, asociado a Contacto y/o Empresa) — **NUNCA un Negocio (Deal)**: el diagnóstico es pre-pitch (tope del embudo); el Deal es un momento posterior y crearlo acá ensuciaría el pipeline.

## Antes de empezar

1. **Capability:** tu usuario debe tener `growth.ai_visibility.lead.open` (set operador: `efeonce_account`, `efeonce_admin`, `efeonce_operations`, internal, `ai_tooling_admin`). Es el mismo set que corre el motor sobre cualquier org.
2. **Informe publicado:** el run debe tener un **snapshot público publicado** (pasó por el review/publish). Si no, el envío se rechaza con `aeo_send_report_unavailable` (409).
3. **Consentimiento (solo prospectos):** si el sujeto es un prospecto (no un cliente con relación activa), necesitas una **referencia al consentimiento** capturado en la conversación previa (`consentRef`). Sin ella → `aeo_send_consent_required` (422). Esto **no es opcional**: el envío en frío está prohibido.
4. **Flag de envío:** `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` debe estar ON (en Vercel **y** en el ops-worker). Por defecto está OFF → el comando responde `aeo_send_disabled` (409).
5. **Property HubSpot `aeo_check_result`:** debe existir en la Empresa (objeto companies, grupo `aeo`). **Hoy NO existe** en el portal — hay que provisionarla antes del primer envío (ver "Rollout" abajo).

## Paso a paso

Hoy se opera por el contrato programático (la vista de operador y Nexa lo consumirán por construcción). El comando es idempotente por `(run, destinatario)`: reenviar al mismo contacto para el mismo run **no** duplica.

```bash
# Sujeto = organizationId (cliente o prospecto sincronizado de HubSpot company)
# runId = el run AEO ya publicado de esa org
pnpm staging:request POST /api/admin/growth/ai-visibility/runs/<runId>/send-lead \
  '{"organizationId":"<org-id>","recipient":{"email":"contacto@empresa.com","firstName":"Nombre","lastName":"Apellido"},"consentRef":"<ref-consentimiento>"}'
```

- **Cliente con relación activa:** `consentRef` es opcional (el envío es parte del servicio). El Lead nace tipo **expansión**.
- **Prospecto:** `consentRef` es **obligatorio** (interés legítimo). El Lead nace tipo **nuevo negocio**.
- El tipo (cliente vs prospecto) lo **decide el sistema** leyendo la organización canónica, no el operador.

Respuesta exitosa: `202 { sendId, leadType, idempotentHit }`. El envío del email y la creación del Lead ocurren en segundo plano (no en la respuesta).

## Qué significan los estados

- **`queued` (202):** el envío quedó registrado y encolado. El email y el Lead se procesan en el worker.
- **email `sent` + lead `created`:** terminó OK. Verás el email en `email_deliveries` y el Lead en HubSpot asociado al contacto/empresa, con `aeo_check_result` en la Empresa.
- **`idempotentHit: true`:** ya habías enviado a ese contacto para ese run; no se reenvía.
- **Señal de salud `growth.ai_visibility.operator_send_failed`** (en `/admin/operations`): debe estar en 0. Si sube, hubo envíos/Leads fallando >15 min.

## Qué NO hacer

- **No enviar en frío a un prospecto.** Sin `consentRef` el sistema rechaza (422) — y está bien que lo haga.
- **No esperar un Deal.** Esta acción crea un **Lead**. La conversión Lead → Deal es un paso comercial posterior, fuera de este flujo.
- **No reintentar** ante `aeo_send_consent_required`, `aeo_send_report_unavailable` ni `aeo_send_disabled`: son estructurales (consigue el consentimiento / publica el informe / pide prender el flag), no transitorios.
- **No editar el contacto/empresa a mano para “forzar” el envío:** el tipo comercial y el consentimiento se derivan/validan server-side.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `aeo_send_consent_required` (422) | Prospecto sin `consentRef` | Captura el consentimiento en la conversación y pásalo en `consentRef`. |
| `aeo_send_report_unavailable` (409) | El run no existe para esa org, o no está publicado | Verifica el `runId`/`organizationId`; publica el informe antes de enviar. |
| `aeo_send_disabled` (409) | Flag OFF | Pide prender `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (Vercel + ops-worker). |
| email `sent` pero lead `failed` | La property `aeo_check_result` no existe, o el objeto `leads`/asociación no está disponible | Provisiona la property (ver Rollout); revisa los logs del consumer. El email ya salió; el Lead reintenta. |
| Señal `operator_send_failed` > 0 | Entrega caída o HubSpot rechazando | Revisa `grader_report_send_log` (estado `failed` + `reason`) + Sentry domain `growth`. |

## Rollout (estado: code complete, pendiente de activación)

El envío real está **apagado** hasta completar, en orden:

1. **Provisionar la property HubSpot `aeo_check_result`** (Company, grupo `aeo`): `pnpm tsx scripts/growth/provision-ai-visibility-hubspot-properties.ts` (ya incluye la nueva definición). Sin esto, el upsert de la Empresa falla.
2. **Confirmar el objeto `leads`** en el portal + sus asociaciones a Contacto/Empresa (verificado vía REST: `crm/v3/objects/leads` existe; el MCP de HubSpot no lo soporta pero la API sí).
3. **Prender el flag** en staging: `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED=true` en Vercel **y** en el ops-worker (`services/ops-worker/deploy.sh` + `gcloud run services update`).
4. **Smoke staging real:** correr+publicar un run operador → `send-lead` a un contacto de prueba → verificar email entregado + Lead creado/asociado + `aeo_check_result` + el consent gate (prospecto sin consentimiento → 422).
5. **Sign-off comercial/legal** del copy del envío a prospectos (base de interés legítimo) → producción vía release control plane (EPIC-020).

## Referencias técnicas

- Comando: `src/lib/growth/ai-visibility/operator/send-report-and-create-lead.ts`
- Ejecutor (worker): `src/lib/growth/ai-visibility/operator/execute-operator-send.ts` + projection `growth_ai_visibility_operator_send` (lane `ops-reactive-growth`)
- HubSpot Lead in-app: `src/lib/growth/ai-visibility/hubspot/crm-client.ts` (`createOperatorCrossSellLead`)
- Audit: `greenhouse_growth.grader_report_send_log` · Capability: `growth.ai_visibility.lead.open` · Flag: `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED`
