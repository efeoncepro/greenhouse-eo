# 11 · Arquitectura HubSpot + Bow-tie

> Greenhouse sincroniza con HubSpot (portal `48713323`) vía Account 360. Este archivo da los **nombres internos exactos** de stages, pipelines y properties — porque para un agente eso es esquema real que debe mapearse, no contexto narrativo. Fuente de verdad: Arquitectura de Pipelines HubSpot v1.0 + Arquitectura Bow-tie v1.1.

## Estado del portal (abril 2026, punto de partida)

- **3.215 contactos** · 95,1% en Lifecycle "Lead", solo 2,6% SQL.
- **1.952 empresas** · 68,6% en "SQL" → incongruencia con el funnel de contactos.
- El post-venta es **invisible** en el CRM y la retención se gestiona "de memoria". No hay NRR/GRR medido.

> Implicación: Greenhouse es, en parte, el sistema que hace visible el post-venta que el CRM no modela bien. Account 360 + el lifecycle de empresas son la pieza que ordena esto.

---

## Pipelines de deals (3)

| Pipeline | Qué contiene | % pipeline | Forecast |
|---|---|---|---|
| **New Business** | Todo deal que no venga de cuenta activa (Cold Strategic, Inbound, Referidos no-cliente, Licitaciones) | ~30% | Core = base; Strategic Bets = upside; Opportunistic fuera |
| **Expansion** | Todo deal de cuenta activa (cross-sell, upsell, renovación con expansión) | ~70% | **Forecast base. Prioridad máxima.** |
| **HubSpot Shared Selling** | Deal registrations co-vendidos con Simón Suárez (HubSpot PDM). Ya existe, no se modifica. | Variable | Fuera de forecast propio |

**Por qué así:** separar por *unidad de negocio* rompería la historia del cross-sell (70% del crecimiento); separar por *modalidad de venta* obligaría a migrar deals de pipeline cuando cambia la relación (la modalidad va como property, no como pipeline); un pipeline único mezclaría ciclos/win rates (Expansion <30 días, ~50%+; New Business 42+ días, 20–40%) y rompería el forecast.

### New Business — 7 etapas (cada etapa = compromiso del comprador, no actividad del vendedor)

| # | Etapa | Prob. | Criterio de entrada |
|---|---|---|---|
| 1 | Discovery agendado | 10% | Reunión confirmada en calendario (no "prometida") |
| 2 | Scorecard aprobado | 25% | Pasó 4+/6. Decisor identificado. |
| 3 | Brief alineado | 40% | Cliente aprobó alcance, timeline y presupuesto tentativo por escrito |
| 4 | Propuesta enviada | 60% | Propuesta formal con precio entregada al decisor |
| 5 | Negociación activa | 80% | Cliente pidió ajustes/condiciones. **No es silencio.** |
| 6 | Cerrado ganado | 100% | Contrato firmado o PO emitida |
| 7 | Cerrado perdido | 0% | Cliente dijo no / eligió competidor / canceló |

> Las probabilidades son conservadoras a propósito (Réditos estaba en 75% y se perdió). Se recalibran con data histórica post-Q3 2026. **Expansion** usa 5 etapas más cortas (ciclo <30 días).

### Properties custom de deals (7)

| Property | Tipo | Valores / uso |
|---|---|---|
| `pipeline_bucket` | Single select | Core Pipeline / Strategic Bets / Opportunistic |
| `gate_status` | Single select | No evaluado / Gate OK / Gate Fail |
| `prospect_source` | Single select | Referido / Cold Strategic / Inbound / HubSpot Partner / Expansión de cuenta |
| `scorecard_result` | Number (1–6) | Criterios del scorecard BDR. **Mínimo 4 para crear deal.** |
| `modalidad_venta` | Single select (ya existe) | Licitación privada / pública / Compra ágil / Trato directo / Partnership |
| `aeo_check_result` | Single select | Aparece / No aparece / Info desactualizada / No verificado |
| `bucket_reason` | Texto | Por qué se clasificó en ese bucket (trazabilidad) |

Regla de arranque: `prospect_source` define el `pipeline_bucket` inicial (Expansión/Referido/Partner → Core; Cold Strategic/Licitación privada → Strategic Bets; Licitación pública → Opportunistic). El scorecard puede recalificarlo.

---

## Bow-tie Efeonce: lifecycle dual asimétrico

