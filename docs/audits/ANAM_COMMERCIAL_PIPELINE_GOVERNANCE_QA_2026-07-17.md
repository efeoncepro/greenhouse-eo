# QA Release Audit — ANAM commercial pipeline governance — 2026-07-17

## Verdict

**CONDITIONAL PASS**

Closure state: gobierno de captura y etapas completo; rollout de tareas prospectivas pendiente.

## Scope

- Runtime revisado: HubSpot ANAM `19893546` en Chrome autenticado.
- Pipelines: Growth `636797559` y Renewal `636594526`.
- Fuera de alcance: backfill, movimiento de Deals, merge de Companies, Service materializer, KPI oficiales y
  publicación de tareas automáticas.

## Risk Classification

| Riesgo | Nivel | Motivo |
|---|---:|---|
| Integración CRM externa | Alto | Requiredness y reglas afectan creación/avance futuro de Deals. |
| Datos históricos | Alto controlado | Cero record writes; no se movieron ni completaron Deals existentes. |
| Operación comercial | Medio-alto | Nuevas compuertas pueden bloquear movimientos manuales sin campos completos. |

## Injected Skills

- `hubspot-as-a-service`: contrato tenant-safe, readback y rollback.
- `hubspot-pipeline-health`: evaluación del pipeline y calidad de datos.
- `hubspot-greenhouse-bridge`: frontera de portales; confirmó que este cambio no pertenece al bridge Greenhouse.
- `efeonce-agency`: disciplina Revenue Enabled y separación Lead → Deal → Service.
- `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`: cierre y evidencia.

## Evidence

| Gate | Resultado | Evidencia |
|---|---|---|
| Portal correcto | PASS | Todas las URLs/readbacks resolvieron a `19893546`; no se operó `48713323`. |
| Formulario Deal | PASS | Company marcada obligatoria y confirmación HubSpot de formulario actualizado. |
| Fecha de cierre | PASS | Toggle de fecha automática a 60 días apagado. |
| Growth logic | PASS | Seis etapas gobernadas; `Potencial` y `Radar 0%` sin lógica condicional. |
| Growth creation | PASS | Regla activa, única etapa permitida/predeterminada `Potencial 10%`; Radar no seleccionado. |
| Renewal labels | PASS | Siete labels nuevos guardados sobre IDs existentes. |
| Renewal logic | PASS | Siete etapas con una regla; requiredness leída en el editor. |
| Renewal creation | PASS | Regla activa, única etapa permitida/predeterminada `Por revisar`. |
| Reglas restrictivas adicionales | PASS | Skip, backward, edit access y approval continúan apagadas. |
| Tareas históricas | PASS de seguridad | No se publicó workflow/tarea; no hubo enrolamiento ni backfill. |
| QA mecánica | PASS | `pnpm qa:gates --changed --agent codex --runtime --data --integration --docs`; riesgo external-integration alto correctamente detectado. |
| Cierre documental | PASS | `pnpm docs:closure-check` sin warnings; `pnpm ops:lint --changed` sin errores; `git diff --check` PASS. |
| Context/handoff | PASS con deuda histórica | `pnpm docs:context-check`: cero errores y dos warnings preexistentes por tamaño/cantidad de secciones de `Handoff.md`. |

## Blockers

No hay blocker para el gobierno de pipeline activado. No debe declararse completo el componente de tareas
automáticas hasta ejecutar su propio change set.

## Conditional Follow-Ups

1. Diseñar y probar las ocho tareas futuras con owner, due date, notification, dedupe y registro de prueba.
2. Refrescar cobertura Deal→Company y las colas DQ después de un período de adopción.
3. Probar con un Deal controlado por pipeline que los campos bloquean/permiten exactamente como se diseñó.

## False-Closure Traps Checked

- No se confundió configuración guardada con backfill.
- No se usó pipeline membership para asignar `Venta nueva`.
- No se declaró Revenue/GRR/NRR oficial.
- `Radar 0%` permaneció fuera de la corrección por decisión explícita del operador.

## Final Call

Las compuertas y etapas están live, reversibles y aisladas de registros históricos. El resultado es
`CONDITIONAL PASS` únicamente porque las automatizaciones de tareas recomendadas se conservaron como próximo
slice controlado; no se falsea su rollout.
