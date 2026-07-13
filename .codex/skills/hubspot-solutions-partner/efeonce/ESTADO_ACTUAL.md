# Efeonce — estado real de la práctica HubSpot · as-of 2026-07-13

> **Fuente: capturas del portal Partner del operador, 2026-07-13.** No es estimación.
> Este documento existe porque **el diagnóstico intuitivo era incorrecto** y llevaba a la solución equivocada.

---

## 1. El diagnóstico

> ## 🔴 No hay un problema de tier. Hay una práctica de HubSpot que dejó de operar.
>
> El tier cayendo es el **síntoma**. La enfermedad es que **nadie está vendiendo ni administrando HubSpot**.

Lo que se creía: *"vendo poco, necesito vender mejor a empresas grandes."*
Lo que dicen los números: **el motor de venta está sobre la cuota. El que está en cero es el de libro.**

---

## 2. Los números

### Tier — **las dos puertas, y solo una está cerrada**

| | Mínimo Gold | Efeonce tiene | Estado |
|---|---|---|---|
| **Puntos de origen** (sourced) | 110 | **143,58** | ✅ **30% por encima** |
| **Puntos totales** | 325 | **196,72** | 🔴 **Faltan 128,28** |
| **Puntos managed** | — | **0** | 🔴 |

**Tier: Gold, válido hasta el 2027-01-15.** *(El período de gracia aplica: no hay downtier el 15 de julio.)*

**La resta que lo explica todo:** `196,72 − 143,58 = 53,14` puntos entre assisted y managed.
En LATAM el managed paga 2 pts/$100 → eso equivale a un libro gestionado de **~$2.600 de MRR**.
**Con 100+ implementaciones a la espalda.**

### Movimiento del último período (15-jun → 15-jul)

| Movimiento | Puntos |
|---|---|
| Por ventas nuevas | **0** |
| Por administración | **0** |
| Por ventas antiguas | **−260,36** |

**Cero ganados. Doscientos sesenta perdidos.** En un mes completo.

### Pipeline (1-13 de julio)
**0** deals creados · **1** sourced inflight · **0** cerrados.

### Comisión
| Trimestre | Monto | Variación |
|---|---|---|
| Q1'26 (pagado 11-may) | **US$ 927,20** | ▼ 65% |
| Q2'26 (est., vence 15-ago) | **US$ 378** | ▼ 59% |

**A 20% de revenue share, $378 trimestrales implican una base comisionable de ~$630 de MRR.**

### La cartera

| Cuenta | Productos | Relación gestionada | Estado |
|---|---|---|---|
| **ANAM** (19893546) | Sales Hub Professional + créditos | desde 27-01-2026 | ✅ Partner admin activo |
| **Ecoriles** (7724659) | Sales Hub Professional + licencias | desde 03-05-2026 | ✅ Partner admin activo |
| **GyT Group** (47141477) | 🔴 **sin productos activos** | desde 29-06-2026 | ⚠️ **Fantasma — investigar hoy** |
| **BeFUN** (242864773) | — | no gestionado | Partner admin activo |
| **GeaAmbiental** (49108807) | — | — | 🔴 **Acceso desactivado** |
| **SSilva** (49222084) | — | — | 🔴 **Acceso desactivado.** Sigue en HubSpot ✅ |

**Suscripción propia:** $412/mes — ⚠️ **12 dólares sobre el umbral del waiver de la membership**.
⚠️ Hay un **trial corriendo**. Si infla temporalmente la suscripción, al terminar puede caer bajo los $400
y **empezar a pagar $4.800/año**. **Verificar si los $412 son netos post-discount.**

---

## 3. 🔴 La trampa de la insignia — el gráfico que el badge oculta

El portal dice **"Gold válido hasta el 15 de enero de 2027"** y se siente seguro.
La pestaña **"Puntos por ventas antiguos"** dibuja otra historia:

| Mes | Saldo legacy |
|---|---|
| dic '25 – ene '26 | ~475 |
| feb – abr '26 | ~408 |
| may – jun '26 | ~315-330 |
| **jul '26** | **~55** ← se vencieron **~258 puntos de golpe** |
| ago – nov '26 | ~40 → ~22 |
| **dic '26** | **≈ 0** |

**En junio estaba cómodamente sobre Gold. En julio cayó bajo el umbral.** No fue una pendiente: fue un corte.

### El 15 de enero de 2027 se juntan tres cosas
1. Los puntos legacy llegan a **cero**.
2. El umbral de Gold **sube** de 325 a **345** totales (y de 110 a 115 sourced).
3. Es **la fecha de revisión de downtier**, y es cuando vence el Gold acreditado.

> **NUNCA leas la insignia sin leer la curva.** Un partner que solo mira el badge llega a enero sin saber
> qué lo golpeó. **Esta es la regla que fundó el módulo 02.**

---

## 4. La causa raíz — y la lección que costó el tier

### 🔴 Se confundió la relación de SERVICIO con la relación de LICENCIA

**Caso SSilva** (contado por el operador): *"pagaba mal, así que lo descartamos. Sin embargo sigue con
HubSpot. Tal vez haber manejado distinta la relación nos hubiese mantenido en tier."*

