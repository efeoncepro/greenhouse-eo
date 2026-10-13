# Prospección B2B — incorporación de ABM / ABS

Fecha: 2026-10-11. Owner: Commercial / Julio.
Autorización: «actualicemos la skill con todo eso y luego commit» tras revisar la
[investigación](2026-10-11-abm-abs-research.md).
Estado: método implementado y verificado; siete decisiones evaluadas offline sin fallos críticos.
Canon: [delta aceptado](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md#delta-aceptado-2026-10-11--abm-y-abs).

## Alcance implementado

- Módulo [ABM / ABS](../../../.codex/skills/efeonce-b2b-prospecting/references/abm-and-abs.md)
  cargado por demanda: selección de cuenta, mapas por iniciativa, inversión/intensidad/purpose distintos de
  ICP/relación, coordinación Digital Marketing/Commercial, contenido/proof y consenso.
- Business case y plan bilateral según fase; apertura no exige comité completo. Cobertura objetivo + base
  de 2–3 adicionales ampliable; sin nuevos Contact/Lead de prospección sin correo individual verificado.
- Capacidad, costo total/caja incremental, herramientas existentes, seguimiento tras la ventana, margen
  del trabajo propio y medición con cohortes/denominador. Atribución distinta de causalidad; sin uplift importado.
- Uso interno en clientes que venden B2C separado de una posible oferta ABM cliente con mercado B2B.
  No cambia ICP, precio, schema, lifecycle, presupuesto o estado del piloto/outbound.
- Entrada y sinergias, plantillas, referencias, fuentes y fixtures/rúbrica sincronizados Codex/Claude.
  Commercial es companion de routing deliberado, no espejo byte-identical entre entrypoints.
- ADR, índice, modelo funcional, manual y continuidad sincronizados. Las correcciones previas del buying
  group se incorporan al mismo commit; cambios de licitaciones/pricing/render y otros alcances se preservan.

## Evaluación offline

Fixtures v3: 26 casos, preservados los 22 anteriores y añadidos P23–P26. Evaluador independiente sin
historial recibió skill/referencias y datos sintéticos, sin rúbrica/auditorías; sólo lectura local.
Casos nuevos: iniciativas y B2C/B2B, consenso con cobertura parcial, 1:many/economía/benchmarks,
capacidad/continuidad y representación CRM. Regresión P13/P17/P20 de buying group.
El subagente `abm_skill_forward_check`, sin historial heredado, devolvió decisiones y unknowns; el principal
contrastó los siete casos contra hechos/rúbrica. Sin fallos críticos ni modificaciones externas.

| Caso | Decisión observada | Resultado |
| --- | --- | --- |
| P23 | Delta 1:1 candidata sin inversión aprobada; mapas CRM/creativo separados; B2C cliente compatible con uso interno, Prisma fit pendiente | Pasa |
| P24 | Doce correos no cubren autoridad; proof compartible para resolver incompatibilidades; sin cierre prometido ni MAP acordado ficticio | Pasa |
| P25 | 1:many plausible condicionado a capacidad; 12 horas/60 cuentas no prueban suficiencia, sin ROI 367% importado; costo/cohortes separados | Pasa |
| P26 | Plazas de seguimiento reducen nuevas entradas; olas adaptadas sin abandonar, capacidad/tarifas pendientes y contexto por iniciativa fuera de tier ICP | Pasa |
| P13 | Cuatro personas no cubren Finanzas/Seguridad/Compras; brechas y validación, sin aprobación inventada | Pasa |
| P17 | Ana no hereda champion/autoridad entre CRM y creatividad; personas reutilizables, mapas distintos | Pasa |
| P20 | Borrador frío pertinente sin comité completo/champion; roles/demanda pendientes, cero envío/Deal | Pasa |

Los 22 casos anteriores mantienen su evaluación previa en la [auditoría buying group](2026-10-11-buying-group-skill-update.md);
se repitieron sólo las regresiones pertinentes. No se declara una nueva corrida conductual de los 26.
Mejora futura sugerida por el evaluador: ejemplo de capacidad simultánea/continuidad y plantilla económica
con unknowns. El método actual ya exige ambas decisiones; no son defectos bloqueantes.

## Verificación y estado

Frontmatter Codex/Claude válido con `quick_validate.py`; `pnpm skills:mirrors` aprobado. Enlaces locales,
whitespace y `git diff --check` del alcance aprobados; fixtures v3 válidos con 26 IDs únicos y casos HEAD
preservados. Cierre documental estricto del alcance sin warnings; `pnpm docs:context-check:strict` sin
errores/warnings. Esta evaluación no acredita efectividad comercial ni funcionamiento live.
Ningún piloto, gasto, escritura SaaS, envío, licencia o automatización ejecutados por esta actualización.
Commit local al concluir verificación; push no solicitado.
