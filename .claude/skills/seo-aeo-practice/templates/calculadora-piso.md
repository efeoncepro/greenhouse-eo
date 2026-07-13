# Template — Calculadora del piso (antes de cualquier cotización)

> 🔴 **Ninguna cotización sale sin esto.** El piso **se computa**, no se siente.

## 1. El pod

| Rol | Seniority | % dedicación | Costo mensual del rol | **Loaded** |
|---|---|---|---|---|
| Account Lead | Senior | % | | |
| Estratega / SEO Lead | Senior | % | | |
| Especialista SEO/AEO + Analítica | Senior | % | | |
| Editor / Redactor SEO | Senior | % | | |
| Redactor | Semi | % | | |
| Dirección creativa / QA | Lead | % | | |
| Diseñador visual | Senior | % | | |
| Otros | | % | | |
| **TOTAL** | | **__% ≈ __ FTE** | | **$ ______** |

**Referencia real (SKY, 2026-07):** 2,2 FTE → **CLP 2.260.000/mes** ≈ **CLP 1.027.000 / USD 1.105 por FTE-mes.**

## 2. El piso

```
Loaded delivery                              $ ________
+ Overhead absorbido (full absorption)       $ ________     🔴 no lo saltes
+ Buffer de riesgo (penalidades, comisión,
  scope creep)                               $ ________
────────────────────────────────────────────────────────
= COSTO TOTAL                                $ ________

PISO      = COSTO / (1 − 0,45)      ← margen mínimo 45%
TARGET    = COSTO / (1 − 0,57)      ← margen objetivo 55-60%
```

## 3. El gate

- [ ] 🔴 **¿El precio propuesto da ≥ 45% de margen?** Si no → **NO SE COTIZA.**
- [ ] ¿Pasó por `simulateQuotePricing()` (el cotizador real)?
- [ ] ¿El precio está **en o sobre** el benchmark del segmento? *(SMB 2.500-5.000 · mid 5.000-10.000 · ent 10.000-50.000+)*
- [ ] ¿La plataforma es **línea propia**?
- [ ] ¿El AEO es **línea propia** *(USD 900+/mes)*?
- [ ] ¿Hay **cláusula FX** y **reajuste** si el contrato dura >12 meses?
- [ ] 🔴 ¿**Ningún plan está dominado** por otro? *(Haz la aritmética del comprador.)*
- [ ] 🔴 ¿**No hay precio unitario por artículo**?
