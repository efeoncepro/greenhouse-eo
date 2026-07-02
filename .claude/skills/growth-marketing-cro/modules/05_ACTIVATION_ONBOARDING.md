# 05 · Activation & Onboarding

> El cuello de botella de 2026: 40–60% de free users nunca se activan y solo ~34% de
> las empresas PLG lo trackean. La activación ya no es UX de tope de embudo: es el
> borde de ataque de la Net Revenue Retention.

## 1. Aha moment vs activation event

- **Aha moment** = la realización *emocional* de que el producto vale. Es cualitativo.
- **Activation event** = el proxy *medible* que aproxima ese aha (ej. Facebook "7
  amigos en 10 días"; Slack "2.000 mensajes de equipo"; una plataforma de reporting:
  "primer reporte entregado + compartido"). Se descubre, no se inventa.

**Cómo hallarlo:** analiza cohortes retenidas vs churneadas y busca la acción (o el
umbral: cuánto/qué tan rápido) que **mejor correlaciona con la retención de largo
plazo**. Valida que sea causal (no solo correlación de usuarios ya-comprometidos) con
un experimento o análisis de secuencia. Ese evento se vuelve tu **norte de activación**.

## 2. Métricas de activación (y sus benchmarks 2026)

```
Activation rate = usuarios que alcanzan el activation event / nuevos usuarios
TTFV  (Time to First Value)  = tiempo hasta el primer valor percibido
TTV   / Time to Core Value   = hasta que el uso es patrón que predice renovación
PQL velocity                 = qué tan rápido cruzan el umbral de PQL
```

Referencias (*as-of 2026, reverificar y ajustar por vertical*):
- **Activation rate:** mediana ~36–37.5%; <20% débil, 20–40% típico, >40% fuerte.
  AI ~54.8%, FinTech ~5% (la dispersión por vertical es enorme — compárate contra tu
  categoría, no contra el promedio).
- **Top-cuartil:** >40% activación, **TTV < 5 min**, D7 retention >30%. Líderes: TTV
  mediano ~1 día.
- **Expansión** pasó de ~25% del ARR nuevo (2022) a ~40% (2024) → activar bien es el
  inicio de la NRR, no solo del funnel.

## 3. El problema de los "AI tourists" (2026)

Signups frictionless + curiosidad IA generan usuarios que exploran y se van sin
intención real, **inflando cohortes** y distorsionando la retención temprana. Mitigación:
- Mide retención contra **M3** (no M0): para el mes 3 el churn de turistas ya se
  limpió y quien sigue tomó una decisión real.
- Segmenta activación por **fuente/intención**; no optimices para volumen de signup
  que no activa.

## 4. Diseñar el onboarding hacia el aha (no un tour de features)

Principios:
- **Camino más corto al primer valor.** Elimina todo paso que no acerque al activation
  event. TTV es la métrica a batir.
- **Personaliza por intención** (2026): adapta la secuencia según señales tempranas de
  comportamiento / respuesta de bienvenida, en vez de un flujo único.
- **Empty states que enseñan** y **defaults inteligentes** (plantillas, datos de
  ejemplo) para que el usuario vea valor sin construir desde cero.
- **Reduce fricción de setup:** SSO, import, autocompletado; difiere lo opcional.
- **Prompts contextuales y checklists** de onboarding que refuerzan el comportamiento
  central; gamificación ligera solo si sostiene el loop, no por sí misma.
- **Momento del prompt de referral/invitación:** justo *después* del aha (cuando el
  valor es fresco), no antes (→ alimenta el viral loop, `02`).

## 5. PQL: el handoff PLG→sales

Un **Product-Qualified Lead** demostró valor real (milestones/uso premium en trial).
Es una señal de intención mucho más fuerte que un MQL de formulario.
- Define el umbral PQL con datos (qué comportamiento predice conversión a pago).
- **PQL velocity:** los que cruzan rápido convierten más → priorízalos.
- El *cierre* del PQL (outbound, demo, pricing) es de **`commercial-expert`**; growth
  entrega el PQL bien definido e instrumentado. Ata el evento PQL al tracking plan (`07`).

## 6. Cómo mejorar activación (loop de trabajo)

1. Instrumenta el funnel de activación paso a paso (dónde se caen antes del aha).
2. Halla el paso muerto de mayor `caída × volumen`.
3. Diagnostícalo con Fogg (¿motivación, fricción o prompt?) — ver `03`.
4. Hipótesis → experimento (o cambio de alta confianza si no hay tráfico) → medir.
5. Repite; vigila que subir activación no baje calidad/retención (guardrail).

## Checklist de salida

- [ ] Activation event definido con datos (correlación con retención + validación causal).
- [ ] Activation rate + TTV medidos y comparados contra la **vertical**, no el promedio.
- [ ] Retención temprana medida contra M3 (control de "AI tourists").
- [ ] Onboarding diseñado como camino más corto al aha (no tour de features).
- [ ] Prompt de invitación colocado post-aha; PQL definido e instrumentado.

## Cross-links

- De dónde vienen los usuarios → `02`; retenerlos → `06`
- Diagnóstico de pasos muertos (Fogg) → `03`; medir → `07`
- Cierre de PQL / pipeline → skill `commercial-expert`
- En el repo: activación del AEO grader como lead magnet → `efeonce/AEO_GRADER_AS_LEAD_MAGNET.md`
