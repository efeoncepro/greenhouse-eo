# Operar ANAM HubSpot Managed Service

> **Tipo:** Manual de uso / runbook
> **Versión:** 1.3
> **Actualizado:** 2026-07-17
> **Portal obligatorio:** ANAM `19893546`
> **Funcional:** [`../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md`](../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)
> **Servicios:** [Customer Agent gestionado](../../services/hubspot-as-a-service/hubspot-customer-agent-managed-service.md) · [RevOps, automatización y paneles](../../services/hubspot-as-a-service/hubspot-revops-architecture-automation-and-dashboards.md)

## Antes de empezar

1. Verifica que la cuenta/perfil resuelva a `19893546`; `48713323` es Greenhouse y no se usa para ANAM.
2. Lee handoff, modelo vivo y roadmap. Para decisiones de reuniones, revisa Notion live; lo local es un índice.
3. Clasifica la acción: lectura, schema, records/asociaciones, workflow, publicación o knowledge.
4. Antes de escribir, prepara change set con lote, impacto, aprobación, evidencia y rollback.

## Cadencia operativa

Para priorizar trabajo abierto y comprobar criterios de salida, usa el
[backlog canónico ANAM](../../architecture/kortex/hubspot-as-a-service/anam-open-work-and-exit-gates-2026-07-17.md).
En este manual, **Calidad de Datos (DQ)** siempre significa una cola operativa con denominador, excepción, owner,
acción y cadencia; no un score cosmético ni una atribución automática de culpa.

### Diaria

- Revisa disponibilidad, créditos, conversaciones no resueltas y transferencias de Customer Agent.
- Revisa tareas de `1852406585`: una tarea solicita validar; no vuelve al Service activo ni apto para KPI.
- Atiende excepciones urgentes de Data Quality por owner, corrigiendo en el punto de captura.

### Semanal

1. Abre Data Quality `21144697` y registra denominador, excepciones, owner y avance.
2. Clasifica causa: schema/plataforma, fuente/migración, integración o captura/adopción.
3. Separa Deal sin Company: convergencia explícita = candidata approval-gated; dominio = revisión; duplicidad,
   ambigüedad o inferencia por título/nombre/owner = held.
4. Revisa Growth `19708354`. Segmento/sector/región siguen parciales mientras cobertura sea menor a 95%; país
   de ejecución aún no tiene reporte ni cobertura histórica.
5. Revisa Retención `21152855` y Fidelización `21152950` sólo como pilotos/colas.

### Mensual

- Reconciliar definiciones, cobertura y owners con ANAM y clasificar decisiones, notas y tareas.
- Auditar propiedades, reports, workflows y knowledge contra runtime live.
- Revisar Product/line-item coverage y Deals ganados sin líneas o Company.
- Revisar créditos, handoff y cambios de knowledge.
- Cuando exista billing, ejecutar sólo profiler read-only; no convertir análisis en sync automáticamente.

## Cómo leer los paneles

| Panel | Uso correcto | No concluye |
|---|---|---|
| Data Quality `21144697` | Cola de corrección/adopción por owner. | Que HubSpot está caído o todo gap es culpa humana. |
| Growth `19708354` | Outcome y diagnósticos cubiertos. | Facturación/revenue total o TAM/SAM. |
| Retención `21152855` | QA de portfolio/radar sintético. | GRR/NRR oficial. |
| Fidelización `21152950` | Cola preventiva. | NPS, loyalty score o health. |

El saldo 611 sin Company es aritmético (`645 - 34`); hasta un nuevo readback, 645 es baseline verificado y 611
esperado/calculado.

## Corregir calidad de datos

1. Define denominador y excepción.
2. Confirma punto de captura y owner.
3. Guarda snapshot y manifest aprobado sin regenerarlos.
4. Separa `apply`, `review-only` y `held`.
5. Ejecuta sólo IDs aprobados y reversibles.
6. Lee target ID, cardinalidad y tipo; registra before/after.
7. Mantén visible la cola residual; un slice no convierte cobertura parcial en KPI.

## Revisar Services

- Verifica Company, Deal de origen, línea única, owner, moneda y TCV.
- ARR, periodicidad, fechas y renovación recurrente requieren confirmación humana.
- No confundas frecuencia de cobro con entrega ni uses el workflow de revisión como materializer.
- La creación forward debe ser idempotente por línea y tolerar reintentos/search lag.
- Retira marcas sintéticas o `(PILOTO)` sólo con aprobación ANAM y cobertura real leída de vuelta.

## Registrar geografía de ejecución

