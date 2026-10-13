# Prospección B2B — implementación y evaluación de la skill

Fecha: 2026-10-11. Owner: Commercial / Julio. Estado: método implementado y evaluación offline completada; sin activación externa.
Intake: el operador aprobó la [estructura investigada](2026-10-11-prospecting-skill-discovery.md) con «Vamos»
y pidió apoyo de `@Sales`. Canon: [ADR](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

## Entrega y límites

- Núcleo `efeonce-b2b-prospecting`, módulos por fase, dos plantillas y 12 escenarios sintéticos, compartidos
  Codex/Claude. Gate de mirrors registra el bundle completo como byte-identical.
- Routing AGENTS/CLAUDE/manifest y conexiones desde Customer Model, Commercial y HubSpot. Commercial Codex
  es companion del overlay/global, no espejo de un método copiado.
- Adapter personal en `/Users/jreye/.codex/skills/hubspot-saas-prospecting/`: carga núcleo y conserva HSP,
  cobertura, ventanas, historia privada y scheduler. Sólo SKILL.md y playbook de servicio modificados;
  no se leyó/modificó datos personales ni configuración de automatizaciones para esta implementación.
- Capas técnica, funcional y manual enlazadas. No cambia ICP general, tarifas, schema/lifecycle ni autonomía.
  Discrepancia económica y excepciones de ICP se declaran y resuelven por owner, no mediante datos inferidos.

## Apoyo de Sales

Se revisaron el índice, frontmatter de catálogo, `enrich-company-and-contact-data`, instrucciones compartidas y
dependencias del plugin instalado; un subagente examinó además `sales-company-research` y routing por fase.
Snapshot de revisión: Sales `1.1.0-alpha.2`; no se fija esa versión/cache como dependencia del nuevo núcleo.
Aplicación: fuentes por campo/cobertura exacta, authoritative-category ownership, enriquecimiento distinto de
escritura/contacto y bloqueos acotados por fase. Docs/fixtures ya aprobados bastan para crear/evaluar la skill.
No se consultaron APIs ni datos live a causa de esta revisión. Sales queda colaborador opcional.

## Forward-test independiente

Subagente `prospecting_forward_test`, sin historial heredado, recibió SKILL.md y hechos/peticiones sintéticos.
Se prohibió leer rúbrica, discovery o auditorías previas y ejecutar acciones externas. Respondió los 12 casos
con decisiones y borradores; el principal contrastó las respuestas con los criterios de aceptación.

| Caso | Decisión observada | Resultado |
| --- | --- | --- |
| P01 | Autor sin correo permanece investigación; dos colegas elegibles en changeset simulado, sin heredar intención ni prometer regulación CO | Pasa |
| P02 | Lead/tracking no crean relación/demanda; apertura fría de colaboración como hipótesis | Pasa |
| P03 | Valid técnico en empleador anterior no resuelve atribución actual; canal ambiguo detenido | Pasa |
| P04 | Comprador/tamaño sin resolver y buzón compartido no permiten alta; Lead existente se reconcilia | Pasa |
| P05 | Último mandato/v13 domina borrador obsoleto; next step cálido, buyer económico desconocido | Pasa |
| P06 | Cierre vencido, readmisión sin confirmar y canal oficial preservados | Pasa |
| P07 | HOLD gobierna aunque haya Deal y colegas con email; no acelera ni afirma pausa ejecutada | Pasa |
| P08 | Expansión y pedido separados de fee/contrato/start; piloto, volumen y estimados diferenciados | Pasa |
| P09 | Fuera del piso; vacante/recruiter/ingreso estimado no abren oferta | Pasa |
| P10 | Tamaño local/global y ausencia de excepción explícita preservados, sin alta automática | Pasa |
| P11 | Referral pendiente, baja empresarial, OOO, rebote y scanners reciben decisiones diferenciadas | Pasa |
| P12 | Dossiers parciales de dos cuentas; accepted/vacío no prueban resultado o mercado; harness pedida pendiente | Pasa |

El ADR estaba escribiéndose durante la primera lectura del evaluador; éste reportó ruta ausente. Una segunda
lectura focalizada verificó que existe, su ownership y degraded mode, sin cambiar las 12 decisiones. Se explicitó
que una candidata descartada por ICP no exige seguir invirtiendo en adyacentes/preventa y que el bloqueo nativo
de Sales no se reemplaza con broad web/CUA. No se afirma que los fixtures prueben datos/ejecución live o uplift.

## Verificación mecánica y cierre

- `quick_validate.py`: Codex, Claude y companion Commercial válidos; adapter personal validado por separado.
- `pnpm skills:mirrors`: bundle nuevo incluido, todos los espejos registrados idénticos.
- Enlaces locales: 30 Markdown, 108 targets comprobados, sin rutas ausentes ni whitespace; manifest con cinco
  fuentes existentes y 12 IDs de escenario únicos. Verifica rutas de este alcance, no las de todo el repo.
- `node scripts/check-documentation-closure.mjs --strict -- <paths propios>`: sin warnings. Se usa el helper
  focalizado; no se ejecutan auditorías de flags/modelos externos ajenas a esta entrega documental.
- `git diff --check -- <paths propios>`: sin errores; archivos nuevos también revisados por whitespace.
- `pnpm claude-md check`: budget y auditoría de no pérdida pasan. La fila nueva se compactó al sobrepasar el
  techo inicial; la distinción histórica Efeonce/Greenhouse se conservó completa en el módulo de mensaje,
  enlazada al contexto vigente, sin cambiar el allowlist. No se cambió brand/runtime ni fuentes ajenas.
- `pnpm docs:context-check:strict`: 0 errores y 0 warnings en la pasada final; AGENTS ~11.955 tokens,
  project_context ~11.992, Handoff cuatro sesiones y changelog 60 entradas. Se repite tras registrar esta
  evidencia. Ninguna task se mueve ni se declara un despliegue por esta validación.

Limitaciones vigentes: skill personal/adaptación es local a este host; no instalación/distribución remota.
Eficacia, baseline frío propio, deliverability, costos/provider settings y pilotos de comunicación requieren
evidencia real; ningún nuevo piloto está autorizado por esta entrega. Durante la creación y evaluación no
hubo commit, push, CRM, créditos, envíos, enrollment, deploy o cambios de scheduler. El versionado posterior
se registra en Git y no implica publicación ni activación externa.
