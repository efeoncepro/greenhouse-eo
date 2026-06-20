# ISSUE-101 — Posición IVA mensual mal scopeada por `space_id` excluye todo el crédito fiscal (F29 incorrecto)

## Ambiente

production + staging (misma Cloud SQL `greenhouse-pg-dev`)

## Detectado

2026-06-20, por el operador al abrir `/finance` (Resumen). Banner amarillo "Error cargando datos del dashboard: IVA mensual: Finance VAT position requires a tenant with canonical space scope." Diagnóstico posterior con la skill `greenhouse-finance-accounting-operator` + `arch-architect` sobre la BD viva.

## Síntoma

1. **Visible:** la tarjeta "IVA mensual" del dashboard de Finance falla con un alert para sesiones de admin interno de Efeonce. El endpoint `GET /api/finance/vat/monthly-position` responde **HTTP 422** `Finance VAT position requires a tenant with canonical space scope` ([route.ts:105-110](../../../src/app/api/finance/vat/monthly-position/route.ts#L105-L110)).
2. **De fondo (más grave):** la posición de IVA materializada es **fiscalmente incorrecta**. La cifra que se muestra ($1.102.000 net para abr/may/jun) se computó **sin un solo peso de crédito fiscal de compras**.

## Causa raíz

El ledger de IVA está **particionado por `space_id`** (dimensión analítica de cliente/Account-360), cuando el IVA / F29 es un agregado de la **entidad legal Efeonce SpA (un RUT, una declaración mensual)**. Dos consecuencias del mismatch:

- **422 en el dashboard consolidado:** un admin interno no está anclado a un `Space` → `tenant.spaceId` viene `null` ([access.ts:229](../../../src/lib/tenant/access.ts#L229)). El endpoint exige `spaceId` y corta con 422. La vista consolidada interna —que es justo la correcta para el F29— por diseño no tiene space y nunca puede leer el dato.
- **Crédito fiscal excluido:** el materializador (`src/lib/finance/vat-ledger.ts`) filtra `space_id IS NOT NULL` al recoger gastos. Como el overhead de Efeonce (arriendo, software, servicios) no cuelga de ningún client_space, **todo su crédito fiscal se cae del cálculo**.

### Evidencia (BD viva, 2026-06-20)

```
-- Gastos con IVA crédito fiscal:
exp_con_credito_fiscal      = 125
credito_sin_space_EXCLUIDO  = 125   ← los 125 tienen space_id NULL → excluidos
credito_con_space_incluido  = 0     ← CERO crédito fiscal entra al ledger
clp_credito_excluido        = 2.563.383 CLP
```

```
-- vat_monthly_positions / vat_ledger_entries:
todas las filas (abr/may/jun + 3 asientos) ancladas a un solo space:
space_id = spc-ae463d9f-...  →  "Sky Airline"  (un client_space)
```

Es decir: la posición publicada es solo débito fiscal de Sky Airline, con crédito fiscal = 0. Sobreestima el IVA a pagar.

## Impacto

- **Funcional:** el KPI "IVA mensual" nunca carga en el dashboard consolidado interno (audiencia natural del F29). Alert permanente.
- **Fiscal:** la posición de IVA mostrada es incorrecta (omite $2.56M CLP de crédito fiscal). No apta como insumo de F29 ni como baseline.
- **Para quién:** equipo Finanzas de Efeonce (único consumidor legítimo del IVA; un portal de cliente jamás ve el IVA de Efeonce).
- **Severidad:** media-alta. No es corrupción de datos transaccionales (income/expenses/payments están sanos y completos), es un error de **proyección/scope** sobre datos correctos.

## Solución

Re-scopear el VAT a nivel **entidad legal (RUT / tenant interno)** y eliminar `space_id` como clave de particionado del ledger fiscal (queda como etiqueta analítica opcional). Trabajo planificado en **TASK-725**. Resumen de slices:

1. Quick win UX: endpoint degrada honesto a posición consolidada de la entidad cuando no hay space, en vez de 422 → el alert desaparece.
2. Fix fiscal: materializador a nivel entidad legal + quitar filtro `space_id IS NOT NULL` + re-materializar abr/may/jun → cifra correcta (incluye los $2.56M de crédito).
3. Reliability signal `finance.vat.position_drift` (steady=0) que compare posición materializada vs Σ directo de income/expenses con IVA.
4. (opcional) columna `legal_entity_id` explícita si se confirma multi-entidad legal a futuro.

Veredicto arquitectónico (4 pilares) y razonamiento fiscal completo en TASK-725.

## Verificación

- `credito_con_space_incluido` > 0 y `clp_credito_excluido` = 0 post-fix (todo el crédito fiscal entra al ledger).
- `GET /api/finance/vat/monthly-position` con sesión de admin interno (sin space) responde 200 con posición consolidada de Efeonce, no 422.
- La posición neta corregida cuadra contra el F29 real declarado de abr/may/jun (validación con contador).
- Reliability signal `finance.vat.position_drift` en steady=0.

## Estado

open — **fix verificado en dev/staging (TASK-725); cierre fiscal pendiente de validación F29.** El re-scope está aplicado y re-materializado en Cloud SQL dev con `finance.vat.position_drift=0` y el crédito fiscal entrando. El `ops-worker` ya fue desplegado con el materializador nuevo (`ops-worker-00375-fz7`, 100% tráfico, `GIT_SHA=a1c71840b...`). Falta cuadrar la cifra corregida vs el F29 real con el contador antes de baseline productivo.

## Delta 2026-06-20 — implementación TASK-725 (code-complete, rollout pendiente)

Re-scope implementado end-to-end en `develop` local-first (Slices 1–5). Precisión sobre el número del Impacto: el **$2.56M CLP** era el universo de gastos con `recoverable_tax_amount > 0` **sin filtro de período fiscal** (la mayoría sin `period_year/month`, que el materializador no procesa en ninguna versión). El crédito fiscal **materializable** (con período) que el gate `space_id IS NOT NULL` excluía es menor: validado read-only vs PG, el materializador viejo veía **0** filas de crédito fiscal (`credito_rows_viejo=0`); el re-scope incorpora el crédito por período (mar/abr/may/jun), todo proveniente de gastos sin space. La dirección del bug es la misma (el gate excluía el 100% del crédito materializable); la magnitud F29 exacta se confirma al re-materializar + validar con contador.

**Verificación en dev (2026-06-20, autorizada):** migración `20260620131856180` aplicada + re-materialización con el código nuevo. Las 4 posiciones (mar–jun) quedaron ancladas a Efeonce Group SpA (`org-2df565fb`, RUT 77.357.182-1), `space_id=NULL`, con crédito fiscal entrando (mar $19.264 · abr $67.870 · may $21.594 · jun $16.048; antes $0). Net abril $1.102.000→$1.034.130 (rebajado por el crédito). `finance.vat.position_drift=0`.

Pendiente para cierre total: validación de la cifra corregida vs F29 real con contador.

## Relacionado

- **TASK-725** — fix planificado (re-scope VAT a entidad legal).
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (sección VAT Chile, TASK-533).
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md` — auditoría que originó la detección.
- Código: `src/lib/finance/vat-ledger.ts`, `src/app/api/finance/vat/monthly-position/route.ts`, `src/views/greenhouse/finance/FinanceDashboardView.tsx`, `src/views/greenhouse/finance/components/VatMonthlyPositionCard.tsx`.