1. Abre el Deal y completa `Países de ejecución` con todos los países donde se ejecutará o se ejecutó el negocio.
2. Si incluye Chile, completa además `Región` con una o más regiones chilenas de ejecución.
3. No sustituyas estos campos con `region_de_chile`: esa propiedad pertenece a Company y representa su sede.
4. Completa o ratifica la geografía antes o durante la adjudicación/cierre; no la infieras desde dirección,
   dominio, nombre, notas ni Company para registros históricos.
5. Si un Deal contiene varios países/regiones, consérvalo como un solo Deal. Los cortes por cada selección no
   deben sumarse entre sí como un total consolidado sin deduplicación.

`Países de ejecución` (`ef_paises_de_ejecucion`) está activa y al 2026-07-17 tiene cero Deals poblados. Es
obligatoria al cerrar Growth como ganado o Renovación como renovada; no existe backfill, workflow ni reporte
aditivo por selección.

## Operar los pipelines gobernados

- Crea Growth únicamente en `Potencial 10%`; la precalificación se administra en Lead y `Radar 0%` permanece intacto.
- Crea Renovación únicamente en `Por revisar` y avanza por las nuevas etapas semánticas.
- Completa `Paso siguiente` antes de avanzar por las etapas abiertas que lo exigen.
- En Hot completa además `Monto original`; al ganar completa `Países de ejecución`, `Monto original` y
  `Variación vs. cotizado`. `Región` permanece visible y opcional cuando corresponde a Chile.
- En `Cierre perdido`, `Desestimado`, `No renovado` o `No aplica / Desestimado`, registra el motivo de cierre.
- No actives los workflows heredados que asignan `Venta nueva` por pertenencia al pipeline.
- Las tareas automáticas por futura entrada a etapa aún no están publicadas. Hasta ese slice, el owner ejecuta
  el checklist manual y no debe crear tareas retrospectivas para todo el histórico.

## Monitorear Customer Agent

- Abre el [source pack live](../../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/README.md) y compara inventario, fecha de sincronización y directrices publicadas contra HubSpot.
- Prueba lenguaje natural, memoria multi-turno, exactitud, administración/facturación, reclamos y mixed intent.
- Distingue limitación nativa de transferencia de defecto de configuración.
- Antes de cambiar knowledge, reconcilia el source pack; no lo reconstruyas desde memoria o adjuntos no clasificados.
- Publicación, permisos, acciones y handoff requieren aprobación explícita.
- El readback del 2026-07-17 mostró el agente pausado, uso de créditos `DESACTIVADA`, cuenta vencida y factura `#760627868` vencida desde el 2026-06-07. Dos activaciones confirmadas fallaron en HubSpot. Escala la regularización a un administrador de facturación ANAM; no pagues ni cambies la suscripción con permisos operativos.
- Tras la regularización, activa `Uso de créditos`, exige readback `ACTIVADA`, vuelve al agente, pulsa `Reanudar` si aparece habilitado y verifica que el canal acepte conversaciones nuevas. La presencia del chatflow por sí sola no demuestra disponibilidad.

## Facturación prevista

El primer release es no-write: upload privado, scan, profiling, validación y conciliación. Billing Event conserva
source ID/moneda; Account Unit conserva Código ANAM/CeCo. Sólo matching determinístico propone asociaciones. La
aprobación humana precede cualquier write y el target está ligado a `19893546`.

## Qué no hacer

- No ejecutar bulk inference/backfill, merge de Companies duplicadas ni billing sync no aprobado.
- No quitar `(PILOTO)`, publicar KPI oficiales o reemplazar inputs sintéticos silenciosamente.
- No sumar/promediar CLP, UF y USD ni sumar montos por geografía multi-select como aditivos.
- No proyectar datos ANAM a Greenhouse ni mutar Notion durante reconciliación de reuniones.

## Escalamiento

Escala a ANAM/Maria Paz si falta definición/ratificación; a Efeonce si falta diseño, acceso, rollback o evidencia;
y a plataforma sólo con evidencia runtime de defecto. Incluye IDs, período, esperado/observado y riesgo.

## Referencias

- [Catálogo HubSpot as a Service](../../services/hubspot-as-a-service/README.md)
- [Modelo vivo](../../architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md)
- [Roadmap](../../architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md)
- [Sector/geografía](../../architecture/kortex/hubspot-as-a-service/anam-sector-geography-kpi-slice-change-set-2026-07-16.md)
- [Países de ejecución del Deal](../../architecture/kortex/hubspot-as-a-service/anam-deal-execution-countries-change-set-2026-07-17.md)
- [Deal→Company](../../architecture/kortex/hubspot-as-a-service/anam-deal-company-association-remediation-dry-run-2026-07-16.md)
- [Paneles piloto](../../architecture/kortex/hubspot-as-a-service/anam-phase-3-pilot-dashboard-execution-2026-07-16.md)
- [Customer Agent source pack](../../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/README.md)
