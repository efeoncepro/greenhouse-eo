# Plantilla — Plan de medios (borrador IA)

Reglas de llenado:

- Cada número lleva **fuente y fecha** (`[fuente: studio.campaign.media_plan.get, 2026-09-26]`,
  `[fuente: ads_insights_industry_benchmark, cuenta act_…, ventana 2026-06/2026-08, leído 2026-09-26 · dimensionamiento]`).
- Lo ausente se escribe **`no registrado`** (`null` en tablas que vayan a convertirse en datos). Nunca 0.
- `proposed`, `approved` y `actual` van en **columnas separadas**; los totales se calculan sólo dentro de una misma
  naturaleza y moneda.
- Español neutro latinoamericano, sin voseo.

```markdown
# Plan de medios · <CMP-### o «sin id (borrador)»> · <nombre>

> **Estado:** borrador IA — no aprobado · **Versión:** <AAAA-MM-DD>-v<N> · **Organización:** <org-…>
> **Epic:** EPIC-049 · **Skill:** efeonce-agent-media-planner · **A nombre de:** <persona que invocó>

## 0. Procedencia
| Campo | Valor |
|---|---|
| Modelo | <modelo exacto> |
| Fecha y hora | <AAAA-MM-DD HH:MM zona> |
| Plan de campaña de origen | <PLAN-IA-… o «inline, <fecha>»> |
| Lecturas de Studio | <tool → revision/fecha> |
| Benchmarks | <tool, cuenta, ventana, fecha> o `ninguno` |
| Fuentes documentales | <brief, CDR, manifiesto con fecha> |

## 1. Resumen (5 líneas)
Qué se propone, con qué presupuesto (o `no registrado`), en qué ventana y qué decide la persona.

## 2. Estado leído de la campaña
| Estado | Valor | Nota |
|---|---|---|
| Creativo | | |
| Autorización de medios | | <nota si `blocked`> |
| Lanzamiento | | sólo `live_observed` prueba que corre |

Líneas existentes (tal como se leyeron):
| Canal | Período | `proposed` | `approved` (referencia) | `actual` (readback) | Moneda |
|---|---|---|---|---|---|

## 3. Canales y rol
| Canal (clave canónica) | Tipo | Etapa / rol | Celda de la matriz que atiende | Racional | Estado de la cuenta |
|---|---|---|---|---|---|

## 4. Audiencias de plataforma
| Referencia ICP (segmento · persona · etapa) | Canal | Definición en sintaxis de plataforma | Exclusiones | Temperatura | Tamaño (fuente, fecha) o `no registrado` | Estado |
|---|---|---|---|---|---|---|
Estado ∈ `candidata` · `verificada` · `pendiente de referencia ICP`.

## 5. Flights
| Flight | Modelo | Desde | Hasta | Mercados | Moneda | Periodicidad | Choques de calendario |
|---|---|---|---|---|---|---|---|

## 6. Reparto propuesto (`proposed`)
| Canal | Etapa | Mes (`YYYY-MM`) | Monto o % | Moneda | Racional / hipótesis | Mínimo viable (fuente) |
|---|---|---|---|---|---|---|
Total `proposed` por moneda: <…>. Reserva (canal nulo): <…>.

## 7. Objetivo y puja por plataforma
| Canal | Objetivo de plataforma | Señal de conversión (verificada/no) | Estrategia de puja | Meta de puja (fuente) o «se fija tras el mes 1» |
|---|---|---|---|---|

## 8. Pacing y reglas de decisión
Ritmo · cadencia de revisión · criterio de escalar · criterio de cortar · guardrail · tope de frecuencia.

## 9. Medición
UTM (convención registrada; conflictos como decisión) · eventos (`gh_form_submitted` = intento) · conversión
calificada (quién la fijó) · readback de `actual` · deduplicación en CRM · puente UTM → contacto → deal.

## 10. Benchmarks usados
| Cifra | Fuente | Cuenta / muestra | Ventana | Fecha | Uso (`dimensionamiento`) |
|---|---|---|---|---|---|

## 11. Riesgos y supuestos
| Riesgo | Impacto | Mitigación | Dueño |
|---|---|---|---|

## 12. Decisiones para ti (checklist)
- [ ] Aprobar o ajustar el reparto `proposed` (T2 · persona).
- [ ] Autorizar medios (T2 · persona).
- [ ] Conectar/confirmar cuentas publicitarias y su moneda/zona horaria (T2 · persona).
- [ ] Conversión calificada (la fija quien opera el pipeline).
- [ ] Canales fuera de la lista canónica (CDR).
- [ ] <otras>

## 13. Handoffs
Copys → `copywriting` · QA creativo → `efeonce-advertising-creative` · medición → `growth-marketing-cro` ·
solapamiento búsqueda pagada/orgánica → `efeonce-agent-seo-aeo`.

## 14. Cuando existan las escrituras
Qué de este plan entraría como T1 (flights, líneas `proposed`, audiencias, anuncios) y qué queda como T2 propuesto.
```