Decisión arquitectónica central: **los Lifecycle Stages NO son idénticos en contactos y empresas.** El contrato es con la empresa; las personas actúan dentro de ella. La segmentación post-venta vive en **Company**, no en Contact (mantener 12 stages en contactos crearía "stages zombi").

**Y el motion comercial (expansión/renovación/riesgo) se modela como properties booleanas transversales, NO como stages** — para que el tipo de cliente nunca se pierda. (Sky en crisis de renovación sigue siendo `active_account` con `is_at_risk = true`.)

### Contactos — 7 stages

| # | Stage | Internal name |
|---|---|---|
| 1 | Subscriber | `subscriber` |
| 2 | Lead | `lead` |
| 3 | MQL | `marketingqualifiedlead` |
| 4 | PQL | `pql` *(custom — trial activo en Kortex o Verk)* |
| 5 | SQL | `salesqualifiedlead` |
| 6 | Opportunity | `opportunity` |
| 7 | Customer | `customer` *(genérico, sin segmentación)* |
| — | Other | `other` |

Property única de contacto: **`is_advocate_individual`** (boolean) — advocacy personal distinto del de la empresa (ej.: ejecutivo que da referidos o habla en eventos).

### Empresas — 12 stages

| # | Stage | Internal name |
|---|---|---|
| 1 | Subscriber | `subscriber` |
| 2 | Lead | `lead` |
| 3 | MQL | `marketingqualifiedlead` |
| 4 | PQL | `pql` *(custom)* |
| 5 | SQL | `salesqualifiedlead` |
| 6 | Opportunity | `opportunity` |
| 7 | **Onboarding** | `onboarding` *(custom — 0–90 días post Closed-Won)* |
| 8 | **Active Account** | `active_account` *(custom — enterprise con MSA + SOWs: Sky, ANAM, Grupo Aguas)* |
| 9 | **Self-Serve Customer** | `self_serve_customer` *(custom — solo suscripción SaaS, sin MSA)* |
| 10 | **Project Customer** | `project_customer` *(custom — SOW puntual sin MSA recurrente)* |
| 11 | **Former Customer** | `former_customer` *(custom — sin revenue activo; ruta de win-back)* |
| 12 | Other | `other` |

### Properties motion (booleanas, transversales — en empresa)

`is_in_expansion` · `is_in_renewal` · `is_at_risk` · `is_advocate`
(+ `is_advocate_individual` a nivel contacto)

La empresa además tiene ~13 properties contractuales (`msa_end_date`, `total_mrr`, etc.) que **sincronizan con Greenhouse**.

---

## Medición: NRR como métrica reina

NRR (Net Revenue Retention) es la **métrica reina** del Bow-tie, meta **>110%** (Q3 2026), con 5 métricas de soporte (GRR, Expansion Rate, etc.). Tres dashboards operativos definidos: **Revenue Health · Expansion Engine · At Risk Accounts**.

---

## Qué significa todo esto para Greenhouse

- **Account 360 ↔ Company.** El sync se hace a nivel empresa (`company_id` ↔ `space_id`). Las properties contractuales (`msa_end_date`, `total_mrr`) y de motion (`is_in_expansion`, `is_at_risk`…) son las que el portal debe leer/mostrar.
- **El stage `onboarding` (0–90 días)** es el mismo periodo que la fase 1–2 del journey de experiencia (`10`). Greenhouse soporta ese tramo (Ecosystem Tour, primer Feedback Review).
- **Pulse Dashboard y "At Risk Accounts"** operan sobre las properties motion. Modela `is_at_risk` / `is_in_expansion` como booleanos sobre el stage, **nunca** como un stage que reemplace `active_account`.
- **Los 3 dashboards del Bow-tie** (Revenue Health, Expansion Engine, At Risk) son candidatos naturales a vivir —o reflejarse— en la vista Agency/Pulse de Greenhouse.
- **No inventes stages ni properties.** Usa los internal names de arriba. Si necesitas uno nuevo, pertenece al documento de autoridad (Bow-tie v1.1 / Pipelines v1.0), no a una decisión de implementación.

---

*Fuente: Arquitectura de Pipelines HubSpot Efeonce v1.0 + Arquitectura Bow-tie Efeonce v1.1. Glosario de métricas de negocio (NRR, buckets): `06`.*

*Última verificación de drift contra runtime: 2026-06-09 (TASK-1064) — sin claims de runtime hardcodeados; targets/fechas comerciales son intencionales.*
