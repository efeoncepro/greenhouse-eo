# Calculadora de tier

> **Nunca de memoria. Los umbrales suben el 2027-01-15 y la aritmética cambia.**
> Corre esto **cada 15 del mes, ANTES del tier run**.

---

## Constantes (LATAM = growth market, ×2) ✅

| Crédito | Puntos | Caduca | Regla rápida |
|---|---|---|---|
| **Sourced** | 10 / USD 100 MRR | 1 año desde el cierre | **1 punto = USD 10 de MRR** |
| **Assisted** | 6 / USD 100 MRR | 1 año desde el cierre | 1 punto = USD 16,7 |
| **Managed** | 2 / USD 100 MRR | 🔴 **60 días desde tu última acción** | **1 punto = USD 50 de MRR** |

**Umbrales:**

| Tier | Hasta 2026-12-31 (sourced / total) | **Desde 2027-01-15** | GRR |
|---|---|---|---|
| Gold | 110 / 325 | **115 / 345** | — |
| Platinum | 325 / 925 | **425 / 1.275** | — |
| Diamond | 950 / 3.100 | 1.250 / 3.750 | ≥75% |
| Elite | 2.100 / 9.000 | 2.750 / 11.000 | ≥80% + 100 certs + invitación |

**Referencias de producto:** Marketing Hub Pro = **USD 800/mo = 80 pts sourced** ·
Marketing Hub Ent = USD 3.600/mo = 360 pts · Sales Hub Pro = USD 90/seat/mo = **9 pts por seat**.

---

## El procedimiento

### Paso 1 · Lee el portal (Partner → Progreso del nivel)
```
Puntos totales:            ______
Puntos de origen:          ______
Δ del último período:      sourced ____ · assisted ____ · managed ____ · legacy ____
```

### Paso 2 · 🔴 Lee la CURVA, no la insignia (pestaña "Puntos por ventas antiguos")
```
Saldo legacy este mes:     ______
Saldo legacy proyectado en la próxima fecha de downtier:  ______   ← casi siempre ~0
```
> **La insignia dice "válido hasta [fecha]". La curva dice cuándo se disuelve tu piso.**
> **Nunca leas una sin la otra.** Es la regla que fundó esta calculadora.

### Paso 3 · Proyecta a la próxima fecha de downtier (15-ene o 15-jul)
```
Puntos deal-based hoy  =  Puntos totales − Saldo legacy         = ______
Menos los sourced/assisted que cumplen 1 año antes de esa fecha  = ______
─────────────────────────────────────────────────────────────────────────
PUNTOS PROYECTADOS                                               = ______
```

### Paso 4 · Usa el umbral de ESA fecha, no el de hoy
```
Umbral total en la fecha objetivo:      ______   (345 desde enero 2027)
Umbral sourced en la fecha objetivo:    ______   (115 desde enero 2027)

BRECHA TOTAL   = umbral_total   − proyectado_total    = ______
BRECHA SOURCED = umbral_sourced − proyectado_sourced  = ______
```
🔴 **Son DOS puertas.** Puedes estar sobrado en sourced y caer igual por el total.

### Paso 5 · Traduce a plata
```
Vía VENTA   →  brecha_total × USD 10   = $______ de MRR nuevo sourced
Vía LIBRO   →  brecha_total × USD 50   = $______ de MRR bajo gestión activa
```

### Paso 6 · Traduce a deals
```
Marketing Hub Pro (USD 800/mo) = 80 pts   →  brecha ÷ 80 = ____ deals
Sales Hub Pro (por seat)    = 9 pts    →  brecha ÷ 9  = ____ seats
```

### Paso 7 · Verificación de sanidad
🔴 **Si el resultado dice que necesitas menos de dos deals, revísalo: probablemente olvidaste que el legacy
se va a cero.**

---

## Ejemplo trabajado — Efeonce, 2026-07-13

```
Paso 1   Totales: 196,72   Origen: 143,58
         Δ período: sourced 0 · managed 0 · legacy −260,36     ← cero ganado, 260 perdido

Paso 2   Legacy hoy: ~55        Legacy en enero 2027: ≈ 0      ← el piso se disuelve

Paso 3   Deal-based hoy ≈ 196,72 − 55 ≈ 140

Paso 4   Umbral enero 2027: 345 total / 115 sourced
         BRECHA TOTAL ≈ 345 − 140 = ~205 puntos
         BRECHA SOURCED: 0 (143,58 > 115) ✅

Paso 5   Vía venta:  205 × USD 10 = USD 2.050 de MRR nuevo sourced
         Vía libro:  205 × USD 50 = USD 10.250 de MRR bajo gestión

Paso 6   USD 2.050 ÷ USD 800 = ~2,5 Marketing Hub Pro

Paso 7   ✅ Coherente: el motor de venta está sobre cuota; el que está en cero es el de LIBRO.
```

**Lectura:** no es un problema de vender. Es un problema de **no tener piso**.
→ `efeonce/ESTADO_ACTUAL.md` · `efeonce/PLAN_RESCATE_6M.md`.

---

## Y la ventana de Platinum

```
Platinum total:  925 hasta el 2026-12-31   →   1.275 desde el 2027-01-15
Con 196,72 hoy:  brecha de 728  →  USD 7.283 de MRR sourced
                 brecha de 1.078 →  USD 10.783 de MRR sourced   (48% MÁS CARO)
```
> 🎯 **Llegar a Platinum antes de enero cuesta un 48% menos.** Y Platinum abre las **acreditaciones**, que son
> criterio de prioridad del **Partner Matching**. → `modules/02` § 7.

---

## Checklist del día 15

- [ ] Puntos totales, de origen y Δ del período — **leídos del portal, no recordados**
- [ ] **Saldo legacy y su curva** — 🔴 la insignia miente por omisión
- [ ] Proyección a la próxima fecha de downtier, con **legacy = 0**
- [ ] Umbral de **esa** fecha (no el de hoy)
- [ ] ¿Qué cuentas **no toco hace >45 días**? → sus puntos managed están sangrando
- [ ] ¿Qué "clientes gestionados" figuran **sin productos activos**? → fantasmas
- [ ] ¿Qué accesos de **partner admin están desactivados**? → comisión, puntos y **territorio abierto**
- [ ] ¿Qué clientes tienen **un solo Hub**? → tu pipeline de cross-sell de la semana
- [ ] Actualizar `efeonce/ESTADO_ACTUAL.md`
