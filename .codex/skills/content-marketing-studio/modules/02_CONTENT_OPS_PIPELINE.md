# 02 · Content Ops + Pipeline

El sistema que convierte un calendario en piezas publicadas de forma **repetible**, sin heroísmos ni cuellos de botella. Esto es lo que diferencia un "estudio" de un freelance: un motor con workflow, roles y gobernanza.

## El pipeline canónico (7 estaciones)

Toda pieza recorre el mismo flujo. Cada estación tiene entrada, dueño y criterio de salida.

```
1. BRIEF ....... qué, para quién, por qué, formato, distribución, métrica → templates/content-brief.md
2. DRAFT ....... redacción (craft → copywriting) sobre el brief
3. ASSET ....... visual/motion/audio/imagen IA (brief creativo → studios de asset)
4. REVIEW ...... editorial + brand safety + factcheck + voz (gate de calidad)
5. PUBLISH ..... en el runtime (WordPress/Astro/email/forms — skill dueña)
6. DISTRIBUTE .. owned/earned/paid + átomos (05, 04) — NO opcional
7. MEASURE ..... captura de métricas + aprendizaje (06)
```

**Regla dura:** una pieza no está "lista" en PUBLISH. Está lista cuando DISTRIBUTE y MEASURE tienen plan asignado. Publicar sin distribuir es el antipatrón #1.

## El brief es el contrato (no se produce sin brief)

Nada entra a DRAFT sin brief. El brief evita el desperdicio más caro: producir la pieza equivocada. Mínimo:

- **Objetivo + etapa de funnel + métrica de éxito.**
- **Audiencia + JTBD + nivel de consciencia** (para calibrar el ángulo; el craft lo ejecuta `copywriting`).
- **Pillar/cluster** al que pertenece.
- **Formato + longitud + canal de destino** (`03`).
- **Ángulo / insight propietario** (la barra de originalidad).
- **Assets requeridos** (qué producir y con qué studio).
- **Plan de distribución + átomos** (declarado desde el brief — `04`, `05`).
- **Descubribilidad:** keywords/entidad objetivo (input de `seo-aeo`).

Plantilla: `templates/content-brief.md`.

## Roles (RACI del content engine)

Aun en equipos chicos, los roles existen (una persona puede llevar varios, pero el rol no desaparece):

| Rol | Responsabilidad |
|---|---|
| **Content strategist / editor** | Dueño del calendario, briefs, gate editorial, coherencia con pillars |
| **Writer / creator** | Draft (craft → `copywriting`) |
| **Designer / motion / audio** | Assets (studios de asset) |
| **SEO/AEO** | Descubribilidad/citabilidad (`seo-aeo`) |
| **Distribution owner** | Ejecuta owned/earned/paid + átomos (`05`, `04`, `social-media-studio`) |
| **Analyst** | Cierra el loop de medición (`06`, `gtm-ga4`) |
| **Approver / brand** | Gate de brand safety + voz (doctrina → `efeonce-agency`) |

## Gate de calidad (REVIEW) — qué se chequea

Un checklist de review protege la marca y la barra de originalidad:

- **Insight original presente** (no thin/regurgitado; barra 2026).
- **Voz de marca** aplicada (doctrina `efeonce-agency`; craft `copywriting`).
- **Factcheck** de datos/claims + fuentes citadas (crítico para citabilidad y confianza).
- **Brand safety** (nada que exponga la marca; sensibilidad de cliente/sector).
- **Descubribilidad** aplicada (input de `seo-aeo` incorporado).
- **Distribución + medición** con plan asignado antes de publicar.
- **Accesibilidad** del contenido (alt text, estructura, legibilidad).

## Gobernanza y brand safety

- **Guía editorial + guía de voz** como fuente única (voz Efeonce → `efeonce-agency`; craft → `copywriting`).
- **Aprobaciones** proporcionales al riesgo: un post evergreen no necesita el mismo gate que un statement sensible.
- **IA con gobernanza** (`07`): fidelidad de voz + revisión humana obligatoria; nunca output crudo publicado.
- **Cliente/confidencialidad:** separar contenido público de material bajo NDA; en contenido para clientes, respetar su brand safety.

## SLAs y cadencia de producción

- Define **lead time** por formato (un pillar no se produce en un día; un átomo sí). Planifica hacia atrás desde la fecha de publicación.
- **Newsletter = compromiso de fecha fijo** (la audiencia la espera; fallar la cadencia erosiona confianza).
- **Backlog + WIP limit:** limita piezas en curso simultáneas para no ahogar el gate de calidad. Mejor terminar y distribuir que acumular drafts.
- **Buffer editorial:** mantén 2–4 semanas de contenido listo para no publicar apurado (la prisa mata la calidad y la distribución).

## Herramientas de content ops

- **Calendario/board:** Notion (MCP disponible) como editorial calendar + board del pipeline.
- **Publicación:** runtime dueño (WordPress/Astro/email/forms) — nunca reimplementar.
- **Assets:** studios de asset via brief creativo.
- Si una herramienta no está callable en el entorno, decláralo y entrega el sistema igual (el pipeline es agnóstico de tool).

## Checklist de salida del módulo

- [ ] Cada pieza entra por **brief** (contrato), no por impulso.
- [ ] Pipeline de 7 estaciones con owner + criterio de salida por estación.
- [ ] Roles asignados (aunque una persona lleve varios).
- [ ] Gate de REVIEW con insight/voz/factcheck/brand safety/descubribilidad/distribución.
- [ ] Cadencia con lead times, WIP limit y buffer editorial.
- [ ] DISTRIBUTE + MEASURE con plan **antes** de publicar.

## Cross-links

- Qué producir → `01`; formato → `03`; atomizar → `04`; distribuir → `05`; medir → `06`; IA → `07`.
- Craft → `copywriting`; assets → studios de asset; publicación → runtime; SEO → `seo-aeo`.
- Artefacto → `templates/content-brief.md`.
