# Audits

Indice de auditorias tecnicas y operativas versionadas dentro de `docs/`.

## Regla de uso

- Las auditorias de esta carpeta deben consumirse frecuentemente como contexto operativo cuando un trabajo toca el sistema auditado.
- Ninguna auditoria debe asumirse vigente automaticamente solo por existir:
  - siempre verificar si el codigo, la arquitectura y el runtime actual siguen reflejando sus hallazgos
  - si el sistema cambio de forma material o la conclusion ya no es confiable, abrir una auditoria nueva o un refresh versionado
- Una auditoria documenta el estado observado en una fecha; no reemplaza specs, tasks, issues ni runbooks.

## Categorias

- [ANAM Customer Agent QA — 2026-07-16](ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
- [ANAM RevOps diagnosis and change-set QA — 2026-07-16](ANAM_REVOPS_CHANGE_SET_QA_2026-07-16.md)
- [ANAM execution countries property QA — 2026-07-17](ANAM_EXECUTION_COUNTRIES_PROPERTY_QA_2026-07-17.md)
- [ANAM commercial pipeline governance QA — 2026-07-17](ANAM_COMMERCIAL_PIPELINE_GOVERNANCE_QA_2026-07-17.md)
- [TASK-1454 Globe identity bridge QA — 2026-07-19](platform/TASK-1454_GLOBE_IDENTITY_BRIDGE_QA_2026-07-19.md)
- [TASK-1455 Globe brand shell QA — 2026-07-19](platform/TASK-1455_GLOBE_BRAND_SHELL_QA_2026-07-19.md)
- [Higgsfield y Magnific — auditoría de UI y workflow — 2026-08-04](competitive-ui/COMPETITIVE_UI_AUDIT_HIGGSFIELD_MAGNIFIC_2026-08-04.md)
- [Globe frente a Higgsfield y Magnific — benchmark comparativo — 2026-08-05](competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md)
- [Hiring — quality assurance de selección y capacidad — 2026-07-30](hiring/GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30.md)
- [Hiring — estado real del dominio vs. su contabilidad documental — 2026-08-26](hiring/GREENHOUSE_HIRING_DOMAIN_STATE_AUDIT_2026-08-26.md) — el dominio está más avanzado que sus docs; la cuenta de commits no mide despliegue (squash); un flag ON en prod hace 41 días dado por OFF
- [Hiring — vocabulario de etapas del pipeline — 2026-08-22](hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md) — 30 hallazgos, verificación adversarial completa; 17 particiones del mismo enum; el enum no tiene ADR
- [Berel — diagnóstico SEO de cliente — 2026-08-25](seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md) — tráfico ~90% de marca; un activo editorial sostiene 14 keywords no-marca en top 3; 10 defectos de arquitectura, el techo lo fija que el sitio no permite encontrar sus 115 artículos; el carril de striking distance ya es operable en `/admin/growth/seo/keywords` y nadie lo había corrido para la cuenta
- [Berel — Color del Año 2027 — research, ángulo y plan de lanzamiento — 2026-08-25](seo/BEREL_COLOR_DEL_ANO_2027_2026-08-25.md) — la pieza-hito anual del mismo cliente; el competidor más peligroso era una pieza propia y la tesis la pre-emptó una agencia de tendencias; la categoría en México está vacía de contenido, Berel no tiene un solo enlace editorial ni una nota de prensa mexicana fechada de su hito anual, y la URL destino ya devuelve HTTP 200 vacío. Documento que caduca por diseño
- [Berel — arquitectura de autoridad del blog y plan editorial de octubre — 2026-08-25](seo/BEREL_ARQUITECTURA_AUTORIDAD_2026-08-25.md) — el corpus del mismo cliente no está conectado: 0,38 enlaces editoriales por artículo y 86% de las piezas sin entrante; el conteo bruto mentía porque un destino está cableado en 113 de 113 páginas — y ese destino es la ficha del color del año, que tiene cero entrantes y cero salientes editoriales. Incluye el hueco de vocabulario medido, el léxico propietario del catálogo, el estado real de los slots de octubre, los entregables y un riesgo de claim de salud en una página ya publicada

- [Design Tokens](design-tokens/README.md)
- [Cloud Cost](cloud-cost/README.md)
- [Client Lifecycle](client-lifecycle/README.md)
- [Commercial](commercial/README.md)
- [Finance](finance/README.md)
- [ICO](ico/README.md)
- [Notion](notion/README.md)
- [Payroll](payroll/README.md)
- [Public Site](public-site/README.md)
- [SEO](seo/README.md)
- [Reliability](reliability/README.md)
- [Sentry](sentry/README.md)
