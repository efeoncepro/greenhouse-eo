# TASK-464b — Pricing Governance Tables (Tiers + Commercial Models + Country Factors + FTE Guide)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-464b-pricing-governance-tables`
- Legacy ID: `parte de TASK-464 umbrella`
- GitHub Issue: `none`

## Summary

Canonicalizar las 5 tablas de "dimensiones de pricing" que Efeonce usa en su Excel: `role_tier_margins` (tiers 1-4 × min/opt/max), `service_tier_margins` (tiers 1-4 × margen base por servicio), `commercial_model_multipliers` (On-Going/On-Demand/Híbrido/Licencia con multiplicadores +0%/+10%/+5%/+15%), `country_pricing_factors` (Chile Corporate/Chile PYME/Colombia/Internacional/Licitación/Cliente Estratégico con factor 0.85-1.2), y `fte_hours_guide` (0.1 FTE → 1.0 FTE con equivalencia en horas mensuales). Seed desde CSVs ya extraídos del Excel.

## Why This Task Exists

Estas 4 dimensiones hoy viven en Excel y determinan cómo Efeonce arma cualquier precio:

- **Role tier**: rango aceptable de margen según complejidad del rol (Tier 1 Commoditizado 20-35% vs Tier 4 IP Propietaria 60%)
- **Service tier**: margen base para servicios compuestos (Tier 1 40% → Tier 4 55%)
- **Modelo comercial**: multiplicador por modelo de cobro (retainer vs proyecto vs híbrido)
- **Factor país**: ajuste de precio por tipo de cliente/mercado (Pinturas Berel México, licitación pública, etc.)
- **FTE guide**: conversión hours ↔ FTE (180h/mes = 1 FTE)

Sin estas tablas en DB, el pricing engine (TASK-464d) no puede aplicar el modelo completo de Efeonce. Governance de quote (TASK-348 approval policies) tampoco puede validar contra tier guardrails ("este quote con 15% margen está bajo el mínimo del Tier 1 que es 20%").

## Goal

- 5 tablas canónicas con seed desde CSVs del Excel
- Pricing engine puede consultar tier margin min/opt/max para validar
- Quote builder UI puede mostrar multiplicadores + factores al usuario
- Governance (TASK-348) puede agregar condition type `tier_margin_below_min`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Tablas "config" (no transaccional) — admin edita vía UI o directo SQL, sin versioning pesado
- `effective_from` en todas para trackear cambios sin bitemporalidad pesada; el modelo debe permitir múltiples versiones efectivas por clave y los readers resuelven la fila vigente por `quoteDate/asOfDate`
- Source of truth es Excel → CSV → seeder

## Normative Docs

- `data/pricing/seed/role-tier-margins.csv`
- `data/pricing/seed/service-tier-margins.csv`
- `data/pricing/seed/commercial-model-multipliers.csv`
- `data/pricing/seed/country-pricing-factors.csv`
- `data/pricing/seed/fte-hours-guide.csv`

## Dependencies & Impact

### Depends on

- `greenhouse_commercial` schema existente
- Excel seed CSVs (ya extraídos)

### Blocks / Impacts

- TASK-464d — pricing engine usa estas tablas para calcular price final
- TASK-464e — UI muestra selectores de commercial_model + country_factor
- TASK-348 — approval policies puede agregar condition type con tier guardrails
- TASK-460 — Contract hereda `commercial_model` + `country_factor` del quote originator

### Files owned

