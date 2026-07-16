# Operar ANAM HubSpot Managed Service

> **Tipo:** Manual de uso / runbook
> **Versión:** 1.0
> **Actualizado:** 2026-07-16
> **Portal obligatorio:** ANAM `19893546`
> **Funcional:** [`../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md`](../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)

## Antes de empezar

1. Verifica que la cuenta/perfil resuelva a `19893546`; `48713323` es Greenhouse y no se usa para ANAM.
2. Lee handoff, modelo vivo y roadmap. Para decisiones de reuniones, revisa Notion live; lo local es un índice.
3. Clasifica la acción: lectura, schema, records/asociaciones, workflow, publicación o knowledge.
4. Antes de escribir, prepara change set con lote, impacto, aprobación, evidencia y rollback.

## Cadencia operativa

### Diaria

- Revisa disponibilidad, créditos, conversaciones no resueltas y transferencias de Customer Agent.
- Revisa tareas de `1852406585`: una tarea solicita validar; no vuelve al Service activo ni apto para KPI.
- Atiende excepciones urgentes de Data Quality por owner, corrigiendo en el punto de captura.

### Semanal

1. Abre Data Quality `21144697` y registra denominador, excepciones, owner y avance.
2. Clasifica causa: schema/plataforma, fuente/migración, integración o captura/adopción.
3. Separa Deal sin Company: convergencia explícita = candidata approval-gated; dominio = revisión; duplicidad,
   ambigüedad o inferencia por título/nombre/owner = held.
4. Revisa Growth `19708354`. Segmento/sector/región siguen parciales mientras cobertura sea menor a 95%.
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

## Monitorear Customer Agent

- Prueba lenguaje natural, memoria multi-turno, exactitud, administración/facturación, reclamos y mixed intent.
- Distingue limitación nativa de transferencia de defecto de configuración.
- Antes de cambiar knowledge, reconcilia el source pack; no lo reconstruyas desde memoria o adjuntos no clasificados.
- Publicación, permisos, acciones y handoff requieren aprobación explícita.

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

- [Modelo vivo](../../architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md)
- [Roadmap](../../architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md)
- [Sector/geografía](../../architecture/kortex/hubspot-as-a-service/anam-sector-geography-kpi-slice-change-set-2026-07-16.md)
- [Deal→Company](../../architecture/kortex/hubspot-as-a-service/anam-deal-company-association-remediation-dry-run-2026-07-16.md)
- [Paneles piloto](../../architecture/kortex/hubspot-as-a-service/anam-phase-3-pilot-dashboard-execution-2026-07-16.md)
