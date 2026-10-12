# SEO/AEO — cierre documental de categoría y representación

Fecha: 2026-10-12. Alcance: criterio estratégico, método operativo y skills; sin cambios de software,
scoring, datos, permisos, precios ni publicación externa. El operador pidió incorporar la conversación
completa y hacer commit. No se inició un programa de cliente ni se verificó eficacia comercial.

## Canon y consumidores

- [Decisión aceptada](../../architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md#architecture-decision-2026-10-12--liderazgo-de-categoria-y-representacion-fiel), indexada.
- [Método operativo](../../operations/SEO_AEO_CATEGORY_LEADERSHIP_OPERATING_MODEL_V1.md),
  [manual](../../manual-de-uso/growth/operar-liderazgo-categoria-seo-aeo.md) y
  [plan de categoría](../../../.codex/skills/seo-aeo/templates/category-leadership-plan.md).
- Skills `seo-aeo`, `seo-aeo-practice`, `efeonce-brand-studio` y `content-marketing-studio`, con espejos.
- Contexto de marca, modelo SV360, índice Wave y preparación de caso de negocio apuntan al método.
- Oferta, prueba, mercado, QBR/retención, mensajes, briefs y antipatrones alineados: resultados observados
  separados de compromisos controlables; correlación no se convierte en garantía de paid o ventas.

## Revisión semántica del método

Revisión de instrucciones y ejemplos escritos, no tests de runtime ni ejecución de agentes sobre un cliente.

| Caso de revisión | Criterio encontrado en el canon/consumidores | Resultado documental |
|---|---|---|
| Pregunta genérica incluye a la marca sin clic | Descubrimiento non-brand; intención separada | Conforme |
| Sitio citado sin nombre de empresa | Fuente y reconocimiento separados | Conforme |
| Marca recomendada desde un tercero | Recomendación no exige cita al dominio propio | Conforme |
| Descripción favorable con capacidad inventada | Error de fidelidad; contrastar/corregir fuentes controlables | Conforme |
| 1.000/1.000 visitas pasan a 1.000/100 | Mayor proporción branded sin crecimiento de demanda de marca | Conforme |
| 60% de presencia en corpus de prueba | No representa cuota real de mercado/usuarios | Conforme |
| Fallo de adquisición de respuesta | No se cuenta como ausencia; cobertura visible | Conforme |
| Corpus ampliado o plataforma/configuración diferente | Versión nueva y comparación sobre corte común | Conforme |
| Cita y venta posteriores | Referencia/outcome observados no prueban causalidad incremental | Conforme |
| Aspiración a liderazgo | Categoría pertinente y pruebas; no garantía o claim alcanzado | Conforme |

## Verificación mecánica

- `pnpm skills:mirrors`: exit 0; registro de skills idéntico.
- Comparación adicional de Markdown completo de las cuatro skills: ambos árboles idénticos, incluida
  Brand Studio, que no forma parte del registro del gate general.
- Revisión de 525 destinos locales Markdown del diff y los nuevos artefactos: ninguno faltante.
- `git diff --check`: exit 0.
- `pnpm docs:closure-check`: exit 0; flags, índices Creative Studio, inventario y frescura pasan. La primera
  pasada general advirtió falta de Handoff/changelog (resuelta aquí) y lifecycle de tasks de otra sesión;
  la revisión final se acota al alcance staged. Avisos de TTL de rutas de modelos son informativos y ajenos.
- `node scripts/check-documentation-closure.mjs --staged --strict`: exit 0, cero warnings sobre 38 paths propios.
- La primera pasada de contexto detectó 53 tokens de exceso en `project_context.md` y 61 entradas
  de changelog. Se acortó el puntero y `pnpm docs:context-rotate --apply` archivó una entrada en
  `docs/changelog/internal/2026-09.md`, sin pérdida de historia. El gate estricto final se ejecuta
  tras la última edición documental, antes del commit.

## Continuidad del checkout compartido

Durante la edición, el commit concurrente `4fa5e6ce40cc31ed76b9f7f7da90c222e82f2326` incorporó
el método/manual/plan y la primera actualización de skills junto con trabajo comercial ajeno. No se
revirtió ni reescribió esa historia. El commit de cierre incorpora únicamente los ajustes/documentos
restantes de este alcance; las tasks V3 de otra sesión se excluyen.

## Fuera de este cierre

No se alteran AGENTS/CLAUDE ni el harness de tasks: sus routers ya cargan las skills dueñas. No cambian
APIs, DTOs, scoring, UI, data models, price policy ni fichas de oferta. La mención de campos de análisis
manual no declara su disponibilidad en el Assessment/Grader. Validación empírica con compradores,
aplicación a una categoría/cuenta y publicación tienen su propio alcance y evidencia.
