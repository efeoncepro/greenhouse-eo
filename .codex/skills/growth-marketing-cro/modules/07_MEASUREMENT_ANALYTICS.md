# 07 · Measurement & Analytics

> Sin medición honesta, no hubo growth. Y en 2026, medir "como en 2019" (last-click,
> cookies, MTA como verdad única) es medir mal. Todo evento nace en un tracking plan.

## 1. Tracking plan & event taxonomy (la base de todo)

Antes de instrumentar nada, escribe el **tracking plan** (→ `templates/tracking-plan.md`):
qué eventos, con qué propiedades, con qué nombres. Sin esto el dato nace sucio y el
funnel no es confiable.

Convenciones canónicas:
- **Naming consistente:** `object_action` en snake/verbo pasado (`report_created`,
  `signup_completed`, `trial_started`). Elige una convención y NO la mezcles.
- **Propiedades tipadas y estables** (source, plan, tenant, variant…). Documenta cada
  una; versiona los cambios.
- **Eventos de negocio, no de UI:** captura la *intención/valor* (`checkout_completed`),
  no cada click. Deriva micro-eventos si hacen falta.
- **Un owner del plan.** Los eventos ad-hoc sin gobernanza son el origen de la deuda
  de datos. (En Greenhouse esto lo formaliza el tracking engine — overlay.)

## 2. El fin de la medición basada en cookies

- **MTA (multi-touch attribution)** cayó de >90% a **30–60%** de cobertura post-cookie.
  Hoy es **capa táctica** (optimizar dentro de un canal), **no la fuente única de
  verdad** de asignación cross-canal.
- **Cookie deprecation** infla el CAC reportado 25–45% y rompe el tracking client-side.
- Consecuencia: se necesita un **stack de medición en capas**, no una sola herramienta.

## 3. El stack de medición 2026 (en capas)

```
1. Consent management (base legal; Consent Mode v2)          → legalidad + señal
2. First-party & zero-party data capture                     → el activo propio
3. Server-side event routing (CAPI / sGTM)                   → resiliencia a bloqueadores
4. Analytics (GA4) + producto (Amplitude/Mixpanel)           → comportamiento
5. Warehouse (BigQuery/Snowflake) + dashboard                → una fuente de verdad
6. Medición modelada: MMM y/o incrementality                 → asignación causal
```

- **Consent Mode v2:** alta adopción en EEA pero ~67% mal implementado; solo ~23%
  recupera el dato prometido. Implementarlo bien es condición para medir, no un checkbox.
- **Server-side tracking (CAPI/server-GTM):** envía eventos desde el servidor → resiste
  ITP/adblockers, controla el dato, mejora la calidad de conversión enviada a plataformas.
- **Warehouse-native:** métricas calculadas en el warehouse = una sola fuente de verdad
  (evita el "las métricas del tool no cuadran con negocio"). Habilita experimentación
  warehouse-native (Eppo/GrowthBook, `04`).

## 4. Atribución modelada: MMM + incrementality

Como MTA ya no basta para asignar presupuesto:
- **MMM (Marketing Mix Modeling):** modelo estadístico top-down desde datos agregados;
  estima contribución de cada canal + factores externos; **independiente de cookies**.
  Tools ligeros accesibles sin equipo de data science: **Robyn** (Meta), **Meridian**
  (Google).
- **Incrementality / geo-holdout:** el estándar de oro causal — apaga el gasto en
  regiones de control y mide el lift real ("¿habría pasado igual sin el gasto?").
  Independiente de cookies/tracking de usuario.
- **Cómo combinar:** MTA para optimización intra-canal (táctico), MMM para asignación
  de presupuesto cross-canal (estratégico), incrementality para validar causalidad de
  las apuestas grandes. No uses una sola y la llames verdad.

## 5. Instrumentar la North Star y el funnel

- Cada etapa del funnel AARRR y cada input de la NSM (`01`) debe tener su evento en el
  tracking plan. Sin esto no puedes diagnosticar la fuga ni simular el growth model.
- **Métricas leading vs lagging:** instrumenta las *leading* (activation event, PQL,
  engagement loop) que predicen las *lagging* (revenue, NRR) — para poder actuar antes.
- **Segmentación:** por fuente, cohorte, plan, variante. La media miente; el segmento
  informa (ej. activación por vertical, `05`).

## 6. Analítica de producto vs de marketing

- **Producto (Amplitude/Mixpanel/PostHog):** funnels, cohortes, retención, paths — para
  activación/retención (`05`, `06`).
- **Marketing/web (GA4):** adquisición, campañas, comportamiento de sitio — con las
  limitaciones de cookies arriba; complementa con server-side + MMM.
- **Reconcílialos en el warehouse.** Dos herramientas, una verdad.

## 7. Privacidad como diseño (no como fricción)

- Base legal para PII (GDPR; en Chile **Ley 21.719**, ver overlay). Consentimiento real,
  minimización de datos, retención acotada.
- Zero-party data (preferencias que el usuario comparte a cambio de valor) es el activo
  que reemplaza el tracking de terceros — y es el más limpio y legal.
- Medir violando privacidad no solo es ilegal: rompe la medición cuando la plataforma
  penaliza. Privacy-first **es** measurement-first en 2026.

## 8. La medición en la web agéntica

Cuando un agente IA compra por el usuario, no hay pageviews/sessions/clicks: el stream
conductual clásico empieza recién en el add-to-cart o transacción. Prepararse:
server-side + feeds/schema + eventos de negocio (no de UI) + reconocer que una parte
creciente del funnel será invisible a la atribución legacy (→ `02`, `seo-aeo`).

## Checklist de salida

- [ ] Tracking plan escrito (eventos + propiedades + naming) con owner, antes de instrumentar.
- [ ] Consent Mode v2 + server-side tracking implementados correctamente (no checkbox).
- [ ] MTA usada como táctica, no como verdad única; MMM/incrementality para asignación.
- [ ] NSM + funnel + leading metrics instrumentados y segmentables.
- [ ] Warehouse como fuente única; privacidad por diseño (base legal, PII acotada).

## Cross-links

- Qué medir (NSM/loop) → `01`; experimentos que consumen esta data → `04`
- Activación/retención que instrumentas → `05`, `06`
- En el repo: tracking engine (propuesto), GSC, party funnel, conversion signal →
  `efeonce/MEASUREMENT_IN_GREENHOUSE.md`
- Analítica de búsqueda/SoV IA → skill `seo-aeo`; errores → `ANTIPATTERNS.md`
