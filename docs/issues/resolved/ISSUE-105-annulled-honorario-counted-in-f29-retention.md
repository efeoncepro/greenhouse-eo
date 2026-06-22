# ISSUE-105 — Boleta de honorarios anulada en SII seguía contando en la posición F29 de retención

## Ambiente

production + staging (misma Cloud SQL `greenhouse-pg-dev`)

## Detectado

2026-06-20, durante la validación contable real del F29 de mayo 2026 contra el SII (el contador comparó los números del portal con el F29 oficial).

## Síntoma

La posición de retención del F29 de mayo 2026 en Greenhouse marcaba **$242.623** (3 boletas) contra los **$134.653** (2 boletas) del F29 oficial del SII — una sobre-declaración de **$107.970**. El IVA cuadraba al peso (débito 1.102.000, crédito 21.594, determinado 1.080.405), así que el cálculo no era el problema.

## Causa raíz

Una boleta de honorarios (Valentina Hoyos, folio 40) estaba **anulada en el SII y en Nubox** (`sii_document_status='Anulada'`, `nubox_document_status='Anulada'`) — la persona emitió dos boletas por error (folio 40 anulada, folio 42 válida) — pero en `greenhouse_finance.expenses` quedó con **`is_annulled=false`**, por lo que seguía sumando.

Es un **bug class en 2 capas (lado expenses)**:

1. **Sync Nubox→expenses** (`src/lib/nubox/sync-nubox-to-postgres.ts`): el estado autoritativo de anulación viaja en `document_status_name='Anulada'`, pero el sync seteaba `is_annulled = purchase.is_annulled ?? false` (el booleano de Nubox no siempre viene poblado). La boleta anulada quedaba como válida.
2. **Materializador de retención** (`src/lib/finance/retention-ledger.ts`, TASK-1188): filtraba `withholding_amount > 0` pero **no excluía anulados**, a diferencia del materializador de income que ya filtra `is_annulled` (por eso el débito IVA sí cuadraba).

Resultado: cualquier honorario anulado **después** de emitirse seguía contando en el F29 de retención. Bug sistémico, no caso aislado.

### Evidencia (BD viva, 2026-06-20)

```
folio 40 Valentina: sii_document_status='Anulada', is_annulled=false, withholding=107.970  ← anulada, contaba
folio 42 Valentina: sii_document_status='Válido',  is_annulled=false, withholding=107.965  ← la buena (SII)
SII mayo retención = Luis(26.688) + folio42(107.965) = 134.653  ✓
GH mayo retención  = Luis + folio40 + folio42 = 242.623  ✗ (+107.970 por la anulada)
Alcance del drift: 2 documentos anulados en fuente con is_annulled=false (folio 40 con withholding, folio 29 sin)
```

## Solución (TASK-1204)

Fix en causa raíz + defensa en profundidad + corrección de datos:

1. **Sync** — helper `isNuboxPurchaseAnnulled` deriva `is_annulled` de `document_status_name='Anulada'` además del booleano (acopla al estado autoritativo del SII).
2. **Materializador de retención** — guard `AND COALESCE(e.is_annulled, false) = false` (espeja el filtro de income).
3. **Backfill** (migration `20260620205300001`) — `is_annulled=true` para los 2 documentos anulados en fuente con flag inconsistente.
4. Re-materialización de la retención.

En paralelo, la misma validación confirmó la **tasa PPM real** (0,125%, no el placeholder 0,25%) — corregida en `ppm_rate_config` (migration `20260620205224350`).

## Verificación

- Mayo 2026 cuadra **al peso** con el F29 del SII tras el fix: retención **134.653**, PPM **7.250**, IVA 1.080.405 → total 1.222.308.
- `folio 40` y `folio 29` quedan `is_annulled=true`; `ppm_rate_config.rate=0,00125`.
- Tests: `isNuboxPurchaseAnnulled` (4 casos, Anulada→true aunque booleano false) + retention-ledger verifica el guard. Full suite 7486 + build verde.
- Re-materialización idempotente vía `materializeAllAvailableRetentionPeriods` / `materializeAllAvailablePpmPeriods`.

## Resolución

Resuelto 2026-06-20 por TASK-1204. Fix de código + 2 migrations aplicadas en Cloud SQL dev + re-materialización verificada.

Follow-up (TASK-1204 § Follow-ups): evaluar signal `finance.expenses.annulled_status_drift` (anulado en fuente con `is_annulled=false`) como detector anti-recurrencia, y que el card F29 (TASK-1197) muestre por default el período declarado (mes cerrado), no el mes en curso.
