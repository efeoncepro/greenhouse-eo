# Prospección B2B — actualización de cobertura del buying group

Fecha: 2026-10-11. Owner: Commercial / Julio.
Autorización: el operador pidió «Ok actualicemos la skill con esto» tras revisar la
[investigación de cobertura](2026-10-11-buying-group-coverage-research.md).
Estado: método actualizado y evaluación offline de 22 escenarios aceptada; verificación mecánica completada.
Canon: [delta aceptado](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md#delta-aceptado-2026-10-11--cobertura-del-buying-group).

## Comportamiento implementado

- Objetivo + 2–3 adicionales como base inicial de búsqueda; ampliar por roles, decisiones y riesgos de la
  oportunidad/fase. La cantidad no prueba que el buying group esté completo.
- Mapa por necesidad/decisión, aun sin Deal; personas únicas y funciones separadas. Comité formal con
  evidencia, externos como puentes o influencers según participación demostrada.
- Identidad/empleo, participación, autoridad, correo, acceso e interacción separados. Un rol crítico sin
  email permanece en investigación; no se crea Contact/Lead vacío ni se sustituye por un colega irrelevante.
- Suficiencia para el siguiente paso, brechas con riesgo/owner/ruta/validación; no exigir champion confirmado
  ni todo el comité para una primera conversación pertinente. Reabrir ante cambios de alcance/sponsor/proceso.
- Ampliación acotada por presupuesto/permiso, coordinación por cuenta, y taxonomía de Customer Model.
  Legal/IT/Compras no se etiquetan como blockers sólo por cargo.

## Sincronización

Entry point, referencia de buying group, plantillas, métricas, fuentes y fixtures/rúbrica en ambos espejos;
Commercial y HubSpot companions; ADR, canon CRM, documentación funcional/manuales, índice y continuidad.
El contexto ICP y plan outbound apuntan al método vigente sin modificar gate económico, metas, cadencias
o estado propuesto del plan. Su conteo original de integrantes permanece como antecedente de planificación.

Adapter personal `hubspot-saas-prospecting`: sólo SKILL y playbook de servicio sincronizados; historial,
datos privados, HSP, scheduler y configuración de automatizaciones conservados. Es una actualización local
fuera del Git del repo, no una instalación remota.

## Evaluación offline

Fixtures v2: 12 casos previos conservados + 10 nuevos. Evaluador independiente recibe sólo skill/referencias
y hechos, sin rúbrica ni auditorías previas; sólo lectura local, sin herramientas externas o mutaciones.
El subagente `buying_group_update_eval`, sin historial heredado, leyó skill, referencias y hechos; devolvió
decisiones, brechas y borradores. El principal contrastó las 22 respuestas con la rúbrica: sin fallos críticos.
Los 12 casos anteriores mantienen admisión, identidad, atribución, ICP, HOLD, proceso y límites de permisos.

| Caso nuevo | Decisión observada | Resultado |
| --- | --- | --- |
| P13 | Cuatro personas RevOps no resuelven Finanzas/Seguridad/Compras; ampliar por funciones, no declarar aprobación | Pasa |
| P14 | Doce correos del mismo equipo no prueban grupo completo; validar autoridad y aplicabilidad de otras funciones | Pasa |
| P15 | Una persona con cuatro funciones sigue siendo una; mantener roles probados, buscar adicionales sin inflar conteo | Pasa |
| P16 | Partner puente con introducción pendiente; no comprador ni reemplazo de Finanzas | Pasa |
| P17 | Mapas por iniciativa y personas compartidas; champion CRM no se hereda a creatividad | Pasa |
| P18 | CFO confirmado permanece en investigación sin email; sólo elegibles en changeset y acceso vía sponsor pendiente | Pasa |
| P19 | Presupuesto agotado detiene gasto, no fuerza completitud; brecha Legal con ruta y siguiente paso propuesto | Pasa |
| P20 | Apertura fría viable sin champion/comité completo; roles/demanda pendientes y cero comunicación ejecutada | Pasa |
| P21 | Cambio de sponsor/alcance/país/datos reabre mapa; empleo/email no revalidan autoridad en expansión | Pasa |
| P22 | Canal oficial y anexo requeridos; Legal no se etiqueta blocker por cargo ni se rodea Compras | Pasa |

El evaluador encontró una frase ambigua heredada en buying-group-and-access sobre la demanda del objetivo.
Se aclaró su atribución al autor y que no se transfiere a adyacentes, se sincronizó el espejo y se repitieron
P01/P17; ambas decisiones se mantuvieron y la ambigüedad quedó resuelta. El gate económico conserva la
discrepancia previamente declarada con el plan propuesto, fuera del alcance de esta aprobación de método.
No se afirma eficacia comercial, entregabilidad ni ejecución live.

## Verificación y límites

- Frontmatter: entry points Codex/Claude y adapter personal válidos con `quick_validate.py`.
- `pnpm skills:mirrors`: espejos registrados idénticos; companions HubSpot comparados por bytes.
- Fixtures v2: 22 IDs únicos y los 12 casos anteriores preservados exactamente; sólo identidades sintéticas.
- Enlaces locales/whitespace y `git diff --check` del alcance válidos.
- `pnpm claude-md check`: budget y auditoría de no pérdida pasan, sin huérfanos.
- Cierre documental estricto del alcance y `pnpm docs:context-check:strict`: sin warnings/errores en pasada final.
  El pointer de project_context se actualizó a prospección por roles dentro de su presupuesto.

El alcance es método y documentación;
no hubo cambios CRM, créditos, comunicaciones, beta HubSpot, schema, precio o scheduler. No hay nuevo commit
ni push por esta actualización. Las fuentes conservan corte y límites de la investigación del mismo día.
