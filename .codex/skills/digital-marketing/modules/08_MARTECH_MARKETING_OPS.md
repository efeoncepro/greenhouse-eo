# 08 · Martech & Marketing Ops

> El stack y la operación que hacen posible ejecutar y medir campañas. Aquí vive la **taxonomía
> UTM, el tag management y el reporting por canal**; la **arquitectura de atribución (MMM/
> incrementality/tracking plan) es de `growth-marketing-cro` (07)** — esta es la costura.

## 1. La costura con Growth+CRO (medición)

| Concern | Esta skill (marketing ops) | Hand-off a growth-marketing-cro (07) |
|---|---|---|
| **UTM / campaign taxonomy** | define y gobierna la convención de campañas | consume los eventos en el tracking plan |
| **Tag management** | GTM/píxeles/consent en el sitio y campañas | arquitectura de eventos/data layer canónica |
| **Reporting por canal** | dashboards de performance por canal | modelo de atribución cross-canal (MMM/incrementality) |
| **CDP / first-party** | activación de audiencias para campañas | fuente de verdad / warehouse / tracking plan |

Regla: marketing ops **opera los canales y su reporting**; growth **posee la arquitectura de
medición y la verdad de atribución**. No dupliques el modelo de atribución acá.

## 2. Taxonomía UTM (base del reporting)

- **Convención consistente y documentada** (`templates/utm-campaign-naming-convention.md`):
  `source` (google/linkedin/newsletter), `medium` (cpc/email/social/organic), `campaign`
  (slug estable), `content` (variante), `term` (keyword). Minúsculas, sin espacios, valores
  controlados.
- **Un owner de la taxonomía.** UTM caóticos = reporting sucio e incomparable (`ANTIPATTERNS`).
- Alinea la taxonomía con los `campaign`/eventos que espera el tracking plan de growth.

## 3. Martech stack (consolidación 2026)

- **Realidad:** empresa media 90+ tools; 47% cita complejidad/integración como bloqueo. Menos y
  mejor integrado > más shiny tools.
- **Consolidación + composable:** las suites absorben capacidades (CDP incluido); el stack se
  vuelve **componible/API-first sobre el data warehouse** (reverse ETL, warehouse-native).
- **CDP:** unifica datos de cliente; en 2026 se embebe en las suites/warehouse (Gartner: 80% de
  nuevos deployments componibles hacia 2030). Evalúa CDP embebido vs standalone según tu data
  platform (en Greenhouse: PG + BigQuery, ver overlay).
- **Anclas del stack B2B:** CRM + MAP + ABM orchestration + attribution analytics, integrados.

## 4. First-party data (el activo post-cookie)

- **First-party = ventaja:** +20% LTV / −15% CAC en personalización (reverificar). Post-cookie,
  el dato propio y consentido reemplaza al identificador de terceros.
- **Captura y activación:** forms/lead magnets, zero-party (preferencias), enriquecimiento
  consentido → activar en plataformas de ads (Customer Match/Advantage+, `03`) y en email (`06`).
- **Consent management (Consent Mode v2):** legalidad + preserva señal. Mal implementado, pierdes
  medición y cumplimiento.

## 5. Marketing operations (la disciplina)

- **Governance del stack:** inventario de tools, dueños, costo, solapamientos; auditar y
  consolidar. Integraciones > features aislados.
- **Procesos:** campaign ops (briefing → build → QA → launch → report), calendario, naming,
  templates, roles. La velocidad de ejecución es una ventaja (converge con la de creativos, `05`).
- **Reporting:** dashboards por canal + campaña con UTM; datos que se reconcilian en la fuente de
  verdad (warehouse) — no dos verdades.

## 6. Privacidad y cumplimiento

- Base legal para PII/first-party (GDPR; en Chile **Ley 21.719**, ver overlay). Consentimiento,
  minimización, retención acotada. Privacy-first **es** measurement-first (converge con growth 07).

## Checklist de salida

- [ ] Taxonomía UTM definida, documentada y con owner; alineada al tracking plan de growth.
- [ ] Tag management + consent configurados; sin dos fuentes de verdad.
- [ ] Stack auditado (menos/mejor integrado); CDP/first-party evaluado sobre el data platform.
- [ ] First-party data capturada, consentida y activada en canales.
- [ ] Reporting por canal reconciliado en la fuente de verdad; atribución cedida a growth.

## Cross-links

- UTM alimentan el paid → `03`, email → `06`, campaña → `07`
- Arquitectura de atribución/MMM/incrementality/tracking plan → `growth-marketing-cro` (07)
- Martech real del repo + gaps (no tag-mgmt site-wide, HubSpot=CRM) → `efeonce/CHANNELS_AND_MARTECH_GAPS.md`
- Artefacto → `templates/martech-stack-map.md`, `templates/utm-campaign-naming-convention.md`
