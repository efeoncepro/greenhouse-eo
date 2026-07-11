# 07 · GTM Metrics & Economics

Un GTM sin economía es fe, no estrategia. Este módulo define **qué medir** para saber si la máquina GTM funciona y es rentable. El **runtime de medición/atribución** (GA4, GTM, CRM) → `greenhouse-gtm-ga4-operator` + HubSpot; el **modelado financiero** → `greenhouse-finance-accounting-operator`. Acá se decide **qué métricas importan y cómo leerlas**.

## Regla 2026: pipeline/revenue, no vanity
- **El MQL murió** (`05`): <1% de leads cierran. **Pipeline contribution** (sourced + influenced) es la métrica de marketing.
- No optimices leads/tráfico/impresiones (vanity). Optimiza **pipeline de calidad, velocidad y economía**.
- La disciplina 2026 es **revenue, cross-funcional** — GTM se mide como sistema, no por función.

## Las métricas de economía GTM (las que mandan)
*(Benchmarks as-of 2026-07, B2B SaaS — reverificar y ajustar al modelo agencia/ASaaS de Efeonce.)*

| Métrica | Qué dice | Referencia 2026 |
|---|---|---|
| **LTV : CAC** | ¿el cliente vale más de lo que cuesta adquirirlo? | target **≥ 3:1** |
| **CAC payback** | ¿en cuántos meses recuperas el CAC? | mediana ~15 meses; best-in-class **< 12**; PLG ~4 |
| **NRR (Net Revenue Retention)** | ¿la base crece sola (expansión − churn)? | mediana ~101%; top **111%+**; best 120–130% |
| **Magic Number** | eficiencia del gasto GTM (ARR nuevo / gasto S&M) | target **> 1.0** |
| **Pipeline coverage** | ¿hay suficiente pipeline para la meta? | típico 3–4× |
| **Win rate / velocity** | calidad y rapidez del pipeline | signal-based 32% vs list 13% |
| **Time-to-first-revenue** | qué tan rápido monetizas | menor = mejor |

## Cómo leerlas juntas (no una sola)
- **LTV:CAC alto pero payback largo** = creces pero te descapitalizas → problema de caja (`finance`).
- **CAC bajo pero NRR bajo** = adquieres barato pero se van → arreglar retención/expansión (`growth-cro`), no adquirir más.
- **Magic Number < 1** = el GTM quema más de lo que trae → antes de escalar, arregla la eficiencia.
- **La palanca más barata en 2026 es NRR/expansión**, no adquisición en frío — expandir cuesta menos que adquirir.

## GTM economics en agencia / ASaaS (Efeonce)
- Traduce las métricas SaaS al modelo real: **retainer recurrente = ARR-like**; **loaded cost por member** = costo de servicio (`GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`); **expansión de cuenta** = NRR (win rate 50% en cuentas vs 2–3% frío, `docs/context/08`).
- El **ICO health score** y el bow-tie `is_at_risk` alimentan la lectura de retención/riesgo (doctrina `commercial-expert` + `docs/context/07`).
- **Regla ASaaS:** nunca SOW/retainer sin **loaded cost + margen proyectado** (economía unitaria por cliente).

## Del número a la decisión
Cada métrica debe **habilitar una decisión GTM**:
- ¿Escalar el canal/motion? → solo si Magic Number > 1 y CAC payback sano.
- ¿Dónde invertir? → donde LTV:CAC y velocity son mejores (por segmento/canal/motion).
- ¿Adquirir o retener? → si NRR bajo, retén antes de adquirir.

## Honestidad de datos
- Si no puedes **medir** (sin tag/atribución/CRM), decláralo y marca el número como estimado. Atribución runtime → `gtm-ga4`/HubSpot.
- **Influenced, no claimed:** el GTM "influye" pipeline; rara vez lo "cierra" solo. Reporta con honestidad (ties `research-benchmark` `05`/`08`).

## Checklist de salida
- [ ] Métrica de marketing = **pipeline contribution**, no MQL/leads.
- [ ] Set de economía GTM (LTV:CAC, CAC payback, NRR, magic number, coverage) leído **en conjunto**.
- [ ] Traducción al modelo agencia/ASaaS (retainer/loaded cost/expansión/ICO).
- [ ] Cada métrica **habilita una decisión** (escalar/invertir/retener).
- [ ] Atribución runtime asignada a `gtm-ga4`/HubSpot; márgenes a `finance`.
- [ ] Honestidad: estimados marcados; influenced ≠ claimed.

## Cross-links
- Motion/canal que se mide → `04`; funnel/bow-tie → `05`; operating model/cadencia → `08`.
- Runtime medición → `greenhouse-gtm-ga4-operator` + HubSpot; márgenes/loaded cost → `greenhouse-finance-accounting-operator`; retención/loops → `growth-marketing-cro`; ICO/doctrina → `commercial-expert` + `docs/context/07`.
- Artefacto → `templates/gtm-metrics-dashboard.md`.
