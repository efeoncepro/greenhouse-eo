# Efeonce — estado real de la práctica HubSpot · as-of 2026-07-13

> **Fuentes:** capturas del portal Partner + auditoría del CRM (portal 48713323, vía API) + el operador.
> Este documento existe porque **el diagnóstico intuitivo era incorrecto tres veces seguidas**.
> Léelo antes de proponer cualquier plan.

---

## 1. El diagnóstico, en una línea

> ## El negocio de agencia está vivo. **La máquina de licencias HubSpot es la que se apagó.**

Y el tier no cae porque vendas poco: cae por **la otra puerta**.

---

## 2. Tier — las dos puertas, y solo una está cerrada

| | Mínimo Gold | Efeonce tiene | Estado |
|---|---|---|---|
| **Puntos de origen** (sourced) | 110 | **143,58** | ✅ **30% por encima** |
| **Puntos totales** | 325 | **196,72** | 🔴 **Faltan 128,28** |
| **Puntos managed** | — | **0** | 🔴 |

**Gold acreditado hasta el 2027-01-15** (aplica el período de gracia: no hay downtier el 15 de julio).

**Movimiento 15-jun → 15-jul:** sourced **0** · managed **0** · legacy **−260,36**.
**Cero ganados. Doscientos sesenta perdidos.** En un mes completo.

**Pipeline (1-13 jul):** 0 deals creados · **1** sourced inflight · 0 cerrados.

### 🔴 La trampa de la insignia
El badge dice *"Gold válido hasta enero 2027"*. La pestaña **"Puntos por ventas antiguos"** dice otra cosa:

| dic'25–ene'26 | feb–abr'26 | may–jun'26 | **jul'26** | ago–nov'26 | **dic'26** |
|---|---|---|---|---|---|
| ~475 | ~408 | ~315-330 | **~55** ← se vencieron **~258 de golpe** | ~40 → ~22 | **≈ 0** |

**En junio estaba cómodamente sobre Gold. En julio cayó bajo el umbral.** No fue pendiente: fue un corte.

**El 15 de enero de 2027 se juntan tres cosas:** el legacy llega a **cero**, el umbral de Gold **sube a 345**,
y es **la fecha de downtier**. → `templates/tier-calculator.md`.

---

## 3. 🔴 La comisión: el derrumbe es ESTRUCTURAL, no de gestión

| Trimestre | Monto | Variación |
|---|---|---|
| Q1'26 (pagado 11-may) | **US$ 927,20** | ▼ 65% |
| Q2'26 (est., vence 15-ago) | **US$ 378** | ▼ 59% |

### La causa real: **la cascada Provider**

**Efeonce vendió su mejor año (2025) siendo PROVIDER, no Solutions Partner.**
✅ **El Provider Program paga 20% por solo 12 meses** — contra los **hasta 3 años** del Solutions Partner.

**Las comisiones de 2025 están venciendo en cascada, deal por deal, a los 12 meses de cada cierre.**
SSilva Marketing Hub cerró en feb-2025 → venció en feb-2026. Los asientos de Sales, abr-2025 → abr-2026.
**Nadie churneó ese trimestre. Vencieron los plazos.**

> 🔴 **La trampa de diagnóstico que casi nos come:** la relación con SSilva se había cortado, y la comisión
> cayó justo después. **La correlación gritaba causalidad.** Era falso: la comisión venció en su plazo
> contractual. **Verifica siempre el término antes de concluir que fue tu gestión.**

### 🎯 La lectura que sí importa hacia adelante
**Cada deal que cierres ahora vale el TRIPLE en duración.**
Un Marketing Hub Pro de $800/mes paga **$160/mes × 36 meses = $5.760** — no $1.920.
Los dos cross-sells del plan no son solo 160 puntos: son **~$11.500 de comisión a tres años.**

⚠️ **2026-08-15:** muere el Provider Program y a los no convertidos se les cortan las comisiones activas.
**Verificar que ninguna comisión viva siga colgando de ese esquema.**

---

## 4. La historia real de las licencias (auditoría del CRM)

**Deals de licencia HubSpot ganados** (todos en el pipeline `default`, ninguno en el de deal registration):

| Cliente | Deal | Monto | Cerrado |
|---|---|---|---|
| **ANAM** | Service Hubs + Credits — FINAL | **USD 8.400** | **2026-03-03** ← el más reciente |
| **ANAM** | Nuevas Licencias | USD | 2025-12-17 |
| **BeFUN** | HubSpot Marketing Pro | USD | 2025-06-19 |
| **Corp Aldea del Encuentro** | HubSpot | CLP 1.945.776 | 2025-04-25 |
| **SSilva** | 35 asientos de Sales | USD 3.200 | 2025-04-23 |
| **Ecoriles** | Renovación de licencia | USD | 2025-04-12 |
| **SSilva** | Marketing Hub | USD 8.844 | 2025-02-24 |
| **SSilva** | CRM Solutions (implementación) | UF 92,4 | 2025-01-28 |

**SSilva fue el mayor libro de licencias** (~USD 5.000/año real, según el operador). Marketing Hub Pro +
asientos de Sales. Relación cortada hace ~1 año por mal pago **de servicios**.

**El negocio de agencia sí está corriendo** — en 2026 cerraron Pinturas Berel (SEO), Motogas (social),
Aguas Andinas (implementación). 🔴 **Pero el último deal de LICENCIA creado fue ANAM, en diciembre de 2025.
Siete meses sin crear uno.**

---

## 5. La cartera hoy