- `migrations/[verificar]-task-464b-pricing-governance-schema.sql`
- `scripts/seed-pricing-governance.ts`
- `src/lib/commercial/pricing-governance-store.ts`
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.margin_targets` con seed por BL (Wave 28%, Globe 40%, etc.) — queda como compat, NO se reemplaza
- CSV sources en `data/pricing/seed/`

### Gap

- No hay tabla con tier min/opt/max por nivel (solo single target por BL)
- No hay multiplicador por commercial model
- No hay factor por país/tipo de cliente
- No hay guide FTE ↔ hours formalizada en DB

## Canonical Dictionaries

- Los diccionarios canónicos de esta task son code-versioned y no deben aprenderse dinámicamente del CSV:
  - tiers: `1..4` con labels `Commoditizado`, `Especializado`, `Estratégico`, `IP Propietaria`
  - commercial models: `on_going`, `on_demand`, `hybrid`, `license_consulting`
  - country factors: `chile_corporate`, `chile_pyme`, `colombia_latam`, `international_usd`, `licitacion_publica`, `cliente_estrategico`
- `service-tier-margins.csv`, `commercial-model-multipliers.csv` y `fte-hours-guide.csv` deben resolverse estrictamente contra esos diccionarios. Una etiqueta fuera de diccionario se rechaza o queda en `needs_review`; no se crean códigos nuevos desde el CSV.

## Range Parsing Rules

- `country-pricing-factors.csv` admite valores simples (`1.0`) y rangos (`0.85-0.9`).
- Regla de parseo:
  - valor simple → `factor_min = factor_opt = factor_max = value`
  - rango → `factor_min = left`, `factor_max = right`, `factor_opt = promedio aritmético`
- El parser debe normalizar separadores (`-`, `–`) y espacios. Si el rango no puede parsearse con seguridad, la fila queda en `needs_review`.
- `fte-hours-guide.csv` debe parsear `% Dedicación` y `Horas mensuales` con normalización de coma decimal y sufijos textuales (`h/mes`).

## Drift Resolution

- `role-tier-margins.csv` se trata como fuente de validación cruzada rol → tier, no como source of truth principal del tier del catálogo.
- Si el tier sugerido por `role-tier-margins.csv` contradice el tier materializado desde `sellable-roles-pricing.csv` en `TASK-464a`, gana `TASK-464a` y esta task debe registrar drift explícito.
- Los seeders de governance deben reportar el mismo resumen estructurado que el resto del programa (`inserted`, `updated`, `needs_review`, `drift_detected`, etc.) para facilitar reconciliación entre fuentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

```sql
CREATE TABLE greenhouse_commercial.role_tier_margins (
  tier text NOT NULL CHECK (tier IN ('1', '2', '3', '4')),
  tier_label text NOT NULL,                    -- 'Commoditizado' | 'Especializado' | 'Estratégico' | 'IP Propietaria'
  margin_min numeric(5,4) NOT NULL,            -- 0.20 = 20%
  margin_opt numeric(5,4) NOT NULL,            -- target óptimo
  margin_max numeric(5,4) NOT NULL,            -- ceiling
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tier, effective_from),
  CONSTRAINT role_tier_margins_bounds CHECK (margin_min <= margin_opt AND margin_opt <= margin_max)
);

CREATE TABLE greenhouse_commercial.service_tier_margins (
  tier text NOT NULL CHECK (tier IN ('1', '2', '3', '4')),
  tier_label text NOT NULL,                    -- 'Básicos o entrada' etc.
  margin_base numeric(5,4) NOT NULL,           -- 0.40 = 40%
  description text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tier, effective_from)
);

CREATE TABLE greenhouse_commercial.commercial_model_multipliers (
  model_code text NOT NULL CHECK (model_code IN (
    'on_going', 'on_demand', 'hybrid', 'license_consulting'
  )),
  model_label text NOT NULL,                   -- 'On-Going | Retainer', etc.
  multiplier_pct numeric(5,4) NOT NULL,        -- 0 = base, 0.10 = +10%
  description text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (model_code, effective_from)
);

CREATE TABLE greenhouse_commercial.country_pricing_factors (
  factor_code text NOT NULL,                   -- 'chile_corporate', 'chile_pyme', 'colombia_latam', 'international_usd', 'licitacion_publica', 'cliente_estrategico'
  factor_label text NOT NULL,
  factor_min numeric(5,4) NOT NULL,            -- 0.85
  factor_opt numeric(5,4) NOT NULL,            -- valor recomendado
  factor_max numeric(5,4) NOT NULL,            -- 1.20
  applies_when text,                            -- descripción del caso
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (factor_code, effective_from),
  CONSTRAINT country_pricing_factors_bounds CHECK (factor_min <= factor_opt AND factor_opt <= factor_max)
);

CREATE TABLE greenhouse_commercial.fte_hours_guide (
  fte_fraction numeric(3,2) NOT NULL,          -- 0.10, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00
  fte_label text NOT NULL,                     -- '0,1 FTE'
  monthly_hours integer NOT NULL,              -- 18, 36, 45, 54, 72, 90, 108, 126, 144, 162, 180
  recommended_description text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fte_fraction, effective_from)
);

