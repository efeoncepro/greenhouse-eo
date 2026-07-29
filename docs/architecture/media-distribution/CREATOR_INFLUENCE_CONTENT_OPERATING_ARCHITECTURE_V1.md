# Creator Influence & Content — Arquitectura operativa V1

> **Tipo:** contrato operativo no-runtime
> **Estado:** `Approved for validation`
> **Actualizado:** 2026-07-29

Este documento define la arquitectura del workflow y de la evidencia para Creator Influence & Content. No crea un
runtime, API, schema, MCP ni integración con Favikon. Las plataformas externas son providers sujetos a sustitución y
verificación.

## 1. Source of truth

El SOW aprobado es la fuente contractual de alcance, mercados, creadores, entregables, fechas y derechos. El registro
operativo de la campaña debe conservar como mínimo:

- brief aprobado y versión;
- creator record y plataforma de origen;
- evidencia de audiencia/engagement y fecha de consulta;
- vetting score y flags de riesgo;
- contacto, manager y estado de disponibilidad;
- fee, pass-through y términos negociados;
- contrato, derechos, disclosure y aprobaciones;
- entregables, URLs, screenshots y métricas nativas;
- reporte, aprendizajes y recomendación.

No se guarda información sensible del creador más allá de lo necesario para contratar y operar.

## 2. Estados del workflow

```text
candidate → researched → vetted → shortlisted → contacted → negotiating
→ contracted → briefed → producing → approval_pending → published/delivered
→ measured → renewed | closed | rejected
```

Estados de bloqueo: `missing_brief`, `insufficient_evidence`, `rights_unresolved`, `approval_overdue`,
`creator_unavailable`, `compliance_hold` y `scope_change_required`.

No se marca `contracted` sin derechos y compensación documentados. No se marca `published` sin disclosure y aprobación
cuando corresponda. No se marca `renewed` sin evidencia del ciclo anterior.

## 3. Modelo de creator record

Campos mínimos: identidad pública/handle, país y mercado de audiencia, plataformas, categoría, audiencia relevante,
engagement real, calidad de comentarios, colaboraciones visibles, contenido reciente, riesgos, contactabilidad,
disponibilidad, fee estimado, derechos ofrecidos, score, fecha de revisión, fuente y owner.

El follower count es un dato contextual, no el criterio de decisión. La recomendación debe explicar fit, calidad,
operabilidad y riesgo.

## 4. Gating

| Gate | Evidencia obligatoria |
|---|---|
| Brief | objetivo, audiencia, plataforma, mensaje, CTA, claims y restricciones |
| Vetting | fuentes, audiencia, engagement, contenido, riesgo y score |
| Negociación | disponibilidad, fee, entregables, derechos y exclusividad |
| Contrato | uso orgánico/paid, territorio, duración, disclosure y aprobación |
| Producción | brief, assets, formato, checklist técnico y versión |
| Publicación | aprobación, URL, disclosure y fecha |
| Medición | datos nativos, UTMs/códigos/links si existen, período y denominador |
| Renovación | aprendizaje, economics, riesgo y decisión del buyer |

## 5. Herramientas y providers

Favikon puede utilizarse para discovery, analítica, colaboraciones previas, outreach y reporting si el plan contratado
lo permite. No se asume que tiene MCP ni se diseña el workflow alrededor de una integración no verificada. La evidencia
de plataforma debe complementarse con contenido reciente, datos nativos y revisión humana.

El registro debe ser portable: exportar shortlist, scores, fuentes, contactos, contratos, derechos y resultados a un
formato controlado por Efeonce. Si un provider falla, el workflow degrada a investigación manual y evidencia nativa;
nunca inventa métricas.

## 6. Boundaries

- `social-media-studio` gobierna craft social, creator/UGC, whitelisting y analítica nativa.
- `digital-marketing` gobierna media mix, paid estructurado, presupuesto y pacing.
- `growth-marketing-cro` gobierna conversión, tracking, atribución y experimentación.
- `creative-practice`/Creative Services gobierna concepto, producción y edición cuando sea su alcance.
- Legal/IP gobierna derechos, privacidad, disclosure, claims y liability.
- Finance gobierna costos, margen, cash, pass-through y reconocimiento.

No se crea una base de datos propia, automatización de contacto o integración externa sin un contrato técnico y un
owner aprobado.
