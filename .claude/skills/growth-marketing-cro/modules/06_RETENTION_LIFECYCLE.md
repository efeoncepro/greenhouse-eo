# 06 · Retention & Lifecycle

> La retención es la base del crecimiento, no una etapa más. Un balde con fuga
> desperdicia toda la adquisición. Se arregla **antes** de escalar CAC.

## 1. Curvas de retención y cohortes

- **Retention curve:** % de una cohorte que sigue activa por período desde M0. **Sana
  si se aplana** en una meseta > 0 (señal de PMF); tóxica si cae hacia cero.
- **Cohorte:** grupo por evento en el tiempo (signups de un mes, usuarios de un plan,
  de un canal). Compara cohortes para ver si los cambios de producto/onboarding mejoran
  la retención de las nuevas.
- **Tipos de cohorte:** por adquisición (fecha), por comportamiento (hizo X),
  por segmento (plan/vertical). El análisis por comportamiento revela qué hábito
  retiene (→ activation event, `05`).
- **"AI tourists" (2026):** mide contra **M3**, no M0 — el churn de curiosos infla la
  caída temprana y esconde la retención real de usuarios comprometidos.

## 2. Benchmarks (2026, reverificar; varían por segmento)

```
Churn mensual B2B SaaS: media ~3.5% · top <2% · enterprise 0.5–1% · SMB/self-serve 3–7%
NRR (Net Revenue Retention): mediana ~101% (privadas 2025) · top >120%
GRR (Gross Revenue Retention): piso de retención (sin expansión)
Involuntary churn: hasta ~48% del churn total
```

- **NRR > 100%** = creces sin adquirir (expansión > churn+contracción). Es el santo
  grial del B2B moderno.
- Distingue **churn voluntario** (dejan de ver valor → producto/CS) de **involuntario**
  (pagos fallidos → dunning). Mezclarlos lleva a atacar la causa equivocada.

## 3. Engagement loops (diseñar el hábito)

- Identifica el **comportamiento que correlaciona con retención de largo plazo** (ej.
  "envía 3 reportes/semana") e instrumenta el producto alrededor de él.
- Refuérzalo con **prompts contextuales**, **empty states que enseñan**, triggers
  externos honestos (notificaciones/emails con valor real, no spam) y gamificación
  ligera si sostiene el loop.
- **Triggers de Hook (Eyal), con ética:** trigger → acción → recompensa variable →
  inversión. Úsalo para *ayudar al usuario a obtener valor*, nunca para manipular
  (la manipulación quema confianza y deliverability, ver `ANTIPATTERNS`).

## 4. Churn: prevención y recuperación

- **Dunning (churn involuntario):** recupera **50–80%** de pagos fallidos sin cambios
  de producto. Reintentos inteligentes, actualización de tarjeta, avisos previos a
  vencimiento. Es el ROI más fácil de la retención.
- **Churn voluntario:** detección temprana de señales (caída de uso, no llegar al
  activation event, tickets), intervención proactiva de CS, win-back campaigns
  segmentadas.
- **Health score / churn prediction:** modela riesgo por uso + señales; prioriza
  intervención. (En Greenhouse hay señales de reliability análogas — overlay.)

## 5. Lifecycle marketing & email

Mapa de lifecycle (→ `templates/lifecycle-email-map.md`): onboarding → activación →
adopción → expansión → renovación → win-back. Cada etapa con su objetivo, disparador
(comportamiento, no calendario) y métrica.

**Deliverability 2026 (crítico — reglas volátiles, reverificar):**
- **Autenticación obligatoria** para bulk: SPF + DKIM + **DMARC** (p=none aceptable
  como inicio, pero progresa a quarantine/reject).
- **One-click unsubscribe (RFC 8058)** obligatorio en marketing/promocional (header
  `List-Unsubscribe` + URL HTTPS). No aplica a transaccional (reset, confirmación).
- **Spam rate:** Gmail bloquea mitigación ≥ **0.30%**; los senders estables apuntan a
  **<0.10%**. En 2026 el enforcement es implacable con setups "good enough".
- **Higiene de lista:** nunca comprar listas; sunset de inactivos; doble opt-in donde
  aplique; segmentar por engagement. Un dominio quemado tarda meses en recuperarse.
- **Lifecycle ≠ blast:** dispara por comportamiento (llegó/no llegó al aha, subió/bajó
  uso), no por fecha. Relevancia = deliverability + conversión.

## 6. Retención → expansión (NRR)

- Expansión ya es ~40% del ARR nuevo (2024) y mayoría del crecimiento a escala. Palancas:
  upsell por valor alcanzado, cross-sell por uso, seats/consumo, pricing por expansión.
- La activación temprana (`05`) predice la expansión: quien alcanza el core value
  antes, expande más. Ata retención ↔ activación ↔ pricing (pricing/packaging es de
  **`commercial-expert`**).

## Checklist de salida

- [ ] Curva de retención por cohorte (¿se aplana?) medida contra M3.
- [ ] Churn voluntario vs involuntario separados; dunning activo.
- [ ] Engagement loop diseñado alrededor del comportamiento que retiene.
- [ ] Lifecycle mapeado con disparadores por comportamiento; email con SPF/DKIM/DMARC,
      one-click unsubscribe y spam rate <0.10%.
- [ ] NRR/GRR medidos; palancas de expansión identificadas.

## Cross-links

- PMF y curva de retención → `01`; activación que predice retención → `05`
- Medir cohortes/retención → `07`; errores (quemar dominio, dark triggers) → `ANTIPATTERNS.md`
- Pricing/packaging/expansión comercial → skill `commercial-expert`
- En el repo: churn/health signals y lifecycle → `efeonce/MEASUREMENT_IN_GREENHOUSE.md`