-- Grants
ALTER TABLE greenhouse_commercial.role_tier_margins OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.service_tier_margins OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.commercial_model_multipliers OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.country_pricing_factors OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.fte_hours_guide OWNER TO greenhouse_ops;
GRANT SELECT ON greenhouse_commercial.role_tier_margins TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.service_tier_margins TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.commercial_model_multipliers TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.country_pricing_factors TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.fte_hours_guide TO greenhouse_runtime;
```

### Slice 2 — Seed desde CSVs

- `scripts/seed-pricing-governance.ts`:
  - Lee los 5 CSVs de `data/pricing/seed/`
  - Idempotente (INSERT ON CONFLICT DO UPDATE)
  - Role tier margins: deriva 4 filas canónicas por tier desde el CSV rol→tier y reporta drift cuando un rol contradice el tier del catálogo de `TASK-464a`
  - Service tier margins: 4 filas (tier 1: 40%, tier 2: 45%, tier 3: 50%, tier 4: 55%)
  - Commercial model: 4 filas (on_going 0%, on_demand 10%, hybrid 5%, license_consulting 15%)
  - Country factors: 6 filas (chile_corporate 1.0, chile_pyme 0.9, colombia_latam 0.85-0.90, international_usd 1.1-1.2, licitacion_publica 0.85-0.95, cliente_estrategico 0.95)
  - FTE guide: 11 filas (0.1 → 1.0 con horas mensuales)

### Slice 3 — Store + readers

- `pricing-governance-store.ts`:
  - `getRoleTierMargins(tier, asOfDate?) → { min, opt, max, effectiveFrom }`
  - `getServiceTierMargins(tier, asOfDate?) → { base, effectiveFrom }`
  - `getCommercialModelMultiplier(modelCode, asOfDate?) → { multiplierPct, effectiveFrom }`
  - `getCountryPricingFactor(factorCode, asOfDate?) → { min, opt, max, effectiveFrom }`
  - `convertFteToHours(fraction, asOfDate?) → { monthlyHours, effectiveFrom }`
  - Todos con cache en memoria (5 min TTL) porque son config lookup tables

## Out of Scope

- UI de edición (admin lo edita vía SQL en V1; TASK-464e puede exponerlo)
- Bitemporalidad o governance compleja de versiones; basta con filas append-only por `effective_from` y readers latest `<= asOfDate`
- Integración con TASK-348 approval policies (se hace en follow-up separado)

## Detailed Spec

### Seed data exact (de Excel)

**role_tier_margins:**
```
tier=1 | Commoditizado    | min=0.20 | opt=0.30 | max=0.35
tier=2 | Especializado    | min=0.30 | opt=0.40 | max=0.45
tier=3 | Estratégico      | min=0.40 | opt=0.50 | max=0.60
tier=4 | IP Propietaria   | min=0.60 | opt=0.70 | max=0.80
```
(Tier 4 sí aparece en `data/pricing/seed/role-tier-margins.csv`; no requiere inferencia manual.)

**service_tier_margins:**
```
tier=1 | Básicos o entrada                             | base=0.40
tier=2 | Estándar recurrentes                          | base=0.45
tier=3 | Consultoría o implementación media            | base=0.50
tier=4 | Estratégicos o premium                        | base=0.55
```

**commercial_model_multipliers:**
```
on_going             | Retainers o contratos estables                | 0
on_demand            | Proyectos o implementaciones puntuales        | 0.10
hybrid               | Combina setup + retainer                      | 0.05
license_consulting   | Servicios especializados o de licenciamiento  | 0.15
```

**country_pricing_factors:**
```
chile_corporate      | Mid-market o enterprise estándar   | 1.00 | 1.00 | 1.00
chile_pyme           | Startup, PYME budget limitado      | 0.90 | 0.90 | 0.90
colombia_latam       | Mercado precio-sensible            | 0.85 | 0.875 | 0.90
international_usd    | USA, Europa con budget             | 1.10 | 1.15 | 1.20
licitacion_publica   | Gobierno, concurso                 | 0.85 | 0.90 | 0.95
cliente_estrategico  | Futuro valor > margen actual       | 0.95 | 0.95 | 0.95
```

**fte_hours_guide:**
```
0.10 → 18h  | Soporte mínimo o participación táctica puntual
0.20 → 36h  | Rol parcial, apoyo en una cuenta o subproyecto
0.25 → 45h  | Involucramiento semanal (1 día aprox.)
0.30 → 54h  | Participación frecuente en un frente de trabajo
0.40 → 72h  | Dedicación parcial sostenida
0.50 → 90h  | Mitad de jornada mensual
0.60 → 108h | Presencia importante en dos proyectos o marcas
0.70 → 126h | Casi tiempo completo
0.80 → 144h | Alta dedicación
0.90 → 162h | Prácticamente dedicado
1.00 → 180h | Dedicación completa mensual (full-time)
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Seeder corre sin error e inserta seed real
- [ ] `role_tier_margins` tiene 4 filas
- [ ] `service_tier_margins` tiene 4 filas
- [ ] `commercial_model_multipliers` tiene 4 filas
- [ ] `country_pricing_factors` tiene 6 filas
- [ ] `fte_hours_guide` tiene 11 filas
- [ ] Drift rol→tier contra `TASK-464a` se reporta sin mutar el catálogo canónico
- [ ] Store helpers devuelven valores correctos
- [ ] Re-seed es idempotente

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-464d (pricing engine), TASK-464e (UI), TASK-460 (Contract)

## Follow-ups

- Admin UI para editar estas tablas sin seed (probablemente TASK-464e o task separada)
- Extender TASK-348 approval policies con condition type `role_tier_margin_below_min` que use `role_tier_margins.margin_min`

## Open Questions

- ¿La fila de encabezado `🌎 TABLA FACTOR PAÍS` en `country-pricing-factors.csv` debe ignorarse siempre como control row o queremos formalizarla como metadata del parser? Propuesta: ignorarla explícitamente y tratarla como `skipped_control_row`.