**El operador tiene razón, y el mecanismo es exacto.** Al cortar la relación completa se perdieron **tres
cosas, y ninguna era el problema**:

1. La **comisión** de su licencia — ingreso pasivo, cero costo de servir.
2. Los **puntos managed** que sostenían el tier.
3. El **GRR**, que gatea Diamond y Elite más adelante.

Y se ganó una cuarta pérdida, invisible: bajo **Best Partner Wins**, SSilva es hoy **territorio abierto**.
Cualquier partner puede firmarle un POI, cross-venderle Marketing Hub y llevarse los puntos sourced
**de una cuenta que Efeonce originó**.

> **La jugada correcta con un mal pagador de servicios no es echarlo: es degradarlo a licencia + toque
> mínimo.** Corta la sangría operativa y conserva comisión, puntos y retención.
> **Doctrina completa: `modules/03_MOTOR_LIBRO.md` § 2.**

### Los otros tres síntomas de la misma enfermedad
- **Cero puntos managed** con 100+ implementaciones → **implementar y soltar**. Los puntos managed expiran a
  los **60 días** de la última acción. Nadie está tocando las cuentas.
- **Un "cliente gestionado" sin productos activos** (GyT Group) → es una fila en un reporte, no un activo.
- **Cero deals creados en un mes** → el motor de venta está **apagado**, no roto. Los 143,58 sourced points
  vienen de deals viejos que están envejeciendo.

---

## 5. El número de supervivencia

**En enero se necesitan 345 puntos totales construidos íntegramente con el modelo deal-based**, porque el
legacy ya no existirá. Descontando el legacy del total actual, hoy hay del orden de **~140 puntos deal-based**.

### La brecha: **~205 puntos en seis meses**

| Camino | Requisito | Traducción |
|---|---|---|
| **Vendiendo** (sourced, 10 pts/$100) | **~$2.050 de MRR nuevo** | **Dos o tres Marketing Hub Pro** ($800/mo c/u) |
| **Con el libro** (managed, 2 pts/$100) | ~$10.250 de MRR bajo gestión activa | Requiere construir el libro |

**Lo correcto es hacer las dos cosas** — y el plan está en `PLAN_RESCATE_6M.md`.

### Y la ventana de Platinum, con precio
Platinum pide **925 puntos totales** hasta el 2026-12-31, y **1.275 desde el 2027-01-15**.

> **Llegar a Platinum antes de enero cuesta ~$7.300 de MRR sourced. Después, ~$10.800.**
> **Un 48% más caro por esperar.**

Y Platinum es lo que abre las **acreditaciones**, que son criterio de prioridad del **Partner Matching**.
Hoy Efeonce es elegible para el matching (Gold+) pero **queda al final de la fila**.
→ El círculo virtuoso en `modules/02` § 7.

---

## 6. Las tres cosas que están sobre la mesa y no cuestan dinero

1. 🥇 **Dos cross-sells de Marketing Hub Pro a clientes que ya administras** (ANAM y Ecoriles, ambos con
   Sales Hub Pro y **sin Marketing Hub**) = **160 puntos sourced**. Sin un logo nuevo. Sin prospección en frío.
2. 🥈 **El listing del directorio**: **cero reviews** con 100+ implementaciones, solo en español, "Any Budget",
   28 servicios, certificaciones solo de marketing. **Arreglarlo cuesta un email y un día.** → `modules/09` § 1.
3. 🥉 **Los créditos mensuales del portal demo** ✅ (desde marzo 2026, **use-it-or-lose-it**) para demostrar
   Breeze a prospectos. Munición de venta gratis que se está venciendo sin usarse.

---

## 7. Preguntas abiertas — solo el operador o el PDM pueden cerrarlas

| # | Pregunta | Por qué importa |
|---|---|---|
| 1 | **¿GeaAmbiental sigue en HubSpot?** *(De SSilva ya se sabe que sí)* | Cada uno es comisión, puntos managed y **territorio abierto para otro partner** |
| 2 | **¿Los $412 son netos post-discount?** ¿Y el trial que vence, los infla? | Define si hay que presupuestar **$4.800/año** de membership |
| 3 | **La lista oficial de growth markets, por escrito** | El ×2 duplica o reduce a la mitad el esfuerzo de cada tier |
| 4 | **El proceso operativo del shared deal** para cross-sell (Growth Specialist, link de confirmación) | Habilita **toda** la motion de base instalada |
| 5 | **El MRR gestionado exacto** según los registros de HubSpot | Cierra la calculadora sin estimaciones |
| 6 | **¿Qué pasó con GyT Group?** ("gestionado" desde el 29-jun, **sin productos activos**) | O churneó, o el registro está mal. Las dos cosas hay que arreglarlas |

---

## 8. Refresh

**Este documento caduca.** Se re-lee el portal **cada 15 del mes, antes del tier run**, y se actualiza:
puntos totales · puntos de origen · Δ del período · saldo legacy · pipeline · comisión · cartera.

Procedimiento: `templates/tier-calculator.md`. Doctrina: `modules/03_MOTOR_LIBRO.md` § 8.
