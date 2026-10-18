# Corregir clasificación comercial de una fuente heredada

Operación interna acotada `lead_magnet → quote_request`, con decisión comercial explícita; no habilita
Ads ni acepta un lead por sí sola. Lead Gen Web fue corregido18/10 mediante command canónico local y
releído por las APIs productivas. [Evidencia](../../audits/growth/2026-10-18-commercial-forms-policy-publication.md).
La nueva ruta admin está en código local de este commit y requiere release antes de usarse por HTTP.

## Antes de operar

- Revisar propósito con el operador. No cambiar tipos para eludir exclusiones de ebooks/careers/soporte.
- Leer key, definición íntegra y versión publicada actual desde los readers Forms; conservar campos,
  consentimiento y destinos. Fuente activa y riesgo low/medium son requisitos, no autorización comercial.
- Identificar [ADR Forms](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md),
  permisos de autor y plan concreto. No crear otra versión para fingir que cambió el tipo de definición.

## CLI de mantenimiento explícito

`scripts/growth/correct-commercial-form-kind.ts` usa el command `correctCommercialFormClassification`
y el store Forms, nunca SQL de Forms en el cliente. Cloud julio.reyes@efeonce.org, perfil PG ops.
Entrada JSON0600: formKey, commercialIntentConfirmed=true y reason del operador, sin datos de contactos.
`FORMS_CLASSIFICATION_ACTOR_ID` identifica al operador y no sustituye la credencial/permiso de base.

1. Ejecutar con `--input archivo.json --plan plan-0600.json`: sólo prepara metadatos/hash y versión.
2. Revisar identidad, propósito, riesgo, tipo y versión del plan antes de aplicar.
3. Aplicar con `--apply --plan plan-0600.json --receipt recibo-0600.json`. El receipt se reserva con wx
   antes de ejecutar. Un archivo existente bloquea una segunda mutación; no borrarlo para reintentar.
4. Ante unknown/error leer la fuente y reconciliar; no repetir la escritura. Un conflicto exige plan
   nuevo tras revisar diferencias, no actualizar el hash a ciegas.
5. Confirmar key/slug/version/payload/destinos preservados por readers y GET público. Después se valida
   y publica la política Ads con su propio CAS, activationAt, revisión e idempotencia.

## API de producto preparada, aún sin desplegar

`POST /api/admin/growth/forms/{formId}/classification`: contexto interno, capability growth.forms.author
sobre tenant y actor de sesión. Body estricto: formKey, expectedDefinitionSha256,
expectedPublishedVersionId, fromFormKind=lead_magnet, toFormKind=quote_request,
commercialIntentConfirmed=true, reason. No acepta actor, destinos, flags de autorización o riesgo.
Path y key deben corresponder. El409 `growth_form_classification_conflict` exige redescubrir/revisar.
La lectura posterior de una corrección no prueba recepción o atribución de conversiones publicitarias.
