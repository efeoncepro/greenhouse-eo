# Plantilla — Plan SEO/AEO de campaña (borrador IA)

Reglas de llenado:

- Cada cifra lleva **lente, fuente y fecha**: `[● get_seo_keyword_opportunities, captura 2026-09-20]`,
  `[◑ get_seo_keyword_market_data, captura mensual 2026-09, etv improved_layout_clickstream_v2]`.
- Lo ausente se escribe `no registrado` / `sin dato`; nunca 0.
- Las secciones marcadas **INTERNO** se eliminan completas si el entregable es para el cliente.
- Español neutro latinoamericano, sin voseo.

```markdown
# Plan SEO/AEO · <CMP-### o «sin id (borrador)»> · <nombre>

> **Estado:** borrador IA — no aprobado · **Versión:** <AAAA-MM-DD>-v<N> · **Organización:** <org-…>
> **Audiencia del documento:** interno | cliente · **Epic:** EPIC-049 · **Skill:** efeonce-agent-seo-aeo
> **A nombre de:** <persona que invocó>

## 0. Procedencia
| Campo | Valor |
|---|---|
| Modelo | <modelo exacto> |
| Fecha y hora | <…> |
| Entitlement | <hasModule, presupuesto restante, fecha> |
| Tools leídas | <tool → captura/fecha> |
| Plan de campaña de origen | <PLAN-IA-… o «inline, <fecha>»> |

## 1. Resumen (5 líneas)

## 2. URLs destino
| URL | Rol en la campaña (persona · etapa) | Visibilidad actual (lente, fecha) | Bloqueos técnicos (auditoría, fecha) |
|---|---|---|---|

## 3. Keywords y temas objetivo
| Keyword / tema | URL destino | Persona · etapa | Origen (cola / oportunidad / discovery / gap) | Cifra que la justifica (lente, fecha) | Estado (seguida / candidata) |
|---|---|---|---|---|---|
Orden: el de `get_seo_work_queue`.

## 4. Preguntas objetivo para respuestas de IA
| Pregunta | Persona · etapa | Motor(es) | Citabilidad actual (visibility 360, fecha) | Borrador AEO existente | URL que debería citarse |
|---|---|---|---|---|---|

## 5. Contenido de soporte (→ content-marketing-studio)
| Pieza | Keyword/pregunta que atiende | Formato | Owner | Fecha |
|---|---|---|---|---|

## 6. Acciones técnicas (→ seo-aeo)
| Acción | URL | Hallazgo de origen (fecha) | Prioridad (de la cola) |
|---|---|---|---|

## 7. Snapshot de planificación
| Sujeto SV360 | Métrica | Valor | Lente | Fecha de captura | Lane | Versión de metodología |
|---|---|---|---|---|---|---|
Este snapshot justifica las metas; el seguimiento se lee en vivo y nunca lo reemplaza.

## 8. Metas
| Métrica | Meta o `dimensionamiento` | Quién la fijó | Ventana | Fuente de medición |
|---|---|---|---|---|

## 9. Competencia — INTERNO
Brecha, top del SERP, candidatos a competidor. Nunca en el documento para el cliente.

## 10. Propuestas de gasto — T2, no ejecutadas
| Tool | Lista exacta | Costo estimado (fuente) | Presupuesto restante | Motivo |
|---|---|---|---|---|

## 11. Solapamiento con búsqueda pagada (→ efeonce-agent-media-planner)

## 12. Seguimiento posterior al lanzamiento
Cadencia · tools (`get_seo_rank_evolution`, `get_seo_url_visibility`, `get_seo_performance`,
`get_seo_visibility_360`) · qué se compara contra el snapshot · regla de versión de `etv`.

## 13. Decisiones para ti (checklist)
- [ ] Aprobar el plan SEO/AEO (persona).
- [ ] Confirmar o descartar cada propuesta de gasto, lista por lista.
- [ ] Definir si hay versión para el cliente (sin §9 ni §10).
- [ ] <otras>
```
