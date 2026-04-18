# ISSUE-051 — Emails de recibo de nómina no se envían: INSERT column mismatch

## Ambiente

staging + production (ops-worker reactive runtime)

## Detectado

2026-04-16, diagnóstico directo en base de datos tras reporte de que los recibos del período 2026-03 no llegaron después del re-export del 2026-04-15.

## Síntoma

Al cerrar (exportar) un período de nómina, el pipeline reactivo `payroll_receipts_delivery` falla silenciosamente: los PDFs no se generan, los emails no se envían, y el circuit breaker registra el error sin alerta visible al usuario.

Historial observado:
- **2026-03-28 r1**: 4/4 `generation_failed` — bucket GCS inexistente (corregido en r2)
- **2026-03-28 r2**: 4/4 `email_sent` — pipeline funcionó correctamente
- **2026-04-15 r3**: 0/4 — fallo total por bug SQL, sin nuevos registros en `payroll_receipts`
- **2026-02 (exported 2026-03-28)**: 0 receipts generados — mismo bug

## Causa raíz

`buildSavePayrollReceiptStatement()` en `src/lib/payroll/payroll-receipts-store.ts` construía el `INSERT` con N columnas en la lista pero N+2 expresiones en `VALUES`:

```sql
INSERT INTO greenhouse_payroll.payroll_receipts (
  receipt_id, entry_id, ..., template_version  -- 19-20 columnas
) VALUES (
  $1, $2, ..., $19,
  CURRENT_TIMESTAMP,  -- ← sobrante, sin columna
  CURRENT_TIMESTAMP   -- ← sobrante, sin columna
)
```

Las dos expresiones `CURRENT_TIMESTAMP` correspondían a `created_at` y `updated_at`, que **no estaban en la lista de columnas** pero sí en la cláusula VALUES. Ambas columnas tienen `DEFAULT CURRENT_TIMESTAMP` en la tabla, por lo que nunca necesitaron ser incluidas explícitamente.

PostgreSQL rechaza el INSERT con:
```
ERROR: INSERT has more expressions than target columns
```

**Causa secundaria**: el workflow de auto-deploy del ops-worker (`ops-worker-deploy.yml`) listaba archivos individuales de `src/lib/payroll/` en lugar de un glob `src/lib/payroll/**`, dejando fuera `payroll-receipts-store.ts` y `generate-payroll-receipts.ts`. Esto causó que el ops-worker en Cloud Run pudiera tener código desactualizado respecto a Vercel cuando se modificaban estos archivos.

## Impacto

- **4 colaboradores** no recibieron su recibo de nómina de marzo 2026 tras el re-export del 15 de abril
- **Período 2026-02** nunca generó recibos (2 entries sin receipts)
- El error se propagaba silenciosamente: el circuit breaker registraba el fallo pero no había alerta al usuario de HR que cerró la nómina
- La proyección agotaba sus 2 reintentos y quedaba en `completed` (exhausted), requiriendo intervención manual para re-disparar

## Solución

### 1. Fix del bug SQL (`366bf5e0`)

Eliminar las dos expresiones `CURRENT_TIMESTAMP` sobrantes del `VALUES`:

```diff
- ${placeholders.join(', ')},
- CURRENT_TIMESTAMP,
- CURRENT_TIMESTAMP
+ ${placeholders.join(', ')}
```

Las columnas `created_at` y `updated_at` se llenan por sus `DEFAULT` en INSERT, y `updated_at = CURRENT_TIMESTAMP` ya se manejaba en la cláusula `ON CONFLICT DO UPDATE`.

### 2. Fix del workflow de auto-deploy (`e13ebdb2`)

Reemplazar la lista individual de archivos payroll por un glob:

```diff
- 'src/lib/payroll/supersede-entry.ts'
- 'src/lib/payroll/send-payroll-export-ready.ts'
- 'src/lib/payroll/payroll-export-packages.ts'
+ 'src/lib/payroll/**'
```

### 3. Re-disparo manual de recibos

1. Reset del circuit breaker y refresh queue en PostgreSQL
2. Publicación de un nuevo evento outbox `payroll_period.exported` para 2026-03
3. Trigger manual de `/api/cron/outbox-publish` + `/api/cron/outbox-react-notify` en staging
4. Resultado: 4/4 receipts generados y enviados exitosamente (revision 3, template v3)

## Verificación

```sql
-- 8 recibos enviados (4 de r2 + 4 de r3)
SELECT member_id, revision, status, email_sent_at
FROM greenhouse_payroll.payroll_receipts
WHERE period_id = '2026-03' AND status = 'email_sent'
ORDER BY revision DESC;

-- Circuit breaker limpio
SELECT state, consecutive_failures, last_error, last_success_at
FROM greenhouse_sync.projection_circuit_state
WHERE projection_name = 'payroll_receipts_delivery';
-- → closed, 0, NULL, 2026-04-16T09:29:53.980Z
```

Confirmado: 4 emails con PDF adjunto entregados a `acarlosama@`, `dferreira@`, `mhernandez@`, `vhoyos@efeoncepro.com` el 2026-04-16 a las 09:29 UTC.

## Estado

resolved

## Relacionado

- `src/lib/payroll/payroll-receipts-store.ts` — fix del INSERT
- `.github/workflows/ops-worker-deploy.yml` — glob de paths expandido
- `src/lib/sync/projections/payroll-receipts.ts` — proyección reactiva
- `src/lib/payroll/generate-payroll-receipts.ts` — orquestador de generación + envío
- Commits: `366bf5e0`, `e13ebdb2`
