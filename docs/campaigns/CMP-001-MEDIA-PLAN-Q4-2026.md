# CMP-001 · Media plan Q4 2026

**Estado:** `Borrador — bloqueado por tres inputs` · **2026-09-22** · **Ventana:** 2026-10-01 → 2026-12-31
· **Decisiones que lo gobiernan:** [CDR-001](decisions/CDR-001-cmp001-always-on-q4-2026.md) (ventana, derechos,
seasonality) · [CDR-005](decisions/CDR-005-cmp001-embudo-momento-y-accion.md) (embudo) ·
[CDR-007](decisions/CDR-007-cmp001-bofu-conversion-a-landing.md) (BOFU a conversión).

## 🔴 Lo que este plan NO puede decidir

| # | Input | Por qué bloquea | Quién lo da |
|---|---|---|---|
| **I1** | **Presupuesto y su techo mensual** | Sin monto no hay reparto, ni CPL objetivo, ni criterio de corte. Un plan sin techo es una lista de deseos (CDR-001) | operador |
| **I2** | Cuentas de pauta | ✅ **Meta conectado por MCP** *(operador, 2026-09-22)*. 🔴 LinkedIn y Google Ads siguen sin confirmar, y ninguna está documentada en el repo | operador |
| **I3** | Las dos decisiones abiertas de CDR-007 | canonical de AEO (B1) y cómo se dirige el clic BOFU a la agenda (B2) | operador + sitio público |

✅ **Lo que sí está verificado:** GA4 `G-KYPPY57M14` y GTM `GTM-K2X4ZTTK` existen en el sitio. Los formularios
y el agendamiento de ambas landings están comprobados en navegador (CDR-007).

## 🔴 Contradicción entre decisiones, a resolver antes de octubre

El **CDR-001 programa «Mide antes de migrar» al frente en la primera quincena de diciembre**. El **CDR-005
descartó ese ángulo**: le habla a quien tenga una migración agendada para enero, que es un segmento diminuto —
«es perder plata allí».

**Si nadie lo corrige, diciembre pauta un mensaje ya descartado.** Propuesta: esa quincena toma el ángulo de
**planificación anual** (el mismo de noviembre, que sí tiene audiencia: los presupuestos del año siguiente se
deciden ahí) y «mide antes de migrar» desaparece del calendario.

## 1. Estructura de campañas

Una campaña por **etapa × objetivo**, porque el objetivo de puja no se mezcla: una campaña con dos objetivos
entrega al más barato y deja de alimentar el embudo.

| Campaña | Objetivo | Audiencia | Assets listos | Destino |
|---|---|---|---|---|
| `CMP-001-TOFU` | alcance / tráfico | **frío** — ICP mid-market y enterprise LATAM | **9** (3 conceptos × 3 ratios) | diagnóstico gratis |
| `CMP-001-MOFU` | tráfico / consideración | retargeting TOFU + visitantes sin conversión | **9** | panel competitivo |
| `CMP-001-BOFU-AEO` | **conversión** | retargeting MOFU + visitantes de landing AEO | **3** ✅ | `/aeo-2/` → **agenda discovery** |

**Alcance reducido a AEO** por decisión del operador (CDR-007 §Delta). La razón por la que SEO y AEO habrían
sido campañas separadas sigue vigente si la línea SEO vuelve: sus eventos de conversión no valen lo mismo —un
lead comercial contra una reunión agendada— y contarlos juntos hace que el optimizador persiga el más barato.

## 2. El reparto cambia en el tiempo, no es una tabla fija

**El mes 1 no puede repartirse como el mes 3: en octubre no existe audiencia de retargeting todavía.** Un plan
que asigna 25% a BOFU desde el día uno quema presupuesto en una audiencia que aún no se construyó.

| | TOFU | MOFU | BOFU | Razón |
|---|---|---|---|---|
| **Oct** | **70%** | 30% | **0%** | se construye la audiencia; no hay a quién retargetear |
| **Nov** | 45% | **35%** | 20% | el pool de retargeting ya sostiene MOFU; entra BOFU |
| **Dic 1ª q.** | 35% | **40%** | 25% | peso a planificación *(ver contradicción arriba)* |
| **Dic 2ª q.** | \_\_ | \_\_ | \_\_ | 🔴 **inversión reducida, programada** (CDR-001) |

⚠️ **La baja de la segunda quincena de diciembre se programa como fecha, no como intención.** El pacing
automático no la aplica solo: si no queda cargada, gasta el presupuesto en la peor ventana del trimestre.

## 3. Rotación — el modo de falla de un always-on es la fatiga

El CDR-001 lo dice y cambia la producción: **un always-on no se produce una vez.**

- **Inventario hoy:** 3 ángulos TOFU + 3 MOFU. Con rotación semanal por ángulo y tres formatos, eso cubre el
  arranque, **no el trimestre**.
- **Regla operativa:** las piezas de reemplazo se producen **antes** de que el rendimiento caiga, no después.
  Cuando el CTR de un ángulo cae de forma sostenida, la variante ya tiene que existir.
- **Qué rota:** primero el **ángulo** (otro dato, otra escena); la variante de formato o de copy menor **no
  resuelve fatiga**, sólo la retrasa.

## 4. Medición

**Nada se pautea a conversión sin el evento medido** (CDR-007).

| Capa | Estado |
|---|---|
| GA4 `G-KYPPY57M14` + GTM `GTM-K2X4ZTTK` | ✅ existen |
| Evento por línea — Growth Form SEO ≠ agenda AEO | 🔴 a definir |
| `utm_campaign` → contact → deal en HubSpot | 🔴 **`TASK-1886`, prerrequisito** |
| Convención UTM | 🔴 **no existe escrita** — propuesta abajo |

**Convención propuesta** (una sola, para que el reporting cruce):

```
utm_source   = meta | linkedin | google        (la plataforma, nunca la pieza)
utm_medium   = paid_social | paid_search
utm_campaign = cmp001_<etapa>_<linea>           cmp001_bofu_aeo
utm_content  = <pieza>_<ratio>                  mo2_916
utm_term     = <audiencia>                      retarget_mofu
```

🔴 `utm_content` a nivel **pieza y ratio** es lo que permite saber qué creatividad muere primero — sin eso, la
rotación del punto 3 se decide a ojo.

## 5. Qué falta producir

| | Estado |
|---|---|
| TOFU 9 piezas | ✅ aprobadas |
| MOFU 9 piezas | ✅ aprobadas |
| BOFU-AEO, 3 ratios | ✅ **producidas** — copy tomado de la propia landing, CTA a la agenda |
| Variantes de rotación Nov–Dic | 🔴 no producidas |
