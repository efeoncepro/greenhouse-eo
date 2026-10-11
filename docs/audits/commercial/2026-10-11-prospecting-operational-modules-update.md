# Prospección — adapter HubSpot, capacidad, proof y aprendizaje

Fecha: 2026-10-11. Autorización: «Bien, vamos con eso y actualiza las skills», sobre las cuatro propuestas
de la [investigación HubSpot](2026-10-11-hubspot-abm-buying-groups-api-cli.md).
Estado: método y plantillas implementados y verificados en el alcance local.
Canon: [delta aceptado](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md#delta-aceptado-2026-10-11--adapter-econom%C3%ADa-proof-y-aprendizaje).

## Cambio y ownership

- [Adapter HubSpot](../../../.codex/skills/hubspot-as-a-service/references/account-based-prospecting.md)
  con changeset por fila, dictionary/capability fechados, multiselect/concurrencia/readback y mapa por iniciativa.
  Es procedimiento de agentes; no wrapper, schema ni CRUD del gráfico Buying Groups implementados.
- [Capacidad/economía](../../../.codex/skills/efeonce-b2b-prospecting/references/capacity-and-economics.md)
  con plantilla por owner/período, esfuerzo de seguimiento, costo total/caja, unknowns y ejemplo sintético.
  Pricing/Finance conserva tarifas, FX, política de margen y emisión; disponibilidad debe confirmarse.
- [Discovery/proof](../../../.codex/skills/efeonce-b2b-prospecting/references/discovery-and-proof.md)
  con preguntas por oferta y función, prueba mínima, derechos, baseline y criterios; la práctica valida claims.
- [Aprendizaje](../../../.codex/skills/efeonce-b2b-prospecting/references/experiments-and-learning.md)
  con plantilla de outcome por iniciativa, motivo comprador vs hipótesis, vigencia/triggers y restricciones.
  Reutiliza dossier/HSP/seguimiento; no scheduler adicional ni stage actualizado implícitamente.
- Routing Prospecting/Commercial/HubSpot, ABM, handoff, templates, sources, ADR/manual/funcional y continuidad.
  Espejos Prospecting/HubSpot idénticos; Commercial mantiene companion Codex/overlay Claude intencionales.
  Bundle HubSpot incorporado al gate existente después de comprobar que no tiene diferencias legítimas.

## Evaluación de decisiones

Fixtures v4: 30 casos; 26 anteriores conservados íntegros y P27–P30 añadidos. Revisión manual del principal
con datos sintéticos y módulos finales; sin evaluación independiente nueva ni llamadas externas. Rúbrica
contrastada con resultados razonados, no coincidencia literal de headings. No se declara corrida de 30 casos.

| Caso | Decisión contrastada | Estado |
| --- | --- | --- |
| P27 | Target ya true es no-op; mantener tier_2. Adición general END_USER preserva BUDGET_HOLDER/CHAMPION; releer y reconciliar antes de write. Ana sólo usuaria/evaluadora B, champion A no transferido. Sin Deal B, mapa en dossier; Seguridad sin Contact. Metadata/400 no demuestra CRUD; asociación queda preparada, sin cambiar auth o inventar dry-run | Revisado, conforme |
| P28 | Comercial: 20−8−2−4=6 h nuevas, dos cuentas de 3 h. Creativo: 6−3−1=2 h, dos pruebas de 1 h. Plan comercial 10 h × USD 50 = 500; licencia 60×25%=15 sin caja nueva. Subtotal USD 515, creatividad desconocida: no total cerrado. Costo por resultado indefinido con cero; continuidad siguiente ventana pendiente | Revisado, conforme |
| P29 | 1.300 solicitado y piloto 96 no prueban 85% de ahorro. Validar baseline, horario, canales, escalamiento, criterio económico y datos; prueba anonimizada mínima con permiso interno/esfuerzo límite, sin disponibilidad/SLA/ROI ni acuerdo inventado | Revisado, conforme |
| P30 | A pospuesta con HOLD; precio es hipótesis del equipo. B desconocida, opens no progreso. Sponsor/empleo/email necesitan revalidación aunque exista fecha futura de revisión; trigger no permite colegas. Reusar HSP/tarea, no CRM/envío/heartbeat nuevo | Revisado, conforme |
| P17 / P20 / P26 | Regresión de límites: papeles por iniciativa, primera apertura sin comité completo y seguimiento/capacidad condicionados siguen vigentes; nuevo adapter no obliga a Deal ni gráfico, ni a cargar todos los templates | Revisado, conforme |

Revisión proporcional: métodos/plantillas reversibles; no script de CRM nuevo que requiera integración live.
Las comprobaciones mecánicas no prueban comportamiento de un agente independiente ni conversión comercial.

## Verificación y estado

Frontmatter Prospecting/HubSpot Codex/Claude aprobado por `quick_validate.py`; `pnpm skills:mirrors`
aprobado con HubSpot añadido al manifest. Enlaces/referencias/whitespace e integridad fixtures aprobados:
30 IDs únicos, 26 anteriores preservados; aritmética del caso de capacidad verificada. `git diff --check`,
cierre documental estricto del alcance y `pnpm docs:context-check:strict` aprobados sin warnings.
El primer cierre detectó falta de actualización del puntero en project_context; se actualizó sin exceder
su presupuesto y el cierre/contexto volvió a pasar. La comprobación inicial de fixtures asumía un único
campo facts; los cuatro ABM previos usan evidence. Se preservaron ambos formatos y el chequeo corrigió
esa suposición, sin editar los casos anteriores. Ningún cambio SaaS, beta, compra/crédito, precio, envío o scheduler.
El informe técnico previo y su Handoff se incorporan a esta continuidad; el commit ABM anterior permanece
`293d3f4cd`. Commit de este alcance al cerrar verificaciones; push no solicitado.
