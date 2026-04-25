# TASK-619.5 — Cost Guardrails + GDPR Signer Anonymization

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (compliance + cost runaway prevention)
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-619, TASK-630.2`
- Branch: `task/TASK-619.5-cost-guardrails-gdpr`

## Summary

Dos hardenings cross-cutting del programa CPQ: (1) Cost guardrails per tenant (rate limits ZapSign envelopes + AI generations) para prevenir runaway cost. (2) GDPR signer anonymization endpoint (right-to-be-forgotten) para signers externos (clientes) que solicitan deletion sin perder evidencia legal del PDF firmado.

## Why This Task Exists

**Cost runaway risk:** sin limits, un tenant podria enviar 1000 envelopes ZapSign en un dia (cost ~$1000+ USD) o un usuario podria generar 1000 descripciones AI consecutivas (cost ~$50 USD). Sin alerting + hard limit, factura inflada antes de detectar abuso o bug.

**GDPR risk:** signers son personas externas (clientes). Sus emails + IPs + nombres quedan en `quotation_signature_signers` indefinidamente. Cuando un signer solicita right-to-be-forgotten, necesitamos anonymizar lookups sin destruir la evidencia legal del PDF firmado.

## Goal

- Tabla `tenant_quotas` con limits + counters mensuales/diarios
- Hard limit + soft warning (80%) en endpoints de signature creation y AI generation
- Reset cron mensual
- Endpoint `POST /api/finance/signers/anonymize` para anonymize por email
- PDF firmado se mantiene (legal evidence); lookup tabla anonymizes email/name/ip a hash SHA-256
- Audit log de anonymization requests

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-619 (signature signers schema)
- TASK-630.2 (AI credit consumption tracking)

### Blocks / Impacts

- Cost predictability del programa
- LATAM + EU compliance defendible

### Files owned

- `migrations/YYYYMMDD_task-619.5-tenant-quotas-anonymization.sql` (nuevo)
- `src/lib/quotas/tenant-quota-store.ts` (nuevo)
- `src/lib/quotas/quota-enforcement-middleware.ts` (nuevo)
- `src/lib/finance/signer-anonymization.ts` (nuevo)
- `src/app/api/finance/signers/anonymize/route.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/signature-requests/route.ts` (modificado: enforce quota)
- `src/app/api/ai-tools/generate-description/route.ts` (modificado: enforce quota)

## Scope

### Slice 1 — Tenant quotas (1 dia)

Migracion:

```sql
CREATE TABLE greenhouse_core.tenant_quotas (
  tenant_id text PRIMARY KEY REFERENCES greenhouse.clients(client_id),
  monthly_envelope_limit int NOT NULL DEFAULT 100,
  daily_ai_generation_limit int NOT NULL DEFAULT 50,
  monthly_envelope_count_used int NOT NULL DEFAULT 0,
  daily_ai_count_used int NOT NULL DEFAULT 0,
  current_period_start date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  current_day date NOT NULL DEFAULT CURRENT_DATE,
  warning_threshold_pct int NOT NULL DEFAULT 80,
  hard_block_enabled boolean NOT NULL DEFAULT true,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE greenhouse_core.tenant_quotas OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.tenant_quotas TO greenhouse_runtime;
```

Cron job daily reset `daily_ai_count_used=0` + monthly reset `monthly_envelope_count_used=0` cuando `current_period_start < first_of_month()`.

Middleware `enforceQuota(tenantId, kind)`:
- Lookup quota
- Si `count_used >= limit AND hard_block_enabled` -> 429 con mensaje "Quota mensual excedida, contacta admin"
- Si `count_used >= limit * 0.80` -> log warning + emit Slack alert
- Si OK -> increment counter atomico

### Slice 2 — GDPR anonymization (1 dia)

Migracion:

```sql
ALTER TABLE greenhouse_commercial.quotation_signature_signers
  ADD COLUMN anonymized_at timestamptz,
  ADD COLUMN anonymization_reason text;

CREATE INDEX idx_signature_signers_anonymized
  ON greenhouse_commercial.quotation_signature_signers (anonymized_at) WHERE anonymized_at IS NOT NULL;
```

Endpoint:

```typescript
POST /api/finance/signers/anonymize
Body: { email: string, reason: 'gdpr_request' | 'admin_action' | 'data_retention_policy' }

Action:
1. Find all rows in quotation_signature_signers WHERE email = $1 AND anonymized_at IS NULL
2. For each row:
   - email = SHA-256(email)[:16] + '@anonymized.local'
   - full_name = 'Anonymized-' + SHA-256(full_name)[:8]
   - signed_ip = NULL
   - phone_number = NULL
   - phone_country = NULL
   - anonymized_at = now()
   - anonymization_reason = $2
3. Audit log entry
4. NO modificar PDF firmado (legal evidence inmutable)

Permisos: solo Finance Admin / Efeonce Admin.
```

## Out of Scope

- Auto-anonymization despues de N anos (Fase 2, requeriria policy explicita)
- Anonymization de quotes signed donde el signer fue Efeonce countersigner (employees, no GDPR scope)
- Cross-cloud data deletion (solo Postgres + GCS)

## Acceptance Criteria

- [ ] tenant_quotas table + cron reset funcional
- [ ] enforce middleware bloquea correctamente ZapSign + AI endpoints
- [ ] Slack alert en threshold 80%
- [ ] anonymization endpoint funciona + idempotente
- [ ] PDF firmado se mantiene intacto post-anonymization
- [ ] audit log entries correctos
- [ ] tests passing

## Verification

- Quota: tenant con limit=2, enviar 2 envelopes -> OK; 3ro -> 429
- Reset cron: simular cambio de mes -> counter en 0
- Anonymization: anonymize signer -> verifica row anonymizada + PDF intacto en GCS

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con quota defaults documentadas
- [ ] `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` updated