| Cuenta | Productos | Gestionada | Estado |
|---|---|---|---|
| **ANAM** (19893546) | Sales Hub Pro + créditos + Service Hubs | ✅ desde 27-01-2026 | ✅ Partner admin activo. 🎯 **Sin Marketing Hub** |
| **Ecoriles** (7724659) | Sales Hub Pro + licencias | ✅ desde 03-05-2026 | ✅ Partner admin activo. 🎯 **Sin Marketing Hub** |
| **BeFUN** (242864773) | **Marketing Hub Pro** (ganado jun-2025) | 🔴 **NO gestionado** | ✅ Partner admin activo → **puntos managed gratis, sin usar** |
| **GyT Group** (47141477) | 🔴 **sin productos activos** | "gestionado" desde 29-06-2026 | ❌ **CHURNEÓ.** Sin champion interno → cero adopción. **No recuperable** |
| **GeaAmbiental** (49108807) | suite **Starter** | — | ❌ Acceso desactivado. **Empresa demasiado pequeña** — MRR mínimo |
| **SSilva** (49222084) | Marketing Hub + Sales | — | ❌ Acceso desactivado. **Sigue en HubSpot.** Comisión Provider **vencida** |

**Suscripción propia:** $412/mes — ⚠️ **12 dólares sobre el umbral del waiver de la membership**.
⚠️ Hay un **trial corriendo** que podría estar inflando ese número. **Verificar si son netos post-discount.**

---

## 6. 🔴 El canal partner está ciego

**El deal registration NO vive en el CRM.** Auditoría del portal 48713323:

- Hay **dos pipelines**: `Pipeline de ventas` (default) y `HubSpot Shared Selling Pipeline`.
- **El de Shared Selling tiene UN solo deal en toda su historia** — `G&T Group - Service Pro 2`,
  **Closed Lost** (may-2025). Está muerto.
- **Todos los deals de licencia ganados están en el pipeline de ventas.**
- El registro real se hace **en el portal de partner de HubSpot**, sin vínculo con el CRM.

**Consecuencias:**
1. **No hay forecast del canal partner** desde el CRM.
2. **No hay win rate verificable.** ⚠️ El *"40-50% de win rate partner-led"* de `docs/context/02_gtm.md:111`
   **no tiene respaldo en el CRM.** **No lo lleves a un board.**
3. **Drift documental:** las properties `prospect_source` y `modalidad_venta` que
   `docs/context/11_hubspot-bowtie.md:45-47` dice que existen **NO existen en deals**.

---

## 7. Las lecciones (que ya son doctrina en la skill)

| Caso | Lección | Dónde vive |
|---|---|---|
| **GyT Group** | 🔴 **Sin champion no hay adopción. Sin adopción hay churn.** No es un detalle de delivery: es un **requisito de ICP** | `modules/10` § 0 · `modules/04` |
| **GeaAmbiental** | ⚠️ **Un cliente muy chico en Starter no paga el costo de servir.** No todo deal que se puede cerrar vale la pena | `modules/04` |
| **SSilva** | 🔴 **La comisión venció por plazo Provider, no por tu gestión.** Verifica el término antes de culpar a tu decisión. *(Lo que sí perdiste al soltarlo: puntos managed, GRR y territorio)* | `modules/03` § 2 · `modules/02` § 1 |
| **La cartera** | 🔴 **Implementar y soltar.** 100+ implementaciones, **cero puntos managed** | `modules/03` |
| **El pipeline** | 🔴 **Registrar fuera del CRM te deja ciego al canal** | § 6 |

---

## 8. Lo que está sobre la mesa y no cuesta dinero

1. 🥇 **Dos cross-sells de Marketing Hub Pro** — ANAM y Ecoriles, ambos con Sales Hub y **sin Marketing Hub**,
   ambos con tu partner admin activo. **160 puntos sourced + ~$11.500 de comisión a 3 años.**
2. 🥈 **Registrar a BeFUN como cliente gestionado.** Ya te compró Marketing Hub Pro, ya tienes acceso.
   **Puntos managed que estás regalando.**
3. 🥉 **El listing del directorio**: 0 reviews, solo español, "Any Budget", 28 servicios, certificaciones solo
   de marketing. **Un email y un día.** → `modules/09` § 1.
4. 4️⃣ **Los créditos mensuales del portal demo** ✅ (use-it-or-lose-it). Munición de venta que se vence sola.

---

## 9. Preguntas abiertas — solo el operador o el PDM las cierran

| # | Pregunta | Por qué importa |
|---|---|---|
| 1 | 🔴 **¿Efeonce tiene la Partner Certification vigente?** | Desde el **2026-07-15, solo los certificados pueden waivear el onboarding del cliente**. **Es tu mejor argumento de cierre** |
| 2 | **¿Los $412 son netos post-discount?** ¿El trial que vence los infla? | Define si hay que presupuestar **$4.800/año** de membership |
| 3 | **La lista oficial de growth markets, por escrito** | El ×2 duplica o reduce a la mitad el esfuerzo de cada tier |
| 4 | **El proceso operativo del shared deal** (Growth Specialist, link de confirmación) | Habilita **toda** la motion de base instalada |
| 5 | **¿Alguna comisión viva sigue colgando del esquema Provider?** | El Provider Program **muere el 2026-08-15** |
| 6 | **El MRR gestionado exacto** según los registros de HubSpot | Cierra la calculadora sin estimaciones |

---

## 10. Refresh

**Caduca.** Se re-lee el portal **cada 15 del mes, antes del tier run**:
puntos totales · de origen · Δ del período · **saldo legacy** · pipeline · comisión · cartera.
Procedimiento: `templates/tier-calculator.md`. Doctrina: `modules/03_MOTOR_LIBRO.md` § 8.
